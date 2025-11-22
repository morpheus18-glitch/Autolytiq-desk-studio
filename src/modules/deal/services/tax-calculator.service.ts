/**
 * TAX CALCULATOR SERVICE
 * Sales tax calculations for automotive deals
 *
 * Consolidated from:
 * - /server/calculations.ts (calculateSalesTax, isAftermarketProductTaxable)
 *
 * Responsibilities:
 * - Calculate sales tax with state-specific rules
 * - Handle trade-in credits
 * - Apply F&I product taxation rules
 * - Support manufacturer rebate handling
 *
 * @module deal/services/tax-calculator
 */

import Decimal from 'decimal.js';
import { STATE_TAX_DATA } from '../../../../shared/tax-data.js';

// Configure Decimal.js for financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// ============================================================================
// TYPES
// ============================================================================

export interface TaxCalculationInput {
  vehiclePrice: number;
  tradeAllowance: number;
  dealerFees: Array<{ amount: number; taxable: boolean }>;
  accessories: Array<{ amount: number; taxable: boolean }>;

  // F&I Products with category-based taxation
  aftermarketProducts?: Array<{
    category: 'warranty' | 'gap' | 'maintenance' | 'tire_wheel' | 'theft' |
              'paint_protection' | 'window_tint' | 'bedliner' | 'etch' | 'custom';
    price: number;
  }>;

  // Rebate handling (new cars only)
  manufacturerRebate?: number;
  isNewVehicle?: boolean; // Rebates only apply to new vehicles

  // Tax rates
  stateTaxRate: number;
  countyTaxRate: number;
  cityTaxRate: number;
  townshipTaxRate?: number;
  specialDistrictTaxRate?: number;

  // Trade-in credit type
  tradeInCreditType: string; // 'tax_on_difference' or 'no_credit'

  // State code for F&I product taxation lookup
  stateCode?: string;
}

export interface TaxCalculationResult {
  taxableAmount: number;
  totalTax: number;
  totalRate: number;
  breakdown: {
    stateRate: number;
    countyRate: number;
    cityRate: number;
    townshipRate: number;
    specialDistrictRate: number;
    stateTax: number;
    countyTax: number;
    cityTax: number;
    townshipTax: number;
    specialDistrictTax: number;
  };
  appliedRules: string[];
}

// ============================================================================
// TAX CALCULATOR SERVICE
// ============================================================================

