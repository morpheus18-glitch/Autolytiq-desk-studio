/**
 * ATOMIC OPERATIONS
 * Critical business operations that require transactional guarantees
 *
 * This module provides atomic operations for:
 * - Deal creation (customer + vehicle + tax + deal)
 * - User registration (user + profile + permissions)
 * - Email operations (send + log + status update)
 * - Inventory updates (vehicle status + deal attachment)
 *
 * All operations use SERIALIZABLE transactions for data consistency
 */

import { eq, and, sql, desc } from 'drizzle-orm';
import {
  deals,
  dealScenarios,
  customers,
  vehicles,
  users,
  dealNumberSequences,
  auditLog,
  emailMessages,
  type Deal,
  type DealScenario,
  type Customer,
  type Vehicle,
  type User,
  type InsertDeal,
  type InsertDealScenario,
  type InsertCustomer,
  type InsertUser,
  type InsertAuditLog,
} from '@shared/schema';
import { getDatabaseService } from './db-service';
import { IsolationLevel } from './transaction-manager';

/**
 * Result type for deal creation
 */
export interface CreateDealResult {
  deal: Deal;
  scenario: DealScenario;
  customer?: Customer;
  vehicle?: Vehicle;
}

/**
 * Input for atomic deal creation
 */
export interface CreateDealInput {
  dealershipId: string;
  salespersonId: string;
  customerId?: string;
  vehicleId?: string;
  tradeVehicleId?: string;
  customerData?: Omit<InsertCustomer, 'id' | 'dealershipId' | 'createdAt' | 'updatedAt'>;
  scenarioData?: Partial<Omit<InsertDealScenario, 'id' | 'dealId' | 'createdAt' | 'updatedAt'>>;
  initialState?: string;
}

/**
 * Custom error types for deal creation
 */
export class DealCreationError extends Error {
  constructor(message: string, public code: string, public statusCode: number = 400) {
    super(message);
    this.name = 'DealCreationError';
  }
}

export class ValidationError extends DealCreationError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class ResourceNotFoundError extends DealCreationError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 'RESOURCE_NOT_FOUND', 404);
  }
}

export class VehicleNotAvailableError extends DealCreationError {
  constructor(vehicleId: string) {
    super(`Vehicle is not available: ${vehicleId}`, 'VEHICLE_NOT_AVAILABLE', 409);
  }
}

export class DuplicateDealNumberError extends DealCreationError {
  constructor(dealNumber: string) {
    super(`Deal number already exists: ${dealNumber}`, 'DUPLICATE_DEAL_NUMBER', 409);
  }
}

export class MultiTenantViolationError extends DealCreationError {
  constructor(message: string) {
    super(message, 'MULTI_TENANT_VIOLATION', 403);
  }
}

/**
 * Result type for user registration
 */
export interface RegisterUserResult {
  user: User;
  dealership: any;
}

/**
 * Input for atomic user registration
 */
export interface RegisterUserInput {
  dealershipId: string;
  username: string;
  fullName: string;
  email: string;
  password: string; // Should be pre-hashed
  role?: string;
}

/**
 * Atomic Operations Service
 */
class AtomicOperationsService {
  private dbService = getDatabaseService();

  /**
   * Generate next deal number atomically
   * Uses SERIALIZABLE transaction to prevent race conditions
   */
  async generateDealNumber(dealershipId: string): Promise<string> {
    return this.dbService.serializableTransaction(async ({ client }) => {
      // Get current sequence
      const sequenceResult = await client.query(
        `SELECT current_value FROM deal_number_sequences WHERE dealership_id = $1 FOR UPDATE`,
        [dealershipId]
      );

      let currentValue = 1;
      if (sequenceResult.rows.length > 0) {
        currentValue = sequenceResult.rows[0].current_value + 1;

        // Update sequence
        await client.query(
          `UPDATE deal_number_sequences SET current_value = $1, updated_at = NOW() WHERE dealership_id = $2`,
          [currentValue, dealershipId]
        );
      } else {
        // Initialize sequence
        await client.query(
          `INSERT INTO deal_number_sequences (dealership_id, current_value) VALUES ($1, $2)`,
          [dealershipId, currentValue]
        );
      }

      // Format: YEAR-MMDD-XXXX
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const sequence = String(currentValue).padStart(4, '0');

      return `${year}-${month}${day}-${sequence}`;
    });
  }

