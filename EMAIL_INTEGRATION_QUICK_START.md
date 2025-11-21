# Email Module Integration - Quick Start Guide

## For Developers: What Changed

### Backend (Server)

#### Routes Changed
- Old: `/api/email/*` → Old email system (disabled)
- New: `/api/email/*` → New email module (active)
- **Result:** Same endpoints, zero breaking changes

#### New Files
- `/server/email-compat.ts` - Compatibility shim for auth-routes

#### Modified Files
- `/server/routes.ts` - Routes now use new email module
- `/server/auth-routes.ts` - Uses compatibility shim

---

### Frontend (Client)

#### Field Names Changed
When working with emails, use these field names:

**OLD (don't use):**
```typescript
email.htmlBody
email.textBody

sendEmail({
  htmlBody: "<p>Hello</p>",
  textBody: "Hello"
})
```

**NEW (use this):**
```typescript
email.bodyHtml  // ✅
email.bodyText  // ✅

sendEmail({
  bodyHtml: "<p>Hello</p>",  // ✅
  bodyText: "Hello"          // ✅
})
```

#### Hooks (Unchanged)
All hooks in `/client/src/hooks/use-email.ts` work exactly the same:

```typescript
import {
  useEmails,
  useSendEmail,
  useEmail,
  useMarkEmailAsRead,
  useToggleEmailStar,
  useDeleteEmail,
  useSaveDraft,
  useUnreadCounts,
  useBulkMarkAsRead,
  useBulkDelete,
  useMoveToFolder
} from '@/hooks/use-email';

// Usage:
const { data: emails } = useEmails({ folder: 'inbox' });
const sendEmail = useSendEmail();

// Send email:
await sendEmail.mutateAsync({
  to: [{ email: 'customer@example.com', name: 'John Doe' }],
  subject: 'Follow-up',
  bodyHtml: '<p>Thanks for visiting!</p>',
  bodyText: 'Thanks for visiting!',
});
```

---

## Testing Your Changes

### Quick Test (Manual)
1. Start server: `npm run dev`
2. Login to app
3. Go to Inbox page
4. Try these actions:
   - Send email
   - Read email
   - Star email
   - Delete email
   - Save draft

### Automated Test
```bash
# Login via browser first, then:
./scripts/test-email-endpoints.sh
```

### Check Queue Health
```bash
curl http://localhost:3000/api/email/queue/stats
```

Expected response:
```json
{
  "success": true,
  "data": {
    "queueSize": 0,
    "processing": false,
    "byPriority": {
      "low": 0,
      "normal": 0,
      "high": 0,
      "urgent": 0
    }
  }
}
```

---

## Common Issues

### Issue: "Field 'bodyHtml' not found"
**Cause:** Using old field name `htmlBody`
**Fix:** Change to `bodyHtml`

### Issue: "Email not sending"
**Cause:** Queue might be paused or Resend not connected
**Fix:**
1. Check queue: `GET /api/email/queue/stats`
2. Check Resend connection in `.env`
3. Check server logs for errors

### Issue: "TypeScript error on email object"
**Cause:** Using old type definition
**Fix:** Update import to use new types from `@/hooks/use-email`

---

## Environment Variables

Ensure these are set in `.env`:

```bash
RESEND_API_KEY=re_...
RESEND_WEBHOOK_SECRET=whsec_...  # Optional, for inbound email
```

---

## New Features Available

### Queue Statistics
```typescript
import emailModule from '@/modules/email';

const stats = emailModule.getQueueStats();
console.log('Queue size:', stats.queueSize);
console.log('Processing:', stats.processing);
```

### Email Stats
```typescript
const { data: stats } = useQuery({
  queryKey: ['email-stats'],
  queryFn: () => fetch('/api/email/stats').then(r => r.json())
});

console.log('Total emails:', stats.data.total);
console.log('Unread:', stats.data.unread);
```

### Unread Counts
```typescript
import { useUnreadCounts } from '@/hooks/use-email';

const { data: counts } = useUnreadCounts();
console.log('Inbox unread:', counts.data.inbox);
console.log('Drafts:', counts.data.drafts);
```

---

## Migration Status

### ✅ Complete
- Server routes migrated
- Frontend hooks updated
- Field names aligned
- Components updated
- Test script created
- Documentation complete

### ⏳ Pending (Future)
- Remove old email system files (after 1-2 weeks)
- Migrate auth-routes to use module directly
- Remove compatibility shim

---

## Need Help?

1. **Documentation:** `/src/modules/email/README.md`
2. **Migration Guide:** `/EMAIL_MODULE_MIGRATION_COMPLETE.md`
3. **Tests:** `/src/modules/email/__tests__/email.module.test.ts`
4. **Test Script:** `/scripts/test-email-endpoints.sh`

---

## Quick Commands

```bash
# Run tests
npm test src/modules/email

# Check server logs
npm run logs

# Restart server
npm run restart

# Test endpoints
./scripts/test-email-endpoints.sh

# Check TypeScript
npm run typecheck
```

---

**Last Updated:** November 21, 2025
**Status:** Production Ready ✅
