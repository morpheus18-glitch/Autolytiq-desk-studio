import { TaxRulesConfig } from "../types";

/**
 * MONTANA TAX RULES
 *
 * Researched: 2025-11-14
 * Version: 1
 *
 * KEY FACTS:
 * - NO STATE SALES TAX on vehicles (Montana is one of 5 states with no sales tax)
 * - Registration fees: Based on vehicle age (0-4 years: $217, 5-10 years: $87, 11+ years: $28 annual or $87.50 permanent)
 * - Permanent registration available for vehicles 11+ years old
 * - Luxury vehicle tax: $825/year for vehicles with MSRP ≥ $150,000 (until 11 years old)
 * - Title transfer fee: $12.00 (standard), $18.50 (salvage)
 * - License plates: $10.30 for standard plates
 * - Doc fee: Average $224, NO STATE CAP
 * - Trade-in credit: N/A (no sales tax to credit against)
 * - Manufacturer rebates: N/A (no sales tax)
 * - Service contracts & GAP: N/A (no sales tax)
 * - Lease taxation: NO SALES TAX on leases
 * - Reciprocity: Not applicable (no tax to reciprocate)
 * - County option tax: Counties may impose local option motor vehicle tax based on MSRP with depreciation
 *
 * UNIQUE MONTANA FEATURES:
 * 1. NO SALES TAX: Montana is one of only 5 states (MT, AK, DE, NH, OR) with no statewide sales tax
 * 2. TAX HAVEN STATUS: Montana has been popular for registering expensive vehicles to avoid sales tax
 * 3. PERMANENT REGISTRATION: Vehicles 11+ years old can pay once and never renew (as long as ownership unchanged)
 * 4. LUXURY VEHICLE TAX: High-value vehicles (MSRP ≥ $150,000) subject to $825 annual tax until 11 years old
 * 5. AGE-BASED REGISTRATION: Fees dramatically decrease as vehicle ages (from $217 to $28 annually)
 * 6. COUNTY OPTION TAX: Local jurisdictions may impose vehicle tax based on depreciated MSRP
 * 7. LLC REGISTRATION: Montana allows LLC vehicle registration (used by non-residents for tax avoidance)
 *
 * TAX AVOIDANCE WARNING:
 * Montana's lack of sales tax has led to widespread use of Montana LLC registrations by non-residents
 * to avoid paying sales tax in their home states. Many states are cracking down on this practice.
 * Neighboring states (WA, CA, OR, WY, ID, ND, SD) have enforcement mechanisms for residents who
 * register vehicles in Montana to avoid home-state taxes.
 *
 * REGISTRATION FEE STRUCTURE:
 * Age 0-4 years: $217 annual registration
 * Age 5-10 years: $87 annual registration
 * Age 11+ years: $28 annual OR $87.50 permanent registration (one-time fee)
 *
 * Additional Fees:
 * - Title transfer: $12.00
 * - Salvage title: $18.50
 * - Standard plates: $10.30
 * - County option tax: Varies by county (based on MSRP × depreciation factor × local rate)
 * - Highway Patrol salary fee: $10.00
 *
 * LUXURY VEHICLE TAX (Effective for vehicles with MSRP ≥ $150,000):
 * - Annual tax: $825
 * - Applies to: Light vehicles (cars, pickups, SUVs) with original MSRP ≥ $150,000
 * - Duration: Until vehicle is 11 years old
 * - Purpose: Offset lost revenue from permanent registration option
 *
 * COUNTY OPTION TAX:
 * Counties may impose local option motor vehicle tax based on:
 * - Manufacturer's suggested retail price (MSRP)
 * - Depreciated according to statutory schedule
 * - Rate set by county (varies)
 * - Paid at registration with state fees
 *
 * SOURCES:
 * - Montana Motor Vehicle Division (mvdmt.gov)
 * - Montana Code Annotated Title 61, Chapter 3 (Registration and Licensing)
 * - Montana Code Annotated § 61-3-321 (Registration fees)
 * - Montana Legislature Vehicle Fee Brochure (2023 Interim)
 * - County Treasurer motor vehicle departments
 */
