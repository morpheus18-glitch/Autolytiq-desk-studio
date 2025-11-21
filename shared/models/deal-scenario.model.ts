import { z } from 'zod';

/**
 * Deal scenario schema for comparing multiple financing/pricing options
 *
 * Used in: getScenario, createScenario, updateScenario, deleteScenario
 * Impact: CRITICAL - multi-scenario pricing engine
 */
export const DealScenarioSchema = z.object({
  id: z.string().uuid(),
  dealId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().nullable().default(null),

  // Scenario type
  scenarioType: z.enum(['cash', 'finance', 'lease']),

  // Pricing
  salePrice: z.number().positive(),
  downPayment: z.number().min(0),
  tradeInValue: z.number().min(0).nullable().default(null),
  tradeInPayoff: z.number().min(0).nullable().default(null),

  // Financing (if finance/lease)
  loanAmount: z.number().positive().nullable().default(null),
  termMonths: z.number().int().positive().nullable().default(null),
  interestRate: z.number().min(0).max(100).nullable().default(null),
  monthlyPayment: z.number().positive().nullable().default(null),

  // Lease-specific
  residualValue: z.number().positive().nullable().default(null),
  moneyFactor: z.number().min(0).nullable().default(null),
  milesPerYear: z.number().int().positive().nullable().default(null),

  // Taxes and fees
  totalTax: z.number().min(0),
  totalFees: z.number().min(0),

  // Calculations
  amountFinanced: z.number().positive().nullable().default(null),
  totalCost: z.number().positive(),
  dueAtSigning: z.number().min(0).nullable().default(null),

  // Metadata
  isSelected: z.boolean().default(false),
  isPrimary: z.boolean().default(false),

  createdAt: z.date(),
  updatedAt: z.date(),
});

export type DealScenario = z.infer<typeof DealScenarioSchema>;

/**
 * Schema for creating new deal scenarios
 */
export const CreateDealScenarioSchema = DealScenarioSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateDealScenarioInput = z.infer<typeof CreateDealScenarioSchema>;

/**
 * Schema for updating existing deal scenarios
 */
export const UpdateDealScenarioSchema = CreateDealScenarioSchema.partial().omit({
  dealId: true,
});

export type UpdateDealScenarioInput = z.infer<typeof UpdateDealScenarioSchema>;
