/**
 * DEAL API ROUTES
 * Comprehensive Express routes for all deal management endpoints
 *
 * This module provides ALL deal-related API endpoints including:
 * - Deal CRUD operations
 * - Trade vehicle management
 * - Deal scenarios and calculations
 * - Audit logs
 * - PDF generation
 * - Lender integration
 * - Deal statistics
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Import existing deal routes for re-export
// This maintains backward compatibility during migration

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Extended Request type with user information
 */
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    dealershipId: string;
    role: string;
    email: string;
  };
}

/**
 * Storage interface - will be injected from server/storage.ts during migration
 * This allows gradual migration without breaking existing code
 */
interface DealStorage {
  // Deal operations
  getDeal(id: string): Promise<any>;
  getDeals(params: any): Promise<any>;
  getDealsStats(dealershipId: string): Promise<any>;
  createDeal(data: any): Promise<any>;
  updateDeal(id: string, data: any): Promise<any>;
  updateDealState(id: string, state: string): Promise<any>;
  attachCustomerToDeal(dealId: string, customerId: string): Promise<any>;

  // Trade vehicle operations
  getTradeVehiclesByDeal(dealId: string): Promise<any[]>;
  getTradeVehicle(id: string): Promise<any>;
  createTradeVehicle(data: any): Promise<any>;
  updateTradeVehicle(id: string, data: any): Promise<any>;
  deleteTradeVehicle(id: string): Promise<void>;

  // Scenario operations
  createScenario(data: any): Promise<any>;
  getScenario(id: string): Promise<any>;
  updateScenario(id: string, data: any): Promise<any>;
  deleteScenario(id: string): Promise<void>;
  getFeePackageTemplate(id: string): Promise<any>;

  // Audit operations
  createAuditLog(data: any): Promise<void>;
  getDealAuditLogs(dealId: string): Promise<any[]>;

