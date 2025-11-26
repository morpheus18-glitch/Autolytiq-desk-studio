# Security Runbook

## Overview

This document provides procedures for managing security operations for the Autolytiq Desk Studio platform, including secret rotation, security incident response, access management, audit logging, and vulnerability management.

---

## Table of Contents

1. [Secret Rotation Procedures](#secret-rotation-procedures)
2. [Security Incident Response](#security-incident-response)
3. [Access Management](#access-management)
4. [Audit Log Review](#audit-log-review)
5. [Vulnerability Patching](#vulnerability-patching)
6. [Security Monitoring](#security-monitoring)
7. [Compliance Procedures](#compliance-procedures)

---

## Secret Rotation Procedures

### Secret Inventory

| Secret               | Location            | Rotation Frequency | Last Rotated          |
| -------------------- | ------------------- | ------------------ | --------------------- |
| JWT_SECRET           | AWS Secrets Manager | Quarterly          | Check Secrets Manager |
| DATABASE_URL         | AWS Secrets Manager | Quarterly          | Check Secrets Manager |
| REDIS_PASSWORD       | AWS Secrets Manager | Quarterly          | Check Secrets Manager |
| SMTP_PASSWORD        | AWS Secrets Manager | Annually           | Check Secrets Manager |
| AWS Access Keys      | IAM                 | 90 days            | Check IAM             |
| SSL Certificates     | ACM                 | Auto-renewed       | Check ACM             |
| API Keys (3rd party) | AWS Secrets Manager | Annually           | Check Secrets Manager |

### JWT Secret Rotation

**Impact**: Users will need to re-authenticate after rotation.

**Procedure**:

1. **Generate new secret**

   ```bash
   # Generate new JWT secret
   NEW_SECRET=$(openssl rand -base64 64 | tr -d '\n')
   echo "New secret generated (do not share)"
   ```

2. **Update AWS Secrets Manager**

   ```bash
   # Update secret in AWS Secrets Manager
   aws secretsmanager update-secret \
     --secret-id autolytiq/prod/jwt-secret \
     --secret-string "$NEW_SECRET"
   ```

3. **Update Kubernetes secret**

   ```bash
   # Delete and recreate Kubernetes secret
   kubectl delete secret autolytiq-secrets -n autolytiq-prod

   # Apply updated secrets from Secrets Manager
   kubectl create secret generic autolytiq-secrets \
     --from-literal=JWT_SECRET="$NEW_SECRET" \
     --from-literal=DATABASE_URL="$(aws secretsmanager get-secret-value --secret-id autolytiq/prod/database --query SecretString --output text | jq -r .url)" \
     -n autolytiq-prod
   ```

4. **Restart services**

   ```bash
   # Rolling restart all services
   for svc in api-gateway auth-service deal-service customer-service; do
     kubectl rollout restart deployment/$svc -n autolytiq-prod
   done
   ```

5. **Verify rotation**
   ```bash
   # Test authentication
   curl -X POST https://api.autolytiq.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"testpass"}'
   ```

### Database Password Rotation

**Impact**: Brief connection errors during rotation (< 30 seconds with proper handling).

**Procedure**:

1. **Generate new password**

   ```bash
   NEW_DB_PASS=$(openssl rand -base64 32 | tr -d '\n/+=')
   ```

2. **Update Aurora password**

   ```bash
   aws rds modify-db-cluster \
     --db-cluster-identifier autolytiq-prod \
     --master-user-password "$NEW_DB_PASS" \
     --apply-immediately
   ```

3. **Update Secrets Manager**

   ```bash
   # Get current secret
   CURRENT_SECRET=$(aws secretsmanager get-secret-value \
     --secret-id autolytiq/prod/database \
     --query SecretString --output text)

   # Update password in JSON
   UPDATED_SECRET=$(echo "$CURRENT_SECRET" | jq --arg pass "$NEW_DB_PASS" '.password = $pass')

   # Store updated secret
   aws secretsmanager update-secret \
     --secret-id autolytiq/prod/database \
     --secret-string "$UPDATED_SECRET"
   ```

4. **Update Kubernetes secret and restart services**

   ```bash
   # Update connection string
   NEW_URL="postgresql://autolytiq_admin:${NEW_DB_PASS}@<endpoint>:5432/autolytiq"

   kubectl create secret generic autolytiq-secrets \
     --from-literal=DATABASE_URL="$NEW_URL" \
     --dry-run=client -o yaml | kubectl apply -f -

   # Restart services
   kubectl rollout restart deployment -n autolytiq-prod
   ```

### API Key Rotation (Third-Party Services)

**Procedure**:

1. **Generate new key in provider dashboard**
   - Log into provider (SendGrid, Stripe, etc.)
   - Generate new API key
   - Note the new key securely

2. **Update Secrets Manager**

   ```bash
   aws secretsmanager update-secret \
     --secret-id autolytiq/prod/sendgrid-api-key \
     --secret-string "<new-api-key>"
   ```

3. **Update Kubernetes and restart affected service**

   ```bash
   kubectl set env deployment/email-service \
     SENDGRID_API_KEY="$(aws secretsmanager get-secret-value --secret-id autolytiq/prod/sendgrid-api-key --query SecretString --output text)" \
     -n autolytiq-prod
   ```

4. **Verify functionality**

   ```bash
   # Send test email
   curl -X POST https://api.autolytiq.com/api/email/test \
     -H "Authorization: Bearer $ADMIN_TOKEN"
   ```

5. **Revoke old key in provider dashboard**

---

## Security Incident Response

### Incident Classification

| Severity | Description                       | Response Time | Examples                                  |
| -------- | --------------------------------- | ------------- | ----------------------------------------- |
| SEV-1    | Active breach, data exfiltration  | Immediate     | Unauthorized data access, credential leak |
| SEV-2    | Vulnerability actively exploited  | < 1 hour      | SQL injection being exploited             |
| SEV-3    | Security vulnerability discovered | < 24 hours    | Critical CVE in dependency                |
| SEV-4    | Security improvement needed       | < 1 week      | Audit finding, policy violation           |

### Incident Response Process

#### Phase 1: Detection & Containment (0-30 minutes)

1. **Acknowledge and assess**
   - Verify the incident is real
   - Classify severity
   - Notify security team

2. **Immediate containment**

   ```bash
   # If credential compromise - disable affected accounts
   kubectl exec -it deployment/auth-service -- \
     node -e "require('./admin').disableUser('<user-id>')"

   # If service compromise - isolate service
   kubectl scale deployment/<service> --replicas=0 -n autolytiq-prod

   # If network attack - enable enhanced security groups
   aws ec2 modify-security-group-rules --group-id <sg-id> \
     --security-group-rules "..."
   ```

3. **Preserve evidence**

   ```bash
   # Capture logs
   kubectl logs deployment/<service> -n autolytiq-prod --all-containers > incident_logs_$(date +%s).log

   # Snapshot affected resources
   aws rds create-db-cluster-snapshot \
     --db-cluster-identifier autolytiq-prod \
     --db-cluster-snapshot-identifier "incident-$(date +%Y%m%d%H%M%S)"
   ```

#### Phase 2: Investigation (30 min - 4 hours)

1. **Gather information**

   ```bash
   # Review CloudTrail logs
   aws cloudtrail lookup-events \
     --lookup-attributes AttributeKey=Username,AttributeValue=<suspect-user> \
     --start-time $(date -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ)

   # Review application logs
   kubectl logs -l app=api-gateway -n autolytiq-prod --since=24h | \
     grep -E "(unauthorized|forbidden|invalid.*token)"

   # Check for anomalous database queries
   kubectl exec -it <postgres-pod> -- psql -U autolytiq_admin -d autolytiq \
     -c "SELECT * FROM audit_logs WHERE created_at > now() - interval '24 hours' ORDER BY created_at DESC;"
   ```

2. **Identify scope**
   - What data was accessed?
   - What systems were affected?
   - What users were impacted?
   - What was the attack vector?

3. **Document findings**
   - Timeline of events
   - Evidence collected
   - Impact assessment

#### Phase 3: Eradication & Recovery (4-24 hours)

1. **Remove threat**

   ```bash
   # Rotate compromised credentials
   # (follow secret rotation procedures above)

   # Block malicious IPs
   aws wafv2 update-ip-set \
     --name autolytiq-blocked-ips \
     --scope REGIONAL \
     --id <ip-set-id> \
     --addresses "<malicious-ip>/32" \
     --lock-token <token>

   # Revoke compromised sessions
   kubectl exec -it deployment/auth-service -- \
     node -e "require('./admin').revokeAllSessions('<user-id>')"
   ```

2. **Restore services**

   ```bash
   # Restore from clean state if needed
   kubectl rollout undo deployment/<service> -n autolytiq-prod

   # Scale services back up
   kubectl scale deployment/<service> --replicas=3 -n autolytiq-prod
   ```

3. **Verify security**

   ```bash
   # Run security scan
   npm audit

   # Verify no unauthorized changes
   git log --oneline -20
   kubectl get deployments -n autolytiq-prod -o yaml | diff - known-good-state.yaml
   ```

#### Phase 4: Post-Incident (24-72 hours)

1. **Post-incident review**
   - What happened?
   - How was it detected?
   - What was the response?
   - What could be improved?

2. **Remediation**
   - Implement fixes to prevent recurrence
   - Update security controls
   - Update runbooks

3. **Communication**
   - Internal stakeholders
   - Affected users (if required)
   - Regulatory bodies (if required)

### Security Incident Contacts

| Role          | Contact             | When to Contact          |
| ------------- | ------------------- | ------------------------ |
| Security Lead | @security-lead      | All incidents            |
| CISO          | @ciso               | SEV-1, SEV-2             |
| Legal         | legal@autolytiq.com | Data breach, regulatory  |
| PR/Comms      | comms@autolytiq.com | Public disclosure needed |
| AWS Support   | AWS Console         | Infrastructure issues    |

---

## Access Management

### Access Levels

| Level     | Description                      | Granted By          | Review Frequency |
| --------- | -------------------------------- | ------------------- | ---------------- |
| Admin     | Full system access               | CTO/CISO            | Quarterly        |
| Developer | Deploy to dev/staging, read prod | Engineering Manager | Quarterly        |
| Operator  | View prod, restart services      | Engineering Manager | Quarterly        |
| Read-Only | View dashboards, logs            | Team Lead           | Annually         |

### Granting Access

#### AWS IAM

```bash
# Create new user
aws iam create-user --user-name <username>

# Add to appropriate group
aws iam add-user-to-group \
  --user-name <username> \
  --group-name autolytiq-developers

# Enable MFA (required)
aws iam create-virtual-mfa-device \
  --virtual-mfa-device-name <username>-mfa \
  --outfile /tmp/QRCode.png \
  --bootstrap-method QRCodePNG
```

#### Kubernetes RBAC

```yaml
# Create role binding for developer
kubectl apply -f - <<EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: <username>-developer
  namespace: autolytiq-staging
subjects:
  - kind: User
    name: <username>
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: autolytiq-developer
  apiGroup: rbac.authorization.k8s.io
EOF
```

#### Database Access

```sql
-- Create read-only user
CREATE USER <username> WITH PASSWORD '<password>';
GRANT CONNECT ON DATABASE autolytiq TO <username>;
GRANT USAGE ON SCHEMA public TO <username>;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO <username>;

-- For admin access (rare)
GRANT autolytiq_admin TO <username>;
```

### Revoking Access

#### Immediate Revocation (Termination/Compromise)

```bash
# Disable AWS user
aws iam update-login-profile --user-name <username> --no-password-reset-required
aws iam delete-login-profile --user-name <username>

# Deactivate access keys
for key in $(aws iam list-access-keys --user-name <username> --query 'AccessKeyMetadata[].AccessKeyId' --output text); do
  aws iam update-access-key --user-name <username> --access-key-id $key --status Inactive
done

# Remove from groups
for group in $(aws iam list-groups-for-user --user-name <username> --query 'Groups[].GroupName' --output text); do
  aws iam remove-user-from-group --user-name <username> --group-name $group
done

# Revoke Kubernetes access
kubectl delete rolebinding -l user=<username> --all-namespaces

# Revoke database access
kubectl exec -it <postgres-pod> -- psql -U autolytiq_admin -d autolytiq \
  -c "REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM <username>;"
kubectl exec -it <postgres-pod> -- psql -U autolytiq_admin -d autolytiq \
  -c "DROP USER IF EXISTS <username>;"
```

### Access Review Process

**Quarterly Review Checklist**:

- [ ] Export current AWS IAM users and roles
- [ ] Export current Kubernetes RBAC bindings
- [ ] Export current database users
- [ ] Compare against approved access list
- [ ] Verify all users have MFA enabled
- [ ] Remove stale/unused accounts
- [ ] Document any exceptions

```bash
# Generate access reports
aws iam generate-credential-report
aws iam get-credential-report --output text --query Content | base64 -d > iam_report.csv

kubectl get rolebindings,clusterrolebindings --all-namespaces -o json > k8s_rbac.json

kubectl exec -it <postgres-pod> -- psql -U autolytiq_admin -d autolytiq \
  -c "\du" > db_users.txt
```

---

## Audit Log Review

### Audit Log Sources

| Source           | What's Logged                 | Retention | Location   |
| ---------------- | ----------------------------- | --------- | ---------- |
| Application Logs | API requests, business events | 90 days   | CloudWatch |
| AWS CloudTrail   | AWS API calls                 | 1 year    | S3         |
| Database Audit   | Queries, schema changes       | 90 days   | CloudWatch |
| Kubernetes Audit | API server calls              | 30 days   | CloudWatch |

### Regular Audit Tasks

#### Daily

```bash
# Check for failed authentication attempts
kubectl logs -l app=auth-service -n autolytiq-prod --since=24h | \
  jq 'select(.event == "LOGIN_FAILED")' | \
  jq -s 'group_by(.ip) | map({ip: .[0].ip, count: length}) | sort_by(-.count)'

# Check for privilege escalation attempts
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=AssumeRole \
  --start-time $(date -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ) \
  --query 'Events[?contains(CloudTrailEvent, `"errorCode"`)].CloudTrailEvent'
```

#### Weekly

```bash
# Review admin actions
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=Username,AttributeValue=admin \
  --start-time $(date -d '7 days ago' +%Y-%m-%dT%H:%M:%SZ)

# Review database schema changes
kubectl exec -it <postgres-pod> -- psql -U autolytiq_admin -d autolytiq \
  -c "SELECT * FROM pg_stat_activity WHERE query LIKE 'ALTER%' OR query LIKE 'DROP%' OR query LIKE 'CREATE%';"

# Check for unusual data exports
kubectl logs -l app=api-gateway -n autolytiq-prod --since=168h | \
  jq 'select(.path | contains("/export"))' | \
  jq -s 'group_by(.userId) | map({userId: .[0].userId, count: length})'
```

#### Monthly

```bash
# Generate access report
aws iam generate-credential-report
aws iam get-credential-report --output text --query Content | base64 -d > monthly_iam_report.csv

# Review sensitive data access patterns
# Query CloudWatch Insights
aws logs start-query \
  --log-group-name /autolytiq/prod/application \
  --start-time $(date -d '30 days ago' +%s) \
  --end-time $(date +%s) \
  --query-string 'fields @timestamp, @message
    | filter @message like /PII|SSN|credit.*card/
    | stats count() by bin(1d)'
```

### Audit Alerts

Configure CloudWatch alarms for:

```bash
# Multiple failed logins from same IP
aws cloudwatch put-metric-alarm \
  --alarm-name "BruteForceAttempt" \
  --metric-name "FailedLoginAttempts" \
  --namespace "Autolytiq/Security" \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions <sns-topic-arn>

# Unusual admin activity
aws cloudwatch put-metric-alarm \
  --alarm-name "UnusualAdminActivity" \
  --metric-name "AdminAPICallCount" \
  --namespace "Autolytiq/Security" \
  --statistic Sum \
  --period 3600 \
  --threshold 50 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions <sns-topic-arn>
```

---

## Vulnerability Patching

### Vulnerability Sources

| Source             | Check Frequency | Tool              |
| ------------------ | --------------- | ----------------- |
| npm dependencies   | Every build     | npm audit         |
| Docker base images | Weekly          | Trivy             |
| Kubernetes         | Monthly         | Trivy, kube-bench |
| AWS services       | Continuous      | AWS Inspector     |
| OWASP Top 10       | Quarterly       | Manual review     |

### Vulnerability Response SLAs

| Severity              | Response Time | Patch Time |
| --------------------- | ------------- | ---------- |
| Critical (CVSS 9.0+)  | 24 hours      | 72 hours   |
| High (CVSS 7.0-8.9)   | 72 hours      | 1 week     |
| Medium (CVSS 4.0-6.9) | 1 week        | 2 weeks    |
| Low (CVSS < 4.0)      | 2 weeks       | 1 month    |

### Scanning Procedures

#### npm Dependencies

```bash
# Run audit
npm audit

# Fix automatically where possible
npm audit fix

# Generate report
npm audit --json > audit_report.json

# For production
npm audit --production
```

#### Docker Images

```bash
# Scan with Trivy
trivy image autolytiq/api-gateway:latest

# Scan all images in use
for img in $(kubectl get pods -n autolytiq-prod -o jsonpath='{.items[*].spec.containers[*].image}' | tr ' ' '\n' | sort -u); do
  echo "Scanning $img"
  trivy image $img
done
```

#### Kubernetes

```bash
# Run kube-bench for CIS benchmarks
kubectl run --rm -it kube-bench --image=aquasec/kube-bench:latest --restart=Never -- node

# Scan cluster with Trivy
trivy k8s --report summary cluster
```

### Patching Procedures

#### Emergency Patch (Critical Vulnerability)

1. **Assess impact**
   - Is vulnerability actively exploited?
   - What services are affected?
   - What's the attack vector?

2. **Apply mitigation** (if patch not immediately available)

   ```bash
   # Example: Block vulnerable endpoint
   kubectl apply -f - <<EOF
   apiVersion: networking.k8s.io/v1
   kind: NetworkPolicy
   metadata:
     name: block-vulnerable-endpoint
   spec:
     podSelector:
       matchLabels:
         app: affected-service
     policyTypes:
       - Ingress
     ingress:
       - from:
           - podSelector:
               matchLabels:
                 app: api-gateway
   EOF
   ```

3. **Apply patch**

   ```bash
   # Update dependency
   npm update <vulnerable-package>

   # Rebuild and deploy
   npm run build
   docker build -t autolytiq/<service>:patched .
   docker push autolytiq/<service>:patched

   kubectl set image deployment/<service> \
     <service>=autolytiq/<service>:patched \
     -n autolytiq-prod
   ```

4. **Verify fix**
   ```bash
   # Re-scan
   npm audit
   trivy image autolytiq/<service>:patched
   ```

#### Routine Patching

```bash
# Weekly: Update base images
docker pull node:20-alpine
docker build --no-cache -t autolytiq/<service>:latest .

# Monthly: Update all dependencies
npm update
npm audit fix

# Test thoroughly before production deployment
npm test
npm run test:integration
```

---

## Security Monitoring

### Security Dashboards

| Dashboard               | Purpose               | Alert Threshold   |
| ----------------------- | --------------------- | ----------------- |
| Failed Logins           | Detect brute force    | > 10/min per IP   |
| API Error Rate          | Detect attacks        | > 5% 4xx/5xx      |
| Unusual Access Patterns | Detect compromise     | Anomaly detection |
| WAF Blocks              | Track blocked attacks | Informational     |

### Key Security Metrics

```promql
# Failed authentication rate
sum(rate(auth_login_failures_total[5m]))

# Rate-limited requests
sum(rate(http_requests_total{status_code="429"}[5m]))

# Requests blocked by WAF
sum(rate(waf_blocked_requests_total[5m]))

# Unusual data access patterns
sum(rate(api_requests_total{path=~"/api/(export|download|bulk).*"}[5m])) by (userId)
```

### Security Alerts

Already configured in Prometheus rules:

- `HighAuthFailureRate`: > 50 failed logins/minute
- `SuspiciousAdminActivity`: Admin actions outside business hours
- `DataExfiltrationRisk`: Large data exports
- `WAFBlockSpike`: Sudden increase in WAF blocks

---

## Compliance Procedures

### SOC 2 Requirements

| Control           | Implementation          | Evidence                           |
| ----------------- | ----------------------- | ---------------------------------- |
| Access Control    | IAM, RBAC, MFA          | Access reviews, IAM reports        |
| Encryption        | TLS, encryption at rest | Certificate inventory, AWS configs |
| Logging           | CloudWatch, CloudTrail  | Log retention policies             |
| Incident Response | This runbook            | Incident reports                   |
| Change Management | GitHub, CI/CD           | PR history, deployment logs        |

### Data Protection

```bash
# Verify encryption at rest
aws rds describe-db-clusters \
  --db-cluster-identifier autolytiq-prod \
  --query 'DBClusters[0].StorageEncrypted'

# Verify TLS certificates
kubectl get certificates -n autolytiq-prod

# Verify secrets encryption
kubectl get secret autolytiq-secrets -n autolytiq-prod -o yaml | grep -c "^data:"
```

### Compliance Audit Preparation

Quarterly checklist:

- [ ] Access review completed
- [ ] Vulnerability scans clean
- [ ] Penetration test scheduled/completed
- [ ] Security training records current
- [ ] Incident reports documented
- [ ] Change management logs available
- [ ] Backup restoration tested

---

## Change Log

| Date       | Version | Author   | Changes         |
| ---------- | ------- | -------- | --------------- |
| 2024-11-26 | 1.0.0   | Ops Team | Initial version |
