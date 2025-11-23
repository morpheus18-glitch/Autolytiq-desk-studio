/**
 * API Response Types
 * Comprehensive type definitions for all API responses and common utility types
 *
 * This file provides:
 * - Standard API response envelopes
 * - Error response types
 * - Pagination types
 * - Generic data types for common patterns
 * - Type-safe error handling
 */

import type {
  User,
  Customer,
  Deal,
  Vehicle,
  TradeVehicle,
  DealScenario,
  QuickQuote,
  Lender,
  LenderProgram,
  TaxJurisdiction,
  Email,
  EmailAttachment,
  Appointment,
} from '@shared/models';

// ============================================================================
// STANDARD API RESPONSE ENVELOPE
// ============================================================================

/**
 * Standard successful API response
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Standard error API response
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================================
// PAGINATION TYPES
// ============================================================================

export interface PaginationParams {
  page: number;
  limit: number;
  offset?: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// ============================================================================
// SEARCH & FILTER TYPES
// ============================================================================

export interface SearchParams {
  query: string;
  limit?: number;
  offset?: number;
}

export interface FilterCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in';
  value: unknown;
}

export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

export interface QueryOptions {
  filters?: FilterCondition[];
  sort?: SortOption[];
  pagination?: PaginationParams;
}

// ============================================================================
// CUSTOMER RESPONSE TYPES
// ============================================================================

export interface CustomerResponse extends Customer {
  recentDeals?: Deal[];
  appointmentsCount?: number;
  totalSpent?: number;
}

export interface CustomerListResponse {
  customers: Customer[];
  meta: PaginationMeta;
}

export interface CustomerSearchResponse {
  results: Customer[];
  count: number;
}

export interface CustomerHistoryItem {
  id: string;
  type: 'deal' | 'appointment' | 'note' | 'email';
  description: string;
  timestamp: Date;
  relatedId?: string;
}

export interface CustomerTimelineResponse {
  customerId: string;
  events: CustomerHistoryItem[];
}

// ============================================================================
// DEAL RESPONSE TYPES
// ============================================================================

export interface DealDetailResponse extends Deal {
  scenarios?: DealScenario[];
  tradeIn?: TradeVehicle | null;
  customer?: Customer;
  vehicle?: Vehicle;
  activeScenario?: DealScenario;
}

export interface DealListResponse {
  deals: Deal[];
  meta: PaginationMeta;
}

export interface DealCalculationResult {
  monthlyPayment: number;
  totalPayment: number;
  interestCharged: number;
  totalTaxes: number;
  dealerDoc: number;
  totalDueAtSigning: number;
  capitalReduction: number;
  amountFinanced: number;
  tradeEquity: number;
}

export interface DealScenarioResponse extends DealScenario {
  calculation?: DealCalculationResult;
}

// ============================================================================
// VEHICLE RESPONSE TYPES
// ============================================================================

export interface VehicleDetailResponse extends Vehicle {
  rooftopDetails?: Record<string, unknown>;
  inventoryAge?: number;
  estimatedValue?: number;
}

export interface VehicleListResponse {
  vehicles: Vehicle[];
  meta: PaginationMeta;
}

export interface VINDecodeResult {
  vin: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  bodyType?: string;
  transmission?: string;
  engine?: string;
  fuelType?: string;
}

// ============================================================================
// TAX CALCULATION RESPONSE TYPES
// ============================================================================

export interface TaxCalculationRequest {
  salePrice: number;
  tradeValue?: number;
  documentFee?: number;
  registration?: number;
  state: string;
  county?: string;
  zipCode: string;
  includeLocal?: boolean;
  dealType?: 'RETAIL' | 'LEASE' | 'FINANCE';
}

export interface TaxLineItem {
  category: string;
  description: string;
  amount: number;
  taxable: boolean;
  rate?: number;
}

export interface TaxCalculationResponse {
  result: {
    totalTax: number;
    totalFee: number;
    totalDue: number;
    breakdown: TaxLineItem[];
  };
  localTaxInfo?: Record<string, unknown>;
}

// ============================================================================
// EMAIL RESPONSE TYPES
// ============================================================================

export interface EmailListResponse {
  emails: Email[];
  meta: PaginationMeta;
}

export interface EmailDetailResponse extends Email {
  attachments?: EmailAttachment[];
  thread?: Email[];
  relatedCustomerId?: string;
  relatedDealId?: string;
}

export interface EmailSendResponse {
  success: boolean;
  messageId?: string;
  queueId?: string;
  error?: string;
}

export interface EmailDraftResponse {
  id: string;
  to: Array<{ email: string; name?: string }>;
  subject: string;
  body: string;
  savedAt: Date;
}

// ============================================================================
// QUICK QUOTE RESPONSE TYPES
// ============================================================================

export interface QuickQuoteDetailResponse extends QuickQuote {
  vehicle?: Vehicle;
  contact?: {
    name: string;
    email: string;
    phone: string;
  };
}

export interface QuickQuoteListResponse {
  quotes: QuickQuote[];
  meta: PaginationMeta;
}

// ============================================================================
// RATE REQUEST RESPONSE TYPES
// ============================================================================

export interface RateRequestResponse {
  id: string;
  dealId: string;
  lenders: Array<{
    lenderId: string;
    name: string;
    rate: number;
    term: number;
    status: 'pending' | 'approved' | 'declined';
  }>;
  createdAt: Date;
  completedAt?: Date;
}

// ============================================================================
// USER & AUTHENTICATION RESPONSE TYPES
// ============================================================================

export interface UserAuthResponse {
  user: User;
  sessionId: string;
  token?: string;
}

export interface UserProfileResponse extends User {
  dealershipName?: string;
  rooftops?: Array<{
    id: string;
    name: string;
    isActive: boolean;
  }>;
  permissions?: string[];
}

export interface PasswordResetResponse {
  success: boolean;
  message: string;
}

export interface TwoFactorSetupResponse {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface TwoFactorVerifyResponse {
  success: boolean;
  sessionToken?: string;
}

// ============================================================================
// STATS & ANALYTICS RESPONSE TYPES
// ============================================================================

export interface DealStats {
  totalDeals: number;
  openDeals: number;
  closedDeals: number;
  pendingDeals: number;
  averageDiscountValue: number;
  totalRevenue: number;
}

export interface InventoryStats {
  totalVehicles: number;
  soldVehicles: number;
  ageDistribution: Record<string, number>;
  priceRangeDistribution: Record<string, number>;
}

export interface UnreadCounts {
  emails: number;
  appointments: number;
}

export interface EmailQueueStats {
  queueSize: number;
  processing: boolean;
  byPriority: Record<string, number>;
  lastProcessed?: Date;
}

export interface SystemStats {
  uptime: number;
  dbConnections: number;
  requestsPerSecond: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
  };
}

// ============================================================================
// BULK OPERATION RESPONSE TYPES
// ============================================================================

export interface BulkOperationResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
}

// ============================================================================
// WEBHOOK PAYLOAD TYPES
// ============================================================================

export interface EmailWebhookPayload {
  type: 'received' | 'delivered' | 'bounced' | 'complained' | 'opened' | 'clicked';
  timestamp: number;
  data: Record<string, unknown>;
}

// ============================================================================
// REQUEST/RESPONSE BODY TYPES
// ============================================================================

export interface CreateCustomerRequest {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  source?: string;
}

export interface UpdateCustomerRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: Record<string, unknown>;
}

export interface CreateDealRequest {
  customerId: string;
  vehicleId: string;
  salePrice: number;
  downPayment?: number;
  tradeInValue?: number;
  loanTerm?: number;
  interestRate?: number;
}

export interface UpdateDealRequest {
  salePrice?: number;
  downPayment?: number;
  tradeInValue?: number;
  loanTerm?: number;
  interestRate?: number;
}

// ============================================================================
// ERROR-SPECIFIC TYPES
// ============================================================================

export enum ErrorCode {
  // Client errors
  BadRequest = 'BAD_REQUEST',
  Unauthorized = 'UNAUTHORIZED',
  Forbidden = 'FORBIDDEN',
  NotFound = 'NOT_FOUND',
  Conflict = 'CONFLICT',
  ValidationError = 'VALIDATION_ERROR',
  RateLimitExceeded = 'RATE_LIMIT_EXCEEDED',

  // Server errors
  InternalServerError = 'INTERNAL_SERVER_ERROR',
  DatabaseError = 'DATABASE_ERROR',
  ServiceUnavailable = 'SERVICE_UNAVAILABLE',

  // Business logic errors
  InvalidTaxJurisdiction = 'INVALID_TAX_JURISDICTION',
  InvalidVIN = 'INVALID_VIN',
  InvalidLoanTerms = 'INVALID_LOAN_TERMS',
  MultiTenantViolation = 'MULTI_TENANT_VIOLATION',
}

export interface ErrorDetails {
  field?: string;
  value?: unknown;
  constraint?: string;
  details?: Record<string, unknown>;
}

export interface AppError {
  code: ErrorCode;
  message: string;
  statusCode: number;
  details?: ErrorDetails;
  timestamp: Date;
  requestId?: string;
}

// ============================================================================
// GENERIC UTILITY TYPES
// ============================================================================

/**
 * Async function that returns T
 */
