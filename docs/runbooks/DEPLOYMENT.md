# Deployment Runbook

## Overview

This document provides comprehensive deployment procedures for the Autolytiq Desk Studio microservices application running on AWS EKS with Kubernetes.

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Procedure](#deployment-procedure)
3. [Rollback Procedures](#rollback-procedures)
4. [Post-Deployment Verification](#post-deployment-verification)
5. [Database Migration Procedures](#database-migration-procedures)
6. [Feature Flag Management](#feature-flag-management)
7. [Environment-Specific Procedures](#environment-specific-procedures)

---

## Pre-Deployment Checklist

### Code Quality Gates

- [ ] All unit tests pass (`npm run test`)
- [ ] All integration tests pass (`npm run test:integration`)
- [ ] Linting passes with no errors (`npm run lint`)
- [ ] TypeScript compilation succeeds (`npm run build`)
- [ ] Security scan completed (no critical/high vulnerabilities)
- [ ] Code review approved by at least one team member
- [ ] PR checks pass in GitHub Actions

### Infrastructure Verification

- [ ] Target environment (dev/staging/prod) is healthy
- [ ] Kubernetes cluster is accessible
  ```bash
  kubectl cluster-info
  kubectl get nodes
  ```
- [ ] All existing pods are running
  ```bash
  kubectl get pods -n autolytiq-<environment>
  ```
- [ ] No ongoing incidents or alerts
- [ ] Database is accessible and healthy
  ```bash
  kubectl exec -it <postgres-pod> -n autolytiq-<environment> -- pg_isready
  ```

### Dependency Verification

- [ ] All external service dependencies are available
- [ ] Third-party API keys are valid and not expiring
- [ ] SSL certificates are valid (30+ days remaining)
- [ ] AWS credentials have required permissions

### Communication

- [ ] Deployment scheduled in team calendar
- [ ] Stakeholders notified of deployment window
- [ ] On-call engineer available during deployment
- [ ] Slack channel `#deployments` notified

### Rollback Preparation

- [ ] Previous release tag identified
  ```bash
  git tag -l --sort=-v:refname | head -5
  ```
- [ ] Database backup completed (for schema changes)
- [ ] Rollback runbook reviewed
- [ ] Quick rollback command prepared

---

## Deployment Procedure

### Automated Deployment (Recommended)

The standard deployment flow uses GitHub Actions CI/CD pipeline.

#### Staging Deployment (Automatic)

Staging deployments trigger automatically when code is merged to `main`:

1. **Merge PR to main branch**

   ```bash
   git checkout main
   git pull origin main
   git merge feature/your-branch
   git push origin main
   ```

2. **Monitor deployment in GitHub Actions**
   - Navigate to Actions tab in GitHub
   - Watch the `CD` workflow
   - Verify all jobs complete successfully

3. **Verify deployment**
   ```bash
   kubectl get pods -n autolytiq-staging -w
   ```

#### Production Deployment

Production deployments require a version tag:

1. **Create release tag**

   ```bash
   git checkout main
   git pull origin main
   git tag -a v1.2.3 -m "Release v1.2.3: Brief description"
   git push origin v1.2.3
   ```

2. **Monitor deployment in GitHub Actions**
   - Watch the `CD` workflow with `prod` environment
   - Requires manual approval in GitHub Environments

3. **Approve deployment**
   - Navigate to the workflow run
   - Click "Review deployments"
   - Select `prod` environment and approve

### Manual Deployment (Emergency Only)

Use only when CI/CD pipeline is unavailable.

#### Prerequisites

```bash
# Configure AWS credentials
aws configure

# Update kubeconfig
aws eks update-kubeconfig --name autolytiq-cluster --region us-east-1

# Verify access
kubectl get pods -n autolytiq-<environment>
```

#### Deploy Specific Service

```bash
# Navigate to kubernetes configs
cd infrastructure/k8s/overlays/<environment>

# Update image tag
kustomize edit set image autolytiq/<service>=<ecr-registry>/autolytiq/<service>:<tag>

# Apply changes
kustomize build . | kubectl apply -f -

# Watch rollout
kubectl rollout status deployment/<service> -n autolytiq-<environment> --timeout=300s
```

#### Deploy All Services

```bash
# Set environment variables
export ENVIRONMENT=staging  # or prod
export IMAGE_TAG=v1.2.3

# Navigate to overlay
cd infrastructure/k8s/overlays/${ENVIRONMENT}

# Update all images
kustomize edit set image \
  autolytiq/api-gateway=<ecr-registry>/autolytiq/api-gateway:${IMAGE_TAG} \
  autolytiq/auth-service=<ecr-registry>/autolytiq/auth-service:${IMAGE_TAG} \
  autolytiq/deal-service=<ecr-registry>/autolytiq/deal-service:${IMAGE_TAG} \
  autolytiq/customer-service=<ecr-registry>/autolytiq/customer-service:${IMAGE_TAG} \
  autolytiq/inventory-service=<ecr-registry>/autolytiq/inventory-service:${IMAGE_TAG} \
  autolytiq/email-service=<ecr-registry>/autolytiq/email-service:${IMAGE_TAG} \
  autolytiq/user-service=<ecr-registry>/autolytiq/user-service:${IMAGE_TAG} \
  autolytiq/config-service=<ecr-registry>/autolytiq/config-service:${IMAGE_TAG}

# Apply all manifests
kustomize build . | kubectl apply -f -

# Watch rollouts for each service
for svc in api-gateway auth-service deal-service customer-service inventory-service email-service user-service config-service; do
  echo "Waiting for $svc..."
  kubectl rollout status deployment/$svc -n autolytiq-${ENVIRONMENT} --timeout=300s
done
```

### Canary Deployment (Production)

For high-risk changes, use canary deployment:

1. **Deploy canary version (10% traffic)**

   ```bash
   # Create canary deployment
   kubectl apply -f - <<EOF
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: api-gateway-canary
     namespace: autolytiq-prod
   spec:
     replicas: 1
     selector:
       matchLabels:
         app: api-gateway
         version: canary
     template:
       metadata:
         labels:
           app: api-gateway
           version: canary
       spec:
         containers:
           - name: api-gateway
             image: <ecr-registry>/autolytiq/api-gateway:<new-tag>
   EOF
   ```

2. **Monitor canary metrics**
   - Error rate should match or be lower than stable
   - Latency should match or be lower than stable
   - Monitor for 15-30 minutes

3. **Promote or rollback**

   ```bash
   # If successful, promote canary to stable
   kubectl set image deployment/api-gateway \
     api-gateway=<ecr-registry>/autolytiq/api-gateway:<new-tag> \
     -n autolytiq-prod

   # Delete canary
   kubectl delete deployment api-gateway-canary -n autolytiq-prod

   # If failed, just delete canary
   kubectl delete deployment api-gateway-canary -n autolytiq-prod
   ```

---

## Rollback Procedures

### Quick Rollback (Deployment Revision)

Kubernetes maintains deployment history. Use this for fast rollback:

```bash
# View deployment history
kubectl rollout history deployment/<service> -n autolytiq-<environment>

# Rollback to previous revision
kubectl rollout undo deployment/<service> -n autolytiq-<environment>

# Rollback to specific revision
kubectl rollout undo deployment/<service> -n autolytiq-<environment> --to-revision=<revision-number>

# Verify rollback
kubectl rollout status deployment/<service> -n autolytiq-<environment>
```

### Full Rollback (All Services)

```bash
# Set environment
export ENVIRONMENT=prod
export PREVIOUS_TAG=v1.2.2

# Rollback all services
for svc in api-gateway auth-service deal-service customer-service inventory-service email-service user-service config-service; do
  echo "Rolling back $svc..."
  kubectl rollout undo deployment/$svc -n autolytiq-${ENVIRONMENT}
done

# Verify all deployments
kubectl get deployments -n autolytiq-${ENVIRONMENT}
```

### Image Tag Rollback

If you need to rollback to a specific image version:

```bash
# Navigate to overlay
cd infrastructure/k8s/overlays/${ENVIRONMENT}

# Set previous image tag
kustomize edit set image autolytiq/<service>=<ecr-registry>/autolytiq/<service>:v1.2.2

# Apply
kustomize build . | kubectl apply -f -
```

### Database Rollback

If database migrations need to be reverted:

1. **Stop affected services**

   ```bash
   kubectl scale deployment/<service> --replicas=0 -n autolytiq-<environment>
   ```

2. **Run migration rollback**

   ```bash
   # Connect to database
   kubectl exec -it <postgres-pod> -n autolytiq-<environment> -- psql -U autolytiq_admin -d autolytiq

   # Review and run rollback script
   \i /migrations/rollback_<version>.sql
   ```

3. **Deploy previous service version**
   ```bash
   kubectl set image deployment/<service> <service>=<previous-image> -n autolytiq-<environment>
   kubectl scale deployment/<service> --replicas=3 -n autolytiq-<environment>
   ```

---

## Post-Deployment Verification

### Automated Health Checks

```bash
# Get the API Gateway URL
GATEWAY_URL=$(kubectl get svc api-gateway -n autolytiq-<environment> -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Health check
curl -f "https://${GATEWAY_URL}/health"

# Readiness check
curl -f "https://${GATEWAY_URL}/ready"
```

### Service-Specific Verification

```bash
# API Gateway
curl -s "https://${GATEWAY_URL}/health" | jq

# Auth Service (via gateway)
curl -s "https://${GATEWAY_URL}/api/auth/health" | jq

# Deal Service
curl -s "https://${GATEWAY_URL}/api/deals/health" | jq

# Customer Service
curl -s "https://${GATEWAY_URL}/api/customers/health" | jq

# Inventory Service
curl -s "https://${GATEWAY_URL}/api/inventory/health" | jq
```

### Verification Checklist

- [ ] All pods are in `Running` state
  ```bash
  kubectl get pods -n autolytiq-<environment> | grep -v Running
  ```
- [ ] No pods in `CrashLoopBackOff`
- [ ] All health endpoints return 200
- [ ] No new errors in logs
  ```bash
  kubectl logs -l tier=gateway -n autolytiq-<environment> --tail=100 | grep -i error
  ```
- [ ] Key user flows work in UI
- [ ] Prometheus metrics are being scraped
- [ ] Grafana dashboards show expected metrics

### Smoke Tests

Run the automated smoke test suite:

```bash
# Run smoke tests against deployed environment
npm run test:smoke -- --env=<environment>
```

Manual smoke test checklist:

- [ ] User can log in
- [ ] User can view deals list
- [ ] User can create a new deal
- [ ] User can view customer details
- [ ] User can search inventory
- [ ] Tax calculations return correct values
- [ ] Email notifications send successfully

### Monitoring Verification

1. **Check Prometheus targets**

   ```bash
   kubectl port-forward svc/prometheus 9090:9090 -n monitoring
   # Open http://localhost:9090/targets
   ```

2. **Verify Grafana dashboards**

   ```bash
   kubectl port-forward svc/grafana 3000:3000 -n monitoring
   # Open http://localhost:3000
   ```

3. **Check for new alerts**
   ```bash
   kubectl port-forward svc/alertmanager 9093:9093 -n monitoring
   # Open http://localhost:9093
   ```

---

## Database Migration Procedures

### Pre-Migration Checklist

- [ ] Migration scripts reviewed and tested in staging
- [ ] Backup completed
  ```bash
  # Create manual snapshot (AWS Console or CLI)
  aws rds create-db-cluster-snapshot \
    --db-cluster-identifier autolytiq-<environment> \
    --db-cluster-snapshot-identifier pre-migration-$(date +%Y%m%d-%H%M%S)
  ```
- [ ] Rollback script prepared and tested
- [ ] Estimated downtime communicated (if any)
- [ ] Maintenance window scheduled (for prod)

### Running Migrations

#### Prisma Migrations (Node.js Services)

```bash
# Deploy migrations
kubectl exec -it deployment/deal-service -n autolytiq-<environment> -- \
  npx prisma migrate deploy

# Verify migration status
kubectl exec -it deployment/deal-service -n autolytiq-<environment> -- \
  npx prisma migrate status
```

#### Go Service Migrations

```bash
# Run migrations via job
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration-$(date +%Y%m%d%H%M%S)
  namespace: autolytiq-<environment>
spec:
  template:
    spec:
      containers:
        - name: migration
          image: <ecr-registry>/autolytiq/deal-service:<tag>
          command: ["./migrate", "up"]
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: autolytiq-secrets
                  key: DATABASE_URL
      restartPolicy: Never
  backoffLimit: 3
EOF

# Watch job completion
kubectl get jobs -n autolytiq-<environment> -w
```

### Zero-Downtime Migrations

For schema changes that support zero-downtime:

1. **Expand phase**: Add new columns/tables (nullable)
2. **Deploy**: Deploy new code that writes to both old and new
3. **Migrate**: Backfill existing data
4. **Contract**: Deploy code that uses only new schema
5. **Cleanup**: Remove old columns/tables

Example:

```sql
-- Phase 1: Expand
ALTER TABLE deals ADD COLUMN new_status VARCHAR(50);

-- Phase 2: Code deploys, writes to both columns

-- Phase 3: Migrate
UPDATE deals SET new_status = old_status WHERE new_status IS NULL;

-- Phase 4: Code deploys, reads from new_status only

-- Phase 5: Contract (after verification)
ALTER TABLE deals DROP COLUMN old_status;
ALTER TABLE deals RENAME COLUMN new_status TO status;
```

---

## Feature Flag Management

### Overview

Feature flags are managed via the config-service and stored in Redis/database.

### Viewing Current Flags

```bash
# Via API
curl "https://${GATEWAY_URL}/api/config/feature-flags" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"

# Direct database query
kubectl exec -it <postgres-pod> -n autolytiq-<environment> -- \
  psql -U autolytiq_admin -d autolytiq \
  -c "SELECT * FROM feature_flags WHERE enabled = true;"
```

### Enabling/Disabling Flags

```bash
# Enable a feature flag
curl -X PUT "https://${GATEWAY_URL}/api/config/feature-flags/new-dashboard" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "rollout_percentage": 100}'

# Disable a feature flag
curl -X PUT "https://${GATEWAY_URL}/api/config/feature-flags/new-dashboard" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

### Gradual Rollout

```bash
# 10% rollout
curl -X PUT "https://${GATEWAY_URL}/api/config/feature-flags/new-tax-engine" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "rollout_percentage": 10}'

# Monitor metrics, then increase
# 50% rollout
curl -X PUT "https://${GATEWAY_URL}/api/config/feature-flags/new-tax-engine" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "rollout_percentage": 50}'

# 100% rollout
curl -X PUT "https://${GATEWAY_URL}/api/config/feature-flags/new-tax-engine" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "rollout_percentage": 100}'
```

### Emergency Flag Disable

If a feature causes issues:

```bash
# Immediately disable
curl -X PUT "https://${GATEWAY_URL}/api/config/feature-flags/<flag-name>" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'

# Clear cache (force all services to reload)
curl -X POST "https://${GATEWAY_URL}/api/config/cache/clear" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

---

## Environment-Specific Procedures

### Development (dev)

- Deployments auto-trigger on PR merge to feature branches
- No approval required
- Safe to experiment with breaking changes
- Database can be reset freely

### Staging

- Deployments auto-trigger on merge to `main`
- No manual approval required
- Should mirror production configuration
- Use for final validation before production

### Production

- Deployments require version tag (`v*`)
- Manual approval required in GitHub
- Deploy during low-traffic windows (recommended: Tuesday-Thursday, 10am-2pm ET)
- Notify stakeholders before and after deployment
- On-call engineer must be available

---

## Troubleshooting

### Deployment Stuck

```bash
# Check pod events
kubectl describe pod <pod-name> -n autolytiq-<environment>

# Check deployment events
kubectl describe deployment <deployment> -n autolytiq-<environment>

# Common issues:
# - Image pull errors: Check ECR permissions
# - Resource limits: Check node capacity
# - Probe failures: Check health endpoints
```

### Pod CrashLoopBackOff

```bash
# Get pod logs
kubectl logs <pod-name> -n autolytiq-<environment> --previous

# Common causes:
# - Missing environment variables
# - Database connection failures
# - Configuration errors
```

### Health Check Failures

```bash
# Test health endpoint from within cluster
kubectl run debug --rm -it --image=curlimages/curl -- curl -v http://<service>:8080/health

# Check service endpoints
kubectl get endpoints <service> -n autolytiq-<environment>
```

---

## Contacts

| Role             | Name          | Contact           |
| ---------------- | ------------- | ----------------- |
| On-Call Engineer | Rotating      | PagerDuty         |
| Platform Team    | Platform      | #platform-support |
| DevOps Lead      | TBD           | @devops-lead      |
| Security         | Security Team | #security         |

---

## Change Log

| Date       | Version | Author   | Changes         |
| ---------- | ------- | -------- | --------------- |
| 2024-11-26 | 1.0.0   | Ops Team | Initial version |
