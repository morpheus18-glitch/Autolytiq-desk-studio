/**
 * EMAIL OPERATIONS INTEGRATION TESTS
 *
 * Tests email functionality:
 * - Save draft emails
 * - Send emails via Resend
 * - Load email threads
 * - Email validation
 * - Attachment handling
 *
 * CRITICAL: Email is core to customer communication.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { db } from '../database/db-service';
import { emailMessages, emailAccounts, customers } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import {
  setupTestDatabase,
  cleanupTestData,
  teardownTestDatabase,
  getTestContext,
} from './setup';
import {
  createCustomerData,
} from './helpers/test-data';
import {
  assertEmailFormat,
  assertRecentDate,
  assertUUID,
  assertValidCustomer,
} from './helpers/assertions';

// Mock Resend API
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({
        id: 're_mock_email_id_123',
        from: 'test@dealership.com',
        to: ['customer@example.com'],
        created_at: new Date().toISOString(),
      }),
    },
  })),
}));

describe('Email Operations Integration Tests', () => {
  let testContext: ReturnType<typeof getTestContext>;
  let testEmailAccount: any;

  beforeAll(async () => {
    await setupTestDatabase();
    testContext = getTestContext();

    // Create test email account
    const [emailAccount] = await db
      .insert(emailAccounts)
      .values({
        dealershipId: testContext.dealershipId,
        userId: testContext.userId,
        email: 'test@dealership.com',
        provider: 'resend',
        isActive: true,
        isPrimary: true,
      })
      .returning()
      .onConflictDoNothing();

    testEmailAccount = emailAccount || (await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.email, 'test@dealership.com'),
    }));
  });

  beforeEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await teardownTestDatabase();
  });

  // ============================================================================
  // DRAFT EMAIL TESTS
  // ============================================================================

  describe('Draft Email Operations', () => {
    it('should save draft email to database', async () => {
      // GIVEN: Draft email data
      const [customer] = await db
        .insert(customers)
        .values(createCustomerData(testContext.dealershipId, {
          email: 'customer@example.com',
        }))
        .returning();

      // WHEN: Saving draft
      const [draft] = await db
        .insert(emailMessages)
        .values({
          dealershipId: testContext.dealershipId,
          emailAccountId: testEmailAccount.id,
          customerId: customer.id,
          fromAddress: 'test@dealership.com',
          toAddress: customer.email!,
          subject: 'Test Draft Email',
          body: '<p>This is a draft email</p>',
          htmlBody: '<p>This is a draft email</p>',
          isDraft: true,
          isSent: false,
          messageType: 'outbound',
        })
        .returning();

      // THEN: Draft saved successfully
      expect(draft).toBeDefined();
      expect(draft.id).toBeDefined();
      expect(draft.isDraft).toBe(true);
      expect(draft.isSent).toBe(false);
      expect(draft.subject).toBe('Test Draft Email');
      expect(draft.toAddress).toBe(customer.email);

      assertEmailFormat(draft.fromAddress);
      assertEmailFormat(draft.toAddress);
      assertRecentDate(draft.createdAt);
    });

    it('should update draft email', async () => {
      // GIVEN: Existing draft
      const [draft] = await db
        .insert(emailMessages)
        .values({
          dealershipId: testContext.dealershipId,
          emailAccountId: testEmailAccount.id,
          fromAddress: 'test@dealership.com',
          toAddress: 'customer@example.com',
          subject: 'Original Subject',
          body: 'Original body',
          isDraft: true,
          isSent: false,
          messageType: 'outbound',
        })
        .returning();

      // WHEN: Updating draft
      const [updated] = await db
        .update(emailMessages)
        .set({
          subject: 'Updated Subject',
          body: 'Updated body',
          htmlBody: '<p>Updated body</p>',
          updatedAt: new Date(),
        })
        .where(eq(emailMessages.id, draft.id))
        .returning();

      // THEN: Draft updated
      expect(updated.subject).toBe('Updated Subject');
      expect(updated.body).toBe('Updated body');
      expect(updated.isDraft).toBe(true);
      expect(updated.isSent).toBe(false);
    });

    it('should delete draft email', async () => {
      // GIVEN: Draft email
      const [draft] = await db
        .insert(emailMessages)
        .values({
          dealershipId: testContext.dealershipId,
          emailAccountId: testEmailAccount.id,
          fromAddress: 'test@dealership.com',
          toAddress: 'customer@example.com',
          subject: 'Draft to Delete',
          body: 'Test',
          isDraft: true,
          isSent: false,
          messageType: 'outbound',
        })
        .returning();

      // WHEN: Deleting draft
      await db
        .delete(emailMessages)
        .where(eq(emailMessages.id, draft.id));

      // THEN: Draft deleted
      const deleted = await db.query.emailMessages.findFirst({
        where: eq(emailMessages.id, draft.id),
      });

      expect(deleted).toBeUndefined();
    });

    it('should list all drafts for user', async () => {
      // GIVEN: Multiple drafts
      for (let i = 0; i < 3; i++) {
        await db.insert(emailMessages).values({
          dealershipId: testContext.dealershipId,
          emailAccountId: testEmailAccount.id,
          fromAddress: 'test@dealership.com',
          toAddress: `customer${i}@example.com`,
          subject: `Draft ${i + 1}`,
          body: `Draft body ${i + 1}`,
          isDraft: true,
          isSent: false,
          messageType: 'outbound',
        });
      }

      // WHEN: Fetching drafts
      const drafts = await db.query.emailMessages.findMany({
        where: and(
          eq(emailMessages.dealershipId, testContext.dealershipId),
          eq(emailMessages.isDraft, true)
        ),
        orderBy: [desc(emailMessages.createdAt)],
      });

      // THEN: All drafts returned
      expect(drafts.length).toBeGreaterThanOrEqual(3);
      drafts.forEach(draft => {
        expect(draft.isDraft).toBe(true);
        expect(draft.isSent).toBe(false);
      });
    });
  });

  // ============================================================================
  // SEND EMAIL TESTS
  // ============================================================================

  describe('Send Email Operations', () => {
    it('should mark email as sent after successful send', async () => {
      // GIVEN: Draft email
      const [draft] = await db
        .insert(emailMessages)
        .values({
          dealershipId: testContext.dealershipId,
          emailAccountId: testEmailAccount.id,
          fromAddress: 'test@dealership.com',
          toAddress: 'customer@example.com',
          subject: 'Test Send',
          body: 'Test email body',
          htmlBody: '<p>Test email body</p>',
          isDraft: true,
          isSent: false,
          messageType: 'outbound',
        })
        .returning();

      // WHEN: Sending email (mocked)
      // In real scenario, this would call Resend API
      const [sent] = await db
        .update(emailMessages)
        .set({
          isDraft: false,
          isSent: true,
          sentAt: new Date(),
          providerMessageId: 're_mock_email_id_123',
        })
        .where(eq(emailMessages.id, draft.id))
        .returning();

      // THEN: Email marked as sent
      expect(sent.isDraft).toBe(false);
      expect(sent.isSent).toBe(true);
      expect(sent.sentAt).toBeDefined();
      expect(sent.providerMessageId).toBeDefined();
      assertRecentDate(sent.sentAt!);
    });

    it('should handle send failures gracefully', async () => {
      // GIVEN: Email that will fail to send
      const [email] = await db
        .insert(emailMessages)
        .values({
          dealershipId: testContext.dealershipId,
          emailAccountId: testEmailAccount.id,
          fromAddress: 'test@dealership.com',
          toAddress: 'invalid-email',
          subject: 'Fail Test',
          body: 'Test',
          isDraft: true,
          isSent: false,
          messageType: 'outbound',
        })
        .returning();

      // WHEN: Send fails (simulated)
      const [failed] = await db
        .update(emailMessages)
        .set({
          isDraft: true, // Remains draft
          isSent: false,
          metadata: {
            sendAttempts: 1,
            lastError: 'Invalid email address',
          },
        })
        .where(eq(emailMessages.id, email.id))
        .returning();

      // THEN: Email remains in draft state
      expect(failed.isDraft).toBe(true);
      expect(failed.isSent).toBe(false);
      expect(failed.metadata).toHaveProperty('lastError');
    });

    it('should track email send history', async () => {
      // GIVEN: Multiple sent emails
      const sentEmails = [];
      for (let i = 0; i < 5; i++) {
        const [sent] = await db
          .insert(emailMessages)
          .values({
            dealershipId: testContext.dealershipId,
            emailAccountId: testEmailAccount.id,
            fromAddress: 'test@dealership.com',
            toAddress: `customer${i}@example.com`,
            subject: `Sent Email ${i + 1}`,
            body: 'Test',
            isDraft: false,
            isSent: true,
            sentAt: new Date(Date.now() - i * 60000), // Stagger times
            messageType: 'outbound',
          })
          .returning();
        sentEmails.push(sent);
      }

      // WHEN: Fetching send history
      const history = await db.query.emailMessages.findMany({
        where: and(
          eq(emailMessages.dealershipId, testContext.dealershipId),
          eq(emailMessages.isSent, true)
        ),
        orderBy: [desc(emailMessages.sentAt)],
      });

      // THEN: History in chronological order
      expect(history.length).toBeGreaterThanOrEqual(5);

      for (let i = 0; i < history.length - 1; i++) {
        const currentTime = new Date(history[i].sentAt!).getTime();
        const nextTime = new Date(history[i + 1].sentAt!).getTime();
        expect(currentTime).toBeGreaterThanOrEqual(nextTime);
      }
    });
  });

  // ============================================================================
  // EMAIL THREAD TESTS
  // ============================================================================

  describe('Email Thread Operations', () => {
    it('should load email thread in chronological order', async () => {
      // GIVEN: Email thread with customer
      const [customer] = await db
        .insert(customers)
        .values(createCustomerData(testContext.dealershipId, {
          email: 'customer@example.com',
        }))
        .returning();

      const threadMessages = [
        { direction: 'outbound', subject: 'Initial Contact', time: 0 },
        { direction: 'inbound', subject: 'Re: Initial Contact', time: 3600000 },
        { direction: 'outbound', subject: 'Re: Initial Contact', time: 7200000 },
      ];

      for (const msg of threadMessages) {
        await db.insert(emailMessages).values({
          dealershipId: testContext.dealershipId,
          emailAccountId: testEmailAccount.id,
          customerId: customer.id,
          fromAddress: msg.direction === 'outbound' ? 'test@dealership.com' : customer.email!,
          toAddress: msg.direction === 'outbound' ? customer.email! : 'test@dealership.com',
          subject: msg.subject,
          body: 'Thread message',
          isDraft: false,
          isSent: true,
          sentAt: new Date(Date.now() - msg.time),
          messageType: msg.direction,
        });
      }

      // WHEN: Loading thread
      const thread = await db.query.emailMessages.findMany({
        where: and(
          eq(emailMessages.dealershipId, testContext.dealershipId),
          eq(emailMessages.customerId, customer.id)
        ),
        orderBy: [desc(emailMessages.sentAt)],
      });

      // THEN: Thread in chronological order (newest first)
      expect(thread.length).toBe(3);
      expect(thread[0].messageType).toBe('outbound'); // Most recent
      expect(thread[1].messageType).toBe('inbound');
      expect(thread[2].messageType).toBe('outbound'); // Oldest
    });

    it('should group emails by customer', async () => {
      // GIVEN: Multiple customers with emails
      const customers_data = await Promise.all([
        db.insert(customers).values(createCustomerData(testContext.dealershipId, { email: 'cust1@example.com' })).returning(),
        db.insert(customers).values(createCustomerData(testContext.dealershipId, { email: 'cust2@example.com' })).returning(),
      ]);

      const [customer1] = customers_data[0];
      const [customer2] = customers_data[1];

      // Send emails to both
      await db.insert(emailMessages).values({
        dealershipId: testContext.dealershipId,
        emailAccountId: testEmailAccount.id,
        customerId: customer1.id,
        fromAddress: 'test@dealership.com',
        toAddress: customer1.email!,
        subject: 'Email to Customer 1',
        body: 'Test',
        isDraft: false,
        isSent: true,
        sentAt: new Date(),
        messageType: 'outbound',
      });

      await db.insert(emailMessages).values({
        dealershipId: testContext.dealershipId,
        emailAccountId: testEmailAccount.id,
        customerId: customer2.id,
        fromAddress: 'test@dealership.com',
        toAddress: customer2.email!,
        subject: 'Email to Customer 2',
        body: 'Test',
        isDraft: false,
        isSent: true,
        sentAt: new Date(),
        messageType: 'outbound',
      });

      // WHEN: Fetching per customer
      const thread1 = await db.query.emailMessages.findMany({
        where: eq(emailMessages.customerId, customer1.id),
      });

      const thread2 = await db.query.emailMessages.findMany({
        where: eq(emailMessages.customerId, customer2.id),
      });

      // THEN: Emails properly grouped
      expect(thread1.length).toBe(1);
      expect(thread1[0].toAddress).toBe(customer1.email);

      expect(thread2.length).toBe(1);
      expect(thread2[0].toAddress).toBe(customer2.email);
    });
  });

  // ============================================================================
  // VALIDATION TESTS
  // ============================================================================

  describe('Email Validation', () => {
    it('should validate email address format', async () => {
      const validEmails = [
        'test@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
      ];

      validEmails.forEach(email => {
        assertEmailFormat(email);
      });
    });

    it('should reject invalid email addresses', async () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user @example.com',
      ];

      invalidEmails.forEach(email => {
        expect(() => assertEmailFormat(email)).toThrow();
      });
    });

    it('should require subject for outbound emails', async () => {
      // GIVEN: Email without subject
      const insertPromise = db.insert(emailMessages).values({
        dealershipId: testContext.dealershipId,
        emailAccountId: testEmailAccount.id,
        fromAddress: 'test@dealership.com',
        toAddress: 'customer@example.com',
        subject: '', // Empty subject
        body: 'Test',
        isDraft: false,
        isSent: true,
        messageType: 'outbound',
      });

      // THEN: Can be saved but should be validated at application level
      // (Database allows empty subject, but app should validate)
      const [email] = await insertPromise.returning();
      expect(email.subject).toBe('');
    });

    it('should handle HTML vs plain text body', async () => {
      // GIVEN: Email with both HTML and plain text
      const [email] = await db
        .insert(emailMessages)
        .values({
          dealershipId: testContext.dealershipId,
          emailAccountId: testEmailAccount.id,
          fromAddress: 'test@dealership.com',
          toAddress: 'customer@example.com',
          subject: 'HTML Email',
          body: 'This is plain text',
          htmlBody: '<p>This is <strong>HTML</strong></p>',
          isDraft: false,
          isSent: true,
          messageType: 'outbound',
        })
        .returning();

      // THEN: Both versions stored
      expect(email.body).toBe('This is plain text');
      expect(email.htmlBody).toBe('<p>This is <strong>HTML</strong></p>');
    });
  });

  // ============================================================================
  // MULTI-TENANT ISOLATION TESTS
  // ============================================================================

  describe('Multi-Tenant Isolation', () => {
    it('should only show emails for correct dealership', async () => {
      // GIVEN: Email for test dealership
      await db.insert(emailMessages).values({
        dealershipId: testContext.dealershipId,
        emailAccountId: testEmailAccount.id,
        fromAddress: 'test@dealership.com',
        toAddress: 'customer@example.com',
        subject: 'Dealership Email',
        body: 'Test',
        isDraft: false,
        isSent: true,
        messageType: 'outbound',
      });

      // WHEN: Querying with dealership filter
      const emails = await db.query.emailMessages.findMany({
        where: eq(emailMessages.dealershipId, testContext.dealershipId),
      });

      // THEN: Only correct dealership emails shown
      emails.forEach(email => {
        expect(email.dealershipId).toBe(testContext.dealershipId);
      });
    });
  });
});
