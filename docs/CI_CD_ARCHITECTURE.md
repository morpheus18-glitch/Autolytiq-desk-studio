# CI/CD Architecture - Dependency-Aware Testing

**Last Updated:** 2025-11-28
**Status:** Active

---

## Overview

Our CI/CD system uses **intelligent dependency-aware testing** to:

- ✅ Test only changed services and their dependents
- ✅ Run independent services in parallel
- ✅ Respect service dependencies (test dependencies before dependents)
- ✅ Deploy services independently
- ✅ Save time and compute resources

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Code Push/Pull Request                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│          Smart CI: Detect Changed Services                   │
│  (Uses path filters to identify what changed)               │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Independent  │  │ Independent  │  │ Independent  │
│  Services    │  │  Services    │  │  Services    │
│              │  │              │  │              │
│  PARALLEL    │  │  PARALLEL    │  │  PARALLEL    │
│  TESTING     │  │  TESTING     │  │  TESTING     │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └────────┬────────┴────────┬────────┘
                │                 │
                ▼                 ▼
        ┌───────────────┐  ┌──────────────────┐
        │  Dependent    │  │  Dependent       │
        │  Services     │  │  Services        │
        │               │  │                  │
        │  SEQUENTIAL   │  │  SEQUENTIAL      │
        │  (After deps) │  │  (After deps)    │
        └───────┬───────┘  └──────┬───────────┘
                │                 │
                └────────┬────────┘
                         ▼
                 ┌───────────────┐
                 │   All Tests   │
                 │    Passed     │
                 └───────┬───────┘
                         │
                         ▼
                 ┌───────────────┐
                 │  Deploy to    │
                 │  Environment  │
                 └───────────────┘
```

---

## Service Dependency Graph

Defined in: `.github/service-dependencies.json`

### Independent Services (Tier 1)

These have NO dependencies and test in parallel:

- `auth-service` (Go)
- `deal-service` (Go)
- `customer-service` (Go)
- `inventory-service` (Go)
- `email-service` (Go)
- `user-service` (Go)
- `config-service` (Go)
- `showroom-service` (Go)
- `messaging-service` (Go)
- `settings-service` (Go)
- `tax-engine-rs` (Rust/WASM)
- `udc-engine` (Rust)

### Dependent Services (Tier 2)

These depend on Tier 1 services:

- `data-retention-service` → depends on customer, deal, email
  - Tests AFTER customer-service, deal-service, email-service pass

### API Gateway (Tier 3)

- `api-gateway` → depends on ALL backend services
  - Tests AFTER all backend services pass

### Frontend (Tier 4)

- `client` → depends on api-gateway
  - Tests AFTER api-gateway passes

---

## Workflow Files

### Core Workflows

| File            | Purpose                                     | When It Runs                    |
| --------------- | ------------------------------------------- | ------------------------------- |
| `smart-ci.yml`  | Main CI workflow with dependency awareness  | Push/PR to main/develop/feat/\* |
| `pr-check.yaml` | PR validation (title format, size, secrets) | Pull requests                   |
| `security-scan` | Trivy security scanning                     | Every push                      |

### Reusable Workflows (Templates)

| File                            | Purpose                   | Used By                   |
| ------------------------------- | ------------------------- | ------------------------- |
| `_reusable-go-test.yml`         | Test any Go service       | All Go services           |
| `_reusable-rust-test.yml`       | Test any Rust service     | tax-engine-rs, udc-engine |
| `_reusable-typescript-test.yml` | Test TypeScript code      | client, root tests        |
| `_reusable-deploy-service.yml`  | Deploy any service to K8s | All deployment workflows  |

### Individual Service Deployments

| File                      | Service      | Triggers                       |
| ------------------------- | ------------ | ------------------------------ |
| `deploy-auth-service.yml` | auth-service | Push to main (service changed) |
| `deploy-api-gateway.yml`  | api-gateway  | Push to main (service changed) |
| _(Add more per service)_  | ...          | ...                            |

---

## How It Works

### 1. Change Detection

When code is pushed, the `detect-changes` job uses `dorny/paths-filter` to identify which services changed:

```yaml
paths:
  auth-service:
    - 'services/auth-service/**'
  shared:
    - 'shared/**'
    - '.github/**'
