import { describe, it, expect } from "vitest";
import {
  calculateTax,
  TaxCalculationInput,
  TaxRulesConfig,
} from "../../shared/autoTaxEngine";

describe("Auto Tax Engine - Basic Retail Calculations", () => {
  // Create a simple test state configuration
  const TEST_RULES: TaxRulesConfig = {
    stateCode: "XX",
    version: 1,
    tradeInPolicy: { type: "FULL" },
    rebates: [
      { appliesTo: "MANUFACTURER", taxable: false },
      { appliesTo: "DEALER", taxable: true },
    ],
    docFeeTaxable: true,
    feeTaxRules: [
      { code: "SERVICE_CONTRACT", taxable: true },
      { code: "GAP", taxable: true },
      { code: "TITLE", taxable: false },
      { code: "REG", taxable: false },
    ],
    taxOnAccessories: true,
    taxOnNegativeEquity: true,
    taxOnServiceContracts: true,
    taxOnGap: true,
    vehicleTaxScheme: "STATE_PLUS_LOCAL",
    vehicleUsesLocalSalesTax: false,
    leaseRules: {
      method: "MONTHLY",
      taxCapReduction: false,
      rebateBehavior: "FOLLOW_RETAIL_RULE",
      docFeeTaxability: "ALWAYS",
      tradeInCredit: "FULL",
      negativeEquityTaxable: true,
      feeTaxRules: [],
      titleFeeRules: [],
      taxFeesUpfront: true,
      specialScheme: "NONE",
    },
    reciprocity: {
      enabled: false,
      scope: "BOTH",
      homeStateBehavior: "NONE",
      requireProofOfTaxPaid: false,
      basis: "TAX_PAID",
      capAtThisStatesTax: true,
      hasLeaseException: false,
    },
  };

  it("should calculate basic retail tax correctly", () => {
    const input: TaxCalculationInput = {
      stateCode: "XX",
      asOfDate: "2025-01-15",
      dealType: "RETAIL",
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
      rates: [{ label: "STATE", rate: 0.06 }],
    };

    const result = calculateTax(input, TEST_RULES);

    expect(result.mode).toBe("RETAIL");
    expect(result.bases.vehicleBase).toBe(30000);
    expect(result.bases.totalTaxableBase).toBe(30000);
    expect(result.taxes.totalTax).toBe(1800); // 30000 * 0.06
  });

  it("should apply full trade-in credit", () => {
    const input: TaxCalculationInput = {
      stateCode: "XX",
      asOfDate: "2025-01-15",
      dealType: "RETAIL",
      vehiclePrice: 30000,
      accessoriesAmount: 0,
      tradeInValue: 10000,
      rebateManufacturer: 0,
      rebateDealer: 0,
      docFee: 0,
      otherFees: [],
      serviceContracts: 0,
      gap: 0,
      negativeEquity: 0,
      taxAlreadyCollected: 0,
      rates: [{ label: "STATE", rate: 0.06 }],
    };

    const result = calculateTax(input, TEST_RULES);

    expect(result.debug.appliedTradeIn).toBe(10000);
    expect(result.bases.vehicleBase).toBe(20000); // 30000 - 10000
    expect(result.taxes.totalTax).toBe(1200); // 20000 * 0.06
  });

  it("should handle manufacturer rebate as non-taxable (reduces base)", () => {
    const input: TaxCalculationInput = {
      stateCode: "XX",
      asOfDate: "2025-01-15",
      dealType: "RETAIL",
      vehiclePrice: 30000,
      accessoriesAmount: 0,
      tradeInValue: 0,
      rebateManufacturer: 2000,
      rebateDealer: 0,
      docFee: 0,
      otherFees: [],
      serviceContracts: 0,
      gap: 0,
      negativeEquity: 0,
      taxAlreadyCollected: 0,
      rates: [{ label: "STATE", rate: 0.06 }],
    };

    const result = calculateTax(input, TEST_RULES);

    expect(result.debug.appliedRebatesNonTaxable).toBe(2000);
    expect(result.bases.vehicleBase).toBe(28000); // 30000 - 2000
    expect(result.taxes.totalTax).toBe(1680); // 28000 * 0.06
  });

  it("should handle dealer rebate as taxable (stays in base)", () => {
    const input: TaxCalculationInput = {
      stateCode: "XX",
      asOfDate: "2025-01-15",
      dealType: "RETAIL",
      vehiclePrice: 30000,
      accessoriesAmount: 0,
      tradeInValue: 0,
      rebateManufacturer: 0,
      rebateDealer: 500,
      docFee: 0,
      otherFees: [],
      serviceContracts: 0,
      gap: 0,
      negativeEquity: 0,
      taxAlreadyCollected: 0,
      rates: [{ label: "STATE", rate: 0.06 }],
    };

    const result = calculateTax(input, TEST_RULES);

    expect(result.debug.appliedRebatesTaxable).toBe(500);
    expect(result.bases.vehicleBase).toBe(30000); // No reduction
    expect(result.taxes.totalTax).toBe(1800); // 30000 * 0.06
  });

  it("should include doc fee and taxable fees in feesBase", () => {
    const input: TaxCalculationInput = {
      stateCode: "XX",
      asOfDate: "2025-01-15",
      dealType: "RETAIL",
      vehiclePrice: 30000,
      accessoriesAmount: 0,
      tradeInValue: 0,
      rebateManufacturer: 0,
      rebateDealer: 0,
      docFee: 200,
      otherFees: [
        { code: "SERVICE_CONTRACT", amount: 1500 },
        { code: "GAP", amount: 800 },
        { code: "TITLE", amount: 50 },
        { code: "REG", amount: 100 },
      ],
      serviceContracts: 0,
      gap: 0,
      negativeEquity: 0,
      taxAlreadyCollected: 0,
      rates: [{ label: "STATE", rate: 0.06 }],
    };

    const result = calculateTax(input, TEST_RULES);

    // Doc fee + SERVICE_CONTRACT + GAP (TITLE and REG are non-taxable)
    expect(result.bases.feesBase).toBe(2500); // 200 + 1500 + 800
    expect(result.debug.taxableDocFee).toBe(200);
    expect(result.debug.taxableFees).toHaveLength(2);
  });

  it("should include service contracts and GAP in productsBase", () => {
    const input: TaxCalculationInput = {
      stateCode: "XX",
      asOfDate: "2025-01-15",
      dealType: "RETAIL",
      vehiclePrice: 30000,
      accessoriesAmount: 0,
      tradeInValue: 0,
      rebateManufacturer: 0,
      rebateDealer: 0,
      docFee: 0,
      otherFees: [],
      serviceContracts: 2000,
      gap: 800,
      negativeEquity: 0,
      taxAlreadyCollected: 0,
      rates: [{ label: "STATE", rate: 0.06 }],
    };

    const result = calculateTax(input, TEST_RULES);

    expect(result.bases.productsBase).toBe(2800); // 2000 + 800
    expect(result.debug.taxableServiceContracts).toBe(2000);
    expect(result.debug.taxableGap).toBe(800);
  });

  it("should add accessories to vehicle base when taxable", () => {
    const input: TaxCalculationInput = {
      stateCode: "XX",
      asOfDate: "2025-01-15",
      dealType: "RETAIL",
      vehiclePrice: 30000,
      accessoriesAmount: 2000,
      tradeInValue: 0,
      rebateManufacturer: 0,
      rebateDealer: 0,
      docFee: 0,
      otherFees: [],
      serviceContracts: 0,
      gap: 0,
      negativeEquity: 0,
      taxAlreadyCollected: 0,
      rates: [{ label: "STATE", rate: 0.06 }],
    };

    const result = calculateTax(input, TEST_RULES);

    expect(result.bases.vehicleBase).toBe(32000); // 30000 + 2000
    expect(result.taxes.totalTax).toBe(1920); // 32000 * 0.06
  });

  it("should add negative equity to vehicle base when taxable", () => {
    const input: TaxCalculationInput = {
      stateCode: "XX",
      asOfDate: "2025-01-15",
      dealType: "RETAIL",
      vehiclePrice: 30000,
      accessoriesAmount: 0,
      tradeInValue: 0,
      rebateManufacturer: 0,
      rebateDealer: 0,
      docFee: 0,
      otherFees: [],
      serviceContracts: 0,
      gap: 0,
      negativeEquity: 3000,
      taxAlreadyCollected: 0,
      rates: [{ label: "STATE", rate: 0.06 }],
    };

    const result = calculateTax(input, TEST_RULES);

    expect(result.bases.vehicleBase).toBe(33000); // 30000 + 3000
    expect(result.taxes.totalTax).toBe(1980); // 33000 * 0.06
  });

  it("should handle multiple tax rate components", () => {
    const input: TaxCalculationInput = {
      stateCode: "XX",
      asOfDate: "2025-01-15",
      dealType: "RETAIL",
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
      rates: [
        { label: "STATE", rate: 0.05 },
        { label: "COUNTY", rate: 0.01 },
        { label: "CITY", rate: 0.005 },
      ],
    };

    const result = calculateTax(input, TEST_RULES);

    expect(result.taxes.componentTaxes).toHaveLength(3);
    expect(result.taxes.componentTaxes[0].amount).toBe(1500); // 30000 * 0.05
    expect(result.taxes.componentTaxes[1].amount).toBe(300); // 30000 * 0.01
    expect(result.taxes.componentTaxes[2].amount).toBe(150); // 30000 * 0.005
    expect(result.taxes.totalTax).toBe(1950); // Sum of all components
  });

  it("should handle complex deal with all components", () => {
    const input: TaxCalculationInput = {
      stateCode: "XX",
      asOfDate: "2025-01-15",
      dealType: "RETAIL",
      vehiclePrice: 35000,
      accessoriesAmount: 2000,
      tradeInValue: 10000,
      rebateManufacturer: 2000,
      rebateDealer: 500,
      docFee: 200,
      otherFees: [
        { code: "SERVICE_CONTRACT", amount: 1500 },
        { code: "TITLE", amount: 50 },
      ],
      serviceContracts: 2000,
      gap: 800,
      negativeEquity: 1000,
      taxAlreadyCollected: 0,
      rates: [
        { label: "STATE", rate: 0.06 },
        { label: "COUNTY", rate: 0.01 },
      ],
    };

    const result = calculateTax(input, TEST_RULES);

    // Vehicle base: 35000 + 2000 (accessories) + 1000 (neg equity) - 10000 (trade) - 2000 (mfr rebate) = 26000
    expect(result.bases.vehicleBase).toBe(26000);

    // Fees base: 200 (doc) + 1500 (service contract from otherFees) = 1700
    expect(result.bases.feesBase).toBe(1700);

    // Products base: 2000 (service contracts) + 800 (GAP) = 2800
    expect(result.bases.productsBase).toBe(2800);

    // Total taxable base: 26000 + 1700 + 2800 = 30500
    expect(result.bases.totalTaxableBase).toBe(30500);

    // Total tax: 30500 * 0.07 = 2135
    expect(result.taxes.totalTax).toBe(2135);
  });
});
