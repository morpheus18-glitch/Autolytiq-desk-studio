/**
 * Currency formatting and parsing utilities
 * Following best practices for money input fields
 */

/**
 * Format a number as currency with 2 decimal places
 * @param value - Number to format
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "—";
  }
  
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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
    return "";
  }
  
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Parse a currency string to a number
 * Handles various formats: "1234.56", "1,234.56", "$1,234.56"
 * @param value - String to parse
 * @returns Parsed number or null if invalid
 */
export function parseCurrency(value: string): number | null {
  if (!value || value.trim() === "") {
    return null;
  }
  
  // Remove all non-numeric characters except decimal point
  const cleanValue = value.replace(/[^0-9.]/g, "");
  
  if (cleanValue === "" || cleanValue === ".") {
    return null;
  }
  
  const parsed = parseFloat(cleanValue);
  
  return isNaN(parsed) ? null : parsed;
}

/**
 * Validate if a string is a valid partial or complete currency input
 * Allows: "", "1", "1.", "1.2", "1.23" but not "1.234" or "abc"
 * @param value - String to validate
 * @returns True if valid
 */
export function isValidCurrencyInput(value: string): boolean {
  // Allow empty string
  if (value === "") return true;
  
  // Allow digits, optional single decimal point, max 2 decimal places
  return /^[0-9]*\.?[0-9]{0,2}$/.test(value);
}

/**
 * Format a raw input string to 2 decimal places
 * Use this on blur to clean up partial inputs
 * @param value - Raw input string
 * @returns Formatted string with 2 decimals or empty string
 */
export function formatCurrencyOnBlur(value: string): string {
  const parsed = parseCurrency(value);
  
  if (parsed === null) {
    return "";
  }
  
  return parsed.toFixed(2);
}

/**
 * Parse scenario field value to number for CurrencyField
 * Preserves zero values (unlike || null pattern which collapses zero to null)
 * @param value - String or number from scenario
 * @returns Parsed number or null
 */
export function parseScenarioNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(parsed) ? null : parsed;
}
