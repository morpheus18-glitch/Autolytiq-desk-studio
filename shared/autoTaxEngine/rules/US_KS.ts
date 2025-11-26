import type { TaxRulesConfig } from "../types";

/**
 * KANSAS TAX RULES
 *
 * Researched: 2025-11-14
 * Version: 2
 *
 * KEY FACTS:
 * - State sales/use tax: 6.5% (compensating use tax on vehicles)
 * - Local taxes: County + City (up to 4.25%), combined up to 10.75%
 * - Trade-in credit: FULL (100% deduction from taxable base) - New 2025 enhancement!
 * - 120-day sale provision: Effective Jan 1, 2025 - Tax credit for selling vehicle within 120 days
 * - Manufacturer rebates: TAXABLE (do NOT reduce tax base)
 * - Dealer rebates: Non-taxable if true price reduction
 * - Doc fee: TAXABLE, NO CAP (average $285)
 * - Service contracts (VSC): TAXABLE at full rate
 * - GAP insurance: NOT taxable (when separately stated)
 * - Lease taxation: FULL_UPFRONT (tax on gross cap cost + cap reduction, similar to purchase)
 * - Reciprocity: YES (credit for taxes paid to other states up to KS rate)
 * - Vehicle Property Tax: SEPARATE annual tax (like property tax, not sales tax)
 *
 * UNIQUE KANSAS FEATURES:
 * 1. COMPENSATING USE TAX: Kansas uses "compensating use tax" terminology
 *    - Applied to vehicles purchased in-state or out-of-state
 *    - 6.5% state rate plus local rates
 *    - Mirrors sales tax but specifically for vehicle transactions
 *
 * 2. 120-DAY TRADE-IN CREDIT (NEW 2025):
 *    - Effective January 1, 2025 per Notice 24-19
 *    - If you SELL a vehicle (not trade-in) and BUY another within 120 days:
 *      Tax due only on amount paid OVER the amount received from sale
 *    - Example: Sell for $15,000, buy for $30,000 → Tax on $15,000 only
 *    - Can be before OR after purchase (120-day window either direction)
 *    - Form ST-21VT for refund if paid full tax then sold within 120 days
 *
 * 3. TRADITIONAL TRADE-IN CREDIT:
 *    - Full trade-in credit on traditional dealer trade-ins
 *    - Must file form TR-12 Affidavit or TR-312 Bill of Sale with County Treasurer
 *    - Trade-in value deducted from purchase price before tax
 *    - Credit applies to state AND local taxes
 *
 * 4. SERVICE CONTRACTS TAXABLE (UNIQUE):
 *    - Kansas is among minority of states taxing VSC/warranties
 *    - K.S.A. 79-3603(r): "sale of a warranty, service contract or maintenance
 *      contract for motor vehicles is subject to sales tax"
 *    - Applies whether purchased with vehicle or separately
 *    - Trade-in allowance may be applied to cost of warranty
 *
 * 5. GAP INSURANCE NOT TAXABLE:
 *    - GAP insurance is NOT subject to sales tax when separately stated
 *    - "Insurance which benefits the buyer, including GAP insurance, is not
 *      included as part of the selling price and therefore not taxed"
 *    - Must be clearly separated on invoice
 *
 * 6. MANUFACTURER REBATES TAXABLE:
 *    - Like many states, manufacturer rebates do NOT reduce tax base
 *    - Customer pays tax on full price before rebates
 *    - Rebate is applied to reduce customer's out-of-pocket cost
 *
 * 7. NO DOC FEE CAP:
 *    - Kansas has no statutory limit on dealer documentation fees
 *    - Average: $285 (lower than many states)
 *    - Doc fees are taxable at full combined rate
 *
 * 8. VEHICLE PROPERTY TAX (SEPARATE FROM SALES TAX):
 *    - Annual recurring tax paid at registration/renewal
 *    - Based on vehicle's assessed value (MSRP with depreciation)
 *    - County mill levy determines amount
 *    - Completely separate from one-time sales/use tax
 *    - Pro-rated from purchase date to registration month
 *
 * 9. LEASE TREATMENT:
 *    - Kansas treats leases more like purchases than many states
 *    - Full upfront tax on gross capitalized cost
 *    - Cap cost reductions also taxed upfront
 *    - No monthly payment taxation (all tax paid at inception)
 *
 * TAX CALCULATION FORMULA (RETAIL):
 * Taxable Base = (Vehicle Price + Accessories + Doc Fee + VSC) - Trade-In Value
 * State Tax = Taxable Base × 6.5%
 * County Tax = Taxable Base × County Rate
 * City Tax = Taxable Base × City Rate
 * Total Tax = State + County + City
 * (GAP NOT included if separately stated; Title and registration fees NOT included)
 *
 * Example 1 (Wichita - 7.5% total: 6.5% state + 1% local):
 * $30,000 vehicle + $285 doc + $2,500 VSC - $10,000 trade = $22,785 taxable
 * State: $22,785 × 6.5% = $1,481.03
 * Local: $22,785 × 1.0% = $227.85
 * Total: $1,708.88
 *
 * Example 2 (Kansas City, KS - 9.125% total: 6.5% state + 2.625% local):
 * $25,000 vehicle + $285 doc + $2,000 VSC - $8,000 trade = $19,285 taxable
 * State: $19,285 × 6.5% = $1,253.53
 * Local: $19,285 × 2.625% = $506.23
 * Total: $1,759.76
 *
 * 120-DAY PROVISION EXAMPLE (NEW 2025):
 * Private sale: $15,000 received
 * Dealer purchase 60 days later: $28,000
 * Tax due: ($28,000 - $15,000) × 7.5% = $975
 * (Instead of $28,000 × 7.5% = $2,100 - saves $1,125)
 *
 * LEASE CALCULATION (FULL UPFRONT):
 * Taxable Base = Gross Cap Cost + Cap Cost Reductions (cash, rebates, trade equity)
 * Total Tax = Taxable Base × (State + Local Rate)
 * All tax paid at lease inception, no monthly tax
 *
 * Example (Wichita lease - 7.5% total):
 * Gross cap cost: $35,000
 * Cash down: $5,000
 * Trade-in equity: $3,000
 * Total taxable: $35,000 + $5,000 + $3,000 = $43,000
 * Tax: $43,000 × 7.5% = $3,225 (all due at signing)
 * Monthly payment: $450 × 36 months (no additional tax)
 *
 * SOURCES:
 * - Kansas Department of Revenue (ksrevenue.gov)
 * - Kansas Statutes Annotated § 79-3603 (Sales and compensating use tax)
 * - K.S.A. 79-3603(r): Warranties and service contracts taxable
 * - Kansas Admin. Regs. § 92-19-30: Motor vehicles, isolated sales
 * - K.A.R. § 92-19-62: Warranties, service and maintenance contracts
 * - Kansas DOR Publication KS-1526: Business Taxes for Motor Vehicle Transactions
 * - Kansas DOR Notice 24-19: Used Motor Vehicle Sales Transactions (2025)
 * - Form ST-21VT: Request for Sales Tax Refund (120-day provision)
 * - Form TR-12 Affidavit / TR-312 Bill of Sale (trade-in credit)
 */
