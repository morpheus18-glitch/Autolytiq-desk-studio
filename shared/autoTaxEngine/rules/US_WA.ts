import type { TaxRulesConfig } from "../types";

/**
 * WASHINGTON STATE TAX RULES
 *
 * Researched: 2025-11-13
 * Version: 2
 *
 * KEY FACTS:
 * - Base state sales tax: 6.5%
 * - Motor vehicle sales/lease tax: +0.3% (through Dec 31, 2025, then 0.5%)
 * - Combined state rate: 6.8% (effective through 2025)
 * - Local rates: Yes, 0.5% to 3.5% (total combined can reach 10.3%+)
 * - RTA (Regional Transit Authority) tax: +1.4% in King, Pierce, Snohomish counties
 * - Trade-in credit: FULL (deducted from sale price before tax)
 * - Doc fee: NOT taxable, capped at $200 (effective July 1, 2022)
 * - Manufacturer rebates: Taxable (do NOT reduce taxable base)
 * - Dealer rebates: Taxable (do NOT reduce taxable base)
 * - Service contracts (VSC): TAXABLE on retail sales and leases
 * - GAP insurance: Exempt (if true insurance), taxable (if GAP waiver/debt cancellation)
 * - Lease taxation: MONTHLY (tax on each payment) + tax on cap cost reduction upfront
 * - Reciprocity: LIMITED (Oregon residents exempt from WA sales tax on vehicle purchases)
 * - Special rules: RTA tax in Sound Transit district, expired EV exemption (ended July 31, 2025)
 *
 * NOTABLE CHARACTERISTICS:
 * - Washington has NO state income tax, relies heavily on sales tax
 * - One of highest combined sales tax rates in US (up to 10.3%+ in Seattle area)
 * - Motor vehicles taxed based on dealer location, NOT buyer residence or registration location
 * - Oregon residents (no sales tax state) can purchase vehicles tax-free with proper documentation
 * - Lease payments taxed monthly at lessee's location; cap reduction taxed at dealer location
 * - Extended warranties and service contracts are explicitly taxable (not exempt like insurance)
 * - GAP products: Distinction matters - true insurance exempt, waivers taxable
 *
 * SOURCES:
 * - Washington Department of Revenue (dor.wa.gov)
 * - RCW 82.08 (Retail Sales Tax)
 * - RCW 82.12 (Use Tax)
 * - RCW 82.14.450 (Regional transit authority tax)
 * - WAC 458-20-211 (Leases or rentals of tangible personal property)
 * - WAC 458-20-247 (Tangible personal property warranties and service contracts)
 * - WAC 458-20-257 (Service contracts)
 * - Washington Automobile Dealers Association (WADA)
 */
