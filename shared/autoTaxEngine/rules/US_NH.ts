import type { TaxRulesConfig } from "../types";

/**
 * NEW HAMPSHIRE TAX RULES
 *
 * Researched: 2025-11-14
 * Version: 1
 *
 * KEY FACTS:
 * - NO SALES TAX (one of 5 states: NH, OR, DE, MT, AK)
 * - NO LEASE TAX on long-term leases (12+ months)
 * - Rental tax: 9% on SHORT-TERM rentals (< 12 months)
 * - Title fee: $25.00 (not taxable, no sales tax exists)
 * - Registration fees: Based on vehicle age/weight (not taxable)
 * - Trade-in credit: N/A (no sales tax to calculate)
 * - Doc fee: Not regulated, not taxed (no sales tax)
 * - Service contracts: Not taxed (no sales tax)
 * - GAP insurance: Not taxed (no sales tax)
 * - Reciprocity: Not applicable (NH provides no tax credit since there's no sales tax)
 *
 * UNIQUE NEW HAMPSHIRE FEATURES:
 * 1. NO SALES TAX STATE:
 *    - New Hampshire is one of five states with no general sales tax
 *    - Vehicle purchases are tax-free at point of sale
 *    - This makes NH attractive for vehicle purchases by out-of-state buyers
 *    - However, buyers must pay tax in their home state upon registration
 *
 * 2. RENTAL TAX ON SHORT-TERM RENTALS:
 *    - 9% Meals and Rentals Tax applies to short-term vehicle rentals
 *    - "Short-term" defined as less than 12 months
 *    - Daily, weekly, monthly rentals are subject to 9% tax
 *    - Long-term leases (12+ months) are generally EXEMPT
 *
 * 3. REGISTRATION FEE STRUCTURE:
 *    - Registration fees based on vehicle age and weight
 *    - Year 1: $31.20 per $1,000 of MSRP (new vehicles)
 *    - Year 2: $27.00 per $1,000 of MSRP
 *    - Year 3: $22.80 per $1,000 of MSRP
 *    - Fees decrease with vehicle age
 *    - Minimum fee: $40 (vehicles 10+ years old)
 *
 * 4. OUT-OF-STATE BUYER ADVANTAGE:
 *    - Out-of-state buyers pay $0 sales tax in NH
 *    - Must pay home state use tax upon registration
 *    - NH dealers can sell to any state resident tax-free
 *    - Home state collects tax when vehicle is registered
 *
 * 5. NO DOC FEE REGULATION:
 *    - New Hampshire does not cap dealer documentation fees
 *    - Average doc fee: ~$399 (varies by dealer)
 *    - Doc fees not subject to tax (no sales tax exists)
 *
 * 6. TITLE FEE:
 *    - Flat $25.00 title fee
 *    - Not taxable (no sales tax)
 *    - Required for all vehicle transfers
 *
 * 7. DEALERSHIP COMPETITIVE ADVANTAGE:
 *    - NH dealers attract buyers from high-tax states (MA, VT, ME)
 *    - Border effect: Massachusetts (6.25%), Vermont (6%)
 *    - Buyers save on upfront costs but owe home state tax
 *
 * TAX CALCULATION FORMULA (RETAIL):
 * Sales Tax = $0
 * Total Due = Vehicle Price - Trade-In + Doc Fee + Title Fee + Registration Fee
 *
 * Example (Massachusetts buyer purchasing in NH):
 * $30,000 vehicle + $399 doc fee + $25 title + $120 temp reg
 * NH Tax Due: $0
 * Total Due in NH: $30,544
 * Upon MA registration: Pay MA use tax 6.25% on $30,000 = $1,875
 *
 * LEASE CALCULATION (LONG-TERM, 12+ MONTHS):
 * Monthly Tax = $0
 * Rental Tax = Not applicable (long-term lease exempt)
 * Customer pays base monthly payment only
 *
 * RENTAL CALCULATION (SHORT-TERM, < 12 MONTHS):
 * Rental Tax = Daily/Weekly/Monthly Rental Amount × 9%
 * This applies to traditional car rentals, not standard auto leases
 *
 * Example (Daily Rental):
 * Daily rental rate: $75/day × 3 days = $225
 * Rental tax (9%): $225 × 9% = $20.25
 * Total due: $245.25
 *
 * SOURCES:
 * - New Hampshire Department of Revenue Administration (DRA) - revenue.nh.gov
 * - NH Revised Statutes Annotated (RSA) Title V, Chapter 78
 * - RSA 78-A: Meals and Rentals Tax
 * - RSA 261: Motor Vehicles (Title and Registration)
 * - NH Division of Motor Vehicles - nh.gov/dmv
 * - National Conference of State Legislatures (NCSL) - State Sales Tax Rates
 * - Tax Foundation - Facts & Figures: State Tax Rates
 */
