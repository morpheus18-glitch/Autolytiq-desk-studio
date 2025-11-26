/**
 * NORTH CAROLINA HIGHWAY USE TAX (HUT) CALCULATOR
 *
 * North Carolina uses a Highway Use Tax (HUT) system instead of traditional
 * sales tax for vehicle purchases. This is a state-only tax with no local
 * jurisdiction stacking, making it fundamentally different from standard
 * sales tax systems.
 *
 * KEY DIFFERENCES FROM SALES TAX:
 * - State-only tax (3% as of 2024) - no county or city rates
 * - Trade-in gets FULL credit (deducted before HUT calculation)
 * - Manufacturer rebates are NON-taxable (reduce base)
 * - Dealer rebates are TAXABLE (included in base)
 * - Doc fee is TAXABLE (included in base)
 * - Service contracts & GAP are TAXABLE (included in base)
 * - 90-day reciprocity window (must prove tax paid within 90 days)
 * - HUT base = Vehicle price - trade-in - manufacturer rebates
 *
 * SOURCES:
 * - North Carolina Department of Motor Vehicles (NCDMV)
 * - NC General Statutes § 105-187.1 (Highway Use Tax)
 * - NCDMV Division of Motor Vehicles Tax & Tag Together program
 */

import type {
  TaxCalculationInput,
  TaxRulesConfig,
  TaxCalculationResult,
  TaxBaseBreakdown,
  TaxAmountBreakdown,
  LeaseTaxBreakdown,
  AutoTaxDebug,
} from "../types";

/**
 * Calculate North Carolina Highway Use Tax for retail or lease transactions
 *
 * This function handles North Carolina's unique HUT system which replaces
 * traditional sales tax for vehicles with a state-only highway use tax.
 */
