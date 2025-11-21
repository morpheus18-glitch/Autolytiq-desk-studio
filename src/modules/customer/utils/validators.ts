/**
 * CUSTOMER VALIDATION UTILITIES
 * Phone, email, address validation and normalization
 */

import type { Address, ValidationResult } from '../types/customer.types';

// ============================================================================
// PHONE NUMBER VALIDATION
// ============================================================================

/**
 * Normalize phone number to E.164 format
 * Handles US and international numbers
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';

  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  // US number without country code (10 digits)
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // US number with country code (11 digits starting with 1)
  if (digits.length === 11 && digits[0] === '1') {
    return `+${digits}`;
  }

  // International number
  if (digits.length >= 10 && digits.length <= 15) {
    return phone.startsWith('+') ? phone : `+${digits}`;
  }

  // Invalid - return as-is
  return phone;
}

/**
 * Format phone number for display (US format)
 */
export function formatPhoneForDisplay(phone: string): string {
  if (!phone) return '';

  const normalized = normalizePhone(phone);
  const digits = normalized.replace(/\D/g, '');

  // US number: (555) 123-4567
  if (digits.length === 11 && digits[0] === '1') {
    const areaCode = digits.slice(1, 4);
    const prefix = digits.slice(4, 7);
    const lineNumber = digits.slice(7, 11);
    return `(${areaCode}) ${prefix}-${lineNumber}`;
  }

  // International or unknown format - return normalized
  return normalized;
}

/**
 * Validate phone number format
 */
export function isValidPhone(phone: string): boolean {
  if (!phone) return false;

  const digits = phone.replace(/\D/g, '');

  // Must be between 10-15 digits
  if (digits.length < 10 || digits.length > 15) {
    return false;
  }

  // Must not start with 0
  if (digits[0] === '0') {
    return false;
  }

  return true;
}

// ============================================================================
// EMAIL VALIDATION
// ============================================================================

/**
 * Normalize email (lowercase, trim)
 */
export function normalizeEmail(email: string): string {
  if (!email) return '';
  return email.toLowerCase().trim();
}

/**
 * Validate email format (comprehensive RFC 5322 subset)
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;

  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(email)) {
    return false;
  }

  // Additional checks
  const [localPart, domain] = email.split('@');

  // Local part max 64 chars
  if (localPart.length > 64) {
    return false;
  }

  // Domain max 255 chars
  if (domain.length > 255) {
    return false;
  }

  // Domain must have at least one dot
  if (!domain.includes('.')) {
    return false;
  }

  return true;
}

// ============================================================================
// ADDRESS VALIDATION
// ============================================================================

/**
 * Normalize address fields
 */
export function normalizeAddress(address: Address): Address {
  return {
    street: address.street.trim(),
    city: address.city.trim(),
    state: address.state.toUpperCase().trim(),
    zipCode: normalizeZipCode(address.zipCode),
    county: address.county?.trim(),
    country: address.country || 'US',
  };
}

/**
 * Normalize ZIP code (remove formatting, ensure 5 digits)
 */
export function normalizeZipCode(zipCode: string): string {
  if (!zipCode) return '';

  // Remove all non-digits
  const digits = zipCode.replace(/\D/g, '');

  // Take first 5 digits
  return digits.slice(0, 5);
}

/**
 * Format ZIP code for display (5 or 5+4 format)
 */
export function formatZipCode(zipCode: string): string {
  if (!zipCode) return '';

  const digits = zipCode.replace(/\D/g, '');

  if (digits.length === 5) {
    return digits;
  }

  if (digits.length === 9) {
    return `${digits.slice(0, 5)}-${digits.slice(5, 9)}`;
  }

  return zipCode;
}

/**
 * Validate US ZIP code
 */
export function isValidZipCode(zipCode: string): boolean {
  if (!zipCode) return false;

  const digits = zipCode.replace(/\D/g, '');

  // Must be exactly 5 or 9 digits
  return digits.length === 5 || digits.length === 9;
}

/**
 * Validate US state code
 */
export function isValidStateCode(stateCode: string): boolean {
  if (!stateCode) return false;

  const validStates = new Set([
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
    'DC', 'PR', 'VI', 'GU', 'AS', 'MP',
  ]);

  return validStates.has(stateCode.toUpperCase());
}

// ============================================================================
// NAME VALIDATION
// ============================================================================

/**
 * Normalize name (capitalize first letter, lowercase rest)
 */
