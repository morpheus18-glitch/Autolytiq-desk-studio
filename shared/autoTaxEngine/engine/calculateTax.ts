import {
  TaxCalculationInput,
  TaxCalculationResult,
  TaxRulesConfig,
  TaxBaseBreakdown,
  TaxAmountBreakdown,
  LeaseTaxBreakdown,
  AutoTaxDebug,
  TaxRateComponent,
  LeaseFields,
} from "../types";
import {
  interpretTradeInPolicy,
  interpretVehicleTaxScheme,
  interpretLeaseSpecialScheme,
  isDocFeeTaxable,
  isFeeTaxable,
  isRebateTaxable,
} from "./interpreters";
import { calculateGeorgiaTAVT } from "./calculateGeorgiaTAVT";
import { calculateNorthCarolinaHUT } from "./calculateNorthCarolinaHUT";
import { calculateWestVirginiaPrivilege } from "./calculateWestVirginiaPrivilege";

/**
 * AUTO TAX ENGINE - CORE CALCULATION FUNCTION
 *
 * Pure function that calculates automotive taxes for retail and lease deals.
 * No side effects, no DB, no HTTP, no process.env.
 *
 * This function dispatches to specialized calculation paths based on the
 * state's tax scheme:
 * - SPECIAL_TAVT → Georgia Title Ad Valorem Tax calculator
 * - SPECIAL_HUT → North Carolina Highway Use Tax calculator
 * - DMV_PRIVILEGE_TAX → West Virginia privilege tax calculator
 * - STATE_ONLY, STATE_PLUS_LOCAL → Generic sales tax pipeline
 *
 * @param input - Deal data and tax rate components
 * @param rules - State-specific tax rules configuration
 * @returns Complete tax calculation result with breakdowns and debug info
 */
export function calculateTax(
  input: TaxCalculationInput,
  rules: TaxRulesConfig
): TaxCalculationResult {
  // ============================================================================
  // SPECIAL TAX SCHEMES: Branch to dedicated calculators
  // ============================================================================

  // Georgia TAVT (Title Ad Valorem Tax)
  if (rules.vehicleTaxScheme === "SPECIAL_TAVT") {
    return calculateGeorgiaTAVT(input, rules);
  }

  // North Carolina HUT (Highway Use Tax)
  if (rules.vehicleTaxScheme === "SPECIAL_HUT") {
    return calculateNorthCarolinaHUT(input, rules);
  }

  // West Virginia Privilege Tax
  if (rules.vehicleTaxScheme === "DMV_PRIVILEGE_TAX") {
    return calculateWestVirginiaPrivilege(input, rules);
  }

  // ============================================================================
  // GENERIC SALES TAX PIPELINE: For most states
  // ============================================================================

  if (input.dealType === "RETAIL") {
    return calculateRetailTax(input, rules);
  } else {
    return calculateLeaseTax(input, rules);
  }
}

/**
 * Helper: Apply tax rate components to a taxable base
 */
function applyTaxRates(base: number, rates: TaxRateComponent[]): TaxAmountBreakdown {
  const componentTaxes = rates.map((r) => ({
    label: r.label,
    rate: r.rate,
    amount: base * r.rate,
  }));
  return {
    componentTaxes,
    totalTax: componentTaxes.reduce((sum, c) => sum + c.amount, 0),
  };
}

/**
 * Helper: Apply reciprocity credit (cross-state tax credit)
 */
