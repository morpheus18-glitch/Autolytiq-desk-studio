/**
 * TEST DATA FACTORIES
 *
 * Factory functions to generate realistic, consistent test data.
 * Ensures referential integrity and realistic data distributions.
 */

import {
  InsertCustomer,
  InsertVehicle,
  InsertDeal,
  InsertDealScenario,
} from '@shared/schema';
import { nanoid } from 'nanoid';

/**
 * Counter for unique identifiers
 */
let customerCounter = 1;
let vehicleCounter = 1;
let dealCounter = 1;

/**
 * Reset counters (useful between test suites)
 */
export function resetCounters() {
  customerCounter = 1;
  vehicleCounter = 1;
  dealCounter = 1;
}

/**
 * Generate realistic customer data
 */
export function createCustomerData(
  dealershipId: string,
  overrides: Partial<InsertCustomer> = {}
): Omit<InsertCustomer, 'id' | 'createdAt' | 'updatedAt'> {
  const num = customerCounter++;
  const firstName = overrides.firstName || `TestFirst${num}`;
  const lastName = overrides.lastName || `TestLast${num}`;

  return {
    dealershipId,
    customerNumber: `C-${String(num).padStart(6, '0')}`,
    firstName,
    lastName,
    email: overrides.email || `customer${num}@test.com`,
    phone: overrides.phone || `555-${String(num).padStart(4, '0')}`,
    address: overrides.address || `${num} Test St`,
    city: overrides.city || 'Los Angeles',
    state: overrides.state || 'CA',
    zipCode: overrides.zipCode || '90210',
    county: overrides.county || 'Los Angeles',
    ...overrides,
  };
}

/**
 * Generate realistic vehicle data
 */
export function createVehicleData(
  dealershipId: string,
  overrides: Partial<InsertVehicle> = {}
): Omit<InsertVehicle, 'id' | 'createdAt' | 'updatedAt'> {
  const num = vehicleCounter++;
  const year = overrides.year || 2024;
  const make = overrides.make || 'Toyota';
  const model = overrides.model || 'Camry';

  return {
    dealershipId,
    stockNumber: overrides.stockNumber || `STK${String(num).padStart(5, '0')}`,
    vin: overrides.vin || `TEST${nanoid(13).toUpperCase()}`,
    year,
    make,
    model,
    trim: overrides.trim || 'LE',
    bodyType: overrides.bodyType || 'Sedan',
    exteriorColor: overrides.exteriorColor || 'Silver',
    interiorColor: overrides.interiorColor || 'Black',
    mileage: overrides.mileage || 15000,
    condition: overrides.condition || 'used',
    status: overrides.status || 'available',
    msrp: overrides.msrp || '32000',
    internetPrice: overrides.internetPrice || '28000',
    invoicePrice: overrides.invoicePrice || '26000',
    costPrice: overrides.costPrice || '25000',
    engine: overrides.engine || '2.5L 4-Cylinder',
    transmission: overrides.transmission || 'Automatic',
    drivetrain: overrides.drivetrain || 'FWD',
    fuelType: overrides.fuelType || 'Gasoline',
    mpgCity: overrides.mpgCity || 28,
    mpgHighway: overrides.mpgHighway || 39,
    description: overrides.description,
    ...overrides,
  };
}

/**
 * Generate realistic deal data
 */
export function createDealData(
  dealershipId: string,
  salespersonId: string,
  overrides: Partial<InsertDeal> = {}
): Omit<InsertDeal, 'id' | 'createdAt' | 'updatedAt'> {
  const num = dealCounter++;

  return {
    dealershipId,
    dealNumber: overrides.dealNumber || `D-${String(num).padStart(6, '0')}`,
    salespersonId,
    customerId: overrides.customerId,
    dealState: overrides.dealState || 'DRAFT',
    dealType: overrides.dealType || 'retail',
    ...overrides,
  };
}

/**
 * Generate realistic deal scenario data
 */
export function createScenarioData(
  dealId: string,
  overrides: Partial<InsertDealScenario> = {}
): Omit<InsertDealScenario, 'id' | 'createdAt' | 'updatedAt'> {
  const scenarioType = overrides.scenarioType || 'finance';
  const vehiclePrice = overrides.vehiclePrice || '28000';
  const downPayment = overrides.downPayment || '5000';
  const term = overrides.term || 60;
  const apr = overrides.apr || '6.99';

  // Calculate monthly payment (simple formula, not exact)
  const principal = parseFloat(vehiclePrice) - parseFloat(downPayment);
  const monthlyRate = parseFloat(apr) / 100 / 12;
  const monthlyPayment = (
    (principal * monthlyRate * Math.pow(1 + monthlyRate, term)) /
    (Math.pow(1 + monthlyRate, term) - 1)
  ).toFixed(2);

  return {
    dealId,
    scenarioType,
    name: overrides.name || `${scenarioType.charAt(0).toUpperCase() + scenarioType.slice(1)} Scenario`,
    isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    vehicleId: overrides.vehicleId,
    vehiclePrice,
    downPayment,
    tradeAllowance: overrides.tradeAllowance || '0',
    tradePayoff: overrides.tradePayoff || '0',
    rebates: overrides.rebates || '0',
    term,
    apr,
    monthlyPayment: overrides.monthlyPayment || monthlyPayment,
    salesTax: overrides.salesTax || '2240', // ~8% of $28k
    dealerFees: overrides.dealerFees || [],
    accessories: overrides.accessories || [],
    aftermarketProducts: overrides.aftermarketProducts || [],
    ...overrides,
  };
}

