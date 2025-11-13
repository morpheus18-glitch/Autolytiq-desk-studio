import { TaxRulesConfig } from "../types";

/**
 * NEW JERSEY TAX RULES
 *
 * Researched: 2025-01
 * Version: 1
 *
 * KEY FACTS:
 * - State sales tax rate: 6.625%
 * - Local rates: NO (state-only, uniform rate across entire state)
 * - Trade-in credit: FULL (deducted from sale price before tax)
 * - Manufacturer rebates: TAXABLE (do NOT reduce sale price for tax)
 * - Dealer rebates: TAXABLE (do NOT reduce sale price for tax)
 * - Doc fee: TAXABLE, NO state cap (avg $335, range $400-800)
 * - Service contracts: TAXABLE on retail sales
 * - GAP insurance: Depends on provider (third-party insurance = NOT taxable, dealer GAP waiver = TAXABLE)
 * - Accessories: TAXABLE
 * - Negative equity: TODO: Verify (assumed TAXABLE based on general principle)
 * - Lease taxation: FULL_UPFRONT (tax due on total lease payments at lease inception)
 * - Luxury surcharge: 0.4% one-time fee on vehicles $45,000+ OR < 19 MPG
 * - Reciprocity: YES (credit allowed for tax paid in other states, capped at NJ rate)
 *
 * UNIQUE FEATURES:
 * - NO local sales tax (single statewide rate of 6.625%)
 * - Rebates are TAXABLE (unlike NY where manufacturer rebates reduce taxable base)
 * - Luxury and Fuel-Inefficient Vehicle Surcharge (LFIS): 0.4% on price ≥$45k OR MPG <19
 * - LFIS assessed BEFORE trade-in, rebates, or disability equipment deductions
 * - Zero-Emission Vehicles (ZEVs): Temporary reduced rate of 3.3125% (Oct 1, 2024 - Jun 30, 2025)
 * - Lease tax: Dealer must remit FULL tax upfront (based on total lease payments)
 * - Lease flexibility: Parties can agree to incorporate tax into monthly payments, but dealer still remits upfront
 * - GAP treatment: Third-party insurance NOT taxable, dealer GAP waivers ARE taxable
 * - Two lease calculation methods: Tax on (1) Total Lease Payments OR (2) Original Purchase Price
 * - Trade-in credit applies to BOTH lease calculation methods
 *
 * SOURCES:
 * - New Jersey Division of Taxation - Consumer Automotive Tax Guide (2025)
 * - NJ Treasury - Luxury and Fuel-Inefficient Vehicle Surcharge (LFIS)
 * - NJ MVC - Luxury and Fuel Inefficient Surcharge Overview
 * - Sales Tax Handbook - New Jersey Vehicle Sales Tax
 * - LeaseGuide.com - New Jersey Car Lease Fees and Taxes
 * - NJ Division of Taxation - Leases and Rentals (Tax Topic Bulletin S&U-12)
 * - NJ Treasury - Motor Vehicle Lease Transaction Summary
 */
