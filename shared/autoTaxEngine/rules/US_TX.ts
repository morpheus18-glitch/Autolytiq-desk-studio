import type { TaxRulesConfig } from "../types";

/**
 * TEXAS TAX RULES
 *
 * Researched: 2025-01
 * Version: 1
 *
 * KEY FACTS:
 * - Motor vehicle sales tax: 6.25% (state)
 * - Local add-on: Up to 2% additional (total max 8.25%)
 * - Trade-in credit: FULL (deducted from purchase price)
 * - Doc fee: Taxable (no state cap)
 * - Manufacturer rebates: NOT taxable (reduce sale price)
 * - Dealer rebates: Taxable
 * - Service contracts & GAP: NOT taxable (treated as insurance)
 * - Lease taxation: MONTHLY (6.25% state + local on each payment)
 * - Reciprocity: YES (credit for tax paid elsewhere, capped at TX rate)
 *
 * UNIQUE FEATURES:
 * - Texas has a specific motor vehicle sales tax (not general sales tax)
 * - Service contracts and GAP are NOT taxed (unlike many states)
 * - Standard presumptive value system for older vehicles
 * - Reciprocity available with proof of tax paid in other state
 *
 * SOURCES:
 * - Texas Comptroller of Public Accounts
 * - Texas Tax Code Chapter 152 (Motor Vehicle Sales Tax)
 * - Publication 94-116 (Motor Vehicle Tax Guide)
 */
