/**
 * DECIMAL CALCULATOR - BULLETPROOF MONEY MATH
 *
 * CRITICAL: ALL monetary calculations MUST use this utility.
 * NEVER use JavaScript number arithmetic for money.
 *
 * Why Decimal.js?
 * - JavaScript numbers use floating point (binary) representation
 * - 0.1 + 0.2 !== 0.3 in JavaScript (0.30000000000000004)
 * - Financial calculations require EXACT decimal arithmetic
 * - Tax errors can result in legal/financial liability
 *
 * This utility provides:
 * - Type-safe decimal operations
 * - Consistent rounding (ROUND_HALF_UP)
 * - Precision control
 * - Validation and error handling
 */

import Decimal from 'decimal.js';
import { MONEY_DECIMAL_CONFIG } from '../types/enhanced-tax.types';

// Configure Decimal.js globally for money calculations
Decimal.set(MONEY_DECIMAL_CONFIG);

// ============================================================================
// CORE DECIMAL OPERATIONS
// ============================================================================

/**
 * Create a Decimal from a string, number, or Decimal
 * Always validates input and returns a Decimal
 */
export function decimal(value: string | number | Decimal): Decimal {
  try {
    return new Decimal(value);
  } catch (error) {
    throw new Error(`Invalid decimal value: ${value} (${error})`);
  }
}

/**
 * Convert Decimal to money string (2 decimal places, rounded)
 */
export function toMoneyString(value: string | number | Decimal): string {
  return decimal(value).toFixed(2, Decimal.ROUND_HALF_UP);
}

/**
 * Convert Decimal to number (use sparingly, only for display)
 */
export function toNumber(value: string | number | Decimal): number {
  return decimal(value).toNumber();
}

// ============================================================================
// ARITHMETIC OPERATIONS
// ============================================================================

/**
 * Add two or more values
 * Example: add("10.50", "5.25") => "15.75"
 */
export function add(...values: (string | number | Decimal)[]): string {
  if (values.length === 0) return '0.00';

  let result = decimal(values[0]);
  for (let i = 1; i < values.length; i++) {
    result = result.plus(decimal(values[i]));
  }

  return toMoneyString(result);
}

/**
 * Subtract one value from another
 * Example: subtract("10.50", "5.25") => "5.25"
 */
export function subtract(minuend: string | number | Decimal, subtrahend: string | number | Decimal): string {
  const result = decimal(minuend).minus(decimal(subtrahend));
  return toMoneyString(result);
}

/**
 * Multiply two values
 * Example: multiply("10.00", "1.5") => "15.00"
 */
export function multiply(multiplicand: string | number | Decimal, multiplier: string | number | Decimal): string {
  const result = decimal(multiplicand).times(decimal(multiplier));
  return toMoneyString(result);
}

/**
 * Divide one value by another
 * Example: divide("10.00", "2") => "5.00"
 */
export function divide(dividend: string | number | Decimal, divisor: string | number | Decimal): string {
  const divisorDecimal = decimal(divisor);

  if (divisorDecimal.isZero()) {
    throw new Error('Division by zero');
  }

  const result = decimal(dividend).dividedBy(divisorDecimal);
  return toMoneyString(result);
}

// ============================================================================
// TAX CALCULATIONS
// ============================================================================

/**
 * Calculate tax amount from a base and tax rate
 *
 * @param taxableBase - The amount to be taxed (string)
 * @param taxRate - The tax rate as decimal (e.g., "0.0825" for 8.25%)
 * @returns Tax amount rounded to 2 decimal places
 *
 * Example: calculateTax("100.00", "0.0825") => "8.25"
 */
export function calculateTax(taxableBase: string | number | Decimal, taxRate: string | number | Decimal): string {
  const base = decimal(taxableBase);
  const rate = decimal(taxRate);

  // Validate inputs
  if (base.isNegative()) {
    throw new Error('Taxable base cannot be negative');
  }

  if (rate.isNegative() || rate.greaterThan(1)) {
    throw new Error('Tax rate must be between 0 and 1');
  }

  const tax = base.times(rate);
  return toMoneyString(tax);
}

