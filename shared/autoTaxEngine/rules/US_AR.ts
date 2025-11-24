import { TaxRulesConfig } from "../types";

/**
 * ARKANSAS TAX RULES (Researched 2025-11-14)
 *
 * SOURCES:
 * - Arkansas Department of Finance and Administration (DFA)
 * - Arkansas Code Title 26, Chapter 52 - Gross Receipts Tax
 * - Arkansas Code Title 26, Chapter 53 - Compensating or Use Taxes
 * - Arkansas Code § 26-52-510 - Direct payment of tax by consumer-user
 * - Arkansas Code § 26-53-126 - Tax on motor vehicles
 * - Arkansas Admin. Code R. 006.05.08 § 9 - Services subject to tax
 * - Arkansas Admin. Code R. 006.05.08 § 12.1 - Sales tax credit for private sale
 * - Arkansas Admin. Code R. 006.05.08 § 20 - Leases and rentals
 * - Act 1232 of 1997 as amended by Act 277 of 2021 (trade-in credit)
 *
 * RETAIL SALES:
 * - 6.5% state sales tax PLUS local tax (typical combined: 8.5%-11.5%)
 * - Local rates range from 0% to 5%, average ~2.688%
 * - Trade-in credit: FULL (within 60-day window before/after purchase)
 * - Manufacturer rebates: TAXABLE (tax calculated before rebate applied)
 * - Dealer rebates: TAXABLE (tax calculated before rebate applied)
 * - Doc fee: TAXABLE (no state-mandated cap, avg ~$110)
 * - Service contracts: TAXABLE (when sold with vehicle, tax paid at registration)
 * - GAP coverage: TAXABLE (structured as waiver/addendum, not insurance)
 * - Accessories (dealer-installed): TAXABLE (included in taxable base)
 * - Negative equity: TAXABLE (rolled into taxable base)
 * - Title/registration fees: NOT TAXABLE (government fees)
 * - Vehicles under $4,000: EXEMPT from state tax
 * - Vehicles $4,000-$10,000: Reduced 3.5% state rate
 * - Vehicles $10,000+: Full 6.5% state rate
 *
 * LEASE TAXATION:
 * - Method: MONTHLY (tax on each periodic payment)
 * - Sales tax: 6.5% state + local on monthly payments
 * - Long-term rental vehicle tax: Additional 1.5% on monthly payments
 * - Total combined lease tax: ~8% state + local rates
 * - Capitalized cost reduction (down payment): TAXABLE (no trade-in deduction for leases)
 * - Trade-in on leases: NO CREDIT (trade-in deduction does NOT apply to leases)
 * - Doc fee on leases: TAXABLE
 * - Service contracts on leases: TAXABLE (when included, tax paid at registration)
 * - GAP on leases: TAXABLE
 * - Lessor options (vehicles leased after Aug 1, 1997):
 *   Option 1: Pay sales/use tax at registration; collect no lease taxes from lessee
 *   Option 2: Register tax-exempt; collect sales tax + 1.5% rental tax on all payments
 *
 * RECIPROCITY:
 * - Enabled: NO (Arkansas does NOT provide credit for taxes paid to other states)
 * - Arkansas residents purchasing out-of-state vehicles must pay full AR tax
 * - No credit given for sales tax paid to the originating state
 * - Private sale credit available ONLY for in-state transactions within 60-day window
 * - Other states similarly deny credit for AR taxes (reciprocal denial)
 *
 * SPECIAL NOTES:
 * - Arkansas uses "STATE_PLUS_LOCAL" system with local tax caps for vehicles
 * - Tax is paid directly to DFA at time of registration, not to dealer
 * - Trade-in credit available for purchases within 60 days before/after selling used vehicle
 * - Trade-in deduction explicitly NOT available for leased vehicles per AR Admin Code
 * - Service contracts and GAP are both taxable (unlike many states)
 * - Both are subject to sales tax when purchased with vehicle, paid at registration
 * - No reciprocity agreements - full Arkansas tax due regardless of prior state taxes paid
 */
