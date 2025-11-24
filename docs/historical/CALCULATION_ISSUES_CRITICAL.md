# 🚨 CRITICAL: Lease & Tax Calculation Errors

**STATUS**: FLAGGED FOR IMMEDIATE FIX  
**SEVERITY**: HIGH - Calculations are "literal miles from being correct"  
**REPORTED**: November 18, 2025

## Issues Identified

### 1. Lease Calculations - INCORRECT
The lease payment calculations are fundamentally wrong.

**Affected Files**:
- `client/src/lib/calculations.ts` (lines 111-164)
- `server/calculations.ts` (lines 127-166)

**Current Formula**:
```typescript
// Depreciation = (Capitalized Cost - Residual Value) / Term
const depreciation = capitalizedCost.minus(residual).div(term);

// Finance charge = (Capitalized Cost + Residual Value) * Money Factor
const financeCharge = capitalizedCost.plus(residual).times(moneyFactor);

// Monthly payment = Depreciation + Finance Charge
const monthlyPayment = depreciation.plus(financeCharge);
```

**Problems**:
- Formula does not match industry-standard lease calculation methods
- Money factor conversion may be incorrect (using 2400 multiplier)
- Capitalized cost calculation may not properly handle:
  - Acquisition fees
  - Cap cost reduction
  - First payment timing
  - Tax treatment (varies by state)
  - Security deposit handling

### 2. Tax Calculations - INCORRECT
Tax calculations are incorrect across the board.

**Affected Files**:
- `client/src/lib/tax-calculator.ts` (entire file - 1000+ lines)
- `server/shared/autoTaxEngine.ts` 
- `server/shared/tax-data.ts`
- `server/calculations.ts` (tax calculation functions)

**Key Problems**:
- State tax rules not matching actual DMV/tax authority requirements
- Trade-in credit calculations incorrect
- Luxury tax thresholds wrong
- Local tax rate application incorrect
- Lease vs. purchase tax treatment wrong
- Doc fee taxation rules incorrect
- F&I product taxation incorrect

## Files Requiring Review & Correction

### Lease Calculation Files
1. **`client/src/lib/calculations.ts`**
   - Function: `calculateLeasePayment()` (lines 115-164)
   - Helper: `moneyFactorToAPR()` (line 170-172)
   - Helper: `aprToMoneyFactor()` (line 178-180)

2. **`server/calculations.ts`**
   - Function: `calculateLeasePayment()` (lines 127-166)
   - Duplicate implementation - needs to match client or be centralized

### Tax Calculation Files
1. **`client/src/lib/tax-calculator.ts`**
   - Function: `calculateAutomotiveTax()` (primary tax engine)
   - All state-specific tax rules
   - Trade-in credit logic
   - Fee taxation logic

2. **`server/shared/autoTaxEngine.ts`**
   - Core tax calculation engine
   - Rule grouping and application logic

3. **`server/shared/tax-data.ts`**
   - Static tax rate data
   - State-specific rules
   - Local tax rates

4. **`server/calculations.ts`**
   - Server-side tax calculation wrapper functions

## Recommended Approach

### For Lease Calculations:
1. **Research industry-standard formulas**:
   - Standard NADA/ALG lease calculation methodology
   - State-specific lease tax treatment
   - Proper money factor to APR conversion (verify 2400 is correct)

2. **Fix the formula**:
   - Verify capitalized cost calculation includes all fees
   - Confirm residual value calculation
   - Fix depreciation calculation
   - Fix finance charge calculation
   - Add first/last payment handling
   - Add security deposit logic

3. **Test with real scenarios**:
   - Compare against dealer DMS systems
   - Verify against lender lease calculators
   - Test multiple states with different tax rules

### For Tax Calculations:
1. **Audit by state**:
   - Get official DMV/tax authority documentation for each state
   - Verify sales tax rates (state + local + county)
   - Verify trade-in credit rules (not all states allow it)
   - Verify luxury tax thresholds
   - Verify doc fee taxation rules

2. **Fix calculation logic**:
   - Correct base tax calculation
   - Fix trade-in credit application
   - Fix taxable vs non-taxable item classification
   - Fix lease vs purchase tax differences
   - Add proper rounding per state rules

3. **Test extensively**:
   - Create test cases for each state
   - Verify against real deal jackets
   - Compare to dealer management systems

## Testing Requirements

Before marking as fixed:
- [ ] Create unit tests for lease calculations with known-good examples
- [ ] Create unit tests for tax calculations for top 10 states
- [ ] Manual testing with real deal scenarios
- [ ] Comparison against industry-standard calculators
- [ ] Validation by automotive finance professional

## Notes
- These calculations are CRITICAL to the business
- Incorrect calculations = incorrect customer quotes = legal liability
- Must be verified against industry standards and state regulations
- Consider bringing in automotive finance domain expert for validation