/**
 * Calculate taxable amount after trade-in credit
 *
 * @param vehiclePrice - Vehicle sale price
 * @param tradeInValue - Trade-in value
 * @returns Taxable amount (price - trade-in, minimum 0)
 *
 * Example: applyTradeInCredit("30000", "10000") => "20000.00"
 */
export function applyTradeInCredit(
  vehiclePrice: string | number | Decimal,
  tradeInValue: string | number | Decimal
): string {
  const price = decimal(vehiclePrice);
  const tradeIn = decimal(tradeInValue);

  // Taxable amount cannot be negative
  const taxable = Decimal.max(0, price.minus(tradeIn));

  return toMoneyString(taxable);
}

/**
 * Calculate tax with trade-in credit applied
 *
 * @param vehiclePrice - Vehicle sale price
 * @param tradeInValue - Trade-in value
 * @param taxRate - Tax rate as decimal
 * @returns Object with taxable amount and tax
 */
export function calculateTaxWithTradeIn(
  vehiclePrice: string | number | Decimal,
  tradeInValue: string | number | Decimal,
  taxRate: string | number | Decimal
): { taxableAmount: string; tax: string } {
  const taxableAmount = applyTradeInCredit(vehiclePrice, tradeInValue);
  const tax = calculateTax(taxableAmount, taxRate);

  return { taxableAmount, tax };
}

/**
 * Apply a cap to a value (for capped trade-in credits, doc fees, etc.)
 *
 * @param value - Value to cap
 * @param cap - Maximum allowed value
 * @returns Minimum of value and cap
 *
 * Example: applyCap("300", "85") => "85.00" (CA doc fee cap)
 */
export function applyCap(value: string | number | Decimal, cap: string | number | Decimal): string {
  const val = decimal(value);
  const capVal = decimal(cap);

  const result = Decimal.min(val, capVal);
  return toMoneyString(result);
}

/**
 * Apply a percentage to a value
 *
 * @param value - Base value
 * @param percent - Percentage as decimal (e.g., "0.80" for 80%)
 * @returns Value * percent
 *
 * Example: applyPercent("10000", "0.80") => "8000.00"
 */
export function applyPercent(value: string | number | Decimal, percent: string | number | Decimal): string {
  return multiply(value, percent);
}

// ============================================================================
// COMPARISON OPERATIONS
// ============================================================================

/**
 * Check if two values are equal (within 2 decimal places)
 */
export function isEqual(a: string | number | Decimal, b: string | number | Decimal): boolean {
  return toMoneyString(a) === toMoneyString(b);
}

/**
 * Check if a is greater than b
 */
export function isGreaterThan(a: string | number | Decimal, b: string | number | Decimal): boolean {
  return decimal(a).greaterThan(decimal(b));
}

/**
 * Check if a is less than b
 */
export function isLessThan(a: string | number | Decimal, b: string | number | Decimal): boolean {
  return decimal(a).lessThan(decimal(b));
}

/**
 * Check if a value is zero
 */
export function isZero(value: string | number | Decimal): boolean {
  return decimal(value).isZero();
}

/**
 * Check if a value is positive
 */
export function isPositive(value: string | number | Decimal): boolean {
  return decimal(value).isPositive();
}

/**
 * Check if a value is negative
 */
export function isNegative(value: string | number | Decimal): boolean {
  return decimal(value).isNegative();
}

/**
 * Get the minimum of multiple values
 */
export function min(...values: (string | number | Decimal)[]): string {
  if (values.length === 0) return '0.00';

  let result = decimal(values[0]);
  for (let i = 1; i < values.length; i++) {
    result = Decimal.min(result, decimal(values[i]));
  }

  return toMoneyString(result);
}

/**
 * Get the maximum of multiple values
 */
