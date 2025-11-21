/**
 * Validation script for Priority 1 Zod schemas
 *
 * Tests that all 8 critical schemas can parse valid data
 */

import {
  UserSchema,
  CreateUserSchema,
  LenderSchema,
  CreateLenderSchema,
  LenderProgramSchema,
  CreateLenderProgramSchema,
  RateRequestSchema,
  CreateRateRequestSchema,
  ApprovedLenderSchema,
  CreateApprovedLenderSchema,
  DealScenarioSchema,
  CreateDealScenarioSchema,
  QuickQuoteSchema,
  CreateQuickQuoteSchema,
  AppointmentSchema,
  CreateAppointmentSchema,
} from '../shared/models';

function testUserSchema() {
  console.log('Testing User schema...');

  const validUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    dealershipId: '123e4567-e89b-12d3-a456-426614174001',
    username: 'john_doe',
    email: 'john@example.com',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz',
    firstName: 'John',
    lastName: 'Doe',
    role: 'sales' as const,
    isActive: true,
    mfaEnabled: false,
    mfaSecret: null,
    resetToken: null,
    resetTokenExpiry: null,
    preferences: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
  };

  const result = UserSchema.safeParse(validUser);
  if (!result.success) {
    console.error('User schema validation failed:', result.error.issues);
    throw new Error('User schema validation failed');
  }
  console.log('✓ User schema validated');
}

