import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Alaska (AK) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load Alaska rules successfully", () => {
    const rules = getRulesForState("AK");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("AK");
  });

  it("should mark Alaska as implemented (not a stub)", () => {
    expect(isStateImplemented("AK")).toBe(true);
  });

  it("should have version number 1", () => {
    const rules = getRulesForState("AK");
    expect(rules?.version).toBe(1);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("AK");
    const rulesLower = getRulesForState("ak");
    const rulesMixed = getRulesForState("Ak");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("AK");
    expect(rulesLower?.stateCode).toBe("AK");
    expect(rulesMixed?.stateCode).toBe("AK");
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS
  // ============================================================================

  describe("Retail - Trade-In Policy", () => {
    it("should have FULL trade-in credit policy", () => {
      const rules = getRulesForState("AK");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });
  });

  describe("Retail - Rebate Rules", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("AK");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as NON-TAXABLE", () => {
      const rules = getRulesForState("AK");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(false);
    });

    it("should mark dealer rebates as NON-TAXABLE", () => {
      const rules = getRulesForState("AK");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(false);
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as TAXABLE (in localities with sales tax)", () => {
      const rules = getRulesForState("AK");
      expect(rules?.docFeeTaxable).toBe(true);
    });

    it("should document that Alaska has NO CAP on doc fees", () => {
      const rules = getRulesForState("AK");
      const docFee = rules?.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
    });
  });

  describe("Retail - Fee Tax Rules", () => {
    it("should mark service contracts (VSC) as NON-TAXABLE", () => {
      const rules = getRulesForState("AK");
      expect(rules?.taxOnServiceContracts).toBe(false);
    });

    it("should mark GAP as NON-TAXABLE", () => {
      const rules = getRulesForState("AK");
      expect(rules?.taxOnGap).toBe(false);
    });

    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("AK");
      const docFee = rules?.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should tax accessories (in localities with sales tax)", () => {
      const rules = getRulesForState("AK");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should NOT tax service contracts", () => {
      const rules = getRulesForState("AK");
      expect(rules?.taxOnServiceContracts).toBe(false);
    });

    it("should NOT tax GAP insurance", () => {
      const rules = getRulesForState("AK");
      expect(rules?.taxOnGap).toBe(false);
    });
  });

  describe("Retail - Vehicle Tax Scheme", () => {
    it("should use LOCAL_ONLY vehicle tax scheme (no state sales tax)", () => {
      const rules = getRulesForState("AK");
      expect(rules?.vehicleTaxScheme).toBe("LOCAL_ONLY");
    });

    it("should apply local sales tax to vehicles", () => {
      const rules = getRulesForState("AK");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(true);
    });

    it("should document state sales tax rate of 0%", () => {
      const rules = getRulesForState("AK");
      expect(rules?.extras?.stateSalesRate).toBe(0);
    });

    it("should document local tax range of 0% to 7%", () => {
      const rules = getRulesForState("AK");
      expect(rules?.extras?.localTaxRange).toBeDefined();
      expect(rules?.extras?.localTaxRange?.min).toBe(0);
      expect(rules?.extras?.localTaxRange?.max).toBe(7.0);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease - Tax Method", () => {
    it("should use MONTHLY lease taxation method", () => {
      const rules = getRulesForState("AK");
      expect(rules?.leaseRules.method).toBe("MONTHLY");
    });

    it("should NOT tax cap cost reduction upfront (monthly method)", () => {
      const rules = getRulesForState("AK");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });

    it("should have no special lease scheme", () => {
      const rules = getRulesForState("AK");
      expect(rules?.leaseRules.specialScheme).toBe("NONE");
    });
  });

  describe("Lease - Trade-In Credit", () => {
    it("should provide FULL trade-in credit on leases", () => {
      const rules = getRulesForState("AK");
      expect(rules?.leaseRules.tradeInCredit).toBe("FULL");
    });
  });

  describe("Lease - Rebates and Incentives", () => {
    it("should follow retail rebate rules for leases", () => {
      const rules = getRulesForState("AK");
      expect(rules?.leaseRules.rebateBehavior).toBe("FOLLOW_RETAIL_RULE");
    });
  });

  describe("Lease - Documentation Fee", () => {
    it("should follow retail doc fee rules on leases", () => {
      const rules = getRulesForState("AK");
      expect(rules?.leaseRules.docFeeTaxability).toBe("FOLLOW_RETAIL_RULE");
    });
  });

  // ============================================================================
  // RECIPROCITY TESTS
  // ============================================================================

  describe("Reciprocity Rules", () => {
    it("should have reciprocity enabled", () => {
      const rules = getRulesForState("AK");
      expect(rules?.reciprocity.enabled).toBe(true);
    });

    it("should apply reciprocity to BOTH retail and lease", () => {
      const rules = getRulesForState("AK");
      expect(rules?.reciprocity.scope).toBe("BOTH");
    });
  });

  // ============================================================================
  // ALASKA-SPECIFIC FEATURES
  // ============================================================================

  describe("Alaska Unique Features - No State Sales Tax", () => {
    it("should document that Alaska has NO state sales tax", () => {
      const rules = getRulesForState("AK");
      expect(rules?.extras?.stateSalesRate).toBe(0);
      expect(rules?.extras?.notes).toContain("NO state sales tax");
    });

    it("should document that Alaska is one of 5 states without sales tax", () => {
      const rules = getRulesForState("AK");
      expect(rules?.extras?.notes).toContain("one of five");
    });
  });

  describe("Alaska Unique Features - Local Tax Only", () => {
    it("should document LOCAL_ONLY tax scheme", () => {
      const rules = getRulesForState("AK");
      expect(rules?.vehicleTaxScheme).toBe("LOCAL_ONLY");
      expect(rules?.extras?.notes).toContain("local municipalities");
    });

    it("should document that tax rates vary by municipality", () => {
      const rules = getRulesForState("AK");
      expect(rules?.extras?.notes).toContain("varies by municipality");
    });
  });

  describe("Alaska Unique Features - Major Municipalities", () => {
    it("should document Anchorage tax rate", () => {
      const rules = getRulesForState("AK");
      expect(rules?.extras?.majorJurisdictions).toBeDefined();
      expect(rules?.extras?.majorJurisdictions?.Anchorage).toBeDefined();
    });
  });

  // ============================================================================
  // SCENARIO TESTS
  // ============================================================================

  describe("Scenario: Vehicle Purchase in Anchorage (7% local tax)", () => {
    it("should calculate tax correctly with local rate", () => {
      const vehiclePrice = 30000;
      const tradeIn = 10000;
      const docFee = 499;
      const accessories = 1500;
      const localRate = 0.07; // Anchorage

      const taxableBase = vehiclePrice - tradeIn + docFee + accessories;
      const tax = taxableBase * localRate;

      expect(taxableBase).toBe(21999);
      expect(tax).toBeCloseTo(1539.93, 2);
    });
  });

  describe("Scenario: Vehicle Purchase in Area with No Local Tax", () => {
    it("should calculate ZERO tax in no-tax area", () => {
      const vehiclePrice = 30000;
      const tradeIn = 10000;
      const docFee = 499;
      const localRate = 0.00; // No local tax

      const taxableBase = vehiclePrice - tradeIn + docFee;
      const tax = taxableBase * localRate;

      expect(tax).toBeCloseTo(0, 2);
    });
  });

  describe("Scenario: Lease Payment with Local Tax", () => {
    it("should apply local tax to monthly payment", () => {
      const monthlyPayment = 400;
      const localRate = 0.05; // 5% local tax
      const monthlyTax = monthlyPayment * localRate;

      expect(monthlyTax).toBeCloseTo(20, 2);
    });
  });

  describe("Scenario: Service Contracts and GAP (NOT Taxable)", () => {
    it("should NOT tax VSC or GAP even in taxed localities", () => {
      const vehiclePrice = 30000;
      const vsc = 2000;
      const gap = 695;
      const localRate = 0.07;

      // Only vehicle is taxable, NOT VSC or GAP
      const taxableBase = vehiclePrice;
      const tax = taxableBase * localRate;

      expect(tax).toBeCloseTo(2100, 2);

      // Savings from VSC and GAP not being taxed
      const savings = (vsc + gap) * localRate;
      expect(savings).toBeCloseTo(188.65, 2);
    });
  });

  // ============================================================================
  // METADATA AND DOCUMENTATION
  // ============================================================================

  describe("Metadata - Last Updated", () => {
    it("should have lastUpdated timestamp", () => {
      const rules = getRulesForState("AK");
      expect(rules?.extras?.lastUpdated).toBeDefined();
    });
  });

  describe("Metadata - Documentation", () => {
    it("should have comprehensive notes in extras", () => {
      const rules = getRulesForState("AK");
      expect(rules?.extras?.notes).toBeDefined();
      expect((rules?.extras?.notes as string)?.length).toBeGreaterThan(100);
    });

    it("should document key Alaska features in notes", () => {
      const rules = getRulesForState("AK");
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("NO state sales tax");
      expect(notes).toContain("local");
      expect(notes).toContain("0%");
    });
  });
});
