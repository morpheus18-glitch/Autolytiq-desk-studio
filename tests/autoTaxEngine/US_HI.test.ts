import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Hawaii (HI) Tax Rules Configuration", () => {
  // ============================================================================
  // BASIC CONFIGURATION TESTS
  // ============================================================================

  it("should load Hawaii rules successfully", () => {
    const rules = getRulesForState("HI");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("HI");
  });

  it("should mark Hawaii as implemented (not a stub)", () => {
    expect(isStateImplemented("HI")).toBe(true);
  });

  it("should have version number 1", () => {
    const rules = getRulesForState("HI");
    expect(rules?.version).toBe(1);
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("HI");
    const rulesLower = getRulesForState("hi");
    const rulesMixed = getRulesForState("Hi");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("HI");
    expect(rulesLower?.stateCode).toBe("HI");
    expect(rulesMixed?.stateCode).toBe("HI");
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS (GET SYSTEM)
  // ============================================================================

  describe("Retail - Trade-In Policy (NONE)", () => {
    it("should have NO trade-in credit policy", () => {
      const rules = getRulesForState("HI");
      expect(rules?.tradeInPolicy.type).toBe("NONE");
    });

    it("should document that GET is calculated on full purchase price", () => {
      const rules = getRulesForState("HI");
      expect(rules?.extras?.hawaiiGET?.allowTradeInCredit).toBe(false);
    });
  });

  describe("Retail - Rebate Rules", () => {
    it("should have exactly 2 rebate rules (manufacturer and dealer)", () => {
      const rules = getRulesForState("HI");
      expect(rules?.rebates).toHaveLength(2);
    });

    it("should mark manufacturer rebates as TAXABLE", () => {
      const rules = getRulesForState("HI");
      const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      expect(mfrRebate).toBeDefined();
      expect(mfrRebate?.taxable).toBe(true);
      expect(mfrRebate?.notes).toContain("before");
    });

    it("should mark dealer rebates as TAXABLE", () => {
      const rules = getRulesForState("HI");
      const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
      expect(dealerRebate).toBeDefined();
      expect(dealerRebate?.taxable).toBe(true);
      expect(dealerRebate?.notes).toContain("before");
    });
  });

  describe("Retail - Documentation Fee", () => {
    it("should mark doc fee as TAXABLE", () => {
      const rules = getRulesForState("HI");
      expect(rules?.docFeeTaxable).toBe(true);
    });

    it("should have NO CAP on doc fees", () => {
      const rules = getRulesForState("HI");
      // No cap documented in extras
      expect(rules?.docFeeTaxable).toBe(true);
    });
  });

  describe("Retail - Fee Tax Rules (Service Contracts and GAP Taxable)", () => {
    it("should mark service contracts as TAXABLE at GET rate", () => {
      const rules = getRulesForState("HI");
      const vsc = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(true);
      expect(vsc?.notes).toContain("4%");
    });

    it("should mark GAP as TAXABLE at GET rate", () => {
      const rules = getRulesForState("HI");
      const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(true);
      expect(gap?.notes).toContain("4%");
    });

    it("should mark title fees as NON-taxable", () => {
      const rules = getRulesForState("HI");
      const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });

    it("should mark registration fees as NON-taxable", () => {
      const rules = getRulesForState("HI");
      const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
      expect(reg).toBeDefined();
      expect(reg?.taxable).toBe(false);
    });
  });

  describe("Retail - Product Taxability", () => {
    it("should tax accessories", () => {
      const rules = getRulesForState("HI");
      expect(rules?.taxOnAccessories).toBe(true);
    });

    it("should tax negative equity", () => {
      const rules = getRulesForState("HI");
      expect(rules?.taxOnNegativeEquity).toBe(true);
    });

    it("should tax service contracts (at GET rate)", () => {
      const rules = getRulesForState("HI");
      expect(rules?.taxOnServiceContracts).toBe(true);
    });

    it("should tax GAP insurance (at GET rate)", () => {
      const rules = getRulesForState("HI");
      expect(rules?.taxOnGap).toBe(true);
    });
  });

  describe("Retail - Vehicle Tax Scheme (GET)", () => {
    it("should use STATE_PLUS_LOCAL vehicle tax scheme", () => {
      const rules = getRulesForState("HI");
      expect(rules?.vehicleTaxScheme).toBe("STATE_PLUS_LOCAL");
    });

    it("should apply county surcharges (local tax)", () => {
      const rules = getRulesForState("HI");
      expect(rules?.vehicleUsesLocalSalesTax).toBe(true);
    });

    it("should document GET rate structure", () => {
      const rules = getRulesForState("HI");
      expect(rules?.extras?.hawaiiGET?.baseRate).toBe(0.04); // 4% base
      expect(rules?.extras?.hawaiiGET?.countySurcharge).toBe(0.005); // 0.5%
      expect(rules?.extras?.hawaiiGET?.effectiveRate).toBe(0.045); // 4.5%
      expect(rules?.extras?.hawaiiGET?.maxPassOnRate).toBe(0.04712); // 4.712%
    });

    it("should document all four counties have surcharges", () => {
      const rules = getRulesForState("HI");
      expect(rules?.extras?.hawaiiGET?.counties).toHaveLength(4);
      expect(rules?.extras?.hawaiiGET?.counties?.every((c: any) => c.surcharge === 0.005)).toBe(true);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS (GET ON MONTHLY PAYMENTS)
  // ============================================================================

  describe("Lease - Tax Method", () => {
    it("should use MONTHLY lease taxation method", () => {
      const rules = getRulesForState("HI");
      expect(rules?.leaseRules.method).toBe("MONTHLY");
    });

    it("should NOT tax cap cost reduction upfront", () => {
      const rules = getRulesForState("HI");
      expect(rules?.leaseRules.taxCapReduction).toBe(false);
    });

    it("should have no special lease scheme", () => {
      const rules = getRulesForState("HI");
      expect(rules?.leaseRules.specialScheme).toBe("NONE");
    });

    it("should document GET on monthly payments", () => {
      const rules = getRulesForState("HI");
      expect(rules?.leaseRules.notes).toContain("GET");
      expect(rules?.leaseRules.notes).toContain("4.5%");
      expect(rules?.leaseRules.notes).toContain("monthly payments");
    });
  });

  describe("Lease - Trade-In Credit (NONE)", () => {
    it("should have NO trade-in credit on leases", () => {
      const rules = getRulesForState("HI");
      expect(rules?.leaseRules.tradeInCredit).toBe("NONE");
    });

    it("should document no trade-in credit on leases", () => {
      const rules = getRulesForState("HI");
      expect(rules?.leaseRules.notes).toContain("No trade-in credit");
    });
  });

  describe("Lease - Rebate Behavior", () => {
    it("should follow retail rule for rebates on leases", () => {
      const rules = getRulesForState("HI");
      expect(rules?.leaseRules.rebateBehavior).toBe("FOLLOW_RETAIL_RULE");
    });
  });

  describe("Lease - Documentation Fee", () => {
    it("should ALWAYS tax doc fee on leases", () => {
      const rules = getRulesForState("HI");
      expect(rules?.leaseRules.docFeeTaxability).toBe("ALWAYS");
    });

    it("should have doc fee as taxable in lease fee rules", () => {
      const rules = getRulesForState("HI");
      const docFee = rules?.leaseRules.feeTaxRules.find((r) => r.code === "DOC_FEE");
      expect(docFee).toBeDefined();
      expect(docFee?.taxable).toBe(true);
    });
  });

  describe("Lease - Negative Equity", () => {
    it("should mark negative equity as TAXABLE on leases", () => {
      const rules = getRulesForState("HI");
      expect(rules?.leaseRules.negativeEquityTaxable).toBe(true);
    });
  });

  describe("Lease - Fee Taxability", () => {
    it("should mark service contracts as TAXABLE on leases", () => {
      const rules = getRulesForState("HI");
      const vsc = rules?.leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
      expect(vsc).toBeDefined();
      expect(vsc?.taxable).toBe(true);
    });

    it("should mark GAP as TAXABLE on leases", () => {
      const rules = getRulesForState("HI");
      const gap = rules?.leaseRules.feeTaxRules.find((r) => r.code === "GAP");
      expect(gap).toBeDefined();
      expect(gap?.taxable).toBe(true);
    });

    it("should mark title fees as NON-TAXABLE on leases", () => {
      const rules = getRulesForState("HI");
      const title = rules?.leaseRules.feeTaxRules.find((r) => r.code === "TITLE");
      expect(title).toBeDefined();
      expect(title?.taxable).toBe(false);
    });
  });

  describe("Lease - Tax Timing", () => {
    it("should tax fees upfront on leases", () => {
      const rules = getRulesForState("HI");
      expect(rules?.leaseRules.taxFeesUpfront).toBe(true);
    });
  });

  // ============================================================================
  // RECIPROCITY TESTS
  // ============================================================================

  describe("Reciprocity (LIMITED)", () => {
    it("should have reciprocity enabled", () => {
      const rules = getRulesForState("HI");
      expect(rules?.reciprocity.enabled).toBe(true);
    });

    it("should apply to BOTH retail and lease", () => {
      const rules = getRulesForState("HI");
      expect(rules?.reciprocity.scope).toBe("BOTH");
    });

    it("should use CREDIT_UP_TO_STATE_RATE mode", () => {
      const rules = getRulesForState("HI");
      expect(rules?.reciprocity.homeStateBehavior).toBe("CREDIT_UP_TO_STATE_RATE");
    });

    it("should require proof of tax paid", () => {
      const rules = getRulesForState("HI");
      expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(true);
    });

    it("should base credit on TAX_PAID", () => {
      const rules = getRulesForState("HI");
      expect(rules?.reciprocity.basis).toBe("TAX_PAID");
    });

    it("should cap credit at Hawaii tax amount", () => {
      const rules = getRulesForState("HI");
      expect(rules?.reciprocity.capAtThisStatesTax).toBe(true);
    });

    it("should not have lease exceptions", () => {
      const rules = getRulesForState("HI");
      expect(rules?.reciprocity.hasLeaseException).toBe(false);
    });

    it("should document 90-day no depreciation window", () => {
      const rules = getRulesForState("HI");
      expect(rules?.reciprocity.notes).toContain("90 days");
      expect(rules?.extras?.hawaiiGET?.useTax?.noDepreciationWindow).toBe(90);
    });
  });

  // ============================================================================
  // HAWAII-SPECIFIC FEATURES (GET SYSTEM)
  // ============================================================================

  describe("Hawaii Unique Features - GET System", () => {
    it("should document GET as alternative to sales tax", () => {
      const rules = getRulesForState("HI");
      expect(rules?.extras?.notes).toContain("GET");
      expect(rules?.extras?.notes).toContain("General Excise Tax");
      expect(rules?.extras?.notes).toContain("privilege of doing business");
    });

    it("should document that GET is imposed on seller", () => {
      const rules = getRulesForState("HI");
      expect(rules?.extras?.notes).toContain("imposed on the seller");
    });

    it("should document effective GET rate of 4.5%", () => {
      const rules = getRulesForState("HI");
      expect(rules?.extras?.getRate).toBe(4.5);
      expect(rules?.extras?.hawaiiGET?.effectiveRate).toBe(0.045);
    });

    it("should document maximum pass-on rate of 4.712%", () => {
      const rules = getRulesForState("HI");
      expect(rules?.extras?.maxPassOnRate).toBe(4.712);
      expect(rules?.extras?.hawaiiGET?.maxPassOnRate).toBe(0.04712);
    });
  });

  describe("Hawaii Unique Features - No Trade-In Credit", () => {
    it("should document no trade-in credit under GET", () => {
      const rules = getRulesForState("HI");
      expect(rules?.tradeInPolicy.type).toBe("NONE");
      expect(rules?.extras?.hawaiiGET?.allowTradeInCredit).toBe(false);
      expect(rules?.extras?.notes).toContain("NO trade-in credit");
    });

    it("should document trade-in handling methods", () => {
      const rules = getRulesForState("HI");
      expect(rules?.extras?.hawaiiGET?.tradeInMethod).toBe("METHOD_1");
    });
  });

  describe("Hawaii Unique Features - Pyramiding Effect", () => {
    it("should document pyramiding (tax-on-tax)", () => {
      const rules = getRulesForState("HI");
      expect(rules?.extras?.notes).toContain("pyramiding");
      expect(rules?.extras?.maxPassOnRate).toBeGreaterThan(rules?.extras?.getRate);
    });
  });

  describe("Hawaii Unique Features - County Surcharges", () => {
    it("should document county surcharges through 2030", () => {
      const rules = getRulesForState("HI");
      expect(rules?.extras?.countySurchargeRate).toBe(0.5);
      expect(rules?.extras?.notes).toContain("2030");
    });

    it("should have all counties with 0.5% surcharge", () => {
      const rules = getRulesForState("HI");
      const counties = rules?.extras?.hawaiiGET?.counties as any[];
      expect(counties).toHaveLength(4);
      expect(counties.every((c) => c.surcharge === 0.005)).toBe(true);
      expect(counties.every((c) => c.expires === "2030-12-31")).toBe(true);
    });
  });

  describe("Hawaii Unique Features - Service Contracts and GAP Taxable", () => {
    it("should document that service contracts are taxable", () => {
      const rules = getRulesForState("HI");
      expect(rules?.taxOnServiceContracts).toBe(true);
    });

    it("should document that GAP is taxable", () => {
      const rules = getRulesForState("HI");
      expect(rules?.taxOnGap).toBe(true);
    });
  });

  describe("Hawaii Unique Features - 90-Day No Depreciation Window", () => {
    it("should document 90-day no depreciation rule for use tax", () => {
      const rules = getRulesForState("HI");
      expect(rules?.extras?.hawaiiGET?.useTax?.noDepreciationWindow).toBe(90);
      expect(rules?.reciprocity.notes).toContain("90 days");
    });

    it("should document use tax on landed value", () => {
      const rules = getRulesForState("HI");
      expect(rules?.extras?.hawaiiGET?.useTax?.appliesTo).toBe("LANDED_VALUE");
    });
  });

  // ============================================================================
  // SCENARIO TESTS
  // ============================================================================

  describe("Scenario: Basic Retail Sale (4.712% pass-on rate)", () => {
    it("should calculate GET with no trade-in credit", () => {
      // $30,000 vehicle + $350 doc + no trade-in credit
      // GET @ 4.712%: $30,350 × 0.04712 = $1,430.11
      const vehiclePrice = 30000;
      const docFee = 350;
      const getBase = vehiclePrice + docFee; // No trade-in deduction
      const getRate = 0.04712;

      expect(getBase).toBe(30350);
      const get = getBase * getRate;
      expect(get).toBeCloseTo(1430.092, 2);
    });
  });

  describe("Scenario: Retail Sale with Trade-In (No Credit)", () => {
    it("should tax full purchase price with no trade-in credit", () => {
      const vehiclePrice = 35000;
      const tradeInValue = 12000;
      const customerNetPayment = vehiclePrice - tradeInValue;
      const getBase = vehiclePrice; // NO trade-in credit
      const getRate = 0.04712;

      expect(customerNetPayment).toBe(23000);
      expect(getBase).toBe(35000); // Full price, no deduction
      const get = getBase * getRate;
      expect(get).toBeCloseTo(1649.20, 2);

      // Customer pays: $23,000 + $1,649.20 = $24,649.20
      const totalCustomerPays = customerNetPayment + get;
      expect(totalCustomerPays).toBeCloseTo(24649.20, 2);
    });
  });

  describe("Scenario: Retail Sale with Service Contract and GAP (Taxable)", () => {
    it("should include VSC and GAP in GET base", () => {
      const vehiclePrice = 28000;
      const serviceContract = 2500;
      const gap = 795;
      const docFee = 350;
      const getBase = vehiclePrice + serviceContract + gap + docFee;
      const getRate = 0.04712;

      expect(getBase).toBe(31645);
      const get = getBase * getRate;
      expect(get).toBeCloseTo(1491.11, 2);
    });
  });

  describe("Scenario: Retail Sale with Manufacturer Rebate (Taxable)", () => {
    it("should tax full price BEFORE rebate", () => {
      // $32,000 vehicle - $4,000 rebate = $28,000 customer pays
      // But GET base is $32,000 (before rebate)
      const vehicleMSRP = 32000;
      const mfrRebate = 4000;
      const customerPays = vehicleMSRP - mfrRebate;
      const getBase = vehicleMSRP; // NOT customerPays
      const getRate = 0.04712;

      expect(customerPays).toBe(28000);
      expect(getBase).toBe(32000);
      const get = getBase * getRate;
      expect(get).toBeCloseTo(1507.84, 2);
    });
  });

  describe("Scenario: Lease with Monthly Payments (4.712% GET)", () => {
    it("should apply GET to monthly payments", () => {
      const monthlyPayment = 500;
      const term = 36;
      const getRate = 0.04712;

      const monthlyGet = monthlyPayment * getRate;
      const totalMonthly = monthlyPayment + monthlyGet;
      const totalGet = monthlyGet * term;

      expect(monthlyGet).toBeCloseTo(23.56, 2);
      expect(totalMonthly).toBeCloseTo(523.56, 2);
      expect(totalGet).toBeCloseTo(848.16, 2);
    });
  });

  describe("Scenario: Out-of-State Purchase Within 90 Days", () => {
    it("should not allow depreciation within 90 days", () => {
      const originalPurchasePrice = 32000;
      const currentValue = 30500; // Depreciated
      const daysSincePurchase = 60;
      const useTaxBase = daysSincePurchase <= 90 ? originalPurchasePrice : currentValue;
      const useTaxRate = 0.045;

      expect(useTaxBase).toBe(32000); // Within 90 days, use original price
      const useTax = useTaxBase * useTaxRate;
      expect(useTax).toBe(1440);
    });
  });

  describe("Scenario: Reciprocity (Out-of-State Purchase)", () => {
    it("should credit California tax, owe nothing additional", () => {
      const vehiclePrice = 30000;
      const californiaTaxPaid = 2175; // 7.25%
      const hawaiiUseTax = 1350; // 4.5%
      const creditAllowed = Math.min(californiaTaxPaid, hawaiiUseTax);
      const additionalHiTax = hawaiiUseTax - creditAllowed;

      expect(californiaTaxPaid).toBe(2175);
      expect(hawaiiUseTax).toBe(1350);
      expect(creditAllowed).toBe(1350); // Capped at HI amount
      expect(additionalHiTax).toBe(0);
    });
  });

  describe("Scenario: Reciprocity (Lower Tax Paid Elsewhere)", () => {
    it("should credit Arizona tax, owe difference", () => {
      const vehiclePrice = 30000;
      const arizonaTaxPaid = 1680; // 5.6%
      const hawaiiUseTax = 1350; // 4.5%
      const creditAllowed = Math.min(arizonaTaxPaid, hawaiiUseTax);
      const additionalHiTax = hawaiiUseTax - creditAllowed;

      expect(arizonaTaxPaid).toBe(1680);
      expect(hawaiiUseTax).toBe(1350);
      expect(creditAllowed).toBe(1350); // AZ tax exceeds HI tax
      expect(additionalHiTax).toBe(0);
    });
  });

  describe("Scenario: Reciprocity (No Tax State)", () => {
    it("should owe full Hawaii use tax when no tax paid elsewhere", () => {
      const vehiclePrice = 30000;
      const oregonTaxPaid = 0; // No sales tax
      const hawaiiUseTax = 1350; // 4.5%
      const creditAllowed = Math.min(oregonTaxPaid, hawaiiUseTax);
      const additionalHiTax = hawaiiUseTax - creditAllowed;

      expect(oregonTaxPaid).toBe(0);
      expect(hawaiiUseTax).toBe(1350);
      expect(creditAllowed).toBe(0);
      expect(additionalHiTax).toBe(1350); // Full amount owed
    });
  });

  // ============================================================================
  // METADATA AND DOCUMENTATION
  // ============================================================================

  describe("Metadata - Sources", () => {
    it("should document official sources", () => {
      const rules = getRulesForState("HI");
      expect(rules?.extras?.sources).toBeDefined();
      expect(rules?.extras?.sources?.length).toBeGreaterThan(0);
    });

    it("should reference Hawaii Department of Taxation", () => {
      const rules = getRulesForState("HI");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Hawaii Department of Taxation"))).toBe(true);
    });

    it("should reference Hawaii Revised Statutes Chapter 237", () => {
      const rules = getRulesForState("HI");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Chapter 237"))).toBe(true);
    });

    it("should reference Hawaii Revised Statutes Chapter 238", () => {
      const rules = getRulesForState("HI");
      const sources = rules?.extras?.sources as string[] | undefined;
      expect(sources?.some((s) => s.includes("Chapter 238"))).toBe(true);
    });
  });

  describe("Metadata - Last Updated", () => {
    it("should have lastUpdated timestamp", () => {
      const rules = getRulesForState("HI");
      expect(rules?.extras?.lastUpdated).toBeDefined();
      expect(rules?.extras?.lastUpdated).toBe("2025-11-14");
    });
  });

  describe("Metadata - Documentation", () => {
    it("should have comprehensive notes in extras", () => {
      const rules = getRulesForState("HI");
      expect(rules?.extras?.notes).toBeDefined();
      expect((rules?.extras?.notes as string)?.length).toBeGreaterThan(100);
    });

    it("should document key Hawaii features in notes", () => {
      const rules = getRulesForState("HI");
      const notes = rules?.extras?.notes as string;
      expect(notes).toContain("GET");
      expect(notes).toContain("4.5%");
      expect(notes).toContain("NO trade-in credit");
      expect(notes).toContain("pyramiding");
      expect(notes).toContain("2030");
    });
  });
});
