import type { TaxRulesConfig } from "../types";

/**
 * GEORGIA TAX RULES - TAVT SYSTEM
 *
 * Researched: 2025-01
 * Version: 1
 *
 * ⚠️ CRITICAL: Georgia does NOT use traditional sales tax for vehicles
 *
 * KEY FACTS:
 * - Georgia uses TAVT (Title Ad Valorem Tax) instead of sales tax
 * - TAVT rate: 7% of fair market value (as of 2024-2025)
 * - One-time tax paid at title/registration
 * - Replaces annual property tax on vehicles (ad valorem tax)
 * - Trade-in credit: FULL (deducted before TAVT calculation)
 * - Doc fee: NOT subject to TAVT (may be subject to sales tax separately)
 * - Manufacturer/dealer rebates: Taxable (TAVT calculated before rebates)
 * - Service contracts & GAP: NOT subject to TAVT
 * - Lease taxation: DIFFERENT - leases use 4% state sales tax, NOT TAVT
 * - Reciprocity: Limited (credit for tax paid elsewhere, capped at GA tax)
 *
 * UNIQUE TAVT SYSTEM:
 * - TAVT applies to RETAIL purchases only
 * - LEASES use regular 4% sales tax on monthly payments
 * - TAVT base is higher of: purchase price OR DMV assessed value
 * - Paid once at title/registration (not recurring)
 * - No local jurisdiction stacking (single state rate)
 *
 * SOURCES:
 * - Georgia Department of Revenue (DOR)
 * - Georgia Code Title 48, Chapter 5C - Motor Vehicle Title Ad Valorem Tax
 * - Georgia DOR Motor Vehicle Division
 */
