/**
 * Formatting utilities
 *
 * Consolidated formatting functions for currency, dates, phone, percentages, etc.
 * Provides consistent display formatting across the application.
 */

// ============================================================================
// CURRENCY FORMATTING
// ============================================================================

/**
 * Format a number as currency with 2 decimal places
 * @param value - Number to format
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a number as currency without decimal places (for whole dollar amounts)
 * @param value - Number to format
 * @returns Formatted currency string (e.g., "$1,234")
 */
export function formatCurrencyWhole(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a number as currency without the dollar sign
 * Useful for input fields
 * @param value - Number to format
 * @returns Formatted number string (e.g., "1,234.56")
 */
export function formatCurrencyInput(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format currency compact (with K, M abbreviations)
 */
export function formatCurrencyCompact(amount: number | undefined): string {
  if (amount === undefined || amount === null) return '';

  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }

  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }

  return formatCurrency(amount);
}

/**
 * Parse a currency string to a number
 * Handles various formats: "1234.56", "1,234.56", "$1,234.56"
 * @param value - String to parse
 * @returns Parsed number or null if invalid
 */
export function parseCurrency(value: string): number | null {
  if (!value || value.trim() === '') {
    return null;
  }

  // Remove all non-numeric characters except decimal point
  const cleanValue = value.replace(/[^0-9.]/g, '');

  if (cleanValue === '' || cleanValue === '.') {
    return null;
  }

  const parsed = parseFloat(cleanValue);

  return isNaN(parsed) ? null : parsed;
}

// ============================================================================
// DATE FORMATTING
// ============================================================================

/**
 * Format date as MM/DD/YYYY
 */
export function formatDate(date: string | Date | undefined): string {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) return '';

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Format date as MMM D, YYYY (e.g., "Jan 1, 2024")
 */
export function formatDateLong(date: string | Date | undefined): string {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) return '';

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

/**
 * Format date with time
 */
export function formatDateTime(date: string | Date | undefined): string {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) return '';

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

/**
 * Format date as relative (e.g., "2 days ago", "in 3 days")
 */
export function formatRelativeDate(date: string | Date | undefined): string {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0) return `In ${diffDays} days`;
  return `${Math.abs(diffDays)} days ago`;
}

// ============================================================================
// PHONE FORMATTING
// ============================================================================

/**
 * Format phone number for display (US format)
 */
export function formatPhone(phone: string | undefined): string {
  if (!phone) return '';

  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  // US number: (555) 123-4567
  if (digits.length === 10) {
    const areaCode = digits.slice(0, 3);
    const prefix = digits.slice(3, 6);
    const lineNumber = digits.slice(6, 10);
    return `(${areaCode}) ${prefix}-${lineNumber}`;
  }

  // US number with country code: (555) 123-4567
  if (digits.length === 11 && digits[0] === '1') {
    const areaCode = digits.slice(1, 4);
    const prefix = digits.slice(4, 7);
    const lineNumber = digits.slice(7, 11);
    return `(${areaCode}) ${prefix}-${lineNumber}`;
  }

  // International or unknown format - return normalized
  return phone.startsWith('+') ? phone : `+${digits}`;
}

// ============================================================================
// ZIP CODE FORMATTING
// ============================================================================

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

// ============================================================================
// PERCENTAGE FORMATTING
// ============================================================================

/**
 * Format number as percentage with 1 decimal place
 */
export function formatPercentage(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return '—';

  return `${value.toFixed(1)}%`;
}

/**
 * Format number as percentage with 2 decimal places
 */
export function formatPercentagePrecise(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return '—';

  return `${value.toFixed(2)}%`;
}

/**
 * Format decimal as percentage (multiply by 100)
 * @param value Decimal value (e.g., 0.0525 for 5.25%)
 */
export function formatDecimalAsPercentage(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return '—';

  return `${(value * 100).toFixed(2)}%`;
}

// ============================================================================
// NUMBER FORMATTING
// ============================================================================

/**
 * Format number with thousand separators
 */
