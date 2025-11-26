import type { TaxRulesConfig } from "../types";

/**
 * IOWA TAX RULES - FEE FOR NEW REGISTRATION SYSTEM
 *
 * Researched: 2025-11-14
 * Version: 1
 *
 * KEY FACTS:
 * - Iowa uses a "Fee for New Registration" system (not traditional sales tax)
 * - Base rate: 5% of purchase/lease price + $10 flat fee
 * - State base: 5% + potential local option tax up to 1% (varies by county)
 * - Codified in Iowa Code Section 321.105A (not Iowa Code 423 - sales tax)
 * - One-time fee paid at title/registration (retail) or on total lease price (leases)
 * - Trade-in credit: FULL (deducted before fee calculation)
 * - Manufacturer rebates: NOT taxable (reduce purchase price before fee)
 * - Dealer rebates: NOT taxable (reduce purchase price before fee)
 * - Doc fee: NOT subject to 5% fee (excluded by statute)
 * - Service contracts: NOT subject to 5% fee (if optional and separate)
 * - GAP insurance: NOT subject to 5% fee (insurance products exempt)
 * - Accessories: TAXABLE (included in purchase price if dealer-installed)
 * - Negative equity: Generally included in taxable base
 * - Lease taxation: FULL_UPFRONT on total lease price (not monthly)
 * - Reciprocity: YES (credit for tax paid elsewhere, capped at IA fee)
 *
 * UNIQUE IOWA SYSTEM:
 * - Vehicles subject to registration are EXEMPT from regular sales tax (6%)
 * - Instead, they pay "Fee for New Registration" = $10 + 5% of price
 * - Local option taxes (up to 1%) may apply depending on county
 * - This is a REGISTRATION fee, not technically a "sales tax"
 * - Collected by county treasurer at time of registration
 * - Funds go to Road Use Tax Fund and counties
 *
 * LEASE TAXATION - CRITICAL:
 * - Leases pay 5% on TOTAL lease price (all payments + down payment + trade-in)
 * - This is an UPFRONT calculation (not monthly like most states)
 * - Lease price = (monthly payment × number of months) + down payment + trade-in value
 * - Tax is paid once at lease inception
 * - Trade-ins ADD to the lease price (unlike retail, where they subtract)
 * - Cap cost reduction (down payment) is INCLUDED in taxable lease price
 *
 * SOURCES:
 * - Iowa Code Section 321.105A - Fee for New Registration
 * - Iowa Administrative Code Rule 701-31.5 - Motor Vehicle Use Tax on Long-term Leases
 * - Iowa Department of Revenue - Vehicle Purchase, Lease, and Rental Information
 * - Iowa Automobile Dealers Association (IADA) - Motor Vehicle Purchase Agreement
 * - Iowa Code Chapter 423 - Sales Tax (vehicles are exempt)
 */
