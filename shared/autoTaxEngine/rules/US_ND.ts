import { TaxRulesConfig } from "../types";

/**
 * NORTH DAKOTA TAX RULES
 *
 * Researched: 2025-11-14
 * Version: 1
 *
 * KEY FACTS:
 * - Motor Vehicle Excise Tax: 5% state rate (NO local taxes)
 * - Trade-in credit: FULL (trade-in value deducted from selling price before tax)
 * - Manufacturer rebates: NON-TAXABLE (reduce taxable purchase price)
 * - Dealer rebates: Conflicting info, but official guidance suggests taxable
 * - Doc fee: Taxable, NO STATE CAP (average $175-$299)
 * - Service contracts (VSC): Information not definitive
 * - GAP insurance: Information not definitive
 * - Accessories: TAXABLE (included in purchase price)
 * - Lease taxation: UPFRONT (5% on total lease consideration for leases ≥1 year, vehicles <10,000 lbs)
 * - Reciprocity: YES (credit for taxes paid to reciprocal states)
 * - Registration fee: $49
 *
 * UNIQUE NORTH DAKOTA FEATURES:
 * 1. FLAT 5% STATE RATE: No local taxes - simple statewide rate
 * 2. MANUFACTURER REBATES REDUCE TAX BASE: Rebates subtracted from selling price (unlike some states)
 * 3. UPFRONT LEASE TAX: For leases ≥1 year, full 5% tax due at inception (not monthly)
 * 4. SHORT-TERM LEASE EXCEPTION: Leases <1 year taxed differently
 * 5. WEIGHT-BASED LEASE RULES: Vehicles ≥10,000 lbs have different lease tax treatment
 * 6. RECIPROCITY WITH CREDIT: Credit allowed for taxes paid to reciprocal states
 * 7. NO LOCAL OPTION TAXES: Unlike most states, no county or city sales taxes on vehicles
 *
 * TAX CALCULATION FORMULA (RETAIL):
 * Taxable Base = (Selling Price + Accessories + Dealer Prep + Freight) - Trade-In Value - Manufacturer Rebates
 * Tax = Taxable Base × 5%
 *
 * Example (Retail Sale):
 * $30,000 vehicle - $10,000 trade-in + $500 doc fee
 * Taxable Base: $30,000 - $10,000 = $20,000
 * Tax: $20,000 × 5% = $1,000
 * (Doc fee taxed separately: $500 × 5% = $25)
 * Total Tax: $1,025
 *
 * LEASE CALCULATION (UPFRONT for ≥1 year, <10,000 lbs):
 * Tax Base = Total Lease Consideration (all payments + cap reductions)
 * Tax = Tax Base × 5% (paid upfront at lease inception)
 *
 * Example (36-month lease):
 * Monthly payment: $450 × 36 months = $16,200
 * Cap reduction: $5,000
 * Total Consideration: $21,200
 * Tax: $21,200 × 5% = $1,060 (due at lease inception)
 *
 * SOURCES:
 * - North Dakota Office of State Tax Commissioner (tax.nd.gov)
 * - North Dakota Century Code Title 57, Chapter 40.3 (Motor Vehicle Excise Tax)
 * - ND Tax Commissioner Guideline GL-21963 (Motor Vehicle Excise Tax)
 * - ND Tax Commissioner Guideline GL-22071 (Lease or Rental of Motor Vehicles)
 * - North Dakota Administrative Code 81-05.1 (Motor Vehicle Excise Tax)
 * - North Dakota Department of Transportation / Motor Vehicle Division
 */
