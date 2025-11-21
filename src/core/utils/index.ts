/**
 * Core utilities public API
 *
 * Re-exports all utility functions organized by category.
 * Provides a clean, consolidated interface for common operations.
 */

// ============================================================================
// CRYPTO & AUTHENTICATION
// ============================================================================

export {
  hashPassword,
  comparePasswords,
  generateResetToken,
  hashResetToken,
  generateResetTokenExpiry,
  generateMfaSecret,
  generateQrCodeUrl,
  verifyTotp,
} from './crypto';

// ============================================================================
// VALIDATION
// ============================================================================

export {
  // Email validation
  validateEmailAddress,
  isValidEmail,
  normalizeEmail,
  type EmailValidationResult,

  // Phone validation
  normalizePhone,
  isValidPhone,

  // Address validation
  normalizeZipCode,
  isValidZipCode,
  isValidStateCode,

  // VIN validation
  isValidVIN,
  normalizeVIN,

  // UUID validation
  validateUUID,

  // Name validation
  normalizeName,
  isValidName,

  // SSN validation
  normalizeSsnLast4,
  isValidSsnLast4,

  // Driver's license validation
  normalizeDriversLicense,
  isValidDriversLicense,

  // Vehicle validation
  isValidVehicleYear,
  isReasonableMileage,
  isReasonablePrice,
  isValidStockNumber,
  normalizeStockNumber,
} from './validators';

// ============================================================================
// FORMATTING
// ============================================================================

export {
  // Currency formatting
  formatCurrency,
  formatCurrencyWhole,
  formatCurrencyInput,
  formatCurrencyCompact,
  parseCurrency,

  // Date formatting
  formatDate,
  formatDateLong,
  formatDateTime,
  formatRelativeDate,

  // Phone formatting
  formatPhone,

  // ZIP code formatting
  formatZipCode,

  // Percentage formatting
  formatPercentage,
  formatPercentagePrecise,
  formatDecimalAsPercentage,

  // Number formatting
  formatNumber,
  formatMileage,

  // VIN formatting
  formatVIN,

  // SSN formatting
  formatSsnLast4,

  // Driver's license formatting
  formatDriversLicense,

  // Address formatting
  formatAddressSingleLine,
  formatCityStateZip,

  // Name formatting
  formatFullName,
  formatInitials,
  formatFormalName,

  // Stock number formatting
  formatStockNumber,

  // File size formatting
  formatFileSize,
} from './formatters';

// ============================================================================
// SECURITY
// ============================================================================

// Sanitization utilities
export * from './sanitizers';

// Security logging utilities
export * from './security-logging';

// Email security utilities
export * from './email-security';

// Rate limiting utilities
export * from './rate-limiting';

// ============================================================================
// CALCULATIONS
// ============================================================================

// Financial calculations utilities
export * from './calculations';
