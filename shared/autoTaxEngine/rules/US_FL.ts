import { TaxRulesConfig } from "../types";

/**
 * FLORIDA TAX RULES
 *
 * Researched: 2025-01
 * Version: 1
 *
 * KEY FACTS:
 * - State sales tax: 6%
 * - Local discretionary sales surtax: Up to 2% (varies by county, max combined 8%)
 * - Trade-in credit: FULL (deducted from sale price before tax)
 * - Doc fee: Taxable, capped at $995 by state law (Florida Statute 501.137)
 * - Manufacturer rebates: NOT taxable (reduce sale price)
 * - Dealer rebates: Taxable (do not reduce sale price)
 * - Service contracts: Taxable on retail, NOT taxable on leases
 * - GAP: Taxable on retail, NOT taxable on leases
 * - Lease taxation: MONTHLY (tax on each monthly payment)
 * - Reciprocity: NO (Florida does not provide credits for taxes paid elsewhere)
 *
 * UNIQUE FEATURES:
 * - Florida has one of the highest doc fee caps in the US ($995)
 * - Local surtax rates vary significantly by county (0.5% to 2%)
 * - Service contracts and GAP are treated differently on leases vs retail
 * - No use tax credit for out-of-state purchases
 *
 * SOURCES:
 * - Florida Department of Revenue
 * - Florida Statute 212.05 (Sales and Use Tax)
 * - Florida Statute 212.08(7) (Motor Vehicle Sales)
 * - Florida Statute 501.137 (Motor Vehicle Warranties)
 */
