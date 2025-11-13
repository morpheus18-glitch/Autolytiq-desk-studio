import { TaxRulesConfig } from "../types";

/**
 * MARYLAND (MD) TAX RULES - Researched Implementation
 *
 * Maryland Vehicle Excise Tax System
 * ==========================================
 *
 * BASE RATE: 6% excise tax on vehicle purchases (MD Transportation Code § 13-809)
 * - This is NOT a sales tax but a specific vehicle excise tax
 * - No additional local taxes on vehicles (state-only rate)
 *
 * TRADE-IN POLICY:
 * - ✅ FULL trade-in credit allowed (reduces taxable base)
 * - Per § 13-809: "total purchase price" includes dealer processing charge "less an allowance for trade-in"
 * - Note: HB 754 (2024) proposed repealing trade-in allowance but did NOT pass
 * - When trade-in value ≥ purchase price, excise tax is $0
 * - Exception: Leased vehicle trade-ins for another lease/purchase get full credit
 *
 * REBATES:
 * - Manufacturer rebates: TAXABLE (not deducted from base)
 * - Dealer rebates/discounts: NOT taxable (reduce taxable base)
 * - Source: MD MVA official policy (confirmed by multiple dealer associations)
 *
 * DOC FEE:
 * - Maximum cap: $800 (effective July 1, 2024, increased from prior $500 cap)
 * - Doc fee IS taxable (included in "total purchase price")
 * - Must be clearly disclosed to buyers
 *
 * BACKEND PRODUCTS (VSC, GAP):
 * - Service Contracts (Extended Warranties): Generally TAXABLE
 * - GAP Insurance: Generally TAXABLE
 * - Note: Limited authoritative sources; based on standard MD sales tax treatment of warranties
 *
 * ACCESSORIES & NEGATIVE EQUITY:
 * - Accessories installed/sold with vehicle: TAXABLE
 * - Negative equity rolled into deal: TAXABLE (added to purchase price)
 *
 * LEASE TAXATION:
 * - Method: FULL_UPFRONT (tax calculated on full lease value upfront)
 * - Tax rate: 6% applied to total lease value
 * - Tax can be paid at signing OR rolled into monthly payments (dealer choice)
 * - Cap cost reduction: TAXABLE (part of upfront tax base)
 * - Trade-in on leases: FULL credit (same as retail, per § 13-809 exception)
 * - Rebates on leases: Follow retail rules (manufacturer taxable, dealer not)
 * - Doc fee on leases: TAXABLE (follow retail rule)
 *
 * RECIPROCITY:
 * - ✅ Maryland DOES provide reciprocity credit
 * - Credit amount: Up to MD's 6% rate (capped at what MD would charge)
 * - Basis: Tax PAID to other state (requires proof)
 * - If other state tax ≥ 6%, typically no additional MD tax owed
 * - If other state tax < 6%, difference must be paid to MD
 * - Applies to both retail and lease transactions
 *
 * MINIMUM TAX:
 * - $100 minimum excise tax in most cases (per § 13-809)
 * - Waived when trade-in value ≥ purchase price
 *
 * EXEMPTIONS:
 * - Government entities
 * - Certain disabled veterans
 * - Specific vehicle types (farm equipment, etc.)
 *
 * Sources:
 * - MD Transportation Code § 13-809 (excise tax statute)
 * - COMAR 11.15.33.06 (trade-in allowance regulations)
 * - COMAR 03.06.01.08 (taxable price definition)
 * - MD Comptroller official guidance
 * - MD MVA dealer bulletins
 * - WANADA (Washington Area New Automobile Dealers Association) guidance
 *
 * Last Updated: 2025-01-13
 * Status: Production-Ready (based on 2024-2025 statutory research)
 */
