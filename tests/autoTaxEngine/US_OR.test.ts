import { describe, it, expect } from "vitest";
import { getRulesForState, isStateImplemented } from "../../shared/autoTaxEngine";

describe("Oregon Tax Rules Configuration", () => {
  it("should load Oregon rules successfully", () => {
    const rules = getRulesForState("OR");
    expect(rules).toBeDefined();
    expect(rules?.stateCode).toBe("OR");
  });

  it("should mark Oregon as implemented (not a stub)", () => {
    expect(isStateImplemented("OR")).toBe(true);
  });

  it("should have correct version number", () => {
    const rules = getRulesForState("OR");
    expect(rules?.version).toBe(1);
  });

  // ===========================
  // RETAIL SALES TAX RULES
  // ===========================

  it("should have NO trade-in policy (Oregon has no sales tax)", () => {
    const rules = getRulesForState("OR");
    expect(rules?.tradeInPolicy.type).toBe("NONE");
  });

  it("should have non-taxable rebates (Oregon has no sales tax)", () => {
    const rules = getRulesForState("OR");
    expect(rules?.rebates).toHaveLength(2);

    // Manufacturer rebate should be non-taxable (N/A for Oregon)
    const mfrRebate = rules?.rebates.find((r) => r.appliesTo === "MANUFACTURER");
    expect(mfrRebate?.taxable).toBe(false);

    // Dealer rebate should be non-taxable (N/A for Oregon)
    const dealerRebate = rules?.rebates.find((r) => r.appliesTo === "DEALER");
    expect(dealerRebate?.taxable).toBe(false);
  });

  it("should mark doc fee as NOT taxable (Oregon has no sales tax)", () => {
    const rules = getRulesForState("OR");
    expect(rules?.docFeeTaxable).toBe(false);
  });

  it("should have correct fee tax rules (all non-taxable)", () => {
    const rules = getRulesForState("OR");

    // Service contracts should be non-taxable
    const serviceContract = rules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
    expect(serviceContract?.taxable).toBe(false);

    // GAP should be non-taxable
    const gap = rules?.feeTaxRules.find((r) => r.code === "GAP");
    expect(gap?.taxable).toBe(false);

    // Title should be non-taxable
    const title = rules?.feeTaxRules.find((r) => r.code === "TITLE");
    expect(title?.taxable).toBe(false);

    // Registration should be non-taxable
    const reg = rules?.feeTaxRules.find((r) => r.code === "REG");
    expect(reg?.taxable).toBe(false);

    // Plate fee should be non-taxable
    const plateFee = rules?.feeTaxRules.find((r) => r.code === "PLATE_FEE");
    expect(plateFee?.taxable).toBe(false);

    // VIN inspection should be non-taxable
    const vinInspection = rules?.feeTaxRules.find((r) => r.code === "VIN_INSPECTION");
    expect(vinInspection?.taxable).toBe(false);
  });

  it("should NOT tax accessories, negative equity, service contracts, or GAP", () => {
    const rules = getRulesForState("OR");
    expect(rules?.taxOnAccessories).toBe(false);
    expect(rules?.taxOnNegativeEquity).toBe(false);
    expect(rules?.taxOnServiceContracts).toBe(false);
    expect(rules?.taxOnGap).toBe(false);
  });

  it("should use STATE_ONLY vehicle tax scheme", () => {
    const rules = getRulesForState("OR");
    expect(rules?.vehicleTaxScheme).toBe("STATE_ONLY");
    expect(rules?.vehicleUsesLocalSalesTax).toBe(false);
  });

  // ===========================
  // LEASE TAX RULES
  // ===========================

  it("should have correct lease rules configuration", () => {
    const rules = getRulesForState("OR");
    const leaseRules = rules?.leaseRules;

    expect(leaseRules?.method).toBe("MONTHLY");
    expect(leaseRules?.taxCapReduction).toBe(false); // NOT taxed (no sales tax)
    expect(leaseRules?.rebateBehavior).toBe("FOLLOW_RETAIL_RULE");
    expect(leaseRules?.docFeeTaxability).toBe("NEVER"); // NOT taxable
    expect(leaseRules?.tradeInCredit).toBe("NONE"); // N/A
    expect(leaseRules?.negativeEquityTaxable).toBe(false); // NOT taxed
    expect(leaseRules?.taxFeesUpfront).toBe(false); // No tax on fees
    expect(leaseRules?.specialScheme).toBe("NONE");
  });

  it("should have non-taxable backend products on leases", () => {
    const rules = getRulesForState("OR");
    const leaseRules = rules?.leaseRules;

    // Doc fee should be non-taxable on leases
    const docFee = leaseRules?.feeTaxRules.find((r) => r.code === "DOC_FEE");
    expect(docFee?.taxable).toBe(false);

    // Service contracts should be non-taxable on leases
    const serviceContract = leaseRules?.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT");
    expect(serviceContract?.taxable).toBe(false);

    // GAP should be non-taxable on leases
    const gap = leaseRules?.feeTaxRules.find((r) => r.code === "GAP");
    expect(gap?.taxable).toBe(false);
  });

  it("should have title and registration as non-taxable on leases", () => {
    const rules = getRulesForState("OR");
    const leaseRules = rules?.leaseRules;

    const title = leaseRules?.feeTaxRules.find((r) => r.code === "TITLE");
    expect(title?.taxable).toBe(false);

    const reg = leaseRules?.feeTaxRules.find((r) => r.code === "REG");
    expect(reg?.taxable).toBe(false);
  });

  it("should have correct title fee rules for leases", () => {
    const rules = getRulesForState("OR");
    const leaseRules = rules?.leaseRules;

    const titleRule = leaseRules?.titleFeeRules.find((r) => r.code === "TITLE");
    expect(titleRule).toBeDefined();
    expect(titleRule?.taxable).toBe(false);
    expect(titleRule?.includedInCapCost).toBe(true);
    expect(titleRule?.includedInUpfront).toBe(true);
    expect(titleRule?.includedInMonthly).toBe(false);
  });

  // ===========================
  // RECIPROCITY RULES
  // ===========================

  it("should have reciprocity enabled with full credit", () => {
    const rules = getRulesForState("OR");
    expect(rules?.reciprocity.enabled).toBe(true);
    expect(rules?.reciprocity.scope).toBe("RETAIL_ONLY");
    expect(rules?.reciprocity.homeStateBehavior).toBe("CREDIT_FULL");
    expect(rules?.reciprocity.requireProofOfTaxPaid).toBe(true);
    expect(rules?.reciprocity.basis).toBe("TAX_PAID");
    expect(rules?.reciprocity.capAtThisStatesTax).toBe(true);
    expect(rules?.reciprocity.hasLeaseException).toBe(true);
  });

  it("should have reciprocity overrides for no-sales-tax states", () => {
    const rules = getRulesForState("OR");
    const overrides = rules?.reciprocity.overrides;

    expect(overrides).toBeDefined();
    expect(overrides?.length).toBeGreaterThan(0);

    // Check for AK override
    const akOverride = overrides?.find((o) => o.originState === "AK");
    expect(akOverride).toBeDefined();
    expect(akOverride?.disallowCredit).toBe(false);

    // Check for DE override
    const deOverride = overrides?.find((o) => o.originState === "DE");
    expect(deOverride).toBeDefined();
    expect(deOverride?.disallowCredit).toBe(false);

    // Check for MT override
    const mtOverride = overrides?.find((o) => o.originState === "MT");
    expect(mtOverride).toBeDefined();
    expect(mtOverride?.disallowCredit).toBe(false);

    // Check for NH override
    const nhOverride = overrides?.find((o) => o.originState === "NH");
    expect(nhOverride).toBeDefined();
    expect(nhOverride?.disallowCredit).toBe(false);
  });

  // ===========================
  // EXTRAS METADATA
  // ===========================

  it("should have extras metadata with 'no sales tax' flag", () => {
    const rules = getRulesForState("OR");
    expect(rules?.extras).toBeDefined();
    expect(rules?.extras?.noSalesTax).toBe(true);
    expect(rules?.extras?.description).toContain("Oregon");
    expect(rules?.extras?.description).toContain("NO general sales tax");
  });

  it("should have Vehicle Privilege Tax (VPT) metadata", () => {
    const rules = getRulesForState("OR");
    const vpt = rules?.extras?.vehiclePrivilegeTax;

    expect(vpt).toBeDefined();
    expect(vpt?.rate).toBe(0.005); // 0.5%
    expect(vpt?.appliesTo).toContain("Oregon dealer");
    expect(vpt?.taxpayer).toContain("Dealer");
    expect(vpt?.criteria).toBeDefined();
    expect(vpt?.criteria?.odometer).toContain("7,500");
    expect(vpt?.criteria?.gvwr).toContain("26,000");
  });

  it("should have Vehicle Use Tax (VUT) metadata", () => {
    const rules = getRulesForState("OR");
    const vut = rules?.extras?.vehicleUseTax;

    expect(vut).toBeDefined();
    expect(vut?.rate).toBe(0.005); // 0.5%
    expect(vut?.appliesTo).toContain("Out-of-state");
    expect(vut?.taxpayer).toBe("Purchaser");
    expect(vut?.dueWithin).toContain("30 days");
    expect(vut?.creditForOutOfStateTax).toContain("Dollar-for-dollar");
    expect(vut?.criteria).toBeDefined();
    expect(vut?.criteria?.odometer).toContain("7,500");
    expect(vut?.criteria?.gvwr).toContain("26,000");
  });

  it("should have doc fee cap metadata", () => {
    const rules = getRulesForState("OR");
    const docFeeCap = rules?.extras?.docFeeCap;

    expect(docFeeCap).toBeDefined();
    expect(docFeeCap?.withIntegrator).toBe(250);
    expect(docFeeCap?.withoutIntegrator).toBe(200);
    expect(docFeeCap?.notes).toContain("Integrator");
  });

  // eslint-disable-next-line complexity -- optional chaining counted as branches
  it("should have title fee metadata with current and new rates", () => {
    const rules = getRulesForState("OR");
    const titleFees = rules?.extras?.titleFees;

    expect(titleFees).toBeDefined();
    expect(titleFees?.currentRates).toContain("December 30, 2025");
    expect(titleFees?.newRates).toContain("December 31, 2025");

    // Check current rates
    expect(titleFees?.passenger_0_19_mpg?.current).toBe(101);
    expect(titleFees?.passenger_20_39_mpg?.current).toBe(106);
    expect(titleFees?.passenger_40_plus_mpg?.current).toBe(116);
    expect(titleFees?.electric?.current).toBe(192);

    // Check new rates (Dec 31, 2025)
    expect(titleFees?.passenger_0_19_mpg?.new).toBe(240);
    expect(titleFees?.passenger_20_39_mpg?.new).toBe(245);
    expect(titleFees?.passenger_40_plus_mpg?.new).toBe(255);
    expect(titleFees?.electric?.new).toBe(331);
  });

  // eslint-disable-next-line complexity -- optional chaining counted as branches
  it("should have registration fee metadata with current and new rates", () => {
    const rules = getRulesForState("OR");
    const regFees = rules?.extras?.registrationFees;

    expect(regFees).toBeDefined();
    expect(regFees?.period).toBe("Two years");
    expect(regFees?.currentRates).toContain("December 30, 2025");
    expect(regFees?.newRates).toContain("December 31, 2025");

    // Check current rates
    expect(regFees?.passenger_0_19_mpg?.current).toBe(126);
    expect(regFees?.passenger_20_39_mpg?.current).toBe(136);
    expect(regFees?.passenger_40_plus_mpg?.current).toBe(156);
    expect(regFees?.electric?.current).toBe(316);
    expect(regFees?.motorcycles_mopeds?.current).toBe(88);

    // Check new rates (Dec 31, 2025)
    expect(regFees?.passenger_0_19_mpg?.new).toBe(210);
    expect(regFees?.passenger_20_39_mpg?.new).toBe(220);
    expect(regFees?.passenger_40_plus_mpg?.new).toBe(300);
    expect(regFees?.electric?.new).toBe(460);
    expect(regFees?.motorcycles_mopeds?.new).toBe(172);
  });

  it("should have county fee metadata", () => {
    const rules = getRulesForState("OR");
    const countyFees = rules?.extras?.countyFees;

    expect(countyFees).toBeDefined();
    expect(countyFees?.multnomah).toBe(112);
    expect(countyFees?.washington).toBe(60);
    expect(countyFees?.clackamas).toBe(60);
    expect(countyFees?.notes).toContain("counties");
  });

  it("should have OReGO program metadata", () => {
    const rules = getRulesForState("OR");
    const orego = rules?.extras?.oregoProgram;

    expect(orego).toBeDefined();
    expect(orego?.name).toContain("Road Usage Charge");
    expect(orego?.eligibility).toContain("Electric");
    expect(orego?.rate).toContain("$0.02");
    expect(orego?.benefit).toContain("$460 to $86");
    expect(orego?.enrollment).toBe("Voluntary");
  });

  it("should have non-resident exemption metadata", () => {
    const rules = getRulesForState("OR");
    const nonResident = rules?.extras?.nonResidentExemption;

    expect(nonResident).toBeDefined();
    expect(nonResident?.exempt).toBe(true);
    expect(nonResident?.notes).toContain("Non-resident");
  });

  it("should have lease use tax metadata", () => {
    const rules = getRulesForState("OR");
    const leaseUseTax = rules?.extras?.leaseUseTax;

    expect(leaseUseTax).toBeDefined();
    expect(leaseUseTax?.appliesTo).toContain("Lessor");
    expect(leaseUseTax?.rate).toBe(0.005); // 0.5%
    expect(leaseUseTax?.base).toContain("Retail price");
    expect(leaseUseTax?.passedToLessee).toContain("absorbed");
    expect(leaseUseTax?.notes).toContain("does not tax monthly lease payments");
  });

  it("should have reciprocity notes explaining credit mechanics", () => {
    const rules = getRulesForState("OR");
    const reciprocityNotes = rules?.extras?.reciprocityNotes;

    expect(reciprocityNotes).toBeDefined();
    expect(reciprocityNotes).toContain("full reciprocity");
    expect(reciprocityNotes).toContain("out-of-state tax");
    expect(reciprocityNotes).toContain("VUT = $0");
  });

  it("should have implementation notes", () => {
    const rules = getRulesForState("OR");
    const implNotes = rules?.extras?.implementationNotes;

    expect(implNotes).toBeDefined();
    expect(implNotes).toContain("no sales tax");
    expect(implNotes).toContain("0.5%");
    expect(implNotes).toContain("Dec 31, 2025");
  });

  // ===========================
  // CASE-INSENSITIVE LOOKUP
  // ===========================

  it("should handle case-insensitive state code lookup", () => {
    const rulesUpper = getRulesForState("OR");
    const rulesLower = getRulesForState("or");
    const rulesMixed = getRulesForState("Or");

    expect(rulesUpper).toBeDefined();
    expect(rulesLower).toBeDefined();
    expect(rulesMixed).toBeDefined();
    expect(rulesUpper?.stateCode).toBe("OR");
    expect(rulesLower?.stateCode).toBe("OR");
    expect(rulesMixed?.stateCode).toBe("OR");
  });

  // ===========================
  // COMPREHENSIVE VALIDATION
  // ===========================

  // eslint-disable-next-line complexity -- optional chaining counted as branches
  it("should have all required configuration properties", () => {
    const rules = getRulesForState("OR");

    // Top-level required properties
    expect(rules?.stateCode).toBe("OR");
    expect(rules?.version).toBeGreaterThanOrEqual(1);
    expect(rules?.tradeInPolicy).toBeDefined();
    expect(rules?.rebates).toBeDefined();
    expect(rules?.docFeeTaxable).toBeDefined();
    expect(rules?.feeTaxRules).toBeDefined();
    expect(rules?.taxOnAccessories).toBeDefined();
    expect(rules?.taxOnNegativeEquity).toBeDefined();
    expect(rules?.taxOnServiceContracts).toBeDefined();
    expect(rules?.taxOnGap).toBeDefined();
    expect(rules?.vehicleTaxScheme).toBeDefined();
    expect(rules?.vehicleUsesLocalSalesTax).toBeDefined();

    // Lease rules required properties
    expect(rules?.leaseRules).toBeDefined();
    expect(rules?.leaseRules.method).toBeDefined();
    expect(rules?.leaseRules.taxCapReduction).toBeDefined();
    expect(rules?.leaseRules.rebateBehavior).toBeDefined();
    expect(rules?.leaseRules.docFeeTaxability).toBeDefined();
    expect(rules?.leaseRules.tradeInCredit).toBeDefined();
    expect(rules?.leaseRules.negativeEquityTaxable).toBeDefined();
    expect(rules?.leaseRules.feeTaxRules).toBeDefined();
    expect(rules?.leaseRules.titleFeeRules).toBeDefined();
    expect(rules?.leaseRules.taxFeesUpfront).toBeDefined();
    expect(rules?.leaseRules.specialScheme).toBeDefined();

    // Reciprocity required properties
    expect(rules?.reciprocity).toBeDefined();
    expect(rules?.reciprocity.enabled).toBeDefined();
    expect(rules?.reciprocity.scope).toBeDefined();
    expect(rules?.reciprocity.homeStateBehavior).toBeDefined();
    expect(rules?.reciprocity.requireProofOfTaxPaid).toBeDefined();
    expect(rules?.reciprocity.basis).toBeDefined();
    expect(rules?.reciprocity.capAtThisStatesTax).toBeDefined();
    expect(rules?.reciprocity.hasLeaseException).toBeDefined();

    // Extras
    expect(rules?.extras).toBeDefined();
  });

  // eslint-disable-next-line complexity -- optional chaining counted as branches
  it("should be a fully implemented state (not a stub)", () => {
    const rules = getRulesForState("OR");

    // Verify it's not a stub by checking for stub indicators
    expect(rules?.extras?.status).not.toBe("STUB");
    expect(rules?.extras?.needsResearch).not.toBe(true);

    // Verify comprehensive implementation
    expect(rules?.extras?.noSalesTax).toBe(true);
    expect(rules?.extras?.vehiclePrivilegeTax).toBeDefined();
    expect(rules?.extras?.vehicleUseTax).toBeDefined();
    expect(rules?.extras?.docFeeCap).toBeDefined();
    expect(rules?.extras?.titleFees).toBeDefined();
    expect(rules?.extras?.registrationFees).toBeDefined();
    expect(rules?.extras?.countyFees).toBeDefined();
    expect(rules?.extras?.oregoProgram).toBeDefined();
    expect(rules?.extras?.nonResidentExemption).toBeDefined();
    expect(rules?.extras?.leaseUseTax).toBeDefined();
  });
});