export const US_TX: TaxRulesConfig = {
  stateCode: "TX",
  version: 1,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL
   *
   * Texas allows full trade-in credit. The trade-in allowance is deducted
   * from the purchase price before calculating motor vehicle sales tax.
   *
   * Example: $35,000 vehicle - $12,000 trade-in = $23,000 taxable base
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules:
   *
   * - Manufacturer rebates: NOT taxable - reduce the sale price
   * - Dealer rebates: Taxable - do not reduce the sale price
   *
   * This follows Texas Comptroller guidance on motor vehicle taxation.
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: false,
      notes: "Manufacturer rebates reduce purchase price before tax",
    },
    {
      appliesTo: "DEALER",
      taxable: true,
      notes: "Dealer cash does not reduce taxable sale price",
    },
  ],

  /**
   * Doc Fee: TAXABLE
   *
   * Documentation fees are taxable in Texas as part of the sale.
   * Texas has NO statutory cap on doc fees (unlike CA, FL, NY).
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules:
   *
   * - Service contracts: NOT taxable (treated as insurance)
   * - GAP insurance: NOT taxable
   * - Title fee: NOT taxable (government fee)
   * - Registration fee: NOT taxable (government fee)
   *
   * Texas does NOT tax service contracts or GAP because they are
   * considered insurance products, not tangible personal property.
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: false,
      notes: "Service contracts are not taxable in TX (treated as insurance)",
    },
    {
      code: "GAP",
      taxable: false,
      notes: "GAP insurance is not taxable in TX",
    },
    { code: "TITLE", taxable: false, notes: "Title fee is not taxable" },
    { code: "REG", taxable: false, notes: "Registration fee is not taxable" },
  ],

  /**
   * Product Taxability:
   *
   * - Accessories: Taxable (part of vehicle sale)
   * - Negative equity: Taxable (added to financed amount)
   * - Service contracts: NOT taxable
   * - GAP: NOT taxable
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: true,
  taxOnServiceContracts: false, // TX does NOT tax VSC
  taxOnGap: false, // TX does NOT tax GAP

  /**
   * Vehicle Tax Scheme: STATE_PLUS_LOCAL
   *
   * Texas motor vehicle sales tax:
   * - State rate: 6.25%
   * - Local add-on: Up to 2% (county/city/transit authority)
   * - Maximum combined rate: 8.25%
   *
   * The tax is based on where the vehicle is registered, not where it's sold.
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
     * Texas applies motor vehicle sales tax (6.25% state + local) to
     * each monthly lease payment.
     */
    method: "MONTHLY",

    /**
     * Cap Cost Reduction: NOT taxed
     *
     * Down payments, trade-ins, and rebates that reduce capitalized
     * cost are NOT taxed in Texas.
     */
    taxCapReduction: false,

    /**
     * Rebate Behavior on Leases: FOLLOW_RETAIL_RULE
     *
     * Same as retail:
     * - Manufacturer rebates reduce cap cost (not taxed)
     * - Dealer cash does not reduce taxable payments
     */
    rebateBehavior: "FOLLOW_RETAIL_RULE",

    /**
     * Doc Fee on Leases: ALWAYS taxable
     *
     * Doc fees on leases are taxable, typically taxed upfront
     * when capitalized or paid at signing.
     */
    docFeeTaxability: "ALWAYS",

    /**
     * Trade-in Credit on Leases: FULL
     *
     * Trade-ins receive full credit and reduce the capitalized cost,
     * lowering monthly payments and thus monthly tax.
     */
    tradeInCredit: "FULL",

    /**
     * Negative Equity on Leases: Taxable
     *
     * Negative equity increases cap cost, increases monthly payments,
     * and thus increases tax paid monthly.
     */
    negativeEquityTaxable: true,

    /**
     * Fee Taxability on Leases:
     *
     * - Doc fee: Taxable (upfront)
     * - Service contracts: NOT taxable (insurance product)
     * - GAP: NOT taxable (insurance product)
     * - Title: Not taxable
     * - Registration: Not taxable
     */
    feeTaxRules: [
      { code: "DOC_FEE", taxable: true, notes: "Doc fee taxed upfront on lease" },
      {
        code: "SERVICE_CONTRACT",
        taxable: false,
        notes: "VSC not taxed on leases (insurance)",
      },
      {
        code: "GAP",
        taxable: false,
        notes: "GAP not taxed on leases (insurance)",
      },
      { code: "TITLE", taxable: false },
      { code: "REG", taxable: false },
    ],

    /**
     * Title Fee Rules on Leases:
     *
     * Title processing fees:
     * - Not taxable
     * - Included in cap cost
     * - Paid upfront
     * - Not in monthly payment calculation
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
     * Taxable fees (like doc fee) are taxed upfront on leases.
     */
    taxFeesUpfront: true,

    /**
     * Special Scheme: TX_LEASE_SPECIAL
     *
     * Texas uses the TX_LEASE_SPECIAL scheme which applies the 6.25%
     * state motor vehicle sales tax plus local rates to monthly payments.
     *
     * This is handled by the interpreter.
     */
    specialScheme: "TX_LEASE_SPECIAL",

    notes:
      "Texas lease taxation: 6.25% state + up to 2% local on monthly payments. " +
      "Service contracts and GAP are NOT taxed (insurance products). " +
      "Trade-in reduces cap cost. Doc fee taxed upfront.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: ENABLED (Limited)
   *
   * Texas provides limited reciprocity for motor vehicle sales tax paid
   * in other states:
   *
   * - If you paid sales tax in another state, Texas will give you credit
   * - Credit is capped at the Texas tax rate (you still owe TX tax if
   *   the other state's rate was lower)
   * - Requires proof of tax paid (receipt, registration, etc.)
   * - Applies to both retail and lease transactions
   *
   * Example:
   * - Buy vehicle in Arizona (AZ tax: 5.6%)
   * - Register in Texas (TX tax: 6.25% + local)
   * - Credit: 5.6% (what you paid in AZ)
   * - Owe TX: 0.65% + local (difference)
   */
  reciprocity: {
    enabled: true,
    scope: "BOTH", // Applies to retail and lease
    homeStateBehavior: "CREDIT_UP_TO_STATE_RATE",
    requireProofOfTaxPaid: true,
    basis: "TAX_PAID",
    capAtThisStatesTax: true,
    hasLeaseException: false,
    notes:
      "Texas provides credit for sales tax paid in other states, capped at TX rate. " +
      "Requires proof of tax paid. If other state's rate was lower, you owe the difference.",
  },

  extras: {
    lastUpdated: "2025-01",
    sources: [
      "Texas Comptroller of Public Accounts",
      "Texas Tax Code Chapter 152 - Motor Vehicle Sales Tax",
      "Publication 94-116 - Motor Vehicle Tax Guide",
    ],
    notes:
      "Texas uses a specific motor vehicle sales tax (not general sales tax). " +
      "Service contracts and GAP are NOT taxed (insurance products). " +
      "No cap on doc fees. Reciprocity available with proof.",
    maxCombinedRate: 8.25,
    stateRate: 6.25,
    maxLocalRate: 2.0,
  },
};

export default US_TX;