export function max(...values: (string | number | Decimal)[]): string {
  if (values.length === 0) return '0.00';

  let result = decimal(values[0]);
  for (let i = 1; i < values.length; i++) {
    result = Decimal.max(result, decimal(values[i]));
  }

  return toMoneyString(result);
}

/**
 * Get absolute value
 */
export function abs(value: string | number | Decimal): string {
  return toMoneyString(decimal(value).abs());
}

// ============================================================================
// AGGREGATE OPERATIONS
// ============================================================================

/**
 * Sum an array of values
 * Example: sum(["10.50", "5.25", "3.00"]) => "18.75"
 */
export function sum(values: (string | number | Decimal)[]): string {
  if (values.length === 0) return '0.00';

  let result = decimal(0);
  for (const value of values) {
    result = result.plus(decimal(value));
  }

  return toMoneyString(result);
}

/**
 * Calculate percentage of total
 *
 * @param part - Partial amount
 * @param total - Total amount
 * @returns Percentage as decimal (e.g., "0.25" for 25%)
 */
export function percentageOf(part: string | number | Decimal, total: string | number | Decimal): string {
  const totalDecimal = decimal(total);

  if (totalDecimal.isZero()) {
    return '0.00';
  }

  const percentage = decimal(part).dividedBy(totalDecimal);
  return percentage.toFixed(4, Decimal.ROUND_HALF_UP); // 4 decimals for percentage
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate that a value is a valid money amount
 * Returns true if valid, throws error if invalid
 */
export function validateMoney(value: string | number | Decimal, fieldName?: string): boolean {
  try {
    const d = decimal(value);

    if (d.isNaN()) {
      throw new Error(`${fieldName || 'Value'} is not a number`);
    }

    if (!d.isFinite()) {
      throw new Error(`${fieldName || 'Value'} must be finite`);
    }

    return true;
  } catch (error) {
    throw new Error(`${fieldName || 'Value'} is not a valid money amount: ${error}`);
  }
}

/**
 * Validate that a value is non-negative
 */
export function validateNonNegative(value: string | number | Decimal, fieldName?: string): boolean {
  validateMoney(value, fieldName);

  if (isNegative(value)) {
    throw new Error(`${fieldName || 'Value'} cannot be negative: ${value}`);
  }

  return true;
}

/**
 * Validate that a rate is between 0 and 1
 */
export function validateRate(rate: string | number | Decimal, fieldName?: string): boolean {
  validateMoney(rate, fieldName);

  const r = decimal(rate);

  if (r.isNegative() || r.greaterThan(1)) {
    throw new Error(`${fieldName || 'Rate'} must be between 0 and 1: ${rate}`);
  }

  return true;
}

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

/**
 * Format a value as USD currency
 * Example: formatUSD("1234.56") => "$1,234.56"
 */
export function formatUSD(value: string | number | Decimal): string {
  const amount = toNumber(value);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a rate as percentage
 * Example: formatPercent("0.0825") => "8.25%"
 */
export function formatPercent(rate: string | number | Decimal, decimals: number = 2): string {
  const rateDecimal = decimal(rate);
  const percent = rateDecimal.times(100);
  return `${percent.toFixed(decimals, Decimal.ROUND_HALF_UP)}%`;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const DecimalCalculator = {
  // Core
  decimal,
  toMoneyString,
  toNumber,

  // Arithmetic
  add,
  subtract,
  multiply,
  divide,

  // Tax
  calculateTax,
  applyTradeInCredit,
  calculateTaxWithTradeIn,
  applyCap,
  applyPercent,

  // Comparison
  isEqual,
  isGreaterThan,
  isLessThan,
  isZero,
  isPositive,
  isNegative,
  min,
  max,
  abs,

  // Aggregate
  sum,
  percentageOf,

  // Validation
  validateMoney,
  validateNonNegative,
  validateRate,

  // Formatting
  formatUSD,
  formatPercent,
};

export default DecimalCalculator;
