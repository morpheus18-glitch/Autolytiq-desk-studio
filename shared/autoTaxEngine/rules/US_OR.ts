import { TaxRulesConfig } from "../types";

/**
 * OREGON TAX RULES (Updated 2025-11-13)
 *
 * SOURCES:
 * - Oregon Revised Statutes (ORS) Chapter 320 - Vehicle Privilege and Use Taxes
 * - ORS 320.405 - Vehicle Privilege Tax
 * - ORS 320.410 - Vehicle Use Tax and credit for other taxes paid
 * - ORS 320.420 - Collection of use tax
 * - ORS 320.425 - Exempt sales
 * - ORS 320.435 - Revenue allocation
 * - ORS Chapter 803 - Title and Registration fees
 * - ORS 822.043 - Dealer document processing fees
 * - Oregon Administrative Rules (OAR) 150-320-0410, OAR 735-150-0055
 * - House Bill 3991 (2025 Session) - Fee increases effective December 31, 2025
 *
 * EXECUTIVE SUMMARY:
 * Oregon is one of five U.S. states with NO general sales tax (along with AK, DE, MT, NH).
 * However, Oregon imposes specific vehicle-related taxes:
 * - NO SALES TAX: 0% on vehicle purchases or leases
 * - Vehicle Privilege Tax (VPT): 0.5% on retail sales by Oregon dealers
 * - Vehicle Use Tax (VUT): 0.5% on out-of-state purchases by Oregon residents
 *
 * RETAIL SALES (Oregon Dealer to Any Buyer):
 * - Sales Tax: 0% (NONE - Oregon does not impose general sales tax)
 * - Vehicle Privilege Tax (VPT): 0.5% of retail price
 *   - Applies to: Vehicles ≤7,500 miles, GVWR ≤26,000 lbs, never registered in OR
 *   - Taxpayer: Dealer (but typically collected from buyer)
 *   - NOT considered buyer's tax liability
 * - Trade-in credit: N/A (no sales tax, so no trade-in credit mechanism)
 * - Rebates: N/A (no sales tax means no taxability issue)
 * - Doc fee: NOT TAXABLE (capped at $200-$250 depending on integrator use)
 * - Service contracts (VSC): NOT TAXABLE (no sales tax)
 * - GAP insurance: NOT TAXABLE (no sales tax)
 * - Accessories: NOT TAXABLE (no sales tax)
 * - Negative equity: NOT TAXABLE (no sales tax)
 * - Title fees: $101-$331 (varies by vehicle type and MPG, increases Dec 31, 2025)
 * - Registration fees: $88-$460 for two years (varies by type/MPG, increases Dec 31, 2025)
 *
 * OUT-OF-STATE PURCHASES (Oregon Resident Buying Elsewhere):
 * - Vehicle Use Tax (VUT): 0.5% of retail price
 *   - Applies to: Vehicles ≤7,500 miles, GVWR ≤26,000 lbs, never registered in OR
 *   - Taxpayer: Purchaser (must pay within 30 days)
 *   - Credit: Dollar-for-dollar credit for ANY sales/use tax paid to other jurisdictions
 *   - If credit ≥ VUT base, then VUT = $0
 *
 * LEASE TAXATION:
 * - Sales Tax: 0% (NONE - Oregon does not tax lease payments)
 * - Vehicle Use Tax: 0.5% applies to lessor if vehicle purchased out-of-state
 *   - Base: Retail price paid by lessor OR agreed value in lease
 *   - Typically absorbed by lessor or built into lease structure
 *   - NOT separately charged to lessee on monthly payments
 * - Lessee pays: Title and registration fees (same as retail)
 * - No tax on monthly payments or upfront amounts
 *
 * RECIPROCITY:
 * - Enabled: YES (full credit for out-of-state tax paid)
 * - Scope: Applies to Vehicle Use Tax only (for Oregon residents buying elsewhere)
 * - Credit: Dollar-for-dollar for ANY sales/use/privilege/excise tax paid to ANY jurisdiction
 * - Cap: Credit cannot exceed Oregon VUT owed (if credit ≥ VUT, then VUT = $0)
 * - Proof required: YES (receipts and documentation of tax payment)
 *
 * NON-RESIDENTS BUYING IN OREGON:
 * - Exempt from Vehicle Privilege Tax
 * - Must provide proof of out-of-state residence
 * - Vehicle must be primarily used/stored outside Oregon
 *
 * DOC FEE CAP:
 * - With integrator: $250 maximum
 * - Without integrator: $200 maximum
 * - Negotiable between dealer and purchaser
 * - NOT TAXABLE (Oregon has no sales tax)
 *
 * TITLE FEES (Effective Dec 31, 2025):
 * - 0-19 MPG: $240 (was $101)
 * - 20-39 MPG: $245 (was $106)
 * - 40+ MPG: $255 (was $116)
 * - Electric vehicles: $331 (was $192)
 * - Light trailers, motorcycles, ATVs: $240 (was $101)
 *
 * REGISTRATION FEES (Two-Year, Effective Dec 31, 2025):
 * - 0-19 MPG: $210 (was $126)
 * - 20-39 MPG: $220 (was $136)
 * - 40+ MPG: $300 (was $156)
 * - Electric vehicles: $460 (was $316)
 * - Motorcycles/Mopeds: $172 (was $88)
 *
 * COUNTY FEES (Two-Year, select counties only):
 * - Multnomah County: $112
 * - Washington County: $60
 * - Clackamas County: $60
 *
 * SPECIAL NOTES:
 * - Oregon is a "no sales tax" state - this is a major differentiator
 * - VPT/VUT only applies to vehicles ≤7,500 miles and never previously registered in OR
 * - Heavy vehicles (GVWR > 26,000 lbs) are NOT subject to VPT or VUT
 * - Oregon provides full reciprocity credit for out-of-state tax paid
 * - House Bill 3991 (2025): Major fee increases effective December 31, 2025
 * - Electric vehicles pay significantly higher fees (compensates for no fuel tax)
 * - OReGO program: EV owners can opt into road usage charge ($0.02/mile) instead of high reg fees
 */
