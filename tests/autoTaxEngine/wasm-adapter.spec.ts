/**
 * WASM Adapter Tests
 *
 * Tests for the wasm-adapter.ts module that converts between
 * camelCase TypeScript types and snake_case WASM JSON.
 */
import { describe, it, expect } from 'vitest';
import {
  rulesConfigToSnakeCase,
  calculationInputToSnakeCase,
  calculationResultToCamelCase,
  serializeRulesForWasm,
  serializeInputForWasm,
  parseWasmResult,
} from '../../shared/autoTaxEngine/wasm-adapter';
import type {
  TaxRulesConfig,
  TaxCalculationInput,
  TaxCalculationResult,
} from '../../shared/autoTaxEngine/types';

describe('WASM Adapter Module', () => {
  describe('rulesConfigToSnakeCase', () => {
    it('should convert simple camelCase keys to snake_case', () => {
      const rules: Partial<TaxRulesConfig> = {
        stateCode: 'IN',
        version: 1,
        docFeeTaxable: true,
        taxOnAccessories: true,
        taxOnNegativeEquity: false,
      };

      const result = rulesConfigToSnakeCase(rules as TaxRulesConfig) as Record<string, unknown>;

      expect(result.state_code).toBe('IN');
      expect(result.version).toBe(1);
      expect(result.doc_fee_taxable).toBe(true);
      expect(result.tax_on_accessories).toBe(true);
      expect(result.tax_on_negative_equity).toBe(false);
    });

    it('should convert nested objects', () => {
      const rules: Partial<TaxRulesConfig> = {
        stateCode: 'IN',
        tradeInPolicy: {
          type: 'FULL',
          notes: 'Full trade-in credit',
        },
      };

      const result = rulesConfigToSnakeCase(rules as TaxRulesConfig) as Record<string, unknown>;
      const tradeInPolicy = result.trade_in_policy as Record<string, unknown>;

      expect(tradeInPolicy).toBeDefined();
      expect(tradeInPolicy.type).toBe('FULL');
      expect(tradeInPolicy.notes).toBe('Full trade-in credit');
    });

    it('should convert arrays of objects', () => {
      const rules: Partial<TaxRulesConfig> = {
        stateCode: 'IN',
        rebates: [
          { appliesTo: 'MANUFACTURER', taxable: false },
          { appliesTo: 'DEALER', taxable: true },
        ],
      };

      const result = rulesConfigToSnakeCase(rules as TaxRulesConfig) as Record<string, unknown>;
      const rebates = result.rebates as Array<Record<string, unknown>>;

      expect(rebates).toHaveLength(2);
      expect(rebates[0].applies_to).toBe('MANUFACTURER');
      expect(rebates[0].taxable).toBe(false);
      expect(rebates[1].applies_to).toBe('DEALER');
      expect(rebates[1].taxable).toBe(true);
    });

    it('should handle null and undefined values', () => {
      const rules: Partial<TaxRulesConfig> = {
        stateCode: 'IN',
        extras: undefined,
      };

      const result = rulesConfigToSnakeCase(rules as TaxRulesConfig) as Record<string, unknown>;

      expect(result.state_code).toBe('IN');
      expect(result.extras).toBeUndefined();
    });

    it('should handle deeply nested structures', () => {
      const rules: Partial<TaxRulesConfig> = {
        stateCode: 'IN',
        leaseRules: {
          method: 'MONTHLY',
          taxCapReduction: false,
          rebateBehavior: 'FOLLOW_RETAIL_RULE',
          docFeeTaxability: 'FOLLOW_RETAIL_RULE',
          tradeInCredit: 'FULL',
          negativeEquityTaxable: false,
          feeTaxRules: [{ code: 'SERVICE_CONTRACT', taxable: false }],
          titleFeeRules: [],
          taxFeesUpfront: true,
          specialScheme: 'NONE',
        },
      };

      const result = rulesConfigToSnakeCase(rules as TaxRulesConfig) as Record<string, unknown>;
      const leaseRules = result.lease_rules as Record<string, unknown>;

      expect(leaseRules.method).toBe('MONTHLY');
      expect(leaseRules.tax_cap_reduction).toBe(false);
      expect(leaseRules.rebate_behavior).toBe('FOLLOW_RETAIL_RULE');
      expect(leaseRules.negative_equity_taxable).toBe(false);

      const feeTaxRules = leaseRules.fee_tax_rules as Array<Record<string, unknown>>;
      expect(feeTaxRules[0].code).toBe('SERVICE_CONTRACT');
    });
  });

  describe('calculationInputToSnakeCase', () => {
    it('should convert calculation input to snake_case', () => {
      const input: Partial<TaxCalculationInput> = {
        stateCode: 'IN',
        asOfDate: '2025-01-15',
        dealType: 'RETAIL',
        vehiclePrice: 35000,
        accessoriesAmount: 2000,
        tradeInValue: 10000,
        rebateManufacturer: 2000,
        rebateDealer: 500,
        docFee: 200,
        serviceContracts: 2500,
        gap: 800,
        negativeEquity: 0,
        taxAlreadyCollected: 0,
      };

      const result = calculationInputToSnakeCase(input as TaxCalculationInput) as Record<
        string,
        unknown
      >;

      expect(result.state_code).toBe('IN');
      expect(result.as_of_date).toBe('2025-01-15');
      expect(result.deal_type).toBe('RETAIL');
      expect(result.vehicle_price).toBe(35000);
      expect(result.accessories_amount).toBe(2000);
      expect(result.trade_in_value).toBe(10000);
      expect(result.rebate_manufacturer).toBe(2000);
      expect(result.rebate_dealer).toBe(500);
      expect(result.doc_fee).toBe(200);
      expect(result.service_contracts).toBe(2500);
      expect(result.gap).toBe(800);
      expect(result.negative_equity).toBe(0);
      expect(result.tax_already_collected).toBe(0);
    });

    it('should convert lease-specific fields', () => {
      const input: Partial<TaxCalculationInput> = {
        stateCode: 'IN',
        dealType: 'LEASE',
        grossCapCost: 35000,
        capReductionCash: 3000,
        capReductionTradeIn: 5000,
        capReductionRebateManufacturer: 2000,
        capReductionRebateDealer: 500,
        basePayment: 450,
        paymentCount: 36,
      };

      const result = calculationInputToSnakeCase(input as TaxCalculationInput) as Record<
        string,
        unknown
      >;

      expect(result.gross_cap_cost).toBe(35000);
      expect(result.cap_reduction_cash).toBe(3000);
      expect(result.cap_reduction_trade_in).toBe(5000);
      expect(result.cap_reduction_rebate_manufacturer).toBe(2000);
      expect(result.cap_reduction_rebate_dealer).toBe(500);
      expect(result.base_payment).toBe(450);
      expect(result.payment_count).toBe(36);
    });

    it('should convert origin tax info', () => {
      const input: Partial<TaxCalculationInput> = {
        stateCode: 'IN',
        originTaxInfo: {
          stateCode: 'TX',
          amount: 2000,
          effectiveRate: 0.0625,
          taxPaidDate: '2025-01-01',
        },
      };

      const result = calculationInputToSnakeCase(input as TaxCalculationInput) as Record<
        string,
        unknown
      >;
      const originTaxInfo = result.origin_tax_info as Record<string, unknown>;

      expect(originTaxInfo.state_code).toBe('TX');
      expect(originTaxInfo.amount).toBe(2000);
      expect(originTaxInfo.effective_rate).toBe(0.0625);
      expect(originTaxInfo.tax_paid_date).toBe('2025-01-01');
    });

    it('should convert rates array', () => {
      const input: Partial<TaxCalculationInput> = {
        stateCode: 'IN',
        rates: [
          { label: 'STATE', rate: 0.07 },
          { label: 'LOCAL', rate: 0.02 },
        ],
      };

      const result = calculationInputToSnakeCase(input as TaxCalculationInput) as Record<
        string,
        unknown
      >;
      const rates = result.rates as Array<Record<string, unknown>>;

      expect(rates).toHaveLength(2);
      expect(rates[0].label).toBe('STATE');
      expect(rates[0].rate).toBe(0.07);
      expect(rates[1].label).toBe('LOCAL');
      expect(rates[1].rate).toBe(0.02);
    });

    it('should convert other fees array', () => {
      const input: Partial<TaxCalculationInput> = {
        stateCode: 'IN',
        otherFees: [
          { code: 'TITLE', amount: 31 },
          { code: 'REG', amount: 50 },
        ],
      };

      const result = calculationInputToSnakeCase(input as TaxCalculationInput) as Record<
        string,
        unknown
      >;
      const otherFees = result.other_fees as Array<Record<string, unknown>>;

      expect(otherFees).toHaveLength(2);
      expect(otherFees[0].code).toBe('TITLE');
      expect(otherFees[0].amount).toBe(31);
    });
  });

  describe('calculationResultToCamelCase', () => {
    it('should convert snake_case result to camelCase', () => {
      const snakeCaseResult = {
        mode: 'RETAIL',
        bases: {
          vehicle_base: 25000,
          fees_base: 200,
          products_base: 3300,
          total_taxable_base: 28500,
        },
        taxes: {
          component_taxes: [{ label: 'STATE', rate: 0.07, amount: 1995 }],
          total_tax: 1995,
        },
        debug: {
          applied_trade_in: 10000,
          applied_rebates_non_taxable: 2000,
          applied_rebates_taxable: 0,
          taxable_doc_fee: 200,
          taxable_fees: [],
          taxable_service_contracts: 2500,
          taxable_gap: 800,
          reciprocity_credit: 0,
          notes: ['Test note'],
        },
      };

      const result = calculationResultToCamelCase(snakeCaseResult);

      expect(result.mode).toBe('RETAIL');
      expect(result.bases.vehicleBase).toBe(25000);
      expect(result.bases.feesBase).toBe(200);
      expect(result.bases.productsBase).toBe(3300);
      expect(result.bases.totalTaxableBase).toBe(28500);
      expect(result.taxes.componentTaxes).toHaveLength(1);
      expect(result.taxes.componentTaxes[0].label).toBe('STATE');
      expect(result.taxes.totalTax).toBe(1995);
      expect(result.debug.appliedTradeIn).toBe(10000);
      expect(result.debug.appliedRebatesNonTaxable).toBe(2000);
      expect(result.debug.taxableDocFee).toBe(200);
      expect(result.debug.taxableServiceContracts).toBe(2500);
      expect(result.debug.taxableGap).toBe(800);
      expect(result.debug.reciprocityCredit).toBe(0);
    });

    it('should convert lease breakdown', () => {
      const snakeCaseResult = {
        mode: 'LEASE',
        bases: {
          vehicle_base: 35000,
          fees_base: 200,
          products_base: 0,
          total_taxable_base: 35200,
        },
        taxes: {
          component_taxes: [],
          total_tax: 14,
        },
        lease_breakdown: {
          upfront_taxable_base: 200,
          upfront_taxes: {
            component_taxes: [{ label: 'STATE', rate: 0.07, amount: 14 }],
            total_tax: 14,
          },
          payment_taxable_base_per_period: 450,
          payment_taxes_per_period: {
            component_taxes: [{ label: 'STATE', rate: 0.07, amount: 31.5 }],
            total_tax: 31.5,
          },
          total_tax_over_term: 1148,
        },
        debug: {
          applied_trade_in: 0,
          applied_rebates_non_taxable: 0,
          applied_rebates_taxable: 0,
          taxable_doc_fee: 200,
          taxable_fees: [],
          taxable_service_contracts: 0,
          taxable_gap: 0,
          reciprocity_credit: 0,
          notes: [],
        },
      };

      const result = calculationResultToCamelCase(snakeCaseResult);

      expect(result.leaseBreakdown).toBeDefined();
      expect(result.leaseBreakdown?.upfrontTaxableBase).toBe(200);
      expect(result.leaseBreakdown?.upfrontTaxes.totalTax).toBe(14);
      expect(result.leaseBreakdown?.paymentTaxableBasePerPeriod).toBe(450);
      expect(result.leaseBreakdown?.paymentTaxesPerPeriod.totalTax).toBe(31.5);
      expect(result.leaseBreakdown?.totalTaxOverTerm).toBe(1148);
    });
  });

  describe('serializeRulesForWasm', () => {
    it('should return valid JSON string with snake_case keys', () => {
      const rules: Partial<TaxRulesConfig> = {
        stateCode: 'IN',
        version: 1,
        docFeeTaxable: true,
      };

      const json = serializeRulesForWasm(rules as TaxRulesConfig);

      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed.state_code).toBe('IN');
      expect(parsed.version).toBe(1);
      expect(parsed.doc_fee_taxable).toBe(true);
    });

    it('should produce valid JSON for complex rules', () => {
      const rules: Partial<TaxRulesConfig> = {
        stateCode: 'IN',
        tradeInPolicy: { type: 'FULL' },
        rebates: [{ appliesTo: 'MANUFACTURER', taxable: false }],
      };

      const json = serializeRulesForWasm(rules as TaxRulesConfig);

      expect(() => JSON.parse(json)).not.toThrow();
      const parsed = JSON.parse(json);
      expect(parsed.trade_in_policy.type).toBe('FULL');
      expect(parsed.rebates[0].applies_to).toBe('MANUFACTURER');
    });
  });

  describe('serializeInputForWasm', () => {
    it('should return valid JSON string with snake_case keys', () => {
      const input: Partial<TaxCalculationInput> = {
        stateCode: 'IN',
        dealType: 'RETAIL',
        vehiclePrice: 35000,
      };

      const json = serializeInputForWasm(input as TaxCalculationInput);

      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed.state_code).toBe('IN');
      expect(parsed.deal_type).toBe('RETAIL');
      expect(parsed.vehicle_price).toBe(35000);
    });
  });

  describe('parseWasmResult', () => {
    it('should parse valid JSON and convert to camelCase', () => {
      const json = JSON.stringify({
        mode: 'RETAIL',
        bases: {
          vehicle_base: 25000,
          fees_base: 200,
          products_base: 3300,
          total_taxable_base: 28500,
        },
        taxes: {
          component_taxes: [{ label: 'STATE', rate: 0.07, amount: 1995 }],
          total_tax: 1995,
        },
        debug: {
          applied_trade_in: 10000,
          applied_rebates_non_taxable: 0,
          applied_rebates_taxable: 0,
          taxable_doc_fee: 200,
          taxable_fees: [],
          taxable_service_contracts: 2500,
          taxable_gap: 800,
          reciprocity_credit: 0,
          notes: [],
        },
      });

      const result = parseWasmResult(json);

      expect(result.mode).toBe('RETAIL');
      expect(result.bases.vehicleBase).toBe(25000);
      expect(result.taxes.totalTax).toBe(1995);
    });

    it('should throw error for invalid JSON', () => {
      expect(() => parseWasmResult('not valid json')).toThrow('Failed to parse WASM result JSON');
    });

    it('should throw error for non-object result', () => {
      expect(() => parseWasmResult('null')).toThrow('WASM result is not a valid object');
      expect(() => parseWasmResult('"string"')).toThrow('WASM result is not a valid object');
      expect(() => parseWasmResult('123')).toThrow('WASM result is not a valid object');
    });

    it('should handle array result (converts to object with numeric keys)', () => {
      // Arrays are technically objects in JavaScript, so parseWasmResult
      // will convert them (but the result won't be a valid TaxCalculationResult)
      const result = parseWasmResult('[]');
      expect(result).toBeDefined();
    });

    it('should handle empty object', () => {
      const result = parseWasmResult('{}');
      expect(result).toBeDefined();
    });
  });

  describe('Case conversion edge cases', () => {
    it('should handle consecutive uppercase letters', () => {
      const input = { stateCode: 'NY', apiURL: 'test' };
      const result = calculationInputToSnakeCase(input as unknown as TaxCalculationInput) as Record<
        string,
        unknown
      >;
      expect(result.state_code).toBe('NY');
      expect(result.api_u_r_l).toBe('test'); // Note: Each uppercase becomes _lowercase
    });

    it('should handle single character keys', () => {
      const input = { a: 1, b: 2 };
      const result = calculationInputToSnakeCase(input as unknown as TaxCalculationInput) as Record<
        string,
        unknown
      >;
      expect(result.a).toBe(1);
      expect(result.b).toBe(2);
    });

    it('should handle numeric values', () => {
      const input = { value1: 100, value2: 200.5 };
      const result = calculationInputToSnakeCase(input as unknown as TaxCalculationInput) as Record<
        string,
        unknown
      >;
      expect(result.value1).toBe(100);
      expect(result.value2).toBe(200.5);
    });

    it('should handle boolean values', () => {
      const input = { isActive: true, isComplete: false };
      const result = calculationInputToSnakeCase(input as unknown as TaxCalculationInput) as Record<
        string,
        unknown
      >;
      expect(result.is_active).toBe(true);
      expect(result.is_complete).toBe(false);
    });

    it('should handle empty arrays', () => {
      const input = { items: [] };
      const result = calculationInputToSnakeCase(input as unknown as TaxCalculationInput) as Record<
        string,
        unknown
      >;
      expect(result.items).toEqual([]);
    });

    it('should handle empty objects', () => {
      const input = { extras: {} };
      const result = calculationInputToSnakeCase(input as unknown as TaxCalculationInput) as Record<
        string,
        unknown
      >;
      expect(result.extras).toEqual({});
    });
  });
});
