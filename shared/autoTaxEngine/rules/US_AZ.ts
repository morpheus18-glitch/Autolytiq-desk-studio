import { TaxRulesConfig } from "../types";

/**
 * ARIZONA TAX RULES
 *
 * Researched: 2025-11-13
 * Version: 2
 *
 * KEY FACTS:
 * - Transaction Privilege Tax (TPT): 5.6% state rate (not a true "sales tax")
 * - Local rates: Yes, varies by jurisdiction (county + city + special districts)
 * - Combined rate range: 5.6% to 11.2% (high-tax areas like Flagstaff, Scottsdale)
 * - Trade-in credit: FULL (deducted from sale price before tax)
 * - Doc fee: Taxable and NO STATE CAP (varies by dealer, avg ~$410)
 * - Manufacturer rebates: NOT taxable (reduce sale price)
 * - Dealer rebates: Taxable (post-rebate price still taxed)
 * - Service contracts & GAP: NOT taxable on retail (treated as insurance)
 * - Service contracts & GAP on leases: NOT taxable when capitalized
 * - Lease taxation: MONTHLY (tax on each payment) + UPFRONT (cap reduction taxed)
 * - Reciprocity: LIMITED (21 states with lower rates get partial credit)
 * - VLT (Vehicle License Tax): Annual registration tax, SEPARATE from TPT
 *
 * UNIQUE ARIZONA FEATURES:
 * - TPT is a "privilege tax" on the seller, not the buyer (but passed through)
 * - VLT is an annual tax based on 60% of MSRP, depreciated 16.25%/year ($2.80-$2.89 per $100)
 * - Model City Tax Code: City tax treatment may differ from state
 * - Cap cost reduction on leases: TAXABLE (except trade-in)
 * - Nonresident exemptions: 5 separate exemptions (reciprocal states, non-reciprocal, delivery, commercial)
 * - Tribal exemptions: Enrolled members buying on-reservation vehicles exempt
 * - Military exemptions: Active duty non-residents exempt from VLT (not TPT)
 *
 * SOURCES:
 * - Arizona Department of Revenue (AZDOR) - azdor.gov
 * - Arizona Transaction Privilege Tax Ruling TPR 03-7 (Motor Vehicle Sales)
 * - Arizona Revised Statutes (ARS) Title 42 (Taxation)
 * - Arizona Department of Transportation / Motor Vehicle Division (ADOT/MVD)
 * - Model City Tax Code (MCTC)
 * - AZDOR Transaction Privilege Tax Procedure TPP 24-1 (Nonresident Sales)
 * - ARS § 42-5061 (Retail Classification & Motor Vehicle Exemptions)
 * - ARS § 42-5122 (Tribal Exemptions)
 */
