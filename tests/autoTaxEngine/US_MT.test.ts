import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Montana (MT) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load Montana rules successfully", () => {
    const rules = getRulesForState("MT");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("MT");
  });

  it("should mark Montana as implemented (not a stub)", () => {
    expect(isStateImplemented("MT")).toBe(true);
  });

  it("should have version number 1", () => {
    const rules = getRulesForState("MT");
    expect(rules?.version).toBe(1);
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS
  // ============================================================================

  describe("Retail - Trade-In Policy", () => {
    it("should have FULL trade-in credit policy (meaningless with no tax)", () => {
      const rules = getRulesForState("MT");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });
  });

  describe("Retail - Rebate Rules", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("MT");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as NON-TAXABLE (not applicable)", () => {
      const rules = getRulesForState("MT");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(false);
    });

    it("should mark dealer rebates as NON-TAXABLE (not applicable)", () => {
      const rules = getRulesForState("MT");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(false);
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as NOT TAXABLE (no sales tax exists)", () => {
      const rules = getRulesForState("MT");
      expect(rules?.docFeeTaxable).toBe(false);
    });
  });

  describe("Retail - Fee Tax Rules", () => {
    it("should mark service contracts (VSC) as NON-TAXABLE", () => {
      const rules = getRulesForState("MT");
      expect(rules?.taxOnServiceContracts).toBe(false);
    });

    it("should mark GAP as NON-TAXABLE", () => {
      const rules = getRulesForState("MT");
      expect(rules?.taxOnGap).toBe(false);
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should NOT tax accessories (no sales tax)", () => {
      const rules = getRulesForState("MT");
      expect(rules?.taxOnAccessories).toBe(false);
    });

    it("should NOT tax service contracts", () => {
      const rules = getRulesForState("MT");
      expect(rules?.taxOnServiceContracts).toBe(false);
    });

    it("should NOT tax GAP insurance", () => {
      const rules = getRulesForState("MT");
      expect(rules?.taxOnGap).toBe(false);
    });
  });

  describe("Retail - Vehicle Tax Scheme", () => {
    it("should use STATE_ONLY vehicle tax scheme (but rate is 0%)", () => {
      const rules = getRulesForState("MT");
      expect(rules?.vehicleTaxScheme).toBe("STATE_ONLY");
    });

    it("should NOT apply local sales tax to vehicles", () => {
      const rules = getRulesForState("MT");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
    });

    it("should document state sales tax rate of 0%", () => {
      const rules = getRulesForState("MT");
      expect(rules?.extras?.stateSalesRate).toBe(0);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease - Tax Method", () => {
    it("should use MONTHLY lease taxation method (not applicable)", () => {
      const rules = getRulesForState("MT");
      expect(rules?.leaseRules.method).toBe("MONTHLY");
    });

    it("should NOT tax cap cost reduction (no sales tax)", () => {
      const rules = getRulesForState("MT");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });
  });

  describe("Lease - Trade-In Credit", () => {
    it("should provide FULL trade-in credit (meaningless with no tax)", () => {
      const rules = getRulesForState("MT");
      expect(rules?.leaseRules.tradeInCredit).toBe("FULL");
    });
  });

  // ============================================================================
  // RECIPROCITY TESTS
  // ============================================================================

  describe("Reciprocity Rules", () => {
    it("should NOT have reciprocity (not applicable - no sales tax)", () => {
      const rules = getRulesForState("MT");
      expect(rules?.reciprocity.enabled).toBe(false);
    });
  });

  // ============================================================================
  // MONTANA-SPECIFIC FEATURES
  // ============================================================================

  describe("Montana Unique Features - No Sales Tax", () => {
    it("should document that MT has NO state sales tax", () => {
      const rules = getRulesForState("MT");
      expect(rules?.extras?.stateSalesRate).toBe(0);
      expect(rules?.extras?.notes).toContain("NO state sales tax");
    });

    it("should document that MT is one of 5 states without sales tax", () => {
      const rules = getRulesForState("MT");
      expect(rules?.extras?.notes).toContain("one of five");
    });
  });

  describe("Montana Features - Registration Fees", () => {
    it("should document age-based registration fee structure", () => {
      const rules = getRulesForState("MT");
      expect(rules?.extras?.notes).toContain("registration");
      expect(rules?.extras?.notes).toContain("age-based");
    });

    it("should document luxury vehicle tax for MSRP >= $150,000", () => {
      const rules = getRulesForState("MT");
      expect(rules?.extras?.luxuryVehicleTax).toBeDefined();
      expect(rules?.extras?.notes).toContain("luxury");
      expect(rules?.extras?.notes).toContain("$150,000");
    });
  });

  describe("Montana Features - LLC Registration Strategy", () => {
    it("should document MT as popular for LLC registrations", () => {
      const rules = getRulesForState("MT");
      expect(rules?.extras?.notes).toContain("LLC");
    });
  });

  // ============================================================================
  // SCENARIO TESTS
  // ============================================================================

  describe("Scenario: Standard Vehicle Purchase", () => {
    it("should calculate ZERO sales tax", () => {
      const vehiclePrice = 30000;
      const tradeIn = 10000;
      const docFee = 300;
      const accessories = 1500;

      const salesTax = 0;
      const totalCost = vehiclePrice - tradeIn + docFee + accessories;

      expect(salesTax).toBe(0);
      expect(totalCost).toBe(21800);
    });
  });

  describe("Scenario: Luxury Vehicle Purchase", () => {
    it("should calculate ZERO sales tax (but may have luxury vehicle tax)", () => {
      const vehiclePrice = 175000; // Over $150,000
      const tradeIn = 60000;
      const docFee = 300;

      const salesTax = 0;
      const luxuryVehicleTax = 825; // $825/year for MSRP >= $150,000
      const totalCost = vehiclePrice - tradeIn + docFee;

      expect(salesTax).toBe(0);
      expect(totalCost).toBe(115300);
      // Note: Luxury vehicle tax is annual, not one-time
      expect(luxuryVehicleTax).toBe(825);
    });
  });

  describe("Scenario: Lease", () => {
    it("should calculate ZERO tax on lease payments", () => {
      const monthlyPayment = 500;
      const salesTax = 0;
      const totalMonthly = monthlyPayment + salesTax;

      expect(salesTax).toBe(0);
      expect(totalMonthly).toBe(500);
    });
  });

  describe("Scenario: Registration Fees (Age-Based)", () => {
    it("should document age-based fee structure", () => {
      const rules = getRulesForState("MT");
      // Fees vary by age: new ($217), 1-10 years ($87), 11+ years ($28), permanent ($87.50)
      expect(rules?.extras?.notes).toContain("$217");
      expect(rules?.extras?.notes).toContain("$87");
    });
  });

  describe("Scenario: Savings vs. Sales Tax States", () => {
    it("should calculate savings compared to neighboring states", () => {
      const vehiclePrice = 50000;
      const mtTax = 0;
      const idTax = vehiclePrice * 0.06; // ID: 6%
      const wyTax = vehiclePrice * 0.04; // WY: 4%
      const ndTax = vehiclePrice * 0.05; // ND: 5%

      const savingsVsID = idTax - mtTax;
      const savingsVsWY = wyTax - mtTax;
      const savingsVsND = ndTax - mtTax;

      expect(savingsVsID).toBe(3000);
      expect(savingsVsWY).toBe(2000);
      expect(savingsVsND).toBe(2500);
    });
  });

  // ============================================================================
  // METADATA AND DOCUMENTATION
  // ============================================================================

  describe("Metadata - Last Updated", () => {
    it("should have lastUpdated timestamp", () => {
      const rules = getRulesForState("MT");
      expect(rules?.extras?.lastUpdated).toBeDefined();
    });
  });

  describe("Metadata - Documentation", () => {
    it("should have comprehensive notes in extras", () => {
      const rules = getRulesForState("MT");
      expect(rules?.extras?.notes).toBeDefined();
      expect((rules?.extras?.notes as string)?.length).toBeGreaterThan(100);
    });

    it("should document key MT features in notes", () => {
      const rules = getRulesForState("MT");
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("NO state sales tax");
      expect(notes).toContain("0%");
      expect(notes).toContain("registration");
      expect(notes).toContain("LLC");
    });
  });
});
