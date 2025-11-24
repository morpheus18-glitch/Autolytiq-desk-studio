# Email System Setup & Troubleshooting Guide

## 🎯 Issues Fixed

### ✅ 1. Three Compose Buttons
**Problem:** Three compose buttons were showing on the email page
- Desktop sidebar: "Compose" button
- Mobile sidebar (hamburger menu): "Compose" button
- Mobile header: "Plus" icon button (redundant)

**Solution:** Removed the redundant mobile header "Plus" icon button. Now users access compose via:
- **Desktop:** Sidebar "Compose" button
- **Mobile:** Open hamburger menu → "Compose" button

### ✅ 2. Auto-Save Drafts
**Problem:** Composing an email and not sending it didn't save to drafts

**Solution:** Implemented automatic draft saving:
- **Auto-saves every 30 seconds** while composing
- **Saves when closing** the compose dialog if content exists
- **Updates existing draft** instead of creating duplicates
- **Visual indicator** shows "Draft saved just now" in dialog header
- **Silent failures** - doesn't interrupt user if auto-save fails

### ⚠️ 3. 500 Errors on Send Email & Save Draft

The 500 errors are caused by **missing database tables**. The email system requires these tables:
- `email_messages`
- `email_attachments`
- `email_folders`

## 🔧 Required Setup Steps

### Step 1: Configure Database Connection

Your database uses **Replit's connector system**. You need to:

1. **Open Replit Secrets/Environment:**
   - Go to your Replit project
   - Click on "Secrets" or "Environment Variables"

2. **Add/Verify `DATABASE_URL`:**
   ```
   DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
   ```
   - This should be automatically configured by Replit's Neon/Postgres connector
   - If missing, provision a Postgres database through Replit

3. **Verify Connection:**
   ```bash
   npm run dev
   ```
   - Look for successful database connection in logs
   - Should NOT see "DATABASE_URL must be set" error

### Step 2: Create Email Tables

Once database is connected, run migrations:

```bash
npm run db:push
```

This creates:
- `email_messages` - Stores all emails (sent/received/drafts)
- `email_attachments` - File attachments for emails
- `email_folders` - Custom email folders

**Verify tables were created:**
```bash
# Connect to your database and check tables
psql $DATABASE_URL -c "\dt email_*"
```

You should see:
```
 Schema |       Name        | Type  | Owner
--------+-------------------+-------+-------
 public | email_attachments | table | ...
 public | email_folders     | table | ...
 public | email_messages    | table | ...
```

### Step 3: Configure Resend Integration

Your Resend integration is already configured via Replit connectors:

1. **Verify Resend Connector:**
   - In Replit, go to Connectors
   - Confirm "Resend" connector is active
   - Verify your verified domain email is configured (e.g., `support@yourdomain.com`)

2. **Domain Authentication:**
   - The system automatically fetches your verified email from Resend
   - Emails will be sent FROM your verified domain
   - See `server/email-config.ts:76-84` for implementation

### Step 4: Test Email System

Once database tables are created:

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Navigate to email page:**
   ```
   http://localhost:5000/email
   ```

3. **Test compose:**
   - Click "Compose" button
   - Add recipient, subject, message
   - Click "Send" - should succeed
   - Click "Save Draft" - should succeed

4. **Check for errors:**
   - Open browser DevTools console
   - Send a test email
   - If 500 error, check server logs:
     ```bash
     tail -f /tmp/server.log
     ```

## 📧 Inbox Sync (Receiving Emails)

Currently, the email system can **SEND** emails via Resend, but **CANNOT RECEIVE** emails automatically.

### How It Works Now

✅ **Sending emails:**
- User composes email
- Sent via Resend API
- Saved to `email_messages` table (folder='sent')
- Appears in "Sent" folder immediately

❌ **Receiving emails:**
- NOT implemented yet
- Inbox will be empty unless manually populated

### Solution: Resend Webhooks

To sync incoming emails to your inbox, you need to set up **Resend webhooks**:

#### 1. Create Webhook Endpoint

Add this to `server/email-routes.ts`:

```typescript
/**
 * POST /api/email/webhook/resend
 * Receive incoming emails from Resend webhook
 */
router.post("/webhook/resend", async (req: Request, res: Response) => {
  try {
    const event = req.body;

    // Verify webhook signature (important for security)
    const signature = req.headers['resend-signature'] as string;
    // TODO: Implement signature verification

    if (event.type === 'email.received') {
      const emailData = event.data;

      // Save to database
      await db.insert(emailMessages).values({
        dealershipId: "default", // Map to your dealership
        messageId: emailData.id,
        fromAddress: emailData.from,
        fromName: emailData.from_name,
        toAddresses: emailData.to.map(e => ({ email: e })),
        ccAddresses: emailData.cc?.map(e => ({ email: e })) || [],
        subject: emailData.subject,
        htmlBody: emailData.html,
        textBody: emailData.text,
        folder: 'inbox',
        isRead: false,
        sentAt: new Date(emailData.created_at),
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("[EmailWebhook] Error:", error);
    res.status(500).json({ success: false });
  }
});
```

