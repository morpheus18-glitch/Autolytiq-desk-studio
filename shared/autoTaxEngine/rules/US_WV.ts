import { TaxRulesConfig } from "../types";

/**
 * WEST VIRGINIA TAX RULES - PRIVILEGE TAX SYSTEM
 *
 * Researched: 2025-01
 * Version: 1
 *
 * ⚠️ CRITICAL: West Virginia uses a Privilege Tax system, not traditional sales tax
 *
 * KEY FACTS:
 * - West Virginia uses Privilege Tax for vehicle registration (not sales tax)
 * - Base rate: 5% of purchase price or assessed value (whichever is higher)
 * - State-only tax (no local jurisdiction stacking)
 * - Trade-in credit: FULL (deducted before tax calculation)
 * - Doc fee: TAXABLE (subject to privilege tax)
 * - Manufacturer rebates: NOT taxable (reduce purchase price)
 * - Dealer rebates: Taxable (do not reduce purchase price)
 * - Service contracts & GAP: TAXABLE (unlike most states)
 * - Vehicle class-specific rates: RV (6%), Trailer (3%), Auto/Truck (5%)
 * - Lease taxation: 5% privilege tax on monthly payments
 * - Reciprocity: YES (credit for tax paid elsewhere, capped at WV rate)
 *
 * UNIQUE PRIVILEGE TAX SYSTEM:
 * - Privilege tax is a registration tax, not a sales tax
 * - Tax base is higher of purchase price OR state-assessed value
 * - Different rates apply to different vehicle classes
 * - Paid at DMV when registering the vehicle
 * - Applies to both new and used vehicle purchases
 *
 * SOURCES:
 * - West Virginia Department of Motor Vehicles
 * - West Virginia Code Chapter 17A - Motor Vehicle Privilege Tax
 * - WV State Tax Department
 */