  // Lender operations
  getRateRequestsByDeal(dealId: string): Promise<any[]>;
  getSelectedLenderForDeal(dealId: string): Promise<any>;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const tradeVehicleInputSchema = z.object({
  year: z.coerce.number(),
  make: z.string().min(1),
  model: z.string().min(1),
  mileage: z.coerce.number(),
  vin: z.string().optional(),
  allowance: z.coerce.number(),
  payoff: z.coerce.number().default(0),
  payoffTo: z.string().optional(),
});

const tradeVehicleUpdateSchema = tradeVehicleInputSchema.partial();

const attachCustomerSchema = z.object({
  customerId: z.string().uuid(),
});

const dealStateUpdateSchema = z.object({
  state: z.string(),
});

const applyTemplateSchema = z.object({
  templateId: z.string().uuid(),
});

// ============================================================================
// ROUTE FACTORY
// ============================================================================

/**
 * Creates deal router with all endpoints
 *
 * @param storage - Storage interface for data operations
 * @param requireAuth - Authentication middleware
 * @param requireRole - Role-based authorization middleware
 * @param insertDealSchema - Zod schema for deal creation (from shared/schema.ts)
 * @param insertTradeVehicleSchema - Zod schema for trade vehicle creation
 * @param insertDealScenarioSchema - Zod schema for scenario creation
 * @returns Configured Express router
 */
export function createDealRouter(
  storage: DealStorage,
  requireAuth: (req: Request, res: Response, next: NextFunction) => void,
  requireRole: (...roles: string[]) => (req: Request, res: Response, next: NextFunction) => void,
  insertDealSchema: z.ZodSchema,
  insertTradeVehicleSchema: z.ZodSchema,
  insertDealScenarioSchema: z.ZodSchema
) {
  const router = Router();

  // ============================================================================
  // DEAL STATISTICS
  // ============================================================================

  /**
   * GET /api/deals/stats
   * Get deal statistics for dealership
   *
   * @security Multi-tenant isolation enforced
   * @returns Deal statistics aggregated by status
   */
  router.get('/stats', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dealershipId = req.user?.dealershipId;
      if (!dealershipId) {
        return res.status(403).json({ error: 'User must belong to a dealership' });
      }

      const stats = await storage.getDealsStats(dealershipId);
      res.json(stats);
    } catch (error) {
      console.error('[GET /api/deals/stats] Error:', error);
      res.status(500).json({ error: 'Failed to get deal statistics' });
    }
  });

  // ============================================================================
  // DEAL CRUD OPERATIONS
  // ============================================================================

  /**
   * GET /api/deals
   * List deals with filters and pagination
   *
   * @query page - Page number (default: 1)
   * @query pageSize - Items per page (default: 20)
   * @query search - Search term for customer/deal info
   * @query status - Filter by deal status
   * @security Multi-tenant isolation enforced
   * @returns Paginated list of deals
   */
  router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dealershipId = req.user?.dealershipId;
      if (!dealershipId) {
        return res.status(403).json({ error: 'User must belong to a dealership' });
      }

      const page = parseInt(String(req.query.page || '1'));
      const pageSize = parseInt(String(req.query.pageSize || '20'));
      const search = req.query.search ? String(req.query.search) : undefined;
      const status = req.query.status ? String(req.query.status) : undefined;

      const result = await storage.getDeals({ page, pageSize, search, status, dealershipId });
      res.json(result);
    } catch (error) {
      console.error('[GET /api/deals] Error:', error);
      res.status(500).json({ error: 'Failed to get deals' });
    }
  });

  /**
   * GET /api/deals/:id
   * Get single deal by ID
   *
   * @param id - Deal UUID
   * @security Multi-tenant isolation enforced
   * @returns Deal object with all related data
   */
  router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dealershipId = req.user?.dealershipId;
      if (!dealershipId) {
        return res.status(403).json({ error: 'User must belong to a dealership' });
      }

      const deal = await storage.getDeal(req.params.id);
      if (!deal) {
        return res.status(404).json({ error: 'Deal not found' });
      }

      // Verify deal belongs to same dealership as authenticated user
      if (deal.dealershipId !== dealershipId) {
        return res.status(404).json({ error: 'Deal not found' });
      }

      res.json(deal);
    } catch (error) {
      console.error(`[GET /api/deals/:id] Error for deal ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to get deal' });
    }
  });

  /**
   * POST /api/deals
   * Create new deal with atomic operations
   *
   * @body Deal creation data (validated by insertDealSchema)
   * @security Multi-tenant isolation enforced
   * @returns Created deal with scenario, customer, and vehicle data
   */
  router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = insertDealSchema.parse(req.body);

      const dealershipId = req.user?.dealershipId;
      if (!dealershipId) {
        return res.status(403).json({ error: 'User must belong to a dealership to create deals' });
      }

      // ATOMIC DEAL CREATION
      // Uses atomic operations to ensure all-or-nothing creation
      // No more orphaned customers, vehicles, or scenarios
      const { createDeal, ValidationError, ResourceNotFoundError, VehicleNotAvailableError, MultiTenantViolationError } = await import('../../../../server/database/atomic-operations');

      try {
        const result = await createDeal({
          dealershipId,
          salespersonId: data.salespersonId,
          customerId: data.customerId || undefined,
          vehicleId: data.vehicleId || undefined,
          tradeVehicleId: data.tradeVehicleId || undefined,
          initialState: data.dealState || 'DRAFT',
        });

        // Return comprehensive result
        res.status(201).json({
          success: true,
          data: {
            deal: result.deal,
            scenario: result.scenario,
            customer: result.customer,
            vehicle: result.vehicle,
          },
        });
      } catch (error: any) {
        // Handle specific error types with appropriate status codes
        if (error instanceof ValidationError) {
          return res.status(400).json({ success: false, error: error.message });
        }
        if (error instanceof ResourceNotFoundError) {
          return res.status(404).json({ success: false, error: error.message });
        }
        if (error instanceof VehicleNotAvailableError) {
          return res.status(409).json({ success: false, error: error.message });
        }
        if (error instanceof MultiTenantViolationError) {
          return res.status(403).json({ success: false, error: error.message });
        }

        console.error('[POST /api/deals] Deal creation failed:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to create deal. Please try again.'
        });
      }
    } catch (error: any) {
      // Schema validation error
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors
        });
      }

      console.error('[POST /api/deals] Unexpected error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create deal'
      });
    }
  });

  /**
   * PATCH /api/deals/:id
   * Update deal
   *
   * @param id - Deal UUID
   * @body Partial deal data to update
   * @returns Updated deal with audit logs
   */
  router.patch('/:id', async (req: Request, res: Response) => {
    try {
      const oldDeal = await storage.getDeal(req.params.id);
      if (!oldDeal) {
        return res.status(404).json({ error: 'Deal not found' });
      }

      const deal = await storage.updateDeal(req.params.id, req.body);

      // Create audit log for each changed field
      const changes = Object.keys(req.body);
      for (const field of changes) {
        await storage.createAuditLog({
          dealId: deal.id,
          userId: oldDeal.salespersonId,
          action: 'update',
          entityType: 'deal',
          entityId: deal.id,
          fieldName: field,
          oldValue: String((oldDeal as any)[field] || ''),
          newValue: String((deal as any)[field] || ''),
        });
      }

      res.json(deal);
    } catch (error: any) {
      console.error('[PATCH /api/deals/:id] Error:', error);
      res.status(400).json({ error: error.message || 'Failed to update deal' });
    }
  });

  /**
   * PATCH /api/deals/:id/attach-customer
   * Attach customer to deal and generate deal number
   *
   * @param id - Deal UUID
   * @body customerId - Customer UUID
   * @returns Updated deal with customer attached
   */
  router.patch('/:id/attach-customer', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { customerId } = attachCustomerSchema.parse(req.body);

      const deal = await storage.attachCustomerToDeal(id, customerId);
      res.json(deal);
    } catch (error: any) {
      console.error('[PATCH /api/deals/:id/attach-customer] Error:', error);

      // Return appropriate status codes based on error
      if (error.message?.includes('same dealership')) {
        res.status(403).json({ error: 'Forbidden' });
      } else if (error.message?.includes('not found')) {
        res.status(404).json({ error: 'Not found' });
      } else {
        res.status(400).json({ error: error.message || 'Failed to attach customer to deal' });
      }
    }
  });

  /**
   * PATCH /api/deals/:id/state
   * Update deal state with audit logging
   *
   * @param id - Deal UUID
   * @body state - New deal state
   * @returns Updated deal with new state
   */
  router.patch('/:id/state', async (req: Request, res: Response) => {
    try {
      const { state } = dealStateUpdateSchema.parse(req.body);
      const oldDeal = await storage.getDeal(req.params.id);
      if (!oldDeal) {
        return res.status(404).json({ error: 'Deal not found' });
      }

      const deal = await storage.updateDealState(req.params.id, state);

      // Create audit log for state change
      await storage.createAuditLog({
        dealId: deal.id,
        userId: oldDeal.salespersonId,
        action: 'state_change',
        entityType: 'deal',
        entityId: deal.id,
        fieldName: 'dealState',
        oldValue: oldDeal.dealState,
        newValue: deal.dealState,
      });

      res.json(deal);
    } catch (error: any) {
      console.error('[PATCH /api/deals/:id/state] Error:', error);
      res.status(400).json({ error: error.message || 'Failed to update deal state' });
    }
  });

  // ============================================================================
  // TRADE VEHICLE MANAGEMENT
  // ============================================================================

  /**
   * GET /api/deals/:dealId/trades
   * Get all trade vehicles for a deal
   *
   * @param dealId - Deal UUID
   * @security Multi-tenant isolation enforced
   * @returns Array of trade vehicles
   */
  router.get('/:dealId/trades', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dealershipId = req.user?.dealershipId;
      if (!dealershipId) {
        return res.status(403).json({ error: 'User must belong to a dealership' });
      }

      const { dealId } = req.params;

      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ error: 'Deal not found' });
      }

      // Verify deal belongs to same dealership as authenticated user
      if (deal.dealershipId !== dealershipId) {
        return res.status(404).json({ error: 'Deal not found' });
      }

      const trades = await storage.getTradeVehiclesByDeal(dealId);
      res.json(trades);
    } catch (error: any) {
      console.error('[GET /api/deals/:dealId/trades] Error:', error);
      res.status(500).json({ error: error.message || 'Failed to get trade vehicles' });
    }
  });

  /**
   * POST /api/deals/:dealId/trades
   * Create trade vehicle for deal
   *
   * @param dealId - Deal UUID
   * @body Trade vehicle data
   * @returns Created trade vehicle with audit log
   */
  router.post('/:dealId/trades', async (req: Request, res: Response) => {
    try {
      const { dealId } = req.params;

      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ error: 'Deal not found' });
      }

      const input = tradeVehicleInputSchema.parse(req.body);

      const data = {
        ...input,
        dealId,
        allowance: String(input.allowance),
        payoff: String(input.payoff),
      };

      const tradeVehicle = await storage.createTradeVehicle(data);

      await storage.createAuditLog({
        dealId,
        userId: deal.salespersonId,
        action: 'create',
        entityType: 'trade_vehicle',
        entityId: tradeVehicle.id,
        fieldName: 'trade_vehicle',
        oldValue: '',
        newValue: `${tradeVehicle.year} ${tradeVehicle.make} ${tradeVehicle.model}`,
      });

      res.status(201).json(tradeVehicle);
    } catch (error: any) {
      console.error('[POST /api/deals/:dealId/trades] Error:', error);
      res.status(400).json({ error: error.message || 'Failed to create trade vehicle' });
    }
  });

  /**
   * PATCH /api/deals/:dealId/trades/:tradeId
   * Update trade vehicle
   *
   * @param dealId - Deal UUID
   * @param tradeId - Trade vehicle UUID
   * @body Partial trade vehicle data
   * @returns Updated trade vehicle with audit logs
   */
  router.patch('/:dealId/trades/:tradeId', async (req: Request, res: Response) => {
    try {
      const { dealId, tradeId } = req.params;

      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ error: 'Deal not found' });
      }

      const oldTrade = await storage.getTradeVehicle(tradeId);
      if (!oldTrade) {
        return res.status(404).json({ error: 'Trade vehicle not found' });
      }

      if (oldTrade.dealId !== dealId) {
        return res.status(403).json({ error: 'Trade vehicle does not belong to this deal' });
      }

      const input = tradeVehicleUpdateSchema.parse(req.body);

      const data: any = { ...input };
      if (input.allowance !== undefined) data.allowance = String(input.allowance);
      if (input.payoff !== undefined) data.payoff = String(input.payoff);

      const tradeVehicle = await storage.updateTradeVehicle(tradeId, data);

      // Create audit log for significant changes
      const significantFields = ['allowance', 'payoff', 'year', 'make', 'model', 'mileage'];
      for (const field of significantFields) {
        if (req.body[field] !== undefined && String((oldTrade as any)[field]) !== String((tradeVehicle as any)[field])) {
          await storage.createAuditLog({
            dealId,
            userId: deal.salespersonId,
            action: 'update',
            entityType: 'trade_vehicle',
            entityId: tradeVehicle.id,
            fieldName: field,
            oldValue: String((oldTrade as any)[field] || ''),
            newValue: String((tradeVehicle as any)[field] || ''),
          });
        }
      }

      res.json(tradeVehicle);
    } catch (error: any) {
      console.error('[PATCH /api/deals/:dealId/trades/:tradeId] Error:', error);
      res.status(400).json({ error: error.message || 'Failed to update trade vehicle' });
    }
  });

  /**
   * DELETE /api/deals/:dealId/trades/:tradeId
   * Delete trade vehicle
   *
   * @param dealId - Deal UUID
   * @param tradeId - Trade vehicle UUID
   * @returns 204 No Content on success
   */
  router.delete('/:dealId/trades/:tradeId', async (req: Request, res: Response) => {
    try {
      const { dealId, tradeId } = req.params;

      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ error: 'Deal not found' });
      }

      const tradeVehicle = await storage.getTradeVehicle(tradeId);
      if (!tradeVehicle) {
        return res.status(404).json({ error: 'Trade vehicle not found' });
      }

      if (tradeVehicle.dealId !== dealId) {
        return res.status(403).json({ error: 'Trade vehicle does not belong to this deal' });
      }

      await storage.deleteTradeVehicle(tradeId);

      await storage.createAuditLog({
        dealId,
        userId: deal.salespersonId,
        action: 'delete',
        entityType: 'trade_vehicle',
        entityId: tradeId,
        fieldName: 'trade_vehicle',
        oldValue: `${tradeVehicle.year} ${tradeVehicle.make} ${tradeVehicle.model}`,
        newValue: '',
      });

      res.status(204).send();
    } catch (error: any) {
      console.error('[DELETE /api/deals/:dealId/trades/:tradeId] Error:', error);
      res.status(400).json({ error: error.message || 'Failed to delete trade vehicle' });
    }
  });

  // ============================================================================
  // DEAL SCENARIOS
  // ============================================================================

  /**
   * POST /api/deals/:dealId/scenarios
   * Create new deal scenario
   *
   * @param dealId - Deal UUID
   * @body Scenario data
   * @returns Created scenario with audit log
   */
  router.post('/:dealId/scenarios', async (req: Request, res: Response) => {
    try {
      const dealId = req.params.dealId;
      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ error: 'Deal not found' });
      }

      console.log('[POST /api/deals/:dealId/scenarios] Request body:', JSON.stringify(req.body, null, 2));
      const data = insertDealScenarioSchema.parse({ ...req.body, dealId });
      const scenario = await storage.createScenario(data);

      // Create audit log only if we have a valid userId
      if (deal.salespersonId) {
        await storage.createAuditLog({
          dealId,
          scenarioId: scenario.id,
          userId: deal.salespersonId,
          action: 'create',
          entityType: 'scenario',
          entityId: scenario.id,
          metadata: { scenarioType: scenario.scenarioType, name: scenario.name },
        });
      } else {
        console.warn('[POST /api/deals/:dealId/scenarios] Skipping audit log - deal has no salespersonId');
      }

      res.status(201).json(scenario);
    } catch (error: any) {
      console.error('[POST /api/deals/:dealId/scenarios] Error:', error);
      console.error('[POST /api/deals/:dealId/scenarios] Request body was:', req.body);
      res.status(400).json({ error: error.message || 'Failed to create scenario' });
    }
  });

  /**
   * PATCH /api/deals/:dealId/scenarios/:scenarioId
   * Update deal scenario
   *
   * @param dealId - Deal UUID
   * @param scenarioId - Scenario UUID
   * @body Partial scenario data
   * @returns Updated scenario with audit logs
   */
  router.patch('/:dealId/scenarios/:scenarioId', async (req: Request, res: Response) => {
    try {
      const { dealId, scenarioId } = req.params;
      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ error: 'Deal not found' });
      }

      const oldScenario = await storage.getScenario(scenarioId);
      if (!oldScenario) {
        return res.status(404).json({ error: 'Scenario not found' });
      }

      const scenario = await storage.updateScenario(scenarioId, req.body);

      // Create audit log for significant changes
      const significantFields = ['vehicleId', 'tradeVehicleId', 'vehiclePrice', 'apr', 'term', 'moneyFactor', 'residualValue', 'downPayment', 'tradeAllowance', 'tradePayoff'];
      for (const field of significantFields) {
        if (req.body[field] !== undefined && String((oldScenario as any)[field]) !== String((scenario as any)[field])) {
          await storage.createAuditLog({
            dealId,
            scenarioId: scenario.id,
            userId: deal.salespersonId,
            action: 'update',
            entityType: 'scenario',
            entityId: scenario.id,
            fieldName: field,
            oldValue: String((oldScenario as any)[field] || ''),
            newValue: String((scenario as any)[field] || ''),
          });
        }
      }

      res.json(scenario);
    } catch (error: any) {
      console.error('[PATCH /api/deals/:dealId/scenarios/:scenarioId] Error:', error);
      res.status(400).json({ error: error.message || 'Failed to update scenario' });
    }
  });

  /**
   * DELETE /api/deals/:dealId/scenarios/:scenarioId
   * Delete deal scenario
   *
   * @param dealId - Deal UUID
   * @param scenarioId - Scenario UUID
   * @returns 204 No Content on success
   */
  router.delete('/:dealId/scenarios/:scenarioId', async (req: Request, res: Response) => {
    try {
      const { dealId, scenarioId } = req.params;
      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ error: 'Deal not found' });
      }

      await storage.deleteScenario(scenarioId);

      await storage.createAuditLog({
        dealId,
        scenarioId,
        userId: deal.salespersonId,
        action: 'delete',
        entityType: 'scenario',
        entityId: scenarioId,
      });

      res.status(204).send();
    } catch (error: any) {
      console.error('[DELETE /api/deals/:dealId/scenarios/:scenarioId] Error:', error);
      res.status(400).json({ error: error.message || 'Failed to delete scenario' });
    }
  });

  /**
   * POST /api/deals/:dealId/scenarios/:scenarioId/apply-template
   * Apply fee package template to scenario
   *
   * @param dealId - Deal UUID
   * @param scenarioId - Scenario UUID
   * @body templateId - Fee package template UUID
   * @returns Updated scenario with template fees applied
   */
  router.post('/:dealId/scenarios/:scenarioId/apply-template', async (req: Request, res: Response) => {
    try {
      const { dealId, scenarioId } = req.params;
      const { templateId } = applyTemplateSchema.parse(req.body);

      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ error: 'Deal not found' });
      }

      const scenario = await storage.getScenario(scenarioId);
      if (!scenario) {
        return res.status(404).json({ error: 'Scenario not found' });
      }

      const template = await storage.getFeePackageTemplate(templateId);
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      const scenarioDealerFees = Array.isArray(scenario.dealerFees) ? scenario.dealerFees : [];
      const scenarioAccessories = Array.isArray(scenario.accessories) ? scenario.accessories : [];
      const scenarioProducts = Array.isArray(scenario.aftermarketProducts) ? scenario.aftermarketProducts : [];

      const templateDealerFees = Array.isArray(template.dealerFees) ? template.dealerFees : [];
      const templateAccessories = Array.isArray(template.accessories) ? template.accessories : [];
      const templateProducts = Array.isArray(template.aftermarketProducts) ? template.aftermarketProducts : [];

      const updatedScenario = await storage.updateScenario(scenarioId, {
        dealerFees: [...scenarioDealerFees, ...templateDealerFees],
        accessories: [...scenarioAccessories, ...templateAccessories],
        aftermarketProducts: [...scenarioProducts, ...templateProducts],
      });

      await storage.createAuditLog({
        dealId,
        scenarioId,
        userId: deal.salespersonId,
        action: 'apply_template',
        entityType: 'scenario',
        entityId: scenarioId,
        metadata: {
          templateId: template.id,
          templateName: template.name,
          itemsAdded: {
            dealerFees: templateDealerFees.length,
            accessories: templateAccessories.length,
            aftermarketProducts: templateProducts.length,
          }
        },
      });

      res.json(updatedScenario);
    } catch (error: any) {
      console.error('[POST /api/deals/:dealId/scenarios/:scenarioId/apply-template] Error:', error);
      res.status(400).json({ error: error.message || 'Failed to apply template' });
    }
  });

  // ============================================================================
  // AUDIT LOGS
  // ============================================================================

  /**
   * GET /api/deals/:id/audit
   * Get audit log history for deal
   *
   * @param id - Deal UUID
   * @security Multi-tenant isolation enforced
   * @returns Array of audit log entries
   */
  router.get('/:id/audit', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dealershipId = req.user?.dealershipId;
      if (!dealershipId) {
        return res.status(403).json({ error: 'User must belong to a dealership' });
      }

      const deal = await storage.getDeal(req.params.id);
      if (!deal) {
        return res.status(404).json({ error: 'Deal not found' });
      }

      // Verify deal belongs to same dealership as authenticated user
      if (deal.dealershipId !== dealershipId) {
        return res.status(404).json({ error: 'Deal not found' });
      }

      const logs = await storage.getDealAuditLogs(req.params.id);
      res.json(logs);
    } catch (error) {
      console.error('[GET /api/deals/:id/audit] Error:', error);
      res.status(500).json({ error: 'Failed to get audit logs' });
    }
  });

  // ============================================================================
  // PDF GENERATION
  // ============================================================================

  /**
   * POST /api/deals/:id/pdf
   * Generate PDF for deal
   *
   * @param id - Deal UUID
   * @body scenarioId - Optional scenario UUID to include
   * @security Multi-tenant isolation enforced
   * @returns PDF file as binary stream
   */
  router.post('/:id/pdf', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dealershipId = req.user?.dealershipId;
      if (!dealershipId) {
        return res.status(403).json({ error: 'User must belong to a dealership' });
      }

      const deal = await storage.getDeal(req.params.id);
      if (!deal) {
        return res.status(404).json({ error: 'Deal not found' });
      }

      // Verify deal belongs to same dealership as authenticated user
      if (deal.dealershipId !== dealershipId) {
        return res.status(404).json({ error: 'Deal not found' });
      }

      const { scenarioId } = req.body;

      // Import Puppeteer dynamically to avoid loading it on every request
      const puppeteer = await import('puppeteer');

      // Generate PDF using Puppeteer
      const browser = await puppeteer.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();

      // Build HTML content for the deal summary
      const scenario = deal.scenarios?.find((s: any) => s.id === scenarioId) || deal.scenarios?.[0];
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Deal Summary - ${deal.dealNumber || 'Draft'}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      margin: 40px;
      color: #1f2937;
    }
    h1 { font-size: 24px; margin-bottom: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
    h2 { font-size: 18px; margin-top: 30px; margin-bottom: 15px; color: #3b82f6; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background-color: #f3f4f6; font-weight: 600; }
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .summary-box { background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; }
    .summary-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
    .summary-value { font-size: 20px; font-weight: 600; margin-top: 5px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500; }
    .badge-draft { background: #fef3c7; color: #92400e; }
    .badge-approved { background: #d1fae5; color: #065f46; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <h1>Deal Summary: ${deal.dealNumber || 'Draft Deal'}</h1>

  <div class="summary-grid">
    <div class="summary-box">
      <div class="summary-label">Status</div>
      <div class="summary-value">
        <span class="badge badge-${deal.dealState?.toLowerCase() || 'draft'}">${deal.dealState || 'DRAFT'}</span>
      </div>
    </div>
    <div class="summary-box">
      <div class="summary-label">Created</div>
      <div class="summary-value">${new Date(deal.createdAt).toLocaleDateString()}</div>
    </div>
  </div>

  <h2>Customer Information</h2>
  <table>
    <tr><th>Field</th><th>Value</th></tr>
    <tr><td>Name</td><td>${deal.customer?.firstName || ''} ${deal.customer?.lastName || ''}</td></tr>
    <tr><td>Email</td><td>${deal.customer?.email || 'N/A'}</td></tr>
    <tr><td>Phone</td><td>${deal.customer?.phone || 'N/A'}</td></tr>
  </table>

  <h2>Vehicle Information</h2>
  <table>
    <tr><th>Field</th><th>Value</th></tr>
    <tr><td>Vehicle</td><td>${scenario?.vehicle?.year || ''} ${scenario?.vehicle?.make || ''} ${scenario?.vehicle?.model || ''}</td></tr>
    <tr><td>VIN</td><td>${scenario?.vehicle?.vin || 'N/A'}</td></tr>
    <tr><td>Stock #</td><td>${scenario?.vehicle?.stockNumber || 'N/A'}</td></tr>
    <tr><td>Price</td><td>$${scenario?.vehiclePrice?.toLocaleString() || '0'}</td></tr>
  </table>

  ${scenario ? `
  <h2>Scenario: ${scenario.name || 'Default'}</h2>
  <table>
    <tr><th>Field</th><th>Value</th></tr>
    <tr><td>Type</td><td>${scenario.scenarioType || 'N/A'}</td></tr>
    <tr><td>Monthly Payment</td><td>$${scenario.monthlyPayment?.toLocaleString() || '0'}</td></tr>
    <tr><td>Down Payment</td><td>$${scenario.downPayment?.toLocaleString() || '0'}</td></tr>
    <tr><td>Term</td><td>${scenario.term || 'N/A'} months</td></tr>
    <tr><td>APR</td><td>${scenario.apr || 'N/A'}%</td></tr>
  </table>
  ` : ''}

  <div class="footer">
    Generated on ${new Date().toLocaleString()}<br/>
    Autolytiq Desk Studio - Deal Management System
  </div>
</body>
</html>
      `;

      await page.setContent(htmlContent);

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
      });

      await browser.close();

      res.contentType('application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="deal-${deal.dealNumber || deal.id}.pdf"`);
      res.send(pdf);
    } catch (error) {
      console.error('[POST /api/deals/:id/pdf] Error:', error);
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  });

  // ============================================================================
  // LENDER INTEGRATION
  // ============================================================================

  /**
   * GET /api/deals/:id/lenders
   * Get lender history for deal
   *
   * @param id - Deal UUID
   * @returns Lender rate requests and selected lender
   */
  router.get('/:id/lenders', async (req: Request, res: Response) => {
    try {
      const rateRequests = await storage.getRateRequestsByDeal(req.params.id);
      const selected = await storage.getSelectedLenderForDeal(req.params.id);

      res.json({
        rateRequests,
        selectedLender: selected || null,
        totalRequests: rateRequests.length,
        lastRequestedAt: rateRequests[0]?.requestedAt || null,
      });
    } catch (error: any) {
      console.error('[GET /api/deals/:id/lenders] Error:', error);
      res.status(500).json({ error: error.message || 'Failed to get deal lender history' });
    }
  });

  return router;
}
