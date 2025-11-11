/**
 * Pricing and profit margin utilities for dealership vehicles
 */

import Decimal from 'decimal.js';

// Configure Decimal.js for financial calculations
Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP
});

export interface PricingSummary {
  sellingPrice: Decimal;
  cost: Decimal | null;
  grossProfit: Decimal | null;
  marginPercent: Decimal | null;
  hasCost: boolean;
}

/**
 * Calculate pricing summary including profit and margin
 */
export function calculatePricingSummary(
  price: string | number,
  invoicePrice?: string | number | null
): PricingSummary {
  const sellingPrice = new Decimal(price);
  
  if (!invoicePrice || Number(invoicePrice) === 0) {
    return {
      sellingPrice,
      cost: null,
      grossProfit: null,
      marginPercent: null,
      hasCost: false
    };
  }
  
  const cost = new Decimal(invoicePrice);
  const grossProfit = sellingPrice.minus(cost);
  const marginPercent = grossProfit.dividedBy(sellingPrice).times(100);
  
  return {
    sellingPrice,
    cost,
    grossProfit,
    marginPercent,
    hasCost: true
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(value: string | number | Decimal, options?: {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}): string {
  const amount = value instanceof Decimal ? value.toNumber() : Number(value);
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 0,
  }).format(amount);
}

/**
 * Format percentage for display
 */
export function formatPercent(value: Decimal | number, decimals: number = 1): string {
  const num = value instanceof Decimal ? value.toNumber() : value;
  return `${num.toFixed(decimals)}%`;
}

/**
 * Get profit color class based on margin percentage
 * WCAG AA compliant colors (4.5:1 contrast ratio)
 */
export function getProfitColorClass(marginPercent: Decimal | null): string {
  if (!marginPercent) return 'text-muted-foreground';
  
  const margin = marginPercent.toNumber();
  
  if (margin < 0) return 'text-destructive dark:text-destructive';
  if (margin < 5) return 'text-warning dark:text-warning';
  if (margin < 10) return 'text-success dark:text-success';
  return 'text-success dark:text-success font-semibold';
}

/**
 * Get value color class for positive/negative amounts
 * Use for trade equity, profit, payment differences
 * WCAG AA compliant colors
 * @param value - Value to color code (Decimal, number, or null)
 * @param options - Configuration options
 * @param options.inverse - For cases where negative is good (e.g., lower payment)
 * @param options.colorZero - Override default neutral treatment of zero (default: false)
 * @returns Tailwind CSS class string for text color
 */
export function getValueColorClass(
  value: Decimal | number | null, 
  options?: { 
    inverse?: boolean;
    colorZero?: boolean; // Default false: zero renders neutral unless explicitly enabled
  }
): string {
  if (value === null || value === undefined) return 'text-muted-foreground';
  
  const num = value instanceof Decimal ? value.toNumber() : value;
  
  // CRITICAL: Always treat zero as neutral unless colorZero is explicitly true
  // This prevents zero deltas, zero equity, zero payments from being miscolored
  if (num === 0 && !options?.colorZero) {
    return 'text-muted-foreground';
  }
  
  const isPositive = num > 0;
  
  // Default: green for positive (profit/equity), red for negative (loss/debt)
  // Inverse: red for positive (higher payment), green for negative (savings)
  if (options?.inverse) {
    return isPositive 
      ? 'text-destructive dark:text-destructive' 
      : 'text-success dark:text-success';
  }
  
  return isPositive 
    ? 'text-success dark:text-success' 
    : 'text-destructive dark:text-destructive';
}

/**
 * Format value with sign prefix for comparison displays
 * e.g., "+$1,234" or "-$1,234"
 */
export function formatValueWithSign(
  value: Decimal | number, 
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  const num = value instanceof Decimal ? value.toNumber() : value;
  const formatted = formatCurrency(Math.abs(num), options);
  const sign = num > 0 ? '+' : num < 0 ? '-' : '';
  
  return `${sign}${formatted}`;
}

/**
 * Calculate delta/difference between two values
 * Returns formatted string with sign and color class
 * Zero deltas automatically render as neutral (muted)
 */
export function calculateDelta(
  current: Decimal | number,
  baseline: Decimal | number
): { 
  value: number;
  formatted: string;
  colorClass: string;
  percentChange: number;
} {
  const curr = current instanceof Decimal ? current.toNumber() : current;
  const base = baseline instanceof Decimal ? baseline.toNumber() : baseline;
  const delta = curr - base;
  const percentChange = base !== 0 ? (delta / Math.abs(base)) * 100 : 0;
  
  return {
    value: delta,
    formatted: formatValueWithSign(delta),
    colorClass: getValueColorClass(delta), // Zero deltas render neutral by default
    percentChange
  };
}
