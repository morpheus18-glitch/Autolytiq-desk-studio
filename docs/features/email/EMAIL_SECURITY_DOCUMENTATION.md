# Email Security Documentation & Runbook

## Overview

The Autolytiq email system implements a comprehensive **8-layer security architecture** (Airlock Infrastructure) designed to prevent:

- **XSS (Cross-Site Scripting)** attacks
- **Phishing** attempts
- **SQL Injection** via email metadata
- **Rate limiting abuse**
- **Email spoofing**
- **Malicious content delivery**

All email traffic passes through multiple security checkpoints before being sent or displayed to users.

---

## Security Architecture

### Layer 1: HTML/Text Sanitization (XSS Prevention)

**Location:** `server/email-security.ts:29-54`

**Purpose:** Remove malicious HTML/JavaScript from email content

**Implementation:**
- Uses `DOMPurify` library for HTML sanitization
- Strips script tags, iframes, event handlers (onclick, onerror, etc.)
- Removes javascript: URLs and data attributes
- Escapes HTML entities in plain text

**Example:**
```typescript
import { sanitizeEmailHtml, sanitizeEmailText } from './email-security';

const cleanHtml = sanitizeEmailHtml('<p>Hello</p><script>alert("XSS")</script>');
// Result: '<p>Hello</p>' (script removed)

const cleanText = sanitizeEmailText('<script>alert("XSS")</script>');
// Result: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
```

### Layer 2: Phishing Detection

**Location:** `server/email-security.ts:63-186`

**Purpose:** Detect and block phishing attempts

**Detection Methods:**
1. **Suspicious Keywords** - Detects urgency language ("verify account", "suspended", etc.)
2. **URL Analysis** - Flags IP addresses, URL shorteners, homograph attacks
3. **Link Mismatch Detection** - Identifies when display text != actual link
4. **Typosquatting Detection** - Uses Levenshtein distance to detect similar domains

**Scoring System:**
- Each suspicious indicator adds to a score (0-100)
- Score ≥50 = Phishing (email blocked)
- Score 30-49 = Suspicious (email allowed with warnings)
- Score <30 = Safe

**Example:**
```typescript
const analysis = detectPhishing({
  subject: 'URGENT: Verify your account!',
  htmlBody: '<a href="http://192.168.1.1">http://paypal.com</a>',
  fromAddress: 'support@paypa1.com',
});

console.log(analysis);
// {
//   isPhishing: true,
//   score: 75,
//   flags: [
//     'Suspicious keyword: verify your account',
//     'URL contains IP address',
//     'Mismatched link text and href',
//     'Possible typosquatting: paypa1.com similar to paypal.com'
//   ]
// }
```

### Layer 3: Rate Limiting

**Location:** `server/email-security.ts:192-246`

**Purpose:** Prevent email spam and abuse

**Default Limits:**
- **Send:** 50 emails per hour per user
- **Read:** 500 requests per hour per user
- **Delete:** 100 requests per hour per user

**Configuration:**
```typescript
import { checkRateLimit } from './email-security';

const result = checkRateLimit(userId, 'send', {
  maxRequests: 50,
  windowMs: 60 * 60 * 1000, // 1 hour
});

if (!result.allowed) {
  return res.status(429).json({
    error: 'Rate limit exceeded',
    retryAfter: result.retryAfter, // seconds
  });
}
```

### Layer 4: Email Domain Validation

**Location:** `server/email-security.ts:252-282`

**Purpose:** Validate email addresses and block disposable/temporary emails

**Validation Checks:**
- Email format (RFC 5322 compliant)
- Disposable domain blocklist (tempmail.com, guerrillamail.com, etc.)
- Valid TLD (top-level domain)

**Example:**
```typescript
const validation = validateEmailAddress('user@tempmail.com');
// { valid: false, reason: 'Disposable email address not allowed' }
```

### Layer 5: Content Security Policy (CSP)

**Location:** `server/email-security.ts:291-303`

**Purpose:** Prevent code execution in email viewer iframe

**CSP Headers:**
```
default-src 'none';
img-src 'self' https: data:;
style-src 'self' 'unsafe-inline';
font-src 'self' data:;
script-src 'none';
object-src 'none';
frame-src 'none';
base-uri 'none';
form-action 'none';
```

### Layer 6: Input Validation (Zod Schemas)

**Location:** `server/email-security.ts:309-347`

**Purpose:** Type-safe input validation

