import type { TaxRulesConfig } from "../types";

/**
 * NEW YORK TAX RULES
 *
 * Researched: 2025-01
 * Version: 1
 *
 * KEY FACTS:
 * - State sales tax: 4%
 * - Local sales tax: Varies widely (NYC: 4.5% local = 8.5% total, some areas 8.875%)
 * - MCTD surcharge: Additional 0.375% in Metropolitan Commuter Transportation District
 * - Trade-in credit: FULL (deducted from sale price before tax)
 * - Doc fee: Taxable, capped at $175 by state law (one of the lowest caps in US)
 * - Manufacturer rebates: NOT taxable (reduce sale price)
 * - Dealer rebates: Taxable (do not reduce sale price)
 * - Service contracts: Taxable on both retail and lease
 * - GAP: Taxable on both retail and lease
 * - Lease taxation: MONTHLY with NY_MTR special scheme (includes MCTD surcharge)
 * - Reciprocity: NO (New York does not provide credits for taxes paid elsewhere)
 *
 * UNIQUE FEATURES:
 * - Lowest doc fee cap in the nation ($175)
 * - MCTD surcharge applies to 12 counties (0.375% additional)
 * - Service contracts and GAP taxed on both retail AND leases (unlike many states)
 * - Complex local tax variations (NYC 8.5%, some upstate areas 8.875%)
 * - NY_MTR special scheme for lease taxation with MCTD
 *
 * MCTD COUNTIES (Metropolitan Commuter Transportation District):
 * Bronx, Kings, New York, Queens, Richmond (NYC boroughs), plus
 * Dutchess, Nassau, Orange, Putnam, Rockland, Suffolk, Westchester
 *
 * SOURCES:
 * - New York State Department of Taxation and Finance
 * - New York Tax Law Article 28 (Sales and Use Tax)
 * - New York Tax Law Section 1111 (Imposition of Sales Tax)
 * - TSB-M-06(5)S (Metropolitan Commuter Transportation District)
 */
