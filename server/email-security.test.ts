/**
 * COMPREHENSIVE EMAIL SECURITY TESTS
 *
 * Tests all 8 security layers:
 * 1. XSS Prevention (HTML/Text Sanitization)
 * 2. Phishing Detection
 * 3. Rate Limiting
 * 4. Email Domain Validation
 * 5. Content Security Policy
 * 6. Input Validation (Zod)
 * 7. SQL Injection Prevention
 * 8. Audit Logging
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  sanitizeEmailHtml,
  sanitizeEmailText,
  detectPhishing,
  checkRateLimit,
  clearRateLimit,
  validateEmailAddress,
  getEmailContentCSP,
  validateUUID,
  sanitizeSearchQuery,
  checkEmailSecurity,
  logSecurityEvent,
  getSecurityEvents,
} from './email-security';

// ============================================================================
// LAYER 1: XSS PREVENTION TESTS
// ============================================================================

describe('Layer 1: XSS Prevention', () => {
  describe('sanitizeEmailHtml', () => {
    it('should remove script tags', () => {
      const malicious = '<p>Hello</p><script>alert("XSS")</script>';
      const result = sanitizeEmailHtml(malicious);
      expect(result).not.toContain('<script');
      expect(result).toContain('<p>Hello</p>');
    });

    it('should remove iframe tags', () => {
      const malicious = '<p>Content</p><iframe src="evil.com"></iframe>';
      const result = sanitizeEmailHtml(malicious);
      expect(result).not.toContain('<iframe');
      expect(result).toContain('<p>Content</p>');
    });

    it('should remove event handlers (onclick, onerror)', () => {
      const malicious = '<img src="x" onerror="alert(1)">';
      const result = sanitizeEmailHtml(malicious);
      expect(result).not.toContain('onerror');
    });

    it('should remove javascript: URLs', () => {
      const malicious = '<a href="javascript:alert(1)">Click</a>';
      const result = sanitizeEmailHtml(malicious);
      expect(result).not.toContain('javascript:');
    });

    it('should allow safe HTML tags', () => {
      const safe = '<p>Hello <strong>World</strong>!</p><ul><li>Item</li></ul>';
      const result = sanitizeEmailHtml(safe);
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>');
    });

    it('should remove data attributes', () => {
      const malicious = '<div data-evil="payload">Content</div>';
      const result = sanitizeEmailHtml(malicious);
      expect(result).not.toContain('data-evil');
    });
  });

  describe('sanitizeEmailText', () => {
    it('should escape HTML entities', () => {
      const malicious = '<script>alert("XSS")</script>';
      const result = sanitizeEmailText(malicious);
      expect(result).toContain('&lt;script&gt;');
      expect(result).not.toContain('<script>');
    });

    it('should escape quotes', () => {
      const text = 'He said "Hello"';
      const result = sanitizeEmailText(text);
      expect(result).toContain('&quot;');
    });
  });
});

// ============================================================================
// LAYER 2: PHISHING DETECTION TESTS
// ============================================================================

describe('Layer 2: Phishing Detection', () => {
  describe('detectPhishing', () => {
    it('should detect suspicious keywords', () => {
      const result = detectPhishing({
        subject: 'URGENT: Verify your account immediately!',
        textBody: 'Your account has been suspended. Click here to verify.',
        fromAddress: 'noreply@suspicious-bank.com',
      });

      expect(result.score).toBeGreaterThan(0);
      expect(result.flags.length).toBeGreaterThan(0);
      // Should detect at least one suspicious keyword
      const suspiciousKeywordFlags = result.flags.filter(f => f.includes('Suspicious keyword'));
      expect(suspiciousKeywordFlags.length).toBeGreaterThanOrEqual(1);
    });

    it('should detect IP addresses in URLs', () => {
      const result = detectPhishing({
        subject: 'Account Update',
        textBody: 'Visit http://192.168.1.1/login to update your account',
        fromAddress: 'support@company.com',
      });

      expect(result.flags.some(f => f.includes('IP address'))).toBe(true);
      expect(result.score).toBeGreaterThan(15);
    });

    it('should detect URL shorteners', () => {
      const result = detectPhishing({
        subject: 'Important Link',
        textBody: 'Click here: https://bit.ly/xyz123',
        fromAddress: 'info@company.com',
      });

      expect(result.flags.some(f => f.includes('URL shortener'))).toBe(true);
      expect(result.score).toBeGreaterThan(0);
    });

    it('should detect homograph attacks (Cyrillic chars)', () => {
      const result = detectPhishing({
        subject: 'Account Security',
        textBody: 'Visit https://аpple.com', // 'а' is Cyrillic
        fromAddress: 'security@apple.com',
      });

      expect(result.flags.some(f => f.includes('homograph'))).toBe(true);
      expect(result.score).toBeGreaterThan(20);
    });

    it('should detect mismatched link text and href', () => {
      const result = detectPhishing({
        subject: 'Update Required',
        htmlBody: '<a href="http://evil.com">http://paypal.com</a>',
        fromAddress: 'noreply@paypal.com',
      });

      expect(result.flags.some(f => f.includes('Mismatched link'))).toBe(true);
      expect(result.score).toBeGreaterThan(15);
    });

    it('should detect typosquatting domains', () => {
      const result = detectPhishing({
        subject: 'Account Notice',
        textBody: 'Please login to verify',
        fromAddress: 'support@autolytlq.com', // typo: autolytlq instead of autolytiq
      });

      expect(result.flags.some(f => f.includes('typosquatting'))).toBe(true);
      expect(result.score).toBeGreaterThan(25);
    });

    it('should pass legitimate emails', () => {
      const result = detectPhishing({
        subject: 'Your invoice is ready',
        textBody: 'Thank you for your purchase. Your invoice is attached.',
        fromAddress: 'billing@autolytiq.com',
      });

      expect(result.score).toBeLessThan(50);
      expect(result.isPhishing).toBe(false);
    });

    it('should flag high-score emails as phishing', () => {
      const result = detectPhishing({
        subject: 'URGENT: Account suspended! Verify immediately!',
        htmlBody: '<a href="http://192.168.1.1">http://paypal.com</a>',
        textBody: 'Click here to verify: https://bit.ly/urgentverify',
        fromAddress: 'support@autolytlq.com',
      });

      expect(result.score).toBeGreaterThanOrEqual(50);
      expect(result.isPhishing).toBe(true);
    });
  });
});

// ============================================================================
// LAYER 3: RATE LIMITING TESTS
// ============================================================================

describe('Layer 3: Rate Limiting', () => {
  beforeEach(() => {
    clearRateLimit('test-user');
  });

  describe('checkRateLimit', () => {
    it('should allow requests within limit', () => {
      const result = checkRateLimit('test-user', 'send', {
        maxRequests: 5,
        windowMs: 60000,
      });

      expect(result.allowed).toBe(true);
      expect(result.retryAfter).toBeUndefined();
    });

    it('should block requests exceeding limit', () => {
      const limits = { maxRequests: 3, windowMs: 60000 };

      // Make 3 requests (at limit)
      for (let i = 0; i < 3; i++) {
        checkRateLimit('test-user', 'send', limits);
      }

      // 4th request should be blocked
      const result = checkRateLimit('test-user', 'send', limits);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should reset after window expires', () => {
      const limits = { maxRequests: 2, windowMs: 100 }; // 100ms window

      // Exhaust limit
      checkRateLimit('test-user', 'send', limits);
      checkRateLimit('test-user', 'send', limits);

      // Should be blocked
      let result = checkRateLimit('test-user', 'send', limits);
      expect(result.allowed).toBe(false);

      // Wait for window to expire
      return new Promise<void>(resolve => {
        setTimeout(() => {
          result = checkRateLimit('test-user', 'send', limits);
          expect(result.allowed).toBe(true);
          resolve();
        }, 150);
      });
    });

    it('should handle different actions separately', () => {
      const limits = { maxRequests: 2, windowMs: 60000 };

      // Exhaust 'send' limit
      checkRateLimit('test-user', 'send', limits);
      checkRateLimit('test-user', 'send', limits);

      // 'read' should still be allowed
      const readResult = checkRateLimit('test-user', 'read', limits);
      expect(readResult.allowed).toBe(true);

      // 'send' should be blocked
      const sendResult = checkRateLimit('test-user', 'send', limits);
      expect(sendResult.allowed).toBe(false);
    });

    it('should handle different users separately', () => {
      const limits = { maxRequests: 2, windowMs: 60000 };

      // Exhaust user1's limit
      checkRateLimit('user1', 'send', limits);
      checkRateLimit('user1', 'send', limits);

      // user2 should still be allowed
      const result = checkRateLimit('user2', 'send', limits);
      expect(result.allowed).toBe(true);
    });
  });

  describe('clearRateLimit', () => {
    it('should clear specific action for user', () => {
      const limits = { maxRequests: 1, windowMs: 60000 };

      // Exhaust limit
      checkRateLimit('test-user', 'send', limits);
      let result = checkRateLimit('test-user', 'send', limits);
      expect(result.allowed).toBe(false);

      // Clear and retry
      clearRateLimit('test-user', 'send');
      result = checkRateLimit('test-user', 'send', limits);
      expect(result.allowed).toBe(true);
    });

    it('should clear all actions for user', () => {
      const limits = { maxRequests: 1, windowMs: 60000 };

      // Exhaust multiple actions
      checkRateLimit('test-user', 'send', limits);
      checkRateLimit('test-user', 'read', limits);

      // Clear all
      clearRateLimit('test-user');

      // Both should be allowed
      expect(checkRateLimit('test-user', 'send', limits).allowed).toBe(true);
      expect(checkRateLimit('test-user', 'read', limits).allowed).toBe(true);
    });
  });
});

// ============================================================================
// LAYER 4: EMAIL DOMAIN VALIDATION TESTS
// ============================================================================

describe('Layer 4: Email Domain Validation', () => {
  describe('validateEmailAddress', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'john.doe@company.co.uk',
        'admin+test@autolytiq.com',
      ];

      validEmails.forEach(email => {
        const result = validateEmailAddress(email);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'user@',
        'user @example.com',
      ];

      invalidEmails.forEach(email => {
        const result = validateEmailAddress(email);
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Invalid email format');
      });
    });

    it('should reject disposable email domains', () => {
      const disposableEmails = [
        'test@tempmail.com',
        'user@10minutemail.com',
        'spam@mailinator.com',
      ];

      disposableEmails.forEach(email => {
        const result = validateEmailAddress(email);
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Disposable email address not allowed');
      });
    });

    it('should reject emails with missing TLD', () => {
      const result = validateEmailAddress('user@domain');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid email format');
    });
  });
});

// ============================================================================
// LAYER 5: CONTENT SECURITY POLICY TESTS
// ============================================================================

describe('Layer 5: Content Security Policy', () => {
  describe('getEmailContentCSP', () => {
    it('should return strict CSP headers', () => {
      const csp = getEmailContentCSP();

      expect(csp).toContain("default-src 'none'");
      expect(csp).toContain("script-src 'none'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("frame-src 'none'");
      expect(csp).toContain("form-action 'none'");
    });

    it('should allow safe image sources', () => {
      const csp = getEmailContentCSP();
      expect(csp).toContain("img-src 'self' https: data:");
    });

    it('should allow inline styles (for email rendering)', () => {
      const csp = getEmailContentCSP();
      expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    });
  });
});

// ============================================================================
// LAYER 6: INPUT VALIDATION TESTS (Covered by Zod schemas)
// ============================================================================

// Note: Zod schema tests are handled in the route tests

// ============================================================================
// LAYER 7: SQL INJECTION PREVENTION TESTS
// ============================================================================

describe('Layer 7: SQL Injection Prevention', () => {
  describe('validateUUID', () => {
    it('should accept valid UUIDs', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        '550e8400-e29b-41d4-a716-446655440000',
      ];

      validUUIDs.forEach(uuid => {
        expect(validateUUID(uuid)).toBe(true);
      });
    });

    it('should reject invalid UUIDs', () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '123',
        '123e4567-e89b-12d3-a456',
        '123e4567-e89b-12d3-a456-42661417400G', // Invalid char 'G'
        "'; DROP TABLE users; --",
      ];

      invalidUUIDs.forEach(uuid => {
        expect(validateUUID(uuid)).toBe(false);
      });
    });
  });

  describe('sanitizeSearchQuery', () => {
    it('should remove SQL special characters', () => {
      const malicious = "'; DROP TABLE users; --";
      const result = sanitizeSearchQuery(malicious);

      expect(result).not.toContain(';');
      expect(result).not.toContain("'");
      expect(result).not.toContain('--');
    });

    it('should remove SQL comment syntax', () => {
      const malicious = "test /* comment */ value";
      const result = sanitizeSearchQuery(malicious);

      expect(result).not.toContain('/*');
    });

    it('should limit query length', () => {
      const longQuery = 'a'.repeat(200);
      const result = sanitizeSearchQuery(longQuery);

      expect(result.length).toBeLessThanOrEqual(100);
    });

    it('should trim whitespace', () => {
      const query = '  search term  ';
      const result = sanitizeSearchQuery(query);

      expect(result).toBe('search term');
    });

    it('should allow safe search terms', () => {
      const safe = 'john doe customer';
      const result = sanitizeSearchQuery(safe);

      expect(result).toBe(safe);
    });
  });
});

