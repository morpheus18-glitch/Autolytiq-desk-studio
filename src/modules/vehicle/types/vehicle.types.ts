/**
 * VEHICLE MODULE TYPES
 * Complete type definitions for vehicle/inventory management with strict validation
 */

import { z } from 'zod';

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

// VIN must be exactly 17 characters, uppercase alphanumeric, no I, O, or Q
const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;

const currencySchema = z.number().min(0).multipleOf(0.01);

// ============================================================================
// ENUMS
// ============================================================================

export const VehicleStatus = {
  AVAILABLE: 'available',
  RESERVED: 'reserved',
  IN_DEAL: 'in-deal',
  SOLD: 'sold',
  SERVICE: 'service',
  WHOLESALE: 'wholesale',
  UNAVAILABLE: 'unavailable',
} as const;

export type VehicleStatusType = (typeof VehicleStatus)[keyof typeof VehicleStatus];

export const vehicleStatusSchema = z.enum([
  'available',
  'reserved',
  'in-deal',
  'sold',
  'service',
  'wholesale',
  'unavailable',
]);

export const VehicleType = {
  NEW: 'new',
  USED: 'used',
  CERTIFIED: 'certified',
} as const;

export type VehicleTypeEnum = (typeof VehicleType)[keyof typeof VehicleType];

export const vehicleTypeSchema = z.enum(['new', 'used', 'certified']);

export const BodyStyle = {
  SEDAN: 'sedan',
  SUV: 'suv',
  TRUCK: 'truck',
  COUPE: 'coupe',
  CONVERTIBLE: 'convertible',
  VAN: 'van',
  WAGON: 'wagon',
  HATCHBACK: 'hatchback',
  OTHER: 'other',
} as const;

export type BodyStyleType = (typeof BodyStyle)[keyof typeof BodyStyle];

export const bodyStyleSchema = z.enum([
  'sedan',
  'suv',
  'truck',
  'coupe',
  'convertible',
  'van',
  'wagon',
  'hatchback',
  'other',
]);

export const TransmissionType = {
  AUTOMATIC: 'automatic',
  MANUAL: 'manual',
  CVT: 'cvt',
  DUAL_CLUTCH: 'dual-clutch',
  OTHER: 'other',
} as const;

export type TransmissionTypeEnum = (typeof TransmissionType)[keyof typeof TransmissionType];

export const transmissionSchema = z.enum([
  'automatic',
  'manual',
  'cvt',
  'dual-clutch',
  'other',
]);

export const DrivetrainType = {
  FWD: 'fwd',
  RWD: 'rwd',
  AWD: 'awd',
  FOUR_WD: '4wd',
} as const;

export type DrivetrainTypeEnum = (typeof DrivetrainType)[keyof typeof DrivetrainType];

export const drivetrainSchema = z.enum(['fwd', 'rwd', 'awd', '4wd']);

export const FuelType = {
  GASOLINE: 'gasoline',
  DIESEL: 'diesel',
  HYBRID: 'hybrid',
  PLUG_IN_HYBRID: 'plug-in-hybrid',
  ELECTRIC: 'electric',
  FLEX_FUEL: 'flex-fuel',
  OTHER: 'other',
} as const;

export type FuelTypeEnum = (typeof FuelType)[keyof typeof FuelType];

export const fuelTypeSchema = z.enum([
  'gasoline',
  'diesel',
  'hybrid',
  'plug-in-hybrid',
  'electric',
  'flex-fuel',
  'other',
]);

export const VehicleCondition = {
  EXCELLENT: 'excellent',
  GOOD: 'good',
  FAIR: 'fair',
  POOR: 'poor',
} as const;

export type VehicleConditionType = (typeof VehicleCondition)[keyof typeof VehicleCondition];

export const vehicleConditionSchema = z.enum(['excellent', 'good', 'fair', 'poor']);

// ============================================================================
// VEHICLE PHOTO SCHEMA
// ============================================================================

