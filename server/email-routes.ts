/**
 * EMAIL API ROUTES
 *
 * RESTful API endpoints for comprehensive email management.
 *
 * MESSAGE ENDPOINTS:
 * - GET    /api/email/messages - List emails with filters
 * - GET    /api/email/messages/:id - Get single email
 * - POST   /api/email/send - Send new email
 * - POST   /api/email/drafts - Save draft
 * - DELETE /api/email/messages/:id - Delete email
 * - POST   /api/email/messages/:id/read - Mark as read
 * - POST   /api/email/messages/:id/star - Toggle star
 * - POST   /api/email/messages/:id/move - Move to folder
 *
 * BULK OPERATIONS:
 * - POST   /api/email/bulk/mark-read - Bulk mark as read/unread
 * - POST   /api/email/bulk/delete - Bulk delete emails
 * - POST   /api/email/bulk/move-folder - Bulk move to folder
 *
 * RULES & FILTERS:
 * - GET    /api/email/rules - List email rules
 * - POST   /api/email/rules - Create email rule
 * - PATCH  /api/email/rules/:id - Update email rule
 * - DELETE /api/email/rules/:id - Delete email rule
 *
 * LABELS & CATEGORIES:
 * - GET    /api/email/labels - List email labels
 * - POST   /api/email/labels - Create email label
 * - PATCH  /api/email/labels/:id - Update email label
 * - DELETE /api/email/labels/:id - Delete email label
 * - POST   /api/email/messages/:id/labels - Add label to email
 * - DELETE /api/email/messages/:id/labels/:labelId - Remove label from email
 *
 * FOLDERS & COUNTS:
 * - GET    /api/email/folders - List custom folders
 * - POST   /api/email/folders - Create custom folder
 * - GET    /api/email/unread-counts - Get unread counts by folder
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { Webhook } from "svix";
import {
  sendEmailMessage,
  saveDraft,
  listEmails,
  getEmailById,
  getEmailWithAttachments,
  getEmailThread,
  markAsRead,
  toggleStar,
  moveToFolder,
  deleteEmail,
  bulkMarkAsRead,
  bulkDelete,
  getUserFolders,
  createFolder,
  getUnreadCounts,
  type SendEmailOptions,
} from "./email-service";
import {
  checkEmailSecurity,
  checkRateLimit,
  logSecurityEvent,
  sanitizeSearchQuery,
  validateUUID,
} from "./email-security";
import { getVerifiedFromEmail } from "./email-config";

const router = Router();
const publicRouter = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const emailAddressSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

const sendEmailSchema = z.object({
  to: z.array(emailAddressSchema).min(1),
  cc: z.array(emailAddressSchema).optional(),
  bcc: z.array(emailAddressSchema).optional(),
  subject: z.string().min(1),
  htmlBody: z.string().optional(),
  textBody: z.string().optional(),
  replyTo: z.string().email().optional(),
  customerId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  attachments: z
    .array(
      z.object({
        filename: z.string(),
        content: z.string(),
        contentType: z.string(),
      })
    )
    .optional(),
});

const saveDraftSchema = sendEmailSchema.partial().extend({
  draftId: z.string().uuid().optional(),
});

const listEmailsSchema = z.object({
  folder: z.string().optional(),
  customerId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  isRead: z.boolean().optional(),
  isStarred: z.boolean().optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
  search: z.string().optional(),
});

const createFolderSchema = z.object({
  name: z.string().min(1).max(50),
  slug: z.string().min(1).max(50),
  icon: z.string().optional(),
  color: z.string().optional(),
  sortOrder: z.number().optional(),
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/email/messages
 * List emails with filters and pagination
 */
