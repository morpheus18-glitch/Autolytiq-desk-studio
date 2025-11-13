import { TaxRulesConfig } from "../types";

/**
 * TENNESSEE TAX RULES
 *
 * Researched: 2025-01
 * Version: 2
 *
 * KEY FACTS:
 * - State sales tax: 7% (one of the highest state rates in the US)
 * - Local rates: Yes, varies by jurisdiction (2.25% - 2.75% typical)
 * - Combined rate range: 9.25% - 9.75% (Memphis 9.75%, Nashville 9.25%, Chattanooga 9.25%)
 * - Trade-in credit: FULL (deducted from sale price before tax)
 * - SINGLE ARTICLE TAX CAP: $1,600 (vehicles ≤ $1,600) OR $3,200 (vehicles > $1,600) on STATE portion only
 * - Doc fee: Taxable, capped at $495 (raised from $495 effective July 1, 2019)
 * - Manufacturer rebates: NOT taxable (reduce sale price)
 * - Dealer rebates: Taxable (do not reduce sale price)
 * - Service contracts & GAP: TAXABLE (both retail and lease)
 * - Lease taxation: MONTHLY (tax on each payment, single article cap applies per payment)
 * - Reciprocity: LIMITED (credit for taxes paid elsewhere, capped at TN rate)
 *
 * UNIQUE TENNESSEE FEATURES:
 * - Single Article Tax Cap: State portion capped at $1,600 or $3,200 depending on vehicle price
 * - Local sales tax NOT capped (only state portion has cap)
 * - One of few states that taxes service contracts and GAP insurance
 * - Doc fee cap of $495 (statutory limit)
 * - Wheel tax: County-specific annual registration tax ($50-$100+ depending on county)
 * - No property tax on vehicles (wheel tax replaces it)
 *
 * SINGLE ARTICLE TAX CAP EXPLAINED:
 * For vehicles with a purchase price of $1,600 or LESS:
 *   - State tax (7%) is capped at $1,600 × 7% = $112
 * For vehicles with a purchase price OVER $1,600:
 *   - State tax (7%) is capped at $3,200 × 7% = $224
 *
 * Example 1: $50,000 vehicle in Nashville (7% state + 2.25% local = 9.25%)
 *   - Without cap: $50,000 × 9.25% = $4,625
 *   - With cap: $224 (state cap) + ($50,000 × 2.25% local) = $224 + $1,125 = $1,349
 *
 * Example 2: $1,500 vehicle in Memphis (7% state + 2.75% local = 9.75%)
 *   - Without cap: $1,500 × 9.75% = $146.25
 *   - With cap: ($1,500 × 7%) = $105 (under $112 cap) + ($1,500 × 2.75%) = $105 + $41.25 = $146.25
 *   - Cap doesn't apply (vehicle ≤ $1,600, state tax under $112)
 *
 * SOURCES:
 * - Tennessee Department of Revenue (TN DOR) - tn.gov/revenue
 * - Tennessee Code Annotated (TCA) § 67-6-331 (Single Article Tax Cap)
 * - TCA § 67-6-501 et seq. (Sales and Use Tax)
 * - TCA § 55-3-122 (Documentation Fee Cap)
 * - TN DOR Important Notice #19-14 (Doc Fee Cap Increase)
 * - TN DOR Sales and Use Tax Guide (December 2024)
 * - Tennessee County Clerk Association
 */
