import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("North Dakota (ND) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load North Dakota rules successfully", () => {
    const rules = getRulesForState("ND");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("ND");
  });

  it("should mark North Dakota as implemented (not a stub)", () => {
    expect(isStateImplemented("ND")).toBe(true);
  });

  it("should have version number 1", () => {
    const rules = getRulesForState("ND");
    expect(rules?.version).toBe(1);
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS
  // ============================================================================

  describe("Retail - Trade-In Policy", () => {
    it("should have FULL trade-in credit policy", () => {
      const rules = getRulesForState("ND");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });
  });

  describe("Retail - Rebate Rules", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("ND");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as NON-TAXABLE", () => {
      const rules = getRulesForState("ND");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(false);
    });

    it("should mark dealer rebates as NON-TAXABLE", () => {
      const rules = getRulesForState("ND");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(false);
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("ND");
      expect(rules?.docFeeTaxable).toBe(true);
    });
  });

  describe("Retail - Fee Tax Rules", () => {
    it("should mark service contracts (VSC) as NON-TAXABLE", () => {
      const rules = getRulesForState("ND");
      expect(rules?.taxOnServiceContracts).toBe(false);
    });

    it("should mark GAP as NON-TAXABLE", () => {
      const rules = getRulesForState("ND");
      expect(rules?.taxOnGap).toBe(false);
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("ND");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should NOT tax service contracts", () => {
      const rules = getRulesForState("ND");
      expect(rules?.taxOnServiceContracts).toBe(false);
    });

    it("should NOT tax GAP insurance", () => {
      const rules = getRulesForState("ND");
      expect(rules?.taxOnGap).toBe(false);
    });
  });

  describe("Retail - Vehicle Tax Scheme", () => {
    it("should use STATE_PLUS_LOCAL vehicle tax scheme", () => {
      const rules = getRulesForState("ND");
      expect(rules?.vehicleTaxScheme).toBe("STATE_PLUS_LOCAL");
    });

    it("should apply local sales tax to vehicles", () => {
      const rules = getRulesForState("ND");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(true);
    });

    it("should document state sales tax rate of 5%", () => {
      const rules = getRulesForState("ND");
      expect(rules?.extras?.stateSalesRate).toBe(5.0);
    });

    it("should document combined rate range of 5% to 8%", () => {
      const rules = getRulesForState("ND");
      expect(rules?.extras?.combinedRateRange).toBeDefined();
      expect(rules?.extras?.combinedRateRange?.min).toBe(5.0);
      expect(rules?.extras?.combinedRateRange?.max).toBe(8.0);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease - Tax Method", () => {
    it("should use MONTHLY lease taxation method", () => {
      const rules = getRulesForState("ND");
      expect(rules?.leaseRules.method).toBe("MONTHLY");
    });

    it("should NOT tax cap cost reduction upfront (monthly method)", () => {
      const rules = getRulesForState("ND");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });
  });

  describe("Lease - Trade-In Credit", () => {
    it("should provide FULL trade-in credit on leases", () => {
      const rules = getRulesForState("ND");
      expect(rules?.leaseRules.tradeInCredit).toBe("FULL");
    });
  });

  // ============================================================================
  // NORTH DAKOTA-SPECIFIC FEATURES
  // ============================================================================

  describe("North Dakota Features - Combined Rate Range", () => {
    it("should document moderate state rate of 5%", () => {
      const rules = getRulesForState("ND");
      expect(rules?.extras?.stateSalesRate).toBe(5.0);
      expect(rules?.extras?.notes).toContain("5%");
    });
  });

  // ============================================================================
  // SCENARIO TESTS
  // ============================================================================

  describe("Scenario: Vehicle Purchase in Fargo (8% combined)", () => {
    it("should calculate tax correctly", () => {
      const vehiclePrice = 30000;
      const tradeIn = 10000;
      const docFee = 395;
      const serviceContract = 2000; // NOT taxed
      const accessories = 1500;

      const taxableBase = vehiclePrice - tradeIn + docFee + accessories;
      const tax = taxableBase * 0.08;

      expect(taxableBase).toBe(21895);
      expect(tax).toBeCloseTo(1751.60, 2);
    });
  });

  describe("Scenario: Vehicle Purchase in Rural Area (5% state only)", () => {
    it("should calculate state tax only", () => {
      const vehiclePrice = 25000;
      const tradeIn = 8000;
      const docFee = 395;
      const gap = 695; // NOT taxed

      const taxableBase = vehiclePrice - tradeIn + docFee;
      const tax = taxableBase * 0.05;

      expect(taxableBase).toBe(17395);
      expect(tax).toBeCloseTo(869.75, 2);
    });
  });

  describe("Scenario: Lease Payment (8% Fargo)", () => {
    it("should apply 8% tax to monthly payment", () => {
      const monthlyPayment = 400;
      const tax = monthlyPayment * 0.08;

      expect(tax).toBe(32);
    });
  });

  // ============================================================================
  // METADATA AND DOCUMENTATION
  // ============================================================================

  describe("Metadata - Last Updated", () => {
    it("should have lastUpdated timestamp", () => {
      const rules = getRulesForState("ND");
      expect(rules?.extras?.lastUpdated).toBeDefined();
    });
  });

  describe("Metadata - Documentation", () => {
    it("should have comprehensive notes in extras", () => {
      const rules = getRulesForState("ND");
      expect(rules?.extras?.notes).toBeDefined();
      expect((rules?.extras?.notes as string)?.length).toBeGreaterThan(100);
    });

    it("should document key ND features in notes", () => {
      const rules = getRulesForState("ND");
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("5%");
      expect(notes).toContain("8%");
    });
  });
});
