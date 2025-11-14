import { TaxRulesConfig } from "../types";

/**
 * OKLAHOMA TAX RULES
 *
 * Researched: 2025-11-14
 * Version: 2
 *
 * KEY FACTS:
 * - Excise tax (motor vehicle): 3.25% (NEW vehicles)
 * - Excise tax (used vehicles): $20 flat on first $1,500 + 3.25% on remainder
 * - Sales tax: 1.25% (added in 2017 via HB 2433)
 * - Combined effective rate: 4.5% (3.25% excise + 1.25% sales)
 * - Local taxes: State-only system, NO local add-ons for motor vehicles
 * - Trade-in credit: PARTIAL (applies to SALES TAX ONLY, NOT excise tax)
 * - Manufacturer rebates: NON-TAXABLE (reduce taxable base)
 * - Dealer rebates: NON-TAXABLE (reduce selling price)
 * - Doc fee: NOT TAXABLE, NO CAP (average $270)
 * - Service contracts (VSC): NOT taxable
 * - GAP insurance: NOT taxable
 * - Lease method: FULL_UPFRONT (excise tax paid upfront on total lease term)
 * - Lease duration: 12+ months exempt from sales tax if excise tax was paid
 * - Lease short-term: < 90 days subject to 6% rental tax instead
 * - Reciprocity: Limited (credit for taxes paid to other states on case-by-case basis)
 * - HB 1183: Changes trade-in treatment starting July 1, 2026 (eliminates trade credit on excise)
 *
 * UNIQUE OKLAHOMA FEATURES:
 * 1. DUAL TAX SYSTEM (Excise + Sales):
 *    - 3.25% motor vehicle excise tax (primary vehicle tax)
 *    - 1.25% sales tax (added 2017, applies to all vehicles)
 *    - Total: 4.5% combined rate
 *    - Both taxes calculated on purchase price
 *
 * 2. PARTIAL TRADE-IN CREDIT (CURRENT LAW - until July 1, 2026):
 *    - Trade-in reduces SALES TAX base (1.25% only)
 *    - Trade-in does NOT reduce EXCISE TAX base (3.25%)
 *    - Example: $10,000 trade saves $125 on sales tax but $0 on excise tax
 *    - This creates minimal trade-in benefit (only 1.25% vs 3.25%)
 *
 * 3. FUTURE CHANGE (HB 1183 - Effective July 1, 2026):
 *    - Excise tax will be based on actual sales price (no NADA value)
 *    - Trade-in credit language suggests NO deduction from excise tax
 *    - Sales tax treatment to be clarified
 *    - After 7/1/2026, trade-in benefit may be eliminated entirely
 *
 * 4. USED VEHICLE SPECIAL CALCULATION:
 *    - Used vehicles: $20 flat fee on first $1,500 of value
 *    - Then 3.25% excise tax on amount above $1,500
 *    - Plus 1.25% sales tax on full price (with trade-in credit)
 *    - Example: $10,000 used vehicle
 *      - Excise: $20 + ($8,500 × 3.25%) = $296.25
 *      - Sales (no trade): $10,000 × 1.25% = $125.00
 *      - Total: $421.25
 *
 * 5. NO LOCAL TAXES:
 *    - Oklahoma motor vehicle taxes are STATE-ONLY
 *    - No county or city add-ons
 *    - Same 4.5% rate statewide
 *    - Simplifies calculation vs states like CA, CO, IL
 *
 * 6. DOC FEE NOT TAXABLE:
 *    - Documentation fees are NOT subject to excise or sales tax
 *    - No statutory cap on doc fees (average $270)
 *    - Treated as separate administrative charge
 *
 * 7. LEASE EXCISE TAX (12+ month leases):
 *    - Long-term leases (≥12 months) pay excise tax UPFRONT
 *    - Excise tax paid on total lease value at inception
 *    - Once excise tax paid, monthly payments exempt from sales tax
 *    - Short-term rentals (<90 days): 6% rental tax instead
 *
 * 8. REBATE TREATMENT:
 *    - Manufacturer rebates REDUCE tax base (non-taxable)
 *    - Dealer discounts REDUCE tax base (non-taxable)
 *    - Tax calculated on net price after rebates/discounts
 *    - Favorable vs states where rebates are taxable (AL, etc.)
 *
 * TAX CALCULATION FORMULA (RETAIL - NEW VEHICLE):
 * Excise Tax Base = Vehicle Price + Accessories (NO trade-in deduction)
 * Sales Tax Base = Vehicle Price + Accessories - Trade-In Value
 * Excise Tax = Excise Tax Base × 3.25%
 * Sales Tax = Sales Tax Base × 1.25%
 * Total Tax = Excise Tax + Sales Tax
 * (Doc fee, VSC, GAP NOT included in tax base)
 *
 * Example 1 (New vehicle, Oklahoma City):
 * $30,000 vehicle + $500 accessories - $10,000 trade-in
 * Excise Tax: ($30,000 + $500) × 3.25% = $991.25
 * Sales Tax: ($30,000 + $500 - $10,000) × 1.25% = $256.25
 * Total Tax: $1,247.50
 * Trade-in saved: $125.00 (only on 1.25% sales tax)
 *
 * TAX CALCULATION FORMULA (RETAIL - USED VEHICLE):
 * Used Excise Base = Vehicle Price + Accessories (NO trade-in deduction)
 * Used Excise Tax = $20 (if base ≤ $1,500) OR $20 + ((base - $1,500) × 3.25%)
 * Sales Tax Base = Vehicle Price + Accessories - Trade-In Value
 * Sales Tax = Sales Tax Base × 1.25%
 * Total Tax = Used Excise Tax + Sales Tax
 *
 * Example 2 (Used vehicle):
 * $12,000 used vehicle - $5,000 trade-in
 * Excise Tax: $20 + (($12,000 - $1,500) × 3.25%) = $20 + $341.25 = $361.25
 * Sales Tax: ($12,000 - $5,000) × 1.25% = $87.50
 * Total Tax: $448.75
 *
 * LEASE CALCULATION (UPFRONT EXCISE):
 * For leases ≥12 months:
 * Excise Tax = (Gross Cap Cost OR Agreed Value) × 3.25%
 * Sales Tax = $0 (exempt if excise tax paid and lease ≥12 months)
 * Monthly Payment Tax = $0 (exempt)
 *
 * Example 3 (36-month lease):
 * $35,000 cap cost
 * Excise Tax (Due at Inception): $35,000 × 3.25% = $1,137.50
 * Monthly payment: $450/month × 36 months
 * Monthly tax: $0 (exempt because excise tax paid and term ≥12 months)
 * Total Lease Tax: $1,137.50 (one-time)
 *
 * SOURCES:
 * - Oklahoma Tax Commission (tax.ok.gov)
 * - Oklahoma Statutes Title 68, Chapter 23 (Revenue and Taxation)
 * - § 68-2103: Motor Vehicle Excise Tax on transfer and first registration
 * - § 68-2106: Excise tax in lieu of other taxes, exemptions
 * - § 68-2110: Rental tax on motor vehicle rentals
 * - House Bill 2433 (2017): Added 1.25% sales tax to motor vehicles
 * - House Bill 1183 (2025): Simplifies excise tax calculation (effective 7/1/2026)
 * - Oklahoma Administrative Code 710:60 (Motor Vehicles)
 * - Oklahoma Administrative Code 710:65-1-11 (Rentals and leases)
 * - Sales Tax Handbook: Oklahoma Vehicle Sales Tax
 */
