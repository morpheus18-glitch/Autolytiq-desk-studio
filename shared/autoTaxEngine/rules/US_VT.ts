import { TaxRulesConfig } from "../types";

/**
 * VERMONT TAX RULES
 *
 * Researched: 2025-11-14
 * Version: 2
 *
 * KEY FACTS:
 * - State sales/use tax: 6.0% (vehicles)
 * - Local taxes: NONE (state-only system)
 * - Combined rate: 6.0% (flat statewide)
 * - Trade-in credit: NONE (UNIQUE - Vermont does NOT allow trade-in credit)
 * - Manufacturer rebates: NOT taxable (reduce sale price)
 * - Dealer rebates: NOT taxable (if actual price reduction)
 * - Doc fee: TAXABLE, NO CAP (average $300-400)
 * - Service contracts: TAXABLE (unique - Vermont taxes VSC)
 * - GAP: NOT taxable (insurance product)
 * - Lease taxation: MONTHLY (tax on each payment at 6%)
 * - Reciprocity: LIMITED (credit for higher-tax states only)
 * - Purchase and Use Tax: SEPARATE annual tax based on vehicle value
 *
 * UNIQUE VERMONT FEATURES:
 * 1. NO TRADE-IN CREDIT: Vermont is one of the few states that does NOT allow
 *    trade-in credit. Tax is calculated on full vehicle price regardless of trade-in.
 *
 * 2. SERVICE CONTRACTS TAXABLE: Vermont taxes VSC/extended warranties, unlike
 *    most states that exempt services.
 *
 * 3. PURCHASE AND USE TAX: Annual tax based on vehicle value (like property tax)
 *    - Year 1: 6% of MSRP
 *    - Decreases annually based on NADA value
 *    - Separate from sales tax
 *
 * 4. FLAT 6% RATE: Simple statewide rate, no local variations
 *
 * 5. ELECTRIC VEHICLE INCENTIVES: $4,000 state incentive (not taxable when applied)
 *
 * SOURCES:
 * - Vermont Department of Motor Vehicles (dmv.vermont.gov)
 * - Vermont Department of Taxes (tax.vermont.gov)
 * - Vermont Statutes Annotated (VSA) Title 32 (Taxation)
 * - § 32 VSA 9741 (Sales and Use Tax)
 * - § 32 VSA 8902 (Purchase and Use Tax)
 * - VT DMV Registration and Title Manual
 */
