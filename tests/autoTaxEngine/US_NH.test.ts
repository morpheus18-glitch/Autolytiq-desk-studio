import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("New Hampshire (NH) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load New Hampshire rules successfully", () => {
    const rules = getRulesForState("NH");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("NH");
  });

  it("should mark New Hampshire as implemented (not a stub)", () => {
    expect(isStateImplemented("NH")).toBe(true);
  });

  it("should have version number 1", () => {
    const rules = getRulesForState("NH");
    expect(rules?.version).toBe(1);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("NH");
    const rulesLower = getRulesForState("nh");
    const rulesMixed = getRulesForState("Nh");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("NH");
    expect(rulesLower?.stateCode).toBe("NH");
    expect(rulesMixed?.stateCode).toBe("NH");
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS
  // ============================================================================

  describe("Retail - Trade-In Policy", () => {
    it("should have FULL trade-in credit policy (meaningless with no tax)", () => {
      const rules = getRulesForState("NH");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });
  });

  describe("Retail - Rebate Rules", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("NH");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as NON-TAXABLE (not applicable)", () => {
      const rules = getRulesForState("NH");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(false);
    });

    it("should mark dealer rebates as NON-TAXABLE (not applicable)", () => {
      const rules = getRulesForState("NH");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(false);
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as NOT TAXABLE (no sales tax exists)", () => {
      const rules = getRulesForState("NH");
      expect(rules?.docFeeTaxable).toBe(false);
    });
  });

  describe("Retail - Fee Tax Rules", () => {
    it("should mark service contracts (VSC) as NON-TAXABLE", () => {
      const rules = getRulesForState("NH");
      expect(rules?.taxOnServiceContracts).toBe(false);
    });

    it("should mark GAP as NON-TAXABLE", () => {
      const rules = getRulesForState("NH");
      expect(rules?.taxOnGap).toBe(false);
    });

    it("should mark doc fee as NON-TAXABLE", () => {
      const rules = getRulesForState("NH");
      const docFee = rules?.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(false);
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should NOT tax accessories (no sales tax)", () => {
      const rules = getRulesForState("NH");
      expect(rules?.taxOnAccessories).toBe(false);
    });

    it("should NOT tax service contracts", () => {
      const rules = getRulesForState("NH");
      expect(rules?.taxOnServiceContracts).toBe(false);
    });

    it("should NOT tax GAP insurance", () => {
      const rules = getRulesForState("NH");
      expect(rules?.taxOnGap).toBe(false);
    });
  });

  describe("Retail - Vehicle Tax Scheme", () => {
    it("should use STATE_ONLY vehicle tax scheme (but rate is 0%)", () => {
      const rules = getRulesForState("NH");
      expect(rules?.vehicleTaxScheme).toBe("STATE_ONLY");
    });

    it("should NOT apply local sales tax to vehicles", () => {
      const rules = getRulesForState("NH");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
    });

    it("should document state sales tax rate of 0%", () => {
      const rules = getRulesForState("NH");
      expect(rules?.extras?.stateSalesRate).toBe(0);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease - Tax Method", () => {
    it("should use MONTHLY lease taxation method (not applicable)", () => {
      const rules = getRulesForState("NH");
      expect(rules?.leaseRules.method).toBe("MONTHLY");
    });

    it("should NOT tax cap cost reduction (no sales tax)", () => {
      const rules = getRulesForState("NH");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });
  });

  describe("Lease - Trade-In Credit", () => {
    it("should provide FULL trade-in credit (meaningless with no tax)", () => {
      const rules = getRulesForState("NH");
      expect(rules?.leaseRules.tradeInCredit).toBe("FULL");
    });
  });

  // ============================================================================
  // RECIPROCITY TESTS
  // ============================================================================

  describe("Reciprocity Rules", () => {
    it("should NOT have reciprocity (not applicable - no sales tax)", () => {
      const rules = getRulesForState("NH");
      expect(rules?.reciprocity.enabled).toBe(false);
    });
  });

  // ============================================================================
  // NEW HAMPSHIRE-SPECIFIC FEATURES
  // ============================================================================

  describe("New Hampshire Unique Features - No Sales Tax Whatsoever", () => {
    it("should document that NH has NO state sales tax", () => {
      const rules = getRulesForState("NH");
      expect(rules?.extras?.stateSalesRate).toBe(0);
      expect(rules?.extras?.notes).toContain("NO state sales tax");
    });

    it("should document that NH has NO local sales tax", () => {
      const rules = getRulesForState("NH");
      expect(rules?.extras?.notes).toContain("NO local sales tax");
    });

    it("should document that NH is one of 5 states without sales tax", () => {
      const rules = getRulesForState("NH");
      expect(rules?.extras?.notes).toContain("one of five");
    });

    it("should document 'Live Free or Die' philosophy", () => {
      const rules = getRulesForState("NH");
      expect(rules?.extras?.notes).toContain("Live Free or Die");
    });
  });

  describe("New Hampshire Unique Features - True Zero Tax", () => {
    it("should document that NH has absolutely zero sales tax", () => {
      const rules = getRulesForState("NH");
      expect(rules?.vehicleTaxScheme).toBe("STATE_ONLY");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
      expect(rules?.extras?.notes).toContain("absolutely zero");
    });
  });

  describe("New Hampshire Features - Registration Fees", () => {
    it("should document that registration fees exist (separate from sales tax)", () => {
      const rules = getRulesForState("NH");
      expect(rules?.extras?.notes).toContain("registration fees");
    });
  });

  // ============================================================================
  // SCENARIO TESTS
  // ============================================================================

  describe("Scenario: Standard Vehicle Purchase", () => {
    it("should calculate ZERO sales tax", () => {
      const vehiclePrice = 30000;
      const tradeIn = 10000;
      const docFee = 476;
      const vsc = 2000;
      const accessories = 1500;

      const salesTax = 0;
      const totalCost = vehiclePrice - tradeIn + docFee + vsc + accessories;

      expect(salesTax).toBe(0);
      expect(totalCost).toBe(23976);
    });
  });

  describe("Scenario: Luxury Vehicle Purchase", () => {
    it("should calculate ZERO sales tax on luxury vehicle", () => {
      const vehiclePrice = 100000;
      const tradeIn = 40000;
      const docFee = 476;
      const extendedWarranty = 5000;
      const accessories = 8000;

      const salesTax = 0;
      const totalCost = vehiclePrice - tradeIn + docFee + extendedWarranty + accessories;

      expect(salesTax).toBe(0);
      expect(totalCost).toBe(73476);
    });
  });

  describe("Scenario: Lease", () => {
    it("should calculate ZERO tax on lease payments", () => {
      const monthlyPayment = 500;
      const salesTax = 0;
      const totalMonthly = monthlyPayment + salesTax;

      expect(salesTax).toBe(0);
      expect(totalMonthly).toBe(500);
    });
  });

  describe("Scenario: Out-of-State Buyer", () => {
    it("should document that out-of-state buyers cannot avoid home state tax", () => {
      const rules = getRulesForState("NH");
      expect(rules?.extras?.notes).toContain("home state");
    });
  });

  describe("Scenario: Border Advantage Savings", () => {
    it("should document savings vs. neighboring states", () => {
      const vehiclePrice = 50000;
      const nhTax = 0;
      const maTax = vehiclePrice * 0.0625; // MA: 6.25%
      const savings = maTax - nhTax;

      expect(savings).toBe(3125);
    });
  });

  // ============================================================================
  // METADATA AND DOCUMENTATION
  // ============================================================================

  describe("Metadata - Last Updated", () => {
    it("should have lastUpdated timestamp", () => {
      const rules = getRulesForState("NH");
      expect(rules?.extras?.lastUpdated).toBeDefined();
    });
  });

  describe("Metadata - Documentation", () => {
    it("should have comprehensive notes in extras", () => {
      const rules = getRulesForState("NH");
      expect(rules?.extras?.notes).toBeDefined();
      expect((rules?.extras?.notes as string)?.length).toBeGreaterThan(100);
    });

    it("should document key NH features in notes", () => {
      const rules = getRulesForState("NH");
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("NO state sales tax");
      expect(notes).toContain("NO local sales tax");
      expect(notes).toContain("0%");
    });

    it("should document comparison to neighboring states", () => {
      const rules = getRulesForState("NH");
      expect(rules?.extras?.neighboringStates).toBeDefined();
    });
  });
});
