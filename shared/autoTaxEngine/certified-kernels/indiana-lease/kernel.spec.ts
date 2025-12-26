/**
 * INDIANA LEASE VEHICLE TAX KERNEL - CERTIFIED TEST SUITE
 *
 * Tests the indiana-lease-v1.0.0 kernel for MONTHLY lease taxation.
 * Critical tests ensure VSC and GAP are NOT taxed on leases.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateIndianaLeaseTax,
  IndianaLeaseInput,
  IndianaLeaseResult,
  IndianaLeaseSuccess,
  IndianaLeaseError,
  KERNEL_VERSION,
  INDIANA_TAX_RATE,
  DOC_FEE_CAP,
  ErrorCodes,
} from './kernel';
import goldenTests from './golden-tests.json';

// =============================================================================
// HELPERS
// =============================================================================

function isSuccess(result: IndianaLeaseResult): result is IndianaLeaseSuccess {
  return result.success === true;
}

function isError(result: IndianaLeaseResult): result is IndianaLeaseError {
  return result.success === false;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

// =============================================================================
// GOLDEN TEST CORPUS
// =============================================================================

describe('Indiana Lease Kernel - Golden Test Corpus', () => {
  describe('Metadata Validation', () => {
    it('should have correct kernel version', () => {
      expect(KERNEL_VERSION).toBe('indiana-lease-v1.0.0');
    });

    it('should have correct tax rate', () => {
      expect(INDIANA_TAX_RATE).toBe(0.07);
    });

    it('should have correct doc fee cap', () => {
      expect(DOC_FEE_CAP).toBe(250);
    });
  });

  describe('Golden Tests', () => {
    const testCases = goldenTests.testCases;

    testCases.forEach((testCase) => {
      it(`${testCase.id}: ${testCase.description}`, () => {
        const input = testCase.input as IndianaLeaseInput;
        const result = calculateIndianaLeaseTax(input);

        if (testCase.expected.success === true) {
          expect(isSuccess(result)).toBe(true);
          if (!isSuccess(result)) return;

          const expected = testCase.expected as any;

          // Check upfront breakdown
          if (expected.breakdown?.upfront) {
            if (expected.breakdown.upfront.taxableBase !== undefined) {
              expect(result.breakdown.upfront.taxableBase).toBe(expected.breakdown.upfront.taxableBase);
            }
            if (expected.breakdown.upfront.taxAmount !== undefined) {
              expect(result.breakdown.upfront.taxAmount).toBeCloseTo(expected.breakdown.upfront.taxAmount, 2);
            }
            if (expected.breakdown.upfront.components) {
              if (expected.breakdown.upfront.components.docFeeTax !== undefined) {
                expect(result.breakdown.upfront.components.docFeeTax).toBeCloseTo(
                  expected.breakdown.upfront.components.docFeeTax, 2
                );
              }
              if (expected.breakdown.upfront.components.firstPaymentTax !== undefined) {
                expect(result.breakdown.upfront.components.firstPaymentTax).toBeCloseTo(
                  expected.breakdown.upfront.components.firstPaymentTax, 2
                );
              }
            }
          }

          // Check monthly breakdown
          if (expected.breakdown?.monthly) {
            if (expected.breakdown.monthly.taxPerPayment !== undefined) {
              expect(result.breakdown.monthly.taxPerPayment).toBeCloseTo(
                expected.breakdown.monthly.taxPerPayment, 2
              );
            }
            if (expected.breakdown.monthly.totalPaymentWithTax !== undefined) {
              expect(result.breakdown.monthly.totalPaymentWithTax).toBeCloseTo(
                expected.breakdown.monthly.totalPaymentWithTax, 2
              );
            }
          }

          // Check total tax
          if (expected.breakdown?.totalTaxOverTerm !== undefined) {
            expect(result.breakdown.totalTaxOverTerm).toBeCloseTo(
              expected.breakdown.totalTaxOverTerm, 2
            );
          }

          // Check cap cost reductions
          if (expected.breakdown?.capCostReductions) {
            const actual = result.breakdown.capCostReductions;
            const exp = expected.breakdown.capCostReductions;
            if (exp.cash !== undefined) expect(actual.cash).toBe(exp.cash);
            if (exp.rebateMfr !== undefined) expect(actual.rebateMfr).toBe(exp.rebateMfr);
            if (exp.rebateDealer !== undefined) expect(actual.rebateDealer).toBe(exp.rebateDealer);
            if (exp.tradeInEquity !== undefined) expect(actual.tradeInEquity).toBe(exp.tradeInEquity);
            if (exp.total !== undefined) expect(actual.total).toBe(exp.total);
          }

          // Check negative equity
          if (expected.breakdown?.negativeEquity !== undefined) {
            expect(result.breakdown.negativeEquity).toBe(expected.breakdown.negativeEquity);
          }

          // Check backend products
          if (expected.breakdown?.backendProductsNotTaxed) {
            const actual = result.breakdown.backendProductsNotTaxed;
            const exp = expected.breakdown.backendProductsNotTaxed;
            if (exp.serviceContracts !== undefined) expect(actual.serviceContracts).toBe(exp.serviceContracts);
            if (exp.gap !== undefined) expect(actual.gap).toBe(exp.gap);
            if (exp.taxSavingsVsRetail !== undefined) {
              expect(actual.taxSavingsVsRetail).toBeCloseTo(exp.taxSavingsVsRetail, 2);
            }
          }

          // Check reciprocity
          if (expected.breakdown?.reciprocity) {
            if (expected.breakdown.reciprocity.creditApplied !== undefined) {
              expect(result.breakdown.reciprocity.creditApplied).toBe(
                expected.breakdown.reciprocity.creditApplied
              );
            }
            if (expected.breakdown.reciprocity.originState !== undefined) {
              expect(result.breakdown.reciprocity.originState).toBe(
                expected.breakdown.reciprocity.originState
              );
            }
          }

        } else {
          expect(isError(result)).toBe(true);
          if (!isError(result)) return;

          expect(result.errorCode).toBe(testCase.expected.errorCode);
        }
      });
    });
  });
});

// =============================================================================
// INVARIANT TESTS
// =============================================================================

describe('Indiana Lease Kernel - Invariants', () => {
  describe('INV-L-001: Non-Negative Taxes', () => {
    it('all tax values should be non-negative', () => {
      const result = calculateIndianaLeaseTax({
        dealType: 'LEASE',
        grossCapCost: 35000,
        baseMonthlyPayment: 450,
        paymentCount: 36,
        residualValue: 18000,
        docFee: 250,
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.breakdown.upfront.taxAmount).toBeGreaterThanOrEqual(0);
        expect(result.breakdown.monthly.taxPerPayment).toBeGreaterThanOrEqual(0);
        expect(result.breakdown.totalTaxOverTerm).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('INV-L-002: Tax Rate Consistency', () => {
    it('monthly tax should equal payment × 0.07', () => {
      const payment = 450;
      const result = calculateIndianaLeaseTax({
        dealType: 'LEASE',
        grossCapCost: 35000,
        baseMonthlyPayment: payment,
        paymentCount: 36,
        residualValue: 18000,
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.breakdown.monthly.taxPerPayment).toBeCloseTo(payment * 0.07, 2);
      }
    });
  });

  describe('INV-L-003: Total Tax Additivity', () => {
    it('total tax = upfront + (monthly × remaining payments)', () => {
      const result = calculateIndianaLeaseTax({
        dealType: 'LEASE',
        grossCapCost: 35000,
        baseMonthlyPayment: 450,
        paymentCount: 36,
        residualValue: 18000,
        docFee: 250,
        firstPaymentDueAtSigning: true,
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        const upfront = result.breakdown.upfront.taxAmount;
        const monthlyTax = result.breakdown.monthly.taxPerPayment;
        const remainingPayments = 35; // First payment at signing
        const expectedTotal = roundCurrency(upfront + monthlyTax * remainingPayments);
        expect(result.breakdown.totalTaxOverTerm).toBeCloseTo(expectedTotal, 2);
      }
    });
  });

  describe('INV-L-004: Cap Reductions Not Taxed', () => {
    it('cap reductions should not add to tax', () => {
      const withoutReductions = calculateIndianaLeaseTax({
        dealType: 'LEASE',
        grossCapCost: 35000,
        baseMonthlyPayment: 450,
        paymentCount: 36,
        residualValue: 18000,
        docFee: 250,
      });

      const withReductions = calculateIndianaLeaseTax({
        dealType: 'LEASE',
        grossCapCost: 35000,
        baseMonthlyPayment: 450, // Same payment
        paymentCount: 36,
        residualValue: 18000,
        docFee: 250,
        capReductionCash: 5000,
        capReductionRebateMfr: 3000,
      });

      expect(isSuccess(withoutReductions)).toBe(true);
      expect(isSuccess(withReductions)).toBe(true);

      if (isSuccess(withoutReductions) && isSuccess(withReductions)) {
        // Same payment = same tax (cap reductions don't directly add tax)
        expect(withReductions.breakdown.totalTaxOverTerm).toBe(
          withoutReductions.breakdown.totalTaxOverTerm
        );
      }
    });
  });

  describe('INV-L-005: Doc Fee Cap Enforcement', () => {
    it('should reject doc fees exceeding $250', () => {
      const result = calculateIndianaLeaseTax({
        dealType: 'LEASE',
        grossCapCost: 35000,
        baseMonthlyPayment: 450,
        paymentCount: 36,
        residualValue: 18000,
        docFee: 251,
      });

      expect(isError(result)).toBe(true);
      if (isError(result)) {
        expect(result.errorCode).toBe(ErrorCodes.DOC_FEE_EXCEEDS_CAP);
      }
    });
  });

  describe('INV-L-006: Backend Products Not Taxed', () => {
    it('VSC and GAP should not increase tax on leases', () => {
      const withoutBackend = calculateIndianaLeaseTax({
        dealType: 'LEASE',
        grossCapCost: 35000,
        baseMonthlyPayment: 450,
        paymentCount: 36,
        residualValue: 18000,
        docFee: 250,
      });

      const withBackend = calculateIndianaLeaseTax({
        dealType: 'LEASE',
        grossCapCost: 35000 + 2500 + 895, // Cap cost includes VSC and GAP
        baseMonthlyPayment: 450, // But payment stays the same for this test
        paymentCount: 36,
        residualValue: 18000,
        docFee: 250,
        serviceContracts: 2500,
        gap: 895,
      });

      expect(isSuccess(withoutBackend)).toBe(true);
      expect(isSuccess(withBackend)).toBe(true);

      if (isSuccess(withoutBackend) && isSuccess(withBackend)) {
        // Same payment = same tax (VSC/GAP don't add direct tax)
        expect(withBackend.breakdown.totalTaxOverTerm).toBe(
          withoutBackend.breakdown.totalTaxOverTerm
        );
        // But savings should be calculated
        expect(withBackend.breakdown.backendProductsNotTaxed.taxSavingsVsRetail).toBeCloseTo(237.65, 2);
      }
    });
  });
});

// =============================================================================
// CRITICAL BUG REGRESSIONS
// =============================================================================

describe('Indiana Lease Kernel - Critical Bug Regressions', () => {
  describe('VSC and GAP Non-Taxability', () => {
    it('CRITICAL: VSC must NOT be taxed on leases', () => {
      const result = calculateIndianaLeaseTax({
        dealType: 'LEASE',
        grossCapCost: 37500,
        baseMonthlyPayment: 450,
        paymentCount: 36,
        residualValue: 18000,
        docFee: 250,
        serviceContracts: 2500,
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.breakdown.backendProductsNotTaxed.serviceContracts).toBe(2500);
        expect(result.breakdown.backendProductsNotTaxed.taxSavingsVsRetail).toBeCloseTo(175, 2);
        expect(result.audit.rulesApplied).toContain('IN-L-007');
      }
    });

    it('CRITICAL: GAP must NOT be taxed on leases', () => {
      const result = calculateIndianaLeaseTax({
        dealType: 'LEASE',
        grossCapCost: 35895,
        baseMonthlyPayment: 450,
        paymentCount: 36,
        residualValue: 18000,
        docFee: 250,
        gap: 895,
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.breakdown.backendProductsNotTaxed.gap).toBe(895);
        expect(result.breakdown.backendProductsNotTaxed.taxSavingsVsRetail).toBeCloseTo(62.65, 2);
        expect(result.audit.rulesApplied).toContain('IN-L-008');
      }
    });

    it('CRITICAL: VSC + GAP combined saves $237.65 vs retail', () => {
      const result = calculateIndianaLeaseTax({
        dealType: 'LEASE',
        grossCapCost: 38395,
        baseMonthlyPayment: 480,
        paymentCount: 36,
        residualValue: 18000,
        docFee: 250,
        serviceContracts: 2500,
        gap: 895,
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        const expectedSavings = (2500 + 895) * 0.07; // $237.65
        expect(result.breakdown.backendProductsNotTaxed.taxSavingsVsRetail).toBeCloseTo(expectedSavings, 2);
      }
    });
  });

  describe('Doc Fee Statutory Cap', () => {
    it('CRITICAL: doc fees over $250 MUST be rejected', () => {
      const result = calculateIndianaLeaseTax({
        dealType: 'LEASE',
        grossCapCost: 35000,
        baseMonthlyPayment: 450,
        paymentCount: 36,
        residualValue: 18000,
        docFee: 250.01,
      });

      expect(isError(result)).toBe(true);
      if (isError(result)) {
        expect(result.errorCode).toBe(ErrorCodes.DOC_FEE_EXCEEDS_CAP);
      }
    });
  });

  describe('Monthly Taxation Method', () => {
    it('CRITICAL: tax must be on each payment, not upfront on full cap cost', () => {
      const result = calculateIndianaLeaseTax({
        dealType: 'LEASE',
        grossCapCost: 35000,
        baseMonthlyPayment: 450,
        paymentCount: 36,
        residualValue: 18000,
        docFee: 250,
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        // Monthly tax should be 7% of payment, NOT 7% of cap cost
        expect(result.breakdown.monthly.taxPerPayment).toBe(31.50); // $450 × 7%
        // Total tax should NOT be 7% of gross cap cost ($35,000 × 7% = $2,450)
        expect(result.breakdown.totalTaxOverTerm).toBeLessThan(2450);
      }
    });
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('Indiana Lease Kernel - Edge Cases', () => {
  describe('Input Validation', () => {
    it('should reject zero payment', () => {
      const result = calculateIndianaLeaseTax({
        dealType: 'LEASE',
        grossCapCost: 30000,
        baseMonthlyPayment: 0,
        paymentCount: 36,
        residualValue: 15000,
      });

      expect(isError(result)).toBe(true);
      if (isError(result)) {
        expect(result.errorCode).toBe(ErrorCodes.INVALID_PAYMENT);
      }
    });

    it('should reject zero payment count', () => {
      const result = calculateIndianaLeaseTax({
        dealType: 'LEASE',
        grossCapCost: 30000,
        baseMonthlyPayment: 400,
        paymentCount: 0,
        residualValue: 15000,
      });

      expect(isError(result)).toBe(true);
      if (isError(result)) {
        expect(result.errorCode).toBe(ErrorCodes.INVALID_TERM);
      }
    });

    it('should reject NaN values', () => {
      const result = calculateIndianaLeaseTax({
        dealType: 'LEASE',
        grossCapCost: NaN,
        baseMonthlyPayment: 400,
        paymentCount: 36,
        residualValue: 15000,
      });

      expect(isError(result)).toBe(true);
    });
  });

  describe('Out of Scope Transactions', () => {
    it('should reject retail transactions', () => {
      const result = calculateIndianaLeaseTax({
        dealType: 'LEASE',
        grossCapCost: 30000,
        baseMonthlyPayment: 400,
        paymentCount: 36,
        residualValue: 15000,
        isRetail: true,
      });

      expect(isError(result)).toBe(true);
      if (isError(result)) {
        expect(result.errorCode).toBe(ErrorCodes.RETAIL_NOT_SUPPORTED);
      }
    });

    it('should reject lease buyouts', () => {
      const result = calculateIndianaLeaseTax({
        dealType: 'LEASE',
        grossCapCost: 18000,
        baseMonthlyPayment: 400,
        paymentCount: 1,
        residualValue: 18000,
        isLeaseBuyout: true,
      });

      expect(isError(result)).toBe(true);
      if (isError(result)) {
        expect(result.errorCode).toBe(ErrorCodes.LEASE_BUYOUT_NOT_SUPPORTED);
      }
    });
  });

  describe('First Payment Options', () => {
    it('should handle first payment at signing', () => {
      const result = calculateIndianaLeaseTax({
        dealType: 'LEASE',
        grossCapCost: 30000,
        baseMonthlyPayment: 400,
        paymentCount: 36,
        residualValue: 15000,
        docFee: 250,
        firstPaymentDueAtSigning: true,
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.breakdown.upfront.components.firstPaymentTax).toBe(28);
      }
    });

    it('should handle first payment NOT at signing', () => {
      const result = calculateIndianaLeaseTax({
        dealType: 'LEASE',
        grossCapCost: 30000,
        baseMonthlyPayment: 400,
        paymentCount: 36,
        residualValue: 15000,
        docFee: 250,
        firstPaymentDueAtSigning: false,
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.breakdown.upfront.components.firstPaymentTax).toBe(0);
        // All 36 payments are monthly
        const expectedTotal = 17.50 + (28 * 36); // Doc fee tax + all payments
        expect(result.breakdown.totalTaxOverTerm).toBeCloseTo(expectedTotal, 2);
      }
    });
  });
});

// =============================================================================
// DETERMINISM
// =============================================================================

describe('Indiana Lease Kernel - Determinism', () => {
  it('should produce identical results for identical inputs', () => {
    const input: IndianaLeaseInput = {
      dealType: 'LEASE',
      grossCapCost: 40000,
      baseMonthlyPayment: 450,
      paymentCount: 36,
      residualValue: 20000,
      docFee: 250,
      serviceContracts: 2500,
      gap: 895,
    };

    const result1 = calculateIndianaLeaseTax(input);
    const result2 = calculateIndianaLeaseTax(input);

    expect(isSuccess(result1)).toBe(true);
    expect(isSuccess(result2)).toBe(true);

    if (isSuccess(result1) && isSuccess(result2)) {
      expect(result1.breakdown.totalTaxOverTerm).toBe(result2.breakdown.totalTaxOverTerm);
      expect(result1.breakdown.monthly.taxPerPayment).toBe(result2.breakdown.monthly.taxPerPayment);
    }
  });

  it('should not mutate input', () => {
    const input: IndianaLeaseInput = {
      dealType: 'LEASE',
      grossCapCost: 35000,
      baseMonthlyPayment: 450,
      paymentCount: 36,
      residualValue: 18000,
    };

    const inputCopy = JSON.parse(JSON.stringify(input));
    calculateIndianaLeaseTax(input);

    expect(input).toEqual(inputCopy);
  });
});

// =============================================================================
// AUDIT TRAIL
// =============================================================================

describe('Indiana Lease Kernel - Audit Trail', () => {
  it('should include kernel version', () => {
    const result = calculateIndianaLeaseTax({
      dealType: 'LEASE',
      grossCapCost: 35000,
      baseMonthlyPayment: 450,
      paymentCount: 36,
      residualValue: 18000,
    });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.kernelVersion).toBe('indiana-lease-v1.0.0');
    }
  });

  it('should track applied rules', () => {
    const result = calculateIndianaLeaseTax({
      dealType: 'LEASE',
      grossCapCost: 40000,
      baseMonthlyPayment: 450,
      paymentCount: 36,
      residualValue: 20000,
      docFee: 250,
      serviceContracts: 2500,
      capReductionCash: 3000,
    });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.audit.rulesApplied).toContain('IN-L-001'); // Monthly method
      expect(result.audit.rulesApplied).toContain('IN-L-002'); // Doc fee
      expect(result.audit.rulesApplied).toContain('IN-L-004'); // Cap reductions
      expect(result.audit.rulesApplied).toContain('IN-L-007'); // VSC not taxed
    }
  });
});
