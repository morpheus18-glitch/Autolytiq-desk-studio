# Production Database Setup - Correct URL

## Your PRODUCTION Database URL

```
postgresql://neondb_owner:npg_P0uTvaHxBhM7@ep-still-scene-ah2v7gub.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
```

**Region:** us-east-1
**Host:** ep-still-scene-ah2v7gub.c-3.us-east-1.aws.neon.tech

---

## STEP 1: Set This in Replit Secrets

### In Replit:

1. **Open Secrets tab** (🔒 lock icon)
2. **Find or create `DATABASE_URL`**
3. **Set value to:**
   ```
   postgresql://neondb_owner:npg_P0uTvaHxBhM7@ep-still-scene-ah2v7gub.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
4. **Save**
5. **Stop and Restart** your Replit app

---

## STEP 2: Create Admin User in Production Database

### Option A: Using Neon SQL Console (EASIEST)

1. **Go to:** https://console.neon.tech
2. **Login**
3. **Find the project with host:** `ep-still-scene-ah2v7gub`
4. **Click "SQL Editor"**

### Run these SQL commands:

**1. Create dealership (if needed):**
```sql
INSERT INTO dealership_settings (id, name, email)
VALUES ('default', 'Autolytiq Dealership', 'support@autolytiq.com')
ON CONFLICT (id) DO NOTHING;
```

**2. Check if admin already exists:**
```sql
SELECT username, email, role FROM users WHERE username = 'admin@autolytiq.com';
```

**3. If exists, delete it:**
```sql
DELETE FROM users WHERE username = 'admin@autolytiq.com';
```

**4. Generate password hash in Replit Shell:**
```bash
npx tsx -e "import {hashPassword} from './server/auth.js'; hashPassword('Admin123!').then(h => console.log(h))"
```
**Copy the output (long string)**

**5. Create admin user (replace YOUR_HASH with the hash from step 4):**
```sql
INSERT INTO users (
  username, email, password, role,
  first_name, last_name, dealership_id, is_active
) VALUES (
  'admin@autolytiq.com',
  'admin@autolytiq.com',
  'YOUR_HASH',
  'admin',
  'Admin',
  'User',
  'default',
  true
);
```

---

## STEP 3: Test Login

### In Browser (go to autolytiq.com):

1. **Press F12** to open console
2. **Paste this:**

```javascript
fetch('/api/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    username: 'admin@autolytiq.com',
    password: 'Admin123!'
  })
}).then(r => r.json()).then(console.log)
```

**Expected result:** `{ok: true}` or similar success

---

## STEP 4: Login Normally

Go to **https://autolytiq.com**

- Email: `admin@autolytiq.com`
- Password: `Admin123!`

---

## Alternative: Run Script in Replit (After DATABASE_URL is set)

If DATABASE_URL is set correctly in Replit Secrets, you can run:

```bash
node quick-admin.mjs
```

This will create the admin user automatically.

---

## Verification Checklist

- [ ] DATABASE_URL in Replit Secrets = `postgresql://...ep-still-scene-ah2v7gub...`
- [ ] Replit app restarted after updating secret
- [ ] No DigitalOcean errors in Replit console
- [ ] Admin user created in Neon database
- [ ] Can login at autolytiq.com
