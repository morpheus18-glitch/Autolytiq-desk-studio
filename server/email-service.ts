/**
 * EMAIL SERVICE
 *
 * Manages email operations including sending, receiving, and organizing messages.
 * Integrated with Resend for email delivery.
 *
 * Features:
 * - Send emails via Resend API
 * - Save sent/received messages to database
 * - Folder management (inbox, sent, drafts, trash, custom)
 * - Message threading and conversation tracking
 * - Read/unread status, starring, flagging
 * - Draft saving and auto-save
 * - Attachment handling
 */

import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "./db";
import {
  emailMessages,
  emailAttachments,
  emailFolders,
  EmailMessage,
  InsertEmailMessage,
  InsertEmailAttachment,
  InsertEmailFolder,
} from "../shared/schema";
import { sendEmail, getVerifiedFromEmail } from "./email-config";

// ============================================================================
// TYPES
// ============================================================================

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface SendEmailOptions {
  dealershipId: string;
  userId: string;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  htmlBody?: string;
  textBody?: string;
  replyTo?: string;
  customerId?: string;
  dealId?: string;
  attachments?: Array<{
    filename: string;
    content: string; // base64 or URL
    contentType: string;
  }>;
}

export interface EmailListOptions {
  dealershipId: string;
  userId?: string;
  folder?: string;
  customerId?: string;
  dealId?: string;
  isRead?: boolean;
  isStarred?: boolean;
  limit?: number;
  offset?: number;
  search?: string;
}

// ============================================================================
// EMAIL SENDING
// ============================================================================

/**
 * Send an email via Resend and save to database
 */
export async function sendEmailMessage(
  options: SendEmailOptions
): Promise<EmailMessage> {
  const {
    dealershipId,
    userId,
    to,
    cc,
    bcc,
    subject,
    htmlBody,
    textBody,
    replyTo,
    customerId,
    dealId,
    attachments,
  } = options;

  // Get verified FROM address from Resend connection
  const verifiedFromAddress = await getVerifiedFromEmail();

  // Send via Resend
  let resendId: string | undefined;
  let resendStatus = "sent";

  try {
    const resendResponse = await sendEmail({
      to: to[0].email, // Resend takes single email
      subject,
      html: htmlBody,
      text: textBody,
    });

    resendId = resendResponse.data?.id;
  } catch (error) {
    console.error("[EmailService] Error sending email:", error);
    resendStatus = "failed";
  }

  // Generate message ID using verified domain
  const domain = verifiedFromAddress.split('@')[1] || 'autolytiq.com';
  const messageId = `${Date.now()}.${Math.random().toString(36).substring(7)}@${domain}`;

  // Save to database with verified FROM address
  const [message] = await db
    .insert(emailMessages)
    .values({
      dealershipId,
      userId,
      messageId,
      fromAddress: verifiedFromAddress,
      fromName: "Autolytiq Support",
      toAddresses: to as any,
      ccAddresses: (cc || []) as any,
      bccAddresses: (bcc || []) as any,
      replyTo,
      subject,
      htmlBody,
      textBody,
      folder: "sent",
      direction: "outbound",
      isRead: true, // Sent emails are always "read"
      isDraft: false,
      resendId,
      resendStatus,
      customerId,
      dealId,
      sentAt: new Date(),
    })
    .returning();

  // Save attachments if any
  if (attachments && attachments.length > 0) {
    await db.insert(emailAttachments).values(
      attachments.map((att) => ({
        emailMessageId: message.id,
        filename: att.filename,
        contentType: att.contentType,
        size: 0, // TODO: Calculate from base64
        url: att.content,
      }))
    );
  }

  return message;
}

/**
 * Save draft email
 */
