import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Maryland Tax Rules Configuration", () => {
  it("should load Maryland rules successfully", () => {
    const rules = getRulesForState("MD");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("MD");
  });

  it("should mark Maryland as implemented (not a stub)", () => {
    expect(isStateImplemented("MD")).toBe(true);
  });

  it("should have correct version number", () => {
    const rules = getRulesForState("MD");
    expect(rules?.version).toBe(2);
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS
  // ============================================================================

  describe("Retail - Trade-in Policy (CRITICAL: NO CREDIT)", () => {
    it("should have NONE trade-in policy (eliminated by HB 754)", () => {
      const rules = getRulesForState("MD");
      expect(rules?.tradeInPolicy.type).toBe("NONE");
    });

    it("should have extras documenting trade-in elimination", () => {
      const rules = getRulesForState("MD");
      expect(rules?.extras?.tradeInEliminationDate).toBe("2024-07-01");
      expect(rules?.extras?.tradeInEliminationBill).toBe("HB 754 (2024)");
    });

    it("should have majorChanges documenting trade-in elimination", () => {
      const rules = getRulesForState("MD");
      const majorChanges = rules?.extras?.majorChanges2024_2025 as string[];
      expect(majorChanges).toBeDefined();
      expect(majorChanges).toContain("HB 754 (2024): Eliminated trade-in allowance (July 1, 2024)");
    });
  });

  describe("Retail - Rebate Rules (ALL TAXABLE)", () => {
    it("should have correct number of rebate rules", () => {
      const rules = getRulesForState("MD");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as TAXABLE", () => {
      const rules = getRulesForState("MD");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(true);
      expect(mfrRebate?.notes).toContain("do NOT reduce taxable base");
    });

    it("should mark dealer rebates as NON-taxable (reduce selling price)", () => {
      const rules = getRulesForState("MD");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(false);
      expect(dealerRebate?.notes).toContain("reduce the selling price");
    });
  });

  describe("Retail - Doc Fee (TAXABLE, $800 CAP)", () => {
    it("should mark doc fee as taxable", () => {
      const rules = getRulesForState("MD");
      expect(rules?.docFeeTaxable).toBe(true);
    });

    it("should have doc fee in fee tax rules", () => {
      const rules = getRulesForState("MD");
      const docFee = rules?.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
      expect(docFee?.notes).toContain("$800");
    });

    it("should document doc fee cap in extras", () => {
      const rules = getRulesForState("MD");
      expect(rules?.extras?.docFeeCapAmount).toBe(800);
      expect(rules?.extras?.docFeeCapEffectiveDate).toBe("2024-07-01");
      expect(rules?.extras?.priorDocFeeCap).toBe(500);
    });
  });

  describe("Retail - Backend Products (VSC/GAP TAXABLE)", () => {
    it("should mark service contracts as TAXABLE", () => {
      const rules = getRulesForState("MD");
      const serviceContract = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(serviceContract).toBeDefined();
      expect(serviceContract?.taxable).toBe(true);
      expect(serviceContract?.notes).toContain("taxable");
    });

    it("should mark GAP as TAXABLE", () => {
      const rules = getRulesForState("MD");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(true);
      expect(gap?.notes).toContain("taxable");
    });

    it("should have taxOnServiceContracts as true", () => {
      const rules = getRulesForState("MD");
      expect(rules?.taxOnServiceContracts).toBe(true);
    });

    it("should have taxOnGap as true", () => {
      const rules = getRulesForState("MD");
      expect(rules?.taxOnGap).toBe(true);
    });
  });

  describe("Retail - Government Fees (NOT TAXABLE)", () => {
    it("should have title fees as non-taxable", () => {
      const rules = getRulesForState("MD");
      const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should have registration fees as non-taxable", () => {
      const rules = getRulesForState("MD");
      const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should mark accessories as taxable", () => {
      const rules = getRulesForState("MD");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should mark negative equity as taxable", () => {
      const rules = getRulesForState("MD");
      expect(rules?.taxOnNegativeEquity).toBe(true);
    });
  });

  describe("Retail - Vehicle Tax Scheme (STATE-ONLY)", () => {
    it("should have STATE_ONLY vehicle tax scheme", () => {
      const rules = getRulesForState("MD");
      expect(rules?.vehicleTaxScheme).toBe("STATE_ONLY");
    });

    it("should NOT use local sales tax", () => {
      const rules = getRulesForState("MD");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
    });
  });

  describe("Retail - Tax Rate (6.5% as of July 1, 2025)", () => {
    it("should document current excise tax rate in extras", () => {
      const rules = getRulesForState("MD");
      expect(rules?.extras?.stateExciseTaxRate).toBe(6.5);
    });

    it("should document prior excise tax rate", () => {
      const rules = getRulesForState("MD");
      expect(rules?.extras?.priorExciseTaxRate).toBe(6.0);
    });

    it("should document rate increase effective date", () => {
      const rules = getRulesForState("MD");
      expect(rules?.extras?.rateIncreaseEffectiveDate).toBe("2025-07-01");
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease - Method (FULL_UPFRONT)", () => {
    it("should use FULL_UPFRONT lease method", () => {
      const rules = getRulesForState("MD");
      expect(rules?.leaseRules.method).toBe("FULL_UPFRONT");
    });

    it("should have MD_UPFRONT_GAIN special scheme", () => {
      const rules = getRulesForState("MD");
      expect(rules?.leaseRules.specialScheme).toBe("MD_UPFRONT_GAIN");
    });
  });

  describe("Lease - Cap Cost Reduction (NOT taxed separately)", () => {
    it("should NOT tax cap cost reductions separately", () => {
      const rules = getRulesForState("MD");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });
  });

  describe("Lease - Rebate Behavior (ALWAYS_TAXABLE)", () => {
    it("should mark rebates as ALWAYS_TAXABLE on leases", () => {
      const rules = getRulesForState("MD");
      expect(rules?.leaseRules.rebateBehavior).toBe("ALWAYS_TAXABLE");
    });
  });

  describe("Lease - Doc Fee (ALWAYS taxable)", () => {
    it("should mark doc fee as ALWAYS taxable on leases", () => {
      const rules = getRulesForState("MD");
      expect(rules?.leaseRules.docFeeTaxability).toBe("ALWAYS");
    });

    it("should have doc fee in lease fee tax rules", () => {
      const rules = getRulesForState("MD");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
      expect(docFee?.notes).toContain("$800");
    });
  });

  describe("Lease - Trade-in Credit (NONE)", () => {
    it("should have NO trade-in credit on leases", () => {
      const rules = getRulesForState("MD");
      expect(rules?.leaseRules.tradeInCredit).toBe("NONE");
    });
  });

  describe("Lease - Negative Equity (TAXABLE)", () => {
    it("should mark negative equity as taxable on leases", () => {
      const rules = getRulesForState("MD");
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(true);
    });
  });

  describe("Lease - Backend Products (TAXABLE)", () => {
    it("should mark service contracts as taxable on leases", () => {
      const rules = getRulesForState("MD");
      const serviceContract = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(serviceContract).toBeDefined();
      expect(serviceContract?.taxable).toBe(true);
    });

    it("should mark GAP as taxable on leases", () => {
      const rules = getRulesForState("MD");
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(true);
    });
  });

  describe("Lease - Government Fees (NOT taxable)", () => {
    it("should have title fees as non-taxable on leases", () => {
      const rules = getRulesForState("MD");
      const title = rules?.leaseRules.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should have registration fees as non-taxable on leases", () => {
      const rules = getRulesForState("MD");
      const reg = rules?.leaseRules.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Lease - Tax Fees Upfront", () => {
    it("should tax fees upfront on leases", () => {
      const rules = getRulesForState("MD");
      expect(rules?.leaseRules.taxFeesUpfront).toBe(true);
    });
  });

  describe("Lease - Title Fee Rules", () => {
    it("should have title fee rules configured", () => {
      const rules = getRulesForState("MD");
      expect(rules?.leaseRules.titleFeeRules).toBeDefined();
      expect(rules?.leaseRules.titleFeeRules.length).toBeGreaterThan(0);
    });

    it("should mark title as non-taxable but included in cap cost", () => {
      const rules = getRulesForState("MD");
      const titleRule = rules?.leaseRules.titleFeeRules.find((r) => r.code === "TITLE");
      expect(titleRule).toBeDefined();
      expect(titleRule?.taxable).toBe(false);
      expect(titleRule?.includedInCapCost).toBe(true);
      expect(titleRule?.includedInUpfront).toBe(true);
      expect(titleRule?.includedInMonthly).toBe(false);
    });
  });

  describe("Lease - Notes", () => {
    it("should have comprehensive lease notes", () => {
      const rules = getRulesForState("MD");
      expect(rules?.leaseRules.notes).toBeDefined();
      expect(rules?.leaseRules.notes).toContain("FULL_UPFRONT");
      expect(rules?.leaseRules.notes).toContain("6.5%");
      expect(rules?.leaseRules.notes).toContain("NO trade-in credit");
    });
  });

  // ============================================================================
  // RECIPROCITY TESTS
  // ============================================================================

  describe("Reciprocity - Enabled (with 60-day limit)", () => {
    it("should have reciprocity enabled", () => {
      const rules = getRulesForState("MD");
      expect(rules?.reciprocity.enabled).toBe(true);
    });

    it("should apply to BOTH retail and lease", () => {
      const rules = getRulesForState("MD");
      expect(rules?.reciprocity.scope).toBe("BOTH");
    });

    it("should use CREDIT_UP_TO_STATE_RATE behavior", () => {
      const rules = getRulesForState("MD");
      expect(rules?.reciprocity.homeStateBehavior).toBe("CREDIT_UP_TO_STATE_RATE");
    });

    it("should require proof of tax paid", () => {
      const rules = getRulesForState("MD");
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(true);
    });

    it("should use TAX_PAID basis", () => {
      const rules = getRulesForState("MD");
      expect(rules?.reciprocity.basis).toBe("TAX_PAID");
    });

    it("should cap at Maryland's tax rate", () => {
      const rules = getRulesForState("MD");
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(true);
    });

    it("should NOT have lease exception", () => {
      const rules = getRulesForState("MD");
      expect(rules?.reciprocity.hasLeaseException).toBe(false);
    });

    it("should document 60-day time limit in notes", () => {
      const rules = getRulesForState("MD");
      expect(rules?.reciprocity.notes).toContain("60 days");
    });

    it("should document reciprocity time limit in extras", () => {
      const rules = getRulesForState("MD");
      expect(rules?.extras?.reciprocityTimeLimit).toBe("60 days");
    });

    it("should document minimum tax with reciprocity", () => {
      const rules = getRulesForState("MD");
      expect(rules?.extras?.minimumTaxWithReciprocity).toBe(100);
    });
  });

  // ============================================================================
  // EXTRAS AND DOCUMENTATION TESTS
  // ============================================================================

  describe("Extras - Sources and Documentation", () => {
    it("should have comprehensive sources listed", () => {
      const rules = getRulesForState("MD");
      const sources = rules?.extras?.sources as string[];
      expect(sources).toBeDefined();
      expect(sources.length).toBeGreaterThan(5);
    });

    it("should reference HB 754 in sources", () => {
      const rules = getRulesForState("MD");
      const sources = rules?.extras?.sources as string[];
      expect(sources.some((s) => s.includes("HB 754") || s.includes("754"))).toBe(true);
    });

    it("should reference HB 352 in sources", () => {
      const rules = getRulesForState("MD");
      const sources = rules?.extras?.sources as string[];
      expect(sources.some((s) => s.includes("HB 352") || s.includes("352"))).toBe(true);
    });

    it("should reference SB 362 in sources", () => {
      const rules = getRulesForState("MD");
      const sources = rules?.extras?.sources as string[];
      expect(sources.some((s) => s.includes("SB 362") || s.includes("362"))).toBe(true);
    });

    it("should have lastUpdated date", () => {
      const rules = getRulesForState("MD");
      expect(rules?.extras?.lastUpdated).toBe("2025-11-13");
    });

    it("should have comprehensive notes in extras", () => {
      const rules = getRulesForState("MD");
      expect(rules?.extras?.notes).toBeDefined();
      expect(typeof rules?.extras?.notes).toBe("string");
      expect((rules?.extras?.notes as string).length).toBeGreaterThan(100);
    });
  });

  describe("Extras - Major Changes Documentation", () => {
    it("should document all three major changes (2024-2025)", () => {
      const rules = getRulesForState("MD");
      const majorChanges = rules?.extras?.majorChanges2024_2025 as string[];
      expect(majorChanges).toBeDefined();
      expect(majorChanges).toHaveLength(3);
    });

    it("should document trade-in elimination", () => {
      const rules = getRulesForState("MD");
      const majorChanges = rules?.extras?.majorChanges2024_2025 as string[];
      expect(majorChanges.some((c) => c.includes("trade-in"))).toBe(true);
    });

    it("should document doc fee cap increase", () => {
      const rules = getRulesForState("MD");
      const majorChanges = rules?.extras?.majorChanges2024_2025 as string[];
      expect(majorChanges.some((c) => c.includes("doc fee") && c.includes("$800"))).toBe(true);
    });

    it("should document excise tax rate increase", () => {
      const rules = getRulesForState("MD");
      const majorChanges = rules?.extras?.majorChanges2024_2025 as string[];
      expect(majorChanges.some((c) => c.includes("excise tax") && c.includes("6.5%"))).toBe(true);
    });
  });

  describe("Extras - Rental Vehicle Rate", () => {
    it("should document rental vehicle rate (11.5%)", () => {
      const rules = getRulesForState("MD");
      expect(rules?.extras?.rentalVehicleRate).toBe(11.5);
    });

    it("should document rental vehicle threshold", () => {
      const rules = getRulesForState("MD");
      expect(rules?.extras?.rentalVehicleThreshold).toBe("< 180 days");
    });
  });

  // ============================================================================
  // EDGE CASES AND SPECIAL SCENARIOS
  // ============================================================================

  describe("Edge Cases - NO Trade-In Credit Impact", () => {
    it("should confirm NO trade-in credit even with high trade value", () => {
      const rules = getRulesForState("MD");
      // Even if trade-in > vehicle price, tax still on full vehicle price
      expect(rules?.tradeInPolicy.type).toBe("NONE");
    });
  });

  describe("Edge Cases - Manufacturer Rebates Always Taxable", () => {
    it("should tax manufacturer rebates regardless of amount", () => {
      const rules = getRulesForState("MD");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate?.taxable).toBe(true);
      // Even $10,000 EV rebate is taxable
    });
  });

  describe("Edge Cases - Reciprocity Time Sensitivity", () => {
    it("should document strict 60-day requirement for reciprocity", () => {
      const rules = getRulesForState("MD");
      expect(rules?.reciprocity.notes).toContain("60 days");
      expect(rules?.reciprocity.notes).toContain("NO credit");
      // After 60 days, pay tax twice
    });
  });

  describe("Integration - Complete Rule Set", () => {
    it("should have all required top-level fields", () => {
      const rules = getRulesForState("MD");
      expect(rules?.stateCode).toBeDefined();
      expect(rules?.version).toBeDefined();
      expect(rules?.tradeInPolicy).toBeDefined();
      expect(rules?.rebates).toBeDefined();
      expect(rules?.docFeeTaxable).toBeDefined();
      expect(rules?.feeTaxRules).toBeDefined();
      expect(rules?.taxOnAccessories).toBeDefined();
      expect(rules?.taxOnNegativeEquity).toBeDefined();
      expect(rules?.taxOnServiceContracts).toBeDefined();
      expect(rules?.taxOnGap).toBeDefined();
      expect(rules?.vehicleTaxScheme).toBeDefined();
      expect(rules?.vehicleUsesLocalSalesTax).toBeDefined();
      expect(rules?.leaseRules).toBeDefined();
      expect(rules?.reciprocity).toBeDefined();
      expect(rules?.extras).toBeDefined();
    });

    it("should have all required lease rule fields", () => {
      const rules = getRulesForState("MD");
      expect(rules?.leaseRules.method).toBeDefined();
      expect(rules?.leaseRules.taxCapReduction).toBeDefined();
      expect(rules?.leaseRules.rebateBehavior).toBeDefined();
      expect(rules?.leaseRules.docFeeTaxability).toBeDefined();
      expect(rules?.leaseRules.tradeInCredit).toBeDefined();
      expect(rules?.leaseRules.negativeEquityTaxable).toBeDefined();
      expect(rules?.leaseRules.feeTaxRules).toBeDefined();
      expect(rules?.leaseRules.titleFeeRules).toBeDefined();
      expect(rules?.leaseRules.taxFeesUpfront).toBeDefined();
      expect(rules?.leaseRules.specialScheme).toBeDefined();
      expect(rules?.leaseRules.notes).toBeDefined();
    });

    it("should have all required reciprocity fields", () => {
      const rules = getRulesForState("MD");
      expect(rules?.reciprocity.enabled).toBeDefined();
      expect(rules?.reciprocity.scope).toBeDefined();
      expect(rules?.reciprocity.homeStateBehavior).toBeDefined();
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBeDefined();
      expect(rules?.reciprocity.basis).toBeDefined();
      expect(rules?.reciprocity.capAtThisStatesTax).toBeDefined();
      expect(rules?.reciprocity.hasLeaseException).toBeDefined();
      expect(rules?.reciprocity.notes).toBeDefined();
    });
  });
});
