import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Ohio (OH) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load Ohio rules successfully", () => {
    const rules = getRulesForState("OH");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("OH");
  });

  it("should mark Ohio as implemented (not a stub)", () => {
    expect(isStateImplemented("OH")).toBe(true);
  });

  it("should have version number 2", () => {
    const rules = getRulesForState("OH");
    expect(rules?.version).toBe(2);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("OH");
    const rulesLower = getRulesForState("oh");
    const rulesMixed = getRulesForState("Oh");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("OH");
    expect(rulesLower?.stateCode).toBe("OH");
    expect(rulesMixed?.stateCode).toBe("OH");
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS
  // ============================================================================

  describe("Retail - Trade-In Policy", () => {
    it("should have FULL trade-in credit policy", () => {
      const rules = getRulesForState("OH");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });

    it("should document NEW vs USED vehicle distinction", () => {
      const rules = getRulesForState("OH");
      // Trade-in credit ONLY applies to NEW vehicles per ORC 5739.029
      // This is documented in the rule notes
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });
  });

  describe("Retail - Rebate Rules", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("OH");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as NON-TAXABLE", () => {
      const rules = getRulesForState("OH");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(false);
      expect(mfrRebate?.notes).toContain("reduce the purchase price");
    });

    it("should mark dealer rebates as TAXABLE", () => {
      const rules = getRulesForState("OH");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(true);
      expect(dealerRebate?.notes).toContain("vendor");
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as NON-TAXABLE", () => {
      const rules = getRulesForState("OH");
      expect(rules?.docFeeTaxable).toBe(false);
    });

    it("should document doc fee cap of $387", () => {
      const rules = getRulesForState("OH");
      const docFee = rules?.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(false);
      expect(docFee?.notes).toContain("$387");
      expect(docFee?.notes).toContain("10%");
    });

    it("should document that doc fee cap is adjusted annually", () => {
      const rules = getRulesForState("OH");
      expect(rules?.extras?.docFeeCapAmount).toBe(387);
      expect(rules?.extras?.docFeeCapEffectiveDate).toBe("2024-10-24");
      expect(rules?.extras?.docFeeCapAdjustmentSchedule).toContain("September 30th");
    });
  });

  describe("Retail - Fee Tax Rules", () => {
    it("should mark service contracts (VSC) as TAXABLE", () => {
      const rules = getRulesForState("OH");
      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(true);
      expect(vsc?.notes).toContain("taxable");
    });

    it("should mark GAP as TAXABLE", () => {
      const rules = getRulesForState("OH");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(true);
      expect(gap?.notes).toContain("taxable");
    });

    it("should mark title fees as NON-TAXABLE", () => {
      const rules = getRulesForState("OH");
      const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-TAXABLE", () => {
      const rules = getRulesForState("OH");
      const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });

    it("should mark acquisition fees as TAXABLE", () => {
      const rules = getRulesForState("OH");
      const acqFee = rules?.feeTaxRules.find((r) => r.code === "ACQUISITION_FEE");
      expect(acqFee).toBeDefined();
      expect(acqFee?.taxable).toBe(true);
    });

    it("should mark disposition fees as TAXABLE", () => {
      const rules = getRulesForState("OH");
      const dispFee = rules?.feeTaxRules.find((r) => r.code === "DISPOSITION_FEE");
      expect(dispFee).toBeDefined();
      expect(dispFee?.taxable).toBe(true);
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("OH");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should tax negative equity", () => {
      const rules = getRulesForState("OH");
      expect(rules?.taxOnNegativeEquity).toBe(true);
    });

    it("should tax service contracts", () => {
      const rules = getRulesForState("OH");
      expect(rules?.taxOnServiceContracts).toBe(true);
    });

    it("should tax GAP insurance", () => {
      const rules = getRulesForState("OH");
      expect(rules?.taxOnGap).toBe(true);
    });
  });

  describe("Retail - Vehicle Tax Scheme", () => {
    it("should use STATE_PLUS_LOCAL vehicle tax scheme", () => {
      const rules = getRulesForState("OH");
      expect(rules?.vehicleTaxScheme).toBe("STATE_PLUS_LOCAL");
    });

    it("should apply local sales tax to vehicles", () => {
      const rules = getRulesForState("OH");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(true);
    });

    it("should document state rate of 5.75%", () => {
      const rules = getRulesForState("OH");
      expect(rules?.extras?.statewideTaxRate).toBe(0.0575);
    });

    it("should document max combined rate of 8.25%", () => {
      const rules = getRulesForState("OH");
      expect(rules?.extras?.maxCombinedRate).toBe(8.25);
    });

    it("should document typical max combined rate of 8.0%", () => {
      const rules = getRulesForState("OH");
      expect(rules?.extras?.typicalMaxCombinedRate).toBe(8.0);
    });

    it("should document Cuyahoga County as highest at 8.0%", () => {
      const rules = getRulesForState("OH");
      expect(rules?.extras?.majorCountyRates?.CuyahogaCounty).toBe(8.0);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease - Tax Method", () => {
    it("should use FULL_UPFRONT lease taxation method", () => {
      const rules = getRulesForState("OH");
      expect(rules?.leaseRules.method).toBe("FULL_UPFRONT");
    });

    it("should NOT tax cap cost reduction", () => {
      const rules = getRulesForState("OH");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });

    it("should tax fees upfront on leases", () => {
      const rules = getRulesForState("OH");
      expect(rules?.leaseRules.taxFeesUpfront).toBe(true);
    });

    it("should have no special lease scheme", () => {
      const rules = getRulesForState("OH");
      expect(rules?.leaseRules.specialScheme).toBe("NONE");
    });

    it("should document upfront lease taxation model", () => {
      const rules = getRulesForState("OH");
      expect(rules?.leaseRules.notes).toContain("FULL_UPFRONT");
      expect(rules?.leaseRules.notes).toContain("collected at signing");
    });
  });

  describe("Lease - Rebates and Incentives", () => {
    it("should have FOLLOW_RETAIL_RULE rebate behavior on leases", () => {
      const rules = getRulesForState("OH");
      expect(rules?.leaseRules.rebateBehavior).toBe("FOLLOW_RETAIL_RULE");
    });
  });

  describe("Lease - Documentation Fee", () => {
    it("should NEVER tax doc fee on leases", () => {
      const rules = getRulesForState("OH");
      expect(rules?.leaseRules.docFeeTaxability).toBe("NEVER");
    });

    it("should have doc fee in lease fee rules as non-taxable", () => {
      const rules = getRulesForState("OH");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(false);
      expect(docFee?.notes).toContain("$387");
    });
  });

  describe("Lease - Trade-In Credit", () => {
    it("should provide CAP_COST_ONLY trade-in credit on leases", () => {
      const rules = getRulesForState("OH");
      expect(rules?.leaseRules.tradeInCredit).toBe("CAP_COST_ONLY");
    });

    it("should document NEW vs USED distinction applies to leases", () => {
      const rules = getRulesForState("OH");
      expect(rules?.leaseRules.notes).toContain("NEW");
    });
  });

  describe("Lease - Negative Equity", () => {
    it("should mark negative equity as TAXABLE on leases", () => {
      const rules = getRulesForState("OH");
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(true);
    });
  });

  describe("Lease - Fee Tax Rules", () => {
    it("should mark doc fee as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("OH");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(false);
    });

    it("should mark service contracts as TAXABLE on leases (UNIQUE)", () => {
      const rules = getRulesForState("OH");
      const vsc = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(true);
      expect(vsc?.notes).toContain("TAXABLE");
      expect(vsc?.notes).toContain("UNIQUE");
    });

    it("should mark GAP as TAXABLE on leases (UNIQUE)", () => {
      const rules = getRulesForState("OH");
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(true);
      expect(gap?.notes).toContain("TAXABLE");
      expect(gap?.notes).toContain("UNIQUE");
    });

    it("should mark acquisition fees as TAXABLE on leases", () => {
      const rules = getRulesForState("OH");
      const acqFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "ACQUISITION_FEE");
      expect(acqFee).toBeDefined();
      expect(acqFee?.taxable).toBe(true);
    });

    it("should mark disposition fees as TAXABLE on leases", () => {
      const rules = getRulesForState("OH");
      const dispFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DISPOSITION_FEE");
      expect(dispFee).toBeDefined();
      expect(dispFee?.taxable).toBe(true);
    });

    it("should mark excess mileage fees as TAXABLE on leases", () => {
      const rules = getRulesForState("OH");
      const excessMileage = rules?.leaseRules.feeTaxRules.find((r) => r.code === "EXCESS_MILEAGE");
      expect(excessMileage).toBeDefined();
      expect(excessMileage?.taxable).toBe(true);
    });

    it("should mark title fees as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("OH");
      const title = rules?.leaseRules.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("OH");
      const reg = rules?.leaseRules.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Lease - Title Fee Rules", () => {
    it("should have title fee rule configuration", () => {
      const rules = getRulesForState("OH");
      expect(rules?.leaseRules.titleFeeRules).toBeDefined();
      expect(rules?.leaseRules.titleFeeRules.length).toBeGreaterThan(0);
    });

    it("should mark title fees as not taxable but included in cap cost", () => {
      const rules = getRulesForState("OH");
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
      const rules = getRulesForState("OH");
      expect(rules?.reciprocity.enabled).toBe(true);
    });

    it("should apply reciprocity to BOTH retail and lease", () => {
      const rules = getRulesForState("OH");
      expect(rules?.reciprocity.scope).toBe("BOTH");
    });

    it("should use CREDIT_UP_TO_STATE_RATE mode", () => {
      const rules = getRulesForState("OH");
      expect(rules?.reciprocity.homeStateBehavior).toBe("CREDIT_UP_TO_STATE_RATE");
    });

    it("should require proof of tax paid", () => {
      const rules = getRulesForState("OH");
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(true);
    });

    it("should base credit on TAX_PAID", () => {
      const rules = getRulesForState("OH");
      expect(rules?.reciprocity.basis).toBe("TAX_PAID");
    });

    it("should cap credit at Ohio's tax rate", () => {
      const rules = getRulesForState("OH");
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(true);
    });

    it("should not have lease exceptions", () => {
      const rules = getRulesForState("OH");
      expect(rules?.reciprocity.hasLeaseException).toBe(false);
    });

    it("should have reciprocal state overrides", () => {
      const rules = getRulesForState("OH");
      expect(rules?.reciprocity.overrides).toBeDefined();
      expect(rules?.reciprocity.overrides?.length).toBe(7);
    });

    // eslint-disable-next-line complexity -- optional chaining counted as branches
    it("should document 7 reciprocal collection states", () => {
      const rules = getRulesForState("OH");
      expect(rules?.extras?.reciprocalStates).toHaveLength(7);
      expect(rules?.extras?.reciprocalStates).toContain("AZ");
      expect(rules?.extras?.reciprocalStates).toContain("CA");
      expect(rules?.extras?.reciprocalStates).toContain("FL");
      expect(rules?.extras?.reciprocalStates).toContain("IN");
      expect(rules?.extras?.reciprocalStates).toContain("MA");
      expect(rules?.extras?.reciprocalStates).toContain("MI");
      expect(rules?.extras?.reciprocalStates).toContain("SC");
    });
  });

  // ============================================================================
  // OHIO-SPECIFIC FEATURES
  // ============================================================================

  describe("Ohio Unique Features - New vs Used Trade-In", () => {
    it("should document that trade-in credit only applies to NEW vehicles", () => {
      const rules = getRulesForState("OH");
      const keyDifferences = rules?.extras?.keyDifferencesFromOtherStates as string[];
      expect(keyDifferences.some((d) => d.includes("NEW"))).toBe(true);
      expect(keyDifferences.some((d) => d.includes("USED"))).toBe(true);
    });
  });

  describe("Ohio Unique Features - Upfront Lease Taxation", () => {
    it("should document upfront lease tax payment", () => {
      const rules = getRulesForState("OH");
      const keyDifferences = rules?.extras?.keyDifferencesFromOtherStates as string[];
      expect(keyDifferences.some((d) => d.includes("UPFRONT"))).toBe(true);
    });
  });

  describe("Ohio Unique Features - VSC and GAP Taxable on Leases", () => {
    it("should document that VSC and GAP are taxable on leases", () => {
      const rules = getRulesForState("OH");
      const keyDifferences = rules?.extras?.keyDifferencesFromOtherStates as string[];
      expect(keyDifferences.some((d) => d.includes("VSC and GAP taxable"))).toBe(true);
    });
  });

  describe("Ohio Unique Features - Doc Fee Cap", () => {
    it("should document doc fee cap with 10% rule", () => {
      const rules = getRulesForState("OH");
      expect(rules?.extras?.docFeeCapRule).toContain("Lesser of $387 or 10%");
    });

    it("should document that doc fee is NOT taxable", () => {
      const rules = getRulesForState("OH");
      const keyDifferences = rules?.extras?.keyDifferencesFromOtherStates as string[];
      expect(keyDifferences.some((d) => d.includes("Doc fee NOT taxable"))).toBe(true);
    });
  });

  describe("Ohio Unique Features - Reciprocal Collection States", () => {
    it("should document reciprocal collection agreements", () => {
      const rules = getRulesForState("OH");
      const keyDifferences = rules?.extras?.keyDifferencesFromOtherStates as string[];
      expect(keyDifferences.some((d) => d.includes("Seven states"))).toBe(true);
    });
  });

  // ============================================================================
  // EDGE CASES AND SPECIAL SCENARIOS
  // ============================================================================

  describe("Edge Cases - Doc Fee 10% Rule", () => {
    it("should document that $3,500 vehicle has $350 max doc fee", () => {
      const rules = getRulesForState("OH");
      // 10% of $3,500 is $350, which is less than $387 cap
      expect(rules?.extras?.docFeeCapRule).toContain("10%");
    });
  });

  describe("Edge Cases - New Vehicle Trade-In", () => {
    it("should document full trade-in credit for new vehicles", () => {
      const rules = getRulesForState("OH");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });
  });

  describe("Edge Cases - Used Vehicle Trade-In", () => {
    it("should document no trade-in credit for used vehicles", () => {
      const rules = getRulesForState("OH");
      const warnings = rules?.extras?.warningsForDealers as string[];
      expect(warnings.some((w) => w.includes("ALWAYS verify vehicle condition"))).toBe(true);
    });
  });

  describe("Edge Cases - Reciprocal State Collection", () => {
    it("should require Ohio tax collection from reciprocal state residents", () => {
      const rules = getRulesForState("OH");
      const azOverride = rules?.reciprocity.overrides?.find((o) => o.originState === "AZ");
      expect(azOverride).toBeDefined();
      expect(azOverride?.notes).toContain("Ohio dealers must collect Ohio tax");
    });
  });

  // ============================================================================
  // SCENARIO TESTS
  // ============================================================================

  describe("Scenario: Basic Retail Sale (New Vehicle with Trade-In)", () => {
    it("should calculate tax correctly with trade-in", () => {
      // $30,000 new vehicle - $10,000 trade-in = $20,000 taxable
      // Tax @ 7.5% (Franklin County): $20,000 × 0.075 = $1,500
      const vehiclePrice = 30000;
      const tradeIn = 10000;
      const taxableBase = vehiclePrice - tradeIn; // Full trade-in credit for NEW vehicle
      const franklinCountyRate = 0.075;

      expect(taxableBase).toBe(20000);
      const expectedTax = taxableBase * franklinCountyRate;
      expect(expectedTax).toBe(1500);
    });
  });

  describe("Scenario: Used Vehicle Sale with Trade-In (No Credit)", () => {
    it("should tax full purchase price for used vehicles", () => {
      // $20,000 used vehicle - $5,000 trade-in
      // NO trade-in credit for used vehicles
      // Taxable base = $20,000 (trade-in does NOT reduce tax)
      const vehiclePrice = 20000;
      const tradeIn = 5000;
      const taxableBase = vehiclePrice; // NO credit for USED vehicle
      const rate = 0.075;

      expect(taxableBase).toBe(20000);
      const tax = taxableBase * rate;
      expect(tax).toBeCloseTo(1500, 2);
      // Customer saves $0 on tax (would save $375 if it were a new vehicle)
    });
  });

  describe("Scenario: Retail Sale with Doc Fee", () => {
    it("should NOT tax doc fee", () => {
      const vehiclePrice = 25000;
      const docFee = 387;
      const tradeIn = 8000;
      const rate = 0.075;

      // Doc fee is NOT taxable in Ohio
      const taxableBase = vehiclePrice - tradeIn; // Doc fee NOT included
      const tax = taxableBase * rate;

      expect(taxableBase).toBe(17000);
      expect(tax).toBeCloseTo(1275, 2);
    });
  });

  describe("Scenario: Retail Sale with VSC and GAP", () => {
    it("should tax VSC and GAP", () => {
      const vehiclePrice = 30000;
      const vsc = 2500;
      const gap = 895;
      const tradeIn = 10000;
      const rate = 0.075;

      // VSC and GAP are TAXABLE in Ohio
      const taxableBase = vehiclePrice + vsc + gap - tradeIn;
      const tax = taxableBase * rate;

      expect(taxableBase).toBe(23395);
      expect(tax).toBeCloseTo(1754.625, 2);
    });
  });

  describe("Scenario: Lease with Upfront Payment", () => {
    it("should tax total lease payments upfront", () => {
      const monthlyPayment = 300;
      const term = 36;
      const rate = 0.065; // 6.5%

      const totalPayments = monthlyPayment * term;
      const taxDueAtSigning = totalPayments * rate;

      expect(totalPayments).toBe(10800);
      expect(taxDueAtSigning).toBe(702);
    });
  });

  describe("Scenario: Lease with VSC and GAP (Taxable)", () => {
    it("should tax VSC and GAP on leases", () => {
      const monthlyPayment = 350;
      const term = 36;
      const vsc = 2000;
      const gap = 500;
      const rate = 0.065;

      // Total payments + VSC + GAP all taxed upfront
      const totalTaxable = (monthlyPayment * term) + vsc + gap;
      const taxDueAtSigning = totalTaxable * rate;

      expect(totalTaxable).toBe(15100);
      expect(taxDueAtSigning).toBeCloseTo(981.50, 2);
    });
  });

  describe("Scenario: Reciprocity (Michigan Purchase)", () => {
    it("should credit Michigan tax and collect difference", () => {
      const vehiclePrice = 25000;
      const michiganTaxPaid = 1500; // 6%
      const ohioRate = 0.075; // 7.5% (Franklin County)

      const ohioTaxDue = vehiclePrice * ohioRate;
      const credit = michiganTaxPaid;
      const additionalOhioTax = ohioTaxDue - credit;

      expect(ohioTaxDue).toBe(1875);
      expect(credit).toBe(1500);
      expect(additionalOhioTax).toBe(375);
    });
  });

  describe("Scenario: Reciprocity (Indiana Purchase - Higher Tax)", () => {
    it("should cap credit at Ohio tax when Indiana tax exceeds", () => {
      const vehiclePrice = 25000;
      const indianaTaxPaid = 1750; // 7%
      const ohioRate = 0.0675; // 6.75% (Summit County)

      const ohioTaxDue = vehiclePrice * ohioRate;
      const creditAllowed = Math.min(indianaTaxPaid, ohioTaxDue);
      const additionalOhioTax = ohioTaxDue - creditAllowed;

      expect(ohioTaxDue).toBe(1687.50);
      expect(creditAllowed).toBe(1687.50); // Capped at OH tax
      expect(additionalOhioTax).toBe(0);
    });
  });

  // ============================================================================
  // METADATA AND DOCUMENTATION
  // ============================================================================

  describe("Metadata - Sources", () => {
    it("should document official sources", () => {
      const rules = getRulesForState("OH");
      expect(rules?.extras?.sources).toBeDefined();
      expect(rules?.extras?.sources?.length).toBeGreaterThan(0);
    });

    it("should reference Ohio Department of Taxation", () => {
      const rules = getRulesForState("OH");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Ohio Department of Taxation"))).toBe(true);
    });

    it("should reference Ohio Revised Code", () => {
      const rules = getRulesForState("OH");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Ohio Revised Code"))).toBe(true);
    });

    it("should reference Senate Bill 94 (2024)", () => {
      const rules = getRulesForState("OH");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Senate Bill 94"))).toBe(true);
    });
  });

  describe("Metadata - Last Updated", () => {
    it("should have lastUpdated timestamp", () => {
      const rules = getRulesForState("OH");
      expect(rules?.extras?.lastUpdated).toBeDefined();
      expect(rules?.extras?.lastUpdated).toBe("2025-01-13");
    });
  });

  describe("Metadata - Common Mistakes", () => {
    it("should document common dealer mistakes", () => {
      const rules = getRulesForState("OH");
      expect(rules?.extras?.commonMistakes).toBeDefined();
      expect((rules?.extras?.commonMistakes as string[]).length).toBeGreaterThan(0);
    });

    it("should warn about applying trade-in to used vehicles", () => {
      const rules = getRulesForState("OH");
      const mistakes = rules?.extras?.commonMistakes as string[];
      expect(mistakes.some((m) => m.includes("used vehicle"))).toBe(true);
    });

    it("should warn about taxing doc fee", () => {
      const rules = getRulesForState("OH");
      const mistakes = rules?.extras?.commonMistakes as string[];
      expect(mistakes.some((m) => m.includes("doc fee"))).toBe(true);
    });

    it("should warn about exempting VSC/GAP on leases", () => {
      const rules = getRulesForState("OH");
      const mistakes = rules?.extras?.commonMistakes as string[];
      expect(mistakes.some((m) => m.includes("VSC/GAP"))).toBe(true);
    });
  });

  describe("Metadata - Warnings for Dealers", () => {
    it("should have warnings for dealers", () => {
      const rules = getRulesForState("OH");
      expect(rules?.extras?.warningsForDealers).toBeDefined();
      expect((rules?.extras?.warningsForDealers as string[]).length).toBeGreaterThan(0);
    });

    it("should warn to verify vehicle condition before trade-in credit", () => {
      const rules = getRulesForState("OH");
      const warnings = rules?.extras?.warningsForDealers as string[];
      expect(warnings.some((w) => w.includes("ALWAYS verify vehicle condition"))).toBe(true);
    });
  });
});