function applyReciprocity(
  baseTax: number,
  input: TaxCalculationInput,
  rules: TaxRulesConfig,
  notes: string[]
): { finalTax: number; reciprocityCredit: number } {
  const rec = rules.reciprocity;

  if (!rec.enabled) {
    return { finalTax: baseTax, reciprocityCredit: 0 };
  }

  // Optional: enforce scope
  if (
    (rec.scope === "RETAIL_ONLY" && input.dealType === "LEASE") ||
    (rec.scope === "LEASE_ONLY" && input.dealType === "RETAIL")
  ) {
    notes.push(`Reciprocity not applicable for ${input.dealType} deals in this state`);
    return { finalTax: baseTax, reciprocityCredit: 0 };
  }

  const origin = input.originTaxInfo;
  if (!origin || origin.amount <= 0) {
    notes.push("No origin tax info provided; no reciprocity credit applied");
    return { finalTax: baseTax, reciprocityCredit: 0 };
  }

  let credit = 0;

  switch (rec.homeStateBehavior) {
    case "NONE":
      notes.push(`Reciprocity: State ${rules.stateCode} does not provide credit for tax paid in ${origin.stateCode}`);
      break;

    case "CREDIT_UP_TO_STATE_RATE":
      // Cap credit at base tax for this state
      credit = Math.min(origin.amount, baseTax);
      notes.push(
        `Reciprocity: Credit applied up to this state's tax. Origin tax: $${origin.amount.toFixed(2)}, Base tax: $${baseTax.toFixed(2)}, Credit: $${credit.toFixed(2)}`
      );
      break;

    case "CREDIT_FULL":
      // Full credit, but typically capped at baseTax unless state allows carryover
      credit = rec.capAtThisStatesTax
        ? Math.min(origin.amount, baseTax)
        : origin.amount;

      if (credit > baseTax) {
        notes.push(
          `Reciprocity: Full credit applied ($${credit.toFixed(2)}) exceeds base tax ($${baseTax.toFixed(2)}). Excess credit may carry forward.`
        );
      } else {
        notes.push(
          `Reciprocity: Full credit applied: $${credit.toFixed(2)} for tax paid in ${origin.stateCode}`
        );
      }
      break;

    case "HOME_STATE_ONLY":
      // Advanced behavior: In future, might recompute tax using homeState rules
      // For now, credit up to baseTax if tax already paid
      credit = Math.min(origin.amount, baseTax);
      notes.push(
        `Reciprocity: Home-state-only mode. Crediting $${credit.toFixed(2)} based on tax paid in home state ${origin.stateCode}`
      );
      break;
  }

  const finalTax = Math.max(0, baseTax - credit);

  if (rec.requireProofOfTaxPaid && origin.amount > 0) {
    notes.push(
      `Note: State ${rules.stateCode} requires proof of tax payment for reciprocity credit`
    );
  }

  return {
    finalTax,
    reciprocityCredit: credit,
  };
}

/**
 * RETAIL TAX CALCULATION
 */
