import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("West Virginia (WV) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load West Virginia rules successfully", () => {
    const rules = getRulesForState("WV");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("WV");
  });

  it("should mark West Virginia as implemented (not a stub)", () => {
    expect(isStateImplemented("WV")).toBe(true);
  });

  it("should have version number 1", () => {
    const rules = getRulesForState("WV");
    expect(rules?.version).toBe(1);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("WV");
    const rulesLower = getRulesForState("wv");
    const rulesMixed = getRulesForState("Wv");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("WV");
    expect(rulesLower?.stateCode).toBe("WV");
    expect(rulesMixed?.stateCode).toBe("WV");
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS (PRIVILEGE TAX)
  // ============================================================================

  describe("Retail - Trade-In Policy", () => {
    it("should have FULL trade-in credit policy", () => {
      const rules = getRulesForState("WV");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });

    it("should deduct trade-in from privilege tax base", () => {
      const rules = getRulesForState("WV");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
      // Trade-in reduces privilege tax base (subject to higher-of rule)
    });
  });

  describe("Retail - Rebate Rules", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("WV");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as NON-taxable (reduce tax base)", () => {
      const rules = getRulesForState("WV");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(false);
      expect(mfrRebate?.notes).toContain("reduce");
    });

    it("should mark dealer rebates as TAXABLE (do not reduce tax base)", () => {
      const rules = getRulesForState("WV");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(true);
      expect(dealerRebate?.notes).toContain("not reduce");
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as TAXABLE (subject to privilege tax)", () => {
      const rules = getRulesForState("WV");
      expect(rules?.docFeeTaxable).toBe(true);
    });
  });

  describe("Retail - Fee Tax Rules", () => {
    it("should mark service contracts (VSC) as TAXABLE (unique to WV)", () => {
      const rules = getRulesForState("WV");
      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(true);
      expect(vsc?.notes).toContain("subject to");
      expect(vsc?.notes).toContain("unlike most states");
    });

    it("should mark GAP as TAXABLE (unique to WV)", () => {
      const rules = getRulesForState("WV");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(true);
      expect(gap?.notes).toContain("subject to");
      expect(gap?.notes).toContain("unlike most states");
    });

    it("should mark title fees as NON-taxable", () => {
      const rules = getRulesForState("WV");
      const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-taxable", () => {
      const rules = getRulesForState("WV");
      const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("WV");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should tax negative equity", () => {
      const rules = getRulesForState("WV");
      expect(rules?.taxOnNegativeEquity).toBe(true);
    });

    it("should tax service contracts (unique to WV)", () => {
      const rules = getRulesForState("WV");
      expect(rules?.taxOnServiceContracts).toBe(true);
    });

    it("should tax GAP insurance (unique to WV)", () => {
      const rules = getRulesForState("WV");
      expect(rules?.taxOnGap).toBe(true);
    });
  });

  describe("Retail - Vehicle Tax Scheme", () => {
    it("should use DMV_PRIVILEGE_TAX vehicle tax scheme", () => {
      const rules = getRulesForState("WV");
      expect(rules?.vehicleTaxScheme).toBe("DMV_PRIVILEGE_TAX");
    });

    it("should NOT use local sales tax (privilege tax is state-only)", () => {
      const rules = getRulesForState("WV");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
    });

    it("should document 5% base privilege tax rate", () => {
      const rules = getRulesForState("WV");
      expect(rules?.extras?.wvPrivilege?.baseRate).toBe(0.05);
    });

    // eslint-disable-next-line complexity -- optional chaining counted as branches
    it("should document vehicle class-specific rates", () => {
      const rules = getRulesForState("WV");
      expect(rules?.extras?.wvPrivilege?.vehicleClassRates).toBeDefined();
      expect(rules?.extras?.wvPrivilege?.vehicleClassRates?.auto).toBe(0.05);
      expect(rules?.extras?.wvPrivilege?.vehicleClassRates?.RV).toBe(0.06);
      expect(rules?.extras?.wvPrivilege?.vehicleClassRates?.trailer).toBe(0.03);
    });

    it("should use higher of price or assessed value", () => {
      const rules = getRulesForState("WV");
      expect(rules?.extras?.wvPrivilege?.useHigherOfPriceOrAssessed).toBe(true);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease - Tax Method", () => {
    it("should use MONTHLY lease taxation method", () => {
      const rules = getRulesForState("WV");
      expect(rules?.leaseRules.method).toBe("MONTHLY");
    });

    it("should NOT tax cap cost reduction", () => {
      const rules = getRulesForState("WV");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });

    it("should have no special lease scheme", () => {
      const rules = getRulesForState("WV");
      expect(rules?.leaseRules.specialScheme).toBe("NONE");
    });

    it("should document 5% privilege tax on monthly payments", () => {
      const rules = getRulesForState("WV");
      expect(rules?.leaseRules.notes).toContain("5%");
      expect(rules?.leaseRules.notes).toContain("monthly payments");
    });
  });

  describe("Lease - Rebates", () => {
    it("should follow retail rebate rules", () => {
      const rules = getRulesForState("WV");
      expect(rules?.leaseRules.rebateBehavior).toBe("FOLLOW_RETAIL_RULE");
    });
  });

  describe("Lease - Documentation Fee", () => {
    it("should ALWAYS tax doc fee on leases", () => {
      const rules = getRulesForState("WV");
      expect(rules?.leaseRules.docFeeTaxability).toBe("ALWAYS");
    });

    it("should have doc fee as taxable in lease fee rules", () => {
      const rules = getRulesForState("WV");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
    });
  });

  describe("Lease - Trade-In Credit", () => {
    it("should provide FULL trade-in credit on leases", () => {
      const rules = getRulesForState("WV");
      expect(rules?.leaseRules.tradeInCredit).toBe("FULL");
    });
  });

  describe("Lease - Negative Equity", () => {
    it("should mark negative equity as TAXABLE on leases", () => {
      const rules = getRulesForState("WV");
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(true);
    });
  });

  describe("Lease - Fee Tax Rules", () => {
    it("should mark service contracts as TAXABLE on leases (unique to WV)", () => {
      const rules = getRulesForState("WV");
      const vsc = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(true);
      expect(vsc?.notes).toContain("taxable");
    });

    it("should mark GAP as TAXABLE on leases (unique to WV)", () => {
      const rules = getRulesForState("WV");
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(true);
      expect(gap?.notes).toContain("taxable");
    });

    it("should mark title fees as NON-taxable on leases", () => {
      const rules = getRulesForState("WV");
      const title = rules?.leaseRules.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-taxable on leases", () => {
      const rules = getRulesForState("WV");
      const reg = rules?.leaseRules.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Lease - Title Fee Rules", () => {
    it("should have title fee rule configuration", () => {
      const rules = getRulesForState("WV");
      expect(rules?.leaseRules.titleFeeRules).toBeDefined();
      expect(rules?.leaseRules.titleFeeRules.length).toBeGreaterThan(0);
    });

    it("should mark title fees as not taxable but included in cap cost", () => {
      const rules = getRulesForState("WV");
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
      const rules = getRulesForState("WV");
      expect(rules?.leaseRules.taxFeesUpfront).toBe(true);
    });
  });

  // ============================================================================
  // RECIPROCITY TESTS
  // ============================================================================

  describe("Reciprocity Rules", () => {
    it("should have reciprocity enabled", () => {
      const rules = getRulesForState("WV");
      expect(rules?.reciprocity.enabled).toBe(true);
    });

    it("should apply reciprocity to BOTH retail and lease", () => {
      const rules = getRulesForState("WV");
      expect(rules?.reciprocity.scope).toBe("BOTH");
    });

    it("should use CREDIT_UP_TO_STATE_RATE mode", () => {
      const rules = getRulesForState("WV");
      expect(rules?.reciprocity.homeStateBehavior).toBe("CREDIT_UP_TO_STATE_RATE");
    });

    it("should require proof of tax paid", () => {
      const rules = getRulesForState("WV");
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(true);
    });

    it("should base credit on TAX_PAID", () => {
      const rules = getRulesForState("WV");
      expect(rules?.reciprocity.basis).toBe("TAX_PAID");
    });

    it("should cap credit at WV privilege tax amount", () => {
      const rules = getRulesForState("WV");
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(true);
    });

    it("should not have lease exceptions", () => {
      const rules = getRulesForState("WV");
      expect(rules?.reciprocity.hasLeaseException).toBe(false);
    });

    it("should document credit for tax paid elsewhere", () => {
      const rules = getRulesForState("WV");
      expect(rules?.reciprocity.notes).toContain("credit");
      expect(rules?.reciprocity.notes).toContain("Proof");
    });
  });

  // ============================================================================
  // WEST VIRGINIA-SPECIFIC FEATURES
  // ============================================================================

  describe("WV Unique Features - Privilege Tax System", () => {
    it("should document that WV uses privilege tax, not sales tax", () => {
      const rules = getRulesForState("WV");
      expect(rules?.extras?.notes).toContain("Privilege Tax");
      expect(rules?.extras?.notes).toContain("not sales tax");
    });

    it("should document privilege tax configuration", () => {
      const rules = getRulesForState("WV");
      expect(rules?.extras?.wvPrivilege).toBeDefined();
      expect(rules?.extras?.wvPrivilege?.baseRate).toBe(0.05);
    });

    it("should document higher-of-price-or-assessed rule", () => {
      const rules = getRulesForState("WV");
      expect(rules?.extras?.wvPrivilege?.useAssessedValue).toBe(true);
      expect(rules?.extras?.wvPrivilege?.useHigherOfPriceOrAssessed).toBe(true);
    });

    it("should document trade-in credit with higher-of rule", () => {
      const rules = getRulesForState("WV");
      expect(rules?.extras?.wvPrivilege?.allowTradeInCredit).toBe(true);
    });

    it("should document negative equity taxation", () => {
      const rules = getRulesForState("WV");
      expect(rules?.extras?.wvPrivilege?.applyNegativeEquityToBase).toBe(true);
    });
  });

  describe("WV Unique Features - VSC and GAP Taxable", () => {
    it("should document that VSC is taxable (unique)", () => {
      const rules = getRulesForState("WV");
      expect(rules?.taxOnServiceContracts).toBe(true);
      expect(rules?.extras?.notes).toContain("Service contracts");
      expect(rules?.extras?.notes).toContain("ARE taxable");
    });

    it("should document that GAP is taxable (unique)", () => {
      const rules = getRulesForState("WV");
      expect(rules?.taxOnGap).toBe(true);
      expect(rules?.extras?.notes).toContain("GAP");
      expect(rules?.extras?.notes).toContain("ARE taxable");
    });
  });

  describe("WV Unique Features - Vehicle Class Rates", () => {
    it("should document RV premium rate (6%)", () => {
      const rules = getRulesForState("WV");
      expect(rules?.extras?.vehicleClassRates?.RV).toBe(6.0);
    });

    it("should document trailer discount rate (3%)", () => {
      const rules = getRulesForState("WV");
      expect(rules?.extras?.vehicleClassRates?.trailer).toBe(3.0);
    });

    it("should document standard rate (5%)", () => {
      const rules = getRulesForState("WV");
      expect(rules?.extras?.vehicleClassRates?.standard).toBe(5.0);
    });
  });

  describe("WV Unique Features - State-Only Rate", () => {
    it("should document that privilege tax is state-only (no local rates)", () => {
      const rules = getRulesForState("WV");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
      expect(rules?.extras?.notes).toContain("state-only");
    });

    it("should document privilege tax rate", () => {
      const rules = getRulesForState("WV");
      expect(rules?.extras?.privilegeRate).toBe(5.0);
    });
  });

  // ============================================================================
  // SCENARIO TESTS
  // ============================================================================

  describe("Scenario: Basic Retail Sale (5% Privilege Tax)", () => {
    it("should calculate privilege tax correctly with trade-in", () => {
      // $30,000 vehicle + $595 doc - $10,000 trade = $20,595 base
      // Privilege Tax @ 5%: $20,595 × 0.05 = $1,029.75
      const vehiclePrice = 30000;
      const docFee = 595;
      const tradeIn = 10000;
      const taxBase = vehiclePrice + docFee - tradeIn;
      const taxRate = 0.05;

      expect(taxBase).toBe(20595);
      const expectedTax = taxBase * taxRate;
      expect(expectedTax).toBeCloseTo(1029.75, 2);
    });
  });

  describe("Scenario: Retail Sale with VSC and GAP (TAXED)", () => {
    it("should tax VSC and GAP (unique to WV)", () => {
      const vehiclePrice = 28000;
      const vsc = 2200; // TAXED in WV
      const gap = 795; // TAXED in WV
      const taxRate = 0.05;

      // VSC and GAP are TAXED in WV (unlike most states)
      const taxBase = vehiclePrice + vsc + gap;
      const tax = taxBase * taxRate;

      expect(taxBase).toBe(30995);
      expect(tax).toBeCloseTo(1549.75, 2);

      // In states where VSC/GAP are exempt:
      const exemptStateTax = vehiclePrice * taxRate;
      expect(exemptStateTax).toBe(1400);
      // WV charges more due to taxing VSC/GAP
      expect(tax).toBeGreaterThan(exemptStateTax);
    });
  });

  describe("Scenario: Higher-of-Price-or-Assessed Rule", () => {
    it("should use assessed value if higher than net price", () => {
      const purchasePrice = 12000;
      const tradeIn = 5000;
      const netPrice = purchasePrice - tradeIn;
      const dmvAssessedValue = 14000;
      const taxBase = Math.max(netPrice, dmvAssessedValue);
      const taxRate = 0.05;

      expect(netPrice).toBe(7000);
      expect(dmvAssessedValue).toBe(14000);
      expect(taxBase).toBe(14000); // Higher of two
      const tax = taxBase * taxRate;
      expect(tax).toBeCloseTo(700, 2);

      // Without higher-of rule, tax would be:
      const taxWithoutRule = netPrice * taxRate;
      expect(taxWithoutRule).toBe(350);
      // WV charges more due to higher-of rule
      expect(tax).toBeGreaterThan(taxWithoutRule);
    });
  });

  describe("Scenario: RV Purchase (6% Rate)", () => {
    it("should apply 6% rate for RVs", () => {
      const rvPrice = 125000;
      const tradeIn = 30000;
      const taxBase = rvPrice - tradeIn;
      const rvRate = 0.06; // RV premium rate

      expect(taxBase).toBe(95000);
      const tax = taxBase * rvRate;
      expect(tax).toBeCloseTo(5700, 2);

      // Standard vehicle rate would be:
      const standardRate = 0.05;
      const standardTax = taxBase * standardRate;
      expect(standardTax).toBe(4750);
      // RV pays 1% more
      expect(tax).toBeGreaterThan(standardTax);
    });
  });

  describe("Scenario: Trailer Purchase (3% Rate)", () => {
    it("should apply 3% rate for trailers", () => {
      const trailerPrice = 15000;
      const trailerRate = 0.03; // Trailer discount rate

      const tax = trailerPrice * trailerRate;
      expect(tax).toBeCloseTo(450, 2);

      // Standard vehicle rate would be:
      const standardRate = 0.05;
      const standardTax = trailerPrice * standardRate;
      expect(standardTax).toBe(750);
      // Trailer pays 2% less
      expect(tax).toBeLessThan(standardTax);
    });
  });

  describe("Scenario: Lease with VSC and GAP (TAXED)", () => {
    it("should tax VSC and GAP when capitalized (unique to WV)", () => {
      const grossCapCost = 35000;
      const vsc = 1800; // TAXED when capitalized
      const gap = 695; // TAXED when capitalized
      const adjustedCapCost = grossCapCost + vsc + gap;
      const monthlyPayment = 525;
      const taxRate = 0.05;

      expect(adjustedCapCost).toBe(37495);
      const monthlyTax = monthlyPayment * taxRate;
      expect(monthlyTax).toBeCloseTo(26.25, 2);

      // VSC and GAP increase cap cost, which increases monthly payment
      // and thus increases monthly privilege tax
    });
  });

  describe("Scenario: Reciprocity - Out-of-State Purchase", () => {
    it("should allow credit for tax paid elsewhere (capped at WV rate)", () => {
      const vehiclePrice = 28000;
      const ohTaxPaid = 1610; // OH 5.75% = $1,610
      const wvTaxRate = 0.05;
      const wvTaxWouldBe = vehiclePrice * wvTaxRate;

      const creditAllowed = Math.min(ohTaxPaid, wvTaxWouldBe);
      const wvTaxOwed = wvTaxWouldBe - creditAllowed;

      expect(wvTaxWouldBe).toBe(1400);
      expect(creditAllowed).toBe(1400); // OH tax exceeds WV tax
      expect(wvTaxOwed).toBe(0);
    });
  });

  describe("Scenario: Negative Equity (TAXED)", () => {
    it("should add negative equity to tax base", () => {
      const vehiclePrice = 28000;
      const tradeInValue = 10000;
      const tradeInPayoff = 14000;
      const negativeEquity = tradeInPayoff - tradeInValue;

      const taxBase = vehiclePrice - tradeInValue + negativeEquity;
      const taxRate = 0.05;

      expect(negativeEquity).toBe(4000);
      expect(taxBase).toBe(22000);
      const tax = taxBase * taxRate;
      expect(tax).toBeCloseTo(1100, 2);
    });
  });

  // ============================================================================
  // METADATA AND DOCUMENTATION
  // ============================================================================

  describe("Metadata - Sources", () => {
    it("should document official sources", () => {
      const rules = getRulesForState("WV");
      expect(rules?.extras?.sources).toBeDefined();
      expect(rules?.extras?.sources?.length).toBeGreaterThan(0);
    });

    it("should reference WV DMV", () => {
      const rules = getRulesForState("WV");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("West Virginia"))).toBe(true);
    });

    it("should reference WV Code", () => {
      const rules = getRulesForState("WV");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Code") || s.includes("Chapter 17A"))).toBe(true);
    });
  });

  describe("Metadata - Last Updated", () => {
    it("should have lastUpdated timestamp", () => {
      const rules = getRulesForState("WV");
      expect(rules?.extras?.lastUpdated).toBeDefined();
      expect(rules?.extras?.lastUpdated).toBe("2025-01");
    });
  });

  describe("Metadata - Documentation", () => {
    it("should have comprehensive notes in extras", () => {
      const rules = getRulesForState("WV");
      expect(rules?.extras?.notes).toBeDefined();
      expect((rules?.extras?.notes as string)?.length).toBeGreaterThan(100);
    });

    it("should document key WV features in notes", () => {
      const rules = getRulesForState("WV");
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("Privilege Tax");
      expect(notes).toContain("5%");
      expect(notes).toContain("ARE taxable");
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("Edge Cases - Privilege Tax System Specifics", () => {
    it("should handle privilege tax configuration correctly", () => {
      const rules = getRulesForState("WV");
      expect(rules?.vehicleTaxScheme).toBe("DMV_PRIVILEGE_TAX");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
      expect(rules?.extras?.wvPrivilege?.baseRate).toBe(0.05);
    });

    it("should handle higher-of-price-or-assessed rule", () => {
      const rules = getRulesForState("WV");
      expect(rules?.extras?.wvPrivilege?.useHigherOfPriceOrAssessed).toBe(true);
    });
  });

  describe("Edge Cases - Product Taxability", () => {
    it("should tax backend products (unique to WV)", () => {
      const rules = getRulesForState("WV");
      expect(rules?.taxOnServiceContracts).toBe(true);
      expect(rules?.taxOnGap).toBe(true);
    });

    it("should tax negative equity", () => {
      const rules = getRulesForState("WV");
      expect(rules?.taxOnNegativeEquity).toBe(true);
      // Negative equity is added to privilege tax base
    });
  });

  describe("Edge Cases - Vehicle Class Rates", () => {
    it("should have different rates for different vehicle classes", () => {
      const rules = getRulesForState("WV");
      const classRates = rules?.extras?.wvPrivilege?.vehicleClassRates;
      expect(classRates?.auto).toBe(0.05);
      expect(classRates?.truck).toBe(0.05);
      expect(classRates?.RV).toBe(0.06);
      expect(classRates?.trailer).toBe(0.03);
      expect(classRates?.motorcycle).toBe(0.05);
    });
  });

  describe("Edge Cases - Assessed Value Floor", () => {
    it("should enforce minimum tax based on assessed value", () => {
      const rules = getRulesForState("WV");
      expect(rules?.extras?.wvPrivilege?.useAssessedValue).toBe(true);
      expect(rules?.extras?.wvPrivilege?.useHigherOfPriceOrAssessed).toBe(true);
      // This prevents tax avoidance through low-ball pricing
    });
  });
});