export class TaxCalculatorService {
  /**
   * Calculate sales tax with state-specific rules
   *
   * @example
   * const result = taxCalc.calculateSalesTax({
   *   vehiclePrice: 30000,
   *   tradeAllowance: 10000,
   *   dealerFees: [{ amount: 199, taxable: true }],
   *   accessories: [{ amount: 500, taxable: true }],
   *   aftermarketProducts: [
   *     { category: 'warranty', price: 2000 },
   *     { category: 'gap', price: 500 }
   *   ],
   *   manufacturerRebate: 2000,
   *   isNewVehicle: true,
   *   stateTaxRate: 0.07,
   *   countyTaxRate: 0.01,
   *   cityTaxRate: 0.005,
   *   tradeInCreditType: 'tax_on_difference',
   *   stateCode: 'IN'
   * });
   * // Result: { totalTax: 1619.93, taxableAmount: 21699.00, ... }
   */
  calculateSalesTax(input: TaxCalculationInput): TaxCalculationResult {
    const {
      vehiclePrice,
      tradeAllowance,
      dealerFees,
      accessories,
      aftermarketProducts = [],
      manufacturerRebate = 0,
      isNewVehicle = false,
      stateTaxRate,
      countyTaxRate,
      cityTaxRate,
      townshipTaxRate = 0,
      specialDistrictTaxRate = 0,
      tradeInCreditType,
      stateCode = 'IN',
    } = input;

    const appliedRules: string[] = [];
    let taxableAmount = new Decimal(vehiclePrice);

    // STEP 1: Subtract manufacturer rebate FIRST (only on new vehicles)
    // Most states treat rebates as a reduction in purchase price
    if (isNewVehicle && manufacturerRebate > 0) {
      const stateTax = STATE_TAX_DATA[stateCode.toUpperCase()];
      const rebateReducesTaxable = stateTax?.rebateReducesTaxable ?? true;

      if (rebateReducesTaxable) {
        taxableAmount = taxableAmount.minus(manufacturerRebate);
        appliedRules.push(`Manufacturer rebate of $${manufacturerRebate} reduces taxable amount`);
      } else {
        appliedRules.push(`Manufacturer rebate of $${manufacturerRebate} does NOT reduce taxable amount (${stateCode} rule)`);
      }
    }

    // STEP 2: Apply trade-in credit
    if (tradeInCreditType === 'tax_on_difference') {
      taxableAmount = taxableAmount.minus(tradeAllowance);
      appliedRules.push(`Trade-in allowance of $${tradeAllowance} reduces taxable amount (tax on difference)`);
    } else {
      appliedRules.push(`Trade-in allowance of $${tradeAllowance} does NOT reduce taxable amount (no credit)`);
    }

    // STEP 3: Add taxable dealer fees
    const taxableFees = dealerFees
      .filter(f => f.taxable)
      .reduce((sum, f) => sum.plus(f.amount), new Decimal(0));

    if (taxableFees.greaterThan(0)) {
      appliedRules.push(`Taxable dealer fees: $${taxableFees.toFixed(2)}`);
    }

    // STEP 4: Add taxable accessories
    const taxableAccessories = accessories
      .filter(a => a.taxable)
      .reduce((sum, a) => sum.plus(a.amount), new Decimal(0));

    if (taxableAccessories.greaterThan(0)) {
      appliedRules.push(`Taxable accessories: $${taxableAccessories.toFixed(2)}`);
    }

    // STEP 5: Add taxable F&I products (state-specific rules)
    const taxableAftermarketProducts = aftermarketProducts
      .filter(p => this.isAftermarketProductTaxable(p.category, stateCode))
      .reduce((sum, p) => sum.plus(p.price), new Decimal(0));

    if (taxableAftermarketProducts.greaterThan(0)) {
      const taxableProductsList = aftermarketProducts
        .filter(p => this.isAftermarketProductTaxable(p.category, stateCode))
        .map(p => `${p.category} ($${p.price})`)
        .join(', ');
      appliedRules.push(`Taxable aftermarket products: ${taxableProductsList}`);
    }

    const nonTaxableAftermarket = aftermarketProducts
      .filter(p => !this.isAftermarketProductTaxable(p.category, stateCode))
      .reduce((sum, p) => sum.plus(p.price), new Decimal(0));

    if (nonTaxableAftermarket.greaterThan(0)) {
      const nonTaxableList = aftermarketProducts
        .filter(p => !this.isAftermarketProductTaxable(p.category, stateCode))
        .map(p => `${p.category} ($${p.price})`)
        .join(', ');
      appliedRules.push(`Non-taxable aftermarket products in ${stateCode}: ${nonTaxableList}`);
    }

    // STEP 6: Calculate final taxable amount
    taxableAmount = taxableAmount
      .plus(taxableFees)
      .plus(taxableAccessories)
      .plus(taxableAftermarketProducts);

    // Ensure non-negative taxable amount
    if (taxableAmount.lt(0)) {
      taxableAmount = new Decimal(0);
      appliedRules.push('Taxable amount floored to $0.00 (negative value not allowed)');
    }

    // STEP 7: Calculate total tax rate
    const totalRate = new Decimal(stateTaxRate)
      .plus(countyTaxRate)
      .plus(cityTaxRate)
      .plus(townshipTaxRate)
      .plus(specialDistrictTaxRate);

    // STEP 8: Calculate tax breakdown
    const stateTax = taxableAmount.times(stateTaxRate);
    const countyTax = taxableAmount.times(countyTaxRate);
    const cityTax = taxableAmount.times(cityTaxRate);
    const townshipTax = taxableAmount.times(townshipTaxRate);
    const specialDistrictTax = taxableAmount.times(specialDistrictTaxRate);

    const totalTax = stateTax.plus(countyTax).plus(cityTax).plus(townshipTax).plus(specialDistrictTax);

    return {
      taxableAmount: taxableAmount.toDecimalPlaces(2).toNumber(),
      totalTax: totalTax.toDecimalPlaces(2).toNumber(),
      totalRate: totalRate.toDecimalPlaces(4).toNumber(),
      breakdown: {
        stateRate: stateTaxRate,
        countyRate: countyTaxRate,
        cityRate: cityTaxRate,
        townshipRate: townshipTaxRate,
        specialDistrictRate: specialDistrictTaxRate,
        stateTax: stateTax.toDecimalPlaces(2).toNumber(),
        countyTax: countyTax.toDecimalPlaces(2).toNumber(),
        cityTax: cityTax.toDecimalPlaces(2).toNumber(),
        townshipTax: townshipTax.toDecimalPlaces(2).toNumber(),
        specialDistrictTax: specialDistrictTax.toDecimalPlaces(2).toNumber(),
      },
      appliedRules,
    };
  }

  /**
   * Determine if F&I product is taxable in a given state
   *
   * Different states have different rules for taxing:
   * - Extended warranties (VSC)
   * - GAP insurance
   * - Maintenance plans
   * - Accessories
   * - Other aftermarket products
   *
   * @param category - Product category
   * @param stateCode - Two-letter state code (e.g., 'IN', 'CA', 'TX')
   * @returns true if product is taxable in that state
   *
   * @example
   * isAftermarketProductTaxable('warranty', 'IN') // true
   * isAftermarketProductTaxable('warranty', 'CA') // false
   * isAftermarketProductTaxable('gap', 'TX') // true
   */
  private isAftermarketProductTaxable(
    category: string,
    stateCode: string = 'IN'
  ): boolean {
    const stateTax = STATE_TAX_DATA[stateCode.toUpperCase()];
    if (!stateTax) return true; // Default to taxable if state not found

    // Check state-specific rules
    switch (category) {
      case 'warranty':
        return stateTax.warrantyTaxable ?? true; // Default taxable if not specified

      case 'gap':
        return stateTax.gapTaxable ?? true;

      case 'maintenance':
      case 'tire_wheel': // Tire & wheel protection plans (service contracts)
        return stateTax.maintenanceTaxable ?? true;

      case 'theft': // Theft protection/LoJack (often bundled with GAP)
        return stateTax.gapTaxable ?? true;

      case 'paint_protection':
      case 'window_tint':
      case 'bedliner':
      case 'etch': // VIN etching
      case 'custom': // Custom accessories
        return stateTax.accessoriesTaxable ?? true; // Physical accessories usually taxable

      default:
        return true; // Default to taxable
    }
  }

  /**
   * Get simplified tax calculation (for backward compatibility)
   *
   * @deprecated Use calculateSalesTax() instead for full breakdown
   */
  calculateTax(input: TaxCalculationInput): number {
    const result = this.calculateSalesTax(input);
    return result.totalTax;
  }
}
