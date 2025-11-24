# Production Emergency Fix Guide - autolytiq.com

## Critical Issues
1. ❌ Can't create admin user → No access to admin features
2. ❌ Database connection errors → App crashes
3. ❌ Emails not showing in inbox → Webhook not configured
4. ⚠️ Mobile vs Web UI differences → Customer data fields mismatch

## Priority Order (Do in This Exact Order)

---

## STEP 1: Fix Database Connection (CRITICAL - Do First)

**Problem:** App trying to connect to old DigitalOcean database that doesn't exist

### Fix in Replit:

1. **Open your Replit project at autolytiq.com**
2. **Click "Secrets" (lock icon) in left sidebar**
3. **Find and DELETE these old secrets if they exist:**
   - Any DATABASE_URL pointing to `digitalocean.com`
   - Old connection strings

4. **Add/Update these secrets:**

   **DATABASE_URL:**
   ```
   postgresql://neondb_owner:npg_np4i5GSIDuZJ@ep-wispy-cloud-afmi6tu7.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require
   ```

   **SESSION_SECRET:** (Generate new one)
   ```bash
   # Run this locally to generate:
   openssl rand -hex 32
   # Copy the output and paste as SESSION_SECRET value
   ```

   **RESEND_WEBHOOK_SECRET:** (Get from Resend dashboard - see Step 3)
   ```
   whsec_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```

5. **Click "Stop" button in Replit**
6. **Click "Run" button to restart with new secrets**

7. **Verify database is working:**
   - Check console logs - should NOT see "ENOTFOUND dbaas-db-7003671"
   - Should see "Database connected successfully"

---

## STEP 2: Create Admin User (CRITICAL - Do Second)

You need an admin user to access all features. Run this script:

### Option A: Create via Script (Recommended)

1. **In your Replit shell, create a file:**
   ```bash
   cat > create-admin.ts << 'EOF'
import { db } from './server/db';
import { users, dealershipSettings } from './shared/schema';
import { hashPassword } from './server/auth';

async function createAdmin() {
  try {
    // Check if dealership exists
    let dealership = await db.select().from(dealershipSettings).limit(1);

    if (dealership.length === 0) {
      console.log('Creating default dealership...');
      dealership = await db.insert(dealershipSettings).values({
        id: 'default',
        name: 'Autolytiq Dealership',
        email: 'support@autolytiq.com',
      }).returning();
    }

    const dealershipId = dealership[0].id;

    // Check if admin exists
    const existingAdmin = await db.select().from(users).where(
      (users) => users.username === 'admin@autolytiq.com'
    ).limit(1);

    if (existingAdmin.length > 0) {
      console.log('✅ Admin user already exists: admin@autolytiq.com');
      return;
    }

    // Create admin user
    const hashedPassword = await hashPassword('Admin123!');

    await db.insert(users).values({
      username: 'admin@autolytiq.com',
      email: 'admin@autolytiq.com',
      password: hashedPassword,
      role: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      dealershipId,
      isActive: true,
    });

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@autolytiq.com');
    console.log('🔑 Password: Admin123!');
    console.log('⚠️  CHANGE THIS PASSWORD IMMEDIATELY AFTER LOGIN!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin();
EOF
   ```

2. **Run the script:**
   ```bash
   npx tsx create-admin.ts
   ```

3. **Login to your app:**
   - Go to https://autolytiq.com
   - Email: `admin@autolytiq.com`
   - Password: `Admin123!`
   - **IMMEDIATELY go to Settings → Change Password**

### Option B: Create via Database (If script fails)

1. **Connect to Neon database:**
   - Go to https://console.neon.tech
   - Open your project
   - Click "SQL Editor"

2. **Run this SQL:**
   ```sql
   -- Create dealership if not exists
   INSERT INTO dealership_settings (id, name, email)
   VALUES ('default', 'Autolytiq Dealership', 'support@autolytiq.com')
   ON CONFLICT (id) DO NOTHING;

   -- Create admin user (password is: Admin123!)
   INSERT INTO users (
     username,
     email,
     password,
     role,
     first_name,
     last_name,
     dealership_id,
     is_active
   )
   VALUES (
     'admin@autolytiq.com',
     'admin@autolytiq.com',
     '$scrypt$n=16384,r=8,p=1$...',  -- This needs to be hashed - use Option A instead
     'admin',
     'Admin',
     'User',
     'default',
     true
   )
   ON CONFLICT (username) DO NOTHING;
   ```

   **Note:** Option B requires you to manually hash the password. **Use Option A instead.**

---

## STEP 3: Fix Email Inbox Webhook (Do Third)

### 3.1 Configure Webhook Secret in Replit

1. **Go to Resend Dashboard:** https://resend.com/webhooks
2. **Create or Edit Webhook:**
   - Click existing webhook OR "Add Webhook"
   - **URL:** `https://autolytiq.com/api/webhooks/resend`
   - **Events:** Select ALL:
     - ✅ `email.received` (CRITICAL)
     - ✅ `email.sent`
     - ✅ `email.delivered`
     - ✅ `email.bounced`
     - ✅ `email.complained`
