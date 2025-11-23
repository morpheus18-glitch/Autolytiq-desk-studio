/**
 * DEAL MODULE TYPES
 * Centralized type definitions for deal management
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const DealStatus = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  FINANCING: 'financing',
  FUNDED: 'funded',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  ARCHIVED: 'archived',
} as const;

export type DealStatusType = (typeof DealStatus)[keyof typeof DealStatus];

export const DealType = {
  CASH: 'cash',
  FINANCE: 'finance',
  LEASE: 'lease',
} as const;

export type DealTypeEnum = (typeof DealType)[keyof typeof DealType];

// ============================================================================
// BASE TYPES
// ============================================================================

export interface Deal {
  id: string;
  tenantId: string;
  dealershipId: string;
  dealNumber: string;

  // Participants
  customerId: string;
  customer?: unknown; // Reference to customer module (lazy-loaded)
  coCustomerId?: string;
  coCustomer?: unknown; // Reference to customer module (lazy-loaded)
  salespersonId: string;
  salesManagerId?: string;
  financeManagerId?: string;

  // Vehicle
  vehicleId: string;
  vehicle?: unknown; // Reference to vehicle module (lazy-loaded)

  // Deal details
  status: DealStatusType;
  type: DealTypeEnum;
  saleDate: Date;
  deliveryDate?: Date;

  // Trade-in
  tradeIn?: TradeIn;

  // Financing
  financing?: FinancingDetails;

  // Calculations
  calculation: DealCalculation;

  // Documents
  documents: DealDocument[];
  forms: DealForm[];

  // Notes
  notes?: string;
  internalNotes?: string;
  tags: string[];

  // Workflow
  checklistItems: ChecklistItem[];

  // System fields
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  version: number; // For optimistic locking
}

export interface TradeIn {
  vin: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  mileage: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  payoffAmount?: number;
  payoffLender?: string;
  appraisalValue: number;
  allowance: number;
  notes?: string;
}

export interface FinancingDetails {
  lender: string;
  applicationId?: string;
  approvalAmount: number;
  approvedRate: number;
  term: number; // months
  downPayment: number;
  monthlyPayment: number;
  totalFinanceCharge: number;
  totalOfPayments: number;
  apr: number;
  ltvRatio?: number;
  ptiRatio?: number;
  dtiRatio?: number;
  stipulations: string[];
  fundingDate?: Date;
  firstPaymentDate?: Date;
}

export interface DealFees {
  documentationFee: number;
  licensingFee: number;
  registrationFee: number;
  dealerFee: number;
  advertisingFee: number;
  deliveryFee: number;
  processingFee: number;
  customFees: CustomFee[];
}

export interface CustomFee {
  name: string;
  amount: number;
  taxable: boolean;
}

export interface Product {
  id: string;
  name: string;
  type: 'warranty' | 'gap' | 'maintenance' | 'protection' | 'other';
  provider: string;
  cost: number;
  price: number;
  term?: number; // months
  mileage?: number;
  deductible?: number;
  coverage?: string;
}

export interface DealCalculation {
  // Vehicle pricing
  vehiclePrice: number;
  dealerDiscount: number;
  manufacturerRebate: number;
  salePrice: number;

  // Trade-in
  tradeInAllowance: number;
  tradeInPayoff: number;
  netTradeIn: number;

  // Taxes
  taxCalculation: {
    taxableAmount: number;
    totalTax: number;
    totalRate: number;
    jurisdiction: string;
    breakdown: Array<{
      type: 'state' | 'county' | 'city' | 'local' | 'district';
      name: string;
      rate: number;
      amount: number;
    }>;
    appliedRules: string[];
  };
  totalTax: number;

  // Fees
  fees: DealFees;
  totalFees: number;

  // Products
  products: Product[];
  totalProducts: number;

  // Totals
  cashPrice: number;
  amountFinanced: number;
  totalDownPayment: number;
  outTheDoorPrice: number;

  // Profit metrics
  frontEndProfit: number;
  backEndProfit: number;
  totalProfit: number;
  holdback?: number;
  packAmount?: number;
}

export interface DealDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface DealForm {
  id: string;
  formType: string;
  status: 'pending' | 'signed' | 'rejected';
  signedAt?: Date;
  signatureUrl?: string;
}

export interface ChecklistItem {
  id: string;
  task: string;
  completed: boolean;
  completedAt?: Date;
  completedBy?: string;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateDealRequest {
  tenantId: string;
  dealershipId: string;
  customerId: string;
  coCustomerId?: string;
  salespersonId: string;
  salesManagerId?: string;
  vehicleId: string;
  status: DealStatusType;
  type: DealTypeEnum;
  saleDate: Date;
  tradeIn?: TradeIn;
  financing?: FinancingDetails;
  calculation: DealCalculation;
}

export interface UpdateDealRequest extends Partial<CreateDealRequest> {
  version: number; // Required for optimistic locking
}

export interface DealListQuery {
  tenantId: string;
  dealershipId?: string;
  status?: DealStatusType;
  type?: DealTypeEnum;
  customerId?: string;
  vehicleId?: string;
  salespersonId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'saleDate' | 'dealNumber' | 'status';
  sortOrder?: 'asc' | 'desc';
  includeRelations?: ('customer' | 'vehicle' | 'tradeIn')[];
}

export interface DealListResponse {
  deals: Deal[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const currencySchema = z.number().min(0).multipleOf(0.01);
const percentageSchema = z.number().min(0).max(100).multipleOf(0.01);

export const dealStatusSchema = z.enum([
  'draft',
  'pending',
  'approved',
  'financing',
  'funded',
  'delivered',
  'cancelled',
  'archived',
]);

export const dealTypeSchema = z.enum(['cash', 'finance', 'lease']);

export const tradeInSchema = z.object({
  vin: z.string().length(17, 'VIN must be exactly 17 characters'),
  year: z.number().min(1900).max(new Date().getFullYear() + 1),
  make: z.string().min(1),
  model: z.string().min(1),
  trim: z.string().optional(),
  mileage: z.number().min(0),
  condition: z.enum(['excellent', 'good', 'fair', 'poor']),
  payoffAmount: currencySchema.optional(),
  payoffLender: z.string().optional(),
  appraisalValue: currencySchema,
  allowance: currencySchema,
  notes: z.string().optional(),
});

export const financingDetailsSchema = z.object({
  lender: z.string().min(1),
  applicationId: z.string().optional(),
  approvalAmount: currencySchema,
  approvedRate: percentageSchema,
  term: z.number().min(12).max(84),
  downPayment: currencySchema,
  monthlyPayment: currencySchema,
  totalFinanceCharge: currencySchema,
  totalOfPayments: currencySchema,
  apr: percentageSchema,
  ltvRatio: percentageSchema.optional(),
  ptiRatio: percentageSchema.optional(),
  dtiRatio: percentageSchema.optional(),
  stipulations: z.array(z.string()).default([]),
  fundingDate: z.string().datetime().optional(),
  firstPaymentDate: z.string().datetime().optional(),
});

export const createDealSchema = z.object({
  tenantId: z.string().uuid(),
  dealershipId: z.string().uuid(),
  customerId: z.string().uuid(),
  coCustomerId: z.string().uuid().optional(),
  salespersonId: z.string().uuid(),
  salesManagerId: z.string().uuid().optional(),
  vehicleId: z.string().uuid(),
  status: dealStatusSchema,
  type: dealTypeSchema,
  saleDate: z.string().datetime(),
  tradeIn: tradeInSchema.optional(),
  financing: financingDetailsSchema.optional(),
  // calculation will be provided by service
});

export const updateDealSchema = createDealSchema.partial().extend({
  version: z.number(), // Required for optimistic locking
});

// ============================================================================
// ERROR TYPES
// ============================================================================

export class DealError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'DealError';
  }
}

export class DealNotFoundError extends DealError {
  constructor(dealId: string) {
    super(`Deal not found: ${dealId}`, 'DEAL_NOT_FOUND', 404);
  }
}

export class DealVersionConflictError extends DealError {
  constructor(dealId: string) {
    super(
      `Deal version conflict: ${dealId}. The deal was modified by another user.`,
      'VERSION_CONFLICT',
      409
    );
  }
}

export class InvalidDealStateError extends DealError {
  constructor(message: string) {
    super(message, 'INVALID_STATE', 400);
  }
}

// ============================================================================
// API ROUTE TYPES (for deal.routes.ts)
// ============================================================================

import type {
  Deal as SchemaDeal,
  InsertDeal,
  DealScenario,
  TradeVehicle,
  Customer,
  Vehicle,
  User
} from '@shared/schema';

/**
 * Query parameters for listing deals
 */