function calculateRetailTax(
  input: TaxCalculationInput,
  rules: TaxRulesConfig
): TaxCalculationResult {
  const notes: string[] = [];
  let appliedTradeIn = 0;
  let appliedRebatesNonTaxable = 0;
  let appliedRebatesTaxable = 0;

  // 1. Start with vehicle price
  let taxableVehicleBase = input.vehiclePrice;
  notes.push(`Starting vehicle price: $${input.vehiclePrice.toFixed(2)}`);

  // 2. Add accessories if taxable
  if (rules.taxOnAccessories && input.accessoriesAmount > 0) {
    taxableVehicleBase += input.accessoriesAmount;
    notes.push(`Added accessories: $${input.accessoriesAmount.toFixed(2)}`);
  }

  // 3. Add negative equity if taxable
  if (rules.taxOnNegativeEquity && input.negativeEquity > 0) {
    taxableVehicleBase += input.negativeEquity;
    notes.push(`Added negative equity: $${input.negativeEquity.toFixed(2)}`);
  }

  // 4. Apply trade-in policy (using interpreter)
  appliedTradeIn = interpretTradeInPolicy(
    rules.tradeInPolicy,
    input.tradeInValue,
    input.vehiclePrice,
    notes
  );
  taxableVehicleBase = Math.max(0, taxableVehicleBase - appliedTradeIn);

  // 5. Apply rebate rules (using interpreter)
  if (input.rebateManufacturer > 0) {
    if (isRebateTaxable("MANUFACTURER", rules)) {
      appliedRebatesTaxable += input.rebateManufacturer;
      notes.push(
        `Manufacturer rebate (taxable): $${input.rebateManufacturer.toFixed(2)}`
      );
    } else {
      appliedRebatesNonTaxable += input.rebateManufacturer;
      taxableVehicleBase = Math.max(
        0,
        taxableVehicleBase - input.rebateManufacturer
      );
      notes.push(
        `Manufacturer rebate (non-taxable, reduces base): $${input.rebateManufacturer.toFixed(2)}`
      );
    }
  }

  if (input.rebateDealer > 0) {
    if (isRebateTaxable("DEALER", rules)) {
      appliedRebatesTaxable += input.rebateDealer;
      notes.push(`Dealer rebate (taxable): $${input.rebateDealer.toFixed(2)}`);
    } else {
      appliedRebatesNonTaxable += input.rebateDealer;
      taxableVehicleBase = Math.max(0, taxableVehicleBase - input.rebateDealer);
      notes.push(
        `Dealer rebate (non-taxable, reduces base): $${input.rebateDealer.toFixed(2)}`
      );
    }
  }

  // 6. Calculate taxable fees (using interpreter)
  const taxableDocFee = isDocFeeTaxable("RETAIL", rules) ? input.docFee : 0;
  const taxableFees: { code: string; amount: number }[] = [];

  for (const fee of input.otherFees) {
    if (isFeeTaxable(fee.code, "RETAIL", rules)) {
      taxableFees.push(fee);
    }
  }

  const feesBase =
    taxableDocFee + taxableFees.reduce((sum, f) => sum + f.amount, 0);
  notes.push(`Taxable doc fee: $${taxableDocFee.toFixed(2)}`);
  notes.push(
    `Other taxable fees: $${taxableFees.reduce((sum, f) => sum + f.amount, 0).toFixed(2)}`
  );

  // 7. Calculate taxable products (F&I)
  const taxableServiceContracts = rules.taxOnServiceContracts
    ? input.serviceContracts
    : 0;
  const taxableGap = rules.taxOnGap ? input.gap : 0;
  const productsBase = taxableServiceContracts + taxableGap;
  notes.push(
    `Taxable service contracts: $${taxableServiceContracts.toFixed(2)}`
  );
  notes.push(`Taxable GAP: $${taxableGap.toFixed(2)}`);

  // 8. Build final bases
  const bases: TaxBaseBreakdown = {
    vehicleBase: Math.max(0, taxableVehicleBase),
    feesBase,
    productsBase,
    totalTaxableBase:
      Math.max(0, taxableVehicleBase) + feesBase + productsBase,
  };

  notes.push(`Total taxable base: $${bases.totalTaxableBase.toFixed(2)}`);

  // 9. Interpret vehicle tax scheme and apply tax rates
  const { effectiveRates, notes: schemeNotes } = interpretVehicleTaxScheme(
    rules.vehicleTaxScheme,
    input.rates,
    rules
  );
  notes.push(...schemeNotes);

  const baseTaxes = applyTaxRates(bases.totalTaxableBase, effectiveRates);
  notes.push(`Base tax (before reciprocity): $${baseTaxes.totalTax.toFixed(2)}`);

  // 10. Apply reciprocity credit (cross-state tax credit)
  const { finalTax, reciprocityCredit } = applyReciprocity(
    baseTaxes.totalTax,
    input,
    rules,
    notes
  );

  // Adjust component taxes proportionally if reciprocity was applied
  const taxScale = baseTaxes.totalTax === 0 ? 0 : finalTax / baseTaxes.totalTax;
  const adjustedComponentTaxes = baseTaxes.componentTaxes.map((c) => ({
    ...c,
    amount: c.amount * taxScale,
  }));

  const taxes: TaxAmountBreakdown = {
    componentTaxes: adjustedComponentTaxes,
    totalTax: finalTax,
  };

  notes.push(`Final tax (after reciprocity): $${taxes.totalTax.toFixed(2)}`);

  // 11. Build debug info
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

  return {
    mode: "RETAIL",
    bases,
    taxes,
    debug,
  };
}

/**
 * LEASE TAX CALCULATION
 */
