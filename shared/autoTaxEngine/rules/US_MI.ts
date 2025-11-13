import { TaxRulesConfig } from "../types";

/**
 * MICHIGAN TAX RULES
 *
 * Retail:
 * - 6% flat state sales tax (STATE_ONLY)
 * - Trade-in credit CAPPED at vehicle price (cannot create negative base)
 * - Manufacturer rebates non-taxable
 * - Doc fee taxable
 * - Title/registration fees non-taxable
 *
 * Lease:
 * - MONTHLY taxation (tax on each payment)
 * - Use tax applies to lease payments
 * - Trade-in credit applies like retail (with cap)
 * - Doc fee taxed upfront
 */
const MI_RULES: TaxRulesConfig = {
  stateCode: "MI",
  version: 1,

  // ---- Retail Side ----
  tradeInPolicy: { type: "FULL" }, // Full credit but cannot exceed vehicle price
  rebates: [
    { appliesTo: "MANUFACTURER", taxable: false },
    { appliesTo: "DEALER", taxable: false },
  ],
  docFeeTaxable: true,
  feeTaxRules: [
    { code: "SERVICE_CONTRACT", taxable: true },
    { code: "GAP", taxable: true },
    { code: "TITLE", taxable: false },
    { code: "REG", taxable: false },
    { code: "PLATE_FEE", taxable: false },
  ],
  taxOnAccessories: true,
  taxOnNegativeEquity: true,
  taxOnServiceContracts: true,
  taxOnGap: true,
  vehicleTaxScheme: "STATE_ONLY",
  vehicleUsesLocalSalesTax: false,

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
      { code: "SERVICE_CONTRACT", taxable: false },
      { code: "GAP", taxable: false },
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
    taxFeesUpfront: true,
    specialScheme: "NONE",
    notes:
      "Michigan: 6% use tax on monthly lease payments. Trade-in credit applies but capped at vehicle price (no negative taxable base).",
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
    flatSalesTaxRate: 0.06,
    description: "Michigan uses flat 6% sales/use tax with no local additions for vehicles",
    tradeInCapNote: "Trade-in credit cannot exceed vehicle price",
  },
};

export default MI_RULES;
