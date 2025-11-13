import { TaxRulesConfig } from "../types";

/**
 * PENNSYLVANIA TAX RULES
 *
 * Researched: 2025-01
 * Version: 1
 *
 * KEY FACTS:
 * - Base state sales tax: 6%
 * - Local rates: Philadelphia adds 2% (8% total), Pittsburgh adds 1% (7% total)
 * - Allegheny County: 7% total (6% state + 1% local)
 * - Trade-in credit: FULL (deducted from sale price before tax)
 * - Doc fee: NOT taxable (unique - PA does NOT tax doc fees)
 * - Manufacturer rebates: NOT taxable (reduce sale price)
 * - Dealer rebates: Taxable (post-rebate price still taxed)
 * - Service contracts & GAP: NOT taxable (treated as insurance products)
 * - Lease taxation: MONTHLY with PA_LEASE_TAX special scheme
 * - Unique: PA has different lease tax treatment - only monthly payments taxed
 * - Reciprocity: YES (credit for tax paid elsewhere, capped at PA rate)
 *
 * UNIQUE FEATURES:
 * - Doc fees are NOT taxable (unlike most states)
 * - Service contracts and GAP treated as insurance (not taxable on retail or lease)
 * - Lease taxation only applies to monthly payments, no upfront taxation
 *
 * SOURCES:
 * - Pennsylvania Department of Revenue
 * - PA Code Title 61, Chapter 60 (Vehicle Sales Tax)
 * - PA Code Title 72, Section 7202 (Sales and Use Tax)
 */
