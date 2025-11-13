import { TaxRulesConfig } from "../types";

/**
 * MASSACHUSETTS TAX RULES
 *
 * Researched: 2025-11-13
 * Version: 2
 *
 * KEY FACTS:
 * - State sales tax: 6.25% (STATE-ONLY, NO local taxes)
 * - Trade-in credit: FULL (uses gross allowance, not net equity)
 * - Doc fee: NO CAP, fully taxable (average $340)
 * - Manufacturer rebates: NOT taxable (if applied at time of sale)
 * - Dealer rebates: NOT taxable (also reduce taxable price)
 * - Service contracts & GAP: NOT taxable if separately stated
 * - Lease taxation: MONTHLY (6.25% on each payment)
 * - Reciprocity: YES (credit for taxes paid elsewhere, capped at MA rate)
 *
 * UNIQUE MASSACHUSETTS FEATURES:
 * - One of few states with NO local sales taxes on vehicles (flat 6.25% everywhere)
 * - BOTH manufacturer AND dealer rebates reduce taxable price (unusual)
 * - Trade-in credit uses GROSS allowance, not net equity (negative equity ignored for tax)
 * - Doc fee has NO CAP (average $340, but can be higher)
 * - VSC/GAP must be separately stated to avoid taxation
 * - Annual Motor Vehicle Excise Tax (2.5% of depreciated value) - separate from sales tax
 * - Trade-in credit history: None (pre-2009) → $10,000 cap (2009-2017) → Full (2017+)
 *
 * SOURCES:
 * - Massachusetts Department of Revenue (mass.gov/dor)
 * - Massachusetts General Laws (MGL) Chapter 64H (Sales Tax)
 * - MGL § 64H:6(s) (Motor Vehicle Trade-In Exemption)
 * - 830 CMR 64H.25.1 (Motor Vehicles, Motorboats, Recreational Vehicles)
 * - Directive 02-4 (Calculation of Trade-in Allowance)
 * - Directive 14-1 (Document and Title Preparation Fees)
 * - Directive 04-3 (Motor Vehicle Leases)
 */
