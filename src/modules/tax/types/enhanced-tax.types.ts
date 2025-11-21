/**
 * ENHANCED TAX MODULE TYPES - BULLETPROOF TAX CALCULATIONS
 *
 * CRITICAL: All monetary values use string representation to preserve precision.
 * Use Decimal.js for ALL calculations. NEVER use JavaScript number arithmetic.
 *
 * Financial/Legal Requirements:
 * 1. Penny-accurate calculations (no floating point errors)
 * 2. Full audit trail (who, when, what inputs)
 * 3. Reproducible calculations
 * 4. Jurisdiction-based rules
 * 5. Itemized tax breakdown
 */

import { z } from 'zod';
import Decimal from 'decimal.js';

// ============================================================================
// DECIMAL PRECISION CONFIGURATION
// ============================================================================

/**
 * Decimal.js configuration for money calculations
 * - Precision: 20 decimal places (more than enough for currency)
 * - Rounding: ROUND_HALF_UP (standard banking rounding)
 */
export const MONEY_DECIMAL_CONFIG = {
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -9e15,
  toExpPos: 9e15,
} as const;

/**
 * Money string schema - must be parseable as decimal
 */
export const moneySchema = z.string().refine(
  (val) => {
    try {
      new Decimal(val);
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Invalid money format' }
);

// ============================================================================
// JURISDICTION TYPES
// ============================================================================

export interface Jurisdiction {
  id: string;
  zipCode: string;
  state: string;
  county?: string;
  city?: string;
  specialDistrict?: string;
  effectiveDate: Date;
  endDate?: Date;
  source?: string;
  lastVerified?: Date;
}

export interface TaxRateBreakdown {
  // Rates stored as decimals (e.g., "0.0825" for 8.25%)
  stateRate: string;
  countyRate: string;
  cityRate: string;
  specialDistrictRate: string;
  totalRate: string;
  effectiveDate: Date;
}

// ============================================================================
// SALES TAX CALCULATION
// ============================================================================

export interface SalesTaxRequest {
  // Required fields
  dealershipId: string;
  vehiclePrice: string; // Decimal string
  zipCode: string;
  state: string;
  userId?: string; // For audit trail

  // Optional fields
  county?: string;
  city?: string;
  tradeInValue?: string; // Decimal string
  rebateManufacturer?: string; // Decimal string
  rebateDealer?: string; // Decimal string

  // Metadata
  dealId?: string;
  calculationDate?: Date;
}

export const salesTaxRequestSchema = z.object({
  dealershipId: z.string().uuid(),
  vehiclePrice: moneySchema,
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/),
  state: z.string().length(2),
  userId: z.string().uuid().optional(),
  county: z.string().optional(),
  city: z.string().optional(),
  tradeInValue: moneySchema.optional(),
  rebateManufacturer: moneySchema.optional(),
  rebateDealer: moneySchema.optional(),
  dealId: z.string().uuid().optional(),
  calculationDate: z.date().optional(),
});

export interface SalesTaxResult {
  // Total tax (penny-accurate)
  totalTax: string; // Decimal string

  // Itemized breakdown
  breakdown: {
    stateTax: string; // Decimal string
    countyTax: string; // Decimal string
    cityTax: string; // Decimal string
    specialDistrictTax: string; // Decimal string
  };

  // Rate breakdown
  taxRate: TaxRateBreakdown;

  // Calculation details
  taxableAmount: string; // After trade-in credit (Decimal string)
  jurisdiction: Jurisdiction;

  // Audit trail
  calculatedAt: Date;
  calculatedBy?: string;
  calculationId: string; // UUID for audit trail
}

// ============================================================================
// STATE-SPECIFIC RULES
// ============================================================================

export interface StateSpecificRules {
  stateCode: string;

  // Trade-in credit
  allowsTradeInCredit: boolean;
  tradeInCreditCap?: string; // Decimal string (e.g., Michigan's $2,000 cap)
  tradeInCreditPercent?: string; // Decimal string (e.g., "0.80" for 80%)

  // Doc fee
  docFeeMax?: string; // Decimal string
  docFeeCapped: boolean;
  docFeeTaxable: boolean;

  // Registration and title
  registrationBased: 'vehicleValue' | 'vehicleWeight' | 'flat' | 'custom';
  titleFee: string; // Decimal string
  titleFeeTaxable: boolean;

  // Fee taxability
  serviceContractsTaxable: boolean;
  gapTaxable: boolean;
  accessoriesTaxable: boolean;

  // Rebate treatment
  manufacturerRebateTaxable: boolean;
  dealerRebateTaxable: boolean;

  // Special schemes
  specialScheme?: 'TAVT' | 'HUT' | 'PRIVILEGE_TAX' | 'STANDARD';

  // Notes
  notes?: string;
  lastUpdated: Date;
  version: number;
}

// ============================================================================
// FEES AND CHARGES
// ============================================================================

export interface DealFee {
  code: string; // e.g., "DOC_FEE", "TITLE", "REG", "SERVICE_CONTRACT", "GAP"
  name: string;
  amount: string; // Decimal string
  taxable: boolean;
}

export interface RegistrationRequest {
  state: string;
  vehicleValue?: string; // Decimal string
  vehicleWeight?: number; // In pounds
  vehicleYear?: number;
  vehicleType?: 'auto' | 'truck' | 'motorcycle' | 'rv' | 'trailer';
}

export interface RegistrationFeeResult {
  baseFee: string; // Decimal string
  additionalFees: DealFee[];
  totalFee: string; // Decimal string
  breakdown: string[]; // Description of fee components
}

// ============================================================================
// TRADE-IN CREDIT CALCULATION
// ============================================================================

export interface TradeInParams {
  state: string;
  tradeInValue: string; // Decimal string
  vehiclePrice: string; // Decimal string
  stateRules: StateSpecificRules;
}

export interface TradeInCreditResult {
  creditAllowed: boolean;
  creditAmount: string; // Decimal string
  cappedAmount?: string; // If capped, the original amount before cap
  percentApplied?: string; // If percentage-based credit
  taxableAmount: string; // Vehicle price - credit (Decimal string)
  appliedRule: string; // Description of rule applied
}

// ============================================================================
// COMPLETE DEAL TAX CALCULATION
// ============================================================================

export interface DealTaxRequest {
  // Deal identification
  dealId: string;
  dealershipId: string;
  userId: string;

  // Vehicle and pricing
  vehiclePrice: string; // Decimal string
  accessories: DealFee[];

  // Trade-in
  tradeInValue?: string; // Decimal string

  // Rebates
  rebateManufacturer?: string; // Decimal string
  rebateDealer?: string; // Decimal string

  // Fees
  docFee?: string; // Decimal string
  otherFees: DealFee[];

  // Products
  serviceContracts?: string; // Decimal string
  gap?: string; // Decimal string

  // Location
  zipCode: string;
  state: string;
  county?: string;
  city?: string;

  // Metadata
  calculationDate?: Date;
}

export const dealTaxRequestSchema = z.object({
  dealId: z.string().uuid(),
  dealershipId: z.string().uuid(),
  userId: z.string().uuid(),
  vehiclePrice: moneySchema,
  accessories: z.array(z.object({
    code: z.string(),
    name: z.string(),
    amount: moneySchema,
    taxable: z.boolean(),
  })),
  tradeInValue: moneySchema.optional(),
  rebateManufacturer: moneySchema.optional(),
  rebateDealer: moneySchema.optional(),
  docFee: moneySchema.optional(),
  otherFees: z.array(z.object({
    code: z.string(),
    name: z.string(),
    amount: moneySchema,
    taxable: z.boolean(),
  })),
  serviceContracts: moneySchema.optional(),
  gap: moneySchema.optional(),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/),
  state: z.string().length(2),
  county: z.string().optional(),
  city: z.string().optional(),
  calculationDate: z.date().optional(),
});

