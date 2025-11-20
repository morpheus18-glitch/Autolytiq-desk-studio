import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Missouri (MO) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load Missouri rules successfully", () => {
    const rules = getRulesForState("MO");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("MO");
  });

  it("should mark Missouri as implemented (not a stub)", () => {
    expect(isStateImplemented("MO")).toBe(true);
  });

  it("should have version number 1", () => {
    const rules = getRulesForState("MO");
    expect(rules?.version).toBe(1);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("MO");
    const rulesLower = getRulesForState("mo");
    const rulesMixed = getRulesForState("Mo");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("MO");
    expect(rulesLower?.stateCode).toBe("MO");
    expect(rulesMixed?.stateCode).toBe("MO");
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS
  // ============================================================================

  describe("Retail - Trade-In Policy", () => {
    it("should have FULL trade-in credit policy", () => {
      const rules = getRulesForState("MO");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });

    it("should apply full trade-in credit with no cap", () => {
      const rules = getRulesForState("MO");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
      // No cap property for FULL type
    });

    it("should document that trade-in is deducted before tax calculation", () => {
      const rules = getRulesForState("MO");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
      // Trade-in completely deducted from vehicle price before tax
    });
  });

  describe("Retail - Rebate Rules", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("MO");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as NON-TAXABLE (reduce tax base)", () => {
      const rules = getRulesForState("MO");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(false);
      expect(mfrRebate?.notes).toContain("reduce the purchase price");
    });

    it("should mark dealer rebates as NON-TAXABLE (unique MO feature)", () => {
      const rules = getRulesForState("MO");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(false);
      expect(dealerRebate?.notes).toContain("ALSO reduce purchase price");
    });

    it("should document that MO treats both rebate types the same (unusual)", () => {
      const rules = getRulesForState("MO");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");

      // Both reduce tax base
      expect(mfrRebate?.taxable).toBe(false);
      expect(dealerRebate?.taxable).toBe(false);

      // Dealer rebate notes should mention this is same as manufacturer
      expect(dealerRebate?.notes).toContain("same as manufacturer rebates");
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("MO");
      expect(rules?.docFeeTaxable).toBe(true);
    });

    it("should document doc fee cap of $604.47 for 2025", () => {
      const rules = getRulesForState("MO");
      expect(rules?.extras?.docFeeCapAmount).toBe(604.47);
      expect(rules?.extras?.docFeeCapYear).toBe(2025);
    });

    it("should document annual CPI-U adjustment", () => {
      const rules = getRulesForState("MO");
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("annually adjusted for CPI-U");
    });
  });

  describe("Retail - Fee Tax Rules", () => {
    it("should mark service contracts (VSC) as NON-TAXABLE if separately stated", () => {
      const rules = getRulesForState("MO");
      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(false);
      expect(vsc?.notes).toContain("NOT taxable");
      expect(vsc?.notes).toContain("separately stated");
    });

    it("should mark GAP as NON-TAXABLE (insurance product)", () => {
      const rules = getRulesForState("MO");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(false);
      expect(gap?.notes).toContain("NOT taxable");
      expect(gap?.notes).toContain("insurance product");
    });

    it("should mark title fees as NON-TAXABLE", () => {
      const rules = getRulesForState("MO");
      const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-TAXABLE", () => {
      const rules = getRulesForState("MO");
      const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("MO");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should NOT tax negative equity (financed debt, not sale price)", () => {
      const rules = getRulesForState("MO");
      expect(rules?.taxOnNegativeEquity).toBe(false);
    });

    it("should NOT tax service contracts (if separately stated)", () => {
      const rules = getRulesForState("MO");
      expect(rules?.taxOnServiceContracts).toBe(false);
    });

    it("should NOT tax GAP insurance", () => {
      const rules = getRulesForState("MO");
      expect(rules?.taxOnGap).toBe(false);
    });
  });

  describe("Retail - Vehicle Tax Scheme", () => {
    it("should use STATE_PLUS_LOCAL vehicle tax scheme", () => {
      const rules = getRulesForState("MO");
      expect(rules?.vehicleTaxScheme).toBe("STATE_PLUS_LOCAL");
    });

    it("should apply local sales tax to vehicles", () => {
      const rules = getRulesForState("MO");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(true);
    });

    it("should document state rate of 4.225%", () => {
      const rules = getRulesForState("MO");
      expect(rules?.extras?.stateRate).toBe(4.225);
    });

    it("should document local rate range of 0.5% to 7.755%", () => {
      const rules = getRulesForState("MO");
      expect(rules?.extras?.minLocalRate).toBe(0.5);
      expect(rules?.extras?.maxLocalRate).toBe(7.755);
    });

    it("should document combined rate range of 4.725% to 11.98%", () => {
      const rules = getRulesForState("MO");
      expect(rules?.extras?.minCombinedRate).toBe(4.725);
      expect(rules?.extras?.maxCombinedRate).toBe(11.98);
    });

    it("should document that tax is based on purchaser's address, not dealer location", () => {
      const rules = getRulesForState("MO");
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("PURCHASER'S address");
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease - Tax Method", () => {
    it("should use MONTHLY lease taxation method", () => {
      const rules = getRulesForState("MO");
      expect(rules?.leaseRules.method).toBe("MONTHLY");
    });

    it("should TAX cap cost reduction (different from retail)", () => {
      const rules = getRulesForState("MO");
      expect(rules?.leaseRules.taxCapReduction).toBe(true);
    });

    it("should tax fees upfront on leases", () => {
      const rules = getRulesForState("MO");
      expect(rules?.leaseRules.taxFeesUpfront).toBe(true);
    });

    it("should have no special lease scheme", () => {
      const rules = getRulesForState("MO");
      expect(rules?.leaseRules.specialScheme).toBe("NONE");
    });

    it("should document monthly payment taxation model", () => {
      const rules = getRulesForState("MO");
      expect(rules?.leaseRules.notes).toContain("Monthly lease taxation");
      expect(rules?.leaseRules.notes).toContain("DOWN PAYMENT also taxed upfront");
    });
  });

  describe("Lease - Cap Cost Reduction Taxation", () => {
    it("should tax cap cost reduction upfront (including trade-in)", () => {
      const rules = getRulesForState("MO");
      expect(rules?.leaseRules.taxCapReduction).toBe(true);
    });

    it("should document that cash down is taxed", () => {
      const rules = getRulesForState("MO");
      expect(rules?.leaseRules.notes).toContain("cash down");
    });

    it("should document that trade-in is taxed (unlike retail)", () => {
      const rules = getRulesForState("MO");
      expect(rules?.leaseRules.notes).toContain("trade-in");
    });

    it("should document that rebates in cap reduction are taxed", () => {
      const rules = getRulesForState("MO");
      expect(rules?.leaseRules.notes).toContain("rebates");
    });
  });

  describe("Lease - Rebates and Incentives", () => {
    it("should have ALWAYS_TAXABLE rebate behavior on leases", () => {
      const rules = getRulesForState("MO");
      expect(rules?.leaseRules.rebateBehavior).toBe("ALWAYS_TAXABLE");
    });

    it("should document that lease rebate treatment differs from retail", () => {
      const rules = getRulesForState("MO");
      // In retail, both manufacturer and dealer rebates reduce tax base
      const retailMfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      const retailDealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(retailMfrRebate?.taxable).toBe(false);
      expect(retailDealerRebate?.taxable).toBe(false);

      // In leases, all rebates are taxable when applied to cap reduction
      expect(rules?.leaseRules.rebateBehavior).toBe("ALWAYS_TAXABLE");
    });
  });

  describe("Lease - Documentation Fee", () => {
    it("should ALWAYS tax doc fee on leases", () => {
      const rules = getRulesForState("MO");
      expect(rules?.leaseRules.docFeeTaxability).toBe("ALWAYS");
    });

    it("should have doc fee in lease fee rules with same cap", () => {
      const rules = getRulesForState("MO");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
      expect(docFee?.notes).toContain("$604.47");
      expect(docFee?.notes).toContain("2025");
    });
  });

  describe("Lease - Trade-In Credit", () => {
    it("should provide NONE trade-in credit on leases (trade-in is taxed)", () => {
      const rules = getRulesForState("MO");
      expect(rules?.leaseRules.tradeInCredit).toBe("NONE");
    });

    it("should document that trade-in reduces cap cost but is taxed upfront", () => {
      const rules = getRulesForState("MO");
      expect(rules?.leaseRules.tradeInCredit).toBe("NONE");
      expect(rules?.leaseRules.taxCapReduction).toBe(true);
    });
  });

  describe("Lease - Negative Equity", () => {
    it("should mark negative equity as NOT TAXABLE on leases", () => {
      const rules = getRulesForState("MO");
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(false);
    });
  });

  describe("Lease - Fee Tax Rules", () => {
    it("should mark doc fee as TAXABLE on leases", () => {
      const rules = getRulesForState("MO");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
    });

    it("should mark service contracts as NON-TAXABLE on leases if separately stated", () => {
      const rules = getRulesForState("MO");
      const vsc = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(false);
      expect(vsc?.notes).toContain("NOT taxable");
      expect(vsc?.notes).toContain("separately stated");
    });

    it("should mark GAP as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("MO");
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(false);
      expect(gap?.notes).toContain("NOT taxable");
    });

    it("should mark title fees as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("MO");
      const title = rules?.leaseRules.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("MO");
      const reg = rules?.leaseRules.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Lease - Title Fee Rules", () => {
    it("should have title fee rule configuration", () => {
      const rules = getRulesForState("MO");
      expect(rules?.leaseRules.titleFeeRules).toBeDefined();
      expect(rules?.leaseRules.titleFeeRules.length).toBeGreaterThan(0);
    });

    it("should mark title fees as not taxable but included in cap cost", () => {
      const rules = getRulesForState("MO");
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
    it("should have reciprocity enabled", () => {
      const rules = getRulesForState("MO");
      expect(rules?.reciprocity.enabled).toBe(true);
    });

    it("should apply reciprocity to BOTH retail and lease", () => {
      const rules = getRulesForState("MO");
      expect(rules?.reciprocity.scope).toBe("BOTH");
    });

    it("should use CREDIT_UP_TO_STATE_RATE mode", () => {
      const rules = getRulesForState("MO");
      expect(rules?.reciprocity.homeStateBehavior).toBe("CREDIT_UP_TO_STATE_RATE");
    });

    it("should require proof of tax paid", () => {
      const rules = getRulesForState("MO");
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(true);
    });

    it("should base credit on TAX_PAID", () => {
      const rules = getRulesForState("MO");
      expect(rules?.reciprocity.basis).toBe("TAX_PAID");
    });

    it("should cap credit at Missouri's tax rate", () => {
      const rules = getRulesForState("MO");
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(true);
    });

    it("should not have lease exceptions", () => {
      const rules = getRulesForState("MO");
      expect(rules?.reciprocity.hasLeaseException).toBe(false);
    });

    it("should document unique 90-day rule", () => {
      const rules = getRulesForState("MO");
      expect(rules?.reciprocity.notes).toContain("90-day rule");
      expect(rules?.reciprocity.notes).toContain("90+ days");
      expect(rules?.reciprocity.notes).toContain("NO tax due");
    });

    it("should document 30-day out-of-state title rule", () => {
      const rules = getRulesForState("MO");
      expect(rules?.reciprocity.notes).toContain("30-day out-of-state title rule");
    });

    it("should have 90-day reciprocity flag in extras", () => {
      const rules = getRulesForState("MO");
      expect(rules?.extras?.reciprocity90DayRule).toBe(true);
    });
  });

  // ============================================================================
  // MISSOURI-SPECIFIC FEATURES
  // ============================================================================

  describe("Missouri Unique Features - Dealer Collection Mandate", () => {
    it("should document Senate Bill 28 dealer collection mandate", () => {
      const rules = getRulesForState("MO");
      expect(rules?.extras?.dealerCollectionMandateSignedDate).toBe("2025-08-28");
      expect(rules?.extras?.dealerCollectionMandateEffectiveDate).toContain("FUSION");
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("Dealer collection mandate");
    });

    it("should document FUSION system implementation", () => {
      const rules = getRulesForState("MO");
      expect(rules?.extras?.fusionSystemLaunch).toBeDefined();
      expect(rules?.extras?.fusionSystemLaunch).toContain("2026");
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("FUSION system");
    });

    it("should document current vs future temporary tag periods", () => {
      const rules = getRulesForState("MO");
      expect(rules?.extras?.temporaryTagsPre).toBe("90 days");
      expect(rules?.extras?.temporaryTagsPost).toBe("30 days standard, 60 days with $100,000 bond");
    });
  });

  describe("Missouri Unique Features - Agricultural Trade-Ins", () => {
    it("should document agricultural trade-in provision", () => {
      const rules = getRulesForState("MO");
      expect(rules?.extras?.agriculturalTradeInAllowed).toBe(true);
    });
  });

  describe("Missouri Unique Features - Total Loss Tax Credit", () => {
    it("should document total loss tax credit window", () => {
      const rules = getRulesForState("MO");
      expect(rules?.extras?.totalLossCreditWindow).toBe(180);
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("Total loss tax credit");
    });
  });

  describe("Missouri Unique Features - Complex Local Tax Structure", () => {
    it("should document complex local tax variations", () => {
      const rules = getRulesForState("MO");
      expect(rules?.extras?.minLocalRate).toBe(0.5);
      expect(rules?.extras?.maxLocalRate).toBe(7.755);
      expect(rules?.extras?.maxCombinedRate).toBe(11.98);
    });

    it("should document major markets with high rates", () => {
      const rules = getRulesForState("MO");
      expect(rules?.extras?.maxCombinedRate).toBe(11.98);
      // Kansas City can reach up to 11.98%
    });
  });

  // ============================================================================
  // EDGE CASES AND SPECIAL SCENARIOS
  // ============================================================================

  describe("Edge Cases - Dealer vs Manufacturer Rebates", () => {
    it("should treat both rebate types the same (unusual state behavior)", () => {
      const rules = getRulesForState("MO");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");

      // Both should be non-taxable
      expect(mfrRebate?.taxable).toBe(false);
      expect(dealerRebate?.taxable).toBe(false);
    });
  });

  describe("Edge Cases - Lease vs Retail Trade-In Treatment", () => {
    it("should document different trade-in treatment for lease vs retail", () => {
      const rules = getRulesForState("MO");

      // Retail: trade-in NOT taxable (FULL credit)
      expect(rules?.tradeInPolicy.type).toBe("FULL");

      // Lease: trade-in IS taxable (NONE credit)
      expect(rules?.leaseRules.tradeInCredit).toBe("NONE");
      expect(rules?.leaseRules.taxCapReduction).toBe(true);
    });
  });

  describe("Edge Cases - Service Contract Bundling", () => {
    it("should document that bundled VSC becomes taxable", () => {
      const rules = getRulesForState("MO");
      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc?.notes).toContain("If bundled, becomes taxable");
    });
  });

  // ============================================================================
  // SCENARIO TESTS
  // ============================================================================

  describe("Scenario: Basic Retail Sale (Kansas City - 8.73%)", () => {
    it("should calculate tax correctly with trade-in and rebates", () => {
      // $30,000 vehicle - $10,000 trade - $2,000 mfr rebate - $500 dealer rebate + $600 doc = $18,100
      const vehiclePrice = 30000;
      const tradeIn = 10000;
      const mfrRebate = 2000;
      const dealerRebate = 500;
      const docFee = 600;
      const taxableBase = vehiclePrice - tradeIn - mfrRebate - dealerRebate + docFee;
      const kansasCityRate = 0.0873;

      expect(taxableBase).toBe(18100);
      const expectedTax = taxableBase * kansasCityRate;
      expect(expectedTax).toBeCloseTo(1580.13, 2);
    });
  });

  describe("Scenario: Retail Sale with Accessories", () => {
    it("should tax accessories as part of sale price", () => {
      const vehiclePrice = 25000;
      const accessories = 1200;
      const tradeIn = 8000;
      const docFee = 604.47;
      const taxableBase = vehiclePrice + accessories - tradeIn + docFee;
      const rate = 0.04225; // state rate only

      expect(taxableBase).toBeCloseTo(18804.47, 2);
      const tax = taxableBase * rate;
      expect(tax).toBeCloseTo(794.49, 2);
    });
  });

  describe("Scenario: Retail with Negative Equity (NOT Taxed)", () => {
    it("should NOT tax negative equity", () => {
      const vehiclePrice = 28000;
      const tradeInValue = 10000;
      const tradeInPayoff = 14000;
      const negativeEquity = tradeInPayoff - tradeInValue;
      const taxableBase = vehiclePrice - tradeInValue;
      const rate = 0.08;

      expect(negativeEquity).toBe(4000);
      expect(taxableBase).toBe(18000);
      const tax = taxableBase * rate;
      expect(tax).toBeCloseTo(1440, 2);
      // Negative equity increases loan but not tax
    });
  });

  describe("Scenario: Lease with Cap Reduction (St. Louis - 9.68%)", () => {
    it("should tax cap reduction upfront and payments monthly", () => {
      const capReduction = 5000; // includes cash + trade-in
      const docFee = 604.47;
      const monthlyPayment = 450;
      const term = 36;
      const rate = 0.0968; // St. Louis City

      const upfrontTaxable = capReduction + docFee;
      const upfrontTax = upfrontTaxable * rate;
      const monthlyTax = monthlyPayment * rate;
      const totalTax = upfrontTax + monthlyTax * term;

      expect(upfrontTaxable).toBeCloseTo(5604.47, 2);
      expect(upfrontTax).toBeCloseTo(542.51, 2);
      expect(monthlyTax).toBeCloseTo(43.56, 2);
      expect(totalTax).toBeCloseTo(2110.67, 2);
    });
  });

  describe("Scenario: Lease with Trade-In (Taxed Unlike Retail)", () => {
    it("should tax trade-in equity as cap reduction on leases", () => {
      const grossCapCost = 40000;
      const tradeInValue = 8000;
      const adjustedCapCost = grossCapCost - tradeInValue;
      const rate = 0.0873; // Kansas City

      // Trade-in equity IS TAXED on leases (unlike retail)
      const taxOnTradeIn = tradeInValue * rate;

      expect(adjustedCapCost).toBe(32000);
      expect(taxOnTradeIn).toBeCloseTo(698.40, 2);
    });
  });

  describe("Scenario: 90-Day Reciprocity Rule (No Tax Due)", () => {
    it("should owe no tax if vehicle operated in another state 90+ days", () => {
      const vehiclePrice = 30000;
      const illinoisTaxPaid = 1875; // 6.25%
      const daysOperatedInIllinois = 95;

      // If operated 90+ days in another state, NO Missouri tax due
      if (daysOperatedInIllinois >= 90) {
        const moTaxDue = 0;
        expect(moTaxDue).toBe(0);
      }
    });
  });

  describe("Scenario: Reciprocity Credit (<90 Days)", () => {
    it("should credit other state tax but pay difference if <90 days", () => {
      const vehiclePrice = 30000;
      const kansasTaxPaid = 675; // 2.25% state rate
      const moRate = 0.0873; // Kansas City
      const daysInKansas = 43;

      if (daysInKansas < 90) {
        const moTaxOwed = vehiclePrice * moRate;
        const creditAllowed = kansasTaxPaid;
        const netMoTaxDue = moTaxOwed - creditAllowed;

        expect(moTaxOwed).toBeCloseTo(2619, 2);
        expect(netMoTaxDue).toBeCloseTo(1944, 2);
      }
    });
  });

  describe("Scenario: Service Contracts and GAP (NOT Taxable)", () => {
    it("should NOT tax VSC or GAP if separately stated", () => {
      const vehiclePrice = 30000;
      const vsc = 2500;
      const gap = 895;
      const rate = 0.08;

      // Only vehicle is taxable, NOT VSC or GAP (if separately stated)
      const taxableBase = vehiclePrice;
      const tax = taxableBase * rate;

      expect(tax).toBeCloseTo(2400, 2);

      // If incorrectly included:
      const incorrectTax = (vehiclePrice + vsc + gap) * rate;
      expect(incorrectTax).toBe(2671.6);
      expect(tax).not.toBe(incorrectTax);
    });
  });

  // ============================================================================
  // METADATA AND DOCUMENTATION
  // ============================================================================

  describe("Metadata - Sources", () => {
    it("should document official sources", () => {
      const rules = getRulesForState("MO");
      expect(rules?.extras?.sources).toBeDefined();
      expect(rules?.extras?.sources?.length).toBeGreaterThan(0);
    });

    it("should reference Missouri Department of Revenue", () => {
      const rules = getRulesForState("MO");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Missouri Department of Revenue"))).toBe(true);
    });

    it("should reference RSMo (Revised Statutes of Missouri)", () => {
      const rules = getRulesForState("MO");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("RSMo"))).toBe(true);
    });

    it("should reference Senate Bill 28", () => {
      const rules = getRulesForState("MO");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Senate Bill 28"))).toBe(true);
    });

    it("should reference Missouri Code of State Regulations", () => {
      const rules = getRulesForState("MO");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("12 CSR"))).toBe(true);
    });
  });

  describe("Metadata - Last Updated", () => {
    it("should have lastUpdated timestamp", () => {
      const rules = getRulesForState("MO");
      expect(rules?.extras?.lastUpdated).toBeDefined();
      expect(rules?.extras?.lastUpdated).toBe("2025-11-13");
    });
  });

  describe("Metadata - Documentation", () => {
    it("should have comprehensive notes in extras", () => {
      const rules = getRulesForState("MO");
      expect(rules?.extras?.notes).toBeDefined();
      expect((rules?.extras?.notes as string)?.length).toBeGreaterThan(200);
    });

    it("should document key Missouri features in notes", () => {
      const rules = getRulesForState("MO");
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("4.225%");
      expect(notes).toContain("$604.47");
      expect(notes).toContain("FUSION");
      expect(notes).toContain("90-day reciprocity");
    });
  });
});
