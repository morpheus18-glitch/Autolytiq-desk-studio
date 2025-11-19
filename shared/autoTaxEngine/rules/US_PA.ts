import { TaxRulesConfig } from "../types";

/**
 * PENNSYLVANIA TAX RULES
 *
 * Researched: 2025-01
 * Version: 1
 *
 * KEY FACTS:
 * - State sales tax rate: 6%
 * - Local rates: YES - Allegheny County adds 1% (total 7%), Philadelphia adds 2% (total 8%)
 * - Trade-in credit: FULL (deducted from sale price before tax calculation)
 * - Doc fee: NOT taxable, capped at $464 (electronic) or $387 (non-electronic) for 2025
 * - Manufacturer rebates: NOT taxable (reduce purchase price before tax)
 * - Dealer rebates: NOT taxable (reduce purchase price before tax)
 * - Service contracts (VSC): TAXABLE (considered prepayment for taxable services)
 * - GAP insurance: NOT taxable on retail purchases, TAXABLE on leases
 * - Accessories: TAXABLE (included in purchase price)
 * - Negative equity: Taxable (TODO: Verify - appears to be included in financed amount)
 * - Lease taxation: MONTHLY (6% sales tax + 3% motor vehicle lease tax = 9% total)
 * - Reciprocity: YES ⚠️ MUTUAL CREDIT REQUIRED - Only grants credit if origin state reciprocates
 *
 * UNIQUE FEATURES:
 * - Pennsylvania has a 3% motor vehicle lease tax IN ADDITION to the 6% sales tax on leases
 * - Combined 9% tax on lease payments (6% + 3%)
 * - Doc fees are NOT taxable (unlike many states) and have annual CPI-adjusted caps
 * - GAP insurance treated differently on retail (not taxable) vs. lease (taxable)
 * - Reciprocity requires MUTUAL CREDIT - PA only gives credit if the other state would reciprocate
 * - Manufacturer AND dealer rebates both reduce taxable amount (uncommon - many states tax dealer rebates)
 * - Local tax limited to only 2 jurisdictions: Philadelphia (+2%) and Allegheny County (+1%)
 *
 * SOURCES:
 * - Pennsylvania Department of Revenue
 * - 61 Pa. Code § 31.44 (Computation of tax)
 * - 61 Pa. Code § 31.15 (Reciprocal credit for taxes paid other states)
 * - 61 Pa. Code § 47.17 (Lease or rental of vehicles and rolling stock)
 * - 61 Pa. Code § 51.4 (Remittances for payment of sales tax on certain vehicles)
 * - Pennsylvania Sales and Use Tax Credit Chart (REV-227)
 * - PA Department of Revenue Customer Service FAQs
 */
