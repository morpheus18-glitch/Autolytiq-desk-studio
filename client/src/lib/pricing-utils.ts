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
 */
export function getProfitColorClass(marginPercent: Decimal | null): string {
  if (!marginPercent) return 'text-muted-foreground';
  
  const margin = marginPercent.toNumber();
  
  if (margin < 0) return 'text-red-600';
  if (margin < 5) return 'text-amber-600';
  if (margin < 10) return 'text-emerald-600';
  return 'text-emerald-700';
}
