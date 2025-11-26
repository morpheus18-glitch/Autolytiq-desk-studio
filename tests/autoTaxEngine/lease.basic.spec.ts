import { describe, it, expect } from "vitest";
import type {
  TaxCalculationInput,
  TaxRulesConfig} from "../../shared/autoTaxEngine";
import {
  calculateTax
} from "../../shared/autoTaxEngine";

describe("Auto Tax Engine - Lease Calculations", () => {
  // Create a test state with MONTHLY lease taxation
  const MONTHLY_STATE: TaxRulesConfig = {
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
    vehicleTaxScheme: "STATE_ONLY",
    vehicleUsesLocalSalesTax: false,
    leaseRules: {
      method: "MONTHLY",
      taxCapReduction: false,
      rebateBehavior: "FOLLOW_RETAIL_RULE",
      docFeeTaxability: "ALWAYS",
      tradeInCredit: "FULL",
      negativeEquityTaxable: true,
      feeTaxRules: [
        { code: "DOC_FEE", taxable: true },
        { code: "SERVICE_CONTRACT", taxable: false },
        { code: "GAP", taxable: false },
        { code: "TITLE", taxable: false },
        { code: "REG", taxable: false },
      ],
      titleFeeRules: [
        {
          code: "TITLE",
          taxable: false,
          includedInCapCost: true,
          includedInUpfront: true,
          includedInMonthly: false,
        },
      ],
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

  describe("MONTHLY Lease Taxation", () => {
    it("should calculate basic monthly lease tax correctly", () => {
      const input: TaxCalculationInput = {
        stateCode: "XX",
        asOfDate: "2025-01-15",
        dealType: "LEASE",
        vehiclePrice: 30000,
        accessoriesAmount: 0,
        tradeInValue: 0,
        rebateManufacturer: 0,
        rebateDealer: 0,
        docFee: 200,
        otherFees: [{ code: "TITLE", amount: 31 }],
        serviceContracts: 0,
        gap: 0,
        negativeEquity: 0,
        taxAlreadyCollected: 0,
        grossCapCost: 30000,
        capReductionCash: 0,
        capReductionTradeIn: 0,
        capReductionRebateManufacturer: 0,
        capReductionRebateDealer: 0,
        basePayment: 450,
        paymentCount: 36,
        rates: [
          { label: "STATE", rate: 0.06 },
          { label: "COUNTY", rate: 0.01 },
        ],
      };

      const result = calculateTax(input, MONTHLY_STATE);

      expect(result.mode).toBe("LEASE");
      expect(result.leaseBreakdown).toBeDefined();

      // Upfront tax should be on doc fee only (200)
      expect(result.leaseBreakdown?.upfrontTaxableBase).toBe(200);
      expect(result.leaseBreakdown?.upfrontTaxes.totalTax).toBe(14); // 200 * 0.07

      // Monthly tax should be on base payment (450)
      expect(result.leaseBreakdown?.paymentTaxableBasePerPeriod).toBe(450);
      expect(result.leaseBreakdown?.paymentTaxesPerPeriod.totalTax).toBe(31.5); // 450 * 0.07

      // Total tax over term
      const expectedTotal = 14 + 31.5 * 36; // Upfront + (monthly * 36)
      expect(result.leaseBreakdown?.totalTaxOverTerm).toBe(expectedTotal);
    });

    it("should apply trade-in credit on leases", () => {
      const input: TaxCalculationInput = {
        stateCode: "XX",
        asOfDate: "2025-01-15",
        dealType: "LEASE",
        vehiclePrice: 30000,
        accessoriesAmount: 0,
        tradeInValue: 5000,
        rebateManufacturer: 0,
        rebateDealer: 0,
        docFee: 200,
        otherFees: [],
        serviceContracts: 0,
        gap: 0,
        negativeEquity: 0,
        taxAlreadyCollected: 0,
        grossCapCost: 30000,
        capReductionCash: 0,
        capReductionTradeIn: 5000,
        capReductionRebateManufacturer: 0,
        capReductionRebateDealer: 0,
        basePayment: 400,
        paymentCount: 36,
        rates: [{ label: "STATE", rate: 0.07 }],
      };

      const result = calculateTax(input, MONTHLY_STATE);

      expect(result.debug.appliedTradeIn).toBe(5000);
      expect(result.bases.vehicleBase).toBe(25000); // 30000 - 5000
    });

    it("should handle manufacturer rebates as non-taxable on leases", () => {
      const input: TaxCalculationInput = {
        stateCode: "XX",
        asOfDate: "2025-01-15",
        dealType: "LEASE",
        vehiclePrice: 30000,
        accessoriesAmount: 0,
        tradeInValue: 0,
        rebateManufacturer: 2000,
        rebateDealer: 0,
        docFee: 200,
        otherFees: [],
        serviceContracts: 0,
        gap: 0,
        negativeEquity: 0,
        taxAlreadyCollected: 0,
        grossCapCost: 30000,
        capReductionCash: 0,
        capReductionTradeIn: 0,
        capReductionRebateManufacturer: 2000,
        capReductionRebateDealer: 0,
        basePayment: 420,
        paymentCount: 36,
        rates: [{ label: "STATE", rate: 0.07 }],
      };

      const result = calculateTax(input, MONTHLY_STATE);

      expect(result.debug.appliedRebatesNonTaxable).toBe(2000);
      expect(result.bases.vehicleBase).toBe(28000); // 30000 - 2000
    });

    it("should keep backend products non-taxable on leases", () => {
      const input: TaxCalculationInput = {
        stateCode: "XX",
        asOfDate: "2025-01-15",
        dealType: "LEASE",
        vehiclePrice: 30000,
        accessoriesAmount: 0,
        tradeInValue: 0,
        rebateManufacturer: 0,
        rebateDealer: 0,
        docFee: 200,
        otherFees: [],
        serviceContracts: 2000,
        gap: 800,
        negativeEquity: 0,
        taxAlreadyCollected: 0,
        grossCapCost: 30000,
        capReductionCash: 0,
        capReductionTradeIn: 0,
        capReductionRebateManufacturer: 0,
        capReductionRebateDealer: 0,
        basePayment: 450,
        paymentCount: 36,
        rates: [{ label: "STATE", rate: 0.07 }],
      };

      const result = calculateTax(input, MONTHLY_STATE);

      // Service contracts and GAP should be non-taxable on leases
      expect(result.debug.taxableServiceContracts).toBe(0);
      expect(result.debug.taxableGap).toBe(0);
    });

    it("should handle negative equity on leases", () => {
      const input: TaxCalculationInput = {
        stateCode: "XX",
        asOfDate: "2025-01-15",
        dealType: "LEASE",
        vehiclePrice: 30000,
        accessoriesAmount: 0,
        tradeInValue: 0,
        rebateManufacturer: 0,
        rebateDealer: 0,
        docFee: 200,
        otherFees: [],
        serviceContracts: 0,
        gap: 0,
        negativeEquity: 2000,
        taxAlreadyCollected: 0,
        grossCapCost: 30000,
        capReductionCash: 0,
        capReductionTradeIn: 0,
        capReductionRebateManufacturer: 0,
        capReductionRebateDealer: 0,
        basePayment: 480,
        paymentCount: 36,
        rates: [{ label: "STATE", rate: 0.07 }],
      };

      const result = calculateTax(input, MONTHLY_STATE);

      // Negative equity should be added to base
      expect(result.bases.vehicleBase).toBe(32000); // 30000 + 2000
    });
  });

  describe("FULL_UPFRONT Lease Taxation", () => {
    const UPFRONT_STATE: TaxRulesConfig = {
      ...MONTHLY_STATE,
      leaseRules: {
        ...MONTHLY_STATE.leaseRules,
        method: "FULL_UPFRONT",
      },
    };

    it("should calculate upfront lease tax correctly", () => {
      const input: TaxCalculationInput = {
        stateCode: "XX",
        asOfDate: "2025-01-15",
        dealType: "LEASE",
        vehiclePrice: 30000,
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
        grossCapCost: 30000,
        capReductionCash: 3000,
        capReductionTradeIn: 0,
        capReductionRebateManufacturer: 0,
        capReductionRebateDealer: 0,
        basePayment: 450,
        paymentCount: 36,
        rates: [{ label: "STATE", rate: 0.07 }],
      };

      const result = calculateTax(input, UPFRONT_STATE);

      expect(result.mode).toBe("LEASE");
      expect(result.leaseBreakdown).toBeDefined();

      // All tax should be upfront
      expect(result.leaseBreakdown?.upfrontTaxableBase).toBeGreaterThan(0);
      expect(result.leaseBreakdown?.paymentTaxableBasePerPeriod).toBe(0);
      expect(result.leaseBreakdown?.paymentTaxesPerPeriod.totalTax).toBe(0);

      // Total tax should equal upfront tax
      expect(result.leaseBreakdown?.totalTaxOverTerm).toBe(
        result.leaseBreakdown?.upfrontTaxes.totalTax
      );
    });
  });

  describe("HYBRID Lease Taxation", () => {
    const HYBRID_STATE: TaxRulesConfig = {
      ...MONTHLY_STATE,
      leaseRules: {
        ...MONTHLY_STATE.leaseRules,
        method: "HYBRID",
      },
    };

    it("should calculate hybrid lease tax correctly", () => {
      const input: TaxCalculationInput = {
        stateCode: "XX",
        asOfDate: "2025-01-15",
        dealType: "LEASE",
        vehiclePrice: 30000,
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
        grossCapCost: 30000,
        capReductionCash: 3000,
        capReductionTradeIn: 0,
        capReductionRebateManufacturer: 0,
        capReductionRebateDealer: 0,
        basePayment: 450,
        paymentCount: 36,
        rates: [{ label: "STATE", rate: 0.07 }],
      };

      const result = calculateTax(input, HYBRID_STATE);

      expect(result.mode).toBe("LEASE");
      expect(result.leaseBreakdown).toBeDefined();

      // Should have both upfront and monthly components
      expect(result.leaseBreakdown?.upfrontTaxableBase).toBeGreaterThan(0);
      expect(result.leaseBreakdown?.paymentTaxableBasePerPeriod).toBeGreaterThan(0);

      // Total should be sum of upfront + monthly
      const expectedTotal =
        result.leaseBreakdown!.upfrontTaxes.totalTax +
        result.leaseBreakdown!.paymentTaxesPerPeriod.totalTax * input.paymentCount;
      expect(result.leaseBreakdown?.totalTaxOverTerm).toBe(expectedTotal);
    });
  });

  describe("Complex Lease Scenarios", () => {
    it("should handle complex lease with all components", () => {
      const input: TaxCalculationInput = {
        stateCode: "XX",
        asOfDate: "2025-01-15",
        dealType: "LEASE",
        vehiclePrice: 35000,
        accessoriesAmount: 0,
        tradeInValue: 8000,
        rebateManufacturer: 2000,
        rebateDealer: 500,
        docFee: 200,
        otherFees: [
          { code: "TITLE", amount: 31 },
          { code: "REG", amount: 50 },
        ],
        serviceContracts: 2500,
        gap: 800,
        negativeEquity: 1500,
        taxAlreadyCollected: 0,
        grossCapCost: 35000,
        capReductionCash: 3000,
        capReductionTradeIn: 8000,
        capReductionRebateManufacturer: 2000,
        capReductionRebateDealer: 500,
        basePayment: 425,
        paymentCount: 36,
        rates: [
          { label: "STATE", rate: 0.06 },
          { label: "COUNTY", rate: 0.01 },
        ],
      };

      const result = calculateTax(input, MONTHLY_STATE);

      expect(result.mode).toBe("LEASE");
      expect(result.leaseBreakdown).toBeDefined();

      // Verify trade-in and rebates were applied
      expect(result.debug.appliedTradeIn).toBe(8000);
      expect(result.debug.appliedRebatesNonTaxable).toBeGreaterThan(0);

      // Verify upfront tax (doc fee)
      expect(result.leaseBreakdown?.upfrontTaxes.totalTax).toBeGreaterThan(0);

      // Verify monthly tax (on payment)
      expect(result.leaseBreakdown?.paymentTaxesPerPeriod.totalTax).toBeGreaterThan(0);

      // Verify total tax over term
      expect(result.leaseBreakdown?.totalTaxOverTerm).toBeGreaterThan(0);
    });
  });
});