export const US_NY: TaxRulesConfig = {
  stateCode: "NY",
  version: 1,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL
   *
   * New York allows full trade-in credit. The trade-in allowance is deducted
   * from the purchase price before calculating sales tax per NY Tax Law
   * Section 1111(i).
   *
   * Example: $45,000 vehicle - $18,000 trade-in = $27,000 taxable base
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules:
   *
   * - Manufacturer rebates: NOT taxable - reduce the sale price
   * - Dealer rebates: Taxable - do not reduce the sale price for tax purposes
   *
   * This follows New York State Department of Taxation guidance on motor
   * vehicle sales.
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
   * Documentation fees in New York are:
   * 1. Taxable as part of the sale
   * 2. Capped at $175 by state law (NYS Vehicle and Traffic Law 415)
   *
   * New York has the LOWEST doc fee cap in the United States. This cap
   * was specifically enacted to protect consumers from excessive dealer
   * documentation charges.
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules:
   *
   * - Service contracts: TAXABLE on retail sales (and leases)
   * - GAP insurance: TAXABLE on retail sales (and leases)
   * - Title fee: NOT taxable (government fee)
   * - Registration fee: NOT taxable (government fee)
   *
   * New York taxes extended warranties and GAP insurance on both retail
   * purchases and leases, which is more stringent than many states.
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: true,
      notes: "Service contracts are taxable on retail sales (and leases)",
    },
    {
      code: "GAP",
      taxable: true,
      notes: "GAP insurance is taxable on retail sales (and leases)",
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
   * New York sales tax structure:
   * - State base rate: 4%
   * - Local sales tax: Varies by county and municipality (0.875% to 4.875%)
   * - MCTD surcharge: Additional 0.375% in 12 designated counties
   * - Maximum combined rate: 8.875% (4% state + 4.5% local + 0.375% MCTD)
   *
   * Common jurisdictions:
   * - NYC (all boroughs): 8.875% (4% + 4.5% + 0.375% MCTD)
   * - Nassau County: 8.625% (4% + 4.25% + 0.375% MCTD)
   * - Suffolk County: 8.625% (4% + 4.25% + 0.375% MCTD)
   * - Westchester County: 8.375% (4% + 4% + 0.375% MCTD)
   * - Monroe County (Rochester): 8% (4% + 4%, no MCTD)
   * - Erie County (Buffalo): 8.75% (4% + 4.75%, no MCTD)
   * - Albany County: 8% (4% + 4%, no MCTD)
   *
   * Tax is based on where the vehicle is registered (buyer's residence),
   * not where it is sold.
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
     * New York taxes leases on a MONTHLY basis per NY Tax Law Section 1111.
     * Sales tax is charged on each monthly lease payment, not on the full
     * capitalized cost upfront.
     */
    method: "MONTHLY",

    /**
     * Cap Cost Reduction: NOT taxed
     *
     * Cap cost reductions (down payments, trade-ins, rebates applied to
     * reduce capitalized cost) are NOT taxed in New York on lease
     * transactions.
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
     * Documentation fees on leases are taxable in New York and are
     * typically taxed upfront (capitalized or paid at signing). The $175
     * cap applies to leases as well as retail sales.
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
     * - Service contracts: TAXABLE when capitalized into lease
     * - GAP: TAXABLE when capitalized into lease
     * - Title: Not taxable
     * - Registration: Not taxable
     *
     * IMPORTANT: Unlike Florida, Texas, and California, New York taxes
     * service contracts and GAP on BOTH retail and lease transactions.
     * This makes NY one of the more tax-aggressive states for F&I products.
     */
    feeTaxRules: [
      { code: "DOC_FEE", taxable: true, notes: "Doc fee taxed upfront on lease" },
      {
        code: "SERVICE_CONTRACT",
        taxable: true,
        notes: "Service contracts ARE taxed when capitalized into lease (unlike most states)",
      },
      {
        code: "GAP",
        taxable: true,
        notes: "GAP IS taxed when capitalized into lease (unlike most states)",
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
     * Taxable fees (like doc fee, service contracts, GAP) are taxed
     * upfront on leases.
     */
    taxFeesUpfront: true,

    /**
     * Special Scheme: NY_MTR
     *
     * New York uses the NY_MTR (New York Metropolitan Transportation Region)
     * special scheme which applies the MCTD surcharge (0.375%) in addition
     * to the standard 4% state + local rates for leases in the 12 designated
     * MCTD counties.
     *
     * MCTD Counties: Bronx, Kings, New York, Queens, Richmond, Dutchess,
     * Nassau, Orange, Putnam, Rockland, Suffolk, Westchester
     *
     * The interpreter must check if the lease is in an MCTD jurisdiction
     * and apply the additional 0.375% surcharge accordingly.
     */
    specialScheme: "NY_MTR",

    notes:
      "New York lease taxation: Monthly payment method with MCTD surcharge in 12 counties. " +
      "Service contracts and GAP ARE taxed on leases (unlike most states). " +
      "Doc fee is taxed upfront and capped at $175 (lowest in US). " +
      "Trade-in gets full credit reducing cap cost. " +
      "MCTD counties pay additional 0.375% on monthly payments.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: NOT ENABLED
   *
   * New York does NOT provide reciprocity credits for sales tax paid in
   * other states. Vehicles purchased out-of-state and brought to New York
   * for registration are subject to New York use tax on the full purchase
   * price, regardless of tax paid elsewhere.
   *
   * This means if you buy a vehicle in New Jersey (paying 6.625% sales tax)
   * and register it in New York, you will owe the full NY tax (4% + local +
   * MCTD if applicable) with no credit for the NJ tax paid.
   *
   * New York's policy is similar to California and Florida's strict approach.
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
      "New York does not provide reciprocity credits. Out-of-state vehicle purchases " +
      "owe full NY use tax (4% + local + MCTD if applicable) regardless of tax paid " +
      "elsewhere. No credit given for taxes paid in other states.",
  },

  extras: {
    lastUpdated: "2025-01",
    sources: [
      "New York State Department of Taxation and Finance",
      "New York Tax Law Article 28 - Sales and Use Tax",
      "New York Tax Law Section 1111 - Imposition of Sales Tax",
      "NYS Vehicle and Traffic Law 415 - Doc Fee Cap",
      "TSB-M-06(5)S - Metropolitan Commuter Transportation District",
    ],
    notes:
      "New York has 4% state sales tax with local rates varying widely (max combined 8.875%). " +
      "Doc fees are capped at $175 (LOWEST in US). " +
      "Service contracts and GAP are taxed on BOTH retail and leases (unlike most states). " +
      "MCTD surcharge (0.375%) applies in 12 counties. " +
      "No reciprocity - full use tax owed on out-of-state purchases.",
    docFeeCapAmount: 175,
    maxCombinedRate: 8.875,
    stateRate: 4.0,
    maxLocalRate: 4.875,
    mctdSurcharge: 0.375,
    mctdCounties: [
      "Bronx",
      "Kings",
      "New York",
      "Queens",
      "Richmond",
      "Dutchess",
      "Nassau",
      "Orange",
      "Putnam",
      "Rockland",
      "Suffolk",
      "Westchester",
    ],
    commonJurisdictionRates: {
      "NYC (all boroughs)": 8.875,
      "Nassau County": 8.625,
      "Suffolk County": 8.625,
      "Westchester County": 8.375,
      "Monroe County (Rochester)": 8.0,
      "Erie County (Buffalo)": 8.75,
      "Albany County": 8.0,
    },
  },
};

export default US_NY;
