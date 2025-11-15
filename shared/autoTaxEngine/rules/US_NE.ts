import { TaxRulesConfig } from "../types";

/**
 * NEBRASKA TAX RULES
 *
 * Researched: 2025-11-14
 * Version: 1
 *
 * KEY FACTS:
 * - State sales tax: 5.5%
 * - Local taxes: Yes (county + city), varies by jurisdiction
 * - Combined range: 5.5% to 8.0% (Gage County highest at 8%)
 * - Trade-in credit: FULL (trade-in value deducted from purchase price before tax)
 * - Manufacturer rebates: Information not definitive (conservative: taxable)
 * - Doc fee: Taxable, NO STATE CAP (average $280)
 * - Service contracts (VSC): Information not definitive
 * - GAP insurance: Part of taxable lease price (not separately stated)
 * - Lease taxation: MONTHLY or LESSOR ELECTION (lessor may elect to pay tax on cost vs collect on gross receipts)
 * - Reciprocity: YES (credit for taxes paid to reciprocal states)
 *
 * UNIQUE NEBRASKA FEATURES:
 * 1. STATE + LOCAL TAXES: 5.5% state + county/city local taxes
 * 2. LESSOR ELECTION FOR LEASES: Lessors may elect to pay tax on vehicle cost instead of collecting on lease receipts
 * 3. MANDATORY LEASE CHARGES TAXABLE: Insurance, refueling, property taxes included in taxable gross receipts
 * 4. GAP WAIVERS TAXABLE: GAP waivers sold by creditor are part of sales/lease price
 * 5. RECIPROCITY WITH CREDIT: Credit for sales tax paid to reciprocal states
 * 6. LOCAL TAX VARIATION: Significant variation (5.5% to 8.0%) based on jurisdiction
 * 7. COLLECTION AT REGISTRATION: Sales/use tax collected when vehicle registered
 *
 * TAX CALCULATION FORMULA (RETAIL):
 * Taxable Base = (Purchase Price + Accessories + Doc Fee) - Trade-In Value
 * State Tax = Taxable Base × 5.5%
 * Local Tax = Taxable Base × Local Rate
 * Total Tax = State Tax + Local Tax
 *
 * Example (Retail Sale in Lincoln - 7.25% total):
 * $30,000 vehicle - $10,000 trade-in + $280 doc fee
 * Taxable Base: $30,000 - $10,000 + $280 = $20,280
 * Tax: $20,280 × 7.25% = $1,470.30
 *
 * LEASE CALCULATION (MONTHLY - Standard Method):
 * Monthly Tax = Monthly Payment × (State + Local Rate)
 * Tax = Monthly Payment × 7.25% (example rate)
 *
 * Example (36-month lease):
 * Monthly Payment: $450
 * Monthly Tax: $450 × 7.25% = $32.63/month
 * Total Lease Tax: $32.63 × 36 = $1,174.68
 *
 * LESSOR ELECTION (Alternative Method):
 * Lessor may elect to pay sales/use tax on the cost of all vehicles
 * instead of collecting tax on gross lease receipts.
 *
 * SOURCES:
 * - Nebraska Department of Revenue (revenue.nebraska.gov)
 * - Nebraska Revised Statutes Chapter 77 (Revenue and Taxation)
 * - Nebraska Administrative Code Title 316 (Sales and Use Tax Regulations)
 * - Nebraska Department of Motor Vehicles (dmv.nebraska.gov)
 * - Nebraska Legislature - Motor Vehicle Taxes and Fees
 * - Form 6 (Nebraska Sales/Use Tax and Tire Fee Statement)
 * - Form 15 (Application for Election of Lessors)
 */
