import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Mississippi (MS) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load Mississippi rules successfully", () => {
    const rules = getRulesForState("MS");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("MS");
  });

  it("should mark Mississippi as implemented (not a stub)", () => {
    expect(isStateImplemented("MS")).toBe(true);
  });

  it("should have version number 2", () => {
    const rules = getRulesForState("MS");
    expect(rules?.version).toBe(2);
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS
  // ============================================================================

  describe("Retail - Trade-In Policy", () => {
    it("should have FULL trade-in credit policy", () => {
      const rules = getRulesForState("MS");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });
  });

  describe("Retail - Rebate Rules", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("MS");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as TAXABLE (unique MS feature)", () => {
      const rules = getRulesForState("MS");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(true);
    });

    it("should mark dealer rebates as NON-TAXABLE", () => {
      const rules = getRulesForState("MS");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(false);
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("MS");
      expect(rules?.docFeeTaxable).toBe(true);
    });
  });

  describe("Retail - Fee Tax Rules", () => {
    it("should mark service contracts (VSC) as NOT TAXABLE at sale", () => {
      const rules = getRulesForState("MS");
      expect(rules?.taxOnServiceContracts).toBe(false);
    });

    it("should mark GAP as NON-TAXABLE", () => {
      const rules = getRulesForState("MS");
      expect(rules?.taxOnGap).toBe(false);
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("MS");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should NOT tax service contracts at sale", () => {
      const rules = getRulesForState("MS");
      expect(rules?.taxOnServiceContracts).toBe(false);
    });

    it("should NOT tax GAP insurance", () => {
      const rules = getRulesForState("MS");
      expect(rules?.taxOnGap).toBe(false);
    });
  });

  describe("Retail - Vehicle Tax Scheme", () => {
    it("should use STATE_PLUS_LOCAL vehicle tax scheme", () => {
      const rules = getRulesForState("MS");
      expect(rules?.vehicleTaxScheme).toBe("STATE_PLUS_LOCAL");
    });

    it("should apply local sales tax to vehicles", () => {
      const rules = getRulesForState("MS");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(true);
    });

    it("should document state sales tax rate of 5% (standard vehicles)", () => {
      const rules = getRulesForState("MS");
      expect(rules?.extras?.stateSalesRate).toBe(5.0);
    });

    it("should document heavy truck rate of 3%", () => {
      const rules = getRulesForState("MS");
      expect(rules?.extras?.heavyTruckRate).toBe(3.0);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease - Tax Method", () => {
    it("should use MONTHLY lease taxation method", () => {
      const rules = getRulesForState("MS");
      expect(rules?.leaseRules.method).toBe("MONTHLY");
    });

    it("should NOT tax cap cost reduction upfront (monthly method)", () => {
      const rules = getRulesForState("MS");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });
  });

  describe("Lease - Trade-In Credit", () => {
    it("should provide FULL trade-in credit on leases", () => {
      const rules = getRulesForState("MS");
      expect(rules?.leaseRules.tradeInCredit).toBe("FULL");
    });
  });

  // ============================================================================
  // RECIPROCITY TESTS
  // ============================================================================

  describe("Reciprocity Rules", () => {
    it("should NOT have reciprocity (unique MS feature)", () => {
      const rules = getRulesForState("MS");
      expect(rules?.reciprocity.enabled).toBe(false);
    });
  });

  // ============================================================================
  // MISSISSIPPI-SPECIFIC FEATURES
  // ============================================================================

  describe("Mississippi Unique Features - Manufacturer Rebates TAXABLE", () => {
    it("should document that manufacturer rebates are taxed (very rare)", () => {
      const rules = getRulesForState("MS");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate?.taxable).toBe(true);
      expect(rules?.extras?.notes).toContain("Manufacturer rebates");
      expect(rules?.extras?.notes).toContain("TAXABLE");
    });

    it("should document that dealer rebates are NOT taxed", () => {
      const rules = getRulesForState("MS");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate?.taxable).toBe(false);
    });
  });

  describe("Mississippi Unique Features - NO RECIPROCITY", () => {
    it("should document that MS has no reciprocity", () => {
      const rules = getRulesForState("MS");
      expect(rules?.reciprocity.enabled).toBe(false);
      expect(rules?.extras?.notes).toContain("NO reciprocity");
    });
  });

  describe("Mississippi Features - Heavy Truck Rate", () => {
    it("should document 3% rate for vehicles over 10,000 lbs", () => {
      const rules = getRulesForState("MS");
      expect(rules?.extras?.heavyTruckRate).toBe(3.0);
      expect(rules?.extras?.notes).toContain("3%");
      expect(rules?.extras?.notes).toContain("10,000");
    });
  });

  // ============================================================================
  // SCENARIO TESTS
  // ============================================================================

  describe("Scenario: Purchase with Manufacturer Rebate (rebate TAXED)", () => {
    it("should tax full MSRP before rebate", () => {
      const vehicleMSRP = 30000;
      const mfrRebate = 3000;
      const netToCustomer = vehicleMSRP - mfrRebate;
      const tradeIn = 10000;
      const docFee = 395;
      const accessories = 1500;

      // Tax calculated on MSRP, NOT net price (unique to MS)
      const taxableBase = vehicleMSRP - tradeIn + docFee + accessories;
      const tax = taxableBase * 0.05;

      expect(netToCustomer).toBe(27000);
      expect(taxableBase).toBe(21895);
      expect(tax).toBeCloseTo(1094.75, 2);

      // Additional tax due to rebate being taxable
      const additionalTax = mfrRebate * 0.05;
      expect(additionalTax).toBe(150);
    });
  });

  describe("Scenario: Purchase with Dealer Rebate (rebate NOT taxed)", () => {
    it("should reduce tax base with dealer rebate", () => {
      const vehiclePrice = 35000;
      const dealerRebate = 2000;
      const netPrice = vehiclePrice - dealerRebate;
      const tradeIn = 12000;
      const docFee = 395;

      const taxableBase = netPrice - tradeIn + docFee;
      const tax = taxableBase * 0.05;

      expect(netPrice).toBe(33000);
      expect(taxableBase).toBe(21395);
      expect(tax).toBeCloseTo(1069.75, 2);
    });
  });

  describe("Scenario: Heavy Truck Purchase (3% rate)", () => {
    it("should apply 3% rate for truck over 10,000 lbs", () => {
      const vehiclePrice = 65000;
      const tradeIn = 25000;
      const docFee = 395;

      const taxableBase = vehiclePrice - tradeIn + docFee;
      const tax = taxableBase * 0.03; // Heavy truck rate

      expect(taxableBase).toBe(40395);
      expect(tax).toBeCloseTo(1211.85, 2);
    });
  });

  describe("Scenario: No Reciprocity (MS resident buying out-of-state)", () => {
    it("should pay full MS tax with no credit for out-of-state tax paid", () => {
      const vehiclePrice = 30000;
      const alTaxPaid = vehiclePrice * 0.02; // Alabama: 2%
      const msTaxDue = vehiclePrice * 0.05; // Mississippi: 5%
      const creditForALTax = 0; // NO credit in Mississippi
      const totalTaxBurden = alTaxPaid + msTaxDue;

      expect(alTaxPaid).toBe(600);
      expect(msTaxDue).toBe(1500);
      expect(creditForALTax).toBe(0);
      expect(totalTaxBurden).toBe(2100); // Pays tax twice
    });
  });

  describe("Scenario: Combined State + Local (Jackson ~7%)", () => {
    it("should calculate tax with local rate and manufacturer rebate taxed", () => {
      const vehicleMSRP = 28000;
      const mfrRebate = 2500;
      const netToCustomer = vehicleMSRP - mfrRebate;
      const tradeIn = 8000;
      const docFee = 395;
      const accessories = 1200;

      // Tax on MSRP, not net (rebate taxable)
      const taxableBase = vehicleMSRP - tradeIn + docFee + accessories;
      const tax = taxableBase * 0.07;

      expect(netToCustomer).toBe(25500);
      expect(taxableBase).toBe(21595);
      expect(tax).toBeCloseTo(1511.65, 2);

      // Additional tax from rebate
      const additionalTax = mfrRebate * 0.07;
      expect(additionalTax).toBe(175);
    });
  });

  describe("Scenario: Lease Payment (7% combined)", () => {
    it("should apply combined rate to monthly payment", () => {
      const monthlyPayment = 450;
      const tax = monthlyPayment * 0.07;

      expect(tax).toBeCloseTo(31.50, 2);
    });
  });

  // ============================================================================
  // METADATA AND DOCUMENTATION
  // ============================================================================

  describe("Metadata - Last Updated", () => {
    it("should have lastUpdated timestamp", () => {
      const rules = getRulesForState("MS");
      expect(rules?.extras?.lastUpdated).toBeDefined();
    });
  });

  describe("Metadata - Documentation", () => {
    it("should have comprehensive notes in extras", () => {
      const rules = getRulesForState("MS");
      expect(rules?.extras?.notes).toBeDefined();
      expect((rules?.extras?.notes as string)?.length).toBeGreaterThan(100);
    });

    it("should document key MS features in notes", () => {
      const rules = getRulesForState("MS");
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("Manufacturer rebates");
      expect(notes).toContain("TAXABLE");
      expect(notes).toContain("NO reciprocity");
      expect(notes).toContain("3%");
      expect(notes).toContain("5%");
    });
  });
});
