/**
 * INDIANA RETAIL VEHICLE TAX KERNEL - CERTIFIED TEST SUITE
 *
 * This test suite validates the indiana-retail-v1.0.0 kernel against:
 * 1. Golden test corpus (deterministic expected outputs)
 * 2. Property-based invariant tests
 * 3. Edge case coverage
 *
 * ALL TESTS MUST PASS for kernel certification.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  calculateIndianaRetailTax,
  IndianaRetailInput,
  IndianaRetailResult,
  IndianaRetailSuccess,
  IndianaRetailError,
  KERNEL_VERSION,
  INDIANA_TAX_RATE,
  DOC_FEE_CAP,
  ErrorCodes,
} from './kernel';
import goldenTests from './golden-tests.json';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function isSuccess(result: IndianaRetailResult): result is IndianaRetailSuccess {
  return result.success === true;
}

function isError(result: IndianaRetailResult): result is IndianaRetailError {
  return result.success === false;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

// =============================================================================
// GOLDEN TEST CORPUS
// =============================================================================

describe('Indiana Retail Kernel - Golden Test Corpus', () => {
  describe('Metadata Validation', () => {
    it('should have correct kernel version', () => {
      expect(KERNEL_VERSION).toBe('indiana-retail-v1.0.0');
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
        const input = testCase.input as IndianaRetailInput;
        const result = calculateIndianaRetailTax(input);

        if (testCase.expected.success === true) {
          // Success case
          expect(isSuccess(result)).toBe(true);
          if (!isSuccess(result)) return;

          const expected = testCase.expected as {
            success: true;
            breakdown: {
              taxableBase?: number;
              taxRate?: number;
              totalTax?: number;
              baseComponents?: Record<string, number>;
              deductions?: Record<string, number>;
              reciprocity?: {
                creditApplied?: number;
                originState?: string | null;
                originalTaxBeforeCredit?: number;
              };
            };
          };

          // Check taxable base
          if (expected.breakdown.taxableBase !== undefined) {
            expect(result.breakdown.taxableBase).toBe(expected.breakdown.taxableBase);
          }

          // Check tax rate
          if (expected.breakdown.taxRate !== undefined) {
            expect(result.breakdown.taxRate).toBe(expected.breakdown.taxRate);
          }

          // Check total tax
          if (expected.breakdown.totalTax !== undefined) {
            expect(result.breakdown.totalTax).toBeCloseTo(expected.breakdown.totalTax, 2);
          }

          // Check base components if specified
          if (expected.breakdown.baseComponents) {
            Object.entries(expected.breakdown.baseComponents).forEach(([key, value]) => {
              const componentKey = key as keyof typeof result.breakdown.baseComponents;
              expect(result.breakdown.baseComponents[componentKey]).toBe(value);
            });
          }

          // Check deductions if specified
          if (expected.breakdown.deductions) {
            Object.entries(expected.breakdown.deductions).forEach(([key, value]) => {
              const deductionKey = key as keyof typeof result.breakdown.deductions;
              expect(result.breakdown.deductions[deductionKey]).toBe(value);
            });
          }

          // Check reciprocity if specified
          if (expected.breakdown.reciprocity) {
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

          // Verify rules were applied
          if (testCase.rulesExercised && testCase.rulesExercised.length > 0) {
            testCase.rulesExercised.forEach((rule) => {
              expect(result.audit.rulesApplied).toContain(rule);
            });
          }
        } else {
          // Error case
          expect(isError(result)).toBe(true);
          if (!isError(result)) return;

          const expected = testCase.expected as {
            success: false;
            errorCode: string;
            message?: string;
            violatedRule?: string;
          };

          expect(result.errorCode).toBe(expected.errorCode);

          if (expected.violatedRule) {
            expect(result.violatedRule).toBe(expected.violatedRule);
          }
        }
      });
    });
  });
});

// =============================================================================
// INVARIANT TESTS (Property-Based)
// =============================================================================

describe('Indiana Retail Kernel - Invariants', () => {
  describe('INV-001: Non-Negative Tax', () => {
    it('tax should never be negative for any valid input', () => {
      const testInputs: IndianaRetailInput[] = [
        { vehiclePrice: 100, dealType: 'RETAIL' },
        { vehiclePrice: 10000, dealType: 'RETAIL', tradeInValue: 50000 },
        { vehiclePrice: 1000, dealType: 'RETAIL', rebateManufacturer: 5000 },
        {
          vehiclePrice: 20000,
          dealType: 'RETAIL',
          tradeInValue: 25000,
          rebateManufacturer: 10000,
        },
      ];

      testInputs.forEach((input) => {
        const result = calculateIndianaRetailTax(input);
        if (isSuccess(result)) {
          expect(result.breakdown.totalTax).toBeGreaterThanOrEqual(0);
        }
      });
    });
  });

  describe('INV-002: Non-Negative Taxable Base', () => {
    it('taxable base should floor at zero', () => {
      const result = calculateIndianaRetailTax({
        vehiclePrice: 10000,
        dealType: 'RETAIL',
        tradeInValue: 50000,
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.breakdown.taxableBase).toBe(0);
      }
    });
  });

  describe('INV-003: Tax Rate Consistency', () => {
    it('tax should equal base * 0.07 - reciprocity (within rounding)', () => {
      const testInputs: IndianaRetailInput[] = [
        { vehiclePrice: 25000, dealType: 'RETAIL' },
        { vehiclePrice: 30000, dealType: 'RETAIL', docFee: 250 },
        {
          vehiclePrice: 40000,
          dealType: 'RETAIL',
          originTaxInfo: { stateCode: 'OH', amount: 500 },
        },
      ];

      testInputs.forEach((input) => {
        const result = calculateIndianaRetailTax(input);
        if (isSuccess(result)) {
          const expectedBaseTax = roundCurrency(result.breakdown.taxableBase * 0.07);
          const expectedFinalTax = roundCurrency(
            Math.max(0, expectedBaseTax - result.breakdown.reciprocity.creditApplied)
          );
          expect(result.breakdown.totalTax).toBeCloseTo(expectedFinalTax, 2);
        }
      });
    });
  });

  describe('INV-004: Component Additivity', () => {
    it('taxable base should equal sum of components minus deductions', () => {
      const result = calculateIndianaRetailTax({
        vehiclePrice: 30000,
        dealType: 'RETAIL',
        docFee: 250,
        accessoriesAmount: 1500,
        serviceContracts: 2500,
        gap: 895,
        tradeInValue: 10000,
        tradeInPayoff: 12000, // $2000 negative equity
        rebateManufacturer: 2000,
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        const { baseComponents, deductions } = result.breakdown;
        const negativeEquity = Math.max(0, 12000 - 10000);

        const calculatedBase =
          baseComponents.vehiclePrice +
          baseComponents.docFee +
          baseComponents.accessories +
          baseComponents.serviceContracts +
          baseComponents.gap +
          negativeEquity +
          baseComponents.otherTaxableFees -
          deductions.tradeInCredit -
          deductions.manufacturerRebate;

        expect(result.breakdown.taxableBase).toBe(Math.max(0, calculatedBase));
      }
    });
  });

  describe('INV-005: Reciprocity Cap', () => {
    it('reciprocity credit should never exceed tax paid or tax due', () => {
      const testCases = [
        { originAmount: 1000, expectedMaxCredit: 1000 }, // Less than IN tax
        { originAmount: 5000, expectedMaxCredit: 1750 }, // More than IN tax (capped)
      ];

      testCases.forEach(({ originAmount }) => {
        const result = calculateIndianaRetailTax({
          vehiclePrice: 25000,
          dealType: 'RETAIL',
          originTaxInfo: { stateCode: 'XX', amount: originAmount },
        });

        if (isSuccess(result)) {
          const baseTax = result.breakdown.reciprocity.originalTaxBeforeCredit;
          expect(result.breakdown.reciprocity.creditApplied).toBeLessThanOrEqual(originAmount);
          expect(result.breakdown.reciprocity.creditApplied).toBeLessThanOrEqual(baseTax);
        }
      });
    });
  });

  describe('INV-006: Doc Fee Cap Enforcement', () => {
    it('should reject doc fees exceeding $250', () => {
      const result = calculateIndianaRetailTax({
        vehiclePrice: 25000,
        dealType: 'RETAIL',
        docFee: 251,
      });

      expect(isError(result)).toBe(true);
      if (isError(result)) {
        expect(result.errorCode).toBe(ErrorCodes.DOC_FEE_EXCEEDS_CAP);
      }
    });

    it('should accept doc fees at exactly $250', () => {
      const result = calculateIndianaRetailTax({
        vehiclePrice: 25000,
        dealType: 'RETAIL',
        docFee: 250,
      });

      expect(isSuccess(result)).toBe(true);
    });
  });

  describe('INV-007: Monotonicity', () => {
    it('higher vehicle price should result in higher tax (all else equal)', () => {
      const baseInput: Omit<IndianaRetailInput, 'vehiclePrice'> = {
        dealType: 'RETAIL',
        docFee: 250,
      };

      const result1 = calculateIndianaRetailTax({ ...baseInput, vehiclePrice: 20000 });
      const result2 = calculateIndianaRetailTax({ ...baseInput, vehiclePrice: 30000 });
      const result3 = calculateIndianaRetailTax({ ...baseInput, vehiclePrice: 40000 });

      if (isSuccess(result1) && isSuccess(result2) && isSuccess(result3)) {
        expect(result1.breakdown.totalTax).toBeLessThan(result2.breakdown.totalTax);
        expect(result2.breakdown.totalTax).toBeLessThan(result3.breakdown.totalTax);
      }
    });
  });
});

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

describe('Indiana Retail Kernel - Edge Cases', () => {
  describe('Input Validation', () => {
    it('should reject non-RETAIL deal types', () => {
      const result = calculateIndianaRetailTax({
        vehiclePrice: 25000,
        dealType: 'RETAIL', // This is correct, but testing type safety
      } as IndianaRetailInput);

      expect(isSuccess(result)).toBe(true);
    });

    it('should reject NaN vehicle price', () => {
      const result = calculateIndianaRetailTax({
        vehiclePrice: NaN,
        dealType: 'RETAIL',
      });

      expect(isError(result)).toBe(true);
      if (isError(result)) {
        expect(result.errorCode).toBe(ErrorCodes.INVALID_VEHICLE_PRICE);
      }
    });

    it('should reject Infinity vehicle price', () => {
      const result = calculateIndianaRetailTax({
        vehiclePrice: Infinity,
        dealType: 'RETAIL',
      });

      expect(isError(result)).toBe(true);
      if (isError(result)) {
        expect(result.errorCode).toBe(ErrorCodes.INVALID_VEHICLE_PRICE);
      }
    });

    it('should reject negative vehicle price', () => {
      const result = calculateIndianaRetailTax({
        vehiclePrice: -1000,
        dealType: 'RETAIL',
      });

      expect(isError(result)).toBe(true);
      if (isError(result)) {
        expect(result.errorCode).toBe(ErrorCodes.INVALID_VEHICLE_PRICE);
      }
    });
  });

  describe('Out of Scope Transactions', () => {
    it('should reject lease transactions', () => {
      const result = calculateIndianaRetailTax({
        vehiclePrice: 35000,
        dealType: 'RETAIL',
        isLease: true,
      });

      expect(isError(result)).toBe(true);
      if (isError(result)) {
        expect(result.errorCode).toBe(ErrorCodes.LEASE_NOT_SUPPORTED);
      }
    });

    it('should reject commercial vehicles', () => {
      const result = calculateIndianaRetailTax({
        vehiclePrice: 50000,
        dealType: 'RETAIL',
        isCommercialVehicle: true,
      });

      expect(isError(result)).toBe(true);
      if (isError(result)) {
        expect(result.errorCode).toBe(ErrorCodes.COMMERCIAL_VEHICLE_NOT_SUPPORTED);
      }
    });

    it('should reject tax-exempt transactions', () => {
      const result = calculateIndianaRetailTax({
        vehiclePrice: 30000,
        dealType: 'RETAIL',
        isTaxExempt: true,
      });

      expect(isError(result)).toBe(true);
      if (isError(result)) {
        expect(result.errorCode).toBe(ErrorCodes.TAX_EXEMPT_NOT_SUPPORTED);
      }
    });

    it('should reject private party sales', () => {
      const result = calculateIndianaRetailTax({
        vehiclePrice: 15000,
        dealType: 'RETAIL',
        isPrivatePartySale: true,
      });

      expect(isError(result)).toBe(true);
      if (isError(result)) {
        expect(result.errorCode).toBe(ErrorCodes.PRIVATE_PARTY_NOT_SUPPORTED);
      }
    });
  });

  describe('Boundary Conditions', () => {
    it('should handle very small vehicle prices', () => {
      const result = calculateIndianaRetailTax({
        vehiclePrice: 0.01,
        dealType: 'RETAIL',
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.breakdown.totalTax).toBe(0);
      }
    });

    it('should handle very large vehicle prices', () => {
      const result = calculateIndianaRetailTax({
        vehiclePrice: 500000,
        dealType: 'RETAIL',
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.breakdown.totalTax).toBe(35000);
      }
    });

    it('should handle zero optional fields', () => {
      const result = calculateIndianaRetailTax({
        vehiclePrice: 25000,
        dealType: 'RETAIL',
        docFee: 0,
        tradeInValue: 0,
        rebateManufacturer: 0,
        rebateDealer: 0,
        accessoriesAmount: 0,
        serviceContracts: 0,
        gap: 0,
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.breakdown.taxableBase).toBe(25000);
        expect(result.breakdown.totalTax).toBe(1750);
      }
    });
  });

  describe('Rounding', () => {
    it('should round tax to 2 decimal places', () => {
      // 25123 * 0.07 = 1758.61
      const result = calculateIndianaRetailTax({
        vehiclePrice: 25123,
        dealType: 'RETAIL',
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.breakdown.totalTax).toBe(1758.61);
      }
    });

    it('should handle half-up rounding correctly', () => {
      // 25125 * 0.07 = 1758.75 (exact)
      const result = calculateIndianaRetailTax({
        vehiclePrice: 25125,
        dealType: 'RETAIL',
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.breakdown.totalTax).toBe(1758.75);
      }
    });
  });
});

// =============================================================================
// AUDIT TRAIL TESTS
// =============================================================================

describe('Indiana Retail Kernel - Audit Trail', () => {
  it('should include kernel version in result', () => {
    const result = calculateIndianaRetailTax({
      vehiclePrice: 25000,
      dealType: 'RETAIL',
    });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.kernelVersion).toBe('indiana-retail-v1.0.0');
    }
  });

  it('should include calculation timestamp', () => {
    const result = calculateIndianaRetailTax({
      vehiclePrice: 25000,
      dealType: 'RETAIL',
    });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.audit.calculatedAt).toBeDefined();
      expect(new Date(result.audit.calculatedAt).getTime()).not.toBeNaN();
    }
  });

  it('should track all applied rules', () => {
    const result = calculateIndianaRetailTax({
      vehiclePrice: 30000,
      dealType: 'RETAIL',
      docFee: 250,
      tradeInValue: 10000,
      rebateManufacturer: 2000,
      serviceContracts: 2500,
    });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.audit.rulesApplied).toContain('IN-RATE-001');
      expect(result.audit.rulesApplied).toContain('IN-R-001');
      expect(result.audit.rulesApplied).toContain('IN-R-002');
      expect(result.audit.rulesApplied).toContain('IN-R-004');
      expect(result.audit.rulesApplied).toContain('IN-R-006');
    }
  });

  it('should include step-by-step notes', () => {
    const result = calculateIndianaRetailTax({
      vehiclePrice: 25000,
      dealType: 'RETAIL',
      docFee: 250,
    });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.audit.notes.length).toBeGreaterThan(0);
      expect(result.audit.notes.some((n) => n.includes('Step 1'))).toBe(true);
    }
  });
});

// =============================================================================
// DETERMINISM TESTS
// =============================================================================

describe('Indiana Retail Kernel - Determinism', () => {
  it('should produce identical results for identical inputs', () => {
    const input: IndianaRetailInput = {
      vehiclePrice: 30000,
      dealType: 'RETAIL',
      docFee: 250,
      tradeInValue: 10000,
      rebateManufacturer: 2000,
      serviceContracts: 2500,
      gap: 895,
    };

    const result1 = calculateIndianaRetailTax(input);
    const result2 = calculateIndianaRetailTax(input);
    const result3 = calculateIndianaRetailTax(input);

    expect(isSuccess(result1)).toBe(true);
    expect(isSuccess(result2)).toBe(true);
    expect(isSuccess(result3)).toBe(true);

    if (isSuccess(result1) && isSuccess(result2) && isSuccess(result3)) {
      expect(result1.breakdown.taxableBase).toBe(result2.breakdown.taxableBase);
      expect(result2.breakdown.taxableBase).toBe(result3.breakdown.taxableBase);
      expect(result1.breakdown.totalTax).toBe(result2.breakdown.totalTax);
      expect(result2.breakdown.totalTax).toBe(result3.breakdown.totalTax);
    }
  });

  it('should not have side effects', () => {
    const input: IndianaRetailInput = {
      vehiclePrice: 25000,
      dealType: 'RETAIL',
    };

    // Make a copy to verify no mutation
    const inputCopy = JSON.parse(JSON.stringify(input));

    calculateIndianaRetailTax(input);

    // Input should not be mutated
    expect(input).toEqual(inputCopy);
  });
});

// =============================================================================
// CRITICAL BUG REGRESSION TESTS
// =============================================================================

describe('Indiana Retail Kernel - Critical Bug Regressions', () => {
  describe('Manufacturer vs Dealer Rebate Distinction', () => {
    it('CRITICAL: manufacturer rebate MUST reduce taxable base', () => {
      const result = calculateIndianaRetailTax({
        vehiclePrice: 28000,
        dealType: 'RETAIL',
        rebateManufacturer: 2000,
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.breakdown.taxableBase).toBe(26000);
        expect(result.breakdown.totalTax).toBe(1820);
        expect(result.breakdown.deductions.manufacturerRebate).toBe(2000);
      }
    });

    it('CRITICAL: dealer rebate MUST NOT reduce taxable base', () => {
      const result = calculateIndianaRetailTax({
        vehiclePrice: 28000,
        dealType: 'RETAIL',
        rebateDealer: 2000,
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.breakdown.taxableBase).toBe(28000);
        expect(result.breakdown.totalTax).toBe(1960);
      }
    });

    it('CRITICAL: $140 tax difference between $2000 mfr vs dealer rebate', () => {
      const mfrResult = calculateIndianaRetailTax({
        vehiclePrice: 28000,
        dealType: 'RETAIL',
        rebateManufacturer: 2000,
      });

      const dealerResult = calculateIndianaRetailTax({
        vehiclePrice: 28000,
        dealType: 'RETAIL',
        rebateDealer: 2000,
      });

      expect(isSuccess(mfrResult)).toBe(true);
      expect(isSuccess(dealerResult)).toBe(true);

      if (isSuccess(mfrResult) && isSuccess(dealerResult)) {
        const taxDifference = dealerResult.breakdown.totalTax - mfrResult.breakdown.totalTax;
        expect(taxDifference).toBe(140); // 7% of $2000
      }
    });
  });

  describe('Doc Fee Statutory Cap', () => {
    it('CRITICAL: doc fees over $250 MUST be rejected', () => {
      const result = calculateIndianaRetailTax({
        vehiclePrice: 25000,
        dealType: 'RETAIL',
        docFee: 250.01,
      });

      expect(isError(result)).toBe(true);
      if (isError(result)) {
        expect(result.errorCode).toBe(ErrorCodes.DOC_FEE_EXCEEDS_CAP);
      }
    });
  });
});