3. **Copy Signing Secret:**
   - Looks like: `whsec_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`
4. **Add to Replit Secrets:**
   - Go back to Replit → Secrets
   - Key: `RESEND_WEBHOOK_SECRET`
   - Value: Paste the signing secret

### 3.2 Verify Webhook is Working

1. **Restart Replit app** (Stop → Run)
2. **Send test email:**
   - From Gmail/Outlook, send email to your autolytiq.com email
3. **Check logs in Replit console:**
   - Should see: `[Resend Webhook] ✓ Signature verified`
   - Should see: `[Resend Webhook] ✓ Created inbound email`
4. **Check inbox:**
   - Go to https://autolytiq.com/email
   - Click "Inbox"
   - Email should appear within 30 seconds

### 3.3 Troubleshooting Webhooks

**If still getting 404:**
- Verify URL is exactly: `https://autolytiq.com/api/webhooks/resend`
- NOT `/api/webhooks/email/resend`

**If getting 401/500:**
- Check Replit console logs for errors
- Verify `RESEND_WEBHOOK_SECRET` matches Resend signing secret
- Restart app after adding secret

**If emails not appearing:**
```bash
# Test webhook manually:
curl -X POST https://autolytiq.com/api/webhooks/resend \
  -H "Content-Type: application/json" \
  -H "svix-id: test123" \
  -H "svix-timestamp: 1234567890" \
  -H "svix-signature: v1,test" \
  -d '{"type":"email.received","data":{"from":"test@test.com","to":["support@autolytiq.com"],"subject":"Test"}}'
```

---

## STEP 4: Fix Mobile vs Web Customer Data Issue

**Problem:** Web shows more customer fields than mobile

### Investigation Needed:

1. **Check customer form on web:**
   - What fields are shown?
2. **Check customer form on mobile:**
   - What fields are missing?
3. **Likely issue:** Responsive CSS hiding fields on mobile

### Quick Fix:

Let me investigate this after Steps 1-3 are complete. We need the app working first.

---

## Complete Checklist

### Database (Step 1)
- [ ] Old DigitalOcean DATABASE_URL removed from Replit Secrets
- [ ] New Neon DATABASE_URL added to Replit Secrets
- [ ] SESSION_SECRET added to Replit Secrets
- [ ] App restarted in Replit
- [ ] No database connection errors in console logs

### Admin User (Step 2)
- [ ] Admin user created (via script or SQL)
- [ ] Can login to https://autolytiq.com
- [ ] Username: `admin@autolytiq.com`
- [ ] Password changed from default `Admin123!`
- [ ] Can access admin features (Settings → Users)

### Email Inbox (Step 3)
- [ ] Resend webhook created/updated
- [ ] Webhook URL: `https://autolytiq.com/api/webhooks/resend`
- [ ] All events subscribed (especially `email.received`)
- [ ] Signing secret copied from Resend
- [ ] `RESEND_WEBHOOK_SECRET` added to Replit Secrets
- [ ] App restarted
- [ ] Test email sent and received
- [ ] Email appears in inbox at https://autolytiq.com/email

### Mobile vs Web (Step 4)
- [ ] Customer form fields compared
- [ ] Missing fields identified
- [ ] Fix implemented (TBD after investigation)

---

## Quick Reference

### Replit Secrets Needed:
```
DATABASE_URL=postgresql://neondb_owner:npg_np4i5GSIDuZJ@ep-wispy-cloud-afmi6tu7.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require
SESSION_SECRET=<generate with: openssl rand -hex 32>
RESEND_WEBHOOK_SECRET=whsec_<from Resend dashboard>
```

### Admin Credentials:
```
Email: admin@autolytiq.com
Password: Admin123! (CHANGE IMMEDIATELY)
```

### Webhook URL:
```
https://autolytiq.com/api/webhooks/resend
```

### Important URLs:
- Production App: https://autolytiq.com
- Resend Dashboard: https://resend.com/webhooks
- Neon Database: https://console.neon.tech

---

## What to Do If Things Are Still Broken

### Database Still Not Connecting:
```bash
# Test database connection:
psql "postgresql://neondb_owner:npg_np4i5GSIDuZJ@ep-wispy-cloud-afmi6tu7.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require"
```

### Can't Login as Admin:
- Try resetting password via database
- Check logs for authentication errors
- Verify user exists in database

### Emails Still Not Working:
- Check Resend webhook delivery logs
- Test webhook endpoint directly
- Verify database is saving emails
- Check app logs for webhook errors

---

## After Everything Works

1. **Change admin password**
2. **Create other users** (Settings → Users)
3. **Configure dealership settings**
4. **Test all features:**
   - Customer creation
   - Deal creation
   - Email sending/receiving
   - Mobile responsiveness

---

## Need Help?

If stuck on any step, check:
1. Replit console logs (bottom panel)
2. Browser console (F12 → Console tab)
3. Resend webhook delivery logs
4. Neon database query editor