export const US_FL: TaxRulesConfig = {
  stateCode: "FL",
  version: 1,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL
   *
   * Florida allows full trade-in credit. The trade-in allowance is deducted
   * from the purchase price before calculating sales tax per Florida Statute
   * 212.05(1)(a)1.b.
   *
   * Example: $40,000 vehicle - $15,000 trade-in = $25,000 taxable base
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules:
   *
   * - Manufacturer rebates: NOT taxable - reduce the sale price
   * - Dealer rebates: Taxable - do not reduce the sale price for tax purposes
   *
   * This follows Florida Department of Revenue guidance on motor vehicle
   * sales taxation (TIP 04A01-12).
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: false,
      notes: "Manufacturer rebates reduce purchase price before tax calculation",
    },
    {
      appliesTo: "DEALER",
      taxable: true,
      notes: "Dealer rebates do not reduce taxable sale price",
    },
  ],

  /**
   * Doc Fee: TAXABLE
   *
   * Documentation fees in Florida are:
   * 1. Taxable as part of the sale
   * 2. Capped at $995 by Florida Statute 501.137
   *
   * Florida has one of the highest doc fee caps in the nation. Dealers
   * cannot charge more than $995 for documentation fees.
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules:
   *
   * - Service contracts: TAXABLE on retail sales (FL Statute 212.05(1))
   * - GAP insurance: TAXABLE on retail sales
   * - Title fee: NOT taxable (government fee)
   * - Registration fee: NOT taxable (government fee)
   *
   * Florida taxes extended warranties and GAP insurance on retail purchases
   * as they are considered part of the total sale price.
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: true,
      notes: "Service contracts and extended warranties are taxable on retail sales",
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
   * - Accessories: Taxable (part of vehicle sale)
   * - Negative equity: Taxable (rolled into financed amount)
   * - Service contracts: Taxable on retail
   * - GAP: Taxable on retail
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: true,
  taxOnServiceContracts: true,
  taxOnGap: true,

  /**
   * Vehicle Tax Scheme: STATE_PLUS_LOCAL
   *
   * Florida sales tax structure:
   * - State base rate: 6%
   * - County discretionary sales surtax: 0.5% to 2% (varies by county)
   * - Maximum combined rate: 8% (6% state + 2% local)
   *
   * Common county rates:
   * - Miami-Dade: 7% (6% + 1%)
   * - Broward: 7% (6% + 1%)
   * - Palm Beach: 7% (6% + 1%)
   * - Hillsborough (Tampa): 7.5% (6% + 1.5%)
   * - Orange (Orlando): 6.5% (6% + 0.5%)
   * - Duval (Jacksonville): 7% (6% + 1%)
   *
   * Tax is based on the location where the vehicle is registered, not
   * where it is sold.
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
     * Florida taxes leases on a MONTHLY basis per Florida Statute 212.05(1)(e)1.
     * Sales tax is charged on each monthly lease payment, not on the full
     * capitalized cost upfront.
     */
    method: "MONTHLY",

    /**
     * Cap Cost Reduction: NOT taxed
     *
     * Cap cost reductions (down payments, trade-ins, rebates applied to
     * reduce capitalized cost) are NOT taxed in Florida on lease transactions.
     */
    taxCapReduction: false,

    /**
     * Rebate Behavior on Leases: FOLLOW_RETAIL_RULE
     *
     * - Manufacturer rebates reduce cap cost (not taxed)
     * - Dealer rebates do not reduce taxable monthly payments
     */
    rebateBehavior: "FOLLOW_RETAIL_RULE",

    /**
     * Doc Fee on Leases: ALWAYS taxable
     *
     * Documentation fees on leases are taxable in Florida and are typically
     * taxed upfront (capitalized or paid at signing). The $995 cap applies
     * to leases as well as retail sales.
     */
    docFeeTaxability: "ALWAYS",

    /**
     * Trade-in Credit on Leases: FULL
     *
     * Trade-ins on leases receive full credit and reduce the capitalized
     * cost, thereby reducing monthly payments and the tax paid on those
     * payments.
     */
    tradeInCredit: "FULL",

    /**
     * Negative Equity on Leases: Taxable
     *
     * Negative equity rolled into a lease increases the capitalized cost,
     * increases monthly payments, and thus increases tax paid monthly.
     */
    negativeEquityTaxable: true,

    /**
     * Fee Taxability on Leases:
     *
     * - Doc fee: Taxable (upfront)
     * - Service contracts: NOT taxable when capitalized into lease
     * - GAP: NOT taxable when capitalized into lease
     * - Title: Not taxable
     * - Registration: Not taxable
     *
     * IMPORTANT: Florida treats service contracts and GAP differently on
     * leases vs retail. On retail they are taxable, but when capitalized
     * into a lease they are NOT taxed.
     */
    feeTaxRules: [
      { code: "DOC_FEE", taxable: true, notes: "Doc fee taxed upfront on lease" },
      {
        code: "SERVICE_CONTRACT",
        taxable: false,
        notes: "Service contracts NOT taxed when capitalized into lease",
      },
      {
        code: "GAP",
        taxable: false,
        notes: "GAP NOT taxed when capitalized into lease",
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
     * Special Scheme: NONE
     *
     * Florida uses standard monthly lease taxation with no special
     * schemes or surcharges. The same 6% state + county surtax applies
     * to each monthly payment.
     */
    specialScheme: "NONE",

    notes:
      "Florida lease taxation: Monthly payment method (6% + county surtax on each payment). " +
      "Service contracts and GAP are NOT taxed on leases (unlike retail where they ARE taxed). " +
      "Doc fee is taxed upfront and capped at $995. Trade-in gets full credit reducing cap cost.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: NOT ENABLED
   *
   * Florida does NOT provide reciprocity credits for sales tax paid in
   * other states. Vehicles purchased out-of-state and brought to Florida
   * for registration are subject to Florida use tax on the full purchase
   * price, regardless of tax paid elsewhere.
   *
   * This means if you buy a vehicle in Georgia (paying 4% sales tax) and
   * register it in Florida, you will owe the full 6% + county surtax to
   * Florida with no credit for the Georgia tax paid.
   *
   * Florida's policy is similar to California's strict approach.
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
      "Florida does not provide reciprocity credits. Out-of-state vehicle purchases " +
      "owe full FL use tax (6% + county surtax) regardless of tax paid elsewhere. " +
      "No credit given for taxes paid in other states.",
  },

  extras: {
    lastUpdated: "2025-01",
    sources: [
      "Florida Department of Revenue",
      "Florida Statute 212.05 - Sales and Use Tax",
      "Florida Statute 212.08(7) - Motor Vehicle Sales",
      "Florida Statute 501.137 - Motor Vehicle Warranties (doc fee cap)",
      "TIP 04A01-12 - Motor Vehicle Sales and Leases",
    ],
    notes:
      "Florida has 6% state sales tax with county surtax up to 2% (max 8% combined). " +
      "Doc fees are capped at $995 (one of the highest caps in US). " +
      "Service contracts and GAP are taxed on retail but NOT on leases. " +
      "No reciprocity - full use tax owed on out-of-state purchases.",
    docFeeCapAmount: 995,
    maxCombinedRate: 8.0,
    stateRate: 6.0,
    maxLocalRate: 2.0,
    commonCountyRates: {
      "Miami-Dade": 7.0,
      "Broward": 7.0,
      "Palm Beach": 7.0,
      "Hillsborough": 7.5,
      "Orange": 6.5,
      "Duval": 7.0,
    },
  },
};

export default US_FL;