**Example Schema:**
```typescript
import { emailSendSchema } from './email-security';

const data = emailSendSchema.parse(req.body);
// Validates:
// - to: Array of 1-50 recipients
// - subject: 1-200 characters, no script tags
// - body: Max 100KB
// - customerId/dealId: Valid UUIDs
```

### Layer 7: SQL Injection Prevention

**Location:** `server/email-security.ts:354-372`

**Purpose:** Sanitize inputs used in database queries

**Implementation:**
- UUID format validation (strict regex)
- Search query sanitization (remove SQL special chars)
- Parameterized queries (via Drizzle ORM)

**Example:**
```typescript
import { validateUUID, sanitizeSearchQuery } from './email-security';

// UUID validation
if (!validateUUID(customerId)) {
  throw new Error('Invalid customer ID');
}

// Search query sanitization
const safeQuery = sanitizeSearchQuery(req.query.search);
// "'; DROP TABLE users; --" → "DROP TABLE users"
```

### Layer 8: Audit Logging

**Location:** `server/email-security.ts:378-437`

**Purpose:** Track all security events for forensics and monitoring

**Event Types:**
- `email_sent` - Successful email send
- `email_send_blocked` - Email blocked by security
- `email_send_rate_limited` - Rate limit exceeded
- `email_send_warning` - Suspicious content detected
- `threat_detected` - Automated threat pattern detected
- `user_auto_blocked` - User automatically blocked

**Example:**
```typescript
import { logSecurityEvent } from './email-security';

logSecurityEvent({
  timestamp: new Date(),
  userId: 'user-123',
  dealershipId: 'dealer-456',
  action: 'email_send_blocked',
  severity: 'high',
  details: {
    reasons: ['Phishing attempt detected'],
    phishingScore: 85,
  },
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
});
```

---

## Comprehensive Security Check

**Location:** `server/email-security.ts:454-502`

**Function:** `checkEmailSecurity(email)`

This function runs ALL security checks in sequence and returns a comprehensive result:

```typescript
const securityCheck = checkEmailSecurity({
  subject: 'Invoice #12345',
  htmlBody: '<p>Thank you!</p>',
  textBody: 'Thank you!',
  fromAddress: 'billing@autolytiq.com',
  toAddresses: [{ email: 'customer@example.com' }],
});

// Result:
// {
//   safe: true,
//   sanitizedHtml: '<p>Thank you!</p>',
//   sanitizedText: 'Thank you!',
//   phishingAnalysis: {
//     isPhishing: false,
//     score: 0,
//     flags: []
//   },
//   blockedReasons: [],
//   warnings: []
// }
```

---

## Security Monitoring & Alerting

**Location:** `server/email-security-monitor.ts`

### Threat Detection

The monitoring system automatically detects threat patterns:

1. **Phishing Campaign** - 5+ phishing attempts in 1 hour
2. **Rate Limit Abuse** - 3+ rate limit hits in 1 hour
3. **XSS Attack Pattern** - 3+ XSS attempts in 1 hour
4. **Account Compromise** - Unusual activity patterns

### Configuration

```typescript
import { EmailSecurityMonitor } from './email-security-monitor';

// Configure alerting
EmailSecurityMonitor.configure({
  webhookUrl: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
  alertEmails: ['security@autolytiq.com'],
  minSeverity: 'high',
  enabled: true,
});

// Start monitoring
EmailSecurityMonitor.start();
```

### Security Metrics Dashboard

```typescript
const metrics = EmailSecurityMonitor.getMetrics(86400000); // Last 24 hours

console.log(metrics);
// {
//   totalEvents: 1234,
//   eventsByAction: {
//     email_sent: 1000,
//     email_send_blocked: 15,
//     email_send_rate_limited: 5,
//   },
//   eventsBySeverity: {
//     low: 1000,
//     medium: 20,
//     high: 12,
//     critical: 2,
//   },
//   phishingAttempts: 15,
//   blockedEmails: 15,
//   rateLimitHits: 5,
//   xssAttempts: 8,
//   topUsers: [...],
//   topDealerships: [...]
// }
```

---

## Integration with Email Routes

**Location:** `server/email-routes.ts:247-376`

The email send route integrates all security layers:

