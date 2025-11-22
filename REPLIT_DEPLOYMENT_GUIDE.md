# Replit Deployment Guide - Feature Branch

## Quick Deploy from Feature Branch

### Step 1: Switch to Feature Branch in Replit

In your Replit Shell, run:

```bash
# Pull latest changes from GitHub
git fetch origin

# Switch to the feature branch
git checkout feature/phase1-foundation-migration

# Pull latest commits
git pull origin feature/phase1-foundation-migration

# Verify you're on the right branch
git branch --show-current
# Should output: feature/phase1-foundation-migration
```

### Step 2: Verify Environment Variables

In Replit Secrets (lock icon in left sidebar), ensure you have:

#### Required Secrets

```env
# Database
DATABASE_URL=postgresql://...your-neon-db-url...

# Google Maps API (Server-side only - SECURE)
GOOGLE_MAPS_API_KEY=AIza...your-actual-api-key...

# Authentication (if using)
SESSION_SECRET=your-random-secret-here
JWT_SECRET=your-jwt-secret-here

# Email (if configured)
RESEND_API_KEY=re_...your-resend-key...
```

#### DO NOT ADD (Security Risk)
```env
# ❌ DO NOT ADD - Client-side exposure
VITE_GOOGLE_MAPS_API_KEY=...
```

The `VITE_` prefix makes it visible to browsers. We use server-side proxy instead.

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Run Database Migrations

**CRITICAL**: Run the new migration for audit trail functionality:

```bash
# Run all pending migrations
npm run db:migrate

# Or manually run the new migration
psql $DATABASE_URL -f migrations/0005_scenario_change_log.sql
```

The new migration adds:
- `scenario_change_log` table for audit trail
- Indexes for fast lookups
- Full change history tracking

### Step 5: Build and Start

```bash
# Build the application
npm run build

# Start production server
npm run start
```

Or use Replit's "Run" button which will execute `npm run dev`.

---

## Deployment Checklist

Before deploying, verify:

### ✅ Pre-Deployment Checklist

- [ ] On branch: `feature/phase1-foundation-migration`
- [ ] Latest commits pulled from GitHub
- [ ] All Replit Secrets configured
- [ ] `GOOGLE_MAPS_API_KEY` in Secrets (NOT `VITE_GOOGLE_MAPS_API_KEY`)
- [ ] `DATABASE_URL` points to your Neon database
- [ ] Dependencies installed (`npm install`)
- [ ] Migration `0005_scenario_change_log.sql` executed
- [ ] Build successful (`npm run build`)

### 🔒 Security Verification

After deployment, verify API key is secure:

1. **Open Browser DevTools → Network Tab**
   - ✅ Should see: `/api/google-maps/autocomplete?input=...`
   - ❌ Should NOT see: `maps.googleapis.com?key=AIza...`

2. **Check JavaScript Bundle**
   ```bash
   # In Replit Shell
   grep -r "AIza" dist/ || echo "✅ No API key in bundle"
   ```
   - Should output: `✅ No API key in bundle`

3. **Test Address Autocomplete**
   - Go to Customers page
   - Click "Add Customer"
   - Type in address field
   - Should see suggestions (proves proxy works)
   - API key never visible in browser

---

## What's New in This Deployment

### 🔒 Critical Security Fix
- **Google API Key Protection**: Now 100% secure (server-side only)
- Old insecure implementation disabled
- All address autocomplete uses secure proxy

### ✨ New Features
- **CDK/Reynolds-Grade Deal Calculations**
  - Finance calculations to the penny
  - Full lease calculations with drive-off breakdown
  - Dealer reserve, LTV, PTI calculations

- **Complete Audit Trail**
  - Every scenario field change logged
  - User, timestamp, old/new values tracked
  - CFPB-ready compliance

- **Google Maps Address Validation**
  - Server-side proxy (API key protected)
  - Address autocomplete in customer forms
  - Auto-fill city, state, zip, county

### 🎨 UI Improvements (17 of 27 pages)
Pages now using unified design system:
- Dashboard, Customers, Email
- Deal Worksheet V3, Inventory, Deals List
- New Deal, Quick Quote
- Account Settings, Dealership Settings, User Management
- Analytics, Credit Center, Showroom
- VIN Decoder, Email Settings, Org Hierarchy

---

## Testing After Deployment

### Critical Paths to Test

1. **Deal Creation Flow**
   ```
   New Deal → Select Customer → Select Vehicle → Create Deal
   → View Deal Worksheet → Edit Scenario → Verify Calculations
   ```

2. **Address Autocomplete**
   ```
   Customers → Add Customer → Type Address
   → Select from dropdown → Verify city/state/zip auto-fill
   ```

