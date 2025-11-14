import { TaxRulesConfig } from "../types";

/**
 * COLORADO TAX RULES
 *
 * Researched: 2025-11-13
 * Version: 2
 *
 * KEY FACTS:
 * - State sales tax: 2.9% (motor vehicles)
 * - Local taxes: County (up to 5%) + City (up to 8%) + Special districts (RTD 1.0%)
 * - Combined range: 2.9% to 15.9%
 * - Trade-in credit: FULL (100% deduction from taxable base)
 * - Manufacturer rebates: TAXABLE (do NOT reduce tax base)
 * - Dealer rebates: Non-taxable if true price reduction
 * - Doc fee: TAXABLE, NO CAP (average $490)
 * - Service contracts (VSC): NOT taxable (services exempt)
 * - GAP insurance: NOT taxable (insurance product)
 * - Lease taxation: HYBRID (upfront tax on cap reduction + monthly tax on payments)
 * - Reciprocity: YES (credit for taxes paid to other states)
 * - Specific Ownership Tax: SEPARATE annual tax (like property tax, not sales tax)
 *
 * UNIQUE COLORADO FEATURES:
 * 1. HOME-RULE CITIES: 68 self-collected municipalities (Denver, Aurora, Colorado Springs, Boulder)
 *    - Administer their own sales tax codes independently
 *    - May have different rules than state-administered jurisdictions
 *    - Dealer location determines which home-rule city tax applies
 *
 * 2. RTD (REGIONAL TRANSPORTATION DISTRICT): 1.0% additional tax
 *    - Applies in Denver, Boulder, Jefferson counties + portions of Adams, Arapahoe,
 *      Broomfield, Douglas counties
 *    - Taxed based on buyer's residence address, not dealer location
 *    - Collected at time of registration with county clerk
 *
 * 3. SPECIFIC OWNERSHIP TAX (SOT): Annual recurring tax (NOT sales tax)
 *    - Paid yearly at registration renewal
 *    - Based on vehicle age and original taxable value
 *    - Decreases each year as vehicle ages
 *    - In lieu of personal property tax
 *    - Completely separate from one-time sales tax
 *
 * 4. MANUFACTURER REBATES TAXABLE:
 *    - Rebates do NOT reduce tax base
 *    - Customer pays tax on full price before rebates
 *    - $5,000 rebate on $35,000 vehicle = tax on $35,000, not $30,000
 *
 * 5. USE TAX COLLECTION AT REGISTRATION:
 *    - State use tax: Administered by CO DOR
 *    - Local use tax: Paid directly to county/city at registration
 *    - RTD and special district taxes: Paid to county clerk
 *    - Motor vehicle use tax based on buyer's address
 *
 * 6. TRADE-IN CREDIT MECHANICS:
 *    - Full credit against both state AND local taxes
 *    - Trade must be owned by purchaser
 *    - Trade-in value deducted from selling price
 *    - Net difference is taxable base
 *
 * 7. LEASE CAP COST REDUCTION FULLY TAXABLE:
 *    - Cash down payments: Taxed upfront
 *    - Rebates as cap reduction: Taxed upfront
 *    - Trade-in equity: Taxed upfront (unlike retail where it reduces base)
 *    - All cap reductions subject to lease tax at signing
 *
 * TAX CALCULATION FORMULA (RETAIL):
 * Taxable Base = (Vehicle Price + Accessories + Doc Fee) - Trade-In Value
 * State Tax = Taxable Base × 2.9%
 * County Tax = Taxable Base × County Rate
 * City Tax = Taxable Base × City Rate
 * RTD Tax = Taxable Base × 1.0% (if buyer in RTD district)
 * Total Tax = State + County + City + RTD
 * (VSC and GAP NOT included; Title and registration fees separately stated NOT included)
 *
 * Example 1 (Denver - includes RTD):
 * $30,000 vehicle + $490 doc - $10,000 trade = $20,490 taxable
 * State: $20,490 × 2.9% = $594.21
 * Denver City: $20,490 × 4.81% = $985.57
 * RTD: $20,490 × 1.0% = $204.90
 * Total: $1,784.68 (8.71% effective rate)
 *
 * Example 2 (Non-RTD area, lower combined rate):
 * $25,000 vehicle + $490 doc - $8,000 trade = $17,490 taxable
 * State: $17,490 × 2.9% = $507.21
 * County: $17,490 × 1.5% = $262.35
 * City: $17,490 × 2.0% = $349.80
 * Total: $1,119.36 (6.4% effective rate)
 *
 * LEASE CALCULATION (HYBRID):
 * Upfront Tax = (Cap Reduction + Doc Fee) × (State + Local Rate)
 * Monthly Tax = Monthly Payment × (State + Local Rate)
 * Total Tax = Upfront Tax + (Monthly Tax × Number of Payments)
 *
 * Example (Denver lease with RTD - 8.71% total):
 * Cap reduction: $5,000 + Doc: $595 = $5,595
 * Upfront tax: $5,595 × 8.71% = $487.33 (due at signing)
 * Monthly payment: $450 × 36 months
 * Monthly tax: $450 × 8.71% = $39.20/month
 * Total lease tax: $487.33 + ($39.20 × 36) = $1,898.53
 *
 * HOME-RULE CITY CONSIDERATIONS:
 * Major home-rule cities with self-collected sales tax:
 * - Denver: 4.81% city + 2.9% state + 1.0% RTD = 8.71%
 * - Colorado Springs: 3.07% city + 2.9% state = 5.97%
 * - Aurora: 4.0% city + 2.9% state + 1.0% RTD = 7.9%
 * - Boulder: 3.86% city + 2.9% state + 1.0% RTD = 7.76%
 *
 * Each home-rule city may have unique interpretations of what is taxable.
 * Always verify specific rules with the applicable home-rule city.
 *
 * SOURCES:
 * - Colorado Department of Revenue (tax.colorado.gov)
 * - Colorado Revised Statutes § 39-26-113 (Trade-in credit)
 * - § 39-26-102 (Sales tax definitions and rates)
 * - § 39-26-208 (Motor vehicle specific ownership tax)
 * - § 42-3-107 (Registration and taxation)
 * - CO DOR Sale & Use Tax Topics: Motor Vehicles (Nov 2021)
 * - CO DOR Sales & Use Tax Topics: Leases (June 2019)
 * - CO DOR DR1002 Sales/Use Tax Rates (July 2024)
 * - RTD Overview - Colorado General Assembly
 * - Sales Tax Colorado LLC - Home Rule Jurisdictions Guide
 */
