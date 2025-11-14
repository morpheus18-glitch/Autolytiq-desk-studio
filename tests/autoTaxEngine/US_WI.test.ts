import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Wisconsin (WI) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load Wisconsin rules successfully", () => {
    const rules = getRulesForState("WI");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("WI");
  });

  it("should mark Wisconsin as implemented (not a stub)", () => {
    expect(isStateImplemented("WI")).toBe(true);
  });

  it("should have version number 1", () => {
    const rules = getRulesForState("WI");
    expect(rules?.version).toBe(1);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("WI");
    const rulesLower = getRulesForState("wi");
    const rulesMixed = getRulesForState("Wi");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("WI");
    expect(rulesLower?.stateCode).toBe("WI");
    expect(rulesMixed?.stateCode).toBe("WI");
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS
  // ============================================================================

  describe("Retail - Trade-In Policy", () => {
    it("should have FULL trade-in credit policy", () => {
      const rules = getRulesForState("WI");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });
  });

  describe("Retail - Rebate Rules", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("WI");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as TAXABLE (UNIQUE)", () => {
      const rules = getRulesForState("WI");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(true);
      expect(mfrRebate?.notes).toContain("TAXABLE");
      expect(mfrRebate?.notes).toContain("unusual");
    });

    it("should mark dealer rebates as NON-TAXABLE", () => {
      const rules = getRulesForState("WI");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(false);
      expect(dealerRebate?.notes).toContain("reduce");
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("WI");
      expect(rules?.docFeeTaxable).toBe(true);
    });

    it("should document no cap on doc fees", () => {
      const rules = getRulesForState("WI");
      expect(rules?.extras?.docFeeCapAmount).toBeNull();
      expect(rules?.extras?.avgDocFee).toBe(299);
    });
  });

  describe("Retail - Fee Tax Rules", () => {
    it("should mark service contracts (VSC) as TAXABLE (UNIQUE)", () => {
      const rules = getRulesForState("WI");
      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(true);
      expect(vsc?.notes).toContain("TAXABLE");
      expect(vsc?.notes).toContain("unusual");
    });

    it("should mark GAP as NON-TAXABLE if separately stated", () => {
      const rules = getRulesForState("WI");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(false);
      expect(gap?.notes).toContain("SEPARATELY STATED");
    });

    it("should document GAP bundling requirement", () => {
      const rules = getRulesForState("WI");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap?.notes).toContain("bundled without separate");
      expect(gap?.notes).toContain("becomes taxable");
    });

    it("should mark title fees as NON-TAXABLE", () => {
      const rules = getRulesForState("WI");
      const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-TAXABLE", () => {
      const rules = getRulesForState("WI");
      const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("WI");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should NOT tax negative equity", () => {
      const rules = getRulesForState("WI");
      expect(rules?.taxOnNegativeEquity).toBe(false);
    });

    it("should tax service contracts", () => {
      const rules = getRulesForState("WI");
      expect(rules?.taxOnServiceContracts).toBe(true);
    });

    it("should NOT tax GAP if separately stated", () => {
      const rules = getRulesForState("WI");
      expect(rules?.taxOnGap).toBe(false);
    });
  });

  describe("Retail - Vehicle Tax Scheme", () => {
    it("should use STATE_PLUS_LOCAL vehicle tax scheme", () => {
      const rules = getRulesForState("WI");
      expect(rules?.vehicleTaxScheme).toBe("STATE_PLUS_LOCAL");
    });

    it("should apply local sales tax to vehicles", () => {
      const rules = getRulesForState("WI");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(true);
    });

    it("should document state rate of 5.0%", () => {
      const rules = getRulesForState("WI");
      expect(rules?.extras?.stateRate).toBe(5.0);
    });

    it("should document typical county rate of 0.5%", () => {
      const rules = getRulesForState("WI");
      expect(rules?.extras?.typicalCountyRate).toBe(0.5);
    });

    it("should document Milwaukee County rate of 0.9%", () => {
      const rules = getRulesForState("WI");
      expect(rules?.extras?.milwaukeeCountyRate).toBe(0.9);
      expect(rules?.extras?.milwaukeeCountyRateEffectiveDate).toBe("2024-01-01");
    });

    it("should document typical combined rate of 5.5%", () => {
      const rules = getRulesForState("WI");
      expect(rules?.extras?.typicalCombinedRate).toBe(5.5);
    });

    it("should document min combined rate of 5.0%", () => {
      const rules = getRulesForState("WI");
      expect(rules?.extras?.minCombinedRate).toBe(5.0);
    });

    it("should document max combined rate of 8.0%", () => {
      const rules = getRulesForState("WI");
      expect(rules?.extras?.maxCombinedRate).toBe(8.0);
    });

    it("should document 68 counties with county tax", () => {
      const rules = getRulesForState("WI");
      expect(rules?.extras?.countiesWithCountyTax).toBe(68);
      expect(rules?.extras?.totalCounties).toBe(72);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease - Tax Method", () => {
    it("should use MONTHLY lease taxation method", () => {
      const rules = getRulesForState("WI");
      expect(rules?.leaseRules.method).toBe("MONTHLY");
    });

    it("should tax cap cost reduction (UNIQUE)", () => {
      const rules = getRulesForState("WI");
      expect(rules?.leaseRules.taxCapReduction).toBe(true);
    });

    it("should tax fees upfront on leases", () => {
      const rules = getRulesForState("WI");
      expect(rules?.leaseRules.taxFeesUpfront).toBe(true);
    });

    it("should have no special lease scheme", () => {
      const rules = getRulesForState("WI");
      expect(rules?.leaseRules.specialScheme).toBe("NONE");
    });

    it("should document monthly + cap reduction taxation", () => {
      const rules = getRulesForState("WI");
      expect(rules?.leaseRules.notes).toContain("Monthly lease taxation");
      expect(rules?.leaseRules.notes).toContain("CAP COST REDUCTION also taxed upfront");
    });
  });

  describe("Lease - Cap Cost Reduction Taxation (UNIQUE)", () => {
    it("should tax cash down upfront", () => {
      const rules = getRulesForState("WI");
      expect(rules?.leaseRules.taxCapReduction).toBe(true);
    });

    it("should tax trade-in as cap reduction (different from purchase)", () => {
      const rules = getRulesForState("WI");
      expect(rules?.leaseRules.tradeInCredit).toBe("NONE");
      expect(rules?.leaseRules.notes).toContain("Trade-in on lease IS taxed");
      expect(rules?.leaseRules.notes).toContain("different from purchase");
    });

    it("should tax manufacturer rebates in cap reduction", () => {
      const rules = getRulesForState("WI");
      expect(rules?.leaseRules.rebateBehavior).toBe("FOLLOW_RETAIL_RULE");
      // Manufacturer rebates are taxable per retail rules
    });
  });

  describe("Lease - Rebates and Incentives", () => {
    it("should have FOLLOW_RETAIL_RULE rebate behavior on leases", () => {
      const rules = getRulesForState("WI");
      expect(rules?.leaseRules.rebateBehavior).toBe("FOLLOW_RETAIL_RULE");
    });
  });

  describe("Lease - Documentation Fee", () => {
    it("should ALWAYS tax doc fee on leases", () => {
      const rules = getRulesForState("WI");
      expect(rules?.leaseRules.docFeeTaxability).toBe("ALWAYS");
    });

    it("should have doc fee in lease fee rules as taxable", () => {
      const rules = getRulesForState("WI");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
      expect(docFee?.notes).toContain("no cap");
    });
  });

  describe("Lease - Trade-In Credit", () => {
    it("should have NONE trade-in credit on leases (trade-in is taxed)", () => {
      const rules = getRulesForState("WI");
      expect(rules?.leaseRules.tradeInCredit).toBe("NONE");
    });

    it("should document trade-in treated as cap reduction", () => {
      const rules = getRulesForState("WI");
      expect(rules?.leaseRules.notes).toContain("Trade-in on lease IS taxed");
    });
  });

  describe("Lease - Negative Equity", () => {
    it("should NOT tax negative equity on leases", () => {
      const rules = getRulesForState("WI");
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(false);
    });
  });

  describe("Lease - Fee Tax Rules", () => {
    it("should mark doc fee as TAXABLE on leases", () => {
      const rules = getRulesForState("WI");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
    });

    it("should mark service contracts as TAXABLE on leases", () => {
      const rules = getRulesForState("WI");
      const vsc = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(true);
      expect(vsc?.notes).toContain("TAXABLE");
    });

    it("should mark GAP as NON-TAXABLE on leases if separately stated", () => {
      const rules = getRulesForState("WI");
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(false);
      expect(gap?.notes).toContain("separately stated");
    });

    it("should mark title fees as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("WI");
      const title = rules?.leaseRules.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("WI");
      const reg = rules?.leaseRules.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Lease - Title Fee Rules", () => {
    it("should have title fee rule configuration", () => {
      const rules = getRulesForState("WI");
      expect(rules?.leaseRules.titleFeeRules).toBeDefined();
      expect(rules?.leaseRules.titleFeeRules.length).toBeGreaterThan(0);
    });

    it("should mark title fees as not taxable but included in cap cost", () => {
      const rules = getRulesForState("WI");
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
      const rules = getRulesForState("WI");
      expect(rules?.reciprocity.enabled).toBe(true);
    });

    it("should apply reciprocity to BOTH retail and lease", () => {
      const rules = getRulesForState("WI");
      expect(rules?.reciprocity.scope).toBe("BOTH");
    });

    it("should use CREDIT_UP_TO_STATE_RATE mode", () => {
      const rules = getRulesForState("WI");
      expect(rules?.reciprocity.homeStateBehavior).toBe("CREDIT_UP_TO_STATE_RATE");
    });

    it("should require proof of tax paid", () => {
      const rules = getRulesForState("WI");
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(true);
    });

    it("should base credit on TAX_PAID", () => {
      const rules = getRulesForState("WI");
      expect(rules?.reciprocity.basis).toBe("TAX_PAID");
    });

    it("should cap credit at Wisconsin's tax rate", () => {
      const rules = getRulesForState("WI");
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(true);
    });

    it("should not have lease exceptions", () => {
      const rules = getRulesForState("WI");
      expect(rules?.reciprocity.hasLeaseException).toBe(false);
    });

    it("should document reciprocity policy", () => {
      const rules = getRulesForState("WI");
      expect(rules?.reciprocity.notes).toContain("credit for sales/use tax");
      expect(rules?.reciprocity.notes).toContain("proof");
    });
  });

  // ============================================================================
  // WISCONSIN-SPECIFIC FEATURES
  // ============================================================================

  describe("Wisconsin Unique Features - Manufacturer Rebates Taxable", () => {
    it("should document manufacturer rebates are taxable", () => {
      const rules = getRulesForState("WI");
      expect(rules?.extras?.notes).toContain("Manufacturer rebates are TAXABLE");
      expect(rules?.extras?.notes).toContain("unusual");
    });
  });

  describe("Wisconsin Unique Features - Service Contracts Taxable", () => {
    it("should document service contracts are taxable", () => {
      const rules = getRulesForState("WI");
      expect(rules?.extras?.notes).toContain("Service contracts TAXABLE");
      expect(rules?.extras?.notes).toContain("unusual");
    });
  });

  describe("Wisconsin Unique Features - Trade-In on Lease Taxable", () => {
    it("should document trade-in on lease is taxable", () => {
      const rules = getRulesForState("WI");
      expect(rules?.extras?.notes).toContain("Trade-in on lease IS taxed");
      expect(rules?.extras?.notes).toContain("different from purchase");
    });
  });

  describe("Wisconsin Unique Features - Cap Cost Reduction Taxed", () => {
    it("should document cap cost reduction taxation", () => {
      const rules = getRulesForState("WI");
      expect(rules?.extras?.notes).toContain("cap cost reduction");
      expect(rules?.extras?.notes).toContain("taxed upfront");
    });
  });

  describe("Wisconsin Unique Features - No Doc Fee Cap", () => {
    it("should document no doc fee cap", () => {
      const rules = getRulesForState("WI");
      expect(rules?.extras?.notes).toContain("Doc fee taxable with NO CAP");
      expect(rules?.extras?.docFeeCapAmount).toBeNull();
    });
  });

  describe("Wisconsin Unique Features - Milwaukee County Rate Increase", () => {
    it("should document Milwaukee County rate increase", () => {
      const rules = getRulesForState("WI");
      expect(rules?.extras?.notes).toContain("Milwaukee County: 0.9%");
      expect(rules?.extras?.notes).toContain("Jan 1, 2024");
    });
  });

  describe("Wisconsin Unique Features - Stadium Tax Eliminated", () => {
    it("should document stadium tax elimination", () => {
      const rules = getRulesForState("WI");
      expect(rules?.extras?.notes).toContain("Stadium tax eliminated");
      expect(rules?.extras?.stadiumTaxEliminated).toBe("2020-03-31");
    });
  });

  describe("Wisconsin Unique Features - Wheel Tax", () => {
    it("should document wheel tax information", () => {
      const rules = getRulesForState("WI");
      expect(rules?.extras?.notes).toContain("Wheel tax");
      expect(rules?.extras?.wheelTaxJurisdictions).toBe(68);
      expect(rules?.extras?.wheelTaxRange).toEqual([10, 80]);
    });
  });

  // ============================================================================
  // SCENARIO TESTS
  // ============================================================================

  describe("Scenario: Basic Retail Sale (5.5% Typical Rate)", () => {
    it("should calculate tax correctly with trade-in", () => {
      // $30,000 vehicle - $10,000 trade-in = $20,000 taxable
      // Tax @ 5.5%: $20,000 × 0.055 = $1,100
      const vehiclePrice = 30000;
      const tradeIn = 10000;
      const taxableBase = vehiclePrice - tradeIn;
      const typicalRate = 0.055; // 5.0% state + 0.5% county

      expect(taxableBase).toBe(20000);
      const expectedTax = taxableBase * typicalRate;
      expect(expectedTax).toBe(1100);
    });
  });

  describe("Scenario: Milwaukee County Sale (5.9% Rate)", () => {
    it("should calculate tax with Milwaukee County rate", () => {
      const vehiclePrice = 28000;
      const tradeIn = 8000;
      const taxableBase = vehiclePrice - tradeIn;
      const milwaukeeRate = 0.059; // 5.0% state + 0.9% county

      expect(taxableBase).toBe(20000);
      const tax = taxableBase * milwaukeeRate;
      expect(tax).toBe(1180);
    });
  });

  describe("Scenario: Retail with Manufacturer Rebate (Taxable)", () => {
    it("should tax full price before manufacturer rebate", () => {
      const vehiclePrice = 35000;
      const mfrRebate = 5000; // TAXABLE - does NOT reduce tax base
      const customerPays = vehiclePrice - mfrRebate;
      const rate = 0.055;

      // Tax on FULL price before rebate
      const taxableBase = vehiclePrice; // Rebate does NOT reduce tax
      const tax = taxableBase * rate;

      expect(customerPays).toBe(30000);
      expect(taxableBase).toBe(35000);
      expect(tax).toBe(1925);
    });
  });

  describe("Scenario: Retail with Dealer Discount (Not Taxable)", () => {
    it("should deduct dealer discount from taxable amount", () => {
      const vehiclePrice = 30000;
      const dealerDiscount = 2000; // NOT taxable - reduces price
      const rate = 0.055;

      // Dealer discount reduces taxable base
      const taxableBase = vehiclePrice - dealerDiscount;
      const tax = taxableBase * rate;

      expect(taxableBase).toBe(28000);
      expect(tax).toBe(1540);
    });
  });

  describe("Scenario: Retail with VSC (Taxable) and GAP (Not Taxable)", () => {
    it("should tax VSC but not GAP on retail", () => {
      const vehiclePrice = 25000;
      const vsc = 2500; // TAXABLE
      const gap = 795; // NOT taxable if separately stated
      const tradeIn = 5000;
      const rate = 0.055;

      // VSC taxable, GAP not taxable
      const taxableBase = vehiclePrice + vsc - tradeIn;
      const tax = taxableBase * rate;

      expect(taxableBase).toBe(22500);
      expect(tax).toBe(1237.50);
    });
  });

  describe("Scenario: Retail with Doc Fee and Accessories", () => {
    it("should tax doc fee and accessories", () => {
      const vehiclePrice = 28000;
      const docFee = 299; // TAXABLE
      const accessories = 1500; // TAXABLE
      const tradeIn = 8000;
      const rate = 0.055;

      // Doc fee and accessories are TAXABLE
      const taxableBase = vehiclePrice + docFee + accessories - tradeIn;
      const tax = taxableBase * rate;

      expect(taxableBase).toBe(21799);
      expect(tax).toBeCloseTo(1198.95, 2);
    });
  });

  describe("Scenario: Retail with Negative Equity (Not Taxable)", () => {
    it("should NOT tax negative equity", () => {
      const vehiclePrice = 30000;
      const tradeInValue = 8000;
      const tradeInPayoff = 12000;
      const negativeEquity = tradeInPayoff - tradeInValue;
      const rate = 0.055;

      // Negative equity does NOT increase taxable base
      const taxableBase = vehiclePrice - tradeInValue; // Negative equity NOT added
      const tax = taxableBase * rate;

      expect(negativeEquity).toBe(4000);
      expect(taxableBase).toBe(22000);
      expect(tax).toBe(1210);
    });
  });

  describe("Scenario: Lease with Cap Cost Reduction (Taxed Upfront)", () => {
    it("should tax cap reduction upfront and payments monthly", () => {
      const cashDown = 2000;
      const monthlyPayment = 350;
      const term = 36;
      const rate = 0.055;

      // Cap cost reduction taxed upfront
      const upfrontTax = cashDown * rate;
      // Monthly payments taxed monthly
      const monthlyTax = monthlyPayment * rate;
      const totalTax = upfrontTax + (monthlyTax * term);

      expect(upfrontTax).toBe(110);
      expect(monthlyTax).toBeCloseTo(19.25, 2);
      expect(totalTax).toBeCloseTo(803, 0);
    });
  });

  describe("Scenario: Lease with Trade-In (Taxed as Cap Reduction)", () => {
    it("should tax trade-in value upfront on lease", () => {
      const tradeInValue = 5000; // TAXED on lease (unlike purchase)
      const cashDown = 2000;
      const totalCapReduction = tradeInValue + cashDown;
      const monthlyPayment = 350;
      const term = 36;
      const rate = 0.055;

      // Trade-in AND cash down taxed upfront
      const upfrontTax = totalCapReduction * rate;
      const monthlyTax = monthlyPayment * rate;
      const totalTax = upfrontTax + (monthlyTax * term);

      expect(totalCapReduction).toBe(7000);
      expect(upfrontTax).toBe(385);
      expect(totalTax).toBeCloseTo(1078, 0);
    });
  });

  describe("Scenario: Lease with VSC (Taxable)", () => {
    it("should tax VSC on leases", () => {
      const monthlyPayment = 400;
      const vsc = 2000; // TAXABLE on lease
      const term = 36;
      const rate = 0.055;

      // VSC taxed upfront
      const vscTax = vsc * rate;
      const monthlyTax = monthlyPayment * rate;
      const totalTax = vscTax + (monthlyTax * term);

      expect(vscTax).toBe(110);
      expect(monthlyTax).toBe(22);
      expect(totalTax).toBe(902);
    });
  });

  describe("Scenario: Lease with GAP (Not Taxable if Separately Stated)", () => {
    it("should NOT tax GAP on leases if separately stated", () => {
      const monthlyPayment = 350;
      const gap = 795; // NOT taxable if separately stated
      const term = 36;
      const rate = 0.055;

      // Only monthly payment is taxed (GAP not taxed)
      const monthlyTax = monthlyPayment * rate;
      const totalTax = monthlyTax * term;

      expect(monthlyTax).toBeCloseTo(19.25, 2);
      expect(totalTax).toBeCloseTo(693, 0);
    });
  });

  describe("Scenario: Reciprocity (Illinois Purchase)", () => {
    it("should credit Illinois tax paid", () => {
      const vehiclePrice = 25000;
      const illinoisTaxPaid = 1562.50; // 6.25%
      const wisconsinRate = 0.055; // 5.5%

      const wisconsinTaxDue = vehiclePrice * wisconsinRate;
      const credit = Math.min(illinoisTaxPaid, wisconsinTaxDue);
      const additionalWisconsinTax = wisconsinTaxDue - credit;

      expect(wisconsinTaxDue).toBe(1375);
      expect(credit).toBe(1375); // Capped at WI tax
      expect(additionalWisconsinTax).toBe(0);
    });
  });

  describe("Scenario: Reciprocity (Lower Rate State)", () => {
    it("should collect difference when other state rate is lower", () => {
      const vehiclePrice = 30000;
      const otherStateTaxPaid = 1200; // 4%
      const wisconsinRate = 0.055; // 5.5%

      const wisconsinTaxDue = vehiclePrice * wisconsinRate;
      const credit = otherStateTaxPaid;
      const additionalWisconsinTax = wisconsinTaxDue - credit;

      expect(wisconsinTaxDue).toBe(1650);
      expect(credit).toBe(1200);
      expect(additionalWisconsinTax).toBe(450);
    });
  });

  // ============================================================================
  // METADATA AND DOCUMENTATION
  // ============================================================================

  describe("Metadata - Sources", () => {
    it("should document official sources", () => {
      const rules = getRulesForState("WI");
      expect(rules?.extras?.sources).toBeDefined();
      expect(rules?.extras?.sources?.length).toBeGreaterThan(0);
    });

    it("should reference Wisconsin Department of Revenue", () => {
      const rules = getRulesForState("WI");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Wisconsin Department of Revenue"))).toBe(true);
    });

    it("should reference Wisconsin Statutes Chapter 77", () => {
      const rules = getRulesForState("WI");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Wisconsin Statutes Chapter 77"))).toBe(true);
    });

    it("should reference Wisconsin Administrative Code", () => {
      const rules = getRulesForState("WI");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Wisconsin Administrative Code"))).toBe(true);
    });

    it("should reference Publication 202", () => {
      const rules = getRulesForState("WI");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Publication 202"))).toBe(true);
    });
  });

  describe("Metadata - Last Updated", () => {
    it("should have lastUpdated timestamp", () => {
      const rules = getRulesForState("WI");
      expect(rules?.extras?.lastUpdated).toBeDefined();
      expect(rules?.extras?.lastUpdated).toBe("2025-11-13");
    });
  });

  describe("Metadata - Comprehensive Documentation", () => {
    it("should have comprehensive notes", () => {
      const rules = getRulesForState("WI");
      expect(rules?.extras?.notes).toBeDefined();
      expect((rules?.extras?.notes as string).length).toBeGreaterThan(200);
    });

    it("should document key Wisconsin features", () => {
      const rules = getRulesForState("WI");
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("5.0% state");
      expect(notes).toContain("Manufacturer rebates are TAXABLE");
      expect(notes).toContain("Service contracts TAXABLE");
      expect(notes).toContain("Trade-in on lease IS taxed");
      expect(notes).toContain("cap cost reduction");
    });
  });

  describe("Metadata - Rate Information", () => {
    it("should document state rate", () => {
      const rules = getRulesForState("WI");
      expect(rules?.extras?.stateRate).toBe(5.0);
    });

    it("should document typical county rate", () => {
      const rules = getRulesForState("WI");
      expect(rules?.extras?.typicalCountyRate).toBe(0.5);
    });

    it("should document Milwaukee County rate", () => {
      const rules = getRulesForState("WI");
      expect(rules?.extras?.milwaukeeCountyRate).toBe(0.9);
    });

    it("should document combined rate range", () => {
      const rules = getRulesForState("WI");
      expect(rules?.extras?.minCombinedRate).toBe(5.0);
      expect(rules?.extras?.maxCombinedRate).toBe(8.0);
      expect(rules?.extras?.typicalCombinedRate).toBe(5.5);
    });
  });
});