const MD_RULES: TaxRulesConfig = {
  stateCode: "MD",
  version: 1,

  // ---- RETAIL SIDE ----

  tradeInPolicy: {
    type: "FULL"
    // Full trade-in credit per MD Transportation Code § 13-809
    // "total purchase price" is defined as price "less an allowance for trade-in"
  },

  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: true,
      notes: "Manufacturer rebates are taxable per MD MVA policy"
    },
    {
      appliesTo: "DEALER",
      taxable: false,
      notes: "Dealer rebates/discounts reduce taxable base per MD MVA policy"
    },
  ],

  docFeeTaxable: true,
  // Doc fee is explicitly included in "total purchase price" per § 13-809
  // Maximum cap: $800 (as of July 1, 2024)

  feeTaxRules: [
    {
      code: "DOC_FEE",
      taxable: true,
      notes: "Included in purchase price, capped at $800"
    },
    {
      code: "SERVICE_CONTRACT",
      taxable: true,
      notes: "Extended warranties/VSC generally taxable in MD"
    },
    {
      code: "GAP",
      taxable: true,
      notes: "GAP insurance generally taxable in MD"
    },
    {
      code: "TITLE",
      taxable: false,
      notes: "Government fees not subject to excise tax"
    },
    {
      code: "REG",
      taxable: false,
      notes: "Registration fees not subject to excise tax"
    },
    {
      code: "EFILE",
      taxable: false,
      notes: "E-filing fees not taxable"
    },
  ],

  taxOnAccessories: true,
  // Accessories installed/sold with vehicle are part of purchase price

  taxOnNegativeEquity: true,
  // Negative equity rolled into deal increases purchase price

  taxOnServiceContracts: true,
  // Service contracts (extended warranties) are taxable

  taxOnGap: true,
  // GAP insurance is taxable

  vehicleTaxScheme: "STATE_ONLY",
  // MD uses state-only vehicle excise tax (6% flat, no local stacking)

  vehicleUsesLocalSalesTax: false,
  // No local jurisdictions add to vehicle excise tax

  // ---- LEASE SIDE ----

  leaseRules: {
    method: "FULL_UPFRONT",
    // MD calculates 6% tax on total lease value upfront
    // Tax can be paid at signing or rolled into monthly payments

    taxCapReduction: true,
    // Cap cost reduction (cash, trade, rebates) is part of upfront tax base

    rebateBehavior: "FOLLOW_RETAIL_RULE",
    // Manufacturer rebates taxable, dealer rebates not taxable

    docFeeTaxability: "FOLLOW_RETAIL_RULE",
    // Doc fee is taxable on leases (same as retail)

    tradeInCredit: "FULL",
    // Full trade-in credit on leases per § 13-809 exception:
    // "As to a person trading in a leased vehicle to enter into another lease
    // for a period of more than 180 consecutive days with a different leasing
    // company or to purchase a vehicle, 'total purchase price' means the retail
    // value of the vehicle as certified by the dealer, including any dealer
    // processing charge, less an allowance for the trade-in of the leased vehicle"

    negativeEquityTaxable: true,
    // Negative equity rolled into lease increases taxable base

    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: true,
        notes: "Doc fee taxable on leases, capped at $800"
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: true,
        notes: "VSC taxable if purchased with lease"
      },
      {
        code: "GAP",
        taxable: true,
        notes: "GAP taxable if purchased with lease"
      },
      {
        code: "TITLE",
        taxable: false,
        notes: "Title fees not taxable"
      },
      {
        code: "REG",
        taxable: false,
        notes: "Registration fees not taxable"
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
        code: "EFILE",
        taxable: false,
        includedInCapCost: false,
        includedInUpfront: true,
        includedInMonthly: false,
      },
    ],

    taxFeesUpfront: true,
    // All taxable fees (doc fee, etc.) are taxed in upfront calculation

    specialScheme: "MD_UPFRONT_GAIN",
    // MD uses upfront full-value taxation with optional payment spreading

    notes: "Maryland taxes the full lease value upfront at 6%. The tax can be paid at signing or spread into monthly payments (dealer/lessee choice). Trade-in credit applies per § 13-809 exception.",
  },

  // ---- RECIPROCITY (CROSS-STATE TAX CREDIT) ----

  reciprocity: {
    enabled: true,
    // MD provides reciprocity credit for tax paid to other states

    scope: "BOTH",
    // Applies to both retail and lease transactions

    homeStateBehavior: "CREDIT_UP_TO_STATE_RATE",
    // Credit capped at MD's 6% rate

    requireProofOfTaxPaid: true,
    // MD requires proof of tax paid to other state

    basis: "TAX_PAID",
    // Credit based on actual tax paid (not just due)

    capAtThisStatesTax: true,
    // Credit cannot exceed what MD would charge (6% of fair market value)

    hasLeaseException: false,
    // Same reciprocity rules apply to leases and retail

    notes: "Maryland provides reciprocity credit up to 6% for tax paid to other states. If other state tax ≥ 6%, typically no additional MD tax. If other state tax < 6%, pay difference to MD. Requires proof of prior tax payment.",
  },

  extras: {
    status: "PRODUCTION",
    needsResearch: false,
    description: "Maryland vehicle excise tax rules - researched and implemented based on MD Transportation Code § 13-809, COMAR regulations, and MD MVA guidance.",

    // MD-specific notes
    mdSpecific: {
      minimumTax: 100,
      minimumTaxNote: "$100 minimum excise tax per § 13-809 (waived when trade-in ≥ purchase price)",

      docFeeCap: 800,
      docFeeCapEffectiveDate: "2024-07-01",
      docFeeCapNote: "Increased from $500 to $800 effective July 1, 2024",

      tradeInStatus: "ACTIVE",
      tradeInNote: "HB 754 (2024) proposed repeal of trade-in allowance but did NOT pass. Trade-in credit remains in effect.",

      leaseRentalTaxNote: "Short-term vehicle rentals (<180 days) are taxed at 11.5% under different rules. Leases ≥180 days use excise tax (6%).",

      exciseVsSalesTaxNote: "MD uses EXCISE TAX for vehicles, not general sales tax. Vehicles are NOT subject to MD's general 6% sales tax.",
    },
  },
};

export default MD_RULES;
