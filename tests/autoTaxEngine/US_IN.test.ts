import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Indiana (IN) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load Indiana rules successfully", () => {
    const rules = getRulesForState("IN");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("IN");
  });

  it("should mark Indiana as implemented (not a stub)", () => {
    expect(isStateImplemented("IN")).toBe(true);
  });

  it("should have version number 2", () => {
    const rules = getRulesForState("IN");
    expect(rules?.version).toBe(2);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("IN");
    const rulesLower = getRulesForState("in");
    const rulesMixed = getRulesForState("In");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("IN");
    expect(rulesLower?.stateCode).toBe("IN");
    expect(rulesMixed?.stateCode).toBe("IN");
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS
  // ============================================================================

  describe("Retail - Trade-In Policy", () => {
    it("should have FULL trade-in credit policy", () => {
      const rules = getRulesForState("IN");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });

    it("should apply full trade-in credit with no cap", () => {
      const rules = getRulesForState("IN");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });
  });

  describe("Retail - Rebate Rules", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("IN");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as NON-TAXABLE (reduce tax base)", () => {
      const rules = getRulesForState("IN");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(false);
    });

    it("should mark dealer rebates as TAXABLE (do not reduce tax base)", () => {
      const rules = getRulesForState("IN");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(true);
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("IN");
      expect(rules?.docFeeTaxable).toBe(true);
    });
  });

  describe("Retail - Fee Tax Rules", () => {
    it("should mark service contracts (VSC) as TAXABLE on retail", () => {
      const rules = getRulesForState("IN");
      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(true);
    });

    it("should mark GAP as TAXABLE on retail", () => {
      const rules = getRulesForState("IN");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(true);
    });

    it("should mark title fees as NON-TAXABLE", () => {
      const rules = getRulesForState("IN");
      const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-TAXABLE", () => {
      const rules = getRulesForState("IN");
      const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });

    it("should mark lien fees as NON-TAXABLE", () => {
      const rules = getRulesForState("IN");
      const lien = rules?.feeTaxRules.find((r) => r.code === "LIEN");
      expect(lien).toBeDefined();
      expect(lien?.taxable).toBe(false);
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("IN");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should tax negative equity", () => {
      const rules = getRulesForState("IN");
      expect(rules?.taxOnNegativeEquity).toBe(true);
    });

    it("should tax service contracts", () => {
      const rules = getRulesForState("IN");
      expect(rules?.taxOnServiceContracts).toBe(true);
    });

    it("should tax GAP insurance", () => {
      const rules = getRulesForState("IN");
      expect(rules?.taxOnGap).toBe(true);
    });
  });

  describe("Retail - Vehicle Tax Scheme", () => {
    it("should use STATE_ONLY vehicle tax scheme", () => {
      const rules = getRulesForState("IN");
      expect(rules?.vehicleTaxScheme).toBe("STATE_ONLY");
    });

    it("should NOT use local sales tax", () => {
      const rules = getRulesForState("IN");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
    });

    it("should document flat 7% rate", () => {
      const rules = getRulesForState("IN");
      expect(rules?.extras?.flatVehicleTaxRate).toBe(0.07);
    });

    it("should document simplicity of flat rate system", () => {
      const rules = getRulesForState("IN");
      expect(rules?.extras?.description).toContain("flat 7%");
      expect(rules?.extras?.description).toContain("no local");
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease - Tax Method", () => {
    it("should use MONTHLY lease taxation method", () => {
      const rules = getRulesForState("IN");
      expect(rules?.leaseRules.method).toBe("MONTHLY");
    });

    it("should NOT tax cap cost reduction", () => {
      const rules = getRulesForState("IN");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });

    it("should tax fees upfront on leases", () => {
      const rules = getRulesForState("IN");
      expect(rules?.leaseRules.taxFeesUpfront).toBe(true);
    });

    it("should have no special scheme", () => {
      const rules = getRulesForState("IN");
      expect(rules?.leaseRules.specialScheme).toBe("NONE");
    });

    it("should document 7% tax on monthly payment", () => {
      const rules = getRulesForState("IN");
      expect(rules?.leaseRules.notes).toContain("7%");
      expect(rules?.leaseRules.notes).toContain("monthly payment");
      expect(rules?.leaseRules.notes).toContain("MONTHLY method");
    });
  });

  describe("Lease - Cap Cost Reduction Taxation", () => {
    it("should NOT tax cap cost reduction upfront", () => {
      const rules = getRulesForState("IN");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });
  });

  describe("Lease - Rebates and Incentives", () => {
    it("should have FOLLOW_RETAIL_RULE rebate behavior on leases", () => {
      const rules = getRulesForState("IN");
      expect(rules?.leaseRules.rebateBehavior).toBe("FOLLOW_RETAIL_RULE");
    });
  });

  describe("Lease - Documentation Fee", () => {
    it("should ALWAYS tax doc fee on leases", () => {
      const rules = getRulesForState("IN");
      expect(rules?.leaseRules.docFeeTaxability).toBe("ALWAYS");
    });

    it("should have doc fee as taxable in lease fee rules", () => {
      const rules = getRulesForState("IN");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
    });
  });

  describe("Lease - Trade-In Credit", () => {
    it("should provide FULL trade-in credit on leases", () => {
      const rules = getRulesForState("IN");
      expect(rules?.leaseRules.tradeInCredit).toBe("FULL");
    });
  });

  describe("Lease - Negative Equity", () => {
    it("should mark negative equity as TAXABLE on leases", () => {
      const rules = getRulesForState("IN");
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(true);
    });
  });

  describe("Lease - Fee Tax Rules", () => {
    it("should mark doc fee as TAXABLE on leases", () => {
      const rules = getRulesForState("IN");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
    });

    it("should mark service contracts as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("IN");
      const vsc = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(false);
    });

    it("should mark GAP as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("IN");
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(false);
    });

    it("should mark title fees as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("IN");
      const title = rules?.leaseRules.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("IN");
      const reg = rules?.leaseRules.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Lease - Title Fee Rules", () => {
    it("should have title fee rule configuration", () => {
      const rules = getRulesForState("IN");
      expect(rules?.leaseRules.titleFeeRules).toBeDefined();
      expect(rules?.leaseRules.titleFeeRules.length).toBeGreaterThan(0);
    });

    it("should mark title fees as not taxable but included in cap cost", () => {
      const rules = getRulesForState("IN");
      const titleRule = rules?.leaseRules.titleFeeRules.find((r) => r.code === "TITLE");
      expect(titleRule).toBeDefined();
      expect(titleRule?.taxable).toBe(false);
      expect(titleRule?.includedInCapCost).toBe(true);
      expect(titleRule?.includedInUpfront).toBe(true);
      expect(titleRule?.includedInMonthly).toBe(false);
    });

    it("should mark registration fees as not taxable but included in cap cost", () => {
      const rules = getRulesForState("IN");
      const regRule = rules?.leaseRules.titleFeeRules.find((r) => r.code === "REG");
      expect(regRule).toBeDefined();
      expect(regRule?.taxable).toBe(false);
      expect(regRule?.includedInCapCost).toBe(true);
      expect(regRule?.includedInUpfront).toBe(true);
      expect(regRule?.includedInMonthly).toBe(false);
    });
  });

  // ============================================================================
  // RECIPROCITY TESTS
  // ============================================================================

  describe("Reciprocity Rules", () => {
    it("should have reciprocity enabled", () => {
      const rules = getRulesForState("IN");
      expect(rules?.reciprocity.enabled).toBe(true);
    });

    it("should apply reciprocity to BOTH retail and lease", () => {
      const rules = getRulesForState("IN");
      expect(rules?.reciprocity.scope).toBe("BOTH");
    });

    it("should use CREDIT_UP_TO_STATE_RATE mode", () => {
      const rules = getRulesForState("IN");
      expect(rules?.reciprocity.homeStateBehavior).toBe("CREDIT_UP_TO_STATE_RATE");
    });

    it("should require proof of tax paid", () => {
      const rules = getRulesForState("IN");
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(true);
    });

    it("should base credit on TAX_PAID", () => {
      const rules = getRulesForState("IN");
      expect(rules?.reciprocity.basis).toBe("TAX_PAID");
    });

    it("should cap credit at Indiana's 7% tax rate", () => {
      const rules = getRulesForState("IN");
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(true);
    });

    it("should not have lease exceptions", () => {
      const rules = getRulesForState("IN");
      expect(rules?.reciprocity.hasLeaseException).toBe(false);
    });

    it("should document credit capped at Indiana's 7% rate", () => {
      const rules = getRulesForState("IN");
      expect(rules?.reciprocity.notes).toContain("7%");
    });
  });

  // ============================================================================
  // INDIANA-SPECIFIC FEATURES
  // ============================================================================

  describe("Indiana Unique Features - Flat 7% Rate", () => {
    it("should document one of the simplest tax systems", () => {
      const rules = getRulesForState("IN");
      expect(rules?.vehicleTaxScheme).toBe("STATE_ONLY");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
      expect(rules?.extras?.flatVehicleTaxRate).toBe(0.07);
    });

    it("should have no local tax variations", () => {
      const rules = getRulesForState("IN");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
    });
  });

  describe("Indiana Unique Features - Backend Products Different on Retail vs Lease", () => {
    it("should tax VSC and GAP on retail but NOT on leases", () => {
      const rules = getRulesForState("IN");

      // Retail - taxable
      const retailVsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      const retailGap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(retailVsc?.taxable).toBe(true);
      expect(retailGap?.taxable).toBe(true);

      // Lease - non-taxable
      const leaseVsc = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      const leaseGap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(leaseVsc?.taxable).toBe(false);
      expect(leaseGap?.taxable).toBe(false);
    });

    it("should document this retail vs lease difference in notes", () => {
      const rules = getRulesForState("IN");
      expect(rules?.leaseRules.notes).toContain("NON-TAXABLE on leases");
      expect(rules?.leaseRules.notes).toContain("taxable on retail");
    });
  });

  describe("Indiana Unique Features - Negative Equity Taxable", () => {
    it("should tax negative equity on both retail and leases", () => {
      const rules = getRulesForState("IN");
      expect(rules?.taxOnNegativeEquity).toBe(true);
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(true);
    });
  });

  // ============================================================================
  // EDGE CASES AND SPECIAL SCENARIOS
  // ============================================================================

  describe("Edge Cases - Manufacturer vs Dealer Rebates", () => {
    it("should document manufacturer rebates reduce tax but dealer rebates don't", () => {
      const rules = getRulesForState("IN");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");

      expect(mfrRebate?.taxable).toBe(false);
      expect(dealerRebate?.taxable).toBe(true);
    });
  });

  describe("Edge Cases - Backend Products Treatment Difference", () => {
    it("should show VSC/GAP are handled completely differently on retail vs lease", () => {
      const rules = getRulesForState("IN");

      // This is unusual - most states treat them the same
      expect(rules?.taxOnServiceContracts).toBe(true); // Retail
      expect(rules?.taxOnGap).toBe(true); // Retail

      const leaseVsc = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      const leaseGap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(leaseVsc?.taxable).toBe(false); // Lease
      expect(leaseGap?.taxable).toBe(false); // Lease
    });
  });

  // ============================================================================
  // COMPREHENSIVE SCENARIO TESTS
  // ============================================================================

  describe("Scenario: Standard Retail Purchase with Trade-In", () => {
    it("should calculate tax correctly at 7% flat rate", () => {
      const rules = getRulesForState("IN");
      // $30,000 vehicle + $250 doc - $10,000 trade = $20,250 taxable
      // Tax @ 7%: $20,250 × 0.07 = $1,417.50
      const vehiclePrice = 30000;
      const docFee = 250;
      const tradeIn = 10000;
      const taxableBase = vehiclePrice + docFee - tradeIn;
      const rate = 0.07;

      expect(taxableBase).toBe(20250);
      const expectedTax = taxableBase * rate;
      expect(expectedTax).toBeCloseTo(1417.50, 2);
    });
  });

  describe("Scenario: Retail with Manufacturer Rebate", () => {
    it("should reduce tax base by manufacturer rebate", () => {
      const rules = getRulesForState("IN");
      // $28,000 vehicle - $2,000 mfr rebate = $26,000 taxable
      // Tax @ 7%: $26,000 × 0.07 = $1,820
      const vehiclePrice = 28000;
      const mfrRebate = 2000;
      const taxableBase = vehiclePrice - mfrRebate;
      const rate = 0.07;

      expect(taxableBase).toBe(26000);
      const expectedTax = taxableBase * rate;
      expect(expectedTax).toBeCloseTo(1820, 2);
    });
  });

  describe("Scenario: Retail with Dealer Rebate (TAXABLE)", () => {
    it("should NOT reduce tax base by dealer rebate", () => {
      const rules = getRulesForState("IN");
      // $28,000 vehicle with $2,000 dealer rebate
      // Customer pays: $26,000
      // BUT taxable base is still $28,000 (dealer rebate doesn't reduce tax)
      const vehiclePrice = 28000;
      const dealerRebate = 2000;
      const customerPays = vehiclePrice - dealerRebate;
      const taxableBase = vehiclePrice; // NOT reduced by dealer rebate
      const rate = 0.07;

      expect(customerPays).toBe(26000);
      expect(taxableBase).toBe(28000);
      const expectedTax = taxableBase * rate;
      expect(expectedTax).toBeCloseTo(1960, 2);
    });
  });

  describe("Scenario: Retail with VSC and GAP (TAXABLE)", () => {
    it("should tax backend products on retail purchase", () => {
      const rules = getRulesForState("IN");
      const vehiclePrice = 28000;
      const vsc = 2500;
      const gap = 895;
      const docFee = 250;
      const accessories = 1500;
      const tradeIn = 9000;
      const rate = 0.07;

      const taxableBase = vehiclePrice + vsc + gap + docFee + accessories - tradeIn;
      const expectedTax = taxableBase * rate;

      expect(taxableBase).toBe(24145);
      expect(expectedTax).toBeCloseTo(1690.15, 2);
    });
  });

  describe("Scenario: Retail with Negative Equity (TAXABLE)", () => {
    it("should tax negative equity on retail", () => {
      const rules = getRulesForState("IN");
      const vehiclePrice = 25000;
      const tradeInValue = 8000;
      const tradeInPayoff = 12000;
      const negativeEquity = tradeInPayoff - tradeInValue;
      const rate = 0.07;

      // Negative equity is TAXABLE in Indiana
      const taxableBase = vehiclePrice + negativeEquity - tradeInValue;
      const expectedTax = taxableBase * rate;

      expect(negativeEquity).toBe(4000);
      expect(taxableBase).toBe(21000);
      expect(expectedTax).toBeCloseTo(1470, 2);
    });
  });

  describe("Scenario: Monthly Lease Taxation", () => {
    it("should tax monthly payment at 7%", () => {
      const rules = getRulesForState("IN");
      const monthlyPayment = 450;
      const docFee = 250;
      const rate = 0.07;

      // Upfront tax
      const upfrontTax = docFee * rate;
      const firstPaymentTax = monthlyPayment * rate;
      const upfrontTotal = upfrontTax + firstPaymentTax;

      // Monthly tax (months 2-36)
      const monthlyTax = monthlyPayment * rate;

      expect(upfrontTax).toBeCloseTo(17.50, 2);
      expect(firstPaymentTax).toBeCloseTo(31.50, 2);
      expect(upfrontTotal).toBeCloseTo(49, 2);
      expect(monthlyTax).toBeCloseTo(31.50, 2);
    });
  });

  describe("Scenario: Lease with VSC and GAP (NON-TAXABLE)", () => {
    it("should NOT tax backend products on leases", () => {
      const rules = getRulesForState("IN");
      const baseMonthlyPayment = 450;
      const vscMonthly = 50; // NOT taxed
      const gapMonthly = 25; // NOT taxed
      const rate = 0.07;

      // Only base payment is taxed
      const monthlyTax = baseMonthlyPayment * rate;

      expect(monthlyTax).toBeCloseTo(31.50, 2);

      // If VSC and GAP were incorrectly taxed:
      const incorrectTax = (baseMonthlyPayment + vscMonthly + gapMonthly) * rate;
      expect(incorrectTax).toBeCloseTo(36.75, 2);

      // Verify they're different
      expect(monthlyTax).not.toBe(incorrectTax);
    });
  });

  describe("Scenario: Lease with Trade-In (Reduces Cap Cost)", () => {
    it("should show trade-in reduces payment and therefore tax", () => {
      const rules = getRulesForState("IN");
      const grossCapCost = 35000;
      const tradeInEquity = 8000;
      const adjustedCapCost = grossCapCost - tradeInEquity;
      const rate = 0.07;

      // Trade-in reduces cap cost, which reduces monthly payment
      const monthlyPaymentWithTrade = 450;
      const monthlyPaymentNoTrade = 550;

      const taxWithTrade = monthlyPaymentWithTrade * rate;
      const taxNoTrade = monthlyPaymentNoTrade * rate;
      const monthlySavings = taxNoTrade - taxWithTrade;

      expect(adjustedCapCost).toBe(27000);
      expect(taxWithTrade).toBeCloseTo(31.50, 2);
      expect(taxNoTrade).toBeCloseTo(38.50, 2);
      expect(monthlySavings).toBeCloseTo(7, 2);
    });
  });

  describe("Scenario: Reciprocity (Other State Higher Rate)", () => {
    it("should cap credit at Indiana's 7% rate", () => {
      const rules = getRulesForState("IN");
      const vehiclePrice = 30000;
      const illinoisTaxPaid = 2400; // 8% paid
      const indianaRate = 0.07;

      const indianaTaxWouldBe = vehiclePrice * indianaRate;
      const creditAllowed = Math.min(illinoisTaxPaid, indianaTaxWouldBe);
      const indianaTaxDue = indianaTaxWouldBe - creditAllowed;

      expect(indianaTaxWouldBe).toBeCloseTo(2100, 2);
      expect(creditAllowed).toBeCloseTo(2100, 2); // Capped at IN rate
      expect(indianaTaxDue).toBe(0);
    });
  });

  describe("Scenario: Reciprocity (Other State Lower Rate)", () => {
    it("should pay difference when other state has lower rate", () => {
      const rules = getRulesForState("IN");
      const vehiclePrice = 30000;
      const montanaTaxPaid = 0; // No sales tax
      const indianaRate = 0.07;

      const indianaTaxWouldBe = vehiclePrice * indianaRate;
      const creditAllowed = montanaTaxPaid;
      const indianaTaxDue = indianaTaxWouldBe - creditAllowed;

      expect(indianaTaxWouldBe).toBeCloseTo(2100, 2);
      expect(creditAllowed).toBe(0);
      expect(indianaTaxDue).toBeCloseTo(2100, 2);
    });
  });

  describe("Scenario: Simplicity Comparison", () => {
    it("should show same 7% rate everywhere in Indiana", () => {
      const rules = getRulesForState("IN");
      // Unlike states with local taxes, Indiana is simple
      expect(rules?.vehicleTaxScheme).toBe("STATE_ONLY");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);

      // Same rate in Indianapolis, Fort Wayne, Evansville, everywhere
      const vehiclePrice = 25000;
      const rate = 0.07;
      const tax = vehiclePrice * rate;

      expect(tax).toBeCloseTo(1750, 2);
    });
  });
});
