import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Kansas (KS) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load Kansas rules successfully", () => {
    const rules = getRulesForState("KS");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("KS");
  });

  it("should mark Kansas as implemented (not a stub)", () => {
    expect(isStateImplemented("KS")).toBe(true);
  });

  it("should have version number 2", () => {
    const rules = getRulesForState("KS");
    expect(rules?.version).toBe(2);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("KS");
    const rulesLower = getRulesForState("ks");
    const rulesMixed = getRulesForState("Ks");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("KS");
    expect(rulesLower?.stateCode).toBe("KS");
    expect(rulesMixed?.stateCode).toBe("KS");
  });

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  describe("Retail Trade-In Policy", () => {
    it("should have FULL trade-in credit (state + local)", () => {
      const rules = getRulesForState("KS");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });

    it("should apply trade-in credit to both state and local taxes", () => {
      const rules = getRulesForState("KS");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(true);
    });

    it("should document the NEW 2025 120-day sale provision", () => {
      const rules = getRulesForState("KS");
      expect(rules?.extras?.tradeIn120DayEffectiveDate).toBe("2025-01-01");
      expect(rules?.extras?.uniqueFeatures).toContain(
        "NEW 2025: 120-day sale provision - tax credit if selling vehicle within 120 days"
      );
    });
  });

  describe("Retail Rebate Rules", () => {
    it("should have rebate rules for both manufacturer and dealer", () => {
      const rules = getRulesForState("KS");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as TAXABLE", () => {
      const rules = getRulesForState("KS");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate?.taxable).toBe(true);
      expect(mfrRebate?.notes).toContain("TAXABLE");
      expect(mfrRebate?.notes).toContain("full purchase price");
    });

    it("should mark dealer rebates as NON-TAXABLE if true price reduction", () => {
      const rules = getRulesForState("KS");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate?.taxable).toBe(false);
      expect(dealerRebate?.notes).toContain("NOT taxable");
    });

    it("should note exception for manufacturer option-package incentives", () => {
      const rules = getRulesForState("KS");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate?.notes).toContain("option-package incentive");
    });
  });

  describe("Retail Doc Fee", () => {
    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("KS");
      expect(rules?.docFeeTaxable).toBe(true);
    });

    it("should have NO CAP on doc fees", () => {
      const rules = getRulesForState("KS");
      const docFee = rules?.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee?.taxable).toBe(true);
      expect(docFee?.notes).toContain("NO cap");
      expect(docFee?.notes).toContain("$285");
    });

    it("should document average doc fee in extras", () => {
      const rules = getRulesForState("KS");
      expect(rules?.extras?.avgDocFee).toBe(285);
    });
  });

  describe("Retail Fee Taxability - UNIQUE KANSAS RULES", () => {
    it("should mark service contracts as TAXABLE (unique Kansas rule)", () => {
      const rules = getRulesForState("KS");
      const serviceContract = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(serviceContract?.taxable).toBe(true);
      expect(serviceContract?.notes).toContain("TAXABLE");
      expect(serviceContract?.notes).toContain("minority of states");
      expect(serviceContract?.notes).toContain("K.S.A. 79-3603(r)");
    });

    it("should mark GAP as NOT TAXABLE when separately stated", () => {
      const rules = getRulesForState("KS");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap?.taxable).toBe(false);
      expect(gap?.notes).toContain("NOT taxable");
      expect(gap?.notes).toContain("separately stated");
    });

    it("should mark title fees as NON-taxable", () => {
      const rules = getRulesForState("KS");
      const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-taxable", () => {
      const rules = getRulesForState("KS");
      const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Retail Product Taxability", () => {
    it("should mark accessories as TAXABLE", () => {
      const rules = getRulesForState("KS");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should mark negative equity as NOT TAXABLE (retail)", () => {
      const rules = getRulesForState("KS");
      expect(rules?.taxOnNegativeEquity).toBe(false);
    });

    it("should mark service contracts as TAXABLE (unique Kansas rule)", () => {
      const rules = getRulesForState("KS");
      expect(rules?.taxOnServiceContracts).toBe(true);
    });

    it("should mark GAP as NOT TAXABLE when separately stated", () => {
      const rules = getRulesForState("KS");
      expect(rules?.taxOnGap).toBe(false);
    });

    it("should document VSC taxability as unique feature", () => {
      const rules = getRulesForState("KS");
      expect(rules?.extras?.uniqueFeatures).toContain(
        "Service contracts (VSC) TAXABLE - unique Kansas rule"
      );
    });
  });

  describe("Vehicle Tax Scheme", () => {
    it("should use STATE_PLUS_LOCAL scheme", () => {
      const rules = getRulesForState("KS");
      expect(rules?.vehicleTaxScheme).toBe("STATE_PLUS_LOCAL");
    });

    it("should enable local sales tax", () => {
      const rules = getRulesForState("KS");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(true);
    });

    it("should have state rate of 6.5% (compensating use tax)", () => {
      const rules = getRulesForState("KS");
      expect(rules?.extras?.stateRate).toBe(6.5);
    });

    it("should have combined rate range of 6.5% to 10.75%", () => {
      const rules = getRulesForState("KS");
      expect(rules?.extras?.combinedRateRange?.min).toBe(6.5);
      expect(rules?.extras?.combinedRateRange?.max).toBe(10.75);
    });

    // eslint-disable-next-line complexity -- optional chaining counted as branches
    it("should have major jurisdiction rates documented", () => {
      const rules = getRulesForState("KS");
      expect(rules?.extras?.majorJurisdictions?.Wichita).toBeDefined();
      expect(rules?.extras?.majorJurisdictions?.Wichita?.total).toBe(7.5);
      expect(rules?.extras?.majorJurisdictions?.KansasCity).toBeDefined();
      expect(rules?.extras?.majorJurisdictions?.KansasCity?.total).toBeCloseTo(9.1, 1);
      expect(rules?.extras?.majorJurisdictions?.OverlandPark).toBeDefined();
      expect(rules?.extras?.majorJurisdictions?.Topeka).toBeDefined();
      expect(rules?.extras?.majorJurisdictions?.Lawrence).toBeDefined();
    });

    it("should document compensating use tax terminology", () => {
      const rules = getRulesForState("KS");
      expect(rules?.extras?.uniqueFeatures).toContain(
        "Compensating use tax (6.5% state rate)"
      );
    });
  });

  // ============================================================================
  // LEASE TRANSACTION RULES
  // ============================================================================

  describe("Lease Method - UNIQUE KANSAS APPROACH", () => {
    it("should use FULL_UPFRONT lease method (unique Kansas approach)", () => {
      const rules = getRulesForState("KS");
      expect(rules?.leaseRules.method).toBe("FULL_UPFRONT");
    });

    it("should have NONE as special scheme (no special treatment)", () => {
      const rules = getRulesForState("KS");
      expect(rules?.leaseRules.specialScheme).toBe("NONE");
    });

    it("should document FULL_UPFRONT method as unique feature", () => {
      const rules = getRulesForState("KS");
      expect(rules?.extras?.uniqueFeatures).toContain(
        "Lease taxation: FULL_UPFRONT method (not monthly)"
      );
    });
  });

  describe("Lease Cap Cost Reduction - UNIQUE TREATMENT", () => {
    it("should tax cap cost reduction upfront (FULLY TAXABLE)", () => {
      const rules = getRulesForState("KS");
      expect(rules?.leaseRules.taxCapReduction).toBe(true);
    });

    it("should note that cap reductions are ADDED to taxable base", () => {
      const rules = getRulesForState("KS");
      expect(rules?.leaseRules.notes).toContain("ADDED to base");
      expect(rules?.extras?.uniqueFeatures).toContain(
        "Leases: Cap cost reductions ADDED to taxable base"
      );
    });
  });

  describe("Lease Rebate Behavior", () => {
    it("should mark rebates as ALWAYS_TAXABLE on leases", () => {
      const rules = getRulesForState("KS");
      expect(rules?.leaseRules.rebateBehavior).toBe("ALWAYS_TAXABLE");
    });
  });

  describe("Lease Doc Fee Taxability", () => {
    it("should mark doc fees as ALWAYS taxable on leases", () => {
      const rules = getRulesForState("KS");
      expect(rules?.leaseRules.docFeeTaxability).toBe("ALWAYS");
    });

    it("should have doc fee in lease fee tax rules", () => {
      const rules = getRulesForState("KS");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee?.taxable).toBe(true);
      expect(docFee?.notes).toContain("TAXABLE");
    });
  });

  describe("Lease Trade-In Credit - CRITICAL DIFFERENCE", () => {
    it("should have NONE for trade-in credit (treated as cap reduction)", () => {
      const rules = getRulesForState("KS");
      expect(rules?.leaseRules.tradeInCredit).toBe("NONE");
    });

    it("should document that trade-in equity is TAXED on leases", () => {
      const rules = getRulesForState("KS");
      expect(rules?.leaseRules.notes).toContain("Trade-in equity treated as cap reduction and TAXED");
      expect(rules?.extras?.uniqueFeatures).toContain(
        "Leases: Trade-in equity taxed as cap reduction (opposite of purchase)"
      );
    });

    it("should note the opposite treatment from purchases", () => {
      const rules = getRulesForState("KS");
      expect(rules?.leaseRules.notes).toContain("opposite of purchase");
    });
  });

  describe("Lease Negative Equity", () => {
    it("should mark negative equity as TAXABLE on leases", () => {
      const rules = getRulesForState("KS");
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(true);
    });

    it("should note difference from retail (where negative equity is not taxable)", () => {
      const rules = getRulesForState("KS");
      // On retail: taxOnNegativeEquity = false
      // On lease: negativeEquityTaxable = true
      expect(rules?.taxOnNegativeEquity).toBe(false);
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(true);
    });
  });

  describe("Lease Fee Taxability", () => {
    it("should mark service contracts as TAXABLE on leases", () => {
      const rules = getRulesForState("KS");
      const serviceContract = rules?.leaseRules.feeTaxRules.find(
        (r) => r.code === "SERVICE_CONTRACT"
      );
      expect(serviceContract?.taxable).toBe(true);
      expect(serviceContract?.notes).toContain("TAXABLE");
    });

    it("should mark GAP as NOT TAXABLE on leases when separately stated", () => {
      const rules = getRulesForState("KS");
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap?.taxable).toBe(false);
      expect(gap?.notes).toContain("NOT taxable");
    });

    it("should mark acquisition fees as TAXABLE", () => {
      const rules = getRulesForState("KS");
      const acqFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "ACQUISITION_FEE");
      expect(acqFee?.taxable).toBe(true);
    });

    it("should mark title and registration fees as NON-taxable", () => {
      const rules = getRulesForState("KS");
      const title = rules?.leaseRules.feeTaxRules.find((r) => r.code === "TITLE");
      const reg = rules?.leaseRules.feeTaxRules.find((r) => r.code === "REG");
      expect(title?.taxable).toBe(false);
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Lease Title Fee Rules", () => {
    it("should have title fee rules configured", () => {
      const rules = getRulesForState("KS");
      expect(rules?.leaseRules.titleFeeRules).toBeDefined();
      expect(rules?.leaseRules.titleFeeRules.length).toBeGreaterThan(0);
    });

    it("should mark title fee as non-taxable but included in upfront", () => {
      const rules = getRulesForState("KS");
      const titleRule = rules?.leaseRules.titleFeeRules.find((r) => r.code === "TITLE");
      expect(titleRule?.taxable).toBe(false);
      expect(titleRule?.includedInUpfront).toBe(true);
      expect(titleRule?.includedInMonthly).toBe(false);
    });
  });

  describe("Lease Tax Fees Upfront", () => {
    it("should tax fees upfront (FULL_UPFRONT method)", () => {
      const rules = getRulesForState("KS");
      expect(rules?.leaseRules.taxFeesUpfront).toBe(true);
    });
  });

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  describe("Reciprocity", () => {
    it("should have reciprocity enabled", () => {
      const rules = getRulesForState("KS");
      expect(rules?.reciprocity.enabled).toBe(true);
    });

    it("should apply reciprocity to BOTH retail and lease", () => {
      const rules = getRulesForState("KS");
      expect(rules?.reciprocity.scope).toBe("BOTH");
    });

    it("should use CREDIT_UP_TO_STATE_RATE mode", () => {
      const rules = getRulesForState("KS");
      expect(rules?.reciprocity.homeStateBehavior).toBe("CREDIT_UP_TO_STATE_RATE");
    });

    it("should require proof of tax paid", () => {
      const rules = getRulesForState("KS");
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(true);
    });

    it("should base credit on TAX_PAID", () => {
      const rules = getRulesForState("KS");
      expect(rules?.reciprocity.basis).toBe("TAX_PAID");
    });

    it("should cap credit at Kansas tax amount", () => {
      const rules = getRulesForState("KS");
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(true);
    });

    it("should not have lease exception", () => {
      const rules = getRulesForState("KS");
      expect(rules?.reciprocity.hasLeaseException).toBe(false);
    });

    it("should document reciprocity for state and local taxes", () => {
      const rules = getRulesForState("KS");
      expect(rules?.reciprocity.notes).toContain("BOTH state and");
      expect(rules?.reciprocity.notes).toContain("local taxes");
    });
  });

  // ============================================================================
  // EXTRAS AND DOCUMENTATION
  // ============================================================================

  describe("Extras - Sources and Documentation", () => {
    it("should have lastUpdated date", () => {
      const rules = getRulesForState("KS");
      expect(rules?.extras?.lastUpdated).toBe("2025-11-14");
    });

    it("should list comprehensive sources", () => {
      const rules = getRulesForState("KS");
      expect(rules?.extras?.sources).toBeDefined();
      expect(Array.isArray(rules?.extras?.sources)).toBe(true);
      expect((rules?.extras?.sources as string[]).length).toBeGreaterThan(10);
    });

    it("should reference key Kansas statutes", () => {
      const rules = getRulesForState("KS");
      const sources = rules?.extras?.sources as string[];
      expect(sources.some((s) => s.includes("79-3603"))).toBe(true);
      expect(sources.some((s) => s.includes("K.A.R."))).toBe(true);
    });

    it("should reference Notice 24-19 for 2025 changes", () => {
      const rules = getRulesForState("KS");
      const sources = rules?.extras?.sources as string[];
      expect(sources.some((s) => s.includes("Notice 24-19"))).toBe(true);
    });

    it("should reference Form ST-21VT (120-day refund)", () => {
      const rules = getRulesForState("KS");
      const sources = rules?.extras?.sources as string[];
      expect(sources.some((s) => s.includes("ST-21VT"))).toBe(true);
    });

    it("should have comprehensive notes", () => {
      const rules = getRulesForState("KS");
      expect(rules?.extras?.notes).toBeDefined();
      expect((rules?.extras?.notes as string).length).toBeGreaterThan(200);
    });
  });

  describe("Extras - Unique Features", () => {
    it("should list unique features array", () => {
      const rules = getRulesForState("KS");
      expect(rules?.extras?.uniqueFeatures).toBeDefined();
      expect(Array.isArray(rules?.extras?.uniqueFeatures)).toBe(true);
      expect((rules?.extras?.uniqueFeatures as string[]).length).toBeGreaterThan(8);
    });

    it("should highlight compensating use tax terminology", () => {
      const rules = getRulesForState("KS");
      const features = rules?.extras?.uniqueFeatures as string[];
      expect(features.some((f) => f.includes("Compensating use tax"))).toBe(true);
    });

    it("should highlight 120-day sale provision", () => {
      const rules = getRulesForState("KS");
      const features = rules?.extras?.uniqueFeatures as string[];
      expect(features.some((f) => f.includes("120-day"))).toBe(true);
    });

    it("should highlight VSC taxability", () => {
      const rules = getRulesForState("KS");
      const features = rules?.extras?.uniqueFeatures as string[];
      expect(features.some((f) => f.includes("Service contracts (VSC) TAXABLE"))).toBe(true);
    });

    it("should highlight FULL_UPFRONT lease method", () => {
      const rules = getRulesForState("KS");
      const features = rules?.extras?.uniqueFeatures as string[];
      expect(features.some((f) => f.includes("FULL_UPFRONT"))).toBe(true);
    });

    it("should highlight lease trade-in taxation", () => {
      const rules = getRulesForState("KS");
      const features = rules?.extras?.uniqueFeatures as string[];
      expect(
        features.some((f) => f.includes("Trade-in equity taxed as cap reduction"))
      ).toBe(true);
    });
  });

  describe("Extras - Vehicle Property Tax", () => {
    it("should document vehicle property tax as separate from sales tax", () => {
      const rules = getRulesForState("KS");
      expect(rules?.extras?.vehiclePropertyTax).toBeDefined();
      expect(rules?.extras?.vehiclePropertyTax).toContain("annual");
      expect(rules?.extras?.vehiclePropertyTax).toContain("SEPARATE from one-time sales/use");
    });

    it("should note vehicle property tax in unique features", () => {
      const rules = getRulesForState("KS");
      const features = rules?.extras?.uniqueFeatures as string[];
      expect(
        features.some((f) => f.includes("Vehicle property tax: Annual recurring tax"))
      ).toBe(true);
    });
  });

  // ============================================================================
  // EDGE CASES AND SPECIAL SCENARIOS
  // ============================================================================

  describe("Edge Cases - Service Contract Taxation", () => {
    it("should tax service contracts whether purchased with vehicle or separately", () => {
      const rules = getRulesForState("KS");
      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc?.notes).toContain("purchased with vehicle or separately");
    });

    it("should allow trade-in allowance to be applied to VSC cost", () => {
      const rules = getRulesForState("KS");
      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc?.notes).toContain("Trade-in allowance may be applied to VSC cost");
    });
  });

  describe("Edge Cases - 120-Day Provision", () => {
    it("should document 120-day window works before OR after purchase", () => {
      const rules = getRulesForState("KS");
      expect(rules?.extras?.notes).toContain("120 days before or after purchase");
    });

    it("should note effective date of January 1, 2025", () => {
      const rules = getRulesForState("KS");
      expect(rules?.extras?.tradeIn120DayEffectiveDate).toBe("2025-01-01");
    });
  });

  describe("Edge Cases - Lease vs Purchase Differences", () => {
    it("should have opposite negative equity treatment (purchase: no tax, lease: tax)", () => {
      const rules = getRulesForState("KS");
      expect(rules?.taxOnNegativeEquity).toBe(false); // Purchase
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(true); // Lease
    });

    it("should have opposite trade-in treatment (purchase: reduces tax, lease: increases tax)", () => {
      const rules = getRulesForState("KS");
      expect(rules?.tradeInPolicy.type).toBe("FULL"); // Purchase gets credit
      expect(rules?.leaseRules.tradeInCredit).toBe("NONE"); // Lease has no credit
    });

    it("should tax cap cost reductions on leases but not on purchases", () => {
      const rules = getRulesForState("KS");
      expect(rules?.leaseRules.taxCapReduction).toBe(true);
      // No equivalent on purchase side - down payments aren't separately taxed
    });
  });

  describe("Edge Cases - GAP Insurance Separate Statement Requirement", () => {
    it("should require GAP to be separately stated for exemption", () => {
      const rules = getRulesForState("KS");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap?.notes).toContain("separately stated");
      expect(gap?.notes).toContain("clearly labeled");
    });

    it("should note GAP exemption on both retail and lease", () => {
      const rules = getRulesForState("KS");
      const retailGap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      const leaseGap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(retailGap?.taxable).toBe(false);
      expect(leaseGap?.taxable).toBe(false);
    });
  });

  // ============================================================================
  // INTEGRATION TESTS - REALISTIC SCENARIOS
  // ============================================================================

  describe("Realistic Scenario - Wichita Purchase with VSC", () => {
    // eslint-disable-next-line complexity -- optional chaining counted as branches
    it("should structure data for calculation (7.5% rate)", () => {
      const rules = getRulesForState("KS");

      // Scenario: Wichita (7.5% total: 6.5% state + 1% local)
      // $30,000 vehicle + $285 doc + $2,500 VSC - $10,000 trade

      // Expected taxable base: ($30,000 + $285 + $2,500) - $10,000 = $22,785
      // Expected tax @ 7.5%: $22,785 × 7.5% = $1,708.88

      expect(rules?.tradeInPolicy.type).toBe("FULL");
      expect(rules?.taxOnServiceContracts).toBe(true);
      expect(rules?.docFeeTaxable).toBe(true);

      // Wichita rate verification
      expect(rules?.extras?.majorJurisdictions?.Wichita?.total).toBe(7.5);
      expect(rules?.extras?.majorJurisdictions?.Wichita?.state).toBe(6.5);
      expect(rules?.extras?.majorJurisdictions?.Wichita?.county).toBe(1.0);
    });
  });

  describe("Realistic Scenario - Kansas City Purchase", () => {
    it("should structure data for calculation (9.125% rate)", () => {
      const rules = getRulesForState("KS");

      // Scenario: Kansas City, KS (9.125% total)
      // $25,000 vehicle + $285 doc + $2,000 VSC - $8,000 trade

      // Expected taxable base: ($25,000 + $285 + $2,000) - $8,000 = $19,285
      // Expected tax @ 9.125%: $19,285 × 9.125% = $1,759.76

      expect(rules?.extras?.majorJurisdictions?.KansasCity?.total).toBeCloseTo(9.1, 1);
      expect(rules?.extras?.majorJurisdictions?.KansasCity?.state).toBe(6.5);
    });
  });

  describe("Realistic Scenario - Wichita Lease", () => {
    it("should structure data for FULL_UPFRONT lease calculation", () => {
      const rules = getRulesForState("KS");

      // Scenario: Wichita lease (7.5% total)
      // Gross cap: $35,000
      // Cash down: $5,000
      // Trade equity: $3,000
      // Acquisition fee: $595

      // Expected taxable: $35,000 + $5,000 + $3,000 + $595 = $43,595
      // Expected tax @ 7.5%: $43,595 × 7.5% = $3,269.63 (all upfront)
      // Monthly payment: $450 × 36 (no additional tax)

      expect(rules?.leaseRules.method).toBe("FULL_UPFRONT");
      expect(rules?.leaseRules.taxCapReduction).toBe(true);
      expect(rules?.leaseRules.tradeInCredit).toBe("NONE");
    });
  });

  describe("Realistic Scenario - 120-Day Sale Provision", () => {
    it("should document tax credit for selling within 120 days", () => {
      const rules = getRulesForState("KS");

      // Scenario: Private sale $15,000, dealer purchase $28,000 (60 days later)
      // Expected taxable: $28,000 - $15,000 = $13,000
      // Expected tax @ 7.5%: $13,000 × 7.5% = $975
      // Tax savings: $2,100 - $975 = $1,125

      expect(rules?.tradeInPolicy.type).toBe("FULL");
      expect(rules?.extras?.tradeIn120DayEffectiveDate).toBe("2025-01-01");
    });
  });

  describe("Realistic Scenario - Trade-In with Negative Equity", () => {
    it("should NOT tax negative equity on purchases", () => {
      const rules = getRulesForState("KS");

      // Scenario: $25,000 vehicle, $10,000 trade value, $13,000 payoff = $3,000 negative
      // Expected taxable: ($25,000 + $285) - $10,000 = $15,285
      // NOT: $18,285 (do not add negative equity)
      // Expected tax @ 7.5%: $15,285 × 7.5% = $1,146.38
      // Amount financed: $15,285 + $1,146.38 + $3,000 = $19,431.38

      expect(rules?.taxOnNegativeEquity).toBe(false);
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });

    it("should tax negative equity on leases", () => {
      const rules = getRulesForState("KS");

      // Scenario: $32,000 cap, $8,000 trade value, $11,000 payoff = $3,000 negative
      // Expected cap cost: $35,000 (includes negative equity)
      // Expected tax @ 7.5%: $35,000 × 7.5% = $2,625

      expect(rules?.leaseRules.negativeEquityTaxable).toBe(true);
    });
  });

  describe("Realistic Scenario - Service Contract Separate Purchase", () => {
    it("should tax VSC even when purchased separately after vehicle", () => {
      const rules = getRulesForState("KS");
      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");

      // Kansas taxes VSC whether purchased with vehicle or separately
      expect(vsc?.taxable).toBe(true);
      expect(vsc?.notes).toContain("purchased with vehicle or separately");
    });
  });
});
