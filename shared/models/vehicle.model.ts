import { z } from 'zod';

// Base schemas
const currencySchema = z.number().min(0).multipleOf(0.01);
const yearSchema = z.number().min(1900).max(new Date().getFullYear() + 2);

// Vehicle condition enum
export const VehicleConditionSchema = z.enum(['new', 'used', 'certified']);

// Vehicle status enum
export const VehicleStatusSchema = z.enum([
  'available',
  'hold',
  'pending',
  'sold',
  'delivered',
  'wholesale',
  'service',
  'transit',
]);

// Vehicle type enum
export const VehicleTypeSchema = z.enum([
  'sedan',
  'suv',
  'truck',
  'van',
  'coupe',
  'convertible',
  'wagon',
  'hatchback',
  'minivan',
  'crossover',
]);

// Fuel type enum
export const FuelTypeSchema = z.enum(['gas', 'diesel', 'hybrid', 'electric', 'plugin-hybrid']);

// Transmission type enum
export const TransmissionTypeSchema = z.enum(['automatic', 'manual', 'cvt', 'dual-clutch']);

// Drivetrain enum
export const DrivetrainSchema = z.enum(['fwd', 'rwd', 'awd', '4wd']);

// Vehicle specifications schema
export const VehicleSpecsSchema = z.object({
  bodyStyle: VehicleTypeSchema,
  doors: z.number().min(2).max(5).optional(),
  seats: z.number().min(1).max(12).optional(),
  engine: z.string().optional(),
  engineSize: z.string().optional(),
  cylinders: z.number().min(0).max(12).optional(),
  horsepower: z.number().min(0).optional(),
  torque: z.number().min(0).optional(),
  transmission: TransmissionTypeSchema,
  drivetrain: DrivetrainSchema,
  fuelType: FuelTypeSchema,
  mpgCity: z.number().min(0).optional(),
  mpgHighway: z.number().min(0).optional(),
  mpgCombined: z.number().min(0).optional(),
  fuelCapacity: z.number().min(0).optional(),
  range: z.number().min(0).optional(), // For EVs
  batteryCapacity: z.number().min(0).optional(), // kWh for EVs
});

// Vehicle features schema
export const VehicleFeaturesSchema = z.object({
  exterior: z.array(z.string()).default([]),
  interior: z.array(z.string()).default([]),
  safety: z.array(z.string()).default([]),
  technology: z.array(z.string()).default([]),
  convenience: z.array(z.string()).default([]),
  performance: z.array(z.string()).default([]),
  packages: z.array(z.string()).default([]),
});

// Vehicle pricing schema
export const VehiclePricingSchema = z.object({
  msrp: currencySchema.optional(),
  invoice: currencySchema.optional(),
  internetPrice: currencySchema.optional(),
  salePrice: currencySchema,
  costBasis: currencySchema.optional(),
  holdback: currencySchema.optional(),
  packAmount: currencySchema.optional(),
  minimumPrice: currencySchema.optional(),
  advertisedPrice: currencySchema.optional(),
  reconCost: currencySchema.optional(),
  transportFee: currencySchema.optional(),
});

// Vehicle history schema (for used vehicles)
export const VehicleHistorySchema = z.object({
  previousOwners: z.number().min(0).optional(),
  accidents: z.number().min(0).optional(),
  serviceRecords: z.boolean().optional(),
  carfaxAvailable: z.boolean().optional(),
  carfaxUrl: z.string().url().optional(),
  autoCheckAvailable: z.boolean().optional(),
  autoCheckUrl: z.string().url().optional(),
  titleStatus: z.enum(['clean', 'salvage', 'rebuilt', 'lemon']).optional(),
  openRecalls: z.number().min(0).optional(),
  lastServiceDate: z.string().datetime().optional(),
});

// Vehicle location schema
export const VehicleLocationSchema = z.object({
  dealershipId: z.string().uuid(),
  lot: z.string().optional(),
  row: z.string().optional(),
  spot: z.string().optional(),
  building: z.string().optional(),
  isOffsite: z.boolean().default(false),
  offsiteLocation: z.string().optional(),
});

