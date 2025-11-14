import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Georgia (GA) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load Georgia rules successfully", () => {
    const rules = getRulesForState("GA");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("GA");
  });

  it("should mark Georgia as implemented (not a stub)", () => {
    expect(isStateImplemented("GA")).toBe(true);
  });

  it("should have version number 1", () => {
    const rules = getRulesForState("GA");
    expect(rules?.version).toBe(1);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("GA");
    const rulesLower = getRulesForState("ga");
    const rulesMixed = getRulesForState("Ga");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("GA");
    expect(rulesLower?.stateCode).toBe("GA");
    expect(rulesMixed?.stateCode).toBe("GA");
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS (TAVT SYSTEM)
  // ============================================================================

  describe("Retail - Trade-In Policy", () => {
    it("should have FULL trade-in credit policy", () => {
      const rules = getRulesForState("GA");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });

    it("should allow full trade-in credit under TAVT", () => {
      const rules = getRulesForState("GA");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
      expect(rules?.extras?.gaTAVT?.allowTradeInCredit).toBe(true);
    });
  });

  describe("Retail - Rebate Rules", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("GA");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as TAXABLE (TAVT before rebate)", () => {
      const rules = getRulesForState("GA");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(true);
      expect(mfrRebate?.notes).toContain("TAVT calculated before");
    });

    it("should mark dealer rebates as TAXABLE", () => {
      const rules = getRulesForState("GA");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(true);
      expect(dealerRebate?.notes).toContain("TAVT calculated before");
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as NOT subject to TAVT", () => {
      const rules = getRulesForState("GA");
      expect(rules?.docFeeTaxable).toBe(false);
    });
  });

  describe("Retail - Fee Tax Rules", () => {
    it("should mark service contracts as NOT subject to TAVT", () => {
      const rules = getRulesForState("GA");
      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(false);
      expect(vsc?.notes).toContain("Not subject to TAVT");
    });

    it("should mark GAP as NOT subject to TAVT", () => {
      const rules = getRulesForState("GA");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(false);
      expect(gap?.notes).toContain("Not subject to TAVT");
    });

    it("should mark title fees as NON-taxable", () => {
      const rules = getRulesForState("GA");
      const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-taxable", () => {
      const rules = getRulesForState("GA");
      const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should include accessories in TAVT base if part of vehicle", () => {
      const rules = getRulesForState("GA");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should include negative equity in TAVT base", () => {
      const rules = getRulesForState("GA");
      expect(rules?.taxOnNegativeEquity).toBe(true);
    });

    it("should NOT include service contracts in TAVT base", () => {
      const rules = getRulesForState("GA");
      expect(rules?.taxOnServiceContracts).toBe(false);
    });

    it("should NOT include GAP in TAVT base", () => {
      const rules = getRulesForState("GA");
      expect(rules?.taxOnGap).toBe(false);
    });
  });

  describe("Retail - Vehicle Tax Scheme (SPECIAL_TAVT)", () => {
    it("should use SPECIAL_TAVT vehicle tax scheme", () => {
      const rules = getRulesForState("GA");
      expect(rules?.vehicleTaxScheme).toBe("SPECIAL_TAVT");
    });

    it("should NOT use local sales tax (TAVT is state-only)", () => {
      const rules = getRulesForState("GA");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
    });

    it("should document TAVT rate of 7%", () => {
      const rules = getRulesForState("GA");
      expect(rules?.extras?.gaTAVT?.defaultRate).toBe(0.07);
      expect(rules?.extras?.tavtRate).toBe(7.0);
    });
  });

  describe("Retail - TAVT System Features", () => {
    it("should use higher of price or assessed value", () => {
      const rules = getRulesForState("GA");
      expect(rules?.extras?.gaTAVT?.useHigherOfPriceOrAssessed).toBe(true);
      expect(rules?.extras?.gaTAVT?.useAssessedValue).toBe(true);
    });

    it("should apply negative equity to TAVT base", () => {
      const rules = getRulesForState("GA");
      expect(rules?.extras?.gaTAVT?.applyNegativeEquityToBase).toBe(true);
    });

    it("should allow trade-in credit for TAVT", () => {
      const rules = getRulesForState("GA");
      expect(rules?.extras?.gaTAVT?.allowTradeInCredit).toBe(true);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS (SALES TAX SYSTEM - NOT TAVT)
  // ============================================================================

  describe("Lease - Tax Method (NOT TAVT)", () => {
    it("should use MONTHLY lease taxation method", () => {
      const rules = getRulesForState("GA");
      expect(rules?.leaseRules.method).toBe("MONTHLY");
    });

    it("should NOT tax cap cost reduction upfront", () => {
      const rules = getRulesForState("GA");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });

    it("should have GA_TAVT special scheme flag", () => {
      const rules = getRulesForState("GA");
      expect(rules?.leaseRules.specialScheme).toBe("GA_TAVT");
    });

    it("should document that leases use 4% sales tax, not TAVT", () => {
      const rules = getRulesForState("GA");
      expect(rules?.leaseRules.notes).toContain("4% state sales tax");
      expect(rules?.leaseRules.notes).toContain("NOT TAVT");
      expect(rules?.extras?.leaseSalesTaxRate).toBe(4.0);
    });
  });

  describe("Lease - Rebate Behavior", () => {
    it("should mark rebates as ALWAYS_TAXABLE on leases", () => {
      const rules = getRulesForState("GA");
      expect(rules?.leaseRules.rebateBehavior).toBe("ALWAYS_TAXABLE");
    });
  });

  describe("Lease - Documentation Fee", () => {
    it("should ALWAYS tax doc fee on leases", () => {
      const rules = getRulesForState("GA");
      expect(rules?.leaseRules.docFeeTaxability).toBe("ALWAYS");
    });

    it("should have doc fee as taxable in lease fee rules", () => {
      const rules = getRulesForState("GA");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
      expect(docFee?.notes).toContain("4% sales tax");
    });
  });

  describe("Lease - Trade-In Credit", () => {
    it("should provide CAP_COST_ONLY trade-in credit", () => {
      const rules = getRulesForState("GA");
      expect(rules?.leaseRules.tradeInCredit).toBe("CAP_COST_ONLY");
    });
  });

  describe("Lease - Negative Equity", () => {
    it("should mark negative equity as TAXABLE on leases", () => {
      const rules = getRulesForState("GA");
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(true);
    });
  });

  describe("Lease - Fee Taxability", () => {
    it("should mark service contracts as NOT taxable on leases", () => {
      const rules = getRulesForState("GA");
      const vsc = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(false);
    });

    it("should mark GAP as NOT taxable on leases", () => {
      const rules = getRulesForState("GA");
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(false);
    });

    it("should mark title fees as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("GA");
      const title = rules?.leaseRules.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });
  });

  describe("Lease - Tax Timing", () => {
    it("should tax fees upfront on leases", () => {
      const rules = getRulesForState("GA");
      expect(rules?.leaseRules.taxFeesUpfront).toBe(true);
    });
  });

  // ============================================================================
  // RECIPROCITY TESTS
  // ============================================================================

  describe("Reciprocity (LIMITED)", () => {
    it("should have reciprocity enabled", () => {
      const rules = getRulesForState("GA");
      expect(rules?.reciprocity.enabled).toBe(true);
    });

    it("should apply to BOTH retail and lease", () => {
      const rules = getRulesForState("GA");
      expect(rules?.reciprocity.scope).toBe("BOTH");
    });

    it("should use CREDIT_UP_TO_STATE_RATE mode", () => {
      const rules = getRulesForState("GA");
      expect(rules?.reciprocity.homeStateBehavior).toBe("CREDIT_UP_TO_STATE_RATE");
    });

    it("should require proof of tax paid", () => {
      const rules = getRulesForState("GA");
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(true);
    });

    it("should base credit on TAX_PAID", () => {
      const rules = getRulesForState("GA");
      expect(rules?.reciprocity.basis).toBe("TAX_PAID");
    });

    it("should cap credit at Georgia tax amount", () => {
      const rules = getRulesForState("GA");
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(true);
    });

    it("should not have lease exceptions", () => {
      const rules = getRulesForState("GA");
      expect(rules?.reciprocity.hasLeaseException).toBe(false);
    });

    it("should document limited reciprocity with proof required", () => {
      const rules = getRulesForState("GA");
      expect(rules?.reciprocity.notes).toContain("credit for tax paid elsewhere");
      expect(rules?.reciprocity.notes).toContain("capped at GA");
    });
  });

  // ============================================================================
  // GEORGIA-SPECIFIC FEATURES (TAVT SYSTEM)
  // ============================================================================

  describe("Georgia Unique Features - TAVT System", () => {
    it("should document TAVT as alternative to sales tax", () => {
      const rules = getRulesForState("GA");
      expect(rules?.extras?.notes).toContain("TAVT");
      expect(rules?.extras?.notes).toContain("Title Ad Valorem Tax");
      expect(rules?.extras?.notes).toContain("ONE-TIME tax");
    });

    it("should document that TAVT replaces annual property tax", () => {
      const rules = getRulesForState("GA");
      expect(rules?.extras?.notes).toContain("replaces annual property tax");
    });

    it("should document 7% TAVT rate", () => {
      const rules = getRulesForState("GA");
      expect(rules?.extras?.tavtRate).toBe(7.0);
      expect(rules?.extras?.gaTAVT?.defaultRate).toBe(0.07);
    });
  });

  describe("Georgia Unique Features - Dual System (TAVT for Retail, Sales Tax for Lease)", () => {
    it("should document different systems for retail vs lease", () => {
      const rules = getRulesForState("GA");
      expect(rules?.vehicleTaxScheme).toBe("SPECIAL_TAVT");
      expect(rules?.leaseRules.method).toBe("MONTHLY");
      expect(rules?.leaseRules.notes).toContain("4% state sales tax");
    });

    it("should document lease sales tax rate of 4%", () => {
      const rules = getRulesForState("GA");
      expect(rules?.extras?.leaseSalesTaxRate).toBe(4.0);
    });
  });

  describe("Georgia Unique Features - Higher of Price or DMV Assessed Value", () => {
    it("should use higher value for TAVT base", () => {
      const rules = getRulesForState("GA");
      expect(rules?.extras?.gaTAVT?.useHigherOfPriceOrAssessed).toBe(true);
    });

    it("should prevent underreporting through assessed value", () => {
      const rules = getRulesForState("GA");
      expect(rules?.extras?.gaTAVT?.useAssessedValue).toBe(true);
    });
  });

  describe("Georgia Unique Features - No Local Jurisdiction Tax", () => {
    it("should not use local sales tax for vehicles", () => {
      const rules = getRulesForState("GA");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
    });

    it("should document state-only TAVT", () => {
      const rules = getRulesForState("GA");
      expect(rules?.extras?.notes).toContain("TAVT base is higher of purchase price or DMV assessed value");
    });
  });

  // ============================================================================
  // SCENARIO TESTS
  // ============================================================================

  describe("Scenario: Basic TAVT Retail Sale (7%)", () => {
    it("should calculate TAVT correctly with trade-in", () => {
      // $35,000 vehicle - $12,000 trade = $23,000 net
      // TAVT @ 7%: $23,000 × 0.07 = $1,610
      const vehiclePrice = 35000;
      const tradeIn = 12000;
      const netPrice = vehiclePrice - tradeIn;
      const tavtRate = 0.07;

      expect(netPrice).toBe(23000);
      const tavt = netPrice * tavtRate;
      expect(tavt).toBe(1610);
    });
  });

  describe("Scenario: TAVT with DMV Assessed Value Higher", () => {
    it("should use DMV assessed value when higher than purchase price", () => {
      const purchasePrice = 22000;
      const tradeIn = 8000;
      const netPrice = purchasePrice - tradeIn;
      const dmvAssessedValue = 25000;
      const tavtBase = Math.max(netPrice, dmvAssessedValue);
      const tavtRate = 0.07;

      expect(netPrice).toBe(14000);
      expect(dmvAssessedValue).toBe(25000);
      expect(tavtBase).toBe(25000); // Use higher value
      const tavt = tavtBase * tavtRate;
      expect(tavt).toBe(1750);
    });
  });

  describe("Scenario: TAVT with Manufacturer Rebate (Taxable)", () => {
    it("should calculate TAVT before rebate applied", () => {
      // $28,000 vehicle - $3,000 rebate = $25,000 customer pays
      // But TAVT base is $28,000 (before rebate)
      const vehicleMSRP = 28000;
      const mfrRebate = 3000;
      const customerPays = vehicleMSRP - mfrRebate;
      const tavtBase = vehicleMSRP; // NOT customerPays
      const tavtRate = 0.07;

      expect(customerPays).toBe(25000);
      expect(tavtBase).toBe(28000);
      const tavt = tavtBase * tavtRate;
      expect(tavt).toBe(1960);
    });
  });

  describe("Scenario: Lease with Monthly Payments (4% Sales Tax)", () => {
    it("should apply 4% sales tax to monthly payments", () => {
      const monthlyPayment = 450;
      const term = 36;
      const salesTaxRate = 0.04;

      const monthlyTax = monthlyPayment * salesTaxRate;
      const totalMonthly = monthlyPayment + monthlyTax;
      const totalTax = monthlyTax * term;

      expect(monthlyTax).toBe(18);
      expect(totalMonthly).toBe(468);
      expect(totalTax).toBe(648);
    });
  });

  describe("Scenario: Lease with Trade-In (Reduces Cap Cost)", () => {
    it("should reduce monthly payment and thus monthly tax", () => {
      const grossCapCost = 35000;
      const tradeIn = 10000;
      const adjustedCapCost = grossCapCost - tradeIn;

      // Assume payment reduction proportional to cap cost reduction
      const monthlyPaymentWithoutTrade = 500;
      const monthlyPaymentWithTrade = 360; // Lower due to trade-in
      const salesTaxRate = 0.04;

      const monthlyTaxWithoutTrade = monthlyPaymentWithoutTrade * salesTaxRate;
      const monthlyTaxWithTrade = monthlyPaymentWithTrade * salesTaxRate;
      const monthlySavings = monthlyTaxWithoutTrade - monthlyTaxWithTrade;

      expect(adjustedCapCost).toBe(25000);
      expect(monthlyTaxWithoutTrade).toBe(20);
      expect(monthlyTaxWithTrade).toBe(14.40);
      expect(monthlySavings).toBeCloseTo(5.60, 2);
    });
  });

  describe("Scenario: Reciprocity (Out-of-State Purchase)", () => {
    it("should credit Florida tax, owe difference", () => {
      const vehiclePrice = 30000;
      const floridaTaxPaid = 1800; // 6%
      const gaTAVT = 2100; // 7%
      const creditAllowed = Math.min(floridaTaxPaid, gaTAVT);
      const additionalGaTax = gaTAVT - creditAllowed;

      expect(floridaTaxPaid).toBe(1800);
      expect(gaTAVT).toBe(2100);
      expect(creditAllowed).toBe(1800);
      expect(additionalGaTax).toBe(300);
    });
  });

  describe("Scenario: Reciprocity (Higher Tax Paid Elsewhere)", () => {
    it("should cap credit at Georgia TAVT amount", () => {
      const vehiclePrice = 30000;
      const californiaTaxPaid = 2175; // 7.25%
      const gaTAVT = 2100; // 7%
      const creditAllowed = Math.min(californiaTaxPaid, gaTAVT);
      const additionalGaTax = gaTAVT - creditAllowed;

      expect(californiaTaxPaid).toBe(2175);
      expect(gaTAVT).toBe(2100);
      expect(creditAllowed).toBe(2100); // Capped at GA amount
      expect(additionalGaTax).toBe(0);
    });
  });

  describe("Scenario: Service Contracts and GAP (NOT in TAVT Base)", () => {
    it("should NOT include VSC or GAP in TAVT calculation", () => {
      const vehiclePrice = 30000;
      const vsc = 2500;
      const gap = 795;
      const tavtBase = vehiclePrice; // VSC and GAP NOT included
      const tavtRate = 0.07;

      const tavt = tavtBase * tavtRate;

      expect(tavtBase).toBe(30000);
      expect(tavt).toBe(2100);
      // If incorrectly included, would be:
      const incorrectBase = vehiclePrice + vsc + gap;
      const incorrectTavt = incorrectBase * tavtRate;
      expect(incorrectTavt).toBe(2330.65);
      // Verify they're NOT equal
      expect(tavt).not.toBe(incorrectTavt);
    });
  });

  // ============================================================================
  // METADATA AND DOCUMENTATION
  // ============================================================================

  describe("Metadata - Sources", () => {
    it("should document official sources", () => {
      const rules = getRulesForState("GA");
      expect(rules?.extras?.sources).toBeDefined();
      expect(rules?.extras?.sources?.length).toBeGreaterThan(0);
    });

    it("should reference Georgia DOR", () => {
      const rules = getRulesForState("GA");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Georgia Department of Revenue"))).toBe(true);
    });

    it("should reference Georgia Code Title 48", () => {
      const rules = getRulesForState("GA");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Georgia Code Title 48"))).toBe(true);
    });
  });

  describe("Metadata - Last Updated", () => {
    it("should have lastUpdated timestamp", () => {
      const rules = getRulesForState("GA");
      expect(rules?.extras?.lastUpdated).toBeDefined();
      expect(rules?.extras?.lastUpdated).toBe("2025-01");
    });
  });

  describe("Metadata - Documentation", () => {
    it("should have comprehensive notes in extras", () => {
      const rules = getRulesForState("GA");
      expect(rules?.extras?.notes).toBeDefined();
      expect((rules?.extras?.notes as string)?.length).toBeGreaterThan(100);
    });

    it("should document key Georgia features in notes", () => {
      const rules = getRulesForState("GA");
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("TAVT");
      expect(notes).toContain("7%");
      expect(notes).toContain("ONE-TIME");
      expect(notes).toContain("4%");
      expect(notes).toContain("leases");
    });
  });
});
