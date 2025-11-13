import { TaxRulesConfig } from "../types";

/**
 * COLORADO TAX RULES
 *
 * Researched: 2025-01
 * Version: 1
 *
 * KEY FACTS:
 * - State sales tax: 2.9% (one of the lowest state rates in the US)
 * - Local rates: YES, varies significantly by jurisdiction (home-rule cities have unique rates)
 * - Trade-in credit: FULL (deducted from sale price before tax)
 * - Doc fee: Taxable, NO CAP (Colorado has no statutory limit on doc fees)
 * - Manufacturer rebates: TAXABLE (Colorado taxes the full purchase price before rebates)
 * - Dealer rebates: Taxable
 * - Service contracts & GAP: Uncertain (appears non-taxable based on insurance treatment)
 * - Lease taxation: HYBRID (≤36 months: lessor pays upfront OR collects monthly; >36 months: MONTHLY only)
 * - Reciprocity: YES (credit for taxes paid elsewhere, capped at CO rate)
 * - RTD Tax: 1.0% in Denver metro (Regional Transportation District for transit funding)
 * - Cultural Facilities District: 0.1% in Denver metro (Scientific & Cultural Facilities)
 *
 * UNIQUE FEATURES:
 * - Home-rule cities (70+ municipalities) can set their own tax rates and rules
 * - RTD and Cultural Facilities District taxes apply in metro Denver area
 * - Lease tax method depends on term length (36 months is the threshold)
 * - Most complex sales tax structure in the nation (per industry consensus)
 * - Vehicle sales tax based on registration location, not sale location
 * - Colorado Springs allows manufacturer rebate deduction ($100+) but state rules don't
 *
 * SOURCES:
 * - Colorado Department of Revenue (tax.colorado.gov)
 * - Colorado Revised Statutes Title 39 (Taxation)
 * - DR 0024 (Standard Sales Tax Receipt for Vehicle Sales)
 * - Sales & Use Tax Topics: Motor Vehicles (November 2021)
 * - Sales & Use Tax Topics: Leases (June 2019)
 */
