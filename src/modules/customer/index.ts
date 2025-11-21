/**
 * CUSTOMER MODULE
 * Public API exports for customer management
 *
 * This module provides:
 * - Customer CRUD operations with multi-tenant isolation
 * - Fast customer search with database indexes
 * - Duplicate detection and merging
 * - Customer timeline aggregation
 * - Complete validation and normalization
 * - React hooks for data fetching
 * - UI components for customer management
 */

// ============================================================================
// TYPES
// ============================================================================

export type {
  // Core types
  Customer,
  Address,
  DriversLicense,
  VehicleInfo,
  TradeInInfo,

  // Status and source enums
  CustomerStatusType,
  CustomerSourceType,
  PreferredContactMethodType,

  // Request/Response types
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CustomerListQuery,
  PaginatedCustomers,
  CustomerWithRelations,

  // Search and duplicates
  DuplicateSearch,

  // Timeline
  TimelineEvent,

  // Validation
  ValidationResult,
} from './types/customer.types';

export {
  // Enums
  CustomerStatus,
  CustomerSource,
  PreferredContactMethod,

  // Schemas (for validation)
  CustomerSchema,
  CreateCustomerRequestSchema,
  UpdateCustomerRequestSchema,
  CustomerListQuerySchema,
  DuplicateSearchSchema,

  // Error classes
  CustomerError,
  CustomerNotFoundError,
  CustomerValidationError,
  DuplicateCustomerError,
  CustomerAccessDeniedError,
} from './types/customer.types';

// ============================================================================
// SERVICES
// ============================================================================

export { customerService, getCustomerService, CustomerService } from './services/customer.service';

// ============================================================================
// UTILITIES
// ============================================================================

export {
  // Validators
  normalizePhone,
  normalizeEmail,
  normalizeAddress,
  normalizeZipCode,
  normalizeName,
  normalizeDriversLicense,
  normalizeSsnLast4,
  isValidPhone,
  isValidEmail,
  isValidZipCode,
  isValidStateCode,
  isValidName,
  isValidDriversLicense,
  isValidSsnLast4,
  validateCustomerData,
  formatPhoneForDisplay,
  formatZipCode,
} from './utils/validators';

export {
  // Name formatters
  getFullName,
  getInitials,
  getFormalName,

  // Contact formatters
  formatPhone,
  formatEmail,
  getPrimaryContact,

  // Address formatters
  formatAddressSingleLine,
  formatAddressMultiLine,
  formatCityStateZip,

  // Vehicle formatters
  formatVehicle,
  formatVehicleWithVin,
  formatMileage,

  // Currency formatters
  formatCurrency,
  formatCurrencyCompact,

  // Date formatters
  formatDate,
  formatRelativeDate,
  formatDateTime,

  // Status formatters
  formatCustomerStatus,
  getStatusColor,

  // Credit formatters
  formatCreditScore,
  getCreditScoreRating,
  getCreditScoreColor,

  // Masked data
  formatSsnLast4,
  formatDriversLicense,

  // Display helpers
  getDisplayName,
  getCustomerSummary,
} from './utils/formatters';

// ============================================================================
// HOOKS
// ============================================================================

export {
  // Single customer hooks
  useCustomer,
  useCustomerTimeline,
  useCustomerDeals,
  useCustomerEmails,
  useUpdateCustomer,
  useDeleteCustomer,
} from './hooks/useCustomer';

export {
  // List hooks
  useCustomerList,
  useCreateCustomer,
  useCustomersByStatus,
  useCustomersNeedingFollowUp,
} from './hooks/useCustomerList';

export {
  // Search hooks
  useCustomerSearch,
  useFindDuplicates,
  useMergeDuplicates,
  useCustomerAutocomplete,
} from './hooks/useCustomerSearch';

// ============================================================================
// COMPONENTS
// ============================================================================

export { CustomerCard } from './components/CustomerCard';
export { CustomerList } from './components/CustomerList';
export { CustomerForm } from './components/CustomerForm';
export { CustomerTimeline } from './components/CustomerTimeline';

// ============================================================================
// API ROUTES
// ============================================================================

export { default as customerRoutes } from './api/customer.routes';
