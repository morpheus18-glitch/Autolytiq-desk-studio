/**
 * VEHICLE MODULE INTEGRATION TESTS
 * Comprehensive tests for vehicle CRUD, VIN decoding, inventory management, and multi-tenancy
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { VehicleService } from '../services/vehicle.service';
import { InventoryService } from '../services/inventory.service';
import { VINDecoderService } from '../services/vin-decoder.service';
import { StockNumberService } from '../services/stock-number.service';
import { VehicleStatus, VehicleType, VehicleCondition } from '../types/vehicle.types';
import type { CreateVehicleRequest } from '../types/vehicle.types';

// Test data
const TEST_DEALERSHIP_1 = 'a0000000-0000-4000-8000-000000000001';
const TEST_DEALERSHIP_2 = 'a0000000-0000-4000-8000-000000000002';
const TEST_USER_ID = 'u0000000-0000-4000-8000-000000000001';

const VALID_VIN_HONDA = '1HGCM82633A123456'; // Honda Accord 2003
const VALID_VIN_FORD = '1FTFW1ET5EFC10312'; // Ford F-150 2014

// Services
let vehicleService: VehicleService;
let inventoryService: InventoryService;
let vinDecoder: VINDecoderService;
let stockNumberService: StockNumberService;

// Test vehicle helper
function createTestVehicleData(overrides?: Partial<CreateVehicleRequest>): CreateVehicleRequest {
  return {
    vin: VALID_VIN_HONDA,
    year: 2023,
    make: 'Honda',
    model: 'Accord',
    trim: 'EX-L',
    type: VehicleType.USED,
    bodyStyle: 'sedan',
    exteriorColor: 'Silver',
    interiorColor: 'Black',
    transmission: 'automatic',
    drivetrain: 'fwd',
    fuelType: 'gasoline',
    mileage: 25000,
    cost: 25000,
    askingPrice: 30000,
    status: VehicleStatus.AVAILABLE,
    location: 'Main Lot',
    ...overrides,
  };
}

describe('Vehicle Module Integration Tests', () => {
  beforeAll(() => {
    vehicleService = new VehicleService();
    inventoryService = new InventoryService();
    vinDecoder = new VINDecoderService();
    stockNumberService = new StockNumberService();
  });

  describe('Vehicle CRUD Operations', () => {
    let testVehicleId: string;

    it('should create a vehicle with auto-generated stock number', async () => {
      const vehicleData = createTestVehicleData();

      const vehicle = await vehicleService.createVehicle(
        TEST_DEALERSHIP_1,
        vehicleData,
        TEST_USER_ID
      );

      expect(vehicle.id).toBeDefined();
      expect(vehicle.stockNumber).toMatch(/^\d{2}-\d{5}$/); // Format: YY-NNNNN
      expect(vehicle.vin).toBe(VALID_VIN_HONDA);
      expect(vehicle.dealershipId).toBe(TEST_DEALERSHIP_1);
      expect(vehicle.status).toBe(VehicleStatus.AVAILABLE);

      testVehicleId = vehicle.id;
    });

    it('should create a vehicle with custom stock number', async () => {
      const vehicleData = createTestVehicleData({
        vin: VALID_VIN_FORD,
        stockNumber: 'CUSTOM-001',
      });

      const vehicle = await vehicleService.createVehicle(
        TEST_DEALERSHIP_1,
        vehicleData,
        TEST_USER_ID
      );

      expect(vehicle.stockNumber).toBe('CUSTOM-001');
    });

    it('should reject invalid VIN', async () => {
      const vehicleData = createTestVehicleData({
        vin: 'INVALID_VIN',
      });

      await expect(
        vehicleService.createVehicle(TEST_DEALERSHIP_1, vehicleData, TEST_USER_ID)
      ).rejects.toThrow('Invalid VIN');
    });

    it('should reject duplicate VIN within same dealership', async () => {
      const vehicleData = createTestVehicleData();

      // First creation succeeds
      await vehicleService.createVehicle(TEST_DEALERSHIP_1, vehicleData, TEST_USER_ID);

      // Duplicate should fail
      await expect(
        vehicleService.createVehicle(TEST_DEALERSHIP_1, vehicleData, TEST_USER_ID)
      ).rejects.toThrow('VIN');
    });

    it('should allow same VIN across different dealerships', async () => {
      const vehicleData = createTestVehicleData();

      const vehicle1 = await vehicleService.createVehicle(
        TEST_DEALERSHIP_1,
        vehicleData,
        TEST_USER_ID
      );
      const vehicle2 = await vehicleService.createVehicle(
        TEST_DEALERSHIP_2,
        { ...vehicleData, stockNumber: 'STOCK-002' },
        TEST_USER_ID
      );

      expect(vehicle1.vin).toBe(vehicle2.vin);
      expect(vehicle1.dealershipId).not.toBe(vehicle2.dealershipId);
    });

    it('should get vehicle by ID', async () => {
      const vehicle = await vehicleService.getVehicle(testVehicleId, TEST_DEALERSHIP_1);

      expect(vehicle.id).toBe(testVehicleId);
      expect(vehicle.dealershipId).toBe(TEST_DEALERSHIP_1);
    });

    it('should update vehicle details', async () => {
      const updated = await vehicleService.updateVehicle(
        testVehicleId,
        TEST_DEALERSHIP_1,
        {
          mileage: 26000,
          askingPrice: 29000,
        },
        TEST_USER_ID
      );

      expect(updated.mileage).toBe(26000);
      expect(updated.askingPrice).toBe(29000);
    });

    it('should soft delete vehicle', async () => {
      await vehicleService.deleteVehicle(testVehicleId, TEST_DEALERSHIP_1, TEST_USER_ID);

      // Should not be found after deletion
      await expect(
        vehicleService.getVehicle(testVehicleId, TEST_DEALERSHIP_1)
      ).rejects.toThrow('not found');
    });
  });

  describe('Multi-Tenant Isolation', () => {
    let dealership1Vehicle: string;
    let dealership2Vehicle: string;

    beforeEach(async () => {
      const vehicle1 = await vehicleService.createVehicle(
        TEST_DEALERSHIP_1,
        createTestVehicleData({ vin: VALID_VIN_HONDA }),
        TEST_USER_ID
      );
      const vehicle2 = await vehicleService.createVehicle(
        TEST_DEALERSHIP_2,
        createTestVehicleData({ vin: VALID_VIN_FORD }),
        TEST_USER_ID
      );

      dealership1Vehicle = vehicle1.id;
      dealership2Vehicle = vehicle2.id;
    });

    it('should enforce tenant isolation on get', async () => {
      // Dealership 1 can see their vehicle
      const vehicle = await vehicleService.getVehicle(dealership1Vehicle, TEST_DEALERSHIP_1);
      expect(vehicle.id).toBe(dealership1Vehicle);

      // Dealership 1 CANNOT see dealership 2 vehicle
      await expect(
        vehicleService.getVehicle(dealership2Vehicle, TEST_DEALERSHIP_1)
      ).rejects.toThrow('not found');
    });

    it('should enforce tenant isolation on update', async () => {
      // Dealership 1 cannot update dealership 2 vehicle
      await expect(
        vehicleService.updateVehicle(
          dealership2Vehicle,
          TEST_DEALERSHIP_1,
          { mileage: 99999 },
          TEST_USER_ID
        )
      ).rejects.toThrow('not found');
    });

    it('should enforce tenant isolation on delete', async () => {
      // Dealership 1 cannot delete dealership 2 vehicle
      await expect(
        vehicleService.deleteVehicle(dealership2Vehicle, TEST_DEALERSHIP_1, TEST_USER_ID)
      ).rejects.toThrow('not found');
    });
  });

  describe('VIN Decoder', () => {
    it('should validate valid VIN', () => {
      const result = vinDecoder.validateVIN(VALID_VIN_HONDA);

      expect(result.valid).toBe(true);
      expect(result.checkDigitValid).toBe(true);
    });

    it('should reject VIN with wrong length', () => {
      const result = vinDecoder.validateVIN('TOOSHORT');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('17 characters');
    });

    it('should reject VIN with invalid characters', () => {
      const result = vinDecoder.validateVIN('1HGCM82633A12345O'); // Contains O

      expect(result.valid).toBe(false);
      expect(result.error).toContain('I, O, or Q');
    });

    it('should reject VIN with invalid check digit', () => {
      const result = vinDecoder.validateVIN('1HGCM82633A123450'); // Wrong check digit

      expect(result.valid).toBe(false);
      expect(result.error).toContain('check digit');
    });

    it('should calculate check digit correctly', () => {
      const checkDigit = vinDecoder.calculateCheckDigit('1HGCM826_3A123456');

      expect(checkDigit).toBe('3');
    });

    it('should decode VIN via NHTSA API', async () => {
      const result = await vinDecoder.decodeVIN(VALID_VIN_HONDA);

      expect(result.valid).toBe(true);
      expect(result.vin).toBe(VALID_VIN_HONDA);
      expect(result.make).toBeDefined();
      expect(result.model).toBeDefined();
      expect(result.year).toBeDefined();
    }, 15000); // Extended timeout for API call

    it('should extract manufacturer code from VIN', () => {
      const wmi = vinDecoder.getManufacturerCode(VALID_VIN_HONDA);

      expect(wmi).toBe('1HG'); // Honda USA
    });
  });

  describe('Stock Number Service', () => {
    it('should generate sequential stock numbers', async () => {
      const stock1 = await stockNumberService.generateStockNumber(TEST_DEALERSHIP_1);
      const stock2 = await stockNumberService.generateStockNumber(TEST_DEALERSHIP_1);

      expect(stock1).toMatch(/^\d{2}-\d{5}$/);
      expect(stock2).toMatch(/^\d{2}-\d{5}$/);

      // Parse sequence numbers
      const seq1 = parseInt(stock1.split('-')[1], 10);
      const seq2 = parseInt(stock2.split('-')[1], 10);

      expect(seq2).toBe(seq1 + 1);
    });

    it('should generate stock numbers with prefix', async () => {
      const stock = await stockNumberService.generateStockNumber(TEST_DEALERSHIP_1, 'NEW');

      expect(stock).toMatch(/^NEW-\d{2}-\d{5}$/);
    });

    it('should maintain separate sequences per dealership', async () => {
      const stock1 = await stockNumberService.generateStockNumber(TEST_DEALERSHIP_1);
      const stock2 = await stockNumberService.generateStockNumber(TEST_DEALERSHIP_2);

      // Both should be valid but independent
      expect(stock1).toMatch(/^\d{2}-\d{5}$/);
      expect(stock2).toMatch(/^\d{2}-\d{5}$/);
    });

    it('should validate custom stock number format', () => {
      expect(stockNumberService.validateStockNumberFormat('CUSTOM-001')).toBe(true);
      expect(stockNumberService.validateStockNumberFormat('ABC123')).toBe(true);
      expect(stockNumberService.validateStockNumberFormat('AB')).toBe(false); // Too short
      expect(stockNumberService.validateStockNumberFormat('A'.repeat(25))).toBe(false); // Too long
      expect(stockNumberService.validateStockNumberFormat('INVALID@')).toBe(false); // Special char
    });
  });

  describe('Inventory Service', () => {
    let vehicleId: string;

    beforeEach(async () => {
      const vehicle = await vehicleService.createVehicle(
        TEST_DEALERSHIP_1,
        createTestVehicleData(),
        TEST_USER_ID
      );
      vehicleId = vehicle.id;
    });

    it('should get inventory with filters', async () => {
      const result = await inventoryService.getInventory({
        dealershipId: TEST_DEALERSHIP_1,
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(result.vehicles).toBeInstanceOf(Array);
      expect(result.total).toBeGreaterThan(0);
      expect(result.page).toBe(1);
    });

    it('should filter by status', async () => {
      const result = await inventoryService.getInventory({
        dealershipId: TEST_DEALERSHIP_1,
        status: VehicleStatus.AVAILABLE,
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(result.vehicles.every((v) => v.status === VehicleStatus.AVAILABLE)).toBe(true);
    });

    it('should update vehicle status', async () => {
      const updated = await inventoryService.updateVehicleStatus(
        vehicleId,
        TEST_DEALERSHIP_1,
        VehicleStatus.SOLD,
        TEST_USER_ID,
        'Sold to customer'
      );

      expect(updated.status).toBe(VehicleStatus.SOLD);
    });

    it('should reserve vehicle for deal', async () => {
      const reservedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const reserved = await inventoryService.reserveVehicle(
        vehicleId,
        TEST_DEALERSHIP_1,
        'deal-id-123',
        reservedUntil,
        TEST_USER_ID
      );

      expect(reserved.status).toBe(VehicleStatus.RESERVED);
      expect(reserved.reservedForDealId).toBe('deal-id-123');
    });

    it('should release vehicle reservation', async () => {
      // First reserve
      const reservedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await inventoryService.reserveVehicle(
        vehicleId,
        TEST_DEALERSHIP_1,
        'deal-id-123',
        reservedUntil,
        TEST_USER_ID
      );

      // Then release
      const released = await inventoryService.releaseVehicle(
        vehicleId,
        TEST_DEALERSHIP_1,
        TEST_USER_ID
      );

      expect(released.status).toBe(VehicleStatus.AVAILABLE);
      expect(released.reservedForDealId).toBeUndefined();
    });

    it('should get vehicle history', async () => {
      // Perform some operations to generate history
      await inventoryService.updateVehicleStatus(
        vehicleId,
        TEST_DEALERSHIP_1,
        VehicleStatus.SERVICE,
        TEST_USER_ID
      );
      await inventoryService.updateVehicleStatus(
        vehicleId,
        TEST_DEALERSHIP_1,
        VehicleStatus.AVAILABLE,
        TEST_USER_ID
      );

      const history = await inventoryService.getVehicleHistory(vehicleId, TEST_DEALERSHIP_1);

      expect(history).toBeInstanceOf(Array);
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].eventType).toBeDefined();
    });

    it('should get inventory summary', async () => {
      const summary = await inventoryService.getInventorySummary(TEST_DEALERSHIP_1);

      expect(summary.totalVehicles).toBeGreaterThanOrEqual(0);
      expect(summary.byStatus).toBeDefined();
      expect(summary.byType).toBeDefined();
      expect(summary.byMake).toBeDefined();
    });

    it('should get vehicle value metrics', async () => {
      const metrics = await inventoryService.getVehicleValueMetrics(
        vehicleId,
        TEST_DEALERSHIP_1
      );

      expect(metrics.cost).toBeGreaterThan(0);
      expect(metrics.askingPrice).toBeGreaterThan(0);
      expect(metrics.potentialProfit).toBeDefined();
      expect(metrics.daysInInventory).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance & Concurrency', () => {
    it('should handle concurrent stock number generation without duplicates', async () => {
      const promises = Array.from({ length: 10 }, () =>
        stockNumberService.generateStockNumber(TEST_DEALERSHIP_1)
      );

      const stockNumbers = await Promise.all(promises);
      const uniqueStockNumbers = new Set(stockNumbers);

      // All should be unique
      expect(uniqueStockNumbers.size).toBe(10);
    });

    it('should handle concurrent vehicle creation', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        vehicleService.createVehicle(
          TEST_DEALERSHIP_1,
          createTestVehicleData({
            vin: `1HGCM82633A12345${i}`,
          }),
          TEST_USER_ID
        )
      );

      const vehicles = await Promise.all(promises);

      expect(vehicles).toHaveLength(5);
      expect(new Set(vehicles.map((v) => v.id)).size).toBe(5);
    });
  });
});
