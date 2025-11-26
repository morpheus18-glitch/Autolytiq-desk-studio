import type { TaxRulesConfig } from "../types";

/**
 * LOUISIANA TAX RULES
 *
 * Researched: 2025-11-13
 * Version: 2
 *
 * KEY FACTS:
 * - State sales tax: 5.0% (effective January 1, 2025, increased from 4.45%)
 * - Local sales tax: 1.85% to 7.0% (parish and municipal taxes)
 * - Combined range: 6.85% to 13.5% (depending on parish/municipality)
 * - Trade-in credit: FULL (100% deduction, no cap)
 * - Doc fee: TAXABLE (likely, as part of cash price), capped at $425
 * - Manufacturer rebates: NOT taxable (reduce taxable price)
 * - Dealer rebates: NOT taxable (same as manufacturer - reduce taxable price)
 * - Service contracts: LIKELY EXEMPT (regulated as insurance, verify)
 * - GAP: LIKELY EXEMPT (classified as insurance product, verify)
 * - Lease taxation: MONTHLY (1.45% state + local on each payment)
 * - Reciprocity: YES (rate-to-rate credit for reciprocal states)
 * - New resident cap: $90 maximum use tax (if qualified, effective Jan 1, 2025)
 *
 * UNIQUE LOUISIANA FEATURES:
 * - DOMICILE-BASED TAXATION: Tax rate based on buyer's home parish, NOT dealer location
 * - Different rates for purchases vs leases:
 *   * Purchase: 5% state + local
 *   * Lease: 1.45% state (1% + 0.45%) + local on monthly payments
 * - Lease tax dedicated to Transportation Trust Fund
 * - State rate changes over time:
 *   * Through Dec 31, 2024: 4.45%
 *   * Jan 1, 2025 - Dec 31, 2029: 5.0%
 *   * Jan 1, 2030 onwards: 4.75% (scheduled decrease)
 * - New resident use tax cap: $90 (if vehicle registered within 90 days, personal use)
 * - Antique vehicle exemption: 25+ years old, valued over $10,000, non-commercial
 * - Orthopedic disability rebate program available
 *
 * TAX CALCULATION FORMULA (RETAIL):
 * Taxable Amount = Vehicle Price + Accessories - Trade-In - Manufacturer Rebates - Dealer Rebates
 * State Tax = Taxable Amount × 5%
 * Local Tax = Taxable Amount × (Parish Rate + Municipal Rate)
 * Total Tax = State Tax + Local Tax
 * (Doc fee likely taxable, verify. VSC and GAP likely exempt if properly itemized)
 *
 * Example (Standard Purchase at 9% combined rate):
 * $30,000 vehicle + $800 accessories - $10,000 trade - $2,000 rebate = $18,800
 * Tax: $18,800 × 9% = $1,692
 *
 * LEASE CALCULATION (MONTHLY):
 * State Lease Tax: 1.45% (1% + 0.45%)
 * Local Lease Tax: Varies by buyer's domicile parish
 * Tax = Monthly Payment × (1.45% + Local Rate)
 * Example: $400/month × 7.375% = $29.50 per payment
 *
 * MAJOR PARISH TAX VARIATIONS:
 * - Cameron Parish: 5.0% (no local tax)
 * - Orleans Parish (New Orleans): ~10% combined
 * - East Baton Rouge Parish: ~9-10% combined
 * - Jefferson Parish: ~10% combined
 * - Ouachita Parish (Monroe/Sterlington): 12.95-13.5% combined (highest)
 *
 * SOURCES:
 * - Louisiana Department of Revenue (revenue.louisiana.gov)
 * - Louisiana Revised Statutes Title 47 (Revenue and Taxation)
 * - RS 47:302 (Imposition of Sales Tax)
 * - RS 47:305 (Exclusions and Exemptions)
 * - RS 47:305.36 (Motor Vehicle Exemptions)
 * - RS 47:321 (Imposition of Use Tax)
 * - RS 47:321(B) (Lease Tax - 1%)
 * - RS 47:321.1 (Additional Lease Tax - 0.45%)
 * - RS 47:337.86 (Credit for Taxes Paid)
 * - RS 47:305.72 (Orthopedic Disability Rebate)
 * - RS 6:969.18 (Doc Fee Cap - $425)
 * - RS 6:969.51 (GAP Coverage Requirements)
 * - RS 48:77 (Transportation Trust Fund)
 * - Louisiana Revenue Information Bulletin No. 25-011 (2025)
 * - Louisiana Motor Vehicle Sales Tax Publication (LDR 20164)
 */