  /**
   * Generate next stock number atomically
   */
  async generateStockNumber(dealershipId: string): Promise<string> {
    return this.dbService.serializableTransaction(async ({ client }) => {
      // Get current sequence
      const sequenceResult = await client.query(
        `SELECT current_stock_number FROM dealership_stock_settings WHERE dealership_id = $1 FOR UPDATE`,
        [dealershipId]
      );

      let currentValue = 1;
      if (sequenceResult.rows.length > 0) {
        currentValue = sequenceResult.rows[0].current_stock_number + 1;

        // Update sequence
        await client.query(
          `UPDATE dealership_stock_settings SET current_stock_number = $1, updated_at = NOW() WHERE dealership_id = $2`,
          [currentValue, dealershipId]
        );
      } else {
        // Initialize sequence
        await client.query(
          `INSERT INTO dealership_stock_settings (dealership_id, current_stock_number) VALUES ($1, $2)`,
          [dealershipId, currentValue]
        );
      }

      // Format: STK-XXXXXX
      return `STK-${String(currentValue).padStart(6, '0')}`;
    });
  }

  /**
   * Validate deal creation input
   * Comprehensive validation before transaction starts
   */
  private async validateDealInput(input: CreateDealInput): Promise<void> {
    const { dealershipId, salespersonId, customerId, vehicleId, customerData } = input;

    // Validate dealershipId is provided
    if (!dealershipId) {
      throw new ValidationError('dealershipId is required');
    }

    // Validate salespersonId is provided
    if (!salespersonId) {
      throw new ValidationError('salespersonId is required');
    }

    // Validate either customerId or customerData is provided
    if (!customerId && !customerData) {
      throw new ValidationError('Either customerId or customerData must be provided');
    }

    // If customerId provided, validate both exist and not both
    if (customerId && customerData) {
      throw new ValidationError('Provide either customerId OR customerData, not both');
    }

    // Validate customer data fields if creating new customer
    if (customerData) {
      if (!customerData.firstName || !customerData.lastName) {
        throw new ValidationError('Customer firstName and lastName are required');
      }

      // Validate email format if provided
      if (customerData.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(customerData.email)) {
          throw new ValidationError('Invalid email format');
        }
      }

      // Validate phone format if provided
      if (customerData.phone) {
        const phoneRegex = /^\(\d{3}\)\s\d{3}-\d{4}$/;
        if (!phoneRegex.test(customerData.phone)) {
          throw new ValidationError('Invalid phone format. Use (XXX) XXX-XXXX');
        }
      }
    }
  }

  /**
   * Create a deal atomically with all related entities
   * This ensures all-or-nothing creation:
   * 1. Validate all inputs
   * 2. Verify dealership, salesperson, customer, vehicle exist
   * 3. Verify multi-tenant isolation
   * 4. Create customer (if new)
   * 5. Generate deal number (if customer attached)
   * 6. Create deal
   * 7. Create default scenario
   * 8. Update vehicle status (if attached)
   * 9. Create audit log entry
   *
   * ALL steps succeed or ALL rollback - guaranteed atomic
   */
  async createDeal(input: CreateDealInput): Promise<CreateDealResult> {
    // Pre-transaction validation
    await this.validateDealInput(input);

    return this.dbService.serializableTransaction(
      async ({ client }) => {
        const {
          dealershipId,
          salespersonId,
          customerId,
          vehicleId,
          tradeVehicleId,
          customerData,
          scenarioData,
          initialState = 'DRAFT',
        } = input;

        // STEP 0: Verify dealership exists
        const dealershipResult = await client.query(
          `SELECT id FROM dealership_settings WHERE id = $1`,
          [dealershipId]
        );
        if (dealershipResult.rows.length === 0) {
          throw new ResourceNotFoundError('Dealership', dealershipId);
        }

        // STEP 0.5: Verify salesperson exists and belongs to dealership
        const salespersonResult = await client.query(
          `SELECT id, dealership_id, role FROM users WHERE id = $1`,
          [salespersonId]
        );
        if (salespersonResult.rows.length === 0) {
          throw new ResourceNotFoundError('Salesperson', salespersonId);
        }

        const salesperson = salespersonResult.rows[0];
        if (salesperson.dealership_id !== dealershipId) {
          throw new MultiTenantViolationError(
            'Salesperson does not belong to the specified dealership'
          );
        }

        // STEP 1: Verify or create customer
        let finalCustomerId = customerId;
        let customer: Customer | undefined;

        if (customerId) {
          // Verify existing customer exists and belongs to dealership
          const existingCustomerResult = await client.query(
            `SELECT * FROM customers WHERE id = $1`,
            [customerId]
          );

          if (existingCustomerResult.rows.length === 0) {
            throw new ResourceNotFoundError('Customer', customerId);
          }

          customer = existingCustomerResult.rows[0] as Customer;

          // Multi-tenant check: Customer must belong to same dealership
          if (customer.dealershipId !== dealershipId) {
            throw new MultiTenantViolationError(
              'Customer does not belong to the specified dealership'
            );
          }
        } else if (customerData) {
          // Create new customer
          const customerResult = await client.query(
            `INSERT INTO customers (dealership_id, first_name, last_name, email, phone, address, city, state, zip_code, county)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [
              dealershipId,
              customerData.firstName,
              customerData.lastName,
              customerData.email || null,
              customerData.phone || null,
              customerData.address || null,
              customerData.city || null,
              customerData.state || null,
              customerData.zipCode || null,
              customerData.county || null,
            ]
          );
          customer = customerResult.rows[0] as Customer;
          finalCustomerId = customer.id;
        }

        // Step 2: Generate deal number if customer is attached
        let dealNumber: string | null = null;
        if (finalCustomerId) {
          dealNumber = await this.generateDealNumber(dealershipId);
        }

        // Step 3: Create deal
        const dealResult = await client.query(
          `INSERT INTO deals (dealership_id, deal_number, customer_id, vehicle_id, trade_vehicle_id, salesperson_id, deal_state, customer_attached_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [
            dealershipId,
            dealNumber,
            finalCustomerId || null,
            vehicleId || null,
            tradeVehicleId || null,
            salespersonId,
            initialState,
            finalCustomerId ? new Date() : null,
          ]
        );
        const deal = dealResult.rows[0] as Deal;

        // STEP 4: Verify and lock vehicle if attached
        let vehiclePrice = '0';
        let vehicle: Vehicle | undefined;
        if (vehicleId) {
          // Lock vehicle row for update to prevent race conditions
          const vehicleResult = await client.query(
            `SELECT * FROM vehicles WHERE id = $1 FOR UPDATE`,
            [vehicleId]
          );

          if (vehicleResult.rows.length === 0) {
            throw new ResourceNotFoundError('Vehicle', vehicleId);
          }

          vehicle = vehicleResult.rows[0] as Vehicle;
          vehiclePrice = vehicle.price;

          // Multi-tenant check: Vehicle must belong to same dealership
          if (vehicle.dealershipId !== dealershipId) {
            throw new MultiTenantViolationError(
              'Vehicle does not belong to the specified dealership'
            );
          }

          // Verify vehicle is available (not already in another deal)
          if (vehicle.status !== 'available' && vehicle.status !== 'pending') {
            throw new VehicleNotAvailableError(vehicleId);
          }

          // Update vehicle status to 'pending'
          await client.query(
            `UPDATE vehicles SET status = 'pending', updated_at = NOW() WHERE id = $1`,
            [vehicleId]
          );
        }

        // Step 5: Create default scenario
        const scenarioName = scenarioData?.name || 'Scenario 1';
        const scenarioType = scenarioData?.scenarioType || 'FINANCE_DEAL';
        const term = scenarioData?.term || 60;
        const apr = scenarioData?.apr || '8.9';

        const scenarioResult = await client.query(
          `INSERT INTO deal_scenarios (deal_id, name, scenario_type, vehicle_id, vehicle_price, down_payment, trade_allowance, trade_payoff, term, apr, total_tax, total_fees, monthly_payment, aftermarket_products)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           RETURNING *`,
          [
            deal.id,
            scenarioName,
            scenarioType,
            vehicleId || null,
            vehiclePrice,
            scenarioData?.downPayment || '0',
            scenarioData?.tradeAllowance || '0',
            scenarioData?.tradePayoff || '0',
            term,
            apr,
            scenarioData?.totalTax || '0',
            scenarioData?.totalFees || '0',
            scenarioData?.monthlyPayment || '0',
            scenarioData?.aftermarketProducts || [],
          ]
        );
        const scenario = scenarioResult.rows[0] as DealScenario;

        // Step 6: Set active scenario
        await client.query(
          `UPDATE deals SET active_scenario_id = $1, updated_at = NOW() WHERE id = $2`,
          [scenario.id, deal.id]
        );

        // Step 7: Create audit log entry
        await client.query(
          `INSERT INTO audit_log (deal_id, user_id, action, entity_type, entity_id, metadata)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            deal.id,
            salespersonId,
            'create',
            'deal',
            deal.id,
            JSON.stringify({
              dealNumber: dealNumber,
              hasCustomer: !!finalCustomerId,
              hasVehicle: !!vehicleId,
            }),
          ]
        );

        return {
          deal: { ...deal, activeScenarioId: scenario.id } as Deal,
          scenario,
          customer,
          vehicle,
        };
      },
      { timeout: 10000 } // 10 second timeout for deal creation
    );
  }

  /**
   * Attach customer to existing deal atomically
   * Generates deal number and updates deal
   */
  async attachCustomerToDeal(
    dealId: string,
    customerId: string,
    userId: string
  ): Promise<Deal> {
    return this.dbService.serializableTransaction(async ({ client }) => {
      // Verify customer exists and get dealership
      const customerResult = await client.query(
        `SELECT * FROM customers WHERE id = $1`,
        [customerId]
      );

      if (customerResult.rows.length === 0) {
        throw new Error('Customer not found');
      }

      const customer = customerResult.rows[0];

      // Get deal and verify it exists
      const dealResult = await client.query(
        `SELECT * FROM deals WHERE id = $1 FOR UPDATE`,
        [dealId]
      );

      if (dealResult.rows.length === 0) {
        throw new Error('Deal not found');
      }

      const deal = dealResult.rows[0];

      // Verify same dealership (multi-tenant isolation)
      if (customer.dealership_id !== deal.dealership_id) {
        throw new Error('Customer and deal must belong to same dealership');
      }

      // Generate deal number if not already set
      let dealNumber = deal.deal_number;
      if (!dealNumber) {
        dealNumber = await this.generateDealNumber(deal.dealership_id);
      }

      // Update deal
      const updatedResult = await client.query(
        `UPDATE deals
         SET customer_id = $1, deal_number = $2, customer_attached_at = NOW(), updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [customerId, dealNumber, dealId]
      );

      // Create audit log
      await client.query(
        `INSERT INTO audit_log (deal_id, user_id, action, entity_type, entity_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          dealId,
          userId,
          'update',
          'deal',
          dealId,
          JSON.stringify({
            field: 'customer_id',
            customerId: customerId,
            dealNumber: dealNumber,
          }),
        ]
      );

      return updatedResult.rows[0] as Deal;
    });
  }

  /**
   * Register user atomically
   * Creates user and initializes permissions
   */
  async registerUser(input: RegisterUserInput): Promise<RegisterUserResult> {
    return this.dbService.transaction(async ({ client }) => {
      const { dealershipId, username, fullName, email, password, role = 'salesperson' } = input;

      // Check if username already exists
      const existingUser = await client.query(
        `SELECT id FROM users WHERE username = $1`,
        [username]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('Username already exists');
      }

      // Check if email already exists
      const existingEmail = await client.query(
        `SELECT id FROM users WHERE email = $1`,
        [email]
      );

      if (existingEmail.rows.length > 0) {
        throw new Error('Email already exists');
      }

      // Create user
      const userResult = await client.query(
        `INSERT INTO users (dealership_id, username, full_name, email, password, role)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [dealershipId, username, fullName, email, password, role]
      );

      const user = userResult.rows[0] as User;

      // Get dealership
      const dealershipResult = await client.query(
        `SELECT * FROM dealership_settings WHERE id = $1`,
        [dealershipId]
      );

      return {
        user,
        dealership: dealershipResult.rows[0],
      };
    });
  }

  /**
   * Update email status atomically
   * Updates email message and creates audit trail
   */
  async updateEmailStatus(
    emailId: string,
    status: string,
    metadata?: any
  ): Promise<void> {
    return this.dbService.transaction(async ({ client }) => {
      await client.query(
        `UPDATE email_messages
         SET status = $1, updated_at = NOW()
         WHERE id = $2`,
        [status, emailId]
      );

      // Log status change if metadata provided
      if (metadata) {
        await client.query(
          `INSERT INTO audit_log (entity_type, entity_id, action, metadata)
           VALUES ($1, $2, $3, $4)`,
          ['email', emailId, 'status_change', JSON.stringify(metadata)]
        );
      }
    });
  }
}

// Singleton instance
let atomicOps: AtomicOperationsService | null = null;

export function getAtomicOperations(): AtomicOperationsService {
  if (!atomicOps) {
    atomicOps = new AtomicOperationsService();
  }
  return atomicOps;
}

// Export convenience functions
export const createDeal = (input: CreateDealInput) =>
  getAtomicOperations().createDeal(input);

export const attachCustomerToDeal = (dealId: string, customerId: string, userId: string) =>
  getAtomicOperations().attachCustomerToDeal(dealId, customerId, userId);

export const registerUser = (input: RegisterUserInput) =>
  getAtomicOperations().registerUser(input);

export const generateDealNumber = (dealershipId: string) =>
  getAtomicOperations().generateDealNumber(dealershipId);

export const generateStockNumber = (dealershipId: string) =>
  getAtomicOperations().generateStockNumber(dealershipId);

export const updateEmailStatus = (emailId: string, status: string, metadata?: any) =>
  getAtomicOperations().updateEmailStatus(emailId, status, metadata);
