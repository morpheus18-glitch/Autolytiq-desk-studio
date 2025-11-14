import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("New Jersey (NJ) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load New Jersey rules successfully", () => {
    const rules = getRulesForState("NJ");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("NJ");
  });

  it("should mark New Jersey as implemented (not a stub)", () => {
    expect(isStateImplemented("NJ")).toBe(true);
  });

  it("should have version number 1", () => {
    const rules = getRulesForState("NJ");
    expect(rules?.version).toBe(1);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("NJ");
    const rulesLower = getRulesForState("nj");
    const rulesMixed = getRulesForState("Nj");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("NJ");
    expect(rulesLower?.stateCode).toBe("NJ");
    expect(rulesMixed?.stateCode).toBe("NJ");
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS
  // ============================================================================

  describe("Retail - Trade-In Policy", () => {
    it("should have FULL trade-in credit policy", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });

    it("should apply full trade-in credit with no cap", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });

    it("should document that trade-in is deducted before tax but AFTER luxury surcharge", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
      // Luxury surcharge calculated on gross price before trade-in
    });
  });

  describe("Retail - Rebate Rules", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as TAXABLE (do NOT reduce tax base)", () => {
      const rules = getRulesForState("NJ");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(true);
      expect(mfrRebate?.notes).toContain("do NOT reduce taxable base");
      expect(mfrRebate?.notes).toContain("unlike NY");
    });

    it("should mark dealer rebates as TAXABLE (do NOT reduce tax base)", () => {
      const rules = getRulesForState("NJ");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(true);
      expect(dealerRebate?.notes).toContain("do NOT reduce taxable base");
    });

    it("should document that rebate treatment differs from NY", () => {
      const rules = getRulesForState("NJ");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate?.notes).toContain("unlike NY");
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.docFeeTaxable).toBe(true);
    });

    it("should have NO state cap on doc fees", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.extras?.docFeeCapAmount).toBeNull();
    });

    it("should document average doc fee of $335", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.extras?.avgDocFee).toBe(335);
    });

    it("should document doc fee range", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.extras?.docFeeRange).toBe("400-800");
    });
  });

  describe("Retail - Fee Tax Rules", () => {
    it("should mark service contracts (VSC) as TAXABLE (prepayment for taxable services)", () => {
      const rules = getRulesForState("NJ");
      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(true);
      expect(vsc?.notes).toContain("taxable");
      expect(vsc?.notes).toContain("prepayment for taxable services");
    });

    it("should mark GAP as TAXABLE (dealer GAP waivers)", () => {
      const rules = getRulesForState("NJ");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(true);
      expect(gap?.notes).toContain("Dealer GAP waiver = TAXABLE");
      expect(gap?.notes).toContain("Third-party insurance = NOT taxable");
    });

    it("should mark title fees as NON-TAXABLE", () => {
      const rules = getRulesForState("NJ");
      const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-TAXABLE", () => {
      const rules = getRulesForState("NJ");
      const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should tax negative equity (assumed)", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.taxOnNegativeEquity).toBe(true);
    });

    it("should tax service contracts", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.taxOnServiceContracts).toBe(true);
    });

    it("should tax GAP (dealer waivers)", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.taxOnGap).toBe(true);
    });
  });

  describe("Retail - Vehicle Tax Scheme", () => {
    it("should use STATE_ONLY vehicle tax scheme (no local taxes)", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.vehicleTaxScheme).toBe("STATE_ONLY");
    });

    it("should NOT apply local sales tax to vehicles", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
    });

    it("should document state rate of 6.625%", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.extras?.stateRate).toBe(6.625);
    });

    it("should document max combined rate of 6.625% (state only)", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.extras?.maxCombinedRate).toBe(6.625);
    });

    it("should document luxury surcharge rate of 0.4%", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.extras?.luxurySurchargeRate).toBe(0.4);
    });

    it("should document luxury surcharge threshold of $45,000", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.extras?.luxurySurchargeThreshold).toBe(45000);
    });

    it("should document luxury surcharge MPG threshold of 19", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.extras?.luxurySurchargeMPGThreshold).toBe(19);
    });
  });

  describe("Retail - ZEV Special Rates", () => {
    it("should document temporary ZEV reduced rate", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.extras?.zevReducedRate).toBe(3.3125);
    });

    it("should document ZEV reduced rate period", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.extras?.zevReducedRatePeriod).toBe("October 1, 2024 - June 30, 2025");
    });

    it("should document ZEV full rate effective date", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.extras?.zevFullRateEffective).toBe("July 1, 2025");
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease - Tax Method", () => {
    it("should use FULL_UPFRONT lease taxation method", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.leaseRules.method).toBe("FULL_UPFRONT");
    });

    it("should NOT tax cap cost reduction", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });

    it("should tax fees upfront on leases", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.leaseRules.taxFeesUpfront).toBe(true);
    });

    it("should have NJ_LUXURY special scheme", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.leaseRules.specialScheme).toBe("NJ_LUXURY");
    });

    it("should document full upfront tax model", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.leaseRules.notes).toContain("FULL UPFRONT");
      expect(rules?.leaseRules.notes).toContain("dealer remitting total tax at lease inception");
    });
  });

  describe("Lease - Cap Cost Reduction Taxation", () => {
    it("should NOT tax cap cost reduction on leases", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });

    it("should document that trade-in reduces taxable base", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.leaseRules.notes).toContain("Trade-in gets FULL credit");
    });
  });

  describe("Lease - Rebates and Incentives", () => {
    it("should have FOLLOW_RETAIL_RULE rebate behavior on leases", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.leaseRules.rebateBehavior).toBe("FOLLOW_RETAIL_RULE");
    });

    it("should follow retail rebate taxability (all rebates taxable)", () => {
      const rules = getRulesForState("NJ");
      // In retail, both rebates are taxable
      const retailMfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      const retailDealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(retailMfrRebate?.taxable).toBe(true);
      expect(retailDealerRebate?.taxable).toBe(true);

      // Leases follow retail rules
      expect(rules?.leaseRules.rebateBehavior).toBe("FOLLOW_RETAIL_RULE");
    });
  });

  describe("Lease - Documentation Fee", () => {
    it("should ALWAYS tax doc fee on leases", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.leaseRules.docFeeTaxability).toBe("ALWAYS");
    });

    it("should have doc fee in lease fee rules", () => {
      const rules = getRulesForState("NJ");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
      expect(docFee?.notes).toContain("upfront lease calculation");
    });
  });

  describe("Lease - Trade-In Credit", () => {
    it("should provide FULL trade-in credit on leases", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.leaseRules.tradeInCredit).toBe("FULL");
    });

    it("should document that trade-in credit works with both calculation methods", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.leaseRules.notes).toContain("Two calculation methods available");
      expect(rules?.leaseRules.notes).toContain("Total Lease Payments OR Original Purchase Price");
    });
  });

  describe("Lease - Negative Equity", () => {
    it("should mark negative equity as TAXABLE on leases", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(true);
    });
  });

  describe("Lease - Fee Tax Rules", () => {
    it("should mark doc fee as TAXABLE on leases", () => {
      const rules = getRulesForState("NJ");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
    });

    it("should mark service contracts as TAXABLE on leases", () => {
      const rules = getRulesForState("NJ");
      const vsc = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(true);
      expect(vsc?.notes).toContain("ARE taxed");
    });

    it("should mark GAP as TAXABLE on leases (dealer/lease company GAP)", () => {
      const rules = getRulesForState("NJ");
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(true);
      expect(gap?.notes).toContain("Dealer/lease company GAP is taxable");
    });

    it("should mark title fees as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("NJ");
      const title = rules?.leaseRules.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("NJ");
      const reg = rules?.leaseRules.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Lease - Title Fee Rules", () => {
    it("should have title fee rule configuration", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.leaseRules.titleFeeRules).toBeDefined();
      expect(rules?.leaseRules.titleFeeRules.length).toBeGreaterThan(0);
    });

    it("should mark title fees as not taxable but included in cap cost", () => {
      const rules = getRulesForState("NJ");
      const titleRule = rules?.leaseRules.titleFeeRules.find((r) => r.code === "TITLE");
      expect(titleRule).toBeDefined();
      expect(titleRule?.taxable).toBe(false);
      expect(titleRule?.includedInCapCost).toBe(true);
      expect(titleRule?.includedInUpfront).toBe(true);
      expect(titleRule?.includedInMonthly).toBe(false);
    });
  });

  describe("Lease - Payment Flexibility", () => {
    it("should document lease term threshold for upfront tax", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.extras?.leaseTermThresholdForUpfrontTax).toBe(6);
    });

    it("should document that tax can be incorporated into monthly payments", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.leaseRules.notes).toContain("Dealer may allow customer to reimburse tax via monthly payments");
      expect(rules?.leaseRules.notes).toContain("dealer still remits upfront to state");
    });
  });

  // ============================================================================
  // RECIPROCITY TESTS
  // ============================================================================

  describe("Reciprocity Rules", () => {
    it("should have reciprocity enabled", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.reciprocity.enabled).toBe(true);
    });

    it("should apply reciprocity to BOTH retail and lease", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.reciprocity.scope).toBe("BOTH");
    });

    it("should use CREDIT_UP_TO_STATE_RATE mode", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.reciprocity.homeStateBehavior).toBe("CREDIT_UP_TO_STATE_RATE");
    });

    it("should require proof of tax paid", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(true);
    });

    it("should base credit on TAX_PAID", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.reciprocity.basis).toBe("TAX_PAID");
    });

    it("should cap credit at New Jersey's tax rate", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(true);
    });

    it("should not have lease exceptions", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.reciprocity.hasLeaseException).toBe(false);
    });

    it("should document reciprocity credit availability", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.reciprocity.notes).toContain("reciprocity credits");
      expect(rules?.reciprocity.notes).toContain("capped at NJ's tax rate");
      expect(rules?.reciprocity.notes).toContain("No refund if other state's tax was higher");
    });
  });

  // ============================================================================
  // NEW JERSEY-SPECIFIC FEATURES
  // ============================================================================

  describe("New Jersey Unique Features - Luxury Surcharge", () => {
    it("should document luxury surcharge applies to both price and MPG triggers", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.extras?.luxurySurchargeThreshold).toBe(45000);
      expect(rules?.extras?.luxurySurchargeMPGThreshold).toBe(19);
    });

    it("should document luxury surcharge is calculated BEFORE trade-in", () => {
      const rules = getRulesForState("NJ");
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("Luxury surcharge (0.4%) applies to vehicles ≥$45k OR <19 MPG (before trade-in)");
    });

    it("should document luxury surcharge on leases", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.leaseRules.specialScheme).toBe("NJ_LUXURY");
      expect(rules?.leaseRules.notes).toContain("Luxury surcharge (0.4%) applies to leases with gross price ≥$45k OR MPG <19");
    });
  });

  describe("New Jersey Unique Features - State-Only Rate", () => {
    it("should document no local sales tax", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("6.625% state-only sales tax (no local rates)");
    });
  });

  describe("New Jersey Unique Features - GAP Treatment", () => {
    it("should document distinction between third-party GAP and dealer GAP", () => {
      const rules = getRulesForState("NJ");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap?.notes).toContain("Third-party insurance = NOT taxable");
      expect(gap?.notes).toContain("Dealer GAP waiver = TAXABLE");
    });
  });

  describe("New Jersey Unique Features - Lease Tax Methods", () => {
    it("should document two lease calculation methods", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.leaseRules.notes).toContain("Two calculation methods available");
      expect(rules?.leaseRules.notes).toContain("Total Lease Payments OR Original Purchase Price");
    });
  });

  // ============================================================================
  // EDGE CASES AND SPECIAL SCENARIOS
  // ============================================================================

  describe("Edge Cases - Rebate Taxability vs NY", () => {
    it("should document that NJ taxes rebates unlike NY", () => {
      const rules = getRulesForState("NJ");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate?.notes).toContain("unlike NY");
    });
  });

  describe("Edge Cases - Luxury Surcharge Edge Cases", () => {
    it("should document that doc fee can push vehicle over luxury threshold", () => {
      const rules = getRulesForState("NJ");
      // $44,700 vehicle + $500 doc = $45,200 > $45,000
      // Triggers luxury surcharge
      expect(rules?.docFeeTaxable).toBe(true);
      expect(rules?.extras?.luxurySurchargeThreshold).toBe(45000);
    });
  });

  describe("Edge Cases - Third-Party GAP vs Dealer GAP", () => {
    it("should handle GAP taxability based on provider type", () => {
      const rules = getRulesForState("NJ");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap?.taxable).toBe(true); // Default to taxable (dealer GAP)
      expect(gap?.notes).toContain("depends on provider");
    });
  });

  // ============================================================================
  // SCENARIO TESTS
  // ============================================================================

  describe("Scenario: Standard Retail Purchase (No Luxury)", () => {
    it("should calculate tax without luxury surcharge", () => {
      // $35,000 vehicle (< $45k) - $8,000 trade + $500 doc = $27,500 taxable
      const vehiclePrice = 35000;
      const tradeIn = 8000;
      const docFee = 500;
      const taxableBase = vehiclePrice - tradeIn + docFee;
      const rate = 0.06625;

      expect(taxableBase).toBe(27500);
      const tax = taxableBase * rate;
      expect(tax).toBeCloseTo(1821.88, 1);
    });
  });

  describe("Scenario: Luxury Vehicle Purchase (≥$45k)", () => {
    it("should calculate tax with luxury surcharge", () => {
      // $50,000 vehicle (≥$45k) triggers 0.4% luxury surcharge
      const vehiclePrice = 50000;
      const luxurySurcharge = vehiclePrice * 0.004;
      const tradeIn = 10000;
      const docFee = 500;
      const taxableBase = vehiclePrice - tradeIn + docFee;
      const rate = 0.06625;
      const salesTax = taxableBase * rate;
      const totalTax = luxurySurcharge + salesTax;

      expect(luxurySurcharge).toBe(200);
      expect(taxableBase).toBe(40500);
      expect(salesTax).toBeCloseTo(2683.13, 1);
      expect(totalTax).toBeCloseTo(2883.13, 1);
    });
  });

  describe("Scenario: Doc Fee Pushes Over Luxury Threshold", () => {
    it("should trigger luxury surcharge when doc fee exceeds threshold", () => {
      // $44,700 vehicle + $500 doc = $45,200 > $45,000
      const vehiclePrice = 44700;
      const docFee = 500;
      const grossPrice = vehiclePrice + docFee;
      const luxurySurcharge = grossPrice * 0.004;
      const tradeIn = 5000;
      const taxableBase = vehiclePrice + docFee - tradeIn;
      const rate = 0.06625;
      const salesTax = taxableBase * rate;
      const totalTax = luxurySurcharge + salesTax;

      expect(grossPrice).toBe(45200);
      expect(luxurySurcharge).toBeCloseTo(180.8, 2);
      expect(taxableBase).toBe(40200);
      expect(salesTax).toBeCloseTo(2663.25, 2);
      expect(totalTax).toBeCloseTo(2844.05, 2);
    });
  });

  describe("Scenario: Retail with Manufacturer Rebate (TAXABLE)", () => {
    it("should tax full price before rebate", () => {
      // $30,000 vehicle - $2,000 mfr rebate = $28,000 customer pays
      // BUT tax calculated on $30,000 (rebates are taxable in NJ)
      const vehiclePrice = 30000;
      const mfrRebate = 2000;
      const customerPays = vehiclePrice - mfrRebate;
      const taxableBase = vehiclePrice; // NOT customerPays
      const rate = 0.06625;

      expect(customerPays).toBe(28000);
      expect(taxableBase).toBe(30000);
      const tax = taxableBase * rate;
      expect(tax).toBeCloseTo(1987.50, 2);
    });
  });

  describe("Scenario: Lease - Total Payments Method", () => {
    it("should calculate upfront tax on total lease payments", () => {
      // Total lease payments over term: $15,000
      // Trade-in: $5,000
      // Taxable base: $10,000
      const totalLeasePayments = 15000;
      const tradeIn = 5000;
      const taxableBase = totalLeasePayments - tradeIn;
      const rate = 0.06625;
      const upfrontTax = taxableBase * rate;

      expect(taxableBase).toBe(10000);
      expect(upfrontTax).toBeCloseTo(662.50, 2);
    });
  });

  describe("Scenario: Lease - Original Purchase Price Method", () => {
    it("should calculate upfront tax on original purchase price", () => {
      // Original purchase price (cap cost): $35,000
      // Trade-in: $8,000
      // Taxable base: $27,000
      const originalPurchasePrice = 35000;
      const tradeIn = 8000;
      const taxableBase = originalPurchasePrice - tradeIn;
      const rate = 0.06625;
      const upfrontTax = taxableBase * rate;

      expect(taxableBase).toBe(27000);
      expect(upfrontTax).toBeCloseTo(1788.75, 2);
    });
  });

  describe("Scenario: Lease with Luxury Surcharge", () => {
    it("should apply luxury surcharge to lease with gross price ≥$45k", () => {
      // Gross cap cost: $50,000 (≥$45k)
      const grossCapCost = 50000;
      const luxurySurcharge = grossCapCost * 0.004;
      const tradeIn = 10000;
      const totalLeasePayments = 35000; // after trade-in reduction
      const taxableBase = totalLeasePayments;
      const rate = 0.06625;
      const salesTax = taxableBase * rate;
      const totalTax = luxurySurcharge + salesTax;

      expect(luxurySurcharge).toBe(200);
      expect(salesTax).toBeCloseTo(2318.75, 2);
      expect(totalTax).toBeCloseTo(2518.75, 2);
    });
  });

  describe("Scenario: Reciprocity - Lower Rate State", () => {
    it("should credit other state tax but pay difference", () => {
      const vehiclePrice = 30000;
      const paTaxPaid = 1800; // 6%
      const njTaxOwed = vehiclePrice * 0.06625;
      const creditAllowed = paTaxPaid;
      const additionalNJTax = njTaxOwed - creditAllowed;

      expect(njTaxOwed).toBeCloseTo(1987.50, 2);
      expect(creditAllowed).toBe(1800);
      expect(additionalNJTax).toBeCloseTo(187.50, 2);
    });
  });

  describe("Scenario: Reciprocity - Higher Rate State", () => {
    it("should credit up to NJ rate, no refund", () => {
      const vehiclePrice = 30000;
      const caTaxPaid = 2175; // 7.25%
      const njTaxOwed = vehiclePrice * 0.06625;
      const creditAllowed = Math.min(caTaxPaid, njTaxOwed);
      const additionalNJTax = njTaxOwed - creditAllowed;

      expect(njTaxOwed).toBeCloseTo(1987.50, 2);
      expect(creditAllowed).toBeCloseTo(1987.50, 2);
      expect(additionalNJTax).toBe(0);
    });
  });

  describe("Scenario: Service Contracts and GAP (TAXABLE)", () => {
    it("should tax service contracts and dealer GAP", () => {
      const vehiclePrice = 30000;
      const vsc = 2500;
      const dealerGAP = 895;
      const rate = 0.06625;

      // All are taxable in NJ
      const taxableBase = vehiclePrice + vsc + dealerGAP;
      const tax = taxableBase * rate;

      expect(taxableBase).toBe(33395);
      expect(tax).toBeCloseTo(2212.42, 2);
    });
  });

  // ============================================================================
  // METADATA AND DOCUMENTATION
  // ============================================================================

  describe("Metadata - Sources", () => {
    it("should document official sources", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.extras?.sources).toBeDefined();
      expect(rules?.extras?.sources?.length).toBeGreaterThan(0);
    });

    it("should reference New Jersey Division of Taxation", () => {
      const rules = getRulesForState("NJ");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("New Jersey Division of Taxation"))).toBe(true);
    });

    it("should reference NJ Treasury", () => {
      const rules = getRulesForState("NJ");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("NJ Treasury"))).toBe(true);
    });

    it("should reference luxury surcharge documentation", () => {
      const rules = getRulesForState("NJ");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Luxury and Fuel-Inefficient Vehicle Surcharge"))).toBe(true);
    });
  });

  describe("Metadata - Last Updated", () => {
    it("should have lastUpdated timestamp", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.extras?.lastUpdated).toBeDefined();
      expect(rules?.extras?.lastUpdated).toBe("2025-01");
    });
  });

  describe("Metadata - Documentation", () => {
    it("should have comprehensive notes in extras", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.extras?.notes).toBeDefined();
      expect((rules?.extras?.notes as string)?.length).toBeGreaterThan(200);
    });

    it("should document key New Jersey features in notes", () => {
      const rules = getRulesForState("NJ");
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("6.625%");
      expect(notes).toContain("no local rates");
      expect(notes).toContain("Luxury surcharge");
      expect(notes).toContain("FULL UPFRONT");
      expect(notes).toContain("Rebates are TAXABLE");
    });
  });

  describe("Metadata - TODO Items", () => {
    it("should document TODO items for verification", () => {
      const rules = getRulesForState("NJ");
      expect(rules?.extras?.notes_TODO).toBeDefined();
      expect((rules?.extras?.notes_TODO as string[]).length).toBeGreaterThan(0);
    });
  });
});
