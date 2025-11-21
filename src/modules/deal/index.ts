/**
 * DEAL MODULE PUBLIC API
 *
 * This is the ONLY file that should be imported from outside the deal module.
 * All module internals are encapsulated and not exposed.
 *
 * Usage:
 * import { DealService, createDealRouter } from '@/modules/deal';
 */

// ============================================================================
// SERVICES
// ============================================================================

export { DealService } from './services/deal.service';
export { DealCalculatorService } from './services/deal-calculator.service';
export type { DealStorage, DealCalculator } from './services/deal.service';

// ============================================================================
// ROUTES
// ============================================================================

export { createDealRouter } from './api/deal.routes';

// ============================================================================
// TYPES
// ============================================================================

export type {
  Deal,
  DealStatus,
  DealType,
  TradeIn,
  FinancingDetails,
  DealFees,
  CustomFee,
  Product,
  DealCalculation,
  DealDocument,
  DealForm,
  ChecklistItem,
  CreateDealRequest,
  UpdateDealRequest,
  DealListQuery,
  DealListResponse,
} from './types/deal.types';

export { DealStatus as DealStatusEnum, DealType as DealTypeEnum } from './types/deal.types';

// ============================================================================
// ERRORS
// ============================================================================

export {
  DealError,
  DealNotFoundError,
  DealVersionConflictError,
  InvalidDealStateError,
} from './types/deal.types';

// ============================================================================
// SCHEMAS
// ============================================================================

export {
  dealStatusSchema,
  dealTypeSchema,
  tradeInSchema,
  financingDetailsSchema,
  createDealSchema,
  updateDealSchema,
} from './types/deal.types';
