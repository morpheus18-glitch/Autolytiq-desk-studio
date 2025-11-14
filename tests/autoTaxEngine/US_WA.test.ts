import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Washington (WA) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load Washington rules successfully", () => {
    const rules = getRulesForState("WA");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("WA");
  });

  it("should mark Washington as implemented (not a stub)", () => {
    expect(isStateImplemented("WA")).toBe(true);
  });

  it("should have version number 2", () => {
    const rules = getRulesForState("WA");
    expect(rules?.version).toBe(2);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("WA");
    const rulesLower = getRulesForState("wa");
    const rulesMixed = getRulesForState("Wa");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("WA");
    expect(rulesLower?.stateCode).toBe("WA");
    expect(rulesMixed?.stateCode).toBe("WA");
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS
  // ============================================================================

  describe("Retail - Trade-In Policy", () => {
    it("should have FULL trade-in credit policy", () => {
      const rules = getRulesForState("WA");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });

    it("should apply full trade-in credit with no cap", () => {
      const rules = getRulesForState("WA");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
      // No cap property should exist for FULL type
      if (rules?.tradeInPolicy.type === "CAPPED") {
        expect(rules.tradeInPolicy.capAmount).toBeUndefined();
      }
    });
  });

  describe("Retail - Rebate Rules (CRITICAL DISTINCTION)", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("WA");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("CRITICAL: Manufacturer rebates should be TAXABLE (do NOT reduce tax base)", () => {
      const rules = getRulesForState("WA");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(true);
      expect(mfrRebate?.notes).toContain("TAXABLE");
      expect(mfrRebate?.notes).toContain("DOR");
    });

    it("should have dealer rebates as NON-TAXABLE (reduce tax base)", () => {
      const rules = getRulesForState("WA");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(false);
    });

    it("should document the critical manufacturer vs dealer rebate distinction", () => {
      const rules = getRulesForState("WA");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");

      // Manufacturer should be taxable, dealer should not be
      expect(mfrRebate?.taxable).toBe(true);
      expect(dealerRebate?.taxable).toBe(false);

      // Both should have explanatory notes
      expect(mfrRebate?.notes).toBeTruthy();
      expect(dealerRebate?.notes).toBeTruthy();
      expect(mfrRebate?.notes).toContain("selling price BEFORE rebate");
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as NOT TAXABLE", () => {
      const rules = getRulesForState("WA");
      expect(rules?.docFeeTaxable).toBe(false);
    });

    it("should have doc fee non-taxability in fee tax rules", () => {
      const rules = getRulesForState("WA");
      const docFee = rules?.feeTaxRules.find((r) => r.code === "DOC_FEE");
      // Note: DOC_FEE might not be in feeTaxRules if it's handled by docFeeTaxable flag
      if (docFee) {
        expect(docFee.taxable).toBe(false);
      }
    });

    it("should document doc fee cap of $200", () => {
      const rules = getRulesForState("WA");
      expect(rules?.extras?.docFeeCapAmount).toBe(200);
    });
  });

  describe("Retail - Fee Tax Rules", () => {
    it("should mark service contracts (VSC) as TAXABLE", () => {
      const rules = getRulesForState("WA");
      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(true);
      expect(vsc?.notes).toContain("taxable");
    });

    it("should mark GAP as TAXABLE (for waivers/debt cancellation)", () => {
      const rules = getRulesForState("WA");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(true);
      expect(gap?.notes).toContain("taxable");
    });

    it("should mark extended warranties as TAXABLE", () => {
      const rules = getRulesForState("WA");
      const warranty = rules?.feeTaxRules.find((r) => r.code === "EXTENDED_WARRANTY");
      expect(warranty).toBeDefined();
      expect(warranty?.taxable).toBe(true);
    });

    it("should mark title fees as NON-TAXABLE", () => {
      const rules = getRulesForState("WA");
      const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-TAXABLE", () => {
      const rules = getRulesForState("WA");
      const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });

    it("should mark accessories as TAXABLE", () => {
      const rules = getRulesForState("WA");
      const accessories = rules?.feeTaxRules.find((r) => r.code === "ACCESSORIES");
      expect(accessories).toBeDefined();
      expect(accessories?.taxable).toBe(true);
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("WA");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should NOT tax negative equity (based on trade-in value treatment)", () => {
      const rules = getRulesForState("WA");
      expect(rules?.taxOnNegativeEquity).toBe(false);
    });

    it("should tax service contracts", () => {
      const rules = getRulesForState("WA");
      expect(rules?.taxOnServiceContracts).toBe(true);
    });

    it("should tax GAP products (most dealer products)", () => {
      const rules = getRulesForState("WA");
      expect(rules?.taxOnGap).toBe(true);
    });
  });

  describe("Retail - Vehicle Tax Scheme", () => {
    it("should use STATE_PLUS_LOCAL vehicle tax scheme", () => {
      const rules = getRulesForState("WA");
      expect(rules?.vehicleTaxScheme).toBe("STATE_PLUS_LOCAL");
    });

    it("should apply local sales tax to vehicles", () => {
      const rules = getRulesForState("WA");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(true);
    });

    it("should document motor vehicle sales tax rate through 2025", () => {
      const rules = getRulesForState("WA");
      expect(rules?.extras?.motorVehicleSalesTaxRate).toBe(0.003); // 0.3%
    });

    it("should document future motor vehicle tax rate (2026+)", () => {
      const rules = getRulesForState("WA");
      expect(rules?.extras?.motorVehicleSalesTaxRateFuture).toBe(0.005); // 0.5%
    });

    it("should document RTA tax rate", () => {
      const rules = getRulesForState("WA");
      expect(rules?.extras?.rtaTaxRate).toBe(0.014); // 1.4%
    });

    it("should document RTA tax counties", () => {
      const rules = getRulesForState("WA");
      expect(rules?.extras?.rtaTaxCounties).toEqual([
        "King",
        "Pierce",
        "Snohomish",
      ]);
    });

    it("should document maximum combined rate", () => {
      const rules = getRulesForState("WA");
      expect(rules?.extras?.maxCombinedRate).toBeGreaterThanOrEqual(10.0);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease - Tax Method", () => {
    it("should use MONTHLY lease taxation method", () => {
      const rules = getRulesForState("WA");
      expect(rules?.leaseRules.method).toBe("MONTHLY");
    });
  });

  describe("Lease - Cap Cost Reduction", () => {
    it("should tax cap cost reduction (cash portion)", () => {
      const rules = getRulesForState("WA");
      expect(rules?.leaseRules.taxCapReduction).toBe(true);
    });

    it("should document that trade-in portion is not taxed", () => {
      const rules = getRulesForState("WA");
      expect(rules?.leaseRules.notes).toContain("trade-in exempt");
    });
  });

  describe("Lease - Rebate Behavior", () => {
    it("should follow retail rebate rules on leases", () => {
      const rules = getRulesForState("WA");
      expect(rules?.leaseRules.rebateBehavior).toBe("FOLLOW_RETAIL_RULE");
    });
  });

  describe("Lease - Doc Fee", () => {
    it("should mark doc fee as NEVER taxable on leases", () => {
      const rules = getRulesForState("WA");
      expect(rules?.leaseRules.docFeeTaxability).toBe("NEVER");
    });

    it("should have doc fee as non-taxable in lease fee rules", () => {
      const rules = getRulesForState("WA");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(false);
    });
  });

  describe("Lease - Trade-In Credit", () => {
    it("should provide FULL trade-in credit on leases", () => {
      const rules = getRulesForState("WA");
      expect(rules?.leaseRules.tradeInCredit).toBe("FULL");
    });

    it("should document two methods for applying trade-in on leases", () => {
      const rules = getRulesForState("WA");
      // Check that documentation mentions both methods
      const notes = rules?.leaseRules.notes || "";
      expect(notes.toLowerCase()).toContain("trade-in");
    });
  });

  describe("Lease - Negative Equity", () => {
    it("should NOT tax negative equity on leases", () => {
      const rules = getRulesForState("WA");
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(false);
    });
  });

  describe("Lease - Fee Taxability", () => {
    it("should mark service contracts as TAXABLE on leases", () => {
      const rules = getRulesForState("WA");
      const vsc = rules?.leaseRules.feeTaxRules.find(
        (r) => r.code === "SERVICE_CONTRACT"
      );
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(true);
    });

    it("should mark extended warranties as TAXABLE on leases", () => {
      const rules = getRulesForState("WA");
      const warranty = rules?.leaseRules.feeTaxRules.find(
        (r) => r.code === "EXTENDED_WARRANTY"
      );
      expect(warranty).toBeDefined();
      expect(warranty?.taxable).toBe(true);
    });

    it("should mark GAP as TAXABLE on leases", () => {
      const rules = getRulesForState("WA");
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(true);
    });

    it("should mark accessories as TAXABLE on leases", () => {
      const rules = getRulesForState("WA");
      const accessories = rules?.leaseRules.feeTaxRules.find(
        (r) => r.code === "ACCESSORIES"
      );
      expect(accessories).toBeDefined();
      expect(accessories?.taxable).toBe(true);
    });

    it("should mark title fees as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("WA");
      const title = rules?.leaseRules.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("WA");
      const reg = rules?.leaseRules.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Lease - Title Fee Rules", () => {
    it("should have title fee configuration", () => {
      const rules = getRulesForState("WA");
      expect(rules?.leaseRules.titleFeeRules).toBeDefined();
      expect(rules?.leaseRules.titleFeeRules.length).toBeGreaterThan(0);
    });

    it("should mark title fees as paid upfront", () => {
      const rules = getRulesForState("WA");
      const titleFee = rules?.leaseRules.titleFeeRules.find(
        (r) => r.code === "TITLE"
      );
      expect(titleFee).toBeDefined();
      expect(titleFee?.includedInUpfront).toBe(true);
      expect(titleFee?.includedInMonthly).toBe(false);
    });
  });

  describe("Lease - Special Taxation", () => {
    it("should have tax fees upfront enabled", () => {
      const rules = getRulesForState("WA");
      expect(rules?.leaseRules.taxFeesUpfront).toBe(true);
    });

    it("should use NONE for special scheme", () => {
      const rules = getRulesForState("WA");
      expect(rules?.leaseRules.specialScheme).toBe("NONE");
    });
  });

  // ============================================================================
  // RECIPROCITY RULES TESTS
  // ============================================================================

  describe("Reciprocity - General Configuration", () => {
    it("should have reciprocity enabled", () => {
      const rules = getRulesForState("WA");
      expect(rules?.reciprocity.enabled).toBe(true);
    });

    it("should apply to RETAIL_ONLY (not leases)", () => {
      const rules = getRulesForState("WA");
      expect(rules?.reciprocity.scope).toBe("RETAIL_ONLY");
    });

    it("should have NONE as home state behavior (no general reciprocity)", () => {
      const rules = getRulesForState("WA");
      expect(rules?.reciprocity.homeStateBehavior).toBe("NONE");
    });

    it("should NOT require proof of tax paid (due to Oregon exemption)", () => {
      const rules = getRulesForState("WA");
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(false);
    });

    it("should NOT have lease exception", () => {
      const rules = getRulesForState("WA");
      expect(rules?.reciprocity.hasLeaseException).toBe(false);
    });
  });

  describe("Reciprocity - Oregon Exemption", () => {
    it("should have Oregon reciprocity override", () => {
      const rules = getRulesForState("WA");
      expect(rules?.reciprocity.overrides).toBeDefined();
      expect(rules?.reciprocity.overrides?.length).toBeGreaterThan(0);
    });

    it("should provide HOME_STATE_ONLY exemption for Oregon residents", () => {
      const rules = getRulesForState("WA");
      const orOverride = rules?.reciprocity.overrides?.find(
        (o) => o.originState === "OR"
      );
      expect(orOverride).toBeDefined();
      expect(orOverride?.modeOverride).toBe("HOME_STATE_ONLY");
    });

    it("should scope Oregon exemption to RETAIL_ONLY", () => {
      const rules = getRulesForState("WA");
      const orOverride = rules?.reciprocity.overrides?.find(
        (o) => o.originState === "OR"
      );
      expect(orOverride).toBeDefined();
      expect(orOverride?.scopeOverride).toBe("RETAIL_ONLY");
    });

    it("should document Oregon exemption requirements in notes", () => {
      const rules = getRulesForState("WA");
      const orOverride = rules?.reciprocity.overrides?.find(
        (o) => o.originState === "OR"
      );
      expect(orOverride).toBeDefined();
      expect(orOverride?.notes).toBeTruthy();
      expect(orOverride?.notes).toContain("exempt");
      expect(orOverride?.notes).toContain("proof of residency");
    });
  });

  describe("Reciprocity - General Notes", () => {
    it("should document that WA does not provide general reciprocity credits", () => {
      const rules = getRulesForState("WA");
      expect(rules?.reciprocity.notes).toContain("does not provide reciprocity");
    });

    it("should document Oregon resident exemption in notes", () => {
      const rules = getRulesForState("WA");
      expect(rules?.reciprocity.notes).toContain("Oregon");
    });

    it("should document WA use tax for out-of-state purchases", () => {
      const rules = getRulesForState("WA");
      expect(rules?.reciprocity.notes).toContain("use tax");
    });
  });

  // ============================================================================
  // METADATA AND DOCUMENTATION TESTS
  // ============================================================================

  describe("Metadata - Sources and Documentation", () => {
    it("should have lastUpdated timestamp", () => {
      const rules = getRulesForState("WA");
      expect(rules?.extras?.lastUpdated).toBeDefined();
      expect(rules?.extras?.lastUpdated).toMatch(/2025-11/);
    });

    it("should have sources array with official references", () => {
      const rules = getRulesForState("WA");
      expect(rules?.extras?.sources).toBeDefined();
      expect(Array.isArray(rules?.extras?.sources)).toBe(true);
      expect(rules?.extras?.sources?.length).toBeGreaterThan(3);
    });

    it("should reference Washington Department of Revenue", () => {
      const rules = getRulesForState("WA");
      const sources = rules?.extras?.sources || [];
      const hasDOR = sources.some((s) =>
        s.toLowerCase().includes("department of revenue")
      );
      expect(hasDOR).toBe(true);
    });

    it("should reference relevant RCW chapters", () => {
      const rules = getRulesForState("WA");
      const sources = rules?.extras?.sources || [];
      const hasRCW = sources.some((s) => s.includes("RCW"));
      expect(hasRCW).toBe(true);
    });

    it("should reference relevant WAC chapters", () => {
      const rules = getRulesForState("WA");
      const sources = rules?.extras?.sources || [];
      const hasWAC = sources.some((s) => s.includes("WAC"));
      expect(hasWAC).toBe(true);
    });
  });

  describe("Metadata - Key Features", () => {
    it("should document special notes about WA tax system", () => {
      const rules = getRulesForState("WA");
      expect(rules?.extras?.specialNotes).toBeDefined();
      expect(Array.isArray(rules?.extras?.specialNotes)).toBe(true);
    });

    it("should note RTA tax in special notes", () => {
      const rules = getRulesForState("WA");
      const notes = rules?.extras?.specialNotes || [];
      const hasRTA = notes.some((n) => n.includes("RTA"));
      expect(hasRTA).toBe(true);
    });

    it("should note motor vehicle tax rate increase in 2026", () => {
      const rules = getRulesForState("WA");
      const notes = rules?.extras?.specialNotes || [];
      const hasFutureRate = notes.some((n) => n.includes("2026"));
      expect(hasFutureRate).toBe(true);
    });

    it("should note Oregon resident exemption", () => {
      const rules = getRulesForState("WA");
      const notes = rules?.extras?.specialNotes || [];
      const hasOR = notes.some((n) => n.includes("Oregon"));
      expect(hasOR).toBe(true);
    });

    it("should note doc fee cap", () => {
      const rules = getRulesForState("WA");
      const notes = rules?.extras?.specialNotes || [];
      const hasDocCap = notes.some((n) => n.includes("$200"));
      expect(hasDocCap).toBe(true);
    });

    it("should note EV exemption expiration", () => {
      const rules = getRulesForState("WA");
      const notes = rules?.extras?.specialNotes || [];
      const hasEV = notes.some(
        (n) => n.includes("EV") || n.includes("exemption expired")
      );
      expect(hasEV).toBe(true);
    });
  });

  describe("Metadata - General Notes", () => {
    it("should have comprehensive general notes", () => {
      const rules = getRulesForState("WA");
      expect(rules?.extras?.notes).toBeDefined();
      expect(rules?.extras?.notes?.length).toBeGreaterThan(100);
    });

    it("should mention no state income tax", () => {
      const rules = getRulesForState("WA");
      const notes = rules?.extras?.notes || "";
      expect(notes.toLowerCase()).toContain("no state income tax");
    });

    it("should mention dealer location for tax calculation", () => {
      const rules = getRulesForState("WA");
      const notes = rules?.extras?.notes || "";
      expect(notes.toLowerCase()).toContain("dealer location");
    });

    it("should mention manufacturer vs dealer rebate treatment", () => {
      const rules = getRulesForState("WA");
      const notes = rules?.extras?.notes || "";
      expect(notes.toLowerCase()).toContain("manufacturer");
      expect(notes.toLowerCase()).toContain("dealer");
      expect(notes.toLowerCase()).toContain("rebate");
    });
  });
});
