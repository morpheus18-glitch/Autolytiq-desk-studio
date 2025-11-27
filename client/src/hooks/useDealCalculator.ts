/**
 * Deal Calculator Hook
 *
 * TypeScript interface for the Rust WASM deal calculator engine.
 * Provides comprehensive calculations for:
 * - Cash deals
 * - Finance deals (retail installment)
 * - Lease deals
 * - Tax calculations
 *
 * Falls back to pure TypeScript calculations if WASM is unavailable.
 */

import { useState, useCallback, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

export type DealType = 'CASH' | 'FINANCE' | 'LEASE';
export type PaymentFrequency = 'MONTHLY' | 'BI_WEEKLY' | 'WEEKLY';

export interface TradeInInput {
  gross_allowance: number;
  payoff_amount: number;
  payoff_good_through?: string;
  per_diem?: number;
  acv?: number;
  year?: number;
  make?: string;
  model?: string;
  vin?: string;
  mileage?: number;
}

export type RebateType =
  | 'MANUFACTURER'
  | 'DEALER'
  | 'LOYALTY'
  | 'CONQUEST'
  | 'MILITARY'
  | 'COLLEGE'
  | 'OTHER';

export interface RebateInput {
  name: string;
  amount: number;
  rebate_type: RebateType;
  taxable?: boolean;
  apply_to_cap_cost: boolean;
}

export type FIProductCode =
  | 'EXTENDED_WARRANTY'
  | 'SERVICE_CONTRACT'
  | 'GAP_INSURANCE'
  | 'TIRE_WHEEL'
  | 'PAINT_PROTECTION'
  | 'FABRIC_PROTECTION'
  | 'KEY_REPLACEMENT'
  | 'THEFT_PROTECTION'
  | 'MAINTENANCE_PLAN'
  | 'WEAR_CARE'
  | 'DENT_REPAIR'
  | 'WINDSHIELD_PROTECTION'
  | 'OTHER';

export interface FIProductInput {
  name: string;
  code: FIProductCode;
  price: number;
  cost?: number;
  term_months?: number;
  deductible?: number;
  taxable?: boolean;
  finance_with_deal: boolean;
}

export type FeeCode =
  | 'DOC_FEE'
  | 'TITLE_FEE'
  | 'REGISTRATION_FEE'
  | 'LICENSE_FEE'
  | 'PLATE_FEE'
  | 'TEMP_TAG_FEE'
  | 'ELECTRONIC_FILING_FEE'
  | 'NOTARY_FEE'
  | 'LIEN_FEE'
  | 'INSPECTION_FEE'
  | 'EMISSIONS_FEE'
  | 'TIRE_FEE'
  | 'BATTERY_FEE'
  | 'DEALER_PREP_FEE'
  | 'DESTINATION_FEE'
  | 'ACQUISITION_FEE'
  | 'DISPOSITION_FEE'
  | 'SECURITY_DEPOSIT'
  | 'OTHER';

export interface FeeInput {
  name: string;
  code: FeeCode;
  amount: number;
  taxable?: boolean;
  capitalize_in_lease: boolean;
}

export interface FinanceInput {
  apr: number;
  term_months: number;
  first_payment_days?: number;
  payment_frequency: PaymentFrequency;
  lender_name?: string;
  lender_fees?: number;
  buy_rate?: number;
  cap_rate?: number;
}

export interface LeaseInput {
  term_months: number;
  annual_mileage: number;
  excess_mileage_rate: number;
  residual_percent: number;
  residual_value?: number;
  money_factor: number;
  buy_rate_mf?: number;
  security_deposit: number;
  security_deposit_waived: boolean;
  msd_count?: number;
  msd_rate_reduction?: number;
  first_payment_due_at_signing: boolean;
  acquisition_fee: number;
  acquisition_fee_cap: boolean;
  disposition_fee: number;
  disposition_fee_waived: boolean;
  sign_and_drive: boolean;
  one_pay_lease: boolean;
}

export interface DealInput {
  deal_type: DealType;
  state_code: string;
  local_jurisdiction?: string;
  vehicle_msrp: number;
  vehicle_invoice?: number;
  selling_price: number;
  trade_in?: TradeInInput;
  rebates: RebateInput[];
  cash_down: number;
  fi_products: FIProductInput[];
  fees: FeeInput[];
  finance_input?: FinanceInput;
  lease_input?: LeaseInput;
}

export interface PriceBreakdown {
  vehicle_msrp: number;
  vehicle_invoice?: number;
  selling_price: number;
  trade_allowance: number;
  trade_payoff: number;
  net_trade: number;
  total_rebates: number;
  taxable_rebates: number;
  non_taxable_rebates: number;
  total_fi_products: number;
  financed_fi_products: number;
  cash_fi_products: number;
  total_fees: number;
  taxable_fees: number;
  non_taxable_fees: number;
  capitalized_fees: number;
  cash_down: number;
  gross_cap_cost?: number;
  cap_cost_reduction?: number;
  adjusted_cap_cost?: number;
  residual_value?: number;
}

export interface TaxBreakdown {
  taxable_amount: number;
  state_tax_rate: number;
  local_tax_rate: number;
  combined_rate: number;
  state_tax: number;
  local_tax: number;
  total_tax: number;
  upfront_tax: number;
  monthly_tax: number;
  title_tax?: number;
  luxury_tax?: number;
  special_tax?: number;
  tax_on_vehicle: number;
  tax_on_fees: number;
  tax_on_fi_products: number;
}

export interface PaymentInfo {
  payment: number;
  payment_with_tax: number;
  term_months: number;
  payment_frequency: PaymentFrequency;
  apr?: number;
  total_of_payments?: number;
  total_interest?: number;
  finance_charge?: number;
  money_factor?: number;
  equivalent_apr?: number;
  depreciation?: number;
  rent_charge?: number;
  monthly_depreciation?: number;
  monthly_rent_charge?: number;
  due_at_signing: number;
  first_payment: number;
  security_deposit: number;
  upfront_taxes: number;
  upfront_fees: number;
}

export interface ProfitAnalysis {
  front_end_gross: number;
  back_end_gross: number;
  total_gross: number;
  vehicle_gross: number;
  holdback?: number;
  pack?: number;
  fi_gross: number;
  reserve: number;
  trade_acv?: number;
  trade_over_allow?: number;
}

export interface DealTotals {
  amount_financed: number;
  total_sale_price: number;
  total_due: number;
  balance_due: number;
  total_drive_off: number;
  amount_financed_tila: number;
  finance_charge_tila: number;
  total_of_payments_tila: number;
  total_sale_price_tila: number;
}

export interface PaymentScenario {
  term_months: number;
  rate: number;
  payment: number;
  total_interest: number;
  total_cost: number;
}

export interface PaymentMatrix {
  scenarios: PaymentScenario[];
}

export interface DealResult {
  deal_type: DealType;
  is_valid: boolean;
  validation_errors: string[];
  price_breakdown: PriceBreakdown;
  tax_breakdown: TaxBreakdown;
  payment_info: PaymentInfo;
  profit_analysis: ProfitAnalysis;
  totals: DealTotals;
  payment_matrix?: PaymentMatrix;
}

export interface AmortizationPayment {
  payment_number: number;
  payment_date: string;
  beginning_balance: number;
  scheduled_payment: number;
  principal: number;
  interest: number;
  ending_balance: number;
  cumulative_interest: number;
  cumulative_principal: number;
}

export interface AmortizationSchedule {
  payments: AmortizationPayment[];
  summary: {
    total_payments: number;
    total_principal: number;
    total_interest: number;
    average_payment: number;
  };
}

// ============================================================================
// Pure TypeScript Calculations (Fallback)
// ============================================================================

/**
 * Calculate monthly payment using standard amortization formula
 */
export function calculatePayment(principal: number, apr: number, termMonths: number): number {
  if (principal <= 0 || termMonths === 0) return 0;
  if (apr <= 0) return Math.round((principal / termMonths) * 100) / 100;

  const monthlyRate = apr / 100 / 12;
  const n = termMonths;
  const numerator = monthlyRate * Math.pow(1 + monthlyRate, n);
  const denominator = Math.pow(1 + monthlyRate, n) - 1;

  if (Math.abs(denominator) < Number.EPSILON) {
    return Math.round((principal / n) * 100) / 100;
  }

  return Math.round(principal * (numerator / denominator) * 100) / 100;
}

/**
 * Calculate total interest
 */
export function calculateTotalInterest(
  principal: number,
  payment: number,
  termMonths: number
): number {
  return Math.max(0, payment * termMonths - principal);
}

/**
 * Convert money factor to APR
 */
export function moneyFactorToApr(moneyFactor: number): number {
  return moneyFactor * 2400;
}

/**
 * Convert APR to money factor
 */
export function aprToMoneyFactor(apr: number): number {
  return apr / 2400;
}

/**
 * Calculate lease payment
 */
export function calculateLeasePayment(
  adjustedCapCost: number,
  residualValue: number,
  moneyFactor: number,
  termMonths: number
): { depreciation: number; rentCharge: number; basePayment: number } {
  const depreciation = (adjustedCapCost - residualValue) / termMonths;
  const rentCharge = (adjustedCapCost + residualValue) * moneyFactor;
  const basePayment = Math.round((depreciation + rentCharge) * 100) / 100;

  return {
    depreciation: Math.round(depreciation * 100) / 100,
    rentCharge: Math.round(rentCharge * 100) / 100,
    basePayment,
  };
}

/**
 * Get state tax rate
 */
export function getStateTaxRate(stateCode: string): number {
  const rates: Record<string, number> = {
    AL: 0.06,
    AK: 0,
    AZ: 0.076,
    AR: 0.09,
    CA: 0.0825,
    CO: 0.079,
    CT: 0.0635,
    DE: 0,
    FL: 0.07,
    GA: 0.07,
    HI: 0.045,
    ID: 0.06,
    IL: 0.0875,
    IN: 0.07,
    IA: 0.07,
    KS: 0.095,
    KY: 0.06,
    LA: 0.0945,
    ME: 0.055,
    MD: 0.06,
    MA: 0.0625,
    MI: 0.06,
    MN: 0.07,
    MS: 0.07,
    MO: 0.0823,
    MT: 0,
    NE: 0.075,
    NV: 0.0785,
    NH: 0,
    NJ: 0.06625,
    NM: 0.08125,
    NY: 0.085,
    NC: 0.03,
    ND: 0.07,
    OH: 0.0775,
    OK: 0.09,
    OR: 0,
    PA: 0.08,
    RI: 0.07,
    SC: 0.09,
    SD: 0.065,
    TN: 0.095,
    TX: 0.0825,
    UT: 0.0735,
    VT: 0.07,
    VA: 0.053,
    WA: 0.095,
    WV: 0.06,
    WI: 0.056,
    WY: 0.06,
    DC: 0.06,
  };
  return rates[stateCode] ?? 0.07;
}

/**
 * Generate payment matrix
 */
export function generatePaymentMatrix(
  amountFinanced: number,
  baseApr: number,
  terms: number[] = [36, 48, 60, 72, 84]
): PaymentMatrix {
  const scenarios: PaymentScenario[] = [];

  for (const term of terms) {
    const payment = calculatePayment(amountFinanced, baseApr, term);
    const totalInterest = calculateTotalInterest(amountFinanced, payment, term);

    scenarios.push({
      term_months: term,
      rate: baseApr,
      payment,
      total_interest: Math.round(totalInterest * 100) / 100,
      total_cost: Math.round(payment * term * 100) / 100,
    });
  }

  return { scenarios };
}

// ============================================================================
// Main Hook
// ============================================================================

interface UseDealCalculatorOptions {
  autoCalculate?: boolean;
  debounceMs?: number;
}

export function useDealCalculator(_options: UseDealCalculatorOptions = {}) {
  // Options for future WASM integration
  // const { autoCalculate = true, debounceMs = 300 } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DealResult | null>(null);
  const [wasmAvailable, setWasmAvailable] = useState(false);

  // Check for WASM availability on mount
  useEffect(() => {
    // TODO: Load WASM module when available
    // For now, we use TypeScript calculations
    setWasmAvailable(false);
  }, []);

  /**
   * Calculate a complete deal
   */
  const calculateDeal = useCallback(async (input: DealInput): Promise<DealResult> => {
    setIsLoading(true);
    setError(null);

    try {
      // For now, use TypeScript calculations
      // TODO: Use WASM when available
      const result = calculateDealTS(input);
      setResult(result);
      return result;
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Calculation failed';
      setError(errorMsg);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Quick payment calculation
   */
  const quickPayment = useCallback((principal: number, apr: number, termMonths: number): number => {
    return calculatePayment(principal, apr, termMonths);
  }, []);

  /**
   * Quick lease payment calculation
   */
  const quickLeasePayment = useCallback(
    (params: {
      adjustedCapCost: number;
      residualValue: number;
      moneyFactor: number;
      termMonths: number;
      taxRate?: number;
    }) => {
      const { adjustedCapCost, residualValue, moneyFactor, termMonths, taxRate = 0 } = params;
      const calc = calculateLeasePayment(adjustedCapCost, residualValue, moneyFactor, termMonths);
      const monthlyTax = calc.basePayment * taxRate;
      return {
        ...calc,
        monthlyTax: Math.round(monthlyTax * 100) / 100,
        totalPayment: Math.round((calc.basePayment + monthlyTax) * 100) / 100,
      };
    },
    []
  );

  /**
   * Generate payment scenarios
   */
  const getPaymentMatrix = useCallback(
    (amountFinanced: number, baseApr: number, terms?: number[]): PaymentMatrix => {
      return generatePaymentMatrix(amountFinanced, baseApr, terms);
    },
    []
  );

  return {
    calculateDeal,
    quickPayment,
    quickLeasePayment,
    getPaymentMatrix,
    moneyFactorToApr,
    aprToMoneyFactor,
    getStateTaxRate,
    result,
    isLoading,
    error,
    wasmAvailable,
  };
}

// ============================================================================
// TypeScript Deal Calculation
// ============================================================================

function calculateDealTS(input: DealInput): DealResult {
  const validationErrors = validateDealInput(input);

  if (validationErrors.length > 0) {
    return {
      deal_type: input.deal_type,
      is_valid: false,
      validation_errors: validationErrors,
      price_breakdown: defaultPriceBreakdown(),
      tax_breakdown: defaultTaxBreakdown(),
      payment_info: defaultPaymentInfo(),
      profit_analysis: defaultProfitAnalysis(),
      totals: defaultTotals(),
    };
  }

  switch (input.deal_type) {
    case 'CASH':
      return calculateCashDealTS(input);
    case 'FINANCE':
      return calculateFinanceDealTS(input);
    case 'LEASE':
      return calculateLeaseDealTS(input);
    default:
      throw new Error(`Unknown deal type: ${input.deal_type}`);
  }
}

function calculateCashDealTS(input: DealInput): DealResult {
  const price = calculatePriceBreakdown(input);
  const taxRate = getStateTaxRate(input.state_code);
  const taxableAmount = Math.max(
    0,
    price.selling_price - price.trade_allowance - price.non_taxable_rebates + price.taxable_fees
  );
  const totalTax = Math.round(taxableAmount * taxRate * 100) / 100;

  const totalDue =
    price.selling_price -
    price.total_rebates +
    price.total_fees +
    price.total_fi_products +
    totalTax -
    price.net_trade;
  const balanceDue = totalDue - price.cash_down;

  return {
    deal_type: 'CASH',
    is_valid: true,
    validation_errors: [],
    price_breakdown: price,
    tax_breakdown: {
      taxable_amount: taxableAmount,
      state_tax_rate: taxRate,
      local_tax_rate: 0,
      combined_rate: taxRate,
      state_tax: totalTax,
      local_tax: 0,
      total_tax: totalTax,
      upfront_tax: totalTax,
      monthly_tax: 0,
      tax_on_vehicle: Math.round(price.selling_price * taxRate * 100) / 100,
      tax_on_fees: Math.round(price.taxable_fees * taxRate * 100) / 100,
      tax_on_fi_products: 0,
    },
    payment_info: {
      payment: Math.round(balanceDue * 100) / 100,
      payment_with_tax: Math.round(balanceDue * 100) / 100,
      term_months: 1,
      payment_frequency: 'MONTHLY',
      due_at_signing: Math.round(balanceDue * 100) / 100,
      first_payment: Math.round(balanceDue * 100) / 100,
      security_deposit: 0,
      upfront_taxes: totalTax,
      upfront_fees: price.non_taxable_fees,
    },
    profit_analysis: calculateProfitAnalysis(input, price),
    totals: {
      amount_financed: 0,
      total_sale_price: Math.round(totalDue * 100) / 100,
      total_due: Math.round(totalDue * 100) / 100,
      balance_due: Math.round(balanceDue * 100) / 100,
      total_drive_off: Math.round(balanceDue * 100) / 100,
      amount_financed_tila: 0,
      finance_charge_tila: 0,
      total_of_payments_tila: Math.round(balanceDue * 100) / 100,
      total_sale_price_tila: Math.round(totalDue * 100) / 100,
    },
  };
}

function calculateFinanceDealTS(input: DealInput): DealResult {
  if (!input.finance_input) {
    throw new Error('Finance input required for finance deals');
  }

  const price = calculatePriceBreakdown(input);
  const taxRate = getStateTaxRate(input.state_code);
  const taxableAmount = Math.max(
    0,
    price.selling_price - price.trade_allowance - price.non_taxable_rebates + price.taxable_fees
  );
  const totalTax = Math.round(taxableAmount * taxRate * 100) / 100;

  // Calculate amount financed
  const financedFI = input.fi_products
    .filter((p) => p.finance_with_deal)
    .reduce((sum, p) => sum + p.price, 0);
  const amountFinanced = Math.max(
    0,
    price.selling_price -
      price.total_rebates -
      price.cash_down -
      price.net_trade +
      totalTax +
      price.total_fees +
      financedFI
  );

  const { apr, term_months } = input.finance_input;
  const payment = calculatePayment(amountFinanced, apr, term_months);
  const totalOfPayments = payment * term_months;
  const totalInterest = calculateTotalInterest(amountFinanced, payment, term_months);
  const financeCharge = Math.max(0, totalOfPayments - amountFinanced);

  // Generate payment matrix
  const paymentMatrix = generatePaymentMatrix(amountFinanced, apr);

  return {
    deal_type: 'FINANCE',
    is_valid: true,
    validation_errors: [],
    price_breakdown: price,
    tax_breakdown: {
      taxable_amount: taxableAmount,
      state_tax_rate: taxRate,
      local_tax_rate: 0,
      combined_rate: taxRate,
      state_tax: totalTax,
      local_tax: 0,
      total_tax: totalTax,
      upfront_tax: totalTax,
      monthly_tax: 0,
      tax_on_vehicle: Math.round(price.selling_price * taxRate * 100) / 100,
      tax_on_fees: Math.round(price.taxable_fees * taxRate * 100) / 100,
      tax_on_fi_products: 0,
    },
    payment_info: {
      payment: Math.round(payment * 100) / 100,
      payment_with_tax: Math.round(payment * 100) / 100,
      term_months,
      payment_frequency: input.finance_input.payment_frequency,
      apr,
      total_of_payments: Math.round(totalOfPayments * 100) / 100,
      total_interest: Math.round(totalInterest * 100) / 100,
      finance_charge: Math.round(financeCharge * 100) / 100,
      due_at_signing: price.cash_down,
      first_payment: Math.round(payment * 100) / 100,
      security_deposit: 0,
      upfront_taxes: 0,
      upfront_fees: 0,
    },
    profit_analysis: calculateProfitAnalysis(input, price),
    totals: {
      amount_financed: Math.round(amountFinanced * 100) / 100,
      total_sale_price: Math.round((amountFinanced + financeCharge + price.cash_down) * 100) / 100,
      total_due: Math.round((amountFinanced + price.cash_down) * 100) / 100,
      balance_due: Math.round(amountFinanced * 100) / 100,
      total_drive_off: price.cash_down,
      amount_financed_tila: Math.round(amountFinanced * 100) / 100,
      finance_charge_tila: Math.round(financeCharge * 100) / 100,
      total_of_payments_tila: Math.round(totalOfPayments * 100) / 100,
      total_sale_price_tila: Math.round((totalOfPayments + price.cash_down) * 100) / 100,
    },
    payment_matrix: paymentMatrix,
  };
}

function calculateLeaseDealTS(input: DealInput): DealResult {
  if (!input.lease_input) {
    throw new Error('Lease input required for lease deals');
  }

  const price = calculatePriceBreakdown(input);
  const lease = input.lease_input;
  const taxRate = getStateTaxRate(input.state_code);

  // Calculate residual
  const residualValue = lease.residual_value ?? (input.vehicle_msrp * lease.residual_percent) / 100;

  // Gross cap cost
  const capFees = input.fees
    .filter((f) => f.capitalize_in_lease)
    .reduce((sum, f) => sum + f.amount, 0);
  const capFI = input.fi_products
    .filter((p) => p.finance_with_deal)
    .reduce((sum, p) => sum + p.price, 0);
  const acqFee = lease.acquisition_fee_cap ? lease.acquisition_fee : 0;
  const grossCapCost = price.selling_price + capFees + capFI + acqFee;

  // Cap cost reduction
  const capReduction = price.net_trade + price.total_rebates + price.cash_down;
  const adjustedCapCost = Math.max(0, grossCapCost - capReduction);

  // Monthly payment
  const leaseCalc = calculateLeasePayment(
    adjustedCapCost,
    residualValue,
    lease.money_factor,
    lease.term_months
  );
  const monthlyTax = leaseCalc.basePayment * taxRate;
  const totalMonthlyPayment = Math.round((leaseCalc.basePayment + monthlyTax) * 100) / 100;

  // Due at signing
  const firstPayment = lease.first_payment_due_at_signing ? totalMonthlyPayment : 0;
  const securityDeposit = lease.security_deposit_waived ? 0 : lease.security_deposit;
  const acqFeeUpfront = lease.acquisition_fee_cap ? 0 : lease.acquisition_fee;
  const dueAtSigning = lease.sign_and_drive
    ? 0
    : firstPayment + securityDeposit + acqFeeUpfront + capReduction;

  const totalOfPayments = totalMonthlyPayment * lease.term_months;

  // Update price breakdown
  price.gross_cap_cost = Math.round(grossCapCost * 100) / 100;
  price.cap_cost_reduction = Math.round(capReduction * 100) / 100;
  price.adjusted_cap_cost = Math.round(adjustedCapCost * 100) / 100;
  price.residual_value = Math.round(residualValue * 100) / 100;
  price.capitalized_fees = capFees;

  return {
    deal_type: 'LEASE',
    is_valid: true,
    validation_errors: [],
    price_breakdown: price,
    tax_breakdown: {
      taxable_amount: adjustedCapCost,
      state_tax_rate: taxRate,
      local_tax_rate: 0,
      combined_rate: taxRate,
      state_tax: Math.round(monthlyTax * lease.term_months * 100) / 100,
      local_tax: 0,
      total_tax: Math.round(monthlyTax * lease.term_months * 100) / 100,
      upfront_tax: 0,
      monthly_tax: Math.round(monthlyTax * 100) / 100,
      tax_on_vehicle: 0,
      tax_on_fees: 0,
      tax_on_fi_products: 0,
    },
    payment_info: {
      payment: leaseCalc.basePayment,
      payment_with_tax: totalMonthlyPayment,
      term_months: lease.term_months,
      payment_frequency: 'MONTHLY',
      money_factor: lease.money_factor,
      equivalent_apr: moneyFactorToApr(lease.money_factor),
      depreciation: Math.round(leaseCalc.depreciation * lease.term_months * 100) / 100,
      rent_charge: Math.round(leaseCalc.rentCharge * lease.term_months * 100) / 100,
      monthly_depreciation: leaseCalc.depreciation,
      monthly_rent_charge: leaseCalc.rentCharge,
      due_at_signing: Math.round(dueAtSigning * 100) / 100,
      first_payment: Math.round(firstPayment * 100) / 100,
      security_deposit: securityDeposit,
      upfront_taxes: 0,
      upfront_fees: acqFeeUpfront,
    },
    profit_analysis: calculateProfitAnalysis(input, price),
    totals: {
      amount_financed: 0,
      total_sale_price: Math.round(totalOfPayments * 100) / 100,
      total_due: Math.round(dueAtSigning * 100) / 100,
      balance_due: 0,
      total_drive_off: Math.round(dueAtSigning * 100) / 100,
      amount_financed_tila: 0,
      finance_charge_tila: 0,
      total_of_payments_tila: Math.round(totalOfPayments * 100) / 100,
      total_sale_price_tila: Math.round(totalOfPayments * 100) / 100,
    },
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function validateDealInput(input: DealInput): string[] {
  const errors: string[] = [];

  if (input.selling_price <= 0) {
    errors.push('Selling price must be greater than zero');
  }
  if (input.vehicle_msrp <= 0) {
    errors.push('Vehicle MSRP must be greater than zero');
  }
  if (input.cash_down < 0) {
    errors.push('Cash down cannot be negative');
  }

  if (input.deal_type === 'FINANCE' && input.finance_input) {
    if (input.finance_input.apr < 0 || input.finance_input.apr > 99.9) {
      errors.push('APR must be between 0 and 99.9%');
    }
    if (input.finance_input.term_months < 12 || input.finance_input.term_months > 96) {
      errors.push('Finance term must be between 12 and 96 months');
    }
  }

  if (input.deal_type === 'LEASE' && input.lease_input) {
    if (input.lease_input.money_factor < 0 || input.lease_input.money_factor > 0.01) {
      errors.push('Money factor must be between 0 and 0.01');
    }
    if (input.lease_input.residual_percent < 20 || input.lease_input.residual_percent > 90) {
      errors.push('Residual percent must be between 20% and 90%');
    }
    if (input.lease_input.term_months < 12 || input.lease_input.term_months > 60) {
      errors.push('Lease term must be between 12 and 60 months');
    }
  }

  return errors;
}

function calculatePriceBreakdown(input: DealInput): PriceBreakdown {
  const tradeAllowance = input.trade_in?.gross_allowance ?? 0;
  const tradePayoff = input.trade_in?.payoff_amount ?? 0;
  const netTrade = tradeAllowance - tradePayoff;

  const totalRebates = input.rebates.reduce((sum, r) => sum + r.amount, 0);
  const taxableRebates = input.rebates
    .filter((r) => r.taxable)
    .reduce((sum, r) => sum + r.amount, 0);
  const nonTaxableRebates = totalRebates - taxableRebates;

  const totalFI = input.fi_products.reduce((sum, p) => sum + p.price, 0);
  const financedFI = input.fi_products
    .filter((p) => p.finance_with_deal)
    .reduce((sum, p) => sum + p.price, 0);
  const cashFI = totalFI - financedFI;

  const totalFees = input.fees.reduce((sum, f) => sum + f.amount, 0);
  const taxableFees = input.fees.filter((f) => f.taxable).reduce((sum, f) => sum + f.amount, 0);
  const nonTaxableFees = totalFees - taxableFees;
  const capFees = input.fees
    .filter((f) => f.capitalize_in_lease)
    .reduce((sum, f) => sum + f.amount, 0);

  return {
    vehicle_msrp: input.vehicle_msrp,
    vehicle_invoice: input.vehicle_invoice,
    selling_price: input.selling_price,
    trade_allowance: tradeAllowance,
    trade_payoff: tradePayoff,
    net_trade: netTrade,
    total_rebates: totalRebates,
    taxable_rebates: taxableRebates,
    non_taxable_rebates: nonTaxableRebates,
    total_fi_products: totalFI,
    financed_fi_products: financedFI,
    cash_fi_products: cashFI,
    total_fees: totalFees,
    taxable_fees: taxableFees,
    non_taxable_fees: nonTaxableFees,
    capitalized_fees: capFees,
    cash_down: input.cash_down,
  };
}

function calculateProfitAnalysis(input: DealInput, price: PriceBreakdown): ProfitAnalysis {
  const invoice = input.vehicle_invoice ?? input.vehicle_msrp * 0.92;
  const vehicleGross = price.selling_price - invoice;
  const fiGross = input.fi_products.reduce((sum, p) => sum + p.price - (p.cost ?? 0), 0);
  const frontEnd = vehicleGross + Math.abs(Math.min(0, price.net_trade));

  return {
    front_end_gross: Math.round(frontEnd * 100) / 100,
    back_end_gross: Math.round(fiGross * 100) / 100,
    total_gross: Math.round((frontEnd + fiGross) * 100) / 100,
    vehicle_gross: Math.round(vehicleGross * 100) / 100,
    fi_gross: Math.round(fiGross * 100) / 100,
    reserve: 0,
    trade_acv: input.trade_in?.acv,
    trade_over_allow: input.trade_in
      ? (input.trade_in.acv ?? input.trade_in.gross_allowance) - input.trade_in.gross_allowance
      : undefined,
  };
}

function defaultPriceBreakdown(): PriceBreakdown {
  return {
    vehicle_msrp: 0,
    selling_price: 0,
    trade_allowance: 0,
    trade_payoff: 0,
    net_trade: 0,
    total_rebates: 0,
    taxable_rebates: 0,
    non_taxable_rebates: 0,
    total_fi_products: 0,
    financed_fi_products: 0,
    cash_fi_products: 0,
    total_fees: 0,
    taxable_fees: 0,
    non_taxable_fees: 0,
    capitalized_fees: 0,
    cash_down: 0,
  };
}

function defaultTaxBreakdown(): TaxBreakdown {
  return {
    taxable_amount: 0,
    state_tax_rate: 0,
    local_tax_rate: 0,
    combined_rate: 0,
    state_tax: 0,
    local_tax: 0,
    total_tax: 0,
    upfront_tax: 0,
    monthly_tax: 0,
    tax_on_vehicle: 0,
    tax_on_fees: 0,
    tax_on_fi_products: 0,
  };
}

function defaultPaymentInfo(): PaymentInfo {
  return {
    payment: 0,
    payment_with_tax: 0,
    term_months: 0,
    payment_frequency: 'MONTHLY',
    due_at_signing: 0,
    first_payment: 0,
    security_deposit: 0,
    upfront_taxes: 0,
    upfront_fees: 0,
  };
}

function defaultProfitAnalysis(): ProfitAnalysis {
  return {
    front_end_gross: 0,
    back_end_gross: 0,
    total_gross: 0,
    vehicle_gross: 0,
    fi_gross: 0,
    reserve: 0,
  };
}

function defaultTotals(): DealTotals {
  return {
    amount_financed: 0,
    total_sale_price: 0,
    total_due: 0,
    balance_due: 0,
    total_drive_off: 0,
    amount_financed_tila: 0,
    finance_charge_tila: 0,
    total_of_payments_tila: 0,
    total_sale_price_tila: 0,
  };
}

export default useDealCalculator;
