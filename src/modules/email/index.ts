/**
 * EMAIL MODULE - PUBLIC API
 *
 * This is the ONLY file other modules should import from.
 * All email functionality is exposed through this single interface.
 *
 * Usage:
 *   import { emailModule } from '@/modules/email';
 *   const result = await emailModule.sendEmail(tenantId, userId, emailData);
 */

import { emailService } from './services/email.service';
import { emailQueueService } from './services/queue.service';
import { resendService } from './services/resend.service';
import { templateService } from './services/template.service';

// Export all types
export * from './types/email.types';

// ============================================================================
// UNIFIED EMAIL MODULE API
// ============================================================================

export const emailModule = {
  // ============================================================================
  // CORE EMAIL OPERATIONS
  // ============================================================================

  /**
   * Send an email (queued for delivery)
   */
  async sendEmail(
    tenantId: string,
    userId: string,
    emailData: import('./types/email.types').SendEmailRequest
  ) {
    // Enqueue for reliable delivery
    const queueId = await emailQueueService.enqueue(
      tenantId,
      userId,
      emailData
    );

    return {
      success: true,
      queueId,
      message: 'Email queued for delivery',
    };
  },

  /**
   * Save or update a draft
   */
  async saveDraft(
    tenantId: string,
    userId: string,
    draftData: import('./types/email.types').SaveDraftRequest
  ) {
    return await emailService.saveDraft(tenantId, userId, draftData);
  },

  /**
   * List emails with filters
   */
  async listEmails(
    tenantId: string,
    userId: string | null,
    query: import('./types/email.types').EmailListQuery
  ) {
    return await emailService.listEmails(tenantId, userId, query);
  },

  /**
   * Get single email by ID
   */
  async getEmail(emailId: string, tenantId: string, userId: string | null) {
    return await emailService.getEmail(emailId, tenantId, userId);
  },

  /**
   * Get email with attachments
   */
  async getEmailWithAttachments(
    emailId: string,
    tenantId: string,
    userId: string | null
  ) {
    return await emailService.getEmailWithAttachments(emailId, tenantId, userId);
  },

  // ============================================================================
  // EMAIL ACTIONS
  // ============================================================================

  /**
   * Mark email as read/unread
   */
  async markAsRead(
    emailId: string,
    tenantId: string,
    userId: string,
    isRead: boolean
  ) {
    return await emailService.markAsRead(emailId, tenantId, userId, isRead);
  },

  /**
   * Toggle star on email
   */
  async toggleStar(
    emailId: string,
    tenantId: string,
    userId: string,
    isStarred: boolean
  ) {
    return await emailService.toggleStar(emailId, tenantId, userId, isStarred);
  },

  /**
   * Move email to folder
   */
  async moveToFolder(emailId: string, tenantId: string, folder: string) {
    return await emailService.moveToFolder(emailId, tenantId, folder);
  },

  /**
   * Delete email (soft or hard delete)
   */
  async deleteEmail(
    emailId: string,
    tenantId: string,
    userId: string,
    permanent = false
  ) {
    return await emailService.deleteEmail(emailId, tenantId, userId, permanent);
  },

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  /**
   * Bulk mark emails as read/unread
   */
  async bulkMarkAsRead(
    emailIds: string[],
    tenantId: string,
    isRead: boolean
  ) {
    return await emailService.bulkMarkAsRead(emailIds, tenantId, isRead);
  },

  /**
   * Bulk delete emails
   */
  async bulkDelete(emailIds: string[], tenantId: string, permanent = false) {
    return await emailService.bulkDelete(emailIds, tenantId, permanent);
  },

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Get email statistics
   */
  async getStats(tenantId: string, userId: string | null) {
    return await emailService.getStats(tenantId, userId);
  },

  /**
   * Get unread counts by folder
   */
  async getUnreadCounts(tenantId: string, userId: string | null) {
    return await emailService.getUnreadCounts(tenantId, userId);
  },

  /**
   * Get queue statistics
   */
  getQueueStats() {
    return emailQueueService.getStats();
  },

  // ============================================================================
  // TEMPLATES
  // ============================================================================

  /**
   * Apply email template
   */
  async applyTemplate(
    request: import('./types/email.types').ApplyTemplateRequest
  ) {
    return await templateService.applyTemplate(request);
  },

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Get verified FROM email address
   */
  async getVerifiedFromEmail() {
    return await resendService.getVerifiedFromEmail();
  },

  /**
   * Verify Resend connection
   */
  async verifyConnection() {
    return await resendService.verifyConnection();
  },

  /**
   * Process email queue manually
   */
  async processQueue() {
    return await emailQueueService.processQueue();
  },

  /**
   * Retry failed emails
   */
  async retryFailed() {
    return await emailQueueService.retryFailed();
  },
};

// Export default
export default emailModule;
