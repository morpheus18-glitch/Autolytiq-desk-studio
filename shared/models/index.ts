/**
 * Canonical Domain Models for Autolytiq Platform
 *
 * These are the single source of truth for all data shapes in the application.
 * All API boundaries, database schemas, and frontend components should use these models.
 *
 * Benefits:
 * - Runtime validation with Zod
 * - TypeScript type safety
 * - Consistent data shapes across the entire stack
 * - Automatic API request/response validation
 * - Clear domain boundaries
 */

// Customer Domain
export * from './customer.model';

// Deal Domain
export * from './deal.model';

// Vehicle Domain
export * from './vehicle.model';

// Tax Domain
export * from './tax.model';

// Email Domain
export * from './email.model';

// User/Auth Domain
export * from './user.model';

// Financing Domain
export * from './lender.model';
export * from './lender-program.model';
export * from './rate-request.model';
export * from './approved-lender.model';

// Deal Scenario Domain
export * from './deal-scenario.model';

// Lead Generation Domain
export * from './quick-quote.model';

// Appointment Domain
export * from './appointment.model';

// Re-export commonly used schemas for convenience
export {
  // Customer
  CustomerSchema,
  CustomerStatusSchema,
  CustomerSourceSchema,
  AddressSchema,
  ContactInfoSchema,
  CreditApplicationSchema,

  // Deal
  DealSchema,
  DealStatusSchema,
  DealTypeSchema,
  TradeInSchema,
  FinancingDetailsSchema,
  DealCalculationSchema,

  // Vehicle
  VehicleSchema,
  VehicleConditionSchema,
  VehicleStatusSchema,
  VehicleTypeSchema,
  VehiclePricingSchema,

  // Tax
  TaxCalculationSchema,
  TaxCalculationRequestSchema,
  LocalTaxInfoSchema,
  StateTaxRulesSchema,

  // Email
  EmailMessageSchema,
  EmailAccountSchema,
  EmailTemplateSchema,
  SendEmailRequestSchema,
} from './index';