export const US_PA: TaxRulesConfig = {
  stateCode: "PA",
  version: 1,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL
   *
   * Pennsylvania allows full trade-in credit. The trade-in value is deducted
   * from the purchase price before calculating sales tax.
   *
   * Example: $30,000 vehicle - $10,000 trade-in = $20,000 taxable base
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules:
   *
   * - Manufacturer rebates (MFR): NOT taxable - reduce the sale price
   * - Dealer rebates: Taxable - do not reduce the sale price for tax purposes
   *
   * This is standard Pennsylvania treatment per PA Code Title 61.
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: false,
      notes: "Manufacturer rebates reduce the purchase price before tax",
    },
    {
      appliesTo: "DEALER",
      taxable: true,
      notes: "Dealer rebates do not reduce the taxable sale price",
    },
  ],

  /**
   * Doc Fee: NOT TAXABLE (Unique)
   *
   * Pennsylvania is one of the few states where documentation fees are
   * NOT subject to sales tax. This is a significant difference from most
   * states and reduces the total tax burden.
   *
   * There is no state-mandated cap on doc fees in PA.
   */
  docFeeTaxable: false,

  /**
   * Fee Taxability Rules:
   *
   * - Service contracts: NOT TAXABLE (treated as insurance)
   * - GAP insurance: NOT TAXABLE (treated as insurance)
   * - Title fee: NOT taxable (government fee)
   * - Registration fee: NOT taxable (government fee)
   *
   * Pennsylvania treats service contracts and GAP as insurance products,
   * making them exempt from sales tax.
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: false,
      notes:
        "Extended warranties and service contracts are NOT taxable (treated as insurance)",
    },
    {
      code: "GAP",
      taxable: false,
      notes: "GAP insurance is NOT taxable (treated as insurance)",
    },
    { code: "TITLE", taxable: false, notes: "PennDOT title fee is not taxable" },
    {
      code: "REG",
      taxable: false,
      notes: "PennDOT registration fee is not taxable",
    },
  ],

  /**
   * Product Taxability:
   *
   * - Accessories: Taxable
   * - Negative equity: Taxable (rolled into financed amount)
   * - Service contracts: NOT taxable (insurance)
   * - GAP: NOT taxable (insurance)
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: true,
  taxOnServiceContracts: false,
  taxOnGap: false,

  /**
   * Vehicle Tax Scheme: STATE_PLUS_LOCAL
   *
   * Pennsylvania uses a combination of:
   * - State base rate: 6%
   * - Local rates: Philadelphia 2%, Pittsburgh/Allegheny 1%
   *
   * Major city rates:
   * - Philadelphia: 8% (6% state + 2% local)
   * - Pittsburgh: 7% (6% state + 1% local)
   * - Allegheny County: 7% (6% state + 1% local)
   * - Rest of state: 6% (state only)
   *
   * The tax is calculated on the sale location (point of sale).
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
     * Pennsylvania taxes leases on a MONTHLY basis. Sales tax is charged
     * on each monthly lease payment, not on the full capitalized cost upfront.
     *
     * This is similar to other states, but PA has NO upfront taxation on
     * any lease components (even fees).
     */
    method: "MONTHLY",

    /**
     * Cap Cost Reduction: NOT taxed
     *
     * Cap cost reductions (down payments, trade-ins, rebates applied
     * to reduce cap cost) are NOT taxed in Pennsylvania.
     */
    taxCapReduction: false,

    /**
     * Rebate Behavior on Leases: FOLLOW_RETAIL_RULE
     *
     * - Manufacturer rebates reduce cap cost (not taxed)
     * - Dealer rebates do not reduce taxable amount
     */
    rebateBehavior: "FOLLOW_RETAIL_RULE",

    /**
     * Doc Fee on Leases: NEVER taxable
     *
     * Doc fees on leases are NOT taxable in Pennsylvania, consistent
     * with retail treatment. This is unique to PA.
     */
    docFeeTaxability: "NEVER",

    /**
     * Trade-in Credit on Leases: FULL
     *
     * Trade-ins on leases receive full credit and reduce the cap cost.
     */
    tradeInCredit: "FULL",

    /**
     * Negative Equity on Leases: Taxable
     *
     * Negative equity rolled into a lease increases the cap cost and
     * increases monthly payments, thus increasing tax paid monthly.
     */
    negativeEquityTaxable: true,

    /**
     * Fee Taxability on Leases:
     *
     * - Doc fee: NOT taxable (PA does not tax doc fees)
     * - Service contracts: NOT taxable (treated as insurance)
     * - GAP: NOT taxable (treated as insurance)
     * - Title: Not taxable
     * - Registration: Not taxable
     *
     * Pennsylvania has unique lease treatment where NO fees are taxed
     * upfront - only the monthly base payment is subject to sales tax.
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: false,
        notes: "Doc fee NOT taxed in PA (unique)",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: false,
        notes: "Service contracts not taxed (treated as insurance)",
      },
      {
        code: "GAP",
        taxable: false,
        notes: "GAP not taxed (treated as insurance)",
      },
      { code: "TITLE", taxable: false },
      { code: "REG", taxable: false },
    ],

    /**
     * Title Fee Rules on Leases:
     *
     * Title fees are:
     * - Not taxable
     * - Included in cap cost
     * - Paid upfront (or capitalized)
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
     * Tax Fees Upfront: FALSE
     *
     * Unlike many states, Pennsylvania does NOT tax any fees upfront
     * on leases. Only monthly base payments are taxed.
     */
    taxFeesUpfront: false,

    /**
     * Special Scheme: PA_LEASE_TAX
     *
     * Pennsylvania has a unique lease taxation scheme where:
     * - Only monthly base payments are taxed
     * - NO upfront taxation on any component (fees, cap reduction, etc.)
     * - Service contracts and GAP remain non-taxable even on leases
     * - Doc fees are never taxed (unique to PA)
     */
    specialScheme: "PA_LEASE_TAX",

    notes:
      "Pennsylvania lease taxation: Monthly payment method with NO upfront taxation. " +
      "Doc fees are NOT taxable (unique to PA). Service contracts and GAP are NOT taxable " +
      "(treated as insurance). Trade-in gets full credit reducing cap cost.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: ENABLED (with cap)
   *
   * Pennsylvania DOES provide reciprocity credits for sales tax paid
   * in other states. If a vehicle was purchased out-of-state and tax
   * was paid, PA will provide a credit up to the amount of PA tax that
   * would have been due.
   *
   * Key rules:
   * - Credit is limited to PA tax rate (6% + local if applicable)
   * - Requires proof of tax paid in other state
   * - Applies to both retail and lease transactions
   * - If out-of-state tax exceeds PA tax, customer owes nothing additional
   * - If out-of-state tax is less than PA tax, customer pays the difference
   *
   * Example:
   * - Vehicle purchased in NJ with 6.625% tax paid
   * - PA rate is 6%
   * - Customer gets full credit (no PA tax due)
   *
   * Example 2:
   * - Vehicle purchased in DE with 0% tax paid (DE has no sales tax)
   * - PA rate is 6%
   * - Customer owes full 6% PA tax
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
      "Pennsylvania provides reciprocity credits for tax paid in other states, " +
      "capped at PA tax rate. Requires proof of tax paid. If out-of-state tax " +
      "exceeds PA tax, no additional tax is due. If less, customer pays difference.",
  },

  extras: {
    lastUpdated: "2025-01",
    sources: [
      "Pennsylvania Department of Revenue",
      "PA Code Title 61, Chapter 60 - Vehicle Sales Tax",
      "PA Code Title 72, Section 7202 - Sales and Use Tax",
    ],
    notes:
      "Pennsylvania has unique tax treatment: Doc fees are NOT taxable (rare), " +
      "service contracts and GAP are treated as insurance (not taxable). Base rate " +
      "is 6% with local additions in Philadelphia (2%) and Pittsburgh/Allegheny (1%). " +
      "Reciprocity is available with proof of tax paid elsewhere, capped at PA rate.",
    docFeeCapAmount: null, // No state cap on doc fees
    maxCombinedRate: 8.0, // Philadelphia: 6% state + 2% local
    majorCityRates: {
      Philadelphia: 8.0, // 6% state + 2% local
      Pittsburgh: 7.0, // 6% state + 1% local
      AlleghenyCounty: 7.0, // 6% state + 1% local
    },
  },
};

export default US_PA;
