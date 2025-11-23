# Security Quick Reference

## Critical Security Changes (2025-01-21)

### What Was Fixed

1. **ELIMINATED**: Preview path authentication bypass (`/server/middleware.ts`)
2. **ELIMINATED**: Duplicate authentication logic
3. **ADDED**: Comprehensive rate limiting
4. **ADDED**: Security headers (Helmet)
5. **ADDED**: Security audit logging
6. **ADDED**: Request sanitization

---

## File Locations

| Component | File Path |
|-----------|-----------|
| **Core Auth** | `/root/autolytiq-desk-studio/server/auth.ts` |
| **Auth Routes** | `/root/autolytiq-desk-studio/server/auth-routes.ts` |
| **Auth Helpers** | `/root/autolytiq-desk-studio/server/auth-helpers.ts` |
| **Security Module** | `/root/autolytiq-desk-studio/server/security.ts` |
| **Route Setup** | `/root/autolytiq-desk-studio/server/routes.ts` |
| **Security Tests** | `/root/autolytiq-desk-studio/server/__tests__/auth.security.test.ts` |
| **Documentation** | `/root/autolytiq-desk-studio/SECURITY.md` |

---

## Import Patterns

### Correct (Use This)

```typescript
// Authentication & authorization
import { requireAuth, requireRole, requirePermission } from './auth';

// Security middleware
import {
  initializeSecurity,
  authRateLimiter,
  passwordResetRateLimiter,
  userCreationRateLimiter
} from './security';

// Security helpers
import { logSecurityEvent, hashResetToken } from './auth-helpers';
```

### Incorrect (Don't Use)

```typescript
// ❌ This file was deleted (contained security bypass)
import { requireAuth } from './middleware';
```

---

## Route Protection Patterns

### Public Route (No Auth)
```typescript
app.post('/api/register', authRateLimiter, registerHandler);
```

### Protected Route (Require Auth)
```typescript
app.get('/api/deals', requireAuth, getDealsHandler);
```

### Admin Only Route
```typescript
app.get('/api/audit/security',
  requireAuth,
  requireRole('admin'),
  getAuditLogs
);
```

### Permission-Based Route
```typescript
app.post('/api/deals/:id/approve',
  requireAuth,
  requirePermission('deals:approve'),
  approveHandler
);
```

### Rate-Limited Route
```typescript
app.post('/api/auth/request-reset',
  passwordResetRateLimiter,
  requestResetHandler
);
```

---

## Rate Limits

| Endpoint | Window | Max Requests |
|----------|--------|--------------|
| `/api/login` | 15 min | 5 |
| `/api/register` | 15 min | 5 |
| `/api/auth/request-reset` | 1 hour | 3 |
| `/api/auth/reset-password` | 1 hour | 3 |
| `/api/admin/users` | 1 hour | 10 |
| `/api/*` (general) | 1 min | 100 |

---

## Security Checklist for New Endpoints

When adding a new endpoint, ensure:

- [ ] Rate limiting applied (if auth-related)
- [ ] Authentication required (`requireAuth`)
- [ ] Authorization checked (`requireRole` or `requirePermission`)
- [ ] Multi-tenant isolation enforced
- [ ] Input validation performed
- [ ] Security event logged (if sensitive operation)
- [ ] Errors don't leak sensitive information

---

## Testing

### Run Security Tests
```bash
npm test -- auth.security.test.ts
```

### Verify Security Configuration
```bash
bash verify-security.sh
```

---

## Monitoring

### Check Security Audit Logs
```typescript
GET /api/audit/security?limit=100
```

### Check Failed Login Attempts
```typescript
GET /api/audit/security?eventType=login_failed&success=false
```

### Check Rate Limit Violations
```typescript
GET /api/audit/security?eventType=rate_limit_exceeded
```

---

## Emergency Procedures

### Lock User Account
```sql
UPDATE users SET isActive = false WHERE id = '{userId}';
```

### Invalidate All User Sessions
```sql
DELETE FROM sessions WHERE userId = '{userId}';
```

### Review Recent Security Events
```sql
SELECT * FROM securityAuditLogs
WHERE userId = '{userId}'
  AND createdAt > NOW() - INTERVAL '24 hours'
ORDER BY createdAt DESC;
```

---

## Environment Variables

Required for security:
```bash
SESSION_SECRET=<strong-random-string>
NODE_ENV=production  # Enables secure cookies
```

---

## Common Security Errors

### 401 Unauthorized
**Cause**: User not authenticated
**Fix**: Login required

### 403 Forbidden
**Cause**: User lacks required role/permission
**Fix**: Contact admin for access

### 429 Too Many Requests
**Cause**: Rate limit exceeded
**Fix**: Wait for limit window to reset

---

## Support

**Security Issues**: security@company.com
**Documentation**: `/SECURITY.md`
**Full Summary**: `/SECURITY_MIGRATION_SUMMARY.md`
**This Reference**: `/SECURITY_QUICK_REFERENCE.md`

---

## Status

**Last Updated**: 2025-01-21
**Security Level**: ENTERPRISE
**Production Ready**: ✅ YES
