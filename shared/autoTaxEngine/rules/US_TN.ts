import type { TaxRulesConfig } from "../types";

/**
 * TENNESSEE TAX RULES
 *
 * Researched: 2025-11-14
 * Version: 2
 *
 * KEY FACTS:
 * - State sales tax: 7% (one of the highest state rates in the US)
 * - Local rates: Vary by jurisdiction (2.25% - 2.75%)
 * - Combined rate range: 9.25% - 9.75% (among highest in nation)
 * - Trade-in credit: FULL (deducted from sale price before tax calculation)
 * - SINGLE ARTICLE TAX CAP: State portion capped at $1,600 (≤$1,600 vehicles) or $3,200 (>$1,600 vehicles)
 * - Doc fee: TAXABLE, capped at $495 (statutory limit effective July 1, 2019)
 * - Manufacturer rebates: NOT taxable (reduce sale price before tax)
 * - Dealer rebates/incentive payments: Credit available (§ 67-6-341)
 * - Service contracts (VSC): TAXABLE (unusual - most states exempt)
 * - GAP insurance: NOT taxable (insurance product exempt)
 * - Lease taxation: MONTHLY (tax on each payment)
 * - Reciprocity: CREDIT_UP_TO_STATE_RATE (credit for taxes paid elsewhere, capped at TN rate)
 *
 * UNIQUE TENNESSEE FEATURES:
 * 1. SINGLE ARTICLE TAX CAP (TCA § 67-6-331):
 *    - State portion only (7%) is capped based on vehicle price
 *    - Vehicles ≤ $1,600: State tax capped at $112 ($1,600 × 7%)
 *    - Vehicles > $1,600: State tax capped at $224 ($3,200 × 7%)
 *    - Local taxes (2.25%-2.75%) are NOT capped
 *    - Dramatically reduces tax on expensive vehicles
 *
 * 2. VSC TAXABILITY:
 *    - Tennessee is one of FEW states that taxes warranty/service contracts
 *    - TCA § 67-6-208: Warranty contracts are subject to sales tax
 *    - Taxed at time of sale at full sales tax rate
 *    - Subsequent repairs under warranty are NOT taxed
 *
 * 3. GAP INSURANCE NOT TAXABLE:
 *    - GAP is treated as insurance and exempt from sales tax
 *    - Different treatment than VSC (which is taxable)
 *
 * 4. DEALER INCENTIVE PAYMENT CREDIT (TCA § 67-6-341):
 *    - Credit granted for manufacturer incentive payments to dealer
 *    - Applies when incentive requires price reduction without using manufacturer's coupon
 *    - Tax owed on sale price LESS the incentive payment
 *    - Only applies to retail sales (not leases to leasing companies for resale)
 *
 * 5. DOC FEE CAP:
 *    - Statutory cap of $495 (TCA § 55-3-122)
 *    - Increased from previous cap effective July 1, 2019
 *    - Doc fee is taxable at full sales tax rate
 *
 * 6. NO VEHICLE PROPERTY TAX:
 *    - Tennessee does not have annual vehicle property tax
 *    - Replaced by county wheel tax (annual registration tax, $50-$100+ varies by county)
 *    - Wheel tax is NOT subject to sales tax
 *
 * TAX CALCULATION FORMULA (RETAIL):
 * Taxable Base = Vehicle Price + Accessories + Doc Fee - Trade-In - Manufacturer Rebates
 * State Tax = MIN(Taxable Base × 7%, Cap Amount)
 *   where Cap Amount = $112 if Taxable Base ≤ $1,600, else $224
 * Local Tax = Taxable Base × Local Rate (NO cap)
 * Total Tax = State Tax + Local Tax
 * (VSC is taxed separately, GAP is NOT taxed, Title/Reg fees NOT included)
 *
 * Example 1 - Expensive Vehicle (Nashville - 7% state + 2.25% local = 9.25%):
 * $50,000 vehicle + $495 doc fee - $0 trade-in = $50,495 taxable base
 * State Tax: MIN($50,495 × 7%, $224) = $224 (capped)
 * Local Tax: $50,495 × 2.25% = $1,136.14 (NOT capped)
 * Total Tax: $224 + $1,136.14 = $1,360.14
 * (Without cap: $50,495 × 9.25% = $4,670.79 - savings of $3,310.65!)
 *
 * Example 2 - Mid-Price Vehicle with Trade (Memphis - 7% state + 2.75% local = 9.75%):
 * $30,000 vehicle + $495 doc fee - $10,000 trade-in = $20,495 taxable base
 * State Tax: MIN($20,495 × 7%, $224) = $224 (capped)
 * Local Tax: $20,495 × 2.75% = $563.61 (NOT capped)
 * Total Tax: $224 + $563.61 = $787.61
 * (Without cap: $20,495 × 9.75% = $1,998.26 - savings of $1,210.65)
 *
 * Example 3 - Inexpensive Vehicle (≤ $1,600 cap applies):
 * $1,500 vehicle + $0 doc fee - $0 trade-in = $1,500 taxable base
 * State Tax: MIN($1,500 × 7%, $112) = $105 (under cap)
 * Local Tax: $1,500 × 2.25% = $33.75
 * Total Tax: $105 + $33.75 = $138.75
 * (Cap doesn't apply because $105 < $112)
 *
 * LEASE CALCULATION (MONTHLY):
 * Tennessee taxes leases on MONTHLY payment basis (TCA § 67-6-331)
 * Tax = Monthly Payment × (State Rate + Local Rate)
 * Single Article Cap applies to EACH PAYMENT:
 *   - Payment ≤ $1,600: State portion capped at $112
 *   - Payment > $1,600: State portion capped at $224
 * In practice, most lease payments are under $1,600/month, so cap rarely applies
 *
 * Cap cost reductions (cash, rebates, trade-in) reduce the monthly payment and thus
 * reduce the monthly tax, but are not themselves taxed upfront.
 *
 * Example Lease (Nashville - 9.25% total):
 * $450/month payment × 36 months
 * Monthly State Tax: MIN($450 × 7%, $112) = $31.50 (under cap)
 * Monthly Local Tax: $450 × 2.25% = $10.13
 * Total Monthly Tax: $41.63
 * Total Lease Tax: $41.63 × 36 = $1,498.68
 *
 * SOURCES:
 * - Tennessee Department of Revenue (TN DOR) - tn.gov/revenue
 * - Tennessee Code Annotated (TCA) § 67-6-331 (Single Article Tax Cap)
 * - TCA § 67-6-501 et seq. (Sales and Use Tax)
 * - TCA § 67-6-208 (Warranty/Service Contract Taxability)
 * - TCA § 67-6-341 (Credit for Motor Vehicle Incentive Payments)
 * - TCA § 55-3-122 (Documentation Fee Cap)
 * - TN DOR Sales and Use Tax Guide (December 2024)
 * - TN DOR County Clerk Sales and Use Tax Manual for Automobiles & Boats (August 2021)
 * - TN DOR Important Notice #19-14 (Doc Fee Cap Increase, July 2019)
 * - Tennessee Automobile Dealership Manual (December 2023)
 * - Tennessee County Clerk Association - Wheel Tax Information
 */
