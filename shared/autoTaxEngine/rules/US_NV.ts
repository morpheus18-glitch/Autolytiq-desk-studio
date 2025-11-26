import type { TaxRulesConfig } from "../types";

/**
 * NEVADA TAX RULES
 *
 * Researched: 2025-11-13
 * Version: 1
 *
 * KEY FACTS:
 * - State sales tax: 4.6%
 * - Combined rates (state + county): 6.85% to 8.375%
 * - Trade-in credit: FULL (100% deduction, reduces taxable base)
 * - Doc fee: TAXABLE with NO CAP (average $440-$499)
 * - Manufacturer rebates: TAXABLE (do NOT reduce taxable base)
 * - Dealer rebates: NOT taxable (reduce taxable base)
 * - Service contracts (VSC): LIKELY TAXABLE (unless properly documented as insurance)
 * - GAP: LIKELY TAXABLE (unless structured as true insurance)
 * - Lease taxation: MONTHLY (tax on each payment)
 * - Reciprocity: YES (credit for taxes paid to other states)
 * - Governmental Services Tax (GST): Annual vehicle tax based on MSRP depreciation (separate from sales tax)
 *
 * UNIQUE NEVADA FEATURES:
 * - Clark County (Las Vegas) has highest rate at 8.375% (includes Supplemental GST)
 * - Washoe County (Reno) has 7.955% combined rate
 * - No state income tax - GST system funds highways
 * - Sales tax based on county where sale occurs (NOT buyer residence)
 * - Private party sales: EXEMPT from sales tax
 * - GST system: 4-5% annual tax on depreciated MSRP (separate from sales tax)
 * - Negative equity: NOT explicitly documented (likely not taxable)
 * - Active duty military GST exemption available
 *
 * CRITICAL DISTINCTION:
 * - Manufacturer rebates: TAXABLE (unique compared to most states)
 * - Dealer rebates: NOT taxable (reduce purchase price)
 *
 * TAX CALCULATION FORMULA (RETAIL):
 * Taxable Price = Vehicle Price + Accessories + Doc Fee - Trade-In - Dealer Rebates
 * (Manufacturer rebates do NOT reduce taxable price)
 * Sales Tax = Taxable Price × Combined Rate (6.85% - 8.375%)
 *
 * Example (Clark County - Las Vegas):
 * $30,000 vehicle + $499 doc fee - $8,000 trade-in = $22,499
 * Tax: $22,499 × 8.375% = $1,884.29
 * (If $3,000 manufacturer rebate: Still taxed on $22,499, not $19,499)
 *
 * LEASE CALCULATION (MONTHLY):
 * Monthly Payment (before tax) = Base payment amount
 * Monthly Tax = Monthly Payment × Combined Rate
 * Total Monthly = Base Payment + Monthly Tax
 * (Tax paid on each monthly payment, not upfront)
 *
 * TAX RATES BY MAJOR COUNTIES:
 * - Clark County (Las Vegas, Henderson): 8.375% (4.6% state + 3.775% local)
 * - Washoe County (Reno, Sparks): 7.955% (4.6% state + 3.355% local)
 * - Churchill County: 7.35% - 8.125%
 * - Carson City: 7.075% (4.6% state + 2.475% local)
 * - Other counties: 6.85% - 8.15%
 *
 * SOURCES:
 * - Nevada Department of Taxation: https://tax.nv.gov/
 * - Nevada Revised Statutes (NRS) Chapter 372 - Sales and Use Taxes
 * - Nevada Administrative Code (NAC) Chapter 372
 * - NRS Chapter 371 - Governmental Services Tax
 * - Nevada Department of Taxation Automotive Guide (March 2024)
 * - Nevada Department of Taxation Leases Guide
 * - Sales Tax Handbook - Nevada Vehicle Sales Tax
 * - Avalara Nevada Tax Calculator 2025
 */
