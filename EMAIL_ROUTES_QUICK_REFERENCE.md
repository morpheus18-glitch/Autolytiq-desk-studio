# EMAIL ROUTES - QUICK REFERENCE

**Last Updated:** November 21, 2025
**Status:** ✅ Migration Complete

---

## NEW FILE LOCATIONS

### Email API Routes
**File:** `/src/modules/email/api/email.routes.ts` (1,160 lines)
**Mount:** `/api/email/*` (protected, requires auth)

### Webhook Routes
**File:** `/src/modules/email/api/webhook.routes.ts` (430 lines)
**Mount:** `/api/webhooks/email/*` (public, no auth)

---

## ROUTE QUICK LIST

### Protected Routes (Auth Required)

**Core Operations:**
- `POST /api/email/send` - Send email
- `POST /api/email/drafts` - Save draft
- `GET /api/email/messages` - List emails
- `GET /api/email/messages/:id` - Get email
- `GET /api/email/threads/:threadId` - Get conversation thread

**Email Actions:**
- `POST /api/email/messages/:id/read` - Mark read/unread
- `POST /api/email/messages/:id/star` - Toggle star
- `POST /api/email/messages/:id/move` - Move to folder
- `DELETE /api/email/messages/:id` - Delete email

**Bulk Operations:**
- `POST /api/email/bulk/mark-read` - Bulk mark as read
- `POST /api/email/bulk/delete` - Bulk delete
- `POST /api/email/bulk/move-folder` - Bulk move to folder

**Folders:**
- `GET /api/email/folders` - List folders
- `POST /api/email/folders` - Create folder

**Rules:**
- `GET /api/email/rules` - List rules
- `POST /api/email/rules` - Create rule
- `PATCH /api/email/rules/:id` - Update rule
- `DELETE /api/email/rules/:id` - Delete rule

**Labels:**
- `GET /api/email/labels` - List labels
- `POST /api/email/labels` - Create label
- `PATCH /api/email/labels/:id` - Update label
- `DELETE /api/email/labels/:id` - Delete label
- `POST /api/email/messages/:id/labels` - Add label
- `DELETE /api/email/messages/:id/labels/:labelId` - Remove label

**Stats:**
- `GET /api/email/stats` - Email statistics
- `GET /api/email/unread-counts` - Unread counts
- `GET /api/email/queue/stats` - Queue statistics
- `POST /api/email/sync` - Manual sync status

### Public Routes (No Auth)

**Webhooks:**
- `POST /api/webhooks/email/resend` - Resend webhook handler

---

## ROUTE REGISTRATION

**Location:** `/server/routes.ts`

**Webhook routes (line 38-39):**
```typescript
const emailWebhookRoutes = (await import('../src/modules/email/api/webhook.routes')).default;
app.use('/api/webhooks/email', emailWebhookRoutes);
```

**Protected routes (line 85-88):**
```typescript
const newEmailRoutes = (await import('../src/modules/email/api/email.routes')).default;
app.use('/api/email', requireAuth, newEmailRoutes);
```

---

## WEBHOOK EVENTS

### Inbound Email
- **Event:** `email.received`
- **Action:** Creates email record in inbox
- **Dealership:** Matched by recipient email address

### Outbound Status Updates
- **Event:** `email.sent` → Status update
- **Event:** `email.delivered` → Move to sent folder
- **Event:** `email.bounced` → Move to trash
- **Event:** `email.complained` → Move to trash
- **Event:** `email.opened` → Log open event
- **Event:** `email.clicked` → Log click event

---

## SECURITY

### Authentication
- **Protected routes:** Session-based auth via `requireAuth` middleware
- **Webhook routes:** Svix signature verification
- **Multi-tenant:** All queries scoped to `dealershipId`

### Environment Variables
- `RESEND_WEBHOOK_SECRET` - Required for webhook signature verification
- `RESEND_API_KEY` - Required for email sending

---

## TESTING

### Quick Smoke Test
```bash
# Test email listing
curl http://localhost:5000/api/email/messages \
  -H "Cookie: connect.sid=..." \
  -H "Content-Type: application/json"

# Test webhook (development mode)
curl -X POST http://localhost:5000/api/webhooks/email/resend \
  -H "Content-Type: application/json" \
  -d '{"type": "email.received", "data": {...}}'
```

### Full Test Checklist
See `/EMAIL_ROUTES_MIGRATION_REPORT.md` section "Testing Recommendations"

---

## ROLLBACK

### Quick Rollback (if needed)
1. Edit `/server/routes.ts`
2. Comment out lines 38-39 (new webhook routes)
3. Comment out lines 85-88 (new protected routes)
4. Uncomment old import lines (see report for details)
5. Restart server

**Time:** < 5 minutes

---

## FILES TO REMOVE LATER

**After 30 days stable:**
- `/server/email-routes.ts` (1,646 lines)
- `/server/email-webhook-routes.ts` (248 lines)
- `/server/email-service.ts` (598 lines)
- `/server/email-compat.ts` (272 lines)

**Keep for now:**
- `/server/email-security.ts` (security layer not yet migrated)
- `/server/email-config.ts` (config still used via compat shim)

---

## TROUBLESHOOTING

### Email not sending
- Check `RESEND_API_KEY` environment variable
- Check Resend connector configuration
- Check email queue: `GET /api/email/queue/stats`

### Webhook not receiving emails
- Check `RESEND_WEBHOOK_SECRET` environment variable
- Verify webhook configured in Resend dashboard
- Check webhook logs in server console

### Authentication errors
- Verify user session is valid
- Check `requireAuth` middleware is applied
- Verify dealershipId in session

---

## DOCUMENTATION

**Full Details:** `/EMAIL_ROUTES_MIGRATION_REPORT.md`
**Email Module:** `/EMAIL_MODULE_SUMMARY.md`
**Architecture:** `/MODULAR_ARCHITECTURE_DELIVERY.md`

---

**Questions?** Contact Project Orchestrator Agent