export const US_WV: TaxRulesConfig = {
  stateCode: "WV",
  version: 1,

  // ============================================================================
  // RETAIL TRANSACTION RULES (PRIVILEGE TAX SYSTEM)
  // ============================================================================

  /**
   * Trade-in Policy: FULL
   *
   * West Virginia allows full trade-in credit under Privilege Tax. The
   * trade-in value is deducted from the purchase price before calculating
   * the privilege tax.
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules:
   *
   * Under West Virginia Privilege Tax:
   * - Manufacturer rebates: NOT taxable (reduce purchase price before tax)
   * - Dealer rebates: Taxable (do not reduce purchase price)
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: false,
      notes:
        "Manufacturer rebates reduce purchase price before privilege tax calculation",
    },
    {
      appliesTo: "DEALER",
      taxable: true,
      notes: "Dealer rebates do not reduce privilege tax base",
    },
  ],

  /**
   * Doc Fee: TAXABLE
   *
   * Documentation fees ARE subject to privilege tax in West Virginia.
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules:
   *
   * Under Privilege Tax:
   * - Service contracts: TAXABLE (unlike most states)
   * - GAP insurance: TAXABLE (unlike most states)
   * - Title/registration: Government fees, not taxable
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: true,
      notes:
        "Service contracts ARE subject to WV privilege tax (unlike most states)",
    },
    {
      code: "GAP",
      taxable: true,
      notes: "GAP insurance IS subject to WV privilege tax (unlike most states)",
    },
    { code: "TITLE", taxable: false, notes: "Government fee, not taxable" },
    { code: "REG", taxable: false, notes: "Government fee, not taxable" },
  ],

  /**
   * Product Taxability:
   *
   * Under Privilege Tax:
   * - Accessories: Included in privilege tax base if part of vehicle sale
   * - Negative equity: Added to privilege tax base
   * - Service contracts: TAXABLE (unlike most states)
   * - GAP: TAXABLE (unlike most states)
   */
  taxOnAccessories: true, // Included in privilege tax base
  taxOnNegativeEquity: true, // Added to privilege tax base
  taxOnServiceContracts: true, // TAXABLE in WV (unlike most states)
  taxOnGap: true, // TAXABLE in WV (unlike most states)

  /**
   * Vehicle Tax Scheme: DMV_PRIVILEGE_TAX
   *
   * West Virginia uses a Privilege Tax system that is fundamentally
   * different from sales tax. This flag tells the engine to branch to
   * the West Virginia Privilege Tax calculator instead of using the
   * generic sales tax pipeline.
   *
   * Privilege Tax is:
   * - A registration tax paid at DMV (not a sales tax)
   * - Based on higher of purchase price or state-assessed value
   * - Fixed base rate of 5% (state-only, no local stacking)
   * - Different rates for different vehicle classes (RV: 6%, Trailer: 3%)
   * - Applies to both retail and lease transactions
   */
  vehicleTaxScheme: "DMV_PRIVILEGE_TAX",
  vehicleUsesLocalSalesTax: false, // Privilege tax is state-only, no local rates

  // ============================================================================
  // LEASE TRANSACTION RULES (PRIVILEGE TAX ON MONTHLY PAYMENTS)
  // ============================================================================

  leaseRules: {
    /**
     * Lease Method: MONTHLY
     *
     * West Virginia leases are taxed using privilege tax on monthly payments:
     * - 5% base privilege tax (or vehicle class rate)
     * - Tax is applied to each monthly payment
     * - No upfront privilege tax on cap cost reduction
     */
    method: "MONTHLY",

    /**
     * Cap Cost Reduction: NOT taxed
     *
     * Down payments, trade-ins, and rebates that reduce capitalized
     * cost are NOT taxed on leases.
     */
    taxCapReduction: false,

    /**
     * Rebate Behavior on Leases: FOLLOW_RETAIL_RULE
     *
     * Same as retail:
     * - Manufacturer rebates reduce cap cost (not taxed)
     * - Dealer rebates do not reduce taxable payments
     */
    rebateBehavior: "FOLLOW_RETAIL_RULE",

    /**
     * Doc Fee on Leases: ALWAYS taxable
     *
     * Doc fees on leases are subject to the 5% privilege tax.
     */
    docFeeTaxability: "ALWAYS",

    /**
     * Trade-in Credit on Leases: FULL
     *
     * Trade-ins reduce the capitalized cost on leases, lowering the
     * monthly payment and thus the monthly privilege tax.
     */
    tradeInCredit: "FULL",

    /**
     * Negative Equity on Leases: Taxable
     *
     * Negative equity increases the cap cost, increases monthly payments,
     * and thus increases the monthly privilege tax.
     */
    negativeEquityTaxable: true,

    /**
     * Fee Taxability on Leases:
     *
     * - Doc fee: Taxable (5% privilege tax)
     * - Service contracts: TAXABLE (unlike most states)
     * - GAP: TAXABLE (unlike most states)
     * - Title: Not taxable
     * - Registration: Not taxable
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: true,
        notes: "Doc fee subject to 5% privilege tax on leases",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: true,
        notes: "Service contracts ARE taxable on WV leases (unlike most states)",
      },
      {
        code: "GAP",
        taxable: true,
        notes: "GAP IS taxable on WV leases (unlike most states)",
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
        includedInCapCost: true,
        includedInUpfront: true,
        includedInMonthly: false,
      },
    ],

    /**
     * Tax Fees Upfront: TRUE
     *
     * Taxable fees on leases are taxed upfront.
     */
    taxFeesUpfront: true,

    /**
     * Special Scheme: NONE (Privilege Tax handled at root level)
     *
     * West Virginia uses the Privilege Tax scheme for both retail and leases,
     * but the specialScheme field here is NONE because the dispatcher
     * routes based on vehicleTaxScheme at the root level.
     */
    specialScheme: "NONE",

    notes:
      "West Virginia leases use 5% privilege tax on monthly payments (or vehicle class rate). " +
      "Privilege tax is state-only with no local rates. " +
      "⚠️ Service contracts and GAP ARE taxable (unlike most states).",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: ENABLED (Limited)
   *
   * West Virginia provides limited reciprocity for Privilege Tax:
   * - Credit for sales tax or similar tax paid in another state
   * - Credit is capped at the West Virginia Privilege Tax amount
   * - Requires proof of tax paid (title, registration, receipt)
   * - Applies when a vehicle titled elsewhere is brought to WV
   *
   * Example:
   * - Buy vehicle in Ohio (OH tax: 5.75% = $1,725 on $30k vehicle)
   * - Move to West Virginia and register (WV privilege: 5% = $1,500)
   * - Credit: $1,500 (capped at WV privilege tax)
   * - Owe WV: $0 (OH tax exceeds WV privilege)
   *
   * Example 2:
   * - Buy vehicle in Tennessee (TN tax: 7% = $2,100)
   * - Trade to West Virginia (WV privilege: 5% = $1,500)
   * - Credit: $1,500 (capped at WV rate)
   * - Owe WV: $0 (TN tax exceeds WV privilege)
   */
  reciprocity: {
    enabled: true,
    scope: "BOTH", // Applies to retail and lease
    homeStateBehavior: "CREDIT_UP_TO_STATE_RATE",
    requireProofOfTaxPaid: true,
    basis: "TAX_PAID",
    capAtThisStatesTax: true,
    hasLeaseException: false, // Same treatment for leases

    notes:
      "West Virginia provides credit for tax paid elsewhere, capped at WV privilege tax amount. " +
      "Proof of tax paid required (prior title, registration, receipt). " +
      "If prior state's tax was lower, you owe the difference.",
  },

  // ============================================================================
  // WEST VIRGINIA PRIVILEGE TAX CONFIGURATION (State-Specific Extras)
  // ============================================================================

  extras: {
    // West Virginia Privilege Tax-specific configuration
    wvPrivilege: {
      baseRate: 0.05, // 5% base privilege tax rate
      useAssessedValue: true, // Use state-assessed value if higher than price
      useHigherOfPriceOrAssessed: true, // Tax base = max(price, assessed)
      allowTradeInCredit: true, // Trade-in reduces privilege tax base
      applyNegativeEquityToBase: true, // Negative equity increases privilege tax base

      // Vehicle class-specific rates
      vehicleClassRates: {
        auto: 0.05, // 5% for passenger cars
        truck: 0.05, // 5% for light trucks
        RV: 0.06, // 6% for recreational vehicles
        trailer: 0.03, // 3% for trailers
        motorcycle: 0.05, // 5% for motorcycles
      },
    },

    lastUpdated: "2025-01",
    sources: [
      "West Virginia Department of Motor Vehicles",
      "West Virginia Code Chapter 17A - Motor Vehicle Privilege Tax",
      "WV State Tax Department",
    ],
    notes:
      "West Virginia uses Privilege Tax (not sales tax) for vehicle registration. " +
      "Base rate: 5% (state-only, no local rates). " +
      "Tax base is higher of purchase price or DMV-assessed value. " +
      "Different rates apply by vehicle class (RV: 6%, Trailer: 3%). " +
      "⚠️ UNIQUE: Service contracts and GAP ARE taxable (unlike most states). " +
      "Trade-in gets full credit. Reciprocity available with proof.",
    privilegeRate: 5.0,
    vehicleClassRates: {
      RV: 6.0,
      trailer: 3.0,
      standard: 5.0,
    },
  },
};

export default US_WV;
