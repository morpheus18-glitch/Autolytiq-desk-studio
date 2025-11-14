import { TaxRulesConfig } from "../types";

/**
 * CONNECTICUT TAX RULES
 *
 * Researched: 2025-11-13
 * Version: 2
 *
 * KEY FACTS:
 * - Two-tier tax system: 6.35% standard / 7.75% luxury (vehicles over $50K)
 * - NO local sales taxes (statewide uniform rates)
 * - Trade-in credit: FULL (100% deduction, no cap)
 * - Luxury threshold determined by sale price BEFORE trade-in credit
 * - Manufacturer rebates: TAXABLE (do NOT reduce taxable price)
 * - Dealer rebates: TAXABLE (assumed same as manufacturer)
 * - Doc fee: TAXABLE (no statutory cap, average $415)
 * - Service contracts (VSC): TAXABLE at 6.35% (always, even for luxury vehicles)
 * - GAP: LIKELY TAXABLE at 6.35% if structured as service contract
 * - Lease taxation: HYBRID (upfront tax on cap reduction + monthly tax on payments)
 * - Reciprocity: YES (full credit for taxes paid to other states)
 *
 * UNIQUE CONNECTICUT FEATURES:
 * - Luxury tax ($50K threshold) applies to ENTIRE price, not just excess
 * - Luxury rate determined by pre-trade-in sale price (trade-in doesn't change rate)
 * - Extended warranties ALWAYS taxed at 6.35% (never at luxury 7.75% rate)
 * - Doc fee can push vehicle over $50K threshold (triggers luxury rate on all)
 * - Lease trade-in ONLY allowed if customer OWNS the vehicle (not prior lease)
 * - Leases: Cap cost reduction (down payment) taxed upfront at lease rate
 * - Leases: Monthly payments taxed monthly at 6.35% or 7.75% based on agreed value
 * - Negative equity: NOT explicitly addressed (conservative: not taxable)
 *
 * TAX CALCULATION FORMULA (RETAIL):
 * Pre-Trade Sale Price = Vehicle Price + Doc Fee + Accessories
 * Tax Rate = (Pre-Trade Sale Price > $50,000) ? 7.75% : 6.35%
 * Taxable Base = Pre-Trade Sale Price - Trade-In Value
 * Vehicle Tax = Taxable Base × Tax Rate
 * Warranty Tax = Warranty Price × 6.35% (always)
 * GAP Tax = GAP Price × 6.35% (if treated as service contract)
 * Total Tax = Vehicle Tax + Warranty Tax + GAP Tax
 *
 * Example 1 (Standard Rate):
 * $30,000 vehicle + $500 doc - $10,000 trade = $20,500 taxable
 * Rate: 6.35% (pre-trade $30,500 < $50K)
 * Tax: $20,500 × 6.35% = $1,301.75
 *
 * Example 2 (Luxury Rate, Trade-In Does NOT Change Rate):
 * $52,000 vehicle + $500 doc - $10,000 trade = $42,500 taxable
 * Rate: 7.75% (pre-trade $52,500 > $50K) ← CRITICAL
 * Tax: $42,500 × 7.75% = $3,293.75
 * Customer might expect 6.35% since net is $42,500, but gets 7.75%!
 *
 * Example 3 (Doc Fee Triggers Luxury):
 * $49,800 vehicle + $500 doc = $50,300 (triggers luxury rate)
 * Tax: $50,300 × 7.75% = $3,898.25
 * Without doc fee: $49,800 × 6.35% = $3,162.30
 * Difference: $735.95 additional tax from $500 doc fee
 *
 * LEASE CALCULATION (HYBRID):
 * Agreed Upon Value determines rate: >$50K = 7.75%, ≤$50K = 6.35%
 * Upfront Tax = Cap Cost Reduction × Rate
 * Monthly Tax = Monthly Payment × Rate
 * Total Tax = Upfront Tax + (Monthly Tax × Number of Payments)
 *
 * Example (Standard Lease):
 * Agreed value: $48,000 (< $50K) → 6.35% rate
 * Cap reduction (down): $5,000 → Upfront tax: $5,000 × 6.35% = $317.50
 * Monthly payment: $450 → Monthly tax: $450 × 6.35% = $28.58
 * Total over 36 months: $317.50 + ($28.58 × 36) = $1,346.38
 *
 * SOURCES:
 * - Connecticut Department of Revenue Services (portal.ct.gov/drs)
 * - Conn. Gen. Stat. § 12-407 (definitions), § 12-408(1) (tax rates), § 12-412 (exemptions)
 * - Special Notice 2011-10 (SN 2011-10) - Sales and Use Tax Affecting Motor Vehicle Dealers
 * - Policy Statement 96-10 (PS 96-10) - Lease taxation, trade-in on leases
 * - Special Notice 92-2 (SN 92-2) - Reciprocity credit for taxes paid to other states
 * - Connecticut General Assembly Reports: 2023-R-0259, 2023-R-0092, 2006-R-0189
 * - Public Act No. 11-6 (2011 luxury tax implementation at 7%)
 * - 2015 increase to 7.75% luxury rate
 */
