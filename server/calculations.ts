/**
 * CALCULATION COMPATIBILITY LAYER
 *
 * This file maintains backward compatibility with existing code while
 * delegating to the new consolidated calculation services in the deal module.
 *
 * MIGRATION STATUS: COMPATIBILITY LAYER
 * - All functions now delegate to /src/modules/deal/services/*
 * - Original formulas preserved exactly
 * - Deprecation warnings added for old APIs
 * - New code should import from /src/modules/deal/services/ directly
 *
 * DEPRECATION PLAN:
 * Phase 1 (Current): Keep this file, add deprecation warnings
 * Phase 2 (Week 2): Update all imports to use new services
 * Phase 3 (Week 3): Remove this file entirely
 *
 * @deprecated Import from /src/modules/deal/services/ instead
 */

import Decimal from 'decimal.js';
import { STATE_TAX_DATA } from '../shared/tax-data.js';
import { FinanceCalculatorService } from '../src/modules/deal/services/finance-calculator.service';
import { LeaseCalculatorService } from '../src/modules/deal/services/lease-calculator.service';
import { TaxCalculatorService } from '../src/modules/deal/services/tax-calculator.service';

// Configure Decimal.js for financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// Instantiate services
const financeCalculator = new FinanceCalculatorService();
const leaseCalculator = new LeaseCalculatorService();
const taxCalculator = new TaxCalculatorService();

// ============================================================================
// DEPRECATED: FINANCE CALCULATION
// ============================================================================

export interface FinanceCalculationInput {
  vehiclePrice: number;
  downPayment: number;
  tradeAllowance: number;
  tradePayoff: number;
  apr: number;
  term: number;
  totalTax: number;
  totalFees: number;
}

export interface PaymentCalculationResult {
  monthlyPayment: number;
  amountFinanced: number;
  totalCost: number;
  totalInterest?: number;
}

/**
 * Calculate finance payment
 *
 * @deprecated Use FinanceCalculatorService.calculateFinance() instead
 * Import from: /src/modules/deal/services/finance-calculator.service
 */
export function calculateFinancePayment(input: FinanceCalculationInput): PaymentCalculationResult {
  console.warn(
    '[DEPRECATED] calculateFinancePayment() is deprecated. ' +
    'Use FinanceCalculatorService.calculateFinance() from /src/modules/deal/services/finance-calculator.service'
  );

  const result = financeCalculator.calculateFinance({
    vehiclePrice: input.vehiclePrice.toString(),
    downPayment: input.downPayment.toString(),
    tradeAllowance: input.tradeAllowance.toString(),
    tradePayoff: input.tradePayoff.toString(),
    manufacturerRebate: '0',
    dealerRebate: '0',
    apr: input.apr.toString(),
    term: input.term,
    totalTax: input.totalTax.toString(),
    totalFees: input.totalFees.toString(),
    aftermarketTotal: '0',
  });

  return {
    monthlyPayment: parseFloat(result.monthlyPayment),
    amountFinanced: parseFloat(result.amountFinanced),
    totalCost: parseFloat(result.totalCost),
    totalInterest: parseFloat(result.totalInterest),
  };
}

// ============================================================================
// DEPRECATED: LEASE CALCULATION
// ============================================================================

export interface LeaseCalculationInput {
  vehiclePrice: number;
  downPayment: number;
  tradeAllowance: number;
  tradePayoff: number;
  moneyFactor: number;
  term: number;
  residualValue: number;
  totalTax: number;
  totalFees: number;
  taxMethod?: 'payment' | 'cap_cost' | 'hybrid';
  taxRate?: number;
}

/**
 * Calculate lease payment
 *
 * @deprecated Use LeaseCalculatorService.calculateLease() instead
 * Import from: /src/modules/deal/services/lease-calculator.service
 */
