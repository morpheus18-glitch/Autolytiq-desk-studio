# REPLIT PRODUCTION FIX - DO THIS NOW

## The Problem

Your Replit environment has OLD database credentials cached in Secrets that are overriding everything else.

**Current (BROKEN):**
```
dbaas-db-7003671-do-user-17045839-0.m.db.ondigitalocean.com
```
This database no longer exists → app crashes

**Need (WORKING):**
```
ep-wispy-cloud-afmi6tu7.c-2.us-west-2.aws.neon.tech
```
This is your new Neon database

---

## FIX STEPS - Follow Exactly

### Step 1: Open Replit Secrets

1. **Go to your Replit project:** https://replit.com (find autolytiq project)
2. **Click the "Secrets" tab** (lock icon 🔒 in left sidebar)
   - OR click "Tools" → "Secrets"

### Step 2: Delete ALL Old Database Secrets

Look for and **DELETE** these if they exist:

- ❌ `DATABASE_URL` (if it contains `digitalocean.com`)
- ❌ `DATABASE_HOST` (if it contains `digitalocean.com`)
- ❌ `DATABASE_USERNAME`
- ❌ `DATABASE_PASSWORD`
- ❌ `DATABASE_PORT`
- ❌ `DATABASE_DB`
- ❌ `DATABASE_PROTOCOL`

**Click the trash/delete icon next to each one**

### Step 3: Add New Secrets

Add these **3 secrets** (click "New Secret" for each):

#### Secret 1: DATABASE_URL
```
Key: DATABASE_URL
Value: postgresql://neondb_owner:npg_np4i5GSIDuZJ@ep-wispy-cloud-afmi6tu7.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require
```

#### Secret 2: SESSION_SECRET

**Generate a new one:**
1. Open a terminal on your LOCAL machine
2. Run: `openssl rand -hex 32`
3. Copy the output
4. Paste as value:

```
Key: SESSION_SECRET
Value: [paste the generated string here]
```

#### Secret 3: RESEND_WEBHOOK_SECRET

**Get from Resend:**
1. Go to https://resend.com/webhooks
2. Find or create webhook
3. Copy the "Signing Secret" (starts with `whsec_`)
4. Paste as value:

```
Key: RESEND_WEBHOOK_SECRET
Value: whsec_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### Step 4: Restart Your Replit App

1. **Click "Stop"** button (top of Replit)
2. **Wait 5 seconds**
3. **Click "Run"** button

### Step 5: Verify It's Working

Watch the console output. You should see:

✅ **Good signs:**
```
[dotenv] injecting env
[Redis] Connected
Database connected
serving on port 5000
```

❌ **Bad signs (if you see these, something is wrong):**
```
ENOTFOUND dbaas-db-7003671-do-user-17045839-0.m.db.ondigitalocean.com
Error: getaddrinfo ENOTFOUND
```

---

## After App is Running: Create Admin User

Once the app is running without database errors:

### In Replit Shell (bottom panel):

```bash
npx tsx create-admin.ts
```

You should see:
```
✅ SUCCESS! Admin user created!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email:    admin@autolytiq.com
🔑 Password: Admin123!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Login to Your App:

1. Go to: **https://autolytiq.com**
2. Login with:
   - Email: `admin@autolytiq.com`
   - Password: `Admin123!`
3. **IMMEDIATELY change password:**
   - Go to Settings → Account → Change Password

---

## Configure Email Webhooks

After admin user is created and you can login:

### In Resend Dashboard:

1. **Go to:** https://resend.com/webhooks
2. **Create or edit webhook:**

   **Endpoint URL:**
   ```
   https://autolytiq.com/api/webhooks/resend
   ```

   **Subscribe to events:**
   - ✅ email.received (CRITICAL for inbox)
   - ✅ email.sent
   - ✅ email.delivered
   - ✅ email.bounced
   - ✅ email.complained

3. **Copy the Signing Secret** (should already be in Replit Secrets from Step 3)

4. **Save webhook**

### Test Email:

1. Send email to your autolytiq.com email from Gmail/Outlook
2. Go to https://autolytiq.com/email
3. Click "Inbox"
4. Email should appear within 30 seconds

---

## Quick Reference

### Replit Secrets (All 3 Required):

```env
DATABASE_URL=postgresql://neondb_owner:npg_np4i5GSIDuZJ@ep-wispy-cloud-afmi6tu7.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require

SESSION_SECRET=[generate with: openssl rand -hex 32]

RESEND_WEBHOOK_SECRET=whsec_[from Resend dashboard]
```

### Admin Credentials:

```
Email: admin@autolytiq.com
Password: Admin123!
(Change immediately after login!)
```

### Webhook URL:

```
https://autolytiq.com/api/webhooks/resend
```

---

## Troubleshooting

### Still seeing DigitalOcean errors?

- Make sure you deleted ALL old database secrets
- Restart the Replit app (Stop → Run)
- Clear browser cache
- Check console logs for "DATABASE_URL"

### Can't create admin user?

```bash
# Check if database is accessible:
npx tsx -e "import {db} from './server/db'; db.select().from(await import('./shared/schema').then(m => m.users)).limit(1).then(console.log, console.error)"
```

### Webhook not working?

- Verify URL is exactly: `https://autolytiq.com/api/webhooks/resend`
- Check Resend webhook delivery logs
- Test with: `curl -X POST https://autolytiq.com/api/webhooks/resend`

---

## Need More Help?

1. **Check Replit console logs** (bottom panel in Replit)
2. **Check browser console** (F12 → Console tab)
3. **Verify secrets are set** (Secrets tab in Replit)
4. **Restart app** (Stop → Run)

---

## Success Checklist

- [ ] All old DigitalOcean secrets deleted
- [ ] New DATABASE_URL added to Secrets
- [ ] SESSION_SECRET added to Secrets
- [ ] RESEND_WEBHOOK_SECRET added to Secrets
- [ ] App restarted in Replit
- [ ] No database errors in console
- [ ] Admin user created with script
- [ ] Can login at autolytiq.com
- [ ] Password changed from default
- [ ] Resend webhook configured
- [ ] Test email received in inbox