export function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return '—';

  return value.toLocaleString('en-US');
}

/**
 * Format mileage with commas
 */
export function formatMileage(mileage: number | undefined): string {
  if (mileage === undefined || mileage === null) return '';
  return `${mileage.toLocaleString()} mi`;
}

// ============================================================================
// VIN FORMATTING
// ============================================================================

/**
 * Format VIN for display (with spacing)
 */
export function formatVIN(vin: string): string {
  if (!vin || vin.length !== 17) return vin;
  // Format as: XXX XXXX XX XXXXXX
  return `${vin.substring(0, 3)} ${vin.substring(3, 7)} ${vin.substring(7, 9)} ${vin.substring(9)}`;
}

// ============================================================================
// SSN FORMATTING
// ============================================================================

/**
 * Mask SSN last 4 for display
 */
export function formatSsnLast4(ssnLast4: string | undefined): string {
  if (!ssnLast4) return '';
  return `***-**-${ssnLast4}`;
}

// ============================================================================
// DRIVER'S LICENSE FORMATTING
// ============================================================================

/**
 * Mask driver's license
 */
export function formatDriversLicense(
  licenseNumber: string | undefined,
  state: string | undefined
): string {
  if (!licenseNumber) return '';

  const masked = licenseNumber.length > 4 ? `***${licenseNumber.slice(-4)}` : licenseNumber;

  if (state) {
    return `${state} ${masked}`;
  }

  return masked;
}

// ============================================================================
// ADDRESS FORMATTING
// ============================================================================

/**
 * Format address as single line
 */
export function formatAddressSingleLine(address: {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}): string {
  if (!address) return '';

  const parts: string[] = [];

  if (address.street) parts.push(address.street);
  if (address.city) parts.push(address.city);
  if (address.state) parts.push(address.state);
  if (address.zipCode) parts.push(formatZipCode(address.zipCode));

  return parts.join(', ');
}

/**
 * Format city, state ZIP
 */
export function formatCityStateZip(address: {
  city?: string;
  state?: string;
  zipCode?: string;
}): string {
  if (!address) return '';

  const parts: string[] = [];

  if (address.city && address.state) {
    parts.push(`${address.city}, ${address.state}`);
  } else if (address.city) {
    parts.push(address.city);
  } else if (address.state) {
    parts.push(address.state);
  }

  if (address.zipCode) {
    parts.push(formatZipCode(address.zipCode));
  }

  return parts.join(' ');
}

// ============================================================================
// NAME FORMATTING
// ============================================================================

/**
 * Get full name from parts
 */
export function formatFullName(
  firstName?: string,
  middleName?: string,
  lastName?: string,
  suffix?: string
): string {
  const parts: string[] = [];

  if (firstName) parts.push(firstName);
  if (middleName) parts.push(middleName);
  if (lastName) parts.push(lastName);
  if (suffix) parts.push(suffix);

  return parts.join(' ');
}

/**
 * Get initials from name
 */
export function formatInitials(firstName?: string, lastName?: string): string {
  const parts: string[] = [];

  if (firstName) parts.push(firstName[0]);
  if (lastName) parts.push(lastName[0]);

  return parts.join('').toUpperCase();
}

/**
 * Get formal name (Last, First Middle)
 */
export function formatFormalName(
  firstName?: string,
  middleName?: string,
  lastName?: string,
  suffix?: string
): string {
  const parts: string[] = [];

  if (lastName) parts.push(lastName + ',');
  if (firstName) parts.push(firstName);
  if (middleName) parts.push(middleName);
  if (suffix) parts.push(suffix);

  return parts.join(' ');
}

// ============================================================================
// STOCK NUMBER FORMATTING
// ============================================================================

/**
 * Format stock number for display
 */
export function formatStockNumber(stockNumber: string): string {
  return stockNumber.toUpperCase();
}

// ============================================================================
// FILE SIZE FORMATTING
// ============================================================================

/**
 * Format file size in bytes to human readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