export const US_OK: TaxRulesConfig = {
  stateCode: "OK",
  version: 2,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: PARTIAL (Sales tax only - 1.25%)
   *
   * Oklahoma has a unique dual-tax structure with PARTIAL trade-in treatment.
   *
   * CURRENT LAW (Before July 1, 2026):
   * Trade-in value reduces the SALES TAX base (1.25%) ONLY.
   * Trade-in does NOT reduce the EXCISE TAX base (3.25%).
   *
   * Statutory Basis:
   * Under current interpretation, sales tax (1.25%) allows trade-in deduction,
   * but motor vehicle excise tax (3.25%) is calculated on full purchase price.
   *
   * Example:
   *   Vehicle Price: $30,000
   *   Trade-In Value: $10,000
   *   Excise Tax (3.25%): $30,000 × 3.25% = $975 (NO trade-in deduction)
   *   Sales Tax (1.25%): ($30,000 - $10,000) × 1.25% = $250 (WITH trade-in deduction)
   *   Total Tax: $1,225
   *   Trade-In Savings: $125 (only on 1.25% sales tax portion)
   *
   * CRITICAL LIMITATION:
   * Trade-in credit provides minimal benefit - only saves 1.25% vs the full 4.5%.
   * In the example above, without trade-in the tax would be $1,350, with trade-in
   * it's $1,225, saving only $125 on a $10,000 trade.
   *
   * FUTURE CHANGE (HB 1183 - Effective July 1, 2026):
   * House Bill 1183 requires excise tax to be "based on the actual sales price
   * before any trade-in discounts or credits." This language suggests trade-in
   * credit may be eliminated entirely for excise tax purposes.
   *
   * Implementation Note:
   * Since the type system doesn't have a "PARTIAL_SALES_TAX_ONLY" option,
   * this is marked as FULL but must be handled specially in calculation logic
   * to apply trade-in credit ONLY to the 1.25% sales tax portion, NOT the
   * 3.25% excise tax portion.
   *
   * Source: OK Tax Commission guidance; HB 2433 (2017); HB 1183 (2025)
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules: Both manufacturer and dealer rebates are NON-TAXABLE
   *
   * Oklahoma allows rebates and dealer incentives to reduce the taxable base.
   *
   * MANUFACTURER REBATES:
   * Official Guidance:
   * "Oklahoma does not charge tax on rebates and dealer incentives."
   *
   * Tax Treatment:
   * - Customer receives manufacturer rebate
   * - Rebate REDUCES the taxable amount
   * - Tax calculated on net price after rebate
   * - Both excise tax (3.25%) and sales tax (1.25%) use reduced base
   *
   * Example:
   *   MSRP: $25,000
   *   Manufacturer Rebate: $2,000
   *   Net Price: $23,000
   *   Tax Base: $23,000 (rebate reduces base)
   *   Excise Tax (3.25%): $23,000 × 3.25% = $747.50
   *   Sales Tax (1.25%): $23,000 × 1.25% = $287.50
   *   Total Tax: $1,035 (vs $1,125 on $25,000 without rebate)
   *
   * DEALER REBATES/INCENTIVES:
   * Dealer discounts and manufacturer-to-dealer incentives also reduce the
   * selling price, and tax is calculated on the actual reduced price paid
   * by the customer.
   *
   * Contrast with Alabama:
   * Unlike Alabama (where manufacturer rebates are taxable), Oklahoma provides
   * full tax benefit for rebates, saving the customer 4.5% of the rebate amount.
   *
   * Source: Sales Tax Handbook; OK Tax Commission
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: false,
      notes:
        "Manufacturer rebates REDUCE the taxable base in Oklahoma. Tax is calculated on " +
        "net price after rebates are applied. Both excise tax (3.25%) and sales tax (1.25%) " +
        "benefit from rebate reduction. Contrast with Alabama where rebates are taxable.",
    },
    {
      appliesTo: "DEALER",
      taxable: false,
      notes:
        "Dealer incentives and discounts reduce the selling price. Tax is calculated on " +
        "actual price paid by customer after all dealer discounts.",
    },
  ],

  /**
   * Doc Fee: NOT TAXABLE, NO CAP
   *
   * Documentation fees are NOT subject to motor vehicle excise tax or sales tax.
   *
   * Official Treatment:
   * "Documentation fees cover costs incurred by the dealership for preparing
   * and filing sales contracts and tax documents, and these fees are separate
   * from the taxes and DMV fees."
   *
   * No Statutory Cap:
   * Oklahoma does not impose a statutory limit on dealer documentation fees.
   * - Average doc fee: $270 (2023-2024 data)
   * - No legal maximum
   * - Fees can vary by dealership and vehicle
   *
   * Taxability:
   * Doc fees are treated as administrative charges by the dealership and are
   * NOT included in the taxable base for either:
   * - 3.25% motor vehicle excise tax
   * - 1.25% sales tax
   *
   * Example:
   *   Vehicle Price: $30,000
   *   Doc Fee: $270
   *   Tax Base: $30,000 (doc fee NOT included)
   *   Excise Tax: $30,000 × 3.25% = $975
   *   Sales Tax: $30,000 × 1.25% = $375
   *   Total Tax: $1,350 (doc fee adds $0 to tax)
   *
   * Contrast with Other States:
   * Many states (AL, AZ, CO, etc.) make doc fees taxable. Oklahoma does not.
   *
   * Source: Sales Tax Handbook; OK Tax Commission guidance
   */
  docFeeTaxable: false,

  /**
   * Fee Taxability Rules
   *
   * Oklahoma has clear guidance on what is and isn't taxable:
   *
   * SERVICE CONTRACTS (VSC):
   * - NOT subject to Oklahoma sales tax or excise tax
   * - Optional maintenance contracts: parts sold under contract are taxable
   *   but the contract premium itself is not
   * - Extended warranties treated as service contracts, not taxable
   *
   * GAP INSURANCE:
   * - NOT subject to sales tax or excise tax
   * - Regulated under Oklahoma Insurance Department
   * - Treated as financial protection product, exempt from vehicle taxes
   * - GAP waivers (contractual agreements to waive debt) also not taxable
   *
   * TITLE FEE:
   * - NOT taxable (government fee)
   * - Current title fee varies by vehicle type
   * - Separately stated on invoice
   *
   * REGISTRATION FEES:
   * - NOT taxable (government fees)
   * - Annual registration: $15-$85 depending on vehicle age
   * - License plate fees separate from taxes
   *
   * DOC FEE:
   * - NOT TAXABLE (see docFeeTaxable above)
   * - Average $270, no cap
   *
   * ACCESSORIES:
   * - TAXABLE when sold with vehicle
   * - Included in excise tax and sales tax base
   * - Both 3.25% excise + 1.25% sales = 4.5% total on accessories
   *
   * Source: OK Admin Code 710:60; Sales Tax Handbook; OK Insurance Dept
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: false,
      notes:
        "Service contracts (VSC) are NOT subject to Oklahoma sales tax or excise tax. " +
        "Extended warranties and service agreements are exempt. Parts used under warranty " +
        "may be separately taxable.",
    },
    {
      code: "GAP",
      taxable: false,
      notes:
        "GAP insurance is NOT taxable in Oklahoma. Treated as financial protection product, " +
        "regulated by OK Insurance Department, exempt from vehicle sales and excise taxes.",
    },
    {
      code: "DOC_FEE",
      taxable: false,
      notes:
        "Doc fees are NOT TAXABLE in Oklahoma (unique feature). Average $270, no statutory " +
        "cap. Treated as administrative charge separate from vehicle taxes.",
    },
    {
      code: "TITLE",
      taxable: false,
      notes: "Title fees are NOT taxable (government fees).",
    },
    {
      code: "REG",
      taxable: false,
      notes:
        "Registration fees are NOT taxable (government fees). Annual registration $15-$85 " +
        "based on vehicle age.",
    },
  ],

  /**
   * Product Taxability
   *
   * Accessories: TAXABLE
   * - Subject to both excise tax (3.25%) and sales tax (1.25%)
   * - Total 4.5% on accessories purchased with vehicle
   * - Included in both tax bases
   *
   * Negative Equity: NOT taxable
   * - Added to amount financed, not to tax base
   * - Does not increase excise tax or sales tax calculation
   * - Contrast with states like AL where it's taxable on leases
   *
   * Service Contracts: NOT taxable
   * GAP: NOT taxable
   *
   * Accessories Example:
   *   Vehicle: $30,000 + Accessories: $3,000 = $33,000
   *   Excise Tax: $33,000 × 3.25% = $1,072.50
   *   Sales Tax: $33,000 × 1.25% = $412.50
   *   Total: $1,485.00
   *
   * Negative Equity Example:
   *   Vehicle Price: $25,000
   *   Trade-In Value: $12,000
   *   Trade-In Payoff: $15,000
   *   Negative Equity: $3,000
   *
   *   Excise Tax: $25,000 × 3.25% = $812.50
   *   Sales Tax: ($25,000 - $12,000) × 1.25% = $162.50
   *   Total Tax: $975.00
   *   Amount Financed: $13,000 + $975 + $3,000 = $16,975
   *   (Negative equity NOT taxed)
   *
   * Source: OK Tax Commission; Sales Tax Handbook
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: false,
  taxOnServiceContracts: false,
  taxOnGap: false,

  /**
   * Vehicle Tax Scheme: STATE_ONLY
   *
   * Oklahoma uses a STATE-ONLY tax system with NO local add-ons for motor vehicles.
   *
   * State Motor Vehicle Excise Tax: 3.25%
   * - Primary vehicle tax (OK Statutes § 68-2103)
   * - New vehicles: 3.25% of purchase price
   * - Used vehicles: $20 on first $1,500 + 3.25% on remainder
   * - Applies to cars, trucks, motorcycles, RVs, trailers
   * - Paid at first registration in Oklahoma
   *
   * State Sales Tax: 1.25%
   * - Added in 2017 via HB 2433
   * - Applies to all motor vehicle purchases
   * - Previously vehicles were fully exempt from sales tax
   * - OK Statutes § 68-2106: Excise tax is "in lieu of all other taxes"
   *   EXCEPT the 1.25% sales tax and annual registration fees
   *
   * Combined Rate: 4.5% statewide
   * - 3.25% excise + 1.25% sales = 4.5% total
   * - No county or municipal add-ons
   * - Same rate in Oklahoma City, Tulsa, rural areas
   * - Simplifies calculation vs multi-jurisdiction states
   *
   * No Local Taxes:
   * Unlike states such as:
   * - California (district taxes)
   * - Colorado (city/county/district taxes)
   * - Illinois (Cook County surcharges)
   * - Alabama (county + city taxes)
   *
   * Oklahoma has a uniform statewide rate with no local variations.
   *
   * Tax Collection Point:
   * Tax collected at point of sale/registration based on statewide rate.
   * Dealer location doesn't matter for rate calculation.
   *
   * Source: OK Statutes § 68-2103, § 68-2106; HB 2433 (2017)
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
     * Oklahoma uses UPFRONT excise tax for long-term leases (≥12 months).
     *
     * Legal Framework (OK Statutes § 68-2103):
     * "Excise tax upon the transfer of legal ownership of any vehicle...and
     * upon the use of any vehicle registered for the first time in this state."
     *
     * Transfer includes "lease, lease purchase or lease finance agreements
     * involving trucks over 8,000 pounds...and certain trailers and commercial
     * vehicles."
     *
     * Long-Term Lease Treatment (≥12 months):
     * Official Guidance (OK Admin Code 710:65-1-11):
     * "Leases which extend for at least 12 months are considered exempt from
     * the general sales and use tax so long as the owner paid the motor vehicle
     * excise tax."
     *
     * Tax Structure:
     * 1. UPFRONT: Motor vehicle excise tax (3.25%) paid at lease inception
     * 2. MONTHLY: Exempt from sales tax if excise tax was paid and term ≥12 months
     * 3. ONGOING: No additional tax on monthly payments
     *
     * Short-Term Rental Treatment (<90 days):
     * OK Statutes § 68-2110:
     * "Rental tax of 6% on gross receipts of all motor vehicle rental agreements
     * of 90 days or less duration."
     *
     * Calculation Method:
     * Excise Tax (Due at Inception):
     *   Tax = (Gross Cap Cost OR Agreed Value) × 3.25%
     *
     * Monthly Payment Tax:
     *   Tax = $0 (exempt if excise tax paid and lease ≥12 months)
     *
     * Total Lease Tax:
     *   Total = Upfront Excise Tax Only
     *
     * Example (36-month lease):
     *   Gross Cap Cost: $35,000
     *   Excise Tax (Due at Inception): $35,000 × 3.25% = $1,137.50
     *   Monthly Payment: $450/month
     *   Monthly Tax: $0 (exempt)
     *   Total Lease Tax: $1,137.50 (one-time payment)
     *
     * Re-Lease or Subsequent Ownership:
     * "Ownership of a vehicle acquired by a lessee is exempt from excise tax
     * as long as the vehicle excise tax was paid at the time of the initial
     * lease or lease-purchase agreement and an Oklahoma title was issued."
     *
     * Source: OK Statutes § 68-2103, § 68-2110; OK Admin Code 710:65-1-11
     */
    method: "FULL_UPFRONT",

    /**
     * Cap Cost Reduction: NOT TAXABLE (excise tax on full cap cost only)
     *
     * Oklahoma calculates excise tax on the gross capitalized cost or agreed
     * value of the leased vehicle, not on cap cost reductions.
     *
     * What is NOT separately taxed:
     * - Cash down payments (not taxed separately)
     * - Manufacturer rebates (reduce cap cost, not taxed separately)
     * - Trade-in equity (not taxed separately)
     * - Any cap cost reduction (not taxed separately)
     *
     * Tax is calculated once on the full vehicle value at lease inception.
     *
     * Example:
     *   Gross Cap Cost: $40,000
     *   Cap Cost Reductions:
     *     - Cash down: $5,000
     *     - Manufacturer rebate: $2,500
     *     - Total: $7,500
     *
     *   Adjusted Cap Cost: $32,500 (for payment calculation)
     *   Excise Tax: $40,000 × 3.25% = $1,300 (on gross cap, not reductions)
     *   Tax on Reductions: $0 (not separately taxed)
     *
     * This differs from Alabama where cap cost reductions are taxed separately
     * at lease inception.
     *
     * Source: OK Admin Code 710:60; OK Statutes § 68-2103
     */
    taxCapReduction: false,

    /**
     * Rebate Behavior on Leases: NON_TAXABLE_IF_AT_SIGNING
     *
     * Manufacturer rebates on leases reduce the cap cost and are not separately
     * taxed. The excise tax is calculated on the gross cap cost before rebates.
     *
     * Rebates applied as cap cost reductions do not create additional taxable
     * events - the single excise tax applies to the vehicle value.
     *
     * Example:
     *   MSRP: $40,000
     *   Manufacturer Rebate: $3,000
     *   Gross Cap Cost: $37,000
     *   Excise Tax: $37,000 × 3.25% = $1,202.50
     *
     * Source: OK Tax Commission guidance
     */
    rebateBehavior: "NON_TAXABLE_IF_AT_SIGNING",

    /**
     * Doc Fee on Leases: NEVER taxable
     *
     * Documentation fees are NOT subject to excise tax on leases, consistent
     * with retail treatment.
     *
     * Doc fees are administrative charges and are not included in the lease
     * excise tax base.
     *
     * Example:
     *   Gross Cap Cost: $35,000
     *   Doc Fee: $270
     *   Excise Tax Base: $35,000 (doc fee NOT included)
     *   Excise Tax: $35,000 × 3.25% = $1,137.50
     *
     * Source: OK Tax Commission guidance; consistent with retail treatment
     */
    docFeeTaxability: "NEVER",

    /**
     * Trade-in Credit on Leases: CAP_COST_ONLY
     *
     * Trade-in equity on leases reduces the capitalized cost but is not
     * separately credited against tax (since there's no monthly sales tax
     * on long-term leases).
     *
     * Treatment:
     * - Trade-in equity reduces gross cap cost
     * - Excise tax calculated on cap cost (which includes trade reduction)
     * - No separate trade-in credit mechanism needed
     * - Lower cap cost = lower payment, but same excise tax rate
     *
     * Example:
     *   MSRP: $35,000
     *   Trade-in Equity: $10,000
     *   Gross Cap Cost: $25,000
     *   Excise Tax: $25,000 × 3.25% = $812.50
     *
     * Since excise tax is on cap cost, trade-in naturally reduces the tax base.
     *
     * Source: OK Admin Code 710:65-1-11
     */
    tradeInCredit: "CAP_COST_ONLY",

    /**
     * Negative Equity on Leases: NOT TAXABLE
     *
     * Negative equity rolled into a lease increases the capitalized cost
     * and is therefore included in the excise tax base, but it's not
     * separately "taxable" - it's part of the cap cost calculation.
     *
     * Treatment:
     * - Negative equity increases gross cap cost
     * - Excise tax calculated on total cap cost (including negative equity)
     * - Not separately taxed beyond being in the cap cost
     *
     * Example:
     *   MSRP: $30,000
     *   Trade-In Value: $12,000
     *   Trade-In Payoff: $15,000
     *   Negative Equity: $3,000
     *
     *   Gross Cap Cost: $33,000 (MSRP + negative equity)
     *   Excise Tax: $33,000 × 3.25% = $1,072.50
     *
     * The negative equity increases the base but isn't "taxable" as a separate
     * line item - it's just part of cap cost.
     *
     * Source: OK Tax Commission; lease tax guidance
     */
    negativeEquityTaxable: false,

    /**
     * Fee Taxability on Leases
     *
     * Backend products on leases follow same rules as retail:
     *
     * SERVICE CONTRACTS (VSC):
     * - NOT taxable on leases
     * - Same treatment as retail sales
     * - Extended warranties exempt
     *
     * GAP INSURANCE:
     * - NOT taxable on leases
     * - Treated as financial protection product
     * - Regulated separately from vehicle taxes
     *
     * ACCESSORIES:
     * - If included in cap cost: Increases excise tax base
     * - Subject to 3.25% excise tax on total cap including accessories
     * - No separate monthly tax on accessories
     *
     * DOC FEE:
     * - NOT TAXABLE on leases (see docFeeTaxability above)
     *
     * TITLE FEE:
     * - NOT taxable (government fee)
     *
     * Source: OK Admin Code; OK Tax Commission guidance
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: false,
        notes: "Doc fee NOT TAXABLE on leases (same as retail).",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: false,
        notes: "Service contracts NOT taxable on leases (same as retail).",
      },
      {
        code: "GAP",
        taxable: false,
        notes: "GAP insurance NOT taxable on leases (financial protection product).",
      },
      {
        code: "TITLE",
        taxable: false,
        notes: "Title fee NOT taxable (government fee).",
      },
      {
        code: "REG",
        taxable: false,
        notes: "Registration fees NOT taxable (government fees).",
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

    taxFeesUpfront: false,

    specialScheme: "NONE",

    notes:
      "Oklahoma: FULL_UPFRONT lease taxation for long-term leases (≥12 months). Excise tax " +
      "(3.25%) paid at inception on gross cap cost. Monthly payments EXEMPT from sales tax " +
      "if excise tax was paid. Short-term rentals (<90 days): 6% rental tax instead. No separate " +
      "taxation of cap cost reductions. Trade-in reduces cap cost (which reduces excise tax base). " +
      "Backend products (VSC, GAP) NOT taxed. Doc fee NOT taxable.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: LIMITED (credit available but not automatic)
   *
   * Oklahoma does not have comprehensive automatic reciprocity like Alabama,
   * but does provide tax credits on a case-by-case basis.
   *
   * General Policy:
   * Oklahoma residents who purchase vehicles out-of-state and pay sales tax
   * to another state may be eligible for a credit against Oklahoma use tax,
   * but this is not automatic and requires documentation.
   *
   * How It Works:
   *
   * Scenario 1: Tax Paid in Another State
   * If an Oklahoma resident purchases a vehicle in another state and pays
   * that state's sales tax, they may receive credit when registering in OK:
   *
   * Example:
   *   Vehicle purchased in Kansas: $30,000
   *   Kansas tax paid (varies by county, ~8%): $2,400
   *   Oklahoma tax due (4.5%): $1,350
   *   Credit allowed: $1,350 (up to OK tax amount)
   *   Additional OK tax due: $0
   *
   * Scenario 2: Lower Tax State
   * If tax paid elsewhere is less than Oklahoma's 4.5%, pay the difference:
   *
   * Example:
   *   Vehicle purchased in Montana: $30,000
   *   Montana tax paid (0%): $0
   *   Oklahoma tax due (4.5%): $1,350
   *   Credit allowed: $0
   *   Additional OK tax due: $1,350
   *
   * Documentation Required:
   * - Bill of sale showing vehicle price
   * - Receipt showing tax paid to other state
   * - Proof of legal residency in Oklahoma
   * - Title showing transfer to Oklahoma resident
   *
   * Limitations:
   * - Credit capped at what Oklahoma would charge
   * - Proof of payment required (self-reporting not sufficient)
   * - Applied at time of Oklahoma registration
   * - No refund if other state's tax exceeds Oklahoma's
   *
   * Non-Residents Purchasing in Oklahoma:
   * Oklahoma does not have a formal "drive-out" provision like Alabama.
   * Non-residents typically pay Oklahoma tax at purchase, then seek credit
   * when registering in their home state (if their state allows).
   *
   * Source: OK Tax Commission guidance; § 68-2103
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
      "Oklahoma provides LIMITED reciprocity. Credit for taxes paid to other states available " +
      "on case-by-case basis with proof of payment. Credit capped at Oklahoma's 4.5% rate. " +
      "No automatic reciprocity - documentation required at registration. No formal drive-out " +
      "provision for non-residents.",
  },

  extras: {
    lastUpdated: "2025-11-14",
    sources: [
      "Oklahoma Tax Commission (tax.ok.gov)",
      "Oklahoma Statutes Title 68, Chapter 23 - Revenue and Taxation",
      "§ 68-2103: Motor Vehicle Excise Tax on transfer and first registration",
      "§ 68-2106: Excise tax in lieu of other taxes, exemptions",
      "§ 68-2110: Rental tax on motor vehicle rentals",
      "House Bill 2433 (2017): Added 1.25% sales tax to motor vehicles",
      "House Bill 1183 (2025): Simplifies excise tax (effective July 1, 2026)",
      "Oklahoma Administrative Code 710:60 - Motor Vehicles",
      "Oklahoma Administrative Code 710:65-1-11 - Rentals and leases",
      "Sales Tax Handbook: Oklahoma Vehicle Sales Tax",
      "Oklahoma Insurance Department: Financial Protection Products",
    ],
    notes:
      "Oklahoma has dual-tax structure: 3.25% motor vehicle excise tax + 1.25% sales tax = " +
      "4.5% combined. STATE-ONLY (no local add-ons). PARTIAL trade-in credit (applies to " +
      "1.25% sales tax ONLY, not 3.25% excise tax - saves only $125 on $10k trade). Used " +
      "vehicles: $20 flat + 3.25% above $1,500. Manufacturer rebates NON-TAXABLE (reduce base). " +
      "Doc fee NOT TAXABLE, NO CAP (avg $270). VSC and GAP NOT taxable. Leases ≥12 months: " +
      "3.25% excise tax upfront, monthly payments EXEMPT. Short-term rentals <90 days: 6% rental " +
      "tax. HB 1183 (effective 7/1/2026): Eliminates NADA valuation, may eliminate trade-in credit.",
    stateExciseTaxRateNew: 3.25,
    stateExciseTaxRateUsedFlat: 20.0,
    stateExciseTaxRateUsedThreshold: 1500.0,
    stateExciseTaxRateUsedPercent: 3.25,
    stateSalesTaxRate: 1.25,
    combinedRate: 4.5,
    shortTermRentalTaxRate: 6.0,
    shortTermRentalThresholdDays: 90,
    longTermLeaseExciseTaxRate: 3.25,
    longTermLeaseThresholdMonths: 12,
    avgDocFee: 270,
    docFeeCapExists: false,
    hb1183EffectiveDate: "2026-07-01",
    hb2433EffectiveDate: "2017-07-01",
  },
};

export default US_OK;
