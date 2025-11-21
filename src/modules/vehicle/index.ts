/**
 * VEHICLE MODULE PUBLIC API
 * Only exports listed here are available to other modules
 */

// ============================================================================
// SERVICES
// ============================================================================

export { VehicleService } from './services/vehicle.service';
export { InventoryService } from './services/inventory.service';
export { VINDecoderService } from './services/vin-decoder.service';
export { StockNumberService } from './services/stock-number.service';

// ============================================================================
// TYPES
// ============================================================================

export type {
  Vehicle,
  VehicleStatusType,
  VehicleTypeEnum,
  BodyStyleType,
  TransmissionTypeEnum,
  DrivetrainTypeEnum,
  FuelTypeEnum,
  VehicleConditionType,
  VehiclePhoto,
  CreateVehicleRequest,
  UpdateVehicleRequest,
  InventoryFilters,
  PaginatedVehicles,
  VehicleWithRelations,
  VehicleHistoryEvent,
  VINDecodeResult,
  VINValidationResult,
  VehicleSummary,
  VehicleValueMetrics,
  BulkImportRequest,
  BulkImportResult,
} from './types/vehicle.types';

export {
  VehicleStatus,
  VehicleType,
  BodyStyle,
  TransmissionType,
  DrivetrainType,
  FuelType,
  VehicleCondition,
  VehicleError,
  VehicleNotFoundError,
  InvalidVINError,
  DuplicateVINError,
  DuplicateStockNumberError,
  VehicleNotAvailableError,
  VehicleAccessDeniedError,
  VINDecodingError,
  VehicleSchema,
  CreateVehicleRequestSchema,
  UpdateVehicleRequestSchema,
  InventoryFiltersSchema,
  vinSchema,
} from './types/vehicle.types';

// ============================================================================
// API
// ============================================================================

export { createVehicleRouter } from './api/vehicle.routes';

// ============================================================================
// HOOKS
// ============================================================================

export {
  useVehicle,
  useCreateVehicle,
  useUpdateVehicle,
  useDeleteVehicle,
  useVehicleHistory,
  useVehicleMetrics,
  useUpdateVehicleStatus,
  useReserveVehicle,
  useReleaseVehicle,
} from './hooks/useVehicle';

export {
  useInventory,
  useInventorySummary,
  useInventoryWithPreset,
} from './hooks/useInventory';

export {
  useValidateVIN,
  useDecodeVIN,
  useDecodeVINQuery,
  useGenerateStockNumber,
} from './hooks/useVinDecoder';

// ============================================================================
// COMPONENTS
// ============================================================================

export { VehicleCard } from './components/VehicleCard';

// ============================================================================
// UTILITIES
// ============================================================================

export {
  validateVIN,
  hasValidVINCharacters,
  extractWMI,
  extractVDS,
  extractVIS,
  getModelYearCode,
  decodeModelYear,
  getCheckDigit,
  validateStockNumber,
  normalizeVIN,
  normalizeStockNumber,
  isValidVehicleYear,
  isReasonableMileage,
  isReasonablePrice,
  hasValidPricing,
} from './utils/validators';

export {
  formatVehicleName,
  formatVehicleShortName,
  formatVIN,
  formatStockNumber,
  formatMileage,
  formatMileageWithUnit,
  formatPrice,
  formatStatus,
  getStatusColor,
  formatTransmission,
  formatDrivetrain,
  formatFuelType,
  formatBodyStyle,
  formatVehicleType,
  formatCondition,
  formatDate,
  formatDateTime,
  calculateDaysInInventory,
  formatDaysInInventory,
  getAgeCategory,
  formatProfitMargin,
  formatPotentialProfit,
  getPrimaryPhotoUrl,
  getPhotoCount,
  formatFeaturesList,
  formatLocation,
  createVehicleSummary,
  createShortDescription,
} from './utils/formatters';
