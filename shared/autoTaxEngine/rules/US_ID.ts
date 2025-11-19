import { TaxRulesConfig } from "../types";

/**
 * IDAHO TAX RULES
 *
 * Researched: 2025-11-14
 * Version: 2
 *
 * KEY FACTS:
 * - State sales tax: 6.0%
 * - Local sales taxes: YES - varies by jurisdiction (0% to 3%)
 * - Combined rate range: 6.0% to 9.0%
 * - Trade-in credit: FULL (deducted from taxable base)
 * - Manufacturer rebates: NOT taxable (reduce sale price)
 * - Dealer rebates: Depends on application (typically reduces price)
 * - Doc fee: TAXABLE, NO STATE CAP
 * - Service contracts & GAP: NOT taxable when separately stated
 * - Lease method: MONTHLY taxation on lease payments
 * - Lease trade-in: FULL CREDIT (reduces payments and tax)
 * - Reciprocity: LIMITED (varies by state agreements)
 *
 * UNIQUE IDAHO FEATURES:
 * 1. TRADE-IN CREDIT: Full trade-in credit applies to both state and local taxes
 * 2. NO TRADE-IN ON PRIVATE SALES: Trade-in credit only for dealer transactions
 * 3. REBATES REDUCE TAX: Manufacturer rebates reduce taxable amount
 * 4. SEPARATELY STATED EXEMPTION: VSC and GAP not taxable if separately stated
 * 5. LEASE TRADE-IN CREDIT: Trade-in reduces monthly payments and tax (unlike some states)
 * 6. TRUE LEASE vs LEASE-PURCHASE: Different tax treatment
 * 7. OPTION TO PURCHASE: Taxed on buyout when exercised
 * 8. NO DOC FEE CAP: Idaho has no statutory limit on documentation fees
 *
 * TAX CALCULATION FORMULA (RETAIL):
 * Taxable Base = Vehicle Price + Accessories - Trade-In - Rebates
 * State Tax = Taxable Base × 6.0%
 * Local Tax = Taxable Base × Local Rate
 * Total Tax = State Tax + Local Tax
 *
 * Example (Boise - 6% state + 0% local):
 * $30,000 vehicle - $10,000 trade-in - $2,000 rebate
 * Taxable Base: $18,000
 * State Tax: $18,000 × 6.0% = $1,080.00
 * Local Tax: $18,000 × 0% = $0.00
 * Total Tax: $1,080.00
 *
 * Example (Coeur d'Alene - 6% state + 3% local):
 * $30,000 vehicle - $10,000 trade-in
 * Taxable Base: $20,000
 * State Tax: $20,000 × 6.0% = $1,200.00
 * Local Tax: $20,000 × 3.0% = $600.00
 * Total Tax: $1,800.00
 *
 * LEASE CALCULATION (MONTHLY):
 * True Lease:
 *   Tax = Monthly Payment × (6.0% state + local rate)
 *
 * Lease-Purchase:
 *   Tax = Full Purchase Price × (6.0% state + local rate) at delivery
 *
 * Example (true lease, 36 months, 6% total):
 * $450/month × 36 months
 * Monthly Tax: $450 × 6% = $27.00/month
 * Total Lease Tax: $27.00 × 36 = $972.00
 *
 * SOURCES:
 * - Idaho State Tax Commission (tax.idaho.gov)
 * - Idaho Administrative Code IDAPA 35.01.02
 * - Idaho Code Title 63 (Revenue and Taxation)
 * - Sales Tax Handbook - Idaho
 */
