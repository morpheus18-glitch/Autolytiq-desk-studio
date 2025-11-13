import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Indiana Tax Rules Configuration", () => {
  it("should load Indiana rules successfully", () => {
    const rules = getRulesForState("IN");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("IN");
  });

  it("should mark Indiana as implemented (not a stub)", () => {
    expect(isStateImplemented("IN")).toBe(true);
  });

  it("should have correct retail trade-in policy", () => {
    const rules = getRulesForState("IN");
    expect(rules?.tradeInPolicy.type).toBe("FULL");
  });

  it("should have correct rebate rules", () => {
    const rules = getRulesForState("IN");
    expect(rules?.rebates).toHaveLength(2);

    // Manufacturer rebate should be non-taxable
    const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
    expect(mfrRebate?.taxable).toBe(false);

    // Dealer rebate should be taxable
    const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
    expect(dealerRebate?.taxable).toBe(true);
  });

  it("should mark doc fee as taxable", () => {
    const rules = getRulesForState("IN");
    expect(rules?.docFeeTaxable).toBe(true);
  });

  it("should have correct fee tax rules", () => {
    const rules = getRulesForState("IN");

    // Service contracts should be taxable
    const serviceContract = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
    expect(serviceContract?.taxable).toBe(true);

    // GAP should be taxable
    const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
    expect(gap?.taxable).toBe(true);

    // Title should be non-taxable
    const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
    expect(title?.taxable).toBe(false);

    // Registration should be non-taxable
    const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
    expect(reg?.taxable).toBe(false);
  });

  it("should tax accessories, negative equity, service contracts, and GAP", () => {
    const rules = getRulesForState("IN");
    expect(rules?.taxOnAccessories).toBe(true);
    expect(rules?.taxOnNegativeEquity).toBe(true);
    expect(rules?.taxOnServiceContracts).toBe(true);
    expect(rules?.taxOnGap).toBe(true);
  });

  it("should use STATE_ONLY vehicle tax scheme", () => {
    const rules = getRulesForState("IN");
    expect(rules?.vehicleTaxScheme).toBe("STATE_ONLY");
    expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
  });

  it("should have correct lease rules configuration", () => {
    const rules = getRulesForState("IN");
    const leaseRules = rules?.leaseRules;

    expect(leaseRules?.method).toBe("MONTHLY");
    expect(leaseRules?.taxCapReduction).toBe(false);
    expect(leaseRules?.rebateBehavior).toBe("FOLLOW_RETAIL_RULE");
    expect(leaseRules?.docFeeTaxability).toBe("ALWAYS");
    expect(leaseRules?.tradeInCredit).toBe("FULL");
    expect(leaseRules?.negativeEquityTaxable).toBe(true);
    expect(leaseRules?.taxFeesUpfront).toBe(true);
    expect(leaseRules?.specialScheme).toBe("NONE");
  });

  it("should have non-taxable backend products on leases", () => {
    const rules = getRulesForState("IN");
    const leaseRules = rules?.leaseRules;

    // Service contracts should be non-taxable on leases
    const serviceContract = leaseRules?.feeTaxRules.find(
      (r) => r.code === "SERVICE_CONTRACT"
    );
    expect(serviceContract?.taxable).toBe(false);

    // GAP should be non-taxable on leases
    const gap = leaseRules?.feeTaxRules.find((r) => r.code === "GAP");
    expect(gap?.taxable).toBe(false);
  });

  it("should have doc fee taxable on leases", () => {
    const rules = getRulesForState("IN");
    const leaseRules = rules?.leaseRules;

    const docFee = leaseRules?.feeTaxRules.find((r) => r.code === "DOC_FEE");
    expect(docFee?.taxable).toBe(true);
  });

  it("should have title and registration as non-taxable on leases", () => {
    const rules = getRulesForState("IN");
    const leaseRules = rules?.leaseRules;

    const title = leaseRules?.feeTaxRules.find((r) => r.code === "TITLE");
    expect(title?.taxable).toBe(false);

    const reg = leaseRules?.feeTaxRules.find((r) => r.code === "REG");
    expect(reg?.taxable).toBe(false);
  });

  it("should have correct title fee rules for leases", () => {
    const rules = getRulesForState("IN");
    const leaseRules = rules?.leaseRules;

    const titleRule = leaseRules?.titleFeeRules.find((r) => r.code === "TITLE");
    expect(titleRule).toBeDefined();
    expect(titleRule?.taxable).toBe(false);
    expect(titleRule?.includedInCapCost).toBe(true);
    expect(titleRule?.includedInUpfront).toBe(true);
    expect(titleRule?.includedInMonthly).toBe(false);
  });

  it("should have version number", () => {
    const rules = getRulesForState("IN");
    expect(rules?.version).toBe(1);
  });

  it("should have extras metadata", () => {
    const rules = getRulesForState("IN");
    expect(rules?.extras).toBeDefined();
    expect(rules?.extras?.flatVehicleTaxRate).toBe(0.07);
    expect(rules?.extras?.description).toContain("Indiana");
  });

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("IN");
    const rulesLower = getRulesForState("in");
    const rulesMixed = getRulesForState("In");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("IN");
    expect(rulesLower?.stateCode).toBe("IN");
    expect(rulesMixed?.stateCode).toBe("IN");
  });
});