```typescript
// POST /api/email/send

// SECURITY LAYER 1: Rate Limiting
const rateLimit = checkRateLimit(userId, 'send', {
  maxRequests: 50,
  windowMs: 60 * 60 * 1000,
});
if (!rateLimit.allowed) {
  return res.status(429).json({ error: 'Rate limit exceeded' });
}

// SECURITY LAYER 2: Input Validation
const data = sendEmailSchema.parse(req.body);

// SECURITY LAYER 3: Comprehensive Security Check
const securityCheck = checkEmailSecurity({
  subject: data.subject,
  htmlBody: data.htmlBody,
  textBody: data.textBody,
  fromAddress: 'support@autolytiq.com',
  toAddresses: data.to,
});

// Block if unsafe
if (!securityCheck.safe) {
  logSecurityEvent({
    timestamp: new Date(),
    userId,
    dealershipId,
    action: 'email_send_blocked',
    severity: 'high',
    details: {
      reasons: securityCheck.blockedReasons,
      phishingScore: securityCheck.phishingAnalysis.score,
    },
  });

  return res.status(400).json({
    error: 'Email blocked for security reasons',
    reasons: securityCheck.blockedReasons,
  });
}

// SECURITY LAYER 4: Use sanitized content
const message = await sendEmailMessage({
  ...data,
  htmlBody: securityCheck.sanitizedHtml,
  textBody: securityCheck.sanitizedText,
});
```

---

## Testing

**Location:** `server/email-security.test.ts`

Run comprehensive security tests:

```bash
npm test -- server/email-security.test.ts
```

**Test Coverage:**
- ✅ 49 tests covering all 8 security layers
- ✅ XSS prevention (script injection, event handlers, etc.)
- ✅ Phishing detection (keywords, URLs, typosquatting)
- ✅ Rate limiting (per user, per action, time windows)
- ✅ Email validation (format, disposable domains, TLDs)
- ✅ CSP headers
- ✅ SQL injection prevention
- ✅ Audit logging

---

## Incident Response Runbook

### 1. Phishing Attack Detected

**Indicators:**
- Multiple `email_send_blocked` events with phishing flags
- High phishing scores (≥50)
- Typosquatting domain detected

**Response:**
1. Review blocked emails in audit log
2. Check if any similar emails were sent recently
3. Notify affected users if emails bypassed filters
4. Update phishing keyword list if new pattern detected
5. Consider blocking sender domain/IP

**Commands:**
```typescript
// Get recent phishing attempts
const events = getSecurityEvents({
  severity: 'high',
  limit: 100,
});

const phishingEvents = events.filter(
  e => e.action === 'email_send_blocked' &&
       e.details.phishingScore >= 50
);

// Review details
phishingEvents.forEach(e => {
  console.log(`User: ${e.userId}`);
  console.log(`Phishing Score: ${e.details.phishingScore}`);
  console.log(`Flags: ${e.details.phishingFlags.join(', ')}`);
});
```

### 2. XSS Attack Detected

**Indicators:**
- `email_send_warning` events with "dangerous HTML content" warnings
- Sanitized HTML significantly shorter than original

**Response:**
1. Review sanitized vs original content
2. Verify DOMPurify successfully removed malicious code
3. Check if user is repeatedly attempting XSS
4. Consider user education or account review

### 3. Rate Limit Abuse

**Indicators:**
- Multiple `email_send_rate_limited` events
- Same user hitting limits repeatedly

**Response:**
1. Review user's email sending patterns
2. Check for legitimate use case (e.g., bulk newsletter)
3. Adjust rate limits if justified
4. Block user if malicious spam detected

**Commands:**
```typescript
// Check user's rate limit history
const userEvents = getSecurityEvents({
  userId: 'suspected-user-id',
  limit: 1000,
});

const rateLimitHits = userEvents.filter(
  e => e.action === 'email_send_rate_limited'
);

console.log(`Rate limit hits: ${rateLimitHits.length}`);
console.log(`First hit: ${rateLimitHits[0].timestamp}`);
console.log(`Latest hit: ${rateLimitHits[rateLimitHits.length - 1].timestamp}`);

// Auto-block if necessary
if (rateLimitHits.length > 10) {
  EmailSecurityMonitor.autoBlockUser(
    'suspected-user-id',
    'Excessive rate limit abuse'
  );
}
```

### 4. Account Compromise Suspected

**Indicators:**
- Sudden spike in email activity
- Multiple failed sends followed by unusual patterns
- Sending to suspicious recipients

**Response:**
1. **IMMEDIATE:** Block account
2. Reset user's password and sessions
3. Review recent email activity
4. Contact user via alternate channel
5. Investigate how compromise occurred

