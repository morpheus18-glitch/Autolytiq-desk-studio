/**
 * CUSTOMER MODULE TYPES
 * Complete type definitions for customer management with strict validation
 */

import { z } from 'zod';

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

// E.164 international phone format: +[country code][number]
// Allows optional + and country code, 10-15 digits
const phoneRegex = /^\+?[1-9]\d{9,14}$/;

// US ZIP code: 5 digits or 5+4 format
const zipRegex = /^\d{5}(-\d{4})?$/;

// US state codes (2 letters)
const usStateRegex = /^[A-Z]{2}$/;

// SSN last 4 digits only
const ssnLast4Regex = /^\d{4}$/;

// Driver's license (alphanumeric, varies by state)
const dlRegex = /^[A-Z0-9]{1,20}$/i;

// ============================================================================
// BASE SCHEMAS
// ============================================================================

const currencySchema = z.number().min(0).multipleOf(0.01);

// Phone number schema - normalizes to E.164 format
export const phoneSchema = z
  .string()
  .regex(phoneRegex, 'Invalid phone number format')
  .transform((val) => {
    // Remove all non-digits
    const digits = val.replace(/\D/g, '');

    // US number without country code
    if (digits.length === 10) {
      return `+1${digits}`;
    }

    // US number with country code
    if (digits.length === 11 && digits[0] === '1') {
      return `+${digits}`;
    }

    // Already formatted or international
    return val.startsWith('+') ? val : `+${val}`;
  });

// Email schema with normalization
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .toLowerCase()
  .trim();

// Address schema with normalization
export const AddressSchema = z.object({
  street: z.string().min(1, 'Street address is required').trim(),
  city: z.string().min(1, 'City is required').trim(),
  state: z
    .string()
    .length(2, 'State must be 2-letter code')
    .toUpperCase()
    .regex(usStateRegex, 'Invalid state code'),
  zipCode: z
    .string()
    .regex(zipRegex, 'Invalid ZIP code format')
    .transform((val) => val.replace(/\D/g, '').slice(0, 5)),
  county: z.string().optional(),
  country: z.string().default('US'),
});

// Driver's license schema
export const DriversLicenseSchema = z.object({
  number: z
    .string()
    .min(1, 'License number is required')
    .regex(dlRegex, 'Invalid license number format')
    .toUpperCase(),
  state: z
    .string()
    .length(2, 'State must be 2-letter code')
    .toUpperCase()
    .regex(usStateRegex, 'Invalid state code'),
  expirationDate: z.string().datetime().optional(),
  imageUrl: z.string().url().optional(),
});

// ============================================================================
// ENUMS
// ============================================================================

export const CustomerStatus = {
  LEAD: 'lead',
  PROSPECT: 'prospect',
  QUALIFIED: 'qualified',
  ACTIVE: 'active',
  SOLD: 'sold',
  LOST: 'lost',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
} as const;

export type CustomerStatusType = (typeof CustomerStatus)[keyof typeof CustomerStatus];

export const customerStatusSchema = z.enum([
  'lead',
  'prospect',
  'qualified',
  'active',
  'sold',
  'lost',
  'inactive',
  'archived',
]);

export const CustomerSource = {
  WALK_IN: 'walk-in',
  PHONE: 'phone',
  WEBSITE: 'website',
  REFERRAL: 'referral',
  ADVERTISEMENT: 'advertisement',
  SOCIAL_MEDIA: 'social-media',
  EMAIL_CAMPAIGN: 'email-campaign',
  SERVICE: 'service',
  PARTS: 'parts',
  OTHER: 'other',
} as const;

export type CustomerSourceType = (typeof CustomerSource)[keyof typeof CustomerSource];

export const customerSourceSchema = z.enum([
  'walk-in',
  'phone',
  'website',
  'referral',
  'advertisement',
  'social-media',
  'email-campaign',
  'service',
  'parts',
  'other',
]);

export const PreferredContactMethod = {
  EMAIL: 'email',
  PHONE: 'phone',
  SMS: 'sms',
  ANY: 'any',
} as const;

