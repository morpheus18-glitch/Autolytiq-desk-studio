# Testing Implementation Checklist

Use this checklist to track progress as you implement the testing recommendations.

## Phase 1: Foundation (Week 1-2) - 20-30 hours

### Setup & Infrastructure
- [ ] Read TESTING_README.md (10 min)
- [ ] Read TESTING_SUMMARY.md (5 min)
- [ ] Install coverage tool: `npm install --save-dev @vitest/coverage-v8`
- [ ] Update vitest.config.ts to include server/client files
- [ ] Run tests and verify setup works: `npm test`
- [ ] Generate initial coverage report: `npm test -- --coverage`
- [ ] Create `tests/fixtures/` directory
- [ ] Create `tests/fixtures/deals.ts` with deal factory functions
- [ ] Create `tests/fixtures/states.ts` with state fixtures

### Tests to Implement (Priority Order)

#### 1.1 Server Sales Tax Calculation (20 tests)
- [ ] Create `tests/server/calculations.spec.ts`
- [ ] Test single jurisdiction (state only)
- [ ] Test multi-jurisdiction (state + county + city)
- [ ] Test 0% tax rate
- [ ] Test manufacturer rebate (new vehicles)
- [ ] Test no rebate (used vehicles)
- [ ] Test trade-in credit (tax_on_difference)
- [ ] Test trade-in exceeds price scenarios
- [ ] Test F&I product inclusion
- [ ] Test F&I product exclusion by state
- [ ] Test Decimal.js precision
- [ ] Test rounding (HALF_UP)
- [ ] Test negative taxable base
- [ ] Test multiple jurisdiction combinations
- [ ] Test edge cases (zero rates, large amounts, etc.)
- [ ] Run all tests: `npm test -- tests/server/calculations.spec.ts`
- [ ] Verify all passing

#### 1.2 Server Finance Payment Calculation (20 tests)
- [ ] Test standard amortization formula
- [ ] Test 0% APR special case
- [ ] Test 0 term edge case
- [ ] Test negative amount financed
- [ ] Test 3% APR payment
- [ ] Test 10% APR payment
- [ ] Test 20% APR payment
- [ ] Test 12 month term
- [ ] Test 48 month term
- [ ] Test 84 month term
- [ ] Test positive trade equity
- [ ] Test negative trade equity
- [ ] Test 0 trade equity
- [ ] Test interest calculation
- [ ] Test total paid verification
- [ ] Test Decimal.js precision
- [ ] Test rounding to 2 decimals
- [ ] Test various down payment scenarios
- [ ] Run tests and verify
- [ ] Check coverage for calculateFinancePayment

#### 1.3 Server Lease Payment Calculation (15 tests)
- [ ] Test depreciation calculation
- [ ] Test finance charge calculation
- [ ] Test sum of both components
- [ ] Test 0.0015 money factor
- [ ] Test 0.0030 money factor
- [ ] Test 0.0035 money factor
- [ ] Test 50% residual
- [ ] Test 60% residual
- [ ] Test 40% residual
- [ ] Test taxes included in cap cost
- [ ] Test fees included in cap cost
- [ ] Test cap cost reduction applied
- [ ] Test 0 cap cost
- [ ] Test 0 term
- [ ] Test residual > cap cost
- [ ] Run tests and verify
- [ ] Check coverage for calculateLeasePayment

