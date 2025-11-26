import type { TaxRulesConfig } from "../types";

/**
 * MAINE TAX RULES
 *
 * Researched: 2025-11-14
 * Version: 2
 *
 * KEY FACTS:
 * - Sales tax rate: 5.5% flat state rate (STATE_ONLY - no local taxes)
 * - Trade-in credit: FULL (deducted from purchase price before calculating tax)
 * - Manufacturer rebates: NON-TAXABLE (reduce the tax base)
 * - Dealer rebates: NON-TAXABLE (reduce the tax base)
 * - Doc fee: TAXABLE, NO STATE CAP (average $410, dealer discretion)
 * - Service contracts (VSC): TAXABLE (5.5% tax when sold with vehicle)
 * - GAP insurance: NOT separately addressed (treated similar to service contracts)
 * - Accessories: TAXABLE (part of sale price)
 * - Lease method: MONTHLY taxation (effective January 1, 2025 - NEW RULES)
 * - Reciprocity: LIMITED (credit system for out-of-state purchases)
 *
 * UNIQUE MAINE FEATURES:
 * 1. FLAT STATE-ONLY TAX: Maine has a uniform 5.5% sales tax rate statewide.
 *    No county, city, or local taxes on vehicles. Same rate everywhere.
 *
 * 2. MAJOR LEASE TAX CHANGE (Effective January 1, 2025):
 *    - NEW: Monthly taxation for leases entered/renewed on or after 1/1/2025
 *    - Long-term auto leases (≥ 1 year): 5% tax rate
 *    - Short-term rentals (< 1 year): 10% tax rate
 *    - Each payment period is a separate taxable sale
 *
 * 3. SERVICE CONTRACTS TAXABLE:
 *    - Extended service contracts on automobiles/trucks: TAXABLE at 5.5%
 *    - This differs from many states where service contracts are exempt
 *    - GAP insurance treatment follows similar principles
 *
 * 4. DOC FEE NO CAP:
 *    - Average doc fee: $410
 *    - No statutory limit on documentation fees
 *    - Dealers have full discretion
 *
 * 5. TITLE 36 MRS SECTION 1752:
 *    - Governs retail sales definitions and trade-in credits
 *    - Trade-in allowance: Tax levied only on difference between sale price
 *      and trade-in allowance
 *
 * 6. OUT-OF-STATE PURCHASE EXEMPTION:
 *    - Motor vehicles purchased by non-residents
 *    - Intended to be driven/transported outside Maine immediately
 *    - Exempt from Maine sales tax
 *
 * TAX CALCULATION FORMULA (RETAIL):
 * Taxable Amount = Vehicle Price + Accessories + Doc Fee - Trade-In Value
 * Sales Tax = Taxable Amount × 5.5%
 *
 * Example:
 * Vehicle Price: $28,000
 * Accessories: $1,200
 * Doc Fee: $410
 * Service Contract: $1,800
 * Trade-In: $9,000
 *
 * Taxable Base: ($28,000 + $1,200 + $410 + $1,800) - $9,000 = $22,410
 * Sales Tax: $22,410 × 5.5% = $1,232.55
 *
 * LEASE CALCULATION (MONTHLY - New as of 1/1/2025):
 * For long-term leases (≥ 1 year):
 * Tax Base = Monthly Payment
 * Tax = Monthly Payment × 5.0%
 *
 * Example:
 * Monthly Payment: $450
 * Monthly Sales Tax: $450 × 5.0% = $22.50
 * Total Monthly: $472.50
 *
 * SOURCES:
 * - Maine Revenue Services (maine.gov/revenue)
 * - Title 36 Maine Revised Statutes (MRS)
 * - 36 MRS § 1752: Retail sale definition and trade-in credit
 * - 36 MRS § 1760: Exemptions
 * - Maine Revenue Services Information Bulletin #13 (Vehicle Sales)
 * - Maine Revenue Services Lease/Rental Notice (January 2025)
 * - Maine Auto Dealers Association guidance
 */
