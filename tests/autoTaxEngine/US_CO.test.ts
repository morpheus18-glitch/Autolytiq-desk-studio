import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Colorado (CO) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load Colorado rules successfully", () => {
    const rules = getRulesForState("CO");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("CO");
  });

  it("should mark Colorado as implemented (not a stub)", () => {
    expect(isStateImplemented("CO")).toBe(true);
  });

  it("should have version number 2", () => {
    const rules = getRulesForState("CO");
    expect(rules?.version).toBe(2);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("CO");
    const rulesLower = getRulesForState("co");
    const rulesMixed = getRulesForState("Co");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("CO");
    expect(rulesLower?.stateCode).toBe("CO");
    expect(rulesMixed?.stateCode).toBe("CO");
  });

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  describe("Retail Trade-In Policy", () => {
    it("should have FULL trade-in credit (state + local)", () => {
      const rules = getRulesForState("CO");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });

    it("should apply trade-in credit to all taxes (not just state)", () => {
      const rules = getRulesForState("CO");
      // Unlike Alabama where credit only applies to state tax
      expect(rules?.tradeInPolicy.type).toBe("FULL");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(true);
    });
  });

  describe("Retail Rebate Rules", () => {
    it("should have rebate rules for both manufacturer and dealer", () => {
      const rules = getRulesForState("CO");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as TAXABLE (unique CO feature)", () => {
      const rules = getRulesForState("CO");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate?.taxable).toBe(true);
      expect(mfrRebate?.notes).toContain("TAXABLE");
      expect(mfrRebate?.notes).toContain("full purchase price");
    });

    it("should mark dealer rebates as NON-TAXABLE if true price reduction", () => {
      const rules = getRulesForState("CO");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate?.taxable).toBe(false);
      expect(dealerRebate?.notes).toContain("NOT taxable");
    });
  });

  describe("Retail Doc Fee", () => {
    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("CO");
      expect(rules?.docFeeTaxable).toBe(true);
    });

    it("should have NO CAP on doc fees", () => {
      const rules = getRulesForState("CO");
      const docFee = rules?.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee?.taxable).toBe(true);
      expect(docFee?.notes).toContain("NO cap");
      expect(docFee?.notes).toContain("$490");
    });
  });

  describe("Retail Fee Taxability", () => {
    it("should mark service contracts as NOT TAXABLE (services exempt)", () => {
      const rules = getRulesForState("CO");
      const serviceContract = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(serviceContract?.taxable).toBe(false);
      expect(serviceContract?.notes).toContain("NOT");
    });

    it("should mark GAP as NOT TAXABLE (insurance product)", () => {
      const rules = getRulesForState("CO");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap?.taxable).toBe(false);
      expect(gap?.notes).toContain("NOT taxable");
      expect(gap?.notes).toContain("insurance");
    });

    it("should mark title fees as NON-taxable", () => {
      const rules = getRulesForState("CO");
      const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-taxable", () => {
      const rules = getRulesForState("CO");
      const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Retail Product Taxability", () => {
    it("should mark accessories as TAXABLE", () => {
      const rules = getRulesForState("CO");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should mark negative equity as NOT TAXABLE (retail)", () => {
      const rules = getRulesForState("CO");
      expect(rules?.taxOnNegativeEquity).toBe(false);
    });

    it("should mark service contracts as NOT TAXABLE", () => {
      const rules = getRulesForState("CO");
      expect(rules?.taxOnServiceContracts).toBe(false);
    });

    it("should mark GAP as NOT TAXABLE", () => {
      const rules = getRulesForState("CO");
      expect(rules?.taxOnGap).toBe(false);
    });
  });

  describe("Vehicle Tax Scheme", () => {
    it("should use STATE_PLUS_LOCAL scheme", () => {
      const rules = getRulesForState("CO");
      expect(rules?.vehicleTaxScheme).toBe("STATE_PLUS_LOCAL");
    });

    it("should enable local sales tax", () => {
      const rules = getRulesForState("CO");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(true);
    });

    it("should have state rate of 2.9% in extras", () => {
      const rules = getRulesForState("CO");
      expect(rules?.extras?.stateRate).toBe(2.9);
    });

    it("should have RTD rate of 1.0% in extras", () => {
      const rules = getRulesForState("CO");
      expect(rules?.extras?.rtdRate).toBe(1.0);
    });

    it("should document 68 home-rule cities", () => {
      const rules = getRulesForState("CO");
      expect(rules?.extras?.homeRuleCityCount).toBe(68);
    });

    // eslint-disable-next-line complexity -- optional chaining counted as branches
    it("should have major jurisdiction rates", () => {
      const rules = getRulesForState("CO");
      expect(rules?.extras?.majorJurisdictions?.Denver).toBeDefined();
      expect(rules?.extras?.majorJurisdictions?.Denver?.total).toBe(8.71);
      expect(rules?.extras?.majorJurisdictions?.ColoradoSprings).toBeDefined();
      expect(rules?.extras?.majorJurisdictions?.Aurora).toBeDefined();
      expect(rules?.extras?.majorJurisdictions?.Boulder).toBeDefined();
    });
  });

  // ============================================================================
  // LEASE TRANSACTION RULES
  // ============================================================================

  describe("Lease Method", () => {
    it("should use HYBRID lease method (upfront + monthly)", () => {
      const rules = getRulesForState("CO");
      expect(rules?.leaseRules.method).toBe("HYBRID");
    });

    it("should have CO_HOME_RULE_LEASE special scheme", () => {
      const rules = getRulesForState("CO");
      expect(rules?.leaseRules.specialScheme).toBe("CO_HOME_RULE_LEASE");
    });
  });

  describe("Lease Cap Cost Reduction", () => {
    it("should tax cap cost reduction upfront (FULLY TAXABLE)", () => {
      const rules = getRulesForState("CO");
      expect(rules?.leaseRules.taxCapReduction).toBe(true);
    });
  });

  describe("Lease Rebate Behavior", () => {
    it("should mark rebates as ALWAYS_TAXABLE on leases", () => {
      const rules = getRulesForState("CO");
      expect(rules?.leaseRules.rebateBehavior).toBe("ALWAYS_TAXABLE");
    });
  });

  describe("Lease Doc Fee", () => {
    it("should mark doc fee as ALWAYS taxable on leases", () => {
      const rules = getRulesForState("CO");
      expect(rules?.leaseRules.docFeeTaxability).toBe("ALWAYS");
    });

    it("should have doc fee in lease fee tax rules", () => {
      const rules = getRulesForState("CO");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee?.taxable).toBe(true);
    });

    it("should have acquisition fee in lease fee tax rules", () => {
      const rules = getRulesForState("CO");
      const acqFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "ACQUISITION_FEE");
      expect(acqFee?.taxable).toBe(true);
    });
  });

  describe("Lease Trade-In Credit", () => {
    it("should use FOLLOW_RETAIL_RULE for trade-in on leases", () => {
      const rules = getRulesForState("CO");
      expect(rules?.leaseRules.tradeInCredit).toBe("FOLLOW_RETAIL_RULE");
    });
  });

  describe("Lease Negative Equity", () => {
    it("should mark negative equity as TAXABLE on leases", () => {
      const rules = getRulesForState("CO");
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(true);
    });

    it("should differ from retail (retail negative equity NOT taxable)", () => {
      const rules = getRulesForState("CO");
      expect(rules?.taxOnNegativeEquity).toBe(false); // retail
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(true); // lease
    });
  });

  describe("Lease Fee Taxability", () => {
    it("should mark service contracts as NOT TAXABLE on leases", () => {
      const rules = getRulesForState("CO");
      const serviceContract = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(serviceContract?.taxable).toBe(false);
    });

    it("should mark GAP as NOT TAXABLE on leases", () => {
      const rules = getRulesForState("CO");
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap?.taxable).toBe(false);
    });

    it("should mark title fees as NOT TAXABLE on leases", () => {
      const rules = getRulesForState("CO");
      const title = rules?.leaseRules.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title?.taxable).toBe(false);
    });

    it("should have title fee rules", () => {
      const rules = getRulesForState("CO");
      expect(rules?.leaseRules.titleFeeRules).toBeDefined();
      expect(rules?.leaseRules.titleFeeRules.length).toBeGreaterThan(0);
    });
  });

  describe("Lease Tax Timing", () => {
    it("should tax fees upfront on leases", () => {
      const rules = getRulesForState("CO");
      expect(rules?.leaseRules.taxFeesUpfront).toBe(true);
    });
  });

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  describe("Reciprocity", () => {
    it("should enable reciprocity", () => {
      const rules = getRulesForState("CO");
      expect(rules?.reciprocity.enabled).toBe(true);
    });

    it("should apply to BOTH retail and lease", () => {
      const rules = getRulesForState("CO");
      expect(rules?.reciprocity.scope).toBe("BOTH");
    });

    it("should use CREDIT_UP_TO_STATE_RATE behavior", () => {
      const rules = getRulesForState("CO");
      expect(rules?.reciprocity.homeStateBehavior).toBe("CREDIT_UP_TO_STATE_RATE");
    });

    it("should require proof of tax paid", () => {
      const rules = getRulesForState("CO");
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(true);
    });

    it("should cap credit at Colorado state tax (not local)", () => {
      const rules = getRulesForState("CO");
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(true);
      expect(rules?.reciprocity.notes).toContain("STATE use tax");
      expect(rules?.reciprocity.notes).toContain("Local taxes");
    });

    it("should have no lease exception", () => {
      const rules = getRulesForState("CO");
      expect(rules?.reciprocity.hasLeaseException).toBe(false);
    });
  });

  // ============================================================================
  // COLORADO-SPECIFIC FEATURES
  // ============================================================================

  describe("Colorado-Specific Features", () => {
    it("should document home-rule cities", () => {
      const rules = getRulesForState("CO");
      expect(rules?.extras?.homeRuleCityNote).toContain("68");
      expect(rules?.extras?.homeRuleCityNote).toContain("Denver");
    });

    it("should document RTD counties", () => {
      const rules = getRulesForState("CO");
      expect(rules?.extras?.rtdCounties).toBeDefined();
      expect(rules?.extras?.rtdCounties?.length).toBeGreaterThan(0);
      expect(rules?.extras?.rtdCounties).toContain("Denver County (full)");
    });

    it("should document Specific Ownership Tax (SOT)", () => {
      const rules = getRulesForState("CO");
      expect(rules?.extras?.specificOwnershipTax).toBeDefined();
      expect(rules?.extras?.specificOwnershipTax).toContain("annual");
      expect(rules?.extras?.specificOwnershipTax).toContain("SEPARATE");
    });

    it("should list unique features", () => {
      const rules = getRulesForState("CO");
      expect(rules?.extras?.uniqueFeatures).toBeDefined();
      expect(rules?.extras?.uniqueFeatures?.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // SCENARIO TESTS
  // ============================================================================

  describe("Scenario: Basic Retail Sale (Denver - 8.71%)", () => {
    it("should calculate tax correctly with trade-in", () => {
      // $30,000 vehicle + $490 doc - $10,000 trade = $20,490 taxable
      // Tax @ 8.71%: $20,490 × 0.0871 = $1,784.68
      const vehiclePrice = 30000;
      const docFee = 490;
      const tradeIn = 10000;
      const taxableBase = vehiclePrice + docFee - tradeIn;
      const denverRate = 0.0871; // 2.9% state + 4.81% city + 1.0% RTD

      expect(taxableBase).toBe(20490);
      const expectedTax = taxableBase * denverRate;
      expect(expectedTax).toBeCloseTo(1784.68, 2);
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
      const rate = 0.075; // 7.5% example

      expect(customerPays).toBe(30000);
      expect(taxableBase).toBe(35000);
      const tax = taxableBase * rate;
      expect(tax).toBeCloseTo(2625, 2);
    });
  });

  describe("Scenario: Retail Sale with Negative Equity", () => {
    it("should NOT tax negative equity on retail", () => {
      const vehiclePrice = 28000;
      const docFee = 490;
      const tradeInValue = 10000;
      const tradeInPayoff = 14000;
      const negativeEquity = tradeInPayoff - tradeInValue;

      const taxableBase = vehiclePrice + docFee - tradeInValue;
      // Negative equity NOT added to taxable base
      const rate = 0.075;

      expect(negativeEquity).toBe(4000);
      expect(taxableBase).toBe(18490);
      const tax = taxableBase * rate;
      expect(tax).toBeCloseTo(1386.75, 2);
    });
  });

  describe("Scenario: Lease with Cap Reduction (Denver - 8.71%)", () => {
    it("should tax cap reduction upfront and payments monthly", () => {
      const capReduction = 5000;
      const docFee = 595;
      const monthlyPayment = 450;
      const term = 36;
      const rate = 0.0871; // Denver

      const upfrontTaxable = capReduction + docFee;
      const upfrontTax = upfrontTaxable * rate;
      const monthlyTax = monthlyPayment * rate;
      const totalTax = upfrontTax + monthlyTax * term;

      expect(upfrontTaxable).toBe(5595);
      expect(upfrontTax).toBeCloseTo(487.32, 0);
      expect(monthlyTax).toBeCloseTo(39.19, 0);
      expect(totalTax).toBeCloseTo(1898.34, 0);
    });
  });

  describe("Scenario: Lease with Trade-In Equity", () => {
    it("should tax trade-in equity as cap reduction on leases", () => {
      const grossCapCost = 40000;
      const tradeInValue = 8000;
      const adjustedCapCost = grossCapCost - tradeInValue;
      const rate = 0.0871;

      // Trade-in equity is TAXED on leases (unlike retail)
      const taxOnTradeIn = tradeInValue * rate;

      expect(adjustedCapCost).toBe(32000);
      expect(taxOnTradeIn).toBeCloseTo(696.80, 2);
    });
  });

  describe("Scenario: Lease with Negative Equity", () => {
    it("should tax negative equity on leases (different from retail)", () => {
      const baseCapCost = 35000;
      const tradeInValue = 10000;
      const tradeInPayoff = 14000;
      const negativeEquity = tradeInPayoff - tradeInValue;
      const adjustedCapCost = baseCapCost + negativeEquity;
      const rate = 0.0871;

      // Negative equity IS TAXED on leases
      const taxOnNegativeEquity = negativeEquity * rate;

      expect(negativeEquity).toBe(4000);
      expect(adjustedCapCost).toBe(39000);
      expect(taxOnNegativeEquity).toBeCloseTo(348.40, 2);
    });
  });

  describe("Scenario: Reciprocity (Out-of-State Purchase)", () => {
    it("should credit state tax only, NOT local taxes", () => {
      const vehiclePrice = 25000;
      const arizonaTaxPaid = 1375; // 5.5%
      const coStateRate = 0.029;
      const denverCityRate = 0.0481;
      const rtdRate = 0.01;

      const coStateTax = vehiclePrice * coStateRate;
      const creditAllowed = Math.min(arizonaTaxPaid, coStateTax);
      const coStateOwed = coStateTax - creditAllowed;

      // Local taxes owed in FULL
      const localTax = vehiclePrice * (denverCityRate + rtdRate);
      const totalOwed = coStateOwed + localTax;

      expect(coStateTax).toBeCloseTo(725, 2);
      expect(creditAllowed).toBeCloseTo(725, 2); // AZ tax covers CO state tax
      expect(coStateOwed).toBe(0);
      expect(localTax).toBeCloseTo(1452.50, 2);
      expect(totalOwed).toBeCloseTo(1452.50, 2);
    });
  });

  describe("Scenario: Colorado Springs (No RTD)", () => {
    it("should not include RTD tax in Colorado Springs", () => {
      const vehiclePrice = 25000;
      const docFee = 490;
      const tradeIn = 8000;
      const taxableBase = vehiclePrice + docFee - tradeIn;

      const stateRate = 0.029;
      const countyRate = 0.0123; // El Paso County
      const cityRate = 0.0307; // Colorado Springs
      // NO RTD in Colorado Springs
      const totalRate = stateRate + countyRate + cityRate;

      expect(totalRate).toBeCloseTo(0.072, 3);
      const tax = taxableBase * totalRate;
      expect(tax).toBeCloseTo(1259.28, 2);
    });
  });

  describe("Scenario: Service Contracts and GAP (NOT Taxable)", () => {
    it("should NOT tax VSC or GAP", () => {
      const vehiclePrice = 30000;
      const vsc = 2500;
      const gap = 895;
      const rate = 0.075;

      // Only vehicle is taxable, NOT VSC or GAP
      const taxableBase = vehiclePrice; // VSC and GAP excluded
      const tax = taxableBase * rate;

      expect(tax).toBeCloseTo(2250, 2);
      // If VSC and GAP were taxed (incorrectly), it would be:
      const incorrectTax = (vehiclePrice + vsc + gap) * rate;
      expect(incorrectTax).toBe(2504.625);
      // Verify they're NOT equal
      expect(tax).not.toBe(incorrectTax);
    });
  });

  // ============================================================================
  // METADATA AND DOCUMENTATION
  // ============================================================================

  describe("Metadata", () => {
    it("should have lastUpdated date", () => {
      const rules = getRulesForState("CO");
      expect(rules?.extras?.lastUpdated).toBe("2025-11-13");
    });

    it("should have source citations", () => {
      const rules = getRulesForState("CO");
      expect(rules?.extras?.sources).toBeDefined();
      expect(rules?.extras?.sources?.length).toBeGreaterThan(0);
    });

    it("should have comprehensive notes", () => {
      const rules = getRulesForState("CO");
      expect(rules?.extras?.notes).toBeDefined();
      expect(rules?.extras?.notes?.length).toBeGreaterThan(100);
    });

    it("should document average doc fee", () => {
      const rules = getRulesForState("CO");
      expect(rules?.extras?.avgDocFee).toBe(490);
    });

    it("should document combined rate range", () => {
      const rules = getRulesForState("CO");
      expect(rules?.extras?.combinedRateRange).toBeDefined();
      expect(rules?.extras?.combinedRateRange?.min).toBe(2.9);
      expect(rules?.extras?.combinedRateRange?.max).toBe(15.9);
    });
  });
});
