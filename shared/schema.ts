/**
 * Clean Rebuild Database Schema
 *
 * Starting minimal - will build up properly during Week 2+
 * Reference old schema when porting logic, but this is clean slate
 */

import { pgTable, text, uuid, timestamp, boolean, decimal, integer } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// Password validation constants
const MIN_PASSWORD_LENGTH = 8;

// ===========================================
// Core Tables - Minimal Start
// ===========================================

/**
 * Dealerships - Multi-tenant root
 */
export const dealerships = pgTable('dealerships', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  // More fields to be added during implementation
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Users - Authentication
 * Full implementation in Week 2
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', {
    enum: ['admin', 'manager', 'salesperson', 'viewer'],
  })
    .notNull()
    .default('salesperson'),
  dealershipId: uuid('dealership_id')
    .notNull()
    .references(() => dealerships.id, { onDelete: 'cascade' }),

  // MFA
  mfaEnabled: boolean('mfa_enabled').notNull().default(false),
  mfaSecret: text('mfa_secret'),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at'),
});

// ===========================================
// Customers - With Address-Driven Tax Schema
// ===========================================

/**
 * Customers Table
 *
 * Core customer entity with address-driven tax context.
 * The customer's address automatically determines their tax jurisdiction,
 * which is then applied to all deals for this customer.
 *
 * TAX SCHEMA FLOW:
 * 1. Customer address is entered/updated
 * 2. Jurisdiction resolver determines state + local tax jurisdiction
 * 3. Tax context fields are auto-populated (taxStateCode, taxJurisdictionCode, etc.)
 * 4. When a deal is created, these tax rules are automatically applied
 */
export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  dealershipId: uuid('dealership_id')
    .notNull()
    .references(() => dealerships.id, { onDelete: 'cascade' }),

  // Basic Customer Info
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  source: text('source'), // lead source (walk-in, web, referral, etc.)
  notes: text('notes'),

  // ===========================================
  // ADDRESS - This determines the Tax Schema
  // ===========================================
  addressStreet: text('address_street'),
  addressCity: text('address_city'),
  addressState: text('address_state'), // 2-letter state code (IN, TX, CA)
  addressZip: text('address_zip'), // ZIP code - determines local jurisdiction
  addressCounty: text('address_county'), // County name - for county-specific taxes

  // ===========================================
  // DERIVED TAX CONTEXT (Auto-populated on address save)
  // ===========================================
  // These fields are automatically populated when the address is saved
  // by the jurisdiction resolver. They represent the resolved tax schema.

  /** Resolved state code for tax calculation (may differ from addressState for edge cases) */
  taxStateCode: text('tax_state_code'),

  /** Local jurisdiction code (e.g., "TX_DALLAS_CO" or "IN_MARION_INDIANAPOLIS") */
  taxJurisdictionCode: text('tax_jurisdiction_code'),

  /** Human-readable jurisdiction name (e.g., "Dallas County, TX" or "Indianapolis, IN") */
  taxJurisdictionName: text('tax_jurisdiction_name'),

  /** Pre-computed combined tax rate (state + local) as decimal (e.g., 0.0825 for 8.25%) */
  taxCombinedRate: decimal('tax_combined_rate', { precision: 6, scale: 5 }),

  /** State-only tax rate as decimal */
  taxStateRate: decimal('tax_state_rate', { precision: 6, scale: 5 }),

  /** Local-only tax rate as decimal (county + city + district) */
  taxLocalRate: decimal('tax_local_rate', { precision: 6, scale: 5 }),

  /** Version of the tax rules that were applied (for audit trail) */
  taxSchemaVersion: integer('tax_schema_version'),

  /** When the tax context was last resolved/updated */
  taxResolvedAt: timestamp('tax_resolved_at'),

  // ===========================================
  // Timestamps
  // ===========================================
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ===========================================
// Vehicles - Inventory
// ===========================================

/**
 * Vehicles Table
 *
 * Dealership vehicle inventory with pricing for deals.
 */
