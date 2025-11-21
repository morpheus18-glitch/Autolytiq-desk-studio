import { z } from 'zod';

/**
 * Lender program schema (financing products from lenders)
 *
 * Used in: getLenderPrograms, getLenderProgram, createLenderProgram, updateLenderProgram
 * Impact: HIGH - rate offers
 */
export const LenderProgramSchema = z.object({
  id: z.string().uuid(),
  lenderId: z.string().uuid(),
  name: z.string().min(1).max(200),
  programCode: z.string().min(1).max(50),
  description: z.string().nullable().default(null),

  // Program type
  programType: z.enum(['new', 'used', 'both']),
  vehicleType: z.enum(['car', 'truck', 'suv', 'motorcycle', 'rv', 'all']),

  // Rate information
  baseRate: z.number().min(0).max(100), // APR percentage
  minRate: z.number().min(0).max(100).nullable().default(null),
  maxRate: z.number().min(0).max(100).nullable().default(null),

  // Loan terms
  minTermMonths: z.number().int().positive(),
  maxTermMonths: z.number().int().positive(),
  availableTerms: z.array(z.number().int().positive()), // e.g. [36, 48, 60, 72, 84]

  // Loan amount
  minLoanAmount: z.number().positive().nullable().default(null),
  maxLoanAmount: z.number().positive().nullable().default(null),
  minDownPaymentPercent: z.number().min(0).max(100).nullable().default(null),

  // Credit requirements
  minCreditScore: z.number().int().min(300).max(850).nullable().default(null),
  maxCreditScore: z.number().int().min(300).max(850).nullable().default(null),

  // Dealer fees
  buyRate: z.number().min(0).max(100).nullable().default(null), // Dealer markup allowed
  flatFee: z.number().min(0).nullable().default(null),

  isActive: z.boolean().default(true),
  effectiveDate: z.date().nullable().default(null),
  expirationDate: z.date().nullable().default(null),

  createdAt: z.date(),
  updatedAt: z.date(),
});

export type LenderProgram = z.infer<typeof LenderProgramSchema>;

/**
 * Schema for creating new lender programs
 */
export const CreateLenderProgramSchema = LenderProgramSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateLenderProgramInput = z.infer<typeof CreateLenderProgramSchema>;

/**
 * Schema for updating existing lender programs
 */
export const UpdateLenderProgramSchema = CreateLenderProgramSchema.partial();
export type UpdateLenderProgramInput = z.infer<typeof UpdateLenderProgramSchema>;