export type AsyncFunction<T = void> = () => Promise<T>;

/**
 * Promise-returning function with parameters
 */
export type AsyncHandler<P, R> = (params: P) => Promise<R>;

/**
 * Express request handler type
 */
export interface RequestHandler<
  ReqBody = unknown,
  ResBody = unknown,
  Params = Record<string, unknown>,
  Query = Record<string, unknown>
> {
  (
    req: {
      body: ReqBody;
      params: Params;
      query: Query;
      user?: User;
      session?: Record<string, unknown>;
    },
    res: {
      status: (code: number) => RequestHandler<ReqBody, ResBody, Params, Query>;
      json: (data: ResBody) => void;
      send: (data: string) => void;
    }
  ): Promise<void>;
}

/**
 * Service method return type
 */
export type ServiceResult<T> = Promise<T>;

/**
 * Data transformation function
 */
export type DataTransform<T, U> = (data: T) => U;

/**
 * Filter predicate function
 */
export type FilterPredicate<T> = (item: T) => boolean;

/**
 * Sorting comparator function
 */
export type SortComparator<T> = (a: T, b: T) => number;

/**
 * Type guard function
 */
export interface TypeGuard<T> {
  (value: unknown): value is T;
}

/**
 * Async validator function
 */
export type AsyncValidator<T> = (value: T) => Promise<boolean>;
