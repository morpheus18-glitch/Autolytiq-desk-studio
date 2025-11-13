import { TaxRulesConfig } from "../types";

/**
 * NORTH CAROLINA TAX RULES - HIGHWAY USE TAX (HUT) SYSTEM
 *
 * Researched: 2025-01
 * Version: 1
 *
 * ⚠️ CRITICAL: North Carolina does NOT use traditional sales tax for vehicles
 *
 * KEY FACTS:
 * - North Carolina uses Highway Use Tax (HUT) instead of sales tax
 * - HUT rate: 3% of purchase price (state-only, no local rates)
 * - One-time tax paid at title/registration
 * - Trade-in credit: FULL (deducted before HUT calculation)
 * - Doc fee: TAXABLE (subject to HUT)
 * - Manufacturer rebates: NOT taxable (reduce purchase price)
 * - Dealer rebates: Taxable (do not reduce purchase price)
 * - Service contracts & GAP: NOT subject to HUT
 * - Lease taxation: 3% HUT on monthly payments (same as retail rate)
 * - Reciprocity: YES, but with 90-day time window restriction
 *
 * UNIQUE HUT SYSTEM:
 * - HUT applies to both RETAIL and LEASE transactions
 * - State-only tax (no local jurisdiction stacking)
 * - Paid at title/registration (not at point of sale)
 * - Reciprocity credit allowed ONLY if tax paid within 90 days
 * - Maximum reciprocity credit capped at NC HUT amount
 *
 * SOURCES:
 * - North Carolina Department of Revenue
 * - North Carolina General Statutes Chapter 105, Article 5A - Highway Use Tax
 * - NCDOR Motor Vehicle Division
 */
