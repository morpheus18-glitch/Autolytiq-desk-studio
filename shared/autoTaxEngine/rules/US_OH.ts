import { TaxRulesConfig } from "../types";

/**
 * OHIO TAX RULES
 *
 * Researched: 2025-01
 * Version: 1
 *
 * KEY FACTS:
 * - Base state sales tax: 5.75%
 * - Local rates: Up to 2.25% county (Cuyahoga County highest at 8%)
 * - Trade-in credit: FULL (deducted from sale price before tax)
 * - Doc fee: Taxable, no state cap
 * - Manufacturer rebates: NOT taxable (reduce sale price)
 * - Dealer rebates: Taxable (post-rebate price still taxed)
 * - Service contracts: Taxable on retail and lease
 * - GAP: Taxable on retail and lease
 * - Lease taxation: MONTHLY
 * - Reciprocity: YES (credit for tax paid elsewhere up to OH rate)
 *
 * UNIQUE FEATURES:
 * - Service contracts and GAP are BOTH taxable on leases (unlike many states)
 * - Relatively straightforward tax structure with no special schemes
 * - Good reciprocity policy with credit for out-of-state taxes
 *
 * SOURCES:
 * - Ohio Department of Taxation
 * - Ohio Revised Code 5739.02 (Sales and Use Tax)
 * - Ohio Revised Code 5739.029 (Trade-in Credit)
 * - Ohio Admin Code 5703-9-23 (Motor Vehicle Sales)
 */
