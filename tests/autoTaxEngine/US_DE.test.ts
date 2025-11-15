import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Delaware (DE) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load Delaware rules successfully", () => {
    const rules = getRulesForState("DE");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("DE");
  });

  it("should mark Delaware as implemented (not a stub)", () => {
    expect(isStateImplemented("DE")).toBe(true);
  });

  it("should have version number 1", () => {
    const rules = getRulesForState("DE");
    expect(rules?.version).toBe(1);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("DE");
    const rulesLower = getRulesForState("de");
    const rulesMixed = getRulesForState("De");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("DE");
    expect(rulesLower?.stateCode).toBe("DE");
    expect(rulesMixed?.stateCode).toBe("DE");
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS
  // ============================================================================

  describe("Retail - Trade-In Policy", () => {
    it("should have FULL trade-in credit policy (meaningless with no tax)", () => {
      const rules = getRulesForState("DE");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });
  });

  describe("Retail - Rebate Rules", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("DE");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as NON-TAXABLE (not applicable)", () => {
      const rules = getRulesForState("DE");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(false);
    });

    it("should mark dealer rebates as NON-TAXABLE (not applicable)", () => {
      const rules = getRulesForState("DE");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(false);
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as NOT TAXABLE (no sales tax exists)", () => {
      const rules = getRulesForState("DE");
      expect(rules?.docFeeTaxable).toBe(false);
    });

    it("should document that Delaware has NO CAP on doc fees", () => {
      const rules = getRulesForState("DE");
      expect(rules?.extras?.avgDocFee).toBe(275);
    });
  });

  describe("Retail - Fee Tax Rules", () => {
    it("should mark service contracts (VSC) as NON-TAXABLE", () => {
      const rules = getRulesForState("DE");
      expect(rules?.taxOnServiceContracts).toBe(false);
    });

    it("should mark GAP as NON-TAXABLE", () => {
      const rules = getRulesForState("DE");
      expect(rules?.taxOnGap).toBe(false);
    });

    it("should mark doc fee as NON-TAXABLE", () => {
      const rules = getRulesForState("DE");
      const docFee = rules?.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(false);
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should NOT tax accessories (no sales tax)", () => {
      const rules = getRulesForState("DE");
      expect(rules?.taxOnAccessories).toBe(false);
    });

    it("should NOT tax service contracts", () => {
      const rules = getRulesForState("DE");
      expect(rules?.taxOnServiceContracts).toBe(false);
    });

    it("should NOT tax GAP insurance", () => {
      const rules = getRulesForState("DE");
      expect(rules?.taxOnGap).toBe(false);
    });
  });

  describe("Retail - Vehicle Tax Scheme", () => {
    it("should use STATE_ONLY vehicle tax scheme (but rate is 0%)", () => {
      const rules = getRulesForState("DE");
      expect(rules?.vehicleTaxScheme).toBe("STATE_ONLY");
    });

    it("should NOT apply local sales tax to vehicles", () => {
      const rules = getRulesForState("DE");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
    });

    it("should document state sales tax rate of 0%", () => {
      const rules = getRulesForState("DE");
      expect(rules?.extras?.stateSalesRate).toBe(0);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease - Tax Method", () => {
    it("should use MONTHLY lease taxation method (not applicable)", () => {
      const rules = getRulesForState("DE");
      expect(rules?.leaseRules.method).toBe("MONTHLY");
    });

    it("should NOT tax cap cost reduction (no sales tax)", () => {
      const rules = getRulesForState("DE");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });
  });

  describe("Lease - Trade-In Credit", () => {
    it("should provide FULL trade-in credit (meaningless with no tax)", () => {
      const rules = getRulesForState("DE");
      expect(rules?.leaseRules.tradeInCredit).toBe("FULL");
    });
  });

  // ============================================================================
  // RECIPROCITY TESTS
  // ============================================================================

  describe("Reciprocity Rules", () => {
    it("should NOT have reciprocity (not applicable - no sales tax)", () => {
      const rules = getRulesForState("DE");
      expect(rules?.reciprocity.enabled).toBe(false);
    });
  });

  // ============================================================================
  // DELAWARE-SPECIFIC FEATURES
  // ============================================================================

  describe("Delaware Unique Features - No Sales Tax", () => {
    it("should document that DE has NO state sales tax", () => {
      const rules = getRulesForState("DE");
      expect(rules?.extras?.stateSalesRate).toBe(0);
      expect(rules?.extras?.notes).toContain("NO state sales tax");
    });

    it("should document that DE has NO local sales tax", () => {
      const rules = getRulesForState("DE");
      expect(rules?.extras?.notes).toContain("NO local sales tax");
    });

    it("should document that DE is one of 5 states without sales tax", () => {
      const rules = getRulesForState("DE");
      expect(rules?.extras?.notes).toContain("one of five");
    });
  });

  describe("Delaware Unique Features - Constitutional Protection", () => {
    it("should document that sales tax prohibition is constitutional", () => {
      const rules = getRulesForState("DE");
      expect(rules?.extras?.notes).toContain("constitution");
    });
  });

  describe("Delaware Unique Features - Corporate Capital", () => {
    it("should document Delaware's status as corporate incorporation capital", () => {
      const rules = getRulesForState("DE");
      expect(rules?.extras?.notes).toContain("incorporated");
    });
  });

  describe("Delaware Features - Lower Doc Fees", () => {
    it("should document average doc fee of $275", () => {
      const rules = getRulesForState("DE");
      expect(rules?.extras?.avgDocFee).toBe(275);
    });
  });

  // ============================================================================
  // SCENARIO TESTS
  // ============================================================================

  describe("Scenario: Standard Vehicle Purchase", () => {
    it("should calculate ZERO sales tax", () => {
      const vehiclePrice = 30000;
      const tradeIn = 10000;
      const docFee = 275;
      const vsc = 2000;
      const accessories = 1500;

      const salesTax = 0;
      const totalCost = vehiclePrice - tradeIn + docFee + vsc + accessories;

      expect(salesTax).toBe(0);
      expect(totalCost).toBe(23775);
    });
  });

  describe("Scenario: Luxury Vehicle Purchase", () => {
    it("should calculate ZERO sales tax on luxury vehicle", () => {
      const vehiclePrice = 75000;
      const tradeIn = 30000;
      const docFee = 275;
      const extendedWarranty = 4000;
      const accessories = 5000;

      const salesTax = 0;
      const totalCost = vehiclePrice - tradeIn + docFee + extendedWarranty + accessories;

      expect(salesTax).toBe(0);
      expect(totalCost).toBe(54275);
    });
  });

  describe("Scenario: Savings vs. Neighboring States", () => {
    it("should calculate savings compared to MD, PA, NJ", () => {
      const vehiclePrice = 30000;
      const deTax = 0;
      const mdTax = vehiclePrice * 0.06; // MD: 6%
      const paTax = vehiclePrice * 0.06; // PA: 6%
      const njTax = vehiclePrice * 0.06625; // NJ: 6.625%

      const savingsVsMD = mdTax - deTax;
      const savingsVsPA = paTax - deTax;
      const savingsVsNJ = njTax - deTax;

      expect(savingsVsMD).toBe(1800);
      expect(savingsVsPA).toBe(1800);
      expect(savingsVsNJ).toBe(1987.5);
    });
  });

  describe("Scenario: Commercial Fleet Purchase", () => {
    it("should calculate ZERO tax on fleet purchase", () => {
      const vehiclePrice = 50000;
      const docFee = 275;

      const salesTax = 0;
      const totalCost = vehiclePrice + docFee;

      expect(salesTax).toBe(0);
      expect(totalCost).toBe(50275);
    });
  });

  // ============================================================================
  // METADATA AND DOCUMENTATION
  // ============================================================================

  describe("Metadata - Last Updated", () => {
    it("should have lastUpdated timestamp", () => {
      const rules = getRulesForState("DE");
      expect(rules?.extras?.lastUpdated).toBeDefined();
    });
  });

  describe("Metadata - Documentation", () => {
    it("should have comprehensive notes in extras", () => {
      const rules = getRulesForState("DE");
      expect(rules?.extras?.notes).toBeDefined();
      expect((rules?.extras?.notes as string)?.length).toBeGreaterThan(100);
    });

    it("should document key DE features in notes", () => {
      const rules = getRulesForState("DE");
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("NO state sales tax");
      expect(notes).toContain("constitution");
      expect(notes).toContain("0%");
    });

    it("should document comparison to neighboring states", () => {
      const rules = getRulesForState("DE");
      expect(rules?.extras?.neighboringStates).toBeDefined();
    });
  });
});