export const US_LA: TaxRulesConfig = {
  stateCode: "LA",
  version: 2,

  // ============================================================================
  // RETAIL TRANSACTION RULES
  // ============================================================================

  /**
   * Trade-in Policy: FULL (100% credit, no cap)
   *
   * Louisiana provides 100% trade-in credit with no cap. Trade-in value
   * is fully deducted from the purchase price before calculating sales tax.
   *
   * Statutory Definition:
   * The value of the trade-in vehicle is NOT subject to sales tax. The
   * trade-in value is deducted from the purchase price of the new vehicle
   * before calculating sales tax.
   *
   * Requirements:
   * - Applies to both state and local taxes
   * - No cap or limit on trade-in value
   * - Trade-in must be applied at time of purchase
   * - Works for both new and used vehicle purchases
   *
   * Negative Equity Treatment:
   * - Negative equity (underwater trade-ins) can be rolled into the new loan
   * - The unpaid balance from the trade-in is added to the amount financed
   * - Negative equity is NOT taxable (it's debt, not part of the purchase price)
   *
   * Example:
   *   New Vehicle Price: $20,000
   *   Trade-In Value: $7,000
   *   Taxable Amount: $13,000
   *   Sales Tax @ 9%: $1,170
   *
   * Source: Louisiana Motor Vehicle Sales Tax Publication (LDR 20164);
   *         Car and Driver Louisiana Sales Tax Guide (2025)
   */
  tradeInPolicy: { type: "FULL" },

  /**
   * Rebate Rules:
   *
   * Louisiana treats BOTH manufacturer AND dealer rebates as NON-TAXABLE.
   * Both types of rebates reduce the purchase price before tax calculation.
   *
   * MANUFACTURER REBATES:
   * - Factory rebates are NOT taxable
   * - Manufacturer incentives reduce the taxable base
   * - Factory-to-dealer cash incentives passed to buyer are non-taxable
   * - Manufacturer loyalty bonuses are non-taxable
   * - Special financing incentives are non-taxable
   *
   * DEALER REBATES:
   * - Dealer discounts are NOT taxable
   * - Dealer cash incentives reduce the taxable base
   * - Dealer-sponsored rebates reduce the purchase price
   * - Negotiated price reductions reduce the taxable base
   *
   * Tax Calculation:
   * Sales tax is calculated on the NET SELLING PRICE after all rebates,
   * incentives, and discounts are applied.
   *
   * Example:
   *   New Vehicle MSRP: $46,000
   *   Manufacturer Rebate: $4,000
   *   Taxable Amount: $42,000
   *   Sales Tax @ 9%: $3,780
   *
   * Source: Louisiana Sales Tax Handbook; Find The Best Car Price LA Guide (2025)
   */
  rebates: [
    {
      appliesTo: "MANUFACTURER",
      taxable: false,
      notes:
        "Manufacturer rebates, incentives, and factory cash-back offers are NOT taxable. " +
        "Sales tax is calculated AFTER the rebate is applied to the purchase price.",
    },
    {
      appliesTo: "DEALER",
      taxable: false,
      notes:
        "Dealer rebates, discounts, and incentives are NOT taxable. Like manufacturer " +
        "rebates, dealer incentives reduce the taxable purchase price.",
    },
  ],

  /**
   * Doc Fee: LIKELY TAXABLE (as part of cash price)
   *
   * Maximum Cap: $425 (per Louisiana RS 6:969.18)
   *
   * Legal Framework:
   * Louisiana Revised Statute 6:969.18 allows sellers to charge:
   * - Up to $35 for documentation fee for services performed in documenting a
   *   motor vehicle credit transaction (by credit extender)
   * - Up to $425 maximum for seller documentation and compliance fee
   *
   * What Doc Fees Cover:
   * - Credit investigation
   * - Compliance with federal and state law
   * - Preparation of documents to perfect or satisfy a lien
   * - Titling functions
   * - Other functions incidental to the sale
   *
   * Tax Treatment:
   * The Louisiana Office of Motor Vehicles documentation indicates that
   * "Sales/Use tax will be assessed on the sale price of the vehicle, in
   * addition to the applicable, taxable items listed on the dealer invoice
   * or bill of sale." This suggests doc fees shown on the invoice are likely
   * included in the taxable base.
   *
   * CONSERVATIVE APPROACH: Treat as taxable until verified with Louisiana DOR.
   *
   * Source: Louisiana RS 6:969.18; Louisiana Office of Motor Vehicles Publication
   */
  docFeeTaxable: true, // Likely taxable, conservative approach

  /**
   * Fee Taxability Rules:
   *
   * Louisiana has specific rules for backend products, with several items
   * likely exempt as insurance products.
   *
   * SERVICE CONTRACTS (VSC):
   * - LIKELY EXEMPT (regulated as insurance, verify)
   * - Louisiana regulates VSCs as "Vehicle Mechanical Breakdown Insurers"
   * - Must be licensed by Louisiana Commissioner of Insurance
   * - Louisiana generally does NOT tax insurance premiums
   * - Services are only taxable if specifically enumerated in the law
   * - RECOMMENDATION: Contact Louisiana DOR for definitive guidance
   *
   * GAP INSURANCE:
   * - LIKELY EXEMPT (as insurance product, verify)
   * - GAP is regulated under Louisiana RS 6:969.51
   * - Required to be offered to consumers as optional purchase
   * - Treated as insurance-type product
   * - Insurance premiums are generally exempt from Louisiana sales tax
   * - RECOMMENDATION: Contact Louisiana DOR for definitive guidance
   *
   * ACCESSORIES:
   * - TAXABLE (all accessories sold with motor vehicle are taxable)
   * - Aftermarket accessories installed by dealer
   * - Add-on equipment (running boards, tonneau covers, roof racks, etc.)
   * - Electronics (stereos, navigation, security systems)
   * - Paint protection, fabric protection, window tinting
   * - Taxed at the same combined state and local rate as the vehicle
   *
   * Source: Louisiana RS 47:302; Louisiana Motor Vehicle Sales Finance Act
   */
  feeTaxRules: [
    {
      code: "SERVICE_CONTRACT",
      taxable: false,
      notes:
        "Vehicle Service Contracts (VSC) are LIKELY EXEMPT from sales tax " +
        "(regulated as insurance products). Louisiana does not generally tax insurance " +
        "premiums. Services are only taxable if specifically enumerated. VERIFY with " +
        "Louisiana DOR at 855-307-3893 or sales.inquiries@la.gov",
    },
    {
      code: "GAP",
      taxable: false,
      notes:
        "GAP insurance is LIKELY EXEMPT from sales tax (classified as insurance product). " +
        "Louisiana does not generally tax insurance premiums. VERIFY with Louisiana DOR " +
        "at 855-307-3893 or sales.inquiries@la.gov, especially if GAP is offered as a " +
        "waiver rather than insurance.",
    },
    {
      code: "DOC_FEE",
      taxable: true,
      notes:
        "Documentation fees are LIKELY TAXABLE (as part of cash price). Maximum cap: $425 " +
        "per Louisiana RS 6:969.18. VERIFY with Louisiana DOR for definitive guidance.",
    },
    {
      code: "TITLE",
      taxable: false,
      notes: "Title fees are not taxable (government fee)",
    },
    {
      code: "REG",
      taxable: false,
      notes: "Registration fees are not taxable (government fee)",
    },
  ],

  /**
   * Product Taxability:
   *
   * - Accessories: TAXABLE (parts + labor for installation)
   * - Negative equity: NOT taxable (it's debt, not part of purchase price)
   * - Service contracts: LIKELY EXEMPT (regulated as insurance, verify)
   * - GAP: LIKELY EXEMPT (classified as insurance, verify)
   *
   * Negative Equity Treatment:
   * Louisiana Motor Vehicle Sales Finance Act explicitly recognizes "negative
   * equity trade-in allowances" as part of the "amount financed" in the
   * principal balance subject to finance charges. This is DEBT, not a purchase
   * of taxable property.
   *
   * Example - Underwater Trade-In:
   *   New Vehicle Price: $30,000
   *   Trade-In Value: $8,000
   *   Trade-In Payoff: $12,000
   *   Negative Equity: $4,000
   *
   *   Tax Calculation:
   *   Purchase Price: $30,000
   *   Less Trade-In Value: -$8,000
   *   Taxable Amount: $22,000
   *   Sales Tax @ 9%: $1,980
   *
   *   Financing:
   *   Amount Financed = $30,000 - $8,000 + $4,000 = $26,000
   *   (The $4,000 negative equity is added to the loan but is NOT taxed)
   *
   * Source: Louisiana Motor Vehicle Sales Finance Act (RS Title 6, Chapter 10-B)
   */
  taxOnAccessories: true,
  taxOnNegativeEquity: false, // NOT taxable (it's debt, not purchase price)
  taxOnServiceContracts: false, // Likely exempt, verify with LA DOR
  taxOnGap: false, // Likely exempt, verify with LA DOR

  /**
   * Vehicle Tax Scheme: STATE_PLUS_LOCAL
   *
   * Louisiana has a comprehensive state and local sales tax system:
   * - State Rate: 5.0% (effective January 1, 2025)
   * - Local Rates: 1.85% to 7.0% (parish and municipal taxes)
   * - Combined Range: 6.85% to 13.5%
   *
   * DOMICILE-BASED TAXATION (UNIQUE):
   * Unlike most states, Louisiana bases the tax rate on the DOMICILE OF THE
   * PURCHASER, not the location of the seller. This means a buyer pays the
   * tax rate of their home parish, regardless of where they purchase the vehicle.
   *
   * Highest Tax Jurisdictions:
   * - Ouachita Parish (Sterlington): 12.95% combined
   * - Monroe: 13.5% combined
   *
   * Lowest Tax Jurisdiction:
   * - Cameron Parish: 5.0% (state only, no local tax)
   *
   * State Rate History:
   * - Through Dec 31, 2024: 4.45%
   * - Jan 1, 2025 - Dec 31, 2029: 5.0%
   * - Jan 1, 2030 onwards: 4.75% (scheduled decrease)
   *
   * Source: Louisiana RS 47:302; Louisiana Department of Revenue;
   *         Louisiana Sales and Use Tax Legislation Changes (2025)
   */
  vehicleTaxScheme: "STATE_PLUS_LOCAL",
  vehicleUsesLocalSalesTax: true,

  // ============================================================================
  // LEASE TRANSACTION RULES
  // ============================================================================

  leaseRules: {
    /**
     * Lease Method: MONTHLY (tax on each payment)
     *
     * Louisiana taxes vehicle leases based on the MONTHLY PAYMENT amount,
     * NOT on the total capitalized cost upfront.
     *
     * Legal Framework:
     *
     * Louisiana RS 47:321(B) - Lease Tax:
     * Levies tax at the rate of 1% of the monthly lease or rental price paid
     * by a lessee, or contracted or agreed to be paid by a lessee to the owner
     * of the tangible personal property.
     *
     * Louisiana RS 47:321.1 - Additional Lease Tax:
     * Levies an additional tax at the rate of 0.45% (forty-five hundredths of
     * one percent) using the same calculation methodology.
     *
     * Combined Lease Tax Rates:
     * - State lease tax: 1.0%
     * - Additional state lease tax: 0.45%
     * - Total state lease tax: 1.45%
     * - Plus local parish/municipal taxes (varies by domicile)
     *
     * What Is Taxed:
     * The tax is calculated on the MONTHLY OR PERIODIC LEASE PAYMENT that the
     * lessee pays to the lessor. This includes:
     * - Depreciation component
     * - Finance/rent charge component
     * - Any other charges included in the periodic payment
     *
     * Transportation Trust Fund:
     * Louisiana RS 48:77 dedicates the sales tax collections from motor vehicle
     * leases or rentals to the Transportation Trust Fund.
     *
     * Reporting Requirement:
     * Louisiana Department of Revenue Emergency Rule LAC 61:III.1511 requires
     * dealers that collect sales tax on motor vehicle leases or rentals to file
     * electronically using Form R-1029E (Electronic Sales Tax Return).
     *
     * Example:
     *   Monthly Lease Payment: $400
     *   State Lease Tax (1.45%): $5.80
     *   Local Lease Tax (varies): ~$23.70 @ 5.93% local rate
     *   Total Tax per Payment: ~$29.50 @ 7.375% combined
     *
     * Source: Louisiana RS 47:321(B); Louisiana RS 47:321.1; Louisiana RS 48:77;
     *         Louisiana Department of Revenue Motor Vehicle Lease and Rental Tax page
     */
    method: "MONTHLY",

    /**
     * Cap Cost Reduction: UNCLEAR (verify if taxed at signing)
     *
     * Louisiana law does not explicitly address whether capitalized cost
     * reductions (cap cost reductions) on vehicle leases are subject to tax
     * at signing.
     *
     * What is Cap Cost Reduction:
     * A capitalized cost reduction is the sum of:
     * - Cash down payment
     * - Trade-in allowance
     * - Rebates
     * These amounts are subtracted from the gross capitalized cost, resulting
     * in the adjusted capitalized cost.
     *
     * General State Practice:
     * In MOST states, when you make a down payment (cap cost reduction) on an
     * auto lease, you are charged state and local sales tax on the down payment
     * amount AT SIGNING.
     *
     * Louisiana-Specific Guidance:
     * No specific Louisiana Department of Revenue guidance or statutes found
     * explicitly stating whether cap cost reductions are taxed upfront.
     *
     * CONSERVATIVE APPROACH: Flag for verification.
     *
     * Source: Louisiana RS 9:3306; Federal Reserve Board Vehicle Leasing Guide
     */
    taxCapReduction: false, // Unclear, needs verification

    /**
     * Rebate Behavior on Leases: FOLLOW_RETAIL_RULE
     *
     * Louisiana likely treats rebates on leases the same as retail (non-taxable),
     * but this should be verified with Louisiana DOR.
     *
     * If rebates reduce the cap cost, they would reduce the monthly payment
     * and thus reduce the tax paid per payment.
     */
    rebateBehavior: "FOLLOW_RETAIL_RULE",

    /**
     * Doc Fee on Leases: LIKELY TAXABLE
     *
     * Louisiana allows dealers to charge documentation fees on lease transactions,
     * subject to the same statutory cap as purchases ($425 per RS 6:969.18).
     *
     * Likely Treatment:
     * If the doc fee is:
     * - Included in the capitalized cost → Likely taxed as part of monthly payments
     * - Charged as a separate upfront fee → Likely subject to upfront tax
     *
     * Statutory Cap:
     * The $425 maximum for seller documentation and compliance fees applies to
     * both purchase and lease transactions.
     *
     * VERIFY with Louisiana DOR for definitive guidance.
     *
     * Source: Louisiana RS 6:969.18
     */
    docFeeTaxability: "FOLLOW_RETAIL_RULE", // Likely taxable, verify

    /**
     * Trade-in Credit on Leases: UNCLEAR
     *
     * Louisiana law provides a FULL trade-in credit for vehicle PURCHASES,
     * but the application of trade-in credits to vehicle LEASES is not
     * explicitly addressed in available sources.
     *
     * Purchase Trade-In Credit:
     * On purchases, Louisiana allows the full trade-in value to be deducted
     * from the purchase price before calculating sales tax (both state and local).
     *
     * Lease Trade-In Application:
     * When a trade-in is used on a lease, it typically serves as a capitalized
     * cost reduction. The trade-in value is applied to reduce the gross
     * capitalized cost.
     *
     * Comparison to Other States:
     * Many states that offer trade-in credits on purchases also extend the
     * benefit to leases, either by:
     * - Exempting the trade-in value from upfront taxation, or
     * - Reducing the amount subject to monthly payment tax
     *
     * However, treatment varies significantly by state.
     *
     * CONSERVATIVE APPROACH: Follow retail rule until verified.
     *
     * Source: Louisiana Motor Vehicle Lease and Rental Tax guidance
     */
    tradeInCredit: "FOLLOW_RETAIL_RULE", // Unclear, verify with LA DOR

    /**
     * Negative Equity on Leases: NOT taxable
     *
     * Consistent with retail treatment, negative equity rolled into a lease
     * is likely NOT taxable (it's debt, not part of the lease price).
     */
    negativeEquityTaxable: false,

    /**
     * Fee Taxability on Leases:
     *
     * The taxability of backend products (Vehicle Service Contracts, GAP insurance)
     * on LEASE transactions is not explicitly addressed in available Louisiana sources.
     *
     * On Purchases:
     * VSCs and GAP are LIKELY EXEMPT from sales tax on purchases because they
     * are regulated as insurance products.
     *
     * On Leases:
     * Questions include:
     * 1. If VSC or GAP is added to a lease, is it taxed as part of the monthly payment?
     * 2. Is there an upfront tax on the full VSC/GAP premium at lease signing?
     * 3. Are these products treated differently on leases vs. purchases?
     *
     * General Lease Taxation Principle:
     * Louisiana taxes the MONTHLY LEASE PAYMENT. If backend products are included
     * in the monthly payment calculation, they would be subject to the lease tax.
     * If purchased separately, different rules may apply.
     *
     * CONSERVATIVE APPROACH: Treat as exempt (consistent with retail) until verified.
     *
     * Source: Louisiana Motor Vehicle Lease and Rental Tax guidance
     */
    feeTaxRules: [
      {
        code: "DOC_FEE",
        taxable: true,
        notes: "Doc fee LIKELY TAXABLE on leases (verify with LA DOR)",
      },
      {
        code: "SERVICE_CONTRACT",
        taxable: false,
        notes: "VSC LIKELY EXEMPT on leases (consistent with retail, verify)",
      },
      {
        code: "GAP",
        taxable: false,
        notes: "GAP LIKELY EXEMPT on leases (consistent with retail, verify)",
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

    taxFeesUpfront: true, // Likely true for fees charged upfront

    specialScheme: "NONE",

    notes:
      "Louisiana: MONTHLY lease taxation on each payment. State lease tax: 1.45% " +
      "(1% + 0.45%) + local parish/municipal taxes. Lease tax dedicated to Transportation " +
      "Trust Fund. Cap cost reduction taxation UNCLEAR (verify). Trade-in credit on " +
      "leases UNCLEAR (verify). Backend products (VSC, GAP) LIKELY EXEMPT (verify). " +
      "Doc fee LIKELY TAXABLE (verify). Electronic filing required (Form R-1029E). " +
      "Contact Louisiana DOR: 855-307-3893 or sales.inquiries@la.gov for verification.",
  },

  // ============================================================================
  // RECIPROCITY RULES
  // ============================================================================

  /**
   * Reciprocity: YES (rate-to-rate credit for reciprocal states)
   *
   * Louisiana GRANTS A CREDIT against its sales tax to residents who paid a
   * similar tax on the purchase of a motor vehicle in another state, IF that
   * state allows a credit for taxes paid in Louisiana.
   *
   * Key Rules:
   *
   * Reciprocity Requirement:
   * The other state must offer a similar credit to Louisiana residents. This
   * is a RECIPROCAL system.
   *
   * Credit Scope:
   * - Credit is granted on a RATE-TO-RATE basis, not dollar-to-dollar
   * - The credit applies to the STATE TAX ONLY (5%), not to parish and municipality taxes
   * - Applicants are allowed credit for the FULL RATE of sales or use tax paid
   *   in the other state
   *
   * Application:
   * The credit applies when:
   * 1. A Louisiana resident purchases a vehicle in another state
   * 2. The resident paid sales tax to that other state
   * 3. The other state offers reciprocal credit to Louisiana residents
   * 4. The vehicle is titled or registered in Louisiana
   *
   * Example:
   *   Louisiana resident buys car in Texas and pays 6.25% Texas sales tax
   *   If Texas offers reciprocal credit to Louisiana residents:
   *   - Buyer receives credit for the full Texas tax against Louisiana's 5% state tax
   *   - Buyer would still owe Louisiana LOCAL TAXES (parish/municipal)
   *
   * Military Exception:
   * Military personnel are EXEMPT from payment of use tax on motor vehicles
   * imported into Louisiana while on active duty, providing they have proof
   * that sales tax was previously paid on their vehicle in one of the 50 states.
   *
   * New Resident Cap (Effective January 1, 2025):
   * For qualifying vehicles registered on or after January 1, 2025, the use
   * tax owed on a motor vehicle registered by a new resident of Louisiana
   * CANNOT EXCEED $90.
   *
   * Requirements to Qualify for $90 Cap:
   * All of the following conditions must be met:
   * 1. The vehicle is primarily used for PERSONAL PURPOSES
   * 2. The vehicle was previously registered in the name of the new resident
   *    in any other state OR was previously leased to the new resident in another state
   * 3. The vehicle is registered WITHIN 90 DAYS of being brought into Louisiana
   *
   * Credit Interaction:
   * If the credits granted for taxes paid in another state reduce the use tax
   * to LESS THAN $90, the taxpayer owes that lower amount.
   *
   * Fair Market Value Basis:
   * A use tax is due on the FAIR MARKET VALUE of a motor vehicle brought into
   * Louisiana by a new resident who previously registered the vehicle in
   * another state or a foreign country.
   *
   * Source: Louisiana Motor Vehicle Sales Tax Publication;
   *         Louisiana RS 47:337.86 (Credit for taxes paid);
   *         Louisiana Revenue Information Bulletin No. 25-011 (February 13, 2025)
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
      "Louisiana provides RECIPROCAL credit for sales tax paid to other states, " +
      "IF that state offers credit to Louisiana residents. Credit applies on a " +
      "RATE-TO-RATE basis to STATE TAX ONLY (5%), not parish/municipal taxes. " +
      "NEW RESIDENT CAP: $90 maximum use tax (if qualified, effective Jan 1, 2025). " +
      "Military personnel exempt from use tax if previously paid sales tax in another state.",
  },

  extras: {
    lastUpdated: "2025-11-13",
    sources: [
      "Louisiana Department of Revenue (revenue.louisiana.gov)",
      "Louisiana Revised Statutes Title 47 (Revenue and Taxation)",
      "RS 47:302 (Imposition of Sales Tax)",
      "RS 47:305 (Exclusions and Exemptions)",
      "RS 47:305.36 (Motor Vehicle Exemptions)",
      "RS 47:321 (Imposition of Use Tax)",
      "RS 47:321(B) (Lease Tax - 1%)",
      "RS 47:321.1 (Additional Lease Tax - 0.45%)",
      "RS 47:337.86 (Credit for Taxes Paid)",
      "RS 47:305.72 (Orthopedic Disability Rebate)",
      "RS 6:969.18 (Doc Fee Cap - $425)",
      "RS 6:969.51 (GAP Coverage Requirements)",
      "RS 48:77 (Transportation Trust Fund)",
      "Louisiana Revenue Information Bulletin No. 25-011 (2025)",
      "Louisiana Motor Vehicle Sales Tax Publication (LDR 20164)",
    ],
    notes:
      "Louisiana has 5% state sales tax (as of Jan 1, 2025, increased from 4.45%) PLUS " +
      "local parish/municipal taxes (1.85% to 7.0%), creating combined rates of 6.85% to " +
      "13.5%. DOMICILE-BASED TAXATION: Tax rate based on buyer's home parish, NOT dealer " +
      "location. Full trade-in credit. BOTH manufacturer AND dealer rebates reduce taxable " +
      "price. Doc fee LIKELY TAXABLE (verify), capped at $425. Service contracts and GAP " +
      "LIKELY EXEMPT (regulated as insurance, verify). Different rates for purchases vs " +
      "leases: Purchase 5% state + local; Lease 1.45% state + local on monthly payments. " +
      "Lease tax dedicated to Transportation Trust Fund. New resident use tax cap: $90 " +
      "(if qualified, effective Jan 1, 2025). Reciprocity: rate-to-rate credit for state " +
      "tax only. VERIFY unclear items with LA DOR: 855-307-3893 or sales.inquiries@la.gov",
    stateRate: 5.0, // Effective Jan 1, 2025
    rateHistorical: {
      "pre-2025-01-01": 4.45,
      "2025-01-01-to-2029-12-31": 5.0,
      "2030-01-01-onwards": 4.75, // Scheduled decrease
    },
    rateChangeEffectiveDate: "2025-01-01",
    futureRateChange: {
      date: "2030-01-01",
      rate: 4.75,
    },
    localRateRange: {
      min: 0.0, // Cameron Parish (no local tax)
      max: 7.0, // Various parishes
    },
    combinedRateRange: {
      min: 5.0, // Cameron Parish
      max: 13.5, // Monroe, Ouachita Parish
    },
    highestRateJurisdictions: [
      { name: "Monroe", rate: 13.5 },
      { name: "Sterlington (Ouachita Parish)", rate: 12.95 },
    ],
    lowestRateJurisdiction: { name: "Cameron Parish", rate: 5.0 },
    avgCombinedRate: 9.5, // Approximate average
    docFeeCap: 425,
    leaseTaxRates: {
      state: 1.45, // 1% + 0.45%
      baseLeaseTax: 1.0,
      additionalLeaseTax: 0.45,
    },
    newResidentUseTaxCap: {
      amount: 90,
      effectiveDate: "2025-01-01",
      requirements: [
        "Vehicle primarily used for personal purposes",
        "Previously registered in name of new resident in another state OR previously leased",
        "Registered within 90 days of being brought into Louisiana",
      ],
    },
    antiqueVehicleExemption: {
      effectiveDate: "2019-07-01",
      requirements: [
        "Vehicle made more than 25 years ago",
        "Valued at more than $10,000",
        "Not used in a commercial capacity",
      ],
    },
    orthopedicDisabilityRebate: {
      statute: "RS 47:305.72",
      description: "Sales tax rebate for vehicles used by persons with orthopedic disabilities",
    },
    domicileBasedTaxation: true,
    verificationNeeded: [
      "Doc fee taxability (likely taxable, verify)",
      "Service contract taxability on retail (likely exempt, verify)",
      "GAP insurance taxability on retail (likely exempt, verify)",
      "Cap cost reduction taxability on leases (unclear, verify)",
      "Trade-in credit on leases (unclear, verify)",
      "Backend products on leases (likely exempt, verify)",
      "Doc fee taxability on leases (likely taxable, verify)",
    ],
    contactInfo: {
      phone: "855-307-3893",
      email: "sales.inquiries@la.gov",
      website: "https://revenue.louisiana.gov/",
    },
  },
};

export default US_LA;
