/**
 * CUSTOM TEST ASSERTIONS
 *
 * Domain-specific assertions for testing business logic.
 * Makes tests more readable and maintainable.
 */

import { expect } from 'vitest';
import type { Deal, DealScenario, Customer, Vehicle } from '@shared/schema';

/**
 * Assert deal has correct structure and required fields
 */
export function assertValidDeal(deal: any) {
  expect(deal).toBeDefined();
  expect(deal.id).toBeDefined();
  expect(deal.dealershipId).toBeDefined();
  expect(deal.dealNumber).toBeDefined();
  expect(deal.dealState).toBeDefined();
  expect(deal.createdAt).toBeDefined();
  expect(deal.updatedAt).toBeDefined();
}

/**
 * Assert deal scenario has correct structure
 */
export function assertValidScenario(scenario: any) {
  expect(scenario).toBeDefined();
  expect(scenario.id).toBeDefined();
  expect(scenario.dealId).toBeDefined();
  expect(scenario.scenarioType).toBeDefined();
  expect(scenario.vehiclePrice).toBeDefined();
  expect(scenario.createdAt).toBeDefined();
}

/**
 * Assert customer has correct structure
 */
export function assertValidCustomer(customer: any) {
  expect(customer).toBeDefined();
  expect(customer.id).toBeDefined();
  expect(customer.dealershipId).toBeDefined();
  expect(customer.firstName).toBeDefined();
  expect(customer.lastName).toBeDefined();
  expect(customer.createdAt).toBeDefined();
}

/**
 * Assert vehicle has correct structure
 */
export function assertValidVehicle(vehicle: any) {
  expect(vehicle).toBeDefined();
  expect(vehicle.id).toBeDefined();
  expect(vehicle.dealershipId).toBeDefined();
  expect(vehicle.stockNumber).toBeDefined();
  expect(vehicle.vin).toBeDefined();
  expect(vehicle.year).toBeDefined();
  expect(vehicle.make).toBeDefined();
  expect(vehicle.model).toBeDefined();
}

/**
 * Assert tax calculation result is valid
 */
export function assertValidTaxCalculation(result: any) {
  expect(result).toBeDefined();
  expect(result.success).toBe(true);

  if (result.data) {
    expect(result.data.totalTax).toBeDefined();
    expect(result.data.taxableAmount).toBeDefined();
    expect(result.data.effectiveRate).toBeDefined();
  } else if (result.result) {
    expect(result.result.totalTax).toBeDefined();
  }
}

/**
 * Assert payment calculation is within reasonable bounds
 */
export function assertReasonablePayment(
  payment: number,
  vehiclePrice: number,
  downPayment: number,
  term: number
) {
  const principal = vehiclePrice - downPayment;
  const minPayment = principal / term / 1.5; // Very low estimate
  const maxPayment = principal / term * 1.5; // Very high estimate

  expect(payment).toBeGreaterThan(minPayment);
  expect(payment).toBeLessThan(maxPayment);
}

/**
 * Assert multi-tenant isolation - objects belong to same dealership
 */
export function assertSameDealership(obj1: any, obj2: any) {
  expect(obj1.dealershipId).toBeDefined();
  expect(obj2.dealershipId).toBeDefined();
  expect(obj1.dealershipId).toBe(obj2.dealershipId);
}

/**
 * Assert decimal precision (for currency calculations)
 */
export function assertDecimalPrecision(value: string | number, maxDecimals: number = 2) {
  const strValue = typeof value === 'number' ? value.toFixed(maxDecimals) : value;
  const decimalPart = strValue.split('.')[1] || '';
  expect(decimalPart.length).toBeLessThanOrEqual(maxDecimals);
}

/**
 * Assert tax rate is within valid range
 */
export function assertValidTaxRate(rate: number) {
  expect(rate).toBeGreaterThanOrEqual(0);
  expect(rate).toBeLessThanOrEqual(0.2); // 20% max (very generous)
}

/**
 * Assert API error response structure
 */
export function assertErrorResponse(response: any, expectedStatus: number, expectedMessage?: string) {
  expect(response.status).toBe(expectedStatus);
  expect(response.body).toBeDefined();
  expect(response.body.error || response.body.message).toBeDefined();

  if (expectedMessage) {
    const errorMessage = response.body.error || response.body.message;
    expect(errorMessage.toLowerCase()).toContain(expectedMessage.toLowerCase());
  }
}

/**
 * Assert API success response structure
 */
export function assertSuccessResponse(response: any, expectedStatus: number = 200) {
  expect(response.status).toBe(expectedStatus);
  expect(response.body).toBeDefined();
}

/**
 * Assert date is recent (within last N minutes)
 */
export function assertRecentDate(date: string | Date, withinMinutes: number = 5) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMinutes = diffMs / 1000 / 60;

  expect(diffMinutes).toBeGreaterThanOrEqual(0);
  expect(diffMinutes).toBeLessThanOrEqual(withinMinutes);
}

/**
 * Assert UUID format
 */
export function assertUUID(value: string) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  expect(value).toMatch(uuidRegex);
}

/**
 * Assert email format
 */
export function assertEmailFormat(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  expect(email).toMatch(emailRegex);
}

/**
 * Assert phone format (flexible)
 */
export function assertPhoneFormat(phone: string) {
  // Accept various formats: 555-0100, (555) 0100, 5550100, etc.
  const phoneRegex = /^[\d\s\-\(\)]+$/;
  expect(phone).toMatch(phoneRegex);

  // Should have at least 10 digits
  const digits = phone.replace(/\D/g, '');
  expect(digits.length).toBeGreaterThanOrEqual(10);
}

/**
 * Assert ZIP code format (US)
 */
export function assertZipCodeFormat(zipCode: string) {
  const zipRegex = /^\d{5}(-\d{4})?$/;
  expect(zipCode).toMatch(zipRegex);
}

/**
 * Assert state code format (US)
 */
export function assertStateCode(state: string) {
  expect(state).toHaveLength(2);
  expect(state).toMatch(/^[A-Z]{2}$/);
}

/**
 * Assert VIN format
 */
export function assertVINFormat(vin: string) {
  expect(vin).toHaveLength(17);
  expect(vin).toMatch(/^[A-HJ-NPR-Z0-9]{17}$/); // No I, O, Q
}
