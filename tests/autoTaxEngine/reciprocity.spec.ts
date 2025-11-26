/**
 * AUTO TAX ENGINE - RECIPROCITY CREDIT TESTS
 *
 * Comprehensive test suite for reciprocity credit logic across states.
 * Reciprocity rules vary significantly by state and include:
 * - Credit up to state rate (most common)
 * - Full credit for tax paid
 * - No reciprocity (California, New York)
 * - Time-limited reciprocity (NC 90-day window)
 * - Proof of tax paid requirements
 */

import { describe, it, expect } from 'vitest';
import type { TaxCalculationInput, TaxRulesConfig } from '../../shared/autoTaxEngine/types';
import { calculateTax } from '../../shared/autoTaxEngine/engine/calculateTax';
import { getRulesForState } from '../../shared/autoTaxEngine/rules';

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createBaseInput(overrides: Partial<TaxCalculationInput> = {}): TaxCalculationInput {
  return {
    stateCode: 'XX',
    asOfDate: '2025-01-15',
    dealType: 'RETAIL',
    vehiclePrice: 30000,
    accessoriesAmount: 0,
    tradeInValue: 0,
    rebateManufacturer: 0,
    rebateDealer: 0,
    docFee: 0,
    otherFees: [],
    serviceContracts: 0,
    gap: 0,
    negativeEquity: 0,
    taxAlreadyCollected: 0,
    rates: [{ label: 'STATE', rate: 0.06 }],
    ...overrides,
  } as TaxCalculationInput;
}

function createBaseRules(overrides: Partial<TaxRulesConfig> = {}): TaxRulesConfig {
  return {
    stateCode: 'XX',
    version: 1,
    tradeInPolicy: { type: 'FULL' },
    rebates: [
      { appliesTo: 'MANUFACTURER', taxable: false },
      { appliesTo: 'DEALER', taxable: true },
    ],
    docFeeTaxable: true,
    feeTaxRules: [],
    taxOnAccessories: true,
    taxOnNegativeEquity: true,
    taxOnServiceContracts: true,
    taxOnGap: true,
    vehicleTaxScheme: 'STATE_PLUS_LOCAL',
    vehicleUsesLocalSalesTax: true,
    leaseRules: {
      method: 'MONTHLY',
      taxCapReduction: false,
      rebateBehavior: 'FOLLOW_RETAIL_RULE',
      docFeeTaxability: 'ALWAYS',
      tradeInCredit: 'FULL',
      negativeEquityTaxable: true,
      feeTaxRules: [],
      titleFeeRules: [],
      taxFeesUpfront: true,
      specialScheme: 'NONE',
    },
    reciprocity: {
      enabled: true,
      scope: 'BOTH',
      homeStateBehavior: 'CREDIT_UP_TO_STATE_RATE',
      requireProofOfTaxPaid: true,
      basis: 'TAX_PAID',
      capAtThisStatesTax: true,
      hasLeaseException: false,
    },
    ...overrides,
  };
}

// ============================================================================
// BASIC RECIPROCITY TESTS
// ============================================================================

