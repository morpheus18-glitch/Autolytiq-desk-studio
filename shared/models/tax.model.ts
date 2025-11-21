import { z } from 'zod';

// Base schemas
const currencySchema = z.number().min(0).multipleOf(0.01);
const percentageSchema = z.number().min(0).max(100).multipleOf(0.0001);
const zipCodeSchema = z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format');
const stateSchema = z.string().length(2, 'State must be 2-letter code').toUpperCase();

// Tax type enum
export const TaxTypeSchema = z.enum([
  'state',
  'county',
  'city',
  'district',
  'special',
  'luxury',
  'gas-guzzler',
  'ev-fee',
  'documentation',
  'title',
  'registration',
  'plate',
  'inspection',
  'emission',
]);

// Tax calculation method enum
export const TaxMethodSchema = z.enum([
  'percentage',
  'flat',
  'tiered',
  'formula',
]);

// Trade-in credit method enum
export const TradeInCreditMethodSchema = z.enum([
  'full',
  'partial',
  'none',
]);

// Tax jurisdiction schema
export const TaxJurisdictionSchema = z.object({
  type: z.enum(['state', 'county', 'city', 'district']),
  name: z.string().min(1),
  code: z.string().optional(),
  fipsCode: z.string().optional(),
});

// Tax rate schema
export const TaxRateSchema = z.object({
  jurisdiction: TaxJurisdictionSchema,
  type: TaxTypeSchema,
  rate: percentageSchema,
  method: TaxMethodSchema,
  effectiveDate: z.string().datetime(),
  expirationDate: z.string().datetime().optional(),
  minimumAmount: currencySchema.optional(),
  maximumAmount: currencySchema.optional(),
  threshold: currencySchema.optional(), // For tiered rates
  formula: z.string().optional(), // For complex calculations
});

// Local tax information schema
export const LocalTaxInfoSchema = z.object({
  zipCode: zipCodeSchema,
  state: stateSchema,
  county: z.string(),
  city: z.string().optional(),

  // Tax rates
  stateTaxRate: percentageSchema,
  countyTaxRate: percentageSchema,
  cityTaxRate: percentageSchema,
  specialDistrictRate: percentageSchema.optional(),
  totalRate: percentageSchema,

  // Additional fees
  titleFee: currencySchema.optional(),
  registrationFee: currencySchema.optional(),
  plateFee: currencySchema.optional(),
  documentationFee: currencySchema.optional(),
  inspectionFee: currencySchema.optional(),
  emissionFee: currencySchema.optional(),

  // Rules
  tradeInCreditMethod: TradeInCreditMethodSchema,
  taxableItems: z.array(z.enum(['vehicle', 'warranty', 'accessories', 'fees'])),
  capAmount: currencySchema.optional(),

  // Metadata
  lastUpdated: z.string().datetime(),
  source: z.string().optional(),
  notes: z.string().optional(),
});

// Tax calculation request schema
export const TaxCalculationRequestSchema = z.object({
  // Location
  dealershipZipCode: zipCodeSchema,
  dealershipState: stateSchema,
  customerZipCode: zipCodeSchema,
  customerState: stateSchema,

  // Vehicle details
  vehicleType: z.enum(['new', 'used', 'lease']),
  vehiclePrice: currencySchema,
  vehicleWeight: z.number().optional(), // For weight-based fees
  vehicleMpg: z.number().optional(), // For gas-guzzler tax
  isElectric: z.boolean().optional(),

  // Trade-in
  tradeInValue: currencySchema.optional(),
  tradeInPayoff: currencySchema.optional(),

  // Additional items
  warranties: z.array(z.object({
    price: currencySchema,
    taxable: z.boolean(),
  })).optional(),
  accessories: z.array(z.object({
    price: currencySchema,
    taxable: z.boolean(),
  })).optional(),
  fees: z.array(z.object({
    name: z.string(),
    amount: currencySchema,
    taxable: z.boolean(),
  })).optional(),

  // Rebates and incentives
  manufacturerRebate: currencySchema.optional(),
  dealerDiscount: currencySchema.optional(),

  // Special cases
  isOutOfState: z.boolean().optional(),
  isMilitary: z.boolean().optional(),
  isFirstResponder: z.boolean().optional(),
  isHandicapped: z.boolean().optional(),
  isFarmUse: z.boolean().optional(),
});

// Tax line item schema
export const TaxLineItemSchema = z.object({
  type: TaxTypeSchema,
  jurisdiction: TaxJurisdictionSchema,
  description: z.string(),
  taxableAmount: currencySchema,
  rate: percentageSchema.optional(),
  amount: currencySchema,
  method: TaxMethodSchema,
  isEstimated: z.boolean().default(false),
});

