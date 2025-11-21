import { z } from 'zod';

/**
 * Lender entity schema for financing options
 *
 * Used in: getLenders, getLender, createLender, updateLender
 * Impact: HIGH - financing workflows
 */
export const LenderSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  code: z.string().min(1).max(50).regex(/^[A-Z0-9_-]+$/, 'Lender code must be uppercase alphanumeric'),
  logoUrl: z.string().url().nullable().default(null),
  website: z.string().url().nullable().default(null),
  contactPhone: z.string().nullable().default(null),
  contactEmail: z.string().email().nullable().default(null),
  isActive: z.boolean().default(true),

  // Lender settings
  minCreditScore: z.number().int().min(300).max(850).nullable().default(null),
  maxLoanAmount: z.number().positive().nullable().default(null),
  minLoanAmount: z.number().positive().nullable().default(null),
  maxTermMonths: z.number().int().positive().nullable().default(null),

  // Integration
  apiEndpoint: z.string().url().nullable().default(null),
  apiKey: z.string().nullable().default(null), // Consider encryption

  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Lender = z.infer<typeof LenderSchema>;

/**
 * Schema for creating new lenders
 */
export const CreateLenderSchema = LenderSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateLenderInput = z.infer<typeof CreateLenderSchema>;

/**
 * Schema for updating existing lenders
 */
export const UpdateLenderSchema = CreateLenderSchema.partial();
export type UpdateLenderInput = z.infer<typeof UpdateLenderSchema>;