export const US_TN: TaxRulesConfig = {
  stateCode: "TN",
  version: 2,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL
   *
   * Tennessee allows FULL trade-in credit. The trade-in value is deducted
   * from the purchase price before calculating sales tax.
   *
   * Statutory Basis:
   * Tennessee allows trade-in credit for "like kind and character" vehicles.
   * The trade-in value reduces the taxable base for BOTH state and local taxes.
   *
   * Official Guidance (TN DOR County Clerk Manual):
   * "Before any credit may be allowed for trade-ins, the item traded must be
   * of a like kind and character of that purchased, and indicated as 'trade-in'
   * by model and serial number on an invoice given to the customer."
   *
   * No Proof of Prior Tax Required:
   * "The statute nor the rule requires that proof be given that tax was paid
   * previously, whether in Tennessee or in another state, on the traded-in
   * item in order to receive any trade-in credit."
   *
   * Example:
   *   Vehicle Price: $30,000
   *   Trade-In Value: $10,000
   *   Taxable Base: $20,000 (for both state and local tax)
   *   State Tax: MIN($20,000 × 7%, $224) = $224 (capped)
   *   Local Tax: $20,000 × 2.25% = $450
   *   Total Tax: $674
   *
   * Key Difference from Alabama:
   * Alabama only applies trade-in credit to state tax, NOT local taxes.
   * Tennessee applies trade-in credit to BOTH state and local taxes.
   *
   * Source: TN DOR County Clerk Sales and Use Tax Manual (August 2021)
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules: Manufacturer rebates reduce tax base, dealer incentives credit available
   *
   * MANUFACTURER REBATES:
   * Manufacturer rebates (customer cash, loyalty bonuses, conquest rebates, EV credits)
   * reduce the selling price and thus reduce the taxable amount.
   *
   * Tax Treatment:
   * - Customer pays: Selling Price - Manufacturer Rebate
   * - Tax calculated on: Selling Price - Manufacturer Rebate
   * - Rebate DOES reduce tax base
   *
   * Example:
   *   MSRP: $25,000
   *   Manufacturer Rebate: $2,000
   *   Selling Price: $23,000
   *   Tax Base: $23,000 (rebate reduces tax base)
   *   State Tax: MIN($23,000 × 7%, $224) = $224 (capped)
   *
   * DEALER INCENTIVE PAYMENTS (TCA § 67-6-341):
   * Tennessee has a special provision for "motor vehicle manufacturer's incentive payments"
   * that requires dealers to reduce the sales price.
   *
   * Official Statute Text:
   * "A credit is granted for the amount of sales tax due on motor vehicle manufacturer's
   * incentive payments included in the sales price, such that sales tax is owed on the
   * sales price of the motor vehicle less any otherwise taxable motor vehicle manufacturer's
   * incentive payment associated with the sale."
   *
   * Requirements for Credit:
   * - Program sponsored by motor vehicle manufacturer
   * - Amount received by retailer based on unit price of vehicles sold at retail
   * - Requires retailer to reduce sales price to purchaser
   * - Does NOT use manufacturer's coupon or redemption certificate
   *
   * This provision only applies to retail sales (not sales to leasing companies for resale).
   *
   * For DSL purposes, we mark manufacturer rebates as non-taxable (they reduce the base)
   * and dealer rebates as non-taxable when they're true incentive payments that reduce price.
   *
   * Source: TCA § 67-6-341; TN DOR Automotive Dealership Manual
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: false,
      notes:
        "Manufacturer rebates (customer cash, loyalty, conquest, EV credits) reduce the selling " +
        "price and thus reduce the taxable amount. Tax calculated on net price after rebate.",
    },
    {
      appliesTo: "DEALER",
      taxable: false,
      notes:
        "Dealer incentive payments from manufacturer: TCA § 67-6-341 provides credit for sales tax " +
        "on incentive payments when dealer reduces sales price. Tax owed on sale price LESS the " +
        "incentive payment. Only applies to retail sales (not leases to leasing companies for resale).",
    },
  ],

  /**
   * Doc Fee: TAXABLE, capped at $495
   *
   * Documentation fees are subject to sales tax at the full combined rate
   * (state + local).
   *
   * Statutory Cap (TCA § 55-3-122):
   * "The maximum amount that may be charged by any dealer for preparing the
   * documentation required for the sale of a motor vehicle shall not exceed
   * four hundred ninety-five dollars ($495)."
   *
   * Effective Date:
   * Cap increased to $495 effective July 1, 2019 (TN DOR Important Notice #19-14).
   * Previous cap was $495.
   *
   * Taxability:
   * Doc fee is included in the taxable base and subject to:
   * - 7% state sales tax (subject to single article cap)
   * - Full local tax rate (NOT capped)
   *
   * Example:
   *   Doc Fee: $495
   *   Combined Rate: 9.25% (7% state + 2.25% local)
   *   State Tax on Doc Fee: MIN($495 × 7%, contribution to cap)
   *   Local Tax on Doc Fee: $495 × 2.25% = $11.14
   *
   * The doc fee is added to the vehicle price to determine total taxable base,
   * then the single article cap applies to the total state tax calculation.
   *
   * Source: TCA § 55-3-122; TN DOR Important Notice #19-14
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules
   *
   * Tennessee has UNUSUAL treatment of certain products:
   *
   * SERVICE CONTRACTS (VSC):
   * - TAXABLE (Tennessee is one of FEW states that taxes warranty contracts)
   * - TCA § 67-6-208: "The retail sale of, use of, or subscription to a warranty
   *   or service contract covering the repair or maintenance of tangible personal
   *   property shall be subject to the tax levied by this chapter."
   * - Total sales price subject to 7% state rate plus local tax rate
   * - Taxed at time of sale of the contract
   * - Subsequent repairs performed under warranty are NOT subject to tax
   * - Extended warranty/service contracts are taxed separately when sold with motor vehicles
   *
   * GAP INSURANCE:
   * - NOT subject to tax in Tennessee
   * - Treated as insurance product, exempt from sales tax
   * - Different treatment than VSC/warranties
   *
   * TITLE FEE:
   * - NOT taxable (government fee)
   * - Paid to County Clerk
   * - Must be separately stated on invoice
   *
   * REGISTRATION FEES:
   * - NOT taxable (government fees)
   *
   * WHEEL TAX:
   * - NOT taxable (annual county registration tax)
   * - Varies by county ($50-$100+ depending on county)
   * - Replaces vehicle property tax in Tennessee
   * - Paid annually at registration renewal
   *
   * Source: TCA § 67-6-208; TN DOR Sales and Use Tax Guide
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: true,
      notes:
        "Tennessee TAXES extended warranties/VSC (unusual - most states don't tax these). " +
        "TCA § 67-6-208: Warranty contracts subject to sales tax. Taxed at time of sale at " +
        "full sales tax rate. Subsequent repairs under warranty NOT taxed.",
    },
    {
      code: "GAP",
      taxable: false,
      notes:
        "GAP insurance is NOT taxable in Tennessee. Treated as insurance product, exempt from " +
        "sales tax. Different treatment than VSC (which is taxable).",
    },
    {
      code: "DOC_FEE",
      taxable: true,
      notes:
        "Doc fees are TAXABLE at full sales tax rate (state + local). Capped at $495 per " +
        "TCA § 55-3-122 (effective July 1, 2019).",
    },
    {
      code: "TITLE",
      taxable: false,
      notes:
        "Title fee paid to County Clerk is NOT taxable (government fee). Must be separately " +
        "stated on invoice.",
    },
    {
      code: "REG",
      taxable: false,
      notes: "Registration fees are NOT taxable (government fees).",
    },
    {
      code: "WHEEL_TAX",
      taxable: false,
      notes:
        "Wheel tax is an annual county registration tax ($50-$100+ varies by county), NOT " +
        "subject to sales tax. Replaces vehicle property tax in Tennessee.",
    },
  ],

  /**
   * Product Taxability
   *
   * Accessories: TAXABLE
   * - Dealer-installed accessories are part of the vehicle sale
   * - Subject to sales tax at full combined rate
   * - Included in single article tax cap calculation
   *
   * Negative Equity: TAXABLE (when rolled into financed amount)
   * - Negative equity from trade-in increases the total amount financed
   * - Subject to sales tax when rolled into vehicle sale price
   * - Adds to taxable base for both state and local tax
   *
   * Service Contracts: TAXABLE
   * - Tennessee DOES tax VSC/extended warranties (unusual)
   * - See feeTaxRules above for details
   *
   * GAP: NOT taxable
   * - Treated as insurance product
   * - Exempt from sales tax
   *
   * Example with Negative Equity:
   *   Vehicle Price: $25,000
   *   Trade-In Value: $12,000
   *   Trade-In Payoff: $15,000
   *   Negative Equity: $3,000
   *   Taxable Base: $25,000 - $12,000 + $3,000 = $16,000
   *   State Tax: MIN($16,000 × 7%, $224) = $224 (capped)
   *   Local Tax: $16,000 × 2.25% = $360
   *   Total Tax: $584
   *
   * Source: TN DOR Sales and Use Tax Guide
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: true,
  taxOnServiceContracts: true, // TN DOES tax VSC (unusual)
  taxOnGap: false,

  /**
   * Vehicle Tax Scheme: STATE_PLUS_LOCAL with SINGLE ARTICLE TAX CAP
   *
   * Tennessee uses a stacked tax system with state + local taxes.
   *
   * State Sales Tax: 7.0%
   * - One of the highest state rates in the nation
   * - TCA § 67-6-501 et seq.
   * - Subject to single article tax cap (TCA § 67-6-331)
   *
   * Local Sales Tax: County + City (varies by jurisdiction)
   * - Typical range: 2.25% to 2.75%
   * - NOT subject to single article tax cap
   *
   * Combined Rates (Major Cities):
   * - Memphis (Shelby County): 7% state + 2.75% local = 9.75%
   * - Nashville (Davidson County): 7% state + 2.25% local = 9.25%
   * - Knoxville (Knox County): 7% state + 2.25% local = 9.25%
   * - Chattanooga (Hamilton County): 7% state + 2.25% local = 9.25%
   *
   * CRITICAL: Single Article Tax Cap (TCA § 67-6-331)
   * The single article tax cap applies to the STATE portion ONLY:
   * - Vehicles ≤ $1,600: State tax capped at $112 ($1,600 × 7%)
   * - Vehicles > $1,600: State tax capped at $224 ($3,200 × 7%)
   * - Local tax is NOT capped and applies to full sale price
   *
   * Impact on Expensive Vehicles:
   * For a $100,000 vehicle in Nashville (9.25% combined):
   * - Without cap: $100,000 × 9.25% = $9,250
   * - With cap: $224 (state) + $2,250 (local) = $2,474
   * - Tax savings: $6,776 (73% reduction!)
   *
   * The cap creates a regressive tax structure where expensive vehicles pay
   * a much lower effective tax rate than moderate-priced vehicles.
   *
   * Effective Tax Rates (Nashville 9.25% combined):
   * - $15,000 vehicle: $224 + $337.50 = $561.50 (3.74% effective)
   * - $30,000 vehicle: $224 + $675.00 = $899.00 (3.00% effective)
   * - $50,000 vehicle: $224 + $1,125.00 = $1,349.00 (2.70% effective)
   * - $100,000 vehicle: $224 + $2,250.00 = $2,474.00 (2.47% effective)
   *
   * Source: TCA § 67-6-331; TN DOR Sales and Use Tax Guide
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
     * Tennessee taxes leases on a MONTHLY basis. Sales tax is charged on each
     * monthly lease payment (TCA § 67-6-331).
     *
     * Official Guidance (TN DOR County Clerk Manual):
     * "Sales tax applies to a lease of tangible personal property on the billing
     * basis of the lease payments, either on the lump sum due at the time of the
     * lease execution or on a monthly/periodical basis."
     *
     * IMPORTANT: The single article tax cap applies to EACH MONTHLY PAYMENT
     * - If monthly payment ≤ $1,600: State portion capped at $112
     * - If monthly payment > $1,600: State portion capped at $224
     * - Local tax is NOT capped
     *
     * In Practice:
     * Most lease payments are under $1,600/month, so the payment is typically
     * well below the cap threshold. The cap would only apply to very expensive
     * vehicle leases with high monthly payments.
     *
     * Example - Typical Lease (Nashville 9.25% combined):
     *   Monthly Payment: $450
     *   State Tax: MIN($450 × 7%, $112) = $31.50 (under cap)
     *   Local Tax: $450 × 2.25% = $10.13
     *   Total Monthly Tax: $41.63
     *   Total Tax Over 36 Months: $41.63 × 36 = $1,498.68
     *
     * Example - Luxury Lease (Memphis 9.75% combined):
     *   Monthly Payment: $1,800 (exceeds $1,600 threshold)
     *   State Tax: MIN($1,800 × 7%, $224) = $126 vs. $224 cap = $126 (under cap)
     *   Local Tax: $1,800 × 2.75% = $49.50
     *   Total Monthly Tax: $175.50
     *   Total Tax Over 36 Months: $6,318
     *
     * The cap rarely applies to lease payments because:
     * - $1,600/month payment requires ~$65,000+ cap cost (depending on term/residual)
     * - Even at $1,600/month, state tax ($112) is under the $112 cap
     * - Would need payment > $1,600 AND > $3,200 threshold (very rare)
     *
     * Source: TCA § 67-6-331; TN DOR County Clerk Sales and Use Tax Manual
     */
    method: "MONTHLY",

    /**
     * Cap Cost Reduction: NOT taxed upfront
     *
     * Cap cost reductions (cash down, trade-ins, rebates) reduce the capitalized
     * cost and lower the monthly payment. They are not themselves taxed upfront.
     *
     * By reducing the monthly payment, cap cost reductions indirectly reduce the
     * monthly tax paid over the lease term.
     *
     * Example:
     *   Gross Cap Cost: $40,000
     *   Cap Reductions:
     *     - Cash down: $5,000
     *     - Trade-in equity: $3,000
     *     - Manufacturer rebate: $2,500
     *     - Total: $10,500
     *
     *   Adjusted Cap Cost: $29,500
     *   Without Reductions: $550/month → $50.88/month tax (9.25%)
     *   With Reductions: $400/month → $37.00/month tax (9.25%)
     *   Monthly Tax Savings: $13.88
     *   Total Savings (36 months): $499.68
     *
     * Source: TN DOR County Clerk Sales and Use Tax Manual
     */
    taxCapReduction: false,

    /**
     * Rebate Behavior on Leases: FOLLOW_RETAIL_RULE
     *
     * Manufacturer rebates applied as cap cost reduction reduce the adjusted
     * cap cost, lower the monthly payment, and thus reduce monthly tax.
     *
     * Dealer incentive payments follow same treatment as retail per TCA § 67-6-341.
     *
     * NOTE: TCA § 67-6-341 explicitly states the credit "only applies to sales
     * at retail, so incentive payments received by the dealer for sales to a
     * leasing company for resale do not qualify for the credit."
     *
     * This means:
     * - Direct consumer leases: Rebates reduce cap cost (lower payment, lower tax)
     * - Dealer sales to leasing company: Incentive payment credit does NOT apply
     *
     * Source: TCA § 67-6-341; TN DOR Automotive Dealership Manual
     */
    rebateBehavior: "FOLLOW_RETAIL_RULE",

    /**
     * Doc Fee on Leases: ALWAYS taxable
     *
     * Doc fees on leases are subject to sales tax, same as retail transactions.
     * Subject to same $495 statutory cap (TCA § 55-3-122).
     *
     * Typically paid upfront (at lease signing) and taxed at that time.
     * Can also be capitalized into the lease, in which case it increases the
     * cap cost and thus increases the monthly payment and monthly tax.
     *
     * Example - Upfront Payment:
     *   Doc Fee: $495
     *   Combined Rate: 9.25%
     *   Tax on Doc Fee: $495 × 9.25% = $45.79 (paid at signing)
     *
     * Example - Capitalized:
     *   Doc Fee: $495 (added to cap cost)
     *   Increases monthly payment by ~$14/month (36-month lease)
     *   Increases monthly tax by ~$1.30/month
     *   Total tax on doc fee: ~$46.80 over term
     *
     * Source: TCA § 55-3-122; TN DOR Sales and Use Tax Guide
     */
    docFeeTaxability: "ALWAYS",

    /**
     * Trade-in Credit on Leases: FULL
     *
     * Trade-ins on leases receive full credit. The trade-in value reduces the
     * gross cap cost, lowering the adjusted cap cost and thus the monthly payment.
     *
     * By reducing the monthly payment, the trade-in indirectly reduces the monthly
     * tax paid over the lease term.
     *
     * Example:
     *   Gross Cap Cost: $35,000
     *   Trade-In Value: $10,000
     *   Adjusted Cap Cost: $25,000
     *
     *   Without Trade-In: $480/month → $44.40/month tax (9.25%)
     *   With Trade-In: $350/month → $32.38/month tax (9.25%)
     *   Monthly Tax Savings: $12.03
     *   Total Savings (36 months): $433.08
     *
     * Key Difference from Alabama:
     * Alabama provides NO trade-in credit on leases (trade-in equity is taxed
     * as cap cost reduction). Tennessee provides FULL trade-in credit on leases,
     * consistent with retail treatment.
     *
     * Source: TN DOR County Clerk Sales and Use Tax Manual
     */
    tradeInCredit: "FULL",

    /**
     * Negative Equity on Leases: Taxable
     *
     * Negative equity rolled into a lease increases the gross cap cost, which
     * increases the monthly payment and thus increases the monthly tax paid.
     *
     * Example:
     *   Base Cap Cost: $30,000
     *   Trade-In Value: $12,000
     *   Trade-In Payoff: $15,000
     *   Negative Equity: $3,000
     *   Adjusted Cap Cost: $33,000 (for payment calculation)
     *
     *   Without Negative Equity: $400/month → $37.00/month tax (9.25%)
     *   With Negative Equity: $440/month → $40.70/month tax (9.25%)
     *   Additional Monthly Tax: $3.70
     *   Total Additional Tax (36 months): $133.20
     *
     * The negative equity effectively increases the taxable amount by raising
     * the monthly payment.
     *
     * Source: TN DOR Sales and Use Tax Guide
     */
    negativeEquityTaxable: true,

    /**
     * Fee Taxability on Leases
     *
     * - Doc fee: TAXABLE (upfront or capitalized), capped at $495
     * - Service contracts (VSC): TAXABLE when capitalized into lease
     * - GAP: NOT taxable (insurance product)
     * - Title: NOT taxable (government fee)
     * - Registration: NOT taxable (government fee)
     * - Wheel tax: NOT taxable (annual county tax)
     *
     * Tennessee maintains consistent treatment between retail and lease for
     * most products:
     * - VSC is TAXABLE on both retail and lease (unusual)
     * - GAP is NOT taxable on both retail and lease
     *
     * Source: TCA § 67-6-208; TN DOR Sales and Use Tax Guide
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: true,
        notes: "Doc fee taxed (upfront or capitalized), capped at $495",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: true,
        notes: "Service contracts TAXABLE when capitalized into lease (unusual, same as retail)",
      },
      {
        code: "GAP",
        taxable: false,
        notes: "GAP NOT taxable (insurance product, same as retail)",
      },
      { code: "TITLE", taxable: false, notes: "Title fee NOT taxable (government fee)" },
      { code: "REG", taxable: false, notes: "Registration NOT taxable (government fee)" },
      {
        code: "WHEEL_TAX",
        taxable: false,
        notes: "Wheel tax NOT taxable (annual county registration tax)",
      },
    ],

    /**
     * Title Fee Rules on Leases
     *
     * Title fees and wheel tax on leases are:
     * - NOT taxable
     * - Typically paid upfront (at lease signing)
     * - Not included in cap cost for payment calculation
     * - Not included in monthly payment
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
        code: "WHEEL_TAX",
        taxable: false,
        includedInCapCost: true,
        includedInUpfront: true,
        includedInMonthly: false,
      },
    ],

    /**
     * Tax Fees Upfront: TRUE
     *
     * Fees that are taxable on leases (like doc fee, VSC if sold separately)
     * are typically taxed upfront at signing, not spread across monthly payments.
     *
     * If capitalized into the lease, they increase the cap cost and thus the
     * monthly payment, which increases the monthly tax.
     */
    taxFeesUpfront: true,

    /**
     * Special Scheme: NONE
     *
     * Tennessee's single article tax cap is handled in the rate calculation,
     * not as a special lease scheme. The cap applies to each monthly payment.
     *
     * The interpreter must:
     * 1. Calculate state tax on monthly payment: payment × 7%
     * 2. Cap state tax at $112 (payment ≤ $1,600) or $224 (payment > $1,600)
     * 3. Add uncapped local tax: payment × local rate
     *
     * In practice, most lease payments are under $1,600 and the state tax is
     * well under the $112/$224 caps, so the cap rarely applies.
     */
    specialScheme: "NONE",

    notes:
      "Tennessee: Monthly lease taxation (tax on each payment). Single article tax cap applies " +
      "to EACH PAYMENT: state portion capped at $112 (payment ≤ $1,600) or $224 (payment > $1,600). " +
      "Local tax NOT capped. Cap rarely applies because most payments < $1,600 and state tax < $112. " +
      "Service contracts TAXABLE (unusual - most states don't tax). GAP NOT taxable. Doc fee capped " +
      "at $495. Trade-in receives full credit (reduces payment and thus tax). Wheel tax ($50-$100+) " +
      "is annual county registration tax, NOT subject to sales tax.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: CREDIT_UP_TO_STATE_RATE
   *
   * Tennessee provides reciprocal credit for sales tax paid in other states,
   * capped at the Tennessee tax rate that would have applied.
   *
   * Policy (TN DOR guidance):
   * When a vehicle is purchased out-of-state and brought to Tennessee for
   * registration, the buyer must pay Tennessee use tax. However, any sales tax
   * paid to the other state is credited against the Tennessee use tax due.
   *
   * How It Works:
   *
   * Scenario 1: Other State Tax ≥ Tennessee Tax
   * If sales/use tax paid to another state equals or exceeds Tennessee's tax
   * (including the single article cap), NO additional Tennessee use tax is due.
   *
   * Example:
   *   Vehicle purchased in Illinois: $50,000
   *   Illinois tax paid (7.25%): $3,625
   *   Tennessee tax would be (Nashville 9.25%):
   *     State: $224 (capped)
   *     Local: $1,125
   *     Total: $1,349
   *   Credit allowed: $1,349 (full TN amount)
   *   Additional TN tax due: $0
   *
   * Scenario 2: Other State Tax < Tennessee Tax
   * If tax paid to another state is less than Tennessee's tax, pay the DIFFERENCE.
   *
   * Example:
   *   Vehicle purchased in Montana: $50,000
   *   Montana tax paid (0%): $0
   *   Tennessee tax due (Nashville 9.25%): $1,349
   *   Credit allowed: $0
   *   Additional TN tax due: $1,349
   *
   * Scenario 3: Other State Tax Between Zero and TN Tax
   * Example:
   *   Vehicle purchased in Kentucky: $30,000
   *   Kentucky tax paid (6%): $1,800
   *   Tennessee tax would be (Nashville 9.25%):
   *     State: $224 (capped)
   *     Local: $675
   *     Total: $899
   *   Credit allowed: $899 (capped at TN amount, even though KY paid more)
   *   Additional TN tax due: $0
   *
   * IMPORTANT: Single Article Tax Cap Applies
   * When calculating the Tennessee use tax owed, the single article tax cap
   * applies to the state portion. This means Tennessee's "tax that would have
   * been charged" is often much lower than other states' actual tax.
   *
   * For expensive vehicles, the cap creates significant tax savings:
   * - $100,000 vehicle bought in CA (7.5% = $7,500)
   * - TN would charge: $224 + $2,250 = $2,474
   * - Credit: $2,474 (capped at TN amount)
   * - Additional TN tax: $0
   * - Total tax paid: $7,500 to CA, $0 to TN
   *
   * Documentation Required:
   * - Proof of sales tax paid to other state (receipt, title, registration)
   * - Invoice or bill of sale showing vehicle price
   * - Evidence that tax was legally imposed (not voluntary payment)
   *
   * Reciprocity applies to BOTH retail purchases and leases.
   *
   * Source: TN DOR Sales and Use Tax Guide; TCA § 67-6-501
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
      "Tennessee provides credit for sales tax paid in other states, capped at TN rate " +
      "(including single article tax cap). Credit applies to both state and local tax. " +
      "If other state's tax exceeds Tennessee's capped amount, no additional tax is owed. " +
      "Requires proof of tax paid (receipt, title, registration). The single article cap " +
      "significantly reduces TN's tax compared to other states, often resulting in $0 additional " +
      "tax due when registering out-of-state purchases in TN.",
  },

  extras: {
    lastUpdated: "2025-11-14",
    sources: [
      "Tennessee Department of Revenue (TN DOR) - tn.gov/revenue",
      "Tennessee Code Annotated (TCA) § 67-6-331 - Single Article Tax Cap",
      "TCA § 67-6-501 et seq. - Sales and Use Tax",
      "TCA § 67-6-208 - Warranty/Service Contract Taxability",
      "TCA § 67-6-341 - Credit for Motor Vehicle Incentive Payments",
      "TCA § 55-3-122 - Documentation Fee Cap",
      "TN DOR Important Notice #19-14 - Doc Fee Cap Increase (July 1, 2019)",
      "TN DOR Sales and Use Tax Guide (December 2024)",
      "TN DOR County Clerk Sales and Use Tax Manual for Automobiles & Boats (August 2021)",
      "Tennessee Automobile Dealership Manual (December 2023)",
      "Tennessee County Clerk Association - Wheel Tax Information",
    ],
    notes:
      "Tennessee has 7% state + 2.25%-2.75% local = 9.25%-9.75% combined sales tax (among highest " +
      "in nation). SINGLE ARTICLE TAX CAP: State portion capped at $1,600 ($112 tax) for vehicles " +
      "≤$1,600 or $3,200 ($224 tax) for vehicles >$1,600. Local tax NOT capped. Doc fee capped at " +
      "$495 (statutory). Tennessee TAXES service contracts/VSC (unusual - most states exempt). GAP " +
      "NOT taxable. Dealer incentive payment credit available (TCA § 67-6-341). No vehicle property " +
      "tax (replaced by county wheel tax $50-$100+). Lease taxation: monthly with cap applying per " +
      "payment. Single article cap significantly reduces tax on expensive vehicles. Full trade-in " +
      "credit on both retail and lease (unlike AL which has no lease credit).",
    stateRate: 7.0,
    typicalLocalRateNashville: 2.25,
    typicalLocalRateMemphis: 2.75,
    minCombinedRate: 9.25,
    maxCombinedRate: 9.75,
    singleArticleCapLow: 1600, // For vehicles ≤ $1,600
    singleArticleCapHigh: 3200, // For vehicles > $1,600
    singleArticleCapLowTax: 112, // $1,600 × 7%
    singleArticleCapHighTax: 224, // $3,200 × 7%
    docFeeCapAmount: 495,
    docFeeCapEffectiveDate: "2019-07-01",
    wheelTaxRange: [50, 100], // Varies by county, can exceed $100 in some counties
    majorJurisdictions: {
      Memphis: { state: 7.0, local: 2.75, total: 9.75 },
      Nashville: { state: 7.0, local: 2.25, total: 9.25 },
      Knoxville: { state: 7.0, local: 2.25, total: 9.25 },
      Chattanooga: { state: 7.0, local: 2.25, total: 9.25 },
    },
  },
};

export default US_TN;