export const US_KS: TaxRulesConfig = {
  stateCode: "KS",
  version: 2,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL (100% credit, no cap)
   *
   * Kansas allows full trade-in credit against the taxable purchase price
   * of a motor vehicle. The trade-in value is deducted from the sales price
   * before calculating sales tax.
   *
   * Official Guidance (KS DOR Motor Vehicles Guide):
   * "A trade in involves accepting a vehicle in exchange for credit against
   * the purchase of another vehicle. Dealers should charge sales tax on the
   * net price or trade difference — after the trade-in allowance."
   *
   * NEW 2025 ENHANCEMENT - 120-DAY PROVISION (Notice 24-19):
   * Starting January 1, 2025, Kansas provides tax credit even for private sales:
   * "When an individual sells a used motor vehicle instead of trading it in,
   * and purchases a new or used vehicle within 120 days before or after such
   * sale, sales or compensating use tax is only due on the amount paid that
   * exceeds the amount received from the sale."
   *
   * 120-Day Rules:
   * - Applies to sales on or after January 1, 2025
   * - 120-day window BEFORE or AFTER the purchase
   * - If purchase price ≤ sale proceeds, NO tax due
   * - Individual must be the seller (not dealer trade)
   * - Claim credit with form to County Treasurer at registration
   * - Or apply for refund with Form ST-21VT within 3 years
   *
   * Requirements (Traditional Trade-In):
   * - Trade-in vehicle must be owned by purchaser
   * - Must file TR-12 Affidavit to a Fact or TR-312 Bill of Sale with County Treasurer
   * - Trade-in allowance separately stated on purchase agreement
   * - Both state AND local taxes calculated on net amount (after trade-in credit)
   *
   * Example (Traditional Trade-In):
   *   Vehicle Price: $30,000
   *   Doc Fee: $285
   *   Trade-In Value: $10,000
   *   Taxable Base: ($30,000 + $285) - $10,000 = $20,285
   *   Tax @ 7.5%: $20,285 × 7.5% = $1,521.38
   *
   * Example (120-Day Provision):
   *   Sold vehicle privately: $12,000 (March 1, 2025)
   *   Purchased from dealer: $28,000 (May 15, 2025)
   *   Days between: 75 days (within 120-day window)
   *   Taxable Base: $28,000 - $12,000 = $16,000
   *   Tax @ 7.5%: $16,000 × 7.5% = $1,200
   *   Tax Savings: $900 vs. no credit
   *
   * Source: KS DOR Pub 1526; Notice 24-19; § 79-3603 K.S.A.
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules:
   *
   * Kansas treats manufacturer and dealer rebates/incentives differently.
   *
   * MANUFACTURER REBATES (TAXABLE):
   * - Manufacturer rebates do NOT reduce the taxable purchase price
   * - Tax calculated on full vehicle price BEFORE manufacturer rebate
   * - Rebate is applied to reduce customer's out-of-pocket cost
   * - Customer pays tax on pre-rebate price
   *
   * This is standard treatment across most states - manufacturer rebates are
   * considered payments from the manufacturer to the dealer on behalf of the
   * buyer, making the full amount taxable.
   *
   * Example:
   *   Vehicle MSRP: $28,000
   *   Manufacturer Rebate: $3,000
   *   Customer Pays: $25,000
   *   TAXABLE BASE: $28,000 (NOT $25,000)
   *   Tax @ 7.5%: $28,000 × 7.5% = $2,100
   *
   * DEALER REBATES/INCENTIVES (NON-TAXABLE):
   * - If dealer reduces actual selling price due to their own promotion,
   *   the tax is on the reduced selling price
   * - Dealer-to-dealer incentives (holdbacks, volume bonuses) paid by
   *   manufacturer to dealer do not affect customer tax base
   * - True price reductions ARE reflected in taxable amount
   *
   * Example:
   *   MSRP: $28,000
   *   Dealer Discount: -$2,000
   *   Selling Price: $26,000
   *   TAXABLE BASE: $26,000
   *   Tax @ 7.5%: $26,000 × 7.5% = $1,950
   *
   * MANUFACTURER OPTION-PACKAGE INCENTIVES:
   * Official Guidance: "A manufacturer's option-package incentive that reduces
   * the cost of the vehicle simply reduces the purchase price to which tax
   * is applied."
   *
   * Source: KS DOR Pub 1526; Motor Vehicle Sales Tax Guide
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: true,
      notes:
        "Manufacturer rebates ARE TAXABLE in Kansas. Tax calculated on full purchase price " +
        "BEFORE manufacturer rebate. Rebates are applied after tax calculation. Exception: " +
        "manufacturer option-package incentives that reduce vehicle cost do reduce tax base.",
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
   * Kansas dealer documentation fees are SUBJECT to sales tax at the
   * combined state and local rate.
   *
   * Official Guidance (KS DOR Motor Vehicles Guide):
   * Documentation fees are part of the selling price and subject to sales tax.
   *
   * Statutory Cap: NONE
   * Kansas law does not limit the amount of doc fees a dealer can charge.
   * - Average doc fee: $285 (as of 2024-2025)
   * - Observed range: $150 to $500+
   * - Dealers can charge any amount they determine
   *
   * Taxability:
   * Doc fee is included in the taxable base for BOTH state and local taxes:
   * - 6.5% state sales tax
   * - Full county rate
   * - Full city rate
   *
   * Example:
   *   Doc Fee: $285
   *   Combined Rate: 7.5% (6.5% state + 1% local)
   *   Tax on Doc Fee: $285 × 7.5% = $21.38
   *
   * Trade-In Interaction:
   * Doc fee is added to vehicle price BEFORE trade-in credit is applied:
   * Taxable Base = (Vehicle + Doc Fee + Accessories + VSC) - Trade-In
   *
   * Source: KS DOR Pub 1526; Industry surveys
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules
   *
   * Kansas has UNIQUE treatment of service contracts compared to most states.
   *
   * SERVICE CONTRACTS (VSC): TAXABLE (unique to Kansas)
   * - Kansas is among the MINORITY of states that tax service contracts
   * - K.S.A. 79-3603(r): "The sale of a warranty, service contract or
   *   maintenance contract for motor vehicles is subject to sales tax"
   * - Admin Rule 810-6-1-.186.05: Warranty, Extended or Service Contract
   * - Taxable whether purchased WITH vehicle or SEPARATELY later
   * - Trade-in allowance MAY be applied to cost of warranty
   *
   * Official Guidance:
   * "A warranty or similar agreement is taxable whether purchased at the time
   * a vehicle is purchased, or purchased separately at another time."
   *
   * "The sale of warranty and service or maintenance agreements/contracts are
   * considered to be part of the selling price of a motor vehicle, semi-trailer,
   * pole trailer or aircraft. Thus, a trade-in allowance may be applied to the
   * cost of a warranty."
   *
   * GAP INSURANCE: NOT TAXABLE
   * - GAP insurance is NOT subject to sales tax when separately stated
   * - Official guidance: "Insurance which benefits the buyer, including GAP
   *   insurance, is not included as part of the selling price and therefore
   *   not taxed"
   * - Must be clearly labeled and separately stated on invoice
   * - Treated as insurance product, exempt from sales tax
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
   * Source: K.S.A. 79-3603(r); K.A.R. § 92-19-62; KS DOR Pub 1526
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: true,
      notes:
        "Service contracts (VSC) ARE TAXABLE in Kansas per K.S.A. 79-3603(r). Kansas is among " +
        "minority of states taxing VSC. Taxable whether purchased with vehicle or separately. " +
        "Trade-in allowance may be applied to VSC cost.",
    },
    {
      code: "GAP",
      taxable: false,
      notes:
        "GAP insurance is NOT taxable in Kansas when separately stated. Treated as insurance " +
        "product, exempt from sales tax per KS DOR guidance. Must be clearly labeled on invoice.",
    },
    {
      code: "DOC_FEE",
      taxable: true,
      notes:
        "Doc fees ARE TAXABLE at combined rate (state + local). Kansas has NO cap on doc fees. " +
        "Average $285, but can range widely.",
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
   * Service Contracts: TAXABLE (unique Kansas feature)
   * GAP: NOT taxable (when separately stated)
   *
   * Example (With Service Contract):
   *   New Vehicle Price: $25,000
   *   Doc Fee: $285
   *   Service Contract: $2,500
   *   Trade-In Value: $8,000
   *
   *   Taxable Base: ($25,000 + $285 + $2,500) - $8,000 = $19,785
   *   Tax @ 7.5%: $19,785 × 7.5% = $1,483.88
   *
   * Example (Negative Equity - NOT taxed):
   *   Vehicle Price: $25,000
   *   Doc Fee: $285
   *   Trade-In Value: $10,000
   *   Trade-In Payoff: $13,000
   *   Negative Equity: $3,000
   *
   *   Taxable Base: ($25,000 + $285) - $10,000 = $15,285
   *   NOT: $18,285 (do not add negative equity)
   *   Tax @ 7.5%: $15,285 × 7.5% = $1,146.38
   *   Amount Financed: $15,285 + $1,146.38 + $3,000 = $19,431.38
   *
   * Source: KS DOR Pub 1526; K.S.A. 79-3603(r)
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: false,
  taxOnServiceContracts: true, // UNIQUE - Kansas taxes VSC
  taxOnGap: false, // GAP exempt when separately stated

  /**
   * Vehicle Tax Scheme: STATE_PLUS_LOCAL
   *
   * Kansas uses a stacked tax system: state + county + city rates.
   *
   * State Compensating Use Tax: 6.5%
   * - Applies to all motor vehicle sales statewide
   * - Kansas Statutes Annotated § 79-3603
   * - Called "compensating use tax" for vehicles
   * - Administered by Kansas Department of Revenue
   *
   * County Tax: Varies by county (typically 0.5% to 2%)
   * - Example: Sedgwick County 1.0%, Johnson County 1.475%
   *
   * City/Municipal Tax: Varies by city (0% to 2.25%)
   * - Example: Wichita 0%, Kansas City 1.125%, Overland Park 1.125%
   *
   * Combined Rates:
   * - Lowest: 6.5% (state only, some rural areas)
   * - Average: ~7.5%
   * - Highest: 10.75% (some high-tax cities)
   * - Wichita (Sedgwick Co): 7.5% (6.5% state + 1.0% county)
   * - Kansas City: 9.125% (6.5% state + 1.475% county + 1.125% city)
   * - Overland Park: 9.1% (6.5% state + 1.475% county + 1.125% city)
   * - Lawrence: 9.3% (6.5% state + 1.25% county + 1.55% city)
   * - Topeka: 9.15% (6.5% state + 1.15% county + 1.5% city)
   *
   * Tax Collection Point:
   * Tax based on dealer location for dealer sales.
   * For use tax (out-of-state purchases), based on buyer's residence/registration location.
   *
   * Rate Resources:
   * - KS DOR Publication 1700: City, county and special jurisdiction tax rates
   * - Updated quarterly
   * - Verify current rates before transactions
   *
   * Source: K.S.A. § 79-3603; KS DOR Pub 1510, 1526, 1700
   */
  vehicleTaxScheme: "STATE_PLUS_LOCAL",
  vehicleUsesLocalSalesTax: true,

  // ============================================================================
  // LEASE TRANSACTION RULES
  // ============================================================================

  leaseRules: {
    /**
     * Lease Method: FULL_UPFRONT (Kansas unique approach)
     *
     * Kansas treats leases more like purchases than many other states.
     * Tax is paid upfront on the entire capitalized cost, not on monthly payments.
     *
     * Legal Framework (K.A.R. § 92-19-55b - Operating leases):
     * Kansas applies sales tax to the full capitalized cost at lease inception,
     * similar to a purchase transaction.
     *
     * What is Taxed Upfront:
     * - Gross capitalized cost (agreed-upon value of vehicle)
     * - Capitalized cost reductions (down payment, rebates, trade equity)
     * - Doc fees, acquisition fees
     * - Service contracts (if included)
     *
     * What is NOT Taxed:
     * - Monthly lease payments (already taxed upfront via cap cost)
     * - GAP insurance (when separately stated)
     * - Refundable security deposits
     *
     * Calculation Method:
     * Total Upfront Tax = (Gross Cap Cost + Cap Reductions + Taxable Fees) × (State + Local Rate)
     *
     * This differs significantly from states like Alabama (hybrid) or Indiana (monthly)
     * where tax is collected over the lease term.
     *
     * Example (Wichita - 7.5% total):
     *   Gross Cap Cost: $35,000
     *   Cash Down: $5,000
     *   Trade-In Equity: $3,000
     *   Acquisition Fee: $595
     *   Total Taxable: $35,000 + $5,000 + $3,000 + $595 = $43,595
     *   Upfront Tax: $43,595 × 7.5% = $3,269.63 (all due at signing)
     *   Monthly Payment: $450 × 36 months (no additional tax)
     *
     * Comparison to Purchase:
     * Lease taxation in Kansas is very similar to purchase taxation - full
     * upfront tax on the total amount, with no monthly taxation.
     *
     * Source: K.A.R. § 92-19-55b; KS DOR Pub 1526
     */
    method: "FULL_UPFRONT",

    /**
     * Cap Cost Reduction: FULLY TAXABLE upfront
     *
     * ALL capitalized cost reductions are subject to sales tax at lease inception.
     *
     * Kansas treats cap cost reductions as part of the taxable consideration
     * for the lease, similar to how a down payment on a purchase is part of
     * the purchase price.
     *
     * What is Taxable at Signing:
     * - Cash down payments
     * - Manufacturer rebates applied as cap reduction
     * - Trade-in equity (if customer owns the vehicle)
     * - Dealer discounts applied as cap reduction
     * - ANY reduction to the cap cost
     *
     * All of these amounts are ADDED to the gross cap cost to determine the
     * total taxable base, and tax is paid upfront.
     *
     * Example:
     *   Gross Cap Cost: $40,000
     *   Cap Cost Reductions:
     *     - Cash down: $4,000
     *     - Manufacturer rebate: $2,500
     *     - Trade-in equity: $3,500
     *     - Total: $10,000
     *
     *   Total Taxable Base: $40,000 + $10,000 = $50,000
     *   Upfront Tax @ 7.5%: $50,000 × 7.5% = $3,750 (due at signing)
     *
     * This is very different from states where cap reductions reduce the
     * taxable base. In Kansas, they ADD to it.
     *
     * Source: K.A.R. § 92-19-55b; KS DOR guidance
     */
    taxCapReduction: true,

    /**
     * Rebate Behavior on Leases: ALWAYS_TAXABLE
     *
     * In Kansas, manufacturer rebates on leases are ALWAYS taxable when
     * applied as capitalized cost reductions.
     *
     * Same treatment as retail: Rebates are part of the total consideration
     * and are included in the upfront taxable base.
     *
     * All rebates (manufacturer, dealer, federal EV credits) that reduce the
     * cap cost are subject to upfront sales tax at inception.
     *
     * Source: K.A.R. § 92-19-55b; KS DOR Pub 1526
     */
    rebateBehavior: "ALWAYS_TAXABLE",

    /**
     * Doc Fee on Leases: ALWAYS taxable
     *
     * Dealer documentation fees and acquisition fees are subject to sales tax
     * on leases.
     *
     * Application:
     * Doc/acquisition fees are taxed upfront as part of the total taxable base.
     *
     * Example:
     *   Gross Cap Cost: $35,000
     *   Acquisition Fee: $695
     *   Total Taxable: $35,695
     *   Upfront Tax @ 7.5%: $35,695 × 7.5% = $2,677.13
     *
     * Source: K.A.R. § 92-19-55b; KS DOR Pub 1526
     */
    docFeeTaxability: "ALWAYS",

    /**
     * Trade-in Credit on Leases: NONE (treated as cap reduction)
     *
     * Kansas does NOT provide traditional trade-in credit on leases.
     *
     * Unlike purchases where trade-in REDUCES the taxable base, on leases
     * the trade-in equity is treated as a capitalized cost reduction and is
     * ADDED to the taxable base.
     *
     * Official Guidance:
     * Trade-in equity becomes part of cap cost reduction, which is fully taxable.
     *
     * CRITICAL DIFFERENCE FROM PURCHASES:
     * - Purchase: Trade-in reduces taxable base (saves tax)
     * - Lease: Trade-in equity is TAXED (costs tax)
     *
     * Example Comparison ($10,000 trade-in, 7.5% rate):
     *
     * PURCHASE:
     *   Vehicle Price: $30,000
     *   Trade-In: $10,000
     *   Taxable: $20,000
     *   Tax: $20,000 × 7.5% = $1,500
     *   Trade-in SAVED $750 in tax
     *
     * LEASE:
     *   Gross Cap: $30,000
     *   Trade-In Equity: $10,000 (cap reduction)
     *   Taxable: $30,000 + $10,000 = $40,000
     *   Tax: $40,000 × 7.5% = $3,000
     *   Trade-in COST $750 in tax
     *
     * This creates a significant economic difference for leasing vs. purchasing
     * with a trade-in in Kansas.
     *
     * Source: K.A.R. § 92-19-55b; KS DOR guidance
     */
    tradeInCredit: "NONE",

    /**
     * Negative Equity on Leases: TAXABLE
     *
     * Negative equity rolled into a lease IS subject to sales tax in Kansas.
     *
     * Treatment:
     * - Negative equity increases the capitalized cost
     * - The negative equity amount is taxed as part of total cap cost
     * - Tax paid upfront at lease inception
     *
     * Example:
     *   Base Cap Cost: $32,000
     *   Trade-In Value: $8,000
     *   Trade-In Payoff: $11,000
     *   Negative Equity: $3,000
     *
     *   Adjusted Cap Cost: $35,000 (for taxable base)
     *   Trade-In Equity Treated as Cap Reduction: $0 (negative)
     *   Total Taxable Base: $35,000 (cap cost includes negative equity)
     *   Tax @ 7.5%: $35,000 × 7.5% = $2,625 (due at inception)
     *
     * This is DIFFERENT from retail purchases where negative equity is NOT taxable.
     *
     * Source: K.A.R. § 92-19-55b
     */
    negativeEquityTaxable: true,

    /**
     * Fee Taxability on Leases
     *
     * Backend products on leases follow same rules as sales:
     *
     * SERVICE CONTRACTS (VSC):
     * - TAXABLE on leases (same as retail)
     * - Kansas is among minority of states taxing VSC
     * - Included in upfront taxable base
     *
     * GAP INSURANCE:
     * - NOT taxable on leases when separately stated
     * - Treated as insurance product
     *
     * ACCESSORIES:
     * - TAXABLE on leases
     * - Included in gross capitalized cost
     * - Taxed upfront as part of total base
     *
     * DOC FEE / ACQUISITION FEE:
     * - TAXABLE on leases (see docFeeTaxability above)
     *
     * TITLE FEE:
     * - NOT taxable when separately stated
     *
     * Source: K.S.A. 79-3603(r); K.A.R. § 92-19-55b; KS DOR Pub 1526
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: true,
        notes: "Doc fee TAXABLE on leases. Included in upfront taxable base.",
      },
      {
        code: "ACQUISITION_FEE",
        taxable: true,
        notes: "Acquisition fee TAXABLE on leases at combined rate.",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: true,
        notes:
          "Service contracts TAXABLE on leases (same as retail - unique Kansas rule).",
      },
      {
        code: "GAP",
        taxable: false,
        notes: "GAP insurance NOT taxable on leases when separately stated (insurance product).",
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
      "Kansas: FULL_UPFRONT lease taxation (unique approach). Tax paid on gross cap cost + " +
      "cap cost reductions at lease inception. NO monthly payment taxation. Cap cost reductions " +
      "(cash, rebates, trade equity) FULLY TAXABLE and ADDED to base (not subtracted like retail). " +
      "Trade-in equity treated as cap reduction and TAXED (opposite of purchase where it reduces tax). " +
      "Service contracts TAXABLE (unique Kansas rule). GAP NOT taxed when separately stated. " +
      "Doc/acquisition fees taxable. Leases taxed more like purchases in Kansas.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: CREDIT UP TO STATE RATE (credit for taxes paid to other states)
   *
   * Kansas provides reciprocal credit for sales/use taxes paid to other states.
   *
   * Official Guidance:
   * Kansas allows credit for taxes legally paid to another state, but credit
   * is limited to the amount of Kansas tax that would be due.
   *
   * How It Works:
   *
   * Scenario 1: Other State Tax ≥ Kansas Tax
   * If sales/use tax paid to another state equals or exceeds Kansas's combined
   * tax (state + local), NO additional Kansas use tax is due.
   *
   * Example:
   *   Vehicle purchased in California: $30,000
   *   California tax paid (8%): $2,400
   *   Kansas tax would be (7.5%): $2,250
   *   Credit allowed: $2,250
   *   Additional KS tax due: $0
   *
   * Scenario 2: Other State Tax < Kansas Tax
   * If tax paid to another state is less than Kansas's tax, pay the DIFFERENCE.
   *
   * Example:
   *   Vehicle purchased in Montana: $30,000
   *   Montana tax paid (0%): $0
   *   Kansas tax due (7.5%): $2,250
   *   Credit allowed: $0
   *   Additional KS tax due: $2,250
   *
   * Scenario 3: Partial Credit
   *   Vehicle purchased in Wyoming: $30,000
   *   Wyoming tax paid (4%): $1,200
   *   Kansas tax due (7.5%): $2,250
   *   Credit allowed: $1,200
   *   Additional KS tax due: $1,050
   *
   * Credit Scope:
   * - Applies to both STATE and LOCAL taxes in Kansas
   * - Total credit capped at total Kansas tax (state + local)
   * - Cannot receive refund if other state tax exceeds Kansas tax
   *
   * Documentation Required:
   * - Bill of sale showing purchase price
   * - Receipt or invoice showing taxes paid to other state
   * - Provide to county treasurer at time of registration
   *
   * NEW RESIDENTS:
   * Kansas may provide exemptions or reduced rates for new residents who
   * already titled/registered vehicle in another state. Check with county
   * treasurer for specific new resident rules.
   *
   * Source: K.S.A. § 79-3603; KS DOR Pub 1510, 1526
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
      "Kansas provides reciprocity credit for taxes paid to other states, for BOTH state and " +
      "local taxes. Credit limited to total Kansas tax amount (state + local). If other state " +
      "tax paid equals or exceeds Kansas tax, no additional tax due. If less, pay the difference. " +
      "Must provide proof of tax paid to other state to county treasurer at registration.",
  },

  extras: {
    lastUpdated: "2025-11-14",
    sources: [
      "Kansas Department of Revenue (ksrevenue.gov)",
      "Kansas Statutes Annotated:",
      "  § 79-3603 (Sales and compensating use tax definitions)",
      "  § 79-3603(r) (Service contracts and warranties taxable)",
      "Kansas Administrative Regulations:",
      "  K.A.R. § 92-19-30 (Motor vehicles, isolated or occasional sales)",
      "  K.A.R. § 92-19-55b (Operating leases)",
      "  K.A.R. § 92-19-62 (Warranties, service and maintenance contracts)",
      "Kansas DOR Publications:",
      "  Pub. KS-1510: Sales Tax and Compensating Use Tax",
      "  Pub. KS-1526: Business Taxes for Motor Vehicle Transactions",
      "  Pub. KS-1700: City, County and Special Jurisdiction Tax Rates",
      "Kansas DOR Notice 24-19: Used Motor Vehicle Sales Transactions (2025)",
      "Form ST-21VT: Request for Sales Tax Refund (120-day provision)",
      "Form TR-12 / TR-312: Trade-in credit forms",
      "Kansas DOR Vehicle Property Tax Calculator",
    ],
    notes:
      "Kansas has 6.5% state compensating use tax + local taxes (0.5%-4.25%) for combined " +
      "6.5% to 10.75%. NEW 2025: 120-day trade provision - tax credit if selling vehicle within " +
      "120 days before or after purchase (Notice 24-19). Traditional FULL trade-in credit. " +
      "Manufacturer rebates TAXABLE. UNIQUE: Service contracts (VSC) TAXABLE at full rate - Kansas " +
      "among minority of states taxing VSC. GAP exempt when separately stated. Doc fee taxable, NO " +
      "CAP (avg $285). Lease: FULL_UPFRONT method - tax on gross cap cost + cap reductions, NO " +
      "monthly tax. Trade-in on leases treated as taxable cap reduction (opposite of purchase). " +
      "Vehicle property tax: SEPARATE annual tax based on assessed value, paid at registration. " +
      "Reciprocity: Credit for taxes paid to other states up to Kansas rate.",
    stateRate: 6.5,
    localRateRange: { min: 0.5, max: 4.25 },
    combinedRateRange: { min: 6.5, max: 10.75 },
    avgDocFee: 285,
    tradeIn120DayEffectiveDate: "2025-01-01",
    majorJurisdictions: {
      Wichita: { state: 6.5, county: 1.0, city: 0, total: 7.5 },
      KansasCity: { state: 6.5, county: 1.475, city: 1.125, total: 9.1 },
      OverlandPark: { state: 6.5, county: 1.475, city: 1.125, total: 9.1 },
      Topeka: { state: 6.5, county: 1.15, city: 1.5, total: 9.15 },
      Olathe: { state: 6.5, county: 1.475, city: 1.125, total: 9.1 },
      Lawrence: { state: 6.5, county: 1.25, city: 1.55, total: 9.3 },
    },
    uniqueFeatures: [
      "Compensating use tax (6.5% state rate)",
      "NEW 2025: 120-day sale provision - tax credit if selling vehicle within 120 days",
      "Service contracts (VSC) TAXABLE - unique Kansas rule",
      "GAP insurance NOT taxable when separately stated",
      "Full trade-in credit (state + local) on purchases",
      "Lease taxation: FULL_UPFRONT method (not monthly)",
      "Leases: Trade-in equity taxed as cap reduction (opposite of purchase)",
      "Leases: Cap cost reductions ADDED to taxable base",
      "Vehicle property tax: Annual recurring tax separate from sales tax",
      "No doc fee cap (average $285)",
    ],
    vehiclePropertyTax:
      "Kansas charges annual vehicle property tax at registration and renewal. " +
      "Based on vehicle's assessed value (MSRP with depreciation). County mill levy determines " +
      "amount. Pro-rated from purchase date to registration month. SEPARATE from one-time sales/use " +
      "tax. Calculator available at Kansas DOR website.",
  },
};

export default US_KS;