export const US_OH: TaxRulesConfig = {
  stateCode: "OH",
  version: 1,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL
   *
   * Ohio allows full trade-in credit per ORC 5739.029. The trade-in
   * value is deducted from the purchase price before calculating sales tax.
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
   * This is standard Ohio treatment per ORC 5739.02.
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
   * Doc Fee: TAXABLE (no cap)
   *
   * Ohio doc fees are:
   * 1. Taxable as part of the sale
   * 2. NO state-mandated cap (dealers can charge any amount)
   *
   * Doc fees are considered part of the taxable sale price in Ohio.
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules:
   *
   * - Service contracts: TAXABLE on retail sales
   * - GAP insurance: TAXABLE on retail sales
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
    {
      code: "TITLE",
      taxable: false,
      notes: "BMV title fee is not taxable",
    },
    {
      code: "REG",
      taxable: false,
      notes: "BMV registration fee is not taxable",
    },
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
   * Ohio uses a combination of:
   * - State base rate: 5.75%
   * - Local rates: Up to 2.25% county
   *
   * Major county rates:
   * - Cuyahoga County (Cleveland): 8% (5.75% state + 2.25% county - highest)
   * - Franklin County (Columbus): 7.5% (5.75% state + 1.75% county)
   * - Hamilton County (Cincinnati): 7.5% (5.75% state + 1.75% county)
   * - Rest of state: Typically 6.5% to 7.75%
   *
   * The tax is calculated on the sale location (point of sale).
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
     * Ohio taxes leases on a MONTHLY basis. Sales tax is charged
     * on each monthly lease payment, not on the full capitalized cost upfront.
     */
    method: "MONTHLY",

    /**
     * Cap Cost Reduction: NOT taxed
     *
     * Cap cost reductions (down payments, trade-ins, rebates applied
     * to reduce cap cost) are NOT taxed in Ohio.
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
     * Doc fees on leases are taxable in Ohio and are typically
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
     * - Service contracts: TAXABLE when added to cap cost (UNIQUE)
     * - GAP: TAXABLE when added to cap cost (UNIQUE)
     * - Title: Not taxable
     * - Registration: Not taxable
     *
     * IMPORTANT: Ohio is one of the few states where backend products
     * (VSC, GAP) remain TAXABLE even when capitalized into a lease.
     * This is different from most states and increases lease costs.
     */
    feeTaxRules: [
      { code: "DOC_FEE", taxable: true, notes: "Doc fee taxed upfront" },
      {
        code: "SERVICE_CONTRACT",
        taxable: true,
        notes: "Service contracts TAXABLE on leases in Ohio (unlike most states)",
      },
      {
        code: "GAP",
        taxable: true,
        notes: "GAP TAXABLE on leases in Ohio (unlike most states)",
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
     * Fees that are taxable on leases (doc fee, service contracts, GAP)
     * are taxed upfront, not spread across monthly payments.
     */
    taxFeesUpfront: true,

    /**
     * Special Scheme: NONE
     *
     * Ohio uses standard monthly lease taxation with no special
     * schemes or surcharges. The main difference is that backend
     * products remain taxable on leases.
     */
    specialScheme: "NONE",

    notes:
      "Ohio lease taxation: Monthly payment method with standard state+local rates. " +
      "UNIQUE: Backend products (VSC, GAP) are TAXABLE when capitalized into lease " +
      "(unlike most states where they're exempt). Doc fee is taxed upfront. " +
      "Trade-in gets full credit reducing cap cost.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: ENABLED (with cap)
   *
   * Ohio DOES provide reciprocity credits for sales tax paid
   * in other states. If a vehicle was purchased out-of-state and tax
   * was paid, Ohio will provide a credit up to the amount of OH tax
   * that would have been due.
   *
   * Key rules:
   * - Credit is limited to OH tax rate (5.75% + local if applicable)
   * - Requires proof of tax paid in other state
   * - Applies to both retail and lease transactions
   * - If out-of-state tax exceeds OH tax, customer owes nothing additional
   * - If out-of-state tax is less than OH tax, customer pays the difference
   *
   * Example 1:
   * - Vehicle purchased in MI with 6% tax paid
   * - OH rate is 5.75% (before local)
   * - Customer gets credit up to OH rate (may pay local difference)
   *
   * Example 2:
   * - Vehicle purchased in IN with 7% tax paid
   * - OH rate with local is 7.5%
   * - Customer gets credit for 7% paid, owes 0.5% difference
   *
   * This is a standard reciprocity policy similar to many states.
   */
  reciprocity: {
    enabled: true,
    scope: "BOTH",
    homeStateBehavior: "CREDIT_UP_TO_STATE_RATE",
    requireProofOfTaxPaid: true,
    basis: "TAX_PAID",
    capAtThisStatesTax: true,
    hasLeaseException: false,
    notes:
      "Ohio provides reciprocity credits for tax paid in other states, " +
      "capped at OH tax rate. Requires proof of tax paid. If out-of-state tax " +
      "exceeds OH tax, no additional tax is due. If less, customer pays difference.",
  },

  extras: {
    lastUpdated: "2025-01",
    sources: [
      "Ohio Department of Taxation",
      "Ohio Revised Code 5739.02 - Sales and Use Tax",
      "Ohio Revised Code 5739.029 - Trade-in Credit",
      "Ohio Admin Code 5703-9-23 - Motor Vehicle Sales",
    ],
    notes:
      "Ohio has straightforward tax structure with state rate of 5.75% plus local county rates. " +
      "Cuyahoga County has highest rate at 8%. No cap on doc fees. Good reciprocity policy. " +
      "UNIQUE: Service contracts and GAP remain taxable even on leases (unlike most states).",
    docFeeCapAmount: null, // No state cap on doc fees
    maxCombinedRate: 8.0, // Cuyahoga County: 5.75% state + 2.25% county
    majorCountyRates: {
      CuyahogaCounty: 8.0, // Cleveland - highest (5.75% state + 2.25% county)
      FranklinCounty: 7.5, // Columbus (5.75% state + 1.75% county)
      HamiltonCounty: 7.5, // Cincinnati (5.75% state + 1.75% county)
      TypicalCounty: 6.5, // Most counties around 6.5% to 7.0%
    },
  },
};

export default US_OH;
