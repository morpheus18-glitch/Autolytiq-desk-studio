/**
 * Email-specific security utilities
 *
 * Provides email security checks, phishing detection, and content validation.
 */

import { levenshteinDistance } from './sanitizers';
import { validateEmailAddress, type EmailValidationResult } from './validators';
import { sanitizeEmailHtml, sanitizeEmailText } from './sanitizers';

/**
 * Result of phishing analysis
 */
export interface PhishingAnalysis {
  isPhishing: boolean;
  score: number; // 0-100, higher = more suspicious
  flags: string[];
}

/**
 * Result of comprehensive email security check
 */
export interface EmailSecurityCheckResult {
  safe: boolean;
  sanitizedHtml?: string;
  sanitizedText?: string;
  phishingAnalysis: PhishingAnalysis;
  blockedReasons: string[];
  warnings: string[];
}

/**
 * Detect phishing indicators in email content
 * @param email Email object with subject, body, and sender
 * @returns Phishing analysis with risk score and indicators
 */
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
    'verify your account',
    'suspended account',
    'confirm your identity',
    'urgent action required',
    'click here immediately',
    'reset password',
    'billing problem',
    'unauthorized access',
    'account locked',
    'verify payment',
    'update payment method',
    'unusual activity'
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
    if (/[а-яА-Я]/.test(url)) {
      // Cyrillic characters
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
 * Generate Content Security Policy header for email display
 * @returns CSP header string
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

/**
 * Run comprehensive security check on email
 * @param email Email object to analyze
 * @returns Security check result with sanitized content and analysis
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
    const validation: EmailValidationResult = validateEmailAddress(recipient.email);
    if (!validation.valid) {
      blockedReasons.push(`Invalid recipient: ${recipient.email} - ${validation.reason}`);
    }
  }

  const senderValidation: EmailValidationResult = validateEmailAddress(email.fromAddress);
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