// Main Vehicle schema
export const VehicleSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  dealershipId: z.string().uuid(),

  // Basic Information
  vin: z.string().length(17, 'VIN must be exactly 17 characters'),
  stockNumber: z.string().min(1),
  condition: VehicleConditionSchema,
  status: VehicleStatusSchema,
  year: yearSchema,
  make: z.string().min(1),
  model: z.string().min(1),
  trim: z.string().optional(),
  modelCode: z.string().optional(),

  // Appearance
  exteriorColor: z.string().min(1),
  interiorColor: z.string().min(1),
  exteriorColorCode: z.string().optional(),
  interiorColorCode: z.string().optional(),

  // Mileage
  mileage: z.number().min(0),
  mileageUnit: z.enum(['miles', 'kilometers']).default('miles'),

  // Specifications
  specifications: VehicleSpecsSchema,

  // Features
  features: VehicleFeaturesSchema,

  // Pricing
  pricing: VehiclePricingSchema,

  // History (for used vehicles)
  history: VehicleHistorySchema.optional(),

  // Location
  location: VehicleLocationSchema,

  // Dates
  arrivalDate: z.string().datetime().optional(),
  ageInDays: z.number().min(0).optional(),
  soldDate: z.string().datetime().optional(),
  deliveryDate: z.string().datetime().optional(),
  wholesaleDate: z.string().datetime().optional(),

  // Images
  images: z.array(z.object({
    id: z.string().uuid(),
    url: z.string().url(),
    type: z.enum(['exterior', 'interior', 'engine', 'other']),
    isPrimary: z.boolean().default(false),
    order: z.number().min(0),
    caption: z.string().optional(),
  })).default([]),

  // Marketing
  description: z.string().optional(),
  marketingNotes: z.string().optional(),
  certificationProgram: z.string().optional(),
  certificationExpiry: z.string().datetime().optional(),
  warranty: z.string().optional(),

  // Tags and categorization
  tags: z.array(z.string()).default([]),
  category: z.string().optional(),
  isSpecial: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  isOnline: z.boolean().default(true),

  // Related deals
  holdForCustomerId: z.string().uuid().optional(),
  holdExpiry: z.string().datetime().optional(),
  reservationDeposit: currencySchema.optional(),

  // System fields
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdBy: z.string().uuid(),
  updatedBy: z.string().uuid(),
  version: z.number().default(1), // For optimistic locking
});

// Types
export type VehicleCondition = z.infer<typeof VehicleConditionSchema>;
export type VehicleStatus = z.infer<typeof VehicleStatusSchema>;
export type VehicleType = z.infer<typeof VehicleTypeSchema>;
export type FuelType = z.infer<typeof FuelTypeSchema>;
export type TransmissionType = z.infer<typeof TransmissionTypeSchema>;
export type Drivetrain = z.infer<typeof DrivetrainSchema>;
export type VehicleSpecs = z.infer<typeof VehicleSpecsSchema>;
export type VehicleFeatures = z.infer<typeof VehicleFeaturesSchema>;
export type VehiclePricing = z.infer<typeof VehiclePricingSchema>;
export type VehicleHistory = z.infer<typeof VehicleHistorySchema>;
export type VehicleLocation = z.infer<typeof VehicleLocationSchema>;
export type Vehicle = z.infer<typeof VehicleSchema>;

// API Request/Response schemas
export const CreateVehicleRequestSchema = VehicleSchema.omit({
  id: true,
  ageInDays: true, // Calculated
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
});

export const UpdateVehicleRequestSchema = CreateVehicleRequestSchema.partial().extend({
  version: z.number(), // Required for optimistic locking
});

export const VehicleListQuerySchema = z.object({
  tenantId: z.string().uuid(),
  dealershipId: z.string().uuid().optional(),
  condition: VehicleConditionSchema.optional(),
  status: VehicleStatusSchema.optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  year: yearSchema.optional(),
  yearFrom: yearSchema.optional(),
  yearTo: yearSchema.optional(),
  priceFrom: currencySchema.optional(),
  priceTo: currencySchema.optional(),
  mileageFrom: z.number().min(0).optional(),
  mileageTo: z.number().min(0).optional(),
  bodyStyle: VehicleTypeSchema.optional(),
  fuelType: FuelTypeSchema.optional(),
  transmission: TransmissionTypeSchema.optional(),
  drivetrain: DrivetrainSchema.optional(),
  exteriorColor: z.string().optional(),
  search: z.string().optional(), // Searches VIN, stock number, make, model
  isFeatured: z.boolean().optional(),
  isOnline: z.boolean().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'price', 'year', 'mileage', 'ageInDays']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateVehicleRequest = z.infer<typeof CreateVehicleRequestSchema>;
export type UpdateVehicleRequest = z.infer<typeof UpdateVehicleRequestSchema>;
export type VehicleListQuery = z.infer<typeof VehicleListQuerySchema>;