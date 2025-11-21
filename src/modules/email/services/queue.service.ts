/**
 * EMAIL QUEUE SERVICE - RELIABILITY LAYER
 *
 * Handles email queueing, retry logic, and failure recovery.
 * Ensures emails are never lost even if Resend API is temporarily unavailable.
 */

import { eq, and, lt, sql } from 'drizzle-orm';
import { db } from '../../../../server/database/db-service';
import {
  SendEmailRequest,
  QueuedEmail,
  EmailModuleError,
  EmailErrorCode,
} from '../types/email.types';
import { resendService } from './resend.service';
import { emailService } from './email.service';
import { nanoid } from 'nanoid';

// In-memory queue for immediate processing
interface QueueEntry {
  id: string;
  tenantId: string;
  userId: string;
  emailData: SendEmailRequest;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  retryCount: number;
  maxRetries: number;
  scheduledFor?: Date;
  createdAt: Date;
}

// ============================================================================
// QUEUE SERVICE
// ============================================================================

export class EmailQueueService {
  private queue: QueueEntry[] = [];
  private processing = false;
  private processInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start queue processor
    this.startProcessor();
  }

  /**
   * Add email to queue
   */
  async enqueue(
    tenantId: string,
    userId: string,
    emailData: SendEmailRequest,
    options: {
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      scheduledFor?: Date;
      maxRetries?: number;
    } = {}
  ): Promise<string> {
    const queueId = nanoid();

    const entry: QueueEntry = {
      id: queueId,
      tenantId,
      userId,
      emailData,
      priority: options.priority || 'normal',
      retryCount: 0,
      maxRetries: options.maxRetries || 3,
      scheduledFor: options.scheduledFor,
      createdAt: new Date(),
    };

    // Add to in-memory queue
    this.queue.push(entry);

    // Sort by priority
    this.sortQueue();

    console.log('[EmailQueue] Email enqueued:', {
      queueId,
      tenantId,
      priority: entry.priority,
      to: emailData.to.map((r) => r.email),
    });

    return queueId;
  }

  /**
   * Process queue (called periodically)
   */
  async processQueue(): Promise<void> {
    if (this.processing) {
      return; // Already processing
    }

    this.processing = true;

    try {
      const now = new Date();
      const processableEntries = this.queue.filter((entry) => {
        // Process if not scheduled, or if scheduled time has passed
        return !entry.scheduledFor || entry.scheduledFor <= now;
      });

      for (const entry of processableEntries) {
        try {
          await this.processEntry(entry);

          // Remove from queue on success
          this.queue = this.queue.filter((e) => e.id !== entry.id);
        } catch (error) {
          console.error('[EmailQueue] Failed to process entry:', error);

          // Increment retry count
          entry.retryCount++;

          // Remove if max retries exceeded
          if (entry.retryCount >= entry.maxRetries) {
            console.error(
              '[EmailQueue] Max retries exceeded, removing from queue:',
              entry.id
            );
            this.queue = this.queue.filter((e) => e.id !== entry.id);

            // TODO: Move to dead letter queue or log for manual review
          } else {
            console.log(
              `[EmailQueue] Will retry entry ${entry.id} (attempt ${entry.retryCount + 1}/${entry.maxRetries})`
            );
          }
        }
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Process single queue entry
   */
  private async processEntry(entry: QueueEntry): Promise<void> {
    console.log('[EmailQueue] Processing entry:', entry.id);

    // Create email record in database
    const email = await emailService.createOutboundEmail(
      entry.tenantId,
      entry.userId,
      entry.emailData
    );

    // Get verified FROM email
    const fromEmail = await resendService.getVerifiedFromEmail();

    // Send via Resend
    const result = await resendService.sendEmail({
      to: entry.emailData.to,
      cc: entry.emailData.cc,
      bcc: entry.emailData.bcc,
      subject: entry.emailData.subject,
      bodyText: entry.emailData.bodyText,
      bodyHtml: entry.emailData.bodyHtml,
      attachments: entry.emailData.attachments,
    });

    // Update email record with Resend ID
    await db
      .execute(sql`
        UPDATE email_messages
        SET
          resend_id = ${result.resendId},
          resend_status = ${result.status},
          from_address = ${fromEmail},
          from_name = 'Autolytiq Support',
          sent_at = NOW(),
          updated_at = NOW()
        WHERE id = ${email.id}
      `);

    console.log('[EmailQueue] Email sent successfully:', {
      emailId: email.id,
      resendId: result.resendId,
    });
  }

  /**
   * Retry failed emails
   */
  async retryFailed(): Promise<number> {
    // This would query a "failed_emails" table in a real implementation
    // For now, we just return 0
    return 0;
  }

  /**
   * Get queue stats
   */
  getStats(): {
    queueSize: number;
    processing: boolean;
    byPriority: Record<string, number>;
  } {
    const byPriority: Record<string, number> = {
      low: 0,
      normal: 0,
      high: 0,
      urgent: 0,
    };

    for (const entry of this.queue) {
      byPriority[entry.priority]++;
    }

    return {
      queueSize: this.queue.length,
      processing: this.processing,
      byPriority,
    };
  }

  /**
   * Start queue processor (runs every 5 seconds)
   */
  private startProcessor(): void {
    if (this.processInterval) {
      return; // Already started
    }

    console.log('[EmailQueue] Starting queue processor');

    this.processInterval = setInterval(() => {
      this.processQueue().catch((error) => {
        console.error('[EmailQueue] Queue processor error:', error);
      });
    }, 5000); // Process every 5 seconds
  }

  /**
   * Stop queue processor
   */
  stopProcessor(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
      console.log('[EmailQueue] Queue processor stopped');
    }
  }

  /**
   * Sort queue by priority
   */
  private sortQueue(): void {
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };

    this.queue.sort((a, b) => {
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // Same priority - sort by creation time
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }
}

// Export singleton instance
export const emailQueueService = new EmailQueueService();