export const US_ND: TaxRulesConfig = {
  stateCode: "ND",
  version: 1,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL
   *
   * North Dakota allows full trade-in credit. The trade-in value is deducted
   * from the selling price before calculating the 5% motor vehicle excise tax.
   *
   * Official Guidance (ND Tax Commissioner GL-21963):
   * "When a motor vehicle is traded in to purchase a vehicle, the trade-in
   * credit is subtracted from the selling price of the vehicle before
   * calculating the tax."
   *
   * Example:
   *   Selling Price: $25,000
   *   Trade-In Value: $8,000
   *   Taxable Base: $25,000 - $8,000 = $17,000
   *   Tax (5%): $17,000 × 5% = $850
   *
   * The full trade-in value is deductible, with no cap or limitation.
   *
   * Source: ND Tax Commissioner Guideline GL-21963
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules:
   *
   * MANUFACTURER REBATES: NON-TAXABLE (reduce taxable purchase price)
   *
   * Official Guidance (ND Tax Commissioner GL-21963):
   * "A manufacturer's discount, incentive, or rebate applied at the time of
   * the sale is subtracted from the selling price of the vehicle to determine
   * the taxable purchase price."
   *
   * Manufacturer rebates, incentives, and discounts reduce the taxable amount
   * just like trade-ins.
   *
   * Example:
   *   MSRP: $30,000
   *   Manufacturer Rebate: $3,000
   *   Selling Price: $27,000
   *   Taxable Base: $27,000
   *   Tax (5%): $27,000 × 5% = $1,350
   *
   * DEALER REBATES: Conflicting information
   * Some sources indicate dealer rebates/incentives ARE taxable, but official
   * guidance is not entirely clear. Conservative approach is to treat dealer
   * rebates as taxable unless they represent a true reduction in selling price.
   *
   * Source: ND Tax Commissioner GL-21963
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: false,
      notes:
        "Manufacturer rebates, discounts, and incentives applied at time of sale ARE SUBTRACTED " +
        "from selling price before calculating tax. This reduces the taxable purchase price.",
    },
    {
      appliesTo: "DEALER",
      taxable: true,
      notes:
        "Dealer rebates and incentives: Conflicting information in sources. Conservative approach " +
        "treats dealer rebates as taxable unless they represent a documented reduction in actual " +
        "selling price.",
    },
  ],

  /**
   * Doc Fee: TAXABLE
   *
   * Documentation fees are subject to the 5% motor vehicle excise tax in
   * North Dakota.
   *
   * North Dakota has NO CAP on documentation fees.
   * - Average doc fee: $175 (Edmunds data) to $299 (2023 data)
   * - Dealers set their own fees
   * - Recommended to compare between dealers
   *
   * Taxability:
   * Doc fees are included in the taxable purchase price and subject to
   * 5% motor vehicle excise tax.
   *
   * Example:
   *   Doc Fee: $250
   *   Tax on Doc Fee: $250 × 5% = $12.50
   *
   * Source: ND has no doc fee cap statute; taxability from ND Tax Code
   */
  docFeeTaxable: true,

  /**
   * Fee Taxability Rules
   *
   * North Dakota's motor vehicle excise tax applies to the total purchase
   * price including certain fees and charges.
   *
   * TAXABLE PURCHASE PRICE INCLUDES:
   * - Vehicle selling price
   * - Accessories
   * - Dealer preparation charges
   * - Freight and delivery charges
   * - Documentation fees
   *
   * NOT INCLUDED (Non-Taxable):
   * - Government fees (title, registration, plate fees)
   * - Separately stated non-mandatory charges
   *
   * SERVICE CONTRACTS (VSC):
   * Official guidance not definitive. Generally treated as non-taxable
   * when separately stated, but verification recommended.
   *
   * GAP INSURANCE:
   * Official guidance not definitive. Generally treated as insurance
   * (non-taxable) when separately stated.
   *
   * TITLE FEE:
   * NOT taxable (government fee)
   *
   * REGISTRATION FEES:
   * NOT taxable (government fees)
   *
   * Source: ND Tax Commissioner GL-21963
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: false,
      notes:
        "Service contracts generally NOT taxable when separately stated. ND guidance not " +
        "definitive - verify with ND Tax Commissioner for specific situations.",
    },
    {
      code: "GAP",
      taxable: false,
      notes:
        "GAP insurance generally NOT taxable (treated as insurance product). ND guidance not " +
        "definitive - verify with ND Tax Commissioner for specific situations.",
    },
    {
      code: "DOC_FEE",
      taxable: true,
      notes:
        "Doc fees ARE TAXABLE at 5% rate. North Dakota has NO cap on doc fees " +
        "(average $175-$299).",
    },
    {
      code: "TITLE",
      taxable: false,
      notes: "Title fees NOT taxable (government fee)",
    },
    {
      code: "REG",
      taxable: false,
      notes: "Registration fees NOT taxable (government fees). Base registration: $49",
    },
  ],

  /**
   * Product Taxability
   *
   * ACCESSORIES: TAXABLE
   * Accessories included in the vehicle purchase are part of the taxable
   * purchase price and subject to 5% excise tax.
   *
   * Official Guidance:
   * "The taxable purchase price is the total selling price of the vehicle,
   * including all charges for accessories, dealer preparation, freight, and
   * delivery, less any qualified discounts."
   *
   * NEGATIVE EQUITY: NOT TAXABLE
   * Negative equity rolled into financing is not part of the taxable
   * purchase price. It's a debt obligation, not consideration for the vehicle.
   *
   * SERVICE CONTRACTS: Generally NOT TAXABLE (when separately stated)
   * GAP: Generally NOT TAXABLE (insurance product, when separately stated)
   *
   * Source: ND Tax Commissioner GL-21963
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: false,
  taxOnServiceContracts: false,
  taxOnGap: false,

  /**
   * Vehicle Tax Scheme: STATE_ONLY
   *
   * North Dakota has a FLAT 5% motor vehicle excise tax rate statewide.
   * There are NO county, city, or local option taxes on motor vehicles.
   *
   * This makes North Dakota one of the simplest states for vehicle tax
   * calculation - the rate is 5% everywhere in the state.
   *
   * Official Guidance:
   * "The motor vehicle excise tax rate is 5%. No local tax applies to the
   * purchase or transfer of a motor vehicle."
   *
   * Registration Fee: $49 (standard, statewide)
   *
   * Source: ND Century Code § 57-40.3-04; ND Tax Commissioner GL-21963
   */
  vehicleTaxScheme: "STATE_ONLY",
  vehicleUsesLocalSalesTax: false,

  // ============================================================================
  // LEASE TRANSACTION RULES
  // ============================================================================

  leaseRules: {
    /**
     * Lease Method: FULL_UPFRONT (for qualifying leases)
     *
     * North Dakota uses UPFRONT taxation for vehicle leases that meet
     * certain criteria:
     * - Lease term: 1 year or more
     * - Vehicle weight: Less than 10,000 pounds
     *
     * Official Guidance (ND Tax Commissioner GL-22071):
     * "For qualifying motor vehicles (10,000 pounds or less) placed into
     * lease service for one year or more, the 5% motor vehicle excise tax
     * is due at the inception of the lease based on the total consideration
     * of the lease."
     *
     * UPFRONT TAX CALCULATION:
     * Tax Base = Total Consideration of Lease
     * Total Consideration = Sum of all lease payments + cap cost reductions + fees
     * Tax = Total Consideration × 5% (paid at lease inception)
     *
     * Example (36-month lease):
     *   Monthly Payment: $450
     *   Number of Payments: 36
     *   Cap Cost Reduction: $5,000
     *   Total Consideration: ($450 × 36) + $5,000 = $21,200
     *   Tax at Inception: $21,200 × 5% = $1,060
     *
     * SHORT-TERM LEASES (<1 year):
     * Different rules may apply (not covered in detail here)
     *
     * HEAVY VEHICLES (≥10,000 lbs):
     * Different rules apply - may be taxed on monthly basis
     *
     * The tax must be paid upfront by the owner of the lease vehicle
     * (typically the lessor/leasing company).
     *
     * Source: ND Tax Commissioner GL-22071; ND Admin Code 81-05.1-01-04
     */
    method: "FULL_UPFRONT",

    /**
     * Cap Cost Reduction: TAXABLE (included in total lease consideration)
     *
     * All cap cost reductions are included in the total consideration of
     * the lease and are subject to the 5% upfront tax.
     *
     * Total Consideration includes:
     * - All monthly lease payments
     * - Capitalized cost reductions (cash down, rebates, trade-in)
     * - Any other charges included in the lease
     *
     * Example:
     *   Cap Cost Reduction: $8,000
     *   Monthly Payment: $400 × 36 = $14,400
     *   Total Consideration: $8,000 + $14,400 = $22,400
     *   Tax: $22,400 × 5% = $1,120 (due at inception)
     *
     * Source: ND Tax Commissioner GL-22071
     */
    taxCapReduction: true,

    /**
     * Rebate Behavior on Leases: ALWAYS_TAXABLE
     *
     * Rebates applied to leases as cap cost reductions are included in
     * the total consideration of the lease and taxed upfront at 5%.
     *
     * This differs from retail treatment where manufacturer rebates
     * reduce the taxable amount.
     *
     * On leases, all cap reductions (including rebates) are part of the
     * total consideration subject to upfront tax.
     *
     * Source: ND Tax Commissioner GL-22071
     */
    rebateBehavior: "ALWAYS_TAXABLE",

    /**
     * Doc Fee on Leases: ALWAYS taxable
     *
     * Documentation fees and acquisition fees on leases are included in
     * the total consideration of the lease and subject to 5% upfront tax.
     *
     * Example:
     *   Acquisition Fee: $595
     *   Included in total consideration
     *   Tax: Part of total × 5%
     *
     * Source: ND Tax Commissioner GL-22071
     */
    docFeeTaxability: "ALWAYS",

    /**
     * Trade-in Credit on Leases: NONE
     *
     * Unlike retail purchases, trade-in value does NOT reduce the taxable
     * amount on leases in North Dakota.
     *
     * If a trade-in is applied to a lease, its value becomes part of the
     * cap cost reduction, which is included in the total consideration
     * and is TAXABLE.
     *
     * This is a significant difference from retail treatment:
     * - RETAIL: Trade-in reduces taxable base (saves 5% tax)
     * - LEASE: Trade-in value is taxed as part of consideration (costs 5% tax)
     *
     * Example:
     *   Trade-In Value: $10,000 (applied as cap reduction)
     *   Becomes part of total consideration
     *   Tax on trade-in: $10,000 × 5% = $500 (included in upfront tax)
     *
     * Source: ND Tax Commissioner GL-22071
     */
    tradeInCredit: "NONE",

    /**
     * Negative Equity on Leases: TAXABLE
     *
     * Negative equity rolled into a lease increases the capitalized cost
     * and becomes part of the total consideration subject to upfront tax.
     *
     * Example:
     *   Base Cap Cost: $30,000
     *   Negative Equity: $4,000
     *   Adjusted Cap: $34,000
     *   Monthly Payment based on $34,000
     *   Total Consideration includes the $4,000 negative equity
     *   Tax: (Total Consideration) × 5%
     *
     * Source: ND Tax Commissioner GL-22071
     */
    negativeEquityTaxable: true,

    /**
     * Fee Taxability on Leases
     *
     * Most fees included in the lease are part of the total consideration
     * and subject to upfront tax.
     *
     * TAXABLE (included in total consideration):
     * - Acquisition fees
     * - Documentation fees
     * - Any fees capitalized into lease
     *
     * NOT TAXABLE (when separately stated):
     * - Government fees (title, registration)
     * - Service contracts (if separately stated)
     * - GAP insurance (if separately stated)
     *
     * Source: ND Tax Commissioner GL-22071
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: true,
        notes:
          "Doc fee/acquisition fee TAXABLE as part of total lease consideration (5% upfront)",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: false,
        notes:
          "Service contracts generally NOT taxable when separately stated on leases",
      },
      {
        code: "GAP",
        taxable: false,
        notes: "GAP generally NOT taxable when separately stated on leases",
      },
      {
        code: "TITLE",
        taxable: false,
        notes: "Title fees NOT taxable (government fee)",
      },
      {
        code: "REG",
        taxable: false,
        notes: "Registration fees NOT taxable (government fees)",
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
      {
        code: "REG",
        taxable: false,
        includedInCapCost: false,
        includedInUpfront: true,
        includedInMonthly: false,
      },
    ],

    taxFeesUpfront: true,

    specialScheme: "NONE",

    notes:
      "North Dakota: UPFRONT lease taxation for vehicles <10,000 lbs leased for ≥1 year. " +
      "5% tax due at lease inception based on TOTAL CONSIDERATION (all payments + cap " +
      "reductions + fees). Trade-in value does NOT reduce tax (taxed as part of cap reduction). " +
      "Manufacturer rebates on leases are TAXABLE (included in total consideration). Doc fees " +
      "taxable. Service contracts and GAP generally not taxable when separately stated. Tax " +
      "paid by lessor at lease inception.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: PARTIAL (credit for taxes paid to reciprocal states)
   *
   * North Dakota allows credit for motor vehicle excise tax paid to
   * other states IF that state grants reciprocal credit to North Dakota.
   *
   * Official Guidance:
   * "North Dakota allows credit for any excise tax paid on a motor vehicle
   * in another state if that state allows a reciprocal credit."
   *
   * HOW IT WORKS:
   *
   * 1. If new resident paid sales tax in previous state:
   *    - Credit allowed if previous state has reciprocity with ND
   *    - Credit limited to ND tax amount (5%)
   *    - If previous state tax < 5%, pay difference to ND
   *    - If previous state tax ≥ 5%, no additional ND tax due
   *
   * 2. Reciprocal states:
   *    - State must provide reciprocal credit to ND residents
   *    - Not all states have reciprocity agreements
   *    - Check with ND Tax Commissioner for current list
   *
   * Example 1 (Lower Tax State):
   *   Previous State Tax: 3%
   *   ND Tax: 5%
   *   Difference Owed to ND: 2%
   *
   * Example 2 (Higher Tax State):
   *   Previous State Tax: 7%
   *   ND Tax: 5%
   *   No Additional ND Tax Due
   *
   * DOCUMENTATION REQUIRED:
   * - Proof of tax paid to other state
   * - Bill of sale or purchase agreement
   * - Receipt showing tax amount paid
   *
   * FOR LEASED VEHICLES:
   * Credit will be provided for any sales tax, use tax, or motor vehicle
   * excise tax paid to another state for the remaining lease period.
   *
   * Leased vehicles entering ND from another state are subject to tax
   * on the remaining lease period. Credit is allowed for tax paid to
   * another state.
   *
   * Source: ND Tax Commissioner; ND Century Code reciprocity provisions
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
      "North Dakota provides reciprocity credit for taxes paid to states that grant reciprocal " +
      "credit to ND. Credit limited to ND's 5% tax rate. If other state tax was less than 5%, " +
      "pay difference to ND. If other state tax was 5% or more, no additional ND tax due. " +
      "Proof of tax payment required. Applies to both purchases and leases (credit for remaining " +
      "lease period). Not all states have reciprocity - verify with ND Tax Commissioner.",
  },

  extras: {
    lastUpdated: "2025-11-14",
    sources: [
      "North Dakota Office of State Tax Commissioner (tax.nd.gov)",
      "North Dakota Century Code Title 57, Chapter 40.3 (Motor Vehicle Excise Tax)",
      "ND Tax Commissioner Guideline GL-21963 (Motor Vehicle Excise Tax)",
      "ND Tax Commissioner Guideline GL-22071 (Lease or Rental of Motor Vehicles)",
      "North Dakota Administrative Code 81-05.1 (Motor Vehicle Excise Tax)",
      "North Dakota Administrative Code 81-04.1-04-40 (Rentals and rental agencies)",
      "North Dakota Department of Transportation / Motor Vehicle Division",
      "Sales Tax Handbook - North Dakota Sales Tax on Vehicles",
      "PrivateAuto - North Dakota Sales Taxes",
    ],
    notes:
      "North Dakota has a flat 5% motor vehicle excise tax with NO LOCAL TAXES (simplest " +
      "calculation of any state with sales tax). Full trade-in credit on retail purchases. " +
      "Manufacturer rebates REDUCE taxable amount (unlike many states). Leases (≥1 year, <10,000 lbs) " +
      "taxed UPFRONT at 5% on total consideration. Doc fees taxable, NO CAP (avg $175-$299). " +
      "Reciprocity with states that reciprocate. Registration fee: $49. Service contracts and GAP " +
      "generally not taxable when separately stated.",
    stateRate: 5.0,
    registrationFee: 49.0,
    avgDocFee: 237.0,
    docFeeRange: {
      low: 175.0,
      high: 299.0,
    },
    leaseTaxMethod:
      "UPFRONT for vehicles <10,000 lbs leased ≥1 year. Tax = 5% of total " +
      "consideration (all payments + cap reductions + fees) paid at lease inception by lessor.",
    uniqueFeatures: [
      "Flat 5% statewide rate - NO local taxes",
      "Manufacturer rebates REDUCE taxable amount",
      "Upfront lease taxation (not monthly)",
      "Full trade-in credit on retail",
      "No trade-in credit on leases",
      "Reciprocity with reciprocal states only",
      "Simple calculation - same rate everywhere",
    ],
  },
};

export default US_ND;
