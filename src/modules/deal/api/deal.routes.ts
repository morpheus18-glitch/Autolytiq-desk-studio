/**
 * DEAL API ROUTES
 * Express routes for deal management endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { DealService } from '../services/deal.service';
import {
  createDealSchema,
  updateDealSchema,
  DealError,
  DealNotFoundError,
  DealVersionConflictError,
  InvalidDealStateError,
} from '../types/deal.types';

// ============================================================================
// ROUTE CREATION
// ============================================================================

export function createDealRouter(
  dealService: DealService,
  requireAuth: (req: Request, res: Response, next: NextFunction) => void,
  requireRole: (...roles: string[]) => (req: Request, res: Response, next: NextFunction) => void
) {
  const router = Router();

  // All routes require authentication
  router.use(requireAuth);

  // ============================================================================
  // DEAL CRUD
  // ============================================================================

  /**
   * POST /api/deals
   * Create new deal
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const validation = createDealSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: validation.error.errors,
        });
      }

      const userId = req.user!.id;
      const deal = await dealService.createDeal(validation.data as Omit<Deal, "id" | "createdAt" | "updatedAt">, userId);

      res.status(201).json(deal);
    } catch (error) {
      if (error instanceof DealError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      console.error('Create deal error:', error);
      res.status(500).json({ message: 'Failed to create deal', error: error.message });
    }
  });

  /**
   * GET /api/deals/:id
   * Get deal by ID
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const deal = await dealService.getDeal(req.params.id);
      res.json(deal);
    } catch (error) {
      if (error instanceof DealNotFoundError) {
        return res.status(404).json({ message: error.message });
      }
      console.error('Get deal error:', error);
      res.status(500).json({ message: 'Failed to get deal' });
    }
  });

  /**
   * PUT /api/deals/:id
   * Update deal
   */
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const validation = updateDealSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: validation.error.errors,
        });
      }

      const userId = req.user!.id;
      const deal = await dealService.updateDeal(
        req.params.id,
        validation.data as Omit<Deal, "id" | "createdAt" | "updatedAt">,
        userId
      );

      res.json(deal);
    } catch (error) {
      if (error instanceof DealNotFoundError) {
        return res.status(404).json({ message: error.message });
      }
      if (error instanceof DealVersionConflictError) {
        return res.status(409).json({ message: error.message });
      }
      if (error instanceof InvalidDealStateError) {
        return res.status(400).json({ message: error.message });
      }
      if (error instanceof DealError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      console.error('Update deal error:', error);
      res.status(500).json({ message: 'Failed to update deal', error: error.message });
    }
  });

  /**
   * GET /api/deals
   * List deals with filters
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const query = {
        tenantId: req.user!.dealershipId,
        dealershipId: req.query.dealershipId as string | undefined,
        status: req.query.status as string | undefined,
        type: req.query.type as string | undefined,
        customerId: req.query.customerId as string | undefined,
        vehicleId: req.query.vehicleId as string | undefined,
        salespersonId: req.query.salespersonId as string | undefined,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        search: req.query.search as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        sortBy: (req.query.sortBy as string) || 'createdAt',
        sortOrder: (req.query.sortOrder as "asc" | "desc") || 'desc',
      };

      const result = await dealService.listDeals(query);
      res.json(result);
    } catch (error) {
      console.error('List deals error:', error);
      res.status(500).json({ message: 'Failed to list deals' });
    }
  });

  /**
   * DELETE /api/deals/:id
   * Archive deal
   */
  router.delete('/:id', requireRole('admin', 'sales_manager'), async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const deal = await dealService.archiveDeal(req.params.id, userId);
      res.json(deal);
    } catch (error) {
      if (error instanceof DealNotFoundError) {
        return res.status(404).json({ message: error.message });
      }
      if (error instanceof InvalidDealStateError) {
        return res.status(400).json({ message: error.message });
      }
      console.error('Archive deal error:', error);
      res.status(500).json({ message: 'Failed to archive deal' });
    }
  });

  // ============================================================================
  // DEAL ACTIONS
  // ============================================================================

  /**
   * POST /api/deals/:id/submit
   * Submit deal for approval
   */
  router.post('/:id/submit', async (req: Request, res: Response) => {
    try {
      const deal = await dealService.getDeal(req.params.id);

      if (deal.status !== 'draft') {
        return res.status(400).json({ message: 'Only draft deals can be submitted' });
      }

      const updatedDeal = await dealService.updateDeal(
        req.params.id,
        { status: 'pending', version: deal.version },
        req.user!.id
      );

      res.json(updatedDeal);
    } catch (error) {
      if (error instanceof DealError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      res.status(500).json({ message: 'Failed to submit deal' });
    }
  });

  /**
   * POST /api/deals/:id/approve
   * Approve deal (managers only)
   */
  router.post('/:id/approve', requireRole('admin', 'sales_manager', 'finance_manager'), async (req: Request, res: Response) => {
    try {
      const deal = await dealService.getDeal(req.params.id);

      if (deal.status !== 'pending') {
        return res.status(400).json({ message: 'Only pending deals can be approved' });
      }

      const updatedDeal = await dealService.updateDeal(
        req.params.id,
        { status: 'approved', version: deal.version },
        req.user!.id
      );

      res.json(updatedDeal);
    } catch (error) {
      if (error instanceof DealError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      res.status(500).json({ message: 'Failed to approve deal' });
    }
  });

  /**
   * POST /api/deals/:id/cancel
   * Cancel deal
   */
  router.post('/:id/cancel', async (req: Request, res: Response) => {
    try {
      const deal = await dealService.getDeal(req.params.id);

      if (['delivered', 'archived'].includes(deal.status)) {
        return res.status(400).json({ message: 'Cannot cancel delivered or archived deals' });
      }

      const updatedDeal = await dealService.updateDeal(
        req.params.id,
        { status: 'cancelled', version: deal.version },
        req.user!.id
      );

      res.json(updatedDeal);
    } catch (error) {
      if (error instanceof DealError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      res.status(500).json({ message: 'Failed to cancel deal' });
    }
  });

  return router;
}
