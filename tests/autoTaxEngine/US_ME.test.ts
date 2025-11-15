import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Maine (ME) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load Maine rules successfully", () => {
    const rules = getRulesForState("ME");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("ME");
  });

  it("should mark Maine as implemented (not a stub)", () => {
    expect(isStateImplemented("ME")).toBe(true);
  });

  it("should have version number 2", () => {
    const rules = getRulesForState("ME");
    expect(rules?.version).toBe(2);
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS
  // ============================================================================

  describe("Retail - Trade-In Policy", () => {
    it("should have FULL trade-in credit policy", () => {
      const rules = getRulesForState("ME");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });
  });

  describe("Retail - Rebate Rules", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("ME");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as NON-TAXABLE", () => {
      const rules = getRulesForState("ME");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(false);
    });

    it("should mark dealer rebates as NON-TAXABLE", () => {
      const rules = getRulesForState("ME");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(false);
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("ME");
      expect(rules?.docFeeTaxable).toBe(true);
    });
  });

  describe("Retail - Fee Tax Rules", () => {
    it("should mark service contracts (VSC) as TAXABLE (unique to ME)", () => {
      const rules = getRulesForState("ME");
      expect(rules?.taxOnServiceContracts).toBe(true);
    });

    it("should mark GAP as NON-TAXABLE", () => {
      const rules = getRulesForState("ME");
      expect(rules?.taxOnGap).toBe(false);
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("ME");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should TAX service contracts (unique feature)", () => {
      const rules = getRulesForState("ME");
      expect(rules?.taxOnServiceContracts).toBe(true);
    });

    it("should NOT tax GAP insurance", () => {
      const rules = getRulesForState("ME");
      expect(rules?.taxOnGap).toBe(false);
    });
  });

  describe("Retail - Vehicle Tax Scheme", () => {
    it("should use STATE_ONLY vehicle tax scheme", () => {
      const rules = getRulesForState("ME");
      expect(rules?.vehicleTaxScheme).toBe("STATE_ONLY");
    });

    it("should NOT apply local sales tax to vehicles", () => {
      const rules = getRulesForState("ME");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
    });

    it("should document state sales tax rate of 5.5%", () => {
      const rules = getRulesForState("ME");
      expect(rules?.extras?.stateSalesRate).toBe(5.5);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease - Tax Method", () => {
    it("should use MONTHLY lease taxation method (new rules as of Jan 1, 2025)", () => {
      const rules = getRulesForState("ME");
      expect(rules?.leaseRules.method).toBe("MONTHLY");
    });

    it("should NOT tax cap cost reduction upfront (monthly method)", () => {
      const rules = getRulesForState("ME");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });

    it("should document lease tax change effective Jan 1, 2025", () => {
      const rules = getRulesForState("ME");
      expect(rules?.leaseRules.notes).toContain("Jan");
      expect(rules?.leaseRules.notes).toContain("2025");
    });
  });

  describe("Lease - Trade-In Credit", () => {
    it("should provide FULL trade-in credit on leases", () => {
      const rules = getRulesForState("ME");
      expect(rules?.leaseRules.tradeInCredit).toBe("FULL");
    });
  });

  // ============================================================================
  // MAINE-SPECIFIC FEATURES
  // ============================================================================

  describe("Maine Unique Features - Service Contracts TAXABLE", () => {
    it("should document that ME taxes service contracts (unlike most states)", () => {
      const rules = getRulesForState("ME");
      expect(rules?.taxOnServiceContracts).toBe(true);
      expect(rules?.extras?.notes).toContain("Service contracts");
      expect(rules?.extras?.notes).toContain("TAXABLE");
    });
  });

  describe("Maine Unique Features - Lease Tax Change", () => {
    it("should document transition from upfront to monthly (Jan 1, 2025)", () => {
      const rules = getRulesForState("ME");
      expect(rules?.version).toBe(2);
      expect(rules?.extras?.notes).toContain("Jan");
      expect(rules?.extras?.notes).toContain("2025");
      expect(rules?.extras?.notes).toContain("MONTHLY");
    });
  });

  describe("Maine Features - Two Lease Rates", () => {
    it("should document 5% long-term and 10% short-term rates", () => {
      const rules = getRulesForState("ME");
      expect(rules?.extras?.notes).toContain("5%");
      expect(rules?.extras?.notes).toContain("10%");
      expect(rules?.extras?.notes).toContain("short-term");
    });
  });

  // ============================================================================
  // SCENARIO TESTS
  // ============================================================================

  describe("Scenario: Standard Purchase with VSC TAXED", () => {
    it("should tax service contract at 5.5%", () => {
      const vehiclePrice = 30000;
      const tradeIn = 10000;
      const docFee = 410;
      const serviceContract = 2000; // TAXABLE in Maine
      const gap = 695; // NOT taxed
      const accessories = 1500;

      const taxableBase = vehiclePrice - tradeIn + docFee + serviceContract + accessories;
      const tax = taxableBase * 0.055;

      expect(taxableBase).toBe(23910);
      expect(tax).toBeCloseTo(1315.05, 2);
    });
  });

  describe("Scenario: Purchase with Manufacturer Rebate", () => {
    it("should reduce tax base with rebate", () => {
      const vehiclePrice = 35000;
      const mfrRebate = 3000;
      const tradeIn = 12000;
      const docFee = 410;
      const extendedWarranty = 2500; // TAXABLE

      const priceAfterRebate = vehiclePrice - mfrRebate;
      const taxableBase = priceAfterRebate - tradeIn + docFee + extendedWarranty;
      const tax = taxableBase * 0.055;

      expect(priceAfterRebate).toBe(32000);
      expect(taxableBase).toBe(22910);
      expect(tax).toBeCloseTo(1260.05, 2);
    });
  });

  describe("Scenario: Lease Payment at 5% (long-term lease)", () => {
    it("should apply 5% tax to monthly payment for long-term lease", () => {
      const monthlyPayment = 450;
      const tax = monthlyPayment * 0.05;

      expect(tax).toBeCloseTo(22.50, 2);
    });
  });

  describe("Scenario: Short-Term Rental at 10%", () => {
    it("should apply 10% tax to short-term rental payment", () => {
      const dailyRate = 100;
      const tax = dailyRate * 0.10;

      expect(tax).toBe(10);
    });
  });

  describe("Scenario: VSC Tax Cost Impact", () => {
    it("should calculate additional tax burden from taxing VSC", () => {
      const vscCost = 2000;
      const additionalTax = vscCost * 0.055;

      expect(additionalTax).toBe(110);
    });
  });

  // ============================================================================
  // METADATA AND DOCUMENTATION
  // ============================================================================

  describe("Metadata - Last Updated", () => {
    it("should have lastUpdated timestamp", () => {
      const rules = getRulesForState("ME");
      expect(rules?.extras?.lastUpdated).toBeDefined();
    });
  });

  describe("Metadata - Documentation", () => {
    it("should have comprehensive notes in extras", () => {
      const rules = getRulesForState("ME");
      expect(rules?.extras?.notes).toBeDefined();
      expect((rules?.extras?.notes as string)?.length).toBeGreaterThan(100);
    });

    it("should document key ME features in notes", () => {
      const rules = getRulesForState("ME");
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("5.5%");
      expect(notes).toContain("Service contracts");
      expect(notes).toContain("TAXABLE");
      expect(notes).toContain("2025");
    });
  });
});