export const VehiclePhotoSchema = z.object({
  id: z.string().uuid().optional(),
  url: z.string().url(),
  isPrimary: z.boolean().default(false),
  order: z.number().int().min(0).default(0),
  caption: z.string().optional(),
  uploadedAt: z.string().datetime().optional(),
});

export type VehiclePhoto = z.infer<typeof VehiclePhotoSchema>;

// ============================================================================
// VIN VALIDATION SCHEMA
// ============================================================================

export const vinSchema = z
  .string()
  .length(17, 'VIN must be exactly 17 characters')
  .toUpperCase()
  .regex(vinRegex, 'VIN contains invalid characters (I, O, Q not allowed)')
  .refine(
    (vin) => {
      // VIN check digit validation (position 9)
      return validateVINCheckDigit(vin);
    },
    { message: 'Invalid VIN check digit' }
  );

/**
 * VIN Check Digit Validation Algorithm (ISO 3779)
 */
function validateVINCheckDigit(vin: string): boolean {
  if (vin.length !== 17) return false;

  const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  const transliteration: Record<string, number> = {
    A: 1,
    B: 2,
    C: 3,
    D: 4,
    E: 5,
    F: 6,
    G: 7,
    H: 8,
    J: 1,
    K: 2,
    L: 3,
    M: 4,
    N: 5,
    P: 7,
    R: 9,
    S: 2,
    T: 3,
    U: 4,
    V: 5,
    W: 6,
    X: 7,
    Y: 8,
    Z: 9,
  };

  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const char = vin[i];
    const value = /\d/.test(char) ? parseInt(char, 10) : transliteration[char] || 0;
    sum += value * weights[i];
  }

  const remainder = sum % 11;
  const checkDigit = remainder === 10 ? 'X' : remainder.toString();

  return checkDigit === vin[8];
}

// ============================================================================
// MAIN VEHICLE SCHEMA
// ============================================================================

export const VehicleSchema = z.object({
  // System fields
  id: z.string().uuid(),
  dealershipId: z.string().uuid(),

  // Identification
  vin: vinSchema,
  stockNumber: z.string().min(1, 'Stock number is required'),

  // Basic details
  year: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 2),
  make: z.string().min(1, 'Make is required').trim(),
  model: z.string().min(1, 'Model is required').trim(),
  trim: z.string().optional(),

  // Classification
  type: vehicleTypeSchema,
  bodyStyle: bodyStyleSchema,

  // Specifications
  exteriorColor: z.string().min(1, 'Exterior color is required').trim(),
  interiorColor: z.string().min(1, 'Interior color is required').trim(),
  transmission: transmissionSchema,
  drivetrain: drivetrainSchema,
  fuelType: fuelTypeSchema,
  engine: z.string().optional(),
  cylinders: z.number().int().min(2).max(16).optional(),
  displacement: z.string().optional(), // e.g., "3.6L"

  // Condition
  mileage: z.number().int().min(0),
  condition: vehicleConditionSchema.optional(),

  // Pricing
  cost: currencySchema, // Dealer cost/invoice
  msrp: currencySchema.optional(), // Manufacturer's suggested retail price
  askingPrice: currencySchema, // Current asking price
  internetPrice: currencySchema.optional(), // Online advertised price

  // Status & Location
  status: vehicleStatusSchema,
  location: z.string().default('main-lot'), // Physical location: main-lot, service, display, etc.
  reservedUntil: z.string().datetime().optional(), // When reservation expires
  reservedForDealId: z.string().uuid().optional(), // Associated deal ID

  // Additional information
  features: z.array(z.string()).default([]),
  photos: z.array(VehiclePhotoSchema).default([]),
  description: z.string().optional(),

  // Metadata
  notes: z.string().optional(), // Public notes
  internalNotes: z.string().optional(), // Staff-only notes
  tags: z.array(z.string()).default([]),

  // Acquisition
  acquiredDate: z.string().datetime().optional(),
  acquiredFrom: z.string().optional(), // Auction, trade-in, wholesale, etc.
  floorPlanProvider: z.string().optional(),
  floorPlanDate: z.string().datetime().optional(),

  // Sale information
  soldDate: z.string().datetime().optional(),
  soldPrice: currencySchema.optional(),
  soldToDealId: z.string().uuid().optional(),

  // System timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().optional(), // Soft delete
});

