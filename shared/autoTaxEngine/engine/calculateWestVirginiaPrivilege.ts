/**
 * WEST VIRGINIA PRIVILEGE TAX CALCULATOR
 *
 * West Virginia uses a privilege tax (also called title tax) system for
 * vehicle registration. This tax is similar to sales tax but has unique
 * base calculation rules and may use DMV-assessed values instead of
 * sale price.
 *
 * KEY DIFFERENCES FROM SALES TAX:
 * - Base rate is 5% (as of 2024)
 * - May use DMV assessed value (higher of price or assessed)
 * - Trade-in gets FULL credit (deducted before tax calculation)
 * - Both manufacturer and dealer rebates are TAXABLE (included in base)
 * - Doc fee is TAXABLE (included in base)
 * - Service contracts & GAP are TAXABLE (included in base)
 * - Different rates by vehicle class:
 *   - Auto/Truck: 5%
 *   - RV: 6%
 *   - Trailer: 3%
 * - Reciprocity enabled (credit for tax paid elsewhere, capped at WV tax)
 * - Negative equity can be added to base (rolled into taxable amount)
 *
 * SOURCES:
 * - West Virginia Division of Motor Vehicles (WVDMV)
 * - WV Code § 17A-3-4 (Certificate of Title Tax)
 * - WV State Tax Department guidance
 */

import {
  TaxCalculationInput,
  TaxRulesConfig,
  TaxCalculationResult,
  TaxBaseBreakdown,
  TaxAmountBreakdown,
  LeaseTaxBreakdown,
  AutoTaxDebug,
} from "../types";

/**
 * Calculate West Virginia Privilege Tax for retail or lease transactions
 *
 * This function handles West Virginia's unique privilege/title tax system
 * which replaces traditional sales tax for vehicles.
 */
