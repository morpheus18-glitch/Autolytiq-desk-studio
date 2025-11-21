/**
 * EMAIL SERVICE - CORE EMAIL OPERATIONS
 *
 * Atomic, transactional email operations with comprehensive error handling.
 * This service is the ONLY way to interact with email data.
 *
 * ZERO dependencies on deal/customer/other business logic.
 * All operations are atomic and use database transactions.
 */

import { eq, and, desc, sql, inArray, or } from 'drizzle-orm';
import { db } from '../../../server/db';
import {
  emailMessages,
  emailAttachments,
  type EmailMessage as DBEmailMessage,
  type InsertEmailMessage,
  type InsertEmailAttachment,
} from '../../../shared/schema';
import {
  EmailMessage,
  EmailMessageSchema,
  SendEmailRequest,
  SendEmailRequestSchema,
  SaveDraftRequest,
  SaveDraftRequestSchema,
  EmailListQuery,
  EmailListQuerySchema,
  EmailParticipant,
  EmailModuleError,
  EmailErrorCode,
  EmailStats,
  PaginatedEmailsResponse,
  EmailStatus,
  EmailFolder,
  EmailAttachment,
} from '../types/email.types';
import { nanoid } from 'nanoid';

// ============================================================================
// EMAIL SERVICE CLASS
// ============================================================================