// ============================================================================
// LAYER 8: AUDIT LOGGING TESTS
// ============================================================================

describe('Layer 8: Audit Logging', () => {
  describe('logSecurityEvent', () => {
    it('should log security events', () => {
      const event = {
        timestamp: new Date(),
        userId: 'user-123',
        dealershipId: 'dealer-456',
        action: 'email_send_blocked',
        severity: 'high' as const,
        details: { reason: 'phishing detected' },
      };

      // Should not throw
      expect(() => logSecurityEvent(event)).not.toThrow();
    });

    it('should store events for retrieval', () => {
      const event = {
        timestamp: new Date(),
        userId: 'user-789',
        dealershipId: 'dealer-123',
        action: 'test_action',
        severity: 'low' as const,
        details: { test: true },
      };

      logSecurityEvent(event);

      const events = getSecurityEvents({ userId: 'user-789' });
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].action).toBe('test_action');
    });
  });

  describe('getSecurityEvents', () => {
    beforeEach(() => {
      // Clear events by logging and retrieving (no clear method exposed)
      logSecurityEvent({
        timestamp: new Date(),
        userId: 'test-user-1',
        dealershipId: 'dealer-1',
        action: 'test_action_1',
        severity: 'low',
        details: {},
      });
    });

    it('should filter by userId', () => {
      logSecurityEvent({
        timestamp: new Date(),
        userId: 'user-a',
        dealershipId: 'dealer-1',
        action: 'action_1',
        severity: 'low',
        details: {},
      });

      logSecurityEvent({
        timestamp: new Date(),
        userId: 'user-b',
        dealershipId: 'dealer-1',
        action: 'action_2',
        severity: 'low',
        details: {},
      });

      const events = getSecurityEvents({ userId: 'user-a' });
      expect(events.every(e => e.userId === 'user-a')).toBe(true);
    });

    it('should filter by dealershipId', () => {
      logSecurityEvent({
        timestamp: new Date(),
        userId: 'user-1',
        dealershipId: 'dealer-a',
        action: 'action_1',
        severity: 'low',
        details: {},
      });

      const events = getSecurityEvents({ dealershipId: 'dealer-a' });
      expect(events.every(e => e.dealershipId === 'dealer-a')).toBe(true);
    });

    it('should filter by severity', () => {
      logSecurityEvent({
        timestamp: new Date(),
        userId: 'user-1',
        dealershipId: 'dealer-1',
        action: 'critical_action',
        severity: 'critical',
        details: {},
      });

      const events = getSecurityEvents({ severity: 'critical' });
      expect(events.every(e => e.severity === 'critical')).toBe(true);
    });

    it('should respect limit parameter', () => {
      // Log multiple events
      for (let i = 0; i < 10; i++) {
        logSecurityEvent({
          timestamp: new Date(),
          userId: 'user-1',
          dealershipId: 'dealer-1',
          action: `action_${i}`,
          severity: 'low',
          details: {},
        });
      }

      const events = getSecurityEvents({ limit: 5 });
      expect(events.length).toBeLessThanOrEqual(5);
    });
  });
});

