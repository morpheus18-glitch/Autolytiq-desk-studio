import type { TaxRulesConfig } from "../types";

/**
 * KENTUCKY TAX RULES
 *
 * Researched: 2025-11-14
 * Version: 2
 *
 * KEY FACTS:
 * - Motor Vehicle Usage Tax: 6% flat state rate (STATE_ONLY - no local taxes)
 * - Trade-in credit: FULL (applies to all vehicle types, some restrictions apply)
 * - Manufacturer rebates: NON-TAXABLE (reduce the tax base)
 * - Dealer rebates: NON-TAXABLE (reduce the tax base)
 * - Doc fee: TAXABLE (included in retail price), NO STATE CAP (dealer discretion)
 * - Service contracts (VSC): TAXABLE (included in retail price when sold with vehicle)
 * - GAP insurance: TAXABLE (included in retail price when sold with vehicle)
 * - Accessories: TAXABLE (part of retail price)
 * - Lease method: MONTHLY taxation (tax on each payment)
 * - Reciprocity: FULL (credit for taxes paid to other states, capped at KY rate)
 *
 * UNIQUE KENTUCKY FEATURES:
 * 1. USAGE TAX (not sales tax): Kentucky levies a "motor vehicle usage tax" rather than
 *    a traditional sales tax. This is a distinction in terminology but functions similarly.
 *
 * 2. STATE-ONLY TAX: Unlike most states, Kentucky has NO local taxes on vehicles.
 *    The 6% rate is uniform statewide - same rate in Louisville, Lexington, and rural areas.
 *
 * 3. TRADE-IN CREDIT RESTRICTIONS:
 *    - NEW vehicles: Full trade-in credit applies
 *    - USED vehicles: Trade-in credit applies, but with restrictions:
 *      * Both vehicles (purchased and traded) must be previously registered in Kentucky
 *      * Out-of-state used vehicle purchases NOW allow trade-in credit (recent change)
 *
 * 4. RETAIL PRICE DEFINITION (KRS 138.450):
 *    - For NEW vehicles: Greater of (a) total consideration OR (b) 90% of MSRP
 *    - For USED vehicles: Greater of (a) total consideration OR (b) NADA average retail
 *    - Total consideration = cash + amount financed + trade-in value (before credit)
 *
 * 5. SERVICE CONTRACTS & GAP TAXABLE:
 *    - Service contracts: TAXABLE when sold with vehicle (included in retail price)
 *    - GAP insurance: TAXABLE when sold with vehicle (included in retail price)
 *    - This differs from many states where these are exempt as insurance products
 *
 * 6. NEGATIVE EQUITY: TAXABLE
 *    - Negative equity increases the retail price and is subject to 6% usage tax
 *    - This applies to both retail sales and leases
 *
 * 7. LEASE TAXATION:
 *    - Monthly taxation: Tax applied to each monthly lease payment
 *    - Rate: 6% on each payment
 *    - Trade-in credit: APPLIES to leases (reduces monthly payment calculation)
 *    - Cap cost reduction: NOT taxed separately (only monthly payments are taxed)
 *
 * TAX CALCULATION FORMULA (RETAIL):
 * Retail Price = Greater of:
 *   (a) Total Consideration (Vehicle + Accessories + Doc Fee + VSC + GAP - Trade-In)
 *   (b) 90% MSRP (new) or NADA Average Retail (used)
 * Usage Tax = Retail Price × 6%
 *
 * Example (New Vehicle):
 * Vehicle MSRP: $30,000 (90% = $27,000)
 * Sale Price: $28,000
 * Accessories: $1,500
 * Doc Fee: $350
 * VSC: $1,800
 * GAP: $695
 * Trade-In: $10,000
 *
 * Total Consideration: $28,000 + $1,500 + $350 + $1,800 + $695 = $32,345
 * Less Trade-In: $32,345 - $10,000 = $22,345
 * Retail Price: Greater of $22,345 or $27,000 (90% MSRP) = $27,000
 * Usage Tax: $27,000 × 6% = $1,620
 *
 * LEASE CALCULATION (MONTHLY):
 * Tax Base = Monthly Payment Amount
 * Tax = Monthly Payment × 6%
 *
 * Example:
 * Monthly Payment: $450
 * Monthly Usage Tax: $450 × 6% = $27
 * Total Monthly: $477
 *
 * SOURCES:
 * - Kentucky Department of Revenue (revenue.ky.gov)
 * - Kentucky Revised Statutes (KRS) Chapter 138
 * - KRS 138.450: Definitions (Retail Price)
 * - KRS 138.460: Motor Vehicle Usage Tax - Imposition, Rate, Collection
 * - KRS 138.470: Exemptions from tax
 * - 103 KAR 44:060: Motor Vehicle Usage Tax Valuation
 * - Kentucky County Clerk Offices (Usage Tax Forms and Guidance)
 */