function calculateLeaseTax(
  input: TaxCalculationInput & LeaseFields,
  rules: TaxRulesConfig
): TaxCalculationResult {
  const notes: string[] = [];
  let appliedTradeIn = 0;
  let appliedRebatesNonTaxable = 0;
  let appliedRebatesTaxable = 0;

  // Lease-specific rules
  const leaseRules = rules.leaseRules;
  notes.push(`Lease method: ${leaseRules.method}`);

  // 1. Start with gross cap cost
  let leaseTaxableBase = input.grossCapCost;
  notes.push(`Gross cap cost: $${input.grossCapCost.toFixed(2)}`);

  // 2. Handle trade-in credit on leases
  switch (leaseRules.tradeInCredit) {
    case "NONE":
      appliedTradeIn = 0;
      notes.push("Lease: No trade-in credit");
      break;
    case "FULL":
      appliedTradeIn = input.capReductionTradeIn || input.tradeInValue;
      leaseTaxableBase = Math.max(0, leaseTaxableBase - appliedTradeIn);
      notes.push(`Lease trade-in credit (full): $${appliedTradeIn.toFixed(2)}`);
      break;
    case "CAP_COST_ONLY":
      appliedTradeIn = input.capReductionTradeIn || input.tradeInValue;
      leaseTaxableBase = Math.max(0, leaseTaxableBase - appliedTradeIn);
      notes.push(
        `Lease trade-in (reduces cap cost only): $${appliedTradeIn.toFixed(2)}`
      );
      break;
    case "APPLIED_TO_PAYMENT":
      appliedTradeIn = input.capReductionTradeIn || input.tradeInValue;
      notes.push(
        `Lease trade-in (applied to payment): $${appliedTradeIn.toFixed(2)}`
      );
      break;
    case "FOLLOW_RETAIL_RULE":
      // Apply same logic as retail trade-in policy
      switch (rules.tradeInPolicy.type) {
        case "NONE":
          appliedTradeIn = 0;
          break;
        case "FULL":
          appliedTradeIn = input.capReductionTradeIn || input.tradeInValue;
          leaseTaxableBase = Math.max(0, leaseTaxableBase - appliedTradeIn);
          break;
        case "CAPPED":
          appliedTradeIn = Math.min(
            input.capReductionTradeIn || input.tradeInValue,
            rules.tradeInPolicy.capAmount
          );
          leaseTaxableBase = Math.max(0, leaseTaxableBase - appliedTradeIn);
          break;
        case "PERCENT":
          appliedTradeIn =
            (input.capReductionTradeIn || input.tradeInValue) *
            rules.tradeInPolicy.percent;
          leaseTaxableBase = Math.max(0, leaseTaxableBase - appliedTradeIn);
          break;
      }
      notes.push(
        `Lease trade-in (following retail rule): $${appliedTradeIn.toFixed(2)}`
      );
      break;
  }

  // 3. Handle rebates on leases
  if (leaseRules.rebateBehavior === "FOLLOW_RETAIL_RULE") {
    for (const rebateRule of rules.rebates) {
      if (
        rebateRule.appliesTo === "MANUFACTURER" ||
        rebateRule.appliesTo === "ANY"
      ) {
        const rebateAmount =
          input.capReductionRebateManufacturer || input.rebateManufacturer;
        if (rebateRule.taxable) {
          appliedRebatesTaxable += rebateAmount;
        } else {
          appliedRebatesNonTaxable += rebateAmount;
          leaseTaxableBase = Math.max(0, leaseTaxableBase - rebateAmount);
        }
      }
      if (
        rebateRule.appliesTo === "DEALER" ||
        rebateRule.appliesTo === "ANY"
      ) {
        const rebateAmount = input.capReductionRebateDealer || input.rebateDealer;
        if (rebateRule.taxable) {
          appliedRebatesTaxable += rebateAmount;
        } else {
          appliedRebatesNonTaxable += rebateAmount;
          leaseTaxableBase = Math.max(0, leaseTaxableBase - rebateAmount);
        }
      }
    }
  } else if (leaseRules.rebateBehavior === "ALWAYS_TAXABLE") {
    appliedRebatesTaxable +=
      (input.capReductionRebateManufacturer || input.rebateManufacturer) +
      (input.capReductionRebateDealer || input.rebateDealer);
    notes.push("Lease rebates: Always taxable");
  } else {
    appliedRebatesNonTaxable +=
      (input.capReductionRebateManufacturer || input.rebateManufacturer) +
      (input.capReductionRebateDealer || input.rebateDealer);
    leaseTaxableBase = Math.max(0, leaseTaxableBase - appliedRebatesNonTaxable);
    notes.push("Lease rebates: Non-taxable");
  }

  // 4. Handle negative equity on leases
  if (leaseRules.negativeEquityTaxable && input.negativeEquity > 0) {
    leaseTaxableBase += input.negativeEquity;
    notes.push(`Lease negative equity (taxable): $${input.negativeEquity.toFixed(2)}`);
  }

  // 5. Calculate upfront taxable fees (doc fee + other fees)
  let taxableDocFee = 0;
  switch (leaseRules.docFeeTaxability) {
    case "ALWAYS":
      taxableDocFee = input.docFee;
      break;
    case "FOLLOW_RETAIL_RULE":
      taxableDocFee = rules.docFeeTaxable ? input.docFee : 0;
      break;
    case "NEVER":
      taxableDocFee = 0;
      break;
    case "ONLY_UPFRONT":
      taxableDocFee = input.docFee;
      break;
  }

  const taxableFees: { code: string; amount: number }[] = [];
  let upfrontFeeBase = taxableDocFee;

  for (const fee of input.otherFees) {
    const feeRule = leaseRules.feeTaxRules.find((r) => r.code === fee.code);
    const titleFeeRule = leaseRules.titleFeeRules.find((r) => r.code === fee.code);

    if (feeRule?.taxable || titleFeeRule?.taxable) {
      if (titleFeeRule?.includedInUpfront || !titleFeeRule) {
        taxableFees.push(fee);
        upfrontFeeBase += fee.amount;
      }
    }
  }

  notes.push(`Lease upfront taxable fees: $${upfrontFeeBase.toFixed(2)}`);

  // 6. Handle products (service contracts, GAP) on leases
  const taxableServiceContracts =
    leaseRules.feeTaxRules.find((r) => r.code === "SERVICE_CONTRACT")?.taxable
      ? input.serviceContracts
      : 0;
  const taxableGap =
    leaseRules.feeTaxRules.find((r) => r.code === "GAP")?.taxable
      ? input.gap
      : 0;

  // 6.5. Apply lease special scheme interpreter
  const leaseSchemeAdjustment = interpretLeaseSpecialScheme(
    leaseRules.specialScheme,
    input.grossCapCost,
    input.basePayment,
    input.paymentCount,
    rules
  );
  notes.push(...leaseSchemeAdjustment.notes);

  // Apply scheme adjustments
  const upfrontBaseWithScheme = upfrontFeeBase + leaseSchemeAdjustment.upfrontBaseAdjustment;
  const monthlyBaseWithScheme = leaseSchemeAdjustment.monthlyBaseAdjustment;

  // Add special fees to upfront fees
  for (const specialFee of leaseSchemeAdjustment.specialFees) {
    upfrontFeeBase += specialFee.amount;
    notes.push(`Special fee (${specialFee.code}): $${specialFee.amount.toFixed(2)}`);
  }

  // 7. Calculate lease tax based on method
  let leaseBreakdown: LeaseTaxBreakdown;

  switch (leaseRules.method) {
    case "MONTHLY":
      // Tax on each payment
      leaseBreakdown = calculateMonthlyLeaseTax(
        input,
        leaseTaxableBase,
        upfrontFeeBase,
        taxableServiceContracts,
        taxableGap,
        notes
      );
      break;

    case "FULL_UPFRONT":
      // Tax whole base upfront
      leaseBreakdown = calculateUpfrontLeaseTax(
        input,
        leaseTaxableBase,
        upfrontFeeBase,
        taxableServiceContracts,
        taxableGap,
        notes
      );
      break;

    case "HYBRID":
      // Partial upfront + monthly
      leaseBreakdown = calculateHybridLeaseTax(
        input,
        leaseTaxableBase,
        upfrontFeeBase,
        taxableServiceContracts,
        taxableGap,
        notes
      );
      break;

    default:
      // Default to monthly if unknown method
      leaseBreakdown = calculateMonthlyLeaseTax(
        input,
        leaseTaxableBase,
        upfrontFeeBase,
        taxableServiceContracts,
        taxableGap,
        notes
      );
      break;
  }

  // 8. Build bases
  const bases: TaxBaseBreakdown = {
    vehicleBase: leaseTaxableBase,
    feesBase: upfrontFeeBase,
    productsBase: taxableServiceContracts + taxableGap,
    totalTaxableBase:
      leaseTaxableBase + upfrontFeeBase + taxableServiceContracts + taxableGap,
  };

  // 9. Apply reciprocity (typically to upfront taxes for leases)
  const { finalTax: finalUpfrontTax, reciprocityCredit } = applyReciprocity(
    leaseBreakdown.upfrontTaxes.totalTax,
    input,
    rules,
    notes
  );

  // Adjust upfront taxes if reciprocity was applied
  const upfrontTaxScale =
    leaseBreakdown.upfrontTaxes.totalTax === 0
      ? 0
      : finalUpfrontTax / leaseBreakdown.upfrontTaxes.totalTax;
  const adjustedUpfrontComponentTaxes = leaseBreakdown.upfrontTaxes.componentTaxes.map(
    (c) => ({
      ...c,
      amount: c.amount * upfrontTaxScale,
    })
  );

  const adjustedUpfrontTaxes: TaxAmountBreakdown = {
    componentTaxes: adjustedUpfrontComponentTaxes,
    totalTax: finalUpfrontTax,
  };

  // Recalculate total tax over term with adjusted upfront
  const adjustedTotalTaxOverTerm =
    adjustedUpfrontTaxes.totalTax +
    leaseBreakdown.paymentTaxesPerPeriod.totalTax *
      (input as TaxCalculationInput & LeaseFields).paymentCount;

  const adjustedLeaseBreakdown: LeaseTaxBreakdown = {
    ...leaseBreakdown,
    upfrontTaxes: adjustedUpfrontTaxes,
    totalTaxOverTerm: adjustedTotalTaxOverTerm,
  };

  // 10. Build debug info
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

  return {
    mode: "LEASE",
    bases,
    taxes: adjustedUpfrontTaxes,
    leaseBreakdown: adjustedLeaseBreakdown,
    debug,
  };
}

