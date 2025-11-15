/**
 * EMAIL SECURITY LAYER - AIRLOCK SYSTEM
 *
 * Multi-layered security to prevent phishing, XSS, SQL injection,
 * and unauthorized access between email → app → database.
 *
 * Security Layers:
 * 1. Email Content Sanitization (XSS prevention)
 * 2. Phishing Detection
 * 3. Rate Limiting & Abuse Prevention
 * 4. Email Domain Validation
 * 5. Content Security Policy
 * 6. SQL Injection Prevention (parameterized queries)
 * 7. Authentication & Authorization
 */

import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';
import { z } from 'zod';

// ============================================================================
// LAYER 1: EMAIL CONTENT SANITIZATION (XSS Prevention)
// ============================================================================

/**
 * Sanitize HTML content to prevent XSS attacks
 * Removes scripts, iframes, dangerous attributes
 */
export function sanitizeEmailHtml(html: string): string {
  // DOMPurify configuration for email content
  const config = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'pre', 'code',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'id', 'style',
      'width', 'height', 'align', 'target'
    ],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    ALLOW_DATA_ATTR: false,
  };

  return DOMPurify.sanitize(html, config);
}

/**
 * Sanitize plain text (escape HTML entities)
 */
export function sanitizeEmailText(text: string): string {
  return validator.escape(text);
}

// ============================================================================
// LAYER 2: PHISHING DETECTION
// ============================================================================

/**
 * Detect potential phishing attempts in email content
 */
export interface PhishingAnalysis {
  isPhishing: boolean;
  score: number; // 0-100, higher = more suspicious
  flags: string[];
}

export function detectPhishing(email: {
  subject: string;
  htmlBody?: string;
  textBody?: string;
  fromAddress: string;
}): PhishingAnalysis {
  const flags: string[] = [];
  let score = 0;

  // Check for suspicious keywords
  const suspiciousKeywords = [
    'verify your account', 'suspended account', 'confirm your identity',
    'urgent action required', 'click here immediately', 'reset password',
    'billing problem', 'unauthorized access', 'account locked',
    'verify payment', 'update payment method', 'unusual activity'
  ];

  const content = `${email.subject} ${email.textBody || ''} ${email.htmlBody || ''}`.toLowerCase();

  for (const keyword of suspiciousKeywords) {
    if (content.includes(keyword)) {
      flags.push(`Suspicious keyword: ${keyword}`);
      score += 15;
    }
  }

  // Check for suspicious URLs
  const urlRegex = /https?:\/\/[^\s]+/gi;
  const urls = content.match(urlRegex) || [];

  for (const url of urls) {
    // Check for IP addresses in URLs (common in phishing)
    if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(url)) {
      flags.push('URL contains IP address');
      score += 20;
    }

    // Check for URL shorteners (can hide malicious links)
    const shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly'];
    if (shorteners.some(s => url.includes(s))) {
      flags.push('URL shortener detected');
      score += 10;
    }

    // Check for homograph attacks (lookalike domains)
    if (/[а-яА-Я]/.test(url)) { // Cyrillic characters
      flags.push('Possible homograph attack (Cyrillic chars in URL)');
      score += 25;
    }
  }

  // Check for mismatched display text vs actual link
  if (email.htmlBody) {
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi;
    let match;
    while ((match = linkRegex.exec(email.htmlBody)) !== null) {
      const href = match[1];
      const text = match[2];

      if (text.includes('http') && !href.includes(text)) {
        flags.push('Mismatched link text and href');
        score += 20;
      }
    }
  }

  // Check sender domain authenticity
  const fromDomain = email.fromAddress.split('@')[1];
  const trustedDomains = ['autolytiq.com', 'gmail.com', 'outlook.com'];

  if (!trustedDomains.includes(fromDomain)) {
    // Check for typosquatting (e.g., "autolytlq.com")
    for (const trusted of trustedDomains) {
      const distance = levenshteinDistance(fromDomain, trusted);
      if (distance > 0 && distance <= 2) {
        flags.push(`Possible typosquatting: ${fromDomain} similar to ${trusted}`);
        score += 30;
      }
    }
  }

  return {
    isPhishing: score >= 50,
    score: Math.min(score, 100),
    flags,
  };
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// ============================================================================
// LAYER 3: RATE LIMITING & ABUSE PREVENTION
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check if user has exceeded rate limit
 */
export function checkRateLimit(
  userId: string,
  action: 'send' | 'read' | 'delete',
  limits: { maxRequests: number; windowMs: number }
): { allowed: boolean; retryAfter?: number } {
  const key = `${userId}:${action}`;
  const now = Date.now();

  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // Reset or create new entry
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + limits.windowMs,
    });
    return { allowed: true };
  }

  if (entry.count >= limits.maxRequests) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    };
  }

  entry.count++;
  return { allowed: true };
}

/**
 * Clear rate limit for a user (useful for testing)
 */
export function clearRateLimit(userId: string, action?: string) {
  if (action) {
    rateLimitStore.delete(`${userId}:${action}`);
  } else {
    // Clear all actions for this user
    for (const key of rateLimitStore.keys()) {
      if (key.startsWith(`${userId}:`)) {
        rateLimitStore.delete(key);
      }
    }
  }
}

// ============================================================================
// LAYER 4: EMAIL DOMAIN VALIDATION
// ============================================================================

/**
 * Validate email address format and domain
 */