/**
 * Common test scenarios for quick setup
 */
export const COMMON_SCENARIOS = {
  /**
   * Standard finance deal - new car
   */
  standardFinance: (dealershipId: string, salespersonId: string) => ({
    customer: createCustomerData(dealershipId, {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@test.com',
      zipCode: '90210',
      state: 'CA',
    }),
    vehicle: createVehicleData(dealershipId, {
      year: 2024,
      make: 'Toyota',
      model: 'Camry',
      condition: 'new',
      msrp: '32000',
      internetPrice: '30000',
    }),
    deal: createDealData(dealershipId, salespersonId, {
      dealType: 'retail',
      dealState: 'PENDING',
    }),
    scenario: createScenarioData('', {
      scenarioType: 'finance',
      vehiclePrice: '30000',
      downPayment: '5000',
      term: 60,
      apr: '6.99',
    }),
  }),

  /**
   * Lease deal - luxury vehicle
   */
  luxuryLease: (dealershipId: string, salespersonId: string) => ({
    customer: createCustomerData(dealershipId, {
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@test.com',
      zipCode: '90210',
      state: 'CA',
    }),
    vehicle: createVehicleData(dealershipId, {
      year: 2024,
      make: 'BMW',
      model: 'X5',
      condition: 'new',
      msrp: '65000',
      internetPrice: '62000',
    }),
    deal: createDealData(dealershipId, salespersonId, {
      dealType: 'lease',
    }),
    scenario: createScenarioData('', {
      scenarioType: 'lease',
      vehiclePrice: '62000',
      downPayment: '3000',
      term: 36,
      moneyFactor: '0.00125',
      residualValue: '37200', // 60% residual
    }),
  }),

  /**
   * Cash deal - used vehicle
   */
  cashUsed: (dealershipId: string, salespersonId: string) => ({
    customer: createCustomerData(dealershipId, {
      firstName: 'Mike',
      lastName: 'Davis',
      email: 'mike.davis@test.com',
      zipCode: '90210',
      state: 'CA',
    }),
    vehicle: createVehicleData(dealershipId, {
      year: 2021,
      make: 'Honda',
      model: 'Accord',
      condition: 'used',
      mileage: 35000,
      msrp: '25000',
      internetPrice: '23000',
    }),
    deal: createDealData(dealershipId, salespersonId, {
      dealType: 'cash',
    }),
    scenario: createScenarioData('', {
      scenarioType: 'cash',
      vehiclePrice: '23000',
      downPayment: '23000', // Full payment
      term: 0,
    }),
  }),

  /**
   * Trade-in deal
   */
  withTradeIn: (dealershipId: string, salespersonId: string) => ({
    customer: createCustomerData(dealershipId, {
      firstName: 'Emily',
      lastName: 'Chen',
      email: 'emily.chen@test.com',
      zipCode: '90210',
      state: 'CA',
    }),
    vehicle: createVehicleData(dealershipId, {
      year: 2024,
      make: 'Ford',
      model: 'F-150',
      condition: 'new',
      msrp: '52000',
      internetPrice: '48000',
    }),
    deal: createDealData(dealershipId, salespersonId, {
      dealType: 'retail',
    }),
    scenario: createScenarioData('', {
      scenarioType: 'finance',
      vehiclePrice: '48000',
      downPayment: '3000',
      tradeAllowance: '12000',
      tradePayoff: '8000', // $4k positive equity
      term: 72,
      apr: '5.49',
    }),
  }),
};

/**
 * Edge case scenarios for testing error handling
 */
export const EDGE_CASE_SCENARIOS = {
  /**
   * Negative equity trade
   */
  negativeEquityTrade: (dealershipId: string, salespersonId: string) => ({
    customer: createCustomerData(dealershipId),
    vehicle: createVehicleData(dealershipId),
    deal: createDealData(dealershipId, salespersonId),
    scenario: createScenarioData('', {
      vehiclePrice: '30000',
      downPayment: '2000',
      tradeAllowance: '8000',
      tradePayoff: '12000', // -$4k negative equity
      term: 60,
      apr: '8.99',
    }),
  }),

  /**
   * Zero down payment
   */
  zeroDown: (dealershipId: string, salespersonId: string) => ({
    customer: createCustomerData(dealershipId),
    vehicle: createVehicleData(dealershipId),
    deal: createDealData(dealershipId, salespersonId),
    scenario: createScenarioData('', {
      vehiclePrice: '25000',
      downPayment: '0',
      term: 72,
      apr: '12.99', // Higher rate for zero down
    }),
  }),

  /**
   * High mileage vehicle
   */
  highMileage: (dealershipId: string, salespersonId: string) => ({
    customer: createCustomerData(dealershipId),
    vehicle: createVehicleData(dealershipId, {
      year: 2018,
      mileage: 125000,
      condition: 'used',
      internetPrice: '12000',
    }),
    deal: createDealData(dealershipId, salespersonId),
    scenario: createScenarioData('', {
      vehiclePrice: '12000',
      downPayment: '2000',
      term: 48,
      apr: '9.99',
    }),
  }),
};