/**
 * MONTHLY LEASE TAX (Indiana-style)
 */
function calculateMonthlyLeaseTax(
  input: TaxCalculationInput & LeaseFields,
  leaseTaxableBase: number,
  upfrontFeeBase: number,
  taxableServiceContracts: number,
  taxableGap: number,
  notes: string[]
): LeaseTaxBreakdown {
  // Upfront tax (fees only)
  const upfrontTaxableBase = upfrontFeeBase;
  const upfrontTaxes = applyTaxRates(upfrontTaxableBase, input.rates);
  notes.push(`Upfront tax (fees only): $${upfrontTaxes.totalTax.toFixed(2)}`);

  // Monthly tax (on payment)
  const paymentTaxableBasePerPeriod = input.basePayment;
  const paymentTaxesPerPeriod = applyTaxRates(
    paymentTaxableBasePerPeriod,
    input.rates
  );
  notes.push(
    `Tax per payment: $${paymentTaxesPerPeriod.totalTax.toFixed(2)} (on base payment $${input.basePayment.toFixed(2)})`
  );

  const totalTaxOverTerm =
    upfrontTaxes.totalTax +
    paymentTaxesPerPeriod.totalTax * input.paymentCount;
  notes.push(
    `Total lease tax over term: $${totalTaxOverTerm.toFixed(2)} (${input.paymentCount} payments)`
  );

  return {
    upfrontTaxableBase,
    upfrontTaxes,
    paymentTaxableBasePerPeriod,
    paymentTaxesPerPeriod,
    totalTaxOverTerm,
  };
}

