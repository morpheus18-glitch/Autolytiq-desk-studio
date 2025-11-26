import type { TaxRulesConfig } from "../types";

/**
 * SOUTH CAROLINA TAX RULES
 *
 * Researched: 2025-11-14
 * Version: 2
 *
 * KEY FACTS:
 * - Infrastructure Maintenance Fee (IMF): 5% of purchase price, CAPPED at $500 maximum
 * - NO traditional sales tax on vehicles (replaced by IMF effective July 1, 2017)
 * - Trade-in credit: FULL (deducted from purchase price before IMF calculation)
 * - Manufacturer rebates: TAXABLE (IMF calculated on full price BEFORE rebates)
 * - Dealer rebates: TAXABLE (same treatment as manufacturer rebates)
 * - Doc fee: TAXABLE, NO CAP (average varies, no state limit)
 * - Service contracts (VSC): NOT taxable (motor vehicle service contracts exempt)
 * - GAP insurance: NOT taxable (motor vehicle GAP exempt)
 * - Lease method: FULL_UPFRONT (IMF on total depreciation/lease value, capped at $500)
 * - New residents: $250 IMF when bringing vehicle into SC for registration
 * - Reciprocity: NONE (IMF replaced traditional sales tax, no reciprocal credits)
 *
 * UNIQUE SOUTH CAROLINA FEATURES:
 * 1. IMF CAP STRUCTURE:
 *    - Purchase price $0-$9,999: Pay 5% of sale price
 *    - Purchase price $10,000+: Pay flat $500 (IMF cap reached)
 *    - This creates significant tax savings on high-value vehicles
 *    - Example: $50,000 vehicle → IMF = $500 (effective rate 1.0%)
 *
 * 2. IMF REPLACED SALES TAX (July 1, 2017):
 *    - Prior system: 5% state + local sales tax (no cap)
 *    - New system: 5% IMF capped at $500 maximum
 *    - General sales tax (6-9%) does NOT apply to vehicles subject to IMF
 *    - Vehicles registered with SCDMV are EXEMPT from sales tax
 *
 * 3. MANUFACTURER REBATES FULLY TAXABLE:
 *    - IMF calculated on vehicle price BEFORE rebates applied
 *    - Customer pays IMF on full MSRP, then rebate reduces out-of-pocket
 *    - No tax benefit from rebates (unlike trade-ins which DO reduce IMF base)
 *    - Example: $25,000 MSRP - $3,000 rebate = $22,000 customer pays
 *      IMF = $500 (on $25,000, not $22,000)
 *
 * 4. TRADE-IN TREATMENT (Full Credit):
 *    - Trade-in value fully deducted from purchase price before IMF
 *    - Can significantly reduce IMF owed
 *    - Example: $30,000 vehicle - $10,000 trade = $20,000 taxable base
 *      IMF = $20,000 × 5% = $1,000 → capped at $500
 *    - Example: $12,000 vehicle - $5,000 trade = $7,000 taxable base
 *      IMF = $7,000 × 5% = $350 (under cap, pay $350)
 *
 * 5. NEW RESIDENT RULE:
 *    - Moving to SC with existing vehicle: $250 flat IMF
 *    - Applies to vehicles already owned when becoming SC resident
 *    - Paid at time of SC registration/titling
 *    - Plus standard title and registration fees
 *
 * 6. LEASE TREATMENT:
 *    - Leases subject to IMF (not traditional sales tax)
 *    - IMF calculated upfront on agreed value/cap cost
 *    - Trade-in reduces lease IMF base (same as retail)
 *    - Cap cost reduction is NOT separately taxed
 *    - $500 cap applies to leases
 *
 * 7. VSC AND GAP EXEMPTION:
 *    - Motor vehicle extended service contracts: EXEMPT (SC Code § 12-36-2120(52))
 *    - Motor vehicle extended warranty contracts: EXEMPT (SC Code § 12-36-2120(52))
 *    - GAP (Guaranteed Asset Protection): EXEMPT (insurance product)
 *    - This is a specific exemption for MOTOR VEHICLES only
 *    - General extended warranties on other products ARE taxable in SC
 *
 * 8. NO DOC FEE CAP:
 *    - South Carolina has no statutory limit on dealer doc fees
 *    - Doc fees are TAXABLE (subject to IMF)
 *    - Must be disclosed to SCDMV if over $225 (reporting requirement)
 *    - Typical range: $300-$600+
 *
 * IMF CALCULATION FORMULA (RETAIL):
 * Taxable Base = Vehicle Price + Accessories + Doc Fee - Trade-In Value
 * IMF = Taxable Base × 5% (if < $10,000) OR $500 (if ≥ $10,000)
 * Final IMF = MIN(Calculated IMF, $500)
 *
 * Example 1 (Under Cap):
 * $8,000 vehicle + $400 doc fee - $2,000 trade-in
 * Taxable Base: $8,000 + $400 - $2,000 = $6,400
 * IMF: $6,400 × 5% = $320 (under $500 cap, pay $320)
 *
 * Example 2 (At Cap):
 * $30,000 vehicle + $495 doc fee - $10,000 trade-in
 * Taxable Base: $30,000 + $495 - $10,000 = $20,495
 * Calculated IMF: $20,495 × 5% = $1,024.75
 * Final IMF: $500 (capped)
 *
 * Example 3 (Rebate vs Trade-in Difference):
 * Scenario A - $5,000 Trade-in:
 *   Vehicle: $25,000 + Doc: $400 - Trade: $5,000 = $20,400 base
 *   IMF: $500 (capped)
 *
 * Scenario B - $5,000 Manufacturer Rebate:
 *   Vehicle: $25,000 + Doc: $400 = $25,400 base (rebate NOT deducted)
 *   IMF: $500 (capped, but calculated on higher base)
 *   Customer receives $5,000 rebate after tax calculation
 *
 * LEASE CALCULATION:
 * Lease IMF = (Agreed Value or Gross Cap Cost - Trade-In) × 5%, capped at $500
 * Cap cost reductions (cash, rebates) do NOT separately generate IMF
 * Monthly payments are NOT separately taxed
 * One-time IMF payment at lease inception
 *
 * Example (Lease):
 * $40,000 agreed value - $8,000 trade-in = $32,000
 * IMF: $32,000 × 5% = $1,600 → capped at $500
 * Monthly payments: NOT subject to additional tax
 *
 * SOURCES:
 * - South Carolina Department of Revenue (dor.sc.gov)
 * - SC Code § 12-36-2120: Exemptions (motor vehicle service contracts)
 * - SC DMV Infrastructure Maintenance Fee guidance (scdmvonline.com)
 * - SCDMV Dealer Connection (dealer guidance documents)
 * - SC DOR Sales and Use Tax Guide for Automobile and Truck Dealers
 * - Act No. 40 of 2017 (Roads Bill - established IMF system)
 */