export const US_AZ: TaxRulesConfig = {
  stateCode: "AZ",
  version: 2,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL
   *
   * Arizona allows full trade-in credit. The trade-in value is deducted
   * from the purchase price before calculating TPT.
   *
   * Example: $30,000 vehicle - $10,000 trade-in = $20,000 taxable base
   *
   * Source: ARS § 42-5061(A)(28), AZDOR TPR 03-7
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules:
   *
   * - Manufacturer rebates (MFR): NOT taxable - reduce the sale price
   * - Dealer rebates: Taxable - do not reduce the sale price for tax purposes
   *
   * This is standard Arizona TPT treatment per TPR 03-7.
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: false,
      notes: "Manufacturer rebates reduce the purchase price before TPT",
    },
    {
      appliesTo: "DEALER",
      taxable: true,
      notes: "Dealer rebates/incentives do not reduce the taxable sale price",
    },
  ],

  /**
   * Doc Fee: TAXABLE
   *
   * Arizona doc fees are:
   * 1. Taxable as part of the retail sale
   * 2. NO STATE CAP (dealers set their own fees)
   * 3. Average doc fee: ~$410 (varies by dealer)
   *
   * Unlike CA ($85 cap), FL ($150 cap), or NY ($75 cap), Arizona has
   * no statutory limit on documentation fees.
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules:
   *
   * - Service contracts: NOT taxable (treated as insurance per ARS § 20-1095)
   * - GAP insurance: NOT taxable (insurance product)
   * - Title fee: NOT taxable (government fee)
   * - Registration fee: NOT taxable (government fee)
   * - VLT (Vehicle License Tax): NOT taxable (annual registration tax, separate from TPT)
   *
   * Arizona treats service contracts and GAP as insurance products under
   * the Arizona Service Contracts Model Act (2018), making them non-taxable
   * under TPT.
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: false,
      notes: "Extended warranties/VSC are NOT taxable in AZ (insurance product per ARS § 20-1095)",
    },
    {
      code: "GAP",
      taxable: false,
      notes: "GAP insurance is NOT taxable in AZ",
    },
    {
      code: "TITLE",
      taxable: false,
      notes: "ADOT/MVD title fee is not taxable",
    },
    {
      code: "REG",
      taxable: false,
      notes: "ADOT/MVD registration fee is not taxable",
    },
    {
      code: "VLT",
      taxable: false,
      notes: "Vehicle License Tax (annual registration tax) is NOT subject to TPT",
    },
  ],

  /**
   * Product Taxability:
   *
   * - Accessories: Taxable (part of vehicle sale when dealer-installed)
   * - Negative equity: Taxable (rolled into financed amount increases sale price)
   * - Service contracts: NOT taxable
   * - GAP: NOT taxable
   *
   * Accessories installed by the dealer are considered part of the retail
   * sale and subject to TPT. Separately itemized installation labor may
   * be exempt if not attached to real property.
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: true,
  taxOnServiceContracts: false, // AZ does NOT tax VSC
  taxOnGap: false, // AZ does NOT tax GAP

  /**
   * Vehicle Tax Scheme: STATE_PLUS_LOCAL
   *
   * Arizona uses a combination of:
   * - State TPT base rate: 5.6%
   * - County excise tax: Varies (e.g., Pima County 0.5%, Maricopa County 0.7%)
   * - City privilege tax: Varies (Phoenix 2.5%, Scottsdale 1.75%, Flagstaff 2.57%)
   * - Special district taxes: Transit, stadium, etc.
   *
   * Total combined TPT rate ranges from 5.6% (unincorporated areas) to
   * 11.2%+ in high-tax jurisdictions like Flagstaff, Scottsdale, parts
   * of Phoenix, etc.
   *
   * IMPORTANT: Tax is based on the DEALER'S location (point of sale),
   * NOT the buyer's registration address.
   *
   * NOTE: VLT (Vehicle License Tax) is SEPARATE from TPT and is based
   * on where the vehicle is REGISTERED, not where it's sold.
   */
  vehicleTaxScheme: "STATE_PLUS_LOCAL",
  vehicleUsesLocalSalesTax: true,

  // ============================================================================
  // LEASE TRANSACTION RULES
  // ============================================================================

  leaseRules: {
    /**
     * Lease Method: MONTHLY
     *
     * Arizona taxes leases on a MONTHLY basis. TPT is charged on each
     * monthly lease payment, similar to Texas, California, and most states.
     *
     * HOWEVER: Arizona also taxes the capitalized cost reduction upfront
     * (with the exception of trade-in).
     *
     * This creates a hybrid model:
     * - Upfront: Cap reduction (cash, rebates) is taxed at signing
     * - Monthly: Each payment is taxed at 5.6% state + local TPT
     *
     * Source: AZDOR TPR 03-7, Model City Tax Code
     */
    method: "MONTHLY",

    /**
     * Cap Cost Reduction: TAXED (except trade-in)
     *
     * Arizona taxes the capitalized cost reduction with the EXCEPTION
     * of trade-in allowance.
     *
     * Taxable cap reductions include:
     * - Cash down payment
     * - Manufacturer rebates applied to cap cost
     * - Credit card bonuses
     * - Any other credit given to lessee
     *
     * NOT taxable:
     * - Trade-in allowance (gets full credit like retail)
     *
     * Source: AZDOR TPR 03-7
     */
    taxCapReduction: true,

    /**
     * Rebate Behavior on Leases: ALWAYS_TAXABLE
     *
     * In Arizona leases, rebates applied to cap cost reduction are
     * TAXABLE, regardless of whether they're manufacturer or dealer rebates.
     *
     * This differs from retail treatment where manufacturer rebates
     * are non-taxable.
     *
     * The cap reduction (including rebates) is taxed upfront at signing.
     */
    rebateBehavior: "ALWAYS_TAXABLE",

    /**
     * Doc Fee on Leases: ALWAYS taxable
     *
     * Doc fees on leases are taxable in Arizona and are typically
     * taxed upfront (capitalized or paid at signing).
     */
    docFeeTaxability: "ALWAYS",

    /**
     * Trade-in Credit on Leases: FULL
     *
     * Trade-ins on leases receive full credit and reduce the cap cost.
     * Unlike other cap reductions, trade-in credit is NOT taxed.
     *
     * Example:
     * - Gross cap cost: $40,000
     * - Trade-in: $10,000
     * - Cash down: $5,000
     *
     * Tax treatment:
     * - Trade-in: NOT taxed (full credit)
     * - Cash down: Taxed at signing (5.6% state + local)
     * - Net cap cost: $25,000 → depreciation spread over payments
     */
    tradeInCredit: "FULL",

    /**
     * Negative Equity on Leases: Taxable
     *
     * Negative equity rolled into a lease increases the gross cap cost
     * and is subject to tax.
     *
     * The negative equity increases monthly payments, thus increasing
     * the tax paid monthly on those payments.
     */
    negativeEquityTaxable: true,

    /**
     * Fee Taxability on Leases:
     *
     * - Doc fee: Taxable (upfront)
     * - Service contracts: NOT taxable (when capitalized into lease)
     * - GAP: NOT taxable (when capitalized into lease)
     * - Title: Not taxable
     * - Registration: Not taxable
     *
     * Backend products (VSC, GAP) are NOT taxed when capitalized into
     * a lease in Arizona, consistent with their retail treatment as
     * insurance products.
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: true,
        notes: "Doc fee taxed upfront on lease",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: false,
        notes: "Service contracts NOT taxed when capitalized into lease (insurance product)",
      },
      {
        code: "GAP",
        taxable: false,
        notes: "GAP NOT taxed when capitalized into lease (insurance product)",
      },
      { code: "TITLE", taxable: false },
      { code: "REG", taxable: false },
    ],

    /**
     * Title Fee Rules on Leases:
     *
     * Title fees are:
     * - Not taxable
     * - Included in cap cost (or paid upfront)
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
    ],

    /**
     * Tax Fees Upfront: TRUE
     *
     * Fees that are taxable on leases (like doc fee and cap reduction)
     * are taxed upfront at signing, not spread across monthly payments.
     */
    taxFeesUpfront: true,

    /**
     * Special Scheme: NONE
     *
     * Arizona uses a hybrid monthly lease taxation model:
     * - Cap reduction (except trade-in) taxed upfront
     * - Monthly payments taxed each period
     *
     * This is handled by the interpreter using the standard MONTHLY
     * method with taxCapReduction: true.
     */
    specialScheme: "NONE",

    notes:
      "Arizona lease taxation: Monthly payment method with UPFRONT taxation of " +
      "capitalized cost reduction (except trade-in). Cap reduction (cash, rebates) " +
      "is taxed at signing. Monthly payments taxed at 5.6% state + local TPT. " +
      "Backend products (VSC, GAP) are NOT taxed. Trade-in gets full credit and " +
      "is NOT taxed. Model City Tax Code may cause city tax to differ from state.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: LIMITED (21 states with lower rates)
   *
   * Arizona provides LIMITED reciprocity for TPT paid in other states.
   *
   * KEY RULES:
   * 1. Reciprocal states (have tax reciprocity WITH Arizona):
   *    - State must have lower tax rate than AZ (< 5.6%)
   *    - State must provide credit for AZ TPT paid
   *    - Arizona gives PARTIAL credit: credit only for state TPT (5.6%),
   *      buyer still owes county + city taxes
   *
   * 2. Non-reciprocal states (do NOT reciprocate with Arizona):
   *    - Exemption from STATE TPT and COUNTY excise tax
   *    - Buyer still owes CITY privilege tax (if applicable)
   *    - Prevents double taxation
   *
   * 3. Out-of-state delivery exemption:
   *    - Dealer ships/delivers vehicle to out-of-state destination
   *    - Exempt from ALL Arizona TPT (state + county + city)
   *
   * 4. Commercial vehicles (> 10,000 lbs GVW):
   *    - Nonresident purchases for interstate commerce
   *    - Used/maintained out-of-state
   *    - Exempt from state + county TPT
   *
   * 5. Special cases:
   *    - Military: Active duty non-residents stationed in AZ are exempt
   *      from VLT (annual registration tax), NOT exempt from TPT
   *    - Tribal: Enrolled members purchasing on-reservation exempt from
   *      state + county TPT (city tax may still apply)
   *
   * IMPORTANT:
   * - Exemptions apply to STATE + COUNTY tax only in most cases
   * - CITY privilege tax typically ALWAYS applies when buyer takes
   *   possession in Arizona (except out-of-state delivery)
   * - Dealer must use AZDOR worksheets to compute proper tax
   * - Documentation required: proof of residency, tax paid elsewhere, etc.
   *
   * Source: ARS § 42-5061(A)(28), AZDOR TPP 24-1, Nonresident Tax Rate Schedules
   */
  reciprocity: {
    enabled: true,
    scope: "BOTH", // Applies to retail and lease
    homeStateBehavior: "CREDIT_UP_TO_STATE_RATE",
    requireProofOfTaxPaid: true,
    basis: "TAX_PAID",
    capAtThisStatesTax: true,
    hasLeaseException: false,

    /**
     * Reciprocity Overrides: State-Specific Exceptions
     *
     * Arizona has complex reciprocity rules based on:
     * - Whether origin state has lower tax rate than AZ (5.6%)
     * - Whether origin state provides tax credit for AZ TPT paid
     * - Vehicle class (commercial vs. non-commercial)
     * - Delivery location (in-state vs. out-of-state)
     *
     * 21 states currently qualify for reciprocal exemptions.
     * Non-reciprocal states get exemption from state + county tax only.
     *
     * Special handling needed for:
     * - Tribal purchases (ARS § 42-5122)
     * - Military purchases (ARS § 28-5811 - VLT only, not TPT)
     * - Commercial vehicles > 10,000 lbs (ARS § 42-5061(A)(14)(b))
     */
    overrides: [
      {
        originState: "TRIBAL",
        disallowCredit: false,
        notes:
          "Enrolled tribal members purchasing on-reservation: exempt from " +
          "state + county TPT. City tax may apply. Requires Form 5013.",
      },
    ],

    notes:
      "Arizona provides LIMITED reciprocity: 21 states with lower rates get partial credit. " +
      "Reciprocal states: credit for state TPT only, buyer owes county + city. " +
      "Non-reciprocal states: exempt from state + county, owe city tax. " +
      "Out-of-state delivery: exempt from all TPT. " +
      "Tribal exemption: enrolled members on-reservation exempt from state + county. " +
      "Military: VLT exemption only, NOT TPT exemption. " +
      "Commercial > 10K lbs: exempt from state + county if used out-of-state. " +
      "City tax typically applies when buyer takes possession in AZ.",
  },

  extras: {
    lastUpdated: "2025-11",
    sources: [
      "Arizona Department of Revenue (AZDOR) - azdor.gov",
      "Arizona Transaction Privilege Tax Ruling TPR 03-7 (Motor Vehicle Sales)",
      "Arizona Transaction Privilege Tax Procedure TPP 24-1 (Nonresident Sales)",
      "Arizona Revised Statutes (ARS) Title 42 - Taxation",
      "ARS § 42-5061 - Retail Classification & Motor Vehicle Exemptions",
      "ARS § 42-5122 - Tribal Tax Exemptions",
      "ARS § 28-5811 - Vehicle License Tax & Military Exemptions",
      "Model City Tax Code (MCTC) - modelcitytaxcode.az.gov",
      "ADOT/MVD Motor Vehicle Division - azdot.gov",
      "AZDOR Nonresident Tax Rate Schedules",
    ],
    notes:
      "Arizona uses Transaction Privilege Tax (TPT), a privilege tax on the seller " +
      "(not a true sales tax on the buyer, though passed through). State rate 5.6% + " +
      "local (county + city + districts) = 5.6% to 11.2%+ combined. NO DOC FEE CAP " +
      "(avg ~$410). Service contracts and GAP are NOT taxed (insurance products). " +
      "VLT (Vehicle License Tax) is SEPARATE annual tax based on 60% of MSRP, " +
      "depreciated 16.25%/year. Leases: cap reduction taxed upfront (except trade-in), " +
      "monthly payments taxed monthly. 21 reciprocal states get partial credit. " +
      "City tax differs from state per Model City Tax Code.",
    docFeeCapAmount: null, // No state cap
    avgDocFee: 410,
    maxCombinedRate: 11.2,
    stateRate: 5.6,
    vltRate: 2.8, // $2.80 per $100 assessed value (new vehicles)
    vltDepreciationRate: 16.25, // 16.25% per year depreciation
    reciprocalStatesCount: 21,
  },
};

export default US_AZ;