export const US_NH: TaxRulesConfig = {
  stateCode: "NH",
  version: 1,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL (but effectively N/A - no sales tax)
   *
   * New Hampshire has no sales tax, so trade-in credit is not applicable.
   * The trade-in value simply reduces the net amount the customer pays.
   *
   * Legal Framework:
   * New Hampshire does not impose a sales tax on vehicle purchases.
   * Article 5 of the NH Constitution prohibits "sales tax or income tax"
   * (though this has been interpreted to allow specific excise taxes).
   *
   * Transaction Treatment:
   * - Customer pays: Vehicle Price - Trade-In Value + Fees
   * - No tax calculation needed
   * - Trade-in value reduces out-of-pocket cost
   *
   * Example:
   *   Vehicle Price: $30,000
   *   Trade-In Value: $10,000
   *   Net Price: $20,000
   *   Sales Tax: $0
   *   Total Due: $20,000 + fees
   *
   * Note for Out-of-State Buyers:
   * Even though NH charges no sales tax, buyers must pay use tax in their
   * home state. The trade-in credit may or may not apply depending on the
   * buyer's home state rules.
   *
   * Source: NH Constitution Part II, Article 5; NH RSA Title V
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules: Non-taxable (but effectively N/A - no sales tax)
   *
   * Since New Hampshire has no sales tax, manufacturer and dealer rebates
   * simply reduce the purchase price without tax implications.
   *
   * MANUFACTURER REBATES:
   * - Reduce the customer's purchase price
   * - No tax calculation (NH has no sales tax)
   * - Customer pays net price after rebate
   *
   * DEALER REBATES:
   * - Same treatment as manufacturer rebates
   * - Reduce final selling price
   * - No tax implications
   *
   * Example:
   *   MSRP: $25,000
   *   Manufacturer Rebate: $2,000
   *   Customer Pays: $23,000
   *   NH Sales Tax: $0
   *   Total Cost: $23,000 + fees
   *
   * Out-of-State Impact:
   * When out-of-state buyers register the vehicle in their home state,
   * rebate treatment depends on home state rules. Some states tax the
   * full MSRP, others tax the net price after rebates.
   *
   * Source: No NH statutes apply (no sales tax)
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: false,
      notes:
        "NH has no sales tax. Manufacturer rebates simply reduce purchase price. Out-of-state " +
        "buyers should check home state rebate taxability rules.",
    },
    {
      appliesTo: "DEALER",
      taxable: false,
      notes:
        "NH has no sales tax. Dealer rebates reduce selling price with no tax implications.",
    },
  ],

  /**
   * Doc Fee: Not taxable (NH has no sales tax)
   *
   * Documentation fees are not subject to tax in New Hampshire because
   * the state has no general sales tax.
   *
   * No Statutory Cap:
   * New Hampshire does not impose a statutory limit on dealer documentation
   * fees.
   * - Average doc fee: ~$399 (2024 data)
   * - Observed range: $250 to $599
   * - Dealers set their own fees
   *
   * Treatment:
   * Doc fee is added to the total purchase price but not taxed.
   *
   * Example:
   *   Vehicle Price: $28,000
   *   Doc Fee: $399
   *   Total Before Tax: $28,399
   *   Sales Tax: $0
   *   Total Due: $28,399
   *
   * Comparison:
   * NH's lack of sales tax means doc fees cost exactly the stated amount,
   * unlike high-tax states where a $399 doc fee might cost $425+ after tax.
   *
   * Source: No specific NH regulation; industry data
   */
  docFeeTaxable: false,

  /**
   * Fee Taxability Rules
   *
   * New Hampshire has no sales tax, so none of these fees are taxable.
   *
   * SERVICE CONTRACTS (VSC):
   * - NOT subject to sales tax (NH has no sales tax)
   * - Customer pays face value of contract
   *
   * GAP INSURANCE:
   * - NOT subject to sales tax (NH has no sales tax)
   * - Treated as insurance product
   *
   * TITLE FEE:
   * - $25.00 flat fee
   * - NOT taxable (government fee, no sales tax)
   *
   * REGISTRATION FEES:
   * - Based on vehicle age and MSRP
   * - NOT taxable (government fees)
   * - Year 1: $31.20 per $1,000 of MSRP
   * - Decreases with age
   *
   * DOC FEE:
   * - NOT taxable (NH has no sales tax)
   * - No cap (average ~$399)
   *
   * Source: NH RSA 261 (Motor Vehicles); no sales tax statutes
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: false,
      notes:
        "Service contracts (VSC) are NOT subject to tax. NH has no sales tax. Customer pays " +
        "face value of contract.",
    },
    {
      code: "GAP",
      taxable: false,
      notes:
        "GAP insurance is NOT taxable. NH has no sales tax. Treated as insurance product.",
    },
    {
      code: "DOC_FEE",
      taxable: false,
      notes:
        "Doc fees are NOT taxable. NH has no sales tax. No statutory cap (avg ~$399).",
    },
    {
      code: "TITLE",
      taxable: false,
      notes:
        "Title fee ($25) is NOT taxable. Government fee, NH has no sales tax.",
    },
    {
      code: "REG",
      taxable: false,
      notes:
        "Registration fees are NOT taxable. Government fees based on vehicle age/MSRP.",
    },
  ],

  /**
   * Product Taxability
   *
   * New Hampshire has no sales tax, so all products are non-taxable.
   *
   * Accessories: Not taxed (NH has no sales tax)
   * Negative Equity: Not taxed (added to loan, no sales tax)
   * Service Contracts: Not taxed (NH has no sales tax)
   * GAP: Not taxed (NH has no sales tax)
   *
   * Note: While accessories, service contracts, and other products are
   * not taxed in NH, out-of-state buyers may owe tax on these items
   * when registering in their home state.
   *
   * Example:
   *   Vehicle: $30,000 + Accessories: $3,000 = $33,000
   *   NH Tax: $0
   *   Total Due: $33,000 + fees
   *
   *   Same purchase by MA buyer:
   *   Upon MA registration: $33,000 × 6.25% = $2,062.50 MA use tax
   *
   * Source: No NH sales tax statutes apply
   */
  taxOnAccessories: false,
  taxOnNegativeEquity: false,
  taxOnServiceContracts: false,
  taxOnGap: false,

  /**
   * Vehicle Tax Scheme: STATE_ONLY (but $0 rate)
   *
   * New Hampshire has no state or local sales tax on vehicles.
   * The "STATE_ONLY" designation indicates there are no local taxes,
   * but the effective rate is 0%.
   *
   * Fees Instead of Tax:
   * While NH has no sales tax, vehicle transactions involve:
   * - Title fee: $25
   * - Registration fee: Based on MSRP and age
   * - Municipal registration fee: Varies by city/town (optional)
   * - These are FEES, not taxes
   *
   * Registration Fee Calculation:
   * Year 1 (new vehicle): MSRP × $31.20 per $1,000
   * Year 2: MSRP × $27.00 per $1,000
   * Year 3: MSRP × $22.80 per $1,000
   * Years 4-9: Continues to decrease
   * Year 10+: $40 minimum
   *
   * Example:
   *   $30,000 vehicle, Year 1
   *   Registration: ($30,000 / $1,000) × $31.20 = $936
   *   (This is a REGISTRATION FEE, not a sales tax)
   *
   * Source: NH RSA 261:141, 261:153
   */
  vehicleTaxScheme: "STATE_ONLY",
  vehicleUsesLocalSalesTax: false,

  // ============================================================================
  // LEASE TRANSACTION RULES
  // ============================================================================

  leaseRules: {
    /**
     * Lease Method: MONTHLY (but $0 rate for long-term leases)
     *
     * New Hampshire does NOT tax long-term vehicle leases (12+ months).
     *
     * Legal Framework (NH RSA 78-A: Meals and Rentals Tax):
     * "The rental of a motor vehicle for a period of one year or more is
     * exempt from the meals and rentals tax."
     *
     * Short-Term Rentals (< 12 months):
     * - Subject to 9% Meals and Rentals Tax
     * - Applies to daily, weekly, monthly rentals
     * - Traditional car rental companies collect this tax
     *
     * Long-Term Leases (12+ months):
     * - EXEMPT from Meals and Rentals Tax
     * - Standard auto leases (24, 36, 39 months) are NOT taxed
     * - Customer pays only base monthly payment
     *
     * Example (36-month lease):
     *   Monthly Payment: $450
     *   NH Lease Tax: $0 (exempt, > 12 months)
     *   Total Monthly: $450
     *
     * Example (Daily Rental):
     *   Daily Rental: $75/day × 3 days = $225
     *   Rental Tax (9%): $20.25
     *   Total: $245.25
     *
     * Source: NH RSA 78-A:3, II(g); NH RSA 78-A:6
     */
    method: "MONTHLY",

    /**
     * Cap Cost Reduction: Not taxed (long-term leases exempt)
     *
     * Since long-term leases (12+ months) are exempt from NH rental tax,
     * cap cost reductions are not subject to tax.
     *
     * Treatment:
     * - Cash down payments: Not taxed
     * - Manufacturer rebates: Not taxed
     * - Trade-in equity: Not taxed
     * - Cap reductions simply reduce capitalized cost
     *
     * Example:
     *   Gross Cap Cost: $35,000
     *   Cap Reduction (cash): $5,000
     *   Adjusted Cap Cost: $30,000
     *   Tax on Cap Reduction: $0 (long-term lease exempt)
     *
     * Note: Short-term rentals (< 12 months) would be taxed at 9% on
     * the rental amount, but this doesn't apply to standard auto leases.
     *
     * Source: NH RSA 78-A:3, II(g)
     */
    taxCapReduction: false,

    /**
     * Rebate Behavior on Leases: NON_TAXABLE_IF_AT_SIGNING
     *
     * Manufacturer rebates applied to leases are not taxed because
     * long-term leases (12+ months) are exempt from NH rental tax.
     *
     * Treatment:
     * - Rebates reduce capitalized cost
     * - No tax on rebate amount
     * - Lowers monthly payment without tax impact
     *
     * Source: NH RSA 78-A:3, II(g)
     */
    rebateBehavior: "NON_TAXABLE_IF_AT_SIGNING",

    /**
     * Doc Fee on Leases: NEVER taxed
     *
     * Dealer documentation fees on leases are not taxed in NH because:
     * 1. Long-term leases are exempt from rental tax
     * 2. NH has no sales tax
     *
     * Treatment:
     * - Doc fee charged at lease inception
     * - No tax applied
     * - Customer pays face value
     *
     * Example:
     *   Doc Fee: $399
     *   Tax: $0
     *   Total: $399
     *
     * Source: NH RSA 78-A:3, II(g); no sales tax
     */
    docFeeTaxability: "NEVER",

    /**
     * Trade-in Credit on Leases: FULL (but no tax benefit, lease already exempt)
     *
     * Trade-ins on leases reduce the capitalized cost but provide no tax
     * benefit because long-term leases are already exempt from tax.
     *
     * Treatment:
     * - Trade-in reduces gross cap cost
     * - Lowers monthly payment
     * - No tax savings (lease not taxed anyway)
     *
     * Example:
     *   Gross Cap Cost: $40,000
     *   Trade-In: $10,000
     *   Adjusted Cap Cost: $30,000
     *   Tax Impact: $0 (lease exempt from tax)
     *
     * Source: NH RSA 78-A:3, II(g)
     */
    tradeInCredit: "FULL",

    /**
     * Negative Equity on Leases: Not taxable (lease exempt)
     *
     * Negative equity rolled into a lease increases the capitalized cost
     * but is not subject to tax because long-term leases are exempt.
     *
     * Example:
     *   Base Cap Cost: $30,000
     *   Negative Equity: $3,000
     *   Adjusted Cap Cost: $33,000
     *   Tax on Negative Equity: $0 (lease exempt)
     *
     * Source: NH RSA 78-A:3, II(g)
     */
    negativeEquityTaxable: false,

    /**
     * Fee Taxability on Leases
     *
     * All fees are non-taxable on NH leases because:
     * 1. Long-term leases exempt from rental tax
     * 2. NH has no sales tax
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: false,
        notes: "Doc fee NOT taxed (long-term lease exempt, no sales tax)",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: false,
        notes: "Service contracts NOT taxed (no sales tax)",
      },
      {
        code: "GAP",
        taxable: false,
        notes: "GAP NOT taxed (no sales tax)",
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
      "New Hampshire: Long-term leases (12+ months) are EXEMPT from the 9% Meals and Rentals Tax. " +
      "Standard auto leases (24, 36, 39 months) have NO tax on monthly payments, cap cost " +
      "reductions, or any fees. Short-term rentals (< 12 months) are subject to 9% rental tax. " +
      "NH has no sales tax, so backend products (VSC, GAP) are also not taxed.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: Not applicable (NH has no sales tax)
   *
   * New Hampshire does not provide tax credits because it has no sales
   * or use tax to begin with.
   *
   * Impact on Out-of-State Buyers:
   *
   * Buying FROM NH:
   * - Out-of-state buyers pay $0 sales tax in NH
   * - Must pay use tax in home state upon registration
   * - Home state determines tax treatment (rate, trade-in credit, etc.)
   * - NH provides no tax documents (no tax was collected)
   *
   * Buying IN NH (by NH resident):
   * - NH residents pay $0 sales tax
   * - No use tax (NH has no use tax)
   * - Only pay title, registration, and doc fees
   *
   * NH Residents Buying Out-of-State:
   * - If sales tax paid to another state, NH provides NO credit
   * - NH has no tax to credit against
   * - NH residents should avoid paying sales tax in other states
   * - Can request exemption certificate for interstate sales
   *
   * Documentation:
   * NH dealers should provide buyers with:
   * - Bill of sale showing vehicle price
   * - Proof of NH purchase (for home state exemption or use tax)
   * - Note that no NH sales tax was collected
   *
   * Example (Massachusetts buyer purchasing in NH):
   *   Purchase in NH: $30,000 vehicle
   *   NH Sales Tax: $0
   *   Total Paid in NH: $30,000 + fees
   *
   *   Upon MA Registration:
   *   MA Use Tax Due: $30,000 × 6.25% = $1,875
   *   No credit for NH tax (none was paid)
   *
   * Example (NH resident purchasing in Massachusetts):
   *   Purchase in MA: $30,000 vehicle
   *   MA Sales Tax: $1,875 (if dealer collects)
   *   NH Use Tax: $0 (NH has no use tax)
   *   No refund available
   *   Recommendation: Use NH exemption certificate to avoid MA tax
   *
   * Source: No NH reciprocity statutes (no sales/use tax)
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
      "NH has NO sales or use tax, so reciprocity does not apply. Out-of-state buyers pay $0 " +
      "in NH but owe use tax to their home state upon registration. NH provides no tax credit " +
      "because no tax exists. NH residents purchasing out-of-state should use NH exemption " +
      "certificate to avoid paying other states' sales tax (no credit available from NH).",
  },

  extras: {
    lastUpdated: "2025-11-14",
    sources: [
      "New Hampshire Department of Revenue Administration (DRA) - revenue.nh.gov",
      "NH Revised Statutes Annotated (RSA) Title V - Taxation",
      "NH RSA 78-A: Meals and Rentals Tax",
      "NH RSA 78-A:3, II(g): Long-term lease exemption",
      "NH RSA 261: Motor Vehicles - Title and Registration",
      "NH RSA 261:141: Registration fees",
      "NH Constitution Part II, Article 5: Taxation",
      "NH Division of Motor Vehicles - nh.gov/dmv",
      "National Conference of State Legislatures (NCSL) - State Tax Data",
      "Tax Foundation - Facts & Figures: State Tax Rates",
      "Federation of Tax Administrators - State Sales Tax Rates",
    ],
    notes:
      "New Hampshire has NO state sales tax and NO local sales tax - one of five states without sales tax " +
      "(Live Free or Die). Vehicle purchases have absolutely zero sales tax at point of sale. However, " +
      "out-of-state buyers must pay use tax in their home state upon registration. Long-term leases " +
      "(12+ months) are EXEMPT from the 9% Meals and Rentals Tax. Short-term rentals (< 12 months) " +
      "are subject to 9% rental tax. registration fees exist separately and are based on vehicle age " +
      "and MSRP (Year 1: $31.20 per $1,000). Title fee: $25. No doc fee cap (avg ~$399). Rate is 0% " +
      "statewide. NH dealers attract buyers from high-tax border states (MA, VT, ME).",
    stateSalesRate: 0,
    stateRentalTaxRate: 9.0,
    rentalTaxExemptionThreshold: "12 months",
    titleFee: 25.0,
    registrationFeeFormula: {
      year1: "$31.20 per $1,000 MSRP",
      year2: "$27.00 per $1,000 MSRP",
      year3: "$22.80 per $1,000 MSRP",
      year10plus: "$40 minimum",
    },
    avgDocFee: 399,
    noSalesTaxStates: ["NH", "OR", "DE", "MT", "AK"],
    borderStates: {
      Massachusetts: { salesTaxRate: 6.25 },
      Vermont: { salesTaxRate: 6.0 },
      Maine: { salesTaxRate: 5.5 },
    },
    neighboringStates: {
      Massachusetts: { salesTaxRate: 6.25 },
      Vermont: { salesTaxRate: 6.0 },
      Maine: { salesTaxRate: 5.5 },
    },
  },
};

export default US_NH;
