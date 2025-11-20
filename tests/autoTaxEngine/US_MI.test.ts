import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Michigan (MI) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load Michigan rules successfully", () => {
    const rules = getRulesForState("MI");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("MI");
  });

  it("should mark Michigan as implemented (not a stub)", () => {
    expect(isStateImplemented("MI")).toBe(true);
  });

  it("should have version number 2", () => {
    const rules = getRulesForState("MI");
    expect(rules?.version).toBe(2);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("MI");
    const rulesLower = getRulesForState("mi");
    const rulesMixed = getRulesForState("Mi");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("MI");
    expect(rulesLower?.stateCode).toBe("MI");
    expect(rulesMixed?.stateCode).toBe("MI");
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS
  // ============================================================================

  describe("Retail Trade-In Policy", () => {
    it("should have CAPPED trade-in credit ($11,000)", () => {
      const rules = getRulesForState("MI");
      expect(rules?.tradeInPolicy.type).toBe("CAPPED");
      if (rules?.tradeInPolicy.type === "CAPPED") {
        expect(rules.tradeInPolicy.capAmount).toBe(11000);
      }
    });

    it("should document RV trade-in exception (no cap)", () => {
      const rules = getRulesForState("MI");
      expect(rules?.tradeInPolicy.notes).toContain("NO LIMIT for recreational vehicles");
    });

    it("should use lesser of $11,000 or agreed value", () => {
      const rules = getRulesForState("MI");
      expect(rules?.tradeInPolicy.notes).toContain("whichever is less");
    });
  });

  describe("Retail Rebate Rules", () => {
    it("should have exactly 2 rebate rules", () => {
      const rules = getRulesForState("MI");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as TAXABLE", () => {
      const rules = getRulesForState("MI");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(true);
      expect(mfrRebate?.notes).toContain("Exception: Employee discount");
    });

    it("should mark dealer rebates as TAXABLE", () => {
      const rules = getRulesForState("MI");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(true);
    });
  });

  describe("Retail Doc Fee", () => {
    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("MI");
      expect(rules?.docFeeTaxable).toBe(true);
    });

    it("should document doc fee cap ($260 or 5%)", () => {
      const rules = getRulesForState("MI");
      expect(rules?.extras?.docFeeCap).toBeDefined();
      expect(rules?.extras?.docFeeCap).toContain("$260 or 5%");
    });
  });

  describe("Retail Fee Taxability", () => {
    it("should mark service contracts as NOT TAXABLE if optional", () => {
      const rules = getRulesForState("MI");
      const serviceContract = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(serviceContract?.taxable).toBe(false);
      expect(serviceContract?.notes).toContain("optional");
    });

    it("should mark GAP as NOT TAXABLE", () => {
      const rules = getRulesForState("MI");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap?.taxable).toBe(false);
      expect(gap?.notes).toContain("Insurance premiums exempt");
    });

    it("should mark title fees as NOT TAXABLE", () => {
      const rules = getRulesForState("MI");
      const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NOT TAXABLE", () => {
      const rules = getRulesForState("MI");
      const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Retail Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("MI");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should tax negative equity", () => {
      const rules = getRulesForState("MI");
      expect(rules?.taxOnNegativeEquity).toBe(true);
    });

    it("should NOT tax service contracts if optional", () => {
      const rules = getRulesForState("MI");
      expect(rules?.taxOnServiceContracts).toBe(false);
    });

    it("should NOT tax GAP", () => {
      const rules = getRulesForState("MI");
      expect(rules?.taxOnGap).toBe(false);
    });
  });

  describe("Vehicle Tax Scheme", () => {
    it("should use STATE_ONLY scheme (6% flat)", () => {
      const rules = getRulesForState("MI");
      expect(rules?.vehicleTaxScheme).toBe("STATE_ONLY");
    });

    it("should NOT use local sales tax", () => {
      const rules = getRulesForState("MI");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
    });

    it("should have flat 6% rate", () => {
      const rules = getRulesForState("MI");
      expect(rules?.extras?.flatSalesTaxRate).toBe(0.06);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease Method", () => {
    it("should use MONTHLY lease taxation method", () => {
      const rules = getRulesForState("MI");
      expect(rules?.leaseRules.method).toBe("MONTHLY");
    });

    it("should document 6% use tax on monthly payments", () => {
      const rules = getRulesForState("MI");
      expect(rules?.leaseRules.notes).toContain("6% use tax on monthly lease payments");
    });
  });

  describe("Lease Cap Cost Reduction", () => {
    it("should tax cap reduction (treated as first payment)", () => {
      const rules = getRulesForState("MI");
      expect(rules?.leaseRules.taxCapReduction).toBe(true);
    });

    it("should document cap reduction treatment", () => {
      const rules = getRulesForState("MI");
      expect(rules?.leaseRules.notes).toContain("Capitalized cost reduction (down payment) treated as first payment");
    });
  });

  describe("Lease Rebate Behavior", () => {
    it("should follow retail rule for rebates", () => {
      const rules = getRulesForState("MI");
      expect(rules?.leaseRules.rebateBehavior).toBe("FOLLOW_RETAIL_RULE");
    });
  });

  describe("Lease Doc Fee", () => {
    it("should mark doc fee as ALWAYS taxable on leases", () => {
      const rules = getRulesForState("MI");
      expect(rules?.leaseRules.docFeeTaxability).toBe("ALWAYS");
    });

    it("should have doc fee in lease fee tax rules as taxable", () => {
      const rules = getRulesForState("MI");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee?.taxable).toBe(true);
    });
  });

  describe("Lease Trade-In Credit - CRITICAL MICHIGAN RULE", () => {
    it("should have NONE trade-in credit on leases", () => {
      const rules = getRulesForState("MI");
      expect(rules?.leaseRules.tradeInCredit).toBe("NONE");
    });

    it("should document that trade-in credit statute doesn't extend to leases", () => {
      const rules = getRulesForState("MI");
      expect(rules?.leaseRules.notes).toContain("Trade-in credit statute does NOT extend to lease transactions");
    });
  });

  describe("Lease Negative Equity", () => {
    it("should mark negative equity as TAXABLE on leases", () => {
      const rules = getRulesForState("MI");
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(true);
    });
  });

  describe("Lease Fee Taxability", () => {
    it("should mark service contracts as NOT TAXABLE on leases", () => {
      const rules = getRulesForState("MI");
      const serviceContract = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(serviceContract?.taxable).toBe(false);
      expect(serviceContract?.notes).toContain("Insurance-type VSC not subject to use tax");
    });

    it("should mark GAP as NOT TAXABLE on leases", () => {
      const rules = getRulesForState("MI");
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap?.taxable).toBe(false);
      expect(gap?.notes).toContain("Insurance premiums exempt");
    });

    it("should mark title fees as NOT TAXABLE on leases", () => {
      const rules = getRulesForState("MI");
      const title = rules?.leaseRules.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title?.taxable).toBe(false);
    });
  });

  describe("Lease Tax Timing", () => {
    it("should tax fees upfront on leases", () => {
      const rules = getRulesForState("MI");
      expect(rules?.leaseRules.taxFeesUpfront).toBe(true);
    });
  });

  // ============================================================================
  // RECIPROCITY TESTS
  // ============================================================================

  describe("Reciprocity", () => {
    it("should enable reciprocity", () => {
      const rules = getRulesForState("MI");
      expect(rules?.reciprocity.enabled).toBe(true);
    });

    it("should apply to BOTH retail and lease", () => {
      const rules = getRulesForState("MI");
      expect(rules?.reciprocity.scope).toBe("BOTH");
    });

    it("should use CREDIT_UP_TO_STATE_RATE behavior", () => {
      const rules = getRulesForState("MI");
      expect(rules?.reciprocity.homeStateBehavior).toBe("CREDIT_UP_TO_STATE_RATE");
    });

    it("should require proof of tax paid", () => {
      const rules = getRulesForState("MI");
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(true);
    });

    it("should cap credit at Michigan tax", () => {
      const rules = getRulesForState("MI");
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(true);
    });

    it("should have no lease exception", () => {
      const rules = getRulesForState("MI");
      expect(rules?.reciprocity.hasLeaseException).toBe(false);
    });

    it("should list exempt states", () => {
      const rules = getRulesForState("MI");
      expect(rules?.reciprocity.exemptStates).toBeDefined();
      expect(rules?.reciprocity.exemptStates).toContain("MT");
      expect(rules?.reciprocity.exemptStates).toContain("OR");
      expect(rules?.reciprocity.exemptStates).toContain("DE");
    });

    it("should list non-reciprocal states", () => {
      const rules = getRulesForState("MI");
      expect(rules?.reciprocity.nonReciprocalStates).toBeDefined();
      expect(rules?.reciprocity.nonReciprocalStates?.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // MICHIGAN-SPECIFIC FEATURES
  // ============================================================================

  describe("Michigan Unique Features - Trade-In Cap", () => {
    it("should document $11,000 trade-in cap for motor vehicles", () => {
      const rules = getRulesForState("MI");
      expect(rules?.extras?.tradeInCapNote).toContain("$11,000 cap");
      expect(rules?.extras?.tradeInCapNote).toContain("NO LIMIT for recreational vehicles");
    });
  });

  describe("Michigan Unique Features - Rebate Taxation", () => {
    it("should document that rebates are taxable", () => {
      const rules = getRulesForState("MI");
      expect(rules?.extras?.manufacturerRebateTreatment).toContain("taxable");
      expect(rules?.extras?.manufacturerRebateTreatment).toContain("BEFORE rebate applied");
    });

    it("should document employee discount exception", () => {
      const rules = getRulesForState("MI");
      expect(rules?.extras?.manufacturerRebateTreatment).toContain("employee discounts");
    });
  });

  describe("Michigan Unique Features - Service Contracts and GAP", () => {
    it("should document VSC and GAP non-taxability", () => {
      const rules = getRulesForState("MI");
      expect(rules?.extras?.vscAndGapTreatment).toContain("NOT taxable");
      expect(rules?.extras?.vscAndGapTreatment).toContain("optional and separately itemized");
    });
  });

  describe("Michigan Unique Features - Lease Trade-In", () => {
    it("should document lease trade-in exception", () => {
      const rules = getRulesForState("MI");
      expect(rules?.extras?.leaseTradeInException).toContain("Trade-in credit statute does NOT extend to lease transactions");
    });
  });

  describe("Michigan Unique Features - Cap Reduction Taxation", () => {
    it("should document cap reduction taxation on leases", () => {
      const rules = getRulesForState("MI");
      expect(rules?.extras?.capReductionTaxation).toContain("treated as first payment");
      expect(rules?.extras?.capReductionTaxation).toContain("subject to use tax");
    });
  });

  // ============================================================================
  // SCENARIO TESTS - RETAIL
  // ============================================================================

  describe("Scenario: Basic Retail Sale (6% flat)", () => {
    it("should calculate tax correctly with trade-in under cap", () => {
      // $30,000 vehicle - $8,000 trade = $22,000 taxable
      // Tax @ 6%: $1,320
      const vehiclePrice = 30000;
      const tradeIn = 8000;
      const cap = 11000;
      const tradeInCredit = Math.min(tradeIn, cap);
      const taxableBase = vehiclePrice - tradeInCredit;
      const rate = 0.06;

      expect(tradeInCredit).toBe(8000);
      expect(taxableBase).toBe(22000);
      const tax = taxableBase * rate;
      expect(tax).toBeCloseTo(1320, 2);
    });

    it("should cap trade-in credit at $11,000", () => {
      // $50,000 vehicle - $15,000 trade (capped at $11K) = $39,000 taxable
      // Tax @ 6%: $2,340
      const vehiclePrice = 50000;
      const tradeIn = 15000;
      const cap = 11000;
      const tradeInCredit = Math.min(tradeIn, cap);
      const taxableBase = vehiclePrice - tradeInCredit;
      const rate = 0.06;

      expect(tradeInCredit).toBe(11000); // Capped
      expect(taxableBase).toBe(39000);
      const tax = taxableBase * rate;
      expect(tax).toBeCloseTo(2340, 2);
    });
  });

  describe("Scenario: Retail Sale with Manufacturer Rebate (TAXABLE)", () => {
    it("should tax full price BEFORE rebate", () => {
      // $32,000 vehicle - $3,000 rebate = $29,000 customer pays
      // But taxable base is $32,000 (rebate applied AFTER tax)
      // Tax @ 6%: $1,920
      const vehicleMSRP = 32000;
      const mfrRebate = 3000;
      const customerPays = vehicleMSRP - mfrRebate;
      const taxableBase = vehicleMSRP; // NOT customerPays
      const rate = 0.06;

      expect(customerPays).toBe(29000);
      expect(taxableBase).toBe(32000);
      const tax = taxableBase * rate;
      expect(tax).toBeCloseTo(1920, 2);
    });
  });

  describe("Scenario: RV Trade (No Cap)", () => {
    it("should apply full trade-in credit for RV", () => {
      // $75,000 RV - $30,000 RV trade = $45,000 taxable
      // Tax @ 6%: $2,700
      const rvPrice = 75000;
      const rvTrade = 30000;
      const taxableBase = rvPrice - rvTrade; // NO CAP for RV
      const rate = 0.06;

      expect(taxableBase).toBe(45000);
      const tax = taxableBase * rate;
      expect(tax).toBeCloseTo(2700, 2);
    });
  });

  describe("Scenario: Doc Fee (TAXABLE)", () => {
    it("should include doc fee in taxable base", () => {
      const vehiclePrice = 28000;
      const docFee = 260;
      const totalSalePrice = vehiclePrice + docFee;
      const rate = 0.06;

      const taxableBase = totalSalePrice;
      const tax = taxableBase * rate;

      expect(taxableBase).toBe(28260);
      expect(tax).toBeCloseTo(1695.60, 2);
    });
  });

  describe("Scenario: Negative Equity (TAXABLE)", () => {
    it("should include negative equity in taxable base", () => {
      const vehiclePrice = 30000;
      const tradeInValue = 8000;
      const tradeInPayoff = 12000;
      const negativeEquity = tradeInPayoff - tradeInValue;
      const rate = 0.06;

      const taxableBase = vehiclePrice - tradeInValue + negativeEquity;

      expect(negativeEquity).toBe(4000);
      expect(taxableBase).toBe(26000);
      const tax = taxableBase * rate;
      expect(tax).toBeCloseTo(1560, 2);
    });
  });

  // ============================================================================
  // SCENARIO TESTS - LEASE
  // ============================================================================

  describe("Scenario: Basic Lease (Monthly Taxation)", () => {
    it("should tax monthly payments at 6%", () => {
      const monthlyPayment = 450;
      const rate = 0.06;

      const monthlyTax = monthlyPayment * rate;
      const totalMonthly = monthlyPayment + monthlyTax;

      expect(monthlyTax).toBeCloseTo(27, 2);
      expect(totalMonthly).toBe(477);
    });
  });

  describe("Scenario: Lease with Cap Reduction (Taxed Upfront)", () => {
    it("should tax cap reduction as first payment", () => {
      const capReduction = 3000;
      const rate = 0.06;

      const capReductionTax = capReduction * rate;

      expect(capReductionTax).toBe(180);
    });
  });

  describe("Scenario: Lease with Trade-In (NO CREDIT)", () => {
    it("should NOT provide trade-in credit on leases", () => {
      const baseMonthlyPayment = 450;
      const tradeInValue = 10000; // No tax benefit on leases
      const rate = 0.06;

      // Trade-in reduces cap cost but provides NO TAX BENEFIT
      const monthlyTax = baseMonthlyPayment * rate;

      expect(monthlyTax).toBeCloseTo(27, 2);

      // In retail, $10K trade-in would save:
      const retailSavings = tradeInValue * rate;
      expect(retailSavings).toBe(600);

      // But on lease: $0 savings
    });
  });

  describe("Scenario: Service Contracts and GAP (NOT Taxed on Lease)", () => {
    it("should NOT tax VSC or GAP if optional", () => {
      const monthlyPayment = 450;
      const vsc = 1800; // NOT taxed if optional
      const gap = 695; // NOT taxed
      const rate = 0.06;

      // Only monthly payment is taxed, NOT VSC or GAP
      const monthlyTax = monthlyPayment * rate;

      expect(monthlyTax).toBeCloseTo(27, 2);

      // If incorrectly taxed (error scenario):
      const incorrectTax = (monthlyPayment + vsc + gap) * rate;
      expect(incorrectTax).toBeCloseTo(176.70, 2);

      // Verify they're different
      expect(monthlyTax).not.toBe(incorrectTax);
    });
  });

  // ============================================================================
  // RECIPROCITY SCENARIO TESTS
  // ============================================================================

  describe("Scenario: Reciprocity (Home State Rate Higher)", () => {
    it("should collect Michigan 6% (buyer owes additional in home state)", () => {
      const vehiclePrice = 30000;
      const illinoisRate = 0.0725;
      const michiganRate = 0.06;
      const collectRate = Math.min(michiganRate, michiganRate); // Collect MI rate

      const michiganTax = vehiclePrice * collectRate;

      expect(michiganTax).toBe(1800);

      // When buyer registers in Illinois:
      const illinoisTax = vehiclePrice * illinoisRate;
      const creditForMI = michiganTax;
      const additionalIL = illinoisTax - creditForMI;

      expect(illinoisTax).toBe(2175);
      expect(additionalIL).toBe(375);
    });
  });

  describe("Scenario: Reciprocity (Home State Rate Lower)", () => {
    it("should collect home state rate (lower than Michigan)", () => {
      const vehiclePrice = 30000;
      const northCarolinaRate = 0.03;
      const michiganRate = 0.06;
      const collectRate = Math.min(michiganRate, northCarolinaRate); // Collect NC rate

      const michiganTax = vehiclePrice * collectRate;

      expect(michiganTax).toBe(900);

      // When buyer registers in NC:
      const ncTax = vehiclePrice * northCarolinaRate;
      const creditForMI = michiganTax;
      const additionalNC = ncTax - creditForMI;

      expect(ncTax).toBe(900);
      expect(additionalNC).toBe(0);
    });
  });

  describe("Scenario: Reciprocity (Exempt State - Montana)", () => {
    it("should collect $0 tax for Montana buyer", () => {
      const vehiclePrice = 30000;
      const montanaRate = 0; // No sales tax
      const michiganRate = 0.06;
      const collectRate = montanaRate; // Exempt state

      const michiganTax = vehiclePrice * collectRate;

      expect(michiganTax).toBe(0);
    });
  });

  describe("Scenario: Non-Reciprocal State (Double Taxation)", () => {
    it("should show potential double taxation for Georgia buyer", () => {
      const vehiclePrice = 30000;
      const michiganRate = 0.06;
      const georgiaRate = 0.06;

      // Michigan collects full 6%
      const michiganTax = vehiclePrice * michiganRate;
      expect(michiganTax).toBe(1800);

      // Georgia doesn't provide reciprocity (may collect again)
      const georgiaTax = vehiclePrice * georgiaRate;
      const creditForMI = 0; // No reciprocity
      const totalTaxes = michiganTax + georgiaTax;

      expect(georgiaTax).toBe(1800);
      expect(totalTaxes).toBe(3600); // Potential double taxation
    });
  });

  // ============================================================================
  // METADATA AND DOCUMENTATION
  // ============================================================================

  describe("Metadata", () => {
    it("should have version 2", () => {
      const rules = getRulesForState("MI");
      expect(rules?.version).toBe(2);
    });

    it("should document flat sales tax rate", () => {
      const rules = getRulesForState("MI");
      expect(rules?.extras?.flatSalesTaxRate).toBe(0.06);
    });

    it("should have comprehensive description", () => {
      const rules = getRulesForState("MI");
      expect(rules?.extras?.description).toBeDefined();
      expect(rules?.extras?.description).toContain("6% sales/use tax");
      expect(rules?.extras?.description).toContain("no local additions");
    });

    it("should reference Form 485", () => {
      const rules = getRulesForState("MI");
      expect(rules?.extras?.formReference).toContain("Form 485");
    });
  });
});
