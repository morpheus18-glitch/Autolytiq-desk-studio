import { TaxRulesConfig } from "../types";

/**
 * UTAH TAX RULES
 *
 * Researched: 2025-11-14
 * Version: 2
 *
 * KEY FACTS:
 * - State sales tax: 4.85% (general rate)
 * - Motor vehicle sales tax: 6.85% UNIFORM STATEWIDE (no local variations)
 * - Trade-in credit: FULL (100% deduction from taxable base)
 * - Manufacturer rebates: NON-TAXABLE (reduce tax base)
 * - Dealer rebates: NON-TAXABLE if retained as down payment
 * - Doc fee: TAXABLE, NO CAP (average $305)
 * - Service contracts (VSC): TAXABLE (sold with vehicle)
 * - GAP insurance: NOT taxable (insurance product)
 * - Lease taxation: HYBRID (upfront + monthly payment taxation)
 * - Reciprocity: YES (credit for taxes paid to other states, capped at UT rate)
 * - Uniform fee structure: Statewide consistency
 *
 * UNIQUE UTAH FEATURES:
 * 1. UNIFORM STATEWIDE RATE: 6.85% motor vehicle sales tax
 *    - No county or city variations for motor vehicles
 *    - One of the simplest state tax structures in the nation
 *    - Same rate applies everywhere in Utah
 *    - Contrast with general sales tax (4.85% state + up to 4.2% local)
 *
 * 2. MANUFACTURER REBATES NON-TAXABLE:
 *    - Rebates reduce the purchase price for tax calculation
 *    - Dealer can retain manufacturer rebate as down payment
 *    - Both scenarios: rebate reduces taxable amount
 *    - $5,000 rebate on $35,000 vehicle = tax on $30,000
 *
 * 3. TRADE-IN VEHICLE-TO-VEHICLE REQUIREMENT:
 *    - Trade-in credit ONLY for vehicle-to-vehicle trades
 *    - Must occur in same transaction
 *    - Must be documented together
 *    - Other trade types (non-vehicle) are taxable
 *
 * 4. VSC/SERVICE CONTRACTS TAXABLE:
 *    - Extended warranties are taxable at time of sale
 *    - Tax must be collected when contract is sold
 *    - Treated as advance payment for future repairs
 *    - Contrasts with many states where VSC is not taxable
 *
 * 5. GAP COVERAGE NOT TAXABLE:
 *    - Guaranteed Auto Protection plans are exempt
 *    - Listed among vehicle dealer exemptions
 *    - Treated as insurance product
 *
 * 6. LEASE TAXATION HYBRID:
 *    - Tax on down payment at signing
 *    - Tax on each monthly lease payment
 *    - Trade-in equity credit allowed if reduces periodic payments
 *    - Cap cost reductions are taxable
 *
 * 7. AGE-BASED PROPERTY TAX (separate from sales tax):
 *    - Utah charges annual Uniform Age-Based Fee
 *    - Based on vehicle age and MSRP
 *    - Decreases as vehicle ages
 *    - In lieu of property tax on vehicles
 *    - Completely separate from one-time sales tax
 *
 * TAX CALCULATION FORMULA (RETAIL):
 * Taxable Base = (Vehicle Price + Accessories + Doc Fee) - Trade-In Value - Manufacturer Rebate
 * Sales Tax = Taxable Base × 6.85%
 * (VSC included in taxable base if purchased; GAP NOT included)
 * (Title and registration fees separately stated NOT included)
 *
 * Example 1 (Basic purchase with trade-in):
 * $30,000 vehicle + $305 doc - $10,000 trade = $20,305 taxable
 * Tax: $20,305 × 6.85% = $1,390.89
 *
 * Example 2 (Purchase with manufacturer rebate):
 * $35,000 vehicle + $305 doc - $5,000 rebate - $8,000 trade = $22,305 taxable
 * Tax: $22,305 × 6.85% = $1,527.89
 *
 * Example 3 (With VSC and GAP):
 * $28,000 vehicle + $305 doc + $2,500 VSC - $7,000 trade = $23,805 taxable
 * GAP $895 (not taxable, added after tax calculation)
 * Tax: $23,805 × 6.85% = $1,630.64
 * Total: $23,805 + $1,630.64 + $895 = $26,330.64
 *
 * LEASE CALCULATION (HYBRID):
 * Upfront Tax = (Down Payment + Doc Fee + Taxable Cap Reductions) × 6.85%
 * Monthly Tax = Monthly Payment × 6.85%
 * Total Tax = Upfront Tax + (Monthly Tax × Number of Payments)
 *
 * Example (Utah lease - 6.85%):
 * Down payment: $3,000 + Doc: $395 + First payment: $450 = $3,845
 * Upfront tax: $3,845 × 6.85% = $263.38 (due at signing)
 * Monthly payment: $450 × 36 months
 * Monthly tax: $450 × 6.85% = $30.83/month
 * Total lease tax: $263.38 + ($30.83 × 36) = $1,373.26
 *
 * TRADE-IN REQUIREMENTS:
 * Official Guidance (Utah Tax Commission Publication 5):
 * "Trades are only allowed for a vehicle-to-vehicle trade and must take place
 * at the same time and must be documented in the same transaction. All other
 * trades are valued and are subject to tax."
 *
 * SOURCES:
 * - Utah State Tax Commission (tax.utah.gov)
 * - Utah Code Title 59, Chapter 12 (Sales and Use Tax Act)
 * - § 59-12-103: Sales tax rate
 * - § 59-12-104: Exemptions and deductions
 * - Utah Tax Commission Publication 5 (Sales Tax Info for Vehicle Dealers)
 * - Utah Tax Commission Rulings 95-025 (GAP coverage), 97-004 (Warranties)
 * - Utah DMV Taxes & Fees guidance (dmv.utah.gov)
 * - Sales Tax Handbook Utah Vehicle Sales Tax Guide
 */
