import type { TaxRulesConfig } from "../types";

/**
 * MISSOURI TAX RULES
 *
 * Researched: 2025-11-13
 * Version: 1
 *
 * KEY FACTS:
 * - State sales tax: 4.225% (one of the lower state rates)
 * - Local rates: Yes, varies significantly by jurisdiction (0.5% - 7.755%)
 * - Combined rate range: 4.725% - 11.98% (Kansas City up to 11.98%, St. Louis City up to 11.68%)
 * - Trade-in credit: FULL (unlimited, deducted from sale price before tax)
 * - Doc fee: Taxable, capped at $604.47 (2025, annually adjusted for CPI-U)
 * - Manufacturer rebates: NOT taxable (reduce sale price)
 * - Dealer rebates: NOT taxable (also reduce sale price - same as manufacturer)
 * - Service contracts & GAP: NOT taxable (if separately stated)
 * - Lease taxation: MONTHLY (tax on each payment + down payment)
 * - Reciprocity: YES (90-day rule - credit for taxes paid elsewhere)
 *
 * UNIQUE MISSOURI FEATURES:
 * - Dealer collection mandate: NEW as of August 28, 2025 (Senate Bill 28)
 *   - Law signed but NOT yet implemented (waiting for FUSION system late 2026/early 2027)
 *   - Until FUSION launches, current process continues (buyer pays at DMV within 30 days)
 * - 90-day reciprocity rule: If vehicle operated in another state 90+ days, NO Missouri tax due
 * - Total Loss Tax Credit: Can offset insurance payoff + deductible against replacement vehicle
 * - Agricultural trade-ins: Farmers can trade grain/livestock for agricultural vehicles
 * - Doc fee revenue share: 10% to Motor Vehicle Admin Tech Fund (drops to 3.5% after FUSION, expires 2037)
 * - Tax jurisdiction: Based on PURCHASER'S address, not dealer location
 * - Temporary tags: Currently 90-day tags; will change to 30-day (or 60-day with bond) after FUSION
 *
 * TAX CALCULATION FORMULA:
 * Taxable Amount = Vehicle Price - Trade-In Value - Manufacturer Rebate - Dealer Rebate + Doc Fee + Accessories
 * (VSC and GAP NOT included if separately stated)
 *
 * Example (Kansas City at 8.73%):
 * $30,000 vehicle - $10,000 trade - $2,000 mfr rebate - $500 dealer rebate + $600 doc fee + $1,200 accessories = $19,300
 * Tax: $19,300 × 8.73% = $1,684.89
 *
 * SOURCES:
 * - Missouri Department of Revenue (dor.mo.gov)
 * - Revised Statutes of Missouri (RSMo) § 144.020, § 144.070, § 301.558
 * - Missouri Code of State Regulations (CSR) 12 CSR 10-103.350, 12 CSR 10-26.231
 * - Senate Bill 28 (2025) - Dealer Collection Mandate
 * - Missouri DOR Motor Vehicle Sales Tax Rate Charts (updated annually)
 */
