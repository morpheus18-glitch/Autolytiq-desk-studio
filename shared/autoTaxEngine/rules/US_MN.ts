import { TaxRulesConfig } from "../types";

/**
 * MINNESOTA TAX RULES
 *
 * Researched: 2025-11-13
 * Version: 1
 *
 * KEY FACTS:
 * - State motor vehicle excise tax (MVET): 6.875% (effective July 1, 2023, increased from 6.5%)
 * - Local sales tax on vehicles: NO (local sales taxes do NOT apply to motor vehicle purchases)
 * - Local vehicle excise tax: $20 flat fee (some jurisdictions, not a percentage)
 * - Trade-in credit: FULL (100% deduction, no cap)
 * - Doc fee: NOT taxable (explicitly excluded), average $75
 * - Manufacturer rebates: NOT taxable (reduce taxable price)
 * - Dealer rebates: NOT taxable (same as manufacturer - reduce taxable price)
 * - Service contracts: NOT taxable (exempt from motor vehicle sales tax)
 * - GAP: NOT taxable (classified as insurance)
 * - Lease taxation: UPFRONT (on total lease price), but leases ARE subject to local sales taxes
 * - Reciprocity: YES (credit for taxes paid to other states, capped at MN rate)
 *
 * UNIQUE MINNESOTA FEATURES:
 * - Motor vehicle PURCHASES exempt from local sales tax (state 6.875% only)
 * - Motor vehicle LEASES subject to local sales taxes (can exceed 8% in metro areas)
 * - Metro transit tax: +0.75% for seven-county Minneapolis-St. Paul area (leases only, effective Oct 1, 2023)
 * - Cap cost reduction (cash down) does NOT reduce vehicle value for tax on leases (unique treatment)
 * - Trade-in allowance DOES reduce vehicle value on leases (different from cash down)
 * - Federal EV tax credit: Reduces taxable price if applied at point of sale
 * - Negative equity: NOT explicitly addressed (likely not taxable based on purchase price definition)
 * - Separate Motor Vehicle Excise Tax (2.5% annual property tax) - NOT part of sales tax
 * - Special rates for older vehicles: $10 flat tax (10+ years old, below average trade-in value)
 * - Collector vehicles: $150 flat tax (20+ years old, exhibition use)
 *
 * TAX CALCULATION FORMULA (RETAIL):
 * Taxable Price = Vehicle Price + Accessories + Labor - Trade-In - Manufacturer Rebates - Dealer Incentives
 * State Tax = Taxable Price × 6.875%
 * Local Excise Tax = $20 (if applicable jurisdiction)
 * Total Tax = State Tax + Local Excise Tax
 * (Doc fee, VSC, and GAP NOT included if properly itemized)
 *
 * Example (Standard Purchase):
 * $30,000 vehicle + $800 accessories - $10,000 trade - $2,000 rebate = $18,800
 * Tax: $18,800 × 6.875% = $1,292.50 + $20 local excise = $1,312.50
 *
 * LEASE CALCULATION (UPFRONT):
 * Total Lease Price = (Cap Cost - Residual - Trade-In - Rebates + Interest + Accessories)
 * State + Local Tax = Total Lease Price × (6.875% + local rate + 0.75% metro transit if applicable)
 * Example: 7.375% typical metro rate (6.875% state + 0.5% local)
 *
 * SOURCES:
 * - Minnesota Department of Revenue (revenue.state.mn.us)
 * - Minnesota Statute Chapter 297B (Motor Vehicle Sales Tax)
 * - § 297B.01 (Definitions), § 297B.02 (Tax Imposed), § 297B.025 (Older Vehicles)
 * - § 297B.03 (Exemptions), § 297B.035 (Collector Vehicles)
 * - MN DOR Motor Vehicle Sales Guide, Motor Vehicle Leases Guide
 * - MN House Research - Motor Vehicle Sales Tax Brief (2023)
 */
