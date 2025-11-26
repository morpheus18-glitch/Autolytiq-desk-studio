/**
 * AUTO TAX ENGINE - LEASE TAX CALCULATION TESTS
 *
 * Comprehensive test suite for lease tax calculation logic in calculateTax.ts
 * Tests cover:
 * - Lease methods (MONTHLY, FULL_UPFRONT, HYBRID)
 * - Trade-in credit modes on leases
 * - Rebate behavior on leases
 * - Cap cost reduction handling
 * - Negative equity on leases
 * - Fee and product taxability on leases
 * - Doc fee handling
 * - Lease breakdown structure
 */

import { describe, it, expect } from 'vitest';
import type {
  TaxCalculationInput,
  TaxRulesConfig,
  LeaseFields,
} from '../../shared/autoTaxEngine/types';
import { calculateTax } from '../../shared/autoTaxEngine/engine/calculateTax';

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Create a base lease input with sensible defaults
 */
function createLeaseInput(
  overrides: Partial<TaxCalculationInput & LeaseFields> = {}
): TaxCalculationInput & LeaseFields {
  return {
    stateCode: 'XX',
    asOfDate: '2025-01-15',
    dealType: 'LEASE',
    vehiclePrice: 35000,
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
    rates: [{ label: 'STATE', rate: 0.07 }],
    // Lease-specific fields
    grossCapCost: 35000,
    capReductionCash: 0,
    capReductionTradeIn: 0,
    capReductionRebateManufacturer: 0,
    capReductionRebateDealer: 0,
    basePayment: 450,
    paymentCount: 36,
    ...overrides,
  } as TaxCalculationInput & LeaseFields;
}

/**
 * Create a base state rules config with sensible defaults for leases
 */
function createRules(overrides: Partial<TaxRulesConfig> = {}): TaxRulesConfig {
  return {
    stateCode: 'XX',
    version: 1,
    tradeInPolicy: { type: 'FULL' },
    rebates: [
      { appliesTo: 'MANUFACTURER', taxable: false },
      { appliesTo: 'DEALER', taxable: true },
    ],
    docFeeTaxable: true,
    feeTaxRules: [
      { code: 'SERVICE_CONTRACT', taxable: true },
      { code: 'GAP', taxable: true },
      { code: 'TITLE', taxable: false },
      { code: 'REG', taxable: false },
    ],
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
      feeTaxRules: [
        { code: 'SERVICE_CONTRACT', taxable: false },
        { code: 'GAP', taxable: false },
        { code: 'DOC_FEE', taxable: true },
      ],
      titleFeeRules: [
        {
          code: 'TITLE',
          taxable: false,
          includedInCapCost: true,
          includedInUpfront: true,
          includedInMonthly: false,
        },
      ],
      taxFeesUpfront: true,
      specialScheme: 'NONE',
    },
    reciprocity: {
      enabled: false,
      scope: 'BOTH',
      homeStateBehavior: 'NONE',
      requireProofOfTaxPaid: false,
      basis: 'TAX_PAID',
      capAtThisStatesTax: true,
      hasLeaseException: false,
    },
    ...overrides,
  };
}

// ============================================================================
// LEASE METHOD TESTS
// ============================================================================