export class EmailService {
  /**
   * Send an email (creates record in database, actual sending via ResendService)
   */
  async createOutboundEmail(
    tenantId: string,
    userId: string,
    request: SendEmailRequest
  ): Promise<EmailMessage> {
    // Validate input
    const validated = SendEmailRequestSchema.parse(request);

    // Generate message ID
    const messageId = `${Date.now()}.${nanoid()}@autolytiq.com`;

    try {
      // Create email record in transaction
      const [emailRecord] = await db
        .insert(emailMessages)
        .values({
          dealershipId: tenantId,
          userId,
          messageId,
          fromAddress: '', // Set by ResendService
          fromName: '', // Set by ResendService
          toAddresses: validated.to as unknown,
          ccAddresses: (validated.cc || []) as unknown,
          bccAddresses: (validated.bcc || []) as unknown,
          subject: validated.subject,
          textBody: validated.bodyText,
          htmlBody: validated.bodyHtml || null,
          folder: 'sent',
          isRead: true, // Outbound emails are always "read"
          isDraft: false,
          customerId: validated.customerId || null,
          dealId: validated.dealId || null,
          resendStatus: 'queued',
        })
        .returning();

      // Save attachments if any
      if (validated.attachments && validated.attachments.length > 0) {
        await db.insert(emailAttachments).values(
          validated.attachments.map((att) => ({
            emailMessageId: emailRecord.id,
            filename: att.filename,
            contentType: att.contentType,
            size: att.size,
            url: att.content, // Base64 or URL
          }))
        );
      }

      return this.mapDBToEmail(emailRecord);
    } catch (error) {
      console.error('[EmailService] Failed to create outbound email:', error);
      throw new EmailModuleError(
        'Failed to create email record',
        EmailErrorCode.SEND_FAILED,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Create an inbound email (from webhook)
   */
  async createInboundEmail(
    tenantId: string,
    data: {
      messageId: string;
      from: EmailParticipant;
      to: EmailParticipant[];
      cc?: EmailParticipant[];
      bcc?: EmailParticipant[];
      subject: string;
      bodyText: string;
      bodyHtml?: string;
      receivedAt?: Date;
    }
  ): Promise<EmailMessage> {
    try {
      // Check for duplicates
      const existing = await db
        .select({ id: emailMessages.id })
        .from(emailMessages)
        .where(eq(emailMessages.messageId, data.messageId))
        .limit(1);

      if (existing.length > 0) {
        throw new EmailModuleError(
          'Duplicate email message',
          EmailErrorCode.VALIDATION_ERROR,
          { messageId: data.messageId }
        );
      }

      const [emailRecord] = await db
        .insert(emailMessages)
        .values({
          dealershipId: tenantId,
          userId: null, // Inbound emails have no user initially
          messageId: data.messageId,
          fromAddress: data.from.email,
          fromName: data.from.name || null,
          toAddresses: data.to as unknown,
          ccAddresses: (data.cc || []) as unknown,
          bccAddresses: (data.bcc || []) as unknown,
          subject: data.subject,
          textBody: data.bodyText,
          htmlBody: data.bodyHtml || null,
          folder: 'inbox',
          isRead: false,
          isDraft: false,
          resendStatus: 'received',
          receivedAt: data.receivedAt || new Date(),
        })
        .returning();

      return this.mapDBToEmail(emailRecord);
    } catch (error) {
      console.error('[EmailService] Failed to create inbound email:', error);
      throw new EmailModuleError(
        'Failed to create inbound email',
        EmailErrorCode.SEND_FAILED,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Save or update draft
   */
  async saveDraft(
    tenantId: string,
    userId: string,
    request: SaveDraftRequest
  ): Promise<EmailMessage> {
    const validated = SaveDraftRequestSchema.parse(request);

    try {
      // Update existing draft
      if (validated.draftId) {
        const [updated] = await db
          .update(emailMessages)
          .set({
            toAddresses: (validated.to || []) as unknown,
            ccAddresses: (validated.cc || []) as unknown,
            bccAddresses: (validated.bcc || []) as unknown,
            subject: validated.subject || '(No Subject)',
            textBody: validated.bodyText || '',
            htmlBody: validated.bodyHtml || null,
            customerId: validated.customerId || null,
            dealId: validated.dealId || null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(emailMessages.id, validated.draftId),
              eq(emailMessages.dealershipId, tenantId),
              eq(emailMessages.userId, userId),
              eq(emailMessages.isDraft, true)
            )
          )
          .returning();

        if (!updated) {
          throw new EmailModuleError(
            'Draft not found or not editable',
            EmailErrorCode.NOT_FOUND
          );
        }

        return this.mapDBToEmail(updated);
      }

      // Create new draft
      const messageId = `draft-${nanoid()}`;

      const [created] = await db
        .insert(emailMessages)
        .values({
          dealershipId: tenantId,
          userId,
          messageId,
          fromAddress: '', // Will be set when sending
          fromName: '',
          toAddresses: (validated.to || []) as unknown,
          ccAddresses: (validated.cc || []) as unknown,
          bccAddresses: (validated.bcc || []) as unknown,
          subject: validated.subject || '(No Subject)',
          textBody: validated.bodyText || '',
          htmlBody: validated.bodyHtml || null,
          folder: 'drafts',
          isRead: true,
          isDraft: true,
          customerId: validated.customerId || null,
          dealId: validated.dealId || null,
        })
        .returning();

      return this.mapDBToEmail(created);
    } catch (error) {
      console.error('[EmailService] Failed to save draft:', error);
      throw new EmailModuleError(
        'Failed to save draft',
        EmailErrorCode.SEND_FAILED,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * List emails with filters and pagination
   */
  async listEmails(
    tenantId: string,
    userId: string | null,
    query: EmailListQuery
  ): Promise<PaginatedEmailsResponse> {
    const validated = EmailListQuerySchema.parse(query);

    try {
      const conditions = [eq(emailMessages.dealershipId, tenantId)];

      // Folder-based filtering
      if (validated.folder) {
        conditions.push(eq(emailMessages.folder, validated.folder));

        // Inbox/archive: Show all tenant emails (including null userId)
        // Other folders: User-specific only
        const publicFolders = ['inbox', 'archive'];
        if (!publicFolders.includes(validated.folder) && userId) {
          conditions.push(eq(emailMessages.userId, userId));
        }
      }

      // Status filter
      if (validated.status) {
        conditions.push(eq(emailMessages.resendStatus, validated.status));
      }

      // Read filter
      if (validated.isRead !== undefined) {
        conditions.push(eq(emailMessages.isRead, validated.isRead));
      }

      // Starred filter
      if (validated.isStarred !== undefined) {
        conditions.push(eq(emailMessages.isStarred, validated.isStarred));
      }

      // Association filters
      if (validated.customerId) {
        conditions.push(eq(emailMessages.customerId, validated.customerId));
      }

      if (validated.dealId) {
        conditions.push(eq(emailMessages.dealId, validated.dealId));
      }

      // Search filter
      if (validated.search) {
        const searchTerm = `%${validated.search}%`;
        conditions.push(
          sql`(
            ${emailMessages.subject} ILIKE ${searchTerm} OR
            ${emailMessages.textBody} ILIKE ${searchTerm} OR
            ${emailMessages.fromAddress} ILIKE ${searchTerm}
          )`
        );
      }

      // Date filters
      if (validated.dateFrom) {
        conditions.push(
          sql`${emailMessages.createdAt} >= ${validated.dateFrom}`
        );
      }

      if (validated.dateTo) {
        conditions.push(sql`${emailMessages.createdAt} <= ${validated.dateTo}`);
      }

      // Get messages
      const messages = await db
        .select()
        .from(emailMessages)
        .where(and(...conditions))
        .orderBy(
          validated.sortOrder === 'desc'
            ? desc(emailMessages.createdAt)
            : emailMessages.createdAt
        )
        .limit(validated.limit)
        .offset(validated.offset);

      // Get total count
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(emailMessages)
        .where(and(...conditions));

      return {
        success: true,
        data: messages.map(this.mapDBToEmail),
        total: Number(count),
        limit: validated.limit,
        offset: validated.offset,
      };
    } catch (error) {
      console.error('[EmailService] Failed to list emails:', error);
      throw new EmailModuleError(
        'Failed to list emails',
        EmailErrorCode.VALIDATION_ERROR,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Get single email by ID
   */
  async getEmail(
    emailId: string,
    tenantId: string,
    userId: string | null
  ): Promise<EmailMessage | null> {
    try {
      const conditions = [
        eq(emailMessages.id, emailId),
        eq(emailMessages.dealershipId, tenantId),
      ];

      // For non-admin users, ensure they can only access their emails
      if (userId) {
        conditions.push(
          or(
            eq(emailMessages.userId, userId),
            eq(emailMessages.userId, null) // Can view inbound emails
          )!
        );
      }

      const [email] = await db
        .select()
        .from(emailMessages)
        .where(and(...conditions))
        .limit(1);

      return email ? this.mapDBToEmail(email) : null;
    } catch (error) {
      console.error('[EmailService] Failed to get email:', error);
      throw new EmailModuleError(
        'Failed to get email',
        EmailErrorCode.NOT_FOUND,
        { emailId }
      );
    }
  }

  /**
   * Get email with attachments
   */
  async getEmailWithAttachments(
    emailId: string,
    tenantId: string,
    userId: string | null
  ): Promise<(EmailMessage & { attachments: EmailAttachment[] }) | null> {
    const email = await this.getEmail(emailId, tenantId, userId);

    if (!email) {
      return null;
    }

    const attachments = await db
      .select()
      .from(emailAttachments)
      .where(eq(emailAttachments.emailMessageId, emailId));

    return {
      ...email,
      attachments,
    };
  }

  /**
   * Mark email as read/unread
   */
  async markAsRead(
    emailId: string,
    tenantId: string,
    userId: string,
    isRead: boolean
  ): Promise<EmailMessage> {
    try {
      const [updated] = await db
        .update(emailMessages)
        .set({
          isRead,
          readAt: isRead ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(emailMessages.id, emailId),
            eq(emailMessages.dealershipId, tenantId)
          )
        )
        .returning();

      if (!updated) {
        throw new EmailModuleError(
          'Email not found',
          EmailErrorCode.NOT_FOUND,
          { emailId }
        );
      }

      return this.mapDBToEmail(updated);
    } catch (error) {
      console.error('[EmailService] Failed to mark as read:', error);
      throw new EmailModuleError(
        'Failed to mark email as read',
        EmailErrorCode.VALIDATION_ERROR,
        { emailId }
      );
    }
  }

  /**
   * Toggle star on email
   */
  async toggleStar(
    emailId: string,
    tenantId: string,
    userId: string,
    isStarred: boolean
  ): Promise<EmailMessage> {
    try {
      const [updated] = await db
        .update(emailMessages)
        .set({
          isStarred,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(emailMessages.id, emailId),
            eq(emailMessages.dealershipId, tenantId)
          )
        )
        .returning();

      if (!updated) {
        throw new EmailModuleError(
          'Email not found',
          EmailErrorCode.NOT_FOUND,
          { emailId }
        );
      }

      return this.mapDBToEmail(updated);
    } catch (error) {
      console.error('[EmailService] Failed to toggle star:', error);
      throw new EmailModuleError(
        'Failed to toggle star',
        EmailErrorCode.VALIDATION_ERROR,
        { emailId }
      );
    }
  }

  /**
   * Move email to folder
   */
  async moveToFolder(
    emailId: string,
    tenantId: string,
    folder: string
  ): Promise<EmailMessage> {
    try {
      const [updated] = await db
        .update(emailMessages)
        .set({
          folder,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(emailMessages.id, emailId),
            eq(emailMessages.dealershipId, tenantId)
          )
        )
        .returning();

      if (!updated) {
        throw new EmailModuleError(
          'Email not found',
          EmailErrorCode.NOT_FOUND,
          { emailId }
        );
      }

      return this.mapDBToEmail(updated);
    } catch (error) {
      console.error('[EmailService] Failed to move email:', error);
      throw new EmailModuleError(
        'Failed to move email',
        EmailErrorCode.VALIDATION_ERROR,
        { emailId }
      );
    }
  }

  /**
   * Delete email (move to trash or permanent delete)
   */
  async deleteEmail(
    emailId: string,
    tenantId: string,
    userId: string,
    permanent = false
  ): Promise<boolean> {
    try {
      if (permanent) {
        // Permanent delete
        await db
          .delete(emailMessages)
          .where(
            and(
              eq(emailMessages.id, emailId),
              eq(emailMessages.dealershipId, tenantId),
              eq(emailMessages.userId, userId)
            )
          );

        return true;
      } else {
        // Move to trash
        const result = await this.moveToFolder(emailId, tenantId, 'trash');
        return !!result;
      }
    } catch (error) {
      console.error('[EmailService] Failed to delete email:', error);
      throw new EmailModuleError(
        'Failed to delete email',
        EmailErrorCode.VALIDATION_ERROR,
        { emailId }
      );
    }
  }

  /**
   * Bulk mark as read
   */
  async bulkMarkAsRead(
    emailIds: string[],
    tenantId: string,
    isRead: boolean
  ): Promise<number> {
    try {
      const result = await db
        .update(emailMessages)
        .set({
          isRead,
          readAt: isRead ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(
          and(
            inArray(emailMessages.id, emailIds),
            eq(emailMessages.dealershipId, tenantId)
          )
        );

      return result.rowCount || 0;
    } catch (error) {
      console.error('[EmailService] Failed to bulk mark as read:', error);
      throw new EmailModuleError(
        'Failed to bulk mark as read',
        EmailErrorCode.VALIDATION_ERROR,
        { emailIds }
      );
    }
  }

  /**
   * Bulk delete emails
   */
  async bulkDelete(
    emailIds: string[],
    tenantId: string,
    permanent = false
  ): Promise<number> {
    try {
      if (permanent) {
        const result = await db
          .delete(emailMessages)
          .where(
            and(
              inArray(emailMessages.id, emailIds),
              eq(emailMessages.dealershipId, tenantId)
            )
          );

        return result.rowCount || 0;
      } else {
        const result = await db
          .update(emailMessages)
          .set({ folder: 'trash', updatedAt: new Date() })
          .where(
            and(
              inArray(emailMessages.id, emailIds),
              eq(emailMessages.dealershipId, tenantId)
            )
          );

        return result.rowCount || 0;
      }
    } catch (error) {
      console.error('[EmailService] Failed to bulk delete:', error);
      throw new EmailModuleError(
        'Failed to bulk delete',
        EmailErrorCode.VALIDATION_ERROR,
        { emailIds }
      );
    }
  }

  /**
   * Get email statistics
   */
  async getStats(tenantId: string, userId: string | null): Promise<EmailStats> {
    try {
      const conditions = [eq(emailMessages.dealershipId, tenantId)];

      if (userId) {
        conditions.push(eq(emailMessages.userId, userId));
      }

      const [stats] = await db
        .select({
          total: sql<number>`count(*)::int`,
          unread: sql<number>`count(*) FILTER (WHERE ${emailMessages.isRead} = false)::int`,
          starred: sql<number>`count(*) FILTER (WHERE ${emailMessages.isStarred} = true)::int`,
          drafts: sql<number>`count(*) FILTER (WHERE ${emailMessages.isDraft} = true)::int`,
          sent: sql<number>`count(*) FILTER (WHERE ${emailMessages.folder} = 'sent')::int`,
          failed: sql<number>`count(*) FILTER (WHERE ${emailMessages.resendStatus} = 'failed')::int`,
        })
        .from(emailMessages)
        .where(and(...conditions));

      return {
        total: Number(stats.total),
        unread: Number(stats.unread),
        starred: Number(stats.starred),
        drafts: Number(stats.drafts),
        sent: Number(stats.sent),
        failed: Number(stats.failed),
      };
    } catch (error) {
      console.error('[EmailService] Failed to get stats:', error);
      throw new EmailModuleError(
        'Failed to get email statistics',
        EmailErrorCode.VALIDATION_ERROR
      );
    }
  }

  /**
   * Get unread counts by folder
   */
  async getUnreadCounts(
    tenantId: string,
    userId: string | null
  ): Promise<Record<string, number>> {
    try {
      const conditions = [
        eq(emailMessages.dealershipId, tenantId),
        eq(emailMessages.isRead, false),
      ];

      if (userId) {
        conditions.push(eq(emailMessages.userId, userId));
      }

      const counts = await db
        .select({
          folder: emailMessages.folder,
          count: sql<number>`count(*)::int`,
        })
        .from(emailMessages)
        .where(and(...conditions))
        .groupBy(emailMessages.folder);

      return counts.reduce(
        (acc, { folder, count }) => {
          acc[folder] = Number(count);
          return acc;
        },
        {} as Record<string, number>
      );
    } catch (error) {
      console.error('[EmailService] Failed to get unread counts:', error);
      throw new EmailModuleError(
        'Failed to get unread counts',
        EmailErrorCode.VALIDATION_ERROR
      );
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Map database email to EmailMessage type
   */
  private mapDBToEmail(dbEmail: DBEmailMessage): EmailMessage {
    return {
      id: dbEmail.id,
      tenantId: dbEmail.dealershipId,
      userId: dbEmail.userId,
      messageId: dbEmail.messageId,
      resendId: dbEmail.resendId || null,
      threadId: dbEmail.threadId || null,
      from: {
        email: dbEmail.fromAddress,
        name: dbEmail.fromName || undefined,
      },
      to: Array.isArray(dbEmail.toAddresses) ? dbEmail.toAddresses : [],
      cc: Array.isArray(dbEmail.ccAddresses) ? dbEmail.ccAddresses : [],
      bcc: Array.isArray(dbEmail.bccAddresses) ? dbEmail.bccAddresses : [],
      subject: dbEmail.subject,
      bodyText: dbEmail.textBody || '',
      bodyHtml: dbEmail.htmlBody || undefined,
      status: (dbEmail.resendStatus as EmailStatus) || 'draft',
      direction: dbEmail.folder === 'sent' ? 'outbound' : 'inbound',
      priority: 'normal',
      folder: (dbEmail.folder as EmailFolder) || 'inbox',
      isRead: dbEmail.isRead,
      isStarred: dbEmail.isStarred,
      isDraft: dbEmail.isDraft,
      customerId: dbEmail.customerId || null,
      dealId: dbEmail.dealId || null,
      attachments: [],
      hasAttachments: false,
      sentAt: dbEmail.sentAt ? new Date(dbEmail.sentAt) : null,
      receivedAt: dbEmail.receivedAt ? new Date(dbEmail.receivedAt) : null,
      readAt: dbEmail.readAt ? new Date(dbEmail.readAt) : null,
      createdAt: new Date(dbEmail.createdAt),
      updatedAt: new Date(dbEmail.updatedAt),
    };
  }
}

// Export singleton instance
export const emailService = new EmailService();
