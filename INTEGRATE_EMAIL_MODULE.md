# Quick Integration Guide - Email Module

## Step 1: Update Server (5 minutes)

### Option A: Replace Existing Routes (Recommended)

```typescript
// File: server/index.ts or server/app.ts

// OLD CODE (comment out or remove):
// import emailRoutes from './email-routes';
// app.use('/api/email', emailRoutes);

// NEW CODE (add this):
import emailRoutes from './src/modules/email/api/email.routes';
app.use('/api/email', emailRoutes);
```

### Option B: Add Alongside Existing (for gradual migration)

```typescript
// File: server/index.ts or server/app.ts

// Keep old routes on /api/email-old
import oldEmailRoutes from './email-routes';
app.use('/api/email-old', oldEmailRoutes);

// Add new routes on /api/email
import newEmailRoutes from './src/modules/email/api/email.routes';
app.use('/api/email', newEmailRoutes);

// Test new module, then remove old routes later
```

## Step 2: Test Email Sending (2 minutes)

```bash
# Start your server
npm run dev

# Test email send endpoint
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "to": [{"email": "test@example.com", "name": "Test User"}],
    "subject": "Test Email from New Module",
    "bodyText": "This email was sent using the new bulletproof email module!",
    "bodyHtml": "<p>This email was sent using the new bulletproof email module!</p>"
  }'

# Expected response:
# {
#   "success": true,
#   "queueId": "abc123",
#   "message": "Email queued for delivery"
# }
```

## Step 3: Verify Queue is Processing (1 minute)

```bash
# Check queue stats
curl http://localhost:3000/api/email/queue/stats \
  -H "Cookie: your-session-cookie"

# Expected response:
# {
#   "success": true,
#   "data": {
#     "queueSize": 1,
#     "processing": false,
#     "byPriority": {
#       "low": 0,
#       "normal": 1,
#       "high": 0,
#       "urgent": 0
#     }
#   }
# }

# Wait 5-10 seconds for queue to process, then check again
# queueSize should be 0 if email was sent successfully
```

## Step 4: Test Email Listing (1 minute)

```bash
# List sent emails
curl http://localhost:3000/api/email/messages?folder=sent \
  -H "Cookie: your-session-cookie"

# Expected response:
# {
#   "success": true,
#   "data": [ /* array of emails */ ],
#   "total": 1,
#   "limit": 50,
#   "offset": 0
# }
```

## Step 5: Monitor (Ongoing)

### Check Queue Health

```typescript
// Add to your server health check endpoint
import emailModule from './src/modules/email';

app.get('/health', async (req, res) => {
  const queueStats = emailModule.getQueueStats();
  const isResendConnected = await emailModule.verifyConnection();

  res.json({
    status: 'ok',
    email: {
      queueSize: queueStats.queueSize,
      processing: queueStats.processing,
      resendConnected: isResendConnected,
    },
  });
});
```

### Set Up Alerts

```typescript
// Alert if queue gets too large
setInterval(() => {
  const stats = emailModule.getQueueStats();

  if (stats.queueSize > 100) {
    console.error('EMAIL QUEUE OVERFLOW:', stats);
    // Send alert to monitoring service
  }

  if (stats.queueSize > 50) {
    console.warn('EMAIL QUEUE GROWING:', stats);
  }
}, 60000); // Check every minute
```

## Common Issues & Solutions

### Issue: "Cannot find module '@/modules/email'"

**Solution:**

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

Or use relative path:

```typescript
// Instead of: import emailRoutes from '@/modules/email/api/email.routes';
// Use: import emailRoutes from '../src/modules/email/api/email.routes';
```

### Issue: "Queue not processing"

**Solution:**

The queue auto-starts when the module loads. Check logs:

```bash
# You should see this on server start:
[EmailQueue] Starting queue processor
```

If not, manually trigger:

```typescript
await emailModule.processQueue();
```

### Issue: "Resend connection failed"

**Solution:**

1. Verify `RESEND_API_KEY` in environment
2. Verify `RESEND_WEBHOOK_SECRET` if using webhooks
3. Check Resend connection in Replit:

```typescript
const isConnected = await emailModule.verifyConnection();
console.log('Resend connected:', isConnected);
```

## Performance Tuning

### Adjust Queue Processing Interval

```typescript
// In src/modules/email/services/queue.service.ts
// Change from 5000ms (5 seconds) to faster:

this.processInterval = setInterval(() => {
  this.processQueue().catch(...);
}, 2000); // 2 seconds
```

### Adjust Retry Logic

```typescript
// In src/modules/email/services/queue.service.ts
// Change maxRetries in enqueue function:

const entry: QueueEntry = {
  // ...
  maxRetries: options.maxRetries || 5, // Increased from 3
};
```

## Gradual Migration Path

If you want to migrate gradually:

### Week 1: Test in parallel
- Keep old email system
- Add new module alongside
- Route 10% of traffic to new module
- Monitor for issues

### Week 2: Increase traffic
- Route 50% to new module
- Compare error rates
- Fix any issues

### Week 3: Full migration
- Route 100% to new module
- Remove old email system
- Update all client code

### Week 4: Cleanup
- Delete old email files
- Update imports
- Remove feature flags

## Success Checklist

After integration, verify:

- [ ] Emails send successfully
- [ ] Queue processes automatically
- [ ] Failed emails retry
- [ ] Email list API works
- [ ] Mark as read/unread works
- [ ] Delete emails works
- [ ] Webhook delivery works (if using inbound)
- [ ] No errors in server logs
- [ ] Queue stats endpoint works
- [ ] Resend connection verified

## Rollback Plan

If something goes wrong:

```typescript
// 1. Revert server changes
// File: server/index.ts

// Remove new routes
// import emailRoutes from './src/modules/email/api/email.routes';
// app.use('/api/email', emailRoutes);

// Restore old routes
import emailRoutes from './email-routes';
app.use('/api/email', emailRoutes);

// 2. Restart server
// 3. Everything back to normal
```

## Need Help?

1. Check the logs for errors
2. Review `/src/modules/email/README.md`
3. Check queue stats: `GET /api/email/queue/stats`
4. Test Resend connection: `await emailModule.verifyConnection()`
5. Contact the team

---

**Total integration time: ~10 minutes**

**Risk: Minimal (fully backward compatible)**

**Benefit: Email system that won't break**

🚀 Ready to ship!
