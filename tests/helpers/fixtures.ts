/**
 * Test Fixtures
 *
 * Comprehensive factory functions for generating test data.
 * All factories support overrides for customization.
 *
 * Uses @faker-js/faker for realistic test data generation.
 */

import { faker } from '@faker-js/faker';

// ============================================================================
// USER FIXTURES
// ============================================================================

export type UserRole = 'admin' | 'manager' | 'salesperson' | 'viewer';

export interface MockUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  dealershipId: string;
  mfaEnabled: boolean;
  mfaSecret: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  return {
    id: faker.string.uuid(),
    email: faker.internet.email({ firstName, lastName }).toLowerCase(),
    name: `${firstName} ${lastName}`,
    passwordHash: '$2a$10$' + faker.string.alphanumeric(53), // bcrypt hash format
    role: 'salesperson',
    dealershipId: faker.string.uuid(),
    mfaEnabled: false,
    mfaSecret: null,
    emailVerified: true,
    createdAt: faker.date.past(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockAdmin(overrides: Partial<MockUser> = {}): MockUser {
  return createMockUser({ role: 'admin', ...overrides });
}

export function createMockManager(overrides: Partial<MockUser> = {}): MockUser {
  return createMockUser({ role: 'manager', ...overrides });
}

// ============================================================================
// DEALERSHIP FIXTURES
// ============================================================================

export interface MockDealership {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  website: string | null;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export function createMockDealership(overrides: Partial<MockDealership> = {}): MockDealership {
  const companyName = faker.company.name();
  const state = faker.location.state({ abbreviated: true });

  return {
    id: faker.string.uuid(),
    name: `${companyName} Motors`,
    address: faker.location.streetAddress(),
    city: faker.location.city(),
    state,
    zipCode: faker.location.zipCode(),
    phone: faker.phone.number({ style: 'national' }),
    email: faker.internet.email({ provider: 'dealership.com' }).toLowerCase(),
    website: faker.internet.url(),
    settings: {
      taxRate: 0.0625,
      defaultTermMonths: 60,
      requireMfaForAdmin: true,
    },
    createdAt: faker.date.past(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ============================================================================
// CUSTOMER FIXTURES
// ============================================================================

export interface MockCustomer {
  id: string;
  dealershipId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  ssn: string | null;
  driversLicense: string | null;
  dateOfBirth: string | null;
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function createMockCustomer(overrides: Partial<MockCustomer> = {}): MockCustomer {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const state = faker.location.state({ abbreviated: true });

  return {
    id: faker.string.uuid(),
    dealershipId: faker.string.uuid(),
    firstName,
    lastName,
    email: faker.internet.email({ firstName, lastName }).toLowerCase(),
    phone: faker.phone.number({ style: 'national' }),
    ssn: null, // PII - not included by default
    driversLicense: null,
    dateOfBirth: null,
    addressStreet: faker.location.streetAddress(),
    addressCity: faker.location.city(),
    addressState: state,
    addressZip: faker.location.zipCode(),
    notes: null,
    createdAt: faker.date.past(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockCustomerWithPII(overrides: Partial<MockCustomer> = {}): MockCustomer {
  const birthDate = faker.date.birthdate({ min: 21, max: 70, mode: 'age' });

  return createMockCustomer({
    ssn: faker.string.numeric(9),
    driversLicense: `${faker.location.state({ abbreviated: true })}${faker.string.numeric(8)}`,
    dateOfBirth: birthDate.toISOString().split('T')[0],
    ...overrides,
  });
}

// ============================================================================
// VEHICLE FIXTURES
// ============================================================================

export type VehicleStatus = 'available' | 'sold' | 'pending' | 'service' | 'wholesale';
export type VehicleCondition = 'new' | 'used' | 'certified';

export interface MockVehicle {
  id: string;
  dealershipId: string;
  vin: string;
  stockNumber: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  color: string;
  mileage: number;
  price: number; // cents
  cost: number | null; // cents
  status: VehicleStatus;
  condition: VehicleCondition;
  createdAt: Date;
  updatedAt: Date;
}

const MAKES_MODELS = {
  Toyota: ['Camry', 'Corolla', 'RAV4', 'Highlander', 'Tacoma', 'Tundra', '4Runner'],
  Honda: ['Accord', 'Civic', 'CR-V', 'Pilot', 'HR-V', 'Odyssey'],
  Ford: ['F-150', 'Explorer', 'Escape', 'Mustang', 'Bronco', 'Edge'],
  Chevrolet: ['Silverado', 'Equinox', 'Tahoe', 'Camaro', 'Traverse', 'Malibu'],
  BMW: ['3 Series', '5 Series', 'X3', 'X5', 'X7', 'M3'],
  'Mercedes-Benz': ['C-Class', 'E-Class', 'GLC', 'GLE', 'S-Class', 'A-Class'],
  Audi: ['A4', 'A6', 'Q5', 'Q7', 'e-tron', 'RS6'],
  Tesla: ['Model 3', 'Model Y', 'Model S', 'Model X'],
};

export function createMockVehicle(overrides: Partial<MockVehicle> = {}): MockVehicle {
  const makes = Object.keys(MAKES_MODELS);
  const make = faker.helpers.arrayElement(makes);
  const models = MAKES_MODELS[make as keyof typeof MAKES_MODELS];
  const model = faker.helpers.arrayElement(models);
  const year = faker.number.int({ min: 2019, max: 2025 });
  const condition = year === 2025 || year === 2024 ? 'new' : 'used';
  const mileage = condition === 'new' ? faker.number.int({ min: 0, max: 100 }) : faker.number.int({ min: 5000, max: 100000 });

  // Price in cents (realistic for automotive)
  const basePrice = condition === 'new' ? 35000 : 25000;
  const priceVariation = faker.number.int({ min: -10000, max: 20000 });
  const price = (basePrice + priceVariation) * 100;
  const cost = Math.round(price * 0.85); // ~15% margin

  return {
    id: faker.string.uuid(),
    dealershipId: faker.string.uuid(),
    vin: faker.vehicle.vin(),
    stockNumber: `STK${faker.string.numeric(5)}`,
    year,
    make,
    model,
    trim: faker.helpers.arrayElement(['Base', 'LE', 'SE', 'XLE', 'Limited', 'Sport', null]),
    color: faker.vehicle.color(),
    mileage,
    price,
    cost,
    status: 'available',
    condition,
    createdAt: faker.date.past(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockNewVehicle(overrides: Partial<MockVehicle> = {}): MockVehicle {
  return createMockVehicle({
    year: 2025,
    mileage: faker.number.int({ min: 0, max: 50 }),
    condition: 'new',
    ...overrides,
  });
}

export function createMockUsedVehicle(overrides: Partial<MockVehicle> = {}): MockVehicle {
  return createMockVehicle({
    year: faker.number.int({ min: 2019, max: 2023 }),
    mileage: faker.number.int({ min: 15000, max: 80000 }),
    condition: 'used',
    ...overrides,
  });
}

// ============================================================================
// DEAL FIXTURES
// ============================================================================

export type DealType = 'cash' | 'finance' | 'lease';
export type DealStatus = 'draft' | 'pending' | 'approved' | 'funded' | 'delivered' | 'cancelled';

export interface MockDeal {
  id: string;
  dealershipId: string;
  customerId: string;
  vehicleId: string | null;
  salespersonId: string | null;
  dealType: DealType;
  status: DealStatus;
  vehiclePrice: number; // cents
  tradeInValue: number; // cents
  tradeInPayoff: number; // cents
  downPayment: number; // cents
  rebates: number; // cents
  apr: number; // percentage (e.g., 5.99)
  termMonths: number;
  taxRate: number; // percentage (e.g., 0.0625 for 6.25%)
  amountFinanced: number | null; // cents
  monthlyPayment: number | null; // cents
  totalOfPayments: number | null; // cents
  totalInterest: number | null; // cents
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function createMockDeal(overrides: Partial<MockDeal> = {}): MockDeal {
  const vehiclePrice = faker.number.int({ min: 20000, max: 80000 }) * 100; // $20k-$80k
  const tradeInValue = faker.helpers.maybe(() => faker.number.int({ min: 5000, max: 20000 }) * 100, { probability: 0.5 }) ?? 0;
  const tradeInPayoff = tradeInValue > 0 ? faker.number.int({ min: 0, max: Math.floor(tradeInValue / 100 * 0.7) }) * 100 : 0;
  const downPayment = faker.number.int({ min: 1000, max: 10000 }) * 100;
  const rebates = faker.helpers.maybe(() => faker.number.int({ min: 500, max: 3000 }) * 100, { probability: 0.3 }) ?? 0;
  const apr = Number((faker.number.float({ min: 3.99, max: 12.99 })).toFixed(2));
  const termMonths = faker.helpers.arrayElement([36, 48, 60, 72, 84]);
  const taxRate = Number((faker.number.float({ min: 0.04, max: 0.1 })).toFixed(4));

  // Calculate derived values
  const netTrade = tradeInValue - tradeInPayoff;
  const taxableAmount = vehiclePrice - tradeInValue + rebates;
  const taxAmount = Math.round(taxableAmount * taxRate);
  const amountFinanced = vehiclePrice - netTrade - downPayment - rebates + taxAmount;

  // Calculate monthly payment using standard amortization formula
  const monthlyRate = apr / 100 / 12;
  const monthlyPayment = monthlyRate > 0
    ? Math.round(
        amountFinanced *
          (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
          (Math.pow(1 + monthlyRate, termMonths) - 1)
      )
    : Math.round(amountFinanced / termMonths);

  const totalOfPayments = monthlyPayment * termMonths;
  const totalInterest = totalOfPayments - amountFinanced;

  return {
    id: faker.string.uuid(),
    dealershipId: faker.string.uuid(),
    customerId: faker.string.uuid(),
    vehicleId: faker.string.uuid(),
    salespersonId: faker.string.uuid(),
    dealType: 'finance',
    status: 'draft',
    vehiclePrice,
    tradeInValue,
    tradeInPayoff,
    downPayment,
    rebates,
    apr,
    termMonths,
    taxRate,
    amountFinanced,
    monthlyPayment,
    totalOfPayments,
    totalInterest,
    notes: null,
    createdAt: faker.date.past(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockCashDeal(overrides: Partial<MockDeal> = {}): MockDeal {
  const vehiclePrice = faker.number.int({ min: 20000, max: 80000 }) * 100;
  const tradeInValue = faker.helpers.maybe(() => faker.number.int({ min: 5000, max: 20000 }) * 100, { probability: 0.5 }) ?? 0;
  const tradeInPayoff = tradeInValue > 0 ? faker.number.int({ min: 0, max: Math.floor(tradeInValue / 100 * 0.7) }) * 100 : 0;
  const taxRate = Number((faker.number.float({ min: 0.04, max: 0.1 })).toFixed(4));
  const taxableAmount = vehiclePrice - tradeInValue;
  const taxAmount = Math.round(taxableAmount * taxRate);

  return createMockDeal({
    dealType: 'cash',
    apr: 0,
    termMonths: 0,
    downPayment: vehiclePrice - (tradeInValue - tradeInPayoff) + taxAmount,
    amountFinanced: 0,
    monthlyPayment: 0,
    totalOfPayments: vehiclePrice - (tradeInValue - tradeInPayoff) + taxAmount,
    totalInterest: 0,
    vehiclePrice,
    tradeInValue,
    tradeInPayoff,
    taxRate,
    ...overrides,
  });
}

export function createMockLeaseDeal(overrides: Partial<MockDeal> = {}): MockDeal {
  return createMockDeal({
    dealType: 'lease',
    termMonths: faker.helpers.arrayElement([24, 36, 39, 48]),
    ...overrides,
  });
}

// ============================================================================
// CREDIT PROFILE FIXTURES
// ============================================================================

export type CreditRiskTier = 'prime' | 'near_prime' | 'subprime' | 'deep_subprime';
export type CreditBureau = 'equifax' | 'experian' | 'transunion';

export interface MockCreditProfile {
  id: string;
  customerId: string;
  ssn: string | null;
  creditScore: number;
  creditBureau: CreditBureau;
  riskTier: CreditRiskTier;
  monthlyIncome: number; // cents
  totalDebt: number; // cents
  debtToIncome: number;
  employmentStatus: string;
  employerName: string | null;
  yearsEmployed: number | null;
  lastCheckedAt: Date;
  expiresAt: Date;
  rawReport: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function getCreditRiskTier(score: number): CreditRiskTier {
  if (score >= 720) return 'prime';
  if (score >= 660) return 'near_prime';
  if (score >= 580) return 'subprime';
  return 'deep_subprime';
}

export function createMockCreditProfile(overrides: Partial<MockCreditProfile> = {}): MockCreditProfile {
  const creditScore = faker.number.int({ min: 500, max: 850 });
  const monthlyIncome = faker.number.int({ min: 3000, max: 15000 }) * 100; // $3k-$15k
  const totalDebt = faker.number.int({ min: 0, max: 50000 }) * 100;
  const debtToIncome = Number((totalDebt / monthlyIncome).toFixed(2));
  const lastCheckedAt = faker.date.recent({ days: 30 });
  const expiresAt = new Date(lastCheckedAt);
  expiresAt.setDate(expiresAt.getDate() + 30);

  return {
    id: faker.string.uuid(),
    customerId: faker.string.uuid(),
    ssn: null, // PII - not included by default
    creditScore,
    creditBureau: faker.helpers.arrayElement(['equifax', 'experian', 'transunion']),
    riskTier: getCreditRiskTier(creditScore),
    monthlyIncome,
    totalDebt,
    debtToIncome,
    employmentStatus: faker.helpers.arrayElement(['employed', 'self_employed', 'retired', 'unemployed']),
    employerName: faker.company.name(),
    yearsEmployed: faker.number.int({ min: 0, max: 30 }),
    lastCheckedAt,
    expiresAt,
    rawReport: null,
    createdAt: faker.date.past(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockPrimeCreditProfile(overrides: Partial<MockCreditProfile> = {}): MockCreditProfile {
  return createMockCreditProfile({
    creditScore: faker.number.int({ min: 720, max: 850 }),
    riskTier: 'prime',
    ...overrides,
  });
}

export function createMockSubprimeCreditProfile(overrides: Partial<MockCreditProfile> = {}): MockCreditProfile {
  return createMockCreditProfile({
    creditScore: faker.number.int({ min: 580, max: 659 }),
    riskTier: 'subprime',
    ...overrides,
  });
}

// ============================================================================
// AUTH FIXTURES
// ============================================================================

export interface MockAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export function createMockAuthTokens(overrides: Partial<MockAuthTokens> = {}): MockAuthTokens {
  return {
    accessToken: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${faker.string.alphanumeric(100)}.${faker.string.alphanumeric(43)}`,
    refreshToken: faker.string.alphanumeric(64),
    expiresIn: 900, // 15 minutes
    ...overrides,
  };
}

export interface MockLoginRequest {
  email: string;
  password: string;
  mfaCode?: string;
}

export function createMockLoginRequest(overrides: Partial<MockLoginRequest> = {}): MockLoginRequest {
  return {
    email: faker.internet.email().toLowerCase(),
    password: faker.internet.password({ length: 12 }),
    ...overrides,
  };
}

// ============================================================================
// BATCH CREATION HELPERS
// ============================================================================

export function createMockUsers(count: number, overrides: Partial<MockUser> = {}): MockUser[] {
  return Array.from({ length: count }, () => createMockUser(overrides));
}

export function createMockCustomers(count: number, overrides: Partial<MockCustomer> = {}): MockCustomer[] {
  return Array.from({ length: count }, () => createMockCustomer(overrides));
}

export function createMockVehicles(count: number, overrides: Partial<MockVehicle> = {}): MockVehicle[] {
  return Array.from({ length: count }, () => createMockVehicle(overrides));
}

export function createMockDeals(count: number, overrides: Partial<MockDeal> = {}): MockDeal[] {
  return Array.from({ length: count }, () => createMockDeal(overrides));
}

// ============================================================================
// SCENARIO BUILDERS
// ============================================================================

/**
 * Creates a complete dealership scenario with users, customers, vehicles, and deals
 */
export function createDealershipScenario(options: {
  userCount?: number;
  customerCount?: number;
  vehicleCount?: number;
  dealCount?: number;
} = {}) {
  const { userCount = 3, customerCount = 10, vehicleCount = 20, dealCount = 5 } = options;

  const dealership = createMockDealership();
  const users = createMockUsers(userCount, { dealershipId: dealership.id });
  const customers = createMockCustomers(customerCount, { dealershipId: dealership.id });
  const vehicles = createMockVehicles(vehicleCount, { dealershipId: dealership.id });

  // Create deals linked to customers and vehicles
  const deals = Array.from({ length: dealCount }, (_, i) => {
    const customer = customers[i % customers.length];
    const vehicle = vehicles[i % vehicles.length];
    const salesperson = users.find(u => u.role === 'salesperson') || users[0];

    return createMockDeal({
      dealershipId: dealership.id,
      customerId: customer.id,
      vehicleId: vehicle.id,
      salespersonId: salesperson.id,
    });
  });

  return {
    dealership,
    users,
    customers,
    vehicles,
    deals,
    admin: users.find(u => u.role === 'admin') || createMockAdmin({ dealershipId: dealership.id }),
  };
}
