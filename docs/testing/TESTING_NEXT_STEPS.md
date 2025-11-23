# Testing - Next Steps & Implementation Guide

## Quick Status Check

```bash
# Run all tests
npm test

# Run with watch mode
npm test -- --watch

# Run specific test file
npm test -- tests/autoTaxEngine/engine.basic.spec.ts
```

**Current Status:**
```
✅ 34 tests passing
✅ All test files green
❌ ~95% of calculation code untested
❌ Coverage tool not installed
```

## Immediate Setup (30 minutes)

### 1. Install Coverage Tool
```bash
npm install --save-dev @vitest/coverage-v8
```

### 2. Update vitest.config.ts
```typescript
// Current (LIMITED):
coverage: {
  include: ["shared/autoTaxEngine/**/*.ts"],
}

// Should be (COMPLETE):
coverage: {
  include: [
    "shared/autoTaxEngine/**/*.ts",
    "server/calculations.ts",
    "client/src/lib/calculations.ts",
  ],
}
```

### 3. Generate Coverage Report
```bash
npm test -- --coverage
```

## Testing Priority by Effort/Impact Ratio

### Priority 1: High Impact, Medium Effort (Start Here!)

#### 1.1 Server Sales Tax Function (30-40 lines)
**File:** `server/calculations.ts` - `calculateSalesTax()`

**Why:** Multi-jurisdiction tax is core to every deal

**Tests Needed (20+):**
```typescript
describe('calculateSalesTax', () => {
  // Single jurisdiction
  it('should calculate single state tax correctly');
  it('should calculate with county + city');
  it('should handle 0% tax rate');
  
  // Manufacturer rebate
  it('should apply rebate only to new vehicles');
  it('should reduce taxable base by rebate');
  it('should not apply rebate to used vehicles');
  
  // Trade-in credit
  it('should apply tax_on_difference credit');
  it('should handle trade-in exceeds price');
  
  // F&I products
  it('should include taxable aftermarket products');
  it('should exclude non-taxable aftermarket products');
  
  // Precision
  it('should maintain Decimal.js precision');
  it('should round correctly (HALF_UP)');
  
  // Edge cases
  it('should handle negative taxable base');
  it('should handle zero rates');
  it('should handle multiple jurisdictions');
});
```

#### 1.2 Server Finance Payment (50 lines)
**File:** `server/calculations.ts` - `calculateFinancePayment()`

**Why:** Core customer payment calculation

**Tests Needed (20+):**
```typescript
describe('calculateFinancePayment', () => {
  // Basic formula
  it('should calculate standard amortization');
  it('should handle 0% APR special case');
  it('should handle 0 term gracefully');
  it('should handle negative amount financed');
  
  // Various rates
  it('should calculate 3% APR payment');
  it('should calculate 10% APR payment');
  it('should calculate 20% APR payment');
  
  // Various terms
  it('should calculate 12 month payment');
  it('should calculate 48 month payment');
  it('should calculate 84 month payment');
  
  // Trade scenarios
  it('should handle positive trade equity');
  it('should handle negative trade equity');
  it('should handle 0 trade equity');
  
  // Results validation
  it('should calculate interest correctly');
  it('should verify total paid = payment * term + principal');
  
  // Precision
  it('should use Decimal.js precision');
  it('should round to 2 decimals');
});
```

#### 1.3 Server Lease Payment (40 lines)
**File:** `server/calculations.ts` - `calculateLeasePayment()`

**Tests Needed (15+):**
```typescript
describe('calculateLeasePayment', () => {
  // Basic formula
  it('should calculate depreciation correctly');
  it('should calculate finance charge correctly');
  it('should sum to monthly payment');
  
  // Money factors
  it('should handle 0.0015 money factor');
  it('should handle 0.0030 money factor');
  it('should handle 0.0035 money factor');
  
  // Residuals
  it('should handle 50% residual');
  it('should handle 60% residual');
  it('should handle 40% residual');
  
  // Cap cost
  it('should include taxes in cap cost');
  it('should include fees in cap cost');
  it('should apply cap cost reduction');
  
  // Edge cases
  it('should handle 0 cap cost');
  it('should handle 0 term');
  it('should handle residual > cap cost');
});
```

