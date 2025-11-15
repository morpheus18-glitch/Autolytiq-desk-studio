import { TaxRulesConfig } from "../types";

/**
 * RHODE ISLAND TAX RULES
 *
 * Researched: 2025-11-14
 * Version: 1
 *
 * KEY FACTS:
 * - State sales tax: 7% (flat rate, NO local taxes)
 * - Trade-in credit: FULL deduction from taxable base
 * - Manufacturer rebates: NOT taxable (reduce tax base)
 * - Dealer rebates: NOT taxable (reduce selling price)
 * - Doc fee: TAXABLE, capped at $599
 * - Service contracts (VSC): NOT taxable
 * - GAP insurance: NOT taxable
 * - Lease taxation: MONTHLY payment taxation at 7%
 * - Reciprocity: Credit for taxes paid to other states
 * - Title fee: $52.50 (not taxable when separately stated)
 * - Registration fee: Varies by vehicle weight
 *
 * UNIQUE RHODE ISLAND FEATURES:
 * 1. FLAT 7% SALES TAX:
 *    - Rhode Island has a single 7% sales tax rate
 *    - NO local or municipal sales taxes
 *    - Same rate applies statewide (Providence, Newport, Warwick, etc.)
 *    - Simplifies tax calculation (no jurisdictional lookups needed)
 *
 * 2. DOC FEE CAP: $599
 *    - Rhode Island caps dealer documentation fees at $599
 *    - One of the highest caps among states that regulate doc fees
 *    - Doc fees are subject to 7% sales tax
 *
 * 3. SERVICE CONTRACTS AND GAP NOT TAXABLE:
 *    - VSC (extended warranties) are NOT taxed
 *    - GAP insurance is NOT taxed
 *    - Standard treatment (unlike NM which taxes these products)
 *
 * 4. MANUFACTURER REBATES NON-TAXABLE:
 *    - Manufacturer rebates reduce the taxable base
 *    - Customer pays tax on net price after rebate
 *    - Standard favorable treatment
 *
 * 5. LEASE TAXATION - MONTHLY AT 7%:
 *    - Sales tax applies to each monthly lease payment
 *    - 7% rate (same as retail sales tax)
 *    - No upfront tax on cap cost reductions
 *    - Trade-ins reduce cap cost, lowering monthly payment
 *
 * 6. RECIPROCITY:
 *    - RI provides credit for sales tax paid to other states
 *    - Credit capped at RI's 7% rate
 *    - Proof of payment required
 *
 * 7. REGISTRATION FEE STRUCTURE:
 *    - Based on vehicle weight, not value
 *    - Passenger vehicles (up to 4,500 lbs): $52/2 years
 *    - Heavier vehicles: Higher fees based on weight brackets
 *    - Title fee: $52.50
 *
 * TAX CALCULATION FORMULA (RETAIL):
 * Taxable Base = Vehicle Price + Accessories + Doc Fee - Trade-In - Rebates
 * Sales Tax = Taxable Base × 7%
 * (VSC, GAP, Title fee NOT included when separately stated)
 *
 * Example:
 * $30,000 vehicle + $599 doc fee + $1,500 VSC + $695 GAP - $10,000 trade-in
 * Taxable Base: $30,000 + $599 - $10,000 = $20,599
 * Sales Tax: $20,599 × 7% = $1,441.93
 * (VSC and GAP NOT taxed, added separately: $2,195)
 *
 * LEASE CALCULATION (MONTHLY):
 * Monthly Sales Tax = Monthly Payment × 7%
 * Total Lease Tax = Monthly Tax × Number of Payments
 *
 * Example (36-month lease):
 * Monthly Payment: $450
 * Monthly Sales Tax: $450 × 7% = $31.50
 * Total Tax Over Lease: $31.50 × 36 = $1,134
 *
 * SOURCES:
 * - Rhode Island Division of Taxation - tax.ri.gov
 * - RI General Laws (RIGL) Title 44, Chapter 18 (Sales and Use Taxes)
 * - RIGL § 44-18-10: Exemptions from sales and use tax
 * - RIGL § 44-18-20: Rate of tax
 * - Rhode Island Division of Motor Vehicles - dmv.ri.gov
 * - RI DMV: Fee Schedule
 * - National Conference of State Legislatures (NCSL) - State Tax Data
 */
