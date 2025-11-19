import { TaxRulesConfig } from "../types";

/**
 * ALABAMA TAX RULES
 *
 * Researched: 2025-11-13
 * Version: 2
 *
 * KEY FACTS:
 * - State automotive sales tax: 2.0% (reduced from general 4% rate)
 * - State automotive lease tax: 1.5% (monthly payment taxation)
 * - Local taxes: Vary by jurisdiction (0.5% - 8.0%), total combined 2.5% - 10.0%
 * - Trade-in credit: PARTIAL - applies ONLY to state tax (2%), NOT local taxes
 * - Manufacturer rebates: TAXABLE (do NOT reduce tax base)
 * - Doc fee: TAXABLE, NO CAP (average $485, can exceed $600)
 * - Service contracts (VSC): NOT taxable
 * - GAP insurance: NOT taxable
 * - Lease method: MONTHLY taxation + upfront tax on cap cost reductions
 * - Lease trade-in: NO CREDIT (trade-in equity is fully taxable as cap reduction)
 * - Reciprocity: FULL (credit for taxes paid to other states, capped at AL rate)
 * - Drive-Out Provision: 72-hour rule for out-of-state buyers (state tax only, capped at destination state rate)
 *
 * UNIQUE ALABAMA FEATURES:
 * 1. PARTIAL TRADE-IN CREDIT: Trade-in reduces state tax (2%) but NOT local taxes
 *    - Example: $10,000 trade saves $200 state tax but $0 local tax
 *    - In high-tax jurisdictions (Mobile 10%), local tax is 4x the state tax
 *
 * 2. DUAL AUTOMOTIVE TAX RATES:
 *    - Sales: 2.0% state (vs. 4% general sales tax)
 *    - Lease: 1.5% state (vs. 4% general rental tax)
 *
 * 3. MANUFACTURER REBATES TAXABLE:
 *    - Rebates do NOT reduce tax base
 *    - Customer pays tax on full MSRP before rebates
 *    - $5,000 rebate on $35,000 vehicle = tax on $35,000, not $30,000
 *
 * 4. LEASE TRADE-IN TREATMENT:
 *    - Purchases: Trade-in reduces state tax base (saves 2%)
 *    - Leases: Trade-in equity is TAXED as cap cost reduction (costs 1.5%)
 *    - Major economic difference between purchase vs. lease with trade-in
 *
 * 5. NEGATIVE EQUITY DIFFERENCES:
 *    - Purchases: NOT taxable (added to loan, not tax base)
 *    - Leases: TAXABLE (increases cap cost and is subject to lease tax)
 *
 * 6. DRIVE-OUT PROVISION (Effective July 1, 2022):
 *    - Out-of-state buyers: State tax only (2%), NO local taxes
 *    - Tax capped at destination state's rate
 *    - Vehicle must be removed within 72 hours
 *    - Buyers from no-tax states (MT, OR, DE, NH) pay $0
 *
 * 7. ACCESSORIES RATE DIFFERENCE:
 *    - With vehicle: 2% state + local automotive rate
 *    - After delivery: 4% state + local general rate (double state tax)
 *
 * 8. NO DOC FEE CAP:
 *    - Alabama has no statutory limit on doc fees
 *    - Average: $485, but can exceed $600
 *    - Doc fees are taxable at automotive rate
 *
 * TAX CALCULATION FORMULA (RETAIL):
 * State Taxable Base = Vehicle Price + Accessories + Doc Fee - Trade-In
 * Local Taxable Base = Vehicle Price + Accessories + Doc Fee (NO trade-in deduction)
 * State Tax = State Taxable Base × 2.0%
 * Local Tax = Local Taxable Base × Local Rate
 * Total Tax = State Tax + Local Tax
 * (VSC and GAP NOT included, Title Fee separately stated NOT included)
 *
 * Example (Birmingham - 6.0% total: 2% state + 4% local):
 * $30,000 vehicle + $495 doc fee - $10,000 trade-in
 * State Tax: ($30,000 + $495 - $10,000) × 2% = $410.90
 * Local Tax: ($30,000 + $495) × 4% = $1,219.80
 * Total Tax: $1,630.70
 *
 * LEASE CALCULATION (MONTHLY + HYBRID):
 * Cap Cost Reduction Tax (Due at Inception):
 *   Tax Base = Cash Down + Rebates + Trade-In Equity + Negative Equity
 *   Tax = Tax Base × (1.5% state + Local Lease Rate)
 *
 * Monthly Payment Tax:
 *   Tax = Monthly Payment × (1.5% state + Local Lease Rate)
 *
 * Total Lease Tax = Cap Reduction Tax + (Monthly Tax × Number of Payments)
 *
 * Example (3.5% total: 1.5% state + 2% local):
 * $10,000 cap reduction + $450/month × 36 months
 * Cap Reduction Tax: $10,000 × 3.5% = $350.00 (due at signing)
 * Monthly Tax: $450 × 3.5% = $15.75/month
 * Total Lease Tax: $350 + ($15.75 × 36) = $917.00
 *
 * SOURCES:
 * - Alabama Department of Revenue (revenue.alabama.gov)
 * - Alabama Code Title 40, Chapter 23 (Sales and Use Taxes)
 * - § 40-23-2(4): 2% automotive rate, trade-in credit for state tax only
 * - § 40-23-65: Credit for sales tax paid to other states
 * - Alabama Administrative Code 810-6-1-.186.05, 810-6-3-.42.03, 810-6-5-.09
 * - AL DOR Automotive Sales, Use & Lease Tax Guide (2022)
 * - AL DOR Alabama Vehicle Drive-Out Provision guidance
 */