export type Vehicle = z.infer<typeof VehicleSchema>;

// ============================================================================
// VIN DECODING TYPES
// ============================================================================

export interface VINDecodeResult {
  valid: boolean;
  vin: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  bodyStyle?: string;
  engine?: string;
  transmission?: string;
  drivetrain?: string;
  fuelType?: string;
  manufacturerName?: string;
  plantCountry?: string;
  plantCity?: string;
  plantState?: string;
  series?: string;
  vehicleType?: string;
  errors?: string[];
  warnings?: string[];
}

export interface VINValidationResult {
  valid: boolean;
  error?: string;
  checkDigitValid?: boolean;
}

// ============================================================================
// REQUEST/RESPONSE SCHEMAS
// ============================================================================

// Create vehicle request - omit system-generated fields
export const CreateVehicleRequestSchema = VehicleSchema.omit({
  id: true,
  stockNumber: true, // Generated by service
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  soldDate: true,
  soldPrice: true,
  soldToDealId: true,
}).extend({
  // Allow stock number to be provided optionally
  stockNumber: z.string().optional(),
});

// Update vehicle request - all fields optional
export const UpdateVehicleRequestSchema = VehicleSchema.omit({
  id: true,
  dealershipId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
}).partial();

// Vehicle search/filter query
export const InventoryFiltersSchema = z.object({
  dealershipId: z.string().uuid(),

  // Status filters
  status: vehicleStatusSchema.optional(),
  statuses: z.array(vehicleStatusSchema).optional(),

  // Type filters
  type: vehicleTypeSchema.optional(),
  types: z.array(vehicleTypeSchema).optional(),

  // Basic filters
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.number().int().optional(),
  yearMin: z.number().int().optional(),
  yearMax: z.number().int().optional(),

  // Price filters
  priceMin: currencySchema.optional(),
  priceMax: currencySchema.optional(),

  // Mileage filters
  mileageMin: z.number().int().min(0).optional(),
  mileageMax: z.number().int().min(0).optional(),

  // Other filters
  bodyStyle: bodyStyleSchema.optional(),
  transmission: transmissionSchema.optional(),
  drivetrain: drivetrainSchema.optional(),
  fuelType: fuelTypeSchema.optional(),
  location: z.string().optional(),

  // Text search (searches VIN, stock number, make, model, features)
  search: z.string().optional(),

  // Tags
  tags: z.array(z.string()).optional(),

  // Date filters
  acquiredFrom: z.string().datetime().optional(),
  acquiredTo: z.string().datetime().optional(),

  // Pagination
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),

  // Sorting
  sortBy: z
    .enum([
      'createdAt',
      'updatedAt',
      'year',
      'make',
      'model',
      'mileage',
      'askingPrice',
      'stockNumber',
      'acquiredDate',
    ])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),

  // Include deleted
  includeDeleted: z.boolean().default(false),
});

