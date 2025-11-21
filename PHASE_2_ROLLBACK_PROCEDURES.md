# PHASE 2 ROLLBACK PROCEDURES

**Date:** November 21, 2025
**Phase:** 2 of 5 - Module Migration
**Branch Strategy:** Feature branch with checkpoint tags

---

## OVERVIEW

This document defines rollback procedures for Phase 2 module migration. Since we're working on **existing, mostly-complete modules** that just need wiring and testing, rollback risk is MEDIUM-LOW. However, the **Email System Removal** presents HIGH RISK and requires careful procedures.

---

## GIT STRATEGY

### Branch Structure
```
main (production)
  └─ feature/phase1-foundation-migration (Phase 1 complete)
       └─ feature/phase2-module-integration (Phase 2 work)
            ├─ tag: phase2-checkpoint-T+4h
            ├─ tag: phase2-checkpoint-T+8h
            ├─ tag: phase2-checkpoint-T+16h
            └─ tag: phase2-complete-T+24h
```

### Checkpoint Strategy
**Create git tag every 4 hours:**
```bash
# At T+4h
git add .
git commit -m "stabilize(phase2): T+4h checkpoint - Customer validation, email testing"
git tag -a phase2-checkpoint-T+4h -m "Phase 2 Checkpoint: 4 hours"
git push origin feature/phase2-module-integration --tags

# At T+8h (Day 1 complete)
git add .
git commit -m "stabilize(phase2): T+8h checkpoint - All backends wired and tested"
git tag -a phase2-checkpoint-T+8h -m "Phase 2 Checkpoint: Day 1 Complete"
git push origin feature/phase2-module-integration --tags

# At T+16h (Day 2 complete)
git add .
git commit -m "stabilize(phase2): T+16h checkpoint - Frontend integration complete"
git tag -a phase2-checkpoint-T+16h -m "Phase 2 Checkpoint: Day 2 Complete"
git push origin feature/phase2-module-integration --tags

# At T+24h (Phase 2 complete)
git add .
git commit -m "stabilize(phase2): T+24h - Phase 2 module migration complete"
git tag -a phase2-complete-T+24h -m "Phase 2 Complete: All modules operational"
git push origin feature/phase2-module-integration --tags
```

---

## ROLLBACK SCENARIOS

### Scenario 1: Minor Issue During Testing
**Symptoms:**
- Single API endpoint not working
- Small frontend component issue
- Non-critical test failure

**Severity:** LOW
**Action:** Fix forward, no rollback needed

**Procedure:**
1. Fix the specific issue
2. Test the fix
3. Continue with migration
4. Document issue in lessons learned

---

### Scenario 2: Critical Issue After Checkpoint
**Symptoms:**
- Multiple tests failing
- API completely broken
- Database queries causing errors
- Performance severely degraded

**Severity:** MEDIUM
**Action:** Rollback to last checkpoint

**Procedure:**
```bash
# 1. Identify last good checkpoint
git tag -l "phase2-checkpoint-*"

# 2. Check what changed since checkpoint
git log phase2-checkpoint-T+4h..HEAD --oneline

# 3. Create backup of current work
git branch phase2-broken-$(date +%Y%m%d-%H%M%S)

# 4. Hard reset to checkpoint
git reset --hard phase2-checkpoint-T+4h

# 5. Force push to remote (if needed)
git push origin feature/phase2-module-integration --force-with-lease

# 6. Verify system works
npm run dev
# Test key endpoints manually

# 7. Investigate issue in broken branch
git checkout phase2-broken-20251121-143000
# Debug and fix

# 8. Cherry-pick good commits back
git checkout feature/phase2-module-integration
git cherry-pick <good-commit-hash>
```

---

### Scenario 3: Production Breaking After Email System Removal
**Symptoms:**
- Emails not sending
- Inbox page broken
- Email history lost
- Webhook endpoints not responding

**Severity:** CRITICAL
**Action:** Emergency rollback to before email system removal

**Procedure:**

#### Step 1: Immediate Rollback (5 minutes)
```bash
# Find commit BEFORE old email system removal
git log --oneline --all --grep="email" --grep="remove" --grep="cleanup"

# Hard reset to before removal
git reset --hard <commit-before-removal>

# Force push
git push origin feature/phase2-module-integration --force-with-lease

# Restart server
pm2 restart autolytiq
# or
npm run dev
```

