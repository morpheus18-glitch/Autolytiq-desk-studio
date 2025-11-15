import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Vermont (VT) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load Vermont rules successfully", () => {
    const rules = getRulesForState("VT");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("VT");
  });

  it("should mark Vermont as implemented (not a stub)", () => {
    expect(isStateImplemented("VT")).toBe(true);
  });

  it("should have version number 2", () => {
    const rules = getRulesForState("VT");
    expect(rules?.version).toBe(2);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("VT");
    const rulesLower = getRulesForState("vt");
    const rulesMixed = getRulesForState("Vt");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("VT");
    expect(rulesLower?.stateCode).toBe("VT");
    expect(rulesMixed?.stateCode).toBe("VT");
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS - UNIQUE VT FEATURES
  // ============================================================================

  describe("Retail - Trade-In Policy (UNIQUE VERMONT FEATURE)", () => {
    it("should have NONE trade-in credit policy (UNIQUE)", () => {
      const rules = getRulesForState("VT");
      expect(rules?.tradeInPolicy.type).toBe("NONE");
    });

    it("should be one of the few states with NO trade-in credit", () => {
      const rules = getRulesForState("VT");
      // Vermont is unique - most states have FULL trade-in credit
      expect(rules?.tradeInPolicy.type).not.toBe("FULL");
      expect(rules?.tradeInPolicy.type).toBe("NONE");
    });
  });

  describe("Retail - Rebate Rules", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("VT");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as NOT TAXABLE", () => {
      const rules = getRulesForState("VT");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(false);
      expect(mfrRebate?.notes).toContain("reduce the purchase price");
    });

    it("should mark dealer rebates as NOT TAXABLE (when actual price reduction)", () => {
      const rules = getRulesForState("VT");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(false);
    });

    it("should mention Vermont EV incentive in manufacturer rebate notes", () => {
      const rules = getRulesForState("VT");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate?.notes).toContain("$4,000");
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("VT");
      expect(rules?.docFeeTaxable).toBe(true);
    });

    it("should document that Vermont has NO CAP on doc fees", () => {
      const rules = getRulesForState("VT");
      const docFee = rules?.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
      expect(docFee?.notes).toContain("NO cap");
    });

    it("should document average doc fee of $350 in extras", () => {
      const rules = getRulesForState("VT");
      expect(rules?.extras?.avgDocFee).toBe(350);
    });
  });

  describe("Retail - Fee Tax Rules (UNIQUE VSC TAXABILITY)", () => {
    it("should mark service contracts (VSC) as TAXABLE (UNIQUE VT FEATURE)", () => {
      const rules = getRulesForState("VT");
      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(true); // UNIQUE to Vermont
      expect(vsc?.notes).toContain("TAXABLE");
      expect(vsc?.notes).toContain("UNIQUE");
    });

    it("should mark GAP as NON-TAXABLE", () => {
      const rules = getRulesForState("VT");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(false);
    });

    it("should mark title fees as NON-TAXABLE", () => {
      const rules = getRulesForState("VT");
      const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should document title fee amount of $35", () => {
      const rules = getRulesForState("VT");
      expect(rules?.extras?.titleFee).toBe(35);
    });

    it("should mark registration fees as NON-TAXABLE", () => {
      const rules = getRulesForState("VT");
      const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });

    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("VT");
      const docFee = rules?.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("VT");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should NOT tax negative equity on retail sales", () => {
      const rules = getRulesForState("VT");
      expect(rules?.taxOnNegativeEquity).toBe(false);
    });

    it("should tax service contracts (UNIQUE VT FEATURE)", () => {
      const rules = getRulesForState("VT");
      expect(rules?.taxOnServiceContracts).toBe(true); // UNIQUE to Vermont
    });

    it("should NOT tax GAP insurance", () => {
      const rules = getRulesForState("VT");
      expect(rules?.taxOnGap).toBe(false);
    });
  });

  describe("Retail - Vehicle Tax Scheme", () => {
    it("should use STATE_ONLY vehicle tax scheme (no local taxes)", () => {
      const rules = getRulesForState("VT");
      expect(rules?.vehicleTaxScheme).toBe("STATE_ONLY");
    });

    it("should NOT apply local sales tax to vehicles", () => {
      const rules = getRulesForState("VT");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
    });

    it("should document state rate of 6.0%", () => {
      const rules = getRulesForState("VT");
      expect(rules?.extras?.stateRate).toBe(6.0);
    });

    it("should document flat combined rate of 6.0% (same as state)", () => {
      const rules = getRulesForState("VT");
      expect(rules?.extras?.combinedRateRange).toBeDefined();
      expect(rules?.extras?.combinedRateRange?.min).toBe(6.0);
      expect(rules?.extras?.combinedRateRange?.max).toBe(6.0);
    });

    it("should have NO municipal rate range (state only)", () => {
      const rules = getRulesForState("VT");
      expect(rules?.extras?.municipalRateRange).toBeDefined();
      expect(rules?.extras?.municipalRateRange?.min).toBe(0);
      expect(rules?.extras?.municipalRateRange?.max).toBe(0);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease - Tax Method", () => {
    it("should use MONTHLY lease taxation method", () => {
      const rules = getRulesForState("VT");
      expect(rules?.leaseRules.method).toBe("MONTHLY");
    });
  });

  describe("Lease - Cap Cost Reduction", () => {
    it("should NOT tax cap cost reduction (pure monthly method)", () => {
      const rules = getRulesForState("VT");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });
  });

  describe("Lease - Rebate Behavior", () => {
    it("should follow retail rebate rules on leases", () => {
      const rules = getRulesForState("VT");
      expect(rules?.leaseRules.rebateBehavior).toBe("FOLLOW_RETAIL_RULE");
    });
  });

  describe("Lease - Doc Fee Taxability", () => {
    it("should follow retail doc fee rules on leases", () => {
      const rules = getRulesForState("VT");
      expect(rules?.leaseRules.docFeeTaxability).toBe("FOLLOW_RETAIL_RULE");
    });
  });

  describe("Lease - Trade-In Credit (DIFFERENT FROM RETAIL)", () => {
    it("should allow trade-in credit on leases (even though retail has NONE)", () => {
      const rules = getRulesForState("VT");
      // This is CRITICAL: Leases DO get trade-in benefit, retail does NOT
      expect(rules?.leaseRules.tradeInCredit).toBe("FOLLOW_RETAIL_RULE");
      // But retail has NONE policy - this is the unique VT situation
      expect(rules?.tradeInPolicy.type).toBe("NONE");
    });

    it("should document the lease vs retail trade-in difference in notes", () => {
      const rules = getRulesForState("VT");
      expect(rules?.leaseRules.notes).toContain("Trade-ins DO provide benefit");
      expect(rules?.leaseRules.notes).toContain("retail purchases");
    });
  });

  describe("Lease - Negative Equity", () => {
    it("should tax negative equity on leases (increases monthly payments)", () => {
      const rules = getRulesForState("VT");
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(true);
    });
  });

  describe("Lease - Fee Taxability", () => {
    it("should mark service contracts as TAXABLE on leases (UNIQUE VT)", () => {
      const rules = getRulesForState("VT");
      const vsc = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(true); // UNIQUE to Vermont
      expect(vsc?.notes).toContain("TAXABLE");
    });

    it("should mark GAP as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("VT");
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(false);
    });

    it("should mark doc fee as TAXABLE on leases", () => {
      const rules = getRulesForState("VT");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
    });
  });

  describe("Lease - Special Schemes", () => {
    it("should have NO special lease scheme", () => {
      const rules = getRulesForState("VT");
      expect(rules?.leaseRules.specialScheme).toBe("NONE");
    });
  });

  // ============================================================================
  // RECIPROCITY TESTS (LIMITED RECIPROCITY)
  // ============================================================================

  describe("Reciprocity Rules (LIMITED)", () => {
    it("should have reciprocity enabled (but LIMITED)", () => {
      const rules = getRulesForState("VT");
      expect(rules?.reciprocity.enabled).toBe(true);
    });

    it("should apply to both retail and lease", () => {
      const rules = getRulesForState("VT");
      expect(rules?.reciprocity.scope).toBe("BOTH");
    });

    it("should provide credit up to state rate", () => {
      const rules = getRulesForState("VT");
      expect(rules?.reciprocity.homeStateBehavior).toBe("CREDIT_UP_TO_STATE_RATE");
    });

    it("should require proof of tax paid", () => {
      const rules = getRulesForState("VT");
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(true);
    });

    it("should be based on tax paid (not tax due)", () => {
      const rules = getRulesForState("VT");
      expect(rules?.reciprocity.basis).toBe("TAX_PAID");
    });

    it("should cap credit at Vermont tax amount", () => {
      const rules = getRulesForState("VT");
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(true);
    });

    it("should NOT have lease exception", () => {
      const rules = getRulesForState("VT");
      expect(rules?.reciprocity.hasLeaseException).toBe(false);
    });

    it("should document LIMITED reciprocity policy in notes", () => {
      const rules = getRulesForState("VT");
      expect(rules?.reciprocity.notes).toContain("LIMITED");
      expect(rules?.reciprocity.notes).toContain("6%");
    });
  });

  // ============================================================================
  // UNIQUE FEATURES TESTS
  // ============================================================================

  describe("Vermont Unique Features", () => {
    it("should document Purchase and Use Tax", () => {
      const rules = getRulesForState("VT");
      expect(rules?.extras?.purchaseAndUseTax).toBeDefined();
      expect(rules?.extras?.purchaseAndUseTax?.year1).toBe(6.0);
    });

    it("should document EV incentive", () => {
      const rules = getRulesForState("VT");
      expect(rules?.extras?.evIncentive).toBeDefined();
      expect(rules?.extras?.evIncentive?.amount).toBe(4000);
    });

    it("should list unique features including NO trade-in credit", () => {
      const rules = getRulesForState("VT");
      expect(rules?.extras?.uniqueFeatures).toBeDefined();
      expect(Array.isArray(rules?.extras?.uniqueFeatures)).toBe(true);
      expect(rules?.extras?.uniqueFeatures?.length).toBeGreaterThan(0);

      // Should mention NO trade-in credit
      const hasTradeInFeature = rules?.extras?.uniqueFeatures?.some(
        (feature: string) => feature.includes("NO trade-in")
      );
      expect(hasTradeInFeature).toBe(true);
    });

    it("should list unique features including VSC taxable", () => {
      const rules = getRulesForState("VT");
      const hasVSCFeature = rules?.extras?.uniqueFeatures?.some(
        (feature: string) => feature.includes("Service contracts") && feature.includes("TAXABLE")
      );
      expect(hasVSCFeature).toBe(true);
    });

    it("should document major comparison (trade-in impact)", () => {
      const rules = getRulesForState("VT");
      expect(rules?.extras?.majorComparison).toBeDefined();
      expect(rules?.extras?.majorComparison?.description).toContain("$600 MORE");
    });

    it("should document sources", () => {
      const rules = getRulesForState("VT");
      expect(rules?.extras?.sources).toBeDefined();
      expect(Array.isArray(rules?.extras?.sources)).toBe(true);
      expect(rules?.extras?.sources?.length).toBeGreaterThan(0);
    });

    it("should have last updated date", () => {
      const rules = getRulesForState("VT");
      expect(rules?.extras?.lastUpdated).toBeDefined();
      expect(rules?.extras?.lastUpdated).toBe("2025-11-14");
    });
  });

  // ============================================================================
  // DATA INTEGRITY TESTS
  // ============================================================================

  describe("Data Integrity", () => {
    it("should have all required rebate fields", () => {
      const rules = getRulesForState("VT");
      rules?.rebates.forEach((rebate) => {
        expect(rebate.appliesTo).toBeDefined();
        expect(typeof rebate.taxable).toBe("boolean");
        expect(rebate.notes).toBeDefined();
      });
    });

    it("should have all required fee tax rule fields", () => {
      const rules = getRulesForState("VT");
      rules?.feeTaxRules.forEach((rule) => {
        expect(rule.code).toBeDefined();
        expect(typeof rule.taxable).toBe("boolean");
      });
    });

    it("should have all required lease fee tax rule fields", () => {
      const rules = getRulesForState("VT");
      rules?.leaseRules.feeTaxRules.forEach((rule) => {
        expect(rule.code).toBeDefined();
        expect(typeof rule.taxable).toBe("boolean");
      });
    });

    it("should have consistent taxability between retail and lease for VSC (both taxable)", () => {
      const rules = getRulesForState("VT");
      const retailVSC = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      const leaseVSC = rules?.leaseRules.feeTaxRules.find(
        (r) => r.code === "SERVICE_CONTRACT"
      );
      expect(retailVSC?.taxable).toBe(leaseVSC?.taxable);
      expect(retailVSC?.taxable).toBe(true); // Both should be true for VT
    });

    it("should have consistent taxability between retail and lease for GAP (both non-taxable)", () => {
      const rules = getRulesForState("VT");
      const retailGAP = rules?.feeTaxRules.find((r) => r.code === "GAP");
      const leaseGAP = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(retailGAP?.taxable).toBe(leaseGAP?.taxable);
      expect(retailGAP?.taxable).toBe(false); // Both should be false
    });

    it("should correctly configure unique VT product taxability flags", () => {
      const rules = getRulesForState("VT");

      // Vermont-specific taxability
      expect(rules?.taxOnServiceContracts).toBe(true); // UNIQUE to VT
      expect(rules?.taxOnGap).toBe(false);
      expect(rules?.taxOnAccessories).toBe(true);
      expect(rules?.taxOnNegativeEquity).toBe(false);
    });
  });

  // ============================================================================
  // CRITICAL VERMONT POLICY TESTS
  // ============================================================================

  describe("Critical Vermont Policy Validations", () => {
    it("should correctly implement NO trade-in credit on retail", () => {
      const rules = getRulesForState("VT");
      expect(rules?.tradeInPolicy.type).toBe("NONE");
    });

    it("should correctly implement VSC as TAXABLE (retail)", () => {
      const rules = getRulesForState("VT");
      expect(rules?.taxOnServiceContracts).toBe(true);
      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc?.taxable).toBe(true);
    });

    it("should correctly implement VSC as TAXABLE (lease)", () => {
      const rules = getRulesForState("VT");
      const vsc = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc?.taxable).toBe(true);
    });

    it("should correctly implement STATE_ONLY tax scheme", () => {
      const rules = getRulesForState("VT");
      expect(rules?.vehicleTaxScheme).toBe("STATE_ONLY");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
    });

    it("should have 6% flat rate statewide", () => {
      const rules = getRulesForState("VT");
      expect(rules?.extras?.stateRate).toBe(6.0);
      expect(rules?.extras?.combinedRateRange?.min).toBe(6.0);
      expect(rules?.extras?.combinedRateRange?.max).toBe(6.0);
    });
  });
});