export const US_CO: TaxRulesConfig = {
  stateCode: "CO",
  version: 1,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL
   *
   * Colorado allows full trade-in credit. The fair market value of the trade-in
   * is excluded from the taxable purchase price, as long as the vehicle is traded
   * as part of the same transaction and ownership is transferred to the dealer.
   *
   * Example: $40,000 vehicle - $15,000 trade-in = $25,000 taxable base
   *
   * Source: Colorado DOR Sales & Use Tax Topics: Motor Vehicles
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules:
   *
   * - Manufacturer rebates: TAXABLE - sales tax calculated on full purchase price
   * - Dealer rebates: TAXABLE - same treatment as manufacturer rebates
   *
   * Colorado taxes the FULL purchase price before any rebate reduction. This differs
   * from many states that allow manufacturer rebates to reduce the taxable base.
   *
   * Exception: Colorado Springs (home-rule city) allows manufacturer rebates of $100+
   * to reduce the taxable purchase price for its local sales tax (not state tax).
   *
   * Source: Colorado DOR Sales & Use Tax Topics: Motor Vehicles
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: true,
      notes:
        "Colorado calculates sales tax on full purchase price before manufacturer rebates. " +
        "Colorado Springs (home-rule) allows rebate deduction for local tax only.",
    },
    {
      appliesTo: "DEALER",
      taxable: true,
      notes: "Dealer incentives and rebates do not reduce the taxable sale price",
    },
  ],

  /**
   * Doc Fee: TAXABLE, NO CAP
   *
   * Colorado documentation fees are:
   * 1. Taxable as part of the sale (non-optional fees are taxable)
   * 2. NOT capped by state law (dealers can charge any amount)
   *
   * Average doc fee in Colorado: $490-$508 (among the highest in the nation)
   *
   * Source: Colorado Automobile Dealers Association (CADA)
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules:
   *
   * - Service contracts: Likely NOT taxable (treated as insurance products)
   * - GAP insurance: Likely NOT taxable (insurance product)
   * - Title fee: NOT taxable (government fee)
   * - Registration fee: NOT taxable (government fee)
   * - Mandatory dealer fees: TAXABLE (delivery, prep, handling fees)
   *
   * Note: Colorado regulations state that optional extended warranties and GAP
   * are not subject to sales tax (DR 0024 instructions reference). Service
   * contracts sold by dealers are likely treated as insurance contracts and
   * thus exempt from sales tax.
   *
   * Source: DR 0024N Instructions, Colorado sales tax regulations
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: false,
      notes:
        "Service contracts and extended warranties are not taxable per DR 0024 instructions " +
        "(treated as insurance products)",
    },
    {
      code: "GAP",
      taxable: false,
      notes:
        "GAP insurance is not taxable per DR 0024 instructions (insurance product)",
    },
    { code: "TITLE", taxable: false, notes: "DMV title fee is not taxable" },
    { code: "REG", taxable: false, notes: "DMV registration fee is not taxable" },
  ],

  /**
   * Product Taxability:
   *
   * - Accessories: Taxable (parts and accessories sold and installed are taxable)
   * - Negative equity: Taxable (included in full amount paid or promised)
   * - Service contracts: NOT taxable (insurance product)
   * - GAP: NOT taxable (insurance product)
   *
   * Colorado regulations state that "the purchase price includes the full amount
   * paid, or promised to be paid" for the vehicle. Negative equity rolled into
   * the financed amount increases the total amount paid and is thus taxable.
   *
   * Source: Colorado DOR Sales & Use Tax Topics: Motor Vehicles
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: true,
  taxOnServiceContracts: false, // CO treats VSC as insurance (not taxable)
  taxOnGap: false, // CO treats GAP as insurance (not taxable)

  /**
   * Vehicle Tax Scheme: STATE_PLUS_LOCAL
   *
   * Colorado has one of the most complex sales tax structures in the US:
   * - State base rate: 2.9%
   * - RTD (Regional Transportation District): 1.0% in Denver metro
   * - Cultural Facilities District: 0.1% in Denver metro
   * - County rates: Varies (0.25% - 1.5%)
   * - City rates: Varies (0% - 5.15%)
   *
   * Home-rule cities (70+ municipalities) administer their own sales taxes and
   * can define their own tax bases, which often differ from state-administered
   * jurisdictions.
   *
   * Vehicle sales tax is based on the REGISTRATION location, not the sale location.
   *
   * Examples:
   * - Denver: 2.9% state + 5.15% Denver + 1.0% RTD + 0.1% Cultural = 9.15% total
   * - Aurora: 2.9% state + 3.75% Aurora + 1.0% RTD + 0.1% Cultural + 0.25% Arapahoe = 8.0% total
   * - Colorado Springs: 2.9% state + varies by specific location
   *
   * Source: DR 1002 (Colorado Sales/Use Tax Rates)
   */
  vehicleTaxScheme: "STATE_PLUS_LOCAL",
  vehicleUsesLocalSalesTax: true,

  // ============================================================================
  // LEASE TRANSACTION RULES
  // ============================================================================

  leaseRules: {
    /**
     * Lease Method: HYBRID (term-dependent)
     *
     * Colorado has unique lease taxation rules based on lease term:
     *
     * LEASES ≤ 36 MONTHS:
     * - Lessor has TWO options:
     *   A) Pay sales/use tax UPFRONT on acquisition cost (FULL_UPFRONT method)
     *   B) Collect sales tax on each lease payment (MONTHLY method)
     * - Lessor must handle all leases consistently (can't mix methods)
     *
     * LEASES > 36 MONTHS:
     * - MUST use MONTHLY method (tax collected on each payment)
     * - No upfront option available
     *
     * This implementation defaults to MONTHLY as it's the universal method.
     * Dealers who elect to pay upfront on short leases should note this in
     * their rooftop configuration.
     *
     * Source: Colorado Sales & Use Tax Topics: Leases (Revised July 2020)
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
     * When using MONTHLY method:
     * - Manufacturer rebates reduce cap cost (lower payment, lower tax)
     * - Dealer rebates treated same as retail (taxable, don't reduce base)
     *
     * When lessor pays UPFRONT (≤36 month option):
     * - Lessor pays tax on acquisition cost
     * - Rebates don't affect tax (already paid on vehicle cost)
     */
    rebateBehavior: "FOLLOW_RETAIL_RULE",

    /**
     * Doc Fee on Leases: FOLLOW_RETAIL_RULE
     *
     * Documentation fees on leases are taxable (same as retail) and are
     * typically taxed upfront (capitalized or paid at signing).
     */
    docFeeTaxability: "FOLLOW_RETAIL_RULE",

    /**
     * Trade-in Credit on Leases: FOLLOW_RETAIL_RULE
     *
     * Trade-ins on leases receive full credit and reduce the capitalized cost,
     * lowering monthly payments and thus monthly tax (when using MONTHLY method).
     *
     * When lessor pays upfront tax (≤36 month option), trade-in still reduces
     * the cap cost but doesn't affect tax (tax already paid on vehicle cost).
     */
    tradeInCredit: "FOLLOW_RETAIL_RULE",

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
     * - Service contracts: NOT taxable (insurance product)
     * - GAP: NOT taxable (insurance product)
     * - Title: Not taxable
     * - Registration: Not taxable
     *
     * Same treatment as retail - service contracts and GAP are not taxed.
     */
    feeTaxRules: [
      { code: "DOC_FEE", taxable: true, notes: "Doc fee taxed upfront on lease" },
      {
        code: "SERVICE_CONTRACT",
        taxable: false,
        notes: "Service contracts not taxed (insurance product)",
      },
      {
        code: "GAP",
        taxable: false,
        notes: "GAP not taxed (insurance product)",
      },
      { code: "TITLE", taxable: false },
      { code: "REG", taxable: false },
    ],

    /**
     * Title Fee Rules on Leases:
     *
     * Title fees:
     * - Not taxable
     * - Included in cap cost (or paid upfront)
     * - Not spread across monthly payments
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
     * Taxable fees (like doc fee) are taxed upfront on leases, not spread
     * across monthly payments.
     */
    taxFeesUpfront: true,

    /**
     * Special Scheme: CO_HOME_RULE_LEASE
     *
     * Colorado's home-rule cities may have different lease tax rules than
     * state-administered jurisdictions. Additionally, the ≤36 month vs >36 month
     * distinction creates a unique hybrid system.
     *
     * This scheme signals to the interpreter to check:
     * 1. Lease term length (36 month threshold)
     * 2. Lessor's elected method for short-term leases
     * 3. Home-rule city special rules (if applicable)
     */
    specialScheme: "CO_HOME_RULE_LEASE",

    notes:
      "Colorado lease taxation depends on term length: ≤36 months allows lessor to choose " +
      "between paying upfront tax on acquisition OR collecting tax on payments. Leases >36 months " +
      "MUST collect tax on payments. Home-rule cities may have different rules. " +
      "RTD and Cultural Facilities District taxes apply in Denver metro area.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: ENABLED (Limited)
   *
   * Colorado provides limited reciprocity for motor vehicle sales tax paid
   * in other states:
   *
   * - If you paid sales tax in another state, Colorado will give you credit
   * - Credit is capped at the Colorado tax rate (2.9% state + applicable local)
   * - Requires proof of tax paid (receipt, title, registration)
   * - Applies to both retail and lease transactions
   *
   * When a vehicle is purchased out-of-state and brought to Colorado for
   * registration, the buyer must pay Colorado use tax. However, any sales tax
   * paid to the other state is credited against the Colorado use tax due.
   *
   * Example:
   * - Buy vehicle in Arizona (AZ tax: 5.6%)
   * - Register in Colorado (CO tax: 2.9% state + 1.0% RTD + 0.1% Cultural = 4.0% total)
   * - Credit: 4.0% (capped at CO rate)
   * - Owe CO: $0 (credit covers full CO tax)
   *
   * Source: Colorado DOR Motor Vehicle Sales Tax guidance, CRS 39-26-103
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
      "Colorado provides credit for sales tax paid in other states, capped at CO rate (2.9% state + local). " +
      "Requires proof of tax paid (receipt, title, registration). Credit applies to state AND local tax. " +
      "If other state's rate exceeds Colorado's rate, no additional tax is owed.",
  },

  extras: {
    lastUpdated: "2025-01",
    sources: [
      "Colorado Department of Revenue (tax.colorado.gov)",
      "Colorado Revised Statutes Title 39 - Taxation",
      "DR 0024 - Standard Sales Tax Receipt for Vehicle Sales",
      "Sales & Use Tax Topics: Motor Vehicles (November 2021)",
      "Sales & Use Tax Topics: Leases (July 2020)",
      "DR 1002 - Colorado Sales/Use Tax Rates (January 2025)",
    ],
    notes:
      "Colorado has one of the most complex sales tax structures in the US with 70+ home-rule " +
      "cities that set their own rates. State base rate is 2.9% (low), but total rates vary " +
      "significantly by jurisdiction (4% - 11%+). RTD (1.0%) and Cultural Facilities (0.1%) " +
      "taxes apply in Denver metro. No cap on doc fees. Manufacturer rebates are taxable " +
      "(unlike most states). Lease taxation depends on term length (36 month threshold). " +
      "Service contracts and GAP are NOT taxed (insurance products).",
    stateRate: 2.9,
    rtdRate: 1.0, // Denver metro Regional Transportation District
    culturalRate: 0.1, // Denver metro Scientific & Cultural Facilities District
    docFeeCapAmount: null, // No cap
    averageDocFee: 490,
    maxCombinedRate: 11.0, // Theoretical max in highest-tax home-rule cities
    leaseTermThreshold: 36, // Months - determines available tax methods
  },
};

export default US_CO;
