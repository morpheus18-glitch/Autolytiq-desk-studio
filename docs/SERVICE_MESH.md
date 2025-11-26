# Istio Service Mesh Documentation

This document covers the Istio service mesh implementation for the Autolytiq Desk Studio microservices platform, including mTLS configuration, traffic management, and operational procedures.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Installation](#installation)
4. [mTLS Configuration](#mtls-configuration)
5. [Verifying mTLS](#verifying-mtls)
6. [Debugging TLS Issues](#debugging-tls-issues)
7. [Adding New Services](#adding-new-services)
8. [Traffic Management](#traffic-management)
9. [Circuit Breakers](#circuit-breakers)
10. [Monitoring and Observability](#monitoring-and-observability)
11. [Troubleshooting](#troubleshooting)

---

## Overview

The Autolytiq service mesh uses Istio to provide:

- **Mutual TLS (mTLS)**: Automatic encryption and authentication for all service-to-service communication
- **Authorization Policies**: Fine-grained access control between services
- **Traffic Management**: Canary deployments, traffic splitting, and header-based routing
- **Circuit Breakers**: Fault tolerance with connection pooling and outlier detection
- **Observability**: Distributed tracing, metrics, and service topology visualization

### Services in the Mesh

| Service           | Port | Purpose                          |
| ----------------- | ---- | -------------------------------- |
| api-gateway       | 8080 | External traffic entry point     |
| auth-service      | 8087 | Authentication and authorization |
| deal-service      | 8082 | Deal management                  |
| customer-service  | 8083 | Customer data management         |
| inventory-service | 8084 | Vehicle inventory                |
| email-service     | 8085 | Email notifications              |
| user-service      | 8086 | User management                  |
| config-service    | 8088 | Configuration management         |

---

## Architecture

```
                                    ┌─────────────────────────────────────────────┐
                                    │              Istio Control Plane             │
                                    │                   (istiod)                   │
                                    └──────────────────────┬──────────────────────┘
                                                           │
                                                           │ Config/Certs
                                                           ▼
┌──────────────┐     ┌──────────────────────────────────────────────────────────────────┐
│   External   │     │                        Autolytiq Namespace                        │
│   Traffic    │────▶│  ┌─────────────────────────────────────────────────────────────┐ │
└──────────────┘     │  │                  Istio Ingress Gateway                       │ │
                     │  └────────────────────────────┬────────────────────────────────┘ │
                     │                               │                                   │
                     │                               ▼ mTLS                              │
                     │  ┌─────────────────────────────────────────────────────────────┐ │
                     │  │                       API Gateway                            │ │
                     │  │                   ┌──────┬──────┐                           │ │
                     │  │                   │ App  │Envoy │                           │ │
                     │  │                   │      │Proxy │                           │ │
                     │  │                   └──────┴──────┘                           │ │
                     │  └──────────┬──────────┬──────────┬──────────┬────────────────┘ │
                     │             │          │          │          │                   │
                     │             ▼ mTLS     ▼ mTLS     ▼ mTLS     ▼ mTLS             │
                     │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐    │
                     │  │   Auth     │ │   Deal     │ │ Customer   │ │ Inventory  │    │
                     │  │  Service   │ │  Service   │ │  Service   │ │  Service   │    │
                     │  └────────────┘ └────────────┘ └────────────┘ └────────────┘    │
                     └──────────────────────────────────────────────────────────────────┘
```

---

## Installation

### Prerequisites

1. Kubernetes cluster (EKS 1.27+)
2. `kubectl` configured
3. `istioctl` CLI installed (v1.20+)

### Step 1: Install Istio

```bash
# Download istioctl
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.20.0 sh -
export PATH=$PWD/istio-1.20.0/bin:$PATH

# Install Istio using our custom configuration
istioctl install -f infrastructure/k8s/istio/istio-installation.yaml -y

# Verify installation
istioctl verify-install
```

### Step 2: Apply Namespace and Service Mesh Configuration

```bash
# Apply Istio namespaces
kubectl apply -f infrastructure/k8s/istio/istio-namespace.yaml

# Apply the autolytiq namespace with sidecar injection enabled
kubectl apply -f infrastructure/k8s/base/namespace.yaml

# Apply Istio policies
kubectl apply -k infrastructure/k8s/istio/
```

### Step 3: Deploy Services

```bash
# Deploy all services (sidecars will be automatically injected)
kubectl apply -k infrastructure/k8s/base/

# Restart existing pods to inject sidecars
kubectl rollout restart deployment -n autolytiq
```

### Step 4: Install Monitoring Components

```bash
# Install Kiali operator
kubectl apply -f https://raw.githubusercontent.com/kiali/kiali-operator/master/deploy/deploy-kiali-operator.sh

# Apply monitoring configuration
kubectl apply -f infrastructure/k8s/istio/monitoring.yaml
kubectl apply -f infrastructure/k8s/istio/prometheus-istio-scrape.yaml
```

---

## mTLS Configuration

### Overview

mTLS is configured at three levels:

1. **Mesh-wide**: Default STRICT mode for all services
2. **Namespace-level**: Explicit STRICT mode for the autolytiq namespace
3. **Service-level**: Per-service configuration for fine-grained control

### Configuration Files

- `peer-authentication.yaml`: Defines mTLS requirements
- `destination-rules.yaml`: Configures TLS mode and connection settings
- `authorization-policy.yaml`: Controls which services can communicate

### mTLS Modes

| Mode       | Description                    |
| ---------- | ------------------------------ |
| STRICT     | Only accept mTLS connections   |
| PERMISSIVE | Accept both plaintext and mTLS |
| DISABLE    | No mTLS (not recommended)      |

### Current Configuration

```yaml
# Mesh-wide STRICT mTLS (istio-system namespace)
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

---

## Verifying mTLS

### Method 1: Using istioctl

```bash
# Check mTLS status for all services in autolytiq namespace
istioctl x authz check deploy/api-gateway -n autolytiq

# Analyze the mesh configuration
istioctl analyze -n autolytiq

# Check proxy configuration
istioctl proxy-config cluster deploy/api-gateway -n autolytiq
```

### Method 2: Checking Certificates

```bash
# View the certificate chain for a service
istioctl proxy-config secret deploy/api-gateway -n autolytiq -o json | jq '.dynamicActiveSecrets[0].secret.tlsCertificate'

# Check certificate validity
kubectl exec -it deploy/api-gateway -n autolytiq -c istio-proxy -- \
  openssl s_client -connect auth-service:8087 -showcerts 2>/dev/null | \
  openssl x509 -noout -text
```

### Method 3: Verify TLS Connection

```bash
# Connect to a service and verify TLS
kubectl exec -it deploy/api-gateway -n autolytiq -c istio-proxy -- \
  curl -v https://auth-service:8087/health \
  --cacert /etc/certs/root-cert.pem \
  --cert /etc/certs/cert-chain.pem \
  --key /etc/certs/key.pem

# Check if connection uses mTLS
kubectl exec -it deploy/api-gateway -n autolytiq -c istio-proxy -- \
  pilot-agent request GET stats | grep ssl
```

### Method 4: Using Kiali

1. Access Kiali dashboard: `istioctl dashboard kiali`
2. Navigate to Graph view
3. Enable "Security" display option
4. Look for padlock icons on edges (indicates mTLS)

### Method 5: Check Prometheus Metrics

```bash
# Query mTLS traffic percentage
curl -s "http://prometheus:9090/api/v1/query?query=istio:mesh:mtls_traffic_percentage" | jq .

# Should return a value close to 1.0 (100%)
```

---

## Debugging TLS Issues

### Common Issues and Solutions

#### Issue 1: Connection Refused

**Symptoms**: Services cannot communicate, connection refused errors

**Diagnosis**:

```bash
# Check if sidecar is injected
kubectl get pods -n autolytiq -o jsonpath='{.items[*].spec.containers[*].name}' | tr ' ' '\n' | grep istio-proxy

# Check proxy status
istioctl proxy-status

# Check for configuration errors
istioctl analyze -n autolytiq
```

**Solutions**:

- Ensure namespace has `istio-injection: enabled` label
- Restart pods to inject sidecar
- Check PeerAuthentication policies

#### Issue 2: TLS Handshake Failure

**Symptoms**: `upstream connect error or disconnect/reset before headers`

**Diagnosis**:

```bash
# Check Envoy logs
kubectl logs deploy/api-gateway -n autolytiq -c istio-proxy | grep -i tls

# Check certificate expiry
istioctl proxy-config secret deploy/api-gateway -n autolytiq -o json | \
  jq '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -noout -dates
```

**Solutions**:

- Verify istiod is running and healthy
- Check if certificates are valid
- Ensure trust domain matches

#### Issue 3: Authorization Denied

**Symptoms**: `RBAC: access denied`

**Diagnosis**:

```bash
# Check authorization policies
kubectl get authorizationpolicy -n autolytiq -o yaml

# Debug authorization
istioctl x authz check deploy/api-gateway -n autolytiq
```

**Solutions**:

- Review AuthorizationPolicy rules
- Check service account names
- Verify namespace selectors

#### Issue 4: Mixed Mode Traffic

**Symptoms**: Some connections fail, others succeed

**Diagnosis**:

```bash
# Check PeerAuthentication mode per workload
kubectl get peerauthentication -n autolytiq -o yaml

# Check DestinationRule TLS settings
kubectl get destinationrule -n autolytiq -o yaml
```

**Solutions**:

- Ensure all services use STRICT mode
- Update DestinationRules to use ISTIO_MUTUAL

### Debug Commands Reference

```bash
# Full proxy configuration dump
istioctl proxy-config all deploy/api-gateway -n autolytiq -o json > proxy-config.json

# Check listener configuration
istioctl proxy-config listener deploy/api-gateway -n autolytiq

# Check route configuration
istioctl proxy-config route deploy/api-gateway -n autolytiq

# Check cluster configuration
istioctl proxy-config cluster deploy/api-gateway -n autolytiq

# Check endpoint configuration
istioctl proxy-config endpoint deploy/api-gateway -n autolytiq

# Enable debug logging
istioctl proxy-config log deploy/api-gateway -n autolytiq --level debug

# Reset to warning level
istioctl proxy-config log deploy/api-gateway -n autolytiq --level warning
```

---

## Adding New Services

### Step 1: Create Service Deployment

Ensure your deployment includes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-new-service
  namespace: autolytiq
  labels:
    app: my-new-service
    tier: backend
    version: stable # Required for traffic management
spec:
  template:
    metadata:
      labels:
        app: my-new-service
        tier: backend
        version: stable
      annotations:
        sidecar.istio.io/inject: 'true'
        sidecar.istio.io/proxyCPU: '50m'
        sidecar.istio.io/proxyCPULimit: '300m'
        sidecar.istio.io/proxyMemory: '64Mi'
        sidecar.istio.io/proxyMemoryLimit: '128Mi'
        prometheus.io/scrape: 'true'
        prometheus.io/port: 'YOUR_PORT'
        prometheus.io/path: '/metrics'
    spec:
      containers:
        - name: my-new-service
          ports:
            - containerPort: YOUR_PORT
              name: http # Named port is important
```

### Step 2: Create Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-new-service
  namespace: autolytiq
spec:
  type: ClusterIP
  ports:
    - port: YOUR_PORT
      targetPort: YOUR_PORT
      protocol: TCP
      name: http # Named port required for protocol detection
  selector:
    app: my-new-service
```

### Step 3: Add PeerAuthentication

Add to `peer-authentication.yaml`:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: my-new-service-mtls
  namespace: autolytiq
spec:
  selector:
    matchLabels:
      app: my-new-service
  mtls:
    mode: STRICT
  portLevelMtls:
    YOUR_PORT:
      mode: STRICT
```

### Step 4: Add AuthorizationPolicy

Add to `authorization-policy.yaml`:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: my-new-service-policy
  namespace: autolytiq
spec:
  selector:
    matchLabels:
      app: my-new-service
  action: ALLOW
  rules:
    # Allow from specific services
    - from:
        - source:
            namespaces:
              - 'autolytiq'
      to:
        - operation:
            ports:
              - 'YOUR_PORT'
            methods:
              - 'GET'
              - 'POST'
              - 'PUT'
              - 'DELETE'
    # Allow Prometheus scraping
    - from:
        - source:
            namespaces:
              - 'monitoring'
      to:
        - operation:
            paths:
              - '/metrics'
```

### Step 5: Add DestinationRule

Add to `destination-rules.yaml`:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-new-service
  namespace: autolytiq
spec:
  host: my-new-service.autolytiq.svc.cluster.local
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 10s
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
        maxRetries: 3
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
  subsets:
    - name: stable
      labels:
        version: stable
    - name: canary
      labels:
        version: canary
```

### Step 6: Add VirtualService (Optional)

Add to `virtual-services.yaml`:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-new-service
  namespace: autolytiq
spec:
  hosts:
    - my-new-service.autolytiq.svc.cluster.local
  http:
    - match:
        - headers:
            x-canary:
              exact: 'true'
      route:
        - destination:
            host: my-new-service.autolytiq.svc.cluster.local
            subset: canary
      timeout: 30s
    - route:
        - destination:
            host: my-new-service.autolytiq.svc.cluster.local
            subset: stable
          weight: 100
      timeout: 30s
      retries:
        attempts: 3
        perTryTimeout: 10s
        retryOn: gateway-error,connect-failure,refused-stream
```

### Step 7: Apply and Verify

```bash
# Apply configuration
kubectl apply -k infrastructure/k8s/istio/
kubectl apply -f your-new-service.yaml

# Verify sidecar injection
kubectl get pods -n autolytiq -l app=my-new-service

# Verify mTLS
istioctl x authz check deploy/my-new-service -n autolytiq

# Test connectivity
kubectl exec -it deploy/api-gateway -n autolytiq -c istio-proxy -- \
  curl -s http://my-new-service:YOUR_PORT/health
```

---

## Traffic Management

### Canary Deployments

To perform a canary deployment:

1. **Deploy canary version**:

```bash
kubectl apply -f my-service-canary.yaml  # With version: canary label
```

2. **Update VirtualService for traffic split**:

```yaml
spec:
  http:
    - route:
        - destination:
            host: my-service.autolytiq.svc.cluster.local
            subset: stable
          weight: 90
        - destination:
            host: my-service.autolytiq.svc.cluster.local
            subset: canary
          weight: 10
```

3. **Monitor metrics** in Grafana/Kiali

4. **Gradually increase canary traffic** (10% -> 25% -> 50% -> 100%)

5. **Complete rollout** by updating stable deployment

### Header-Based Routing

Route specific users to canary:

```bash
# Test canary with header
curl -H "x-canary: true" https://api.autolytiq.com/api/deals

# Route beta users
curl -H "x-user-group: beta" https://api.autolytiq.com/api/deals
```

### Traffic Mirroring

Mirror production traffic to a test environment:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
spec:
  http:
    - route:
        - destination:
            host: my-service
            subset: stable
      mirror:
        host: my-service
        subset: canary
      mirrorPercentage:
        value: 10.0
```

---

## Circuit Breakers

### Configuration

Circuit breakers are configured in DestinationRules:

```yaml
outlierDetection:
  consecutive5xxErrors: 5 # Eject after 5 consecutive 5xx errors
  consecutiveGatewayErrors: 5 # Eject after 5 gateway errors
  interval: 10s # Check interval
  baseEjectionTime: 30s # Initial ejection duration
  maxEjectionPercent: 50 # Max % of hosts to eject
  minHealthPercent: 30 # Min healthy hosts before ejection stops
```

### Connection Pool Settings

```yaml
connectionPool:
  tcp:
    maxConnections: 100 # Max TCP connections
    connectTimeout: 10s # Connection timeout
  http:
    http1MaxPendingRequests: 100 # Max pending HTTP/1.1 requests
    http2MaxRequests: 1000 # Max concurrent HTTP/2 requests
    maxRequestsPerConnection: 100 # Requests per connection before close
    maxRetries: 3 # Max retries
```

### Monitoring Circuit Breakers

```bash
# Check circuit breaker status
kubectl exec -it deploy/api-gateway -n autolytiq -c istio-proxy -- \
  pilot-agent request GET stats | grep circuit

# Check outlier detection
kubectl exec -it deploy/api-gateway -n autolytiq -c istio-proxy -- \
  pilot-agent request GET stats | grep outlier
```

---

## Monitoring and Observability

### Accessing Dashboards

```bash
# Kiali - Service mesh visualization
istioctl dashboard kiali

# Grafana - Metrics dashboards
istioctl dashboard grafana

# Jaeger - Distributed tracing
istioctl dashboard jaeger

# Prometheus - Metrics queries
istioctl dashboard prometheus
```

### Key Metrics

| Metric                                       | Description         | Alert Threshold |
| -------------------------------------------- | ------------------- | --------------- |
| `istio_requests_total`                       | Total request count | N/A             |
| `istio_request_duration_milliseconds`        | Request latency     | P99 > 2s        |
| `istio_requests_total{response_code=~"5.."}` | Error count         | > 1%            |
| `istio:mesh:mtls_traffic_percentage`         | mTLS usage          | < 95%           |

### Important Dashboards

1. **Istio Mesh Dashboard**: Overall mesh health
2. **Istio Service Dashboard**: Per-service metrics
3. **Istio Workload Dashboard**: Per-pod metrics
4. **Autolytiq Services Dashboard**: Application-specific metrics

---

## Troubleshooting

### Quick Health Check

```bash
#!/bin/bash
# health-check.sh

echo "=== Istio Control Plane ==="
kubectl get pods -n istio-system

echo -e "\n=== Proxy Status ==="
istioctl proxy-status

echo -e "\n=== Configuration Analysis ==="
istioctl analyze -n autolytiq

echo -e "\n=== mTLS Status ==="
for svc in api-gateway auth-service deal-service customer-service inventory-service email-service user-service config-service; do
  echo "Checking $svc..."
  istioctl x authz check deploy/$svc -n autolytiq 2>/dev/null | head -5
done

echo -e "\n=== Circuit Breaker Status ==="
kubectl exec -it deploy/api-gateway -n autolytiq -c istio-proxy -- \
  pilot-agent request GET stats 2>/dev/null | grep -E "(circuit|outlier)" | head -10
```

### Common Commands

```bash
# View Envoy access logs
kubectl logs deploy/api-gateway -n autolytiq -c istio-proxy -f

# View application logs
kubectl logs deploy/api-gateway -n autolytiq -c api-gateway -f

# Restart Istio sidecar
kubectl delete pod -l app=api-gateway -n autolytiq

# Force sidecar injection
kubectl label namespace autolytiq istio-injection=enabled --overwrite

# Check Istio version
istioctl version

# Upgrade Istio
istioctl upgrade -f infrastructure/k8s/istio/istio-installation.yaml
```

### Emergency Procedures

#### Disable mTLS Temporarily

```yaml
# Apply PERMISSIVE mode
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: autolytiq
spec:
  mtls:
    mode: PERMISSIVE
```

#### Bypass Istio for a Service

```yaml
# Add annotation to pod
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/inject: 'false'
```

#### Reset Istio Configuration

```bash
# Remove all Istio resources from namespace
kubectl delete peerauthentication --all -n autolytiq
kubectl delete authorizationpolicy --all -n autolytiq
kubectl delete destinationrule --all -n autolytiq
kubectl delete virtualservice --all -n autolytiq

# Reapply
kubectl apply -k infrastructure/k8s/istio/
```

---

## References

- [Istio Documentation](https://istio.io/latest/docs/)
- [Istio Security Best Practices](https://istio.io/latest/docs/ops/best-practices/security/)
- [Envoy Proxy Documentation](https://www.envoyproxy.io/docs/envoy/latest/)
- [Kiali Documentation](https://kiali.io/docs/)
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
