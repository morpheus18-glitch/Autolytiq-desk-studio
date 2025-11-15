import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("South Dakota (SD) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load South Dakota rules successfully", () => {
    const rules = getRulesForState("SD");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("SD");
  });

  it("should mark South Dakota as implemented (not a stub)", () => {
    expect(isStateImplemented("SD")).toBe(true);
  });

  it("should have version number 2", () => {
    const rules = getRulesForState("SD");
    expect(rules?.version).toBe(2);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("SD");
    const rulesLower = getRulesForState("sd");
    const rulesMixed = getRulesForState("Sd");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("SD");
    expect(rulesLower?.stateCode).toBe("SD");
    expect(rulesMixed?.stateCode).toBe("SD");
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS
  // ============================================================================

  describe("Retail - Trade-In Policy", () => {
    it("should have FULL trade-in credit policy", () => {
      const rules = getRulesForState("SD");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });
  });

  describe("Retail - Rebate Rules", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("SD");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as NOT TAXABLE", () => {
      const rules = getRulesForState("SD");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(false);
    });

    it("should mark dealer rebates as NOT TAXABLE (when actual price reduction)", () => {
      const rules = getRulesForState("SD");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(false);
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("SD");
      expect(rules?.docFeeTaxable).toBe(true);
    });

    it("should document that South Dakota has NO CAP on doc fees", () => {
      const rules = getRulesForState("SD");
      const docFee = rules?.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
      expect(docFee?.notes).toContain("NO cap");
    });

    it("should document average doc fee of $225 in extras", () => {
      const rules = getRulesForState("SD");
      expect(rules?.extras?.avgDocFee).toBe(225);
    });
  });

  describe("Retail - Fee Tax Rules", () => {
    it("should mark service contracts (VSC) as NON-TAXABLE", () => {
      const rules = getRulesForState("SD");
      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(false);
      expect(vsc?.notes).toContain("NOT subject");
    });

    it("should mark GAP as NON-TAXABLE", () => {
      const rules = getRulesForState("SD");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(false);
    });

    it("should mark title fees as NON-TAXABLE", () => {
      const rules = getRulesForState("SD");
      const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-TAXABLE", () => {
      const rules = getRulesForState("SD");
      const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });

    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("SD");
      const docFee = rules?.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("SD");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should NOT tax negative equity on retail sales", () => {
      const rules = getRulesForState("SD");
      expect(rules?.taxOnNegativeEquity).toBe(false);
    });

    it("should NOT tax service contracts", () => {
      const rules = getRulesForState("SD");
      expect(rules?.taxOnServiceContracts).toBe(false);
    });

    it("should NOT tax GAP insurance", () => {
      const rules = getRulesForState("SD");
      expect(rules?.taxOnGap).toBe(false);
    });
  });

  describe("Retail - Vehicle Tax Scheme", () => {
    it("should use STATE_PLUS_LOCAL vehicle tax scheme", () => {
      const rules = getRulesForState("SD");
      expect(rules?.vehicleTaxScheme).toBe("STATE_PLUS_LOCAL");
    });

    it("should apply local sales tax to vehicles", () => {
      const rules = getRulesForState("SD");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(true);
    });

    it("should document state rate of 4.0%", () => {
      const rules = getRulesForState("SD");
      expect(rules?.extras?.stateRate).toBe(4.0);
    });

    it("should document combined rate range of 4.0% to 6.5%", () => {
      const rules = getRulesForState("SD");
      expect(rules?.extras?.combinedRateRange).toBeDefined();
      expect(rules?.extras?.combinedRateRange?.min).toBe(4.0);
      expect(rules?.extras?.combinedRateRange?.max).toBe(6.5);
    });

    it("should document major jurisdictions", () => {
      const rules = getRulesForState("SD");
      expect(rules?.extras?.majorJurisdictions).toBeDefined();
      expect(rules?.extras?.majorJurisdictions?.SiuxFalls?.total).toBe(6.5);
      expect(rules?.extras?.majorJurisdictions?.RapidCity?.total).toBe(6.0);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease - Tax Method", () => {
    it("should use MONTHLY lease taxation method", () => {
      const rules = getRulesForState("SD");
      expect(rules?.leaseRules.method).toBe("MONTHLY");
    });
  });

  describe("Lease - Cap Cost Reduction", () => {
    it("should NOT tax cap cost reduction (pure monthly method)", () => {
      const rules = getRulesForState("SD");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });
  });

  describe("Lease - Rebate Behavior", () => {
    it("should follow retail rebate rules on leases", () => {
      const rules = getRulesForState("SD");
      expect(rules?.leaseRules.rebateBehavior).toBe("FOLLOW_RETAIL_RULE");
    });
  });

  describe("Lease - Doc Fee Taxability", () => {
    it("should follow retail doc fee rules on leases", () => {
      const rules = getRulesForState("SD");
      expect(rules?.leaseRules.docFeeTaxability).toBe("FOLLOW_RETAIL_RULE");
    });
  });

  describe("Lease - Trade-In Credit", () => {
    it("should allow full trade-in credit on leases", () => {
      const rules = getRulesForState("SD");
      expect(rules?.leaseRules.tradeInCredit).toBe("FOLLOW_RETAIL_RULE");
    });
  });

  describe("Lease - Negative Equity", () => {
    it("should tax negative equity on leases (increases monthly payments)", () => {
      const rules = getRulesForState("SD");
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(true);
    });
  });

  describe("Lease - Fee Taxability", () => {
    it("should mark service contracts as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("SD");
      const vsc = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(false);
    });

    it("should mark GAP as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("SD");
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(false);
    });

    it("should mark doc fee as TAXABLE on leases", () => {
      const rules = getRulesForState("SD");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
    });
  });

  describe("Lease - Special Schemes", () => {
    it("should have NO special lease scheme", () => {
      const rules = getRulesForState("SD");
      expect(rules?.leaseRules.specialScheme).toBe("NONE");
    });
  });

  // ============================================================================
  // RECIPROCITY TESTS
  // ============================================================================

  describe("Reciprocity Rules", () => {
    it("should have reciprocity enabled", () => {
      const rules = getRulesForState("SD");
      expect(rules?.reciprocity.enabled).toBe(true);
    });

    it("should apply to both retail and lease", () => {
      const rules = getRulesForState("SD");
      expect(rules?.reciprocity.scope).toBe("BOTH");
    });

    it("should provide credit up to state rate", () => {
      const rules = getRulesForState("SD");
      expect(rules?.reciprocity.homeStateBehavior).toBe("CREDIT_UP_TO_STATE_RATE");
    });

    it("should require proof of tax paid", () => {
      const rules = getRulesForState("SD");
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(true);
    });

    it("should be based on tax paid (not tax due)", () => {
      const rules = getRulesForState("SD");
      expect(rules?.reciprocity.basis).toBe("TAX_PAID");
    });

    it("should cap credit at South Dakota tax amount", () => {
      const rules = getRulesForState("SD");
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(true);
    });

    it("should NOT have lease exception", () => {
      const rules = getRulesForState("SD");
      expect(rules?.reciprocity.hasLeaseException).toBe(false);
    });
  });

  // ============================================================================
  // UNIQUE FEATURES TESTS
  // ============================================================================

  describe("South Dakota Unique Features", () => {
    it("should document excise tax schedule", () => {
      const rules = getRulesForState("SD");
      expect(rules?.extras?.exciseTaxSchedule).toBeDefined();
      expect(rules?.extras?.exciseTaxSchedule?.year1).toBe(4.0);
      expect(rules?.extras?.exciseTaxSchedule?.year2).toBe(3.0);
      expect(rules?.extras?.exciseTaxSchedule?.year3).toBe(2.0);
      expect(rules?.extras?.exciseTaxSchedule?.year4plus).toBe(1.0);
    });

    it("should list unique features", () => {
      const rules = getRulesForState("SD");
      expect(rules?.extras?.uniqueFeatures).toBeDefined();
      expect(Array.isArray(rules?.extras?.uniqueFeatures)).toBe(true);
      expect(rules?.extras?.uniqueFeatures?.length).toBeGreaterThan(0);
    });

    it("should document sources", () => {
      const rules = getRulesForState("SD");
      expect(rules?.extras?.sources).toBeDefined();
      expect(Array.isArray(rules?.extras?.sources)).toBe(true);
      expect(rules?.extras?.sources?.length).toBeGreaterThan(0);
    });

    it("should have last updated date", () => {
      const rules = getRulesForState("SD");
      expect(rules?.extras?.lastUpdated).toBeDefined();
      expect(rules?.extras?.lastUpdated).toBe("2025-11-14");
    });
  });

  // ============================================================================
  // DATA INTEGRITY TESTS
  // ============================================================================

  describe("Data Integrity", () => {
    it("should have all required rebate fields", () => {
      const rules = getRulesForState("SD");
      rules?.rebates.forEach((rebate) => {
        expect(rebate.appliesTo).toBeDefined();
        expect(typeof rebate.taxable).toBe("boolean");
        expect(rebate.notes).toBeDefined();
      });
    });

    it("should have all required fee tax rule fields", () => {
      const rules = getRulesForState("SD");
      rules?.feeTaxRules.forEach((rule) => {
        expect(rule.code).toBeDefined();
        expect(typeof rule.taxable).toBe("boolean");
      });
    });

    it("should have all required lease fee tax rule fields", () => {
      const rules = getRulesForState("SD");
      rules?.leaseRules.feeTaxRules.forEach((rule) => {
        expect(rule.code).toBeDefined();
        expect(typeof rule.taxable).toBe("boolean");
      });
    });

    it("should have consistent taxability between retail and lease for VSC", () => {
      const rules = getRulesForState("SD");
      const retailVSC = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      const leaseVSC = rules?.leaseRules.feeTaxRules.find(
        (r) => r.code === "SERVICE_CONTRACT"
      );
      expect(retailVSC?.taxable).toBe(leaseVSC?.taxable);
    });

    it("should have consistent taxability between retail and lease for GAP", () => {
      const rules = getRulesForState("SD");
      const retailGAP = rules?.feeTaxRules.find((r) => r.code === "GAP");
      const leaseGAP = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(retailGAP?.taxable).toBe(leaseGAP?.taxable);
    });
  });
});