export const vehicles = pgTable('vehicles', {
  id: uuid('id').primaryKey().defaultRandom(),
  dealershipId: uuid('dealership_id')
    .notNull()
    .references(() => dealerships.id, { onDelete: 'cascade' }),

  // Vehicle Identification
  vin: text('vin').notNull(),
  stockNumber: text('stock_number'),

  // Vehicle Details
  year: integer('year').notNull(),
  make: text('make').notNull(),
  model: text('model').notNull(),
  trim: text('trim'),
  exteriorColor: text('exterior_color'),
  interiorColor: text('interior_color'),
  mileage: integer('mileage').notNull().default(0),

  // Condition & Status
  condition: text('condition', {
    enum: ['new', 'used', 'certified'],
  })
    .notNull()
    .default('used'),
  status: text('status', {
    enum: ['available', 'pending', 'sold', 'hold', 'in_service'],
  })
    .notNull()
    .default('available'),

  // Pricing
  msrp: decimal('msrp', { precision: 12, scale: 2 }),
  invoice: decimal('invoice', { precision: 12, scale: 2 }),
  cost: decimal('cost', { precision: 12, scale: 2 }),
  askingPrice: decimal('asking_price', { precision: 12, scale: 2 }).notNull(),
  internetPrice: decimal('internet_price', { precision: 12, scale: 2 }),

  // Additional Info
  description: text('description'),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ===========================================
// Deals - With Auto-Applied Tax Context
// ===========================================

/**
 * Deals Table
 *
 * Vehicle deals with automatic tax application from customer profile.
 * When a deal is created, the tax context is pulled from the customer's
 * profile and applied automatically.
 */
export const deals = pgTable('deals', {
  id: uuid('id').primaryKey().defaultRandom(),
  dealershipId: uuid('dealership_id')
    .notNull()
    .references(() => dealerships.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'restrict' }),
  vehicleId: uuid('vehicle_id').references(() => vehicles.id, { onDelete: 'set null' }),
  salespersonId: uuid('salesperson_id').references(() => users.id, { onDelete: 'set null' }),

  // Deal Status
  status: text('status', {
    enum: [
      'lead',
      'contacted',
      'negotiating',
      'financing',
      'pending_delivery',
      'delivered',
      'lost',
    ],
  })
    .notNull()
    .default('lead'),

  // Deal Type
  dealType: text('deal_type', {
    enum: ['cash', 'finance', 'lease'],
  })
    .notNull()
    .default('finance'),

  // ===========================================
  // DELIVERY METHOD - Affects Tax Calculation
  // ===========================================
  deliveryMethod: text('delivery_method', {
    enum: ['drive_off', 'shipped', 'customer_pickup', 'dealer_delivered'],
  })
    .notNull()
    .default('drive_off'),

  /** For shipped vehicles: destination state (may override customer's tax state) */
  deliveryDestinationState: text('delivery_destination_state'),

  /** Bill of lading for shipped vehicles (required for tax exemption in many states) */
  billOfLading: text('bill_of_lading'),

  // ===========================================
  // TAX CONTEXT (Snapshot from Customer at Deal Creation)
  // ===========================================
  // These fields capture the tax context at the time of deal creation.
  // This ensures the deal uses the tax rules that were in effect when
  // the deal was created, even if the customer's address changes later.

  /** Tax state code used for this deal */
  taxStateCode: text('tax_state_code'),

  /** Tax jurisdiction code used for this deal */
  taxJurisdictionCode: text('tax_jurisdiction_code'),

  /** Combined tax rate used for this deal */
  taxCombinedRate: decimal('tax_combined_rate', { precision: 6, scale: 5 }),

  /** Total tax amount calculated */
  taxAmount: decimal('tax_amount', { precision: 12, scale: 2 }),

  // ===========================================
  // Pricing & Financial Terms
  // ===========================================
  salePrice: decimal('sale_price', { precision: 12, scale: 2 }),

  // Trade-In
  tradeAllowance: decimal('trade_allowance', { precision: 12, scale: 2 }),
  tradePayoff: decimal('trade_payoff', { precision: 12, scale: 2 }),

  // Down Payment & Rebates
  cashDown: decimal('cash_down', { precision: 12, scale: 2 }),
  rebates: decimal('rebates', { precision: 12, scale: 2 }),

  // Finance Terms (for finance deals)
  amountFinanced: decimal('amount_financed', { precision: 12, scale: 2 }),
  apr: decimal('apr', { precision: 5, scale: 3 }),
  termMonths: integer('term_months'),
  monthlyPayment: decimal('monthly_payment', { precision: 10, scale: 2 }),

  // Lease Terms (for lease deals)
  residualValue: decimal('residual_value', { precision: 12, scale: 2 }),
  moneyFactor: decimal('money_factor', { precision: 8, scale: 6 }),
  leasePayment: decimal('lease_payment', { precision: 10, scale: 2 }),

  // Fees
  docFee: decimal('doc_fee', { precision: 10, scale: 2 }),
  otherFees: decimal('other_fees', { precision: 10, scale: 2 }),

  // Totals
  totalDue: decimal('total_due', { precision: 12, scale: 2 }),

  // Notes
  notes: text('notes'),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  closedAt: timestamp('closed_at'),
});

// ===========================================
// Zod Schemas (Auto-generated from Drizzle)
// ===========================================

// Dealerships
export const insertDealershipSchema = createInsertSchema(dealerships).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectDealershipSchema = createSelectSchema(dealerships);

// Users
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  passwordHash: true, // Never expose in API
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
});

