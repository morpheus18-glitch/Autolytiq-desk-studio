import type { TaxRulesConfig } from "../types";

/**
 * VIRGINIA TAX RULES
 *
 * Researched: 2025-11-13
 * Version: 2
 *
 * KEY FACTS:
 * - Motor vehicle sales tax: 4.15% (flat statewide rate, no local additions)
 * - Trade-in credit: NONE - Virginia does NOT allow any trade-in credit (one of 7 strictest states)
 * - Manufacturer rebates: NOT taxable (reduce sale price before tax calculation)
 * - Dealer rebates: NOT taxable (reduce sale price before tax calculation)
 * - Doc fee: TAXABLE (included in gross sales price), NO CAP (dealers charge $400-$900+)
 * - Service contracts (VSC): TAXABLE at 50% (unique VA rule: half parts, half labor)
 * - GAP insurance: NOT taxable (GAP waivers defined as "not insurance", no explicit sales tax)
 * - Lease method: FULL_UPFRONT (4.15% tax on capitalized cost at signing, NOT on monthly payments)
 * - Minimum tax: $75 (if calculated tax < $75, $75 is owed)
 * - Reciprocity: FULL (credit for taxes paid to other states, capped at VA 4.15% rate)
 * - Personal property tax: Separate annual tax (county/city level, NOT part of sales tax system)
 *
 * UNIQUE VIRGINIA FEATURES:
 * 1. NO TRADE-IN CREDIT (ONE OF THE STRICTEST IN THE US):
 *    - Virginia does NOT allow trade-in value to reduce taxable amount
 *    - You pay sales tax on the FULL vehicle purchase price
 *    - Trade-ins only reduce your out-of-pocket cost (financed amount), NOT tax
 *    - Applies to BOTH retail purchases AND leases
 *    - Example: $40,000 vehicle with $10,000 trade = tax on $40,000, NOT $30,000
 *
 * 2. SERVICE CONTRACTS TAXED AT 50%:
 *    - Virginia uses a unique "50% rule" for parts+labor service contracts
 *    - Tax applied to 50% of contract price (deemed half parts, half labor)
 *    - Labor-only contracts: 0% taxable
 *    - Parts-only contracts: 100% taxable
 *    - Parts + labor contracts: 50% taxable
 *    - Insurance company warranties: 0% taxable (considered insurance)
 *
 * 3. LEASE TAX PAID FULLY UPFRONT:
 *    - 4.15% tax applied to capitalized cost at lease signing (one-time payment)
 *    - Monthly lease payments are NOT taxed
 *    - Different from monthly-payment-tax states (IN) and full-obligation states (NJ)
 *    - Cap cost reductions (down payment, rebates, trade equity) reduce taxable base
 *    - Separate personal property tax applies (semi-annual bills)
 *
 * 4. REBATES REDUCE TAX BASE:
 *    - Both manufacturer AND dealer rebates reduce the sale price before tax
 *    - This is MORE FAVORABLE than many states that tax manufacturer rebates
 *    - Virginia Code § 58.1-2401 explicitly excludes rebates from "sale price"
 *
 * 5. NO DOC FEE CAP:
 *    - Virginia has NO statutory limit on dealer documentation fees
 *    - Dealers commonly charge $400-$900+ (average $600-$700)
 *    - Doc fees are TAXABLE at 4.15% rate
 *    - Among the highest and most variable doc fees in the nation
 *
 * 6. SEPARATE MOTOR VEHICLE TAX SYSTEM:
 *    - Motor Vehicle Sales and Use Tax (4.15%) is SEPARATE from general sales tax
 *    - General sales tax: 4.3% state + 1% local minimum (5.3% min, up to 7% in NoVA)
 *    - Motor vehicles taxed under Chapter 24, NOT general retail sales tax
 *    - Flat 4.15% statewide for vehicles (NO local additions)
 *
 * 7. PERSONAL PROPERTY TAX (SEPARATE SYSTEM):
 *    - Annual tax on vehicle VALUE (assessed as of January 1 each year)
 *    - Billed semi-annually by localities (due May 5 and October 5)
 *    - Rates vary by county/city (typically $3-$5 per $100 of assessed value)
 *    - Applies to BOTH owned and leased vehicles
 *    - NOT part of sales tax system (separate tax type)
 *    - Creates "double taxation" feel for Virginia vehicle owners
 *
 * 8. GAP WAIVER TREATMENT:
 *    - Virginia Code § 38.2-6401 defines GAP waivers as "NOT insurance"
 *    - No explicit sales tax statute found addressing GAP taxability
 *    - Conservative approach: NOT taxable (no clear statutory basis for taxation)
 *    - Different from service contracts which have explicit 50% tax rule
 *
 * 9. MINIMUM TAX OF $75:
 *    - If calculated tax is less than $75, the tax owed is $75
 *    - Example: $1,000 vehicle × 4.15% = $41.50, but $75 minimum applies
 *    - Ensures minimal tax revenue on low-value vehicle transactions
 *
 * 10. RECIPROCITY WITH 12-MONTH WINDOW:
 *     - If you owned vehicle > 12 months before VA registration: NO tax owed
 *     - If owned < 12 months AND paid tax elsewhere: Credit for tax paid (capped at VA rate)
 *     - If owned < 12 months AND no tax paid: Full VA tax owed
 *     - Requires proof of tax payment for credit
 *
 * TAX CALCULATION FORMULA (RETAIL):
 * Sale Price = Vehicle Price + Doc Fee + Accessories - Manufacturer Rebates - Dealer Rebates
 * Taxable Base = Sale Price (NO trade-in credit)
 * Service Contract Tax Base = Service Contract Price × 50% (for parts+labor)
 * Tax = MAX($75, (Taxable Base + Service Contract Tax Base) × 4.15%)
 * Total Tax = Tax on Vehicle + Tax on Service Contracts + Tax on Accessories
 *
 * Example 1 (Standard Retail Purchase):
 * $30,000 vehicle + $500 doc fee - $2,000 mfr rebate = $28,500 sale price
 * Trade-in: $10,000 (provides NO tax credit)
 * Taxable Base: $28,500 (full sale price, NO trade-in deduction)
 * Tax: $28,500 × 4.15% = $1,182.75
 * Customer pays: $28,500 - $10,000 trade equity + $1,182.75 tax = $19,682.75
 *
 * Example 2 (With Service Contract):
 * $35,000 vehicle + $600 doc + $2,000 service contract (parts+labor)
 * Manufacturer rebate: $3,000
 * Sale Price: $35,000 + $600 - $3,000 = $32,600
 * Service Contract Taxable: $2,000 × 50% = $1,000
 * Total Taxable: $32,600 + $1,000 = $33,600
 * Tax: $33,600 × 4.15% = $1,394.40
 *
 * LEASE CALCULATION (FULL UPFRONT):
 * Gross Capitalized Cost = MSRP + Doc Fee + Accessories
 * Cap Cost Reductions = Cash Down + Rebates + Trade-In Equity
 * Adjusted Capitalized Cost = Gross Cap Cost - Cap Reductions
 * Upfront Sales Tax = Adjusted Capitalized Cost × 4.15%
 * Monthly Payments = (NOT subject to sales tax)
 * Service Contract Tax (if capitalized) = Contract Price × 50% × 4.15%
 *
 * Example (Standard Lease):
 * MSRP: $45,000
 * Doc Fee: $695
 * Gross Cap Cost: $45,695
 * Cap Reductions: $5,000 cash + $2,500 rebate = $7,500
 * Adjusted Cap Cost: $45,695 - $7,500 = $38,195
 * Upfront Tax: $38,195 × 4.15% = $1,585.09 (due at signing)
 * Monthly Payment: $450 (NOT taxed)
 * Total Tax Over Lease: $1,585.09 (one-time upfront)
 *
 * SOURCES:
 * - Virginia Department of Motor Vehicles (dmv.virginia.gov)
 * - Virginia Department of Taxation (tax.virginia.gov)
 * - Virginia Code Title 58.1, Chapter 24 (Virginia Motor Vehicle Sales and Use Tax)
 * - Virginia Code § 58.1-2401 (Definitions)
 * - Virginia Code § 58.1-2402 (Levy - 4.15% rate established July 1, 2016)
 * - Virginia Code § 58.1-2403 (Exemptions and reciprocity provisions)
 * - Virginia Administrative Code 23VAC10-210-910 (Maintenance Contracts - 50% rule)
 * - Virginia Administrative Code 23VAC10-210-990 (Motor Vehicle Sales, Leases, Rentals)
 * - Virginia Code Title 38.2, Chapter 64 (GAP Waivers - "not insurance" definition)
 * - Leasehackr Forum (VA lease taxation confirmation, dealer practice)
 * - Sales Tax Handbook (Virginia vehicle tax guide)
 */