export const US_TN: TaxRulesConfig = {
  stateCode: "TN",
  version: 2,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL
   *
   * Tennessee allows full trade-in credit. The trade-in value is deducted
   * from the purchase price before calculating sales tax.
   *
   * Example: $30,000 vehicle - $10,000 trade-in = $20,000 taxable base
   *
   * The single article tax cap then applies to the state portion of the
   * tax on this $20,000 base.
   *
   * Source: TCA § 67-6-501, TN DOR Sales and Use Tax Guide
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules:
   *
   * - Manufacturer rebates (MFR): NOT taxable - reduce the sale price
   * - Dealer rebates: Taxable - do not reduce the sale price for tax purposes
   *
   * This is standard Tennessee sales tax treatment.
   *
   * Source: TN DOR Sales and Use Tax Guide
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: false,
      notes: "Manufacturer rebates reduce the purchase price before sales tax calculation",
    },
    {
      appliesTo: "DEALER",
      taxable: true,
      notes: "Dealer rebates/incentives do not reduce the taxable sale price",
    },
  ],

  /**
   * Doc Fee: TAXABLE, capped at $495
   *
   * Tennessee doc fees are:
   * 1. Taxable as part of the retail sale
   * 2. Capped at $495 (increased from $495 effective July 1, 2019 per TCA § 55-3-122)
   *
   * The doc fee is included in the taxable sale price and subject to both
   * state and local sales tax.
   *
   * Source: TCA § 55-3-122, TN DOR Important Notice #19-14
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules:
   *
   * Tennessee TAXES service contracts and GAP insurance, which is UNUSUAL.
   * Most states treat these as non-taxable insurance products, but Tennessee
   * considers them taxable retail sales.
   *
   * - Service contracts (VSC/extended warranty): TAXABLE
   * - GAP insurance: TAXABLE
   * - Accessories: TAXABLE
   * - Title fee: NOT taxable (government fee)
   * - Registration fee: NOT taxable (government fee)
   * - Wheel tax: NOT taxable (annual county registration tax)
   *
   * Source: TCA § 67-6-501, TN DOR Sales and Use Tax Guide
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: true,
      notes:
        "Tennessee TAXES extended warranties/VSC (unusual - most states don't tax these). " +
        "Treated as taxable retail sale, not insurance.",
    },
    {
      code: "GAP",
      taxable: true,
      notes:
        "Tennessee TAXES GAP insurance (unusual - most states don't tax GAP). " +
        "Treated as taxable retail sale, not insurance.",
    },
    {
      code: "TITLE",
      taxable: false,
      notes: "Title fee paid to County Clerk is not taxable (government fee)",
    },
    {
      code: "REG",
      taxable: false,
      notes: "Registration fee paid to County Clerk is not taxable (government fee)",
    },
    {
      code: "WHEEL_TAX",
      taxable: false,
      notes:
        "Wheel tax is an annual county registration tax ($50-$100+ varies by county), " +
        "NOT subject to sales tax. Replaces vehicle property tax in Tennessee.",
    },
  ],

  /**
   * Product Taxability:
   *
   * - Accessories: Taxable (part of vehicle sale when dealer-installed)
   * - Negative equity: Taxable (rolled into financed amount increases sale price)
   * - Service contracts: TAXABLE (Tennessee is one of few states that taxes VSC)
   * - GAP: TAXABLE (Tennessee is one of few states that taxes GAP)
   *
   * When negative equity from a trade-in is rolled into the new loan, it
   * increases the total amount financed and is subject to sales tax.
   *
   * Source: TN DOR Sales and Use Tax Guide
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: true,
  taxOnServiceContracts: true, // TN DOES tax VSC (unusual)
  taxOnGap: true, // TN DOES tax GAP (unusual)

  /**
   * Vehicle Tax Scheme: STATE_PLUS_LOCAL with SINGLE ARTICLE TAX CAP
   *
   * Tennessee uses:
   * - State sales tax: 7%
   * - Local sales tax: Varies by jurisdiction (county + city)
   *   - Memphis: 7% state + 2.75% local = 9.75%
   *   - Nashville: 7% state + 2.25% local = 9.25%
   *   - Knoxville: 7% state + 2.25% local = 9.25%
   *   - Chattanooga: 7% state + 2.25% local = 9.25%
   *   - Range: typically 9.25% - 9.75% combined
   *
   * CRITICAL: Single Article Tax Cap applies to STATE portion ONLY:
   * - Vehicles ≤ $1,600: State tax capped at $112 ($1,600 × 7%)
   * - Vehicles > $1,600: State tax capped at $224 ($3,200 × 7%)
   * - Local tax is NOT capped and applies to full sale price
   *
   * This cap significantly reduces tax on expensive vehicles. A $100,000
   * vehicle in Nashville would pay:
   * - State: $224 (capped, instead of $7,000)
   * - Local: $2,250 ($100,000 × 2.25%)
   * - Total: $2,474 (instead of $9,250 without cap)
   *
   * Source: TCA § 67-6-331, TN DOR Sales and Use Tax Guide
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
     * Tennessee taxes leases on a MONTHLY basis. Sales tax is charged on each
     * monthly lease payment.
     *
     * IMPORTANT: The single article tax cap applies to EACH MONTHLY PAYMENT,
     * not to the total lease amount. This means:
     * - If monthly payment ≤ $1,600: State portion capped at $112
     * - If monthly payment > $1,600: State portion capped at $224
     *
     * In practice, most lease payments are under $1,600/month, so the cap
     * rarely applies to leases (unless it's a very expensive vehicle with
     * low money factor and high payment).
     *
     * Source: TCA § 67-6-331, TN DOR Sales and Use Tax Guide
     */
    method: "MONTHLY",

    /**
     * Cap Cost Reduction: NOT taxed
     *
     * Cap cost reductions (cash down, trade-ins, rebates) reduce the capitalized
     * cost and are not themselves taxed. Only the monthly lease payments are taxed.
     */
    taxCapReduction: false,

    /**
     * Rebate Behavior on Leases: FOLLOW_RETAIL_RULE
     *
     * Manufacturer rebates reduce cap cost (lower payment, lower tax)
     * Dealer rebates treated same as retail (taxable, don't reduce base)
     */
    rebateBehavior: "FOLLOW_RETAIL_RULE",

    /**
     * Doc Fee on Leases: ALWAYS taxable
     *
     * Doc fees on leases are taxable (same as retail) and are typically
     * taxed upfront (capitalized or paid at signing).
     *
     * Subject to same $495 cap as retail transactions.
     */
    docFeeTaxability: "ALWAYS",

    /**
     * Trade-in Credit on Leases: FULL
     *
     * Trade-ins on leases receive full credit and reduce the cap cost,
     * lowering monthly payments and thus monthly tax.
     */
    tradeInCredit: "FULL",

    /**
     * Negative Equity on Leases: Taxable
     *
     * Negative equity rolled into a lease increases the gross cap cost,
     * increases monthly payments, and thus increases the tax paid monthly
     * on those payments.
     */
    negativeEquityTaxable: true,

    /**
     * Fee Taxability on Leases:
     *
     * - Doc fee: Taxable (upfront), capped at $495
     * - Service contracts: TAXABLE (when capitalized into lease)
     * - GAP: TAXABLE (when capitalized into lease)
     * - Title: Not taxable
     * - Registration: Not taxable
     * - Wheel tax: Not taxable (annual county tax)
     *
     * Tennessee taxes service contracts and GAP even when capitalized into
     * leases, consistent with their retail treatment.
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: true,
        notes: "Doc fee taxed upfront on lease, capped at $495",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: true,
        notes: "Service contracts TAXABLE when capitalized into lease (unusual)",
      },
      {
        code: "GAP",
        taxable: true,
        notes: "GAP TAXABLE when capitalized into lease (unusual)",
      },
      { code: "TITLE", taxable: false },
      { code: "REG", taxable: false },
      { code: "WHEEL_TAX", taxable: false },
    ],

    /**
     * Title Fee Rules on Leases:
     *
     * Title fees and wheel tax are:
     * - Not taxable
     * - Included in cap cost (or paid upfront)
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
      {
        code: "WHEEL_TAX",
        taxable: false,
        includedInCapCost: true,
        includedInUpfront: true,
        includedInMonthly: false,
      },
    ],

    /**
     * Tax Fees Upfront: TRUE
     *
     * Fees that are taxable on leases (like doc fee, VSC, GAP) are taxed
     * upfront at signing, not spread across monthly payments.
     */
    taxFeesUpfront: true,

    /**
     * Special Scheme: TN_SINGLE_ARTICLE_CAP
     *
     * Tennessee's single article tax cap creates a special calculation
     * requirement. The interpreter must:
     * 1. Calculate state tax on payment amount
     * 2. Cap state tax at $112 (≤$1,600 payment) or $224 (>$1,600 payment)
     * 3. Add uncapped local tax
     *
     * This requires a custom calculator to properly handle the state cap
     * logic while leaving local tax uncapped.
     */
    specialScheme: "TN_SINGLE_ARTICLE_CAP",

    notes:
      "Tennessee: Monthly lease taxation. Single article tax cap applies to EACH PAYMENT: " +
      "state portion capped at $112 (payment ≤ $1,600) or $224 (payment > $1,600). " +
      "Local tax NOT capped. Service contracts and GAP are TAXABLE (unusual - most states " +
      "don't tax these). Doc fee capped at $495. Wheel tax ($50-$100+) is annual county " +
      "registration tax, not subject to sales tax.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: LIMITED
   *
   * Tennessee provides LIMITED reciprocity for sales tax paid in other states:
   *
   * - If you paid sales tax in another state, Tennessee will give you credit
   * - Credit is capped at the Tennessee tax rate that would have applied
   * - Requires proof of tax paid (receipt, title, registration)
   * - Applies to both retail and lease transactions
   *
   * When a vehicle is purchased out-of-state and brought to Tennessee for
   * registration, the buyer must pay Tennessee use tax. However, any sales tax
   * paid to the other state is credited against the Tennessee use tax due.
   *
   * IMPORTANT: The single article tax cap applies when calculating the Tennessee
   * use tax owed. If another state charged more tax than Tennessee's capped
   * amount, no additional tax is owed.
   *
   * Example:
   * - Buy vehicle in Illinois (IL tax: 7.25% = $3,625 on $50,000)
   * - Register in Tennessee (TN would be: $224 state + ~$1,125 local = ~$1,349)
   * - Credit: $1,349 (capped at TN amount)
   * - Owe TN: $0 (credit exceeds TN tax)
   *
   * Source: TCA § 67-6-501, TN DOR Sales and Use Tax Guide
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
      "Tennessee provides credit for sales tax paid in other states, capped at TN rate " +
      "(including single article tax cap). Requires proof of tax paid. Credit applies to " +
      "both state and local tax. If other state's tax exceeds Tennessee's capped amount, " +
      "no additional tax is owed.",
  },

  extras: {
    lastUpdated: "2025-01",
    sources: [
      "Tennessee Department of Revenue (TN DOR) - tn.gov/revenue",
      "Tennessee Code Annotated (TCA) § 67-6-331 - Single Article Tax Cap",
      "TCA § 67-6-501 et seq. - Sales and Use Tax",
      "TCA § 55-3-122 - Documentation Fee Cap",
      "TN DOR Important Notice #19-14 - Doc Fee Cap Increase (July 2019)",
      "TN DOR Sales and Use Tax Guide (December 2024)",
      "Tennessee County Clerk Association - Wheel Tax Information",
    ],
    notes:
      "Tennessee has 7% state + 2.25%-2.75% local = 9.25%-9.75% combined sales tax. " +
      "SINGLE ARTICLE TAX CAP: State portion capped at $1,600 ($112 tax) for vehicles ≤$1,600 " +
      "or $3,200 ($224 tax) for vehicles >$1,600. Local tax NOT capped. Doc fee capped at $495. " +
      "Tennessee TAXES service contracts and GAP (unusual - most states don't). No vehicle property tax " +
      "(replaced by county wheel tax $50-$100+). Lease taxation: monthly with cap applying per payment. " +
      "Single article cap significantly reduces tax on expensive vehicles.",
    stateRate: 7.0,
    typicalLocalRate: 2.25, // Nashville, Knoxville, Chattanooga
    maxLocalRate: 2.75, // Memphis
    minCombinedRate: 9.25,
    maxCombinedRate: 9.75,
    singleArticleCapLow: 1600, // For vehicles ≤ $1,600
    singleArticleCapHigh: 3200, // For vehicles > $1,600
    singleArticleCapLowTax: 112, // $1,600 × 7%
    singleArticleCapHighTax: 224, // $3,200 × 7%
    docFeeCapAmount: 495,
    wheelTaxRange: [50, 100], // Varies by county
  },
};

export default US_TN;
