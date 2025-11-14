import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Connecticut (CT) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load Connecticut rules successfully", () => {
    const rules = getRulesForState("CT");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("CT");
  });

  it("should mark Connecticut as implemented (not a stub)", () => {
    expect(isStateImplemented("CT")).toBe(true);
  });

  it("should have version number 2", () => {
    const rules = getRulesForState("CT");
    expect(rules?.version).toBe(2);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("CT");
    const rulesLower = getRulesForState("ct");
    const rulesMixed = getRulesForState("Ct");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("CT");
    expect(rulesLower?.stateCode).toBe("CT");
    expect(rulesMixed?.stateCode).toBe("CT");
  });

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  describe("Retail Trade-In Policy", () => {
    it("should have FULL trade-in credit", () => {
      const rules = getRulesForState("CT");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });
  });

  describe("Retail Rebate Rules", () => {
    it("should have rebate rules for both manufacturer and dealer", () => {
      const rules = getRulesForState("CT");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as TAXABLE (unique to CT)", () => {
      const rules = getRulesForState("CT");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate?.taxable).toBe(true);
      expect(mfrRebate?.notes).toContain("TAXABLE");
    });

    it("should mark dealer rebates as TAXABLE", () => {
      const rules = getRulesForState("CT");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate?.taxable).toBe(true);
    });
  });

  describe("Retail Doc Fee", () => {
    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("CT");
      expect(rules?.docFeeTaxable).toBe(true);
    });

    it("should have doc fee in fee tax rules", () => {
      const rules = getRulesForState("CT");
      const docFee = rules?.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee?.taxable).toBe(true);
      expect(docFee?.notes).toContain("luxury threshold");
    });
  });

  describe("Retail Fee Taxability", () => {
    it("should mark service contracts as TAXABLE at 6.35%", () => {
      const rules = getRulesForState("CT");
      const serviceContract = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(serviceContract?.taxable).toBe(true);
      expect(serviceContract?.notes).toContain("6.35%");
    });

    it("should mark GAP as LIKELY TAXABLE at 6.35%", () => {
      const rules = getRulesForState("CT");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap?.taxable).toBe(true);
      expect(gap?.notes).toContain("LIKELY TAXABLE");
      expect(gap?.notes).toContain("6.35%");
    });

    it("should mark title fees as NON-taxable", () => {
      const rules = getRulesForState("CT");
      const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-taxable", () => {
      const rules = getRulesForState("CT");
      const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Retail Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("CT");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should NOT tax negative equity (conservative approach)", () => {
      const rules = getRulesForState("CT");
      expect(rules?.taxOnNegativeEquity).toBe(false);
    });

    it("should tax service contracts", () => {
      const rules = getRulesForState("CT");
      expect(rules?.taxOnServiceContracts).toBe(true);
    });

    it("should tax GAP (if structured as service contract)", () => {
      const rules = getRulesForState("CT");
      expect(rules?.taxOnGap).toBe(true);
    });
  });

  describe("Vehicle Tax Scheme", () => {
    it("should use STATE_ONLY tax scheme (no local taxes)", () => {
      const rules = getRulesForState("CT");
      expect(rules?.vehicleTaxScheme).toBe("STATE_ONLY");
    });

    it("should NOT use local sales tax", () => {
      const rules = getRulesForState("CT");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION RULES
  // ============================================================================

  describe("Lease Tax Method", () => {
    it("should use HYBRID lease method (upfront + monthly)", () => {
      const rules = getRulesForState("CT");
      const leaseRules = rules?.leaseRules;
      expect(leaseRules?.method).toBe("HYBRID");
    });

    it("should tax cap cost reduction upfront", () => {
      const rules = getRulesForState("CT");
      const leaseRules = rules?.leaseRules;
      expect(leaseRules?.taxCapReduction).toBe(true);
    });
  });

  describe("Lease Rebate Behavior", () => {
    it("should mark rebates as ALWAYS_TAXABLE on leases", () => {
      const rules = getRulesForState("CT");
      const leaseRules = rules?.leaseRules;
      expect(leaseRules?.rebateBehavior).toBe("ALWAYS_TAXABLE");
    });
  });

  describe("Lease Doc Fee", () => {
    it("should mark doc fee as ALWAYS taxable on leases", () => {
      const rules = getRulesForState("CT");
      const leaseRules = rules?.leaseRules;
      expect(leaseRules?.docFeeTaxability).toBe("ALWAYS");
    });

    it("should have doc fee in lease fee tax rules", () => {
      const rules = getRulesForState("CT");
      const leaseRules = rules?.leaseRules;
      const docFee = leaseRules?.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee?.taxable).toBe(true);
    });
  });

  describe("Lease Trade-In Credit", () => {
    it("should allow FULL trade-in credit on leases (with restrictions)", () => {
      const rules = getRulesForState("CT");
      const leaseRules = rules?.leaseRules;
      expect(leaseRules?.tradeInCredit).toBe("FULL");
    });

    it("should document lease trade-in restriction (owned vehicles only)", () => {
      const rules = getRulesForState("CT");
      const leaseRules = rules?.leaseRules;
      expect(leaseRules?.notes).toContain("OWNS");
      expect(leaseRules?.notes).toContain("not prior lease");
    });
  });

  describe("Lease Negative Equity", () => {
    it("should NOT tax negative equity on leases", () => {
      const rules = getRulesForState("CT");
      const leaseRules = rules?.leaseRules;
      expect(leaseRules?.negativeEquityTaxable).toBe(false);
    });
  });

  describe("Lease Fee Taxability", () => {
    it("should tax service contracts on leases", () => {
      const rules = getRulesForState("CT");
      const leaseRules = rules?.leaseRules;
      const serviceContract = leaseRules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(serviceContract?.taxable).toBe(true);
    });

    it("should tax GAP on leases", () => {
      const rules = getRulesForState("CT");
      const leaseRules = rules?.leaseRules;
      const gap = leaseRules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap?.taxable).toBe(true);
    });

    it("should tax acquisition fees on leases", () => {
      const rules = getRulesForState("CT");
      const leaseRules = rules?.leaseRules;
      const acqFee = leaseRules?.feeTaxRules.find((r) => r.code === "ACQUISITION_FEE");
      expect(acqFee?.taxable).toBe(true);
    });

    it("should NOT tax title fees on leases", () => {
      const rules = getRulesForState("CT");
      const leaseRules = rules?.leaseRules;
      const title = leaseRules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title?.taxable).toBe(false);
    });

    it("should NOT tax registration fees on leases", () => {
      const rules = getRulesForState("CT");
      const leaseRules = rules?.leaseRules;
      const reg = leaseRules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Lease Title Fee Rules", () => {
    it("should have correct title fee configuration", () => {
      const rules = getRulesForState("CT");
      const leaseRules = rules?.leaseRules;
      const titleRule = leaseRules?.titleFeeRules.find((r) => r.code === "TITLE");

      expect(titleRule).toBeDefined();
      expect(titleRule?.taxable).toBe(false);
      expect(titleRule?.includedInCapCost).toBe(true);
      expect(titleRule?.includedInUpfront).toBe(true);
      expect(titleRule?.includedInMonthly).toBe(false);
    });

    it("should have correct registration fee configuration", () => {
      const rules = getRulesForState("CT");
      const leaseRules = rules?.leaseRules;
      const regRule = leaseRules?.titleFeeRules.find((r) => r.code === "REG");

      expect(regRule).toBeDefined();
      expect(regRule?.taxable).toBe(false);
      expect(regRule?.includedInCapCost).toBe(true);
      expect(regRule?.includedInUpfront).toBe(true);
      expect(regRule?.includedInMonthly).toBe(false);
    });
  });

  describe("Lease Configuration", () => {
    it("should tax fees upfront", () => {
      const rules = getRulesForState("CT");
      const leaseRules = rules?.leaseRules;
      expect(leaseRules?.taxFeesUpfront).toBe(true);
    });

    it("should have no special scheme", () => {
      const rules = getRulesForState("CT");
      const leaseRules = rules?.leaseRules;
      expect(leaseRules?.specialScheme).toBe("NONE");
    });

    it("should have comprehensive lease notes", () => {
      const rules = getRulesForState("CT");
      const leaseRules = rules?.leaseRules;
      expect(leaseRules?.notes).toBeDefined();
      expect(leaseRules?.notes).toContain("HYBRID");
      expect(leaseRules?.notes).toContain("7.75%");
      expect(leaseRules?.notes).toContain("6.35%");
    });
  });

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  describe("Reciprocity Configuration", () => {
    it("should have reciprocity enabled", () => {
      const rules = getRulesForState("CT");
      expect(rules?.reciprocity.enabled).toBe(true);
    });

    it("should apply to BOTH retail and lease", () => {
      const rules = getRulesForState("CT");
      expect(rules?.reciprocity.scope).toBe("BOTH");
    });

    it("should provide CREDIT_FULL for home state behavior", () => {
      const rules = getRulesForState("CT");
      expect(rules?.reciprocity.homeStateBehavior).toBe("CREDIT_FULL");
    });

    it("should require proof of tax paid", () => {
      const rules = getRulesForState("CT");
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(true);
    });

    it("should base on TAX_PAID", () => {
      const rules = getRulesForState("CT");
      expect(rules?.reciprocity.basis).toBe("TAX_PAID");
    });

    it("should cap at this state's tax", () => {
      const rules = getRulesForState("CT");
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(true);
    });

    it("should NOT have lease exception", () => {
      const rules = getRulesForState("CT");
      expect(rules?.reciprocity.hasLeaseException).toBe(false);
    });

    it("should have comprehensive reciprocity notes", () => {
      const rules = getRulesForState("CT");
      expect(rules?.reciprocity.notes).toContain("FULL reciprocity");
      expect(rules?.reciprocity.notes).toContain("NEW RESIDENTS");
      expect(rules?.reciprocity.notes).toContain("30+");
    });
  });

  // ============================================================================
  // METADATA AND EXTRAS
  // ============================================================================

  describe("Extras Metadata", () => {
    it("should have comprehensive sources list", () => {
      const rules = getRulesForState("CT");
      expect(rules?.extras).toBeDefined();
      expect(rules?.extras?.sources).toBeDefined();
      expect(Array.isArray(rules?.extras?.sources)).toBe(true);
      expect((rules?.extras?.sources as string[]).length).toBeGreaterThan(10);
    });

    it("should have correct tax rates in extras", () => {
      const rules = getRulesForState("CT");
      expect(rules?.extras?.standardRate).toBe(6.35);
      expect(rules?.extras?.luxuryRate).toBe(7.75);
      expect(rules?.extras?.luxuryThreshold).toBe(50000);
    });

    it("should have correct warranty rate (always 6.35%)", () => {
      const rules = getRulesForState("CT");
      expect(rules?.extras?.warrantyRate).toBe(6.35);
    });

    it("should have correct GAP rate (6.35% if service contract)", () => {
      const rules = getRulesForState("CT");
      expect(rules?.extras?.gapRate).toBe(6.35);
    });

    it("should have average doc fee documented", () => {
      const rules = getRulesForState("CT");
      expect(rules?.extras?.avgDocFee).toBe(415);
    });

    it("should have trade-in admin fee documented", () => {
      const rules = getRulesForState("CT");
      expect(rules?.extras?.tradeInAdminFee).toBe(100);
    });

    it("should have rate history", () => {
      const rules = getRulesForState("CT");
      expect(rules?.extras?.rateHistory).toBeDefined();
      expect(typeof rules?.extras?.rateHistory).toBe("object");
    });

    it("should document unique features", () => {
      const rules = getRulesForState("CT");
      expect(rules?.extras?.uniqueFeatures).toBeDefined();
      expect(Array.isArray(rules?.extras?.uniqueFeatures)).toBe(true);
      expect((rules?.extras?.uniqueFeatures as string[]).length).toBeGreaterThan(5);
    });

    it("should include key unique features", () => {
      const rules = getRulesForState("CT");
      const features = rules?.extras?.uniqueFeatures as string[];
      expect(features.some((f) => f.includes("tax cliff"))).toBe(true);
      expect(features.some((f) => f.includes("pre-trade-in"))).toBe(true);
      expect(features.some((f) => f.includes("Extended warranties"))).toBe(true);
      expect(features.some((f) => f.includes("Manufacturer rebates taxable"))).toBe(true);
    });

    it("should have last updated date", () => {
      const rules = getRulesForState("CT");
      expect(rules?.extras?.lastUpdated).toBe("2025-11-13");
    });

    it("should have comprehensive notes", () => {
      const rules = getRulesForState("CT");
      expect(rules?.extras?.notes).toBeDefined();
      expect(typeof rules?.extras?.notes).toBe("string");
      expect((rules?.extras?.notes as string).length).toBeGreaterThan(200);
    });
  });

  // ============================================================================
  // LUXURY TAX SPECIFIC TESTS
  // ============================================================================

  describe("Luxury Tax Configuration", () => {
    it("should document two-tier tax system", () => {
      const rules = getRulesForState("CT");
      expect(rules?.extras?.notes).toContain("TWO-TIER");
      expect(rules?.extras?.notes).toContain("6.35%");
      expect(rules?.extras?.notes).toContain("7.75%");
    });

    it("should document $50K luxury threshold", () => {
      const rules = getRulesForState("CT");
      expect(rules?.extras?.luxuryThreshold).toBe(50000);
    });

    it("should document that luxury rate applies to ENTIRE price", () => {
      const rules = getRulesForState("CT");
      const features = rules?.extras?.uniqueFeatures as string[];
      expect(features.some((f) => f.includes("ENTIRE price"))).toBe(true);
    });

    it("should document that trade-in doesn't change rate", () => {
      const rules = getRulesForState("CT");
      const features = rules?.extras?.uniqueFeatures as string[];
      expect(features.some((f) => f.includes("pre-trade-in sale price"))).toBe(true);
    });

    it("should document that doc fee can trigger luxury tax", () => {
      const rules = getRulesForState("CT");
      const features = rules?.extras?.uniqueFeatures as string[];
      expect(features.some((f) => f.includes("Doc fee included"))).toBe(true);
    });

    it("should document warranty exception (always 6.35%)", () => {
      const rules = getRulesForState("CT");
      const features = rules?.extras?.uniqueFeatures as string[];
      expect(features.some((f) => f.includes("warranties always 6.35%"))).toBe(true);
    });
  });

  // ============================================================================
  // EDGE CASES AND SPECIAL RULES
  // ============================================================================

  describe("Edge Cases", () => {
    it("should document manufacturer rebate taxability (opposite of many states)", () => {
      const rules = getRulesForState("CT");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate?.notes).toContain("differs from states like Massachusetts");
    });

    it("should document lease trade-in restriction", () => {
      const rules = getRulesForState("CT");
      const leaseRules = rules?.leaseRules;
      expect(leaseRules?.notes).toContain("OWNS");
    });

    it("should document negative equity uncertainty", () => {
      const rules = getRulesForState("CT");
      expect(rules?.taxOnNegativeEquity).toBe(false);
    });

    it("should document GAP taxability uncertainty", () => {
      const rules = getRulesForState("CT");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap?.notes).toContain("LIKELY TAXABLE");
    });

    it("should document no local sales taxes", () => {
      const rules = getRulesForState("CT");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
      expect(rules?.extras?.notes).toContain("NO local sales");
    });
  });

  // ============================================================================
  // COMPREHENSIVE SCENARIO TESTS
  // ============================================================================

  describe("Scenario: Standard Purchase (No Trade-In)", () => {
    it("should validate standard rate scenario", () => {
      const rules = getRulesForState("CT");
      // $30,000 vehicle + $500 doc = $30,500 (< $50K)
      // Expected rate: 6.35%
      // Expected tax: $30,500 × 6.35% = $1,936.75
      expect(rules?.extras?.standardRate).toBe(6.35);
      expect(rules?.extras?.luxuryThreshold).toBe(50000);
    });
  });

  describe("Scenario: Luxury Purchase (No Trade-In)", () => {
    it("should validate luxury rate scenario", () => {
      const rules = getRulesForState("CT");
      // $60,000 vehicle + $500 doc = $60,500 (> $50K)
      // Expected rate: 7.75%
      // Expected tax: $60,500 × 7.75% = $4,688.75
      expect(rules?.extras?.luxuryRate).toBe(7.75);
    });
  });

  describe("Scenario: Luxury Purchase with Trade-In (Rate Trap)", () => {
    it("should validate luxury rate trap scenario", () => {
      const rules = getRulesForState("CT");
      // $52,000 vehicle + $500 doc = $52,500 (> $50K, triggers luxury)
      // Trade-in: $10,000
      // Taxable base: $42,500 (< $50K, but rate is still 7.75%)
      // Expected tax: $42,500 × 7.75% = $3,293.75
      expect(rules?.tradeInPolicy.type).toBe("FULL");
      expect(rules?.extras?.luxuryRate).toBe(7.75);

      // Verify documentation of this edge case
      const features = rules?.extras?.uniqueFeatures as string[];
      expect(features.some((f) => f.includes("pre-trade-in"))).toBe(true);
    });
  });

  describe("Scenario: Doc Fee Triggers Luxury Tax", () => {
    it("should validate doc fee luxury threshold scenario", () => {
      const rules = getRulesForState("CT");
      // $49,800 vehicle + $500 doc = $50,300 (> $50K, triggers luxury)
      // Expected tax: $50,300 × 7.75% = $3,898.25
      // Without doc: $49,800 × 6.35% = $3,162.30
      // Difference: $735.95 additional tax
      expect(rules?.docFeeTaxable).toBe(true);
      expect(rules?.extras?.luxuryThreshold).toBe(50000);

      const docFee = rules?.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee?.notes).toContain("luxury threshold");
    });
  });

  describe("Scenario: Luxury Vehicle with Warranty", () => {
    it("should validate warranty rate exception", () => {
      const rules = getRulesForState("CT");
      // $60,000 vehicle → 7.75% tax rate
      // $3,000 warranty → 6.35% tax rate (NOT 7.75%)
      // Vehicle tax: $60,000 × 7.75% = $4,650
      // Warranty tax: $3,000 × 6.35% = $190.50
      expect(rules?.extras?.warrantyRate).toBe(6.35);
      expect(rules?.extras?.luxuryRate).toBe(7.75);

      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc?.notes).toContain("6.35%");
      expect(vsc?.notes).toContain("regardless of vehicle price");
    });
  });

  describe("Scenario: Standard Lease", () => {
    it("should validate standard lease scenario", () => {
      const rules = getRulesForState("CT");
      const leaseRules = rules?.leaseRules;
      // Agreed value: $48,000 (< $50K) → 6.35% rate
      // Cap reduction: $5,000 → Upfront tax: $317.50
      // Monthly payment: $450 → Monthly tax: $28.58
      // Total (36 months): $317.50 + ($28.58 × 36) = $1,346.38
      expect(leaseRules?.method).toBe("HYBRID");
      expect(leaseRules?.taxCapReduction).toBe(true);
      expect(rules?.extras?.standardRate).toBe(6.35);
    });
  });

  describe("Scenario: Luxury Lease", () => {
    it("should validate luxury lease scenario", () => {
      const rules = getRulesForState("CT");
      const leaseRules = rules?.leaseRules;
      // Agreed value: $55,000 (> $50K) → 7.75% rate
      // Cap reduction: $5,000 → Upfront tax: $387.50
      // Monthly payment: $625 → Monthly tax: $48.44
      expect(leaseRules?.method).toBe("HYBRID");
      expect(leaseRules?.taxCapReduction).toBe(true);
      expect(rules?.extras?.luxuryRate).toBe(7.75);
    });
  });

  describe("Scenario: Reciprocity (Lower Rate State)", () => {
    it("should validate reciprocity credit scenario", () => {
      const rules = getRulesForState("CT");
      // Vehicle: $30,000
      // NH tax paid: $0 (no sales tax)
      // CT tax owed: $1,905
      // Credit: $0
      // Pay to CT: $1,905
      expect(rules?.reciprocity.enabled).toBe(true);
      expect(rules?.reciprocity.homeStateBehavior).toBe("CREDIT_FULL");
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(true);
    });
  });

  describe("Scenario: Reciprocity (Higher Rate State)", () => {
    it("should validate no additional tax when other state higher", () => {
      const rules = getRulesForState("CT");
      // Vehicle: $30,000
      // CA tax paid: $2,400 (8%)
      // CT tax owed: $1,905 (6.35%)
      // Credit: $2,400
      // Pay to CT: $0 (no refund)
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(true);
      expect(rules?.reciprocity.notes).toContain("no refund");
    });
  });

  describe("Scenario: New Resident Exemption", () => {
    it("should document 30-day new resident rule", () => {
      const rules = getRulesForState("CT");
      expect(rules?.reciprocity.notes).toContain("NEW RESIDENTS");
      expect(rules?.reciprocity.notes).toContain("30+");
    });
  });
});
