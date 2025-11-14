import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Utah (UT) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load Utah rules successfully", () => {
    const rules = getRulesForState("UT");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("UT");
  });

  it("should mark Utah as implemented (not a stub)", () => {
    expect(isStateImplemented("UT")).toBe(true);
  });

  it("should have version number 2", () => {
    const rules = getRulesForState("UT");
    expect(rules?.version).toBe(2);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("UT");
    const rulesLower = getRulesForState("ut");
    const rulesMixed = getRulesForState("Ut");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("UT");
    expect(rulesLower?.stateCode).toBe("UT");
    expect(rulesMixed?.stateCode).toBe("UT");
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS
  // ============================================================================

  describe("Retail - Trade-In Policy", () => {
    it("should have FULL trade-in credit policy", () => {
      const rules = getRulesForState("UT");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });

    it("should apply full trade-in credit with no cap", () => {
      const rules = getRulesForState("UT");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
      // No cap property should exist for FULL type
      if (rules?.tradeInPolicy.type === "CAPPED") {
        expect(rules.tradeInPolicy.capAmount).toBeUndefined();
      }
    });

    it("should document vehicle-to-vehicle trade requirement", () => {
      const rules = getRulesForState("UT");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
      expect(rules?.extras?.tradeInRequirement).toContain("Vehicle-to-vehicle");
      expect(rules?.extras?.tradeInRequirement).toContain("same transaction");
    });
  });

  describe("Retail - Rebate Rules", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("UT");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as NON-TAXABLE (reduce tax base)", () => {
      const rules = getRulesForState("UT");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(false);
      expect(mfrRebate?.notes).toContain("EXCLUDED from taxable base");
    });

    it("should mark dealer rebates as NON-TAXABLE (reduce tax base)", () => {
      const rules = getRulesForState("UT");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(false);
      expect(dealerRebate?.notes).toContain("NOT included in taxable base");
    });

    it("should document rebate treatment in manufacturer notes", () => {
      const rules = getRulesForState("UT");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");

      expect(mfrRebate?.notes).toContain("retained by dealer as down payment");
      expect(mfrRebate?.notes).toBeTruthy();
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("UT");
      expect(rules?.docFeeTaxable).toBe(true);
    });

    it("should have doc fee taxability documented in fee tax rules", () => {
      const rules = getRulesForState("UT");
      const docFee = rules?.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
      expect(docFee?.notes).toContain("TAXABLE");
    });

    it("should document that Utah has NO CAP on doc fees", () => {
      const rules = getRulesForState("UT");
      expect(rules?.extras?.docFeeCap).toBeNull();
      expect(rules?.extras?.avgDocFee).toBe(305);
    });

    it("should document consumer protection requirements", () => {
      const rules = getRulesForState("UT");
      expect(rules?.extras?.consumerProtection).toContain("same doc fee");
      expect(rules?.extras?.consumerProtection).toContain("not state-mandated");
    });
  });

  describe("Retail - Fee Tax Rules", () => {
    it("should mark service contracts (VSC) as TAXABLE (unique to Utah)", () => {
      const rules = getRulesForState("UT");
      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(true);
      expect(vsc?.notes).toContain("ARE TAXABLE");
      expect(vsc?.notes).toContain("Ruling 97-004");
    });

    it("should mark GAP as NON-TAXABLE", () => {
      const rules = getRulesForState("UT");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(false);
      expect(gap?.notes).toContain("NOT taxable");
      expect(gap?.notes).toContain("Ruling 95-025");
    });

    it("should mark title fees as NON-TAXABLE", () => {
      const rules = getRulesForState("UT");
      const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-TAXABLE", () => {
      const rules = getRulesForState("UT");
      const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("UT");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should NOT tax negative equity", () => {
      const rules = getRulesForState("UT");
      expect(rules?.taxOnNegativeEquity).toBe(false);
    });

    it("should tax service contracts (unique to Utah)", () => {
      const rules = getRulesForState("UT");
      expect(rules?.taxOnServiceContracts).toBe(true);
    });

    it("should NOT tax GAP insurance", () => {
      const rules = getRulesForState("UT");
      expect(rules?.taxOnGap).toBe(false);
    });
  });

  describe("Retail - Vehicle Tax Scheme", () => {
    it("should use STATE_ONLY vehicle tax scheme (uniform statewide)", () => {
      const rules = getRulesForState("UT");
      expect(rules?.vehicleTaxScheme).toBe("STATE_ONLY");
    });

    it("should NOT apply local sales tax to vehicles", () => {
      const rules = getRulesForState("UT");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
    });

    it("should document uniform statewide rate of 6.85%", () => {
      const rules = getRulesForState("UT");
      expect(rules?.extras?.stateRate).toBe(6.85);
    });

    it("should document general sales rate of 4.85%", () => {
      const rules = getRulesForState("UT");
      expect(rules?.extras?.generalSalesRate).toBe(4.85);
    });

    it("should highlight uniform rate as unique feature", () => {
      const rules = getRulesForState("UT");
      expect(rules?.extras?.uniqueFeatures).toContain("Uniform 6.85% statewide rate (no local variations)");
      expect(rules?.extras?.uniqueFeatures).toContain("One of simplest state tax structures in nation");
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease - Tax Method", () => {
    it("should use HYBRID lease taxation method", () => {
      const rules = getRulesForState("UT");
      expect(rules?.leaseRules.method).toBe("HYBRID");
    });

    it("should TAX cap cost reduction (with trade-in exception)", () => {
      const rules = getRulesForState("UT");
      expect(rules?.leaseRules.taxCapReduction).toBe(true);
    });

    it("should tax fees upfront on leases", () => {
      const rules = getRulesForState("UT");
      expect(rules?.leaseRules.taxFeesUpfront).toBe(true);
    });

    it("should have no special lease scheme", () => {
      const rules = getRulesForState("UT");
      expect(rules?.leaseRules.specialScheme).toBe("NONE");
    });

    it("should document hybrid lease taxation model", () => {
      const rules = getRulesForState("UT");
      expect(rules?.leaseRules.notes).toContain("HYBRID");
      expect(rules?.leaseRules.notes).toContain("upfront + monthly");
      expect(rules?.leaseRules.notes).toContain("6.85%");
    });
  });

  describe("Lease - Cap Cost Reduction Taxation", () => {
    it("should tax cap cost reduction upfront (except trade-in)", () => {
      const rules = getRulesForState("UT");
      expect(rules?.leaseRules.taxCapReduction).toBe(true);
    });

    it("should document that cash down is taxed", () => {
      const rules = getRulesForState("UT");
      expect(rules?.leaseRules.notes).toContain("upfront");
    });

    it("should document that trade-in reduces payment and tax", () => {
      const rules = getRulesForState("UT");
      expect(rules?.leaseRules.notes).toContain("Trade-in equity ALLOWED");
      expect(rules?.leaseRules.notes).toContain("reduces payment");
    });
  });

  describe("Lease - Rebates and Incentives", () => {
    it("should FOLLOW_RETAIL_RULE for rebate behavior on leases", () => {
      const rules = getRulesForState("UT");
      expect(rules?.leaseRules.rebateBehavior).toBe("FOLLOW_RETAIL_RULE");
    });

    it("should document that manufacturer rebates reduce tax base on leases", () => {
      const rules = getRulesForState("UT");
      const retailMfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(retailMfrRebate?.taxable).toBe(false);
      expect(rules?.leaseRules.rebateBehavior).toBe("FOLLOW_RETAIL_RULE");
    });
  });

  describe("Lease - Documentation Fee", () => {
    it("should ALWAYS tax doc fee on leases", () => {
      const rules = getRulesForState("UT");
      expect(rules?.leaseRules.docFeeTaxability).toBe("ALWAYS");
    });

    it("should have doc fee as taxable in lease fee rules", () => {
      const rules = getRulesForState("UT");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
    });

    it("should have acquisition fee as taxable in lease fee rules", () => {
      const rules = getRulesForState("UT");
      const acqFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "ACQUISITION_FEE");
      expect(acqFee).toBeDefined();
      expect(acqFee?.taxable).toBe(true);
    });
  });

  describe("Lease - Trade-In Credit", () => {
    it("should provide FULL trade-in credit on leases", () => {
      const rules = getRulesForState("UT");
      expect(rules?.leaseRules.tradeInCredit).toBe("FULL");
    });

    it("should document that trade-in reduces periodic payments", () => {
      const rules = getRulesForState("UT");
      expect(rules?.leaseRules.notes).toContain("reduces payment");
    });
  });

  describe("Lease - Negative Equity", () => {
    it("should mark negative equity as taxable on leases", () => {
      const rules = getRulesForState("UT");
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(true);
    });
  });

  describe("Lease - Backend Product Taxability", () => {
    it("should mark service contracts as TAXABLE on leases", () => {
      const rules = getRulesForState("UT");
      const vsc = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(true);
      expect(vsc?.notes).toContain("TAXABLE");
    });

    it("should mark GAP as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("UT");
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(false);
    });

    it("should mark title fee as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("UT");
      const title = rules?.leaseRules.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fee as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("UT");
      const reg = rules?.leaseRules.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });
  });

  // ============================================================================
  // RECIPROCITY TESTS
  // ============================================================================

  describe("Reciprocity", () => {
    it("should have reciprocity enabled", () => {
      const rules = getRulesForState("UT");
      expect(rules?.reciprocity.enabled).toBe(true);
    });

    it("should apply reciprocity to BOTH retail and lease", () => {
      const rules = getRulesForState("UT");
      expect(rules?.reciprocity.scope).toBe("BOTH");
    });

    it("should use CREDIT_UP_TO_STATE_RATE mode", () => {
      const rules = getRulesForState("UT");
      expect(rules?.reciprocity.homeStateBehavior).toBe("CREDIT_UP_TO_STATE_RATE");
    });

    it("should require proof of tax paid", () => {
      const rules = getRulesForState("UT");
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(true);
    });

    it("should base credit on TAX_PAID", () => {
      const rules = getRulesForState("UT");
      expect(rules?.reciprocity.basis).toBe("TAX_PAID");
    });

    it("should cap credit at Utah's tax amount", () => {
      const rules = getRulesForState("UT");
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(true);
    });

    it("should not have lease exception for reciprocity", () => {
      const rules = getRulesForState("UT");
      expect(rules?.reciprocity.hasLeaseException).toBe(false);
    });

    it("should document residency requirement", () => {
      const rules = getRulesForState("UT");
      expect(rules?.reciprocity.notes).toContain("6+ months domicile");
    });

    it("should document registration reciprocity with ID/WY is separate", () => {
      const rules = getRulesForState("UT");
      expect(rules?.reciprocity.notes).toContain("ID/WY");
      expect(rules?.reciprocity.notes).toContain("doesn't waive taxes");
    });
  });

  // ============================================================================
  // UNIQUE UTAH FEATURES
  // ============================================================================

  describe("Unique Utah Features", () => {
    it("should document uniform statewide rate as key feature", () => {
      const rules = getRulesForState("UT");
      expect(rules?.extras?.uniqueFeatures).toContain("Uniform 6.85% statewide rate (no local variations)");
    });

    it("should document VSC taxability as unique feature", () => {
      const rules = getRulesForState("UT");
      expect(rules?.extras?.uniqueFeatures).toContain("VSC/service contracts ARE TAXABLE (unique feature)");
    });

    it("should document manufacturer rebates as non-taxable", () => {
      const rules = getRulesForState("UT");
      expect(rules?.extras?.uniqueFeatures).toContain("Manufacturer rebates NON-TAXABLE (reduce tax base)");
    });

    it("should document GAP insurance as non-taxable", () => {
      const rules = getRulesForState("UT");
      expect(rules?.extras?.uniqueFeatures).toContain("GAP insurance NOT taxable");
    });

    it("should document trade-in credit on leases", () => {
      const rules = getRulesForState("UT");
      expect(rules?.extras?.uniqueFeatures).toContain("Trade-in allowed on leases (reduces payment/tax)");
    });

    it("should document Uniform Age-Based Fee", () => {
      const rules = getRulesForState("UT");
      expect(rules?.extras?.uniqueFeatures).toContain("Uniform Age-Based Fee (annual property tax on vehicles)");
      expect(rules?.extras?.uniformAgeBasedFee).toContain("annual");
      expect(rules?.extras?.uniformAgeBasedFee).toContain("SEPARATE from one-time sales tax");
    });

    it("should document simplicity of tax structure", () => {
      const rules = getRulesForState("UT");
      expect(rules?.extras?.uniqueFeatures).toContain("One of simplest state tax structures in nation");
      expect(rules?.extras?.notes).toContain("Simple, consistent, easy to calculate");
    });
  });

  // ============================================================================
  // EDGE CASE TESTS
  // ============================================================================

  describe("Edge Cases", () => {
    it("should document vehicle-to-vehicle trade requirement", () => {
      const rules = getRulesForState("UT");
      expect(rules?.extras?.tradeInRequirement).toContain("Vehicle-to-vehicle trades only");
      expect(rules?.extras?.tradeInRequirement).toContain("same transaction");
      expect(rules?.extras?.tradeInRequirement).toContain("documented together");
    });

    it("should document that non-vehicle trades are taxable", () => {
      const rules = getRulesForState("UT");
      expect(rules?.extras?.tradeInRequirement).toContain("non-vehicle) are subject to tax");
    });

    it("should have all required extras metadata", () => {
      const rules = getRulesForState("UT");
      expect(rules?.extras?.lastUpdated).toBe("2025-11-14");
      expect(rules?.extras?.stateRate).toBe(6.85);
      expect(rules?.extras?.generalSalesRate).toBe(4.85);
      expect(rules?.extras?.avgDocFee).toBe(305);
      expect(rules?.extras?.docFeeCap).toBeNull();
    });

    it("should have comprehensive source documentation", () => {
      const rules = getRulesForState("UT");
      expect(rules?.extras?.sources).toContain("Utah State Tax Commission (tax.utah.gov)");
      expect(rules?.extras?.sources).toContain("Utah Code Title 59, Chapter 12 (Sales and Use Tax Act)");
      expect(rules?.extras?.sources).toContain(
        "Utah Tax Commission Publication 5 (Sales Tax Info for Vehicle Dealers)"
      );
      expect(rules?.extras?.sources).toContain("Utah Tax Commission Ruling 95-025 (GAP coverage exemption)");
      expect(rules?.extras?.sources).toContain("Utah Tax Commission Ruling 97-004 (Service contract taxability)");
    });
  });

  // ============================================================================
  // TAX CALCULATION SCENARIO TESTS
  // ============================================================================

  describe("Tax Calculation Scenarios", () => {
    it("should correctly structure basic retail purchase", () => {
      const rules = getRulesForState("UT");

      // Scenario: $30,000 vehicle + $305 doc - $10,000 trade
      // Expected taxable: $20,305
      // Expected tax: $20,305 × 6.85% = $1,390.89

      expect(rules?.vehicleTaxScheme).toBe("STATE_ONLY");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
      expect(rules?.docFeeTaxable).toBe(true);
      expect(rules?.extras?.stateRate).toBe(6.85);
    });

    it("should correctly structure purchase with manufacturer rebate", () => {
      const rules = getRulesForState("UT");

      // Scenario: $35,000 vehicle + $305 doc - $5,000 rebate - $8,000 trade
      // Expected taxable: $22,305
      // Expected tax: $22,305 × 6.85% = $1,527.89

      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate?.taxable).toBe(false); // Rebate reduces base
      expect(rules?.tradeInPolicy.type).toBe("FULL");
      expect(rules?.docFeeTaxable).toBe(true);
    });

    it("should correctly structure purchase with VSC and GAP", () => {
      const rules = getRulesForState("UT");

      // Scenario: $28,000 vehicle + $305 doc + $2,500 VSC - $7,000 trade
      // VSC is taxable, GAP is not
      // Expected taxable: $23,805 (includes VSC)
      // GAP $895 added after tax

      expect(rules?.taxOnServiceContracts).toBe(true);
      expect(rules?.taxOnGap).toBe(false);

      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");

      expect(vsc?.taxable).toBe(true);
      expect(gap?.taxable).toBe(false);
    });

    it("should correctly structure lease with hybrid taxation", () => {
      const rules = getRulesForState("UT");

      // Scenario: $3,000 down + $395 doc + $450 first payment
      // Upfront tax: $3,845 × 6.85% = $263.38
      // Monthly: $450 × 6.85% = $30.83/month

      expect(rules?.leaseRules.method).toBe("HYBRID");
      expect(rules?.leaseRules.taxCapReduction).toBe(true);
      expect(rules?.leaseRules.docFeeTaxability).toBe("ALWAYS");
      expect(rules?.extras?.stateRate).toBe(6.85);
    });

    it("should correctly structure lease with trade-in", () => {
      const rules = getRulesForState("UT");

      // Trade-in equity reduces payment, not taxed directly
      // Tax calculated on reduced payment amount

      expect(rules?.leaseRules.tradeInCredit).toBe("FULL");
      expect(rules?.leaseRules.notes).toContain("reduces payment");
    });
  });

  // ============================================================================
  // DOCUMENTATION QUALITY TESTS
  // ============================================================================

  describe("Documentation Quality", () => {
    it("should have detailed notes in extras", () => {
      const rules = getRulesForState("UT");
      expect(rules?.extras?.notes).toBeTruthy();
      expect(rules?.extras?.notes?.length).toBeGreaterThan(100);
    });

    it("should have comprehensive lease rules notes", () => {
      const rules = getRulesForState("UT");
      expect(rules?.leaseRules.notes).toBeTruthy();
      expect(rules?.leaseRules.notes?.length).toBeGreaterThan(100);
    });

    it("should have reciprocity notes", () => {
      const rules = getRulesForState("UT");
      expect(rules?.reciprocity.notes).toBeTruthy();
      expect(rules?.reciprocity.notes?.length).toBeGreaterThan(50);
    });

    it("should document all fee tax rules with notes", () => {
      const rules = getRulesForState("UT");
      rules?.feeTaxRules.forEach((rule) => {
        expect(rule.notes).toBeTruthy();
        expect(rule.notes?.length).toBeGreaterThan(10);
      });
    });

    it("should document all lease fee tax rules with notes", () => {
      const rules = getRulesForState("UT");
      rules?.leaseRules.feeTaxRules.forEach((rule) => {
        expect(rule.notes).toBeTruthy();
        expect(rule.notes?.length).toBeGreaterThan(10);
      });
    });

    it("should document all rebate rules with notes", () => {
      const rules = getRulesForState("UT");
      rules?.rebates.forEach((rebate) => {
        expect(rebate.notes).toBeTruthy();
        expect(rebate.notes?.length).toBeGreaterThan(20);
      });
    });
  });
});
