import { TaxRulesConfig } from "../types";

/**
 * ILLINOIS TAX RULES
 *
 * Researched: 2025-01
 * Version: 1
 *
 * KEY FACTS:
 * - Base state sales tax: 6.25%
 * - Local rates: Chicago adds 1.25% city + 1.75% Cook County = 10.25% total (one of highest in US)
 * - Trade-in credit: FULL (deducted from sale price before tax)
 * - Doc fee: Taxable, no state cap
 * - Manufacturer rebates: NOT taxable (reduce sale price)
 * - Dealer rebates: Taxable (post-rebate price still taxed)
 * - Service contracts: Taxable on retail, NOT taxable on leases
 * - GAP: Taxable on retail, NOT taxable on leases
 * - Lease taxation: MONTHLY with IL_CHICAGO_COOK special scheme
 * - Chicago special: Additional 0.5% lease tax in city limits
 * - Reciprocity: Limited (credit if purchasing from dealer, not private party)
 *
 * UNIQUE FEATURES:
 * - Chicago has highest combined rates in US (10.25%)
 * - Additional 0.5% lease tax in Chicago city limits only
 * - Cook County has different lease taxation rules than rest of state
 * - Limited reciprocity: only for dealer purchases, not private party
 *
 * SOURCES:
 * - Illinois Department of Revenue
 * - 35 ILCS 105/3-45 (Use Tax Act - Trade-in Credit)
 * - 86 Ill. Adm. Code 130.2075 (Vehicle Sales Tax)
 * - Chicago Municipal Code Chapter 3-32 (Lease Transaction Tax)
 */