export const US_UT: TaxRulesConfig = {
  stateCode: "UT",
  version: 2,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL (100% credit for vehicle-to-vehicle trades)
   *
   * Utah allows full trade-in credit when trading a vehicle for another vehicle.
   * The trade-in value is deducted from the purchase price before calculating
   * sales tax.
   *
   * Requirements (Utah Tax Commission Publication 5):
   * "Trades are only allowed for a vehicle-to-vehicle trade and must take place
   * at the same time and must be documented in the same transaction."
   *
   * CRITICAL LIMITATION - Vehicle-to-Vehicle Only:
   * - Credit applies ONLY when trading vehicle for vehicle
   * - Must be same transaction (simultaneous exchange)
   * - Must be documented together on sales agreement
   * - Other trade types (equipment, non-vehicle) are TAXABLE
   *
   * How Trade-In Credit Works:
   * The trade-in allowance reduces the taxable purchase price:
   * Taxable Base = (Vehicle Price + Fees + Accessories) - Trade-In Value
   *
   * Example:
   *   Vehicle Price: $30,000
   *   Doc Fee: $305
   *   Trade-In Value: $10,000
   *   Taxable Base: ($30,000 + $305) - $10,000 = $20,305
   *   Tax @ 6.85%: $20,305 × 6.85% = $1,390.89
   *
   * Trade-In Must Be:
   * - Owned by the purchaser
   * - A motor vehicle (car, truck, motorcycle, etc.)
   * - Transferred to dealer as part of vehicle purchase
   * - Separately stated on purchase agreement
   *
   * Payoff Handling:
   * - If trade has loan, dealer pays off lender
   * - Equity (value - payoff) is what reduces taxable base
   * - Negative equity does NOT increase taxable base (see taxOnNegativeEquity)
   *
   * Comparison to General Sales Tax:
   * Utah's 6.85% vehicle rate applies uniformly statewide with full trade credit.
   * This contrasts with general sales tax (4.85% state + local) which varies
   * by jurisdiction.
   *
   * Source: Utah Tax Commission Publication 5; Utah Code § 59-12-104
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules:
   *
   * Utah treats manufacturer and dealer rebates as NON-TAXABLE, meaning they
   * reduce the purchase price for tax calculation purposes.
   *
   * MANUFACTURER REBATES (NON-TAXABLE):
   * Official Guidance (UT Tax Commission Publication 5):
   * "Amounts of manufacturer's rebates, whether paid to the purchaser or retained
   * by the dealer as a down payment, are excluded from the taxable base."
   *
   * This means:
   * - Rebate REDUCES the purchase price for tax purposes
   * - Tax calculated on price AFTER rebate
   * - Applies whether rebate goes to customer OR dealer retains it
   *
   * Tax Treatment:
   * - Customer pays reduced price (after rebate)
   * - Tax calculated on reduced amount
   * - Rebate effectively reduces both price AND tax
   *
   * Example:
   *   Vehicle MSRP: $35,000
   *   Manufacturer Rebate: $5,000
   *   Selling Price: $30,000
   *   TAXABLE BASE: $30,000 (rebate excluded)
   *   Tax @ 6.85%: $30,000 × 6.85% = $2,055
   *
   * Dealer Retention Scenario:
   * If dealer retains manufacturer rebate as down payment:
   *   MSRP: $35,000
   *   Manufacturer Rebate (retained by dealer): $5,000
   *   Customer's Cash Due: $30,000
   *   TAXABLE BASE: $30,000 (rebate still excluded)
   *   Tax @ 6.85%: $2,055
   *
   * DEALER REBATES/INCENTIVES (NON-TAXABLE):
   * If dealer reduces actual selling price due to their own promotion,
   * the tax is on the reduced selling price.
   *
   * Dealer-to-dealer incentives (holdbacks, volume bonuses) paid by
   * manufacturer to dealer do not affect customer tax base directly,
   * but if they result in lower selling price, that lower price is taxable.
   *
   * Example:
   *   MSRP: $35,000
   *   Dealer Discount: -$3,000
   *   Selling Price: $32,000
   *   TAXABLE BASE: $32,000
   *   Tax @ 6.85%: $32,000 × 6.85% = $2,192
   *
   * Contrast with Other States:
   * - Alabama, Colorado: Manufacturer rebates ARE taxable (no reduction)
   * - Utah: Manufacturer rebates reduce tax base (favorable to buyer)
   *
   * Source: Utah Tax Commission Publication 5
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: false,
      notes:
        "Manufacturer rebates are EXCLUDED from taxable base in Utah. Tax calculated on purchase " +
        "price AFTER rebate. This applies whether rebate is paid to purchaser or retained by " +
        "dealer as down payment. Rebate reduces both price and tax (favorable to buyer).",
    },
    {
      appliesTo: "DEALER",
      taxable: false,
      notes:
        "Dealer discounts that reduce the actual selling price are NOT included in taxable base. " +
        "Tax is calculated on the reduced selling price after dealer discount. If dealer reduces " +
        "price from their own promotion, tax is on actual reduced selling price.",
    },
  ],

  /**
   * Doc Fee: TAXABLE (no statutory cap)
   *
   * Utah dealer documentation fees are SUBJECT to the 6.85% motor vehicle
   * sales tax.
   *
   * Official Guidance (UT Tax Commission Publication 5):
   * "Sales and use tax is based on the purchase price. The purchase price
   * includes...dealer fees."
   *
   * Taxability:
   * Doc fee is included in the taxable base:
   * Taxable Base = Vehicle Price + Doc Fee + Accessories - Trade-In - Rebates
   *
   * Statutory Cap: NONE
   * Utah law does not limit the amount of doc fees a dealer can charge.
   * - Average doc fee: $305 (as of 2023-2024)
   * - Observed range: $200 to $500+
   * - Dealers can charge any "reasonable" amount
   *
   * Consumer Protection:
   * Utah has a consumer protection law mandating that each customer must pay
   * the same amount for fees at a dealership (no discriminatory pricing).
   *
   * Disclosure Requirement:
   * Dealers must display signage stating that documentation fees:
   * - Represent costs and profit to the dealer
   * - Are NOT set or mandated by state statute or rule
   * - Must be listed separately on purchase agreement
   *
   * Example:
   *   Vehicle: $28,000
   *   Doc Fee: $305
   *   Trade-In: $8,000
   *   Taxable Base: ($28,000 + $305) - $8,000 = $20,305
   *   Tax @ 6.85%: $20,305 × 6.85% = $1,390.89
   *   (Doc fee included in taxable base)
   *
   * Comparison:
   * Utah's average doc fee ($305) is moderate compared to national averages.
   * Lack of statutory cap allows dealer flexibility but requires transparency.
   *
   * Source: UT Tax Commission Publication 5; UT consumer protection statutes
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules
   *
   * Utah has clear guidance on what is and isn't taxable for motor vehicles.
   *
   * SERVICE CONTRACTS (VSC) - TAXABLE:
   * Utah Tax Commission Ruling 97-004:
   * "If a customer purchases an extended warranty contract, the charge for the
   * warranty contract is taxable at the time of sale."
   *
   * Rationale:
   * "Sales of warranty agreements and service plans are taxable, and the tax
   * must be collected at the time of sale of the agreement, as the service
   * agreement is considered advance payment for future taxable repairs."
   *
   * Key Point: VSC is TAXABLE in Utah (unlike many states)
   * - Tax collected when contract is sold
   * - Considered advance payment for future repairs
   * - Parts and labor under contract are taxable consideration
   *
   * GAP INSURANCE - NOT TAXABLE:
   * Utah Tax Commission Ruling 95-025 & Publication 5:
   * "Charges for Guaranteed Auto Protection (GAP) coverage plans that protect
   * the purchaser in the event of certain property losses are not taxable."
   *
   * Rationale:
   * GAP is treated as insurance product, exempt from sales tax.
   * Protects buyer from negative equity if vehicle totaled.
   *
   * TITLE FEE - NOT TAXABLE:
   * - Government fee, not subject to sales tax
   * - Must be separately stated on invoice
   * - If bundled with other charges, may become taxable
   *
   * REGISTRATION FEES - NOT TAXABLE:
   * - Government fees are exempt
   *
   * DOC FEE - TAXABLE:
   * - See docFeeTaxable above
   *
   * Related Products:
   * - Key replacement programs: NOT taxable (contract)
   * - Tire & wheel/road hazard: NOT taxable (service contract exception)
   * - Window etching: Service, taxability depends on delivery method
   * - Dealer prep charges: TAXABLE (part of purchase price)
   *
   * Source: UT Tax Commission Publication 5; Rulings 95-025, 97-004
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: true,
      notes:
        "Service contracts (VSC) ARE TAXABLE in Utah. Tax must be collected at time of sale. " +
        "Considered advance payment for future taxable repairs. UT Tax Commission Ruling 97-004.",
    },
    {
      code: "GAP",
      taxable: false,
      notes:
        "GAP insurance is NOT taxable in Utah. Guaranteed Auto Protection plans are exempt from " +
        "sales tax per UT Tax Commission Ruling 95-025 and Publication 5. Treated as insurance product.",
    },
    {
      code: "DOC_FEE",
      taxable: true,
      notes:
        "Doc fees ARE TAXABLE at 6.85% rate. Utah has NO cap on doc fees (average $305). Must be " +
        "same for all customers at dealership. Must disclose fees are not state-mandated.",
    },
    {
      code: "TITLE",
      taxable: false,
      notes:
        "Title fee is NOT taxable when separately stated (government fee). If bundled with other " +
        "charges, may be taxable.",
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
   * - Accessories sold WITH vehicle: Taxed at 6.85% rate
   * - Included in taxable purchase price
   * - Subject to trade-in credit (added to price, then trade applied)
   *
   * Negative Equity: NOT taxable
   * - Negative equity rolled into new vehicle loan is NOT subject to sales tax
   * - Represents debt obligation from previous vehicle
   * - Not consideration for new vehicle purchase
   * - Added to loan amount but not to tax base
   *
   * Service Contracts: TAXABLE (unique to Utah)
   * - Extended warranties are taxable at time of sale
   * - Tax collected when contract is purchased
   * - Contrasts with most states where VSC is not taxable
   *
   * GAP: NOT taxable
   * - Insurance product, exempt from sales tax
   *
   * Example (Accessories):
   *   Vehicle: $25,000
   *   Accessories: $2,000
   *   Doc Fee: $305
   *   Trade-In: $7,000
   *   Taxable Base: ($25,000 + $2,000 + $305) - $7,000 = $20,305
   *   Tax @ 6.85%: $20,305 × 6.85% = $1,390.89
   *
   * Example (Negative Equity):
   *   New Vehicle Price: $28,000
   *   Doc Fee: $305
   *   Trade-In Actual Value: $10,000
   *   Trade-In Payoff: $14,000
   *   Negative Equity: $4,000
   *
   *   Taxable Base: ($28,000 + $305) - $10,000 = $18,305
   *   NOT: $22,305 (do not add negative equity)
   *   Tax @ 6.85%: $18,305 × 6.85% = $1,253.89
   *   Amount Financed: $18,305 + $1,253.89 + $4,000 = $23,558.89
   *   (Negative equity NOT taxed)
   *
   * Example (Service Contract):
   *   Vehicle: $30,000
   *   VSC: $2,500
   *   Doc Fee: $305
   *   Trade-In: $10,000
   *   Taxable Base: ($30,000 + $2,500 + $305) - $10,000 = $22,805
   *   Tax @ 6.85%: $22,805 × 6.85% = $1,562.14
   *   (VSC IS included in taxable base)
   *
   * Source: UT Tax Commission Publication 5
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: false,
  taxOnServiceContracts: true, // UNIQUE: Utah taxes VSC
  taxOnGap: false,

  /**
   * Vehicle Tax Scheme: STATE_ONLY (uniform statewide rate)
   *
   * Utah uses a UNIFORM STATEWIDE motor vehicle sales tax rate with NO local
   * variations. This is one of the simplest state tax structures in the nation.
   *
   * Motor Vehicle Sales Tax: 6.85% STATEWIDE
   * - Applies to all motor vehicle sales throughout Utah
   * - No county variations
   * - No city variations
   * - No special district variations
   * - Same rate whether in Salt Lake City or rural Utah
   *
   * Legal Basis:
   * Utah Code § 59-12-103 establishes the motor vehicle sales tax rate.
   * Unlike general sales tax (which has state + local components), the motor
   * vehicle rate is UNIFORM across the entire state.
   *
   * Contrast with General Sales Tax:
   * - General sales tax: 4.85% state + up to 4.2% local = 6.1% to 9.05%
   * - Motor vehicle tax: 6.85% FLAT statewide
   *
   * Why Uniform Rate?
   * Utah simplified motor vehicle taxation to:
   * - Reduce complexity for dealers
   * - Eliminate jurisdiction shopping
   * - Provide consistency for buyers
   * - Simplify tax collection and remittance
   *
   * Tax Collection Point:
   * Since rate is uniform, dealer location doesn't matter for rate calculation.
   * All dealers collect same 6.85% rate regardless of where they're located.
   *
   * Comparison to Other States:
   * Most states have varying local rates (California, Texas, Colorado, etc.).
   * Utah's uniform rate is similar to:
   * - Indiana: 7% flat statewide
   * - Michigan: 6% flat statewide
   * - Kentucky: 6% flat statewide
   *
   * Simplicity Advantage:
   * - One rate to remember: 6.85%
   * - No rate lookup required
   * - No jurisdiction determination needed
   * - Easy for dealers to calculate
   * - Clear for buyers to understand
   *
   * Annual Property Tax (separate):
   * Utah also charges Uniform Age-Based Fee annually at registration.
   * This is a SEPARATE recurring tax based on vehicle age and value.
   * Not part of one-time sales tax.
   *
   * Source: Utah Code § 59-12-103; UT DMV Taxes & Fees guidance
   */
  vehicleTaxScheme: "STATE_ONLY",
  vehicleUsesLocalSalesTax: false,

  // ============================================================================
  // LEASE TRANSACTION RULES
  // ============================================================================

  leaseRules: {
    /**
     * Lease Method: HYBRID (upfront + monthly)
     *
     * Utah uses a hybrid lease taxation approach:
     * 1. Upfront payments (down payment, first payment, fees) taxed at signing
     * 2. Monthly lease payments taxed each month
     *
     * Official Guidance (UT Tax Commission):
     * "Sales tax in Utah is calculated on both your down payment and your
     * monthly lease payments. This means you only pay taxes for as long as
     * you lease the vehicle rather than paying a lump sum of sales tax."
     *
     * Rate: 6.85% uniform statewide
     * - Same rate as retail sales tax
     * - No local variations
     * - Simple calculation
     *
     * What is Taxed:
     * Upfront (at signing):
     * - Down payment / capitalized cost reduction
     * - First monthly payment (if paid upfront)
     * - Doc fees, acquisition fees
     * - Portion of upfront payments that are part of lease price
     *
     * Monthly:
     * - Each lease payment amount
     * - Finance charges included in payment
     *
     * Not Taxed Upfront:
     * - Payoffs of previously existing obligations
     * - License/registration/titling fees (government fees)
     * - Refundable security deposits (if truly refundable)
     *
     * Calculation:
     * Upfront Tax = Taxable Upfront Payments × 6.85%
     * Monthly Tax = Monthly Payment × 6.85%
     * Total Tax = Upfront Tax + (Monthly Tax × Number of Payments)
     *
     * Example (36-month lease):
     *   Down Payment: $3,000
     *   Doc Fee: $395
     *   First Payment: $450 (paid upfront)
     *   Total Upfront: $3,845
     *
     *   Upfront Tax: $3,845 × 6.85% = $263.38 (due at signing)
     *   Monthly Payment: $450 (paid monthly, not upfront after first)
     *   Monthly Tax: $450 × 6.85% = $30.83/month
     *   Total Tax: $263.38 + ($30.83 × 36) = $1,373.26
     *
     * Trade-In Equity in Leases:
     * "The trade-in credit for an owned vehicle is allowed against the typical
     * lease situation if the trade equity reduces the periodic lease payments
     * to the lessor."
     *
     * If trade-in equity reduces monthly payments, the REDUCED payment is
     * what gets taxed monthly. Trade equity effectively lowers tax burden.
     *
     * Lessor Responsibility:
     * "Lessors are responsible for the tax on payments they receive or credit
     * against the lease and are also responsible for collecting tax on the
     * sale of vehicles at lease termination."
     *
     * Source: UT Tax Commission Publication 5; Utah DMV guidance
     */
    method: "HYBRID",

    /**
     * Cap Cost Reduction: Partially taxable
     *
     * In Utah, capitalized cost reductions are generally taxable as upfront
     * payments, with the exception of trade-in equity which can reduce the
     * lease payment (and thus the tax).
     *
     * What is Taxed Upfront:
     * - Cash down payments
     * - Manufacturer rebates applied as cap reduction
     * - Dealer discounts applied as cap reduction
     * - First payment if paid upfront
     *
     * Trade-In Treatment:
     * Official Guidance (UT Tax Commission Publication 5):
     * "The trade-in credit for an owned vehicle is allowed against the typical
     * lease situation if the trade equity reduces the periodic lease payments
     * to the lessor."
     *
     * This means:
     * - Trade-in CAN reduce tax burden on leases
     * - If trade equity reduces monthly payment, tax is on LOWER payment
     * - Different from Alabama (where trade equity is fully taxed)
     * - Similar to retail treatment (trade reduces taxable base)
     *
     * Example:
     *   Gross Cap Cost: $40,000
     *   Cap Cost Reductions:
     *     - Cash down: $4,000 (taxable upfront)
     *     - Trade-in equity: $3,000 (reduces payment, not taxed directly)
     *     - Total: $7,000
     *
     *   Adjusted Cap Cost: $33,000 (for payment calculation)
     *   Upfront Tax: $4,000 × 6.85% = $274 (cash down only)
     *   (Trade-in equity not taxed, but reduces payment amount)
     *
     * Mark as true because cash/rebates ARE taxed, but calculation logic
     * must handle trade-in separately per Utah's guidance.
     *
     * Source: UT Tax Commission Publication 5
     */
    taxCapReduction: true,

    /**
     * Rebate Behavior on Leases: FOLLOW_RETAIL_RULE
     *
     * In Utah, manufacturer rebates applied as cap cost reduction on leases
     * follow the same treatment as retail: they are NON-TAXABLE (reduce base).
     *
     * However, when rebates are part of upfront cap reduction, they reduce
     * the amount subject to upfront tax.
     *
     * Example:
     *   Cap Cost: $40,000
     *   Manufacturer Rebate: $2,500 (applied as cap reduction)
     *   Cash Down: $3,000
     *
     *   Taxable Upfront: $3,000 (cash only, rebate not taxed)
     *   Upfront Tax: $3,000 × 6.85% = $205.50
     *
     * This follows Utah's retail rule where rebates reduce taxable base.
     *
     * Source: UT Tax Commission Publication 5
     */
    rebateBehavior: "FOLLOW_RETAIL_RULE",

    /**
     * Doc Fee on Leases: ALWAYS taxable
     *
     * Dealer documentation fees and acquisition fees are subject to sales tax
     * on leases.
     *
     * Application:
     * - If doc fee paid upfront (at inception): Taxed immediately at 6.85%
     * - If capitalized into lease: Becomes part of monthly payment, taxed monthly
     *
     * Most Common Treatment:
     * Doc fees are typically paid upfront and taxed at inception.
     *
     * Example:
     *   Acquisition Fee: $595 (paid at signing)
     *   Tax on Fee: $595 × 6.85% = $40.76 (due at signing)
     *
     * Source: UT Tax Commission Publication 5
     */
    docFeeTaxability: "ALWAYS",

    /**
     * Trade-in Credit on Leases: FULL (follows retail)
     *
     * Utah allows trade-in credit on leases when the customer owns the vehicle
     * being traded.
     *
     * Official Guidance (UT Tax Commission Publication 5):
     * "The trade-in credit for an owned vehicle is allowed against the typical
     * lease situation if the trade equity reduces the periodic lease payments
     * to the lessor."
     *
     * How It Works:
     * - Trade-in equity reduces the adjusted cap cost
     * - Lower cap cost = lower monthly payment
     * - Tax is calculated on LOWER monthly payment
     * - Trade equity effectively reduces tax burden
     *
     * Requirements:
     * - Customer must OWN the vehicle being traded
     * - Trade-in must be transferred to lessor/dealer
     * - Trade-in allowance separately stated
     * - Must reduce periodic payments to lessor
     *
     * Example:
     *   Gross Cap Cost: $40,000
     *   Trade-In Value: $8,000 (customer owns)
     *   Adjusted Cap Cost: $32,000
     *
     *   Without trade: Payment might be $550/month
     *   With trade: Payment is $450/month
     *
     *   Tax without trade: $550 × 6.85% = $37.68/month
     *   Tax with trade: $450 × 6.85% = $30.83/month
     *   Monthly tax savings: $6.85/month
     *
     * This is DIFFERENT from states like Alabama where trade-in equity on
     * leases is fully taxed as cap cost reduction.
     *
     * Source: UT Tax Commission Publication 5
     */
    tradeInCredit: "FULL",

    /**
     * Negative Equity on Leases: Likely taxable
     *
     * While Utah guidance doesn't explicitly address negative equity on leases,
     * following the general principle that amounts included in cap cost are
     * taxable, negative equity that increases cap cost would likely be taxable.
     *
     * Treatment:
     * - Negative equity increases capitalized cost
     * - Higher cap cost = higher monthly payment
     * - Tax calculated on higher payment
     *
     * Example:
     *   Base Cap Cost: $35,000
     *   Trade-In Value: $10,000
     *   Trade-In Payoff: $14,000
     *   Negative Equity: $4,000
     *
     *   Adjusted Cap Cost: $39,000 (includes negative equity)
     *   Payment calculation based on $39,000
     *   Tax on resulting higher payment
     *
     * Mark as true consistent with cap cost taxation principle.
     *
     * Source: Inferred from UT Tax Commission Publication 5 guidance
     */
    negativeEquityTaxable: true,

    /**
     * Fee Taxability on Leases
     *
     * Backend products on leases follow same rules as retail in Utah:
     *
     * SERVICE CONTRACTS (VSC):
     * - TAXABLE on leases (same as retail)
     * - Tax collected at time of sale
     * - Considered advance payment for future repairs
     *
     * GAP INSURANCE:
     * - NOT taxable on leases (same as retail)
     * - Treated as insurance product
     * - Exempt per UT Tax Commission Ruling 95-025
     *
     * ACCESSORIES:
     * - TAXABLE at lease rates
     * - If included in cap cost: Affects payment calculation
     * - Tax applies to portion of payment attributable to accessories
     *
     * DOC FEE / ACQUISITION FEE:
     * - TAXABLE on leases (see docFeeTaxability above)
     *
     * TITLE FEE:
     * - NOT taxable when separately stated
     *
     * Source: UT Tax Commission Publication 5; Rulings 95-025, 97-004
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: true,
        notes: "Doc fee TAXABLE on leases. Typically taxed upfront at inception at 6.85%.",
      },
      {
        code: "ACQUISITION_FEE",
        taxable: true,
        notes: "Acquisition fee TAXABLE on leases at 6.85%.",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: true,
        notes:
          "Service contracts ARE TAXABLE on leases in Utah (same as retail). Tax collected at " +
          "time of sale per UT Tax Commission Ruling 97-004.",
      },
      {
        code: "GAP",
        taxable: false,
        notes:
          "GAP insurance NOT taxable on leases (same as retail). Insurance product exempt per " +
          "UT Tax Commission Ruling 95-025.",
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

    specialScheme: "NONE",

    notes:
      "Utah: HYBRID lease taxation (upfront + monthly). Uniform 6.85% statewide rate (no local " +
      "variations). Upfront payments (down payment, fees) taxed at signing. Monthly payments " +
      "taxed monthly. Trade-in equity ALLOWED and reduces payment (thus reducing tax burden). " +
      "Manufacturer rebates follow retail rule (non-taxable, reduce base). VSC TAXABLE on leases " +
      "(unique to Utah). GAP NOT taxable. Doc/acquisition fees taxable. Simple uniform rate makes " +
      "calculation straightforward.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: CREDIT (credit for taxes paid to other states)
   *
   * Utah provides reciprocal credit for sales tax paid in other states.
   *
   * Official Guidance (UT Tax Commission):
   * "A Utah resident who purchases a vehicle outside of Utah may take a sales
   * and use tax credit for tax paid to the other state on the purchase."
   *
   * Policy:
   * "Utah will allow credit for tax properly due and paid first to a state
   * other than Utah. You can take a credit for the sales or use tax paid to
   * another state. The credit cannot be more than the Utah use tax owed."
   *
   * How It Works:
   * UT Tax Owed = (UT Rate 6.85% × Purchase Price) - Other State Tax Paid
   * Credit capped at Utah tax amount.
   *
   * Example 1 (Other State Lower Rate):
   *   Vehicle Price: $30,000
   *   Nevada Tax Paid: $2,475 (8.25%)
   *   UT Tax Would Be: $30,000 × 6.85% = $2,055
   *   Credit: $2,055 (limited to UT tax)
   *   Pay to UT: $0 (other state tax exceeds UT tax)
   *
   * Example 2 (Other State Higher Rate):
   *   Vehicle Price: $30,000
   *   Wyoming Tax Paid: $1,200 (4%)
   *   UT Tax Would Be: $30,000 × 6.85% = $2,055
   *   Credit: $1,200
   *   Pay to UT: $2,055 - $1,200 = $855
   *
   * Example 3 (No Tax State):
   *   Vehicle Price: $30,000
   *   Montana Tax Paid: $0 (no sales tax)
   *   UT Tax Would Be: $30,000 × 6.85% = $2,055
   *   Credit: $0
   *   Pay to UT: $2,055 (full UT tax)
   *
   * Residency Requirement:
   * "A resident is someone who has established domicile in Utah for a total
   * period of six months or more during any calendar year."
   *
   * Documentation Required:
   * - Bill of sale showing purchase price
   * - Receipt showing taxes paid to other state
   * - Proof that tax was "properly due" to other state
   *
   * Credit Cap:
   * Credit cannot exceed the Utah use tax owed. If you paid more tax in
   * another state, you don't get a refund for the difference.
   *
   * Scope:
   * Reciprocity applies to both retail purchases and leases.
   *
   * RECIPROCAL AGREEMENTS:
   * Utah has reciprocal agreements with Idaho and Wyoming specifically for
   * vehicle registration purposes (allowing commuters to use vehicles
   * registered in their home state in the other state for commuting).
   *
   * These registration reciprocity agreements are SEPARATE from sales tax
   * credit and do not waive sales or use taxes.
   *
   * Source: UT Tax Commission guidance; UT Code Title 59 Chapter 12
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
      "Utah provides reciprocity credit for taxes paid to other states, capped at UT tax amount " +
      "(6.85% of purchase price). Must provide proof of tax paid. Credit limited to Utah use tax " +
      "owed. If other state tax exceeds UT tax, no additional tax due (but no refund). Residency " +
      "requirement: 6+ months domicile in Utah. Applies to both retail and lease transactions. " +
      "Registration reciprocity with ID/WY is separate (doesn't waive taxes).",
  },

  extras: {
    lastUpdated: "2025-11-14",
    sources: [
      "Utah State Tax Commission (tax.utah.gov)",
      "Utah Code Title 59, Chapter 12 (Sales and Use Tax Act)",
      "§ 59-12-103: Sales tax rate",
      "§ 59-12-104: Exemptions and deductions",
      "Utah Tax Commission Publication 5 (Sales Tax Info for Vehicle Dealers)",
      "Utah Tax Commission Ruling 95-025 (GAP coverage exemption)",
      "Utah Tax Commission Ruling 97-004 (Service contract taxability)",
      "Utah DMV Taxes & Fees guidance (dmv.utah.gov)",
      "Sales Tax Handbook Utah Vehicle Sales Tax Guide",
    ],
    notes:
      "Utah has 6.85% UNIFORM STATEWIDE motor vehicle sales tax (NO local variations). One of the " +
      "simplest state tax structures. FULL trade-in credit (vehicle-to-vehicle only, same transaction). " +
      "Manufacturer rebates NON-TAXABLE (reduce tax base, favorable to buyer). Doc fee taxable, NO " +
      "CAP (avg $305). UNIQUE: VSC/service contracts ARE TAXABLE (unlike most states). GAP NOT taxable. " +
      "Lease: HYBRID (upfront + monthly), uniform 6.85% rate. Trade-in credit ALLOWED on leases " +
      "(reduces payment and tax). Reciprocity: Credit for tax paid elsewhere (capped at UT tax). " +
      "Uniform Age-Based Fee: Annual recurring tax separate from sales tax. Simple, consistent, " +
      "easy to calculate.",
    stateRate: 6.85,
    generalSalesRate: 4.85,
    avgDocFee: 305,
    docFeeCap: null, // No statutory cap
    uniqueFeatures: [
      "Uniform 6.85% statewide rate (no local variations)",
      "One of simplest state tax structures in nation",
      "Manufacturer rebates NON-TAXABLE (reduce tax base)",
      "VSC/service contracts ARE TAXABLE (unique feature)",
      "GAP insurance NOT taxable",
      "Full trade-in credit (vehicle-to-vehicle only)",
      "Trade-in allowed on leases (reduces payment/tax)",
      "No doc fee cap (average $305)",
      "Uniform Age-Based Fee (annual property tax on vehicles)",
      "Reciprocity with tax credit capped at UT rate",
    ],
    uniformAgeBasedFee:
      "Utah charges annual Uniform Age-Based Fee at registration renewal. Based on vehicle age " +
      "and original MSRP. Decreases as vehicle ages. In lieu of personal property tax. SEPARATE " +
      "from one-time sales tax. Paid to county clerk annually.",
    tradeInRequirement:
      "Vehicle-to-vehicle trades only. Must occur in same transaction and be documented together. " +
      "Other trade types (non-vehicle) are subject to tax.",
    consumerProtection:
      "Utah law mandates that each customer must pay the same doc fee amount at a dealership. " +
      "Dealers must display signage stating fees are not state-mandated and represent dealer costs/profit.",
  },
};

export default US_UT;
