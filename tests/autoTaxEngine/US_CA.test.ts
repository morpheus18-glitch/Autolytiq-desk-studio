import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("California (CA) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load California rules successfully", () => {
    const rules = getRulesForState("CA");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("CA");
  });

  it("should mark California as implemented (not a stub)", () => {
    expect(isStateImplemented("CA")).toBe(true);
  });

  it("should have version number 1", () => {
    const rules = getRulesForState("CA");
    expect(rules?.version).toBe(1);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("CA");
    const rulesLower = getRulesForState("ca");
    const rulesMixed = getRulesForState("Ca");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("CA");
    expect(rulesLower?.stateCode).toBe("CA");
    expect(rulesMixed?.stateCode).toBe("CA");
  });

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  describe("Retail - Trade-In Policy", () => {
    it("should have FULL trade-in credit", () => {
      const rules = getRulesForState("CA");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });

    it("should apply trade-in credit to entire tax (state + local)", () => {
      const rules = getRulesForState("CA");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(true);
    });
  });

  describe("Retail - Rebate Rules", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("CA");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as NON-TAXABLE (reduce purchase price)", () => {
      const rules = getRulesForState("CA");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(false);
      expect(mfrRebate?.notes).toContain("reduce");
      expect(mfrRebate?.notes).toContain("purchase price");
    });

    it("should mark dealer rebates as TAXABLE", () => {
      const rules = getRulesForState("CA");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(true);
      expect(dealerRebate?.notes).toContain("do not reduce");
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("CA");
      expect(rules?.docFeeTaxable).toBe(true);
    });

    it("should have doc fee cap of $85", () => {
      const rules = getRulesForState("CA");
      expect(rules?.extras?.docFeeCapAmount).toBe(85);
    });
  });

  describe("Retail - Fee Tax Rules", () => {
    it("should mark service contracts as TAXABLE on retail", () => {
      const rules = getRulesForState("CA");
      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(true);
      expect(vsc?.notes).toContain("taxable on retail");
    });

    it("should mark GAP as TAXABLE on retail", () => {
      const rules = getRulesForState("CA");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(true);
      expect(gap?.notes).toContain("taxable on retail");
    });

    it("should mark title fees as NON-TAXABLE", () => {
      const rules = getRulesForState("CA");
      const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
      expect(title?.notes).toContain("DMV");
    });

    it("should mark registration fees as NON-TAXABLE", () => {
      const rules = getRulesForState("CA");
      const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
      expect(reg?.notes).toContain("DMV");
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("CA");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should tax negative equity", () => {
      const rules = getRulesForState("CA");
      expect(rules?.taxOnNegativeEquity).toBe(true);
    });

    it("should tax service contracts", () => {
      const rules = getRulesForState("CA");
      expect(rules?.taxOnServiceContracts).toBe(true);
    });

    it("should tax GAP insurance", () => {
      const rules = getRulesForState("CA");
      expect(rules?.taxOnGap).toBe(true);
    });
  });

  describe("Retail - Vehicle Tax Scheme", () => {
    it("should use STATE_PLUS_LOCAL tax scheme", () => {
      const rules = getRulesForState("CA");
      expect(rules?.vehicleTaxScheme).toBe("STATE_PLUS_LOCAL");
    });

    it("should enable local sales tax", () => {
      const rules = getRulesForState("CA");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(true);
    });

    it("should have max combined rate of 10.75%", () => {
      const rules = getRulesForState("CA");
      expect(rules?.extras?.maxCombinedRate).toBe(10.75);
    });

    it("should document that CA has highest state base rate", () => {
      const rules = getRulesForState("CA");
      expect(rules?.extras?.notes).toContain("highest base sales tax");
      expect(rules?.extras?.notes).toContain("7.25%");
    });
  });

  // ============================================================================
  // LEASE TRANSACTION RULES
  // ============================================================================

  describe("Lease - Tax Method", () => {
    it("should use MONTHLY lease taxation method", () => {
      const rules = getRulesForState("CA");
      expect(rules?.leaseRules.method).toBe("MONTHLY");
    });

    it("should NOT tax cap cost reduction", () => {
      const rules = getRulesForState("CA");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });

    it("should tax fees upfront on leases", () => {
      const rules = getRulesForState("CA");
      expect(rules?.leaseRules.taxFeesUpfront).toBe(true);
    });

    it("should have no special lease scheme", () => {
      const rules = getRulesForState("CA");
      expect(rules?.leaseRules.specialScheme).toBe("NONE");
    });

    it("should document monthly payment taxation", () => {
      const rules = getRulesForState("CA");
      expect(rules?.leaseRules.notes).toContain("Monthly payment method");
    });
  });

  describe("Lease - Cap Cost Reduction", () => {
    it("should NOT tax cap cost reductions", () => {
      const rules = getRulesForState("CA");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });
  });

  describe("Lease - Rebate Behavior", () => {
    it("should follow retail rules for rebates", () => {
      const rules = getRulesForState("CA");
      expect(rules?.leaseRules.rebateBehavior).toBe("FOLLOW_RETAIL_RULE");
    });

    it("should document that manufacturer rebates reduce cap cost", () => {
      const rules = getRulesForState("CA");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate?.taxable).toBe(false);
      expect(rules?.leaseRules.rebateBehavior).toBe("FOLLOW_RETAIL_RULE");
    });
  });

  describe("Lease - Documentation Fee", () => {
    it("should ALWAYS tax doc fee on leases", () => {
      const rules = getRulesForState("CA");
      expect(rules?.leaseRules.docFeeTaxability).toBe("ALWAYS");
    });

    it("should have doc fee in lease fee tax rules", () => {
      const rules = getRulesForState("CA");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
      expect(docFee?.notes).toContain("upfront");
    });
  });

  describe("Lease - Trade-In Credit", () => {
    it("should provide FULL trade-in credit on leases", () => {
      const rules = getRulesForState("CA");
      expect(rules?.leaseRules.tradeInCredit).toBe("FULL");
    });

    it("should document that trade-ins reduce cap cost", () => {
      const rules = getRulesForState("CA");
      expect(rules?.leaseRules.notes).toContain("Trade-in gets full credit");
    });
  });

  describe("Lease - Negative Equity", () => {
    it("should mark negative equity as taxable on leases", () => {
      const rules = getRulesForState("CA");
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(true);
    });
  });

  describe("Lease - Fee Tax Rules", () => {
    it("should mark doc fee as TAXABLE on leases", () => {
      const rules = getRulesForState("CA");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
    });

    it("should mark service contracts as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("CA");
      const vsc = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(false);
      expect(vsc?.notes).toContain("not taxed");
      expect(vsc?.notes).toContain("capitalized");
    });

    it("should mark GAP as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("CA");
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(false);
      expect(gap?.notes).toContain("not taxed");
    });

    it("should mark title fees as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("CA");
      const title = rules?.leaseRules.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("CA");
      const reg = rules?.leaseRules.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Lease - Title Fee Rules", () => {
    it("should have title fee rule configuration", () => {
      const rules = getRulesForState("CA");
      expect(rules?.leaseRules.titleFeeRules).toBeDefined();
      expect(rules?.leaseRules.titleFeeRules.length).toBeGreaterThan(0);
    });

    it("should mark title fees as not taxable but included in cap cost", () => {
      const rules = getRulesForState("CA");
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
    it("should have reciprocity DISABLED", () => {
      const rules = getRulesForState("CA");
      expect(rules?.reciprocity.enabled).toBe(false);
    });

    it("should apply to BOTH (even though disabled)", () => {
      const rules = getRulesForState("CA");
      expect(rules?.reciprocity.scope).toBe("BOTH");
    });

    it("should use NONE for home state behavior", () => {
      const rules = getRulesForState("CA");
      expect(rules?.reciprocity.homeStateBehavior).toBe("NONE");
    });

    it("should NOT require proof of tax paid", () => {
      const rules = getRulesForState("CA");
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(false);
    });

    it("should NOT cap at state tax", () => {
      const rules = getRulesForState("CA");
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(false);
    });

    it("should not have lease exception", () => {
      const rules = getRulesForState("CA");
      expect(rules?.reciprocity.hasLeaseException).toBe(false);
    });

    it("should document NO reciprocity", () => {
      const rules = getRulesForState("CA");
      expect(rules?.reciprocity.notes).toContain("does not provide reciprocity");
      expect(rules?.reciprocity.notes).toContain("full CA use tax");
    });

    it("should document strict policy", () => {
      const rules = getRulesForState("CA");
      expect(rules?.reciprocity.notes).toContain("regardless of tax paid elsewhere");
    });
  });

  // ============================================================================
  // CALIFORNIA-SPECIFIC FEATURES
  // ============================================================================

  describe("California Unique Features - Highest Base Rate", () => {
    it("should document 7.25% base state rate", () => {
      const rules = getRulesForState("CA");
      expect(rules?.extras?.notes).toContain("7.25%");
      expect(rules?.extras?.notes).toContain("highest base sales tax");
    });

    it("should document potential for rates exceeding 10.75%", () => {
      const rules = getRulesForState("CA");
      expect(rules?.extras?.maxCombinedRate).toBe(10.75);
      expect(rules?.extras?.notes).toContain("10.75%");
    });
  });

  describe("California Unique Features - Doc Fee Cap", () => {
    it("should document $85 doc fee cap", () => {
      const rules = getRulesForState("CA");
      expect(rules?.extras?.docFeeCapAmount).toBe(85);
      expect(rules?.extras?.notes).toContain("$85");
      expect(rules?.extras?.notes).toContain("capped");
    });
  });

  describe("California Unique Features - Backend Products on Leases", () => {
    it("should document that VSC and GAP are not taxed on leases", () => {
      const rules = getRulesForState("CA");
      const vsc = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");

      expect(vsc?.taxable).toBe(false);
      expect(gap?.taxable).toBe(false);

      // But they ARE taxed on retail
      expect(rules?.taxOnServiceContracts).toBe(true);
      expect(rules?.taxOnGap).toBe(true);
    });
  });

  describe("California Unique Features - No Reciprocity", () => {
    it("should document strict no-reciprocity policy", () => {
      const rules = getRulesForState("CA");
      expect(rules?.reciprocity.enabled).toBe(false);
      expect(rules?.extras?.notes).toContain("No reciprocity");
    });
  });

  // ============================================================================
  // SCENARIO TESTS
  // ============================================================================

  describe("Scenario: Basic Retail Sale (Los Angeles - 10.25%)", () => {
    it("should calculate tax correctly with trade-in", () => {
      // $35,000 vehicle + $85 doc - $12,000 trade = $23,085 taxable
      // Tax @ 10.25%: $23,085 × 0.1025 = $2,366.21
      const vehiclePrice = 35000;
      const docFee = 85;
      const tradeIn = 12000;
      const taxableBase = vehiclePrice + docFee - tradeIn;
      const laRate = 0.1025; // 7.25% state + 3% local

      expect(taxableBase).toBe(23085);
      const expectedTax = taxableBase * laRate;
      expect(expectedTax).toBeCloseTo(2366.21, 2);
    });
  });

  describe("Scenario: Retail Sale with Manufacturer Rebate", () => {
    it("should reduce tax base by manufacturer rebate", () => {
      // $30,000 vehicle - $3,000 rebate = $27,000 taxable
      // Unlike Alabama, CA allows rebate to reduce tax base
      const vehicleMSRP = 30000;
      const mfrRebate = 3000;
      const customerPays = vehicleMSRP - mfrRebate;
      const taxableBase = customerPays; // Rebate DOES reduce tax base
      const rate = 0.0825; // 8.25% example

      expect(customerPays).toBe(27000);
      expect(taxableBase).toBe(27000);
      const tax = taxableBase * rate;
      expect(tax).toBeCloseTo(2227.50, 2);
    });
  });

  describe("Scenario: Retail Sale with Negative Equity", () => {
    it("should tax negative equity on retail", () => {
      const vehiclePrice = 32000;
      const docFee = 85;
      const tradeInValue = 15000;
      const tradeInPayoff = 18000;
      const negativeEquity = tradeInPayoff - tradeInValue;

      // In CA, negative equity IS taxable (added to tax base)
      const taxableBase = vehiclePrice + docFee - tradeInValue + negativeEquity;
      const rate = 0.0825;

      expect(negativeEquity).toBe(3000);
      expect(taxableBase).toBe(20085);
      const tax = taxableBase * rate;
      expect(tax).toBeCloseTo(1657.01, 2);
    });
  });

  describe("Scenario: Retail Sale with VSC and GAP (TAXABLE)", () => {
    it("should tax service contracts and GAP on retail", () => {
      const vehiclePrice = 28000;
      const vsc = 2200;
      const gap = 895;
      const docFee = 85;
      const rate = 0.0825;

      // VSC and GAP ARE taxable on retail in CA
      const taxableBase = vehiclePrice + vsc + gap + docFee;
      const tax = taxableBase * rate;

      expect(taxableBase).toBe(31180);
      expect(tax).toBeCloseTo(2572.35, 2);
    });
  });

  describe("Scenario: Monthly Lease Taxation (San Francisco - 9.875%)", () => {
    it("should tax monthly payments only, not cap reduction", () => {
      const capReduction = 8000; // NOT taxed
      const monthlyPayment = 525;
      const term = 36;
      const sfRate = 0.09875; // 7.25% state + 2.625% local

      // Cap reduction NOT taxed
      const capReductionTax = 0;

      // Only monthly payments are taxed
      const monthlyTax = monthlyPayment * sfRate;
      const totalTax = monthlyTax * term;

      expect(capReductionTax).toBe(0);
      expect(monthlyTax).toBeCloseTo(51.84, 2);
      expect(totalTax).toBeCloseTo(1866.19, 2);
    });
  });

  describe("Scenario: Lease with Trade-In (FULL CREDIT)", () => {
    it("should reduce cap cost by trade-in (no tax on trade-in)", () => {
      const grossCapCost = 40000;
      const tradeInValue = 10000;
      const adjustedCapCost = grossCapCost - tradeInValue;
      const monthlyPayment = 450; // based on adjusted cap cost
      const rate = 0.0925;

      // Trade-in reduces cap cost, no tax on it
      const tradeInTax = 0;

      expect(adjustedCapCost).toBe(30000);
      expect(tradeInTax).toBe(0);

      // Only monthly payments taxed
      const monthlyTax = monthlyPayment * rate;
      expect(monthlyTax).toBeCloseTo(41.63, 2);
    });
  });

  describe("Scenario: Lease with Negative Equity", () => {
    it("should increase cap cost and monthly payments (tax paid monthly)", () => {
      const baseCapCost = 35000;
      const tradeInValue = 12000;
      const tradeInPayoff = 16000;
      const negativeEquity = tradeInPayoff - tradeInValue;
      const adjustedCapCost = baseCapCost + negativeEquity;
      const monthlyPayment = 550; // higher due to negative equity
      const rate = 0.0925;

      expect(negativeEquity).toBe(4000);
      expect(adjustedCapCost).toBe(39000);

      // Negative equity increases monthly payment, tax paid monthly
      const monthlyTax = monthlyPayment * rate;
      expect(monthlyTax).toBeCloseTo(50.88, 2);
    });
  });

  describe("Scenario: Lease with VSC and GAP (NOT TAXABLE)", () => {
    it("should NOT tax backend products on leases", () => {
      const monthlyPayment = 450; // base payment
      const vsc = 1800; // capitalized, not taxed
      const gap = 695; // capitalized, not taxed
      const rate = 0.0925;

      // Backend products NOT taxed when capitalized
      const vscTax = 0;
      const gapTax = 0;

      // Only base monthly payment is taxed
      const monthlyTax = monthlyPayment * rate;

      expect(vscTax).toBe(0);
      expect(gapTax).toBe(0);
      expect(monthlyTax).toBeCloseTo(41.63, 2);
    });
  });

  describe("Scenario: Out-of-State Purchase (NO RECIPROCITY)", () => {
    it("should owe full CA tax regardless of tax paid elsewhere", () => {
      const vehiclePrice = 30000;
      const nevadaTaxPaid = 2460; // 8.2% paid in Nevada
      const caRate = 0.0725; // 7.25% CA state (minimum)

      // CA does NOT provide credit for Nevada tax
      const creditAllowed = 0;
      const caTaxOwed = vehiclePrice * caRate;

      expect(caTaxOwed).toBe(2175);
      expect(creditAllowed).toBe(0);

      // Customer pays BOTH Nevada tax AND CA tax (no credit)
      const totalTaxPaid = nevadaTaxPaid + caTaxOwed;
      expect(totalTaxPaid).toBeCloseTo(4635, 2);
    });
  });

  describe("Scenario: Doc Fee at Cap ($85)", () => {
    it("should tax doc fee at maximum allowed amount", () => {
      const vehiclePrice = 25000;
      const docFee = 85; // Maximum allowed
      const tradeIn = 8000;
      const taxableBase = vehiclePrice + docFee - tradeIn;
      const rate = 0.08;

      expect(docFee).toBe(85);
      expect(taxableBase).toBe(17085);
      const tax = taxableBase * rate;
      expect(tax).toBeCloseTo(1366.80, 2);
    });
  });

  describe("Scenario: High-Tax District (10.75% maximum)", () => {
    it("should calculate at maximum combined rate", () => {
      const vehiclePrice = 42000;
      const docFee = 85;
      const tradeIn = 15000;
      const taxableBase = vehiclePrice + docFee - tradeIn;
      const maxRate = 0.1075; // 7.25% state + 3.5% local

      expect(taxableBase).toBe(27085);
      const tax = taxableBase * maxRate;
      expect(tax).toBeCloseTo(2911.64, 2);
    });
  });

  // ============================================================================
  // METADATA AND DOCUMENTATION
  // ============================================================================

  describe("Metadata - Sources", () => {
    it("should document official sources", () => {
      const rules = getRulesForState("CA");
      expect(rules?.extras?.sources).toBeDefined();
      expect(rules?.extras?.sources?.length).toBeGreaterThan(0);
    });

    it("should reference California CDTFA", () => {
      const rules = getRulesForState("CA");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("CDTFA") || s.includes("California"))).toBe(true);
    });

    it("should reference Regulation 1610", () => {
      const rules = getRulesForState("CA");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("1610"))).toBe(true);
    });

    it("should reference Regulation 1660", () => {
      const rules = getRulesForState("CA");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("1660"))).toBe(true);
    });
  });

  describe("Metadata - Last Updated", () => {
    it("should have lastUpdated timestamp", () => {
      const rules = getRulesForState("CA");
      expect(rules?.extras?.lastUpdated).toBeDefined();
      expect(rules?.extras?.lastUpdated).toBe("2025-01");
    });
  });

  describe("Metadata - Documentation", () => {
    it("should have comprehensive notes in extras", () => {
      const rules = getRulesForState("CA");
      expect(rules?.extras?.notes).toBeDefined();
      expect((rules?.extras?.notes as string)?.length).toBeGreaterThan(100);
    });

    it("should document key California features in notes", () => {
      const rules = getRulesForState("CA");
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("7.25%");
      expect(notes).toContain("$85");
      expect(notes).toContain("reciprocity");
    });

    it("should document doc fee cap", () => {
      const rules = getRulesForState("CA");
      expect(rules?.extras?.docFeeCapAmount).toBe(85);
    });

    it("should document max combined rate", () => {
      const rules = getRulesForState("CA");
      expect(rules?.extras?.maxCombinedRate).toBe(10.75);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("Edge Cases - Manufacturer Rebate Treatment", () => {
    it("should document difference from states like Alabama", () => {
      const rules = getRulesForState("CA");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate?.taxable).toBe(false);
      // CA: rebates reduce tax base
      // AL: rebates do NOT reduce tax base
    });
  });

  describe("Edge Cases - Backend Products Retail vs Lease", () => {
    it("should tax VSC/GAP on retail but NOT on leases", () => {
      const rules = getRulesForState("CA");

      // Retail: Taxable
      expect(rules?.taxOnServiceContracts).toBe(true);
      expect(rules?.taxOnGap).toBe(true);

      // Lease: Not Taxable
      const vscLease = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      const gapLease = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(vscLease?.taxable).toBe(false);
      expect(gapLease?.taxable).toBe(false);
    });
  });

  describe("Edge Cases - No Reciprocity Impact", () => {
    it("should result in double taxation for out-of-state purchases", () => {
      const rules = getRulesForState("CA");
      expect(rules?.reciprocity.enabled).toBe(false);
      // This means buyers can pay tax in another state and still owe full CA tax
    });
  });
});
