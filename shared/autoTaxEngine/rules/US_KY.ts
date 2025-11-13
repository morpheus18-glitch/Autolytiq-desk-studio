import { TaxRulesConfig } from "../types";

/**
 * KENTUCKY TAX RULES
 *
 * Retail:
 * - 6% state motor vehicle usage tax (STATE_ONLY)
 * - Full trade-in credit
 * - Rebates non-taxable (both manufacturer and dealer treated same)
 * - Doc fee taxable
 * - Title/registration fees non-taxable
 *
 * Lease:
 * - MONTHLY taxation (tax on each payment)
 * - 6% usage tax on lease payments
 * - Trade-in credit applies
 * - Doc fee taxed upfront
 */
const KY_RULES: TaxRulesConfig = {
  stateCode: "KY",
  version: 1,

  // ---- Retail Side ----
  tradeInPolicy: { type: "FULL" },
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
    { code: "CLERK_FEE", taxable: false },
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
      "Kentucky: 6% motor vehicle usage tax on monthly lease payments. Trade-in credit applies like retail.",
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
    flatUsageTaxRate: 0.06,
    description: "Kentucky uses 6% motor vehicle usage tax (state only, no local)",
  },
};

export default KY_RULES;