export function normalizeName(name: string): string {
  if (!name) return '';

  return name
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (word.length === 0) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Validate name (no numbers, reasonable length)
 */
export function isValidName(name: string): boolean {
  if (!name) return false;

  // Must be between 1 and 50 characters
  if (name.length < 1 || name.length > 50) {
    return false;
  }

  // No numbers allowed
  if (/\d/.test(name)) {
    return false;
  }

  return true;
}

// ============================================================================
// DRIVER'S LICENSE VALIDATION
// ============================================================================

/**
 * Normalize driver's license number (uppercase, alphanumeric)
 */
export function normalizeDriversLicense(licenseNumber: string): string {
  if (!licenseNumber) return '';

  // Remove all non-alphanumeric characters
  return licenseNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase();
}

/**
 * Validate driver's license number (basic format check)
 */
export function isValidDriversLicense(licenseNumber: string, state?: string): boolean {
  if (!licenseNumber) return false;

  const normalized = normalizeDriversLicense(licenseNumber);

  // Must be between 1 and 20 characters
  if (normalized.length < 1 || normalized.length > 20) {
    return false;
  }

  // State-specific validation could be added here
  // For now, just basic alphanumeric check
  return /^[A-Z0-9]+$/.test(normalized);
}

// ============================================================================
// SSN VALIDATION
// ============================================================================

/**
 * Normalize SSN last 4 (digits only)
 */
export function normalizeSsnLast4(ssnLast4: string): string {
  if (!ssnLast4) return '';

  // Remove all non-digits
  return ssnLast4.replace(/\D/g, '').slice(0, 4);
}

/**
 * Validate SSN last 4 digits
 */
export function isValidSsnLast4(ssnLast4: string): boolean {
  if (!ssnLast4) return false;

  const digits = ssnLast4.replace(/\D/g, '');

  // Must be exactly 4 digits
  return digits.length === 4;
}

// ============================================================================
// COMPOSITE VALIDATION
// ============================================================================

/**
 * Validate complete customer data
 * Returns validation result with errors and warnings
 */
export function validateCustomerData(data: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: Partial<Address>;
  driversLicenseNumber?: string;
  driversLicenseState?: string;
  ssnLast4?: string;
}): ValidationResult {
  const errors: ValidationResult['errors'] = [];
  const warnings: ValidationResult['warnings'] = [];

  // First name
  if (!data.firstName) {
    errors.push({
      field: 'firstName',
      message: 'First name is required',
      code: 'REQUIRED',
    });
  } else if (!isValidName(data.firstName)) {
    errors.push({
      field: 'firstName',
      message: 'Invalid first name format',
      code: 'INVALID_FORMAT',
    });
  }

  // Last name
  if (!data.lastName) {
    errors.push({
      field: 'lastName',
      message: 'Last name is required',
      code: 'REQUIRED',
    });
  } else if (!isValidName(data.lastName)) {
    errors.push({
      field: 'lastName',
      message: 'Invalid last name format',
      code: 'INVALID_FORMAT',
    });
  }

  // Email (optional but must be valid if provided)
  if (data.email && !isValidEmail(data.email)) {
    errors.push({
      field: 'email',
      message: 'Invalid email format',
      code: 'INVALID_FORMAT',
    });
  }

  // Phone (optional but must be valid if provided)
  if (data.phone && !isValidPhone(data.phone)) {
    errors.push({
      field: 'phone',
      message: 'Invalid phone number format',
      code: 'INVALID_FORMAT',
    });
  }

  // At least email or phone required
  if (!data.email && !data.phone) {
    errors.push({
      field: 'email',
      message: 'Either email or phone is required',
      code: 'REQUIRED_ONE_OF',
    });
  }

  // Address validation
  if (data.address) {
    if (data.address.state && !isValidStateCode(data.address.state)) {
      errors.push({
        field: 'address.state',
        message: 'Invalid state code',
        code: 'INVALID_FORMAT',
      });
    }

    if (data.address.zipCode && !isValidZipCode(data.address.zipCode)) {
      errors.push({
        field: 'address.zipCode',
        message: 'Invalid ZIP code',
        code: 'INVALID_FORMAT',
      });
    }
  }

  // Driver's license
  if (data.driversLicenseNumber) {
    if (!isValidDriversLicense(data.driversLicenseNumber, data.driversLicenseState)) {
      errors.push({
        field: 'driversLicenseNumber',
        message: 'Invalid driver\'s license number',
        code: 'INVALID_FORMAT',
      });
    }

    if (!data.driversLicenseState) {
      warnings.push({
        field: 'driversLicenseState',
        message: 'Driver\'s license state is recommended when license number is provided',
        code: 'RECOMMENDED',
      });
    }
  }

  // SSN last 4
  if (data.ssnLast4 && !isValidSsnLast4(data.ssnLast4)) {
    errors.push({
      field: 'ssnLast4',
      message: 'SSN last 4 must be exactly 4 digits',
      code: 'INVALID_FORMAT',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
