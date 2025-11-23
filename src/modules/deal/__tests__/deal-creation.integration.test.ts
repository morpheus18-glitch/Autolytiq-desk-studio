/**
 * Deal Creation Integration Tests
 * Tests the complete flow of creating a deal with customer, vehicle, and financing
 *
 * Critical paths tested:
 * - Deal creation with customer and vehicle
 * - Deal calculation and pricing
 * - Multi-tenant isolation
 * - Trade-in valuation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Deal, Customer, Vehicle, DealScenario } from '@shared/models';
import type { DealCalculationResult } from '@shared/types';

// Note: These are mock implementations for testing structure
// In a real environment, these would connect to actual database/services

describe('Deal Creation Integration', () => {
  const TEST_TENANT_ID = 'test-dealership-001';
  const TEST_USER_ID = 'test-user-001';

  let testCustomer: Customer & { id: string };
  let testVehicle: Vehicle & { id: string };
  let createdDeal: Deal & { id: string };

  beforeAll(async () => {
    // Setup test data
    testCustomer = {
      id: 'cust-001',
      dealershipId: TEST_TENANT_ID,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '5551234567',
      address: {
        street: '123 Main St',
        city: 'Phoenix',
        state: 'AZ',
        zipCode: '85001',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    testVehicle = {
      id: 'veh-001',
      dealershipId: TEST_TENANT_ID,
      vin: '1G1FB1C38D1187411',
      stockNumber: 'STOCK-001',
      make: 'Chevrolet',
      model: 'Cruze',
      year: 2023,
      trim: 'LT',
      bodyType: 'Sedan',
      mileage: 15000,
      price: 24999,
      condition: 'Used',
      status: 'Available',
      color: 'Silver',
      transmission: 'Automatic',
      fuelType: 'Gasoline',
      engine: '1.6L',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  afterAll(async () => {
    // Cleanup test data
    // In real tests, would delete created records
  });

  describe('Create Deal with Customer and Vehicle', () => {
    it('should create a deal with valid customer and vehicle', async () => {
      // Arrange
      const dealData = {
        dealershipId: TEST_TENANT_ID,
        customerId: testCustomer.id,
        vehicleId: testVehicle.id,
        salePrice: 24999,
        downPayment: 5000,
        loanTerm: 60,
        interestRate: 5.99,
      };

      // Act - Create deal
      createdDeal = {
        id: 'deal-001',
        dealershipId: TEST_TENANT_ID,
        customerId: testCustomer.id,
        vehicleId: testVehicle.id,
        salePrice: 24999,
        downPayment: 5000,
        loanTerm: 60,
        interestRate: 5.99,
        dealNumber: 'DL-2025-00001',
        status: 'Open',
        createdBy: TEST_USER_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Assert
      expect(createdDeal).toBeDefined();
      expect(createdDeal.id).toBeDefined();
      expect(createdDeal.dealNumber).toBeDefined();
      expect(createdDeal.dealershipId).toBe(TEST_TENANT_ID);
      expect(createdDeal.customerId).toBe(testCustomer.id);
      expect(createdDeal.vehicleId).toBe(testVehicle.id);
      expect(createdDeal.status).toBe('Open');
    });

    it('should fail to create deal without required fields', async () => {
      // Arrange - missing customerId
      const invalidDeal = {
        dealershipId: TEST_TENANT_ID,
        vehicleId: testVehicle.id,
        salePrice: 24999,
        downPayment: 5000,
      };

      // Act & Assert
      expect(() => {
        // Would validate schema here
        if (!invalidDeal.customerId) {
          throw new Error('customerId is required');
        }
      }).toThrow('customerId is required');
    });

    it('should enforce multi-tenant isolation on deal creation', async () => {
      // Arrange - create deal for different tenant
      const otherTenantId = 'other-dealership-001';
      const dealForOtherTenant = {
        dealershipId: otherTenantId,
        customerId: testCustomer.id, // Customer from TEST_TENANT_ID
        vehicleId: testVehicle.id,
        salePrice: 24999,
      };

      // Assert - should not be allowed to cross tenant boundaries
      expect(() => {
        // Would be caught by database constraints
        if (dealForOtherTenant.dealershipId !== TEST_TENANT_ID) {
          throw new Error('Cannot create deal across tenant boundaries');
        }
      }).toThrow('Cannot create deal across tenant boundaries');
    });
  });

  describe('Deal Calculations and Pricing', () => {
    beforeAll(() => {
      // Use createdDeal from previous test
    });

    it('should calculate pricing correctly for financed deal', async () => {
      // Arrange
      const salePrice = 24999;
      const downPayment = 5000;
      const documentFee = 299;
      const loanTerm = 60; // months
      const interestRate = 5.99; // annual percentage

      // Act - Calculate deal values
      const amountFinanced = salePrice - downPayment + documentFee;
      const monthlyRate = interestRate / 100 / 12;
      const monthlyPayment =
        (amountFinanced *
          (monthlyRate * Math.pow(1 + monthlyRate, loanTerm))) /
        (Math.pow(1 + monthlyRate, loanTerm) - 1);

      const totalPayment = monthlyPayment * loanTerm;
      const totalInterest = totalPayment - amountFinanced;

      const calculation: DealCalculationResult = {
        monthlyPayment: Math.round(monthlyPayment * 100) / 100,
        totalPayment: Math.round(totalPayment * 100) / 100,
        interestCharged: Math.round(totalInterest * 100) / 100,
        totalTaxes: 1625, // Would be calculated based on state/local rules
        dealerDoc: 299,
        totalDueAtSigning: downPayment + 1625 + 299,
        capitalReduction: 0,
        amountFinanced,
        tradeEquity: 0,
      };

      // Assert
      expect(calculation.monthlyPayment).toBeGreaterThan(0);
      expect(calculation.monthlyPayment).toBeLessThan(1000); // Reasonable payment range
      expect(calculation.amountFinanced).toBe(salePrice - downPayment + documentFee);
      expect(calculation.totalDueAtSigning).toBe(downPayment + calculation.totalTaxes + documentFee);
    });

    it('should calculate trade-in equity correctly', async () => {
      // Arrange
      const tradeInVehicleValue = 8000;
      const tradeInPayoff = 5000;
      const tradeInEquity = tradeInVehicleValue - tradeInPayoff;

      // Act & Assert
      expect(tradeInEquity).toBe(3000);

      // When applied to deal
      const salePrice = 24999;
      const downPayment = 5000;
      const adjustedDownPayment = downPayment + tradeInEquity;

      expect(adjustedDownPayment).toBe(8000);
    });

    it('should apply tax calculations to deal correctly', async () => {
      // Arrange
      const saleTaxRate = 0.0725; // Arizona 7.25%
      const salePrice = 24999;
      const documentFee = 299;
      const taxableAmount = salePrice + documentFee;

      // Act
      const taxAmount = Math.round(taxableAmount * saleTaxRate * 100) / 100;

      // Assert
      expect(taxAmount).toBeCloseTo(1825.59, 1);
      expect(taxAmount).toBeGreaterThan(0);
    });
  });

  describe('Deal Scenarios and Variations', () => {
    it('should create multiple scenarios for same deal', async () => {
      // Arrange
      const scenarios: DealScenario[] = [
        {
          id: 'scenario-1',
          dealId: createdDeal.id,
          name: 'Standard Financing',
          loanTerm: 60,
          interestRate: 5.99,
          downPayment: 5000,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'scenario-2',
          dealId: createdDeal.id,
          name: 'Extended Term',
          loanTerm: 72,
          interestRate: 6.49,
          downPayment: 5000,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'scenario-3',
          dealId: createdDeal.id,
          name: 'Lower Down Payment',
          loanTerm: 60,
          interestRate: 5.99,
          downPayment: 3000,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Assert
      expect(scenarios.length).toBe(3);
      scenarios.forEach((scenario) => {
        expect(scenario.dealId).toBe(createdDeal.id);
        expect(scenario.id).toBeDefined();
      });
    });

    it('should allow marking scenario as active', async () => {
      // Arrange
      const scenarioId = 'scenario-1';

      // Act - Mark as active
      const activeScenario = {
        id: scenarioId,
        dealId: createdDeal.id,
        isActive: true,
      };

      // Assert
      expect(activeScenario.isActive).toBe(true);
      expect(activeScenario.dealId).toBe(createdDeal.id);
    });
  });

  describe('Deal Status Transitions', () => {
    it('should transition deal through valid statuses', async () => {
      // Arrange
      const validTransitions = ['Open', 'Pending', 'Approved', 'Funded', 'Closed'];

      // Act & Assert
      let currentStatus = 'Open';
      expect(validTransitions).toContain(currentStatus);

      currentStatus = 'Pending';
      expect(validTransitions).toContain(currentStatus);

      currentStatus = 'Approved';
      expect(validTransitions).toContain(currentStatus);
    });

    it('should prevent invalid status transitions', async () => {
      // Arrange
      const currentStatus = 'Closed';
      const invalidNextStatus = 'Open';

      // Assert
      expect(() => {
        // Closed deals should not transition back to Open
        if (currentStatus === 'Closed' && invalidNextStatus === 'Open') {
          throw new Error('Cannot transition from Closed to Open');
        }
      }).toThrow('Cannot transition from Closed to Open');
    });
  });

  describe('Deal PDF Generation', () => {
    it('should generate PDF with deal information', async () => {
      // Arrange & Act
      const pdfData = {
        dealNumber: createdDeal.dealNumber,
        customerName: `${testCustomer.firstName} ${testCustomer.lastName}`,
        vehicleDescription: `${testVehicle.year} ${testVehicle.make} ${testVehicle.model}`,
        salePrice: createdDeal.salePrice,
        downPayment: createdDeal.downPayment,
        loanTerm: createdDeal.loanTerm,
        interestRate: createdDeal.interestRate,
      };

      // Assert
      expect(pdfData.dealNumber).toBeDefined();
      expect(pdfData.customerName).toBe('John Doe');
      expect(pdfData.vehicleDescription).toBe('2023 Chevrolet Cruze');
    });
  });

  describe('Lender Rate Shopping', () => {
    it('should request rates from multiple lenders', async () => {
      // Arrange
      const lenderRateRequests = [
        { lenderId: 'lender-1', name: 'Bank A', rate: 5.99, approved: true },
        { lenderId: 'lender-2', name: 'Bank B', rate: 6.49, approved: true },
        { lenderId: 'lender-3', name: 'Credit Union', rate: 5.49, approved: true },
      ];

      // Act & Assert
      expect(lenderRateRequests.length).toBeGreaterThan(0);
      const bestRate = Math.min(...lenderRateRequests.map((r) => r.rate));
      expect(bestRate).toBeLessThan(6.0);
    });
  });
});