export const US_CT: TaxRulesConfig = {
  stateCode: "CT",
  version: 2,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL (100% credit, no cap)
   *
   * Connecticut provides 100% trade-in credit with no cap. Trade-in value
   * is fully deducted from the purchase price before calculating tax.
   *
   * CRITICAL RULE: Trade-in reduces the TAXABLE BASE but does NOT change
   * the TAX RATE determination. The $50,000 luxury threshold is based on
   * the sale price BEFORE applying trade-in credit.
   *
   * Statutory Language (Special Notice 2011-10):
   * "The sales price of a motor vehicle is not changed or otherwise impacted
   * by a trade-in, but instead is adjusted by the amount allowed for a trade-in."
   *
   * Example (Luxury Rate Trap):
   *   Sale Price: $52,000
   *   Doc Fee: $500
   *   Pre-Trade Total: $52,500 → Triggers 7.75% luxury rate
   *   Trade-In: $10,000
   *   Taxable Base: $42,500 (below $50K)
   *   Tax Rate: 7.75% (NOT 6.35%, because pre-trade > $50K)
   *   Tax: $42,500 × 7.75% = $3,293.75
   *
   * Documentation Requirements:
   * - Trade-in vehicle must be listed on purchase agreement
   * - VIN of trade-in required
   * - Trade-in allowance amount must be separately stated
   * - Trade-in must be owned by the purchaser
   *
   * Trade-In Fee:
   * Connecticut charges a $100 administrative fee when trading in a vehicle
   * to a dealership (separate from sales tax, not taxable itself).
   *
   * Source: Special Notice 2011-10; Policy Statement 96-10
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules:
   *
   * Connecticut treats BOTH manufacturer AND dealer rebates as TAXABLE.
   * Rebates do NOT reduce the purchase price before tax calculation.
   *
   * MANUFACTURER REBATES (TAXABLE):
   * - Tax calculated on full purchase price BEFORE rebate deduction
   * - Customer receives rebate value, but pays tax as if no rebate
   * - Rebate is assigned to dealer as part of down payment
   * - Rebate does NOT reduce taxable sale price
   *
   * Example:
   *   Vehicle MSRP: $28,000
   *   Manufacturer Rebate: $3,000
   *   Customer Pays: $25,000
   *   TAXABLE BASE: $28,000 (full price before rebate)
   *   Tax @ 6.35%: $28,000 × 6.35% = $1,778
   *
   * DEALER REBATES/INCENTIVES (TAXABLE):
   * - No specific guidance found in CT DRS publications
   * - Conservative approach: Treat same as manufacturer rebates (taxable)
   * - Tax on full sale price before dealer discount
   *
   * FEDERAL EV TAX CREDITS (TAXABLE):
   * - Federal EV tax credits: NOT deducted from sale price for CT tax
   * - State CHEAPR rebates: Applied post-sale, not part of taxable transaction
   * - Both result in tax being paid on full vehicle price before incentives
   *
   * COMPARISON TO OTHER STATES:
   * - Massachusetts: Manufacturer rebates NOT taxable (treated as discounts)
   * - Connecticut: Manufacturer rebates ARE taxable (opposite approach)
   *
   * Source: Connecticut General Assembly Report 2006-R-0189; Sales Tax Handbook CT
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: true,
      notes:
        "Manufacturer rebates ARE TAXABLE in Connecticut. Tax calculated on full purchase " +
        "price BEFORE rebate. This differs from states like Massachusetts where rebates reduce " +
        "the taxable price. EV rebates (federal and state CHEAPR) also result in full-price taxation.",
    },
    {
      appliesTo: "DEALER",
      taxable: true,
      notes:
        "Dealer rebates/incentives assumed TAXABLE (same as manufacturer). No specific CT DRS " +
        "guidance found, but general Connecticut tax policy suggests taxing on full sale price " +
        "before dealer discount. Consult CT DRS for dealer-specific programs.",
    },
  ],

  /**
   * Doc Fee: TAXABLE (no statutory cap)
   *
   * Connecticut dealer conveyance fees (documentation fees) are SUBJECT to
   * state sales and use tax at the applicable vehicle rate (6.35% or 7.75%).
   *
   * Official Guidance (Special Notice 2011-10):
   * Dealer conveyance fees are taxable at the same rate as the vehicle.
   *
   * Statutory Cap: NONE
   * Connecticut law does NOT limit the amount of documentation fees a dealer
   * can charge. Average doc fee in Connecticut: $415 (as of 2023).
   *
   * CRITICAL IMPACT - Doc Fee Can Trigger Luxury Tax:
   * Doc fees are INCLUDED when determining the $50,000 luxury threshold.
   *
   * Example:
   *   Vehicle Price: $49,800
   *   Doc Fee: $500
   *   Total: $50,300 → Triggers 7.75% luxury rate
   *   Tax: $50,300 × 7.75% = $3,898.25
   *
   *   Without doc fee: $49,800 × 6.35% = $3,162.30
   *   Additional tax from $500 doc fee: $735.95
   *
   * Definition (Connecticut Statute):
   * "Dealer conveyance or processing fee" means a fee charged by a dealer to
   * recover reasonable costs for processing all documentation and performing
   * services related to the closing of a sale, including:
   * - Registration and transfer of ownership
   * - Sales contract preparation
   * - Sales tax document filing
   * - Related administrative services
   *
   * Source: Connecticut General Assembly Report 2023-R-0092; Special Notice 2011-10
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules:
   *
   * Connecticut taxes most backend products, with specific rules for each.
   *
   * SERVICE CONTRACTS (VSC): TAXABLE at 6.35%
   * - Vehicle Service Contracts (VSCs) ARE subject to sales tax
   * - Tax Rate: ALWAYS 6.35% (even if vehicle triggers luxury 7.75% rate)
   * - Tax paid at time of contract purchase
   * - No additional tax when repairs performed under contract
   * - Applies to contracts sold separately or with vehicle
   *
   * Example (Luxury Vehicle + Warranty):
   *   Vehicle Price: $60,000 → 7.75% tax rate
   *   Extended Warranty: $3,000 → 6.35% tax rate (NOT 7.75%)
   *   Vehicle Tax: $60,000 × 7.75% = $4,650
   *   Warranty Tax: $3,000 × 6.35% = $190.50
   *   Total Tax: $4,840.50
   *
   * GAP INSURANCE: LIKELY TAXABLE at 6.35% (if sold as service contract)
   * - No explicit CT DRS guidance on GAP taxability
   * - If structured as insurance policy: Likely NOT subject to sales tax
   * - If structured as debt cancellation waiver/contract: Likely TAXABLE at 6.35%
   * - Best practice: Apply 6.35% if sold as service contract
   * - Consult CT DRS (1-800-382-9463) for binding guidance on specific product
   *
   * ACCESSORIES: TAXABLE at vehicle rate (6.35% or 7.75%)
   * - Accessories included in vehicle price: Taxed at same rate as vehicle
   * - Can push vehicle over $50,000 luxury threshold
   * - Aftermarket accessories sold separately: Taxed at 6.35%
   * - Installation labor: Taxed at 6.35%
   *
   * DISABILITY EQUIPMENT: EXEMPT
   * Special equipment for exclusive use of persons with physical disabilities:
   * - Hand controls, wheelchair lifts, adaptive equipment
   * - Initial installation, repair, replacement parts all EXEMPT
   *
   * Source: Conn. Gen. Stat. § 12-407(2)(i)(GG); Policy Statement 94-2; § 12-412
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: true,
      notes:
        "Service contracts (VSC) ARE TAXABLE at 6.35%, regardless of vehicle price. Even if " +
        "the vehicle triggers the 7.75% luxury rate, warranties are ALWAYS taxed at 6.35%. " +
        "Tax paid at time of purchase. No tax when repairs performed under contract.",
    },
    {
      code: "GAP",
      taxable: true,
      notes:
        "GAP LIKELY TAXABLE at 6.35% if structured as service contract or debt cancellation " +
        "waiver. If structured as insurance policy, likely NOT taxable. No explicit CT DRS " +
        "guidance found. Conservative approach: Apply 6.35%. Contact CT DRS for binding guidance.",
    },
    {
      code: "DOC_FEE",
      taxable: true,
      notes:
        "Documentation fees ARE TAXABLE at the vehicle rate (6.35% or 7.75%). No statutory cap. " +
        "Average $415. CRITICAL: Doc fee is INCLUDED when determining $50K luxury threshold.",
    },
    {
      code: "TITLE",
      taxable: false,
      notes: "Title fees are not taxable (government fee)",
    },
    {
      code: "REG",
      taxable: false,
      notes: "Registration fees are not taxable (government fee)",
    },
  ],

  /**
   * Product Taxability:
   *
   * - Accessories: TAXABLE at vehicle rate (can trigger luxury threshold)
   * - Negative equity: NOT taxable (not explicitly addressed, conservative approach)
   * - Service contracts: TAXABLE at 6.35%
   * - GAP: LIKELY TAXABLE at 6.35% (if structured as service contract)
   *
   * Negative Equity Treatment (NOT EXPLICITLY ADDRESSED):
   * Connecticut statutes do not explicitly address whether negative equity
   * rolled into a new vehicle loan is subject to sales tax.
   *
   * Conservative Interpretation:
   * Negative equity represents a DEBT OBLIGATION from the previous vehicle,
   * not consideration paid for the new vehicle. It's rolled into the loan
   * but is not part of the new vehicle's purchase price.
   *
   * Best Practice:
   * Do NOT add negative equity to taxable base. Tax only on:
   * (New Vehicle Price + Doc Fee + Accessories - Trade-In Value)
   *
   * Example:
   *   New Vehicle Price: $35,000
   *   Trade-In Actual Value: $8,000
   *   Trade-In Payoff: $12,000
   *   Negative Equity: $4,000
   *
   *   Taxable Base: $27,000 (Vehicle - Trade Value)
   *   NOT: $31,000 (do not add negative equity)
   *   Tax @ 6.35%: $1,714.50
   *
   * For definitive guidance, contact Connecticut Department of Revenue Services
   * at 1-800-382-9463 for written ruling on negative equity treatment.
   *
   * Source: Research conducted November 2025; no CT DRS policy found
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: false, // Not explicitly addressed, conservative approach
  taxOnServiceContracts: true,
  taxOnGap: true, // Likely taxable if structured as service contract

  /**
   * Vehicle Tax Scheme: STATE_ONLY
   *
   * Connecticut has NO local or county sales taxes on motor vehicles.
   * Tax rates are uniform statewide:
   * - 6.35% for vehicles ≤ $50,000
   * - 7.75% for vehicles > $50,000
   *
   * Historical Timeline:
   * - Pre-2011: Single rate (6% at the time)
   * - July 1, 2011: Luxury tax introduced at 7% (Public Act No. 11-6)
   * - July 1, 2011: Standard rate increased to 6.35%
   * - July 1, 2015: Luxury rate increased to 7.75%
   * - Present (2025): Rates remain 6.35% / 7.75%
   *
   * Luxury Tax Structure (UNIQUE):
   * Connecticut's luxury tax applies to the ENTIRE vehicle price, not just
   * the amount exceeding $50,000. This creates a "tax cliff" at $50,000.
   *
   * Example of Tax Cliff:
   *   $49,999 vehicle: $49,999 × 6.35% = $3,175
   *   $50,001 vehicle: $50,001 × 7.75% = $3,876
   *   Difference: $701 additional tax for $2 price increase
   *
   * What Counts Toward $50K Threshold:
   * ✓ Base vehicle sale price
   * ✓ Dealer-installed accessories included in sale
   * ✓ Documentation fees
   * ✓ Dealer prep fees
   * ✓ Taxable add-ons
   * ✗ Trade-in credit (applied AFTER determining rate)
   * ✗ Title fees
   * ✗ Registration fees
   *
   * NO LOCAL TAXES:
   * - No county sales tax on vehicles
   * - No city sales tax on vehicles
   * - No special district taxes on vehicles
   * - Uniform pricing across all Connecticut dealerships
   *
   * NOTE: Connecticut DOES have local property taxes on motor vehicles
   * (annual tax based on vehicle value, varies by municipality). This is
   * SEPARATE from the sales tax system and paid annually to local tax collector.
   *
   * Source: Conn. Gen. Stat. § 12-408(1); Special Notice 2011-10
   */
  vehicleTaxScheme: "STATE_ONLY",
  vehicleUsesLocalSalesTax: false,

  // ============================================================================
  // LEASE TRANSACTION RULES
  // ============================================================================

  leaseRules: {
    /**
     * Lease Method: HYBRID (upfront tax on cap reduction + monthly tax on payments)
     *
     * Connecticut employs a hybrid lease taxation approach:
     * 1. Upfront tax on capitalized cost reductions (down payments)
     * 2. Monthly tax on periodic lease payments
     * 3. No tax on total vehicle value (unlike capitalized cost states)
     *
     * Tax Rate Determination:
     * - Based on "agreed upon value" (MSRP/cap cost) in lease agreement
     * - If agreed value > $50,000: 7.75% rate applies
     * - If agreed value ≤ $50,000: 6.35% rate applies
     *
     * What is Taxed:
     * - Cap cost reduction (down payment): Taxed UPFRONT at lease rate
     * - Monthly lease payment: Taxed MONTHLY at lease rate
     * - Finance charges: Taxed as part of monthly payment
     * - Acquisition fees (if amortized): Taxed as part of monthly payment
     *
     * What is NOT Taxed (if separately stated):
     * - Property tax prepayments
     * - Optional insurance premiums
     * - Extended warranties (taxed separately at 6.35%)
     *
     * Example (Standard Rate):
     *   Agreed Value: $48,000 (< $50K) → 6.35% rate
     *   Cap Reduction: $5,000
     *   Monthly Payment: $450
     *
     *   Upfront Tax: $5,000 × 6.35% = $317.50
     *   Monthly Tax: $450 × 6.35% = $28.58
     *   Total Tax (36 months): $317.50 + ($28.58 × 36) = $1,346.38
     *
     * Example (Luxury Rate):
     *   Agreed Value: $55,000 (> $50K) → 7.75% rate
     *   Cap Reduction: $5,000
     *   Monthly Payment: $625
     *
     *   Upfront Tax: $5,000 × 7.75% = $387.50
     *   Monthly Tax: $625 × 7.75% = $48.44
     *   Total Tax (36 months): $387.50 + ($48.44 × 36) = $2,131.34
     *
     * Source: Policy Statement 96-10; Special Notice 2011-10
     */
    method: "HYBRID",

    /**
     * Cap Cost Reduction: TAXED UPFRONT
     *
     * When a lessee makes a down payment or capitalized cost reduction at
     * lease signing, Connecticut charges sales tax on that amount IMMEDIATELY
     * as part of the "due at lease signing" amount.
     *
     * Tax Rate: 6.35% or 7.75% (based on agreed upon value in lease agreement)
     *
     * What is Cap Cost Reduction?
     * - Cash down payment
     * - First month's payment paid upfront (if applicable)
     * - Security deposit (non-refundable portion, if applied to cap)
     * - Trade-in value (if customer owns the vehicle)
     * - Rebates applied at signing (manufacturer/dealer)
     *
     * Tax Treatment:
     * Only the cap cost reduction itself is taxed upfront (not entire vehicle).
     * Monthly payments are taxed separately as they come due.
     *
     * Total Tax Paid Over Lease:
     * Total = Upfront Cap Reduction Tax + Sum of Monthly Payment Taxes
     *
     * Nontaxable Portions (if separately stated):
     * - Property tax prepayments
     * - Optional insurance premiums
     * - Amounts applied to existing debt payoff on trade-in (above trade value)
     *
     * Source: Policy Statement 96-10
     */
    taxCapReduction: true,

    /**
     * Rebate Behavior on Leases: ALWAYS_TAXABLE
     *
     * Connecticut treats rebates on leases the same as retail:
     * - Manufacturer rebates: TAXABLE (do not reduce cap cost for tax purposes)
     * - Dealer rebates: TAXABLE (assumed same treatment)
     *
     * This means rebates effectively reduce the cap cost for payment calculation,
     * but tax is still calculated as if the rebate was not applied.
     *
     * Source: Policy Statement 96-10; General CT tax policy
     */
    rebateBehavior: "ALWAYS_TAXABLE",

    /**
     * Doc Fee on Leases: ALWAYS taxable
     *
     * Lease acquisition fees, origination fees, and documentation fees are
     * subject to Connecticut sales tax when charged in connection with a lease.
     *
     * Tax Treatment Options:
     *
     * Option 1: Amortized into Monthly Payment
     * - Fee is capitalized into lease
     * - Taxed as part of each monthly payment
     * - Tax rate: 6.35% or 7.75%
     *
     * Option 2: Paid Upfront
     * - Fee charged at lease signing
     * - Taxed immediately at lease rate
     * - Included in "due at signing" calculations
     *
     * Example:
     *   Acquisition Fee: $695 (paid at signing)
     *   Agreed Value: $45,000 (< $50K)
     *   Tax on Acq Fee: $695 × 6.35% = $44.13
     *
     * Other Taxable Lease Charges:
     * - Down payments (cap cost reductions)
     * - Periodic lease payments
     * - Maintenance and service contract charges (if amortized)
     * - Cancellation charges
     * - Title and registration cost reimbursements (if taxable)
     * - Excess mileage charges (at lease end)
     * - Excessive wear and damage charges (at lease end)
     * - Forfeited security deposit portions
     *
     * Nontaxable Lease Charges (if separately stated):
     * - Property tax payments
     * - Insurance charges (if optional)
     * - Federal luxury tax (if separately stated)
     *
     * Source: Policy Statement 96-10
     */
    docFeeTaxability: "ALWAYS",

    /**
     * Trade-in Credit on Leases: FULL (but restricted to OWNED vehicles)
     *
     * Connecticut allows trade-in allowance when an OWNED vehicle is traded
     * in connection with leasing a vehicle.
     *
     * CRITICAL RESTRICTION:
     * Trade-in allowance is NOT permitted when a previously LEASED vehicle
     * is surrendered upon leasing another vehicle. The vehicle must be OWNED.
     *
     * Requirements:
     * 1. Customer must OWN the vehicle being traded (not a prior lease)
     * 2. Lease agreement must clearly identify trade-in vehicle by VIN
     * 3. Trade-in allowance amount must be separately stated
     * 4. Owner and lessee must be the same person
     *
     * How It Works:
     * The trade-in allowance effectively reduces the cap cost and therefore
     * the total taxable lease payments.
     *
     * Example:
     *   Gross Capitalized Cost: $40,000
     *   Trade-In Allowance: $8,000 (customer OWNS the trade)
     *   Adjusted Cap Cost: $32,000
     *   Residual Value: $20,000
     *   Depreciation: $12,000
     *   Monthly Payment: $350 + rent charge
     *   Tax applied to reduced payment amount
     *
     * Trade-In Scenarios:
     * ✓ Customer owns vehicle → Trades into lease → Trade-in credit applies
     * ✓ Customer owns vehicle → Trades into purchase → Trade-in credit applies
     * ✗ Customer leases vehicle → Turns in early for new lease → NO credit
     * ✓ Customer bought out lease → Owns vehicle → Trades into new lease → Credit applies
     *
     * Documentation:
     * - VIN of trade-in vehicle required on lease agreement
     * - Trade-in allowance must be separately stated
     * - Proof of ownership required
     *
     * Source: Policy Statement 96-10 (Effective February 1, 1997)
     */
    tradeInCredit: "FULL",

    /**
     * Negative Equity on Leases: NOT taxable
     *
     * Negative equity rolled into a lease is NOT taxable.
     *
     * Same conservative interpretation as retail: Negative equity represents
     * a debt obligation from the previous vehicle, not consideration paid for
     * the new vehicle.
     *
     * Source: Conservative interpretation; no explicit CT guidance
     */
    negativeEquityTaxable: false,

    /**
     * Fee Taxability on Leases:
     *
     * Backend products sold with leases have specific tax treatment:
     *
     * SERVICE CONTRACTS (VSC): Depends on payment structure
     * - If amortized into monthly payment: Taxed at lease rate (6.35% or 7.75%)
     * - If paid upfront (lump sum): Taxed at 6.35% (service contract rate)
     *
     * GAP COVERAGE: Depends on payment structure
     * - If amortized into monthly payment: Taxed at lease rate (6.35% or 7.75%)
     * - If paid upfront (lump sum): Taxed at 6.35% (if service contract)
     *
     * ACQUISITION/DOC FEES: TAXABLE
     * - If amortized: Taxed as part of monthly payment
     * - If paid upfront: Taxed immediately at lease rate
     *
     * TITLE/REGISTRATION FEES: NOT TAXABLE
     * - Government fees are not subject to sales tax
     *
     * Example (Amortized Warranty):
     *   Extended Warranty: $2,500 (amortized over 36 months)
     *   Added to Monthly Payment: $69.44/month
     *   Lease Payment + Warranty: $450 + $69.44 = $519.44
     *   Monthly Tax: $519.44 × 6.35% = $32.98
     *
     * Source: Policy Statement 96-10; Legal Special Notice 92
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: true,
        notes:
          "Doc fee TAXABLE on leases at lease rate (6.35% or 7.75%). Can be amortized " +
          "(taxed monthly) or paid upfront (taxed immediately).",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: true,
        notes:
          "VSC taxable on leases. If amortized into payment: taxed at lease rate. If paid " +
          "upfront: taxed at 6.35% (service contract rate, not luxury rate).",
      },
      {
        code: "GAP",
        taxable: true,
        notes:
          "GAP taxable on leases if structured as service contract. If amortized: taxed at " +
          "lease rate. If upfront: taxed at 6.35%.",
      },
      {
        code: "ACQUISITION_FEE",
        taxable: true,
        notes: "Acquisition fee TAXABLE at lease rate (6.35% or 7.75%)",
      },
      { code: "TITLE", taxable: false, notes: "Title fee NOT taxable (government fee)" },
      { code: "REG", taxable: false, notes: "Registration fee NOT taxable (government fee)" },
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

    taxFeesUpfront: true,

    specialScheme: "NONE",

    notes:
      "Connecticut: HYBRID lease taxation (upfront tax on cap reduction + monthly tax on payments). " +
      "Luxury rate (7.75%) applies if agreed value > $50K, otherwise 6.35%. CRITICAL: Trade-in " +
      "credit ONLY allowed if customer OWNS the trade vehicle (not prior lease). Backend products " +
      "taxable if amortized into payment (at lease rate) or if paid upfront (at 6.35%). Doc fee " +
      "always taxable. Extended warranties always 6.35% even on luxury leases if paid separately.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: FULL CREDIT (credit for taxes paid to other states)
   *
   * Connecticut provides FULL reciprocity for sales tax paid in other states.
   * If tax was paid elsewhere, Connecticut gives credit and only charges the
   * difference (if CT rate is higher).
   *
   * Official Guidance (Special Notice 92-2):
   * "Connecticut provides a credit for sales tax paid to other states when a
   * Connecticut resident purchases a vehicle out of state and registers it
   * in Connecticut."
   *
   * How It Works:
   * CT Tax Owed = (CT Rate × Purchase Price) - Other State Tax Paid
   *
   * If other state's tax rate was lower, resident pays the DIFFERENCE.
   * If other state's tax rate was higher or equal, resident pays NOTHING.
   *
   * Example 1 (Other State Lower Rate):
   *   Vehicle Price: $30,000
   *   New Hampshire Tax Paid: $0 (NH has no sales tax)
   *   CT Tax Owed: $30,000 × 6.35% = $1,905
   *   Credit for NH Tax: $0
   *   Pay to CT DMV: $1,905
   *
   * Example 2 (Other State Higher Rate):
   *   Vehicle Price: $30,000
   *   California Tax Paid: $2,400 (8% effective rate)
   *   CT Tax Owed: $30,000 × 6.35% = $1,905
   *   Credit for CA Tax: $2,400
   *   Pay to CT DMV: $0 (credit exceeds CT liability, no refund)
   *
   * Example 3 (Luxury Vehicle with Reciprocity):
   *   Vehicle Price: $60,000 (purchased in Florida)
   *   Florida Tax Paid: $3,600 (6% state + local)
   *   CT Tax Owed: $60,000 × 7.75% = $4,650
   *   Credit: $3,600
   *   Pay to CT DMV: $1,050
   *
   * Documentation Required:
   * - Purchase invoice showing out-of-state sale price
   * - Tax receipt or proof of sales tax paid to other state
   * - Provide to CT DMV at time of registration
   *
   * NEW RESIDENTS (Moving to Connecticut):
   * New Connecticut residents are NOT required to pay sales tax if:
   * 1. Vehicle was registered in the SAME NAME in another state
   * 2. Registration was active for at least 30 DAYS PRIOR to establishing
   *    Connecticut residency
   *
   * Example:
   *   Person moves from New York to Connecticut
   *   Vehicle registered in New York for 2 years in their name
   *   NO CT sales tax owed when transferring registration to CT
   *
   * ACTIVE-DUTY MILITARY (Non-Residents):
   * Active-duty military stationed in Connecticut who are legal residents
   * of other states are exempt from Connecticut's luxury tax. They pay their
   * home state's tax rate.
   *
   * PRIVATE PARTY SALES:
   * Connecticut residents who purchase vehicles in private party sales in
   * other states:
   * - Still owe Connecticut use tax
   * - Pay CT rate (6.35% or 7.75%)
   * - No reciprocity credit (no tax paid to other state in private sale)
   *
   * TIMING:
   * - Reciprocity credit applied at time of registration with CT DMV
   * - Must register vehicle within reasonable time of purchase
   * - Keep all purchase and tax documents
   *
   * LIMITATIONS:
   * - Credit limited to amount of Connecticut tax owed (no refunds)
   * - Must provide documentation of other state's tax payment
   * - Credit applies only to sales tax, not registration or title fees
   *
   * Source: Special Notice 92-2; CT DMV Sales Tax on Registrations guidance
   */
  reciprocity: {
    enabled: true,
    scope: "BOTH",
    homeStateBehavior: "CREDIT_FULL",
    requireProofOfTaxPaid: true,
    basis: "TAX_PAID",
    capAtThisStatesTax: true,
    hasLeaseException: false,
    notes:
      "Connecticut provides FULL reciprocity credit for sales tax paid to other states. If other " +
      "state's tax is lower, pay difference to CT. If higher, pay nothing (no refund). Must provide " +
      "proof of tax paid. NEW RESIDENTS: If vehicle registered in your name in another state for " +
      "30+ days before establishing CT residency, NO CT sales tax owed. Luxury tax rules still apply " +
      "to reciprocity calculations (7.75% if vehicle > $50K).",
  },

  extras: {
    lastUpdated: "2025-11-13",
    sources: [
      "Connecticut Department of Revenue Services (portal.ct.gov/drs)",
      "Connecticut General Statutes:",
      "  § 12-407 (Definitions)",
      "  § 12-408(1) (Tax Rates)",
      "  § 12-412 (Exemptions)",
      "Special Notice 2011-10 (SN 2011-10) - Sales and Use Tax Affecting Motor Vehicle Dealers",
      "Policy Statement 96-10 (PS 96-10) - Lease taxation and trade-in on leases",
      "Policy Statement 94-2 (PS 92-8-1) - Motor Vehicle Repair Services",
      "Special Notice 92-2 (SN 92-2) - Credit for Taxes Paid to Other Jurisdictions",
      "Connecticut General Assembly Reports:",
      "  2023-R-0259 (Luxury Tax and Electric Vehicles)",
      "  2023-R-0092 (Car Dealer Document Fee Caps)",
      "  2006-R-0189 (Sales Tax and Manufacturer's Rebates)",
      "Public Act No. 11-6 (2011 luxury tax implementation at 7%)",
      "2015 increase to 7.75% luxury rate",
    ],
    notes:
      "Connecticut uses a TWO-TIER tax system: 6.35% standard / 7.75% luxury (> $50K). NO local sales " +
      "taxes (statewide uniform rates). CRITICAL RULE: Luxury threshold ($50K) determined by sale price " +
      "BEFORE trade-in credit. Trade-in reduces taxable base but NOT tax rate. Manufacturer rebates ARE " +
      "TAXABLE (opposite of many states). Extended warranties ALWAYS taxed at 6.35% (never luxury rate). " +
      "Doc fee can trigger luxury tax. Leases use HYBRID method (upfront + monthly). Lease trade-in ONLY " +
      "if customer OWNS the vehicle (not prior lease). Full reciprocity credit for out-of-state taxes. " +
      "New resident exemption (30-day rule). Negative equity not explicitly addressed (conservative: not taxable).",
    standardRate: 6.35,
    luxuryRate: 7.75,
    luxuryThreshold: 50000,
    warrantyRate: 6.35, // Always 6.35%, even for luxury vehicles
    gapRate: 6.35, // If treated as service contract
    avgDocFee: 415,
    tradeInAdminFee: 100, // Separate $100 fee for trade-ins
    rateHistory: {
      "pre-2011-07-01": "Single rate (6% at the time)",
      "2011-07-01": "Luxury tax introduced at 7%, standard raised to 6.35%",
      "2015-07-01": "Luxury rate increased to 7.75%",
      "2025-current": "6.35% standard / 7.75% luxury (> $50K)",
    },
    proposedChanges:
      "Senate Bill 00107 (proposed, not enacted): Would raise luxury threshold from $50K to $65K",
    uniqueFeatures: [
      "Luxury tax applies to ENTIRE price, not just excess over $50K (creates tax cliff)",
      "Luxury rate determined by pre-trade-in sale price (trade reduces base, not rate)",
      "Extended warranties always 6.35% (never luxury 7.75% rate)",
      "Doc fee included in luxury threshold calculation",
      "Manufacturer rebates taxable (opposite of MA and other states)",
      "Lease trade-in ONLY if customer owns vehicle (not prior lease)",
      "No local sales taxes (statewide uniform rates)",
      "Full reciprocity credit for out-of-state taxes",
    ],
  },
};

export default US_CT;
