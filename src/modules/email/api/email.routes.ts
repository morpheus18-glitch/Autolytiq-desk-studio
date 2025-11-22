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
// UPDATE INTERFACES
// ============================================================================

/**
 * Email rule update fields
 */
interface EmailRuleUpdate {
  name?: string;
  description?: string;
  priority?: number;
  isActive?: boolean;
  conditions?: unknown;
  actions?: unknown;
  updatedAt?: Date;
}

/**
 * Email label update fields
 */
interface EmailLabelUpdate {
  name?: string;
  color?: string;
  icon?: string;
  showInSidebar?: boolean;
  sortOrder?: number;
  updatedAt?: Date;
}

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

/**
 * GET /api/email/threads/:threadId
 * Get email thread/conversation
 */
router.get('/threads/:threadId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId } = getSessionContext(req);
    const threadId = req.params.threadId;

    // Get thread from database (not in module yet, direct query)
    const { emailMessages } = await import('../../../../shared/schema');
    const { eq, and } = await import('drizzle-orm');
    const db = await import('../../../../server/database/db-service').then((m) => m.db);

    const messages = await db
      .select()
      .from(emailMessages)
      .where(
        and(
          eq(emailMessages.threadId, threadId),
          eq(emailMessages.dealershipId, tenantId)
        )
      )
      .orderBy(emailMessages.sentAt);

    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error('[EmailRoutes] Get thread error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/email/bulk/move-folder
 * Bulk move emails to folder
 */
router.post('/bulk/move-folder', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId } = getSessionContext(req);
    const { emailIds, folder } = req.body;

    if (!Array.isArray(emailIds) || emailIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'emailIds array is required',
      });
    }

    if (!folder) {
      return res.status(400).json({
        success: false,
        error: 'folder is required',
      });
    }

    // Bulk move (not in module yet, direct query)
    const { emailMessages } = await import('../../../../shared/schema');
    const { inArray, eq, and } = await import('drizzle-orm');
    const db = await import('../../../../server/database/db-service').then((m) => m.db);

    await db
      .update(emailMessages)
      .set({ folder, updatedAt: new Date() })
      .where(
        and(
          eq(emailMessages.dealershipId, tenantId),
          inArray(emailMessages.id, emailIds)
        )
      );

    res.json({
      success: true,
      count: emailIds.length,
      message: `${emailIds.length} emails moved to ${folder}`,
    });
  } catch (error) {
    console.error('[EmailRoutes] Bulk move folder error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/email/folders
 * List user's custom folders
 */
router.get('/folders', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getSessionContext(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Get folders (not in module yet, direct query)
    const { emailFolders } = await import('../../../../shared/schema');
    const { eq, and } = await import('drizzle-orm');
    const db = await import('../../../../server/database/db-service').then((m) => m.db);

    const folders = await db
      .select()
      .from(emailFolders)
      .where(
        and(
          eq(emailFolders.userId, userId),
          eq(emailFolders.dealershipId, tenantId)
        )
      )
      .orderBy(emailFolders.sortOrder, emailFolders.name);

    res.json({
      success: true,
      data: folders,
    });
  } catch (error) {
    console.error('[EmailRoutes] Get folders error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/email/folders
 * Create custom folder
 */
router.post('/folders', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getSessionContext(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { name, slug, icon, color, sortOrder } = req.body;

    // Create folder (not in module yet, direct query)
    const { emailFolders } = await import('../../../../shared/schema');
    const db = await import('../../../../server/database/db-service').then((m) => m.db);

    const [folder] = await db
      .insert(emailFolders)
      .values({
        userId,
        dealershipId: tenantId,
        name,
        slug,
        icon,
        color,
        sortOrder: sortOrder || 0,
        isSystem: false,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: folder,
    });
  } catch (error) {
    console.error('[EmailRoutes] Create folder error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/email/sync
 * Manually trigger inbox sync (checks webhook configuration status)
 */
router.post('/sync', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getSessionContext(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Check if Resend webhook is configured
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!webhookSecret || !resendApiKey) {
      return res.status(400).json({
        success: false,
        error:
          'Email service not fully configured. Please set up RESEND_API_KEY and RESEND_WEBHOOK_SECRET in your environment variables.',
        newMessages: 0,
      });
    }

    // Get current unread count as indicator of sync status
    const counts = await emailModule.getUnreadCounts(tenantId, userId);
    const totalUnread = Object.values(counts).reduce(
      (sum: number, count: number) => sum + count,
      0
    );

    res.json({
      success: true,
      message: 'Inbox sync verified. Emails are automatically received via webhooks.',
      newMessages: 0, // Webhooks handle real-time updates
      unreadCount: totalUnread,
      webhookConfigured: true,
    });
  } catch (error) {
    console.error('[EmailRoutes] Sync error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      newMessages: 0,
    });
  }
});

/**
 * GET /api/email/rules
 * List email rules
 */
router.get('/rules', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getSessionContext(req);

    // Get rules (not in module yet, direct query)
    const { emailRules } = await import('../../../../shared/schema');
    const { eq, or, and, isNull } = await import('drizzle-orm');
    const db = await import('../../../../server/database/db-service').then((m) => m.db);

    const rules = await db
      .select()
      .from(emailRules)
      .where(
        and(
          eq(emailRules.dealershipId, tenantId),
          userId
            ? or(eq(emailRules.userId, userId), isNull(emailRules.userId))
            : isNull(emailRules.userId)
        )
      )
      .orderBy(emailRules.priority);

    res.json({ success: true, data: rules });
  } catch (error) {
    console.error('[EmailRoutes] Get rules error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/email/rules
 * Create email rule
 */
router.post('/rules', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getSessionContext(req);

    const { name, description, priority, isActive, conditions, actions } = req.body;

    // Create rule (not in module yet, direct query)
    const { emailRules } = await import('../../../../shared/schema');
    const db = await import('../../../../server/database/db-service').then((m) => m.db);

    const [rule] = await db
      .insert(emailRules)
      .values({
        dealershipId: tenantId,
        userId,
        name,
        description,
        priority: priority || 0,
        isActive: isActive !== false,
        conditions: conditions || {},
        actions: actions || {},
      })
      .returning();

    res.status(201).json({ success: true, data: rule });
  } catch (error) {
    console.error('[EmailRoutes] Create rule error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * PATCH /api/email/rules/:id
 * Update email rule
 */
router.patch('/rules/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getSessionContext(req);

    const updates: EmailRuleUpdate = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.priority !== undefined) updates.priority = req.body.priority;
    if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;
    if (req.body.conditions !== undefined) updates.conditions = req.body.conditions;
    if (req.body.actions !== undefined) updates.actions = req.body.actions;
    updates.updatedAt = new Date();

    // Update rule (not in module yet, direct query)
    const { emailRules } = await import('../../../../shared/schema');
    const { eq, and } = await import('drizzle-orm');
    const db = await import('../../../../server/database/db-service').then((m) => m.db);

    const [rule] = await db
      .update(emailRules)
      .set(updates)
      .where(
        and(
          eq(emailRules.id, req.params.id),
          eq(emailRules.dealershipId, tenantId),
          ...(userId ? [eq(emailRules.userId, userId)] : [])
        )
      )
      .returning();

    if (!rule) {
      return res.status(404).json({ success: false, error: 'Rule not found' });
    }

    res.json({ success: true, data: rule });
  } catch (error) {
    console.error('[EmailRoutes] Update rule error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * DELETE /api/email/rules/:id
 * Delete email rule
 */
router.delete('/rules/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getSessionContext(req);

    // Delete rule (not in module yet, direct query)
    const { emailRules } = await import('../../../../shared/schema');
    const { eq, and } = await import('drizzle-orm');
    const db = await import('../../../../server/database/db-service').then((m) => m.db);

    await db
      .delete(emailRules)
      .where(
        and(
          eq(emailRules.id, req.params.id),
          eq(emailRules.dealershipId, tenantId),
          ...(userId ? [eq(emailRules.userId, userId)] : [])
        )
      );

    res.json({ success: true, message: 'Rule deleted' });
  } catch (error) {
    console.error('[EmailRoutes] Delete rule error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/email/labels
 * List email labels
 */
router.get('/labels', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getSessionContext(req);

    // Get labels (not in module yet, direct query)
    const { emailLabels } = await import('../../../../shared/schema');
    const { eq, or, and, isNull } = await import('drizzle-orm');
    const db = await import('../../../../server/database/db-service').then((m) => m.db);

    const labels = await db
      .select()
      .from(emailLabels)
      .where(
        and(
          eq(emailLabels.dealershipId, tenantId),
          userId
            ? or(eq(emailLabels.userId, userId), isNull(emailLabels.userId))
            : isNull(emailLabels.userId)
        )
      )
      .orderBy(emailLabels.sortOrder);

    res.json({ success: true, data: labels });
  } catch (error) {
    console.error('[EmailRoutes] Get labels error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/email/labels
 * Create email label
 */
router.post('/labels', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getSessionContext(req);

    const { name, color, icon, showInSidebar, sortOrder } = req.body;

    // Create label (not in module yet, direct query)
    const { emailLabels } = await import('../../../../shared/schema');
    const db = await import('../../../../server/database/db-service').then((m) => m.db);

    const [label] = await db
      .insert(emailLabels)
      .values({
        dealershipId: tenantId,
        userId,
        name,
        color: color || '#3b82f6',
        icon,
        showInSidebar: showInSidebar !== false,
        sortOrder: sortOrder || 0,
      })
      .returning();

    res.status(201).json({ success: true, data: label });
  } catch (error) {
    console.error('[EmailRoutes] Create label error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * PATCH /api/email/labels/:id
 * Update email label
 */
router.patch('/labels/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getSessionContext(req);

    const updates: EmailLabelUpdate = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.color !== undefined) updates.color = req.body.color;
    if (req.body.icon !== undefined) updates.icon = req.body.icon;
    if (req.body.showInSidebar !== undefined)
      updates.showInSidebar = req.body.showInSidebar;
    if (req.body.sortOrder !== undefined) updates.sortOrder = req.body.sortOrder;
    updates.updatedAt = new Date();

    // Update label (not in module yet, direct query)
    const { emailLabels } = await import('../../../../shared/schema');
    const { eq, and } = await import('drizzle-orm');
    const db = await import('../../../../server/database/db-service').then((m) => m.db);

    const [label] = await db
      .update(emailLabels)
      .set(updates)
      .where(
        and(
          eq(emailLabels.id, req.params.id),
          eq(emailLabels.dealershipId, tenantId),
          ...(userId ? [eq(emailLabels.userId, userId)] : [])
        )
      )
      .returning();

    if (!label) {
      return res.status(404).json({ success: false, error: 'Label not found' });
    }

    res.json({ success: true, data: label });
  } catch (error) {
    console.error('[EmailRoutes] Update label error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * DELETE /api/email/labels/:id
 * Delete email label
 */
router.delete('/labels/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getSessionContext(req);

    // Delete label (not in module yet, direct query)
    const { emailLabels } = await import('../../../../shared/schema');
    const { eq, and } = await import('drizzle-orm');
    const db = await import('../../../../server/database/db-service').then((m) => m.db);

    await db
      .delete(emailLabels)
      .where(
        and(
          eq(emailLabels.id, req.params.id),
          eq(emailLabels.dealershipId, tenantId),
          ...(userId ? [eq(emailLabels.userId, userId)] : [])
        )
      );

    res.json({ success: true, message: 'Label deleted' });
  } catch (error) {
    console.error('[EmailRoutes] Delete label error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/email/messages/:id/labels
 * Add label to email
 */
router.post('/messages/:id/labels', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = getSessionContext(req);
    const { labelId } = req.body;

    // Add label (not in module yet, direct query)
    const { emailMessageLabels } = await import('../../../../shared/schema');
    const db = await import('../../../../server/database/db-service').then((m) => m.db);

    const [messageLabel] = await db
      .insert(emailMessageLabels)
      .values({
        emailMessageId: req.params.id,
        labelId,
        isAutoApplied: false,
        appliedBy: userId,
      })
      .returning();

    res.status(201).json({ success: true, data: messageLabel });
  } catch (error) {
    console.error('[EmailRoutes] Add label error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * DELETE /api/email/messages/:id/labels/:labelId
 * Remove label from email
 */
router.delete(
  '/messages/:id/labels/:labelId',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      // Remove label (not in module yet, direct query)
      const { emailMessageLabels } = await import('../../../../shared/schema');
      const { eq, and } = await import('drizzle-orm');
      const db = await import('../../../../server/database/db-service').then((m) => m.db);

      await db
        .delete(emailMessageLabels)
        .where(
          and(
            eq(emailMessageLabels.emailMessageId, req.params.id),
            eq(emailMessageLabels.labelId, req.params.labelId)
          )
        );

      res.json({ success: true, message: 'Label removed' });
    } catch (error) {
      console.error('[EmailRoutes] Remove label error:', error);

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

export default router;