export const US_NV: TaxRulesConfig = {
  stateCode: "NV",
  version: 1,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL (100% credit)
   *
   * Nevada provides FULL trade-in credit with no cap. The trade-in value
   * is fully deducted from the purchase price before calculating sales tax.
   *
   * Legal Basis:
   * - Nevada Revised Statutes (NRS) Chapter 372 - Sales and Use Taxes
   * - Nevada Administrative Code (NAC) 372
   * - Nevada Department of Taxation Automotive Guide
   *
   * How It Works:
   * - The value of your trade-in vehicle is NOT subject to sales tax
   * - Sales tax is calculated on the net purchase price (sale price minus trade-in value)
   * - Nevada statutes provide for a "tax credit" based on the trade-in allowance
   *
   * Example:
   *   Vehicle Price:        $30,000
   *   Trade-In Allowance:   -$8,000
   *   ─────────────────────────────
   *   Taxable Amount:       $22,000
   *   Sales Tax @ 8.375%:    $1,842.50
   *
   * Source: Nevada Department of Taxation Automotive Guide; NRS Chapter 372
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules: CRITICAL DISTINCTION
   *
   * Nevada treats manufacturer and dealer rebates DIFFERENTLY - this is
   * unique compared to most states.
   *
   * MANUFACTURER REBATES: TAXABLE (do NOT reduce sales tax base)
   * - Nevada taxes vehicle purchases BEFORE manufacturer rebates are applied
   * - The buyer pays sales tax on the full MSRP or sale price before manufacturer incentives
   * - Manufacturer rebates do NOT affect the sales tax calculation
   * - This is explicitly different from trade-in treatment
   *
   * Example - Manufacturer Rebate:
   *   Vehicle Sale Price:           $25,000
   *   Manufacturer Rebate:          -$3,000
   *   ─────────────────────────────────────
   *   Customer Pays:                $22,000
   *   BUT Sales Tax Calculated On:  $25,000
   *   Sales Tax @ 8.375%:            $2,093.75
   *
   * Rationale: Manufacturer rebates are considered manufacturer-to-consumer
   * incentives that occur after the taxable sale is complete.
   *
   * DEALER REBATES: NOT TAXABLE (reduce sales tax base)
   * - Unlike manufacturer rebates, dealer rebates DO reduce the taxable amount
   * - Dealer rebates are considered price reductions at the point of sale
   * - Subtract dealer rebate amount from vehicle price BEFORE calculating sales tax
   *
   * Example - Dealer Rebate:
   *   Vehicle Sale Price:    $25,000
   *   Dealer Rebate:         -$2,000
   *   ─────────────────────────────
   *   Taxable Amount:        $23,000
   *   Sales Tax @ 8.375%:     $1,926.25
   *
   * Summary Table:
   * | Type                   | Reduces Tax Base? | Reason                          |
   * |------------------------|-------------------|---------------------------------|
   * | Trade-In Allowance     | YES               | Statutory tax credit (NRS 372)  |
   * | Dealer Rebate          | YES               | Point-of-sale price reduction   |
   * | Manufacturer Rebate    | NO                | Post-sale consumer incentive    |
   *
   * Source: Sales Tax Handbook - Nevada Vehicle Sales Tax; Nevada Department of Taxation
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: true,
      notes:
        "CRITICAL: Manufacturer rebates are TAXABLE in Nevada. Sales tax is calculated on " +
        "the full sale price BEFORE manufacturer rebates. This is different from most states.",
    },
    {
      appliesTo: "DEALER",
      taxable: false,
      notes:
        "Dealer rebates reduce the sales tax base (point-of-sale price reduction). " +
        "Subtract dealer rebates from vehicle price before calculating sales tax.",
    },
  ],

  /**
   * Doc Fee: TAXABLE with NO CAP
   *
   * Documentation fees ARE subject to Nevada sales tax, and Nevada has
   * NO LIMIT on the amount dealers can charge.
   *
   * Official Guidance (Nevada Department of Taxation):
   * "Any service required as part of the sale such as document fees are
   * subject to sales tax."
   *
   * Key Points:
   * - Doc fees ARE taxable
   * - NO statutory cap on doc fee amount
   * - Average doc fee in Nevada: $440-$499
   * - Fees can vary significantly between dealers ($200 - $800+)
   * - Must be included in taxable base
   *
   * What's NOT Taxable:
   * - Title fees (government fee collected on behalf of DMV)
   * - Registration fees (government fee)
   *
   * Example:
   *   Vehicle Price:         $30,000
   *   Doc Fee:               $499
   *   ─────────────────────────────
   *   Subtotal:              $30,499
   *   Sales Tax @ 8.375%:     $2,554.29
   *
   *   Title/Registration:     $33 (not taxable)
   *   ─────────────────────────────
   *   Total Due:             $33,086.29
   *
   * Source: Nevada Department of Taxation Automotive Guide; Sales Tax Handbook
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules:
   *
   * Nevada has limited explicit guidance on VSC and GAP taxability, but
   * conservative approach is to treat them as taxable unless properly
   * documented as insurance.
   *
   * SERVICE CONTRACTS (VSC): LIKELY TAXABLE
   * - Service contracts are NOT insurance for premium tax purposes (NRS 690C)
   * - Parts purchased under service contracts ARE subject to sales tax
   * - Sale price of VSC product itself is LIKELY taxable unless:
   *   1. Separately stated as insurance on contract
   *   2. Meets Nevada's definition of insurance (NRS 680A/680B)
   *   3. Proper documentation shows pure service/insurance nature
   * - Conservative approach: Charge sales tax unless specific exemption exists
   *
   * GAP INSURANCE: LIKELY TAXABLE
   * - Nevada does not provide clear explicit guidance on GAP taxability
   * - If structured as true insurance: May be exempt (subject to premium tax)
   * - If structured as debt cancellation/waiver: Likely taxable
   * - Conservative approach: Charge sales tax unless documented as insurance
   *
   * Best Practice:
   * - Include VSC and GAP in taxable base unless specific exemption documentation
   * - True GAP insurance from licensed carriers with separate premium billing: Likely exempt
   * - GAP waivers/debt cancellation sold by dealers: Likely taxable
   *
   * ACCESSORIES: FULLY TAXABLE
   * - All vehicle accessories and add-ons subject to Nevada sales tax
   * - Factory-installed, dealer-installed, and aftermarket all taxable
   * - Parts always taxable; labor NOT taxable if separately stated
   *
   * Source: Nevada Department of Taxation Automotive Guide; NRS Chapter 690C
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: true,
      notes:
        "VSC LIKELY TAXABLE in Nevada. Unless separately documented as insurance with " +
        "proper licensing, treat as taxable. Parts under contracts are explicitly taxable.",
    },
    {
      code: "GAP",
      taxable: true,
      notes:
        "GAP LIKELY TAXABLE in Nevada unless structured as true insurance. GAP waivers " +
        "and debt cancellation agreements are likely taxable. Conservative approach recommended.",
    },
    {
      code: "DOC_FEE",
      taxable: true,
      notes:
        "Doc fees are TAXABLE in Nevada. No cap on amount. Average $440-$499. " +
        "Explicitly stated as taxable service by Nevada Department of Taxation.",
    },
    {
      code: "TITLE",
      taxable: false,
      notes: "Title fees are NOT taxable (government fee)",
    },
    {
      code: "REG",
      taxable: false,
      notes: "Registration fees are NOT taxable (government fee)",
    },
  ],

  /**
   * Product Taxability:
   *
   * - Accessories: TAXABLE (all accessories sold with vehicle)
   * - Negative equity: NOT explicitly documented (likely not taxable)
   * - Service contracts: LIKELY TAXABLE
   * - GAP: LIKELY TAXABLE
   *
   * Negative Equity Treatment (NOT EXPLICITLY ADDRESSED):
   * Nevada Department of Taxation has NOT issued explicit public guidance
   * on whether negative equity rolled into a new vehicle purchase is taxable.
   *
   * Conservative Interpretation:
   * Nevada's trade-in credit is based on trade-in ALLOWANCE value, not
   * payoff amount. This suggests:
   *
   * - Tax credit based on vehicle VALUE
   * - Negative equity is a debt obligation, not part of vehicle purchase price
   * - Actual sales price doesn't change because of negative equity
   *
   * Best Practice:
   * Calculate tax based on (Vehicle Price - Trade-In Value)
   * Do NOT add negative equity to taxable base
   *
   * Example - Negative Equity:
   *   Vehicle Price:         $30,000
   *   Trade-In Value:        $8,000
   *   Payoff Owed:           -$10,000
   *   Negative Equity:       -$2,000 (rolled into new loan)
   *   Trade Credit:          $8,000 (trade value, not payoff)
   *   ─────────────────────────────
   *   Taxable Amount:        $22,000
   *   (Negative equity does NOT increase tax base)
   *
   * Source: Nevada Department of Taxation Automotive Guide; NRS Chapter 372
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: false, // Not explicitly documented, likely not taxable
  taxOnServiceContracts: true, // Likely taxable unless documented as insurance
  taxOnGap: true, // Likely taxable unless structured as true insurance

  /**
   * Vehicle Tax Scheme: STATE_PLUS_LOCAL
   *
   * Nevada uses a combined state + local sales tax system for vehicles.
   *
   * State Sales Tax: 4.6%
   * Local Sales Tax: 2.25% - 3.775% (varies by county/jurisdiction)
   * Combined Rate: 6.85% - 8.375%
   *
   * Major County Rates:
   * - Clark County (Las Vegas, Henderson): 8.375% (4.6% state + 3.775% local)
   * - Washoe County (Reno, Sparks): 7.955% (4.6% state + 3.355% local)
   * - Churchill County: 7.35% - 8.125%
   * - Carson City: 7.075% (4.6% state + 2.475% local)
   * - Other counties: 6.85% - 8.15%
   *
   * IMPORTANT: Sales tax is charged based on the COUNTY WHERE THE SALE OCCURS,
   * NOT where the buyer resides.
   *
   * Note: Nevada also has a separate Governmental Services Tax (GST) system
   * that is an annual vehicle tax based on MSRP depreciation. GST is NOT
   * part of the sales tax system and is collected at registration.
   *
   * Source: Nevada Department of Taxation; Avalara Nevada Tax Calculator 2025
   */
  vehicleTaxScheme: "STATE_PLUS_LOCAL",
  vehicleUsesLocalSalesTax: true,

  // ============================================================================
  // LEASE TRANSACTION RULES
  // ============================================================================

  leaseRules: {
    /**
     * Lease Method: MONTHLY PAYMENT TAXATION
     *
     * Nevada uses the "tax on each payment" method for vehicle leases,
     * NOT upfront taxation.
     *
     * How It Works:
     * - Sales tax is calculated and charged on EACH monthly lease payment
     * - Tax is NOT calculated on the full capitalized cost at lease inception
     * - Each payment is taxed at the applicable combined rate
     *
     * Example:
     *   Gross Capitalized Cost:        $35,000
     *   Cap Cost Reduction:            -$3,000
     *   Adjusted Capitalized Cost:     $32,000
     *
     *   Monthly Payment (before tax):  $450
     *   Sales Tax @ 8.375%:            $37.69
     *   ─────────────────────────────────────
     *   Total Monthly Payment:         $487.69
     *
     * Key Advantages:
     * - Lower upfront costs (no large tax payment at signing)
     * - Tax payments spread over lease term
     * - Only pay tax on portion of vehicle used
     * - If lease terminated early, no pre-paid tax on unused months
     *
     * Legal Framework:
     * - Nevada Administrative Code (NAC) 372.938 - Collection and payment
     *   of sales tax on lease or rental of tangible personal property
     * - NRS Chapter 372 - Sales and Use Taxes (defines lease/rental receipts)
     *
     * Source: Nevada Department of Taxation Leases Guide; NAC 372.938
     */
    method: "MONTHLY",

    /**
     * Cap Cost Reduction: Reduces monthly payment, indirectly reduces tax
     *
     * Capitalized Cost Reduction (cap cost reduction) includes:
     * - Cash down payment
     * - Net trade-in allowance
     * - Rebates (manufacturer/dealer)
     * - Any other noncash credits
     *
     * Tax Treatment:
     * - Cap cost reduction reduces the Adjusted Capitalized Cost
     * - This reduces the monthly lease payment
     * - Since Nevada taxes each monthly payment, cap cost reduction
     *   indirectly reduces the total tax paid over the lease term
     * - Cap cost reduction itself is NOT directly taxed at lease inception
     *
     * Example Without Cap Cost Reduction:
     *   Gross Capitalized Cost:        $35,000
     *   Cap Cost Reduction:            $0
     *   Adjusted Capitalized Cost:     $35,000
     *
     *   Monthly Payment:               $525
     *   Sales Tax @ 8.375%:            $43.97
     *   Total Monthly Payment:         $568.97
     *
     *   Total Tax Over 36 Months:      $1,582.92
     *
     * Example With Cap Cost Reduction:
     *   Gross Capitalized Cost:        $35,000
     *   Cap Cost Reduction:            -$5,000
     *   Adjusted Capitalized Cost:     $30,000
     *
     *   Monthly Payment:               $450
     *   Sales Tax @ 8.375%:            $37.69
     *   Total Monthly Payment:         $487.69
     *
     *   Total Tax Over 36 Months:      $1,356.84
     *   Tax Savings:                   $226.08
     *
     * Source: Nevada Department of Taxation Automotive Guide; Leases Guide
     */
    taxCapReduction: false,

    /**
     * Rebate Behavior on Leases: Follow retail rule
     *
     * In Nevada leases, rebates are treated consistently with retail:
     * - Manufacturer rebates: Reduce cap cost, reduce payment, tax benefit indirect
     * - Dealer rebates: Reduce cap cost, reduce payment, tax benefit indirect
     *
     * Both reduce the monthly payment, which reduces the monthly tax paid.
     *
     * Source: Nevada Department of Taxation Leases Guide
     */
    rebateBehavior: "FOLLOW_RETAIL_RULE",

    /**
     * Doc Fee on Leases: TAXABLE (follow retail rule)
     *
     * Documentation fees charged on vehicle leases ARE subject to Nevada
     * sales tax, same as retail purchases.
     *
     * Doc fees can be handled two ways:
     *
     * Method 1: Added to Capitalized Cost
     *   Gross Capitalized Cost:        $30,000
     *   Doc Fee:                       $499
     *   ─────────────────────────────────────
     *   Adjusted Gross Cap Cost:       $30,499
     *
     *   Monthly Payment:               $458
     *   Sales Tax @ 8.375%:            $38.36
     *   Total Monthly:                 $496.36
     *
     * Result: Tax paid on higher monthly payment over lease term.
     *
     * Method 2: Charged as Upfront Fee
     *   Doc Fee:                       $499
     *   Sales Tax @ 8.375%:            $41.79
     *   Total Doc Fee Due at Signing:  $540.79
     *
     * Result: Tax paid upfront on doc fee.
     *
     * Key Points:
     * - NO cap on lease doc fees (same as purchases)
     * - Fully taxable whether capitalized or charged upfront
     * - Nevada considers doc fees as "service necessary to complete sale/lease"
     *
     * Source: Nevada Department of Taxation Automotive Guide; Leases Guide
     */
    docFeeTaxability: "ALWAYS",

    /**
     * Trade-in Credit on Leases: FULL (reduces capitalized cost)
     *
     * Trade-in allowance is treated as a Capitalized Cost Reduction, which:
     * 1. Reduces the Adjusted Capitalized Cost
     * 2. Reduces the monthly lease payment
     * 3. Indirectly reduces the total sales tax paid over the lease term
     *
     * Process:
     *   1. Dealer appraises trade-in:        $8,000
     *   2. Payoff on trade-in (if any):      -$6,000
     *      ─────────────────────────────────────────
     *   3. Net Trade-In Allowance:            $2,000
     *
     *   This $2,000 becomes part of Cap Cost Reduction:
     *
     *   Gross Capitalized Cost:               $32,000
     *   Cap Cost Reduction (trade):           -$2,000
     *   Adjusted Capitalized Cost:            $30,000
     *
     * Tax Treatment:
     * - No sales tax on trade-in value
     * - Trade-in directly reduces capitalized cost
     * - Lower capitalized cost = lower monthly payment = lower monthly tax
     *
     * Example Comparison:
     *
     * WITHOUT Trade-In:
     *   Gross Cap Cost:        $32,000
     *   Monthly Payment:       $480
     *   Monthly Tax @ 8.375%:  $40.20
     *   Total Monthly:         $520.20
     *   Tax Over 36 Months:    $1,447.20
     *
     * WITH $8,000 Trade-In:
     *   Gross Cap Cost:        $32,000
     *   Trade-In:              -$8,000
     *   Adj Cap Cost:          $24,000
     *
     *   Monthly Payment:       $360
     *   Monthly Tax @ 8.375%:  $30.15
     *   Total Monthly:         $390.15
     *   Tax Over 36 Months:    $1,085.40
     *   Tax Savings:           $361.80
     *
     * Negative Equity on Trade-In:
     * If trade-in has negative equity (owed more than value):
     *   Trade-In Value:        $6,000
     *   Payoff Owed:          -$8,000
     *   Negative Equity:      -$2,000
     *
     *   - Negative equity typically reduces or eliminates cap cost reduction benefit
     *   - May be added to gross capitalized cost
     *   - Does NOT increase the sales tax base directly
     *
     * Source: Nevada Department of Taxation Automotive Guide; Leases Guide
     */
    tradeInCredit: "FULL",

    /**
     * Negative Equity on Leases: NOT taxable
     *
     * Negative equity rolled into a lease does NOT directly increase the
     * taxable base. Tax is calculated based on trade-in VALUE, not payoff.
     *
     * Source: Nevada Department of Taxation guidance analysis
     */
    negativeEquityTaxable: false,

    /**
     * Fee Taxability on Leases:
     *
     * Backend products (VSC, GAP, maintenance plans) when included in a
     * lease are typically:
     * 1. Added to the Adjusted Capitalized Cost, OR
     * 2. Charged as a separate fee included in the monthly payment
     *
     * In either case, sales tax LIKELY applies based on Nevada's monthly
     * payment taxation method.
     *
     * Scenario 1: Products Capitalized Into Lease
     *   Vehicle MSRP:                  $30,000
     *   VSC Cost:                      $2,500
     *   GAP Cost:                      $800
     *   ─────────────────────────────────────
     *   Gross Capitalized Cost:        $33,300
     *
     *   Monthly Payment (all-in):      $500
     *   Sales Tax @ 8.375%:            $41.88
     *   Total Monthly Payment:         $541.88
     *
     * Result: Sales tax paid on entire monthly payment, which includes
     * amortized cost of VSC and GAP.
     *
     * Exceptions (RARE):
     * Products MAY be exempt from sales tax if:
     * - Separately invoiced and documented as insurance with insurance premium tax paid
     * - Sold by licensed insurance entity with proper documentation
     * - Clear separation from lease transaction
     * - Meets Nevada insurance regulatory requirements (NRS 680A/690C)
     *
     * Conservative Approach:
     * Include VSC, GAP, and other backend products in taxable monthly
     * payment unless explicit exemption documentation exists.
     *
     * Source: Nevada Department of Taxation Leases Guide; NAC 372.938
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: true,
        notes: "Doc fee TAXABLE on leases (same as retail). No cap.",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: true,
        notes:
          "VSC LIKELY TAXABLE on leases when included in payment. Tax applies to " +
          "monthly payment including amortized VSC cost.",
      },
      {
        code: "GAP",
        taxable: true,
        notes:
          "GAP LIKELY TAXABLE on leases when included in payment. Tax applies to " +
          "monthly payment including GAP cost.",
      },
      { code: "TITLE", taxable: false, notes: "Title fee NOT taxable" },
      { code: "REG", taxable: false, notes: "Registration fee NOT taxable" },
    ],

    titleFeeRules: [
      {
        code: "TITLE",
        taxable: false,
        includedInCapCost: true,
        includedInUpfront: true,
        includedInMonthly: false,
      },
      {
        code: "REG",
        taxable: false,
        includedInCapCost: true,
        includedInUpfront: true,
        includedInMonthly: false,
      },
    ],

    taxFeesUpfront: false, // Nevada taxes monthly payments, not upfront

    specialScheme: "NONE",

    notes:
      "Nevada: MONTHLY lease taxation (tax on each payment). Trade-in reduces cap cost " +
      "and indirectly reduces total tax paid. Doc fee TAXABLE. Backend products (VSC, GAP) " +
      "LIKELY taxable when included in payment. Cap cost reduction reduces payment and " +
      "indirectly reduces tax. No upfront tax payment required.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: YES (credit for taxes paid to other states)
   *
   * Nevada allows a credit against Consumer Use Tax for sales tax
   * legitimately paid to another state or local government for the same
   * purchase, upon proof of satisfactory payment.
   *
   * Legal Basis:
   * - Nevada Administrative Code (NAC) 372.055
   * - Nevada Revised Statutes (NRS) 372.185
   *
   * Official Guidance:
   * "Nevada will allow a credit toward the amount of use tax due in an
   * amount equal to sales tax legitimately paid for the same purchase to
   * a state or local government outside of Nevada."
   *
   * How It Works:
   *
   * Scenario 1: Other State's Tax Rate is LOWER than Nevada
   *   Vehicle purchased in State X
   *   Purchase Price:        $30,000
   *   State X Tax Rate:      5.0%
   *   State X Tax Paid:      $1,500
   *
   *   Nevada Rate:           8.375%
   *   Nevada Tax Due:        $2,512.50
   *   Credit for State X:    -$1,500
   *   ─────────────────────────────
   *   Additional NV Tax Due: $1,012.50
   *
   * Result: Pay the difference to Nevada.
   *
   * Scenario 2: Other State's Tax Rate is EQUAL or HIGHER
   *   Vehicle purchased in State Y
   *   Purchase Price:        $30,000
   *   State Y Tax Rate:      9.0%
   *   State Y Tax Paid:      $2,700
   *
   *   Nevada Rate:           8.375%
   *   Nevada Tax Due:        $2,512.50
   *   Credit for State Y:    -$2,512.50 (limited to NV amount)
   *   ─────────────────────────────
   *   Additional NV Tax Due: $0
   *
   * Result: No additional tax owed (no refund for excess paid).
   *
   * Scenario 3: NO Tax Paid in Other State
   *   Vehicle purchased in State Z (no sales tax state)
   *   Purchase Price:        $30,000
   *   State Z Tax Paid:      $0
   *
   *   Nevada Rate:           8.375%
   *   Nevada Tax Due:        $2,512.50
   *   Credit:                -$0
   *   ─────────────────────────────
   *   NV Consumer Use Tax:   $2,512.50
   *
   * Result: Full Nevada Consumer Use Tax owed.
   *
   * Documentation Required:
   * - Proof of purchase (original sales contract/invoice)
   * - Proof of tax payment (receipt, canceled check, state tax form)
   * - Vehicle title showing out-of-state origin
   *
   * Special Note - Utah Purchases:
   * "The full amount of Nevada sales tax is due on vehicles purchased in
   * Utah regardless of any statement on the contract" because Utah dealers
   * don't collect sales tax for out-of-state buyers.
   *
   * Source: Nevada Department of Taxation; NAC 372.055; NRS 372.185
   */
  reciprocity: {
    enabled: true,
    scope: "BOTH",
    homeStateBehavior: "CREDIT_UP_TO_STATE_RATE",
    requireProofOfTaxPaid: true,
    basis: "TAX_PAID",
    capAtThisStatesTax: true,
    hasLeaseException: false,
    overrides: [
      {
        originState: "UT",
        notes:
          "Utah dealers don't collect sales tax for out-of-state buyers. Full Nevada " +
          "sales tax due on vehicles purchased in Utah regardless of contract statements.",
      },
    ],
    notes:
      "Nevada provides credit for sales tax paid to other states, capped at Nevada's rate. " +
      "If other state's tax is lower, pay difference to Nevada. If higher, no additional tax " +
      "owed (no refund for excess). Requires proof of tax paid. UTAH EXCEPTION: Full Nevada " +
      "tax due on Utah purchases (Utah doesn't collect for out-of-state sales).",
  },

  extras: {
    lastUpdated: "2025-11-13",
    sources: [
      "Nevada Department of Taxation (tax.nv.gov)",
      "Nevada Revised Statutes (NRS) Chapter 372 - Sales and Use Taxes",
      "Nevada Administrative Code (NAC) Chapter 372",
      "NRS Chapter 371 - Governmental Services Tax",
      "Nevada Department of Taxation Automotive Guide (March 2024)",
      "Nevada Department of Taxation Leases Guide",
      "Sales Tax Handbook - Nevada Vehicle Sales Tax",
      "Avalara Nevada Tax Calculator 2025",
    ],
    notes:
      "Nevada has 4.6% state sales tax + 2.25%-3.775% local sales tax for combined " +
      "6.85%-8.375% on vehicles. Clark County (Las Vegas) has highest rate at 8.375%. " +
      "FULL trade-in credit. CRITICAL: Manufacturer rebates are TAXABLE (do NOT reduce " +
      "tax base), but dealer rebates are NOT taxable (reduce tax base). Doc fee TAXABLE " +
      "with NO CAP (average $440-$499). VSC and GAP LIKELY taxable unless documented as " +
      "insurance. Monthly lease taxation. Reciprocity credit for out-of-state taxes paid. " +
      "Separate Governmental Services Tax (GST) is annual vehicle tax based on MSRP " +
      "depreciation (4-5%, collected at registration, NOT part of sales tax).",
    stateRate: 4.6,
    combinedRateRange: {
      min: 6.85,
      max: 8.375,
    },
    majorCountyRates: {
      "Clark (Las Vegas)": 8.375,
      "Washoe (Reno)": 7.955,
      "Carson City": 7.075,
      Churchill: "7.35-8.125",
    },
    avgDocFee: 470, // Average between $440-$499
    docFeeCap: null, // NO CAP
    governmentalServicesTax: {
      description:
        "Annual vehicle tax based on 35% of MSRP, depreciated 5% first year, 10% per year thereafter, minimum 15%",
      basicRate: 4.0, // 4% of depreciated valuation
      supplementalRate: 1.0, // Additional 1% in Clark and Churchill counties
      minimumGST: 16,
      applicableCounties: ["Clark", "Churchill"],
      notes:
        "GST is separate from sales tax, collected at registration, funds highways. " +
        "Active duty military stationed in NV (residents of other states) are exempt.",
    },
    privatePartySalesExempt: true,
    noStateIncomeTax: true,
  },
};

export default US_NV;
