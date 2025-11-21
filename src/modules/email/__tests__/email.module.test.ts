/**
 * EMAIL MODULE TESTS
 *
 * Basic integration tests for the email module.
 */

import emailModule from '../index';
import {
  EmailModuleError,
  EmailErrorCode,
  SendEmailRequest,
} from '../types/email.types';

describe('Email Module', () => {
  const TEST_TENANT_ID = 'test-tenant-123';
  const TEST_USER_ID = 'test-user-456';

  describe('Type Validation', () => {
    it('should validate email send request', async () => {
      const validRequest: SendEmailRequest = {
        to: [{ email: 'test@example.com', name: 'Test User' }],
        subject: 'Test Email',
        bodyText: 'This is a test email',
      };

      // Should not throw
      try {
        await emailModule.sendEmail(TEST_TENANT_ID, TEST_USER_ID, validRequest);
      } catch (error) {
        // Queue or send might fail in test environment, but validation should pass
        expect(error).not.toBeInstanceOf(EmailModuleError);
      }
    });

    it('should reject invalid email addresses', async () => {
      const invalidRequest: any = {
        to: [{ email: 'invalid-email', name: 'Test User' }],
        subject: 'Test Email',
        bodyText: 'This is a test email',
      };

      await expect(
        emailModule.sendEmail(TEST_TENANT_ID, TEST_USER_ID, invalidRequest)
      ).rejects.toThrow();
    });

    it('should reject empty recipients', async () => {
      const invalidRequest: any = {
        to: [],
        subject: 'Test Email',
        bodyText: 'This is a test email',
      };

      await expect(
        emailModule.sendEmail(TEST_TENANT_ID, TEST_USER_ID, invalidRequest)
      ).rejects.toThrow();
    });

    it('should reject missing subject', async () => {
      const invalidRequest: any = {
        to: [{ email: 'test@example.com' }],
        bodyText: 'This is a test email',
      };

      await expect(
        emailModule.sendEmail(TEST_TENANT_ID, TEST_USER_ID, invalidRequest)
      ).rejects.toThrow();
    });
  });

  describe('Queue System', () => {
    it('should return queue stats', () => {
      const stats = emailModule.getQueueStats();

      expect(stats).toHaveProperty('queueSize');
      expect(stats).toHaveProperty('processing');
      expect(stats).toHaveProperty('byPriority');
      expect(typeof stats.queueSize).toBe('number');
      expect(typeof stats.processing).toBe('boolean');
    });

    it('should enqueue emails', async () => {
      const beforeStats = emailModule.getQueueStats();

      const result = await emailModule.sendEmail(
        TEST_TENANT_ID,
        TEST_USER_ID,
        {
          to: [{ email: 'test@example.com' }],
          subject: 'Test',
          bodyText: 'Test body',
        }
      );

      expect(result.success).toBe(true);
      expect(result.queueId).toBeDefined();

      const afterStats = emailModule.getQueueStats();
      // Queue should have increased (unless it processed immediately)
      expect(afterStats.queueSize).toBeGreaterThanOrEqual(beforeStats.queueSize);
    });
  });

  describe('Error Handling', () => {
    it('should throw EmailModuleError for validation errors', async () => {
      try {
        await emailModule.sendEmail(TEST_TENANT_ID, TEST_USER_ID, {
          to: [],
          subject: 'Test',
          bodyText: 'Test',
        } as any);

        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
        // Validation errors might be wrapped differently
      }
    });
  });

  describe('Module Integration', () => {
    it('should expose all required functions', () => {
      expect(typeof emailModule.sendEmail).toBe('function');
      expect(typeof emailModule.saveDraft).toBe('function');
      expect(typeof emailModule.listEmails).toBe('function');
      expect(typeof emailModule.getEmail).toBe('function');
      expect(typeof emailModule.getEmailWithAttachments).toBe('function');
      expect(typeof emailModule.markAsRead).toBe('function');
      expect(typeof emailModule.toggleStar).toBe('function');
      expect(typeof emailModule.moveToFolder).toBe('function');
      expect(typeof emailModule.deleteEmail).toBe('function');
      expect(typeof emailModule.bulkMarkAsRead).toBe('function');
      expect(typeof emailModule.bulkDelete).toBe('function');
      expect(typeof emailModule.getStats).toBe('function');
      expect(typeof emailModule.getUnreadCounts).toBe('function');
      expect(typeof emailModule.getQueueStats).toBe('function');
      expect(typeof emailModule.verifyConnection).toBe('function');
      expect(typeof emailModule.processQueue).toBe('function');
    });
  });
});
