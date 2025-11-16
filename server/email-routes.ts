/**
 * EMAIL API ROUTES
 *
 * RESTful API endpoints for email management.
 *
 * Endpoints:
 * - GET    /api/email/messages - List emails
 * - GET    /api/email/messages/:id - Get single email
 * - POST   /api/email/send - Send new email
 * - POST   /api/email/drafts - Save draft
 * - PUT    /api/email/messages/:id - Update email (draft)
 * - DELETE /api/email/messages/:id - Delete email
 * - POST   /api/email/messages/:id/read - Mark as read
 * - POST   /api/email/messages/:id/star - Toggle star
 * - POST   /api/email/messages/:id/move - Move to folder
 * - POST   /api/email/bulk/read - Bulk mark as read
 * - POST   /api/email/bulk/delete - Bulk delete
 * - GET    /api/email/folders - List folders
 * - POST   /api/email/folders - Create folder
 * - GET    /api/email/unread-counts - Get unread counts
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
 * POST /api/email/bulk/read
 * Bulk mark as read
 */
router.post("/bulk/read", async (req: Request, res: Response) => {
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
    // STEP 1: Verify webhook signature
    // ========================================================================
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('[Resend Webhook] RESEND_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    // Extract Svix headers
    const svixId = req.headers['svix-id'] as string;
    const svixTimestamp = req.headers['svix-timestamp'] as string;
    const svixSignature = req.headers['svix-signature'] as string;

    if (!svixId || !svixTimestamp || !svixSignature) {
      console.error('[Resend Webhook] Missing Svix headers');
      return res.status(401).json({ error: 'Missing signature headers' });
    }

    // Get raw body for signature verification
    const payload = (req as any).rawBody ? (req as any).rawBody.toString() : JSON.stringify(req.body);

    // Verify the webhook signature
    const wh = new Webhook(webhookSecret);
    let verifiedEvent: any;
    
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

    console.log('[Resend Webhook] ✓ Signature verified. Event:', {
      type: verifiedEvent?.type,
      id: verifiedEvent?.data?.email_id,
      timestamp: new Date().toISOString()
    });

    // ========================================================================
    // STEP 2: Process verified webhook event
    // ========================================================================
    const event = verifiedEvent;
    const eventType = event?.type;
    const eventData = event?.data;

    if (!eventType || !eventData) {
      console.error('[Resend Webhook] Invalid event structure');
      return res.status(400).json({ error: 'Invalid event structure' });
    }

    // Import database dependencies
    const db = await import("./db").then((m) => m.db);
    const { emailMessages } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    const { nanoid } = await import("nanoid");

    // ========================================================================
    // HANDLE INBOUND EMAILS (email.received)
    // ========================================================================
    if (eventType === 'email.received') {
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
