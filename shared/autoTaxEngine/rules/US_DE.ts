import { TaxRulesConfig } from "../types";

/**
 * DELAWARE TAX RULES
 *
 * Researched: 2025-11-14
 * Version: 2
 *
 * KEY FACTS:
 * - State sales tax: NONE (Delaware is one of 5 states with no state sales tax)
 * - Local sales taxes: NONE (no local jurisdictions impose sales taxes)
 * - Document fee: 4.25% of purchase price or NADA value (whichever is higher)
 * - Trade-in credit: FULL (reduces doc fee calculation base)
 * - Manufacturer rebates: NOT taxable (reduce sale price)
 * - Title fee: $35
 * - Registration fee: $40 per year
 * - Service contracts & GAP: NOT taxable (no sales tax system)
 * - Lease taxation: Special 2.29% lease tax on monthly payments
 * - Reciprocity: LIMITED (credit for taxes paid out-of-state on full value)
 *
 * UNIQUE DELAWARE FEATURES:
 * 1. NO SALES TAX: Delaware has no state or local sales tax on any goods
 * 2. DOC FEE AS TAX: 4.25% "document fee" functions as a de facto sales tax
 * 3. FULL VALUE EXCEPTION: If buyer paid tax elsewhere on full MSRP, doc fee waived
 * 4. LEASE TAX SEPARATE: Special 2.2914% gross receipts tax on lessors (passed to lessee)
 * 5. TAX-FREE SHOPPING: One of 5 states with no sales tax (AK, DE, MT, NH, OR)
 * 6. NADA VALUE RULE: Doc fee based on higher of purchase price or NADA value
 * 7. MANDATORY DOC FEE: Not optional, mandated by Delaware DMV
 * 8. TRADE-IN REDUCES FEE: Trade-in value reduces doc fee calculation base
 *
 * TAX CALCULATION FORMULA (RETAIL):
 * Document Fee = (Purchase Price - Trade-In) × 4.25%
 *   OR
 * Document Fee = (NADA Value - Trade-In) × 4.25%
 *   (whichever results in higher fee)
 *
 * Total "Tax" = Document Fee + Title Fee + Registration Fee
 *
 * Example:
 * $30,000 vehicle - $10,000 trade-in
 * Net Price: $20,000
 * NADA Value: $28,000 - $10,000 = $18,000
 * Doc Fee Base: $20,000 (higher of the two)
 * Document Fee: $20,000 × 4.25% = $850.00
 * Title Fee: $35.00
 * Registration Fee: $40.00
 * Total Fees: $925.00
 *
 * LEASE CALCULATION:
 * Delaware imposes two taxes on lessors that can be passed to lessees:
 * - Gross Receipts Tax: 1.9914%
 * - Business License Tax: 0.2987%
 * - Total: 2.2901% (approximately 2.29%)
 *
 * Monthly Payment Tax:
 *   Tax = Monthly Payment × 2.29%
 *
 * Example (36-month lease):
 * $450/month × 36 months
 * Monthly Tax: $450 × 2.29% = $10.31/month
 * Total Lease Tax: $10.31 × 36 = $371.16
 *
 * SOURCES:
 * - Delaware Division of Motor Vehicles (dmv.de.gov)
 * - Delaware Code Title 30 (Taxation)
 * - Delaware DMV Fee Calculator
 * - Delaware Department of Finance - Division of Revenue
 * - Sales Tax Handbook - Delaware
 */
