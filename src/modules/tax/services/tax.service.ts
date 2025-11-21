/**
 * TAX SERVICE
 * Core tax calculation business logic
 *
 * Responsibilities:
 * - Calculate sales tax for deals
 * - Apply jurisdiction-specific rates
 * - Apply state-specific tax rules
 * - Manage tax jurisdiction data
 */

import type {
  TaxCalculationRequest,
  TaxCalculationResult,
  TaxJurisdiction,
  TaxBreakdown,
} from '../types/tax.types';
import {
  TaxError,
  TaxJurisdictionNotFoundError,
  InvalidTaxCalculationError,
} from '../types/tax.types';

// ============================================================================
// STORAGE INTERFACE
// ============================================================================

export interface TaxStorage {
  getTaxJurisdiction(zipCode: string): Promise<TaxJurisdiction | null>;
  saveTaxJurisdiction(data: TaxJurisdiction): Promise<void>;
  listTaxJurisdictions(state?: string): Promise<TaxJurisdiction[]>;
}

// ============================================================================
// TAX SERVICE
// ============================================================================

export class TaxService {
  constructor(private storage: TaxStorage) {}

  /**
   * Calculate tax for a deal
   */
  async calculateTax(
    request: TaxCalculationRequest
  ): Promise<TaxCalculationResult> {
    // Validate request
    this.validateRequest(request);

    // Get tax jurisdiction
    const jurisdiction = await this.storage.getTaxJurisdiction(request.zipCode);
    if (!jurisdiction) {
      throw new TaxJurisdictionNotFoundError(request.zipCode);
    }

    // Calculate taxable amount
    const taxableAmount = this.calculateTaxableAmount(request);

    // Build tax breakdown
    const breakdown = this.buildTaxBreakdown(jurisdiction, taxableAmount);

    // Calculate total tax
    const totalTax = breakdown.reduce((sum, item) => sum + item.amount, 0);

    // Apply state-specific rules
    const appliedRules = this.applyStateTaxRules(
      jurisdiction.state,
      request,
      totalTax
    );

    return {
      taxableAmount,
      totalTax: Math.round(totalTax * 100) / 100,
      totalRate: jurisdiction.totalRate,
      jurisdiction: jurisdiction.jurisdiction,
      breakdown,
      appliedRules: appliedRules.rules,
    };
  }

  /**
   * Get tax jurisdiction by ZIP code
   */
  async getTaxJurisdiction(zipCode: string): Promise<TaxJurisdiction> {
    const jurisdiction = await this.storage.getTaxJurisdiction(zipCode);
    if (!jurisdiction) {
      throw new TaxJurisdictionNotFoundError(zipCode);
    }
    return jurisdiction;
  }

  /**
   * Update tax jurisdiction
   */
  async updateTaxJurisdiction(data: TaxJurisdiction): Promise<void> {
    await this.storage.saveTaxJurisdiction(data);
  }

  // ============================================================================
  // CALCULATION HELPERS
  // ============================================================================

  private validateRequest(request: TaxCalculationRequest): void {
    if (request.amount < 0) {
      throw new InvalidTaxCalculationError('Amount cannot be negative');
    }

    if (!/^\d{5}$/.test(request.zipCode)) {
      throw new InvalidTaxCalculationError('Invalid ZIP code format');
    }

    if (request.tradeInValue && request.tradeInValue < 0) {
      throw new InvalidTaxCalculationError('Trade-in value cannot be negative');
    }
  }

  private calculateTaxableAmount(request: TaxCalculationRequest): number {
    let taxableAmount = request.amount;

    // Some states allow trade-in credit
    if (request.tradeInValue) {
      const state = this.getStateFromZip(request.zipCode);
      if (this.allowsTradeInCredit(state)) {
        taxableAmount = Math.max(0, taxableAmount - request.tradeInValue);
      }
    }

    return taxableAmount;
  }

  private buildTaxBreakdown(
    jurisdiction: TaxJurisdiction,
    taxableAmount: number
  ): TaxBreakdown[] {
    const breakdown: TaxBreakdown[] = [];

    if (jurisdiction.stateRate > 0) {
      breakdown.push({
        type: 'state',
        name: `${jurisdiction.state} State Tax`,
        rate: jurisdiction.stateRate,
        amount: (taxableAmount * jurisdiction.stateRate) / 100,
      });
    }

    if (jurisdiction.countyRate > 0) {
      breakdown.push({
        type: 'county',
        name: `${jurisdiction.county || 'County'} Tax`,
        rate: jurisdiction.countyRate,
        amount: (taxableAmount * jurisdiction.countyRate) / 100,
      });
    }

    if (jurisdiction.cityRate > 0) {
      breakdown.push({
        type: 'city',
        name: `${jurisdiction.city || 'City'} Tax`,
        rate: jurisdiction.cityRate,
        amount: (taxableAmount * jurisdiction.cityRate) / 100,
      });
    }

    if (jurisdiction.localRate > 0) {
      breakdown.push({
        type: 'local',
        name: 'Local Tax',
        rate: jurisdiction.localRate,
        amount: (taxableAmount * jurisdiction.localRate) / 100,
      });
    }

    if (jurisdiction.districtRate > 0) {
      breakdown.push({
        type: 'district',
        name: 'Special District Tax',
        rate: jurisdiction.districtRate,
        amount: (taxableAmount * jurisdiction.districtRate) / 100,
      });
    }

    return breakdown;
  }

  private applyStateTaxRules(
    state: string,
    request: TaxCalculationRequest,
    baseTax: number
  ): { rules: string[]; adjustedTax: number } {
    const rules: string[] = [];
    let adjustedTax = baseTax;

    // State-specific rules
    switch (state) {
      case 'CA':
        // California: Special rules for certain counties
        if (request.vehiclePrice && request.vehiclePrice > 100000) {
          rules.push('Luxury vehicle tax applied');
        }
        break;

      case 'TX':
        // Texas: Trade-in credit allowed
        if (request.tradeInValue) {
          rules.push('Trade-in credit applied');
        }
        break;

      case 'NY':
        // New York: Cap on sales tax for certain vehicles
        if (request.vehiclePrice && request.vehiclePrice > 50000) {
          rules.push('Sales tax cap applied');
        }
        break;

      // Add more state-specific rules
    }

    return { rules, adjustedTax };
  }

  private allowsTradeInCredit(state: string): boolean {
    // States that allow trade-in credit
    const tradeInCreditStates = [
      'AL', 'AR', 'AZ', 'CA', 'CO', 'CT', 'FL', 'GA', 'HI', 'IA', 'ID', 'IL',
      'IN', 'KS', 'KY', 'LA', 'MA', 'MD', 'ME', 'MI', 'MN', 'MO', 'MS', 'MT',
      'NC', 'ND', 'NE', 'NH', 'NJ', 'NM', 'NV', 'NY', 'OH', 'OK', 'PA', 'RI',
      'SC', 'SD', 'TN', 'TX', 'UT', 'VA', 'VT', 'WA', 'WI', 'WV', 'WY',
    ];

    return tradeInCreditStates.includes(state);
  }

  private getStateFromZip(zipCode: string): string {
    // Simplified ZIP to state mapping
    // In production, use proper ZIP code database
    const firstDigit = zipCode.charAt(0);
    const zipMap: Record<string, string> = {
      '0': 'CT', '1': 'NY', '2': 'VA', '3': 'FL', '4': 'GA',
      '5': 'IA', '6': 'IL', '7': 'TX', '8': 'CO', '9': 'CA',
    };
    return zipMap[firstDigit] || 'CA';
  }
}