export type PreferredContactMethodType =
  (typeof PreferredContactMethod)[keyof typeof PreferredContactMethod];

export const preferredContactMethodSchema = z.enum(['email', 'phone', 'sms', 'any']);

// ============================================================================
// VEHICLE SCHEMAS (for current vehicle and trade-in)
// ============================================================================

export const VehicleInfoSchema = z.object({
  year: z.number().min(1900).max(new Date().getFullYear() + 2),
  make: z.string().min(1),
  model: z.string().min(1),
  trim: z.string().optional(),
  vin: z.string().length(17, 'VIN must be exactly 17 characters').optional(),
  mileage: z.number().min(0).optional(),
  color: z.string().optional(),
});

export const TradeInInfoSchema = VehicleInfoSchema.extend({
  allowance: currencySchema.optional(),
  actualCashValue: currencySchema.optional(),
  payoffAmount: currencySchema.optional(),
  payoffLender: z.string().optional(),
  condition: z.enum(['excellent', 'good', 'fair', 'poor']).optional(),
  notes: z.string().optional(),
});

// ============================================================================
// MAIN CUSTOMER SCHEMA
// ============================================================================

export const CustomerSchema = z.object({
  // System fields
  id: z.string().uuid(),
  dealershipId: z.string().uuid(),
  customerNumber: z.string().optional(),

  // Basic information
  firstName: z.string().min(1, 'First name is required').trim(),
  lastName: z.string().min(1, 'Last name is required').trim(),
  middleName: z.string().optional(),
  suffix: z.string().optional(), // Jr., Sr., III, etc.

  // Contact information
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  alternatePhone: phoneSchema.optional(),
  preferredContactMethod: preferredContactMethodSchema.default('email'),

  // Address
  address: AddressSchema.optional(),

  // Personal information
  dateOfBirth: z.string().datetime().optional(),
  driversLicense: DriversLicenseSchema.optional(),
  ssnLast4: z
    .string()
    .regex(ssnLast4Regex, 'SSN last 4 must be exactly 4 digits')
    .optional(),

  // Employment
  employer: z.string().optional(),
  occupation: z.string().optional(),
  monthlyIncome: currencySchema.optional(),

  // Credit
  creditScore: z.number().min(300).max(850).optional(),
  creditTier: z.enum(['excellent', 'good', 'fair', 'poor', 'no-credit']).optional(),

  // Status and tracking
  status: customerStatusSchema,
  source: customerSourceSchema.optional(),
  referredBy: z.string().optional(),
  assignedSalespersonId: z.string().uuid().optional(),

  // Current vehicle
  currentVehicle: VehicleInfoSchema.optional(),

  // Trade-in
  tradeIn: TradeInInfoSchema.optional(),

  // Marketing
  marketingOptIn: z.boolean().default(false),
  doNotContact: z.boolean().default(false),

  // Media
  photoUrl: z.string().url().optional(),

  // Metadata
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  lastContactDate: z.string().datetime().optional(),
  nextFollowUpDate: z.string().datetime().optional(),

  // System timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().optional(), // Soft delete
});

// ============================================================================
// DERIVED TYPES
// ============================================================================

export type Address = z.infer<typeof AddressSchema>;
export type DriversLicense = z.infer<typeof DriversLicenseSchema>;
export type VehicleInfo = z.infer<typeof VehicleInfoSchema>;
export type TradeInInfo = z.infer<typeof TradeInInfoSchema>;
export type Customer = z.infer<typeof CustomerSchema>;

// ============================================================================
// REQUEST/RESPONSE SCHEMAS
// ============================================================================

// Create customer request - omit system-generated fields
export const CreateCustomerRequestSchema = CustomerSchema.omit({
  id: true,
  dealershipId: true,
  customerNumber: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
}).extend({
  // Make at least email or phone required
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
}).refine(
  (data) => data.email || data.phone,
  {
    message: 'Either email or phone is required',
    path: ['email'],
  }
);

