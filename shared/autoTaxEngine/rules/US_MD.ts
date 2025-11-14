import { TaxRulesConfig } from "../types";

/**
 * MARYLAND (MD) TAX RULES - AI-Researched Implementation
 *
 * Researched: 2025-11-13
 * Version: 2
 *
 * KEY FACTS:
 * - State excise tax rate: 6.5% (as of July 1, 2025, increased from 6.0%)
 * - Local taxes: NONE (Maryland has NO local vehicle taxes - state-only rate)
 * - Trade-in credit: NONE (ELIMINATED by HB 754, effective July 1, 2024)
 * - Manufacturer rebates: TAXABLE (do NOT reduce tax base)
 * - Dealer rebates: TAXABLE (do NOT reduce tax base)
 * - Doc fee: TAXABLE, capped at $800 (as of July 1, 2024)
 * - Service contracts (VSC): TAXABLE (treated as part of vehicle transaction)
 * - GAP insurance: TAXABLE (treated as part of vehicle transaction)
 * - Lease method: FULL_UPFRONT (6.5% tax calculated on total vehicle value, can be spread into payments)
 * - Reciprocity: YES (credit for taxes paid to other states, with 60-day window)
 *
 * CRITICAL MARYLAND CHANGES (2024-2025):
 * 1. HB 754 (2024): ELIMINATED trade-in allowance effective July 1, 2024
 *    - Prior: Trade-in value reduced taxable base
 *    - Now: Tax calculated on full purchase price (NO trade-in credit)
 *    - Fiscal Impact: $21.4M additional annual revenue
 *
 * 2. HB 352 (2025): INCREASED excise tax rate effective July 1, 2025
 *    - Prior: 6.0%
 *    - Now: 6.5%
 *    - Applies to both purchases and leases
 *
 * 3. SB 362 (2024): INCREASED doc fee cap effective July 1, 2024
 *    - Prior: $500
 *    - Now: $800
 *
 * UNIQUE MARYLAND FEATURES:
 * 1. NO TRADE-IN CREDIT (eliminated 2024):
 *    - Maryland is one of few states with NO trade-in allowance
 *    - Buyers pay 6.5% on full purchase price regardless of trade-in value
 *    - Example: $40,000 vehicle with $15,000 trade-in = tax on $40,000 (not $25,000)
 *    - Similar to California, New Jersey in having no trade credit
 *
 * 2. MANUFACTURER REBATES FULLY TAXABLE:
 *    - Tax calculated on price BEFORE rebates applied
 *    - Example: $30,000 vehicle with $3,000 rebate = tax on $30,000 (not $27,000)
 *    - Customer pays $27,000 but taxed on $30,000
 *
 * 3. LEASE TAXATION - UPFRONT ON FULL VALUE:
 *    - 6.5% calculated on total vehicle value at lease inception
 *    - Tax can be paid upfront OR capitalized into monthly payments
 *    - Different from monthly payment states (CA, IN)
 *    - Similar to New Jersey upfront method
 *
 * 4. RECIPROCITY WITH TIME LIMIT:
 *    - Credit for taxes paid in other states
 *    - MUST title within 60 days of Maryland residency
 *    - After 60 days: NO credit (pay full MD tax + other state tax)
 *    - Credit calculation:
 *      * Other state ≥ 6.5%: Pay $100 minimum MD tax
 *      * Other state < 6.5%: Pay difference
 *      * No-tax state (MT, OR, DE, NH): Pay full 6.5%
 *
 * 5. STATE-ONLY TAX (no local stacking):
 *    - Single 6.5% rate statewide
 *    - NO county or municipal vehicle taxes
 *    - Simplifies calculation vs. states with local rates
 *
 * TAX CALCULATION FORMULA (RETAIL):
 * Taxable Base = Vehicle Price + Accessories + Doc Fee + Rebates (NO trade-in deduction)
 * State Tax = Taxable Base × 6.5%
 * Total Tax = State Tax (no local taxes)
 *
 * Example (Effective July 2025):
 * $35,000 vehicle + $700 doc fee + $2,000 manufacturer rebate - $10,000 trade-in
 * Taxable Base: $35,000 + $700 + $2,000 = $37,700 (trade-in does NOT reduce base)
 * Tax: $37,700 × 6.5% = $2,450.50
 * Customer Pays: $35,000 + $700 - $2,000 - $10,000 + $2,450.50 = $26,150.50
 * (Trade-in reduces amount financed, but NOT the tax)
 *
 * Comparison with Trade-In Credit State (if MD still had credit):
 * Taxable Base would be: $25,700 (with trade credit)
 * Tax would be: $1,670.50 (saves $780)
 *
 * LEASE CALCULATION:
 * Tax Base = Total Vehicle Fair Market Value
 * Tax = Tax Base × 6.5% (due at inception or capitalized)
 * Cap reductions (cash, trade, rebates) reduce cap cost but NOT the tax base
 *
 * Example Lease:
 * $40,000 vehicle, $5,000 down, $10,000 trade-in
 * Tax: $40,000 × 6.5% = $2,600 (can be paid upfront or spread into payments)
 * Adjusted Cap Cost: $40,000 - $5,000 - $10,000 = $25,000 (for payment calculation)
 *
 * SOURCES:
 * - Maryland Transportation Code § 13-809 (Vehicle Excise Tax)
 * - House Bill 754 (2024) - Trade-In Allowance Repeal (ENACTED July 1, 2024)
 * - House Bill 352 (2025) - Tax Rate Increase to 6.5% (ENACTED July 1, 2025)
 * - Senate Bill 362 (2024) - Doc Fee Cap Increase to $800 (ENACTED July 1, 2024)
 * - COMAR 11.15.33.06 (Trade-in Allowance Regulations - REPEALED)
 * - Maryland MVA Official Guidance
 * - Maryland Comptroller Official Guidance
 * - WANADA (Washington Area New Automobile Dealers Association)
 * - Maryland Tax Services - Out of State Purchases Guide
 * - Tag and Title Services - New to Maryland Guide
 *
 * Last Updated: 2025-11-13
 * Status: Production-Ready (based on 2024-2025 enacted legislation)
 */
