/**
 * GEORGIA TAVT (TITLE AD VALOREM TAX) CALCULATOR
 *
 * Georgia uses a Title Ad Valorem Tax (TAVT) system instead of traditional
 * sales tax for vehicle purchases. This is a completely different tax universe
 * that cannot be handled by the generic sales tax pipeline.
 *
 * KEY DIFFERENCES FROM SALES TAX:
 * - One-time tax paid at title/registration (not ongoing property tax)
 * - Based on fair market value or assessed value (not just selling price)
 * - Fixed state rate (no local jurisdiction stacking)
 * - Different trade-in and reciprocity treatment
 * - Leases may use agreed value or capitalized cost as base
 *
 * SOURCES:
 * - Georgia Department of Revenue (DOR)
 * - Georgia Code Title 48, Chapter 5C (Motor Vehicle Title Ad Valorem Tax)
 * - Georgia DOR Motor Vehicle Division guidance
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
 * Calculate Georgia TAVT for retail or lease transactions
 *
 * This function handles Georgia's unique TAVT system which replaces
 * traditional sales tax for vehicles.
 */
export function calculateGeorgiaTAVT(
  input: TaxCalculationInput,
  rules: TaxRulesConfig
): TaxCalculationResult {
  const notes: string[] = [];
  const tavtConfig = rules.extras?.gaTAVT;

  if (!tavtConfig) {
    throw new Error(
      "Georgia TAVT configuration (extras.gaTAVT) is missing in state rules."
    );
  }

  notes.push("Georgia TAVT Calculation: Using Title Ad Valorem Tax system");

  // ============================================================================
  // STEP 1: Determine Initial TAVT Base
  // ============================================================================

  let rawBase: number;

  if (input.dealType === "RETAIL") {
    // Retail: Start with vehicle price
    rawBase = input.vehiclePrice;
    notes.push(
      `TAVT Base (Retail): Starting with vehicle price of $${rawBase.toFixed(2)}`
    );
  } else {
    // Lease: Use lease base mode from config
    if (tavtConfig.leaseBaseMode === "CAP_COST") {
      rawBase = input.grossCapCost || input.vehiclePrice;
      notes.push(
        `TAVT Base (Lease): Using gross cap cost of $${rawBase.toFixed(2)}`
      );
    } else if (tavtConfig.leaseBaseMode === "AGREED_VALUE") {
      // In Georgia, leases often use an "agreed value" which is typically
      // the vehicle price or a negotiated fair market value
      rawBase = input.vehiclePrice;
      notes.push(
        `TAVT Base (Lease): Using agreed value of $${rawBase.toFixed(2)}`
      );
    } else {
      // CUSTOM or fallback
      rawBase = input.vehiclePrice;
      notes.push(
        `TAVT Base (Lease): Using vehicle price (custom mode) of $${rawBase.toFixed(2)}`
      );
    }
  }

  // ============================================================================
  // STEP 2: Apply Assessed Value Rules (if applicable)
  // ============================================================================

  // TODO: Integrate DMV assessed value when available via input.extras or similar
  // For now, we note the configuration but use the deal price
  if (tavtConfig.useAssessedValue) {
    notes.push(
      "TAVT: Config specifies useAssessedValue=true. DMV assessed value should be integrated when available."
    );
  }

  if (tavtConfig.useHigherOfPriceOrAssessed) {
    notes.push(
      "TAVT: Config specifies useHigherOfPriceOrAssessed=true. TAVT base should be max(price, assessed) when assessed value is available."
    );
  }

  let tavtBase = rawBase;

  // ============================================================================
  // STEP 3: Apply Trade-In Credit
  // ============================================================================

  let appliedTradeIn = 0;

  if (tavtConfig.allowTradeInCredit && input.tradeInValue > 0) {
    if (tavtConfig.tradeInAppliesTo === "VEHICLE_ONLY") {
      // Trade-in reduces the TAVT base directly
      appliedTradeIn = Math.min(input.tradeInValue, tavtBase);
      tavtBase -= appliedTradeIn;
      notes.push(
        `TAVT: Applied trade-in credit of $${appliedTradeIn.toFixed(2)} (reduces TAVT base)`
      );
    } else {
      // FULL: Trade-in applies to full transaction (same behavior for TAVT)
      appliedTradeIn = Math.min(input.tradeInValue, tavtBase);
      tavtBase -= appliedTradeIn;
      notes.push(
        `TAVT: Applied full trade-in credit of $${appliedTradeIn.toFixed(2)}`
      );
    }
  } else if (input.tradeInValue > 0) {
    notes.push(
      `TAVT: Trade-in of $${input.tradeInValue.toFixed(2)} not applied (config.allowTradeInCredit=false)`
    );
  }

  // ============================================================================
  // STEP 4: Apply Negative Equity
  // ============================================================================

  if (tavtConfig.applyNegativeEquityToBase && input.negativeEquity > 0) {
    tavtBase += input.negativeEquity;
    notes.push(
      `TAVT: Added negative equity of $${input.negativeEquity.toFixed(2)} to TAVT base`
    );
  } else if (input.negativeEquity > 0) {
    notes.push(
      `TAVT: Negative equity of $${input.negativeEquity.toFixed(2)} not added to base (config.applyNegativeEquityToBase=false)`
    );
  }

  // Ensure non-negative TAVT base
  tavtBase = Math.max(0, tavtBase);
  notes.push(`TAVT: Final TAVT base = $${tavtBase.toFixed(2)}`);

  // ============================================================================
  // STEP 5: Calculate Raw TAVT (Before Reciprocity)
  // ============================================================================

  const tavtRate = tavtConfig.defaultRate;
  const rawTavtTax = tavtBase * tavtRate;

  notes.push(
    `TAVT: Calculated tax = $${tavtBase.toFixed(2)} × ${(tavtRate * 100).toFixed(2)}% = $${rawTavtTax.toFixed(2)}`
  );

  // ============================================================================
  // STEP 6: Apply Reciprocity (Credit for Tax Paid Elsewhere)
  // ============================================================================

  let finalTavtTax = rawTavtTax;
  let reciprocityCredit = 0;

  if (
    rules.reciprocity.enabled &&
    input.originTaxInfo &&
    input.originTaxInfo.amount > 0
  ) {
    // Georgia provides credit for tax paid in other states, capped at GA TAVT amount
    const creditAmount = Math.min(input.originTaxInfo.amount, rawTavtTax);
    reciprocityCredit = creditAmount;
    finalTavtTax = rawTavtTax - creditAmount;

    notes.push(
      `TAVT Reciprocity: Credit of $${creditAmount.toFixed(2)} for tax paid in ${input.originTaxInfo.stateCode}`
    );
    notes.push(
      `TAVT: Final tax after reciprocity = $${finalTavtTax.toFixed(2)}`
    );

    if (rules.reciprocity.requireProofOfTaxPaid) {
      notes.push(
        "TAVT Reciprocity: Proof of tax paid required (receipt, registration, etc.)"
      );
    }
  }

  // ============================================================================
  // STEP 7: Build Tax Breakdown
  // ============================================================================

  const tavtTaxes: TaxAmountBreakdown = {
    componentTaxes: [
      {
        label: "GA_TAVT",
        rate: tavtRate,
        amount: finalTavtTax,
      },
    ],
    totalTax: finalTavtTax,
  };

  // ============================================================================
  // STEP 8: Build Base Breakdown
  // ============================================================================

  // In Georgia TAVT, the "vehicle base" is the TAVT base
  // Fees and F&I products are typically NOT subject to TAVT
  // (they may be subject to regular sales tax separately, but that's a future enhancement)
  const bases: TaxBaseBreakdown = {
    vehicleBase: tavtBase,
    feesBase: 0, // TAVT applies to vehicle only, not fees
    productsBase: 0, // TAVT applies to vehicle only, not F&I products
    totalTaxableBase: tavtBase,
  };

  // ============================================================================
  // STEP 9: Build Debug Information
  // ============================================================================

  const debug: AutoTaxDebug = {
    appliedTradeIn,
    appliedRebatesNonTaxable: 0, // Georgia TAVT typically treats all rebates as taxable
    appliedRebatesTaxable: input.rebateManufacturer + input.rebateDealer,
    taxableDocFee: 0, // Doc fees not subject to TAVT (may be subject to sales tax separately)
    taxableFees: [],
    taxableServiceContracts: 0, // Service contracts not subject to TAVT
    taxableGap: 0, // GAP not subject to TAVT
    notes,
  };

  // ============================================================================
  // STEP 10: Format Result Based on Deal Type
  // ============================================================================

  if (input.dealType === "LEASE") {
    // For Georgia leases, TAVT is typically an upfront event
    // The lease payments themselves may have their own sales tax in some cases
    // (future enhancement), but for now we treat TAVT as upfront-only
    const leaseBreakdown: LeaseTaxBreakdown = {
      upfrontTaxableBase: tavtBase,
      upfrontTaxes: tavtTaxes,
      paymentTaxableBasePerPeriod: 0, // TAVT is upfront, not monthly
      paymentTaxesPerPeriod: { componentTaxes: [], totalTax: 0 },
      totalTaxOverTerm: tavtTaxes.totalTax,
    };

    return {
      mode: "LEASE",
      bases,
      taxes: tavtTaxes,
      leaseBreakdown,
      debug,
    };
  }

  // Retail mode
  return {
    mode: "RETAIL",
    bases,
    taxes: tavtTaxes,
    debug,
  };
}
