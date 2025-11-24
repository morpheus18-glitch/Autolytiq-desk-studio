# 📥 Inbox Sync Setup Guide

## Overview

Your email system can now **send** emails and **save drafts**, but the **inbox doesn't show received emails** yet.

This guide will help you set up **Resend webhooks** to automatically sync incoming emails to your inbox.

## ✅ What's Already Working

- ✅ Sending emails via Resend
- ✅ Saving drafts (auto-save every 30s)
- ✅ Viewing sent emails in "Sent" folder
- ✅ Viewing drafts in "Drafts" folder
- ✅ 8-layer security airlock

## ❌ What's Not Working (Yet)

- ❌ Inbox doesn't show received emails
- ❌ No real-time email notifications

## 🔧 How to Fix It: Resend Webhook Setup

### Step 1: Deploy Your Application

Resend webhooks need a **public URL** to send data to. You need to deploy your app:

**Option A: Replit (Recommended)**
1. Your Replit app is already accessible at: `https://your-repl-name.replit.app`
2. Note this URL - you'll use it in Step 3

**Option B: Other hosting**
- Vercel, Railway, Render, etc.
- Make sure your app is publicly accessible

### Step 2: Configure Webhook Secret (Security)

Add webhook secret to your environment variables:

**In Replit:**
1. Click "Secrets" (lock icon) in left sidebar
2. Add new secret:
   - **Key:** `RESEND_WEBHOOK_SECRET`
   - **Value:** Generate a random string (32+ characters)

   Example:
   ```bash
   # Generate secret locally
   openssl rand -hex 32
   ```

3. Save the secret

**Why?** This secret ensures that only Resend can send webhooks to your app (prevents spoofing).

### Step 3: Configure Webhook in Resend Dashboard

1. **Go to Resend Dashboard:**
   - Visit: https://resend.com/webhooks
   - Log in to your Resend account

2. **Create New Webhook:**
   - Click **"Add Webhook"**

3. **Configure Webhook:**

   **Endpoint URL:**
   ```
   https://your-repl-name.replit.app/api/webhooks/email/resend
   ```

   **Events to Subscribe:**
   - ✅ `email.received` (most important - incoming emails)
   - ✅ `email.delivered` (confirmation emails sent)
   - ✅ `email.bounced` (delivery failures)
   - ✅ `email.complained` (spam complaints)

4. **Copy Signing Secret:**
   - Resend will show you a **signing secret**
   - **IMPORTANT:** This should match the `RESEND_WEBHOOK_SECRET` you set in Step 2
   - If different, update your Replit secret with this value

5. **Save Webhook**

### Step 4: Configure Inbound Email (Optional)

To **receive** emails at your domain (e.g., `inbox@yourdomain.com`):

1. **Add MX Records to Your Domain:**

   Go to your domain DNS provider (Cloudflare, GoDaddy, etc.) and add:

   ```
   Type: MX
   Name: @
   Priority: 10
   Value: inbound-smtp.resend.com
   ```

2. **Configure Inbound Domain in Resend:**
   - Go to: https://resend.com/domains
   - Select your domain
   - Enable "Inbound Email"
   - Set forwarding address (optional)

3. **Test It:**
   - Send an email to `inbox@yourdomain.com`
   - Should appear in your inbox within seconds

### Step 5: Test the Integration

**Method 1: Send Test Email (Easiest)**

1. Use your email system to send an email to yourself
2. Reply to that email
3. The reply should appear in your inbox

**Method 2: Manual Test via Resend**

1. Go to Resend Dashboard → Webhooks
2. Find your webhook
3. Click "Send Test Event"
4. Select `email.received`
5. Check your inbox

**Method 3: Send Email from External Account**

1. From Gmail/Outlook, send email to `inbox@yourdomain.com`
2. Should appear in your inbox within 30 seconds

### Step 6: Verify It's Working

**Check Server Logs:**
```bash
# In your Replit shell
tail -f /tmp/server.log | grep EmailWebhook
```

**You should see:**
```
[EmailWebhook] Received webhook from Resend
[EmailWebhook] Event type: email.received
[EmailWebhook] Processing received email: <email-id>
[EmailWebhook] ✅ Email saved to inbox: <subject>
```

**Check Database:**
```bash
# Verify emails are being saved
npm run db:studio
```

Look for emails in `email_messages` table with `folder = 'inbox'`

**Check UI:**
1. Go to http://localhost:5000/email
2. Click "Inbox" folder
3. You should see received emails

## 🐛 Troubleshooting

### Webhook Returns 401 Unauthorized

**Cause:** Signature verification failed

**Solutions:**
1. Verify `RESEND_WEBHOOK_SECRET` matches the signing secret in Resend
2. Check server logs for signature verification errors
3. Temporarily disable signature verification for testing (NOT RECOMMENDED FOR PRODUCTION):
   ```typescript
   // In server/email-webhook-routes.ts
   // Comment out lines 60-71
   ```

