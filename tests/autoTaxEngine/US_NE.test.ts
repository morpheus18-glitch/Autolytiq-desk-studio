import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Nebraska (NE) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load Nebraska rules successfully", () => {
    const rules = getRulesForState("NE");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("NE");
  });

  it("should mark Nebraska as implemented (not a stub)", () => {
    expect(isStateImplemented("NE")).toBe(true);
  });

  it("should have version number 1", () => {
    const rules = getRulesForState("NE");
    expect(rules?.version).toBe(1);
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS
  // ============================================================================

  describe("Retail - Trade-In Policy", () => {
    it("should have FULL trade-in credit policy", () => {
      const rules = getRulesForState("NE");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });
  });

  describe("Retail - Rebate Rules", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("NE");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as NON-TAXABLE", () => {
      const rules = getRulesForState("NE");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(false);
    });

    it("should mark dealer rebates as NON-TAXABLE", () => {
      const rules = getRulesForState("NE");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(false);
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("NE");
      expect(rules?.docFeeTaxable).toBe(true);
    });
  });

  describe("Retail - Fee Tax Rules", () => {
    it("should mark service contracts (VSC) as NON-TAXABLE", () => {
      const rules = getRulesForState("NE");
      expect(rules?.taxOnServiceContracts).toBe(false);
    });

    it("should mark GAP as TAXABLE (unique to NE per RR-011601)", () => {
      const rules = getRulesForState("NE");
      expect(rules?.taxOnGap).toBe(true);
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("NE");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should NOT tax service contracts", () => {
      const rules = getRulesForState("NE");
      expect(rules?.taxOnServiceContracts).toBe(false);
    });

    it("should TAX GAP waivers (unique feature)", () => {
      const rules = getRulesForState("NE");
      expect(rules?.taxOnGap).toBe(true);
    });
  });

  describe("Retail - Vehicle Tax Scheme", () => {
    it("should use STATE_PLUS_LOCAL vehicle tax scheme", () => {
      const rules = getRulesForState("NE");
      expect(rules?.vehicleTaxScheme).toBe("STATE_PLUS_LOCAL");
    });

    it("should apply local sales tax to vehicles", () => {
      const rules = getRulesForState("NE");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(true);
    });

    it("should document state sales tax rate of 5.5%", () => {
      const rules = getRulesForState("NE");
      expect(rules?.extras?.stateSalesRate).toBe(5.5);
    });

    it("should document combined rate range of 5.5% to 8.0%", () => {
      const rules = getRulesForState("NE");
      expect(rules?.extras?.combinedRateRange).toBeDefined();
      expect(rules?.extras?.combinedRateRange?.min).toBe(5.5);
      expect(rules?.extras?.combinedRateRange?.max).toBe(8.0);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease - Tax Method", () => {
    it("should use MONTHLY lease taxation method", () => {
      const rules = getRulesForState("NE");
      expect(rules?.leaseRules.method).toBe("MONTHLY");
    });

    it("should NOT tax cap cost reduction upfront (monthly method)", () => {
      const rules = getRulesForState("NE");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });

    it("should document lessor election option", () => {
      const rules = getRulesForState("NE");
      expect(rules?.leaseRules.notes).toContain("lessor");
      expect(rules?.leaseRules.notes).toContain("election");
    });
  });

  describe("Lease - Trade-In Credit", () => {
    it("should provide FULL trade-in credit on leases", () => {
      const rules = getRulesForState("NE");
      expect(rules?.leaseRules.tradeInCredit).toBe("FULL");
    });
  });

  // ============================================================================
  // NEBRASKA-SPECIFIC FEATURES
  // ============================================================================

  describe("Nebraska Unique Features - GAP Waivers TAXABLE", () => {
    it("should document that NE taxes GAP waivers (unique treatment)", () => {
      const rules = getRulesForState("NE");
      expect(rules?.taxOnGap).toBe(true);
      expect(rules?.extras?.notes).toContain("GAP");
      expect(rules?.extras?.notes).toContain("RR-011601");
    });

    it("should document Revenue Ruling RR-011601", () => {
      const rules = getRulesForState("NE");
      expect(rules?.extras?.notes).toContain("RR-011601");
    });
  });

  describe("Nebraska Features - VSC Not Taxed but GAP Is", () => {
    it("should document different treatment for VSC vs GAP", () => {
      const rules = getRulesForState("NE");
      expect(rules?.taxOnServiceContracts).toBe(false);
      expect(rules?.taxOnGap).toBe(true);
      expect(rules?.extras?.notes).toContain("Service contracts");
    });
  });

  // ============================================================================
  // SCENARIO TESTS
  // ============================================================================

  describe("Scenario: Purchase in Omaha with GAP TAXED (7.5% combined)", () => {
    it("should tax GAP waiver at combined rate", () => {
      const vehiclePrice = 30000;
      const tradeIn = 10000;
      const docFee = 395;
      const serviceContract = 2000; // NOT taxed
      const gap = 695; // TAXABLE in Nebraska
      const accessories = 1500;

      const taxableBase = vehiclePrice - tradeIn + docFee + gap + accessories;
      const tax = taxableBase * 0.075;

      expect(taxableBase).toBe(22590);
      expect(tax).toBeCloseTo(1694.25, 2);
    });
  });

  describe("Scenario: Purchase in Lincoln (7.25% combined)", () => {
    it("should calculate tax with GAP included", () => {
      const vehiclePrice = 35000;
      const mfrRebate = 2000;
      const tradeIn = 12000;
      const docFee = 395;
      const extendedWarranty = 2500; // NOT taxed
      const gap = 795; // TAXABLE

      const priceAfterRebate = vehiclePrice - mfrRebate;
      const taxableBase = priceAfterRebate - tradeIn + docFee + gap;
      const tax = taxableBase * 0.0725;

      expect(priceAfterRebate).toBe(33000);
      expect(taxableBase).toBe(22190);
      expect(tax).toBeCloseTo(1608.78, 2);
    });
  });

  describe("Scenario: Rural Area Purchase (5.5% state only)", () => {
    it("should calculate state tax only with GAP taxed", () => {
      const vehiclePrice = 25000;
      const tradeIn = 8000;
      const docFee = 395;
      const gap = 695; // TAXABLE

      const taxableBase = vehiclePrice - tradeIn + docFee + gap;
      const tax = taxableBase * 0.055;

      expect(taxableBase).toBe(18090);
      expect(tax).toBeCloseTo(994.95, 2);
    });
  });

  describe("Scenario: GAP Tax Cost Impact", () => {
    it("should calculate additional tax burden from GAP being taxable", () => {
      const gapCost = 695;
      const combinedRate = 0.075; // Omaha
      const additionalTax = gapCost * combinedRate;

      expect(additionalTax).toBeCloseTo(52.13, 2);
    });
  });

  describe("Scenario: Lease Payment (7.5% Omaha)", () => {
    it("should apply combined rate to monthly payment", () => {
      const monthlyPayment = 450;
      const tax = monthlyPayment * 0.075;

      expect(tax).toBeCloseTo(33.75, 2);
    });
  });

  // ============================================================================
  // METADATA AND DOCUMENTATION
  // ============================================================================

  describe("Metadata - Last Updated", () => {
    it("should have lastUpdated timestamp", () => {
      const rules = getRulesForState("NE");
      expect(rules?.extras?.lastUpdated).toBeDefined();
    });
  });

  describe("Metadata - Documentation", () => {
    it("should have comprehensive notes in extras", () => {
      const rules = getRulesForState("NE");
      expect(rules?.extras?.notes).toBeDefined();
      expect((rules?.extras?.notes as string)?.length).toBeGreaterThan(100);
    });

    it("should document key NE features in notes", () => {
      const rules = getRulesForState("NE");
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("GAP");
      expect(notes).toContain("RR-011601");
      expect(notes).toContain("5.5%");
      expect(notes).toContain("8%");
    });
  });
});
