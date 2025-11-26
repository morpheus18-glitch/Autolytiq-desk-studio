# Performance Testing Guide

This document describes the performance testing strategy, baselines, and procedures for Autolytiq Desk Studio.

## Table of Contents

- [Overview](#overview)
- [Performance Baselines and SLAs](#performance-baselines-and-slas)
- [Test Scenarios](#test-scenarios)
- [Running Load Tests](#running-load-tests)
- [Interpreting Results](#interpreting-results)
- [Capacity Planning](#capacity-planning)
- [Performance Tuning](#performance-tuning)
- [Troubleshooting](#troubleshooting)

## Overview

Autolytiq Desk Studio uses [k6](https://k6.io/) for load testing. The load testing suite covers:

- **API Gateway** - Entry point for all requests
- **Authentication** - Login, token refresh, session management
- **Deal Service** - CRUD operations for automotive deals
- **Customer Service** - Customer management with PII encryption
- **Inventory Service** - Vehicle inventory operations
- **Tax Engine** - Real-time tax calculations
- **Messaging Service** - WebSocket connections
- **Showroom Service** - Real-time showroom management

### Test Infrastructure

```
tests/load/
├── lib/
│   ├── config.js          # Configuration and endpoints
│   └── helpers.js         # Helper functions and utilities
├── data/
│   └── generators.js      # Test data generators
├── scenarios/
│   ├── smoke.js           # Quick connectivity test
│   ├── load.js            # Normal load simulation
│   ├── stress.js          # Stress testing
│   ├── spike.js           # Spike traffic simulation
│   └── soak.js            # Endurance testing
├── thresholds.json        # Performance baselines
└── dashboards/
    └── grafana/           # Grafana dashboards
```

## Performance Baselines and SLAs

### Global Thresholds

| Metric       | Baseline | SLA Target |
| ------------ | -------- | ---------- |
| p95 Latency  | < 500ms  | < 500ms    |
| p99 Latency  | < 1000ms | < 1000ms   |
| Error Rate   | < 1%     | < 0.1%     |
| Availability | 99.9%    | 99.9%      |

### Service-Specific Thresholds

#### API Gateway

- p95 Latency: < 300ms
- p99 Latency: < 800ms
- Throughput: > 2000 req/sec

#### Authentication Service

| Operation     | p95   | p99    | Notes            |
| ------------- | ----- | ------ | ---------------- |
| Login         | 500ms | 1000ms | Includes bcrypt  |
| Token Refresh | 100ms | 200ms  | Redis lookup     |
| Register      | 600ms | 1200ms | Password hashing |

#### Deal Service

| Operation | p95   | p99   |
| --------- | ----- | ----- |
| List      | 300ms | 600ms |
| Create    | 400ms | 800ms |
| Get       | 150ms | 300ms |
| Update    | 300ms | 600ms |

#### Customer Service

| Operation | p95   | p99    | Notes            |
| --------- | ----- | ------ | ---------------- |
| List      | 400ms | 800ms  | PII decryption   |
| Search    | 500ms | 1000ms | Encrypted search |
| Create    | 500ms | 1000ms | PII encryption   |

#### Tax Engine

| Operation | p95   | p99    | Notes          |
| --------- | ----- | ------ | -------------- |
| Calculate | 100ms | 200ms  | Critical path  |
| Batch     | 500ms | 1000ms | Multi-scenario |

## Test Scenarios

### 1. Smoke Test

**Purpose**: Quick sanity check for basic functionality

```bash
# Configuration
VUs: 10
Duration: 1 minute
Thresholds:
  - p95 < 1000ms
  - Error rate < 1%
```

**When to run**:

- Before every deployment
- After infrastructure changes
- Quick CI validation

### 2. Load Test

**Purpose**: Simulate normal production traffic

```bash
# Configuration
VUs: Ramp to 100
Duration: 10 minutes
Stages:
  - 1m ramp to 50
  - 3m ramp to 100
  - 5m at 100
  - 1m ramp down
```

**When to run**:

- Daily scheduled tests
- Before production releases
- After significant code changes

### 3. Stress Test

**Purpose**: Find breaking points and degradation patterns

```bash
# Configuration
VUs: Up to 500
Duration: 15 minutes
Stages:
  - 2m to 100
  - 3m to 200
  - 3m to 300
  - 3m to 400
  - 2m to 500
  - 2m recovery
```

**When to run**:

- Weekly scheduled tests
- Before major releases
- Capacity planning

### 4. Spike Test

**Purpose**: Test sudden traffic surges

```bash
# Configuration
VUs: Spike to 1000
Pattern:
  - Baseline: 100 users
  - Spike: 1000 users (sudden)
  - Recovery period
```

**When to run**:

- Monthly testing
- Before anticipated high-traffic events
- Auto-scaling validation

### 5. Soak Test

**Purpose**: Identify memory leaks and long-term stability

```bash
# Configuration
VUs: 50
Duration: 2 hours
Focus:
  - Memory consumption
  - Connection pool stability
  - Session management
```

**When to run**:

- Weekly/bi-weekly
- Before major releases
- After dependency updates

## Running Load Tests

### Prerequisites

1. **Install k6**:

   ```bash
   # macOS
   brew install k6

   # Linux (Debian/Ubuntu)
   sudo gpg -k
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
     --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
     | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update && sudo apt-get install k6

   # Docker
   docker pull grafana/k6
   ```

2. **Configure environment**:
   ```bash
   export BASE_URL="http://localhost:8080"
   export TEST_USERNAME="loadtest@example.com"
   export TEST_PASSWORD="LoadTest123!"
   ```

### Using the Shell Script

```bash
# Run smoke test locally
./scripts/run-load-tests.sh smoke development

# Run load test against staging
./scripts/run-load-tests.sh load staging --ci

# Run stress test with custom settings
./scripts/run-load-tests.sh stress staging --vus 300 --duration 20m

# Run with custom output directory
./scripts/run-load-tests.sh load staging --output-dir /tmp/results
```

### Using k6 Directly

```bash
# Basic run
k6 run tests/load/scenarios/smoke.js

# With environment variables
k6 run --env BASE_URL=https://staging.example.com tests/load/scenarios/load.js

# With output
k6 run --out json=results.json tests/load/scenarios/load.js

# With custom duration
k6 run --duration 5m tests/load/scenarios/load.js
```

### Using Docker

```bash
docker run -i grafana/k6 run - < tests/load/scenarios/smoke.js

# With environment and volume
docker run -i \
  -e BASE_URL=http://host.docker.internal:8080 \
  -v $(pwd)/tests/load:/tests/load \
  grafana/k6 run /tests/load/scenarios/load.js
```

## Interpreting Results

### Key Metrics

1. **http_req_duration**: Request latency
   - `avg`: Average latency
   - `p(95)`: 95th percentile
   - `p(99)`: 99th percentile
   - `max`: Maximum observed

2. **http_req_failed**: Error rate
   - `rate`: Percentage of failed requests

3. **http_reqs**: Throughput
   - `count`: Total requests
   - `rate`: Requests per second

4. **Custom Metrics**:
   - `login_duration`: Authentication latency
   - `deal_create_duration`: Deal creation time
   - `customer_search_duration`: Search performance
   - `tax_calculation_duration`: Tax engine speed

### Understanding Results

**Healthy Results**:

```
http_req_duration..........: avg=150ms    p95=300ms    p99=500ms
http_req_failed............: 0.5%         rate<0.01
http_reqs..................: 10000        rate=166/s
```

**Degraded Performance**:

```
http_req_duration..........: avg=800ms    p95=1500ms   p99=2500ms
http_req_failed............: 3%           rate=0.03
```

**Critical Issues**:

```
http_req_duration..........: avg=2000ms   p95=5000ms   p99=10000ms
http_req_failed............: 15%          rate=0.15
```

### Common Patterns

| Pattern                  | Symptom               | Likely Cause               |
| ------------------------ | --------------------- | -------------------------- |
| Gradual latency increase | p95 climbs over time  | Memory leak                |
| Sudden spikes            | Random high latency   | GC pauses, connection pool |
| Increasing errors        | Error rate climbs     | Resource exhaustion        |
| Plateau then drop        | Good then degradation | Hitting capacity limit     |

## Capacity Planning

### Current Recommendations

Based on load testing results:

| Service          | Users/Instance | Memory | CPU  |
| ---------------- | -------------- | ------ | ---- |
| API Gateway      | 500            | 512MB  | 0.5  |
| Auth Service     | 300            | 256MB  | 0.25 |
| Deal Service     | 400            | 256MB  | 0.25 |
| Customer Service | 350            | 256MB  | 0.25 |
| Tax Engine       | 500            | 128MB  | 0.25 |

### Scaling Guidelines

1. **Horizontal Scaling Triggers**:
   - p95 latency > 400ms sustained
   - CPU utilization > 70%
   - Memory usage > 80%
   - Error rate > 0.5%

2. **Minimum Instances**:
   - Production: 3 per service
   - Staging: 2 per service
   - Development: 1 per service

### Capacity Formula

```
Required Instances = (Peak Users * Safety Factor) / Users per Instance

Example:
- Expected peak: 2000 concurrent users
- Safety factor: 1.5
- Users per API Gateway instance: 500

Required = (2000 * 1.5) / 500 = 6 instances
```

## Performance Tuning

### Database Optimization

1. **Connection Pooling**:

   ```go
   db.SetMaxOpenConns(25)
   db.SetMaxIdleConns(10)
   db.SetConnMaxLifetime(time.Hour)
   ```

2. **Query Optimization**:
   - Index frequently queried columns
   - Use EXPLAIN ANALYZE
   - Implement pagination

3. **Read Replicas**:
   - Route read queries to replicas
   - Keep writes on primary

### Caching Strategy

1. **Redis Cache Layers**:
   - Session data: 15-minute TTL
   - User preferences: 1-hour TTL
   - Configuration: 5-minute TTL

2. **Response Caching**:
   - Inventory listings: 30-second cache
   - Static data: 5-minute cache

### API Gateway Optimization

1. **Rate Limiting**:

   ```
   IP Rate Limit: 100 req/min
   User Rate Limit: 1000 req/min
   Dealership Rate Limit: 5000 req/min
   ```

2. **Connection Settings**:
   - Keep-alive connections
   - Connection timeout: 30s
   - Read timeout: 60s

### Go Service Optimization

1. **GOMAXPROCS**:

   ```bash
   export GOMAXPROCS=$(nproc)
   ```

2. **Memory Settings**:
   ```bash
   export GOMEMLIMIT=256MiB
   export GOGC=100
   ```

## Troubleshooting

### Common Issues

#### High Latency

1. **Check database**:

   ```sql
   -- Find slow queries
   SELECT query, mean_time, calls
   FROM pg_stat_statements
   ORDER BY mean_time DESC
   LIMIT 10;
   ```

2. **Check connections**:

   ```sql
   SELECT count(*) FROM pg_stat_activity
   WHERE state = 'active';
   ```

3. **Check Redis**:
   ```bash
   redis-cli info clients
   redis-cli slowlog get 10
   ```

#### High Error Rate

1. **Check logs**:

   ```bash
   kubectl logs -l app=api-gateway --tail=100
   ```

2. **Check health endpoints**:

   ```bash
   curl -s http://localhost:8080/health | jq
   ```

3. **Check resource usage**:
   ```bash
   kubectl top pods -l app=api-gateway
   ```

#### Memory Issues

1. **Go heap profiling**:

   ```bash
   go tool pprof http://localhost:6060/debug/pprof/heap
   ```

2. **Check for goroutine leaks**:
   ```bash
   go tool pprof http://localhost:6060/debug/pprof/goroutine
   ```

### Debugging Load Tests

1. **Enable debug mode**:

   ```bash
   k6 run --env DEBUG=true tests/load/scenarios/load.js
   ```

2. **Reduce load for debugging**:

   ```bash
   k6 run --vus 1 --duration 30s tests/load/scenarios/load.js
   ```

3. **Check specific endpoints**:
   ```bash
   k6 run --env DEBUG=true --tag endpoint=deals tests/load/scenarios/smoke.js
   ```

## CI/CD Integration

### GitHub Actions

Load tests are integrated into CI/CD:

- **PR Checks**: Smoke tests on every PR
- **Daily**: Load tests at 3 AM UTC
- **Weekly**: Stress tests on Sunday
- **Pre-deployment**: Load tests before production

### Triggering Manual Tests

```bash
# Via GitHub CLI
gh workflow run load-tests.yaml \
  -f scenario=stress \
  -f environment=staging
```

### Viewing Results

1. Check GitHub Actions artifacts
2. View job summary for key metrics
3. Download detailed JSON results

## Monitoring Integration

### Grafana Dashboards

Import dashboards from `tests/load/dashboards/grafana/`:

- `load-test-overview.json`: Real-time test metrics
- `load-test-comparison.json`: Historical comparison

### Prometheus Metrics

The API Gateway exposes metrics at `/metrics`:

```
# Rate limit metrics
rate_limit_requests_total
rate_limit_rejections_total

# HTTP metrics
http_requests_total
http_request_duration_seconds
```

### Alerting

Set up alerts for:

- p95 latency > 500ms for 5 minutes
- Error rate > 1% for 2 minutes
- Request rate drop > 50%

---

## Quick Reference

### Commands

```bash
# Smoke test
./scripts/run-load-tests.sh smoke development

# Load test
./scripts/run-load-tests.sh load staging

# Stress test
./scripts/run-load-tests.sh stress staging --ci

# Spike test
./scripts/run-load-tests.sh spike staging

# Soak test (long duration)
./scripts/run-load-tests.sh soak staging
```

### Environment Variables

| Variable      | Description          | Default               |
| ------------- | -------------------- | --------------------- |
| BASE_URL      | Target API URL       | http://localhost:8080 |
| TEST_USERNAME | Test user email      | loadtest@example.com  |
| TEST_PASSWORD | Test user password   | LoadTest123!          |
| ENVIRONMENT   | Target environment   | development           |
| DEBUG         | Enable debug logging | false                 |

### Thresholds Reference

| Scenario | p95 Latency | Error Rate |
| -------- | ----------- | ---------- |
| Smoke    | < 1000ms    | < 1%       |
| Load     | < 500ms     | < 1%       |
| Stress   | < 1000ms    | < 5%       |
| Spike    | < 2000ms    | < 10%      |
| Soak     | < 500ms     | < 1%       |