export const US_DE: TaxRulesConfig = {
  stateCode: "DE",
  version: 2,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL
   *
   * Delaware allows full trade-in credit. The trade-in value is deducted
   * from the purchase price (or NADA value) before calculating the 4.25%
   * document fee.
   *
   * Example:
   *   Vehicle Price: $30,000
   *   Trade-In Value: $10,000
   *   Doc Fee Base: $20,000
   *   Document Fee: $20,000 × 4.25% = $850
   *
   * Note: Trade-in credit only applies to dealer sales. Private party
   * sales do not allow trade-in credit.
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules: NOT taxable (reduce sale price)
   *
   * Manufacturer rebates reduce the purchase price before calculating
   * the 4.25% document fee.
   *
   * This is standard treatment since Delaware has no sales tax and
   * rebates reduce the actual transaction price.
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: false,
      notes:
        "Manufacturer rebates reduce the purchase price before calculating the 4.25% " +
        "document fee. Delaware has no sales tax.",
    },
    {
      appliesTo: "DEALER",
      taxable: false,
      notes:
        "Dealer rebates/incentives reduce the purchase price. Doc fee calculated on " +
        "actual price after dealer discounts.",
    },
  ],

  /**
   * Doc Fee: MANDATORY 4.25% (NOT OPTIONAL)
   *
   * Delaware's "documentation fee" is actually a mandatory DMV fee,
   * not a dealer-imposed fee. It is calculated as 4.25% of the
   * purchase price or NADA value, whichever is higher.
   *
   * CALCULATION:
   * Doc Fee = MAX(Purchase Price, NADA Value) × 4.25%
   *
   * TRADE-IN CREDIT:
   * Trade-in value is deducted before calculating doc fee.
   *
   * SPECIAL EXEMPTION:
   * If buyer paid sales tax elsewhere on the full MSRP value of the
   * vehicle, the 4.25% doc fee may be waived upon providing proof.
   *
   * This fee functions as Delaware's substitute for sales tax.
   */
  docFeeTaxable: false, // Not "taxable" in traditional sense - it IS the tax

  /**
   * Fee Taxability Rules
   *
   * Delaware has NO sales tax, so traditional "taxability" doesn't apply.
   * However, certain fees and products have special treatments:
   *
   * SERVICE CONTRACTS (VSC):
   * - NOT subject to any tax or fee
   * - No sales tax in Delaware
   *
   * GAP INSURANCE:
   * - NOT subject to any tax or fee
   * - Insurance products not taxed
   *
   * TITLE FEE:
   * - $35 (government fee, separate from doc fee)
   *
   * REGISTRATION FEE:
   * - $40 per year (government fee)
   *
   * DOC FEE:
   * - 4.25% of purchase price or NADA value (mandatory DMV fee)
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: false,
      notes:
        "Service contracts (VSC) are NOT subject to any tax in Delaware. No sales tax exists.",
    },
    {
      code: "GAP",
      taxable: false,
      notes: "GAP insurance is NOT subject to any tax in Delaware. Insurance products not taxed.",
    },
    {
      code: "DOC_FEE",
      taxable: false,
      notes:
        "Delaware's 4.25% 'doc fee' is a mandatory DMV fee (not dealer fee). Calculated on " +
        "purchase price or NADA value (whichever higher), after trade-in credit. This fee " +
        "IS the tax substitute.",
    },
    {
      code: "TITLE",
      taxable: false,
      notes: "Title fee is $35 (government fee, separate from doc fee).",
    },
    {
      code: "REG",
      taxable: false,
      notes: "Registration fee is $40 per year (government fee).",
    },
  ],

  /**
   * Product Taxability
   *
   * Since Delaware has no sales tax, the concept of "taxability" for
   * products is not applicable. The 4.25% doc fee applies only to the
   * base vehicle purchase price or NADA value.
   *
   * Accessories: Included in purchase price for doc fee calculation
   * Negative Equity: NOT included in doc fee calculation base
   * Service Contracts: NOT subject to doc fee
   * GAP: NOT subject to doc fee
   */
  taxOnAccessories: true, // Included in doc fee base
  taxOnNegativeEquity: false, // NOT included in doc fee base
  taxOnServiceContracts: false,
  taxOnGap: false,

  /**
   * Vehicle Tax Scheme: STATE_ONLY (no local taxes)
   *
   * Delaware has NO state sales tax and NO local sales taxes.
   *
   * The 4.25% document fee is the only "tax-like" charge and is
   * imposed at the state level by the Delaware DMV.
   *
   * FEES STRUCTURE:
   * - Document Fee: 4.25% of (price or NADA value) - trade-in
   * - Title Fee: $35
   * - Registration Fee: $40/year
   */
  vehicleTaxScheme: "STATE_ONLY",
  vehicleUsesLocalSalesTax: false,

  // ============================================================================
  // LEASE TRANSACTION RULES
  // ============================================================================

  leaseRules: {
    /**
     * Lease Method: MONTHLY
     *
     * Delaware imposes a gross receipts tax and business license tax on
     * lessors (leasing companies), which are typically passed through to
     * the lessee as part of the monthly payment.
     *
     * Combined Lease Tax Rate: Approximately 2.29%
     * - Gross Receipts Tax: 1.9914%
     * - Business License Tax: 0.2987%
     * - Total: 2.2901%
     *
     * Tax applies to each monthly lease payment.
     */
    method: "MONTHLY",

    /**
     * Cap Cost Reduction: NOT TAXED
     *
     * Cap cost reductions (cash down, rebates, trade-in equity) are
     * NOT subject to the lease tax in Delaware.
     *
     * Only monthly lease payments are taxed at approximately 2.29%.
     */
    taxCapReduction: false,

    /**
     * Rebate Behavior on Leases: FOLLOW_RETAIL_RULE
     *
     * Manufacturer rebates reduce the cap cost and are not taxed.
     * The lease tax applies only to monthly payments.
     */
    rebateBehavior: "FOLLOW_RETAIL_RULE",

    /**
     * Doc Fee on Leases: NEVER
     *
     * The 4.25% document fee does NOT apply to leases.
     *
     * Leases are subject to the monthly lease tax (approximately 2.29%)
     * instead of the document fee.
     */
    docFeeTaxability: "NEVER",

    /**
     * Trade-in Credit on Leases: FULL
     *
     * Trade-in allowance reduces the gross capitalized cost.
     * Trade-in equity is NOT subject to lease tax.
     *
     * SPECIAL RULE:
     * If the lessee paid sales tax on the full MSRP value in another
     * state when originally purchasing their trade-in, they may be
     * eligible for a waiver of certain fees upon providing proof.
     */
    tradeInCredit: "FULL",

    /**
     * Negative Equity on Leases: NOT TAXED directly
     *
     * Negative equity increases the cap cost, which increases monthly
     * payments. Higher monthly payments result in higher monthly tax,
     * but negative equity itself is not taxed upfront.
     */
    negativeEquityTaxable: false,

    /**
     * Fee Taxability on Leases
     *
     * SERVICE CONTRACTS (VSC):
     * - NOT subject to lease tax when capitalized
     *
     * GAP INSURANCE:
     * - NOT subject to lease tax when capitalized
     *
     * DOC FEE:
     * - NOT applicable to leases (only retail purchases)
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: false,
        notes: "Doc fee does NOT apply to leases in Delaware. Only retail purchases.",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: false,
        notes: "Service contracts NOT subject to lease tax when capitalized.",
      },
      {
        code: "GAP",
        taxable: false,
        notes: "GAP insurance NOT subject to lease tax when capitalized.",
      },
      {
        code: "TITLE",
        taxable: false,
        notes: "Title fee NOT subject to lease tax.",
      },
      {
        code: "REG",
        taxable: false,
        notes: "Registration fees NOT subject to lease tax.",
      },
    ],

    titleFeeRules: [
      {
        code: "TITLE",
        taxable: false,
        includedInCapCost: false,
        includedInUpfront: true,
        includedInMonthly: false,
      },
    ],

    taxFeesUpfront: false,

    specialScheme: "NONE",

    notes:
      "Delaware lease taxation: MONTHLY payment method. Lease tax approximately 2.29% " +
      "(1.9914% gross receipts + 0.2987% business license) imposed on lessor, typically " +
      "passed to lessee. No tax on cap cost reduction. Monthly payments subject to lease " +
      "tax. 4.25% doc fee does NOT apply to leases (only retail). Backend products (VSC, " +
      "GAP) NOT taxed. Trade-in reduces cap cost, NOT taxed.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: LIMITED CREDIT for out-of-state taxes paid
   *
   * Delaware provides LIMITED reciprocity for taxes paid in other states:
   *
   * FULL VALUE TAX EXEMPTION:
   * If a buyer can prove they paid sales tax to another state on the
   * FULL MSRP VALUE of the vehicle (not just the purchase price after
   * trade-in), the 4.25% Delaware document fee is WAIVED.
   *
   * REQUIREMENTS:
   * - Must provide proof of tax payment
   * - Tax must have been paid on full MSRP (not discounted price)
   * - Common scenario: Buyer leased vehicle in another state that charged
   *   upfront tax on full cap cost, then is purchasing/registering in DE
   *
   * PARTIAL TAX PAYMENT:
   * If buyer paid tax elsewhere on only the net purchase price (after
   * trade-in), the full 4.25% doc fee still applies in Delaware.
   *
   * NO CREDIT FOR NET PURCHASES:
   * Most states allow trade-in credit, so buyers typically pay tax only
   * on net amount. Delaware doc fee still applies in these cases.
   *
   * OUT-OF-STATE BUYERS:
   * Non-residents purchasing vehicles in Delaware must pay the 4.25%
   * doc fee regardless of where they will register the vehicle.
   */
  reciprocity: {
    enabled: true,
    scope: "RETAIL_ONLY",
    homeStateBehavior: "CREDIT_UP_TO_STATE_RATE",
    requireProofOfTaxPaid: true,
    basis: "TAX_PAID",
    capAtThisStatesTax: true,
    hasLeaseException: false,
    notes:
      "Delaware provides LIMITED reciprocity: If buyer can prove they paid sales tax in " +
      "another state on the FULL MSRP (not net after trade-in), the 4.25% doc fee is " +
      "WAIVED. Proof required. Most common scenario: Lease in another state with upfront " +
      "tax on full cap cost. If tax was paid only on net purchase price (typical), full " +
      "4.25% doc fee still applies. Out-of-state buyers purchasing in DE must pay 4.25% " +
      "doc fee. No state sales or use tax exists in Delaware.",
  },

  extras: {
    lastUpdated: "2025-11-14",
    sources: [
      "Delaware Division of Motor Vehicles (dmv.de.gov)",
      "Delaware Code Title 30 - Taxation",
      "Delaware DMV Fee Calculator",
      "Delaware Department of Finance - Division of Revenue",
      "Sales Tax Handbook - Delaware",
      "Delaware Gross Receipts Tax Regulations",
    ],
    notes:
      "Delaware is one of 5 states with NO sales tax (along with AK, MT, NH, OR). Instead, " +
      "Delaware charges a mandatory 4.25% 'document fee' on vehicle purchases, calculated " +
      "on purchase price or NADA value (whichever higher), after trade-in credit. This fee " +
      "functions as a de facto sales tax. Title fee $35, registration $40/year. Trade-in " +
      "credit FULL (reduces doc fee base). Manufacturer rebates reduce doc fee base. VSC " +
      "and GAP NOT subject to any tax. Leases: 2.29% monthly lease tax on payments " +
      "(1.9914% gross receipts + 0.2987% business license tax on lessor, passed to lessee). " +
      "SPECIAL: If buyer paid tax elsewhere on full MSRP, 4.25% doc fee may be waived with proof.",
    stateAutomotiveSalesRate: 0.0,
    stateDocumentFeeRate: 4.25,
    stateAutomotiveLeaseRate: 2.29, // Approximate combined lease tax
    leaseGrossReceiptsTax: 1.9914,
    leaseBusinessLicenseTax: 0.2987,
    localRateRange: { min: 0.0, max: 0.0 },
    combinedRateRange: { min: 4.25, max: 4.25 }, // Only doc fee
    titleFee: 35.0,
    registrationFeePerYear: 40.0,
    documentFeeCalculation:
      "MAX(Purchase Price, NADA Value) - Trade-In × 4.25%",
    fullValueTaxExemption: true,
  },
};

export default US_DE;