// Paginated vehicles response
export const PaginatedVehiclesSchema = z.object({
  vehicles: z.array(VehicleSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
  hasMore: z.boolean(),
});

// Vehicle with relations
export const VehicleWithRelationsSchema = VehicleSchema.extend({
  deals: z.array(z.any()).optional(), // Deal type from deal module
  dealCount: z.number().optional(),
  currentDeal: z.any().optional(),
});

// Vehicle history event
export const VehicleHistoryEventSchema = z.object({
  id: z.string().uuid(),
  vehicleId: z.string().uuid(),
  eventType: z.enum([
    'created',
    'status_change',
    'price_change',
    'location_change',
    'reserved',
    'unreserved',
    'sold',
    'service',
    'photo_added',
    'photo_removed',
    'updated',
    'note_added',
  ]),
  timestamp: z.string().datetime(),
  userId: z.string().uuid().optional(),
  oldValue: z.any().optional(),
  newValue: z.any().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Stock number generation request
export const GenerateStockNumberRequestSchema = z.object({
  dealershipId: z.string().uuid(),
  prefix: z.string().optional(),
});

// Import vehicle request
export const ImportVehicleSchema = VehicleSchema.omit({
  id: true,
  dealershipId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const BulkImportRequestSchema = z.object({
  dealershipId: z.string().uuid(),
  vehicles: z.array(ImportVehicleSchema),
  skipDuplicates: z.boolean().default(true),
  updateExisting: z.boolean().default(false),
});

export const BulkImportResultSchema = z.object({
  success: z.number(),
  failed: z.number(),
  skipped: z.number(),
  total: z.number(),
  errors: z.array(
    z.object({
      index: z.number(),
      vin: z.string().optional(),
      error: z.string(),
    })
  ),
  imported: z.array(z.string().uuid()), // IDs of imported vehicles
});

// ============================================================================
// INFERRED TYPES
// ============================================================================

export type CreateVehicleRequest = z.infer<typeof CreateVehicleRequestSchema>;
export type UpdateVehicleRequest = z.infer<typeof UpdateVehicleRequestSchema>;
export type InventoryFilters = z.infer<typeof InventoryFiltersSchema>;
export type PaginatedVehicles = z.infer<typeof PaginatedVehiclesSchema>;
export type VehicleWithRelations = z.infer<typeof VehicleWithRelationsSchema>;
export type VehicleHistoryEvent = z.infer<typeof VehicleHistoryEventSchema>;
export type GenerateStockNumberRequest = z.infer<typeof GenerateStockNumberRequestSchema>;
export type ImportVehicle = z.infer<typeof ImportVehicleSchema>;
export type BulkImportRequest = z.infer<typeof BulkImportRequestSchema>;
export type BulkImportResult = z.infer<typeof BulkImportResultSchema>;

// ============================================================================
// ERROR TYPES
// ============================================================================

export class VehicleError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'VehicleError';
  }
}

export class VehicleNotFoundError extends VehicleError {
  constructor(identifier: string) {
    super(`Vehicle not found: ${identifier}`, 'VEHICLE_NOT_FOUND', 404);
  }
}

export class InvalidVINError extends VehicleError {
  constructor(message: string) {
    super(message, 'INVALID_VIN', 400);
  }
}

export class DuplicateVINError extends VehicleError {
  constructor(vin: string) {
    super(`Vehicle with VIN ${vin} already exists`, 'DUPLICATE_VIN', 409);
  }
}

export class DuplicateStockNumberError extends VehicleError {
  constructor(stockNumber: string) {
    super(
      `Vehicle with stock number ${stockNumber} already exists`,
      'DUPLICATE_STOCK_NUMBER',
      409
    );
  }
}

export class VehicleNotAvailableError extends VehicleError {
  constructor(vehicleId: string, currentStatus: string) {
    super(
      `Vehicle ${vehicleId} is not available (current status: ${currentStatus})`,
      'VEHICLE_NOT_AVAILABLE',
      400
    );
  }
}

export class VehicleAccessDeniedError extends VehicleError {
  constructor(vehicleId: string) {
    super(`Access denied to vehicle: ${vehicleId}`, 'ACCESS_DENIED', 403);
  }
}

export class VINDecodingError extends VehicleError {
  constructor(message: string) {
    super(message, 'VIN_DECODING_ERROR', 500);
  }
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface VehicleSummary {
  totalVehicles: number;
  availableVehicles: number;
  soldVehicles: number;
  totalInventoryValue: number;
  averagePrice: number;
  averageMileage: number;
  byStatus: Record<VehicleStatusType, number>;
  byType: Record<VehicleTypeEnum, number>;
  byMake: Record<string, number>;
}

export interface VehicleValueMetrics {
  cost: number;
  msrp: number;
  askingPrice: number;
  potentialProfit: number;
  daysInInventory: number;
  priceReductions: number;
}
