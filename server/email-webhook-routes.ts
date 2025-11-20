/**
 * EMAIL WEBHOOK ROUTES
 *
 * Handles incoming webhooks from Resend for receiving emails
 *
 * SECURITY: These routes are public (no auth) since they're called by Resend servers.
 * We use signature verification to ensure requests are legitimate.
 *
 * Webhook Events:
 * - email.received - New email received
 * - email.delivered - Email successfully delivered
 * - email.bounced - Email bounced
 * - email.complained - Spam complaint
 */

import { Router, Request, Response } from "express";
import crypto from "crypto";
import { db } from "./db";
import { emailMessages } from "../shared/schema";
import { sql } from "drizzle-orm";

const router = Router();

// ============================================================================
// WEBHOOK SIGNATURE VERIFICATION
// ============================================================================

/**
 * Verify Resend webhook signature
 * This ensures the request is actually from Resend and not a malicious actor
 */
function verifyResendSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('[EmailWebhook] Signature verification error:', error);
    return false;
  }
}

// ============================================================================
// WEBHOOK ENDPOINTS
// ============================================================================

/**
 * POST /api/webhooks/email/resend
 * Receive incoming emails and events from Resend
 */
router.post("/resend", async (req: Request, res: Response) => {
  try {
    console.log('[EmailWebhook] Received webhook from Resend');

    // Get signature from header
    const signature = req.headers['resend-signature'] as string;
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

    // Verify signature (if secret is configured)
    if (webhookSecret && signature) {
      const isValid = verifyResendSignature(
        JSON.stringify(req.body),
        signature,
        webhookSecret
      );

      if (!isValid) {
        console.error('[EmailWebhook] Invalid signature - rejecting webhook');
        return res.status(401).json({
          success: false,
          error: 'Invalid signature',
        });
      }
    } else if (!webhookSecret) {
      console.warn('[EmailWebhook] No RESEND_WEBHOOK_SECRET configured - skipping signature verification (INSECURE!)');
    }

    const event = req.body;
    console.log('[EmailWebhook] Event type:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'email.received':
        await handleEmailReceived(event.data);
        break;

      case 'email.delivered':
        await handleEmailDelivered(event.data);
        break;

      case 'email.bounced':
        await handleEmailBounced(event.data);
        break;

      case 'email.complained':
        await handleEmailComplained(event.data);
        break;

      default:
        console.log('[EmailWebhook] Unknown event type:', event.type);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[EmailWebhook] Error processing webhook:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Handle incoming email (email.received event)
 */
async function handleEmailReceived(data: any) {
  console.log('[EmailWebhook] Processing received email:', data.id);

  try {
    // Get our verified FROM email to check if this is our own sent email
    const { getVerifiedFromEmail } = await import('./email-config');
    const ourFromEmail = await getVerifiedFromEmail();

    // Skip if this is an email we sent (it's already in sent folder)
    const fromEmail = data.from?.email || data.from;
    if (fromEmail === ourFromEmail) {
      console.log('[EmailWebhook] Skipping our own sent email');
      return;
    }

    // Parse recipients to find which dealership this belongs to
    // For now, use default dealership - you can customize this logic
    const dealershipId = 'default'; // TODO: Map email address to dealership

    // Extract email addresses from to/cc/bcc fields
    const toAddresses = Array.isArray(data.to)
      ? data.to.map((addr: any) => ({ email: addr.email || addr, name: addr.name }))
      : [{ email: data.to }];

    const ccAddresses = data.cc
      ? (Array.isArray(data.cc) ? data.cc : [data.cc]).map((addr: any) => ({ email: addr.email || addr, name: addr.name }))
      : [];

    const bccAddresses = data.bcc
      ? (Array.isArray(data.bcc) ? data.bcc : [data.bcc]).map((addr: any) => ({ email: addr.email || addr, name: addr.name }))
      : [];

    // Save to database (only real incoming emails)
    await db.insert(emailMessages).values({
      dealershipId,
      messageId: data.id || data.message_id,
      threadId: data.thread_id,
      inReplyTo: data.in_reply_to,
      fromAddress: data.from?.email || data.from,
      fromName: data.from?.name || data.from_name,
      toAddresses: toAddresses as any,
      ccAddresses: ccAddresses as any,
      bccAddresses: bccAddresses as any,
      replyTo: data.reply_to,
      subject: data.subject || '(no subject)',
      htmlBody: data.html,
      textBody: data.text,
      folder: 'inbox',
      isRead: false,
      isStarred: false,
      isDraft: false,
      resendId: data.id,
      resendStatus: 'received',
      sentAt: data.created_at ? new Date(data.created_at) : new Date(),
    });

    console.log('[EmailWebhook] ✅ Email saved to inbox:', data.subject);
  } catch (error) {
    console.error('[EmailWebhook] ❌ Failed to save received email:', error);
    throw error;
  }
}

/**
 * Handle email delivered event
 */
async function handleEmailDelivered(data: any) {
  console.log('[EmailWebhook] Email delivered:', data.id);

  try {
    // Update email status in database
    await db
      .update(emailMessages)
      .set({
        resendStatus: 'delivered',
        updatedAt: new Date(),
      })
      .where(sql`${emailMessages.resendId} = ${data.id}`);

    console.log('[EmailWebhook] ✅ Updated email status to delivered');
  } catch (error) {
    console.error('[EmailWebhook] ❌ Failed to update delivered status:', error);
  }
}

/**
 * Handle email bounced event
 */
async function handleEmailBounced(data: any) {
  console.log('[EmailWebhook] Email bounced:', data.id);

  try {
    // Update email status in database
    await db
      .update(emailMessages)
      .set({
        resendStatus: 'bounced',
        updatedAt: new Date(),
      })
      .where(sql`${emailMessages.resendId} = ${data.id}`);

    console.log('[EmailWebhook] ✅ Updated email status to bounced');
  } catch (error) {
    console.error('[EmailWebhook] ❌ Failed to update bounced status:', error);
  }
}

/**
 * Handle spam complaint event
 */
async function handleEmailComplained(data: any) {
  console.log('[EmailWebhook] Spam complaint received:', data.id);

  try {
    // Update email status in database
    await db
      .update(emailMessages)
      .set({
        resendStatus: 'complained',
        updatedAt: new Date(),
      })
      .where(sql`${emailMessages.resendId} = ${data.id}`);

    console.log('[EmailWebhook] ✅ Updated email status to complained');
  } catch (error) {
    console.error('[EmailWebhook] ❌ Failed to update complained status:', error);
  }
}

export default router;
