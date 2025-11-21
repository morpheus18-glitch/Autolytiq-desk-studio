import { z } from 'zod';

/**
 * Quick quote schema for lead generation tool
 *
 * Used in: createQuickQuote, getQuickQuote, updateQuickQuote, updateQuickQuotePayload
 * Impact: MEDIUM-HIGH - lead generation
 */
export const QuickQuoteSchema = z.object({
  id: z.string().uuid(),
  dealershipId: z.string().uuid(),

  // Contact info
  customerName: z.string().min(1).max(200).nullable().default(null),
  customerEmail: z.string().email().nullable().default(null),
  customerPhone: z.string().nullable().default(null),

  // Vehicle interest
  vehicleYear: z.number().int().min(1900).max(new Date().getFullYear() + 2).nullable().default(null),
  vehicleMake: z.string().nullable().default(null),
  vehicleModel: z.string().nullable().default(null),
  vehicleTrim: z.string().nullable().default(null),
  vehicleStock: z.string().nullable().default(null),
  vehicleVin: z.string().length(17).nullable().default(null),

  // Quote details
  desiredPayment: z.number().positive().nullable().default(null),
  downPayment: z.number().min(0).nullable().default(null),
  tradeInVehicle: z.string().nullable().default(null), // Description
  tradeInValue: z.number().min(0).nullable().default(null),
  creditRating: z.enum(['excellent', 'good', 'fair', 'poor', 'unknown']).nullable().default(null),

  // Quote result
  estimatedPayment: z.number().positive().nullable().default(null),
  estimatedPrice: z.number().positive().nullable().default(null),

  // Payload (full calculation breakdown)
  payload: z.record(z.any()).nullable().default(null),

  // Status
  status: z.enum(['pending', 'sent', 'viewed', 'converted', 'expired']).default('pending'),

  // Tracking
  source: z.string().nullable().default(null), // Website, email, phone, etc.
  notes: z.string().nullable().default(null),

  createdAt: z.date(),
  updatedAt: z.date(),
  expiresAt: z.date().nullable().default(null),
});

export type QuickQuote = z.infer<typeof QuickQuoteSchema>;

/**
 * Schema for creating new quick quotes
 */
export const CreateQuickQuoteSchema = QuickQuoteSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateQuickQuoteInput = z.infer<typeof CreateQuickQuoteSchema>;

/**
 * Schema for updating existing quick quotes
 */
export const UpdateQuickQuoteSchema = QuickQuoteSchema.partial().omit({
  id: true,
  dealershipId: true,
  createdAt: true,
});

export type UpdateQuickQuoteInput = z.infer<typeof UpdateQuickQuoteSchema>;