export const US_GA: TaxRulesConfig = {
  stateCode: "GA",
  version: 1,

  // ============================================================================
  // RETAIL TRANSACTION RULES (TAVT SYSTEM)
  // ============================================================================

  /**
   * Trade-in Policy: FULL
   *
   * Georgia allows full trade-in credit under TAVT. The trade-in value
   * is deducted from the purchase price before calculating TAVT.
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules:
   *
   * Under Georgia TAVT, rebates are generally taxable:
   * - Manufacturer rebates: Taxable (TAVT calculated before rebate applied)
   * - Dealer rebates: Taxable (same treatment)
   *
   * This is different from sales tax states where mfr rebates often reduce
   * the taxable base.
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: true,
      notes: "TAVT calculated before manufacturer rebates are applied",
    },
    {
      appliesTo: "DEALER",
      taxable: true,
      notes: "TAVT calculated before dealer rebates are applied",
    },
  ],

  /**
   * Doc Fee: NOT subject to TAVT
   *
   * Doc fees are not included in the TAVT base. They may be subject to
   * regular sales tax separately (future enhancement).
   */
  docFeeTaxable: false, // Not subject to TAVT

  /**
   * Fee Taxability Rules:
   *
   * Under TAVT, fees and F&I products are NOT subject to the Title Ad
   * Valorem Tax. They may be subject to regular sales tax separately.
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: false,
      notes: "Not subject to TAVT (may be subject to sales tax separately)",
    },
    {
      code: "GAP",
      taxable: false,
      notes: "Not subject to TAVT (may be subject to sales tax separately)",
    },
    { code: "TITLE", taxable: false, notes: "Government fee, not taxable" },
    { code: "REG", taxable: false, notes: "Government fee, not taxable" },
  ],

  /**
   * Product Taxability:
   *
   * Under TAVT:
   * - Accessories: Included in TAVT base if part of vehicle sale
   * - Negative equity: Added to TAVT base
   * - Service contracts: NOT subject to TAVT
   * - GAP: NOT subject to TAVT
   */
  taxOnAccessories: true, // Included in TAVT base if part of vehicle
  taxOnNegativeEquity: true, // Added to TAVT base
  taxOnServiceContracts: false, // Not subject to TAVT
  taxOnGap: false, // Not subject to TAVT

  /**
   * Vehicle Tax Scheme: SPECIAL_TAVT
   *
   * Georgia uses a Title Ad Valorem Tax system that is fundamentally
   * different from sales tax. This flag tells the engine to branch to
   * the Georgia TAVT calculator instead of using the generic sales tax
   * pipeline.
   *
   * TAVT is:
   * - A one-time tax paid at title/registration
   * - Based on fair market value (higher of price or DMV assessed value)
   * - Fixed at 7% (no local jurisdiction stacking)
   * - Replaces annual property tax on vehicles
   */
  vehicleTaxScheme: "SPECIAL_TAVT",
  vehicleUsesLocalSalesTax: false, // TAVT is state-only, no local rates

  // ============================================================================
  // LEASE TRANSACTION RULES (SALES TAX SYSTEM)
  // ============================================================================

  leaseRules: {
    /**
     * Lease Method: MONTHLY
     *
     * Georgia leases are taxed DIFFERENTLY than retail purchases:
     * - Leases use standard 4% state sales tax (NOT TAVT)
     * - Tax is applied to each monthly payment
     * - No local jurisdiction tax on leases (state-only)
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
     * Rebate Behavior on Leases: ALWAYS_TAXABLE
     *
     * On leases, rebates are typically applied to reduce cap cost and
     * thus not taxed (different from retail TAVT treatment).
     */
    rebateBehavior: "ALWAYS_TAXABLE", // Rebates reduce cap cost, not taxed

    /**
     * Doc Fee on Leases: ALWAYS taxable
     *
     * Doc fees on leases are subject to the 4% sales tax.
     */
    docFeeTaxability: "ALWAYS",

    /**
     * Trade-in Credit on Leases: CAP_COST_ONLY
     *
     * Trade-ins reduce the capitalized cost on leases, lowering the
     * monthly payment and thus the monthly tax.
     */
    tradeInCredit: "CAP_COST_ONLY",

    /**
     * Negative Equity on Leases: Taxable
     *
     * Negative equity increases the cap cost, increases monthly payments,
     * and thus increases the monthly sales tax.
     */
    negativeEquityTaxable: true,

    /**
     * Fee Taxability on Leases:
     *
     * - Doc fee: Taxable (4% sales tax)
     * - Service contracts: NOT taxable when capitalized
     * - GAP: NOT taxable when capitalized
     * - Title: Not taxable
     * - Registration: Not taxable
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: true,
        notes: "Doc fee subject to 4% sales tax on leases",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: false,
        notes: "Not taxed when capitalized into lease",
      },
      {
        code: "GAP",
        taxable: false,
        notes: "Not taxed when capitalized into lease",
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
     * Special Scheme: NONE
     *
     * Even though Georgia has a special TAVT system for retail purchases,
     * leases use standard sales tax with no special scheme.
     */
    specialScheme: "GA_TAVT",

    notes:
      "Georgia leases use 4% state sales tax on monthly payments (NOT TAVT). " +
      "TAVT only applies to retail purchases. Lease sales tax is state-only with no local rates.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: LIMITED (TAVT Credit)
   *
   * Georgia provides limited reciprocity for TAVT:
   * - Credit for sales tax or similar tax paid in another state
   * - Credit is capped at the Georgia TAVT amount
   * - Requires proof of tax paid (title, registration, receipt)
   * - Applies when a vehicle titled elsewhere is brought to GA
   *
   * Example:
   * - Buy vehicle in Florida (FL sales tax: 6% = $1,800 on $30k vehicle)
   * - Move to Georgia and register (GA TAVT: 7% = $2,100)
   * - Credit: $1,800 (what you paid in FL)
   * - Owe GA: $300 (difference)
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
      "Georgia provides credit for tax paid elsewhere, capped at GA TAVT amount. " +
      "Proof of tax paid required (prior title, registration, receipt). " +
      "If prior state's tax was lower, you owe the difference.",
  },

  // ============================================================================
  // GEORGIA TAVT CONFIGURATION (State-Specific Extras)
  // ============================================================================

  extras: {
    // Georgia TAVT-specific configuration
    gaTAVT: {
      defaultRate: 0.07, // 7% TAVT rate (as of 2024-2025)
      useAssessedValue: true, // Use DMV assessed value if higher than price
      useHigherOfPriceOrAssessed: true, // TAVT base = max(price, assessed)
      allowTradeInCredit: true, // Trade-in reduces TAVT base
      tradeInAppliesTo: "VEHICLE_ONLY", // Trade-in reduces vehicle price only
      applyNegativeEquityToBase: true, // Negative equity increases TAVT base
      leaseBaseMode: "AGREED_VALUE", // Leases use agreed value for TAVT (if applicable)
    },

    lastUpdated: "2025-01",
    sources: [
      "Georgia Department of Revenue (DOR)",
      "Georgia Code Title 48, Chapter 5C - Motor Vehicle Title Ad Valorem Tax",
      "Georgia DOR Motor Vehicle Division",
    ],
    notes:
      "Georgia uses TAVT (Title Ad Valorem Tax) for retail purchases at 7% of fair market value. " +
      "TAVT is a ONE-TIME tax that replaces annual property tax. " +
      "For leases, 4% state sales tax applies on monthly payments (not TAVT). " +
      "TAVT base is higher of purchase price or DMV assessed value. " +
      "Trade-in gets full credit. Limited reciprocity with proof of prior tax paid.",
    tavtRate: 7.0,
    leaseSalesTaxRate: 4.0,
  },
};

export default US_GA;