// Update customer request - all fields optional except requires at least one field
export const UpdateCustomerRequestSchema = CustomerSchema.omit({
  id: true,
  dealershipId: true,
  customerNumber: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
}).partial();

// Customer list query filters
export const CustomerListQuerySchema = z.object({
  dealershipId: z.string().uuid(),

  // Filters
  status: customerStatusSchema.optional(),
  source: customerSourceSchema.optional(),
  assignedSalespersonId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),

  // Search
  search: z.string().optional(), // Searches name, email, phone, customer number

  // Date ranges
  createdFrom: z.string().datetime().optional(),
  createdTo: z.string().datetime().optional(),
  lastContactFrom: z.string().datetime().optional(),
  lastContactTo: z.string().datetime().optional(),

  // Follow-up filtering
  needsFollowUp: z.boolean().optional(), // Has nextFollowUpDate in past or today

  // Pagination
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),

  // Sorting
  sortBy: z
    .enum([
      'createdAt',
      'updatedAt',
      'lastName',
      'nextFollowUpDate',
      'lastContactDate',
      'customerNumber',
    ])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),

  // Include deleted customers
  includeDeleted: z.boolean().default(false),
});

// Duplicate search request
export const DuplicateSearchSchema = z.object({
  dealershipId: z.string().uuid(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  driversLicenseNumber: z.string().optional(),
});

// Customer timeline event
export const TimelineEventSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['deal', 'email', 'note', 'call', 'appointment', 'test-drive', 'other']),
  date: z.string().datetime(),
  title: z.string(),
  description: z.string().optional(),
  relatedId: z.string().uuid().optional(), // ID of related entity (deal, email, etc.)
  userId: z.string().uuid().optional(), // User who created the event
  metadata: z.record(z.any()).optional(),
});

// Validation result
export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(
    z.object({
      field: z.string(),
      message: z.string(),
      code: z.string().optional(),
    })
  ),
  warnings: z.array(
    z.object({
      field: z.string(),
      message: z.string(),
      code: z.string().optional(),
    })
  ).optional(),
});

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export const PaginatedCustomersSchema = z.object({
  customers: z.array(CustomerSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
  hasMore: z.boolean(),
});

export const CustomerWithRelationsSchema = CustomerSchema.extend({
  deals: z.array(z.any()).optional(), // Deal type from deal module
  dealCount: z.number().optional(),
  lastDealDate: z.string().datetime().optional(),
  totalPurchases: z.number().optional(),
  lifetimeValue: z.number().optional(),
});

// ============================================================================
// INFERRED TYPES
// ============================================================================

export type CreateCustomerRequest = z.infer<typeof CreateCustomerRequestSchema>;
export type UpdateCustomerRequest = z.infer<typeof UpdateCustomerRequestSchema>;
export type CustomerListQuery = z.infer<typeof CustomerListQuerySchema>;
export type DuplicateSearch = z.infer<typeof DuplicateSearchSchema>;
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;
export type ValidationResult = z.infer<typeof ValidationResultSchema>;
export type PaginatedCustomers = z.infer<typeof PaginatedCustomersSchema>;
export type CustomerWithRelations = z.infer<typeof CustomerWithRelationsSchema>;

// ============================================================================
// ERROR TYPES
// ============================================================================

export class CustomerError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'CustomerError';
  }
}

export class CustomerNotFoundError extends CustomerError {
  constructor(customerId: string) {
    super(`Customer not found: ${customerId}`, 'CUSTOMER_NOT_FOUND', 404);
  }
}

export class CustomerValidationError extends CustomerError {
  constructor(
    message: string,
    public validationErrors: ValidationResult['errors']
  ) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class DuplicateCustomerError extends CustomerError {
  constructor(
    message: string,
    public duplicates: Customer[]
  ) {
    super(message, 'DUPLICATE_CUSTOMER', 409);
  }
}

export class CustomerAccessDeniedError extends CustomerError {
  constructor(customerId: string) {
    super(
      `Access denied to customer: ${customerId}`,
      'ACCESS_DENIED',
      403
    );
  }
}
