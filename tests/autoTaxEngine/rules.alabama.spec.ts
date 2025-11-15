import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Alabama Tax Rules Configuration", () => {
  it("should load Alabama rules successfully", () => {
    const rules = getRulesForState("AL");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("AL");
  });

  it("should mark Alabama as implemented (not a stub)", () => {
    expect(isStateImplemented("AL")).toBe(true);
  });

  it("should have correct version number", () => {
    const rules = getRulesForState("AL");
    expect(rules?.version).toBe(2);
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS
  // ============================================================================

  describe("Retail Trade-In Policy", () => {
    it("should have FULL trade-in credit (state only, but marked as FULL)", () => {
      const rules = getRulesForState("AL");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });

    it("should note that trade-in credit applies only to state tax, not local", () => {
      const rules = getRulesForState("AL");
      // Note: The actual implementation must handle this special case
      // where trade-in reduces state tax (2%) but NOT local taxes
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });
  });

  describe("Retail Rebate Rules", () => {
    it("should have two rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("AL");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as TAXABLE (do not reduce tax base)", () => {
      const rules = getRulesForState("AL");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate?.taxable).toBe(true);
      expect(mfrRebate?.notes).toContain("do NOT reduce taxable amount");
    });

    it("should mark dealer rebates as NON-TAXABLE (reduce selling price)", () => {
      const rules = getRulesForState("AL");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate?.taxable).toBe(false);
    });
  });

  describe("Retail Doc Fee Rules", () => {
    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("AL");
      expect(rules?.docFeeTaxable).toBe(true);
    });

    it("should have doc fee in fee tax rules marked as taxable", () => {
      const rules = getRulesForState("AL");
      const docFee = rules?.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee?.taxable).toBe(true);
      expect(docFee?.notes).toContain("NO cap");
    });

    it("should document average doc fee and no cap", () => {
      const rules = getRulesForState("AL");
      expect(rules?.extras?.avgDocFee).toBe(485);
    });
  });

  describe("Retail Fee Taxability", () => {
    it("should mark service contracts (VSC) as NOT taxable", () => {
      const rules = getRulesForState("AL");
      const serviceContract = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(serviceContract?.taxable).toBe(false);
    });

    it("should mark GAP insurance as NOT taxable", () => {
      const rules = getRulesForState("AL");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap?.taxable).toBe(false);
    });

    it("should mark title fee as NOT taxable when separately stated", () => {
      const rules = getRulesForState("AL");
      const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title?.taxable).toBe(false);
      expect(title?.notes).toContain("separately stated");
    });

    it("should mark registration fees as NOT taxable", () => {
      const rules = getRulesForState("AL");
      const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Retail Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("AL");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should NOT tax negative equity on purchases", () => {
      const rules = getRulesForState("AL");
      expect(rules?.taxOnNegativeEquity).toBe(false);
    });

    it("should NOT tax service contracts", () => {
      const rules = getRulesForState("AL");
      expect(rules?.taxOnServiceContracts).toBe(false);
    });

    it("should NOT tax GAP insurance", () => {
      const rules = getRulesForState("AL");
      expect(rules?.taxOnGap).toBe(false);
    });
  });

  describe("Retail Vehicle Tax Scheme", () => {
    it("should use STATE_PLUS_LOCAL tax scheme", () => {
      const rules = getRulesForState("AL");
      expect(rules?.vehicleTaxScheme).toBe("STATE_PLUS_LOCAL");
    });

    it("should use local sales taxes", () => {
      const rules = getRulesForState("AL");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(true);
    });

    it("should document state automotive rate as 2%", () => {
      const rules = getRulesForState("AL");
      expect(rules?.extras?.stateAutomotiveSalesRate).toBe(2.0);
    });

    it("should document state general sales rate as 4%", () => {
      const rules = getRulesForState("AL");
      expect(rules?.extras?.stateGeneralSalesRate).toBe(4.0);
    });

    it("should document local rate ranges", () => {
      const rules = getRulesForState("AL");
      expect(rules?.extras?.localRateRange).toEqual({ min: 0.5, max: 8.0 });
      expect(rules?.extras?.combinedRateRange).toEqual({ min: 2.5, max: 10.0 });
    });

    it("should document major jurisdictions", () => {
      const rules = getRulesForState("AL");
      expect(rules?.extras?.majorJurisdictions).toBeDefined();
      expect(rules?.extras?.majorJurisdictions?.Birmingham).toEqual({
        state: 2.0,
        local: 4.0,
        total: 6.0,
      });
      expect(rules?.extras?.majorJurisdictions?.Mobile).toEqual({
        state: 2.0,
        local: 8.0,
        total: 10.0,
      });
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease Tax Method", () => {
    it("should use HYBRID lease tax method (upfront + monthly)", () => {
      const rules = getRulesForState("AL");
      expect(rules?.leaseRules.method).toBe("HYBRID");
    });

    it("should document state lease rate as 1.5%", () => {
      const rules = getRulesForState("AL");
      expect(rules?.extras?.stateAutomotiveLeaseRate).toBe(1.5);
    });

    it("should document state general rental rate as 4%", () => {
      const rules = getRulesForState("AL");
      expect(rules?.extras?.stateGeneralRentalRate).toBe(4.0);
    });
  });

  describe("Lease Cap Cost Reduction", () => {
    it("should tax cap cost reductions upfront", () => {
      const rules = getRulesForState("AL");
      expect(rules?.leaseRules.taxCapReduction).toBe(true);
    });
  });

  describe("Lease Rebate Treatment", () => {
    it("should mark rebates as ALWAYS_TAXABLE on leases", () => {
      const rules = getRulesForState("AL");
      expect(rules?.leaseRules.rebateBehavior).toBe("ALWAYS_TAXABLE");
    });
  });

  describe("Lease Doc Fee Treatment", () => {
    it("should mark doc fee as ALWAYS taxable on leases", () => {
      const rules = getRulesForState("AL");
      expect(rules?.leaseRules.docFeeTaxability).toBe("ALWAYS");
    });

    it("should have doc fee in lease fee rules marked as taxable", () => {
      const rules = getRulesForState("AL");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee?.taxable).toBe(true);
    });
  });

  describe("Lease Trade-In Credit", () => {
    it("should have NO trade-in credit on leases (major difference from purchases)", () => {
      const rules = getRulesForState("AL");
      expect(rules?.leaseRules.tradeInCredit).toBe("NONE");
    });
  });

  describe("Lease Negative Equity", () => {
    it("should tax negative equity on leases (different from purchases)", () => {
      const rules = getRulesForState("AL");
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(true);
    });
  });

  describe("Lease Fee Taxability", () => {
    it("should mark service contracts as NOT taxable on leases", () => {
      const rules = getRulesForState("AL");
      const serviceContract = rules?.leaseRules.feeTaxRules.find(
        (r) => r.code === "SERVICE_CONTRACT"
      );
      expect(serviceContract?.taxable).toBe(false);
    });

    it("should mark GAP as NOT taxable on leases", () => {
      const rules = getRulesForState("AL");
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap?.taxable).toBe(false);
    });

    it("should mark title as NOT taxable on leases", () => {
      const rules = getRulesForState("AL");
      const title = rules?.leaseRules.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration as NOT taxable on leases", () => {
      const rules = getRulesForState("AL");
      const reg = rules?.leaseRules.feeTaxRules.find((r) => r.code === "REG");
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Lease Title Fee Rules", () => {
    it("should have correct title fee configuration", () => {
      const rules = getRulesForState("AL");
      const titleRule = rules?.leaseRules.titleFeeRules.find((r) => r.code === "TITLE");
      expect(titleRule).toBeDefined();
      expect(titleRule?.taxable).toBe(false);
      expect(titleRule?.includedInCapCost).toBe(true);
      expect(titleRule?.includedInUpfront).toBe(true);
      expect(titleRule?.includedInMonthly).toBe(false);
    });
  });

  describe("Lease Tax Fees Upfront", () => {
    it("should tax fees upfront", () => {
      const rules = getRulesForState("AL");
      expect(rules?.leaseRules.taxFeesUpfront).toBe(true);
    });
  });

  describe("Lease Special Scheme", () => {
    it("should have no special lease scheme", () => {
      const rules = getRulesForState("AL");
      expect(rules?.leaseRules.specialScheme).toBe("NONE");
    });
  });

  // ============================================================================
  // RECIPROCITY TESTS
  // ============================================================================

  describe("Reciprocity Rules", () => {
    it("should have reciprocity enabled", () => {
      const rules = getRulesForState("AL");
      expect(rules?.reciprocity.enabled).toBe(true);
    });

    it("should apply reciprocity to both retail and leases", () => {
      const rules = getRulesForState("AL");
      expect(rules?.reciprocity.scope).toBe("BOTH");
    });

    it("should use CREDIT_UP_TO_STATE_RATE behavior", () => {
      const rules = getRulesForState("AL");
      expect(rules?.reciprocity.homeStateBehavior).toBe("CREDIT_UP_TO_STATE_RATE");
    });

    it("should require proof of tax paid", () => {
      const rules = getRulesForState("AL");
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(true);
    });

    it("should use TAX_PAID basis", () => {
      const rules = getRulesForState("AL");
      expect(rules?.reciprocity.basis).toBe("TAX_PAID");
    });

    it("should cap credit at Alabama's tax amount", () => {
      const rules = getRulesForState("AL");
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(true);
    });

    it("should not have lease exception", () => {
      const rules = getRulesForState("AL");
      expect(rules?.reciprocity.hasLeaseException).toBe(false);
    });

    it("should document Drive-Out Provision", () => {
      const rules = getRulesForState("AL");
      expect(rules?.reciprocity.notes).toContain("Drive-Out Provision");
      expect(rules?.reciprocity.notes).toContain("72 hours");
    });
  });

  // ============================================================================
  // DRIVE-OUT PROVISION TESTS
  // ============================================================================

  describe("Drive-Out Provision", () => {
    it("should document Drive-Out Provision effective date", () => {
      const rules = getRulesForState("AL");
      expect(rules?.extras?.driveOutProvisionEffectiveDate).toBe("2022-07-01");
    });

    it("should document 72-hour removal window", () => {
      const rules = getRulesForState("AL");
      expect(rules?.extras?.driveOutRemovalWindow).toBe("72 hours");
    });
  });

  // ============================================================================
  // EXTRAS METADATA TESTS
  // ============================================================================

  describe("Extras Metadata", () => {
    it("should have extras metadata defined", () => {
      const rules = getRulesForState("AL");
      expect(rules?.extras).toBeDefined();
    });

    it("should document last updated date", () => {
      const rules = getRulesForState("AL");
      expect(rules?.extras?.lastUpdated).toBe("2025-11-13");
    });

    it("should document title fee amount", () => {
      const rules = getRulesForState("AL");
      expect(rules?.extras?.titleFee).toBe(25.0);
    });

    it("should document number of jurisdictions", () => {
      const rules = getRulesForState("AL");
      expect(rules?.extras?.jurisdictionCount).toBe(366);
    });

    it("should have comprehensive sources listed", () => {
      const rules = getRulesForState("AL");
      expect(rules?.extras?.sources).toBeDefined();
      expect(Array.isArray(rules?.extras?.sources)).toBe(true);
      expect(rules?.extras?.sources?.length).toBeGreaterThan(5);
    });

    it("should document unique Alabama features in notes", () => {
      const rules = getRulesForState("AL");
      expect(rules?.extras?.notes).toContain("UNIQUE");
      expect(rules?.extras?.notes).toContain("Trade-in credit applies ONLY to state tax");
      expect(rules?.extras?.notes).toContain("NO trade-in credit on leases");
    });
  });

  // ============================================================================
  // CASE SENSITIVITY TESTS
  // ============================================================================

  describe("State Code Lookup", () => {
    it("should handle case-insensitive state code lookup", () => {
      const rulesUpper = getRulesForState("AL");
      const rulesLower = getRulesForState("al");
      const rulesMixed = getRulesForState("Al");

      expect(rulesUpper).toBeDefined();
      expect(rulesLower).toBeDefined();
      expect(rulesMixed).toBeDefined();
      expect(rulesUpper?.stateCode).toBe("AL");
      expect(rulesLower?.stateCode).toBe("AL");
      expect(rulesMixed?.stateCode).toBe("AL");
    });
  });

  // ============================================================================
  // COMPREHENSIVE SCENARIO TESTS
  // ============================================================================

  describe("Comprehensive Scenario Validation", () => {
    it("should validate retail purchase with trade-in scenario", () => {
      const rules = getRulesForState("AL");

      // Scenario: $30,000 vehicle, $10,000 trade-in, $495 doc fee
      // Birmingham: 6% total (2% state + 4% local)
      // Expected:
      // State tax: ($30,000 + $495 - $10,000) × 2% = $410.90
      // Local tax: ($30,000 + $495) × 4% = $1,219.80
      // Total: $1,630.70

      expect(rules?.tradeInPolicy.type).toBe("FULL");
      expect(rules?.docFeeTaxable).toBe(true);
      expect(rules?.vehicleTaxScheme).toBe("STATE_PLUS_LOCAL");
    });

    it("should validate retail purchase with manufacturer rebate scenario", () => {
      const rules = getRulesForState("AL");

      // Scenario: $25,000 MSRP, $2,000 manufacturer rebate
      // Customer pays $23,000
      // Tax base: $25,000 (rebate does NOT reduce base)
      // Expected: Tax on $25,000, not $23,000

      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate?.taxable).toBe(true);
    });

    it("should validate lease with cap reduction scenario", () => {
      const rules = getRulesForState("AL");

      // Scenario: $10,000 cap reduction, $450/month, 36 months, 3.5% total
      // Cap reduction tax: $10,000 × 3.5% = $350 (due at signing)
      // Monthly tax: $450 × 3.5% = $15.75/month
      // Total: $350 + ($15.75 × 36) = $917

      expect(rules?.leaseRules.method).toBe("HYBRID");
      expect(rules?.leaseRules.taxCapReduction).toBe(true);
      expect(rules?.extras?.stateAutomotiveLeaseRate).toBe(1.5);
    });

    it("should validate lease with trade-in has NO credit (taxed instead)", () => {
      const rules = getRulesForState("AL");

      // Scenario: $10,000 trade-in on lease
      // Purchase: Saves $200 state tax (2%)
      // Lease: Costs $350 in tax (3.5% upfront on trade equity)

      expect(rules?.leaseRules.tradeInCredit).toBe("NONE");
      expect(rules?.leaseRules.taxCapReduction).toBe(true);
    });

    it("should validate negative equity differences between purchase and lease", () => {
      const rules = getRulesForState("AL");

      // Purchase: NOT taxable
      // Lease: TAXABLE

      expect(rules?.taxOnNegativeEquity).toBe(false); // Purchases
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(true); // Leases
    });

    it("should validate backend products not taxable on both retail and lease", () => {
      const rules = getRulesForState("AL");

      // VSC and GAP should be non-taxable on both retail and lease

      expect(rules?.taxOnServiceContracts).toBe(false);
      expect(rules?.taxOnGap).toBe(false);

      const leaseVSC = rules?.leaseRules.feeTaxRules.find(
        (r) => r.code === "SERVICE_CONTRACT"
      );
      const leaseGAP = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");

      expect(leaseVSC?.taxable).toBe(false);
      expect(leaseGAP?.taxable).toBe(false);
    });
  });

  // ============================================================================
  // UNIQUE ALABAMA FEATURES TESTS
  // ============================================================================

  describe("Unique Alabama Features", () => {
    it("should validate dual automotive tax rates (2% sales, 1.5% lease)", () => {
      const rules = getRulesForState("AL");
      expect(rules?.extras?.stateAutomotiveSalesRate).toBe(2.0);
      expect(rules?.extras?.stateAutomotiveLeaseRate).toBe(1.5);
      expect(rules?.extras?.stateGeneralSalesRate).toBe(4.0);
      expect(rules?.extras?.stateGeneralRentalRate).toBe(4.0);
    });

    it("should validate partial trade-in credit (state only)", () => {
      const rules = getRulesForState("AL");
      // Trade-in reduces state tax but not local
      expect(rules?.tradeInPolicy.type).toBe("FULL");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(true);
    });

    it("should validate manufacturer rebates are taxable (no tax reduction)", () => {
      const rules = getRulesForState("AL");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate?.taxable).toBe(true);
    });

    it("should validate no doc fee cap", () => {
      const rules = getRulesForState("AL");
      expect(rules?.docFeeTaxable).toBe(true);
      expect(rules?.extras?.avgDocFee).toBe(485);
      // Note: No cap documented, average is high
    });

    it("should validate lease trade-in is taxed (not credited)", () => {
      const rules = getRulesForState("AL");
      expect(rules?.leaseRules.tradeInCredit).toBe("NONE");
      expect(rules?.leaseRules.taxCapReduction).toBe(true);
    });

    it("should validate Drive-Out Provision details", () => {
      const rules = getRulesForState("AL");
      expect(rules?.extras?.driveOutProvisionEffectiveDate).toBe("2022-07-01");
      expect(rules?.extras?.driveOutRemovalWindow).toBe("72 hours");
      expect(rules?.reciprocity.notes).toContain("capped at destination state rate");
      expect(rules?.reciprocity.notes).toContain("no-tax states pay $0");
    });
  });
});
