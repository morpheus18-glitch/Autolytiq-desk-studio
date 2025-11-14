import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Virginia (VA) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load Virginia rules successfully", () => {
    const rules = getRulesForState("VA");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("VA");
  });

  it("should mark Virginia as implemented (not a stub)", () => {
    expect(isStateImplemented("VA")).toBe(true);
  });

  it("should have version number 2", () => {
    const rules = getRulesForState("VA");
    expect(rules?.version).toBe(2);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("VA");
    const rulesLower = getRulesForState("va");
    const rulesMixed = getRulesForState("Va");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("VA");
    expect(rulesLower?.stateCode).toBe("VA");
    expect(rulesMixed?.stateCode).toBe("VA");
  });

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  describe("Retail Trade-In Policy", () => {
    it("should have NO trade-in credit (one of strictest in US)", () => {
      const rules = getRulesForState("VA");
      expect(rules?.tradeInPolicy.type).toBe("NONE");
    });

    it("should document that VA is one of 7 states with no trade-in credit", () => {
      const rules = getRulesForState("VA");
      // The extras field should note this unique feature
      expect(rules?.extras?.tradeInCreditAllowed).toBe(false);
      expect(rules?.extras?.uniqueFeatures).toContain(
        "NO TRADE-IN CREDIT on either retail or leases (one of 7 strictest states)"
      );
    });
  });

  describe("Retail Rebate Rules", () => {
    it("should have rebate rules for both manufacturer and dealer", () => {
      const rules = getRulesForState("VA");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as NOT TAXABLE (favorable)", () => {
      const rules = getRulesForState("VA");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate?.taxable).toBe(false);
      expect(mfrRebate?.notes).toContain("reduce sale price before tax");
    });

    it("should mark dealer rebates as NOT TAXABLE (favorable)", () => {
      const rules = getRulesForState("VA");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate?.taxable).toBe(false);
      expect(dealerRebate?.notes).toContain("reduce sale price before tax");
    });
  });

  describe("Retail Doc Fee", () => {
    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("VA");
      expect(rules?.docFeeTaxable).toBe(true);
    });

    it("should have NO CAP on doc fees", () => {
      const rules = getRulesForState("VA");
      expect(rules?.extras?.docFeeCapAmount).toBeNull();
    });

    it("should document high average doc fees ($600-$700)", () => {
      const rules = getRulesForState("VA");
      expect(rules?.extras?.docFeeAverage).toBe(650);
      expect(rules?.extras?.docFeeMedian).toBe(899);
    });

    it("should have doc fee in fee tax rules", () => {
      const rules = getRulesForState("VA");
      const docFee = rules?.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee?.taxable).toBe(true);
      expect(docFee?.notes).toContain("NO STATUTORY CAP");
    });
  });

  describe("Retail Fee Taxability", () => {
    it("should mark service contracts as TAXABLE at 50% (unique VA rule)", () => {
      const rules = getRulesForState("VA");
      const serviceContract = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(serviceContract?.taxable).toBe(true);
      expect(serviceContract?.notes).toContain("50%");
      expect(serviceContract?.notes).toContain("23VAC10-210-910");
    });

    it("should have 50% service contract tax rate in extras", () => {
      const rules = getRulesForState("VA");
      expect(rules?.extras?.serviceContractTaxRate).toBe(0.5);
    });

    it("should mark GAP as NOT TAXABLE (no clear statute)", () => {
      const rules = getRulesForState("VA");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap?.taxable).toBe(false);
      expect(gap?.notes).toContain("NOT insurance");
      expect(gap?.notes).toContain("no explicit sales tax statute");
    });

    it("should mark title fees as NON-taxable", () => {
      const rules = getRulesForState("VA");
      const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-taxable", () => {
      const rules = getRulesForState("VA");
      const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Retail Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("VA");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should NOT tax negative equity (financing issue)", () => {
      const rules = getRulesForState("VA");
      expect(rules?.taxOnNegativeEquity).toBe(false);
    });

    it("should tax service contracts (at 50%)", () => {
      const rules = getRulesForState("VA");
      expect(rules?.taxOnServiceContracts).toBe(true);
    });

    it("should NOT tax GAP", () => {
      const rules = getRulesForState("VA");
      expect(rules?.taxOnGap).toBe(false);
    });
  });

  describe("Vehicle Tax Scheme", () => {
    it("should use STATE_ONLY tax scheme (flat 4.15%)", () => {
      const rules = getRulesForState("VA");
      expect(rules?.vehicleTaxScheme).toBe("STATE_ONLY");
    });

    it("should NOT use local sales tax", () => {
      const rules = getRulesForState("VA");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
    });

    it("should have 4.15% state rate", () => {
      const rules = getRulesForState("VA");
      expect(rules?.extras?.stateRate).toBe(4.15);
    });

    it("should have $75 minimum tax", () => {
      const rules = getRulesForState("VA");
      expect(rules?.extras?.minimumTax).toBe(75);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION RULES
  // ============================================================================

  describe("Lease Tax Method", () => {
    it("should use FULL_UPFRONT lease method (tax on cap cost at signing)", () => {
      const rules = getRulesForState("VA");
      const leaseRules = rules?.leaseRules;
      expect(leaseRules?.method).toBe("FULL_UPFRONT");
    });

    it("should NOT tax cap cost reduction itself (reduces taxable base)", () => {
      const rules = getRulesForState("VA");
      const leaseRules = rules?.leaseRules;
      expect(leaseRules?.taxCapReduction).toBe(false);
    });
  });

  describe("Lease Rebate Behavior", () => {
    it("should follow retail rebate rules on leases", () => {
      const rules = getRulesForState("VA");
      const leaseRules = rules?.leaseRules;
      expect(leaseRules?.rebateBehavior).toBe("FOLLOW_RETAIL_RULE");
    });
  });

  describe("Lease Doc Fee", () => {
    it("should mark doc fee as ALWAYS taxable on leases", () => {
      const rules = getRulesForState("VA");
      const leaseRules = rules?.leaseRules;
      expect(leaseRules?.docFeeTaxability).toBe("ALWAYS");
    });

    it("should have doc fee in lease fee tax rules", () => {
      const rules = getRulesForState("VA");
      const leaseRules = rules?.leaseRules;
      const docFee = leaseRules?.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee?.taxable).toBe(true);
      expect(docFee?.notes).toContain("NO cap");
    });
  });

  describe("Lease Trade-In Credit", () => {
    it("should have NO trade-in credit on leases (same as retail)", () => {
      const rules = getRulesForState("VA");
      const leaseRules = rules?.leaseRules;
      expect(leaseRules?.tradeInCredit).toBe("NONE");
    });

    it("should document that trade-ins only reduce cap cost, no separate credit", () => {
      const rules = getRulesForState("VA");
      const leaseRules = rules?.leaseRules;
      expect(leaseRules?.notes).toContain("NO tax credit");
      expect(leaseRules?.notes).toContain("only reduce cap cost");
    });
  });

  describe("Lease Negative Equity", () => {
    it("should NOT tax negative equity on leases", () => {
      const rules = getRulesForState("VA");
      const leaseRules = rules?.leaseRules;
      expect(leaseRules?.negativeEquityTaxable).toBe(false);
    });
  });

  describe("Lease Fee Taxability", () => {
    it("should tax service contracts on leases at 50%", () => {
      const rules = getRulesForState("VA");
      const leaseRules = rules?.leaseRules;
      const serviceContract = leaseRules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(serviceContract?.taxable).toBe(true);
      expect(serviceContract?.notes).toContain("50%");
    });

    it("should NOT tax GAP on leases", () => {
      const rules = getRulesForState("VA");
      const leaseRules = rules?.leaseRules;
      const gap = leaseRules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap?.taxable).toBe(false);
    });

    it("should NOT tax title fees on leases", () => {
      const rules = getRulesForState("VA");
      const leaseRules = rules?.leaseRules;
      const title = leaseRules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title?.taxable).toBe(false);
    });

    it("should NOT tax registration fees on leases", () => {
      const rules = getRulesForState("VA");
      const leaseRules = rules?.leaseRules;
      const reg = leaseRules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Lease Title Fee Rules", () => {
    it("should have correct title fee configuration", () => {
      const rules = getRulesForState("VA");
      const leaseRules = rules?.leaseRules;
      const titleRule = leaseRules?.titleFeeRules.find((r) => r.code === "TITLE");

      expect(titleRule).toBeDefined();
      expect(titleRule?.taxable).toBe(false);
      expect(titleRule?.includedInCapCost).toBe(true);
      expect(titleRule?.includedInUpfront).toBe(true);
      expect(titleRule?.includedInMonthly).toBe(false);
    });

    it("should have correct registration fee configuration", () => {
      const rules = getRulesForState("VA");
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
      const rules = getRulesForState("VA");
      const leaseRules = rules?.leaseRules;
      expect(leaseRules?.taxFeesUpfront).toBe(true);
    });

    it("should have VA_USAGE special scheme (dual tax system)", () => {
      const rules = getRulesForState("VA");
      const leaseRules = rules?.leaseRules;
      expect(leaseRules?.specialScheme).toBe("VA_USAGE");
    });

    it("should document personal property tax in extras", () => {
      const rules = getRulesForState("VA");
      expect(rules?.extras?.leasePersonalPropertyTax).toBe(true);
      expect(rules?.extras?.personalPropertyTaxDescription).toBeDefined();
    });

    it("should have comprehensive lease notes", () => {
      const rules = getRulesForState("VA");
      const leaseRules = rules?.leaseRules;
      expect(leaseRules?.notes).toBeDefined();
      expect(leaseRules?.notes).toContain("FULL UPFRONT");
      expect(leaseRules?.notes).toContain("4.15%");
      expect(leaseRules?.notes).toContain("VA_USAGE");
    });
  });

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  describe("Reciprocity Configuration", () => {
    it("should have reciprocity enabled", () => {
      const rules = getRulesForState("VA");
      const reciprocity = rules?.reciprocity;
      expect(reciprocity?.enabled).toBe(true);
    });

    it("should apply to both retail and lease", () => {
      const rules = getRulesForState("VA");
      const reciprocity = rules?.reciprocity;
      expect(reciprocity?.scope).toBe("BOTH");
    });

    it("should use CREDIT_UP_TO_STATE_RATE behavior", () => {
      const rules = getRulesForState("VA");
      const reciprocity = rules?.reciprocity;
      expect(reciprocity?.homeStateBehavior).toBe("CREDIT_UP_TO_STATE_RATE");
    });

    it("should require proof of tax paid", () => {
      const rules = getRulesForState("VA");
      const reciprocity = rules?.reciprocity;
      expect(reciprocity?.requireProofOfTaxPaid).toBe(true);
    });

    it("should base credit on TAX_PAID", () => {
      const rules = getRulesForState("VA");
      const reciprocity = rules?.reciprocity;
      expect(reciprocity?.basis).toBe("TAX_PAID");
    });

    it("should cap credit at Virginia's tax rate", () => {
      const rules = getRulesForState("VA");
      const reciprocity = rules?.reciprocity;
      expect(reciprocity?.capAtThisStatesTax).toBe(true);
    });

    it("should NOT have lease-specific exceptions", () => {
      const rules = getRulesForState("VA");
      const reciprocity = rules?.reciprocity;
      expect(reciprocity?.hasLeaseException).toBe(false);
    });

    it("should document 12-month window exemption", () => {
      const rules = getRulesForState("VA");
      const reciprocity = rules?.reciprocity;
      expect(reciprocity?.notes).toContain("12 months");
      expect(reciprocity?.notes).toContain("EXEMPT");
    });
  });

  // ============================================================================
  // UNIQUE VIRGINIA FEATURES
  // ============================================================================

  describe("Unique Virginia Features", () => {
    it("should document no trade-in credit as unique feature", () => {
      const rules = getRulesForState("VA");
      const features = rules?.extras?.uniqueFeatures;
      expect(features).toContain("NO TRADE-IN CREDIT on either retail or leases (one of 7 strictest states)");
    });

    it("should document 50% service contract tax as unique feature", () => {
      const rules = getRulesForState("VA");
      const features = rules?.extras?.uniqueFeatures;
      expect(features).toContain("Service contracts taxed at 50% (unique 'half parts, half labor' rule)");
    });

    it("should document full upfront lease taxation as unique feature", () => {
      const rules = getRulesForState("VA");
      const features = rules?.extras?.uniqueFeatures;
      expect(features).toContain("Leases taxed FULLY UPFRONT on capitalized cost (not monthly payments)");
    });

    it("should document flat 4.15% state rate", () => {
      const rules = getRulesForState("VA");
      const features = rules?.extras?.uniqueFeatures;
      expect(features).toContain("Flat 4.15% statewide motor vehicle rate (no local additions)");
    });

    it("should document separate personal property tax", () => {
      const rules = getRulesForState("VA");
      const features = rules?.extras?.uniqueFeatures;
      expect(features).toContain("Separate personal property tax system (semi-annual bills, varies by locality)");
    });

    it("should document favorable rebate treatment", () => {
      const rules = getRulesForState("VA");
      const features = rules?.extras?.uniqueFeatures;
      expect(features).toContain("Both manufacturer AND dealer rebates reduce taxable base (favorable)");
    });

    it("should document no doc fee cap", () => {
      const rules = getRulesForState("VA");
      const features = rules?.extras?.uniqueFeatures;
      expect(features).toContain("NO doc fee cap (dealers charge $400-$900+, among highest in nation)");
    });

    it("should document 12-month reciprocity window", () => {
      const rules = getRulesForState("VA");
      const features = rules?.extras?.uniqueFeatures;
      expect(features).toContain("Reciprocity with 12-month window (exempt if owned > 12 months)");
    });

    it("should document $75 minimum tax", () => {
      const rules = getRulesForState("VA");
      const features = rules?.extras?.uniqueFeatures;
      expect(features).toContain("Minimum tax $75 regardless of vehicle value");
    });

    it("should document dual tax burden for leases", () => {
      const rules = getRulesForState("VA");
      const features = rules?.extras?.uniqueFeatures;
      expect(features).toContain("Dual tax burden for leases (upfront sales tax + annual property tax)");
    });
  });

  // ============================================================================
  // IMPLEMENTATION NOTES
  // ============================================================================

  describe("Implementation Notes", () => {
    it("should have implementation notes for tax engine", () => {
      const rules = getRulesForState("VA");
      const notes = rules?.extras?.implementationNotes;
      expect(notes).toBeDefined();
      expect(Array.isArray(notes)).toBe(true);
    });

    it("should specify trade-in must NOT reduce taxable base", () => {
      const rules = getRulesForState("VA");
      const notes = rules?.extras?.implementationNotes;
      expect(notes).toContain("Trade-in value MUST NOT reduce taxable base for either retail or lease calculations");
    });

    it("should specify 50% service contract calculation", () => {
      const rules = getRulesForState("VA");
      const notes = rules?.extras?.implementationNotes;
      expect(notes).toContain("Service contract taxable amount is contract_price × 50% for parts+labor contracts");
    });

    it("should specify lease tax calculation method", () => {
      const rules = getRulesForState("VA");
      const notes = rules?.extras?.implementationNotes;
      expect(notes).toContain("Lease tax calculated as adjusted_cap_cost × 4.15% paid once at signing");
    });

    it("should specify minimum tax check", () => {
      const rules = getRulesForState("VA");
      const notes = rules?.extras?.implementationNotes;
      expect(notes).toContain("Minimum tax check: if calculated_tax < $75, then tax_owed = $75");
    });

    it("should specify reciprocity credit cap", () => {
      const rules = getRulesForState("VA");
      const notes = rules?.extras?.implementationNotes;
      expect(notes).toContain("Reciprocity credit capped at VA rate (4.15% × vehicle_price), requires proof");
    });
  });

  // ============================================================================
  // EDGE CASES AND SPECIAL SCENARIOS
  // ============================================================================

  describe("Edge Cases", () => {
    it("should handle GAP taxability conservatively (not taxed)", () => {
      const rules = getRulesForState("VA");
      expect(rules?.taxOnGap).toBe(false);
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap?.taxable).toBe(false);
      expect(gap?.notes).toContain("Conservative approach");
    });

    it("should differentiate service contracts from insurance company warranties", () => {
      const rules = getRulesForState("VA");
      const serviceContract = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(serviceContract?.notes).toContain("Insurance company warranties");
      expect(serviceContract?.notes).toContain("NOT taxable");
    });

    it("should document that negative equity is NOT taxable", () => {
      const rules = getRulesForState("VA");
      expect(rules?.taxOnNegativeEquity).toBe(false);
      const notes = rules?.extras?.implementationNotes;
      expect(notes).toContain("Negative equity is NOT taxable for either retail purchases or leases");
    });
  });

  // ============================================================================
  // DATA QUALITY AND DOCUMENTATION
  // ============================================================================

  describe("Documentation Quality", () => {
    it("should have comprehensive sources listed", () => {
      const rules = getRulesForState("VA");
      const sources = rules?.extras?.sources;
      expect(sources).toBeDefined();
      expect(Array.isArray(sources)).toBe(true);
      expect(sources?.length).toBeGreaterThan(5);
    });

    it("should cite Virginia Code Title 58.1", () => {
      const rules = getRulesForState("VA");
      const sources = rules?.extras?.sources;
      const hasVACode = sources?.some((s) => s.includes("Virginia Code Title 58.1"));
      expect(hasVACode).toBe(true);
    });

    it("should cite Virginia Administrative Code", () => {
      const rules = getRulesForState("VA");
      const sources = rules?.extras?.sources;
      const hasAdminCode = sources?.some((s) => s.includes("Virginia Administrative Code"));
      expect(hasAdminCode).toBe(true);
    });

    it("should have last updated date", () => {
      const rules = getRulesForState("VA");
      expect(rules?.extras?.lastUpdated).toBeDefined();
      expect(rules?.extras?.lastUpdated).toMatch(/2025-11-13/);
    });

    it("should have status marked as PRODUCTION_READY", () => {
      const rules = getRulesForState("VA");
      expect(rules?.extras?.status).toBe("PRODUCTION_READY");
    });

    it("should have research quality marked as COMPREHENSIVE", () => {
      const rules = getRulesForState("VA");
      expect(rules?.extras?.researchQuality).toBe("COMPREHENSIVE");
    });
  });

  // ============================================================================
  // EXPLANATION FIELDS
  // ============================================================================

  describe("Explanation Fields", () => {
    it("should have trade-in policy explanation", () => {
      const rules = getRulesForState("VA");
      expect(rules?.extras?.tradeInPolicyExplanation).toBeDefined();
      expect(rules?.extras?.tradeInPolicyExplanation).toContain("NOT allow");
      expect(rules?.extras?.tradeInPolicyExplanation).toContain("7 states");
    });

    it("should have lease taxation explanation", () => {
      const rules = getRulesForState("VA");
      expect(rules?.extras?.leaseTaxationExplanation).toBeDefined();
      expect(rules?.extras?.leaseTaxationExplanation).toContain("FULL_UPFRONT");
      expect(rules?.extras?.leaseTaxationExplanation).toContain("4.15%");
    });

    it("should have service contract explanation", () => {
      const rules = getRulesForState("VA");
      expect(rules?.extras?.serviceContractExplanation).toBeDefined();
      expect(rules?.extras?.serviceContractExplanation).toContain("50%");
      expect(rules?.extras?.serviceContractExplanation).toContain("23VAC10-210-910");
    });

    it("should have reciprocity explanation", () => {
      const rules = getRulesForState("VA");
      expect(rules?.extras?.reciprocityExplanation).toBeDefined();
      expect(rules?.extras?.reciprocityExplanation).toContain("12-MONTH WINDOW");
      expect(rules?.extras?.reciprocityExplanation).toContain("EXEMPT");
    });

    it("should have personal property tax overview", () => {
      const rules = getRulesForState("VA");
      expect(rules?.extras?.personalPropertyTaxOverview).toBeDefined();
      expect(rules?.extras?.personalPropertyTaxOverview).toContain("DUAL TAX SYSTEM");
      expect(rules?.extras?.personalPropertyTaxOverview).toContain("Semi-annual");
    });
  });

  // ============================================================================
  // COMMON DEALERSHIP FEES
  // ============================================================================

  describe("Common Dealership Fees Reference", () => {
    it("should have doc fee information", () => {
      const rules = getRulesForState("VA");
      const fees = rules?.extras?.commonDealershipFees;
      expect(fees?.docFee).toBeDefined();
      expect(fees?.docFee?.cap).toBeNull();
      expect(fees?.docFee?.taxable).toBe(true);
    });

    it("should have service contract information", () => {
      const rules = getRulesForState("VA");
      const fees = rules?.extras?.commonDealershipFees;
      expect(fees?.serviceContract).toBeDefined();
      expect(fees?.serviceContract?.taxablePercent).toBe(50);
    });

    it("should have GAP information", () => {
      const rules = getRulesForState("VA");
      const fees = rules?.extras?.commonDealershipFees;
      expect(fees?.gap).toBeDefined();
      expect(fees?.gap?.taxable).toBe(false);
    });

    it("should have title fee information", () => {
      const rules = getRulesForState("VA");
      const fees = rules?.extras?.commonDealershipFees;
      expect(fees?.title).toBeDefined();
      expect(fees?.title?.taxable).toBe(false);
    });

    it("should have accessories information", () => {
      const rules = getRulesForState("VA");
      const fees = rules?.extras?.commonDealershipFees;
      expect(fees?.accessories).toBeDefined();
      expect(fees?.accessories?.taxable).toBe(true);
      expect(fees?.accessories?.taxRate).toBe(4.15);
    });
  });

  // ============================================================================
  // RATE AND DATE INFORMATION
  // ============================================================================

  describe("Rate and Date Information", () => {
    it("should have correct state rate", () => {
      const rules = getRulesForState("VA");
      expect(rules?.extras?.stateRate).toBe(4.15);
    });

    it("should have rate effective date", () => {
      const rules = getRulesForState("VA");
      expect(rules?.extras?.rateEffectiveDate).toBe("2016-07-01");
    });

    it("should have minimum tax amount", () => {
      const rules = getRulesForState("VA");
      expect(rules?.extras?.minimumTax).toBe(75);
    });

    it("should have service contract tax rate", () => {
      const rules = getRulesForState("VA");
      expect(rules?.extras?.serviceContractTaxRate).toBe(0.5);
    });
  });
});
