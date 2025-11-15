import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Wyoming (WY) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load Wyoming rules successfully", () => {
    const rules = getRulesForState("WY");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("WY");
  });

  it("should mark Wyoming as implemented (not a stub)", () => {
    expect(isStateImplemented("WY")).toBe(true);
  });

  it("should have version number 2", () => {
    const rules = getRulesForState("WY");
    expect(rules?.version).toBe(2);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("WY");
    const rulesLower = getRulesForState("wy");
    const rulesMixed = getRulesForState("Wy");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("WY");
    expect(rulesLower?.stateCode).toBe("WY");
    expect(rulesMixed?.stateCode).toBe("WY");
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS
  // ============================================================================

  describe("Retail - Trade-In Policy", () => {
    it("should have FULL trade-in credit policy", () => {
      const rules = getRulesForState("WY");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });
  });

  describe("Retail - Rebate Rules", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("WY");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as NOT TAXABLE", () => {
      const rules = getRulesForState("WY");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(false);
    });

    it("should mark dealer rebates as NOT TAXABLE (when actual price reduction)", () => {
      const rules = getRulesForState("WY");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(false);
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("WY");
      expect(rules?.docFeeTaxable).toBe(true);
    });

    it("should document that Wyoming has NO CAP on doc fees", () => {
      const rules = getRulesForState("WY");
      const docFee = rules?.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
      expect(docFee?.notes).toContain("NO cap");
    });

    it("should document average doc fee of $250 in extras", () => {
      const rules = getRulesForState("WY");
      expect(rules?.extras?.avgDocFee).toBe(250);
    });

    it("should note that Wyoming has among lowest doc fees in nation", () => {
      const rules = getRulesForState("WY");
      const docFee = rules?.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee?.notes).toContain("lowest in nation");
    });
  });

  describe("Retail - Fee Tax Rules", () => {
    it("should mark service contracts (VSC) as NON-TAXABLE", () => {
      const rules = getRulesForState("WY");
      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(false);
      expect(vsc?.notes).toContain("NOT subject");
    });

    it("should mark GAP as NON-TAXABLE", () => {
      const rules = getRulesForState("WY");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(false);
    });

    it("should mark title fees as NON-TAXABLE", () => {
      const rules = getRulesForState("WY");
      const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should document title fee amount of $15", () => {
      const rules = getRulesForState("WY");
      expect(rules?.extras?.titleFee).toBe(15);
    });

    it("should mark registration fees as NON-TAXABLE", () => {
      const rules = getRulesForState("WY");
      const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });

    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("WY");
      const docFee = rules?.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("WY");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should NOT tax negative equity on retail sales", () => {
      const rules = getRulesForState("WY");
      expect(rules?.taxOnNegativeEquity).toBe(false);
    });

    it("should NOT tax service contracts", () => {
      const rules = getRulesForState("WY");
      expect(rules?.taxOnServiceContracts).toBe(false);
    });

    it("should NOT tax GAP insurance", () => {
      const rules = getRulesForState("WY");
      expect(rules?.taxOnGap).toBe(false);
    });
  });

  describe("Retail - Vehicle Tax Scheme", () => {
    it("should use STATE_PLUS_LOCAL vehicle tax scheme", () => {
      const rules = getRulesForState("WY");
      expect(rules?.vehicleTaxScheme).toBe("STATE_PLUS_LOCAL");
    });

    it("should apply local sales tax to vehicles", () => {
      const rules = getRulesForState("WY");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(true);
    });

    it("should document state rate of 4.0%", () => {
      const rules = getRulesForState("WY");
      expect(rules?.extras?.stateRate).toBe(4.0);
    });

    it("should document combined rate range of 4.0% to 6.0%", () => {
      const rules = getRulesForState("WY");
      expect(rules?.extras?.combinedRateRange).toBeDefined();
      expect(rules?.extras?.combinedRateRange?.min).toBe(4.0);
      expect(rules?.extras?.combinedRateRange?.max).toBe(6.0);
    });

    it("should document county rate range of 0% to 1%", () => {
      const rules = getRulesForState("WY");
      expect(rules?.extras?.countyRateRange).toBeDefined();
      expect(rules?.extras?.countyRateRange?.min).toBe(0);
      expect(rules?.extras?.countyRateRange?.max).toBe(1.0);
    });

    it("should document city rate range of 0% to 1%", () => {
      const rules = getRulesForState("WY");
      expect(rules?.extras?.cityRateRange).toBeDefined();
      expect(rules?.extras?.cityRateRange?.min).toBe(0);
      expect(rules?.extras?.cityRateRange?.max).toBe(1.0);
    });

    it("should document major jurisdictions", () => {
      const rules = getRulesForState("WY");
      expect(rules?.extras?.majorJurisdictions).toBeDefined();
      expect(rules?.extras?.majorJurisdictions?.Cheyenne?.total).toBe(6.0);
      expect(rules?.extras?.majorJurisdictions?.Casper?.total).toBe(5.0);
      expect(rules?.extras?.majorJurisdictions?.RuralCounties?.total).toBe(4.0);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease - Tax Method", () => {
    it("should use MONTHLY lease taxation method", () => {
      const rules = getRulesForState("WY");
      expect(rules?.leaseRules.method).toBe("MONTHLY");
    });
  });

  describe("Lease - Cap Cost Reduction", () => {
    it("should NOT tax cap cost reduction (pure monthly method)", () => {
      const rules = getRulesForState("WY");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });
  });

  describe("Lease - Rebate Behavior", () => {
    it("should follow retail rebate rules on leases", () => {
      const rules = getRulesForState("WY");
      expect(rules?.leaseRules.rebateBehavior).toBe("FOLLOW_RETAIL_RULE");
    });
  });

  describe("Lease - Doc Fee Taxability", () => {
    it("should follow retail doc fee rules on leases", () => {
      const rules = getRulesForState("WY");
      expect(rules?.leaseRules.docFeeTaxability).toBe("FOLLOW_RETAIL_RULE");
    });
  });

  describe("Lease - Trade-In Credit", () => {
    it("should allow full trade-in credit on leases", () => {
      const rules = getRulesForState("WY");
      expect(rules?.leaseRules.tradeInCredit).toBe("FOLLOW_RETAIL_RULE");
    });
  });

  describe("Lease - Negative Equity", () => {
    it("should tax negative equity on leases (increases monthly payments)", () => {
      const rules = getRulesForState("WY");
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(true);
    });
  });

  describe("Lease - Fee Taxability", () => {
    it("should mark service contracts as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("WY");
      const vsc = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(false);
    });

    it("should mark GAP as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("WY");
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(false);
    });

    it("should mark doc fee as TAXABLE on leases", () => {
      const rules = getRulesForState("WY");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
    });
  });

  describe("Lease - Special Schemes", () => {
    it("should have NO special lease scheme", () => {
      const rules = getRulesForState("WY");
      expect(rules?.leaseRules.specialScheme).toBe("NONE");
    });
  });

  // ============================================================================
  // RECIPROCITY TESTS
  // ============================================================================

  describe("Reciprocity Rules", () => {
    it("should have reciprocity enabled", () => {
      const rules = getRulesForState("WY");
      expect(rules?.reciprocity.enabled).toBe(true);
    });

    it("should apply to both retail and lease", () => {
      const rules = getRulesForState("WY");
      expect(rules?.reciprocity.scope).toBe("BOTH");
    });

    it("should provide credit up to state rate", () => {
      const rules = getRulesForState("WY");
      expect(rules?.reciprocity.homeStateBehavior).toBe("CREDIT_UP_TO_STATE_RATE");
    });

    it("should require proof of tax paid", () => {
      const rules = getRulesForState("WY");
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(true);
    });

    it("should be based on tax paid (not tax due)", () => {
      const rules = getRulesForState("WY");
      expect(rules?.reciprocity.basis).toBe("TAX_PAID");
    });

    it("should cap credit at Wyoming tax amount", () => {
      const rules = getRulesForState("WY");
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(true);
    });

    it("should NOT have lease exception", () => {
      const rules = getRulesForState("WY");
      expect(rules?.reciprocity.hasLeaseException).toBe(false);
    });
  });

  // ============================================================================
  // UNIQUE FEATURES TESTS (LOW RATES, NO INCOME TAX)
  // ============================================================================

  describe("Wyoming Unique Features", () => {
    it("should document economic context (mineral revenues, no income tax)", () => {
      const rules = getRulesForState("WY");
      expect(rules?.extras?.economicContext).toBeDefined();
      expect(rules?.extras?.economicContext?.description).toContain("mineral revenues");
      expect(rules?.extras?.economicContext?.description).toContain("no personal income tax");
    });

    it("should list unique features including low tax rates", () => {
      const rules = getRulesForState("WY");
      expect(rules?.extras?.uniqueFeatures).toBeDefined();
      expect(Array.isArray(rules?.extras?.uniqueFeatures)).toBe(true);
      expect(rules?.extras?.uniqueFeatures?.length).toBeGreaterThan(0);

      // Should mention low rates
      const hasLowRates = rules?.extras?.uniqueFeatures?.some(
        (feature: string) => feature.includes("lowest") && feature.includes("tax")
      );
      expect(hasLowRates).toBe(true);
    });

    it("should list unique features including no income tax", () => {
      const rules = getRulesForState("WY");
      const hasNoIncomeTax = rules?.extras?.uniqueFeatures?.some(
        (feature: string) => feature.includes("No state income tax")
      );
      expect(hasNoIncomeTax).toBe(true);
    });

    it("should list unique features including low doc fees", () => {
      const rules = getRulesForState("WY");
      const hasLowDocFees = rules?.extras?.uniqueFeatures?.some(
        (feature: string) => feature.includes("lowest doc fees")
      );
      expect(hasLowDocFees).toBe(true);
    });

    it("should document sources", () => {
      const rules = getRulesForState("WY");
      expect(rules?.extras?.sources).toBeDefined();
      expect(Array.isArray(rules?.extras?.sources)).toBe(true);
      expect(rules?.extras?.sources?.length).toBeGreaterThan(0);
    });

    it("should have last updated date", () => {
      const rules = getRulesForState("WY");
      expect(rules?.extras?.lastUpdated).toBeDefined();
      expect(rules?.extras?.lastUpdated).toBe("2025-11-14");
    });
  });

  // ============================================================================
  // DATA INTEGRITY TESTS
  // ============================================================================

  describe("Data Integrity", () => {
    it("should have all required rebate fields", () => {
      const rules = getRulesForState("WY");
      rules?.rebates.forEach((rebate) => {
        expect(rebate.appliesTo).toBeDefined();
        expect(typeof rebate.taxable).toBe("boolean");
        expect(rebate.notes).toBeDefined();
      });
    });

    it("should have all required fee tax rule fields", () => {
      const rules = getRulesForState("WY");
      rules?.feeTaxRules.forEach((rule) => {
        expect(rule.code).toBeDefined();
        expect(typeof rule.taxable).toBe("boolean");
      });
    });

    it("should have all required lease fee tax rule fields", () => {
      const rules = getRulesForState("WY");
      rules?.leaseRules.feeTaxRules.forEach((rule) => {
        expect(rule.code).toBeDefined();
        expect(typeof rule.taxable).toBe("boolean");
      });
    });

    it("should have consistent taxability between retail and lease for VSC", () => {
      const rules = getRulesForState("WY");
      const retailVSC = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      const leaseVSC = rules?.leaseRules.feeTaxRules.find(
        (r) => r.code === "SERVICE_CONTRACT"
      );
      expect(retailVSC?.taxable).toBe(leaseVSC?.taxable);
      expect(retailVSC?.taxable).toBe(false); // Both should be false for WY
    });

    it("should have consistent taxability between retail and lease for GAP", () => {
      const rules = getRulesForState("WY");
      const retailGAP = rules?.feeTaxRules.find((r) => r.code === "GAP");
      const leaseGAP = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(retailGAP?.taxable).toBe(leaseGAP?.taxable);
      expect(retailGAP?.taxable).toBe(false); // Both should be false
    });
  });

  // ============================================================================
  // LOW TAX RATE VALIDATION TESTS
  // ============================================================================

  describe("Low Tax Rate Validations", () => {
    it("should have among the lowest state rate (4.0%)", () => {
      const rules = getRulesForState("WY");
      expect(rules?.extras?.stateRate).toBe(4.0);
      // 4.0% is among the lowest state rates in the nation
    });

    it("should have among the lowest combined rates (4.0% to 6.0%)", () => {
      const rules = getRulesForState("WY");
      expect(rules?.extras?.combinedRateRange?.min).toBe(4.0);
      expect(rules?.extras?.combinedRateRange?.max).toBe(6.0);
      // Most states have 7-11% combined rates
    });

    it("should have among the lowest doc fees ($250 average)", () => {
      const rules = getRulesForState("WY");
      expect(rules?.extras?.avgDocFee).toBe(250);
      // National average is $400-500
    });

    it("should have among the lowest title fees ($15)", () => {
      const rules = getRulesForState("WY");
      expect(rules?.extras?.titleFee).toBe(15);
      // Many states charge $30-75
    });

    it("should document notes about low rates and business-friendly environment", () => {
      const rules = getRulesForState("WY");
      expect(rules?.extras?.notes).toContain("LOWEST");
      expect(rules?.extras?.notes).toContain("business-friendly");
    });
  });

  // ============================================================================
  // COMPARISON TESTS
  // ============================================================================

  describe("Wyoming vs Other States Comparison", () => {
    it("should have lower state rate than most states", () => {
      const wyRules = getRulesForState("WY");
      const caRules = getRulesForState("CA");
      const txRules = getRulesForState("TX");

      // Wyoming 4.0% is lower than CA (7.25%) and TX (6.25%)
      expect(wyRules?.extras?.stateRate).toBeLessThan(6.25);
    });

    it("should have lower combined max rate than most states", () => {
      const wyRules = getRulesForState("WY");

      // Wyoming max 6.0% is lower than most states
      expect(wyRules?.extras?.combinedRateRange?.max).toBe(6.0);
      // Many states have 8-11% max combined rates
    });

    it("should have same trade-in policy as most states (FULL)", () => {
      const wyRules = getRulesForState("WY");

      // Wyoming has standard FULL trade-in credit
      expect(wyRules?.tradeInPolicy.type).toBe("FULL");
    });

    it("should have standard VSC/GAP taxability (non-taxable)", () => {
      const wyRules = getRulesForState("WY");

      // Wyoming follows standard pattern (VSC and GAP not taxable)
      expect(wyRules?.taxOnServiceContracts).toBe(false);
      expect(wyRules?.taxOnGap).toBe(false);
    });
  });
});
