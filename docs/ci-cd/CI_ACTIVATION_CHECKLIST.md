# CI/CD Pipeline Activation Checklist

**Status:** Ready for Activation
**Estimated Time:** 30 minutes
**Prerequisites:** GitHub admin access

---

## Phase 1: Pre-Activation Verification (5 minutes)

### Step 1: Verify Files Exist
```bash
# Check workflow files
ls -l .github/workflows/ci.yml
ls -l .github/workflows/pr-checks.yml

# Check scripts
ls -l scripts/ci-validation.ts

# Check documentation
ls -l CI_CD_SETUP.md
ls -l CI_PIPELINE_SUMMARY.md
ls -l .github/CI_QUICK_REFERENCE.md
ls -l .github/CI_PIPELINE_FLOW.md
```

Expected: All files exist ✅

### Step 2: Validate YAML Syntax
```bash
# Requires Python with PyYAML
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/pr-checks.yml'))"
```

Expected: No errors ✅

### Step 3: Test Local Validation Script
```bash
npm run ci:validate
```

Expected: Script runs (may have errors in current codebase - that's OK) ✅

---

## Phase 2: Test CI Locally (10 minutes)

### Step 4: Run TypeScript Check
```bash
npm run typecheck
```

Expected: Shows current type errors (if any)

### Step 5: Run ESLint
```bash
npm run lint
```

Expected: Shows current linting violations (if any)

### Step 6: Run Prettier
```bash
npm run format
```

Expected: Shows formatting issues (if any)

### Step 7: Run Full CI Suite
```bash
npm run ci
```

Expected: Runs all checks sequentially

**Note:** It's OK if checks fail at this point. We're testing that the commands work, not that code is perfect.

---

## Phase 3: Commit CI Files (5 minutes)

### Step 8: Stage CI Files
```bash
git add .github/workflows/ci.yml
git add .github/workflows/pr-checks.yml
git add scripts/ci-validation.ts
git add package.json
git add CI_CD_SETUP.md
git add CI_PIPELINE_SUMMARY.md
git add CI_ACTIVATION_CHECKLIST.md
git add .github/CI_QUICK_REFERENCE.md
git add .github/CI_PIPELINE_FLOW.md
```

### Step 9: Commit with Conventional Format
```bash
git commit -m "ci: Add comprehensive CI/CD pipeline with architectural enforcement

Implements Phase 5 of stabilization plan with:
- Main CI workflow (7 jobs, 15-20 min runtime)
- PR-specific architectural validation
- Local validation script
- Comprehensive documentation
- Zero-compromise quality gates

BREAKING: Requires branch protection setup in GitHub UI

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Step 10: Push to Remote
```bash
git push origin stabilization/architectural-rebuild
```

**This will trigger the CI pipeline for the first time!**

---

## Phase 4: Monitor First CI Run (5 minutes)

### Step 11: Go to GitHub Actions

1. Open GitHub repository in browser
2. Click **Actions** tab
3. Find the workflow run (should be top of list)
4. Click on the run to see details

### Step 12: Watch Jobs Execute

Expected job sequence:
1. Quality Gates (runs first, ~10 min)
2. Build, Tests, Security, Database (run in parallel)
3. Performance (runs after Build)
4. All-Checks (runs last)

**Take notes on:**
- Which jobs pass ✅
- Which jobs fail ❌
- Error messages
- Total run time

---

## Phase 5: Configure Branch Protection (10 minutes)

### Step 13: Navigate to Branch Settings

1. Go to repository **Settings**
2. Click **Branches** in left sidebar
3. Click **Add branch protection rule**
4. Branch name pattern: `main`

### Step 14: Configure Protection Rules

#### Basic Settings
- [x] Require pull request reviews before merging
  - Required approving reviews: **1**
  - [x] Dismiss stale pull request approvals when new commits are pushed

#### Status Checks (CRITICAL)
- [x] Require status checks to pass before merging
- [x] Require branches to be up to date before merging

**Add these required status checks:**
Type in search box and select:
- [ ] `quality`
- [ ] `build`
- [ ] `security`
- [ ] `all-checks`

**Important:** You may need to create a test PR first before these checks appear in the dropdown!

#### Additional Settings
- [x] Require conversation resolution before merging
- [x] Require linear history
- [x] Include administrators
- [x] Do not allow bypassing the above settings

### Step 15: Save Protection Rule

Click **Create** or **Save changes**

---

## Phase 6: Create Test PR (10 minutes)

### Step 16: Create Test Branch
```bash
git checkout -b test/ci-pipeline-validation
```

### Step 17: Add Test File with Intentional Error
```bash
cat > test-ci.ts << 'EOF'
// This file intentionally has errors to test CI

// TypeScript error: Type mismatch
const testNumber: string = 123;

// ESLint error: unused variable
const unusedVar = "test";

// Import path error (if enforcing)
import { something } from '../../../deep/path';

export const testCI = () => {
  console.log("Testing CI pipeline");
};
EOF

git add test-ci.ts
git commit -m "test(ci): Add file with intentional errors to test CI pipeline"
git push -u origin test/ci-pipeline-validation
```

### Step 18: Create Pull Request

1. Go to GitHub repository
2. Click **Pull requests** tab
3. Click **New pull request**
4. Base: `main`, Compare: `test/ci-pipeline-validation`
5. Click **Create pull request**
6. Title: "Test: CI Pipeline Validation"
7. Description: "Testing CI pipeline enforcement"

### Step 19: Verify CI Blocks Merge

Expected behavior:
- ❌ CI checks should FAIL
- ❌ "Merge" button should be DISABLED
- ❌ Status shows "Some checks were not successful"

Click on **Details** next to failed checks to see errors.

### Step 20: Fix Errors and Verify Blocking Removed

```bash
# Switch back to test branch
git checkout test/ci-pipeline-validation

# Remove test file with errors
rm test-ci.ts
git add test-ci.ts
git commit -m "fix(ci): Remove test file with errors"
git push
```

Expected behavior:
- ✅ CI checks should PASS
- ✅ "Merge" button should be ENABLED
- ✅ Status shows "All checks have passed"

### Step 21: Close Test PR

Don't merge - just close it:
1. Scroll down in PR
2. Click **Close pull request**
3. Delete the test branch

```bash
git checkout stabilization/architectural-rebuild
git branch -D test/ci-pipeline-validation
git push origin --delete test/ci-pipeline-validation
```

---

## Phase 7: Document & Communicate (5 minutes)

### Step 22: Update CLAUDE.md

Add to CLAUDE.md:
```markdown
## CI/CD Pipeline Status

**Status:** ✅ ACTIVE
**Documentation:** `/CI_CD_SETUP.md`
**Quick Reference:** `/.github/CI_QUICK_REFERENCE.md`

### For Developers
Before committing:
```bash
npm run ci:validate
```

Before creating PR:
```bash
npm run ci
```

All PRs must pass CI before merge. No exceptions.
```

### Step 23: Share Documentation with Team

Send to team:
1. Quick Reference: `.github/CI_QUICK_REFERENCE.md` (print this!)
2. Full documentation: `CI_CD_SETUP.md`
3. Visual flow: `.github/CI_PIPELINE_FLOW.md`

**Key message:**
> "CI/CD pipeline is now active. All code must pass TypeScript, ESLint, Prettier, and build checks before merge. No one can bypass - including admins. Run `npm run ci:validate` before committing to catch issues early."

---

## Verification Checklist

Use this to verify everything is working:

### CI Infrastructure
- [ ] `.github/workflows/ci.yml` exists and valid YAML
- [ ] `.github/workflows/pr-checks.yml` exists and valid YAML
- [ ] `scripts/ci-validation.ts` compiles without errors
- [ ] `npm run ci:validate` script works

### Documentation
- [ ] `CI_CD_SETUP.md` complete (580 lines)
- [ ] `CI_PIPELINE_SUMMARY.md` complete
- [ ] `.github/CI_QUICK_REFERENCE.md` complete
- [ ] `.github/CI_PIPELINE_FLOW.md` complete

### GitHub Configuration
- [ ] Workflows visible in Actions tab
- [ ] At least one workflow run completed
- [ ] Branch protection rule created for `main`
- [ ] Required status checks configured:
  - [ ] `quality`
  - [ ] `build`
  - [ ] `security`
  - [ ] `all-checks`
- [ ] "Include administrators" enabled
- [ ] "Do not allow bypass" enabled

### Testing
- [ ] Test PR created with intentional errors
- [ ] CI failed on errors ❌
- [ ] Merge blocked when CI failed 🚫
- [ ] Errors fixed
- [ ] CI passed on fixes ✅
- [ ] Merge enabled when CI passed ✅

### Team Communication
- [ ] Team notified of new CI requirements
- [ ] Quick reference shared
- [ ] Questions answered
- [ ] Support process defined

---

## Troubleshooting

### Issue: Workflows not running

**Possible causes:**
1. YAML syntax error
2. GitHub Actions disabled for repository
3. Permissions issue

**Fix:**
```bash
# Validate YAML
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"

# Check GitHub Actions enabled
# Settings → Actions → General → "Allow all actions"
```

### Issue: Required checks not appearing in branch protection

**Cause:** Checks must run at least once before they appear

**Fix:**
1. Push a commit to trigger CI
2. Wait for workflow to complete
3. Go back to branch protection settings
4. Required checks should now be in dropdown

### Issue: CI passes but merge still blocked

**Cause:** Other branch protection rules not satisfied

**Fix:**
Check that:
- [ ] PR has required approvals
- [ ] All conversations resolved
- [ ] Branch is up to date with base

### Issue: npm run ci:validate fails

**Cause:** TypeScript/ESLint errors in current code

**Fix:** This is expected if code hasn't been cleaned up yet. The script is working correctly - it's showing you what needs to be fixed.

---

## Success Criteria

CI/CD pipeline is fully activated when:

- ✅ All workflows run successfully
- ✅ Branch protection configured
- ✅ Test PR blocked by CI failures
- ✅ Test PR allowed after fixes
- ✅ Team notified and trained
- ✅ Documentation accessible

**Current Status:** Ready for Phase 1 ⏳

---

## Post-Activation Tasks

### Week 1
- [ ] Monitor CI pass rate (target: >80%)
- [ ] Track common failure reasons
- [ ] Refine rules if needed (with team consensus)
- [ ] Install `madge` for circular dependency detection

### Week 2-4
- [ ] Enable test coverage requirements
- [ ] Make test suite blocking (when coverage >80%)
- [ ] Add performance budgets
- [ ] Consider deployment pipeline

### Month 2
- [ ] Add E2E tests to CI
- [ ] Implement staging environment
- [ ] Add deployment automation
- [ ] Review and optimize CI times

---

## Support

**Questions?** Check:
1. `CI_CD_SETUP.md` - Full documentation
2. `.github/CI_QUICK_REFERENCE.md` - Common fixes
3. GitHub Actions job logs - Detailed errors

**Issues?** Contact:
- DevOps team
- Project Orchestrator
- Workhorse Engineer (creator)

---

## Timeline Summary

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 1 | Pre-activation verification | 5 min | ⏳ Pending |
| 2 | Test CI locally | 10 min | ⏳ Pending |
| 3 | Commit CI files | 5 min | ⏳ Pending |
| 4 | Monitor first CI run | 5 min | ⏳ Pending |
| 5 | Configure branch protection | 10 min | ⏳ Pending |
| 6 | Create test PR | 10 min | ⏳ Pending |
| 7 | Document & communicate | 5 min | ⏳ Pending |
| **Total** | | **~50 min** | |

---

**Start activation when you're ready. Follow steps in order. Don't skip branch protection setup!**

---

**Created:** 2025-11-22
**Last Updated:** 2025-11-22
**Status:** Ready for User Action
