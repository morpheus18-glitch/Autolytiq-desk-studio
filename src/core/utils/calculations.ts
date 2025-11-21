/**
 * Financial calculation utilities
 *
 * Provides conversions between money factor and APR for lease calculations.
 */

import Decimal from 'decimal.js';

// Configure Decimal.js for financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Convert money factor to APR percentage
 * Formula: Money Factor × 2400 = APR
 * @param moneyFactor Lease money factor (e.g., 0.00250)
 * @returns APR percentage (e.g., 6.00)
 */
export function moneyFactorToAPR(moneyFactor: number): number {
  return new Decimal(moneyFactor).times(2400).toDecimalPlaces(2).toNumber();
}

/**
 * Convert APR percentage to money factor
 * Formula: APR ÷ 2400 = Money Factor
 * @param apr APR percentage (e.g., 6.00)
 * @returns Lease money factor (e.g., 0.00250)
 */
export function aprToMoneyFactor(apr: number): number {
  return new Decimal(apr).div(2400).toDecimalPlaces(6).toNumber();
}