export const US_MT: TaxRulesConfig = {
  stateCode: "MT",
  version: 1,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL (but meaningless since there's no sales tax)
   *
   * Montana has NO state sales tax on vehicle purchases, so trade-in credit
   * is not applicable. There is no tax to reduce.
   *
   * Trade-ins affect the purchase price and financing, but do not provide
   * any tax benefit since there is no sales tax to begin with.
   *
   * Example:
   *   Vehicle Price: $30,000
   *   Trade-In Value: $10,000
   *   Net Amount Due: $20,000
   *   Sales Tax: $0
   *   Tax Savings from Trade-In: $0 (no tax to save on)
   *
   * Source: Montana has no sales tax statute
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules: Not applicable (no sales tax)
   *
   * Since Montana has no sales tax, manufacturer and dealer rebates do not
   * affect any tax calculation. They simply reduce the purchase price.
   *
   * MANUFACTURER REBATES:
   * - Reduce the purchase price directly
   * - No tax implications (no sales tax exists)
   * - Full benefit goes to buyer
   *
   * DEALER REBATES:
   * - Same treatment as manufacturer rebates
   * - No tax implications
   *
   * Example:
   *   MSRP: $35,000
   *   Manufacturer Rebate: $5,000
   *   Customer Pays: $30,000
   *   Tax: $0
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: false,
      notes:
        "Manufacturer rebates reduce purchase price. Montana has no sales tax, so no tax implications.",
    },
    {
      appliesTo: "DEALER",
      taxable: false,
      notes:
        "Dealer rebates reduce purchase price. Montana has no sales tax, so no tax implications.",
    },
  ],

  /**
   * Doc Fee: NOT TAXABLE (Montana has no sales tax)
   *
   * Documentation fees are charged by dealers but are NOT subject to sales
   * tax because Montana has no sales tax.
   *
   * Montana has NO CAP on documentation fees.
   * - Average doc fee: $224
   * - Observed range: $100 to $400+
   * - Dealers set their own fees
   *
   * Recommendation: Shop around and negotiate, as Montana dealers have
   * complete discretion on doc fee amounts.
   *
   * Source: Montana has no doc fee cap statute; average from dealer surveys
   */
  docFeeTaxable: false,

  /**
   * Fee Taxability Rules
   *
   * Montana has NO SALES TAX, therefore:
   * - NO fees are subject to sales tax
   * - All fees are charged at face value with no tax added
   * - Registration fees are fixed by statute
   * - Title fees are fixed by statute
   *
   * SERVICE CONTRACTS (VSC):
   * - NOT subject to sales tax (no sales tax exists)
   * - Charged at contract price
   *
   * GAP INSURANCE:
   * - NOT subject to sales tax (no sales tax exists)
   * - Charged at face value
   *
   * TITLE FEE:
   * - $12.00 for standard title transfer
   * - $18.50 for salvage title
   * - Fixed by statute, not subject to tax
   *
   * REGISTRATION FEES:
   * - Based on vehicle age (see registration fee schedule)
   * - Not subject to sales tax
   * - Fixed by Montana Code Annotated § 61-3-321
   *
   * DOC FEE:
   * - Not subject to sales tax (no sales tax exists)
   * - Average $224, no statutory cap
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: false,
      notes:
        "Service contracts NOT subject to sales tax (Montana has no sales tax)",
    },
    {
      code: "GAP",
      taxable: false,
      notes: "GAP insurance NOT subject to sales tax (Montana has no sales tax)",
    },
    {
      code: "DOC_FEE",
      taxable: false,
      notes:
        "Doc fee NOT subject to sales tax. Montana has NO cap on doc fees (avg $224)",
    },
    {
      code: "TITLE",
      taxable: false,
      notes: "Title fee NOT subject to sales tax. Standard: $12.00, Salvage: $18.50",
    },
    {
      code: "REG",
      taxable: false,
      notes:
        "Registration fees NOT subject to sales tax. Based on vehicle age: " +
        "0-4 years: $217, 5-10 years: $87, 11+ years: $28 or $87.50 permanent",
    },
  ],

  /**
   * Product Taxability
   *
   * Montana has NO SALES TAX on any vehicle-related products or services.
   *
   * Accessories: NOT TAXABLE (no sales tax)
   * Negative Equity: NOT TAXABLE (no sales tax)
   * Service Contracts: NOT TAXABLE (no sales tax)
   * GAP: NOT TAXABLE (no sales tax)
   *
   * Everything is charged at face value with no tax added.
   */
  taxOnAccessories: false,
  taxOnNegativeEquity: false,
  taxOnServiceContracts: false,
  taxOnGap: false,

  /**
   * Vehicle Tax Scheme: STATE_ONLY (but no sales tax)
   *
   * Montana has NO STATE SALES TAX and NO LOCAL SALES TAX on vehicles.
   *
   * Instead of sales tax, Montana collects:
   * 1. Registration fees (age-based, statutory)
   * 2. Title transfer fees (statutory)
   * 3. License plate fees (statutory)
   * 4. County option tax (optional, based on depreciated MSRP)
   * 5. Luxury vehicle tax (if MSRP ≥ $150,000)
   *
   * These fees are NOT sales taxes and are collected at time of registration,
   * not at time of sale.
   *
   * County Option Tax:
   * Some Montana counties impose a local option motor vehicle tax based on:
   * - Vehicle's manufacturer suggested retail price (MSRP)
   * - Depreciated according to statutory schedule
   * - Local rate set by county
   * - Collected annually at registration
   *
   * This is NOT a sales tax but rather an annual property-style tax on
   * vehicle value.
   *
   * Source: Montana Code Annotated Title 61, Chapter 3
   */
  vehicleTaxScheme: "STATE_ONLY",
  vehicleUsesLocalSalesTax: false,

  // ============================================================================
  // LEASE TRANSACTION RULES
  // ============================================================================

  leaseRules: {
    /**
     * Lease Method: MONTHLY (but no tax applied)
     *
     * Montana has NO SALES TAX on vehicle leases.
     *
     * Lease payments are not subject to any sales tax, upfront tax, or
     * monthly tax. The lessee pays:
     * - Monthly lease payment (no tax)
     * - Registration fees (based on vehicle age)
     * - Title fees (if applicable)
     * - County option tax (if applicable in county)
     *
     * Registration fees are paid by the vehicle owner (lessor or lessee
     * depending on lease structure) but are not sales taxes.
     *
     * Source: Montana has no sales tax on leases
     */
    method: "MONTHLY",

    /**
     * Cap Cost Reduction: NOT TAXABLE (no sales tax)
     *
     * Montana does not tax capitalized cost reductions on leases because
     * there is no sales tax.
     *
     * Cap reductions (cash down, rebates, trade-in equity) simply reduce
     * the cap cost with no tax implications.
     *
     * Example:
     *   Gross Cap Cost: $40,000
     *   Cap Reductions: $10,000
     *   Adjusted Cap Cost: $30,000
     *   Tax on Cap Reduction: $0
     */
    taxCapReduction: false,

    /**
     * Rebate Behavior on Leases: FOLLOW_RETAIL_RULE
     *
     * Since retail has no sales tax, leases also have no sales tax on
     * rebates applied as cap cost reductions.
     *
     * Rebates reduce the cap cost with no tax implications.
     */
    rebateBehavior: "FOLLOW_RETAIL_RULE",

    /**
     * Doc Fee on Leases: NEVER taxable (no sales tax)
     *
     * Documentation fees on leases are NOT subject to sales tax because
     * Montana has no sales tax.
     *
     * Doc fees are charged at face value with no tax added.
     */
    docFeeTaxability: "NEVER",

    /**
     * Trade-in Credit on Leases: FULL (but no tax benefit)
     *
     * Trade-ins on leases reduce the cap cost but provide no tax benefit
     * because Montana has no sales tax.
     *
     * Trade-in equity applied to a lease:
     * - Reduces the gross cap cost
     * - Lowers monthly payments
     * - No tax savings (no tax exists)
     */
    tradeInCredit: "FULL",

    /**
     * Negative Equity on Leases: NOT TAXABLE (no sales tax)
     *
     * Negative equity rolled into a lease increases the cap cost but
     * is not subject to any tax because Montana has no sales tax.
     */
    negativeEquityTaxable: false,

    /**
     * Fee Taxability on Leases
     *
     * Montana has NO SALES TAX on any lease-related fees or products.
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: false,
        notes: "Doc fee NOT taxable on leases (Montana has no sales tax)",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: false,
        notes: "Service contracts NOT taxable on leases (no sales tax)",
      },
      {
        code: "GAP",
        taxable: false,
        notes: "GAP NOT taxable on leases (no sales tax)",
      },
      {
        code: "TITLE",
        taxable: false,
        notes: "Title fee NOT taxable on leases",
      },
      {
        code: "REG",
        taxable: false,
        notes: "Registration fees NOT taxable",
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
      {
        code: "REG",
        taxable: false,
        includedInCapCost: false,
        includedInUpfront: true,
        includedInMonthly: false,
      },
    ],

    taxFeesUpfront: false,

    specialScheme: "NONE",

    notes:
      "Montana: NO SALES TAX on vehicle leases. Lease payments, cap cost reductions, " +
      "rebates, trade-ins, negative equity, doc fees, and backend products are ALL NOT TAXABLE. " +
      "Registration fees (age-based: $217, $87, or $28) and title fees ($12) apply but are not " +
      "sales taxes. Luxury vehicle tax ($825/year) applies to vehicles with MSRP ≥ $150,000.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: NOT APPLICABLE (Montana has no sales tax)
   *
   * Montana has no sales tax to reciprocate with other states.
   *
   * IMPORTANT CONSIDERATIONS FOR OUT-OF-STATE BUYERS:
   *
   * 1. MONTANA RESIDENTS: No sales tax on vehicles purchased anywhere
   * 2. NON-RESIDENTS REGISTERING IN MONTANA: May be subject to use tax in home state
   * 3. NON-RESIDENTS USING MONTANA LLC: Many states are cracking down on this practice
   *
   * Montana LLC Vehicle Registration:
   * Montana allows vehicle registration through Montana LLCs, which has been
   * used by non-residents (particularly from WA, CA, OR) to avoid paying
   * sales tax in their home states. This is legal in Montana but may violate
   * home state use tax laws.
   *
   * States actively enforcing against Montana LLC registrations:
   * - California: Requires use tax payment within 12 months of bringing vehicle into CA
   * - Washington: Requires use tax payment if vehicle primarily garaged in WA
   * - Oregon: Enforces use tax for vehicles principally used in OR
   * - Wyoming, Idaho, North Dakota, South Dakota: Various enforcement mechanisms
   *
   * Recent Legal Changes (2024):
   * Some states have strengthened enforcement and penalties for using Montana
   * LLC registrations to evade home-state taxes. Montana itself has not changed
   * its laws, but increased enforcement by other states makes this practice
   * riskier.
   *
   * Recommendation:
   * Non-residents should consult with tax professionals in their home state
   * before using Montana registration to understand potential use tax liability
   * and penalties.
   *
   * Source: Montana Code Annotated; neighboring states' use tax statutes
   */
  // Montana has NO SALES TAX, so reciprocity is not applicable. However, non-residents
  // registering vehicles in Montana to avoid home-state sales tax may be subject to use
  // tax enforcement in their home state. Montana LLC registration is legal in Montana but
  // many states (CA, WA, OR, etc.) actively enforce use tax requirements for vehicles
  // principally used in their jurisdiction. Consult home-state tax professionals before
  // using Montana registration to avoid sales tax.
  reciprocity: {
    enabled: false,
    scope: "RETAIL_ONLY",
    homeStateBehavior: "NONE",
    requireProofOfTaxPaid: false,
    basis: "TAX_PAID",
    capAtThisStatesTax: false,
    hasLeaseException: false,
  },

  extras: {
    lastUpdated: "2025-11-14",
    sources: [
      "Montana Motor Vehicle Division (mvdmt.gov)",
      "Montana Code Annotated Title 61, Chapter 3 (Registration and Licensing)",
      "Montana Code Annotated § 61-3-321 (Registration fees)",
      "Montana Legislature Vehicle Fee Brochure (2023 Interim)",
      "Yellowstone County Treasurer - Motor Vehicle Fee Schedule",
      "PrivateAuto - Montana Sales Taxes",
      "FindTheBestCarPrice - Montana Vehicle Sales Tax & Fees",
      "TaxFree RV - Montana Sales Tax on Cars",
      "Car and Driver - Montana Register Cars Law Change (2024)",
    ],
    notes:
      "Montana is one of 5 states with NO SALES TAX on vehicles (along with AK, DE, NH, OR). " +
      "Instead of sales tax, Montana collects age-based registration fees: $217 (0-4 years), " +
      "$87 (5-10 years), $28 (11+ years) annually, OR $87.50 permanent registration for 11+ year " +
      "vehicles. Luxury vehicle tax: $825/year for MSRP ≥ $150,000 until 11 years old. Title fee: " +
      "$12 (standard), $18.50 (salvage). Doc fee: avg $224, NO CAP. County option tax may apply " +
      "based on depreciated MSRP. Montana LLC registration popular for tax avoidance but neighboring " +
      "states increasingly enforce use tax requirements.",
    stateRate: 0.0,
    registrationFees: {
      age0to4: 217.0,
      age5to10: 87.0,
      age11plus: 28.0,
      permanentRegistration: 87.5,
    },
    titleFee: 12.0,
    salvageTitleFee: 18.5,
    plateFee: 10.3,
    avgDocFee: 224,
    luxuryVehicleTax: {
      threshold: 150000,
      annualFee: 825,
      durationYears: 11,
    },
    permanentRegistration:
      "Vehicles 11+ years old can pay $87.50 for permanent registration " +
      "(one-time fee, no renewal required as long as ownership unchanged). Cannot be used with " +
      "specialty plates requiring recertification or yearly donations.",
    countyOptionTax:
      "Counties may impose local option motor vehicle tax based on MSRP " +
      "depreciated according to statutory schedule. Rate varies by county. Paid annually at registration.",
    noSalesTaxStates: [
      "Alaska (AK)",
      "Delaware (DE)",
      "Montana (MT)",
      "New Hampshire (NH)",
      "Oregon (OR)",
    ],
    taxAvoidanceWarning:
      "Montana's lack of sales tax has led to widespread use of Montana LLC " +
      "registrations by non-residents to avoid sales tax in home states. Many states are " +
      "aggressively enforcing use tax requirements for vehicles principally used in their " +
      "jurisdiction. Penalties can include back taxes, interest, and fines. CA, WA, OR, WY, ID, " +
      "ND, SD have active enforcement programs. Consult legal and tax professionals before using " +
      "Montana registration if vehicle will be used outside Montana.",
  },
};

export default US_MT;
