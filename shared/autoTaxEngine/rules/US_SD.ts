import type { TaxRulesConfig } from "../types";

/**
 * SOUTH DAKOTA TAX RULES
 *
 * Researched: 2025-11-14
 * Version: 2
 *
 * KEY FACTS:
 * - State sales tax: 4.0% (later reduced to 4.2% with special taxes included)
 * - Municipal sales tax: Optional, varies by jurisdiction (0% to 2%)
 * - Combined range: 4.0% to 6.5%
 * - Trade-in credit: FULL (100% deduction from taxable base)
 * - Manufacturer rebates: NOT taxable (reduce sale price)
 * - Dealer rebates: NOT taxable (if actual price reduction)
 * - Doc fee: TAXABLE, NO CAP (average $200-250, among lowest in nation)
 * - Service contracts & GAP: NOT taxable (services exempt)
 * - Lease taxation: MONTHLY (tax on each payment)
 * - Reciprocity: YES (credit for taxes paid to other states, capped)
 * - Excise tax: SEPARATE annual tax (4% of original purchase price, first year)
 *
 * UNIQUE SOUTH DAKOTA FEATURES:
 * 1. NO STATE INCOME TAX: South Dakota funds government primarily through sales tax
 * 2. EXCISE TAX SYSTEM: Annual vehicle excise tax separate from sales tax
 *    - Year 1: 4% of vehicle value
 *    - Year 2: 3% of vehicle value
 *    - Year 3: 2% of vehicle value
 *    - Year 4+: 1% of vehicle value
 * 3. LOW DOC FEES: Among the lowest average doc fees in the nation
 * 4. SIMPLE TAX STRUCTURE: Straightforward sales tax, minimal complexity
 * 5. TRIBAL EXEMPTIONS: Enrolled tribal members on reservations may be exempt
 *
 * SOURCES:
 * - South Dakota Department of Revenue (dor.sd.gov)
 * - SDCL Title 10 (Taxation)
 * - § 10-46 (Motor Vehicle Excise Tax)
 * - § 10-45 (Sales and Use Tax)
 * - SD DOR Motor Vehicle Manual
 */