#### 2. Configure Resend Webhook

1. Go to [Resend Dashboard → Webhooks](https://resend.com/webhooks)
2. Click "Add Webhook"
3. **Endpoint URL:** `https://your-replit-url.replit.app/api/email/webhook/resend`
4. **Events to subscribe:**
   - `email.received`
   - `email.delivered`
   - `email.bounced`
   - `email.complained`
5. **Copy the signing secret** for signature verification

#### 3. Implement Signature Verification

```typescript
import crypto from 'crypto';

function verifyResendSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

#### 4. Enable Inbound Email (Resend)

For Resend to receive emails on your behalf:

1. **Add MX records** to your domain DNS:
   ```
   MX 10 inbound-smtp.resend.com
   ```

2. **Configure inbound domain** in Resend dashboard

3. Emails sent to `inbox@yourdomain.com` will trigger webhooks

## 🧪 Testing Checklist

- [ ] Database connected (no DATABASE_URL errors)
- [ ] Email tables created (run `npm run db:push`)
- [ ] Resend connector configured with verified domain
- [ ] Can compose new email
- [ ] Can send email (no 500 error)
- [ ] Sent email appears in "Sent" folder
- [ ] Can save draft (no 500 error)
- [ ] Draft appears in "Drafts" folder
- [ ] Auto-save works (compose email, wait 30s, check drafts)
- [ ] Can star/unstar emails
- [ ] Can delete emails (move to trash)
- [ ] Search works
- [ ] Unread counts update correctly

## 🐛 Troubleshooting

### Error: "SESSION_SECRET environment variable must be set"

**Solution:** Already fixed! The `.env` file has been created with SESSION_SECRET.

### Error: "DATABASE_URL must be set"

**Solution:**
1. In Replit, go to Secrets/Environment
2. Add `DATABASE_URL` or provision a Postgres database via Connectors
3. Restart the server

### Error: "500 Internal Server Error" when sending email

**Possible causes:**

1. **Missing database tables**
   ```bash
   npm run db:push
   ```

2. **Resend connector not configured**
   - Check Replit Connectors → Resend
   - Verify API key and verified email

3. **Database connection failed**
   - Check server logs: `tail -f /tmp/server.log`
   - Look for Postgres connection errors

4. **Check server logs for specific error:**
   ```bash
   tail -f /tmp/server.log | grep -i error
   ```

### Drafts don't show in "Drafts" folder

**Possible causes:**

1. **Database tables not created** - Run `npm run db:push`
2. **Auto-save failing** - Check browser console for errors
3. **Folder filter issue** - Check `email-list.tsx` component

### Sent emails don't appear in "Sent" folder

**Possible causes:**

1. **Email actually failed to send** - Check for 500 errors
2. **Database save failed** - Check server logs
3. **Frontend not refreshing** - Manually refresh the page

### No emails in Inbox

**Expected behavior:** Inbox is empty because receiving emails is not implemented yet.

**Solution:** Set up Resend webhooks (see "Inbox Sync" section above)

## 📁 Key Files Reference

### Backend
- `server/email-service.ts` - Core email operations (send, save, list)
- `server/email-routes.ts` - API endpoints
- `server/email-config.ts` - Resend configuration
- `server/email-security.ts` - 8-layer security system
- `server/db.ts` - Database connection
- `shared/schema.ts` - Email table schemas

### Frontend
- `client/src/pages/email.tsx` - Main email page
- `client/src/components/email/email-compose-dialog.tsx` - Compose UI
- `client/src/components/email/email-list.tsx` - Email list view
- `client/src/components/email/email-detail.tsx` - Email detail view
- `client/src/hooks/use-email.ts` - API hooks

## 🚀 Next Steps

1. ✅ Fix database connection
2. ✅ Run `npm run db:push` to create tables
3. ✅ Test sending/saving emails
4. ⏳ Implement Resend webhook for inbox sync (optional)
5. ⏳ Add rich text editor for email composition (optional)
6. ⏳ Add email attachments support (optional)

## 🆘 Still Having Issues?

Check server logs in real-time:
```bash
npm run dev | tee /tmp/server.log
```

Then in another terminal:
```bash
tail -f /tmp/server.log | grep -E "error|Error|500"
```

Look for specific error messages and trace them back to the source.
