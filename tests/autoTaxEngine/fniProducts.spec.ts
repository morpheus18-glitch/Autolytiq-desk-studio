/**
 * AUTO TAX ENGINE - F&I PRODUCT TAXABILITY TESTS
 *
 * Comprehensive test suite for Finance & Insurance (F&I) product taxability:
 * - Service Contracts (VSC/Extended Warranties)
 * - GAP Insurance
 * - Tire & Wheel Protection
 * - Paint & Fabric Protection
 * - Key Replacement
 * - Theft Protection
 * - Windshield Protection
 *
 * F&I product taxability varies significantly by state and transaction type.
 */

import { describe, it, expect } from 'vitest';
import type {
  TaxCalculationInput,
  TaxRulesConfig,
  LeaseFields,
} from '../../shared/autoTaxEngine/types';
import { calculateTax } from '../../shared/autoTaxEngine/engine/calculateTax';
import { getRulesForState, isStateImplemented } from '../../shared/autoTaxEngine/rules';

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createRetailInput(overrides: Partial<TaxCalculationInput> = {}): TaxCalculationInput {
  return {
    stateCode: 'XX',
    asOfDate: '2025-01-15',
    dealType: 'RETAIL',
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
      { code: 'TIRE_WHEEL', taxable: true },
      { code: 'PAINT_FABRIC', taxable: true },
      { code: 'KEY_REPLACEMENT', taxable: true },
      { code: 'THEFT_PROTECTION', taxable: true },
      { code: 'WINDSHIELD', taxable: true },
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
      ],
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
// SERVICE CONTRACT (VSC) TESTS
// ============================================================================

describe('Service Contract (VSC) Taxability', () => {
  describe('Retail Service Contracts', () => {
    it('should include VSC in taxable base when taxOnServiceContracts is true', () => {
      const input = createRetailInput({
        vehiclePrice: 35000,
        serviceContracts: 2500,
      });
      const rules = createRules({ taxOnServiceContracts: true });

      const result = calculateTax(input, rules);

      expect(result.debug.taxableServiceContracts).toBe(2500);
      expect(result.bases.productsBase).toBe(2500);
      // Total taxable: 35000 + 2500 = 37500
      expect(result.bases.totalTaxableBase).toBe(37500);
      // Tax: 37500 * 0.06 = 2250
      expect(result.taxes.totalTax).toBe(2250);
    });

    it('should NOT include VSC when taxOnServiceContracts is false', () => {
      const input = createRetailInput({
        vehiclePrice: 35000,
        serviceContracts: 2500,
      });
      const rules = createRules({ taxOnServiceContracts: false });

      const result = calculateTax(input, rules);

      expect(result.debug.taxableServiceContracts).toBe(0);
      expect(result.bases.productsBase).toBe(0);
      expect(result.bases.totalTaxableBase).toBe(35000);
      expect(result.taxes.totalTax).toBe(2100);
    });
  });

  describe('Lease Service Contracts', () => {
    it('should use lease-specific fee rules for VSC', () => {
      const input = createLeaseInput({
        grossCapCost: 35000,
        serviceContracts: 2500,
        basePayment: 450,
      });
      // Lease rules: SERVICE_CONTRACT is NOT taxable
      const rules = createRules({
        taxOnServiceContracts: true, // Retail setting (ignored for lease)
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

      expect(result.debug.taxableServiceContracts).toBe(0);
    });

    it('should tax VSC on lease when lease rules specify taxable', () => {
      const input = createLeaseInput({
        grossCapCost: 35000,
        serviceContracts: 2500,
        basePayment: 450,
      });
      const rules = createRules({
        leaseRules: {
          method: 'MONTHLY',
          taxCapReduction: false,
          rebateBehavior: 'FOLLOW_RETAIL_RULE',
          docFeeTaxability: 'ALWAYS',
          tradeInCredit: 'FULL',
          negativeEquityTaxable: true,
          feeTaxRules: [{ code: 'SERVICE_CONTRACT', taxable: true }],
          titleFeeRules: [],
          taxFeesUpfront: true,
          specialScheme: 'NONE',
        },
      });

      const result = calculateTax(input, rules);

      expect(result.debug.taxableServiceContracts).toBe(2500);
    });
  });

  describe('State-Specific VSC Rules', () => {
    it('Texas - VSC NOT taxable (treated as insurance)', () => {
      const txRules = getRulesForState('TX');
      if (!txRules) throw new Error('TX rules not found');

      expect(txRules.taxOnServiceContracts).toBe(false);

      const input = createRetailInput({
        stateCode: 'TX',
        vehiclePrice: 35000,
        serviceContracts: 2500,
        rates: [{ label: 'STATE', rate: 0.0625 }],
      });

      const result = calculateTax(input, txRules);

      expect(result.debug.taxableServiceContracts).toBe(0);
    });

    it('California - VSC IS taxable on retail', () => {
      const caRules = getRulesForState('CA');
      if (!caRules) throw new Error('CA rules not found');

      expect(caRules.taxOnServiceContracts).toBe(true);

      const input = createRetailInput({
        stateCode: 'CA',
        vehiclePrice: 35000,
        serviceContracts: 2500,
        rates: [{ label: 'STATE', rate: 0.0725 }],
      });

      const result = calculateTax(input, caRules);

      expect(result.debug.taxableServiceContracts).toBe(2500);
    });

    it('Alabama - VSC NOT taxable', () => {
      const alRules = getRulesForState('AL');
      if (!alRules) throw new Error('AL rules not found');

      expect(alRules.taxOnServiceContracts).toBe(false);
    });

    it('West Virginia - VSC IS taxable (unique to WV)', () => {
      const wvRules = getRulesForState('WV');
      if (!wvRules) throw new Error('WV rules not found');

      expect(wvRules.taxOnServiceContracts).toBe(true);
    });
  });
});

// ============================================================================
// GAP INSURANCE TESTS
// ============================================================================

describe('GAP Insurance Taxability', () => {
  describe('Retail GAP', () => {
    it('should include GAP in taxable base when taxOnGap is true', () => {
      const input = createRetailInput({
        vehiclePrice: 35000,
        gap: 800,
      });
      const rules = createRules({ taxOnGap: true });

      const result = calculateTax(input, rules);

      expect(result.debug.taxableGap).toBe(800);
      expect(result.bases.productsBase).toBe(800);
    });

    it('should NOT include GAP when taxOnGap is false', () => {
      const input = createRetailInput({
        vehiclePrice: 35000,
        gap: 800,
      });
      const rules = createRules({ taxOnGap: false });

      const result = calculateTax(input, rules);

      expect(result.debug.taxableGap).toBe(0);
    });
  });

  describe('Lease GAP', () => {
    it('should use lease-specific fee rules for GAP', () => {
      const input = createLeaseInput({
        grossCapCost: 35000,
        gap: 800,
        basePayment: 450,
      });
      const rules = createRules({
        taxOnGap: true, // Retail setting
        leaseRules: {
          method: 'MONTHLY',
          taxCapReduction: false,
          rebateBehavior: 'FOLLOW_RETAIL_RULE',
          docFeeTaxability: 'ALWAYS',
          tradeInCredit: 'FULL',
          negativeEquityTaxable: true,
          feeTaxRules: [{ code: 'GAP', taxable: false }],
          titleFeeRules: [],
          taxFeesUpfront: true,
          specialScheme: 'NONE',
        },
      });

      const result = calculateTax(input, rules);

      expect(result.debug.taxableGap).toBe(0);
    });
  });

  describe('State-Specific GAP Rules', () => {
    it('Texas - GAP NOT taxable', () => {
      const txRules = getRulesForState('TX');
      if (!txRules) throw new Error('TX rules not found');

      expect(txRules.taxOnGap).toBe(false);
    });

    it('California - GAP IS taxable on retail', () => {
      const caRules = getRulesForState('CA');
      if (!caRules) throw new Error('CA rules not found');

      expect(caRules.taxOnGap).toBe(true);
    });

    it('West Virginia - GAP IS taxable', () => {
      const wvRules = getRulesForState('WV');
      if (!wvRules) throw new Error('WV rules not found');

      expect(wvRules.taxOnGap).toBe(true);
    });
  });
});

// ============================================================================
// COMBINED F&I PRODUCTS TESTS
// ============================================================================

describe('Combined F&I Products', () => {
  it('should handle multiple F&I products correctly', () => {
    const input = createRetailInput({
      vehiclePrice: 35000,
      serviceContracts: 2500,
      gap: 800,
      otherFees: [
        { code: 'TIRE_WHEEL', amount: 500 },
        { code: 'PAINT_FABRIC', amount: 300 },
        { code: 'KEY_REPLACEMENT', amount: 200 },
      ],
    });
    const rules = createRules({
      taxOnServiceContracts: true,
      taxOnGap: true,
    });

    const result = calculateTax(input, rules);

    // Products base: VSC + GAP = 3300
    expect(result.bases.productsBase).toBe(3300);

    // Fees base: tire_wheel + paint_fabric + key_replacement = 1000
    expect(result.bases.feesBase).toBe(1000);

    // Total taxable: 35000 + 3300 + 1000 = 39300
    expect(result.bases.totalTaxableBase).toBe(39300);
  });

  it('should handle mixed taxable/non-taxable F&I products', () => {
    const input = createRetailInput({
      vehiclePrice: 35000,
      serviceContracts: 2500,
      gap: 800,
      otherFees: [
        { code: 'TIRE_WHEEL', amount: 500 },
        { code: 'TITLE', amount: 50 }, // Non-taxable
        { code: 'REG', amount: 100 }, // Non-taxable
      ],
    });
    const rules = createRules({
      taxOnServiceContracts: true,
      taxOnGap: true,
    });

    const result = calculateTax(input, rules);

    // Products base: 3300
    expect(result.bases.productsBase).toBe(3300);

    // Fees base: only tire_wheel (TITLE and REG are not taxable)
    expect(result.bases.feesBase).toBe(500);

    // Taxable fees should only include TIRE_WHEEL
    expect(result.debug.taxableFees.length).toBe(1);
    expect(result.debug.taxableFees[0].code).toBe('TIRE_WHEEL');
  });
});

// ============================================================================
// DOC FEE TESTS
// ============================================================================

describe('Doc Fee Taxability', () => {
  describe('Retail Doc Fee', () => {
    it('should include doc fee when docFeeTaxable is true', () => {
      const input = createRetailInput({
        vehiclePrice: 35000,
        docFee: 500,
      });
      const rules = createRules({ docFeeTaxable: true });

      const result = calculateTax(input, rules);

      expect(result.debug.taxableDocFee).toBe(500);
      expect(result.bases.feesBase).toBe(500);
    });

    it('should NOT include doc fee when docFeeTaxable is false', () => {
      const input = createRetailInput({
        vehiclePrice: 35000,
        docFee: 500,
      });
      const rules = createRules({ docFeeTaxable: false });

      const result = calculateTax(input, rules);

      expect(result.debug.taxableDocFee).toBe(0);
      expect(result.bases.feesBase).toBe(0);
    });
  });

  describe('Lease Doc Fee', () => {
    it('should tax doc fee when docFeeTaxability is ALWAYS', () => {
      const input = createLeaseInput({
        grossCapCost: 35000,
        docFee: 300,
        basePayment: 450,
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

      expect(result.debug.taxableDocFee).toBe(300);
    });

    it('should NOT tax doc fee when docFeeTaxability is NEVER', () => {
      const input = createLeaseInput({
        grossCapCost: 35000,
        docFee: 300,
        basePayment: 450,
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

  describe('State-Specific Doc Fee Rules', () => {
    it('California - Doc fee taxable, capped at $85', () => {
      const caRules = getRulesForState('CA');
      if (!caRules) throw new Error('CA rules not found');

      expect(caRules.docFeeTaxable).toBe(true);
      expect(caRules.extras?.docFeeCapAmount).toBe(85);
    });

    it('Georgia - Doc fee NOT subject to TAVT', () => {
      const gaRules = getRulesForState('GA');
      if (!gaRules) throw new Error('GA rules not found');

      expect(gaRules.docFeeTaxable).toBe(false);
    });
  });
});

// ============================================================================
// ACCESSORIES TESTS
// ============================================================================

describe('Accessories Taxability', () => {
  describe('Retail Accessories', () => {
    it('should include accessories in vehicle base when taxable', () => {
      const input = createRetailInput({
        vehiclePrice: 35000,
        accessoriesAmount: 3000,
      });
      const rules = createRules({ taxOnAccessories: true });

      const result = calculateTax(input, rules);

      expect(result.bases.vehicleBase).toBe(38000);
    });

    it('should NOT include accessories when not taxable', () => {
      const input = createRetailInput({
        vehiclePrice: 35000,
        accessoriesAmount: 3000,
      });
      const rules = createRules({ taxOnAccessories: false });

      const result = calculateTax(input, rules);

      expect(result.bases.vehicleBase).toBe(35000);
    });
  });
});

// ============================================================================
// OTHER FEE TYPES TESTS
// ============================================================================

describe('Other F&I Fee Types', () => {
  it('should handle TIRE_WHEEL protection', () => {
    const input = createRetailInput({
      vehiclePrice: 35000,
      otherFees: [{ code: 'TIRE_WHEEL', amount: 700 }],
    });
    const rules = createRules({
      feeTaxRules: [{ code: 'TIRE_WHEEL', taxable: true }],
    });

    const result = calculateTax(input, rules);

    expect(result.debug.taxableFees.find((f) => f.code === 'TIRE_WHEEL')).toBeDefined();
    expect(result.bases.feesBase).toBe(700);
  });

  it('should handle PAINT_FABRIC protection', () => {
    const input = createRetailInput({
      vehiclePrice: 35000,
      otherFees: [{ code: 'PAINT_FABRIC', amount: 400 }],
    });
    const rules = createRules({
      feeTaxRules: [{ code: 'PAINT_FABRIC', taxable: true }],
    });

    const result = calculateTax(input, rules);

    expect(result.debug.taxableFees.find((f) => f.code === 'PAINT_FABRIC')).toBeDefined();
  });

  it('should handle KEY_REPLACEMENT', () => {
    const input = createRetailInput({
      vehiclePrice: 35000,
      otherFees: [{ code: 'KEY_REPLACEMENT', amount: 300 }],
    });
    const rules = createRules({
      feeTaxRules: [{ code: 'KEY_REPLACEMENT', taxable: true }],
    });

    const result = calculateTax(input, rules);

    expect(result.debug.taxableFees.find((f) => f.code === 'KEY_REPLACEMENT')).toBeDefined();
  });

  it('should handle THEFT_PROTECTION', () => {
    const input = createRetailInput({
      vehiclePrice: 35000,
      otherFees: [{ code: 'THEFT_PROTECTION', amount: 350 }],
    });
    const rules = createRules({
      feeTaxRules: [{ code: 'THEFT_PROTECTION', taxable: true }],
    });

    const result = calculateTax(input, rules);

    expect(result.debug.taxableFees.find((f) => f.code === 'THEFT_PROTECTION')).toBeDefined();
  });

  it('should handle WINDSHIELD protection', () => {
    const input = createRetailInput({
      vehiclePrice: 35000,
      otherFees: [{ code: 'WINDSHIELD', amount: 250 }],
    });
    const rules = createRules({
      feeTaxRules: [{ code: 'WINDSHIELD', taxable: true }],
    });

    const result = calculateTax(input, rules);

    expect(result.debug.taxableFees.find((f) => f.code === 'WINDSHIELD')).toBeDefined();
  });

  it('should handle unknown fee codes gracefully', () => {
    const input = createRetailInput({
      vehiclePrice: 35000,
      otherFees: [{ code: 'CUSTOM_PRODUCT', amount: 500 }],
    });
    const rules = createRules(); // No rule for CUSTOM_PRODUCT

    const result = calculateTax(input, rules);

    // Unknown fee should be non-taxable by default
    expect(result.debug.taxableFees.find((f) => f.code === 'CUSTOM_PRODUCT')).toBeUndefined();
  });
});

// ============================================================================
// STATE COMPARISON - F&I TREATMENT
// ============================================================================

describe('State Comparison - F&I Treatment', () => {
  it('should show TX has lower effective tax with F&I products', () => {
    const vehiclePrice = 35000;
    const serviceContracts = 2500;
    const gap = 800;

    // California - taxes F&I on retail
    const caRules = getRulesForState('CA')!;
    const caInput = createRetailInput({
      stateCode: 'CA',
      vehiclePrice,
      serviceContracts,
      gap,
      rates: [{ label: 'STATE', rate: 0.0725 }],
    });
    const caResult = calculateTax(caInput, caRules);

    // Texas - does NOT tax F&I
    const txRules = getRulesForState('TX')!;
    const txInput = createRetailInput({
      stateCode: 'TX',
      vehiclePrice,
      serviceContracts,
      gap,
      rates: [{ label: 'STATE', rate: 0.0625 }],
    });
    const txResult = calculateTax(txInput, txRules);

    // CA taxes F&I products
    expect(caResult.debug.taxableServiceContracts).toBe(2500);
    expect(caResult.debug.taxableGap).toBe(800);

    // TX does NOT tax F&I products
    expect(txResult.debug.taxableServiceContracts).toBe(0);
    expect(txResult.debug.taxableGap).toBe(0);

    // TX total tax is lower because F&I isn't taxed
    expect(txResult.taxes.totalTax).toBeLessThan(caResult.taxes.totalTax);
  });

  it('should show WV taxes F&I products (unique)', () => {
    const wvRules = getRulesForState('WV')!;
    const input = createRetailInput({
      stateCode: 'WV',
      vehiclePrice: 30000,
      serviceContracts: 2000,
      gap: 800,
      rates: [{ label: 'WV_PRIVILEGE', rate: 0.05 }],
    });

    const result = calculateTax(input, wvRules);

    // WV uniquely taxes both VSC and GAP
    expect(result.debug.taxableServiceContracts).toBe(2000);
    expect(result.debug.taxableGap).toBe(800);
    expect(result.bases.productsBase).toBe(2800);
  });
});

// ============================================================================
// RETAIL VS LEASE F&I COMPARISON
// ============================================================================

describe('Retail vs Lease - F&I Treatment Comparison', () => {
  it('should show CA treats F&I differently between retail and lease', () => {
    const caRules = getRulesForState('CA')!;

    // Retail - F&I is taxable
    const retailInput = createRetailInput({
      stateCode: 'CA',
      vehiclePrice: 35000,
      serviceContracts: 2500,
      gap: 800,
      rates: [{ label: 'STATE', rate: 0.0725 }],
    });
    const retailResult = calculateTax(retailInput, caRules);

    // Lease - F&I is NOT taxable when capitalized
    const leaseInput = createLeaseInput({
      stateCode: 'CA',
      vehiclePrice: 35000,
      grossCapCost: 35000,
      serviceContracts: 2500,
      gap: 800,
      basePayment: 450,
      paymentCount: 36,
      rates: [{ label: 'STATE', rate: 0.0725 }],
    });
    const leaseResult = calculateTax(leaseInput, caRules);

    // Retail taxes F&I
    expect(retailResult.debug.taxableServiceContracts).toBe(2500);
    expect(retailResult.debug.taxableGap).toBe(800);

    // Lease does NOT tax F&I (when capitalized)
    expect(leaseResult.debug.taxableServiceContracts).toBe(0);
    expect(leaseResult.debug.taxableGap).toBe(0);
  });
});

// ============================================================================
// COMPLEX F&I SCENARIOS
// ============================================================================

describe('Complex F&I Scenarios', () => {
  it('should handle full F&I menu with mixed taxability', () => {
    const input = createRetailInput({
      vehiclePrice: 45000,
      docFee: 500,
      serviceContracts: 3500,
      gap: 900,
      otherFees: [
        { code: 'TIRE_WHEEL', amount: 800 },
        { code: 'PAINT_FABRIC', amount: 400 },
        { code: 'KEY_REPLACEMENT', amount: 350 },
        { code: 'THEFT_PROTECTION', amount: 500 },
        { code: 'WINDSHIELD', amount: 250 },
        { code: 'TITLE', amount: 50 },
        { code: 'REG', amount: 150 },
      ],
    });
    const rules = createRules({
      docFeeTaxable: true,
      taxOnServiceContracts: true,
      taxOnGap: true,
      feeTaxRules: [
        { code: 'TIRE_WHEEL', taxable: true },
        { code: 'PAINT_FABRIC', taxable: true },
        { code: 'KEY_REPLACEMENT', taxable: true },
        { code: 'THEFT_PROTECTION', taxable: true },
        { code: 'WINDSHIELD', taxable: true },
        { code: 'TITLE', taxable: false },
        { code: 'REG', taxable: false },
      ],
    });

    const result = calculateTax(input, rules);

    // Doc fee: 500
    // Products (VSC + GAP): 3500 + 900 = 4400
    // Taxable other fees: 800 + 400 + 350 + 500 + 250 = 2300
    // Total fees base: 500 + 2300 = 2800
    expect(result.debug.taxableDocFee).toBe(500);
    expect(result.bases.productsBase).toBe(4400);
    expect(result.bases.feesBase).toBe(2800);

    // Non-taxable (TITLE + REG) = 200 - should NOT be in fees base
    expect(result.debug.taxableFees.find((f) => f.code === 'TITLE')).toBeUndefined();
    expect(result.debug.taxableFees.find((f) => f.code === 'REG')).toBeUndefined();

    // Total taxable base: 45000 + 4400 + 2800 = 52200
    expect(result.bases.totalTaxableBase).toBe(52200);

    // Total tax: 52200 * 0.06 = 3132
    expect(result.taxes.totalTax).toBe(3132);
  });
});
