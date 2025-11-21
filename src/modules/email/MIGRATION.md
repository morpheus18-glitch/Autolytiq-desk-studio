# Email Module Migration Guide

## Overview

This guide explains how to migrate from the old scattered email system to the new isolated email module.

## What Changed

### Before (Old System)
- Email code scattered across multiple files
- Direct dependencies on deal/customer logic
- Inconsistent error handling
- No queue system (emails could be lost)
- Mixed concerns (business logic + email logic)

### After (New Module)
- All email code in `src/modules/email/`
- Zero dependencies on other business logic
- Consistent error handling with `EmailModuleError`
- Queue-based system with automatic retries
- Clear separation of concerns

## Migration Steps

### Step 1: Update Imports

**Old:**
```typescript
import { sendEmailMessage } from '@/server/email-service';
import { sendEmail } from '@/server/email-config';
import { listEmails } from '@/server/email-service';
```

**New:**
```typescript
import emailModule from '@/modules/email';
// OR
import { emailModule } from '@/modules/email';
```

### Step 2: Update Function Calls

#### Send Email

**Old:**
```typescript
import { sendEmailMessage } from '@/server/email-service';

const message = await sendEmailMessage({
  dealershipId: 'tenant-123',
  userId: 'user-456',
  to: [{ email: 'customer@example.com', name: 'John Doe' }],
  subject: 'Hello',
  textBody: 'Hello world',
  htmlBody: '<p>Hello world</p>',
  customerId: 'customer-id',
  dealId: 'deal-id',
});
```

**New:**
```typescript
import emailModule from '@/modules/email';

const result = await emailModule.sendEmail(
  'tenant-123',  // tenantId
  'user-456',    // userId
  {
    to: [{ email: 'customer@example.com', name: 'John Doe' }],
    subject: 'Hello',
    bodyText: 'Hello world',
    bodyHtml: '<p>Hello world</p>',
    customerId: 'customer-id',
    dealId: 'deal-id',
  }
);

// result = { success: true, queueId: 'xyz', message: 'Email queued for delivery' }
```

#### List Emails

**Old:**
```typescript
import { listEmails } from '@/server/email-service';

const { messages, total } = await listEmails({
  dealershipId: 'tenant-123',
  userId: 'user-456',
  folder: 'inbox',
  limit: 50,
  offset: 0,
});
```

**New:**
```typescript
import emailModule from '@/modules/email';

const result = await emailModule.listEmails(
  'tenant-123',  // tenantId
  'user-456',    // userId
  {
    folder: 'inbox',
    limit: 50,
    offset: 0,
  }
);

// result = { success: true, data: EmailMessage[], total: number, limit: number, offset: number }
```

#### Save Draft

**Old:**
```typescript
import { saveDraft } from '@/server/email-service';

const draft = await saveDraft({
  dealershipId: 'tenant-123',
  userId: 'user-456',
  to: [{ email: 'customer@example.com' }],
  subject: 'Draft',
  textBody: 'Draft content',
});
```

**New:**
```typescript
import emailModule from '@/modules/email';

const draft = await emailModule.saveDraft(
  'tenant-123',
  'user-456',
  {
    to: [{ email: 'customer@example.com' }],
    subject: 'Draft',
    bodyText: 'Draft content',
  }
);
```

#### Mark as Read

**Old:**
```typescript
import { markAsRead } from '@/server/email-service';

const updated = await markAsRead('email-id', 'tenant-123', true);
```

**New:**
```typescript
import emailModule from '@/modules/email';

const updated = await emailModule.markAsRead(
  'email-id',
  'tenant-123',
  'user-456',
  true
);
```

### Step 3: Update Types

**Old:**
```typescript
import type { EmailMessage } from '@shared/schema';
import type { SendEmailOptions } from '@/server/email-service';
```

**New:**
```typescript
import type {
  EmailMessage,
  SendEmailRequest,
  EmailListQuery,
  EmailStats,
} from '@/modules/email';
```

### Step 4: Update API Routes

**Old:**
```typescript
// server/email-routes.ts
import { sendEmailMessage } from './email-service';

router.post('/send', async (req, res) => {
  const message = await sendEmailMessage({
    dealershipId: req.user.dealershipId,
    userId: req.user.id,
    ...req.body,
  });

  res.json({ success: true, data: message });
});
```

**New:**
```typescript
// Use the module's pre-built routes
import emailRoutes from '@/modules/email/api/email.routes';

app.use('/api/email', emailRoutes);

// OR create custom routes using the module
import emailModule from '@/modules/email';

router.post('/send', async (req, res) => {
  const result = await emailModule.sendEmail(
    req.user.dealershipId,
    req.user.id,
    req.body
  );

  res.json(result);
});
```

### Step 5: Update Error Handling

**Old:**
```typescript
try {
  await sendEmailMessage(options);
} catch (error) {
  console.error('Email failed:', error);
  // Generic error handling
}
```