export async function saveDraft(
  options: Partial<SendEmailOptions> & {
    dealershipId: string;
    userId: string;
    draftId?: string;
  }
): Promise<EmailMessage> {
  const {
    dealershipId,
    userId,
    draftId,
    to,
    cc,
    bcc,
    subject,
    htmlBody,
    textBody,
    customerId,
    dealId,
    attachments,
  } = options;

  // Update existing draft
  if (draftId) {
    // Check if draft exists and belongs to user
    const existingDraft = await db
      .select()
      .from(emailMessages)
      .where(
        and(
          eq(emailMessages.id, draftId),
          eq(emailMessages.dealershipId, dealershipId),
          eq(emailMessages.userId, userId),
          eq(emailMessages.isDraft, true)
        )
      )
      .limit(1);

    if (existingDraft.length === 0) {
      throw new Error("Draft not found or access denied");
    }

    const [updated] = await db
      .update(emailMessages)
      .set({
        toAddresses: (to || []) as any,
        ccAddresses: (cc || []) as any,
        bccAddresses: (bcc || []) as any,
        subject: subject !== undefined ? subject : existingDraft[0].subject,
        htmlBody: htmlBody !== undefined ? htmlBody : existingDraft[0].htmlBody,
        textBody: textBody !== undefined ? textBody : existingDraft[0].textBody,
        customerId,
        dealId,
        attachments: attachments as any,
        updatedAt: new Date(),
      })
      .where(eq(emailMessages.id, draftId))
      .returning();

    console.log(`[EmailService] Updated draft ${draftId}`);
    return updated;
  }

  // Create new draft with all fields properly set
  const [message] = await db
    .insert(emailMessages)
    .values({
      dealershipId,
      userId,
      fromAddress: "support@autolytiq.com",
      fromName: "Autolytiq Support",
      toAddresses: (to || []) as any,
      ccAddresses: (cc || []) as any,
      bccAddresses: (bcc || []) as any,
      subject: subject || "(No Subject)",
      htmlBody: htmlBody || "",
      textBody: textBody || "",
      folder: "drafts",
      direction: "outbound",
      isRead: true,
      isDraft: true,
      customerId,
      dealId,
      attachments: attachments as any,
    })
    .returning();

  console.log(`[EmailService] Created new draft ${message.id}`);
  return message;
}

// ============================================================================
// EMAIL RETRIEVAL
// ============================================================================

/**
 * List emails with filters and pagination
 */
export async function listEmails(
  options: EmailListOptions
): Promise<{ messages: EmailMessage[]; total: number }> {
  const {
    dealershipId,
    userId,
    folder,
    customerId,
    dealId,
    isRead,
    isStarred,
    limit = 50,
    offset = 0,
    search,
  } = options;

  // Build conditions
  const conditions = [eq(emailMessages.dealershipId, dealershipId)];

  // Folder visibility rules:
  // - inbox: Show only inbound emails (direction='inbound')
  // - sent: Show only outbound emails (direction='outbound')
  // - drafts: User-specific drafts only
  // - trash/archive: All dealership emails

  if (folder === 'inbox') {
    conditions.push(eq(emailMessages.folder, 'inbox'));
    conditions.push(eq(emailMessages.direction, 'inbound'));
  } else if (folder === 'sent') {
    conditions.push(eq(emailMessages.folder, 'sent'));
    conditions.push(eq(emailMessages.direction, 'outbound'));
    if (userId) {
      conditions.push(eq(emailMessages.userId, userId));
    }
  } else if (folder === 'drafts') {
    conditions.push(eq(emailMessages.folder, 'drafts'));
    conditions.push(eq(emailMessages.isDraft, true));
    if (userId) {
      conditions.push(eq(emailMessages.userId, userId));
    }
  } else if (folder) {
    conditions.push(eq(emailMessages.folder, folder));
  }

  if (customerId) {
    conditions.push(eq(emailMessages.customerId, customerId));
  }

  if (dealId) {
    conditions.push(eq(emailMessages.dealId, dealId));
  }

  if (isRead !== undefined) {
    conditions.push(eq(emailMessages.isRead, isRead));
  }

  if (isStarred !== undefined) {
    conditions.push(eq(emailMessages.isStarred, isStarred));
  }

  // Add search filter
  if (search) {
    conditions.push(
      sql`(
        ${emailMessages.subject} ILIKE ${`%${search}%`} OR
        ${emailMessages.textBody} ILIKE ${`%${search}%`} OR
        ${emailMessages.fromAddress} ILIKE ${`%${search}%`}
      )`
    );
  }

  // Get messages
  const messages = await db
    .select()
    .from(emailMessages)
    .where(and(...conditions))
    .orderBy(desc(emailMessages.sentAt), desc(emailMessages.createdAt))
    .limit(limit)
    .offset(offset);

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(emailMessages)
    .where(and(...conditions));

  return {
    messages,
    total: Number(count),
  };
}

/**
 * Get single email by ID
 */
export async function getEmailById(
  emailId: string,
  dealershipId: string
): Promise<EmailMessage | null> {
  const messages = await db
    .select()
    .from(emailMessages)
    .where(
      and(
        eq(emailMessages.id, emailId),
        eq(emailMessages.dealershipId, dealershipId)
      )
    )
    .limit(1);

  return messages.length > 0 ? messages[0] : null;
}

/**
 * Get email with attachments
 */
export async function getEmailWithAttachments(
  emailId: string,
  dealershipId: string
) {
  const message = await getEmailById(emailId, dealershipId);

  if (!message) {
    return null;
  }

  const attachments = await db
    .select()
    .from(emailAttachments)
    .where(eq(emailAttachments.emailMessageId, emailId));

  return {
    ...message,
    attachments,
  };
}

/**
 * Get email thread (conversation)
 */