#### 1.4 Reciprocity Logic (660 lines - MOST COMPLEX)
**File:** `shared/autoTaxEngine/engine/reciprocity.ts`

**Why:** 20+ states involved, complex credit calculations

**Tests Needed (40+):**
```typescript
describe('Reciprocity Logic', () => {
  // Disabled reciprocity
  it('should return 0 credit when disabled');
  
  // Home state behavior matrix (5 × 2 = 10 combinations)
  it('should handle NONE behavior');
  it('should handle CREDIT_UP_TO_STATE_RATE');
  it('should handle CREDIT_FULL');
  it('should handle HOME_STATE_ONLY');
  
  // Scope restrictions (2 × 2 = 4 combinations)
  it('should respect RETAIL_ONLY scope');
  it('should respect LEASE_ONLY scope');
  it('should apply BOTH scope');
  
  // Edge cases
  it('should handle 0 origin tax');
  it('should handle 0 base tax');
  it('should handle credit > base tax');
  it('should handle excess credit scenarios');
  
  // Proof requirements
  it('should note proof requirement when needed');
  it('should validate origin state provided');
  
  // Cap at state's tax
  it('should cap credit at state tax when enabled');
  it('should allow excess credit when disabled');
  
  // All combinations tested
});
```

### Priority 2: Critical Path, Higher Effort

#### 2.1 Georgia TAVT (272 lines)
**What:** Title Ad Valorem Tax - one-time 7% on title transfer

**Tests Needed (25+):** Trade-in scenarios, rebate handling, multi-rate

#### 2.2 West Virginia Privilege Tax (369 lines)
**What:** Class-based vehicle tax

**Tests Needed (25+):** All vehicle classes, class boundaries, edge cases

#### 2.3 North Carolina HUT (347 lines)
**What:** 90-day Highway Use Tax window

**Tests Needed (25+):** Time-based logic, 90-day window, reciprocity

### Priority 3: State Coverage Tests

#### 3.1 Top 10 Auto Markets (100+ tests)
For each state: CA, TX, FL, NY, PA, IL, OH, MI, NJ, GA

10-15 tests per state covering:
- Basic retail calculation
- Basic lease calculation
- Fee/rebate/trade-in handling
- Special rules (docFee caps, special schemes, etc.)

**Template:**
```typescript
describe('State Rules: [STATE NAME]', () => {
  const rules = getRulesForState('[STATE]');
  
  it('should load [STATE] rules');
  it('should have correct tax scheme');
  it('should calculate retail tax correctly');
  it('should calculate lease tax correctly');
  it('should handle trade-ins correctly');
  it('should handle rebates correctly');
  it('should handle doc fee cap if applicable');
  // ... more state-specific tests
});
```

## Creating Test Fixtures (Reduce Duplication)

### Create `tests/fixtures/deals.ts`
```typescript
// Generate common test scenarios
export function createRetailDeal(overrides = {}) {
  return {
    stateCode: 'IN',
    dealType: 'RETAIL',
    vehiclePrice: 30000,
    ...overrides,
  };
}

export function createLeaseDeal(overrides = {}) {
  return {
    stateCode: 'IN',
    dealType: 'LEASE',
    grossCapCost: 30000,
    ...overrides,
  };
}

export function createComplexDeal(overrides = {}) {
  return {
    ...createRetailDeal(),
    accessoriesAmount: 2000,
    tradeInValue: 10000,
    rebateManufacturer: 2000,
    rebateDealer: 500,
    ...overrides,
  };
}
```

### Create `tests/fixtures/states.ts`
```typescript
// Real state rules for quick testing
import * as stateRules from '../../shared/autoTaxEngine/rules';

export const topTenStates = [
  'CA', 'TX', 'FL', 'NY', 'PA', 
  'IL', 'OH', 'MI', 'NJ', 'GA'
];

export const stateFixtures = {
  CA: stateRules.US_CA,
  TX: stateRules.US_TX,
  FL: stateRules.US_FL,
  // ... etc
};
```

## Implementation Order (Week by Week)