export const US_IL: TaxRulesConfig = {
  stateCode: "IL",
  version: 1,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL
   *
   * Illinois allows full trade-in credit per 35 ILCS 105/3-45. The trade-in
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
   * This is standard Illinois treatment per 86 Ill. Adm. Code 130.2075.
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
   * Illinois doc fees are:
   * 1. Taxable as part of the sale
   * 2. NO state-mandated cap (dealers can charge any amount)
   *
   * Doc fees are considered part of the taxable sale price in Illinois.
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
      notes: "Secretary of State title fee is not taxable",
    },
    {
      code: "REG",
      taxable: false,
      notes: "Secretary of State registration fee is not taxable",
    },
  ],

  /**
   * Product Taxability:
   *
   * - Accessories: Taxable
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
   * Illinois uses a combination of:
   * - State base rate: 6.25%
   * - Local rates: Varies by jurisdiction (Chicago/Cook County highest)
   *
   * Major rates:
   * - Chicago: 10.25% (6.25% state + 1.25% city + 1.75% Cook County + 1% RTA)
   * - Cook County (outside Chicago): 9% (6.25% state + 1.75% county + 1% RTA)
   * - Rest of state: Varies by county (typically 6.25% to 8.75%)
   *
   * Chicago has one of the highest combined vehicle sales tax rates in the US.
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
     * Illinois taxes leases on a MONTHLY basis. Sales tax is charged
     * on each monthly lease payment, not on the full capitalized cost upfront.
     *
     * SPECIAL: Chicago has an additional 0.5% lease transaction tax on top
     * of standard sales tax (handled by IL_CHICAGO_COOK special scheme).
     */
    method: "MONTHLY",

    /**
     * Cap Cost Reduction: NOT taxed
     *
     * Cap cost reductions (down payments, trade-ins, rebates applied
     * to reduce cap cost) are NOT taxed in Illinois.
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
     * Doc fees on leases are taxable in Illinois and are typically
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
     * - Service contracts: NOT taxable when added to cap cost
     * - GAP: NOT taxable when added to cap cost
     * - Title: Not taxable
     * - Registration: Not taxable
     *
     * Backend products (VSC, GAP) are typically NOT taxed when
     * capitalized into a lease in Illinois (different from retail).
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
     * Special Scheme: IL_CHICAGO_COOK
     *
     * Illinois has special lease taxation rules, particularly in Chicago/Cook County:
     *
     * CHICAGO SPECIAL:
     * - Additional 0.5% "lease transaction tax" applies in Chicago city limits only
     * - This is ON TOP OF the standard sales tax rate
     * - Total lease tax in Chicago: 10.25% sales tax + 0.5% lease tax = 10.75% effective
     *
     * COOK COUNTY SPECIAL:
     * - Different rate calculation than Chicago proper
     * - 9% base (6.25% state + 1.75% county + 1% RTA)
     * - No additional lease transaction tax (that's Chicago-specific)
     *
     * REST OF STATE:
     * - Standard monthly lease taxation
     * - No additional lease-specific taxes
     */
    specialScheme: "IL_CHICAGO_COOK",

    notes:
      "Illinois lease taxation: Monthly payment method. Chicago has SPECIAL 0.5% lease " +
      "transaction tax on top of 10.25% sales tax (10.75% total effective). Cook County " +
      "outside Chicago uses 9% rate. Backend products (VSC, GAP) not taxed when capitalized. " +
      "Doc fee is taxed upfront. Trade-in gets full credit reducing cap cost.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: LIMITED (dealer only)
   *
   * Illinois provides LIMITED reciprocity credits for sales tax paid
   * in other states, but with significant restrictions:
   *
   * Key rules:
   * - Credit ONLY applies if vehicle purchased from a DEALER in another state
   * - NO credit for private party purchases (even with tax paid)
   * - Credit is limited to IL tax rate (cannot exceed what IL would charge)
   * - Requires proof of tax paid (dealer invoice showing tax)
   * - Applies to both retail and lease transactions (if dealer purchase)
   *
   * Example 1 (Dealer):
   * - Vehicle purchased from dealer in IN with 7% tax paid
   * - IL rate is 6.25% (before local)
   * - Customer gets credit up to IL rate (pays difference if local taxes apply)
   *
   * Example 2 (Private Party - NO CREDIT):
   * - Vehicle purchased from private party in WI with tax paid
   * - IL rate is 6.25%
   * - Customer owes FULL IL tax (no credit for private party purchases)
   *
   * This is a UNIQUE restriction - most states don't distinguish between
   * dealer and private party purchases for reciprocity.
   */
  reciprocity: {
    enabled: true, // But limited to dealer purchases only
    scope: "BOTH",
    homeStateBehavior: "CREDIT_UP_TO_STATE_RATE",
    requireProofOfTaxPaid: true,
    basis: "TAX_PAID",
    capAtThisStatesTax: true,
    hasLeaseException: false,
    notes:
      "Illinois provides LIMITED reciprocity - credit ONLY for dealer purchases, " +
      "NOT private party sales. Requires proof of tax paid. Credit capped at IL rate. " +
      "If out-of-state tax exceeds IL tax, no additional tax due. If less, pay difference. " +
      "IMPORTANT: Private party purchases get NO credit regardless of tax paid elsewhere.",
  },

  extras: {
    lastUpdated: "2025-01",
    sources: [
      "Illinois Department of Revenue",
      "35 ILCS 105/3-45 - Use Tax Act (Trade-in Credit)",
      "86 Ill. Adm. Code 130.2075 - Vehicle Sales Tax",
      "Chicago Municipal Code Chapter 3-32 - Lease Transaction Tax",
    ],
    notes:
      "Illinois has some of the highest vehicle tax rates in the US, particularly in Chicago " +
      "(10.25% retail, 10.75% effective on leases due to additional 0.5% lease tax). " +
      "No cap on doc fees. Limited reciprocity - only for dealer purchases, not private party. " +
      "Service contracts and GAP are taxable on retail but NOT on leases.",
    docFeeCapAmount: null, // No state cap on doc fees
    maxCombinedRate: 10.75, // Chicago leases: 10.25% + 0.5% lease tax
    maxRetailRate: 10.25, // Chicago retail
    chicagoLeaseSurcharge: 0.5, // Additional 0.5% lease tax in Chicago only
    majorCityRates: {
      Chicago: 10.25, // 6.25% state + 1.25% city + 1.75% Cook + 1% RTA
      ChicagoLeaseEffective: 10.75, // + 0.5% lease transaction tax
      CookCounty: 9.0, // 6.25% state + 1.75% county + 1% RTA (outside Chicago)
      Typical: 6.25, // State only for most jurisdictions
    },
  },
};

export default US_IL;
