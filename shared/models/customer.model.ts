import { z } from 'zod';

// Base schemas for common patterns
const phoneSchema = z.string().regex(/^\+?1?\d{10,14}$/, 'Invalid phone number format');
const emailSchema = z.string().email('Invalid email format');
const zipCodeSchema = z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format');
const stateSchema = z.string().length(2, 'State must be 2-letter code').toUpperCase();
const currencySchema = z.number().min(0).multipleOf(0.01);

// Address schema
export const AddressSchema = z.object({
  street1: z.string().min(1, 'Street address is required'),
  street2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: stateSchema,
  zipCode: zipCodeSchema,
  country: z.string().default('US'),
});

// Contact information schema
export const ContactInfoSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  middleName: z.string().optional(),
  email: emailSchema,
  phone: phoneSchema,
  alternatePhone: phoneSchema.optional(),
  preferredContactMethod: z.enum(['email', 'phone', 'text']).default('email'),
});

// Employment information schema
export const EmploymentInfoSchema = z.object({
  employerName: z.string().min(1, 'Employer name is required'),
  jobTitle: z.string().min(1, 'Job title is required'),
  monthlyIncome: currencySchema,
  yearsEmployed: z.number().min(0).max(70),
  monthsEmployed: z.number().min(0).max(11),
  employerPhone: phoneSchema.optional(),
  employerAddress: AddressSchema.optional(),
  employmentType: z.enum(['full-time', 'part-time', 'self-employed', 'retired', 'unemployed']),
});

// Credit application schema
export const CreditApplicationSchema = z.object({
  ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/, 'Invalid SSN format'),
  dateOfBirth: z.string().datetime(),
  driversLicenseNumber: z.string().min(1),
  driversLicenseState: stateSchema,
  residenceType: z.enum(['own', 'rent', 'other']),
  monthlyHousingPayment: currencySchema,
  yearsAtAddress: z.number().min(0).max(100),
  monthsAtAddress: z.number().min(0).max(11),
  previousAddress: AddressSchema.optional(),
  employment: EmploymentInfoSchema,
  coApplicant: z.lazy(() => CreditApplicationSchema).optional(),
});

// Customer status enum
export const CustomerStatusSchema = z.enum(['lead', 'prospect', 'active', 'inactive', 'archived']);

// Customer source enum
export const CustomerSourceSchema = z.enum([
  'walk-in',
  'phone',
  'website',
  'referral',
  'advertisement',
  'social-media',
  'email-campaign',
  'other',
]);

// Main Customer schema
export const CustomerSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  dealershipId: z.string().uuid(),

  // Contact Information
  contact: ContactInfoSchema,
  address: AddressSchema,

  // Business Information
  status: CustomerStatusSchema,
  source: CustomerSourceSchema,
  referredBy: z.string().optional(),
  assignedSalesperson: z.string().uuid().optional(),

  // Credit Information
  creditApplication: CreditApplicationSchema.optional(),
  creditScore: z.number().min(300).max(850).optional(),
  creditTier: z.enum(['excellent', 'good', 'fair', 'poor', 'no-credit']).optional(),

  // Preferences
  vehiclePreferences: z.object({
    types: z.array(z.enum(['sedan', 'suv', 'truck', 'van', 'coupe', 'convertible'])),
    makes: z.array(z.string()),
    priceRange: z.object({
      min: currencySchema,
      max: currencySchema,
    }),
    monthlyPaymentTarget: currencySchema.optional(),
    tradeIn: z.boolean(),
  }).optional(),

  // Metadata
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  lastContactDate: z.string().datetime().optional(),
  nextFollowUpDate: z.string().datetime().optional(),

  // System fields
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdBy: z.string().uuid(),
  updatedBy: z.string().uuid(),
});

// Types
export type Address = z.infer<typeof AddressSchema>;
export type ContactInfo = z.infer<typeof ContactInfoSchema>;
export type EmploymentInfo = z.infer<typeof EmploymentInfoSchema>;
export type CreditApplication = z.infer<typeof CreditApplicationSchema>;
export type CustomerStatus = z.infer<typeof CustomerStatusSchema>;
export type CustomerSource = z.infer<typeof CustomerSourceSchema>;
export type Customer = z.infer<typeof CustomerSchema>;

// API Request/Response schemas
export const CreateCustomerRequestSchema = CustomerSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
});

export const UpdateCustomerRequestSchema = CreateCustomerRequestSchema.partial();

export const CustomerListQuerySchema = z.object({
  tenantId: z.string().uuid(),
  dealershipId: z.string().uuid().optional(),
  status: CustomerStatusSchema.optional(),
  source: CustomerSourceSchema.optional(),
  assignedSalesperson: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'lastName', 'nextFollowUpDate']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateCustomerRequest = z.infer<typeof CreateCustomerRequestSchema>;
export type UpdateCustomerRequest = z.infer<typeof UpdateCustomerRequestSchema>;
export type CustomerListQuery = z.infer<typeof CustomerListQuerySchema>;