describe('Auto Tax Engine - Lease Tax Calculations', () => {
  describe('Lease Methods', () => {
    describe('MONTHLY Method (Indiana-style)', () => {
      it('should calculate tax on each monthly payment', () => {
        const input = createLeaseInput({
          grossCapCost: 35000,
          basePayment: 450,
          paymentCount: 36,
          docFee: 200,
          rates: [{ label: 'STATE', rate: 0.07 }],
        });
        const rules = createRules({
          leaseRules: {
            method: 'MONTHLY',
            taxCapReduction: false,
            rebateBehavior: 'FOLLOW_RETAIL_RULE',
            docFeeTaxability: 'ALWAYS',
            tradeInCredit: 'FULL',
            negativeEquityTaxable: true,
            feeTaxRules: [{ code: 'DOC_FEE', taxable: true }],
            titleFeeRules: [],
            taxFeesUpfront: true,
            specialScheme: 'NONE',
          },
        });

        const result = calculateTax(input, rules);

        expect(result.mode).toBe('LEASE');
        expect(result.leaseBreakdown).toBeDefined();

        // Monthly payment tax: 450 * 0.07 = 31.50
        expect(result.leaseBreakdown!.paymentTaxesPerPeriod.totalTax).toBeCloseTo(31.5, 2);

        // Upfront tax on doc fee: 200 * 0.07 = 14
        expect(result.leaseBreakdown!.upfrontTaxes.totalTax).toBeCloseTo(14, 2);

        // Total tax over term: upfront + (monthly * paymentCount)
        const expectedTotal = 14 + 31.5 * 36;
        expect(result.leaseBreakdown!.totalTaxOverTerm).toBeCloseTo(expectedTotal, 2);
      });

      it('should only tax fees upfront, not in monthly payments', () => {
        const input = createLeaseInput({
          grossCapCost: 40000,
          basePayment: 500,
          paymentCount: 36,
          docFee: 300,
        });
        const rules = createRules({
          leaseRules: {
            method: 'MONTHLY',
            taxCapReduction: false,
            rebateBehavior: 'FOLLOW_RETAIL_RULE',
            docFeeTaxability: 'ALWAYS',
            tradeInCredit: 'FULL',
            negativeEquityTaxable: true,
            feeTaxRules: [{ code: 'DOC_FEE', taxable: true }],
            titleFeeRules: [],
            taxFeesUpfront: true,
            specialScheme: 'NONE',
          },
        });

        const result = calculateTax(input, rules);

        // Payment tax should be on base payment only
        expect(result.leaseBreakdown!.paymentTaxableBasePerPeriod).toBe(500);
      });
    });

    describe('FULL_UPFRONT Method (NY/NJ-style)', () => {
      it('should calculate all tax upfront', () => {
        const input = createLeaseInput({
          grossCapCost: 35000,
          basePayment: 450,
          paymentCount: 36,
          docFee: 200,
          rates: [{ label: 'STATE', rate: 0.07 }],
        });
        const rules = createRules({
          leaseRules: {
            method: 'FULL_UPFRONT',
            taxCapReduction: false,
            rebateBehavior: 'FOLLOW_RETAIL_RULE',
            docFeeTaxability: 'ALWAYS',
            tradeInCredit: 'FULL',
            negativeEquityTaxable: true,
            feeTaxRules: [{ code: 'DOC_FEE', taxable: true }],
            titleFeeRules: [],
            taxFeesUpfront: true,
            specialScheme: 'NONE',
          },
        });

        const result = calculateTax(input, rules);

        expect(result.mode).toBe('LEASE');
        expect(result.leaseBreakdown).toBeDefined();

        // All tax should be in upfrontTaxes
        expect(result.leaseBreakdown!.upfrontTaxes.totalTax).toBeGreaterThan(0);

        // Monthly payment tax should be 0
        expect(result.leaseBreakdown!.paymentTaxesPerPeriod.totalTax).toBe(0);

        // Total tax over term should equal upfront tax
        expect(result.leaseBreakdown!.totalTaxOverTerm).toBe(
          result.leaseBreakdown!.upfrontTaxes.totalTax
        );
      });

      it('should include all taxable components in upfront base', () => {
        const input = createLeaseInput({
          grossCapCost: 40000,
          basePayment: 500,
          paymentCount: 36,
          docFee: 350,
          serviceContracts: 2000,
          gap: 800,
        });
        const rules = createRules({
          leaseRules: {
            method: 'FULL_UPFRONT',
            taxCapReduction: false,
            rebateBehavior: 'FOLLOW_RETAIL_RULE',
            docFeeTaxability: 'ALWAYS',
            tradeInCredit: 'FULL',
            negativeEquityTaxable: true,
            feeTaxRules: [
              { code: 'DOC_FEE', taxable: true },
              { code: 'SERVICE_CONTRACT', taxable: true },
              { code: 'GAP', taxable: true },
            ],
            titleFeeRules: [],
            taxFeesUpfront: true,
            specialScheme: 'NONE',
          },
        });

        const result = calculateTax(input, rules);

        // Upfront base should include cap cost + doc fee + products
        expect(result.leaseBreakdown!.upfrontTaxableBase).toBeGreaterThan(40000);
      });
    });

    describe('HYBRID Method (Partial upfront + monthly)', () => {
      it('should split tax between upfront and monthly', () => {
        const input = createLeaseInput({
          grossCapCost: 35000,
          basePayment: 450,
          paymentCount: 36,
          docFee: 200,
          serviceContracts: 1500,
          gap: 600,
          rates: [{ label: 'STATE', rate: 0.07 }],
        });
        const rules = createRules({
          leaseRules: {
            method: 'HYBRID',
            taxCapReduction: false,
            rebateBehavior: 'FOLLOW_RETAIL_RULE',
            docFeeTaxability: 'ALWAYS',
            tradeInCredit: 'FULL',
            negativeEquityTaxable: true,
            feeTaxRules: [
              { code: 'DOC_FEE', taxable: true },
              { code: 'SERVICE_CONTRACT', taxable: true },
              { code: 'GAP', taxable: true },
            ],
            titleFeeRules: [],
            taxFeesUpfront: true,
            specialScheme: 'NONE',
          },
        });

        const result = calculateTax(input, rules);

        expect(result.mode).toBe('LEASE');

        // Both upfront and monthly taxes should be present
        expect(result.leaseBreakdown!.upfrontTaxes.totalTax).toBeGreaterThan(0);
        expect(result.leaseBreakdown!.paymentTaxesPerPeriod.totalTax).toBeGreaterThan(0);

        // Total should be sum of upfront + (monthly * paymentCount)
        const expectedTotal =
          result.leaseBreakdown!.upfrontTaxes.totalTax +
          result.leaseBreakdown!.paymentTaxesPerPeriod.totalTax * 36;
        expect(result.leaseBreakdown!.totalTaxOverTerm).toBeCloseTo(expectedTotal, 2);
      });
    });
  });

  // ============================================================================
  // TRADE-IN CREDIT ON LEASES
  // ============================================================================

  describe('Trade-In Credit on Leases', () => {
    describe('NONE - No trade-in credit', () => {
      it('should not apply trade-in credit on leases', () => {
        const input = createLeaseInput({
          grossCapCost: 35000,
          tradeInValue: 8000,
          capReductionTradeIn: 8000,
          basePayment: 400,
          paymentCount: 36,
        });
        const rules = createRules({
          leaseRules: {
            method: 'MONTHLY',
            taxCapReduction: false,
            rebateBehavior: 'FOLLOW_RETAIL_RULE',
            docFeeTaxability: 'ALWAYS',
            tradeInCredit: 'NONE',
            negativeEquityTaxable: true,
            feeTaxRules: [],
            titleFeeRules: [],
            taxFeesUpfront: true,
            specialScheme: 'NONE',
          },
        });

        const result = calculateTax(input, rules);

        // Trade-in should NOT reduce the lease taxable base
        expect(result.debug.appliedTradeIn).toBe(0);
      });
    });

    describe('FULL - Full trade-in credit', () => {
      it('should apply full trade-in credit reducing cap cost', () => {
        const input = createLeaseInput({
          grossCapCost: 35000,
          tradeInValue: 8000,
          capReductionTradeIn: 8000,
          basePayment: 400,
          paymentCount: 36,
        });
        const rules = createRules({
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
        });

        const result = calculateTax(input, rules);

        // Trade-in should reduce the lease taxable base
        expect(result.debug.appliedTradeIn).toBe(8000);
        expect(result.bases.vehicleBase).toBe(27000); // 35000 - 8000
      });
    });

    describe('CAP_COST_ONLY - Reduces cap cost but not separately credited', () => {
      it('should apply trade-in to cap cost only', () => {
        const input = createLeaseInput({
          grossCapCost: 40000,
          tradeInValue: 10000,
          capReductionTradeIn: 10000,
          basePayment: 450,
          paymentCount: 36,
        });
        const rules = createRules({
          leaseRules: {
            method: 'MONTHLY',
            taxCapReduction: false,
            rebateBehavior: 'FOLLOW_RETAIL_RULE',
            docFeeTaxability: 'ALWAYS',
            tradeInCredit: 'CAP_COST_ONLY',
            negativeEquityTaxable: true,
            feeTaxRules: [],
            titleFeeRules: [],
            taxFeesUpfront: true,
            specialScheme: 'NONE',
          },
        });

        const result = calculateTax(input, rules);

        expect(result.debug.appliedTradeIn).toBe(10000);
        expect(result.bases.vehicleBase).toBe(30000);
      });
    });

    describe('FOLLOW_RETAIL_RULE - Uses retail trade-in policy', () => {
      it('should follow FULL retail trade-in policy', () => {
        const input = createLeaseInput({
          grossCapCost: 35000,
          tradeInValue: 7000,
          capReductionTradeIn: 7000,
          basePayment: 420,
          paymentCount: 36,
        });
        const rules = createRules({
          tradeInPolicy: { type: 'FULL' },
          leaseRules: {
            method: 'MONTHLY',
            taxCapReduction: false,
            rebateBehavior: 'FOLLOW_RETAIL_RULE',
            docFeeTaxability: 'ALWAYS',
            tradeInCredit: 'FOLLOW_RETAIL_RULE',
            negativeEquityTaxable: true,
            feeTaxRules: [],
            titleFeeRules: [],
            taxFeesUpfront: true,
            specialScheme: 'NONE',
          },
        });

        const result = calculateTax(input, rules);

        expect(result.debug.appliedTradeIn).toBe(7000);
      });

      it('should follow CAPPED retail trade-in policy', () => {
        const input = createLeaseInput({
          grossCapCost: 35000,
          tradeInValue: 15000,
          capReductionTradeIn: 15000,
          basePayment: 350,
          paymentCount: 36,
        });
        const rules = createRules({
          tradeInPolicy: { type: 'CAPPED', capAmount: 10000 },
          leaseRules: {
            method: 'MONTHLY',
            taxCapReduction: false,
            rebateBehavior: 'FOLLOW_RETAIL_RULE',
            docFeeTaxability: 'ALWAYS',
            tradeInCredit: 'FOLLOW_RETAIL_RULE',
            negativeEquityTaxable: true,
            feeTaxRules: [],
            titleFeeRules: [],
            taxFeesUpfront: true,
            specialScheme: 'NONE',
          },
        });

        const result = calculateTax(input, rules);

        expect(result.debug.appliedTradeIn).toBe(10000);
      });
    });
  });

  // ============================================================================
  // REBATE BEHAVIOR ON LEASES
  // ============================================================================

  describe('Rebate Behavior on Leases', () => {
    describe('FOLLOW_RETAIL_RULE', () => {
      it('should follow retail rebate rules for leases', () => {
        const input = createLeaseInput({
          grossCapCost: 40000,
          rebateManufacturer: 2000,
          capReductionRebateManufacturer: 2000,
          basePayment: 480,
          paymentCount: 36,
        });
        const rules = createRules({
          rebates: [{ appliesTo: 'MANUFACTURER', taxable: false }],
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
        });

        const result = calculateTax(input, rules);

        // Manufacturer rebate should reduce base (non-taxable in retail)
        expect(result.debug.appliedRebatesNonTaxable).toBe(2000);
      });
    });

    describe('ALWAYS_TAXABLE', () => {
      it('should mark all rebates as taxable on leases', () => {
        const input = createLeaseInput({
          grossCapCost: 40000,
          rebateManufacturer: 2000,
          rebateDealer: 1000,
          capReductionRebateManufacturer: 2000,
          capReductionRebateDealer: 1000,
          basePayment: 450,
          paymentCount: 36,
        });
        const rules = createRules({
          leaseRules: {
            method: 'MONTHLY',
            taxCapReduction: false,
            rebateBehavior: 'ALWAYS_TAXABLE',
            docFeeTaxability: 'ALWAYS',
            tradeInCredit: 'FULL',
            negativeEquityTaxable: true,
            feeTaxRules: [],
            titleFeeRules: [],
            taxFeesUpfront: true,
            specialScheme: 'NONE',
          },
        });

        const result = calculateTax(input, rules);

        expect(result.debug.appliedRebatesTaxable).toBe(3000);
        expect(result.debug.appliedRebatesNonTaxable).toBe(0);
      });
    });

    describe('ALWAYS_NON_TAXABLE', () => {
      it('should mark all rebates as non-taxable on leases', () => {
        const input = createLeaseInput({
          grossCapCost: 40000,
          rebateManufacturer: 2000,
          rebateDealer: 1000,
          capReductionRebateManufacturer: 2000,
          capReductionRebateDealer: 1000,
          basePayment: 450,
          paymentCount: 36,
        });
        const rules = createRules({
          leaseRules: {
            method: 'MONTHLY',
            taxCapReduction: false,
            rebateBehavior: 'ALWAYS_NON_TAXABLE',
            docFeeTaxability: 'ALWAYS',
            tradeInCredit: 'FULL',
            negativeEquityTaxable: true,
            feeTaxRules: [],
            titleFeeRules: [],
            taxFeesUpfront: true,
            specialScheme: 'NONE',
          },
        });

        const result = calculateTax(input, rules);

        expect(result.debug.appliedRebatesNonTaxable).toBe(3000);
      });
    });
  });

  // ============================================================================
  // NEGATIVE EQUITY ON LEASES
  // ============================================================================

  describe('Negative Equity on Leases', () => {
    it('should include negative equity when negativeEquityTaxable is true', () => {
      const input = createLeaseInput({
        grossCapCost: 35000,
        negativeEquity: 4000,
        basePayment: 520,
        paymentCount: 36,
      });
      const rules = createRules({
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
      });

      const result = calculateTax(input, rules);

      // Negative equity should increase the base
      expect(result.bases.vehicleBase).toBe(39000); // 35000 + 4000
    });

    it('should exclude negative equity when negativeEquityTaxable is false', () => {
      const input = createLeaseInput({
        grossCapCost: 35000,
        negativeEquity: 4000,
        basePayment: 520,
        paymentCount: 36,
      });
      const rules = createRules({
        leaseRules: {
          method: 'MONTHLY',
          taxCapReduction: false,
          rebateBehavior: 'FOLLOW_RETAIL_RULE',
          docFeeTaxability: 'ALWAYS',
          tradeInCredit: 'FULL',
          negativeEquityTaxable: false,
          feeTaxRules: [],
          titleFeeRules: [],
          taxFeesUpfront: true,
          specialScheme: 'NONE',
        },
      });

      const result = calculateTax(input, rules);

      expect(result.bases.vehicleBase).toBe(35000);
    });
  });

  // ============================================================================
  // DOC FEE HANDLING ON LEASES
  // ============================================================================

  describe('Doc Fee on Leases', () => {
    describe('ALWAYS taxable', () => {
      it('should always include doc fee in upfront tax', () => {
        const input = createLeaseInput({
          grossCapCost: 35000,
          docFee: 350,
          basePayment: 450,
          paymentCount: 36,
          rates: [{ label: 'STATE', rate: 0.06 }],
        });
        const rules = createRules({
          leaseRules: {
            method: 'MONTHLY',
            taxCapReduction: false,
            rebateBehavior: 'FOLLOW_RETAIL_RULE',
            docFeeTaxability: 'ALWAYS',
            tradeInCredit: 'FULL',
            negativeEquityTaxable: true,
            feeTaxRules: [{ code: 'DOC_FEE', taxable: true }],
            titleFeeRules: [],
            taxFeesUpfront: true,
            specialScheme: 'NONE',
          },
        });

        const result = calculateTax(input, rules);

        expect(result.debug.taxableDocFee).toBe(350);
        // Upfront tax should include doc fee tax
        expect(result.leaseBreakdown!.upfrontTaxes.totalTax).toBeCloseTo(21, 2); // 350 * 0.06
      });
    });

    describe('FOLLOW_RETAIL_RULE', () => {
      it('should follow retail docFeeTaxable when true', () => {
        const input = createLeaseInput({
          grossCapCost: 35000,
          docFee: 250,
          basePayment: 450,
          paymentCount: 36,
        });
        const rules = createRules({
          docFeeTaxable: true,
          leaseRules: {
            method: 'MONTHLY',
            taxCapReduction: false,
            rebateBehavior: 'FOLLOW_RETAIL_RULE',
            docFeeTaxability: 'FOLLOW_RETAIL_RULE',
            tradeInCredit: 'FULL',
            negativeEquityTaxable: true,
            feeTaxRules: [],
            titleFeeRules: [],
            taxFeesUpfront: true,
            specialScheme: 'NONE',
          },
        });

        const result = calculateTax(input, rules);

        expect(result.debug.taxableDocFee).toBe(250);
      });

      it('should follow retail docFeeTaxable when false', () => {
        const input = createLeaseInput({
          grossCapCost: 35000,
          docFee: 250,
          basePayment: 450,
          paymentCount: 36,
        });
        const rules = createRules({
          docFeeTaxable: false,
          leaseRules: {
            method: 'MONTHLY',
            taxCapReduction: false,
            rebateBehavior: 'FOLLOW_RETAIL_RULE',
            docFeeTaxability: 'FOLLOW_RETAIL_RULE',
            tradeInCredit: 'FULL',
            negativeEquityTaxable: true,
            feeTaxRules: [],
            titleFeeRules: [],
            taxFeesUpfront: true,
            specialScheme: 'NONE',
          },
        });

        const result = calculateTax(input, rules);

        expect(result.debug.taxableDocFee).toBe(0);
      });
    });

    describe('NEVER taxable', () => {
      it('should never include doc fee in tax calculation', () => {
        const input = createLeaseInput({
          grossCapCost: 35000,
          docFee: 500,
          basePayment: 450,
          paymentCount: 36,
        });
        const rules = createRules({
          leaseRules: {
            method: 'MONTHLY',
            taxCapReduction: false,
            rebateBehavior: 'FOLLOW_RETAIL_RULE',
            docFeeTaxability: 'NEVER',
            tradeInCredit: 'FULL',
            negativeEquityTaxable: true,
            feeTaxRules: [],
            titleFeeRules: [],
            taxFeesUpfront: true,
            specialScheme: 'NONE',
          },
        });

        const result = calculateTax(input, rules);

        expect(result.debug.taxableDocFee).toBe(0);
      });
    });
  });

  // ============================================================================
  // LEASE BREAKDOWN STRUCTURE
  // ============================================================================

  describe('Lease Breakdown Structure', () => {
    it('should include all required lease breakdown fields', () => {
      const input = createLeaseInput({
        grossCapCost: 35000,
        docFee: 200,
        basePayment: 450,
        paymentCount: 36,
      });
      const rules = createRules();

      const result = calculateTax(input, rules);

      expect(result.leaseBreakdown).toBeDefined();
      expect(result.leaseBreakdown).toHaveProperty('upfrontTaxableBase');
      expect(result.leaseBreakdown).toHaveProperty('upfrontTaxes');
      expect(result.leaseBreakdown).toHaveProperty('paymentTaxableBasePerPeriod');
      expect(result.leaseBreakdown).toHaveProperty('paymentTaxesPerPeriod');
      expect(result.leaseBreakdown).toHaveProperty('totalTaxOverTerm');
    });

    it('should include component taxes in upfront taxes', () => {
      const input = createLeaseInput({
        grossCapCost: 35000,
        docFee: 200,
        basePayment: 450,
        paymentCount: 36,
        rates: [
          { label: 'STATE', rate: 0.06 },
          { label: 'COUNTY', rate: 0.01 },
        ],
      });
      const rules = createRules();

      const result = calculateTax(input, rules);

      expect(result.leaseBreakdown!.upfrontTaxes.componentTaxes.length).toBeGreaterThan(0);
    });

    it('should include component taxes in payment taxes', () => {
      const input = createLeaseInput({
        grossCapCost: 35000,
        basePayment: 450,
        paymentCount: 36,
        rates: [
          { label: 'STATE', rate: 0.06 },
          { label: 'COUNTY', rate: 0.01 },
        ],
      });
      const rules = createRules({
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
      });

      const result = calculateTax(input, rules);

      expect(result.leaseBreakdown!.paymentTaxesPerPeriod.componentTaxes.length).toBe(2);
    });
  });

  // ============================================================================
  // TYPICAL STATE SCENARIOS
  // ============================================================================

  describe('Typical State Lease Scenarios', () => {
    it('should handle typical California lease', () => {
      // CA: Monthly taxation, doc cap $85, VSC/GAP not taxed on lease
      const input = createLeaseInput({
        vehiclePrice: 45000,
        grossCapCost: 45000,
        tradeInValue: 5000,
        capReductionTradeIn: 5000,
        docFee: 85,
        basePayment: 550,
        paymentCount: 36,
        serviceContracts: 2000,
        gap: 700,
        rates: [
          { label: 'STATE', rate: 0.0725 },
          { label: 'COUNTY', rate: 0.01 },
          { label: 'CITY', rate: 0.0075 },
        ],
      });

      const rules = createRules({
        tradeInPolicy: { type: 'FULL' },
        leaseRules: {
          method: 'MONTHLY',
          taxCapReduction: false,
          rebateBehavior: 'FOLLOW_RETAIL_RULE',
          docFeeTaxability: 'ALWAYS',
          tradeInCredit: 'FULL',
          negativeEquityTaxable: true,
          feeTaxRules: [
            { code: 'DOC_FEE', taxable: true },
            { code: 'SERVICE_CONTRACT', taxable: false },
            { code: 'GAP', taxable: false },
          ],
          titleFeeRules: [],
          taxFeesUpfront: true,
          specialScheme: 'NONE',
        },
      });

      const result = calculateTax(input, rules);

      expect(result.mode).toBe('LEASE');
      // Trade-in should reduce the base
      expect(result.debug.appliedTradeIn).toBe(5000);
      // Monthly payment tax at 9%
      const expectedPaymentTax = 550 * 0.09;
      expect(result.leaseBreakdown!.paymentTaxesPerPeriod.totalTax).toBeCloseTo(
        expectedPaymentTax,
        2
      );
    });

    it('should handle typical New York lease (full upfront)', () => {
      // NY: Full upfront taxation
      const input = createLeaseInput({
        vehiclePrice: 40000,
        grossCapCost: 40000,
        docFee: 175,
        basePayment: 500,
        paymentCount: 36,
        rates: [
          { label: 'STATE', rate: 0.04 },
          { label: 'LOCAL', rate: 0.045 },
        ],
      });

      const rules = createRules({
        leaseRules: {
          method: 'FULL_UPFRONT',
          taxCapReduction: false,
          rebateBehavior: 'FOLLOW_RETAIL_RULE',
          docFeeTaxability: 'ALWAYS',
          tradeInCredit: 'FULL',
          negativeEquityTaxable: true,
          feeTaxRules: [{ code: 'DOC_FEE', taxable: true }],
          titleFeeRules: [],
          taxFeesUpfront: true,
          specialScheme: 'NY_MTR',
        },
      });

      const result = calculateTax(input, rules);

      expect(result.mode).toBe('LEASE');
      // All tax should be upfront
      expect(result.leaseBreakdown!.paymentTaxesPerPeriod.totalTax).toBe(0);
      expect(result.leaseBreakdown!.upfrontTaxes.totalTax).toBeGreaterThan(0);
    });

    it('should handle typical Indiana lease (monthly)', () => {
      // IN: 7% flat rate, monthly taxation
      const input = createLeaseInput({
        vehiclePrice: 32000,
        grossCapCost: 32000,
        tradeInValue: 6000,
        capReductionTradeIn: 6000,
        docFee: 200,
        basePayment: 380,
        paymentCount: 36,
        rates: [{ label: 'STATE', rate: 0.07 }],
      });

      const rules = createRules({
        leaseRules: {
          method: 'MONTHLY',
          taxCapReduction: false,
          rebateBehavior: 'FOLLOW_RETAIL_RULE',
          docFeeTaxability: 'ALWAYS',
          tradeInCredit: 'FULL',
          negativeEquityTaxable: true,
          feeTaxRules: [{ code: 'DOC_FEE', taxable: true }],
          titleFeeRules: [],
          taxFeesUpfront: true,
          specialScheme: 'NONE',
        },
      });

      const result = calculateTax(input, rules);

      expect(result.mode).toBe('LEASE');
      // Trade-in should reduce base
      expect(result.debug.appliedTradeIn).toBe(6000);
      // Monthly tax: 380 * 0.07 = 26.60
      expect(result.leaseBreakdown!.paymentTaxesPerPeriod.totalTax).toBeCloseTo(26.6, 2);
      // Total over term: upfront + (26.60 * 36)
      const expectedTotal = result.leaseBreakdown!.upfrontTaxes.totalTax + 26.6 * 36;
      expect(result.leaseBreakdown!.totalTaxOverTerm).toBeCloseTo(expectedTotal, 1);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Lease Edge Cases', () => {
    it('should handle zero base payment', () => {
      const input = createLeaseInput({
        grossCapCost: 35000,
        basePayment: 0,
        paymentCount: 1,
      });
      const rules = createRules();

      const result = calculateTax(input, rules);

      expect(result.leaseBreakdown!.paymentTaxesPerPeriod.totalTax).toBe(0);
    });

    it('should handle single payment lease', () => {
      const input = createLeaseInput({
        grossCapCost: 35000,
        basePayment: 35000,
        paymentCount: 1,
      });
      const rules = createRules();

      const result = calculateTax(input, rules);

      expect(result.leaseBreakdown!.totalTaxOverTerm).toBeGreaterThan(0);
    });

    it('should handle very long lease term', () => {
      const input = createLeaseInput({
        grossCapCost: 35000,
        basePayment: 300,
        paymentCount: 84, // 7 years
        rates: [{ label: 'STATE', rate: 0.06 }],
      });
      const rules = createRules();

      const result = calculateTax(input, rules);

      // Total should be upfront + (monthly * 84)
      const monthlyTax = 300 * 0.06;
      expect(result.leaseBreakdown!.totalTaxOverTerm).toBeGreaterThan(monthlyTax * 84 - 1);
    });

    it('should handle trade-in exceeding cap cost', () => {
      const input = createLeaseInput({
        grossCapCost: 30000,
        tradeInValue: 35000,
        capReductionTradeIn: 35000,
        basePayment: 100,
        paymentCount: 36,
      });
      const rules = createRules({
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
      });

      const result = calculateTax(input, rules);

      // Base should be 0, not negative
      expect(result.bases.vehicleBase).toBe(0);
    });
  });
});
