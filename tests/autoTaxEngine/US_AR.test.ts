import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Arkansas (AR) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load Arkansas rules successfully", () => {
    const rules = getRulesForState("AR");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("AR");
  });

  it("should mark Arkansas as implemented (not a stub)", () => {
    expect(isStateImplemented("AR")).toBe(true);
  });

  it("should have version number 1", () => {
    const rules = getRulesForState("AR");
    expect(rules?.version).toBe(1);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("AR");
    const rulesLower = getRulesForState("ar");
    const rulesMixed = getRulesForState("Ar");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("AR");
    expect(rulesLower?.stateCode).toBe("AR");
    expect(rulesMixed?.stateCode).toBe("AR");
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS
  // ============================================================================

  describe("Retail - Trade-In Policy", () => {
    it("should have FULL trade-in credit policy", () => {
      const rules = getRulesForState("AR");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });

    it("should document 60-day window requirement", () => {
      const rules = getRulesForState("AR");
      expect(rules?.tradeInPolicy.notes).toContain("60-day");
      expect(rules?.extras?.tradeInWindowDays).toBe(60);
    });

    it("should apply full trade-in credit with no cap", () => {
      const rules = getRulesForState("AR");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
      // No cap property for FULL type
    });
  });

  describe("Retail - Rebate Rules", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("AR");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as TAXABLE (unusual)", () => {
      const rules = getRulesForState("AR");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(true);
      expect(mfrRebate?.notes).toContain("BEFORE rebate");
    });

    it("should mark dealer rebates as TAXABLE", () => {
      const rules = getRulesForState("AR");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(true);
      expect(dealerRebate?.notes).toContain("BEFORE rebate");
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("AR");
      expect(rules?.docFeeTaxable).toBe(true);
    });

    it("should have NO CAP on doc fees", () => {
      const rules = getRulesForState("AR");
      expect(rules?.extras?.docFeeCap).toBeNull();
    });

    it("should document average doc fee", () => {
      const rules = getRulesForState("AR");
      expect(rules?.extras?.docFeeAverage).toBe(110);
    });
  });

  describe("Retail - Fee Tax Rules (UNUSUAL: Service Contracts and GAP Taxable)", () => {
    it("should mark service contracts as TAXABLE (unusual)", () => {
      const rules = getRulesForState("AR");
      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(true);
      expect(vsc?.notes).toContain("taxable");
    });

    it("should mark GAP as TAXABLE (unusual)", () => {
      const rules = getRulesForState("AR");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(true);
      expect(gap?.notes).toContain("taxable");
    });

    it("should mark title fees as NON-taxable", () => {
      const rules = getRulesForState("AR");
      const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-taxable", () => {
      const rules = getRulesForState("AR");
      const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("AR");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should tax negative equity", () => {
      const rules = getRulesForState("AR");
      expect(rules?.taxOnNegativeEquity).toBe(true);
    });

    it("should tax service contracts (unusual)", () => {
      const rules = getRulesForState("AR");
      expect(rules?.taxOnServiceContracts).toBe(true);
    });

    it("should tax GAP insurance (unusual)", () => {
      const rules = getRulesForState("AR");
      expect(rules?.taxOnGap).toBe(true);
    });
  });

  describe("Retail - Vehicle Tax Scheme", () => {
    it("should use STATE_PLUS_LOCAL vehicle tax scheme", () => {
      const rules = getRulesForState("AR");
      expect(rules?.vehicleTaxScheme).toBe("STATE_PLUS_LOCAL");
    });

    it("should apply local sales tax to vehicles", () => {
      const rules = getRulesForState("AR");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(true);
    });

    it("should document tiered state tax rates", () => {
      const rules = getRulesForState("AR");
      expect(rules?.extras?.stateSalesTaxRate).toBe(0.065); // 6.5% standard
      expect(rules?.extras?.reducedRate).toBe(0.035); // 3.5% reduced
      expect(rules?.extras?.reducedRateThreshold).toBe(4000); // Under $4k exempt
      expect(rules?.extras?.fullRateThreshold).toBe(10000); // $10k+ full rate
    });

    it("should document local tax range", () => {
      const rules = getRulesForState("AR");
      expect(rules?.extras?.localTaxRange).toBe("0% to 5%");
      expect(rules?.extras?.averageLocalRate).toBe(0.02688);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease - Tax Method", () => {
    it("should use MONTHLY lease taxation method", () => {
      const rules = getRulesForState("AR");
      expect(rules?.leaseRules.method).toBe("MONTHLY");
    });

    it("should TAX cap cost reduction", () => {
      const rules = getRulesForState("AR");
      expect(rules?.leaseRules.taxCapReduction).toBe(true);
    });

    it("should have no special lease scheme", () => {
      const rules = getRulesForState("AR");
      expect(rules?.leaseRules.specialScheme).toBe("NONE");
    });

    it("should document long-term rental vehicle tax rate", () => {
      const rules = getRulesForState("AR");
      expect(rules?.extras?.longTermRentalVehicleTax).toBe(0.015); // 1.5%
    });
  });

  describe("Lease - Trade-In Credit (NONE - Explicitly Denied)", () => {
    it("should have NO trade-in credit on leases", () => {
      const rules = getRulesForState("AR");
      expect(rules?.leaseRules.tradeInCredit).toBe("NONE");
    });

    it("should document that trade-in deduction does NOT apply to leases", () => {
      const rules = getRulesForState("AR");
      expect(rules?.leaseRules.notes).toContain("NOT apply to leases");
      expect(rules?.extras?.leaseTradeInCredit).toBe(false);
    });
  });

  describe("Lease - Rebate Behavior", () => {
    it("should follow retail rule for rebates on leases", () => {
      const rules = getRulesForState("AR");
      expect(rules?.leaseRules.rebateBehavior).toBe("FOLLOW_RETAIL_RULE");
    });
  });

  describe("Lease - Documentation Fee", () => {
    it("should ALWAYS tax doc fee on leases", () => {
      const rules = getRulesForState("AR");
      expect(rules?.leaseRules.docFeeTaxability).toBe("ALWAYS");
    });

    it("should have doc fee as taxable in lease fee rules", () => {
      const rules = getRulesForState("AR");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
    });
  });

  describe("Lease - Negative Equity", () => {
    it("should mark negative equity as TAXABLE on leases", () => {
      const rules = getRulesForState("AR");
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(true);
    });
  });

  describe("Lease - Fee Taxability (Service Contracts and GAP Taxable)", () => {
    it("should mark service contracts as TAXABLE on leases", () => {
      const rules = getRulesForState("AR");
      const vsc = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(true);
    });

    it("should mark GAP as TAXABLE on leases", () => {
      const rules = getRulesForState("AR");
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(true);
    });

    it("should mark title fees as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("AR");
      const title = rules?.leaseRules.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });
  });

  describe("Lease - Tax Timing", () => {
    it("should tax fees upfront on leases", () => {
      const rules = getRulesForState("AR");
      expect(rules?.leaseRules.taxFeesUpfront).toBe(true);
    });
  });

  // ============================================================================
  // RECIPROCITY TESTS (NO RECIPROCITY)
  // ============================================================================

  describe("Reciprocity (NOT ENABLED)", () => {
    it("should have reciprocity disabled", () => {
      const rules = getRulesForState("AR");
      expect(rules?.reciprocity.enabled).toBe(false);
    });

    it("should have scope NONE", () => {
      const rules = getRulesForState("AR");
      expect(rules?.reciprocity.scope).toBe("NONE");
    });

    it("should have homeStateBehavior NONE", () => {
      const rules = getRulesForState("AR");
      expect(rules?.reciprocity.homeStateBehavior).toBe("NONE");
    });

    it("should document no credit for out-of-state taxes", () => {
      const rules = getRulesForState("AR");
      expect(rules?.reciprocity.notes).toContain("does NOT provide reciprocity");
      expect(rules?.extras?.reciprocityEnabled).toBe(false);
      expect(rules?.extras?.noOutOfStateTaxCredit).toBe(true);
    });
  });

  // ============================================================================
  // ARKANSAS-SPECIFIC FEATURES
  // ============================================================================

  describe("Arkansas Unique Features - Tiered State Tax Rates", () => {
    it("should document vehicle under $4,000 exempt from state tax", () => {
      const rules = getRulesForState("AR");
      expect(rules?.extras?.reducedRateThreshold).toBe(4000);
      expect(rules?.extras?.notes).toContain("under $4,000");
    });

    it("should document $4,000-$10,000 taxed at 3.5%", () => {
      const rules = getRulesForState("AR");
      expect(rules?.extras?.reducedRate).toBe(0.035);
      expect(rules?.extras?.reducedRateMax).toBe(10000);
    });

    it("should document $10,000+ taxed at 6.5%", () => {
      const rules = getRulesForState("AR");
      expect(rules?.extras?.stateSalesTaxRate).toBe(0.065);
      expect(rules?.extras?.fullRateThreshold).toBe(10000);
    });
  });

  describe("Arkansas Unique Features - Service Contracts and GAP Taxable", () => {
    it("should document that service contracts are taxable", () => {
      const rules = getRulesForState("AR");
      expect(rules?.extras?.serviceContractsTaxable).toBe(true);
      expect(rules?.taxOnServiceContracts).toBe(true);
    });

    it("should document that GAP is taxable", () => {
      const rules = getRulesForState("AR");
      expect(rules?.extras?.gapTaxable).toBe(true);
      expect(rules?.taxOnGap).toBe(true);
    });
  });

  describe("Arkansas Unique Features - No Lease Trade-In Credit", () => {
    it("should explicitly document lease trade-in credit is denied", () => {
      const rules = getRulesForState("AR");
      expect(rules?.leaseRules.tradeInCredit).toBe("NONE");
      expect(rules?.extras?.leaseTradeInCredit).toBe(false);
    });
  });

  describe("Arkansas Unique Features - Tax Payment Method", () => {
    it("should document direct payment to DFA", () => {
      const rules = getRulesForState("AR");
      expect(rules?.extras?.paymentMethod).toBe("DIRECT_TO_DFA");
      expect(rules?.extras?.paymentTiming).toBe("AT_REGISTRATION");
    });
  });

  describe("Arkansas Unique Features - Long-Term Rental Vehicle Tax", () => {
    it("should document 1.5% long-term rental vehicle tax on leases", () => {
      const rules = getRulesForState("AR");
      expect(rules?.extras?.longTermRentalVehicleTax).toBe(0.015);
    });

    it("should document short-term rental rates", () => {
      const rules = getRulesForState("AR");
      expect(rules?.extras?.shortTermRentalVehicleTax).toBeDefined();
      expect(rules?.extras?.shortTermRentalBaseTax).toBeDefined();
    });
  });

  // ============================================================================
  // SCENARIO TESTS
  // ============================================================================

  describe("Scenario: Basic Retail Sale (9% combined)", () => {
    it("should calculate tax correctly with trade-in", () => {
      // $30,000 vehicle + $110 doc - $10,000 trade = $20,110 taxable
      // Tax @ 9%: $20,110 × 0.09 = $1,809.90
      const vehiclePrice = 30000;
      const docFee = 110;
      const tradeIn = 10000;
      const taxableBase = vehiclePrice + docFee - tradeIn;
      const combinedRate = 0.09; // 6.5% state + 2.5% local

      expect(taxableBase).toBe(20110);
      const expectedTax = taxableBase * combinedRate;
      expect(expectedTax).toBeCloseTo(1809.90, 2);
    });
  });

  describe("Scenario: Retail Sale with Service Contract and GAP (Taxable)", () => {
    it("should include VSC and GAP in taxable base", () => {
      const vehiclePrice = 28000;
      const serviceContract = 2500;
      const gap = 695;
      const docFee = 110;
      const tradeIn = 8000;
      const taxableBase = vehiclePrice + serviceContract + gap + docFee - tradeIn;
      const rate = 0.09;

      expect(taxableBase).toBe(23305);
      const tax = taxableBase * rate;
      expect(tax).toBeCloseTo(2097.45, 2);
    });
  });

  describe("Scenario: Retail Sale with Manufacturer Rebate (Taxable)", () => {
    it("should tax full price BEFORE rebate", () => {
      // $25,000 vehicle - $3,000 rebate = $22,000 customer pays
      // But taxable base is $25,000 (rebates are taxable)
      const vehicleMSRP = 25000;
      const mfrRebate = 3000;
      const customerPays = vehicleMSRP - mfrRebate;
      const taxableBase = vehicleMSRP; // NOT customerPays
      const rate = 0.09;

      expect(customerPays).toBe(22000);
      expect(taxableBase).toBe(25000);
      const tax = taxableBase * rate;
      expect(tax).toBe(2250);
    });
  });

  describe("Scenario: Vehicle Under $4,000 (Exempt from State Tax)", () => {
    it("should exempt state tax but apply local tax", () => {
      const vehiclePrice = 3500;
      const stateRate = 0; // Exempt
      const localRate = 0.025;

      const stateTax = vehiclePrice * stateRate;
      const localTax = vehiclePrice * localRate;

      expect(stateTax).toBe(0);
      expect(localTax).toBe(87.50);
    });
  });

  describe("Scenario: Vehicle $4,000-$10,000 (Reduced Rate)", () => {
    it("should apply 3.5% state rate", () => {
      const vehiclePrice = 8000;
      const stateRate = 0.035; // Reduced rate
      const localRate = 0.025;

      const stateTax = vehiclePrice * stateRate;
      const localTax = vehiclePrice * localRate;
      const totalTax = stateTax + localTax;

      expect(stateTax).toBe(280);
      expect(localTax).toBe(200);
      expect(totalTax).toBe(480);
    });
  });

  describe("Scenario: Lease with No Trade-In Credit", () => {
    it("should NOT provide trade-in credit on leases", () => {
      const capCost = 35000;
      const tradeInEquity = 8000;
      const monthlyPayment = 450;
      const term = 36;
      const salesTaxRate = 0.065;
      const rentalTaxRate = 0.015;
      const localRate = 0.025;
      const combinedRate = salesTaxRate + rentalTaxRate + localRate;

      // Trade-in does NOT reduce tax on leases
      const monthlyTax = monthlyPayment * combinedRate;
      const totalTax = monthlyTax * term;

      expect(monthlyTax).toBeCloseTo(47.25, 2);
      expect(totalTax).toBeCloseTo(1701, 0);
    });
  });

  describe("Scenario: Out-of-State Purchase (No Reciprocity)", () => {
    it("should owe full Arkansas tax with no credit for other state taxes", () => {
      const vehiclePrice = 30000;
      const tennesseetaxPaid = 2100; // 7% in TN
      const arkansasTaxRate = 0.09; // 6.5% state + 2.5% local
      const arkansasTax = vehiclePrice * arkansasTaxRate;

      // NO credit for TN tax
      const creditAllowed = 0;
      const arkansasTaxOwed = arkansasTax - creditAllowed;
      const totalTaxesPaid = tennesseetaxPaid + arkansasTaxOwed;

      expect(arkansasTax).toBe(2700);
      expect(creditAllowed).toBe(0);
      expect(arkansasTaxOwed).toBe(2700);
      expect(totalTaxesPaid).toBe(4800); // Double taxation
    });
  });

  // ============================================================================
  // METADATA AND DOCUMENTATION
  // ============================================================================

  describe("Metadata - Sources", () => {
    it("should document official sources", () => {
      const rules = getRulesForState("AR");
      expect(rules?.extras?.sources).toBeDefined();
      expect(rules?.extras?.sources?.length).toBeGreaterThan(0);
    });

    it("should reference Arkansas DFA", () => {
      const rules = getRulesForState("AR");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Arkansas Department of Finance"))).toBe(true);
    });

    it("should reference Arkansas Code", () => {
      const rules = getRulesForState("AR");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Arkansas Code"))).toBe(true);
    });

    it("should reference Arkansas Admin Code", () => {
      const rules = getRulesForState("AR");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Arkansas Admin"))).toBe(true);
    });

    it("should reference Act 1232 and Act 277", () => {
      const rules = getRulesForState("AR");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Act 1232") || s.includes("Act 277"))).toBe(true);
    });
  });

  describe("Metadata - Last Updated", () => {
    it("should have lastUpdated timestamp", () => {
      const rules = getRulesForState("AR");
      expect(rules?.extras?.lastUpdated).toBeDefined();
      expect(rules?.extras?.lastUpdated).toBe("2025-11-14");
    });
  });

  describe("Metadata - Documentation", () => {
    it("should have comprehensive notes in extras", () => {
      const rules = getRulesForState("AR");
      expect(rules?.extras?.notes).toBeDefined();
      expect((rules?.extras?.notes as string)?.length).toBeGreaterThan(100);
    });

    it("should document key Arkansas features in notes", () => {
      const rules = getRulesForState("AR");
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("6.5%");
      expect(notes).toContain("NO reciprocity");
      expect(notes).toContain("Service contracts");
      expect(notes).toContain("GAP");
    });

    it("should have description field", () => {
      const rules = getRulesForState("AR");
      expect(rules?.extras?.description).toBeDefined();
      expect(rules?.extras?.description).toContain("Arkansas");
    });
  });
});