export interface CompleteTaxBreakdown {
  // Sales tax
  salesTax: SalesTaxResult;

  // Fees
  docFee: string; // Decimal string
  registrationFee: string; // Decimal string
  titleFee: string; // Decimal string
  otherFees: DealFee[];

  // Totals
  totalTaxesAndFees: string; // Decimal string
  totalTaxable: string; // Sum of all taxable amounts (Decimal string)
  totalNonTaxable: string; // Sum of all non-taxable amounts (Decimal string)

  // Audit trail
  auditTrail: TaxAuditTrail;

  // Validation
  validated: boolean;
  validationErrors: string[];
}

// ============================================================================
// AUDIT TRAIL
// ============================================================================

export interface TaxAuditTrail {
  calculationId: string; // UUID
  dealId?: string;
  dealershipId: string;
  calculatedBy: string; // User ID
  calculatedAt: Date;

  // Complete snapshot of inputs
  inputs: {
    vehiclePrice: string;
    tradeInValue?: string;
    rebates?: {
      manufacturer?: string;
      dealer?: string;
    };
    fees: DealFee[];
    products?: {
      serviceContracts?: string;
      gap?: string;
    };
    jurisdiction: {
      zipCode: string;
      state: string;
      county?: string;
      city?: string;
    };
  };

