# Disaster Recovery Plan

## Document Information

| Field            | Value                     |
| ---------------- | ------------------------- |
| Version          | 1.0                       |
| Last Updated     | 2024-01-15                |
| Owner            | Platform Engineering Team |
| Review Frequency | Quarterly                 |
| Next Review      | 2024-04-15                |

## Table of Contents

1. [Overview](#overview)
2. [Recovery Objectives](#recovery-objectives)
3. [Architecture Overview](#architecture-overview)
4. [Backup Strategy](#backup-strategy)
5. [Recovery Procedures](#recovery-procedures)
6. [Escalation and Communication](#escalation-and-communication)
7. [Testing and Validation](#testing-and-validation)
8. [Appendix](#appendix)

---

## Overview

This document outlines the disaster recovery (DR) procedures for the Autolytiq Desk Studio application. It covers recovery from various failure scenarios including database failures, service outages, complete cluster failures, and regional disasters.

### Scope

This DR plan covers:

- Aurora PostgreSQL database clusters
- Kubernetes (EKS) cluster and workloads
- Application services and configurations
- Supporting infrastructure (Redis, secrets, certificates)

### Assumptions

- AWS multi-region infrastructure is properly configured
- Cross-region replication is enabled for production
- On-call engineers have necessary AWS IAM permissions
- VPN access is available for emergency operations

---

## Recovery Objectives

### Recovery Time Objective (RTO)

| Scenario                        | Target RTO | Maximum RTO |
| ------------------------------- | ---------- | ----------- |
| Single service failure          | 5 minutes  | 15 minutes  |
| Database failover (same region) | 15 minutes | 30 minutes  |
| Complete cluster failure        | 30 minutes | 1 hour      |
| Region failure                  | 1 hour     | 4 hours     |

### Recovery Point Objective (RPO)

| Scenario                     | Target RPO    | Maximum RPO |
| ---------------------------- | ------------- | ----------- |
| Database (continuous backup) | 5 minutes     | 15 minutes  |
| Database (point-in-time)     | 1 second      | 5 minutes   |
| Application state            | 0 (stateless) | N/A         |
| Configuration changes        | 0 (GitOps)    | N/A         |

### Service Level Objectives

| Metric              | Target       | Minimum      |
| ------------------- | ------------ | ------------ |
| Availability        | 99.95%       | 99.9%        |
| Monthly downtime    | < 22 minutes | < 44 minutes |
| Backup success rate | 100%         | 99%          |

---

## Architecture Overview

### Primary Region (us-east-1)

```
                                    ┌─────────────────────────────────────────┐
                                    │           Primary Region (us-east-1)     │
                                    │                                          │
    Users ──► Route 53 ──► ALB ────►│  ┌─────────────────────────────────┐    │
                │                   │  │         EKS Cluster              │    │
                │                   │  │  ┌─────────┐  ┌─────────┐       │    │
                │                   │  │  │ Service │  │ Service │  ...  │    │
                │                   │  │  │   A     │  │   B     │       │    │
                │                   │  │  └────┬────┘  └────┬────┘       │    │
                │                   │  └───────┼────────────┼────────────┘    │
                │                   │          │            │                  │
                │                   │  ┌───────▼────────────▼────────────┐    │
                │                   │  │    Aurora PostgreSQL (Primary)   │    │
                │                   │  │    - Multi-AZ deployment         │    │
                │                   │  │    - Continuous backup           │    │
                │                   │  │    - 35-day retention            │    │
                │                   │  └──────────────┬───────────────────┘    │
                │                   │                 │                        │
                │                   │  ┌──────────────▼───────────────────┐    │
                │                   │  │         ElastiCache Redis        │    │
                │                   │  │    - Multi-AZ with auto-failover │    │
                │                   │  └──────────────────────────────────┘    │
                │                   │                                          │
                │                   └─────────────────────────────────────────┘
                │                                     │
                │                                     │ Cross-region
                │                                     │ Replication
                │                                     ▼
                │                   ┌─────────────────────────────────────────┐
                │                   │            DR Region (us-west-2)         │
                │                   │                                          │
                │   Failover ──────►│  ┌─────────────────────────────────┐    │
                │                   │  │    Aurora PostgreSQL (Replica)   │    │
                │                   │  │    - Read replica                │    │
                │                   │  │    - Promotable to primary       │    │
                │                   │  └──────────────────────────────────┘    │
                │                   │                                          │
                │                   │  ┌──────────────────────────────────┐    │
                │                   │  │         S3 Backup Bucket         │    │
                │                   │  │    - Replicated from primary     │    │
                │                   │  │    - Encrypted at rest           │    │
                │                   │  └──────────────────────────────────┘    │
                │                   │                                          │
                │                   │  ┌──────────────────────────────────┐    │
                │                   │  │         AWS Backup Vault         │    │
                │                   │  │    - Cross-region copy           │    │
                │                   │  └──────────────────────────────────┘    │
                │                   │                                          │
                │                   └─────────────────────────────────────────┘
```

### Backup Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Continuous     │     │     Daily       │     │    Weekly       │
│  Backup         │     │    Snapshot     │     │   Snapshot      │
│  (15 min)       │     │  (3:00 AM UTC)  │     │ (Sun 4:00 AM)   │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     AWS Backup Vault (Primary)                   │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  │ Cross-region copy
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AWS Backup Vault (DR)                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Backup Strategy

### Database Backups

#### Aurora PostgreSQL

| Backup Type       | Frequency                 | Retention | Cross-Region |
| ----------------- | ------------------------- | --------- | ------------ |
| Continuous (PITR) | Every 5 minutes           | 35 days   | No           |
| Automated Daily   | Daily at 03:00 UTC        | 35 days   | Yes          |
| Weekly Snapshot   | Sundays at 04:00 UTC      | 7 years   | Yes          |
| Monthly Snapshot  | 1st of month at 05:00 UTC | 7 years   | Yes          |
| Pre-deployment    | Before each deployment    | 7 days    | Yes          |

#### S3 Backup Exports

| Data             | Frequency      | Retention     | Storage Class |
| ---------------- | -------------- | ------------- | ------------- |
| Database exports | Daily          | 90 days (hot) | STANDARD      |
| Archived exports | After 30 days  | 7 years       | GLACIER       |
| Deep archive     | After 365 days | 7 years       | DEEP_ARCHIVE  |

### Kubernetes Backups (Velero)

| Resource           | Frequency | Retention |
| ------------------ | --------- | --------- |
| Cluster state      | Hourly    | 7 days    |
| Namespaces         | Daily     | 30 days   |
| PersistentVolumes  | Daily     | 30 days   |
| ConfigMaps/Secrets | Hourly    | 7 days    |

### Manual Backup Commands

```bash
# Create manual database backup
./scripts/backup/backup-database.sh -e prod -t full -r "manual backup"

# Create pre-deployment backup
./scripts/backup/backup-database.sh -e prod -t pre-deploy -r "v2.0 deployment"

# List available backups
./scripts/backup/list-backups.sh -e prod -v

# Verify backup integrity
./scripts/backup/verify-backup.sh -e prod -r -d -c
```

---

## Recovery Procedures

### Scenario 1: Single Service Failure

**Symptoms:**

- One microservice is unavailable
- Health check failures for specific service
- Partial functionality degradation

**Automated Recovery:**

1. Kubernetes detects pod failure via liveness probe
2. Pod is automatically restarted
3. Service mesh routes traffic to healthy pods
4. HPA scales up if needed

**Manual Recovery (if automated fails):**

```bash
# 1. Check service status
kubectl get pods -n autolytiq -l app=<service-name>

# 2. Check recent events
kubectl describe pod <pod-name> -n autolytiq

# 3. Check logs
kubectl logs <pod-name> -n autolytiq --previous

# 4. Force restart deployment
kubectl rollout restart deployment/<service-name> -n autolytiq

# 5. If still failing, rollback to previous version
kubectl rollout undo deployment/<service-name> -n autolytiq

# 6. Verify recovery
kubectl rollout status deployment/<service-name> -n autolytiq
```

**Expected Recovery Time:** 5-15 minutes

---

### Scenario 2: Database Failure

**Symptoms:**

- Database connection errors across multiple services
- "Connection refused" or "timeout" errors
- CloudWatch alarms for RDS

#### 2a: Primary Instance Failure (Same Region)

Aurora automatically handles failover to replica within the same region.

**Automated Recovery:**

1. Aurora detects primary failure
2. Automatic failover to reader instance (60-120 seconds)
3. DNS endpoint updates automatically
4. Applications reconnect automatically

**Manual Verification:**

```bash
# 1. Check cluster status
aws rds describe-db-clusters \
  --db-cluster-identifier autolytiq-prod \
  --query 'DBClusters[0].{Status:Status,Endpoint:Endpoint,ReaderEndpoint:ReaderEndpoint}'

# 2. Check instance status
aws rds describe-db-instances \
  --query "DBInstances[?DBClusterIdentifier=='autolytiq-prod'].{ID:DBInstanceIdentifier,Status:DBInstanceStatus,Role:DBInstanceRole}"

# 3. Verify application connectivity
kubectl exec -it deploy/api-gateway -n autolytiq -- nc -zv <db-endpoint> 5432

# 4. Check application logs for reconnection
kubectl logs -l app=api-gateway -n autolytiq --tail=100 | grep -i "database\|connection"
```

**Expected Recovery Time:** 15-30 minutes

#### 2b: Point-in-Time Recovery

Use when data corruption is detected and you need to restore to a specific point.

```bash
# 1. Identify the point in time before corruption
# Check application logs and database logs for the corruption event
aws rds describe-db-cluster-snapshots \
  --db-cluster-identifier autolytiq-prod \
  --query 'sort_by(DBClusterSnapshots, &SnapshotCreateTime)[-5:]'

# 2. Get the restorable time window
aws rds describe-db-clusters \
  --db-cluster-identifier autolytiq-prod \
  --query 'DBClusters[0].{Earliest:EarliestRestorableTime,Latest:LatestRestorableTime}'

# 3. Create restore (use the restore script)
./scripts/backup/restore-database.sh \
  -e prod \
  -p "2024-01-15T10:30:00Z" \
  -n autolytiq-prod-restored

# 4. Wait for restore to complete (monitor in AWS console or CLI)
aws rds wait db-cluster-available \
  --db-cluster-identifier autolytiq-prod-restored

# 5. Verify data integrity on restored cluster
# Connect to restored cluster and run validation queries
psql -h <restored-endpoint> -U autolytiq_admin -d autolytiq -c "
  SELECT 'deals' as table_name, count(*) as row_count FROM deals
  UNION ALL
  SELECT 'customers', count(*) FROM customers
  UNION ALL
  SELECT 'users', count(*) FROM users;
"

# 6. Update application configuration to use new endpoint
# Option A: Update Kubernetes secret
kubectl create secret generic database-credentials \
  --from-literal=host=<restored-endpoint> \
  --from-literal=port=5432 \
  --from-literal=database=autolytiq \
  --from-literal=username=autolytiq_admin \
  --from-literal=password=<password> \
  -n autolytiq \
  --dry-run=client -o yaml | kubectl apply -f -

# Option B: Update through Secrets Manager
aws secretsmanager update-secret \
  --secret-id autolytiq/prod/database \
  --secret-string '{"host":"<restored-endpoint>","port":"5432","database":"autolytiq","username":"autolytiq_admin","password":"<password>"}'

# 7. Restart services to pick up new configuration
kubectl rollout restart deployment -n autolytiq

# 8. Monitor application health
kubectl get pods -n autolytiq -w
```

**Expected Recovery Time:** 30-60 minutes

---

### Scenario 3: Complete Cluster Failure

**Symptoms:**

- Kubernetes API server unreachable
- All pods unavailable
- No response from any service
- EKS control plane issues

**Recovery Procedure:**

```bash
# 1. Verify cluster status
aws eks describe-cluster \
  --name autolytiq-prod \
  --query 'cluster.{Status:status,Endpoint:endpoint}'

# 2. Check node group status
aws eks list-nodegroups --cluster-name autolytiq-prod
aws eks describe-nodegroup \
  --cluster-name autolytiq-prod \
  --nodegroup-name <nodegroup-name>

# 3. If nodes are down, scale up node group
aws eks update-nodegroup-config \
  --cluster-name autolytiq-prod \
  --nodegroup-name <nodegroup-name> \
  --scaling-config minSize=3,maxSize=15,desiredSize=5

# 4. If cluster is completely unavailable, restore from Velero backup
# First, ensure you have a working cluster (either recovered or new)
velero restore create --from-backup <latest-backup-name>

# 5. Monitor restore progress
velero restore describe <restore-name>
velero restore logs <restore-name>

# 6. Verify all workloads are running
kubectl get pods -A
kubectl get deployments -n autolytiq
kubectl get services -n autolytiq

# 7. Run smoke tests
./scripts/smoke-test.sh --environment prod

# 8. Update Route 53 if needed
aws route53 change-resource-record-sets \
  --hosted-zone-id <zone-id> \
  --change-batch file://dns-update.json
```

**Expected Recovery Time:** 30-60 minutes

---

### Scenario 4: Region Failure

**Symptoms:**

- Complete AWS region unavailability
- All services in primary region unreachable
- AWS status page shows regional outage

**Pre-requisites:**

- DR region (us-west-2) infrastructure is provisioned
- Cross-region database replica is up-to-date
- DNS failover is configured

**Recovery Procedure:**

```bash
# ==========================================
# PHASE 1: Activate DR Region Database
# ==========================================

# 1. Verify DR replica status
aws rds describe-db-clusters \
  --region us-west-2 \
  --db-cluster-identifier autolytiq-prod-dr \
  --query 'DBClusters[0].{Status:Status,ReplicationSourceIdentifier:ReplicationSourceIdentifier}'

# 2. Promote DR replica to standalone cluster
aws rds promote-read-replica-db-cluster \
  --region us-west-2 \
  --db-cluster-identifier autolytiq-prod-dr

# 3. Wait for promotion to complete
aws rds wait db-cluster-available \
  --region us-west-2 \
  --db-cluster-identifier autolytiq-prod-dr

# 4. Disable deletion protection on DR cluster for flexibility
aws rds modify-db-cluster \
  --region us-west-2 \
  --db-cluster-identifier autolytiq-prod-dr \
  --no-deletion-protection \
  --apply-immediately

# ==========================================
# PHASE 2: Deploy Application to DR Region
# ==========================================

# 5. Switch kubectl context to DR cluster
aws eks update-kubeconfig \
  --region us-west-2 \
  --name autolytiq-prod-dr

# 6. Apply Kubernetes manifests to DR cluster
# If using GitOps (ArgoCD), update the target cluster
# If manual, apply manifests:
kubectl apply -k infrastructure/k8s/overlays/prod-dr/

# 7. Update secrets with DR database endpoint
DR_ENDPOINT=$(aws rds describe-db-clusters \
  --region us-west-2 \
  --db-cluster-identifier autolytiq-prod-dr \
  --query 'DBClusters[0].Endpoint' \
  --output text)

kubectl create secret generic database-credentials \
  --from-literal=host=${DR_ENDPOINT} \
  --from-literal=port=5432 \
  --from-literal=database=autolytiq \
  --from-literal=username=autolytiq_admin \
  --from-literal=password=<password> \
  -n autolytiq \
  --dry-run=client -o yaml | kubectl apply -f -

# 8. Verify deployments are running
kubectl get pods -n autolytiq -w

# ==========================================
# PHASE 3: Switch Traffic to DR Region
# ==========================================

# 9. Update Route 53 to point to DR region
# Option A: Manual DNS update
aws route53 change-resource-record-sets \
  --hosted-zone-id <zone-id> \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.autolytiq.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "<dr-alb-zone-id>",
          "DNSName": "<dr-alb-dns-name>",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'

# Option B: If using Route 53 health checks, they should auto-failover
# Verify health check status
aws route53 get-health-check-status --health-check-id <health-check-id>

# 10. Verify traffic is flowing to DR region
curl -I https://api.autolytiq.com/health

# 11. Run smoke tests
./scripts/smoke-test.sh --environment prod --region us-west-2

# ==========================================
# PHASE 4: Post-Failover Tasks
# ==========================================

# 12. Enable backup in DR region
aws backup start-backup-job \
  --region us-west-2 \
  --backup-vault-name autolytiq-prod-dr-vault \
  --resource-arn arn:aws:rds:us-west-2:<account>:cluster:autolytiq-prod-dr \
  --iam-role-arn arn:aws:iam::<account>:role/autolytiq-prod-backup-operator

# 13. Send incident communication
# Use the communication template below

# 14. Document the failover
# Record timestamp, actions taken, and any issues encountered
```

**Expected Recovery Time:** 1-4 hours

---

### Scenario 5: Data Corruption / Accidental Deletion

**Symptoms:**

- Missing or incorrect data reported by users
- Application errors related to data integrity
- Audit logs showing unexpected deletions/modifications

**Recovery Procedure:**

```bash
# 1. Immediately assess the scope of corruption
# Identify affected tables and time range
psql -h <db-endpoint> -U autolytiq_admin -d autolytiq -c "
  SELECT table_name,
         (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
  FROM information_schema.tables t
  WHERE table_schema = 'public'
  ORDER BY table_name;
"

# 2. Check audit logs for suspicious activity
# (Assuming you have audit logging enabled)
psql -h <db-endpoint> -U autolytiq_admin -d autolytiq -c "
  SELECT * FROM audit_logs
  WHERE created_at > NOW() - INTERVAL '24 hours'
  ORDER BY created_at DESC
  LIMIT 100;
"

# 3. Determine the point in time before corruption
# Use application logs, database logs, and user reports

# 4. Create a new cluster from point-in-time backup
./scripts/backup/restore-database.sh \
  -e prod \
  -p "2024-01-15T09:00:00Z" \
  -n autolytiq-prod-clean

# 5. Extract clean data from restored cluster
# Option A: Full replacement (if corruption is widespread)
# Follow database failover procedure above

# Option B: Selective data recovery (if corruption is limited)
# Export affected tables from clean cluster
pg_dump -h <clean-endpoint> -U autolytiq_admin -d autolytiq \
  -t affected_table1 -t affected_table2 \
  --data-only > clean_data.sql

# Import into production
psql -h <prod-endpoint> -U autolytiq_admin -d autolytiq < clean_data.sql

# 6. Verify data integrity
./scripts/backup/verify-backup.sh -e prod -d

# 7. Investigate root cause
# Review access logs, application changes, and deployment history
```

**Expected Recovery Time:** 30-120 minutes (depending on scope)

---

## Escalation and Communication

### Escalation Matrix

| Severity                 | Response Time | Initial Contact   | Escalation                        |
| ------------------------ | ------------- | ----------------- | --------------------------------- |
| SEV1 (Complete outage)   | Immediate     | On-call Engineer  | Engineering Lead -> VP Eng -> CEO |
| SEV2 (Major degradation) | 15 minutes    | On-call Engineer  | Engineering Lead                  |
| SEV3 (Minor impact)      | 1 hour        | On-call Engineer  | Team Lead                         |
| SEV4 (No user impact)    | 4 hours       | Assigned Engineer | N/A                               |

### Contact Information

| Role             | Name     | Phone     | Email                | Slack     |
| ---------------- | -------- | --------- | -------------------- | --------- |
| On-call Engineer | Rotating | PagerDuty | oncall@autolytiq.com | @oncall   |
| Engineering Lead | [Name]   | [Phone]   | [email]              | @eng-lead |
| VP Engineering   | [Name]   | [Phone]   | [email]              | @vp-eng   |
| DBA              | [Name]   | [Phone]   | [email]              | @dba      |
| AWS TAM          | [Name]   | [Phone]   | [email]              | N/A       |

### PagerDuty Integration

```bash
# Acknowledge incident
pd incident:ack -i <incident-id>

# Add responders
pd incident:responder:add -i <incident-id> -u <user-email>

# Update incident status
pd incident:update -i <incident-id> --status resolved
```

### Communication Templates

#### Initial Incident Notification

```
Subject: [INCIDENT] Autolytiq Service Disruption - [Date/Time]

Team,

We are currently experiencing a service disruption affecting [affected services].

Impact: [Description of user impact]
Start Time: [UTC timestamp]
Status: Investigating / Identified / Mitigating / Resolved

Current Actions:
- [Action 1]
- [Action 2]

Next Update: [Time] or when significant progress is made.

Incident Commander: [Name]
```

#### Status Update Template

```
Subject: [UPDATE] Autolytiq Service Disruption - [Date/Time]

Team,

Update on the ongoing incident:

Status: [Investigating / Identified / Mitigating / Monitoring / Resolved]
Duration: [X hours Y minutes]

Progress:
- [What was done since last update]

Current Situation:
- [Current state]

Next Steps:
- [Planned actions]

Next Update: [Time]
```

#### Resolution Notification

```
Subject: [RESOLVED] Autolytiq Service Disruption - [Date/Time]

Team,

The service disruption has been resolved.

Duration: [Total duration]
Root Cause: [Brief description]
Resolution: [What fixed the issue]

Impact Summary:
- Affected Users: [Number/Percentage]
- Data Loss: [Yes/No - details if yes]

Post-Incident:
- Post-mortem scheduled for [Date/Time]
- Action items will be tracked in [Jira/Linear/etc.]

Thank you for your patience.
```

---

## Testing and Validation

### Backup Verification Schedule

| Test                     | Frequency         | Owner                    | Duration |
| ------------------------ | ----------------- | ------------------------ | -------- |
| Snapshot integrity check | Daily (automated) | Automation               | 5 min    |
| Restore to staging       | Weekly            | Platform Team            | 2 hours  |
| Full DR drill            | Quarterly         | Engineering              | 4 hours  |
| Cross-region failover    | Semi-annually     | Engineering + Leadership | 8 hours  |

### Automated Verification

```bash
# Run automated backup verification (daily cron)
0 6 * * * /opt/autolytiq/scripts/backup/verify-backup.sh -e prod -a

# Run restore test to staging (weekly cron - Sundays)
0 4 * * 0 /opt/autolytiq/scripts/backup/verify-backup.sh -e prod -r -d -c

# Verify cross-region replication (daily cron)
0 7 * * * /opt/autolytiq/scripts/backup/verify-backup.sh -e prod -s $(./list-backups.sh -e prod -f json | jq -r '.[0].SnapshotID')
```

### DR Drill Checklist

#### Pre-Drill

- [ ] Schedule maintenance window
- [ ] Notify stakeholders
- [ ] Verify DR infrastructure is provisioned
- [ ] Review runbooks are up-to-date
- [ ] Ensure all participants have access

#### During Drill

- [ ] Start timer
- [ ] Simulate failure scenario
- [ ] Execute recovery procedures
- [ ] Document any deviations from runbook
- [ ] Verify all services restored
- [ ] Run smoke tests
- [ ] Record actual recovery times

#### Post-Drill

- [ ] Stop timer
- [ ] Restore to normal operations
- [ ] Conduct brief retrospective
- [ ] Update runbooks if needed
- [ ] File drill report
- [ ] Create action items for improvements

### Success Criteria

| Metric                            | Target   | Acceptable |
| --------------------------------- | -------- | ---------- |
| Database restore success          | 100%     | 100%       |
| Data integrity post-restore       | 100%     | 99.99%     |
| Service availability post-restore | 100%     | 99%        |
| Recovery time (database)          | < 30 min | < 1 hour   |
| Recovery time (full DR)           | < 1 hour | < 4 hours  |

---

## Appendix

### A. AWS CLI Quick Reference

```bash
# RDS Commands
aws rds describe-db-clusters --db-cluster-identifier autolytiq-prod
aws rds create-db-cluster-snapshot --db-cluster-identifier autolytiq-prod --db-cluster-snapshot-identifier manual-snapshot
aws rds restore-db-cluster-from-snapshot --db-cluster-identifier autolytiq-restored --snapshot-identifier manual-snapshot
aws rds describe-db-cluster-snapshots --db-cluster-identifier autolytiq-prod

# EKS Commands
aws eks describe-cluster --name autolytiq-prod
aws eks list-nodegroups --cluster-name autolytiq-prod
aws eks update-kubeconfig --name autolytiq-prod --region us-east-1

# Secrets Manager
aws secretsmanager get-secret-value --secret-id autolytiq/prod/database

# Route 53
aws route53 list-hosted-zones
aws route53 list-resource-record-sets --hosted-zone-id <zone-id>
```

### B. Kubernetes Quick Reference

```bash
# Check all pods
kubectl get pods -A

# Check pod logs
kubectl logs -f deploy/<deployment-name> -n autolytiq

# Restart deployment
kubectl rollout restart deployment/<name> -n autolytiq

# Rollback deployment
kubectl rollout undo deployment/<name> -n autolytiq

# Scale deployment
kubectl scale deployment/<name> --replicas=5 -n autolytiq

# Check events
kubectl get events -n autolytiq --sort-by='.lastTimestamp'

# Port forward for debugging
kubectl port-forward svc/<service-name> 8080:80 -n autolytiq
```

### C. Velero Quick Reference

```bash
# List backups
velero backup get

# Create backup
velero backup create <backup-name> --include-namespaces autolytiq

# Describe backup
velero backup describe <backup-name>

# Restore from backup
velero restore create --from-backup <backup-name>

# Check restore status
velero restore describe <restore-name>
```

### D. Monitoring URLs

| Service     | URL                              | Purpose             |
| ----------- | -------------------------------- | ------------------- |
| Grafana     | https://grafana.autolytiq.com    | Metrics dashboards  |
| Prometheus  | https://prometheus.autolytiq.com | Metrics & alerts    |
| AWS Console | https://console.aws.amazon.com   | Infrastructure      |
| PagerDuty   | https://autolytiq.pagerduty.com  | Incident management |
| StatusPage  | https://status.autolytiq.com     | Public status       |

### E. Related Documentation

- [Infrastructure Architecture](./ARCHITECTURE.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Security Policies](./SECURITY.md)
- [Runbook Index](./RUNBOOKS.md)
- [Post-Mortem Template](./POST_MORTEM_TEMPLATE.md)

---

## Document History

| Version | Date       | Author        | Changes         |
| ------- | ---------- | ------------- | --------------- |
| 1.0     | 2024-01-15 | Platform Team | Initial version |

---

**IMPORTANT**: This document should be reviewed and updated quarterly, or whenever significant infrastructure changes occur. All team members should be familiar with these procedures and participate in regular DR drills.