export const US_SC: TaxRulesConfig = {
  stateCode: "SC",
  version: 2,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL
   *
   * South Carolina allows FULL trade-in credit against the IMF base.
   *
   * Official Rule:
   * "The value of your trade-in vehicle in South Carolina is not subject to
   * tax and is instead credited toward your new vehicle purchase. In other
   * words, be sure to subtract the trade-in amount from the price before
   * calculating the IMF."
   *
   * Trade-In Treatment:
   * - Trade-in value is FULLY deducted from vehicle price before IMF calculation
   * - Reduces IMF owed (can save up to $500 in maximum cases)
   * - Applied to both retail sales and leases
   *
   * Example:
   *   Vehicle Price: $30,000
   *   Trade-In Value: $10,000
   *   Net Price: $20,000
   *   IMF: $20,000 × 5% = $1,000 → capped at $500
   *
   * vs. No Trade-In:
   *   Vehicle Price: $30,000
   *   IMF: $30,000 × 5% = $1,500 → capped at $500
   *
   * In this example, both scenarios hit the cap, but trade-in matters more
   * when the net price falls under $10,000:
   *
   * Example (Below Cap):
   *   Vehicle Price: $12,000
   *   Trade-In: $5,000
   *   Net Price: $7,000
   *   IMF: $7,000 × 5% = $350 (saves $250 vs. $600 without trade)
   *
   * Source: SCDMV, SC DOR Automotive Dealer Guide
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules: Both manufacturer and dealer rebates are TAXABLE
   *
   * South Carolina calculates IMF on the full vehicle price BEFORE any
   * manufacturer or dealer rebates are applied.
   *
   * MANUFACTURER REBATES:
   * Official Treatment:
   * "Rebates and dealer incentives are taxable in South Carolina. You should
   * not subtract any incentive amount from the car price before calculating
   * the IMF."
   *
   * IMF Calculation:
   * - IMF calculated on full MSRP/selling price
   * - Rebate does NOT reduce IMF base
   * - Customer pays IMF on full price, then rebate is applied to reduce
   *   out-of-pocket cost
   *
   * Example:
   *   Vehicle MSRP: $25,000
   *   Manufacturer Rebate: $3,000
   *   Customer Pays: $22,000
   *   IMF Base: $25,000 (NOT $22,000)
   *   IMF: $500 (25,000 × 5% = $1,250 → capped at $500)
   *
   * DEALER REBATES/INCENTIVES:
   * Same treatment as manufacturer rebates - fully taxable.
   *
   * CONTRAST WITH TRADE-INS:
   * This is a critical difference:
   * - Trade-in: DOES reduce IMF base (saves tax)
   * - Rebate: Does NOT reduce IMF base (no tax savings)
   *
   * Tax Impact Example:
   *   $25,000 vehicle with $5,000 trade-in:
   *     IMF Base: $20,000 → IMF = $500 (capped)
   *
   *   $25,000 vehicle with $5,000 rebate:
   *     IMF Base: $25,000 → IMF = $500 (capped)
   *     Customer gets $5,000 rebate after paying IMF
   *
   * In both cases cap is hit, but for lower-priced vehicles under $10,000,
   * trade-ins provide real IMF savings while rebates do not.
   *
   * Source: SC DOR Automotive Dealer Guide, multiple dealer guidance sources
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: true,
      notes:
        "Manufacturer rebates do NOT reduce IMF base in South Carolina. IMF is calculated " +
        "on full vehicle price before rebates. Customer pays IMF on full price, then rebate " +
        "is applied to reduce purchase price.",
    },
    {
      appliesTo: "DEALER",
      taxable: true,
      notes:
        "Dealer rebates and incentives do NOT reduce IMF base. Same treatment as manufacturer " +
        "rebates - IMF calculated on full price before dealer discounts.",
    },
  ],

  /**
   * Doc Fee: TAXABLE, NO CAP
   *
   * Dealer documentation fees in South Carolina are:
   * 1. Subject to IMF (included in taxable base)
   * 2. NO STATE-MANDATED CAP (dealers can charge any amount)
   * 3. Subject to disclosure requirements if over $225
   *
   * No Statutory Cap:
   * South Carolina does not impose a maximum limit on dealer documentation
   * fees. However, there is a disclosure/reporting requirement:
   *
   * Reporting Requirement:
   * "Dealerships must provide written notice to the Department [SCDMV] of
   * the maximum dealership fees they intend to charge by January 31st of
   * each year. If a dealership intends to charge over $225 in closing fees,
   * the state can review the intended fees."
   *
   * This is a disclosure requirement, NOT a cap. Dealers can charge more
   * than $225, but must report it.
   *
   * Typical Range:
   * - Average: $220-$400 (based on dealer surveys)
   * - Observed: $300-$600+
   * - No enforcement of maximum amount
   *
   * Taxability:
   * Doc fees are included in the IMF base calculation.
   *
   * Example:
   *   Vehicle Price: $20,000
   *   Doc Fee: $495
   *   Total Base: $20,495
   *   IMF: $20,495 × 5% = $1,024.75 → capped at $500
   *   (Doc fee adds ~$25 to IMF before cap is applied)
   *
   * Source: SCDMV dealer requirements, SC DOR guidance
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules
   *
   * South Carolina has specific rules for what is and isn't subject to IMF:
   *
   * MOTOR VEHICLE SERVICE CONTRACTS (VSC):
   * - NOT subject to IMF or sales tax
   * - Specific exemption: SC Code § 12-36-2120(52)
   * - "Motor vehicle extended service contracts and motor vehicle extended
   *   warranty contracts" are EXEMPT
   * - This applies ONLY to motor vehicles (general service contracts on other
   *   products ARE taxable in SC)
   *
   * GAP INSURANCE:
   * - NOT subject to IMF or sales tax
   * - Treated as insurance product
   * - Same exemption as VSC for motor vehicles
   *
   * DOC FEE:
   * - TAXABLE (subject to IMF, see docFeeTaxable above)
   * - No cap on amount
   *
   * TITLE FEE:
   * - NOT taxable (government fee, separately stated)
   * - SC title fee: $15 (standard)
   *
   * REGISTRATION FEES:
   * - NOT taxable (government fees)
   *
   * IMF (Infrastructure Maintenance Fee):
   * - NOT subject to itself (it's the tax, not taxable)
   *
   * Important Distinction:
   * The exemption for service contracts and extended warranties is SPECIFIC
   * to motor vehicles. General merchandise extended warranties ARE taxable
   * in South Carolina at the 6% general sales tax rate.
   *
   * Source: SC Code § 12-36-2120(52), SC DOR guidance
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: false,
      notes:
        "Motor vehicle service contracts (VSC) are NOT taxable in SC. Specific exemption " +
        "under SC Code § 12-36-2120(52). This exemption applies ONLY to motor vehicles.",
    },
    {
      code: "GAP",
      taxable: false,
      notes:
        "GAP insurance is NOT taxable in SC. Treated as insurance product, exempt from IMF " +
        "and sales tax for motor vehicles.",
    },
    {
      code: "DOC_FEE",
      taxable: true,
      notes:
        "Doc fees are TAXABLE (subject to IMF). No state cap on doc fee amount, but dealers " +
        "must report to SCDMV if charging over $225.",
    },
    {
      code: "TITLE",
      taxable: false,
      notes:
        "Title fee ($15) is NOT taxable when separately stated. Government fee, exempt from IMF.",
    },
    {
      code: "REG",
      taxable: false,
      notes: "Registration fees are NOT taxable. Government fees, exempt from IMF.",
    },
    {
      code: "IMF",
      taxable: false,
      notes:
        "Infrastructure Maintenance Fee (IMF) is the tax itself, not subject to additional tax.",
    },
  ],

  /**
   * Product Taxability
   *
   * Accessories: TAXABLE
   * - Dealer-installed accessories included in vehicle price are subject to IMF
   * - Taxed at same 5% rate, subject to $500 cap
   *
   * Negative Equity: TAXABLE
   * - Negative equity rolled into new vehicle purchase increases IMF base
   * - Added to vehicle price for IMF calculation
   *
   * Service Contracts: NOT taxable
   * - Motor vehicle service contracts exempt (see feeTaxRules above)
   *
   * GAP: NOT taxable
   * - GAP insurance exempt (insurance product)
   *
   * Example (Accessories):
   *   Vehicle Price: $28,000
   *   Accessories: $2,500
   *   Total: $30,500
   *   IMF: $30,500 × 5% = $1,525 → capped at $500
   *
   * Example (Negative Equity):
   *   Vehicle Price: $25,000
   *   Trade-In Value: $12,000
   *   Trade-In Payoff: $15,000
   *   Negative Equity: $3,000
   *
   *   Taxable Base: $25,000 - $12,000 + $3,000 = $16,000
   *   IMF: $16,000 × 5% = $800 → capped at $500
   *
   *   (Trade-in reduces base, but negative equity increases it)
   *
   * Source: SC DOR Automotive Dealer Guide
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: true,
  taxOnServiceContracts: false, // Motor vehicle VSC exempt
  taxOnGap: false, // Motor vehicle GAP exempt

  /**
   * Vehicle Tax Scheme: STATE_ONLY
   *
   * South Carolina's IMF is a STATE-LEVEL fee with NO local variations.
   *
   * IMF Structure:
   * - Flat 5% of purchase price
   * - Maximum $500 cap
   * - NO county taxes
   * - NO city taxes
   * - NO special district taxes
   *
   * This is fundamentally different from SC's general sales tax system:
   *
   * General Sales Tax (non-vehicles):
   * - State: 6%
   * - Local: 1% - 3% (county and local options)
   * - Combined: 6% - 9%
   *
   * Vehicle IMF:
   * - State only: 5%
   * - Local: 0% (no local IMF)
   * - Cap: $500 maximum
   *
   * Key Point:
   * Vehicles subject to IMF are EXEMPT from general sales and use tax.
   * SC Code § 12-36-2120(83): "Leases of motor vehicles for registering
   * or titling in South Carolina are exempt from sales and use tax since
   * such leases are subject to an infrastructure maintenance fee."
   *
   * IMF replaces sales tax entirely for motor vehicles registered in SC.
   *
   * Rate Application:
   * - Purchase < $10,000: Pay 5% of price (e.g., $8,000 → $400 IMF)
   * - Purchase ≥ $10,000: Pay $500 flat (cap reached)
   *
   * Source: SC Act No. 40 of 2017, SC DOR, SCDMV
   */
  vehicleTaxScheme: "STATE_ONLY",
  vehicleUsesLocalSalesTax: false, // IMF is state-only, no local stacking

  // ============================================================================
  // LEASE TRANSACTION RULES
  // ============================================================================

  leaseRules: {
    /**
     * Lease Method: FULL_UPFRONT
     *
     * South Carolina applies IMF to leases as a one-time upfront fee on
     * the agreed value or capitalized cost.
     *
     * Official Rule:
     * "Leases of motor vehicles for registering or titling in South Carolina
     * are exempt from sales and use tax since such leases are subject to an
     * infrastructure maintenance fee."
     *
     * Lease IMF Calculation:
     * - IMF = (Agreed Value or Gross Cap Cost - Trade-In) × 5%
     * - Maximum: $500 cap applies
     * - Paid ONCE at lease inception
     * - Monthly payments are NOT separately taxed
     *
     * Treatment:
     * - IMF calculated on vehicle value at lease start
     * - Trade-in reduces IMF base (same as retail)
     * - Cap cost reductions (cash down, rebates) do NOT generate separate IMF
     * - One-time fee, not recurring monthly
     *
     * Example:
     *   Gross Cap Cost: $40,000
     *   Trade-In: $8,000
     *   Cash Down: $5,000
     *   Manufacturer Rebate: $2,000
     *
     *   IMF Base: $40,000 - $8,000 = $32,000
     *   (Rebates do NOT reduce base, cash down does NOT reduce base)
     *   IMF: $32,000 × 5% = $1,600 → capped at $500
     *   Paid once at lease signing
     *
     *   Monthly payments: NOT subject to additional tax
     *
     * Contrast with Other States:
     * - Monthly tax states (TX, CA, AZ): Tax each payment
     * - SC: One upfront IMF payment, then no monthly tax
     *
     * Source: SC DOR, SCDMV Dealer Connection
     */
    method: "FULL_UPFRONT",

    /**
     * Cap Cost Reduction: NOT separately taxable
     *
     * In South Carolina, capitalized cost reductions (cash down, rebates)
     * are NOT separately subject to IMF.
     *
     * The IMF is calculated on the vehicle's agreed value or gross cap cost,
     * minus trade-in, but cap reductions are not a separate taxable event.
     *
     * Treatment:
     * - Cash down: Reduces cap cost, not separately taxed
     * - Rebates: Applied to cap cost, not separately taxed (but see rebateBehavior)
     * - Trade-in: Reduces IMF base (see tradeInCredit below)
     *
     * The IMF is a one-time fee on the vehicle value at lease inception,
     * not on the individual components of the deal structure.
     *
     * Source: SC DOR Automotive Guide, SCDMV
     */
    taxCapReduction: false,

    /**
     * Rebate Behavior on Leases: ALWAYS_TAXABLE
     *
     * Manufacturer and dealer rebates on leases are TAXABLE in South Carolina.
     *
     * Treatment:
     * - Rebates applied as cap cost reduction do NOT reduce IMF base
     * - IMF calculated on gross cap cost before rebates
     * - Same as retail: rebates are taxable (don't reduce tax base)
     *
     * Example:
     *   Gross Cap Cost: $30,000
     *   Manufacturer Rebate: $3,000
     *   Applied as Cap Reduction
     *
     *   IMF Base: $30,000 (rebate does NOT reduce)
     *   IMF: $500 (capped)
     *
     *   Net Cap Cost for payment: $27,000
     *   But IMF still calculated on $30,000
     *
     * Source: SC DOR guidance (rebates are taxable)
     */
    rebateBehavior: "ALWAYS_TAXABLE",

    /**
     * Doc Fee on Leases: ALWAYS taxable
     *
     * Dealer documentation fees on leases are subject to IMF, same as retail.
     *
     * Treatment:
     * - Doc fee included in IMF base calculation
     * - No cap on doc fee amount (same as retail)
     * - Subject to $225 reporting threshold
     *
     * Example:
     *   Agreed Value: $28,000
     *   Doc Fee: $495
     *   Total: $28,495
     *   IMF: $28,495 × 5% = $1,424.75 → capped at $500
     *
     * Source: SCDMV, SC DOR
     */
    docFeeTaxability: "ALWAYS",

    /**
     * Trade-in Credit on Leases: FULL
     *
     * South Carolina allows FULL trade-in credit on leases, same as retail.
     *
     * Official Rule:
     * "The value of your trade-in vehicle in South Carolina is not subject to
     * tax and is instead credited toward your new vehicle purchase."
     *
     * This applies equally to leases and retail sales.
     *
     * Treatment:
     * - Trade-in value deducted from gross cap cost before IMF calculation
     * - Reduces IMF owed
     * - Can bring lease under $10,000 threshold to avoid cap
     *
     * Example:
     *   Gross Cap Cost: $35,000
     *   Trade-In: $12,000
     *   Net: $23,000
     *   IMF: $23,000 × 5% = $1,150 → capped at $500
     *
     * vs. No Trade:
     *   Gross Cap Cost: $35,000
     *   IMF: $35,000 × 5% = $1,750 → capped at $500
     *
     * Both hit cap in this example, but for lower values trade-in matters:
     *
     * Example (Under Cap):
     *   Gross Cap Cost: $14,000
     *   Trade-In: $6,000
     *   Net: $8,000
     *   IMF: $8,000 × 5% = $400 (under cap, saves $300)
     *
     * Source: SCDMV, SC DOR
     */
    tradeInCredit: "FULL",

    /**
     * Negative Equity on Leases: Taxable
     *
     * Negative equity rolled into a lease is subject to IMF.
     *
     * Treatment:
     * - Negative equity increases gross cap cost
     * - Increased cap cost raises IMF base
     * - Subject to $500 cap
     *
     * Example:
     *   Gross Cap Cost: $28,000
     *   Trade-In Value: $10,000
     *   Trade-In Payoff: $13,000
     *   Negative Equity: $3,000
     *
     *   IMF Base: $28,000 - $10,000 + $3,000 = $21,000
     *   IMF: $21,000 × 5% = $1,050 → capped at $500
     *
     * Source: SC DOR guidance (negative equity is taxable)
     */
    negativeEquityTaxable: true,

    /**
     * Fee Taxability on Leases
     *
     * Backend products on leases follow same rules as retail:
     *
     * SERVICE CONTRACTS (VSC):
     * - NOT taxable on leases (motor vehicle exemption applies)
     * - SC Code § 12-36-2120(52)
     *
     * GAP INSURANCE:
     * - NOT taxable on leases (insurance product exemption)
     *
     * DOC FEE:
     * - TAXABLE on leases (see docFeeTaxability above)
     *
     * TITLE FEE:
     * - NOT taxable (government fee)
     *
     * REGISTRATION:
     * - NOT taxable (government fee)
     *
     * Source: SC Code § 12-36-2120, SC DOR
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: true,
        notes: "Doc fee TAXABLE on leases, subject to IMF. No cap on amount.",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: false,
        notes:
          "Motor vehicle service contracts NOT taxable on leases (SC Code § 12-36-2120(52)).",
      },
      {
        code: "GAP",
        taxable: false,
        notes: "GAP insurance NOT taxable on leases (insurance product exemption).",
      },
      {
        code: "TITLE",
        taxable: false,
        notes: "Title fee NOT taxable (government fee).",
      },
      {
        code: "REG",
        taxable: false,
        notes: "Registration fees NOT taxable (government fees).",
      },
    ],

    /**
     * Title Fee Rules on Leases
     *
     * Title and registration fees on leases:
     * - Not taxable (government fees)
     * - Typically paid upfront
     * - Not included in cap cost for depreciation
     * - May be included in total due at signing
     */
    titleFeeRules: [
      {
        code: "TITLE",
        taxable: false,
        includedInCapCost: false,
        includedInUpfront: true,
        includedInMonthly: false,
      },
      {
        code: "IMF",
        taxable: false,
        includedInCapCost: false,
        includedInUpfront: true,
        includedInMonthly: false,
      },
    ],

    /**
     * Tax Fees Upfront: TRUE
     *
     * In South Carolina, the IMF on leases is a one-time upfront fee paid
     * at lease inception, not spread across monthly payments.
     */
    taxFeesUpfront: true,

    /**
     * Special Scheme: NONE
     *
     * South Carolina uses the standard FULL_UPFRONT method. The IMF is
     * calculated once at lease inception on the agreed value minus trade-in,
     * capped at $500, and that's the only tax payment for the lease term.
     */
    specialScheme: "NONE",

    notes:
      "South Carolina: FULL_UPFRONT lease taxation. IMF calculated once at lease inception on " +
      "agreed value/gross cap cost minus trade-in, capped at $500 maximum. Monthly payments NOT " +
      "separately taxed. Trade-in gets full credit (reduces IMF base). Cap cost reductions (cash, " +
      "rebates) NOT separately taxed, but rebates don't reduce IMF base (taxable). Backend products " +
      "(VSC, GAP) NOT taxed (motor vehicle exemption). Doc fee taxable, no cap.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: NONE (IMF system replaced traditional sales tax)
   *
   * South Carolina does NOT offer reciprocal tax credits for the IMF system.
   *
   * Key Points:
   *
   * 1. IMF REPLACED SALES TAX (July 1, 2017):
   *    Prior to July 1, 2017, SC had traditional sales tax on vehicles with
   *    reciprocity provisions. The IMF system replaced that entirely.
   *
   * 2. NO CREDIT FOR TAXES PAID ELSEWHERE:
   *    If you purchase a vehicle in another state and pay that state's sales
   *    tax, you still owe the full SC IMF when registering in South Carolina.
   *
   *    Example:
   *      Purchase in Georgia: $30,000 vehicle
   *      GA tax paid (7%): $2,100
   *      SC IMF when registering: $500 (no credit for GA tax)
   *      Total tax paid: $2,600
   *
   * 3. NEW RESIDENT SPECIAL RULE ($250 IMF):
   *    If you MOVE TO South Carolina with a vehicle you already own (not a
   *    new purchase), you pay a reduced $250 IMF rather than the full $500.
   *
   *    New Resident Example:
   *      Own vehicle, move to SC from NC
   *      SC IMF (new resident): $250 flat fee
   *      Plus title fee: $15
   *      Plus registration fees
   *
   * 4. OUT-OF-STATE PURCHASES:
   *    If SC resident purchases vehicle out-of-state:
   *    - Pay other state's tax at purchase
   *    - Pay SC IMF when registering (no credit given)
   *    - This can result in double taxation
   *
   * 5. NO RECIPROCAL AGREEMENTS:
   *    Unlike states with traditional sales tax reciprocity (e.g., Alabama,
   *    Arizona), South Carolina does not have reciprocal agreements that
   *    credit taxes paid to other states.
   *
   * Why No Reciprocity:
   * The IMF is structured as an "infrastructure maintenance fee" rather than
   * a traditional sales tax. It's a one-time registration fee for road
   * funding, not a transaction tax, so traditional reciprocity concepts
   * don't apply.
   *
   * Impact:
   * - SC residents benefit: Low effective tax rate on high-value vehicles
   *   ($500 cap on $100,000 vehicle = 0.5% effective rate)
   * - Out-of-state buyers: May face double taxation
   * - Dealers must collect full IMF regardless of buyer's origin
   *
   * Source: SC Act No. 40 of 2017, SCDMV guidance, SC DOR
   */
  reciprocity: {
    enabled: false,
    scope: "BOTH",
    homeStateBehavior: "NONE",
    requireProofOfTaxPaid: false,
    basis: "TAX_PAID",
    capAtThisStatesTax: false,
    hasLeaseException: false,
    notes:
      "South Carolina does NOT provide reciprocal tax credits. IMF system (effective July 1, 2017) " +
      "replaced traditional sales tax, and no reciprocity provisions exist. If you pay tax in " +
      "another state and register in SC, you still owe full SC IMF (no credit given). New residents " +
      "bringing existing vehicles into SC pay reduced $250 IMF instead of full $500. Out-of-state " +
      "purchases may result in double taxation (other state's tax + SC IMF).",
  },

  extras: {
    lastUpdated: "2025-11-14",
    sources: [
      "South Carolina Department of Revenue (dor.sc.gov)",
      "South Carolina Department of Motor Vehicles (scdmvonline.com)",
      "SC Code § 12-36-2120: Exemptions (motor vehicle service contracts)",
      "SC Code § 12-36-2120(83): Lease exemption from sales tax (subject to IMF)",
      "SC Act No. 40 of 2017 (Roads Bill - Infrastructure Maintenance Fee)",
      "SCDMV Dealer Connection (dealer guidance documents)",
      "SC DOR Sales and Use Tax Guide for Automobile and Truck Dealers",
      "SCDMV Infrastructure Maintenance Fee guidance (July 1, 2017)",
    ],
    notes:
      "South Carolina has unique IMF (Infrastructure Maintenance Fee) system: 5% of purchase price, " +
      "CAPPED at $500 maximum (vehicles $10,000+ always pay $500 flat). IMF replaced traditional " +
      "sales tax on July 1, 2017. NO local variations (state-only fee). Trade-in: FULL credit " +
      "(reduces IMF base). Rebates: TAXABLE (IMF on full price before rebates). Doc fee: taxable, " +
      "NO CAP (must report if >$225). Motor vehicle service contracts (VSC) and GAP: NOT taxable " +
      "(specific exemption SC Code § 12-36-2120(52)). Leases: upfront IMF on agreed value minus " +
      "trade-in, capped at $500, NO monthly tax. New residents: $250 IMF for existing vehicles. " +
      "NO reciprocity (no credit for taxes paid elsewhere).",
    imfRate: 5.0, // 5% rate
    imfCapAmount: 500, // $500 maximum
    imfThreshold: 10000, // $10,000 threshold for cap
    newResidentIMF: 250, // $250 for new residents bringing vehicles
    titleFee: 15.0, // $15 title fee
    docFeeReportingThreshold: 225, // Must report to SCDMV if over $225
    effectiveDate: "2017-07-01", // IMF effective date
    priorSalesTaxRate: 5.0, // Old system: 5% state + local (replaced by IMF)
    generalSalesTaxRate: 6.0, // General sales tax (non-vehicles)
    generalLocalTaxRange: { min: 1.0, max: 3.0 }, // Local option sales tax (non-vehicles)
  },
};

export default US_SC;