router.get("/messages", async (req: Request, res: Response) => {
  try {
    // @ts-ignore - User from session
    const userId = req.user?.id;
    // @ts-ignore
    const dealershipId = req.user?.dealershipId || "default";

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    // SECURITY: Validate UUIDs and sanitize search query
    const customerId = req.query.customerId as string | undefined;
    const dealId = req.query.dealId as string | undefined;
    const searchQuery = req.query.search as string | undefined;

    if (customerId && !validateUUID(customerId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid customerId format",
      });
    }

    if (dealId && !validateUUID(dealId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid dealId format",
      });
    }

    const queryParams = {
      folder: req.query.folder as string | undefined,
      customerId,
      dealId,
      isRead: req.query.isRead === "true" ? true : req.query.isRead === "false" ? false : undefined,
      isStarred: req.query.isStarred === "true" ? true : req.query.isStarred === "false" ? false : undefined,
      limit: req.query.limit ? Number(req.query.limit) : 50,
      offset: req.query.offset ? Number(req.query.offset) : 0,
      search: searchQuery ? sanitizeSearchQuery(searchQuery) : undefined,
    };

    const result = await listEmails({
      dealershipId,
      userId,
      ...queryParams,
    });

    res.json({
      success: true,
      data: result.messages,
      total: result.total,
      limit: queryParams.limit,
      offset: queryParams.offset,
    });
  } catch (error) {
    console.error("[EmailRoutes] Error listing emails:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/email/messages/:id
 * Get single email by ID with attachments
 */
router.get("/messages/:id", async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const dealershipId = req.user?.dealershipId || "default";

    // SECURITY: Validate UUID
    if (!validateUUID(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid email ID format",
      });
    }

    const email = await getEmailWithAttachments(req.params.id, dealershipId);

    if (!email) {
      return res.status(404).json({
        success: false,
        error: "Email not found",
      });
    }

    res.json({
      success: true,
      data: email,
    });
  } catch (error) {
    console.error("[EmailRoutes] Error fetching email:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/email/threads/:threadId
 * Get email thread/conversation
 */
router.get("/threads/:threadId", async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const dealershipId = req.user?.dealershipId || "default";

    const messages = await getEmailThread(req.params.threadId, dealershipId);

    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error("[EmailRoutes] Error fetching thread:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/email/send
 * Send new email with comprehensive security checks
 */
router.post("/send", async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    // @ts-ignore
    const dealershipId = req.user?.dealershipId || "default";

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    // SECURITY LAYER 1: Rate Limiting
    const rateLimit = checkRateLimit(userId, "send", {
      maxRequests: 50, // 50 emails per hour
      windowMs: 60 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      logSecurityEvent({
        timestamp: new Date(),
        userId,
        dealershipId,
        action: "email_send_rate_limited",
        severity: "medium",
        details: { retryAfter: rateLimit.retryAfter },
      });

      return res.status(429).json({
        success: false,
        error: "Rate limit exceeded",
        retryAfter: rateLimit.retryAfter,
      });
    }

    // SECURITY LAYER 2: Input Validation
    const data = sendEmailSchema.parse(req.body);

    // Get verified FROM address from Resend connection
    const verifiedFromAddress = await getVerifiedFromEmail();

    // SECURITY LAYER 3: Comprehensive Security Check
    const securityCheck = checkEmailSecurity({
      subject: data.subject,
      htmlBody: data.htmlBody,
      textBody: data.textBody,
      fromAddress: verifiedFromAddress, // Your verified sender from Resend
      toAddresses: data.to,
    });

    // Block if security check fails
    if (!securityCheck.safe) {
      logSecurityEvent({
        timestamp: new Date(),
        userId,
        dealershipId,
        action: "email_send_blocked",
        severity: "high",
        details: {
          reasons: securityCheck.blockedReasons,
          phishingScore: securityCheck.phishingAnalysis.score,
          phishingFlags: securityCheck.phishingAnalysis.flags,
        },
      });

      return res.status(400).json({
        success: false,
        error: "Email blocked for security reasons",
        reasons: securityCheck.blockedReasons,
      });
    }

    // Log warnings if any
    if (securityCheck.warnings.length > 0) {
      logSecurityEvent({
        timestamp: new Date(),
        userId,
        dealershipId,
        action: "email_send_warning",
        severity: "low",
        details: {
          warnings: securityCheck.warnings,
          phishingScore: securityCheck.phishingAnalysis.score,
        },
      });
    }

    // SECURITY LAYER 4: Use sanitized content
    const message = await sendEmailMessage({
      dealershipId,
      userId,
      ...data,
      htmlBody: securityCheck.sanitizedHtml,
      textBody: securityCheck.sanitizedText,
    });

    // Log successful send
    logSecurityEvent({
      timestamp: new Date(),
      userId,
      dealershipId,
      action: "email_sent",
      severity: "low",
      details: {
        emailId: message.id,
        to: data.to.map(t => t.email),
        subject: data.subject,
      },
    });

    res.status(201).json({
      success: true,
      data: message,
      warnings: securityCheck.warnings.length > 0 ? securityCheck.warnings : undefined,
    });
  } catch (error) {
    console.error("[EmailRoutes] Error sending email:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        errors: error.errors.map((e) => e.message),
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/email/drafts
 * Save draft email
 */
router.post("/drafts", async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    // @ts-ignore
    const dealershipId = req.user?.dealershipId || "default";

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    const data = saveDraftSchema.parse(req.body);

    const message = await saveDraft({
      dealershipId,
      userId,
      ...data,
    });

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error("[EmailRoutes] Error saving draft:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        errors: error.errors.map((e) => e.message),
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * DELETE /api/email/messages/:id
 * Delete email (move to trash or permanent)
 */
router.delete("/messages/:id", async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const dealershipId = req.user?.dealershipId || "default";
    const permanent = req.query.permanent === "true";

    // SECURITY: Validate UUID
    if (!validateUUID(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid email ID format",
      });
    }

    const success = await deleteEmail(req.params.id, dealershipId, permanent);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: "Email not found",
      });
    }

    res.json({
      success: true,
      message: permanent ? "Email deleted permanently" : "Email moved to trash",
    });
  } catch (error) {
    console.error("[EmailRoutes] Error deleting email:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/email/messages/:id/read
 * Mark email as read/unread
 */
router.post("/messages/:id/read", async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const dealershipId = req.user?.dealershipId || "default";
    const { isRead } = req.body;

    // SECURITY: Validate UUID
    if (!validateUUID(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid email ID format",
      });
    }

    const message = await markAsRead(req.params.id, dealershipId, isRead);

    if (!message) {
      return res.status(404).json({
        success: false,
        error: "Email not found",
      });
    }

    res.json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error("[EmailRoutes] Error marking as read:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/email/messages/:id/star
 * Toggle star on email
 */
router.post("/messages/:id/star", async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const dealershipId = req.user?.dealershipId || "default";
    const { isStarred } = req.body;

    // SECURITY: Validate UUID
    if (!validateUUID(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid email ID format",
      });
    }

    const message = await toggleStar(req.params.id, dealershipId, isStarred);

    if (!message) {
      return res.status(404).json({
        success: false,
        error: "Email not found",
      });
    }

    res.json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error("[EmailRoutes] Error toggling star:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/email/messages/:id/move
 * Move email to folder
 */
router.post("/messages/:id/move", async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const dealershipId = req.user?.dealershipId || "default";
    const { folder } = req.body;

    // SECURITY: Validate UUID
    if (!validateUUID(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid email ID format",
      });
    }

    if (!folder) {
      return res.status(400).json({
        success: false,
        error: "Folder is required",
      });
    }

    const message = await moveToFolder(req.params.id, dealershipId, folder);

    if (!message) {
      return res.status(404).json({
        success: false,
        error: "Email not found",
      });
    }

    res.json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error("[EmailRoutes] Error moving email:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/email/bulk/mark-read
 * Bulk mark as read
 */
router.post("/bulk/mark-read", async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const dealershipId = req.user?.dealershipId || "default";
    const { emailIds, isRead } = req.body;

    if (!Array.isArray(emailIds) || emailIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "emailIds array is required",
      });
    }

    const count = await bulkMarkAsRead(emailIds, dealershipId, isRead);

    res.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("[EmailRoutes] Error bulk marking as read:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/email/bulk/delete
 * Bulk delete emails
 */
router.post("/bulk/delete", async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const dealershipId = req.user?.dealershipId || "default";
    const { emailIds, permanent } = req.body;

    if (!Array.isArray(emailIds) || emailIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "emailIds array is required",
      });
    }

    const count = await bulkDelete(emailIds, dealershipId, permanent);

    res.json({
      success: true,
      count,
      message: permanent
        ? `${count} emails deleted permanently`
        : `${count} emails moved to trash`,
    });
  } catch (error) {
    console.error("[EmailRoutes] Error bulk deleting:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/email/bulk/move-folder
 * Bulk move emails to folder
 */
router.post("/bulk/move-folder", async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const dealershipId = req.user?.dealershipId || "default";
    const { emailIds, folder } = req.body;

    if (!Array.isArray(emailIds) || emailIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "emailIds array is required",
      });
    }

    if (!folder) {
      return res.status(400).json({
        success: false,
        error: "folder is required",
      });
    }

    // Import database dependencies
    const db = await import("./db").then((m) => m.db);
    const { emailMessages } = await import("@shared/schema");
    const { inArray, eq, and } = await import("drizzle-orm");

    // Update all emails to the new folder
    const result = await db
      .update(emailMessages)
      .set({ folder, updatedAt: new Date() })
      .where(
        and(
          eq(emailMessages.dealershipId, dealershipId),
          inArray(emailMessages.id, emailIds)
        )
      );

    res.json({
      success: true,
      count: emailIds.length,
      message: `${emailIds.length} emails moved to ${folder}`,
    });
  } catch (error) {
    console.error("[EmailRoutes] Error bulk moving emails:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/email/folders
 * List user's custom folders
 */
router.get("/folders", async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    // @ts-ignore
    const dealershipId = req.user?.dealershipId || "default";

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    const folders = await getUserFolders(userId, dealershipId);

    res.json({
      success: true,
      data: folders,
    });
  } catch (error) {
    console.error("[EmailRoutes] Error fetching folders:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/email/folders
 * Create custom folder
 */
router.post("/folders", async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    // @ts-ignore
    const dealershipId = req.user?.dealershipId || "default";

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    const data = createFolderSchema.parse(req.body);

    const folder = await createFolder({
      ...data,
      userId,
      dealershipId,
      isSystem: false,
    });

    res.status(201).json({
      success: true,
      data: folder,
    });
  } catch (error) {
    console.error("[EmailRoutes] Error creating folder:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        errors: error.errors.map((e) => e.message),
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/email/unread-counts
 * Get unread counts by folder
 */
router.get("/unread-counts", async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    // @ts-ignore
    const dealershipId = req.user?.dealershipId || "default";

    const counts = await getUnreadCounts(dealershipId, userId);

    res.json({
      success: true,
      data: counts,
    });
  } catch (error) {
    console.error("[EmailRoutes] Error fetching unread counts:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/email/sync
 * Manually trigger inbox sync (checks webhook configuration status)
 *
 * Note: Emails are automatically synced via Resend webhooks.
 * This endpoint is for manual refresh and status check.
 */
router.post("/sync", async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    // @ts-ignore
    const dealershipId = req.user?.dealershipId || "default";

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    // Check if Resend webhook is configured
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!webhookSecret || !resendApiKey) {
      return res.status(400).json({
        success: false,
        error: "Email service not fully configured. Please set up RESEND_API_KEY and RESEND_WEBHOOK_SECRET in your environment variables.",
        newMessages: 0,
      });
    }

    // Get current unread count as indicator of sync status
    const counts = await getUnreadCounts(dealershipId, userId);
    const totalUnread = Object.values(counts).reduce((sum: number, count: number) => sum + count, 0);

    // Log the sync request
    logSecurityEvent({
      timestamp: new Date(),
      userId,
      dealershipId,
      action: "email_manual_sync",
      severity: "low",
      details: {
        unreadCount: totalUnread,
      },
    });

    res.json({
      success: true,
      message: "Inbox sync verified. Emails are automatically received via webhooks.",
      newMessages: 0, // Webhooks handle real-time updates
      unreadCount: totalUnread,
      webhookConfigured: true,
    });
  } catch (error) {
    console.error("[EmailRoutes] Error syncing inbox:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      newMessages: 0,
    });
  }
});

/**
 * GET /api/email/rules
 * List email rules
 */
router.get("/rules", async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    // @ts-ignore
    const dealershipId = req.user?.dealershipId || "default";

    const db = await import("./db").then((m) => m.db);
    const { emailRules } = await import("@shared/schema");
    const { eq, or, and, isNull } = await import("drizzle-orm");

    const rules = await db
      .select()
      .from(emailRules)
      .where(
        and(
          eq(emailRules.dealershipId, dealershipId),
          userId ? or(eq(emailRules.userId, userId), isNull(emailRules.userId)) : isNull(emailRules.userId)
        )
      )
      .orderBy(emailRules.priority);

    res.json({ success: true, data: rules });
  } catch (error) {
    console.error("[EmailRoutes] Error fetching rules:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/email/rules
 * Create email rule
 */
router.post("/rules", async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    // @ts-ignore
    const dealershipId = req.user?.dealershipId || "default";

    const db = await import("./db").then((m) => m.db);
    const { emailRules } = await import("@shared/schema");

    const ruleData = {
      dealershipId,
      userId,
      name: req.body.name,
      description: req.body.description,
      priority: req.body.priority || 0,
      isActive: req.body.isActive !== false,
      conditions: req.body.conditions || {},
      actions: req.body.actions || {},
    };

    const [rule] = await db.insert(emailRules).values(ruleData).returning();

    res.status(201).json({ success: true, data: rule });
  } catch (error) {
    console.error("[EmailRoutes] Error creating rule:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * PATCH /api/email/rules/:id
 * Update email rule
 */
router.patch("/rules/:id", async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    // @ts-ignore
    const dealershipId = req.user?.dealershipId || "default";

    const db = await import("./db").then((m) => m.db);
    const { emailRules } = await import("@shared/schema");
    const { eq, and } = await import("drizzle-orm");

    const updates: any = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.priority !== undefined) updates.priority = req.body.priority;
    if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;
    if (req.body.conditions !== undefined) updates.conditions = req.body.conditions;
    if (req.body.actions !== undefined) updates.actions = req.body.actions;
    updates.updatedAt = new Date();

    const [rule] = await db
      .update(emailRules)
      .set(updates)
      .where(
        and(
          eq(emailRules.id, req.params.id),
          eq(emailRules.dealershipId, dealershipId),
          ...(userId ? [eq(emailRules.userId, userId)] : [])
        )
      )
      .returning();

    if (!rule) {
      return res.status(404).json({ success: false, error: "Rule not found" });
    }

    res.json({ success: true, data: rule });
  } catch (error) {
    console.error("[EmailRoutes] Error updating rule:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * DELETE /api/email/rules/:id
 * Delete email rule
 */
router.delete("/rules/:id", async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    // @ts-ignore
    const dealershipId = req.user?.dealershipId || "default";

    const db = await import("./db").then((m) => m.db);
    const { emailRules } = await import("@shared/schema");
    const { eq, and } = await import("drizzle-orm");

    await db
      .delete(emailRules)
      .where(
        and(
          eq(emailRules.id, req.params.id),
          eq(emailRules.dealershipId, dealershipId),
          ...(userId ? [eq(emailRules.userId, userId)] : [])
        )
      );

    res.json({ success: true, message: "Rule deleted" });
  } catch (error) {
    console.error("[EmailRoutes] Error deleting rule:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/email/labels
 * List email labels
 */
router.get("/labels", async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    // @ts-ignore
    const dealershipId = req.user?.dealershipId || "default";

    const db = await import("./db").then((m) => m.db);
    const { emailLabels } = await import("@shared/schema");
    const { eq, or, and, isNull } = await import("drizzle-orm");

    const labels = await db
      .select()
      .from(emailLabels)
      .where(
        and(
          eq(emailLabels.dealershipId, dealershipId),
          userId ? or(eq(emailLabels.userId, userId), isNull(emailLabels.userId)) : isNull(emailLabels.userId)
        )
      )
      .orderBy(emailLabels.sortOrder);

    res.json({ success: true, data: labels });
  } catch (error) {
    console.error("[EmailRoutes] Error fetching labels:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/email/labels
 * Create email label
 */
router.post("/labels", async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    // @ts-ignore
    const dealershipId = req.user?.dealershipId || "default";

    const db = await import("./db").then((m) => m.db);
    const { emailLabels } = await import("@shared/schema");

    const labelData = {
      dealershipId,
      userId,
      name: req.body.name,
      color: req.body.color || "#3b82f6",
      icon: req.body.icon,
      showInSidebar: req.body.showInSidebar !== false,
      sortOrder: req.body.sortOrder || 0,
    };

    const [label] = await db.insert(emailLabels).values(labelData).returning();

    res.status(201).json({ success: true, data: label });
  } catch (error) {
    console.error("[EmailRoutes] Error creating label:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * PATCH /api/email/labels/:id
 * Update email label
 */
router.patch("/labels/:id", async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    // @ts-ignore
    const dealershipId = req.user?.dealershipId || "default";

    const db = await import("./db").then((m) => m.db);
    const { emailLabels } = await import("@shared/schema");
    const { eq, and } = await import("drizzle-orm");

    const updates: any = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.color !== undefined) updates.color = req.body.color;
    if (req.body.icon !== undefined) updates.icon = req.body.icon;
    if (req.body.showInSidebar !== undefined) updates.showInSidebar = req.body.showInSidebar;
    if (req.body.sortOrder !== undefined) updates.sortOrder = req.body.sortOrder;
    updates.updatedAt = new Date();

    const [label] = await db
      .update(emailLabels)
      .set(updates)
      .where(
        and(
          eq(emailLabels.id, req.params.id),
          eq(emailLabels.dealershipId, dealershipId),
          ...(userId ? [eq(emailLabels.userId, userId)] : [])
        )
      )
      .returning();

    if (!label) {
      return res.status(404).json({ success: false, error: "Label not found" });
    }

    res.json({ success: true, data: label });
  } catch (error) {
    console.error("[EmailRoutes] Error updating label:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * DELETE /api/email/labels/:id
 * Delete email label
 */
router.delete("/labels/:id", async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    // @ts-ignore
    const dealershipId = req.user?.dealershipId || "default";

    const db = await import("./db").then((m) => m.db);
    const { emailLabels } = await import("@shared/schema");
    const { eq, and } = await import("drizzle-orm");

    await db
      .delete(emailLabels)
      .where(
        and(
          eq(emailLabels.id, req.params.id),
          eq(emailLabels.dealershipId, dealershipId),
          ...(userId ? [eq(emailLabels.userId, userId)] : [])
        )
      );

    res.json({ success: true, message: "Label deleted" });
  } catch (error) {
    console.error("[EmailRoutes] Error deleting label:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/email/messages/:id/labels
 * Add label to email
 */
router.post("/messages/:id/labels", async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    const { labelId } = req.body;

    const db = await import("./db").then((m) => m.db);
    const { emailMessageLabels } = await import("@shared/schema");

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
    console.error("[EmailRoutes] Error adding label:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * DELETE /api/email/messages/:id/labels/:labelId
 * Remove label from email
 */
router.delete("/messages/:id/labels/:labelId", async (req: Request, res: Response) => {
  try {
    const db = await import("./db").then((m) => m.db);
    const { emailMessageLabels } = await import("@shared/schema");
    const { eq, and } = await import("drizzle-orm");

    await db
      .delete(emailMessageLabels)
      .where(
        and(
          eq(emailMessageLabels.emailMessageId, req.params.id),
          eq(emailMessageLabels.labelId, req.params.labelId)
        )
      );

    res.json({ success: true, message: "Label removed" });
  } catch (error) {
    console.error("[EmailRoutes] Error removing label:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ============================================================================
// WEBHOOK ENDPOINT (PUBLIC - NO AUTH REQUIRED)
// ============================================================================

/**
 * POST /api/webhooks/resend
 * Receive webhook events from Resend for real-time inbox syncing
 * 
 * Events handled:
 * - email.received - NEW EMAIL RECEIVED (creates inbox message)
 * - email.sent - Email was accepted by Resend
 * - email.delivered - Email was delivered to recipient
 * - email.delivery_delayed - Delivery delayed
 * - email.bounced - Email bounced
 * - email.complained - Recipient marked as spam
 * - email.opened - Email was opened
 * - email.clicked - Link in email was clicked
 */
publicRouter.post("/resend", async (req: Request, res: Response) => {
  try {
    // ========================================================================
    // STEP 1: Verify webhook signature (or skip in development)
    // ========================================================================
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    let verifiedEvent: any;

    // Extract Svix headers
    const svixId = req.headers['svix-id'] as string;
    const svixTimestamp = req.headers['svix-timestamp'] as string;
    const svixSignature = req.headers['svix-signature'] as string;

    if (!webhookSecret) {
      // Development mode - skip verification but warn loudly
      console.warn('[Resend Webhook] ⚠️  RESEND_WEBHOOK_SECRET not configured - SKIPPING SIGNATURE VERIFICATION');
      console.warn('[Resend Webhook] ⚠️  Set RESEND_WEBHOOK_SECRET in production for security!');
      verifiedEvent = req.body;
    } else if (!svixId || !svixTimestamp || !svixSignature) {
      // No Svix headers - might be direct inbound email
      console.warn('[Resend Webhook] No Svix headers - processing as direct inbound');
      verifiedEvent = req.body;
    } else {
      // Get raw body for signature verification
      const payload = (req as any).rawBody ? (req as any).rawBody.toString() : JSON.stringify(req.body);

      // Verify the webhook signature
      const wh = new Webhook(webhookSecret);

      try {
        verifiedEvent = wh.verify(payload, {
          'svix-id': svixId,
          'svix-timestamp': svixTimestamp,
          'svix-signature': svixSignature,
        });
      } catch (err) {
        console.error('[Resend Webhook] Signature verification failed:', err);
        return res.status(401).json({ error: 'Invalid signature' });
      }

      console.log('[Resend Webhook] ✓ Signature verified');
    }

    console.log('[Resend Webhook] Processing event:', {
      type: verifiedEvent?.type,
      from: verifiedEvent?.from || verifiedEvent?.data?.from,
      subject: verifiedEvent?.subject || verifiedEvent?.data?.subject,
      timestamp: new Date().toISOString()
    });

    // ========================================================================
    // STEP 2: Process verified webhook event
    // ========================================================================
    const event = verifiedEvent;

    // Import database dependencies
    const db = await import("./db").then((m) => m.db);
    const { emailMessages } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    const { nanoid } = await import("nanoid");

    // ========================================================================
    // HANDLE INBOUND EMAILS
    // Resend inbound can send as:
    // 1. Direct email object (from, to, subject, html, text)
    // 2. Wrapped event { type: 'email.received', data: {...} }
    // ========================================================================

    // Check if this is a direct inbound email (has from/to/subject at root)
    const isDirectInbound = event?.from && (event?.to || event?.subject);
    const eventType = isDirectInbound ? 'email.received' : event?.type;
    const eventData = isDirectInbound ? event : event?.data;

    if (!eventType && !isDirectInbound) {
      console.error('[Resend Webhook] Invalid event structure:', JSON.stringify(event).slice(0, 200));
      return res.status(400).json({ error: 'Invalid event structure' });
    }

    if (eventType === 'email.received' || isDirectInbound) {
      console.log('[Resend Webhook] Processing inbound email:', {
        from: eventData.from,
        to: eventData.to,
        subject: eventData.subject,
        timestamp: new Date().toISOString()
      });

      try {
        // Helper function to parse email addresses
        const parseEmailAddress = (addr: any): { email: string; name: string | null } => {
          if (!addr) return { email: '', name: null };
          
          // If already structured object { email, name }
          if (typeof addr === 'object' && addr.email) {
            return { email: addr.email, name: addr.name || null };
          }
          
          // If string, parse "Name <email@domain.com>" or "email@domain.com"
          const addrStr = typeof addr === 'string' ? addr : String(addr);
          const match = addrStr.match(/^(.+?)\s*<(.+)>$/);
          return match 
            ? { email: match[2].trim(), name: match[1].trim() }
            : { email: addrStr.trim(), name: null };
        };

        // Parse sender
        const fromParsed = parseEmailAddress(eventData.from);
        const fromAddress = fromParsed.email;
        const fromName = fromParsed.name;

        // Parse recipients
        const toParsed = Array.isArray(eventData.to)
          ? eventData.to.map((addr: any) => parseEmailAddress(addr)).filter((addr: any) => addr.email)
          : eventData.to
            ? [parseEmailAddress(eventData.to)].filter((addr: any) => addr.email)
            : [];

        if (toParsed.length === 0) {
          console.error('[Resend Webhook] No valid recipient addresses');
          return res.status(200).json({ 
            success: false, 
            message: 'No valid recipient addresses' 
          });
        }

        // Parse CC addresses
        const ccParsed = Array.isArray(eventData.cc)
          ? eventData.cc.map((addr: any) => parseEmailAddress(addr)).filter((addr: any) => addr.email)
          : [];

        // Parse BCC addresses
        const bccParsed = Array.isArray(eventData.bcc)
          ? eventData.bcc.map((addr: any) => parseEmailAddress(addr)).filter((addr: any) => addr.email)
          : [];

        // Determine dealership by matching recipient email to dealership email
        const { dealershipSettings } = await import("@shared/schema");
        const recipientEmails = toParsed.map((r: any) => r.email.toLowerCase());
        
        const dealerships = await db
          .select({ 
            id: dealershipSettings.id,
            email: dealershipSettings.email 
          })
          .from(dealershipSettings);

        // Find matching dealership
        let dealershipId: string | null = null;
        for (const d of dealerships) {
          if (d.email && recipientEmails.includes(d.email.toLowerCase())) {
            dealershipId = d.id;
            break;
          }
        }

        // If no match, use the first dealership (fallback for development)
        if (!dealershipId && dealerships.length > 0) {
          dealershipId = dealerships[0].id;
          console.warn('[Resend Webhook] No email match found, using default dealership');
        }

        if (!dealershipId) {
          console.error('[Resend Webhook] No dealership found');
          return res.status(200).json({ 
            success: false, 
            message: 'No dealership configured' 
          });
        }

        // Check for duplicate message (idempotency)
        const messageId = eventData.email_id || eventData.message_id;
        if (messageId) {
          const existing = await db
            .select({ id: emailMessages.id })
            .from(emailMessages)
            .where(eq(emailMessages.messageId, messageId))
            .limit(1);

          if (existing.length > 0) {
            console.log('[Resend Webhook] Duplicate message, skipping:', messageId);
            return res.status(200).json({
              success: true,
              message: 'Duplicate message already processed',
              emailId: existing[0].id
            });
          }
        }

        // Parse timestamps
        const receivedAt = eventData.created_at 
          ? new Date(eventData.created_at)
          : eventData.timestamp
            ? new Date(eventData.timestamp)
            : new Date();

        // Create new email record for received email
        const newEmail = await db.insert(emailMessages).values({
          dealershipId,
          userId: null, // Inbound email has no user initially
          messageId: messageId || nanoid(),
          fromAddress,
          fromName,
          toAddresses: toParsed,
          ccAddresses: ccParsed,
          bccAddresses: bccParsed,
          subject: eventData.subject || '(No Subject)',
          htmlBody: eventData.html || null,
          textBody: eventData.text || null,
          folder: 'inbox',
          isRead: false,
          isStarred: false,
          isDraft: false,
          resendStatus: 'received',
          customerId: null,
          dealId: null,
          receivedAt,
        }).returning();

        console.log('[Resend Webhook] ✓ Created inbound email:', {
          id: newEmail[0]?.id,
          dealershipId,
          from: fromAddress,
          subject: eventData.subject
        });

        return res.status(200).json({
          success: true,
          message: 'Inbound email received',
          emailId: newEmail[0]?.id
        });
      } catch (error) {
        console.error('[Resend Webhook] Error creating inbound email:', error);
        // Always return 200 to prevent Resend retries
        return res.status(200).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Error logged, webhook acknowledged'
        });
      }
    }

    // ========================================================================
    // HANDLE OUTBOUND EMAIL STATUS UPDATES (sent, delivered, bounced, etc.)
    // ========================================================================

    if (!eventData) {
      console.error('[Resend Webhook] No event data for status update');
      return res.status(400).json({ error: 'No event data provided' });
    }

    // Get email ID from event (could be email_id or message_id depending on event type)
    const emailId = eventData.email_id || eventData.message_id;

    if (!emailId) {
      console.error('[Resend Webhook] No email ID in event');
      return res.status(400).json({ error: 'No email ID provided' });
    }

    const emails = await db
      .select()
      .from(emailMessages)
      .where(eq(emailMessages.resendId, emailId))
      .limit(1);

    if (emails.length === 0) {
      console.warn('[Resend Webhook] Email not found in database:', emailId);
      // Return 200 to acknowledge receipt even if we don't have the email
      return res.status(200).json({ received: true, message: 'Email not found' });
    }

    const email = emails[0];

    // Update email status based on event type
    let updates: any = {
      resendStatus: eventType.replace('email.', ''), // sent, delivered, bounced, etc.
    };

    // Set appropriate timestamps
    if (eventType === 'email.delivered') {
      updates.folder = 'sent';
      // eventData may have delivered_at timestamp
    } else if (eventType === 'email.bounced') {
      updates.folder = 'trash';
    } else if (eventType === 'email.complained') {
      updates.folder = 'trash';
    }

    // Update the email in database
    await db
      .update(emailMessages)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(emailMessages.id, email.id));

    console.log('[Resend Webhook] Updated email:', {
      emailId: email.id,
      resendId: emailId,
      eventType,
      updates
    });

    // Log security event for monitoring
    logSecurityEvent({
      timestamp: new Date(),
      userId: email.userId || 'system',
      dealershipId: email.dealershipId,
      action: `email_${eventType.replace('email.', '')}`,
      severity: eventType === 'email.bounced' || eventType === 'email.complained' ? 'medium' : 'low',
      details: {
        emailId: email.id,
        resendId: emailId,
        eventType,
        subject: email.subject,
      },
    });

    // Return 200 to acknowledge successful receipt
    res.status(200).json({
      success: true,
      message: `Processed ${eventType} event`,
      emailId: email.id
    });

  } catch (error) {
    console.error('[Resend Webhook] Error processing webhook:', error);
    
    // Always return 200 to prevent Resend from retrying
    // Log the error but acknowledge receipt
    res.status(200).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Error logged, webhook acknowledged'
    });
  }
});

// Export both routers
// publicRouter: Contains webhook endpoint (no auth required)
// router: Contains all other email routes (auth required)
export default router;
export { publicRouter };