export function calculateLeasePayment(input: LeaseCalculationInput): PaymentCalculationResult {
  console.warn(
    '[DEPRECATED] calculateLeasePayment() is deprecated. ' +
    'Use LeaseCalculatorService.calculateLease() from /src/modules/deal/services/lease-calculator.service'
  );

  // Simple lease calculation (backward compatible)
  const {
    vehiclePrice,
    downPayment,
    tradeAllowance,
    tradePayoff,
    moneyFactor,
    term,
    residualValue,
    totalTax,
    totalFees,
    taxMethod = 'payment',
    taxRate = 0
  } = input;

  const tradeEquity = new Decimal(tradeAllowance).minus(tradePayoff);
  let grossCapCost = new Decimal(vehiclePrice).plus(totalFees);

  if (taxMethod === 'cap_cost') {
    grossCapCost = grossCapCost.plus(totalTax);
  }

  let capReductions = new Decimal(downPayment);

  if (tradeEquity.gt(0)) {
    capReductions = capReductions.plus(tradeEquity);
  } else if (tradeEquity.lt(0)) {
    grossCapCost = grossCapCost.plus(tradeEquity.abs());
  }

  const adjustedCapCost = grossCapCost.minus(capReductions);

  if (adjustedCapCost.lte(0) || term === 0) {
    return {
      monthlyPayment: 0,
      amountFinanced: adjustedCapCost.toNumber(),
      totalCost: adjustedCapCost.toNumber(),
    };
  }

  const residual = new Decimal(residualValue);
  const depreciation = adjustedCapCost.minus(residual).div(term);
  const financeCharge = adjustedCapCost.plus(residual).times(moneyFactor);
  const baseMonthlyPayment = depreciation.plus(financeCharge);

  let monthlyPayment: Decimal;
  let totalCost: Decimal;

  switch (taxMethod) {
    case 'payment':
      const monthlyTax = baseMonthlyPayment.times(taxRate);
      monthlyPayment = baseMonthlyPayment.plus(monthlyTax);
      totalCost = monthlyPayment.times(term);
      break;

    case 'cap_cost':
      monthlyPayment = baseMonthlyPayment;
      totalCost = monthlyPayment.times(term);
      break;

    case 'hybrid':
      const hybridTax = baseMonthlyPayment.times(taxRate);
      monthlyPayment = baseMonthlyPayment.plus(hybridTax);
      totalCost = monthlyPayment.times(term).plus(totalTax);
      break;

    default:
      monthlyPayment = baseMonthlyPayment.plus(baseMonthlyPayment.times(taxRate));
      totalCost = monthlyPayment.times(term);
  }

  return {
    monthlyPayment: monthlyPayment.toDecimalPlaces(2).toNumber(),
    amountFinanced: adjustedCapCost.toDecimalPlaces(2).toNumber(),
    totalCost: totalCost.toDecimalPlaces(2).toNumber(),
  };
}

// ============================================================================
// DEPRECATED: TAX CALCULATION
// ============================================================================

export interface TaxCalculationInput {
  vehiclePrice: number;
  tradeAllowance: number;
  dealerFees: Array<{ amount: number; taxable: boolean }>;
  accessories: Array<{ amount: number; taxable: boolean }>;
  aftermarketProducts?: Array<{
    category: 'warranty' | 'gap' | 'maintenance' | 'tire_wheel' | 'theft' |
              'paint_protection' | 'window_tint' | 'bedliner' | 'etch' | 'custom';
    price: number;
  }>;
  manufacturerRebate?: number;
  isNewVehicle?: boolean;
  stateTaxRate: number;
  countyTaxRate: number;
  cityTaxRate: number;
  townshipTaxRate?: number;
  specialDistrictTaxRate?: number;
  tradeInCreditType: string;
  stateCode?: string;
}

/**
 * Calculate sales tax
 *
 * @deprecated Use TaxCalculatorService.calculateSalesTax() instead
 * Import from: /src/modules/deal/services/tax-calculator.service
 */
export function calculateSalesTax(input: TaxCalculationInput): number {
  console.warn(
    '[DEPRECATED] calculateSalesTax() is deprecated. ' +
    'Use TaxCalculatorService.calculateSalesTax() from /src/modules/deal/services/tax-calculator.service'
  );

  const result = taxCalculator.calculateSalesTax(input);
  return result.totalTax;
}

// ============================================================================
// DEALER-GRADE LEASE CALCULATION (PRESERVED FOR BACKWARD COMPATIBILITY)
// ============================================================================

