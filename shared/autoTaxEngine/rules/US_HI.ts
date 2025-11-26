import type { TaxRulesConfig } from "../types";

/**
 * HAWAII TAX RULES - GENERAL EXCISE TAX (GET) SYSTEM
 *
 * Researched: 2025-11-14
 * Version: 1
 *
 * CRITICAL: Hawaii does NOT use traditional sales tax - it uses GET (General Excise Tax)
 *
 * KEY FACTS:
 * - Hawaii uses GET (General Excise Tax) instead of traditional sales tax
 * - Base GET rate: 4% (imposed on the seller, typically passed to buyer)
 * - County surcharges: 0.5% (all counties as of 2025)
 * - Maximum pass-on rate: 4.712% (what businesses can charge customers)
 * - Trade-in credit: NONE (no reduction for trade-in value)
 * - Manufacturer rebates: TAXABLE (GET calculated before rebates applied)
 * - Dealer rebates: TAXABLE (GET calculated before rebates applied)
 * - Doc fee: TAXABLE (subject to GET at 4%/4.5% rate)
 * - Service contracts: TAXABLE at 4%/4.5% when sold by dealer
 * - GAP insurance: Complex (insurance commissions at 0.15%, but dealer sales likely at 4%)
 * - Lease taxation: MONTHLY (GET on each monthly payment)
 * - Reciprocity: YES (credit for tax paid elsewhere, capped at HI amount)
 *
 * UNIQUE GET SYSTEM:
 * - GET is a tax on the PRIVILEGE OF DOING BUSINESS (not a sales tax)
 * - Tax is imposed on the SELLER, but typically passed to customer
 * - Applies to gross receipts/income with minimal deductions
 * - Nearly all transactions taxed (services, goods, etc.)
 * - Different rates for different business activities:
 *   - 4.0%: Retail, services, most business activities
 *   - 0.5%: Wholesaling, manufacturing, producing
 *   - 0.15%: Insurance commissions
 * - County surcharges (0.5%) only apply to 4% rate activities
 *
 * COUNTY SURCHARGE RATES (2025):
 * - Honolulu County: 0.5% (effective 1/1/2007 - 12/31/2030)
 * - Hawaii County: 0.5% (effective 1/1/2020 - 12/31/2030)
 * - Maui County: 0.5% (effective 1/1/2024 - 12/31/2030)
 * - Kauai County: 0.5% (effective 1/1/2019 - 12/31/2030)
 *
 * SOURCES:
 * - Hawaii Department of Taxation
 * - Hawaii Revised Statutes Chapter 237 - General Excise Tax Law
 * - Hawaii Revised Statutes Chapter 238 - Use Tax Law
 * - Hawaii Administrative Rules Title 18, Chapter 237
 * - County Surcharge information from tax.hawaii.gov
 */
