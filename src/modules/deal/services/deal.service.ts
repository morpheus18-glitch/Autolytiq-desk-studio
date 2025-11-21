/**
 * DEAL SERVICE
 * Core business logic for deal management
 *
 * Responsibilities:
 * - Deal creation and updates
 * - Deal calculations
 * - State transitions
 * - Deal validation
 * - Optimistic locking
 */

import type {
  Deal,
  CreateDealRequest,
  UpdateDealRequest,
  DealListQuery,
  DealListResponse,
  DealCalculation,
} from '../types/deal.types';
import {
  DealError,
  DealNotFoundError,
  DealVersionConflictError,
  InvalidDealStateError,
} from '../types/deal.types';

// ============================================================================
// STORAGE INTERFACE
// ============================================================================

export interface DealFees {
  documentationFee?: number;
  registrationFee?: number;
  titleFee?: number;
  dealerFees?: number;
  [key: string]: number | undefined;
}

export interface DealProduct {
  id: string;
  name: string;
  price: number;
  term?: number;
  type?: string;
}

export interface DealStorage {
  createDeal(data: Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Deal>;
  updateDeal(id: string, data: Partial<Deal>): Promise<Deal>;
  getDeal(id: string): Promise<Deal | null>;
  listDeals(query: DealListQuery): Promise<DealListResponse>;
  deleteDeal(id: string): Promise<void>;
  getNextDealNumber(dealershipId: string): Promise<string>;
}

// ============================================================================
// CALCULATION ENGINE INTERFACE
// ============================================================================

export interface DealCalculator {
  calculateDeal(params: {
    vehiclePrice: number;
    dealerDiscount?: number;
    manufacturerRebate?: number;
    tradeInAllowance?: number;
    tradeInPayoff?: number;
    fees?: DealFees;
    products?: DealProduct[];
    taxCalculation?: unknown;
  }): Promise<DealCalculation>;

  calculateMonthlyPayment(params: {
    principal: number;
    rate: number;
    term: number;
  }): number;
}

// ============================================================================
// DEAL SERVICE
// ============================================================================

export class DealService {
  constructor(
    private storage: DealStorage,
    private calculator: DealCalculator
  ) {}

  /**
   * Create new deal
   */
  async createDeal(request: CreateDealRequest, userId: string): Promise<Deal> {
    // Validate request
    this.validateCreateRequest(request);

    // Generate deal number
    const dealNumber = await this.storage.getNextDealNumber(request.dealershipId);

    // Calculate deal totals
    const calculation = await this.calculator.calculateDeal({
      vehiclePrice: request.calculation.vehiclePrice,
      dealerDiscount: request.calculation.dealerDiscount,
      manufacturerRebate: request.calculation.manufacturerRebate,
      tradeInAllowance: request.tradeIn?.allowance,
      tradeInPayoff: request.tradeIn?.payoffAmount,
      fees: request.calculation.fees,
      products: request.calculation.products,
    });

    // Create deal
    const deal = await this.storage.createDeal({
      ...request,
      dealNumber,
      calculation,
      documents: [],
      forms: [],
      tags: [],
      checklistItems: this.createDefaultChecklist(request.type),
      createdBy: userId,
      updatedBy: userId,
      version: 1,
    });

    return deal;
  }

  /**
   * Update existing deal
   */
  async updateDeal(
    dealId: string,
    request: UpdateDealRequest,
    userId: string
  ): Promise<Deal> {
    // Get existing deal
    const existingDeal = await this.storage.getDeal(dealId);
    if (!existingDeal) {
      throw new DealNotFoundError(dealId);
    }

    // Check version for optimistic locking
    if (request.version !== existingDeal.version) {
      throw new DealVersionConflictError(dealId);
    }

    // Validate state transition
    if (request.status && request.status !== existingDeal.status) {
      this.validateStateTransition(existingDeal.status, request.status);
    }

    // Recalculate if pricing changed
    let calculation = existingDeal.calculation;
    if (this.shouldRecalculate(request, existingDeal)) {
      calculation = await this.calculator.calculateDeal({
        vehiclePrice: request.calculation?.vehiclePrice ?? existingDeal.calculation.vehiclePrice,
        dealerDiscount: request.calculation?.dealerDiscount ?? existingDeal.calculation.dealerDiscount,
        manufacturerRebate: request.calculation?.manufacturerRebate ?? existingDeal.calculation.manufacturerRebate,
        tradeInAllowance: request.tradeIn?.allowance ?? existingDeal.tradeIn?.allowance,
        tradeInPayoff: request.tradeIn?.payoffAmount ?? existingDeal.tradeIn?.payoffAmount,
        fees: request.calculation?.fees ?? existingDeal.calculation.fees,
        products: request.calculation?.products ?? existingDeal.calculation.products,
      });
    }

    // Update deal
    const updatedDeal = await this.storage.updateDeal(dealId, {
      ...request,
      calculation,
      updatedBy: userId,
      version: existingDeal.version + 1,
    });

    return updatedDeal;
  }