export interface GetDealsParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  dealershipId: string;
}

/**
 * Paginated response for deal list
 */
export interface GetDealsResponse {
  deals: DealWithRelations[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Deal with all related entities loaded
 */
export interface DealWithRelations extends SchemaDeal {
  customer?: Customer | null;
  vehicle?: Vehicle | null;
  tradeVehicle?: TradeVehicle | null;
  scenarios?: DealScenario[];
  salesperson?: {
    id: string;
    fullName: string;
    email: string;
  };
  salesManager?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  financeManager?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}

/**
 * Deal statistics aggregated by status
 */
export interface DealStats {
  totalDeals: number;
  activeDealCount: number;
  draftDealCount: number;
  approvedDealCount: number;
  cancelledDealCount: number;
  totalRevenue: string; // Decimal as string
  averageDealValue: string; // Decimal as string
  dealsByStatus: Record<string, number>;
  recentDeals: DealWithRelations[];
}

/**
 * Trade vehicle creation data with proper types
 */
export interface TradeVehicleCreateData {
  dealId: string;
  year: number;
  make: string;
  model: string;
  mileage: number;
  vin?: string;
  allowance: string; // Decimal as string
  payoff: string; // Decimal as string
  payoffTo?: string;
}

/**
 * Trade vehicle update data (all fields optional)
 */
export interface TradeVehicleUpdateData {
  year?: number;
  make?: string;
  model?: string;
  mileage?: number;
  vin?: string;
  allowance?: string; // Decimal as string
  payoff?: string; // Decimal as string
  payoffTo?: string;
}

/**
 * Scenario with related data
 */
export interface ScenarioWithRelations extends DealScenario {
  vehicle?: Vehicle | null;
  tradeVehicle?: TradeVehicle | null;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: string;
  dealId: string;
  scenarioId?: string | null;
  userId: string;
  action: string; // 'create', 'update', 'delete', 'state_change', 'apply_template'
  entityType: string; // 'deal', 'scenario', 'trade_vehicle', etc.
  entityId: string;
  fieldName?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  user?: {
    id: string;
    fullName: string;
    email: string;
  };
}

/**
 * Audit log creation data
 */
export interface CreateAuditLogData {
  dealId: string;
  scenarioId?: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Fee package template
 */
export interface FeePackageTemplate {
  id: string;
  name: string;
  description?: string | null;
  dealerFees: Array<{
    name: string;
    amount: number;
    capitalized: boolean;
    taxable: boolean;
  }>;
  accessories: Array<{
    name: string;
    amount: number;
    capitalized: boolean;
    taxable: boolean;
  }>;
  aftermarketProducts: Array<{
    category: string;
    name: string;
    price: number;
    capitalized: boolean;
    taxable: boolean;
  }>;
}

/**
 * Lender rate request
 */
export interface LenderRateRequest {
  id: string;
  dealId: string;
  lenderId: string;
  requestedAt: Date;
  respondedAt?: Date | null;
  status: 'pending' | 'approved' | 'declined' | 'expired';
  apr?: string | null; // Decimal as string
  term?: number | null;
  maxLoanAmount?: string | null; // Decimal as string
  conditions?: string | null;
  lender?: {
    id: string;
    name: string;
    logo?: string | null;
  };
}

/**
 * Selected lender for deal
 */
export interface SelectedLender {
  dealId: string;
  lenderId: string;
  rateRequestId: string;
  selectedAt: Date;
  apr: string; // Decimal as string
  term: number;
  loanAmount: string; // Decimal as string
  lender: {
    id: string;
    name: string;
    logo?: string | null;
  };
}

/**
 * Lender history response
 */
export interface DealLenderHistory {
  rateRequests: LenderRateRequest[];
  selectedLender: SelectedLender | null;
  totalRequests: number;
  lastRequestedAt: Date | null;
}

/**
 * Deal creation result (from atomic operations)
 */
export interface DealCreationResult {
  success: boolean;
  data?: {
    deal: SchemaDeal;
    scenario: DealScenario;
    customer?: Customer | null;
    vehicle?: Vehicle | null;
  };
  error?: string;
  details?: unknown;
}

/**
 * Error types for atomic operations
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ResourceNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResourceNotFoundError';
  }
}

export class VehicleNotAvailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VehicleNotAvailableError';
  }
}

export class MultiTenantViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MultiTenantViolationError';
  }
}
