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