  // Complete snapshot of outputs
  outputs: {
    totalTax: string;
    totalFees: string;
    breakdown: {
      stateTax: string;
      countyTax: string;
      cityTax: string;
      specialDistrictTax: string;
    };
  };

  // Rules applied
  rulesApplied: {
    stateRules: StateSpecificRules;
    jurisdiction: Jurisdiction;
    taxRates: TaxRateBreakdown;
    tradeInCredit?: TradeInCreditResult;
  };

  // System metadata
  engineVersion: string;
  stateRulesVersion: number;
}

export interface TaxAuditLog {
  id: string;
  dealId?: string;
  dealershipId: string;
  calculationType: 'SALES_TAX' | 'COMPLETE_DEAL' | 'REGISTRATION' | 'TITLE';
  auditTrail: TaxAuditTrail;
  createdAt: Date;
}

// ============================================================================
// VALIDATION
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  severity: 'error' | 'critical';
}

export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
}

export interface TaxCalculationValidation {
  // Breakdown sum validation
  breakdownSumMatchesTotal: boolean;
  sumDifference?: string; // If mismatch, the difference (Decimal string)

  // Rate validation
  rateWithinBounds: boolean;
  totalRate: string; // Decimal string
  rateLimit: string; // Maximum reasonable rate (Decimal string, e.g., "0.15" for 15%)

  // Amount validation
  taxableAmountValid: boolean;
  taxableAmountReason?: string;

  // Jurisdiction validation
  jurisdictionFound: boolean;
  jurisdictionCurrent: boolean; // Not expired

  // Overall
  allChecksPass: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class TaxCalculationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'TaxCalculationError';
  }
}

export class JurisdictionNotFoundError extends TaxCalculationError {
  constructor(zipCode: string) {
    super(
      `Tax jurisdiction not found for ZIP code: ${zipCode}`,
      'JURISDICTION_NOT_FOUND',
      404,
      { zipCode }
    );
  }
}

export class InvalidTaxCalculationError extends TaxCalculationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'INVALID_CALCULATION', 400, details);
  }
}

export class UnsupportedStateError extends TaxCalculationError {
  constructor(state: string) {
    super(
      `Tax calculations not supported for state: ${state}`,
      'UNSUPPORTED_STATE',
      400,
      { state }
    );
  }
}

export class ValidationFailedError extends TaxCalculationError {
  constructor(errors: ValidationError[]) {
    super(
      'Tax calculation validation failed',
      'VALIDATION_FAILED',
      400,
      { errors }
    );
  }
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type { Decimal };
