import { TaxRulesConfig } from "../types";

/**
 * SOUTH CAROLINA TAX RULES
 *
 * Retail:
 * - Variable state sales tax (5% base + local up to 3%)
 * - BUT: Vehicle IMF (Infrastructure Maintenance Fee) is capped at $500 max
 * - Full trade-in credit
 * - Manufacturer rebates non-taxable
 * - Doc fee taxable (with special cap rules)
 *
 * Lease:
 * - MONTHLY taxation (tax on each payment)
 * - Same IMF cap applies ($500 max)
 * - Trade-in credit applies
 * - Complex local variations
 */
const SC_RULES: TaxRulesConfig = {
  stateCode: "SC",
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
    { code: "IMF", taxable: false }, // Infrastructure Maintenance Fee
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
        code: "IMF",
        taxable: false,
        includedInCapCost: true,
        includedInUpfront: true,
        includedInMonthly: false,
      },
    ],
    taxFeesUpfront: true,
    specialScheme: "NONE",
    notes:
      "South Carolina: Monthly lease taxation. IMF (Infrastructure Maintenance Fee) capped at $500 max. Local rates can stack (5% base + up to 3% local).",
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
    baseSalesTaxRate: 0.05,
    maxLocalRate: 0.03,
    imfCapAmount: 500,
    description:
      "SC has 5% base + local variations. Vehicle IMF capped at $500. Complex local jurisdiction rules.",
  },
};

export default SC_RULES;
