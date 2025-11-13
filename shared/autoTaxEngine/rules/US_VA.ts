import { TaxRulesConfig } from "../types";

/**
 * VIRGINIA TAX RULES (Updated 2025-11-13)
 *
 * SOURCES:
 * - Virginia Department of Motor Vehicles (dmv.virginia.gov)
 * - Virginia Department of Taxation (tax.virginia.gov)
 * - Virginia Code Title 58.1, Chapter 24 (Virginia Motor Vehicle Sales and Use Tax)
 * - Virginia Code § 58.1-2401 (Definitions)
 * - Virginia Code § 58.1-2402 (Levy)
 * - Virginia Code § 58.1-2403 (Exemptions)
 * - Virginia Administrative Code 23VAC10-210-910 (Maintenance Contracts and Warranty Plans)
 * - Virginia Administrative Code 23VAC10-210-990 (Motor Vehicle Sales, Leases, and Rentals)
 * - Virginia Code Title 38.2, Chapter 64 (GAP Waivers)
 *
 * RETAIL SALES:
 * - State tax: 4.15% (flat, statewide - no local vehicle tax additions)
 * - Trade-in policy: NONE - Trade-ins DO NOT reduce taxable amount (VA taxes full vehicle price)
 * - Manufacturer rebates: NOT taxable (reduce sale price before tax calculation)
 * - Dealer rebates: NOT taxable (reduce sale price before tax calculation)
 * - Doc fee: TAXABLE (included in gross sales price, NO STATE CAP on amount)
 * - Service contracts: TAXABLE at 50% (parts/labor contracts taxed on half the contract price)
 * - GAP: NOT clearly defined in statute (treated as non-insurance product, likely not taxed)
 * - Accessories: TAXABLE (included in sale price as attachments/accessories)
 * - Negative equity: NOT taxable (financing issue, not part of sale price)
 * - Minimum tax: $75 (if calculated tax is less than $75, $75 is owed)
 *
 * LEASE TAXATION:
 * - Method: FULL_UPFRONT (4.15% applied to capitalized cost at lease signing)
 * - Cap cost reduction: Included in capitalized cost (taxed upfront)
 * - Trade-in on leases: NONE - Trade-ins provide NO sales tax credit in VA
 * - Rebates on leases: Follow retail rules (manufacturer/dealer rebates reduce cap cost)
 * - Doc fee on leases: TAXABLE (included in capitalized cost)
 * - Service contracts: TAXABLE at 50% if capitalized (parts/labor contracts)
 * - GAP: NOT clearly taxable (likely not taxed based on GAP waiver statute)
 * - Special scheme: VA_USAGE (Virginia's unique upfront cap cost taxation + personal property tax)
 *
 * RECIPROCITY:
 * - ENABLED with credit for tax paid to other states
 * - Credit is capped at Virginia's tax rate (4.15%)
 * - Requires proof of tax paid to other state
 * - Credit applies to both retail and lease transactions
 * - 12-month ownership window: If owned > 12 months OR paid tax elsewhere = exempt/credited
 *
 * SPECIAL RULES:
 * - Disability equipment: NOT taxable (controls, lifts, power equipment for disabled drivers)
 * - Gift transfers: Exempt if to spouse, son, daughter, or parent
 * - Personal property tax: Separate annual tax (not part of sales tax, based on value as of Jan 1)
 * - Service contracts from insurance companies: Exempt (considered insurance, not taxable)
 *
 * UNIQUE FEATURES:
 * - One of the strictest trade-in policies in the US (NO credit at all)
 * - Flat 4.15% statewide (no local add-ons for motor vehicles)
 * - Service contracts taxed at 50% (unique "half parts, half labor" rule)
 * - Lease tax paid fully upfront on capitalized cost (no monthly payment taxation)
 * - No doc fee cap (dealers can charge unlimited documentation fees)
 * - Separate personal property tax system (semi-annual bills for vehicle value)
 */
