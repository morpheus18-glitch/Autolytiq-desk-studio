/**
 * Centralized Type Exports
 *
 * All domain model types and common types exported from one location
 */

// ===== DOMAIN MODELS =====

// Customer Domain
export type {
  Customer,
  CreateCustomerInput,
  UpdateCustomerInput,
  ContactInfo,
  Address,
  CreditApplication,
} from '../models/customer.model';

export {
  CustomerSchema,
  CreateCustomerSchema,
  UpdateCustomerSchema,
  ContactInfoSchema,
  AddressSchema,
  CreditApplicationSchema,
} from '../models/customer.model';

// Deal Domain
export type {
  Deal,
  CreateDealInput,
  UpdateDealInput,
  DealCalculation,
  FinancingDetails,
  TradeIn,
} from '../models/deal.model';

export {
  DealSchema,
  CreateDealSchema,
  UpdateDealSchema,
  DealCalculationSchema,
  FinancingDetailsSchema,
  TradeInSchema,
} from '../models/deal.model';

// Vehicle Domain
export type {
  Vehicle,
  CreateVehicleRequest,
  UpdateVehicleRequest,
  VehicleListQuery,
  VehicleCondition,
  VehicleStatus,
  VehicleType,
  VehicleSpecs,
  VehicleFeatures,
  VehiclePricing,
  VehicleHistory,
  VehicleLocation,
} from '../models/vehicle.model';

export {
  VehicleSchema,
  CreateVehicleRequestSchema,
  UpdateVehicleRequestSchema,
  VehicleListQuerySchema,
  VehicleConditionSchema,
  VehicleStatusSchema,
  VehicleTypeSchema,
  VehicleSpecsSchema,
  VehicleFeaturesSchema,
  VehiclePricingSchema,
  VehicleHistorySchema,
  VehicleLocationSchema,
} from '../models/vehicle.model';

// Email Domain
export type {
  EmailMessage,
  SendEmailRequest,
  EmailListQuery,
  EmailParticipant,
  EmailStatus,
  EmailPriority,
  EmailCategory,
  EmailDirection,
  EmailAttachment,
  EmailHeader,
  EmailThread,
  EmailTemplate,
  EmailAccount,
} from '../models/email.model';

export {
  EmailMessageSchema,
  SendEmailRequestSchema,
  EmailListQuerySchema,
  EmailParticipantSchema,
  EmailStatusSchema,
  EmailPrioritySchema,
  EmailCategorySchema,
  EmailDirectionSchema,
  EmailAttachmentSchema,
  EmailHeaderSchema,
  EmailThreadSchema,
  EmailTemplateSchema,
  EmailAccountSchema,
} from '../models/email.model';

// Appointment Domain
export type {
  Appointment,
  CreateAppointmentInput,
  UpdateAppointmentInput,
} from '../models/appointment.model';

export {
  AppointmentSchema,
  CreateAppointmentSchema,
  UpdateAppointmentSchema,
} from '../models/appointment.model';

// User Domain
export type { User, CreateUserInput, UpdateUserInput } from '../models/user.model';

export { UserSchema, CreateUserSchema, UpdateUserSchema } from '../models/user.model';

// Lender Domain
export type { Lender } from '../models/lender.model';
export { LenderSchema } from '../models/lender.model';

// Tax Domain
export type {
  TaxCalculation,
  LocalTaxInfo,
  StateTaxRules,
  TaxLineItem,
} from '../models/tax.model';

export {
  TaxCalculationSchema,
  LocalTaxInfoSchema,
  StateTaxRulesSchema,
  TaxLineItemSchema,
} from '../models/tax.model';

// ===== API RESPONSE & UTILITY TYPES =====
// Comprehensive type definitions for API responses and common patterns
export * from './api-responses';
export * from './utility-types';

/**
 * Standard API response wrapper (LEGACY - use ApiSuccessResponse/ApiErrorResponse from api-responses.ts)
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Sort order for queries
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}

/**
 * Date range filter
 */
export interface DateRangeFilter {
  from?: string;
  to?: string;
}

/**
 * Search filter
 */
export interface SearchFilter {
  query: string;
  fields?: string[];
}

// ===== DATABASE TYPES =====

/**
 * Generic database row for PostgreSQL queries
 */
export interface DbRow {
  [key: string]: unknown;
}

/**
 * Database query result
 */
export interface DbQueryResult<T = DbRow> {
  rows: T[];
  rowCount: number;
  command: string;
}

/**
 * Multi-tenant fields
 */
export interface TenantFields {
  tenantId: string;
  dealershipId: string;
}

/**
 * Audit trail fields
 */
export interface AuditFields {
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * Soft delete fields
 */
export interface SoftDeleteFields {
  deletedAt?: string | null;
  deletedBy?: string | null;
}

/**
 * Complete entity base with all common fields
 */
export interface EntityBase extends TenantFields, AuditFields {
  id: string;
}

// ===== AUTH & SESSION TYPES =====

/**
 * Express session extended with auth data
 */
export interface AuthSession {
  userId?: string;
  pending2faUserId?: string;
  dealershipId?: string;
  tenantId?: string;
}

/**
 * User preferences structure
 */
export interface UserPreferences {
  theme?: 'light' | 'dark';
  language?: string;
  timezone?: string;
  notifications?: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
  };
  dashboard?: {
    defaultView?: string;
    widgets?: string[];
  };
  [key: string]: unknown;
}

/**
 * Authenticated user without sensitive data
 */
export interface SafeUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  dealershipId: string;
  tenantId: string;
  isActive: boolean;
  twoFactorEnabled: boolean;
  preferences: UserPreferences;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ===== ERROR TYPES =====

/**
 * Application error with code
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Unauthorized error
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Forbidden error
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

// ===== TYPE GUARDS =====

/**
 * Check if value is a valid UUID
 */
export function isUUID(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Check if value is a valid email
 */
export function isEmail(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard for checking if object has required fields
 */
export function hasRequiredFields<T extends Record<string, unknown>>(
  obj: unknown,
  fields: (keyof T)[]
): obj is T {
  if (typeof obj !== 'object' || obj === null) return false;
  return fields.every((field) => field in obj);
}
