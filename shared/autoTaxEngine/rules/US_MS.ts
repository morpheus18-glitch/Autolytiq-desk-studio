import { TaxRulesConfig } from "../types";

/**
 * MISSISSIPPI TAX RULES
 *
 * Researched: 2025-11-14
 * Version: 2
 *
 * KEY FACTS:
 * - State sales tax: 5% on vehicles ≤ 10,000 lbs (cars, vans, light trucks)
 * - Heavy trucks: 3% on trucks/carriers of property > 10,000 lbs
 * - General sales tax: 7% (vehicles have reduced rate)
 * - Trade-in credit: FULL (deducted from purchase price before tax)
 * - Manufacturer rebates: TAXABLE (do NOT reduce tax base - unique)
 * - Dealer rebates: NON-TAXABLE (reduce the purchase price)
 * - Doc fee: TAXABLE, NO STATE CAP (district caps exist, avg ~$425)
 * - Service contracts (VSC): NOT taxed at time of sale
 * - GAP insurance: NOT taxed at time of sale (insurance product)
 * - Lease taxation: MONTHLY (tax on each payment at 5%)
 * - Reciprocity: NONE (no credit for taxes paid to other states)
 * - Local taxes: NONE (state-only taxation)
 *
 * UNIQUE MISSISSIPPI FEATURES:
 * 1. MANUFACTURER REBATES TAXABLE (rare):
 *    - Mississippi taxes the purchase BEFORE manufacturer rebates/incentives
 *    - Customer pays tax on full pre-rebate price
 *    - $3,000 manufacturer rebate on $30,000 vehicle = tax on $30,000, not $27,000
 *    - Dealer rebates ARE deductible (opposite treatment)
 *
 * 2. HEAVY TRUCK REDUCED RATE:
 *    - Trucks > 10,000 lbs GVW: 3% rate
 *    - Cars, vans, light trucks ≤ 10,000 lbs: 5% rate
 *    - Significant savings for commercial vehicles
 *
 * 3. SERVICE CONTRACTS NOT TAXED AT SALE:
 *    - Extended warranties/VSC sold with vehicle: NOT taxed at time of sale
 *    - Only the resulting repair work is taxed (when services performed)
 *    - Pre-determined maintenance schedules: Taxed at time of sale (prepaid service)
 *    - Customer-requested service only: NOT taxed upfront
 *
 * 4. NO RECIPROCITY:
 *    - Mississippi does NOT provide credit for taxes paid to other states
 *    - Residents who purchase vehicles out-of-state pay FULL Mississippi tax
 *    - No offset for taxes already paid to another state
 *    - Double taxation possible
 *
 * 5. STATE-ONLY TAX:
 *    - No county taxes on vehicles
 *    - No city/municipal taxes on vehicles
 *    - Uniform 5% rate statewide (or 3% for heavy trucks)
 *
 * 6. DISTRICT DOC FEE CAPS:
 *    - Mississippi has 7 Motor Vehicle Commission districts
 *    - Each district sets doc fee cap at 25% above district average
 *    - No statewide statutory cap
 *    - Average doc fee: ~$425
 *    - Varies by district and dealer
 *
 * 7. GAP INSURANCE TREATMENT:
 *    - NOT taxed at time of sale (insurance product)
 *    - Same treatment as service contracts
 *
 * TAX CALCULATION FORMULA (RETAIL - STANDARD VEHICLES):
 * Taxable Base = Vehicle Price + Accessories + Doc Fee + Manufacturer Rebates - Trade-In - Dealer Rebates
 * Sales Tax = Taxable Base × 5%
 * (VSC and GAP NOT included in taxable base)
 *
 * Example (Standard Vehicle):
 * Vehicle Price: $30,000
 * Manufacturer Rebate: $2,500 (taxable - do NOT subtract)
 * Dealer Discount: $1,000 (non-taxable - subtract)
 * Accessories: $1,500
 * Doc Fee: $425
 * VSC: $1,800 (not taxed at sale)
 * GAP: $695 (not taxed at sale)
 * Trade-In: $10,000
 *
 * Taxable Base: $30,000 + $1,500 + $425 - $1,000 - $10,000 = $20,925
 * (Manufacturer rebate NOT deducted, applied after tax calculation)
 * Sales Tax: $20,925 × 5% = $1,046.25
 *
 * Customer Pays:
 * Vehicle: $30,000
 * Accessories: $1,500
 * Doc Fee: $425
 * VSC: $1,800
 * GAP: $695
 * Sales Tax: $1,046.25
 * Subtotal: $34,446.25
 * Less Trade-In: $10,000
 * Less Dealer Discount: $1,000
 * Less Manufacturer Rebate: $2,500
 * Total Due: $20,946.25
 *
 * TAX CALCULATION FORMULA (HEAVY TRUCKS > 10,000 LBS):
 * Taxable Base = Vehicle Price + Accessories + Doc Fee + Manufacturer Rebates - Trade-In - Dealer Rebates
 * Sales Tax = Taxable Base × 3%
 *
 * Example (Heavy Truck):
 * Truck Price: $60,000 (GVW > 10,000 lbs)
 * Accessories: $3,000
 * Doc Fee: $425
 * Trade-In: $15,000
 *
 * Taxable Base: $60,000 + $3,000 + $425 - $15,000 = $48,425
 * Sales Tax: $48,425 × 3% = $1,452.75
 *
 * LEASE CALCULATION (MONTHLY):
 * Tax Base = Monthly Lease Payment
 * Tax = Monthly Payment × 5%
 *
 * Example:
 * Monthly Payment: $450
 * Sales Tax: $450 × 5% = $22.50
 * Total Monthly Due: $472.50
 *
 * SOURCES:
 * - Mississippi Department of Revenue (dor.ms.gov)
 * - Mississippi Code Title 27, Chapter 65 (Sales Tax)
 * - Miss. Code § 27-65-201: Tax upon sale or use of motor vehicles
 * - Miss. Code § 27-65-17: Retail sales of motor vehicles
 * - Mississippi Motor Vehicle Commission (mmvc.ms.gov)
 * - 30 Miss. Code. R. 1301-8.1: Motor Vehicle Dealer Document/Service Fee
 * - Miss. Code § 75-24-91: Service contract defined
 * - Miss. Code Title 83, Chapter 65: Regulation of Vehicle Service Contracts
 * - Mississippi DOR Sales Tax Rate Tables
 * - Mississippi Sales Tax Handbook (salestaxhandbook.com)
 */