**New:**
```typescript
import { EmailModuleError, EmailErrorCode } from '@/modules/email';

try {
  await emailModule.sendEmail(tenantId, userId, emailData);
} catch (error) {
  if (error instanceof EmailModuleError) {
    switch (error.code) {
      case EmailErrorCode.VALIDATION_ERROR:
        // Handle validation error
        break;
      case EmailErrorCode.SEND_FAILED:
        // Handle send failure
        break;
      case EmailErrorCode.RATE_LIMIT_EXCEEDED:
        // Handle rate limit
        break;
      default:
        // Handle other errors
    }
  }
}
```

### Step 6: Update React Hooks

**Old:**
```typescript
import { useSendEmail, useEmails } from '@/hooks/use-email';

const { mutate: sendEmail } = useSendEmail();
const { data: emails } = useEmails({ folder: 'inbox' });
```

**New:**
The hooks remain the same (they already use the `/api/email` endpoints), but they now benefit from the improved backend:

```typescript
import { useSendEmail, useEmails } from '@/hooks/use-email';

// Same usage, but now with:
// - Automatic queueing
// - Better error handling
// - Retry logic
// - Type safety

const { mutate: sendEmail } = useSendEmail();
const { data: emails } = useEmails({ folder: 'inbox' });
```

## API Endpoint Changes

| Old Endpoint | New Endpoint | Status |
|-------------|--------------|--------|
| `POST /api/email/send` | `POST /api/email/send` | ✅ Same (improved backend) |
| `POST /api/email/drafts` | `POST /api/email/drafts` | ✅ Same (improved backend) |
| `GET /api/email/messages` | `GET /api/email/messages` | ✅ Same (improved backend) |
| `GET /api/email/messages/:id` | `GET /api/email/messages/:id` | ✅ Same (improved backend) |
| `POST /api/email/messages/:id/read` | `POST /api/email/messages/:id/read` | ✅ Same (improved backend) |
| `POST /api/email/messages/:id/star` | `POST /api/email/messages/:id/star` | ✅ Same (improved backend) |
| `DELETE /api/email/messages/:id` | `DELETE /api/email/messages/:id` | ✅ Same (improved backend) |
| `GET /api/email/unread-counts` | `GET /api/email/unread-counts` | ✅ Same (improved backend) |
| N/A | `GET /api/email/stats` | ✨ New |
| N/A | `GET /api/email/queue/stats` | ✨ New |

## Database Schema Changes

No database schema changes required! The module uses the existing `email_messages` and `email_attachments` tables.

## Testing Migration

1. Test email sending:
   ```typescript
   const result = await emailModule.sendEmail(tenantId, userId, {
     to: [{ email: 'test@example.com' }],
     subject: 'Test',
     bodyText: 'Test body',
   });

   console.assert(result.success === true);
   console.assert(result.queueId !== undefined);
   ```

2. Test email listing:
   ```typescript
   const result = await emailModule.listEmails(tenantId, userId, {
     folder: 'inbox',
     limit: 10,
   });

   console.assert(result.success === true);
   console.assert(Array.isArray(result.data));
   ```

3. Test error handling:
   ```typescript
   try {
     await emailModule.sendEmail(tenantId, userId, {
       to: [], // Invalid: empty recipients
       subject: 'Test',
       bodyText: 'Test',
     });
   } catch (error) {
     console.assert(error instanceof EmailModuleError);
     console.assert(error.code === EmailErrorCode.VALIDATION_ERROR);
   }
   ```

## Rollback Plan

If you need to rollback:

1. Keep the old email files in place during migration
2. Use feature flags to toggle between old/new systems
3. Run both systems in parallel initially
4. Monitor for issues before fully switching over

## Common Issues

### Issue: "Cannot find module '@/modules/email'"

**Solution:** Make sure TypeScript path mapping is configured:

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/modules/*": ["./src/modules/*"]
    }
  }
}
```

### Issue: "EmailModuleError is not a constructor"

**Solution:** Check that you're importing correctly:

```typescript
// ✅ Correct
import { EmailModuleError, EmailErrorCode } from '@/modules/email';

// ❌ Wrong
import EmailModuleError from '@/modules/email';
```

### Issue: "Queue not processing emails"

**Solution:** The queue processor starts automatically. Check logs for errors:

```typescript
const queueStats = emailModule.getQueueStats();
console.log(queueStats);
// { queueSize: 0, processing: false, byPriority: { ... } }
```

## Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| Phase 1: Setup | 1 day | ✅ Create module structure |
| Phase 2: Migration | 2 days | Update routes, imports, and types |
| Phase 3: Testing | 1 day | Comprehensive testing |
| Phase 4: Deployment | 1 day | Deploy and monitor |

## Support

Questions? Issues?

1. Check the main [README.md](./README.md)
2. Review the [types documentation](./types/email.types.ts)
3. Contact the development team

---

**Good luck with your migration!** The new system is more reliable, maintainable, and bug-resistant.
