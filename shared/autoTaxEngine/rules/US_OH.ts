import { TaxRulesConfig } from "../types";

/**
 * OHIO TAX RULES
 *
 * Researched: 2025-01-13
 * Version: 2
 *
 * KEY FACTS:
 * - Base state sales tax: 5.75%
 * - Local rates: Up to 2.25% county (Cuyahoga County highest at 8%)
 * - Trade-in credit: FULL for NEW vehicles, NONE for USED vehicles
 * - Doc fee: Capped at $387 or 10% of vehicle price (as of Oct 2024), NOT taxable
 * - Manufacturer rebates: NOT taxable (reduce sale price)
 * - Dealer rebates: Taxable (vendor rebates from third parties are taxable)
 * - Service contracts: Taxable on retail and lease
 * - GAP: Taxable on retail and lease
 * - Lease taxation: FULL_UPFRONT (tax on all payments collected at signing)
 * - Reciprocity: YES (credit for tax paid elsewhere up to OH rate)
 *
 * UNIQUE FEATURES:
 * - NEW vs USED distinction: Trade-in credit ONLY applies to new vehicle purchases
 * - Service contracts and GAP are BOTH taxable on leases (unlike many states)
 * - Lease tax is paid UPFRONT on all payments (not monthly)
 * - Doc fee cap adjusted annually for inflation (CPI-based)
 * - Good reciprocity policy with credit for out-of-state taxes
 *
 * SOURCES:
 * - Ohio Department of Taxation
 * - Ohio Revised Code 5739.02 (Sales and Use Tax)
 * - Ohio Revised Code 5739.029 (Trade-in Credit)
 * - Ohio Revised Code 4517.261 (Documentary Service Charge)
 * - Ohio Admin Code 5703-9-23 (Motor Vehicle Sales)
 * - Ohio Admin Code 5703-9-36 (Negative Equity Rules)
 * - Senate Bill 94 (2024) - Doc Fee Inflation Adjustment
 */
