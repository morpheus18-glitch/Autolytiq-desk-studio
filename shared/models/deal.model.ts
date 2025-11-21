import { z } from 'zod';
import { CustomerSchema } from './customer.model';
import { VehicleSchema } from './vehicle.model';
import { TaxCalculationSchema } from './tax.model';

// Base currency schema
const currencySchema = z.number().min(0).multipleOf(0.01);
const percentageSchema = z.number().min(0).max(100).multipleOf(0.01);

// Deal status enum
export const DealStatusSchema = z.enum([
  'draft',
  'pending',
  'approved',
  'financing',
  'funded',
  'delivered',
  'cancelled',
  'archived',
]);

// Deal type enum
export const DealTypeSchema = z.enum(['cash', 'finance', 'lease']);

// Trade-in vehicle schema
export const TradeInSchema = z.object({
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

// Financing details schema
export const FinancingDetailsSchema = z.object({
  lender: z.string().min(1),
  applicationId: z.string().optional(),
  approvalAmount: currencySchema,
  approvedRate: percentageSchema,
  term: z.number().min(12).max(84), // months
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

// Deal fees schema
export const DealFeesSchema = z.object({
  documentationFee: currencySchema.default(0),
  licensingFee: currencySchema.default(0),
  registrationFee: currencySchema.default(0),
  dealerFee: currencySchema.default(0),
  advertisingFee: currencySchema.default(0),
  deliveryFee: currencySchema.default(0),
  processingFee: currencySchema.default(0),
  customFees: z.array(z.object({
    name: z.string(),
    amount: currencySchema,
    taxable: z.boolean().default(false),
  })).default([]),
});

// Product/Warranty schema
export const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  type: z.enum(['warranty', 'gap', 'maintenance', 'protection', 'other']),
  provider: z.string(),
  cost: currencySchema,
  price: currencySchema,
  term: z.number().optional(), // months
  mileage: z.number().optional(),
  deductible: currencySchema.optional(),
  coverage: z.string().optional(),
});

// Deal calculation schema
export const DealCalculationSchema = z.object({
  // Vehicle pricing
  vehiclePrice: currencySchema,
  dealerDiscount: currencySchema.default(0),
  manufacturerRebate: currencySchema.default(0),
  salePrice: currencySchema,

  // Trade-in
  tradeInAllowance: currencySchema.default(0),
  tradeInPayoff: currencySchema.default(0),
  netTradeIn: currencySchema,

  // Taxes (integrated with tax engine)
  taxCalculation: TaxCalculationSchema,
  totalTax: currencySchema,

  // Fees
  fees: DealFeesSchema,
  totalFees: currencySchema,

  // Products
  products: z.array(ProductSchema).default([]),
  totalProducts: currencySchema,

  // Totals
  cashPrice: currencySchema,
  amountFinanced: currencySchema,
  totalDownPayment: currencySchema,
  outTheDoorPrice: currencySchema,

  // Profit metrics
  frontEndProfit: currencySchema,
  backEndProfit: currencySchema,
  totalProfit: currencySchema,
  holdback: currencySchema.optional(),
  packAmount: currencySchema.optional(),
});

// Main Deal schema
export const DealSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  dealershipId: z.string().uuid(),
  dealNumber: z.string().min(1),

  // Participants
  customerId: z.string().uuid(),
  customer: CustomerSchema.optional(), // Populated on fetch
  coCustomerId: z.string().uuid().optional(),
  coCustomer: CustomerSchema.optional(), // Populated on fetch
  salespersonId: z.string().uuid(),
  salesManagerId: z.string().uuid().optional(),
  financeManagerId: z.string().uuid().optional(),

  // Vehicle
  vehicleId: z.string().uuid(),
  vehicle: VehicleSchema.optional(), // Populated on fetch

  // Deal details
  status: DealStatusSchema,
  type: DealTypeSchema,
  saleDate: z.string().datetime(),
  deliveryDate: z.string().datetime().optional(),

  // Trade-in
  tradeIn: TradeInSchema.optional(),

  // Financing
  financing: FinancingDetailsSchema.optional(),

  // Calculations
  calculation: DealCalculationSchema,

  // Documents
  documents: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    type: z.string(),
    url: z.string().url(),
    uploadedAt: z.string().datetime(),
    uploadedBy: z.string().uuid(),
  })).default([]),

  // Forms and signatures
  forms: z.array(z.object({
    id: z.string().uuid(),
    formType: z.string(),
    status: z.enum(['pending', 'signed', 'rejected']),
    signedAt: z.string().datetime().optional(),
    signatureUrl: z.string().url().optional(),
  })).default([]),

  // Notes and activity
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  tags: z.array(z.string()).default([]),

  // Workflow
  checklistItems: z.array(z.object({
    id: z.string().uuid(),
    task: z.string(),
    completed: z.boolean(),
    completedAt: z.string().datetime().optional(),
    completedBy: z.string().uuid().optional(),
  })).default([]),

  // System fields
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdBy: z.string().uuid(),
  updatedBy: z.string().uuid(),
  version: z.number().default(1), // For optimistic locking
});

// Types
export type DealStatus = z.infer<typeof DealStatusSchema>;
export type DealType = z.infer<typeof DealTypeSchema>;
export type TradeIn = z.infer<typeof TradeInSchema>;
export type FinancingDetails = z.infer<typeof FinancingDetailsSchema>;
export type DealFees = z.infer<typeof DealFeesSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type DealCalculation = z.infer<typeof DealCalculationSchema>;
export type Deal = z.infer<typeof DealSchema>;

// API Request/Response schemas
export const CreateDealRequestSchema = DealSchema.omit({
  id: true,
  dealNumber: true, // Auto-generated
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  customer: true,
  coCustomer: true,
  vehicle: true,
});

export const UpdateDealRequestSchema = CreateDealRequestSchema.partial().extend({
  version: z.number(), // Required for optimistic locking
});

export const DealListQuerySchema = z.object({
  tenantId: z.string().uuid(),
  dealershipId: z.string().uuid().optional(),
  status: DealStatusSchema.optional(),
  type: DealTypeSchema.optional(),
  customerId: z.string().uuid().optional(),
  vehicleId: z.string().uuid().optional(),
  salespersonId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'saleDate', 'dealNumber', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  includeRelations: z.array(z.enum(['customer', 'vehicle', 'tradeIn'])).optional(),
});

export type CreateDealRequest = z.infer<typeof CreateDealRequestSchema>;
export type UpdateDealRequest = z.infer<typeof UpdateDealRequestSchema>;
export type DealListQuery = z.infer<typeof DealListQuerySchema>;