describe('Reciprocity Credit Logic', () => {
  describe('Basic Credit Scenarios', () => {
    it('should apply full credit when origin tax equals home state tax', () => {
      const input = createBaseInput({
        vehiclePrice: 30000,
        originTaxInfo: {
          stateCode: 'TX',
          amount: 1800, // Exactly matches 6% on $30k
        },
      });
      const rules = createBaseRules();

      const result = calculateTax(input, rules);

      expect(result.debug.reciprocityCredit).toBe(1800);
      expect(result.taxes.totalTax).toBe(0);
    });

    it('should apply full credit when origin tax exceeds home state tax', () => {
      const input = createBaseInput({
        vehiclePrice: 30000,
        originTaxInfo: {
          stateCode: 'CA',
          amount: 3000, // More than 6% on $30k
        },
      });
      const rules = createBaseRules();

      const result = calculateTax(input, rules);

      // Credit capped at home state tax (1800)
      expect(result.debug.reciprocityCredit).toBe(1800);
      expect(result.taxes.totalTax).toBe(0);
    });

    it('should apply partial credit when origin tax is less than home state tax', () => {
      const input = createBaseInput({
        vehiclePrice: 30000,
        originTaxInfo: {
          stateCode: 'AZ',
          amount: 1500, // Less than 6% on $30k
        },
      });
      const rules = createBaseRules();

      const result = calculateTax(input, rules);

      expect(result.debug.reciprocityCredit).toBe(1500);
      expect(result.taxes.totalTax).toBe(300); // 1800 - 1500
    });

    it('should not apply credit when originTaxInfo is missing', () => {
      const input = createBaseInput({ vehiclePrice: 30000 });
      const rules = createBaseRules();

      const result = calculateTax(input, rules);

      expect(result.debug.reciprocityCredit).toBe(0);
      expect(result.taxes.totalTax).toBe(1800);
    });

    it('should not apply credit when origin tax amount is zero', () => {
      const input = createBaseInput({
        vehiclePrice: 30000,
        originTaxInfo: {
          stateCode: 'OR', // Oregon has no sales tax
          amount: 0,
        },
      });
      const rules = createBaseRules();

      const result = calculateTax(input, rules);

      expect(result.debug.reciprocityCredit).toBe(0);
      expect(result.taxes.totalTax).toBe(1800);
    });
  });

  // ============================================================================
  // RECIPROCITY DISABLED TESTS
  // ============================================================================

  describe('No Reciprocity States', () => {
    it('should not apply credit when reciprocity is disabled', () => {
      const input = createBaseInput({
        vehiclePrice: 30000,
        originTaxInfo: {
          stateCode: 'TX',
          amount: 2000,
        },
      });
      const rules = createBaseRules({
        reciprocity: {
          enabled: false,
          scope: 'BOTH',
          homeStateBehavior: 'NONE',
          requireProofOfTaxPaid: false,
          basis: 'TAX_PAID',
          capAtThisStatesTax: false,
          hasLeaseException: false,
        },
      });

      const result = calculateTax(input, rules);

      expect(result.debug.reciprocityCredit).toBe(0);
      expect(result.taxes.totalTax).toBe(1800);
    });

    it('should work correctly with California (no reciprocity)', () => {
      const caRules = getRulesForState('CA');
      if (!caRules) {
        throw new Error('CA rules not found');
      }

      const input = createBaseInput({
        stateCode: 'CA',
        vehiclePrice: 30000,
        rates: [{ label: 'STATE', rate: 0.0725 }],
        originTaxInfo: {
          stateCode: 'TX',
          amount: 2000,
        },
      });

      const result = calculateTax(input, caRules);

      // CA has no reciprocity - should not apply credit
      expect(result.debug.reciprocityCredit).toBe(0);
    });
  });

  // ============================================================================
  // SCOPE TESTS (RETAIL vs LEASE)
  // ============================================================================

  describe('Reciprocity Scope', () => {
    it('should apply to retail when scope is BOTH', () => {
      const input = createBaseInput({
        dealType: 'RETAIL',
        vehiclePrice: 30000,
        originTaxInfo: {
          stateCode: 'TX',
          amount: 1500,
        },
      });
      const rules = createBaseRules({
        reciprocity: {
          enabled: true,
          scope: 'BOTH',
          homeStateBehavior: 'CREDIT_UP_TO_STATE_RATE',
          requireProofOfTaxPaid: true,
          basis: 'TAX_PAID',
          capAtThisStatesTax: true,
          hasLeaseException: false,
        },
      });

      const result = calculateTax(input, rules);

      expect(result.debug.reciprocityCredit).toBe(1500);
    });

    it('should apply to retail when scope is RETAIL_ONLY', () => {
      const input = createBaseInput({
        dealType: 'RETAIL',
        vehiclePrice: 30000,
        originTaxInfo: {
          stateCode: 'TX',
          amount: 1500,
        },
      });
      const rules = createBaseRules({
        reciprocity: {
          enabled: true,
          scope: 'RETAIL_ONLY',
          homeStateBehavior: 'CREDIT_UP_TO_STATE_RATE',
          requireProofOfTaxPaid: true,
          basis: 'TAX_PAID',
          capAtThisStatesTax: true,
          hasLeaseException: false,
        },
      });

      const result = calculateTax(input, rules);

      expect(result.debug.reciprocityCredit).toBe(1500);
    });

    it('should NOT apply to lease when scope is RETAIL_ONLY', () => {
      const input = createBaseInput({
        dealType: 'LEASE',
        vehiclePrice: 30000,
        originTaxInfo: {
          stateCode: 'TX',
          amount: 1500,
        },
        grossCapCost: 30000,
        basePayment: 400,
        paymentCount: 36,
      });
      const rules = createBaseRules({
        reciprocity: {
          enabled: true,
          scope: 'RETAIL_ONLY',
          homeStateBehavior: 'CREDIT_UP_TO_STATE_RATE',
          requireProofOfTaxPaid: true,
          basis: 'TAX_PAID',
          capAtThisStatesTax: true,
          hasLeaseException: false,
        },
      });

      const result = calculateTax(input, rules);

      expect(result.debug.reciprocityCredit).toBe(0);
    });
  });

  // ============================================================================
  // HOME STATE BEHAVIOR TESTS
  // ============================================================================

  describe('Home State Behavior', () => {
    describe('CREDIT_UP_TO_STATE_RATE', () => {
      it("should cap credit at this state's tax amount", () => {
        const input = createBaseInput({
          vehiclePrice: 30000,
          originTaxInfo: {
            stateCode: 'CA',
            amount: 3000, // Higher than home state
          },
        });
        const rules = createBaseRules({
          reciprocity: {
            enabled: true,
            scope: 'BOTH',
            homeStateBehavior: 'CREDIT_UP_TO_STATE_RATE',
            requireProofOfTaxPaid: true,
            basis: 'TAX_PAID',
            capAtThisStatesTax: true,
            hasLeaseException: false,
          },
        });

        const result = calculateTax(input, rules);

        // Credit capped at home state tax (1800)
        expect(result.debug.reciprocityCredit).toBe(1800);
        expect(result.taxes.totalTax).toBe(0);
      });
    });

    describe('CREDIT_FULL', () => {
      it('should apply full credit amount without cap', () => {
        const input = createBaseInput({
          vehiclePrice: 30000,
          originTaxInfo: {
            stateCode: 'CA',
            amount: 3000,
          },
        });
        const rules = createBaseRules({
          reciprocity: {
            enabled: true,
            scope: 'BOTH',
            homeStateBehavior: 'CREDIT_FULL',
            requireProofOfTaxPaid: true,
            basis: 'TAX_PAID',
            capAtThisStatesTax: false, // No cap
            hasLeaseException: false,
          },
        });

        const result = calculateTax(input, rules);

        // Full credit applied (but tax can't go below 0)
        expect(result.debug.reciprocityCredit).toBe(3000);
        expect(result.taxes.totalTax).toBe(0);
      });
    });

    describe('NONE', () => {
      it('should not apply any reciprocity credit', () => {
        const input = createBaseInput({
          vehiclePrice: 30000,
          originTaxInfo: {
            stateCode: 'TX',
            amount: 2000,
          },
        });
        const rules = createBaseRules({
          reciprocity: {
            enabled: true,
            scope: 'BOTH',
            homeStateBehavior: 'NONE',
            requireProofOfTaxPaid: false,
            basis: 'TAX_PAID',
            capAtThisStatesTax: false,
            hasLeaseException: false,
          },
        });

        const result = calculateTax(input, rules);

        expect(result.debug.reciprocityCredit).toBe(0);
        expect(result.taxes.totalTax).toBe(1800);
      });
    });
  });

  // ============================================================================
  // STATE-SPECIFIC RECIPROCITY TESTS
  // ============================================================================

  describe('Texas Reciprocity', () => {
    it('should apply credit for tax paid in another state', () => {
      const txRules = getRulesForState('TX');
      if (!txRules) throw new Error('TX rules not found');

      const input = createBaseInput({
        stateCode: 'TX',
        vehiclePrice: 30000,
        rates: [{ label: 'STATE', rate: 0.0625 }],
        originTaxInfo: {
          stateCode: 'CA',
          amount: 2175, // 7.25% CA tax
        },
      });

      const result = calculateTax(input, txRules);

      // TX tax: 30000 * 0.0625 = 1875
      // Credit: min(2175, 1875) = 1875
      // Final: 0
      expect(result.debug.reciprocityCredit).toBe(1875);
      expect(result.taxes.totalTax).toBe(0);
    });

    it('should owe difference when origin tax is lower', () => {
      const txRules = getRulesForState('TX');
      if (!txRules) throw new Error('TX rules not found');

      const input = createBaseInput({
        stateCode: 'TX',
        vehiclePrice: 30000,
        rates: [{ label: 'STATE', rate: 0.0625 }],
        originTaxInfo: {
          stateCode: 'AZ',
          amount: 1680, // 5.6% AZ tax
        },
      });

      const result = calculateTax(input, txRules);

      // TX tax: 1875, Credit: 1680, Final: 195
      expect(result.debug.reciprocityCredit).toBe(1680);
      expect(result.taxes.totalTax).toBe(195);
    });
  });

  describe('Florida Reciprocity', () => {
    it('should NOT apply credit - Florida has no reciprocity', () => {
      const flRules = getRulesForState('FL');
      if (!flRules) throw new Error('FL rules not found');

      const input = createBaseInput({
        stateCode: 'FL',
        vehiclePrice: 30000,
        rates: [{ label: 'STATE', rate: 0.06 }],
        originTaxInfo: {
          stateCode: 'GA',
          amount: 2100, // 7% GA TAVT
        },
      });

      const result = calculateTax(input, flRules);

      // FL has reciprocity.enabled: false - does NOT provide credits
      // FL tax: 30000 * 0.06 = 1800 (no credit applied)
      expect(result.debug.reciprocityCredit).toBe(0);
      expect(result.taxes.totalTax).toBe(1800);
    });

    it('should have reciprocity disabled in configuration', () => {
      const flRules = getRulesForState('FL');
      expect(flRules?.reciprocity.enabled).toBe(false);
    });
  });

  describe('Ohio Reciprocity', () => {
    it('should apply credit up to OH rate', () => {
      const ohRules = getRulesForState('OH');
      if (!ohRules) throw new Error('OH rules not found');

      const input = createBaseInput({
        stateCode: 'OH',
        vehiclePrice: 30000,
        rates: [{ label: 'STATE', rate: 0.0575 }],
        originTaxInfo: {
          stateCode: 'IN',
          amount: 2100, // 7% IN tax
        },
      });

      const result = calculateTax(input, ohRules);

      // OH tax: 30000 * 0.0575 = 1725
      // Credit: min(2100, 1725) = 1725
      expect(result.debug.reciprocityCredit).toBe(1725);
      expect(result.taxes.totalTax).toBe(0);
    });
  });

  describe('Michigan Reciprocity', () => {
    it('should apply credit for tax paid in another state', () => {
      const miRules = getRulesForState('MI');
      if (!miRules) throw new Error('MI rules not found');

      const input = createBaseInput({
        stateCode: 'MI',
        vehiclePrice: 30000,
        rates: [{ label: 'STATE', rate: 0.06 }],
        originTaxInfo: {
          stateCode: 'OH',
          amount: 1725, // 5.75% OH tax
        },
      });

      const result = calculateTax(input, miRules);

      // MI tax: 30000 * 0.06 = 1800
      // Credit: 1725, Final: 75
      expect(result.debug.reciprocityCredit).toBe(1725);
      expect(result.taxes.totalTax).toBe(75);
    });
  });

  describe('Pennsylvania Reciprocity', () => {
    it('should apply credit for tax paid elsewhere', () => {
      const paRules = getRulesForState('PA');
      if (!paRules) throw new Error('PA rules not found');

      const input = createBaseInput({
        stateCode: 'PA',
        vehiclePrice: 30000,
        rates: [{ label: 'STATE', rate: 0.06 }],
        originTaxInfo: {
          stateCode: 'NJ',
          amount: 1987.5, // 6.625% NJ tax
        },
      });

      const result = calculateTax(input, paRules);

      // PA tax: 30000 * 0.06 = 1800
      // Credit: min(1987.5, 1800) = 1800
      expect(result.debug.reciprocityCredit).toBe(1800);
      expect(result.taxes.totalTax).toBe(0);
    });
  });

  describe('Illinois Reciprocity', () => {
    it('should apply credit for tax paid in another state', () => {
      const ilRules = getRulesForState('IL');
      if (!ilRules) throw new Error('IL rules not found');

      const input = createBaseInput({
        stateCode: 'IL',
        vehiclePrice: 30000,
        rates: [{ label: 'STATE', rate: 0.0625 }],
        originTaxInfo: {
          stateCode: 'WI',
          amount: 1500, // 5% WI tax
        },
      });

      const result = calculateTax(input, ilRules);

      // IL tax: 30000 * 0.0625 = 1875
      // Credit: 1500, Final: 375
      expect(result.debug.reciprocityCredit).toBe(1500);
      expect(result.taxes.totalTax).toBe(375);
    });
  });

  describe('Alabama Reciprocity (Drive-Out Provision)', () => {
    it('should apply credit with drive-out provision', () => {
      const alRules = getRulesForState('AL');
      if (!alRules) throw new Error('AL rules not found');

      const input = createBaseInput({
        stateCode: 'AL',
        vehiclePrice: 30000,
        rates: [{ label: 'STATE', rate: 0.02 }], // AL automotive rate
        originTaxInfo: {
          stateCode: 'TN',
          amount: 2100, // 7% TN tax
        },
      });

      const result = calculateTax(input, alRules);

      // AL uses drive-out provision with credit up to state rate
      expect(result.debug.reciprocityCredit).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // TIME-WINDOW RECIPROCITY TESTS
  // ============================================================================

  describe('Time-Limited Reciprocity (NC 90-day)', () => {
    it('should apply credit when within 90-day window', () => {
      const ncRules = getRulesForState('NC');
      if (!ncRules) throw new Error('NC rules not found');

      const today = new Date('2025-01-15');
      const taxPaidDate = new Date('2024-12-01'); // 45 days ago

      const input = createBaseInput({
        stateCode: 'NC',
        vehiclePrice: 30000,
        asOfDate: today.toISOString().split('T')[0],
        rates: [{ label: 'NC_HUT', rate: 0.03 }],
        originTaxInfo: {
          stateCode: 'SC',
          amount: 1500, // 5% SC tax
          taxPaidDate: taxPaidDate.toISOString().split('T')[0],
        },
      });

      const result = calculateTax(input, ncRules);

      // NC HUT: 900, Credit applied within window
      expect(result.debug.reciprocityCredit).toBe(900); // Capped at NC HUT
      expect(result.taxes.totalTax).toBe(0);
    });

    it('should NOT apply credit when outside 90-day window', () => {
      const ncRules = getRulesForState('NC');
      if (!ncRules) throw new Error('NC rules not found');

      const today = new Date('2025-01-15');
      const taxPaidDate = new Date('2024-10-01'); // 106 days ago

      const input = createBaseInput({
        stateCode: 'NC',
        vehiclePrice: 30000,
        asOfDate: today.toISOString().split('T')[0],
        rates: [{ label: 'NC_HUT', rate: 0.03 }],
        originTaxInfo: {
          stateCode: 'TN',
          amount: 2100,
          taxPaidDate: taxPaidDate.toISOString().split('T')[0],
        },
      });

      const result = calculateTax(input, ncRules);

      // No credit due to 90-day window
      expect(result.debug.reciprocityCredit).toBe(0);
      expect(result.taxes.totalTax).toBe(900);
    });
  });

  // ============================================================================
  // PROOF OF TAX PAID TESTS
  // ============================================================================

  describe('Proof of Tax Paid Requirements', () => {
    it('should include note about proof requirement when enabled', () => {
      const input = createBaseInput({
        vehiclePrice: 30000,
        originTaxInfo: {
          stateCode: 'TX',
          amount: 1500,
        },
      });
      const rules = createBaseRules({
        reciprocity: {
          enabled: true,
          scope: 'BOTH',
          homeStateBehavior: 'CREDIT_UP_TO_STATE_RATE',
          requireProofOfTaxPaid: true,
          basis: 'TAX_PAID',
          capAtThisStatesTax: true,
          hasLeaseException: false,
        },
      });

      const result = calculateTax(input, rules);

      expect(result.debug.notes.some((n) => n.includes('proof') || n.includes('Proof'))).toBe(true);
    });
  });

  // ============================================================================
  // LEASE EXCEPTION TESTS
  // ============================================================================

  describe('Lease Exception', () => {
    it('should handle different reciprocity treatment for leases when hasLeaseException is true', () => {
      const input = createBaseInput({
        dealType: 'LEASE',
        vehiclePrice: 30000,
        originTaxInfo: {
          stateCode: 'TX',
          amount: 1500,
        },
        grossCapCost: 30000,
        basePayment: 400,
        paymentCount: 36,
      });
      const rules = createBaseRules({
        reciprocity: {
          enabled: true,
          scope: 'BOTH',
          homeStateBehavior: 'CREDIT_UP_TO_STATE_RATE',
          requireProofOfTaxPaid: true,
          basis: 'TAX_PAID',
          capAtThisStatesTax: true,
          hasLeaseException: true,
        },
      });

      const result = calculateTax(input, rules);

      // With lease exception, reciprocity may be handled differently
      expect(result.mode).toBe('LEASE');
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Reciprocity Edge Cases', () => {
    it('should handle very small origin tax amounts', () => {
      const input = createBaseInput({
        vehiclePrice: 30000,
        originTaxInfo: {
          stateCode: 'DE',
          amount: 0.01,
        },
      });
      const rules = createBaseRules();

      const result = calculateTax(input, rules);

      expect(result.debug.reciprocityCredit).toBeCloseTo(0.01, 2);
      expect(result.taxes.totalTax).toBeCloseTo(1799.99, 2);
    });

    it('should handle negative origin tax (should not apply)', () => {
      const input = createBaseInput({
        vehiclePrice: 30000,
        originTaxInfo: {
          stateCode: 'XX',
          amount: -100,
        },
      });
      const rules = createBaseRules();

      const result = calculateTax(input, rules);

      // Negative tax should not be applied as credit
      expect(result.debug.reciprocityCredit).toBe(0);
      expect(result.taxes.totalTax).toBe(1800);
    });

    it('should handle origin state same as home state', () => {
      const input = createBaseInput({
        stateCode: 'TX',
        vehiclePrice: 30000,
        originTaxInfo: {
          stateCode: 'TX', // Same state
          amount: 1875,
        },
      });
      const rules = createBaseRules({ stateCode: 'TX' });

      const result = calculateTax(input, rules);

      // Same state - credit should still apply
      expect(result.debug.reciprocityCredit).toBe(1800);
    });
  });
});
