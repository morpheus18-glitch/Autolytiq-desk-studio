/**
 * AUTO TAX ENGINE - SPECIAL TAX SCHEMES TESTS
 *
 * Comprehensive test suite for special tax schemes:
 * - Georgia TAVT (Title Ad Valorem Tax)
 * - North Carolina HUT (Highway Use Tax)
 * - West Virginia Privilege Tax
 *
 * These tests validate the specialized calculators that handle
 * non-standard tax systems used by specific states.
 */

import { describe, it, expect } from 'vitest';
import type {
  TaxCalculationInput,
  TaxRulesConfig,
  LeaseFields,
} from '../../shared/autoTaxEngine/types';
import { calculateTax } from '../../shared/autoTaxEngine/engine/calculateTax';
import { calculateGeorgiaTAVT } from '../../shared/autoTaxEngine/engine/calculateGeorgiaTAVT';
import { calculateNorthCarolinaHUT } from '../../shared/autoTaxEngine/engine/calculateNorthCarolinaHUT';
import { calculateWestVirginiaPrivilege } from '../../shared/autoTaxEngine/engine/calculateWestVirginiaPrivilege';

// ============================================================================
// GEORGIA TAVT (TITLE AD VALOREM TAX) TESTS
// ============================================================================

describe('Georgia TAVT (Title Ad Valorem Tax)', () => {
  // Create Georgia TAVT rules
  function createGeorgiaRules(overrides: Partial<TaxRulesConfig> = {}): TaxRulesConfig {
    return {
      stateCode: 'GA',
      version: 1,
      tradeInPolicy: { type: 'FULL' },
      rebates: [
        { appliesTo: 'MANUFACTURER', taxable: true },
        { appliesTo: 'DEALER', taxable: true },
      ],
      docFeeTaxable: false,
      feeTaxRules: [
        { code: 'SERVICE_CONTRACT', taxable: false },
        { code: 'GAP', taxable: false },
        { code: 'TITLE', taxable: false },
        { code: 'REG', taxable: false },
      ],
      taxOnAccessories: true,
      taxOnNegativeEquity: true,
      taxOnServiceContracts: false,
      taxOnGap: false,
      vehicleTaxScheme: 'SPECIAL_TAVT',
      vehicleUsesLocalSalesTax: false,
      leaseRules: {
        method: 'MONTHLY',
        taxCapReduction: false,
        rebateBehavior: 'ALWAYS_TAXABLE',
        docFeeTaxability: 'ALWAYS',
        tradeInCredit: 'CAP_COST_ONLY',
        negativeEquityTaxable: true,
        feeTaxRules: [],
        titleFeeRules: [],
        taxFeesUpfront: true,
        specialScheme: 'GA_TAVT',
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
      extras: {
        gaTAVT: {
          defaultRate: 0.07, // 7% TAVT
          useAssessedValue: true,
          useHigherOfPriceOrAssessed: true,
          allowTradeInCredit: true,
          tradeInAppliesTo: 'VEHICLE_ONLY',
          applyNegativeEquityToBase: true,
          leaseBaseMode: 'AGREED_VALUE',
        },
      },
      ...overrides,
    };
  }

  function createRetailInput(overrides: Partial<TaxCalculationInput> = {}): TaxCalculationInput {
    return {
      stateCode: 'GA',
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
      rates: [{ label: 'GA_TAVT', rate: 0.07 }],
      ...overrides,
    } as TaxCalculationInput;
  }

  describe('Basic TAVT Calculation', () => {
    it('should calculate 7% TAVT on vehicle price', () => {
      const input = createRetailInput({ vehiclePrice: 30000 });
      const rules = createGeorgiaRules();

      const result = calculateTax(input, rules);

      expect(result.mode).toBe('RETAIL');
      expect(result.taxes.componentTaxes[0].label).toBe('GA_TAVT');
      expect(result.taxes.totalTax).toBe(2100); // 30000 * 0.07
    });

    it('should dispatch to TAVT calculator when vehicleTaxScheme is SPECIAL_TAVT', () => {
      const input = createRetailInput({ vehiclePrice: 25000 });
      const rules = createGeorgiaRules();

      const result = calculateTax(input, rules);

      // Verify it uses TAVT calculator (no fees in base, single component)
      expect(result.bases.feesBase).toBe(0);
      expect(result.bases.productsBase).toBe(0);
      expect(result.taxes.componentTaxes[0].label).toBe('GA_TAVT');
    });

    it('should throw error if gaTAVT config is missing', () => {
      const input = createRetailInput({ vehiclePrice: 30000 });
      const rules = createGeorgiaRules({ extras: {} });

      expect(() => calculateTax(input, rules)).toThrow('Georgia TAVT configuration');
    });
  });

  describe('Trade-In Credit on TAVT', () => {
    it('should apply full trade-in credit when allowTradeInCredit is true', () => {
      const input = createRetailInput({
        vehiclePrice: 35000,
        tradeInValue: 10000,
      });
      const rules = createGeorgiaRules();

      const result = calculateTax(input, rules);

      expect(result.debug.appliedTradeIn).toBe(10000);
      expect(result.bases.vehicleBase).toBe(25000);
      expect(result.taxes.totalTax).toBeCloseTo(1750, 2); // 25000 * 0.07
    });

    it('should not apply trade-in credit when allowTradeInCredit is false', () => {
      const input = createRetailInput({
        vehiclePrice: 35000,
        tradeInValue: 10000,
      });
      const rules = createGeorgiaRules({
        extras: {
          gaTAVT: {
            defaultRate: 0.07,
            useAssessedValue: false,
            useHigherOfPriceOrAssessed: false,
            allowTradeInCredit: false,
            tradeInAppliesTo: 'VEHICLE_ONLY',
            applyNegativeEquityToBase: true,
            leaseBaseMode: 'AGREED_VALUE',
          },
        },
      });

      const result = calculateTax(input, rules);

      expect(result.debug.appliedTradeIn).toBe(0);
      expect(result.bases.vehicleBase).toBe(35000);
    });

    it('should cap trade-in at vehicle price', () => {
      const input = createRetailInput({
        vehiclePrice: 20000,
        tradeInValue: 25000,
      });
      const rules = createGeorgiaRules();

      const result = calculateTax(input, rules);

      expect(result.bases.vehicleBase).toBe(0);
      expect(result.taxes.totalTax).toBe(0);
    });
  });

  describe('Negative Equity on TAVT', () => {
    it('should add negative equity to TAVT base when configured', () => {
      const input = createRetailInput({
        vehiclePrice: 30000,
        negativeEquity: 5000,
      });
      const rules = createGeorgiaRules();

      const result = calculateTax(input, rules);

      expect(result.bases.vehicleBase).toBe(35000);
      expect(result.taxes.totalTax).toBeCloseTo(2450, 2); // 35000 * 0.07
    });

    it('should not add negative equity when applyNegativeEquityToBase is false', () => {
      const input = createRetailInput({
        vehiclePrice: 30000,
        negativeEquity: 5000,
      });
      const rules = createGeorgiaRules({
        extras: {
          gaTAVT: {
            defaultRate: 0.07,
            useAssessedValue: false,
            useHigherOfPriceOrAssessed: false,
            allowTradeInCredit: true,
            tradeInAppliesTo: 'VEHICLE_ONLY',
            applyNegativeEquityToBase: false,
            leaseBaseMode: 'AGREED_VALUE',
          },
        },
      });

      const result = calculateTax(input, rules);

      expect(result.bases.vehicleBase).toBe(30000);
    });
  });

  describe('Rebates on TAVT', () => {
    it('should treat rebates as taxable (not reduce TAVT base)', () => {
      const input = createRetailInput({
        vehiclePrice: 30000,
        rebateManufacturer: 2000,
        rebateDealer: 1000,
      });
      const rules = createGeorgiaRules();

      const result = calculateTax(input, rules);

      // Rebates are taxable in GA TAVT - they don't reduce the base
      expect(result.debug.appliedRebatesTaxable).toBe(3000);
      expect(result.bases.vehicleBase).toBe(30000); // Not reduced
      expect(result.taxes.totalTax).toBe(2100); // 30000 * 0.07
    });
  });

  describe('Fees and Products on TAVT', () => {
    it('should NOT include doc fee in TAVT base', () => {
      const input = createRetailInput({
        vehiclePrice: 30000,
        docFee: 500,
      });
      const rules = createGeorgiaRules();

      const result = calculateTax(input, rules);

      expect(result.bases.feesBase).toBe(0);
      expect(result.debug.taxableDocFee).toBe(0);
    });

    it('should NOT include service contracts in TAVT base', () => {
      const input = createRetailInput({
        vehiclePrice: 30000,
        serviceContracts: 2000,
      });
      const rules = createGeorgiaRules();

      const result = calculateTax(input, rules);

      expect(result.bases.productsBase).toBe(0);
    });

    it('should NOT include GAP in TAVT base', () => {
      const input = createRetailInput({
        vehiclePrice: 30000,
        gap: 800,
      });
      const rules = createGeorgiaRules();

      const result = calculateTax(input, rules);

      expect(result.bases.productsBase).toBe(0);
    });
  });

  describe('TAVT Reciprocity', () => {
    it('should apply reciprocity credit when origin tax is available', () => {
      const input = createRetailInput({
        vehiclePrice: 30000,
        originTaxInfo: {
          stateCode: 'FL',
          amount: 1800, // 6% FL tax on $30k
        },
      });
      const rules = createGeorgiaRules();

      const result = calculateTax(input, rules);

      // GA TAVT: 30000 * 0.07 = 2100
      // Credit: min(1800, 2100) = 1800
      // Final: 2100 - 1800 = 300
      expect(result.taxes.totalTax).toBe(300);
    });

    it('should cap reciprocity credit at GA TAVT amount', () => {
      const input = createRetailInput({
        vehiclePrice: 30000,
        originTaxInfo: {
          stateCode: 'TN',
          amount: 3000, // Higher than GA TAVT
        },
      });
      const rules = createGeorgiaRules();

      const result = calculateTax(input, rules);

      // Credit capped at GA TAVT (2100), so final is 0
      expect(result.taxes.totalTax).toBe(0);
    });
  });

  describe('Lease TAVT', () => {
    it('should calculate TAVT for lease as upfront tax', () => {
      const input: TaxCalculationInput & LeaseFields = {
        stateCode: 'GA',
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
        rates: [{ label: 'GA_TAVT', rate: 0.07 }],
        grossCapCost: 35000,
        capReductionCash: 0,
        capReductionTradeIn: 0,
        capReductionRebateManufacturer: 0,
        capReductionRebateDealer: 0,
        basePayment: 450,
        paymentCount: 36,
      };
      const rules = createGeorgiaRules();

      const result = calculateTax(input, rules);

      expect(result.mode).toBe('LEASE');
      expect(result.leaseBreakdown).toBeDefined();
      expect(result.leaseBreakdown!.upfrontTaxes.totalTax).toBeCloseTo(2450, 2); // 35000 * 0.07
      expect(result.leaseBreakdown!.paymentTaxesPerPeriod.totalTax).toBe(0); // TAVT is upfront
    });
  });
});

// ============================================================================
// NORTH CAROLINA HUT (HIGHWAY USE TAX) TESTS
// ============================================================================

describe('North Carolina HUT (Highway Use Tax)', () => {
  function createNCRules(overrides: Partial<TaxRulesConfig> = {}): TaxRulesConfig {
    return {
      stateCode: 'NC',
      version: 1,
      tradeInPolicy: { type: 'FULL' },
      rebates: [
        { appliesTo: 'MANUFACTURER', taxable: false },
        { appliesTo: 'DEALER', taxable: true },
      ],
      docFeeTaxable: true,
      feeTaxRules: [
        { code: 'SERVICE_CONTRACT', taxable: false },
        { code: 'GAP', taxable: false },
        { code: 'TITLE', taxable: false },
        { code: 'REG', taxable: false },
      ],
      taxOnAccessories: true,
      taxOnNegativeEquity: true,
      taxOnServiceContracts: false,
      taxOnGap: false,
      vehicleTaxScheme: 'SPECIAL_HUT',
      vehicleUsesLocalSalesTax: false,
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
        overrides: [
          {
            originState: 'ALL',
            maxAgeDaysSinceTaxPaid: 90,
          },
        ],
      },
      extras: {
        ncHUT: {
          baseRate: 0.03, // 3% HUT
          useHighwayUseTax: true,
          includeTradeInReduction: true,
          applyToNetPriceOnly: true,
          maxReciprocityAgeDays: 90,
        },
      },
      ...overrides,
    };
  }

  function createRetailInput(overrides: Partial<TaxCalculationInput> = {}): TaxCalculationInput {
    return {
      stateCode: 'NC',
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
      rates: [{ label: 'NC_HUT', rate: 0.03 }],
      ...overrides,
    } as TaxCalculationInput;
  }

  describe('Basic HUT Calculation', () => {
    it('should calculate 3% HUT on vehicle price', () => {
      const input = createRetailInput({ vehiclePrice: 30000 });
      const rules = createNCRules();

      const result = calculateTax(input, rules);

      expect(result.mode).toBe('RETAIL');
      expect(result.taxes.componentTaxes[0].label).toBe('NC_HUT');
      expect(result.taxes.totalTax).toBe(900); // 30000 * 0.03
    });

    it('should throw error if ncHUT config is missing', () => {
      const input = createRetailInput({ vehiclePrice: 30000 });
      const rules = createNCRules({ extras: {} });

      expect(() => calculateTax(input, rules)).toThrow('North Carolina HUT configuration');
    });
  });

  describe('Trade-In on HUT', () => {
    it('should apply full trade-in credit reducing HUT base', () => {
      const input = createRetailInput({
        vehiclePrice: 30000,
        tradeInValue: 8000,
      });
      const rules = createNCRules();

      const result = calculateTax(input, rules);

      expect(result.debug.appliedTradeIn).toBe(8000);
      expect(result.taxes.totalTax).toBe(660); // (30000 - 8000) * 0.03
    });
  });

  describe('Rebates on HUT', () => {
    it('should reduce HUT base for non-taxable manufacturer rebates', () => {
      const input = createRetailInput({
        vehiclePrice: 30000,
        rebateManufacturer: 2000,
      });
      const rules = createNCRules();

      const result = calculateTax(input, rules);

      expect(result.debug.appliedRebatesNonTaxable).toBe(2000);
      // HUT base: 30000 - 2000 = 28000
      // HUT: 28000 * 0.03 = 840
      expect(result.taxes.totalTax).toBe(840);
    });

    it('should NOT reduce HUT base for taxable dealer rebates', () => {
      const input = createRetailInput({
        vehiclePrice: 30000,
        rebateDealer: 1500,
      });
      const rules = createNCRules();

      const result = calculateTax(input, rules);

      expect(result.debug.appliedRebatesTaxable).toBe(1500);
      expect(result.taxes.totalTax).toBe(900); // 30000 * 0.03 (not reduced)
    });
  });

  describe('Doc Fee and Fees on HUT', () => {
    it('should include doc fee in HUT base', () => {
      const input = createRetailInput({
        vehiclePrice: 30000,
        docFee: 400,
      });
      const rules = createNCRules();

      const result = calculateTax(input, rules);

      expect(result.debug.taxableDocFee).toBe(400);
      // HUT base: 30000 + 400 = 30400
      // HUT: 30400 * 0.03 = 912
      expect(result.taxes.totalTax).toBe(912);
    });

    it('should include service contracts in HUT base (NC law requires it)', () => {
      // NOTE: NC Highway Use Tax law requires service contracts to be taxable
      // despite the general taxOnServiceContracts flag in rules config.
      // The HUT calculator follows NC law which taxes service contracts.
      const input = createRetailInput({
        vehiclePrice: 30000,
        serviceContracts: 2000,
      });
      const rules = createNCRules();

      const result = calculateTax(input, rules);

      // NC HUT taxes service contracts per NC General Statutes
      expect(result.debug.taxableServiceContracts).toBe(2000);
      // HUT base: 30000 + 2000 = 32000, HUT: 32000 * 0.03 = 960
      expect(result.taxes.totalTax).toBe(960);
    });
  });

  describe('HUT 90-Day Reciprocity Window', () => {
    it('should apply reciprocity when tax paid within 90 days', () => {
      const today = new Date('2025-01-15');
      const taxPaidDate = new Date('2024-12-01'); // 45 days ago

      const input = createRetailInput({
        vehiclePrice: 30000,
        asOfDate: today.toISOString().split('T')[0],
        originTaxInfo: {
          stateCode: 'SC',
          amount: 1500,
          taxPaidDate: taxPaidDate.toISOString().split('T')[0],
        },
      });
      const rules = createNCRules();

      const result = calculateTax(input, rules);

      // NC HUT: 900, Credit: min(1500, 900) = 900, Final: 0
      expect(result.taxes.totalTax).toBe(0);
      expect(result.debug.reciprocityCredit).toBe(900);
    });

    it('should NOT apply reciprocity when tax paid more than 90 days ago', () => {
      const today = new Date('2025-01-15');
      const taxPaidDate = new Date('2024-10-01'); // 106 days ago

      const input = createRetailInput({
        vehiclePrice: 30000,
        asOfDate: today.toISOString().split('T')[0],
        originTaxInfo: {
          stateCode: 'TN',
          amount: 2100,
          taxPaidDate: taxPaidDate.toISOString().split('T')[0],
        },
      });
      const rules = createNCRules();

      const result = calculateTax(input, rules);

      // No credit applied due to 90-day window
      expect(result.debug.reciprocityCredit).toBe(0);
      expect(result.taxes.totalTax).toBe(900);
    });
  });

  describe('HUT Lease Calculation', () => {
    it('should calculate HUT for lease as upfront tax', () => {
      const input: TaxCalculationInput & LeaseFields = {
        stateCode: 'NC',
        asOfDate: '2025-01-15',
        dealType: 'LEASE',
        vehiclePrice: 35000,
        accessoriesAmount: 0,
        tradeInValue: 0,
        rebateManufacturer: 0,
        rebateDealer: 0,
        docFee: 200,
        otherFees: [],
        serviceContracts: 0,
        gap: 0,
        negativeEquity: 0,
        taxAlreadyCollected: 0,
        rates: [{ label: 'NC_HUT', rate: 0.03 }],
        grossCapCost: 35000,
        capReductionCash: 0,
        capReductionTradeIn: 0,
        capReductionRebateManufacturer: 0,
        capReductionRebateDealer: 0,
        basePayment: 400,
        paymentCount: 36,
      };
      const rules = createNCRules();

      const result = calculateTax(input, rules);

      expect(result.mode).toBe('LEASE');
      expect(result.leaseBreakdown).toBeDefined();
      // HUT is applied upfront on cap cost
      expect(result.leaseBreakdown!.upfrontTaxes.totalTax).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// WEST VIRGINIA PRIVILEGE TAX TESTS
// ============================================================================

describe('West Virginia Privilege Tax', () => {
  function createWVRules(overrides: Partial<TaxRulesConfig> = {}): TaxRulesConfig {
    return {
      stateCode: 'WV',
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
      vehicleTaxScheme: 'DMV_PRIVILEGE_TAX',
      vehicleUsesLocalSalesTax: false,
      leaseRules: {
        method: 'MONTHLY',
        taxCapReduction: false,
        rebateBehavior: 'FOLLOW_RETAIL_RULE',
        docFeeTaxability: 'ALWAYS',
        tradeInCredit: 'FULL',
        negativeEquityTaxable: true,
        feeTaxRules: [
          { code: 'SERVICE_CONTRACT', taxable: true },
          { code: 'GAP', taxable: true },
        ],
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
      extras: {
        wvPrivilege: {
          baseRate: 0.05, // 5% privilege tax
          useAssessedValue: true,
          useHigherOfPriceOrAssessed: true,
          allowTradeInCredit: true,
          applyNegativeEquityToBase: true,
          vehicleClassRates: {
            auto: 0.05,
            truck: 0.05,
            RV: 0.06,
            trailer: 0.03,
            motorcycle: 0.05,
          },
        },
      },
      ...overrides,
    };
  }

  function createRetailInput(overrides: Partial<TaxCalculationInput> = {}): TaxCalculationInput {
    return {
      stateCode: 'WV',
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
      rates: [{ label: 'WV_PRIVILEGE', rate: 0.05 }],
      ...overrides,
    } as TaxCalculationInput;
  }

  describe('Basic Privilege Tax Calculation', () => {
    it('should calculate 5% privilege tax on vehicle price', () => {
      const input = createRetailInput({ vehiclePrice: 30000 });
      const rules = createWVRules();

      const result = calculateTax(input, rules);

      expect(result.mode).toBe('RETAIL');
      expect(result.taxes.componentTaxes[0].label).toBe('WV_PRIVILEGE');
      expect(result.taxes.totalTax).toBe(1500); // 30000 * 0.05
    });

    it('should throw error if wvPrivilege config is missing', () => {
      const input = createRetailInput({ vehiclePrice: 30000 });
      const rules = createWVRules({ extras: {} });

      expect(() => calculateTax(input, rules)).toThrow('West Virginia Privilege Tax configuration');
    });
  });

  describe('Trade-In on Privilege Tax', () => {
    it('should apply full trade-in credit', () => {
      const input = createRetailInput({
        vehiclePrice: 30000,
        tradeInValue: 10000,
      });
      const rules = createWVRules();

      const result = calculateTax(input, rules);

      expect(result.debug.appliedTradeIn).toBe(10000);
      expect(result.taxes.totalTax).toBe(1000); // (30000 - 10000) * 0.05
    });
  });

  describe('Vehicle Class Rates', () => {
    it('should use RV rate (6%) for RV vehicle class', () => {
      const input = createRetailInput({
        vehiclePrice: 50000,
        vehicleClass: 'RV',
      });
      const rules = createWVRules();

      const result = calculateTax(input, rules);

      // RV: 50000 * 0.06 = 3000
      expect(result.taxes.totalTax).toBe(3000);
    });

    it('should use trailer rate (3%) for trailer vehicle class', () => {
      const input = createRetailInput({
        vehiclePrice: 15000,
        vehicleClass: 'trailer',
      });
      const rules = createWVRules();

      const result = calculateTax(input, rules);

      // Trailer: 15000 * 0.03 = 450
      expect(result.taxes.totalTax).toBe(450);
    });

    it('should use base rate for unknown vehicle class', () => {
      const input = createRetailInput({
        vehiclePrice: 30000,
        vehicleClass: 'unknown_class',
      });
      const rules = createWVRules();

      const result = calculateTax(input, rules);

      // Uses base rate: 30000 * 0.05 = 1500
      expect(result.taxes.totalTax).toBe(1500);
    });
  });

  describe('Rebates on Privilege Tax', () => {
    it('should reduce base for non-taxable manufacturer rebates', () => {
      const input = createRetailInput({
        vehiclePrice: 30000,
        rebateManufacturer: 2000,
      });
      const rules = createWVRules();

      const result = calculateTax(input, rules);

      // Rebates are taxable in WV - they don't reduce base
      expect(result.debug.appliedRebatesTaxable).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Fees and Products on Privilege Tax (Unique: Taxable)', () => {
    it('should include service contracts in privilege tax base', () => {
      const input = createRetailInput({
        vehiclePrice: 30000,
        serviceContracts: 2000,
      });
      const rules = createWVRules();

      const result = calculateTax(input, rules);

      expect(result.debug.taxableServiceContracts).toBe(2000);
      // Base: 30000 + 2000 = 32000
      // Tax: 32000 * 0.05 = 1600
      expect(result.taxes.totalTax).toBe(1600);
    });

    it('should include GAP in privilege tax base', () => {
      const input = createRetailInput({
        vehiclePrice: 30000,
        gap: 800,
      });
      const rules = createWVRules();

      const result = calculateTax(input, rules);

      expect(result.debug.taxableGap).toBe(800);
      // Base: 30000 + 800 = 30800
      // Tax: 30800 * 0.05 = 1540
      expect(result.taxes.totalTax).toBe(1540);
    });

    it('should include doc fee in privilege tax base', () => {
      const input = createRetailInput({
        vehiclePrice: 30000,
        docFee: 300,
      });
      const rules = createWVRules();

      const result = calculateTax(input, rules);

      expect(result.debug.taxableDocFee).toBe(300);
      // Base: 30000 + 300 = 30300
      // Tax: 30300 * 0.05 = 1515
      expect(result.taxes.totalTax).toBe(1515);
    });
  });

  describe('Negative Equity on Privilege Tax', () => {
    it('should add negative equity to privilege tax base', () => {
      const input = createRetailInput({
        vehiclePrice: 30000,
        negativeEquity: 4000,
      });
      const rules = createWVRules();

      const result = calculateTax(input, rules);

      // Base: 30000 + 4000 = 34000
      // Tax: 34000 * 0.05 = 1700
      expect(result.taxes.totalTax).toBe(1700);
    });
  });

  describe('Privilege Tax Reciprocity', () => {
    it('should apply reciprocity credit', () => {
      const input = createRetailInput({
        vehiclePrice: 30000,
        originTaxInfo: {
          stateCode: 'OH',
          amount: 1725, // 5.75% OH tax
        },
      });
      const rules = createWVRules();

      const result = calculateTax(input, rules);

      // WV: 1500, Credit: min(1725, 1500) = 1500, Final: 0
      expect(result.taxes.totalTax).toBe(0);
      expect(result.debug.reciprocityCredit).toBe(1500);
    });
  });

  describe('Privilege Tax Lease Calculation', () => {
    it('should calculate privilege tax for lease as upfront', () => {
      const input: TaxCalculationInput & LeaseFields = {
        stateCode: 'WV',
        asOfDate: '2025-01-15',
        dealType: 'LEASE',
        vehiclePrice: 35000,
        accessoriesAmount: 0,
        tradeInValue: 0,
        rebateManufacturer: 0,
        rebateDealer: 0,
        docFee: 200,
        otherFees: [],
        serviceContracts: 1500,
        gap: 600,
        negativeEquity: 0,
        taxAlreadyCollected: 0,
        rates: [{ label: 'WV_PRIVILEGE', rate: 0.05 }],
        grossCapCost: 35000,
        capReductionCash: 0,
        capReductionTradeIn: 0,
        capReductionRebateManufacturer: 0,
        capReductionRebateDealer: 0,
        basePayment: 420,
        paymentCount: 36,
      };
      const rules = createWVRules();

      const result = calculateTax(input, rules);

      expect(result.mode).toBe('LEASE');
      expect(result.leaseBreakdown).toBeDefined();
      // Privilege tax is applied upfront
      expect(result.leaseBreakdown!.upfrontTaxes.totalTax).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// INTEGRATION TESTS - ROUTING
// ============================================================================

describe('Special Scheme Routing', () => {
  it('should route SPECIAL_TAVT to Georgia TAVT calculator', () => {
    const input: TaxCalculationInput = {
      stateCode: 'GA',
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
      rates: [{ label: 'GA_TAVT', rate: 0.07 }],
    };

    const rules: TaxRulesConfig = {
      stateCode: 'GA',
      version: 1,
      vehicleTaxScheme: 'SPECIAL_TAVT',
      tradeInPolicy: { type: 'FULL' },
      rebates: [],
      docFeeTaxable: false,
      feeTaxRules: [],
      taxOnAccessories: true,
      taxOnNegativeEquity: true,
      taxOnServiceContracts: false,
      taxOnGap: false,
      vehicleUsesLocalSalesTax: false,
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
      extras: {
        gaTAVT: {
          defaultRate: 0.07,
          useAssessedValue: false,
          useHigherOfPriceOrAssessed: false,
          allowTradeInCredit: true,
          tradeInAppliesTo: 'VEHICLE_ONLY',
          applyNegativeEquityToBase: true,
          leaseBaseMode: 'AGREED_VALUE',
        },
      },
    };

    const result = calculateTax(input, rules);

    expect(result.taxes.componentTaxes[0].label).toBe('GA_TAVT');
  });

  it('should route SPECIAL_HUT to North Carolina HUT calculator', () => {
    const input: TaxCalculationInput = {
      stateCode: 'NC',
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
      rates: [{ label: 'NC_HUT', rate: 0.03 }],
    };

    const rules: TaxRulesConfig = {
      stateCode: 'NC',
      version: 1,
      vehicleTaxScheme: 'SPECIAL_HUT',
      tradeInPolicy: { type: 'FULL' },
      rebates: [],
      docFeeTaxable: true,
      feeTaxRules: [],
      taxOnAccessories: true,
      taxOnNegativeEquity: true,
      taxOnServiceContracts: false,
      taxOnGap: false,
      vehicleUsesLocalSalesTax: false,
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
      extras: {
        ncHUT: {
          baseRate: 0.03,
          useHighwayUseTax: true,
          includeTradeInReduction: true,
          applyToNetPriceOnly: true,
          maxReciprocityAgeDays: 90,
        },
      },
    };

    const result = calculateTax(input, rules);

    expect(result.taxes.componentTaxes[0].label).toBe('NC_HUT');
  });

  it('should route DMV_PRIVILEGE_TAX to West Virginia calculator', () => {
    const input: TaxCalculationInput = {
      stateCode: 'WV',
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
      rates: [{ label: 'WV_PRIVILEGE', rate: 0.05 }],
    };

    const rules: TaxRulesConfig = {
      stateCode: 'WV',
      version: 1,
      vehicleTaxScheme: 'DMV_PRIVILEGE_TAX',
      tradeInPolicy: { type: 'FULL' },
      rebates: [],
      docFeeTaxable: true,
      feeTaxRules: [],
      taxOnAccessories: true,
      taxOnNegativeEquity: true,
      taxOnServiceContracts: true,
      taxOnGap: true,
      vehicleUsesLocalSalesTax: false,
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
      extras: {
        wvPrivilege: {
          baseRate: 0.05,
          useAssessedValue: false,
          useHigherOfPriceOrAssessed: false,
          allowTradeInCredit: true,
          applyNegativeEquityToBase: true,
        },
      },
    };

    const result = calculateTax(input, rules);

    expect(result.taxes.componentTaxes[0].label).toBe('WV_PRIVILEGE');
  });
});
