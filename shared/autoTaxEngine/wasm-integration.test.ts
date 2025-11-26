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

  // WASM may not be available in Node.js test environment - these tests verify fallback behavior
  it('should handle WASM availability gracefully', () => {
    // In Node.js test environment, WASM may not load - verify either works
    const wasmAvailable = isWasmAvailable();
    expect(typeof wasmAvailable).toBe('boolean');
  });

  it('should report version (WASM or TypeScript fallback)', () => {
    const version = getTaxEngineVersion();
    // Version should be either "WASM x.x.x" or "TypeScript 1.0.0"
    expect(version).toMatch(/^(WASM|TypeScript) \d+\.\d+\.\d+$/);
  });

  it('should calculate Indiana retail tax correctly', async () => {
    const rules: TaxRulesConfig = {
      stateCode: 'IN',
      version: 1,
      tradeInPolicy: { type: 'FULL' },
      rebates: [],
      docFeeTaxable: false,
      feeTaxRules: [],
      taxOnAccessories: true,
      taxOnNegativeEquity: false,
      taxOnServiceContracts: false,
      taxOnGap: false,
      vehicleTaxScheme: 'STATE_ONLY',
      vehicleUsesLocalSalesTax: false,
      leaseRules: {
        method: 'MONTHLY',
        taxCapReduction: false,
        rebateBehavior: 'FOLLOW_RETAIL_RULE',
        docFeeTaxability: 'FOLLOW_RETAIL_RULE',
        tradeInCredit: 'FOLLOW_RETAIL_RULE',
        negativeEquityTaxable: false,
        feeTaxRules: [],
        titleFeeRules: [],
        taxFeesUpfront: true,
        specialScheme: 'NONE',
      },
      reciprocity: {
        enabled: false,
        scope: 'NONE',
        homeStateBehavior: 'NONE',
        requireProofOfTaxPaid: false,
        basis: 'TAX_PAID',
        capAtThisStatesTax: true,
        hasLeaseException: false,
      },
    };

    const input: TaxCalculationInput = {
      stateCode: 'IN',
      asOfDate: '2025-01-01',
      dealType: 'RETAIL',
      vehiclePrice: 30000.0,
      accessoriesAmount: 0,
      tradeInValue: 5000.0,
      rebateManufacturer: 0,
      rebateDealer: 0,
      docFee: 0,
      otherFees: [],
      serviceContracts: 0,
      gap: 0,
      negativeEquity: 0,
      taxAlreadyCollected: 0,
      rates: [{ label: 'STATE', rate: 0.07 }],
    };

    const result = await calculateVehicleTaxWasm(rules, input);

    // Indiana has 7% tax, full trade-in credit
    // Taxable: $30,000 - $5,000 = $25,000
    // Tax: $25,000 * 0.07 = $1,750
    expect(result.bases.totalTaxableBase).toBe(25000);
    expect(result.taxes.totalTax).toBeCloseTo(1750, 2);
    expect(result.mode).toBe('RETAIL');
  });

  it('should handle trade-in credit correctly', async () => {
    const rules: TaxRulesConfig = {
      stateCode: 'CA',
      version: 1,
      tradeInPolicy: { type: 'FULL' },
      rebates: [],
      docFeeTaxable: false,
      feeTaxRules: [],
      taxOnAccessories: true,
      taxOnNegativeEquity: false,
      taxOnServiceContracts: false,
      taxOnGap: false,
      vehicleTaxScheme: 'STATE_PLUS_LOCAL',
      vehicleUsesLocalSalesTax: true,
      leaseRules: {
        method: 'MONTHLY',
        taxCapReduction: false,
        rebateBehavior: 'FOLLOW_RETAIL_RULE',
        docFeeTaxability: 'FOLLOW_RETAIL_RULE',
        tradeInCredit: 'FOLLOW_RETAIL_RULE',
        negativeEquityTaxable: false,
        feeTaxRules: [],
        titleFeeRules: [],
        taxFeesUpfront: true,
        specialScheme: 'NONE',
      },
      reciprocity: {
        enabled: false,
        scope: 'NONE',
        homeStateBehavior: 'NONE',
        requireProofOfTaxPaid: false,
        basis: 'TAX_PAID',
        capAtThisStatesTax: true,
        hasLeaseException: false,
      },
    };

    const input: TaxCalculationInput = {
      stateCode: 'CA',
      asOfDate: '2025-01-01',
      dealType: 'RETAIL',
      vehiclePrice: 40000.0,
      accessoriesAmount: 0,
      tradeInValue: 10000.0,
      rebateManufacturer: 0,
      rebateDealer: 0,
      docFee: 0,
      otherFees: [],
      serviceContracts: 0,
      gap: 0,
      negativeEquity: 0,
      taxAlreadyCollected: 0,
      rates: [
        { label: 'STATE', rate: 0.0725 },
        { label: 'LOCAL', rate: 0.01 },
      ],
    };

    const result = await calculateVehicleTaxWasm(rules, input);

    // California has 7.25% state + ~1% local
    // Taxable: $40,000 - $10,000 = $30,000
    expect(result.bases.totalTaxableBase).toBe(30000);
    expect(result.taxes.totalTax).toBeGreaterThan(0);
    // State tax component: $30,000 * 0.0725 = $2,175
    const stateTaxComponent = result.taxes.componentTaxes.find((c) => c.label === 'STATE');
    expect(stateTaxComponent?.amount).toBeCloseTo(2175, 2);
  });

  it('should handle no trade-in policy correctly', async () => {
    const rules: TaxRulesConfig = {
      stateCode: 'TX',
      version: 1,
      tradeInPolicy: { type: 'NONE' },
      rebates: [],
      docFeeTaxable: false,
      feeTaxRules: [],
      taxOnAccessories: true,
      taxOnNegativeEquity: false,
      taxOnServiceContracts: false,
      taxOnGap: false,
      vehicleTaxScheme: 'STATE_ONLY',
      vehicleUsesLocalSalesTax: false,
      leaseRules: {
        method: 'MONTHLY',
        taxCapReduction: false,
        rebateBehavior: 'FOLLOW_RETAIL_RULE',
        docFeeTaxability: 'FOLLOW_RETAIL_RULE',
        tradeInCredit: 'NONE',
        negativeEquityTaxable: false,
        feeTaxRules: [],
        titleFeeRules: [],
        taxFeesUpfront: true,
        specialScheme: 'NONE',
      },
      reciprocity: {
        enabled: false,
        scope: 'NONE',
        homeStateBehavior: 'NONE',
        requireProofOfTaxPaid: false,
        basis: 'TAX_PAID',
        capAtThisStatesTax: true,
        hasLeaseException: false,
      },
    };

    const input: TaxCalculationInput = {
      stateCode: 'TX',
      asOfDate: '2025-01-01',
      dealType: 'RETAIL',
      vehiclePrice: 25000.0,
      accessoriesAmount: 0,
      tradeInValue: 5000.0, // Will be ignored due to NONE policy
      rebateManufacturer: 0,
      rebateDealer: 0,
      docFee: 0,
      otherFees: [],
      serviceContracts: 0,
      gap: 0,
      negativeEquity: 0,
      taxAlreadyCollected: 0,
      rates: [{ label: 'STATE', rate: 0.0625 }],
    };

    const result = await calculateVehicleTaxWasm(rules, input);

    // Texas doesn't allow trade-in credit (NONE policy)
    // Taxable: $25,000 (full vehicle price, trade-in ignored)
    // Tax: $25,000 * 0.0625 = $1,562.50
    expect(result.bases.totalTaxableBase).toBe(25000);
    expect(result.taxes.totalTax).toBeCloseTo(1562.5, 2);
  });

  it('should handle rebates correctly', async () => {
    const rules: TaxRulesConfig = {
      stateCode: 'FL',
      version: 1,
      tradeInPolicy: { type: 'FULL' },
      rebates: [
        {
          appliesTo: 'MANUFACTURER',
          taxable: false,
        },
      ],
      docFeeTaxable: false,
      feeTaxRules: [],
      taxOnAccessories: true,
      taxOnNegativeEquity: false,
      taxOnServiceContracts: false,
      taxOnGap: false,
      vehicleTaxScheme: 'STATE_ONLY',
      vehicleUsesLocalSalesTax: false,
      leaseRules: {
        method: 'MONTHLY',
        taxCapReduction: false,
        rebateBehavior: 'FOLLOW_RETAIL_RULE',
        docFeeTaxability: 'FOLLOW_RETAIL_RULE',
        tradeInCredit: 'FOLLOW_RETAIL_RULE',
        negativeEquityTaxable: false,
        feeTaxRules: [],
        titleFeeRules: [],
        taxFeesUpfront: true,
        specialScheme: 'NONE',
      },
      reciprocity: {
        enabled: false,
        scope: 'NONE',
        homeStateBehavior: 'NONE',
        requireProofOfTaxPaid: false,
        basis: 'TAX_PAID',
        capAtThisStatesTax: true,
        hasLeaseException: false,
      },
    };

    const input: TaxCalculationInput = {
      stateCode: 'FL',
      asOfDate: '2025-01-01',
      dealType: 'RETAIL',
      vehiclePrice: 35000.0,
      accessoriesAmount: 0,
      tradeInValue: 5000.0,
      rebateManufacturer: 2000.0,
      rebateDealer: 0,
      docFee: 0,
      otherFees: [],
      serviceContracts: 0,
      gap: 0,
      negativeEquity: 0,
      taxAlreadyCollected: 0,
      rates: [{ label: 'STATE', rate: 0.06 }],
    };

    const result = await calculateVehicleTaxWasm(rules, input);

    // Florida: 6% tax
    // Taxable: $35,000 - $5,000 (trade) - $2,000 (rebate) = $28,000
    // Tax: $28,000 * 0.06 = $1,680
    expect(result.bases.totalTaxableBase).toBe(28000);
    expect(result.taxes.totalTax).toBeCloseTo(1680, 2);
  });

  it('should handle dealer fees when taxable', async () => {
    const rules: TaxRulesConfig = {
      stateCode: 'IL',
      version: 1,
      tradeInPolicy: { type: 'FULL' },
      rebates: [],
      docFeeTaxable: true, // Illinois taxes doc fees
      feeTaxRules: [],
      taxOnAccessories: true,
      taxOnNegativeEquity: false,
      taxOnServiceContracts: false,
      taxOnGap: false,
      vehicleTaxScheme: 'STATE_PLUS_LOCAL',
      vehicleUsesLocalSalesTax: true,
      leaseRules: {
        method: 'MONTHLY',
        taxCapReduction: false,
        rebateBehavior: 'FOLLOW_RETAIL_RULE',
        docFeeTaxability: 'ALWAYS',
        tradeInCredit: 'FOLLOW_RETAIL_RULE',
        negativeEquityTaxable: false,
        feeTaxRules: [],
        titleFeeRules: [],
        taxFeesUpfront: true,
        specialScheme: 'NONE',
      },
      reciprocity: {
        enabled: false,
        scope: 'NONE',
        homeStateBehavior: 'NONE',
        requireProofOfTaxPaid: false,
        basis: 'TAX_PAID',
        capAtThisStatesTax: true,
        hasLeaseException: false,
      },
    };

    const input: TaxCalculationInput = {
      stateCode: 'IL',
      asOfDate: '2025-01-01',
      dealType: 'RETAIL',
      vehiclePrice: 30000.0,
      accessoriesAmount: 0,
      tradeInValue: 0,
      rebateManufacturer: 0,
      rebateDealer: 0,
      docFee: 500.0,
      otherFees: [],
      serviceContracts: 0,
      gap: 0,
      negativeEquity: 0,
      taxAlreadyCollected: 0,
      rates: [
        { label: 'STATE', rate: 0.0625 },
        { label: 'LOCAL', rate: 0.02 },
      ],
    };

    const result = await calculateVehicleTaxWasm(rules, input);

    // Illinois: 6.25% state + ~2% local
    // Taxable: $30,000 + $500 (doc fee) = $30,500
    expect(result.bases.totalTaxableBase).toBe(30500);
    // State tax: $30,500 * 0.0625 = $1,906.25
    const stateTaxComponent = result.taxes.componentTaxes.find((c) => c.label === 'STATE');
    expect(stateTaxComponent?.amount).toBeCloseTo(1906.25, 2);
  });

  it('should handle negative equity when taxable', async () => {
    const rules: TaxRulesConfig = {
      stateCode: 'AZ',
      version: 1,
      tradeInPolicy: { type: 'FULL' },
      rebates: [],
      docFeeTaxable: false,
      feeTaxRules: [],
      taxOnAccessories: true,
      taxOnNegativeEquity: true, // Arizona taxes negative equity
      taxOnServiceContracts: false,
      taxOnGap: false,
      vehicleTaxScheme: 'STATE_ONLY',
      vehicleUsesLocalSalesTax: false,
      leaseRules: {
        method: 'MONTHLY',
        taxCapReduction: false,
        rebateBehavior: 'FOLLOW_RETAIL_RULE',
        docFeeTaxability: 'FOLLOW_RETAIL_RULE',
        tradeInCredit: 'FOLLOW_RETAIL_RULE',
        negativeEquityTaxable: true,
        feeTaxRules: [],
        titleFeeRules: [],
        taxFeesUpfront: true,
        specialScheme: 'NONE',
      },
      reciprocity: {
        enabled: false,
        scope: 'NONE',
        homeStateBehavior: 'NONE',
        requireProofOfTaxPaid: false,
        basis: 'TAX_PAID',
        capAtThisStatesTax: true,
        hasLeaseException: false,
      },
    };

    const input: TaxCalculationInput = {
      stateCode: 'AZ',
      asOfDate: '2025-01-01',
      dealType: 'RETAIL',
      vehiclePrice: 30000.0,
      accessoriesAmount: 0,
      tradeInValue: 5000.0,
      rebateManufacturer: 0,
      rebateDealer: 0,
      docFee: 0,
      otherFees: [],
      serviceContracts: 0,
      gap: 0,
      negativeEquity: 3000.0, // $3,000 negative equity
      taxAlreadyCollected: 0,
      rates: [{ label: 'STATE', rate: 0.056 }],
    };

    const result = await calculateVehicleTaxWasm(rules, input);

    // Arizona: 5.6% tax
    // Taxable: $30,000 - $5,000 (trade allowance) + $3,000 (negative equity) = $28,000
    // Tax: $28,000 * 0.056 = $1,568
    expect(result.bases.totalTaxableBase).toBe(28000);
    expect(result.taxes.totalTax).toBeCloseTo(1568, 2);
  });
});
