import { TaxRulesConfig } from "../types";

/**
 * INDIANA TAX RULES
 *
 * Retail:
 * - 7% flat state vehicle excise tax (STATE_ONLY)
 * - Full trade-in credit
 * - Manufacturer rebates non-taxable, dealer rebates taxable
 * - Doc fee taxable
 * - Title/registration fees non-taxable
 *
 * Lease:
 * - MONTHLY taxation (tax on each payment)
 * - Trade-in credit applies (full)
 * - Doc fee taxed upfront
 * - Backend products (service contracts, GAP) non-taxable on leases
 * - Negative equity is taxable
 */
const IN_RULES: TaxRulesConfig = {
  stateCode: "IN",
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
    { code: "LIEN", taxable: false },
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
    taxCapReduction: false, // taxable portion reflected via payment
    rebateBehavior: "FOLLOW_RETAIL_RULE",
    docFeeTaxability: "ALWAYS",
    tradeInCredit: "FULL",
    negativeEquityTaxable: true,
    feeTaxRules: [
      { code: "DOC_FEE", taxable: true },
      { code: "SERVICE_CONTRACT", taxable: false }, // non-taxable on leases
      { code: "GAP", taxable: false }, // non-taxable on leases
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
        code: "REG",
        taxable: false,
        includedInCapCost: true,
        includedInUpfront: true,
        includedInMonthly: false,
      },
    ],
    taxFeesUpfront: true,
    specialScheme: "NONE",
    notes:
      "Indiana leases: 7% tax on monthly payment only. Doc fee taxed upfront. Backend products (service contracts, GAP) are non-taxable on leases but taxable on retail.",
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
    notes:
      "Indiana provides credit for tax paid in other states, capped at Indiana's 7% rate. Proof of payment required.",
  },

  extras: {
    flatVehicleTaxRate: 0.07,
    description: "Indiana uses a flat 7% vehicle excise tax with no local additions",
  },
};

export default IN_RULES;