export const US_NE: TaxRulesConfig = {
  stateCode: "NE",
  version: 1,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL
   *
   * Nebraska allows full trade-in credit. The trade-in value is deducted
   * from the purchase price before calculating sales tax.
   *
   * Official Guidance:
   * "In Nebraska, the taxable price of your new vehicle will be considered
   * to be the purchase price minus the trade-in value, as the value of your
   * trade-in is not subject to sales tax."
   *
   * Example:
   *   Purchase Price: $55,000
   *   Trade-In Value: $15,000
   *   Taxable Base: $55,000 - $15,000 = $40,000
   *   Tax @ 7%: $40,000 × 7% = $2,800
   *
   * The full trade-in value is deductible with no cap or limitation.
   *
   * Trade-in credit applies to both state AND local sales tax.
   *
   * Source: Sales Tax Handbook; Nebraska DMV guidance
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules:
   *
   * MANUFACTURER REBATES: Guidance not definitive
   *
   * Official Nebraska guidance on manufacturer rebate treatment is not
   * entirely clear. Conservative approach treats manufacturer rebates
   * as taxable (tax on full price before rebate).
   *
   * Some sources suggest rebates may reduce taxable amount, but without
   * definitive statutory guidance, safer to assume taxable treatment.
   *
   * Example (Conservative):
   *   MSRP: $35,000
   *   Manufacturer Rebate: $4,000
   *   Customer Pays: $31,000
   *   Taxable Base: $35,000 (conservative approach)
   *   Tax @ 7%: $35,000 × 7% = $2,450
   *
   * DEALER REBATES:
   * If dealer reduces actual selling price, tax is on reduced price.
   * Dealer-to-dealer incentives from manufacturer do not affect customer tax.
   *
   * Source: Nebraska tax code interpretation; conservative approach
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: true,
      notes:
        "Manufacturer rebates: Nebraska guidance not definitive. Conservative approach treats " +
        "rebates as taxable (tax on full price before rebate). Verify with Nebraska DOR for " +
        "specific situations.",
    },
    {
      appliesTo: "DEALER",
      taxable: false,
      notes:
        "If dealer reduces actual selling price, tax is on reduced price. Dealer-to-dealer " +
        "incentives paid by manufacturer do not affect customer tax.",
    },
  ],

  /**
   * Doc Fee: TAXABLE
   *
   * Documentation fees are subject to Nebraska sales and use tax.
   *
   * Nebraska has NO CAP on documentation fees.
   * - Average doc fee: $280
   * - Dealers set their own fees
   * - Recommended to compare between dealers
   *
   * Taxability:
   * Doc fees are included in the taxable purchase price and subject to
   * state and local sales tax.
   *
   * Example:
   *   Doc Fee: $280
   *   Combined Rate: 7%
   *   Tax on Doc Fee: $280 × 7% = $19.60
   *
   * Source: Nebraska has no doc fee cap statute; taxability from NE tax code
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules
   *
   * Nebraska sales and use tax applies to the total purchase price
   * including certain fees and charges.
   *
   * TAXABLE PURCHASE PRICE INCLUDES:
   * - Vehicle selling price
   * - Accessories
   * - Dealer preparation charges
   * - Documentation fees
   * - Delivery charges
   *
   * NOT INCLUDED (Non-Taxable):
   * - Government fees (title, registration, wheel tax)
   * - Tire fee
   *
   * SERVICE CONTRACTS (VSC):
   * Nebraska guidance not entirely definitive. Generally treated as
   * non-taxable when separately stated, but verification recommended.
   *
   * GAP INSURANCE / GAP WAIVERS:
   * Official Guidance (Nebraska Revenue Ruling RR-011601):
   * GAP waivers sold by the retail seller of motor vehicles (creditor)
   * are considered part of the sales or lease price of the motor vehicle.
   *
   * GAP waivers are TAXABLE when sold as part of vehicle transaction.
   *
   * TITLE FEE:
   * NOT taxable (government fee)
   *
   * REGISTRATION FEES:
   * NOT taxable (government fees)
   *
   * TIRE FEE:
   * NOT taxable (separate environmental fee)
   *
   * Source: Nebraska DOR; Revenue Ruling RR-011601
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: false,
      notes:
        "Service contracts generally NOT taxable when separately stated. Nebraska guidance not " +
        "definitive - verify with Nebraska DOR for specific situations.",
    },
    {
      code: "GAP",
      taxable: true,
      notes:
        "GAP waivers sold by retail seller ARE TAXABLE per Nebraska Revenue Ruling RR-011601. " +
        "GAP waivers are considered part of sales or lease price of motor vehicle.",
    },
    {
      code: "DOC_FEE",
      taxable: true,
      notes:
        "Doc fees ARE TAXABLE at state + local rate. Nebraska has NO cap on doc fees " +
        "(average $280).",
    },
    {
      code: "TITLE",
      taxable: false,
      notes: "Title fees NOT taxable (government fee)",
    },
    {
      code: "REG",
      taxable: false,
      notes: "Registration fees NOT taxable (government fees)",
    },
    {
      code: "TIRE_FEE",
      taxable: false,
      notes: "Tire fee NOT taxable (separate environmental fee)",
    },
  ],

  /**
   * Product Taxability
   *
   * ACCESSORIES: TAXABLE
   * Accessories included in the vehicle purchase are part of the taxable
   * purchase price and subject to state and local sales tax.
   *
   * NEGATIVE EQUITY: NOT TAXABLE
   * Negative equity rolled into financing is not part of the taxable
   * purchase price. It's a debt obligation, not consideration for the vehicle.
   *
   * SERVICE CONTRACTS: Generally NOT TAXABLE (when separately stated)
   *
   * GAP: TAXABLE
   * GAP waivers sold by the creditor are part of the sales price
   * (per Nebraska Revenue Ruling RR-011601)
   *
   * Source: Nebraska DOR; Revenue Ruling RR-011601
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: false,
  taxOnServiceContracts: false,
  taxOnGap: true, // Unique to Nebraska - GAP waivers are taxable

  /**
   * Vehicle Tax Scheme: STATE_PLUS_LOCAL
   *
   * Nebraska uses a stacked tax system with state + county + city taxes.
   *
   * State Sales Tax: 5.5%
   * - Applies statewide
   * - Nebraska Revised Statutes Chapter 77
   *
   * Local Taxes: County + City
   * - County rates: Vary
   * - City rates: Vary
   * - Combined local: 0% to 2.5%
   *
   * Combined Rates:
   * - Lowest: 5.5% (state only, some rural areas)
   * - Average: ~7.0%
   * - Highest: 8.0% (Gage County)
   * - Omaha: 7.0% (5.5% state + 1.5% local)
   * - Lincoln: 7.25% (5.5% state + 1.75% local)
   *
   * Tax Collection:
   * Sales and use tax is collected at the time of vehicle registration
   * using Form 6 (Nebraska Sales/Use Tax and Tire Fee Statement).
   *
   * Vehicles must be registered within 30 days of purchase.
   *
   * Source: Nebraska Revised Statutes Chapter 77; Nebraska DMV
   */
  vehicleTaxScheme: "STATE_PLUS_LOCAL",
  vehicleUsesLocalSalesTax: true,

  // ============================================================================
  // LEASE TRANSACTION RULES
  // ============================================================================

  leaseRules: {
    /**
     * Lease Method: MONTHLY (standard) or LESSOR ELECTION (alternative)
     *
     * Nebraska has two lease taxation methods:
     *
     * 1. STANDARD METHOD (Monthly):
     * Lessor collects Nebraska and local sales tax on the gross lease
     * receipts (total amount for which vehicle is leased or rented).
     *
     * Monthly Tax = Monthly Payment × (State + Local Rate)
     *
     * Example:
     *   Monthly Payment: $500
     *   Combined Rate: 7.25%
     *   Monthly Tax: $500 × 7.25% = $36.25
     *
     * 2. LESSOR ELECTION (Alternative):
     * Lessors of motor vehicles leased for one year or more may elect
     * to pay sales or use tax on the COST of all vehicles, instead of
     * collecting sales tax on the gross lease receipts.
     *
     * Election made using Form 15 (Application for Election of Lessors).
     * Once elected, lessor pays tax on vehicle cost upfront and does not
     * collect tax on lease payments.
     *
     * MANDATORY CHARGES:
     * Mandatory charges for refueling, insurance, property taxes, and
     * other items are considered part of the gross lease receipts and
     * are subject to sales tax even if separately stated.
     *
     * Official Guidance:
     * "Mandatory charges for refueling, insurance, property taxes, and
     * other items are considered part of the gross lease receipts and
     * are subject to sales tax even if separately stated."
     *
     * COUNTY TAX COLLECTION:
     * For county tax on leases, some jurisdictions may require upfront
     * payment of total county use tax at the time of titling, rather
     * than collecting it monthly.
     *
     * Source: Nebraska DOR; Form 15 instructions
     */
    method: "MONTHLY",

    /**
     * Cap Cost Reduction: NOT TAXABLE (under monthly method)
     *
     * Under the standard monthly lease taxation method, cap cost
     * reductions (cash down, rebates, trade-in) are generally not
     * directly taxed.
     *
     * Tax is collected on the monthly lease payments, not on upfront
     * cap cost reductions.
     *
     * However, if lessor elected alternative method (Form 15), lessor
     * paid tax on vehicle cost upfront.
     *
     * Source: Nebraska DOR lease taxation guidance
     */
    taxCapReduction: false,

    /**
     * Rebate Behavior on Leases: FOLLOW_RETAIL_RULE
     *
     * For leases under the monthly method, rebates reduce the cap cost
     * and monthly payment, which reduces the tax collected monthly.
     *
     * Rebates are not separately taxed upfront under monthly lease method.
     *
     * Under lessor election method, lessor pays tax on vehicle cost
     * regardless of rebates.
     *
     * Source: Nebraska lease taxation interpretation
     */
    rebateBehavior: "FOLLOW_RETAIL_RULE",

    /**
     * Doc Fee on Leases: ALWAYS taxable
     *
     * Documentation fees and acquisition fees on leases are subject to
     * sales tax.
     *
     * Under monthly method: If doc fee paid upfront, taxed upfront.
     * If capitalized, taxed as part of monthly payment.
     *
     * Example:
     *   Doc Fee: $595 (paid upfront)
     *   Combined Rate: 7.25%
     *   Tax: $595 × 7.25% = $43.14
     *
     * Source: Nebraska DOR
     */
    docFeeTaxability: "ALWAYS",

    /**
     * Trade-in Credit on Leases: FULL (under monthly method)
     *
     * Trade-in allowance reduces the cap cost on leases, which reduces
     * monthly payments and therefore monthly tax collected.
     *
     * Trade-in is not separately taxed upfront under monthly method.
     *
     * Similar treatment to retail where trade-in reduces taxable amount.
     *
     * Source: Nebraska lease taxation guidance
     */
    tradeInCredit: "FULL",

    /**
     * Negative Equity on Leases: TAXABLE
     *
     * Negative equity rolled into a lease increases the capitalized cost
     * and monthly payment, which increases the monthly tax collected.
     *
     * Under monthly method, higher monthly payment due to negative equity
     * results in higher monthly tax.
     *
     * Source: Nebraska lease taxation interpretation
     */
    negativeEquityTaxable: true,

    /**
     * Fee Taxability on Leases
     *
     * MANDATORY CHARGES TAXABLE:
     * Mandatory charges for refueling, insurance, property taxes, and
     * other items are considered part of gross lease receipts and are
     * subject to sales tax even if separately stated.
     *
     * GAP WAIVERS: TAXABLE
     * GAP waivers are considered part of the lease price per Revenue
     * Ruling RR-011601.
     *
     * SERVICE CONTRACTS: Generally NOT TAXABLE (when separately stated)
     *
     * DOC FEES: TAXABLE
     *
     * GOVERNMENT FEES: NOT TAXABLE
     *
     * Source: Nebraska DOR; Revenue Ruling RR-011601
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: true,
        notes: "Doc fee TAXABLE on leases",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: false,
        notes: "Service contracts generally NOT taxable when separately stated on leases",
      },
      {
        code: "GAP",
        taxable: true,
        notes:
          "GAP waivers TAXABLE on leases per NE Revenue Ruling RR-011601 (part of lease price)",
      },
      {
        code: "TITLE",
        taxable: false,
        notes: "Title fees NOT taxable (government fee)",
      },
      {
        code: "REG",
        taxable: false,
        notes: "Registration fees NOT taxable (government fees)",
      },
    ],

    titleFeeRules: [
      {
        code: "TITLE",
        taxable: false,
        includedInCapCost: false,
        includedInUpfront: true,
        includedInMonthly: false,
      },
      {
        code: "REG",
        taxable: false,
        includedInCapCost: false,
        includedInUpfront: true,
        includedInMonthly: false,
      },
    ],

    taxFeesUpfront: false,

    specialScheme: "NONE",

    notes:
      "Nebraska: MONTHLY lease taxation (standard method) - tax collected on gross lease receipts. " +
      "Alternative: Lessor may elect (Form 15) to pay tax on vehicle cost upfront instead of " +
      "collecting on lease receipts. Mandatory charges (insurance, refueling, property taxes) ARE " +
      "TAXABLE even if separately stated. GAP waivers TAXABLE as part of lease price. Service " +
      "contracts generally not taxable when separately stated. Trade-in reduces cap cost (monthly method). " +
      "County tax may be collected upfront at titling in some jurisdictions.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: FULL (credit for taxes paid to reciprocal states)
   *
   * Nebraska provides reciprocity credit for sales tax paid in states
   * that have reciprocity agreements with Nebraska.
   *
   * Official Guidance:
   * "If the state the vehicle was purchased in has reciprocity with Nebraska,
   * the total sales tax paid in that state will be credited toward the total
   * state and local use tax due in Nebraska."
   *
   * HOW IT WORKS:
   *
   * 1. Reciprocal States:
   *    - State must have reciprocity agreement with Nebraska
   *    - Credit for sales tax paid in that state
   *    - Applied toward total state and local use tax due in NE
   *
   * 2. Credit Calculation:
   *    - No refund if other state's tax exceeds Nebraska tax
   *    - If other state tax < Nebraska tax, pay difference
   *    - If other state tax ≥ Nebraska tax, no additional NE tax due
   *
   * Example 1 (Lower Tax State):
   *   Purchase in State with 4% sales tax: $1,200 tax paid
   *   Nebraska tax would be 7%: $2,100
   *   Credit for other state: $1,200
   *   Additional NE tax due: $900
   *
   * Example 2 (Higher Tax State):
   *   Purchase in State with 8% sales tax: $2,400 tax paid
   *   Nebraska tax would be 7%: $2,100
   *   Credit for other state: $2,100 (capped at NE tax)
   *   Additional NE tax due: $0
   *   (No refund for $300 excess)
   *
   * DOCUMENTATION REQUIRED:
   * - Proof of sales tax paid to other state
   * - Bill of sale
   * - Receipt or invoice
   * - Completed on Form 6 (Nebraska Sales/Use Tax and Tire Fee Statement)
   *
   * REGISTRATION REQUIREMENT:
   * Vehicles must be registered within 30 days of purchase.
   * Sales/use tax collected at time of registration.
   *
   * FOR MOTORBOATS:
   * Same reciprocity principle applies. Form 6MB used for motorboats.
   *
   * Source: Nebraska DOR; Form 6 instructions; Nebraska Revised Statutes
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
      "Nebraska provides reciprocity credit for sales tax paid to states that have reciprocity " +
      "agreements with Nebraska. Total sales tax paid in reciprocal state credited toward total " +
      "state and local use tax due in Nebraska. No refund if other state tax exceeds NE tax. " +
      "Credit documented on Form 6 at time of registration. Registration required within 30 days. " +
      "Same applies to motorboats (Form 6MB). Not all states have reciprocity - verify with NE DOR.",
  },

  extras: {
    lastUpdated: "2025-11-14",
    sources: [
      "Nebraska Department of Revenue (revenue.nebraska.gov)",
      "Nebraska Revised Statutes Chapter 77 (Revenue and Taxation)",
      "Nebraska Administrative Code Title 316 (Sales and Use Tax Regulations)",
      "Nebraska Department of Motor Vehicles (dmv.nebraska.gov)",
      "Nebraska Legislature - Motor Vehicle Taxes and Fees",
      "Nebraska Form 6 (Sales/Use Tax and Tire Fee Statement)",
      "Nebraska Form 15 (Application for Election of Lessors)",
      "Nebraska Revenue Ruling RR-011601 (GAP Waiver Contracts)",
      "Sales Tax Handbook - Nebraska Sales Tax on Vehicles",
      "PrivateAuto - Nebraska Sales Taxes",
    ],
    notes:
      "Nebraska has 5.5% state sales tax + local (county + city) for combined 5.5% to 8.0%. " +
      "Full trade-in credit on both retail and leases (monthly method). Manufacturer rebate treatment " +
      "not definitive (conservative: taxable). Doc fees taxable, NO CAP (avg $280). Lease: MONTHLY " +
      "taxation standard, or lessor may elect to pay tax on vehicle cost (Form 15). Mandatory lease " +
      "charges (insurance, refueling) ARE TAXABLE. GAP waivers TAXABLE (unique feature). Service " +
      "contracts generally not taxable when separately stated. Reciprocity with reciprocal states. " +
      "Tax collected at registration (within 30 days). Highest rate: Gage County 8.0%.",
    stateRate: 5.5,
    localRateRange: {
      min: 0.0,
      max: 2.5,
    },
    combinedRateRange: {
      min: 5.5,
      max: 8.0,
    },
    avgDocFee: 280,
    majorJurisdictions: {
      Omaha: { state: 5.5, local: 1.5, total: 7.0 },
      Lincoln: { state: 5.5, local: 1.75, total: 7.25 },
      GageCounty: { state: 5.5, local: 2.5, total: 8.0 },
    },
    leaseTaxMethod:
      "MONTHLY (standard): Tax on gross lease receipts each month. " +
      "ALTERNATIVE (lessor election): Lessor may elect (Form 15) to pay sales/use tax on cost " +
      "of vehicles instead of collecting on lease receipts.",
    uniqueFeatures: [
      "GAP waivers TAXABLE (part of sales/lease price)",
      "Lessor election option for leases (Form 15)",
      "Mandatory lease charges taxable even if separately stated",
      "Tax collected at registration (within 30 days)",
      "Full trade-in credit on retail and leases",
      "Reciprocity with reciprocal states",
      "County tax on leases may be collected upfront at titling",
    ],
    gapWaiverGuidance:
      "Per Nebraska Revenue Ruling RR-011601, GAP waivers sold by the " +
      "retail seller of motor vehicles (creditor) are considered part of the sales or lease price " +
      "of the motor vehicle and are subject to sales/use tax. This is a unique Nebraska feature.",
  },
};

export default US_NE;