function testLenderSchema() {
  console.log('Testing Lender schema...');

  const validLender = {
    id: '123e4567-e89b-12d3-a456-426614174002',
    name: 'Chase Auto Finance',
    code: 'CHASE-AUTO',
    logoUrl: 'https://example.com/logo.png',
    website: 'https://www.chase.com',
    contactPhone: '1-800-123-4567',
    contactEmail: 'support@chase.com',
    isActive: true,
    minCreditScore: 620,
    maxLoanAmount: 100000,
    minLoanAmount: 5000,
    maxTermMonths: 84,
    apiEndpoint: 'https://api.chase.com/auto',
    apiKey: 'test-key',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = LenderSchema.safeParse(validLender);
  if (!result.success) {
    console.error('Lender schema validation failed:', result.error.issues);
    throw new Error('Lender schema validation failed');
  }
  console.log('✓ Lender schema validated');
}

function testLenderProgramSchema() {
  console.log('Testing LenderProgram schema...');

  const validProgram = {
    id: '123e4567-e89b-12d3-a456-426614174003',
    lenderId: '123e4567-e89b-12d3-a456-426614174002',
    name: 'Prime Auto Loan',
    programCode: 'PRIME-NEW',
    description: 'Prime rate for new vehicles',
    programType: 'new' as const,
    vehicleType: 'all' as const,
    baseRate: 4.99,
    minRate: 3.99,
    maxRate: 9.99,
    minTermMonths: 12,
    maxTermMonths: 84,
    availableTerms: [36, 48, 60, 72, 84],
    minLoanAmount: 10000,
    maxLoanAmount: 75000,
    minDownPaymentPercent: 10,
    minCreditScore: 680,
    maxCreditScore: 850,
    buyRate: 4.5,
    flatFee: 500,
    isActive: true,
    effectiveDate: new Date(),
    expirationDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = LenderProgramSchema.safeParse(validProgram);
  if (!result.success) {
    console.error('LenderProgram schema validation failed:', result.error.issues);
    throw new Error('LenderProgram schema validation failed');
  }
  console.log('✓ LenderProgram schema validated');
}

function testRateRequestSchema() {
  console.log('Testing RateRequest schema...');

  const validRateRequest = {
    id: '123e4567-e89b-12d3-a456-426614174004',
    dealId: '123e4567-e89b-12d3-a456-426614174005',
    creditScore: 720,
    creditTier: 'good' as const,
    loanAmount: 35000,
    termMonths: 60,
    downPayment: 5000,
    vehicleYear: 2024,
    vehicleMake: 'Toyota',
    vehicleModel: 'Camry',
    vehicleVin: '1HGBH41JXMN109186',
    vehicleCondition: 'new' as const,
    vehicleMileage: 0,
    status: 'pending' as const,
    requestedAt: new Date(),
    respondedAt: null,
    responseData: null,
    selectedLenderId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = RateRequestSchema.safeParse(validRateRequest);
  if (!result.success) {
    console.error('RateRequest schema validation failed:', result.error.issues);
    throw new Error('RateRequest schema validation failed');
  }
  console.log('✓ RateRequest schema validated');
}

function testApprovedLenderSchema() {
  console.log('Testing ApprovedLender schema...');

  const validApprovedLender = {
    id: '123e4567-e89b-12d3-a456-426614174006',
    rateRequestId: '123e4567-e89b-12d3-a456-426614174004',
    lenderId: '123e4567-e89b-12d3-a456-426614174002',
    lenderProgramId: '123e4567-e89b-12d3-a456-426614174003',
    approvedAmount: 35000,
    approvedRate: 5.49,
    termMonths: 60,
    monthlyPayment: 668.45,
    buyRate: 4.99,
    sellRate: 5.49,
    dealerReserve: 875,
    requiredDownPayment: 5000,
    balloonPayment: null,
    isSelected: false,
    selectedAt: null,
    selectedBy: null,
    responseData: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = ApprovedLenderSchema.safeParse(validApprovedLender);
  if (!result.success) {
    console.error('ApprovedLender schema validation failed:', result.error.issues);
    throw new Error('ApprovedLender schema validation failed');
  }
  console.log('✓ ApprovedLender schema validated');
}

function testDealScenarioSchema() {
  console.log('Testing DealScenario schema...');

  const validScenario = {
    id: '123e4567-e89b-12d3-a456-426614174007',
    dealId: '123e4567-e89b-12d3-a456-426614174005',
    name: 'Standard Finance - 60 months',
    description: 'Standard financing with 5k down',
    scenarioType: 'finance' as const,
    salePrice: 35000,
    downPayment: 5000,
    tradeInValue: 8000,
    tradeInPayoff: 6500,
    loanAmount: 28500,
    termMonths: 60,
    interestRate: 5.49,
    monthlyPayment: 542.67,
    residualValue: null,
    moneyFactor: null,
    milesPerYear: null,
    totalTax: 2450,
    totalFees: 850,
    amountFinanced: 28500,
    totalCost: 38050,
    dueAtSigning: 6500,
    isSelected: false,
    isPrimary: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = DealScenarioSchema.safeParse(validScenario);
  if (!result.success) {
    console.error('DealScenario schema validation failed:', result.error.issues);
    throw new Error('DealScenario schema validation failed');
  }
  console.log('✓ DealScenario schema validated');
}

function testQuickQuoteSchema() {
  console.log('Testing QuickQuote schema...');

  const validQuote = {
    id: '123e4567-e89b-12d3-a456-426614174008',
    dealershipId: '123e4567-e89b-12d3-a456-426614174001',
    customerName: 'Jane Smith',
    customerEmail: 'jane@example.com',
    customerPhone: '555-1234',
    vehicleYear: 2024,
    vehicleMake: 'Honda',
    vehicleModel: 'Accord',
    vehicleTrim: 'EX-L',
    vehicleStock: 'STK12345',
    vehicleVin: '1HGCV1F30LA123456',
    desiredPayment: 500,
    downPayment: 3000,
    tradeInVehicle: '2018 Honda Civic',
    tradeInValue: 12000,
    creditRating: 'good' as const,
    estimatedPayment: 485,
    estimatedPrice: 32000,
    payload: { calculation: 'details' },
    status: 'pending' as const,
    source: 'website',
    notes: 'Customer wants delivery next week',
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };

  const result = QuickQuoteSchema.safeParse(validQuote);
  if (!result.success) {
    console.error('QuickQuote schema validation failed:', result.error.issues);
    throw new Error('QuickQuote schema validation failed');
  }
  console.log('✓ QuickQuote schema validated');
}

function testAppointmentSchema() {
  console.log('Testing Appointment schema...');

  const validAppointment = {
    id: '123e4567-e89b-12d3-a456-426614174009',
    dealershipId: '123e4567-e89b-12d3-a456-426614174001',
    customerId: '123e4567-e89b-12d3-a456-426614174010',
    customerName: 'Bob Johnson',
    customerEmail: 'bob@example.com',
    customerPhone: '555-5678',
    appointmentType: 'test_drive' as const,
    appointmentDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    duration: 30,
    vehicleId: '123e4567-e89b-12d3-a456-426614174011',
    vehicleInfo: '2024 Toyota Camry XSE',
    assignedTo: '123e4567-e89b-12d3-a456-426614174000',
    status: 'scheduled' as const,
    notes: 'Customer interested in hybrid model',
    cancellationReason: null,
    confirmedAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = AppointmentSchema.safeParse(validAppointment);
  if (!result.success) {
    console.error('Appointment schema validation failed:', result.error.issues);
    throw new Error('Appointment schema validation failed');
  }
  console.log('✓ Appointment schema validated');
}

// Run all tests
console.log('=== Priority 1 Schema Validation Test ===\n');

try {
  testUserSchema();
  testLenderSchema();
  testLenderProgramSchema();
  testRateRequestSchema();
  testApprovedLenderSchema();
  testDealScenarioSchema();
  testQuickQuoteSchema();
  testAppointmentSchema();

  console.log('\n✓ All 8 Priority 1 schemas validated successfully!');
  console.log('\nSchemas created:');
  console.log('  1. User (auth system)');
  console.log('  2. Lender (financing)');
  console.log('  3. LenderProgram (rate products)');
  console.log('  4. RateRequest (rate shopping)');
  console.log('  5. ApprovedLender (lender selection)');
  console.log('  6. DealScenario (multi-scenario pricing)');
  console.log('  7. QuickQuote (lead generation)');
  console.log('  8. Appointment (scheduling)');

  process.exit(0);
} catch (error) {
  console.error('\n✗ Validation failed:', error);
  process.exit(1);
}
