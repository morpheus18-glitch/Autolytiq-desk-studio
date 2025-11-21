/**
 * RESEND SERVICE - EMAIL DELIVERY INTEGRATION
 *
 * Handles all interactions with the Resend API for email delivery.
 * Isolated from core email logic - can be swapped for another provider.
 */

import { Resend } from 'resend';
import {
  EmailParticipant,
  EmailAttachment,
  EmailModuleError,
  EmailErrorCode,
} from '../types/email.types';

// ============================================================================
// RESEND CONFIGURATION
// ============================================================================

interface ResendCredentials {
  apiKey: string;
  fromEmail: string;
}

async function getCredentials(): Promise<ResendCredentials> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new EmailModuleError(
      'X_REPLIT_TOKEN not found for repl/depl',
      EmailErrorCode.NETWORK_ERROR
    );
  }

  const response = await fetch(
    'https://' +
      hostname +
      '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        Accept: 'application/json',
        X_REPLIT_TOKEN: xReplitToken,
      },
    }
  );

  const data = await response.json();
  const connectionSettings = data.items?.[0];

  if (!connectionSettings || !connectionSettings.settings.api_key) {
    throw new EmailModuleError(
      'Resend not connected',
      EmailErrorCode.NETWORK_ERROR
    );
  }

  return {
    apiKey: connectionSettings.settings.api_key,
    fromEmail: connectionSettings.settings.from_email || 'support@autolytiq.com',
  };
}

/**
 * Get fresh Resend client (never cache - tokens expire)
 */
async function getResendClient() {
  const credentials = await getCredentials();
  return {
    client: new Resend(credentials.apiKey),
    fromEmail: credentials.fromEmail,
  };
}

// ============================================================================
// RESEND SERVICE
// ============================================================================

export class ResendService {
  /**
   * Get verified FROM email address
   */
  async getVerifiedFromEmail(): Promise<string> {
    try {
      const { fromEmail } = await getResendClient();
      return fromEmail;
    } catch (error) {
      console.error('[ResendService] Failed to get verified FROM email:', error);
      return 'support@autolytiq.com'; // Fallback
    }
  }

  /**
   * Send email via Resend API
   */
  async sendEmail(params: {
    to: EmailParticipant[];
    cc?: EmailParticipant[];
    bcc?: EmailParticipant[];
    subject: string;
    bodyText: string;
    bodyHtml?: string;
    replyTo?: EmailParticipant;
    attachments?: EmailAttachment[];
  }): Promise<{ resendId: string; status: string }> {
    try {
      const { client, fromEmail } = await getResendClient();

      // Prepare recipient emails
      const toEmails = params.to.map((r) => r.email);
      const ccEmails = params.cc?.map((r) => r.email);
      const bccEmails = params.bcc?.map((r) => r.email);

      // Prepare email payload
      interface ResendEmailPayload {
        from: string;
        to: string[];
        subject: string;
        text: string;
        html?: string;
        cc?: string[];
        bcc?: string[];
        reply_to?: string;
        attachments?: Array<{
          filename: string;
          content: string;
        }>;
      }

      const emailPayload: ResendEmailPayload = {
        from: `Autolytiq Support <${fromEmail}>`,
        to: toEmails,
        subject: params.subject,
        text: params.bodyText,
      };

      if (params.bodyHtml) {
        emailPayload.html = params.bodyHtml;
      }

      if (ccEmails && ccEmails.length > 0) {
        emailPayload.cc = ccEmails;
      }

      if (bccEmails && bccEmails.length > 0) {
        emailPayload.bcc = bccEmails;
      }

      if (params.replyTo) {
        emailPayload.reply_to = params.replyTo.email;
      }

      // Add attachments (if any)
      if (params.attachments && params.attachments.length > 0) {
        emailPayload.attachments = params.attachments.map((att) => ({
          filename: att.filename,
          content: att.content, // Base64
        }));
      }

      // Send via Resend
      const result = await client.emails.send(emailPayload);

      if (result.error) {
        console.error('[ResendService] Resend API error:', result.error);
        throw new EmailModuleError(
          `Resend error: ${JSON.stringify(result.error)}`,
          EmailErrorCode.SEND_FAILED,
          { resendError: result.error }
        );
      }

      console.log('[ResendService] Email sent successfully:', {
        resendId: result.data?.id,
        to: toEmails,
        subject: params.subject,
      });

      return {
        resendId: result.data?.id || '',
        status: 'sent',
      };
    } catch (error) {
      console.error('[ResendService] Failed to send email:', error);

      if (error instanceof EmailModuleError) {
        throw error;
      }

      throw new EmailModuleError(
        'Failed to send email via Resend',
        EmailErrorCode.NETWORK_ERROR,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Verify Resend connection
   */
  async verifyConnection(): Promise<boolean> {
    try {
      const { client } = await getResendClient();
      // Attempt to get API key info (validates connection)
      // Note: Resend doesn't have a dedicated health check, so we just try to init
      return true;
    } catch (error) {
      console.error('[ResendService] Connection verification failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const resendService = new ResendService();