export function calculateNorthCarolinaHUT(
  input: TaxCalculationInput,
  rules: TaxRulesConfig
): TaxCalculationResult {
  const notes: string[] = [];
  const hutConfig = rules.extras?.ncHUT;

  if (!hutConfig) {
    throw new Error(
      "North Carolina HUT configuration (extras.ncHUT) is missing in state rules."
    );
  }

  notes.push(
    "North Carolina HUT Calculation: Using Highway Use Tax system (state-only, no local rates)"
  );

  // ============================================================================
  // STEP 1: Determine Initial HUT Base
  // ============================================================================

  let rawBase: number;

  if (input.dealType === "RETAIL") {
    // Retail: Start with vehicle price
    rawBase = input.vehiclePrice;
    notes.push(
      `HUT Base (Retail): Starting with vehicle price of $${rawBase.toFixed(2)}`
    );
  } else {
    // Lease: Use gross cap cost
    rawBase = input.grossCapCost || input.vehiclePrice;
    notes.push(
      `HUT Base (Lease): Using gross cap cost of $${rawBase.toFixed(2)}`
    );
  }

  let hutBase = rawBase;

  // ============================================================================
  // STEP 2: Apply Trade-In Credit (FULL)
  // ============================================================================

  let appliedTradeIn = 0;

  if (hutConfig.includeTradeInReduction && input.tradeInValue > 0) {
    // NC HUT: Trade-in gets FULL credit (deducted before HUT calculation)
    appliedTradeIn = Math.min(input.tradeInValue, hutBase);
    hutBase -= appliedTradeIn;
    notes.push(
      `HUT: Applied full trade-in credit of $${appliedTradeIn.toFixed(2)} (reduces HUT base)`
    );
  } else if (input.tradeInValue > 0) {
    notes.push(
      `HUT: Trade-in of $${input.tradeInValue.toFixed(2)} not applied (config.includeTradeInReduction=false)`
    );
  }

  // ============================================================================
  // STEP 3: Apply Manufacturer Rebates (NON-TAXABLE)
  // ============================================================================

  let appliedRebatesNonTaxable = 0;

  if (input.rebateManufacturer > 0) {
    // NC HUT: Manufacturer rebates reduce the HUT base
    const rebateCredit = Math.min(input.rebateManufacturer, hutBase);
    appliedRebatesNonTaxable = rebateCredit;
    hutBase -= rebateCredit;
    notes.push(
      `HUT: Applied manufacturer rebate of $${rebateCredit.toFixed(2)} (non-taxable, reduces base)`
    );
  }

  // ============================================================================
  // STEP 4: Apply Dealer Rebates (TAXABLE)
  // ============================================================================

  let appliedRebatesTaxable = 0;

  if (input.rebateDealer > 0) {
    // NC HUT: Dealer rebates are TAXABLE (do NOT reduce base)
    appliedRebatesTaxable = input.rebateDealer;
    notes.push(
      `HUT: Dealer rebate of $${input.rebateDealer.toFixed(2)} is TAXABLE (included in base)`
    );
  }

  // ============================================================================
  // STEP 5: Add Taxable Components to HUT Base
  // ============================================================================

  let feesBase = 0;
  let productsBase = 0;
  const taxableFees: { code: string; amount: number }[] = [];
  let taxableDocFee = 0;
  let taxableServiceContracts = 0;
  let taxableGap = 0;

  // Doc Fee (TAXABLE in NC)
  if (input.docFee > 0) {
    hutBase += input.docFee;
    feesBase += input.docFee;
    taxableDocFee = input.docFee;
    notes.push(
      `HUT: Added doc fee of $${input.docFee.toFixed(2)} to HUT base (taxable)`
    );
  }

  // Other Fees (check rules)
  for (const fee of input.otherFees) {
    const feeRule = rules.feeTaxRules.find((r) => r.code === fee.code);
    if (feeRule?.taxable) {
      hutBase += fee.amount;
      feesBase += fee.amount;
      taxableFees.push(fee);
      notes.push(
        `HUT: Added fee ${fee.code} of $${fee.amount.toFixed(2)} to HUT base (taxable)`
      );
    } else {
      notes.push(
        `HUT: Fee ${fee.code} of $${fee.amount.toFixed(2)} is non-taxable (excluded from base)`
      );
    }
  }

  // Service Contracts (TAXABLE in NC)
  if (input.serviceContracts > 0) {
    hutBase += input.serviceContracts;
    productsBase += input.serviceContracts;
    taxableServiceContracts = input.serviceContracts;
    notes.push(
      `HUT: Added service contracts of $${input.serviceContracts.toFixed(2)} to HUT base (taxable)`
    );
  }

  // GAP Insurance (TAXABLE in NC)
  if (input.gap > 0) {
    hutBase += input.gap;
    productsBase += input.gap;
    taxableGap = input.gap;
    notes.push(
      `HUT: Added GAP insurance of $${input.gap.toFixed(2)} to HUT base (taxable)`
    );
  }

  // Accessories (if taxable)
  if (rules.taxOnAccessories && input.accessoriesAmount > 0) {
    hutBase += input.accessoriesAmount;
    productsBase += input.accessoriesAmount;
    notes.push(
      `HUT: Added accessories of $${input.accessoriesAmount.toFixed(2)} to HUT base (taxable)`
    );
  }

  // Negative Equity (if taxable)
  if (rules.taxOnNegativeEquity && input.negativeEquity > 0) {
    hutBase += input.negativeEquity;
    notes.push(
      `HUT: Added negative equity of $${input.negativeEquity.toFixed(2)} to HUT base (taxable)`
    );
  }

  // Ensure non-negative HUT base
  hutBase = Math.max(0, hutBase);
  notes.push(`HUT: Final HUT base = $${hutBase.toFixed(2)}`);

  // ============================================================================
  // STEP 6: Calculate Raw HUT (Before Reciprocity)
  // ============================================================================

  const hutRate = hutConfig.baseRate;
  const rawHutTax = hutBase * hutRate;

  notes.push(
    `HUT: Calculated tax = $${hutBase.toFixed(2)} × ${(hutRate * 100).toFixed(2)}% = $${rawHutTax.toFixed(2)}`
  );

  // ============================================================================
  // STEP 7: Apply Reciprocity (Credit for Tax Paid Elsewhere)
  // ============================================================================

  let finalHutTax = rawHutTax;
  let reciprocityCredit = 0;

  if (
    rules.reciprocity.enabled &&
    input.originTaxInfo &&
    input.originTaxInfo.amount > 0
  ) {
    // Check 90-day window for reciprocity
    let withinTimeWindow = true;

    if (input.originTaxInfo.taxPaidDate && hutConfig.maxReciprocityAgeDays) {
      const taxPaidDate = new Date(input.originTaxInfo.taxPaidDate);
      const asOfDate = new Date(input.asOfDate);
      const daysSinceTaxPaid = Math.floor(
        (asOfDate.getTime() - taxPaidDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceTaxPaid > hutConfig.maxReciprocityAgeDays) {
        withinTimeWindow = false;
        notes.push(
          `HUT Reciprocity: Tax paid ${daysSinceTaxPaid} days ago (exceeds ${hutConfig.maxReciprocityAgeDays}-day limit). NO reciprocity credit.`
        );
      } else {
        notes.push(
          `HUT Reciprocity: Tax paid ${daysSinceTaxPaid} days ago (within ${hutConfig.maxReciprocityAgeDays}-day window)`
        );
      }
    }

    if (withinTimeWindow) {
      // North Carolina provides credit for tax paid in other states, capped at NC HUT amount
      const creditAmount = Math.min(input.originTaxInfo.amount, rawHutTax);
      reciprocityCredit = creditAmount;
      finalHutTax = rawHutTax - creditAmount;

      notes.push(
        `HUT Reciprocity: Credit of $${creditAmount.toFixed(2)} for tax paid in ${input.originTaxInfo.stateCode}`
      );
      notes.push(
        `HUT: Final tax after reciprocity = $${finalHutTax.toFixed(2)}`
      );

      if (rules.reciprocity.requireProofOfTaxPaid) {
        notes.push(
          "HUT Reciprocity: Proof of tax paid required (out-of-state title, registration, or tax receipt)"
        );
      }
    }
  }

  // ============================================================================
  // STEP 8: Build Tax Breakdown
  // ============================================================================

  const hutTaxes: TaxAmountBreakdown = {
    componentTaxes: [
      {
        label: "NC_HUT",
        rate: hutRate,
        amount: finalHutTax,
      },
    ],
    totalTax: finalHutTax,
  };

  // ============================================================================
  // STEP 9: Build Base Breakdown
  // ============================================================================

  const bases: TaxBaseBreakdown = {
    vehicleBase: hutBase - feesBase - productsBase,
    feesBase,
    productsBase,
    totalTaxableBase: hutBase,
  };

  // ============================================================================
  // STEP 10: Build Debug Information
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
  // STEP 11: Format Result Based on Deal Type
  // ============================================================================

  if (input.dealType === "LEASE") {
    // For North Carolina leases, HUT is typically applied at signing (upfront)
    // NC taxes the cap cost at signing, not the monthly payments
    const leaseBreakdown: LeaseTaxBreakdown = {
      upfrontTaxableBase: hutBase,
      upfrontTaxes: hutTaxes,
      paymentTaxableBasePerPeriod: 0, // HUT is upfront, not monthly
      paymentTaxesPerPeriod: { componentTaxes: [], totalTax: 0 },
      totalTaxOverTerm: hutTaxes.totalTax,
    };

    return {
      mode: "LEASE",
      bases,
      taxes: hutTaxes,
      leaseBreakdown,
      debug,
    };
  }

  // Retail mode
  return {
    mode: "RETAIL",
    bases,
    taxes: hutTaxes,
    debug,
  };
}