export const US_HI: TaxRulesConfig = {
  stateCode: "HI",
  version: 1,

  // ============================================================================
  // RETAIL TRANSACTION RULES (GET SYSTEM)
  // ============================================================================

  /**
   * Trade-in Policy: NONE
   *
   * Hawaii does NOT allow trade-in credit to reduce the taxable base.
   * GET is calculated on the full purchase price of the new vehicle,
   * regardless of any trade-in value.
   *
   * Method 1 (most common): Dealer reports full sale price as gross income
   * and pays GET on it. When the trade-in is later sold, that sale is
   * excluded from gross income (avoiding double taxation).
   */
  tradeInPolicy: { type: "NONE" },

  /**
   * Rebate Rules:
   *
   * Under Hawaii GET, rebates are TAXABLE:
   * - Manufacturer rebates: Taxable (GET calculated before rebate applied)
   * - Dealer rebates: Taxable (GET calculated before rebate applied)
   *
   * The GET is based on gross income without deductions for rebates or
   * incentives provided to the customer.
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: true,
      notes: "GET calculated on full price before manufacturer rebates applied. Rebates do not reduce taxable base."
    },
    {
      appliesTo: "DEALER",
      taxable: true,
      notes: "GET calculated on full price before dealer rebates applied. Rebates do not reduce taxable base."
    },
  ],

  /**
   * Doc Fee: TAXABLE
   *
   * Documentation fees are subject to GET at the 4% (or 4.5% with county
   * surcharge) rate as part of the dealer's gross receipts from the sale.
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules:
   *
   * Under GET, most fees and products sold by dealers are taxable:
   * - Service contracts: TAXABLE at 4%/4.5% when sold by dealer (part of gross receipts)
   * - GAP: Complex - insurance commissions at 0.15%, but dealer retail sales likely at 4%/4.5%
   * - Title/Registration: Government fees, not taxable
   *
   * Note: Insurance commissions are taxed at 0.15%, but when dealers sell
   * insurance products as part of vehicle transaction, the treatment may vary.
   * Conservative approach: assume 4%/4.5% rate for dealer-sold products.
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: true,
      notes: "Service contracts sold by dealer subject to 4%/4.5% GET as part of gross receipts"
    },
    {
      code: "GAP",
      taxable: true,
      notes: "GAP insurance sold by dealer likely subject to 4%/4.5% GET (insurance commissions are 0.15%, but dealer sales may differ)"
    },
    {
      code: "TITLE",
      taxable: false,
      notes: "Government fee, not taxable"
    },
    {
      code: "REG",
      taxable: false,
      notes: "Government fee, not taxable"
    },
  ],

  /**
   * Product Taxability:
   *
   * Under GET:
   * - Accessories: TAXABLE (included in gross receipts, subject to GET)
   * - Negative equity: TAXABLE (increases total amount, subject to GET)
   * - Service contracts: TAXABLE at 4%/4.5%
   * - GAP: TAXABLE at 4%/4.5% (when sold by dealer)
   */
  taxOnAccessories: true, // Dealer-installed accessories subject to GET
  taxOnNegativeEquity: true, // Negative equity increases gross receipts
  taxOnServiceContracts: true, // Subject to GET at 4%/4.5%
  taxOnGap: true, // Subject to GET at 4%/4.5% when sold by dealer

  /**
   * Vehicle Tax Scheme: STATE_PLUS_LOCAL
   *
   * Hawaii uses GET with county surcharges:
   * - Base state rate: 4%
   * - County surcharge: 0.5% (all counties as of 2025)
   * - Total effective rate: 4.5%
   * - Maximum pass-on rate: 4.712% (what businesses legally can charge)
   *
   * Note: The 4.712% pass-on rate accounts for the pyramiding effect of
   * GET (tax-on-tax), as the seller must pay GET on the GET amount itself.
   */
  vehicleTaxScheme: "STATE_PLUS_LOCAL",
  vehicleUsesLocalSalesTax: true, // County surcharges apply

  // ============================================================================
  // LEASE TRANSACTION RULES (GET ON MONTHLY PAYMENTS)
  // ============================================================================

  leaseRules: {
    /**
     * Lease Method: MONTHLY
     *
     * Hawaii leases are taxed using GET on monthly payments:
     * - 4% base GET + 0.5% county surcharge = 4.5% total
     * - Maximum pass-on rate: 4.712%
     * - Tax is applied to each monthly payment
     * - Lessor (leasing company) is subject to GET on lease income
     */
    method: "MONTHLY",

    /**
     * Cap Cost Reduction: Likely NOT taxed upfront
     *
     * Down payments and cap reductions reduce the capitalized cost and
     * thus reduce monthly payments, which reduces the GET on each payment.
     * The cap reduction itself is typically not taxed separately upfront.
     *
     * Note: Specific Hawaii guidance on cap reduction taxability was not
     * found in research. Conservative approach assumes not taxed upfront,
     * but reduces monthly payment (and thus monthly GET).
     */
    taxCapReduction: false,

    /**
     * Rebate Behavior on Leases: FOLLOW_RETAIL_RULE
     *
     * Rebates applied to leases would follow similar treatment as retail:
     * GET is calculated on gross income without deduction for rebates.
     */
    rebateBehavior: "FOLLOW_RETAIL_RULE",

    /**
     * Doc Fee on Leases: ALWAYS taxable
     *
     * Doc fees on leases are subject to GET at 4%/4.5% rate.
     */
    docFeeTaxability: "ALWAYS",

    /**
     * Trade-in Credit on Leases: NONE
     *
     * Similar to retail sales, Hawaii does not provide trade-in credit
     * on leases. Trade-in does not reduce the taxable lease payments.
     */
    tradeInCredit: "NONE",

    /**
     * Negative Equity on Leases: Taxable
     *
     * Negative equity rolled into a lease increases the capitalized cost,
     * which increases monthly payments and thus the GET on each payment.
     */
    negativeEquityTaxable: true,

    /**
     * Fee Taxability on Leases:
     *
     * - Doc fee: TAXABLE at 4%/4.5%
     * - Service contracts: TAXABLE at 4%/4.5% when capitalized
     * - GAP: TAXABLE at 4%/4.5% when capitalized
     * - Title: Not taxable (government fee)
     * - Registration: Not taxable (government fee)
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: true,
        notes: "Doc fee subject to 4%/4.5% GET on leases"
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: true,
        notes: "Service contracts subject to GET when capitalized into lease"
      },
      {
        code: "GAP",
        taxable: true,
        notes: "GAP subject to GET when capitalized into lease"
      },
      { code: "TITLE", taxable: false },
      { code: "REG", taxable: false },
    ],

    /**
     * Title Fee Rules on Leases:
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
     * Taxable fees on leases are taxed upfront (subject to GET).
     */
    taxFeesUpfront: true,

    /**
     * Special Scheme: NONE
     *
     * Hawaii GET applies to leases the same way it applies to retail,
     * just on monthly payments instead of purchase price.
     */
    specialScheme: "NONE",

    notes:
      "Hawaii leases subject to GET (4% base + 0.5% county surcharge = 4.5% effective rate, 4.712% max pass-on) on monthly payments. " +
      "Lessor is subject to GET on lease income. No trade-in credit on leases.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: YES (LIMITED)
   *
   * Hawaii provides reciprocity for use tax on vehicles:
   * - Credit for sales or use tax paid to another state
   * - Credit is capped at the Hawaii GET/use tax amount (4% or 4.5% with surcharge)
   * - Requires proof of tax paid (title, registration, receipt)
   * - Applies when a vehicle purchased elsewhere is brought to Hawaii
   * - No depreciation allowed if vehicle brought within 90 days of purchase
   *
   * Note: Not all states reciprocate Hawaii's credit. For example, Florida
   * does not allow credit for Hawaii GET, but Hawaii allows credit for
   * Florida sales tax.
   *
   * Example:
   * - Buy vehicle in California (CA sales tax: 7.25% = $2,175 on $30k vehicle)
   * - Bring to Hawaii and register (HI use tax: 4.5% = $1,350)
   * - Credit: $1,350 (capped at HI amount)
   * - Owe HI: $0 (CA tax exceeds HI use tax)
   *
   * Example 2:
   * - Buy vehicle in Oregon (no sales tax)
   * - Bring to Hawaii and register (HI use tax: 4.5% = $1,350)
   * - Credit: $0 (no tax paid in OR)
   * - Owe HI: $1,350 (full HI use tax)
   */
  reciprocity: {
    enabled: true,
    scope: "BOTH", // Applies to retail and lease
    homeStateBehavior: "CREDIT_UP_TO_STATE_RATE",
    requireProofOfTaxPaid: true,
    basis: "TAX_PAID",
    capAtThisStatesTax: true, // Credit capped at Hawaii use tax amount
    hasLeaseException: false,

    notes:
      "Hawaii allows credit for sales/use tax paid to another state, capped at Hawaii use tax (4% or 4.5% with county surcharge). " +
      "Proof of tax paid required (prior title, registration, receipt). " +
      "No depreciation allowed if vehicle brought to Hawaii within 90 days of purchase. " +
      "Note: Not all states reciprocate - some states (e.g., Florida) do not recognize Hawaii GET for credit purposes.",
  },

  // ============================================================================
  // HAWAII GET CONFIGURATION (State-Specific Extras)
  // ============================================================================

  extras: {
    // Hawaii GET-specific configuration
    hawaiiGET: {
      baseRate: 0.04, // 4% base GET rate
      countySurcharge: 0.005, // 0.5% county surcharge (all counties as of 2025)
      effectiveRate: 0.045, // 4.5% total (base + surcharge)
      maxPassOnRate: 0.04712, // 4.712% maximum pass-on rate (accounts for pyramiding)

      // County-specific information
      counties: [
        { name: "Honolulu", surcharge: 0.005, effective: "2007-01-01", expires: "2030-12-31" },
        { name: "Hawaii", surcharge: 0.005, effective: "2020-01-01", expires: "2030-12-31" },
        { name: "Maui", surcharge: 0.005, effective: "2024-01-01", expires: "2030-12-31" },
        { name: "Kauai", surcharge: 0.005, effective: "2019-01-01", expires: "2030-12-31" },
      ],

      // Rate schedule for different business activities
      rateSchedule: {
        retail: 0.04, // Retail sales, most business activities
        wholesale: 0.005, // Wholesaling, manufacturing, producing
        insurance: 0.0015, // Insurance commissions (0.15%)
      },

      // Trade-in handling
      tradeInMethod: "METHOD_1", // Dealer reports full sale, excludes trade-in resale
      allowTradeInCredit: false, // No trade-in credit reduces taxable base

      // Use tax information
      useTax: {
        rate: 0.04, // 4% base use tax
        appliesTo: "LANDED_VALUE", // Use tax on landed value (value when arrives in HI)
        allowCredit: true, // Credit for tax paid elsewhere
        maxCreditRate: 0.045, // Maximum credit (including county surcharge)
        noDepreciationWindow: 90, // Days - no depreciation if brought within 90 days
      },
    },

    lastUpdated: "2025-11-14",
    sources: [
      "Hawaii Department of Taxation",
      "Hawaii Revised Statutes Chapter 237 - General Excise Tax Law",
      "Hawaii Revised Statutes Chapter 238 - Use Tax Law",
      "Hawaii Administrative Rules Title 18, Chapter 237",
      "County Surcharge information from tax.hawaii.gov",
      "Sales Tax Handbook - Hawaii Vehicle Sales Tax",
    ],

    notes:
      "Hawaii uses GET (General Excise Tax) instead of traditional sales tax. GET is a tax on the privilege " +
      "of doing business, imposed on the seller's gross receipts. Effective rate: 4.5% (4% base + 0.5% county surcharge). " +
      "Maximum pass-on rate: 4.712% (accounts for pyramiding). NO trade-in credit (tax on full purchase price). " +
      "Rebates are TAXABLE (do not reduce GET base). Service contracts and GAP taxable at 4%/4.5% when sold by dealer. " +
      "Leases taxed monthly at same rates. Use tax reciprocity available with credit capped at HI amount. " +
      "County surcharges apply in all counties through 2030.",

    getRate: 4.5, // Effective GET rate with county surcharge
    baseGetRate: 4.0, // Base GET rate
    countySurchargeRate: 0.5, // County surcharge rate
    maxPassOnRate: 4.712, // Maximum visible pass-on rate
    useTaxRate: 4.5, // Use tax rate (with county surcharge)
  },
};

export default US_HI;