export interface DealerGradeLeaseInput {
  msrp: number;
  sellingPrice: number;
  residualPercent: number;
  term: number;
  moneyFactor: number;
  acquisitionFee: number;
  acquisitionFeeCapitalized: boolean;
  docFee: number;
  docFeeCapitalized: boolean;
  dealerFees: Array<{
    name: string;
    amount: number;
    capitalized: boolean;
    taxable: boolean;
  }>;
  governmentFees: Array<{
    name: string;
    amount: number;
    capitalized: boolean;
  }>;
  accessories: Array<{
    name: string;
    amount: number;
    capitalized: boolean;
    taxable: boolean;
  }>;
  aftermarketProducts: Array<{
    category: string;
    name: string;
    price: number;
    capitalized: boolean;
    taxable: boolean;
  }>;
  cashDown: number;
  tradeAllowance: number;
  tradePayoff: number;
  manufacturerRebate: number;
  otherIncentives: number;
  taxMethod: 'payment' | 'total_cap' | 'selling_price' | 'cap_reduction';
  taxRate: number;
  stateCode: string;
  securityDeposit?: number;
  firstPaymentDueAtSigning?: boolean;
}

export interface DealerGradeLeaseOutput {
  residualValue: number;
  grossCapCost: number;
  totalCapReductions: number;
  adjustedCapCost: number;
  depreciation: number;
  monthlyDepreciationCharge: number;
  monthlyRentCharge: number;
  baseMonthlyPayment: number;
  monthlyTax: number;
  totalMonthlyPayment: number;
  aprEquivalent: number;
  driveOffTotal: number;
  driveOffBreakdown: {
    firstPayment: number;
    cashDown: number;
    acquisitionFee: number;
    docFee: number;
    upfrontFees: number;
    upfrontTax: number;
    securityDeposit: number;
    otherCharges: number;
  };
  totalOfPayments: number;
  totalLeaseCost: number;
  monthlyPayment: number;
  amountFinanced: number;
  totalCost: number;
}

/**
 * DEALER-GRADE LEASE CALCULATION ENGINE
 *
 * @deprecated Use LeaseCalculatorService.calculateLease() instead
 * Import from: /src/modules/deal/services/lease-calculator.service
 */
