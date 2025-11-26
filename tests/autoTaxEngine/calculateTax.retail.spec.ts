/**
 * AUTO TAX ENGINE - RETAIL TAX CALCULATION TESTS
 *
 * Comprehensive test suite for the retail tax calculation logic in calculateTax.ts
 * Tests cover:
 * - Basic retail tax calculations
 * - Trade-in policies (FULL, CAPPED, PERCENT, NONE)
 * - Rebate handling (manufacturer vs dealer, taxable vs non-taxable)
 * - Fee taxability (doc fee, other fees)
 * - Product taxability (service contracts, GAP, accessories)
 * - Negative equity handling
 * - Multi-jurisdiction tax rates
 * - Complex deal scenarios
 */

import { describe, it, expect } from 'vitest';
import type { TaxCalculationInput, TaxRulesConfig } from '../../shared/autoTaxEngine/types';
import { calculateTax } from '../../shared/autoTaxEngine/engine/calculateTax';

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Create a base retail input with sensible defaults
 */
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

/**
 * Create a base state rules config with sensible defaults
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
// BASIC RETAIL TAX CALCULATIONS
// ============================================================================

describe('Auto Tax Engine - Retail Tax Calculations', () => {
  describe('Basic Calculations', () => {
    it('should calculate tax on vehicle price only', () => {
      const input = createRetailInput({ vehiclePrice: 25000 });
      const rules = createRules();

      const result = calculateTax(input, rules);

      expect(result.mode).toBe('RETAIL');
      expect(result.bases.vehicleBase).toBe(25000);
      expect(result.bases.totalTaxableBase).toBe(25000);
      expect(result.taxes.totalTax).toBe(1500); // 25000 * 0.06
    });

    it('should handle zero vehicle price', () => {
      const input = createRetailInput({ vehiclePrice: 0 });
      const rules = createRules();

      const result = calculateTax(input, rules);

      expect(result.bases.vehicleBase).toBe(0);
      expect(result.taxes.totalTax).toBe(0);
    });

    it('should handle very large vehicle prices', () => {
      const input = createRetailInput({ vehiclePrice: 500000 });
      const rules = createRules();

      const result = calculateTax(input, rules);

      expect(result.bases.vehicleBase).toBe(500000);
      expect(result.taxes.totalTax).toBe(30000); // 500000 * 0.06
    });

    it('should return RETAIL mode for retail deals', () => {
      const input = createRetailInput();
      const rules = createRules();

      const result = calculateTax(input, rules);

      expect(result.mode).toBe('RETAIL');
      expect(result.leaseBreakdown).toBeUndefined();
    });
  });

  // ============================================================================
  // TRADE-IN POLICY TESTS
  // ============================================================================

  describe('Trade-In Policies', () => {
    describe('FULL Trade-In Credit', () => {
      it('should apply full trade-in credit to reduce taxable base', () => {
        const input = createRetailInput({
          vehiclePrice: 30000,
          tradeInValue: 10000,
        });
        const rules = createRules({ tradeInPolicy: { type: 'FULL' } });

        const result = calculateTax(input, rules);

        expect(result.debug.appliedTradeIn).toBe(10000);
        expect(result.bases.vehicleBase).toBe(20000);
        expect(result.taxes.totalTax).toBe(1200); // 20000 * 0.06
      });

      it('should not create negative base when trade-in exceeds vehicle price', () => {
        const input = createRetailInput({
          vehiclePrice: 20000,
          tradeInValue: 25000,
        });
        const rules = createRules({ tradeInPolicy: { type: 'FULL' } });

        const result = calculateTax(input, rules);

        expect(result.bases.vehicleBase).toBe(0);
        expect(result.taxes.totalTax).toBe(0);
      });

      it('should handle zero trade-in value', () => {
        const input = createRetailInput({
          vehiclePrice: 30000,
          tradeInValue: 0,
        });
        const rules = createRules({ tradeInPolicy: { type: 'FULL' } });

        const result = calculateTax(input, rules);

        expect(result.debug.appliedTradeIn).toBe(0);
        expect(result.bases.vehicleBase).toBe(30000);
      });
    });

    describe('CAPPED Trade-In Credit', () => {
      it('should cap trade-in credit at specified amount', () => {
        const input = createRetailInput({
          vehiclePrice: 30000,
          tradeInValue: 15000,
        });
        const rules = createRules({
          tradeInPolicy: { type: 'CAPPED', capAmount: 10000 },
        });

        const result = calculateTax(input, rules);

        expect(result.debug.appliedTradeIn).toBe(10000);
        expect(result.bases.vehicleBase).toBe(20000);
        expect(result.taxes.totalTax).toBe(1200);
      });

      it('should apply full trade-in when under cap', () => {
        const input = createRetailInput({
          vehiclePrice: 30000,
          tradeInValue: 5000,
        });
        const rules = createRules({
          tradeInPolicy: { type: 'CAPPED', capAmount: 10000 },
        });

        const result = calculateTax(input, rules);

        expect(result.debug.appliedTradeIn).toBe(5000);
        expect(result.bases.vehicleBase).toBe(25000);
      });

      it('should handle trade-in exactly at cap amount', () => {
        const input = createRetailInput({
          vehiclePrice: 30000,
          tradeInValue: 10000,
        });
        const rules = createRules({
          tradeInPolicy: { type: 'CAPPED', capAmount: 10000 },
        });

        const result = calculateTax(input, rules);

        expect(result.debug.appliedTradeIn).toBe(10000);
      });
    });

    describe('PERCENT Trade-In Credit', () => {
      it('should apply percentage of trade-in value as credit', () => {
        const input = createRetailInput({
          vehiclePrice: 30000,
          tradeInValue: 10000,
        });
        const rules = createRules({
          tradeInPolicy: { type: 'PERCENT', percent: 0.5 },
        });

        const result = calculateTax(input, rules);

        expect(result.debug.appliedTradeIn).toBe(5000); // 10000 * 0.5
        expect(result.bases.vehicleBase).toBe(25000);
      });

      it('should handle 100% trade-in credit', () => {
        const input = createRetailInput({
          vehiclePrice: 30000,
          tradeInValue: 10000,
        });
        const rules = createRules({
          tradeInPolicy: { type: 'PERCENT', percent: 1.0 },
        });

        const result = calculateTax(input, rules);

        expect(result.debug.appliedTradeIn).toBe(10000);
      });

      it('should handle 0% trade-in credit', () => {
        const input = createRetailInput({
          vehiclePrice: 30000,
          tradeInValue: 10000,
        });
        const rules = createRules({
          tradeInPolicy: { type: 'PERCENT', percent: 0 },
        });

        const result = calculateTax(input, rules);

        expect(result.debug.appliedTradeIn).toBe(0);
      });
    });

    describe('NONE Trade-In Credit', () => {
      it('should not apply any trade-in credit', () => {
        const input = createRetailInput({
          vehiclePrice: 30000,
          tradeInValue: 10000,
        });
        const rules = createRules({ tradeInPolicy: { type: 'NONE' } });

        const result = calculateTax(input, rules);

        expect(result.debug.appliedTradeIn).toBe(0);
        expect(result.bases.vehicleBase).toBe(30000);
        expect(result.taxes.totalTax).toBe(1800);
      });
    });
  });

  // ============================================================================
  // REBATE HANDLING TESTS
  // ============================================================================

  describe('Rebate Handling', () => {
    describe('Manufacturer Rebates', () => {
      it('should reduce taxable base when manufacturer rebate is non-taxable', () => {
        const input = createRetailInput({
          vehiclePrice: 30000,
          rebateManufacturer: 3000,
        });
        const rules = createRules({
          rebates: [{ appliesTo: 'MANUFACTURER', taxable: false }],
        });

        const result = calculateTax(input, rules);

        expect(result.debug.appliedRebatesNonTaxable).toBe(3000);
        expect(result.bases.vehicleBase).toBe(27000);
        expect(result.taxes.totalTax).toBe(1620); // 27000 * 0.06
      });

      it('should NOT reduce taxable base when manufacturer rebate is taxable', () => {
        const input = createRetailInput({
          vehiclePrice: 30000,
          rebateManufacturer: 3000,
        });
        const rules = createRules({
          rebates: [{ appliesTo: 'MANUFACTURER', taxable: true }],
        });

        const result = calculateTax(input, rules);

        expect(result.debug.appliedRebatesTaxable).toBe(3000);
        expect(result.bases.vehicleBase).toBe(30000);
        expect(result.taxes.totalTax).toBe(1800);
      });
    });

    describe('Dealer Rebates', () => {
      it('should reduce taxable base when dealer rebate is non-taxable', () => {
        const input = createRetailInput({
          vehiclePrice: 30000,
          rebateDealer: 2000,
        });
        const rules = createRules({
          rebates: [{ appliesTo: 'DEALER', taxable: false }],
        });

        const result = calculateTax(input, rules);

        expect(result.debug.appliedRebatesNonTaxable).toBe(2000);
        expect(result.bases.vehicleBase).toBe(28000);
      });

      it('should NOT reduce taxable base when dealer rebate is taxable', () => {
        const input = createRetailInput({
          vehiclePrice: 30000,
          rebateDealer: 2000,
        });
        const rules = createRules({
          rebates: [{ appliesTo: 'DEALER', taxable: true }],
        });

        const result = calculateTax(input, rules);

        expect(result.debug.appliedRebatesTaxable).toBe(2000);
        expect(result.bases.vehicleBase).toBe(30000);
      });
    });

    describe('Combined Rebates', () => {
      it('should handle both manufacturer and dealer rebates', () => {
        const input = createRetailInput({
          vehiclePrice: 35000,
          rebateManufacturer: 3000,
          rebateDealer: 1500,
        });
        const rules = createRules({
          rebates: [
            { appliesTo: 'MANUFACTURER', taxable: false },
            { appliesTo: 'DEALER', taxable: true },
          ],
        });

        const result = calculateTax(input, rules);

        expect(result.debug.appliedRebatesNonTaxable).toBe(3000);
        expect(result.debug.appliedRebatesTaxable).toBe(1500);
        expect(result.bases.vehicleBase).toBe(32000); // 35000 - 3000 (mfr only)
      });

      it('should handle both rebates as non-taxable', () => {
        const input = createRetailInput({
          vehiclePrice: 35000,
          rebateManufacturer: 3000,
          rebateDealer: 1500,
        });
        const rules = createRules({
          rebates: [
            { appliesTo: 'MANUFACTURER', taxable: false },
            { appliesTo: 'DEALER', taxable: false },
          ],
        });

        const result = calculateTax(input, rules);

        expect(result.debug.appliedRebatesNonTaxable).toBe(4500);
        expect(result.bases.vehicleBase).toBe(30500); // 35000 - 4500
      });

      it('should handle ANY rebate rule matching both types', () => {
        const input = createRetailInput({
          vehiclePrice: 35000,
          rebateManufacturer: 3000,
          rebateDealer: 1500,
        });
        const rules = createRules({
          rebates: [{ appliesTo: 'ANY', taxable: false }],
        });

        const result = calculateTax(input, rules);

        // Both rebates should reduce base when ANY rule is non-taxable
        expect(result.debug.appliedRebatesNonTaxable).toBe(4500);
        expect(result.bases.vehicleBase).toBe(30500);
      });
    });
  });

  // ============================================================================
  // FEE TAXABILITY TESTS
  // ============================================================================

  describe('Fee Taxability', () => {
    describe('Doc Fee', () => {
      it('should include doc fee in taxable base when docFeeTaxable is true', () => {
        const input = createRetailInput({
          vehiclePrice: 30000,
          docFee: 500,
        });
        const rules = createRules({ docFeeTaxable: true });

        const result = calculateTax(input, rules);

        expect(result.debug.taxableDocFee).toBe(500);
        expect(result.bases.feesBase).toBe(500);
        expect(result.bases.totalTaxableBase).toBe(30500);
      });

      it('should exclude doc fee when docFeeTaxable is false', () => {
        const input = createRetailInput({
          vehiclePrice: 30000,
          docFee: 500,
        });
        const rules = createRules({ docFeeTaxable: false });

        const result = calculateTax(input, rules);

        expect(result.debug.taxableDocFee).toBe(0);
        expect(result.bases.feesBase).toBe(0);
      });
    });

    describe('Other Fees', () => {
      it('should include taxable fees in feesBase', () => {
        const input = createRetailInput({
          vehiclePrice: 30000,
          otherFees: [
            { code: 'SERVICE_CONTRACT', amount: 1500 },
            { code: 'GAP', amount: 800 },
          ],
        });
        const rules = createRules({
          feeTaxRules: [
            { code: 'SERVICE_CONTRACT', taxable: true },
            { code: 'GAP', taxable: true },
          ],
        });

        const result = calculateTax(input, rules);

        expect(result.debug.taxableFees).toHaveLength(2);
        expect(result.bases.feesBase).toBe(2300);
      });

      it('should exclude non-taxable fees from feesBase', () => {
        const input = createRetailInput({
          vehiclePrice: 30000,
          otherFees: [
            { code: 'TITLE', amount: 50 },
            { code: 'REG', amount: 100 },
          ],
        });
        const rules = createRules({
          feeTaxRules: [
            { code: 'TITLE', taxable: false },
            { code: 'REG', taxable: false },
          ],
        });

        const result = calculateTax(input, rules);

        expect(result.debug.taxableFees).toHaveLength(0);
        expect(result.bases.feesBase).toBe(0);
      });

      it('should handle mix of taxable and non-taxable fees', () => {
        const input = createRetailInput({
          vehiclePrice: 30000,
          docFee: 200,
          otherFees: [
            { code: 'SERVICE_CONTRACT', amount: 1500 },
            { code: 'TITLE', amount: 50 },
            { code: 'GAP', amount: 800 },
            { code: 'REG', amount: 100 },
          ],
        });
        const rules = createRules({
          docFeeTaxable: true,
          feeTaxRules: [
            { code: 'SERVICE_CONTRACT', taxable: true },
            { code: 'GAP', taxable: true },
            { code: 'TITLE', taxable: false },
            { code: 'REG', taxable: false },
          ],
        });

        const result = calculateTax(input, rules);

        // Doc fee + SERVICE_CONTRACT + GAP
        expect(result.bases.feesBase).toBe(2500);
        expect(result.debug.taxableFees).toHaveLength(2);
      });
    });
  });

  // ============================================================================
  // PRODUCT TAXABILITY TESTS
  // ============================================================================

  describe('Product Taxability', () => {
    describe('Service Contracts', () => {
      it('should include service contracts in productsBase when taxable', () => {
        const input = createRetailInput({
          vehiclePrice: 30000,
          serviceContracts: 2500,
        });
        const rules = createRules({ taxOnServiceContracts: true });

        const result = calculateTax(input, rules);

        expect(result.debug.taxableServiceContracts).toBe(2500);
        expect(result.bases.productsBase).toBe(2500);
      });

      it('should exclude service contracts when not taxable', () => {
        const input = createRetailInput({
          vehiclePrice: 30000,
          serviceContracts: 2500,
        });
        const rules = createRules({ taxOnServiceContracts: false });

        const result = calculateTax(input, rules);

        expect(result.debug.taxableServiceContracts).toBe(0);
        expect(result.bases.productsBase).toBe(0);
      });
    });

    describe('GAP Insurance', () => {
      it('should include GAP in productsBase when taxable', () => {
        const input = createRetailInput({
          vehiclePrice: 30000,
          gap: 800,
        });
        const rules = createRules({ taxOnGap: true });

        const result = calculateTax(input, rules);

        expect(result.debug.taxableGap).toBe(800);
        expect(result.bases.productsBase).toBe(800);
      });

      it('should exclude GAP when not taxable', () => {
        const input = createRetailInput({
          vehiclePrice: 30000,
          gap: 800,
        });
        const rules = createRules({ taxOnGap: false });

        const result = calculateTax(input, rules);

        expect(result.debug.taxableGap).toBe(0);
      });
    });

    describe('Combined Products', () => {
      it('should handle both service contracts and GAP', () => {
        const input = createRetailInput({
          vehiclePrice: 30000,
          serviceContracts: 2500,
          gap: 800,
        });
        const rules = createRules({
          taxOnServiceContracts: true,
          taxOnGap: true,
        });

        const result = calculateTax(input, rules);

        expect(result.bases.productsBase).toBe(3300);
        expect(result.bases.totalTaxableBase).toBe(33300);
      });
    });
  });

  // ============================================================================
  // ACCESSORIES TESTS
  // ============================================================================

  describe('Accessories', () => {
    it('should include accessories in vehicle base when taxable', () => {
      const input = createRetailInput({
        vehiclePrice: 30000,
        accessoriesAmount: 2500,
      });
      const rules = createRules({ taxOnAccessories: true });

      const result = calculateTax(input, rules);

      expect(result.bases.vehicleBase).toBe(32500);
      expect(result.taxes.totalTax).toBe(1950); // 32500 * 0.06
    });

    it('should exclude accessories when not taxable', () => {
      const input = createRetailInput({
        vehiclePrice: 30000,
        accessoriesAmount: 2500,
      });
      const rules = createRules({ taxOnAccessories: false });

      const result = calculateTax(input, rules);

      expect(result.bases.vehicleBase).toBe(30000);
    });
  });

  // ============================================================================
  // NEGATIVE EQUITY TESTS
  // ============================================================================

  describe('Negative Equity', () => {
    it('should include negative equity in vehicle base when taxable', () => {
      const input = createRetailInput({
        vehiclePrice: 30000,
        negativeEquity: 3000,
      });
      const rules = createRules({ taxOnNegativeEquity: true });

      const result = calculateTax(input, rules);

      expect(result.bases.vehicleBase).toBe(33000);
      expect(result.taxes.totalTax).toBe(1980); // 33000 * 0.06
    });

    it('should exclude negative equity when not taxable', () => {
      const input = createRetailInput({
        vehiclePrice: 30000,
        negativeEquity: 3000,
      });
      const rules = createRules({ taxOnNegativeEquity: false });

      const result = calculateTax(input, rules);

      expect(result.bases.vehicleBase).toBe(30000);
    });

    it('should handle zero negative equity', () => {
      const input = createRetailInput({
        vehiclePrice: 30000,
        negativeEquity: 0,
      });
      const rules = createRules({ taxOnNegativeEquity: true });

      const result = calculateTax(input, rules);

      expect(result.bases.vehicleBase).toBe(30000);
    });
  });

  // ============================================================================
  // MULTI-JURISDICTION TAX RATES TESTS
  // ============================================================================

  describe('Multi-Jurisdiction Tax Rates', () => {
    it('should apply state-only tax rate', () => {
      const input = createRetailInput({
        vehiclePrice: 30000,
        rates: [{ label: 'STATE', rate: 0.07 }],
      });
      const rules = createRules();

      const result = calculateTax(input, rules);

      expect(result.taxes.componentTaxes).toHaveLength(1);
      expect(result.taxes.componentTaxes[0].label).toBe('STATE');
      expect(result.taxes.componentTaxes[0].amount).toBe(2100);
      expect(result.taxes.totalTax).toBe(2100);
    });

    it('should apply state + county tax rates', () => {
      const input = createRetailInput({
        vehiclePrice: 30000,
        rates: [
          { label: 'STATE', rate: 0.06 },
          { label: 'COUNTY', rate: 0.01 },
        ],
      });
      const rules = createRules();

      const result = calculateTax(input, rules);

      expect(result.taxes.componentTaxes).toHaveLength(2);
      expect(result.taxes.componentTaxes[0].amount).toBe(1800); // 30000 * 0.06
      expect(result.taxes.componentTaxes[1].amount).toBe(300); // 30000 * 0.01
      expect(result.taxes.totalTax).toBe(2100);
    });

    it('should apply state + county + city tax rates', () => {
      const input = createRetailInput({
        vehiclePrice: 30000,
        rates: [
          { label: 'STATE', rate: 0.0625 },
          { label: 'COUNTY', rate: 0.01 },
          { label: 'CITY', rate: 0.015 },
        ],
      });
      const rules = createRules();

      const result = calculateTax(input, rules);

      expect(result.taxes.componentTaxes).toHaveLength(3);
      expect(result.taxes.totalTax).toBeCloseTo(2625, 2); // 30000 * 0.0875
    });

    it('should apply state + county + city + special district rates', () => {
      const input = createRetailInput({
        vehiclePrice: 40000,
        rates: [
          { label: 'STATE', rate: 0.0725 },
          { label: 'COUNTY', rate: 0.01 },
          { label: 'CITY', rate: 0.0125 },
          { label: 'SPECIAL_DISTRICT', rate: 0.005 },
        ],
      });
      const rules = createRules();

      const result = calculateTax(input, rules);

      expect(result.taxes.componentTaxes).toHaveLength(4);
      // Total rate: 0.0725 + 0.01 + 0.0125 + 0.005 = 0.10
      expect(result.taxes.totalTax).toBe(4000);
    });
  });

  // ============================================================================
  // COMPLEX DEAL SCENARIOS
  // ============================================================================

  describe('Complex Deal Scenarios', () => {
    it('should calculate correctly with all components', () => {
      const input = createRetailInput({
        vehiclePrice: 45000,
        accessoriesAmount: 3000,
        tradeInValue: 12000,
        rebateManufacturer: 2500,
        rebateDealer: 1000,
        docFee: 350,
        otherFees: [
          { code: 'SERVICE_CONTRACT', amount: 2200 },
          { code: 'GAP', amount: 900 },
          { code: 'TITLE', amount: 50 },
          { code: 'REG', amount: 150 },
        ],
        serviceContracts: 2200,
        gap: 900,
        negativeEquity: 2000,
        rates: [
          { label: 'STATE', rate: 0.06 },
          { label: 'COUNTY', rate: 0.01 },
        ],
      });

      const rules = createRules({
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
      });

      const result = calculateTax(input, rules);

      // Vehicle base: 45000 + 3000 (accessories) + 2000 (neg equity) - 12000 (trade) - 2500 (mfr rebate) = 35500
      expect(result.bases.vehicleBase).toBe(35500);

      // Fees base: 350 (doc) + 2200 (SERVICE_CONTRACT) + 900 (GAP) = 3450
      expect(result.bases.feesBase).toBe(3450);

      // Products base: 2200 (service contracts) + 900 (GAP) = 3100
      expect(result.bases.productsBase).toBe(3100);

      // Total taxable: 35500 + 3450 + 3100 = 42050
      expect(result.bases.totalTaxableBase).toBe(42050);

      // Tax: 42050 * 0.07 = 2943.50
      expect(result.taxes.totalTax).toBeCloseTo(2943.5, 2);
    });

    it('should handle typical California deal', () => {
      // California: 7.25% + local, doc cap $85, no reciprocity
      const input = createRetailInput({
        vehiclePrice: 38000,
        tradeInValue: 8000,
        rebateManufacturer: 1500,
        docFee: 85, // CA cap
        serviceContracts: 1800,
        gap: 600,
        rates: [
          { label: 'STATE', rate: 0.0725 },
          { label: 'COUNTY', rate: 0.01 },
          { label: 'CITY', rate: 0.0075 },
        ],
      });

      const rules = createRules({
        tradeInPolicy: { type: 'FULL' },
        rebates: [{ appliesTo: 'MANUFACTURER', taxable: false }],
        docFeeTaxable: true,
        taxOnServiceContracts: true,
        taxOnGap: true,
      });

      const result = calculateTax(input, rules);

      // Vehicle base: 38000 - 8000 (trade) - 1500 (mfr rebate) = 28500
      expect(result.bases.vehicleBase).toBe(28500);

      // Total rate: 9%
      const expectedTax = result.bases.totalTaxableBase * 0.09;
      expect(result.taxes.totalTax).toBeCloseTo(expectedTax, 2);
    });

    it('should handle typical Texas deal', () => {
      // Texas: 6.25% + local (max 8.25%), VSC/GAP not taxed
      const input = createRetailInput({
        vehiclePrice: 42000,
        tradeInValue: 15000,
        rebateManufacturer: 2000,
        docFee: 150,
        serviceContracts: 2500,
        gap: 800,
        rates: [
          { label: 'STATE', rate: 0.0625 },
          { label: 'LOCAL', rate: 0.02 },
        ],
      });

      const rules = createRules({
        tradeInPolicy: { type: 'FULL' },
        rebates: [{ appliesTo: 'MANUFACTURER', taxable: false }],
        docFeeTaxable: true,
        taxOnServiceContracts: false, // TX doesn't tax VSC
        taxOnGap: false, // TX doesn't tax GAP
      });

      const result = calculateTax(input, rules);

      // Vehicle base: 42000 - 15000 - 2000 = 25000
      expect(result.bases.vehicleBase).toBe(25000);

      // Products should be 0 (TX doesn't tax VSC/GAP)
      expect(result.bases.productsBase).toBe(0);

      // Total taxable: 25000 + 150 (doc fee)
      expect(result.bases.totalTaxableBase).toBe(25150);
    });
  });

  // ============================================================================
  // DEBUG OUTPUT TESTS
  // ============================================================================

  describe('Debug Output', () => {
    it('should include all debug fields', () => {
      const input = createRetailInput({
        vehiclePrice: 30000,
        tradeInValue: 5000,
        rebateManufacturer: 1000,
        rebateDealer: 500,
        docFee: 200,
        serviceContracts: 1500,
        gap: 600,
      });
      const rules = createRules();

      const result = calculateTax(input, rules);

      expect(result.debug).toHaveProperty('appliedTradeIn');
      expect(result.debug).toHaveProperty('appliedRebatesNonTaxable');
      expect(result.debug).toHaveProperty('appliedRebatesTaxable');
      expect(result.debug).toHaveProperty('taxableDocFee');
      expect(result.debug).toHaveProperty('taxableFees');
      expect(result.debug).toHaveProperty('taxableServiceContracts');
      expect(result.debug).toHaveProperty('taxableGap');
      expect(result.debug).toHaveProperty('reciprocityCredit');
      expect(result.debug).toHaveProperty('notes');
    });

    it('should include calculation notes', () => {
      const input = createRetailInput({ vehiclePrice: 30000 });
      const rules = createRules();

      const result = calculateTax(input, rules);

      expect(result.debug.notes).toBeInstanceOf(Array);
      expect(result.debug.notes.length).toBeGreaterThan(0);
    });
  });
});