export const US_VA: TaxRulesConfig = {
  stateCode: "VA",
  version: 1,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: NONE
   *
   * Virginia does NOT allow trade-in credits to reduce the taxable amount.
   * Per Virginia Code § 58.1-2401, "sale price" means the total price paid
   * for a motor vehicle "without any allowance or deduction for trade-ins or
   * unpaid liens or encumbrances."
   *
   * This makes Virginia one of the least favorable states for trade-ins from
   * a tax perspective. You pay sales tax on the full purchase price of the
   * new vehicle, regardless of trade-in value.
   *
   * Example:
   * - New vehicle price: $40,000
   * - Trade-in allowance: $5,000
   * - Net amount financed: $35,000
   * - Taxable base: $40,000 (full price, no trade-in credit)
   * - Sales tax: $40,000 × 4.15% = $1,660
   */
  tradeInPolicy: { type: "NONE" },

  /**
   * Rebate Rules:
   *
   * Virginia Code § 58.1-2401 explicitly states that "sale price" does NOT
   * include "any manufacturer rebate or manufacturer incentive payment applied
   * to the transaction by the customer or dealer whether as a reduction in the
   * sales price or as payment for the vehicle."
   *
   * BOTH manufacturer and dealer rebates reduce the sale price before tax
   * calculation. This is more favorable than many states that tax dealer
   * rebates/incentives.
   *
   * - Manufacturer rebates: NOT taxable (reduce sale price)
   * - Dealer rebates/incentives: NOT taxable (reduce sale price)
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: false,
      notes:
        "Manufacturer rebates and incentives reduce sale price before tax calculation per VA Code § 58.1-2401",
    },
    {
      appliesTo: "DEALER",
      taxable: false,
      notes:
        "Dealer rebates and incentives also reduce sale price before tax (more favorable than many states)",
    },
  ],

  /**
   * Doc Fee: TAXABLE with NO CAP
   *
   * Documentation fees are TAXABLE in Virginia and are included in the gross
   * sales price per Virginia DMV guidance. Unlike states like New York ($175 cap),
   * California ($85 cap), or Florida ($899 median), Virginia has NO STATUTORY
   * CAP on documentation fees.
   *
   * Dealers in Virginia can charge whatever doc fee they choose, making VA
   * one of the states with the highest and most variable doc fees (ranging
   * from $400 to $900+).
   *
   * The doc fee is subject to the 4.15% sales tax.
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules:
   *
   * - Service contracts (extended warranties): TAXABLE at 50% for parts/labor contracts
   * - GAP insurance/waivers: NOT clearly taxable (GAP waivers defined as "not insurance"
   *   under VA Code § 38.2-6401, no explicit sales tax statute found)
   * - Title fee: NOT taxable (DMV government fee)
   * - Registration fee: NOT taxable (DMV government fee)
   *
   * Service Contract Taxation (23VAC10-210-910):
   * - Labor-only contracts: NOT taxable
   * - Parts-only contracts: 100% taxable
   * - Parts + labor contracts: 50% taxable (deemed half parts, half labor)
   * - Insurance company warranties: NOT taxable (considered insurance)
   *
   * This "50% rule" is unique to Virginia and recognizes that maintenance
   * contracts include both taxable parts and non-taxable labor services.
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: true,
      notes:
        "Service contracts taxable at 50% if parts+labor per 23VAC10-210-910. " +
        "Engine calculates 50% of contract price. Insurance company warranties exempt.",
    },
    {
      code: "GAP",
      taxable: false,
      notes:
        "GAP waivers defined as 'not insurance' under VA Code § 38.2-6401. " +
        "No clear sales tax statute found. Conservative approach: not taxed.",
    },
    {
      code: "TITLE",
      taxable: false,
      notes: "DMV title fee is a government charge, not taxable",
    },
    {
      code: "REG",
      taxable: false,
      notes: "DMV registration fee is a government charge, not taxable",
    },
  ],

  /**
   * Product Taxability:
   *
   * - Accessories: TAXABLE (VA Code § 58.1-2401 includes "all attachments
   *   thereon and accessories thereto" in sale price definition)
   * - Negative equity: NOT taxable (financing issue, not part of sale price)
   * - Service contracts: TAXABLE at 50% (see feeTaxRules above)
   * - GAP: NOT taxable (see feeTaxRules above)
   *
   * Important: Negative equity rolled into a loan increases the financed
   * amount but does NOT increase the taxable sale price. You pay tax on
   * the vehicle price, not on negative equity from the trade-in.
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: false, // Negative equity is a financing issue, not taxable
  taxOnServiceContracts: true, // At 50% for parts+labor contracts
  taxOnGap: false, // GAP waivers not clearly taxable under VA law

  /**
   * Vehicle Tax Scheme: STATE_ONLY
   *
   * Virginia's Motor Vehicle Sales and Use Tax (MVSUT) is a flat 4.15%
   * statewide rate with NO local add-ons per Virginia Code § 58.1-2402.
   *
   * This is different from Virginia's general sales tax (4.3% state + 1% local
   * minimum + potential additional regional taxes in Northern VA/Hampton Roads).
   * Motor vehicles are specifically taxed under Chapter 24 at the flat 4.15% rate.
   *
   * The rate has been 4.15% since July 1, 2016.
   *
   * Minimum tax: $75 (if calculated tax < $75, then $75 is owed)
   */
  vehicleTaxScheme: "STATE_ONLY",
  vehicleUsesLocalSalesTax: false, // Motor vehicles do not use local sales tax in VA

  // ============================================================================
  // LEASE TRANSACTION RULES
  // ============================================================================

  leaseRules: {
    /**
     * Lease Method: FULL_UPFRONT
     *
     * Virginia taxes leases on the FULL CAPITALIZED COST at lease signing,
     * not on monthly payments. This is confirmed by multiple sources including
     * Leasehackr forums and dealer practice.
     *
     * The 4.15% Motor Vehicle Sales and Use Tax is applied to the capitalized
     * cost (gross cap cost after all reductions) as an upfront cost at signing.
     *
     * This is DIFFERENT from monthly payment taxation states (like Indiana)
     * and makes Virginia leases more expensive at signing.
     *
     * Example:
     * - MSRP: $50,000
     * - Negotiated cap cost: $48,000
     * - Cap reduction (down + rebates): $5,000
     * - Adjusted cap cost: $43,000
     * - Upfront sales tax: $43,000 × 4.15% = $1,784.50 (due at signing)
     * - Monthly payments: No additional sales tax
     */
    method: "FULL_UPFRONT",

    /**
     * Cap Cost Reduction: Reduces taxable base
     *
     * Cap cost reductions (cash down, trade-in equity, rebates) reduce the
     * capitalized cost before the upfront tax is calculated. Since tax is
     * applied to the adjusted capitalized cost, reductions lower the tax.
     *
     * However, note that trade-ins provide NO additional credit beyond
     * reducing cap cost (see tradeInCredit below).
     */
    taxCapReduction: false, // Cap reductions reduce the base before tax, not taxed themselves

    /**
     * Rebate Behavior on Leases: FOLLOW_RETAIL_RULE
     *
     * Manufacturer and dealer rebates applied to leases reduce the capitalized
     * cost before the upfront 4.15% tax is calculated, following the same
     * treatment as retail purchases.
     */
    rebateBehavior: "FOLLOW_RETAIL_RULE",

    /**
     * Doc Fee on Leases: ALWAYS taxable
     *
     * Documentation fees on leases are included in the capitalized cost and
     * therefore subject to the upfront 4.15% tax, just like retail purchases.
     */
    docFeeTaxability: "ALWAYS",

    /**
     * Trade-in Credit on Leases: NONE
     *
     * Virginia provides NO sales tax credit for trade-ins on leases, just as
     * with retail purchases. The trade-in may reduce the capitalized cost
     * (lowering the taxable base), but there is no separate trade-in credit
     * beyond that reduction.
     *
     * From Leasehackr forums: "In VA you pay full sales tax up front and
     * receive no sales tax credit for your trade-in vehicle."
     *
     * This makes Virginia one of the least favorable states for leasing
     * when you have a trade-in.
     */
    tradeInCredit: "NONE",

    /**
     * Negative Equity on Leases: NOT taxable
     *
     * Negative equity rolled into a lease increases the capitalized cost
     * and therefore increases the financed amount, but it is NOT considered
     * part of the taxable sale price (same as retail).
     */
    negativeEquityTaxable: false,

    /**
     * Fee Taxability on Leases:
     *
     * - Doc fee: TAXABLE (included in cap cost)
     * - Service contracts: TAXABLE at 50% if capitalized (parts+labor contracts)
     * - GAP: NOT clearly taxable (likely not taxed)
     * - Title: NOT taxable
     * - Registration: NOT taxable
     *
     * Service contracts and GAP waivers capitalized into a lease would follow
     * the same tax treatment as retail (50% for service contracts, GAP not taxed).
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: true,
        notes: "Doc fee included in capitalized cost, subject to upfront 4.15% tax",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: true,
        notes:
          "Service contracts capitalized into lease taxed at 50% if parts+labor (same as retail)",
      },
      {
        code: "GAP",
        taxable: false,
        notes: "GAP waivers not clearly taxable (same as retail)",
      },
      { code: "TITLE", taxable: false, notes: "DMV title fee not taxable" },
      { code: "REG", taxable: false, notes: "DMV registration fee not taxable" },
    ],

    /**
     * Title Fee Rules on Leases:
     *
     * Title processing fees:
     * - Not taxable
     * - Included in cap cost (increases cap cost)
     * - Paid upfront
     * - Not spread into monthly payments
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
     * All taxable fees (doc fee, service contracts at 50%) are taxed upfront
     * on leases as part of the capitalized cost taxation.
     */
    taxFeesUpfront: true,

    /**
     * Special Scheme: VA_USAGE
     *
     * Virginia has a unique lease taxation scheme:
     * 1. Upfront 4.15% tax on capitalized cost (one-time at signing)
     * 2. Separate personal property tax (semi-annual, based on vehicle value)
     *
     * The personal property tax is NOT part of the sales tax system and is
     * billed separately by localities twice per year (due May 5 and October 5).
     * This creates a "double taxation" feel that is unique to Virginia leases.
     *
     * The special scheme indicator VA_USAGE reminds interpreters to account
     * for this unique structure.
     */
    specialScheme: "VA_USAGE",

    notes:
      "Virginia lease taxation: Full upfront tax on capitalized cost (4.15%) at signing, " +
      "NOT on monthly payments. Trade-ins provide NO tax credit (only reduce cap cost). " +
      "Service contracts taxed at 50% if capitalized. GAP not clearly taxable. " +
      "Separate personal property tax applies (semi-annual bills). " +
      "Virginia is one of the least favorable states for leasing with a trade-in.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: ENABLED with credit for tax paid elsewhere
   *
   * Virginia Code § 58.1-2403 provides an exemption for vehicles being
   * registered for the first time in Virginia if:
   *
   * 1. The applicant holds a valid, assignable title from another state, AND
   * 2. EITHER:
   *    a) Has owned the vehicle for longer than 12 months, OR
   *    b) Has owned for less than 12 months AND provides evidence of sales
   *       tax paid to another state
   *
   * If tax was paid to another state within the last 12 months, Virginia
   * grants credit for the amount paid, provided proof is submitted.
   *
   * The credit is capped at what Virginia would have charged (4.15% of the
   * vehicle price). If you paid more than Virginia's tax in another state,
   * you don't get a refund of the excess.
   *
   * Example:
   * - Buy vehicle in Maryland for $40,000, pay 6% MD tax = $2,400
   * - Register in Virginia within 12 months
   * - Virginia tax would be: $40,000 × 4.15% = $1,660
   * - Credit: $1,660 (capped at VA tax, not full $2,400 paid to MD)
   * - Additional VA tax owed: $0
   *
   * If you paid LESS than Virginia's tax:
   * - Buy vehicle in Delaware (no sales tax), pay $0
   * - Register in Virginia within 12 months
   * - Virginia tax: $40,000 × 4.15% = $1,660
   * - Credit: $0 (no tax paid)
   * - Additional VA tax owed: $1,660
   */
  reciprocity: {
    enabled: true,
    scope: "BOTH", // Applies to both retail and lease transactions

    /**
     * Home State Behavior: CREDIT_UP_TO_STATE_RATE
     *
     * Virginia credits tax paid to other states but caps the credit at what
     * Virginia would charge (4.15% of vehicle price). This is a common
     * reciprocity approach.
     */
    homeStateBehavior: "CREDIT_UP_TO_STATE_RATE",

    /**
     * Require Proof: TRUE
     *
     * Virginia requires "evidence of a sales tax paid to another state" per
     * § 58.1-2403. You must provide documentation (receipt, bill of sale
     * showing tax paid, etc.) to receive the credit.
     */
    requireProofOfTaxPaid: true,

    /**
     * Basis: TAX_PAID
     *
     * The credit is based on the actual tax amount paid to the other state,
     * not on what would have been due under the other state's rate.
     */
    basis: "TAX_PAID",

    /**
     * Cap at Virginia's Tax: TRUE
     *
     * The credit cannot exceed what Virginia would charge. If you paid more
     * tax elsewhere, the credit is limited to Virginia's 4.15% rate on the
     * vehicle price.
     */
    capAtThisStatesTax: true,

    /**
     * Lease Exception: FALSE
     *
     * Reciprocity applies the same way to both retail purchases and leases.
     * No special lease-specific reciprocity rules exist.
     */
    hasLeaseException: false,

    notes:
      "Virginia grants credit for sales tax paid to other states when first registering " +
      "a vehicle in VA, provided (1) you owned the vehicle < 12 months and (2) you provide " +
      "proof of tax paid. Credit is capped at Virginia's 4.15% rate. If you owned the vehicle " +
      "> 12 months before registering in VA, no tax is owed regardless of prior tax payment. " +
      "This applies to both retail and lease transactions.",
  },

  // ============================================================================
  // STATE-SPECIFIC EXTRAS
  // ============================================================================

  extras: {
    lastUpdated: "2025-11-13",
    status: "PRODUCTION",
    sources: [
      "Virginia Department of Motor Vehicles (dmv.virginia.gov)",
      "Virginia Department of Taxation (tax.virginia.gov)",
      "Virginia Code Title 58.1, Chapter 24 - Motor Vehicle Sales and Use Tax",
      "Virginia Code § 58.1-2401 - Definitions",
      "Virginia Code § 58.1-2402 - Levy",
      "Virginia Code § 58.1-2403 - Exemptions",
      "Virginia Administrative Code 23VAC10-210-910 - Maintenance Contracts",
      "Virginia Administrative Code 23VAC10-210-990 - Motor Vehicle Sales/Leases",
      "Virginia Code Title 38.2, Chapter 64 - GAP Waivers",
      "Leasehackr Forum - VA dealer practice confirmation",
      "Sales Tax Handbook - Virginia vehicle tax guide",
    ],
    notes:
      "Virginia has one of the strictest trade-in policies (NO credit at all) and taxes " +
      "leases fully upfront on capitalized cost. Service contracts uniquely taxed at 50% " +
      "for parts+labor contracts. No doc fee cap (dealers charge $400-$900+). Flat 4.15% " +
      "statewide rate for motor vehicles (no local add-ons). Separate personal property " +
      "tax system creates additional ongoing costs for leased vehicles. Reciprocity available " +
      "with proof of tax paid to other states (credit capped at VA rate).",

    // Virginia-specific configuration details
    stateRate: 4.15, // Flat statewide rate, no local add-ons
    minimumTax: 75, // Minimum tax regardless of vehicle value
    docFeeCapAmount: null, // No cap on documentation fees
    tradeInCreditAllowed: false, // No trade-in credit in VA (most restrictive)
    serviceContractTaxRate: 0.5, // 50% of contract price is taxable (unique VA rule)
    leasePersonalPropertyTax: true, // Leased vehicles subject to separate PP tax

    /**
     * Trade-In Policy Explanation:
     *
     * Virginia is one of the strictest states for trade-ins. The full vehicle
     * purchase price is taxable, with no deduction for trade-in value. This
     * policy significantly increases the tax burden compared to states that
     * allow full or partial trade-in credits.
     *
     * States with FULL trade-in credit: 44 states including NY, FL, CA, TX
     * States with NO trade-in credit: 7 states including VA, HI, CA (on leases)
     * States with CAPPED trade-in credit: Michigan ($10,000 cap)
     *
     * Virginia's "no trade-in credit" policy applies to BOTH retail and leases.
     */
    tradeInPolicyExplanation:
      "Virginia does not allow trade-in value to reduce taxable amount on either " +
      "retail purchases or leases. You pay sales tax on the full vehicle price. " +
      "Trade-ins only reduce your out-of-pocket cost (lower financed amount), " +
      "not your tax liability. This is one of the most restrictive trade-in policies in the US.",

    /**
     * Lease Taxation Explanation:
     *
     * Virginia's lease taxation is unique:
     * 1. 4.15% tax applied to capitalized cost at lease signing (one-time)
     * 2. Monthly payments are NOT taxed
     * 3. Separate personal property tax (semi-annual, value-based)
     *
     * This differs from:
     * - Monthly tax states (IN): Tax each payment as it's made
     * - Full upfront states (NJ, NY): Tax full lease obligation upfront
     * - Virginia: Tax capitalized cost upfront (middle ground)
     *
     * The personal property tax (separate from sales tax) is billed by
     * localities twice per year (May 5 and October 5) based on the vehicle's
     * assessed value as of January 1. This applies to leased vehicles.
     */
    leaseTaxationExplanation:
      "Virginia taxes leases by applying 4.15% to the capitalized cost at signing. " +
      "This is NOT spread into monthly payments. Additionally, leased vehicles are " +
      "subject to semi-annual personal property tax (separate from sales tax) based " +
      "on vehicle value. This 'double taxation' structure is unique to Virginia and " +
      "makes leasing more expensive upfront than in monthly-payment-tax states.",

    /**
     * Service Contract Taxation Explanation:
     *
     * Virginia's "50% rule" for service contracts (23VAC10-210-910) recognizes
     * that maintenance contracts include both taxable goods (parts) and
     * non-taxable services (labor). The regulation deems these contracts to be
     * "one-half labor and one-half parts" for tax purposes.
     *
     * - Labor-only: 0% taxable
     * - Parts-only: 100% taxable
     * - Parts + labor: 50% taxable
     * - Insurance company warranties: 0% taxable (considered insurance)
     *
     * Example:
     * - Service contract price: $2,000
     * - Taxable amount: $2,000 × 50% = $1,000
     * - Sales tax: $1,000 × 4.15% = $41.50
     */
    serviceContractExplanation:
      "Service contracts (extended warranties) that include both parts and labor are " +
      "taxed on 50% of the contract price per VA regulation 23VAC10-210-910. This " +
      "recognizes the mixed nature of these contracts (taxable parts + non-taxable labor). " +
      "Extended warranties issued by insurance companies regulated by the Bureau of " +
      "Insurance are considered insurance transactions and are NOT subject to sales tax.",

    /**
     * Reciprocity Explanation:
     *
     * Virginia's reciprocity rules provide a 12-month window for tax credit:
     *
     * Scenario 1: Owned > 12 months before VA registration
     * - Result: No VA tax owed (exempt under § 58.1-2403)
     *
     * Scenario 2: Owned < 12 months, paid tax to other state
     * - Result: Credit for tax paid (up to VA's 4.15% rate)
     * - Requires: Proof of tax payment
     *
     * Scenario 3: Owned < 12 months, NO tax paid to other state
     * - Result: Full VA tax owed (4.15%)
     *
     * This policy balances protecting Virginia's tax base while providing
     * fairness for recent out-of-state purchases where tax was already paid.
     */
    reciprocityExplanation:
      "Virginia grants sales tax credit for vehicles purchased out-of-state if you provide " +
      "proof of tax paid to another state AND register in VA within 12 months of purchase. " +
      "Credit is capped at Virginia's 4.15% rate. If you owned the vehicle more than 12 months " +
      "before registering in VA, no tax is owed regardless of prior tax payment. This policy " +
      "prevents double taxation while ensuring VA collects tax on recent in-state registrations.",

    /**
     * Common Dealership Fees (Reference Only):
     *
     * These are typical fees charged by Virginia dealerships. Only doc fee
     * and service contracts have specific tax treatment defined in this config.
     *
     * - Documentation fee: $400-$900 (NO STATE CAP, TAXABLE)
     * - Title fee: ~$75 (DMV fee, NOT taxable)
     * - Registration: Varies by vehicle (DMV fee, NOT taxable)
     * - Plate fee: $10 (DMV fee, NOT taxable)
     * - Service contract: $1,000-$3,000 (50% TAXABLE if parts+labor)
     * - GAP waiver: $500-$900 (NOT clearly taxable)
     * - Accessories: TAXABLE (included in sale price)
     */
    commonDealershipFees: {
      docFee: { range: [400, 900], cap: null, taxable: true },
      title: { typical: 75, taxable: false },
      serviceContract: { range: [1000, 3000], taxablePercent: 50 },
      gap: { range: [500, 900], taxable: false },
    },
  },
};

export default US_VA;
