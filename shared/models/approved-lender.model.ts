import { z } from 'zod';

/**
 * Approved lender response schema (lender offers returned from rate request)
 *
 * Used in: createApprovedLenders, getApprovedLenders, selectApprovedLender, getSelectedLenderForDeal
 * Impact: CRITICAL - lender selection
 */
export const ApprovedLenderSchema = z.object({
  id: z.string().uuid(),
  rateRequestId: z.string().uuid(),
  lenderId: z.string().uuid(),
  lenderProgramId: z.string().uuid().nullable().default(null),

  // Approved terms
  approvedAmount: z.number().positive(),
  approvedRate: z.number().min(0).max(100), // APR
  termMonths: z.number().int().positive(),
  monthlyPayment: z.number().positive(),

  // Dealer markup (buy rate vs sell rate)
  buyRate: z.number().min(0).max(100), // What lender charges
  sellRate: z.number().min(0).max(100), // What dealer offers customer
  dealerReserve: z.number().min(0).nullable().default(null), // Dealer profit

  // Additional terms
  requiredDownPayment: z.number().min(0).nullable().default(null),
  balloonPayment: z.number().min(0).nullable().default(null),

  // Selection status
  isSelected: z.boolean().default(false),
  selectedAt: z.date().nullable().default(null),
  selectedBy: z.string().uuid().nullable().default(null), // User ID

  // Response metadata
  responseData: z.record(z.any()).nullable().default(null),

  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ApprovedLender = z.infer<typeof ApprovedLenderSchema>;

/**
 * Schema for creating approved lender responses
 */
export const CreateApprovedLenderSchema = ApprovedLenderSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isSelected: true,
  selectedAt: true,
  selectedBy: true,
});

export type CreateApprovedLenderInput = z.infer<typeof CreateApprovedLenderSchema>;

/**
 * Schema for selecting an approved lender
 */
export const SelectApprovedLenderSchema = z.object({
  userId: z.string().uuid(),
});

export type SelectApprovedLenderInput = z.infer<typeof SelectApprovedLenderSchema>;