export const US_ME: TaxRulesConfig = {
  stateCode: "ME",
  version: 2,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL
   *
   * Maine allows full trade-in credit on vehicle sales tax.
   * The trade-in value is deducted from the purchase price before
   * calculating the 5.5% sales tax.
   *
   * Statutory Basis (36 MRS § 1752):
   * "When motor vehicles are traded in toward the sale price of another
   * motor vehicle, the tax must be levied only upon the difference between
   * the sale price of the purchased property and the trade-in allowance
   * of the property taken in trade."
   *
   * Application:
   * - Trade-in value fully deducted from purchase price
   * - Tax calculated on net difference
   * - Applies to all vehicle types (new and used)
   * - No restrictions based on where vehicles were previously registered
   *
   * Example:
   *   Vehicle Price: $20,000
   *   Trade-In Value: $5,000
   *   Net Taxable: $20,000 - $5,000 = $15,000
   *   Sales Tax (5.5%): $15,000 × 5.5% = $825
   *
   * Source: 36 MRS § 1752, Maine Revenue Services guidance
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules: Both manufacturer and dealer rebates are NON-TAXABLE
   *
   * Maine treats rebates as reductions in the purchase price, which reduces
   * the taxable sale price. This applies to both manufacturer and dealer rebates.
   *
   * MANUFACTURER REBATES:
   * Manufacturer rebates, incentives, and cash-back offers reduce the
   * purchase price and therefore reduce the sales tax liability.
   *
   * Tax Treatment:
   * - Rebate reduces the vehicle purchase price
   * - Sales tax calculated on net price after rebate
   * - Customer benefits from lower tax base
   *
   * Example:
   *   MSRP: $30,000
   *   Manufacturer Rebate: $4,000
   *   Net Price: $26,000
   *   Sales Tax (5.5%): $26,000 × 5.5% = $1,430
   *
   * DEALER REBATES:
   * Dealer discounts, incentives, and promotional offers also reduce the
   * purchase price and therefore the tax base.
   *
   * Source: Maine Revenue Services guidance, 36 MRS § 1752
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: false,
      notes:
        "Manufacturer rebates reduce the purchase price and therefore reduce the taxable " +
        "amount. Sales tax calculated on net amount after rebate.",
    },
    {
      appliesTo: "DEALER",
      taxable: false,
      notes:
        "Dealer rebates and discounts reduce the selling price and therefore reduce the " +
        "taxable amount. Tax calculated on actual reduced price.",
    },
  ],

  /**
   * Doc Fee: TAXABLE, NO CAP
   *
   * Documentation fees are subject to Maine's 5.5% sales tax.
   *
   * Taxability:
   * Doc fees are part of the sale price and subject to sales tax.
   *
   * No Statutory Cap:
   * Maine does not impose a statutory limit on dealer documentation fees.
   * - Average doc fee: $410
   * - Dealers have discretion to set their own fees
   * - Can vary significantly between dealerships
   *
   * Example:
   *   Vehicle Price: $25,000
   *   Doc Fee: $410
   *   Total Before Trade: $25,410
   *   Sales Tax (5.5%): $25,410 × 5.5% = $1,397.55
   *
   * Source: Maine Revenue Services guidance
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules
   *
   * SERVICE CONTRACTS (VSC):
   * - TAXABLE at 5.5% when sold with vehicle
   * - Extended service contracts on automobiles/trucks are subject to sales tax
   * - This differs from states where service contracts are exempt as insurance
   *
   * GAP INSURANCE:
   * - Treatment follows service contract principles
   * - When sold with vehicle, generally subject to sales tax
   * - Maine does not provide explicit GAP exemption
   *
   * TITLE FEE:
   * - NOT taxable (government fee)
   * - Maine Bureau of Motor Vehicles title fee
   * - Separately stated and not subject to sales tax
   *
   * REGISTRATION FEES:
   * - NOT taxable (government fees)
   * - License plate and excise tax fees
   * - Collected by municipality, not subject to sales tax
   *
   * Note: Maine has an annual excise tax on vehicles (separate from sales tax)
   * calculated based on MSRP and age of vehicle. This is NOT a sales tax.
   *
   * Source: Maine Revenue Services guidance, 36 MRS
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: true,
      notes:
        "Service contracts (VSC) are TAXABLE in Maine at 5.5% when sold with vehicle. " +
        "Extended warranties on automobiles are subject to sales tax.",
    },
    {
      code: "GAP",
      taxable: true,
      notes:
        "GAP insurance treatment follows service contract principles - generally TAXABLE " +
        "when sold with vehicle. Maine does not provide explicit exemption.",
    },
    {
      code: "DOC_FEE",
      taxable: true,
      notes:
        "Doc fees are TAXABLE at 5.5% sales tax rate. Maine has NO cap on doc fees " +
        "(average $410, dealer discretion).",
    },
    {
      code: "TITLE",
      taxable: false,
      notes:
        "Title fee is NOT taxable (government fee collected by Bureau of Motor Vehicles).",
    },
    {
      code: "REG",
      taxable: false,
      notes:
        "Registration fees and excise tax are NOT taxable (government fees collected by municipality).",
    },
  ],

  /**
   * Product Taxability
   *
   * Accessories: TAXABLE
   * - Dealer-installed accessories included in sale price
   * - Subject to 5.5% sales tax
   * - Both factory and aftermarket accessories taxable
   *
   * Negative Equity: TAXABLE
   * - Negative equity rolled into purchase increases sale price
   * - Subject to 5.5% sales tax
   * - Applies to both sales and leases
   *
   * Service Contracts: TAXABLE
   * - When sold with vehicle, subject to 5.5% tax
   *
   * GAP: TAXABLE
   * - When sold with vehicle, subject to 5.5% tax
   *
   * Example with Negative Equity:
   *   Vehicle Price: $23,000
   *   Trade-In Value: $8,000
   *   Trade-In Payoff: $11,000
   *   Negative Equity: $3,000
   *
   *   Adjusted Price: $23,000 + $3,000 = $26,000
   *   Less Trade-In: $26,000 - $8,000 = $18,000
   *   Sales Tax (5.5%): $18,000 × 5.5% = $990
   *
   * Source: Maine Revenue Services guidance
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: true,
  taxOnServiceContracts: true,
  taxOnGap: false,

  /**
   * Vehicle Tax Scheme: STATE_ONLY
   *
   * Maine uses a flat 5.5% state sales tax with NO local taxes.
   *
   * State Sales Tax: 5.5%
   * - Uniform statewide rate
   * - No county taxes
   * - No city/municipal taxes
   * - No special district taxes
   *
   * Same Rate Everywhere:
   * - Portland (Cumberland County): 5.5%
   * - Bangor (Penobscot County): 5.5%
   * - Rural areas: 5.5%
   * - No variation by location
   *
   * Tax Collection:
   * - Dealer collects sales tax at point of sale
   * - Remits to Maine Revenue Services
   * - Separate from annual excise tax
   *
   * Note on Excise Tax:
   * Maine has an annual municipal excise tax on vehicles (separate from sales tax).
   * This is based on MSRP and vehicle age, collected by municipalities, and is
   * NOT part of the sales tax system.
   *
   * Source: Maine Revenue Services, 36 MRS
   */
  vehicleTaxScheme: "STATE_ONLY",
  vehicleUsesLocalSalesTax: false,

  // ============================================================================
  // LEASE TRANSACTION RULES
  // ============================================================================

  leaseRules: {
    /**
     * Lease Method: MONTHLY (NEW as of January 1, 2025)
     *
     * MAJOR CHANGE: Maine Revenue Services Notice (January 2025)
     * For leases entered into or renewed ON OR AFTER January 1, 2025,
     * lessors are required to charge and collect Maine sales tax on
     * each lease or rental payment.
     *
     * Legal Framework:
     * "Each period of time for which a lease or rental payment is charged
     * is considered a separate sale."
     *
     * Tax Rates:
     * - LONG-TERM auto rentals (1 year or more): 5% tax rate
     * - SHORT-TERM rentals (less than 1 year): 10% tax rate
     *   * Applies to autos, pickup trucks, vans < 26,000 lbs GVW
     *
     * Calculation:
     * Monthly Sales Tax = Monthly Payment × 5.0% (for long-term leases)
     *
     * Example (Long-Term Lease):
     *   Monthly Payment: $425
     *   Sales Tax: $425 × 5.0% = $21.25
     *   Total Monthly: $446.25
     *
     * Example (Short-Term Rental):
     *   Daily Rental: $75/day
     *   Sales Tax: $75 × 10.0% = $7.50
     *   Total: $82.50/day
     *
     * Prior to January 1, 2025:
     * Maine may have had different lease taxation rules. This represents
     * a recent change to align with monthly taxation methods.
     *
     * Source: Maine Revenue Services Lease/Rental Notice (January 2025)
     */
    method: "MONTHLY",

    /**
     * Cap Cost Reduction: NOT TAXED SEPARATELY
     *
     * Under the new monthly taxation rules (effective 1/1/2025), only
     * the periodic lease payments are subject to sales tax.
     *
     * Not Taxed Separately:
     * - Cash down payments
     * - Manufacturer rebates applied as cap reduction
     * - Trade-in equity
     * - Dealer discounts applied as cap reduction
     *
     * Tax Treatment:
     * Cap cost reductions reduce the monthly payment amount, which in turn
     * reduces the monthly sales tax. The benefit is realized through lower
     * monthly taxes.
     *
     * Example:
     *   Gross Cap Cost: $32,000
     *   Cap Reduction: $6,000
     *   Adjusted Cap Cost: $26,000
     *
     *   Monthly Payment (without reduction): $470
     *   Monthly Payment (with reduction): $385
     *
     *   Monthly Tax (5%): $470 × 5% = $23.50 vs $385 × 5% = $19.25
     *   Monthly Savings: $4.25 in tax
     *
     * Source: Maine Revenue Services Lease/Rental Notice (January 2025)
     */
    taxCapReduction: false,

    /**
     * Rebate Behavior on Leases: FOLLOW_RETAIL_RULE
     *
     * Rebates on leases follow the same treatment as retail purchases:
     * they are NON-TAXABLE and reduce the cost basis.
     *
     * When rebates reduce the cap cost, they lower the monthly payment,
     * which in turn reduces the monthly sales tax.
     *
     * Source: Maine Revenue Services guidance
     */
    rebateBehavior: "FOLLOW_RETAIL_RULE",

    /**
     * Doc Fee on Leases: ALWAYS taxable
     *
     * Documentation fees on leases are subject to sales tax.
     *
     * Application:
     * - If doc fee paid upfront: Taxed at applicable rate
     * - If capitalized into lease: Increases monthly payment and monthly tax
     *
     * For short-term rentals, the doc fee may be included in rental charges
     * and taxed at 10%. For long-term leases, typically taxed at 5%.
     *
     * Example (Long-Term Lease):
     *   Doc Fee: $410
     *   Paid upfront
     *   Tax (5%): $410 × 5% = $20.50
     *
     * Source: Maine Revenue Services guidance
     */
    docFeeTaxability: "ALWAYS",

    /**
     * Trade-in Credit on Leases: FULL
     *
     * Maine allows trade-in credit on leases, following retail principles.
     *
     * Trade-In Treatment:
     * - Trade-in equity can be applied as cap cost reduction
     * - This reduces the adjusted cap cost
     * - Lower cap cost = lower monthly payment
     * - Lower monthly payment = lower monthly sales tax
     *
     * Example:
     *   Gross Cap Cost: $30,000
     *   Trade-In Equity: $7,000
     *   Adjusted Cap Cost: $23,000
     *
     *   Monthly Payment (without trade): $430
     *   Monthly Payment (with trade): $330
     *
     *   Monthly Tax (5%): $430 × 5% = $21.50 vs $330 × 5% = $16.50
     *   Monthly Savings: $5.00 in tax
     *
     * Source: Maine Revenue Services guidance, 36 MRS § 1752
     */
    tradeInCredit: "FULL",

    /**
     * Negative Equity on Leases: TAXABLE
     *
     * Negative equity rolled into a lease increases the cap cost and
     * therefore increases the monthly payment and monthly sales tax.
     *
     * Treatment:
     * - Negative equity added to gross cap cost
     * - Increases adjusted cap cost
     * - Results in higher monthly payment
     * - Higher payment = more monthly tax
     *
     * Example:
     *   Base Cap Cost: $27,000
     *   Trade-In Value: $9,000
     *   Trade-In Payoff: $12,500
     *   Negative Equity: $3,500
     *
     *   Adjusted Cap Cost: $27,000 + $3,500 = $30,500
     *
     *   Monthly Payment: $445 (includes negative equity)
     *   Monthly Tax (5%): $445 × 5% = $22.25
     *
     * Source: Maine Revenue Services lease guidance
     */
    negativeEquityTaxable: true,

    /**
     * Fee Taxability on Leases
     *
     * Under the new monthly taxation system (effective 1/1/2025):
     *
     * DOC FEE:
     * - TAXABLE on leases (typically upfront at 5%)
     *
     * SERVICE CONTRACTS (VSC):
     * - When capitalized into lease: Taxed as part of monthly payment
     * - Monthly payment tax includes entire payment amount
     *
     * GAP INSURANCE:
     * - When capitalized into lease: Taxed as part of monthly payment
     * - No separate GAP tax calculation
     *
     * TITLE FEE:
     * - NOT taxable (government fee)
     *
     * REGISTRATION FEES:
     * - NOT taxable (government fees)
     *
     * RENTAL CHARGES (Short-Term):
     * The total rental charged includes maintenance contracts, drop-off/pick-up
     * fees, airport surcharges, mileage fees, and separately itemized charges.
     * All are taxed at 10% for short-term rentals.
     *
     * Source: Maine Revenue Services Lease/Rental Notice (January 2025)
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: true,
        notes: "Doc fee TAXABLE on leases. Long-term: 5%, Short-term: 10%.",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: false,
        notes:
          "Service contracts capitalized into lease are taxed as part of monthly payment at 5%.",
      },
      {
        code: "GAP",
        taxable: false,
        notes:
          "GAP capitalized into lease is taxed as part of monthly payment. No separate GAP tax.",
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
      "Maine: MONTHLY lease taxation (NEW as of Jan 1, 2025). Long-term leases (≥1 year): 5% tax " +
      "on each payment. Short-term rentals (<1 year): 10% tax. Cap cost reduction NOT taxed " +
      "separately (only payments taxed). Trade-in credit APPLIES to leases (reduces monthly " +
      "payment and tax). Each payment period is a separate sale. Doc fee taxable. Backend " +
      "products (VSC, GAP) taxed as part of monthly payment when capitalized.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: LIMITED (credit system for out-of-state purchases)
   *
   * Maine provides LIMITED credit for sales taxes paid to other states
   * on vehicle purchases.
   *
   * Out-of-State Purchase Exemption (36 MRS § 1760):
   * "Motor vehicles purchased in Maine by non-residents intended to be
   * driven or transported outside the State immediately upon delivery
   * are exempt from Maine sales tax."
   *
   * Maine Residents Purchasing Out-of-State:
   * Maine residents who purchase vehicles in other states and pay sales
   * tax to that state may receive credit against Maine's sales tax, but
   * specific reciprocity agreements vary.
   *
   * How It Works:
   *
   * Scenario 1: Non-Resident Buying in Maine
   * Non-residents who purchase in Maine and immediately take vehicle
   * out of state are EXEMPT from Maine sales tax.
   *
   * Example:
   *   New Hampshire resident buys in Maine: $28,000
   *   Takes vehicle immediately to NH
   *   Maine sales tax: EXEMPT ($0)
   *   NH has no sales tax, so total tax: $0
   *
   * Scenario 2: Maine Resident Buying Out-of-State
   * Credit system applies, but specific rules depend on the other state.
   * Generally, if tax paid to other state ≥ Maine's 5.5%, no additional
   * Maine tax is due.
   *
   * Example:
   *   Maine resident buys in Massachusetts: $25,000
   *   MA tax paid (6.25%): $1,562.50
   *   Maine tax would be (5.5%): $1,375
   *   Credit allowed: $1,375
   *   Additional ME tax due: $0
   *
   * Documentation Required:
   * - Bill of sale
   * - Proof of tax paid to other state
   * - Registration documents
   *
   * Source: 36 MRS § 1760, Maine Revenue Services guidance
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
      "Maine provides LIMITED reciprocity. Non-residents purchasing in Maine for immediate " +
      "out-of-state use are EXEMPT from Maine sales tax. Maine residents purchasing out-of-state " +
      "receive credit for taxes paid to other states, capped at Maine's 5.5% rate. Proof of tax " +
      "payment required. If other state tax ≥ 5.5%, no additional Maine tax due.",
  },

  extras: {
    lastUpdated: "2025-11-14",
    sources: [
      "Maine Revenue Services (maine.gov/revenue)",
      "Title 36 Maine Revised Statutes (MRS)",
      "36 MRS § 1752: Retail sale definition and trade-in credit",
      "36 MRS § 1760: Exemptions",
      "Maine Revenue Services Information Bulletin #13 (Vehicle Sales)",
      "Maine Revenue Services Lease/Rental Notice (January 2025)",
      "Maine Auto Dealers Association guidance",
      "Maine Bureau of Motor Vehicles",
    ],
    notes:
      "Maine levies a 5.5% sales tax on vehicles (state only, no local taxes). Trade-in credit " +
      "FULL (applies to purchase price). Rebates are NON-TAXABLE (reduce tax base). Service " +
      "contracts and GAP are TAXABLE when sold with vehicle. Doc fee taxable, NO CAP (avg $410). " +
      "MAJOR CHANGE (Jan 1, 2025): Lease taxation now MONTHLY. Long-term leases (≥1 year): 5% tax on " +
      "each payment. short-term rentals (<1 year): 10% tax. Cap reduction NOT taxed separately, " +
      "trade-in credit APPLIES. Non-resident exemption for out-of-state use. Annual excise tax " +
      "is SEPARATE from sales tax.",
    stateSalesRate: 5.5,
    stateSalesTaxRate: 5.5,
    stateLongTermLeaseRate: 5.0,
    stateShortTermRentalRate: 10.0,
    localTaxes: false,
    flatTaxRate: true,
    avgDocFee: 410,
    titleFee: 33.0,
    leaseRuleChangeDate: "2025-01-01",
  },
};

export default US_ME;
