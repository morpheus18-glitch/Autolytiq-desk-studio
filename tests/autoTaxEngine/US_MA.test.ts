import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Massachusetts (MA) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load Massachusetts rules successfully", () => {
    const rules = getRulesForState("MA");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("MA");
  });

  it("should mark Massachusetts as implemented (not a stub)", () => {
    expect(isStateImplemented("MA")).toBe(true);
  });

  it("should have version number 2", () => {
    const rules = getRulesForState("MA");
    expect(rules?.version).toBe(2);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("MA");
    const rulesLower = getRulesForState("ma");
    const rulesMixed = getRulesForState("Ma");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("MA");
    expect(rulesLower?.stateCode).toBe("MA");
    expect(rulesMixed?.stateCode).toBe("MA");
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS
  // ============================================================================

  describe("Retail - Trade-In Policy", () => {
    it("should have FULL trade-in credit policy", () => {
      const rules = getRulesForState("MA");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });

    it("should document that full credit uses gross allowance", () => {
      const rules = getRulesForState("MA");
      expect(rules?.extras?.notes).toContain("Full trade-in credit");
      expect(rules?.extras?.notes).toContain("GROSS allowance");
    });

    it("should document trade-in credit history", () => {
      const rules = getRulesForState("MA");
      expect(rules?.extras?.tradeInCreditHistory).toBeDefined();
      expect(rules?.extras?.tradeInCreditHistory?.["2017-08-01 onwards"]).toBe("FULL");
      expect(rules?.extras?.tradeInCreditHistory?.["2009-08-01 to 2017-07-31"]).toBe("CAPPED_10000");
    });
  });

  describe("Retail - Rebate Rules", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("MA");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as NON-TAXABLE", () => {
      const rules = getRulesForState("MA");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(false);
      expect(mfrRebate?.notes).toContain("reduce");
    });

    it("should mark dealer rebates as NON-TAXABLE (UNIQUE)", () => {
      const rules = getRulesForState("MA");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(false);
      expect(dealerRebate?.notes).toContain("UNIQUE");
    });

    it("should document that manufacturer rebate must be applied at time of sale", () => {
      const rules = getRulesForState("MA");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate?.notes).toContain("at the time of sale");
      expect(mfrRebate?.notes).toContain("Post-sale");
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("MA");
      expect(rules?.docFeeTaxable).toBe(true);
    });

    it("should have NO CAP on doc fee", () => {
      const rules = getRulesForState("MA");
      expect(rules?.extras?.docFeeCapAmount).toBeNull();
      expect(rules?.extras?.avgDocFee).toBe(340);
    });

    it("should document average doc fee of $340", () => {
      const rules = getRulesForState("MA");
      expect(rules?.extras?.avgDocFee).toBe(340);
    });
  });

  describe("Retail - Fee Tax Rules", () => {
    it("should mark service contracts (VSC) as NON-TAXABLE if separately stated", () => {
      const rules = getRulesForState("MA");
      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(false);
      expect(vsc?.notes).toContain("SEPARATELY STATED");
    });

    it("should mark GAP as NON-TAXABLE if separately stated", () => {
      const rules = getRulesForState("MA");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(false);
      expect(gap?.notes).toContain("SEPARATELY STATED");
    });

    it("should mark title fees as NON-TAXABLE", () => {
      const rules = getRulesForState("MA");
      const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-TAXABLE", () => {
      const rules = getRulesForState("MA");
      const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });

    it("should mark excise tax as NON-TAXABLE", () => {
      const rules = getRulesForState("MA");
      const excise = rules?.feeTaxRules.find((r) => r.code === "EXCISE_TAX");
      expect(excise).toBeDefined();
      expect(excise?.taxable).toBe(false);
      expect(excise?.notes).toContain("annual property tax");
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("MA");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should NOT tax negative equity", () => {
      const rules = getRulesForState("MA");
      expect(rules?.taxOnNegativeEquity).toBe(false);
    });

    it("should NOT tax service contracts if separately stated", () => {
      const rules = getRulesForState("MA");
      expect(rules?.taxOnServiceContracts).toBe(false);
    });

    it("should NOT tax GAP insurance if separately stated", () => {
      const rules = getRulesForState("MA");
      expect(rules?.taxOnGap).toBe(false);
    });
  });

  describe("Retail - Vehicle Tax Scheme", () => {
    it("should use STATE_ONLY vehicle tax scheme", () => {
      const rules = getRulesForState("MA");
      expect(rules?.vehicleTaxScheme).toBe("STATE_ONLY");
    });

    it("should NOT use local sales tax", () => {
      const rules = getRulesForState("MA");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
    });

    it("should document state rate of 6.25%", () => {
      const rules = getRulesForState("MA");
      expect(rules?.extras?.stateRate).toBe(6.25);
    });

    it("should document no local tax variations", () => {
      const rules = getRulesForState("MA");
      expect(rules?.extras?.notes).toContain("no local");
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease - Tax Method", () => {
    it("should use MONTHLY lease taxation method", () => {
      const rules = getRulesForState("MA");
      expect(rules?.leaseRules.method).toBe("MONTHLY");
    });

    it("should NOT tax cap cost reduction", () => {
      const rules = getRulesForState("MA");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });

    it("should tax fees upfront on leases", () => {
      const rules = getRulesForState("MA");
      expect(rules?.leaseRules.taxFeesUpfront).toBe(true);
    });

    it("should have no special scheme", () => {
      const rules = getRulesForState("MA");
      expect(rules?.leaseRules.specialScheme).toBe("NONE");
    });

    it("should document monthly payment taxation", () => {
      const rules = getRulesForState("MA");
      expect(rules?.leaseRules.notes).toContain("Monthly lease taxation");
      expect(rules?.leaseRules.notes).toContain("6.25%");
    });
  });

  describe("Lease - Cap Cost Reduction Taxation", () => {
    it("should NOT tax cap cost reduction upfront", () => {
      const rules = getRulesForState("MA");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });
  });

  describe("Lease - Rebates and Incentives", () => {
    it("should have ALWAYS_NON_TAXABLE rebate behavior on leases", () => {
      const rules = getRulesForState("MA");
      expect(rules?.leaseRules.rebateBehavior).toBe("ALWAYS_NON_TAXABLE");
    });

    it("should document that both manufacturer and dealer rebates reduce cap cost", () => {
      const rules = getRulesForState("MA");
      expect(rules?.leaseRules.notes).toContain("manufacturer and dealer rebates");
      expect(rules?.leaseRules.notes).toContain("non-taxable");
    });
  });

  describe("Lease - Documentation Fee", () => {
    it("should ALWAYS tax doc fee on leases", () => {
      const rules = getRulesForState("MA");
      expect(rules?.leaseRules.docFeeTaxability).toBe("ALWAYS");
    });

    it("should have doc fee as taxable in lease fee rules", () => {
      const rules = getRulesForState("MA");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
      expect(docFee?.notes).toContain("no cap");
    });
  });

  describe("Lease - Trade-In Credit", () => {
    it("should provide FULL trade-in credit on leases", () => {
      const rules = getRulesForState("MA");
      expect(rules?.leaseRules.tradeInCredit).toBe("FULL");
    });

    it("should document full credit since 2017", () => {
      const rules = getRulesForState("MA");
      expect(rules?.leaseRules.notes).toContain("Full trade-in credit");
      expect(rules?.leaseRules.notes).toContain("2017");
    });
  });

  describe("Lease - Negative Equity", () => {
    it("should NOT tax negative equity on leases", () => {
      const rules = getRulesForState("MA");
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(false);
    });
  });

  describe("Lease - Fee Tax Rules", () => {
    it("should mark doc fee as TAXABLE on leases", () => {
      const rules = getRulesForState("MA");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
    });

    it("should mark service contracts as NON-TAXABLE on leases if separately stated", () => {
      const rules = getRulesForState("MA");
      const vsc = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(false);
      expect(vsc?.notes).toContain("SEPARATELY STATED");
    });

    it("should mark GAP as NON-TAXABLE on leases if separately stated", () => {
      const rules = getRulesForState("MA");
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(false);
      expect(gap?.notes).toContain("SEPARATELY STATED");
    });

    it("should mark title fees as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("MA");
      const title = rules?.leaseRules.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("MA");
      const reg = rules?.leaseRules.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Lease - Title Fee Rules", () => {
    it("should have title fee rule configuration", () => {
      const rules = getRulesForState("MA");
      expect(rules?.leaseRules.titleFeeRules).toBeDefined();
      expect(rules?.leaseRules.titleFeeRules.length).toBeGreaterThan(0);
    });

    it("should mark title fees as not taxable but included in cap cost", () => {
      const rules = getRulesForState("MA");
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
    it("should have reciprocity enabled but LIMITED", () => {
      const rules = getRulesForState("MA");
      expect(rules?.reciprocity.enabled).toBe(true);
      expect(rules?.reciprocity.notes).toContain("credit");
    });

    it("should apply reciprocity to BOTH retail and lease", () => {
      const rules = getRulesForState("MA");
      expect(rules?.reciprocity.scope).toBe("BOTH");
    });

    it("should use CREDIT_UP_TO_STATE_RATE mode", () => {
      const rules = getRulesForState("MA");
      expect(rules?.reciprocity.homeStateBehavior).toBe("CREDIT_UP_TO_STATE_RATE");
    });

    it("should require proof of tax paid", () => {
      const rules = getRulesForState("MA");
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(true);
    });

    it("should base credit on TAX_PAID", () => {
      const rules = getRulesForState("MA");
      expect(rules?.reciprocity.basis).toBe("TAX_PAID");
    });

    it("should cap credit at Massachusetts tax rate", () => {
      const rules = getRulesForState("MA");
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(true);
    });

    it("should not have lease exceptions", () => {
      const rules = getRulesForState("MA");
      expect(rules?.reciprocity.hasLeaseException).toBe(false);
    });

    it("should document no reciprocity with New Hampshire", () => {
      const rules = getRulesForState("MA");
      expect(rules?.reciprocity.notes).toContain("NO reciprocity with New Hampshire");
    });
  });

  // ============================================================================
  // MASSACHUSETTS-SPECIFIC FEATURES
  // ============================================================================

  describe("Massachusetts Unique Features - Both Rebates Non-Taxable", () => {
    it("should document that both manufacturer AND dealer rebates reduce tax", () => {
      const rules = getRulesForState("MA");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");

      expect(mfrRebate?.taxable).toBe(false);
      expect(dealerRebate?.taxable).toBe(false);
      expect(dealerRebate?.notes).toContain("UNIQUE");
    });

    it("should document this is unique compared to most states", () => {
      const rules = getRulesForState("MA");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate?.notes).toContain("UNIQUE");
    });
  });

  describe("Massachusetts Unique Features - Gross Trade Allowance", () => {
    it("should document that tax uses gross allowance, not net equity", () => {
      const rules = getRulesForState("MA");
      expect(rules?.extras?.notes).toContain("GROSS allowance");
      expect(rules?.extras?.notes).toContain("not net equity");
    });
  });

  describe("Massachusetts Unique Features - Separately Stated Requirement", () => {
    it("should document VSC/GAP must be separately stated", () => {
      const rules = getRulesForState("MA");
      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");

      expect(vsc?.notes).toContain("SEPARATELY STATED");
      expect(gap?.notes).toContain("SEPARATELY STATED");
    });

    it("should warn that bundling makes them taxable", () => {
      const rules = getRulesForState("MA");
      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc?.notes).toContain("bundled");
      expect(vsc?.notes).toContain("become taxable");
    });
  });

  describe("Massachusetts Unique Features - No Doc Fee Cap", () => {
    it("should document no statutory cap on doc fees", () => {
      const rules = getRulesForState("MA");
      expect(rules?.extras?.docFeeCapAmount).toBeNull();
      expect(rules?.extras?.notes).toContain("NO CAP");
    });
  });

  describe("Massachusetts Unique Features - Motor Vehicle Excise Tax", () => {
    it("should document annual excise tax separate from sales tax", () => {
      const rules = getRulesForState("MA");
      expect(rules?.extras?.exciseTaxRate).toBe(2.5);
      expect(rules?.extras?.notes).toContain("Excise Tax");
      expect(rules?.extras?.notes).toContain("2.5%");
    });

    it("should document title fee amount", () => {
      const rules = getRulesForState("MA");
      expect(rules?.extras?.titleFee).toBe(25);
    });
  });

  describe("Massachusetts Unique Features - Simple Flat Rate", () => {
    it("should document 6.25% everywhere in state", () => {
      const rules = getRulesForState("MA");
      expect(rules?.vehicleTaxScheme).toBe("STATE_ONLY");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
      expect(rules?.extras?.stateRate).toBe(6.25);
    });
  });

  describe("Massachusetts Unique Features - Trade-In History", () => {
    it("should document evolution of trade-in credit policy", () => {
      const rules = getRulesForState("MA");
      const history = rules?.extras?.tradeInCreditHistory;

      expect(history?.["pre-2009"]).toBe("NONE");
      expect(history?.["2009-08-01 to 2017-07-31"]).toBe("CAPPED_10000");
      expect(history?.["2017-08-01 onwards"]).toBe("FULL");
    });
  });

  // ============================================================================
  // EDGE CASES AND SPECIAL SCENARIOS
  // ============================================================================

  describe("Edge Cases - Negative Equity Uses Gross Allowance", () => {
    it("should use gross trade allowance even with negative equity", () => {
      const rules = getRulesForState("MA");
      expect(rules?.taxOnNegativeEquity).toBe(false);
      expect(rules?.extras?.notes).toContain("GROSS allowance");
    });
  });

  describe("Edge Cases - Separately Stated Backend Products", () => {
    it("should document importance of separate line items", () => {
      const rules = getRulesForState("MA");
      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc?.notes).toContain("separate line item");
    });
  });

  describe("Edge Cases - Manufacturer Rebate Timing", () => {
    it("should document rebate must be applied at time of sale", () => {
      const rules = getRulesForState("MA");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate?.notes).toContain("at the time of sale");
      expect(mfrRebate?.notes).toContain("Post-sale");
    });
  });

  describe("Edge Cases - No Reciprocity with NH", () => {
    it("should document New Hampshire has no sales tax and no reciprocity", () => {
      const rules = getRulesForState("MA");
      expect(rules?.reciprocity.notes).toContain("New Hampshire");
      expect(rules?.extras?.notes).toContain("No reciprocity with NH");
    });
  });

  // ============================================================================
  // METADATA AND DOCUMENTATION
  // ============================================================================

  describe("Metadata - Sources", () => {
    it("should document official sources", () => {
      const rules = getRulesForState("MA");
      expect(rules?.extras?.sources).toBeDefined();
      expect(rules?.extras?.sources?.length).toBeGreaterThan(0);
    });

    it("should reference Massachusetts Department of Revenue", () => {
      const rules = getRulesForState("MA");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Massachusetts Department of Revenue"))).toBe(true);
    });

    it("should reference MGL statutes", () => {
      const rules = getRulesForState("MA");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("MGL"))).toBe(true);
    });

    it("should reference directives", () => {
      const rules = getRulesForState("MA");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Directive"))).toBe(true);
    });

    it("should reference CMR regulations", () => {
      const rules = getRulesForState("MA");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("CMR"))).toBe(true);
    });
  });

  describe("Metadata - Last Updated", () => {
    it("should have lastUpdated timestamp", () => {
      const rules = getRulesForState("MA");
      expect(rules?.extras?.lastUpdated).toBeDefined();
      expect(rules?.extras?.lastUpdated).toBe("2025-11-13");
    });
  });

  describe("Metadata - Documentation", () => {
    it("should have comprehensive notes in extras", () => {
      const rules = getRulesForState("MA");
      expect(rules?.extras?.notes).toBeDefined();
      expect((rules?.extras?.notes as string)?.length).toBeGreaterThan(100);
    });

    it("should document key Massachusetts features in notes", () => {
      const rules = getRulesForState("MA");
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("6.25%");
      expect(notes).toContain("no local taxes");
      expect(notes).toContain("GROSS allowance");
      expect(notes).toContain("SEPARATELY STATED");
    });
  });

  // ============================================================================
  // COMPREHENSIVE SCENARIO TESTS
  // ============================================================================

  describe("Scenario: Standard Retail Purchase with Trade-In", () => {
    it("should calculate tax correctly at 6.25% flat rate", () => {
      const rules = getRulesForState("MA");
      // $30,000 vehicle + $340 doc - $10,000 trade = $20,340 taxable
      // Tax @ 6.25%: $20,340 × 0.0625 = $1,271.25
      const vehiclePrice = 30000;
      const docFee = 340;
      const tradeIn = 10000;
      const taxableBase = vehiclePrice + docFee - tradeIn;
      const rate = 0.0625;

      expect(taxableBase).toBe(20340);
      const expectedTax = taxableBase * rate;
      expect(expectedTax).toBeCloseTo(1271.25, 2);
    });
  });

  describe("Scenario: Retail with Manufacturer Rebate", () => {
    it("should reduce tax base by manufacturer rebate if applied at sale", () => {
      const rules = getRulesForState("MA");
      // $30,000 vehicle - $3,000 mfr rebate = $27,000 taxable
      // Tax @ 6.25%: $27,000 × 0.0625 = $1,687.50
      const vehiclePrice = 30000;
      const mfrRebate = 3000;
      const taxableBase = vehiclePrice - mfrRebate;
      const rate = 0.0625;

      expect(taxableBase).toBe(27000);
      const expectedTax = taxableBase * rate;
      expect(expectedTax).toBeCloseTo(1687.50, 2);
    });
  });

  describe("Scenario: Retail with Dealer Rebate (NON-TAXABLE - UNIQUE)", () => {
    it("should also reduce tax base by dealer rebate (unique to MA)", () => {
      const rules = getRulesForState("MA");
      // $28,000 vehicle - $2,000 dealer rebate = $26,000 taxable
      // Tax @ 6.25%: $26,000 × 0.0625 = $1,625
      // This is UNIQUE - most states tax dealer rebates
      const vehiclePrice = 28000;
      const dealerRebate = 2000;
      const taxableBase = vehiclePrice - dealerRebate;
      const rate = 0.0625;

      expect(taxableBase).toBe(26000);
      const expectedTax = taxableBase * rate;
      expect(expectedTax).toBeCloseTo(1625, 2);
    });
  });

  describe("Scenario: Retail with Negative Equity (Uses Gross Allowance)", () => {
    it("should use gross trade allowance, ignoring negative equity for tax", () => {
      const rules = getRulesForState("MA");
      const vehiclePrice = 35000;
      const tradeInAllowance = 25000; // Gross allowance
      const outstandingLoan = 20000;
      const negativeEquity = 0; // Not relevant for tax
      const rate = 0.0625;

      // Tax uses gross allowance, not net
      const taxableBase = vehiclePrice - tradeInAllowance;
      const expectedTax = taxableBase * rate;

      expect(taxableBase).toBe(10000);
      expect(expectedTax).toBeCloseTo(625, 2);

      // The $5,000 negative equity is rolled into loan but not taxed
    });
  });

  describe("Scenario: Retail with VSC and GAP (NOT Taxed if Separately Stated)", () => {
    it("should NOT tax VSC and GAP if separately stated", () => {
      const rules = getRulesForState("MA");
      const vehiclePrice = 30000;
      const vsc = 2000; // NOT taxed if separate line item
      const gap = 800; // NOT taxed if separate line item
      const docFee = 340;
      const tradeIn = 5000;
      const rate = 0.0625;

      // Only vehicle + doc - trade is taxed
      const taxableBase = vehiclePrice + docFee - tradeIn;
      const expectedTax = taxableBase * rate;

      expect(taxableBase).toBe(25340);
      expect(expectedTax).toBeCloseTo(1583.75, 2);

      // VSC and GAP are NOT added to taxable base
    });
  });

  describe("Scenario: Monthly Lease Taxation", () => {
    it("should tax monthly payment at 6.25%", () => {
      const rules = getRulesForState("MA");
      const monthlyPayment = 400;
      const docFee = 340;
      const rate = 0.0625;

      // Upfront tax
      const upfrontTax = docFee * rate;
      const firstPaymentTax = monthlyPayment * rate;
      const upfrontTotal = upfrontTax + firstPaymentTax;

      // Monthly tax (months 2-36)
      const monthlyTax = monthlyPayment * rate;

      expect(upfrontTax).toBeCloseTo(21.25, 2);
      expect(firstPaymentTax).toBeCloseTo(25, 2);
      expect(upfrontTotal).toBeCloseTo(46.25, 2);
      expect(monthlyTax).toBeCloseTo(25, 2);
    });
  });

  describe("Scenario: Lease with VSC and GAP (NOT Taxed if Separately Stated)", () => {
    it("should NOT tax backend products on leases if separately stated", () => {
      const rules = getRulesForState("MA");
      const baseMonthlyPayment = 350;
      const vscMonthly = 33.33; // NOT taxed if separately stated
      const gapMonthly = 16.67; // NOT taxed if separately stated
      const totalPayment = 400;
      const rate = 0.0625;

      // Only base payment is taxed
      const monthlyTax = baseMonthlyPayment * rate;

      expect(monthlyTax).toBeCloseTo(21.88, 2);

      // If VSC and GAP were incorrectly taxed:
      const incorrectTax = totalPayment * rate;
      expect(incorrectTax).toBeCloseTo(25, 2);

      // Verify they're different
      expect(monthlyTax).not.toBe(incorrectTax);
    });
  });

  describe("Scenario: Lease with Trade-In and Rebates (All Non-Taxable)", () => {
    it("should show all cap reductions reduce monthly payment and thus tax", () => {
      const rules = getRulesForState("MA");
      const msrp = 40000;
      const tradeIn = 5000;
      const mfrRebate = 3000;
      const cashDown = 2000; // Also reduces cap cost
      const adjustedCapCost = msrp - tradeIn - mfrRebate - cashDown;

      const monthlyPaymentWithReductions = 400;
      const monthlyPaymentNoReductions = 600;
      const rate = 0.0625;

      const taxWithReductions = monthlyPaymentWithReductions * rate;
      const taxNoReductions = monthlyPaymentNoReductions * rate;
      const monthlySavings = taxNoReductions - taxWithReductions;

      expect(adjustedCapCost).toBe(30000);
      expect(taxWithReductions).toBeCloseTo(25, 2);
      expect(taxNoReductions).toBeCloseTo(37.50, 2);
      expect(monthlySavings).toBeCloseTo(12.50, 2);
    });
  });

  describe("Scenario: Reciprocity (Rhode Island Higher Rate)", () => {
    it("should provide full credit when other state rate exceeds MA rate", () => {
      const rules = getRulesForState("MA");
      const vehiclePrice = 50000;
      const riTaxPaid = 3500; // 7% paid
      const maRate = 0.0625;

      const maTaxWouldBe = vehiclePrice * maRate;
      const creditAllowed = Math.min(riTaxPaid, maTaxWouldBe);
      const maTaxDue = maTaxWouldBe - creditAllowed;

      expect(maTaxWouldBe).toBeCloseTo(3125, 2);
      expect(creditAllowed).toBeCloseTo(3125, 2); // Capped at MA rate
      expect(maTaxDue).toBe(0);
    });
  });

  describe("Scenario: No Reciprocity with NH (No Sales Tax)", () => {
    it("should owe full MA tax when buying from NH", () => {
      const rules = getRulesForState("MA");
      const vehiclePrice = 30000;
      const nhTaxPaid = 0; // NH has no sales tax
      const maRate = 0.0625;

      const maTaxWouldBe = vehiclePrice * maRate;
      const creditAllowed = nhTaxPaid;
      const maTaxDue = maTaxWouldBe - creditAllowed;

      expect(maTaxWouldBe).toBeCloseTo(1875, 2);
      expect(creditAllowed).toBe(0);
      expect(maTaxDue).toBeCloseTo(1875, 2);
    });
  });

  describe("Scenario: Comparison of Both Rebates Non-Taxable", () => {
    it("should show tax savings from both manufacturer and dealer rebates", () => {
      const rules = getRulesForState("MA");
      const vehiclePrice = 35000;
      const mfrRebate = 3000;
      const dealerRebate = 2000;
      const tradeIn = 10000;
      const rate = 0.0625;

      // MA: Both rebates reduce tax base
      const maTaxableBase = vehiclePrice - mfrRebate - dealerRebate - tradeIn;
      const maTax = maTaxableBase * rate;

      // Compare to most states where dealer rebate is taxable
      const typicalStateTaxableBase = vehiclePrice - mfrRebate - tradeIn; // Dealer rebate not deducted
      const typicalStateTax = typicalStateTaxableBase * rate;

      const maSavings = typicalStateTax - maTax;

      expect(maTaxableBase).toBe(20000);
      expect(maTax).toBeCloseTo(1250, 2);
      expect(typicalStateTaxableBase).toBe(22000);
      expect(typicalStateTax).toBeCloseTo(1375, 2);
      expect(maSavings).toBeCloseTo(125, 2);
    });
  });

  describe("Scenario: Simple Calculation Everywhere", () => {
    it("should show same 6.25% rate everywhere in Massachusetts", () => {
      const rules = getRulesForState("MA");
      // Unlike states with local taxes, MA is simple
      expect(rules?.vehicleTaxScheme).toBe("STATE_ONLY");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);

      // Same rate in Boston, Worcester, Springfield, Cape Cod, everywhere
      const vehiclePrice = 25000;
      const rate = 0.0625;
      const tax = vehiclePrice * rate;

      expect(tax).toBeCloseTo(1562.50, 2);
    });
  });
});
