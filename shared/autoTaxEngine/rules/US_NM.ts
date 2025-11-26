import type { TaxRulesConfig } from "../types";

/**
 * NEW MEXICO TAX RULES
 *
 * Researched: 2025-11-14
 * Version: 1
 *
 * KEY FACTS:
 * - Gross receipts tax (GRT): 5.125% state rate (NOT a traditional sales tax)
 * - Local GRT: Varies by location (1.0625% to 3.4375%)
 * - Combined rates: 6.1875% to 8.5625% (most common: 7.875% to 8.4375%)
 * - Trade-in credit: FULL deduction from taxable base
 * - Manufacturer rebates: NOT taxable (reduce tax base)
 * - Dealer rebates: NOT taxable (reduce selling price)
 * - Doc fee: TAXABLE, NO CAP (average $399)
 * - Service contracts (VSC): TAXABLE (unique - most states exempt)
 * - GAP insurance: TAXABLE (unique - most states exempt)
 * - Lease taxation: MONTHLY payment taxation
 * - Reciprocity: FULL credit for taxes paid to other states
 * - Title fee: $17.00 (not taxable when separately stated)
 *
 * UNIQUE NEW MEXICO FEATURES:
 * 1. GROSS RECEIPTS TAX (GRT) STRUCTURE:
 *    - NM has a "gross receipts tax" on sellers, not a "sales tax" on buyers
 *    - Legally imposed on the seller's gross receipts
 *    - Typically passed through to customers
 *    - Functions similarly to sales tax but has legal differences
 *
 * 2. SERVICE CONTRACTS AND GAP ARE TAXABLE:
 *    - Most states exempt VSC and GAP as insurance products
 *    - New Mexico TAXES both service contracts and GAP insurance
 *    - This is a major difference from neighboring states
 *    - Increases total cost of backend products significantly
 *
 * 3. COMBINED STATE + LOCAL GRT:
 *    - State GRT: 5.125%
 *    - County GRT: 0% to 1.5%
 *    - Municipal GRT: 0% to 2.5625%
 *    - Combined: Most areas 7.875% to 8.4375%
 *    - Albuquerque: 7.875% (5.125% state + 2.75% local)
 *    - Santa Fe: 8.4375% (5.125% state + 3.3125% local)
 *    - Las Cruces: 7.8125% (5.125% state + 2.6875% local)
 *
 * 4. MANUFACTURER REBATES NON-TAXABLE:
 *    - Manufacturer rebates reduce the taxable base
 *    - Customer pays tax on net price after rebate
 *    - This is standard treatment (unlike some states like Alabama)
 *
 * 5. NO DOC FEE CAP:
 *    - New Mexico does not limit dealer documentation fees
 *    - Average doc fee: $399
 *    - Doc fees are subject to GRT (taxable)
 *
 * 6. LEASE TAXATION - MONTHLY:
 *    - GRT applies to each monthly lease payment
 *    - No upfront tax on cap cost reductions
 *    - Trade-ins reduce cap cost, lowering monthly payment and tax
 *
 * 7. RECIPROCITY:
 *    - NM provides credit for GRT/sales tax paid to other states
 *    - Credit capped at NM's GRT rate
 *    - Proof of payment required
 *
 * TAX CALCULATION FORMULA (RETAIL):
 * Taxable Base = Vehicle Price + Accessories + Doc Fee - Trade-In - Rebates + VSC + GAP
 * GRT = Taxable Base × (5.125% state + Local GRT%)
 * Total Tax = State GRT + Local GRT
 * (Title fee separately stated NOT included)
 *
 * Example (Albuquerque - 7.875% total: 5.125% state + 2.75% local):
 * $30,000 vehicle + $399 doc fee + $1,500 VSC + $695 GAP - $10,000 trade-in
 * Taxable Base: $30,000 + $399 + $1,500 + $695 - $10,000 = $22,594
 * GRT: $22,594 × 7.875% = $1,779.28
 *
 * LEASE CALCULATION (MONTHLY):
 * Monthly GRT = Monthly Payment × (5.125% state + Local GRT%)
 * Total Lease GRT = Monthly GRT × Number of Payments
 *
 * Example (36-month lease, 7.875% rate):
 * Monthly Payment: $450
 * Monthly GRT: $450 × 7.875% = $35.44
 * Total GRT Over Lease: $35.44 × 36 = $1,275.84
 *
 * SOURCES:
 * - New Mexico Taxation and Revenue Department (TRD) - tax.newmexico.gov
 * - NM Statutes Annotated (NMSA) 1978, Section 7-9 (Gross Receipts Tax)
 * - NMSA 7-9-3: Imposition of gross receipts tax
 * - NMSA 7-9-4.2: Deduction for sale of motor vehicle to nonresident
 * - NMSA 7-9-57: Receipts from selling motor vehicles
 * - NM Administrative Code Title 3, Chapter 2 (Gross Receipts Tax)
 * - NM Taxation and Revenue Department: Gross Receipts Tax Rate Schedules
 */
