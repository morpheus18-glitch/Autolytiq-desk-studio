/**
 * TAX MODULE PUBLIC API - ENHANCED VERSION 2.0
 *
 * This is the ONLY file that should be imported from outside the tax module.
 *
 * CRITICAL UPDATES (Version 2.0):
 * - All monetary values use decimal strings for precision
 * - Full audit trail for every calculation
 * - Database-driven jurisdiction lookup
 * - Centralized state-specific rules
 * - Comprehensive validation
 *
 * Usage:
 * import { EnhancedTaxService, DatabaseTaxStorage } from '@/modules/tax';
 *
 * const storage = new DatabaseTaxStorage(db);
 * const taxService = new EnhancedTaxService(storage);
 *
 * const result = await taxService.calculateSalesTax({
 *   dealershipId: '...',
 *   vehiclePrice: '35000.00',
 *   zipCode: '90210',
 *   state: 'CA',
 *   tradeInValue: '10000.00',
 *   userId: '...',
 * });
 */

// ============================================================================
// SERVICES (Enhanced Version 2.0)
// ============================================================================

export { EnhancedTaxService } from './services/enhanced-tax.service';
export type { TaxStorage } from './services/enhanced-tax.service';

export { JurisdictionService } from './services/jurisdiction.service';
export { StateRulesService } from './services/state-rules.service';

// ============================================================================
// STORAGE ADAPTERS
// ============================================================================

export { DatabaseTaxStorage } from './storage/database-storage';

// ============================================================================
// TYPES (Enhanced)
// ============================================================================

export type {
  // Jurisdiction
  Jurisdiction,
  TaxRateBreakdown,

  // Sales Tax
  SalesTaxRequest,
  SalesTaxResult,

  // Deal Tax
  DealTaxRequest,
  CompleteTaxBreakdown,
  DealFee,

  // Trade-In
  TradeInParams,
  TradeInCreditResult,

  // Registration
  RegistrationRequest,
  RegistrationFeeResult,

  // State Rules
  StateSpecificRules,

  // Audit Trail
  TaxAuditTrail,
  TaxAuditLog,

  // Validation
  ValidationResult,
  ValidationError,
  ValidationWarning,
  TaxCalculationValidation,

  // Decimal
  Decimal,
} from './types/enhanced-tax.types';

// ============================================================================
// SCHEMAS (Validation)
// ============================================================================

export {
  salesTaxRequestSchema,
  dealTaxRequestSchema,
  moneySchema,
} from './types/enhanced-tax.types';

// ============================================================================
// ERRORS
// ============================================================================

export {
  TaxCalculationError,
  JurisdictionNotFoundError,
  InvalidTaxCalculationError,
  UnsupportedStateError,
  ValidationFailedError,
} from './types/enhanced-tax.types';

// ============================================================================
// UTILITIES
// ============================================================================

export { DecimalCalculator } from './utils/decimal-calculator';
export {
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
} from './utils/decimal-calculator';

// ============================================================================
// LEGACY SUPPORT (Version 1.0)
// ============================================================================

// Keep legacy exports for backward compatibility
// These will be deprecated in a future version

export { TaxService } from './services/tax.service';
export type {
  TaxCalculationRequest,
  TaxCalculationResult,
  TaxJurisdiction,
  TaxBreakdown,
  TaxRule,
} from './types/tax.types';

export {
  TaxError,
  TaxJurisdictionNotFoundError as LegacyJurisdictionNotFoundError,
  InvalidTaxCalculationError as LegacyInvalidTaxCalculationError,
} from './types/tax.types';

export { taxCalculationRequestSchema as legacyTaxCalculationRequestSchema } from './types/tax.types';

// ============================================================================
// VERSION INFO
// ============================================================================

export const TAX_MODULE_VERSION = '2.0.0';
export const TAX_MODULE_NAME = 'Enhanced Tax Calculation System';

/**
 * Migration Notes:
 *
 * If you're currently using TaxService (v1.0), here's how to migrate:
 *
 * OLD (v1.0):
 * ```typescript
 * const taxService = new TaxService(storage);
 * const result = await taxService.calculateTax({
 *   amount: 35000,
 *   zipCode: '90210',
 *   vehiclePrice: 35000,
 *   tradeInValue: 10000,
 * });
 * ```
 *
 * NEW (v2.0):
 * ```typescript
 * const storage = new DatabaseTaxStorage(db);
 * const taxService = new EnhancedTaxService(storage);
 * const result = await taxService.calculateSalesTax({
 *   dealershipId: 'dealership-uuid',
 *   vehiclePrice: '35000.00',  // String for precision
 *   zipCode: '90210',
 *   state: 'CA',
 *   tradeInValue: '10000.00',  // String for precision
 *   userId: 'user-uuid',
 * });
 * ```
 *
 * Key Differences:
 * 1. All money values are strings (decimal precision)
 * 2. More explicit input parameters
 * 3. Full audit trail
 * 4. Enhanced validation
 * 5. Better error messages
 */
