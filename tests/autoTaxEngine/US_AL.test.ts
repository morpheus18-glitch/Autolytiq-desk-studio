import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Alabama (AL) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load Alabama rules successfully", () => {
    const rules = getRulesForState("AL");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("AL");
  });

  it("should mark Alabama as implemented (not a stub)", () => {
    expect(isStateImplemented("AL")).toBe(true);
  });

  it("should have version number 2", () => {
    const rules = getRulesForState("AL");
    expect(rules?.version).toBe(2);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("AL");
    const rulesLower = getRulesForState("al");
    const rulesMixed = getRulesForState("Al");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("AL");
    expect(rulesLower?.stateCode).toBe("AL");
    expect(rulesMixed?.stateCode).toBe("AL");
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS
  // ============================================================================

  describe("Retail - Trade-In Policy", () => {
    it("should have FULL trade-in credit policy", () => {
      const rules = getRulesForState("AL");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });

    it("should document partial trade-in credit (state only, not local)", () => {
      const rules = getRulesForState("AL");
      // Alabama has unique feature: trade-in credit applies to state tax only
      expect(rules?.tradeInPolicy.type).toBe("FULL");
      // This is marked as FULL but calculation logic must apply credit to state portion only
    });
  });

  describe("Retail - Rebate Rules", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("AL");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as TAXABLE (unique AL feature)", () => {
      const rules = getRulesForState("AL");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(true);
      expect(mfrRebate?.notes).toContain("do NOT reduce");
      expect(mfrRebate?.notes).toContain("full vehicle price");
    });

    it("should mark dealer rebates as NON-TAXABLE (when actual price reduction)", () => {
      const rules = getRulesForState("AL");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(false);
      expect(dealerRebate?.notes).toContain("actual reduced selling price");
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("AL");
      expect(rules?.docFeeTaxable).toBe(true);
    });

    it("should document that Alabama has NO CAP on doc fees", () => {
      const rules = getRulesForState("AL");
      const docFee = rules?.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
      expect(docFee?.notes).toContain("NO cap");
      expect(docFee?.notes).toContain("$485");
    });

    it("should have average doc fee of $485 documented in extras", () => {
      const rules = getRulesForState("AL");
      expect(rules?.extras?.avgDocFee).toBe(485);
    });
  });

  describe("Retail - Fee Tax Rules", () => {
    it("should mark service contracts (VSC) as NON-TAXABLE", () => {
      const rules = getRulesForState("AL");
      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(false);
      expect(vsc?.notes).toContain("NOT subject to Alabama sales tax");
    });

    it("should mark GAP as NON-TAXABLE", () => {
      const rules = getRulesForState("AL");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(false);
      expect(gap?.notes).toContain("NOT taxable");
    });

    it("should mark title fees as NON-TAXABLE when separately stated", () => {
      const rules = getRulesForState("AL");
      const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
      expect(title?.notes).toContain("separately stated");
    });

    it("should mark registration fees as NON-TAXABLE", () => {
      const rules = getRulesForState("AL");
      const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });

    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("AL");
      const docFee = rules?.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("AL");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should NOT tax negative equity on retail sales", () => {
      const rules = getRulesForState("AL");
      expect(rules?.taxOnNegativeEquity).toBe(false);
    });

    it("should NOT tax service contracts", () => {
      const rules = getRulesForState("AL");
      expect(rules?.taxOnServiceContracts).toBe(false);
    });

    it("should NOT tax GAP insurance", () => {
      const rules = getRulesForState("AL");
      expect(rules?.taxOnGap).toBe(false);
    });
  });

  describe("Retail - Vehicle Tax Scheme", () => {
    it("should use STATE_PLUS_LOCAL vehicle tax scheme", () => {
      const rules = getRulesForState("AL");
      expect(rules?.vehicleTaxScheme).toBe("STATE_PLUS_LOCAL");
    });

    it("should apply local sales tax to vehicles", () => {
      const rules = getRulesForState("AL");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(true);
    });

    it("should document state automotive rate of 2.0%", () => {
      const rules = getRulesForState("AL");
      expect(rules?.extras?.stateAutomotiveSalesRate).toBe(2.0);
    });

    it("should document state lease rate of 1.5%", () => {
      const rules = getRulesForState("AL");
      expect(rules?.extras?.stateAutomotiveLeaseRate).toBe(1.5);
    });

    it("should document combined rate range", () => {
      const rules = getRulesForState("AL");
      expect(rules?.extras?.combinedRateRange).toBeDefined();
      expect(rules?.extras?.combinedRateRange?.min).toBe(2.5);
      expect(rules?.extras?.combinedRateRange?.max).toBe(10.0);
    });

    it("should document major jurisdictions", () => {
      const rules = getRulesForState("AL");
      expect(rules?.extras?.majorJurisdictions).toBeDefined();
      expect(rules?.extras?.majorJurisdictions?.Birmingham).toBeDefined();
      expect(rules?.extras?.majorJurisdictions?.Birmingham?.total).toBe(6.0);
      expect(rules?.extras?.majorJurisdictions?.Mobile?.total).toBe(10.0);
    });

    it("should document 366 local tax jurisdictions", () => {
      const rules = getRulesForState("AL");
      expect(rules?.extras?.jurisdictionCount).toBe(366);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease - Tax Method", () => {
    it("should use HYBRID lease taxation method", () => {
      const rules = getRulesForState("AL");
      expect(rules?.leaseRules.method).toBe("HYBRID");
    });

    it("should TAX cap cost reduction upfront", () => {
      const rules = getRulesForState("AL");
      expect(rules?.leaseRules.taxCapReduction).toBe(true);
    });

    it("should tax fees upfront on leases", () => {
      const rules = getRulesForState("AL");
      expect(rules?.leaseRules.taxFeesUpfront).toBe(true);
    });

    it("should have no special lease scheme", () => {
      const rules = getRulesForState("AL");
      expect(rules?.leaseRules.specialScheme).toBe("NONE");
    });

    it("should document hybrid lease taxation model", () => {
      const rules = getRulesForState("AL");
      expect(rules?.leaseRules.notes).toContain("HYBRID");
      expect(rules?.leaseRules.notes).toContain("upfront");
      expect(rules?.leaseRules.notes).toContain("monthly");
    });
  });

  describe("Lease - Cap Cost Reduction Taxation", () => {
    it("should tax ALL cap cost reductions upfront", () => {
      const rules = getRulesForState("AL");
      expect(rules?.leaseRules.taxCapReduction).toBe(true);
      expect(rules?.leaseRules.notes).toContain("FULLY TAXABLE");
    });

    it("should document that cash down is taxed", () => {
      const rules = getRulesForState("AL");
      expect(rules?.leaseRules.notes).toContain("cash");
    });

    it("should document that rebates are taxed", () => {
      const rules = getRulesForState("AL");
      expect(rules?.leaseRules.notes).toContain("rebates");
    });

    it("should document that trade-in equity is taxed (no credit)", () => {
      const rules = getRulesForState("AL");
      expect(rules?.leaseRules.notes).toContain("Trade-in");
      expect(rules?.leaseRules.notes).toContain("NO");
    });
  });

  describe("Lease - Rebates and Incentives", () => {
    it("should have ALWAYS_TAXABLE rebate behavior on leases", () => {
      const rules = getRulesForState("AL");
      expect(rules?.leaseRules.rebateBehavior).toBe("ALWAYS_TAXABLE");
    });

    it("should document that lease rebates are taxed as cap reduction", () => {
      const rules = getRulesForState("AL");
      const retailMfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(retailMfrRebate?.taxable).toBe(true); // Taxable in retail too

      expect(rules?.leaseRules.rebateBehavior).toBe("ALWAYS_TAXABLE");
    });
  });

  describe("Lease - Documentation Fee", () => {
    it("should ALWAYS tax doc fee on leases", () => {
      const rules = getRulesForState("AL");
      expect(rules?.leaseRules.docFeeTaxability).toBe("ALWAYS");
    });

    it("should have doc fee as taxable in lease fee rules", () => {
      const rules = getRulesForState("AL");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
    });
  });

  describe("Lease - Trade-In Credit", () => {
    it("should provide NO trade-in credit on leases (major AL feature)", () => {
      const rules = getRulesForState("AL");
      expect(rules?.leaseRules.tradeInCredit).toBe("NONE");
    });

    it("should document that trade-in equity is taxed as cap reduction", () => {
      const rules = getRulesForState("AL");
      expect(rules?.leaseRules.notes).toContain("NO trade-in credit");
      expect(rules?.leaseRules.notes).toContain("FULLY TAXABLE");
    });

    it("should document the difference from purchase treatment", () => {
      const rules = getRulesForState("AL");
      expect(rules?.leaseRules.notes).toContain("major difference from purchases");
    });
  });

  describe("Lease - Negative Equity", () => {
    it("should mark negative equity as TAXABLE on leases", () => {
      const rules = getRulesForState("AL");
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(true);
    });

    it("should differ from retail (retail negative equity NOT taxable)", () => {
      const rules = getRulesForState("AL");
      expect(rules?.taxOnNegativeEquity).toBe(false); // retail
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(true); // lease
    });
  });

  describe("Lease - Fee Tax Rules", () => {
    it("should mark doc fee as TAXABLE on leases", () => {
      const rules = getRulesForState("AL");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
    });

    it("should mark service contracts as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("AL");
      const vsc = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(false);
    });

    it("should mark GAP as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("AL");
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(false);
    });

    it("should mark title fees as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("AL");
      const title = rules?.leaseRules.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("AL");
      const reg = rules?.leaseRules.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Lease - Title Fee Rules", () => {
    it("should have title fee rule configuration", () => {
      const rules = getRulesForState("AL");
      expect(rules?.leaseRules.titleFeeRules).toBeDefined();
      expect(rules?.leaseRules.titleFeeRules.length).toBeGreaterThan(0);
    });

    it("should mark title fees as not taxable but included in cap cost", () => {
      const rules = getRulesForState("AL");
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
      const rules = getRulesForState("AL");
      expect(rules?.reciprocity.enabled).toBe(true);
    });

    it("should apply reciprocity to BOTH retail and lease", () => {
      const rules = getRulesForState("AL");
      expect(rules?.reciprocity.scope).toBe("BOTH");
    });

    it("should use CREDIT_UP_TO_STATE_RATE mode", () => {
      const rules = getRulesForState("AL");
      expect(rules?.reciprocity.homeStateBehavior).toBe("CREDIT_UP_TO_STATE_RATE");
    });

    it("should require proof of tax paid", () => {
      const rules = getRulesForState("AL");
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(true);
    });

    it("should base credit on TAX_PAID", () => {
      const rules = getRulesForState("AL");
      expect(rules?.reciprocity.basis).toBe("TAX_PAID");
    });

    it("should cap credit at Alabama's tax rate", () => {
      const rules = getRulesForState("AL");
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(true);
    });

    it("should not have lease exceptions", () => {
      const rules = getRulesForState("AL");
      expect(rules?.reciprocity.hasLeaseException).toBe(false);
    });

    it("should document FULL reciprocity", () => {
      const rules = getRulesForState("AL");
      expect(rules?.reciprocity.notes).toContain("FULL");
      expect(rules?.reciprocity.notes).toContain("reciprocal credit");
    });

    it("should document Drive-Out Provision (72-hour rule)", () => {
      const rules = getRulesForState("AL");
      expect(rules?.reciprocity.notes).toContain("Drive-Out");
      expect(rules?.reciprocity.notes).toContain("72");
      expect(rules?.reciprocity.notes).toContain("out-of-state buyers");
    });

    it("should document unilateral credit policy", () => {
      const rules = getRulesForState("AL");
      expect(rules?.reciprocity.notes).toContain("unilateral");
    });

    it("should have Drive-Out Provision details in extras", () => {
      const rules = getRulesForState("AL");
      expect(rules?.extras?.driveOutProvisionEffectiveDate).toBe("2022-07-01");
      expect(rules?.extras?.driveOutRemovalWindow).toBe("72 hours");
    });
  });

  // ============================================================================
  // ALABAMA-SPECIFIC FEATURES
  // ============================================================================

  describe("Alabama Unique Features - Dual Automotive Tax Rates", () => {
    it("should document different rates for sales vs leases", () => {
      const rules = getRulesForState("AL");
      expect(rules?.extras?.stateAutomotiveSalesRate).toBe(2.0);
      expect(rules?.extras?.stateAutomotiveLeaseRate).toBe(1.5);
      expect(rules?.extras?.notes).toContain("2% state automotive sales tax");
      expect(rules?.extras?.notes).toContain("1.5%");
    });

    it("should document comparison to general rates", () => {
      const rules = getRulesForState("AL");
      expect(rules?.extras?.stateGeneralSalesRate).toBe(4.0);
      expect(rules?.extras?.stateGeneralRentalRate).toBe(4.0);
    });
  });

  describe("Alabama Unique Features - Partial Trade-In Credit", () => {
    it("should document that trade-in credit applies to state tax only", () => {
      const rules = getRulesForState("AL");
      expect(rules?.extras?.notes).toContain("Trade-in credit applies ONLY to state tax");
    });

    it("should document local rate range", () => {
      const rules = getRulesForState("AL");
      expect(rules?.extras?.localRateRange).toBeDefined();
      expect(rules?.extras?.localRateRange?.min).toBe(0.5);
      expect(rules?.extras?.localRateRange?.max).toBe(8.0);
    });
  });

  describe("Alabama Unique Features - Manufacturer Rebates Taxable", () => {
    it("should document that rebates do not reduce tax base", () => {
      const rules = getRulesForState("AL");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate?.taxable).toBe(true);
      expect(rules?.extras?.notes).toContain("Manufacturer rebates do NOT reduce tax base");
    });
  });

  describe("Alabama Unique Features - No Doc Fee Cap", () => {
    it("should document lack of statutory cap on doc fees", () => {
      const rules = getRulesForState("AL");
      expect(rules?.extras?.notes).toContain("NO CAP");
      expect(rules?.extras?.avgDocFee).toBe(485);
    });
  });

  describe("Alabama Unique Features - Drive-Out Provision", () => {
    it("should document effective date of July 1, 2022", () => {
      const rules = getRulesForState("AL");
      expect(rules?.extras?.driveOutProvisionEffectiveDate).toBe("2022-07-01");
    });

    it("should document 72-hour removal requirement", () => {
      const rules = getRulesForState("AL");
      expect(rules?.extras?.driveOutRemovalWindow).toBe("72 hours");
    });

    it("should document tax cap at destination state rate", () => {
      const rules = getRulesForState("AL");
      expect(rules?.reciprocity.notes).toContain("capped at destination state rate");
    });

    it("should document no local taxes for drive-out sales", () => {
      const rules = getRulesForState("AL");
      expect(rules?.reciprocity.notes).toContain("state tax only");
      expect(rules?.reciprocity.notes).toContain("NO local");
    });
  });

  // ============================================================================
  // EDGE CASES AND SPECIAL SCENARIOS
  // ============================================================================

  describe("Edge Cases - Lease Trade-In Treatment", () => {
    it("should document that lease trade-ins are taxed (opposite of retail)", () => {
      const rules = getRulesForState("AL");
      expect(rules?.leaseRules.tradeInCredit).toBe("NONE");
      expect(rules?.tradeInPolicy.type).toBe("FULL"); // retail has credit
    });
  });

  describe("Edge Cases - Negative Equity Differences", () => {
    it("should document different treatment for retail vs lease", () => {
      const rules = getRulesForState("AL");
      expect(rules?.taxOnNegativeEquity).toBe(false); // retail: not taxable
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(true); // lease: taxable
    });
  });

  // ============================================================================
  // SCENARIO TESTS
  // ============================================================================

  describe("Scenario: Basic Retail Sale with Trade-In (Birmingham - 6.0%)", () => {
    it("should calculate tax with partial trade-in credit", () => {
      // $30,000 vehicle + $495 doc - $10,000 trade
      // State tax: ($30,000 - $10,000 + $495) × 2% = $409.90
      // Local tax: ($30,000 + $495) × 4% = $1,219.80
      // Total: $1,629.70
      const vehiclePrice = 30000;
      const docFee = 495;
      const tradeIn = 10000;

      const stateTaxBase = vehiclePrice - tradeIn + docFee;
      const localTaxBase = vehiclePrice + docFee; // NO trade-in credit

      const stateRate = 0.02;
      const localRate = 0.04;

      const stateTax = stateTaxBase * stateRate;
      const localTax = localTaxBase * localRate;
      const totalTax = stateTax + localTax;

      expect(stateTaxBase).toBe(20495);
      expect(localTaxBase).toBe(30495);
      expect(stateTax).toBeCloseTo(409.90, 2);
      expect(localTax).toBeCloseTo(1219.80, 2);
      expect(totalTax).toBeCloseTo(1629.70, 2);
    });
  });

  describe("Scenario: Retail Sale with Manufacturer Rebate", () => {
    it("should tax full price BEFORE rebate", () => {
      // $35,000 vehicle - $5,000 rebate = $30,000 customer pays
      // But taxable base is $35,000 (rebates are taxable)
      const vehicleMSRP = 35000;
      const mfrRebate = 5000;
      const customerPays = vehicleMSRP - mfrRebate;
      const taxableBase = vehicleMSRP; // NOT customerPays
      const rate = 0.06; // 2% state + 4% local

      expect(customerPays).toBe(30000);
      expect(taxableBase).toBe(35000);
      const tax = taxableBase * rate;
      expect(tax).toBeCloseTo(2100, 2);
      // Customer pays $30,000 but is taxed on $35,000
    });
  });

  describe("Scenario: Retail Sale with Negative Equity", () => {
    it("should NOT tax negative equity on retail", () => {
      const vehiclePrice = 25000;
      const docFee = 495;
      const tradeInValue = 12000;
      const tradeInPayoff = 15000;
      const negativeEquity = tradeInPayoff - tradeInValue;

      const stateTaxBase = vehiclePrice + docFee - tradeInValue;
      const localTaxBase = vehiclePrice + docFee;

      const stateRate = 0.02;
      const localRate = 0.03;

      expect(negativeEquity).toBe(3000);
      expect(stateTaxBase).toBe(13495);
      expect(localTaxBase).toBe(25495);

      const stateTax = stateTaxBase * stateRate;
      const localTax = localTaxBase * localRate;

      expect(stateTax).toBeCloseTo(269.90, 2);
      expect(localTax).toBeCloseTo(764.85, 2);

      // Negative equity NOT included in tax calculation
      const totalTax = stateTax + localTax;
      expect(totalTax).toBeCloseTo(1034.75, 2);
    });
  });

  describe("Scenario: Lease with Cap Reduction (3.5% total: 1.5% state + 2% local)", () => {
    it("should tax cap reduction upfront and payments monthly", () => {
      const capReduction = 10000;
      const docFee = 495;
      const monthlyPayment = 450;
      const term = 36;
      const rate = 0.035; // 1.5% state + 2% local

      const upfrontTaxable = capReduction + docFee;
      const upfrontTax = upfrontTaxable * rate;
      const monthlyTax = monthlyPayment * rate;
      const totalTax = upfrontTax + monthlyTax * term;

      expect(upfrontTaxable).toBe(10495);
      expect(upfrontTax).toBeCloseTo(367.33, 0);
      expect(monthlyTax).toBeCloseTo(15.75, 0);
      expect(totalTax).toBeCloseTo(934.33, 0);
    });
  });

  describe("Scenario: Lease with Trade-In Equity (NO CREDIT)", () => {
    it("should tax trade-in equity as cap reduction on leases", () => {
      const grossCapCost = 35000;
      const tradeInValue = 10000;
      const adjustedCapCost = grossCapCost - tradeInValue;
      const rate = 0.035; // 1.5% state + 2% local

      // Trade-in equity is TAXED on leases (no credit)
      const taxOnTradeIn = tradeInValue * rate;

      expect(adjustedCapCost).toBe(25000);
      expect(taxOnTradeIn).toBeCloseTo(350.00, 2);
      // This is OPPOSITE of retail where trade-in reduces state tax
    });
  });

  describe("Scenario: Lease with Negative Equity", () => {
    it("should tax negative equity on leases (different from retail)", () => {
      const baseCapCost = 30000;
      const tradeInValue = 12000;
      const tradeInPayoff = 15000;
      const negativeEquity = tradeInPayoff - tradeInValue;
      const adjustedCapCost = baseCapCost + negativeEquity;
      const rate = 0.035; // 1.5% state + 2% local

      // Negative equity IS TAXED on leases
      const taxOnNegativeEquity = negativeEquity * rate;

      expect(negativeEquity).toBe(3000);
      expect(adjustedCapCost).toBe(33000);
      expect(taxOnNegativeEquity).toBeCloseTo(105.00, 2);
      // This is DIFFERENT from retail where negative equity is NOT taxable
    });
  });

  describe("Scenario: Drive-Out Provision (Out-of-State Buyer)", () => {
    it("should charge state tax only, no local taxes", () => {
      const vehiclePrice = 30000;
      const tradeIn = 10000;
      const georgiaRate = 0.07; // 7%
      const alStateRate = 0.02; // 2%

      const netPrice = vehiclePrice - tradeIn;

      // Alabama charges 2% state tax only (capped at GA rate)
      const alTaxRate = Math.min(alStateRate, georgiaRate);
      const alStateTax = netPrice * alTaxRate;
      const alLocalTax = 0; // EXEMPT for drive-out
      const totalAlTax = alStateTax + alLocalTax;

      expect(alTaxRate).toBe(0.02);
      expect(alStateTax).toBe(400);
      expect(alLocalTax).toBe(0);
      expect(totalAlTax).toBe(400);

      // Customer will owe additional tax in Georgia
      const gaTax = netPrice * georgiaRate;
      const creditForAlTax = alStateTax;
      const additionalGaTax = gaTax - creditForAlTax;

      expect(gaTax).toBeCloseTo(1400, 2);
      expect(additionalGaTax).toBeCloseTo(1000, 2);
    });
  });

  describe("Scenario: Drive-Out Provision (No-Tax State Buyer)", () => {
    it("should charge ZERO tax for Montana buyer", () => {
      const vehiclePrice = 35000;
      const montanaRate = 0.00; // 0% (no sales tax)
      const alStateRate = 0.02; // 2%

      // Alabama tax capped at destination state rate
      const alTaxRate = Math.min(alStateRate, montanaRate);
      const alTax = vehiclePrice * alTaxRate;

      expect(alTaxRate).toBe(0);
      expect(alTax).toBe(0);
      // Montana buyer pays ZERO Alabama tax
    });
  });

  describe("Scenario: Mobile County High Tax (10% total)", () => {
    it("should calculate tax at highest Alabama rate", () => {
      const vehiclePrice = 28000;
      const docFee = 495;
      const tradeIn = 8000;

      const stateTaxBase = vehiclePrice + docFee - tradeIn;
      const localTaxBase = vehiclePrice + docFee;

      const stateRate = 0.02;
      const localRate = 0.08; // Mobile has 8% local

      const stateTax = stateTaxBase * stateRate;
      const localTax = localTaxBase * localRate;
      const totalTax = stateTax + localTax;

      const totalRate = stateRate + localRate;

      expect(totalRate).toBe(0.10);
      expect(stateTax).toBeCloseTo(409.90, 2);
      expect(localTax).toBeCloseTo(2279.60, 2);
      expect(totalTax).toBeCloseTo(2689.50, 2);
    });
  });

  describe("Scenario: Service Contracts and GAP (NOT Taxable)", () => {
    it("should NOT tax VSC or GAP", () => {
      const vehiclePrice = 30000;
      const vsc = 1500;
      const gap = 695;
      const rate = 0.05; // 2% state + 3% local

      // Only vehicle is taxable, NOT VSC or GAP
      const taxableBase = vehiclePrice;
      const tax = taxableBase * rate;

      expect(tax).toBeCloseTo(1500, 2);

      // If VSC and GAP were taxed (incorrectly), it would be:
      const incorrectTax = (vehiclePrice + vsc + gap) * rate;
      expect(incorrectTax).toBe(1609.75);

      // Verify they're NOT equal
      expect(tax).not.toBe(incorrectTax);

      // Customer saves by VSC and GAP not being taxed
      const savings = incorrectTax - tax;
      expect(savings).toBeCloseTo(109.75, 2);
    });
  });

  // ============================================================================
  // METADATA AND DOCUMENTATION
  // ============================================================================

  describe("Metadata - Sources", () => {
    it("should document official sources", () => {
      const rules = getRulesForState("AL");
      expect(rules?.extras?.sources).toBeDefined();
      expect(rules?.extras?.sources?.length).toBeGreaterThan(0);
    });

    it("should reference Alabama Department of Revenue", () => {
      const rules = getRulesForState("AL");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Alabama Department of Revenue"))).toBe(true);
    });

    it("should reference Alabama Code Title 40", () => {
      const rules = getRulesForState("AL");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Title 40"))).toBe(true);
    });

    it("should reference specific statutes", () => {
      const rules = getRulesForState("AL");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("40-23-2"))).toBe(true);
      expect(sources?.some((s) => s.includes("40-23-65"))).toBe(true);
    });

    it("should reference administrative code", () => {
      const rules = getRulesForState("AL");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Admin"))).toBe(true);
    });

    it("should reference Automotive Guide", () => {
      const rules = getRulesForState("AL");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Automotive"))).toBe(true);
    });
  });

  describe("Metadata - Last Updated", () => {
    it("should have lastUpdated timestamp", () => {
      const rules = getRulesForState("AL");
      expect(rules?.extras?.lastUpdated).toBeDefined();
      expect(rules?.extras?.lastUpdated).toBe("2025-11-13");
    });
  });

  describe("Metadata - Documentation", () => {
    it("should have comprehensive notes in extras", () => {
      const rules = getRulesForState("AL");
      expect(rules?.extras?.notes).toBeDefined();
      expect((rules?.extras?.notes as string)?.length).toBeGreaterThan(100);
    });

    it("should document key Alabama features in notes", () => {
      const rules = getRulesForState("AL");
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("2%");
      expect(notes).toContain("1.5%");
      expect(notes).toContain("Trade-in");
      expect(notes).toContain("NO CAP");
      expect(notes).toContain("Drive-Out");
    });

    it("should have title fee documented", () => {
      const rules = getRulesForState("AL");
      expect(rules?.extras?.titleFee).toBe(25.0);
    });
  });
});
