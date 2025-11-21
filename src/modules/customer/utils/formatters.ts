/**
 * CUSTOMER DATA FORMATTERS
 * Format customer data for display
 */

import type { Customer, Address } from '../types/customer.types';
import { formatPhoneForDisplay, formatZipCode } from './validators';

// ============================================================================
// NAME FORMATTING
// ============================================================================

/**
 * Get full customer name
 */
export function getFullName(customer: Partial<Customer>): string {
  const parts: string[] = [];

  if (customer.firstName) parts.push(customer.firstName);
  if (customer.middleName) parts.push(customer.middleName);
  if (customer.lastName) parts.push(customer.lastName);
  if (customer.suffix) parts.push(customer.suffix);

  return parts.join(' ');
}

/**
 * Get customer initials
 */
export function getInitials(customer: Partial<Customer>): string {
  const parts: string[] = [];

  if (customer.firstName) parts.push(customer.firstName[0]);
  if (customer.lastName) parts.push(customer.lastName[0]);

  return parts.join('').toUpperCase();
}

/**
 * Get formal name (Last, First Middle)
 */
export function getFormalName(customer: Partial<Customer>): string {
  const parts: string[] = [];

  if (customer.lastName) parts.push(customer.lastName + ',');
  if (customer.firstName) parts.push(customer.firstName);
  if (customer.middleName) parts.push(customer.middleName);
  if (customer.suffix) parts.push(customer.suffix);

  return parts.join(' ');
}

// ============================================================================
// CONTACT FORMATTING
// ============================================================================

/**
 * Format phone number for display
 */
export function formatPhone(phone: string | undefined): string {
  if (!phone) return '';
  return formatPhoneForDisplay(phone);
}

/**
 * Format email for display (lowercase)
 */
export function formatEmail(email: string | undefined): string {
  if (!email) return '';
  return email.toLowerCase();
}

/**
 * Get primary contact method
 */
export function getPrimaryContact(customer: Partial<Customer>): string {
  if (customer.preferredContactMethod === 'email' && customer.email) {
    return formatEmail(customer.email);
  }

  if (
    (customer.preferredContactMethod === 'phone' ||
      customer.preferredContactMethod === 'sms') &&
    customer.phone
  ) {
    return formatPhone(customer.phone);
  }

  // Fallback to whatever is available
  return customer.email || formatPhone(customer.phone) || 'No contact info';
}

// ============================================================================
// ADDRESS FORMATTING
// ============================================================================

/**
 * Format address as single line
 */
export function formatAddressSingleLine(address: Address | undefined): string {
  if (!address) return '';

  const parts: string[] = [];

  if (address.street) parts.push(address.street);
  if (address.city) parts.push(address.city);
  if (address.state) parts.push(address.state);
  if (address.zipCode) parts.push(formatZipCode(address.zipCode));

  return parts.join(', ');
}

/**
 * Format address as multiple lines
 */
export function formatAddressMultiLine(address: Address | undefined): string[] {
  if (!address) return [];

  const lines: string[] = [];

  if (address.street) lines.push(address.street);

  const cityStateZip: string[] = [];
  if (address.city) cityStateZip.push(address.city);
  if (address.state) cityStateZip.push(address.state);
  if (address.zipCode) cityStateZip.push(formatZipCode(address.zipCode));

  if (cityStateZip.length > 0) {
    lines.push(cityStateZip.join(', '));
  }

  return lines;
}

/**
 * Format city, state ZIP
 */