**Commands:**
```typescript
// Block user immediately
EmailSecurityMonitor.autoBlockUser(
  'compromised-user-id',
  'Suspected account compromise'
);

// Quarantine recent emails
const recentEmails = await listEmails({
  userId: 'compromised-user-id',
  limit: 50,
});

recentEmails.forEach(email => {
  EmailSecurityMonitor.quarantineEmail(
    email.id,
    'Sent from compromised account'
  );
});

// Review activity
const userActivity = getSecurityEvents({
  userId: 'compromised-user-id',
  limit: 500,
});

// Analyze patterns
const metrics = EmailSecurityMonitor.getMetrics();
console.log('User activity:', userActivity.length);
console.log('Total events:', metrics.totalEvents);
```

---

## Production Deployment Checklist

### Environment Variables

```bash
# Required
SESSION_SECRET=your-secret-key-here
RESEND_API_KEY=re_your_api_key

# Optional (for enhanced monitoring)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SECURITY_ALERT_EMAILS=security@autolytiq.com,admin@autolytiq.com
```

### Configuration

```typescript
// In server/index.ts or startup file

import { EmailSecurityMonitor } from './email-security-monitor';

// Configure monitoring
EmailSecurityMonitor.configure({
  webhookUrl: process.env.SLACK_WEBHOOK_URL,
  alertEmails: process.env.SECURITY_ALERT_EMAILS?.split(','),
  minSeverity: 'high',
  enabled: process.env.NODE_ENV === 'production',
});

// Start monitoring
EmailSecurityMonitor.start();
```

### Monitoring Dashboards

Set up dashboards in your monitoring service (DataDog, Grafana, etc.) to track:

1. **Email Metrics**
   - Total emails sent (last 24h, 7d, 30d)
   - Send success rate
   - Average send time

2. **Security Metrics**
   - Phishing attempts blocked
   - XSS attempts detected
   - Rate limit hits
   - Failed security checks

3. **User Metrics**
   - Top email senders
   - Users hitting rate limits
   - Blocked users

4. **Alerts**
   - Critical security events (real-time)
   - Daily security summary
   - Weekly security report

---

## FAQ

### Q: How do I add a new suspicious keyword to phishing detection?

**A:** Edit `server/email-security.ts:79-84`:
```typescript
const suspiciousKeywords = [
  'verify your account',
  'suspended account',
  // Add your keyword here
  'your new keyword',
];
```

### Q: How do I whitelist a legitimate domain that's being flagged?

**A:** Edit the `trustedDomains` list in `server/email-security.ts:137`:
```typescript
const trustedDomains = [
  'autolytiq.com',
  'gmail.com',
  'outlook.com',
  'your-trusted-domain.com', // Add here
];
```

### Q: How do I adjust rate limits for specific users?

**A:** Create a custom rate limit check:
```typescript
const isVIPUser = user.plan === 'enterprise';
const limits = isVIPUser
  ? { maxRequests: 500, windowMs: 60 * 60 * 1000 }  // 500/hour
  : { maxRequests: 50, windowMs: 60 * 60 * 1000 };   // 50/hour

const rateLimit = checkRateLimit(userId, 'send', limits);
```

### Q: How do I export security logs for compliance?

**A:**
```typescript
import { getSecurityEvents } from './email-security';

// Get last 30 days
const events = getSecurityEvents({ limit: 100000 });
const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

const recentEvents = events.filter(
  e => e.timestamp.getTime() >= thirtyDaysAgo
);

// Export as JSON
const fs = require('fs');
fs.writeFileSync(
  'security-audit-log.json',
  JSON.stringify(recentEvents, null, 2)
);
```

### Q: How do I test the security system?

**A:** Run the test suite:
```bash
# Run all security tests
npm test -- server/email-security.test.ts

# Run specific test
npm test -- server/email-security.test.ts -t "should detect phishing"

# Run with coverage
npm run test:coverage -- server/email-security.test.ts
```

---

## Support

For security issues or questions:
- **Email:** security@autolytiq.com
- **Slack:** #email-security
- **Documentation:** This file

For **CRITICAL SECURITY INCIDENTS**, follow the incident response runbook above and notify the security team immediately.

---

## Changelog

**2025-11-15:** Initial email security infrastructure deployment
- Implemented 8-layer security architecture
- Added phishing detection with scoring system
- Implemented rate limiting
- Added comprehensive audit logging
- Created monitoring and alerting system
- Added 49 comprehensive security tests
