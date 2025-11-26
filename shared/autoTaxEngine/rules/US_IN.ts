import type { TaxRulesConfig } from "../types";

/**
 * INDIANA TAX RULES
 *
 * Researched: 2025-11-14
 * Version: 2
 *
 * KEY FACTS:
 * - Vehicle Excise Tax: 7% flat state rate (no local variations)
 * - Tax Scheme: STATE_ONLY (one of the simplest in the nation)
 * - Trade-in credit: FULL (reduces tax base dollar-for-dollar)
 * - Manufacturer rebates: NON-TAXABLE (reduce tax base)
 * - Dealer rebates: TAXABLE (do NOT reduce tax base)
 * - Doc fee: TAXABLE ($250 statutory maximum per IC 6-6-5.5)
 * - Service contracts (VSC): TAXABLE on retail, NON-taxable on leases
 * - GAP insurance: TAXABLE on retail, NON-taxable on leases
 * - Lease method: MONTHLY taxation (tax on each payment)
 * - Reciprocity: YES (credit for taxes paid to other states, capped at 7%)
 *
 * UNIQUE INDIANA FEATURES:
 * 1. FLAT 7% STATEWIDE RATE - NO LOCAL VARIATIONS:
 *    - Same rate in Indianapolis, Fort Wayne, Evansville, everywhere
 *    - No jurisdiction lookup required
 *    - No county, city, or special district taxes
 *    - One of ~5 states with completely uniform vehicle tax rate
 *
 * 2. BACKEND PRODUCTS DIFFERENT ON RETAIL VS LEASE:
 *    - Retail purchases: VSC and GAP ARE taxable
 *    - Leases: VSC and GAP are NON-taxable
 *    - This is unusual - most states treat them consistently
 *    - Creates planning opportunities for customers
 *
 * 3. DEALER VS MANUFACTURER REBATE DISTINCTION:
 *    - Manufacturer rebates: Reduce tax base (customer saves 7% on rebate amount)
 *    - Dealer rebates: Do NOT reduce tax base (customer pays tax on pre-rebate price)
 *    - $2,000 mfr rebate saves $140 in tax; $2,000 dealer rebate saves $0 in tax
 *
 * 4. DOC FEE STATUTORY CAP:
 *    - Indiana Code 6-6-5.5 caps dealer doc fee at $250
 *    - Among the lowest caps in the nation (compare: AL no cap, CO no cap)
 *    - Doc fee IS taxable (adds $17.50 in tax at 7%)
 *
 * 5. MONTHLY LEASE TAXATION:
 *    - Tax collected on each monthly payment (not upfront)
 *    - Simplifies lease inception (lower upfront cost)
 *    - Doc fee taxed upfront at signing
 *    - Trade-in reduces cap cost → reduces monthly payment → reduces monthly tax
 *
 * 6. NEGATIVE EQUITY TREATMENT:
 *    - TAXABLE on both retail and leases
 *    - Rolled into price/cap cost and subject to 7% tax
 *    - $4,000 negative equity = $280 in additional tax
 *
 * 7. FULL RECIPROCITY WITH CAP:
 *    - Indiana credits taxes paid to other states
 *    - Credit capped at Indiana's 7% rate
 *    - If other state charged 8%+, Indiana credit stops at 7%
 *    - If other state charged 5%, customer owes 2% to Indiana
 *    - Proof of payment required
 *
 * TAX CALCULATION FORMULA (RETAIL):
 * Taxable Base = Vehicle Price
 *              + Doc Fee (up to $250)
 *              + VSC (taxable on retail)
 *              + GAP (taxable on retail)
 *              + Accessories
 *              + Negative Equity
 *              - Trade-In Value
 *              - Manufacturer Rebate
 *
 * Tax = Taxable Base × 7%
 *
 * (Title and registration fees separately stated are NOT taxable)
 *
 * Example (Indianapolis - same rate as everywhere else):
 * $30,000 vehicle + $250 doc + $2,500 VSC + $895 GAP + $1,500 accessories - $9,000 trade
 * Taxable: $30,000 + $250 + $2,500 + $895 + $1,500 - $9,000 = $26,145
 * Tax @ 7%: $26,145 × 7% = $1,830.15
 *
 * LEASE CALCULATION (MONTHLY):
 * Upfront Tax = (Doc Fee + First Payment) × 7%
 * Monthly Tax = Monthly Payment × 7%
 * Total Tax = Upfront Tax + (Monthly Tax × Remaining Months)
 *
 * (VSC, GAP, cap cost reductions NOT taxed on leases)
 *
 * Example (36-month lease):
 * Doc fee: $250, Monthly payment: $450
 * Upfront tax: ($250 + $450) × 7% = $49
 * Monthly tax: $450 × 7% = $31.50/month
 * Total tax: $49 + ($31.50 × 35) = $1,151.50
 *
 * SOURCES:
 * - Indiana Department of Revenue (dor.in.gov)
 * - Indiana Code Title 6, Article 6 (Vehicle Excise Tax)
 * - IC 6-6-1.1-101 through 6-6-1.1-801 (Vehicle Excise Tax Act)
 * - IC 6-6-5.5 (Dealer documentation fee cap - $250 maximum)
 * - IC 6-6-5.1-27 (Trade-in exemption)
 * - Indiana Administrative Code (IAC) 45 IAC 2.2 (Sales Tax)
 * - Indiana DOR Sales Tax Information Bulletin #8 (Motor Vehicles)
 */
