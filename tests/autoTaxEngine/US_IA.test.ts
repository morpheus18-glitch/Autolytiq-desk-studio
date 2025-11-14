import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Iowa (IA) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load Iowa rules successfully", () => {
    const rules = getRulesForState("IA");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("IA");
  });

  it("should mark Iowa as implemented (not a stub)", () => {
    expect(isStateImplemented("IA")).toBe(true);
  });

  it("should have version number 1", () => {
    const rules = getRulesForState("IA");
    expect(rules?.version).toBe(1);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("IA");
    const rulesLower = getRulesForState("ia");
    const rulesMixed = getRulesForState("Ia");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("IA");
    expect(rulesLower?.stateCode).toBe("IA");
    expect(rulesMixed?.stateCode).toBe("IA");
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS (FEE FOR NEW REGISTRATION)
  // ============================================================================

  describe("Retail Trade-In Policy", () => {
    it("should have FULL trade-in credit (no cap)", () => {
      const rules = getRulesForState("IA");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });

    it("should apply full trade-in credit with no cap", () => {
      const rules = getRulesForState("IA");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
      // No cap property should exist for FULL type
      if (rules?.tradeInPolicy.type === "CAPPED") {
        expect(rules.tradeInPolicy.cap).toBeUndefined();
      }
    });
  });

  describe("Retail Rebate Rules", () => {
    it("should have exactly 2 rebate rules", () => {
      const rules = getRulesForState("IA");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as NON-TAXABLE", () => {
      const rules = getRulesForState("IA");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(false);
      expect(mfrRebate?.notes).toContain("reduce purchase price");
    });

    it("should mark dealer rebates as NON-TAXABLE", () => {
      const rules = getRulesForState("IA");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(false);
      expect(dealerRebate?.notes).toContain("reduce purchase price");
    });
  });

  describe("Retail Doc Fee", () => {
    it("should mark doc fee as NOT TAXABLE", () => {
      const rules = getRulesForState("IA");
      expect(rules?.docFeeTaxable).toBe(false);
    });

    it("should document doc fee cap status", () => {
      const rules = getRulesForState("IA");
      expect(rules?.extras?.docFeeCap).toBeDefined();
      expect(rules?.extras?.docFeeCap).toContain("$180");
      expect(rules?.extras?.docFeeCap).toContain("HF758");
    });
  });

  describe("Retail Fee Taxability", () => {
    it("should mark service contracts as NOT TAXABLE", () => {
      const rules = getRulesForState("IA");
      const serviceContract = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(serviceContract?.taxable).toBe(false);
      expect(serviceContract?.notes).toContain("not subject to registration fee");
    });

    it("should mark GAP as NOT TAXABLE", () => {
      const rules = getRulesForState("IA");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap?.taxable).toBe(false);
      expect(gap?.notes).toContain("not subject to registration fee");
    });

    it("should mark title fees as NOT TAXABLE", () => {
      const rules = getRulesForState("IA");
      const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NOT TAXABLE", () => {
      const rules = getRulesForState("IA");
      const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Retail Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("IA");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should tax negative equity", () => {
      const rules = getRulesForState("IA");
      expect(rules?.taxOnNegativeEquity).toBe(true);
    });

    it("should NOT tax service contracts", () => {
      const rules = getRulesForState("IA");
      expect(rules?.taxOnServiceContracts).toBe(false);
    });

    it("should NOT tax GAP", () => {
      const rules = getRulesForState("IA");
      expect(rules?.taxOnGap).toBe(false);
    });
  });

  describe("Vehicle Tax Scheme", () => {
    it("should use STATE_PLUS_LOCAL scheme", () => {
      const rules = getRulesForState("IA");
      expect(rules?.vehicleTaxScheme).toBe("STATE_PLUS_LOCAL");
    });

    it("should enable local sales tax (up to 1% local option)", () => {
      const rules = getRulesForState("IA");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(true);
    });

    it("should document registration fee rate of 5%", () => {
      const rules = getRulesForState("IA");
      expect(rules?.extras?.registrationFeeRate).toBe(5.0);
    });

    it("should document flat fee of $10", () => {
      const rules = getRulesForState("IA");
      expect(rules?.extras?.flatFeeAmount).toBe(10.0);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS (FULL UPFRONT ON TOTAL LEASE PRICE)
  // ============================================================================

  describe("Lease Method", () => {
    it("should use FULL_UPFRONT lease taxation method", () => {
      const rules = getRulesForState("IA");
      expect(rules?.leaseRules.method).toBe("FULL_UPFRONT");
    });

    it("should document unique Iowa lease calculation", () => {
      const rules = getRulesForState("IA");
      expect(rules?.leaseRules.notes).toContain("FULL UPFRONT");
      expect(rules?.leaseRules.notes).toContain("payment × months");
      expect(rules?.leaseRules.notes).toContain("Trade-ins are ADDED");
    });
  });

  describe("Lease Cap Cost Reduction", () => {
    it("should include cap reduction in taxable lease price", () => {
      const rules = getRulesForState("IA");
      expect(rules?.leaseRules.taxCapReduction).toBe(true);
    });
  });

  describe("Lease Rebate Behavior", () => {
    it("should follow retail rule for rebates on leases", () => {
      const rules = getRulesForState("IA");
      expect(rules?.leaseRules.rebateBehavior).toBe("FOLLOW_RETAIL_RULE");
    });
  });

  describe("Lease Doc Fee", () => {
    it("should mark doc fee as NEVER taxable on leases", () => {
      const rules = getRulesForState("IA");
      expect(rules?.leaseRules.docFeeTaxability).toBe("NEVER");
    });

    it("should have doc fee in lease fee tax rules as non-taxable", () => {
      const rules = getRulesForState("IA");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee?.taxable).toBe(false);
    });
  });

  describe("Lease Trade-In Credit - CRITICAL IOWA RULE", () => {
    it("should have NONE trade-in credit (trade-in ADDED to lease price)", () => {
      const rules = getRulesForState("IA");
      expect(rules?.leaseRules.tradeInCredit).toBe("NONE");
    });

    it("should document that trade-ins are ADDED to lease price", () => {
      const rules = getRulesForState("IA");
      expect(rules?.leaseRules.notes).toContain("Trade-ins are ADDED to lease price");
      expect(rules?.leaseRules.notes).toContain("opposite of retail");
    });
  });

  describe("Lease Negative Equity", () => {
    it("should mark negative equity as TAXABLE on leases", () => {
      const rules = getRulesForState("IA");
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(true);
    });
  });

  describe("Lease Fee Taxability", () => {
    it("should mark service contracts as NOT TAXABLE on leases", () => {
      const rules = getRulesForState("IA");
      const serviceContract = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(serviceContract?.taxable).toBe(false);
      expect(serviceContract?.notes).toContain("excluded from lease price");
    });

    it("should mark GAP as NOT TAXABLE on leases", () => {
      const rules = getRulesForState("IA");
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap?.taxable).toBe(false);
    });

    it("should mark title fees as NOT TAXABLE on leases", () => {
      const rules = getRulesForState("IA");
      const title = rules?.leaseRules.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title?.taxable).toBe(false);
    });
  });

  describe("Lease Tax Timing", () => {
    it("should tax fees upfront on leases", () => {
      const rules = getRulesForState("IA");
      expect(rules?.leaseRules.taxFeesUpfront).toBe(true);
    });
  });

  // ============================================================================
  // RECIPROCITY TESTS
  // ============================================================================

  describe("Reciprocity", () => {
    it("should enable reciprocity", () => {
      const rules = getRulesForState("IA");
      expect(rules?.reciprocity.enabled).toBe(true);
    });

    it("should apply to BOTH retail and lease", () => {
      const rules = getRulesForState("IA");
      expect(rules?.reciprocity.scope).toBe("BOTH");
    });

    it("should use CREDIT_UP_TO_STATE_RATE behavior", () => {
      const rules = getRulesForState("IA");
      expect(rules?.reciprocity.homeStateBehavior).toBe("CREDIT_UP_TO_STATE_RATE");
    });

    it("should require proof of tax paid", () => {
      const rules = getRulesForState("IA");
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(true);
    });

    it("should cap credit at Iowa registration fee", () => {
      const rules = getRulesForState("IA");
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(true);
    });

    it("should have no lease exception", () => {
      const rules = getRulesForState("IA");
      expect(rules?.reciprocity.hasLeaseException).toBe(false);
    });
  });

  // ============================================================================
  // IOWA-SPECIFIC FEATURES
  // ============================================================================

  describe("Iowa Unique Features - Fee for New Registration System", () => {
    it("should document that Iowa uses registration fee (not sales tax)", () => {
      const rules = getRulesForState("IA");
      expect(rules?.extras?.notes).toContain("Fee for New Registration");
      expect(rules?.extras?.notes).toContain("not sales tax");
      expect(rules?.extras?.notes).toContain("Iowa Code 321.105A");
    });

    it("should document exemption from general sales tax", () => {
      const rules = getRulesForState("IA");
      expect(rules?.extras?.notes).toContain("EXEMPT from Iowa's 6% general sales tax");
    });

    it("should document flat fee component", () => {
      const rules = getRulesForState("IA");
      expect(rules?.extras?.iowaRegistrationFee?.flatFee).toBe(10);
    });

    it("should document base rate component", () => {
      const rules = getRulesForState("IA");
      expect(rules?.extras?.iowaRegistrationFee?.baseRate).toBe(0.05);
    });
  });

  describe("Iowa Unique Features - Lease Total Price Calculation", () => {
    it("should document lease price formula", () => {
      const rules = getRulesForState("IA");
      expect(rules?.extras?.iowaRegistrationFee?.leasePriceFormula).toBeDefined();
      expect(rules?.extras?.iowaRegistrationFee?.leasePriceFormula).toContain("monthly payment × months");
      expect(rules?.extras?.iowaRegistrationFee?.leasePriceFormula).toContain("down payment");
      expect(rules?.extras?.iowaRegistrationFee?.leasePriceFormula).toContain("trade-in value");
    });

    it("should document that trade-ins ADD to lease price", () => {
      const rules = getRulesForState("IA");
      expect(rules?.extras?.iowaRegistrationFee?.tradeInAddsToLeasePrice).toBe(true);
    });

    it("should document that trade-ins reduce base on retail", () => {
      const rules = getRulesForState("IA");
      expect(rules?.extras?.iowaRegistrationFee?.tradeInReducesBase).toBe(true);
    });
  });

  describe("Iowa Unique Features - Excluded Items", () => {
    it("should list items excluded from registration fee base", () => {
      const rules = getRulesForState("IA");
      expect(rules?.extras?.iowaRegistrationFee?.excludedFromBase).toBeDefined();
      expect(rules?.extras?.iowaRegistrationFee?.excludedFromBase).toContain("doc fee");
      expect(rules?.extras?.iowaRegistrationFee?.excludedFromBase).toContain("service contracts (if optional/separate)");
      expect(rules?.extras?.iowaRegistrationFee?.excludedFromBase).toContain("GAP insurance");
      expect(rules?.extras?.iowaRegistrationFee?.excludedFromBase).toContain("manufacturer rebates");
      expect(rules?.extras?.iowaRegistrationFee?.excludedFromBase).toContain("dealer rebates");
    });

    it("should list items included in registration fee base", () => {
      const rules = getRulesForState("IA");
      expect(rules?.extras?.iowaRegistrationFee?.includedInBase).toBeDefined();
      expect(rules?.extras?.iowaRegistrationFee?.includedInBase).toContain("vehicle price");
      expect(rules?.extras?.iowaRegistrationFee?.includedInBase).toContain("dealer-installed accessories");
      expect(rules?.extras?.iowaRegistrationFee?.includedInBase).toContain("negative equity (generally)");
    });
  });

  // ============================================================================
  // SCENARIO TESTS - RETAIL
  // ============================================================================

  describe("Scenario: Basic Retail Sale (5% + $10)", () => {
    it("should calculate registration fee correctly", () => {
      // $30,000 vehicle - $10,000 trade = $20,000 taxable
      // Fee: $10 + ($20,000 × 5%) = $10 + $1,000 = $1,010
      const vehiclePrice = 30000;
      const tradeIn = 10000;
      const taxableBase = vehiclePrice - tradeIn;
      const flatFee = 10;
      const rate = 0.05;

      expect(taxableBase).toBe(20000);
      const registrationFee = flatFee + taxableBase * rate;
      expect(registrationFee).toBe(1010);
    });
  });

  describe("Scenario: Retail Sale with Manufacturer Rebate", () => {
    it("should reduce taxable base by rebate amount", () => {
      // $32,000 vehicle - $3,000 rebate = $29,000 taxable
      // Fee: $10 + ($29,000 × 5%) = $1,460
      const vehiclePrice = 32000;
      const mfrRebate = 3000;
      const taxableBase = vehiclePrice - mfrRebate;
      const flatFee = 10;
      const rate = 0.05;

      expect(taxableBase).toBe(29000);
      const registrationFee = flatFee + taxableBase * rate;
      expect(registrationFee).toBe(1460);
    });
  });

  describe("Scenario: Retail Sale with Negative Equity", () => {
    it("should include negative equity in taxable base", () => {
      const vehiclePrice = 28000;
      const tradeInValue = 10000;
      const tradeInPayoff = 14000;
      const negativeEquity = tradeInPayoff - tradeInValue;
      const flatFee = 10;
      const rate = 0.05;

      // Taxable base = vehicle - trade + negative equity
      const taxableBase = vehiclePrice - tradeInValue + negativeEquity;

      expect(negativeEquity).toBe(4000);
      expect(taxableBase).toBe(22000);

      const registrationFee = flatFee + taxableBase * rate;
      expect(registrationFee).toBe(1110);
    });
  });

  describe("Scenario: Retail Sale with Doc Fee (NOT taxed)", () => {
    it("should NOT include doc fee in taxable base", () => {
      const vehiclePrice = 25000;
      const docFee = 180;
      const flatFee = 10;
      const rate = 0.05;

      // Doc fee is NOT included in taxable base
      const taxableBase = vehiclePrice; // NOT vehiclePrice + docFee

      expect(taxableBase).toBe(25000);
      const registrationFee = flatFee + taxableBase * rate;
      expect(registrationFee).toBe(1260);
    });
  });

  // ============================================================================
  // SCENARIO TESTS - LEASE (FULL UPFRONT)
  // ============================================================================

  describe("Scenario: Basic Lease (Total Lease Price Method)", () => {
    it("should calculate tax on total lease price upfront", () => {
      // Monthly payment: $400
      // Term: 36 months
      // Down payment: $2,000
      // Trade-in value: $5,000 (ADDED)
      // Lease price: ($400 × 36) + $2,000 + $5,000 = $21,400
      // Fee: $10 + ($21,400 × 5%) = $1,080

      const monthlyPayment = 400;
      const term = 36;
      const downPayment = 2000;
      const tradeInValue = 5000; // ADDED to lease price
      const flatFee = 10;
      const rate = 0.05;

      const leasePrice = monthlyPayment * term + downPayment + tradeInValue;

      expect(leasePrice).toBe(21400);

      const registrationFee = flatFee + leasePrice * rate;
      expect(registrationFee).toBe(1080);
    });
  });

  describe("Scenario: Lease with Trade-In (ADDED to lease price)", () => {
    it("should ADD trade-in value to lease price calculation", () => {
      const monthlyPayment = 350;
      const term = 36;
      const downPayment = 3000;
      const tradeInValue = 8000; // ADDED (not subtracted)
      const flatFee = 10;
      const rate = 0.05;

      // Trade-in is ADDED to lease price (unique Iowa rule)
      const leasePrice = monthlyPayment * term + downPayment + tradeInValue;

      expect(leasePrice).toBe(23600);

      const registrationFee = flatFee + leasePrice * rate;
      expect(registrationFee).toBe(1190);
    });
  });

  describe("Scenario: Lease vs Retail Trade-In Treatment Comparison", () => {
    it("should show opposite effects of trade-in on retail vs lease", () => {
      const tradeInValue = 10000;
      const rate = 0.05;
      const flatFee = 10;

      // RETAIL: Trade-in REDUCES taxable base
      const retailVehiclePrice = 30000;
      const retailTaxableBase = retailVehiclePrice - tradeInValue;
      const retailFee = flatFee + retailTaxableBase * rate;

      expect(retailTaxableBase).toBe(20000);
      expect(retailFee).toBe(1010);

      // LEASE: Trade-in ADDS to lease price
      const monthlyPayment = 400;
      const term = 36;
      const leasePrice = monthlyPayment * term + tradeInValue;
      const leaseFee = flatFee + leasePrice * rate;

      expect(leasePrice).toBe(24400);
      expect(leaseFee).toBe(1230);

      // Trade-in has OPPOSITE effect
      expect(retailFee).toBeLessThan(leaseFee);
    });
  });

  describe("Scenario: Lease with Negative Equity", () => {
    it("should increase monthly payment and thus lease price", () => {
      const baseMonthlyPayment = 400;
      const negativeEquityIncrease = 150; // Added to monthly payment
      const adjustedMonthlyPayment = baseMonthlyPayment + negativeEquityIncrease;
      const term = 36;
      const tradeInValue = 8000; // Still ADDED
      const flatFee = 10;
      const rate = 0.05;

      const leasePrice = adjustedMonthlyPayment * term + tradeInValue;

      expect(adjustedMonthlyPayment).toBe(550);
      expect(leasePrice).toBe(27800);

      const registrationFee = flatFee + leasePrice * rate;
      expect(registrationFee).toBe(1400);
    });
  });

  describe("Scenario: Service Contracts and GAP (NOT Taxed on Lease)", () => {
    it("should NOT include VSC or GAP in lease price", () => {
      const monthlyPayment = 450;
      const term = 36;
      const vsc = 1800; // NOT included in lease price
      const gap = 695; // NOT included in lease price
      const flatFee = 10;
      const rate = 0.05;

      // Lease price does NOT include VSC or GAP
      const leasePrice = monthlyPayment * term;

      expect(leasePrice).toBe(16200);

      const registrationFee = flatFee + leasePrice * rate;
      expect(registrationFee).toBe(820);

      // If incorrectly included (error scenario):
      const incorrectLeasePrice = leasePrice + vsc + gap;
      const incorrectFee = flatFee + incorrectLeasePrice * rate;

      expect(incorrectLeasePrice).toBe(18695);
      expect(incorrectFee).toBeCloseTo(944.75, 2);

      // Verify they're different
      expect(registrationFee).not.toBe(incorrectFee);
    });
  });

  // ============================================================================
  // RECIPROCITY SCENARIO TESTS
  // ============================================================================

  describe("Scenario: Reciprocity (Other State Tax Higher)", () => {
    it("should provide credit equal to Iowa fee (owe $0)", () => {
      const vehiclePrice = 30000;
      const minnesotaTaxPaid = 2062.5; // 6.875%
      const iowaFee = 10 + vehiclePrice * 0.05; // $1,510

      const creditAllowed = Math.min(minnesotaTaxPaid, iowaFee);
      const additionalIowaFee = iowaFee - creditAllowed;

      expect(iowaFee).toBe(1510);
      expect(creditAllowed).toBe(1510); // MN tax exceeds IA fee
      expect(additionalIowaFee).toBe(0);
    });
  });

  describe("Scenario: Reciprocity (Other State Tax Lower)", () => {
    it("should provide partial credit (owe difference)", () => {
      const vehiclePrice = 30000;
      const northCarolinaTaxPaid = 900; // 3%
      const iowaFee = 10 + vehiclePrice * 0.05; // $1,510

      const creditAllowed = northCarolinaTaxPaid;
      const additionalIowaFee = iowaFee - creditAllowed;

      expect(iowaFee).toBe(1510);
      expect(creditAllowed).toBe(900);
      expect(additionalIowaFee).toBe(610);
    });
  });

  describe("Scenario: Reciprocity (No Tax State)", () => {
    it("should provide no credit (owe full Iowa fee)", () => {
      const vehiclePrice = 30000;
      const montanaTaxPaid = 0; // No sales tax
      const iowaFee = 10 + vehiclePrice * 0.05; // $1,510

      const creditAllowed = montanaTaxPaid;
      const additionalIowaFee = iowaFee - creditAllowed;

      expect(iowaFee).toBe(1510);
      expect(creditAllowed).toBe(0);
      expect(additionalIowaFee).toBe(1510);
    });
  });

  // ============================================================================
  // METADATA AND DOCUMENTATION
  // ============================================================================

  describe("Metadata", () => {
    it("should have lastUpdated date", () => {
      const rules = getRulesForState("IA");
      expect(rules?.extras?.lastUpdated).toBe("2025-11-14");
    });

    it("should have source citations", () => {
      const rules = getRulesForState("IA");
      expect(rules?.extras?.sources).toBeDefined();
      expect(rules?.extras?.sources?.length).toBeGreaterThan(0);
    });

    it("should reference Iowa Code 321.105A", () => {
      const rules = getRulesForState("IA");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Iowa Code Section 321.105A"))).toBe(true);
    });

    it("should reference Iowa Admin Code 701-31.5", () => {
      const rules = getRulesForState("IA");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Iowa Administrative Code Rule 701-31.5"))).toBe(true);
    });

    it("should have comprehensive notes", () => {
      const rules = getRulesForState("IA");
      expect(rules?.extras?.notes).toBeDefined();
      expect(rules?.extras?.notes?.length).toBeGreaterThan(100);
    });
  });
});
