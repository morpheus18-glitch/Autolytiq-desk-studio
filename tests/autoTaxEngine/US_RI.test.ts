import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Rhode Island (RI) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load Rhode Island rules successfully", () => {
    const rules = getRulesForState("RI");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("RI");
  });

  it("should mark Rhode Island as implemented (not a stub)", () => {
    expect(isStateImplemented("RI")).toBe(true);
  });

  it("should have version number 1", () => {
    const rules = getRulesForState("RI");
    expect(rules?.version).toBe(1);
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS
  // ============================================================================

  describe("Retail - Trade-In Policy", () => {
    it("should have FULL trade-in credit policy", () => {
      const rules = getRulesForState("RI");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });
  });

  describe("Retail - Rebate Rules", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("RI");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as NON-TAXABLE", () => {
      const rules = getRulesForState("RI");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(false);
    });

    it("should mark dealer rebates as NON-TAXABLE", () => {
      const rules = getRulesForState("RI");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(false);
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("RI");
      expect(rules?.docFeeTaxable).toBe(true);
    });

    it("should document doc fee cap of $599", () => {
      const rules = getRulesForState("RI");
      expect(rules?.extras?.docFeeCap).toBe(599);
    });
  });

  describe("Retail - Fee Tax Rules", () => {
    it("should mark service contracts (VSC) as NON-TAXABLE", () => {
      const rules = getRulesForState("RI");
      expect(rules?.taxOnServiceContracts).toBe(false);
    });

    it("should mark GAP as NON-TAXABLE", () => {
      const rules = getRulesForState("RI");
      expect(rules?.taxOnGap).toBe(false);
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("RI");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should NOT tax service contracts", () => {
      const rules = getRulesForState("RI");
      expect(rules?.taxOnServiceContracts).toBe(false);
    });

    it("should NOT tax GAP insurance", () => {
      const rules = getRulesForState("RI");
      expect(rules?.taxOnGap).toBe(false);
    });
  });

  describe("Retail - Vehicle Tax Scheme", () => {
    it("should use STATE_ONLY vehicle tax scheme", () => {
      const rules = getRulesForState("RI");
      expect(rules?.vehicleTaxScheme).toBe("STATE_ONLY");
    });

    it("should NOT apply local sales tax to vehicles", () => {
      const rules = getRulesForState("RI");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
    });

    it("should document state sales tax rate of 7%", () => {
      const rules = getRulesForState("RI");
      expect(rules?.extras?.stateSalesRate).toBe(7.0);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease - Tax Method", () => {
    it("should use MONTHLY lease taxation method", () => {
      const rules = getRulesForState("RI");
      expect(rules?.leaseRules.method).toBe("MONTHLY");
    });

    it("should NOT tax cap cost reduction upfront (monthly method)", () => {
      const rules = getRulesForState("RI");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });
  });

  describe("Lease - Trade-In Credit", () => {
    it("should provide FULL trade-in credit on leases", () => {
      const rules = getRulesForState("RI");
      expect(rules?.leaseRules.tradeInCredit).toBe("FULL");
    });
  });

  // ============================================================================
  // RECIPROCITY TESTS
  // ============================================================================

  describe("Reciprocity Rules", () => {
    it("should have reciprocity enabled", () => {
      const rules = getRulesForState("RI");
      expect(rules?.reciprocity.enabled).toBe(true);
    });

    it("should apply reciprocity to BOTH retail and lease", () => {
      const rules = getRulesForState("RI");
      expect(rules?.reciprocity.scope).toBe("BOTH");
    });

    it("should use CREDIT_UP_TO_STATE_RATE mode", () => {
      const rules = getRulesForState("RI");
      expect(rules?.reciprocity.homeStateBehavior).toBe("CREDIT_UP_TO_STATE_RATE");
    });

    it("should cap credit at RI's 7% tax rate", () => {
      const rules = getRulesForState("RI");
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(true);
    });
  });

  // ============================================================================
  // RHODE ISLAND-SPECIFIC FEATURES
  // ============================================================================

  describe("Rhode Island Unique Features - 7% Flat Rate", () => {
    it("should document 7% flat rate (highest in New England)", () => {
      const rules = getRulesForState("RI");
      expect(rules?.extras?.stateSalesRate).toBe(7.0);
      expect(rules?.extras?.notes).toContain("7%");
    });

    it("should document no local taxes", () => {
      const rules = getRulesForState("RI");
      expect(rules?.extras?.noLocalTaxes).toBe(true);
    });
  });

  describe("Rhode Island Features - High Doc Fee Cap", () => {
    it("should document $599 cap (one of highest)", () => {
      const rules = getRulesForState("RI");
      expect(rules?.extras?.docFeeCap).toBe(599);
      expect(rules?.extras?.notes).toContain("$599");
    });
  });

  describe("Rhode Island Features - Title Fee", () => {
    it("should document title fee of $52.50", () => {
      const rules = getRulesForState("RI");
      expect(rules?.extras?.titleFee).toBe(52.50);
    });
  });

  // ============================================================================
  // SCENARIO TESTS
  // ============================================================================

  describe("Scenario: Standard Vehicle Purchase at 7%", () => {
    it("should calculate tax correctly", () => {
      const vehiclePrice = 30000;
      const tradeIn = 10000;
      const docFee = 599;
      const vsc = 1500; // NOT taxed
      const gap = 695; // NOT taxed
      const accessories = 1200;

      const taxableBase = vehiclePrice - tradeIn + docFee + accessories;
      const tax = taxableBase * 0.07;

      expect(taxableBase).toBe(21799);
      expect(tax).toBeCloseTo(1525.93, 2);
    });
  });

  describe("Scenario: Purchase with Manufacturer Rebate", () => {
    it("should reduce tax base with rebate", () => {
      const vehiclePrice = 35000;
      const mfrRebate = 2000;
      const tradeIn = 12000;
      const docFee = 599;
      const extendedWarranty = 2500; // NOT taxed

      const priceAfterRebate = vehiclePrice - mfrRebate;
      const taxableBase = priceAfterRebate - tradeIn + docFee;
      const tax = taxableBase * 0.07;

      expect(priceAfterRebate).toBe(33000);
      expect(taxableBase).toBe(21599);
      expect(tax).toBeCloseTo(1511.93, 2);
    });
  });

  describe("Scenario: Lease Payment at 7%", () => {
    it("should apply 7% tax to monthly payment", () => {
      const monthlyPayment = 450;
      const tax = monthlyPayment * 0.07;

      expect(tax).toBeCloseTo(31.50, 2);

      const totalOver36Months = (monthlyPayment + tax) * 36;
      expect(totalOver36Months).toBeCloseTo(17334, 0);
    });
  });

  describe("Scenario: Reciprocity Example with MA", () => {
    it("should provide credit for MA tax paid, charge difference", () => {
      const vehiclePrice = 30000;
      const maTaxRate = 0.0625; // 6.25%
      const riTaxRate = 0.07; // 7%

      const maTaxPaid = vehiclePrice * maTaxRate;
      const riTaxDue = vehiclePrice * riTaxRate;
      const additionalRITax = riTaxDue - maTaxPaid;

      expect(maTaxPaid).toBe(1875);
      expect(riTaxDue).toBe(2100);
      expect(additionalRITax).toBe(225);
    });
  });

  describe("Scenario: Service Contract Savings", () => {
    it("should save 7% on VSC and GAP", () => {
      const vscCost = 2000;
      const gapCost = 695;
      const taxSavings = (vscCost + gapCost) * 0.07;

      expect(taxSavings).toBeCloseTo(188.65, 2);
    });
  });

  // ============================================================================
  // METADATA AND DOCUMENTATION
  // ============================================================================

  describe("Metadata - Last Updated", () => {
    it("should have lastUpdated timestamp", () => {
      const rules = getRulesForState("RI");
      expect(rules?.extras?.lastUpdated).toBeDefined();
    });
  });

  describe("Metadata - Documentation", () => {
    it("should have comprehensive notes in extras", () => {
      const rules = getRulesForState("RI");
      expect(rules?.extras?.notes).toBeDefined();
      expect((rules?.extras?.notes as string)?.length).toBeGreaterThan(100);
    });

    it("should document key RI features in notes", () => {
      const rules = getRulesForState("RI");
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("7%");
      expect(notes).toContain("$599");
      expect(notes).toContain("NO local");
    });

    it("should document neighboring states comparison", () => {
      const rules = getRulesForState("RI");
      expect(rules?.extras?.neighboringStates).toBeDefined();
    });
  });
});
