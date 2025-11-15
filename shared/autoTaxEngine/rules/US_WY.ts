import { TaxRulesConfig } from "../types";

/**
 * WYOMING TAX RULES
 *
 * Researched: 2025-11-14
 * Version: 2
 *
 * KEY FACTS:
 * - State sales tax: 4.0% (vehicles)
 * - County/local taxes: Optional, varies (0% to 2%)
 * - Combined range: 4.0% to 6.0%
 * - Trade-in credit: FULL (100% deduction from taxable base)
 * - Manufacturer rebates: NOT taxable (reduce sale price)
 * - Dealer rebates: NOT taxable (if actual price reduction)
 * - Doc fee: TAXABLE, NO CAP (average $200-300, among lowest)
 * - Service contracts & GAP: NOT taxable (services exempt)
 * - Lease taxation: MONTHLY (tax on each payment)
 * - Reciprocity: YES (credit for taxes paid to other states)
 * - NO STATE INCOME TAX: Wyoming relies on sales tax and mineral revenues
 *
 * UNIQUE WYOMING FEATURES:
 * 1. NO STATE INCOME TAX: Like South Dakota, Wyoming has no personal income tax
 * 2. LOW TAX RATES: Among the lowest combined vehicle tax rates in the nation
 * 3. SIMPLE STRUCTURE: Straightforward state + optional county tax
 * 4. LOW DOC FEES: Average $200-300, among the lowest in the nation
 * 5. MINERAL REVENUES: State relies heavily on oil/gas/coal revenues, keeping
 *    sales tax rates low
 * 6. SPARSE POPULATION: Low population density means minimal local tax variations
 *
 * SOURCES:
 * - Wyoming Department of Revenue (revenue.wyo.gov)
 * - Wyoming Department of Transportation (dot.state.wy.us)
 * - Wyoming Statutes Title 39 (Taxation and Revenue)
 * - § 39-15-101 (Sales and Use Tax)
 * - § 39-16-101 (Motor Vehicle Taxes)
 * - WY DOR Sales Tax Guide
 */