  /**
   * Get deal by ID
   */
  async getDeal(dealId: string): Promise<Deal> {
    const deal = await this.storage.getDeal(dealId);
    if (!deal) {
      throw new DealNotFoundError(dealId);
    }
    return deal;
  }

  /**
   * List deals with filters
   */
  async listDeals(query: DealListQuery): Promise<DealListResponse> {
    return await this.storage.listDeals(query);
  }

  /**
   * Delete deal (soft delete - archive)
   */
  async archiveDeal(dealId: string, userId: string): Promise<Deal> {
    const deal = await this.getDeal(dealId);

    if (deal.status === 'archived') {
      throw new InvalidDealStateError('Deal is already archived');
    }

    if (deal.status === 'delivered' || deal.status === 'funded') {
      throw new InvalidDealStateError('Cannot archive delivered or funded deals');
    }

    return await this.storage.updateDeal(dealId, {
      status: 'archived',
      updatedBy: userId,
      version: deal.version + 1,
    });
  }

  // ============================================================================
  // VALIDATION METHODS
  // ============================================================================

  private validateCreateRequest(request: CreateDealRequest): void {
    // Validate required fields
    if (!request.customerId) {
      throw new DealError('Customer is required', 'MISSING_CUSTOMER', 400);
    }

    if (!request.vehicleId) {
      throw new DealError('Vehicle is required', 'MISSING_VEHICLE', 400);
    }

    if (!request.salespersonId) {
      throw new DealError('Salesperson is required', 'MISSING_SALESPERSON', 400);
    }

    // Validate finance deals have financing details
    if (request.type === 'finance' && !request.financing) {
      throw new DealError(
        'Financing details required for finance deals',
        'MISSING_FINANCING',
        400
      );
    }
  }

  private validateStateTransition(
    from: string,
    to: string
  ): void {
    const validTransitions: Record<string, string[]> = {
      draft: ['pending', 'cancelled'],
      pending: ['approved', 'cancelled'],
      approved: ['financing', 'delivered', 'cancelled'],
      financing: ['funded', 'cancelled'],
      funded: ['delivered'],
      delivered: ['archived'],
      cancelled: ['archived'],
      archived: [], // Cannot transition from archived
    };

    const allowed = validTransitions[from] || [];
    if (!allowed.includes(to)) {
      throw new InvalidDealStateError(
        `Invalid state transition from ${from} to ${to}`
      );
    }
  }

  private shouldRecalculate(
    request: UpdateDealRequest,
    existing: Deal
  ): boolean {
    // Recalculate if pricing fields changed
    if (request.calculation) return true;
    if (request.tradeIn) return true;
    if (request.financing) return true;
    return false;
  }

  private createDefaultChecklist(dealType: string): Array<{ label: string; value: string; completed: boolean }> {
    const commonItems = [
      { id: crypto.randomUUID(), task: 'Verify customer information', completed: false },
      { id: crypto.randomUUID(), task: 'Verify vehicle information', completed: false },
      { id: crypto.randomUUID(), task: 'Calculate deal numbers', completed: false },
      { id: crypto.randomUUID(), task: 'Review with manager', completed: false },
    ];

    const financeItems = [
      { id: crypto.randomUUID(), task: 'Submit credit application', completed: false },
      { id: crypto.randomUUID(), task: 'Receive approval', completed: false },
      { id: crypto.randomUUID(), task: 'Prepare financing documents', completed: false },
    ];

    const deliveryItems = [
      { id: crypto.randomUUID(), task: 'Collect down payment', completed: false },
      { id: crypto.randomUUID(), task: 'Process trade-in', completed: false },
      { id: crypto.randomUUID(), task: 'Complete title work', completed: false },
      { id: crypto.randomUUID(), task: 'Schedule delivery', completed: false },
    ];

    if (dealType === 'finance') {
      return [...commonItems, ...financeItems, ...deliveryItems];
    }

    return [...commonItems, ...deliveryItems];
  }
}