export const US_SD: TaxRulesConfig = {
  stateCode: "SD",
  version: 2,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL (100% credit, no cap)
   *
   * South Dakota allows full trade-in credit. The trade-in value is deducted
   * from the purchase price before calculating sales tax.
   *
   * Statutory Basis (SDCL § 10-45):
   * "The tax imposed by this chapter does not apply to the gross receipts from
   * the sale of a motor vehicle to the extent that the price is paid by trading
   * in another motor vehicle."
   *
   * Example:
   *   Vehicle Price: $30,000
   *   Trade-In Value: $10,000
   *   Taxable Base: $20,000
   *   Sales Tax @ 4.5%: $900
   *
   * Source: SDCL § 10-45-4, SD DOR Motor Vehicle Manual
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
   *   Sales Tax @ 4.5%: $1,440
   *
   * DEALER REBATES:
   * - NOT taxable if actual price reduction
   * - If dealer reduces selling price, tax is on reduced amount
   *
   * Source: SD DOR Sales Tax Guide
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
   * South Dakota dealer documentation fees are subject to sales tax.
   *
   * Cap: NO STATUTORY CAP
   * - South Dakota does not impose a statutory limit on doc fees
   * - Average doc fee: $200-250 (among the lowest in the nation)
   * - Observed range: $150 to $400
   *
   * Taxability:
   * Doc fee is included in the taxable base for both state and municipal taxes.
   *
   * Example:
   *   Doc Fee: $250
   *   Combined Rate: 4.5%
   *   Tax on Doc Fee: $11.25
   *
   * Source: SD DOR Sales Tax Guide
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules
   *
   * South Dakota has clear guidance on fee taxability:
   *
   * SERVICE CONTRACTS (VSC):
   * - NOT subject to South Dakota sales tax
   * - Services are generally exempt from sales tax
   * - Extended warranties and maintenance agreements not taxable
   *
   * GAP INSURANCE:
   * - NOT subject to sales tax
   * - Treated as insurance product, exempt from sales tax
   *
   * TITLE FEE:
   * - NOT taxable (government fee)
   * - Current title fee varies by county
   *
   * REGISTRATION FEES:
   * - NOT taxable (government fees)
   *
   * EXCISE TAX:
   * - SEPARATE annual tax (not subject to sales tax)
   * - Based on vehicle value, decreases each year
   *
   * Source: SD DOR Sales Tax Guide
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: false,
      notes:
        "Service contracts (VSC) are NOT subject to South Dakota sales tax. Services are " +
        "generally exempt from sales tax.",
    },
    {
      code: "GAP",
      taxable: false,
      notes: "GAP insurance is NOT taxable in South Dakota. Treated as insurance product.",
    },
    {
      code: "DOC_FEE",
      taxable: true,
      notes:
        "Doc fees ARE TAXABLE at combined rate (state + municipal). South Dakota has NO " +
        "cap on doc fees. Average $200-250, among lowest in nation.",
    },
    {
      code: "TITLE",
      taxable: false,
      notes: "Title fee is NOT taxable (government fee).",
    },
    {
      code: "REG",
      taxable: false,
      notes: "Registration fees are not taxable (government fees).",
    },
    {
      code: "EXCISE",
      taxable: false,
      notes: "Motor vehicle excise tax is a separate annual tax, not subject to sales tax.",
    },
  ],

  /**
   * Product Taxability
   *
   * Accessories: TAXABLE
   * - Dealer-installed accessories are taxable when sold with vehicle
   * - Subject to combined state and municipal rate
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
   *   Sales Tax @ 4.5%: $810
   *   Amount Financed: $18,000 + $810 + $3,000 = $21,810
   *
   * Source: SD DOR Motor Vehicle Manual
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: false,
  taxOnServiceContracts: false,
  taxOnGap: false,

  /**
   * Vehicle Tax Scheme: STATE_PLUS_LOCAL
   *
   * South Dakota uses state sales tax + optional municipal sales tax.
   *
   * State Sales Tax: 4.0%
   * - Applies to all motor vehicle sales statewide
   * - SDCL § 10-45
   *
   * Municipal Sales Tax: 0% to 2%
   * - Optional, varies by municipality
   * - Most common municipal rates: 1% to 2%
   * - Major cities (Sioux Falls, Rapid City) typically add 2%
   *
   * Combined Rates:
   * - Minimum: 4.0% (state only, no municipal tax)
   * - Average: 4.5% to 6.0%
   * - Maximum: ~6.5% (state + municipal + special districts)
   *
   * Examples:
   * - Sioux Falls: 6.5% (4% state + 2% city + 0.5% special)
   * - Rapid City: 6.0% (4% state + 2% city)
   * - Aberdeen: 6.0% (4% state + 2% city)
   * - Rural areas: 4.0% (state only)
   *
   * Tax Collection Point:
   * Tax based on dealer location (point of sale).
   *
   * Source: SDCL § 10-45, SD DOR Municipal Sales Tax Guide
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
     * South Dakota taxes leases on a MONTHLY basis. Sales tax is charged on
     * each monthly lease payment.
     *
     * Official Guidance (SD DOR):
     * "Sales tax applies to each lease payment made by the lessee. The tax is
     * calculated on the monthly payment amount."
     *
     * State + Municipal Rate: Same as retail (4.0% state + municipal)
     * - Combined rate 4.0% to 6.5%
     * - Applies to each monthly payment
     *
     * Source: SDCL § 10-45, SD DOR Lease Taxation Guide
     */
    method: "MONTHLY",

    /**
     * Cap Cost Reduction: NOT TAXED (on monthly method)
     *
     * South Dakota uses pure monthly taxation. Capitalized cost reductions
     * are NOT taxed separately; only monthly payments are taxed.
     *
     * Down payments, rebates, and trade-ins reduce the capitalized cost,
     * which lowers monthly payments, which reduces total tax paid over the
     * lease term.
     *
     * Source: SD DOR Lease Taxation Guide
     */
    taxCapReduction: false,

    /**
     * Rebate Behavior on Leases: FOLLOW_RETAIL_RULE
     *
     * Rebates applied to reduce capitalized cost are not taxed directly.
     * They reduce monthly payments, which are then taxed monthly.
     *
     * Source: SD DOR Lease Taxation Guide
     */
    rebateBehavior: "FOLLOW_RETAIL_RULE",

    /**
     * Doc Fee on Leases: FOLLOW_RETAIL_RULE
     *
     * Doc fees on leases are taxable. If capitalized, they increase monthly
     * payments which are then taxed. If paid upfront, they are taxed immediately.
     *
     * Source: SD DOR Lease Taxation Guide
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
     *   Monthly Tax @ 4.5%: $18/month
     *
     * Source: SD DOR Lease Taxation Guide
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
     *   Monthly Tax @ 4.5%: $22.50/month
     *
     * Source: SD DOR Lease Taxation Guide
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
     * Source: SD DOR Lease Taxation Guide
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
      "South Dakota: MONTHLY lease taxation. Tax applies to each monthly payment at " +
      "combined state + municipal rate (4.0% to 6.5%). Cap cost reductions (cash, rebates, " +
      "trade-in) NOT taxed separately - they reduce monthly payments which are then taxed. " +
      "Backend products (VSC, GAP) NOT taxed. Simple, straightforward monthly method.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: YES (credit for taxes paid to other states)
   *
   * South Dakota provides reciprocal credit for sales tax paid to other states.
   *
   * Official Guidance (SD DOR):
   * "A credit is allowed for sales or use tax legally imposed by another state
   * on the same transaction. The credit is limited to the amount of South Dakota
   * tax due."
   *
   * How It Works:
   * - If sales tax paid to another state ≥ SD tax, NO additional SD tax due
   * - If sales tax paid to another state < SD tax, pay the DIFFERENCE
   *
   * Example 1 (Other State Higher Rate):
   *   Vehicle purchased in California: $30,000
   *   California tax paid (7.5%): $2,250
   *   South Dakota tax would be (4.5%): $1,350
   *   Credit allowed: $1,350
   *   Additional SD tax due: $0
   *
   * Example 2 (Other State Lower Rate):
   *   Vehicle purchased in Montana: $30,000
   *   Montana tax paid (0%): $0
   *   South Dakota tax due (4.5%): $1,350
   *   Credit allowed: $0
   *   Additional SD tax due: $1,350
   *
   * Credit Cap:
   * Credit cannot exceed the amount of South Dakota tax due. No refunds if
   * other state's tax was higher.
   *
   * Documentation Required:
   * - Bill of sale showing purchase price
   * - Receipt showing taxes paid to other state
   * - Registration application
   *
   * Source: SDCL § 10-45, SD DOR Motor Vehicle Manual
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
      "South Dakota provides credit for sales/use tax paid to other states, capped at SD " +
      "tax amount. Credit applies to both state and municipal portions. Must provide proof " +
      "of tax paid. Credit limited to SD tax due - no refund if other state's tax was higher.",
  },

  extras: {
    lastUpdated: "2025-11-14",
    sources: [
      "South Dakota Department of Revenue (dor.sd.gov)",
      "South Dakota Codified Laws (SDCL) Title 10 - Taxation",
      "SDCL § 10-45 - Sales and Use Tax",
      "SDCL § 10-46 - Motor Vehicle Excise Tax",
      "SD DOR Motor Vehicle Manual",
      "SD DOR Sales Tax Guide",
      "SD DOR Municipal Sales Tax Guide",
    ],
    notes:
      "South Dakota has 4.0% state sales tax + optional municipal tax (0-2%) for combined " +
      "4.0% to 6.5%. FULL trade-in credit. Manufacturer rebates NOT taxable (reduce sale price). " +
      "Doc fee taxable, NO CAP (avg $200-250, among lowest in nation). VSC and GAP NOT taxable. " +
      "Lease: MONTHLY taxation (pure monthly method, no upfront tax on cap reduction). SEPARATE " +
      "annual excise tax: Year 1 = 4% of value, decreases annually. Reciprocity: YES (credit for " +
      "taxes paid to other states). Tribal members on reservations may be exempt from state sales tax.",
    stateRate: 4.0,
    municipalRateRange: { min: 0, max: 2.5 },
    combinedRateRange: { min: 4.0, max: 6.5 },
    avgDocFee: 225,
    majorJurisdictions: {
      SiuxFalls: { state: 4.0, municipal: 2.5, total: 6.5 },
      RapidCity: { state: 4.0, municipal: 2.0, total: 6.0 },
      Aberdeen: { state: 4.0, municipal: 2.0, total: 6.0 },
      Brookings: { state: 4.0, municipal: 2.0, total: 6.0 },
      Watertown: { state: 4.0, municipal: 2.0, total: 6.0 },
    },
    exciseTaxSchedule: {
      year1: 4.0,
      year2: 3.0,
      year3: 2.0,
      year4plus: 1.0,
      description:
        "Annual motor vehicle excise tax, separate from sales tax. Based on vehicle " +
        "value, paid at registration. Year 1: 4%, Year 2: 3%, Year 3: 2%, Year 4+: 1%.",
    },
    uniqueFeatures: [
      "Among lowest average doc fees in nation ($200-250)",
      "Simple, straightforward tax structure",
      "No state income tax (relies on sales tax revenue)",
      "Separate annual excise tax system (decreases over time)",
      "Full reciprocity for out-of-state purchases",
      "Tribal exemptions for enrolled members on reservations",
    ],
  },
};

export default US_SD;