export const US_MS: TaxRulesConfig = {
  stateCode: "MS",
  version: 2,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL
   *
   * Mississippi allows full trade-in credit. The trade-in value is deducted
   * from the purchase price before calculating the 5% (or 3%) sales tax.
   *
   * Statutory Basis (Miss. Code § 27-65-201):
   * The sales tax applies to the net purchase price after trade-in allowance.
   * Trade-ins reduce the taxable base dollar-for-dollar.
   *
   * Tax Treatment:
   * - Trade-in value deducted from gross purchase price
   * - Sales tax calculated on net amount
   * - Full credit applies to all vehicle types
   *
   * Example:
   *   Vehicle Price: $28,000
   *   Trade-In Value: $12,000
   *   Taxable Base: $28,000 - $12,000 = $16,000
   *   Sales Tax (5%): $16,000 × 5% = $800
   *
   * Comparison with Other Items:
   * - Trade-in: FULL credit (reduces tax base)
   * - Manufacturer rebates: NO credit (taxable, see below)
   * - Dealer rebates: Reduce tax base (non-taxable)
   *
   * Source: Miss. Code § 27-65-201, Mississippi DOR guidance
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules: SPLIT treatment (unique Mississippi feature)
   *
   * Mississippi has a UNIQUE rebate treatment that distinguishes between
   * manufacturer and dealer rebates.
   *
   * MANUFACTURER REBATES: TAXABLE (uncommon treatment)
   *
   * Official Guidance:
   * "Mississippi taxes vehicle purchases before rebates or incentives are
   * applied to the price, and the taxable selling price does not include
   * manufacturer's rebates."
   *
   * This means:
   * - Customer pays tax on FULL price BEFORE manufacturer rebate
   * - Manufacturer rebate does NOT reduce taxable amount
   * - Rebate applied AFTER tax calculation to reduce out-of-pocket cost
   * - Customer gets NO tax benefit from manufacturer rebates
   *
   * Example:
   *   MSRP: $32,000
   *   Manufacturer Rebate: $3,000
   *   Customer Pays (Pre-Tax): $29,000
   *   Tax Base: $32,000 (NOT $29,000)
   *   Sales Tax (5%): $32,000 × 5% = $1,600
   *   Total Cost: $29,000 + $1,600 = $30,600
   *
   * This is RARE. Most states allow manufacturer rebates to reduce tax base.
   * Mississippi, along with Alabama and a few others, taxes the pre-rebate price.
   *
   * DEALER REBATES: NON-TAXABLE
   *
   * Official Guidance:
   * "You do not have to pay tax on dealer rebates in Mississippi. The dealer
   * rebate amount should be subtracted from the car price before calculating
   * sales tax."
   *
   * Dealer Treatment:
   * - Dealer discounts reduce the selling price
   * - Tax calculated on reduced price (after dealer discount)
   * - Customer benefits from lower tax base
   *
   * Example:
   *   Vehicle Price: $30,000
   *   Dealer Discount: $2,000
   *   Selling Price: $28,000
   *   Tax Base: $28,000
   *   Sales Tax (5%): $28,000 × 5% = $1,400
   *
   * CRITICAL DISTINCTION:
   * - Manufacturer rebate (factory to customer): TAXABLE (no tax benefit)
   * - Dealer rebate (dealer discount): NON-TAXABLE (reduces tax base)
   *
   * Why the Difference?
   * Mississippi views manufacturer rebates as post-sale incentives that don't
   * affect the actual transaction price between dealer and buyer. Dealer
   * discounts, however, directly reduce the selling price.
   *
   * Source: Mississippi DOR guidance, salestaxhandbook.com/mississippi
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: true,
      notes:
        "Manufacturer rebates do NOT reduce taxable amount in Mississippi (UNIQUE feature). " +
        "Tax is calculated on full vehicle price BEFORE manufacturer rebates. Customer pays " +
        "tax on pre-rebate price. Rebate applied after tax calculation to reduce out-of-pocket cost.",
    },
    {
      appliesTo: "DEALER",
      taxable: false,
      notes:
        "Dealer rebates and discounts DO reduce the purchase price and tax base. Dealer " +
        "discount subtracted from vehicle price before calculating sales tax. Customer benefits " +
        "from lower tax base.",
    },
  ],

  /**
   * Doc Fee: TAXABLE, NO STATEWIDE CAP (district caps exist)
   *
   * Documentation fees are subject to Mississippi's 5% sales tax.
   *
   * Taxability (Miss. Code § 27-65-201):
   * "The tax applies to the total purchase price, including fees such as
   * delivery charges or dealer add-ons."
   *
   * Official Guidance:
   * "Ancillary fees like documentation, dealer preparation, and delivery
   * charges are included in the calculation base, as they reflect the total
   * cost to the buyer."
   *
   * Doc fees are part of the retail transaction and subject to sales tax.
   *
   * DISTRICT CAP SYSTEM (30 Miss. Code. R. 1301-8.1):
   * Mississippi uses a unique district-based cap system:
   * - State divided into 7 Motor Vehicle Commission districts
   * - Each district calculates average doc fee within district
   * - District cap = District average + 25%
   * - Dealers cannot exceed their district's cap
   * - No single statewide cap
   *
   * Example District Caps (illustrative):
   * - Metro Jackson District: ~$450 cap
   * - Coastal District: ~$475 cap
   * - Rural District: ~$400 cap
   * (Actual caps vary and are updated periodically)
   *
   * Average Doc Fee: $425 (2023-2024 data)
   * Typical Range: $300 - $475 (varies by district)
   *
   * Tax Treatment:
   * Doc fee is included in taxable base and subject to 5% sales tax.
   *
   * Example:
   *   Doc Fee: $425
   *   Sales Tax (5%): $425 × 5% = $21.25
   *   Total Doc Fee Cost: $425 (tax included in base)
   *
   * Documentation Required (30 Miss. Code. R. 1301-8.1):
   * A document/service fee:
   * - Is not an official fee and not required by law
   * - May be charged for preparation, handling, and processing of documents
   * - May include dealer profit
   * - Must be clearly disclosed to buyer/lessee
   * - Must not exceed district cap
   *
   * Source: Miss. Code § 27-65-201, 30 Miss. Code. R. 1301-8.1, MMVC guidance
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules
   *
   * Mississippi has specific guidance on fee taxability for motor vehicles.
   *
   * SERVICE CONTRACTS (VSC):
   * - NOT taxed at time of sale (Miss. Code § 27-65-17, DOR guidance)
   * - Official Guidance: "Extended warranties sold in connection with the
   *   sale of motor vehicles are NOT taxed at the time of the sale"
   * - Only resulting repair work is taxed when services performed
   * - Exception: Pre-determined maintenance schedules ARE taxed at sale
   *   (considered prepayment of taxable service)
   * - Customer-requested service only: NOT taxed upfront
   *
   * Legal Framework (Miss. Code § 75-24-91):
   * "A service contract is not a contract for insurance and [is] exempt from
   * the provisions of Title 83" (Insurance Code)
   *
   * However, for sales tax purposes, service contracts are NOT taxed when
   * sold with vehicle, but subsequent repairs under the contract ARE taxed.
   *
   * GAP INSURANCE:
   * - NOT taxed at time of sale (insurance product)
   * - Treated similar to service contracts
   * - Not subject to sales tax when sold with vehicle
   *
   * DOC FEE:
   * - TAXABLE (see docFeeTaxable above)
   * - Included in purchase price for tax calculation
   *
   * TITLE FEE:
   * - NOT taxable (government fee)
   * - Mississippi Certificate of Title fee
   * - Separately stated, not included in sales tax base
   *
   * REGISTRATION FEES:
   * - NOT taxable (government fees)
   * - License plate and registration fees
   * - Collected separately, not subject to sales tax
   *
   * DEALER PREP / DELIVERY CHARGES:
   * - TAXABLE when part of retail sale
   * - Included in total purchase price
   * - Subject to 5% sales tax
   *
   * Source: Miss. Code § 27-65-17, § 75-24-91, Mississippi DOR guidance
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: false,
      notes:
        "Service contracts (VSC) are NOT taxed at time of sale in Mississippi. Only the " +
        "resulting repair work is taxed when services are performed. Exception: Pre-determined " +
        "maintenance schedules ARE taxed at sale (prepaid service). Customer-requested service " +
        "only contracts are NOT taxed upfront.",
    },
    {
      code: "GAP",
      taxable: false,
      notes:
        "GAP insurance is NOT taxed at time of sale in Mississippi. Treated as insurance " +
        "product, exempt from sales tax when sold with vehicle.",
    },
    {
      code: "DOC_FEE",
      taxable: true,
      notes:
        "Doc fees are TAXABLE at 5% sales tax rate. Mississippi has district-based caps " +
        "(7 districts, each cap = district avg + 25%). No statewide cap. Average doc fee ~$425.",
    },
    {
      code: "TITLE",
      taxable: false,
      notes:
        "Title fee is NOT taxable (government fee). Separately stated on invoice, not " +
        "included in sales tax base.",
    },
    {
      code: "REG",
      taxable: false,
      notes:
        "Registration fees are NOT taxable (government fees). License plate and " +
        "registration fees collected separately.",
    },
    {
      code: "DEALER_PREP",
      taxable: true,
      notes:
        "Dealer prep and delivery charges are TAXABLE when part of retail sale. Included " +
        "in total purchase price subject to 5% sales tax.",
    },
  ],

  /**
   * Product Taxability
   *
   * ACCESSORIES: TAXABLE
   * - Dealer-installed accessories included in purchase price
   * - Subject to 5% sales tax (or 3% for heavy trucks)
   * - No distinction between factory and aftermarket accessories
   *
   * Example:
   *   Vehicle: $30,000
   *   Accessories (running boards, tonneau cover): $2,500
   *   Taxable Base: $32,500
   *   Sales Tax (5%): $32,500 × 5% = $1,625
   *
   * NEGATIVE EQUITY: TAXABLE
   * - Negative equity rolled into purchase increases taxable base
   * - Subject to 5% sales tax
   * - Treated as part of vehicle purchase price
   *
   * Example with Negative Equity:
   *   Vehicle Price: $25,000
   *   Trade-In Value: $10,000
   *   Trade-In Payoff: $14,000
   *   Negative Equity: $4,000
   *
   *   Taxable Base: $25,000 + $4,000 - $10,000 = $19,000
   *   Sales Tax (5%): $19,000 × 5% = $950
   *
   *   Amount Financed: $25,000 + $4,000 + $950 = $29,950
   *   Less Trade-In: $10,000
   *   Finance Amount: $19,950
   *
   * SERVICE CONTRACTS: NOT TAXED AT SALE
   * - VSC not taxed when sold with vehicle
   * - Only subsequent repairs taxed
   *
   * GAP: NOT TAXED AT SALE
   * - GAP insurance not taxed when sold with vehicle
   *
   * Source: Miss. Code § 27-65-201, Mississippi DOR guidance
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: true,
  taxOnServiceContracts: false, // NOT taxed at time of sale
  taxOnGap: false, // NOT taxed at time of sale

  /**
   * Vehicle Tax Scheme: STATE_ONLY
   *
   * Mississippi uses a STATE-ONLY tax system with NO local taxes on vehicles.
   *
   * State Sales Tax Rates:
   * - Standard vehicles (≤ 10,000 lbs): 5.0%
   * - Heavy trucks (> 10,000 lbs GVW): 3.0%
   * - General sales tax (non-vehicle): 7.0%
   *
   * Vehicle Classification (Miss. Code § 27-65-201):
   *
   * 5% Rate Applies To:
   * - Cars (all passenger vehicles)
   * - Vans (passenger vans)
   * - Buses (passenger carriers)
   * - Light trucks (≤ 10,000 lbs GVW)
   * - SUVs (passenger vehicles)
   * - Pickup trucks (≤ 10,000 lbs GVW)
   *
   * 3% Rate Applies To:
   * - Heavy trucks (> 10,000 lbs GVW)
   * - Carriers of property exceeding 10,000 lbs
   * - Commercial hauling vehicles > 10,000 lbs
   * - Semi-trucks and tractor-trailers
   *
   * NO LOCAL TAXES:
   * - No county taxes on vehicles
   * - No city/municipal taxes on vehicles
   * - No special district taxes
   * - Uniform statewide rates (5% or 3%)
   *
   * Rate Comparison:
   * Mississippi's vehicle rates (5% / 3%) are LOWER than the general
   * sales tax rate (7%). This provides a reduced rate for vehicle purchases
   * compared to other tangible personal property.
   *
   * Same Rate Everywhere:
   * - Jackson (Hinds County): 5% (or 3%)
   * - Gulfport (Harrison County): 5% (or 3%)
   * - Tupelo (Lee County): 5% (or 3%)
   * - Southaven (DeSoto County): 5% (or 3%)
   * - No variation by location
   *
   * Tax Collection:
   * Sales tax collected by dealer at time of sale and remitted to Mississippi
   * Department of Revenue. For private party sales, buyer pays use tax when
   * registering vehicle with Mississippi Department of Revenue.
   *
   * IMPLEMENTATION NOTE:
   * The 3% heavy truck rate requires vehicle weight classification. In the
   * tax engine, this should be handled by checking vehicle GVW:
   * - If GVW > 10,000 lbs: Use 3% rate
   * - If GVW ≤ 10,000 lbs: Use 5% rate
   *
   * Source: Miss. Code § 27-65-201, Mississippi DOR Sales Tax Rate Tables
   */
  vehicleTaxScheme: "STATE_ONLY",
  vehicleUsesLocalSalesTax: false,

  // ============================================================================
  // LEASE TRANSACTION RULES
  // ============================================================================

  leaseRules: {
    /**
     * Lease Method: MONTHLY
     *
     * Mississippi taxes leases on a MONTHLY basis. The 5% sales tax is
     * applied to each monthly lease payment.
     *
     * Legal Framework (Miss. Code § 27-65-201):
     * The sales tax applies to the rental of motor vehicles, with tax
     * collected on the periodic rental payments.
     *
     * Tax Rate: 5%
     * - Applied to each monthly payment (standard vehicles)
     * - Same rate as retail sales for vehicles ≤ 10,000 lbs
     * - No separate lease tax rate
     * - Heavy trucks (> 10,000 lbs): 3% on lease payments
     *
     * Tax Treatment:
     * Tax is calculated on the monthly lease payment amount and collected
     * monthly throughout the lease term.
     *
     * Calculation:
     * Monthly Sales Tax = Monthly Payment × 5%
     *
     * Example:
     *   Monthly Lease Payment: $450
     *   Sales Tax: $450 × 5% = $22.50
     *   Total Monthly Due: $472.50
     *
     * 36-Month Lease:
     *   Total Payments: $450 × 36 = $16,200
     *   Total Tax: $22.50 × 36 = $810
     *
     * Tax Timing:
     * - Tax collected with each monthly payment
     * - Not paid upfront (except on upfront fees)
     * - No tax on cap cost reduction
     *
     * Comparison to Other States:
     * Mississippi uses pure monthly taxation, similar to California, Texas,
     * and most states. Unlike Minnesota (upfront) or Alabama (hybrid).
     *
     * Source: Miss. Code § 27-65-201, Mississippi DOR guidance
     */
    method: "MONTHLY",

    /**
     * Cap Cost Reduction: NOT TAXED
     *
     * Mississippi does NOT tax capitalized cost reductions upfront on leases.
     * Only the monthly lease payments are subject to sales tax.
     *
     * Not Taxable:
     * - Cash down payments
     * - Manufacturer rebates applied as cap reduction
     * - Trade-in equity
     * - Dealer discounts applied as cap reduction
     * - Any reduction to cap cost
     *
     * Tax Benefit:
     * Cap cost reductions reduce the depreciation component of the monthly
     * payment, which in turn reduces the monthly sales tax.
     *
     * Example:
     *   Gross Cap Cost: $35,000
     *   Cap Cost Reduction: $5,000
     *   Adjusted Cap Cost: $30,000
     *
     *   Without Cap Reduction:
     *     Monthly Payment: $500
     *     Monthly Tax (5%): $25
     *
     *   With Cap Reduction:
     *     Monthly Payment: $430
     *     Monthly Tax (5%): $21.50
     *     Monthly Tax Savings: $3.50
     *
     * Cap reductions are NOT taxed upfront, unlike Arizona (upfront cap
     * reduction tax) or Alabama (hybrid with upfront taxation).
     *
     * Source: Mississippi lease taxation practice, Miss. Code § 27-65-201
     */
    taxCapReduction: false,

    /**
     * Rebate Behavior on Leases: ALWAYS_TAXABLE (manufacturer rebates)
     *
     * On leases, Mississippi treats manufacturer rebates consistently with
     * retail sales: they are TAXABLE.
     *
     * However, since leases use monthly taxation and cap cost reductions
     * are not taxed upfront, the practical effect is different:
     *
     * Manufacturer Rebate Applied as Cap Reduction:
     * - Rebate reduces adjusted cap cost
     * - Lower cap cost = lower monthly payment
     * - Lower payment = lower monthly tax
     * - Indirect tax benefit through lower payments
     *
     * Note: The "ALWAYS_TAXABLE" designation means the rebate doesn't get
     * special non-taxable treatment, but since cap reductions aren't taxed
     * upfront in Mississippi, the effect is realized through monthly payments.
     *
     * Example:
     *   Cap Cost: $32,000
     *   Manufacturer Rebate: $3,000 (applied as cap reduction)
     *   Adjusted Cap Cost: $29,000
     *
     *   Monthly Payment (based on $29,000): $420
     *   Monthly Tax: $420 × 5% = $21
     *
     * The rebate reduces the payment, which reduces the monthly tax.
     *
     * Source: Mississippi lease taxation, DOR guidance
     */
    rebateBehavior: "ALWAYS_TAXABLE",

    /**
     * Doc Fee on Leases: ALWAYS taxable
     *
     * Documentation fees on leases are subject to sales tax in Mississippi.
     *
     * Application:
     * - If doc fee paid upfront: Taxed as upfront charge (5%)
     * - If capitalized into lease: Increases monthly payment and monthly tax
     *
     * Most Common Treatment:
     * Doc fees are typically paid upfront (due at signing) and taxed at 5%.
     *
     * Example (Upfront):
     *   Doc Fee: $425
     *   Sales Tax (5%): $425 × 5% = $21.25
     *   Total Doc Fee Cost: $446.25
     *
     * Example (Capitalized):
     *   Doc Fee: $425 (added to cap cost)
     *   Increases monthly payment by ~$12
     *   Monthly tax increase: $12 × 5% = $0.60/month
     *
     * District Caps Apply:
     * Same district-based doc fee caps apply to leases as to retail sales
     * (district average + 25%).
     *
     * Source: Miss. Code § 27-65-201, 30 Miss. Code. R. 1301-8.1
     */
    docFeeTaxability: "ALWAYS",

    /**
     * Trade-in Credit on Leases: FULL
     *
     * Mississippi ALLOWS full trade-in credit on leases. The trade-in equity
     * can be applied as a cap cost reduction, which reduces the adjusted cap
     * cost and therefore the monthly payment.
     *
     * Trade-In Treatment:
     * - Trade-in value can be applied as cap cost reduction
     * - Reduces adjusted cap cost
     * - Lower cap cost = lower monthly payment
     * - Lower payment = lower monthly sales tax
     *
     * Example:
     *   Gross Cap Cost: $35,000
     *   Trade-In Equity: $8,000
     *   Adjusted Cap Cost: $27,000
     *
     *   Without Trade-In:
     *     Monthly Payment: $500
     *     Monthly Tax: $500 × 5% = $25
     *
     *   With Trade-In:
     *     Monthly Payment: $385
     *     Monthly Tax: $385 × 5% = $19.25
     *     Monthly Savings: $5.75 in tax
     *
     * This is MORE favorable than states like Alabama where lease trade-ins
     * receive NO credit and are actually taxed as cap reductions.
     *
     * Mississippi's FULL trade-in credit on leases makes leasing attractive
     * for customers with trade-ins.
     *
     * Source: Mississippi lease taxation practice, Miss. Code § 27-65-201
     */
    tradeInCredit: "FULL",

    /**
     * Negative Equity on Leases: TAXABLE
     *
     * Negative equity rolled into a lease increases the cap cost and
     * therefore increases the monthly payment and monthly sales tax.
     *
     * Treatment:
     * - Negative equity added to gross cap cost
     * - Increases adjusted cap cost
     * - Results in higher monthly payment
     * - Higher payment = more monthly tax
     *
     * Example:
     *   Base Cap Cost: $30,000
     *   Trade-In Value: $12,000
     *   Trade-In Payoff: $16,000
     *   Negative Equity: $4,000
     *
     *   Adjusted Cap Cost: $30,000 + $4,000 = $34,000
     *
     *   Monthly Payment (including negative equity): $490
     *   Monthly Tax: $490 × 5% = $24.50
     *
     * The negative equity indirectly increases tax by increasing the monthly
     * payment amount that is subject to tax.
     *
     * Note: The negative equity itself isn't taxed upfront (cap cost
     * reductions aren't taxed upfront in MS), but it increases the taxable
     * monthly payment amount.
     *
     * Source: Mississippi lease calculation methodology
     */
    negativeEquityTaxable: true,

    /**
     * Fee Taxability on Leases
     *
     * Lease fee taxability generally follows retail rules:
     *
     * DOC FEE:
     * - TAXABLE on leases (typically upfront at 5%)
     * - Subject to district cap regulations
     *
     * SERVICE CONTRACTS (VSC):
     * - NOT taxed at time of lease inception
     * - When capitalized into lease: NOT separately taxed upfront
     * - Only subsequent repair work under contract is taxed
     * - Monthly payment tax applies to base payment (not separately to VSC)
     *
     * GAP INSURANCE:
     * - NOT taxed at time of lease inception
     * - When capitalized into lease: NOT separately taxed
     * - Treated as insurance product (exempt)
     *
     * TITLE FEE:
     * - NOT taxable (government fee)
     * - Separately stated, not included in tax base
     *
     * REGISTRATION FEES:
     * - NOT taxable (government fees)
     * - Separately collected
     *
     * DEALER PREP / DELIVERY:
     * - TAXABLE when charged upfront
     * - If capitalized: Increases monthly payment and monthly tax
     *
     * Note: For leases, backend products (VSC, GAP) capitalized into monthly
     * payments are NOT taxed separately upfront. Only the monthly payment
     * amount (which may include amortized VSC/GAP cost) is taxed monthly.
     *
     * Source: Miss. Code § 27-65-201, Mississippi DOR guidance
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: true,
        notes:
          "Doc fee TAXABLE on leases at 5%. Typically paid upfront and taxed. Subject to " +
          "district cap (district avg + 25%).",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: false,
        notes:
          "Service contracts NOT taxed at lease inception. When capitalized, NOT separately " +
          "taxed upfront. Only subsequent repairs under contract are taxed. Monthly payment " +
          "tax applies to total payment amount.",
      },
      {
        code: "GAP",
        taxable: false,
        notes:
          "GAP insurance NOT taxed at lease inception. Treated as insurance product, exempt " +
          "from sales tax.",
      },
      {
        code: "TITLE",
        taxable: false,
        notes: "Title fee NOT taxable (government fee). Separately stated.",
      },
      {
        code: "REG",
        taxable: false,
        notes: "Registration fees NOT taxable (government fees).",
      },
      {
        code: "DEALER_PREP",
        taxable: true,
        notes:
          "Dealer prep/delivery TAXABLE when charged upfront at 5%. If capitalized, increases " +
          "monthly payment and monthly tax.",
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

    specialScheme: "NONE",

    notes:
      "Mississippi: MONTHLY lease taxation at 5% state rate (or 3% for heavy trucks > 10,000 lbs). " +
      "Tax applied to each monthly payment. Cap cost reduction NOT taxed separately upfront. " +
      "Trade-in credit FULLY applies to leases (reduces monthly payment and tax). Doc fee taxable " +
      "at 5% (typically upfront). Backend products (VSC, GAP) NOT taxed at lease inception. Only " +
      "monthly payment amount is taxed each month. No local taxes. Same rate statewide.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: NONE (no credit for taxes paid to other states)
   *
   * Mississippi does NOT provide credit for sales/use taxes paid to other
   * states. This is a significant and costly feature for Mississippi residents
   * who purchase vehicles out-of-state.
   *
   * Policy (Miss. Code § 27-65-201):
   * Mississippi residents who purchase vehicles in other states are required
   * to pay Mississippi's full sales tax (5% or 3%) regardless of taxes already
   * paid to the other state.
   *
   * Official Guidance (Mississippi DOR):
   * "If you paid sales tax to another state, it will NOT be credited toward
   * Mississippi tax when you register the vehicle."
   *
   * DOUBLE TAXATION RISK:
   * This creates a potential double taxation scenario where Mississippi
   * residents pay tax to BOTH states:
   * - Tax paid to state of purchase: No credit
   * - Tax paid to Mississippi: Full 5% required
   *
   * Example 1 (High-Tax State):
   *   Vehicle purchased in Tennessee: $30,000
   *   Tennessee tax paid (9.25% in some counties): $2,775
   *   Mississippi tax due when registering (5%): $1,500
   *   Credit allowed: $0
   *   Additional MS tax due: $1,500 (full amount)
   *   Total tax paid: $4,275 (14.25% effective rate)
   *
   * Example 2 (No-Tax State):
   *   Vehicle purchased in Montana: $30,000
   *   Montana tax paid: $0
   *   Mississippi tax due (5%): $1,500
   *   Credit allowed: $0
   *   Mississippi tax due: $1,500
   *   Total tax paid: $1,500
   *
   * COMPARISON TO OTHER STATES:
   * Most states provide FULL or PARTIAL reciprocity. Mississippi is among
   * the minority of states (along with Massachusetts, District of Columbia,
   * and a few others) that provide NO credit for out-of-state taxes paid.
   *
   * States with FULL Reciprocity (for comparison):
   * - Alabama: Credit for taxes paid to other states (capped at AL rate)
   * - Kentucky: Credit for taxes paid (capped at KY rate)
   * - Louisiana: Credit for taxes paid (capped at LA rate)
   * - Tennessee: Credit for taxes paid (capped at TN rate)
   *
   * Mississippi's Position: NO CREDIT
   *
   * PRACTICAL IMPLICATIONS:
   *
   * For Mississippi Residents:
   * - NO financial benefit from purchasing in another state
   * - May pay MORE total tax by purchasing out-of-state
   * - Should factor Mississippi's 5% tax into out-of-state purchase decisions
   *
   * For Out-of-State Buyers:
   * - Out-of-state residents purchasing in Mississippi pay Mississippi tax
   * - May receive credit in their home state (depends on home state rules)
   * - Should verify home state reciprocity before purchasing in Mississippi
   *
   * Registration Requirements:
   * Mississippi residents bringing vehicles from other states must:
   * 1. Provide proof of vehicle ownership (title from other state)
   * 2. Provide bill of sale showing purchase price
   * 3. Pay FULL Mississippi sales tax (5% or 3%)
   * 4. Provide proof of insurance
   * 5. Complete Mississippi title and registration
   *
   * NO DOCUMENTATION OFFSETS:
   * Even with documentation showing taxes paid to another state, Mississippi
   * does NOT reduce or offset the tax due. Full Mississippi tax must be paid.
   *
   * LEASES:
   * Same no-reciprocity rule applies to leases. Monthly lease payments in
   * Mississippi subject to full 5% tax, regardless of any taxes paid in
   * other states.
   *
   * WHY NO RECIPROCITY?
   * Mississippi's policy generates revenue for the state without regard to
   * taxes already paid elsewhere. This protects state revenue but creates
   * potential double taxation for residents.
   *
   * Source: Miss. Code § 27-65-201, Mississippi DOR guidance, county clerk guidance
   */
  reciprocity: {
    enabled: false, // NO reciprocity
    scope: "BOTH", // Would apply to both if enabled, but disabled
    homeStateBehavior: "NONE",
    requireProofOfTaxPaid: false, // Proof not relevant since no credit given
    basis: "TAX_PAID", // Would be basis if enabled, but disabled
    capAtThisStatesTax: false, // No cap since no credit provided
    hasLeaseException: false,
    notes:
      "Mississippi provides NO reciprocity - NO credit for taxes paid to other states. " +
      "Mississippi residents who purchase vehicles out-of-state pay FULL Mississippi tax (5% or 3%) " +
      "regardless of taxes already paid elsewhere. This creates potential double taxation. " +
      "Out-of-state taxes are NOT credited, offset, or deducted. Mississippi is among the minority " +
      "of states with zero reciprocity provisions. Full state tax due on ALL out-of-state purchases.",
  },

  extras: {
    lastUpdated: "2025-11-14",
    sources: [
      "Mississippi Department of Revenue (dor.ms.gov)",
      "Mississippi Code Title 27, Chapter 65 - Sales Tax",
      "Miss. Code § 27-65-201: Tax upon sale or use of motor vehicles",
      "Miss. Code § 27-65-17: Retail sales of motor vehicles",
      "Miss. Code § 75-24-91: Service contract defined",
      "Miss. Code Title 83, Chapter 65: Regulation of Vehicle Service Contracts",
      "Mississippi Motor Vehicle Commission (mmvc.ms.gov)",
      "30 Miss. Code. R. 1301-8.1: Motor Vehicle Dealer Document/Service Fee",
      "Mississippi DOR Sales Tax Rate Tables",
      "Mississippi Sales Tax Handbook (salestaxhandbook.com)",
      "Mississippi County Clerk Offices (Registration and Tax Collection)",
    ],
    notes:
      "Mississippi has 5% sales tax on vehicles ≤ 10,000 lbs and 3% on heavy trucks > 10,000 lbs " +
      "(reduced from 7% general rate). STATE-ONLY taxation (no local taxes). Trade-in credit FULL. " +
      "UNIQUE: Manufacturer rebates TAXABLE (do NOT reduce tax base), but dealer rebates NON-TAXABLE. " +
      "Doc fee taxable with district-based caps (7 districts, cap = avg + 25%, avg ~$425). Service " +
      "contracts and GAP NOT taxed at time of sale (only subsequent repairs taxed). Lease taxation: " +
      "MONTHLY at 5%, cap reduction NOT taxed upfront, trade-in credit APPLIES. NO RECIPROCITY - " +
      "no credit for taxes paid to other states (potential double taxation). Heavy truck rate provides " +
      "significant savings for commercial vehicles.",
    stateVehicleSalesRate: 5.0,
    stateHeavyTruckRate: 3.0, // Trucks > 10,000 lbs GVW
    stateGeneralSalesRate: 7.0,
    localTaxes: false,
    flatTaxRate: true, // Within vehicle category (5% or 3%)
    avgDocFee: 425,
    docFeeCapType: "DISTRICT_BASED", // 7 districts, each cap = district avg + 25%
    titleFee: 9.0,
    reciprocityProvided: false,
    heavyTruckThreshold: 10000, // lbs GVW
    districtCount: 7, // Motor Vehicle Commission districts
    uniqueFeatures: [
      "Manufacturer rebates TAXABLE (rare treatment)",
      "Heavy truck reduced rate (3% vs 5%)",
      "Service contracts NOT taxed at sale",
      "NO reciprocity (no credit for out-of-state taxes)",
      "District-based doc fee caps",
      "State-only taxation (no local taxes)",
    ],
  },
};

export default US_MS;
