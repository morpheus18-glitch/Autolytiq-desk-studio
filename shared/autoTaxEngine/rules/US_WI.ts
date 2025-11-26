import type { TaxRulesConfig } from "../types";

/**
 * WISCONSIN TAX RULES
 *
 * Researched: 2025-11-13
 * Version: 1
 *
 * KEY FACTS:
 * - State sales tax: 5.0% (among the lower state rates)
 * - County sales tax: 0.5% or 0.9% (Milwaukee County) in 68 of 72 counties
 * - Combined rate range: 5.0% - 8.0% (most common: 5.5%, Milwaukee County: 5.9%)
 * - Trade-in credit: FULL (trade-in value is NOT taxable on purchases)
 * - Doc fee: TAXABLE, NO CAP (dealers set their own fees, average $299)
 * - Manufacturer rebates: TAXABLE (do NOT reduce sale price for tax purposes)
 * - Dealer rebates/discounts: NOT taxable (reduce sale price)
 * - Service contracts: TAXABLE (even if separately stated)
 * - GAP: NOT taxable (if separately stated as insurance)
 * - Lease taxation: MONTHLY (tax on each payment + cap cost reduction)
 * - Reciprocity: YES (credit for taxes paid to other states)
 *
 * UNIQUE WISCONSIN FEATURES:
 * - Manufacturer rebates are TAXABLE (unusual - most states treat as non-taxable)
 * - Service contracts are TAXABLE (unusual - most states exempt VSC)
 * - Trade-in value on LEASES is taxable as cap cost reduction (different from purchases)
 * - No doc fee cap (dealers can charge any amount, must disclose)
 * - Milwaukee County: 0.9% county tax (increased Jan 1, 2024, was 0.5%)
 * - Wheel tax: Rapidly expanding county/city registration fee ($10-$80 annually, 68 jurisdictions)
 * - Stadium tax ELIMINATED March 31, 2020 (was 0.1% Milwaukee area)
 *
 * TAX CALCULATION FORMULA (RETAIL):
 * Taxable Amount = Vehicle Price - Dealer Discounts - Trade-In + Doc Fee + Accessories + VSC
 * (Manufacturer rebates do NOT reduce taxable amount - customer pays tax on full price)
 * Tax = Taxable Amount × (5.0% state + county rate)
 *
 * Example (Milwaukee County at 5.9%):
 * $25,000 vehicle + $399 doc fee + $600 accessories + $2,200 VSC - $500 dealer discount - $8,000 trade = $20,199
 * Tax: $20,199 × 5.9% = $1,191.74
 * (Manufacturer $2,000 rebate received by customer AFTER purchase, no tax reduction)
 *
 * LEASE CALCULATION (MONTHLY + CAP REDUCTION):
 * - Cap cost reduction (cash down + trade-in + rebates) taxed UPFRONT
 * - Monthly payment taxed EACH MONTH
 * - Total tax = Upfront tax + (Monthly tax × number of payments)
 *
 * SOURCES:
 * - Wisconsin Department of Revenue (revenue.wi.gov)
 * - Wisconsin Statutes Chapter 77 (Sales and Use Taxes)
 * - Wisconsin Administrative Code Tax 11.27, 11.28, 11.29, 11.83, 11.84
 * - Wisconsin Administrative Code Trans 139.05 (Dealer Service Fees)
 * - Wisconsin DOR Publication 202 (Motor Vehicle Sales and Leases)
 */