export const US_NC: TaxRulesConfig = {
  stateCode: "NC",
  version: 1,

  // ============================================================================
  // RETAIL TRANSACTION RULES (HUT SYSTEM)
  // ============================================================================

  /**
   * Trade-in Policy: FULL
   *
   * North Carolina allows full trade-in credit under HUT. The trade-in value
   * is deducted from the purchase price before calculating HUT.
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules:
   *
   * Under North Carolina HUT:
   * - Manufacturer rebates: NOT taxable (reduce purchase price before HUT)
   * - Dealer rebates: Taxable (do not reduce purchase price)
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: false,
      notes: "Manufacturer rebates reduce purchase price before HUT calculation",
    },
    {
      appliesTo: "DEALER",
      taxable: true,
      notes: "Dealer rebates do not reduce HUT base",
    },
  ],

  /**
   * Doc Fee: TAXABLE
   *
   * Documentation fees ARE subject to HUT in North Carolina.
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules:
   *
   * Under HUT:
   * - Service contracts: NOT subject to HUT
   * - GAP insurance: NOT subject to HUT
   * - Title/registration: Government fees, not taxable
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: false,
      notes: "Service contracts not subject to HUT",
    },
    {
      code: "GAP",
      taxable: false,
      notes: "GAP insurance not subject to HUT",
    },
    { code: "TITLE", taxable: false, notes: "Government fee, not taxable" },
    { code: "REG", taxable: false, notes: "Government fee, not taxable" },
  ],

  /**
   * Product Taxability:
   *
   * Under HUT:
   * - Accessories: Included in HUT base if part of vehicle sale
   * - Negative equity: Added to HUT base
   * - Service contracts: NOT subject to HUT
   * - GAP: NOT subject to HUT
   */
  taxOnAccessories: true, // Included in HUT base
  taxOnNegativeEquity: true, // Added to HUT base
  taxOnServiceContracts: false, // Not subject to HUT
  taxOnGap: false, // Not subject to HUT

  /**
   * Vehicle Tax Scheme: SPECIAL_HUT
   *
   * North Carolina uses a Highway Use Tax system that is fundamentally
   * different from sales tax. This flag tells the engine to branch to
   * the North Carolina HUT calculator instead of using the generic sales
   * tax pipeline.
   *
   * HUT is:
   * - A one-time tax paid at title/registration
   * - Based on net purchase price (after trade-in and mfr rebates)
   * - Fixed at 3% state-only (no local jurisdiction stacking)
   * - Applies to both retail and lease transactions
   */
  vehicleTaxScheme: "SPECIAL_HUT",
  vehicleUsesLocalSalesTax: false, // HUT is state-only, no local rates

  // ============================================================================
  // LEASE TRANSACTION RULES (HUT ON MONTHLY PAYMENTS)
  // ============================================================================

  leaseRules: {
    /**
     * Lease Method: MONTHLY
     *
     * North Carolina leases are taxed using HUT on monthly payments:
     * - 3% state HUT (same as retail, no local rates)
     * - Tax is applied to each monthly payment
     * - No upfront HUT on cap cost reduction
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
     * Doc fees on leases are subject to the 3% HUT.
     */
    docFeeTaxability: "ALWAYS",

    /**
     * Trade-in Credit on Leases: FULL
     *
     * Trade-ins reduce the capitalized cost on leases, lowering the
     * monthly payment and thus the monthly HUT.
     */
    tradeInCredit: "FULL",

    /**
     * Negative Equity on Leases: Taxable
     *
     * Negative equity increases the cap cost, increases monthly payments,
     * and thus increases the monthly HUT.
     */
    negativeEquityTaxable: true,

    /**
     * Fee Taxability on Leases:
     *
     * - Doc fee: Taxable (3% HUT)
     * - Service contracts: NOT taxable
     * - GAP: NOT taxable
     * - Title: Not taxable
     * - Registration: Not taxable
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: true,
        notes: "Doc fee subject to 3% HUT on leases",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: false,
        notes: "Not subject to HUT",
      },
      {
        code: "GAP",
        taxable: false,
        notes: "Not subject to HUT",
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
     * Special Scheme: NONE (HUT handled at root level)
     *
     * North Carolina uses the HUT scheme for both retail and leases,
     * but the specialScheme field here is NONE because the dispatcher
     * routes based on vehicleTaxScheme at the root level.
     */
    specialScheme: "NONE",

    notes:
      "North Carolina leases use 3% state HUT on monthly payments (same as retail). " +
      "HUT is state-only with no local rates. Service contracts and GAP not taxed.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: LIMITED (90-DAY TIME WINDOW)
   *
   * North Carolina provides limited reciprocity for HUT:
   * - Credit for sales tax or similar tax paid in another state
   * - Credit is capped at the North Carolina HUT amount (3%)
   * - ⚠️ CRITICAL: Tax must have been paid within 90 days
   * - Requires proof of tax paid (title, registration, receipt)
   * - Applies when a vehicle titled elsewhere is brought to NC
   *
   * Example:
   * - Buy vehicle in South Carolina (SC tax: 5% = $1,500 on $30k vehicle)
   * - Move to North Carolina within 30 days and register (NC HUT: 3% = $900)
   * - Credit: $900 (capped at NC HUT, not full SC tax)
   * - Owe NC: $0 (SC tax exceeds NC HUT)
   *
   * Example 2 (EXPIRED TIME WINDOW):
   * - Buy vehicle in Tennessee 100 days ago (TN tax: 7% = $2,100)
   * - Move to North Carolina now (NC HUT: 3% = $900)
   * - Credit: $0 (exceeds 90-day window)
   * - Owe NC: $900 (full NC HUT, no credit)
   */
  reciprocity: {
    enabled: true,
    scope: "BOTH", // Applies to retail and lease
    homeStateBehavior: "CREDIT_UP_TO_STATE_RATE",
    requireProofOfTaxPaid: true,
    basis: "TAX_PAID",
    capAtThisStatesTax: true,
    hasLeaseException: false, // Same treatment for leases

    // Pairwise reciprocity overrides (90-day time window)
    overrides: [
      {
        originState: "ALL", // Apply to all states
        maxAgeDaysSinceTaxPaid: 90,
        notes:
          "North Carolina requires tax to have been paid within 90 days. " +
          "If tax was paid more than 90 days ago, NO credit is allowed.",
      },
    ],

    notes:
      "North Carolina HUT reciprocity has a 90-day time window restriction. " +
      "Credit for tax paid elsewhere is capped at NC HUT amount (3%). " +
      "Proof of tax paid required (prior title, registration, receipt). " +
      "If prior state's tax was paid more than 90 days ago, NO credit allowed.",
  },

  // ============================================================================
  // NORTH CAROLINA HUT CONFIGURATION (State-Specific Extras)
  // ============================================================================

  extras: {
    // North Carolina HUT-specific configuration
    ncHUT: {
      baseRate: 0.03, // 3% HUT rate
      useHighwayUseTax: true, // Use HUT instead of sales tax
      includeTradeInReduction: true, // Trade-in reduces HUT base
      applyToNetPriceOnly: true, // HUT applies to net price (after trade-in, rebates)
      maxReciprocityAgeDays: 90, // 90-day time window for reciprocity
    },

    lastUpdated: "2025-01",
    sources: [
      "North Carolina Department of Revenue",
      "North Carolina General Statutes Chapter 105, Article 5A - Highway Use Tax",
      "NCDOR Motor Vehicle Division",
    ],
    notes:
      "North Carolina uses HUT (Highway Use Tax) for both retail and lease transactions at 3% state-only. " +
      "HUT is a ONE-TIME tax paid at title/registration (retail) or applied to monthly payments (lease). " +
      "Trade-in gets full credit. Manufacturer rebates reduce base. " +
      "⚠️ CRITICAL: Reciprocity has 90-day time window - tax must have been paid within 90 days.",
    hutRate: 3.0,
    timeWindowDays: 90,
  },
};

export default US_NC;