export const US_VA: TaxRulesConfig = {
  stateCode: "VA",
  version: 2,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: NONE (one of the strictest in the US)
   *
   * Virginia does NOT allow trade-in value to reduce the taxable amount.
   * This is explicitly stated in Virginia Code § 58.1-2401:
   *
   * "Sale price" means "the total price paid for a motor vehicle and all
   * attachments thereon and accessories thereto, without any allowance or
   * deduction for trade-ins or unpaid liens or encumbrances."
   *
   * CRITICAL IMPACT:
   * You pay sales tax on the FULL purchase price of the new vehicle,
   * regardless of trade-in value. The trade-in only reduces your out-of-pocket
   * cost (financed amount), NOT your tax liability.
   *
   * Example:
   *   New Vehicle Price: $40,000
   *   Trade-In Allowance: $10,000
   *   Net Amount Financed: $30,000
   *   TAXABLE BASE: $40,000 (full price, NO trade-in deduction)
   *   Sales Tax: $40,000 × 4.15% = $1,660
   *
   * COMPARISON:
   * States with FULL trade-in credit: 44 states (NY, FL, TX, CA, etc.)
   * States with NO trade-in credit: 7 states including VA, HI, CA (leases only)
   * States with CAPPED credit: MI ($10,000 cap)
   *
   * Virginia's "no trade-in credit" policy applies to BOTH retail purchases
   * AND leases, making it one of the most expensive states for trading in
   * vehicles from a tax perspective.
   *
   * Economic Impact:
   * On a $40,000 vehicle with $10,000 trade-in:
   * - In FL (trade credit): Tax on $30,000 = $1,800 (6% rate)
   * - In VA (no credit): Tax on $40,000 = $1,660 (4.15% rate)
   * - Despite lower rate, VA customer effectively pays tax on $10,000 more
   *
   * Source: Virginia Code § 58.1-2401; VA DMV Motor Vehicle Sales Tax guidance
   */
  tradeInPolicy: { type: "NONE" },

  /**
   * Rebate Rules: Both manufacturer AND dealer rebates are NOT taxable
   *
   * Virginia Code § 58.1-2401 explicitly excludes manufacturer rebates and
   * manufacturer incentive payments from the definition of "sale price":
   *
   * "Sale price does NOT include any manufacturer rebate or manufacturer
   * incentive payment applied to the transaction by the customer or dealer
   * whether as a reduction in the sales price or as payment for the vehicle."
   *
   * MANUFACTURER REBATES (NOT TAXABLE):
   * - Factory rebates reduce the sale price before tax calculation
   * - Customer pays tax on vehicle price AFTER rebate deduction
   * - This is MORE FAVORABLE than states that tax rebates (AL, CT, others)
   *
   * Example:
   *   Vehicle MSRP: $30,000
   *   Manufacturer Rebate: $3,000
   *   Sale Price (after rebate): $27,000
   *   TAXABLE BASE: $27,000 (NOT $30,000)
   *   Tax: $27,000 × 4.15% = $1,120.50
   *
   * DEALER REBATES/INCENTIVES (NOT TAXABLE):
   * - Dealer incentives paid by manufacturer also reduce sale price
   * - If dealer passes savings to customer, tax is on reduced price
   * - Same favorable treatment as manufacturer rebates
   *
   * COMPARISON TO TRADE-INS:
   * - Rebates: REDUCE taxable base (favorable)
   * - Trade-ins: DO NOT reduce taxable base (unfavorable)
   * - This creates asymmetry: rebates help with tax, trade-ins do not
   *
   * FEDERAL EV TAX CREDITS:
   * - Federal EV rebates ($7,500) applied at point of sale: Reduce taxable base
   * - Example: $50,000 EV - $7,500 credit = $42,500 taxable
   *
   * Source: Virginia Code § 58.1-2401 (definition of "sale price")
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: false,
      notes:
        "Manufacturer rebates and incentives reduce sale price before tax calculation per " +
        "VA Code § 58.1-2401. This is MORE FAVORABLE than many states (AL, CT) that tax rebates. " +
        "Customer pays tax on price AFTER rebate deduction.",
    },
    {
      appliesTo: "DEALER",
      taxable: false,
      notes:
        "Dealer rebates and incentives also reduce sale price before tax calculation. If dealer " +
        "passes manufacturer incentives to customer as price reduction, tax is calculated on " +
        "the reduced selling price. Same favorable treatment as manufacturer rebates.",
    },
  ],

  /**
   * Doc Fee: TAXABLE with NO CAP (dealers charge $400-$900+)
   *
   * Virginia dealer documentation fees are SUBJECT to the 4.15% motor vehicle
   * sales tax and are included in the gross sales price.
   *
   * Official Guidance:
   * Per Virginia DMV and Department of Taxation guidance, the "gross sales price"
   * includes the dealer processing fee (documentation fee).
   *
   * NO STATUTORY CAP:
   * Virginia does NOT impose a limit on dealer documentation fees, unlike:
   * - New York: $175 cap
   * - California: $85 cap
   * - Florida: $899 median (but no cap)
   *
   * Virginia Documentation Fee Landscape:
   * - Range: $400 to $900+ (highly variable)
   * - Average: $600-$700 (among highest in nation)
   * - Median: $899 (tied with FL for highest median, 2025 data)
   * - Some dealers charge over $1,000
   *
   * Tax Impact:
   * Doc fee is INCLUDED in taxable base and subject to 4.15% tax.
   *
   * Example:
   *   Doc Fee: $700
   *   Tax on Doc Fee: $700 × 4.15% = $29.05
   *   Total Cost: $729.05
   *
   * Comparison:
   *   Virginia (no cap): Dealer can charge $900 doc fee
   *   California ($85 cap): Dealer can only charge $85 doc fee
   *   Difference: $815 higher doc fee in VA
   *
   * Consumer Tip:
   * While doc fees are generally "non-negotiable" (same for all customers),
   * Virginia's lack of cap means consumers should shop around and compare
   * doc fees across dealerships before committing.
   *
   * Source: VA DMV guidance; CarEdge 2025 doc fee survey; Sales Tax Handbook
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules
   *
   * Virginia has specific rules for various backend products and fees.
   *
   * SERVICE CONTRACTS (VSC): TAXABLE at 50% (unique VA rule)
   * Virginia Administrative Code 23VAC10-210-910 establishes the "50% rule":
   *
   * "Maintenance contracts providing both repair or replacement parts and
   * repair labor are subject to tax upon one-half (50%) of the total charge
   * for such contracts."
   *
   * Reasoning:
   * Virginia recognizes that service contracts include BOTH:
   * - Taxable parts (tangible personal property)
   * - Non-taxable labor (services)
   *
   * Tax Treatment by Contract Type:
   * - Labor-only contracts: 0% taxable (services exempt)
   * - Parts-only contracts: 100% taxable (tangible property)
   * - Parts + labor contracts: 50% taxable (deemed half/half)
   * - Insurance company warranties: 0% taxable (considered insurance, regulated by SCC)
   *
   * Example (Service Contract):
   *   VSC Price: $2,500 (parts + labor coverage)
   *   Taxable Amount: $2,500 × 50% = $1,250
   *   Sales Tax: $1,250 × 4.15% = $51.88
   *   Total Cost: $2,551.88
   *
   * GAP INSURANCE/WAIVERS: NOT TAXABLE (no clear statutory basis)
   * Virginia Code § 38.2-6401 defines GAP waivers:
   *
   * "Guaranteed asset protection waivers are not insurance and are exempt
   * from the insurance laws of this Commonwealth."
   *
   * TAX TREATMENT:
   * - GAP waivers explicitly defined as "NOT insurance"
   * - NO explicit sales tax statute found addressing GAP taxability
   * - No Virginia Tax Department ruling located
   * - Conservative approach: NOT subject to sales tax
   * - Differs from service contracts which have explicit 50% tax rule
   *
   * CRITICAL DISTINCTION:
   * - Service contracts: Explicit 50% tax rule (23VAC10-210-910)
   * - GAP waivers: No explicit tax statute (conservative: not taxed)
   *
   * TITLE FEE: NOT TAXABLE
   * - DMV government fee (not dealer charge)
   * - Currently ~$75 for standard title
   * - Government fees exempt from sales tax
   *
   * REGISTRATION FEES: NOT TAXABLE
   * - DMV government fees
   * - Vary by vehicle type and weight
   * - Government fees exempt from sales tax
   *
   * Source: 23VAC10-210-910; VA Code § 38.2-6401; VA DMV fee schedule
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: true,
      notes:
        "Service contracts (VSC) with parts AND labor coverage are TAXABLE at 50% of contract " +
        "price per 23VAC10-210-910. Virginia's unique '50% rule' recognizes these contracts " +
        "include both taxable parts and non-taxable labor. Engine must calculate 50% of contract " +
        "price as taxable base. Insurance company warranties (regulated by SCC) are NOT taxable.",
    },
    {
      code: "GAP",
      taxable: false,
      notes:
        "GAP waivers are defined as 'NOT insurance' under VA Code § 38.2-6401 but have no " +
        "explicit sales tax statute addressing taxability. No VA Tax Department ruling found. " +
        "Conservative approach: NOT subject to sales tax (unlike service contracts which have " +
        "explicit 50% tax rule). Differs from states that explicitly tax GAP as service contract.",
    },
    {
      code: "DOC_FEE",
      taxable: true,
      notes:
        "Documentation fees ARE TAXABLE at 4.15% and included in gross sales price. Virginia " +
        "has NO STATUTORY CAP on doc fees (dealers charge $400-$900+, avg $600-$700). Among " +
        "the highest and most variable doc fees in the nation.",
    },
    {
      code: "TITLE",
      taxable: false,
      notes:
        "DMV title fee (~$75) is a government charge, NOT subject to sales tax. Must be " +
        "separately stated on invoice.",
    },
    {
      code: "REG",
      taxable: false,
      notes: "DMV registration fees are government charges, NOT subject to sales tax.",
    },
  ],

  /**
   * Product Taxability
   *
   * ACCESSORIES: TAXABLE (included in sale price)
   * Virginia Code § 58.1-2401 defines "sale price" as including:
   * "all attachments thereon and accessories thereto"
   *
   * Accessories purchased WITH the vehicle are taxed at 4.15% as part of
   * the vehicle sale price. This includes:
   * - Dealer-installed options (roof racks, running boards, etc.)
   * - Window tinting
   * - Remote starters
   * - Floor mats, cargo liners
   * - Aftermarket wheels/tires
   *
   * Example:
   *   Vehicle Price: $35,000
   *   Accessories: $2,000
   *   Total Sale Price: $37,000
   *   Tax: $37,000 × 4.15% = $1,535.50
   *
   * NEGATIVE EQUITY: NOT TAXABLE
   * Negative equity rolled into a loan is a FINANCING ISSUE, not part of
   * the vehicle's "sale price" for tax purposes.
   *
   * Official Position:
   * Virginia Code § 58.1-2401 defines "sale price" as "the total price paid
   * for a motor vehicle." Negative equity is NOT payment for the new vehicle;
   * it's a debt obligation from the previous vehicle rolled into the new loan.
   *
   * Tax Treatment:
   * Negative equity INCREASES the financed amount but does NOT increase the
   * taxable base. You pay tax on the vehicle price, NOT on negative equity.
   *
   * Example:
   *   New Vehicle Price: $30,000
   *   Trade-In Actual Value: $8,000
   *   Trade-In Payoff: $12,000
   *   Negative Equity: $4,000
   *
   *   TAXABLE BASE: $30,000 (vehicle price only, no trade credit)
   *   Sales Tax: $30,000 × 4.15% = $1,245
   *   Amount Financed: $30,000 - $8,000 + $4,000 + $1,245 = $27,245
   *   (Negative equity NOT taxed, but increases loan amount)
   *
   * SERVICE CONTRACTS: TAXABLE at 50% (see feeTaxRules above)
   * GAP: NOT TAXABLE (see feeTaxRules above)
   *
   * Source: Virginia Code § 58.1-2401; VA DMV guidance
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: false, // Financing issue, not part of sale price
  taxOnServiceContracts: true, // At 50% for parts+labor contracts
  taxOnGap: false, // GAP waivers not clearly taxable under VA law

  /**
   * Vehicle Tax Scheme: STATE_ONLY (flat 4.15%, no local additions)
   *
   * Virginia's Motor Vehicle Sales and Use Tax (MVSUT) is a FLAT 4.15%
   * statewide rate with NO local additions per Virginia Code § 58.1-2402.
   *
   * SEPARATE MOTOR VEHICLE TAX SYSTEM:
   * Motor vehicles are taxed under Chapter 24 (Motor Vehicle Sales and Use Tax),
   * NOT under the general retail sales tax system (Chapter 6).
   *
   * Rate Comparison:
   * - Motor Vehicles: 4.15% (flat statewide, NO local add-ons)
   * - General Sales Tax: 4.3% state + 1% local minimum = 5.3% base
   * - Northern VA (NVTA): 4.3% state + 1% local + 0.7% regional = 6.0%
   * - Hampton Roads (HRTAC): 4.3% state + 1% local + 0.7% regional = 6.0%
   * - Central VA (I-81): 4.3% state + 1% local + additional local = varies
   *
   * CRITICAL DISTINCTION:
   * Unlike general retail sales (which have local variations up to 7%),
   * motor vehicle sales tax is UNIFORM statewide at 4.15% regardless of
   * buyer location, dealer location, or registration location.
   *
   * Historical Rate:
   * The 4.15% rate was established on July 1, 2016, and has remained
   * unchanged since then (as of 2025).
   *
   * Minimum Tax:
   * Virginia Code § 58.1-2402 establishes a minimum tax of $75.
   * If the calculated tax is less than $75, the tax owed is $75.
   *
   * Example (Low-Value Vehicle):
   *   Vehicle Price: $1,000
   *   Calculated Tax: $1,000 × 4.15% = $41.50
   *   Tax Owed: $75 (minimum applies)
   *
   * Example (Standard Vehicle):
   *   Vehicle Price: $35,000
   *   Calculated Tax: $35,000 × 4.15% = $1,452.50
   *   Tax Owed: $1,452.50 (exceeds minimum)
   *
   * NO LOCAL VEHICLE TAX (for sales tax purposes):
   * - Counties do NOT add sales tax to motor vehicles
   * - Cities do NOT add sales tax to motor vehicles
   * - Special districts do NOT add sales tax to motor vehicles
   * - Uniform 4.15% statewide
   *
   * NOTE - PERSONAL PROPERTY TAX (SEPARATE SYSTEM):
   * Virginia DOES have local personal property taxes on vehicles (annual tax
   * based on vehicle value), but this is a COMPLETELY SEPARATE tax system:
   * - NOT part of sales tax (different tax type)
   * - Billed semi-annually (May 5 and October 5)
   * - Rates vary by locality ($3-$5 per $100 of assessed value typical)
   * - Based on vehicle value as of January 1 each year
   * - Applies to BOTH owned and leased vehicles
   *
   * Source: Virginia Code § 58.1-2402 (Levy); VA Code § 58.1-2403 (Exemptions)
   */
  vehicleTaxScheme: "STATE_ONLY",
  vehicleUsesLocalSalesTax: false, // Motor vehicles do NOT use local sales tax in VA

  // ============================================================================
  // LEASE TRANSACTION RULES
  // ============================================================================

  leaseRules: {
    /**
     * Lease Method: FULL_UPFRONT (tax on capitalized cost at signing)
     *
     * Virginia taxes leases on the FULL ADJUSTED CAPITALIZED COST at lease
     * signing as a ONE-TIME upfront payment. Monthly lease payments are NOT
     * subject to additional sales tax.
     *
     * Official Guidance:
     * Virginia Administrative Code 23VAC10-210-990 and confirmed dealer
     * practice (Leasehackr forums, VA dealer documentation) establish that
     * the 4.15% Motor Vehicle Sales and Use Tax is applied to the adjusted
     * capitalized cost at lease inception.
     *
     * HOW IT WORKS:
     * 1. Gross Capitalized Cost (vehicle MSRP/price + fees)
     * 2. MINUS Cap Cost Reductions (down payment, rebates, trade equity)
     * 3. = Adjusted Capitalized Cost
     * 4. Upfront Tax = Adjusted Cap Cost × 4.15%
     * 5. Monthly Payments = NO additional tax
     *
     * Example (Standard Lease):
     *   MSRP: $50,000
     *   Negotiated Price: $48,000
     *   Doc Fee: $695
     *   Gross Cap Cost: $48,695
     *   Cap Reductions:
     *     - Cash Down: $3,000
     *     - Manufacturer Rebate: $2,500
     *     - Total: $5,500
     *   Adjusted Cap Cost: $48,695 - $5,500 = $43,195
     *   Upfront Sales Tax: $43,195 × 4.15% = $1,792.59
     *   Due at Signing: $3,000 + $1,792.59 + first payment + fees = ~$5,242.59
     *   Monthly Payment: $475 (NO additional sales tax)
     *
     * COMPARISON TO OTHER STATES:
     *
     * Monthly Payment Taxation (Indiana, Ohio):
     * - Tax applied to each monthly payment as it's made
     * - Lower upfront cost
     * - Total tax spread over lease term
     *
     * Full Lease Obligation (New Jersey, New York):
     * - Tax applied to total of all payments plus residual value
     * - Very high upfront tax
     * - Most expensive lease taxation method
     *
     * Virginia (Capitalized Cost):
     * - Tax applied to adjusted cap cost at signing (middle ground)
     * - One-time upfront payment
     * - More expensive at signing than monthly-tax states
     * - Less expensive than full-obligation states
     *
     * ECONOMIC IMPACT:
     * Virginia's upfront cap cost taxation creates higher due-at-signing
     * amounts compared to monthly-payment-tax states, which can be a
     * barrier for consumers with limited cash at signing.
     *
     * Example Comparison (36-month lease):
     *   Adjusted Cap Cost: $40,000
     *   Monthly Payment: $450
     *
     *   VIRGINIA (Upfront):
     *     - Upfront Tax: $40,000 × 4.15% = $1,660
     *     - Monthly Tax: $0
     *     - Total Tax: $1,660
     *
     *   INDIANA (Monthly):
     *     - Upfront Tax: $0
     *     - Monthly Tax: $450 × 7% = $31.50/month
     *     - Total Tax: $31.50 × 36 = $1,134
     *
     *   NEW JERSEY (Full Obligation):
     *     - Total Payments: $450 × 36 = $16,200
     *     - Residual: $22,000
     *     - Upfront Tax: ($16,200 + $22,000) × 6.625% = $2,536.65
     *     - Monthly Tax: $0
     *     - Total Tax: $2,536.65
     *
     * LEASE END BUYOUT:
     * If you purchase the leased vehicle at lease end, you must pay sales
     * tax on the residual value purchase. However, if you already paid the
     * upfront sales tax when you leased the vehicle, you may be exempt from
     * paying tax again (check with VA DMV for current exemption rules).
     *
     * Source: 23VAC10-210-990; Leasehackr forum dealer confirmations; VA DMV
     */
    method: "FULL_UPFRONT",

    /**
     * Cap Cost Reduction: Reduces taxable base (not taxed itself)
     *
     * Cap cost reductions (down payments, rebates, trade-in equity) REDUCE
     * the capitalized cost before the upfront 4.15% tax is calculated.
     *
     * Since tax is applied to the ADJUSTED capitalized cost (after reductions),
     * cap cost reductions effectively lower the tax paid.
     *
     * What Reduces Cap Cost:
     * - Cash down payment
     * - Manufacturer rebates (applied at signing)
     * - Dealer incentives (applied at signing)
     * - Trade-in equity (NOTE: provides NO separate tax credit, see below)
     * - Security deposit (if applied to cap cost, not refundable)
     *
     * Tax Treatment:
     * The cap cost reductions themselves are NOT taxed. They simply reduce
     * the adjusted cap cost, which is then taxed at 4.15%.
     *
     * Example:
     *   Gross Cap Cost: $45,000
     *   Cap Reductions: $7,000
     *   Adjusted Cap Cost: $38,000
     *   Tax: $38,000 × 4.15% = $1,577 (NOT $45,000 × 4.15% = $1,867.50)
     *   Tax Savings: $290.50 due to $7,000 cap reduction
     *
     * CRITICAL: Trade-In Equity (NO SEPARATE CREDIT)
     * While trade-in equity CAN reduce the cap cost (lowering the financed
     * amount), Virginia provides NO SEPARATE tax credit for trade-ins on
     * leases, just as with retail purchases. See tradeInCredit below for
     * detailed explanation.
     *
     * Source: 23VAC10-210-990; VA Code § 58.1-2401
     */
    taxCapReduction: false, // Cap reductions reduce the base before tax, not taxed themselves

    /**
     * Rebate Behavior on Leases: FOLLOW_RETAIL_RULE
     *
     * Manufacturer and dealer rebates on leases follow the same favorable
     * treatment as retail purchases per Virginia Code § 58.1-2401.
     *
     * Rebates applied as cap cost reductions reduce the adjusted capitalized
     * cost before the upfront 4.15% tax is calculated.
     *
     * This means rebates provide REAL tax savings on Virginia leases.
     *
     * Example:
     *   Gross Cap Cost: $50,000
     *   Manufacturer Rebate: $4,000 (applied as cap reduction)
     *   Adjusted Cap Cost: $46,000
     *   Tax: $46,000 × 4.15% = $1,909
     *   WITHOUT rebate: $50,000 × 4.15% = $2,075
     *   Tax Savings: $166 due to $4,000 rebate
     *
     * Federal EV Lease Incentives:
     * Federal EV tax credits ($7,500) applied at lease signing reduce the
     * cap cost and therefore reduce the upfront tax.
     *
     * Source: VA Code § 58.1-2401; 23VAC10-210-990
     */
    rebateBehavior: "FOLLOW_RETAIL_RULE",

    /**
     * Doc Fee on Leases: ALWAYS taxable
     *
     * Dealer documentation fees on leases are INCLUDED in the gross capitalized
     * cost and therefore subject to the upfront 4.15% sales tax.
     *
     * Treatment:
     * - Doc fee added to gross cap cost
     * - Subject to 4.15% upfront tax
     * - No cap on doc fee amount (VA has no statutory limit)
     *
     * Example:
     *   Doc Fee: $695
     *   Tax on Doc Fee: $695 × 4.15% = $28.84
     *   Total Doc Fee Cost: $723.84 (paid at signing)
     *
     * Since Virginia has NO CAP on documentation fees and dealers commonly
     * charge $600-$900, this can add $25-$37 in additional tax at signing.
     *
     * Source: 23VAC10-210-990; VA DMV guidance
     */
    docFeeTaxability: "ALWAYS",

    /**
     * Trade-in Credit on Leases: NONE (same as retail purchases)
     *
     * Virginia provides NO sales tax credit for trade-ins on leases, just as
     * with retail purchases. This is one of the most punitive trade-in
     * policies in the nation and applies equally to leases and purchases.
     *
     * CRITICAL UNDERSTANDING:
     * While trade-in equity CAN be applied as a cap cost reduction (lowering
     * the adjusted capitalized cost and therefore the financed amount), there
     * is NO SEPARATE tax credit beyond that reduction.
     *
     * Example (Trade-In on Lease):
     *   Gross Cap Cost: $45,000
     *   Trade-In Equity: $10,000 (applied as cap reduction)
     *   Adjusted Cap Cost: $35,000
     *   Upfront Tax: $35,000 × 4.15% = $1,452.50
     *
     * Compare to State with Trade Credit:
     *   Gross Cap Cost: $45,000
     *   Trade-In: $10,000
     *   Taxable Base: $35,000 (with full trade credit)
     *   Tax: $35,000 × 6% = $2,100
     *
     * Compare to Virginia (No Trade Credit):
     *   Gross Cap Cost: $45,000
     *   Trade-In: $10,000 (reduces cap, but NO separate tax credit)
     *   Adjusted Cap Cost: $35,000
     *   Tax: $35,000 × 4.15% = $1,452.50
     *
     * In Virginia, the trade-in only reduces the cap cost (lowering the
     * taxable base), but you don't get an ADDITIONAL credit beyond that.
     *
     * Leasehackr Forum Quote:
     * "In VA you pay full sales tax up front and receive no sales tax credit
     * for your trade-in vehicle."
     *
     * This makes Virginia one of the LEAST FAVORABLE states for leasing when
     * you have a trade-in vehicle with significant equity.
     *
     * Economic Impact ($10,000 trade-in):
     *   States with trade credit: Save $400-$700 in sales tax
     *   Virginia (no trade credit): Save $0 beyond cap cost reduction
     *
     * Source: VA Code § 58.1-2401; Leasehackr forum; dealer practice
     */
    tradeInCredit: "NONE",

    /**
     * Negative Equity on Leases: NOT taxable
     *
     * Negative equity rolled into a lease is NOT taxable, consistent with
     * retail purchase treatment.
     *
     * Treatment:
     * Negative equity from a trade-in INCREASES the capitalized cost (and
     * therefore increases the financed amount), but it is NOT considered
     * part of the "sale price" for tax purposes.
     *
     * You pay tax on the vehicle's adjusted capitalized cost, which includes
     * negative equity for payment calculation purposes, but the negative
     * equity itself is a debt obligation, not payment for the new vehicle.
     *
     * Example:
     *   Gross Cap Cost: $40,000
     *   Trade-In Value: $8,000
     *   Trade-In Payoff: $12,000
     *   Negative Equity: $4,000
     *   Adjusted Cap Cost: $40,000 - $8,000 + $4,000 = $36,000
     *   Upfront Tax: $36,000 × 4.15% = $1,494
     *
     * The $36,000 includes the $4,000 negative equity, so you effectively
     * pay tax on it as part of the cap cost. However, this is consistent
     * with how cap cost reductions work (they adjust the taxable base).
     *
     * Source: VA Code § 58.1-2401; conservative interpretation
     */
    negativeEquityTaxable: false,

    /**
     * Fee Taxability on Leases
     *
     * Backend products and fees on leases follow the same tax treatment as
     * retail purchases, applied to the upfront capitalized cost taxation.
     *
     * DOC FEE: TAXABLE
     * - Included in gross cap cost
     * - Subject to upfront 4.15% tax
     * - No cap on amount (dealers charge $400-$900+)
     *
     * SERVICE CONTRACTS (VSC): TAXABLE at 50% if capitalized
     * - If capitalized into lease: 50% of contract price added to cap cost
     * - Subject to upfront 4.15% tax on the 50% taxable portion
     * - Same "50% rule" as retail purchases (23VAC10-210-910)
     *
     * Example:
     *   Service Contract: $2,500 (parts+labor, capitalized into lease)
     *   Taxable Amount: $2,500 × 50% = $1,250
     *   Added to Cap Cost: $1,250
     *   Tax: $1,250 × 4.15% = $51.88
     *
     * GAP INSURANCE: NOT TAXABLE
     * - Same treatment as retail
     * - No clear statutory basis for taxation
     * - Conservative approach: not subject to sales tax
     *
     * TITLE FEE: NOT TAXABLE
     * - DMV government fee
     * - Not subject to sales tax
     * - Separately stated
     *
     * REGISTRATION FEES: NOT TAXABLE
     * - DMV government fees
     * - Not subject to sales tax
     *
     * Source: 23VAC10-210-990; 23VAC10-210-910; VA DMV
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: true,
        notes:
          "Doc fee included in gross capitalized cost, subject to upfront 4.15% tax. " +
          "Virginia has NO cap on doc fees (dealers charge $400-$900+).",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: true,
        notes:
          "Service contracts (VSC) capitalized into lease are TAXABLE at 50% if parts+labor " +
          "coverage (same as retail). 50% of contract price is added to capitalized cost and " +
          "subject to upfront 4.15% tax per 23VAC10-210-910.",
      },
      {
        code: "GAP",
        taxable: false,
        notes:
          "GAP waivers NOT clearly taxable on leases (same as retail). No explicit sales tax " +
          "statute. Conservative approach: not subject to sales tax.",
      },
      {
        code: "TITLE",
        taxable: false,
        notes: "DMV title fee (~$75) is NOT taxable (government fee).",
      },
      {
        code: "REG",
        taxable: false,
        notes: "DMV registration fees are NOT taxable (government fees).",
      },
    ],

    /**
     * Title Fee Rules on Leases
     *
     * Title processing and government fees:
     * - NOT taxable (government charges)
     * - Included in cap cost (increases cap cost for payment calculation)
     * - Paid upfront at signing
     * - NOT spread into monthly payments
     *
     * Virginia title fee is approximately $75 for standard title processing.
     */
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

    /**
     * Tax Fees Upfront: TRUE
     *
     * All taxable fees (doc fee, 50% of service contracts) are taxed upfront
     * on leases as part of the capitalized cost taxation at 4.15%.
     *
     * There is NO monthly taxation of fees. Everything is taxed once at
     * lease signing.
     */
    taxFeesUpfront: true,

    /**
     * Special Scheme: VA_USAGE
     *
     * Virginia has a unique lease taxation structure that includes TWO
     * separate tax systems:
     *
     * 1. MOTOR VEHICLE SALES TAX (4.15%):
     *    - One-time upfront tax on adjusted capitalized cost
     *    - Paid at lease signing
     *    - Administered by Virginia DMV
     *    - Part of "due at signing" amount
     *
     * 2. PERSONAL PROPERTY TAX (annual, varies by locality):
     *    - Separate tax on vehicle VALUE (not price)
     *    - Billed semi-annually (May 5 and October 5)
     *    - Assessed as of January 1 each year
     *    - Rates vary by county/city (typically $3-$5 per $100 of assessed value)
     *    - Applies to LEASED vehicles (lessee pays, not lessor typically)
     *    - NOT part of sales tax system (different tax type)
     *    - Administered by local treasurers
     *
     * PERSONAL PROPERTY TAX DETAILS:
     *
     * Valuation:
     * - Based on NADA or other recognized guide values
     * - Assessed as of January 1
     * - Depreciates each year
     *
     * Rates (examples):
     * - Fairfax County: $4.57 per $100 (4.57%)
     * - Alexandria: $5.00 per $100 (5.0%)
     * - Richmond: $3.70 per $100 (3.7%)
     * - Virginia Beach: $4.00 per $100 (4.0%)
     *
     * Example (Fairfax County Lease):
     *   Year 1:
     *     Assessed Value: $40,000
     *     PP Tax: $40,000 × 4.57% = $1,828/year
     *     Billed: $914 (May) + $914 (October)
     *
     *   Year 2:
     *     Assessed Value: $34,000 (depreciated)
     *     PP Tax: $34,000 × 4.57% = $1,554/year
     *
     * Virginia State Tax Relief:
     * The Commonwealth of Virginia subsidizes a portion of personal property
     * tax on the first $20,000 of assessed value for personal-use vehicles
     * (not business use). This reduces the effective PP tax rate.
     *
     * COMBINED TAX BURDEN (Example):
     *   $45,000 Lease (Fairfax County, 36 months):
     *
     *   At Signing:
     *     Sales Tax: $45,000 × 4.15% = $1,867.50 (one-time)
     *
     *   Year 1:
     *     PP Tax: ~$1,800 (two semi-annual bills)
     *
     *   Year 2:
     *     PP Tax: ~$1,500 (depreciated value)
     *
     *   Year 3:
     *     PP Tax: ~$1,250 (further depreciated)
     *
     *   Total Tax Over Lease: $1,867.50 + $1,800 + $1,500 + $1,250 = $6,417.50
     *
     * This "double taxation" structure (upfront sales tax + ongoing personal
     * property tax) makes Virginia one of the more expensive states for
     * leasing from a total tax perspective.
     *
     * The VA_USAGE special scheme indicator reminds tax engine interpreters
     * that Virginia has this unique two-tier tax system for leases.
     *
     * Source: VA Code § 58.1-3500 (Personal Property Tax); VA Code § 58.1-3523
     * (Tax Relief); Local government tax rates
     */
    specialScheme: "VA_USAGE",

    notes:
      "Virginia lease taxation: FULL UPFRONT method with 4.15% tax on adjusted capitalized cost " +
      "at signing (NOT on monthly payments). Trade-ins provide NO tax credit (only reduce cap cost). " +
      "Service contracts taxed at 50% if capitalized. GAP not clearly taxable. NO doc fee cap " +
      "(dealers charge $400-$900+). Virginia has unique VA_USAGE special scheme: upfront sales tax " +
      "PLUS separate semi-annual personal property tax (varies by locality, typically $3-$5 per $100 " +
      "of assessed value). This 'double taxation' makes VA one of the more expensive leasing states " +
      "from a total tax perspective. Rebates DO reduce cap cost before tax (favorable treatment).",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: ENABLED with credit for tax paid elsewhere
   *
   * Virginia Code § 58.1-2403 provides an exemption for vehicles being
   * registered for the first time in Virginia if certain conditions are met.
   *
   * RECIPROCITY RULES (12-Month Window):
   *
   * Scenario 1: Owned > 12 months before VA registration
   * - Result: NO Virginia tax owed (exempt under § 58.1-2403)
   * - Proof required: Valid assignable title from another state
   * - No need to prove tax paid
   *
   * Scenario 2: Owned ≤ 12 months AND paid tax to another state
   * - Result: Credit for tax paid (capped at Virginia's 4.15% rate)
   * - Proof required: Evidence of sales tax paid to other state
   * - Credit based on amount actually paid
   *
   * Scenario 3: Owned ≤ 12 months AND NO tax paid to other state
   * - Result: Full Virginia tax owed (4.15% of vehicle price)
   * - No credit available
   * - Common for purchases in no-sales-tax states (DE, NH, MT, OR, AK)
   *
   * HOW THE CREDIT WORKS:
   *
   * Virginia credits the ACTUAL tax paid to another state, but caps the
   * credit at what Virginia would have charged (4.15% of vehicle price).
   *
   * Example 1 (Other State Higher Tax):
   *   Vehicle Price: $40,000
   *   Maryland Tax Paid: 6% = $2,400
   *   Virginia Tax Would Be: 4.15% = $1,660
   *   Credit Allowed: $1,660 (capped at VA tax)
   *   Additional VA Tax Owed: $0
   *   (No refund for excess $740 paid to MD)
   *
   * Example 2 (Other State Lower Tax):
   *   Vehicle Price: $40,000
   *   North Carolina Tax Paid: 3% = $1,200
   *   Virginia Tax Would Be: 4.15% = $1,660
   *   Credit Allowed: $1,200 (actual amount paid)
   *   Additional VA Tax Owed: $460
   *
   * Example 3 (No Sales Tax State):
   *   Vehicle Price: $40,000
   *   Delaware Tax Paid: $0 (DE has no sales tax)
   *   Virginia Tax Would Be: 4.15% = $1,660
   *   Credit Allowed: $0
   *   Additional VA Tax Owed: $1,660 (full VA tax)
   *
   * Example 4 (Owned > 12 Months):
   *   Vehicle Price: $40,000
   *   Purchased in California 18 months ago
   *   Virginia Tax Would Be: 4.15% = $1,660
   *   Result: EXEMPT (owned > 12 months)
   *   VA Tax Owed: $0
   *
   * DOCUMENTATION REQUIREMENTS:
   *
   * To receive reciprocity credit, you must provide:
   * 1. Purchase invoice showing vehicle price
   * 2. Receipt or proof of sales tax paid to other state
   * 3. Date of original purchase (to verify 12-month window)
   * 4. Valid assignable title from other state
   *
   * Submit documents to Virginia DMV at time of registration.
   *
   * APPLIES TO BOTH RETAIL AND LEASE:
   * Reciprocity rules apply equally to:
   * - Retail purchases (credit for purchase tax paid elsewhere)
   * - Leases (credit for lease tax paid elsewhere)
   *
   * NEW RESIDENTS:
   * If you move to Virginia and have owned your vehicle for more than 12
   * months in your previous state, you are exempt from Virginia motor vehicle
   * sales tax when transferring your registration.
   *
   * Example:
   *   You lived in New York for 3 years with vehicle registered in your name
   *   You move to Virginia and transfer registration
   *   Result: NO Virginia sales tax owed (12-month exemption applies)
   *
   * ACTIVE-DUTY MILITARY:
   * Military personnel stationed in Virginia who maintain legal residence
   * in another state may be exempt from Virginia motor vehicle sales tax
   * under federal Servicemembers Civil Relief Act (SCRA). Consult VA DMV
   * for current military exemption rules.
   *
   * TEMPORARY RESIDENTS:
   * Students attending Virginia schools who maintain legal residence in
   * another state may qualify for exemptions. Vehicle must be titled and
   * registered in home state.
   *
   * GIFT TRANSFERS:
   * Vehicles gifted between spouses, parents and children, or other
   * immediate family members may be exempt from sales tax under certain
   * conditions (separate from reciprocity rules).
   *
   * TIMING:
   * - Reciprocity credit applied at time of Virginia registration
   * - Must register vehicle within reasonable time of moving to Virginia
   * - 12-month ownership clock starts from date of original purchase
   *
   * LIMITATIONS:
   * - Credit limited to Virginia's 4.15% rate (no refunds if paid more)
   * - Must provide documentation of other state's tax payment
   * - Credit applies to sales tax only, not registration or title fees
   * - 12-month exemption requires proof of ownership duration
   *
   * COMPARISON TO OTHER STATES:
   *
   * Full Reciprocity (like VA):
   * - Alabama, Connecticut, Florida, Georgia, Illinois, etc.
   * - Credit for tax paid elsewhere (capped at home state rate)
   *
   * No Reciprocity:
   * - California (limited reciprocity for military only)
   * - Kentucky (pays full state tax regardless)
   *
   * Virginia's reciprocity policy balances protecting the state's tax base
   * while providing fairness for recent out-of-state purchases and new
   * residents who have already established ownership elsewhere.
   *
   * Source: Virginia Code § 58.1-2403 (Exemptions); VA DMV registration guidance
   */
  reciprocity: {
    enabled: true,
    scope: "BOTH", // Applies to both retail and lease transactions

    /**
     * Home State Behavior: CREDIT_UP_TO_STATE_RATE
     *
     * Virginia credits tax paid to other states but caps the credit at what
     * Virginia would charge (4.15% of vehicle price).
     *
     * If you paid MORE tax elsewhere: Credit limited to VA rate (no refund)
     * If you paid LESS tax elsewhere: Credit for actual amount, pay difference
     */
    homeStateBehavior: "CREDIT_UP_TO_STATE_RATE",

    /**
     * Require Proof: TRUE
     *
     * Virginia requires "evidence of sales tax paid to another state" per
     * § 58.1-2403. Documentation must be provided to VA DMV:
     * - Purchase invoice showing vehicle price
     * - Receipt showing tax paid to other state
     * - Date of purchase (for 12-month window)
     */
    requireProofOfTaxPaid: true,

    /**
     * Basis: TAX_PAID
     *
     * The credit is based on the ACTUAL tax amount paid to the other state,
     * not on what would have been due under the other state's statutory rate.
     *
     * You must provide proof of actual payment, not just liability.
     */
    basis: "TAX_PAID",

    /**
     * Cap at Virginia's Tax: TRUE
     *
     * The credit cannot exceed what Virginia would charge (4.15% of vehicle
     * price). If you paid more tax elsewhere, the credit is limited to
     * Virginia's rate with no refund of the excess.
     *
     * Example:
     *   $50,000 vehicle, paid 8% in California = $4,000
     *   Virginia would charge: $50,000 × 4.15% = $2,075
     *   Credit: $2,075 (capped, no refund of extra $1,925)
     *   Additional VA Tax: $0
     */
    capAtThisStatesTax: true,

    /**
     * Lease Exception: FALSE
     *
     * Reciprocity applies the same way to both retail purchases and leases.
     * No special lease-specific reciprocity rules exist.
     *
     * If you leased a vehicle in another state and paid lease tax there,
     * you can receive credit when registering in Virginia (within 12-month
     * window, with proof).
     */
    hasLeaseException: false,

    notes:
      "Virginia grants FULL reciprocity credit for sales tax paid to other states when first " +
      "registering a vehicle in VA, with TWO PATHS: (1) If owned > 12 months: EXEMPT from VA tax " +
      "regardless of prior tax payment. (2) If owned ≤ 12 months: Credit for tax paid elsewhere " +
      "(capped at VA's 4.15% rate), must provide PROOF of payment. This prevents double taxation " +
      "for recent out-of-state purchases while ensuring VA collects tax on new in-state purchases. " +
      "Applies equally to retail purchases and leases. New residents with 12+ months ownership are " +
      "exempt. Military and student exemptions may also apply (separate rules).",
  },

  // ============================================================================
  // STATE-SPECIFIC EXTRAS
  // ============================================================================

  extras: {
    lastUpdated: "2025-11-13",
    status: "PRODUCTION_READY",
    researchQuality: "COMPREHENSIVE",
    sources: [
      "Virginia Department of Motor Vehicles (dmv.virginia.gov)",
      "Virginia Department of Taxation (tax.virginia.gov)",
      "Virginia Code Title 58.1, Chapter 24 - Motor Vehicle Sales and Use Tax",
      "Virginia Code § 58.1-2401 - Definitions (sale price, rebates, trade-ins)",
      "Virginia Code § 58.1-2402 - Levy (4.15% rate established July 1, 2016)",
      "Virginia Code § 58.1-2403 - Exemptions (reciprocity, 12-month rule, gifts)",
      "Virginia Administrative Code 23VAC10-210-910 - Maintenance Contracts (50% rule)",
      "Virginia Administrative Code 23VAC10-210-990 - Motor Vehicle Sales, Leases, Rentals",
      "Virginia Code Title 38.2, Chapter 64 - Guaranteed Asset Protection Waivers",
      "Virginia Code § 38.2-6401 - GAP waivers 'not insurance' definition",
      "Leasehackr Forum - VA lease taxation confirmation from dealers and lessees",
      "Sales Tax Handbook - Virginia vehicle tax comprehensive guide",
      "CarEdge 2025 Documentation Fee Survey - VA doc fee data",
    ],
    notes:
      "Virginia has one of the STRICTEST trade-in policies in the US (NO credit at all on either " +
      "retail or leases). Motor Vehicle Sales Tax is 4.15% flat statewide with NO local additions " +
      "(separate from general 5.3%-7.0% retail sales tax). Leases taxed FULLY UPFRONT on adjusted " +
      "cap cost (NOT on monthly payments). Service contracts uniquely taxed at 50% for parts+labor " +
      "contracts per 23VAC10-210-910. GAP waivers NOT clearly taxable (no explicit statute). NO doc " +
      "fee cap (dealers charge $400-$900+, avg $600-$700). Rebates (manufacturer AND dealer) reduce " +
      "sale price before tax (favorable). Separate personal property tax system (semi-annual bills, " +
      "varies by locality) creates additional ongoing costs. Reciprocity available with 12-month " +
      "window (exempt if owned > 12 months, credit if owned < 12 months with proof). Minimum tax $75.",

    // Virginia-specific configuration details
    stateRate: 4.15, // Flat statewide rate, no local add-ons for motor vehicles
    rateEffectiveDate: "2016-07-01", // Rate has been 4.15% since July 1, 2016
    minimumTax: 75, // Minimum tax regardless of vehicle value
    docFeeCapAmount: null, // NO cap on documentation fees in Virginia
    docFeeAverage: 650, // Average doc fee charged by VA dealers (2025)
    docFeeRange: [400, 900], // Typical range observed in Virginia
    docFeeMedian: 899, // Median doc fee (tied with FL for highest, 2025 data)
    tradeInCreditAllowed: false, // NO trade-in credit in VA (most restrictive policy)
    serviceContractTaxRate: 0.5, // 50% of contract price is taxable (unique VA rule)
    leasePersonalPropertyTax: true, // Leased vehicles subject to separate annual PP tax
    personalPropertyTaxDescription:
      "Semi-annual tax based on vehicle value (assessed Jan 1), varies by locality",

    /**
     * Trade-In Policy Explanation (One of the Strictest in the US)
     *
     * Virginia is one of only 7 states that provide NO trade-in credit for
     * motor vehicle sales tax purposes. This policy significantly increases
     * the tax burden compared to the 44 states that allow full or partial
     * trade-in credits.
     *
     * States with FULL trade-in credit (44 states):
     * - New York, Florida, Texas, California (purchases), Pennsylvania,
     *   Illinois, Ohio, Michigan (capped at $10K), etc.
     * - Trade-in value reduces taxable base dollar-for-dollar
     *
     * States with NO trade-in credit (7 states):
     * - Virginia, Hawaii, California (leases only), District of Columbia,
     *   Kentucky, Maryland, and a few others
     * - Full vehicle price is taxable regardless of trade-in
     *
     * Virginia's "no trade-in credit" policy applies to BOTH retail purchases
     * AND leases, making it consistently restrictive across transaction types.
     *
     * Economic Impact Example:
     *   $40,000 vehicle purchase with $10,000 trade-in
     *
     *   In Florida (trade credit, 6% rate):
     *     Taxable: $30,000 (after trade credit)
     *     Tax: $30,000 × 6% = $1,800
     *
     *   In Virginia (no trade credit, 4.15% rate):
     *     Taxable: $40,000 (NO trade credit)
     *     Tax: $40,000 × 4.15% = $1,660
     *
     *   Despite Virginia's lower tax rate, the lack of trade-in credit
     *   means customers pay tax on $10,000 more vehicle value.
     *
     * Consumer Strategy:
     * Virginia consumers with trade-ins should consider:
     * 1. Selling vehicle privately (may net more than trade-in allowance)
     * 2. Negotiating lower purchase price (rebates reduce tax, trade-ins don't)
     * 3. Using manufacturer rebates (reduce taxable base)
     * 4. Comparing total out-of-pocket cost across different transaction structures
     */
    tradeInPolicyExplanation:
      "Virginia does NOT allow trade-in value to reduce taxable amount on either retail " +
      "purchases or leases per VA Code § 58.1-2401. You pay sales tax on the FULL vehicle " +
      "price. Trade-ins only reduce your out-of-pocket cost (lower financed amount), NOT your " +
      "tax liability. This is one of the MOST RESTRICTIVE trade-in policies in the US (only 7 " +
      "states have no trade-in credit). Economic impact: On a $40,000 vehicle with $10,000 trade, " +
      "you pay $415 more tax in VA vs. states with full trade credit (at VA's 4.15% rate). " +
      "Consumer tip: Consider selling privately or maximizing manufacturer rebates (which DO reduce tax).",

    /**
     * Lease Taxation Explanation (Unique Virginia Structure)
     *
     * Virginia's lease taxation is a FULL_UPFRONT method that differs from
     * both monthly-payment-tax states and full-lease-obligation states.
     *
     * THREE COMMON LEASE TAX METHODS:
     *
     * 1. MONTHLY PAYMENT TAX (Indiana, Ohio, Michigan):
     *    - Tax applied to each monthly payment as it's made
     *    - Lower upfront cost (no tax at signing)
     *    - Total tax spread over lease term
     *    - Example: $500/month × 7% = $35/month tax
     *
     * 2. FULL LEASE OBLIGATION (New Jersey, New York):
     *    - Tax applied to total of all payments PLUS residual value
     *    - Very high upfront tax at signing
     *    - Most expensive lease taxation method
     *    - Example: ($500/mo × 36) + $20K residual = tax on $38K
     *
     * 3. CAPITALIZED COST (VIRGINIA):
     *    - Tax applied to adjusted capitalized cost at signing
     *    - One-time upfront payment (middle ground)
     *    - More expensive at signing than monthly-tax states
     *    - Less expensive than full-obligation states
     *    - Example: $40K cap cost × 4.15% = $1,660 upfront
     *
     * VIRGINIA'S APPROACH (Detailed):
     *
     * Step 1: Calculate Adjusted Capitalized Cost
     *   Gross Cap Cost = MSRP/Negotiated Price + Doc Fee + Accessories
     *   Minus Cap Reductions = Cash Down + Rebates + Trade Equity
     *   = Adjusted Capitalized Cost
     *
     * Step 2: Apply 4.15% Tax ONCE at Signing
     *   Upfront Tax = Adjusted Cap Cost × 4.15%
     *
     * Step 3: Monthly Payments (NO ADDITIONAL TAX)
     *   Monthly payments are NOT subject to sales tax
     *
     * Step 4: Separate Personal Property Tax (Semi-Annual)
     *   Billed by locality twice per year (May 5 and October 5)
     *   Based on vehicle value as of January 1
     *   Rates vary by county/city ($3-$5 per $100 typical)
     *
     * COMPARISON EXAMPLE (36-month lease, $45,000 cap cost):
     *
     * INDIANA (Monthly Tax):
     *   Monthly Payment: $500
     *   Monthly Tax: $500 × 7% = $35
     *   Total Tax Over Term: $35 × 36 = $1,260
     *   Due at Signing: $0 tax
     *
     * VIRGINIA (Upfront Tax):
     *   Adjusted Cap Cost: $45,000
     *   Upfront Tax: $45,000 × 4.15% = $1,867.50
     *   Monthly Tax: $0
     *   Due at Signing: $1,867.50 tax
     *   Personal Property Tax: ~$1,500-$2,000/year (separate)
     *
     * NEW JERSEY (Full Obligation):
     *   Total Payments: $500 × 36 = $18,000
     *   Residual Value: $25,000
     *   Upfront Tax: ($18,000 + $25,000) × 6.625% = $2,848.75
     *   Monthly Tax: $0
     *   Due at Signing: $2,848.75 tax
     *
     * ECONOMIC IMPACT:
     * Virginia's upfront cap cost taxation creates higher due-at-signing
     * amounts compared to monthly-payment-tax states, which can be a barrier
     * for consumers with limited cash at signing. However, it results in
     * lower total tax than full-obligation states.
     *
     * Combined with semi-annual personal property tax bills, Virginia's
     * total tax burden on leases is among the highest in the nation when
     * considering both sales tax and personal property tax over the lease term.
     *
     * LEASE END BUYOUT:
     * If you purchase the leased vehicle at lease end, you must pay sales tax
     * on the residual value purchase. However, if you already paid the upfront
     * sales tax when you leased the vehicle, you may be exempt from paying tax
     * again (confirm current exemption rules with VA DMV).
     */
    leaseTaxationExplanation:
      "Virginia taxes leases by applying 4.15% to the adjusted capitalized cost at signing " +
      "(FULL_UPFRONT method). This is a ONE-TIME upfront payment, NOT spread into monthly payments. " +
      "Cap cost reductions (down payment, rebates, trade equity) reduce the taxable base. Trade-ins " +
      "provide NO separate tax credit beyond reducing cap cost. This creates HIGHER due-at-signing " +
      "amounts vs. monthly-payment-tax states (IN, OH) but LOWER total tax vs. full-obligation states " +
      "(NJ, NY). Additionally, leased vehicles are subject to SEPARATE semi-annual personal property " +
      "tax (varies by locality, typically $3-$5 per $100 of assessed value). This 'double taxation' " +
      "structure (upfront sales tax + ongoing PP tax) makes Virginia one of the MORE EXPENSIVE states " +
      "for leasing from a total tax perspective. Minimum tax $75 applies if calculated tax is lower.",

    /**
     * Service Contract Taxation Explanation (Unique 50% Rule)
     *
     * Virginia uses a unique "50% rule" for service contract (extended warranty)
     * taxation that recognizes the dual nature of these contracts.
     *
     * LEGAL BASIS:
     * Virginia Administrative Code 23VAC10-210-910:
     * "Maintenance contracts providing both repair or replacement parts and
     * repair labor are subject to tax upon one-half (50%) of the total charge
     * for such contracts."
     *
     * REASONING:
     * Virginia recognizes that maintenance/service contracts include BOTH:
     * 1. Tangible personal property (parts) - TAXABLE
     * 2. Services (labor) - NOT TAXABLE
     *
     * Rather than requiring dealers to track and allocate each repair's
     * parts vs. labor split, Virginia simplifies by deeming all parts+labor
     * contracts to be "one-half parts, one-half labor."
     *
     * TAX TREATMENT BY CONTRACT TYPE:
     *
     * Labor-Only Contracts:
     * - Tax: 0% (services are exempt from sales tax)
     * - Example: $1,000 labor-only contract → $0 tax
     *
     * Parts-Only Contracts:
     * - Tax: 100% (tangible personal property fully taxable)
     * - Example: $1,500 parts-only contract → $1,500 × 4.15% = $62.25 tax
     *
     * Parts + Labor Contracts (MOST COMMON):
     * - Tax: 50% of contract price
     * - Example: $2,500 parts+labor contract → ($2,500 × 50%) × 4.15% = $51.88 tax
     *
     * Insurance Company Warranties:
     * - Tax: 0% (NOT subject to sales tax)
     * - Reasoning: Regulated by State Corporation Commission Bureau of Insurance
     * - Considered insurance transactions, not retail sales
     * - Must be issued by licensed insurance company
     *
     * IMPLEMENTATION EXAMPLE:
     *
     * Scenario 1 (Retail Purchase with VSC):
     *   Vehicle Price: $35,000
     *   Doc Fee: $650
     *   VSC (parts+labor): $2,800
     *   Manufacturer Rebate: $3,000
     *
     *   Taxable Vehicle Base: $35,000 + $650 - $3,000 = $32,650
     *   Taxable VSC Base: $2,800 × 50% = $1,400
     *   Total Taxable: $32,650 + $1,400 = $34,050
     *   Sales Tax: $34,050 × 4.15% = $1,413.08
     *
     * Scenario 2 (Lease with Capitalized VSC):
     *   Gross Cap Cost: $45,000
     *   VSC Capitalized: $3,000 (parts+labor)
     *   Cap Reductions: $5,000
     *
     *   Adjusted Cap Cost: $45,000 - $5,000 = $40,000
     *   Taxable VSC: $3,000 × 50% = $1,500
     *   Total Taxable: $40,000 + $1,500 = $41,500
     *   Upfront Tax: $41,500 × 4.15% = $1,722.25
     *
     * COMPARISON TO OTHER STATES:
     *
     * States that DON'T tax VSCs:
     * - Alabama, Georgia, Kentucky, Louisiana
     * - Service contracts fully exempt
     * - Example: $2,500 VSC → $0 tax
     *
     * States that tax VSCs at 100%:
     * - Connecticut (6.35%), Nevada (varies), Oregon (0%)
     * - Full contract price is taxable
     * - Example: $2,500 VSC × 6.35% = $158.75 tax (CT)
     *
     * Virginia (50% rule):
     * - Middle ground approach
     * - Example: $2,500 VSC × 50% × 4.15% = $51.88 tax
     *
     * CONSUMER IMPACT:
     * The 50% rule reduces the tax burden on service contracts compared to
     * states that tax them at 100%, making backend products slightly more
     * affordable in Virginia.
     *
     * However, consumers should still compare the total cost (contract price
     * + tax) and evaluate whether the coverage provides value for their
     * specific situation.
     */
    serviceContractExplanation:
      "Service contracts (extended warranties) that include both parts AND labor are taxed on " +
      "50% of the contract price per VA regulation 23VAC10-210-910. Virginia's unique '50% rule' " +
      "recognizes the mixed nature of these contracts: taxable parts (tangible property) and " +
      "non-taxable labor (services). Tax treatment: Labor-only contracts 0% taxable, parts-only " +
      "contracts 100% taxable, parts+labor contracts 50% taxable. Extended warranties issued by " +
      "insurance companies regulated by the State Corporation Commission Bureau of Insurance are " +
      "considered insurance transactions and are NOT subject to sales tax. This 50% rule applies " +
      "to both retail purchases and leases (if VSC is capitalized into lease). Example: $2,500 " +
      "VSC (parts+labor) → ($2,500 × 50%) × 4.15% = $51.88 tax.",

    /**
     * Reciprocity Explanation (12-Month Window System)
     *
     * Virginia's reciprocity rules provide a balanced approach with a
     * 12-month ownership window that determines tax liability.
     *
     * TWO RECIPROCITY PATHS:
     *
     * PATH 1: OWNED > 12 MONTHS (Exempt)
     * - If you owned the vehicle for MORE than 12 months before registering
     *   in Virginia, you are EXEMPT from Virginia motor vehicle sales tax
     * - No tax owed regardless of whether you paid tax in another state
     * - Must provide proof of ownership duration (title, registration history)
     * - Applies to new residents moving to Virginia with existing vehicles
     *
     * PATH 2: OWNED ≤ 12 MONTHS (Credit for Tax Paid)
     * - If you owned the vehicle for 12 months or LESS before registering
     *   in Virginia, you owe Virginia tax BUT receive credit for tax paid elsewhere
     * - Credit based on actual tax paid to other state
     * - Credit capped at Virginia's 4.15% rate (no refund if paid more)
     * - Must provide PROOF of tax payment (receipt, invoice, bill of sale)
     * - If no tax paid elsewhere, full Virginia tax is owed
     *
     * DETAILED SCENARIOS:
     *
     * Scenario 1: New Resident (Owned > 12 Months)
     *   - Lived in New York for 3 years
     *   - Vehicle registered in your name in NY
     *   - Move to Virginia and transfer registration
     *   - Result: EXEMPT from VA tax (no tax owed)
     *   - Reasoning: Established ownership > 12 months
     *
     * Scenario 2: Recent Out-of-State Purchase (Tax Paid)
     *   - Purchased vehicle in Maryland 6 months ago for $40,000
     *   - Paid Maryland tax: 6% = $2,400
     *   - Move to Virginia and register
     *   - VA tax would be: $40,000 × 4.15% = $1,660
     *   - Credit: $1,660 (capped at VA rate)
     *   - Additional VA tax owed: $0
     *   - Note: No refund for extra $740 paid to MD
     *
     * Scenario 3: Recent Out-of-State Purchase (Lower Tax)
     *   - Purchased vehicle in North Carolina 3 months ago for $40,000
     *   - Paid NC tax: 3% = $1,200
     *   - Register in Virginia
     *   - VA tax would be: $40,000 × 4.15% = $1,660
     *   - Credit: $1,200 (actual amount paid)
     *   - Additional VA tax owed: $460
     *   - Must pay difference at VA DMV
     *
     * Scenario 4: No-Sales-Tax State Purchase
     *   - Purchased vehicle in Delaware (no sales tax) 8 months ago for $40,000
     *   - Paid DE tax: $0 (DE has no sales tax)
     *   - Register in Virginia
     *   - VA tax would be: $40,000 × 4.15% = $1,660
     *   - Credit: $0 (no tax paid)
     *   - Additional VA tax owed: $1,660 (full VA tax)
     *
     * Scenario 5: Private Party Purchase Out-of-State
     *   - Purchased vehicle from private seller in PA 5 months ago
     *   - Paid PA use tax: $40,000 × 6% = $2,400
     *   - Register in Virginia
     *   - VA tax would be: $40,000 × 4.15% = $1,660
     *   - Credit: $1,660 (capped at VA rate)
     *   - Additional VA tax owed: $0
     *
     * DOCUMENTATION REQUIRED:
     *
     * For 12-Month Exemption:
     * - Valid assignable title from another state
     * - Registration history showing ownership duration
     * - Proof of original purchase date
     *
     * For Tax Credit (< 12 Months):
     * - Purchase invoice showing vehicle price
     * - Receipt or proof of sales/use tax paid to other state
     * - Date of original purchase
     * - Valid assignable title from other state
     *
     * Submit all documentation to Virginia DMV at time of registration.
     *
     * POLICY RATIONALE:
     *
     * The 12-month window balances two competing interests:
     *
     * 1. FAIRNESS TO NEW RESIDENTS:
     *    - People moving to Virginia with established vehicle ownership
     *      shouldn't pay tax again on vehicles they've owned for years
     *    - 12-month exemption protects long-term vehicle owners
     *
     * 2. PROTECTING STATE TAX BASE:
     *    - Recent purchases (< 12 months) may represent tax avoidance
     *    - Requiring VA tax (with credit for tax paid elsewhere) ensures
     *      Virginia collects tax on vehicles primarily used in Virginia
     *
     * SPECIAL EXEMPTIONS (Beyond Reciprocity):
     *
     * Active-Duty Military:
     * - Military personnel stationed in Virginia who maintain legal residence
     *   in another state may be exempt under Servicemembers Civil Relief Act
     * - Must maintain home-state registration
     * - Consult VA DMV for current military exemption requirements
     *
     * Students:
     * - Students attending Virginia schools who maintain legal residence in
     *   another state may qualify for exemptions
     * - Vehicle must be titled and registered in home state
     * - Temporary presence in Virginia for education purposes
     *
     * Gift Transfers:
     * - Vehicles gifted between spouses, parents and children, or other
     *   immediate family members may be exempt under VA Code § 58.1-2403
     * - Separate from reciprocity rules
     * - Must provide documentation of gift (affidavit, title notation)
     *
     * COMPARISON TO OTHER STATES:
     *
     * Full Reciprocity States (Like Virginia):
     * - Alabama, Connecticut, Florida, Georgia, Illinois, Indiana, etc.
     * - Provide credit for tax paid elsewhere (capped at home state rate)
     * - Prevents double taxation
     *
     * Limited Reciprocity States:
     * - California (military only)
     * - Kentucky (pays full state tax regardless of prior payment)
     * - Less favorable for consumers
     *
     * Virginia's Advantage:
     * - 12-month exemption for established ownership (very favorable)
     * - Credit for recent purchases with proof (fair and balanced)
     * - Clear documentation requirements (reduces disputes)
     */
    reciprocityExplanation:
      "Virginia grants sales tax credit for vehicles purchased out-of-state using a 12-MONTH " +
      "WINDOW SYSTEM per VA Code § 58.1-2403. TWO PATHS: (1) If owned > 12 months before VA " +
      "registration: COMPLETELY EXEMPT from VA tax (no tax owed regardless of prior payment). " +
      "(2) If owned ≤ 12 months: Credit for tax paid elsewhere (must provide PROOF), capped at " +
      "VA's 4.15% rate. If no tax paid elsewhere, full VA tax is owed. This policy prevents double " +
      "taxation for new residents with established ownership while protecting state tax base for " +
      "recent purchases. Applies equally to retail purchases and leases. Example: New resident with " +
      "3-year-old vehicle pays $0 VA tax. Recent out-of-state buyer (6 months ago) gets credit for " +
      "tax paid, pays only difference if VA rate is higher. Documentation required: title, purchase " +
      "invoice, tax receipt. Special exemptions available for military (SCRA) and students (separate " +
      "rules). Virginia's reciprocity is among the most generous due to 12-month exemption window.",

    /**
     * Personal Property Tax Overview (Separate from Sales Tax)
     *
     * Virginia has a unique DUAL TAX SYSTEM for vehicles:
     * 1. Motor Vehicle Sales Tax (4.15% one-time at purchase/lease signing)
     * 2. Personal Property Tax (annual ongoing tax based on vehicle value)
     *
     * These are COMPLETELY SEPARATE tax systems with different purposes,
     * administration, and payment schedules.
     *
     * PERSONAL PROPERTY TAX DETAILS:
     *
     * What It Is:
     * - Annual tax on the VALUE of tangible personal property (vehicles)
     * - Levied and collected by LOCAL governments (counties and cities)
     * - Based on vehicle's assessed value as of January 1 each year
     * - Applies to ALL vehicles (owned AND leased)
     * - NOT part of the sales tax system
     *
     * Tax Rates:
     * - Vary by locality (each county and city sets its own rate)
     * - Typically expressed as dollars per $100 of assessed value
     * - Common range: $3.00 to $5.00 per $100 (3.0% to 5.0%)
     *
     * Examples by Locality:
     * - Fairfax County: $4.57 per $100 (4.57%)
     * - Alexandria: $5.00 per $100 (5.0%)
     * - Richmond: $3.70 per $100 (3.7%)
     * - Virginia Beach: $4.00 per $100 (4.0%)
     * - Arlington: $5.00 per $100 (5.0%)
     * - Loudoun County: $4.20 per $100 (4.2%)
     *
     * Valuation:
     * - Based on NADA (National Automobile Dealers Association) values
     * - Or other recognized pricing guides
     * - Assessed as of January 1 each year
     * - Depreciates annually following standard depreciation schedules
     * - Clean Loan Value typically used for personal-use vehicles
     *
     * Billing Schedule:
     * - Semi-annual billing in most localities
     * - First Bill Due: May 5 (for Jan 1 - June 30 value)
     * - Second Bill Due: October 5 (for July 1 - Dec 31 value)
     * - Some localities offer annual billing option
     *
     * Virginia State Tax Relief:
     * - Commonwealth subsidizes portion of personal property tax
     * - Applies to first $20,000 of assessed value
     * - For personal-use vehicles ONLY (not business use)
     * - Subsidy percentage varies by locality and vehicle value
     * - Reduces effective tax rate for most personal vehicles
     *
     * LEASED VEHICLES:
     *
     * Who Pays:
     * - Lessee (customer) typically pays personal property tax
     * - Some lease agreements include PP tax in monthly payment
     * - Others require customer to pay PP tax directly to locality
     * - Check your lease agreement for specific terms
     *
     * Valuation:
     * - Based on full vehicle value (not just equity portion)
     * - Assessed same as owned vehicles using NADA values
     * - Depreciates annually during lease term
     *
     * Example (Leased Vehicle in Fairfax County):
     *
     * Year 1:
     *   Assessed Value (Jan 1): $45,000
     *   Tax Rate: $4.57 per $100
     *   Gross Tax: $45,000 × 4.57% = $2,056.50/year
     *   State Relief: ~$500 (estimated, on first $20K)
     *   Net Tax: ~$1,556.50/year
     *   Semi-Annual Bills: $778.25 (May 5) + $778.25 (Oct 5)
     *
     * Year 2:
     *   Assessed Value (Jan 1): $38,000 (depreciated ~15%)
     *   Gross Tax: $38,000 × 4.57% = $1,736.60/year
     *   State Relief: ~$500 (estimated)
     *   Net Tax: ~$1,236.60/year
     *   Semi-Annual Bills: $618.30 (May 5) + $618.30 (Oct 5)
     *
     * Year 3:
     *   Assessed Value (Jan 1): $32,000 (further depreciated)
     *   Gross Tax: $32,000 × 4.57% = $1,462.40/year
     *   State Relief: ~$500 (estimated)
     *   Net Tax: ~$962.40/year
     *   Semi-Annual Bills: $481.20 (May 5) + $481.20 (Oct 5)
     *
     * Total PP Tax Over 36-Month Lease: ~$3,755
     *
     * COMBINED TAX BURDEN EXAMPLE:
     *
     * $45,000 Vehicle Lease (Fairfax County, 36 months):
     *
     * At Signing (Sales Tax):
     *   Sales Tax: $45,000 × 4.15% = $1,867.50 (one-time)
     *
     * During Lease (Personal Property Tax):
     *   Year 1: ~$1,556.50
     *   Year 2: ~$1,236.60
     *   Year 3: ~$962.40
     *   Subtotal: ~$3,755.50
     *
     * TOTAL TAX OVER LEASE: $1,867.50 + $3,755.50 = $5,623
     *
     * This does NOT include monthly payments, just TAX burden.
     *
     * COMPARISON TO OWNED VEHICLES:
     *
     * Owned vehicles also pay personal property tax at the same rates.
     * The tax continues annually as long as you own the vehicle and it's
     * registered in Virginia.
     *
     * Example (Owned Vehicle Depreciation):
     *   Purchase Price: $40,000
     *   Year 1 Assessment: $40,000 → Tax ~$1,828 (Fairfax)
     *   Year 2 Assessment: $34,000 → Tax ~$1,555
     *   Year 3 Assessment: $29,000 → Tax ~$1,326
     *   Year 4 Assessment: $25,000 → Tax ~$1,143
     *   Year 5 Assessment: $22,000 → Tax ~$1,005
     *
     * WHY THE "DOUBLE TAXATION" FEEL:
     *
     * Virginia vehicle owners/lessees pay TWO separate vehicle taxes:
     * 1. Sales tax (one-time at purchase/lease signing)
     * 2. Personal property tax (annual ongoing)
     *
     * This creates a perception of "double taxation" because:
     * - You pay 4.15% upfront when you acquire the vehicle
     * - Then you pay 3-5% annually for as long as you have it
     *
     * Most states only have sales tax OR personal property tax, not both.
     *
     * States with BOTH (like Virginia):
     * - Virginia, Connecticut, some others
     * - Higher total tax burden
     *
     * States with ONLY Sales Tax:
     * - Most states (Florida, Texas, California, etc.)
     * - One-time tax at purchase, no annual tax
     *
     * States with ONLY Personal Property Tax:
     * - Very few (some use excise tax instead of sales tax)
     *
     * PAYMENT AND PENALTIES:
     *
     * Payment Methods:
     * - Online (most localities have online payment portals)
     * - Mail (check to local treasurer)
     * - In-person (treasurer's office)
     *
     * Late Payment Penalties:
     * - 10% penalty if not paid by due date (May 5 or Oct 5)
     * - Interest accrues monthly (typically 10% annual rate)
     * - Vehicle registration may be suspended for non-payment
     * - Liens placed on property for extended non-payment
     *
     * EXEMPTIONS AND RELIEF:
     *
     * State Tax Relief:
     * - Automatic subsidy on first $20,000 of value (personal use)
     * - No application required
     * - Reduces effective tax rate
     *
     * Senior Citizens:
     * - Some localities offer additional relief for seniors
     * - Typically 65+ with income limits
     * - Check with your local treasurer's office
     *
     * Disabled Veterans:
     * - 100% disabled veterans may qualify for exemption
     * - Partial exemptions for partial disability
     * - Requires application and proof of disability rating
     *
     * Business Vehicles:
     * - Different classification and rates
     * - Not eligible for state tax relief
     * - May have different assessment methods
     */
    personalPropertyTaxOverview:
      "Virginia has a DUAL TAX SYSTEM for vehicles: (1) Motor Vehicle Sales Tax (4.15% one-time " +
      "at purchase/lease signing, administered by DMV), and (2) Personal Property Tax (annual ongoing " +
      "tax based on vehicle value, administered by local governments). Personal Property Tax: " +
      "Semi-annual billing (due May 5 and Oct 5), assessed as of Jan 1 each year using NADA values, " +
      "rates vary by locality ($3-$5 per $100 typical, or 3-5% of assessed value), applies to BOTH " +
      "owned AND leased vehicles. Commonwealth provides state tax relief on first $20,000 of value " +
      "for personal-use vehicles. Example (Fairfax County, 4.57% rate): $45,000 leased vehicle → " +
      "Year 1: ~$1,556 PP tax, Year 2: ~$1,237, Year 3: ~$962, Total over 36-month lease: ~$3,755. " +
      "Combined with upfront sales tax ($1,867.50), total tax burden is ~$5,623 over lease term. " +
      "This 'double taxation' structure (one-time sales tax + annual property tax) makes Virginia " +
      "one of the higher-tax states for vehicles. Personal property tax is SEPARATE from sales tax " +
      "system and should be accounted for in total cost of ownership/leasing calculations.",

    /**
     * Common Dealership Fees (Reference for Typical Transactions)
     *
     * These are typical fees charged by Virginia dealerships. Only some have
     * specific tax treatment defined in this configuration.
     *
     * DOCUMENTATION FEE:
     * - Range: $400 to $900+ (no statutory cap)
     * - Average: $600-$700 (2025 data)
     * - Median: $899 (tied with FL for highest median)
     * - Tax Treatment: TAXABLE at 4.15%
     * - Purpose: Processing paperwork, DMV filings, title work
     * - Non-negotiable (dealer must charge same to all customers)
     *
     * TITLE FEE:
     * - Typical: ~$75 (DMV fee passed through)
     * - Tax Treatment: NOT taxable (government fee)
     * - Purpose: State cost to issue title certificate
     *
     * REGISTRATION FEE:
     * - Varies by vehicle type and weight
     * - Passenger cars: ~$40-$50 annual
     * - Light trucks: ~$50-$60 annual
     * - Tax Treatment: NOT taxable (government fee)
     *
     * PLATE FEE:
     * - Standard plates: $10
     * - Personalized plates: $10 + annual $10 fee
     * - Special plates: $10 + varies by plate type
     * - Tax Treatment: NOT taxable (government fee)
     *
     * SERVICE CONTRACT (VSC):
     * - Range: $1,000 to $3,000+ (varies by coverage and term)
     * - Typical: $2,000-$2,500 for 5-year/60K-mile coverage
     * - Tax Treatment: 50% TAXABLE if parts+labor contract
     * - Example: $2,500 VSC → ($2,500 × 50%) × 4.15% = $51.88 tax
     *
     * GAP WAIVER:
     * - Range: $500 to $900
     * - Typical: $600-$700
     * - Tax Treatment: NOT taxable (no clear statutory basis)
     * - Purpose: Covers gap between insurance payout and loan balance
     *
     * ACCESSORIES (Dealer-Installed):
     * - Paint/fabric protection: $300-$800
     * - Window tinting: $200-$500
     * - Remote starter: $300-$600
     * - Running boards: $400-$800
     * - Roof rack: $300-$700
     * - Tax Treatment: TAXABLE at 4.15% (included in sale price)
     *
     * NITROGEN TIRE FILL:
     * - Typical: $50-$100
     * - Tax Treatment: TAXABLE (service + product)
     * - Value: Questionable (regular air is 78% nitrogen already)
     *
     * ANTI-THEFT ETCHING:
     * - Typical: $200-$400
     * - Tax Treatment: TAXABLE (service + materials)
     * - VIN etched on windows for theft deterrence
     *
     * TIRE & WHEEL PROTECTION:
     * - Range: $500-$1,200
     * - Tax Treatment: If structured as service contract, 50% taxable
     * - Covers road hazard damage to tires and wheels
     *
     * DENT & DING PROTECTION:
     * - Range: $400-$900
     * - Tax Treatment: If structured as service contract, 50% taxable
     * - Covers minor cosmetic repairs
     *
     * KEY REPLACEMENT COVERAGE:
     * - Range: $300-$600
     * - Tax Treatment: If structured as service contract, 50% taxable
     * - Covers lost or damaged key fobs (which can cost $400+ to replace)
     *
     * MARKET ADJUSTMENT (DEALER MARKUP):
     * - Varies wildly based on market conditions
     * - On high-demand vehicles: $5,000 to $20,000+
     * - Tax Treatment: TAXABLE (part of vehicle sale price)
     * - Negotiable (unlike doc fee)
     *
     * TYPICAL TOTAL FEES (Well-Equipped Deal):
     *   Vehicle Price: $40,000
     *   Doc Fee: $695
     *   Title Fee: $75
     *   Registration: $45
     *   Service Contract: $2,500
     *   GAP: $695
     *   Accessories: $1,200
     *   Total Fees: $5,210
     *
     *   Taxable Amount:
     *     Vehicle + Doc + Accessories: $40,000 + $695 + $1,200 = $41,895
     *     Service Contract (50%): $2,500 × 50% = $1,250
     *     GAP: $0 (not taxed)
     *     Total Taxable: $43,145
     *
     *   Sales Tax: $43,145 × 4.15% = $1,790.52
     *
     *   Total Out-of-Pocket (before trade/down):
     *     $40,000 + $5,210 + $1,790.52 = $46,000.52
     */
    commonDealershipFees: {
      docFee: {
        range: [400, 900],
        average: 650,
        median: 899,
        cap: null,
        taxable: true,
        notes:
          "NO STATUTORY CAP in Virginia. Among highest and most variable in nation. " +
          "Dealers must charge same doc fee to all customers (non-negotiable).",
      },
      title: {
        typical: 75,
        taxable: false,
        notes: "DMV fee for title certificate processing. Government fee, not dealer markup.",
      },
      registration: {
        range: [40, 60],
        taxable: false,
        notes: "Varies by vehicle type and weight. Government fee, not dealer markup.",
      },
      serviceContract: {
        range: [1000, 3000],
        typical: 2000,
        taxablePercent: 50,
        notes:
          "Extended warranty coverage. If parts+labor contract, 50% of price is taxable " +
          "per 23VAC10-210-910. Insurance company warranties NOT taxable.",
      },
      gap: {
        range: [500, 900],
        typical: 650,
        taxable: false,
        notes:
          "GAP waiver coverage. NOT clearly taxable (no explicit statute). Conservative " +
          "approach: not subject to sales tax.",
      },
      accessories: {
        taxable: true,
        taxRate: 4.15,
        notes:
          "All dealer-installed accessories, options, and add-ons are TAXABLE at 4.15% " +
          "as part of vehicle sale price per VA Code § 58.1-2401.",
      },
    },

    /**
     * Unique Virginia Features Summary
     */
    uniqueFeatures: [
      "NO TRADE-IN CREDIT on either retail or leases (one of 7 strictest states)",
      "Service contracts taxed at 50% (unique 'half parts, half labor' rule)",
      "Leases taxed FULLY UPFRONT on capitalized cost (not monthly payments)",
      "Flat 4.15% statewide motor vehicle rate (no local additions)",
      "Separate personal property tax system (semi-annual bills, varies by locality)",
      "Both manufacturer AND dealer rebates reduce taxable base (favorable)",
      "NO doc fee cap (dealers charge $400-$900+, among highest in nation)",
      "GAP waivers NOT clearly taxable (no explicit statute)",
      "Reciprocity with 12-month window (exempt if owned > 12 months)",
      "Minimum tax $75 regardless of vehicle value",
      "Motor vehicle tax SEPARATE from general retail sales tax system",
      "Dual tax burden for leases (upfront sales tax + annual property tax)",
    ],

    /**
     * Implementation Notes for Tax Engine
     */
    implementationNotes: [
      "Trade-in value MUST NOT reduce taxable base for either retail or lease calculations",
      "Service contract taxable amount is contract_price × 50% for parts+labor contracts",
      "Lease tax calculated as adjusted_cap_cost × 4.15% paid once at signing",
      "GAP waivers should NOT be taxed (conservative approach, no explicit statute)",
      "Doc fee has NO cap validation (dealers can charge any amount)",
      "Rebates (both manufacturer and dealer) reduce sale price before tax calculation",
      "Minimum tax check: if calculated_tax < $75, then tax_owed = $75",
      "Personal property tax is OUT OF SCOPE (separate local tax system, not sales tax)",
      "Reciprocity credit capped at VA rate (4.15% × vehicle_price), requires proof",
      "Negative equity is NOT taxable for either retail purchases or leases",
    ],
  },
};

export default US_VA;