export const US_IA: TaxRulesConfig = {
  stateCode: "IA",
  version: 1,

  // ============================================================================
  // RETAIL TRANSACTION RULES (FEE FOR NEW REGISTRATION)
  // ============================================================================

  /**
   * Trade-in Policy: FULL
   *
   * Iowa allows full trade-in credit. The trade-in value is deducted from
   * the purchase price before calculating the 5% registration fee.
   *
   * Example: Buy $30,000 vehicle with $10,000 trade-in
   * - Taxable base: $30,000 - $10,000 = $20,000
   * - Fee: $10 + ($20,000 × 5%) = $10 + $1,000 = $1,010
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules:
   *
   * In Iowa, both manufacturer and dealer rebates reduce the taxable purchase
   * price before the 5% registration fee is calculated. This is different from
   * many states where rebates are taxable.
   *
   * NOTE: Manufacturer rebates must be monetary returns from the manufacturer
   * applied directly to the vehicle's purchase price to qualify.
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: false,
      notes:
        "Manufacturer rebates reduce purchase price before registration fee calculation",
    },
    {
      appliesTo: "DEALER",
      taxable: false,
      notes:
        "Dealer rebates/incentives reduce purchase price before registration fee",
    },
  ],

  /**
   * Doc Fee: NOT TAXABLE
   *
   * Documentation fees are NOT subject to the 5% registration fee in Iowa.
   * Iowa Code explicitly excludes document fees from the taxable purchase price.
   *
   * Note: Iowa previously had a $180 cap on doc fees. As of 2025, legislation
   * (HF758) has been introduced to eliminate the cap entirely while adding
   * transparency requirements. Dealers must check current Iowa law.
   */
  docFeeTaxable: false,

  /**
   * Fee Taxability Rules:
   *
   * - Service contracts: NOT taxable if optional and separately itemized
   * - GAP insurance: NOT taxable (insurance products exempt from registration fee)
   * - Title/registration: Government fees, not taxable
   *
   * Per IADA Motor Vehicle Purchase Agreement examples, service contracts and
   * GAP show "$0.00 sales tax", confirming they are not subject to the fee.
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: false,
      notes:
        "Service contracts not subject to registration fee if optional and separate",
    },
    {
      code: "GAP",
      taxable: false,
      notes: "GAP insurance not subject to registration fee (insurance exempt)",
    },
    { code: "TITLE", taxable: false, notes: "Government fee, not taxable" },
    { code: "REG", taxable: false, notes: "Government fee, not taxable" },
  ],

  /**
   * Product Taxability:
   *
   * - Accessories: TAXABLE if dealer-installed (included in cash price)
   * - Negative equity: Generally taxable (added to purchase price)
   * - Service contracts: NOT taxable (if optional/separate)
   * - GAP: NOT taxable (insurance exempt)
   *
   * Per IADA guidance: "Accessories are included in the Cash Price and are
   * taxed at the Iowa one-time registration fee rate of 5%."
   */
  taxOnAccessories: true, // Dealer-installed accessories included in taxable base
  taxOnNegativeEquity: true, // Negative equity generally added to taxable base
  taxOnServiceContracts: false, // Not subject to registration fee
  taxOnGap: false, // Not subject to registration fee

  /**
   * Vehicle Tax Scheme: STATE_PLUS_LOCAL
   *
   * Iowa uses a base 5% registration fee with potential local option taxes
   * up to 1% depending on the county where the vehicle is registered.
   *
   * This is NOT a traditional sales tax - vehicles subject to registration
   * are EXEMPT from Iowa's 6% general sales tax. Instead, they pay the
   * "Fee for New Registration" under Iowa Code 321.105A.
   */
  vehicleTaxScheme: "STATE_PLUS_LOCAL",
  vehicleUsesLocalSalesTax: true, // Local option tax (up to 1%) may apply

  // ============================================================================
  // LEASE TRANSACTION RULES (FULL UPFRONT ON TOTAL LEASE PRICE)
  // ============================================================================

  leaseRules: {
    /**
     * Lease Method: FULL_UPFRONT
     *
     * ⚠️ CRITICAL: Iowa leases are taxed DIFFERENTLY than most states.
     *
     * Iowa does NOT tax leases on monthly payments. Instead, Iowa calculates
     * the TOTAL LEASE PRICE upfront and applies the 5% registration fee to
     * that total amount, which is paid once at lease inception.
     *
     * Lease Price Formula (per Iowa Admin. Code 701-31.5):
     * Lease Price = (Monthly Payment × Number of Months) + Down Payment + Trade-in Value
     *
     * NOTE: Trade-ins are ADDED to lease price (not subtracted like retail).
     * This is because trade-ins reduce the monthly payment, so they must be
     * added back to calculate the true total lease price.
     *
     * Example:
     * - Monthly payment: $400
     * - Lease term: 36 months
     * - Down payment: $2,000
     * - Trade-in value: $5,000
     * - Lease price: ($400 × 36) + $2,000 + $5,000 = $21,400
     * - Registration fee: $10 + ($21,400 × 5%) = $10 + $1,070 = $1,080
     */
    method: "FULL_UPFRONT",

    /**
     * Cap Cost Reduction: TAXABLE
     *
     * In Iowa, capitalized cost reductions (down payments, trade-ins, rebates)
     * are INCLUDED in the taxable lease price calculation.
     *
     * This is the opposite of most states, where cap reductions are not taxed.
     * Iowa's rationale: the lease price represents the total value being leased,
     * and down payments/trade-ins are part of that total consideration.
     */
    taxCapReduction: true,

    /**
     * Rebate Behavior on Leases: ALWAYS_TAXABLE
     *
     * Per Iowa Admin. Code 701-31.5, manufacturer rebates are excluded from
     * the lease price calculation, but this means the rebate was already used
     * to reduce the cap cost. Since we include cap reductions in the lease
     * price, rebates are effectively taxable.
     *
     * However, the statute explicitly excludes "manufacturer's rebate" from
     * the lease price, so we follow the statute.
     */
    rebateBehavior: "FOLLOW_RETAIL_RULE", // Rebates reduce cap cost, not included in lease price per statute

    /**
     * Doc Fee on Leases: NEVER
     *
     * Documentation fees are NOT subject to the registration fee on leases,
     * consistent with retail treatment.
     */
    docFeeTaxability: "NEVER",

    /**
     * Trade-in Credit on Leases: NONE (or inverse credit)
     *
     * ⚠️ CRITICAL: Iowa treats trade-ins on leases OPPOSITE to retail.
     *
     * On leases, trade-in value is ADDED to the lease price (not subtracted).
     * This is because:
     * 1. Trade-in reduces the cap cost
     * 2. Lower cap cost = lower monthly payment
     * 3. To calculate true total lease price, must add back trade-in value
     *
     * Per Iowa Admin. Code 701-31.5: "The value of the trade-in shall be
     * added in the computation of the lease price."
     */
    tradeInCredit: "NONE", // Actually inverse - trade-in ADDS to taxable base on leases

    /**
     * Negative Equity on Leases: Taxable
     *
     * If negative equity is rolled into the lease (increasing cap cost),
     * it increases the taxable lease price.
     */
    negativeEquityTaxable: true,

    /**
     * Fee Taxability on Leases:
     *
     * - Doc fee: NOT taxable
     * - Service contracts: NOT taxable (excluded per Iowa Admin. Code 701-31.5)
     * - GAP: NOT taxable (insurance exempt)
     * - Title: Not taxable
     * - Registration: Not taxable
     *
     * Per Iowa Admin. Code 701-31.5, lease price excludes "optional service
     * or warranty contracts subject to tax under Iowa Code section 422.43(6)."
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: false,
        notes: "Doc fee not subject to registration fee on leases",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: false,
        notes: "Service contracts excluded from lease price per Iowa Admin. Code 701-31.5",
      },
      {
        code: "GAP",
        taxable: false,
        notes: "GAP insurance excluded from lease price",
      },
      { code: "TITLE", taxable: false },
      { code: "REG", taxable: false },
    ],

    /**
     * Title Fee Rules on Leases:
     */
    titleFeeRules: [
      {
        code: "TITLE",
        taxable: false,
        includedInCapCost: false,
        includedInUpfront: true,
        includedInMonthly: false,
      },
    ],

    /**
     * Tax Fees Upfront: TRUE
     *
     * The entire registration fee on leases is paid upfront at lease inception.
     */
    taxFeesUpfront: true,

    /**
     * Special Scheme: NONE
     *
     * Iowa's lease taxation is handled via the FULL_UPFRONT method flag.
     * No additional special scheme needed.
     */
    specialScheme: "NONE",

    notes:
      "Iowa leases use FULL UPFRONT taxation on total lease price. " +
      "Lease price = (monthly payment × months) + down payment + trade-in value. " +
      "⚠️ CRITICAL: Trade-ins are ADDED to lease price (opposite of retail). " +
      "Cap cost reductions are included in taxable lease price. " +
      "Registration fee: $10 + (lease price × 5%) + local option tax. " +
      "Per Iowa Admin. Code 701-31.5. Applies to leases of 12+ months.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: ENABLED
   *
   * Iowa provides reciprocity credit for vehicle registration fees:
   * - Credit for sales tax or similar tax paid in another state
   * - Credit is capped at the Iowa registration fee amount
   * - Requires proof of tax paid (title, registration, receipt)
   * - Applies when a vehicle titled elsewhere is brought to Iowa
   *
   * Four scenarios for out-of-state purchases:
   *
   * 1. Equal tax rate (e.g., Wisconsin at 5%): Credit offsets Iowa fee, owe $0
   * 2. No tax paid (e.g., Montana at 0%): No credit, owe full Iowa fee
   * 3. Lower tax paid (e.g., 3%): Credit for 3%, owe difference (2% + $10)
   * 4. Higher tax paid (e.g., Minnesota at 6.5%): Credit capped at Iowa 5%, owe $0
   *
   * Example:
   * - Buy vehicle in Minnesota (MN tax: 6.5% = $1,950 on $30k vehicle)
   * - Register in Iowa (IA fee: $10 + 5% = $1,510)
   * - Credit: $1,510 (capped at IA amount)
   * - Owe IA: $0 (MN tax exceeds IA fee)
   *
   * Example 2:
   * - Buy vehicle in North Carolina (NC tax: 3% = $900 on $30k vehicle)
   * - Register in Iowa (IA fee: $10 + 5% = $1,510)
   * - Credit: $900 (what was paid in NC)
   * - Owe IA: $610 (difference)
   */
  reciprocity: {
    enabled: true,
    scope: "BOTH", // Applies to both retail and lease
    homeStateBehavior: "CREDIT_UP_TO_STATE_RATE",
    requireProofOfTaxPaid: true,
    basis: "TAX_PAID",
    capAtThisStatesTax: true,
    hasLeaseException: false, // Same treatment for leases

    notes:
      "Iowa provides credit for tax paid elsewhere, capped at Iowa registration fee. " +
      "If prior state's tax < Iowa's 5%, buyer owes the difference. " +
      "If prior state's tax > Iowa's 5%, buyer owes $0 (credit capped at Iowa amount). " +
      "Proof of tax paid required (prior title, registration, receipt).",
  },

  // ============================================================================
  // IOWA FEE FOR NEW REGISTRATION CONFIGURATION (State-Specific Extras)
  // ============================================================================

  extras: {
    // Iowa-specific configuration
    iowaRegistrationFee: {
      baseRate: 0.05, // 5% registration fee
      flatFee: 10, // $10 flat fee component
      localOptionTaxMax: 0.01, // Up to 1% local option tax (varies by county)
      tradeInReducesBase: true, // Trade-in reduces taxable base on retail
      tradeInAddsToLeasePrice: true, // Trade-in ADDS to lease price (unique to IA)
      leaseCalculationMethod: "FULL_UPFRONT", // Tax total lease price upfront
      leasePriceFormula:
        "(monthly payment × months) + down payment + trade-in value",
      excludedFromBase: [
        "doc fee",
        "title fee",
        "registration fee",
        "service contracts (if optional/separate)",
        "GAP insurance",
        "manufacturer rebates",
        "dealer rebates",
      ],
      includedInBase: [
        "vehicle price",
        "dealer-installed accessories",
        "freight charges",
        "manufacturer's taxes",
        "negative equity (generally)",
      ],
    },

    docFeeCap:
      "Previously $180, but HF758 (2025) proposes to eliminate cap. Check current Iowa law.",

    lastUpdated: "2025-11-14",
    sources: [
      "Iowa Code Section 321.105A - Fee for New Registration",
      "Iowa Administrative Code Rule 701-31.5 - Motor Vehicle Use Tax on Long-term Leases",
      "Iowa Department of Revenue - Vehicle Purchase, Lease, and Rental Information",
      "Iowa Automobile Dealers Association (IADA) - Motor Vehicle Purchase Agreement",
      "Iowa Code Chapter 423 - Sales Tax (vehicles exempt from general sales tax)",
    ],

    notes:
      "Iowa uses 'Fee for New Registration' (not sales tax) under Iowa Code 321.105A. " +
      "Base: $10 + 5% of purchase/lease price. Local option tax (up to 1%) may apply. " +
      "Vehicles subject to registration are EXEMPT from Iowa's 6% general sales tax. " +
      "Trade-in gets full credit on retail. Rebates reduce taxable base. " +
      "Doc fee NOT taxable. Service contracts and GAP NOT taxable. " +
      "⚠️ LEASES: Taxed on FULL UPFRONT total lease price, NOT monthly. " +
      "Lease price = (payment × months) + down payment + trade-in value. " +
      "Trade-ins ADD to lease price (opposite of retail). " +
      "Reciprocity: Credit for tax paid elsewhere, capped at Iowa fee.",

    registrationFeeRate: 5.0,
    flatFeeAmount: 10.0,
    localOptionTaxRange: "0% - 1% (varies by county)",
    leaseTaxMethod: "FULL_UPFRONT on total lease price",
  },
};

export default US_IA;
