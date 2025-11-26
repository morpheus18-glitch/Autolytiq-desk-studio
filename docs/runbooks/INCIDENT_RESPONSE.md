# Incident Response Runbook

## Overview

This document provides procedures for responding to incidents affecting the Autolytiq Desk Studio platform. Follow these procedures to minimize impact and restore service as quickly as possible.

---

## Table of Contents

1. [Incident Severity Levels](#incident-severity-levels)
2. [On-Call Responsibilities](#on-call-responsibilities)
3. [Escalation Procedures](#escalation-procedures)
4. [Communication Templates](#communication-templates)
5. [Incident Response Process](#incident-response-process)
6. [Post-Incident Review](#post-incident-review)
7. [Common Issues and Resolutions](#common-issues-and-resolutions)

---

## Incident Severity Levels

### P1 - Critical

**Definition**: Complete service outage or severe degradation affecting all users.

**Characteristics**:

- All users cannot access the platform
- Data loss or corruption occurring
- Security breach in progress
- Core business functions completely unavailable
- Financial transaction failures

**Response Time**: Immediate (< 5 minutes)

**Resolution Target**: < 1 hour

**Communication**: Every 15 minutes until resolved

**Examples**:

- Database completely unavailable
- Authentication system down
- API Gateway returning 5xx for all requests
- Critical security vulnerability being exploited

---

### P2 - High

**Definition**: Major feature unavailable or significant performance degradation affecting many users.

**Characteristics**:

- Major feature completely unavailable
- Significant performance degradation (> 3x normal latency)
- Error rate > 10%
- Partial data inconsistencies
- One or more services down

**Response Time**: < 15 minutes

**Resolution Target**: < 4 hours

**Communication**: Every 30 minutes until resolved

**Examples**:

- Deal creation failing for all users
- Customer search returning errors
- Tax calculation service unavailable
- Email notifications not sending

---

### P3 - Medium

**Definition**: Minor feature unavailable or moderate performance issues affecting some users.

**Characteristics**:

- Non-critical feature unavailable
- Moderate performance degradation (1.5-3x normal latency)
- Error rate 1-10%
- Issue affects subset of users
- Workaround available

**Response Time**: < 1 hour

**Resolution Target**: < 24 hours

**Communication**: At start, major updates, and resolution

**Examples**:

- Report generation slow
- Specific API endpoint returning errors
- UI component not rendering correctly
- Non-critical background job failing

---

### P4 - Low

**Definition**: Minor issue with minimal user impact.

**Characteristics**:

- Cosmetic issues
- Minor bugs with easy workarounds
- Performance slightly below normal
- Affects very few users
- Non-customer-facing issues

**Response Time**: < 4 hours (business hours)

**Resolution Target**: < 1 week

**Communication**: Internal only

**Examples**:

- Minor UI alignment issues
- Internal admin tool bugs
- Log verbosity issues
- Non-critical alert noise

---

## On-Call Responsibilities

### Primary On-Call

**Responsibilities**:

1. Acknowledge all alerts within 5 minutes
2. Assess incident severity
3. Begin initial investigation
4. Escalate if unable to resolve within 30 minutes
5. Communicate status updates
6. Document actions in incident channel
7. Coordinate with other teams as needed

**Tools Required**:

- PagerDuty mobile app
- VPN access configured
- kubectl access to all environments
- AWS Console access
- Slack on mobile device
- Laptop with required tools

### Secondary On-Call

**Responsibilities**:

1. Available as backup if primary unavailable
2. Assist primary on-call for P1/P2 incidents
3. Take over if primary needs rest during extended incident
4. Handle non-urgent escalations

### On-Call Rotation

- Primary and secondary rotate weekly
- Handoff: Monday 9:00 AM ET
- Handoff meeting to review:
  - Active incidents
  - Known issues
  - Scheduled maintenance
  - Environment health

---

## Escalation Procedures

### Escalation Matrix

| Severity | 0-30 min                    | 30-60 min              | 1-2 hours             | 2+ hours              |
| -------- | --------------------------- | ---------------------- | --------------------- | --------------------- |
| P1       | Primary + Secondary On-Call | + Engineering Manager  | + VP Engineering      | + CTO                 |
| P2       | Primary On-Call             | + Secondary On-Call    | + Engineering Manager | + VP Engineering      |
| P3       | Primary On-Call             | Continue investigation | + Secondary On-Call   | + Engineering Manager |
| P4       | Primary On-Call             | Normal business hours  | Normal process        | Normal process        |

### How to Escalate

#### Via PagerDuty

```
1. Open incident in PagerDuty
2. Click "Escalate"
3. Select escalation level
4. Add notes about current status
```

#### Via Slack

```
1. Go to #incidents channel
2. @mention the escalation target
3. Include:
   - Incident link
   - Current status
   - Why escalating
   - What help is needed
```

### Escalation Contacts

| Role                | Primary Contact | Backup Contact    |
| ------------------- | --------------- | ----------------- |
| Engineering Manager | @eng-manager    | @backup-manager   |
| VP Engineering      | @vp-eng         | PagerDuty         |
| CTO                 | @cto            | PagerDuty         |
| Security Lead       | @security-lead  | @security-backup  |
| Database Admin      | @dba            | @dba-backup       |
| Platform Team       | @platform       | #platform-support |

---

## Communication Templates

### Internal Communication

#### Slack Incident Channel Message (Initial)

```
:rotating_light: INCIDENT DECLARED :rotating_light:

Severity: P1/P2/P3/P4
Summary: [Brief description of the issue]
Impact: [What users/features are affected]
Started: [Time incident began or was detected]

Current Status: Investigating
Incident Commander: @[name]
Technical Lead: @[name]

Next Update: [Time]

Tracking: [Link to incident doc]
```

#### Slack Status Update

```
:construction: INCIDENT UPDATE :construction:

Incident: [Brief description]
Severity: P1/P2/P3/P4
Duration: [X] minutes/hours

Current Status: [Investigating/Identified/Monitoring/Resolved]

What we know:
- [Finding 1]
- [Finding 2]

Actions taken:
- [Action 1]
- [Action 2]

Next steps:
- [Next step 1]
- [Next step 2]

Next Update: [Time]
```

#### Slack Resolution Message

```
:white_check_mark: INCIDENT RESOLVED :white_check_mark:

Incident: [Brief description]
Severity: P1/P2/P3/P4
Duration: [Total time]

Root Cause: [Brief description]

Resolution: [What fixed it]

Impact Summary:
- Users affected: [Number/percentage]
- Error rate during incident: [Percentage]
- Failed transactions: [Number, if applicable]

Follow-up:
- Post-incident review scheduled: [Date/time]
- Tracking ticket: [Link]
```

### External Communication

#### Status Page - Investigating

```
Title: Investigating Issues with [Feature/Service]

We are currently investigating reports of issues with [feature/service].
Some users may experience [symptom].

Our team is actively working to identify and resolve the issue.
We will provide updates as we learn more.

Posted: [Time] ET
```

#### Status Page - Identified

```
Title: [Feature/Service] Degradation - Cause Identified

We have identified the cause of the current issues affecting [feature/service].
Our team is implementing a fix.

Impact: [Brief description of user impact]

We expect to resolve this within [estimated time].

Updated: [Time] ET
```

#### Status Page - Monitoring

```
Title: [Feature/Service] - Fix Deployed, Monitoring

We have deployed a fix for the issues affecting [feature/service].
We are monitoring the systems to ensure stability.

Users should now be able to [action] normally.
If you continue to experience issues, please contact support.

Updated: [Time] ET
```

#### Status Page - Resolved

```
Title: [Feature/Service] Issues Resolved

The issues affecting [feature/service] have been fully resolved.
All systems are operating normally.

Summary:
- Duration: [Time]
- Root Cause: [Brief, non-technical description]
- Resolution: [What we did]

We apologize for any inconvenience this may have caused.

Resolved: [Time] ET
```

#### Customer Email Template (P1/P2)

```
Subject: [Autolytiq] Service Incident Update - [Date]

Dear [Customer Name],

We want to inform you about a service incident that may have affected
your use of Autolytiq Desk Studio.

What Happened:
[Brief, non-technical description of the incident]

Impact:
[What the customer may have experienced]

Duration:
[Start time] to [End time] ([Duration])

What We Did:
[Brief description of resolution]

Preventing Future Incidents:
[Brief description of improvements being made]

If you have any questions or experienced any issues not mentioned above,
please contact our support team at support@autolytiq.com.

We apologize for any inconvenience this may have caused.

Sincerely,
The Autolytiq Team
```

---

## Incident Response Process

### Phase 1: Detection & Triage (0-15 minutes)

1. **Acknowledge Alert**
   - Acknowledge in PagerDuty within 5 minutes
   - Join #incidents Slack channel

2. **Initial Assessment**

   ```bash
   # Check overall health
   kubectl get pods -n autolytiq-prod

   # Check for errors
   kubectl logs -l app=api-gateway -n autolytiq-prod --tail=100 | grep -i error

   # Check metrics
   # Open Grafana: http://grafana.autolytiq.internal
   ```

3. **Determine Severity**
   - Use severity definitions above
   - When in doubt, escalate to higher severity

4. **Declare Incident**
   - Post initial message in #incidents
   - Create incident in PagerDuty (if not auto-created)
   - Assign Incident Commander role

### Phase 2: Investigation (15-60 minutes)

1. **Gather Information**

   ```bash
   # Recent deployments
   kubectl rollout history deployment/<service> -n autolytiq-prod

   # Pod status and events
   kubectl describe pods -l app=<service> -n autolytiq-prod

   # Logs from affected service
   kubectl logs -l app=<service> -n autolytiq-prod --since=30m | less

   # Check metrics in Prometheus
   kubectl port-forward svc/prometheus 9090:9090 -n monitoring
   ```

2. **Identify Root Cause**
   - Check recent changes (deployments, config changes)
   - Check external dependencies
   - Check for resource exhaustion
   - Check for traffic anomalies

3. **Document Findings**
   - Update incident channel with findings
   - Keep running log of actions taken

### Phase 3: Mitigation (As Soon as Possible)

1. **Apply Quick Fixes**

   ```bash
   # Restart pods
   kubectl rollout restart deployment/<service> -n autolytiq-prod

   # Scale up
   kubectl scale deployment/<service> --replicas=5 -n autolytiq-prod

   # Rollback deployment
   kubectl rollout undo deployment/<service> -n autolytiq-prod
   ```

2. **Implement Workarounds**
   - Enable maintenance mode if needed
   - Redirect traffic if possible
   - Disable problematic feature flags

3. **Update Status**
   - Update internal communications
   - Update status page
   - Notify stakeholders

### Phase 4: Resolution

1. **Confirm Fix**
   - Verify error rates returning to normal
   - Verify functionality restored
   - Monitor for 15-30 minutes

2. **Close Incident**
   - Post resolution message
   - Update status page to resolved
   - Update PagerDuty incident

3. **Schedule Post-Incident Review**
   - Schedule within 3 business days for P1/P2
   - Schedule within 1 week for P3

---

## Post-Incident Review

### Meeting Structure (60 minutes)

**Attendees**: Incident responders, affected team leads, optional stakeholders

**Agenda**:

1. **Timeline Review** (15 min)
   - When did it start?
   - When was it detected?
   - What actions were taken?
   - When was it resolved?

2. **Impact Analysis** (10 min)
   - Users affected
   - Revenue impact (if applicable)
   - SLA impact

3. **Root Cause Analysis** (20 min)
   - What caused the incident?
   - Why wasn't it caught earlier?
   - Contributing factors

4. **Action Items** (15 min)
   - Prevention measures
   - Detection improvements
   - Process improvements
   - Assign owners and due dates

### Post-Incident Document Template

```markdown
# Post-Incident Review: [Incident Name]

## Summary

- Date: [Date]
- Duration: [Duration]
- Severity: [P1/P2/P3/P4]
- Impact: [Brief description]

## Timeline

| Time (ET) | Event   |
| --------- | ------- |
| HH:MM     | [Event] |

## Root Cause

[Detailed explanation]

## Impact

- Users affected: [Number]
- Error rate: [Percentage]
- Revenue impact: [Amount, if applicable]

## What Went Well

- [Item 1]
- [Item 2]

## What Could Be Improved

- [Item 1]
- [Item 2]

## Action Items

| Action   | Owner   | Due Date | Status   |
| -------- | ------- | -------- | -------- |
| [Action] | @[name] | [Date]   | [Status] |

## Lessons Learned

- [Lesson 1]
- [Lesson 2]
```

---

## Common Issues and Resolutions

### API Gateway Issues

#### High Error Rate (5xx)

**Symptoms**:

- Alert: HighErrorRate
- Users seeing "Something went wrong" errors

**Investigation**:

```bash
# Check gateway logs
kubectl logs -l app=api-gateway -n autolytiq-prod --tail=500 | grep -E "(error|5[0-9]{2})"

# Check upstream services
kubectl get pods -n autolytiq-prod | grep -v Running
```

**Common Causes & Fixes**:

| Cause                      | Fix                                  |
| -------------------------- | ------------------------------------ |
| Upstream service down      | Restart/rollback upstream service    |
| Memory exhaustion          | Increase memory limits, restart pods |
| Configuration error        | Rollback to previous config          |
| Database connection issues | See Database Issues section          |

---

### Database Issues

#### Connection Pool Exhausted

**Symptoms**:

- Alert: DatabaseConnectionPoolExhausted
- Logs showing "too many connections"

**Investigation**:

```bash
# Check current connections
kubectl exec -it <postgres-pod> -- psql -U autolytiq_admin -d autolytiq \
  -c "SELECT count(*) FROM pg_stat_activity;"

# Check connections by service
kubectl exec -it <postgres-pod> -- psql -U autolytiq_admin -d autolytiq \
  -c "SELECT application_name, count(*) FROM pg_stat_activity GROUP BY application_name;"
```

**Resolution**:

```bash
# Kill idle connections
kubectl exec -it <postgres-pod> -- psql -U autolytiq_admin -d autolytiq \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND state_change < now() - interval '10 minutes';"

# Scale down and up to reset connections
kubectl scale deployment/<service> --replicas=0 -n autolytiq-prod
kubectl scale deployment/<service> --replicas=3 -n autolytiq-prod
```

#### Slow Queries

**Symptoms**:

- Alert: SlowDatabaseQueries
- High latency on API endpoints

**Investigation**:

```bash
# Check running queries
kubectl exec -it <postgres-pod> -- psql -U autolytiq_admin -d autolytiq \
  -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query
      FROM pg_stat_activity
      WHERE state != 'idle'
      ORDER BY duration DESC
      LIMIT 10;"

# Check pg_stat_statements for slow queries
kubectl exec -it <postgres-pod> -- psql -U autolytiq_admin -d autolytiq \
  -c "SELECT query, calls, mean_time, total_time
      FROM pg_stat_statements
      ORDER BY mean_time DESC
      LIMIT 10;"
```

**Resolution**:

- Kill long-running queries if blocking
- Add missing indexes
- Optimize query in next deployment

---

### Memory Issues

#### Pod OOMKilled

**Symptoms**:

- Pods restarting with OOMKilled status
- Alert: CriticalMemoryUsage

**Investigation**:

```bash
# Check pod memory usage
kubectl top pods -n autolytiq-prod

# Check pod events
kubectl describe pod <pod-name> -n autolytiq-prod | grep -A 10 Events
```

**Resolution**:

```bash
# Increase memory limits (temporary)
kubectl set resources deployment/<service> \
  --limits=memory=1024Mi \
  --requests=memory=512Mi \
  -n autolytiq-prod

# Restart pods
kubectl rollout restart deployment/<service> -n autolytiq-prod
```

**Long-term**: Fix memory leak, optimize memory usage

---

### Certificate Issues

#### SSL Certificate Expired

**Symptoms**:

- Users seeing certificate errors
- HTTPS connections failing

**Investigation**:

```bash
# Check certificate expiry
kubectl get certificate -n autolytiq-prod
openssl s_client -connect api.autolytiq.com:443 -servername api.autolytiq.com 2>/dev/null | openssl x509 -noout -dates
```

**Resolution**:

```bash
# Force certificate renewal (cert-manager)
kubectl delete certificate <cert-name> -n autolytiq-prod
kubectl apply -f infrastructure/k8s/base/ingress.yaml
```

---

### Authentication Issues

#### JWT Validation Failures

**Symptoms**:

- Users getting 401 Unauthorized
- Alert: High number of auth failures

**Investigation**:

```bash
# Check auth service logs
kubectl logs -l app=auth-service -n autolytiq-prod --tail=200 | grep -i "jwt\|token\|auth"

# Check JWT secret sync
kubectl get secret autolytiq-secrets -n autolytiq-prod -o jsonpath='{.data.JWT_SECRET}' | base64 -d
```

**Resolution**:

- If JWT secret rotated: ensure all services have new secret
- If clock skew: check NTP sync on nodes
- If service misconfigured: rollback or fix config

---

### External Service Issues

#### Third-Party API Down

**Symptoms**:

- Specific feature failing
- Errors mentioning external service

**Investigation**:

```bash
# Check external service status page
# Check logs for external API errors
kubectl logs -l app=<service> -n autolytiq-prod | grep -i "timeout\|connection refused\|503"
```

**Resolution**:

- Enable fallback/cache if available
- Communicate to users about degraded functionality
- Contact third-party support if needed

---

## Incident Tools Quick Reference

| Tool         | URL/Command                                                     | Purpose          |
| ------------ | --------------------------------------------------------------- | ---------------- |
| PagerDuty    | https://autolytiq.pagerduty.com                                 | Alert management |
| Grafana      | `kubectl port-forward svc/grafana 3000:3000 -n monitoring`      | Dashboards       |
| Prometheus   | `kubectl port-forward svc/prometheus 9090:9090 -n monitoring`   | Metrics          |
| AlertManager | `kubectl port-forward svc/alertmanager 9093:9093 -n monitoring` | Alert management |
| Logs         | `kubectl logs -l app=<service> -n autolytiq-prod`               | Service logs     |
| Status Page  | https://status.autolytiq.com                                    | Public status    |
| AWS Console  | https://console.aws.amazon.com                                  | Infrastructure   |

---

## Change Log

| Date       | Version | Author   | Changes         |
| ---------- | ------- | -------- | --------------- |
| 2024-11-26 | 1.0.0   | Ops Team | Initial version |