export const US_OH: TaxRulesConfig = {
  stateCode: "OH",
  version: 2,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL (NEW VEHICLES ONLY)
   *
   * CRITICAL: Ohio allows full trade-in credit ONLY for NEW vehicles per ORC 5739.029.
   * For USED vehicles, NO trade-in credit is allowed and tax is calculated on the
   * full purchase price.
   *
   * NEW Vehicle Example: $30,000 new car - $10,000 trade-in = $20,000 taxable base
   * USED Vehicle Example: $20,000 used car - $5,000 trade-in = $20,000 taxable base (no credit!)
   *
   * Implementation Note: The tax engine must distinguish between new and used vehicles
   * to apply this rule correctly. Consider adding a "vehicleCondition" field to the
   * calculation input.
   *
   * TODO: Verify if engine supports conditional trade-in policies based on vehicle condition
   */
  tradeInPolicy: { type: "FULL" }, // Only applies to NEW vehicles - see notes above

  /**
   * Rebate Rules:
   *
   * - Manufacturer rebates: NOT taxable - reduce the sale price before tax
   * - Dealer rebates: TAXABLE - vendor rebates from third parties are included
   *   in the taxable price per ORC 5739.02
   *
   * Ohio distinguishes between:
   * 1. Direct manufacturer-to-customer incentives (non-taxable)
   * 2. Unreimbursed dealer discounts (non-taxable)
   * 3. Vendor rebates/credits from third parties to dealer (TAXABLE)
   *
   * This is standard Ohio treatment per ORC 5739.02.
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: false,
      notes: "Manufacturer rebates reduce the purchase price before tax (ORC 5739.02)",
    },
    {
      appliesTo: "DEALER",
      taxable: true,
      notes:
        "Dealer rebates and vendor credits from third parties are taxable per ORC 5739.02. " +
        "Only unreimbursed dealer discounts are non-taxable.",
    },
  ],

  /**
   * Doc Fee: NOT TAXABLE (with cap)
   *
   * Ohio doc fees as of October 24, 2024 (per Senate Bill 94):
   * 1. NOT taxable (government administrative fee, not part of sale)
   * 2. CAPPED at $387 or 10% of vehicle price, whichever is LOWER
   * 3. Cap adjusts annually for inflation based on Consumer Price Index (CPI)
   * 4. Ohio BMV publishes new cap every September 30th
   *
   * Previous cap was $250 before Oct 24, 2024.
   *
   * Example: $3,500 vehicle → max doc fee is $350 (10% rule), not $387
   * Example: $10,000 vehicle → max doc fee is $387 (cap applies)
   *
   * Source: ORC 4517.261, Senate Bill 94 (2024)
   *
   * TODO: Update cap amount annually based on BMV published rates
   */
  docFeeTaxable: false, // Doc fees are NOT taxable in Ohio

  /**
   * Fee Taxability Rules:
   *
   * - Service contracts (VSC/Extended Warranties): TAXABLE on retail sales
   * - GAP insurance: TAXABLE on retail sales (when part of purchase/lease agreement)
   * - Doc fee: NOT taxable (government administrative fee)
   * - Title fee: NOT taxable (BMV government fee)
   * - Registration fee: NOT taxable (BMV government fee)
   * - Acquisition fees: TAXABLE on leases
   * - Disposition fees: TAXABLE on leases
   *
   * Source: ORC 5739.02, Ohio Admin Code 5703-9-23
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: true,
      notes:
        "Optional maintenance contracts and extended warranties are taxable on retail sales per ORC 5739.02",
    },
    {
      code: "GAP",
      taxable: true,
      notes:
        "GAP (Guaranteed Auto Protection) insurance is taxable when provided within purchase/lease agreement terms",
    },
    {
      code: "DOC_FEE",
      taxable: false,
      notes: "Documentary service charge is NOT taxable (capped at $387 or 10% of price per ORC 4517.261)",
    },
    {
      code: "TITLE",
      taxable: false,
      notes: "BMV title fee is not taxable (government fee)",
    },
    {
      code: "REG",
      taxable: false,
      notes: "BMV registration fee is not taxable (government fee)",
    },
    {
      code: "ACQUISITION_FEE",
      taxable: true,
      notes: "Lease acquisition fees are taxable",
    },
    {
      code: "DISPOSITION_FEE",
      taxable: true,
      notes: "Lease disposition fees are taxable",
    },
  ],

  /**
   * Product Taxability:
   *
   * - Accessories: Taxable
   * - Negative equity: Taxable (rolled into financed amount)
   * - Service contracts: Taxable
   * - GAP: Taxable
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: true,
  taxOnServiceContracts: true,
  taxOnGap: true,

  /**
   * Vehicle Tax Scheme: STATE_PLUS_LOCAL
   *
   * Ohio uses a combination of state and county rates:
   * - State base rate: 5.75% (applies statewide)
   * - County rates: 0% to 2.25%
   * - Combined rates: 5.75% to 8.0% (can reach 8.25% in some jurisdictions)
   *
   * Major county rates (2025):
   * - Cuyahoga County (Cleveland): 8.0% (5.75% state + 2.25% county - highest)
   * - Franklin County (Columbus): 7.5% (5.75% state + 1.75% county)
   * - Hamilton County (Cincinnati): 7.5% (5.75% state + 1.75% county)
   * - Summit County (Akron): 6.75% (5.75% state + 1.0% county)
   * - Some COTA districts: Up to 8.25% (includes transit authority tax)
   * - Average combined rate statewide: 7.181%
   *
   * Tax is calculated based on the point of sale (dealer location), NOT buyer's residence.
   *
   * IMPORTANT: County rates can change April 1st each year. Verify current rates
   * with Ohio Department of Taxation before calculating tax.
   *
   * Source: Ohio Department of Taxation, Avalara Tax Rate Tables 2025
   */
  vehicleTaxScheme: "STATE_PLUS_LOCAL",
  vehicleUsesLocalSalesTax: true,

  // ============================================================================
  // LEASE TRANSACTION RULES
  // ============================================================================

  leaseRules: {
    /**
     * Lease Method: FULL_UPFRONT
     *
     * Ohio taxes leases by collecting tax UPFRONT on all lease payments.
     *
     * Per ORC 5739.02(A)(2):
     * "...the tax shall be collected by the vendor at the time the lease or rental
     * is consummated and shall be calculated by the vendor on the basis of the
     * total amount to be paid by the lessee or renter under the lease agreement."
     *
     * How it works:
     * 1. Calculate total of all monthly payments (payment × term)
     * 2. Apply sales tax rate to this total
     * 3. Collect full tax amount at lease signing
     * 4. If amounts are unknown at signing, collect additional tax when billed
     *
     * Example:
     * - Monthly payment: $300
     * - Lease term: 36 months
     * - Total payments: $10,800
     * - Tax rate: 6.5%
     * - Tax due at signing: $702
     *
     * This makes Ohio less lease-friendly than states allowing monthly tax payment.
     *
     * Source: ORC 5739.02(A)(2)
     */
    method: "FULL_UPFRONT",

    /**
     * Cap Cost Reduction: NOT taxed
     *
     * Cap cost reductions (down payments, trade-ins, rebates applied
     * to reduce cap cost) are NOT taxed in Ohio.
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
     * Doc Fee on Leases: NEVER taxable
     *
     * Doc fees on leases are NOT taxable in Ohio (same as retail).
     * The documentary service charge is considered a government
     * administrative fee, not part of the taxable sale.
     *
     * Cap: $387 or 10% of vehicle price (whichever is lower)
     *
     * Source: ORC 4517.261
     */
    docFeeTaxability: "NEVER",

    /**
     * Trade-in Credit on Leases: CAP_COST_ONLY
     *
     * Trade-ins on leases reduce the capitalized cost, which in turn
     * reduces the monthly payment and total lease payments.
     *
     * Since Ohio taxes the total of all lease payments upfront, a trade-in
     * that reduces cap cost indirectly reduces the taxable base.
     *
     * IMPORTANT: Same new vs. used vehicle distinction applies:
     * - NEW vehicle leases: Trade-in reduces cap cost
     * - USED vehicle leases: No trade-in credit allowed
     *
     * Source: ORC 5739.029, 5739.02(A)(2)
     */
    tradeInCredit: "CAP_COST_ONLY",

    /**
     * Negative Equity on Leases: Taxable
     *
     * Negative equity (rolled-in loan payoff) increases the capitalized cost,
     * which increases monthly payments and the total lease payment amount.
     *
     * Since Ohio taxes the sum of all lease payments upfront, negative equity
     * is effectively taxed as it increases the taxable base.
     *
     * Source: Ohio Admin Code 5703-9-36 (Negative Equity Rules)
     */
    negativeEquityTaxable: true,

    /**
     * Fee Taxability on Leases:
     *
     * - Doc fee: NOT taxable (government fee)
     * - Service contracts: TAXABLE when added to cap cost (UNIQUE TO OHIO)
     * - GAP: TAXABLE when added to cap cost (UNIQUE TO OHIO)
     * - Acquisition fee: TAXABLE (when part of lease agreement)
     * - Disposition fee: TAXABLE (when part of lease agreement)
     * - Title: NOT taxable (BMV government fee)
     * - Registration: NOT taxable (BMV government fee)
     * - Excess mileage fees: TAXABLE (when billed)
     * - Wear and tear fees: TAXABLE (when billed)
     *
     * CRITICAL DIFFERENCE: Ohio is one of the few states where backend products
     * (VSC, GAP) remain TAXABLE even when capitalized into a lease. Most states
     * exempt these products on leases. This significantly increases Ohio lease costs.
     *
     * For fees not known at lease inception (excess mileage, disposition, etc.),
     * tax is collected when those fees are billed to the lessee per ORC 5739.02(A)(2).
     *
     * Source: ORC 5739.02, Ohio Admin Code 5703-9-23
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: false,
        notes: "Documentary service charge NOT taxable (capped at $387 or 10% per ORC 4517.261)",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: true,
        notes:
          "Service contracts TAXABLE on leases in Ohio (UNIQUE - most states exempt on leases). " +
          "Tax collected upfront if capitalized, or when billed if added later.",
      },
      {
        code: "GAP",
        taxable: true,
        notes:
          "GAP TAXABLE on leases in Ohio (UNIQUE - most states exempt on leases). " +
          "Tax collected upfront if capitalized, or when billed if added later.",
      },
      {
        code: "ACQUISITION_FEE",
        taxable: true,
        notes: "Lease acquisition fees are taxable, collected at lease signing",
      },
      {
        code: "DISPOSITION_FEE",
        taxable: true,
        notes: "Lease disposition fees are taxable, collected when billed at lease end",
      },
      {
        code: "EXCESS_MILEAGE",
        taxable: true,
        notes: "Excess mileage charges are taxable, collected when billed at lease end",
      },
      {
        code: "TITLE",
        taxable: false,
        notes: "BMV title fee is NOT taxable (government fee)",
      },
      {
        code: "REG",
        taxable: false,
        notes: "BMV registration fee is NOT taxable (government fee)",
      },
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
     * All taxable fees and products (service contracts, GAP, acquisition fees)
     * that are known at lease inception are taxed upfront at signing.
     *
     * Fees not known at signing (disposition, excess mileage, wear/tear)
     * are taxed when billed to the lessee.
     *
     * Since Ohio uses FULL_UPFRONT lease taxation method, all known amounts
     * are taxed at signing, including capitalized F&I products.
     */
    taxFeesUpfront: true,

    /**
     * Special Scheme: NONE
     *
     * Ohio uses standard FULL_UPFRONT lease taxation with no special
     * schemes, luxury surcharges, or additional fees beyond the base
     * state + local sales tax rates.
     *
     * The key differences from other states:
     * 1. Tax paid upfront on all payments (not monthly)
     * 2. Backend products (VSC, GAP) remain taxable on leases
     * 3. Same state + local rates as retail sales
     */
    specialScheme: "NONE",

    notes:
      "Ohio lease taxation: FULL_UPFRONT method - tax on total lease payments collected at signing. " +
      "Standard state (5.75%) + local rates apply. " +
      "UNIQUE FEATURES: (1) Backend products (VSC, GAP) are TAXABLE when capitalized into lease " +
      "(unlike most states where they're exempt). (2) Tax on all payments paid upfront, not monthly. " +
      "(3) Trade-in credit only applies to NEW vehicle leases. " +
      "(4) Doc fee NOT taxable (capped at $387 or 10%). " +
      "Variable fees (disposition, excess mileage) taxed when billed at lease end.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: ENABLED (with cap and restrictions)
   *
   * Ohio DOES provide reciprocity credits for sales tax paid in other states,
   * but with important limitations and requirements.
   *
   * HOW IT WORKS:
   * - Ohio residents who purchase vehicles out-of-state and pay sales tax there
   *   can receive a credit against Ohio use tax when registering the vehicle
   * - Credit is capped at the amount of Ohio tax that would have been due
   * - Requires proof of tax paid (sales receipt, tax payment receipt)
   * - If out-of-state tax ≥ Ohio tax → no additional tax owed
   * - If out-of-state tax < Ohio tax → customer pays the difference
   *
   * NONRESIDENT EXEMPTION:
   * Ohio dealers selling to nonresidents do NOT collect Ohio sales tax if:
   * - Customer certifies intent to immediately remove vehicle from Ohio
   * - Customer completes Exemption Form STEC NR
   * - Vehicle will be registered in customer's home state
   *
   * EXCEPTION: Ohio dealers MUST collect Ohio tax from residents of these states:
   * - Arizona, California, Florida, Indiana, Massachusetts, Michigan, South Carolina
   * (These states have reciprocal collection agreements with Ohio)
   *
   * EXAMPLES:
   * 1. Ohio resident buys in Michigan (6% tax paid)
   *    - Ohio rate: 7.5% (5.75% state + 1.75% local in Franklin County)
   *    - Credit: 6% (Michigan tax paid)
   *    - Ohio tax owed: 1.5% (7.5% - 6% = 1.5%)
   *
   * 2. Ohio resident buys in Indiana (7% tax paid)
   *    - Ohio rate: 6.5% (5.75% state + 0.75% local in Summit County)
   *    - Credit: 6.5% (capped at Ohio rate)
   *    - Ohio tax owed: $0 (Indiana tax exceeds Ohio tax)
   *
   * 3. Pennsylvania resident buys in Ohio
   *    - NO Ohio tax collected (exempt with Form STEC NR)
   *    - Customer pays PA tax when registering at home
   *
   * SOURCES:
   * - Ohio Department of Taxation Information Release ST 2007-04
   * - ORC 5739.02 (Use Tax and Credits)
   */
  reciprocity: {
    enabled: true,
    scope: "BOTH", // Applies to both retail and lease transactions
    homeStateBehavior: "CREDIT_UP_TO_STATE_RATE",
    requireProofOfTaxPaid: true,
    basis: "TAX_PAID", // Credit based on actual tax paid, not just tax due
    capAtThisStatesTax: true, // Credit cannot exceed Ohio tax owed
    hasLeaseException: false,

    overrides: [
      {
        originState: "AZ",
        notes: "Ohio dealers must collect Ohio tax from Arizona residents (reciprocal agreement)",
      },
      {
        originState: "CA",
        notes: "Ohio dealers must collect Ohio tax from California residents (reciprocal agreement)",
      },
      {
        originState: "FL",
        notes: "Ohio dealers must collect Ohio tax from Florida residents (reciprocal agreement)",
      },
      {
        originState: "IN",
        notes: "Ohio dealers must collect Ohio tax from Indiana residents (reciprocal agreement)",
      },
      {
        originState: "MA",
        notes: "Ohio dealers must collect Ohio tax from Massachusetts residents (reciprocal agreement)",
      },
      {
        originState: "MI",
        notes: "Ohio dealers must collect Ohio tax from Michigan residents (reciprocal agreement)",
      },
      {
        originState: "SC",
        notes: "Ohio dealers must collect Ohio tax from South Carolina residents (reciprocal agreement)",
      },
    ],

    notes:
      "Ohio provides reciprocity credits for tax paid in other states, capped at Ohio tax rate. " +
      "Requires proof of tax paid (sales receipt showing tax amount). " +
      "Nonresidents purchasing in Ohio are generally exempt (Form STEC NR required), " +
      "EXCEPT residents of AZ, CA, FL, IN, MA, MI, SC due to reciprocal collection agreements. " +
      "Ohio dealers selling to residents of those 7 states must collect Ohio sales tax.",
  },

  extras: {
    lastUpdated: "2025-01-13",
    researchVersion: 2,
    sources: [
      "Ohio Department of Taxation",
      "Ohio Revised Code 5739.02 - Sales and Use Tax",
      "Ohio Revised Code 5739.029 - Trade-in Credit",
      "Ohio Revised Code 4517.261 - Documentary Service Charge",
      "Ohio Admin Code 5703-9-23 - Motor Vehicle Sales",
      "Ohio Admin Code 5703-9-36 - Negative Equity in Motor Vehicle Sales/Leases",
      "Ohio Department of Taxation Information Release ST 2007-04 - Nonresident Sales",
      "Senate Bill 94 (2024) - Doc Fee Inflation Adjustment",
      "Avalara Tax Rate Tables 2025",
      "LeaseGuide.com - Ohio Car Lease Tax",
    ],

    implementationNotes:
      "CRITICAL OHIO-SPECIFIC RULES TO IMPLEMENT: " +
      "(1) Trade-in credit ONLY for NEW vehicles - need vehicleCondition field in input. " +
      "(2) Lease taxation is FULL_UPFRONT - tax on sum of all payments collected at signing. " +
      "(3) VSC and GAP remain taxable on leases (unlike most states). " +
      "(4) Doc fee NOT taxable but capped at $387 or 10% (needs validation logic). " +
      "(5) Variable lease fees (disposition, excess mileage) taxed when billed, not at signing. " +
      "(6) Seven reciprocal states (AZ, CA, FL, IN, MA, MI, SC) require Ohio tax collection.",

    keyDifferencesFromOtherStates: [
      "Trade-in credit ONLY for new vehicles (USED vehicles get NO credit)",
      "Lease tax paid UPFRONT on all payments (not monthly like IN/MI)",
      "VSC and GAP taxable on leases (most states exempt these)",
      "Doc fee NOT taxable (differs from many states)",
      "Doc fee capped at $387 or 10%, adjusted annually for CPI",
      "Seven states have reciprocal collection agreements with Ohio",
    ],

    docFeeCapAmount: 387, // As of Oct 24, 2024 (or 10% of price, whichever is lower)
    docFeeCapEffectiveDate: "2024-10-24",
    docFeeCapRule: "Lesser of $387 or 10% of vehicle price",
    docFeeCapAdjustmentSchedule: "Annually on September 30th based on CPI",

    maxCombinedRate: 8.25, // Some COTA districts can reach 8.25%
    typicalMaxCombinedRate: 8.0, // Cuyahoga County: 5.75% state + 2.25% county

    majorCountyRates: {
      CuyahogaCounty: 8.0, // Cleveland - highest standard rate (5.75% + 2.25%)
      FranklinCounty: 7.5, // Columbus (5.75% + 1.75%)
      HamiltonCounty: 7.5, // Cincinnati (5.75% + 1.75%)
      SummitCounty: 6.75, // Akron (5.75% + 1.0%)
      MontgomeryCounty: 7.25, // Dayton (5.75% + 1.5%)
      LucasCounty: 7.25, // Toledo (5.75% + 1.5%)
      StarkCounty: 6.75, // Canton (5.75% + 1.0%)
      ButlerCounty: 6.75, // (5.75% + 1.0%)
      COTADistricts: 8.25, // Central Ohio Transit Authority districts (5.75% + 2.5%)
    },

    statewideTaxRate: 0.0575, // 5.75% state rate
    averageCombinedRate: 0.07181, // Average across all Ohio jurisdictions
    countyRateRange: [0.0, 0.0225], // County rates range from 0% to 2.25%

    rateChangeSchedule:
      "County-level sales and use tax rate changes can occur on April 1st each year. " +
      "Always verify current rates with Ohio Department of Taxation before calculating tax.",

    formReferences: {
      nonresidentExemption: "Form STEC NR - Sales Tax Exemption Certificate for Nonresidents",
      taxPaidReceipt: "Sales receipt or tax payment receipt showing tax amount paid in other state",
    },

    reciprocalStates: ["AZ", "CA", "FL", "IN", "MA", "MI", "SC"],

    warningsForDealers: [
      "ALWAYS verify vehicle condition (new vs. used) before applying trade-in credit",
      "Doc fee must not exceed $387 OR 10% of vehicle price (enforce lower amount)",
      "For leases, calculate tax on TOTAL payments upfront (payment × term × rate)",
      "VSC and GAP are TAXABLE on leases in Ohio (educate F&I managers)",
      "Verify customer state before applying nonresident exemption",
      "Collect Ohio tax from AZ, CA, FL, IN, MA, MI, SC residents even if nonresident",
      "County rates change April 1st - update rate tables annually",
      "Doc fee cap updates September 30th - check Ohio BMV website",
    ],

    commonMistakes: [
      "Applying trade-in credit to used vehicle sales (NOT ALLOWED)",
      "Taxing doc fee (it's NOT taxable in Ohio)",
      "Exempting VSC/GAP on leases (they ARE taxable in Ohio)",
      "Calculating lease tax monthly instead of upfront",
      "Exceeding doc fee cap ($387 or 10% rule)",
      "Granting nonresident exemption to reciprocal state residents",
    ],
  },
};

export default US_OH;