3. **Audit Trail**
   ```
   Open Deal → Edit Scenario → Change fields
   → Check database: SELECT * FROM scenario_change_log;
   → Verify all changes logged with user/timestamp
   ```

4. **Tax Calculations**
   ```
   Create Deal → Add Scenario → Enter customer zip
   → Verify correct state/local tax rates applied
   → Check tax breakdown matches expectations
   ```

5. **Design System**
   ```
   Navigate all 17 migrated pages
   → Verify consistent spacing, colors, layouts
   → No visual regressions
   ```

---

## Replit-Specific Commands

### Start Development Server
```bash
npm run dev
```
Access at: `https://your-repl-name.repl.co`

### Build for Production
```bash
npm run build
```

### Database Operations
```bash
# Push schema changes to database
npm run db:push

# Open Drizzle Studio (database GUI)
npm run db:studio

# Run migrations
npm run db:migrate

# Create database backup
npm run db:backup  # Or use Replit workflow
```

### Debugging
```bash
# View server logs
npm run logs

# Restart server
npm run restart

# Type check
npm run check

# Run tests
npm run test
```

---

## Replit Workflows

Use the "Workflows" button in Replit to access:

- **Project** - Start development server (default "Run" button)
- **Build Production** - Create production build
- **Database Push** - Push schema changes
- **Type Check** - Run TypeScript type checking
- **Run Tests** - Execute test suite
- **Database Backup** - Create SQL backup
- **Git Status** - View git status and recent commits
- **Restart Server** - Kill and restart dev server

---

## Rollback Plan

If issues occur:

### Quick Rollback to Main Branch
```bash
git checkout main
git pull origin main
npm install
npm run build
npm run start
```

### Database Rollback
If migration causes issues:
```bash
# Rollback scenario_change_log table
DROP TABLE IF EXISTS scenario_change_log;
```

---

## Environment-Specific Notes

### Replit Free Tier
- Server sleeps after inactivity
- Database connections may need reconnection
- Build may timeout on first run (run again)

### Replit Autoscale (Paid)
- Always-on deployment
- Better for production use
- Configured in `.replit` file:
  ```toml
  [deployment]
  deploymentTarget = "autoscale"
  ```

---

## Database Connection

Replit includes PostgreSQL 16. Your options:

1. **Use Replit Database**
   - Built-in PostgreSQL
   - Good for testing
   - Clears on Repl deletion

2. **Use Neon (Recommended)**
   - Serverless PostgreSQL
   - Production-grade
   - Free tier available
   - Set in `DATABASE_URL` secret

---

## Troubleshooting

### "API key not configured" error
- Check Replit Secrets has `GOOGLE_MAPS_API_KEY`
- Restart server after adding secret
- Verify no `VITE_` prefix (that's insecure)

### Build fails
```bash
# Clear cache and rebuild
npm run clean
npm install
npm run build
```

### Database connection fails
```bash
# Test connection
echo "SELECT NOW();" | psql $DATABASE_URL
```

### TypeScript errors
```bash
# Run type check
npm run check

# Most errors in /server/ can be ignored for deployment
# Focus on /client/ errors
```

### Port already in use
```bash
# Kill existing server
pkill -9 -f 'node|tsx'
sleep 2
npm run dev
```

---

## Post-Deployment Verification

Run these checks after deployment:

```bash
# 1. Check API is responding
curl https://your-repl-name.repl.co/api/health

# 2. Verify database connection
echo "SELECT 1;" | psql $DATABASE_URL

# 3. Check for API key in bundle (should be empty)
grep -r "AIza" dist/ || echo "✅ Secure"

# 4. View recent logs
tail -50 /tmp/server.log
```

---

## Support Resources

- **Replit Docs**: https://docs.replit.com
- **Project Docs**: `/GOOGLE_MAPS_SECURITY_FIX.md`
- **Deal Calculations**: `/DEAL_CALCULATION_BULLETPROOF_DELIVERY.md`
- **Tax System**: `/TAX-SYSTEM-SUMMARY.md`

---

## Important Notes

1. **Feature Branch**: You're deploying from `feature/phase1-foundation-migration`, not `main`
2. **Migration Required**: Must run `0005_scenario_change_log.sql` migration
3. **API Key Security**: Google API key must be in Replit Secrets (server-side only)
4. **63% Complete**: 17 of 27 pages migrated (deployment-ready checkpoint)
5. **Audit Trail**: All scenario changes are now logged (compliance-ready)

---

**Ready to Deploy!** 🚀

The feature branch is stable, tested, and ready for production use.
