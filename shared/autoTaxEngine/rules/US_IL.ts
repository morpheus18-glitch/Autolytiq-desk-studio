import type { TaxRulesConfig } from "../types";

/**
 * ILLINOIS TAX RULES
 *
 * Researched: 2025-01-13
 * Version: 2 (Updated with 2025 doc fee cap and comprehensive lease tax clarification)
 *
 * KEY FACTS:
 * - Base state sales tax: 6.25%
 * - Local rates: Chicago adds 1.25% city + 1.75% Cook County + 1% RTA = 10.25% total (one of highest in US)
 * - Trade-in credit: FULL (no cap as of Jan 1, 2022 - Public Act 102-0353)
 * - Doc fee: TAXABLE, capped at $367.70 (2025, adjusted annually for CPI)
 * - Manufacturer rebates: NOT taxable (reduce sale price)
 * - Dealer rebates: TAXABLE (do not reduce taxable sale price)
 * - Service contracts: TAXABLE on retail, NOT taxable on leases (if separately stated)
 * - GAP: TAXABLE on retail, NOT taxable on leases (if separately stated)
 * - Accessories: TAXABLE
 * - Negative equity: NOT taxable (rolled into loan, not a cash-out)
 * - Lease taxation: MONTHLY (since Jan 1, 2015) with IL_CHICAGO_COOK special scheme
 * - Chicago special: Additional 8% use tax on lease payments (Chicago residents only)
 * - Reciprocity: YES with credit up to IL rate (requires proof, dealer purchases only)
 *
 * UNIQUE FEATURES:
 * - Chicago has highest combined rates in US (10.25% retail)
 * - Chicago LEASE: Additional 8% use tax on lease payments (Chicago residents only)
 * - 2015 lease law change: Tax on payments only (not full cap cost)
 * - 2022 trade-in law change: Removed $10,000 cap (now FULL credit)
 * - Doc fee capped and indexed to CPI annually
 * - Limited reciprocity: only for dealer purchases, not private party
 * - No credit for trade-ins on leases (since 2015 law change)
 *
 * SOURCES:
 * - Illinois Department of Revenue (tax.illinois.gov)
 * - 35 ILCS 105/3-45 (Use Tax Act - Trade-in Credit)
 * - 86 Ill. Adm. Code 130.2075 (Vehicle Sales Tax)
 * - 86 Ill. Adm. Code 130.2125 (Rebates and Dealer Incentives)
 * - 815 ILCS 375/11.1 (Motor Vehicle Retail Installment Sales Act - Doc Fee Cap)
 * - Public Act 102-0353 (2022 - Removed $10,000 trade-in cap)
 * - Chicago Municipal Code Chapter 3-32 (Personal Property Lease Transaction Tax)
 * - Illinois Auto Dealers Association (IADA) - 2025 Doc Fee Update
 * - ST-9-LSE Guide for Reporting Sales on Leased Vehicles
 */
