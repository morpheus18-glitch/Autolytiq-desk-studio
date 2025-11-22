/**
 * CUSTOMER API ROUTES
 * RESTful API endpoints for customer management
 *
 * CRITICAL: Every endpoint enforces multi-tenant isolation via dealershipId
 */

import { Router, type Request, type Response } from 'express';
import { customerService } from '../services/customer.service';
import {
  CreateCustomerRequestSchema,
  UpdateCustomerRequestSchema,
  CustomerListQuerySchema,
  DuplicateSearchSchema,
} from '../types/customer.types';
import { z } from 'zod';

const router = Router();

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Extract dealership ID from authenticated user
 * CRITICAL: This enforces multi-tenant isolation
 */
function getDealershipId(req: Request): string {
  const dealershipId = req.user?.dealershipId;

  if (!dealershipId) {
    throw new Error('User must belong to a dealership');
  }

  return dealershipId;
}

/**
 * Extract user ID from authenticated user
 */
function getUserId(req: Request): string | undefined {
  return req.user?.id;
}

/**
 * Error handler wrapper
 */
function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch (error) {
      console.error('[Customer API]', error);

      // Handle known errors
      if (error.name === 'CustomerNotFoundError') {
        return res.status(404).json({
          error: error.message,
          code: error.code,
        });
      }

      if (error.name === 'CustomerValidationError') {
        return res.status(400).json({
          error: error.message,
          code: error.code,
          validationErrors: error.validationErrors,
        });
      }

      if (error.name === 'DuplicateCustomerError') {
        return res.status(409).json({
          error: error.message,
          code: error.code,
          duplicates: error.duplicates,
        });
      }

      if (error.name === 'CustomerAccessDeniedError') {
        return res.status(403).json({
          error: error.message,
          code: error.code,
        });
      }

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          code: 'VALIDATION_ERROR',
          validationErrors: error.errors,
        });
      }

      // Unknown error
      res.status(500).json({
        error: error.message || 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  };
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/customers
 * Create a new customer
 */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const dealershipId = getDealershipId(req);
    const userId = getUserId(req);

    // Validate request body
    const data = CreateCustomerRequestSchema.parse(req.body);

    // Create customer
    const customer = await customerService.createCustomer(data, dealershipId, userId);

    res.status(201).json(customer);
  })
);

/**
 * GET /api/customers
 * List customers with filtering and pagination
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const dealershipId = getDealershipId(req);

    // Build query from request params
    const query = CustomerListQuerySchema.parse({
      dealershipId,
      status: req.query.status,
      source: req.query.source,
      assignedSalespersonId: req.query.assignedSalespersonId,
      search: req.query.search,
      createdFrom: req.query.createdFrom,
      createdTo: req.query.createdTo,
      lastContactFrom: req.query.lastContactFrom,
      lastContactTo: req.query.lastContactTo,
      needsFollowUp: req.query.needsFollowUp === 'true',
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc',
      includeDeleted: req.query.includeDeleted === 'true',
    });

    // Get customers
    const result = await customerService.listCustomers(query);

    res.json(result);
  })
);

/**
 * GET /api/customers/search
 * Fast customer search
 */
router.get(
  '/search',
  asyncHandler(async (req: Request, res: Response) => {
    const dealershipId = getDealershipId(req);
    const searchQuery = req.query.q as string;

    if (!searchQuery || !searchQuery.trim()) {
      return res.json([]);
    }

    const customers = await customerService.searchCustomers(searchQuery, dealershipId);

    res.json(customers);
  })
);

/**
 * POST /api/customers/find-duplicates
 * Find potential duplicate customers
 */
router.post(
  '/find-duplicates',
  asyncHandler(async (req: Request, res: Response) => {
    const dealershipId = getDealershipId(req);

    // Validate request body
    const search = DuplicateSearchSchema.parse({
      dealershipId,
      ...req.body,
    });

    // Find duplicates
    const duplicates = await customerService.findDuplicates(search);

    res.json(duplicates);
  })
);

/**
 * POST /api/customers/:id/merge
 * Merge duplicate customers
 */