### Week 1: Foundation
1. **Monday:** Install coverage tool, update config (30 min)
2. **Tuesday-Wednesday:** Add 50+ tests for server calculations (16 hours)
   - calculateSalesTax (30+ tests)
   - calculateFinancePayment (10+ tests)
   - calculateLeasePayment (10+ tests)
3. **Thursday-Friday:** Add 30+ reciprocity tests (10 hours)
4. **Verify:** Run coverage: `npm test -- --coverage`
5. **Expected result:** 40-50% coverage

### Week 2: Special Schemes
1. **Monday-Tuesday:** Add 25+ tests for calculateGeorgiaTAVT (10 hours)
2. **Wednesday:** Add 25+ tests for calculateWestVirginiaPrivilege (10 hours)
3. **Thursday:** Add 25+ tests for calculateNorthCarolinaHUT (10 hours)
4. **Friday:** Add 30+ fee/product taxability tests (8 hours)
5. **Expected result:** 65-70% coverage

### Week 3: State Coverage
1. **Monday-Tuesday:** Top 5 states (50 tests, 12 hours)
2. **Wednesday-Thursday:** Next 5 states (50 tests, 12 hours)
3. **Friday:** Integration tests (8 hours)
4. **Expected result:** 75-80% coverage

### Week 4: Client + Edge Cases
1. **Monday-Tuesday:** Client calculation tests (20 hours)
2. **Wednesday-Thursday:** Edge case tests (16 hours)
3. **Friday:** Performance tests + cleanup (8 hours)
4. **Expected result:** 85-90% coverage

## Test File Structure

```
tests/
├── fixtures/
│   ├── deals.ts           // Deal factory functions
│   ├── states.ts          // State rules fixtures
│   └── scenarios.ts       // Edge case scenarios
├── autoTaxEngine/
│   ├── engine.basic.spec.ts (existing)
│   ├── engine.advanced.spec.ts (NEW)
│   ├── lease.basic.spec.ts (existing)
│   ├── lease.advanced.spec.ts (NEW)
│   ├── rules.indiana.spec.ts (existing)
│   ├── rules.all.spec.ts (NEW - all 50 states)
│   ├── reciprocity.spec.ts (NEW - 40+ tests)
│   ├── special-schemes.spec.ts (NEW - TAVT, HUT, privilege)
│   └── edge-cases.spec.ts (NEW)
├── server/
│   ├── calculations.spec.ts (NEW - sales tax, finance, lease)
│   └── aftermarket.spec.ts (NEW - F&I products)
└── client/
    └── calculations.spec.ts (NEW - amortization schedules)
```

## Validation Checklist

- [ ] Coverage tool installed
- [ ] vitest.config.ts updated
- [ ] `npm test` passes (all tests green)
- [ ] `npm test -- --coverage` generates report
- [ ] Coverage report shows all files
- [ ] 50+ server calculation tests added
- [ ] 30+ reciprocity tests added
- [ ] 75+ special scheme tests added
- [ ] 100+ state coverage tests added
- [ ] 50+ edge case tests added
- [ ] 40+ client-side tests added
- [ ] All tests passing
- [ ] Coverage > 85%
- [ ] CI/CD coverage gates working

## Commands Reference

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch

# Specific file
npm test -- tests/autoTaxEngine/reciprocity.spec.ts

# Specific test pattern
npm test -- --grep "reciprocity"

# Generate HTML coverage report
npm test -- --coverage --reporter=html

# View coverage report
open coverage/index.html
```

## Success Criteria

- ✅ All 34 existing tests still passing
- ✅ 150+ new tests added (Week 1-2)
- ✅ Coverage > 50% (Week 1-2)
- ✅ All special schemes tested
- ✅ Top 10 states tested
- ✅ Reciprocity matrix tested
- ✅ Coverage > 80% (Week 3-4)
- ✅ CI/CD gates enforcing coverage

---

**Start with:** Priority 1.1, 1.2, 1.3 (easier wins, high impact)  
**Most complex:** Priority 1.4 (reciprocity - 60+ scenarios)  
**Total effort:** 100-150 hours over 4-6 weeks
