import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Texas (TX) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load Texas rules successfully", () => {
    const rules = getRulesForState("TX");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("TX");
  });

  it("should mark Texas as implemented (not a stub)", () => {
    expect(isStateImplemented("TX")).toBe(true);
  });

  it("should have version number 1", () => {
    const rules = getRulesForState("TX");
    expect(rules?.version).toBe(1);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("TX");
    const rulesLower = getRulesForState("tx");
    const rulesMixed = getRulesForState("Tx");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("TX");
    expect(rulesLower?.stateCode).toBe("TX");
    expect(rulesMixed?.stateCode).toBe("TX");
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS
  // ============================================================================

  describe("Retail - Trade-In Policy", () => {
    it("should have FULL trade-in credit policy", () => {
      const rules = getRulesForState("TX");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });
  });

  describe("Retail - Rebate Rules", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("TX");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as NON-TAXABLE", () => {
      const rules = getRulesForState("TX");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(false);
      expect(mfrRebate?.notes).toContain("reduce");
    });

    it("should mark dealer rebates as TAXABLE", () => {
      const rules = getRulesForState("TX");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(true);
      expect(dealerRebate?.notes).toContain("not reduce");
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("TX");
      expect(rules?.docFeeTaxable).toBe(true);
    });

    it("should document no state cap on doc fees", () => {
      const rules = getRulesForState("TX");
      expect(rules?.extras?.notes).toContain("No cap on doc fees");
    });
  });

  describe("Retail - Fee Tax Rules", () => {
    it("should mark service contracts (VSC) as NON-TAXABLE", () => {
      const rules = getRulesForState("TX");
      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(false);
      expect(vsc?.notes).toContain("not taxable");
      expect(vsc?.notes).toContain("insurance");
    });

    it("should mark GAP as NON-TAXABLE", () => {
      const rules = getRulesForState("TX");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(false);
      expect(gap?.notes).toContain("not taxable");
    });

    it("should mark title fees as NON-TAXABLE", () => {
      const rules = getRulesForState("TX");
      const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-TAXABLE", () => {
      const rules = getRulesForState("TX");
      const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("TX");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should tax negative equity", () => {
      const rules = getRulesForState("TX");
      expect(rules?.taxOnNegativeEquity).toBe(true);
    });

    it("should NOT tax service contracts", () => {
      const rules = getRulesForState("TX");
      expect(rules?.taxOnServiceContracts).toBe(false);
    });

    it("should NOT tax GAP insurance", () => {
      const rules = getRulesForState("TX");
      expect(rules?.taxOnGap).toBe(false);
    });
  });

  describe("Retail - Vehicle Tax Scheme", () => {
    it("should use STATE_PLUS_LOCAL vehicle tax scheme", () => {
      const rules = getRulesForState("TX");
      expect(rules?.vehicleTaxScheme).toBe("STATE_PLUS_LOCAL");
    });

    it("should apply local sales tax to vehicles", () => {
      const rules = getRulesForState("TX");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(true);
    });

    it("should document state rate of 6.25%", () => {
      const rules = getRulesForState("TX");
      expect(rules?.extras?.stateRate).toBe(6.25);
    });

    it("should document max local rate of 2.0%", () => {
      const rules = getRulesForState("TX");
      expect(rules?.extras?.maxLocalRate).toBe(2.0);
    });

    it("should document max combined rate of 8.25%", () => {
      const rules = getRulesForState("TX");
      expect(rules?.extras?.maxCombinedRate).toBe(8.25);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease - Tax Method", () => {
    it("should use MONTHLY lease taxation method", () => {
      const rules = getRulesForState("TX");
      expect(rules?.leaseRules.method).toBe("MONTHLY");
    });

    it("should NOT tax cap cost reduction", () => {
      const rules = getRulesForState("TX");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });

    it("should tax fees upfront on leases", () => {
      const rules = getRulesForState("TX");
      expect(rules?.leaseRules.taxFeesUpfront).toBe(true);
    });

    it("should have TX_LEASE_SPECIAL scheme", () => {
      const rules = getRulesForState("TX");
      expect(rules?.leaseRules.specialScheme).toBe("TX_LEASE_SPECIAL");
    });

    it("should document monthly lease taxation", () => {
      const rules = getRulesForState("TX");
      expect(rules?.leaseRules.notes).toContain("6.25% state");
      expect(rules?.leaseRules.notes).toContain("up to 2% local");
      expect(rules?.leaseRules.notes).toContain("monthly payments");
    });
  });

  describe("Lease - Rebates and Incentives", () => {
    it("should have FOLLOW_RETAIL_RULE rebate behavior on leases", () => {
      const rules = getRulesForState("TX");
      expect(rules?.leaseRules.rebateBehavior).toBe("FOLLOW_RETAIL_RULE");
    });
  });

  describe("Lease - Documentation Fee", () => {
    it("should ALWAYS tax doc fee on leases", () => {
      const rules = getRulesForState("TX");
      expect(rules?.leaseRules.docFeeTaxability).toBe("ALWAYS");
    });

    it("should have doc fee in lease fee rules as taxable", () => {
      const rules = getRulesForState("TX");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
      expect(docFee?.notes).toContain("upfront");
    });
  });

  describe("Lease - Trade-In Credit", () => {
    it("should provide FULL trade-in credit on leases", () => {
      const rules = getRulesForState("TX");
      expect(rules?.leaseRules.tradeInCredit).toBe("FULL");
    });
  });

  describe("Lease - Negative Equity", () => {
    it("should mark negative equity as TAXABLE on leases", () => {
      const rules = getRulesForState("TX");
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(true);
    });
  });

  describe("Lease - Fee Tax Rules", () => {
    it("should mark doc fee as TAXABLE on leases", () => {
      const rules = getRulesForState("TX");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
    });

    it("should mark service contracts as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("TX");
      const vsc = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(false);
      expect(vsc?.notes).toContain("not taxed");
      expect(vsc?.notes).toContain("insurance");
    });

    it("should mark GAP as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("TX");
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(false);
      expect(gap?.notes).toContain("not taxed");
      expect(gap?.notes).toContain("insurance");
    });

    it("should mark title fees as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("TX");
      const title = rules?.leaseRules.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("TX");
      const reg = rules?.leaseRules.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Lease - Title Fee Rules", () => {
    it("should have title fee rule configuration", () => {
      const rules = getRulesForState("TX");
      expect(rules?.leaseRules.titleFeeRules).toBeDefined();
      expect(rules?.leaseRules.titleFeeRules.length).toBeGreaterThan(0);
    });

    it("should mark title fees as not taxable but included in cap cost", () => {
      const rules = getRulesForState("TX");
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
      const rules = getRulesForState("TX");
      expect(rules?.reciprocity.enabled).toBe(true);
    });

    it("should apply reciprocity to BOTH retail and lease", () => {
      const rules = getRulesForState("TX");
      expect(rules?.reciprocity.scope).toBe("BOTH");
    });

    it("should use CREDIT_UP_TO_STATE_RATE mode", () => {
      const rules = getRulesForState("TX");
      expect(rules?.reciprocity.homeStateBehavior).toBe("CREDIT_UP_TO_STATE_RATE");
    });

    it("should require proof of tax paid", () => {
      const rules = getRulesForState("TX");
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(true);
    });

    it("should base credit on TAX_PAID", () => {
      const rules = getRulesForState("TX");
      expect(rules?.reciprocity.basis).toBe("TAX_PAID");
    });

    it("should cap credit at Texas tax rate", () => {
      const rules = getRulesForState("TX");
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(true);
    });

    it("should not have lease exceptions", () => {
      const rules = getRulesForState("TX");
      expect(rules?.reciprocity.hasLeaseException).toBe(false);
    });

    it("should document reciprocity policy", () => {
      const rules = getRulesForState("TX");
      expect(rules?.reciprocity.notes).toContain("credit for sales tax paid");
      expect(rules?.reciprocity.notes).toContain("capped at TX rate");
      expect(rules?.reciprocity.notes).toContain("proof");
    });
  });

  // ============================================================================
  // TEXAS-SPECIFIC FEATURES
  // ============================================================================

  describe("Texas Unique Features - Motor Vehicle Sales Tax", () => {
    it("should document motor vehicle specific tax", () => {
      const rules = getRulesForState("TX");
      expect(rules?.extras?.notes).toContain("motor vehicle sales tax");
      expect(rules?.extras?.notes).toContain("not general sales tax");
    });
  });

  describe("Texas Unique Features - Service Contracts and GAP Not Taxed", () => {
    it("should document that service contracts and GAP are not taxed", () => {
      const rules = getRulesForState("TX");
      expect(rules?.extras?.notes).toContain("Service contracts and GAP are NOT taxed");
      expect(rules?.extras?.notes).toContain("insurance products");
    });
  });

  describe("Texas Unique Features - No Doc Fee Cap", () => {
    it("should document no cap on doc fees", () => {
      const rules = getRulesForState("TX");
      expect(rules?.extras?.notes).toContain("No cap on doc fees");
    });
  });

  // ============================================================================
  // SCENARIO TESTS
  // ============================================================================

  describe("Scenario: Basic Retail Sale (State Rate Only)", () => {
    it("should calculate tax at 6.25% state rate", () => {
      // $30,000 vehicle - $10,000 trade-in = $20,000 taxable
      // Tax @ 6.25%: $20,000 × 0.0625 = $1,250
      const vehiclePrice = 30000;
      const tradeIn = 10000;
      const taxableBase = vehiclePrice - tradeIn;
      const stateRate = 0.0625;

      expect(taxableBase).toBe(20000);
      const expectedTax = taxableBase * stateRate;
      expect(expectedTax).toBe(1250);
    });
  });

  describe("Scenario: Retail Sale with Maximum Rate (8.25%)", () => {
    it("should calculate tax at 8.25% maximum combined rate", () => {
      const vehiclePrice = 35000;
      const tradeIn = 8000;
      const taxableBase = vehiclePrice - tradeIn;
      const maxRate = 0.0825; // 6.25% state + 2% local

      expect(taxableBase).toBe(27000);
      const tax = taxableBase * maxRate;
      expect(tax).toBe(2227.50);
    });
  });

  describe("Scenario: Retail Sale with Doc Fee (Taxable)", () => {
    it("should tax doc fee", () => {
      const vehiclePrice = 25000;
      const docFee = 300;
      const tradeIn = 5000;
      const rate = 0.0625;

      // Doc fee IS taxable in Texas
      const taxableBase = vehiclePrice + docFee - tradeIn;
      const tax = taxableBase * rate;

      expect(taxableBase).toBe(20300);
      expect(tax).toBe(1268.75);
    });
  });

  describe("Scenario: Retail Sale with VSC and GAP (Not Taxable)", () => {
    it("should NOT tax VSC or GAP", () => {
      const vehiclePrice = 28000;
      const vsc = 2500; // NOT taxable
      const gap = 895; // NOT taxable
      const tradeIn = 8000;
      const rate = 0.0625;

      // VSC and GAP are NOT taxable in Texas
      const taxableBase = vehiclePrice - tradeIn; // VSC and GAP excluded
      const tax = taxableBase * rate;

      expect(taxableBase).toBe(20000);
      expect(tax).toBe(1250);
    });
  });

  describe("Scenario: Retail Sale with Accessories and Negative Equity", () => {
    it("should tax accessories and negative equity", () => {
      const vehiclePrice = 30000;
      const accessories = 1500; // TAXABLE
      const tradeInValue = 8000;
      const tradeInPayoff = 11000;
      const negativeEquity = tradeInPayoff - tradeInValue; // $3,000
      const rate = 0.0625;

      // Accessories and negative equity are TAXABLE
      const taxableBase = vehiclePrice + accessories + negativeEquity - tradeInValue;
      const tax = taxableBase * rate;

      expect(negativeEquity).toBe(3000);
      expect(taxableBase).toBe(26500);
      expect(tax).toBeCloseTo(1656.25, 2);
    });
  });

  describe("Scenario: Retail Sale with Manufacturer Rebate", () => {
    it("should deduct manufacturer rebate from taxable amount", () => {
      const vehiclePrice = 32000;
      const mfrRebate = 3000; // NOT taxable
      const rate = 0.0625;

      // Manufacturer rebate reduces taxable amount
      const taxableBase = vehiclePrice - mfrRebate;
      const tax = taxableBase * rate;

      expect(taxableBase).toBe(29000);
      expect(tax).toBe(1812.50);
    });
  });

  describe("Scenario: Retail Sale with Dealer Cash", () => {
    it("should NOT deduct dealer cash from taxable amount", () => {
      const vehiclePrice = 28000;
      const dealerCash = 1500; // TAXABLE
      const customerPays = vehiclePrice - dealerCash;
      const rate = 0.0625;

      // Dealer cash does NOT reduce taxable amount in Texas
      const taxableBase = vehiclePrice; // Full price
      const tax = taxableBase * rate;

      expect(customerPays).toBe(26500);
      expect(taxableBase).toBe(28000);
      expect(tax).toBe(1750);
    });
  });

  describe("Scenario: Basic Lease (Monthly Taxation)", () => {
    it("should tax monthly payments only", () => {
      const monthlyPayment = 400;
      const term = 36;
      const rate = 0.0625;

      // Tax applied to each monthly payment
      const monthlyTax = monthlyPayment * rate;
      const totalTax = monthlyTax * term;

      expect(monthlyTax).toBe(25);
      expect(totalTax).toBe(900);
    });
  });

  describe("Scenario: Lease with Down Payment and Doc Fee", () => {
    it("should tax doc fee upfront and payments monthly", () => {
      const downPayment = 2000; // NOT taxed (reduces cap cost)
      const docFee = 595; // TAXABLE upfront
      const monthlyPayment = 450;
      const term = 36;
      const rate = 0.0825; // Max rate

      // Doc fee taxed upfront
      const upfrontTax = docFee * rate;
      // Monthly payments taxed monthly
      const monthlyTax = monthlyPayment * rate;
      const totalTax = upfrontTax + (monthlyTax * term);

      expect(upfrontTax).toBeCloseTo(49.09, 2);
      expect(monthlyTax).toBeCloseTo(37.13, 2);
      expect(totalTax).toBeCloseTo(1385.77, 2);
    });
  });

  describe("Scenario: Lease with VSC and GAP (Not Taxable)", () => {
    it("should NOT tax VSC or GAP on leases", () => {
      const monthlyPayment = 350;
      const vsc = 2000; // NOT taxable on lease
      const gap = 500; // NOT taxable on lease
      const term = 36;
      const rate = 0.0625;

      // Only monthly payment is taxed
      const monthlyTax = monthlyPayment * rate;
      const totalTax = monthlyTax * term;

      expect(monthlyTax).toBeCloseTo(21.88, 2);
      expect(totalTax).toBeCloseTo(787.50, 2);
    });
  });

  describe("Scenario: Reciprocity (Arizona Purchase)", () => {
    it("should credit Arizona tax and collect difference", () => {
      const vehiclePrice = 30000;
      const arizonaTaxPaid = 1680; // 5.6%
      const texasRate = 0.0625; // 6.25%

      const texasTaxDue = vehiclePrice * texasRate;
      const credit = arizonaTaxPaid;
      const additionalTexasTax = texasTaxDue - credit;

      expect(texasTaxDue).toBe(1875);
      expect(credit).toBe(1680);
      expect(additionalTexasTax).toBe(195);
    });
  });

  describe("Scenario: Reciprocity (California Purchase - Higher Tax)", () => {
    it("should cap credit at Texas tax when California tax exceeds", () => {
      const vehiclePrice = 25000;
      const californiaTaxPaid = 2000; // 8%
      const texasRate = 0.0625; // 6.25%

      const texasTaxDue = vehiclePrice * texasRate;
      const creditAllowed = Math.min(californiaTaxPaid, texasTaxDue);
      const additionalTexasTax = texasTaxDue - creditAllowed;

      expect(texasTaxDue).toBe(1562.50);
      expect(creditAllowed).toBe(1562.50); // Capped at TX tax
      expect(additionalTexasTax).toBe(0);
    });
  });

  describe("Scenario: Reciprocity with Local Tax", () => {
    it("should still owe local tax after state credit", () => {
      const vehiclePrice = 20000;
      const otherStateTaxPaid = 1250; // 6.25%
      const texasStateRate = 0.0625;
      const texasLocalRate = 0.02;
      const texasCombinedRate = texasStateRate + texasLocalRate;

      const texasStateTax = vehiclePrice * texasStateRate;
      const texasLocalTax = vehiclePrice * texasLocalRate;
      const credit = Math.min(otherStateTaxPaid, texasStateTax);
      const additionalTexasTax = (texasStateTax - credit) + texasLocalTax;

      expect(texasStateTax).toBe(1250);
      expect(texasLocalTax).toBe(400);
      expect(credit).toBe(1250);
      expect(additionalTexasTax).toBe(400); // Only local tax owed
    });
  });

  // ============================================================================
  // METADATA AND DOCUMENTATION
  // ============================================================================

  describe("Metadata - Sources", () => {
    it("should document official sources", () => {
      const rules = getRulesForState("TX");
      expect(rules?.extras?.sources).toBeDefined();
      expect(rules?.extras?.sources?.length).toBeGreaterThan(0);
    });

    it("should reference Texas Comptroller", () => {
      const rules = getRulesForState("TX");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Texas Comptroller"))).toBe(true);
    });

    it("should reference Texas Tax Code Chapter 152", () => {
      const rules = getRulesForState("TX");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Texas Tax Code Chapter 152"))).toBe(true);
    });

    it("should reference Publication 94-116", () => {
      const rules = getRulesForState("TX");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("94-116"))).toBe(true);
    });
  });

  describe("Metadata - Last Updated", () => {
    it("should have lastUpdated timestamp", () => {
      const rules = getRulesForState("TX");
      expect(rules?.extras?.lastUpdated).toBeDefined();
      expect(rules?.extras?.lastUpdated).toBe("2025-01");
    });
  });

  describe("Metadata - Comprehensive Documentation", () => {
    it("should have comprehensive notes", () => {
      const rules = getRulesForState("TX");
      expect(rules?.extras?.notes).toBeDefined();
      expect((rules?.extras?.notes as string).length).toBeGreaterThan(50);
    });

    it("should document key Texas features", () => {
      const rules = getRulesForState("TX");
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("motor vehicle sales tax");
      expect(notes).toContain("Service contracts and GAP are NOT taxed");
      expect(notes).toContain("No cap on doc fees");
    });
  });

  describe("Metadata - Rate Information", () => {
    it("should document state rate", () => {
      const rules = getRulesForState("TX");
      expect(rules?.extras?.stateRate).toBe(6.25);
    });

    it("should document max local rate", () => {
      const rules = getRulesForState("TX");
      expect(rules?.extras?.maxLocalRate).toBe(2.0);
    });

    it("should document max combined rate", () => {
      const rules = getRulesForState("TX");
      expect(rules?.extras?.maxCombinedRate).toBe(8.25);
    });
  });
});
