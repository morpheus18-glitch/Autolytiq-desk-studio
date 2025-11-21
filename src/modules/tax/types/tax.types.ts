/**
 * TAX MODULE TYPES
 * Centralized type definitions for tax calculations
 */

import { z } from 'zod';

// ============================================================================
// TAX CALCULATION TYPES
// ============================================================================

export interface TaxCalculationRequest {
  amount: number;
  zipCode: string;
  vehiclePrice?: number;
  tradeInValue?: number;
  customerId?: string;
  dealershipId?: string;
}

export interface TaxBreakdown {
  type: 'state' | 'county' | 'city' | 'local' | 'district';
  name: string;
  rate: number;
  amount: number;
}

export interface TaxCalculationResult {
  taxableAmount: number;
  totalTax: number;
  totalRate: number;
  jurisdiction: string;
  breakdown: TaxBreakdown[];
  appliedRules: string[];
}

export interface TaxJurisdiction {
  id: string;
  zipCode: string;
  state: string;
  county?: string;
  city?: string;
  stateRate: number;
  countyRate: number;
  cityRate: number;
  localRate: number;
  districtRate: number;
  totalRate: number;
  jurisdiction: string;
  effectiveDate: Date;
  updatedAt: Date;
}

// ============================================================================
// TAX RULES
// ============================================================================

export interface TaxRule {
  id: string;
  state: string;
  ruleType: 'trade_in_credit' | 'cap_amount' | 'exemption' | 'special_rate';
  description: string;
  applies: (context: TaxCalculationRequest) => boolean;
  calculate: (context: TaxCalculationRequest, baseTax: number) => number;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const taxCalculationRequestSchema = z.object({
  amount: z.number().min(0),
  zipCode: z.string().length(5, 'ZIP code must be 5 digits'),
  vehiclePrice: z.number().min(0).optional(),
  tradeInValue: z.number().min(0).optional(),
  customerId: z.string().uuid().optional(),
  dealershipId: z.string().uuid().optional(),
});

// ============================================================================
// ERROR TYPES
// ============================================================================

export class TaxError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'TaxError';
  }
}

export class TaxJurisdictionNotFoundError extends TaxError {
  constructor(zipCode: string) {
    super(
      `Tax jurisdiction not found for ZIP code: ${zipCode}`,
      'JURISDICTION_NOT_FOUND',
      404
    );
  }
}

export class InvalidTaxCalculationError extends TaxError {
  constructor(message: string) {
    super(message, 'INVALID_CALCULATION', 400);
  }
}