export const US_WY: TaxRulesConfig = {
  stateCode: "WY",
  version: 2,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL (100% credit, no cap)
   *
   * Wyoming allows full trade-in credit. The trade-in value is deducted
   * from the purchase price before calculating sales tax.
   *
   * Statutory Basis (WY § 39-15-101):
   * "The sales tax shall not apply to the amount received for property
   * traded in on the purchase of tangible personal property."
   *
   * Example:
   *   Vehicle Price: $30,000
   *   Trade-In Value: $10,000
   *   Taxable Base: $20,000
   *   Sales Tax @ 4.0%: $800
   *
   * Source: WY § 39-15-101, WY DOR Sales Tax Guide
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules:
   *
   * MANUFACTURER REBATES:
   * - NOT taxable (reduce the sale price)
   * - Manufacturer rebates are applied before sales tax calculation
   * - Customer pays tax on the reduced price
   *
   * Example:
   *   Vehicle MSRP: $35,000
   *   Manufacturer Rebate: $3,000
   *   Taxable Base: $32,000
   *   Sales Tax @ 4.0%: $1,280
   *
   * DEALER REBATES:
   * - NOT taxable if actual price reduction
   * - If dealer reduces selling price, tax is on reduced amount
   *
   * Source: WY DOR Sales Tax Guide
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: false,
      notes:
        "Manufacturer rebates reduce the purchase price before sales tax calculation. " +
        "Tax is calculated on the net price after rebate.",
    },
    {
      appliesTo: "DEALER",
      taxable: false,
      notes:
        "Dealer discounts that reduce the actual selling price are not taxable. " +
        "Tax is calculated on the actual reduced selling price.",
    },
  ],

  /**
   * Doc Fee: TAXABLE (no statutory cap)
   *
   * Wyoming dealer documentation fees are subject to sales tax.
   *
   * Cap: NO STATUTORY CAP
   * - Wyoming does not impose a statutory limit on doc fees
   * - Average doc fee: $200-300 (among the lowest in the nation)
   * - Observed range: $150 to $400
   * - Wyoming's low doc fees reflect its business-friendly environment
   *
   * Taxability:
   * Doc fee is included in the taxable base for both state and local taxes.
   *
   * Example:
   *   Doc Fee: $250
   *   Combined Rate: 5.0%
   *   Tax on Doc Fee: $12.50
   *
   * Source: WY DOR Sales Tax Guide
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules
   *
   * Wyoming has straightforward fee taxability:
   *
   * SERVICE CONTRACTS (VSC):
   * - NOT subject to Wyoming sales tax
   * - Services are generally exempt from sales tax
   * - Extended warranties and maintenance agreements not taxable
   *
   * GAP INSURANCE:
   * - NOT subject to sales tax
   * - Treated as insurance product, exempt from sales tax
   *
   * TITLE FEE:
   * - NOT taxable (government fee)
   * - Current title fee: $15
   *
   * REGISTRATION FEES:
   * - NOT taxable (government fees)
   * - Wyoming registration fees are among the lowest in the nation
   *
   * Source: WY DOR Sales Tax Guide
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: false,
      notes:
        "Service contracts (VSC) are NOT subject to Wyoming sales tax. Services are " +
        "generally exempt from sales tax.",
    },
    {
      code: "GAP",
      taxable: false,
      notes: "GAP insurance is NOT taxable in Wyoming. Treated as insurance product.",
    },
    {
      code: "DOC_FEE",
      taxable: true,
      notes:
        "Doc fees ARE TAXABLE at combined rate (state + local). Wyoming has NO cap on " +
        "doc fees. Average $200-300, among lowest in nation.",
    },
    {
      code: "TITLE",
      taxable: false,
      notes: "Title fee ($15) is NOT taxable (government fee).",
    },
    {
      code: "REG",
      taxable: false,
      notes: "Registration fees are not taxable (government fees).",
    },
  ],

  /**
   * Product Taxability
   *
   * Accessories: TAXABLE
   * - Dealer-installed accessories are taxable when sold with vehicle
   * - Subject to combined state and local rate
   *
   * Negative Equity: NOT taxable
   * - Negative equity rolled into loan is not subject to sales tax
   * - Represents debt obligation, not consideration for vehicle
   *
   * Service Contracts: NOT taxable
   * GAP: NOT taxable
   *
   * Example (Negative Equity):
   *   New Vehicle Price: $28,000
   *   Trade-In Value: $10,000
   *   Trade-In Payoff: $13,000
   *   Negative Equity: $3,000
   *
   *   Taxable Base: $18,000 ($28,000 - $10,000)
   *   Sales Tax @ 4.0%: $720
   *   Amount Financed: $18,000 + $720 + $3,000 = $21,720
   *
   * Source: WY DOR Sales Tax Guide
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: false,
  taxOnServiceContracts: false,
  taxOnGap: false,

  /**
   * Vehicle Tax Scheme: STATE_PLUS_LOCAL
   *
   * Wyoming uses state sales tax + optional county/local sales tax.
   *
   * State Sales Tax: 4.0%
   * - Applies to all motor vehicle sales statewide
   * - WY § 39-15-101
   * - Among the lowest state rates in the nation
   *
   * County/Local Sales Tax: 0% to 2%
   * - Optional, varies by county and municipality
   * - Most counties: 1% county tax
   * - Some municipalities add additional 1%
   * - Many rural areas have NO local tax (4% state only)
   *
   * Combined Rates:
   * - Minimum: 4.0% (state only, many rural areas)
   * - Average: 5.0% to 5.5%
   * - Maximum: ~6.0% (state + county + city)
   *
   * Examples:
   * - Cheyenne: 6.0% (4% state + 1% county + 1% city)
   * - Casper: 5.0% (4% state + 1% county)
   * - Laramie: 5.0% (4% state + 1% county)
   * - Jackson: 6.0% (4% state + 1% county + 1% city)
   * - Rural counties: 4.0% (state only)
   *
   * Tax Collection Point:
   * Tax based on dealer location (point of sale).
   *
   * Business-Friendly Environment:
   * Wyoming's low tax rates and simple structure make it one of the most
   * business-friendly states in the nation.
   *
   * Source: WY § 39-15-101, WY DOR Local Option Tax Guide
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
     * Wyoming taxes leases on a MONTHLY basis. Sales tax is charged on
     * each monthly lease payment.
     *
     * Official Guidance (WY DOR):
     * "Sales tax applies to each lease payment made by the lessee. The tax is
     * calculated on the monthly payment amount."
     *
     * State + Local Rate: Same as retail (4.0% state + county/local)
     * - Combined rate 4.0% to 6.0%
     * - Applies to each monthly payment
     *
     * Source: WY § 39-15-101, WY DOR Lease Guide
     */
    method: "MONTHLY",

    /**
     * Cap Cost Reduction: NOT TAXED (on monthly method)
     *
     * Wyoming uses pure monthly taxation. Capitalized cost reductions
     * are NOT taxed separately; only monthly payments are taxed.
     *
     * Down payments, rebates, and trade-ins reduce the capitalized cost,
     * which lowers monthly payments, which reduces total tax paid over the
     * lease term.
     *
     * Source: WY DOR Lease Guide
     */
    taxCapReduction: false,

    /**
     * Rebate Behavior on Leases: FOLLOW_RETAIL_RULE
     *
     * Rebates applied to reduce capitalized cost are not taxed directly.
     * They reduce monthly payments, which are then taxed monthly.
     *
     * Source: WY DOR Lease Guide
     */
    rebateBehavior: "FOLLOW_RETAIL_RULE",

    /**
     * Doc Fee on Leases: FOLLOW_RETAIL_RULE
     *
     * Doc fees on leases are taxable. If capitalized, they increase monthly
     * payments which are then taxed. If paid upfront, they are taxed immediately.
     *
     * Source: WY DOR Lease Guide
     */
    docFeeTaxability: "FOLLOW_RETAIL_RULE",

    /**
     * Trade-in Credit on Leases: FOLLOW_RETAIL_RULE (full credit)
     *
     * Trade-ins on leases receive full credit and reduce the capitalized cost.
     * This lowers monthly payments, reducing total tax over lease term.
     *
     * Example:
     *   Gross Cap Cost: $35,000
     *   Trade-In: $8,000
     *   Net Cap Cost: $27,000
     *   Monthly Payment: $400 (based on $27,000)
     *   Monthly Tax @ 5.0%: $20/month
     *
     * Source: WY DOR Lease Guide
     */
    tradeInCredit: "FOLLOW_RETAIL_RULE",

    /**
     * Negative Equity on Leases: TAXABLE
     *
     * Negative equity increases the capitalized cost, which increases monthly
     * payments, which increases tax paid monthly.
     *
     * Example:
     *   Base Cap Cost: $30,000
     *   Negative Equity: $4,000
     *   Adjusted Cap Cost: $34,000
     *   Monthly Payment: $500 (based on $34,000)
     *   Monthly Tax @ 5.0%: $25/month
     *
     * Source: WY DOR Lease Guide
     */
    negativeEquityTaxable: true,

    /**
     * Fee Taxability on Leases
     *
     * Backend products on leases follow same exemption rules as sales:
     *
     * SERVICE CONTRACTS (VSC): NOT taxable
     * GAP INSURANCE: NOT taxable
     * DOC FEE: TAXABLE (if capitalized, taxed monthly; if upfront, taxed immediately)
     * TITLE FEE: NOT taxable
     *
     * Source: WY DOR Lease Guide
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: true,
        notes: "Doc fee taxable on leases (capitalized or upfront).",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: false,
        notes: "Service contracts NOT taxable on leases.",
      },
      {
        code: "GAP",
        taxable: false,
        notes: "GAP insurance NOT taxable on leases.",
      },
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

    taxFeesUpfront: false,

    specialScheme: "NONE",

    notes:
      "Wyoming: MONTHLY lease taxation. Tax applies to each monthly payment at combined " +
      "state + local rate (4.0% to 6.0%). Cap cost reductions (cash, rebates, trade-in) NOT " +
      "taxed separately - they reduce monthly payments which are then taxed. Backend products " +
      "(VSC, GAP) NOT taxed. Simple, straightforward monthly method.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: YES (credit for taxes paid to other states)
   *
   * Wyoming provides reciprocal credit for sales tax paid to other states.
   *
   * Official Guidance (WY DOR):
   * "A credit is allowed for sales or use tax legally imposed by another state
   * on the same transaction. The credit is limited to the amount of Wyoming
   * tax due."
   *
   * How It Works:
   * - If sales tax paid to another state ≥ WY tax, NO additional WY tax due
   * - If sales tax paid to another state < WY tax, pay the DIFFERENCE
   *
   * Example 1 (Other State Higher Rate):
   *   Vehicle purchased in California: $30,000
   *   California tax paid (7.5%): $2,250
   *   Wyoming tax would be (5.0%): $1,500
   *   Credit allowed: $1,500
   *   Additional WY tax due: $0
   *
   * Example 2 (Other State Lower Rate):
   *   Vehicle purchased in Montana: $30,000
   *   Montana tax paid (0%): $0
   *   Wyoming tax due (5.0%): $1,500
   *   Credit allowed: $0
   *   Additional WY tax due: $1,500
   *
   * Example 3 (Other State Similar Rate):
   *   Vehicle purchased in South Dakota: $30,000
   *   South Dakota tax paid (4.5%): $1,350
   *   Wyoming tax due (5.0%): $1,500
   *   Credit allowed: $1,350
   *   Additional WY tax due: $150 (difference)
   *
   * Credit Cap:
   * Credit cannot exceed the amount of Wyoming tax due. No refunds if
   * other state's tax was higher.
   *
   * Documentation Required:
   * - Bill of sale showing purchase price
   * - Receipt showing taxes paid to other state
   * - Registration application
   *
   * Source: WY § 39-15-101, WY DOR Use Tax Guide
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
      "Wyoming provides credit for sales/use tax paid to other states, capped at WY tax " +
      "amount. Credit applies to both state and local portions. Must provide proof of tax " +
      "paid. Credit limited to WY tax due - no refund if other state's tax was higher.",
  },

  extras: {
    lastUpdated: "2025-11-14",
    sources: [
      "Wyoming Department of Revenue (revenue.wyo.gov)",
      "Wyoming Department of Transportation (dot.state.wy.us)",
      "Wyoming Statutes Title 39 - Taxation and Revenue",
      "WY § 39-15-101 - Sales and Use Tax",
      "WY § 39-16-101 - Motor Vehicle Taxes",
      "WY DOR Sales Tax Guide",
      "WY DOR Local Option Tax Guide",
    ],
    notes:
      "Wyoming has 4.0% state sales tax + optional county/local tax (0-2%) for combined " +
      "4.0% to 6.0%. Among the LOWEST combined rates in the nation. FULL trade-in credit. " +
      "Manufacturer rebates NOT taxable (reduce sale price). Doc fee taxable, NO CAP (avg " +
      "$200-300, among lowest in nation). VSC and GAP NOT taxable. Lease: MONTHLY taxation " +
      "(pure monthly method, no upfront tax on cap reduction). Reciprocity: YES (credit for " +
      "taxes paid to other states). NO STATE INCOME TAX. Business-friendly environment with " +
      "simple tax structure and low rates.",
    stateRate: 4.0,
    countyRateRange: { min: 0, max: 1.0 },
    cityRateRange: { min: 0, max: 1.0 },
    combinedRateRange: { min: 4.0, max: 6.0 },
    avgDocFee: 250,
    titleFee: 15,
    majorJurisdictions: {
      Cheyenne: { state: 4.0, county: 1.0, city: 1.0, total: 6.0 },
      Casper: { state: 4.0, county: 1.0, city: 0, total: 5.0 },
      Laramie: { state: 4.0, county: 1.0, city: 0, total: 5.0 },
      Gillette: { state: 4.0, county: 1.0, city: 0, total: 5.0 },
      RockSprings: { state: 4.0, county: 1.0, city: 0, total: 5.0 },
      Jackson: { state: 4.0, county: 1.0, city: 1.0, total: 6.0 },
      RuralCounties: { state: 4.0, county: 0, city: 0, total: 4.0 },
    },
    uniqueFeatures: [
      "Among lowest doc fees in nation ($200-300)",
      "Among lowest combined tax rates in nation (4.0% to 6.0%)",
      "No state income tax (relies on mineral revenues)",
      "Simple, business-friendly tax structure",
      "Many rural areas have NO local tax (4% state only)",
      "Full reciprocity for out-of-state purchases",
      "Low registration and title fees",
      "Sparse population, minimal tax complexity",
    ],
    economicContext: {
      description:
        "Wyoming's low tax rates are made possible by substantial mineral revenues " +
        "(oil, natural gas, coal, trona). The state has no personal income tax and maintains " +
        "low sales tax rates. This makes Wyoming one of the most tax-friendly states for " +
        "vehicle purchases. Population: ~580,000 (least populous state). Economy heavily " +
        "dependent on energy extraction.",
    },
  },
};

export default US_WY;
