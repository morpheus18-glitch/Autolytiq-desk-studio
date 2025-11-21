/**
 * Input validation utilities
 *
 * Consolidated validation functions for email, phone, VIN, UUID, and other inputs.
 * Provides security-focused validation with comprehensive checks.
 */

import validator from 'validator';

// ============================================================================
// EMAIL VALIDATION
// ============================================================================

/**
 * Result of email address validation
 */
export interface EmailValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validate email address format, TLD, and disposable domain
 * @param email Email address to validate
 * @returns Validation result with reason if invalid
 */
export function validateEmailAddress(email: string): EmailValidationResult {
  // Basic format validation
  if (!validator.isEmail(email)) {
    return { valid: false, reason: 'Invalid email format' };
  }

  // Check for disposable/temporary email domains
  const disposableDomains = [
    'tempmail.com',
    'guerrillamail.com',
    '10minutemail.com',
    'throwaway.email',
    'mailinator.com',
    'trashmail.com',
  ];

  const domain = email.split('@')[1];
  if (disposableDomains.includes(domain)) {
    return { valid: false, reason: 'Disposable email address not allowed' };
  }

  // Check for valid TLD
  const tld = domain.split('.').pop();
  if (!tld || tld.length < 2) {
    return { valid: false, reason: 'Invalid top-level domain' };
  }

  return { valid: true };
}

/**
 * Simple email format validation (returns boolean)
 * @param email Email address to validate
 * @returns True if valid email format
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;

  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

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

/**
 * Normalize email (lowercase, trim)
 */
export function normalizeEmail(email: string): string {
  if (!email) return '';
  return email.toLowerCase().trim();
}

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
// ZIP CODE VALIDATION
// ============================================================================

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
    'AL',
    'AK',
    'AZ',
    'AR',
    'CA',
    'CO',
    'CT',
    'DE',
    'FL',
    'GA',
    'HI',
    'ID',
    'IL',
    'IN',
    'IA',
    'KS',
    'KY',
    'LA',
    'ME',
    'MD',
    'MA',
    'MI',
    'MN',
    'MS',
    'MO',
    'MT',
    'NE',
    'NV',
    'NH',
    'NJ',
    'NM',
    'NY',
    'NC',
    'ND',
    'OH',
    'OK',
    'OR',
    'PA',
    'RI',
    'SC',
    'SD',
    'TN',
    'TX',
    'UT',
    'VT',
    'VA',
    'WA',
    'WV',
    'WI',
    'WY',
    'DC',
    'PR',
    'VI',
    'GU',
    'AS',
    'MP',
  ]);

  return validStates.has(stateCode.toUpperCase());
}

// ============================================================================
// VIN VALIDATION
// ============================================================================

/**
 * Validate VIN format (17 characters, no I, O, Q)
 */
export function isValidVIN(vin: string): boolean {
  if (!vin || vin.length !== 17) return false;
  return /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin);
}

/**
 * Normalize VIN (uppercase, trim)
 */
export function normalizeVIN(vin: string): string {
  return vin.trim().toUpperCase();
}

// ============================================================================
// UUID VALIDATION
// ============================================================================

/**
 * Validate UUID v4 format (SQL injection prevention)
 * @param uuid UUID string to validate
 * @returns True if valid UUID v4 format
 */
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
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
// VEHICLE VALIDATION
// ============================================================================

/**
 * Check if year is valid vehicle year
 */
export function isValidVehicleYear(year: number): boolean {
  const currentYear = new Date().getFullYear();
  return year >= 1900 && year <= currentYear + 2;
}

/**
 * Check if mileage is reasonable
 */
export function isReasonableMileage(year: number, mileage: number): boolean {
  if (mileage < 0) return false;
  if (mileage > 500000) return false; // 500k miles is extremely high

  // New vehicles should have low mileage
  const currentYear = new Date().getFullYear();
  if (year === currentYear && mileage > 100) return false;

  return true;
}

/**
 * Validate price is reasonable
 */
export function isReasonablePrice(price: number): boolean {
  return price >= 0 && price <= 10000000; // $10M max
}

/**
 * Validate stock number format
 */
export function isValidStockNumber(stockNumber: string): boolean {
  if (!stockNumber || stockNumber.length === 0) return false;
  if (stockNumber.length < 3 || stockNumber.length > 20) return false;
  return /^[A-Z0-9-]+$/i.test(stockNumber);
}

/**
 * Normalize stock number (uppercase, trim)
 */
export function normalizeStockNumber(stockNumber: string): string {
  return stockNumber.trim().toUpperCase();
}
