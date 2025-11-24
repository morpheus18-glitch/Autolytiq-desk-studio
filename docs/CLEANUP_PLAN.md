# VM Cleanup Plan

## Current State (Messy)
- **58 SQL backup files** (~11MB) - Taking up space, not needed in git
- **51 markdown files in root** - Chaotic, hard to navigate
- **Temp files** (test scripts, quick fixes) - Should be deleted
- **Old documentation** - Outdated, confusing

## Goal State (Clean)
- **Zero SQL backups** - Databases should be backed up server-side, not in repo
- **~5-8 essential MD files in root** - Only architectural governance docs
- **All other docs in /docs/** - Organized by category
- **Git-ready** - Only commit what's necessary

---

## Files to KEEP in Root (Essential Only)

### Architectural Governance (KEEP)
1. `ARCHITECTURE_RULES.md` - Unbreakable architecture rules ✅
2. `AGENT_WORKFLOW_GUIDE.md` - AI agent discipline ✅
3. `README.md` - Project overview (need to create/update)
4. `CHANGELOG.md` - Release history (if exists)

### Project Status (KEEP - Move to /docs/ after review)
5. `CLEAN_REBUILD_SUMMARY.md` - Current rebuild plan
6. `MIGRATION_EXECUTION_CHECKLIST.md` - Current migration tasks

---

## Files to MOVE to /docs/

### Historical/Reference (Move to /docs/historical/)
- `CALCULATION_ISSUES_CRITICAL.md`
- `CREATE_ADMIN_SQL.md`
- `CURRENT_STATUS.md`
- `DATABASE_MIGRATION_COMPLETE.md`
- `DATABASE_SCHEMA_FIXES.md`
- `DEPLOYMENT_SAFETY.md`
- `DEPLOY_FIXES.md`
- All `EMAIL_*.md` files (9 files)
- All `FIX_*.md` files
- All `LOGIN_*.md`, `PRODUCTION_*.md`, `SCHEMA_*.md`
- `REPLIT_FIX_NOW.md`

### Feature Documentation (Move to /docs/features/)
- `LOCAL_TAX_IMPLEMENTATION_SUMMARY.md`
- `LOCAL_TAX_SYSTEM_README.md`
- `TAX_API_DOCUMENTATION.md`
- `TAX_ENGINE_INTEGRATION_SUMMARY.md`
- `ML_AGENT_README.md`
- `INTELLIGENCE_README.md`

### Testing (Move to /docs/testing/)
- `TESTING_ANALYSIS_REPORT.md`
- `TESTING_CHECKLIST.md`
- `TESTING_NEXT_STEPS.md`
- `TESTING_README.md`
- `TESTING_SUMMARY.md`

### Setup Guides (Move to /docs/guides/)
- `QUICK_START_GUIDE.md`
- `QUICK_START_LOCAL_TAX.md`
- `EMAIL_SETUP_GUIDE.md`
- `INBOX_SYNC_SETUP.md`
- `WORKFLOWS.md`

### Architecture (Already in /docs/, keep there)
- `CLEAN_REBUILD_FOUNDATION_PLAN.md`
- `TAX_ENGINE_MIGRATION_STRATEGY.md`

### Design (Move to /docs/design/)
- `design_guidelines.md`

---

## Files to DELETE (Temp/Obsolete)

### SQL Backups (DELETE - 58 files)
```bash
rm -f backup-*.sql
```

### Temp Test Files (DELETE)
- `test-ai-chat.html`
- `test-db-connection.js`
- `test-inbox-emails.mjs`
- `test-login.html`
- `test-ml.sh`
- `quick-admin.js`
- `quick-admin.mjs`
- `create-admin.ts`
- `create-admin-simple.js`

### Platform-Specific (DELETE - Not needed in git)
- `replit.md`
- `.replit`
- `replit_unreachable.png`

### Obsolete Documentation (DELETE after archiving to /docs/historical/)
- `UPDATE_DATABASE_URL.md`
- `UPDATED_EMAIL_FILES.md`

---

## New Structure After Cleanup

```
autolytiq/
├── README.md                           ← Main project overview
├── ARCHITECTURE_RULES.md               ← Governance
├── AGENT_WORKFLOW_GUIDE.md             ← Governance
├── CHANGELOG.md                        ← Release history
│
├── docs/
│   ├── ARCHITECTURE_INDEX.md           ← Navigation
│   ├── CLEAN_REBUILD_SUMMARY.md        ← Current plan
│   ├── MIGRATION_EXECUTION_CHECKLIST.md
│   │
│   ├── architecture/
│   │   ├── CLEAN_REBUILD_FOUNDATION_PLAN.md
│   │   ├── TAX_ENGINE_MIGRATION_STRATEGY.md
│   │   ├── UPDATED_ARCHITECTURE.md
│   │   └── ... (architecture docs)
│   │
│   ├── features/
│   │   ├── tax/
│   │   │   ├── LOCAL_TAX_IMPLEMENTATION_SUMMARY.md
│   │   │   └── TAX_API_DOCUMENTATION.md
│   │   ├── ml/
│   │   │   ├── ML_AGENT_README.md
│   │   │   └── INTELLIGENCE_README.md
│   │   └── email/
│   │       └── ... (email docs)
│   │
│   ├── guides/
│   │   ├── QUICK_START_GUIDE.md
│   │   └── WORKFLOWS.md
│   │
│   ├── testing/
│   │   ├── TESTING_README.md
│   │   └── TESTING_CHECKLIST.md
│   │
│   ├── security/
│   │   └── SECURITY_PII_HANDLING.md
│   │
│   ├── design/
│   │   └── design_guidelines.md
│   │
│   └── historical/
│       └── ... (old fixes, migrations, one-time tasks)
│
├── frontend/
├── services/
├── gateway/
├── shared/
└── ... (rest of codebase)
```

---

## Cleanup Script

```bash
#!/bin/bash

# 1. Delete SQL backups
echo "Deleting SQL backups..."
rm -f backup-*.sql

# 2. Delete temp test files
echo "Deleting temp files..."
rm -f test-*.html test-*.js test-*.mjs test-*.sh
rm -f quick-admin.* create-admin.* create-admin-simple.js

# 3. Delete platform-specific files
echo "Deleting platform files..."
rm -f replit.md .replit *.png

# 4. Create archive directory for historical docs
echo "Moving historical docs..."
mkdir -p docs/historical/
mv *_FIX*.md *_FIXES*.md docs/historical/ 2>/dev/null || true
mv *PRODUCTION*.md *DATABASE*.md *SCHEMA*.md docs/historical/ 2>/dev/null || true
mv REPLIT_*.md UPDATE_*.md UPDATED_*.md docs/historical/ 2>/dev/null || true

# 5. Organize by category
mkdir -p docs/features/tax docs/features/email docs/features/ml
mkdir -p docs/guides docs/testing docs/security docs/design

mv *TAX*.md docs/features/tax/ 2>/dev/null || true
mv *EMAIL*.md docs/features/email/ 2>/dev/null || true
mv *ML*.md *INTELLIGENCE*.md docs/features/ml/ 2>/dev/null || true

mv *QUICK_START*.md *WORKFLOWS*.md *SETUP*.md docs/guides/ 2>/dev/null || true
mv *TESTING*.md docs/testing/ 2>/dev/null || true
mv *SECURITY*.md *PII*.md docs/security/ 2>/dev/null || true
mv design_guidelines.md docs/design/ 2>/dev/null || true

echo "Cleanup complete!"
```

---

## Execution Steps

1. **Review this plan** - Make sure we're not deleting anything important
2. **Run cleanup script** - Execute the moves and deletes
3. **Update .gitignore** - Add patterns to prevent future clutter
4. **Create README.md** - Proper project overview
5. **Commit cleaned structure** - Git commit with clean state
6. **Push to GitHub** - Only essential files in repo

---

## After Cleanup: Disk Space Saved

- SQL backups: ~11MB
- Temp files: ~2-3MB
- Reduced clutter: Easier navigation
- Clean git history: Only track what matters