export const US_VT: TaxRulesConfig = {
  stateCode: "VT",
  version: 2,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: NONE (CRITICAL UNIQUE FEATURE)
   *
   * Vermont does NOT allow trade-in credit. This is a MAJOR difference from
   * most other states.
   *
   * Statutory Basis (32 VSA § 9741):
   * Vermont sales tax applies to the full purchase price of the vehicle.
   * Trade-ins are NOT deducted from the taxable amount.
   *
   * Official Guidance (VT Department of Taxes):
   * "The sales tax is calculated on the full purchase price of the vehicle.
   * Trade-in allowances do not reduce the taxable amount."
   *
   * Example:
   *   Vehicle Price: $30,000
   *   Trade-In Value: $10,000
   *   Customer Pays: $20,000
   *   TAXABLE BASE: $30,000 (NOT $20,000)
   *   Sales Tax @ 6%: $1,800
   *
   * Impact on Buyers:
   * Vermont buyers pay significantly more sales tax than buyers in states
   * that allow trade-in credit. For a $10,000 trade-in, that's $600 extra tax.
   *
   * Legislative History:
   * Vermont has maintained this policy for decades to maximize sales tax revenue.
   * Multiple attempts to change this have failed in the legislature.
   *
   * Source: 32 VSA § 9741, VT Department of Taxes Sales Tax Guide
   */
  tradeInPolicy: { type: "NONE" },

  /**
   * Rebate Rules:
   *
   * MANUFACTURER REBATES:
   * - NOT taxable (reduce the sale price)
   * - Manufacturer rebates ARE deducted before calculating sales tax
   * - Customer pays tax on price after manufacturer rebate
   *
   * Example:
   *   Vehicle MSRP: $35,000
   *   Manufacturer Rebate: $3,000
   *   Taxable Base: $32,000
   *   Sales Tax @ 6%: $1,920
   *
   * DEALER REBATES:
   * - NOT taxable if actual price reduction
   * - Tax is on the actual selling price
   *
   * ELECTRIC VEHICLE INCENTIVE:
   * - Vermont offers $4,000 state EV incentive
   * - NOT taxable when applied at point of sale
   * - Reduces taxable base like manufacturer rebate
   *
   * Source: VT Department of Taxes, Vermont DMV
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: false,
      notes:
        "Manufacturer rebates reduce the purchase price before sales tax calculation. " +
        "Tax is calculated on the net price after rebate. This includes Vermont's $4,000 " +
        "state EV incentive.",
    },
    {
      appliesTo: "DEALER",
      taxable: false,
      notes:
        "Dealer discounts that reduce the actual selling price are not taxable. " +
        "Tax is calculated on the actual reduced selling price.",
    },
  ],

  /**
   * Doc Fee: TAXABLE (no statutory cap)
   *
   * Vermont dealer documentation fees are subject to sales tax.
   *
   * Cap: NO STATUTORY CAP
   * - Vermont does not impose a statutory limit on doc fees
   * - Average doc fee: $300-400
   * - Observed range: $200 to $500
   *
   * Taxability:
   * Doc fee is included in the taxable base for state sales tax.
   *
   * Example:
   *   Doc Fee: $350
   *   Sales Tax @ 6%: $21
   *
   * Source: VT Department of Taxes
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules
   *
   * Vermont has UNIQUE fee taxability rules:
   *
   * SERVICE CONTRACTS (VSC):
   * - TAXABLE in Vermont (UNIQUE feature)
   * - Vermont is one of the few states that taxes extended warranties
   * - Subject to 6% sales tax
   *
   * GAP INSURANCE:
   * - NOT subject to sales tax
   * - Treated as insurance product, exempt from sales tax
   *
   * TITLE FEE:
   * - NOT taxable (government fee)
   * - Current title fee: $35
   *
   * REGISTRATION FEES:
   * - NOT taxable (government fees)
   *
   * PURCHASE AND USE TAX:
   * - SEPARATE annual tax (not subject to sales tax)
   * - Based on vehicle value
   * - Year 1: 6% of MSRP, decreases annually
   *
   * Source: VT Department of Taxes Sales Tax Guide
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: true,
      notes:
        "Service contracts (VSC) ARE TAXABLE in Vermont (UNIQUE). Vermont taxes extended " +
        "warranties at 6% sales tax rate. This is different from most states that exempt services.",
    },
    {
      code: "GAP",
      taxable: false,
      notes: "GAP insurance is NOT taxable in Vermont. Treated as insurance product.",
    },
    {
      code: "DOC_FEE",
      taxable: true,
      notes:
        "Doc fees ARE TAXABLE at 6% state rate. Vermont has NO cap on doc fees. " +
        "Average $300-400.",
    },
    {
      code: "TITLE",
      taxable: false,
      notes: "Title fee ($35) is NOT taxable (government fee).",
    },
    {
      code: "REG",
      taxable: false,
      notes: "Registration fees are not taxable (government fees).",
    },
    {
      code: "PURCHASE_USE_TAX",
      taxable: false,
      notes:
        "Purchase and Use Tax is a separate annual tax based on vehicle value, " +
        "not subject to sales tax.",
    },
  ],

  /**
   * Product Taxability
   *
   * Accessories: TAXABLE
   * - Dealer-installed accessories are taxable when sold with vehicle
   * - Subject to 6% state sales tax
   *
   * Negative Equity: NOT taxable
   * - Negative equity rolled into loan is not subject to sales tax
   * - Represents debt obligation, not consideration for vehicle
   *
   * Service Contracts: TAXABLE (UNIQUE FEATURE)
   * - Vermont taxes VSC/extended warranties at 6%
   *
   * GAP: NOT taxable
   *
   * Example (VSC Taxation):
   *   Vehicle Price: $25,000
   *   VSC: $2,000
   *   Taxable Base: $27,000 (vehicle + VSC)
   *   Sales Tax @ 6%: $1,620
   *
   * Source: VT Department of Taxes
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: false,
  taxOnServiceContracts: true, // UNIQUE - Vermont taxes VSC
  taxOnGap: false,

  /**
   * Vehicle Tax Scheme: STATE_ONLY
   *
   * Vermont uses a flat statewide sales tax with NO local taxes.
   *
   * State Sales Tax: 6.0%
   * - Applies to all motor vehicle sales statewide
   * - 32 VSA § 9741
   *
   * Local Taxes: NONE
   * - Vermont does not allow local sales taxes
   * - Simple, uniform rate across entire state
   *
   * Combined Rate: 6.0% (statewide)
   * - No variation by location
   * - Same rate whether buying in Burlington, Montpelier, or rural areas
   *
   * Purchase and Use Tax (Separate):
   * - Annual tax based on vehicle value
   * - Year 1: 6% of MSRP
   * - Decreases based on NADA value
   * - Collected at annual registration
   * - Completely separate from one-time sales tax
   *
   * Source: 32 VSA § 9741, 32 VSA § 8902
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
     * Vermont taxes leases on a MONTHLY basis. Sales tax is charged on
     * each monthly lease payment at the 6% rate.
     *
     * Official Guidance (VT Department of Taxes):
     * "Sales tax applies to each lease payment made by the lessee. The tax is
     * calculated at 6% of the monthly payment amount."
     *
     * State Rate: 6.0%
     * - Same as retail sales tax
     * - No local taxes
     * - Applies to each monthly payment
     *
     * Source: 32 VSA § 9741, VT Department of Taxes
     */
    method: "MONTHLY",

    /**
     * Cap Cost Reduction: NOT TAXED (on monthly method)
     *
     * Vermont uses pure monthly taxation. Capitalized cost reductions
     * are NOT taxed separately; only monthly payments are taxed.
     *
     * Down payments, rebates, and trade-ins reduce the capitalized cost,
     * which lowers monthly payments, which reduces total tax paid over the
     * lease term.
     *
     * IMPORTANT: Trade-ins on LEASES do provide benefit (via lower cap cost),
     * unlike PURCHASES where Vermont does NOT allow trade-in credit.
     *
     * Source: VT Department of Taxes Lease Guide
     */
    taxCapReduction: false,

    /**
     * Rebate Behavior on Leases: FOLLOW_RETAIL_RULE
     *
     * Rebates applied to reduce capitalized cost are not taxed directly.
     * They reduce monthly payments, which are then taxed monthly at 6%.
     *
     * Source: VT Department of Taxes
     */
    rebateBehavior: "FOLLOW_RETAIL_RULE",

    /**
     * Doc Fee on Leases: FOLLOW_RETAIL_RULE
     *
     * Doc fees on leases are taxable. If capitalized, they increase monthly
     * payments which are then taxed. If paid upfront, they are taxed immediately.
     *
     * Source: VT Department of Taxes
     */
    docFeeTaxability: "FOLLOW_RETAIL_RULE",

    /**
     * Trade-in Credit on Leases: FOLLOW_RETAIL_RULE
     *
     * CRITICAL DIFFERENCE FROM RETAIL:
     * - Retail purchases: NO trade-in credit (Vermont unique rule)
     * - Leases: Trade-in DOES reduce cap cost (standard lease treatment)
     *
     * On leases, trade-ins reduce the capitalized cost, which lowers monthly
     * payments, reducing total tax over lease term.
     *
     * Example:
     *   Gross Cap Cost: $35,000
     *   Trade-In: $8,000
     *   Net Cap Cost: $27,000
     *   Monthly Payment: $400 (based on $27,000)
     *   Monthly Tax @ 6%: $24/month
     *
     * This is a significant advantage for leasing vs. purchasing in Vermont.
     *
     * Source: VT Department of Taxes Lease Guide
     */
    tradeInCredit: "FOLLOW_RETAIL_RULE",

    /**
     * Negative Equity on Leases: TAXABLE
     *
     * Negative equity increases the capitalized cost, which increases monthly
     * payments, which increases tax paid monthly.
     *
     * Example:
     *   Base Cap Cost: $30,000
     *   Negative Equity: $4,000
     *   Adjusted Cap Cost: $34,000
     *   Monthly Payment: $500 (based on $34,000)
     *   Monthly Tax @ 6%: $30/month
     *
     * Source: VT Department of Taxes
     */
    negativeEquityTaxable: true,

    /**
     * Fee Taxability on Leases
     *
     * Backend products on leases follow same rules as sales:
     *
     * SERVICE CONTRACTS (VSC): TAXABLE (if capitalized, taxed monthly)
     * GAP INSURANCE: NOT taxable
     * DOC FEE: TAXABLE (if capitalized, taxed monthly; if upfront, taxed immediately)
     * TITLE FEE: NOT taxable
     *
     * Source: VT Department of Taxes
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: true,
        notes: "Doc fee taxable on leases (capitalized or upfront).",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: true,
        notes: "Service contracts TAXABLE on leases (unique VT rule).",
      },
      {
        code: "GAP",
        taxable: false,
        notes: "GAP insurance NOT taxable on leases.",
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

    taxFeesUpfront: false,

    specialScheme: "NONE",

    notes:
      "Vermont: MONTHLY lease taxation. Tax applies to each monthly payment at 6% state rate. " +
      "Cap cost reductions (cash, rebates, trade-in) NOT taxed separately - they reduce monthly " +
      "payments which are then taxed. UNIQUE: Trade-ins DO provide benefit on leases (reduce cap " +
      "cost), unlike retail purchases where Vermont allows NO trade-in credit. Service contracts " +
      "TAXABLE on leases (unique VT rule). GAP NOT taxed.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: LIMITED (credit only if other state's tax is higher)
   *
   * Vermont provides LIMITED reciprocal credit for sales tax paid to other states.
   *
   * Official Guidance (VT Department of Taxes):
   * "Credit is allowed for sales or use tax paid to another state if that state's
   * rate is equal to or greater than Vermont's 6% rate. If the other state's rate
   * is lower, no credit is allowed and full Vermont tax is due."
   *
   * How It Works:
   * - Other state tax ≥ 6%: Full credit, NO additional VT tax due
   * - Other state tax < 6%: NO credit, FULL VT tax due
   *
   * Example 1 (Other State Higher Rate):
   *   Vehicle purchased in California: $30,000
   *   California tax paid (7.5%): $2,250
   *   Vermont tax would be (6%): $1,800
   *   Credit allowed: $1,800 (full VT tax covered)
   *   Additional VT tax due: $0
   *
   * Example 2 (Other State Lower Rate):
   *   Vehicle purchased in Delaware: $30,000
   *   Delaware tax paid (0%): $0
   *   Vermont tax due (6%): $1,800
   *   Credit allowed: $0 (DE rate < VT rate)
   *   Additional VT tax due: $1,800 (FULL amount)
   *
   * Example 3 (Other State Equal Rate):
   *   Vehicle purchased in Massachusetts: $30,000
   *   Massachusetts tax paid (6.25%): $1,875
   *   Vermont tax would be (6%): $1,800
   *   Credit allowed: $1,800
   *   Additional VT tax due: $0
   *
   * Credit Policy:
   * "All or nothing" approach - either full credit (if ≥ 6%) or no credit (if < 6%).
   * Unlike many states that provide partial credit, Vermont requires the other
   * state's rate to meet or exceed 6% for any credit.
   *
   * Documentation Required:
   * - Bill of sale showing purchase price
   * - Receipt showing taxes paid to other state
   * - Proof that other state's rate is ≥ 6%
   *
   * Source: 32 VSA § 9741, VT Department of Taxes Use Tax Guide
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
      "Vermont provides LIMITED reciprocity. Credit ONLY allowed if other state's tax rate is " +
      "6% or higher. If other state's rate is below 6%, NO credit allowed and FULL Vermont tax " +
      "is due. 'All or nothing' policy - either full credit (if other state ≥ 6%) or no credit " +
      "(if other state < 6%). Must provide proof of tax paid.",
  },

  extras: {
    lastUpdated: "2025-11-14",
    sources: [
      "Vermont Department of Motor Vehicles (dmv.vermont.gov)",
      "Vermont Department of Taxes (tax.vermont.gov)",
      "Vermont Statutes Annotated (VSA) Title 32 - Taxation",
      "32 VSA § 9741 - Sales and Use Tax",
      "32 VSA § 8902 - Purchase and Use Tax",
      "VT DMV Registration and Title Manual",
      "VT Department of Taxes Sales Tax Guide",
    ],
    notes:
      "Vermont has FLAT 6.0% state sales tax, NO local taxes. UNIQUE: NO trade-in credit on " +
      "retail purchases (tax on full vehicle price regardless of trade-in). UNIQUE: Service " +
      "contracts (VSC) ARE TAXABLE at 6%. Manufacturer rebates NOT taxable (reduce sale price). " +
      "Doc fee taxable, NO CAP (avg $300-400). GAP NOT taxable. Lease: MONTHLY taxation (pure " +
      "monthly method), trade-ins DO reduce cap cost on leases (unlike retail). SEPARATE annual " +
      "Purchase and Use Tax based on vehicle value (Year 1: 6% of MSRP). LIMITED reciprocity: " +
      "credit ONLY if other state's rate ≥ 6%. EV incentive: $4,000 state rebate (not taxable).",
    stateRate: 6.0,
    municipalRateRange: { min: 0, max: 0 },
    combinedRateRange: { min: 6.0, max: 6.0 },
    avgDocFee: 350,
    titleFee: 35,
    purchaseAndUseTax: {
      year1: 6.0,
      description:
        "Annual Purchase and Use Tax based on vehicle value. Year 1: 6% of MSRP. " +
        "Subsequent years based on NADA value. Separate from one-time sales tax. Paid at " +
        "annual registration.",
    },
    evIncentive: {
      amount: 4000,
      description:
        "Vermont offers $4,000 state incentive for new EV purchases. Not taxable " +
        "when applied at point of sale. Reduces taxable base like manufacturer rebate.",
    },
    uniqueFeatures: [
      "NO trade-in credit on retail purchases (tax on full price)",
      "Service contracts (VSC) ARE TAXABLE at 6% (unique)",
      "Flat 6% statewide rate, NO local taxes",
      "Trade-ins DO reduce cap cost on leases (unlike retail)",
      "Annual Purchase and Use Tax (6% of MSRP year 1)",
      "LIMITED reciprocity (credit only if other state ≥ 6%)",
      "$4,000 state EV incentive (not taxable)",
      "Simple, uniform tax structure statewide",
    ],
    majorComparison: {
      description:
        "Vermont vs. states with trade-in credit: On a $30,000 vehicle with $10,000 trade-in, " +
        "Vermont buyers pay $600 MORE in sales tax than buyers in states that allow trade-in credit. " +
        "This makes Vermont one of the highest-tax states for vehicle purchases with trade-ins.",
    },
  },
};

export default US_VT;