export const US_ID: TaxRulesConfig = {
  stateCode: "ID",
  version: 1,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL
   *
   * Idaho allows full trade-in credit. The trade-in value is deducted
   * from the purchase price before calculating sales tax.
   *
   * IDAHO ADMIN CODE 35.01.02.044:
   * "When a vehicle is traded in as part payment for another vehicle, the
   * trade-in value may be subtracted from the purchase price, thereby
   * reducing the sales tax due."
   *
   * IMPORTANT LIMITATION:
   * Trade-in allowances apply ONLY to DEALER sales. Private party sales
   * do NOT allow trade-in credit.
   *
   * Example:
   *   Vehicle Price: $30,000
   *   Trade-In Value: $10,000
   *   Taxable Base: $20,000
   *   Sales Tax (6%): $1,200
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules: NOT taxable (reduce sale price)
   *
   * Manufacturer rebates reduce the taxable sale price before tax
   * calculation in Idaho.
   *
   * IDAHO ADMIN CODE 35.01.02.106:
   * "When a manufacturer's rebate is applied as a down payment, the dealer
   * collects tax on the difference."
   *
   * Example:
   *   Vehicle Price: $25,000
   *   Manufacturer Rebate: $2,000
   *   Taxable Base: $23,000
   *   Sales Tax (6%): $1,380
   *
   * Dealer rebates typically reduce the selling price and tax is
   * calculated on the actual price charged.
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: false,
      notes:
        "Manufacturer rebates reduce the purchase price before Idaho sales tax calculation. " +
        "Tax calculated on net amount after rebate applied.",
    },
    {
      appliesTo: "DEALER",
      taxable: false,
      notes:
        "Dealer rebates/incentives reduce the taxable sale price. Sales tax calculated on " +
        "actual price after dealer discounts.",
    },
  ],

  /**
   * Doc Fee: TAXABLE, NO STATE CAP
   *
   * Documentation fees are subject to Idaho sales tax.
   *
   * NO STATUTORY CAP:
   * Idaho does not impose a statutory limit on dealer documentation fees.
   * Fees vary by dealer.
   *
   * Doc fees are included in the taxable base for sales tax calculation.
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules
   *
   * Idaho has specific rules about what is and isn't taxable:
   *
   * SERVICE CONTRACTS (VSC):
   * - NOT taxable when SEPARATELY STATED on invoice
   * - Idaho Admin Code: "Optional service and warranty agreements" are
   *   not included in taxable sales price when separately stated
   *
   * GAP INSURANCE:
   * - NOT taxable when SEPARATELY STATED on invoice
   * - Idaho Admin Code: "Optional insurance (e.g., GAP insurance)" is not
   *   included in taxable sales price when separately stated
   *
   * TITLE & REGISTRATION FEES:
   * - NOT taxable (government fees)
   *
   * DOC FEE:
   * - TAXABLE (dealer fee, part of transaction)
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: false,
      notes:
        "Service contracts (VSC) are NOT taxable in Idaho when separately stated on invoice " +
        "as optional items. Per Idaho Admin Code 35.01.02.106.",
    },
    {
      code: "GAP",
      taxable: false,
      notes:
        "GAP insurance is NOT taxable in Idaho when separately stated on invoice as optional " +
        "insurance. Per Idaho Admin Code 35.01.02.106.",
    },
    {
      code: "DOC_FEE",
      taxable: true,
      notes:
        "Doc fees are TAXABLE in Idaho. No state cap on doc fees (dealer discretion). " +
        "Included in taxable base for sales tax calculation.",
    },
    {
      code: "TITLE",
      taxable: false,
      notes:
        "Title fees imposed by government agencies are NOT taxable when separately stated.",
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
   * Accessories: TAXABLE
   * - Dealer-installed accessories are subject to sales tax
   *
   * Negative Equity: TAXABLE
   * - Negative equity rolled into purchase increases taxable base
   *
   * Service Contracts: NOT taxable (when separately stated)
   * GAP: NOT taxable (when separately stated)
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: true,
  taxOnServiceContracts: false, // When separately stated
  taxOnGap: false, // When separately stated

  /**
   * Vehicle Tax Scheme: STATE_PLUS_LOCAL
   *
   * Idaho uses a combination of state and local sales taxes.
   *
   * STATE RATE: 6.0%
   * - Uniform across the state
   *
   * LOCAL RATES: 0% to 3%
   * - Vary by city and county
   * - Not all jurisdictions impose local option taxes
   * - Examples:
   *   - Boise: 6% (no local tax)
   *   - Coeur d'Alene: 9% (6% state + 3% local)
   *   - Idaho Falls: 7% (6% state + 1% local)
   *   - Pocatello: 7.5% (6% state + 1.5% local)
   *
   * Combined rates range from 6.0% to 9.0%.
   *
   * Tax is based on the location of the dealership.
   */
  vehicleTaxScheme: "STATE_ONLY",
  vehicleUsesLocalSalesTax: false,

  // ============================================================================
  // LEASE TRANSACTION RULES
  // ============================================================================

  leaseRules: {
    /**
     * Lease Method: MONTHLY (for true leases)
     *
     * Idaho distinguishes between TRUE LEASES and LEASE-PURCHASES:
     *
     * TRUE LEASE:
     * - A true lease is one where the lessee does NOT have an option
     *   to purchase at the end
     * - Sales tax applies to EACH MONTHLY PAYMENT
     * - Tax = Monthly Payment × (6% state + local rate)
     *
     * LEASE WITH OPTION TO PURCHASE:
     * - A lease that includes an option to purchase
     * - Sales tax applies to EACH MONTHLY PAYMENT
     * - When option is exercised: Sales tax applies to the buyout/residual value
     * - Tax = (Monthly Payment × # payments) + Buyout Value × Tax Rate
     *
     * LEASE-PURCHASE:
     * - Structured as a lease but operates as a purchase
     * - Sales tax due on FULL PURCHASE PRICE at delivery
     * - Treated as retail sale for tax purposes
     *
     * Most consumer vehicle leases are "true leases" or "leases with
     * option to purchase," taxed monthly.
     */
    method: "MONTHLY",

    /**
     * Cap Cost Reduction: NOT TAXED upfront
     *
     * Cap cost reductions (cash down, rebates) are NOT taxed upfront
     * in Idaho.
     *
     * However, they reduce the capitalized cost, which reduces monthly
     * payments, which reduces the monthly tax.
     */
    taxCapReduction: false,

    /**
     * Rebate Behavior on Leases: FOLLOW_RETAIL_RULE
     *
     * Manufacturer rebates reduce the cap cost and are not taxed upfront.
     * Only monthly lease payments are subject to sales tax.
     */
    rebateBehavior: "FOLLOW_RETAIL_RULE",

    /**
     * Doc Fee on Leases: FOLLOW_RETAIL_RULE
     *
     * Doc fees on leases are generally paid upfront and are subject
     * to sales tax at the time of payment.
     */
    docFeeTaxability: "FOLLOW_RETAIL_RULE",

    /**
     * Trade-in Credit on Leases: FULL
     *
     * Idaho allows trade-in credit on leases.
     *
     * IDAHO ADMIN CODE 35.01.02.044:
     * "When a vehicle is traded in as part payment for the rental or
     * lease of another vehicle, a deduction is allowed before computing
     * the sales tax."
     *
     * The trade-in value may be:
     * - Subtracted from the initial lease payments, OR
     * - Subtracted from the value of the leased property
     *
     * This reduces the monthly payments and the sales tax due on those
     * payments.
     *
     * Example:
     *   Gross Cap Cost: $30,000
     *   Trade-In: $6,000
     *   Net Cap Cost: $24,000
     *   Monthly Payment: $400 (based on $24,000)
     *   Monthly Tax: $400 × 6% = $24
     */
    tradeInCredit: "FULL",

    /**
     * Negative Equity on Leases: TAXABLE
     *
     * Negative equity increases the cap cost, which increases monthly
     * payments. Higher monthly payments result in higher monthly tax.
     */
    negativeEquityTaxable: true,

    /**
     * Fee Taxability on Leases
     *
     * SERVICE CONTRACTS (VSC):
     * - NOT taxable when separately stated and capitalized into lease
     *
     * GAP INSURANCE:
     * - NOT taxable when separately stated and capitalized into lease
     *
     * DOC FEE:
     * - Generally TAXABLE when paid upfront
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: true,
        notes: "Doc fee generally TAXABLE when paid upfront on lease.",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: false,
        notes:
          "Service contracts NOT taxable when separately stated and capitalized into lease.",
      },
      {
        code: "GAP",
        taxable: false,
        notes: "GAP insurance NOT taxable when separately stated and capitalized into lease.",
      },
      {
        code: "TITLE",
        taxable: false,
        notes: "Title fees NOT taxable.",
      },
      {
        code: "REG",
        taxable: false,
        notes: "Registration fees NOT taxable.",
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
      "Idaho lease taxation: MONTHLY payment method for true leases. Sales tax (6% state + " +
      "local) applies to each monthly payment. Trade-in credit ALLOWED (reduces monthly " +
      "payments and tax). Lease with option to purchase: monthly payments taxed, plus tax " +
      "on buyout when exercised. Lease-purchase: taxed as retail sale (full price at delivery). " +
      "Backend products (VSC, GAP) NOT taxed when separately stated. Cap reduction NOT taxed upfront.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: LIMITED (varies by state agreements)
   *
   * Idaho provides limited reciprocity for taxes paid to other states.
   *
   * CREDIT FOR TAXES PAID:
   * Idaho may provide credit for sales/use taxes paid to other states
   * on the same property, but this is limited and varies by state
   * agreements.
   *
   * OUT-OF-STATE PURCHASES:
   * Idaho residents who purchase vehicles out-of-state must pay Idaho
   * use tax when registering the vehicle in Idaho, with credit for
   * taxes paid elsewhere (up to Idaho's tax amount).
   *
   * DEALER SALES TO OUT-OF-STATE BUYERS:
   * Vehicles purchased in Idaho by out-of-state buyers are generally
   * subject to Idaho sales tax at the time of purchase, unless the
   * vehicle is immediately exported out of state.
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
      "Idaho provides LIMITED reciprocity for taxes paid to other states. Credit allowed up to " +
      "Idaho's tax amount (6% state + local). Proof of tax paid in other state required. Idaho " +
      "residents purchasing out-of-state owe Idaho use tax, with credit for taxes paid elsewhere. " +
      "Out-of-state buyers purchasing in Idaho generally pay Idaho sales tax unless vehicle " +
      "immediately exported.",
  },

  extras: {
    lastUpdated: "2025-11-14",
    sources: [
      "Idaho State Tax Commission (tax.idaho.gov)",
      "Idaho Administrative Code IDAPA 35.01.02.106 (Vehicle Sales, Rentals, and Leases)",
      "Idaho Administrative Code IDAPA 35.01.02.044 (Trade-Ins, Trade-Downs and Barter)",
      "Idaho Code Title 63 (Revenue and Taxation)",
      "Sales Tax Handbook - Idaho (salestaxhandbook.com)",
      "Idaho Sales and Use Tax Guide for Vehicle Transactions",
    ],
    notes:
      "Idaho has uniform 6% flat rate statewide. No local taxes on vehicles. Full trade-in credit " +
      "applies (dealer sales only, NOT private party). Manufacturer rebates reduce taxable base. " +
      "Doc fees TAXABLE (no state cap). Service contracts are exempt when separately stated as optional. " +
      "GAP NOT taxable when separately stated. " +
      "Leases: MONTHLY taxation on payments (true lease). Trade-in credit ALLOWED on leases " +
      "(reduces monthly payments and tax). Lease with option to purchase: monthly payments taxed, " +
      "plus tax on buyout. Lease-purchase: taxed as full retail sale at delivery. Limited reciprocity " +
      "with other states. Title and registration fees NOT taxable.",
    stateSalesRate: 6,
    stateAutomotiveSalesRate: 6.0,
    stateAutomotiveLeaseRate: 6.0,
    localRateRange: { min: 0.0, max: 3.0 },
    combinedRateRange: { min: 6.0, max: 9.0 },
    majorJurisdictions: {
      Boise: { state: 6.0, local: 0.0, total: 6.0 },
      CoeurDAlene: { state: 6.0, local: 3.0, total: 9.0 },
      IdahoFalls: { state: 6.0, local: 1.0, total: 7.0 },
      Pocatello: { state: 6.0, local: 1.5, total: 7.5 },
      Meridian: { state: 6.0, local: 0.0, total: 6.0 },
      Nampa: { state: 6.0, local: 0.0, total: 6.0 },
    },
  },
};

export default US_ID;
