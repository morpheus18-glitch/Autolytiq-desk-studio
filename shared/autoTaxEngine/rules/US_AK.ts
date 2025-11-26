import type { TaxRulesConfig } from "../types";

/**
 * ALASKA TAX RULES
 *
 * Researched: 2025-11-14
 * Version: 2
 *
 * KEY FACTS:
 * - State sales tax: NONE (Alaska is one of 5 states with no state sales tax)
 * - Local sales taxes: YES - boroughs and municipalities may impose local sales taxes
 * - Local tax range: 0% to 7.5% (151 local jurisdictions, average 1.76%)
 * - Trade-in credit: FULL (when applicable locally)
 * - Manufacturer rebates: NOT taxable (reduce sale price)
 * - Doc fee: NO STATE CAP (average ~$80), taxability depends on local jurisdiction
 * - Service contracts & GAP: Generally NOT taxable
 * - Lease method: MONTHLY taxation on lease payments (where local tax applies)
 * - Reciprocity: LIMITED (varies by jurisdiction)
 *
 * UNIQUE ALASKA FEATURES:
 * 1. NO STATE SALES TAX: Alaska has no state-level sales tax on any goods or services
 * 2. LOCAL TAX ONLY: Only boroughs and municipalities can impose sales taxes
 * 3. MAJOR CITIES TAX-FREE: Anchorage and Fairbanks (largest cities) have 0% sales tax
 * 4. WIDE VARIATION: Local rates range from 0% (Anchorage, Fairbanks) to 7.5%+
 * 5. 151 JURISDICTIONS: 151 local tax jurisdictions across the state
 * 6. LOW DOC FEES: Average dealer doc fee is ~$80 (one of the lowest in the nation)
 * 7. NO STATE REGULATION: No state-level consumer protection on dealer fees
 * 8. BOROUGH SYSTEM: Alaska uses boroughs instead of counties
 *
 * TAX CALCULATION FORMULA (RETAIL):
 * No state tax, only local tax where applicable:
 * Taxable Base = Vehicle Price + Accessories + Doc Fee - Trade-In
 * Local Tax = Taxable Base × Local Rate (if applicable)
 * Total Tax = Local Tax
 *
 * Example (Juneau - 5% local):
 * $30,000 vehicle + $80 doc fee - $10,000 trade-in
 * Taxable Base: $20,080
 * Local Tax: $20,080 × 5% = $1,004.00
 * Total Tax: $1,004.00
 *
 * Example (Anchorage - 0% local):
 * $30,000 vehicle + $80 doc fee - $10,000 trade-in
 * Taxable Base: $20,080
 * Local Tax: $20,080 × 0% = $0.00
 * Total Tax: $0.00
 *
 * LEASE CALCULATION (MONTHLY):
 * Monthly Payment Tax:
 *   Tax = Monthly Payment × Local Rate (if applicable)
 *
 * Example (5% local rate):
 * $450/month × 36 months
 * Monthly Tax: $450 × 5% = $22.50/month
 * Total Lease Tax: $22.50 × 36 = $810.00
 *
 * SOURCES:
 * - Alaska Department of Commerce, Community, and Economic Development
 * - Alaska Division of Motor Vehicles (dmv.alaska.gov)
 * - Sales Tax Handbook - Alaska Rates (salestaxhandbook.com)
 * - Avalara Alaska Sales Tax Calculator
 * - Alaska Auto Dealers Association
 */