export function formatCityStateZip(address: Address | undefined): string {
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
// VEHICLE FORMATTING
// ============================================================================

/**
 * Format vehicle as string (Year Make Model Trim)
 */
export function formatVehicle(vehicle: {
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
}): string {
  if (!vehicle) return '';

  const parts: string[] = [];

  if (vehicle.year) parts.push(String(vehicle.year));
  if (vehicle.make) parts.push(vehicle.make);
  if (vehicle.model) parts.push(vehicle.model);
  if (vehicle.trim) parts.push(vehicle.trim);

  return parts.join(' ');
}

/**
 * Format vehicle with VIN
 */
export function formatVehicleWithVin(vehicle: {
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  vin?: string;
}): string {
  if (!vehicle) return '';

  const vehicleStr = formatVehicle(vehicle);

  if (vehicle.vin) {
    return `${vehicleStr} (VIN: ${vehicle.vin})`;
  }

  return vehicleStr;
}

/**
 * Format mileage with commas
 */
export function formatMileage(mileage: number | undefined): string {
  if (mileage === undefined || mileage === null) return '';
  return `${mileage.toLocaleString()} mi`;
}

// ============================================================================
// CURRENCY FORMATTING
// ============================================================================

/**
 * Format currency (USD)
 */
export function formatCurrency(amount: number | undefined): string {
  if (amount === undefined || amount === null) return '';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
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

// ============================================================================
// STATUS FORMATTING
// ============================================================================

/**
 * Format customer status for display
 */
export function formatCustomerStatus(status: string | undefined): string {
  if (!status) return '';

  const statusMap: Record<string, string> = {
    lead: 'Lead',
    prospect: 'Prospect',
    qualified: 'Qualified',
    active: 'Active',
    sold: 'Sold',
    lost: 'Lost',
    inactive: 'Inactive',
    archived: 'Archived',
  };

  return statusMap[status] || status;
}

/**
 * Get status color/variant
 */
export function getStatusColor(
  status: string | undefined
): 'default' | 'primary' | 'success' | 'warning' | 'error' {
  if (!status) return 'default';

  const colorMap: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
    lead: 'default',
    prospect: 'primary',
    qualified: 'primary',
    active: 'success',
    sold: 'success',
    lost: 'error',
    inactive: 'warning',
    archived: 'default',
  };

  return colorMap[status] || 'default';
}

// ============================================================================
// CREDIT FORMATTING
// ============================================================================

/**
 * Format credit score
 */
export function formatCreditScore(score: number | undefined): string {
  if (!score) return 'N/A';
  return String(score);
}

/**
 * Get credit score rating
 */
export function getCreditScoreRating(score: number | undefined): string {
  if (!score) return 'Unknown';

  if (score >= 800) return 'Exceptional';
  if (score >= 740) return 'Very Good';
  if (score >= 670) return 'Good';
  if (score >= 580) return 'Fair';
  return 'Poor';
}

/**
 * Get credit score color
 */
export function getCreditScoreColor(
  score: number | undefined
): 'success' | 'primary' | 'warning' | 'error' | 'default' {
  if (!score) return 'default';

  if (score >= 740) return 'success';
  if (score >= 670) return 'primary';
  if (score >= 580) return 'warning';
  return 'error';
}

// ============================================================================
// MASKED DATA
// ============================================================================

/**
 * Mask SSN last 4 for display
 */
export function formatSsnLast4(ssnLast4: string | undefined): string {
  if (!ssnLast4) return '';
  return `***-**-${ssnLast4}`;
}

/**
 * Mask driver's license
 */
export function formatDriversLicense(
  licenseNumber: string | undefined,
  state: string | undefined
): string {
  if (!licenseNumber) return '';

  const masked =
    licenseNumber.length > 4
      ? `***${licenseNumber.slice(-4)}`
      : licenseNumber;

  if (state) {
    return `${state} ${masked}`;
  }

  return masked;
}

// ============================================================================
// SEARCH/DISPLAY
// ============================================================================

/**
 * Get customer display name with highlights
 */
export function getDisplayName(customer: Partial<Customer>, searchTerm?: string): string {
  const fullName = getFullName(customer);

  if (!searchTerm) return fullName;

  // Simple highlight logic (can be enhanced with HTML)
  return fullName;
}

/**
 * Get customer summary (for lists, dropdowns)
 */
export function getCustomerSummary(customer: Partial<Customer>): string {
  const parts: string[] = [];

  parts.push(getFullName(customer));

  if (customer.email) {
    parts.push(customer.email);
  } else if (customer.phone) {
    parts.push(formatPhone(customer.phone));
  }

  if (customer.customerNumber) {
    parts.push(`(${customer.customerNumber})`);
  }

  return parts.join(' - ');
}