export const US_MA: TaxRulesConfig = {
  stateCode: "MA",
  version: 2,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL (since August 2017)
   *
   * Massachusetts allows FULL trade-in credit with no cap. Importantly, the
   * credit is based on the GROSS trade-in allowance, not net equity.
   *
   * This means if a trade-in has negative equity (outstanding loan > trade value),
   * the tax calculation still uses the gross allowance, not the net amount after
   * paying off the lien.
   *
   * Example: $35,000 vehicle - $25,000 trade-in (with $20,000 loan) = $10,000 taxable
   * The $5,000 negative equity is rolled into the new loan but doesn't affect tax.
   *
   * Historical context:
   * - Pre-August 1, 2009: NO trade-in credit
   * - Aug 1, 2009 - July 31, 2017: $10,000 cap on credit
   * - Aug 1, 2017 - Present: FULL credit (current)
   *
   * Source: MGL § 64H:6(s), Directive 02-4, 830 CMR 64H.25.1
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules:
   *
   * Massachusetts is UNIQUE: BOTH manufacturer AND dealer rebates are
   * NON-TAXABLE and reduce the sale price before tax calculation.
   *
   * IMPORTANT: Manufacturer rebates must be applied at the time of sale.
   * If the rebate is received after the sale, the full price is taxed
   * with no refund available.
   *
   * This differs from most states where only manufacturer rebates reduce
   * the taxable base (and dealer rebates are taxable).
   *
   * Source: Mass.gov Motor Vehicle Sales Tax Guide, various dealer guidance
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: false,
      notes:
        "Manufacturer rebates reduce the purchase price before sales tax, " +
        "but ONLY if applied at the time of sale. Post-sale rebates don't reduce tax.",
    },
    {
      appliesTo: "DEALER",
      taxable: false,
      notes:
        "Dealer rebates/incentives ALSO reduce purchase price before tax " +
        "(UNIQUE - most states tax dealer rebates)",
    },
  ],

  /**
   * Doc Fee: TAXABLE, NO CAP
   *
   * Massachusetts doc fees are:
   * 1. Fully taxable as part of the sales price
   * 2. NO statutory cap (dealers can charge any amount)
   * 3. Average doc fee: $340
   * 4. Typical range: $200 - $400
   *
   * Legal requirements:
   * - Must be uniform (same fee for all customers)
   * - Must be included in advertised prices
   *
   * Doc fees are included in the taxable sale price whether paid at the
   * time of sale or financed into the loan.
   *
   * Source: Directive 14-1 (Document and Title Preparation Fees)
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules:
   *
   * Massachusetts requires that service contracts and GAP be SEPARATELY STATED
   * to avoid taxation. If bundled into the price without a separate line item,
   * they become taxable.
   *
   * - Service contracts (VSC): NOT taxable if separately stated
   * - GAP insurance: NOT taxable if separately stated
   * - Title fee: NOT taxable ($25 RMV government fee)
   * - Registration fee: NOT taxable (RMV government fee)
   * - Excise tax: NOT taxable (annual property tax, separate from sales tax)
   *
   * IMPORTANT: Always list VSC and GAP as separate line items on purchase
   * agreements to avoid taxation.
   *
   * Source: Directive 04-3 (Motor Vehicle Leases), 830 CMR 64H.25.1
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: false,
      notes:
        "Extended warranties/VSC are NOT taxable in MA if SEPARATELY STATED. " +
        "If bundled into total price, they become taxable. Always use separate line item.",
    },
    {
      code: "GAP",
      taxable: false,
      notes:
        "GAP insurance is NOT taxable in MA if SEPARATELY STATED. " +
        "If bundled into total price, it becomes taxable. Always use separate line item.",
    },
    {
      code: "TITLE",
      taxable: false,
      notes: "RMV title fee ($25) is not taxable (government fee)",
    },
    {
      code: "REG",
      taxable: false,
      notes: "RMV registration fee is not taxable (government fee)",
    },
    {
      code: "EXCISE_TAX",
      taxable: false,
      notes:
        "Motor Vehicle Excise Tax is an annual property tax on vehicles " +
        "(2.5% of depreciated value), NOT part of sales tax system.",
    },
  ],

  /**
   * Product Taxability:
   *
   * - Accessories: Taxable (when dealer-installed, added to vehicle price before trade-in credit)
   * - Negative equity: NOT taxable (tax uses gross trade allowance, not net equity)
   * - Service contracts: NOT taxable (if separately stated)
   * - GAP: NOT taxable (if separately stated)
   *
   * Example:
   * $30,000 vehicle + $2,000 accessories - $8,000 trade-in = $24,000 taxable
   *
   * Source: 830 CMR 64H.25.1
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: false, // MA uses gross trade allowance, ignores negative equity
  taxOnServiceContracts: false, // NOT taxable if separately stated
  taxOnGap: false, // NOT taxable if separately stated

  /**
   * Vehicle Tax Scheme: STATE_ONLY
   *
   * Massachusetts has one of the simplest sales tax systems in the nation:
   * - State sales tax: 6.25%
   * - NO county taxes
   * - NO city taxes
   * - NO special district taxes
   *
   * The rate is 6.25% everywhere in the state, making calculation straightforward.
   *
   * NOTE: Massachusetts has a separate Motor Vehicle Excise Tax (annual property
   * tax on vehicles) that is NOT part of the sales tax. Excise tax is 2.5% of
   * the vehicle's depreciated value and is paid annually to the city/town.
   *
   * Source: MGL Chapter 64H § 2
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
     * Massachusetts taxes leases on a MONTHLY basis. Sales tax (6.25%) is
     * charged on each monthly lease payment.
     *
     * Source: Directive 04-3, 830 CMR 64H.25.1
     */
    method: "MONTHLY",

    /**
     * Cap Cost Reduction: NOT taxed
     *
     * Cap cost reductions (cash down, trade-ins, rebates) reduce the capitalized
     * cost and are not themselves taxed. Only the monthly lease payments are taxed.
     */
    taxCapReduction: false,

    /**
     * Rebate Behavior on Leases: ALWAYS_NON_TAXABLE
     *
     * In Massachusetts, both manufacturer AND dealer rebates reduce the cap cost
     * and are non-taxable, consistent with retail treatment.
     *
     * This lowers the monthly payment and thus the tax paid monthly.
     */
    rebateBehavior: "ALWAYS_NON_TAXABLE",

    /**
     * Doc Fee on Leases: ALWAYS taxable
     *
     * Doc fees on leases are taxable (same as retail) and are typically
     * taxed upfront (capitalized or paid at signing).
     *
     * No cap on lease doc fees (same as retail).
     */
    docFeeTaxability: "ALWAYS",

    /**
     * Trade-in Credit on Leases: FULL
     *
     * Trade-ins on leases receive full credit (since August 2017) and reduce
     * the cap cost, lowering monthly payments and thus monthly tax.
     */
    tradeInCredit: "FULL",

    /**
     * Negative Equity on Leases: NOT taxable
     *
     * Negative equity rolled into a lease increases the gross cap cost but
     * doesn't affect the tax calculation (consistent with retail treatment
     * where gross trade allowance is used).
     */
    negativeEquityTaxable: false,

    /**
     * Fee Taxability on Leases:
     *
     * - Doc fee: Taxable (upfront), no cap
     * - Service contracts: NOT taxable if separately stated in lease contract
     * - GAP: NOT taxable if separately stated in lease contract
     * - Title: Not taxable
     * - Registration: Not taxable
     *
     * CRITICAL: VSC and GAP must be separately stated as optional charges
     * in the lease contract. If bundled into monthly payment without separate
     * line item, they become taxable.
     *
     * Source: Directive 04-3
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: true,
        notes: "Doc fee taxed upfront on lease, no cap (avg $340)",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: false,
        notes:
          "Service contracts NOT taxed when capitalized into lease IF SEPARATELY STATED " +
          "in lease contract as optional. If bundled, becomes taxable.",
      },
      {
        code: "GAP",
        taxable: false,
        notes:
          "GAP NOT taxed when capitalized into lease IF SEPARATELY STATED in lease " +
          "contract as optional. If bundled, becomes taxable.",
      },
      { code: "TITLE", taxable: false },
      { code: "REG", taxable: false },
    ],

    /**
     * Title Fee Rules on Leases:
     *
     * Title fees ($25 RMV fee) are:
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
     * Taxable fees (like doc fee) are taxed upfront at signing, not spread
     * across monthly payments.
     */
    taxFeesUpfront: true,

    /**
     * Special Scheme: NONE
     *
     * Massachusetts uses standard monthly lease taxation with no special
     * schemes or complex rules.
     */
    specialScheme: "NONE",

    notes:
      "Massachusetts: Monthly lease taxation. 6.25% state tax on each payment. " +
      "Full trade-in credit (since 2017, uses gross allowance). Both manufacturer and " +
      "dealer rebates reduce cap cost (non-taxable). Service contracts and GAP NOT taxed " +
      "IF SEPARATELY STATED (must be separate line items). Doc fee taxable, no cap (avg $340).",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: LIMITED
   *
   * Massachusetts provides LIMITED reciprocity for sales tax paid in other states:
   *
   * - If you paid sales tax in another state, Massachusetts will give you credit
   * - Credit is capped at the Massachusetts tax rate (6.25%)
   * - Requires proof of tax paid (receipt, title, registration)
   * - Applies to both retail and lease transactions
   *
   * When a vehicle is purchased out-of-state and brought to Massachusetts for
   * registration, the buyer must pay Massachusetts use tax (6.25%). However,
   * any sales tax paid to the other state is credited against the MA use tax due.
   *
   * IMPORTANT: No reciprocity with New Hampshire (NH has no sales tax on vehicles).
   * If you buy in NH and register in MA, you owe full 6.25% MA use tax.
   *
   * Example 1 (from state with higher tax):
   * - Buy vehicle in Rhode Island (RI tax: 7% = $3,500 on $50,000)
   * - Register in Massachusetts (MA would be: 6.25% = $3,125)
   * - Credit: $3,125 (capped at MA rate)
   * - Owe MA: $0 (credit covers full MA tax)
   *
   * Example 2 (from New Hampshire):
   * - Buy vehicle in New Hampshire (NH tax: 0%)
   * - Register in Massachusetts (MA tax: 6.25% = $3,125 on $50,000)
   * - Credit: $0 (NH has no sales tax)
   * - Owe MA: $3,125 (full MA use tax)
   *
   * Source: MGL Chapter 64I (Use Tax), 830 CMR 64I.1.1
   */
  reciprocity: {
    enabled: true,
    scope: "BOTH", // Applies to retail and lease
    homeStateBehavior: "CREDIT_UP_TO_STATE_RATE",
    requireProofOfTaxPaid: true,
    basis: "TAX_PAID",
    capAtThisStatesTax: true,
    hasLeaseException: false,
    notes:
      "Massachusetts provides credit for sales tax paid in other states, capped at MA rate (6.25%). " +
      "Requires proof of tax paid. NO reciprocity with New Hampshire (NH has no sales tax). " +
      "If other state's tax exceeds MA rate, no additional tax is owed.",
  },

  extras: {
    lastUpdated: "2025-11-13",
    sources: [
      "Massachusetts Department of Revenue (mass.gov/dor)",
      "Massachusetts General Laws (MGL) Chapter 64H - Sales Tax",
      "MGL Chapter 64I - Use Tax",
      "MGL § 64H:6(s) - Motor Vehicle Trade-In Exemption",
      "830 CMR 64H.25.1 - Motor Vehicles, Motorboats, Recreational Vehicles",
      "Directive 02-4 - Calculation of Trade-in Allowance",
      "Directive 14-1 - Document and Title Preparation Fees",
      "Directive 04-3 - Motor Vehicle Leases",
    ],
    notes:
      "Massachusetts has simple 6.25% state-only sales tax (no local taxes). " +
      "Doc fee NO CAP (average $340). Full trade-in credit since August 2017 (uses GROSS " +
      "allowance, not net equity - negative equity ignored for tax). BOTH manufacturer AND " +
      "dealer rebates reduce taxable sale price (unique - most states only allow manufacturer " +
      "rebates). Service contracts and GAP NOT taxed IF SEPARATELY STATED (must be separate " +
      "line items on invoices). Monthly lease taxation. Separate Motor Vehicle Excise Tax " +
      "(2.5% of depreciated value annually) NOT part of sales tax. No reciprocity with NH.",
    stateRate: 6.25,
    docFeeCapAmount: null, // No cap
    avgDocFee: 340,
    titleFee: 25,
    exciseTaxRate: 2.5, // Annual property tax, separate from sales tax
    tradeInCreditHistory: {
      "pre-2009": "NONE",
      "2009-08-01 to 2017-07-31": "CAPPED_10000",
      "2017-08-01 onwards": "FULL",
    },
  },
};

export default US_MA;
