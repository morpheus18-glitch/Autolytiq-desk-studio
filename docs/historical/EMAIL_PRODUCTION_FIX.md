# Email Inbox Not Working in Production - Fix Guide

## Problem
Emails received on autolytiq.com are not showing up in the app inbox.

## Root Causes Identified

### 1. Webhook URL Mismatch
**Current Setup:**
- Code mounts webhook at: `/api/webhooks/resend` (server/routes.ts:66)
- Documentation says: `/api/webhooks/email/resend` (INBOX_SYNC_SETUP.md:69)

**Correct URL for Production:**
```
https://autolytiq.com/api/webhooks/resend
```

### 2. Missing RESEND_WEBHOOK_SECRET
**Current Status:**
- `.env` file does not have `RESEND_WEBHOOK_SECRET` configured
- This will cause all webhook requests to fail with 500 error

## Fix Steps for Production

### Step 1: Add RESEND_WEBHOOK_SECRET to Replit Secrets

1. **Go to your Replit project**
2. **Click "Secrets" (lock icon) in the left sidebar**
3. **Add new secret:**
   - **Key:** `RESEND_WEBHOOK_SECRET`
   - **Value:** `whsec_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`
     *(Get this from your Resend webhook configuration - see Step 2)*

### Step 2: Configure Webhook in Resend Dashboard

1. **Go to Resend Dashboard:**
   - Visit: https://resend.com/webhooks
   - Log in to your Resend account

2. **Check existing webhook OR create new webhook:**

   **Webhook Endpoint URL (CRITICAL - Use this exact URL):**
   ```
   https://autolytiq.com/api/webhooks/resend
   ```

   **Events to Subscribe (Select ALL):**
   - ✅ `email.received` ← CRITICAL for inbox
   - ✅ `email.sent`
   - ✅ `email.delivered`
   - ✅ `email.bounced`
   - ✅ `email.complained`
   - ✅ `email.opened`
   - ✅ `email.clicked`

3. **Copy the Signing Secret:**
   - After creating/viewing the webhook, Resend shows a **signing secret**
   - It looks like: `whsec_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`
   - **COPY THIS** - you need it for Step 1

4. **Save the webhook**

### Step 3: Update Replit Secret with Signing Secret

1. **Go back to Replit Secrets**
2. **Update `RESEND_WEBHOOK_SECRET` with the signing secret from Step 2**
3. **Important:** Restart your Replit app after updating the secret

### Step 4: Test the Integration

**Method 1: Send email from external account**
1. From Gmail/Outlook, send an email to your autolytiq.com email address
2. Should appear in inbox within 30 seconds

**Method 2: Send test webhook from Resend**
1. Go to Resend Dashboard → Webhooks
2. Click on your webhook
3. Click "Send Test Event"
4. Select `email.received`
5. Check your app's inbox

### Step 5: Verify It's Working

**Check Replit Logs:**
1. In Replit, open the Console tab
2. Look for these log messages:
   ```
   [Resend Webhook] ✓ Signature verified. Event: email.received
   [Resend Webhook] Processing inbound email
   [Resend Webhook] ✓ Created inbound email
   ```

**Check App Inbox:**
1. Go to https://autolytiq.com/email
2. Click "Inbox" folder
3. You should see received emails

## Troubleshooting

### If webhook returns 401/500 errors:

**Check 1: Verify secret is correct**
```bash
# The signing secret should start with "whsec_"
# It should match exactly between Resend and Replit Secrets
```

**Check 2: Check Replit logs for errors**
- Look for: `[Resend Webhook] RESEND_WEBHOOK_SECRET not configured`
- Look for: `[Resend Webhook] Signature verification failed`

### If no emails appearing:

**Check 1: Is webhook being called?**
- Check Replit Console logs for `[Resend Webhook]` messages
- If nothing appears, webhook URL is wrong or not configured

**Check 2: Test webhook endpoint manually**
```bash
# From your local machine, test if endpoint is accessible
curl https://autolytiq.com/api/webhooks/resend
```

## Quick Reference

### Correct URLs
- **Webhook URL:** `https://autolytiq.com/api/webhooks/resend`
- **App URL:** `https://autolytiq.com`

### Environment Variables Required
- `RESEND_WEBHOOK_SECRET` - Signing secret from Resend (starts with `whsec_`)

### Resend Dashboard Links
- Webhooks: https://resend.com/webhooks
- Domains: https://resend.com/domains
- API Keys: https://resend.com/api-keys

## Expected Behavior After Fix

✅ Send email from external account → appears in inbox within 30 seconds
✅ Compose and send email from app → goes to "Sent" folder
✅ Reply to email → appears in inbox
✅ Draft emails auto-save every 30 seconds
✅ Real-time webhook updates for delivery status

## Common Mistakes to Avoid

❌ Using wrong webhook URL (`/api/webhooks/email/resend` instead of `/api/webhooks/resend`)
❌ Not setting `RESEND_WEBHOOK_SECRET` environment variable
❌ Using wrong signing secret (not matching between Resend and app)
❌ Not restarting app after updating environment variables
❌ Not subscribing to `email.received` event in Resend webhook