export function calculateWestVirginiaPrivilege(
  input: TaxCalculationInput,
  rules: TaxRulesConfig
): TaxCalculationResult {
  const notes: string[] = [];
  const privilegeConfig = rules.extras?.wvPrivilege;

  if (!privilegeConfig) {
    throw new Error(
      "West Virginia Privilege Tax configuration (extras.wvPrivilege) is missing in state rules."
    );
  }

  notes.push(
    "West Virginia Privilege Tax Calculation: Using privilege/title tax system"
  );

  // ============================================================================
  // STEP 1: Determine Initial Privilege Tax Base
  // ============================================================================

  let rawBase: number;

  if (input.dealType === "RETAIL") {
    // Retail: Start with vehicle price
    rawBase = input.vehiclePrice;
    notes.push(
      `Privilege Tax Base (Retail): Starting with vehicle price of $${rawBase.toFixed(2)}`
    );
  } else {
    // Lease: Use gross cap cost
    rawBase = input.grossCapCost || input.vehiclePrice;
    notes.push(
      `Privilege Tax Base (Lease): Using gross cap cost of $${rawBase.toFixed(2)}`
    );
  }

  // ============================================================================
  // STEP 2: Apply Assessed Value Rules (if applicable)
  // ============================================================================

  // TODO: Integrate DMV assessed value when available via input.extras or similar
  // For now, we note the configuration but use the deal price
  if (privilegeConfig.useAssessedValue) {
    notes.push(
      "Privilege Tax: Config specifies useAssessedValue=true. DMV assessed value should be integrated when available."
    );
  }

  if (privilegeConfig.useHigherOfPriceOrAssessed) {
    notes.push(
      "Privilege Tax: Config specifies useHigherOfPriceOrAssessed=true. Base should be max(price, assessed) when assessed value is available."
    );
  }

  let privilegeBase = rawBase;

  // ============================================================================
  // STEP 3: Apply Trade-In Credit (FULL)
  // ============================================================================

  let appliedTradeIn = 0;

  if (privilegeConfig.allowTradeInCredit && input.tradeInValue > 0) {
    // WV Privilege Tax: Trade-in gets FULL credit
    appliedTradeIn = Math.min(input.tradeInValue, privilegeBase);
    privilegeBase -= appliedTradeIn;
    notes.push(
      `Privilege Tax: Applied full trade-in credit of $${appliedTradeIn.toFixed(2)} (reduces base)`
    );
  } else if (input.tradeInValue > 0) {
    notes.push(
      `Privilege Tax: Trade-in of $${input.tradeInValue.toFixed(2)} not applied (config.allowTradeInCredit=false)`
    );
  }

  // ============================================================================
  // STEP 4: Apply Rebates (BOTH TAXABLE)
  // ============================================================================

  let appliedRebatesTaxable = 0;
  let appliedRebatesNonTaxable = 0;

  if (input.rebateManufacturer > 0) {
    // WV Privilege Tax: Manufacturer rebates are TAXABLE (do NOT reduce base)
    appliedRebatesTaxable += input.rebateManufacturer;
    notes.push(
      `Privilege Tax: Manufacturer rebate of $${input.rebateManufacturer.toFixed(2)} is TAXABLE (included in base)`
    );
  }

  if (input.rebateDealer > 0) {
    // WV Privilege Tax: Dealer rebates are TAXABLE (do NOT reduce base)
    appliedRebatesTaxable += input.rebateDealer;
    notes.push(
      `Privilege Tax: Dealer rebate of $${input.rebateDealer.toFixed(2)} is TAXABLE (included in base)`
    );
  }

  // ============================================================================
  // STEP 5: Add Negative Equity (if configured)
  // ============================================================================

  if (privilegeConfig.applyNegativeEquityToBase && input.negativeEquity > 0) {
    privilegeBase += input.negativeEquity;
    notes.push(
      `Privilege Tax: Added negative equity of $${input.negativeEquity.toFixed(2)} to base`
    );
  } else if (input.negativeEquity > 0) {
    notes.push(
      `Privilege Tax: Negative equity of $${input.negativeEquity.toFixed(2)} not added to base (config.applyNegativeEquityToBase=false)`
    );
  }

  // ============================================================================
  // STEP 6: Add Taxable Components to Privilege Tax Base
  // ============================================================================

  let feesBase = 0;
  let productsBase = 0;
  const taxableFees: { code: string; amount: number }[] = [];
  let taxableDocFee = 0;
  let taxableServiceContracts = 0;
  let taxableGap = 0;

  // Doc Fee (TAXABLE in WV)
  if (input.docFee > 0) {
    privilegeBase += input.docFee;
    feesBase += input.docFee;
    taxableDocFee = input.docFee;
    notes.push(
      `Privilege Tax: Added doc fee of $${input.docFee.toFixed(2)} to base (taxable)`
    );
  }

  // Other Fees (check rules)
  for (const fee of input.otherFees) {
    const feeRule = rules.feeTaxRules.find((r) => r.code === fee.code);
    if (feeRule?.taxable) {
      privilegeBase += fee.amount;
      feesBase += fee.amount;
      taxableFees.push(fee);
      notes.push(
        `Privilege Tax: Added fee ${fee.code} of $${fee.amount.toFixed(2)} to base (taxable)`
      );
    } else {
      notes.push(
        `Privilege Tax: Fee ${fee.code} of $${fee.amount.toFixed(2)} is non-taxable (excluded from base)`
      );
    }
  }

  // Service Contracts (TAXABLE in WV)
  if (input.serviceContracts > 0) {
    privilegeBase += input.serviceContracts;
    productsBase += input.serviceContracts;
    taxableServiceContracts = input.serviceContracts;
    notes.push(
      `Privilege Tax: Added service contracts of $${input.serviceContracts.toFixed(2)} to base (taxable)`
    );
  }

  // GAP Insurance (TAXABLE in WV)
  if (input.gap > 0) {
    privilegeBase += input.gap;
    productsBase += input.gap;
    taxableGap = input.gap;
    notes.push(
      `Privilege Tax: Added GAP insurance of $${input.gap.toFixed(2)} to base (taxable)`
    );
  }

  // Accessories (if taxable)
  if (rules.taxOnAccessories && input.accessoriesAmount > 0) {
    privilegeBase += input.accessoriesAmount;
    productsBase += input.accessoriesAmount;
    notes.push(
      `Privilege Tax: Added accessories of $${input.accessoriesAmount.toFixed(2)} to base (taxable)`
    );
  }

  // Ensure non-negative privilege tax base
  privilegeBase = Math.max(0, privilegeBase);
  notes.push(`Privilege Tax: Final base = $${privilegeBase.toFixed(2)}`);

  // ============================================================================
  // STEP 7: Determine Tax Rate by Vehicle Class
  // ============================================================================

  let privilegeRate = privilegeConfig.baseRate;

  // Check if vehicle class-specific rates exist
  if (privilegeConfig.vehicleClassRates && input.vehicleClass) {
    const classRate = privilegeConfig.vehicleClassRates[input.vehicleClass];
    if (classRate !== undefined) {
      privilegeRate = classRate;
      notes.push(
        `Privilege Tax: Using vehicle class rate for "${input.vehicleClass}": ${(privilegeRate * 100).toFixed(2)}%`
      );
    } else {
      notes.push(
        `Privilege Tax: No class-specific rate found for "${input.vehicleClass}", using base rate: ${(privilegeRate * 100).toFixed(2)}%`
      );
    }
  } else {
    notes.push(
      `Privilege Tax: Using base rate: ${(privilegeRate * 100).toFixed(2)}%`
    );
  }

  // ============================================================================
  // STEP 8: Calculate Raw Privilege Tax (Before Reciprocity)
  // ============================================================================

  const rawPrivilegeTax = privilegeBase * privilegeRate;

  notes.push(
    `Privilege Tax: Calculated tax = $${privilegeBase.toFixed(2)} × ${(privilegeRate * 100).toFixed(2)}% = $${rawPrivilegeTax.toFixed(2)}`
  );

  // ============================================================================
  // STEP 9: Apply Reciprocity (Credit for Tax Paid Elsewhere)
  // ============================================================================

  let finalPrivilegeTax = rawPrivilegeTax;
  let reciprocityCredit = 0;

  if (
    rules.reciprocity.enabled &&
    input.originTaxInfo &&
    input.originTaxInfo.amount > 0
  ) {
    // West Virginia provides credit for tax paid in other states, capped at WV privilege tax amount
    const creditAmount = Math.min(input.originTaxInfo.amount, rawPrivilegeTax);
    reciprocityCredit = creditAmount;
    finalPrivilegeTax = rawPrivilegeTax - creditAmount;

    notes.push(
      `Privilege Tax Reciprocity: Credit of $${creditAmount.toFixed(2)} for tax paid in ${input.originTaxInfo.stateCode}`
    );
    notes.push(
      `Privilege Tax: Final tax after reciprocity = $${finalPrivilegeTax.toFixed(2)}`
    );

    if (rules.reciprocity.requireProofOfTaxPaid) {
      notes.push(
        "Privilege Tax Reciprocity: Proof of tax paid required (out-of-state title, registration, or tax receipt)"
      );
    }
  }

  // ============================================================================
  // STEP 10: Build Tax Breakdown
  // ============================================================================

  const privilegeTaxes: TaxAmountBreakdown = {
    componentTaxes: [
      {
        label: "WV_PRIVILEGE",
        rate: privilegeRate,
        amount: finalPrivilegeTax,
      },
    ],
    totalTax: finalPrivilegeTax,
  };

  // ============================================================================
  // STEP 11: Build Base Breakdown
  // ============================================================================

  const bases: TaxBaseBreakdown = {
    vehicleBase: privilegeBase - feesBase - productsBase,
    feesBase,
    productsBase,
    totalTaxableBase: privilegeBase,
  };

  // ============================================================================
  // STEP 12: Build Debug Information
  // ============================================================================

  const debug: AutoTaxDebug = {
    appliedTradeIn,
    appliedRebatesNonTaxable,
    appliedRebatesTaxable,
    taxableDocFee,
    taxableFees,
    taxableServiceContracts,
    taxableGap,
    reciprocityCredit,
    notes,
  };

  // ============================================================================
  // STEP 13: Format Result Based on Deal Type
  // ============================================================================

  if (input.dealType === "LEASE") {
    // For West Virginia leases, privilege tax is typically applied at signing (upfront)
    // WV taxes the cap cost at signing, not the monthly payments
    const leaseBreakdown: LeaseTaxBreakdown = {
      upfrontTaxableBase: privilegeBase,
      upfrontTaxes: privilegeTaxes,
      paymentTaxableBasePerPeriod: 0, // Privilege tax is upfront, not monthly
      paymentTaxesPerPeriod: { componentTaxes: [], totalTax: 0 },
      totalTaxOverTerm: privilegeTaxes.totalTax,
    };

    return {
      mode: "LEASE",
      bases,
      taxes: privilegeTaxes,
      leaseBreakdown,
      debug,
    };
  }

  // Retail mode
  return {
    mode: "RETAIL",
    bases,
    taxes: privilegeTaxes,
    debug,
  };
}
