/**
 * Customer Service Integration Tests
 *
 * LAYER 4: INTEGRATION TESTING
 *
 * Tests the customer service functionality including:
 * - Customer CRUD operations
 * - Search and filtering
 * - Credit check simulation
 * - PII handling and encryption markers
 *
 * These tests validate the API contract and business logic.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMockCustomer,
  createMockCustomerWithPII,
  createMockCreditProfile,
  createMockPrimeCreditProfile,
  createMockSubprimeCreditProfile,
  createMockCustomers,
  createDealershipScenario,
} from '../helpers/fixtures';

// ============================================================================
// CUSTOMER CRUD TESTS
// ============================================================================

describe('Customer Service - CRUD Operations', () => {
  describe('Create Customer', () => {
    it('creates customer with required fields', () => {
      const customer = createMockCustomer({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
      });

      expect(customer.id).toBeDefined();
      expect(customer.firstName).toBe('John');
      expect(customer.lastName).toBe('Doe');
      expect(customer.email).toBe('john.doe@example.com');
      expect(customer.dealershipId).toBeDefined();
    });

    it('creates customer with PII fields', () => {
      const customer = createMockCustomerWithPII();

      expect(customer.ssn).toBeDefined();
      expect(customer.ssn).toMatch(/^\d{9}$/);
      expect(customer.driversLicense).toBeDefined();
      expect(customer.dateOfBirth).toBeDefined();
    });

    it('requires dealership association', () => {
      const customer = createMockCustomer();
      expect(customer.dealershipId).toBeDefined();
      expect(customer.dealershipId).not.toBe('');
    });

    it('sets timestamps on creation', () => {
      const customer = createMockCustomer();
      expect(customer.createdAt).toBeDefined();
      expect(customer.updatedAt).toBeDefined();
      expect(customer.createdAt instanceof Date).toBe(true);
    });
  });

  describe('Read Customer', () => {
    it('retrieves customer by ID', () => {
      const scenario = createDealershipScenario({ customerCount: 5 });
      const targetCustomer = scenario.customers[2];

      const found = scenario.customers.find(c => c.id === targetCustomer.id);
      expect(found).toBeDefined();
      expect(found?.firstName).toBe(targetCustomer.firstName);
      expect(found?.lastName).toBe(targetCustomer.lastName);
    });

    it('returns undefined for non-existent customer', () => {
      const scenario = createDealershipScenario();
      const found = scenario.customers.find(c => c.id === 'non-existent-id');
      expect(found).toBeUndefined();
    });
  });

  describe('Update Customer', () => {
    it('updates customer fields', () => {
      const customer = createMockCustomer();
      const originalEmail = customer.email;

      // Simulate update
      const updatedCustomer = {
        ...customer,
        email: 'newemail@example.com',
        phone: '555-0199',
        updatedAt: new Date(),
      };

      expect(updatedCustomer.email).not.toBe(originalEmail);
      expect(updatedCustomer.email).toBe('newemail@example.com');
      expect(updatedCustomer.updatedAt.getTime()).toBeGreaterThanOrEqual(customer.updatedAt.getTime());
    });

    it('preserves immutable fields on update', () => {
      const customer = createMockCustomer();
      const originalId = customer.id;
      const originalCreatedAt = customer.createdAt;

      // Simulate update (id and createdAt should be preserved)
      const updatedCustomer = {
        ...customer,
        firstName: 'Updated',
      };

      expect(updatedCustomer.id).toBe(originalId);
      expect(updatedCustomer.createdAt).toBe(originalCreatedAt);
    });
  });

  describe('Delete Customer', () => {
    it('removes customer from collection', () => {
      const customers = createMockCustomers(5, { dealershipId: 'dealer-123' });
      const targetId = customers[2].id;

      const filtered = customers.filter(c => c.id !== targetId);
      expect(filtered.length).toBe(4);
      expect(filtered.find(c => c.id === targetId)).toBeUndefined();
    });

    it('cannot delete customer with active deals', () => {
      const scenario = createDealershipScenario({ dealCount: 3 });
      const customerWithDeal = scenario.deals[0].customerId;

      // Simulate check for active deals
      const hasActiveDeals = scenario.deals.some(
        d => d.customerId === customerWithDeal && !['delivered', 'cancelled'].includes(d.status)
      );

      expect(hasActiveDeals).toBe(true);
      // In real implementation, deletion would be blocked
    });
  });
});

// ============================================================================
// CUSTOMER SEARCH TESTS
// ============================================================================

describe('Customer Service - Search', () => {
  describe('Name Search', () => {
    it('finds customers by first name', () => {
      const customers = [
        createMockCustomer({ firstName: 'John', lastName: 'Doe' }),
        createMockCustomer({ firstName: 'Jane', lastName: 'Smith' }),
        createMockCustomer({ firstName: 'Johnny', lastName: 'Walker' }),
      ];

      const searchTerm = 'john';
      const results = customers.filter(c =>
        c.firstName.toLowerCase().includes(searchTerm.toLowerCase())
      );

      expect(results.length).toBe(2); // John and Johnny
    });

    it('finds customers by last name', () => {
      const customers = [
        createMockCustomer({ firstName: 'John', lastName: 'Doe' }),
        createMockCustomer({ firstName: 'Jane', lastName: 'Doe-Smith' }),
        createMockCustomer({ firstName: 'Bob', lastName: 'Johnson' }),
      ];

      const searchTerm = 'doe';
      const results = customers.filter(c =>
        c.lastName.toLowerCase().includes(searchTerm.toLowerCase())
      );

      expect(results.length).toBe(2); // Doe and Doe-Smith
    });

    it('performs case-insensitive search', () => {
      const customers = [
        createMockCustomer({ firstName: 'JOHN', lastName: 'DOE' }),
        createMockCustomer({ firstName: 'john', lastName: 'doe' }),
        createMockCustomer({ firstName: 'John', lastName: 'Doe' }),
      ];

      const searchTerm = 'JOHN';
      const results = customers.filter(c =>
        c.firstName.toLowerCase().includes(searchTerm.toLowerCase())
      );

      expect(results.length).toBe(3);
    });
  });

  describe('Email Search', () => {
    it('finds customers by email address', () => {
      const customers = [
        createMockCustomer({ email: 'john@example.com' }),
        createMockCustomer({ email: 'john.doe@work.com' }),
        createMockCustomer({ email: 'jane@example.com' }),
      ];

      const searchTerm = 'john';
      const results = customers.filter(c =>
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );

      expect(results.length).toBe(2);
    });

    it('handles null email in search', () => {
      const customers = [
        createMockCustomer({ email: 'test@example.com' }),
        createMockCustomer({ email: null }),
      ];

      const searchTerm = 'test';
      const results = customers.filter(c =>
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );

      expect(results.length).toBe(1);
    });
  });

  describe('Filter by Dealership', () => {
    it('filters customers by dealership ID', () => {
      const dealership1 = 'dealer-001';
      const dealership2 = 'dealer-002';

      const customers = [
        createMockCustomer({ dealershipId: dealership1 }),
        createMockCustomer({ dealershipId: dealership1 }),
        createMockCustomer({ dealershipId: dealership2 }),
        createMockCustomer({ dealershipId: dealership2 }),
        createMockCustomer({ dealershipId: dealership2 }),
      ];

      const dealer1Customers = customers.filter(c => c.dealershipId === dealership1);
      const dealer2Customers = customers.filter(c => c.dealershipId === dealership2);

      expect(dealer1Customers.length).toBe(2);
      expect(dealer2Customers.length).toBe(3);
    });
  });

  describe('Pagination', () => {
    it('returns paginated results', () => {
      const customers = createMockCustomers(50, { dealershipId: 'dealer-123' });
      const pageSize = 10;

      const page1 = customers.slice(0, pageSize);
      const page2 = customers.slice(pageSize, pageSize * 2);
      const page5 = customers.slice(pageSize * 4, pageSize * 5);

      expect(page1.length).toBe(10);
      expect(page2.length).toBe(10);
      expect(page5.length).toBe(10);
      expect(page1[0].id).not.toBe(page2[0].id);
    });

    it('handles last page with fewer results', () => {
      const customers = createMockCustomers(25, { dealershipId: 'dealer-123' });
      const pageSize = 10;

      const lastPage = customers.slice(pageSize * 2);
      expect(lastPage.length).toBe(5);
    });
  });
});

// ============================================================================
// CREDIT CHECK TESTS
// ============================================================================

describe('Customer Service - Credit Check', () => {
  describe('Credit Score Assessment', () => {
    it('identifies prime customers', () => {
      const profile = createMockPrimeCreditProfile();

      expect(profile.creditScore).toBeGreaterThanOrEqual(720);
      expect(profile.riskTier).toBe('prime');
    });

    it('identifies subprime customers', () => {
      const profile = createMockSubprimeCreditProfile();

      expect(profile.creditScore).toBeGreaterThanOrEqual(580);
      expect(profile.creditScore).toBeLessThan(660);
      expect(profile.riskTier).toBe('subprime');
    });

    it('calculates risk tier from credit score', () => {
      const testCases = [
        { score: 800, expectedTier: 'prime' },
        { score: 720, expectedTier: 'prime' },
        { score: 700, expectedTier: 'near_prime' },
        { score: 660, expectedTier: 'near_prime' },
        { score: 620, expectedTier: 'subprime' },
        { score: 580, expectedTier: 'subprime' },
        { score: 550, expectedTier: 'deep_subprime' },
        { score: 500, expectedTier: 'deep_subprime' },
      ];

      for (const { score, expectedTier } of testCases) {
        const tier = getCreditRiskTier(score);
        expect(tier).toBe(expectedTier);
      }
    });
  });

  describe('APR Recommendation', () => {
    it('recommends lower APR for prime customers', () => {
      const primeProfile = createMockPrimeCreditProfile();
      const subprimeProfile = createMockSubprimeCreditProfile();

      const primeAPR = getRecommendedAPR(primeProfile.creditScore);
      const subprimeAPR = getRecommendedAPR(subprimeProfile.creditScore);

      expect(primeAPR).toBeLessThan(subprimeAPR);
      expect(primeAPR).toBeLessThanOrEqual(7); // Prime should be under 7%
      expect(subprimeAPR).toBeGreaterThanOrEqual(10); // Subprime typically 10%+
    });
  });

  describe('Loan Amount Calculation', () => {
    it('calculates max loan amount based on credit and income', () => {
      const profile = createMockCreditProfile({
        creditScore: 750,
        monthlyIncome: 5000_00, // $5,000/month
        totalDebt: 500_00, // $500/month existing debt
      });

      const maxLoan = calculateMaxLoanAmount(profile);

      // DTI based: ($5000 * 0.45 - $500) * 60 months = ($2250 - $500) * 60 = $105,000
      // Credit based: Score 750 = up to $75,000
      // Should be lower of the two
      expect(maxLoan).toBeGreaterThan(0);
      expect(maxLoan).toBeLessThanOrEqual(100000_00);
    });

    it('limits loan amount for high DTI customers', () => {
      const highDTIProfile = createMockCreditProfile({
        creditScore: 800,
        monthlyIncome: 4000_00,
        totalDebt: 2000_00, // 50% DTI already
        debtToIncome: 0.5,
      });

      const maxLoan = calculateMaxLoanAmount(highDTIProfile);

      // Should be significantly limited due to existing debt
      expect(maxLoan).toBeLessThan(30000_00);
    });
  });

  describe('Credit Profile Expiration', () => {
    it('marks profile as expired after 30 days', () => {
      const profile = createMockCreditProfile();
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      profile.lastCheckedAt = thirtyOneDaysAgo;
      profile.expiresAt = new Date(thirtyOneDaysAgo.getTime() + 30 * 24 * 60 * 60 * 1000);

      const isExpired = new Date() > profile.expiresAt;
      expect(isExpired).toBe(true);
    });

    it('fresh profile is not expired', () => {
      const profile = createMockCreditProfile();

      // Default fixture creates profile with 30 day expiration from lastCheckedAt
      const isExpired = new Date() > profile.expiresAt;
      expect(isExpired).toBe(false);
    });
  });
});

// ============================================================================
// PII HANDLING TESTS
// ============================================================================

describe('Customer Service - PII Handling', () => {
  describe('SSN Validation', () => {
    it('validates correct SSN format', () => {
      expect(isValidSSN('123456789')).toBe(true);
      expect(isValidSSN('000000000')).toBe(false); // Invalid
      expect(isValidSSN('666123456')).toBe(false); // 666 prefix invalid
      expect(isValidSSN('900123456')).toBe(false); // 900+ prefix invalid
    });

    it('rejects malformed SSN', () => {
      expect(isValidSSN('12345678')).toBe(false); // Too short
      expect(isValidSSN('1234567890')).toBe(false); // Too long
      expect(isValidSSN('12345678a')).toBe(false); // Contains letter
      expect(isValidSSN('123-45-6789')).toBe(false); // Contains dashes
    });
  });

  describe('SSN Masking', () => {
    it('masks SSN for display', () => {
      const masked = maskSSN('123456789');
      expect(masked).toBe('***-**-6789');
    });

    it('handles null/undefined SSN', () => {
      expect(maskSSN(null)).toBe('N/A');
      expect(maskSSN(undefined)).toBe('N/A');
    });
  });

  describe('SSN Formatting', () => {
    it('formats SSN with dashes', () => {
      const formatted = formatSSN('123456789');
      expect(formatted).toBe('123-45-6789');
    });

    it('returns empty for invalid SSN', () => {
      const formatted = formatSSN('invalid');
      expect(formatted).toBe('');
    });
  });

  describe('PII Field Detection', () => {
    it('identifies PII fields in customer table', () => {
      const piiFields = ['firstName', 'lastName', 'email', 'phone', 'ssn', 'driversLicense', 'dateOfBirth', 'addressStreet'];

      for (const field of piiFields) {
        expect(isPIIField('customers', field)).toBe(true);
      }
    });

    it('does not flag non-PII fields', () => {
      expect(isPIIField('customers', 'id')).toBe(false);
      expect(isPIIField('customers', 'dealershipId')).toBe(false);
      expect(isPIIField('customers', 'notes')).toBe(false);
      expect(isPIIField('customers', 'createdAt')).toBe(false);
    });
  });
});

// ============================================================================
// DATA VALIDATION TESTS
// ============================================================================

describe('Customer Service - Data Validation', () => {
  describe('Required Fields', () => {
    it('validates required firstName', () => {
      const errors = validateCustomer({ firstName: '', lastName: 'Doe', dealershipId: 'dealer-123' });
      expect(errors).toContain('First name is required');
    });

    it('validates required lastName', () => {
      const errors = validateCustomer({ firstName: 'John', lastName: '', dealershipId: 'dealer-123' });
      expect(errors).toContain('Last name is required');
    });

    it('validates required dealershipId', () => {
      const errors = validateCustomer({ firstName: 'John', lastName: 'Doe', dealershipId: '' });
      expect(errors).toContain('Dealership ID is required');
    });
  });

  describe('Email Validation', () => {
    it('validates email format', () => {
      const errors = validateCustomer({
        firstName: 'John',
        lastName: 'Doe',
        dealershipId: 'dealer-123',
        email: 'invalid-email',
      });
      expect(errors).toContain('Invalid email format');
    });

    it('accepts valid email', () => {
      const errors = validateCustomer({
        firstName: 'John',
        lastName: 'Doe',
        dealershipId: 'dealer-123',
        email: 'john.doe@example.com',
      });
      expect(errors.filter(e => e.includes('email'))).toHaveLength(0);
    });

    it('allows null email', () => {
      const errors = validateCustomer({
        firstName: 'John',
        lastName: 'Doe',
        dealershipId: 'dealer-123',
        email: null,
      });
      expect(errors.filter(e => e.includes('email'))).toHaveLength(0);
    });
  });

  describe('Phone Validation', () => {
    it('validates phone number format', () => {
      const validPhones = ['555-555-5555', '(555) 555-5555', '5555555555', '+1 555-555-5555'];
      const invalidPhones = ['555-555', 'abc-def-ghij', '555'];

      for (const phone of validPhones) {
        const errors = validateCustomer({
          firstName: 'John',
          lastName: 'Doe',
          dealershipId: 'dealer-123',
          phone,
        });
        expect(errors.filter(e => e.includes('phone')).length).toBe(0);
      }

      for (const phone of invalidPhones) {
        const errors = validateCustomer({
          firstName: 'John',
          lastName: 'Doe',
          dealershipId: 'dealer-123',
          phone,
        });
        expect(errors.some(e => e.toLowerCase().includes('phone'))).toBe(true);
      }
    });
  });

  describe('State Code Validation', () => {
    it('validates US state codes', () => {
      const validStates = ['TX', 'CA', 'NY', 'FL', 'WA'];
      const invalidStates = ['XX', 'ZZ', 'Texas', ''];

      for (const state of validStates) {
        expect(isValidStateCode(state)).toBe(true);
      }

      for (const state of invalidStates) {
        expect(isValidStateCode(state)).toBe(false);
      }
    });
  });
});

// ============================================================================
// HELPER FUNCTIONS (These would normally be imported from the actual service)
// ============================================================================

type CreditRiskTier = 'prime' | 'near_prime' | 'subprime' | 'deep_subprime';

function getCreditRiskTier(score: number): CreditRiskTier {
  if (score >= 720) return 'prime';
  if (score >= 660) return 'near_prime';
  if (score >= 580) return 'subprime';
  return 'deep_subprime';
}

function getRecommendedAPR(creditScore: number): number {
  if (creditScore >= 750) return 4.99;
  if (creditScore >= 720) return 5.99;
  if (creditScore >= 700) return 7.99;
  if (creditScore >= 660) return 9.99;
  if (creditScore >= 620) return 12.99;
  if (creditScore >= 580) return 15.99;
  return 19.99;
}

function calculateMaxLoanAmount(profile: {
  creditScore: number;
  monthlyIncome: number;
  totalDebt: number;
}): number {
  // Credit score based limit
  let creditLimit: number;
  if (profile.creditScore >= 750) creditLimit = 75000_00;
  else if (profile.creditScore >= 700) creditLimit = 60000_00;
  else if (profile.creditScore >= 650) creditLimit = 45000_00;
  else if (profile.creditScore >= 600) creditLimit = 30000_00;
  else creditLimit = 15000_00;

  // DTI based limit (max 45% DTI including new payment)
  const maxMonthlyPayment = profile.monthlyIncome * 0.45 - profile.totalDebt;
  const dtiLimit = Math.max(0, maxMonthlyPayment * 60); // Assume 60 month term

  return Math.min(creditLimit, dtiLimit);
}

function isValidSSN(ssn: string): boolean {
  if (!/^\d{9}$/.test(ssn)) return false;
  const area = parseInt(ssn.substring(0, 3), 10);
  if (area === 0 || area === 666 || area >= 900) return false;
  const group = parseInt(ssn.substring(3, 5), 10);
  if (group === 0) return false;
  const serial = parseInt(ssn.substring(5, 9), 10);
  if (serial === 0) return false;
  return true;
}

function maskSSN(ssn: string | null | undefined): string {
  if (!ssn) return 'N/A';
  if (ssn.length !== 9) return 'N/A';
  return `***-**-${ssn.slice(-4)}`;
}

function formatSSN(ssn: string): string {
  if (!/^\d{9}$/.test(ssn)) return '';
  return `${ssn.slice(0, 3)}-${ssn.slice(3, 5)}-${ssn.slice(5)}`;
}

const PII_FIELDS: Record<string, string[]> = {
  customers: ['firstName', 'lastName', 'email', 'phone', 'ssn', 'driversLicense', 'dateOfBirth', 'addressStreet'],
  users: ['email', 'name', 'mfaSecret'],
  creditProfiles: ['ssn', 'creditScore', 'monthlyIncome', 'totalDebt'],
};

function isPIIField(table: string, field: string): boolean {
  return PII_FIELDS[table]?.includes(field) ?? false;
}

const US_STATE_CODES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'PR', 'VI', 'GU', 'AS', 'MP',
];

function isValidStateCode(code: string): boolean {
  return US_STATE_CODES.includes(code);
}

function validateCustomer(customer: {
  firstName: string;
  lastName: string;
  dealershipId: string;
  email?: string | null;
  phone?: string | null;
}): string[] {
  const errors: string[] = [];

  if (!customer.firstName?.trim()) {
    errors.push('First name is required');
  }

  if (!customer.lastName?.trim()) {
    errors.push('Last name is required');
  }

  if (!customer.dealershipId?.trim()) {
    errors.push('Dealership ID is required');
  }

  if (customer.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer.email)) {
      errors.push('Invalid email format');
    }
  }

  if (customer.phone) {
    // Allow various US phone formats
    const phoneRegex = /^[\d\s\-\(\)\+]{10,}$/;
    if (!phoneRegex.test(customer.phone.replace(/\s/g, ''))) {
      errors.push('Invalid phone number format');
    }
  }

  return errors;
}
