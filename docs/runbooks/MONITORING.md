# Monitoring Runbook

## Overview

This document provides comprehensive guidance for monitoring the Autolytiq Desk Studio platform, including dashboard navigation, key metrics interpretation, alert response procedures, and debugging techniques.

---

## Table of Contents

1. [Dashboard Overview and Access](#dashboard-overview-and-access)
2. [Key Metrics to Watch](#key-metrics-to-watch)
3. [Alert Response Procedures](#alert-response-procedures)
4. [Log Analysis Guide](#log-analysis-guide)
5. [Debugging Distributed Traces](#debugging-distributed-traces)
6. [Custom Queries and Investigations](#custom-queries-and-investigations)

---

## Dashboard Overview and Access

### Accessing Monitoring Tools

#### Grafana

```bash
# Port-forward to Grafana
kubectl port-forward svc/grafana 3000:3000 -n monitoring

# Access at: http://localhost:3000
# Default credentials: admin / (get from secret)
kubectl get secret grafana-admin -n monitoring -o jsonpath='{.data.admin-password}' | base64 -d
```

**Production URL**: https://grafana.autolytiq.internal

#### Prometheus

```bash
# Port-forward to Prometheus
kubectl port-forward svc/prometheus 9090:9090 -n monitoring

# Access at: http://localhost:9090
```

**Production URL**: https://prometheus.autolytiq.internal

#### AlertManager

```bash
# Port-forward to AlertManager
kubectl port-forward svc/alertmanager 9093:9093 -n monitoring

# Access at: http://localhost:9093
```

**Production URL**: https://alertmanager.autolytiq.internal

### Dashboard Inventory

| Dashboard            | Purpose                                 | Key Users         |
| -------------------- | --------------------------------------- | ----------------- |
| Service Overview     | High-level health of all services       | On-call, Managers |
| API Gateway          | Gateway metrics, routing, rate limiting | On-call, Backend  |
| Database Performance | Query performance, connections          | On-call, DBA      |
| Business Metrics     | Deals created, user activity            | Product, Business |
| Infrastructure       | Node health, resource utilization       | Platform, On-call |
| Alerts History       | Alert timeline and statistics           | On-call           |

### Service Overview Dashboard

**Location**: Grafana > Dashboards > Autolytiq > Service Overview

**Panels**:

1. **Service Health Matrix**
   - Shows UP/DOWN status for each service
   - Color coding: Green (healthy), Yellow (degraded), Red (down)

2. **Request Rate**
   - Total requests per second across all services
   - Breakdown by service

3. **Error Rate**
   - 5xx error percentage
   - 4xx error percentage
   - Threshold lines at 1% (warning) and 5% (critical)

4. **Response Time**
   - P50, P95, P99 latency
   - Per-service breakdown

5. **Resource Utilization**
   - CPU usage by service
   - Memory usage by service
   - Color-coded thresholds

### API Gateway Dashboard

**Location**: Grafana > Dashboards > Autolytiq > API Gateway

**Key Panels**:

1. **Request Volume**

   ```promql
   sum(rate(http_requests_total{service="api-gateway"}[5m]))
   ```

2. **Error Rate by Endpoint**

   ```promql
   sum(rate(http_requests_total{service="api-gateway",status_code=~"5.."}[5m])) by (endpoint)
   /
   sum(rate(http_requests_total{service="api-gateway"}[5m])) by (endpoint)
   ```

3. **Latency Heatmap**
   - Shows distribution of response times
   - Helps identify latency spikes

4. **Upstream Service Health**
   - Shows status of backend services called by gateway
   - Connection pool utilization

5. **Rate Limiting**
   - Requests rejected due to rate limits
   - Rate limit utilization per tenant

### Database Performance Dashboard

**Location**: Grafana > Dashboards > Autolytiq > Database Performance

**Key Panels**:

1. **Active Connections**

   ```promql
   sum(pg_stat_activity_count{datname="autolytiq"}) by (state)
   ```

2. **Query Performance**
   - Average query time
   - Slow query count (> 100ms)
   - Queries per second

3. **Connection Pool**
   - Connections in use
   - Connections available
   - Connection wait time

4. **Database Size**
   - Total size
   - Size by table
   - Growth rate

5. **Replication Lag** (if using read replicas)
   - Lag in seconds/bytes
   - Replica health

---

## Key Metrics to Watch

### Golden Signals

#### 1. Latency

| Metric | PromQL                                                                                  | Healthy | Warning    | Critical |
| ------ | --------------------------------------------------------------------------------------- | ------- | ---------- | -------- |
| P50    | `histogram_quantile(0.50, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))` | < 100ms | 100-200ms  | > 200ms  |
| P95    | `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))` | < 300ms | 300-500ms  | > 500ms  |
| P99    | `histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))` | < 500ms | 500-1000ms | > 1000ms |

#### 2. Traffic

| Metric                   | PromQL                                             | Notes               |
| ------------------------ | -------------------------------------------------- | ------------------- |
| Request Rate             | `sum(rate(http_requests_total[5m]))`               | Compare to baseline |
| Request Rate by Service  | `sum(rate(http_requests_total[5m])) by (service)`  | Identify hot spots  |
| Request Rate by Endpoint | `sum(rate(http_requests_total[5m])) by (endpoint)` | Find busy endpoints |

#### 3. Errors

| Metric         | PromQL                                                                                        | Healthy | Warning | Critical |
| -------------- | --------------------------------------------------------------------------------------------- | ------- | ------- | -------- |
| Error Rate     | `sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))` | < 0.1%  | 0.1-1%  | > 1%     |
| 5xx by Service | `sum(rate(http_requests_total{status_code=~"5.."}[5m])) by (service)`                         | -       | -       | -        |
| 4xx Rate       | `sum(rate(http_requests_total{status_code=~"4.."}[5m])) / sum(rate(http_requests_total[5m]))` | < 5%    | 5-10%   | > 10%    |

#### 4. Saturation

| Metric         | PromQL                                                                                       | Healthy | Warning | Critical |
| -------------- | -------------------------------------------------------------------------------------------- | ------- | ------- | -------- |
| CPU Usage      | `avg(rate(container_cpu_usage_seconds_total[5m])) by (pod) * 100`                            | < 60%   | 60-80%  | > 80%    |
| Memory Usage   | `avg(container_memory_working_set_bytes / container_spec_memory_limit_bytes) by (pod) * 100` | < 70%   | 70-85%  | > 85%    |
| DB Connections | `db_pool_connections_in_use / db_pool_connections_max * 100`                                 | < 70%   | 70-90%  | > 90%    |

### Service-Specific Metrics

#### API Gateway

| Metric                         | Description                       | Alert Threshold     |
| ------------------------------ | --------------------------------- | ------------------- |
| `gateway_requests_total`       | Total requests handled            | N/A (informational) |
| `gateway_rate_limit_hits`      | Requests rejected by rate limiter | > 100/min           |
| `gateway_circuit_breaker_open` | Circuit breaker status            | Any open            |
| `gateway_auth_failures`        | Authentication failures           | > 50/min            |

#### Auth Service

| Metric                           | Description            | Alert Threshold         |
| -------------------------------- | ---------------------- | ----------------------- |
| `auth_login_attempts_total`      | Login attempts         | N/A                     |
| `auth_login_failures_total`      | Failed logins          | > 100/min (brute force) |
| `auth_token_validations_total`   | JWT validations        | N/A                     |
| `auth_token_validation_failures` | Failed JWT validations | > 50/min                |

#### Deal Service

| Metric                      | Description              | Alert Threshold       |
| --------------------------- | ------------------------ | --------------------- |
| `deals_created_total`       | Deals created            | N/A (business metric) |
| `deal_calculations_total`   | Tax/pricing calculations | N/A                   |
| `deal_calculation_errors`   | Calculation failures     | > 10/min              |
| `deal_calculation_duration` | Calculation time         | P95 > 500ms           |

#### Database

| Metric                           | Description        | Alert Threshold |
| -------------------------------- | ------------------ | --------------- |
| `pg_stat_activity_count`         | Active connections | > 80% of max    |
| `pg_stat_user_tables_n_dead_tup` | Dead tuples        | > 100,000       |
| `pg_locks_count`                 | Active locks       | > 50            |
| `pg_replication_lag`             | Replication lag    | > 10 seconds    |

---

## Alert Response Procedures

### Alert Severity and Response

| Severity | Response Time       | Escalation              | Notification     |
| -------- | ------------------- | ----------------------- | ---------------- |
| Critical | Immediate (< 5 min) | Automatic to secondary  | PagerDuty, Slack |
| Warning  | < 30 min            | After 1 hour unresolved | Slack only       |
| Info     | Next business day   | None                    | Email digest     |

### Alert Response Workflow

```
Alert Fires
    |
    v
Acknowledge in PagerDuty (5 min)
    |
    v
Initial Assessment (10 min)
    |
    +-- Not a real issue --> Silence/Tune Alert
    |
    +-- Real issue --> Investigate
                          |
                          v
                    Identify Root Cause
                          |
                          +-- Known issue --> Follow Runbook
                          |
                          +-- Unknown issue --> Debug & Document
                          |
                          v
                    Apply Fix
                          |
                          v
                    Verify Resolution
                          |
                          v
                    Close Alert
                          |
                          v
                    Document in Incident Log
```

### Specific Alert Responses

#### HighErrorRate

**Alert Definition**:

```promql
(sum(rate(http_requests_total{status_code=~"5.."}[5m])) by (service)
/
sum(rate(http_requests_total[5m])) by (service)) * 100 > 5
```

**Response Steps**:

1. **Identify affected service**

   ```bash
   kubectl get pods -n autolytiq-prod -l app=<service>
   ```

2. **Check recent logs**

   ```bash
   kubectl logs -l app=<service> -n autolytiq-prod --tail=200 | grep -i error
   ```

3. **Check recent deployments**

   ```bash
   kubectl rollout history deployment/<service> -n autolytiq-prod
   ```

4. **Check dependencies**
   - Is database accessible?
   - Are upstream services healthy?
   - Are external APIs responding?

5. **Common fixes**:
   - Rollback recent deployment
   - Restart pods
   - Scale up if overloaded

---

#### HighLatency

**Alert Definition**:

```promql
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (service, le)) > 0.5
```

**Response Steps**:

1. **Check endpoint breakdown**
   - Which endpoints are slow?
   - Is it all traffic or specific requests?

2. **Check database queries**

   ```bash
   kubectl exec -it <postgres-pod> -- psql -U autolytiq_admin -d autolytiq \
     -c "SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
   ```

3. **Check resource utilization**

   ```bash
   kubectl top pods -n autolytiq-prod
   ```

4. **Common fixes**:
   - Scale up pods
   - Increase DB capacity
   - Add indexes for slow queries
   - Enable caching

---

#### DatabaseConnectionPoolExhausted

**Alert Definition**:

```promql
db_pool_connections_in_use / db_pool_connections_max > 0.9
```

**Response Steps**:

1. **Check connection count**

   ```bash
   kubectl exec -it <postgres-pod> -- psql -U autolytiq_admin -d autolytiq \
     -c "SELECT count(*) FROM pg_stat_activity;"
   ```

2. **Identify connection holders**

   ```bash
   kubectl exec -it <postgres-pod> -- psql -U autolytiq_admin -d autolytiq \
     -c "SELECT application_name, state, count(*)
         FROM pg_stat_activity
         GROUP BY application_name, state
         ORDER BY count DESC;"
   ```

3. **Kill idle connections if needed**

   ```bash
   kubectl exec -it <postgres-pod> -- psql -U autolytiq_admin -d autolytiq \
     -c "SELECT pg_terminate_backend(pid)
         FROM pg_stat_activity
         WHERE state = 'idle'
         AND state_change < now() - interval '10 minutes';"
   ```

4. **Increase pool size** (if appropriate)
   ```bash
   kubectl set env deployment/<service> DB_POOL_MAX=30 -n autolytiq-prod
   ```

---

#### PodRestartingFrequently

**Alert Definition**:

```promql
increase(kube_pod_container_status_restarts_total{namespace="autolytiq"}[1h]) > 3
```

**Response Steps**:

1. **Check pod status**

   ```bash
   kubectl describe pod <pod-name> -n autolytiq-prod
   ```

2. **Check logs from crashed container**

   ```bash
   kubectl logs <pod-name> -n autolytiq-prod --previous
   ```

3. **Common causes**:
   - OOMKilled: Increase memory limits
   - Liveness probe failure: Check health endpoint
   - Application crash: Check for bugs, rollback

---

## Log Analysis Guide

### Accessing Logs

#### Kubernetes Logs

```bash
# Single pod
kubectl logs <pod-name> -n autolytiq-prod

# All pods of a service
kubectl logs -l app=<service> -n autolytiq-prod

# Follow logs
kubectl logs -l app=<service> -n autolytiq-prod -f

# Previous container logs (after restart)
kubectl logs <pod-name> -n autolytiq-prod --previous

# Time-bounded logs
kubectl logs -l app=<service> -n autolytiq-prod --since=30m
```

#### CloudWatch Logs (AWS)

```bash
# Tail logs from CloudWatch
aws logs tail /aws/eks/autolytiq-prod/<service> --follow

# Search logs
aws logs filter-log-events \
  --log-group-name /aws/eks/autolytiq-prod/api-gateway \
  --filter-pattern "ERROR" \
  --start-time $(date -d '1 hour ago' +%s)000
```

### Log Format

All services use structured JSON logging:

```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "level": "error",
  "service": "deal-service",
  "requestId": "req-abc123",
  "traceId": "trace-xyz789",
  "userId": "user-456",
  "tenantId": "tenant-789",
  "message": "Failed to calculate tax",
  "error": {
    "message": "Invalid state code",
    "code": "TAX_CALC_ERROR",
    "stack": "..."
  },
  "context": {
    "dealId": "deal-123",
    "stateCode": "XX"
  }
}
```

### Common Log Searches

#### Find All Errors

```bash
kubectl logs -l app=<service> -n autolytiq-prod --since=1h | \
  jq 'select(.level == "error")'
```

#### Find Errors by Request ID

```bash
kubectl logs -l app=<service> -n autolytiq-prod --since=1h | \
  jq 'select(.requestId == "req-abc123")'
```

#### Find Slow Requests

```bash
kubectl logs -l app=<service> -n autolytiq-prod --since=1h | \
  jq 'select(.durationMs > 1000)'
```

#### Find Requests by User

```bash
kubectl logs -l app=<service> -n autolytiq-prod --since=1h | \
  jq 'select(.userId == "user-456")'
```

#### Aggregate Error Counts

```bash
kubectl logs -l app=<service> -n autolytiq-prod --since=1h | \
  jq -r 'select(.level == "error") | .error.code' | \
  sort | uniq -c | sort -rn
```

### Log Levels

| Level   | Usage                               | Alert   |
| ------- | ----------------------------------- | ------- |
| `error` | Unexpected errors, failures         | Yes     |
| `warn`  | Recoverable issues, degraded state  | Monitor |
| `info`  | Normal operations, business events  | No      |
| `debug` | Detailed troubleshooting (dev only) | No      |

---

## Debugging Distributed Traces

### Trace Structure

```
Request → API Gateway → Deal Service → Database
             |
             +→ Tax Engine (WASM)
             +→ Customer Service → Database
```

Each span contains:

- `traceId`: Unique ID for entire request flow
- `spanId`: Unique ID for this operation
- `parentSpanId`: Parent span ID
- `operationName`: What operation was performed
- `duration`: How long it took
- `tags`: Key-value metadata
- `logs`: Events during the span

### Finding a Trace

1. **Get trace ID from logs**

   ```bash
   kubectl logs -l app=api-gateway -n autolytiq-prod --since=1h | \
     jq 'select(.level == "error") | .traceId' | head -1
   ```

2. **Search in Jaeger/X-Ray**
   - Open tracing UI
   - Enter trace ID in search
   - View full trace

### Trace Analysis

#### Identifying Bottlenecks

Look for:

- Longest spans (> 100ms for DB, > 500ms total)
- Sequential calls that could be parallel
- Repeated calls to same service
- Large gaps between spans

#### Common Patterns

**N+1 Query Problem**:

```
deal-service: 500ms
  ├── db-query: 10ms (SELECT deal)
  ├── db-query: 10ms (SELECT customer for deal 1)
  ├── db-query: 10ms (SELECT customer for deal 2)
  ├── db-query: 10ms (SELECT customer for deal 3)
  ... (repeated N times)
```

**Fix**: Use JOIN or batch query

**Missing Cache**:

```
api-gateway: 300ms
  └── config-service: 200ms (same config fetched repeatedly)
```

**Fix**: Add caching

**Sequential External Calls**:

```
deal-service: 800ms
  ├── tax-service: 300ms
  └── customer-service: 400ms (could be parallel)
```

**Fix**: Make calls concurrent

### Creating Custom Spans

For debugging, add custom spans:

```typescript
// Node.js example
const span = tracer.startSpan('calculateTax');
span.setTag('dealId', dealId);
try {
  const result = await taxEngine.calculate(deal);
  span.setTag('taxAmount', result.amount);
} catch (error) {
  span.setTag('error', true);
  span.log({ event: 'error', message: error.message });
  throw error;
} finally {
  span.finish();
}
```

---

## Custom Queries and Investigations

### Prometheus Query Examples

#### Traffic Analysis

```promql
# Requests per second by service
sum(rate(http_requests_total[5m])) by (service)

# Request breakdown by status code
sum(rate(http_requests_total[5m])) by (status_code)

# Top 10 endpoints by request volume
topk(10, sum(rate(http_requests_total[5m])) by (endpoint))

# Traffic comparison: now vs 1 week ago
sum(rate(http_requests_total[5m])) - sum(rate(http_requests_total[5m] offset 1w))
```

#### Latency Analysis

```promql
# Latency percentiles by endpoint
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (endpoint, le))

# Latency distribution (for heatmap)
sum(rate(http_request_duration_seconds_bucket[5m])) by (le)

# Apdex score (target: 300ms, tolerance: 1.2s)
(
  sum(rate(http_request_duration_seconds_bucket{le="0.3"}[5m]))
  +
  sum(rate(http_request_duration_seconds_bucket{le="1.2"}[5m]))
  / 2
)
/
sum(rate(http_request_duration_seconds_count[5m]))
```

#### Error Analysis

```promql
# Error rate trend
sum(rate(http_requests_total{status_code=~"5.."}[5m]))
/
sum(rate(http_requests_total[5m]))

# Errors by type
sum(increase(errors_total[1h])) by (error_type)

# Error spikes (sudden increase)
rate(http_requests_total{status_code=~"5.."}[5m]) > 2 * avg_over_time(rate(http_requests_total{status_code=~"5.."}[5m])[1h:])
```

#### Resource Investigation

```promql
# Memory usage trend
avg(container_memory_working_set_bytes{namespace="autolytiq"}) by (pod)

# CPU throttling
sum(rate(container_cpu_cfs_throttled_seconds_total[5m])) by (pod)

# Pod restarts
sum(increase(kube_pod_container_status_restarts_total{namespace="autolytiq"}[1h])) by (pod)

# Disk usage (PVs)
kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes
```

### Grafana Explore

Use Grafana Explore for ad-hoc queries:

1. Open Grafana > Explore
2. Select Prometheus data source
3. Enter PromQL query
4. Adjust time range as needed
5. Save useful queries to a dashboard

### Creating Investigation Dashboard

For ongoing investigations, create a temporary dashboard:

1. Grafana > New Dashboard
2. Add panels with relevant queries
3. Set time range to incident window
4. Add annotations for key events
5. Share dashboard link with team

---

## Monitoring Maintenance

### Weekly Tasks

- [ ] Review and acknowledge all alerts
- [ ] Check for alert noise (too many false positives)
- [ ] Review dashboard usage
- [ ] Verify data retention

### Monthly Tasks

- [ ] Review alert thresholds based on baseline changes
- [ ] Update runbooks with new learnings
- [ ] Archive unused dashboards
- [ ] Review storage utilization

### Quarterly Tasks

- [ ] Full monitoring system audit
- [ ] Review and update SLOs
- [ ] Capacity planning for monitoring infrastructure
- [ ] Training refresh for on-call team

---

## Change Log

| Date       | Version | Author   | Changes         |
| ---------- | ------- | -------- | --------------- |
| 2024-11-26 | 1.0.0   | Ops Team | Initial version |
