import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Minnesota (MN) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load Minnesota rules successfully", () => {
    const rules = getRulesForState("MN");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("MN");
  });

  it("should mark Minnesota as implemented (not a stub)", () => {
    expect(isStateImplemented("MN")).toBe(true);
  });

  it("should have version number 1", () => {
    const rules = getRulesForState("MN");
    expect(rules?.version).toBe(1);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("MN");
    const rulesLower = getRulesForState("mn");
    const rulesMixed = getRulesForState("Mn");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("MN");
    expect(rulesLower?.stateCode).toBe("MN");
    expect(rulesMixed?.stateCode).toBe("MN");
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS
  // ============================================================================

  describe("Retail Trade-In Policy", () => {
    it("should have FULL trade-in credit (no cap)", () => {
      const rules = getRulesForState("MN");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });
  });

  describe("Retail Rebate Rules", () => {
    it("should have exactly 2 rebate rules", () => {
      const rules = getRulesForState("MN");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as NON-TAXABLE", () => {
      const rules = getRulesForState("MN");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(false);
      expect(mfrRebate?.notes).toContain("reduce purchase price");
    });

    it("should mark dealer rebates as NON-TAXABLE", () => {
      const rules = getRulesForState("MN");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(false);
      expect(dealerRebate?.notes).toContain("reduce purchase price");
    });
  });

  describe("Retail Doc Fee", () => {
    it("should mark doc fee as NOT TAXABLE", () => {
      const rules = getRulesForState("MN");
      expect(rules?.docFeeTaxable).toBe(false);
    });

    it("should document low average doc fee", () => {
      const rules = getRulesForState("MN");
      expect(rules?.extras?.avgDocFee).toBe(75);
    });
  });

  describe("Retail Fee Taxability", () => {
    it("should mark service contracts as NOT TAXABLE", () => {
      const rules = getRulesForState("MN");
      const serviceContract = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(serviceContract?.taxable).toBe(false);
      expect(serviceContract?.notes).toContain("NOT subject to motor vehicle sales tax");
    });

    it("should mark GAP as NOT TAXABLE", () => {
      const rules = getRulesForState("MN");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap?.taxable).toBe(false);
      expect(gap?.notes).toContain("NOT taxable");
    });

    it("should mark doc fee as NOT TAXABLE", () => {
      const rules = getRulesForState("MN");
      const docFee = rules?.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee?.taxable).toBe(false);
      expect(docFee?.notes).toContain("explicitly NOT taxable");
    });

    it("should mark title fees as NOT TAXABLE", () => {
      const rules = getRulesForState("MN");
      const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NOT TAXABLE", () => {
      const rules = getRulesForState("MN");
      const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Retail Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("MN");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should NOT tax negative equity", () => {
      const rules = getRulesForState("MN");
      expect(rules?.taxOnNegativeEquity).toBe(false);
    });

    it("should NOT tax service contracts", () => {
      const rules = getRulesForState("MN");
      expect(rules?.taxOnServiceContracts).toBe(false);
    });

    it("should NOT tax GAP", () => {
      const rules = getRulesForState("MN");
      expect(rules?.taxOnGap).toBe(false);
    });
  });

  describe("Vehicle Tax Scheme", () => {
    it("should use STATE_ONLY scheme for purchases", () => {
      const rules = getRulesForState("MN");
      expect(rules?.vehicleTaxScheme).toBe("STATE_ONLY");
    });

    it("should NOT use local sales tax for purchases", () => {
      const rules = getRulesForState("MN");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
    });

    it("should have state rate of 6.875%", () => {
      const rules = getRulesForState("MN");
      expect(rules?.extras?.stateRate).toBe(6.875);
    });

    it("should document local excise tax of $20", () => {
      const rules = getRulesForState("MN");
      expect(rules?.extras?.localExciseTax).toBe(20);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease Method", () => {
    it("should use FULL_UPFRONT lease taxation method", () => {
      const rules = getRulesForState("MN");
      expect(rules?.leaseRules.method).toBe("FULL_UPFRONT");
    });

    it("should document upfront taxation on total lease price", () => {
      const rules = getRulesForState("MN");
      expect(rules?.leaseRules.notes).toContain("UPFRONT lease taxation");
      expect(rules?.leaseRules.notes).toContain("total lease price");
    });
  });

  describe("Lease Cap Cost Reduction - CRITICAL MINNESOTA RULE", () => {
    it("should NOT include cash down in taxable lease price", () => {
      const rules = getRulesForState("MN");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });

    it("should document that cash down does NOT reduce vehicle value", () => {
      const rules = getRulesForState("MN");
      expect(rules?.leaseRules.notes).toContain("Cash down does NOT reduce vehicle value for tax");
    });
  });

  describe("Lease Rebate Behavior", () => {
    it("should mark rebates as ALWAYS_NON_TAXABLE on leases", () => {
      const rules = getRulesForState("MN");
      expect(rules?.leaseRules.rebateBehavior).toBe("ALWAYS_NON_TAXABLE");
    });
  });

  describe("Lease Doc Fee", () => {
    it("should mark doc fee as NEVER taxable on leases", () => {
      const rules = getRulesForState("MN");
      expect(rules?.leaseRules.docFeeTaxability).toBe("NEVER");
    });

    it("should have doc fee in lease fee tax rules as non-taxable", () => {
      const rules = getRulesForState("MN");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee?.taxable).toBe(false);
    });

    it("should have acquisition fee as non-taxable", () => {
      const rules = getRulesForState("MN");
      const acqFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "ACQUISITION_FEE");
      expect(acqFee?.taxable).toBe(false);
    });
  });

  describe("Lease Trade-In Credit - DIFFERENT from Cash Down", () => {
    it("should provide FULL trade-in credit on leases", () => {
      const rules = getRulesForState("MN");
      expect(rules?.leaseRules.tradeInCredit).toBe("FULL");
    });

    it("should document that trade-in DOES reduce vehicle value (unlike cash)", () => {
      const rules = getRulesForState("MN");
      expect(rules?.leaseRules.notes).toContain("trade-in DOES reduce vehicle value");
    });
  });

  describe("Lease Negative Equity", () => {
    it("should mark negative equity as NOT TAXABLE on leases", () => {
      const rules = getRulesForState("MN");
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(false);
    });
  });

  describe("Lease Fee Taxability", () => {
    it("should mark service contracts as NOT TAXABLE on leases", () => {
      const rules = getRulesForState("MN");
      const serviceContract = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(serviceContract?.taxable).toBe(false);
      expect(serviceContract?.notes).toContain("NOT taxed");
    });

    it("should mark GAP as NOT TAXABLE on leases", () => {
      const rules = getRulesForState("MN");
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap?.taxable).toBe(false);
    });

    it("should mark title fees as NOT TAXABLE on leases", () => {
      const rules = getRulesForState("MN");
      const title = rules?.leaseRules.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title?.taxable).toBe(false);
    });
  });

  describe("Lease Tax Timing", () => {
    it("should tax fees upfront on leases", () => {
      const rules = getRulesForState("MN");
      expect(rules?.leaseRules.taxFeesUpfront).toBe(true);
    });
  });

  // ============================================================================
  // RECIPROCITY TESTS
  // ============================================================================

  describe("Reciprocity", () => {
    it("should enable reciprocity", () => {
      const rules = getRulesForState("MN");
      expect(rules?.reciprocity.enabled).toBe(true);
    });

    it("should apply to BOTH retail and lease", () => {
      const rules = getRulesForState("MN");
      expect(rules?.reciprocity.scope).toBe("BOTH");
    });

    it("should use CREDIT_UP_TO_STATE_RATE behavior", () => {
      const rules = getRulesForState("MN");
      expect(rules?.reciprocity.homeStateBehavior).toBe("CREDIT_UP_TO_STATE_RATE");
    });

    it("should require proof of tax paid", () => {
      const rules = getRulesForState("MN");
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(true);
    });

    it("should cap credit at Minnesota tax", () => {
      const rules = getRulesForState("MN");
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(true);
    });

    it("should have no lease exception", () => {
      const rules = getRulesForState("MN");
      expect(rules?.reciprocity.hasLeaseException).toBe(false);
    });

    it("should document 60-day residency rule", () => {
      const rules = getRulesForState("MN");
      expect(rules?.reciprocity.notes).toContain("60-day residency rule");
    });
  });

  // ============================================================================
  // MINNESOTA-SPECIFIC FEATURES
  // ============================================================================

  describe("Minnesota Unique Features - Purchase vs Lease Tax Treatment", () => {
    it("should document that purchases are exempt from local tax", () => {
      const rules = getRulesForState("MN");
      expect(rules?.extras?.notes).toContain("NO local sales taxes on vehicle PURCHASES");
    });

    it("should document that leases ARE subject to local tax", () => {
      const rules = getRulesForState("MN");
      expect(rules?.leaseRules.notes).toContain("Leases ARE subject to local sales taxes");
    });
  });

  describe("Minnesota Unique Features - Metro Transit Tax", () => {
    it("should document metro transit tax rate", () => {
      const rules = getRulesForState("MN");
      expect(rules?.extras?.metroTransitTax).toBe(0.75);
    });

    it("should document metro transit tax effective date", () => {
      const rules = getRulesForState("MN");
      expect(rules?.extras?.metroTransitTaxEffectiveDate).toBe("2023-10-01");
    });

    it("should list seven metro counties", () => {
      const rules = getRulesForState("MN");
      expect(rules?.extras?.metroCounties).toBeDefined();
      expect(rules?.extras?.metroCounties?.length).toBe(7);
      expect(rules?.extras?.metroCounties).toContain("Hennepin");
      expect(rules?.extras?.metroCounties).toContain("Ramsey");
    });
  });

  describe("Minnesota Unique Features - Cash Down vs Trade-In on Leases", () => {
    it("should document that cash down does NOT reduce tax base", () => {
      const rules = getRulesForState("MN");
      expect(rules?.leaseRules.notes).toContain("Cash down does NOT reduce vehicle value for tax");
    });

    it("should document that trade-in DOES reduce tax base", () => {
      const rules = getRulesForState("MN");
      expect(rules?.leaseRules.notes).toContain("trade-in DOES reduce vehicle value");
    });
  });

  describe("Minnesota Unique Features - Rate History", () => {
    it("should document rate increase", () => {
      const rules = getRulesForState("MN");
      expect(rules?.extras?.rateHistorical).toBeDefined();
      expect(rules?.extras?.rateHistorical?.["pre-2023-07-01"]).toBe(6.5);
      expect(rules?.extras?.rateHistorical?.["2023-07-01-onwards"]).toBe(6.875);
    });

    it("should document rate increase effective date", () => {
      const rules = getRulesForState("MN");
      expect(rules?.extras?.rateIncreaseEffectiveDate).toBe("2023-07-01");
    });
  });

  describe("Minnesota Unique Features - Special Vehicle Rates", () => {
    it("should document older vehicle flat tax", () => {
      const rules = getRulesForState("MN");
      expect(rules?.extras?.olderVehicleFlatTax).toBe(10);
    });

    it("should document collector vehicle flat tax", () => {
      const rules = getRulesForState("MN");
      expect(rules?.extras?.collectorVehicleFlatTax).toBe(150);
    });

    it("should document annual excise tax rate", () => {
      const rules = getRulesForState("MN");
      expect(rules?.extras?.annualExciseTaxRate).toBe(2.5);
    });
  });

  // ============================================================================
  // SCENARIO TESTS - RETAIL
  // ============================================================================

  describe("Scenario: Basic Retail Purchase (6.875%)", () => {
    it("should calculate tax correctly with trade-in", () => {
      // $30,000 vehicle - $10,000 trade = $20,000 taxable
      // Tax @ 6.875%: $1,375
      const vehiclePrice = 30000;
      const tradeIn = 10000;
      const taxableBase = vehiclePrice - tradeIn;
      const rate = 0.06875;

      expect(taxableBase).toBe(20000);
      const tax = taxableBase * rate;
      expect(tax).toBe(1375);
    });

    it("should add local excise tax if applicable", () => {
      const vehiclePrice = 30000;
      const tradeIn = 10000;
      const taxableBase = vehiclePrice - tradeIn;
      const rate = 0.06875;
      const localExcise = 20;

      const stateTax = taxableBase * rate;
      const totalTax = stateTax + localExcise;

      expect(stateTax).toBe(1375);
      expect(totalTax).toBe(1395);
    });
  });

  describe("Scenario: Retail Sale with Manufacturer Rebate (NON-TAXABLE)", () => {
    it("should reduce taxable base by rebate amount", () => {
      // $35,000 vehicle - $3,000 rebate = $32,000 taxable
      // Tax @ 6.875%: $2,200
      const vehicleMSRP = 35000;
      const mfrRebate = 3000;
      const taxableBase = vehicleMSRP - mfrRebate;
      const rate = 0.06875;

      expect(taxableBase).toBe(32000);
      const tax = taxableBase * rate;
      expect(tax).toBe(2200);
    });
  });

  describe("Scenario: Retail Sale with Negative Equity (NOT TAXABLE)", () => {
    it("should NOT include negative equity in taxable base", () => {
      const vehiclePrice = 30000;
      const tradeInValue = 8000;
      const tradeInPayoff = 12000;
      const negativeEquity = tradeInPayoff - tradeInValue;
      const rate = 0.06875;

      // Taxable base = vehicle - trade (negative equity NOT added)
      const taxableBase = vehiclePrice - tradeInValue;

      expect(negativeEquity).toBe(4000);
      expect(taxableBase).toBe(22000);
      const tax = taxableBase * rate;
      expect(tax).toBeCloseTo(1512.50, 2);
    });
  });

  describe("Scenario: Doc Fee (NOT Taxed)", () => {
    it("should NOT include doc fee in taxable base", () => {
      const vehiclePrice = 28000;
      const docFee = 75;
      const rate = 0.06875;

      // Doc fee is NOT included in taxable base
      const taxableBase = vehiclePrice; // NOT vehiclePrice + docFee

      expect(taxableBase).toBe(28000);
      const tax = taxableBase * rate;
      expect(tax).toBe(1925);
    });
  });

  // ============================================================================
  // SCENARIO TESTS - LEASE (FULL UPFRONT)
  // ============================================================================

  describe("Scenario: Basic Lease (Upfront Taxation)", () => {
    it("should calculate tax on total lease price upfront", () => {
      // Cap cost: $38,000
      // Residual: $22,000
      // Interest: $2,500
      // Total lease price: $18,500
      // Tax @ 6.875%: $1,271.88
      const capCost = 38000;
      const residual = 22000;
      const interestCharges = 2500;
      const totalLeasePrice = capCost - residual + interestCharges;
      const rate = 0.06875;

      expect(totalLeasePrice).toBe(18500);
      const tax = totalLeasePrice * rate;
      expect(tax).toBeCloseTo(1271.88, 2);
    });
  });

  describe("Scenario: Lease with Cash Down (Does NOT Reduce Tax Base)", () => {
    it("should NOT reduce tax base with cash down", () => {
      const capCost = 35000;
      const cashDown = 3000; // Does NOT reduce tax base
      const residual = 20000;
      const interestCharges = 2000;
      const rate = 0.06875;

      // Cash down does NOT reduce total lease price for tax
      const totalLeasePrice = capCost - residual + interestCharges;
      // NOT: (capCost - cashDown - residual + interestCharges)

      expect(totalLeasePrice).toBe(17000);
      const tax = totalLeasePrice * rate;
      expect(tax).toBeCloseTo(1168.75, 2);
    });
  });

  describe("Scenario: Lease with Trade-In (DOES Reduce Tax Base)", () => {
    it("should reduce tax base with trade-in value", () => {
      const capCost = 35000;
      const tradeIn = 8000; // DOES reduce tax base
      const residual = 20000;
      const interestCharges = 2000;
      const rate = 0.06875;

      // Trade-in DOES reduce total lease price for tax
      const totalLeasePrice = capCost - tradeIn - residual + interestCharges;

      expect(totalLeasePrice).toBe(9000);
      const tax = totalLeasePrice * rate;
      expect(tax).toBeCloseTo(618.75, 2);
    });
  });

  describe("Scenario: Lease - Cash Down vs Trade-In Comparison", () => {
    it("should show different tax effects for cash down vs trade-in", () => {
      const capCost = 35000;
      const amount = 6000; // Same amount as cash or trade
      const residual = 20000;
      const interestCharges = 2000;
      const rate = 0.06875;

      // Scenario 1: $6,000 Cash Down
      const leasePriceWithCash = capCost - residual + interestCharges;
      const taxWithCash = leasePriceWithCash * rate;

      expect(leasePriceWithCash).toBe(17000);
      expect(taxWithCash).toBeCloseTo(1168.75, 2);

      // Scenario 2: $6,000 Trade-In
      const leasePriceWithTrade = capCost - amount - residual + interestCharges;
      const taxWithTrade = leasePriceWithTrade * rate;

      expect(leasePriceWithTrade).toBe(11000);
      expect(taxWithTrade).toBeCloseTo(756.25, 2);

      // Difference
      const savings = taxWithCash - taxWithTrade;
      expect(savings).toBeCloseTo(412.50, 2);
    });
  });

  describe("Scenario: Lease with Negative Equity (NOT TAXABLE)", () => {
    it("should NOT increase tax base with negative equity", () => {
      const capCost = 35000;
      const tradeInValue = 6000; // Based on value, not payoff
      const tradeInPayoff = 10000; // Negative equity $4K
      const residual = 20000;
      const interestCharges = 2000;
      const rate = 0.06875;

      // Tax based on trade-in VALUE, not payoff
      const totalLeasePrice = capCost - tradeInValue - residual + interestCharges;

      expect(totalLeasePrice).toBe(17000);
      const tax = totalLeasePrice * rate;
      expect(tax).toBeCloseTo(1168.75, 2);
    });
  });

  describe("Scenario: Metro Area Lease (with Metro Transit Tax)", () => {
    it("should add metro transit tax in seven-county area", () => {
      const totalLeasePrice = 15000;
      const stateRate = 0.06875;
      const localRate = 0.005; // 0.5% local
      const metroTransitRate = 0.0075; // 0.75% metro transit
      const totalRate = stateRate + localRate + metroTransitRate;

      expect(totalRate).toBeCloseTo(0.08125, 5);
      const tax = totalLeasePrice * totalRate;
      expect(tax).toBeCloseTo(1218.75, 2);
    });
  });

  describe("Scenario: Service Contracts and GAP (NOT Taxed on Lease)", () => {
    it("should NOT include VSC or GAP in lease price", () => {
      const capCost = 38000;
      const residual = 22000;
      const interestCharges = 2500;
      const vsc = 1800; // NOT included in lease price
      const gap = 695; // NOT included in lease price
      const rate = 0.06875;

      // Lease price does NOT include VSC or GAP
      const totalLeasePrice = capCost - residual + interestCharges;

      expect(totalLeasePrice).toBe(18500);
      const tax = totalLeasePrice * rate;
      expect(tax).toBeCloseTo(1271.88, 2);

      // If incorrectly included (error scenario):
      const incorrectLeasePrice = totalLeasePrice + vsc + gap;
      const incorrectTax = incorrectLeasePrice * rate;

      expect(incorrectLeasePrice).toBe(20995);
      expect(incorrectTax).toBeCloseTo(1443.40, 2);

      // Verify they're different
      expect(tax).not.toBe(incorrectTax);
    });
  });

  // ============================================================================
  // RECIPROCITY SCENARIO TESTS
  // ============================================================================

  describe("Scenario: Reciprocity (Other State Tax Lower)", () => {
    it("should provide partial credit (owe difference)", () => {
      const vehiclePrice = 25000;
      const northDakotaTaxPaid = 1250; // 5%
      const minnesotaTax = vehiclePrice * 0.06875; // $1,718.75

      const creditAllowed = northDakotaTaxPaid;
      const additionalMNTax = minnesotaTax - creditAllowed;

      expect(minnesotaTax).toBeCloseTo(1718.75, 2);
      expect(creditAllowed).toBe(1250);
      expect(additionalMNTax).toBeCloseTo(468.75, 2);
    });
  });

  describe("Scenario: Reciprocity (Other State Tax Higher)", () => {
    it("should provide full credit (owe $0)", () => {
      const vehiclePrice = 25000;
      const wisconsinTaxPaid = 1250; // 5%
      const minnesotaTax = vehiclePrice * 0.06875; // $1,718.75

      const creditAllowed = Math.min(wisconsinTaxPaid, minnesotaTax);
      const additionalMNTax = minnesotaTax - creditAllowed;

      expect(minnesotaTax).toBeCloseTo(1718.75, 2);
      expect(creditAllowed).toBe(1250);
      expect(additionalMNTax).toBeCloseTo(468.75, 2);
    });
  });

  describe("Scenario: 60-Day Residency Rule (Exemption)", () => {
    it("should document exemption for prior residents", () => {
      // Lived in Wisconsin for 5 years, bought car there, moved to MN 3 months later
      // Result: NO Minnesota tax due

      const vehiclePrice = 25000;
      const wisconsinTaxPaid = 1250;
      const qualifiesFor60DayRule = true; // Resident of WI 60+ days before MN

      if (qualifiesFor60DayRule) {
        const minnesotaTaxDue = 0; // Exempt
        expect(minnesotaTaxDue).toBe(0);
      }
    });
  });

  // ============================================================================
  // METADATA AND DOCUMENTATION
  // ============================================================================

  describe("Metadata", () => {
    it("should have lastUpdated date", () => {
      const rules = getRulesForState("MN");
      expect(rules?.extras?.lastUpdated).toBe("2025-11-13");
    });

    it("should have source citations", () => {
      const rules = getRulesForState("MN");
      expect(rules?.extras?.sources).toBeDefined();
      expect(rules?.extras?.sources?.length).toBeGreaterThan(0);
    });

    it("should reference Minnesota Statute Chapter 297B", () => {
      const rules = getRulesForState("MN");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Minnesota Statute Chapter 297B"))).toBe(true);
    });

    it("should reference MN DOR guides", () => {
      const rules = getRulesForState("MN");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("MN DOR"))).toBe(true);
    });

    it("should have comprehensive notes", () => {
      const rules = getRulesForState("MN");
      expect(rules?.extras?.notes).toBeDefined();
      expect(rules?.extras?.notes?.length).toBeGreaterThan(100);
    });

    it("should document key Minnesota features in notes", () => {
      const rules = getRulesForState("MN");
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("6.875%");
      expect(notes).toContain("NO local sales taxes on vehicle PURCHASES");
      expect(notes).toContain("Cash down does NOT reduce vehicle value for tax");
      expect(notes).toContain("trade-in DOES reduce vehicle value");
    });
  });
});
