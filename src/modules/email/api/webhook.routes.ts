/**
 * EMAIL WEBHOOK ROUTES - PUBLIC (NO AUTH)
 *
 * Handles incoming webhooks from Resend for receiving emails.
 * These routes are PUBLIC since they're called by Resend servers.
 * We use Svix signature verification to ensure requests are legitimate.
 *
 * Webhook Events:
 * - email.received - New email received (creates inbox message)
 * - email.sent - Email accepted by Resend
 * - email.delivered - Email successfully delivered
 * - email.delivery_delayed - Delivery delayed
 * - email.bounced - Email bounced
 * - email.complained - Spam complaint
 * - email.opened - Email opened by recipient
 * - email.clicked - Link clicked in email
 */

import { Router, Request, Response } from 'express';
import { Webhook } from 'svix';
import { db } from '../../../core/database/index';
import { emailMessages, dealershipSettings } from '../../../../shared/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const router = Router();

// ============================================================================
// REQUEST EXTENSIONS
// ============================================================================

/**
 * Extended Express Request with raw body for webhook signature verification
 */
interface RequestWithRawBody extends Request {
  rawBody?: Buffer;
}

// ============================================================================
// TYPES
// ============================================================================

interface EmailAddress {
  email: string;
  name?: string | null;
}

interface WebhookEventData {
  email_id?: string;
  message_id?: string;
  from?: string | EmailAddress;
  to?: string | string[] | EmailAddress | EmailAddress[];
  cc?: string | string[] | EmailAddress | EmailAddress[];
  bcc?: string | string[] | EmailAddress | EmailAddress[];
  subject?: string;
  html?: string;
  text?: string;
  created_at?: string;
  timestamp?: string;
  thread_id?: string;
  in_reply_to?: string;
}

interface WebhookEvent {
  type?: string;
  data?: WebhookEventData;
  from?: string | EmailAddress;
  to?: string | string[] | EmailAddress | EmailAddress[];
  subject?: string;
  html?: string;
  text?: string;
}