export const US_NM: TaxRulesConfig = {
  stateCode: "NM",
  version: 1,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL
   *
   * New Mexico allows full trade-in credit. The trade-in value is deducted
   * from the purchase price before calculating gross receipts tax.
   *
   * Legal Framework (NMSA 7-9-57):
   * "Receipts from the sale of motor vehicles may be deducted to the extent
   * that the proceeds of the sale are used to purchase another motor vehicle
   * for resale."
   *
   * Treatment:
   * Trade-in value reduces the taxable receipts for GRT purposes.
   *
   * Example:
   *   Vehicle Price: $30,000
   *   Trade-In Value: $10,000
   *   Taxable Base: $20,000
   *   GRT (7.875%): $1,575
   *
   * This is consistent with most states and provides significant tax savings
   * for customers with trade-ins.
   *
   * Source: NMSA 7-9-57; NM TRD Gross Receipts Tax Information
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules: Both manufacturer and dealer rebates are NON-TAXABLE
   *
   * New Mexico allows manufacturer and dealer rebates to reduce the taxable
   * gross receipts.
   *
   * MANUFACTURER REBATES:
   * - Rebates reduce the selling price
   * - GRT calculated on net price after rebate
   * - Standard treatment in New Mexico
   *
   * Example:
   *   MSRP: $25,000
   *   Manufacturer Rebate: $2,000
   *   Net Price: $23,000
   *   Taxable Base: $23,000 (NOT $25,000)
   *   GRT (7.875%): $1,811.25
   *
   * DEALER REBATES:
   * - Same treatment as manufacturer rebates
   * - Reduce the taxable gross receipts
   *
   * This is favorable to buyers compared to states like Alabama where
   * rebates are taxable.
   *
   * Source: NMSA 7-9-3; NM TRD rulings on gross receipts
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: false,
      notes:
        "Manufacturer rebates reduce the taxable gross receipts. GRT calculated on net price " +
        "after rebate deduction.",
    },
    {
      appliesTo: "DEALER",
      taxable: false,
      notes:
        "Dealer rebates/incentives reduce the taxable selling price. GRT on actual price " +
        "charged to customer.",
    },
  ],

  /**
   * Doc Fee: TAXABLE, NO CAP
   *
   * Documentation fees are subject to gross receipts tax in New Mexico.
   *
   * Taxability:
   * Doc fees are considered part of the taxable gross receipts from the
   * sale and are subject to state + local GRT.
   *
   * No Statutory Cap:
   * New Mexico does not impose a statutory limit on dealer documentation fees.
   * - Average doc fee: $399 (2024 data)
   * - Observed range: $299 to $599
   * - Dealers set their own fees
   *
   * Example:
   *   Doc Fee: $399
   *   GRT Rate: 7.875%
   *   Tax on Doc Fee: $31.42
   *   Total Cost: $430.42
   *
   * Source: NMSA 7-9-3; industry data
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules
   *
   * New Mexico has UNIQUE rules compared to most states:
   * SERVICE CONTRACTS and GAP are TAXABLE.
   *
   * SERVICE CONTRACTS (VSC):
   * - TAXABLE in New Mexico (unlike most states)
   * - Subject to state + local GRT
   * - Increases total cost significantly
   *
   * Official Guidance:
   * Service contracts are considered tangible property transactions subject
   * to gross receipts tax.
   *
   * GAP INSURANCE:
   * - TAXABLE in New Mexico (unlike most states)
   * - Subject to state + local GRT
   * - Even though it's an insurance product, NM taxes it
   *
   * TITLE FEE:
   * - $17.00 flat fee
   * - NOT taxable when separately stated
   *
   * REGISTRATION FEES:
   * - NOT taxable (government fees)
   *
   * Example Impact:
   *   VSC: $1,500
   *   GAP: $695
   *   Total Backend: $2,195
   *   GRT (7.875%): $172.86
   *   Total Cost: $2,367.86
   *
   *   In most states, this would be $2,195 (no tax on VSC/GAP)
   *   NM customers pay $172.86 more due to GRT
   *
   * Source: NMSA 7-9-3; NM TRD rulings
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: true,
      notes:
        "Service contracts (VSC) ARE TAXABLE in New Mexico. Subject to state + local GRT. " +
        "This is UNIQUE - most states exempt VSC. Significantly increases backend product costs.",
    },
    {
      code: "GAP",
      taxable: true,
      notes:
        "GAP insurance IS TAXABLE in New Mexico. Subject to state + local GRT. This is UNIQUE - " +
        "most states exempt GAP as insurance product.",
    },
    {
      code: "DOC_FEE",
      taxable: true,
      notes:
        "Doc fees are TAXABLE. Subject to state + local GRT. No statutory cap (avg $399).",
    },
    {
      code: "TITLE",
      taxable: false,
      notes:
        "Title fee ($17) is NOT taxable when separately stated on invoice.",
    },
    {
      code: "REG",
      taxable: false,
      notes: "Registration fees are NOT taxable (government fees).",
    },
  ],

  /**
   * Product Taxability
   *
   * New Mexico taxes MORE items than most states:
   *
   * Accessories: TAXABLE (standard)
   * Negative Equity: TAXABLE when rolled into purchase price
   * Service Contracts: TAXABLE (UNIQUE - most states exempt)
   * GAP: TAXABLE (UNIQUE - most states exempt)
   *
   * The taxation of VSC and GAP is a major difference from other states
   * and significantly impacts F&I product costs.
   *
   * Example:
   *   Vehicle: $30,000
   *   Accessories: $2,000
   *   VSC: $1,500
   *   GAP: $695
   *   Total Taxable: $34,195
   *   GRT (7.875%): $2,693.36
   *
   *   In states that don't tax VSC/GAP:
   *   Taxable: $32,000
   *   Tax: $2,520
   *   Difference: $173.36 higher in NM
   *
   * Source: NMSA 7-9-3
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: true,
  taxOnServiceContracts: true, // UNIQUE to NM
  taxOnGap: true, // UNIQUE to NM

  /**
   * Vehicle Tax Scheme: STATE_PLUS_LOCAL
   *
   * New Mexico uses a combined state + county + municipal GRT system.
   *
   * State GRT: 5.125%
   * - Base state gross receipts tax rate
   * - Applies statewide
   *
   * Local GRT (County + Municipal):
   * - County rates: 0% to 1.5%
   * - Municipal rates: 0% to 2.5625%
   * - Most common combined local: 2.75% to 3.3125%
   *
   * Combined Rates (Total):
   * - Minimum: ~6.1875% (rural areas with low local rates)
   * - Maximum: ~8.5625% (high-tax municipalities)
   * - Common rates: 7.875% to 8.4375%
   *
   * Major Jurisdictions:
   * | Location | State | Local | Total |
   * |----------|-------|-------|-------|
   * | Albuquerque | 5.125% | 2.75% | 7.875% |
   * | Santa Fe | 5.125% | 3.3125% | 8.4375% |
   * | Las Cruces | 5.125% | 2.6875% | 7.8125% |
   * | Roswell | 5.125% | 2.3125% | 7.4375% |
   * | Farmington | 5.125% | 2.125% | 7.25% |
   *
   * Tax Collection Point:
   * GRT based on dealer location (point of sale), not buyer residence.
   *
   * Rate Resources:
   * NM Taxation and Revenue Department publishes quarterly GRT rate
   * schedules with rates for all municipalities and counties.
   *
   * Source: NMSA 7-9-3; NM TRD GRT Rate Schedules
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
     * New Mexico applies gross receipts tax to each monthly lease payment.
     *
     * Legal Framework:
     * Leasing of motor vehicles is subject to gross receipts tax on the
     * lease payments received.
     *
     * Tax Application:
     * - Monthly payments are taxed as they are received
     * - No upfront tax on cap cost reductions
     * - Trade-in reduces cap cost, lowering monthly payment
     *
     * Example:
     *   Monthly Payment: $450
     *   GRT Rate: 7.875%
     *   Monthly GRT: $35.44
     *   Total Monthly: $485.44
     *
     *   Over 36 months:
     *   Base Payments: $16,200
     *   Total GRT: $1,275.84
     *   Grand Total: $17,475.84
     *
     * Source: NMSA 7-9-3; NM TRD lease taxation guidance
     */
    method: "MONTHLY",

    /**
     * Cap Cost Reduction: Not taxed upfront (monthly method)
     *
     * Since NM uses monthly taxation, cap cost reductions are not taxed
     * upfront. They reduce the capitalized cost, which lowers the monthly
     * payment and thus the tax collected monthly.
     *
     * Treatment:
     * - Cash down: Reduces cap cost, lowers monthly payment
     * - Rebates: Same effect
     * - Trade-in: Same effect
     * - Cap reductions indirectly reduce total tax by lowering payments
     *
     * Example:
     *   Gross Cap Cost: $35,000
     *   Cap Reduction: $5,000
     *   Adjusted Cap Cost: $30,000
     *   Monthly Payment (lower due to cap reduction): $410 vs $475
     *   Tax Savings: ($475 - $410) × 7.875% × 36 = $183.69
     *
     * Source: NMSA 7-9-3
     */
    taxCapReduction: false,

    /**
     * Rebate Behavior on Leases: FOLLOW_RETAIL_RULE
     *
     * Manufacturer rebates on leases reduce the capitalized cost and are
     * not directly taxed. They lower monthly payments, indirectly reducing
     * the total GRT paid over the lease term.
     *
     * Treatment:
     * - Rebates reduce gross cap cost
     * - Lower monthly payment
     * - Tax benefit realized through lower monthly GRT
     *
     * Source: NMSA 7-9-3
     */
    rebateBehavior: "FOLLOW_RETAIL_RULE",

    /**
     * Doc Fee on Leases: FOLLOW_RETAIL_RULE (taxable)
     *
     * Doc fees on leases are taxable in New Mexico, following the same
     * rules as retail sales.
     *
     * Treatment:
     * - If paid upfront: Taxed at lease GRT rate
     * - If capitalized: Increases monthly payment, taxed monthly
     *
     * Most Common:
     * Doc fee paid upfront at signing and taxed immediately.
     *
     * Example:
     *   Doc Fee: $399
     *   GRT (7.875%): $31.42
     *   Total: $430.42
     *
     * Source: NMSA 7-9-3
     */
    docFeeTaxability: "FOLLOW_RETAIL_RULE",

    /**
     * Trade-in Credit on Leases: FULL
     *
     * Trade-ins on leases receive full credit in New Mexico, reducing the
     * capitalized cost and thus lowering monthly payments and tax.
     *
     * Treatment:
     * - Trade-in reduces gross cap cost
     * - Lowers monthly payment
     * - Reduces total GRT paid over lease term
     *
     * Example:
     *   Gross Cap Cost: $40,000
     *   Trade-In: $10,000
     *   Adjusted Cap Cost: $30,000
     *   Monthly Payment Impact: ~$300 reduction
     *   Tax Savings: $300 × 7.875% × 36 = $850.50
     *
     * Source: NMSA 7-9-57
     */
    tradeInCredit: "FULL",

    /**
     * Negative Equity on Leases: Taxable (increases payments)
     *
     * Negative equity rolled into a lease increases the capitalized cost,
     * raising monthly payments and thus the GRT paid each month.
     *
     * Example:
     *   Base Cap Cost: $30,000
     *   Negative Equity: $3,000
     *   Adjusted Cap Cost: $33,000
     *   Payment Increase: ~$90/month
     *   Additional GRT: $90 × 7.875% × 36 = $254.70
     *
     * Source: NMSA 7-9-3
     */
    negativeEquityTaxable: true,

    /**
     * Fee Taxability on Leases
     *
     * Backend products on leases follow same rules as retail in NM:
     * VSC and GAP are TAXABLE.
     *
     * SERVICE CONTRACTS (VSC):
     * - TAXABLE on leases (same as retail)
     * - If capitalized: Increases monthly payment and monthly GRT
     * - If paid upfront: Subject to GRT immediately
     *
     * GAP INSURANCE:
     * - TAXABLE on leases (same as retail)
     * - Same treatment as VSC
     *
     * Example (VSC capitalized into lease):
     *   VSC Cost: $1,500
     *   Added to Cap Cost: $1,500
     *   Monthly Payment Increase: ~$45
     *   Additional Monthly GRT: $45 × 7.875% = $3.54/month
     *   Total Additional GRT: $3.54 × 36 = $127.44
     *
     * Source: NMSA 7-9-3
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: true,
        notes: "Doc fee TAXABLE on leases (typically paid upfront and taxed immediately)",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: true,
        notes:
          "Service contracts TAXABLE on leases (UNIQUE to NM). If capitalized, increases " +
          "monthly payment and GRT.",
      },
      {
        code: "GAP",
        taxable: true,
        notes:
          "GAP TAXABLE on leases (UNIQUE to NM). If capitalized, increases monthly payment and GRT.",
      },
      {
        code: "TITLE",
        taxable: false,
        notes: "Title fee NOT taxable when separately stated",
      },
      {
        code: "REG",
        taxable: false,
        notes: "Registration fees NOT taxable",
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
      "New Mexico: MONTHLY lease taxation. GRT applies to each monthly payment at state + local " +
      "rate. Cap reductions not taxed upfront but reduce monthly payment (indirect tax benefit). " +
      "Trade-in gets full credit (reduces cap cost). UNIQUE: VSC and GAP are TAXABLE when " +
      "capitalized into lease (most states exempt). Doc fee taxable.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: FULL credit for taxes paid to other states
   *
   * New Mexico provides credit for sales/use tax or gross receipts tax paid
   * to other states.
   *
   * Legal Framework (NMSA 7-9-4.2):
   * "Deduction for sale of motor vehicle to nonresident. Receipts from
   * selling or leasing a motor vehicle to a person who is not a resident
   * of New Mexico may be deducted... if the purchaser provides evidence
   * that the vehicle will be registered in another state."
   *
   * Credit Mechanism:
   * NM allows a deduction from gross receipts for vehicles sold to
   * nonresidents who will register out-of-state.
   *
   * How It Works:
   *
   * Scenario 1: Out-of-State Buyer
   * - If buyer will register in another state
   * - Dealer may claim deduction from gross receipts
   * - Buyer pays no NM GRT (or reduced GRT)
   * - Buyer pays tax in home state upon registration
   *
   * Scenario 2: NM Resident Purchasing Out-of-State
   * - If tax paid to another state
   * - NM provides credit against NM use tax
   * - Credit capped at NM's GRT rate
   *
   * Documentation Required:
   * - Proof of nonresident status
   * - Proof of out-of-state registration
   * - Evidence of tax paid in other state (if claiming credit)
   *
   * Example (Texas buyer purchasing in NM):
   *   Vehicle: $30,000
   *   NM GRT: $0 (nonresident deduction)
   *   TX Sales Tax upon registration: 6.25% = $1,875
   *
   * Example (NM resident purchasing in Texas):
   *   Vehicle: $30,000
   *   TX Tax Paid: 6.25% = $1,875
   *   NM Use Tax Due: 7.875% = $2,362.50
   *   Credit for TX Tax: $1,875
   *   Additional NM Tax: $487.50
   *
   * Source: NMSA 7-9-4.2; NM TRD nonresident sale guidance
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
      "NM provides FULL credit for taxes paid to other states, capped at NM's GRT rate. " +
      "Nonresident buyers can claim deduction from NM GRT if vehicle will be registered " +
      "out-of-state. NM residents purchasing out-of-state receive credit for tax paid, with " +
      "any difference due to NM. Proof of payment required.",
  },

  extras: {
    lastUpdated: "2025-11-14",
    sources: [
      "New Mexico Taxation and Revenue Department (TRD) - tax.newmexico.gov",
      "NM Statutes Annotated (NMSA) 1978, Section 7-9 - Gross Receipts Tax",
      "NMSA 7-9-3: Imposition of gross receipts tax",
      "NMSA 7-9-4.2: Deduction for sale of motor vehicle to nonresident",
      "NMSA 7-9-57: Receipts from selling motor vehicles",
      "NM Administrative Code Title 3, Chapter 2 - Gross Receipts Tax",
      "NM TRD: Gross Receipts Tax Rate Schedules (quarterly updates)",
      "NM Motor Vehicle Division - mvd.newmexico.gov",
      "Federation of Tax Administrators - State Tax Data",
    ],
    notes:
      "New Mexico uses a Gross Receipts Tax (GRT) system (a privilege tax on seller), not a traditional sales tax. State " +
      "GRT 5.125% + local up to 4.1875% = combined rate 5.125% to 9.3125% maximum. " +
      "UNIQUE: VSC and GAP are TAXABLE (most states exempt). This significantly increases backend " +
      "product costs. Manufacturer rebates reduce tax base (favorable). Full trade-in credit. No " +
      "doc fee cap (avg $399). Monthly lease taxation. Full reciprocity with credit for out-of-state " +
      "taxes paid. Nonresident deduction available for out-of-state buyers. Title fee: $17.",
    stateGRTRate: 5.125,
    localGRTRange: { min: 0, max: 4.1875 },
    combinedRateRange: { min: 5.125, max: 9.3125 },
    combinedGRTRange: { min: 5.125, max: 9.3125 },
    avgDocFee: 399,
    titleFee: 17.0,
    majorJurisdictions: {
      Albuquerque: { state: 5.125, local: 2.75, total: 7.875 },
      SantaFe: { state: 5.125, local: 3.3125, total: 8.4375 },
      LasCruces: { state: 5.125, local: 2.6875, total: 7.8125 },
      Roswell: { state: 5.125, local: 2.3125, total: 7.4375 },
      Farmington: { state: 5.125, local: 2.125, total: 7.25 },
    },
    vscTaxable: true, // UNIQUE
    gapTaxable: true, // UNIQUE
  },
};

export default US_NM;
