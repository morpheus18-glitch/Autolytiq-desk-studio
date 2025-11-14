import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Nevada (NV) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load Nevada rules successfully", () => {
    const rules = getRulesForState("NV");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("NV");
  });

  it("should mark Nevada as implemented (not a stub)", () => {
    expect(isStateImplemented("NV")).toBe(true);
  });

  it("should have version number", () => {
    const rules = getRulesForState("NV");
    expect(rules?.version).toBe(1);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("NV");
    const rulesLower = getRulesForState("nv");
    const rulesMixed = getRulesForState("Nv");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("NV");
    expect(rulesLower?.stateCode).toBe("NV");
    expect(rulesMixed?.stateCode).toBe("NV");
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS
  // ============================================================================

  describe("Retail - Trade-In Policy", () => {
    it("should have FULL trade-in credit policy", () => {
      const rules = getRulesForState("NV");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });

    it("should apply full trade-in credit with no cap", () => {
      const rules = getRulesForState("NV");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
      // No cap property should exist for FULL type
      if (rules?.tradeInPolicy.type === "CAPPED") {
        expect(rules.tradeInPolicy.capAmount).toBeUndefined();
      }
    });
  });

  describe("Retail - Rebate Rules (CRITICAL)", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("NV");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("CRITICAL: Manufacturer rebates should be TAXABLE (unique to Nevada)", () => {
      const rules = getRulesForState("NV");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(true);
      expect(mfrRebate?.notes).toContain("CRITICAL");
      expect(mfrRebate?.notes).toContain("TAXABLE");
    });

    it("should have dealer rebates as NON-TAXABLE (reduce tax base)", () => {
      const rules = getRulesForState("NV");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(false);
    });

    it("should document the manufacturer vs dealer rebate distinction", () => {
      const rules = getRulesForState("NV");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");

      // Manufacturer should be taxable, dealer should not be
      expect(mfrRebate?.taxable).toBe(true);
      expect(dealerRebate?.taxable).toBe(false);

      // Both should have explanatory notes
      expect(mfrRebate?.notes).toBeTruthy();
      expect(dealerRebate?.notes).toBeTruthy();
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("NV");
      expect(rules?.docFeeTaxable).toBe(true);
    });

    it("should have doc fee taxability in fee tax rules", () => {
      const rules = getRulesForState("NV");
      const docFee = rules?.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
      expect(docFee?.notes).toContain("TAXABLE");
      expect(docFee?.notes).toContain("No cap");
    });

    it("should document that Nevada has NO CAP on doc fees", () => {
      const rules = getRulesForState("NV");
      expect(rules?.extras?.docFeeCap).toBeNull();
      expect(rules?.extras?.avgDocFee).toBeGreaterThan(0);
    });
  });

  describe("Retail - Fee Tax Rules", () => {
    it("should mark service contracts (VSC) as LIKELY TAXABLE", () => {
      const rules = getRulesForState("NV");
      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(true);
      expect(vsc?.notes).toContain("LIKELY TAXABLE");
    });

    it("should mark GAP as LIKELY TAXABLE", () => {
      const rules = getRulesForState("NV");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(true);
      expect(gap?.notes).toContain("LIKELY TAXABLE");
    });

    it("should mark title fees as NON-TAXABLE", () => {
      const rules = getRulesForState("NV");
      const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-TAXABLE", () => {
      const rules = getRulesForState("NV");
      const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("NV");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should NOT tax negative equity (not explicitly documented)", () => {
      const rules = getRulesForState("NV");
      expect(rules?.taxOnNegativeEquity).toBe(false);
    });

    it("should tax service contracts", () => {
      const rules = getRulesForState("NV");
      expect(rules?.taxOnServiceContracts).toBe(true);
    });

    it("should tax GAP", () => {
      const rules = getRulesForState("NV");
      expect(rules?.taxOnGap).toBe(true);
    });
  });

  describe("Retail - Vehicle Tax Scheme", () => {
    it("should use STATE_PLUS_LOCAL vehicle tax scheme", () => {
      const rules = getRulesForState("NV");
      expect(rules?.vehicleTaxScheme).toBe("STATE_PLUS_LOCAL");
    });

    it("should apply local sales tax to vehicles", () => {
      const rules = getRulesForState("NV");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(true);
    });

    it("should document state rate of 4.6%", () => {
      const rules = getRulesForState("NV");
      expect(rules?.extras?.stateRate).toBe(4.6);
    });

    it("should document combined rate range (6.85% - 8.375%)", () => {
      const rules = getRulesForState("NV");
      expect(rules?.extras?.combinedRateRange).toBeDefined();
      expect(rules?.extras?.combinedRateRange?.min).toBe(6.85);
      expect(rules?.extras?.combinedRateRange?.max).toBe(8.375);
    });

    it("should document major county rates", () => {
      const rules = getRulesForState("NV");
      expect(rules?.extras?.majorCountyRates).toBeDefined();
      expect(rules?.extras?.majorCountyRates?.["Clark (Las Vegas)"]).toBe(8.375);
      expect(rules?.extras?.majorCountyRates?.["Washoe (Reno)"]).toBe(7.955);
      expect(rules?.extras?.majorCountyRates?.["Carson City"]).toBe(7.075);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease - Tax Method", () => {
    it("should use MONTHLY lease taxation method", () => {
      const rules = getRulesForState("NV");
      expect(rules?.leaseRules.method).toBe("MONTHLY");
    });

    it("should NOT tax cap cost reduction directly (reduces payment indirectly)", () => {
      const rules = getRulesForState("NV");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });

    it("should NOT tax fees upfront (monthly taxation)", () => {
      const rules = getRulesForState("NV");
      expect(rules?.leaseRules.taxFeesUpfront).toBe(false);
    });

    it("should have no special lease scheme", () => {
      const rules = getRulesForState("NV");
      expect(rules?.leaseRules.specialScheme).toBe("NONE");
    });
  });

  describe("Lease - Rebates and Incentives", () => {
    it("should follow retail rebate rules for leases", () => {
      const rules = getRulesForState("NV");
      expect(rules?.leaseRules.rebateBehavior).toBe("FOLLOW_RETAIL_RULE");
    });
  });

  describe("Lease - Documentation Fee", () => {
    it("should ALWAYS tax doc fee on leases", () => {
      const rules = getRulesForState("NV");
      expect(rules?.leaseRules.docFeeTaxability).toBe("ALWAYS");
    });

    it("should have doc fee as taxable in lease fee rules", () => {
      const rules = getRulesForState("NV");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
    });
  });

  describe("Lease - Trade-In Credit", () => {
    it("should provide FULL trade-in credit on leases", () => {
      const rules = getRulesForState("NV");
      expect(rules?.leaseRules.tradeInCredit).toBe("FULL");
    });

    it("should NOT tax negative equity on leases", () => {
      const rules = getRulesForState("NV");
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(false);
    });
  });

  describe("Lease - Backend Products", () => {
    it("should mark service contracts as TAXABLE on leases", () => {
      const rules = getRulesForState("NV");
      const vsc = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(true);
      expect(vsc?.notes).toContain("LIKELY TAXABLE");
    });

    it("should mark GAP as TAXABLE on leases", () => {
      const rules = getRulesForState("NV");
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(true);
      expect(gap?.notes).toContain("LIKELY TAXABLE");
    });

    it("should mark title fees as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("NV");
      const title = rules?.leaseRules.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("NV");
      const reg = rules?.leaseRules.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Lease - Title Fee Rules", () => {
    it("should have title fee configuration in lease title fee rules", () => {
      const rules = getRulesForState("NV");
      const titleRule = rules?.leaseRules.titleFeeRules.find((r) => r.code === "TITLE");

      expect(titleRule).toBeDefined();
      expect(titleRule?.taxable).toBe(false);
      expect(titleRule?.includedInCapCost).toBe(true);
      expect(titleRule?.includedInUpfront).toBe(true);
      expect(titleRule?.includedInMonthly).toBe(false);
    });

    it("should have registration fee configuration in lease title fee rules", () => {
      const rules = getRulesForState("NV");
      const regRule = rules?.leaseRules.titleFeeRules.find((r) => r.code === "REG");

      expect(regRule).toBeDefined();
      expect(regRule?.taxable).toBe(false);
      expect(regRule?.includedInCapCost).toBe(true);
      expect(regRule?.includedInUpfront).toBe(true);
      expect(regRule?.includedInMonthly).toBe(false);
    });
  });

  describe("Lease - Comprehensive Notes", () => {
    it("should have detailed lease notes", () => {
      const rules = getRulesForState("NV");
      expect(rules?.leaseRules.notes).toBeDefined();
      expect(rules?.leaseRules.notes).toContain("MONTHLY");
      expect(rules?.leaseRules.notes).toContain("Trade-in");
      expect(rules?.leaseRules.notes).toContain("Doc fee TAXABLE");
    });
  });

  // ============================================================================
  // RECIPROCITY TESTS
  // ============================================================================

  describe("Reciprocity - General Rules", () => {
    it("should have reciprocity ENABLED", () => {
      const rules = getRulesForState("NV");
      expect(rules?.reciprocity.enabled).toBe(true);
    });

    it("should apply reciprocity to BOTH retail and lease", () => {
      const rules = getRulesForState("NV");
      expect(rules?.reciprocity.scope).toBe("BOTH");
    });

    it("should use CREDIT_UP_TO_STATE_RATE behavior", () => {
      const rules = getRulesForState("NV");
      expect(rules?.reciprocity.homeStateBehavior).toBe("CREDIT_UP_TO_STATE_RATE");
    });

    it("should require proof of tax paid", () => {
      const rules = getRulesForState("NV");
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(true);
    });

    it("should base credit on TAX_PAID", () => {
      const rules = getRulesForState("NV");
      expect(rules?.reciprocity.basis).toBe("TAX_PAID");
    });

    it("should cap credit at Nevada's tax amount", () => {
      const rules = getRulesForState("NV");
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(true);
    });

    it("should NOT have lease exceptions", () => {
      const rules = getRulesForState("NV");
      expect(rules?.reciprocity.hasLeaseException).toBe(false);
    });
  });

  describe("Reciprocity - Special Cases", () => {
    it("should have Utah reciprocity override (special case)", () => {
      const rules = getRulesForState("NV");
      expect(rules?.reciprocity.overrides).toBeDefined();
      expect(rules?.reciprocity.overrides?.length).toBeGreaterThan(0);

      const utahOverride = rules?.reciprocity.overrides?.find(
        (o) => o.originState === "UT"
      );
      expect(utahOverride).toBeDefined();
      expect(utahOverride?.notes).toContain("Utah");
      expect(utahOverride?.notes).toContain("don't collect");
    });

    it("should have comprehensive reciprocity notes", () => {
      const rules = getRulesForState("NV");
      expect(rules?.reciprocity.notes).toBeDefined();
      expect(rules?.reciprocity.notes).toContain("credit");
      expect(rules?.reciprocity.notes).toContain("Nevada's rate");
      expect(rules?.reciprocity.notes).toContain("UTAH");
    });
  });

  // ============================================================================
  // EXTRAS AND METADATA TESTS
  // ============================================================================

  describe("Extras - Documentation", () => {
    it("should have last updated date", () => {
      const rules = getRulesForState("NV");
      expect(rules?.extras?.lastUpdated).toBe("2025-11-13");
    });

    it("should have comprehensive sources array", () => {
      const rules = getRulesForState("NV");
      expect(rules?.extras?.sources).toBeDefined();
      expect(Array.isArray(rules?.extras?.sources)).toBe(true);
      expect(rules?.extras?.sources?.length).toBeGreaterThan(5);
    });

    it("should have detailed notes about Nevada tax system", () => {
      const rules = getRulesForState("NV");
      expect(rules?.extras?.notes).toBeDefined();
      expect(rules?.extras?.notes).toContain("4.6%");
      expect(rules?.extras?.notes).toContain("Clark County");
      expect(rules?.extras?.notes).toContain("CRITICAL");
      expect(rules?.extras?.notes).toContain("Manufacturer rebates are TAXABLE");
    });
  });

  describe("Extras - Governmental Services Tax (GST)", () => {
    it("should document GST as separate from sales tax", () => {
      const rules = getRulesForState("NV");
      expect(rules?.extras?.governmentalServicesTax).toBeDefined();
    });

    it("should have GST basic rate of 4%", () => {
      const rules = getRulesForState("NV");
      expect(rules?.extras?.governmentalServicesTax?.basicRate).toBe(4.0);
    });

    it("should have GST supplemental rate of 1%", () => {
      const rules = getRulesForState("NV");
      expect(rules?.extras?.governmentalServicesTax?.supplementalRate).toBe(1.0);
    });

    it("should have GST minimum of $16", () => {
      const rules = getRulesForState("NV");
      expect(rules?.extras?.governmentalServicesTax?.minimumGST).toBe(16);
    });

    it("should list counties with supplemental GST", () => {
      const rules = getRulesForState("NV");
      expect(rules?.extras?.governmentalServicesTax?.applicableCounties).toContain("Clark");
      expect(rules?.extras?.governmentalServicesTax?.applicableCounties).toContain("Churchill");
    });

    it("should have GST description", () => {
      const rules = getRulesForState("NV");
      expect(rules?.extras?.governmentalServicesTax?.description).toBeDefined();
      expect(rules?.extras?.governmentalServicesTax?.description).toContain("MSRP");
      expect(rules?.extras?.governmentalServicesTax?.description).toContain("depreciat");
    });

    it("should have GST notes about military exemption", () => {
      const rules = getRulesForState("NV");
      expect(rules?.extras?.governmentalServicesTax?.notes).toContain("military");
      expect(rules?.extras?.governmentalServicesTax?.notes).toContain("exempt");
    });
  });

  describe("Extras - Nevada-Specific Features", () => {
    it("should document private party sales exemption", () => {
      const rules = getRulesForState("NV");
      expect(rules?.extras?.privatePartySalesExempt).toBe(true);
    });

    it("should document no state income tax", () => {
      const rules = getRulesForState("NV");
      expect(rules?.extras?.noStateIncomeTax).toBe(true);
    });

    it("should have average doc fee documented", () => {
      const rules = getRulesForState("NV");
      expect(rules?.extras?.avgDocFee).toBeGreaterThan(0);
      expect(rules?.extras?.avgDocFee).toBeGreaterThanOrEqual(440);
      expect(rules?.extras?.avgDocFee).toBeLessThanOrEqual(499);
    });

    it("should explicitly document NO doc fee cap", () => {
      const rules = getRulesForState("NV");
      expect(rules?.extras?.docFeeCap).toBeNull();
    });
  });

  // ============================================================================
  // EDGE CASES AND SPECIAL SCENARIOS
  // ============================================================================

  describe("Edge Cases - Critical Distinctions", () => {
    it("should clearly distinguish between manufacturer and dealer rebates", () => {
      const rules = getRulesForState("NV");

      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");

      // These should be OPPOSITE in Nevada (unique!)
      expect(mfrRebate?.taxable).toBe(true);
      expect(dealerRebate?.taxable).toBe(false);

      // Both should have clear documentation
      expect(mfrRebate?.notes?.length).toBeGreaterThan(50);
      expect(dealerRebate?.notes?.length).toBeGreaterThan(50);
    });

    it("should handle negative equity consistently across retail and lease", () => {
      const rules = getRulesForState("NV");

      // Both retail and lease should NOT tax negative equity
      expect(rules?.taxOnNegativeEquity).toBe(false);
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(false);
    });

    it("should handle trade-in consistently across retail and lease", () => {
      const rules = getRulesForState("NV");

      // Both should provide FULL trade-in credit
      expect(rules?.tradeInPolicy.type).toBe("FULL");
      expect(rules?.leaseRules.tradeInCredit).toBe("FULL");
    });
  });

  describe("Edge Cases - Backend Products", () => {
    it("should treat VSC and GAP as LIKELY taxable (conservative approach)", () => {
      const rules = getRulesForState("NV");

      // Retail
      expect(rules?.taxOnServiceContracts).toBe(true);
      expect(rules?.taxOnGap).toBe(true);

      // Lease
      const leaseVSC = rules?.leaseRules.feeTaxRules.find(
        (r) => r.code === "SERVICE_CONTRACT"
      );
      const leaseGAP = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(leaseVSC?.taxable).toBe(true);
      expect(leaseGAP?.taxable).toBe(true);
    });

    it("should document that VSC/GAP taxability is based on structure", () => {
      const rules = getRulesForState("NV");

      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");

      expect(vsc?.notes).toContain("LIKELY");
      expect(gap?.notes).toContain("LIKELY");
      expect(vsc?.notes).toContain("insurance");
      expect(gap?.notes).toContain("insurance");
    });
  });

  // ============================================================================
  // COMPREHENSIVE INTEGRATION TESTS
  // ============================================================================

  describe("Integration - Complete Rule Validation", () => {
    it("should have all required retail fields populated", () => {
      const rules = getRulesForState("NV");

      expect(rules?.stateCode).toBeDefined();
      expect(rules?.version).toBeDefined();
      expect(rules?.tradeInPolicy).toBeDefined();
      expect(rules?.rebates).toBeDefined();
      expect(rules?.docFeeTaxable).toBeDefined();
      expect(rules?.feeTaxRules).toBeDefined();
      expect(rules?.taxOnAccessories).toBeDefined();
      expect(rules?.taxOnNegativeEquity).toBeDefined();
      expect(rules?.taxOnServiceContracts).toBeDefined();
      expect(rules?.taxOnGap).toBeDefined();
      expect(rules?.vehicleTaxScheme).toBeDefined();
      expect(rules?.vehicleUsesLocalSalesTax).toBeDefined();
    });

    it("should have all required lease fields populated", () => {
      const rules = getRulesForState("NV");

      expect(rules?.leaseRules.method).toBeDefined();
      expect(rules?.leaseRules.taxCapReduction).toBeDefined();
      expect(rules?.leaseRules.rebateBehavior).toBeDefined();
      expect(rules?.leaseRules.docFeeTaxability).toBeDefined();
      expect(rules?.leaseRules.tradeInCredit).toBeDefined();
      expect(rules?.leaseRules.negativeEquityTaxable).toBeDefined();
      expect(rules?.leaseRules.feeTaxRules).toBeDefined();
      expect(rules?.leaseRules.titleFeeRules).toBeDefined();
      expect(rules?.leaseRules.taxFeesUpfront).toBeDefined();
      expect(rules?.leaseRules.specialScheme).toBeDefined();
    });

    it("should have all required reciprocity fields populated", () => {
      const rules = getRulesForState("NV");

      expect(rules?.reciprocity.enabled).toBeDefined();
      expect(rules?.reciprocity.scope).toBeDefined();
      expect(rules?.reciprocity.homeStateBehavior).toBeDefined();
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBeDefined();
      expect(rules?.reciprocity.basis).toBeDefined();
      expect(rules?.reciprocity.capAtThisStatesTax).toBeDefined();
      expect(rules?.reciprocity.hasLeaseException).toBeDefined();
    });

    it("should have comprehensive extras metadata", () => {
      const rules = getRulesForState("NV");

      expect(rules?.extras?.lastUpdated).toBeDefined();
      expect(rules?.extras?.sources).toBeDefined();
      expect(rules?.extras?.notes).toBeDefined();
      expect(rules?.extras?.stateRate).toBeDefined();
      expect(rules?.extras?.combinedRateRange).toBeDefined();
      expect(rules?.extras?.majorCountyRates).toBeDefined();
      expect(rules?.extras?.governmentalServicesTax).toBeDefined();
    });
  });

  describe("Integration - Logical Consistency", () => {
    it("should have consistent doc fee treatment across retail and lease", () => {
      const rules = getRulesForState("NV");

      // Both should be taxable
      expect(rules?.docFeeTaxable).toBe(true);
      expect(rules?.leaseRules.docFeeTaxability).toBe("ALWAYS");

      // Both should have doc fee in fee rules
      const retailDocFee = rules?.feeTaxRules.find((r) => r.code === "DOC_FEE");
      const leaseDocFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(retailDocFee?.taxable).toBe(true);
      expect(leaseDocFee?.taxable).toBe(true);
    });

    it("should have consistent government fee treatment across retail and lease", () => {
      const rules = getRulesForState("NV");

      // Title fees should be non-taxable in both
      const retailTitle = rules?.feeTaxRules.find((r) => r.code === "TITLE");
      const leaseTitle = rules?.leaseRules.feeTaxRules.find((r) => r.code === "TITLE");
      expect(retailTitle?.taxable).toBe(false);
      expect(leaseTitle?.taxable).toBe(false);

      // Registration fees should be non-taxable in both
      const retailReg = rules?.feeTaxRules.find((r) => r.code === "REG");
      const leaseReg = rules?.leaseRules.feeTaxRules.find((r) => r.code === "REG");
      expect(retailReg?.taxable).toBe(false);
      expect(leaseReg?.taxable).toBe(false);
    });

    it("should have at least 5 fee tax rules for retail", () => {
      const rules = getRulesForState("NV");
      expect(rules?.feeTaxRules.length).toBeGreaterThanOrEqual(5);
    });

    it("should have at least 5 fee tax rules for lease", () => {
      const rules = getRulesForState("NV");
      expect(rules?.leaseRules.feeTaxRules.length).toBeGreaterThanOrEqual(5);
    });

    it("should have at least 2 title fee rules for lease", () => {
      const rules = getRulesForState("NV");
      expect(rules?.leaseRules.titleFeeRules.length).toBeGreaterThanOrEqual(2);
    });
  });
});
