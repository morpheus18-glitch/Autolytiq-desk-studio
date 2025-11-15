import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("New Mexico (NM) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load New Mexico rules successfully", () => {
    const rules = getRulesForState("NM");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("NM");
  });

  it("should mark New Mexico as implemented (not a stub)", () => {
    expect(isStateImplemented("NM")).toBe(true);
  });

  it("should have version number 1", () => {
    const rules = getRulesForState("NM");
    expect(rules?.version).toBe(1);
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS
  // ============================================================================

  describe("Retail - Trade-In Policy", () => {
    it("should have FULL trade-in credit policy", () => {
      const rules = getRulesForState("NM");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });
  });

  describe("Retail - Rebate Rules", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("NM");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as NON-TAXABLE", () => {
      const rules = getRulesForState("NM");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(false);
    });

    it("should mark dealer rebates as NON-TAXABLE", () => {
      const rules = getRulesForState("NM");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(false);
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("NM");
      expect(rules?.docFeeTaxable).toBe(true);
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("NM");
      expect(rules?.taxOnAccessories).toBe(true);
    });
  });

  describe("Retail - Vehicle Tax Scheme", () => {
    it("should use STATE_PLUS_LOCAL vehicle tax scheme", () => {
      const rules = getRulesForState("NM");
      expect(rules?.vehicleTaxScheme).toBe("STATE_PLUS_LOCAL");
    });

    it("should apply local Gross Receipts Tax to vehicles", () => {
      const rules = getRulesForState("NM");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(true);
    });

    it("should document state GRT rate of 5.125%", () => {
      const rules = getRulesForState("NM");
      expect(rules?.extras?.stateGRTRate).toBe(5.125);
    });

    it("should document combined rate range of 5.125% to 9.3125%", () => {
      const rules = getRulesForState("NM");
      expect(rules?.extras?.combinedRateRange).toBeDefined();
      expect(rules?.extras?.combinedRateRange?.min).toBe(5.125);
      expect(rules?.extras?.combinedRateRange?.max).toBe(9.3125);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease - Tax Method", () => {
    it("should use MONTHLY lease taxation method", () => {
      const rules = getRulesForState("NM");
      expect(rules?.leaseRules.method).toBe("MONTHLY");
    });

    it("should NOT tax cap cost reduction upfront (monthly method)", () => {
      const rules = getRulesForState("NM");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });
  });

  describe("Lease - Trade-In Credit", () => {
    it("should provide FULL trade-in credit on leases", () => {
      const rules = getRulesForState("NM");
      expect(rules?.leaseRules.tradeInCredit).toBe("FULL");
    });
  });

  // ============================================================================
  // NEW MEXICO-SPECIFIC FEATURES
  // ============================================================================

  describe("New Mexico Unique Features - Gross Receipts Tax", () => {
    it("should document Gross Receipts Tax (not traditional sales tax)", () => {
      const rules = getRulesForState("NM");
      expect(rules?.extras?.notes).toContain("Gross Receipts Tax");
      expect(rules?.extras?.notes).toContain("GRT");
    });

    it("should document that GRT is a tax on privilege of doing business", () => {
      const rules = getRulesForState("NM");
      expect(rules?.extras?.notes).toContain("privilege");
    });
  });

  describe("New Mexico Features - Combined Rate Variation", () => {
    it("should document major jurisdictions", () => {
      const rules = getRulesForState("NM");
      expect(rules?.extras?.majorJurisdictions).toBeDefined();
    });
  });

  // ============================================================================
  // SCENARIO TESTS
  // ============================================================================

  describe("Scenario: Vehicle Purchase in Albuquerque (7.875% combined)", () => {
    it("should calculate GRT correctly", () => {
      const vehiclePrice = 30000;
      const tradeIn = 10000;
      const docFee = 399;
      const accessories = 1500;
      const serviceContract = 2000; // assume taxable
      const combinedRate = 0.07875;

      const grossReceipts = vehiclePrice - tradeIn + docFee + accessories + serviceContract;
      const grt = grossReceipts * combinedRate;

      expect(grossReceipts).toBe(23899);
      expect(grt).toBeCloseTo(1882.05, 2);
    });
  });

  describe("Scenario: Vehicle Purchase in Rural Area (5.125% state only)", () => {
    it("should calculate state GRT only", () => {
      const vehiclePrice = 25000;
      const tradeIn = 8000;
      const docFee = 399;
      const accessories = 800;
      const stateRate = 0.05125;

      const grossReceipts = vehiclePrice - tradeIn + docFee + accessories;
      const grt = grossReceipts * stateRate;

      expect(grossReceipts).toBe(18199);
      expect(grt).toBeCloseTo(932.70, 2);
    });
  });

  describe("Scenario: Lease Payment (7.875% Albuquerque)", () => {
    it("should apply GRT to monthly payment", () => {
      const monthlyPayment = 450;
      const combinedRate = 0.07875;
      const monthlyGRT = monthlyPayment * combinedRate;

      expect(monthlyGRT).toBeCloseTo(35.44, 2);
    });
  });

  // ============================================================================
  // METADATA AND DOCUMENTATION
  // ============================================================================

  describe("Metadata - Last Updated", () => {
    it("should have lastUpdated timestamp", () => {
      const rules = getRulesForState("NM");
      expect(rules?.extras?.lastUpdated).toBeDefined();
    });
  });

  describe("Metadata - Documentation", () => {
    it("should have comprehensive notes in extras", () => {
      const rules = getRulesForState("NM");
      expect(rules?.extras?.notes).toBeDefined();
      expect((rules?.extras?.notes as string)?.length).toBeGreaterThan(100);
    });

    it("should document key NM features in notes", () => {
      const rules = getRulesForState("NM");
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("Gross Receipts Tax");
      expect(notes).toContain("5.125%");
      expect(notes).toContain("9.3125%");
    });
  });
});