/**
 * FULL UPFRONT LEASE TAX (NY/NJ-style)
 */
function calculateUpfrontLeaseTax(
  input: TaxCalculationInput & LeaseFields,
  leaseTaxableBase: number,
  upfrontFeeBase: number,
  taxableServiceContracts: number,
  taxableGap: number,
  notes: string[]
): LeaseTaxBreakdown {
  // Tax whole base upfront
  const totalUpfrontBase =
    leaseTaxableBase +
    upfrontFeeBase +
    taxableServiceContracts +
    taxableGap;
  const upfrontTaxes = applyTaxRates(totalUpfrontBase, input.rates);
  notes.push(
    `Upfront tax (full): $${upfrontTaxes.totalTax.toFixed(2)} on base $${totalUpfrontBase.toFixed(2)}`
  );

  return {
    upfrontTaxableBase: totalUpfrontBase,
    upfrontTaxes,
    paymentTaxableBasePerPeriod: 0,
    paymentTaxesPerPeriod: { componentTaxes: [], totalTax: 0 },
    totalTaxOverTerm: upfrontTaxes.totalTax,
  };
}

/**
 * HYBRID LEASE TAX (Partial upfront + monthly)
 */
function calculateHybridLeaseTax(
  input: TaxCalculationInput & LeaseFields,
  leaseTaxableBase: number,
  upfrontFeeBase: number,
  taxableServiceContracts: number,
  taxableGap: number,
  notes: string[]
): LeaseTaxBreakdown {
  // Split: fees + products upfront, payments monthly
  const upfrontTaxableBase =
    upfrontFeeBase + taxableServiceContracts + taxableGap;
  const upfrontTaxes = applyTaxRates(upfrontTaxableBase, input.rates);
  notes.push(
    `Hybrid upfront tax: $${upfrontTaxes.totalTax.toFixed(2)} on fees/products`
  );

  const paymentTaxableBasePerPeriod = input.basePayment;
  const paymentTaxesPerPeriod = applyTaxRates(
    paymentTaxableBasePerPeriod,
    input.rates
  );
  notes.push(
    `Hybrid monthly tax: $${paymentTaxesPerPeriod.totalTax.toFixed(2)} per payment`
  );

  const totalTaxOverTerm =
    upfrontTaxes.totalTax +
    paymentTaxesPerPeriod.totalTax * input.paymentCount;

  return {
    upfrontTaxableBase,
    upfrontTaxes,
    paymentTaxableBasePerPeriod,
    paymentTaxesPerPeriod,
    totalTaxOverTerm,
  };
}