export const US_MO: TaxRulesConfig = {
  stateCode: "MO",
  version: 1,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL (unlimited credit)
   *
   * Missouri provides 100% trade-in credit with no cap. The trade-in value is
   * completely deducted from the vehicle purchase price before calculating sales tax.
   *
   * IMPORTANT: Tax is calculated on the NET purchase price (vehicle price minus
   * trade-in value). If trade-in value exceeds vehicle purchase price, NO tax is due.
   *
   * Formula:
   *   Taxable Amount = Vehicle Price - Trade-In Allowance - Rebates
   *
   * Example:
   *   $30,000 vehicle - $10,000 trade-in - $2,000 rebate = $18,000 taxable
   *   Tax @ 4.225% = $760.50
   *
   * Out-of-State Purchase Trade-Ins:
   * - Must provide proof of trade-in to receive credit when titling in Missouri
   * - Acceptable proof: Copy of title assigned to dealer OR Secure Power of Attorney
   *
   * Agricultural Exception:
   * - Grain or livestock produced by purchaser may be traded for agricultural
   *   vehicles from licensed dealers (unique Missouri provision)
   *
   * Source: 12 CSR 10-103.350(2)(A), RSMo § 144.070
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules:
   *
   * Missouri treats BOTH manufacturer AND dealer rebates as NON-TAXABLE.
   * This is somewhat unusual - most states only allow manufacturer rebates
   * to reduce the tax base.
   *
   * MANUFACTURER REBATES:
   * - Deducted from purchase price BEFORE calculating sales tax
   * - Customer does not pay tax on rebate amount
   * - Rebate must be applied at time of sale
   *
   * DEALER REBATES/INCENTIVES:
   * - Also deducted from purchase price (same treatment as manufacturer rebates)
   * - Missouri does not distinguish between manufacturer and dealer incentives
   *
   * Example (Combined):
   *   Vehicle Price: $18,000
   *   Dealer Rebate: $500
   *   Trade-In: $3,000
   *   Taxable Amount: $14,500 ($18,000 - $500 - $3,000)
   *
   * Source: 12 CSR 10-103.350(1)
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: false,
      notes:
        "Manufacturer rebates reduce the purchase price before sales tax calculation. " +
        "Tax is calculated on the net amount after rebate.",
    },
    {
      appliesTo: "DEALER",
      taxable: false,
      notes:
        "Dealer rebates/incentives ALSO reduce purchase price (same as manufacturer rebates). " +
        "Missouri does not distinguish between manufacturer and dealer incentives for tax purposes.",
    },
  ],

  /**
   * Doc Fee: TAXABLE, capped at $604.47 (2025)
   *
   * Missouri documentary/administrative fees are:
   * 1. Subject to sales tax (included in taxable purchase price)
   * 2. Capped at $604.47 for 2025 licensure year
   * 3. Adjusted annually based on CPI-U (Consumer Price Index for All Urban Consumers)
   * 4. Published in Missouri Register by January 15 each year
   *
   * Historical Caps:
   * - 2024: $587.43
   * - 2025: $604.47 (2.9% increase)
   *
   * Statutory Requirements:
   * - What dealers MAY charge for:
   *   • Document storage services
   *   • Administrative or clerical services
   *
   * - What dealers MAY NOT charge for:
   *   • Filling in blanks on standardized forms
   *   • Drafting, preparation, or completion of documents
   *   • Providing legal advice
   *
   * Disclosure Requirements:
   * - Must be itemized separately on retail buyer's order form
   * - Must display conspicuous notice (bold, capitalized, or underlined):
   *   "AN ADMINISTRATIVE FEE IS NOT AN OFFICIAL FEE AND IS NOT REQUIRED BY LAW
   *    BUT MAY BE CHARGED BY A DEALER. A PORTION OF THE ADMINISTRATIVE FEE MAY
   *    RESULT IN PROFIT TO THE MOTOR VEHICLE DEALER."
   *
   * Uniform Pricing:
   * - Must charge same fee to all retail customers
   * - Exception: Franchise agreements may limit fees to certain customer classes
   *
   * Revenue Share:
   * - 10% of fee remitted to Motor Vehicle Administration Technology Fund
   * - Reduced to 3.5% after FUSION system fully operational
   * - Program expires January 1, 2037
   *
   * Source: RSMo § 301.558, 12 CSR 10-26.231
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules:
   *
   * Missouri provides generous exemptions for service contracts and GAP insurance,
   * but they MUST be separately stated on the invoice to qualify.
   *
   * SERVICE CONTRACTS (VSC):
   * - NOT taxable if separately stated and optional
   * - Customer must have choice to decline
   * - HOWEVER: Replacement parts used under service contracts ARE taxable
   *
   * GAP INSURANCE:
   * - NOT taxable (classified as insurance product)
   * - Insurance policies are generally exempt from Missouri sales tax
   *
   * ACCESSORIES:
   * - Taxable (all sales of tangible personal property subject to tax)
   * - Exemptions only for:
   *   • Parts for vehicles being resold (dealer exemption)
   *   • Common carrier repair/maintenance materials
   *   • Large commercial vehicles (>54,000 lbs) repair parts
   *
   * Example:
   *   Vehicle: $30,000 (taxable)
   *   VSC (separately stated): $2,000 (NOT taxable)
   *   GAP: $795 (NOT taxable)
   *   Accessories: $1,400 (taxable)
   *   Taxable Amount: $31,400
   *   Tax @ 4.225%: $1,326.65
   *
   * If NOT Separately Stated:
   * - Service contract cost becomes part of total taxable purchase price
   *
   * Source: 12 CSR 10-103.600, Missouri Sales Tax Handbook
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: false,
      notes:
        "Vehicle Service Contracts (VSC/extended warranties) are NOT taxable if " +
        "separately stated on invoice and optional. If bundled, becomes taxable. " +
        "Replacement parts used under VSC ARE taxable when purchased.",
    },
    {
      code: "GAP",
      taxable: false,
      notes:
        "GAP (Guaranteed Asset Protection) is NOT taxable (classified as insurance product). " +
        "Note: Missouri requires insurers to reimburse sales tax for replacement vehicles " +
        "after total loss claims.",
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
   * - Accessories: TAXABLE (all dealer-added accessories and labor for installation)
   * - Negative equity: NOT taxable (rolled into loan but not part of vehicle purchase price)
   * - Service contracts: NOT taxable (if separately stated)
   * - GAP: NOT taxable (insurance product)
   *
   * Negative Equity Treatment:
   * Missouri tax is calculated only on the NET purchase price (new vehicle price
   * minus trade-in value). Negative equity is financed debt but is NOT subject
   * to sales tax.
   *
   * Example:
   *   New Vehicle: $30,000
   *   Trade-In Value: $5,000
   *   Amount Owed on Trade: $8,000
   *   Negative Equity: $3,000
   *
   *   Taxable Amount: $25,000 ($30,000 - $5,000 trade value)
   *   Tax @ 4.225%: $1,056.25
   *   Loan Amount: $28,000 ($30,000 - $5,000 + $3,000 negative equity)
   *
   * The $3,000 negative equity is financed but NOT taxed.
   *
   * Source: 12 CSR 10-103.350, Missouri sales tax calculations
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: false,
  taxOnServiceContracts: false,
  taxOnGap: false,

  /**
   * Vehicle Tax Scheme: STATE_PLUS_LOCAL
   *
   * Missouri uses a combined state and local sales tax system with significant
   * variation by jurisdiction:
   *
   * State Sales Tax: 4.225%
   *
   * Local Sales Tax: 0.5% - 7.755% (varies by county, city, and special districts)
   *
   * Combined Rates by Major Markets:
   * - Statewide Range: 4.725% - 11.98%
   * - Kansas City: 8.73% - 11.98%
   * - St. Louis City: 9.68% - 11.68%
   * - St. Louis County: 8.99% - 11.00%
   *
   * CRITICAL: Tax jurisdiction is based on PURCHASER'S ADDRESS (residence),
   * not the dealership location.
   *
   * Official Rate Charts:
   * - Missouri DOR maintains Motor Vehicle Sales Tax Rate Charts
   * - Updated annually with specific rates by county and municipality
   * - Available at: https://dor.mo.gov/pdf/localsales.pdf
   *
   * Special Taxing Districts:
   * Local rates include city taxes, county taxes, and special district taxes such as:
   * - Transportation Development Districts (TDD)
   * - Community Improvement Districts (CID)
   * - Neighborhood Improvement Districts (NID)
   *
   * Why Rates Vary:
   * Missouri has one of the most complex local tax structures in the nation,
   * with rates varying by specific address (not just city/county). Always use
   * the official Missouri DOR rate lookup tool for accurate rates.
   *
   * Source: MO DOR 2025 Statewide Sales/Use Tax Rate Tables, 12 CSR 10-103.350
   */
  vehicleTaxScheme: "STATE_PLUS_LOCAL",
  vehicleUsesLocalSalesTax: true,

  // ============================================================================
  // LEASE TRANSACTION RULES
  // ============================================================================

  leaseRules: {
    /**
     * Lease Method: MONTHLY (with down payment tax)
     *
     * Missouri allows motor vehicle leasing companies to elect one of two
     * tax treatment methods:
     *
     * OPTION A: Pay Tax on Vehicle Purchase
     * - Leasing company pays full sales tax when purchasing vehicle
     * - No tax collected from lessee on lease payments
     *
     * OPTION B: Collect Tax on Lease Receipts (MOST COMMON)
     * - Leasing company purchases vehicle tax-free
     * - Sales tax collected from lessee on:
     *   1. DOWN PAYMENT (capitalized cost reduction) - taxed upfront
     *   2. MONTHLY LEASE PAYMENTS - taxed each month
     *
     * Jurisdiction Rules:
     * - Leases > 60 days: Tax based on LESSEE'S address
     * - Leases ≤ 60 days: Tax based on LEASING COMPANY'S location
     *
     * Leasing Company Registration:
     * - Annual fee: $250
     * - Must apply for authority to collect and remit sales tax
     * - Receives 2% retention allowance on collected taxes
     *
     * Example (Kansas City at 8.73%):
     *   Cap Cost Reduction (down): $3,000
     *   Tax on Down Payment: $261.90 (due at signing)
     *
     *   Monthly Payment: $450
     *   Tax per Month: $39.29
     *
     * Source: RSMo § 144.070, 12 CSR 10-103.350(5)
     */
    method: "MONTHLY",

    /**
     * Cap Cost Reduction: TAXABLE (different from most states)
     *
     * In Missouri, the DOWN PAYMENT (capitalized cost reduction) IS taxable
     * on leases. This includes:
     * - Cash down payment
     * - Trade-in allowance
     * - Manufacturer rebates applied to cap cost
     *
     * The cap cost reduction is taxed UPFRONT at lease signing and is part
     * of the "due at signing" amount.
     *
     * This differs from purchase transactions where trade-ins are NOT taxable.
     *
     * Example:
     *   Gross Cap Cost: $35,000
     *   Trade-In Allowance: $5,000
     *   Net Cap Cost: $30,000
     *
     *   Tax on Trade-In: $5,000 × 8.73% = $436.50 (due at signing)
     *   Tax on Monthly Payment: $450 × 8.73% = $39.29 (per month)
     *
     * Source: 12 CSR 10-103.350(5)(A)
     */
    taxCapReduction: true,

    /**
     * Rebate Behavior on Leases: TAXABLE (as part of cap reduction)
     *
     * Manufacturer and dealer rebates applied to lease cap cost reduction
     * are TAXABLE (as part of the cap cost reduction that is taxed upfront).
     *
     * This is different from retail where rebates reduce the taxable base.
     */
    rebateBehavior: "ALWAYS_TAXABLE",

    /**
     * Doc Fee on Leases: ALWAYS taxable
     *
     * Doc fees on leases are:
     * - Taxable (included in "lease receipts")
     * - Subject to same $604.47 cap (2025) as retail
     * - Typically charged at lease inception and subject to sales tax
     *
     * Source: RSMo § 301.558, 12 CSR 10-26.231
     */
    docFeeTaxability: "ALWAYS",

    /**
     * Trade-in Credit on Leases: NONE (trade-in is taxed)
     *
     * Unlike retail purchases (where trade-ins are NOT taxable), trade-in
     * value applied to a lease IS subject to sales tax as part of the
     * capitalized cost reduction.
     *
     * The trade-in value reduces the capitalized cost (lowering monthly
     * payments), but the trade-in value itself is taxed upfront.
     *
     * This is a critical difference that dealers should explain to customers
     * when comparing lease vs. purchase options.
     *
     * Source: 12 CSR 10-103.350(5)(A)
     */
    tradeInCredit: "NONE",

    /**
     * Negative Equity on Leases: NOT taxable
     *
     * Negative equity rolled into a lease is NOT separately taxable.
     * It increases the gross cap cost but doesn't create additional tax
     * beyond the tax on the cap cost reduction and monthly payments.
     */
    negativeEquityTaxable: false,

    /**
     * Fee Taxability on Leases:
     *
     * - Doc fee: TAXABLE (same as retail, capped at $604.47)
     * - Service contracts: NOT taxable if separately stated and optional
     * - GAP: NOT taxable (insurance products exempt)
     *
     * Monthly Payment Impact:
     * If VSC or GAP is rolled into monthly payment without separate
     * itemization, that portion becomes taxable. Best practice: charge
     * separately to avoid tax.
     *
     * Example:
     *   Base Monthly Payment: $400 (taxable)
     *   VSC (separately charged): $50 (NOT taxable if itemized)
     *   GAP (insurance): $30 (NOT taxable)
     *
     *   Taxable Amount: $400
     *   Tax @ 8.73%: $34.92
     *   Total Monthly Bill: $480 + $34.92 = $514.92
     *
     * Source: Missouri sales tax exemptions, service contract rules
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: true,
        notes: "Doc fee taxable on leases, capped at $604.47 (2025)",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: false,
        notes: "VSC NOT taxable if separately stated (same as retail)",
      },
      {
        code: "GAP",
        taxable: false,
        notes: "GAP NOT taxable (insurance products exempt)",
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
      "Missouri: Monthly lease taxation with DOWN PAYMENT also taxed upfront. Tax on " +
      "capitalized cost reduction (cash down + trade-in + rebates) due at signing. " +
      "Tax on monthly payments collected each month. Service contracts and GAP NOT taxed " +
      "if separately stated. Doc fee capped at $604.47 (2025). Leases >60 days taxed at " +
      "lessee's address rate; ≤60 days at lessor's location rate.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: YES (with 90-day rule)
   *
   * Missouri provides credit for sales/use taxes paid to other states with
   * a unique 90-day operational rule:
   *
   * 90-DAY RULE (No Tax Due):
   * If vehicle is registered in another state and REGULARLY OPERATED there
   * for at least 90 days prior to Missouri registration:
   *   → NO Missouri tax is due
   *
   * WITHIN 90 DAYS (Credit Applied):
   * If vehicle is brought to Missouri WITHIN 90 days of registering in
   * another state:
   *   → Missouri tax IS due
   *   → CREDIT given for taxes paid to other state
   *   → Pay only the difference (if Missouri rate is higher)
   *
   * Formula:
   *   Missouri Tax Due = (MO Rate × Purchase Price) - Tax Paid to Other State
   *   If result is negative or zero, no additional tax due
   *
   * Example 1: No Tax Due (90+ Days)
   *   Purchase in Illinois: $30,000
   *   Registered in IL: January 1, 2025
   *   Operated in IL: 90+ days
   *   Brought to MO: April 15, 2025
   *   Missouri Tax Due: $0
   *
   * Example 2: Credit Applied (<90 Days)
   *   Purchase in Kansas: $30,000
   *   KS Sales Tax Paid: $675 (2.25%)
   *   Registered in KS: February 1, 2025
   *   Brought to MO: March 15, 2025 (43 days)
   *   MO Tax Rate: 8.73% (Kansas City)
   *
   *   MO Tax Owed: $2,619.00
   *   Credit for KS Tax: -$675.00
   *   Net MO Tax Due: $1,944.00
   *
   * 30-Day Out-of-State Title Rule:
   * If vehicle is purchased and TITLED out-of-state within 30 days of
   * purchase before titling in Missouri:
   *   → NO Missouri tax is due
   *
   * Documentation Required:
   * - Proof of tax paid to other state
   * - Registration documentation showing dates
   * - For trade-ins on out-of-state purchases: proof of trade-in
   *
   * Credit Limitations:
   * - Credit applies only to sales/use tax paid, not other fees
   * - Maximum credit is the amount that would have been due in Missouri
   * - No refund if other state's tax was higher than Missouri's
   *
   * Source: 12 CSR 10-103.350(4), Buying a Vehicle (MO DOR)
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
      "Missouri provides reciprocity with unique 90-day rule: If vehicle operated in " +
      "another state 90+ days before MO registration, NO tax due. If <90 days, credit " +
      "given for other state's tax. Also: 30-day out-of-state title rule (no MO tax if " +
      "titled out-of-state within 30 days of purchase). Requires proof of tax paid and " +
      "registration dates.",
  },

  extras: {
    lastUpdated: "2025-11-13",
    sources: [
      "Missouri Department of Revenue (dor.mo.gov)",
      "Revised Statutes of Missouri (RSMo) § 144.020, § 144.070, § 301.558",
      "Missouri Code of State Regulations 12 CSR 10-103.350 (Motor Vehicle Sales Tax)",
      "12 CSR 10-26.231 (Maximum Dealer Administrative Fees)",
      "Senate Bill 28 (2025) - Dealer Sales Tax Collection Mandate",
      "MO DOR Motor Vehicle Sales Tax Rate Charts (annual)",
      "MO DOR 2025 Statewide Sales/Use Tax Rate Tables",
    ],
    notes:
      "Missouri has 4.225% state + 0.5%-7.755% local = 4.725%-11.98% combined sales tax. " +
      "Tax jurisdiction based on PURCHASER'S address. Full trade-in credit (unlimited). " +
      "BOTH manufacturer AND dealer rebates reduce taxable price (unusual). Doc fee capped " +
      "at $604.47 (2025, annually adjusted for CPI-U). Service contracts and GAP NOT taxable " +
      "if separately stated. IMPORTANT: Dealer collection mandate signed (Aug 28, 2025) but " +
      "NOT implemented - waiting for FUSION system (late 2026/early 2027). Until then, buyers " +
      "pay tax at DMV within 30 days. 90-day reciprocity rule unique to Missouri. Total loss " +
      "tax credit available for replacement vehicles within 180 days.",
    stateRate: 4.225,
    minLocalRate: 0.5,
    maxLocalRate: 7.755,
    minCombinedRate: 4.725,
    maxCombinedRate: 11.98,
    docFeeCapAmount: 604.47, // 2025
    docFeeCapYear: 2025,
    fusionSystemLaunch: "late 2026 or early 2027 (projected)",
    dealerCollectionMandateSignedDate: "2025-08-28",
    dealerCollectionMandateEffectiveDate: "pending FUSION system operational",
    temporaryTagsPre: "90 days",
    temporaryTagsPost: "30 days standard, 60 days with $100,000 bond",
    reciprocity90DayRule: true,
    totalLossCreditWindow: 180, // days
    agriculturalTradeInAllowed: true,
  },
};

export default US_MO;
