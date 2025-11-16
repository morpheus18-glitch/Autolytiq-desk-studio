# Deployment Guide - User Management & Security Fixes

## What Was Fixed

### ✅ 1. User Management Showing All Inactive
**Problem:** Users table was missing `isActive` field in database schema
**Fix:** Added `isActive` boolean field (default: false) to users schema

### ✅ 2. User Status Changes Not Working
**Problem:** No backend endpoint to update user data
**Fix:** Added `PATCH /api/admin/users/:id` endpoint for admins

### ✅ 3. Sign Up Accepting Anyone Without Approval
**Problem:** Registration auto-logged users in immediately
**Fix:**
- New registrations create INACTIVE users
- Removed auto-login after registration
- Users see "pending approval" message
- Only admins can activate users

### ✅ 4. Admin User Creation
**Problem:** No way for admins to create users
**Fix:** Added `POST /api/admin/users` endpoint
- Admin-created users are ACTIVE immediately
- Sends welcome email with credentials

---

## Deploy to Production (Replit)

### Step 1: Pull Latest Code

In your **Replit Shell**:
```bash
git pull origin main
```

### Step 2: Update Database Schema

**CRITICAL:** Run database migration to add `isActive` field:

```bash
npm run db:push
```

**Expected output:**
```
✔ Pulling schema from database...
✔ Changes applied
```

**If you get database connection error:**
- Make sure `DATABASE_URL` in Replit Secrets is set to:
  ```
  postgresql://neondb_owner:npg_P0uTvaHxBhM7@ep-still-scene-ah2v7gub.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
  ```

### Step 3: Activate Existing Users

All existing users will have `isActive = false` after migration. You need to activate them:

**Option A: Via SQL (Recommended)**

1. Go to https://console.neon.tech
2. Find your project (`ep-still-scene-ah2v7gub`)
3. Click "SQL Editor"
4. Run:

```sql
-- Activate ALL existing users
UPDATE users SET is_active = true WHERE created_at < NOW();

-- Or activate specific users:
UPDATE users SET is_active = true WHERE username = 'admin@autolytiq.com';
UPDATE users SET is_active = true WHERE email = 'your-email@example.com';
```

**Option B: Via User Management UI**

1. Login as admin
2. Go to User Management
3. Click each user
4. Toggle "Active" switch
5. Click "Save Changes"

### Step 4: Restart Replit App

After database update:
1. Click **"Stop"**
2. Click **"Run"**

### Step 5: Test Everything

**Test User Management:**
1. Go to User Management
2. All users should show correct Active/Inactive status
3. Click a user → toggle Active → Save
4. Should update successfully

**Test Registration:**
1. **Log out**
2. Go to `/register`
3. Sign up with test account
4. Should see: "Registration successful! Pending approval"
5. Should NOT be logged in
6. Login should fail with "Account is not active"
7. As admin, activate the test user
8. Now login should work

---

## New User Workflows

### Self-Registration Flow (Public)
1. User visits `/register`
2. Fills out form
3. Submits → Account created as **INACTIVE**
4. User sees: "Pending approval from administrator"
5. User **CANNOT** login yet
6. Admin activates user in User Management
7. User can now login

### Admin-Created Users (Internal)
1. Admin goes to User Management
2. Clicks "Create User"
3. Fills out form (including role)
4. User created as **ACTIVE** immediately
5. Welcome email sent with credentials
6. User can login right away

---

## API Changes

### New Endpoints

**Create User (Admin Only):**
```http
POST /api/admin/users
Authorization: Required (Admin role)

{
  "username": "johndoe",
  "email": "john@example.com",
  "fullName": "John Doe",
  "password": "TempPassword123!",
  "role": "salesperson"
}
```

**Update User (Admin Only):**
```http
PATCH /api/admin/users/:id
Authorization: Required (Admin role)

{
  "fullName": "Updated Name",
  "email": "newemail@example.com",
  "role": "sales_manager",
  "isActive": true
}
```

**Registration (Public):**
```http
POST /api/register

{
  "username": "newuser",
  "email": "new@example.com",
  "fullName": "New User",
  "password": "Password123!",
  "confirmPassword": "Password123!"
}

Response:
{
  "message": "Registration successful! Your account is pending approval...",
  "requiresApproval": true,
  "email": "new@example.com"
}
```

---

## Database Schema Changes

```sql
ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT FALSE;
```

**Existing users:** Will be `false` after migration - activate them manually
**New self-registrations:** Start as `false` - require admin approval
**Admin-created users:** Set to `true` automatically

---

## Security Improvements

✅ **Prevents Unauthorized Access**
- New users can't login until approved by admin

✅ **Admin Control**
- Only admins can activate/deactivate users
- Only admins can change user roles
- Only admins can create users via UI

✅ **Audit Trail**
- All user changes are server-side
- Role changes require admin authentication
- Can't be bypassed from client

---

## Troubleshooting

### "All users still showing as inactive"
**Cause:** Database migration ran, but existing users weren't activated
**Fix:** Run the SQL UPDATE command in Step 3

### "Can't update user status"
**Cause:** Not logged in as admin
**Fix:** Login with admin@autolytiq.com (or other admin account)

### "Database migration fails"
**Cause:** Wrong DATABASE_URL
**Fix:** Check Replit Secrets, update to production URL

### "New users can login immediately"
**Cause:** Old code still running
**Fix:**
1. `git pull origin main`
2. Restart Replit app

---

## Checklist

- [ ] Pulled latest code in Replit
- [ ] Ran `npm run db:push` to add `isActive` field
- [ ] Activated existing users via SQL or UI
- [ ] Restarted Replit app
- [ ] Tested user management (view, update status)
- [ ] Tested registration (should be pending)
- [ ] Tested login (inactive users blocked)
- [ ] Tested admin user creation
- [ ] Verified email system still works

---

## Next Steps (Not Yet Implemented)

These items from your list still need work:

- [ ] Add read/unread indicators to inbox
- [ ] Implement email settings page
- [ ] Redesign side navbar for web
- [ ] Overall UI polish

Let me know which one you want to tackle next!