export const US_RI: TaxRulesConfig = {
  stateCode: "RI",
  version: 1,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL
   *
   * Rhode Island allows full trade-in credit. The trade-in value is deducted
   * from the purchase price before calculating sales tax.
   *
   * Legal Framework (RIGL § 44-18-10):
   * Trade-in allowances on motor vehicles are deducted from the purchase
   * price for sales tax purposes.
   *
   * Treatment:
   * Trade-in value reduces the taxable base.
   *
   * Example:
   *   Vehicle Price: $30,000
   *   Trade-In Value: $10,000
   *   Taxable Base: $20,000
   *   Sales Tax (7%): $1,400
   *
   * This is standard treatment and provides significant tax savings.
   *
   * Source: RIGL § 44-18-10; RI Division of Taxation guidance
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules: Both manufacturer and dealer rebates are NON-TAXABLE
   *
   * Rhode Island allows manufacturer and dealer rebates to reduce the
   * taxable amount.
   *
   * MANUFACTURER REBATES:
   * - Rebates reduce the selling price
   * - Sales tax calculated on net price after rebate
   * - Standard treatment
   *
   * Example:
   *   MSRP: $25,000
   *   Manufacturer Rebate: $2,000
   *   Net Price: $23,000
   *   Taxable Base: $23,000 (NOT $25,000)
   *   Sales Tax (7%): $1,610
   *
   * DEALER REBATES:
   * - Same treatment as manufacturer rebates
   * - Reduce the taxable selling price
   *
   * This is favorable to buyers and is the standard approach in most states.
   *
   * Source: RIGL § 44-18-10; RI Division of Taxation
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: false,
      notes:
        "Manufacturer rebates reduce the taxable amount. Sales tax calculated on net price " +
        "after rebate deduction.",
    },
    {
      appliesTo: "DEALER",
      taxable: false,
      notes:
        "Dealer rebates/incentives reduce the taxable selling price. Tax on actual price " +
        "charged to customer.",
    },
  ],

  /**
   * Doc Fee: TAXABLE, CAPPED AT $599
   *
   * Documentation fees are subject to sales tax in Rhode Island and are
   * capped at $599.
   *
   * Statutory Cap:
   * Rhode Island law caps dealer documentation fees at $599.
   * - Maximum allowed: $599
   * - One of the highest caps among regulated states
   * - Taxable at 7% sales tax rate
   *
   * Example:
   *   Doc Fee: $599 (maximum)
   *   Sales Tax (7%): $41.93
   *   Total Cost: $640.93
   *
   * Comparison:
   * - California: $85 cap
   * - Florida: $150 cap (dealer can exceed with disclosure)
   * - Rhode Island: $599 cap (relatively high)
   *
   * Source: RI General Laws; RI Division of Taxation
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules
   *
   * Rhode Island follows standard treatment for most backend products.
   *
   * SERVICE CONTRACTS (VSC):
   * - NOT subject to sales tax
   * - Treated as exempt service/insurance product
   * - Standard treatment
   *
   * GAP INSURANCE:
   * - NOT subject to sales tax
   * - Insurance product exempt from sales tax
   * - Standard treatment
   *
   * TITLE FEE:
   * - $52.50 flat fee
   * - NOT taxable when separately stated
   *
   * REGISTRATION FEES:
   * - NOT taxable (government fees)
   * - Based on vehicle weight
   * - Passenger vehicles (up to 4,500 lbs): $52 for 2 years
   *
   * Example:
   *   VSC: $1,500
   *   GAP: $695
   *   Total Backend: $2,195
   *   Sales Tax: $0 (VSC and GAP not taxed)
   *   Total Cost: $2,195
   *
   * Source: RIGL § 44-18-10; RI DMV Fee Schedule
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: false,
      notes:
        "Service contracts (VSC) are NOT subject to sales tax in Rhode Island. Treated as " +
        "exempt service product.",
    },
    {
      code: "GAP",
      taxable: false,
      notes:
        "GAP insurance is NOT taxable in Rhode Island. Insurance product exempt from sales tax.",
    },
    {
      code: "DOC_FEE",
      taxable: true,
      notes:
        "Doc fees are TAXABLE at 7% sales tax rate. Capped at $599 maximum.",
    },
    {
      code: "TITLE",
      taxable: false,
      notes:
        "Title fee ($52.50) is NOT taxable when separately stated on invoice.",
    },
    {
      code: "REG",
      taxable: false,
      notes: "Registration fees are NOT taxable (government fees, based on weight).",
    },
  ],

  /**
   * Product Taxability
   *
   * Rhode Island follows standard treatment for most products.
   *
   * Accessories: TAXABLE (standard)
   * Negative Equity: TAXABLE when rolled into purchase price
   * Service Contracts: NOT taxable (standard)
   * GAP: NOT taxable (standard)
   *
   * Example:
   *   Vehicle: $30,000
   *   Accessories: $2,000
   *   VSC: $1,500 (not taxed)
   *   GAP: $695 (not taxed)
   *   Taxable Base: $32,000
   *   Sales Tax (7%): $2,240
   *   Total Cost: $34,435 (includes non-taxed VSC + GAP)
   *
   * Source: RIGL § 44-18-10
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: true,
  taxOnServiceContracts: false,
  taxOnGap: false,

  /**
   * Vehicle Tax Scheme: STATE_ONLY
   *
   * Rhode Island has a flat 7% state sales tax with NO local taxes.
   *
   * State Sales Tax: 7%
   * - Single rate applies statewide
   * - No county or municipal sales taxes
   * - Same rate in Providence, Newport, Warwick, Cranston, etc.
   *
   * Simplicity:
   * RI's lack of local taxes makes tax calculation straightforward:
   * - No jurisdictional lookups needed
   * - No combined rate calculations
   * - Same 7% rate everywhere in the state
   *
   * Comparison to Neighbors:
   * - Massachusetts: 6.25% (no local taxes)
   * - Connecticut: 6.35% (no local taxes)
   * - Rhode Island: 7% (highest among New England states with flat rates)
   *
   * Tax Collection Point:
   * Even though there are no local taxes, the sale location doesn't affect
   * the rate (always 7% statewide).
   *
   * Source: RIGL § 44-18-20
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
     * Rhode Island applies sales tax to each monthly lease payment at the
     * standard 7% rate.
     *
     * Legal Framework:
     * Leasing of motor vehicles is subject to sales tax on the lease
     * payments.
     *
     * Tax Application:
     * - Monthly payments are taxed as they are made
     * - No upfront tax on cap cost reductions
     * - Trade-in reduces cap cost, lowering monthly payment
     *
     * Example:
     *   Monthly Payment: $450
     *   Sales Tax (7%): $31.50
     *   Total Monthly: $481.50
     *
     *   Over 36 months:
     *   Base Payments: $16,200
     *   Total Tax: $1,134
     *   Grand Total: $17,334
     *
     * Source: RIGL § 44-18-20; RI Division of Taxation
     */
    method: "MONTHLY",

    /**
     * Cap Cost Reduction: Not taxed upfront (monthly method)
     *
     * Since RI uses monthly taxation, cap cost reductions are not taxed
     * upfront. They reduce the capitalized cost, which lowers the monthly
     * payment and thus the tax collected monthly.
     *
     * Treatment:
     * - Cash down: Reduces cap cost, lowers monthly payment
     * - Rebates: Same effect
     * - Trade-in: Same effect
     * - Cap reductions indirectly reduce total tax by lowering payments
     *
     * Example:
     *   Gross Cap Cost: $35,000
     *   Cap Reduction: $5,000
     *   Adjusted Cap Cost: $30,000
     *   Monthly Payment (lower due to cap reduction): $410 vs $475
     *   Tax Savings: ($475 - $410) × 7% × 36 = $163.80
     *
     * Source: RIGL § 44-18-20
     */
    taxCapReduction: false,

    /**
     * Rebate Behavior on Leases: FOLLOW_RETAIL_RULE
     *
     * Manufacturer rebates on leases reduce the capitalized cost and are
     * not directly taxed. They lower monthly payments, indirectly reducing
     * the total sales tax paid over the lease term.
     *
     * Treatment:
     * - Rebates reduce gross cap cost
     * - Lower monthly payment
     * - Tax benefit realized through lower monthly sales tax
     *
     * Source: RIGL § 44-18-20
     */
    rebateBehavior: "FOLLOW_RETAIL_RULE",

    /**
     * Doc Fee on Leases: FOLLOW_RETAIL_RULE (taxable)
     *
     * Doc fees on leases are taxable in Rhode Island, following the same
     * rules as retail sales.
     *
     * Treatment:
     * - If paid upfront: Taxed at 7% sales tax rate
     * - If capitalized: Increases monthly payment, taxed monthly
     *
     * Most Common:
     * Doc fee paid upfront at signing and taxed immediately.
     *
     * Example:
     *   Doc Fee: $599 (maximum)
     *   Sales Tax (7%): $41.93
     *   Total: $640.93
     *
     * Source: RIGL § 44-18-20
     */
    docFeeTaxability: "FOLLOW_RETAIL_RULE",

    /**
     * Trade-in Credit on Leases: FULL
     *
     * Trade-ins on leases receive full credit in Rhode Island, reducing the
     * capitalized cost and thus lowering monthly payments and tax.
     *
     * Treatment:
     * - Trade-in reduces gross cap cost
     * - Lowers monthly payment
     * - Reduces total sales tax paid over lease term
     *
     * Example:
     *   Gross Cap Cost: $40,000
     *   Trade-In: $10,000
     *   Adjusted Cap Cost: $30,000
     *   Monthly Payment Impact: ~$300 reduction
     *   Tax Savings: $300 × 7% × 36 = $756
     *
     * Source: RIGL § 44-18-10
     */
    tradeInCredit: "FULL",

    /**
     * Negative Equity on Leases: Taxable (increases payments)
     *
     * Negative equity rolled into a lease increases the capitalized cost,
     * raising monthly payments and thus the sales tax paid each month.
     *
     * Example:
     *   Base Cap Cost: $30,000
     *   Negative Equity: $3,000
     *   Adjusted Cap Cost: $33,000
     *   Payment Increase: ~$90/month
     *   Additional Tax: $90 × 7% × 36 = $226.80
     *
     * Source: RIGL § 44-18-20
     */
    negativeEquityTaxable: true,

    /**
     * Fee Taxability on Leases
     *
     * Backend products on leases follow same rules as retail in RI:
     * VSC and GAP are NOT taxable.
     *
     * SERVICE CONTRACTS (VSC):
     * - NOT taxable on leases (same as retail)
     * - If capitalized: Does NOT increase monthly tax
     * - Adds to monthly payment but payment portion for VSC not taxed
     *
     * GAP INSURANCE:
     * - NOT taxable on leases (same as retail)
     * - Same treatment as VSC
     *
     * Source: RIGL § 44-18-10
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: true,
        notes: "Doc fee TAXABLE on leases (typically paid upfront, taxed at 7%)",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: false,
        notes:
          "Service contracts NOT taxable on leases (same as retail). If capitalized, does NOT " +
          "increase monthly tax.",
      },
      {
        code: "GAP",
        taxable: false,
        notes: "GAP NOT taxable on leases (same as retail).",
      },
      {
        code: "TITLE",
        taxable: false,
        notes: "Title fee NOT taxable when separately stated",
      },
      {
        code: "REG",
        taxable: false,
        notes: "Registration fees NOT taxable",
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
      "Rhode Island: MONTHLY lease taxation at 7% (same as retail sales tax). Tax applies to " +
      "each monthly payment. Cap reductions not taxed upfront but reduce monthly payment " +
      "(indirect tax benefit). Trade-in gets full credit (reduces cap cost). VSC and GAP are " +
      "NOT taxable when capitalized into lease (standard treatment). Doc fee taxable, capped " +
      "at $599.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: Credit for taxes paid to other states
   *
   * Rhode Island provides credit for sales tax paid to other states.
   *
   * Legal Framework (RIGL § 44-18-10):
   * Rhode Island allows credit for sales or use tax paid to another state
   * on the same property, up to the amount of RI tax that would be due.
   *
   * How It Works:
   *
   * Scenario 1: RI Resident Purchasing Out-of-State
   * - If tax paid to another state
   * - RI provides credit against RI use tax
   * - Credit capped at RI's 7% rate
   *
   * Scenario 2: Out-of-State Buyer
   * - If buyer will register in another state
   * - May be eligible for exemption or reduced RI tax
   * - Buyer pays tax in home state upon registration
   *
   * Documentation Required:
   * - Proof of tax paid in other state
   * - Receipt or invoice showing amount paid
   * - Evidence of legal imposition of tax
   *
   * Example (RI resident purchasing in Massachusetts):
   *   Vehicle: $30,000
   *   MA Tax Paid: 6.25% = $1,875
   *   RI Use Tax Due: 7% = $2,100
   *   Credit for MA Tax: $1,875
   *   Additional RI Tax: $225
   *
   * Example (RI resident purchasing in Connecticut):
   *   Vehicle: $30,000
   *   CT Tax Paid: 6.35% = $1,905
   *   RI Use Tax Due: 7% = $2,100
   *   Credit for CT Tax: $1,905
   *   Additional RI Tax: $195
   *
   * Example (CT resident purchasing in RI):
   *   Vehicle: $30,000
   *   RI Tax: May be exempt or reduced
   *   CT Tax upon registration: 6.35% = $1,905
   *
   * Source: RIGL § 44-18-10; RI Division of Taxation guidance
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
      "RI provides credit for sales/use taxes paid to other states, capped at RI's 7% rate. " +
      "RI residents purchasing out-of-state receive credit for tax paid, with any difference " +
      "due to RI. Out-of-state buyers may be eligible for exemption or reduced tax. Proof of " +
      "payment required.",
  },

  extras: {
    lastUpdated: "2025-11-14",
    sources: [
      "Rhode Island Division of Taxation - tax.ri.gov",
      "RI General Laws (RIGL) Title 44, Chapter 18 - Sales and Use Taxes",
      "RIGL § 44-18-10: Exemptions from sales and use tax",
      "RIGL § 44-18-20: Rate of tax",
      "Rhode Island Division of Motor Vehicles - dmv.ri.gov",
      "RI DMV: Fee Schedule",
      "National Conference of State Legislatures (NCSL) - State Tax Data",
      "Federation of Tax Administrators - State Sales Tax Rates",
    ],
    notes:
      "Rhode Island has a FLAT 7% sales tax with NO local taxes. Same rate applies statewide. " +
      "Doc fee capped at $599 (one of highest caps among regulated states). VSC and GAP NOT " +
      "taxable (standard treatment). Manufacturer rebates reduce tax base (favorable). Full " +
      "trade-in credit. Monthly lease taxation at 7%. Full reciprocity with credit for " +
      "out-of-state taxes paid. Title fee: $52.50. Registration fee based on vehicle weight " +
      "(passenger vehicles up to 4,500 lbs: $52 for 2 years).",
    stateSalesRate: 7.0,
    docFeeCap: 599,
    titleFee: 52.50,
    registrationFee: {
      passengerVehicles: "$52 for 2 years (up to 4,500 lbs)",
      heavierVehicles: "Higher fees based on weight brackets",
    },
    noLocalTaxes: true,
    neighboringStates: {
      Massachusetts: { salesTaxRate: 6.25 },
      Connecticut: { salesTaxRate: 6.35 },
    },
  },
};

export default US_RI;