export const US_NJ: TaxRulesConfig = {
  stateCode: "NJ",
  version: 1,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL
   *
   * New Jersey allows full trade-in credit. The trade-in value is deducted
   * from the purchase price before calculating sales tax.
   *
   * Example: $45,000 vehicle - $15,000 trade-in = $30,000 taxable base
   *
   * Trade-in credit must be part of the purchase transaction (same transaction).
   * NJ limits the sales tax benefit to transactions occurring at the same time.
   *
   * IMPORTANT: Trade-in is deducted AFTER luxury surcharge calculation.
   * Luxury surcharge (0.4%) is assessed on gross price before trade-in.
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules:
   *
   * - Manufacturer rebates: TAXABLE - do NOT reduce the sale price for tax purposes
   * - Dealer rebates: TAXABLE - do NOT reduce the sale price for tax purposes
   *
   * This is DIFFERENT from New York, where manufacturer rebates reduce taxable base.
   *
   * In New Jersey, sales tax is charged on the price of the motor vehicle BEFORE
   * any rebate(s) because that is the amount that the dealership ultimately receives -
   * part from the purchaser, and the balance from the manufacturer.
   *
   * Example: $25,000 vehicle with $1,000 manufacturer rebate
   * - Sales tax calculated on: $25,000 (NOT $24,000)
   * - Tax = $25,000 × 6.625% = $1,656.25
   *
   * NJ is one of six states (CT, ME, MD, NJ, NY, PA, RI) that tax the full
   * price before manufacturer rebates.
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: true,
      notes: "Manufacturer rebates do NOT reduce taxable base in NJ (unlike NY). Tax calculated on full price before rebate.",
    },
    {
      appliesTo: "DEALER",
      taxable: true,
      notes: "Dealer rebates do NOT reduce taxable base",
    },
  ],

  /**
   * Doc Fee: TAXABLE
   *
   * Documentation fees in New Jersey are:
   * 1. TAXABLE as part of the sale
   * 2. NO state cap (unlike NY's $175 cap)
   *
   * Average doc fee in NJ: $335
   * Range: $400-$800 depending on dealer
   *
   * Per NJ Division of Taxation Notice on Motor Vehicle Dealerships:
   * When determining the sales price of a motor vehicle, the seller is not
   * allowed to deduct from the total taxable amount any costs relating to the
   * sale, such as administrative expenses of the seller and charges by the
   * seller for services that are necessary to complete the sale.
   *
   * Therefore, doc fees are included in the sales price and subject to NJ
   * sales tax (6.625%).
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules:
   *
   * - Service contracts: TAXABLE on retail sales (prepayment for taxable services)
   * - GAP insurance: Depends on provider
   *   - Third-party insurance carrier: NOT taxable
   *   - Dealer GAP waiver: TAXABLE
   * - Title fee: NOT taxable (government fee)
   * - Registration fee: NOT taxable (government fee)
   * - Accessories: TAXABLE (part of vehicle sale)
   *
   * NJ Division of Taxation guidance: The sale of an extended warranty as an
   * agreement to provide taxable services to tangible personal property is
   * subject to Sales Tax. Maintenance contracts are considered prepayment for
   * taxable services to tangible personal property.
   *
   * GAP distinction: Gap Insurance provided by a third-party insurance carrier
   * is NOT taxable. Gap Waivers (provided by dealer/lease company) ARE taxable.
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: true,
      notes: "Service contracts (extended warranties) are taxable as prepayment for taxable services",
    },
    {
      code: "GAP",
      taxable: true,
      notes: "GAP treatment depends on provider: Third-party insurance = NOT taxable, Dealer GAP waiver = TAXABLE. Default to taxable.",
    },
    { code: "TITLE", taxable: false, notes: "DMV title fee is not taxable" },
    { code: "REG", taxable: false, notes: "DMV registration fee is not taxable" },
  ],

  /**
   * Product Taxability:
   *
   * - Accessories: TAXABLE (part of vehicle sale)
   * - Negative equity: TODO: Verify (assumed taxable based on general principle)
   * - Service contracts: TAXABLE on retail
   * - GAP: TAXABLE (dealer GAP waivers), NOT taxable (third-party insurance)
   *
   * Per NJ Admin Code § 18:24-6.5: Sales to the customer of replacement parts,
   * batteries, motor oil and accessories, with or without labor, are subject
   * to New Jersey Sales Tax. Aftermarket parts added to the car after the
   * original sale are also subject to Sales Tax.
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: true, // TODO: Verify - assumed taxable, no explicit guidance found
  taxOnServiceContracts: true,
  taxOnGap: true, // Applies to dealer GAP waivers; third-party insurance GAP is NOT taxable

  /**
   * Vehicle Tax Scheme: STATE_ONLY
   *
   * New Jersey sales tax structure:
   * - State rate: 6.625% (standard rate as of 2018)
   * - Local sales tax: NONE (NJ does not allow local sales tax)
   * - Single uniform rate across entire state
   *
   * Special rates:
   * - Zero-Emission Vehicles (ZEVs): 3.3125% (Oct 1, 2024 - Jun 30, 2025)
   * - After July 1, 2025: ZEVs taxed at full 6.625% rate
   *
   * Luxury and Fuel-Inefficient Vehicle Surcharge (LFIS):
   * - Additional one-time 0.4% surcharge on:
   *   (1) Vehicles with gross sales/lease price ≥ $45,000 (before trade-in, rebates), OR
   *   (2) Vehicles with EPA fuel efficiency < 19 MPG (city/highway average)
   * - This is a MOTOR VEHICLE FEE, not a sales tax (separate from 6.625%)
   * - Assessed only once even if both conditions apply
   * - NJ residents cannot avoid by purchasing out-of-state
   * - Enacted July 8, 2006
   *
   * IMPORTANT: Luxury surcharge is calculated on gross price BEFORE trade-in,
   * manufacturer rebates, or adaptive equipment for persons with disabilities.
   *
   * Example calculation:
   * - Vehicle price: $50,000
   * - Luxury surcharge: $50,000 × 0.4% = $200 (assessed because ≥$45k)
   * - Trade-in: $10,000
   * - Taxable base for sales tax: $50,000 - $10,000 = $40,000
   * - Sales tax: $40,000 × 6.625% = $2,650
   * - Total tax/fees: $200 + $2,650 = $2,850
   *
   * NOTE: Tax is based on where the vehicle is registered (buyer's residence),
   * but since NJ has no local rates, location within NJ doesn't matter for rate.
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
     * New Jersey requires FULL TAX UPFRONT on leases. The dealer must remit
     * the full amount of sales tax due with the sales tax return filed for
     * the period in which the leased motor vehicle was delivered to the lessee.
     *
     * Key requirements:
     * - For long-term leases (>6 months): Sales tax is due IN FULL at lease inception
     * - For short-term leases (≤6 months): Sales tax can be due on monthly payments
     *
     * Tax base calculation - TWO METHODS AVAILABLE:
     *
     * Method 1 - Total Lease Payments Method (most common):
     * - Lessor collects and remits tax every time the property is leased
     * - Tax calculated on total of all lease payments over term
     * - Trade-in credit can be applied
     *
     * Method 2 - Original Purchase Price Method:
     * - Lessor collects and remits tax only ONCE on the property
     * - Tax calculated on vehicle's original purchase price (cap cost)
     * - Trade-in credit can be applied
     *
     * Lessor and lessee may negotiate which method to use.
     *
     * Payment flexibility: If dealership and lessee agree, the full amount of
     * sales tax due may be INCORPORATED INTO LEASE PAYMENTS. However, the
     * dealership is still REQUIRED TO REMIT THE FULL AMOUNT OF TAX UPFRONT
     * to the state. This allows customers to pay tax over time to the dealer
     * while dealer pays state upfront.
     *
     * IMPORTANT: Unlike monthly-taxation states (CA, IN), NJ requires dealer
     * to remit full tax immediately, even if customer pays over time.
     */
    method: "FULL_UPFRONT",

    /**
     * Cap Cost Reduction: NOT taxed
     *
     * Cap cost reductions (down payments, trade-ins, rebates applied to
     * reduce capitalized cost) are NOT taxed in New Jersey on lease
     * transactions.
     *
     * Under both calculation methods (Total Lease Payments OR Original Purchase
     * Price), the trade-in credit can be used to reduce the taxable base.
     */
    taxCapReduction: false,

    /**
     * Rebate Behavior on Leases: FOLLOW_RETAIL_RULE
     *
     * Following retail rules means:
     * - Manufacturer rebates: TAXABLE (do not reduce taxable base)
     * - Dealer rebates: TAXABLE (do not reduce taxable base)
     *
     * This is consistent with NJ's retail approach where rebates are taxable.
     */
    rebateBehavior: "FOLLOW_RETAIL_RULE",

    /**
     * Doc Fee on Leases: ALWAYS taxable
     *
     * Documentation fees on leases are TAXABLE in New Jersey and are
     * included in the taxable base for the upfront tax calculation.
     *
     * No state cap applies (unlike NY's $175 cap).
     */
    docFeeTaxability: "ALWAYS",

    /**
     * Trade-in Credit on Leases: FULL
     *
     * Trade-ins on leases receive FULL credit and can reduce the taxable
     * base under BOTH calculation methods:
     *
     * - Total Lease Payments Method: Trade-in reduces total payments subject to tax
     * - Original Purchase Price Method: Trade-in reduces purchase price subject to tax
     *
     * Per NJ Division of Taxation: The trade-in credit can be used when
     * calculating the Sales Tax due from the lessee using either method.
     */
    tradeInCredit: "FULL",

    /**
     * Negative Equity on Leases: Taxable
     *
     * Negative equity rolled into a lease increases the capitalized cost
     * or total lease payments, thereby increasing the taxable base.
     *
     * TODO: Verify - assumed taxable based on general principle.
     */
    negativeEquityTaxable: true,

    /**
     * Fee Taxability on Leases:
     *
     * - Doc fee: TAXABLE (included in upfront taxable base)
     * - Service contracts: TAXABLE when capitalized into lease
     * - GAP coverage: Depends on provider
     *   - Dealer/lease company GAP: TAXABLE
     *   - Third-party insurance GAP: NOT taxable
     * - Title: Not taxable
     * - Registration: Not taxable
     *
     * Per NJ Division of Taxation Summary of Changes in Tax Base for Motor
     * Vehicle Lease Transactions: Gap Coverage (provided by lease company)
     * is taxable, while Gap Coverage (provided by third party insurer) is exempt.
     */
    feeTaxRules: [
      { code: "DOC_FEE", taxable: true, notes: "Doc fee taxed in upfront lease calculation" },
      {
        code: "SERVICE_CONTRACT",
        taxable: true,
        notes: "Service contracts ARE taxed when capitalized into lease",
      },
      {
        code: "GAP",
        taxable: true,
        notes: "Dealer/lease company GAP is taxable; third-party insurance GAP is NOT taxable",
      },
      { code: "TITLE", taxable: false },
      { code: "REG", taxable: false },
    ],

    /**
     * Title Fee Rules on Leases:
     *
     * Title processing fees:
     * - Not taxable
     * - Included in cap cost
     * - Paid upfront
     * - Not in monthly payment calculation (for customer reimbursement purposes)
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
     * All taxable fees (doc fee, service contracts, dealer GAP) are taxed
     * upfront on leases as part of the full upfront tax calculation.
     *
     * The dealer must remit the full tax amount to the state at lease inception,
     * though the dealer and customer may agree to have the customer reimburse
     * the tax amount over the lease term through monthly payments.
     */
    taxFeesUpfront: true,

    /**
     * Special Scheme: NJ_LUXURY
     *
     * New Jersey has a special scheme for the Luxury and Fuel-Inefficient
     * Vehicle Surcharge (LFIS) which applies to BOTH retail AND lease transactions.
     *
     * LFIS applies to leases when:
     * - Lease price (gross cap cost or total payments) ≥ $45,000 (BEFORE trade-in), OR
     * - Vehicle EPA fuel efficiency < 19 MPG (city/highway average)
     *
     * The 0.4% surcharge is calculated on the gross lease price BEFORE:
     * - Trade-in allowance
     * - Manufacturer rebates
     * - Adaptive equipment for persons with disabilities
     *
     * Example lease calculation:
     * - Gross cap cost: $50,000
     * - Luxury surcharge: $50,000 × 0.4% = $200 (assessed because ≥$45k)
     * - Trade-in applied: $10,000
     * - Total lease payments (after trade-in reduction): $35,000
     * - Sales tax: $35,000 × 6.625% = $2,318.75 (due upfront to state)
     * - Total tax/fees: $200 + $2,318.75 = $2,518.75
     *
     * The interpreter must:
     * 1. Check if gross price ≥ $45,000 OR MPG < 19
     * 2. Apply 0.4% surcharge on gross price if triggered
     * 3. Calculate sales tax on net amount (after trade-in, using chosen method)
     * 4. Sum luxury surcharge + sales tax for total tax due
     */
    specialScheme: "NJ_LUXURY",

    notes:
      "New Jersey lease taxation: FULL UPFRONT method with dealer remitting total tax at lease inception. " +
      "Two calculation methods available (Total Lease Payments OR Original Purchase Price). " +
      "Trade-in gets FULL credit under both methods. " +
      "Service contracts and dealer GAP waivers ARE taxed on leases. " +
      "Luxury surcharge (0.4%) applies to leases with gross price ≥$45k OR MPG <19. " +
      "Dealer may allow customer to reimburse tax via monthly payments, but dealer still remits upfront to state. " +
      "Long-term leases (>6 months) require upfront tax; short-term (≤6 months) can pay monthly.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: ENABLED
   *
   * New Jersey DOES provide reciprocity credits for sales tax or use tax paid
   * in other states. This is DIFFERENT from New York, which does not allow
   * reciprocity credits.
   *
   * Per NJ law: A credit against the Use Tax due is allowed for any Sales or
   * Use Tax legally due in another jurisdiction.
   *
   * How it works:
   * - If you purchase a vehicle out-of-state and pay sales tax there, you can
   *   receive a credit for that tax when registering in NJ
   * - The credit is capped at NJ's tax rate (6.625% + luxury surcharge if applicable)
   * - You will only be taxed once (in the state where you register)
   * - Proof of tax paid may be required
   *
   * Example 1 - Lower out-of-state tax:
   * - Vehicle purchased in Pennsylvania: $30,000 × 6% = $1,800 PA tax paid
   * - NJ use tax due: $30,000 × 6.625% = $1,987.50
   * - Credit for PA tax paid: -$1,800
   * - Additional NJ tax owed: $187.50
   *
   * Example 2 - Higher out-of-state tax:
   * - Vehicle purchased in California: $30,000 × 7.25% = $2,175 CA tax paid
   * - NJ use tax due: $30,000 × 6.625% = $1,987.50
   * - Credit for CA tax paid: -$1,987.50 (capped at NJ rate)
   * - Additional NJ tax owed: $0 (no refund for excess)
   *
   * IMPORTANT: The out-of-state purchaser should contact their home state's
   * taxing authority to determine eligibility for credit of Sales Tax paid
   * in New Jersey.
   *
   * Scope: Reciprocity applies to BOTH retail and lease transactions.
   */
  reciprocity: {
    enabled: true,
    scope: "BOTH",
    homeStateBehavior: "CREDIT_UP_TO_STATE_RATE",
    requireProofOfTaxPaid: true, // Assumed based on standard practice
    basis: "TAX_PAID",
    capAtThisStatesTax: true,
    hasLeaseException: false,
    notes:
      "New Jersey provides reciprocity credits for sales/use tax paid in other states. " +
      "Credit is capped at NJ's tax rate (6.625% + luxury surcharge if applicable). " +
      "Proof of tax paid may be required. Applies to both retail and lease transactions. " +
      "If you buy out-of-state and pay tax there, you receive credit when registering in NJ, " +
      "but only up to the amount NJ would have charged. No refund if other state's tax was higher.",
  },

  extras: {
    lastUpdated: "2025-01",
    sources: [
      "New Jersey Division of Taxation - Consumer Automotive Tax Guide (2025)",
      "NJ Treasury - Luxury and Fuel-Inefficient Vehicle Surcharge",
      "NJ MVC - Luxury and Fuel Inefficient Surcharge (LFIS)",
      "NJ Division of Taxation - Leases and Rentals (Tax Topic Bulletin S&U-12)",
      "NJ Treasury - Summary of Changes in Tax Base for Motor Vehicle Lease Transactions",
      "NJ Treasury - Notice: Taxability of Documentary Fees",
      "Sales Tax Handbook - New Jersey Vehicle Sales Tax",
      "LeaseGuide.com - New Jersey Car Lease Fees and Taxes",
      "N.J. Admin. Code § 18:24-6.5 - Sales of accessories",
    ],
    notes:
      "New Jersey has 6.625% state-only sales tax (no local rates). " +
      "Doc fees are TAXABLE with NO state cap (avg $335). " +
      "Rebates are TAXABLE (unlike NY where manufacturer rebates reduce base). " +
      "Service contracts and dealer GAP waivers are taxed on BOTH retail and leases. " +
      "Third-party GAP insurance is NOT taxable. " +
      "Luxury surcharge (0.4%) applies to vehicles ≥$45k OR <19 MPG (before trade-in). " +
      "Leases: FULL UPFRONT tax method with two calculation options (Total Payments OR Original Price). " +
      "Reciprocity credit available for tax paid in other states (capped at NJ rate). " +
      "ZEVs: Temporary reduced rate of 3.3125% through June 30, 2025 (then 6.625%).",
    docFeeCapAmount: null, // No cap in NJ
    avgDocFee: 335,
    docFeeRange: "400-800",
    stateRate: 6.625,
    maxCombinedRate: 6.625, // No local rates in NJ
    luxurySurchargeRate: 0.4,
    luxurySurchargeThreshold: 45000,
    luxurySurchargeMPGThreshold: 19,
    zevReducedRate: 3.3125,
    zevReducedRatePeriod: "October 1, 2024 - June 30, 2025",
    zevFullRateEffective: "July 1, 2025",
    leaseTermThresholdForUpfrontTax: 6, // months - leases >6 months require upfront tax
    notes_TODO: [
      "Verify negative equity treatment on retail purchases (assumed taxable)",
      "Verify negative equity treatment on leases (assumed taxable)",
      "Confirm if proof of tax paid is required for reciprocity credits",
      "Research any updates to ZEV tax rates beyond July 1, 2025",
    ],
  },
};

export default US_NJ;
