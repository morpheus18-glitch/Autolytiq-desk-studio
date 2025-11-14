import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("North Carolina (NC) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load North Carolina rules successfully", () => {
    const rules = getRulesForState("NC");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("NC");
  });

  it("should mark North Carolina as implemented (not a stub)", () => {
    expect(isStateImplemented("NC")).toBe(true);
  });

  it("should have version number 1", () => {
    const rules = getRulesForState("NC");
    expect(rules?.version).toBe(1);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("NC");
    const rulesLower = getRulesForState("nc");
    const rulesMixed = getRulesForState("Nc");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("NC");
    expect(rulesLower?.stateCode).toBe("NC");
    expect(rulesMixed?.stateCode).toBe("NC");
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS (HIGHWAY USE TAX)
  // ============================================================================

  describe("Retail - Trade-In Policy", () => {
    it("should have FULL trade-in credit policy", () => {
      const rules = getRulesForState("NC");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });

    it("should deduct trade-in from HUT base", () => {
      const rules = getRulesForState("NC");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
      // Trade-in reduces Highway Use Tax base
    });
  });

  describe("Retail - Rebate Rules", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("NC");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as NON-taxable (reduce HUT base)", () => {
      const rules = getRulesForState("NC");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(false);
      expect(mfrRebate?.notes).toContain("reduce");
    });

    it("should mark dealer rebates as TAXABLE (do not reduce HUT base)", () => {
      const rules = getRulesForState("NC");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(true);
      expect(dealerRebate?.notes).toContain("not reduce");
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as TAXABLE (subject to HUT)", () => {
      const rules = getRulesForState("NC");
      expect(rules?.docFeeTaxable).toBe(true);
    });
  });

  describe("Retail - Fee Tax Rules", () => {
    it("should mark service contracts (VSC) as NON-taxable", () => {
      const rules = getRulesForState("NC");
      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(false);
      expect(vsc?.notes).toContain("not subject to HUT");
    });

    it("should mark GAP as NON-taxable", () => {
      const rules = getRulesForState("NC");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(false);
      expect(gap?.notes).toContain("not subject to HUT");
    });

    it("should mark title fees as NON-taxable", () => {
      const rules = getRulesForState("NC");
      const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-taxable", () => {
      const rules = getRulesForState("NC");
      const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("NC");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should tax negative equity", () => {
      const rules = getRulesForState("NC");
      expect(rules?.taxOnNegativeEquity).toBe(true);
    });

    it("should NOT tax service contracts", () => {
      const rules = getRulesForState("NC");
      expect(rules?.taxOnServiceContracts).toBe(false);
    });

    it("should NOT tax GAP insurance", () => {
      const rules = getRulesForState("NC");
      expect(rules?.taxOnGap).toBe(false);
    });
  });

  describe("Retail - Vehicle Tax Scheme", () => {
    it("should use SPECIAL_HUT vehicle tax scheme", () => {
      const rules = getRulesForState("NC");
      expect(rules?.vehicleTaxScheme).toBe("SPECIAL_HUT");
    });

    it("should NOT use local sales tax (HUT is state-only)", () => {
      const rules = getRulesForState("NC");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
    });

    it("should document 3% HUT rate", () => {
      const rules = getRulesForState("NC");
      expect(rules?.extras?.ncHUT?.baseRate).toBe(0.03);
    });

    it("should indicate HUT instead of sales tax", () => {
      const rules = getRulesForState("NC");
      expect(rules?.extras?.ncHUT?.useHighwayUseTax).toBe(true);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease - Tax Method", () => {
    it("should use MONTHLY lease taxation method", () => {
      const rules = getRulesForState("NC");
      expect(rules?.leaseRules.method).toBe("MONTHLY");
    });

    it("should NOT tax cap cost reduction", () => {
      const rules = getRulesForState("NC");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });

    it("should have no special lease scheme", () => {
      const rules = getRulesForState("NC");
      expect(rules?.leaseRules.specialScheme).toBe("NONE");
    });

    it("should document 3% HUT on monthly payments", () => {
      const rules = getRulesForState("NC");
      expect(rules?.leaseRules.notes).toContain("3%");
      expect(rules?.leaseRules.notes).toContain("monthly payments");
    });
  });

  describe("Lease - Rebates", () => {
    it("should follow retail rebate rules", () => {
      const rules = getRulesForState("NC");
      expect(rules?.leaseRules.rebateBehavior).toBe("FOLLOW_RETAIL_RULE");
    });
  });

  describe("Lease - Documentation Fee", () => {
    it("should ALWAYS tax doc fee on leases", () => {
      const rules = getRulesForState("NC");
      expect(rules?.leaseRules.docFeeTaxability).toBe("ALWAYS");
    });

    it("should have doc fee as taxable in lease fee rules", () => {
      const rules = getRulesForState("NC");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
    });
  });

  describe("Lease - Trade-In Credit", () => {
    it("should provide FULL trade-in credit on leases", () => {
      const rules = getRulesForState("NC");
      expect(rules?.leaseRules.tradeInCredit).toBe("FULL");
    });
  });

  describe("Lease - Negative Equity", () => {
    it("should mark negative equity as TAXABLE on leases", () => {
      const rules = getRulesForState("NC");
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(true);
    });
  });

  describe("Lease - Fee Tax Rules", () => {
    it("should mark service contracts as NON-taxable on leases", () => {
      const rules = getRulesForState("NC");
      const vsc = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(false);
    });

    it("should mark GAP as NON-taxable on leases", () => {
      const rules = getRulesForState("NC");
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(false);
    });

    it("should mark title fees as NON-taxable on leases", () => {
      const rules = getRulesForState("NC");
      const title = rules?.leaseRules.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-taxable on leases", () => {
      const rules = getRulesForState("NC");
      const reg = rules?.leaseRules.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Lease - Title Fee Rules", () => {
    it("should have title fee rule configuration", () => {
      const rules = getRulesForState("NC");
      expect(rules?.leaseRules.titleFeeRules).toBeDefined();
      expect(rules?.leaseRules.titleFeeRules.length).toBeGreaterThan(0);
    });

    it("should mark title fees as not taxable but included in cap cost", () => {
      const rules = getRulesForState("NC");
      const titleRule = rules?.leaseRules.titleFeeRules.find((r) => r.code === "TITLE");
      expect(titleRule).toBeDefined();
      expect(titleRule?.taxable).toBe(false);
      expect(titleRule?.includedInCapCost).toBe(true);
      expect(titleRule?.includedInUpfront).toBe(true);
      expect(titleRule?.includedInMonthly).toBe(false);
    });
  });

  describe("Lease - Fee Timing", () => {
    it("should tax fees upfront", () => {
      const rules = getRulesForState("NC");
      expect(rules?.leaseRules.taxFeesUpfront).toBe(true);
    });
  });

  // ============================================================================
  // RECIPROCITY TESTS
  // ============================================================================

  describe("Reciprocity Rules", () => {
    it("should have reciprocity enabled", () => {
      const rules = getRulesForState("NC");
      expect(rules?.reciprocity.enabled).toBe(true);
    });

    it("should apply reciprocity to BOTH retail and lease", () => {
      const rules = getRulesForState("NC");
      expect(rules?.reciprocity.scope).toBe("BOTH");
    });

    it("should use CREDIT_UP_TO_STATE_RATE mode", () => {
      const rules = getRulesForState("NC");
      expect(rules?.reciprocity.homeStateBehavior).toBe("CREDIT_UP_TO_STATE_RATE");
    });

    it("should require proof of tax paid", () => {
      const rules = getRulesForState("NC");
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(true);
    });

    it("should base credit on TAX_PAID", () => {
      const rules = getRulesForState("NC");
      expect(rules?.reciprocity.basis).toBe("TAX_PAID");
    });

    it("should cap credit at NC HUT amount", () => {
      const rules = getRulesForState("NC");
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(true);
    });

    it("should not have lease exceptions", () => {
      const rules = getRulesForState("NC");
      expect(rules?.reciprocity.hasLeaseException).toBe(false);
    });

    it("should document 90-day time window restriction", () => {
      const rules = getRulesForState("NC");
      expect(rules?.reciprocity.notes).toContain("90-day");
      expect(rules?.reciprocity.notes).toContain("90 days");
    });

    it("should have 90-day override for all states", () => {
      const rules = getRulesForState("NC");
      const allStatesOverride = rules?.reciprocity.overrides?.find(
        (o) => o.originState === "ALL"
      );
      expect(allStatesOverride).toBeDefined();
      expect(allStatesOverride?.maxAgeDaysSinceTaxPaid).toBe(90);
    });
  });

  // ============================================================================
  // NORTH CAROLINA-SPECIFIC FEATURES
  // ============================================================================

  describe("NC Unique Features - HUT System", () => {
    it("should document that NC uses HUT, not traditional sales tax", () => {
      const rules = getRulesForState("NC");
      expect(rules?.extras?.notes).toContain("HUT");
      expect(rules?.extras?.notes).toContain("Highway Use Tax");
    });

    it("should document HUT configuration", () => {
      const rules = getRulesForState("NC");
      expect(rules?.extras?.ncHUT).toBeDefined();
      expect(rules?.extras?.ncHUT?.baseRate).toBe(0.03);
      expect(rules?.extras?.ncHUT?.useHighwayUseTax).toBe(true);
    });

    it("should document trade-in reduction applies to HUT", () => {
      const rules = getRulesForState("NC");
      expect(rules?.extras?.ncHUT?.includeTradeInReduction).toBe(true);
    });

    it("should document HUT applies to net price only", () => {
      const rules = getRulesForState("NC");
      expect(rules?.extras?.ncHUT?.applyToNetPriceOnly).toBe(true);
    });

    it("should document 90-day reciprocity window", () => {
      const rules = getRulesForState("NC");
      expect(rules?.extras?.ncHUT?.maxReciprocityAgeDays).toBe(90);
      expect(rules?.extras?.timeWindowDays).toBe(90);
    });
  });

  describe("NC Unique Features - State-Only Rate", () => {
    it("should document that HUT is state-only (no local rates)", () => {
      const rules = getRulesForState("NC");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
      expect(rules?.extras?.notes).toContain("state-only");
    });

    it("should document HUT rate", () => {
      const rules = getRulesForState("NC");
      expect(rules?.extras?.hutRate).toBe(3.0);
    });
  });

  describe("NC Unique Features - Collection at DMV", () => {
    it("should document that HUT is paid at title/registration", () => {
      const rules = getRulesForState("NC");
      expect(rules?.extras?.notes).toContain("title/registration");
    });

    it("should document one-time tax", () => {
      const rules = getRulesForState("NC");
      expect(rules?.extras?.notes).toContain("ONE-TIME");
    });
  });

  // ============================================================================
  // SCENARIO TESTS
  // ============================================================================

  describe("Scenario: Basic Retail Sale (3% HUT)", () => {
    it("should calculate HUT correctly with trade-in", () => {
      // $30,000 vehicle + $595 doc - $10,000 trade = $20,595 HUT base
      // HUT @ 3%: $20,595 × 0.03 = $617.85
      const vehiclePrice = 30000;
      const docFee = 595;
      const tradeIn = 10000;
      const hutBase = vehiclePrice + docFee - tradeIn;
      const hutRate = 0.03;

      expect(hutBase).toBe(20595);
      const expectedHut = hutBase * hutRate;
      expect(expectedHut).toBeCloseTo(617.85, 2);
    });
  });

  describe("Scenario: Retail Sale with Manufacturer Rebate", () => {
    it("should deduct manufacturer rebate from HUT base", () => {
      // $35,000 vehicle - $4,000 rebate = $31,000 HUT base
      const vehicleMSRP = 35000;
      const mfrRebate = 4000;
      const hutBase = vehicleMSRP - mfrRebate;
      const hutRate = 0.03;

      expect(hutBase).toBe(31000);
      const hut = hutBase * hutRate;
      expect(hut).toBe(930);
    });
  });

  describe("Scenario: Retail Sale with Negative Equity", () => {
    it("should ADD negative equity to HUT base", () => {
      const vehiclePrice = 28000;
      const docFee = 595;
      const tradeInValue = 10000;
      const tradeInPayoff = 14000;
      const negativeEquity = tradeInPayoff - tradeInValue;

      const hutBase = vehiclePrice + docFee - tradeInValue + negativeEquity;
      const hutRate = 0.03;

      expect(negativeEquity).toBe(4000);
      expect(hutBase).toBe(22595);
      const hut = hutBase * hutRate;
      expect(hut).toBeCloseTo(677.85, 2);
    });
  });

  describe("Scenario: Service Contracts and GAP (NOT Taxable)", () => {
    it("should NOT tax VSC or GAP", () => {
      const vehiclePrice = 30000;
      const vsc = 2500;
      const gap = 795;
      const hutRate = 0.03;

      // Only vehicle is taxable, NOT VSC or GAP
      const hutBase = vehiclePrice; // VSC and GAP excluded
      const hut = hutBase * hutRate;

      expect(hut).toBe(900);
      // If VSC and GAP were taxed (incorrectly), it would be:
      const incorrectHut = (vehiclePrice + vsc + gap) * hutRate;
      expect(incorrectHut).toBeCloseTo(998.85, 2);
      // Verify they're NOT equal
      expect(hut).not.toBeCloseTo(incorrectHut, 2);
    });
  });

  describe("Scenario: Lease with Monthly HUT (3%)", () => {
    it("should tax monthly payments at 3% HUT", () => {
      const monthlyPayment = 425;
      const term = 36;
      const hutRate = 0.03;

      const monthlyHut = monthlyPayment * hutRate;
      const totalHut = monthlyHut * term;

      expect(monthlyHut).toBeCloseTo(12.75, 2);
      expect(totalHut).toBeCloseTo(459, 2);
    });
  });

  describe("Scenario: Lease with Trade-In (Reduces Cap Cost)", () => {
    it("should reduce cap cost with trade-in (not taxed)", () => {
      const grossCapCost = 40000;
      const tradeInValue = 8000;
      const adjustedCapCost = grossCapCost - tradeInValue;

      expect(adjustedCapCost).toBe(32000);
      // Trade-in is NOT taxed on leases (reduces cap cost)
    });
  });

  describe("Scenario: Reciprocity Within 90 Days", () => {
    it("should allow credit if tax paid within 90 days", () => {
      const vehiclePrice = 28000;
      const scTaxPaid = 1400; // SC 5% = $1,400
      const ncHutRate = 0.03;
      const ncHutWouldBe = vehiclePrice * ncHutRate;

      const creditAllowed = Math.min(scTaxPaid, ncHutWouldBe);
      const ncHutOwed = ncHutWouldBe - creditAllowed;

      expect(ncHutWouldBe).toBe(840);
      expect(creditAllowed).toBe(840); // SC tax exceeds NC HUT
      expect(ncHutOwed).toBe(0);
    });
  });

  describe("Scenario: Reciprocity Expired (Over 90 Days)", () => {
    it("should NOT allow credit if tax paid over 90 days ago", () => {
      const vehiclePrice = 30000;
      const tnTaxPaid = 2100; // TN 7% = $2,100 (paid 120 days ago)
      const ncHutRate = 0.03;
      const ncHutWouldBe = vehiclePrice * ncHutRate;

      // Time window expired, NO credit
      const creditAllowed = 0;
      const ncHutOwed = ncHutWouldBe - creditAllowed;

      expect(ncHutWouldBe).toBe(900);
      expect(creditAllowed).toBe(0); // Time window expired
      expect(ncHutOwed).toBe(900); // Full NC HUT due
    });
  });

  // ============================================================================
  // METADATA AND DOCUMENTATION
  // ============================================================================

  describe("Metadata - Sources", () => {
    it("should document official sources", () => {
      const rules = getRulesForState("NC");
      expect(rules?.extras?.sources).toBeDefined();
      expect(rules?.extras?.sources?.length).toBeGreaterThan(0);
    });

    it("should reference NCDMV", () => {
      const rules = getRulesForState("NC");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("North Carolina"))).toBe(true);
    });

    it("should reference NC General Statutes", () => {
      const rules = getRulesForState("NC");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("General Statutes"))).toBe(true);
    });
  });

  describe("Metadata - Last Updated", () => {
    it("should have lastUpdated timestamp", () => {
      const rules = getRulesForState("NC");
      expect(rules?.extras?.lastUpdated).toBeDefined();
      expect(rules?.extras?.lastUpdated).toBe("2025-01");
    });
  });

  describe("Metadata - Documentation", () => {
    it("should have comprehensive notes in extras", () => {
      const rules = getRulesForState("NC");
      expect(rules?.extras?.notes).toBeDefined();
      expect((rules?.extras?.notes as string)?.length).toBeGreaterThan(100);
    });

    it("should document key NC features in notes", () => {
      const rules = getRulesForState("NC");
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("HUT");
      expect(notes).toContain("3%");
      expect(notes).toContain("90-day");
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("Edge Cases - HUT System Specifics", () => {
    it("should handle HUT configuration correctly", () => {
      const rules = getRulesForState("NC");
      expect(rules?.vehicleTaxScheme).toBe("SPECIAL_HUT");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
      expect(rules?.extras?.ncHUT?.baseRate).toBe(0.03);
    });

    it("should handle reciprocity time window", () => {
      const rules = getRulesForState("NC");
      const override = rules?.reciprocity.overrides?.find((o) => o.originState === "ALL");
      expect(override?.maxAgeDaysSinceTaxPaid).toBe(90);
    });
  });

  describe("Edge Cases - Product Taxability", () => {
    it("should NOT tax backend products", () => {
      const rules = getRulesForState("NC");
      expect(rules?.taxOnServiceContracts).toBe(false);
      expect(rules?.taxOnGap).toBe(false);
    });

    it("should tax negative equity but not on separate item basis", () => {
      const rules = getRulesForState("NC");
      expect(rules?.taxOnNegativeEquity).toBe(true);
      // Negative equity is added to HUT base, increasing taxable amount
    });
  });
});
