# Email Module

## Overview

The Email Module is a completely isolated, bulletproof email system for Autolytiq Desk Studio. It has been built from the ground up to be:

- **Isolated**: Zero dependencies on other business logic (deals, customers, etc.)
- **Reliable**: Queue-based system with automatic retries
- **Type-Safe**: Full Zod validation at runtime
- **Maintainable**: Clear separation of concerns
- **Testable**: Each service can be tested independently

## Architecture

```
src/modules/email/
├── types/
│   └── email.types.ts         # All types with Zod schemas
├── services/
│   ├── email.service.ts       # Core email operations (DB layer)
│   ├── resend.service.ts      # Resend API integration
│   ├── queue.service.ts       # Email queue with retry logic
│   └── template.service.ts    # Template rendering
├── index.ts                   # Public API (ONLY import point)
└── README.md                  # This file
```

## Usage

### Import

**ALWAYS import from the module root:**

```typescript
import { emailModule } from '@/modules/email';
```

**NEVER import internal services directly:**

```typescript
// ❌ WRONG
import { emailService } from '@/modules/email/services/email.service';

// ✅ CORRECT
import { emailModule } from '@/modules/email';
```

### Send Email

```typescript
import { emailModule, SendEmailRequest } from '@/modules/email';

const emailData: SendEmailRequest = {
  to: [{ email: 'customer@example.com', name: 'John Doe' }],
  cc: [{ email: 'manager@dealership.com' }],
  subject: 'Welcome to Autolytiq',
  bodyText: 'Thank you for joining!',
  bodyHtml: '<p>Thank you for joining!</p>',
  customerId: 'uuid-here',
  dealId: 'uuid-here',
};

const result = await emailModule.sendEmail(tenantId, userId, emailData);
// { success: true, queueId: 'xyz', message: 'Email queued for delivery' }
```

### List Emails

```typescript
const emails = await emailModule.listEmails(
  tenantId,
  userId,
  {
    folder: 'inbox',
    isRead: false,
    limit: 50,
    offset: 0,
  }
);

// Returns: PaginatedEmailsResponse
// {
//   success: true,
//   data: EmailMessage[],
//   total: number,
//   limit: number,
//   offset: number
// }
```

### Mark as Read

```typescript
await emailModule.markAsRead(emailId, tenantId, userId, true);
```

### Get Statistics

```typescript
const stats = await emailModule.getStats(tenantId, userId);
// {
//   total: 100,
//   unread: 15,
//   starred: 5,
//   drafts: 3,
//   sent: 50,
//   failed: 2
// }
```

### Bulk Operations

```typescript
// Bulk mark as read
await emailModule.bulkMarkAsRead(['id1', 'id2'], tenantId, true);

// Bulk delete
await emailModule.bulkDelete(['id1', 'id2'], tenantId, false);
```

## Error Handling

All errors thrown by the module are instances of `EmailModuleError`:

```typescript
import { EmailModuleError, EmailErrorCode } from '@/modules/email';

try {
  await emailModule.sendEmail(tenantId, userId, emailData);
} catch (error) {
  if (error instanceof EmailModuleError) {
    console.error('Error code:', error.code);
    console.error('Details:', error.details);

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
    }
  }
}
```

## Queue System

The email module uses a queue system for reliability:

1. **Immediate Queueing**: Emails are immediately queued (no blocking)
2. **Automatic Processing**: Queue processes every 5 seconds
3. **Retry Logic**: Failed emails retry up to 3 times
4. **Priority Support**: Support for low/normal/high/urgent priorities

```typescript
// Send with priority
await emailModule.sendEmail(tenantId, userId, {
  ...emailData,
  priority: 'urgent',
});

// Check queue status
const queueStats = emailModule.getQueueStats();
// {
//   queueSize: 5,
//   processing: false,
//   byPriority: { urgent: 2, high: 1, normal: 2, low: 0 }
// }
```

## Type Safety

All inputs are validated at runtime using Zod:

```typescript
import { SendEmailRequestSchema } from '@/modules/email';

// Validate manually if needed
const result = SendEmailRequestSchema.safeParse(data);
if (!result.success) {
  console.error('Validation errors:', result.error.errors);
}
```

## Edge Cases Handled

- ✅ Network failures → Automatic retry via queue
- ✅ Invalid recipients → Validated before sending
- ✅ Template errors → Fallback to plain text
- ✅ Resend API failures → Queued and retried
- ✅ Large attachments → Size validation (max 25MB)
- ✅ Rate limiting → Built into queue system
- ✅ Duplicate messages → Checked via messageId
- ✅ Missing tenantId/userId → Validation errors

## Database Schema

The module uses these database tables:

- `email_messages`: Core email records
- `email_attachments`: Email attachments
- `email_folders`: Custom user folders (future)
- `email_templates`: Email templates (future)

## Migration from Old System

To migrate from the old email system:

1. Replace imports:
   ```typescript
   // Before
   import { sendEmailMessage } from '@/server/email-service';

   // After
   import { emailModule } from '@/modules/email';
   ```

2. Update function calls:
   ```typescript
   // Before
   await sendEmailMessage({ dealershipId, userId, to, subject, ... });

   // After
   await emailModule.sendEmail(dealershipId, userId, { to, subject, ... });
   ```

3. Update types:
   ```typescript
   // Before
   import type { EmailMessage } from '@shared/schema';

   // After
   import type { EmailMessage } from '@/modules/email';
   ```

## Testing

```typescript
import { emailModule } from '@/modules/email';

describe('Email Module', () => {
  it('should send email', async () => {
    const result = await emailModule.sendEmail('tenant-id', 'user-id', {
      to: [{ email: 'test@example.com' }],
      subject: 'Test',
      bodyText: 'Test body',
    });

    expect(result.success).toBe(true);
    expect(result.queueId).toBeDefined();
  });
});
```

## Monitoring

```typescript
// Queue stats
const queueStats = emailModule.getQueueStats();

// Email stats
const emailStats = await emailModule.getStats(tenantId, userId);

// Connection health
const isConnected = await emailModule.verifyConnection();
```

## Future Enhancements

- [ ] Database-backed queue (for persistence across restarts)
- [ ] Dead letter queue for permanently failed emails
- [ ] Template management UI
- [ ] Email threading/conversations
- [ ] Search with full-text indexing
- [ ] Email rules engine
- [ ] Attachment storage optimization
- [ ] Email analytics dashboard

## Support

For issues or questions about the email module:

1. Check this README
2. Review the type definitions in `types/email.types.ts`
3. Look at the implementation in `services/`
4. Contact the team

---

**Remember**: This module is completely isolated. It should NEVER depend on customer logic, deal logic, or any other business domain. Keep it pure!
