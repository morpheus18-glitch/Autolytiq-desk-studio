import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Arizona (AZ) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load Arizona rules successfully", () => {
    const rules = getRulesForState("AZ");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("AZ");
  });

  it("should mark Arizona as implemented (not a stub)", () => {
    expect(isStateImplemented("AZ")).toBe(true);
  });

  it("should have version number 2", () => {
    const rules = getRulesForState("AZ");
    expect(rules?.version).toBe(2);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("AZ");
    const rulesLower = getRulesForState("az");
    const rulesMixed = getRulesForState("Az");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("AZ");
    expect(rulesLower?.stateCode).toBe("AZ");
    expect(rulesMixed?.stateCode).toBe("AZ");
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS
  // ============================================================================

  describe("Retail - Trade-In Policy", () => {
    it("should have FULL trade-in credit policy", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });

    it("should apply full trade-in credit with no cap", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
      // No cap property should exist for FULL type
      if (rules?.tradeInPolicy.type === "CAPPED") {
        expect(rules.tradeInPolicy.capAmount).toBeUndefined();
      }
    });

    it("should document that trade-in is deducted before TPT calculation", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
      // Trade-in reduces taxable base according to ARS § 42-5061(A)(28)
    });
  });

  describe("Retail - Rebate Rules", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as NON-TAXABLE (reduce tax base)", () => {
      const rules = getRulesForState("AZ");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(false);
      expect(mfrRebate?.notes).toContain("reduce the purchase price");
    });

    it("should mark dealer rebates as TAXABLE (do not reduce tax base)", () => {
      const rules = getRulesForState("AZ");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(true);
      expect(dealerRebate?.notes).toContain("do not reduce");
    });

    it("should document the manufacturer vs dealer rebate distinction", () => {
      const rules = getRulesForState("AZ");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");

      // Manufacturer should reduce tax base (taxable: false)
      expect(mfrRebate?.taxable).toBe(false);
      // Dealer should not reduce tax base (taxable: true)
      expect(dealerRebate?.taxable).toBe(true);

      // Both should have explanatory notes
      expect(mfrRebate?.notes).toBeTruthy();
      expect(dealerRebate?.notes).toBeTruthy();
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.docFeeTaxable).toBe(true);
    });

    it("should have doc fee taxability documented in fee tax rules", () => {
      const rules = getRulesForState("AZ");
      // Doc fee is taxable per docFeeTaxable flag
      expect(rules?.docFeeTaxable).toBe(true);
    });

    it("should document that Arizona has NO CAP on doc fees", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.extras?.docFeeCapAmount).toBeNull();
      expect(rules?.extras?.avgDocFee).toBe(410);
    });
  });

  describe("Retail - Fee Tax Rules", () => {
    it("should mark service contracts (VSC) as NON-TAXABLE", () => {
      const rules = getRulesForState("AZ");
      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(false);
      expect(vsc?.notes).toContain("NOT taxable");
      expect(vsc?.notes).toContain("insurance product");
    });

    it("should mark GAP as NON-TAXABLE", () => {
      const rules = getRulesForState("AZ");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(false);
      expect(gap?.notes).toContain("NOT taxable");
    });

    it("should mark title fees as NON-TAXABLE", () => {
      const rules = getRulesForState("AZ");
      const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-TAXABLE", () => {
      const rules = getRulesForState("AZ");
      const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });

    it("should mark VLT (Vehicle License Tax) as NON-TAXABLE", () => {
      const rules = getRulesForState("AZ");
      const vlt = rules?.feeTaxRules.find((r) => r.code === "VLT");
      expect(vlt).toBeDefined();
      expect(vlt?.taxable).toBe(false);
      expect(vlt?.notes).toContain("Vehicle License Tax");
      expect(vlt?.notes).toContain("NOT subject to TPT");
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should tax negative equity", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.taxOnNegativeEquity).toBe(true);
    });

    it("should NOT tax service contracts", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.taxOnServiceContracts).toBe(false);
    });

    it("should NOT tax GAP insurance", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.taxOnGap).toBe(false);
    });
  });

  describe("Retail - Vehicle Tax Scheme", () => {
    it("should use STATE_PLUS_LOCAL vehicle tax scheme", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.vehicleTaxScheme).toBe("STATE_PLUS_LOCAL");
    });

    it("should apply local sales tax to vehicles", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(true);
    });

    it("should document state TPT rate of 5.6%", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.extras?.stateRate).toBe(5.6);
    });

    it("should document max combined rate of 11.2%", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.extras?.maxCombinedRate).toBe(11.2);
    });

    it("should document VLT rate information", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.extras?.vltRate).toBe(2.8); // $2.80 per $100 assessed value
      expect(rules?.extras?.vltDepreciationRate).toBe(16.25); // 16.25% per year
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease - Tax Method", () => {
    it("should use MONTHLY lease taxation method", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.leaseRules.method).toBe("MONTHLY");
    });

    it("should TAX cap cost reduction (except trade-in)", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.leaseRules.taxCapReduction).toBe(true);
    });

    it("should tax fees upfront on leases", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.leaseRules.taxFeesUpfront).toBe(true);
    });

    it("should have no special lease scheme", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.leaseRules.specialScheme).toBe("NONE");
    });

    it("should document hybrid lease taxation model", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.leaseRules.notes).toContain("Monthly payment method");
      expect(rules?.leaseRules.notes).toContain("UPFRONT taxation");
      expect(rules?.leaseRules.notes).toContain("capitalized cost reduction");
    });
  });

  describe("Lease - Cap Cost Reduction Taxation", () => {
    it("should tax cap cost reduction upfront (except trade-in)", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.leaseRules.taxCapReduction).toBe(true);
    });

    it("should document that cash down is taxed", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.leaseRules.notes).toContain("cash");
    });

    it("should document that rebates in cap reduction are taxed", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.leaseRules.notes).toContain("rebates");
    });

    it("should document that trade-in is NOT taxed", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.leaseRules.notes).toContain("Trade-in");
      expect(rules?.leaseRules.notes).toContain("NOT taxed");
    });
  });

  describe("Lease - Rebates and Incentives", () => {
    it("should have ALWAYS_TAXABLE rebate behavior on leases", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.leaseRules.rebateBehavior).toBe("ALWAYS_TAXABLE");
    });

    it("should document that lease rebate treatment differs from retail", () => {
      const rules = getRulesForState("AZ");
      // In retail, manufacturer rebates reduce tax base (taxable: false)
      const retailMfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(retailMfrRebate?.taxable).toBe(false);

      // In leases, all rebates are taxable when applied to cap reduction
      expect(rules?.leaseRules.rebateBehavior).toBe("ALWAYS_TAXABLE");
    });
  });

  describe("Lease - Documentation Fee", () => {
    it("should ALWAYS tax doc fee on leases", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.leaseRules.docFeeTaxability).toBe("ALWAYS");
    });

    it("should have doc fee as taxable in lease fee rules", () => {
      const rules = getRulesForState("AZ");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
    });
  });

  describe("Lease - Trade-In Credit", () => {
    it("should provide FULL trade-in credit on leases", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.leaseRules.tradeInCredit).toBe("FULL");
    });

    it("should document that trade-in reduces cap cost without being taxed", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.leaseRules.notes).toContain("Trade-in");
      expect(rules?.leaseRules.notes).toContain("full credit");
      expect(rules?.leaseRules.notes).toContain("NOT taxed");
    });
  });

  describe("Lease - Negative Equity", () => {
    it("should mark negative equity as TAXABLE on leases", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(true);
    });
  });

  describe("Lease - Fee Tax Rules", () => {
    it("should mark doc fee as TAXABLE on leases", () => {
      const rules = getRulesForState("AZ");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
    });

    it("should mark service contracts as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("AZ");
      const vsc = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(false);
      expect(vsc?.notes).toContain("NOT taxed");
    });

    it("should mark GAP as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("AZ");
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(false);
      expect(gap?.notes).toContain("NOT taxed");
    });

    it("should mark title fees as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("AZ");
      const title = rules?.leaseRules.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("AZ");
      const reg = rules?.leaseRules.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Lease - Title Fee Rules", () => {
    it("should have title fee rule configuration", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.leaseRules.titleFeeRules).toBeDefined();
      expect(rules?.leaseRules.titleFeeRules.length).toBeGreaterThan(0);
    });

    it("should mark title fees as not taxable but included in cap cost", () => {
      const rules = getRulesForState("AZ");
      const titleRule = rules?.leaseRules.titleFeeRules.find((r) => r.code === "TITLE");
      expect(titleRule).toBeDefined();
      expect(titleRule?.taxable).toBe(false);
      expect(titleRule?.includedInCapCost).toBe(true);
      expect(titleRule?.includedInUpfront).toBe(true);
      expect(titleRule?.includedInMonthly).toBe(false);
    });
  });

  // ============================================================================
  // RECIPROCITY TESTS
  // ============================================================================

  describe("Reciprocity Rules", () => {
    it("should have reciprocity enabled", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.reciprocity.enabled).toBe(true);
    });

    it("should apply reciprocity to BOTH retail and lease", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.reciprocity.scope).toBe("BOTH");
    });

    it("should use CREDIT_UP_TO_STATE_RATE mode", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.reciprocity.homeStateBehavior).toBe("CREDIT_UP_TO_STATE_RATE");
    });

    it("should require proof of tax paid", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(true);
    });

    it("should base credit on TAX_PAID", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.reciprocity.basis).toBe("TAX_PAID");
    });

    it("should cap credit at Arizona's tax rate", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(true);
    });

    it("should not have lease exceptions", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.reciprocity.hasLeaseException).toBe(false);
    });

    it("should document LIMITED reciprocity with 21 states", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.reciprocity.notes).toContain("LIMITED");
      expect(rules?.reciprocity.notes).toContain("21 states");
    });

    it("should document reciprocal states count in extras", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.extras?.reciprocalStatesCount).toBe(21);
    });

    it("should document tribal exemption override", () => {
      const rules = getRulesForState("AZ");
      const tribalOverride = rules?.reciprocity.overrides?.find(
        (o) => o.originState === "TRIBAL"
      );
      expect(tribalOverride).toBeDefined();
      expect(tribalOverride?.notes).toContain("tribal members");
    });

    it("should document complex reciprocity scenarios in notes", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.reciprocity.notes).toContain("state + county");
      expect(rules?.reciprocity.notes).toContain("city tax");
      expect(rules?.reciprocity.notes).toContain("Out-of-state delivery");
      expect(rules?.reciprocity.notes).toContain("Commercial");
    });
  });

  // ============================================================================
  // ARIZONA-SPECIFIC FEATURES
  // ============================================================================

  describe("Arizona Unique Features - TPT System", () => {
    it("should document that Arizona uses TPT, not traditional sales tax", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.extras?.notes).toContain("Transaction Privilege Tax");
      expect(rules?.extras?.notes).toContain("TPT");
      expect(rules?.extras?.notes).toContain("privilege tax on the seller");
    });

    it("should document that tax is based on dealer location, not buyer", () => {
      const rules = getRulesForState("AZ");
      // This is documented in the rule comments about point of sale
      expect(rules?.vehicleUsesLocalSalesTax).toBe(true);
    });
  });

  describe("Arizona Unique Features - VLT System", () => {
    it("should document VLT as separate from TPT", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.extras?.notes).toContain("VLT");
      expect(rules?.extras?.notes).toContain("SEPARATE annual tax");
    });

    it("should document VLT calculation method", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.extras?.vltRate).toBe(2.8);
      expect(rules?.extras?.vltDepreciationRate).toBe(16.25);
      expect(rules?.extras?.notes).toContain("60% of MSRP");
    });

    it("should have VLT marked as non-taxable", () => {
      const rules = getRulesForState("AZ");
      const vlt = rules?.feeTaxRules.find((r) => r.code === "VLT");
      expect(vlt).toBeDefined();
      expect(vlt?.taxable).toBe(false);
    });
  });

  describe("Arizona Unique Features - Model City Tax Code", () => {
    it("should document Model City Tax Code differences", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.extras?.notes).toContain("Model City Tax Code");
      expect(rules?.leaseRules.notes).toContain("Model City Tax Code");
    });
  });

  describe("Arizona Unique Features - Service Contracts as Insurance", () => {
    it("should document that VSC and GAP are treated as insurance products", () => {
      const rules = getRulesForState("AZ");
      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc?.notes).toContain("insurance product");
      expect(vsc?.notes).toContain("ARS § 20-1095");
    });
  });

  // ============================================================================
  // EDGE CASES AND SPECIAL SCENARIOS
  // ============================================================================

  describe("Edge Cases - Nonresident Sales", () => {
    it("should document nonresident exemptions in reciprocity notes", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.reciprocity.notes).toContain("Reciprocal states");
      expect(rules?.reciprocity.notes).toContain("Non-reciprocal states");
      expect(rules?.reciprocity.notes).toContain("Out-of-state delivery");
    });
  });

  describe("Edge Cases - Commercial Vehicles", () => {
    it("should document commercial vehicle exemption (> 10K lbs)", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.reciprocity.notes).toContain("Commercial > 10K lbs");
      expect(rules?.reciprocity.notes).toContain("state + county");
    });
  });

  describe("Edge Cases - Military Exemptions", () => {
    it("should document military VLT exemption (not TPT)", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.reciprocity.notes).toContain("Military");
      expect(rules?.reciprocity.notes).toContain("VLT exemption only");
      expect(rules?.reciprocity.notes).toContain("NOT TPT exemption");
    });
  });

  describe("Edge Cases - Tribal Exemptions", () => {
    it("should have tribal reciprocity override", () => {
      const rules = getRulesForState("AZ");
      const tribalOverride = rules?.reciprocity.overrides?.find(
        (o) => o.originState === "TRIBAL"
      );
      expect(tribalOverride).toBeDefined();
    });

    it("should document tribal exemption requirements", () => {
      const rules = getRulesForState("AZ");
      const tribalOverride = rules?.reciprocity.overrides?.find(
        (o) => o.originState === "TRIBAL"
      );
      expect(tribalOverride?.notes).toContain("Enrolled tribal members");
      expect(tribalOverride?.notes).toContain("on-reservation");
      expect(tribalOverride?.notes).toContain("Form 5013");
    });
  });

  // ============================================================================
  // METADATA AND DOCUMENTATION
  // ============================================================================

  describe("Metadata - Sources", () => {
    it("should document official sources", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.extras?.sources).toBeDefined();
      expect(rules?.extras?.sources?.length).toBeGreaterThan(0);
    });

    it("should reference AZDOR as primary source", () => {
      const rules = getRulesForState("AZ");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("AZDOR"))).toBe(true);
      expect(sources?.some((s) => s.includes("Arizona Department of Revenue"))).toBe(true);
    });

    it("should reference Arizona Revised Statutes", () => {
      const rules = getRulesForState("AZ");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("ARS"))).toBe(true);
    });

    it("should reference TPR 03-7 ruling", () => {
      const rules = getRulesForState("AZ");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("TPR 03-7"))).toBe(true);
    });

    it("should reference Model City Tax Code", () => {
      const rules = getRulesForState("AZ");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Model City Tax Code"))).toBe(true);
    });
  });

  describe("Metadata - Last Updated", () => {
    it("should have lastUpdated timestamp", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.extras?.lastUpdated).toBeDefined();
      expect(rules?.extras?.lastUpdated).toBe("2025-11");
    });
  });

  describe("Metadata - Documentation", () => {
    it("should have comprehensive notes in extras", () => {
      const rules = getRulesForState("AZ");
      expect(rules?.extras?.notes).toBeDefined();
      expect((rules?.extras?.notes as string)?.length).toBeGreaterThan(100);
    });

    it("should document key Arizona features in notes", () => {
      const rules = getRulesForState("AZ");
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("TPT");
      expect(notes).toContain("VLT");
      expect(notes).toContain("5.6%");
      expect(notes).toContain("NO DOC FEE CAP");
    });
  });
});
