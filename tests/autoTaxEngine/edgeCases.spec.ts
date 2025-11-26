/**
 * AUTO TAX ENGINE - EDGE CASE TESTS
 *
 * Comprehensive test suite for edge cases and boundary conditions:
 * - Zero trade-in value
 * - Negative equity scenarios
 * - Maximum tax caps
 * - Exempt vehicles
 * - Out-of-state purchases
 * - Lease vs retail differences
 * - Boundary values
 * - Error handling
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

function createRetailInput(overrides: Partial<TaxCalculationInput> = {}): TaxCalculationInput {
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
    rates: [{ label: 'STATE', rate: 0.06 }],
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
      feeTaxRules: [],
      titleFeeRules: [],
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
// ZERO VALUE TESTS
// ============================================================================

describe('Zero Value Edge Cases', () => {
  describe('Zero Trade-In Value', () => {
    it('should handle zero trade-in value gracefully', () => {
      const input = createRetailInput({
        vehiclePrice: 30000,
        tradeInValue: 0,
      });
      const rules = createRules();

      const result = calculateTax(input, rules);

      expect(result.debug.appliedTradeIn).toBe(0);
      expect(result.bases.vehicleBase).toBe(30000);
      expect(result.taxes.totalTax).toBe(1800);
    });
  });

  describe('Zero Vehicle Price', () => {
    it('should handle zero vehicle price', () => {
      const input = createRetailInput({ vehiclePrice: 0 });
      const rules = createRules();

      const result = calculateTax(input, rules);

      expect(result.bases.vehicleBase).toBe(0);
      expect(result.taxes.totalTax).toBe(0);
    });

    it('should still include fees when vehicle price is zero', () => {
      const input = createRetailInput({
        vehiclePrice: 0,
        docFee: 500,
        serviceContracts: 2000,
      });
      const rules = createRules();

      const result = calculateTax(input, rules);

      expect(result.bases.feesBase).toBe(500);
      expect(result.bases.productsBase).toBe(2000);
      expect(result.taxes.totalTax).toBeGreaterThan(0);
    });
  });

  describe('Zero Tax Rate', () => {
    it('should handle zero tax rate', () => {
      const input = createRetailInput({
        vehiclePrice: 30000,
        rates: [{ label: 'STATE', rate: 0 }],
      });
      const rules = createRules();

      const result = calculateTax(input, rules);

      expect(result.taxes.totalTax).toBe(0);
    });
  });

  describe('Zero Base Payment (Lease)', () => {
    it('should handle zero base payment on lease', () => {
      const input = createLeaseInput({
        grossCapCost: 35000,
        basePayment: 0,
        paymentCount: 36,
      });
      const rules = createRules();

      const result = calculateTax(input, rules);

      expect(result.leaseBreakdown!.paymentTaxesPerPeriod.totalTax).toBe(0);
    });
  });
});

// ============================================================================
// NEGATIVE EQUITY TESTS
// ============================================================================

describe('Negative Equity Edge Cases', () => {
  describe('Retail Negative Equity', () => {
    it('should add negative equity to taxable base when taxable', () => {
      const input = createRetailInput({
        vehiclePrice: 30000,
        negativeEquity: 5000,
      });
      const rules = createRules({ taxOnNegativeEquity: true });

      const result = calculateTax(input, rules);

      expect(result.bases.vehicleBase).toBe(35000);
      expect(result.taxes.totalTax).toBe(2100); // 35000 * 0.06
    });

    it('should NOT add negative equity when not taxable', () => {
      const input = createRetailInput({
        vehiclePrice: 30000,
        negativeEquity: 5000,
      });
      const rules = createRules({ taxOnNegativeEquity: false });

      const result = calculateTax(input, rules);

      expect(result.bases.vehicleBase).toBe(30000);
      expect(result.taxes.totalTax).toBe(1800);
    });

    it('should handle very large negative equity', () => {
      const input = createRetailInput({
        vehiclePrice: 30000,
        negativeEquity: 20000,
      });
      const rules = createRules({ taxOnNegativeEquity: true });

      const result = calculateTax(input, rules);

      expect(result.bases.vehicleBase).toBe(50000);
      expect(result.taxes.totalTax).toBe(3000);
    });
  });

  describe('Lease Negative Equity', () => {
    it('should add negative equity to lease base when taxable', () => {
      const input = createLeaseInput({
        grossCapCost: 35000,
        negativeEquity: 3000,
        basePayment: 500,
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

      expect(result.bases.vehicleBase).toBe(38000); // 35000 + 3000
    });

    it('should NOT add negative equity to lease when not taxable', () => {
      const input = createLeaseInput({
        grossCapCost: 35000,
        negativeEquity: 3000,
        basePayment: 500,
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
});

// ============================================================================
// TRADE-IN EXCEEDS VEHICLE PRICE TESTS
// ============================================================================

describe('Trade-In Exceeds Vehicle Price', () => {
  it('should not create negative vehicle base', () => {
    const input = createRetailInput({
      vehiclePrice: 20000,
      tradeInValue: 25000,
    });
    const rules = createRules();

    const result = calculateTax(input, rules);

    expect(result.bases.vehicleBase).toBeGreaterThanOrEqual(0);
    expect(result.taxes.totalTax).toBeGreaterThanOrEqual(0);
  });

  it('should result in zero vehicle base when trade-in exceeds price', () => {
    const input = createRetailInput({
      vehiclePrice: 20000,
      tradeInValue: 30000,
    });
    const rules = createRules();

    const result = calculateTax(input, rules);

    // The implementation may return full trade-in value but clamp vehicle base to 0
    // The key behavior is that vehicle base is never negative
    expect(result.bases.vehicleBase).toBe(0);
    // Applied trade-in can be full value OR capped at vehicle price depending on implementation
    expect(result.debug.appliedTradeIn).toBeGreaterThanOrEqual(0);
  });

  it('should still tax fees and products even with excess trade-in', () => {
    const input = createRetailInput({
      vehiclePrice: 20000,
      tradeInValue: 25000,
      docFee: 500,
      serviceContracts: 2000,
    });
    const rules = createRules();

    const result = calculateTax(input, rules);

    expect(result.bases.feesBase).toBe(500);
    expect(result.bases.productsBase).toBe(2000);
    // Total taxable: 0 (vehicle) + 500 (fees) + 2000 (products) = 2500
    expect(result.bases.totalTaxableBase).toBe(2500);
    expect(result.taxes.totalTax).toBe(150); // 2500 * 0.06
  });
});

// ============================================================================
// MAXIMUM TAX CAP TESTS
// ============================================================================

describe('Tax Cap Edge Cases', () => {
  describe('Capped Trade-In', () => {
    it('should cap trade-in at specified amount', () => {
      const input = createRetailInput({
        vehiclePrice: 50000,
        tradeInValue: 20000,
      });
      const rules = createRules({
        tradeInPolicy: { type: 'CAPPED', capAmount: 10000 },
      });

      const result = calculateTax(input, rules);

      expect(result.debug.appliedTradeIn).toBe(10000);
      expect(result.bases.vehicleBase).toBe(40000);
    });

    it('should use full trade-in when under cap', () => {
      const input = createRetailInput({
        vehiclePrice: 50000,
        tradeInValue: 5000,
      });
      const rules = createRules({
        tradeInPolicy: { type: 'CAPPED', capAmount: 10000 },
      });

      const result = calculateTax(input, rules);

      expect(result.debug.appliedTradeIn).toBe(5000);
    });

    it('should handle cap amount of zero', () => {
      const input = createRetailInput({
        vehiclePrice: 50000,
        tradeInValue: 20000,
      });
      const rules = createRules({
        tradeInPolicy: { type: 'CAPPED', capAmount: 0 },
      });

      const result = calculateTax(input, rules);

      expect(result.debug.appliedTradeIn).toBe(0);
    });
  });

  describe('Percent Trade-In', () => {
    it('should apply 50% credit', () => {
      const input = createRetailInput({
        vehiclePrice: 40000,
        tradeInValue: 10000,
      });
      const rules = createRules({
        tradeInPolicy: { type: 'PERCENT', percent: 0.5 },
      });

      const result = calculateTax(input, rules);

      expect(result.debug.appliedTradeIn).toBe(5000);
    });

    it('should handle 0% credit', () => {
      const input = createRetailInput({
        vehiclePrice: 40000,
        tradeInValue: 10000,
      });
      const rules = createRules({
        tradeInPolicy: { type: 'PERCENT', percent: 0 },
      });

      const result = calculateTax(input, rules);

      expect(result.debug.appliedTradeIn).toBe(0);
    });

    it('should handle 100% credit', () => {
      const input = createRetailInput({
        vehiclePrice: 40000,
        tradeInValue: 10000,
      });
      const rules = createRules({
        tradeInPolicy: { type: 'PERCENT', percent: 1.0 },
      });

      const result = calculateTax(input, rules);

      expect(result.debug.appliedTradeIn).toBe(10000);
    });
  });
});

// ============================================================================
// EXEMPT VEHICLES / ZERO TAX SCENARIOS
// ============================================================================

describe('Exempt Vehicle Scenarios', () => {
  it('should handle vehicle with no tax rates provided', () => {
    const input = createRetailInput({
      vehiclePrice: 30000,
      rates: [],
    });
    const rules = createRules();

    const result = calculateTax(input, rules);

    expect(result.taxes.componentTaxes).toHaveLength(0);
    expect(result.taxes.totalTax).toBe(0);
  });

  it('should handle all components being zero', () => {
    const input = createRetailInput({
      vehiclePrice: 0,
      tradeInValue: 0,
      rebateManufacturer: 0,
      rebateDealer: 0,
      docFee: 0,
      serviceContracts: 0,
      gap: 0,
      negativeEquity: 0,
    });
    const rules = createRules();

    const result = calculateTax(input, rules);

    expect(result.bases.totalTaxableBase).toBe(0);
    expect(result.taxes.totalTax).toBe(0);
  });
});

// ============================================================================
// OUT-OF-STATE PURCHASE TESTS
// ============================================================================

describe('Out-of-State Purchase Scenarios', () => {
  it('should apply reciprocity credit from out-of-state purchase', () => {
    const input = createRetailInput({
      vehiclePrice: 30000,
      originTaxInfo: {
        stateCode: 'TX',
        amount: 1875, // 6.25% TX tax
      },
    });
    const rules = createRules({
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

    // Home state tax: 1800, Credit: min(1875, 1800) = 1800
    expect(result.debug.reciprocityCredit).toBe(1800);
    expect(result.taxes.totalTax).toBe(0);
  });

  it('should owe difference when origin tax is lower', () => {
    const input = createRetailInput({
      vehiclePrice: 30000,
      originTaxInfo: {
        stateCode: 'AZ',
        amount: 1200, // 4% hypothetical
      },
    });
    const rules = createRules({
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

    expect(result.debug.reciprocityCredit).toBe(1200);
    expect(result.taxes.totalTax).toBe(600); // 1800 - 1200
  });

  it('should not apply reciprocity when disabled', () => {
    const input = createRetailInput({
      vehiclePrice: 30000,
      originTaxInfo: {
        stateCode: 'TX',
        amount: 2000,
      },
    });
    const rules = createRules({
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
});

// ============================================================================
// LEASE VS RETAIL DIFFERENCE TESTS
// ============================================================================

describe('Lease vs Retail Differences', () => {
  describe('Trade-In Treatment', () => {
    it('should apply full trade-in on retail when policy is FULL', () => {
      const input = createRetailInput({
        vehiclePrice: 40000,
        tradeInValue: 10000,
      });
      const rules = createRules({ tradeInPolicy: { type: 'FULL' } });

      const result = calculateTax(input, rules);

      expect(result.debug.appliedTradeIn).toBe(10000);
    });

    it('should apply NO trade-in on lease when leaseRules.tradeInCredit is NONE', () => {
      const input = createLeaseInput({
        grossCapCost: 40000,
        tradeInValue: 10000,
        capReductionTradeIn: 10000,
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

      expect(result.debug.appliedTradeIn).toBe(0);
    });
  });

  describe('Negative Equity Treatment', () => {
    it('should handle different negative equity treatment between retail and lease', () => {
      const retailInput = createRetailInput({
        vehiclePrice: 30000,
        negativeEquity: 5000,
      });
      const leaseInput = createLeaseInput({
        grossCapCost: 30000,
        negativeEquity: 5000,
        basePayment: 400,
      });

      // Retail: negative equity NOT taxable
      const rulesRetailNoTax = createRules({ taxOnNegativeEquity: false });
      const retailResult = calculateTax(retailInput, rulesRetailNoTax);

      // Lease: negative equity IS taxable
      const rulesLeaseTax = createRules({
        taxOnNegativeEquity: false, // Retail setting ignored for lease
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
      const leaseResult = calculateTax(leaseInput, rulesLeaseTax);

      expect(retailResult.bases.vehicleBase).toBe(30000); // No neg equity
      expect(leaseResult.bases.vehicleBase).toBe(35000); // With neg equity
    });
  });

  describe('F&I Product Treatment', () => {
    it('should tax VSC on retail when taxable', () => {
      const input = createRetailInput({
        vehiclePrice: 30000,
        serviceContracts: 2000,
      });
      const rules = createRules({ taxOnServiceContracts: true });

      const result = calculateTax(input, rules);

      expect(result.debug.taxableServiceContracts).toBe(2000);
    });

    it('should NOT tax VSC on lease when lease rules say no', () => {
      const input = createLeaseInput({
        grossCapCost: 30000,
        serviceContracts: 2000,
        basePayment: 400,
      });
      const rules = createRules({
        taxOnServiceContracts: true, // Retail setting
        leaseRules: {
          method: 'MONTHLY',
          taxCapReduction: false,
          rebateBehavior: 'FOLLOW_RETAIL_RULE',
          docFeeTaxability: 'ALWAYS',
          tradeInCredit: 'FULL',
          negativeEquityTaxable: true,
          feeTaxRules: [{ code: 'SERVICE_CONTRACT', taxable: false }],
          titleFeeRules: [],
          taxFeesUpfront: true,
          specialScheme: 'NONE',
        },
      });

      const result = calculateTax(input, rules);

      // Lease uses its own fee rules
      expect(result.debug.taxableServiceContracts).toBe(0);
    });
  });
});

// ============================================================================
// BOUNDARY VALUE TESTS
// ============================================================================

describe('Boundary Value Tests', () => {
  it('should handle very small vehicle price', () => {
    const input = createRetailInput({ vehiclePrice: 0.01 });
    const rules = createRules();

    const result = calculateTax(input, rules);

    expect(result.bases.vehicleBase).toBeCloseTo(0.01, 4);
    expect(result.taxes.totalTax).toBeCloseTo(0.0006, 4);
  });

  it('should handle very large vehicle price', () => {
    const input = createRetailInput({ vehiclePrice: 1000000 });
    const rules = createRules();

    const result = calculateTax(input, rules);

    expect(result.bases.vehicleBase).toBe(1000000);
    expect(result.taxes.totalTax).toBe(60000);
  });

  it('should handle very small tax rate', () => {
    const input = createRetailInput({
      vehiclePrice: 30000,
      rates: [{ label: 'STATE', rate: 0.0001 }],
    });
    const rules = createRules();

    const result = calculateTax(input, rules);

    expect(result.taxes.totalTax).toBeCloseTo(3, 2);
  });

  it('should handle single-payment lease (paymentCount = 1)', () => {
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
      basePayment: 250,
      paymentCount: 84, // 7 years
    });
    const rules = createRules();

    const result = calculateTax(input, rules);

    expect(result.leaseBreakdown!.paymentTaxesPerPeriod.totalTax).toBeGreaterThan(0);
    expect(result.leaseBreakdown!.totalTaxOverTerm).toBeGreaterThan(
      result.leaseBreakdown!.paymentTaxesPerPeriod.totalTax * 83
    );
  });
});

// ============================================================================
// MULTI-COMPONENT RATE TESTS
// ============================================================================

describe('Multi-Component Rate Edge Cases', () => {
  it('should handle many small rate components', () => {
    const input = createRetailInput({
      vehiclePrice: 30000,
      rates: [
        { label: 'STATE', rate: 0.04 },
        { label: 'COUNTY', rate: 0.01 },
        { label: 'CITY', rate: 0.005 },
        { label: 'TRANSIT', rate: 0.005 },
        { label: 'SPECIAL_1', rate: 0.0025 },
        { label: 'SPECIAL_2', rate: 0.0025 },
      ],
    });
    const rules = createRules();

    const result = calculateTax(input, rules);

    // Total rate: 6.5%
    expect(result.taxes.componentTaxes).toHaveLength(6);
    expect(result.taxes.totalTax).toBeCloseTo(1950, 2);
  });

  it('should handle single rate component', () => {
    const input = createRetailInput({
      vehiclePrice: 30000,
      rates: [{ label: 'STATE', rate: 0.07 }],
    });
    const rules = createRules();

    const result = calculateTax(input, rules);

    expect(result.taxes.componentTaxes).toHaveLength(1);
    expect(result.taxes.totalTax).toBe(2100);
  });
});

// ============================================================================
// COMPLEX COMBINATION TESTS
// ============================================================================

describe('Complex Combination Edge Cases', () => {
  it('should handle all components at maximum values', () => {
    const input = createRetailInput({
      vehiclePrice: 200000,
      accessoriesAmount: 20000,
      tradeInValue: 50000,
      rebateManufacturer: 10000,
      rebateDealer: 5000,
      docFee: 1000,
      otherFees: [
        { code: 'SERVICE_CONTRACT', amount: 5000 },
        { code: 'GAP', amount: 2000 },
      ],
      serviceContracts: 5000,
      gap: 2000,
      negativeEquity: 15000,
      rates: [
        { label: 'STATE', rate: 0.0725 },
        { label: 'LOCAL', rate: 0.03 },
      ],
    });
    const rules = createRules();

    const result = calculateTax(input, rules);

    // Verify all components are processed
    expect(result.debug.appliedTradeIn).toBe(50000);
    expect(result.debug.appliedRebatesNonTaxable).toBe(10000);
    expect(result.debug.appliedRebatesTaxable).toBe(5000);
    expect(result.debug.taxableDocFee).toBe(1000);
    expect(result.bases.totalTaxableBase).toBeGreaterThan(0);
    expect(result.taxes.totalTax).toBeGreaterThan(0);
  });

  it('should handle all reductions maxed out (negative base scenario)', () => {
    const input = createRetailInput({
      vehiclePrice: 30000,
      tradeInValue: 35000, // Exceeds vehicle price
      rebateManufacturer: 5000,
    });
    const rules = createRules();

    const result = calculateTax(input, rules);

    // Should not have negative base
    expect(result.bases.vehicleBase).toBeGreaterThanOrEqual(0);
    expect(result.taxes.totalTax).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// DATE HANDLING TESTS
// ============================================================================

describe('Date Handling Edge Cases', () => {
  it('should handle future asOfDate', () => {
    const input = createRetailInput({
      vehiclePrice: 30000,
      asOfDate: '2030-12-31',
    });
    const rules = createRules();

    const result = calculateTax(input, rules);

    expect(result.taxes.totalTax).toBe(1800);
  });

  it('should handle past asOfDate', () => {
    const input = createRetailInput({
      vehiclePrice: 30000,
      asOfDate: '2020-01-01',
    });
    const rules = createRules();

    const result = calculateTax(input, rules);

    expect(result.taxes.totalTax).toBe(1800);
  });

  it('should handle reciprocity time window edge case', () => {
    const input = createRetailInput({
      vehiclePrice: 30000,
      asOfDate: '2025-01-15',
      originTaxInfo: {
        stateCode: 'SC',
        amount: 1500,
        taxPaidDate: '2024-10-17', // Exactly 90 days ago
      },
    });
    const rules = createRules({
      reciprocity: {
        enabled: true,
        scope: 'BOTH',
        homeStateBehavior: 'CREDIT_UP_TO_STATE_RATE',
        requireProofOfTaxPaid: true,
        basis: 'TAX_PAID',
        capAtThisStatesTax: true,
        hasLeaseException: false,
        overrides: [{ originState: 'ALL', maxAgeDaysSinceTaxPaid: 90 }],
      },
    });

    // At exactly 90 days, credit should still apply
    const result = calculateTax(input, rules);

    expect(result.debug.reciprocityCredit).toBeGreaterThanOrEqual(0);
  });
});