export const US_AL: TaxRulesConfig = {
  stateCode: "AL",
  version: 2,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: PARTIAL - State tax only (unique Alabama feature)
   *
   * Alabama provides trade-in credit for the STATE automotive tax (2%) ONLY.
   * Local county and city taxes do NOT allow trade-in credit.
   *
   * Statutory Basis (Alabama Code § 40-23-2(4)):
   * "When any used automotive vehicle or truck trailer is taken in trade as a
   * credit or part payment on the sale of a new or used vehicle, the tax is
   * paid on the net difference"
   *
   * CRITICAL LIMITATION:
   * This credit applies ONLY to the 2% state automotive tax. Local taxes
   * (county + city) are calculated on the GROSS purchase price with NO
   * trade-in deduction.
   *
   * Example:
   *   Vehicle Price: $30,000
   *   Trade-In Value: $10,000
   *   State Tax (2%): ($30,000 - $10,000) × 2% = $400
   *   Local Tax (4%): $30,000 × 4% = $1,200 (NO trade-in credit)
   *   Total Tax: $1,600
   *
   * Impact in High-Tax Areas:
   * In Mobile County (10% total), only 2% allows trade credit, while 8% local
   * does not. This means trade-in credit provides minimal benefit in high-tax
   * jurisdictions.
   *
   * NOTE: Since the type system doesn't have a "PARTIAL_STATE_ONLY" option,
   * this is marked as FULL but must be handled specially in calculation logic
   * to only apply to state portion.
   *
   * Source: Alabama Code § 40-23-2(4); AL DOR Automotive Guide
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules: Both manufacturer and dealer rebates are TAXABLE
   *
   * Alabama requires sales tax on the full vehicle price BEFORE manufacturer
   * rebates are applied. Rebates do not reduce the taxable amount.
   *
   * MANUFACTURER REBATES:
   * Official Guidance (AL DOR Automotive Sales, Use & Lease Tax Guide):
   * "Rebates are applied AFTER tax calculation. Buyer pays sales tax on full
   * vehicle price before rebates."
   *
   * Tax Treatment:
   * - Customer pays full MSRP minus rebate
   * - Tax calculated on full MSRP (rebate does NOT reduce tax base)
   * - Rebate applied to reduce customer's out-of-pocket cost
   *
   * Example:
   *   MSRP: $25,000
   *   Manufacturer Rebate: $2,000
   *   Customer Pays: $23,000
   *   Tax Base: $25,000 (NOT $23,000)
   *   State Tax (2%): $500 (on $25,000)
   *
   * LEASE TREATMENT:
   * For leases, manufacturer rebates applied as cap cost reduction are subject
   * to lease tax. This includes federal EV rebates ($7,500) - these are taxed
   * as part of the cap cost reduction.
   *
   * DEALER REBATES:
   * Dealer incentives paid by manufacturer to dealer do not affect customer's
   * tax. If dealer reduces price due to their own promotion, tax is on the
   * reduced selling price.
   *
   * Contrast with Trade-Ins:
   * Unlike trade-ins (which DO reduce state tax base), manufacturer rebates
   * provide NO tax benefit to the buyer.
   *
   * Source: AL DOR Automotive Sales, Use & Lease Tax Guide
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: true,
      notes:
        "Manufacturer rebates do NOT reduce taxable amount in Alabama. Tax is calculated " +
        "on full vehicle price before rebates. Rebates applied after tax calculation.",
    },
    {
      appliesTo: "DEALER",
      taxable: false,
      notes:
        "Dealer incentives from manufacturer to dealer do not affect customer tax. If dealer " +
        "reduces price from their own promotion, tax is on actual reduced selling price.",
    },
  ],

  /**
   * Doc Fee: TAXABLE, NO CAP
   *
   * Documentation fees are subject to automotive sales tax at the full
   * combined rate (state + local).
   *
   * Official Guidance (AL DOR Automotive Sales, Use & Lease Tax Guide):
   * "Dealer fees (also known as clerical fees, doc fees, dealer prep charge,
   * processing fees, etc.) are taxable at the automotive rate."
   *
   * No Statutory Cap:
   * Alabama does not impose a statutory limit on dealer documentation fees.
   * - Average doc fee: $485 (2023 data)
   * - Observed range: $300 to $600+
   * - Some dealerships charge $595 or more
   *
   * Taxability:
   * Doc fee is included in taxable base and subject to:
   * - 2% state automotive tax
   * - Full local tax rate (no trade-in credit applies)
   *
   * Example:
   *   Doc Fee: $495
   *   Combined Rate: 6% (2% state + 4% local)
   *   Tax on Doc Fee: $495 × 6% = $29.70
   *
   * Comparison:
   * Alabama is among states with highest average doc fees due to lack of
   * regulation.
   *
   * Source: AL DOR Automotive Guide; § 40-23-2
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules
   *
   * Alabama has clear guidance on what is and isn't taxable:
   *
   * SERVICE CONTRACTS (VSC):
   * - NOT subject to Alabama sales tax
   * - Administrative Rule 810-6-1-.186.05: "Warranty, Extended or Service Contract"
   * - Services generally not subject to Alabama sales tax
   * - Parts used under warranty also not taxable when provided free under contract
   *
   * GAP INSURANCE:
   * - NOT subject to sales tax
   * - Official guidance: "Debt Waiver/GAP Insurance: These items are not subject to sales tax"
   * - Treated as insurance product, exempt from sales tax
   *
   * TITLE FEE:
   * - NOT taxable when separately stated
   * - Current title fee: $25.00
   * - Must be clearly labeled and separately stated on invoice
   * - If bundled with other fees or not clearly separated, may be taxable
   *
   * REGISTRATION FEES:
   * - NOT taxable (government fees)
   *
   * DOC FEE:
   * - TAXABLE (see docFeeTaxable above)
   *
   * Related Products:
   * - Key replacement programs: Contract not taxable (like service contracts)
   * - Tire & wheel/dent & ding/road hazard: Contract not taxable
   * - Window etching: Service, not subject to sales tax
   * - Shop supply fees: Taxable when included on invoice with retail sale
   * - Dealer prep charges: Taxable at automotive rate
   *
   * Source: AL DOR Automotive Sales, Use & Lease Tax Guide; Admin Rule 810-6-1-.186.05
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: false,
      notes:
        "Service contracts (VSC) are NOT subject to Alabama sales tax. Services generally " +
        "exempt. Parts used under warranty also not taxable when provided free.",
    },
    {
      code: "GAP",
      taxable: false,
      notes:
        "GAP insurance is NOT taxable in Alabama. Treated as insurance product, exempt from " +
        "sales tax per AL DOR guidance.",
    },
    {
      code: "DOC_FEE",
      taxable: true,
      notes:
        "Doc fees are TAXABLE at automotive rate (2% state + local). Alabama has NO cap on " +
        "doc fees (average $485, can exceed $600).",
    },
    {
      code: "TITLE",
      taxable: false,
      notes:
        "Title fee ($25) is NOT taxable when clearly labeled and separately stated on invoice. " +
        "If bundled, may be taxable.",
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
   * Accessories: TAXABLE (rate depends on timing)
   * - Purchased WITH vehicle: 2% state + local automotive rate
   * - Purchased AFTER delivery: 4% state + local general rate
   * - Saves tax by purchasing with vehicle vs. separately
   *
   * Negative Equity: Treatment differs between sales and leases
   * - PURCHASES: NOT taxable (added to loan, not tax base)
   * - LEASES: TAXABLE (increases cap cost, subject to lease tax)
   *
   * Service Contracts: NOT taxable
   * GAP: NOT taxable
   *
   * Accessories Example:
   *   Scenario 1 - With Vehicle:
   *     Vehicle: $30,000 + Accessories: $3,000 = $33,000
   *     Tax (2% state + 3% local): $33,000 × 5% = $1,650
   *
   *   Scenario 2 - After Delivery:
   *     Vehicle: $30,000 → Tax: $1,500
   *     Accessories: $3,000 (separate transaction next day)
   *     Tax (4% state + 3% local): $3,000 × 7% = $210
   *     Total: $1,710 (vs. $1,650 if purchased together)
   *
   * Negative Equity Purchase Example:
   *   Vehicle Price: $25,000
   *   Trade-In Value: $12,000
   *   Trade-In Payoff: $15,000
   *   Negative Equity: $3,000
   *
   *   State Tax: ($25,000 - $12,000) × 2% = $260
   *   Local Tax: $25,000 × 3% = $750
   *   Total Tax: $1,010
   *   Amount Financed: $13,000 + $1,010 + $3,000 = $17,010
   *   (Negative equity NOT taxed on purchases)
   *
   * Negative Equity Lease Example:
   *   Cap Cost: $30,000
   *   Negative Equity: $3,000
   *   Adjusted Cap: $33,000
   *   Lease Tax on Negative Equity: $3,000 × 3.5% = $105 (due at inception)
   *   (Negative equity IS taxed on leases)
   *
   * Source: AL DOR Automotive Guide
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: false, // For purchases - leases handled separately
  taxOnServiceContracts: false,
  taxOnGap: false,

  /**
   * Vehicle Tax Scheme: STATE_PLUS_LOCAL
   *
   * Alabama uses a stacked tax system with state + county + municipal taxes.
   *
   * State Automotive Tax: 2.0%
   * - Reduced rate for automotive vehicles (vs. 4% general rate)
   * - Alabama Code § 40-23-2(4)
   * - Applies to new and used vehicles, truck trailers, semi-trailers,
   *   house trailers, and mobile homes
   *
   * Local Taxes: County + Municipal (vary by jurisdiction)
   * - County rates: 0.50% to 6.75%
   * - Municipal rates: 0.00% to 2.00%
   * - 366 local tax jurisdictions across Alabama
   *
   * Combined Rates:
   * - Lowest: ~2.5% (Baldwin County, Blount County)
   * - Average: ~5.4%
   * - Highest: 10.0% (Mobile)
   * - Birmingham: 6.0% (2% state + 2% county + 2% city)
   *
   * Tax Collection Point:
   * Dealer collects tax based on dealership location, not buyer residence.
   * State, city, AND county taxes apply where dealership is located.
   *
   * Rate Resources:
   * - AL DOR Tax Rates: https://www.revenue.alabama.gov/sales-use/tax-rates/
   * - 366 jurisdictions, rates updated regularly
   * - Verify current rates before transactions
   *
   * Source: Alabama Code § 40-23-2(4); AL DOR Tax Rate Database
   */
  vehicleTaxScheme: "STATE_PLUS_LOCAL",
  vehicleUsesLocalSalesTax: true,

  // ============================================================================
  // LEASE TRANSACTION RULES
  // ============================================================================

  leaseRules: {
    /**
     * Lease Method: HYBRID (upfront + monthly)
     *
     * Alabama uses a hybrid lease taxation approach:
     * 1. Cap cost reductions taxed UPFRONT at lease inception
     * 2. Monthly lease payments taxed each month
     *
     * Legal Framework (AL DOR):
     * "Rental tax is a privilege tax levied on the lessor for the leasing or
     * renting of tangible personal property. This tax is due on 'true leases'
     * in which the title to the property is retained by the lessor at the end
     * of the lease agreement."
     *
     * State Lease Rate: 1.5%
     * - Alabama applies 1.5% to gross proceeds from leasing automotive vehicles
     * - Lower than general 4.0% rental tax on other tangible property
     * - Lower than 2.0% automotive sales tax
     *
     * Local Lease Rates:
     * - County and municipal lease taxes apply in addition to state rate
     * - Local lease tax rates vary by jurisdiction
     * - Must collect for state, city, and county where dealership located
     *
     * Tax Liability:
     * - Legally levied against the lessor (leasing company)
     * - Typically passed on to lessee (customer)
     * - Tax passed to customer is included in monthly taxable gross proceeds
     *
     * Calculation:
     * Upfront Tax (Due at Inception):
     *   Tax = Total Cap Cost Reductions × (1.5% state + local lease rate)
     *
     * Monthly Tax:
     *   Tax = Monthly Payment × (1.5% state + local lease rate)
     *
     * Total Lease Tax Over Term:
     *   Total = Upfront Tax + (Monthly Tax × Number of Payments)
     *
     * Example (3.5% total: 1.5% state + 2% local):
     *   Cap Reduction: $10,000
     *   Monthly Payment: $450
     *   Term: 36 months
     *
     *   Upfront Tax: $10,000 × 3.5% = $350 (due at signing)
     *   Monthly Tax: $450 × 3.5% = $15.75/month
     *   Total Tax: $350 + ($15.75 × 36) = $917
     *
     * Source: AL DOR Automotive Sales, Use & Lease Tax Guide
     */
    method: "HYBRID",

    /**
     * Cap Cost Reduction: FULLY TAXABLE
     *
     * ALL cap cost reductions are subject to lease tax at inception.
     *
     * Official Guidance (AL DOR):
     * "Capitalized cost reductions or down payments by the customer whether by
     * cash, manufacturer rebate, or other means are subject to lease tax."
     *
     * What is Taxable:
     * - Cash down payments
     * - Manufacturer rebates applied as cap reduction
     * - Federal EV rebates ($7,500) applied as cap reduction
     * - Trade-in equity (see tradeInCredit below)
     * - Dealer discounts applied as cap reduction
     * - ANY reduction to the cap cost is taxable
     *
     * Tax Timing:
     * All cap cost reductions are taxed UPFRONT at lease inception, not monthly.
     *
     * Example:
     *   Cap Cost: $40,000
     *   Cap Cost Reductions:
     *     - Cash down: $5,000
     *     - Manufacturer rebate: $2,500
     *     - Total: $7,500
     *
     *   Adjusted Cap Cost: $32,500
     *   Tax on Cap Reduction (3.5%): $7,500 × 3.5% = $262.50 (due at signing)
     *
     * Federal EV Rebates:
     * Federal government rebates for electric vehicles are considered part of
     * the lease payment and are taxable when applied as cap cost reduction.
     *
     * Source: AL DOR Automotive Sales, Use & Lease Tax Guide
     */
    taxCapReduction: true,

    /**
     * Rebate Behavior on Leases: ALWAYS_TAXABLE
     *
     * In Alabama, manufacturer rebates on leases are ALWAYS taxable when
     * applied as capitalized cost reductions.
     *
     * This differs from the retail treatment where we specify rebates as
     * taxable, but on leases they're taxable specifically as part of the
     * cap cost reduction mechanism.
     *
     * All rebates (manufacturer, dealer, federal EV credits) that reduce the
     * cap cost are subject to upfront lease tax at inception.
     *
     * Source: AL DOR Automotive Sales, Use & Lease Tax Guide
     */
    rebateBehavior: "ALWAYS_TAXABLE",

    /**
     * Doc Fee on Leases: ALWAYS taxable
     *
     * Dealer documentation fees are subject to lease tax.
     *
     * Application:
     * - If doc fee paid upfront (at inception): Taxed at lease tax rate
     * - If capitalized into lease: Becomes part of monthly payment, taxed monthly
     *
     * Most Common Treatment:
     * Doc fees are typically paid upfront and taxed at inception along with
     * other upfront charges.
     *
     * Example:
     *   Doc Fee: $495
     *   Paid upfront
     *   Tax (3.5%): $495 × 3.5% = $17.33 (due at signing)
     *
     * Source: AL DOR Automotive Guide
     */
    docFeeTaxability: "ALWAYS",

    /**
     * Trade-in Credit on Leases: NONE (major difference from purchases)
     *
     * Alabama does NOT allow trade-in credit on leases. This is a critical
     * and often misunderstood rule.
     *
     * Official Guidance (AL DOR):
     * "The lease tax law does not allow a deduction for trade-ins, as in the
     * sales tax law."
     *
     * Positive Equity Trade-In:
     * "If the customer trades in a vehicle that he owns and applies his equity
     * in the vehicle as all or part of a cap cost reduction on the new leased
     * vehicle, that amount is subject to lease tax."
     *
     * The trade-in equity is treated as a cap cost reduction and is FULLY
     * TAXABLE at lease inception.
     *
     * Negative Equity Trade-In:
     * "If the trade-in allowed has negative equity and that amount is added
     * back to the price of the vehicle to be leased, the negative equity
     * amount is subject to lease tax."
     *
     * The negative equity increases the cap cost and is TAXABLE.
     *
     * CRITICAL DIFFERENCE FROM PURCHASES:
     * - Purchase: Trade-in reduces state tax base (saves 2%)
     * - Lease: Trade-in equity is TAXED (costs 1.5% state + local)
     *
     * Example Comparison ($10,000 trade-in):
     *
     * PURCHASE:
     *   State Tax Base: Reduced by $10,000
     *   Tax Savings: $10,000 × 2% = $200
     *   Local Tax: No savings (still pay on full amount)
     *
     * LEASE:
     *   Trade-in treated as cap reduction
     *   Tax on Trade-in: $10,000 × 3.5% = $350
     *   Tax Savings: $0 (actually COSTS $350 in tax)
     *
     * This creates a significant economic disadvantage for leasing with a
     * trade-in in Alabama.
     *
     * Source: AL DOR Automotive Sales, Use & Lease Tax Guide
     */
    tradeInCredit: "NONE",

    /**
     * Negative Equity on Leases: TAXABLE
     *
     * Negative equity rolled into a lease IS subject to lease tax.
     *
     * Official Guidance (AL DOR):
     * "If the trade-in allowed has negative equity and that amount is added
     * back to the price of the vehicle to be leased, the negative equity
     * amount is subject to lease tax."
     *
     * Treatment:
     * - Negative equity increases the capitalized cost
     * - The negative equity amount is taxed as part of cap cost reduction
     * - Tax paid upfront at lease inception
     *
     * Example:
     *   Base Cap Cost: $30,000
     *   Trade-In Value: $12,000
     *   Trade-In Payoff: $15,000
     *   Negative Equity: $3,000
     *
     *   Adjusted Cap Cost: $33,000 (for payment calculation)
     *   Tax on Negative Equity: $3,000 × 3.5% = $105 (due at inception)
     *
     * This is DIFFERENT from purchases where negative equity is NOT taxable.
     *
     * Source: AL DOR Automotive Sales, Use & Lease Tax Guide
     */
    negativeEquityTaxable: true,

    /**
     * Fee Taxability on Leases
     *
     * Backend products on leases follow same rules as sales:
     *
     * SERVICE CONTRACTS (VSC):
     * - NOT taxable on leases
     * - Same treatment as retail sales
     *
     * GAP INSURANCE:
     * - NOT taxable on leases
     * - Treated as insurance product
     *
     * ACCESSORIES:
     * - TAXABLE at lease rates
     * - Tax applies to portion of monthly payment attributable to accessories
     * - If included in cap cost, taxed as part of monthly payment
     *
     * DOC FEE:
     * - TAXABLE on leases (see docFeeTaxability above)
     *
     * TITLE FEE:
     * - NOT taxable when separately stated
     *
     * Source: AL DOR Automotive Sales, Use & Lease Tax Guide
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: true,
        notes: "Doc fee TAXABLE on leases. Typically taxed upfront at inception.",
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
    ],

    taxFeesUpfront: true,

    specialScheme: "NONE",

    notes:
      "Alabama: HYBRID lease taxation (upfront + monthly). State lease rate 1.5% + local rates. " +
      "Cap cost reductions (cash, rebates, trade-in equity) FULLY TAXABLE upfront. Monthly " +
      "payments taxed monthly. NO trade-in credit on leases (major difference from purchases). " +
      "Trade-in equity is TAXED as cap reduction. Negative equity also taxable. Backend products " +
      "(VSC, GAP) NOT taxed. Doc fee taxable.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: FULL (credit for taxes paid to other states)
   *
   * Alabama provides FULL reciprocal credit for taxes paid to other states.
   *
   * Policy (Alabama Code § 40-23-65):
   * "Each purchaser liable for a use tax on tangible personal property shall
   * be entitled to full credit for the combined amount or amounts of legally
   * imposed sales or use taxes paid by him with respect to the same property
   * to another state and any subdivision thereof."
   *
   * Official Guidance (AL DOR):
   * "Alabama is a reciprocal state and will acknowledge sales taxes paid to
   * any state, as indicated on taxpayer bills of sale, invoices, etc."
   *
   * How It Works:
   *
   * Scenario 1: Other State Tax ≥ Alabama Tax
   * If sales/use tax paid to another state equals or exceeds Alabama's tax,
   * NO additional Alabama use tax is due.
   *
   * Example:
   *   Vehicle purchased in Georgia: $30,000
   *   Georgia tax paid (7%): $2,100
   *   Alabama tax would be (3% avg): $900
   *   Credit allowed: $900
   *   Additional AL tax due: $0
   *
   * Scenario 2: Other State Tax < Alabama Tax
   * If tax paid to another state is less than Alabama's tax, pay the DIFFERENCE.
   *
   * Example:
   *   Vehicle purchased in Montana: $30,000
   *   Montana tax paid (0%): $0
   *   Alabama tax due (3% avg): $900
   *   Credit allowed: $0
   *   Additional AL tax due: $900
   *
   * UNIQUE FEATURE - Unilateral Credit:
   * "Credit for legally imposed sales and use taxes paid to any other state
   * or its subdivisions will be allowed against Alabama use tax due even if
   * that state does not allow credit for sales and use taxes paid to Alabama
   * or its subdivisions."
   *
   * Alabama provides credits unilaterally - you receive credit even if the
   * other state wouldn't reciprocate.
   *
   * Credit Cap:
   * "The total credit allowed cannot exceed the taxes due the state of Alabama
   * or its subdivisions, and if the legally imposed taxes paid to another
   * state or its subdivisions exceed the taxes due Alabama and its subdivisions,
   * no further credit shall be allowed."
   *
   * You get credit up to Alabama's tax amount, but no refund if you paid more
   * in another state.
   *
   * Documentation Required:
   * - Bill of sale showing vehicle price
   * - Receipt or invoice showing taxes paid to other state
   * - Proof of legal imposition of tax (not voluntary payment)
   *
   * DRIVE-OUT PROVISION (Effective July 1, 2022):
   * Special reduced tax rate for out-of-state buyers:
   * - Vehicles removed within 72 hours for use outside Alabama
   * - Subject to 2% state automotive rate ONLY (no local taxes)
   * - Tax capped at destination state's rate
   * - Buyers from no-tax states pay $0
   *
   * Drive-Out Example 1 (High Tax State):
   *   Georgia buyer purchases in Alabama: $30,000
   *   Georgia tax rate: 7%
   *   Alabama state tax: 2% = $600
   *   Alabama local tax: EXEMPT (drive-out)
   *   Tax due to Alabama: $600
   *   Upon GA registration: Pay additional $1,500 to Georgia
   *
   * Drive-Out Example 2 (No Tax State):
   *   Montana buyer purchases in Alabama: $30,000
   *   Montana tax rate: 0%
   *   Alabama state tax: Capped at 0% (Montana rate)
   *   Alabama local tax: EXEMPT (drive-out)
   *   Tax due to Alabama: $0
   *
   * Source: Alabama Code § 40-23-65; AL DOR guidance; AL DOR Drive-Out Provision
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
      "Alabama provides FULL reciprocal credit for taxes paid to other states, capped at AL tax " +
      "amount. Credit given EVEN IF other state wouldn't reciprocate (unilateral). Proof of " +
      "payment required. Drive-Out Provision (July 1, 2022): out-of-state buyers pay state tax only " +
      "(NO local taxes), capped at destination state rate. Vehicle must be removed within 72 " +
      "hours. Buyers from no-tax states pay $0.",
  },

  extras: {
    lastUpdated: "2025-11-13",
    sources: [
      "Alabama Department of Revenue (revenue.alabama.gov)",
      "Alabama Code Title 40, Chapter 23 - Sales and Use Taxes",
      "§ 40-23-2(4): 2% automotive rate, trade-in credit",
      "§ 40-23-65: Credit for tax paid to other states",
      "Alabama Administrative Code 810-6-1-.186.05 (Service Contracts)",
      "Admin Code 810-6-3-.42.03 (Nonresident Sales)",
      "Admin Code 810-6-5-.09 (Leasing and Rental)",
      "AL DOR Automotive Sales, Use & Lease Tax Guide (2022)",
      "AL DOR Alabama Vehicle Drive-Out Provision",
      "AL DOR Sales and Use Tax Rates Database",
    ],
    notes:
      "Alabama has 2% state automotive sales tax + local taxes (0.5%-8.0%) for total 2.5%-10.0%. " +
      "UNIQUE: Trade-in credit applies ONLY to state tax (2%), NOT local taxes. Manufacturer " +
      "rebates do NOT reduce tax base (fully taxable). Lease taxation: 1.5% state rate, HYBRID " +
      "method (upfront + monthly). NO trade-in credit on leases (equity is taxed). Doc fee " +
      "taxable, NO CAP (avg $485). VSC and GAP NOT taxable. Drive-Out Provision: 72-hour rule " +
      "for out-of-state buyers (state tax only, capped at destination rate). Full reciprocity.",
    stateAutomotiveSalesRate: 2.0,
    stateAutomotiveLeaseRate: 1.5,
    stateGeneralSalesRate: 4.0,
    stateGeneralRentalRate: 4.0,
    localRateRange: { min: 0.5, max: 8.0 },
    combinedRateRange: { min: 2.5, max: 10.0 },
    avgDocFee: 485,
    titleFee: 25.0,
    driveOutProvisionEffectiveDate: "2022-07-01",
    driveOutRemovalWindow: "72 hours",
    jurisdictionCount: 366,
    majorJurisdictions: {
      Birmingham: { state: 2.0, local: 4.0, total: 6.0 },
      Mobile: { state: 2.0, local: 8.0, total: 10.0 },
      BaldwinCounty: { state: 2.0, local: 0.5, total: 2.5 },
      Montgomery: { state: 2.0, local: 4.5, total: 6.5 },
    },
  },
};

export default US_AL;