export const selectUserSchema = createSelectSchema(users).omit({
  passwordHash: true, // Never expose password hash
  mfaSecret: true, // Never expose MFA secret
});

// Custom validation schemas for auth
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  mfaCode: z
    .string()
    .regex(/^[0-9]{6}$/, 'MFA code must be 6 digits')
    .optional(),
});

export const createUserSchema = insertUserSchema
  .extend({
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain uppercase letter')
      .regex(/[a-z]/, 'Password must contain lowercase letter')
      .regex(/[0-9]/, 'Password must contain number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

// Customers
export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  // Tax context fields are auto-populated, not manually set
  taxStateCode: true,
  taxJurisdictionCode: true,
  taxJurisdictionName: true,
  taxCombinedRate: true,
  taxStateRate: true,
  taxLocalRate: true,
  taxSchemaVersion: true,
  taxResolvedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const selectCustomerSchema = createSelectSchema(customers);

// Vehicles
export const insertVehicleSchema = createInsertSchema(vehicles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectVehicleSchema = createSelectSchema(vehicles);

// Deals
export const insertDealSchema = createInsertSchema(deals).omit({
  id: true,
  // Tax context is auto-populated from customer
  taxStateCode: true,
  taxJurisdictionCode: true,
  taxCombinedRate: true,
  taxAmount: true,
  createdAt: true,
  updatedAt: true,
  closedAt: true,
});

export const selectDealSchema = createSelectSchema(deals);

// ===========================================
// TypeScript Types (Inferred from schema)
// ===========================================

export type Dealership = typeof dealerships.$inferSelect;
export type InsertDealership = z.infer<typeof insertDealershipSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;

export type Deal = typeof deals.$inferSelect;
export type InsertDeal = z.infer<typeof insertDealSchema>;

// ===========================================
// Tax Context Types
// ===========================================

/**
 * Tax Jurisdiction Result
 *
 * Returned by the jurisdiction resolver when an address is resolved.
 */
export interface TaxJurisdictionResult {
  stateCode: string;
  jurisdictionCode: string;
  jurisdictionName: string;
  combinedRate: number;
  stateRate: number;
  localRate: number;
  schemaVersion: number;
}

/**
 * Address Input for Tax Resolution
 */
export interface TaxAddressInput {
  street?: string;
  city?: string;
  state: string; // Required - 2-letter state code
  zip?: string;
  county?: string;
}

/**
 * Delivery Method Enum
 */
export type DeliveryMethod = 'drive_off' | 'shipped' | 'customer_pickup' | 'dealer_delivered';

/**
 * Deal Type Enum
 */
export type DealType = 'cash' | 'finance' | 'lease';
