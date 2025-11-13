import { TaxRulesConfig } from "../types";

/**
 *  TAX RULES - STUB
 * 
 * TODO: Research and implement actual  tax rules
 * 
 * Key questions to answer:
 * 1. Retail: What is the state vehicle tax rate? Are local rates added?
 * 2. Retail: How is trade-in treated? (full credit, capped, none)
 * 3. Retail: Are manufacturer/dealer rebates taxable?
 * 4. Retail: Is doc fee taxable? Service contracts? GAP?
 * 5. Lease: How is lease tax calculated? (monthly, upfront, hybrid)
 * 6. Lease: Does trade-in credit apply to leases?
 * 7. Lease: Are backend products taxable on leases?
 */
const _RULES: TaxRulesConfig = {
  stateCode: "",
  version: 1,

  // ---- Retail Side (STUB - needs research) ----
  tradeInPolicy: { type: "FULL" }, // TODO: Verify
  rebates: [
    { appliesTo: "MANUFACTURER", taxable: false }, // TODO: Verify
    { appliesTo: "DEALER", taxable: false }, // TODO: Verify
  ],
  docFeeTaxable: true, // TODO: Verify
  feeTaxRules: [
    { code: "SERVICE_CONTRACT", taxable: true }, // TODO: Verify
    { code: "GAP", taxable: true }, // TODO: Verify
    { code: "TITLE", taxable: false },
    { code: "REG", taxable: false },
  ],
  taxOnAccessories: true, // TODO: Verify
  taxOnNegativeEquity: true, // TODO: Verify
  taxOnServiceContracts: true, // TODO: Verify
  taxOnGap: true, // TODO: Verify
  vehicleTaxScheme: "STATE_PLUS_LOCAL", // TODO: Verify (could be STATE_ONLY or special)
  vehicleUsesLocalSalesTax: true, // TODO: Verify

  // ---- Lease Side (STUB - needs research) ----
  leaseRules: {
    method: "MONTHLY", // TODO: Verify (could be FULL_UPFRONT or HYBRID)
    taxCapReduction: false, // TODO: Verify
    rebateBehavior: "FOLLOW_RETAIL_RULE", // TODO: Verify
    docFeeTaxability: "FOLLOW_RETAIL_RULE", // TODO: Verify
    tradeInCredit: "FOLLOW_RETAIL_RULE", // TODO: Verify
    negativeEquityTaxable: true, // TODO: Verify
    feeTaxRules: [
      { code: "DOC_FEE", taxable: true }, // TODO: Verify
      { code: "SERVICE_CONTRACT", taxable: false }, // TODO: Verify
      { code: "GAP", taxable: false }, // TODO: Verify
      { code: "TITLE", taxable: false },
      { code: "REG", taxable: false },
    ],
    titleFeeRules: [
      {
        code: "TITLE",
        taxable: false,
        includedInCapCost: true,
        includedInUpfront: true,
        includedInMonthly: false,
      },
    ],
    taxFeesUpfront: true, // TODO: Verify
    specialScheme: "NONE", // TODO: Check for special schemes
    notes: "STUB:  tax rules need detailed research and implementation.",
  },


  // ---- Reciprocity (STUB - needs research) ----
  reciprocity: {
    enabled: false, // TODO: Research if state provides reciprocity
    scope: "BOTH",
    homeStateBehavior: "NONE",
    requireProofOfTaxPaid: false,
    basis: "TAX_PAID",
    capAtThisStatesTax: true,
    hasLeaseException: false,
    notes: "TODO: Research reciprocity rules for this state",
  },

  extras: {
    status: "STUB",
    needsResearch: true,
    description: "Placeholder stub for . Actual rules must be researched.",
  },
};

export default _RULES;