router.post(
  '/:id/merge',
  asyncHandler(async (req: Request, res: Response) => {
    const dealershipId = getDealershipId(req);
    const keepCustomerId = req.params.id;
    const { mergeCustomerIds } = req.body;

    if (!Array.isArray(mergeCustomerIds) || mergeCustomerIds.length === 0) {
      return res.status(400).json({
        error: 'mergeCustomerIds must be a non-empty array',
        code: 'INVALID_REQUEST',
      });
    }

    // Merge customers
    const customer = await customerService.mergeDuplicates(
      keepCustomerId,
      mergeCustomerIds,
      dealershipId
    );

    res.json(customer);
  })
);

/**
 * GET /api/customers/:id
 * Get single customer by ID
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const dealershipId = getDealershipId(req);
    const customerId = req.params.id;

    // Get customer
    const customer = await customerService.getCustomer(customerId, dealershipId);

    res.json(customer);
  })
);

/**
 * PATCH /api/customers/:id
 * Update customer
 */
router.patch(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const dealershipId = getDealershipId(req);
    const customerId = req.params.id;

    // Validate request body
    const data = UpdateCustomerRequestSchema.parse(req.body);

    // Update customer
    const customer = await customerService.updateCustomer(
      customerId,
      dealershipId,
      data
    );

    res.json(customer);
  })
);

/**
 * DELETE /api/customers/:id
 * Delete customer (soft delete)
 */
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const dealershipId = getDealershipId(req);
    const customerId = req.params.id;

    // Delete customer
    await customerService.deleteCustomer(customerId, dealershipId);

    res.status(204).send();
  })
);

/**
 * GET /api/customers/:id/timeline
 * Get customer timeline (deals, emails, interactions)
 */
router.get(
  '/:id/timeline',
  asyncHandler(async (req: Request, res: Response) => {
    const dealershipId = getDealershipId(req);
    const customerId = req.params.id;

    // Get timeline
    const timeline = await customerService.getCustomerTimeline(customerId, dealershipId);

    res.json(timeline);
  })
);

/**
 * GET /api/customers/:id/deals
 * Get customer deals
 */
router.get(
  '/:id/deals',
  asyncHandler(async (req: Request, res: Response) => {
    const dealershipId = getDealershipId(req);
    const customerId = req.params.id;

    // Get deals
    const deals = await customerService.getCustomerDeals(customerId, dealershipId);

    res.json(deals);
  })
);

/**
 * GET /api/customers/:id/emails
 * Get customer emails
 */
router.get(
  '/:id/emails',
  asyncHandler(async (req: Request, res: Response) => {
    const dealershipId = getDealershipId(req);
    const customerId = req.params.id;

    // Get emails
    const emails = await customerService.getCustomerEmails(customerId, dealershipId);

    res.json(emails);
  })
);

/**
 * POST /api/customers/validate
 * Validate customer data without creating
 */
router.post(
  '/validate',
  asyncHandler(async (req: Request, res: Response) => {
    // Validate customer data
    const validation = await customerService.validateCustomer(req.body);

    res.json(validation);
  })
);

/**
 * GET /api/customers/:id/history
 * Get customer history (deals, notes, creation events)
 * Legacy compatibility endpoint
 */
router.get(
  '/:id/history',
  asyncHandler(async (req: Request, res: Response) => {
    const dealershipId = getDealershipId(req);
    const customerId = req.params.id;

    // Get history
    const history = await customerService.getCustomerHistory(customerId, dealershipId);

    res.json(history);
  })
);

/**
 * GET /api/customers/:id/notes
 * Get customer notes
 */
router.get(
  '/:id/notes',
  asyncHandler(async (req: Request, res: Response) => {
    const dealershipId = getDealershipId(req);
    const customerId = req.params.id;

    // Get notes
    const notes = await customerService.getCustomerNotes(customerId, dealershipId);

    res.json(notes);
  })
);

/**
 * POST /api/customers/:id/notes
 * Create customer note
 */
router.post(
  '/:id/notes',
  asyncHandler(async (req: Request, res: Response) => {
    const dealershipId = getDealershipId(req);
    const userId = getUserId(req);
    const customerId = req.params.id;

    if (!userId) {
      return res.status(403).json({
        error: 'User ID is required to create notes',
        code: 'USER_REQUIRED',
      });
    }

    const { content, noteType, isImportant, dealId } = req.body;

    // Create note
    const note = await customerService.createCustomerNote(
      customerId,
      dealershipId,
      userId,
      {
        content,
        noteType,
        isImportant,
        dealId,
      }
    );

    res.status(201).json(note);
  })
);

// ============================================================================
// EXPORT
// ============================================================================

export default router;
