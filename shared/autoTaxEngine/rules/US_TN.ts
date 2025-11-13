import { TaxRulesConfig } from "../types";

/**
 * TENNESSEE TAX RULES
 *
 * Retail:
 * - 7% state sales tax + local (varies by county, 2-3%)
 * - Single article tax cap: $1,600 for vehicles up to $1,600 or $3,200 for vehicles over $3,200
 * - Full trade-in credit
 * - Manufacturer rebates non-taxable
 * - Doc fee taxable (with cap)
 *
 * Lease:
 * - MONTHLY taxation (tax on each payment)
 * - Same single article cap applies per payment
 * - Trade-in credit applies
 * - Local cap behavior varies by county
 */
const TN_RULES: TaxRulesConfig = {
  stateCode: "TN",
  version: 1,

  // ---- Retail Side ----
  tradeInPolicy: { type: "FULL" },
  rebates: [
    { appliesTo: "MANUFACTURER", taxable: false },
    { appliesTo: "DEALER", taxable: true },
  ],
  docFeeTaxable: true,
  feeTaxRules: [
    { code: "SERVICE_CONTRACT", taxable: true },
    { code: "GAP", taxable: true },
    { code: "TITLE", taxable: false },
    { code: "REG", taxable: false },
    { code: "WHEEL_TAX", taxable: false },
  ],
  taxOnAccessories: true,
  taxOnNegativeEquity: true,
  taxOnServiceContracts: true,
  taxOnGap: true,
  vehicleTaxScheme: "STATE_PLUS_LOCAL",
  vehicleUsesLocalSalesTax: true,

  // ---- Lease Side ----
  leaseRules: {
    method: "MONTHLY",
    taxCapReduction: false,
    rebateBehavior: "FOLLOW_RETAIL_RULE",
    docFeeTaxability: "ALWAYS",
    tradeInCredit: "FULL",
    negativeEquityTaxable: true,
    feeTaxRules: [
      { code: "DOC_FEE", taxable: true },
      { code: "SERVICE_CONTRACT", taxable: true },
      { code: "GAP", taxable: true },
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
      {
        code: "WHEEL_TAX",
        taxable: false,
        includedInCapCost: true,
        includedInUpfront: true,
        includedInMonthly: false,
      },
    ],
    taxFeesUpfront: true,
    specialScheme: "NONE",
    notes:
      "Tennessee: Monthly lease taxation. Single article tax cap applies: state portion capped at $1,600 (vehicles < $1,600) or $3,200 (vehicles > $3,200). Local cap behavior varies by county.",
  },


  // ---- Reciprocity ----
  reciprocity: {
    enabled: true,
    scope: "BOTH",
    homeStateBehavior: "CREDIT_UP_TO_STATE_RATE",
    requireProofOfTaxPaid: true,
    basis: "TAX_PAID",
    capAtThisStatesTax: true,
    hasLeaseException: false,
    notes: "Reciprocity rules need verification. Default: credit up to state rate.",
  },

  extras: {
    stateSalesTaxRate: 0.07,
    typicalLocalRate: 0.0225, // 2.25% average
    singleArticleCapLow: 1600,
    singleArticleCapHigh: 3200,
    description:
      "TN: 7% state + ~2.25% local avg. Single article cap on state portion ($1,600 or $3,200). Local cap rules vary by county.",
  },
};

export default TN_RULES;