export const US_MD: TaxRulesConfig = {
  stateCode: "MD",
  version: 2,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: NONE (ELIMINATED July 1, 2024)
   *
   * CRITICAL CHANGE: Maryland House Bill 754 (2024) ELIMINATED the trade-in
   * allowance effective July 1, 2024.
   *
   * Prior Law (Before July 1, 2024):
   * Maryland Transportation Code § 13-809 allowed "total purchase price" to be
   * reduced by "an allowance for trade-in." Trade-in value was deducted from
   * the vehicle price before calculating the 6% excise tax.
   *
   * Current Law (After July 1, 2024):
   * HB 754 repealed the trade-in allowance. The excise tax is now calculated
   * on the full purchase price with NO deduction for trade-in value.
   *
   * Legislative History:
   * - HB 754 introduced: January 31, 2024
   * - Passed both House and Senate: Spring 2024
   * - Signed into law: 2024
   * - Effective date: July 1, 2024
   * - Applies to: All certificates of title issued on or after July 1, 2024
   *
   * Fiscal Impact:
   * - Additional state revenue: $21.4M annually
   * - Transportation bond capacity increase: $1.0B over FY 2025-2029
   *
   * Tax Calculation:
   * Vehicle Price: $40,000
   * Trade-In Value: $15,000
   * BEFORE HB 754: Tax on ($40,000 - $15,000) = $25,000 × 6% = $1,500
   * AFTER HB 754: Tax on $40,000 = $40,000 × 6.5% = $2,600
   * Additional Tax: $1,100
   *
   * Trade-In Still Has Value:
   * While trade-in no longer reduces the excise tax, it still:
   * - Reduces the net amount the customer pays
   * - Reduces the amount financed (if financing)
   * - Pays off the customer's existing loan (if applicable)
   * - But provides ZERO tax benefit
   *
   * Comparison with Other States:
   * Maryland joins California, New Jersey, and a few other states in offering
   * NO trade-in credit. Most states (44+) still allow trade-in to reduce the
   * taxable base.
   *
   * Source: HB 754 (2024), § 13-809 (amended), MGALeg fiscal notes
   */
  tradeInPolicy: { type: "NONE" },

  /**
   * Rebate Rules: ALL rebates are TAXABLE
   *
   * MANUFACTURER REBATES:
   * Manufacturer rebates, incentives, and cash-back offers do NOT reduce the
   * taxable amount in Maryland. The excise tax is calculated on the full
   * vehicle price BEFORE any rebates are applied.
   *
   * Official Guidance (Maryland MVA/Comptroller):
   * "The excise tax is calculated on the purchase price before manufacturer
   * rebates or incentives. Rebates are applied after the tax calculation."
   *
   * Tax Treatment:
   * - Tax calculated on MSRP or selling price (before rebate)
   * - Rebate applied to reduce customer's out-of-pocket cost
   * - Rebate does NOT reduce the tax base
   *
   * Example:
   *   Vehicle MSRP: $30,000
   *   Manufacturer Rebate: $3,000
   *   Customer Pays: $27,000
   *   Taxable Base: $30,000 (NOT $27,000)
   *   Tax (6.5%): $30,000 × 6.5% = $1,950
   *
   * DEALER REBATES/DISCOUNTS:
   * Dealer incentives paid by manufacturer to dealer do not affect the
   * customer's tax. If the dealer reduces the selling price from their own
   * funds, the tax is calculated on the reduced selling price.
   *
   * Treatment:
   * - Manufacturer-to-dealer incentive: Does not reduce customer tax
   * - Dealer's own discount (reduces selling price): Reduces tax base
   *
   * Example:
   *   MSRP: $30,000
   *   Dealer Discount (own funds): $2,000
   *   Selling Price: $28,000
   *   Taxable Base: $28,000 (dealer discount reduces price)
   *   Tax: $28,000 × 6.5% = $1,820
   *
   * EV Rebates:
   * Federal EV rebates ($7,500) applied at point of sale are also taxable.
   * Maryland's separate state EV excise tax credit (up to $3,000) is a
   * post-purchase credit against the excise tax, not a rebate.
   *
   * Source: Maryland MVA Policy, Multiple dealer associations (WANADA)
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: true,
      notes:
        "Manufacturer rebates do NOT reduce taxable base in Maryland. Tax is calculated on " +
        "full vehicle price before rebates. Rebates applied after tax calculation.",
    },
    {
      appliesTo: "DEALER",
      taxable: false,
      notes:
        "Dealer discounts that reduce the selling price DO reduce the taxable base. Manufacturer-to-dealer " +
        "incentives do not affect customer tax.",
    },
  ],

  /**
   * Doc Fee: TAXABLE, capped at $800
   *
   * MARYLAND DOC FEE CAP INCREASE (SB 362, 2024):
   * Effective July 1, 2024, the maximum dealer processing charge (doc fee)
   * increased from $500 to $800.
   *
   * History of Doc Fee Cap:
   * - July 1, 2011 - June 30, 2014: $200
   * - July 1, 2014 - June 30, 2020: $300
   * - July 1, 2020 - June 30, 2024: $500
   * - July 1, 2024 - Present: $800
   *
   * Taxability:
   * Doc fees are TAXABLE in Maryland. The dealer processing charge is
   * included in the "total purchase price" and subject to the 6.5% excise tax.
   *
   * Official Definition (MD Transportation Code § 15-311.1):
   * "Dealer processing charge" means an amount charged by a dealer for:
   * - Preparation of written documentation
   * - Obtaining the title and license plates
   * - Obtaining a release of lien
   * - Filing title documents with the MVA
   * - Retaining documentation and records
   * - Complying with privacy laws
   * - Other administrative services
   *
   * Requirements:
   * - Maximum: $800 (cannot exceed)
   * - Must be clearly disclosed to buyer
   * - Must reflect actual dealer expenses
   * - Optional (not required by law, but permitted)
   *
   * Tax Calculation:
   *   Doc Fee: $800
   *   Tax Rate: 6.5%
   *   Tax on Doc Fee: $800 × 6.5% = $52.00
   *
   * Comparison:
   * Maryland's $800 cap is moderate compared to other states. Some states
   * have no cap (Alabama, Michigan, Arizona), while others cap lower
   * (New York $175, California $85).
   *
   * Source: SB 362 (2024), § 15-311.1, WANADA guidance
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules
   *
   * DEALER PROCESSING CHARGE (DOC FEE):
   * - TAXABLE
   * - Capped at $800 (as of July 1, 2024)
   * - Included in total purchase price subject to 6.5% excise tax
   *
   * SERVICE CONTRACTS (VSC/Extended Warranties):
   * - TAXABLE (when purchased with vehicle)
   * - Maryland treats service contracts as part of the vehicle transaction
   * - Subject to 6.5% excise tax when included in vehicle deal
   *
   * Note: There is limited authoritative guidance on VSC taxability in
   * Maryland. Based on standard Maryland sales tax treatment and the fact
   * that vehicles are taxed under a specific excise tax (not general sales
   * tax), we treat VSCs as taxable when sold with the vehicle.
   *
   * Maryland does regulate mechanical repair contracts (vehicle service
   * contracts) through the Maryland Insurance Administration, but the tax
   * treatment is not explicitly detailed in readily available public guidance.
   *
   * Best Practice: Treat as taxable unless specific exemption is documented.
   *
   * GAP INSURANCE:
   * - TAXABLE (when purchased with vehicle)
   * - GAP (Guaranteed Auto Protection) is treated as part of the vehicle
   *   transaction and subject to excise tax
   *
   * Note: Similar to VSC, there is limited authoritative guidance. Maryland
   * Insurance Administration regulates GAP but does not clearly specify tax
   * treatment. Based on standard practice and conservative interpretation,
   * we treat GAP as taxable.
   *
   * TITLE FEES:
   * - NOT taxable (government fee)
   * - Must be clearly labeled and separately stated
   *
   * REGISTRATION FEES:
   * - NOT taxable (government fee)
   *
   * ACCESSORIES:
   * - TAXABLE when sold with vehicle
   * - Included in total purchase price
   *
   * Source: § 15-311.1, Maryland Insurance Administration, standard practice
   */
  feeTaxRules: [
    {
      code: "DOC_FEE",
      taxable: true,
      notes: "Doc fee TAXABLE, capped at $800 (as of July 1, 2024)",
    },
    {
      code: "SERVICE_CONTRACT",
      taxable: true,
      notes:
        "Service contracts (VSC) treated as taxable when purchased with vehicle. Limited " +
        "authoritative guidance; based on standard MD practice.",
    },
    {
      code: "GAP",
      taxable: true,
      notes:
        "GAP insurance treated as taxable when purchased with vehicle. Limited authoritative " +
        "guidance; based on standard MD practice.",
    },
    {
      code: "TITLE",
      taxable: false,
      notes: "Title fee NOT taxable (government fee, must be separately stated)",
    },
    {
      code: "REG",
      taxable: false,
      notes: "Registration fees NOT taxable (government fees)",
    },
  ],

  /**
   * Product Taxability
   *
   * ACCESSORIES:
   * - TAXABLE when sold/installed with vehicle
   * - Included in total purchase price
   * - Subject to 6.5% excise tax
   *
   * NEGATIVE EQUITY:
   * - TAXABLE (rolled into vehicle price)
   * - When negative equity from trade-in is added to the new vehicle price,
   *   it increases the taxable base
   *
   * Example:
   *   New Vehicle: $30,000
   *   Trade-In Value: $12,000
   *   Trade-In Payoff: $15,000
   *   Negative Equity: $3,000
   *   Taxable Base: $30,000 + $3,000 = $33,000 (negative equity is taxable)
   *   Tax: $33,000 × 6.5% = $2,145
   *
   * SERVICE CONTRACTS:
   * - TAXABLE (see feeTaxRules above)
   *
   * GAP:
   * - TAXABLE (see feeTaxRules above)
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: true,
  taxOnServiceContracts: true,
  taxOnGap: true,

  /**
   * Vehicle Tax Scheme: STATE_ONLY
   *
   * Maryland uses a STATE-ONLY vehicle excise tax with NO local taxes.
   *
   * State Excise Tax: 6.5% (as of July 1, 2025)
   * - Prior rate: 6.0% (through June 30, 2025)
   * - Increased by House Bill 352 (2025)
   * - Applies uniformly across entire state
   * - NO county or municipal vehicle taxes
   *
   * Key Features:
   * 1. Single statewide rate (6.5%)
   * 2. No local government add-ons
   * 3. Same rate in Baltimore, Montgomery County, rural areas
   * 4. Simpler than states with local stacking (CA, CO, IL, OH)
   *
   * Excise Tax vs. Sales Tax:
   * Maryland vehicles are NOT subject to the general 6% state sales tax.
   * Instead, they're subject to a specific vehicle excise tax (6.5%).
   * This is an important distinction - vehicles have their own tax system
   * separate from general retail sales tax.
   *
   * Rental Vehicles (Different Rate):
   * - Short-term rentals (<180 days): 11.5% excise tax
   * - Long-term leases (≥180 days): 6.5% excise tax (same as purchases)
   *
   * Rate Increase Impact (July 1, 2025):
   * On a $30,000 vehicle:
   * - Old rate (6.0%): $1,800 tax
   * - New rate (6.5%): $1,950 tax
   * - Increase: $150 per $30,000 vehicle
   *
   * Source: HB 352 (2025), § 13-809, Maryland Comptroller
   */
  vehicleTaxScheme: "STATE_ONLY",
  vehicleUsesLocalSalesTax: false,

  // ============================================================================
  // LEASE TRANSACTION RULES
  // ============================================================================

  leaseRules: {
    /**
     * Lease Method: FULL_UPFRONT
     *
     * Maryland calculates the 6.5% excise tax on the TOTAL VEHICLE VALUE
     * at lease inception, not on individual monthly payments.
     *
     * How It Works:
     * - Tax calculated on full fair market value of the vehicle
     * - Tax due at lease inception (when lease is signed)
     * - Tax CAN be paid upfront OR capitalized into monthly payments
     * - If capitalized, customer pays tax over time but dealer reports it upfront
     *
     * Tax Base:
     * The tax is calculated on the vehicle's fair market value (typically
     * the MSRP or agreed-upon value), NOT on the sum of lease payments.
     *
     * Example 1 - Tax Paid Upfront:
     *   Vehicle Fair Market Value: $40,000
     *   Tax: $40,000 × 6.5% = $2,600 (paid at signing)
     *   Cap Reductions: $10,000 (reduces cap cost for payment, not tax)
     *   Adjusted Cap Cost: $30,000 (for payment calculation)
     *   Monthly Payment: Based on $30,000 cap cost (no tax in payment)
     *
     * Example 2 - Tax Capitalized:
     *   Vehicle Fair Market Value: $40,000
     *   Tax: $40,000 × 6.5% = $2,600 (due to state)
     *   Tax Added to Cap Cost: $2,600 / 36 months = $72.22/month
     *   Customer pays tax over 36 months instead of upfront
     *
     * Difference from Monthly Tax States:
     * - California, Indiana: Tax each monthly payment (payment × rate)
     * - Maryland: Tax full vehicle value once (vehicle value × rate)
     *
     * Similarity to New Jersey:
     * Maryland's method is similar to NJ's full upfront taxation, but
     * Maryland's implementation is simpler (no luxury surcharge, no
     * multiple calculation methods).
     *
     * Practical Impact:
     * This method means the total tax is fixed at lease inception and
     * doesn't change if you terminate the lease early or extend it.
     *
     * Source: Maryland MVA, LeaseGuide.com, dealer practices
     */
    method: "FULL_UPFRONT",

    /**
     * Cap Cost Reduction: NOT taxed separately
     *
     * Cap cost reductions (down payments, trade-ins, rebates) are NOT taxed
     * as separate line items in Maryland. However, they don't reduce the
     * tax base either.
     *
     * How It Works:
     * - Tax calculated on FULL vehicle fair market value
     * - Cap reductions reduce the capitalized cost (for payment calculation)
     * - Cap reductions do NOT reduce the tax base
     * - Cap reductions are NOT separately taxed
     *
     * Example:
     *   Vehicle Value: $40,000
     *   Cash Down: $5,000
     *   Trade-In: $10,000
     *   Total Cap Reduction: $15,000
     *
     *   Tax Base: $40,000 (full vehicle value)
     *   Tax: $40,000 × 6.5% = $2,600
     *
     *   Adjusted Cap Cost: $40,000 - $15,000 = $25,000
     *   Monthly Payment: Based on $25,000 cap cost
     *
     * Cap reductions help lower the monthly payment but provide no tax benefit.
     *
     * Contrast with Retail:
     * In a retail purchase, trade-in provides no tax benefit (due to HB 754).
     * In a lease, trade-in also provides no tax benefit, and the result is the same.
     */
    taxCapReduction: false,

    /**
     * Rebate Behavior on Leases: ALWAYS_TAXABLE
     *
     * Manufacturer and dealer rebates on leases are ALWAYS taxable in Maryland.
     * The tax is calculated on the full vehicle value before any rebates
     * are applied.
     *
     * Manufacturer Rebates:
     * - Applied as cap cost reduction
     * - Do NOT reduce the tax base
     * - Tax calculated on full vehicle value
     *
     * Example:
     *   Vehicle Value: $35,000
     *   Manufacturer Rebate: $2,500 (applied as cap reduction)
     *   Tax Base: $35,000 (NOT $32,500)
     *   Tax: $35,000 × 6.5% = $2,275
     *   Adjusted Cap Cost: $35,000 - $2,500 = $32,500
     *
     * Federal EV Rebates:
     * Federal EV rebates ($7,500) applied at point of sale are also taxable.
     * The full vehicle value is taxed before the EV rebate is applied.
     *
     * Source: Maryland MVA policy, dealer guidance
     */
    rebateBehavior: "ALWAYS_TAXABLE",

    /**
     * Doc Fee on Leases: ALWAYS taxable
     *
     * Dealer documentation fees are TAXABLE on leases in Maryland.
     *
     * Treatment:
     * - Doc fee (up to $800) is included in taxable amount
     * - If doc fee is paid upfront, it's taxed with upfront calculation
     * - If capitalized, it increases the tax base
     *
     * Example:
     *   Vehicle Value: $40,000
     *   Doc Fee: $800
     *   Total Tax Base: $40,800
     *   Tax: $40,800 × 6.5% = $2,652
     *
     * Source: § 15-311.1, standard dealer practice
     */
    docFeeTaxability: "ALWAYS",

    /**
     * Trade-in Credit on Leases: NONE
     *
     * Maryland provides NO trade-in credit on leases, consistent with the
     * elimination of trade-in credit on retail purchases (HB 754).
     *
     * How Trade-In Works on Leases:
     * - Trade-in value applied as cap cost reduction
     * - Reduces monthly payment (lower adjusted cap cost)
     * - Does NOT reduce tax base (tax still on full vehicle value)
     * - Provides NO tax benefit
     *
     * Example:
     *   Vehicle Value: $40,000
     *   Trade-In Value: $12,000
     *
     *   Tax Base: $40,000 (trade-in does NOT reduce)
     *   Tax: $40,000 × 6.5% = $2,600
     *
     *   Adjusted Cap Cost: $40,000 - $12,000 = $28,000
     *   Monthly Payment: Based on $28,000 cap cost
     *
     * Comparison with Retail:
     * - Retail: No trade-in credit (HB 754)
     * - Lease: No trade-in credit (consistent treatment)
     *
     * Comparison with Other States:
     * - Many states give trade-in credit on leases (CA, NY, NJ)
     * - Maryland joins states with no lease trade credit
     *
     * Source: HB 754 (2024), lease taxation policy
     */
    tradeInCredit: "NONE",

    /**
     * Negative Equity on Leases: TAXABLE
     *
     * Negative equity rolled into a lease increases the taxable base in
     * Maryland.
     *
     * Treatment:
     * - Negative equity added to vehicle value
     * - Increases the total amount subject to 6.5% excise tax
     * - Increases the capitalized cost (higher monthly payment)
     *
     * Example:
     *   Vehicle Value: $35,000
     *   Trade-In Value: $10,000
     *   Trade-In Payoff: $14,000
     *   Negative Equity: $4,000
     *
     *   Taxable Base: $35,000 + $4,000 = $39,000
     *   Tax: $39,000 × 6.5% = $2,535
     *
     *   Adjusted Cap Cost: $39,000 (for payment calculation)
     *
     * Impact:
     * Negative equity is doubly painful in Maryland leases:
     * 1. Increases the tax (6.5% on negative equity)
     * 2. Increases the cap cost (higher monthly payment)
     *
     * Source: Standard MD practice, negative equity treatment
     */
    negativeEquityTaxable: true,

    /**
     * Fee Taxability on Leases
     *
     * Backend products and fees on leases follow the same taxability
     * rules as retail purchases.
     *
     * DOC FEE:
     * - TAXABLE (capped at $800)
     * - Included in tax base calculation
     *
     * SERVICE CONTRACTS:
     * - TAXABLE when capitalized into lease
     * - Increases the tax base
     *
     * GAP:
     * - TAXABLE when capitalized into lease
     * - Increases the tax base
     *
     * TITLE/REGISTRATION:
     * - NOT taxable (government fees)
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: true,
        notes: "Doc fee TAXABLE on leases, capped at $800",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: true,
        notes: "VSC TAXABLE when capitalized into lease",
      },
      {
        code: "GAP",
        taxable: true,
        notes: "GAP TAXABLE when capitalized into lease",
      },
      {
        code: "TITLE",
        taxable: false,
        notes: "Title fees NOT taxable",
      },
      {
        code: "REG",
        taxable: false,
        notes: "Registration fees NOT taxable",
      },
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

    taxFeesUpfront: true,

    specialScheme: "MD_UPFRONT_GAIN",

    notes:
      "Maryland lease taxation: FULL_UPFRONT method with 6.5% tax calculated on total vehicle " +
      "fair market value at lease inception. Tax can be paid upfront or capitalized into monthly " +
      "payments. Cap cost reductions (cash, trade, rebates) reduce the adjusted cap cost but do NOT " +
      "reduce the tax base. NO trade-in credit on leases (consistent with retail). Backend products " +
      "(VSC, GAP) are taxable when included in lease. Doc fee taxable, capped at $800.",
  },

  // ============================================================================
  // RECIPROCITY RULES (CROSS-STATE TAX CREDIT)
  // ============================================================================

  /**
   * Reciprocity: ENABLED (with strict 60-day time limit)
   *
   * Maryland provides reciprocity credit for vehicle excise tax paid to
   * other states, but ONLY if you title the vehicle within 60 days of
   * establishing Maryland residency.
   *
   * CRITICAL TIME LIMIT:
   * You MUST title and register your vehicle within 60 days of declaring
   * Maryland residency to receive the reciprocity credit. After 60 days,
   * NO credit is available, meaning you pay tax twice (once to the other
   * state, and again to Maryland).
   *
   * How the Credit Works:
   *
   * Scenario 1: Other State Tax ≥ Maryland Tax (6.5%)
   * - Example: Vehicle titled in California (7.25% paid)
   * - California Tax Paid: $30,000 × 7.25% = $2,175
   * - Maryland Tax Due: $30,000 × 6.5% = $1,950
   * - Maryland Credit: $1,950 (full MD tax)
   * - Additional Maryland Tax: $0
   * - Maryland Minimum Tax: $100 (administrative)
   * - Total Maryland Payment: $100
   *
   * Scenario 2: Other State Tax < Maryland Tax (6.5%)
   * - Example: Vehicle titled in Pennsylvania (6% paid)
   * - Pennsylvania Tax Paid: $30,000 × 6% = $1,800
   * - Maryland Tax Due: $30,000 × 6.5% = $1,950
   * - Maryland Credit: $1,800
   * - Additional Maryland Tax: $150 (difference)
   * - Total Maryland Payment: $150
   *
   * Scenario 3: No-Tax State (Montana, Oregon, Delaware, New Hampshire)
   * - Example: Vehicle titled in Montana (0% tax)
   * - Montana Tax Paid: $0
   * - Maryland Tax Due: $30,000 × 6.5% = $1,950
   * - Maryland Credit: $0
   * - Additional Maryland Tax: $1,950 (full MD tax)
   * - Total Maryland Payment: $1,950
   *
   * Documentation Required:
   * To claim the reciprocity credit, you must provide:
   * - Proof of tax paid to other state (receipt, title, bill of sale)
   * - Certificate of title from other state
   * - Evidence of timely registration (within 60 days)
   *
   * Military Exception:
   * Active duty military stationed in Maryland may have different rules.
   * They may not be required to pay Maryland excise tax if they maintain
   * legal residence in another state.
   *
   * Penalty for Missing 60-Day Deadline:
   * If you register after 60 days:
   * - NO reciprocity credit available
   * - Pay FULL Maryland excise tax (6.5%)
   * - Effectively paying tax twice (other state + Maryland)
   * - Can result in thousands of dollars in additional tax
   *
   * Example of Missing Deadline:
   *   Vehicle purchased in Virginia: $35,000
   *   Virginia tax paid (4.15%): $1,452.50
   *   Registered in MD after 60 days
   *   Maryland tax due: $35,000 × 6.5% = $2,275 (NO credit)
   *   Total tax paid: $1,452.50 + $2,275 = $3,727.50
   *   vs. Within 60 days: $823 additional tax (difference only)
   *   Lost savings: $1,452
   *
   * Best Practice:
   * New Maryland residents should title and register their vehicles
   * IMMEDIATELY upon establishing residency to maximize the reciprocity
   * credit and avoid double taxation.
   *
   * Source: Maryland Tax Services - Out of State Purchases Guide,
   *         Tag and Title Services - New to Maryland Guide
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
      "Maryland provides reciprocity credit for vehicle excise tax paid to other states. " +
      "CRITICAL: Must title vehicle within 60 days of establishing MD residency to receive credit. " +
      "After 60 days, NO credit available (pay tax twice). Credit calculation: If other state tax ≥ 6.5%, " +
      "pay $100 minimum MD tax. If other state tax < 6.5%, pay difference. No-tax states (MT, OR, DE, NH) " +
      "pay full 6.5% MD tax. Proof of tax paid required. Applies to both retail and leases.",
  },

  extras: {
    lastUpdated: "2025-11-13",
    sources: [
      "Maryland Transportation Code § 13-809 (Vehicle Excise Tax)",
      "House Bill 754 (2024) - Trade-In Allowance Repeal (ENACTED July 1, 2024)",
      "House Bill 352 (2025) - Excise Tax Rate Increase to 6.5% (ENACTED July 1, 2025)",
      "Senate Bill 362 (2024) - Doc Fee Cap Increase to $800 (ENACTED July 1, 2024)",
      "COMAR 11.15.33.06 (Trade-in Allowance Regulations - REPEALED)",
      "Maryland Motor Vehicle Administration (MVA)",
      "Maryland Comptroller of Maryland",
      "WANADA (Washington Area New Automobile Dealers Association)",
      "Maryland Tax Services - Out of State Purchases Guide",
      "Tag and Title Services - New to Maryland Guide",
      "LeaseGuide.com - Maryland Lease Taxes",
      "Sales Tax Handbook - Maryland Vehicle Sales Tax",
      "Car and Driver - Maryland Car Tax Guide",
    ],
    notes:
      "Maryland has 6.5% state-only vehicle excise tax (increased from 6% July 1, 2025). " +
      "CRITICAL: NO trade-in credit (eliminated by HB 754, July 1, 2024). NO local taxes. " +
      "Manufacturer rebates TAXABLE (do not reduce tax base). Doc fee TAXABLE, capped at $800 " +
      "(increased from $500, July 1, 2024). Lease taxation: FULL_UPFRONT on total vehicle value " +
      "(can be capitalized into payments). Reciprocity credit available with strict 60-day time limit. " +
      "VSC and GAP treated as taxable. State-only rate simplifies calculation vs. local-stacking states.",
    stateExciseTaxRate: 6.5,
    priorExciseTaxRate: 6.0,
    rateIncreaseEffectiveDate: "2025-07-01",
    tradeInEliminationDate: "2024-07-01",
    tradeInEliminationBill: "HB 754 (2024)",
    docFeeCapAmount: 800,
    docFeeCapEffectiveDate: "2024-07-01",
    priorDocFeeCap: 500,
    reciprocityTimeLimit: "60 days",
    minimumTaxWithReciprocity: 100,
    rentalVehicleRate: 11.5,
    rentalVehicleThreshold: "< 180 days",
    majorChanges2024_2025: [
      "HB 754 (2024): Eliminated trade-in allowance (July 1, 2024)",
      "SB 362 (2024): Increased doc fee cap to $800 (July 1, 2024)",
      "HB 352 (2025): Increased excise tax rate to 6.5% (July 1, 2025)",
    ],
  },
};

export default US_MD;