```

**Special case:** Changes to `shared/**` trigger tests for ALL services.

### 2. Parallel Testing (Independent Services)

All independent services test in parallel:

```yaml
test-auth-service:
  if: needs.detect-changes.outputs.auth-service == 'true'
  uses: ./.github/workflows/_reusable-go-test.yml

test-deal-service:
  if: needs.detect-changes.outputs.deal-service == 'true'
  uses: ./.github/workflows/_reusable-go-test.yml
# Both run simultaneously if both changed
```

### 3. Sequential Testing (Dependent Services)

Dependent services wait for their dependencies:

```yaml
test-data-retention-service:
  needs:
    - test-customer-service
    - test-deal-service
    - test-email-service
  if: |
    (needs.test-customer-service.result == 'success' || needs.test-customer-service.result == 'skipped') &&
    (needs.test-deal-service.result == 'success' || needs.test-deal-service.result == 'skipped')
```

**Logic:**

- Wait for dependencies
- Run ONLY if dependencies passed OR were skipped
- Skip if dependencies failed

### 4. Smart Skipping

Services only test if:

- The service itself changed, OR
- A service it depends on changed, OR
- Shared code changed

**Example:**

```
auth-service changed → Test: auth-service, api-gateway
deal-service changed → Test: deal-service, data-retention-service, api-gateway
shared/ changed → Test: ALL services
```

---

## Deployment Flow

### 1. Individual Service Deployment

Each service has its own deployment workflow:

```yaml
# .github/workflows/deploy-auth-service.yml
on:
  push:
    branches: [main]
    paths:
      - 'services/auth-service/**'
```

**Flow:**

1. Detect service change on `main` branch
2. Run service tests
3. Build Docker image
4. Push to ECR
5. Deploy to Kubernetes (staging by default)
6. Run smoke tests
7. Rollback on failure

### 2. Manual Deployment

Trigger via GitHub Actions UI:

1. Go to Actions → Deploy [Service Name]
2. Click "Run workflow"
3. Select environment (dev/staging/prod)
4. Click "Run workflow"

### 3. Production Deployment

**Recommended:** Use Git tags

```bash
git tag -a v1.2.3 -m "Release auth-service v1.2.3"
git push origin v1.2.3
```

This triggers production deployment with version tag.

---

## Benefits Over Old System

### Old System (Monolithic)

❌ All services tested on every push
❌ Slow (10-15 minutes)
❌ Sequential matrix builds
❌ Wastes compute time
❌ Hard to debug failures
❌ All-or-nothing deploys

### New System (Dependency-Aware)

✅ Only changed services tested
✅ Fast (2-5 minutes typically)
✅ Parallel + smart sequencing
✅ Saves compute time (~70% reduction)
✅ Clear per-service status
✅ Independent deployments

---

## Examples

### Example 1: Change Only auth-service

```bash
# Edit services/auth-service/main.go
git add services/auth-service/main.go
git commit -m "fix(auth): improve password validation"
git push
```

**What Runs:**

1. ✅ `test-auth-service` (direct change)
2. ✅ `test-api-gateway` (depends on auth-service)
3. ⏭️ Skip: All other services

**Time:** ~3 minutes (instead of 12 minutes for full test suite)

### Example 2: Change shared code

```bash
# Edit shared/schema.ts
git add shared/schema.ts
git commit -m "feat(schema): add new field to User table"
git push
```

**What Runs:**

1. ✅ ALL services (shared code affects everyone)

**Time:** ~12 minutes (full suite, as expected)

### Example 3: Change client

```bash
# Edit client/src/components/DealCard.tsx
git add client/src/components/DealCard.tsx
git commit -m "feat(ui): improve deal card styling"
git push
```

**What Runs:**

1. ✅ `test-client` (direct change)
2. ⏭️ Skip: Backend services (no dependency)

**Time:** ~2 minutes

### Example 4: Change data-retention-service

```bash
# Edit services/data-retention-service/main.go
git add services/data-retention-service/main.go
git commit -m "feat(gdpr): add automated data deletion"
git push
```

**What Runs:**

1. ✅ `test-customer-service` (dependency, if also changed)
2. ✅ `test-deal-service` (dependency, if also changed)
3. ✅ `test-email-service` (dependency, if also changed)
4. ✅ `test-data-retention-service` (direct change)
5. ✅ `test-api-gateway` (depends on data-retention)
6. ⏭️ Skip: Other independent services

**Time:** ~5 minutes

---

## Adding a New Service

### 1. Update Dependency Configuration

Edit `.github/service-dependencies.json`:

```json
{
  "services": {
    "new-service": {
      "type": "go",
      "path": "services/new-service/**",
      "dependencies": ["auth-service"],
      "description": "New service - depends on auth"
    }
  },
  "reverseDependencies": {
    "auth-service": ["api-gateway", "new-service"]
  }
}
```

### 2. Add to smart-ci.yml

Add path filter:

```yaml
detect-changes:
  outputs:
    new-service: ${{ steps.filter.outputs.new-service }}
  steps:
    - uses: dorny/paths-filter@v3
      with:
        filters: |
          new-service:
            - 'services/new-service/**'
```

Add test job:

```yaml
test-new-service:
  needs:
    - detect-changes
    - test-auth-service # Wait for dependency
  if: |
    needs.detect-changes.outputs.new-service == 'true' &&
    (needs.test-auth-service.result == 'success' || needs.test-auth-service.result == 'skipped')
  uses: ./.github/workflows/_reusable-go-test.yml
  with:
    service-name: new-service
    working-directory: services/new-service
```

### 3. Create Deployment Workflow

Copy `deploy-auth-service.yml` → `deploy-new-service.yml` and update service name.

---

## Monitoring & Debugging

### View CI Results

1. Go to GitHub repository
2. Click "Actions" tab
3. Click on workflow run
4. Expand "Smart CI Summary" for overview

### Debug Test Failures

1. Click failing job
2. Expand failed step
3. View logs
4. Check coverage reports (Codecov)

### Check Service Dependencies

```bash
cat .github/service-dependencies.json | jq '.reverseDependencies["auth-service"]'
# Shows: ["api-gateway"]
```

---

## Performance Metrics

### Before (Monolithic CI)

- **Average CI time:** 12 minutes
- **All services built:** Always
- **Parallel jobs:** Limited (matrix strategy)
- **False failures:** High (unrelated service failures block everything)

### After (Smart CI)

- **Average CI time:** 3-5 minutes
- **Services built:** Only changed + dependents
- **Parallel jobs:** Maximum (all independent services)
- **False failures:** Low (isolated service failures)

**Time Savings:** ~60-70% reduction in CI time

---

## Future Improvements

### Planned Features

- [ ] Automatic dependent service notification
- [ ] Smart rollback across dependent services
- [ ] Canary deployments per service
- [ ] Integration test orchestration
- [ ] Cross-service contract testing
- [ ] Deployment approval gates
- [ ] Auto-scaling based on service load

### Potential Optimizations

- [ ] Layer caching for Docker builds
- [ ] Distributed test execution
- [ ] Predictive testing (ML-based)
- [ ] Progressive rollouts

---

## Troubleshooting

### Issue: All services testing when only one changed

**Cause:** Likely `shared/**` code changed
**Solution:** Check git diff for shared files

### Issue: Dependent service not testing

**Cause:** Dependency failed or dependency condition incorrect
**Solution:** Check dependency test results and `if:` conditions

### Issue: Deployment stuck on rollout

**Cause:** New pods not becoming ready
**Solution:** Check pod logs with `kubectl logs -n autolytiq-staging <pod-name>`

### Issue: Tests passing locally but failing in CI

**Cause:** Environment differences (database, env vars)
**Solution:** Check workflow environment setup, compare with local

---

## Best Practices

### DO:

✅ Keep service dependencies minimal
✅ Test services independently before integration
✅ Use reusable workflows for consistency
✅ Monitor CI times and optimize slow tests
✅ Document service dependencies clearly

### DON'T:

❌ Create circular dependencies
❌ Skip tests to "save time"
❌ Deploy without testing
❌ Hardcode environment-specific values
❌ Ignore failed smoke tests

---

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Path Filters Action](https://github.com/dorny/paths-filter)
- [Reusable Workflows](https://docs.github.com/en/actions/using-workflows/reusing-workflows)
- [Dependency Graph JSON](.github/service-dependencies.json)
- [Smart CI Workflow](.github/workflows/smart-ci.yml)

---

**Maintained by:** DevOps Team
**Questions?** See [ARCHITECTURE_RULES.md](./ARCHITECTURE_RULES.md)
