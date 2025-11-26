import type { TaxRulesConfig } from "../types";

/**
 * CALIFORNIA TAX RULES
 *
 * Researched: 2025-01
 * Version: 1
 *
 * KEY FACTS:
 * - Base state sales tax: 7.25% (highest state base rate in US)
 * - Local rates: Yes, varies by district (total can reach 10.75%+ in high-tax areas)
 * - Trade-in credit: FULL (deducted from sale price before tax)
 * - Doc fee: Taxable and capped at $85 by law
 * - Manufacturer rebates: NOT taxable (reduce sale price)
 * - Dealer rebates: Taxable (post-rebate price still taxed)
 * - Service contracts & GAP: Taxable on retail, not taxable on leases
 * - Lease taxation: MONTHLY (tax on each payment)
 * - Reciprocity: NO (California does not provide credits for taxes paid elsewhere)
 *
 * SOURCES:
 * - California Department of Tax and Fee Administration (CDTFA)
 * - Regulation 1610 (Motor Vehicle Sales Tax)
 * - Regulation 1660 (Leased Vehicles)
 */
export const US_CA: TaxRulesConfig = {
  stateCode: "CA",
  version: 1,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL
   *
   * California allows full trade-in credit. The trade-in value is deducted
   * from the purchase price before calculating sales tax.
   *
   * Example: $30,000 vehicle - $10,000 trade-in = $20,000 taxable base
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules:
   *
   * - Manufacturer rebates (MFR): NOT taxable - reduce the sale price
   * - Dealer rebates: Taxable - do not reduce the sale price for tax purposes
   *
   * This is standard California treatment per Regulation 1610.
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: false,
      notes: "Manufacturer rebates reduce the purchase price before tax",
    },
    {
      appliesTo: "DEALER",
      taxable: true,
      notes: "Dealer rebates do not reduce the taxable sale price",
    },
  ],

  /**
   * Doc Fee: TAXABLE
   *
   * California doc fees are:
   * 1. Taxable as part of the sale
   * 2. Capped at $85 by state law (as of recent regulations)
   *
   * Dealers cannot charge more than $85 for doc fee in CA.
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules:
   *
   * - Service contracts: TAXABLE on retail
   * - GAP insurance: TAXABLE on retail
   * - Title fee: NOT taxable (government fee)
   * - Registration fee: NOT taxable (government fee)
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: true,
      notes: "Extended warranties and service contracts are taxable on retail sales",
    },
    {
      code: "GAP",
      taxable: true,
      notes: "GAP insurance is taxable on retail sales",
    },
    { code: "TITLE", taxable: false, notes: "DMV title fee is not taxable" },
    { code: "REG", taxable: false, notes: "DMV registration fee is not taxable" },
  ],

  /**
   * Product Taxability:
   *
   * - Accessories: Taxable
   * - Negative equity: Taxable (rolled into financed amount)
   * - Service contracts: Taxable
   * - GAP: Taxable
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: true,
  taxOnServiceContracts: true,
  taxOnGap: true,

  /**
   * Vehicle Tax Scheme: STATE_PLUS_LOCAL
   *
   * California uses a combination of:
   * - State base rate: 7.25%
   * - Local district rates: Varies (0.10% to 3.5%+)
   *
   * Total combined rate can reach 10.75% in high-tax jurisdictions like:
   * - Los Angeles, San Francisco, Oakland, etc.
   *
   * The tax is calculated on the sale location (point of sale), not
   * registration location.
   */
  vehicleTaxScheme: "STATE_PLUS_LOCAL",
  vehicleUsesLocalSalesTax: true,

  // ============================================================================
  // LEASE TRANSACTION RULES
  // ============================================================================

  leaseRules: {
    /**
     * Lease Method: MONTHLY
     *
     * California taxes leases on a MONTHLY basis per Regulation 1660.
     * Sales tax is charged on each monthly lease payment, not on the
     * full capitalized cost upfront.
     */
    method: "MONTHLY",

    /**
     * Cap Cost Reduction: NOT taxed
     *
     * Cap cost reductions (down payments, trade-ins, rebates applied
     * to reduce cap cost) are NOT taxed in California.
     */
    taxCapReduction: false,

    /**
     * Rebate Behavior on Leases: FOLLOW_RETAIL_RULE
     *
     * - Manufacturer rebates reduce cap cost (not taxed)
     * - Dealer rebates do not reduce taxable amount
     */
    rebateBehavior: "FOLLOW_RETAIL_RULE",

    /**
     * Doc Fee on Leases: ALWAYS taxable
     *
     * Doc fees on leases are taxable in California and are typically
     * taxed upfront (capitalized or paid at signing).
     */
    docFeeTaxability: "ALWAYS",

    /**
     * Trade-in Credit on Leases: FULL
     *
     * Trade-ins on leases receive full credit and reduce the cap cost.
     */
    tradeInCredit: "FULL",

    /**
     * Negative Equity on Leases: Taxable
     *
     * Negative equity rolled into a lease increases the cap cost and
     * increases monthly payments, thus increasing tax paid monthly.
     */
    negativeEquityTaxable: true,

    /**
     * Fee Taxability on Leases:
     *
     * - Doc fee: Taxable (upfront)
     * - Service contracts: NOT taxable (when added to cap cost)
     * - GAP: NOT taxable (when added to cap cost)
     * - Title: Not taxable
     * - Registration: Not taxable
     *
     * Backend products (VSC, GAP) are typically NOT taxed when
     * capitalized into a lease in California.
     */
    feeTaxRules: [
      { code: "DOC_FEE", taxable: true, notes: "Doc fee taxed upfront" },
      {
        code: "SERVICE_CONTRACT",
        taxable: false,
        notes: "Service contracts not taxed when capitalized into lease",
      },
      {
        code: "GAP",
        taxable: false,
        notes: "GAP not taxed when capitalized into lease",
      },
      { code: "TITLE", taxable: false },
      { code: "REG", taxable: false },
    ],

    /**
     * Title Fee Rules on Leases:
     *
     * Title fees are:
     * - Not taxable
     * - Included in cap cost
     * - Paid upfront (or capitalized)
     * - Not included in monthly payment calculation
     */
    titleFeeRules: [
      {
        code: "TITLE",
        taxable: false,
        includedInCapCost: true,
        includedInUpfront: true,
        includedInMonthly: false,
      },
    ],

    /**
     * Tax Fees Upfront: TRUE
     *
     * Fees that are taxable on leases (like doc fee) are taxed upfront,
     * not spread across monthly payments.
     */
    taxFeesUpfront: true,

    /**
     * Special Scheme: NONE
     *
     * California uses standard monthly lease taxation with no special
     * schemes or surcharges.
     */
    specialScheme: "NONE",

    notes:
      "California lease taxation: Monthly payment method per Regulation 1660. " +
      "Backend products (VSC, GAP) are not taxed when capitalized. " +
      "Doc fee is taxed upfront. Trade-in gets full credit reducing cap cost.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: NOT ENABLED
   *
   * California does NOT provide reciprocity credits for sales tax paid
   * in other states. Vehicles purchased out-of-state and brought to CA
   * for registration must pay CA use tax on the full purchase price,
   * regardless of tax paid elsewhere.
   *
   * This is one of the strictest reciprocity policies in the US.
   */
  reciprocity: {
    enabled: false,
    scope: "BOTH",
    homeStateBehavior: "NONE",
    requireProofOfTaxPaid: false,
    basis: "TAX_PAID",
    capAtThisStatesTax: false,
    hasLeaseException: false,
    notes:
      "California does not provide reciprocity credits. Out-of-state purchases " +
      "owe full CA use tax regardless of tax paid elsewhere.",
  },

  extras: {
    lastUpdated: "2025-01",
    sources: [
      "California Department of Tax and Fee Administration (CDTFA)",
      "Regulation 1610 - Sales of Motor Vehicles",
      "Regulation 1660 - Leased Vehicles",
    ],
    notes:
      "California has one of the highest base sales tax rates (7.25%) and " +
      "combined rates can exceed 10.75% in certain districts. Doc fees are " +
      "capped at $85 by law. No reciprocity for out-of-state taxes.",
    docFeeCapAmount: 85,
    maxCombinedRate: 10.75,
  },
};

export default US_CA;