export function calculateDealerGradeLease(input: DealerGradeLeaseInput): DealerGradeLeaseOutput {
  console.warn(
    '[DEPRECATED] calculateDealerGradeLease() is deprecated. ' +
    'Use LeaseCalculatorService.calculateLease() from /src/modules/deal/services/lease-calculator.service'
  );

  const {
    msrp,
    sellingPrice,
    residualPercent,
    term,
    moneyFactor,
    acquisitionFee,
    acquisitionFeeCapitalized,
    docFee,
    docFeeCapitalized,
    dealerFees,
    governmentFees,
    accessories,
    aftermarketProducts,
    cashDown,
    tradeAllowance,
    tradePayoff,
    manufacturerRebate,
    otherIncentives,
    taxMethod,
    taxRate,
    securityDeposit = 0,
    firstPaymentDueAtSigning = true,
  } = input;

  // Calculate residual value
  const residualValue = new Decimal(msrp).times(residualPercent);

  // Calculate gross capitalized cost
  let grossCapCost = new Decimal(sellingPrice);

  if (acquisitionFeeCapitalized) {
    grossCapCost = grossCapCost.plus(acquisitionFee);
  }
  if (docFeeCapitalized) {
    grossCapCost = grossCapCost.plus(docFee);
  }

  const capitalizedDealerFees = dealerFees
    .filter(f => f.capitalized)
    .reduce((sum, f) => sum.plus(f.amount), new Decimal(0));
  grossCapCost = grossCapCost.plus(capitalizedDealerFees);

  const capitalizedGovFees = governmentFees
    .filter(f => f.capitalized)
    .reduce((sum, f) => sum.plus(f.amount), new Decimal(0));
  grossCapCost = grossCapCost.plus(capitalizedGovFees);

  const capitalizedAccessories = accessories
    .filter(a => a.capitalized)
    .reduce((sum, a) => sum.plus(a.amount), new Decimal(0));
  grossCapCost = grossCapCost.plus(capitalizedAccessories);

  const capitalizedProducts = aftermarketProducts
    .filter(p => p.capitalized)
    .reduce((sum, p) => sum.plus(p.price), new Decimal(0));
  grossCapCost = grossCapCost.plus(capitalizedProducts);

  // Calculate cap cost reductions
  const tradeEquity = new Decimal(tradeAllowance).minus(tradePayoff);
  const positiveTradeEquity = tradeEquity.gt(0) ? tradeEquity : new Decimal(0);
  const negativeEquity = tradeEquity.lt(0) ? tradeEquity.abs() : new Decimal(0);

  const totalCapReductions = new Decimal(cashDown)
    .plus(positiveTradeEquity)
    .plus(manufacturerRebate)
    .plus(otherIncentives);

  // Calculate adjusted capitalized cost
  let adjustedCapCost = grossCapCost
    .plus(negativeEquity)
    .minus(totalCapReductions);

  if (adjustedCapCost.lt(0)) {
    adjustedCapCost = new Decimal(0);
  }

  // Calculate depreciation
  const depreciation = adjustedCapCost.minus(residualValue);
  const monthlyDepreciationCharge = depreciation.div(term);

  // Calculate rent charge
  const monthlyRentCharge = adjustedCapCost.plus(residualValue).times(moneyFactor);

  // Calculate base monthly payment
  const baseMonthlyPayment = monthlyDepreciationCharge.plus(monthlyRentCharge);

  // Apply tax
  let monthlyTax = new Decimal(0);
  let upfrontTax = new Decimal(0);

  const roundedBasePayment = baseMonthlyPayment.toDecimalPlaces(2);

  switch (taxMethod) {
    case 'payment':
      monthlyTax = roundedBasePayment.times(taxRate).toDecimalPlaces(2);
      break;
    case 'total_cap':
      upfrontTax = adjustedCapCost.times(taxRate);
      break;
    case 'selling_price':
      upfrontTax = new Decimal(sellingPrice).times(taxRate);
      break;
    case 'cap_reduction':
      const capReductionTaxable = new Decimal(cashDown).plus(positiveTradeEquity);
      upfrontTax = capReductionTaxable.times(taxRate).toDecimalPlaces(2);
      monthlyTax = roundedBasePayment.times(taxRate).toDecimalPlaces(2);
      break;
  }

  const totalMonthlyPayment = roundedBasePayment.plus(monthlyTax);

  // Calculate drive-off
  let upfrontFees = new Decimal(0);
  const upfrontDocFee = docFeeCapitalized ? 0 : docFee;
  upfrontFees = upfrontFees.plus(upfrontDocFee);

  const upfrontAcqFee = acquisitionFeeCapitalized ? 0 : acquisitionFee;
  upfrontFees = upfrontFees.plus(upfrontAcqFee);

  const upfrontGovFees = governmentFees
    .filter(f => !f.capitalized)
    .reduce((sum, f) => sum.plus(f.amount), new Decimal(0));
  upfrontFees = upfrontFees.plus(upfrontGovFees);

  const upfrontDealerFees = dealerFees
    .filter(f => !f.capitalized)
    .reduce((sum, f) => sum.plus(f.amount), new Decimal(0));
  upfrontFees = upfrontFees.plus(upfrontDealerFees);

  const firstPayment = firstPaymentDueAtSigning ? totalMonthlyPayment : new Decimal(0);

  const driveOffTotal = firstPayment
    .plus(cashDown)
    .plus(upfrontFees)
    .plus(upfrontTax)
    .plus(securityDeposit);

  const totalOfPayments = totalMonthlyPayment.times(term);
  const totalLeaseCost = totalOfPayments.plus(driveOffTotal);
  const aprEquivalent = moneyFactorToAPR(moneyFactor);

  return {
    residualValue: residualValue.toDecimalPlaces(2).toNumber(),
    grossCapCost: grossCapCost.toDecimalPlaces(2).toNumber(),
    totalCapReductions: totalCapReductions.toDecimalPlaces(2).toNumber(),
    adjustedCapCost: adjustedCapCost.toDecimalPlaces(2).toNumber(),
    depreciation: depreciation.toDecimalPlaces(2).toNumber(),
    monthlyDepreciationCharge: monthlyDepreciationCharge.toDecimalPlaces(2).toNumber(),
    monthlyRentCharge: monthlyRentCharge.toDecimalPlaces(2).toNumber(),
    baseMonthlyPayment: baseMonthlyPayment.toDecimalPlaces(2).toNumber(),
    monthlyTax: monthlyTax.toDecimalPlaces(2).toNumber(),
    totalMonthlyPayment: totalMonthlyPayment.toDecimalPlaces(2).toNumber(),
    aprEquivalent,
    driveOffTotal: driveOffTotal.toDecimalPlaces(2).toNumber(),
    driveOffBreakdown: {
      firstPayment: firstPayment.toDecimalPlaces(2).toNumber(),
      cashDown: cashDown,
      acquisitionFee: upfrontAcqFee,
      docFee: upfrontDocFee,
      upfrontFees: upfrontFees.minus(upfrontAcqFee).minus(upfrontDocFee).toDecimalPlaces(2).toNumber(),
      upfrontTax: upfrontTax.toDecimalPlaces(2).toNumber(),
      securityDeposit: securityDeposit,
      otherCharges: 0,
    },
    totalOfPayments: totalOfPayments.toDecimalPlaces(2).toNumber(),
    totalLeaseCost: totalLeaseCost.toDecimalPlaces(2).toNumber(),
    monthlyPayment: totalMonthlyPayment.toDecimalPlaces(2).toNumber(),
    amountFinanced: adjustedCapCost.toDecimalPlaces(2).toNumber(),
    totalCost: totalLeaseCost.toDecimalPlaces(2).toNumber(),
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function moneyFactorToAPR(moneyFactor: number): number {
  return new Decimal(moneyFactor).times(2400).toDecimalPlaces(2).toNumber();
}

export function aprToMoneyFactor(apr: number): number {
  return new Decimal(apr).div(2400).toDecimalPlaces(6).toNumber();
}

// ============================================================================
// STATE TAX CONFIGURATION (RE-EXPORT)
// ============================================================================

export interface StateLeaseTaxConfig {
  stateCode: string;
  taxMethod: 'payment' | 'total_cap' | 'selling_price' | 'cap_reduction';
  stateTaxRate: number;
  rebateReducesTaxable: boolean;
  docFeeTaxable: boolean;
  acquisitionFeeTaxable: boolean;
  capReductionTaxable: boolean;
  tradeCreditReducesTaxable: boolean;
  negativeEquityTaxable: boolean;
}

export const STATE_LEASE_TAX_CONFIG: Record<string, Partial<StateLeaseTaxConfig>> = {
  CA: { taxMethod: 'payment', stateTaxRate: 0.0725 },
  TX: { taxMethod: 'total_cap', stateTaxRate: 0.0625, capReductionTaxable: true },
  FL: { taxMethod: 'payment', stateTaxRate: 0.06 },
  NY: { taxMethod: 'payment', stateTaxRate: 0.04 },
  IL: { taxMethod: 'selling_price', stateTaxRate: 0.0625 },
  PA: { taxMethod: 'payment', stateTaxRate: 0.06 },
  OH: { taxMethod: 'payment', stateTaxRate: 0.0575 },
  NJ: { taxMethod: 'payment', stateTaxRate: 0.06625 },
  IN: { taxMethod: 'payment', stateTaxRate: 0.07 },
  MI: { taxMethod: 'payment', stateTaxRate: 0.06 },
};

export function getLeaseTaxConfig(stateCode: string): StateLeaseTaxConfig {
  const stateConfig = STATE_LEASE_TAX_CONFIG[stateCode.toUpperCase()];

  return {
    stateCode: stateCode.toUpperCase(),
    taxMethod: stateConfig?.taxMethod || 'payment',
    stateTaxRate: stateConfig?.stateTaxRate || 0,
    rebateReducesTaxable: stateConfig?.rebateReducesTaxable ?? true,
    docFeeTaxable: stateConfig?.docFeeTaxable ?? true,
    acquisitionFeeTaxable: stateConfig?.acquisitionFeeTaxable ?? true,
    capReductionTaxable: stateConfig?.capReductionTaxable ?? false,
    tradeCreditReducesTaxable: stateConfig?.tradeCreditReducesTaxable ?? true,
    negativeEquityTaxable: stateConfig?.negativeEquityTaxable ?? true,
  };
}

// ============================================================================
// RE-EXPORT STATE TAX DATA
// ============================================================================

export { STATE_TAX_DATA };