#### 1.4 Reciprocity Logic (40 tests)
- [ ] Create `tests/autoTaxEngine/reciprocity.spec.ts`
- [ ] Test reciprocity disabled (0 credit)
- [ ] Test NONE home state behavior
- [ ] Test CREDIT_UP_TO_STATE_RATE behavior
- [ ] Test CREDIT_FULL behavior
- [ ] Test HOME_STATE_ONLY behavior
- [ ] Test RETAIL_ONLY scope
- [ ] Test LEASE_ONLY scope
- [ ] Test BOTH scope
- [ ] Test 0 origin tax
- [ ] Test 0 base tax
- [ ] Test credit > base tax (cap at state's tax enabled)
- [ ] Test credit > base tax (cap at state's tax disabled)
- [ ] Test excess credit scenario
- [ ] Test proof requirement tracking
- [ ] Test origin state validation
- [ ] Test all 2x behavior combinations
- [ ] Test all scope combinations
- [ ] Test all cap settings
- [ ] Test edge case matrix
- [ ] Run all reciprocity tests
- [ ] Verify coverage

### Phase 1 Validation
- [ ] All new tests passing
- [ ] No regressions in existing 34 tests
- [ ] Coverage report shows improvement
- [ ] Expected coverage: 40-50%
- [ ] Commit: "Add Phase 1 tests: server calculations and reciprocity"

---

## Phase 2: Special Schemes & States (Week 3-4) - 30-40 hours

### Special Tax Scheme Tests

#### 2.1 Georgia TAVT Tests (25 tests)
- [ ] Create `tests/autoTaxEngine/special-schemes.tavt.spec.ts`
- [ ] Test basic TAVT calculation
- [ ] Test TAVT with trade-in
- [ ] Test TAVT with rebate
- [ ] Test TAVT with accessories
- [ ] Test TAVT with fees
- [ ] Test TAVT multi-rate
- [ ] Test TAVT edge cases
- [ ] Run tests and verify

#### 2.2 West Virginia Privilege Tax Tests (25 tests)
- [ ] Create `tests/autoTaxEngine/special-schemes.privilege.spec.ts`
- [ ] Test each vehicle class
- [ ] Test class boundaries
- [ ] Test privilege tax calculation
- [ ] Test with trade-in scenarios
- [ ] Test with rebate scenarios
- [ ] Test edge cases
- [ ] Run tests and verify

#### 2.3 North Carolina HUT Tests (25 tests)
- [ ] Create `tests/autoTaxEngine/special-schemes.hut.spec.ts`
- [ ] Test HUT base calculation
- [ ] Test 90-day window logic
- [ ] Test HUT with trade-in
- [ ] Test HUT with rebate
- [ ] Test HUT with multi-rate
- [ ] Test time-based scenarios
- [ ] Test edge cases
- [ ] Run tests and verify

### State-Specific Tests

#### 2.4 Top 10 Auto Market States (100 tests, 10 per state)
- [ ] California (CA)
  - [ ] Basic retail
  - [ ] Basic lease
  - [ ] Trade-in scenarios
  - [ ] Doc fee cap ($85)
  - [ ] Multi-jurisdiction
  - [ ] Rebate handling
  - [ ] Accessories
  - [ ] Negative equity
  - [ ] Edge cases
  - [ ] All passing

- [ ] Texas (TX)
  - [ ] Basic retail
  - [ ] Basic lease
  - [ ] VSC/GAP not taxed
  - [ ] Trade-in
  - [ ] Rebate
  - [ ] Multi-jurisdiction
  - [ ] Reciprocity
  - [ ] Accessories
  - [ ] Edge cases
  - [ ] All passing

- [ ] Florida (FL)
  - [ ] Basic retail
  - [ ] Basic lease
  - [ ] Doc fee cap ($995)
  - [ ] Trade-in
  - [ ] Rebate
  - [ ] Multi-jurisdiction
  - [ ] Reciprocity
  - [ ] Service contracts
  - [ ] Edge cases
  - [ ] All passing

- [ ] New York (NY)
  - [ ] Basic retail
  - [ ] Basic lease
  - [ ] MCTD surcharge
  - [ ] Doc fee cap ($175)
  - [ ] Trade-in
  - [ ] Lease-specific rules
  - [ ] Rebate
  - [ ] Luxury rules (if applicable)
  - [ ] Edge cases
  - [ ] All passing

- [ ] Pennsylvania (PA)
  - [ ] Basic retail
  - [ ] Basic lease
  - [ ] Doc fee cap ($195)
  - [ ] State-only (no local)
  - [ ] Trade-in
  - [ ] Rebate
  - [ ] Reciprocity
  - [ ] Service contracts
  - [ ] Edge cases
  - [ ] All passing

- [ ] Illinois (IL)
  - [ ] Basic retail
  - [ ] Basic lease
  - [ ] Chicago metro (10.25%)
  - [ ] Trade-in
  - [ ] Rebate
  - [ ] Reciprocity
  - [ ] Multi-jurisdiction
  - [ ] Accessories
  - [ ] Edge cases
  - [ ] All passing

- [ ] Ohio (OH)
  - [ ] Basic retail
  - [ ] Basic lease
  - [ ] Doc fee cap ($250)
  - [ ] Trade-in
  - [ ] Rebate
  - [ ] Reciprocity
  - [ ] Multi-jurisdiction
  - [ ] Service contracts
  - [ ] Edge cases
  - [ ] All passing

- [ ] Michigan (MI)
  - [ ] Basic retail
  - [ ] Basic lease
  - [ ] Doc fee cap ($200)
  - [ ] State-only (no local)
  - [ ] Trade-in capped scenarios
  - [ ] Rebate
  - [ ] Reciprocity
  - [ ] Accessories
  - [ ] Edge cases
  - [ ] All passing

- [ ] New Jersey (NJ)
  - [ ] Basic retail
  - [ ] Basic lease
  - [ ] Luxury surcharge (0.4%)
  - [ ] State-only (no local)
  - [ ] Trade-in
  - [ ] Rebate
  - [ ] Reciprocity
  - [ ] Service contracts
  - [ ] Edge cases
  - [ ] All passing

- [ ] Georgia (GA)
  - [ ] TAVT scheme
  - [ ] TAVT with trade-in
  - [ ] TAVT with rebate
  - [ ] TAVT with fees
  - [ ] TAVT lease scenarios
  - [ ] TAVT edge cases
  - [ ] Compliance validation
  - [ ] Multi-transaction scenarios
  - [ ] Time-based rules
  - [ ] All passing

### Fee & Product Taxability Tests (30 tests)
- [ ] Create `tests/autoTaxEngine/interpreters.spec.ts`
- [ ] Test isFeeTaxable for all fee types
- [ ] Test isRebateTaxable for all types
- [ ] Test isDocFeeTaxable variations
- [ ] Test fee code matrix
- [ ] Test state-specific variations
- [ ] Test combinations
- [ ] Test edge cases
- [ ] Run tests and verify

### Phase 2 Validation
- [ ] All 75+ new tests passing
- [ ] All 34 original tests still passing
- [ ] Special schemes fully covered
- [ ] Top 10 states fully covered
- [ ] Expected coverage: 65-75%
- [ ] Commit: "Add Phase 2 tests: special schemes, top 10 states, fee taxability"

---

## Phase 3: Edge Cases & Client (Week 5-6) - 25-35 hours

### Edge Case Tests (50 tests)
- [ ] Create `tests/autoTaxEngine/edge-cases.spec.ts`
- [ ] Create `tests/server/edge-cases.spec.ts`
- [ ] Test negative amounts
- [ ] Test zero amounts
- [ ] Test overflow scenarios
- [ ] Test precision boundaries
- [ ] Test rounding edge cases
- [ ] Test trade-in exceeds price
- [ ] Test rebates exceed price
- [ ] Test negative effective base
- [ ] Test invalid inputs
- [ ] Test missing fields
- [ ] Test type validation
- [ ] Test error handling
- [ ] Run all edge case tests

### Client-Side Tests (40 tests)
- [ ] Create `tests/client/calculations.spec.ts`
- [ ] Test calculateFinancePayment (client version)
- [ ] Test calculateLeasePayment (client version)
- [ ] Test calculateAmortizationSchedule
- [ ] Test calculateLeaseAmortization
- [ ] Test precision with Decimal.js
- [ ] Test various scenarios
- [ ] Verify matches server implementation
- [ ] Run all client tests

### Integration Tests (30 tests)
- [ ] Create `tests/integration/` directory
- [ ] Test end-to-end retail flow
- [ ] Test end-to-end lease flow
- [ ] Test client -> server consistency
- [ ] Test real state rules
- [ ] Test real tax rates
- [ ] Test real deal scenarios
- [ ] Run all integration tests

### Phase 3 Validation
- [ ] All 120+ new tests passing
- [ ] All 159 previous tests still passing
- [ ] Edge cases covered
- [ ] Client-side verified
- [ ] Integration validated
- [ ] Expected coverage: 80-85%
- [ ] Commit: "Add Phase 3 tests: edge cases, client, integration"

---

## Phase 4: Performance & Refinement (Week 7+) - 15-20 hours

### Performance Tests
- [ ] Create `tests/performance/` directory
- [ ] Benchmark basic tax calculation
- [ ] Benchmark complex deal
- [ ] Benchmark 1000 calculations
- [ ] Check Decimal.js memory usage
- [ ] Verify Decimal.js precision
- [ ] Document performance baseline
- [ ] Run performance tests

### State Stub Coverage
- [ ] Add basic tests for remaining 40 states
- [ ] Verify configuration validity
- [ ] Test rule loading
- [ ] Test basic calculation
- [ ] Document stub status
- [ ] Plan for full implementation

### CI/CD Integration
- [ ] Add coverage gates to CI/CD
- [ ] Set minimum coverage threshold (85%)
- [ ] Configure coverage reporting
- [ ] Add test badge to README
- [ ] Configure pre-commit hooks
- [ ] Document coverage requirements

### Documentation
- [ ] Update README with test info
- [ ] Add test examples to docs
- [ ] Document test fixtures
- [ ] Create test guide for developers
- [ ] Document coverage metrics

### Phase 4 Validation
- [ ] All 50+ new tests passing
- [ ] All 279 previous tests still passing
- [ ] Expected coverage: 90%+
- [ ] Performance baseline documented
- [ ] CI/CD gates working
- [ ] Final commit: "Phase 4: performance tests, CI/CD integration, 90%+ coverage"

---

## Overall Validation Checklist

### Test Execution
- [ ] All tests passing: `npm test`
- [ ] Coverage report generated: `npm test -- --coverage`
- [ ] No regressions in original tests
- [ ] No flaky tests
- [ ] Watch mode works: `npm test -- --watch`

### Coverage Metrics
- [ ] calculateGeorgiaTAVT.ts: 85%+ coverage
- [ ] calculateNorthCarolinaHUT.ts: 85%+ coverage
- [ ] calculateWestVirginiaPrivilege.ts: 85%+ coverage
- [ ] reciprocity.ts: 90%+ coverage
- [ ] server/calculations.ts: 90%+ coverage
- [ ] client/calculations.ts: 90%+ coverage
- [ ] interpreters.ts: 85%+ coverage
- [ ] Overall: 85%+ coverage

### Documentation
- [ ] All documents complete
- [ ] README updated
- [ ] Examples added
- [ ] Coverage tracked
- [ ] Performance documented

### Quality
- [ ] No console errors
- [ ] No unhandled rejections
- [ ] Clean code
- [ ] Proper error messages
- [ ] Consistent style

### Process
- [ ] All phases completed
- [ ] Week-by-week schedule followed
- [ ] Effort estimates accurate
- [ ] Budget remaining for Phase 4

---

## Sign-Off

- [ ] Project Lead Review
- [ ] QA Sign-Off
- [ ] Coverage Gates Activated
- [ ] Ready for Production

---

**Current Date:** ________  
**Phase 1 Completion Date:** ________  
**Phase 2 Completion Date:** ________  
**Phase 3 Completion Date:** ________  
**Phase 4 Completion Date:** ________  

**Completed by:** ________________  
**Reviewed by:** ________________  