export const US_IN: TaxRulesConfig = {
  stateCode: "IN",
  version: 2,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL (100% credit, no cap)
   *
   * Indiana allows full trade-in credit against the taxable purchase price.
   * The trade-in value is fully deducted from the sales price before
   * calculating the 7% vehicle excise tax.
   *
   * Statutory Basis (IC 6-6-5.1-27):
   * "The gross retail income received from selling a vehicle does not include
   * the value of a motor vehicle that is taken in trade as all or part of the
   * consideration for the sale of another motor vehicle."
   *
   * Official Guidance (Indiana DOR):
   * "Trade-in allowances reduce the taxable amount for purposes of calculating
   * the vehicle excise tax. The tax is computed on the net purchase price
   * (selling price minus trade-in value)."
   *
   * Requirements:
   * - Trade-in vehicle must be owned by the purchaser
   * - Trade-in must be transferred to dealer as part of same transaction
   * - Trade-in allowance must be separately stated on purchase agreement
   * - No cap on trade-in amount
   *
   * Example:
   *   Vehicle Price: $30,000
   *   Doc Fee: $250
   *   Trade-In Value: $10,000
   *   Taxable Base: ($30,000 + $250) - $10,000 = $20,250
   *   Tax @ 7%: $20,250 × 7% = $1,417.50
   *
   * Comparison:
   * - Unlike Alabama (trade credit only for state tax, not local)
   * - Indiana provides FULL credit (no partial treatment needed since no local tax)
   *
   * Source: IC 6-6-5.1-27; Indiana DOR Sales Tax Information Bulletin #8
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules:
   *
   * Indiana distinguishes between manufacturer and dealer rebates with
   * different tax treatments.
   *
   * MANUFACTURER REBATES (NON-TAXABLE):
   * - Manufacturer rebates DO reduce the taxable purchase price
   * - Tax calculated on net price AFTER manufacturer rebate applied
   * - Customer receives tax benefit on rebate amount
   *
   * Official Guidance (Indiana DOR):
   * "Manufacturer rebates, incentives, and cash-back offers that reduce the
   * actual selling price are excluded from gross retail income for tax
   * calculation purposes."
   *
   * This means manufacturer rebates are treated as price reductions that
   * occur BEFORE tax calculation.
   *
   * Example:
   *   Vehicle MSRP: $28,000
   *   Manufacturer Rebate: $2,000
   *   Net Price: $26,000
   *   TAXABLE BASE: $26,000 (NOT $28,000)
   *   Tax @ 7%: $26,000 × 7% = $1,820
   *   Tax Savings: $140 (vs. taxing full $28,000)
   *
   * DEALER REBATES/DISCOUNTS (TAXABLE):
   * - Dealer rebates/discounts do NOT reduce the tax base
   * - If dealer provides a discount from their own funds/profit, the tax
   *   is still calculated on the pre-discount price
   * - Customer does NOT receive tax benefit
   *
   * Example:
   *   Vehicle Price: $28,000
   *   Dealer Discount: $2,000
   *   Customer Pays: $26,000
   *   TAXABLE BASE: $28,000 (NOT $26,000)
   *   Tax @ 7%: $28,000 × 7% = $1,960
   *   Tax Savings: $0
   *
   * Reasoning:
   * Indiana follows the principle that manufacturer rebates are reductions
   * in the manufacturer's selling price to the dealer (which flows through
   * to customer), while dealer discounts are the dealer choosing to reduce
   * their profit margin (which doesn't affect the transaction value for tax).
   *
   * CRITICAL DIFFERENCE:
   * This creates a $140 tax difference on a $2,000 rebate (7% of $2,000).
   * Dealers should educate customers that manufacturer rebates provide
   * greater total savings than equivalent dealer discounts due to the tax
   * treatment difference.
   *
   * Source: Indiana DOR Sales Tax Information Bulletin #8; IC 6-6-5.1
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: false,
      notes:
        "Manufacturer rebates are NON-TAXABLE in Indiana. They reduce the selling price before " +
        "tax calculation, providing customer with tax savings. $2,000 rebate saves $140 in tax.",
    },
    {
      appliesTo: "DEALER",
      taxable: true,
      notes:
        "Dealer rebates/discounts ARE TAXABLE in Indiana. Tax calculated on pre-discount price. " +
        "Customer receives discount but no tax benefit. $2,000 dealer discount saves $0 in tax.",
    },
  ],

  /**
   * Doc Fee: TAXABLE ($250 statutory maximum)
   *
   * Indiana dealer documentation fees are SUBJECT to the 7% vehicle excise
   * tax AND are capped by statute.
   *
   * Statutory Cap (IC 6-6-5.5):
   * "A dealer may not charge a documentary service fee that exceeds two
   * hundred fifty dollars ($250)."
   *
   * This is one of the LOWEST caps in the United States:
   * - Indiana: $250 cap
   * - Florida: $150 cap (even lower)
   * - California: $85 cap (lowest)
   * - Compare to: Alabama (no cap), Colorado (no cap), Arizona (no cap)
   *
   * Taxability:
   * Doc fee is included in the taxable base for the vehicle excise tax:
   * - 7% state tax applies
   * - No local taxes to consider (state-only system)
   *
   * Official Guidance (Indiana DOR):
   * "Documentation fees charged by dealers are part of the gross retail
   * income from the sale and are subject to vehicle excise tax."
   *
   * Example:
   *   Doc Fee: $250 (maximum allowed)
   *   Tax on Doc Fee: $250 × 7% = $17.50
   *
   * Trade-In Interaction:
   * Doc fee is added to vehicle price BEFORE trade-in credit is applied:
   * Taxable Base = (Vehicle + Doc Fee + Accessories) - Trade-In
   *
   * Example:
   *   Vehicle: $25,000
   *   Doc Fee: $250
   *   Trade-In: $8,000
   *   Taxable Base: ($25,000 + $250) - $8,000 = $17,250
   *   Tax @ 7%: $17,250 × 7% = $1,207.50
   *
   * Enforcement:
   * The $250 cap is strictly enforced. Dealers charging more than $250
   * may face penalties from the Indiana Secretary of State.
   *
   * Source: IC 6-6-5.5; Indiana DOR Sales Tax Information Bulletin #8
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules
   *
   * Indiana has unique treatment of backend products that differs between
   * retail purchases and leases.
   *
   * SERVICE CONTRACTS (VSC):
   * - RETAIL: TAXABLE at 7%
   * - LEASE: NON-TAXABLE
   *
   * Indiana taxes service contracts on retail purchases but NOT on leases.
   * This creates a significant difference in total cost between purchasing
   * and leasing when backend products are included.
   *
   * Official Guidance (Indiana DOR):
   * "Service contracts sold in conjunction with a vehicle purchase are
   * subject to vehicle excise tax. However, service contracts included in
   * a lease agreement are not subject to tax."
   *
   * Example:
   *   $2,500 VSC on retail purchase:
   *   Tax: $2,500 × 7% = $175
   *
   *   $2,500 VSC on lease (capitalized):
   *   Tax: $0
   *
   * GAP INSURANCE:
   * - RETAIL: TAXABLE at 7%
   * - LEASE: NON-TAXABLE
   *
   * Same treatment as service contracts - taxable on retail, non-taxable
   * on leases.
   *
   * Example:
   *   $895 GAP on retail purchase:
   *   Tax: $895 × 7% = $62.65
   *
   *   $895 GAP on lease (capitalized):
   *   Tax: $0
   *
   * TITLE FEE:
   * - NOT taxable (government fee)
   * - Must be separately stated on invoice
   * - Current Indiana title fee: $15
   *
   * REGISTRATION FEES:
   * - NOT taxable (government fees)
   * - Various fees: excise tax (annual), registration, plates, etc.
   *
   * LIEN FEES:
   * - NOT taxable (government fees)
   *
   * IMPORTANT NOTE:
   * The retail vs. lease distinction for VSC and GAP is UNIQUE to Indiana
   * and a few other states. Most states treat these products consistently
   * across transaction types.
   *
   * This creates a tax planning opportunity: customers considering backend
   * products may save on total tax by leasing vs. purchasing if the products
   * would be capitalized in the lease.
   *
   * Source: Indiana DOR Sales Tax Information Bulletin #8; IC 6-6-5.1
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: true,
      notes:
        "Service contracts (VSC) ARE TAXABLE at 7% on retail purchases. NOTE: Non-taxable on " +
        "leases (see leaseRules.feeTaxRules). This retail vs. lease difference is unusual.",
    },
    {
      code: "GAP",
      taxable: true,
      notes:
        "GAP insurance IS TAXABLE at 7% on retail purchases. NOTE: Non-taxable on leases " +
        "(see leaseRules.feeTaxRules). This retail vs. lease difference is unusual.",
    },
    {
      code: "TITLE",
      taxable: false,
      notes:
        "Title fee ($15) is NOT taxable when separately stated on invoice (government fee).",
    },
    {
      code: "REG",
      taxable: false,
      notes: "Registration fees are NOT taxable (government fees).",
    },
    {
      code: "LIEN",
      taxable: false,
      notes: "Lien filing fees are NOT taxable (government fees).",
    },
  ],

  /**
   * Product Taxability
   *
   * Accessories: TAXABLE
   * - Dealer-installed accessories sold WITH vehicle: Taxed at 7%
   * - Included in taxable purchase price
   * - Subject to trade-in credit (added before trade-in applied)
   *
   * Negative Equity: TAXABLE
   * - Negative equity rolled into vehicle purchase IS subject to tax
   * - Represents additional consideration for the vehicle
   * - Added to purchase price before calculating tax
   *
   * Service Contracts: TAXABLE (on retail only)
   * - See feeTaxRules above for details
   * - Retail: taxable; Lease: non-taxable
   *
   * GAP: TAXABLE (on retail only)
   * - See feeTaxRules above for details
   * - Retail: taxable; Lease: non-taxable
   *
   * Example (Negative Equity on Retail):
   *   New Vehicle Price: $25,000
   *   Doc Fee: $250
   *   Trade-In Actual Value: $8,000
   *   Trade-In Payoff: $12,000
   *   Negative Equity: $4,000
   *
   *   Taxable Base: ($25,000 + $250 + $4,000) - $8,000 = $21,250
   *   Tax @ 7%: $21,250 × 7% = $1,487.50
   *
   * Example (Accessories):
   *   Vehicle: $28,000
   *   Accessories: $1,500 (running boards, remote start)
   *   Doc Fee: $250
   *   Trade-In: $9,000
   *
   *   Taxable Base: ($28,000 + $1,500 + $250) - $9,000 = $20,750
   *   Tax @ 7%: $20,750 × 7% = $1,452.50
   *
   * Source: Indiana DOR Sales Tax Information Bulletin #8
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: true,
  taxOnServiceContracts: true, // Retail only - see notes
  taxOnGap: true, // Retail only - see notes

  /**
   * Vehicle Tax Scheme: STATE_ONLY
   *
   * Indiana uses a FLAT 7% vehicle excise tax with NO local variations.
   * This makes Indiana one of the simplest states for tax calculation.
   *
   * State Vehicle Excise Tax: 7.0%
   * - Flat rate statewide
   * - Indiana Code Title 6, Article 6
   * - No county taxes
   * - No city/municipal taxes
   * - No special district taxes
   *
   * Uniform Rate Across State:
   * - Indianapolis: 7%
   * - Fort Wayne: 7%
   * - Evansville: 7%
   * - South Bend: 7%
   * - Carmel: 7%
   * - Bloomington: 7%
   * - EVERYWHERE: 7%
   *
   * Comparison to Other States:
   * Only a handful of states have completely uniform vehicle tax rates:
   * - Indiana: 7% everywhere
   * - Kentucky: 6% everywhere
   * - Maryland: 6% everywhere (with electric vehicle excise tax)
   * - Massachusetts: 6.25% everywhere
   * - Rhode Island: 7% everywhere
   *
   * Contrast with:
   * - Alabama: 2% state + 0.5%-8% local = 2.5%-10% combined
   * - Arizona: 5.6% state + local = 5.6%-11.2% combined
   * - Colorado: 2.9% state + local + RTD = 2.9%-15.9% combined
   *
   * Benefits of State-Only System:
   * 1. No jurisdiction lookup required
   * 2. Same rate regardless of dealer location or buyer residence
   * 3. Simplified compliance for dealers
   * 4. Predictable tax for customers
   * 5. No apportionment between state/local authorities
   *
   * Tax Collection:
   * - Dealers collect 7% at point of sale
   * - Remit to Indiana Department of Revenue
   * - No separate local tax reporting
   *
   * Source: IC 6-6-1.1; Indiana DOR
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
     * Indiana taxes vehicle leases on a MONTHLY basis. Tax is applied to
     * each monthly lease payment as it's made.
     *
     * Legal Framework (IC 6-6-5.1):
     * "The vehicle excise tax is imposed on the total amount of lease
     * payments due under a lease agreement. The tax is collected monthly
     * as each payment becomes due."
     *
     * State Rate: 7%
     * - Same 7% rate as retail sales
     * - No local add-ons
     * - Applied to monthly payment amount
     *
     * What is Taxed:
     * Monthly:
     * - Base monthly lease payment × 7%
     * - Tax collected each month with payment
     *
     * Upfront (at signing):
     * - Doc fee × 7% (taxed once upfront)
     * - First month's payment × 7% (if paid upfront)
     *
     * What is NOT Taxed:
     * - Capitalized cost reductions (down payment, rebates, trade equity)
     * - Service contracts (VSC) - NON-taxable on leases
     * - GAP insurance - NON-taxable on leases
     * - Refundable security deposit
     * - Title and registration fees
     *
     * Example (36-month lease):
     *   Monthly Payment: $450
     *   Doc Fee: $250
     *
     *   Due at Signing:
     *     First Payment: $450
     *     Doc Fee: $250
     *     Tax on First Payment: $450 × 7% = $31.50
     *     Tax on Doc Fee: $250 × 7% = $17.50
     *     Total Due: $450 + $250 + $31.50 + $17.50 = $749
     *
     *   Monthly Payments (Months 2-36):
     *     Payment: $450
     *     Tax: $450 × 7% = $31.50
     *     Total Monthly: $481.50
     *
     *   Total Tax Over Lease:
     *     Upfront: $49 (first payment + doc fee)
     *     Monthly: $31.50 × 35 = $1,102.50
     *     Total: $1,151.50
     *
     * Comparison to Other States:
     * - Monthly taxation: IN, TX, CA, NY, FL
     * - Upfront taxation: IL, NC, SC
     * - Hybrid (upfront + monthly): AL, CO
     *
     * Source: IC 6-6-5.1; Indiana DOR Information Bulletin #8
     */
    method: "MONTHLY",

    /**
     * Cap Cost Reduction: NOT TAXED
     *
     * Indiana does NOT tax capitalized cost reductions on leases.
     * This is a key difference from some other states.
     *
     * Official Guidance (Indiana DOR):
     * "Capitalized cost reductions, including cash down payments, rebates,
     * and trade-in equity, are not subject to vehicle excise tax. Tax is
     * imposed only on the monthly lease payment amounts."
     *
     * What is NOT Taxable:
     * - Cash down payments
     * - Manufacturer rebates applied as cap reduction
     * - Trade-in equity (customer owns vehicle)
     * - Dealer discounts applied as cap reduction
     *
     * Effect on Tax:
     * Cap cost reductions REDUCE the monthly payment, which REDUCES the
     * monthly tax, but the cap reduction itself is not taxed upfront.
     *
     * Example:
     *   Without Cap Reduction:
     *     Gross Cap Cost: $35,000
     *     Monthly Payment: $550
     *     Monthly Tax: $550 × 7% = $38.50
     *
     *   With $10,000 Cap Reduction:
     *     Gross Cap Cost: $35,000
     *     Cap Reduction: $10,000 (cash + trade)
     *     Adjusted Cap Cost: $25,000
     *     Monthly Payment: $400
     *     Monthly Tax: $400 × 7% = $28
     *     Tax NOT charged on $10,000 cap reduction
     *
     * Tax Savings:
     * Monthly: $38.50 - $28 = $10.50/month
     * Over 36 months: $10.50 × 36 = $378
     *
     * Contrast with States That Tax Cap Reduction:
     * - Alabama: Cap reduction taxed at 1.5% upfront
     *   ($10,000 × 1.5% = $150 upfront tax)
     * - Colorado: Cap reduction taxed at full rate upfront
     *   ($10,000 × 8.71% = $871 upfront tax)
     *
     * Indiana's approach provides significant tax savings on leases with
     * large cap cost reductions.
     *
     * Source: IC 6-6-5.1; Indiana DOR Information Bulletin #8
     */
    taxCapReduction: false,

    /**
     * Rebate Behavior on Leases: FOLLOW_RETAIL_RULE
     *
     * Manufacturer and dealer rebates on leases follow the same taxability
     * rules as retail transactions, but with a key difference: they're
     * applied as cap cost reductions.
     *
     * Since cap cost reductions are NOT taxed on Indiana leases, rebates
     * effectively receive non-taxable treatment when applied to leases.
     *
     * Manufacturer Rebates:
     * - Applied as cap cost reduction
     * - Reduce adjusted cap cost
     * - Lower monthly payment
     * - No upfront tax on rebate amount
     * - Monthly tax reduced due to lower payment
     *
     * Dealer Rebates:
     * - Applied as cap cost reduction
     * - Same effect as manufacturer rebates on leases
     *
     * Example:
     *   Gross Cap Cost: $35,000
     *   Manufacturer Rebate: $3,000
     *   Adjusted Cap Cost: $32,000
     *   Rebate Tax: $0 (no upfront tax on cap reduction)
     *
     * This is different from retail where manufacturer rebates reduce
     * the tax base but dealer rebates don't. On leases, BOTH types of
     * rebates reduce the cap cost and therefore the monthly payment,
     * and neither is directly taxed.
     *
     * Source: Indiana DOR Information Bulletin #8
     */
    rebateBehavior: "FOLLOW_RETAIL_RULE",

    /**
     * Doc Fee on Leases: ALWAYS taxable
     *
     * Dealer documentation fees on leases are TAXABLE in Indiana and are
     * subject to the same $250 statutory cap as retail transactions.
     *
     * Statutory Cap (IC 6-6-5.5):
     * $250 maximum (same as retail)
     *
     * Tax Treatment:
     * - Doc fee taxed upfront at lease inception
     * - Not spread across monthly payments
     * - Taxed at 7% rate
     *
     * Example:
     *   Doc Fee: $250 (maximum)
     *   Tax: $250 × 7% = $17.50 (due at signing)
     *
     * Due at Signing Calculation:
     *   First Payment: $450
     *   Doc Fee: $250
     *   Down Payment: $3,000 (not taxed)
     *   Tax on First Payment: $31.50
     *   Tax on Doc Fee: $17.50
     *   Total Due: $450 + $250 + $3,000 + $31.50 + $17.50 = $3,749
     *
     * Source: IC 6-6-5.5; Indiana DOR
     */
    docFeeTaxability: "ALWAYS",

    /**
     * Trade-in Credit on Leases: FULL
     *
     * Indiana provides FULL trade-in credit on leases. Trade-in value is
     * applied as a capitalized cost reduction.
     *
     * Since Indiana does NOT tax cap cost reductions on leases, the trade-in
     * equity is NOT taxed. It reduces the adjusted cap cost, which lowers
     * the monthly payment and therefore lowers the monthly tax.
     *
     * Official Guidance (Indiana DOR):
     * "Trade-in allowances on leases are treated as capitalized cost
     * reductions and are not subject to vehicle excise tax. The trade-in
     * value reduces the capitalized cost, resulting in lower monthly
     * payments and lower monthly tax."
     *
     * Requirements:
     * - Customer must OWN the vehicle being traded
     * - Trade-in transferred to dealer
     * - Trade-in value separately stated
     *
     * Example:
     *   Gross Cap Cost: $35,000
     *   Trade-In Value: $8,000 (customer owns)
     *   Adjusted Cap Cost: $27,000
     *
     *   Without Trade-In:
     *     Monthly Payment: $550
     *     Monthly Tax: $550 × 7% = $38.50
     *
     *   With Trade-In:
     *     Monthly Payment: $450
     *     Monthly Tax: $450 × 7% = $31.50
     *
     *   Tax Savings:
     *     Monthly: $7/month
     *     Over 36 months: $252
     *     NO upfront tax on $8,000 trade-in
     *
     * Contrast with Alabama:
     * - Alabama: Trade-in equity TAXED as cap reduction
     *   ($8,000 × 1.5% = $120 upfront tax)
     * - Indiana: Trade-in equity NOT taxed
     *   ($0 upfront tax)
     *
     * This makes Indiana leases more favorable when trading in a vehicle.
     *
     * Source: IC 6-6-5.1-27; Indiana DOR Information Bulletin #8
     */
    tradeInCredit: "FULL",

    /**
     * Negative Equity on Leases: TAXABLE
     *
     * Negative equity rolled into a lease IS subject to tax in Indiana.
     *
     * Treatment:
     * - Negative equity increases the capitalized cost
     * - Higher cap cost = higher monthly payment
     * - Higher monthly payment = higher monthly tax
     * - Tax is NOT charged upfront on the negative equity itself
     * - Tax is charged monthly on the resulting higher payment
     *
     * Example:
     *   Base Cap Cost: $30,000
     *   Trade-In Value: $10,000
     *   Trade-In Payoff: $14,000
     *   Negative Equity: $4,000
     *
     *   Adjusted Cap Cost: $34,000 (includes negative equity)
     *
     *   Without Negative Equity:
     *     Cap Cost: $30,000
     *     Monthly Payment: $475
     *     Monthly Tax: $475 × 7% = $33.25
     *
     *   With Negative Equity:
     *     Cap Cost: $34,000
     *     Monthly Payment: $540
     *     Monthly Tax: $540 × 7% = $37.80
     *
     *   Additional Monthly Tax: $4.55/month
     *   Over 36 months: $163.80 additional tax
     *
     * The negative equity is effectively taxed through the higher monthly
     * payment, even though there's no upfront tax on the cap cost.
     *
     * Comparison to Retail:
     * On retail, negative equity is added to purchase price and taxed
     * upfront: $4,000 × 7% = $280 upfront tax.
     *
     * On lease, negative equity increases monthly payments, resulting in
     * $163.80 total tax over 36 months.
     *
     * Source: Indiana DOR Information Bulletin #8
     */
    negativeEquityTaxable: true,

    /**
     * Fee Taxability on Leases
     *
     * CRITICAL DIFFERENCE FROM RETAIL:
     * Service contracts (VSC) and GAP insurance are NON-TAXABLE on leases
     * but ARE taxable on retail purchases.
     *
     * SERVICE CONTRACTS (VSC):
     * - NOT taxable on leases
     * - If capitalized into lease: no tax impact
     * - If paid separately: not subject to tax
     *
     * GAP INSURANCE:
     * - NOT taxable on leases
     * - If capitalized into lease: no tax impact
     * - If paid separately: not subject to tax
     *
     * Example (VSC on Lease):
     *   VSC Cost: $2,500 (capitalized)
     *   Tax on VSC: $0
     *
     *   Compare to Retail:
     *   VSC Cost: $2,500
     *   Tax on VSC: $2,500 × 7% = $175
     *
     * TAX PLANNING OPPORTUNITY:
     * Customers purchasing VSC and GAP can save $237.65 in tax by leasing
     * instead of purchasing (on $2,500 VSC + $895 GAP).
     *
     * DOC FEE:
     * - TAXABLE on leases (see docFeeTaxability above)
     *
     * TITLE/REGISTRATION:
     * - NOT taxable (government fees)
     *
     * Source: Indiana DOR Information Bulletin #8
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: true,
        notes:
          "Doc fee TAXABLE on leases ($250 cap). Taxed upfront at inception (7% = $17.50 max).",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: false,
        notes:
          "Service contracts (VSC) are NON-TAXABLE on leases. This is different from retail " +
          "where they ARE taxable. Significant tax planning opportunity.",
      },
      {
        code: "GAP",
        taxable: false,
        notes:
          "GAP insurance is NON-TAXABLE on leases. This is different from retail where it IS " +
          "taxable. Customers can save 7% tax by leasing if purchasing GAP.",
      },
      {
        code: "TITLE",
        taxable: false,
        notes: "Title fee ($15) is NOT taxable on leases.",
      },
      {
        code: "REG",
        taxable: false,
        notes: "Registration fees are NOT taxable on leases.",
      },
    ],

    /**
     * Title Fee Rules on Leases
     *
     * Title and registration fees on leases:
     * - Not taxable
     * - Typically included in cap cost or paid upfront
     * - Not included in monthly payment calculation
     */
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

    /**
     * Tax Fees Upfront: TRUE
     *
     * Taxable fees on leases (doc fee) are taxed upfront at lease inception,
     * not spread across monthly payments.
     */
    taxFeesUpfront: true,

    /**
     * Special Scheme: NONE
     *
     * Indiana uses standard monthly lease taxation with no special schemes
     * or alternative calculation methods.
     */
    specialScheme: "NONE",

    notes:
      "Indiana lease taxation: MONTHLY method - tax applied to each monthly payment at 7% rate. " +
      "Cap cost reductions (cash, rebates, trade-in) are NOT taxed. Doc fee taxed upfront ($250 cap). " +
      "CRITICAL: Service contracts and GAP are NON-TAXABLE on leases (but taxable on retail), creating " +
      "tax planning opportunities. Trade-in provides full credit without tax. Negative equity increases " +
      "monthly payment and therefore monthly tax. Simple 7% flat rate applies statewide.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: FULL CREDIT (credit for taxes paid to other states, capped at 7%)
   *
   * Indiana provides reciprocal credit for vehicle excise taxes paid to
   * other states.
   *
   * Official Guidance (Indiana DOR):
   * "Indiana allows a credit for sales or use taxes legally imposed and
   * paid to another state. The credit is limited to the amount of Indiana
   * vehicle excise tax that would be due on the transaction."
   *
   * How It Works:
   * IN Tax Owed = (7% × Purchase Price) - Other State Tax Paid
   * Credit capped at Indiana's 7% tax amount
   *
   * Scenario 1: Other State Tax > Indiana Tax
   * If sales/use tax paid to another state exceeds Indiana's 7%, no
   * additional Indiana tax is due. Credit is capped at 7%.
   *
   * Example:
   *   Vehicle Price: $30,000
   *   Illinois Tax Paid: $2,250 (7.5%)
   *   Indiana Tax Would Be: $30,000 × 7% = $2,100
   *   Credit Allowed: $2,100 (capped at IN tax)
   *   Additional IN Tax Due: $0
   *
   * Scenario 2: Other State Tax < Indiana Tax
   * If tax paid to another state is less than Indiana's 7%, pay the
   * DIFFERENCE to Indiana.
   *
   * Example:
   *   Vehicle Price: $30,000
   *   Montana Tax Paid: $0 (no sales tax)
   *   Indiana Tax Due: $30,000 × 7% = $2,100
   *   Credit Allowed: $0
   *   Additional IN Tax Due: $2,100
   *
   * Scenario 3: Other State Tax Between 0% and 7%
   * Example:
   *   Vehicle Price: $25,000
   *   Kentucky Tax Paid: $1,500 (6%)
   *   Indiana Tax Would Be: $25,000 × 7% = $1,750
   *   Credit Allowed: $1,500
   *   Additional IN Tax Due: $250
   *
   * Documentation Required:
   * - Bill of sale showing vehicle purchase price
   * - Receipt or documentation showing taxes paid to other state
   * - Proof that tax was legally imposed (not voluntary payment)
   * - Original documents or certified copies
   *
   * Timing:
   * - Credit claimed when registering vehicle in Indiana
   * - Documentation submitted to BMV (Bureau of Motor Vehicles)
   * - Credit verified before Indiana tax assessed
   *
   * Scope:
   * - Applies to both retail purchases and leases
   * - No lease exceptions
   * - Same credit rules for all vehicle types
   *
   * Important Notes:
   * - Credit is for taxes PAID, not taxes DUE
   * - Must provide proof of actual payment
   * - No credit for taxes waived or exempted in other state
   * - No refund if other state tax exceeds Indiana tax
   *
   * New Residents:
   * Indiana residents moving from another state may be exempt from vehicle
   * excise tax if:
   * - Vehicle was owned and registered in prior state
   * - Registration was current before establishing IN residency
   * - Vehicle brought into Indiana within reasonable time of moving
   *
   * Source: IC 6-6-5.1-23; Indiana DOR Information Bulletin #8
   */
  reciprocity: {
    enabled: true,
    scope: "BOTH", // Applies to retail and lease
    homeStateBehavior: "CREDIT_UP_TO_STATE_RATE",
    requireProofOfTaxPaid: true,
    basis: "TAX_PAID",
    capAtThisStatesTax: true,
    hasLeaseException: false,
    notes:
      "Indiana provides FULL reciprocal credit for vehicle taxes paid to other states, capped at " +
      "Indiana's 7% rate. Credit applies to both retail and lease. Proof of payment required (bill of " +
      "sale, receipt showing tax paid). If other state charged more than 7%, no additional IN tax due. " +
      "If other state charged less than 7%, pay difference to Indiana. Claim credit when registering " +
      "vehicle with BMV.",
  },

  // ============================================================================
  // ADDITIONAL METADATA
  // ============================================================================

  extras: {
    lastUpdated: "2025-11-14",
    sources: [
      "Indiana Department of Revenue (dor.in.gov)",
      "Indiana Code Title 6, Article 6 - Vehicle Excise Tax",
      "IC 6-6-1.1-101 through 6-6-1.1-801 - Vehicle Excise Tax Act",
      "IC 6-6-5.5 - Dealer Documentation Fee Cap ($250)",
      "IC 6-6-5.1-27 - Trade-in Exemption",
      "IC 6-6-5.1-23 - Reciprocity Credit",
      "Indiana Administrative Code (IAC) 45 IAC 2.2 - Sales Tax",
      "Indiana DOR Sales Tax Information Bulletin #8 - Motor Vehicles",
      "Indiana BMV (Bureau of Motor Vehicles) - bmv.in.gov",
    ],
    notes:
      "Indiana uses a FLAT 7% vehicle excise tax with NO local variations, making it one of the " +
      "simplest states for tax calculation. UNIQUE FEATURES: (1) Backend products (VSC, GAP) taxable " +
      "on retail but NON-taxable on leases - creates tax planning opportunities. (2) Manufacturer rebates " +
      "reduce tax base; dealer rebates do not. (3) Doc fee capped at $250 statutory maximum (among lowest " +
      "in nation). (4) Monthly lease taxation with no tax on cap reductions. (5) Full trade-in credit on " +
      "both retail and leases. (6) Reciprocity credit for other state taxes, capped at 7%.",
    flatVehicleTaxRate: 0.07,
    description:
      "Indiana uses a flat 7% vehicle excise tax with no local additions",
    docFeeCapAmount: 250,
    docFeeLegalCitation: "IC 6-6-5.5",
    tradeInCreditCitation: "IC 6-6-5.1-27",
    reciprocityCitation: "IC 6-6-5.1-23",
    titleFee: 15.0,
    uniqueFeatures: [
      "Flat 7% statewide rate - no local variations",
      "Backend products (VSC, GAP) taxable on retail, non-taxable on leases",
      "Manufacturer rebates reduce tax base; dealer rebates do not",
      "$250 statutory cap on dealer doc fees (IC 6-6-5.5)",
      "Monthly lease taxation with no cap reduction tax",
      "Full trade-in credit on both retail and leases",
      "Reciprocity credit capped at Indiana's 7% rate",
    ],
    complianceNotes: [
      "Doc fee cannot exceed $250 per IC 6-6-5.5",
      "Must separately state title and registration fees to avoid taxation",
      "Proof of other state tax payment required for reciprocity credit",
      "VSC and GAP treatment differs between retail (taxable) and lease (non-taxable)",
      "Manufacturer rebates reduce tax; dealer rebates do not",
    ],
    taxPlanningOpportunities: [
      "Customers with large backend product purchases may save tax by leasing",
      "VSC + GAP on $30k vehicle: Retail = $237.65 tax; Lease = $0 tax",
      "Manufacturer rebates provide 7% tax savings; dealer discounts do not",
      "$2,000 mfr rebate saves $140 in tax vs. $2,000 dealer discount",
      "Trade-ins provide full credit on both retail and leases",
    ],
  },
};

export default US_IN;