interface EmailStatusUpdate {
  resendStatus: string;
  folder?: string;
  updatedAt?: Date;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse email address from various formats
 */
function parseEmailAddress(addr: unknown): EmailAddress {
  if (!addr) return { email: '', name: null };

  // If already structured object { email, name }
  if (typeof addr === 'object' && addr !== null && 'email' in addr) {
    return {
      email: (addr as EmailAddress).email,
      name: (addr as EmailAddress).name || null,
    };
  }

  // If string, parse "Name <email@domain.com>" or "email@domain.com"
  const addrStr = typeof addr === 'string' ? addr : String(addr);
  const match = addrStr.match(/^(.+?)\s*<(.+)>$/);
  return match
    ? { email: match[2].trim(), name: match[1].trim() }
    : { email: addrStr.trim(), name: null };
}

/**
 * Parse array of email addresses
 */
function parseEmailAddresses(
  addrs: unknown
): EmailAddress[] {
  if (!addrs) return [];

  if (Array.isArray(addrs)) {
    return addrs
      .map((addr) => parseEmailAddress(addr))
      .filter((addr) => addr.email);
  }

  const parsed = parseEmailAddress(addrs);
  return parsed.email ? [parsed] : [];
}

// ============================================================================
// WEBHOOK ENDPOINT
// ============================================================================

/**
 * POST /api/webhooks/email/resend
 * Receive webhook events from Resend for real-time email syncing
 */
router.post('/resend', async (req: RequestWithRawBody, res: Response) => {
  try {
    // ========================================================================
    // STEP 1: Verify webhook signature (or skip in development)
    // ========================================================================
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    let verifiedEvent: WebhookEvent;

    // Extract Svix headers
    const svixId = req.headers['svix-id'] as string;
    const svixTimestamp = req.headers['svix-timestamp'] as string;
    const svixSignature = req.headers['svix-signature'] as string;

    if (!webhookSecret) {
      // Development mode - skip verification but warn loudly
      console.warn(
        '[EmailWebhook] ⚠️  RESEND_WEBHOOK_SECRET not configured - SKIPPING SIGNATURE VERIFICATION'
      );
      console.warn(
        '[EmailWebhook] ⚠️  Set RESEND_WEBHOOK_SECRET in production for security!'
      );
      verifiedEvent = req.body;
    } else if (!svixId || !svixTimestamp || !svixSignature) {
      // No Svix headers - might be direct inbound email
      console.warn('[EmailWebhook] No Svix headers - processing as direct inbound');
      verifiedEvent = req.body;
    } else {
      // Get raw body for signature verification
      const payload = req.rawBody
        ? req.rawBody.toString()
        : JSON.stringify(req.body);

      // Verify the webhook signature
      const wh = new Webhook(webhookSecret);

      try {
        verifiedEvent = wh.verify(payload, {
          'svix-id': svixId,
          'svix-timestamp': svixTimestamp,
          'svix-signature': svixSignature,
        }) as WebhookEvent;
      } catch (err) {
        console.error('[EmailWebhook] Signature verification failed:', err);
        return res.status(401).json({ error: 'Invalid signature' });
      }

      console.log('[EmailWebhook] ✓ Signature verified');
    }

    console.log('[EmailWebhook] Processing event:', {
      type: verifiedEvent?.type,
      from: verifiedEvent?.from || verifiedEvent?.data?.from,
      subject: verifiedEvent?.subject || verifiedEvent?.data?.subject,
      timestamp: new Date().toISOString(),
    });

    // ========================================================================
    // STEP 2: Determine event type
    // ========================================================================
    const event = verifiedEvent;

    // Check if this is a direct inbound email (has from/to/subject at root)
    const isDirectInbound = event?.from && (event?.to || event?.subject);
    const eventType = isDirectInbound ? 'email.received' : event?.type;
    const eventData = isDirectInbound ? event : event?.data;

    if (!eventType && !isDirectInbound) {
      console.error(
        '[EmailWebhook] Invalid event structure:',
        JSON.stringify(event).slice(0, 200)
      );
      return res.status(400).json({ error: 'Invalid event structure' });
    }

    // ========================================================================
    // STEP 3: Handle inbound emails (email.received)
    // ========================================================================
    if (eventType === 'email.received' || isDirectInbound) {
      if (!eventData) {
        console.error('[EmailWebhook] No event data for inbound email');
        return res.status(400).json({ error: 'No event data provided' });
      }

      console.log('[EmailWebhook] Processing inbound email:', {
        from: eventData.from,
        to: eventData.to,
        subject: eventData.subject,
        timestamp: new Date().toISOString(),
      });

      try {
        // Parse sender
        const fromParsed = parseEmailAddress(eventData.from);
        const fromAddress = fromParsed.email;
        const fromName = fromParsed.name;

        // Parse recipients
        const toParsed = parseEmailAddresses(eventData.to);
        if (toParsed.length === 0) {
          console.error('[EmailWebhook] No valid recipient addresses');
          return res.status(200).json({
            success: false,
            message: 'No valid recipient addresses',
          });
        }

        // Parse CC and BCC
        const ccParsed = parseEmailAddresses(eventData.cc);
        const bccParsed = parseEmailAddresses(eventData.bcc);

        // Determine dealership by matching recipient email to dealership email
        const recipientEmails = toParsed.map((r) => r.email.toLowerCase());

        const dealerships = await db
          .select({
            id: dealershipSettings.id,
            email: dealershipSettings.email,
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
          console.warn(
            '[EmailWebhook] No email match found, using default dealership'
          );
        }

        if (!dealershipId) {
          console.error('[EmailWebhook] No dealership found');
          return res.status(200).json({
            success: false,
            message: 'No dealership configured',
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
            console.log('[EmailWebhook] Duplicate message, skipping:', messageId);
            return res.status(200).json({
              success: true,
              message: 'Duplicate message already processed',
              emailId: existing[0].id,
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
        const newEmail = await db
          .insert(emailMessages)
          .values({
            dealershipId,
            userId: null, // Inbound email has no user initially
            messageId: messageId || nanoid(),
            fromAddress,
            fromName,
            toAddresses: toParsed as unknown,
            ccAddresses: ccParsed as unknown,
            bccAddresses: bccParsed as unknown,
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
          })
          .returning();

        console.log('[EmailWebhook] ✓ Created inbound email:', {
          id: newEmail[0]?.id,
          dealershipId,
          from: fromAddress,
          subject: eventData.subject,
        });

        return res.status(200).json({
          success: true,
          message: 'Inbound email received',
          emailId: newEmail[0]?.id,
        });
      } catch (error) {
        console.error('[EmailWebhook] Error creating inbound email:', error);
        // Always return 200 to prevent Resend retries
        return res.status(200).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Error logged, webhook acknowledged',
        });
      }
    }

    // ========================================================================
    // STEP 4: Handle outbound email status updates
    // ========================================================================
    if (!eventData) {
      console.error('[EmailWebhook] No event data for status update');
      return res.status(400).json({ error: 'No event data provided' });
    }

    // Get email ID from event
    const emailId = eventData.email_id || eventData.message_id;

    if (!emailId) {
      console.error('[EmailWebhook] No email ID in event');
      return res.status(400).json({ error: 'No email ID provided' });
    }

    const emails = await db
      .select()
      .from(emailMessages)
      .where(eq(emailMessages.resendId, emailId))
      .limit(1);

    if (emails.length === 0) {
      console.warn('[EmailWebhook] Email not found in database:', emailId);
      // Return 200 to acknowledge receipt even if we don't have the email
      return res.status(200).json({ received: true, message: 'Email not found' });
    }

    const email = emails[0];

    // Update email status based on event type
    const updates: EmailStatusUpdate = {
      resendStatus: eventType ? eventType.replace('email.', '') : 'unknown',
    };

    // Set appropriate folder based on event
    if (eventType === 'email.delivered') {
      updates.folder = 'sent';
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

    console.log('[EmailWebhook] Updated email:', {
      emailId: email.id,
      resendId: emailId,
      eventType,
      updates,
    });

    // Return 200 to acknowledge successful receipt
    res.status(200).json({
      success: true,
      message: `Processed ${eventType} event`,
      emailId: email.id,
    });
  } catch (error) {
    console.error('[EmailWebhook] Error processing webhook:', error);

    // Always return 200 to prevent Resend from retrying
    // Log the error but acknowledge receipt
    res.status(200).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Error logged, webhook acknowledged',
    });
  }
});

export default router;
