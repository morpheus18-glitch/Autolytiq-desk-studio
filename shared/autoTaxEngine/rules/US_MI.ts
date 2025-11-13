import { TaxRulesConfig } from "../types";

/**
 * MICHIGAN TAX RULES (Updated 2025-11-13)
 *
 * SOURCES:
 * - Michigan Form 485 (2025) - Instructions for Vehicle Dealers
 * - Michigan Dealer Manual Chapter 8 (Revised January 2023)
 * - Michigan Admin. Code R. 205.54 - Automobile and other vehicle sales
 * - Michigan Admin. Code R. 205.22 - Discounts, coupons, and rebates
 * - MADA (Michigan Auto Dealers Association) bulletins
 *
 * RETAIL SALES:
 * - 6% flat state sales/use tax (STATE_ONLY - no local tax)
 * - Trade-in credit: $11,000 cap OR agreed-upon value (whichever is LESS) for motor vehicles
 * - Trade-in credit: NO LIMIT for recreational vehicles (when trading RV for RV)
 * - Manufacturer rebates: TAXABLE (tax calculated before rebate applied) EXCEPT employee discounts
 * - Dealer rebates/incentives: TAXABLE (unless employee discount exception)
 * - Doc fee: TAXABLE (cap: $260 or 5% of cash price, whichever is less)
 * - Service contracts (VSC): NOT TAXABLE if optional and separately itemized
 * - GAP insurance: NOT TAXABLE (insurance premiums exempt from sales tax)
 * - Accessories (dealer-installed): TAXABLE
 * - Negative equity: TAXABLE (rolled into taxable base)
 * - Title/registration fees: NOT TAXABLE
 *
 * LEASE TAXATION:
 * - Method: MONTHLY (6% use tax on each monthly payment)
 * - Capitalized cost reduction (down payment): TAXABLE (treated as first payment, lessor remits)
 * - Trade-in credit on leases: NOT AVAILABLE (trade-in credit statute does not extend to leases)
 * - Doc fee on leases: TAXABLE
 * - Service contracts on leases: NOT TAXABLE (if optional/separate)
 * - GAP insurance on leases: NOT TAXABLE
 * - Monthly payment calculation: Tax applied to each payment amount
 *
 * RECIPROCITY:
 * - Enabled: YES (reciprocal state agreements exist)
 * - Method: Collect LESSER of Michigan 6% OR purchaser's home state rate
 * - Credit provided: Tax paid to MI applied as credit in buyer's home state
 * - Non-reciprocal states (no credit): AR, DC, GA, MD, MS, NE, NC, OK, SC, SD, WV
 * - Exempt states (no sales tax on vehicles): AK, DE, MT, NH, NM, OR
 * - Proof required: YES (dealer must document tax collected for out-of-state buyers)
 *
 * SPECIAL NOTES:
 * - Michigan uses "sales tax on the difference" - trade-in reduces taxable base
 * - Private sales do NOT qualify for trade-in credit (dealer transactions only)
 * - Recreational vehicle definition per Michigan Vehicle Code
 * - Doc fee must be charged uniformly (cash, credit, lease)
 */
