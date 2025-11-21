import { z } from 'zod';

/**
 * Rate request schema for financing rate shopping
 *
 * Used in: createRateRequest, getRateRequest, getRateRequestsByDeal, updateRateRequest
 * Impact: CRITICAL - deal financing flow
 */
export const RateRequestSchema = z.object({
  id: z.string().uuid(),
  dealId: z.string().uuid(),

  // Customer credit info
  creditScore: z.number().int().min(300).max(850).nullable().default(null),
  creditTier: z.enum(['excellent', 'good', 'fair', 'poor', 'bad']).nullable().default(null),

  // Loan details
  loanAmount: z.number().positive(),
  termMonths: z.number().int().positive(),
  downPayment: z.number().min(0),

  // Vehicle info
  vehicleYear: z.number().int().min(1900).max(new Date().getFullYear() + 2),
  vehicleMake: z.string().min(1),
  vehicleModel: z.string().min(1),
  vehicleVin: z.string().length(17).nullable().default(null),
  vehicleCondition: z.enum(['new', 'used', 'certified']),
  vehicleMileage: z.number().int().min(0).nullable().default(null),

  // Request status
  status: z.enum(['pending', 'sent', 'received', 'error']).default('pending'),

  // Results
  requestedAt: z.date(),
  respondedAt: z.date().nullable().default(null),
  responseData: z.record(z.any()).nullable().default(null),

  // Lender selection
  selectedLenderId: z.string().uuid().nullable().default(null),

  createdAt: z.date(),
  updatedAt: z.date(),
});

export type RateRequest = z.infer<typeof RateRequestSchema>;

/**
 * Schema for creating new rate requests
 */
export const CreateRateRequestSchema = RateRequestSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  respondedAt: true,
  selectedLenderId: true,
});

export type CreateRateRequestInput = z.infer<typeof CreateRateRequestSchema>;

/**
 * Schema for updating existing rate requests
 */
export const UpdateRateRequestSchema = RateRequestSchema.partial().omit({
  id: true,
  dealId: true,
  createdAt: true,
});

export type UpdateRateRequestInput = z.infer<typeof UpdateRateRequestSchema>;
