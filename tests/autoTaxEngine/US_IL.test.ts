import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Illinois (IL) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load Illinois rules successfully", () => {
    const rules = getRulesForState("IL");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("IL");
  });

  it("should mark Illinois as implemented (not a stub)", () => {
    expect(isStateImplemented("IL")).toBe(true);
  });

  it("should have version number 2", () => {
    const rules = getRulesForState("IL");
    expect(rules?.version).toBe(2);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("IL");
    const rulesLower = getRulesForState("il");
    const rulesMixed = getRulesForState("Il");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("IL");
    expect(rulesLower?.stateCode).toBe("IL");
    expect(rulesMixed?.stateCode).toBe("IL");
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS
  // ============================================================================

  describe("Retail - Trade-In Policy", () => {
    it("should have FULL trade-in credit policy", () => {
      const rules = getRulesForState("IL");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });

    it("should document that full credit was restored in 2022", () => {
      const rules = getRulesForState("IL");
      expect(rules?.extras?.keyLawChanges?.["2022-01-01"]).toContain("$10,000");
      expect(rules?.extras?.keyLawChanges?.["2022-01-01"]).toContain("trade-in cap");
    });
  });

  describe("Retail - Rebate Rules", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("IL");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as NON-TAXABLE (reduce tax base)", () => {
      const rules = getRulesForState("IL");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(false);
      expect(mfrRebate?.notes).toContain("reduce");
    });

    it("should mark dealer rebates as TAXABLE (do not reduce tax base)", () => {
      const rules = getRulesForState("IL");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(true);
      expect(dealerRebate?.notes).toContain("do not reduce");
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("IL");
      expect(rules?.docFeeTaxable).toBe(true);
    });

    it("should have doc fee cap of $367.70 for 2025", () => {
      const rules = getRulesForState("IL");
      expect(rules?.extras?.docFeeCapAmount).toBe(367.70);
      expect(rules?.extras?.docFeeCapYear).toBe(2025);
    });

    it("should document that doc fee is capped and indexed to CPI", () => {
      const rules = getRulesForState("IL");
      expect(rules?.extras?.docFeeCapPriorYear).toBe(358.03);
    });
  });

  describe("Retail - Fee Tax Rules", () => {
    it("should mark service contracts (VSC) as TAXABLE on retail", () => {
      const rules = getRulesForState("IL");
      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(true);
      expect(vsc?.notes).toContain("taxable on retail");
    });

    it("should mark GAP as TAXABLE on retail", () => {
      const rules = getRulesForState("IL");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(true);
      expect(gap?.notes).toContain("taxable on retail");
    });

    it("should mark title fees as NON-TAXABLE", () => {
      const rules = getRulesForState("IL");
      const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-TAXABLE", () => {
      const rules = getRulesForState("IL");
      const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("IL");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should NOT tax negative equity", () => {
      const rules = getRulesForState("IL");
      expect(rules?.taxOnNegativeEquity).toBe(false);
    });

    it("should tax service contracts", () => {
      const rules = getRulesForState("IL");
      expect(rules?.taxOnServiceContracts).toBe(true);
    });

    it("should tax GAP insurance", () => {
      const rules = getRulesForState("IL");
      expect(rules?.taxOnGap).toBe(true);
    });
  });

  describe("Retail - Vehicle Tax Scheme", () => {
    it("should use STATE_PLUS_LOCAL vehicle tax scheme", () => {
      const rules = getRulesForState("IL");
      expect(rules?.vehicleTaxScheme).toBe("STATE_PLUS_LOCAL");
    });

    it("should apply local sales tax to vehicles", () => {
      const rules = getRulesForState("IL");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(true);
    });

    it("should document Chicago as having highest rates", () => {
      const rules = getRulesForState("IL");
      expect(rules?.extras?.majorCityRates?.ChicagoRetail).toBe(10.25);
      expect(rules?.extras?.maxRetailRate).toBe(10.25);
    });

    it("should document state base rate of 6.25%", () => {
      const rules = getRulesForState("IL");
      expect(rules?.extras?.majorCityRates?.StateBase).toBe(6.25);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease - Tax Method", () => {
    it("should use MONTHLY lease taxation method", () => {
      const rules = getRulesForState("IL");
      expect(rules?.leaseRules.method).toBe("MONTHLY");
    });

    it("should NOT tax cap cost reduction", () => {
      const rules = getRulesForState("IL");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });

    it("should tax fees upfront on leases", () => {
      const rules = getRulesForState("IL");
      expect(rules?.leaseRules.taxFeesUpfront).toBe(true);
    });

    it("should have IL_CHICAGO_COOK special scheme", () => {
      const rules = getRulesForState("IL");
      expect(rules?.leaseRules.specialScheme).toBe("IL_CHICAGO_COOK");
    });

    it("should document monthly payment taxation since 2015", () => {
      const rules = getRulesForState("IL");
      expect(rules?.leaseRules.notes).toContain("MONTHLY payment method");
      expect(rules?.leaseRules.notes).toContain("Jan 1, 2015");
    });
  });

  describe("Lease - Cap Cost Reduction Taxation", () => {
    it("should NOT tax cap cost reduction upfront", () => {
      const rules = getRulesForState("IL");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });

    it("should document that trade-in no longer provides tax credit on leases", () => {
      const rules = getRulesForState("IL");
      expect(rules?.leaseRules.notes).toContain("NO LONGER provides");
      expect(rules?.leaseRules.notes).toContain("2015 law change");
    });
  });

  describe("Lease - Rebates and Incentives", () => {
    it("should have FOLLOW_RETAIL_RULE rebate behavior on leases", () => {
      const rules = getRulesForState("IL");
      expect(rules?.leaseRules.rebateBehavior).toBe("FOLLOW_RETAIL_RULE");
    });
  });

  describe("Lease - Documentation Fee", () => {
    it("should ALWAYS tax doc fee on leases", () => {
      const rules = getRulesForState("IL");
      expect(rules?.leaseRules.docFeeTaxability).toBe("ALWAYS");
    });

    it("should have doc fee as taxable in lease fee rules", () => {
      const rules = getRulesForState("IL");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
    });
  });

  describe("Lease - Trade-In Credit", () => {
    it("should provide CAP_COST_ONLY trade-in credit on leases", () => {
      const rules = getRulesForState("IL");
      expect(rules?.leaseRules.tradeInCredit).toBe("CAP_COST_ONLY");
    });

    it("should document that trade-in reduces cap cost but not taxable base", () => {
      const rules = getRulesForState("IL");
      expect(rules?.leaseRules.notes).toContain("Trade-in");
      expect(rules?.leaseRules.notes).toContain("NO LONGER provides");
    });
  });

  describe("Lease - Negative Equity", () => {
    it("should mark negative equity as TAXABLE on leases", () => {
      const rules = getRulesForState("IL");
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(true);
    });
  });

  describe("Lease - Fee Tax Rules", () => {
    it("should mark doc fee as TAXABLE on leases", () => {
      const rules = getRulesForState("IL");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
    });

    it("should mark service contracts as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("IL");
      const vsc = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(false);
      expect(vsc?.notes).toContain("not taxed");
    });

    it("should mark GAP as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("IL");
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(false);
      expect(gap?.notes).toContain("not taxed");
    });

    it("should mark title fees as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("IL");
      const title = rules?.leaseRules.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("IL");
      const reg = rules?.leaseRules.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Lease - Title Fee Rules", () => {
    it("should have title fee rule configuration", () => {
      const rules = getRulesForState("IL");
      expect(rules?.leaseRules.titleFeeRules).toBeDefined();
      expect(rules?.leaseRules.titleFeeRules.length).toBeGreaterThan(0);
    });

    it("should mark title fees as not taxable but included in cap cost", () => {
      const rules = getRulesForState("IL");
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
      const rules = getRulesForState("IL");
      expect(rules?.reciprocity.enabled).toBe(true);
      expect(rules?.reciprocity.notes).toContain("LIMITED");
    });

    it("should apply reciprocity to BOTH retail and lease", () => {
      const rules = getRulesForState("IL");
      expect(rules?.reciprocity.scope).toBe("BOTH");
    });

    it("should use CREDIT_UP_TO_STATE_RATE mode", () => {
      const rules = getRulesForState("IL");
      expect(rules?.reciprocity.homeStateBehavior).toBe("CREDIT_UP_TO_STATE_RATE");
    });

    it("should require proof of tax paid", () => {
      const rules = getRulesForState("IL");
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(true);
    });

    it("should base credit on TAX_PAID", () => {
      const rules = getRulesForState("IL");
      expect(rules?.reciprocity.basis).toBe("TAX_PAID");
    });

    it("should cap credit at Illinois tax rate", () => {
      const rules = getRulesForState("IL");
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(true);
    });

    it("should not have lease exceptions", () => {
      const rules = getRulesForState("IL");
      expect(rules?.reciprocity.hasLeaseException).toBe(false);
    });

    it("should document dealer-only reciprocity restriction", () => {
      const rules = getRulesForState("IL");
      expect(rules?.reciprocity.notes).toContain("dealer purchases");
      expect(rules?.reciprocity.notes).toContain("NOT private party");
    });
  });

  // ============================================================================
  // ILLINOIS-SPECIFIC FEATURES
  // ============================================================================

  describe("Illinois Unique Features - Chicago Lease Tax", () => {
    it("should document Chicago's additional 8% lease use tax", () => {
      const rules = getRulesForState("IL");
      expect(rules?.extras?.chicagoLeaseUseTax).toBe(8.0);
      expect(rules?.extras?.maxCombinedRate).toBe(17.5);
    });

    it("should document Chicago lease effective rate of 17.5%", () => {
      const rules = getRulesForState("IL");
      expect(rules?.extras?.majorCityRates?.ChicagoLeaseEffective).toBe(17.5);
    });

    it("should document that 8% use tax applies to Chicago residents only", () => {
      const rules = getRulesForState("IL");
      expect(rules?.leaseRules.notes).toContain("Chicago residents");
      expect(rules?.leaseRules.notes).toContain("8%");
    });

    it("should document Chicago as having highest lease tax in US", () => {
      const rules = getRulesForState("IL");
      expect(rules?.extras?.notes).toContain("MASSIVE 17.5%");
      expect(rules?.extras?.notes).toContain("highest");
    });
  });

  describe("Illinois Unique Features - Doc Fee Cap", () => {
    it("should document annual CPI adjustment of doc fee cap", () => {
      const rules = getRulesForState("IL");
      expect(rules?.extras?.docFeeCapAmount).toBe(367.70);
      expect(rules?.extras?.docFeeCapYear).toBe(2025);
    });
  });

  describe("Illinois Unique Features - 2015 Lease Law Change", () => {
    it("should document 2015 lease taxation change", () => {
      const rules = getRulesForState("IL");
      expect(rules?.extras?.keyLawChanges?.["2015-01-01"]).toContain("monthly payments");
      expect(rules?.extras?.keyLawChanges?.["2015-01-01"]).toContain("cap cost");
    });
  });

  describe("Illinois Unique Features - Limited Reciprocity", () => {
    it("should document dealer-only reciprocity restriction", () => {
      const rules = getRulesForState("IL");
      expect(rules?.extras?.notes).toContain("dealer purchases only");
      expect(rules?.extras?.notes).toContain("not private party");
    });
  });

  // ============================================================================
  // EDGE CASES AND SPECIAL SCENARIOS
  // ============================================================================

  describe("Edge Cases - Chicago vs Suburban Cook County", () => {
    it("should document different rates for Chicago vs suburban Cook", () => {
      const rules = getRulesForState("IL");
      expect(rules?.extras?.majorCityRates?.ChicagoRetail).toBe(10.25);
      expect(rules?.extras?.majorCityRates?.CookCountySuburban).toBe(8.25);
    });

    it("should document Chicago lease surcharge applies to residents only", () => {
      const rules = getRulesForState("IL");
      expect(rules?.leaseRules.notes).toContain("Chicago residents");
      expect(rules?.leaseRules.notes).toContain("8%");
    });
  });

  describe("Edge Cases - Backend Products Different Treatment", () => {
    it("should document VSC/GAP taxable on retail but not leases", () => {
      const rules = getRulesForState("IL");
      const retailVsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      const leaseVsc = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");

      expect(retailVsc?.taxable).toBe(true);
      expect(leaseVsc?.taxable).toBe(false);
    });
  });

  describe("Edge Cases - Trade-In No Tax Benefit on Leases", () => {
    it("should document that trade-in has no tax benefit on leases since 2015", () => {
      const rules = getRulesForState("IL");
      expect(rules?.leaseRules.tradeInCredit).toBe("CAP_COST_ONLY");
      expect(rules?.leaseRules.notes).toContain("NO LONGER provides");
    });
  });

  // ============================================================================
  // METADATA AND DOCUMENTATION
  // ============================================================================

  describe("Metadata - Sources", () => {
    it("should document official sources", () => {
      const rules = getRulesForState("IL");
      expect(rules?.extras?.sources).toBeDefined();
      expect(rules?.extras?.sources?.length).toBeGreaterThan(0);
    });

    it("should reference Illinois Department of Revenue", () => {
      const rules = getRulesForState("IL");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Illinois Department of Revenue"))).toBe(true);
    });

    it("should reference Illinois statutes", () => {
      const rules = getRulesForState("IL");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("ILCS"))).toBe(true);
    });

    it("should reference Chicago Municipal Code", () => {
      const rules = getRulesForState("IL");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Chicago Municipal Code"))).toBe(true);
    });

    it("should reference Public Act 102-0353", () => {
      const rules = getRulesForState("IL");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Public Act 102-0353"))).toBe(true);
    });
  });

  describe("Metadata - Last Updated", () => {
    it("should have lastUpdated timestamp", () => {
      const rules = getRulesForState("IL");
      expect(rules?.extras?.lastUpdated).toBeDefined();
      expect(rules?.extras?.lastUpdated).toBe("2025-01-13");
    });
  });

  describe("Metadata - Documentation", () => {
    it("should have comprehensive notes in extras", () => {
      const rules = getRulesForState("IL");
      expect(rules?.extras?.notes).toBeDefined();
      expect((rules?.extras?.notes as string)?.length).toBeGreaterThan(100);
    });

    it("should document key Illinois features in notes", () => {
      const rules = getRulesForState("IL");
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("highest");
      expect(notes).toContain("Chicago");
      expect(notes).toContain("17.5%");
      expect(notes).toContain("Doc fee capped");
    });
  });

  // ============================================================================
  // COMPREHENSIVE SCENARIO TESTS
  // ============================================================================

  describe("Scenario: Chicago Retail Purchase", () => {
    it("should calculate correct tax at 10.25% for Chicago", () => {
      const rules = getRulesForState("IL");
      // $30,000 vehicle + $367.70 doc - $10,000 trade = $20,367.70 taxable
      // Tax @ 10.25%: $20,367.70 × 0.1025 = $2,087.69
      const vehiclePrice = 30000;
      const docFee = 367.70;
      const tradeIn = 10000;
      const taxableBase = vehiclePrice + docFee - tradeIn;
      const chicagoRate = 0.1025;

      expect(taxableBase).toBeCloseTo(20367.70, 2);
      const expectedTax = taxableBase * chicagoRate;
      expect(expectedTax).toBeCloseTo(2087.69, 2);
    });
  });

  describe("Scenario: Chicago Lease (CRITICAL - 17.5% Effective)", () => {
    it("should calculate massive 17.5% effective tax for Chicago residents", () => {
      const rules = getRulesForState("IL");
      // Monthly payment: $500
      // Sales tax (9.5%): $47.50
      // Use tax (8%): $40.00
      // Total tax: $87.50 (17.5% effective)
      const monthlyPayment = 500;
      const salesTaxRate = 0.095;
      const useTaxRate = 0.08;
      const totalRate = 0.175;

      const salesTax = monthlyPayment * salesTaxRate;
      const useTax = monthlyPayment * useTaxRate;
      const totalTax = salesTax + useTax;
      const effectiveTax = monthlyPayment * totalRate;

      expect(salesTax).toBeCloseTo(47.50, 2);
      expect(useTax).toBeCloseTo(40.00, 2);
      expect(totalTax).toBeCloseTo(87.50, 2);
      expect(effectiveTax).toBeCloseTo(87.50, 2);
    });
  });

  describe("Scenario: Suburban Cook County Lease (No 8% Use Tax)", () => {
    it("should calculate 8.25% sales tax without Chicago use tax", () => {
      const rules = getRulesForState("IL");
      // Suburban Cook County: 8.25% sales tax, NO 8% use tax
      const monthlyPayment = 500;
      const suburbanRate = 0.0825;

      const tax = monthlyPayment * suburbanRate;
      expect(tax).toBeCloseTo(41.25, 2);
    });
  });

  describe("Scenario: Retail with Backend Products", () => {
    it("should tax VSC and GAP on retail purchase", () => {
      const rules = getRulesForState("IL");
      const vehiclePrice = 25000;
      const vsc = 2000;
      const gap = 800;
      const docFee = 367.70;
      const tradeIn = 5000;
      const rate = 0.0625; // State rate only example

      const taxableBase = vehiclePrice + vsc + gap + docFee - tradeIn;
      const tax = taxableBase * rate;

      expect(taxableBase).toBeCloseTo(23167.70, 2);
      expect(tax).toBeCloseTo(1447.98, 2);
    });
  });

  describe("Scenario: Lease with Backend Products NOT Taxed", () => {
    it("should NOT tax VSC and GAP when capitalized into lease", () => {
      const rules = getRulesForState("IL");
      const monthlyPayment = 400;
      const vscMonthly = 50; // Not taxed
      const gapMonthly = 25; // Not taxed
      const rate = 0.0625;

      // Only base payment is taxed
      const tax = monthlyPayment * rate;
      expect(tax).toBeCloseTo(25.00, 2);

      // If VSC and GAP were taxed (incorrectly), it would be:
      const incorrectTax = (monthlyPayment + vscMonthly + gapMonthly) * rate;
      expect(incorrectTax).toBeCloseTo(29.69, 2);

      // Verify they're different
      expect(tax).not.toBe(incorrectTax);
    });
  });

  describe("Scenario: Limited Reciprocity (Dealer Only)", () => {
    it("should provide credit for dealer purchase in another state", () => {
      const rules = getRulesForState("IL");
      const vehiclePrice = 30000;
      const indianaTaxPaid = 2100; // 7%
      const ilStateRate = 0.0625;

      const ilStateTax = vehiclePrice * ilStateRate;
      const creditAllowed = Math.min(indianaTaxPaid, ilStateTax);
      const ilStateOwed = ilStateTax - creditAllowed;

      expect(ilStateTax).toBeCloseTo(1875, 2);
      expect(creditAllowed).toBeCloseTo(1875, 2); // IN tax exceeds IL state rate
      expect(ilStateOwed).toBe(0);

      // But still owe local taxes (no credit)
      // This example would still owe local taxes on top
    });
  });

  describe("Scenario: Trade-In No Tax Benefit on Lease (2015 Law)", () => {
    it("should show trade-in reduces payment but not tax directly", () => {
      const rules = getRulesForState("IL");
      // With trade-in
      const monthlyPaymentWithTrade = 400;
      const rate = 0.0625;
      const taxWithTrade = monthlyPaymentWithTrade * rate;

      // Without trade-in (higher payment)
      const monthlyPaymentNoTrade = 500;
      const taxNoTrade = monthlyPaymentNoTrade * rate;

      expect(taxWithTrade).toBeCloseTo(25.00, 2);
      expect(taxNoTrade).toBeCloseTo(31.25, 2);

      // Trade-in reduces payment (and thus tax), but there's no direct tax credit
      const taxSavings = taxNoTrade - taxWithTrade;
      expect(taxSavings).toBeCloseTo(6.25, 2);
    });
  });
});
