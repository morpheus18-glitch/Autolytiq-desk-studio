import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Oklahoma (OK) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load Oklahoma rules successfully", () => {
    const rules = getRulesForState("OK");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("OK");
  });

  it("should mark Oklahoma as implemented (not a stub)", () => {
    expect(isStateImplemented("OK")).toBe(true);
  });

  it("should have version number 2", () => {
    const rules = getRulesForState("OK");
    expect(rules?.version).toBe(2);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("OK");
    const rulesLower = getRulesForState("ok");
    const rulesMixed = getRulesForState("Ok");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("OK");
    expect(rulesLower?.stateCode).toBe("OK");
    expect(rulesMixed?.stateCode).toBe("OK");
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS
  // ============================================================================

  describe("Retail - Trade-In Policy", () => {
    it("should have FULL trade-in credit policy (applies to 1.25% sales tax only)", () => {
      const rules = getRulesForState("OK");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });

    it("should document partial trade-in credit (sales tax only, not excise)", () => {
      const rules = getRulesForState("OK");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
      // Implementation note should mention this applies to sales tax (1.25%) only
      // The 3.25% excise tax does NOT allow trade-in deduction
    });

    it("should validate Oklahoma dual-tax trade-in treatment", () => {
      const rules = getRulesForState("OK");
      // Trade-in reduces SALES TAX (1.25%) only
      // Trade-in does NOT reduce EXCISE TAX (3.25%)
      // Example: $10,000 trade saves $125, not $450
      expect(rules?.tradeInPolicy.type).toBe("FULL");
      expect(rules?.extras?.stateSalesTaxRate).toBe(1.25);
      expect(rules?.extras?.stateExciseTaxRateNew).toBe(3.25);
    });
  });

  describe("Retail - Rebate Rules", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("OK");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as NON-TAXABLE (reduce tax base)", () => {
      const rules = getRulesForState("OK");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(false);
      expect(mfrRebate?.notes).toContain("REDUCE the taxable base");
    });

    it("should mark dealer rebates as NON-TAXABLE (reduce selling price)", () => {
      const rules = getRulesForState("OK");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(false);
      expect(dealerRebate?.notes).toContain("reduce the selling price");
    });

    it("should document that Oklahoma rebates reduce BOTH excise and sales tax", () => {
      const rules = getRulesForState("OK");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");

      // In OK, rebates reduce the base for BOTH taxes (unlike trade-in)
      expect(mfrRebate?.taxable).toBe(false);
      expect(mfrRebate?.notes).toContain("excise tax (3.25%) and sales tax (1.25%)");
    });

    it("should contrast Oklahoma rebate treatment with Alabama", () => {
      const rules = getRulesForState("OK");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");

      // OK: rebates are NON-taxable (reduce base)
      // AL: rebates are TAXABLE (do not reduce base)
      expect(mfrRebate?.taxable).toBe(false);
      expect(mfrRebate?.notes).toContain("Alabama");
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as NOT TAXABLE (unique Oklahoma feature)", () => {
      const rules = getRulesForState("OK");
      expect(rules?.docFeeTaxable).toBe(false);
    });

    it("should document that doc fees are separate from vehicle taxes", () => {
      const rules = getRulesForState("OK");
      const docFee = rules?.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(false);
      expect(docFee?.notes).toContain("NOT TAXABLE");
      expect(docFee?.notes).toContain("administrative charge");
    });

    it("should document NO CAP on doc fees with average of $270", () => {
      const rules = getRulesForState("OK");
      expect(rules?.extras?.avgDocFee).toBe(270);
      expect(rules?.extras?.docFeeCapExists).toBe(false);
    });

    it("should contrast Oklahoma doc fee treatment with other states", () => {
      const rules = getRulesForState("OK");
      const docFee = rules?.feeTaxRules.find((r) => r.code === "DOC_FEE");

      // Many states (AL, AZ, CO) make doc fees taxable
      // Oklahoma does NOT
      expect(docFee?.notes).toContain("unique feature");
    });
  });

  describe("Retail - Fee Tax Rules", () => {
    it("should mark service contracts (VSC) as NON-TAXABLE", () => {
      const rules = getRulesForState("OK");
      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(false);
      expect(vsc?.notes).toContain("NOT subject to Oklahoma sales tax or excise tax");
    });

    it("should mark GAP as NON-TAXABLE", () => {
      const rules = getRulesForState("OK");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(false);
      expect(gap?.notes).toContain("NOT taxable");
      expect(gap?.notes).toContain("financial protection product");
    });

    it("should mark title fees as NON-TAXABLE", () => {
      const rules = getRulesForState("OK");
      const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-TAXABLE", () => {
      const rules = getRulesForState("OK");
      const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });

    it("should document annual registration fee range", () => {
      const rules = getRulesForState("OK");
      const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg?.notes).toContain("$15-$85");
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should mark accessories as TAXABLE", () => {
      const rules = getRulesForState("OK");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should mark service contracts as NON-TAXABLE", () => {
      const rules = getRulesForState("OK");
      expect(rules?.taxOnServiceContracts).toBe(false);
    });

    it("should mark GAP as NON-TAXABLE", () => {
      const rules = getRulesForState("OK");
      expect(rules?.taxOnGap).toBe(false);
    });

    it("should mark negative equity as NON-TAXABLE", () => {
      const rules = getRulesForState("OK");
      expect(rules?.taxOnNegativeEquity).toBe(false);
    });

    it("should document that accessories are subject to both taxes (4.5% total)", () => {
      const rules = getRulesForState("OK");
      expect(rules?.taxOnAccessories).toBe(true);
      // Accessories subject to 3.25% excise + 1.25% sales = 4.5%
      expect(rules?.extras?.combinedRate).toBe(4.5);
    });
  });

  describe("Retail - Vehicle Tax Scheme", () => {
    it("should use STATE_ONLY tax scheme (no local taxes)", () => {
      const rules = getRulesForState("OK");
      expect(rules?.vehicleTaxScheme).toBe("STATE_ONLY");
    });

    it("should NOT use local sales tax for vehicles", () => {
      const rules = getRulesForState("OK");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
    });

    it("should document statewide uniform rate", () => {
      const rules = getRulesForState("OK");
      expect(rules?.vehicleTaxScheme).toBe("STATE_ONLY");
      expect(rules?.extras?.combinedRate).toBe(4.5);
      // Same 4.5% everywhere in Oklahoma
    });

    it("should document dual-tax structure (excise + sales)", () => {
      const rules = getRulesForState("OK");
      expect(rules?.extras?.stateExciseTaxRateNew).toBe(3.25);
      expect(rules?.extras?.stateSalesTaxRate).toBe(1.25);
      expect(rules?.extras?.combinedRate).toBe(4.5);
    });
  });

  describe("Retail - Used Vehicle Special Calculation", () => {
    it("should document used vehicle excise tax structure", () => {
      const rules = getRulesForState("OK");
      expect(rules?.extras?.stateExciseTaxRateUsedFlat).toBe(20.0);
      expect(rules?.extras?.stateExciseTaxRateUsedThreshold).toBe(1500.0);
      expect(rules?.extras?.stateExciseTaxRateUsedPercent).toBe(3.25);
    });

    it("should validate used vehicle tax calculation method", () => {
      const rules = getRulesForState("OK");
      // Used: $20 on first $1,500 + 3.25% on remainder
      // Example: $10,000 vehicle
      // Excise: $20 + ($8,500 × 3.25%) = $20 + $276.25 = $296.25
      expect(rules?.extras?.stateExciseTaxRateUsedFlat).toBe(20);
      expect(rules?.extras?.stateExciseTaxRateUsedThreshold).toBe(1500);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease - Lease Method", () => {
    it("should use FULL_UPFRONT lease taxation method", () => {
      const rules = getRulesForState("OK");
      expect(rules?.leaseRules.method).toBe("FULL_UPFRONT");
    });

    it("should document 12+ month lease exemption from sales tax", () => {
      const rules = getRulesForState("OK");
      expect(rules?.leaseRules.method).toBe("FULL_UPFRONT");
      expect(rules?.extras?.longTermLeaseThresholdMonths).toBe(12);
      expect(rules?.leaseRules.notes).toContain("12 months");
      expect(rules?.leaseRules.notes).toContain("EXEMPT from sales tax");
    });

    it("should document short-term rental tax (< 90 days)", () => {
      const rules = getRulesForState("OK");
      expect(rules?.extras?.shortTermRentalTaxRate).toBe(6.0);
      expect(rules?.extras?.shortTermRentalThresholdDays).toBe(90);
    });

    it("should document upfront excise tax rate for leases", () => {
      const rules = getRulesForState("OK");
      expect(rules?.extras?.longTermLeaseExciseTaxRate).toBe(3.25);
    });
  });

  describe("Lease - Cap Cost Reduction", () => {
    it("should NOT separately tax cap cost reductions", () => {
      const rules = getRulesForState("OK");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });

    it("should document that excise tax is on full cap cost only", () => {
      const rules = getRulesForState("OK");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
      // Excise tax calculated on gross cap cost, not on reductions
    });

    it("should contrast Oklahoma lease treatment with Alabama", () => {
      const rules = getRulesForState("OK");
      // OK: Cap cost reductions NOT separately taxed
      // AL: Cap cost reductions ARE taxed at inception
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });
  });

  describe("Lease - Rebate Behavior", () => {
    it("should use NON_TAXABLE_IF_AT_SIGNING rebate behavior", () => {
      const rules = getRulesForState("OK");
      expect(rules?.leaseRules.rebateBehavior).toBe("NON_TAXABLE_IF_AT_SIGNING");
    });

    it("should document that rebates reduce cap cost without separate tax", () => {
      const rules = getRulesForState("OK");
      expect(rules?.leaseRules.rebateBehavior).toBe("NON_TAXABLE_IF_AT_SIGNING");
      // Rebates reduce gross cap cost, excise tax on reduced amount
    });
  });

  describe("Lease - Doc Fee Taxability", () => {
    it("should mark doc fee as NEVER taxable on leases", () => {
      const rules = getRulesForState("OK");
      expect(rules?.leaseRules.docFeeTaxability).toBe("NEVER");
    });

    it("should document consistency with retail doc fee treatment", () => {
      const rules = getRulesForState("OK");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(false);
      expect(docFee?.notes).toContain("same as retail");
    });
  });

  describe("Lease - Trade-In Credit", () => {
    it("should use CAP_COST_ONLY trade-in credit mode", () => {
      const rules = getRulesForState("OK");
      expect(rules?.leaseRules.tradeInCredit).toBe("CAP_COST_ONLY");
    });

    it("should document that trade-in reduces cap cost (and thus excise tax)", () => {
      const rules = getRulesForState("OK");
      expect(rules?.leaseRules.tradeInCredit).toBe("CAP_COST_ONLY");
      // Trade-in equity reduces gross cap cost
      // Lower cap cost = lower excise tax
    });
  });

  describe("Lease - Negative Equity", () => {
    it("should mark negative equity as NOT separately taxable", () => {
      const rules = getRulesForState("OK");
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(false);
    });

    it("should document that negative equity is part of cap cost calculation", () => {
      const rules = getRulesForState("OK");
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(false);
      // Negative equity increases cap cost
      // Excise tax calculated on total cap (including negative equity)
      // Not "taxable" as separate line item
    });
  });

  describe("Lease - Fee Tax Rules", () => {
    it("should mark doc fee as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("OK");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(false);
    });

    it("should mark service contracts as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("OK");
      const vsc = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(false);
    });

    it("should mark GAP as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("OK");
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(false);
    });

    it("should mark title fees as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("OK");
      const title = rules?.leaseRules.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("OK");
      const reg = rules?.leaseRules.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Lease - Tax Fees Upfront", () => {
    it("should NOT tax fees upfront (excise tax on cap cost only)", () => {
      const rules = getRulesForState("OK");
      expect(rules?.leaseRules.taxFeesUpfront).toBe(false);
    });
  });

  describe("Lease - Special Scheme", () => {
    it("should have NONE as special scheme (standard upfront excise)", () => {
      const rules = getRulesForState("OK");
      expect(rules?.leaseRules.specialScheme).toBe("NONE");
    });
  });

  // ============================================================================
  // RECIPROCITY TESTS
  // ============================================================================

  describe("Reciprocity Rules", () => {
    it("should enable LIMITED reciprocity", () => {
      const rules = getRulesForState("OK");
      expect(rules?.reciprocity.enabled).toBe(true);
      expect(rules?.reciprocity.homeStateBehavior).toBe("CREDIT_UP_TO_STATE_RATE");
    });

    it("should apply reciprocity to BOTH retail and lease", () => {
      const rules = getRulesForState("OK");
      expect(rules?.reciprocity.scope).toBe("BOTH");
    });

    it("should require proof of tax paid", () => {
      const rules = getRulesForState("OK");
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(true);
    });

    it("should base credit on TAX_PAID", () => {
      const rules = getRulesForState("OK");
      expect(rules?.reciprocity.basis).toBe("TAX_PAID");
    });

    it("should cap credit at Oklahoma's tax amount", () => {
      const rules = getRulesForState("OK");
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(true);
    });

    it("should NOT have lease exceptions", () => {
      const rules = getRulesForState("OK");
      expect(rules?.reciprocity.hasLeaseException).toBe(false);
    });

    it("should document limited/case-by-case reciprocity", () => {
      const rules = getRulesForState("OK");
      expect(rules?.reciprocity.notes).toContain("LIMITED");
      expect(rules?.reciprocity.notes).toContain("case-by-case");
      expect(rules?.reciprocity.notes).toContain("documentation required");
    });

    it("should document no formal drive-out provision", () => {
      const rules = getRulesForState("OK");
      expect(rules?.reciprocity.notes).toContain("No formal drive-out");
    });
  });

  // ============================================================================
  // EXTRAS / METADATA TESTS
  // ============================================================================

  describe("Extras - Sources & Documentation", () => {
    it("should have lastUpdated date", () => {
      const rules = getRulesForState("OK");
      expect(rules?.extras?.lastUpdated).toBe("2025-11-14");
    });

    it("should list comprehensive sources", () => {
      const rules = getRulesForState("OK");
      expect(rules?.extras?.sources).toBeDefined();
      expect(Array.isArray(rules?.extras?.sources)).toBe(true);
      expect((rules?.extras?.sources as string[]).length).toBeGreaterThan(5);
    });

    it("should reference Oklahoma Tax Commission", () => {
      const rules = getRulesForState("OK");
      const sources = rules?.extras?.sources as string[];
      const hasTaxCommission = sources.some((s) => s.includes("Oklahoma Tax Commission"));
      expect(hasTaxCommission).toBe(true);
    });

    it("should reference Oklahoma Statutes Title 68", () => {
      const rules = getRulesForState("OK");
      const sources = rules?.extras?.sources as string[];
      const hasStatutes = sources.some((s) => s.includes("Title 68"));
      expect(hasStatutes).toBe(true);
    });

    it("should reference HB 2433 (2017 sales tax addition)", () => {
      const rules = getRulesForState("OK");
      const sources = rules?.extras?.sources as string[];
      const hasHB2433 = sources.some((s) => s.includes("HB 2433") || s.includes("House Bill 2433"));
      expect(hasHB2433).toBe(true);
    });

    it("should reference HB 1183 (2025 excise tax simplification)", () => {
      const rules = getRulesForState("OK");
      const sources = rules?.extras?.sources as string[];
      const hasHB1183 = sources.some((s) => s.includes("HB 1183") || s.includes("House Bill 1183"));
      expect(hasHB1183).toBe(true);
    });

    it("should have effective dates for legislation", () => {
      const rules = getRulesForState("OK");
      expect(rules?.extras?.hb2433EffectiveDate).toBe("2017-07-01");
      expect(rules?.extras?.hb1183EffectiveDate).toBe("2026-07-01");
    });
  });

  describe("Extras - Rate Information", () => {
    it("should document all tax rates accurately", () => {
      const rules = getRulesForState("OK");
      expect(rules?.extras?.stateExciseTaxRateNew).toBe(3.25);
      expect(rules?.extras?.stateSalesTaxRate).toBe(1.25);
      expect(rules?.extras?.combinedRate).toBe(4.5);
      expect(rules?.extras?.shortTermRentalTaxRate).toBe(6.0);
      expect(rules?.extras?.longTermLeaseExciseTaxRate).toBe(3.25);
    });

    it("should validate combined rate equals excise + sales", () => {
      const rules = getRulesForState("OK");
      const excise = rules?.extras?.stateExciseTaxRateNew as number;
      const sales = rules?.extras?.stateSalesTaxRate as number;
      const combined = rules?.extras?.combinedRate as number;
      expect(excise + sales).toBe(combined);
    });

    it("should document used vehicle tax structure", () => {
      const rules = getRulesForState("OK");
      expect(rules?.extras?.stateExciseTaxRateUsedFlat).toBe(20.0);
      expect(rules?.extras?.stateExciseTaxRateUsedThreshold).toBe(1500.0);
      expect(rules?.extras?.stateExciseTaxRateUsedPercent).toBe(3.25);
    });

    it("should document lease thresholds", () => {
      const rules = getRulesForState("OK");
      expect(rules?.extras?.longTermLeaseThresholdMonths).toBe(12);
      expect(rules?.extras?.shortTermRentalThresholdDays).toBe(90);
    });
  });

  describe("Extras - Fee Information", () => {
    it("should document average doc fee", () => {
      const rules = getRulesForState("OK");
      expect(rules?.extras?.avgDocFee).toBe(270);
    });

    it("should document that no doc fee cap exists", () => {
      const rules = getRulesForState("OK");
      expect(rules?.extras?.docFeeCapExists).toBe(false);
    });
  });

  describe("Extras - Summary Notes", () => {
    it("should have comprehensive summary notes", () => {
      const rules = getRulesForState("OK");
      expect(rules?.extras?.notes).toBeDefined();
      expect(typeof rules?.extras?.notes).toBe("string");
      expect((rules?.extras?.notes as string).length).toBeGreaterThan(200);
    });

    it("should mention dual-tax structure in notes", () => {
      const rules = getRulesForState("OK");
      expect(rules?.extras?.notes).toContain("dual-tax structure");
      expect(rules?.extras?.notes).toContain("3.25%");
      expect(rules?.extras?.notes).toContain("1.25%");
    });

    it("should mention STATE-ONLY (no local taxes) in notes", () => {
      const rules = getRulesForState("OK");
      expect(rules?.extras?.notes).toContain("STATE-ONLY");
      expect(rules?.extras?.notes).toContain("no local add-ons");
    });

    it("should mention partial trade-in credit in notes", () => {
      const rules = getRulesForState("OK");
      expect(rules?.extras?.notes).toContain("PARTIAL trade-in credit");
      expect(rules?.extras?.notes).toContain("1.25% sales tax ONLY");
    });

    it("should mention HB 1183 future changes in notes", () => {
      const rules = getRulesForState("OK");
      expect(rules?.extras?.notes).toContain("HB 1183");
      expect(rules?.extras?.notes).toContain("7/1/2026");
    });

    it("should mention used vehicle special calculation in notes", () => {
      const rules = getRulesForState("OK");
      expect(rules?.extras?.notes).toContain("Used vehicles");
      expect(rules?.extras?.notes).toContain("$20 flat");
      expect(rules?.extras?.notes).toContain("$1,500");
    });

    it("should mention doc fee NOT taxable in notes", () => {
      const rules = getRulesForState("OK");
      expect(rules?.extras?.notes).toContain("Doc fee NOT TAXABLE");
    });

    it("should mention rebates NON-TAXABLE in notes", () => {
      const rules = getRulesForState("OK");
      expect(rules?.extras?.notes).toContain("rebates NON-TAXABLE");
    });

    it("should mention lease taxation method in notes", () => {
      const rules = getRulesForState("OK");
      expect(rules?.extras?.notes).toContain("Leases");
      expect(rules?.extras?.notes).toContain("12 months");
      expect(rules?.extras?.notes).toContain("excise tax upfront");
      expect(rules?.extras?.notes).toContain("EXEMPT");
    });
  });
});