export const US_WI: TaxRulesConfig = {
  stateCode: "WI",
  version: 1,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL (trade-in value is NOT taxable)
   *
   * Wisconsin allows full trade-in allowance credit where the sale of a motor
   * vehicle minus any trade-in allowance is subject to tax, if the sale and
   * trade-in are one transaction.
   *
   * How It Works:
   * - Purchase price subject to tax = Selling price - Trade-in value
   * - Buyer saves sales tax on the full value of the trade-in
   * - Trade-in credit only applies when sale and trade-in are part of ONE transaction
   * - A separate or independent sale is NOT a trade-in
   *
   * Example:
   *   If dealer sells two vehicles for $10,000 and $12,000 and accepts a
   *   trade-in valued at $15,000, the sales price subject to tax is $7,000
   *   (the $22,000 selling price less the $15,000 trade-in).
   *
   * Tax Savings Example:
   *   Vehicle price: $30,000
   *   Trade-in value: $10,000
   *   Taxable amount: $20,000
   *   Tax at 5.5%: $1,100 (instead of $1,650 without trade-in)
   *   Savings: $550
   *
   * Source: Wisconsin DOR Publication 202, Admin Code Tax 11.83(8), Publication 2113
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules:
   *
   * Wisconsin has UNIQUE treatment: Manufacturer rebates are TAXABLE, but
   * dealer discounts are NOT taxable.
   *
   * MANUFACTURER REBATES: TAXABLE (do NOT reduce sales price)
   * - A manufacturer's rebate to a purchaser is NOT a reduction of the
   *   retailer's sales price for sales or use tax purposes
   * - Sales tax is calculated on the full purchase price BEFORE manufacturer rebates
   * - Customer pays tax on the higher amount even though they receive a rebate
   *
   * Example:
   *   Vehicle price: $25,000
   *   Manufacturer rebate: $2,500
   *   Out-of-pocket cost to buyer: $22,500
   *   TAXABLE amount: $25,000 (rebate does NOT reduce tax base)
   *   Tax at 5.5%: $1,375
   *
   * DEALER DISCOUNTS/REBATES: NOT TAXABLE (reduce sales price)
   * - Cash discounts, price reductions for dealer coupons, and dealer rebates
   *   allowed directly to customers reduce the dealer's receipts subject to tax
   * - If manufacturer gives wholesale incentive to dealer and dealer passes
   *   portion to customer as price reduction, dealer's taxable receipts reduced
   *
   * Key Distinction:
   * - Manufacturer-to-customer rebates: TAXABLE
   * - Dealer-to-customer discounts/rebates: NOT taxable
   * - Manufacturer-to-dealer incentives passed through: NOT taxable to extent passed
   *
   * Source: Wisconsin Admin Code Tax 11.28(3)(c)2, DOR Publication 202
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: true,
      notes:
        "Manufacturer rebates are TAXABLE (unusual). Sales tax calculated on full price " +
        "BEFORE manufacturer rebates. Customer receives rebate after paying full tax.",
    },
    {
      appliesTo: "DEALER",
      taxable: false,
      notes:
        "Dealer discounts/rebates reduce taxable sales price. Cash discounts, dealer " +
        "coupons, and dealer rebates allowed directly to customers reduce dealer's receipts.",
    },
  ],

  /**
   * Doc Fee: TAXABLE, NO CAP
   *
   * Wisconsin documentary fees are:
   * 1. Generally TAXABLE (with one narrow exception)
   * 2. NO state cap on amount (dealers can set their own fees)
   * 3. Average: $299, Range: $295-$500
   *
   * Tax Treatment:
   * - TAXABLE: Service fees for completing WI Buyer's Guide, inspecting titles,
   *   disclosing lemon law notices, checking recalls, and other administrative work
   * - TAXABLE: Charges for delivery, handling, and preparation of motor vehicle
   * - TAXABLE: Service fees for completing sales-related or lease-related vehicle
   *   inspection or forms required by law
   * - NOT TAXABLE: Dealer service fees ONLY for electronically filing the
   *   purchaser's registration and titling application with Wisconsin DOT
   *
   * Example:
   *   Vehicle price: $25,000
   *   Doc fee: $399
   *   Trade-in: $5,000
   *   TAXABLE amount: $20,399 (doc fee is included)
   *   Tax at 5.5%: $1,121.95
   *
   * Disclosure Requirements:
   * - Dealers must disclose service fees to buyers
   * - Fee must be posted on the vehicle
   * - Fee should be visible on vehicle purchase contract
   * - Wisconsin allows dealers to set their own service fees with no state cap
   *
   * Source: Wisconsin Admin Code Trans 139.05(8), CarEdge Database, Sales Tax Handbook
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules:
   *
   * Wisconsin TAXES most backend products, which is UNUSUAL compared to most states.
   *
   * SERVICE CONTRACTS (VSC): TAXABLE (even if separately stated)
   * - Extended warranties or service contracts are subject to sales or use tax
   *   even though referred to as "insurance"
   * - Even if separately stated on invoice, still taxable
   * - Applies to contracts for future repair, service, alteration, maintenance
   * - EXCEPTION: If underlying property sale is exempt, service contract also exempt
   *
   * GAP INSURANCE: NOT TAXABLE (if separately stated)
   * - Insurance charges (including GAP) are exempt from sales/use tax when
   *   SEPARATELY STATED on invoice provided to purchaser
   * - Must comply with Wisconsin Statute 77.54(8)
   * - If NOT separately stated, becomes taxable
   *
   * ACCESSORIES: TAXABLE
   * - All parts, accessories, and attachments for motor vehicles are taxable
   * - Includes: undercoating, rustproofing, paint protection, audio systems,
   *   running boards, bed liners, window tinting, etc.
   *
   * Example:
   *   Vehicle price: $25,000
   *   VSC (extended warranty): $2,500 (TAXABLE even if separate)
   *   GAP insurance (separately stated): $795 (NOT taxable)
   *   Taxable amount: $27,500
   *   Tax at 5.5%: $1,512.50
   *   Total with GAP: $29,807.50
   *
   * Source: Wisconsin Admin Code Tax 11.27(3), § 77.52(2)(a), § 77.54(8), Publication 202
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: true,
      notes:
        "Service contracts/VSC are TAXABLE in Wisconsin (unusual - most states exempt). " +
        "Taxable even if separately stated on invoice.",
    },
    {
      code: "GAP",
      taxable: false,
      notes:
        "GAP insurance is NOT taxable if SEPARATELY STATED on invoice. Must comply " +
        "with § 77.54(8). If bundled without separate line item, becomes taxable.",
    },
    {
      code: "TITLE",
      taxable: false,
      notes: "Title fees are not taxable (government fee)",
    },
    {
      code: "REG",
      taxable: false,
      notes: "Registration fees are not taxable (government fee)",
    },
  ],

  /**
   * Product Taxability:
   *
   * - Accessories: TAXABLE (all dealer-added accessories)
   * - Negative equity: NOT taxable (not part of vehicle selling price)
   * - Service contracts: TAXABLE (even if separately stated)
   * - GAP: NOT taxable (if separately stated as insurance)
   *
   * Negative Equity Treatment:
   * Negative equity rolled into financing does NOT increase the taxable sales
   * price. Tax is based only on the negotiated price of the vehicle itself.
   *
   * Example:
   *   New vehicle price: $30,000
   *   Trade-in value: $10,000
   *   Payoff on trade-in: $15,000
   *   Negative equity: $5,000 (rolled into new loan)
   *
   *   Taxable amount: $20,000 ($30,000 - $10,000 trade-in)
   *   Tax at 5.5%: $1,100
   *   Amount financed: $25,000 ($20,000 + $5,000 negative equity + $1,100 tax)
   *
   * The $5,000 negative equity increases loan amount but NOT taxable sales price.
   *
   * Source: Wisconsin Admin Code Tax 11.83(8), DMV FAQs, Sales Tax Handbook
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: false,
  taxOnServiceContracts: true, // WI DOES tax VSC (unusual)
  taxOnGap: false, // If separately stated

  /**
   * Vehicle Tax Scheme: STATE_PLUS_LOCAL
   *
   * Wisconsin uses combined state and county sales tax system:
   *
   * State Sales Tax: 5.0%
   *
   * County Sales Tax:
   * - 68 of 72 counties: 0.5% county tax
   * - Milwaukee County: 0.9% county tax (increased January 1, 2024, was 0.5%)
   * - 4 counties: No county tax (0.0%)
   *
   * Common Combined Rates:
   * - Most counties: 5.5% (5.0% state + 0.5% county)
   * - Milwaukee County: 5.9% (5.0% state + 0.9% county)
   * - Counties without county tax: 5.0% (state only)
   * - Range statewide: 5.0% to 8.0% (some cities add additional local taxes)
   *
   * Special Notes:
   * - Baseball stadium district tax (0.1%) ENDED March 31, 2020
   * - Some municipalities impose additional city or district taxes
   * - City of Milwaukee added city tax beginning January 1, 2024
   * - Highest combined rates can reach 8.0% in certain municipalities
   *
   * Source: Wisconsin DOR, Avalara Tax Rate Database 2025
   */
  vehicleTaxScheme: "STATE_PLUS_LOCAL",
  vehicleUsesLocalSalesTax: true,

  // ============================================================================
  // LEASE TRANSACTION RULES
  // ============================================================================

  leaseRules: {
    /**
     * Lease Method: MONTHLY (with upfront cap reduction tax)
     *
     * Wisconsin taxes both:
     * 1. Each monthly lease payment as it's made
     * 2. Any upfront capitalized cost reduction (down payment) at lease inception
     *
     * Payment Components Taxed:
     * - Monthly base payment: TAXABLE
     * - Capitalized cost reduction (cash down): TAXABLE upfront
     * - Trade-in as cap reduction: TAXABLE upfront
     * - Service contracts added to payment: TAXABLE
     * - Doc fees: TAXABLE
     * - Accessories: TAXABLE
     *
     * Not Taxed:
     * - GAP insurance (if separately stated): NOT taxable
     * - Other insurance (if separately stated): NOT taxable
     *
     * Source: Wisconsin Admin Code Tax 11.84(1)(e), DOR Publication 202
     */
    method: "MONTHLY",

    /**
     * Cap Cost Reduction: TAXABLE (cash reductions do NOT reduce taxable amount)
     *
     * Capitalized cost reductions made in cash do NOT reduce the amount subject
     * to Wisconsin sales or use tax.
     *
     * Definition (Chapter 429 Wisconsin Statutes):
     * "Capitalized cost reduction" means the sum, at lease inception, of:
     * - Any payments made by cash, check, rebates, or the like (down payment by lessee)
     * - The net amount credited by the lessor for any trade-in
     *
     * Wisconsin's Unique Approach:
     * Unlike some states where cap cost reduction might reduce tax base, Wisconsin taxes:
     * - The full cap cost reduction upfront (at lease inception)
     * - Each monthly payment in full
     *
     * Example from Wisconsin DOR:
     *   Lease term: 36 months
     *   Monthly payment: $350/month (due at beginning of each period)
     *   One-time cash cap cost reduction: $2,000 at signing
     *
     *   Taxable at inception: $2,000 + $350 = $2,350
     *   Taxable each subsequent month: $350
     *   Total tax paid (36 months): Tax on [$2,000 + (36 × $350)] = Tax on $14,600
     *
     * At 5.5% tax rate:
     *   Tax at inception: $129.25 (on $2,350)
     *   Tax each of next 35 months: $19.25 (on $350)
     *   Total tax over lease: $802.75
     *
     * Source: Wisconsin Admin Code Tax 11.84(1)(e), Publication 202, Chapter 429
     */
    taxCapReduction: true,

    /**
     * Rebate Behavior on Leases: FOLLOW_RETAIL_RULE
     *
     * Manufacturer rebates: TAXABLE (as part of cap reduction)
     * Dealer discounts: NOT taxable (reduce cap cost, not taxed)
     *
     * Consistent with retail treatment.
     */
    rebateBehavior: "FOLLOW_RETAIL_RULE",

    /**
     * Doc Fee on Leases: ALWAYS taxable
     *
     * Doc fees on leases are taxable (same as purchases).
     *
     * Typically added to capitalized cost and taxed upfront, or added to
     * monthly payment and taxed monthly.
     *
     * Exception: Dealer service fees specifically for electronically filing
     * lessee's registration/titling application with WI DOT are NOT taxable.
     *
     * Source: Wisconsin Admin Code Trans 139.05(8), Tax 11.84
     */
    docFeeTaxability: "ALWAYS",

    /**
     * Trade-in Credit on Leases: NONE (trade-in is TAXABLE as cap reduction)
     *
     * When a trade-in is used as part of a lease transaction, it is treated
     * as a capitalized cost reduction. The value of the trade-in is included
     * in the gross capitalized cost calculation and is TAXED upfront.
     *
     * How It Differs from Purchase:
     * - On a PURCHASE: Trade-in value reduces taxable sales price (NOT taxed)
     * - On a LEASE: Trade-in value is treated as cap cost reduction (IS taxed upfront)
     *
     * Definition (Wisconsin Chapter 429):
     * "Capitalized cost reduction" includes "the net amount credited by the
     * lessor for any trade-in."
     *
     * Example:
     *   Gross cap cost: $30,000
     *   Trade-in value: $5,000 (applied as cap cost reduction)
     *   Cash down: $2,000
     *   Total cap cost reduction: $7,000
     *   Adjusted cap cost: $23,000
     *
     *   Taxable at inception: $7,000 (both trade-in and cash down)
     *   Tax at 5.5%: $385
     *   Plus tax on first monthly payment
     *
     * IMPORTANT: This is a significant difference from purchase transactions
     * and should be clearly disclosed to customers considering lease vs. purchase.
     *
     * Source: Wisconsin Chapter 429 Statutes, Admin Code Tax 11.84(1)(e)
     */
    tradeInCredit: "NONE",

    /**
     * Negative Equity on Leases: NOT taxable
     *
     * Negative equity rolled into lease increases gross cap cost but doesn't
     * create additional tax beyond the tax on cap cost reduction and payments.
     */
    negativeEquityTaxable: false,

    /**
     * Fee Taxability on Leases:
     *
     * Service Contracts (VSC): TAXABLE
     * - If included in monthly payment: Taxed each month
     * - If paid upfront: Taxed at lease inception
     * - Cannot be excluded even if separately stated
     *
     * GAP Insurance: NOT TAXABLE (if separately stated)
     * - Can be deducted from taxable lease receipts
     * - Must be separately stated on lease agreement per § 77.54(8)
     * - If bundled without separate disclosure, becomes taxable
     *
     * Other Insurance: NOT TAXABLE (if separately stated)
     * - Credit life, accident, casualty, theft, loss insurance not taxable
     *
     * Source: Admin Code Tax 11.27(5), § 77.54(8), Publication 202
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: true,
        notes: "Doc fee taxable on leases (same as retail), no cap",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: true,
        notes: "VSC TAXABLE on leases (if in payment: taxed monthly; if upfront: taxed at inception)",
      },
      {
        code: "GAP",
        taxable: false,
        notes: "GAP NOT taxable if separately stated on lease agreement",
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

    taxFeesUpfront: true,

    specialScheme: "NONE",

    notes:
      "Wisconsin: Monthly lease taxation with CAP COST REDUCTION also taxed upfront. " +
      "Tax on cap reduction (cash down + trade-in + mfr rebates) due at signing. Tax on " +
      "monthly payments collected each month. Service contracts TAXABLE (unusual). GAP " +
      "NOT taxable if separately stated. Doc fee taxable, no cap. Trade-in on lease IS " +
      "taxed (different from purchase where trade-in is NOT taxed).",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: YES (credit for taxes paid in other states)
   *
   * Wisconsin provides credit for sales or use tax properly paid in another state.
   *
   * Policy: Credit allowed for taxes paid to other states
   *
   * How It Works:
   * 1. Purchase vehicle in another state and pay sales tax there
   * 2. Bring vehicle to Wisconsin and register it
   * 3. Wisconsin will impose use tax on the purchase
   * 4. Receive credit for the amount of tax paid to other state
   * 5. Only pay the difference (if Wisconsin rate is higher)
   *
   * Example 1 - Credit Eliminates Wisconsin Tax:
   *   Vehicle purchased in Illinois for $25,000
   *   Illinois sales tax paid (6.25%): $1,562.50
   *   Wisconsin tax rate (5.5%): $1,375.00
   *   Credit for Illinois tax: $1,375.00
   *   Additional Wisconsin tax due: $0 (Illinois tax exceeds WI tax)
   *
   * Example 2 - Partial Credit:
   *   Vehicle purchased in state with 4% tax for $25,000
   *   Other state sales tax paid (4%): $1,000
   *   Wisconsin tax rate (5.5%): $1,375.00
   *   Credit for other state tax: $1,000
   *   Additional Wisconsin tax due: $375.00
   *
   * Documentation Required:
   * - Proof of sales tax paid to other state
   * - Original sales receipt or invoice
   * - Title documentation
   *
   * Source: Wisconsin DOR Publication 2104 (Use Tax), Publication 202
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
      "Wisconsin provides credit for sales/use tax paid to other states. Credit offsets " +
      "Wisconsin tax due. If other state's tax exceeds Wisconsin tax, no additional tax owed. " +
      "If lower, pay difference to Wisconsin. Requires proof of tax paid.",
  },

  extras: {
    lastUpdated: "2025-11-13",
    sources: [
      "Wisconsin Department of Revenue (revenue.wi.gov)",
      "Wisconsin Statutes Chapter 77 (Sales and Use Taxes)",
      "Wisconsin Statutes Chapter 429 (Consumer Leases)",
      "Wisconsin Administrative Code Tax 11.27 (Contracts, Insurance, Warranties)",
      "Wisconsin Administrative Code Tax 11.28 (Discounts, Coupons, Rebates)",
      "Wisconsin Administrative Code Tax 11.29 (Leases and Rentals)",
      "Wisconsin Administrative Code Tax 11.83 (Motor Vehicle Sales)",
      "Wisconsin Administrative Code Tax 11.84 (Motor Vehicle Leases)",
      "Wisconsin Administrative Code Trans 139.05 (Dealer Service Fees)",
      "Wisconsin DOR Publication 202 (Motor Vehicle Sales and Leases)",
      "Wisconsin DOR Publication 2104 (Use Tax Fact Sheet)",
    ],
    notes:
      "Wisconsin has 5.0% state + 0.5% or 0.9% county = 5.5%-5.9% typical sales tax. " +
      "Full trade-in credit on PURCHASES (trade-in NOT taxed). Manufacturer rebates are " +
      "TAXABLE (unusual - most states treat as non-taxable). Dealer discounts NOT taxable. " +
      "Service contracts TAXABLE (unusual - most states exempt VSC). GAP NOT taxable if " +
      "separately stated. Doc fee taxable with NO CAP (average $299). Leases: Monthly " +
      "taxation with cap cost reduction (including trade-in) taxed upfront. Trade-in on lease IS taxed " +
      "(different from purchase where trade-in is NOT taxed). Wheel tax: " +
      "68 jurisdictions collect $10-$80 annually (county/city registration fee, NOT sales tax). " +
      "Milwaukee County: 0.9% rate (increased Jan 1, 2024). Stadium tax eliminated Mar 31, 2020.",
    stateRate: 5.0,
    typicalCountyRate: 0.5,
    milwaukeeCountyRate: 0.9,
    milwaukeeCountyRateEffectiveDate: "2024-01-01",
    minCombinedRate: 5.0,
    maxCombinedRate: 8.0,
    typicalCombinedRate: 5.5,
    docFeeCapAmount: null, // No cap
    avgDocFee: 299,
    wheelTaxJurisdictions: 68,
    wheelTaxRange: [10, 80],
    stadiumTaxEliminated: "2020-03-31",
    countiesWithCountyTax: 68,
    totalCounties: 72,
  },
};

export default US_WI;
