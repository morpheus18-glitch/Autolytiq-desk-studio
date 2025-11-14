import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Pennsylvania (PA) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load Pennsylvania rules successfully", () => {
    const rules = getRulesForState("PA");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("PA");
  });

  it("should mark Pennsylvania as implemented (not a stub)", () => {
    expect(isStateImplemented("PA")).toBe(true);
  });

  it("should have version number 1", () => {
    const rules = getRulesForState("PA");
    expect(rules?.version).toBe(1);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("PA");
    const rulesLower = getRulesForState("pa");
    const rulesMixed = getRulesForState("Pa");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("PA");
    expect(rulesLower?.stateCode).toBe("PA");
    expect(rulesMixed?.stateCode).toBe("PA");
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS
  // ============================================================================

  describe("Retail - Trade-In Policy", () => {
    it("should have FULL trade-in credit policy", () => {
      const rules = getRulesForState("PA");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });

    it("should document trade-in requirements", () => {
      const rules = getRulesForState("PA");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });
  });

  describe("Retail - Rebate Rules", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("PA");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as NON-TAXABLE", () => {
      const rules = getRulesForState("PA");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(false);
      expect(mfrRebate?.notes).toContain("reduce");
    });

    it("should mark dealer rebates as NON-TAXABLE (UNCOMMON)", () => {
      const rules = getRulesForState("PA");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(false);
      expect(dealerRebate?.notes).toContain("ALSO reduce");
      expect(dealerRebate?.notes).toContain("uncommon");
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as NON-TAXABLE", () => {
      const rules = getRulesForState("PA");
      expect(rules?.docFeeTaxable).toBe(false);
    });

    it("should document 2025 doc fee caps", () => {
      const rules = getRulesForState("PA");
      expect(rules?.extras?.docFeeCapElectronic2025).toBe(464);
      expect(rules?.extras?.docFeeCapNonElectronic2025).toBe(387);
    });

    it("should document annual CPI adjustment", () => {
      const rules = getRulesForState("PA");
      expect(rules?.extras?.docFeeAdjustedAnnuallyByCPI).toBe(true);
    });
  });

  describe("Retail - Fee Tax Rules", () => {
    it("should mark service contracts (VSC) as TAXABLE", () => {
      const rules = getRulesForState("PA");
      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(true);
      expect(vsc?.notes).toContain("taxable");
    });

    it("should mark GAP as NON-TAXABLE on retail", () => {
      const rules = getRulesForState("PA");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(false);
      expect(gap?.notes).toContain("NOT taxable on retail");
    });

    it("should document GAP treatment differs on lease", () => {
      const rules = getRulesForState("PA");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap?.notes).toContain("IS taxable on leases");
    });

    it("should mark title fees as NON-TAXABLE", () => {
      const rules = getRulesForState("PA");
      const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-TAXABLE", () => {
      const rules = getRulesForState("PA");
      const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });

    it("should document title fee amount", () => {
      const rules = getRulesForState("PA");
      expect(rules?.extras?.titleFee).toBe(58);
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("PA");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should tax negative equity", () => {
      const rules = getRulesForState("PA");
      expect(rules?.taxOnNegativeEquity).toBe(true);
    });

    it("should tax service contracts", () => {
      const rules = getRulesForState("PA");
      expect(rules?.taxOnServiceContracts).toBe(true);
    });

    it("should NOT tax GAP on retail", () => {
      const rules = getRulesForState("PA");
      expect(rules?.taxOnGap).toBe(false);
    });
  });

  describe("Retail - Vehicle Tax Scheme", () => {
    it("should use STATE_PLUS_LOCAL vehicle tax scheme", () => {
      const rules = getRulesForState("PA");
      expect(rules?.vehicleTaxScheme).toBe("STATE_PLUS_LOCAL");
    });

    it("should apply local sales tax to vehicles", () => {
      const rules = getRulesForState("PA");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(true);
    });

    it("should document state rate of 6%", () => {
      const rules = getRulesForState("PA");
      expect(rules?.extras?.stateRate).toBe(6.0);
    });

    it("should document Allegheny County rate of 7%", () => {
      const rules = getRulesForState("PA");
      expect(rules?.extras?.alleghenyCountyRate).toBe(7.0);
    });

    it("should document Philadelphia rate of 8%", () => {
      const rules = getRulesForState("PA");
      expect(rules?.extras?.philadelphiaRate).toBe(8.0);
    });

    it("should document local tax jurisdictions", () => {
      const rules = getRulesForState("PA");
      expect(rules?.extras?.localTaxJurisdictions).toBeDefined();
      const jurisdictions = rules?.extras?.localTaxJurisdictions as Record<string, number>;
      expect(jurisdictions["Allegheny County"]).toBe(1.0);
      expect(jurisdictions["Philadelphia"]).toBe(2.0);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease - Tax Method", () => {
    it("should use MONTHLY lease taxation method", () => {
      const rules = getRulesForState("PA");
      expect(rules?.leaseRules.method).toBe("MONTHLY");
    });

    it("should NOT tax cap cost reduction", () => {
      const rules = getRulesForState("PA");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });

    it("should tax fees upfront on leases", () => {
      const rules = getRulesForState("PA");
      expect(rules?.leaseRules.taxFeesUpfront).toBe(true);
    });

    it("should have PA_LEASE_TAX special scheme", () => {
      const rules = getRulesForState("PA");
      expect(rules?.leaseRules.specialScheme).toBe("PA_LEASE_TAX");
    });

    it("should document dual-tax lease structure", () => {
      const rules = getRulesForState("PA");
      expect(rules?.leaseRules.notes).toContain("DUAL TAX STRUCTURE");
      expect(rules?.leaseRules.notes).toContain("6% sales tax");
      expect(rules?.leaseRules.notes).toContain("3% motor vehicle lease tax");
      expect(rules?.leaseRules.notes).toContain("9% total");
    });
  });

  describe("Lease - Dual Tax Structure", () => {
    it("should document 6% sales tax rate", () => {
      const rules = getRulesForState("PA");
      expect(rules?.extras?.stateRate).toBe(6.0);
    });

    it("should document 3% motor vehicle lease tax", () => {
      const rules = getRulesForState("PA");
      expect(rules?.extras?.leaseMotorVehicleTaxRate).toBe(3.0);
    });

    it("should document 9% combined lease rate", () => {
      const rules = getRulesForState("PA");
      expect(rules?.extras?.combinedLeaseRate).toBe(9.0);
    });
  });

  describe("Lease - Rebates and Incentives", () => {
    it("should have FOLLOW_RETAIL_RULE rebate behavior on leases", () => {
      const rules = getRulesForState("PA");
      expect(rules?.leaseRules.rebateBehavior).toBe("FOLLOW_RETAIL_RULE");
    });
  });

  describe("Lease - Documentation Fee", () => {
    it("should NEVER tax doc fee on leases", () => {
      const rules = getRulesForState("PA");
      expect(rules?.leaseRules.docFeeTaxability).toBe("NEVER");
    });

    it("should have doc fee in lease fee rules as non-taxable", () => {
      const rules = getRulesForState("PA");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(false);
      expect(docFee?.notes).toContain("$464");
      expect(docFee?.notes).toContain("$387");
    });
  });

  describe("Lease - Trade-In Credit", () => {
    it("should provide FULL trade-in credit on leases", () => {
      const rules = getRulesForState("PA");
      expect(rules?.leaseRules.tradeInCredit).toBe("FULL");
    });
  });

  describe("Lease - Negative Equity", () => {
    it("should mark negative equity as TAXABLE on leases", () => {
      const rules = getRulesForState("PA");
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(true);
    });
  });

  describe("Lease - Fee Tax Rules", () => {
    it("should mark doc fee as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("PA");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(false);
    });

    it("should mark service contracts as TAXABLE on leases", () => {
      const rules = getRulesForState("PA");
      const vsc = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(true);
      expect(vsc?.notes).toContain("taxed");
    });

    it("should mark GAP as TAXABLE on leases (different from retail)", () => {
      const rules = getRulesForState("PA");
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(true);
      expect(gap?.notes).toContain("TAXABLE on leases");
      expect(gap?.notes).toContain("unlike retail");
    });

    it("should mark title fees as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("PA");
      const title = rules?.leaseRules.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("PA");
      const reg = rules?.leaseRules.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Lease - Title Fee Rules", () => {
    it("should have title fee rule configuration", () => {
      const rules = getRulesForState("PA");
      expect(rules?.leaseRules.titleFeeRules).toBeDefined();
      expect(rules?.leaseRules.titleFeeRules.length).toBeGreaterThan(0);
    });

    it("should mark title fees as not taxable but included in cap cost", () => {
      const rules = getRulesForState("PA");
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
      const rules = getRulesForState("PA");
      expect(rules?.reciprocity.enabled).toBe(true);
    });

    it("should apply reciprocity to BOTH retail and lease", () => {
      const rules = getRulesForState("PA");
      expect(rules?.reciprocity.scope).toBe("BOTH");
    });

    it("should use CREDIT_UP_TO_STATE_RATE mode", () => {
      const rules = getRulesForState("PA");
      expect(rules?.reciprocity.homeStateBehavior).toBe("CREDIT_UP_TO_STATE_RATE");
    });

    it("should require proof of tax paid", () => {
      const rules = getRulesForState("PA");
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(true);
    });

    it("should base credit on TAX_PAID", () => {
      const rules = getRulesForState("PA");
      expect(rules?.reciprocity.basis).toBe("TAX_PAID");
    });

    it("should cap credit at Pennsylvania's tax rate", () => {
      const rules = getRulesForState("PA");
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(true);
    });

    it("should not have lease exceptions", () => {
      const rules = getRulesForState("PA");
      expect(rules?.reciprocity.hasLeaseException).toBe(false);
    });

    it("should document MUTUAL CREDIT requirement", () => {
      const rules = getRulesForState("PA");
      expect(rules?.reciprocity.notes).toContain("REQUIRES MUTUAL CREDIT");
      expect(rules?.reciprocity.notes).toContain("reciprocate");
    });

    it("should document Form REV-227 verification", () => {
      const rules = getRulesForState("PA");
      expect(rules?.reciprocity.notes).toContain("REV-227");
      expect(rules?.extras?.reciprocityFormReference).toBe("REV-227");
    });
  });

  describe("Reciprocity - Non-Reciprocal States", () => {
    it("should have overrides for non-reciprocal states", () => {
      const rules = getRulesForState("PA");
      expect(rules?.reciprocity.overrides).toBeDefined();
      expect(rules?.reciprocity.overrides?.length).toBeGreaterThan(0);
    });

    it("should document West Virginia non-reciprocal status", () => {
      const rules = getRulesForState("PA");
      const wvOverride = rules?.reciprocity.overrides?.find((o) => o.originState === "WV");
      expect(wvOverride).toBeDefined();
      expect(wvOverride?.disallowCredit).toBe(true);
      expect(wvOverride?.notes).toContain("does NOT grant credit");
    });

    it("should document South Dakota non-reciprocal status", () => {
      const rules = getRulesForState("PA");
      const sdOverride = rules?.reciprocity.overrides?.find((o) => o.originState === "SD");
      expect(sdOverride).toBeDefined();
      expect(sdOverride?.disallowCredit).toBe(true);
      expect(sdOverride?.notes).toContain("excise tax");
    });

    it("should list non-reciprocal states in extras", () => {
      const rules = getRulesForState("PA");
      expect(rules?.extras?.nonReciprocalStates).toBeDefined();
      expect(rules?.extras?.nonReciprocalStates).toContain("WV");
      expect(rules?.extras?.nonReciprocalStates).toContain("SD");
      expect(rules?.extras?.nonReciprocalStates).toContain("NM");
      expect(rules?.extras?.nonReciprocalStates).toContain("ND");
      expect(rules?.extras?.nonReciprocalStates).toContain("OK");
    });
  });

  describe("Reciprocity - Reciprocal States", () => {
    it("should list reciprocal states in extras", () => {
      const rules = getRulesForState("PA");
      expect(rules?.extras?.reciprocalStates).toBeDefined();
      expect(rules?.extras?.reciprocalStates).toContain("IN");
      expect(rules?.extras?.reciprocalStates).toContain("MD");
      expect(rules?.extras?.reciprocalStates).toContain("NJ");
      expect(rules?.extras?.reciprocalStates).toContain("OH");
      expect(rules?.extras?.reciprocalStates).toContain("VA");
    });
  });

  // ============================================================================
  // PENNSYLVANIA-SPECIFIC FEATURES
  // ============================================================================

  describe("Pennsylvania Unique Features - Dual Lease Tax", () => {
    it("should document unique dual-tax structure on leases", () => {
      const rules = getRulesForState("PA");
      expect(rules?.extras?.notes).toContain("DUAL TAX STRUCTURE");
      expect(rules?.extras?.notes).toContain("6% sales tax + 3% motor vehicle lease tax");
    });
  });

  describe("Pennsylvania Unique Features - Both Rebates Non-Taxable", () => {
    it("should document that both manufacturer and dealer rebates are non-taxable", () => {
      const rules = getRulesForState("PA");
      expect(rules?.extras?.notes).toContain("manufacturer AND dealer rebates");
      expect(rules?.extras?.notes).toContain("uncommon");
    });
  });

  describe("Pennsylvania Unique Features - GAP Treatment Differs", () => {
    it("should document GAP taxability difference between retail and lease", () => {
      const rules = getRulesForState("PA");
      expect(rules?.extras?.notes).toContain("GAP is NOT taxable on retail but IS taxable on leases");
    });
  });

  describe("Pennsylvania Unique Features - Limited Local Tax", () => {
    it("should document only 2 jurisdictions with local tax", () => {
      const rules = getRulesForState("PA");
      expect(rules?.extras?.notes).toContain("local tax only in Philadelphia");
      expect(rules?.extras?.notes).toContain("Allegheny");
    });
  });

  describe("Pennsylvania Unique Features - Mutual Credit Reciprocity", () => {
    it("should document mutual credit requirement", () => {
      const rules = getRulesForState("PA");
      expect(rules?.extras?.notes).toContain("RECIPROCITY: Requires MUTUAL CREDIT");
    });
  });

  // ============================================================================
  // SCENARIO TESTS
  // ============================================================================

  describe("Scenario: Basic Retail Sale (Standard 6% Rate)", () => {
    it("should calculate tax correctly", () => {
      // $30,000 vehicle - $10,000 trade-in = $20,000 taxable
      // Tax @ 6%: $20,000 × 0.06 = $1,200
      const vehiclePrice = 30000;
      const tradeIn = 10000;
      const taxableBase = vehiclePrice - tradeIn;
      const stateRate = 0.06;

      expect(taxableBase).toBe(20000);
      const expectedTax = taxableBase * stateRate;
      expect(expectedTax).toBe(1200);
    });
  });

  describe("Scenario: Philadelphia Sale (8% Rate)", () => {
    it("should calculate tax with Philadelphia local tax", () => {
      const vehiclePrice = 25000;
      const tradeIn = 5000;
      const taxableBase = vehiclePrice - tradeIn;
      const philadelphiaRate = 0.08; // 6% state + 2% local

      expect(taxableBase).toBe(20000);
      const tax = taxableBase * philadelphiaRate;
      expect(tax).toBe(1600);
    });
  });

  describe("Scenario: Allegheny County Sale (7% Rate)", () => {
    it("should calculate tax with Allegheny County local tax", () => {
      const vehiclePrice = 35000;
      const tradeIn = 8000;
      const docFee = 464; // NOT taxable
      const taxableBase = vehiclePrice - tradeIn; // Doc fee excluded
      const alleghenyRate = 0.07; // 6% state + 1% local

      expect(taxableBase).toBe(27000);
      const tax = taxableBase * alleghenyRate;
      expect(tax).toBe(1890);
    });
  });

  describe("Scenario: Retail with Both Rebates", () => {
    it("should deduct both manufacturer and dealer rebates", () => {
      const vehiclePrice = 30000;
      const mfrRebate = 2500;
      const dealerRebate = 1000;
      const rate = 0.06;

      // BOTH rebates reduce taxable amount in PA
      const taxableBase = vehiclePrice - mfrRebate - dealerRebate;
      const tax = taxableBase * rate;

      expect(taxableBase).toBe(26500);
      expect(tax).toBe(1590);
    });
  });

  describe("Scenario: Retail with VSC (Taxable) and GAP (Not Taxable)", () => {
    it("should tax VSC but not GAP on retail", () => {
      const vehiclePrice = 28000;
      const vsc = 2500; // TAXABLE
      const gap = 895; // NOT taxable on retail
      const tradeIn = 8000;
      const rate = 0.06;

      // VSC taxable, GAP not taxable
      const taxableBase = vehiclePrice + vsc - tradeIn;
      const tax = taxableBase * rate;

      expect(taxableBase).toBe(22500);
      expect(tax).toBe(1350);
    });
  });

  describe("Scenario: Lease with 9% Combined Rate", () => {
    it("should tax monthly payments at 9% (6% + 3%)", () => {
      const monthlyPayment = 400;
      const downPayment = 2000;
      const term = 36;
      const combinedRate = 0.09; // 6% sales tax + 3% lease tax

      // Down payment taxed at inception
      const downPaymentTax = downPayment * combinedRate;
      // Monthly payment taxed each month
      const monthlyTax = monthlyPayment * combinedRate;
      const totalMonthlyTax = monthlyTax * term;
      const totalTax = downPaymentTax + totalMonthlyTax;

      expect(downPaymentTax).toBe(180);
      expect(monthlyTax).toBe(36);
      expect(totalMonthlyTax).toBe(1296);
      expect(totalTax).toBe(1476);
    });
  });

  describe("Scenario: Lease with GAP (Taxable on Leases)", () => {
    it("should tax GAP on leases at 9%", () => {
      const monthlyPayment = 350;
      const gap = 795; // TAXABLE on lease
      const term = 36;
      const rate = 0.09;

      // GAP taxed upfront on lease
      const gapTax = gap * rate;
      const monthlyTax = monthlyPayment * rate;
      const totalTax = gapTax + (monthlyTax * term);

      expect(gapTax).toBeCloseTo(71.55, 2);
      expect(monthlyTax).toBeCloseTo(31.50, 2);
      expect(totalTax).toBeCloseTo(1205.55, 2);
    });
  });

  describe("Scenario: Reciprocity with Ohio (Reciprocal State)", () => {
    it("should credit Ohio tax paid", () => {
      const vehiclePrice = 25000;
      const ohioTaxPaid = 1875; // 7.5%
      const paRate = 0.06; // 6%

      const paTaxDue = vehiclePrice * paRate;
      const credit = Math.min(ohioTaxPaid, paTaxDue);
      const additionalPaTax = paTaxDue - credit;

      expect(paTaxDue).toBe(1500);
      expect(credit).toBe(1500); // Capped at PA tax
      expect(additionalPaTax).toBe(0);
    });
  });

  describe("Scenario: Reciprocity with West Virginia (Non-Reciprocal)", () => {
    it("should NOT credit West Virginia tax (non-reciprocal)", () => {
      const vehiclePrice = 25000;
      const wvTaxPaid = 1500; // 6%
      const paRate = 0.06;

      // No credit for WV tax (non-reciprocal)
      const paTaxDue = vehiclePrice * paRate;
      const credit = 0; // WV is non-reciprocal
      const totalPaTax = paTaxDue - credit;

      expect(paTaxDue).toBe(1500);
      expect(credit).toBe(0);
      expect(totalPaTax).toBe(1500); // Must pay full PA tax
    });
  });

  describe("Scenario: Reciprocity with Maryland (Reciprocal State)", () => {
    it("should credit Maryland tax and collect difference", () => {
      const vehiclePrice = 30000;
      const mdTaxPaid = 1800; // 6%
      const paPhiladelphiaRate = 0.08; // 6% + 2% in Philadelphia

      const paTaxDue = vehiclePrice * paPhiladelphiaRate;
      const credit = Math.min(mdTaxPaid, paTaxDue);
      const additionalPaTax = paTaxDue - credit;

      expect(paTaxDue).toBe(2400);
      expect(credit).toBe(1800); // MD tax credited
      expect(additionalPaTax).toBe(600); // Pay difference
    });
  });

  // ============================================================================
  // METADATA AND DOCUMENTATION
  // ============================================================================

  describe("Metadata - Sources", () => {
    it("should document official sources", () => {
      const rules = getRulesForState("PA");
      expect(rules?.extras?.sources).toBeDefined();
      expect(rules?.extras?.sources?.length).toBeGreaterThan(0);
    });

    it("should reference Pennsylvania Department of Revenue", () => {
      const rules = getRulesForState("PA");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Pennsylvania Department of Revenue"))).toBe(true);
    });

    it("should reference Pennsylvania Code", () => {
      const rules = getRulesForState("PA");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("61 Pa. Code"))).toBe(true);
    });

    it("should reference Form REV-227", () => {
      const rules = getRulesForState("PA");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("REV-227"))).toBe(true);
    });
  });

  describe("Metadata - Last Updated", () => {
    it("should have lastUpdated timestamp", () => {
      const rules = getRulesForState("PA");
      expect(rules?.extras?.lastUpdated).toBeDefined();
      expect(rules?.extras?.lastUpdated).toBe("2025-01");
    });
  });

  describe("Metadata - Implementation Notes", () => {
    it("should have implementation notes", () => {
      const rules = getRulesForState("PA");
      expect(rules?.extras?.implementationNotes).toBeDefined();
      expect((rules?.extras?.implementationNotes as string[]).length).toBeGreaterThan(0);
    });

    it("should note need to implement PA_LEASE_TAX scheme", () => {
      const rules = getRulesForState("PA");
      const notes = rules?.extras?.implementationNotes as string[];
      expect(notes.some((n) => n.includes("PA_LEASE_TAX"))).toBe(true);
    });

    it("should note reciprocity verification requirement", () => {
      const rules = getRulesForState("PA");
      const notes = rules?.extras?.implementationNotes as string[];
      expect(notes.some((n) => n.includes("REV-227"))).toBe(true);
    });
  });

  describe("Metadata - Comprehensive Documentation", () => {
    it("should have comprehensive notes", () => {
      const rules = getRulesForState("PA");
      expect(rules?.extras?.notes).toBeDefined();
      expect((rules?.extras?.notes as string).length).toBeGreaterThan(200);
    });

    it("should document key Pennsylvania features", () => {
      const rules = getRulesForState("PA");
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("6% state sales tax");
      expect(notes).toContain("Doc fees are NOT taxable");
      expect(notes).toContain("DUAL TAX STRUCTURE");
      expect(notes).toContain("MUTUAL CREDIT");
    });
  });
});