export const US_IL: TaxRulesConfig = {
  stateCode: "IL",
  version: 2, // Updated 2025-01-13 with doc fee cap and lease tax details

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL
   *
   * Illinois allows full trade-in credit per 35 ILCS 105/3-45. The trade-in
   * value is deducted from the purchase price before calculating sales tax.
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
   * This is standard Illinois treatment per 86 Ill. Adm. Code 130.2075.
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
   * Doc Fee: TAXABLE (capped at $367.70 for 2025)
   *
   * Illinois doc fees are:
   * 1. TAXABLE as part of the sale (included in gross receipts)
   * 2. CAPPED at $367.70 effective January 1, 2025 (per 815 ILCS 375/11.1)
   * 3. Adjusted annually based on Consumer Price Index (CPI-U)
   * 4. 2024 cap was $358.03 (2.7% increase for 2025)
   *
   * Doc fees are considered part of the taxable sale price in Illinois per
   * Illinois Supreme Court ruling and 86 Ill. Adm. Code 130.2075.
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules:
   *
   * - Service contracts: TAXABLE on retail sales
   * - GAP insurance: TAXABLE on retail sales
   * - Title fee: NOT taxable (government fee)
   * - Registration fee: NOT taxable (government fee)
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: true,
      notes: "Extended warranties and service contracts are taxable on retail sales",
    },
    {
      code: "GAP",
      taxable: true,
      notes: "GAP insurance is taxable on retail sales",
    },
    {
      code: "TITLE",
      taxable: false,
      notes: "Secretary of State title fee is not taxable",
    },
    {
      code: "REG",
      taxable: false,
      notes: "Secretary of State registration fee is not taxable",
    },
  ],

  /**
   * Product Taxability:
   *
   * - Accessories: TAXABLE (part of selling price)
   * - Negative equity: NOT TAXABLE (when rolled into new loan, not considered cash-out)
   * - Service contracts: TAXABLE on retail (if bundled), NOT taxable if sold separately
   * - GAP: TAXABLE on retail (if bundled), NOT taxable if sold separately
   *
   * IMPORTANT DISTINCTION:
   * - Cash outs of trades: TAXABLE
   * - Bank payoffs rolled into new loans: NOT considered cash outs, NOT taxable
   * - Negative equity (payoff > trade value) rolled into loan: NOT taxable
   *
   * Per Illinois dealer sales tax guidance, "Car loan payoffs that are rolled into
   * the new car loan are not considered cash outs."
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: false, // NOT taxable when rolled into loan
  taxOnServiceContracts: true, // Taxable if bundled, not if sold separately
  taxOnGap: true, // Taxable if bundled, not if sold separately

  /**
   * Vehicle Tax Scheme: STATE_PLUS_LOCAL
   *
   * Illinois uses a combination of:
   * - State base rate: 6.25%
   * - Local rates: Varies by jurisdiction (Chicago/Cook County highest)
   *
   * Major rates:
   * - Chicago: 10.25% (6.25% state + 1.25% city + 1.75% Cook County + 1% RTA)
   * - Cook County (outside Chicago): 9% (6.25% state + 1.75% county + 1% RTA)
   * - Rest of state: Varies by county (typically 6.25% to 8.75%)
   *
   * Chicago has one of the highest combined vehicle sales tax rates in the US.
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
     * Illinois taxes leases on a MONTHLY basis. Sales tax is charged
     * on each monthly lease payment, not on the full capitalized cost upfront.
     *
     * SPECIAL: Chicago has an additional 0.5% lease transaction tax on top
     * of standard sales tax (handled by IL_CHICAGO_COOK special scheme).
     */
    method: "MONTHLY",

    /**
     * Cap Cost Reduction: NOT taxed
     *
     * Cap cost reductions (down payments, trade-ins, rebates applied
     * to reduce cap cost) are NOT taxed in Illinois.
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
     * Doc Fee on Leases: ALWAYS taxable
     *
     * Doc fees on leases are taxable in Illinois and are typically
     * taxed upfront (capitalized or paid at signing).
     */
    docFeeTaxability: "ALWAYS",

    /**
     * Trade-in Credit on Leases: CAP_COST_ONLY (effective since Jan 1, 2015)
     *
     * IMPORTANT: Starting January 1, 2015, Illinois ELIMINATED the trade-in
     * tax credit benefit on leases. Trade-ins still reduce the capitalized cost,
     * but since tax is now charged on the monthly payment (not the cap cost),
     * there is effectively NO TAX CREDIT from the trade-in.
     *
     * Before 2015: Tax was on full cap cost → trade-in reduced taxable base
     * After 2015: Tax is on monthly payment → trade-in has no tax benefit
     *
     * Trade-ins still have value (reduce monthly payment), but provide no
     * direct sales tax savings on leases in Illinois.
     */
    tradeInCredit: "CAP_COST_ONLY", // Reduces cap cost but not taxable base

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
     * - Doc fee: Taxable (upfront)
     * - Service contracts: NOT taxable when added to cap cost
     * - GAP: NOT taxable when added to cap cost
     * - Title: Not taxable
     * - Registration: Not taxable
     *
     * Backend products (VSC, GAP) are typically NOT taxed when
     * capitalized into a lease in Illinois (different from retail).
     */
    feeTaxRules: [
      { code: "DOC_FEE", taxable: true, notes: "Doc fee taxed upfront" },
      {
        code: "SERVICE_CONTRACT",
        taxable: false,
        notes: "Service contracts not taxed when capitalized into lease",
      },
      {
        code: "GAP",
        taxable: false,
        notes: "GAP not taxed when capitalized into lease",
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
     * Tax Fees Upfront: TRUE
     *
     * Fees that are taxable on leases (like doc fee) are taxed upfront,
     * not spread across monthly payments.
     */
    taxFeesUpfront: true,

    /**
     * Special Scheme: IL_CHICAGO_COOK
     *
     * Illinois has special lease taxation rules, particularly in Chicago/Cook County:
     *
     * CHICAGO RESIDENTS SPECIAL (Most Important!):
     * - Additional 8% PERSONAL PROPERTY LEASE USE TAX applies to Chicago residents only
     * - This is ON TOP OF the standard sales tax rate on lease payments
     * - Total tax for Chicago residents: 9.5% sales tax + 8% use tax = 17.5% effective on leases
     * - Only applies to Chicago RESIDENTS (based on residency, not dealer location)
     * - Codified in Chicago Municipal Code Chapter 3-32
     *
     * CHICAGO RETAIL (Non-Lease):
     * - 10.25% total (6.25% state + 1.25% city + 1.75% Cook + 1% RTA)
     *
     * SUBURBAN COOK COUNTY:
     * - 8.25% sales tax (6.25% state + 1.75% county + 0.25% local varies)
     * - NO additional use tax on leases
     *
     * REST OF STATE:
     * - Standard monthly lease taxation
     * - No additional lease-specific taxes
     * - Varies by local rates (6.25% to ~8.75%)
     *
     * KEY POINT: The Chicago 8% use tax is THE critical difference for leasing.
     * Chicago residents pay significantly more tax on leases than purchases.
     */
    specialScheme: "IL_CHICAGO_COOK",

    notes:
      "Illinois lease taxation: MONTHLY payment method since Jan 1, 2015. CRITICAL: Chicago " +
      "residents pay additional 8% use tax on lease payments ON TOP OF 9.5% sales tax (17.5% total). " +
      "Suburban Cook County: 8.25% sales tax, no additional use tax. Trade-in NO LONGER provides " +
      "credit on leases (since 2015 law change). Backend products (VSC, GAP) not taxed when " +
      "capitalized. Doc fee is taxed upfront. Tax is on payment amount only, not full cap cost.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: LIMITED (dealer only)
   *
   * Illinois provides LIMITED reciprocity credits for sales tax paid
   * in other states, but with significant restrictions:
   *
   * Key rules:
   * - Credit ONLY applies if vehicle purchased from a DEALER in another state
   * - NO credit for private party purchases (even with tax paid)
   * - Credit is limited to IL tax rate (cannot exceed what IL would charge)
   * - Requires proof of tax paid (dealer invoice showing tax)
   * - Applies to both retail and lease transactions (if dealer purchase)
   *
   * Example 1 (Dealer):
   * - Vehicle purchased from dealer in IN with 7% tax paid
   * - IL rate is 6.25% (before local)
   * - Customer gets credit up to IL rate (pays difference if local taxes apply)
   *
   * Example 2 (Private Party - NO CREDIT):
   * - Vehicle purchased from private party in WI with tax paid
   * - IL rate is 6.25%
   * - Customer owes FULL IL tax (no credit for private party purchases)
   *
   * This is a UNIQUE restriction - most states don't distinguish between
   * dealer and private party purchases for reciprocity.
   */
  reciprocity: {
    enabled: true, // But limited to dealer purchases only
    scope: "BOTH",
    homeStateBehavior: "CREDIT_UP_TO_STATE_RATE",
    requireProofOfTaxPaid: true,
    basis: "TAX_PAID",
    capAtThisStatesTax: true,
    hasLeaseException: false,
    notes:
      "Illinois provides LIMITED reciprocity - credit ONLY for dealer purchases, " +
      "NOT private party sales. Requires proof of tax paid. Credit capped at IL rate. " +
      "If out-of-state tax exceeds IL tax, no additional tax due. If less, pay difference. " +
      "IMPORTANT: Private party purchases get NO credit regardless of tax paid elsewhere.",
  },

  extras: {
    lastUpdated: "2025-01-13",
    researchedBy: "Tax Research Specialist",
    sources: [
      "Illinois Department of Revenue (tax.illinois.gov)",
      "35 ILCS 105/3-45 - Use Tax Act (Trade-in Credit)",
      "86 Ill. Adm. Code 130.2075 - Vehicle Sales Tax",
      "86 Ill. Adm. Code 130.2125 - Rebates and Dealer Incentives",
      "815 ILCS 375/11.1 - Motor Vehicle Retail Installment Sales Act",
      "Public Act 102-0353 (2022) - Removed $10,000 trade-in cap",
      "Chicago Municipal Code Chapter 3-32 - Personal Property Lease Transaction Tax",
      "Illinois Auto Dealers Association - 2025 Doc Fee Update",
      "ST-9-LSE Guide for Reporting Sales on Leased Vehicles",
    ],
    notes:
      "Illinois has some of the highest vehicle tax rates in the US. RETAIL: Chicago 10.25%, " +
      "typical suburban Cook 8.25%, rest of state 6.25%+ local. LEASES: Chicago residents pay " +
      "MASSIVE 17.5% effective (9.5% sales tax + 8% use tax). Doc fee capped at $367.70 (2025). " +
      "Limited reciprocity - dealer purchases only, not private party. Service contracts and GAP " +
      "taxable on retail but NOT on leases if separately stated. Trade-in credit: FULL on retail " +
      "(since 2022), NO TAX BENEFIT on leases (since 2015 law change to monthly taxation).",
    docFeeCapAmount: 367.70, // 2025 cap (adjusted annually for CPI)
    docFeeCapYear: 2025,
    docFeeCapPriorYear: 358.03, // 2024 cap for reference
    maxCombinedRate: 17.5, // Chicago LEASES: 9.5% sales tax + 8% use tax
    maxRetailRate: 10.25, // Chicago retail
    chicagoLeaseUseTax: 8.0, // Additional 8% use tax on leases (Chicago residents only)
    majorCityRates: {
      ChicagoRetail: 10.25, // 6.25% state + 1.25% city + 1.75% Cook + 1% RTA
      ChicagoLease: 9.5, // Sales tax component only
      ChicagoLeaseEffective: 17.5, // 9.5% sales tax + 8% use tax
      CookCountySuburban: 8.25, // 6.25% state + 1.75% county + 0.25% varies
      StateBase: 6.25, // State only (most rural jurisdictions)
      TypicalRange: "6.25% - 8.75%", // Most jurisdictions outside Chicago/Cook
    },
    keyLawChanges: {
      "2015-01-01": "Lease taxation changed from full cap cost to monthly payments",
      "2022-01-01": "Removed $10,000 trade-in cap (Public Act 102-0353)",
    },
  },
};

export default US_IL;
