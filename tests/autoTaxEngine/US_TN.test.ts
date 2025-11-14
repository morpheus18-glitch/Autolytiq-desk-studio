import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Tennessee (TN) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load Tennessee rules successfully", () => {
    const rules = getRulesForState("TN");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("TN");
  });

  it("should mark Tennessee as implemented (not a stub)", () => {
    expect(isStateImplemented("TN")).toBe(true);
  });

  it("should have version number 2", () => {
    const rules = getRulesForState("TN");
    expect(rules?.version).toBe(2);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("TN");
    const rulesLower = getRulesForState("tn");
    const rulesMixed = getRulesForState("Tn");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("TN");
    expect(rulesLower?.stateCode).toBe("TN");
    expect(rulesMixed?.stateCode).toBe("TN");
  });

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  describe("Retail Trade-In Policy", () => {
    it("should have FULL trade-in credit (state + local)", () => {
      const rules = getRulesForState("TN");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });

    it("should apply trade-in credit to both state and local taxes", () => {
      const rules = getRulesForState("TN");
      // Tennessee applies trade-in credit to BOTH state and local
      // (unlike Alabama which only applies to state)
      expect(rules?.tradeInPolicy.type).toBe("FULL");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(true);
    });
  });

  describe("Retail Rebate Rules", () => {
    it("should have rebate rules for both manufacturer and dealer", () => {
      const rules = getRulesForState("TN");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as NON-TAXABLE (reduce sale price)", () => {
      const rules = getRulesForState("TN");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate?.taxable).toBe(false);
      expect(mfrRebate?.notes).toContain("reduce");
    });

    it("should mark dealer incentive payments as NON-TAXABLE per TCA § 67-6-341", () => {
      const rules = getRulesForState("TN");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate?.taxable).toBe(false);
      expect(dealerRebate?.notes).toContain("67-6-341");
    });
  });

  describe("Retail Doc Fee", () => {
    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("TN");
      expect(rules?.docFeeTaxable).toBe(true);
    });

    it("should have CAPPED doc fees at $495 (statutory limit)", () => {
      const rules = getRulesForState("TN");
      const docFee = rules?.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee?.taxable).toBe(true);
      expect(docFee?.notes).toContain("$495");
      expect(docFee?.notes).toContain("55-3-122");
    });
  });

  describe("Retail Fee Taxability", () => {
    it("should mark service contracts as TAXABLE (unusual TN feature)", () => {
      const rules = getRulesForState("TN");
      const serviceContract = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(serviceContract?.taxable).toBe(true);
      expect(serviceContract?.notes).toContain("TAXES");
      expect(serviceContract?.notes).toContain("unusual");
      expect(serviceContract?.notes).toContain("67-6-208");
    });

    it("should mark GAP as NOT TAXABLE (insurance product)", () => {
      const rules = getRulesForState("TN");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap?.taxable).toBe(false);
      expect(gap?.notes).toContain("NOT taxable");
      expect(gap?.notes).toContain("insurance");
    });

    it("should mark title fees as NON-taxable", () => {
      const rules = getRulesForState("TN");
      const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-taxable", () => {
      const rules = getRulesForState("TN");
      const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg?.taxable).toBe(false);
    });

    it("should mark wheel tax as NON-taxable (annual county tax)", () => {
      const rules = getRulesForState("TN");
      const wheelTax = rules?.feeTaxRules.find((r) => r.code === "WHEEL_TAX");
      expect(wheelTax?.taxable).toBe(false);
      expect(wheelTax?.notes).toContain("annual county");
    });
  });

  describe("Retail Product Taxability", () => {
    it("should mark accessories as TAXABLE", () => {
      const rules = getRulesForState("TN");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should mark negative equity as TAXABLE (retail)", () => {
      const rules = getRulesForState("TN");
      expect(rules?.taxOnNegativeEquity).toBe(true);
    });

    it("should mark service contracts as TAXABLE (unusual TN feature)", () => {
      const rules = getRulesForState("TN");
      expect(rules?.taxOnServiceContracts).toBe(true);
    });

    it("should mark GAP as NOT TAXABLE", () => {
      const rules = getRulesForState("TN");
      expect(rules?.taxOnGap).toBe(false);
    });
  });

  describe("Vehicle Tax Scheme", () => {
    it("should use STATE_PLUS_LOCAL scheme", () => {
      const rules = getRulesForState("TN");
      expect(rules?.vehicleTaxScheme).toBe("STATE_PLUS_LOCAL");
    });

    it("should enable local sales tax", () => {
      const rules = getRulesForState("TN");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(true);
    });

    it("should have single article tax cap information in extras", () => {
      const rules = getRulesForState("TN");
      expect(rules?.extras?.singleArticleCapLow).toBe(1600);
      expect(rules?.extras?.singleArticleCapHigh).toBe(3200);
      expect(rules?.extras?.singleArticleCapLowTax).toBe(112);
      expect(rules?.extras?.singleArticleCapHighTax).toBe(224);
    });

    it("should have 7% state rate documented", () => {
      const rules = getRulesForState("TN");
      expect(rules?.extras?.stateRate).toBe(7.0);
    });

    it("should have local rate ranges documented", () => {
      const rules = getRulesForState("TN");
      expect(rules?.extras?.typicalLocalRateNashville).toBe(2.25);
      expect(rules?.extras?.typicalLocalRateMemphis).toBe(2.75);
      expect(rules?.extras?.minCombinedRate).toBe(9.25);
      expect(rules?.extras?.maxCombinedRate).toBe(9.75);
    });

    it("should have major jurisdictions documented", () => {
      const rules = getRulesForState("TN");
      expect(rules?.extras?.majorJurisdictions?.Memphis).toEqual({
        state: 7.0,
        local: 2.75,
        total: 9.75,
      });
      expect(rules?.extras?.majorJurisdictions?.Nashville).toEqual({
        state: 7.0,
        local: 2.25,
        total: 9.25,
      });
    });
  });

  // ============================================================================
  // LEASE TRANSACTION RULES
  // ============================================================================

  describe("Lease Method", () => {
    it("should use MONTHLY lease taxation method", () => {
      const rules = getRulesForState("TN");
      expect(rules?.leaseRules.method).toBe("MONTHLY");
    });

    it("should NOT tax cap cost reduction upfront", () => {
      const rules = getRulesForState("TN");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });
  });

  describe("Lease Rebate Behavior", () => {
    it("should follow retail rule for rebates on leases", () => {
      const rules = getRulesForState("TN");
      expect(rules?.leaseRules.rebateBehavior).toBe("FOLLOW_RETAIL_RULE");
    });
  });

  describe("Lease Doc Fee", () => {
    it("should ALWAYS tax doc fee on leases", () => {
      const rules = getRulesForState("TN");
      expect(rules?.leaseRules.docFeeTaxability).toBe("ALWAYS");
    });

    it("should have doc fee taxable in lease fee rules", () => {
      const rules = getRulesForState("TN");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee?.taxable).toBe(true);
      expect(docFee?.notes).toContain("$495");
    });
  });

  describe("Lease Trade-In Credit", () => {
    it("should have FULL trade-in credit on leases", () => {
      const rules = getRulesForState("TN");
      expect(rules?.leaseRules.tradeInCredit).toBe("FULL");
    });

    it("should differ from Alabama (which has NO lease trade-in credit)", () => {
      const tnRules = getRulesForState("TN");
      const alRules = getRulesForState("AL");
      expect(tnRules?.leaseRules.tradeInCredit).toBe("FULL");
      expect(alRules?.leaseRules.tradeInCredit).toBe("NONE");
    });
  });

  describe("Lease Negative Equity", () => {
    it("should mark negative equity as TAXABLE on leases", () => {
      const rules = getRulesForState("TN");
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(true);
    });
  });

  describe("Lease Fee Taxability", () => {
    it("should mark service contracts as TAXABLE on leases (unusual)", () => {
      const rules = getRulesForState("TN");
      const serviceContract = rules?.leaseRules.feeTaxRules.find(
        (r) => r.code === "SERVICE_CONTRACT"
      );
      expect(serviceContract?.taxable).toBe(true);
      expect(serviceContract?.notes).toContain("TAXABLE");
    });

    it("should mark GAP as NOT TAXABLE on leases", () => {
      const rules = getRulesForState("TN");
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap?.taxable).toBe(false);
    });

    it("should mark title fee as NOT TAXABLE on leases", () => {
      const rules = getRulesForState("TN");
      const title = rules?.leaseRules.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title?.taxable).toBe(false);
    });

    it("should mark wheel tax as NOT TAXABLE on leases", () => {
      const rules = getRulesForState("TN");
      const wheelTax = rules?.leaseRules.feeTaxRules.find((r) => r.code === "WHEEL_TAX");
      expect(wheelTax?.taxable).toBe(false);
    });
  });

  describe("Lease Title Fee Rules", () => {
    it("should have title fee rules configured", () => {
      const rules = getRulesForState("TN");
      const titleRule = rules?.leaseRules.titleFeeRules.find((r) => r.code === "TITLE");
      expect(titleRule).toBeDefined();
      expect(titleRule?.taxable).toBe(false);
      expect(titleRule?.includedInCapCost).toBe(true);
      expect(titleRule?.includedInUpfront).toBe(true);
      expect(titleRule?.includedInMonthly).toBe(false);
    });

    it("should have wheel tax fee rules configured", () => {
      const rules = getRulesForState("TN");
      const wheelTaxRule = rules?.leaseRules.titleFeeRules.find((r) => r.code === "WHEEL_TAX");
      expect(wheelTaxRule).toBeDefined();
      expect(wheelTaxRule?.taxable).toBe(false);
      expect(wheelTaxRule?.includedInCapCost).toBe(true);
      expect(wheelTaxRule?.includedInUpfront).toBe(true);
      expect(wheelTaxRule?.includedInMonthly).toBe(false);
    });
  });

  describe("Lease Tax Fees Upfront", () => {
    it("should tax fees upfront on leases", () => {
      const rules = getRulesForState("TN");
      expect(rules?.leaseRules.taxFeesUpfront).toBe(true);
    });
  });

  describe("Lease Special Scheme", () => {
    it("should have NONE special scheme (cap handled in rate calculation)", () => {
      const rules = getRulesForState("TN");
      expect(rules?.leaseRules.specialScheme).toBe("NONE");
    });
  });

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  describe("Reciprocity Policy", () => {
    it("should enable reciprocity", () => {
      const rules = getRulesForState("TN");
      expect(rules?.reciprocity.enabled).toBe(true);
    });

    it("should apply reciprocity to BOTH retail and lease", () => {
      const rules = getRulesForState("TN");
      expect(rules?.reciprocity.scope).toBe("BOTH");
    });

    it("should use CREDIT_UP_TO_STATE_RATE behavior", () => {
      const rules = getRulesForState("TN");
      expect(rules?.reciprocity.homeStateBehavior).toBe("CREDIT_UP_TO_STATE_RATE");
    });

    it("should require proof of tax paid", () => {
      const rules = getRulesForState("TN");
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(true);
    });

    it("should base credit on TAX_PAID", () => {
      const rules = getRulesForState("TN");
      expect(rules?.reciprocity.basis).toBe("TAX_PAID");
    });

    it("should cap credit at Tennessee's tax amount", () => {
      const rules = getRulesForState("TN");
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(true);
    });

    it("should NOT have lease exception", () => {
      const rules = getRulesForState("TN");
      expect(rules?.reciprocity.hasLeaseException).toBe(false);
    });

    it("should have notes mentioning single article cap in reciprocity", () => {
      const rules = getRulesForState("TN");
      expect(rules?.reciprocity.notes).toContain("single article");
      expect(rules?.reciprocity.notes).toContain("cap");
    });
  });

  // ============================================================================
  // EXTRAS AND DOCUMENTATION
  // ============================================================================

  describe("Extras and Metadata", () => {
    it("should have lastUpdated field", () => {
      const rules = getRulesForState("TN");
      expect(rules?.extras?.lastUpdated).toBeDefined();
      expect(rules?.extras?.lastUpdated).toContain("2025");
    });

    it("should have comprehensive sources list", () => {
      const rules = getRulesForState("TN");
      expect(rules?.extras?.sources).toBeDefined();
      expect(Array.isArray(rules?.extras?.sources)).toBe(true);
      expect((rules?.extras?.sources as string[]).length).toBeGreaterThan(5);
    });

    it("should reference TCA § 67-6-331 (single article tax cap)", () => {
      const rules = getRulesForState("TN");
      const sources = rules?.extras?.sources as string[];
      const hasCapStatute = sources.some((s) => s.includes("67-6-331"));
      expect(hasCapStatute).toBe(true);
    });

    it("should reference TCA § 67-6-208 (VSC taxability)", () => {
      const rules = getRulesForState("TN");
      const sources = rules?.extras?.sources as string[];
      const hasVSCStatute = sources.some((s) => s.includes("67-6-208"));
      expect(hasVSCStatute).toBe(true);
    });

    it("should reference TCA § 67-6-341 (dealer incentive payment credit)", () => {
      const rules = getRulesForState("TN");
      const sources = rules?.extras?.sources as string[];
      const hasIncentiveStatute = sources.some((s) => s.includes("67-6-341"));
      expect(hasIncentiveStatute).toBe(true);
    });

    it("should reference TCA § 55-3-122 (doc fee cap)", () => {
      const rules = getRulesForState("TN");
      const sources = rules?.extras?.sources as string[];
      const hasDocFeeStatute = sources.some((s) => s.includes("55-3-122"));
      expect(hasDocFeeStatute).toBe(true);
    });

    it("should have doc fee cap amount documented", () => {
      const rules = getRulesForState("TN");
      expect(rules?.extras?.docFeeCapAmount).toBe(495);
    });

    it("should have doc fee cap effective date documented", () => {
      const rules = getRulesForState("TN");
      expect(rules?.extras?.docFeeCapEffectiveDate).toBe("2019-07-01");
    });

    it("should have wheel tax range documented", () => {
      const rules = getRulesForState("TN");
      expect(rules?.extras?.wheelTaxRange).toEqual([50, 100]);
    });

    it("should have comprehensive notes", () => {
      const rules = getRulesForState("TN");
      expect(rules?.extras?.notes).toBeDefined();
      expect((rules?.extras?.notes as string).length).toBeGreaterThan(200);
    });

    it("should mention single article tax cap in notes", () => {
      const rules = getRulesForState("TN");
      expect(rules?.extras?.notes).toContain("SINGLE ARTICLE TAX CAP");
      expect(rules?.extras?.notes).toContain("$224");
    });

    it("should mention VSC taxability in notes", () => {
      const rules = getRulesForState("TN");
      expect(rules?.extras?.notes).toContain("service contracts");
      expect(rules?.extras?.notes).toContain("TAXES");
    });

    it("should mention wheel tax in notes", () => {
      const rules = getRulesForState("TN");
      expect(rules?.extras?.notes).toContain("wheel tax");
      expect(rules?.extras?.notes).toContain("$50-$100");
    });
  });

  // ============================================================================
  // UNIQUE TENNESSEE FEATURES
  // ============================================================================

  describe("Tennessee Unique Features", () => {
    it("should have single article tax cap (unique feature)", () => {
      const rules = getRulesForState("TN");
      // Cap amounts documented in extras
      expect(rules?.extras?.singleArticleCapHigh).toBe(3200);
      expect(rules?.extras?.singleArticleCapHighTax).toBe(224);
      expect(rules?.extras?.singleArticleCapLow).toBe(1600);
      expect(rules?.extras?.singleArticleCapLowTax).toBe(112);
    });

    it("should tax service contracts (unusual - most states don't)", () => {
      const rules = getRulesForState("TN");
      expect(rules?.taxOnServiceContracts).toBe(true);

      // Compare to states that DON'T tax VSC
      const alRules = getRulesForState("AL");
      const coRules = getRulesForState("CO");
      expect(alRules?.taxOnServiceContracts).toBe(false);
      expect(coRules?.taxOnServiceContracts).toBe(false);
    });

    it("should NOT tax GAP (different from VSC treatment)", () => {
      const rules = getRulesForState("TN");
      // TN taxes VSC but NOT GAP (unusual combination)
      expect(rules?.taxOnServiceContracts).toBe(true);
      expect(rules?.taxOnGap).toBe(false);
    });

    it("should have doc fee cap at $495 (statutory limit)", () => {
      const rules = getRulesForState("TN");
      expect(rules?.extras?.docFeeCapAmount).toBe(495);

      // Compare to states with no cap
      const alRules = getRulesForState("AL");
      expect(alRules?.extras?.avgDocFee).toBe(485); // AL has no cap, just average
    });

    it("should have wheel tax instead of vehicle property tax", () => {
      const rules = getRulesForState("TN");
      const wheelTaxRule = rules?.feeTaxRules.find((r) => r.code === "WHEEL_TAX");
      expect(wheelTaxRule).toBeDefined();
      expect(wheelTaxRule?.taxable).toBe(false);
      expect(wheelTaxRule?.notes).toContain("Replaces vehicle property tax");
    });

    it("should have dealer incentive payment credit (TCA § 67-6-341)", () => {
      const rules = getRulesForState("TN");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate?.taxable).toBe(false);
      expect(dealerRebate?.notes).toContain("67-6-341");
      expect(dealerRebate?.notes).toContain("credit");
    });

    it("should have one of highest combined tax rates in US (9.25%-9.75%)", () => {
      const rules = getRulesForState("TN");
      expect(rules?.extras?.minCombinedRate).toBe(9.25);
      expect(rules?.extras?.maxCombinedRate).toBe(9.75);

      // Compare to lower-tax states
      const alRules = getRulesForState("AL");
      expect(alRules?.extras?.stateAutomotiveSalesRate).toBe(2.0); // Much lower state rate
    });

    it("should have single article cap significantly reduce tax on expensive vehicles", () => {
      const rules = getRulesForState("TN");
      // For vehicles > $1,600, state tax capped at $224
      // This dramatically reduces effective tax rate on expensive vehicles
      // Example: $100,000 vehicle
      // Without cap: $100,000 × 7% = $7,000 state tax
      // With cap: $224 state tax
      // Savings: $6,776 on state portion alone
      expect(rules?.extras?.singleArticleCapHighTax).toBe(224);
      expect(rules?.extras?.notes).toContain("significantly reduces tax");
    });
  });

  // ============================================================================
  // COMPARISON WITH OTHER STATES
  // ============================================================================

  describe("Tennessee vs Alabama Comparison", () => {
    it("should have higher state rate than Alabama", () => {
      const tnRules = getRulesForState("TN");
      const alRules = getRulesForState("AL");
      expect(tnRules?.extras?.stateRate).toBe(7.0);
      expect(alRules?.extras?.stateAutomotiveSalesRate).toBe(2.0);
    });

    it("should apply trade-in credit to both state and local (AL only state)", () => {
      const tnRules = getRulesForState("TN");
      const alRules = getRulesForState("AL");
      // TN: Full trade-in credit to state + local
      expect(tnRules?.tradeInPolicy.type).toBe("FULL");
      // AL: Trade-in credit only to state portion (unique feature)
      expect(alRules?.tradeInPolicy.type).toBe("FULL");
      // AL's notes should indicate partial application
    });

    it("should have lease trade-in credit (AL does not)", () => {
      const tnRules = getRulesForState("TN");
      const alRules = getRulesForState("AL");
      expect(tnRules?.leaseRules.tradeInCredit).toBe("FULL");
      expect(alRules?.leaseRules.tradeInCredit).toBe("NONE");
    });

    it("should tax VSC (AL does not)", () => {
      const tnRules = getRulesForState("TN");
      const alRules = getRulesForState("AL");
      expect(tnRules?.taxOnServiceContracts).toBe(true);
      expect(alRules?.taxOnServiceContracts).toBe(false);
    });

    it("should have doc fee cap (AL does not)", () => {
      const tnRules = getRulesForState("TN");
      const alRules = getRulesForState("AL");
      expect(tnRules?.extras?.docFeeCapAmount).toBe(495);
      expect(alRules?.extras?.avgDocFee).toBe(485); // AL has average, not cap
    });
  });

  describe("Tennessee vs Kentucky Comparison", () => {
    it("should have higher state rate than Kentucky", () => {
      const tnRules = getRulesForState("TN");
      const kyRules = getRulesForState("KY");
      expect(tnRules?.extras?.stateRate).toBe(7.0);
      expect(kyRules?.extras?.flatUsageTaxRate).toBe(0.06); // 6%
    });

    it("should have local taxes (KY is state-only)", () => {
      const tnRules = getRulesForState("TN");
      const kyRules = getRulesForState("KY");
      expect(tnRules?.vehicleUsesLocalSalesTax).toBe(true);
      expect(kyRules?.vehicleUsesLocalSalesTax).toBe(false);
      expect(kyRules?.vehicleTaxScheme).toBe("STATE_ONLY");
    });

    it("should tax VSC (KY also taxes VSC)", () => {
      const tnRules = getRulesForState("TN");
      const kyRules = getRulesForState("KY");
      expect(tnRules?.taxOnServiceContracts).toBe(true);
      expect(kyRules?.taxOnServiceContracts).toBe(true);
    });

    it("should NOT tax GAP (KY taxes GAP)", () => {
      const tnRules = getRulesForState("TN");
      const kyRules = getRulesForState("KY");
      expect(tnRules?.taxOnGap).toBe(false);
      expect(kyRules?.taxOnGap).toBe(true);
    });
  });
});
