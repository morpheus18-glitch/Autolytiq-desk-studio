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
import { emailMessages, dealershipSettings } from "../shared/schema";
import { sql, eq, or, inArray } from "drizzle-orm";

const router = Router();

// ============================================================================
// EMAIL ROUTING HELPER (Multi-Tenant)
// ============================================================================

/**
 * Resolve which dealership an incoming email belongs to
 * Matches recipient email addresses against dealership inbox addresses
 * 
 * Returns:
 * - dealershipId (UUID) if exactly one match found
 * - null if no match or ambiguous (multiple dealerships)
 */
async function resolveDealershipFromRecipients(
  toAddresses: any[],
  ccAddresses: any[] = [],
  bccAddresses: any[] = []
): Promise<string | null> {
  try {
    // Extract all recipient email addresses and normalize them
    const allRecipients = [
      ...toAddresses,
      ...ccAddresses,
      ...bccAddresses,
    ].map(addr => {
      const email = typeof addr === 'string' ? addr : (addr.email || addr);
      return email.toLowerCase().trim();
    }).filter(Boolean);

    if (allRecipients.length === 0) {
      console.warn('[EmailRouting] No recipients found in email');
      return null;
    }

    console.log('[EmailRouting] Looking up dealerships for recipients:', allRecipients);

    // Query dealerships that match any of the recipient addresses
    // Using SQL function for case-insensitive comparison with parameterized query (safe from SQL injection)
    const matchedDealerships = await db
      .select({ id: dealershipSettings.id, email: dealershipSettings.email })
      .from(dealershipSettings)
      .where(
        or(
          ...allRecipients.map(email => 
            sql`LOWER(${dealershipSettings.email}) = LOWER(${email})`
          )
        )
      );

    if (matchedDealerships.length === 0) {
      console.warn('[EmailRouting] ⚠️  No dealership found for recipients:', allRecipients);
      console.warn('[EmailRouting] Email will be skipped (no tenant match)');
      return null;
    }

    if (matchedDealerships.length > 1) {
      console.warn('[EmailRouting] ⚠️  Multiple dealerships match recipients:', {
        recipients: allRecipients,
        dealerships: matchedDealerships.map(d => d.email),
      });
      console.warn('[EmailRouting] Email will be skipped (ambiguous routing)');
      return null;
    }

    // Exactly one match - use it!
    const dealership = matchedDealerships[0];
    console.log('[EmailRouting] ✅ Resolved to dealership:', dealership.email, '(ID:', dealership.id, ')');
    return dealership.id;

  } catch (error) {
    console.error('[EmailRouting] ❌ Error resolving dealership:', error);
    return null;
  }
}

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

    // Resolve which dealership this email belongs to (multi-tenant routing)
    const dealershipId = await resolveDealershipFromRecipients(
      toAddresses,
      ccAddresses,
      bccAddresses
    );

    if (!dealershipId) {
      console.warn('[EmailWebhook] ⚠️  Email skipped - no dealership match for:', data.subject);
      console.warn('[EmailWebhook] Recipients:', { to: toAddresses, cc: ccAddresses, bcc: bccAddresses });
      // Return success to prevent Resend retries, but don't save the email
      return;
    }

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