export const US_WA: TaxRulesConfig = {
  stateCode: "WA",
  version: 2,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL (100% credit, no cap)
   *
   * Washington provides FULL trade-in credit with no limitations. Trade-in
   * value is completely excluded from the selling price for sales tax purposes.
   *
   * Official Guidance (DOR Auto Dealers - Trade-ins):
   * "For retail sales tax purposes, the selling price excludes 'trade-in
   * property of like kind,' meaning dealers will collect retail sales tax
   * from retail customers on the price after the value of the trade-in
   * is deducted."
   *
   * Requirements for Trade-In Credit:
   * 1. Seller must accept ownership of trade-in property
   * 2. Trade-in must reduce purchase price at time of sale
   * 3. Trade-in used as consideration for the purchase
   * 4. Must be "like kind" property (vehicle for vehicle)
   *
   * "Like Kind" Definition:
   * Licensed vehicle categories qualifying for trade-in credit:
   * - Cars, trucks, trucks with canopies
   * - Motorcycles, motor homes, mopeds
   * - ORVs (off-road vehicles)
   * - Wheelchair conveyances
   * - Trailers and recreational land vehicles
   *
   * IMPORTANT CLARIFICATIONS:
   *
   * 1. Trade-In Value vs. Payoff Amount:
   *    - Credit based on agreed TRADE-IN VALUE, not payoff amount
   *    - Over-allowances, payoffs, or encumbrances do NOT reduce trade-in value
   *    - Payment to lien holders does NOT decrease the trade-in credit
   *
   * 2. Negative Equity:
   *    - Full trade-in value credit applies regardless of payoff
   *    - Example: $8,000 trade value with $10,000 payoff = $8,000 credit
   *    - Negative equity ($2,000) is a separate loan obligation
   *
   * 3. Cash Back Limitation:
   *    - Cash back to customer for trade-in value does NOT constitute trade-in
   *    - Trade must be applied toward purchase to qualify for credit
   *
   * 4. Prior Tax Payment Not Required:
   *    - Previous payment of sales/use tax on traded item is NOT required
   *    - Credit applies even if no tax was previously paid
   *
   * Example - Standard Trade:
   *   Vehicle Price:              $30,000
   *   Trade-In Value:             $10,000
   *   ──────────────────────────────────────
   *   Taxable Amount:             $20,000
   *   Sales Tax @ 8.5%:           $1,700
   *   Tax Savings:                $850 (vs. no trade-in)
   *
   * Example - Negative Equity Trade:
   *   Vehicle Price:              $30,000
   *   Trade-In Value:             $8,000
   *   Trade-In Payoff:            -$10,000
   *   Negative Equity:            $2,000 (rolled into new loan)
   *   ──────────────────────────────────────
   *   Taxable Amount:             $22,000 (price - trade value)
   *   Sales Tax @ 8.5%:           $1,870
   *   Amount Financed:            $24,000 + $1,870 = $25,870
   *
   * Source: dor.wa.gov/education/industry-guides/auto-dealers/trade-ins
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules: CRITICAL DISTINCTION between manufacturer and dealer rebates
   *
   * MANUFACTURER/DISTRIBUTOR REBATES: TAXABLE (do NOT reduce taxable base)
   * Official Guidance (DOR Auto Dealers - Discounts/Rebates):
   * "Rebates from the manufacturer or distributor are part of the selling price
   * of the vehicle. The amount of the rebate may not be deducted from the selling
   * price before retail sales tax is charged, nor may it be deducted before
   * computing the B&O tax."
   *
   * Tax Treatment:
   * - Customer pays full purchase price minus manufacturer rebate
   * - Sales tax calculated on FULL price BEFORE rebate
   * - Rebate does NOT reduce the taxable amount
   * - Whether applied as down payment or taken as cash, tax base unchanged
   *
   * Example:
   *   Agreed Selling Price:        $25,000
   *   Manufacturer Rebate:         -$2,000
   *   Customer Pays:               $23,000
   *   BUT Taxable Base:            $25,000 (NOT $23,000)
   *   Sales Tax @ 8.5%:            $2,125 (on full $25,000)
   *
   * DEALER REBATES: NOT TAXABLE (reduce taxable base)
   * Official Guidance (DOR Auto Dealers - Discounts/Rebates):
   * "Rebates from the dealer are considered discounts and are not part of
   * the selling price. These rebates/discounts are not subject to the
   * Retailing B&O tax or the retail sales tax."
   *
   * Tax Treatment:
   * - Dealer's own discounts/promotions reduce the actual selling price
   * - Sales tax calculated on reduced price after dealer rebate
   * - True discount given by dealer (not reimbursed by anyone else)
   *
   * Example:
   *   Original Price:              $25,000
   *   Dealer Rebate/Discount:      -$2,000
   *   ──────────────────────────────────────
   *   Actual Selling Price:        $23,000
   *   Sales Tax @ 8.5%:            $1,955 (on $23,000)
   *
   * CRITICAL DISTINCTION:
   * - Manufacturer rebate: Customer saves on price but NOT on tax
   * - Dealer rebate: Customer saves on BOTH price AND tax
   *
   * On a $2,000 rebate at 8.5% tax:
   * - Manufacturer rebate saves customer: $2,000 (rebate only)
   * - Dealer rebate saves customer: $2,170 ($2,000 + $170 tax savings)
   *
   * Source: dor.wa.gov/education/industry-guides/auto-dealers/discountsrebates
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: true,
      notes:
        "MANUFACTURER/DISTRIBUTOR rebates are TAXABLE per DOR guidance. Sales tax calculated " +
        "on full selling price BEFORE rebate. Rebate amount may NOT be deducted from taxable base. " +
        "Whether applied as down payment or cash, tax base is unchanged.",
    },
    {
      appliesTo: "DEALER",
      taxable: false,
      notes:
        "DEALER rebates/discounts are NOT taxable per DOR guidance. Dealer discounts reduce the " +
        "actual selling price and thus reduce the sales tax base. These are true price reductions " +
        "not subject to retail sales tax or B&O tax.",
    },
  ],

  /**
   * Doc Fee: NOT TAXABLE
   *
   * Washington documentary service fees are:
   * 1. NOT subject to sales tax (separately designated from selling price)
   * 2. Capped at $200 by state law (effective July 1, 2022)
   * 3. Negotiable up to the $200 maximum
   *
   * The doc fee must be separately designated from the selling price or
   * capitalized cost of the vehicle and from any other taxes, fees, or charges.
   *
   * Source: DOR Miscellaneous guidance, RCW regulations on doc fees
   */
  docFeeTaxable: false,

  /**
   * Fee Taxability Rules:
   *
   * - Service contracts (VSC): TAXABLE on retail (WAC 458-20-257)
   * - Extended warranties: TAXABLE (WAC 458-20-247)
   * - GAP insurance: EXEMPT if true insurance, TAXABLE if debt cancellation waiver
   * - Accessories: TAXABLE (parts and labor for installation)
   * - Title fee: NOT taxable (government fee)
   * - Registration fee: NOT taxable (government fee)
   *
   * IMPORTANT: Washington distinguishes between true insurance (subject to
   * insurance premium tax, exempt from sales tax) and service contracts/warranties
   * (subject to retail sales tax). Most VSC and extended warranties sold by
   * dealers are subject to sales tax.
   *
   * GAP products: True GAP insurance (regulated under Title 48 RCW as insurance)
   * is exempt from sales tax but subject to insurance premium tax. GAP waivers
   * (debt cancellation agreements under RCW 48.160) are subject to sales tax.
   *
   * Source: WAC 458-20-257, WAC 458-20-247, DOR insurance industry guide
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: true,
      notes:
        "Service contracts/VSC are taxable per WAC 458-20-257 - not exempt like insurance",
    },
    {
      code: "EXTENDED_WARRANTY",
      taxable: true,
      notes: "Extended warranties are taxable per WAC 458-20-247",
    },
    {
      code: "GAP",
      taxable: true,
      notes:
        "GAP waivers (debt cancellation) are taxable. True GAP insurance is exempt but rare at dealers.",
    },
    {
      code: "ACCESSORIES",
      taxable: true,
      notes:
        "Dealer-installed accessories, parts, and labor are all taxable on retail sales",
    },
    { code: "TITLE", taxable: false, notes: "DOL title fee is not taxable" },
    { code: "REG", taxable: false, notes: "DOL registration fee is not taxable" },
  ],

  /**
   * Product Taxability:
   *
   * ACCESSORIES: TAXABLE
   * - All vehicle accessories subject to sales tax (parts + labor)
   * - Factory-installed, dealer-installed, and aftermarket all taxable
   * - Installation labor is also taxable when part of retail sale
   *
   * NEGATIVE EQUITY: NOT TAXABLE
   * - Negative equity from trade-in is a debt obligation, not part of selling price
   * - Does NOT increase the taxable base for sales tax
   * - Trade-in credit based on VALUE, not payoff amount
   * - Example: $30,000 vehicle - $8,000 trade value = $22,000 taxable
   *   (even if trade has $10,000 payoff and $2,000 negative equity)
   *
   * SERVICE CONTRACTS (VSC): TAXABLE
   * - Extended warranties and service contracts are taxable per WAC 458-20-257
   * - NOT exempt like insurance products
   * - Subject to retail sales tax, not insurance premium tax
   *
   * GAP: TAXABLE (most dealer products)
   * - True GAP insurance: Exempt (rare, must be regulated insurance)
   * - GAP waivers/debt cancellation: TAXABLE (most dealer products)
   * - Most dealer-sold GAP products are taxable under RCW 48.160
   *
   * Source: DOR industry guides, WAC 458-20-257, RCW 48.160
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: false, // Corrected based on trade-in value treatment
  taxOnServiceContracts: true,
  taxOnGap: true,

  /**
   * Vehicle Tax Scheme: STATE_PLUS_LOCAL
   *
   * Washington uses a combination of:
   * - State base rate: 6.5%
   * - Motor vehicle sales/lease tax: 0.3% (through Dec 31, 2025; 0.5% from Jan 1, 2026)
   * - Combined state rate: 6.8%
   * - Local district rates: 0.5% to 3.5%
   * - RTA (Regional Transit Authority) tax: 1.4% in Sound Transit district
   *   (King, Pierce, Snohomish counties)
   *
   * Total combined rate ranges from 7.3% (lowest) to 10.3%+ (Seattle area with RTA).
   *
   * IMPORTANT: Motor vehicles are taxed based on the DEALER'S LOCATION, not the
   * buyer's residence or registration location. This is different from general
   * retail sales where sourcing follows destination-based rules.
   *
   * RTA Tax: The 1.4% Regional Transit Authority sales tax applies in most major
   * metropolitan areas of Pierce, King, and Snohomish counties (Sound Transit district).
   * This is in addition to state and local sales taxes. The RTA tax funds Sound
   * Transit's light rail, Sounder commuter rail, and express bus systems.
   *
   * Source: DOR sales tax rate guidance, RCW 82.14.450 (RTA tax)
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
     * Washington taxes leases on a MONTHLY basis per WAC 458-20-211.
     * Sales tax is charged on:
     * 1. Each monthly lease payment (due when payment is due)
     * 2. Capitalized cost reduction (down payment) paid upfront
     *
     * The retail sales tax rate for lease payments is based on where the vehicle
     * is usually kept by the lessee, while the lessor's business location is used
     * for any down payment (cap cost reduction) or payoff payment.
     *
     * IMPORTANT: Tax on cap cost reduction is due at lease inception at the
     * dealer's location rate. Tax on monthly payments is due each period at
     * the lessee's usual location rate.
     *
     * Source: WAC 458-20-211, DOR leases/rental guidance
     */
    method: "MONTHLY",

    /**
     * Cap Cost Reduction: TAXED
     *
     * Cap cost reductions (cash down payments, rebates applied to reduce cap cost)
     * ARE taxed in Washington. The cap cost reduction is considered part of the
     * consideration paid for the lease and is subject to sales tax at lease inception.
     *
     * Trade-in portion of cap cost reduction: NOT taxed (trade-in allowance applies).
     * Cash portion of cap cost reduction: TAXED (at dealer location rate).
     *
     * Source: WAC 458-20-211, DOR leases/rental guidance
     */
    taxCapReduction: true,

    /**
     * Rebate Behavior on Leases: FOLLOW_RETAIL_RULE
     *
     * - Manufacturer rebates: TAXABLE (do not reduce cap cost for tax purposes)
     * - Dealer rebates: TAXABLE (do not reduce cap cost for tax purposes)
     *
     * Consistent with retail treatment, rebates applied to leases are taxed
     * on the full amount before rebate application.
     */
    rebateBehavior: "FOLLOW_RETAIL_RULE",

    /**
     * Doc Fee on Leases: NEVER taxable
     *
     * Doc fees on leases are NOT taxable in Washington, consistent with
     * retail treatment. The $200 cap also applies to leases.
     */
    docFeeTaxability: "NEVER",

    /**
     * Trade-in Credit on Leases: FULL
     *
     * Trade-ins on leases receive full credit and reduce the cap cost.
     * The trade-in allowance can be applied to both:
     * 1. Cap cost reduction (reducing taxable base at inception)
     * 2. Exempting initial lease payments until trade-in value is exhausted
     *
     * Two methods are commonly used:
     * - Method 1: Reduce cap cost, lowering monthly payments and tax due on payments
     * - Method 2: Apply trade-in against initial lease payments with no tax until exhausted
     *
     * Source: DOR trade-ins guidance for auto dealers
     */
    tradeInCredit: "FULL",

    /**
     * Negative Equity on Leases: NOT taxable directly
     *
     * Negative equity rolled into a lease affects the capitalized cost
     * calculation but is not directly taxed. Consistent with retail treatment,
     * the trade-in credit is based on VALUE, not payoff.
     *
     * Treatment:
     * - Trade-in value reduces cap cost (credit applied)
     * - Negative equity is debt obligation (not taxed separately)
     * - Monthly payments based on adjusted cap cost are taxed
     *
     * Example:
     *   Gross Cap Cost:             $32,000
     *   Trade-In Value:             $8,000
     *   Trade-In Payoff:            -$10,000
     *   Negative Equity:            $2,000
     *
     *   Net Cap Reduction:          $8,000 (trade value, not net equity)
     *   Adjusted Cap Cost:          $24,000
     *   (Negative equity affects financing, not tax base directly)
     *
     * Source: DOR leases/rental guidance, trade-ins guidance
     */
    negativeEquityTaxable: false,

    /**
     * Fee Taxability on Leases:
     *
     * - Doc fee: NOT taxable
     * - Service contracts: TAXABLE (per WAC 458-20-257)
     * - Extended warranties: TAXABLE (per WAC 458-20-247)
     * - GAP: TAXABLE (if waiver/debt cancellation)
     * - Accessories: TAXABLE
     * - Title: Not taxable (government fee)
     * - Registration: Not taxable (government fee)
     *
     * Backend products (VSC, extended warranties) remain taxable when added
     * to leases in Washington, unlike states like California where they may
     * be exempt when capitalized into a lease.
     */
    feeTaxRules: [
      { code: "DOC_FEE", taxable: false, notes: "Doc fee not taxed on leases" },
      {
        code: "SERVICE_CONTRACT",
        taxable: true,
        notes: "Service contracts taxable when added to lease cap cost",
      },
      {
        code: "EXTENDED_WARRANTY",
        taxable: true,
        notes: "Extended warranties taxable on leases",
      },
      {
        code: "GAP",
        taxable: true,
        notes: "GAP waivers taxable when added to lease",
      },
      {
        code: "ACCESSORIES",
        taxable: true,
        notes: "Accessories taxable on leases",
      },
      { code: "TITLE", taxable: false },
      { code: "REG", taxable: false },
    ],

    /**
     * Title Fee Rules on Leases:
     *
     * Title fees are:
     * - Not taxable (government fee)
     * - Typically paid upfront
     * - Not included in cap cost for lease calculation
     * - Not included in monthly payment
     */
    titleFeeRules: [
      {
        code: "TITLE",
        taxable: false,
        includedInCapCost: false,
        includedInUpfront: true,
        includedInMonthly: false,
      },
    ],

    /**
     * Tax Fees Upfront: TRUE
     *
     * Fees that are taxable on leases are typically taxed upfront at
     * lease inception (cap cost reduction), not spread across monthly payments.
     */
    taxFeesUpfront: true,

    /**
     * Special Scheme: NONE
     *
     * Washington uses standard monthly lease taxation with no special
     * schemes beyond the RTA tax in certain counties (which applies to
     * both retail and lease transactions).
     *
     * NOTE: RCW 82.14.450(4) provides an exemption from the "public safety"
     * component of local retail sales tax for:
     * - Retail sales of motor vehicles
     * - First 36 months of lease payments on motor vehicles
     *
     * However, this exemption applies to a specific local tax component,
     * not the overall sales tax structure, and should be handled in
     * local rate lookups.
     */
    specialScheme: "NONE",

    notes:
      "Washington lease taxation: Monthly payment method per WAC 458-20-211. " +
      "Cap cost reduction is taxed upfront (cash portion; trade-in exempt). " +
      "Monthly payments taxed at lessee location rate. Backend products (VSC, GAP) " +
      "remain taxable when capitalized. Trade-in can reduce cap cost or exempt " +
      "initial payments. First 36 lease payments may be exempt from certain local " +
      "public safety taxes per RCW 82.14.450(4).",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: LIMITED (Oregon residents exempt)
   *
   * Washington generally does NOT provide reciprocity credits for sales tax
   * paid in other states. However, there is a critical exception:
   *
   * OREGON RESIDENT EXEMPTION:
   * Oregon residents purchasing vehicles in Washington do NOT need to pay
   * Washington State sales tax on the vehicle purchase with proper documentation.
   *
   * Requirements for Oregon exemption:
   * - Two forms of ID showing proof of Oregon residency (utility bill + driver's license)
   * - Vehicle cannot be registered in Washington
   * - Vehicle cannot retain Washington plates when delivered
   *
   * IMPORTANT: This exemption applies to the vehicle purchase only. Since 2019,
   * Oregon residents have had to pay Washington sales tax on parts and service
   * purchases. A rebate program exists for non-resident parts/service purchases.
   *
   * Washington residents purchasing out-of-state:
   * Washington residents who purchase vehicles out-of-state still owe Washington
   * use tax when registering the vehicle in-state, regardless of tax paid elsewhere.
   *
   * Source: DOR guidance on vehicles brought from out-of-state, exempt vehicle sales,
   * dealer FAQs for Oregon customers
   */
  reciprocity: {
    enabled: true,
    scope: "RETAIL_ONLY",
    homeStateBehavior: "NONE",
    requireProofOfTaxPaid: false,
    basis: "TAX_PAID",
    capAtThisStatesTax: false,
    hasLeaseException: false,

    // Oregon-specific reciprocity override
    overrides: [
      {
        originState: "OR",
        modeOverride: "HOME_STATE_ONLY",
        scopeOverride: "RETAIL_ONLY",
        notes:
          "Oregon residents (no sales tax state) exempt from WA sales tax on vehicle " +
          "purchases with proper proof of residency. Must provide two forms of OR ID. " +
          "Vehicle cannot be registered in WA or retain WA plates.",
      },
    ],

    notes:
      "Washington does not provide reciprocity credits for out-of-state taxes paid, " +
      "with the critical exception of Oregon residents who are exempt from WA sales tax " +
      "on vehicle purchases with proper documentation. WA residents purchasing out-of-state " +
      "owe WA use tax regardless of tax paid elsewhere.",
  },

  extras: {
    lastUpdated: "2025-11",
    sources: [
      "Washington Department of Revenue (dor.wa.gov)",
      "RCW 82.08 - Retail Sales Tax",
      "RCW 82.12 - Use Tax",
      "RCW 82.14.450 - Regional transit authority tax",
      "RCW 48.160 - Guaranteed Asset Protection Waivers",
      "WAC 458-20-211 - Leases or rentals of tangible personal property",
      "WAC 458-20-247 - Warranties and service contracts",
      "WAC 458-20-257 - Service contracts",
      "Washington Automobile Dealers Association (WADA)",
    ],
    notes:
      "Washington has no state income tax and relies heavily on sales tax revenue. " +
      "Combined state + local rates can exceed 10.3% in high-tax areas like Seattle " +
      "(including RTA tax). Motor vehicles are taxed at dealer location, not buyer " +
      "location. Doc fees capped at $200 and not taxable. Both manufacturer and dealer " +
      "rebates are taxable (unlike many states). Service contracts and extended warranties " +
      "are taxable (not exempt like insurance). EV sales tax exemption expired July 31, 2025.",
    docFeeCapAmount: 200,
    maxCombinedRate: 10.3,
    motorVehicleSalesTaxRate: 0.003, // 0.3% through Dec 31, 2025
    motorVehicleSalesTaxRateFuture: 0.005, // 0.5% from Jan 1, 2026
    rtaTaxRate: 0.014, // 1.4% in Sound Transit district
    rtaTaxCounties: ["King", "Pierce", "Snohomish"],
    evExemptionExpired: "2025-07-31",
    specialNotes: [
      "RTA tax (1.4%) applies in King, Pierce, and Snohomish counties (Sound Transit district)",
      "Motor vehicle sales/lease tax increases from 0.3% to 0.5% on January 1, 2026",
      "EV sales tax exemption (up to $16k used, $15k new) expired July 31, 2025",
      "First 36 lease payments exempt from certain local public safety taxes (RCW 82.14.450(4))",
      "Oregon residents exempt from WA sales tax with proper documentation",
      "Doc fees must be separately designated and cannot exceed $200",
    ],
  },
};

export default US_WA;
