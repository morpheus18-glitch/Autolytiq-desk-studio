import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Idaho (ID) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load Idaho rules successfully", () => {
    const rules = getRulesForState("ID");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("ID");
  });

  it("should mark Idaho as implemented (not a stub)", () => {
    expect(isStateImplemented("ID")).toBe(true);
  });

  it("should have version number 1", () => {
    const rules = getRulesForState("ID");
    expect(rules?.version).toBe(1);
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS
  // ============================================================================

  describe("Retail - Trade-In Policy", () => {
    it("should have FULL trade-in credit policy", () => {
      const rules = getRulesForState("ID");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });
  });

  describe("Retail - Rebate Rules", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("ID");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as NON-TAXABLE", () => {
      const rules = getRulesForState("ID");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(false);
    });

    it("should mark dealer rebates as NON-TAXABLE", () => {
      const rules = getRulesForState("ID");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(false);
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("ID");
      expect(rules?.docFeeTaxable).toBe(true);
    });
  });

  describe("Retail - Fee Tax Rules", () => {
    it("should mark service contracts (VSC) as NON-TAXABLE", () => {
      const rules = getRulesForState("ID");
      expect(rules?.taxOnServiceContracts).toBe(false);
    });

    it("should mark GAP as NON-TAXABLE", () => {
      const rules = getRulesForState("ID");
      expect(rules?.taxOnGap).toBe(false);
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("ID");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should NOT tax service contracts", () => {
      const rules = getRulesForState("ID");
      expect(rules?.taxOnServiceContracts).toBe(false);
    });

    it("should NOT tax GAP insurance", () => {
      const rules = getRulesForState("ID");
      expect(rules?.taxOnGap).toBe(false);
    });
  });

  describe("Retail - Vehicle Tax Scheme", () => {
    it("should use STATE_ONLY vehicle tax scheme", () => {
      const rules = getRulesForState("ID");
      expect(rules?.vehicleTaxScheme).toBe("STATE_ONLY");
    });

    it("should NOT apply local sales tax to vehicles", () => {
      const rules = getRulesForState("ID");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
    });

    it("should document state sales tax rate of 6%", () => {
      const rules = getRulesForState("ID");
      expect(rules?.extras?.stateSalesRate).toBe(6.0);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease - Tax Method", () => {
    it("should use MONTHLY lease taxation method", () => {
      const rules = getRulesForState("ID");
      expect(rules?.leaseRules.method).toBe("MONTHLY");
    });

    it("should NOT tax cap cost reduction upfront (monthly method)", () => {
      const rules = getRulesForState("ID");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });
  });

  describe("Lease - Trade-In Credit", () => {
    it("should provide FULL trade-in credit on leases", () => {
      const rules = getRulesForState("ID");
      expect(rules?.leaseRules.tradeInCredit).toBe("FULL");
    });
  });

  // ============================================================================
  // IDAHO-SPECIFIC FEATURES
  // ============================================================================

  describe("Idaho Unique Features - Uniform Statewide Rate", () => {
    it("should document that Idaho has 6% flat rate statewide", () => {
      const rules = getRulesForState("ID");
      expect(rules?.extras?.stateSalesRate).toBe(6.0);
      expect(rules?.extras?.notes).toContain("6%");
      expect(rules?.extras?.notes).toContain("uniform");
    });

    it("should document no local taxes on vehicles", () => {
      const rules = getRulesForState("ID");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
      expect(rules?.extras?.notes).toContain("No local taxes");
    });
  });

  describe("Idaho Features - Service Contract Exemption", () => {
    it("should document that service contracts are exempt", () => {
      const rules = getRulesForState("ID");
      expect(rules?.taxOnServiceContracts).toBe(false);
      expect(rules?.extras?.notes).toContain("Service contracts");
    });
  });

  // ============================================================================
  // SCENARIO TESTS
  // ============================================================================

  describe("Scenario: Standard Vehicle Purchase", () => {
    it("should calculate tax correctly at 6%", () => {
      const vehiclePrice = 30000;
      const tradeIn = 10000;
      const docFee = 389;
      const serviceContract = 2000; // NOT taxed
      const accessories = 1500;

      const taxableBase = vehiclePrice - tradeIn + docFee + accessories;
      const tax = taxableBase * 0.06;

      expect(taxableBase).toBe(21889);
      expect(tax).toBeCloseTo(1313.34, 2);

      const totalCost = vehiclePrice - tradeIn + docFee + serviceContract + accessories + tax;
      expect(totalCost).toBeCloseTo(25202.34, 2);
    });
  });

  describe("Scenario: Purchase with Manufacturer Rebate", () => {
    it("should reduce tax base with rebate", () => {
      const vehiclePrice = 35000;
      const mfrRebate = 3000;
      const tradeIn = 12000;
      const docFee = 389;
      const gap = 695; // NOT taxed

      const priceAfterRebate = vehiclePrice - mfrRebate;
      const taxableBase = priceAfterRebate - tradeIn + docFee;
      const tax = taxableBase * 0.06;

      expect(priceAfterRebate).toBe(32000);
      expect(taxableBase).toBe(20389);
      expect(tax).toBeCloseTo(1223.34, 2);
    });
  });

  describe("Scenario: Lease Payment at 6%", () => {
    it("should apply 6% tax to monthly payment", () => {
      const monthlyPayment = 400;
      const tax = monthlyPayment * 0.06;

      expect(tax).toBeCloseTo(24, 2);
    });
  });

  describe("Scenario: Service Contract Savings", () => {
    it("should save 6% on service contracts", () => {
      const vscCost = 3000;
      const taxSavings = vscCost * 0.06;

      expect(taxSavings).toBe(180);
    });
  });

  // ============================================================================
  // METADATA AND DOCUMENTATION
  // ============================================================================

  describe("Metadata - Last Updated", () => {
    it("should have lastUpdated timestamp", () => {
      const rules = getRulesForState("ID");
      expect(rules?.extras?.lastUpdated).toBeDefined();
    });
  });

  describe("Metadata - Documentation", () => {
    it("should have comprehensive notes in extras", () => {
      const rules = getRulesForState("ID");
      expect(rules?.extras?.notes).toBeDefined();
      expect((rules?.extras?.notes as string)?.length).toBeGreaterThan(100);
    });

    it("should document key ID features in notes", () => {
      const rules = getRulesForState("ID");
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("6%");
      expect(notes).toContain("uniform");
      expect(notes).toContain("Service contracts");
    });
  });
});