const OR_RULES: TaxRulesConfig = {
  stateCode: "OR",
  version: 1, // Initial comprehensive implementation 2025-11-13

  // ---- Retail Side ----
  // Oregon has NO sales tax, so all taxability flags are false
  // Oregon has no sales tax, so trade-in credit mechanism does not apply.
  // Trade-in value simply reduces net cash due.
  tradeInPolicy: {
    type: "NONE",
  },
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: false, // N/A - no sales tax in Oregon
      notes: "Oregon has no sales tax, so rebate taxability is not applicable. Rebates reduce net cash due.",
    },
    {
      appliesTo: "DEALER",
      taxable: false, // N/A - no sales tax in Oregon
      notes: "Oregon has no sales tax, so rebate taxability is not applicable. Rebates reduce net cash due.",
    },
  ],
  docFeeTaxable: false, // NOT taxable (Oregon has no sales tax)
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: false, // NOT taxable (no sales tax)
      notes: "Oregon has no sales tax - VSC is not subject to taxation",
    },
    {
      code: "GAP",
      taxable: false, // NOT taxable (no sales tax)
      notes: "Oregon has no sales tax - GAP insurance is not subject to taxation",
    },
    {
      code: "TITLE",
      taxable: false,
      notes: "Title fees vary by vehicle type and MPG (increases effective Dec 31, 2025)",
    },
    {
      code: "REG",
      taxable: false,
      notes: "Registration fees vary by vehicle type and MPG (increases effective Dec 31, 2025)",
    },
    {
      code: "PLATE_FEE",
      taxable: false,
      notes: "Two plates: $26, Single plate: $13",
    },
    {
      code: "VIN_INSPECTION",
      taxable: false,
      notes: "VIN inspection: $9 (required for out-of-state titles)",
    },
  ],
  taxOnAccessories: false, // NOT taxable (no sales tax)
  taxOnNegativeEquity: false, // NOT taxable (no sales tax)
  taxOnServiceContracts: false, // NOT taxable (no sales tax)
  taxOnGap: false, // NOT taxable (no sales tax)
  vehicleTaxScheme: "STATE_ONLY", // Oregon uses VPT/VUT as state-only taxes (no local)
  vehicleUsesLocalSalesTax: false, // No sales tax at all

  // ---- Lease Side ----
  leaseRules: {
    method: "MONTHLY", // No tax on monthly payments (Oregon has no sales tax)
    taxCapReduction: false, // NOT taxed (no sales tax)
    rebateBehavior: "FOLLOW_RETAIL_RULE", // N/A - no sales tax
    docFeeTaxability: "NEVER", // NOT taxable (no sales tax)
    tradeInCredit: "NONE", // N/A - no sales tax means no credit mechanism
    negativeEquityTaxable: false, // NOT taxable (no sales tax)
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: false, // NOT taxable
        notes: "Doc fee capped at $250 (with integrator) or $200 (without)",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: false, // NOT taxable
        notes: "Oregon has no sales tax - VSC not taxable on leases",
      },
      {
        code: "GAP",
        taxable: false, // NOT taxable
        notes: "Oregon has no sales tax - GAP not taxable on leases",
      },
      { code: "TITLE", taxable: false },
      { code: "REG", taxable: false },
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
    taxFeesUpfront: false, // No tax on any fees (no sales tax)
    specialScheme: "NONE",
    notes:
      "Oregon: NO sales tax on lease payments or upfront amounts. Lessee pays title and registration fees. If lessor purchases vehicle from out-of-state dealer, lessor may owe 0.5% Vehicle Use Tax (typically absorbed in lease structure, not passed to lessee as separate charge).",
  },

  // ---- Reciprocity ----
  reciprocity: {
    enabled: true,
    scope: "RETAIL_ONLY", // Applies to VUT for Oregon residents buying out-of-state
    homeStateBehavior: "CREDIT_FULL", // Dollar-for-dollar credit for tax paid elsewhere
    requireProofOfTaxPaid: true, // Purchaser must provide receipts/documentation
    basis: "TAX_PAID", // Credit based on actual tax paid
    capAtThisStatesTax: true, // Credit cannot exceed Oregon VUT owed (0.5% of price)
    hasLeaseException: true, // Lease VUT is typically lessor's responsibility, not lessee's
    notes:
      "Oregon provides full dollar-for-dollar credit for any sales/use/privilege/excise tax paid to ANY jurisdiction. Credit reduces Oregon VUT but not below zero. Example: Oregon resident buys vehicle in California and pays 8.75% CA sales tax - Oregon VUT is reduced to $0 (credit exceeds 0.5% VUT). Must provide proof of payment.",
    overrides: [
      {
        originState: "AK",
        disallowCredit: false, // AK has no sales tax, so no credit to apply
        notes: "Alaska has no sales tax on vehicles - full Oregon VUT applies (0.5%)",
      },
      {
        originState: "DE",
        disallowCredit: false, // DE has no sales tax
        notes: "Delaware has no sales tax on vehicles - full Oregon VUT applies (0.5%)",
      },
      {
        originState: "MT",
        disallowCredit: false, // MT has no sales tax
        notes: "Montana has no sales tax on vehicles - full Oregon VUT applies (0.5%)",
      },
      {
        originState: "NH",
        disallowCredit: false, // NH has no sales tax
        notes: "New Hampshire has no sales tax on vehicles - full Oregon VUT applies (0.5%)",
      },
    ],
  },

  extras: {
    noSalesTax: true,
    description:
      "Oregon is one of five U.S. states with NO general sales tax. Instead, Oregon imposes Vehicle Privilege Tax (0.5% on dealer sales) and Vehicle Use Tax (0.5% on out-of-state purchases).",
    vehiclePrivilegeTax: {
      rate: 0.005, // 0.5%
      appliesTo: "Oregon dealer sales",
      taxpayer: "Dealer (may be collected from buyer)",
      criteria: {
        odometer: "≤7,500 miles",
        gvwr: "≤26,000 lbs",
        neverRegisteredInOregon: true,
      },
    },
    vehicleUseTax: {
      rate: 0.005, // 0.5%
      appliesTo: "Out-of-state purchases by Oregon residents",
      taxpayer: "Purchaser",
      dueWithin: "30 days of purchase",
      creditForOutOfStateTax: "Dollar-for-dollar credit for any tax paid elsewhere",
      criteria: {
        odometer: "≤7,500 miles",
        gvwr: "≤26,000 lbs",
        neverRegisteredInOregon: true,
      },
    },
    docFeeCap: {
      withIntegrator: 250,
      withoutIntegrator: 200,
      notes: "Negotiable. Integrator is third-party service that submits DMV documents electronically.",
    },
    titleFees: {
      currentRates: "Effective until December 30, 2025",
      newRates: "Effective December 31, 2025 (HB 3991)",
      passenger_0_19_mpg: { current: 101, new: 240 },
      passenger_20_39_mpg: { current: 106, new: 245 },
      passenger_40_plus_mpg: { current: 116, new: 255 },
      electric: { current: 192, new: 331 },
      light_trailers_motorcycles_atvs: { current: 101, new: 240 },
      heavy_vehicles_gvwr_over_26000: 90, // unchanged
      salvage_title: 27, // unchanged
    },
    registrationFees: {
      period: "Two years",
      currentRates: "Effective until December 30, 2025",
      newRates: "Effective December 31, 2025 (HB 3991)",
      passenger_0_19_mpg: { current: 126, new: 210 },
      passenger_20_39_mpg: { current: 136, new: 220 },
      passenger_40_plus_mpg: { current: 156, new: 300 },
      electric: { current: 316, new: 460 },
      motorcycles_mopeds: { current: 88, new: 172 },
      notes:
        "Electric vehicle surcharge: $115/year (compensates for lack of gas tax revenue). EVs can opt into OReGO program ($0.02/mile) to reduce registration to $86.",
    },
    countyFees: {
      multnomah: 112, // Two-year
      washington: 60, // Two-year
      clackamas: 60, // Two-year
      notes: "Additional registration fees for vehicles titled in or owned by residents of these counties",
    },
    oregoProgram: {
      name: "Oregon Road Usage Charge (RUC) Program",
      eligibility: "Electric vehicles and 40+ MPG vehicles",
      rate: "$0.02 per mile",
      benefit: "Reduces EV registration from $460 to $86 (two-year)",
      enrollment: "Voluntary",
      notes: "First-in-nation RUC program. Beneficial for low-mileage drivers.",
    },
    nonResidentExemption: {
      exempt: true,
      notes:
        "Non-resident purchasers are exempt from Vehicle Privilege Tax. Must provide proof of out-of-state residence. Vehicle must be primarily used/stored outside Oregon.",
    },
    leaseUseTax: {
      appliesTo: "Lessor (if vehicle purchased from out-of-state dealer)",
      rate: 0.005, // 0.5%
      base: "Retail price paid by lessor OR agreed value in lease",
      passedToLessee: "Typically absorbed by lessor or built into lease structure (not separate charge)",
      notes: "Oregon does not tax monthly lease payments - lessee only pays title/registration fees",
    },
    reciprocityNotes:
      "Oregon provides full reciprocity credit for out-of-state tax paid. If tax paid elsewhere ≥ 0.5% VUT, Oregon VUT = $0. Example: CA resident buying in Oregon pays no VPT (non-resident exemption). OR resident buying in CA with 8.75% sales tax pays $0 Oregon VUT (credit exceeds VUT).",
    implementationNotes:
      "Oregon's 'no sales tax' policy means most traditional vehicle tax calculations do not apply. The 0.5% VPT/VUT is a minimal tax compared to most states. The real cost for consumers is in title/registration fees, which increase significantly for electric and high-MPG vehicles. Fee increases effective Dec 31, 2025 are substantial (+$139 title, +$84 to +$144 registration).",
  },
};

export default OR_RULES;
