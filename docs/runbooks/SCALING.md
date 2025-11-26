# Scaling Runbook

## Overview

This document provides procedures for scaling the Autolytiq Desk Studio platform to handle increased load, optimize resource utilization, and plan for capacity growth.

---

## Table of Contents

1. [Horizontal Scaling Procedures](#horizontal-scaling-procedures)
2. [Vertical Scaling Procedures](#vertical-scaling-procedures)
3. [Database Scaling](#database-scaling)
4. [Cache Scaling](#cache-scaling)
5. [Load Testing Baseline Metrics](#load-testing-baseline-metrics)
6. [Capacity Planning Guidelines](#capacity-planning-guidelines)
7. [Auto-Scaling Configuration](#auto-scaling-configuration)

---

## Horizontal Scaling Procedures

### Manual Pod Scaling

#### Scale Individual Service

```bash
# Check current replicas
kubectl get deployment <service> -n autolytiq-prod

# Scale up
kubectl scale deployment/<service> --replicas=<count> -n autolytiq-prod

# Example: Scale deal-service to 5 replicas
kubectl scale deployment/deal-service --replicas=5 -n autolytiq-prod

# Verify scaling
kubectl get pods -l app=<service> -n autolytiq-prod -w
```

#### Scale All Services

```bash
# Scale all services to handle high traffic
for svc in api-gateway auth-service deal-service customer-service inventory-service; do
  kubectl scale deployment/$svc --replicas=5 -n autolytiq-prod
done
```

#### Scale Based on Load Forecast

| Traffic Level    | API Gateway | Auth Service | Deal Service | Customer Service | Inventory Service |
| ---------------- | ----------- | ------------ | ------------ | ---------------- | ----------------- |
| Normal           | 3           | 3            | 3            | 2                | 2                 |
| High (+50%)      | 5           | 4            | 5            | 3                | 3                 |
| Peak (+100%)     | 8           | 6            | 8            | 5                | 5                 |
| Critical (+200%) | 10          | 8            | 10           | 6                | 6                 |

### HPA (Horizontal Pod Autoscaler)

#### View Current HPA Status

```bash
# List all HPAs
kubectl get hpa -n autolytiq-prod

# Detailed HPA status
kubectl describe hpa <service>-hpa -n autolytiq-prod

# Watch HPA scaling decisions
kubectl get hpa -n autolytiq-prod -w
```

#### Modify HPA Thresholds

```bash
# Edit HPA directly (temporary)
kubectl edit hpa <service>-hpa -n autolytiq-prod

# Or patch specific values
kubectl patch hpa api-gateway-hpa -n autolytiq-prod \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/maxReplicas", "value": 15}]'
```

#### Create Custom HPA

```yaml
# Apply custom HPA for high-traffic event
kubectl apply -f - <<EOF
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa-event
  namespace: autolytiq-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 5
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 50
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 60
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Pods
          value: 4
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 25
          periodSeconds: 60
EOF
```

### Scaling Node Pool

When pods are pending due to insufficient node capacity:

```bash
# Check pending pods
kubectl get pods -n autolytiq-prod | grep Pending

# Check node capacity
kubectl describe nodes | grep -A 5 "Allocated resources"

# Scale EKS node group via AWS CLI
aws eks update-nodegroup-config \
  --cluster-name autolytiq-cluster \
  --nodegroup-name autolytiq-prod-workers \
  --scaling-config minSize=3,maxSize=20,desiredSize=8

# Or use Cluster Autoscaler annotations
kubectl annotate deployment/<service> \
  cluster-autoscaler.kubernetes.io/safe-to-evict="false" \
  -n autolytiq-prod
```

---

## Vertical Scaling Procedures

### Increase Pod Resources

#### Temporary Resource Increase

```bash
# Increase resources for a deployment
kubectl set resources deployment/<service> \
  --limits=cpu=2000m,memory=2048Mi \
  --requests=cpu=500m,memory=512Mi \
  -n autolytiq-prod
```

#### Permanent Resource Update

Edit the overlay for the environment:

```yaml
# infrastructure/k8s/overlays/prod/resource-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: deal-service
spec:
  template:
    spec:
      containers:
        - name: deal-service
          resources:
            requests:
              memory: '512Mi'
              cpu: '500m'
            limits:
              memory: '2048Mi'
              cpu: '2000m'
```

### Resource Recommendations

#### Service Resource Guidelines

| Service           | Base Memory | Peak Memory | Base CPU | Peak CPU |
| ----------------- | ----------- | ----------- | -------- | -------- |
| api-gateway       | 256Mi       | 512Mi       | 200m     | 1000m    |
| auth-service      | 256Mi       | 512Mi       | 200m     | 500m     |
| deal-service      | 512Mi       | 1024Mi      | 300m     | 1000m    |
| customer-service  | 256Mi       | 512Mi       | 200m     | 500m     |
| inventory-service | 256Mi       | 512Mi       | 200m     | 500m     |
| email-service     | 256Mi       | 512Mi       | 100m     | 300m     |
| config-service    | 128Mi       | 256Mi       | 100m     | 200m     |

#### Vertical Pod Autoscaler (VPA)

```yaml
# Deploy VPA for recommendations (recommend mode only)
kubectl apply -f - <<EOF
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: deal-service-vpa
  namespace: autolytiq-prod
spec:
  targetRef:
    apiVersion: "apps/v1"
    kind: Deployment
    name: deal-service
  updatePolicy:
    updateMode: "Off"  # Only recommendations, no auto-update
  resourcePolicy:
    containerPolicies:
      - containerName: deal-service
        minAllowed:
          memory: "256Mi"
          cpu: "100m"
        maxAllowed:
          memory: "4Gi"
          cpu: "4"
EOF
```

View VPA recommendations:

```bash
kubectl describe vpa deal-service-vpa -n autolytiq-prod
```

---

## Database Scaling

### Aurora Serverless v2 Scaling

#### View Current Capacity

```bash
# Check current ACU usage
aws rds describe-db-clusters \
  --db-cluster-identifier autolytiq-prod \
  --query 'DBClusters[0].ServerlessV2ScalingConfiguration'

# Check via CloudWatch
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name ServerlessDatabaseCapacity \
  --dimensions Name=DBClusterIdentifier,Value=autolytiq-prod \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 \
  --statistics Average
```

#### Modify Capacity Range

```bash
# Increase min/max capacity
aws rds modify-db-cluster \
  --db-cluster-identifier autolytiq-prod \
  --serverless-v2-scaling-configuration MinCapacity=4,MaxCapacity=32 \
  --apply-immediately

# Verify change
aws rds describe-db-clusters \
  --db-cluster-identifier autolytiq-prod \
  --query 'DBClusters[0].ServerlessV2ScalingConfiguration'
```

#### Capacity Guidelines

| Traffic Level | Min ACU | Max ACU |
| ------------- | ------- | ------- |
| Normal        | 2       | 16      |
| High          | 4       | 32      |
| Peak          | 8       | 64      |

### Add Read Replicas

```bash
# Add read replica for read scaling
aws rds create-db-instance \
  --db-instance-identifier autolytiq-prod-reader-2 \
  --db-cluster-identifier autolytiq-prod \
  --db-instance-class db.serverless \
  --engine aurora-postgresql
```

### Connection Pool Optimization

```bash
# Check current connection usage
kubectl exec -it <postgres-pod> -- psql -U autolytiq_admin -d autolytiq \
  -c "SELECT usename, count(*) FROM pg_stat_activity GROUP BY usename;"

# Update connection pool settings in services
# Edit environment variables
kubectl set env deployment/<service> \
  DB_POOL_MIN=5 \
  DB_POOL_MAX=20 \
  -n autolytiq-prod
```

### Recommended Pool Settings by Traffic

| Traffic Level | Pool Min | Pool Max | Idle Timeout |
| ------------- | -------- | -------- | ------------ |
| Normal        | 5        | 20       | 30s          |
| High          | 10       | 40       | 20s          |
| Peak          | 20       | 60       | 10s          |

---

## Cache Scaling

### Redis ElastiCache Scaling

#### View Current Status

```bash
# Check Redis cluster status
aws elasticache describe-cache-clusters \
  --cache-cluster-id autolytiq-prod-redis \
  --show-cache-node-info

# Check memory usage
aws cloudwatch get-metric-statistics \
  --namespace AWS/ElastiCache \
  --metric-name DatabaseMemoryUsagePercentage \
  --dimensions Name=CacheClusterId,Value=autolytiq-prod-redis \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 \
  --statistics Average
```

#### Vertical Scaling (Node Size)

```bash
# Modify cache node type
aws elasticache modify-cache-cluster \
  --cache-cluster-id autolytiq-prod-redis \
  --cache-node-type cache.r6g.large \
  --apply-immediately
```

#### Horizontal Scaling (Add Nodes)

For Redis Cluster mode:

```bash
# Add shards to cluster
aws elasticache modify-replication-group-shard-configuration \
  --replication-group-id autolytiq-prod-redis \
  --node-group-count 3 \
  --apply-immediately
```

### Redis Node Size Guidelines

| Traffic Level | Node Type        | Memory   | Nodes |
| ------------- | ---------------- | -------- | ----- |
| Normal        | cache.r6g.medium | 6.38 GB  | 1     |
| High          | cache.r6g.large  | 13.07 GB | 1     |
| Peak          | cache.r6g.xlarge | 26.32 GB | 2     |

### Cache Eviction Monitoring

```bash
# Connect to Redis and check stats
kubectl exec -it <redis-pod> -n autolytiq-prod -- redis-cli INFO stats

# Key metrics to watch:
# - evicted_keys (should be 0 in normal operation)
# - keyspace_hits / keyspace_misses (hit ratio)
```

---

## Load Testing Baseline Metrics

### Current Performance Baselines

| Metric                  | Acceptable | Warning     | Critical   |
| ----------------------- | ---------- | ----------- | ---------- |
| API Response Time (p50) | < 100ms    | 100-200ms   | > 200ms    |
| API Response Time (p95) | < 300ms    | 300-500ms   | > 500ms    |
| API Response Time (p99) | < 500ms    | 500-1000ms  | > 1000ms   |
| Error Rate              | < 0.1%     | 0.1-1%      | > 1%       |
| CPU Usage               | < 60%      | 60-80%      | > 80%      |
| Memory Usage            | < 70%      | 70-85%      | > 85%      |
| DB Query Time (p95)     | < 50ms     | 50-100ms    | > 100ms    |
| DB Connections          | < 80% pool | 80-90% pool | > 90% pool |

### Load Testing Procedures

#### Run Load Test

```bash
# Using k6
k6 run --vus 100 --duration 10m tests/load/api-gateway.js

# Using Artillery
npx artillery run tests/load/config.yaml
```

#### Standard Load Test Scenarios

**Scenario 1: Normal Load**

```yaml
# 100 concurrent users, 10 minute duration
config:
  target: 'https://api.autolytiq.com'
  phases:
    - duration: 60
      arrivalRate: 10
    - duration: 540
      arrivalRate: 100
```

**Scenario 2: Spike Test**

```yaml
# Sudden spike from 50 to 500 users
config:
  target: 'https://api.autolytiq.com'
  phases:
    - duration: 120
      arrivalRate: 50
    - duration: 60
      arrivalRate: 500
    - duration: 300
      arrivalRate: 500
    - duration: 120
      arrivalRate: 50
```

**Scenario 3: Stress Test**

```yaml
# Gradually increase until failure
config:
  target: 'https://api.autolytiq.com'
  phases:
    - duration: 120
      arrivalRate: 50
    - duration: 120
      arrivalRate: 100
    - duration: 120
      arrivalRate: 200
    - duration: 120
      arrivalRate: 400
    - duration: 120
      arrivalRate: 800
```

### Breaking Point Metrics

Based on load testing:

| Service           | Max RPS (per pod) | Breaking Point | Scaling Factor    |
| ----------------- | ----------------- | -------------- | ----------------- |
| api-gateway       | 500               | 1000 RPS       | 1 pod per 400 RPS |
| auth-service      | 200               | 400 RPS        | 1 pod per 150 RPS |
| deal-service      | 150               | 300 RPS        | 1 pod per 100 RPS |
| customer-service  | 300               | 500 RPS        | 1 pod per 200 RPS |
| inventory-service | 400               | 700 RPS        | 1 pod per 300 RPS |

---

## Capacity Planning Guidelines

### Monthly Review Checklist

- [ ] Review CloudWatch metrics for past month
- [ ] Analyze traffic growth trends
- [ ] Review database capacity utilization
- [ ] Review cache hit rates and evictions
- [ ] Check for capacity-related incidents
- [ ] Update forecasts based on business growth

### Growth Projections

#### Traffic Growth Formula

```
Future Capacity = Current Capacity * (1 + Growth Rate)^Months

Example:
- Current: 1000 RPS peak
- Growth Rate: 15% per month
- 6 months: 1000 * (1.15)^6 = 2313 RPS
```

#### Capacity Planning Table

| Timeline   | Expected Traffic | API Gateway Pods | DB ACUs | Redis Memory |
| ---------- | ---------------- | ---------------- | ------- | ------------ |
| Current    | 1000 RPS         | 5                | 8       | 6 GB         |
| +3 months  | 1500 RPS         | 8                | 12      | 10 GB        |
| +6 months  | 2300 RPS         | 10               | 16      | 16 GB        |
| +12 months | 5300 RPS         | 15               | 32      | 32 GB        |

### Pre-Scaling for Events

For planned high-traffic events:

```bash
# 24 hours before event
# 1. Scale services proactively
kubectl scale deployment/api-gateway --replicas=10 -n autolytiq-prod
kubectl scale deployment/deal-service --replicas=8 -n autolytiq-prod

# 2. Increase database capacity
aws rds modify-db-cluster \
  --db-cluster-identifier autolytiq-prod \
  --serverless-v2-scaling-configuration MinCapacity=8,MaxCapacity=64 \
  --apply-immediately

# 3. Warm up caches
# Run cache warming scripts
npm run cache:warm -- --env=prod

# 4. Disable HPA scale-down during event
kubectl annotate hpa api-gateway-hpa \
  "autoscaling.alpha.kubernetes.io/scale-down-disabled=true" \
  -n autolytiq-prod
```

### Cost Optimization

#### Right-Sizing Recommendations

```bash
# Get resource usage over past week
kubectl top pods -n autolytiq-prod --containers

# Compare with limits
kubectl get pods -n autolytiq-prod -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].resources.limits.memory}{"\n"}{end}'
```

#### Scaling Down After Peak

```bash
# After high-traffic event, scale down gradually
# Wait 1-2 hours after traffic normalizes

# 1. Re-enable HPA scale-down
kubectl annotate hpa api-gateway-hpa \
  "autoscaling.alpha.kubernetes.io/scale-down-disabled-" \
  -n autolytiq-prod

# 2. Reset database capacity
aws rds modify-db-cluster \
  --db-cluster-identifier autolytiq-prod \
  --serverless-v2-scaling-configuration MinCapacity=2,MaxCapacity=16 \
  --apply-immediately

# 3. Let HPA scale down naturally (stabilization window: 5 min)
```

---

## Auto-Scaling Configuration

### Current HPA Configuration

```yaml
# api-gateway HPA (production)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: autolytiq-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### Cluster Autoscaler Configuration

```yaml
# Cluster autoscaler settings
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-config
  namespace: kube-system
data:
  scale-down-delay-after-add: '10m'
  scale-down-delay-after-delete: '10s'
  scale-down-delay-after-failure: '3m'
  scale-down-unneeded-time: '10m'
  scale-down-utilization-threshold: '0.5'
  max-node-provision-time: '15m'
  balance-similar-node-groups: 'true'
  expander: 'least-waste'
```

### PodDisruptionBudget Configuration

```yaml
# Ensure minimum availability during scaling
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-gateway-pdb
  namespace: autolytiq-prod
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: api-gateway
```

---

## Troubleshooting Scaling Issues

### Pods Not Scaling Up

```bash
# Check HPA events
kubectl describe hpa <service>-hpa -n autolytiq-prod

# Common issues:
# - Metrics not available: Check metrics-server
kubectl top pods -n autolytiq-prod

# - Unable to fetch metrics
kubectl logs -n kube-system -l k8s-app=metrics-server
```

### Pods Stuck in Pending

```bash
# Check pod events
kubectl describe pod <pod-name> -n autolytiq-prod

# Check node capacity
kubectl describe nodes | grep -A 5 "Allocated resources"

# Check cluster autoscaler logs
kubectl logs -n kube-system -l app=cluster-autoscaler --tail=100
```

### Scale-Down Not Happening

```bash
# Check HPA status
kubectl get hpa -n autolytiq-prod

# Check for scale-down disabled annotation
kubectl get hpa <service>-hpa -n autolytiq-prod -o yaml | grep annotations

# Check stabilization window (default 5 min for scale-down)
kubectl describe hpa <service>-hpa -n autolytiq-prod | grep -A 10 Behavior
```

---

## Change Log

| Date       | Version | Author   | Changes         |
| ---------- | ------- | -------- | --------------- |
| 2024-11-26 | 1.0.0   | Ops Team | Initial version |