// ============================================================================
// COMPREHENSIVE SECURITY CHECK TESTS
// ============================================================================

describe('Comprehensive Security Check', () => {
  describe('checkEmailSecurity', () => {
    it('should pass safe emails', () => {
      const result = checkEmailSecurity({
        subject: 'Invoice #12345',
        htmlBody: '<p>Thank you for your purchase!</p>',
        textBody: 'Thank you for your purchase!',
        fromAddress: 'billing@autolytiq.com',
        toAddresses: [{ email: 'customer@example.com' }],
      });

      expect(result.safe).toBe(true);
      expect(result.blockedReasons).toHaveLength(0);
      expect(result.sanitizedHtml).toBeDefined();
      expect(result.sanitizedText).toBeDefined();
    });

    it('should block emails with phishing', () => {
      const result = checkEmailSecurity({
        subject: 'URGENT: Verify your account immediately!',
        htmlBody: '<a href="http://192.168.1.1">Click here</a>',
        textBody: 'Verify your account now at https://bit.ly/verify',
        fromAddress: 'support@autolytlq.com',
        toAddresses: [{ email: 'victim@example.com' }],
      });

      expect(result.safe).toBe(false);
      expect(result.blockedReasons.length).toBeGreaterThan(0);
      expect(result.phishingAnalysis.isPhishing).toBe(true);
    });

    it('should block emails with invalid recipients', () => {
      const result = checkEmailSecurity({
        subject: 'Test',
        textBody: 'Test content',
        fromAddress: 'sender@autolytiq.com',
        toAddresses: [{ email: 'not-an-email' }],
      });

      expect(result.safe).toBe(false);
      expect(result.blockedReasons.some(r => r.includes('Invalid recipient'))).toBe(true);
    });

    it('should sanitize HTML content', () => {
      const result = checkEmailSecurity({
        subject: 'Newsletter',
        htmlBody: '<p>Hello</p><script>alert("XSS")</script>',
        textBody: 'Hello',
        fromAddress: 'newsletter@autolytiq.com',
        toAddresses: [{ email: 'subscriber@example.com' }],
      });

      expect(result.sanitizedHtml).not.toContain('<script>');
      expect(result.sanitizedHtml).toContain('<p>Hello</p>');
    });

    it('should warn about suspicious but not blocking content', () => {
      const result = checkEmailSecurity({
        subject: 'Password reset requested',
        htmlBody: '<p>Click here to reset your password</p>',
        textBody: 'Click here to reset your password',
        fromAddress: 'noreply@autolytiq.com',
        toAddresses: [{ email: 'user@example.com' }],
      });

      // Should pass but may have warnings
      expect(result.safe).toBe(true);
      // Phishing score might be elevated but not blocking
      expect(result.phishingAnalysis.score).toBeLessThan(50);
    });

    it('should warn when significant HTML is removed', () => {
      const maliciousHtml = '<p>Content</p>' + '<script>'.repeat(50) + 'alert(1)' + '</script>'.repeat(50);

      const result = checkEmailSecurity({
        subject: 'Test',
        htmlBody: maliciousHtml,
        textBody: 'Content',
        fromAddress: 'sender@example.com',
        toAddresses: [{ email: 'recipient@example.com' }],
      });

      expect(result.warnings.some(w => w.includes('dangerous HTML content'))).toBe(true);
    });
  });
});
