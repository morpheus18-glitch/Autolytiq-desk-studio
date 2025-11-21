/**
 * VEHICLE VALIDATORS
 * Validation utilities for vehicle data
 */

import { vinSchema, type VINValidationResult } from '../types/vehicle.types';

/**
 * Validate VIN format and check digit
 */
export function validateVIN(vin: string): VINValidationResult {
  try {
    vinSchema.parse(vin);
    return { valid: true, checkDigitValid: true };
  } catch (error) {
    const errorMessage = error.errors?.[0]?.message || 'Invalid VIN';
    return { valid: false, error: errorMessage };
  }
}

/**
 * Check if VIN contains valid characters
 */
export function hasValidVINCharacters(vin: string): boolean {
  if (!vin || vin.length !== 17) return false;
  return /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin);
}

/**
 * Extract World Manufacturer Identifier (WMI) from VIN
 * First 3 characters identify the manufacturer
 */
export function extractWMI(vin: string): string | null {
  if (!vin || vin.length < 3) return null;
  return vin.substring(0, 3).toUpperCase();
}

/**
 * Extract Vehicle Descriptor Section (VDS) from VIN
 * Characters 4-8 describe vehicle attributes
 */
export function extractVDS(vin: string): string | null {
  if (!vin || vin.length < 8) return null;
  return vin.substring(3, 8).toUpperCase();
}

/**
 * Extract Vehicle Identifier Section (VIS) from VIN
 * Characters 10-17 are the vehicle identifier
 */
export function extractVIS(vin: string): string | null {
  if (!vin || vin.length < 17) return null;
  return vin.substring(9, 17).toUpperCase();
}

/**
 * Get model year code from VIN (position 10)
 */
export function getModelYearCode(vin: string): string | null {
  if (!vin || vin.length < 10) return null;
  return vin[9].toUpperCase();
}

/**
 * Decode model year from VIN
 */
export function decodeModelYear(vin: string): number | null {
  const yearCode = getModelYearCode(vin);
  if (!yearCode) return null;

  const yearMap: Record<string, number> = {
    A: 2010,
    B: 2011,
    C: 2012,
    D: 2013,
    E: 2014,
    F: 2015,
    G: 2016,
    H: 2017,
    J: 2018,
    K: 2019,
    L: 2020,
    M: 2021,
    N: 2022,
    P: 2023,
    R: 2024,
    S: 2025,
    T: 2026,
    V: 2027,
    W: 2028,
    X: 2029,
    Y: 2030,
    1: 2001,
    2: 2002,
    3: 2003,
    4: 2004,
    5: 2005,
    6: 2006,
    7: 2007,
    8: 2008,
    9: 2009,
  };

  return yearMap[yearCode] || null;
}

/**
 * Get check digit from VIN (position 9)
 */
export function getCheckDigit(vin: string): string | null {
  if (!vin || vin.length < 9) return null;
  return vin[8].toUpperCase();
}

/**
 * Validate stock number format
 */
export function validateStockNumber(stockNumber: string): boolean {
  if (!stockNumber || stockNumber.length === 0) return false;
  if (stockNumber.length < 3 || stockNumber.length > 20) return false;
  return /^[A-Z0-9-]+$/i.test(stockNumber);
}

/**
 * Normalize VIN (uppercase, trim)
 */
export function normalizeVIN(vin: string): string {
  return vin.trim().toUpperCase();
}

/**
 * Normalize stock number (uppercase, trim)
 */
export function normalizeStockNumber(stockNumber: string): string {
  return stockNumber.trim().toUpperCase();
}

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
 * Check if asking price is greater than cost
 */
export function hasValidPricing(cost: number, askingPrice: number): boolean {
  return askingPrice >= cost;
}