export const US_MN: TaxRulesConfig = {
  stateCode: "MN",
  version: 1,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL (100% credit, no cap)
   *
   * Minnesota provides 100% trade-in credit with no cap. Trade-in value
   * is fully deducted from the purchase price before calculating tax.
   *
   * Statutory Definition (§ 297B.01, Subd. 14a):
   * "If a motor vehicle is taken in trade as a credit or as part payment on a
   * motor vehicle taxable under this chapter, the credit or trade-in value
   * allowed by the person selling the motor vehicle shall be deducted from
   * the total selling price to establish the purchase price of the vehicle
   * being sold."
   *
   * Requirements:
   * - Trade-in must be a motor vehicle traded for another motor vehicle
   * - Trade-in value allowed by dealer is deducted from total selling price
   * - No limit or cap on trade-in credit amount
   *
   * EXCEPTION: Trading an off-road vehicle (ATV, snowmobile, etc.) for a
   * motor vehicle does NOT reduce the taxable price.
   *
   * Example:
   *   Vehicle Purchase Price: $35,000
   *   Trade-In Allowance: $15,000
   *   Manufacturer Rebate: $2,000
   *   Taxable Purchase Price: $18,000
   *   Tax @ 6.875%: $1,237.50
   *
   * Source: Minnesota Statute § 297B.01, Subd. 14; MN DOR Motor Vehicle Sales Guide
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules:
   *
   * Minnesota treats BOTH manufacturer AND dealer rebates as NON-TAXABLE.
   * Both types of rebates reduce the purchase price before tax calculation.
   *
   * MANUFACTURER REBATES (§ 297B.01, Subd. 14b):
   * - "Purchase price does not include... amounts representing manufacturer's
   *   rebates paid to the purchaser"
   * - Rebate must have fixed value at time of purchase
   * - Applies to manufacturer rebates paid directly to purchaser
   * - Applies to manufacturer rebates assigned to dealer on behalf of purchaser
   * - Third-party rebates also deductible if issued by third parties with
   *   manufacturer agreements (e.g., credit card incentive programs)
   *
   * DEALER INCENTIVES:
   * - Minnesota does not distinguish between manufacturer and dealer incentives
   * - Dealer cash/incentives passed to customer reduce purchase price
   * - Dealer discounts from advertised price reduce purchase price
   *
   * FEDERAL EV TAX CREDITS:
   * - If applied as upfront dealer discount at point of sale: Reduces taxable price
   * - If claimed later on federal tax return: Does NOT reduce taxable price
   *
   * Key Principle: Any rebate or discount that reduces the actual consideration
   * paid by the customer reduces the taxable purchase price.
   *
   * Source: Minnesota Statute § 297B.01, Subd. 14; MN DOR Motor Vehicle Sales Guide
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: false,
      notes:
        "Manufacturer rebates reduce purchase price before sales tax. Must have fixed value " +
        "at time of purchase. Third-party rebates with manufacturer agreements also deductible.",
    },
    {
      appliesTo: "DEALER",
      taxable: false,
      notes:
        "Dealer incentives/rebates ALSO reduce purchase price (same as manufacturer). " +
        "Minnesota does not distinguish between manufacturer and dealer incentives for tax purposes.",
    },
  ],

  /**
   * Doc Fee: NOT TAXABLE (explicitly excluded)
   *
   * Documentation fees (also called "doc fees" or "document administration fees")
   * are EXPLICITLY EXCLUDED from the taxable purchase price.
   *
   * Official Guidance (MN DOR Motor Vehicle Sales Guide):
   * "Tax should not be charged on: Registration, license, and document fees"
   *
   * Statutory Cap:
   * - Minnesota Statute § 168.27, Subd. 31 regulates maximum doc fees
   * - Average doc fee in Minnesota: $75
   * - Recent legislative discussions considered caps around $125-$150
   * - Doc fees must be separately stated on sales agreement
   * - Doc fees may be excluded from dealer's advertised price
   *
   * Requirements:
   * - Fee must be for services actually rendered
   * - Services include: preparing, handling, and processing documents for closing
   * - Must be separately stated on purchase agreement
   *
   * Source: Minnesota Statute § 168.27, Subd. 31; MN DOR Motor Vehicle Sales Guide
   */
  docFeeTaxable: false,

  /**
   * Fee Taxability Rules:
   *
   * Minnesota is generous with exemptions for backend products, but items
   * must be properly documented and separately stated.
   *
   * SERVICE CONTRACTS (VSC):
   * - NOT subject to motor vehicle sales tax
   * - Official guidance: "Tax should not be charged on: Extended warranties"
   * - When sold separately from vehicle: May be subject to general sales tax
   *   rate of 6.875% (not motor vehicle sales tax)
   * - Best practice: VSC should be separately stated on purchase agreement
   *
   * GAP INSURANCE:
   * - NOT subject to motor vehicle sales tax
   * - Official guidance: "Do not charge sales tax on: Insurance"
   * - GAP classified as insurance product (exempt from sales tax)
   * - Minnesota requires insurers to include future sales tax in total-loss
   *   settlement checks
   *
   * ACCESSORIES:
   * - TAXABLE (all accessories sold with motor vehicle are taxable)
   * - Includes: Running boards, mud flaps, cargo liners, window tinting, etc.
   * - Labor charges for installation also taxable
   * - EXCEPTION: Disability modifications are NOT taxable
   *
   * LABOR CHARGES:
   * - Taxable when performed on vehicle (rustproofing, undercoating, dealer
   *   prep, transportation)
   *
   * Source: MN DOR Motor Vehicle Sales Guide; Warranties and Service Contracts Guide
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: false,
      notes:
        "Vehicle Service Contracts (VSC) are NOT subject to motor vehicle sales tax. " +
        "Should be separately stated on purchase agreement to avoid taxation.",
    },
    {
      code: "GAP",
      taxable: false,
      notes:
        "GAP insurance is NOT taxable (classified as insurance product). Minnesota " +
        "requires insurers to include future sales tax in total-loss settlements.",
    },
    {
      code: "DOC_FEE",
      taxable: false,
      notes:
        "Document fees are explicitly NOT taxable. Average $75. Must be separately " +
        "stated on purchase agreement.",
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
   * - Accessories: TAXABLE (parts + labor for installation)
   * - Negative equity: NOT taxable (likely, based on purchase price definition)
   * - Service contracts: NOT taxable
   * - GAP: NOT taxable
   *
   * Negative Equity Treatment (NOT EXPLICITLY ADDRESSED):
   * Minnesota statutes do not explicitly address whether negative equity
   * rolled into a new vehicle loan is subject to sales tax.
   *
   * Legal Analysis:
   * Purchase Price Definition (§ 297B.01, Subd. 14a):
   * "Purchase price means the total consideration valued in money for a sale,
   * whether paid in money or otherwise"
   *
   * The statute defines purchase price based on:
   * - The actual sale transaction of the new vehicle
   * - Minus rebates and trade-in allowances
   * - Plus taxable add-ons (accessories, labor)
   *
   * Conservative Interpretation:
   * Negative equity represents a DEBT OBLIGATION from the previous vehicle,
   * not consideration paid for the new vehicle. It's rolled into the loan
   * but is not part of the new vehicle's purchase price.
   *
   * Example:
   *   New Vehicle Price: $30,000
   *   Trade-In Actual Value: $8,000
   *   Trade-In Payoff: $12,000
   *   Negative Equity: $4,000
   *
   *   Amount Financed: $26,000 (NOT the taxable base)
   *   Purchase Price for Tax: $22,000 (Vehicle price minus trade value)
   *   Tax @ 6.875%: $1,512.50
   *
   * Best Practice: Calculate tax on (New Vehicle Price - Trade-In Allowance)
   * Do NOT add negative equity to taxable base.
   *
   * Source: Minnesota Statute § 297B.01; MN DOR guidance analysis
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: false, // Not explicitly addressed, likely not taxable
  taxOnServiceContracts: false,
  taxOnGap: false,

  /**
   * Vehicle Tax Scheme: STATE_ONLY (for purchases)
   *
   * Minnesota has a unique structure:
   * - Motor vehicle PURCHASES: State-only taxation (6.875%, no local taxes)
   * - Motor vehicle LEASES: Subject to local sales taxes (state + local + metro transit)
   *
   * State Motor Vehicle Excise Tax: 6.875%
   * - Effective July 1, 2023 (increased from 6.5%)
   * - 0.375% increase directed to Greater Minnesota transit
   *
   * Local Sales Tax: Does NOT apply to motor vehicle purchases
   * - Minnesota is one of few states where local option sales taxes (up to
   *   1.5% for general purchases) are explicitly excluded for motor vehicles
   *
   * Local Vehicle Excise Tax: $20 flat fee
   * - Some counties/cities impose flat $20 local vehicle excise tax
   * - This is NOT a sales tax (it's a registration-related fee)
   * - Collected at time of registration/title transfer
   * - Used to fund local transportation projects
   *
   * NO OTHER TAXES OR FEES:
   * - No county sales tax on vehicles
   * - No city sales tax on vehicles
   * - No special district taxes on vehicles
   *
   * NOTE: Minnesota has separate Motor Vehicle Excise Tax (annual property
   * tax on vehicles) at 2.5% of depreciated value, paid annually to city/town.
   * This is NOT part of the sales tax system.
   *
   * Source: Minnesota Statute § 297B.02; MN DOR Motor Vehicle Sales Guide
   */
  vehicleTaxScheme: "STATE_ONLY",
  vehicleUsesLocalSalesTax: false,

  // ============================================================================
  // LEASE TRANSACTION RULES
  // ============================================================================

  leaseRules: {
    /**
     * Lease Method: UPFRONT (tax on total lease price)
     *
     * Minnesota requires sales tax to be calculated and paid UPFRONT on the
     * sum of all lease payments, rather than charging tax on individual
     * monthly payments.
     *
     * Official Guidance (MN DOR Motor Vehicle Leases Guide):
     * "Sales tax is collected on the total up-front lease price and reported
     * on your next Sales and Use Tax return."
     *
     * Tax Rate: 6.875% state + local rates (leases ARE subject to local taxes)
     *
     * IMPORTANT: Unlike motor vehicle PURCHASES (exempt from local sales tax),
     * motor vehicle LEASES ARE subject to local sales taxes. Metro area lessees
     * may pay total sales tax rates of 8.375% or higher.
     *
     * Total Lease Price Calculation:
     *   Vehicle Capitalized Cost (Cap Cost)
     *   MINUS: Residual Value
     *   MINUS: Trade-In Allowance (if any)
     *   MINUS: Rebates (manufacturer/dealer)
     *   PLUS: Taxable Add-Ons (accessories installed)
     *   PLUS: Interest/Finance Charges (money factor cost)
     *   = Total Lease Price (taxable base)
     *
     *   × Tax Rate (6.875% state + local taxes + metro transit if applicable)
     *   = Upfront Sales Tax Due
     *
     * Example:
     *   Vehicle MSRP: $40,000
     *   Capitalized Cost: $38,000
     *   Residual Value (36 months): $22,000
     *   Manufacturer Rebate: $1,500
     *   Interest/Finance Charges: $2,500
     *
     *   Total Lease Price: $17,000
     *   Tax @ 7.375% (incl local): $1,253.75 (due upfront)
     *
     * Financing the Tax:
     * Customers may roll the upfront tax back into the capitalized cost and
     * finance it over the lease term. If the tax is financed:
     * - Do NOT include the finance charge on the tax in the taxable amount
     * - Only the original tax amount is taxable
     *
     * Source: MN DOR Motor Vehicle Leases Guide; Minnesota Statute § 297A.61
     */
    method: "FULL_UPFRONT",

    /**
     * Cap Cost Reduction: Does NOT reduce vehicle value for tax (UNIQUE)
     *
     * This is a critical and often misunderstood aspect of Minnesota lease taxation.
     *
     * Official Guidance (MN DOR Motor Vehicle Leases Guide):
     * "Cash down payments or capitalized cost reductions do not reduce the
     * vehicle value."
     *
     * What is Cap Cost Reduction?
     * - Cash down payment
     * - Credits or rebates applied at signing (NOT manufacturer rebates)
     * - First month's payment paid upfront
     * - Security deposit (non-refundable portion)
     *
     * Tax Treatment:
     * - Cap cost reduction DOES lower monthly lease payments
     * - Cap cost reduction DOES NOT lower the taxable lease price for tax
     *
     * EXCEPTION - Rebates:
     * If the cap cost reduction includes manufacturer rebates, those rebates
     * DO reduce the vehicle value (see rebate section below).
     *
     * Example:
     *   Vehicle Cap Cost: $35,000
     *   Cap Cost Reduction (cash): $3,000
     *   Adjusted Cap Cost: $32,000
     *   Residual Value: $20,000
     *   Interest Charges: $2,000
     *
     *   Total Lease Price: $17,000 (Tax calculated on this)
     *   Tax @ 6.875%: $1,168.75
     *
     * Why This Matters:
     * In many states, a larger down payment reduces the tax burden. In
     * Minnesota, down payments reduce the monthly payment amount but do NOT
     * reduce the total tax paid over the lease.
     *
     * Source: MN DOR Motor Vehicle Leases Guide
     */
    taxCapReduction: false,

    /**
     * Rebate Behavior on Leases: FOLLOW_RETAIL_RULE
     *
     * In Minnesota, both manufacturer AND dealer rebates reduce the cap cost
     * and are non-taxable, consistent with retail treatment.
     *
     * This lowers the total lease price and thus the upfront tax paid.
     *
     * Source: MN DOR Motor Vehicle Leases Guide
     */
    rebateBehavior: "FOLLOW_RETAIL_RULE",

    /**
     * Doc Fee on Leases: NEVER taxable
     *
     * Doc fees on leases are NOT taxable (same as retail).
     *
     * Official Guidance (MN DOR Motor Vehicle Leases Guide):
     * "Do not charge sales tax on: Acquisition, document, title, and
     * registration fees"
     *
     * Acquisition Fee vs. Documentation Fee:
     * - Acquisition Fee: Charged by lessor (captive finance) - NOT taxable
     * - Doc Fee: Charged by dealer for administrative processing - NOT taxable
     * - Both must be separately stated on lease agreement
     *
     * Source: MN DOR Motor Vehicle Leases Guide; § 168.27, Subd. 31
     */
    docFeeTaxability: "NEVER",

    /**
     * Trade-in Credit on Leases: FULL (reduces vehicle value)
     *
     * Unlike cash down payments, trading in a vehicle DOES reduce the taxable
     * lease price.
     *
     * Official Guidance (MN DOR Motor Vehicle Leases Guide):
     * "Trade-in allowance reduces the vehicle value when the lessor accepts
     * a used vehicle as part of the lease transaction."
     *
     * Requirements:
     * 1. Customer must OWN the trade-in (cannot trade-in a leased vehicle)
     * 2. Trade directly to lessor named on the lease agreement
     * 3. Trade-in value is determined by dealer/lessor (not payoff amount)
     *
     * CRITICAL RULE - Payoff Amount:
     * "The payoff amount to a lender does not reduce the trade-in allowance."
     *
     * This means if you owe more than the vehicle is worth (negative equity):
     * - Tax benefit is based on actual trade-in VALUE, not payoff
     * - Negative equity does not increase the taxable lease price
     * - Positive equity reduces the taxable lease price
     *
     * Example - Positive Equity:
     *   Vehicle Cap Cost: $35,000
     *   Trade-In Value: $8,000 (Reduces taxable price)
     *   Trade-In Payoff: $5,000 (Dealer pays this, not relevant to tax)
     *   Residual Value: $20,000
     *   Interest Charges: $2,000
     *
     *   Total Lease Price: $9,000 (Tax calculated on this)
     *   Tax @ 6.875%: $618.75 (vs. $1,168.75 without trade)
     *
     * Source: MN DOR Motor Vehicle Leases Guide
     */
    tradeInCredit: "FULL",

    /**
     * Negative Equity on Leases: NOT taxable
     *
     * Negative equity rolled into a lease is NOT taxable.
     *
     * The tax is calculated based on the actual trade-in VALUE (which reduces
     * the taxable lease price), not the payoff amount.
     *
     * Example - Negative Equity:
     *   Vehicle Cap Cost: $35,000
     *   Trade-In Value: $6,000 (Reduces taxable price)
     *   Trade-In Payoff: $10,000 (Negative equity rolled into cap cost)
     *   Effective Cap Cost: $39,000 (For payment calculation)
     *   Residual Value: $20,000
     *   Interest Charges: $2,000
     *
     *   Total Lease Price (for tax): $17,000
     *   (Based on $35K - $6K - $20K + $2K)
     *   Tax @ 6.875%: $1,168.75
     *
     * Source: MN DOR Motor Vehicle Leases Guide
     */
    negativeEquityTaxable: false,

    /**
     * Fee Taxability on Leases:
     *
     * Official Guidance (MN DOR Motor Vehicle Leases Guide):
     * "Do not charge sales tax on: Acquisition, document, title, and
     * registration fees; Insurance; Warranty or extended warranty contracts"
     *
     * What's EXCLUDED from Lease Tax:
     * - GAP insurance/waiver
     * - Vehicle Service Contracts (VSC)
     * - Maintenance plans
     * - Tire & wheel protection
     * - Key replacement coverage
     * - Windshield protection
     * - Paintless dent repair plans
     *
     * What IS INCLUDED in Lease Tax:
     * - Accessories installed on vehicle (running boards, tint, etc.)
     * - Labor charges for customization
     * - Appearance packages
     * - Technology upgrades installed before delivery
     *
     * Best Practice:
     * - Separately itemize backend products on lease agreement
     * - Show VSC/GAP as non-taxable line items
     * - Calculate tax only on vehicle lease price + taxable add-ons
     *
     * Source: MN DOR Motor Vehicle Leases Guide
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: false,
        notes: "Doc fee NOT taxable on leases (explicitly excluded)",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: false,
        notes: "VSC NOT taxable on leases (explicitly excluded)",
      },
      {
        code: "GAP",
        taxable: false,
        notes: "GAP NOT taxable on leases (classified as insurance)",
      },
      {
        code: "ACQUISITION_FEE",
        taxable: false,
        notes: "Acquisition fee NOT taxable (explicitly excluded)",
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
      "Minnesota: UPFRONT lease taxation on total lease price. Tax calculated and paid upfront " +
      "(can be financed). Leases ARE subject to local sales taxes (unlike purchases). Metro " +
      "transit tax (+0.75%) applies in seven-county area. Cash down does NOT reduce tax base " +
      "(unique), but trade-in DOES reduce tax base. All backend products (VSC, GAP) NOT taxed " +
      "if separately stated. Doc fee NOT taxable.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: LIMITED (credit for taxes paid to other states)
   *
   * Minnesota provides LIMITED reciprocity for sales tax paid in other states:
   *
   * Policy: Credit allowed, with Minnesota rate as minimum
   *
   * Official Guidance (MN DOR Motor Vehicle Sales Guide):
   * "If a Minnesota resident registered and paid sales tax to another state,
   * Minnesota allows credit for tax paid to the other state. If the other
   * state's tax rate is lower, then tax is due on the difference in rates
   * to Minnesota."
   *
   * How It Works:
   *
   * Scenario 1: Other State Rate Higher
   *   Vehicle purchased in Wisconsin
   *   Purchase Price: $25,000
   *   Wisconsin Sales Tax (5%): $1,250 (Paid to Wisconsin)
   *
   *   Minnesota Credit: $1,250 (Full credit)
   *   Minnesota Tax Due: $0 (No additional tax - WI rate < MN rate actually,
   *                           but full credit given up to MN tax due)
   *
   * Scenario 2: Other State Rate Lower (Non-Zero)
   *   Vehicle purchased in North Dakota
   *   Purchase Price: $25,000
   *   North Dakota Sales Tax (5%): $1,250 (Paid to ND)
   *
   *   Minnesota Tax Due: $25,000 × 6.875% = $1,718.75
   *   Credit for ND Tax: $1,250
   *   Amount Due to Minnesota: $468.75
   *
   * Scenario 3: No Sales Tax State
   *   Vehicle purchased in Montana (no sales tax)
   *   Purchase Price: $25,000
   *   Montana Sales Tax: $0
   *
   *   Minnesota Tax Due: $1,718.75
   *   Credit for Montana Tax: $0
   *   Amount Due to Minnesota: $1,718.75
   *
   * Documentation Required:
   * - Proof of sales tax payment to other state
   * - Bill of sale or purchase agreement
   * - Tax receipt from other state DMV/DOR
   *
   * When Tax is Collected:
   * Tax is paid to a deputy registrar or Minnesota Driver and Vehicle
   * Services when the vehicle is registered/titled in Minnesota.
   *
   * 60-Day Residency Rule (Exemption):
   * Under § 297B.03, Subd. 3(a), an exemption exists for:
   * "Vehicles purchased by persons who were residents of another state or
   * country more than 60 days prior to becoming Minnesota residents and
   * registered the vehicle in that state or country"
   *
   * Practical Application:
   * - Lived in Wisconsin 5 years, bought car there, moved to MN 3 months later:
   *   NO Minnesota tax due
   * - Bought car in Wisconsin while living in Minnesota:
   *   Minnesota tax due when registered
   *
   * Source: MN DOR Motor Vehicle Sales Guide; Minnesota Statute § 297B.02, § 297B.03
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
      "Minnesota provides credit for sales tax paid to other states, capped at MN rate " +
      "(6.875%). If other state's tax is lower, pay difference to Minnesota. If higher, " +
      "no additional tax owed. Requires proof of tax paid. 60-day residency rule: If you " +
      "were resident of another state 60+ days before becoming MN resident and registered " +
      "vehicle there, NO MN tax due.",
  },

  extras: {
    lastUpdated: "2025-11-13",
    sources: [
      "Minnesota Department of Revenue (revenue.state.mn.us)",
      "Minnesota Statute Chapter 297B - Motor Vehicle Sales Tax",
      "§ 297B.01 (Definitions), § 297B.02 (Tax Imposed 6.875%)",
      "§ 297B.025 (Older Passenger Automobiles $10 flat tax)",
      "§ 297B.03 (Exemptions), § 297B.035 (Collector Vehicles $150 flat tax)",
      "MN DOR Motor Vehicle Sales Guide, Motor Vehicle Leases Guide",
      "MN DOR Motor Vehicle Industry Guide, Warranties and Service Contracts Guide",
      "MN House Research - Motor Vehicle Sales Tax Brief (2023)",
      "Metropolitan Council - Regional Transportation Sales and Use Tax",
    ],
    notes:
      "Minnesota has 6.875% state motor vehicle excise tax (MVET) with NO local sales taxes " +
      "on vehicle PURCHASES (state-only). However, vehicle LEASES are subject to local sales " +
      "taxes. Metro transit tax (+0.75%) for seven-county Minneapolis-St. Paul area applies to " +
      "leases only (effective Oct 1, 2023). Full trade-in credit. BOTH manufacturer AND dealer " +
      "rebates reduce taxable price. Doc fee NOT taxable (average $75). Service contracts and " +
      "GAP NOT taxable. UNIQUE lease treatment: Cash down does NOT reduce vehicle value for tax, " +
      "but trade-in DOES reduce vehicle value. Upfront lease taxation with tax paid at signing " +
      "(can be financed). Special rates: $10 flat tax for 10+ year old vehicles below average " +
      "trade-in value; $150 flat tax for 20+ year old collector vehicles.",
    stateRate: 6.875,
    rateHistorical: {
      "pre-2023-07-01": 6.5,
      "2023-07-01-onwards": 6.875,
    },
    rateIncreaseEffectiveDate: "2023-07-01",
    localExciseTax: 20, // Flat fee, some jurisdictions
    avgDocFee: 75,
    docFeeCapDiscussion: "Legislative discussions of $125-$150 cap (not enacted)",
    metroTransitTax: 0.75, // Seven-county area, leases only
    metroTransitTaxEffectiveDate: "2023-10-01",
    metroCounties: [
      "Hennepin",
      "Ramsey",
      "Dakota",
      "Anoka",
      "Washington",
      "Scott",
      "Carver",
    ],
    annualExciseTaxRate: 2.5, // Property tax, separate from sales tax
    olderVehicleFlatTax: 10, // 10+ years, below average trade-in
    collectorVehicleFlatTax: 150, // 20+ years, exhibition use
  },
};

export default US_MN;