export function validateEmailAddress(email: string): {
  valid: boolean;
  reason?: string;
} {
  // Basic format validation
  if (!validator.isEmail(email)) {
    return { valid: false, reason: 'Invalid email format' };
  }

  // Check for disposable/temporary email domains
  const disposableDomains = [
    'tempmail.com', 'guerrillamail.com', '10minutemail.com',
    'throwaway.email', 'mailinator.com', 'trashmail.com'
  ];

  const domain = email.split('@')[1];
  if (disposableDomains.includes(domain)) {
    return { valid: false, reason: 'Disposable email address not allowed' };
  }

  // Check for valid TLD
  const tld = domain.split('.').pop();
  if (!tld || tld.length < 2) {
    return { valid: false, reason: 'Invalid top-level domain' };
  }

  return { valid: true };
}

// ============================================================================
// LAYER 5: CONTENT SECURITY POLICY
// ============================================================================

/**
 * Generate CSP headers for email content iframe
 */
export function getEmailContentCSP(): string {
  return [
    "default-src 'none'",
    "img-src 'self' https: data:",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "script-src 'none'",
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');
}

// ============================================================================
// LAYER 6: INPUT VALIDATION SCHEMAS (Zod)
// ============================================================================

/**
 * Validate email sending input
 */
export const emailSendSchema = z.object({
  to: z.array(
    z.object({
      email: z.string().email('Invalid email address'),
      name: z.string().optional(),
    })
  ).min(1, 'At least one recipient required').max(50, 'Too many recipients'),

  cc: z.array(
    z.object({
      email: z.string().email(),
      name: z.string().optional(),
    })
  ).max(50).optional(),

  bcc: z.array(
    z.object({
      email: z.string().email(),
      name: z.string().optional(),
    })
  ).max(50).optional(),

  subject: z.string()
    .min(1, 'Subject required')
    .max(200, 'Subject too long')
    .refine(
      (s) => !/<script|javascript:|onerror=/i.test(s),
      'Invalid characters in subject'
    ),

  textBody: z.string().max(100000, 'Email body too large').optional(),
  htmlBody: z.string().max(100000, 'Email body too large').optional(),

  customerId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
});

// ============================================================================
// LAYER 7: DATABASE QUERY SAFETY
// ============================================================================

/**
 * Validate UUID to prevent SQL injection
 */
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Sanitize search query to prevent SQL injection
 */
export function sanitizeSearchQuery(query: string): string {
  // Remove SQL keywords and special characters
  return query
    .replace(/[;'"\\]/g, '') // Remove SQL special chars
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove SQL block comments
    .trim()
    .slice(0, 100); // Limit length
}

// ============================================================================
// LAYER 8: AUDIT LOGGING
// ============================================================================

export interface EmailSecurityEvent {
  timestamp: Date;
  userId: string;
  dealershipId: string;
  action: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

const securityEventLog: EmailSecurityEvent[] = [];

/**
 * Log security event
 */
export function logSecurityEvent(event: EmailSecurityEvent) {
  securityEventLog.push(event);

  // In production, send to monitoring service (e.g., Sentry, DataDog)
  if (event.severity === 'critical' || event.severity === 'high') {
    console.error('[EMAIL SECURITY]', event);
  } else {
    console.warn('[EMAIL SECURITY]', event);
  }

  // Keep only last 1000 events in memory
  if (securityEventLog.length > 1000) {
    securityEventLog.shift();
  }
}

/**
 * Get recent security events
 */
export function getSecurityEvents(
  filters?: {
    userId?: string;
    dealershipId?: string;
    severity?: string;
    limit?: number;
  }
): EmailSecurityEvent[] {
  let events = securityEventLog;

  if (filters?.userId) {
    events = events.filter(e => e.userId === filters.userId);
  }

  if (filters?.dealershipId) {
    events = events.filter(e => e.dealershipId === filters.dealershipId);
  }

  if (filters?.severity) {
    events = events.filter(e => e.severity === filters.severity);
  }

  return events.slice(0, filters?.limit || 100);
}

// ============================================================================
// COMPREHENSIVE EMAIL SECURITY CHECK
// ============================================================================

export interface EmailSecurityCheckResult {
  safe: boolean;
  sanitizedHtml?: string;
  sanitizedText?: string;
  phishingAnalysis: PhishingAnalysis;
  blockedReasons: string[];
  warnings: string[];
}

/**
 * Run comprehensive security check on email
 */
export function checkEmailSecurity(email: {
  subject: string;
  htmlBody?: string;
  textBody?: string;
  fromAddress: string;
  toAddresses: Array<{ email: string }>;
}): EmailSecurityCheckResult {
  const blockedReasons: string[] = [];
  const warnings: string[] = [];

  // 1. Validate email addresses
  for (const recipient of email.toAddresses) {
    const validation = validateEmailAddress(recipient.email);
    if (!validation.valid) {
      blockedReasons.push(`Invalid recipient: ${recipient.email} - ${validation.reason}`);
    }
  }

  const senderValidation = validateEmailAddress(email.fromAddress);
  if (!senderValidation.valid) {
    blockedReasons.push(`Invalid sender: ${email.fromAddress} - ${senderValidation.reason}`);
  }

  // 2. Detect phishing
  const phishingAnalysis = detectPhishing(email);
  if (phishingAnalysis.isPhishing) {
    blockedReasons.push('Potential phishing attempt detected');
  } else if (phishingAnalysis.score > 30) {
    warnings.push('Email contains suspicious content');
  }

  // 3. Sanitize content
  const sanitizedHtml = email.htmlBody ? sanitizeEmailHtml(email.htmlBody) : undefined;
  const sanitizedText = email.textBody ? sanitizeEmailText(email.textBody) : undefined;

  // 4. Check for removed content
  if (email.htmlBody && sanitizedHtml && email.htmlBody.length > sanitizedHtml.length + 100) {
    warnings.push('Potentially dangerous HTML content was removed');
  }

  return {
    safe: blockedReasons.length === 0,
    sanitizedHtml,
    sanitizedText,
    phishingAnalysis,
    blockedReasons,
    warnings,
  };
}
