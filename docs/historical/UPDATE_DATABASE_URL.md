# 🔧 Update DATABASE_URL in Replit Secrets

## The Issue

Replit Secrets **overrides** the `.env` file, so we need to update DATABASE_URL there.

## ✅ Steps to Fix (1 minute)

### **In Your Replit Interface:**

1. **Click "Secrets" 🔒** (lock icon in the left sidebar)

2. **Find `DATABASE_URL`** in the list

3. **Click "Edit" or the pencil icon**

4. **Replace the old value with:**
   ```
   postgresql://neondb_owner:npg_np4i5GSIDuZJ@ep-wispy-cloud-afmi6tu7.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require
   ```

   (Note: Fixed the typo - changed `requirem` to `require`)

5. **Click "Save"**

6. **Close and reopen your terminal**, or run:
   ```bash
   source ~/.bashrc
   ```

### **Then Run:**

```bash
# Test the connection
npm run db:push
```

You should see:
```
✔ Changes applied
```

This will create all the email tables!

### **Then Start Server:**

```bash
# Kill old server
pkill -f "tsx server"

# Start fresh
npm run dev
```

### **Test Email System:**

```bash
# Open in browser
http://localhost:5000/email
```

Try:
- ✅ Send email
- ✅ Save draft
- ✅ View sent emails
- ✅ View drafts

Everything should work now! 🎉

## 🔐 Security Note

I've added your DATABASE_URL to `.env` temporarily for testing, but:

**IMPORTANT:** Add `.env` to `.gitignore` (already done) so the password doesn't get committed to git.

For production, always use Replit Secrets instead of `.env` file.

## 🆘 If It Still Doesn't Work

1. **Verify the secret was saved:**
   ```bash
   echo $DATABASE_URL | grep "neon.tech"
   ```

   Should show your Neon URL (not DigitalOcean)

2. **If it still shows DigitalOcean:**
   - Completely close and reopen your Replit terminal
   - Or restart your Repl

3. **Check for typos:**
   - Make sure there's no space at the end
   - Make sure it ends with `?sslmode=require` (not `requirem`)

## ✅ What Happens After This

Once DATABASE_URL is updated:

1. `npm run db:push` will succeed ✅
2. Email tables will be created ✅
3. Sending emails will work perfectly ✅
4. Saving drafts will work ✅
5. All 500 errors will be gone ✅
6. Inbox will be ready for webhook setup ✅

That's it! Just update that one secret and you're golden! 🚀
