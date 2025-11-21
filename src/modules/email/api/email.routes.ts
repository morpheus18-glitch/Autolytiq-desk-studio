/**
 * EMAIL API ROUTES - USING ISOLATED EMAIL MODULE
 *
 * All routes use the email module's public API.
 * NO direct imports from email services.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import emailModule from '../index';
import {
  SendEmailRequestSchema,
  SaveDraftRequestSchema,
  EmailListQuerySchema,
  EmailModuleError,
  EmailErrorCode,
} from '../types/email.types';

const router = Router();

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Extract tenant and user from session
 */
function getSessionContext(req: Request): {
  tenantId: string;
  userId: string | null;
} {
  // @ts-ignore - User from session middleware
  const userId = req.user?.id || null;
  // @ts-ignore
  const tenantId = req.user?.dealershipId || 'default';

  return { tenantId, userId };
}

/**
 * Require authentication
 */
function requireAuth(req: Request, res: Response, next: Function) {
  const { userId } = getSessionContext(req);

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
  }

  next();
}

// ============================================================================
// EMAIL ROUTES
// ============================================================================

/**
 * POST /api/email/send
 * Send new email
 */
router.post('/send', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getSessionContext(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Validate request
    const emailData = SendEmailRequestSchema.parse(req.body);

    // Send via module
    const result = await emailModule.sendEmail(tenantId, userId, emailData);

    res.status(200).json(result);
  } catch (error) {
    console.error('[EmailRoutes] Send email error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    if (error instanceof EmailModuleError) {
      const statusCode =
        error.code === EmailErrorCode.UNAUTHORIZED
          ? 401
          : error.code === EmailErrorCode.NOT_FOUND
          ? 404
          : error.code === EmailErrorCode.RATE_LIMIT_EXCEEDED
          ? 429
          : 500;

      return res.status(statusCode).json({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/email/drafts
 * Save draft
 */
router.post('/drafts', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getSessionContext(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Validate request
    const draftData = SaveDraftRequestSchema.parse(req.body);

    // Save via module
    const draft = await emailModule.saveDraft(tenantId, userId, draftData);

    res.status(200).json({
      success: true,
      data: draft,
    });
  } catch (error) {
    console.error('[EmailRoutes] Save draft error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    if (error instanceof EmailModuleError) {
      return res.status(500).json({
        success: false,
        error: error.message,
        code: error.code,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/email/messages
 * List emails
 */
router.get('/messages', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getSessionContext(req);

    // Parse query params
    const query = EmailListQuerySchema.parse({
      folder: req.query.folder,
      status: req.query.status,
      direction: req.query.direction,
      isRead: req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined,
      isStarred: req.query.isStarred === 'true' ? true : req.query.isStarred === 'false' ? false : undefined,
      customerId: req.query.customerId,
      dealId: req.query.dealId,
      search: req.query.search as string | undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      offset: req.query.offset ? Number(req.query.offset) : undefined,
      sortBy: req.query.sortBy as 'receivedAt' | 'sentAt' | 'subject' | 'from' | undefined,
      sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
    });

    // Fetch via module
    const result = await emailModule.listEmails(tenantId, userId, query);

    res.json(result);
  } catch (error) {
    console.error('[EmailRoutes] List emails error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/email/messages/:id
 * Get email by ID
 */
router.get('/messages/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getSessionContext(req);
    const emailId = req.params.id;

    // Fetch via module
    const email = await emailModule.getEmailWithAttachments(
      emailId,
      tenantId,
      userId
    );

    if (!email) {
      return res.status(404).json({
        success: false,
        error: 'Email not found',
      });
    }

    res.json({
      success: true,
      data: email,
    });
  } catch (error) {
    console.error('[EmailRoutes] Get email error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/email/messages/:id/read
 * Mark email as read/unread
 */
router.post('/messages/:id/read', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getSessionContext(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const emailId = req.params.id;
    const { isRead } = req.body;

    // Update via module
    const email = await emailModule.markAsRead(emailId, tenantId, userId, isRead);

    res.json({
      success: true,
      data: email,
    });
  } catch (error) {
    console.error('[EmailRoutes] Mark as read error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/email/messages/:id/star
 * Toggle star on email
 */
router.post('/messages/:id/star', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getSessionContext(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const emailId = req.params.id;
    const { isStarred } = req.body;

    // Update via module
    const email = await emailModule.toggleStar(emailId, tenantId, userId, isStarred);

    res.json({
      success: true,
      data: email,
    });
  } catch (error) {
    console.error('[EmailRoutes] Toggle star error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/email/messages/:id/move
 * Move email to folder
 */
router.post('/messages/:id/move', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId } = getSessionContext(req);
    const emailId = req.params.id;
    const { folder } = req.body;

    if (!folder) {
      return res.status(400).json({
        success: false,
        error: 'Folder is required',
      });
    }

    // Update via module
    const email = await emailModule.moveToFolder(emailId, tenantId, folder);

    res.json({
      success: true,
      data: email,
    });
  } catch (error) {
    console.error('[EmailRoutes] Move email error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * DELETE /api/email/messages/:id
 * Delete email
 */
router.delete('/messages/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getSessionContext(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const emailId = req.params.id;
    const permanent = req.query.permanent === 'true';

    // Delete via module
    const success = await emailModule.deleteEmail(
      emailId,
      tenantId,
      userId,
      permanent
    );

    res.json({
      success: true,
      message: permanent ? 'Email deleted permanently' : 'Email moved to trash',
    });
  } catch (error) {
    console.error('[EmailRoutes] Delete email error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/email/bulk/mark-read
 * Bulk mark as read/unread
 */
router.post('/bulk/mark-read', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId } = getSessionContext(req);
    const { emailIds, isRead } = req.body;

    if (!Array.isArray(emailIds) || emailIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'emailIds array is required',
      });
    }

    // Bulk update via module
    const count = await emailModule.bulkMarkAsRead(emailIds, tenantId, isRead);

    res.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error('[EmailRoutes] Bulk mark as read error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/email/bulk/delete
 * Bulk delete emails
 */
router.post('/bulk/delete', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId } = getSessionContext(req);
    const { emailIds, permanent } = req.body;

    if (!Array.isArray(emailIds) || emailIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'emailIds array is required',
      });
    }

    // Bulk delete via module
    const count = await emailModule.bulkDelete(emailIds, tenantId, permanent);

    res.json({
      success: true,
      count,
      message: permanent
        ? `${count} emails deleted permanently`
        : `${count} emails moved to trash`,
    });
  } catch (error) {
    console.error('[EmailRoutes] Bulk delete error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/email/stats
 * Get email statistics
 */
router.get('/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getSessionContext(req);

    const stats = await emailModule.getStats(tenantId, userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[EmailRoutes] Get stats error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/email/unread-counts
 * Get unread counts by folder
 */
router.get('/unread-counts', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getSessionContext(req);

    const counts = await emailModule.getUnreadCounts(tenantId, userId);

    res.json({
      success: true,
      data: counts,
    });
  } catch (error) {
    console.error('[EmailRoutes] Get unread counts error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/email/queue/stats
 * Get queue statistics
 */
router.get('/queue/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const stats = emailModule.getQueueStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[EmailRoutes] Get queue stats error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