const AR_RULES: TaxRulesConfig = {
  stateCode: "AR",
  version: 1, // Initial comprehensive research 2025-11-14

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL (with 60-day window)
   *
   * Arkansas allows full trade-in credit per Act 1232 of 1997 as amended
   * by Act 277 of 2021. The trade-in value is deducted from the purchase
   * price before calculating sales tax.
   *
   * Requirements:
   * - Trade-in or sale must occur within 60 days before or after purchase
   * - Applies to new and used motor vehicles, trailers, semitrailers
   * - Consumer pays tax on net difference between purchase and trade value
   */
  // Trade-in credit available within 60-day window before/after purchase.
  // Tax paid on net difference (purchase price minus trade-in value).
  tradeInPolicy: {
    type: "FULL",
    notes: "Full trade-in credit available within 60-day window before or after purchase. Trade-in deduction does NOT apply to leases.",
  },

  /**
   * Rebate Rules: Both manufacturer and dealer rebates are TAXABLE
   *
   * Arkansas taxes vehicle purchases BEFORE rebates or incentives are
   * applied to the price. The taxable amount is calculated before any
   * rebates are subtracted.
   *
   * Example: $25,000 vehicle with $3,000 manufacturer rebate
   * - Taxable amount: $25,000 (full price before rebate)
   * - After tax, rebate is applied to reduce final payment
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: true,
      notes:
        "Manufacturer rebates are taxable. Sales tax calculated on price BEFORE rebate applied.",
    },
    {
      appliesTo: "DEALER",
      taxable: true,
      notes:
        "Dealer incentives/rebates are taxable. Sales tax calculated on price BEFORE rebate applied.",
    },
  ],

  /**
   * Doc Fee: TAXABLE
   *
   * Documentation fees ARE subject to Arkansas sales tax. Arkansas has
   * no state-mandated cap on doc fees (average ~$110).
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules:
   *
   * Arkansas taxes most F&I products sold with vehicles:
   * - Service contracts: TAXABLE (tax paid at vehicle registration)
   * - GAP coverage: TAXABLE (structured as waiver/addendum, not insurance)
   * - Title fees: NOT TAXABLE (government fee)
   * - Registration fees: NOT TAXABLE (government fee)
   *
   * Per AR Admin Code R. 006.05.08 § 9, service contracts sold with
   * motor vehicles are subject to sales tax paid at time of vehicle
   * registration. The purchaser pays sales tax on both the vehicle
   * purchase price AND the service contract/warranty price.
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: true,
      notes:
        "Service contracts/extended warranties ARE taxable in Arkansas. " +
        "Tax paid at vehicle registration on the contract purchase price. " +
        "Labor/parts used under the contract are then exempt.",
    },
    {
      code: "GAP",
      taxable: true,
      notes:
        "GAP coverage IS taxable in Arkansas. Structured as waiver/addendum " +
        "to finance contract, not as insurance. Subject to sales tax at registration.",
    },
    { code: "TITLE", taxable: false, notes: "Government fee, not taxable" },
    { code: "REG", taxable: false, notes: "Government fee, not taxable" },
    {
      code: "PLATE_FEE",
      taxable: false,
      notes: "Government fee, not taxable",
    },
  ],

  /**
   * Product Taxability:
   *
   * - Accessories: TAXABLE (dealer-installed accessories included in base)
   * - Negative equity: TAXABLE (rolled into taxable purchase price)
   * - Service contracts: TAXABLE (Arkansas is one of few states that taxes VSCs)
   * - GAP: TAXABLE (Arkansas taxes GAP unlike most states)
   */
  taxOnAccessories: true, // Dealer-installed accessories are taxable
  taxOnNegativeEquity: true, // Negative equity increases taxable base
  taxOnServiceContracts: true, // Arkansas DOES tax service contracts (unusual)
  taxOnGap: true, // Arkansas DOES tax GAP (unusual)

  /**
   * Vehicle Tax Scheme: STATE_PLUS_LOCAL
   *
   * Arkansas uses a combined state and local sales tax system:
   * - State rate: 6.5% (or 3.5% for vehicles $4,000-$10,000, exempt under $4,000)
   * - Local rates: 0% to 5% (average ~2.688%)
   * - Combined typical rate: 8.5% to 11.5%
   * - Local tax caps still apply to motor vehicle transactions
   */
  vehicleTaxScheme: "STATE_PLUS_LOCAL",
  vehicleUsesLocalSalesTax: true, // Local rates DO apply to vehicle sales

  // ============================================================================
  // LEASE TRANSACTION RULES
  // ============================================================================

  leaseRules: {
    /**
     * Lease Method: MONTHLY
     *
     * Arkansas leases are taxed on each monthly/periodic payment:
     * - 6.5% state sales tax on each payment
     * - 1.5% long-term rental vehicle tax on each payment (for rentals 30+ days)
     * - Local sales tax also applies to lease payments
     * - Combined typical rate: ~8% state + local rates
     *
     * Note: Lessors have two options (vehicles leased after Aug 1, 1997):
     * Option 1: Pay sales/use tax at registration; no ongoing taxes
     * Option 2: Register tax-exempt; collect sales tax + 1.5% rental tax on payments
     */
    method: "MONTHLY",

    /**
     * Cap Cost Reduction: TAXABLE
     *
     * Down payments, cash or trade-ins applied to reduce capitalized
     * cost ARE fully taxable in Arkansas.
     *
     * CRITICAL: Arkansas Admin Code R. 006.05.08 § 20 explicitly states:
     * "The trade-in deduction available to purchasers of motor vehicles...
     * shall not apply to leased motor vehicles."
     *
     * Down payments in cash or vehicle transfers receive NO deduction
     * from the taxable base and are fully taxable as gross receipts.
     */
    taxCapReduction: true,

    /**
     * Rebate Behavior on Leases: FOLLOW_RETAIL_RULE
     *
     * Same as retail: manufacturer and dealer rebates are taxable.
     * Tax calculated on lease payment amounts before rebate adjustments.
     */
    rebateBehavior: "FOLLOW_RETAIL_RULE",

    /**
     * Doc Fee on Leases: ALWAYS taxable
     *
     * Documentation fees on leases are subject to sales tax.
     */
    docFeeTaxability: "ALWAYS",

    /**
     * Trade-in Credit on Leases: NONE
     *
     * CRITICAL: Arkansas explicitly denies trade-in credit for leases.
     * Per AR Admin Code R. 006.05.08 § 20:
     * "The trade-in deduction available to purchasers of motor vehicles...
     * shall not apply to leased motor vehicles."
     *
     * Trade-ins do NOT reduce the capitalized cost for tax purposes.
     * Any trade-in value applied is still subject to full sales tax.
     */
    tradeInCredit: "NONE",

    /**
     * Negative Equity on Leases: Taxable
     *
     * If negative equity is rolled into the lease, it increases the
     * capitalized cost and increases monthly payments, thus increasing
     * the sales tax paid on each payment.
     */
    negativeEquityTaxable: true,

    /**
     * Fee Taxability on Leases:
     *
     * - Doc fee: TAXABLE
     * - Service contracts: TAXABLE (when included in lease)
     * - GAP: TAXABLE (when included in lease)
     * - Title: NOT TAXABLE
     * - Registration: NOT TAXABLE
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: true,
        notes: "Doc fee subject to sales tax on leases",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: true,
        notes:
          "Service contracts ARE taxable on Arkansas leases. " +
          "Tax paid at vehicle registration when included with lease.",
      },
      {
        code: "GAP",
        taxable: true,
        notes:
          "GAP IS taxable on Arkansas leases. " +
          "Structured as waiver/addendum, subject to sales tax.",
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
     * Taxable fees and down payments on leases are taxed upfront.
     */
    taxFeesUpfront: true,

    /**
     * Special Scheme: NONE
     *
     * Arkansas uses standard monthly lease taxation with an additional
     * long-term rental vehicle tax. No special calculation scheme needed.
     */
    specialScheme: "NONE",

    notes:
      "Arkansas leases: 6.5% state sales tax + 1.5% long-term rental vehicle tax + local rates on monthly payments. " +
      "CRITICAL: Trade-in deduction does NOT apply to leases per AR Admin Code. " +
      "Down payments and trade-ins are fully taxable with no credit. " +
      "Service contracts and GAP are both taxable when included in lease.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: NOT ENABLED
   *
   * Arkansas does NOT provide credit for sales or use taxes paid to
   * another state for motor vehicles, trailers, or semitrailers that
   * are first registered by the purchaser in Arkansas.
   *
   * Per Arkansas Code § 26-52-510 and interpretations:
   * - No credit for out-of-state taxes paid
   * - Arkansas residents buying vehicles out-of-state pay full AR tax
   * - Proof of prior state taxes paid does not reduce AR tax obligation
   * - Other states reciprocally deny credit for AR taxes (e.g., Massachusetts)
   *
   * Available credits (in-state only):
   * - Trade-in credit: Within 60-day window for purchase transactions
   * - Private sale credit: Sell used vehicle, buy new/used within 60 days
   *
   * Example:
   * - Arkansas resident buys $30,000 vehicle in Tennessee (pays TN 7% = $2,100)
   * - Brings vehicle to Arkansas to register
   * - Must pay full Arkansas tax (~9% = $2,700) with NO credit for TN tax paid
   * - Total taxes paid: $4,800 (both states, no offset)
   */
  // Arkansas does NOT provide reciprocity or credit for taxes paid to other states
  // on motor vehicle purchases. Arkansas residents purchasing vehicles out-of-state
  // must pay full Arkansas sales tax with NO credit for taxes paid elsewhere.
  // This is a reciprocal policy - other states deny credit for AR taxes similarly.
  // Trade-in and private sale credits are available ONLY for in-state transactions
  // within 60-day windows.
  reciprocity: {
    enabled: false, // NO reciprocity for out-of-state vehicle taxes
    scope: "NONE",
    homeStateBehavior: "NONE",
    requireProofOfTaxPaid: false, // N/A - no credit given regardless of proof
    basis: "TAX_PAID",
    capAtThisStatesTax: false,
    hasLeaseException: false,
    notes: "Arkansas does NOT provide reciprocity or credit for taxes paid to other states. Full AR tax due regardless.",
  },

  // ============================================================================
  // ARKANSAS-SPECIFIC CONFIGURATION
  // ============================================================================

  extras: {
    // Arkansas state sales tax rates
    stateSalesTaxRate: 0.065, // 6.5% standard rate
    reducedRateThreshold: 4000, // Under $4,000: exempt
    reducedRate: 0.035, // 3.5% for $4,000-$10,000
    reducedRateMax: 10000, // $10,000+: full 6.5% rate
    fullRateThreshold: 10000,

    // Local tax information
    localTaxRange: { min: 0, max: 0.05 },
    averageLocalRate: 0.02688, // ~2.688% average local rate
    typicalCombinedRate: "8.5% to 11.5%",

    // Lease-specific rates
    longTermRentalVehicleTax: 0.015, // 1.5% additional on lease payments
    shortTermRentalVehicleTax: 0.01, // 1% for rentals under 30 days
    shortTermRentalBaseTax: 0.10, // 10% base rental vehicle tax (short-term)

    // Trade-in and credit information
    tradeInWindowDays: 60, // 60 days before or after purchase
    privateSaleCredit: true, // Available for in-state transactions
    privateSaleCreditWindowDays: 60,

    // Fee information
    docFeeAverage: 110, // Average doc fee ~$110 (no state cap)
    docFeeCap: null, // No state-mandated cap on doc fees

    // Tax payment method
    paymentMethod: "DIRECT_TO_DFA",
    paymentTiming: "AT_REGISTRATION",

    // Reciprocity
    reciprocityEnabled: false,
    noOutOfStateTaxCredit: true,

    // Special taxability notes
    serviceContractsTaxable: true, // Unusual - most states exempt
    gapTaxable: true, // Unusual - most states exempt
    leaseTradeInCredit: false, // Explicitly denied for leases

    lastUpdated: "2025-11-14",
    sources: [
      "Arkansas Department of Finance and Administration (DFA)",
      "Arkansas Code Title 26, Chapter 52 - Gross Receipts Tax",
      "Arkansas Code Title 26, Chapter 53 - Compensating or Use Taxes",
      "Arkansas Code § 26-52-510 - Direct payment of tax by consumer-user",
      "Arkansas Code § 26-53-126 - Tax on motor vehicles",
      "Arkansas Admin. Code R. 006.05.08 § 9 - Services subject to tax",
      "Arkansas Admin. Code R. 006.05.08 § 12.1 - Sales tax credit",
      "Arkansas Admin. Code R. 006.05.08 § 20 - Leases and rentals",
      "Act 1232 of 1997 as amended by Act 277 of 2021",
    ],
    notes:
      "Arkansas uses STATE_PLUS_LOCAL system with 6.5% state rate plus local rates (0-5%). " +
      "Trade-in credit available for purchases (60-day window) but NOT for leases. " +
      "Manufacturer and dealer rebates are taxable (tax calculated before rebates). " +
      "Service contracts and GAP are BOTH taxable (unusual - most states exempt these). " +
      "NO reciprocity - no credit for taxes paid to other states. " +
      "Leases taxed monthly with 6.5% sales tax + 1.5% long-term rental tax + local rates. " +
      "Vehicles under $4,000 exempt, $4,000-$10,000 taxed at reduced 3.5% state rate. " +
      "Tax paid directly to DFA at registration, not collected by dealer.",

    description:
      "Arkansas vehicle sales tax: 6.5% state + local (avg 2.688%), combined typical 8.5-11.5%. " +
      "Full trade-in credit for purchases, but NO trade-in credit for leases. " +
      "Rebates are taxable. Service contracts and GAP are taxable (unusual). " +
      "No reciprocity - full AR tax due even if taxes paid to another state. " +
      "Leases taxed monthly with additional 1.5% rental vehicle tax.",
  },
};

export default AR_RULES;