export async function getEmailThread(
  threadId: string,
  dealershipId: string
): Promise<EmailMessage[]> {
  return await db
    .select()
    .from(emailMessages)
    .where(
      and(
        eq(emailMessages.threadId, threadId),
        eq(emailMessages.dealershipId, dealershipId)
      )
    )
    .orderBy(emailMessages.sentAt);
}

// ============================================================================
// EMAIL ACTIONS
// ============================================================================

/**
 * Mark email as read/unread
 */
export async function markAsRead(
  emailId: string,
  dealershipId: string,
  isRead: boolean
): Promise<EmailMessage | null> {
  const [updated] = await db
    .update(emailMessages)
    .set({ isRead, updatedAt: new Date() })
    .where(
      and(
        eq(emailMessages.id, emailId),
        eq(emailMessages.dealershipId, dealershipId)
      )
    )
    .returning();

  return updated || null;
}

/**
 * Star/unstar email
 */
export async function toggleStar(
  emailId: string,
  dealershipId: string,
  isStarred: boolean
): Promise<EmailMessage | null> {
  const [updated] = await db
    .update(emailMessages)
    .set({ isStarred, updatedAt: new Date() })
    .where(
      and(
        eq(emailMessages.id, emailId),
        eq(emailMessages.dealershipId, dealershipId)
      )
    )
    .returning();

  return updated || null;
}

/**
 * Move email to folder
 */
export async function moveToFolder(
  emailId: string,
  dealershipId: string,
  folder: string
): Promise<EmailMessage | null> {
  const [updated] = await db
    .update(emailMessages)
    .set({ folder, updatedAt: new Date() })
    .where(
      and(
        eq(emailMessages.id, emailId),
        eq(emailMessages.dealershipId, dealershipId)
      )
    )
    .returning();

  return updated || null;
}

/**
 * Delete email (move to trash or permanent delete)
 */
export async function deleteEmail(
  emailId: string,
  dealershipId: string,
  permanent = false
): Promise<boolean> {
  if (permanent) {
    await db
      .delete(emailMessages)
      .where(
        and(
          eq(emailMessages.id, emailId),
          eq(emailMessages.dealershipId, dealershipId)
        )
      );
    return true;
  } else {
    // Move to trash
    const result = await moveToFolder(emailId, dealershipId, "trash");
    return result !== null;
  }
}

/**
 * Bulk mark as read
 */
export async function bulkMarkAsRead(
  emailIds: string[],
  dealershipId: string,
  isRead: boolean
): Promise<number> {
  const result = await db
    .update(emailMessages)
    .set({ isRead, updatedAt: new Date() })
    .where(
      and(
        sql`${emailMessages.id} = ANY(${emailIds})`,
        eq(emailMessages.dealershipId, dealershipId)
      )
    );

  return result.rowCount || 0;
}

/**
 * Bulk delete emails
 */
export async function bulkDelete(
  emailIds: string[],
  dealershipId: string,
  permanent = false
): Promise<number> {
  if (permanent) {
    const result = await db
      .delete(emailMessages)
      .where(
        and(
          sql`${emailMessages.id} = ANY(${emailIds})`,
          eq(emailMessages.dealershipId, dealershipId)
        )
      );
    return result.rowCount || 0;
  } else {
    const result = await db
      .update(emailMessages)
      .set({ folder: "trash", updatedAt: new Date() })
      .where(
        and(
          sql`${emailMessages.id} = ANY(${emailIds})`,
          eq(emailMessages.dealershipId, dealershipId)
        )
      );
    return result.rowCount || 0;
  }
}

// ============================================================================
// FOLDER MANAGEMENT
// ============================================================================

/**
 * Get user's custom folders
 */
export async function getUserFolders(
  userId: string,
  dealershipId: string
) {
  return await db
    .select()
    .from(emailFolders)
    .where(
      and(
        eq(emailFolders.userId, userId),
        eq(emailFolders.dealershipId, dealershipId)
      )
    )
    .orderBy(emailFolders.sortOrder, emailFolders.name);
}

/**
 * Create custom folder
 */
export async function createFolder(
  data: InsertEmailFolder
) {
  const [folder] = await db.insert(emailFolders).values(data).returning();
  return folder;
}

/**
 * Get unread count by folder
 */
export async function getUnreadCounts(
  dealershipId: string,
  userId?: string
) {
  const conditions = [
    eq(emailMessages.dealershipId, dealershipId),
    eq(emailMessages.isRead, false),
  ];

  if (userId) {
    conditions.push(eq(emailMessages.userId, userId));
  }

  const counts = await db
    .select({
      folder: emailMessages.folder,
      count: sql<number>`count(*)`,
    })
    .from(emailMessages)
    .where(and(...conditions))
    .groupBy(emailMessages.folder);

  return counts.reduce((acc, { folder, count }) => {
    acc[folder] = Number(count);
    return acc;
  }, {} as Record<string, number>);
}