export const US_PA: TaxRulesConfig = {
  stateCode: "PA",
  version: 1,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL
   *
   * Pennsylvania allows full trade-in credit per 61 Pa. Code § 31.44.
   * The trade-in allowance is deducted from the purchase price before
   * calculating sales tax, provided the trade-in occurs at the same time
   * as the sale.
   *
   * REQUIREMENTS:
   * - Trade-in must be part of the same transaction
   * - Vehicle being traded must be registered in the name of the purchaser
   * - Trade-in credit applies only to dealer transactions (not private sales)
   *
   * Example: $40,000 vehicle - $15,000 trade-in = $25,000 taxable base
   * At 6% tax: $1,500 sales tax (saves $900 vs. taxing full $40,000)
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules:
   *
   * - Manufacturer rebates: NOT taxable - reduce the sale price before tax
   * - Dealer rebates: NOT taxable - reduce the sale price before tax
   *
   * IMPORTANT: Pennsylvania is UNCOMMON in that BOTH manufacturer and dealer
   * rebates reduce the taxable amount. Many states tax dealer rebates but not
   * manufacturer rebates. Pennsylvania treats both types the same - they
   * reduce the purchase price before tax calculation.
   *
   * Example: $30,000 vehicle with $2,500 manufacturer rebate and $1,000
   * dealer rebate = $26,500 taxable base (both rebates deducted).
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: false,
      notes:
        "Manufacturer rebates reduce purchase price before tax calculation per PA DOR guidance",
    },
    {
      appliesTo: "DEALER",
      taxable: false,
      notes:
        "Dealer rebates ALSO reduce purchase price before tax (uncommon - most states tax dealer rebates)",
    },
  ],

  /**
   * Doc Fee: NOT TAXABLE
   *
   * Documentation fees in Pennsylvania are:
   * 1. NOT subject to sales tax (excluded from taxable amount)
   * 2. Capped annually based on Federal Consumer Price Index (CPI)
   * 3. For 2025: $464 maximum (electronic processing) or $387 (non-electronic)
   * 4. Negotiable - may not be pre-printed on buyer's order
   * 5. Must be disclosed on dealership signage
   *
   * The cap is adjusted annually and dealers cannot exceed the legal limit
   * or face potential enforcement action by the Attorney General.
   *
   * Pennsylvania is one of the states where doc fees are NOT taxable,
   * which benefits consumers.
   */
  docFeeTaxable: false,

  /**
   * Fee Taxability Rules:
   *
   * - Service contracts (VSC): TAXABLE - Considered prepayment for taxable services
   *   per 61 Pa. Code § 31.5 (Persons rendering taxable services)
   * - GAP insurance: NOT taxable on retail purchases (taxable only on leases)
   * - Accessories: TAXABLE - Included in purchase price per 61 Pa. Code § 31.44
   * - Title fee: NOT taxable (government fee)
   * - Registration fee: NOT taxable (government fee)
   *
   * IMPORTANT: GAP insurance treatment differs between retail and lease:
   * - Retail purchase: GAP is NOT taxable
   * - Lease transaction: GAP IS taxable
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: true,
      notes:
        "Service contracts are taxable as prepayment for services to tangible personal property (61 Pa. Code § 31.5)",
    },
    {
      code: "GAP",
      taxable: false,
      notes:
        "GAP insurance is NOT taxable on retail purchases (but IS taxable on leases)",
    },
    { code: "TITLE", taxable: false, notes: "DMV title fee ($58) is not taxable" },
    { code: "REG", taxable: false, notes: "DMV registration fee is not taxable" },
  ],

  /**
   * Product Taxability:
   *
   * - Accessories: TAXABLE - Dealer-installed accessories are included in
   *   the taxable purchase price even if separately stated on invoice
   *   (61 Pa. Code § 31.44)
   * - Negative equity: Taxable (TODO: Verify - research indicates it's
   *   rolled into financed amount and appears to be part of taxable base,
   *   but specific PA DOR guidance not found)
   * - Service contracts: TAXABLE on retail
   * - GAP: NOT taxable on retail (taxable on leases)
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: true, // TODO: Verify with PA DOR - appears taxable but needs confirmation
  taxOnServiceContracts: true,
  taxOnGap: false, // Not taxable on RETAIL (but taxable on LEASES)

  /**
   * Vehicle Tax Scheme: STATE_PLUS_LOCAL
   *
   * Pennsylvania vehicle sales tax structure:
   * - State base rate: 6%
   * - Local rates: Only in 2 jurisdictions:
   *   • Allegheny County: +1% (total 7%)
   *   • Philadelphia: +2% (total 8%)
   * - All other 65 counties: 6% (state only)
   *
   * Tax is based on the location where the vehicle is registered
   * (buyer's residence), not where it is sold.
   *
   * Motor vehicle sales tax is paid directly to PennDOT (Pennsylvania
   * Department of Transportation), which acts as a collection agent for
   * the Department of Revenue.
   *
   * IMPORTANT: Pennsylvania may apply tax based on fair market value if
   * the stated purchase price appears unusually low (Motor Vehicle
   * Understated Value Program).
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
     * Pennsylvania taxes leases on a MONTHLY basis per 61 Pa. Code § 47.17.
     *
     * CRITICAL: Pennsylvania imposes BOTH:
     * 1. 6% sales tax on each monthly lease payment
     * 2. 3% motor vehicle lease tax (separate tax for leases 30+ days)
     *
     * COMBINED RATE: 9% total tax on each monthly payment
     *
     * The 3% Motor Vehicle Lease Tax is imposed on the total lease price
     * for leases of 30 days or more, in addition to the standard 6% sales tax.
     * Both taxes apply to:
     * - Down payments (taxed upfront at 9%)
     * - Monthly lease payments (taxed monthly at 9%)
     *
     * This is a unique Pennsylvania feature - most states either use sales
     * tax OR a lease tax, not both simultaneously.
     */
    method: "MONTHLY",

    /**
     * Cap Cost Reduction: NOT taxed directly
     *
     * Cap cost reductions (down payments, trade-ins, rebates applied to
     * reduce capitalized cost) reduce the monthly payment, which in turn
     * reduces the tax paid monthly at the 9% combined rate.
     */
    taxCapReduction: false,

    /**
     * Rebate Behavior on Leases: FOLLOW_RETAIL_RULE
     *
     * - Manufacturer rebates reduce cap cost (not taxed, lower monthly payment)
     * - Dealer rebates reduce cap cost (not taxed, lower monthly payment)
     *
     * Since both manufacturer and dealer rebates are non-taxable on retail
     * in PA, this treatment carries over to leases.
     */
    rebateBehavior: "FOLLOW_RETAIL_RULE",

    /**
     * Doc Fee on Leases: NEVER taxable
     *
     * Documentation fees on leases are NOT taxable in Pennsylvania,
     * consistent with retail treatment. The same caps apply:
     * - $464 maximum (electronic processing)
     * - $387 maximum (non-electronic processing)
     */
    docFeeTaxability: "NEVER",

    /**
     * Trade-in Credit on Leases: FULL
     *
     * Trade-ins on leases receive full credit and reduce the capitalized
     * cost, thereby reducing monthly payments and the 9% combined tax
     * (6% sales tax + 3% lease tax) paid on those payments.
     *
     * Same requirements as retail:
     * - Trade-in must be part of same transaction
     * - Must be registered in purchaser's name
     */
    tradeInCredit: "FULL",

    /**
     * Negative Equity on Leases: Taxable
     *
     * Negative equity rolled into a lease increases the capitalized cost,
     * increases monthly payments, and thus increases the 9% tax paid monthly.
     *
     * TODO: Verify - this follows general principle but specific PA DOR
     * guidance on negative equity in leases not confirmed.
     */
    negativeEquityTaxable: true,

    /**
     * Fee Taxability on Leases:
     *
     * - Doc fee: NOT taxable (consistent with retail)
     * - Service contracts: TAXABLE when capitalized into lease
     * - GAP: TAXABLE when capitalized into lease
     * - Title: Not taxable
     * - Registration: Not taxable
     *
     * IMPORTANT: Pennsylvania treats GAP differently on leases vs. retail:
     * - Retail: GAP is NOT taxable
     * - Lease: GAP IS taxable
     *
     * Service contracts are taxable in both retail and lease scenarios.
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: false,
        notes: "Doc fee NOT taxed on leases (max $464 electronic, $387 non-electronic)",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: true,
        notes:
          "Service contracts ARE taxed when capitalized into lease (consistent with retail)",
      },
      {
        code: "GAP",
        taxable: true,
        notes:
          "GAP TAXABLE on leases (unlike retail where it's not taxable)",
      },
      { code: "TITLE", taxable: false },
      { code: "REG", taxable: false },
    ],

    /**
     * Title Fee Rules on Leases:
     *
     * Title processing fees ($58):
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
     * Any fees that are taxable (like GAP and service contracts on leases)
     * are typically taxed upfront when capitalized into the lease, though
     * the monthly lease payment itself (which includes amortized fees) is
     * taxed monthly.
     */
    taxFeesUpfront: true,

    /**
     * Special Scheme: PA_LEASE_TAX
     *
     * Pennsylvania has a unique dual-tax structure for leases:
     * - 6% sales tax (standard)
     * - 3% motor vehicle lease tax (special for leases 30+ days)
     * - Total: 9% combined rate
     *
     * This is implemented in the special scheme PA_LEASE_TAX which adds
     * the additional 3% lease tax on top of standard sales tax calculations.
     */
    specialScheme: "PA_LEASE_TAX",

    notes:
      "Pennsylvania lease taxation: MONTHLY payment method with DUAL TAX STRUCTURE. " +
      "6% sales tax + 3% motor vehicle lease tax = 9% total tax on each monthly payment. " +
      "Both taxes apply to down payments and monthly payments. " +
      "GAP insurance is TAXABLE on leases (but NOT on retail purchases). " +
      "Service contracts are taxable on both retail and leases. " +
      "Doc fee is NOT taxable and capped at $464 (electronic) or $387 (non-electronic). " +
      "Trade-in gets full credit reducing cap cost. " +
      "Local tax (+1% Allegheny, +2% Philadelphia) also applies to leases.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: ENABLED with MUTUAL CREDIT REQUIREMENT
   *
   * Pennsylvania provides reciprocity credits for sales tax paid in other
   * states, BUT ONLY IF the other state grants a similar credit for PA tax.
   *
   * CRITICAL REQUIREMENT: MUTUAL CREDIT
   * Pennsylvania law allows credit "provided the other state grants a
   * substantially similar credit for sales tax paid to Pennsylvania."
   * This means PA will NOT give credit unless the origin state would
   * reciprocate if the transaction were reversed.
   *
   * Credit Calculation:
   * - Amount = tax paid to reciprocal state
   * - Capped at PA's rate: 6% statewide, 7% Allegheny County, 8% Philadelphia
   *
   * Documentation Required:
   * - Must provide proof of tax paid in the other state
   * - Attach tax receipt from reciprocal state to title application
   *
   * Non-Reciprocal States (confirmed via REV-227 chart):
   * Per PA Department of Revenue, states that do NOT grant credit for PA
   * vehicle sales tax include (but not limited to):
   * - New Mexico
   * - North Dakota
   * - Oklahoma
   * - South Dakota (uses excise tax, not sales tax on vehicles)
   * - West Virginia (for motor vehicles specifically)
   *
   * States with Reciprocal Agreements (confirmed via REV-227):
   * - Indiana
   * - Maryland
   * - New Jersey
   * - Ohio
   * - Virginia
   * (See REV-227 form for complete current list)
   *
   * Mutual Credit Verification:
   * When processing a cross-state deal, MUST verify current reciprocity
   * status using Form REV-227 (PA Sales and Use Tax Credit Chart) to
   * ensure the origin state currently provides mutual credit.
   */
  reciprocity: {
    enabled: true,
    scope: "BOTH", // Applies to both retail and lease transactions

    /**
     * Home State Behavior: CREDIT_UP_TO_STATE_RATE
     *
     * Pennsylvania will credit tax paid to reciprocal states, but caps
     * the credit at Pennsylvania's own tax rate:
     * - 6% for most of PA
     * - 7% in Allegheny County
     * - 8% in Philadelphia
     *
     * Example: If you paid 7% tax in Ohio and register in PA (non-Philly/
     * Allegheny), PA will credit you $600 per $10,000 (6% cap), and you'd
     * owe PA the remaining $0 since 6% cap matches PA's rate.
     */
    homeStateBehavior: "CREDIT_UP_TO_STATE_RATE",

    /**
     * Proof Required: YES
     *
     * Pennsylvania requires documentation proving tax was paid in the
     * other state. Must attach tax receipt to title application.
     */
    requireProofOfTaxPaid: true,

    /**
     * Basis: TAX_PAID
     *
     * Credit is based on actual tax PAID to the other state, not merely
     * what would have been due.
     */
    basis: "TAX_PAID",

    /**
     * Cap at This State's Tax: YES
     *
     * Credit cannot exceed what Pennsylvania would have charged on the
     * same transaction (6%, 7%, or 8% depending on county).
     */
    capAtThisStatesTax: true,

    /**
     * Lease Exception: NO
     *
     * Reciprocity rules apply consistently to both retail and lease
     * transactions in Pennsylvania.
     */
    hasLeaseException: false,

    /**
     * Pairwise Reciprocity Overrides:
     *
     * These handle states with special reciprocity relationships or
     * non-reciprocal status with Pennsylvania.
     */
    overrides: [
      {
        originState: "WV",
        disallowCredit: true,
        notes:
          "West Virginia does NOT grant credit for PA sales tax on motor vehicles, " +
          "therefore PA does not grant credit for WV tax (mutual credit requirement)",
      },
      {
        originState: "SD",
        disallowCredit: true,
        notes:
          "South Dakota uses excise tax (not sales tax) on motor vehicles and does NOT " +
          "grant credit for PA sales tax, therefore PA does not grant credit",
      },
      {
        originState: "NM",
        disallowCredit: true,
        notes:
          "New Mexico does NOT grant reciprocal credit for PA motor vehicle sales tax " +
          "per REV-227 chart",
      },
      {
        originState: "ND",
        disallowCredit: true,
        notes:
          "North Dakota does NOT grant reciprocal credit for PA motor vehicle sales tax " +
          "per REV-227 chart",
      },
      {
        originState: "OK",
        disallowCredit: true,
        notes:
          "Oklahoma does NOT grant reciprocal credit for PA motor vehicle sales tax " +
          "per REV-227 chart",
      },
    ],

    notes:
      "Pennsylvania REQUIRES MUTUAL CREDIT for reciprocity. Will only grant credit " +
      "for tax paid to states that would reciprocate for PA tax. Must verify current " +
      "reciprocity status using Form REV-227 (PA Sales and Use Tax Credit Chart). " +
      "Credit is capped at PA's rate (6% statewide, 7% Allegheny, 8% Philadelphia). " +
      "Proof of tax paid is required (attach receipt to title application). " +
      "Known non-reciprocal states for motor vehicles: WV, SD, NM, ND, OK. " +
      "Confirmed reciprocal states: IN, MD, NJ, OH, VA (see REV-227 for complete list).",
  },

  // ============================================================================
  // EXTRAS & METADATA
  // ============================================================================

  extras: {
    lastUpdated: "2025-01",
    researchedBy: "Tax Research Specialist",
    sources: [
      "Pennsylvania Department of Revenue",
      "61 Pa. Code § 31.44 - Computation of tax",
      "61 Pa. Code § 31.15 - Reciprocal credit for taxes paid other states",
      "61 Pa. Code § 47.17 - Lease or rental of vehicles and rolling stock",
      "61 Pa. Code § 51.4 - Remittances for payment of sales tax on certain vehicles",
      "61 Pa. Code § 31.5 - Persons rendering taxable services",
      "Pennsylvania Sales and Use Tax Credit Chart (REV-227)",
      "PA DOR Customer Service FAQs",
      "PA Motor Vehicle Understated Value Program guidance",
    ],
    notes:
      "Pennsylvania has 6% state sales tax with local tax only in Philadelphia (+2% = 8% total) " +
      "and Allegheny County (+1% = 7% total). All other 65 counties are 6% only. " +
      "Doc fees are NOT taxable and capped at $464 (electronic) or $387 (non-electronic) for 2025 " +
      "(adjusted annually by CPI). Both manufacturer AND dealer rebates reduce taxable amount " +
      "(uncommon - most states tax dealer rebates). Full trade-in credit available. " +
      "LEASES: DUAL TAX STRUCTURE with 6% sales tax + 3% motor vehicle lease tax = 9% total " +
      "on monthly payments. GAP is NOT taxable on retail but IS taxable on leases. " +
      "Service contracts are taxable on both retail and leases. " +
      "RECIPROCITY: Requires MUTUAL CREDIT - PA only gives credit if origin state would reciprocate. " +
      "Use Form REV-227 to verify current reciprocal status. Credit capped at PA's rate.",

    // Pennsylvania-specific configuration values
    stateRate: 6.0, // Base state sales tax rate (percentage)
    alleghenyCountyRate: 7.0, // State + Allegheny County local (6% + 1%)
    philadelphiaRate: 8.0, // State + Philadelphia local (6% + 2%)
    leaseMotorVehicleTaxRate: 3.0, // Additional lease tax (percentage)
    combinedLeaseRate: 9.0, // 6% sales tax + 3% lease tax
    docFeeCapElectronic2025: 464, // Maximum doc fee for electronic processing (2025)
    docFeeCapNonElectronic2025: 387, // Maximum doc fee for non-electronic processing (2025)
    docFeeAdjustedAnnuallyByCPI: true,
    titleFee: 58, // PA title fee (dollars)
    registrationBaseFee: 39, // Base registration fee (dollars)

    // Jurisdictions with local sales tax
    localTaxJurisdictions: {
      "Allegheny County": 1.0, // +1% local
      Philadelphia: 2.0, // +2% local
    },

    // Reciprocity tracking (from REV-227)
    reciprocalStates: [
      "IN", // Indiana
      "MD", // Maryland
      "NJ", // New Jersey
      "OH", // Ohio
      "VA", // Virginia
      // NOTE: See REV-227 form for complete current list - this is not exhaustive
    ],
    nonReciprocalStates: [
      "WV", // West Virginia (motor vehicles)
      "SD", // South Dakota
      "NM", // New Mexico
      "ND", // North Dakota
      "OK", // Oklahoma
      // NOTE: See REV-227 form for complete current list - this is not exhaustive
    ],
    reciprocityFormReference: "REV-227",
    reciprocityVerificationRequired:
      "Must verify current status using Form REV-227 before granting credit",

    // Important notes for implementation
    implementationNotes: [
      "TODO: Verify negative equity taxability - appears taxable but needs PA DOR confirmation",
      "Must implement PA_LEASE_TAX special scheme to add 3% lease tax on top of 6% sales tax",
      "Doc fee caps are adjusted annually - verify current year caps from PA DOR",
      "Reciprocity requires checking REV-227 chart - do not assume state is reciprocal",
      "Motor Vehicle Understated Value Program may override stated purchase price if suspiciously low",
      "Trade-in vehicle must be registered in purchaser's name to qualify for credit",
      "Both state sales tax AND lease tax apply to leases - unique to Pennsylvania",
      "GAP insurance treatment differs: not taxable on retail, taxable on leases",
    ],
  },
};

export default US_PA;