### No Emails Appearing in Inbox

**Check 1: Is webhook being called?**
```bash
tail -f /tmp/server.log | grep EmailWebhook
```

If you see nothing, Resend isn't calling your webhook:
- Verify webhook URL is correct and publicly accessible
- Check webhook is enabled in Resend dashboard
- Send test event from Resend dashboard

**Check 2: Is email being saved?**
Look for:
```
[EmailWebhook] ✅ Email saved to inbox
```

If you see errors instead:
- Check database connection
- Verify email tables exist (`npm run db:push`)
- Check for database errors in logs

**Check 3: Is UI showing emails?**
- Refresh the page (Ctrl+R)
- Check browser console for errors
- Verify inbox query is working:
  ```
  http://localhost:5000/api/email/messages?folder=inbox
  ```

### Webhook Timeout (504 Gateway Timeout)

**Cause:** Webhook processing taking too long

**Solution:** Check database connection speed. Webhook must respond within 30 seconds.

### Database Errors in Webhook

**Common errors:**
```
relation "email_messages" does not exist
```

**Solution:**
```bash
npm run db:push
```

## 📊 Webhook Event Structure

### email.received Event

```json
{
  "type": "email.received",
  "data": {
    "id": "msg_abc123",
    "from": {
      "email": "customer@example.com",
      "name": "John Doe"
    },
    "to": ["inbox@yourdomain.com"],
    "cc": [],
    "bcc": [],
    "subject": "Question about pricing",
    "html": "<p>What is your best price?</p>",
    "text": "What is your best price?",
    "created_at": "2024-01-15T12:00:00Z"
  }
}
```

### email.delivered Event

```json
{
  "type": "email.delivered",
  "data": {
    "id": "msg_abc123",
    "email": "customer@example.com"
  }
}
```

## 🔐 Security Considerations

1. **Always verify webhook signatures** in production
2. **Use HTTPS** for webhook endpoint (Replit provides this automatically)
3. **Store webhook secret securely** (use environment variables, not hardcoded)
4. **Monitor webhook logs** for suspicious activity
5. **Rate limit webhooks** if needed (protect against webhook floods)

## 📝 Advanced Configuration

### Custom Dealership Mapping

By default, all incoming emails go to `dealershipId = 'default'`.

To map emails to specific dealerships:

```typescript
// In server/email-webhook-routes.ts, handleEmailReceived function

// Map email address to dealership
const dealershipId = mapEmailToDealership(data.to);

function mapEmailToDealership(toAddresses: any[]): string {
  // Example: inbox@dealership1.com → dealership-1
  const email = toAddresses[0]?.email || '';

  if (email.includes('dealership1.com')) return 'dealership-1-id';
  if (email.includes('dealership2.com')) return 'dealership-2-id';

  return 'default';
}
```

### Email Forwarding

Forward received emails to specific users:

```typescript
// After saving to database
await sendEmail({
  to: 'sales@yourdomain.com',
  subject: `Fwd: ${data.subject}`,
  html: data.html,
});
```

### Auto-Reply

Send automatic replies:

```typescript
// In handleEmailReceived, after saving
await sendEmail({
  to: data.from.email,
  subject: `Re: ${data.subject}`,
  html: 'Thank you for your email. We will respond within 24 hours.',
});
```

## ✅ Final Checklist

- [ ] App deployed to public URL
- [ ] `RESEND_WEBHOOK_SECRET` environment variable set
- [ ] Webhook created in Resend dashboard
- [ ] Webhook URL: `https://your-app.com/api/webhooks/email/resend`
- [ ] Events subscribed: `email.received`, `email.delivered`, `email.bounced`, `email.complained`
- [ ] Signing secret matches environment variable
- [ ] MX records added to domain (if receiving emails)
- [ ] Test email sent and received
- [ ] Emails appear in inbox folder
- [ ] Server logs show successful webhook processing

## 🎉 Once Complete

Your inbox will automatically sync with received emails in real-time!

- ✅ Send emails
- ✅ Receive emails
- ✅ Auto-save drafts
- ✅ Full conversation threading
- ✅ 8-layer security protection

## 🆘 Still Need Help?

Check server logs:
```bash
npm run dev 2>&1 | tee /tmp/server.log
```

Monitor webhooks:
```bash
tail -f /tmp/server.log | grep -E "EmailWebhook|error|Error"
```

Test webhook endpoint manually:
```bash
curl -X POST https://your-app.com/api/webhooks/email/resend \
  -H "Content-Type: application/json" \
  -d '{"type":"email.received","data":{"id":"test","from":"test@test.com","to":["inbox@yourdomain.com"],"subject":"Test","text":"Test"}}'
```