const MI_RULES: TaxRulesConfig = {
  stateCode: "MI",
  version: 2, // Updated 2025-11-13: Major corrections to rebate taxability, VSC/GAP exemptions, lease trade-in rules

  // ---- Retail Side ----
  tradeInPolicy: {
    type: "CAPPED",
    cap: 11000, // $11,000 cap for motor vehicles (2025)
    notes: "Trade-in credit limited to $11,000 OR agreed-upon value (whichever is less). NO LIMIT for recreational vehicles when trading RV for RV.",
  },
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: true, // CORRECTED: Manufacturer rebates are taxable (tax calculated before rebate)
      notes: "Exception: Employee discount programs where manufacturer reimburses dealer are non-taxable"
    },
    {
      appliesTo: "DEALER",
      taxable: true, // CORRECTED: Dealer incentives are taxable
      notes: "Direct dealer discounts reduce taxable base, but manufacturer reimbursements to dealer are taxable"
    },
  ],
  docFeeTaxable: true, // Doc fee IS taxable (capped at $260 or 5% of price, whichever is less)
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: false, // CORRECTED: VSC NOT taxable if optional and separately itemized
      notes: "Taxable only if mandatory or bundled with vehicle purchase"
    },
    {
      code: "GAP",
      taxable: false, // CORRECTED: GAP insurance NOT taxable (insurance premiums exempt)
      notes: "Insurance premiums and related services exempt from Michigan sales tax"
    },
    { code: "TITLE", taxable: false },
    { code: "REG", taxable: false },
    { code: "PLATE_FEE", taxable: false },
  ],
  taxOnAccessories: true, // Dealer-installed accessories ARE taxable
  taxOnNegativeEquity: true, // Negative equity IS rolled into taxable base
  taxOnServiceContracts: false, // CORRECTED: NOT taxable if optional/separate
  taxOnGap: false, // CORRECTED: GAP NOT taxable
  vehicleTaxScheme: "STATE_ONLY", // 6% state rate, no local additions
  vehicleUsesLocalSalesTax: false,

  // ---- Lease Side ----
  leaseRules: {
    method: "MONTHLY", // 6% use tax applied to each monthly payment
    taxCapReduction: true, // CORRECTED: Cap reduction (down payment) IS taxed as "first payment"
    rebateBehavior: "FOLLOW_RETAIL_RULE",
    docFeeTaxability: "ALWAYS", // Doc fee is taxable on leases
    tradeInCredit: "NONE", // CORRECTED: Trade-in credit does NOT apply to leases in Michigan
    negativeEquityTaxable: true, // If rolled into lease, it's in the cap cost
    feeTaxRules: [
      { code: "DOC_FEE", taxable: true },
      {
        code: "SERVICE_CONTRACT",
        taxable: false, // NOT taxable if optional/separate
        notes: "Insurance-type VSC not subject to use tax on leases"
      },
      {
        code: "GAP",
        taxable: false, // GAP insurance NOT taxable
        notes: "Insurance premiums exempt from Michigan sales/use tax"
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
    taxFeesUpfront: true, // Doc fee and cap reduction taxed upfront
    specialScheme: "NONE",
    notes:
      "Michigan: 6% use tax on monthly lease payments. Capitalized cost reduction (down payment) treated as first payment and taxed. Trade-in credit statute does NOT extend to lease transactions. Lessor remits use tax on down payment (not submitted with RD-108).",
  },


  // ---- Reciprocity ----
  reciprocity: {
    enabled: true,
    scope: "BOTH", // Applies to both sales and use tax
    homeStateBehavior: "CREDIT_UP_TO_STATE_RATE", // Tax paid to MI applied as credit in buyer's state
    requireProofOfTaxPaid: true, // Dealer must document tax collected
    basis: "TAX_PAID",
    capAtThisStatesTax: true, // Collect lesser of MI 6% or buyer's home state rate
    hasLeaseException: false,
    notes: "Michigan has reciprocal agreements with most states. Dealer collects LESSER of MI 6% OR buyer's home state rate. Tax collected under MI law applied as credit in state where vehicle will be titled.",
    exemptStates: ["AK", "DE", "MT", "NH", "NM", "OR"], // No sales tax on vehicles
    nonReciprocalStates: ["AR", "DC", "GA", "MD", "MS", "NE", "NC", "OK", "SC", "SD", "WV"], // These states impose use tax even if MI sales tax paid
  },

  extras: {
    flatSalesTaxRate: 0.06,
    description: "Michigan uses flat 6% sales/use tax with no local additions for vehicles",
    tradeInCapNote: "Trade-in credit: $11,000 cap for motor vehicles (2025). NO LIMIT for recreational vehicles traded for RV.",
    docFeeCap: "$260 or 5% of cash price, whichever is less (adjusted every 2 years for CPI)",
    manufacturerRebateTreatment: "Rebates are taxable. Tax calculated on price BEFORE rebate applied. Exception: employee discounts where manufacturer reimburses dealer.",
    vscAndGapTreatment: "Service contracts (VSC) and GAP insurance are NOT taxable if optional and separately itemized. Insurance premiums exempt from MI sales tax.",
    leaseTradeInException: "Trade-in credit statute does NOT extend to lease transactions. Leases use 6% use tax, not sales tax.",
    capReductionTaxation: "Capitalized cost reduction (down payment) on leases is treated as first payment and subject to use tax. Lessor remits this tax.",
    formReference: "Form 485 (2025) - Instructions for Michigan Vehicle Dealers Collecting Sales Tax",
  },
};

export default MI_RULES;