export const US_KY: TaxRulesConfig = {
  stateCode: "KY",
  version: 2,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL
   *
   * Kentucky allows full trade-in credit on motor vehicle usage tax.
   * The trade-in value is deducted from the total consideration before
   * calculating the 6% usage tax.
   *
   * Statutory Basis (KRS 138.450, 103 KAR 44:060):
   * The "retail price" is the total consideration given (cash + financed + trade-in)
   * MINUS the trade-in allowance, OR 90% of MSRP (new) / NADA value (used),
   * whichever is greater.
   *
   * TRADE-IN RESTRICTIONS:
   *
   * NEW Vehicles:
   * - Full trade-in credit applies without restrictions
   * - Trade-in value deducted from total consideration
   *
   * USED Vehicles (Traditional Rule):
   * - Trade-in credit applies ONLY if both vehicles (purchased and traded) were
   *   previously registered in Kentucky
   * - This restriction applied to in-state used vehicle purchases
   *
   * OUT-OF-STATE PURCHASES (Recent Change):
   * - Out-of-state purchases of USED vehicles NOW allow trade-in credit
   * - This represents a policy change to provide more equitable treatment
   *
   * Example:
   *   Vehicle Price: $25,000
   *   Trade-In Value: $10,000
   *   Total Consideration: $25,000
   *   Net Amount: $25,000 - $10,000 = $15,000
   *   Usage Tax (6%): $15,000 × 6% = $900
   *
   * Source: KRS 138.450, 103 KAR 44:060, County Clerk Guidance
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules: Both manufacturer and dealer rebates are NON-TAXABLE
   *
   * Kentucky treats rebates as reductions in the purchase price, which reduces
   * the taxable retail price. This applies to both manufacturer and dealer rebates.
   *
   * MANUFACTURER REBATES:
   * Manufacturer rebates, incentives, and cash-back offers reduce the total
   * consideration and therefore reduce the usage tax liability.
   *
   * Tax Treatment:
   * - Rebate reduces the vehicle purchase price
   * - Usage tax calculated on net price after rebate
   * - Customer benefits from lower tax base
   *
   * Example:
   *   MSRP: $28,000 (90% = $25,200)
   *   Manufacturer Rebate: $3,000
   *   Net Price: $25,000
   *   Total Consideration: $25,000
   *   Retail Price: Greater of $25,000 or $25,200 = $25,200
   *   Usage Tax (6%): $25,200 × 6% = $1,512
   *
   * DEALER REBATES:
   * Dealer discounts, incentives, and promotional offers also reduce the
   * purchase price and therefore the tax base.
   *
   * Source: KRS 138.450 (retail price definition includes "total consideration")
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: false,
      notes:
        "Manufacturer rebates reduce the purchase price and therefore reduce the taxable " +
        "retail price. Usage tax calculated on net amount after rebate.",
    },
    {
      appliesTo: "DEALER",
      taxable: false,
      notes:
        "Dealer rebates and discounts reduce the selling price and therefore reduce the " +
        "taxable retail price. Tax calculated on actual reduced price.",
    },
  ],

  /**
   * Doc Fee: TAXABLE, NO CAP
   *
   * Documentation fees are included in the "retail price" and subject to
   * Kentucky's 6% motor vehicle usage tax.
   *
   * Taxability:
   * Doc fees are part of the total consideration given for the vehicle and
   * are included in the retail price calculation.
   *
   * No Statutory Cap:
   * Kentucky does not impose a statutory limit on dealer documentation fees.
   * - Fees vary by dealership
   * - Typical range: $200 - $500
   * - Dealers have discretion to set their own fees
   *
   * Example:
   *   Vehicle Price: $25,000
   *   Doc Fee: $350
   *   Total Consideration: $25,350
   *   Usage Tax (6%): $25,350 × 6% = $1,521
   *
   * Source: KRS 138.450, County Clerk guidance
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules
   *
   * Kentucky includes most fees and charges in the "retail price" definition,
   * making them subject to the 6% usage tax.
   *
   * SERVICE CONTRACTS (VSC):
   * - TAXABLE when sold with the vehicle
   * - Included in retail price calculation
   * - Subject to 6% usage tax
   * - This differs from states where service contracts are exempt as insurance
   *
   * GAP INSURANCE:
   * - TAXABLE when sold with the vehicle
   * - Included in retail price calculation
   * - Subject to 6% usage tax
   * - Kentucky does not exempt GAP as insurance product for usage tax purposes
   *
   * TITLE FEE:
   * - NOT taxable (government fee)
   * - Kentucky Certificate of Title fee
   * - Separately stated and collected by County Clerk
   *
   * REGISTRATION FEES:
   * - NOT taxable (government fees)
   * - License plate and registration fees collected by County Clerk
   *
   * COUNTY CLERK FEE:
   * - NOT taxable (government processing fee)
   * - Administrative fee charged by County Clerk's office
   *
   * Source: KRS 138.450 (retail price definition), County Clerk guidance
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: true,
      notes:
        "Service contracts (VSC) are TAXABLE in Kentucky when sold with vehicle. Included " +
        "in retail price subject to 6% usage tax. Kentucky treats these as part of the vehicle " +
        "purchase, not as separate insurance products.",
    },
    {
      code: "GAP",
      taxable: true,
      notes:
        "GAP insurance is TAXABLE in Kentucky when sold with vehicle. Included in retail " +
        "price subject to 6% usage tax. Unlike many states, Kentucky does not exempt GAP.",
    },
    {
      code: "DOC_FEE",
      taxable: true,
      notes:
        "Doc fees are TAXABLE at 6% usage tax rate. Kentucky has NO cap on doc fees " +
        "(dealer discretion). Typical range $200-$500.",
    },
    {
      code: "TITLE",
      taxable: false,
      notes:
        "Title fee is NOT taxable (government fee collected by County Clerk). Separately " +
        "stated on invoice.",
    },
    {
      code: "REG",
      taxable: false,
      notes:
        "Registration fees are NOT taxable (government fees collected by County Clerk).",
    },
    {
      code: "CLERK_FEE",
      taxable: false,
      notes:
        "County Clerk processing fees are NOT taxable (government administrative fees).",
    },
  ],

  /**
   * Product Taxability
   *
   * Accessories: TAXABLE
   * - Dealer-installed accessories included in retail price
   * - Subject to 6% usage tax
   * - No distinction between factory and aftermarket accessories
   *
   * Negative Equity: TAXABLE
   * - Negative equity rolled into purchase increases retail price
   * - Subject to 6% usage tax
   * - Applies to both sales and leases
   *
   * Service Contracts: TAXABLE
   * - When sold with vehicle, included in retail price
   *
   * GAP: TAXABLE
   * - When sold with vehicle, included in retail price
   *
   * Example with Negative Equity:
   *   Vehicle Price: $22,000
   *   Trade-In Value: $10,000
   *   Trade-In Payoff: $13,000
   *   Negative Equity: $3,000
   *
   *   Total Consideration: $22,000 + $3,000 = $25,000
   *   Less Trade-In: $25,000 - $10,000 = $15,000
   *   Usage Tax (6%): $15,000 × 6% = $900
   *   (Negative equity increases the tax base)
   *
   * Source: KRS 138.450, 103 KAR 44:060
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: true,
  taxOnServiceContracts: true,
  taxOnGap: true,

  /**
   * Vehicle Tax Scheme: STATE_ONLY
   *
   * Kentucky uses a flat 6% state motor vehicle usage tax with NO local taxes.
   * This is unusual among states - most have either state+local or varying rates.
   *
   * State Usage Tax: 6.0%
   * - Uniform statewide rate (KRS 138.460)
   * - No county taxes
   * - No city/municipal taxes
   * - No special district taxes
   *
   * Same Rate Everywhere:
   * - Louisville (Jefferson County): 6.0%
   * - Lexington (Fayette County): 6.0%
   * - Rural counties: 6.0%
   * - No variation by location
   *
   * Tax Collection:
   * - Usage tax paid to County Clerk at time of registration
   * - County Clerk collects and remits to Kentucky Department of Revenue
   * - Tax certificate issued upon payment
   *
   * Terminology:
   * Kentucky uses "usage tax" rather than "sales tax" for motor vehicles.
   * This reflects that the tax is on the "use" of the vehicle in Kentucky,
   * not the sale transaction itself. However, it functions similarly to
   * sales tax in most respects.
   *
   * Source: KRS 138.460, County Clerk guidance
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
     * Kentucky taxes leases on a MONTHLY basis. The 6% usage tax is applied
     * to each monthly lease payment.
     *
     * Legal Framework (KRS 138.460):
     * The usage tax applies to the "rental" of motor vehicles, with tax
     * collected on the periodic rental payments.
     *
     * Tax Rate: 6%
     * - Applied to each monthly payment
     * - Same rate as retail sales
     * - No local taxes apply
     *
     * Calculation:
     * Monthly Usage Tax = Monthly Payment × 6%
     *
     * Example:
     *   Monthly Payment: $450
     *   Usage Tax: $450 × 6% = $27
     *   Total Monthly: $477
     *
     * Tax Timing:
     * - Tax collected with each monthly payment
     * - Not paid upfront
     * - No tax on cap cost reduction (only on payments)
     *
     * Source: KRS 138.460, County Clerk guidance
     */
    method: "MONTHLY",

    /**
     * Cap Cost Reduction: NOT TAXED
     *
     * Kentucky does NOT tax capitalized cost reductions upfront on leases.
     * Only the monthly lease payments are subject to the 6% usage tax.
     *
     * Not Taxable:
     * - Cash down payments
     * - Manufacturer rebates applied as cap reduction
     * - Trade-in equity
     * - Dealer discounts applied as cap reduction
     *
     * Tax Treatment:
     * Cap cost reductions reduce the monthly payment amount, which in turn
     * reduces the monthly usage tax. The benefit is realized through lower
     * monthly taxes, not through an exemption.
     *
     * Example:
     *   Gross Cap Cost: $35,000
     *   Cap Reduction (cash + rebate): $5,000
     *   Adjusted Cap Cost: $30,000
     *
     *   Monthly Payment (before cap reduction): $500
     *   Monthly Payment (after cap reduction): $430
     *
     *   Tax on Higher Payment: $500 × 6% = $30
     *   Tax on Lower Payment: $430 × 6% = $25.80
     *   Monthly Savings: $4.20 in tax
     *
     * Source: KRS 138.460, lease taxation guidance
     */
    taxCapReduction: false,

    /**
     * Rebate Behavior on Leases: FOLLOW_RETAIL_RULE
     *
     * Rebates on leases follow the same treatment as retail purchases:
     * they are NON-TAXABLE and reduce the cost basis.
     *
     * When rebates reduce the cap cost, they lower the monthly payment,
     * which in turn reduces the monthly usage tax.
     *
     * Source: KRS 138.460
     */
    rebateBehavior: "FOLLOW_RETAIL_RULE",

    /**
     * Doc Fee on Leases: ALWAYS taxable
     *
     * Documentation fees on leases are subject to usage tax.
     *
     * Application:
     * - If doc fee paid upfront: Taxed as part of upfront charges
     * - If capitalized into lease: Increases monthly payment and monthly tax
     *
     * Most Common Treatment:
     * Doc fees are typically paid upfront and taxed at inception.
     *
     * Example:
     *   Doc Fee: $350
     *   Paid upfront
     *   Tax (6%): $350 × 6% = $21
     *
     * Source: County Clerk guidance, KRS 138.460
     */
    docFeeTaxability: "FOLLOW_RETAIL_RULE",

    /**
     * Trade-in Credit on Leases: FULL
     *
     * Kentucky ALLOWS trade-in credit on leases, which is beneficial for lessees.
     *
     * Trade-In Treatment:
     * - Trade-in equity can be applied as cap cost reduction
     * - This reduces the adjusted cap cost
     * - Lower cap cost = lower monthly payment
     * - Lower monthly payment = lower monthly usage tax
     *
     * This is DIFFERENT from some states (like Alabama) where lease trade-ins
     * receive no credit and are actually taxed.
     *
     * Example:
     *   Gross Cap Cost: $32,000
     *   Trade-In Equity: $8,000
     *   Adjusted Cap Cost: $24,000
     *
     *   Monthly Payment (without trade): $460
     *   Monthly Payment (with trade): $345
     *
     *   Monthly Tax (without trade): $460 × 6% = $27.60
     *   Monthly Tax (with trade): $345 × 6% = $20.70
     *   Monthly Savings: $6.90 in tax
     *
     * This makes leasing more attractive in Kentucky for customers with trade-ins.
     *
     * Source: KRS 138.460, County Clerk guidance
     */
    tradeInCredit: "FULL",

    /**
     * Negative Equity on Leases: TAXABLE
     *
     * Negative equity rolled into a lease increases the cap cost and
     * therefore increases the monthly payment and monthly usage tax.
     *
     * Treatment:
     * - Negative equity added to gross cap cost
     * - Increases adjusted cap cost
     * - Results in higher monthly payment
     * - Higher payment = more monthly tax
     *
     * Example:
     *   Base Cap Cost: $28,000
     *   Trade-In Value: $10,000
     *   Trade-In Payoff: $13,500
     *   Negative Equity: $3,500
     *
     *   Adjusted Cap Cost: $28,000 + $3,500 = $31,500
     *
     *   Monthly Payment: $460 (includes negative equity)
     *   Monthly Tax: $460 × 6% = $27.60
     *
     * The negative equity indirectly increases tax by increasing the payment.
     *
     * Source: KRS 138.460, lease calculation methodology
     */
    negativeEquityTaxable: true,

    /**
     * Fee Taxability on Leases
     *
     * Lease fee taxability generally follows retail rules with some distinctions:
     *
     * DOC FEE:
     * - TAXABLE on leases (typically upfront)
     *
     * SERVICE CONTRACTS (VSC):
     * - When capitalized into lease: Generally NOT separately taxed
     * - When paid upfront: Treatment varies (consult County Clerk)
     * - Monthly payment tax already includes entire payment amount
     *
     * GAP INSURANCE:
     * - When capitalized into lease: Generally NOT separately taxed
     * - Monthly payment tax includes GAP portion
     *
     * TITLE FEE:
     * - NOT taxable (government fee)
     *
     * REGISTRATION FEES:
     * - NOT taxable (government fees)
     *
     * Note: For leases, backend products (VSC, GAP) capitalized into monthly
     * payments are taxed as part of the overall monthly payment. There's no
     * separate VSC/GAP tax calculation.
     *
     * Source: County Clerk guidance, KRS 138.460
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: true,
        notes: "Doc fee TAXABLE on leases. Typically taxed upfront at 6%.",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: true,
        notes:
          "Service contracts TAXABLE on leases (6% usage tax applies). " +
          "Taxed as part of monthly payment calculation.",
      },
      {
        code: "GAP",
        taxable: true,
        notes:
          "GAP TAXABLE on leases (6% usage tax applies). " +
          "Taxed as part of monthly payment calculation.",
      },
      {
        code: "TITLE",
        taxable: false,
        notes: "Title fee NOT taxable (government fee).",
      },
      {
        code: "REG",
        taxable: false,
        notes: "Registration fees NOT taxable (government fees).",
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
      "Kentucky: MONTHLY lease taxation at 6% state rate (no local taxes). Tax applied to " +
      "each monthly payment. Cap cost reduction NOT taxed separately (only payments taxed). " +
      "Trade-in credit APPLIES to leases (reduces monthly payment and tax). Doc fee taxable. " +
      "Backend products (VSC, GAP) taxed as part of monthly payment when capitalized.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: FULL (credit for taxes paid to other states)
   *
   * Kentucky provides credit for motor vehicle usage/sales taxes paid to
   * other states, preventing double taxation.
   *
   * Policy (KRS 138.460):
   * Kentucky residents who purchase vehicles in other states and pay sales/use
   * tax to that state receive credit against Kentucky's usage tax.
   *
   * How It Works:
   *
   * Scenario 1: Other State Tax ≥ Kentucky Tax (6%)
   * If tax paid to another state equals or exceeds Kentucky's 6% usage tax,
   * NO additional Kentucky usage tax is due.
   *
   * Example:
   *   Vehicle purchased in Illinois: $25,000
   *   Illinois tax paid (7.25%): $1,812.50
   *   Kentucky tax would be (6%): $1,500
   *   Credit allowed: $1,500
   *   Additional KY tax due: $0
   *
   * Scenario 2: Other State Tax < Kentucky Tax (6%)
   * If tax paid to another state is less than Kentucky's 6%, pay the DIFFERENCE.
   *
   * Example:
   *   Vehicle purchased in Tennessee: $25,000
   *   Tennessee tax paid (7% state, but local varies): $1,750
   *   Kentucky tax due (6%): $1,500
   *   Credit allowed: $1,500
   *   Additional KY tax due: $0
   *
   * Example (Lower Tax State):
   *   Vehicle purchased in Delaware: $25,000
   *   Delaware tax paid (0%): $0
   *   Kentucky tax due (6%): $1,500
   *   Credit allowed: $0
   *   Additional KY tax due: $1,500
   *
   * Credit Cap:
   * Credit is capped at Kentucky's usage tax liability (6% of retail price).
   * If you paid more to another state, you don't get a refund, but you don't
   * owe additional Kentucky tax.
   *
   * Documentation Required:
   * - Bill of sale showing vehicle price
   * - Receipt showing taxes paid to other state
   * - Proof of payment (tax receipt from other state)
   * - Documentation provided to County Clerk at registration
   *
   * Out-of-State Purchases:
   * Kentucky residents who purchase vehicles out of state must:
   * 1. Bring vehicle to Kentucky for registration
   * 2. Provide proof of tax paid to other state
   * 3. Pay any difference between other state's tax and Kentucky's 6%
   * 4. County Clerk processes reciprocity credit
   *
   * Source: KRS 138.460, County Clerk guidance, Department of Revenue
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
      "Kentucky provides FULL reciprocal credit for taxes paid to other states, capped at " +
      "Kentucky's 6% usage tax. Credit applies to both purchases and leases. Proof of tax " +
      "payment required (provide to County Clerk at registration). If other state tax < 6%, " +
      "pay difference. If other state tax ≥ 6%, no additional Kentucky tax due.",
  },

  extras: {
    lastUpdated: "2025-11-14",
    sources: [
      "Kentucky Department of Revenue (revenue.ky.gov)",
      "Kentucky Revised Statutes (KRS) Chapter 138",
      "KRS 138.450: Definitions (Retail Price)",
      "KRS 138.460: Motor Vehicle Usage Tax - Imposition, Rate, Collection",
      "KRS 138.470: Exemptions from tax",
      "103 KAR 44:060: Motor Vehicle Usage Tax Valuation",
      "Kentucky County Clerk Offices (Usage Tax Forms and Guidance)",
      "Kentucky Transportation Cabinet - Motor Vehicle Licensing",
    ],
    notes:
      "Kentucky levies a uniform 6% Motor Vehicle Usage Tax (state only, no local taxes on vehicles). Trade-in " +
      "credit applies to all vehicles (some restrictions on used vehicles). Rebates are " +
      "NON-TAXABLE (reduce tax base). Service contracts and GAP are TAXABLE when sold with " +
      "vehicle. Doc fee taxable, NO CAP. Retail price = greater of (total consideration - trade) " +
      "or (90% MSRP for new / NADA for used). Lease taxation: MONTHLY at 6%, cap reduction NOT " +
      "taxed separately, trade-in credit APPLIES. Full reciprocity for taxes paid to other states.",
    stateUsageTaxRate: 6.0,
    stateGeneralSalesRate: 6.0,
    flatUsageTaxRate: 0.06,
    motorVehicleUsageTax: 6.0,
    localTaxes: false,
    flatTaxRate: true,
    msrpFloor: 0.9, // 90% of MSRP for new vehicles
    titleFee: 9.0,
    clerkFee: 6.0, // County Clerk processing fee
  },
};

export default US_KY;