#### Step 2: Verify Email System Works (5 minutes)
```bash
# Test sending email
curl -X POST http://localhost:5000/api/email/send \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=$SESSION" \
  -d '{
    "to": "test@example.com",
    "subject": "Rollback Test",
    "body": "Testing email after rollback"
  }'

# Test listing emails
curl -X GET http://localhost:5000/api/email/messages \
  -H "Cookie: connect.sid=$SESSION"

# Check inbox page in browser
open http://localhost:5000/inbox
```

#### Step 3: Root Cause Analysis (30 minutes)
1. What was removed that broke the system?
2. Was there a dependency we missed?
3. Did frontend code still rely on old system?
4. Were webhooks properly redirected?

#### Step 4: Create Safe Removal Plan
1. Identify ALL dependencies on old email system
2. Ensure new email module handles all use cases
3. Create migration script for data if needed
4. Test removal in isolated branch
5. Document removal steps
6. Attempt removal again with safeguards

---

### Scenario 4: Performance Degradation
**Symptoms:**
- APIs responding > 2s
- Database queries slow
- Frontend TTI > 3s
- Server CPU/memory high

**Severity:** MEDIUM
**Action:** Identify bottleneck, fix or rollback

**Procedure:**

#### Step 1: Identify Bottleneck (15 minutes)
```bash
# Check server logs for slow queries
tail -f logs/server.log | grep -i "slow\|timeout\|error"

# Check API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:5000/api/customers

# Check database query performance
# In PostgreSQL:
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC
LIMIT 20;
```

#### Step 2: Quick Fix Attempt (30 minutes)
- Add database indexes if queries are slow
- Add caching if API calls are repeated
- Optimize query logic if overly complex
- Add pagination if returning too much data

#### Step 3: Rollback If Can't Fix (If > 1 hour)
```bash
# If can't fix in 1 hour, rollback to last checkpoint
git reset --hard phase2-checkpoint-T+8h
git push origin feature/phase2-module-integration --force-with-lease

# Document performance issue
echo "Performance bottleneck found in [module] at [time]" >> ROLLBACK_LOG.md
echo "Issue: [description]" >> ROLLBACK_LOG.md
echo "Queries: [slow queries]" >> ROLLBACK_LOG.md
```

#### Step 4: Fix in Separate Branch
```bash
# Create performance fix branch
git checkout -b fix/phase2-performance-optimization

# Fix issue with proper optimization
# Add indexes, caching, query optimization

# Test thoroughly
npm run validate:phase2

# Benchmark before/after
npm run benchmark

# Merge back when fixed
git checkout feature/phase2-module-integration
git merge fix/phase2-performance-optimization
```

---

### Scenario 5: Database Migration Failure
**Symptoms:**
- Module queries failing with schema errors
- New columns/tables not found
- Data inconsistency

**Severity:** HIGH
**Action:** Rollback database and code together

**Procedure:**

#### Step 1: Identify Database State
```bash
# Check current migrations
psql $DATABASE_URL -c "SELECT * FROM drizzle_migrations ORDER BY created_at DESC LIMIT 5;"

# Check if Phase 2 migrations were applied
ls -la migrations/ | grep phase2
```

#### Step 2: Rollback Database (If migrations applied)
```bash
# Rollback specific migration
npm run db:rollback -- --to=<migration-name>

# Or manually rollback
psql $DATABASE_URL -f migrations/rollback/phase2-rollback.sql
```

#### Step 3: Rollback Code
```bash
# Reset to before database changes
git reset --hard phase2-checkpoint-T+8h
git push origin feature/phase2-module-integration --force-with-lease
```

#### Step 4: Restart Server
```bash
# Clear any cached schema
rm -rf node_modules/.cache

# Restart
npm run dev
```

---

## ROLLBACK DECISION MATRIX

| Issue Type | Severity | Time to Fix | Action |
|------------|----------|-------------|--------|
| Single endpoint broken | Low | < 30 min | Fix forward |
| Multiple tests failing | Medium | < 1 hour | Fix forward or rollback |
| Critical API broken | High | < 30 min | Rollback immediately |
| Production emails broken | Critical | Any | **Emergency rollback** |
| Performance degraded | Medium | < 1 hour | Fix or rollback |
| Database errors | High | < 30 min | Rollback DB + code |
| Security vulnerability | Critical | Any | **Immediate rollback** |

---

## PREVENTION MEASURES

### Before Each Major Change
1. **Create checkpoint:**
   ```bash
   git add .
   git commit -m "stabilize(phase2): checkpoint before [change]"
   git tag -a checkpoint-$(date +%Y%m%d-%H%M%S) -m "Pre-change checkpoint"
   ```