export const US_CO: TaxRulesConfig = {
  stateCode: "CO",
  version: 2,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL (100% credit, no cap)
   *
   * Colorado allows full trade-in credit against the taxable purchase price
   * of a motor vehicle. The trade-in value is deducted from the sales price
   * before calculating sales tax.
   *
   * Statutory Basis (§ 39-26-113, C.R.S.):
   * "When any used automotive vehicle is taken in trade as a credit or part
   * payment on the sale of a new or used vehicle, the tax is paid on the net
   * difference."
   *
   * Official Guidance (CO DOR Motor Vehicles Guide):
   * "Sales tax is calculated on the net purchase price, which is the total
   * purchase price less the amount allowed by a dealer for any trade-in."
   *
   * Requirements:
   * - Trade-in vehicle must be owned by the purchaser
   * - Trade-in must be transferred to the dealer as part of the same transaction
   * - Trade-in allowance must be separately stated on purchase agreement
   * - Both state AND local taxes calculated on net amount (after trade-in credit)
   *
   * Example:
   *   Vehicle Price: $30,000
   *   Doc Fee: $495
   *   Trade-In Value: $10,000
   *   Taxable Base: ($30,000 + $495) - $10,000 = $20,495
   *   Tax @ 7.5%: $20,495 × 7.5% = $1,537.13
   *
   * Comparison to Other States:
   * - Unlike Alabama (trade credit only for state tax, not local)
   * - Colorado provides FULL credit against all taxes (state + local + RTD)
   *
   * Source: § 39-26-113 C.R.S.; CO DOR Motor Vehicles Nov 2021
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules:
   *
   * Colorado treats manufacturer and dealer rebates/incentives differently.
   *
   * MANUFACTURER REBATES (TAXABLE):
   * - Manufacturer rebates do NOT reduce the taxable purchase price
   * - Tax calculated on full vehicle price BEFORE manufacturer rebate
   * - Rebate is applied to reduce customer's out-of-pocket cost
   * - Customer pays tax on pre-rebate price
   *
   * Official Guidance (CO DOR Motor Vehicles Guide):
   * "The taxable purchase price includes all amounts received by the seller
   * for the purchase of the vehicle, regardless of whether such amounts are
   * paid by the purchaser, the manufacturer, a lender, or any other party."
   *
   * This means manufacturer rebates are treated as payments made BY the
   * manufacturer TO the seller on behalf of the buyer, making the full
   * pre-rebate price taxable.
   *
   * Example:
   *   Vehicle MSRP: $35,000
   *   Manufacturer Rebate: $5,000
   *   Customer Pays: $30,000
   *   TAXABLE BASE: $35,000 (NOT $30,000)
   *   Tax @ 7.5%: $35,000 × 7.5% = $2,625
   *
   * DEALER REBATES/INCENTIVES (NON-TAXABLE):
   * - If dealer reduces actual selling price due to their own promotion,
   *   the tax is on the reduced selling price
   * - Dealer-to-dealer incentives (holdbacks, volume bonuses) paid by
   *   manufacturer to dealer do not affect customer tax base
   * - True price reductions ARE reflected in taxable amount
   *
   * Example:
   *   MSRP: $35,000
   *   Dealer Discount: -$3,000
   *   Selling Price: $32,000
   *   TAXABLE BASE: $32,000
   *   Tax @ 7.5%: $32,000 × 7.5% = $2,400
   *
   * FEDERAL EV TAX CREDITS:
   * - Federal EV tax credits applied at point of sale are treated like
   *   manufacturer rebates
   * - Result: Full pre-credit price is taxable
   * - State EV rebates (if any) follow same treatment
   *
   * Source: CO DOR Motor Vehicles Guide Nov 2021
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: true,
      notes:
        "Manufacturer rebates ARE TAXABLE in Colorado. Tax calculated on full purchase price " +
        "BEFORE manufacturer rebate. Rebates are treated as manufacturer payments to seller on " +
        "buyer's behalf, so full amount is included in taxable purchase price. This includes " +
        "federal EV tax credits applied at point of sale.",
    },
    {
      appliesTo: "DEALER",
      taxable: false,
      notes:
        "Dealer discounts that reduce the actual selling price ARE NOT taxable. If dealer reduces " +
        "the price due to their own promotion, tax is calculated on the reduced selling price. " +
        "Dealer-to-dealer incentives paid by manufacturer do not affect customer's tax calculation.",
    },
  ],

  /**
   * Doc Fee: TAXABLE (no statutory cap)
   *
   * Colorado dealer documentation fees are SUBJECT to sales tax at the
   * combined state and local rate.
   *
   * Official Guidance (CO DOR Motor Vehicles Guide):
   * "The taxable purchase price includes...dealer fees (also known as clerical
   * fees, doc fees, dealer prep charge, processing fees, etc.)"
   *
   * Statutory Cap: NONE
   * Colorado has no cap on documentation fees according to the Colorado
   * Automobile Dealers Association.
   * - Average doc fee: $490 (as of 2023-2024)
   * - Observed range: $300 to $700+
   * - Dealers can charge any amount deemed reasonable
   *
   * Taxability:
   * Doc fee is included in the taxable base for BOTH state and local taxes:
   * - 2.9% state sales tax
   * - Full county rate
   * - Full city rate
   * - RTD tax (if applicable)
   *
   * Example:
   *   Doc Fee: $490
   *   Combined Rate: 7.5% (2.9% state + 4.6% local)
   *   Tax on Doc Fee: $490 × 7.5% = $36.75
   *
   * Trade-In Interaction:
   * Doc fee is added to vehicle price BEFORE trade-in credit is applied:
   * Taxable Base = (Vehicle + Doc Fee + Accessories) - Trade-In
   *
   * Example:
   *   Vehicle: $25,000
   *   Doc Fee: $490
   *   Trade-In: $8,000
   *   Taxable Base: ($25,000 + $490) - $8,000 = $17,490
   *
   * Source: CO DOR Motor Vehicles Guide; Colorado Automobile Dealers Association
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules
   *
   * Colorado has clear guidance on what is and isn't taxable for motor vehicles.
   *
   * SERVICE CONTRACTS (VSC):
   * - NOT subject to Colorado sales tax
   * - Services are generally exempt from Colorado sales tax
   * - Extended warranties, vehicle service contracts, maintenance agreements: NOT taxable
   * - Parts provided under warranty also not taxable when free under contract
   *
   * GAP INSURANCE:
   * - NOT subject to sales tax
   * - Treated as insurance product, exempt from sales tax
   * - Debt waiver products also not taxable
   *
   * TITLE FEE:
   * - NOT taxable (government fee)
   * - Must be separately stated on invoice
   *
   * REGISTRATION FEES:
   * - NOT taxable (government fees)
   *
   * DOC FEE:
   * - TAXABLE (see docFeeTaxable above)
   *
   * DEALER-INSTALLED ACCESSORIES:
   * - TAXABLE when sold with vehicle
   * - Included in taxable purchase price
   * - Subject to full combined rate (state + local + RTD)
   *
   * Source: CO DOR Sales Tax Guide; Motor Vehicles Guide Nov 2021
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: false,
      notes:
        "Service contracts (VSC) are NOT subject to Colorado sales tax. Services are generally " +
        "exempt from sales tax. Extended warranties and maintenance agreements not taxable.",
    },
    {
      code: "GAP",
      taxable: false,
      notes:
        "GAP insurance is NOT taxable in Colorado. Treated as insurance product, exempt from " +
        "sales tax. Debt waiver products also not taxable.",
    },
    {
      code: "DOC_FEE",
      taxable: true,
      notes:
        "Doc fees ARE TAXABLE at combined rate (state + local + RTD). Colorado has NO cap on " +
        "doc fees. Average $490, but can range from $300 to $700+.",
    },
    {
      code: "TITLE",
      taxable: false,
      notes:
        "Title fee is NOT taxable when separately stated (government fee). Must be clearly " +
        "labeled on invoice.",
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
   * - Accessories sold WITH vehicle: Taxed at combined rate
   * - Included in taxable purchase price
   * - Subject to trade-in credit (added before, credit applied after)
   *
   * Negative Equity: NOT taxable
   * - Negative equity rolled into new vehicle loan is NOT subject to sales tax
   * - Represents debt obligation from previous vehicle
   * - Not consideration for new vehicle purchase
   * - Added to loan amount but not to tax base
   *
   * Service Contracts: NOT taxable
   * GAP: NOT taxable
   *
   * Example (Negative Equity):
   *   New Vehicle Price: $28,000
   *   Doc Fee: $490
   *   Trade-In Actual Value: $10,000
   *   Trade-In Payoff: $14,000
   *   Negative Equity: $4,000
   *
   *   Taxable Base: ($28,000 + $490) - $10,000 = $18,490
   *   NOT: $22,490 (do not add negative equity)
   *   Tax @ 7.5%: $18,490 × 7.5% = $1,386.75
   *   Amount Financed: $18,490 + $1,386.75 + $4,000 = $23,876.75
   *
   * Source: CO DOR Motor Vehicles Guide
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: false,
  taxOnServiceContracts: false,
  taxOnGap: false,

  /**
   * Vehicle Tax Scheme: STATE_PLUS_LOCAL
   *
   * Colorado uses a stacked tax system: state + county + city + special districts.
   *
   * State Sales Tax: 2.9%
   * - Applies to all motor vehicle sales statewide
   * - Colorado Revised Statutes § 39-26-104
   * - Administered by Colorado Department of Revenue
   *
   * County Tax: 0% to 5%
   * - Varies by county
   * - Example: Denver County 0%, El Paso County 1.23%, Adams County 0.75%
   *
   * City/Municipal Tax: 0% to 8%
   * - Varies by city/municipality
   * - Example: Denver 4.81%, Colorado Springs 3.07%, Boulder 3.86%
   *
   * Special Districts:
   * - RTD (Regional Transportation District): 1.0%
   *   - Covers Denver, Boulder, Jefferson counties
   *   - Portions of Adams, Arapahoe, Broomfield, Douglas counties
   *   - Based on BUYER'S residence address
   * - Other local improvement districts may apply
   *
   * Combined Rates:
   * - Lowest: ~2.9% (state only, some rural areas)
   * - Average: ~7.5%
   * - Highest: ~15.9% (some high-tax municipalities)
   * - Denver: 8.71% (2.9% state + 4.81% city + 1.0% RTD)
   * - Colorado Springs: 5.97% (2.9% state + 3.07% city, no RTD)
   * - Aurora: 7.9% (2.9% state + 4.0% city + 1.0% RTD)
   * - Boulder: 7.76% (2.9% state + 3.86% city + 1.0% RTD)
   *
   * HOME-RULE CITIES (68 self-collected):
   * Major home-rule cities administer their own sales tax codes:
   * - Denver, Aurora, Colorado Springs, Boulder
   * - Lakewood, Fort Collins, Arvada, Westminster, Pueblo
   * - Each may have unique rules and interpretations
   * - File and remit separately to home-rule city
   * - May differ from state-administered jurisdictions
   *
   * Tax Collection Point:
   * For dealers: Tax based on dealer location for state-administered areas
   * For home-rule cities: City where dealership is located
   * For RTD: Based on buyer's residence address (collected at registration)
   *
   * Use Tax Collection:
   * - State use tax: Administered by CO DOR
   * - County/city use tax: Paid directly to county clerk at registration
   * - RTD tax: Paid to county clerk at registration (based on buyer address)
   * - Motor vehicle use taxes based on where buyer will register vehicle
   *
   * Rate Resources:
   * - CO DOR DR1002 Sales/Use Tax Rates (updated regularly)
   * - 400+ jurisdictions across Colorado
   * - Verify current rates before transactions
   *
   * Source: § 39-26-102, 39-26-104 C.R.S.; CO DOR DR1002; RTD Overview
   */
  vehicleTaxScheme: "STATE_PLUS_LOCAL",
  vehicleUsesLocalSalesTax: true,

  // ============================================================================
  // LEASE TRANSACTION RULES
  // ============================================================================

  leaseRules: {
    /**
     * Lease Method: HYBRID (upfront tax on cap reduction + monthly tax on payments)
     *
     * Colorado uses a hybrid lease taxation approach:
     * 1. Capitalized cost reductions taxed UPFRONT at lease inception
     * 2. Monthly lease payments taxed each month
     *
     * Official Guidance (CO DOR Sales & Use Tax Topics: Leases, June 2019):
     * "Sales tax in Colorado is calculated on the entire amount of payment made
     * at the time of signing and delivery including, but not limited to, any
     * capitalized cost reduction, first monthly payment, and refundable security
     * deposit."
     *
     * State + Local Rate: Same as retail (2.9% + county + city + RTD)
     * - Combined rate 2.9% to ~15.9%
     * - Applies to BOTH upfront and monthly amounts
     *
     * Tax Collection Options:
     * "On leases of thirty-six (36) months or less, the lessor may pay the tax
     * up front on the total cost of the vehicle and not collect Colorado tax on
     * the lease payments."
     *
     * However, the STANDARD method is HYBRID (upfront + monthly).
     *
     * What is Taxed:
     * Upfront (at signing):
     * - Capitalized cost reduction (down payment)
     * - First monthly payment (if paid upfront)
     * - Refundable security deposit (if any)
     * - Doc fees, acquisition fees (if paid upfront)
     *
     * Monthly:
     * - Lease payment amount
     * - Finance charges included in payment
     *
     * Example (Denver - 8.71% total):
     *   Cap Reduction: $5,000
     *   Doc Fee: $595
     *   Monthly Payment: $450
     *   Term: 36 months
     *
     *   Upfront Tax: ($5,000 + $595) × 8.71% = $487.33 (due at signing)
     *   Monthly Tax: $450 × 8.71% = $39.20/month
     *   Total Tax: $487.33 + ($39.20 × 36) = $1,898.53
     *
     * County Tax on Leases:
     * "If leased within Colorado, the state tax is collected in the lease
     * payments, but the county use tax on the total lease payments is collected
     * at the time of titling."
     *
     * This means for county tax specifically, some jurisdictions may require
     * upfront payment of total county use tax at registration rather than
     * collecting it monthly.
     *
     * RTD Tax on Leases:
     * - RTD tax follows same pattern as retail
     * - Based on lessee's residence address
     * - May be collected at registration or in lease payments
     *
     * Source: CO DOR Sales & Use Tax Topics: Leases (June 2019)
     */
    method: "HYBRID",

    /**
     * Cap Cost Reduction: FULLY TAXABLE upfront
     *
     * ALL capitalized cost reductions are subject to sales tax at lease inception.
     *
     * Official Guidance (CO DOR Leases Guide):
     * "Sales tax in Colorado is calculated on the entire amount of payment made
     * at the time of signing and delivery including, but not limited to, any
     * capitalized cost reduction, first monthly payment, and refundable security
     * deposit."
     *
     * What is Taxable at Signing:
     * - Cash down payments
     * - Manufacturer rebates applied as cap reduction
     * - Trade-in equity (if customer owns the vehicle)
     * - Dealer discounts applied as cap reduction
     * - First month's payment (if paid upfront)
     * - ANY reduction to the cap cost
     *
     * Tax Timing:
     * All cap cost reductions are taxed UPFRONT at lease inception, not monthly.
     *
     * Example:
     *   Gross Cap Cost: $40,000
     *   Cap Cost Reductions:
     *     - Cash down: $4,000
     *     - Manufacturer rebate: $2,000
     *     - Trade-in equity: $3,000
     *     - Total: $9,000
     *
     *   Adjusted Cap Cost: $31,000 (for payment calculation)
     *   Upfront Tax: $9,000 × 8.71% = $783.90 (due at signing)
     *
     * Source: CO DOR Sales & Use Tax Topics: Leases
     */
    taxCapReduction: true,

    /**
     * Rebate Behavior on Leases: ALWAYS_TAXABLE
     *
     * In Colorado, manufacturer rebates on leases are ALWAYS taxable when
     * applied as capitalized cost reductions.
     *
     * Same treatment as retail: Rebates are treated as manufacturer payments
     * to the lessor, making the full amount part of taxable consideration.
     *
     * All rebates (manufacturer, dealer, federal EV credits) that reduce the
     * cap cost are subject to upfront sales tax at inception.
     *
     * Source: CO DOR Motor Vehicles Guide; Leases Guide
     */
    rebateBehavior: "ALWAYS_TAXABLE",

    /**
     * Doc Fee on Leases: ALWAYS taxable
     *
     * Dealer documentation fees and acquisition fees are subject to sales tax
     * on leases.
     *
     * Application:
     * - If doc fee paid upfront (at inception): Taxed immediately at combined rate
     * - If capitalized into lease: Becomes part of monthly payment, taxed monthly
     *
     * Most Common Treatment:
     * Doc fees are typically paid upfront and taxed at inception along with
     * other upfront charges.
     *
     * Example:
     *   Acquisition Fee: $695 (paid at signing)
     *   Combined Rate: 8.71%
     *   Tax on Fee: $695 × 8.71% = $60.54 (due at signing)
     *
     * Source: CO DOR Leases Guide
     */
    docFeeTaxability: "ALWAYS",

    /**
     * Trade-in Credit on Leases: FULL (same as retail)
     *
     * Colorado allows FULL trade-in credit on leases when the customer owns
     * the vehicle being traded.
     *
     * However, the trade-in equity is typically applied as a CAPITALIZED COST
     * REDUCTION, which means:
     * - It reduces the adjusted cap cost (lowers payments)
     * - But the trade-in VALUE ITSELF is taxed upfront as part of cap reduction
     *
     * This is different from retail where trade-in REDUCES the taxable base.
     * On leases, trade-in equity is part of TAXABLE cap reduction.
     *
     * Requirements:
     * - Customer must OWN the vehicle being traded
     * - Trade-in must be transferred to dealer
     * - Trade-in allowance separately stated
     *
     * Example:
     *   Gross Cap Cost: $40,000
     *   Trade-In Value: $8,000 (customer owns)
     *   Adjusted Cap Cost: $32,000
     *
     *   Tax on Trade-In: $8,000 × 8.71% = $696.80 (due at signing)
     *   (Trade-in is taxed as part of cap reduction)
     *
     * FOLLOW_RETAIL_RULE mode reflects that Colorado's statute allows trade-in
     * credit on leases, but the practical effect is the equity becomes taxable
     * cap reduction.
     *
     * Source: CO DOR Leases Guide; Motor Vehicles Guide
     */
    tradeInCredit: "FOLLOW_RETAIL_RULE",

    /**
     * Negative Equity on Leases: TAXABLE
     *
     * Negative equity rolled into a lease IS subject to sales tax in Colorado.
     *
     * Treatment:
     * - Negative equity increases the capitalized cost
     * - The negative equity amount is taxed as part of cap cost
     * - Tax paid upfront at lease inception
     *
     * Example:
     *   Base Cap Cost: $35,000
     *   Trade-In Value: $10,000
     *   Trade-In Payoff: $14,000
     *   Negative Equity: $4,000
     *
     *   Adjusted Cap Cost: $39,000 (for payment calculation)
     *   Tax on Negative Equity: $4,000 × 8.71% = $348.40 (due at inception)
     *
     * This is DIFFERENT from retail purchases where negative equity is NOT taxable.
     *
     * Reasoning: In a lease, negative equity becomes part of the capitalized cost,
     * and all amounts included in initial payments/cap cost are taxable.
     *
     * Source: CO DOR Sales & Use Tax Topics: Leases
     */
    negativeEquityTaxable: true,

    /**
     * Fee Taxability on Leases
     *
     * Backend products on leases follow same exemption rules as sales:
     *
     * SERVICE CONTRACTS (VSC):
     * - NOT taxable on leases
     * - Same treatment as retail sales
     * - Services generally exempt
     *
     * GAP INSURANCE:
     * - NOT taxable on leases
     * - Treated as insurance product
     *
     * ACCESSORIES:
     * - TAXABLE at lease rates
     * - If included in cap cost: Increases cap cost, affects payments
     * - Tax may apply upfront or in monthly payments depending on structure
     *
     * DOC FEE / ACQUISITION FEE:
     * - TAXABLE on leases (see docFeeTaxability above)
     *
     * TITLE FEE:
     * - NOT taxable when separately stated
     *
     * Source: CO DOR Sales Tax Guide; Leases Guide
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: true,
        notes: "Doc fee TAXABLE on leases. Typically taxed upfront at inception.",
      },
      {
        code: "ACQUISITION_FEE",
        taxable: true,
        notes: "Acquisition fee TAXABLE on leases at combined rate.",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: false,
        notes: "Service contracts NOT taxable on leases (same as retail).",
      },
      {
        code: "GAP",
        taxable: false,
        notes: "GAP insurance NOT taxable on leases (insurance product).",
      },
      {
        code: "TITLE",
        taxable: false,
        notes: "Title fee NOT taxable when separately stated.",
      },
      {
        code: "REG",
        taxable: false,
        notes: "Registration fees NOT taxable.",
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
      {
        code: "REG",
        taxable: false,
        includedInCapCost: true,
        includedInUpfront: true,
        includedInMonthly: false,
      },
    ],

    taxFeesUpfront: true,

    specialScheme: "CO_HOME_RULE_LEASE",

    notes:
      "Colorado: HYBRID lease taxation (upfront tax on cap reduction + monthly tax on payments). " +
      "Same combined rate as retail (2.9% state + county + city + RTD). Cap cost reductions " +
      "(cash, rebates, trade-in equity) FULLY TAXABLE upfront. Monthly payments taxed monthly. " +
      "Trade-in equity becomes taxable cap reduction (different from retail where it reduces base). " +
      "Negative equity also taxable. Backend products (VSC, GAP) NOT taxed. Doc/acquisition fees " +
      "taxable. County use tax may be collected upfront at registration. RTD tax based on lessee address.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: FULL CREDIT (credit for taxes paid to other states)
   *
   * Colorado provides reciprocal credit for sales tax paid in other states.
   *
   * Official Guidance (CO DOR):
   * "Credit for sales or use tax paid to another state is allowed against
   * Colorado state use tax. The credit is limited to the amount of Colorado
   * state use tax due."
   *
   * How It Works:
   * CO Tax Owed = (CO State Rate 2.9% × Purchase Price) - Other State Tax Paid
   *
   * IMPORTANT LIMITATION:
   * Credit applies ONLY to STATE use tax (2.9%), NOT to local taxes.
   * County, city, and RTD taxes are owed in full even if tax paid elsewhere.
   *
   * Example 1 (Other State Lower Rate):
   *   Vehicle Price: $30,000
   *   Montana Tax Paid: $0 (no sales tax)
   *   CO State Tax Owed: $30,000 × 2.9% = $870
   *   Credit: $0
   *   Pay to CO: $870 state + full local/RTD taxes
   *
   * Example 2 (Other State Higher Rate):
   *   Vehicle Price: $30,000
   *   California Tax Paid: $2,400
   *   CO State Tax Owed: $30,000 × 2.9% = $870
   *   Credit: $870 (limited to CO state tax)
   *   Pay to CO: $0 state tax + full local/RTD taxes
   *
   * Example 3 (Registering in Colorado):
   *   Vehicle purchased in Arizona: $25,000
   *   Arizona tax paid: $1,375 (5.5%)
   *   CO State Use Tax: $25,000 × 2.9% = $725
   *   Credit: $725 (full CO state tax covered)
   *   Denver County Tax: $25,000 × 0% = $0
   *   Denver City Tax: $25,000 × 4.81% = $1,202.50
   *   RTD Tax: $25,000 × 1.0% = $250
   *   Pay to CO at registration: $0 + $1,202.50 + $250 = $1,452.50
   *
   * Credit Scope:
   * - STATE reciprocity: YES (credit up to 2.9% state use tax)
   * - LOCAL reciprocity: NO (county/city/RTD taxes owed in full)
   *
   * Documentation Required:
   * - Bill of sale showing purchase price
   * - Receipt showing taxes paid to other state
   * - Provide to county clerk at time of registration
   *
   * NEW RESIDENTS:
   * New Colorado residents may be exempt from use tax if:
   * - Vehicle registered in their name in prior state
   * - Registration was active before establishing CO residency
   * - Check with county clerk for specific new resident rules
   *
   * Source: CO DOR Consumer Use Tax Guide; County clerk registration procedures
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
      "Colorado provides reciprocity credit for taxes paid to other states, but ONLY for STATE " +
      "use tax (2.9%). Local taxes (county, city, RTD) are owed IN FULL even if tax paid elsewhere. " +
      "Credit limited to CO state tax amount. Must provide proof of tax paid to other state. Present " +
      "documentation to county clerk at time of registration.",
  },

  extras: {
    lastUpdated: "2025-11-13",
    sources: [
      "Colorado Department of Revenue (tax.colorado.gov)",
      "Colorado Revised Statutes:",
      "  § 39-26-102 (Sales tax definitions and rates)",
      "  § 39-26-104 (State sales tax)",
      "  § 39-26-113 (Trade-in credit)",
      "  § 39-26-208 (Specific ownership tax)",
      "  § 42-3-107 (Registration and taxation)",
      "CO DOR Sale & Use Tax Topics: Motor Vehicles (Nov 2021)",
      "CO DOR Sales & Use Tax Topics: Leases (June 2019)",
      "CO DOR DR1002 Sales/Use Tax Rates (July 2024)",
      "CO DOR Consumer Use Tax Guide",
      "RTD Overview - Colorado General Assembly",
      "Sales Tax Colorado LLC - Home Rule Jurisdictions Guide",
    ],
    notes:
      "Colorado has 2.9% state sales tax + county (0-5%) + city (0-8%) + RTD (1.0%) for combined " +
      "2.9% to 15.9%. 68 HOME-RULE CITIES self-administer sales tax (Denver, Aurora, Colorado Springs, " +
      "Boulder). RTD tax (1.0%) applies in Denver, Boulder, Jefferson counties + portions of Adams, " +
      "Arapahoe, Broomfield, Douglas counties, based on BUYER ADDRESS. FULL trade-in credit (state + " +
      "local). Manufacturer rebates TAXABLE. Doc fee taxable, NO CAP (avg $490). VSC and GAP NOT " +
      "taxable. Lease: HYBRID (upfront + monthly), cap reductions fully taxable. SPECIFIC OWNERSHIP " +
      "TAX (SOT): Annual recurring tax separate from sales tax, decreases as vehicle ages. Reciprocity: " +
      "Credit for STATE tax only (2.9%), local taxes owed in full.",
    stateRate: 2.9,
    countyRateRange: { min: 0, max: 5.0 },
    cityRateRange: { min: 0, max: 8.0 },
    rtdRate: 1.0,
    combinedRateRange: { min: 2.9, max: 15.9 },
    avgDocFee: 490,
    homeRuleCityCount: 68,
    majorJurisdictions: {
      Denver: { state: 2.9, county: 0, city: 4.81, rtd: 1.0, total: 8.71 },
      ColoradoSprings: { state: 2.9, county: 1.23, city: 3.07, rtd: 0, total: 7.2 },
      Aurora: { state: 2.9, county: 0.75, city: 4.0, rtd: 1.0, total: 8.65 },
      Boulder: { state: 2.9, county: 1.0, city: 3.86, rtd: 1.0, total: 8.76 },
      FortCollins: { state: 2.9, county: 0, city: 3.85, rtd: 0, total: 6.75 },
      Lakewood: { state: 2.9, county: 0, city: 3.5, rtd: 1.0, total: 7.4 },
    },
    rtdCounties: [
      "Denver County (full)",
      "Boulder County (full)",
      "Jefferson County (full)",
      "Adams County (partial)",
      "Arapahoe County (partial)",
      "Broomfield County (partial)",
      "Douglas County (partial)",
    ],
    specificOwnershipTax:
      "Colorado charges annual Specific Ownership Tax (SOT) at registration " +
      "renewal. Based on vehicle age and original taxable value. Decreases each year. In lieu of " +
      "personal property tax. SEPARATE from one-time sales tax. Paid to county clerk annually.",
    homeRuleCityNote:
      "68 self-collected home-rule municipalities administer their own sales tax codes. " +
      "Major cities: Denver, Aurora, Colorado Springs, Boulder, Lakewood, Fort Collins, Arvada, " +
      "Westminster, Pueblo, Greeley, Longmont, Loveland, Grand Junction, Thornton, Broomfield. " +
      "Each may have unique interpretations and rules. Always verify with specific jurisdiction.",
    uniqueFeatures: [
      "68 home-rule cities with self-administered sales tax",
      "RTD tax (1.0%) based on buyer's residence, not dealer location",
      "Specific Ownership Tax (SOT): Annual recurring tax separate from sales tax",
      "Manufacturer rebates taxable (full pre-rebate price)",
      "Full trade-in credit (state + local)",
      "Reciprocity credit ONLY for state tax (2.9%), not local",
      "County use tax on leases may be collected upfront at registration",
      "No doc fee cap (average $490)",
    ],
  },
};

export default US_CO;
