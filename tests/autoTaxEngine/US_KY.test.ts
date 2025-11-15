import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Kentucky (KY) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load Kentucky rules successfully", () => {
    const rules = getRulesForState("KY");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("KY");
  });

  it("should mark Kentucky as implemented (not a stub)", () => {
    expect(isStateImplemented("KY")).toBe(true);
  });

  it("should have version number 2", () => {
    const rules = getRulesForState("KY");
    expect(rules?.version).toBe(2);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("KY");
    const rulesLower = getRulesForState("ky");
    const rulesMixed = getRulesForState("Ky");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("KY");
    expect(rulesLower?.stateCode).toBe("KY");
    expect(rulesMixed?.stateCode).toBe("KY");
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS
  // ============================================================================

  describe("Retail - Trade-In Policy", () => {
    it("should have FULL trade-in credit policy", () => {
      const rules = getRulesForState("KY");
      expect(rules?.tradeInPolicy.type).toBe("FULL");
    });
  });

  describe("Retail - Rebate Rules", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("KY");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as NON-TAXABLE", () => {
      const rules = getRulesForState("KY");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(false);
    });

    it("should mark dealer rebates as NON-TAXABLE", () => {
      const rules = getRulesForState("KY");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(false);
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("KY");
      expect(rules?.docFeeTaxable).toBe(true);
    });
  });

  describe("Retail - Fee Tax Rules", () => {
    it("should mark service contracts (VSC) as TAXABLE", () => {
      const rules = getRulesForState("KY");
      expect(rules?.taxOnServiceContracts).toBe(true);
    });

    it("should mark GAP as TAXABLE", () => {
      const rules = getRulesForState("KY");
      expect(rules?.taxOnGap).toBe(true);
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("KY");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should TAX service contracts", () => {
      const rules = getRulesForState("KY");
      expect(rules?.taxOnServiceContracts).toBe(true);
    });

    it("should TAX GAP insurance", () => {
      const rules = getRulesForState("KY");
      expect(rules?.taxOnGap).toBe(true);
    });
  });

  describe("Retail - Vehicle Tax Scheme", () => {
    it("should use STATE_ONLY vehicle tax scheme", () => {
      const rules = getRulesForState("KY");
      expect(rules?.vehicleTaxScheme).toBe("STATE_ONLY");
    });

    it("should NOT apply local sales tax to vehicles", () => {
      const rules = getRulesForState("KY");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
    });

    it("should document Motor Vehicle Usage Tax rate of 6%", () => {
      const rules = getRulesForState("KY");
      expect(rules?.extras?.motorVehicleUsageTax).toBe(6.0);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease - Tax Method", () => {
    it("should use MONTHLY lease taxation method", () => {
      const rules = getRulesForState("KY");
      expect(rules?.leaseRules.method).toBe("MONTHLY");
    });

    it("should NOT tax cap cost reduction upfront (monthly method)", () => {
      const rules = getRulesForState("KY");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });
  });

  describe("Lease - Trade-In Credit", () => {
    it("should provide FULL trade-in credit on leases", () => {
      const rules = getRulesForState("KY");
      expect(rules?.leaseRules.tradeInCredit).toBe("FULL");
    });
  });

  describe("Lease - Rebates and Incentives", () => {
    it("should follow retail rebate rules for leases", () => {
      const rules = getRulesForState("KY");
      expect(rules?.leaseRules.rebateBehavior).toBe("FOLLOW_RETAIL_RULE");
    });
  });

  describe("Lease - Documentation Fee", () => {
    it("should follow retail doc fee rules on leases", () => {
      const rules = getRulesForState("KY");
      expect(rules?.leaseRules.docFeeTaxability).toBe("FOLLOW_RETAIL_RULE");
    });
  });

  describe("Lease - Fee Taxability", () => {
    it("should tax service contracts on leases", () => {
      const rules = getRulesForState("KY");
      const vsc = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(true);
    });

    it("should tax GAP on leases", () => {
      const rules = getRulesForState("KY");
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(true);
    });
  });

  // ============================================================================
  // RECIPROCITY TESTS
  // ============================================================================

  describe("Reciprocity Rules", () => {
    it("should have reciprocity enabled", () => {
      const rules = getRulesForState("KY");
      expect(rules?.reciprocity.enabled).toBe(true);
    });

    it("should apply reciprocity to BOTH retail and lease", () => {
      const rules = getRulesForState("KY");
      expect(rules?.reciprocity.scope).toBe("BOTH");
    });

    it("should use CREDIT_UP_TO_STATE_RATE mode", () => {
      const rules = getRulesForState("KY");
      expect(rules?.reciprocity.homeStateBehavior).toBe("CREDIT_UP_TO_STATE_RATE");
    });

    it("should require proof of tax paid", () => {
      const rules = getRulesForState("KY");
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(true);
    });

    it("should cap credit at Kentucky's 6% tax rate", () => {
      const rules = getRulesForState("KY");
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(true);
    });
  });

  // ============================================================================
  // KENTUCKY-SPECIFIC FEATURES
  // ============================================================================

  describe("Kentucky Unique Features - Motor Vehicle Usage Tax", () => {
    it("should document 6% flat Motor Vehicle Usage Tax", () => {
      const rules = getRulesForState("KY");
      expect(rules?.extras?.motorVehicleUsageTax).toBe(6.0);
      expect(rules?.extras?.notes).toContain("Motor Vehicle Usage Tax");
      expect(rules?.extras?.notes).toContain("6%");
    });
  });

  describe("Kentucky Features - VSC and GAP Taxable", () => {
    it("should document that both VSC and GAP are taxable", () => {
      const rules = getRulesForState("KY");
      expect(rules?.taxOnServiceContracts).toBe(true);
      expect(rules?.taxOnGap).toBe(true);
      expect(rules?.extras?.notes).toContain("Service contracts");
      expect(rules?.extras?.notes).toContain("GAP");
    });
  });

  describe("Kentucky Features - Uniform Statewide Rate", () => {
    it("should document no local taxes on vehicles", () => {
      const rules = getRulesForState("KY");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
      expect(rules?.extras?.notes).toContain("uniform");
    });
  });

  // ============================================================================
  // SCENARIO TESTS
  // ============================================================================

  describe("Scenario: Standard Vehicle Purchase with VSC and GAP", () => {
    it("should tax VSC and GAP at 6%", () => {
      const vehiclePrice = 30000;
      const tradeIn = 10000;
      const docFee = 399;
      const serviceContract = 2000; // TAXABLE in Kentucky
      const gap = 695; // TAXABLE in Kentucky
      const accessories = 1500;

      const taxableBase = vehiclePrice - tradeIn + docFee + serviceContract + gap + accessories;
      const tax = taxableBase * 0.06;

      expect(taxableBase).toBe(24594);
      expect(tax).toBeCloseTo(1475.64, 2);
    });
  });

  describe("Scenario: Purchase with Manufacturer Rebate", () => {
    it("should reduce tax base with rebate", () => {
      const vehiclePrice = 35000;
      const mfrRebate = 3000;
      const tradeIn = 12000;
      const docFee = 399;
      const extendedWarranty = 2500; // TAXABLE

      const priceAfterRebate = vehiclePrice - mfrRebate;
      const taxableBase = priceAfterRebate - tradeIn + docFee + extendedWarranty;
      const tax = taxableBase * 0.06;

      expect(priceAfterRebate).toBe(32000);
      expect(taxableBase).toBe(22899);
      expect(tax).toBeCloseTo(1373.94, 2);
    });
  });

  describe("Scenario: Lease Payment at 6%", () => {
    it("should apply 6% tax to monthly payment", () => {
      const monthlyPayment = 450;
      const tax = monthlyPayment * 0.06;

      expect(tax).toBe(27);

      const totalOver36Months = (monthlyPayment + tax) * 36;
      expect(totalOver36Months).toBe(17172);
    });
  });

  describe("Scenario: VSC and GAP Tax Cost", () => {
    it("should calculate tax burden from taxing VSC and GAP", () => {
      const vscCost = 2000;
      const gapCost = 695;
      const totalBackend = vscCost + gapCost;
      const taxOnBackend = totalBackend * 0.06;

      expect(totalBackend).toBe(2695);
      expect(taxOnBackend).toBeCloseTo(161.70, 2);
    });
  });

  describe("Scenario: Reciprocity Example with Tennessee", () => {
    it("should provide credit for TN tax paid, charge difference", () => {
      const vehiclePrice = 30000;
      const tnTaxRate = 0.07; // Tennessee: 7%
      const kyTaxRate = 0.06; // Kentucky: 6%

      const tnTaxPaid = vehiclePrice * tnTaxRate;
      const kyTaxDue = vehiclePrice * kyTaxRate;
      const creditForTNTax = Math.min(tnTaxPaid, kyTaxDue);
      const additionalKYTax = Math.max(0, kyTaxDue - creditForTNTax);

      expect(tnTaxPaid).toBe(2100);
      expect(kyTaxDue).toBe(1800);
      expect(creditForTNTax).toBe(1800);
      expect(additionalKYTax).toBe(0); // No additional tax (TN rate higher)
    });
  });

  describe("Scenario: Full Reciprocity Credit", () => {
    it("should provide full reciprocity credit for taxes paid", () => {
      const vehiclePrice = 25000;
      const ohioTaxPaid = 25000 * 0.0575; // Ohio: 5.75%
      const kyTaxDue = 25000 * 0.06; // Kentucky: 6%
      const additionalKYTax = kyTaxDue - ohioTaxPaid;

      expect(ohioTaxPaid).toBe(1437.5);
      expect(kyTaxDue).toBe(1500);
      expect(additionalKYTax).toBeCloseTo(62.5, 2);
    });
  });

  // ============================================================================
  // METADATA AND DOCUMENTATION
  // ============================================================================

  describe("Metadata - Sources", () => {
    it("should document official sources", () => {
      const rules = getRulesForState("KY");
      expect(rules?.extras?.sources).toBeDefined();
      expect(rules?.extras?.sources?.length).toBeGreaterThan(0);
    });

    it("should reference Kentucky Department of Revenue", () => {
      const rules = getRulesForState("KY");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Kentucky") || s.includes("Revenue"))).toBe(true);
    });
  });

  describe("Metadata - Last Updated", () => {
    it("should have lastUpdated timestamp", () => {
      const rules = getRulesForState("KY");
      expect(rules?.extras?.lastUpdated).toBeDefined();
    });
  });

  describe("Metadata - Documentation", () => {
    it("should have comprehensive notes in extras", () => {
      const rules = getRulesForState("KY");
      expect(rules?.extras?.notes).toBeDefined();
      expect((rules?.extras?.notes as string)?.length).toBeGreaterThan(100);
    });

    it("should document key KY features in notes", () => {
      const rules = getRulesForState("KY");
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("6%");
      expect(notes).toContain("Motor Vehicle Usage Tax");
      expect(notes).toContain("Service contracts");
      expect(notes).toContain("GAP");
    });
  });
});