export const US_AK: TaxRulesConfig = {
  stateCode: "AK",
  version: 1,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL
   *
   * Alaska allows full trade-in credit where local sales taxes apply.
   * The trade-in value is deducted from the purchase price before calculating
   * local sales tax.
   *
   * Since there is no state sales tax, trade-in credit only affects local
   * jurisdictions that impose sales taxes.
   *
   * Example (Juneau - 5% local):
   *   Vehicle Price: $30,000
   *   Trade-In Value: $10,000
   *   Taxable Base: $20,000
   *   Local Tax (5%): $1,000
   *
   * Example (Anchorage - 0% local):
   *   Vehicle Price: $30,000
   *   Trade-In Value: $10,000
   *   Tax: $0 (no local sales tax)
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules: NOT taxable (reduce sale price)
   *
   * In jurisdictions that impose local sales tax, manufacturer rebates
   * reduce the taxable sale price before tax calculation.
   *
   * This follows standard practice in most states with sales tax.
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: false,
      notes:
        "Manufacturer rebates reduce the purchase price before local sales tax calculation. " +
        "Only applies in jurisdictions with local sales tax.",
    },
    {
      appliesTo: "DEALER",
      taxable: false,
      notes:
        "Dealer rebates/incentives reduce the taxable sale price. Tax calculated on actual " +
        "price after dealer discounts.",
    },
  ],

  /**
   * Doc Fee: Generally TAXABLE in jurisdictions with local sales tax
   *
   * Documentation fees are typically subject to local sales tax where
   * such taxes are imposed.
   *
   * NO STATE CAP:
   * Alaska has no statutory limit on dealer documentation fees.
   * Average doc fee: ~$80 (one of the lowest in the nation)
   *
   * This is significantly lower than the national average of ~$200-$300,
   * likely due to market competition and lack of state regulation.
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules
   *
   * In jurisdictions with local sales tax, the following generally apply:
   *
   * SERVICE CONTRACTS (VSC):
   * - Generally NOT subject to local sales tax
   * - Treated as service contracts, not tangible property
   *
   * GAP INSURANCE:
   * - NOT subject to local sales tax
   * - Treated as insurance product
   *
   * TITLE FEE:
   * - NOT taxable (government fee)
   *
   * REGISTRATION FEES:
   * - NOT taxable (government fees)
   *
   * Note: Local jurisdictions may have varying rules on fee taxability.
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: false,
      notes:
        "Service contracts (VSC) are generally NOT subject to local sales tax in Alaska. " +
        "Treated as service agreements.",
    },
    {
      code: "GAP",
      taxable: false,
      notes:
        "GAP insurance is NOT taxable in Alaska. Treated as insurance product, exempt from " +
        "local sales tax.",
    },
    {
      code: "DOC_FEE",
      taxable: true,
      notes:
        "Doc fees are generally TAXABLE where local sales tax applies. Alaska has NO cap on " +
        "doc fees (average ~$80, one of lowest in nation).",
    },
    {
      code: "TITLE",
      taxable: false,
      notes:
        "Title fee ($15) is NOT taxable. Government fee, not subject to local sales tax.",
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
   * Accessories: TAXABLE (where local sales tax applies)
   * - Accessories sold with vehicle subject to local sales tax
   *
   * Negative Equity: TAXABLE (where local sales tax applies)
   * - Negative equity rolled into purchase price increases taxable base
   *
   * Service Contracts: NOT taxable
   * GAP: NOT taxable
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: true,
  taxOnServiceContracts: false,
  taxOnGap: false,

  /**
   * Vehicle Tax Scheme: STATE_PLUS_LOCAL (but state rate is 0%)
   *
   * Alaska has NO state sales tax. Only local boroughs and municipalities
   * may impose sales taxes.
   *
   * Local Tax Structure:
   * - 151 local tax jurisdictions across Alaska
   * - Local rates range from 0% to 7.5%+
   * - Average local rate: 1.76%
   * - Major cities:
   *   - Anchorage: 0% (largest city, no sales tax)
   *   - Fairbanks: 0% (second largest city, no sales tax)
   *   - Juneau: 5.0% (state capital)
   *   - Sitka: 6.0%
   *   - Ketchikan: 6.5%
   *   - Nome: 5.5%
   *
   * Tax is based on the location of the dealership, not buyer's residence.
   */
  vehicleTaxScheme: "LOCAL_ONLY",  // No state tax, only local jurisdictions
  vehicleUsesLocalSalesTax: true,

  // ============================================================================
  // LEASE TRANSACTION RULES
  // ============================================================================

  leaseRules: {
    /**
     * Lease Method: MONTHLY
     *
     * In jurisdictions with local sales tax, leases are taxed on a
     * MONTHLY basis. Tax is charged on each monthly lease payment.
     *
     * This is the standard approach in most states.
     */
    method: "MONTHLY",

    /**
     * Cap Cost Reduction: NOT TAXED upfront
     *
     * Cap cost reductions (cash down, rebates, trade-in equity) are
     * generally NOT taxed upfront in Alaska jurisdictions.
     *
     * Only monthly lease payments are subject to local sales tax.
     */
    taxCapReduction: false,

    /**
     * Rebate Behavior on Leases: FOLLOW_RETAIL_RULE
     *
     * Manufacturer rebates reduce the cap cost and are not taxed upfront.
     * Tax only applies to monthly payments.
     */
    rebateBehavior: "FOLLOW_RETAIL_RULE",

    /**
     * Doc Fee on Leases: Generally NOT taxed upfront
     *
     * Doc fees paid at lease inception are typically not taxed separately.
     * Only monthly lease payments are subject to local sales tax.
     */
    docFeeTaxability: "FOLLOW_RETAIL_RULE",

    /**
     * Trade-in Credit on Leases: FULL
     *
     * Trade-in allowance reduces the gross capitalized cost.
     * Trade-in equity is NOT taxed on leases in Alaska.
     */
    tradeInCredit: "FULL",

    /**
     * Negative Equity on Leases: NOT TAXED upfront
     *
     * Negative equity increases the cap cost and thus increases monthly
     * payments, which are taxed. But negative equity itself is not taxed
     * upfront as a separate item.
     */
    negativeEquityTaxable: false,

    /**
     * Fee Taxability on Leases
     *
     * Backend products on leases follow same rules as sales:
     *
     * SERVICE CONTRACTS (VSC):
     * - NOT taxable on leases
     *
     * GAP INSURANCE:
     * - NOT taxable on leases
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: false,
        notes: "Doc fee generally NOT taxed separately on leases in Alaska.",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: false,
        notes: "Service contracts NOT taxable on leases.",
      },
      {
        code: "GAP",
        taxable: false,
        notes: "GAP insurance NOT taxable on leases.",
      },
      {
        code: "TITLE",
        taxable: false,
        notes: "Title fee NOT taxable.",
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

    taxFeesUpfront: false,

    specialScheme: "NONE",

    notes:
      "Alaska lease taxation: MONTHLY payment method in jurisdictions with local sales tax. " +
      "No tax on cap cost reduction. Only monthly lease payments subject to local tax where " +
      "applicable. Major cities (Anchorage, Fairbanks) have 0% local tax. Backend products " +
      "(VSC, GAP) NOT taxed. Trade-in reduces cap cost and is NOT taxed.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: LIMITED (varies by jurisdiction)
   *
   * Alaska has no state sales tax, so state-level reciprocity does not apply.
   *
   * LOCAL JURISDICTIONS:
   * Individual boroughs and municipalities may have their own reciprocity
   * rules, but these are rare given Alaska's unique tax structure.
   *
   * OUT-OF-STATE BUYERS:
   * Vehicles purchased in Alaska are generally subject to local sales tax
   * based on the dealership location, regardless of where the buyer will
   * register the vehicle.
   *
   * However, many jurisdictions may provide exemptions for vehicles being
   * immediately exported out of Alaska.
   *
   * ALASKA RESIDENTS BUYING OUT-OF-STATE:
   * Alaska does not impose a use tax on vehicles purchased out-of-state
   * and brought into Alaska, as there is no state sales or use tax.
   */
  reciprocity: {
    enabled: true,
    scope: "BOTH",
    homeStateBehavior: "NONE",
    requireProofOfTaxPaid: false,
    basis: "TAX_PAID",
    capAtThisStatesTax: false,
    hasLeaseException: false,
    notes:
      "Alaska has NO state sales tax or use tax. Local jurisdictions may impose sales taxes " +
      "(0% to 7.5%+), but state-level reciprocity does not apply. Out-of-state buyers pay " +
      "local tax based on dealership location (if applicable). Alaska residents importing " +
      "vehicles from other states owe NO state use tax.",
  },

  extras: {
    lastUpdated: "2025-11-14",
    sources: [
      "Alaska Department of Commerce, Community, and Economic Development",
      "Alaska Division of Motor Vehicles (dmv.alaska.gov)",
      "Sales Tax Handbook - Alaska (salestaxhandbook.com)",
      "Avalara Alaska Sales Tax Calculator",
      "Alaska Auto Dealers Association",
      "Alaska Administrative Code",
    ],
    notes:
      "Alaska has NO state sales tax (one of five states without sales tax). Uses LOCAL_ONLY tax " +
      "scheme where only local municipalities may impose sales taxes. Tax rates varies by municipality " +
      "from 0% to 7%. 151 local tax jurisdictions, average rate 1.76%. Major cities " +
      "Anchorage and Fairbanks have 0% local tax. Juneau (capital) has 5% local tax. Trade-in " +
      "credit applies where local tax exists. Manufacturer rebates reduce taxable base. Doc fees " +
      "average ~$80 (NO state cap). VSC and GAP NOT taxable. Leases: monthly taxation on payments " +
      "only. NO state use tax on out-of-state purchases. Title fee $15, registration varies by " +
      "vehicle weight and type.",
    stateSalesRate: 0,
    stateAutomotiveSalesRate: 0.0,
    stateAutomotiveLeaseRate: 0.0,
    localRateRange: { min: 0.0, max: 7 },
    localTaxRange: { min: 0.0, max: 7 },  // Alias for test compatibility
    combinedRateRange: { min: 0.0, max: 7 },
    avgDocFee: 80,
    titleFee: 15.0,
    jurisdictionCount: 151,
    averageLocalRate: 1.76,
    majorJurisdictions: {
      Anchorage: { state: 0.0, local: 0.0, total: 0.0 },
      Fairbanks: { state: 0.0, local: 0.0, total: 0.0 },
      Juneau: { state: 0.0, local: 5.0, total: 5.0 },
      Sitka: { state: 0.0, local: 6.0, total: 6.0 },
      Ketchikan: { state: 0.0, local: 6.5, total: 6.5 },
      Nome: { state: 0.0, local: 5.5, total: 5.5 },
    },
  },
};

export default US_AK;
