# Security Architecture & Implementation

## Overview

This document describes the security architecture, implementation details, and best practices for the authentication and authorization system.

**Last Updated**: 2025-01-21
**Security Level**: CRITICAL
**Compliance**: SOC 2 Type II Ready

---

## Table of Contents

1. [Security Consolidation](#security-consolidation)
2. [Authentication System](#authentication-system)
3. [Authorization & RBAC](#authorization--rbac)
4. [Session Management](#session-management)
5. [Rate Limiting](#rate-limiting)
6. [Security Headers](#security-headers)
7. [Password Security](#password-security)
8. [Two-Factor Authentication](#two-factor-authentication)
9. [Password Reset Flow](#password-reset-flow)
10. [Security Audit Logging](#security-audit-logging)
11. [Multi-Tenant Isolation](#multi-tenant-isolation)
12. [Vulnerability Mitigations](#vulnerability-mitigations)
13. [Security Testing](#security-testing)
14. [Incident Response](#incident-response)

---

## Security Consolidation

### Critical Changes Made

**ELIMINATED VULNERABILITIES:**
1. ✅ Removed preview path authentication bypass (`/server/middleware.ts` lines 6-9)
2. ✅ Eliminated duplicate authentication middleware
3. ✅ Consolidated auth logic into single source (`/server/auth.ts`)
4. ✅ Removed scattered auth imports

**SECURITY IMPROVEMENTS:**
1. ✅ Implemented comprehensive rate limiting
2. ✅ Added security headers (Helmet)
3. ✅ Centralized security configuration (`/server/security.ts`)
4. ✅ Enhanced audit logging
5. ✅ Enforced HTTPS in production

### File Structure

```
server/
├── auth.ts                  # Core authentication (passport, session)
├── auth-routes.ts           # Auth API endpoints (2FA, password reset, etc.)
├── auth-helpers.ts          # Auth utilities (TOTP, tokens, RBAC)
├── security.ts              # Security middleware (helmet, rate limiting)
└── routes.ts                # Route registration with security applied

REMOVED:
├── middleware.ts            # ❌ DELETED (duplicate with security bypass)
```

---

## Authentication System

### Core Components

**Location**: `/server/auth.ts`

**Responsibilities**:
- User authentication (login/logout)
- Password hashing with scrypt
- Session management with Passport.js
- Account lockout after failed attempts
- 2FA integration

### Authentication Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ POST /api/login
       │ {username, password}
       ▼
┌─────────────────────────────────┐
│   Rate Limiter (5/15min)        │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│   Passport LocalStrategy        │
│   - Verify credentials          │
│   - Check account lockout       │
│   - Validate password           │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│   2FA Check                     │
│   - If enabled: request token   │
│   - If disabled: complete login │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│   Create Session                │
│   - HttpOnly cookie             │
│   - Secure flag (production)    │
│   - SameSite: lax               │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│   Audit Log Event               │
│   - Log successful login        │
│   - Record IP, user agent       │
└─────────────────────────────────┘
```

### Password Hashing

**Algorithm**: scrypt
**Key Derivation**: 64 bytes
**Salt**: 16 bytes (random, per-password)
**Format**: `{hash}.{salt}` (hex-encoded)

```typescript
// Hashing
const salt = randomBytes(16).toString('hex');
const buf = await scryptAsync(password, salt, 64);
const hash = `${buf.toString('hex')}.${salt}`;

// Verification
const [hashed, salt] = stored.split('.');
const hashedBuf = Buffer.from(hashed, 'hex');
const suppliedBuf = await scryptAsync(supplied, salt, 64);
return timingSafeEqual(hashedBuf, suppliedBuf);
```

**Security Properties**:
- Timing-safe comparison (prevents timing attacks)
- Unique salt per password (prevents rainbow tables)
- Strong key derivation (resistant to brute force)

### Account Lockout

**Configuration**:
- Max failed attempts: 5
- Lockout duration: 15 minutes
- Counter reset: On successful login

**Implementation**:
```typescript
if (user.accountLockedUntil && new Date() < user.accountLockedUntil) {
  return "Account locked. Try again in X minutes";
}

if (invalidPassword) {
  newAttempts = failedLoginAttempts + 1;
  if (newAttempts >= 5) {
    accountLockedUntil = Date.now() + 15min;
  }
}
```

---

## Authorization & RBAC

### Role Hierarchy

```
admin > finance_manager > sales_manager > salesperson
```

### Middleware Functions

**Location**: `/server/auth.ts`

```typescript
// Require authentication
requireAuth(req, res, next)

// Require specific role(s)
requireRole('admin', 'sales_manager')(req, res, next)

// Require specific permission(s)
requirePermission('deals:create', 'deals:edit')(req, res, next)
```

### Route Protection

**Example**:
```typescript
// Public routes (no auth)
app.post('/api/register', authRateLimiter, registerHandler);

// Protected routes (require auth)
app.get('/api/deals', requireAuth, getDealsHandler);

// Admin-only routes
app.get('/api/audit/security', requireAuth, requireRole('admin'), getAuditLogs);

// Permission-based routes
app.post('/api/deals/:id/approve', requireAuth, requirePermission('deals:approve'), approveHandler);
```

### RBAC Best Practices

1. **Principle of Least Privilege**: Users have minimum necessary permissions
2. **Default Deny**: All routes protected unless explicitly public
3. **Multi-tenant Isolation**: Users only access their dealership's data
4. **Audit All Access**: Log all authorization decisions

---

## Session Management

### Configuration

**Location**: `/server/auth.ts` (setupAuth)

```typescript
session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: storage.sessionStore,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax',
  },
});
```

### Cookie Security Flags

| Flag | Purpose | Value |
|------|---------|-------|
| `httpOnly` | Prevent XSS attacks | `true` |
| `secure` | HTTPS-only transmission | `true` (production) |
| `sameSite` | CSRF protection | `lax` |
| `maxAge` | Session lifetime | 7 days |

### Session Storage

**Store**: Database-backed session store
**Persistence**: Sessions survive server restarts
**Cleanup**: Expired sessions automatically removed

---

## Rate Limiting

### Configuration

**Location**: `/server/security.ts`

### Rate Limits by Endpoint

| Endpoint | Window | Max Requests | Purpose |
|----------|--------|--------------|---------|
| `/api/login` | 15 min | 5 | Prevent brute force |
| `/api/register` | 15 min | 5 | Prevent spam accounts |
| `/api/auth/request-reset` | 1 hour | 3 | Prevent email enumeration |
| `/api/auth/reset-password` | 1 hour | 3 | Prevent token guessing |
| `/api/admin/users` | 1 hour | 10 | Prevent mass account creation |
| `/api/*` (general) | 1 min | 100 | Prevent API abuse |

### Rate Limiter Configuration

```typescript
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    logSecurityEvent('rate_limit_exceeded', 'security', req);
    res.status(429).json({ error: 'Too many attempts' });
  },
});
```

### Rate Limit Headers

**Standard headers** (RFC 6585):
- `RateLimit-Limit`: Total requests allowed
- `RateLimit-Remaining`: Requests remaining
- `RateLimit-Reset`: Time until limit resets

---

## Security Headers

### Helmet Configuration

**Location**: `/server/security.ts`

### Headers Applied

```typescript
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hidePoweredBy: true,
  xssFilter: true,
});
```

### Security Headers Reference

| Header | Value | Protection |
|--------|-------|------------|
| `Strict-Transport-Security` | `max-age=31536000` | Force HTTPS |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `Content-Security-Policy` | See above | XSS protection |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Privacy |
| `X-Powered-By` | (removed) | Hide tech stack |

---

## Password Security

### Password Requirements

**Complexity Rules**:
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number

**Validation Schema**:
```typescript
z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must contain uppercase letter')
  .regex(/[a-z]/, 'Must contain lowercase letter')
  .regex(/[0-9]/, 'Must contain number')
```

### Password Storage

**Never Stored in Plain Text**:
- All passwords hashed with scrypt
- Hashes stored in database
- Original passwords never logged

**Response Sanitization**:
```typescript
const { password: _, ...userWithoutPassword } = user;
res.json(userWithoutPassword);
```

---

## Two-Factor Authentication

### Implementation

**Algorithm**: TOTP (Time-based One-Time Password)
**Library**: `otplib` (RFC 6238 compliant)
**Code Length**: 6 digits
**Time Step**: 30 seconds
**Window**: ±1 time step (allows clock drift)

### 2FA Setup Flow

```
1. User requests 2FA setup
   POST /api/auth/2fa/setup
   ↓
2. Server generates secret
   authenticator.generateSecret()
   ↓
3. Server generates QR code
   QRCode.toDataURL(otpauthUrl)
   ↓
4. User scans QR code in authenticator app
   (Google Authenticator, Authy, etc.)
   ↓
5. User submits verification code
   POST /api/auth/2fa/verify {token}
   ↓
6. Server verifies code and enables 2FA
   authenticator.verify({token, secret})
```

### 2FA Login Flow

```
1. User logs in with username/password
   POST /api/login
   ↓
2. Server validates credentials
   ↓
3. If 2FA enabled: Store pending login
   session.pending2faUserId = user.id
   ↓
4. Return requires2fa: true
   {requires2fa: true, message: "Enter code"}
   ↓
5. User submits 2FA code
   POST /api/auth/login/verify-2fa {token}
   ↓
6. Server verifies TOTP code
   ↓
7. Complete login, create session
```

---

## Password Reset Flow

### Secure Reset Process

```
1. User requests password reset
   POST /api/auth/request-reset {email}
   ↓
2. Server generates secure token
   randomBytes(32).toString('hex')
   ↓
3. Server hashes token for storage
   sha256(token)
   ↓
4. Server stores hashed token + expiry
   resetToken: hashed, resetTokenExpires: +1hour
   ↓
5. Server sends email with plain token
   resetUrl: /reset-password?token={token}
   ↓
6. User clicks link and submits new password
   POST /api/auth/reset-password {token, newPassword}
   ↓
7. Server hashes submitted token
   sha256(token)
   ↓
8. Server verifies hashed token matches
   AND token not expired
   ↓
9. Server resets password and clears token
   password: scrypt(newPassword)
   resetToken: null, resetTokenExpires: null
```

### Security Measures

**Token Security**:
- 256-bit random token (64 hex chars)
- SHA-256 hashed before storage
- 1-hour expiry
- Single-use (cleared after reset)

**Email Enumeration Prevention**:
```typescript
// Always return same message, regardless of email existence
res.json({ message: 'If that email exists, a reset link has been sent' });
```

**Rate Limiting**:
- 3 requests per hour per IP+email
- Prevents mass enumeration
- Prevents spam attacks

---

## Security Audit Logging

### What Gets Logged

**Authentication Events**:
- `login_success` - Successful login
- `login_failed` - Failed login attempt
- `login_2fa_failed` - Failed 2FA verification
- `logout` - User logout
- `account_locked` - Account locked due to failed attempts

**Account Management**:
- `user_created` - New user created
- `user_updated` - User details modified
- `user_deleted` - User account deleted
- `preferences_updated` - User preferences changed

**Security Events**:
- `mfa_enabled` - 2FA enabled
- `mfa_disabled` - 2FA disabled
- `password_reset_requested` - Password reset requested
- `password_reset_completed` - Password successfully reset
- `rate_limit_exceeded` - Rate limit triggered

### Log Entry Schema

```typescript
{
  id: string,
  userId: string | null,
  username: string | null,
  eventType: string,
  eventCategory: string,
  ipAddress: string | null,
  userAgent: string | null,
  metadata: Record<string, any>,
  success: boolean,
  errorMessage: string | null,
  createdAt: Date,
}
```

### Querying Audit Logs

```typescript
// Get all logs for a user
GET /api/audit/security?userId={userId}

// Get failed login attempts
GET /api/audit/security?eventType=login_failed&success=false

// Get recent 100 events
GET /api/audit/security?limit=100
```

**Access Control**: Admin-only

---

## Multi-Tenant Isolation

### Dealership Isolation

**Every user belongs to exactly one dealership**:
```typescript
interface User {
  id: string;
  dealershipId: string; // CRITICAL: Multi-tenant isolation
  // ... other fields
}
```

### Enforcement Points

**1. User Creation**:
```typescript
// New users inherit dealership from admin who created them
const user = await storage.createUser(data, adminUser.dealershipId);
```

**2. Data Access**:
```typescript
// All queries filter by dealership
const deals = await storage.getDeals(user.dealershipId);
```

**3. Cross-Dealership Checks**:
```typescript
// Prevent accessing other dealerships' data
if (resource.dealershipId !== user.dealershipId) {
  return res.status(403).json({ error: 'Cannot access resources from other dealerships' });
}
```

### Middleware

```typescript
export function requireSameDealership(getDealershipId) {
  return (req, res, next) => {
    const resourceDealershipId = getDealershipId(req);
    if (resourceDealershipId !== req.user.dealershipId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
}
```

---

## Vulnerability Mitigations

### OWASP Top 10 Coverage

| Vulnerability | Mitigation | Status |
|--------------|------------|--------|
| **A01 - Broken Access Control** | RBAC, multi-tenant isolation | ✅ Mitigated |
| **A02 - Cryptographic Failures** | scrypt password hashing, HTTPS | ✅ Mitigated |
| **A03 - Injection** | Input sanitization, parameterized queries | ✅ Mitigated |
| **A04 - Insecure Design** | Secure architecture, defense in depth | ✅ Mitigated |
| **A05 - Security Misconfiguration** | Helmet headers, secure defaults | ✅ Mitigated |
| **A06 - Vulnerable Components** | Regular updates, security scanning | ⚠️ Ongoing |
| **A07 - Auth Failures** | Account lockout, 2FA, session security | ✅ Mitigated |
| **A08 - Data Integrity Failures** | Signature verification, audit logs | ✅ Mitigated |
| **A09 - Logging Failures** | Comprehensive audit logging | ✅ Mitigated |
| **A10 - SSRF** | Input validation, allowlist | ✅ Mitigated |

### Specific Protections

**SQL Injection**: Parameterized queries via Drizzle ORM
**XSS**: CSP headers, input sanitization
**CSRF**: SameSite cookies, session tokens
**Clickjacking**: X-Frame-Options: DENY
**Session Fixation**: New session on login
**Brute Force**: Rate limiting, account lockout
**Timing Attacks**: Constant-time comparison (timingSafeEqual)
**Email Enumeration**: Consistent responses

---

## Security Testing

### Test Coverage

**Location**: `/server/__tests__/auth.security.test.ts`

### Test Categories

1. **Password Security**
   - Reject weak passwords
   - Enforce complexity requirements
   - Never return passwords in responses

2. **Account Lockout**
   - Lock after 5 failed attempts
   - Reset counter on success
   - Time-based unlock

3. **Authentication**
   - Reject invalid credentials
   - Create secure sessions
   - Destroy sessions on logout

4. **RBAC**
   - Deny unauthorized access
   - Enforce role hierarchy
   - Multi-tenant isolation

5. **Password Reset**
   - Prevent email enumeration
   - Reject expired tokens
   - Single-use tokens

6. **2FA**
   - Require authentication for setup
   - Validate TOTP tokens
   - Enforce during login

7. **Security Headers**
   - Verify Helmet headers
   - Check CSP policy
   - Validate cookie flags

8. **Rate Limiting**
   - Auth endpoint limits
   - Password reset limits
   - API abuse prevention

9. **Session Security**
   - HttpOnly flag
   - Secure flag (production)
   - SameSite flag

10. **Audit Logging**
    - Log successful logins
    - Log failed attempts
    - Log security events

### Running Tests

```bash
npm test -- auth.security.test.ts
```

---

## Incident Response

### Security Incident Levels

| Level | Description | Response Time | Actions |
|-------|-------------|---------------|---------|
| **P0 - Critical** | Active attack, data breach | Immediate | Lockdown, investigate, notify |
| **P1 - High** | Potential breach, exploit found | 1 hour | Patch, monitor, analyze |
| **P2 - Medium** | Suspicious activity, rate limit hit | 4 hours | Review logs, strengthen controls |
| **P3 - Low** | Policy violation, minor issue | 24 hours | Log, educate, improve |

### Response Procedures

**1. Detection**:
- Monitor audit logs
- Review rate limit violations
- Analyze failed login patterns
- Check security event trends

**2. Containment**:
```bash
# Lock compromised account
UPDATE users SET isActive = false WHERE id = '{userId}';

# Invalidate all sessions
DELETE FROM sessions WHERE userId = '{userId}';

# Block IP address
# (Configure firewall/WAF)
```

**3. Investigation**:
```sql
-- Review security events
SELECT * FROM securityAuditLogs
WHERE userId = '{userId}'
  AND createdAt > NOW() - INTERVAL '24 hours'
ORDER BY createdAt DESC;

-- Check failed login patterns
SELECT ipAddress, COUNT(*) as attempts
FROM securityAuditLogs
WHERE eventType = 'login_failed'
  AND createdAt > NOW() - INTERVAL '1 hour'
GROUP BY ipAddress
HAVING COUNT(*) > 5;
```

**4. Remediation**:
- Patch vulnerabilities
- Reset compromised credentials
- Strengthen access controls
- Update security policies

**5. Post-Incident**:
- Document findings
- Update runbooks
- Conduct retrospective
- Implement preventive measures

### Contact Information

**Security Team**: security@company.com
**Incident Hotline**: (24/7 on-call)
**Bug Bounty**: https://company.com/security

---

## Compliance & Standards

### Frameworks

- **SOC 2 Type II**: Audit-ready security controls
- **OWASP ASVS**: Level 2 verification
- **NIST Cybersecurity Framework**: Align with best practices
- **PCI DSS**: (If handling payments)

### Security Checklist

- [x] All authentication through centralized module
- [x] Session security properly configured
- [x] RBAC enforced at middleware level
- [x] Rate limiting on all auth endpoints
- [x] Comprehensive security testing
- [x] Zero plaintext passwords
- [x] Secure password reset flow
- [x] 2FA properly implemented
- [x] Security headers configured
- [x] Audit logging enabled
- [x] Multi-tenant isolation enforced
- [x] Input sanitization
- [x] HTTPS enforced in production

---

## Maintenance

### Regular Security Tasks

**Weekly**:
- Review security audit logs
- Check rate limit violations
- Monitor failed login patterns

**Monthly**:
- Update dependencies
- Review access controls
- Analyze security trends
- Conduct security training

**Quarterly**:
- Penetration testing
- Security architecture review
- Compliance audit
- Incident response drill

**Annually**:
- Full security audit
- SOC 2 examination
- Update security policies
- Renew security certifications

---

## Security Contact

For security vulnerabilities, please email: **security@company.com**

**DO NOT** open public GitHub issues for security vulnerabilities.

---

**Document Version**: 1.0
**Last Security Review**: 2025-01-21
**Next Review Due**: 2025-04-21