2. **Run validation:**
   ```bash
   npm run validate:phase2
   ```

3. **Test critical flows manually**

### During Email System Removal (HIGH RISK)
1. **Remove files ONE AT A TIME**
2. **Test after EACH file removal:**
   ```bash
   # Remove one file
   git rm server/email-config.ts

   # Commit
   git add .
   git commit -m "stabilize(phase2): remove old email config"

   # Test
   npm run dev
   curl http://localhost:5000/api/email/messages

   # If broken, rollback immediately
   git reset --hard HEAD~1
   ```

3. **Document each removal step**

### Continuous Validation
```bash
# Run every 30 minutes during migration
npm run validate:phase2

# Run before each checkpoint
npm run validate:phase2 -- --checkpoint=T+4h
```

---

## EMERGENCY CONTACTS

### If Critical Production Issue
1. **Stop migration immediately**
2. **Assess severity (1-5 scale)**
3. **If severity >= 4:** Rollback without investigation
4. **If severity <= 3:** Attempt quick fix (max 30 min), then rollback
5. **Document incident**
6. **Post-mortem after rollback**

### Escalation Path
1. **Blocker identified** → Report to Project Orchestrator
2. **Orchestrator assessment** → Severity rating
3. **If critical** → Immediate rollback
4. **If high** → 30 min fix window, then rollback
5. **If medium/low** → Continue with fix

---

## ROLLBACK VALIDATION CHECKLIST

After any rollback, validate:

```bash
# 1. Server starts without errors
npm run dev
# Check console for startup errors

# 2. Database queries work
npm run validate:phase2

# 3. Critical API endpoints respond
curl http://localhost:5000/api/customers
curl http://localhost:5000/api/email/messages
curl http://localhost:5000/api/deals

# 4. Frontend loads
open http://localhost:5000

# 5. Test critical user flows
# - Login
# - View inbox
# - Create deal
# - Search customers

# 6. Check error logs
tail -f logs/server.log | grep -i error
```

**All must pass before considering rollback successful.**

---

## POST-ROLLBACK ACTIONS

### Immediate (Within 1 hour)
1. **Document rollback:**
   - What was rolled back?
   - Why did it fail?
   - What was the impact?

2. **Notify stakeholders:**
   - Migration timeline adjusted
   - New ETA for completion
   - Lessons learned

3. **Create post-mortem:**
   - Root cause analysis
   - What we'll do differently
   - How to prevent in future

### Short-term (Within 1 day)
1. **Fix root cause in isolation**
2. **Create comprehensive test for failure case**
3. **Validate fix in separate branch**
4. **Document new safeguards**

### Before Retry
1. **Review rollback log**
2. **Apply lessons learned**
3. **Add additional validation**
4. **Brief team on new approach**
5. **Get approval to proceed**

---

## ROLLBACK LOG FORMAT

When rollback occurs, log to `/ROLLBACK_LOG.md`:

```markdown
## Rollback: [Date/Time]

**Trigger:** [What went wrong]
**Severity:** [Low/Medium/High/Critical]
**Rollback From:** [commit hash or tag]
**Rollback To:** [commit hash or tag]

**Impact:**
- [What broke]
- [How many endpoints affected]
- [User-facing impact]

**Root Cause:**
[Technical explanation]

**Prevention:**
[What we'll do differently]

**Retry ETA:**
[When we'll attempt again]
```

---

## TESTING ROLLBACK PROCEDURES

**Before starting Phase 2:**
```bash
# Create test branch
git checkout -b test/rollback-procedure

# Make intentional breaking change
echo "BROKEN" >> server/routes.ts

# Commit
git add .
git commit -m "test: intentional break"
git tag test-broken

# Practice rollback
git reset --hard HEAD~1

# Verify system works
npm run dev

# Clean up
git checkout feature/phase2-module-integration
git branch -D test/rollback-procedure
```

**Practice rollback at least once before starting high-risk work.**

---

## CONFIDENCE LEVELS

| Rollback Scenario | Confidence | Tested? | Documentation |
|-------------------|------------|---------|---------------|
| Git checkpoint rollback | HIGH | ✅ | Complete |
| Email system removal rollback | MEDIUM | ⚠️ Needs testing | Complete |
| Database migration rollback | MEDIUM | ❌ Not tested | Complete |
| Performance degradation | HIGH | ✅ | Complete |
| API endpoint failure | HIGH | ✅ | Complete |

**Action Required:** Test email system removal rollback before attempting removal.

---

**Remember:** It's better to rollback and fix properly than to push broken code forward.