// Tax calculation result schema
export const TaxCalculationSchema = z.object({
  id: z.string().uuid(),
  requestId: z.string().uuid().optional(),

  // Input summary
  request: TaxCalculationRequestSchema,

  // Location info
  dealershipLocation: LocalTaxInfoSchema,
  customerLocation: LocalTaxInfoSchema,

  // Taxable amounts
  vehiclePrice: currencySchema,
  tradeInCredit: currencySchema,
  taxableVehicleAmount: currencySchema,
  taxableWarranties: currencySchema,
  taxableAccessories: currencySchema,
  taxableFees: currencySchema,
  totalTaxableAmount: currencySchema,

  // Tax breakdown
  taxLineItems: z.array(TaxLineItemSchema),

  // Totals
  totalStateTax: currencySchema,
  totalCountyTax: currencySchema,
  totalCityTax: currencySchema,
  totalSpecialTax: currencySchema,
  totalTax: currencySchema,

  // Fees
  titleFee: currencySchema,
  registrationFee: currencySchema,
  plateFee: currencySchema,
  documentationFee: currencySchema,
  inspectionFee: currencySchema,
  emissionFee: currencySchema,
  totalFees: currencySchema,

  // Grand total
  totalTaxAndFees: currencySchema,

  // Metadata
  calculatedAt: z.string().datetime(),
  calculatedBy: z.enum(['auto-tax-engine', 'manual', 'third-party']),
  engineVersion: z.string().optional(),
  confidence: percentageSchema.optional(),
  warnings: z.array(z.string()).optional(),
  notes: z.string().optional(),

  // Audit
  isVerified: z.boolean().default(false),
  verifiedAt: z.string().datetime().optional(),
  verifiedBy: z.string().uuid().optional(),
  adjustments: z.array(z.object({
    lineItem: z.string(),
    originalAmount: currencySchema,
    adjustedAmount: currencySchema,
    reason: z.string(),
    adjustedBy: z.string().uuid(),
    adjustedAt: z.string().datetime(),
  })).optional(),
});

// State tax rules schema
export const StateTaxRulesSchema = z.object({
  state: stateSchema,
  stateName: z.string(),

  // Base rates
  baseSalesTaxRate: percentageSchema,
  maxLocalRate: percentageSchema.optional(),

  // Trade-in rules
  tradeInCreditMethod: TradeInCreditMethodSchema,
  tradeInCreditCap: currencySchema.optional(),

  // Special taxes
  luxuryTaxThreshold: currencySchema.optional(),
  luxuryTaxRate: percentageSchema.optional(),
  gasGuzzlerTaxApplies: z.boolean(),
  evFee: currencySchema.optional(),

  // Fee ranges (can vary by county/dealer)
  titleFeeRange: z.object({
    min: currencySchema,
    max: currencySchema,
  }),
  registrationFeeRange: z.object({
    min: currencySchema,
    max: currencySchema,
  }),

  // Taxable items
  taxesWarranties: z.boolean(),
  taxesAccessories: z.boolean(),
  taxesDealerFees: z.boolean(),
  taxesRebates: z.boolean(),

  // Special rules
  reciprocityStates: z.array(stateSchema).optional(),
  militaryExemption: z.boolean(),
  farmUseExemption: z.boolean(),

  // Documentation
  notes: z.string().optional(),
  lastUpdated: z.string().datetime(),
  sources: z.array(z.string()).optional(),
});

// Types
export type TaxType = z.infer<typeof TaxTypeSchema>;
export type TaxMethod = z.infer<typeof TaxMethodSchema>;
export type TradeInCreditMethod = z.infer<typeof TradeInCreditMethodSchema>;
export type TaxJurisdiction = z.infer<typeof TaxJurisdictionSchema>;
export type TaxRate = z.infer<typeof TaxRateSchema>;
export type LocalTaxInfo = z.infer<typeof LocalTaxInfoSchema>;
export type TaxCalculationRequest = z.infer<typeof TaxCalculationRequestSchema>;
export type TaxLineItem = z.infer<typeof TaxLineItemSchema>;
export type TaxCalculation = z.infer<typeof TaxCalculationSchema>;
export type StateTaxRules = z.infer<typeof StateTaxRulesSchema>;

// API schemas
export const TaxCalculationResponseSchema = TaxCalculationSchema;

export const TaxRateQuerySchema = z.object({
  zipCode: zipCodeSchema,
  state: stateSchema.optional(),
  effectiveDate: z.string().datetime().optional(),
});

export type TaxCalculationResponse = z.infer<typeof TaxCalculationResponseSchema>;
export type TaxRateQuery = z.infer<typeof TaxRateQuerySchema>;