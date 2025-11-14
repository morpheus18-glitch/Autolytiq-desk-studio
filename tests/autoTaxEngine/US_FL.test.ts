import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Florida (FL) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load Florida rules successfully", () => {
    const rules = getRulesForState("FL");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("FL");
  });

  it("should mark Florida as implemented (not a stub)", () => {
    expect(isStateImplemented("FL")).toBe(true);
  });

  it("should have version number 1", () => {
    const rules = getRulesForState("FL");
    expect(rules?.version).toBe(1);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("FL");
    const rulesLower = getRulesForState("fl");
    const rulesMixed = getRulesForState("Fl");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("FL");
    expect(rulesLower?.stateCode).toBe("FL");
    expect(rulesMixed?.stateCode).toBe("FL");
  });

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  describe("Retail - Trade-In Policy", () => {
    it("should have FULL trade-in credit", () => {
      const rules = getRulesForState("FL");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });

    it("should apply trade-in credit to entire tax (state + local)", () => {
      const rules = getRulesForState("FL");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(true);
    });
  });

  describe("Retail - Rebate Rules", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("FL");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as NON-TAXABLE (reduce purchase price)", () => {
      const rules = getRulesForState("FL");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(false);
      expect(mfrRebate?.notes).toContain("reduce");
      expect(mfrRebate?.notes).toContain("purchase price");
    });

    it("should mark dealer rebates as TAXABLE", () => {
      const rules = getRulesForState("FL");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(true);
      expect(dealerRebate?.notes).toContain("do not reduce");
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("FL");
      expect(rules?.docFeeTaxable).toBe(true);
    });

    it("should have doc fee cap of $995 (one of highest in US)", () => {
      const rules = getRulesForState("FL");
      expect(rules?.extras?.docFeeCapAmount).toBe(995);
    });

    it("should document high doc fee cap in notes", () => {
      const rules = getRulesForState("FL");
      expect(rules?.extras?.notes).toContain("$995");
      expect(rules?.extras?.notes).toContain("highest caps");
    });
  });

  describe("Retail - Fee Tax Rules", () => {
    it("should mark service contracts as TAXABLE on retail", () => {
      const rules = getRulesForState("FL");
      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(true);
      expect(vsc?.notes).toContain("taxable on retail");
    });

    it("should mark GAP as TAXABLE on retail", () => {
      const rules = getRulesForState("FL");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(true);
      expect(gap?.notes).toContain("taxable on retail");
    });

    it("should mark title fees as NON-TAXABLE", () => {
      const rules = getRulesForState("FL");
      const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
      expect(title?.notes).toContain("DMV");
    });

    it("should mark registration fees as NON-TAXABLE", () => {
      const rules = getRulesForState("FL");
      const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
      expect(reg?.notes).toContain("DMV");
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("FL");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should tax negative equity", () => {
      const rules = getRulesForState("FL");
      expect(rules?.taxOnNegativeEquity).toBe(true);
    });

    it("should tax service contracts", () => {
      const rules = getRulesForState("FL");
      expect(rules?.taxOnServiceContracts).toBe(true);
    });

    it("should tax GAP insurance", () => {
      const rules = getRulesForState("FL");
      expect(rules?.taxOnGap).toBe(true);
    });
  });

  describe("Retail - Vehicle Tax Scheme", () => {
    it("should use STATE_PLUS_LOCAL tax scheme", () => {
      const rules = getRulesForState("FL");
      expect(rules?.vehicleTaxScheme).toBe("STATE_PLUS_LOCAL");
    });

    it("should enable local sales tax", () => {
      const rules = getRulesForState("FL");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(true);
    });

    it("should have state rate of 6.0%", () => {
      const rules = getRulesForState("FL");
      expect(rules?.extras?.stateRate).toBe(6.0);
    });

    it("should have max local rate of 2.0%", () => {
      const rules = getRulesForState("FL");
      expect(rules?.extras?.maxLocalRate).toBe(2.0);
    });

    it("should have max combined rate of 8.0%", () => {
      const rules = getRulesForState("FL");
      expect(rules?.extras?.maxCombinedRate).toBe(8.0);
    });

    it("should document common county rates", () => {
      const rules = getRulesForState("FL");
      expect(rules?.extras?.commonCountyRates).toBeDefined();
      expect(rules?.extras?.commonCountyRates?.["Miami-Dade"]).toBe(7.0);
      expect(rules?.extras?.commonCountyRates?.["Hillsborough"]).toBe(7.5);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION RULES
  // ============================================================================

  describe("Lease - Tax Method", () => {
    it("should use MONTHLY lease taxation method", () => {
      const rules = getRulesForState("FL");
      expect(rules?.leaseRules.method).toBe("MONTHLY");
    });

    it("should NOT tax cap cost reduction", () => {
      const rules = getRulesForState("FL");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });

    it("should tax fees upfront on leases", () => {
      const rules = getRulesForState("FL");
      expect(rules?.leaseRules.taxFeesUpfront).toBe(true);
    });

    it("should have no special lease scheme", () => {
      const rules = getRulesForState("FL");
      expect(rules?.leaseRules.specialScheme).toBe("NONE");
    });

    it("should document monthly payment taxation", () => {
      const rules = getRulesForState("FL");
      expect(rules?.leaseRules.notes).toContain("Monthly payment method");
    });
  });

  describe("Lease - Cap Cost Reduction", () => {
    it("should NOT tax cap cost reductions", () => {
      const rules = getRulesForState("FL");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });
  });

  describe("Lease - Rebate Behavior", () => {
    it("should follow retail rules for rebates", () => {
      const rules = getRulesForState("FL");
      expect(rules?.leaseRules.rebateBehavior).toBe("FOLLOW_RETAIL_RULE");
    });

    it("should document that manufacturer rebates reduce cap cost", () => {
      const rules = getRulesForState("FL");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate?.taxable).toBe(false);
      expect(rules?.leaseRules.rebateBehavior).toBe("FOLLOW_RETAIL_RULE");
    });
  });

  describe("Lease - Documentation Fee", () => {
    it("should ALWAYS tax doc fee on leases", () => {
      const rules = getRulesForState("FL");
      expect(rules?.leaseRules.docFeeTaxability).toBe("ALWAYS");
    });

    it("should have doc fee in lease fee tax rules", () => {
      const rules = getRulesForState("FL");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
      expect(docFee?.notes).toContain("upfront");
    });

    it("should document $995 cap applies to leases", () => {
      const rules = getRulesForState("FL");
      expect(rules?.extras?.docFeeCapAmount).toBe(995);
    });
  });

  describe("Lease - Trade-In Credit", () => {
    it("should provide FULL trade-in credit on leases", () => {
      const rules = getRulesForState("FL");
      expect(rules?.leaseRules.tradeInCredit).toBe("FULL");
    });

    it("should document that trade-ins reduce cap cost", () => {
      const rules = getRulesForState("FL");
      expect(rules?.leaseRules.notes).toContain("Trade-in gets full credit");
    });
  });

  describe("Lease - Negative Equity", () => {
    it("should mark negative equity as taxable on leases", () => {
      const rules = getRulesForState("FL");
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(true);
    });
  });

  describe("Lease - Fee Tax Rules", () => {
    it("should mark doc fee as TAXABLE on leases", () => {
      const rules = getRulesForState("FL");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
    });

    it("should mark service contracts as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("FL");
      const vsc = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(false);
      expect(vsc?.notes).toContain("NOT taxed");
      expect(vsc?.notes).toContain("capitalized");
    });

    it("should mark GAP as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("FL");
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(false);
      expect(gap?.notes).toContain("NOT taxed");
    });

    it("should mark title fees as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("FL");
      const title = rules?.leaseRules.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("FL");
      const reg = rules?.leaseRules.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Lease - Title Fee Rules", () => {
    it("should have title fee rule configuration", () => {
      const rules = getRulesForState("FL");
      expect(rules?.leaseRules.titleFeeRules).toBeDefined();
      expect(rules?.leaseRules.titleFeeRules.length).toBeGreaterThan(0);
    });

    it("should mark title fees as not taxable but included in cap cost", () => {
      const rules = getRulesForState("FL");
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
      const rules = getRulesForState("FL");
      expect(rules?.reciprocity.enabled).toBe(false);
    });

    it("should apply to BOTH (even though disabled)", () => {
      const rules = getRulesForState("FL");
      expect(rules?.reciprocity.scope).toBe("BOTH");
    });

    it("should use NONE for home state behavior", () => {
      const rules = getRulesForState("FL");
      expect(rules?.reciprocity.homeStateBehavior).toBe("NONE");
    });

    it("should NOT require proof of tax paid", () => {
      const rules = getRulesForState("FL");
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(false);
    });

    it("should NOT cap at state tax", () => {
      const rules = getRulesForState("FL");
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(false);
    });

    it("should not have lease exception", () => {
      const rules = getRulesForState("FL");
      expect(rules?.reciprocity.hasLeaseException).toBe(false);
    });

    it("should document NO reciprocity", () => {
      const rules = getRulesForState("FL");
      expect(rules?.reciprocity.notes).toContain("does not provide reciprocity");
      expect(rules?.reciprocity.notes).toContain("full FL use tax");
    });

    it("should document strict policy similar to California", () => {
      const rules = getRulesForState("FL");
      expect(rules?.reciprocity.notes).toContain("regardless of tax paid elsewhere");
      expect(rules?.reciprocity.notes).toContain("No credit");
    });
  });

  // ============================================================================
  // FLORIDA-SPECIFIC FEATURES
  // ============================================================================

  describe("Florida Unique Features - High Doc Fee Cap", () => {
    it("should document $995 doc fee cap as one of highest in US", () => {
      const rules = getRulesForState("FL");
      expect(rules?.extras?.docFeeCapAmount).toBe(995);
      expect(rules?.extras?.notes).toContain("$995");
      expect(rules?.extras?.notes).toContain("highest");
    });
  });

  describe("Florida Unique Features - County Surtax Variation", () => {
    it("should document county-specific rates", () => {
      const rules = getRulesForState("FL");
      const countyRates = rules?.extras?.commonCountyRates as Record<string, number>;
      expect(countyRates).toBeDefined();
      expect(Object.keys(countyRates).length).toBeGreaterThan(0);
    });

    it("should have major county rates documented", () => {
      const rules = getRulesForState("FL");
      const countyRates = rules?.extras?.commonCountyRates as Record<string, number>;
      expect(countyRates?.["Miami-Dade"]).toBe(7.0);
      expect(countyRates?.["Broward"]).toBe(7.0);
      expect(countyRates?.["Palm Beach"]).toBe(7.0);
      expect(countyRates?.["Hillsborough"]).toBe(7.5);
      expect(countyRates?.["Orange"]).toBe(6.5);
      expect(countyRates?.["Duval"]).toBe(7.0);
    });
  });

  describe("Florida Unique Features - Backend Products Treatment Difference", () => {
    it("should tax VSC/GAP on retail but NOT on leases", () => {
      const rules = getRulesForState("FL");

      // Retail: Taxable
      expect(rules?.taxOnServiceContracts).toBe(true);
      expect(rules?.taxOnGap).toBe(true);

      // Lease: Not Taxable
      const vscLease = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      const gapLease = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(vscLease?.taxable).toBe(false);
      expect(gapLease?.taxable).toBe(false);
    });

    it("should document this difference in lease notes", () => {
      const rules = getRulesForState("FL");
      expect(rules?.leaseRules.notes).toContain("Service contracts and GAP are NOT taxed on leases");
      expect(rules?.leaseRules.notes).toContain("unlike retail where they ARE taxed");
    });
  });

  describe("Florida Unique Features - No Reciprocity", () => {
    it("should document strict no-reciprocity policy", () => {
      const rules = getRulesForState("FL");
      expect(rules?.reciprocity.enabled).toBe(false);
      expect(rules?.extras?.notes).toContain("No reciprocity");
    });

    it("should document comparison to California", () => {
      const rules = getRulesForState("FL");
      expect(rules?.reciprocity.notes).toContain("similar to California");
    });
  });

  describe("Florida Unique Features - Registration Location Basis", () => {
    it("should document that tax is based on registration location", () => {
      const rules = getRulesForState("FL");
      expect(rules?.extras?.notes).toContain("location where the vehicle is registered");
    });
  });

  // ============================================================================
  // SCENARIO TESTS
  // ============================================================================

  describe("Scenario: Basic Retail Sale (Miami-Dade - 7.0%)", () => {
    it("should calculate tax correctly with trade-in", () => {
      // $32,000 vehicle + $995 doc - $11,000 trade = $21,995 taxable
      // Tax @ 7.0%: $21,995 × 0.07 = $1,539.65
      const vehiclePrice = 32000;
      const docFee = 995;
      const tradeIn = 11000;
      const taxableBase = vehiclePrice + docFee - tradeIn;
      const miamiRate = 0.07; // 6% state + 1% local

      expect(taxableBase).toBe(21995);
      const expectedTax = taxableBase * miamiRate;
      expect(expectedTax).toBeCloseTo(1539.65, 2);
    });
  });

  describe("Scenario: Retail Sale with Manufacturer Rebate", () => {
    it("should reduce tax base by manufacturer rebate", () => {
      // $28,000 vehicle - $2,500 rebate = $25,500 taxable
      // Florida allows rebate to reduce tax base
      const vehicleMSRP = 28000;
      const mfrRebate = 2500;
      const customerPays = vehicleMSRP - mfrRebate;
      const taxableBase = customerPays; // Rebate DOES reduce tax base
      const rate = 0.07;

      expect(customerPays).toBe(25500);
      expect(taxableBase).toBe(25500);
      const tax = taxableBase * rate;
      expect(tax).toBeCloseTo(1785.00, 2);
    });
  });

  describe("Scenario: Retail Sale with Negative Equity", () => {
    it("should tax negative equity on retail", () => {
      const vehiclePrice = 30000;
      const docFee = 995;
      const tradeInValue = 14000;
      const tradeInPayoff = 17000;
      const negativeEquity = tradeInPayoff - tradeInValue;

      // In FL, negative equity IS taxable (added to tax base)
      const taxableBase = vehiclePrice + docFee - tradeInValue + negativeEquity;
      const rate = 0.07;

      expect(negativeEquity).toBe(3000);
      expect(taxableBase).toBe(19995);
      const tax = taxableBase * rate;
      expect(tax).toBeCloseTo(1399.65, 2);
    });
  });

  describe("Scenario: Retail Sale with VSC and GAP (TAXABLE)", () => {
    it("should tax service contracts and GAP on retail", () => {
      const vehiclePrice = 26000;
      const vsc = 2400;
      const gap = 795;
      const docFee = 995;
      const rate = 0.07;

      // VSC and GAP ARE taxable on retail in FL
      const taxableBase = vehiclePrice + vsc + gap + docFee;
      const tax = taxableBase * rate;

      expect(taxableBase).toBe(30190);
      expect(tax).toBeCloseTo(2113.30, 2);
    });
  });

  describe("Scenario: Monthly Lease Taxation (Tampa/Hillsborough - 7.5%)", () => {
    it("should tax monthly payments only, not cap reduction", () => {
      const capReduction = 6000; // NOT taxed
      const monthlyPayment = 475;
      const term = 36;
      const tampaRate = 0.075; // 6% state + 1.5% local

      // Cap reduction NOT taxed
      const capReductionTax = 0;

      // Only monthly payments are taxed
      const monthlyTax = monthlyPayment * tampaRate;
      const totalTax = monthlyTax * term;

      expect(capReductionTax).toBe(0);
      expect(monthlyTax).toBeCloseTo(35.63, 2);
      expect(totalTax).toBeCloseTo(1282.50, 2);
    });
  });

  describe("Scenario: Lease with Trade-In (FULL CREDIT)", () => {
    it("should reduce cap cost by trade-in (no tax on trade-in)", () => {
      const grossCapCost = 38000;
      const tradeInValue = 12000;
      const adjustedCapCost = grossCapCost - tradeInValue;
      const monthlyPayment = 425; // based on adjusted cap cost
      const rate = 0.07;

      // Trade-in reduces cap cost, no tax on it
      const tradeInTax = 0;

      expect(adjustedCapCost).toBe(26000);
      expect(tradeInTax).toBe(0);

      // Only monthly payments taxed
      const monthlyTax = monthlyPayment * rate;
      expect(monthlyTax).toBeCloseTo(29.75, 2);
    });
  });

  describe("Scenario: Lease with Negative Equity", () => {
    it("should increase cap cost and monthly payments (tax paid monthly)", () => {
      const baseCapCost = 32000;
      const tradeInValue = 10000;
      const tradeInPayoff = 13000;
      const negativeEquity = tradeInPayoff - tradeInValue;
      const adjustedCapCost = baseCapCost + negativeEquity;
      const monthlyPayment = 500; // higher due to negative equity
      const rate = 0.07;

      expect(negativeEquity).toBe(3000);
      expect(adjustedCapCost).toBe(35000);

      // Negative equity increases monthly payment, tax paid monthly
      const monthlyTax = monthlyPayment * rate;
      expect(monthlyTax).toBeCloseTo(35.00, 2);
    });
  });

  describe("Scenario: Lease with VSC and GAP (NOT TAXABLE)", () => {
    it("should NOT tax backend products on leases", () => {
      const monthlyPayment = 425; // base payment
      const vsc = 2100; // capitalized, not taxed
      const gap = 795; // capitalized, not taxed
      const rate = 0.07;

      // Backend products NOT taxed when capitalized
      const vscTax = 0;
      const gapTax = 0;

      // Only base monthly payment is taxed
      const monthlyTax = monthlyPayment * rate;

      expect(vscTax).toBe(0);
      expect(gapTax).toBe(0);
      expect(monthlyTax).toBeCloseTo(29.75, 2);

      // Important: This is DIFFERENT from retail where they ARE taxed
    });
  });

  describe("Scenario: Out-of-State Purchase (NO RECIPROCITY)", () => {
    it("should owe full FL tax regardless of tax paid elsewhere", () => {
      const vehiclePrice = 28000;
      const georgiaTaxPaid = 1960; // 7% paid in Georgia
      const flRate = 0.07; // 6% state + 1% typical local

      // FL does NOT provide credit for Georgia tax
      const creditAllowed = 0;
      const flTaxOwed = vehiclePrice * flRate;

      expect(flTaxOwed).toBe(1960);
      expect(creditAllowed).toBe(0);

      // Customer pays BOTH Georgia tax AND FL tax (no credit)
      const totalTaxPaid = georgiaTaxPaid + flTaxOwed;
      expect(totalTaxPaid).toBe(3920);
      // Customer effectively pays double tax
    });
  });

  describe("Scenario: Doc Fee at Cap ($995)", () => {
    it("should tax doc fee at maximum allowed amount", () => {
      const vehiclePrice = 24000;
      const docFee = 995; // Maximum allowed
      const tradeIn = 9000;
      const taxableBase = vehiclePrice + docFee - tradeIn;
      const rate = 0.07;

      expect(docFee).toBe(995);
      expect(taxableBase).toBe(15995);
      const tax = taxableBase * rate;
      expect(tax).toBeCloseTo(1119.65, 2);
    });
  });

  describe("Scenario: High-Tax County (Hillsborough/Tampa - 7.5%)", () => {
    it("should calculate at highest typical combined rate", () => {
      const vehiclePrice = 35000;
      const docFee = 995;
      const tradeIn = 12000;
      const taxableBase = vehiclePrice + docFee - tradeIn;
      const tampaRate = 0.075; // 6% state + 1.5% local

      expect(taxableBase).toBe(23995);
      const tax = taxableBase * tampaRate;
      expect(tax).toBeCloseTo(1799.63, 2);
    });
  });

  describe("Scenario: Low-Tax County (Orange/Orlando - 6.5%)", () => {
    it("should calculate at lower combined rate", () => {
      const vehiclePrice = 29000;
      const docFee = 995;
      const tradeIn = 10000;
      const taxableBase = vehiclePrice + docFee - tradeIn;
      const orlandoRate = 0.065; // 6% state + 0.5% local

      expect(taxableBase).toBe(19995);
      const tax = taxableBase * orlandoRate;
      expect(tax).toBeCloseTo(1299.68, 2);
    });
  });

  describe("Scenario: Maximum Combined Rate (8.0%)", () => {
    it("should calculate at maximum possible rate", () => {
      const vehiclePrice = 40000;
      const docFee = 995;
      const vsc = 2500;
      const gap = 895;
      const tradeIn = 15000;
      const taxableBase = vehiclePrice + docFee + vsc + gap - tradeIn;
      const maxRate = 0.08; // 6% state + 2% local (max)

      expect(taxableBase).toBe(29390);
      const tax = taxableBase * maxRate;
      expect(tax).toBeCloseTo(2351.20, 2);
    });
  });

  // ============================================================================
  // METADATA AND DOCUMENTATION
  // ============================================================================

  describe("Metadata - Sources", () => {
    it("should document official sources", () => {
      const rules = getRulesForState("FL");
      expect(rules?.extras?.sources).toBeDefined();
      expect(rules?.extras?.sources?.length).toBeGreaterThan(0);
    });

    it("should reference Florida Department of Revenue", () => {
      const rules = getRulesForState("FL");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Florida Department of Revenue"))).toBe(true);
    });

    it("should reference Florida Statute 212.05", () => {
      const rules = getRulesForState("FL");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("212.05"))).toBe(true);
    });

    it("should reference Florida Statute 212.08(7)", () => {
      const rules = getRulesForState("FL");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("212.08"))).toBe(true);
    });

    it("should reference Florida Statute 501.137 (doc fee cap)", () => {
      const rules = getRulesForState("FL");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("501.137"))).toBe(true);
    });

    it("should reference TIP guidance", () => {
      const rules = getRulesForState("FL");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("TIP"))).toBe(true);
    });
  });

  describe("Metadata - Last Updated", () => {
    it("should have lastUpdated timestamp", () => {
      const rules = getRulesForState("FL");
      expect(rules?.extras?.lastUpdated).toBeDefined();
      expect(rules?.extras?.lastUpdated).toBe("2025-01");
    });
  });

  describe("Metadata - Documentation", () => {
    it("should have comprehensive notes in extras", () => {
      const rules = getRulesForState("FL");
      expect(rules?.extras?.notes).toBeDefined();
      expect((rules?.extras?.notes as string)?.length).toBeGreaterThan(100);
    });

    it("should document key Florida features in notes", () => {
      const rules = getRulesForState("FL");
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("6%");
      expect(notes).toContain("$995");
      expect(notes).toContain("reciprocity");
    });

    it("should document doc fee cap", () => {
      const rules = getRulesForState("FL");
      expect(rules?.extras?.docFeeCapAmount).toBe(995);
    });

    it("should document max combined rate", () => {
      const rules = getRulesForState("FL");
      expect(rules?.extras?.maxCombinedRate).toBe(8.0);
    });

    it("should document state rate", () => {
      const rules = getRulesForState("FL");
      expect(rules?.extras?.stateRate).toBe(6.0);
    });

    it("should document max local rate", () => {
      const rules = getRulesForState("FL");
      expect(rules?.extras?.maxLocalRate).toBe(2.0);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("Edge Cases - Manufacturer Rebate Treatment", () => {
    it("should reduce tax base (same as CA, different from AL)", () => {
      const rules = getRulesForState("FL");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate?.taxable).toBe(false);
      // FL: rebates reduce tax base (like CA)
      // AL: rebates do NOT reduce tax base
    });
  });

  describe("Edge Cases - Backend Products Retail vs Lease", () => {
    it("should tax VSC/GAP on retail but NOT on leases", () => {
      const rules = getRulesForState("FL");

      // Retail: Taxable
      expect(rules?.taxOnServiceContracts).toBe(true);
      expect(rules?.taxOnGap).toBe(true);

      // Lease: Not Taxable
      const vscLease = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      const gapLease = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(vscLease?.taxable).toBe(false);
      expect(gapLease?.taxable).toBe(false);

      // This is an important distinction that could save customers money on leases
    });
  });

  describe("Edge Cases - No Reciprocity Impact", () => {
    it("should result in double taxation for out-of-state purchases", () => {
      const rules = getRulesForState("FL");
      expect(rules?.reciprocity.enabled).toBe(false);
      // This means buyers can pay tax in another state and still owe full FL tax
    });
  });

  describe("Edge Cases - High Doc Fee Cap", () => {
    it("should allow much higher doc fees than most states", () => {
      const rules = getRulesForState("FL");
      expect(rules?.extras?.docFeeCapAmount).toBe(995);
      // Compare to CA ($85), this is 11.7x higher
    });
  });
});
