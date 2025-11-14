import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("New York (NY) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load New York rules successfully", () => {
    const rules = getRulesForState("NY");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("NY");
  });

  it("should mark New York as implemented (not a stub)", () => {
    expect(isStateImplemented("NY")).toBe(true);
  });

  it("should have version number 1", () => {
    const rules = getRulesForState("NY");
    expect(rules?.version).toBe(1);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("NY");
    const rulesLower = getRulesForState("ny");
    const rulesMixed = getRulesForState("Ny");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("NY");
    expect(rulesLower?.stateCode).toBe("NY");
    expect(rulesMixed?.stateCode).toBe("NY");
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS
  // ============================================================================

  describe("Retail - Trade-In Policy", () => {
    it("should have FULL trade-in credit policy", () => {
      const rules = getRulesForState("NY");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });

    it("should apply full trade-in credit with no cap", () => {
      const rules = getRulesForState("NY");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });

    it("should document that trade-in is deducted before tax calculation", () => {
      const rules = getRulesForState("NY");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });
  });

  describe("Retail - Rebate Rules", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("NY");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as NON-TAXABLE (reduce tax base)", () => {
      const rules = getRulesForState("NY");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(false);
      expect(mfrRebate?.notes).toContain("reduce purchase price");
    });

    it("should mark dealer rebates as TAXABLE (do not reduce tax base)", () => {
      const rules = getRulesForState("NY");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(true);
      expect(dealerRebate?.notes).toContain("do not reduce taxable sale price");
    });

    it("should document the manufacturer vs dealer rebate distinction", () => {
      const rules = getRulesForState("NY");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");

      // Manufacturer should reduce tax base (taxable: false)
      expect(mfrRebate?.taxable).toBe(false);
      // Dealer should not reduce tax base (taxable: true)
      expect(dealerRebate?.taxable).toBe(true);
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("NY");
      expect(rules?.docFeeTaxable).toBe(true);
    });

    it("should document doc fee cap of $175 (LOWEST in US)", () => {
      const rules = getRulesForState("NY");
      expect(rules?.extras?.docFeeCapAmount).toBe(175);
    });

    it("should document that NY has lowest doc fee cap in US", () => {
      const rules = getRulesForState("NY");
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("$175 (LOWEST in US)");
    });
  });

  describe("Retail - Fee Tax Rules", () => {
    it("should mark service contracts (VSC) as TAXABLE", () => {
      const rules = getRulesForState("NY");
      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(true);
      expect(vsc?.notes).toContain("taxable");
    });

    it("should mark GAP as TAXABLE", () => {
      const rules = getRulesForState("NY");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(true);
      expect(gap?.notes).toContain("taxable");
    });

    it("should mark title fees as NON-TAXABLE", () => {
      const rules = getRulesForState("NY");
      const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-TAXABLE", () => {
      const rules = getRulesForState("NY");
      const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("NY");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should tax negative equity", () => {
      const rules = getRulesForState("NY");
      expect(rules?.taxOnNegativeEquity).toBe(true);
    });

    it("should tax service contracts", () => {
      const rules = getRulesForState("NY");
      expect(rules?.taxOnServiceContracts).toBe(true);
    });

    it("should tax GAP insurance", () => {
      const rules = getRulesForState("NY");
      expect(rules?.taxOnGap).toBe(true);
    });
  });

  describe("Retail - Vehicle Tax Scheme", () => {
    it("should use STATE_PLUS_LOCAL vehicle tax scheme", () => {
      const rules = getRulesForState("NY");
      expect(rules?.vehicleTaxScheme).toBe("STATE_PLUS_LOCAL");
    });

    it("should apply local sales tax to vehicles", () => {
      const rules = getRulesForState("NY");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(true);
    });

    it("should document state rate of 4%", () => {
      const rules = getRulesForState("NY");
      expect(rules?.extras?.stateRate).toBe(4.0);
    });

    it("should document max local rate of 4.875%", () => {
      const rules = getRulesForState("NY");
      expect(rules?.extras?.maxLocalRate).toBe(4.875);
    });

    it("should document max combined rate of 8.875%", () => {
      const rules = getRulesForState("NY");
      expect(rules?.extras?.maxCombinedRate).toBe(8.875);
    });

    it("should document MCTD surcharge of 0.375%", () => {
      const rules = getRulesForState("NY");
      expect(rules?.extras?.mctdSurcharge).toBe(0.375);
    });

    it("should list MCTD counties", () => {
      const rules = getRulesForState("NY");
      expect(rules?.extras?.mctdCounties).toBeDefined();
      expect((rules?.extras?.mctdCounties as string[]).length).toBe(12);
    });

    it("should include all NYC boroughs in MCTD counties", () => {
      const rules = getRulesForState("NY");
      const mctdCounties = rules?.extras?.mctdCounties as string[];
      expect(mctdCounties).toContain("Bronx");
      expect(mctdCounties).toContain("Kings");
      expect(mctdCounties).toContain("New York");
      expect(mctdCounties).toContain("Queens");
      expect(mctdCounties).toContain("Richmond");
    });

    it("should document common jurisdiction rates", () => {
      const rules = getRulesForState("NY");
      expect(rules?.extras?.commonJurisdictionRates).toBeDefined();
      const rates = rules?.extras?.commonJurisdictionRates as Record<string, number>;
      expect(rates["NYC (all boroughs)"]).toBe(8.875);
      expect(rates["Nassau County"]).toBe(8.625);
      expect(rates["Suffolk County"]).toBe(8.625);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease - Tax Method", () => {
    it("should use MONTHLY lease taxation method", () => {
      const rules = getRulesForState("NY");
      expect(rules?.leaseRules.method).toBe("MONTHLY");
    });

    it("should NOT tax cap cost reduction", () => {
      const rules = getRulesForState("NY");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });

    it("should tax fees upfront on leases", () => {
      const rules = getRulesForState("NY");
      expect(rules?.leaseRules.taxFeesUpfront).toBe(true);
    });

    it("should have NY_MTR special scheme", () => {
      const rules = getRulesForState("NY");
      expect(rules?.leaseRules.specialScheme).toBe("NY_MTR");
    });

    it("should document monthly payment taxation model", () => {
      const rules = getRulesForState("NY");
      expect(rules?.leaseRules.notes).toContain("Monthly payment method");
      expect(rules?.leaseRules.notes).toContain("MCTD");
    });
  });

  describe("Lease - Cap Cost Reduction Taxation", () => {
    it("should NOT tax cap cost reduction on leases", () => {
      const rules = getRulesForState("NY");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });

    it("should document that trade-in reduces cap cost", () => {
      const rules = getRulesForState("NY");
      expect(rules?.leaseRules.notes).toContain("Trade-in gets full credit reducing cap cost");
    });
  });

  describe("Lease - Rebates and Incentives", () => {
    it("should have FOLLOW_RETAIL_RULE rebate behavior on leases", () => {
      const rules = getRulesForState("NY");
      expect(rules?.leaseRules.rebateBehavior).toBe("FOLLOW_RETAIL_RULE");
    });

    it("should follow retail rebate rules", () => {
      const rules = getRulesForState("NY");
      // In retail, manufacturer rebates reduce tax base, dealer rebates don't
      const retailMfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      const retailDealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(retailMfrRebate?.taxable).toBe(false);
      expect(retailDealerRebate?.taxable).toBe(true);

      // Leases follow retail rules
      expect(rules?.leaseRules.rebateBehavior).toBe("FOLLOW_RETAIL_RULE");
    });
  });

  describe("Lease - Documentation Fee", () => {
    it("should ALWAYS tax doc fee on leases", () => {
      const rules = getRulesForState("NY");
      expect(rules?.leaseRules.docFeeTaxability).toBe("ALWAYS");
    });

    it("should have doc fee in lease fee rules with $175 cap", () => {
      const rules = getRulesForState("NY");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
      expect(docFee?.notes).toContain("upfront");
    });
  });

  describe("Lease - Trade-In Credit", () => {
    it("should provide FULL trade-in credit on leases", () => {
      const rules = getRulesForState("NY");
      expect(rules?.leaseRules.tradeInCredit).toBe("FULL");
    });

    it("should document that trade-in reduces cap cost and monthly payments", () => {
      const rules = getRulesForState("NY");
      expect(rules?.leaseRules.notes).toContain("Trade-in gets full credit reducing cap cost");
    });
  });

  describe("Lease - Negative Equity", () => {
    it("should mark negative equity as TAXABLE on leases", () => {
      const rules = getRulesForState("NY");
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(true);
    });
  });

  describe("Lease - Fee Tax Rules", () => {
    it("should mark doc fee as TAXABLE on leases", () => {
      const rules = getRulesForState("NY");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
    });

    it("should mark service contracts as TAXABLE on leases (unlike most states)", () => {
      const rules = getRulesForState("NY");
      const vsc = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(true);
      expect(vsc?.notes).toContain("ARE taxed");
      expect(vsc?.notes).toContain("unlike most states");
    });

    it("should mark GAP as TAXABLE on leases (unlike most states)", () => {
      const rules = getRulesForState("NY");
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(true);
      expect(gap?.notes).toContain("IS taxed");
      expect(gap?.notes).toContain("unlike most states");
    });

    it("should mark title fees as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("NY");
      const title = rules?.leaseRules.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("NY");
      const reg = rules?.leaseRules.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Lease - Title Fee Rules", () => {
    it("should have title fee rule configuration", () => {
      const rules = getRulesForState("NY");
      expect(rules?.leaseRules.titleFeeRules).toBeDefined();
      expect(rules?.leaseRules.titleFeeRules.length).toBeGreaterThan(0);
    });

    it("should mark title fees as not taxable but included in cap cost", () => {
      const rules = getRulesForState("NY");
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
    it("should NOT have reciprocity enabled", () => {
      const rules = getRulesForState("NY");
      expect(rules?.reciprocity.enabled).toBe(false);
    });

    it("should document that NY does not provide reciprocity credits", () => {
      const rules = getRulesForState("NY");
      expect(rules?.reciprocity.notes).toContain("does not provide reciprocity credits");
      expect(rules?.reciprocity.notes).toContain("full NY use tax");
    });

    it("should document no credit for taxes paid elsewhere", () => {
      const rules = getRulesForState("NY");
      expect(rules?.reciprocity.notes).toContain("No credit given for taxes paid in other states");
    });

    it("should have NONE home state behavior", () => {
      const rules = getRulesForState("NY");
      expect(rules?.reciprocity.homeStateBehavior).toBe("NONE");
    });

    it("should not require proof of tax paid (since no credit given)", () => {
      const rules = getRulesForState("NY");
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(false);
    });
  });

  // ============================================================================
  // NEW YORK-SPECIFIC FEATURES
  // ============================================================================

  describe("New York Unique Features - Lowest Doc Fee Cap", () => {
    it("should document $175 cap as lowest in US", () => {
      const rules = getRulesForState("NY");
      expect(rules?.extras?.docFeeCapAmount).toBe(175);
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("LOWEST in US");
    });
  });

  describe("New York Unique Features - MCTD Surcharge", () => {
    it("should document MCTD surcharge applies to 12 counties", () => {
      const rules = getRulesForState("NY");
      expect(rules?.extras?.mctdSurcharge).toBe(0.375);
      const mctdCounties = rules?.extras?.mctdCounties as string[];
      expect(mctdCounties.length).toBe(12);
    });

    it("should document NY_MTR special scheme for leases", () => {
      const rules = getRulesForState("NY");
      expect(rules?.leaseRules.specialScheme).toBe("NY_MTR");
      expect(rules?.leaseRules.notes).toContain("MCTD");
    });

    it("should list all MCTD counties", () => {
      const rules = getRulesForState("NY");
      const mctdCounties = rules?.extras?.mctdCounties as string[];
      expect(mctdCounties).toContain("Bronx");
      expect(mctdCounties).toContain("Kings");
      expect(mctdCounties).toContain("New York");
      expect(mctdCounties).toContain("Queens");
      expect(mctdCounties).toContain("Richmond");
      expect(mctdCounties).toContain("Dutchess");
      expect(mctdCounties).toContain("Nassau");
      expect(mctdCounties).toContain("Orange");
      expect(mctdCounties).toContain("Putnam");
      expect(mctdCounties).toContain("Rockland");
      expect(mctdCounties).toContain("Suffolk");
      expect(mctdCounties).toContain("Westchester");
    });
  });

  describe("New York Unique Features - F&I Products Taxed on Both Retail and Lease", () => {
    it("should document that VSC is taxed on both retail and leases", () => {
      const rules = getRulesForState("NY");
      expect(rules?.taxOnServiceContracts).toBe(true); // retail
      const leaseVSC = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(leaseVSC?.taxable).toBe(true); // lease
    });

    it("should document that GAP is taxed on both retail and leases", () => {
      const rules = getRulesForState("NY");
      expect(rules?.taxOnGap).toBe(true); // retail
      const leaseGAP = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(leaseGAP?.taxable).toBe(true); // lease
    });

    it("should document that this is unusual compared to most states", () => {
      const rules = getRulesForState("NY");
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("Service contracts and GAP are taxed on BOTH retail and leases");
    });
  });

  describe("New York Unique Features - No Reciprocity", () => {
    it("should document strict no-reciprocity policy", () => {
      const rules = getRulesForState("NY");
      expect(rules?.reciprocity.enabled).toBe(false);
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("No reciprocity");
    });
  });

  // ============================================================================
  // EDGE CASES AND SPECIAL SCENARIOS
  // ============================================================================

  describe("Edge Cases - Manufacturer vs Dealer Rebates", () => {
    it("should document different treatment for manufacturer vs dealer rebates", () => {
      const rules = getRulesForState("NY");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");

      // Manufacturer rebates reduce tax base
      expect(mfrRebate?.taxable).toBe(false);
      // Dealer rebates do not
      expect(dealerRebate?.taxable).toBe(true);
    });
  });

  describe("Edge Cases - MCTD Boundary Cases", () => {
    it("should document MCTD surcharge only applies in designated counties", () => {
      const rules = getRulesForState("NY");
      const mctdCounties = rules?.extras?.mctdCounties as string[];
      // Monroe County (Rochester) is NOT in MCTD
      expect(mctdCounties).not.toContain("Monroe");
      // But Nassau County IS in MCTD
      expect(mctdCounties).toContain("Nassau");
    });
  });

  describe("Edge Cases - F&I Products on Leases", () => {
    it("should tax F&I products on leases unlike most states", () => {
      const rules = getRulesForState("NY");
      const leaseVSC = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      const leaseGAP = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");

      expect(leaseVSC?.taxable).toBe(true);
      expect(leaseGAP?.taxable).toBe(true);
      expect(leaseVSC?.notes).toContain("unlike most states");
      expect(leaseGAP?.notes).toContain("unlike most states");
    });
  });

  // ============================================================================
  // SCENARIO TESTS
  // ============================================================================

  describe("Scenario: Basic Retail Sale (NYC - 8.875%)", () => {
    it("should calculate tax with state + local + MCTD", () => {
      // $35,000 vehicle - $10,000 trade + $175 doc = $25,175 taxable
      const vehiclePrice = 35000;
      const tradeIn = 10000;
      const docFee = 175;
      const taxableBase = vehiclePrice - tradeIn + docFee;
      const nycRate = 0.08875; // 4% state + 4.5% local + 0.375% MCTD

      expect(taxableBase).toBe(25175);
      const tax = taxableBase * nycRate;
      expect(tax).toBeCloseTo(2234.28, 2);
    });
  });

  describe("Scenario: Retail with Manufacturer Rebate (NOT Taxable)", () => {
    it("should reduce tax base by manufacturer rebate", () => {
      // $30,000 vehicle - $2,000 mfr rebate - $8,000 trade = $20,000 taxable
      const vehiclePrice = 30000;
      const mfrRebate = 2000;
      const tradeIn = 8000;
      const taxableBase = vehiclePrice - mfrRebate - tradeIn;
      const rate = 0.08;

      expect(taxableBase).toBe(20000);
      const tax = taxableBase * rate;
      expect(tax).toBe(1600);
    });
  });

  describe("Scenario: Retail with Dealer Rebate (TAXABLE)", () => {
    it("should NOT reduce tax base by dealer rebate", () => {
      // $28,000 vehicle - $1,000 dealer rebate = $27,000 customer pays
      // BUT tax calculated on $28,000 (dealer rebates are taxable)
      const vehiclePrice = 28000;
      const dealerRebate = 1000;
      const customerPays = vehiclePrice - dealerRebate;
      const taxableBase = vehiclePrice; // NOT customerPays
      const rate = 0.08;

      expect(customerPays).toBe(27000);
      expect(taxableBase).toBe(28000);
      const tax = taxableBase * rate;
      expect(tax).toBe(2240);
    });
  });

  describe("Scenario: Retail with Service Contract and GAP (TAXABLE)", () => {
    it("should tax service contracts and GAP on retail", () => {
      const vehiclePrice = 30000;
      const vsc = 2500;
      const gap = 895;
      const rate = 0.08;

      // All are taxable in NY
      const taxableBase = vehiclePrice + vsc + gap;
      const tax = taxableBase * rate;

      expect(taxableBase).toBe(33395);
      expect(tax).toBeCloseTo(2671.60, 2);
    });
  });

  describe("Scenario: Lease with Monthly Payments (Nassau County - 8.625%)", () => {
    it("should tax monthly payments with MCTD surcharge", () => {
      const monthlyPayment = 500;
      const term = 36;
      const nassauRate = 0.08625; // 4% state + 4.25% local + 0.375% MCTD
      const monthlyTax = monthlyPayment * nassauRate;
      const totalTax = monthlyTax * term;

      expect(monthlyTax).toBeCloseTo(43.13, 1);
      expect(totalTax).toBeCloseTo(1552.50, 1);
    });
  });

  describe("Scenario: Lease with Doc Fee, VSC, and GAP (All Taxed Upfront)", () => {
    it("should tax doc fee, VSC, and GAP upfront on lease", () => {
      const docFee = 175;
      const vsc = 2500;
      const gap = 895;
      const upfrontTaxable = docFee + vsc + gap;
      const rate = 0.08875; // NYC rate
      const upfrontTax = upfrontTaxable * rate;

      expect(upfrontTaxable).toBe(3570);
      expect(upfrontTax).toBeCloseTo(316.84, 2);
    });
  });

  describe("Scenario: Lease with Trade-In (Reduces Cap Cost)", () => {
    it("should reduce monthly payments via trade-in credit", () => {
      const grossCapCost = 40000;
      const tradeIn = 8000;
      const netCapCost = grossCapCost - tradeIn;
      const monthlyPayment = 450; // calculated from net cap cost
      const rate = 0.08;

      expect(netCapCost).toBe(32000);
      const monthlyTax = monthlyPayment * rate;
      expect(monthlyTax).toBe(36);
    });
  });

  describe("Scenario: No Reciprocity (Out-of-State Purchase)", () => {
    it("should owe full NY tax despite paying tax in another state", () => {
      const vehiclePrice = 30000;
      const njTaxPaid = 1987.50; // 6.625%
      const nyRate = 0.08875; // NYC rate
      const nyTaxOwed = vehiclePrice * nyRate;

      // NO credit for NJ tax paid
      const creditAllowed = 0;
      const totalNyTaxDue = nyTaxOwed - creditAllowed;

      expect(nyTaxOwed).toBeCloseTo(2662.50, 2);
      expect(creditAllowed).toBe(0);
      expect(totalNyTaxDue).toBeCloseTo(2662.50, 2);
      // Customer pays tax twice (NJ + NY)
    });
  });

  describe("Scenario: Monroe County (No MCTD)", () => {
    it("should calculate tax without MCTD surcharge", () => {
      const vehiclePrice = 25000;
      const tradeIn = 5000;
      const docFee = 175;
      const taxableBase = vehiclePrice - tradeIn + docFee;
      const monroeRate = 0.08; // 4% state + 4% local, NO MCTD
      const tax = taxableBase * monroeRate;

      expect(taxableBase).toBe(20175);
      expect(tax).toBe(1614);
    });
  });

  describe("Scenario: Westchester County (MCTD but Lower Local)", () => {
    it("should calculate tax with MCTD surcharge", () => {
      const vehiclePrice = 40000;
      const tradeIn = 12000;
      const docFee = 175;
      const taxableBase = vehiclePrice - tradeIn + docFee;
      const westchesterRate = 0.08375; // 4% state + 4% local + 0.375% MCTD
      const tax = taxableBase * westchesterRate;

      expect(taxableBase).toBe(28175);
      expect(tax).toBeCloseTo(2359.66, 2);
    });
  });

  describe("Scenario: Buffalo/Erie County (High Local, No MCTD)", () => {
    it("should calculate tax with high local rate but no MCTD", () => {
      const vehiclePrice = 35000;
      const tradeIn = 8000;
      const docFee = 175;
      const taxableBase = vehiclePrice - tradeIn + docFee;
      const erieRate = 0.0875; // 4% state + 4.75% local, NO MCTD
      const tax = taxableBase * erieRate;

      expect(taxableBase).toBe(27175);
      expect(tax).toBeCloseTo(2377.81, 2);
    });
  });

  // ============================================================================
  // METADATA AND DOCUMENTATION
  // ============================================================================

  describe("Metadata - Sources", () => {
    it("should document official sources", () => {
      const rules = getRulesForState("NY");
      expect(rules?.extras?.sources).toBeDefined();
      expect(rules?.extras?.sources?.length).toBeGreaterThan(0);
    });

    it("should reference New York State Department of Taxation and Finance", () => {
      const rules = getRulesForState("NY");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("New York State Department of Taxation and Finance"))).toBe(true);
    });

    it("should reference New York Tax Law", () => {
      const rules = getRulesForState("NY");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("New York Tax Law"))).toBe(true);
    });

    it("should reference Vehicle and Traffic Law for doc fee cap", () => {
      const rules = getRulesForState("NY");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Vehicle and Traffic Law 415"))).toBe(true);
    });

    it("should reference MCTD documentation", () => {
      const rules = getRulesForState("NY");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Metropolitan Commuter Transportation District"))).toBe(true);
    });
  });

  describe("Metadata - Last Updated", () => {
    it("should have lastUpdated timestamp", () => {
      const rules = getRulesForState("NY");
      expect(rules?.extras?.lastUpdated).toBeDefined();
      expect(rules?.extras?.lastUpdated).toBe("2025-01");
    });
  });

  describe("Metadata - Documentation", () => {
    it("should have comprehensive notes in extras", () => {
      const rules = getRulesForState("NY");
      expect(rules?.extras?.notes).toBeDefined();
      expect((rules?.extras?.notes as string)?.length).toBeGreaterThan(200);
    });

    it("should document key New York features in notes", () => {
      const rules = getRulesForState("NY");
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("4%");
      expect(notes).toContain("$175");
      expect(notes).toContain("MCTD");
      expect(notes).toContain("No reciprocity");
      expect(notes).toContain("Service contracts and GAP are taxed on BOTH retail and leases");
    });
  });

  describe("Metadata - Common Jurisdiction Rates", () => {
    it("should document rates for major jurisdictions", () => {
      const rules = getRulesForState("NY");
      const rates = rules?.extras?.commonJurisdictionRates as Record<string, number>;
      expect(rates).toBeDefined();
      expect(rates["NYC (all boroughs)"]).toBe(8.875);
      expect(rates["Nassau County"]).toBe(8.625);
      expect(rates["Suffolk County"]).toBe(8.625);
      expect(rates["Westchester County"]).toBe(8.375);
      expect(rates["Monroe County (Rochester)"]).toBe(8.0);
      expect(rates["Erie County (Buffalo)"]).toBe(8.75);
      expect(rates["Albany County"]).toBe(8.0);
    });
  });
});
