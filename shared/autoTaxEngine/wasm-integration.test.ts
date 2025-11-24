/**
 * WASM Tax Engine Integration Tests
 *
 * These tests verify that the Rust WASM module correctly integrates
 * with the TypeScript codebase and produces accurate results.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  initTaxEngineWasm,
  calculateVehicleTaxWasm,
  isWasmAvailable,
  getTaxEngineVersion,
} from './wasm-wrapper.js';
import type { TaxRulesConfig, TaxCalculationInput } from './types.js';

describe('WASM Tax Engine Integration', () => {
  beforeAll(async () => {
    // Initialize WASM module before running tests
    await initTaxEngineWasm();
  });

  it('should successfully initialize WASM module', () => {
    expect(isWasmAvailable()).toBe(true);
  });

  it('should report correct version', () => {
    const version = getTaxEngineVersion();
    expect(version).toContain('WASM');
    expect(version).toMatch(/\d+\.\d+\.\d+/);
  });

  it('should calculate Indiana retail tax correctly', async () => {
    const rules: TaxRulesConfig = {
      state_code: 'IN',
      version: 1,
      trade_in_policy: { type: 'FULL' },
      rebates: [],
      doc_fee_taxable: false,
      fee_tax_rules: [],
      tax_on_accessories: true,
      tax_on_negative_equity: false,
      tax_on_service_contracts: false,
      tax_on_gap: false,
      vehicle_tax_scheme: 'STATE_ONLY',
      vehicle_uses_local_sales_tax: false,
      lease_rules: {
        method: 'MONTHLY',
        tax_cap_reduction: false,
        rebate_behavior: 'FOLLOW_RETAIL_RULE',
        doc_fee_taxability: 'FOLLOW_RETAIL_RULE',
        trade_in_credit: 'FOLLOW_RETAIL_RULE',
        negative_equity_taxable: false,
        fee_tax_rules: [],
        title_fee_rules: [],
        tax_fees_upfront: true,
      },
      reciprocity: {
        enabled: false,
        scope: 'NONE',
        home_state_behavior: 'NONE',
        require_proof_of_tax_paid: false,
        basis: 'TAX_PAID',
        cap_at_this_states_tax: true,
        has_lease_exception: false,
      },
    };

    const input: TaxCalculationInput = {
      state_code: 'IN',
      deal_type: 'RETAIL',
      vehicle_price: 30000.0,
      trade_allowance: 5000.0,
    };

    const result = await calculateVehicleTaxWasm(rules, input);

    // Indiana has 7% tax, full trade-in credit
    // Taxable: $30,000 - $5,000 = $25,000
    // Tax: $25,000 * 0.07 = $1,750
    expect(result.taxable_amount).toBe(25000);
    expect(result.state_tax).toBeCloseTo(1750, 2);
    expect(result.local_tax).toBe(0);
    expect(result.total_tax).toBeCloseTo(1750, 2);
    expect(result.effective_rate).toBeCloseTo(0.07, 4);
  });

  it('should handle trade-in credit correctly', async () => {
    const rules: TaxRulesConfig = {
      state_code: 'CA',
      version: 1,
      trade_in_policy: { type: 'FULL' },
      rebates: [],
      doc_fee_taxable: false,
      fee_tax_rules: [],
      tax_on_accessories: true,
      tax_on_negative_equity: false,
      tax_on_service_contracts: false,
      tax_on_gap: false,
      vehicle_tax_scheme: 'STATE_PLUS_LOCAL',
      vehicle_uses_local_sales_tax: true,
      lease_rules: {
        method: 'MONTHLY',
        tax_cap_reduction: false,
        rebate_behavior: 'FOLLOW_RETAIL_RULE',
        doc_fee_taxability: 'FOLLOW_RETAIL_RULE',
        trade_in_credit: 'FOLLOW_RETAIL_RULE',
        negative_equity_taxable: false,
        fee_tax_rules: [],
        title_fee_rules: [],
        tax_fees_upfront: true,
      },
      reciprocity: {
        enabled: false,
        scope: 'NONE',
        home_state_behavior: 'NONE',
        require_proof_of_tax_paid: false,
        basis: 'TAX_PAID',
        cap_at_this_states_tax: true,
        has_lease_exception: false,
      },
    };

    const input: TaxCalculationInput = {
      state_code: 'CA',
      deal_type: 'RETAIL',
      vehicle_price: 40000.0,
      trade_allowance: 10000.0,
    };

    const result = await calculateVehicleTaxWasm(rules, input);

    // California has 7.25% state + ~1% local
    // Taxable: $40,000 - $10,000 = $30,000
    expect(result.taxable_amount).toBe(30000);
    expect(result.total_tax).toBeGreaterThan(0);
    expect(result.state_tax).toBeCloseTo(30000 * 0.0725, 2);
  });

  it('should handle no trade-in correctly', async () => {
    const rules: TaxRulesConfig = {
      state_code: 'TX',
      version: 1,
      trade_in_policy: { type: 'NONE' },
      rebates: [],
      doc_fee_taxable: false,
      fee_tax_rules: [],
      tax_on_accessories: true,
      tax_on_negative_equity: false,
      tax_on_service_contracts: false,
      tax_on_gap: false,
      vehicle_tax_scheme: 'STATE_ONLY',
      vehicle_uses_local_sales_tax: false,
      lease_rules: {
        method: 'MONTHLY',
        tax_cap_reduction: false,
        rebate_behavior: 'FOLLOW_RETAIL_RULE',
        doc_fee_taxability: 'FOLLOW_RETAIL_RULE',
        trade_in_credit: 'NONE',
        negative_equity_taxable: false,
        fee_tax_rules: [],
        title_fee_rules: [],
        tax_fees_upfront: true,
      },
      reciprocity: {
        enabled: false,
        scope: 'NONE',
        home_state_behavior: 'NONE',
        require_proof_of_tax_paid: false,
        basis: 'TAX_PAID',
        cap_at_this_states_tax: true,
        has_lease_exception: false,
      },
    };

    const input: TaxCalculationInput = {
      state_code: 'TX',
      deal_type: 'RETAIL',
      vehicle_price: 25000.0,
      trade_allowance: 5000.0,
    };

    const result = await calculateVehicleTaxWasm(rules, input);

    // Texas doesn't allow trade-in credit
    // Taxable: $25,000 (full vehicle price)
    // Tax: $25,000 * 0.0625 = $1,562.50
    expect(result.taxable_amount).toBe(25000);
    expect(result.total_tax).toBeCloseTo(1562.5, 2);
  });

  it('should handle rebates correctly', async () => {
    const rules: TaxRulesConfig = {
      state_code: 'FL',
      version: 1,
      trade_in_policy: { type: 'FULL' },
      rebates: [
        {
          applies_to: 'MANUFACTURER',
          taxable: false,
        },
      ],
      doc_fee_taxable: false,
      fee_tax_rules: [],
      tax_on_accessories: true,
      tax_on_negative_equity: false,
      tax_on_service_contracts: false,
      tax_on_gap: false,
      vehicle_tax_scheme: 'STATE_ONLY',
      vehicle_uses_local_sales_tax: false,
      lease_rules: {
        method: 'MONTHLY',
        tax_cap_reduction: false,
        rebate_behavior: 'FOLLOW_RETAIL_RULE',
        doc_fee_taxability: 'FOLLOW_RETAIL_RULE',
        trade_in_credit: 'FOLLOW_RETAIL_RULE',
        negative_equity_taxable: false,
        fee_tax_rules: [],
        title_fee_rules: [],
        tax_fees_upfront: true,
      },
      reciprocity: {
        enabled: false,
        scope: 'NONE',
        home_state_behavior: 'NONE',
        require_proof_of_tax_paid: false,
        basis: 'TAX_PAID',
        cap_at_this_states_tax: true,
        has_lease_exception: false,
      },
    };

    const input: TaxCalculationInput = {
      state_code: 'FL',
      deal_type: 'RETAIL',
      vehicle_price: 35000.0,
      trade_allowance: 5000.0,
      rebates: 2000.0,
    };

    const result = await calculateVehicleTaxWasm(rules, input);

    // Florida: 6% tax
    // Taxable: $35,000 - $5,000 (trade) - $2,000 (rebate) = $28,000
    // Tax: $28,000 * 0.06 = $1,680
    expect(result.taxable_amount).toBe(28000);
    expect(result.total_tax).toBeCloseTo(1680, 2);
  });

  it('should handle dealer fees when taxable', async () => {
    const rules: TaxRulesConfig = {
      state_code: 'IL',
      version: 1,
      trade_in_policy: { type: 'FULL' },
      rebates: [],
      doc_fee_taxable: true, // Illinois taxes doc fees
      fee_tax_rules: [],
      tax_on_accessories: true,
      tax_on_negative_equity: false,
      tax_on_service_contracts: false,
      tax_on_gap: false,
      vehicle_tax_scheme: 'STATE_PLUS_LOCAL',
      vehicle_uses_local_sales_tax: true,
      lease_rules: {
        method: 'MONTHLY',
        tax_cap_reduction: false,
        rebate_behavior: 'FOLLOW_RETAIL_RULE',
        doc_fee_taxability: 'ALWAYS',
        trade_in_credit: 'FOLLOW_RETAIL_RULE',
        negative_equity_taxable: false,
        fee_tax_rules: [],
        title_fee_rules: [],
        tax_fees_upfront: true,
      },
      reciprocity: {
        enabled: false,
        scope: 'NONE',
        home_state_behavior: 'NONE',
        require_proof_of_tax_paid: false,
        basis: 'TAX_PAID',
        cap_at_this_states_tax: true,
        has_lease_exception: false,
      },
    };

    const input: TaxCalculationInput = {
      state_code: 'IL',
      deal_type: 'RETAIL',
      vehicle_price: 30000.0,
      dealer_fees: 500.0,
    };

    const result = await calculateVehicleTaxWasm(rules, input);

    // Illinois: 6.25% state + ~2% local
    // Taxable: $30,000 + $500 (doc fee) = $30,500
    expect(result.taxable_amount).toBe(30500);
    expect(result.state_tax).toBeCloseTo(30500 * 0.0625, 2);
  });

  it('should handle negative equity when taxable', async () => {
    const rules: TaxRulesConfig = {
      state_code: 'AZ',
      version: 1,
      trade_in_policy: { type: 'FULL' },
      rebates: [],
      doc_fee_taxable: false,
      fee_tax_rules: [],
      tax_on_accessories: true,
      tax_on_negative_equity: true, // Arizona taxes negative equity
      tax_on_service_contracts: false,
      tax_on_gap: false,
      vehicle_tax_scheme: 'STATE_ONLY',
      vehicle_uses_local_sales_tax: false,
      lease_rules: {
        method: 'MONTHLY',
        tax_cap_reduction: false,
        rebate_behavior: 'FOLLOW_RETAIL_RULE',
        doc_fee_taxability: 'FOLLOW_RETAIL_RULE',
        trade_in_credit: 'FOLLOW_RETAIL_RULE',
        negative_equity_taxable: true,
        fee_tax_rules: [],
        title_fee_rules: [],
        tax_fees_upfront: true,
      },
      reciprocity: {
        enabled: false,
        scope: 'NONE',
        home_state_behavior: 'NONE',
        require_proof_of_tax_paid: false,
        basis: 'TAX_PAID',
        cap_at_this_states_tax: true,
        has_lease_exception: false,
      },
    };

    const input: TaxCalculationInput = {
      state_code: 'AZ',
      deal_type: 'RETAIL',
      vehicle_price: 30000.0,
      trade_allowance: 5000.0,
      trade_payoff: 8000.0, // $3,000 negative equity
    };

    const result = await calculateVehicleTaxWasm(rules, input);

    // Arizona: 5.6% tax
    // Taxable: $30,000 - $5,000 (trade allowance) + $3,000 (negative equity) = $28,000
    // Tax: $28,000 * 0.056 = $1,568
    expect(result.taxable_amount).toBe(28000);
    expect(result.total_tax).toBeCloseTo(1568, 2);
  });
});
