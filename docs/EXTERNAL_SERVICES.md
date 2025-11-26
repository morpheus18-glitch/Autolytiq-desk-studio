# External Services Configuration Guide

This document provides comprehensive documentation for all external services required by the Autolytiq microservices application.

## Table of Contents

1. [Overview](#overview)
2. [Neon PostgreSQL / Aurora PostgreSQL](#neon-postgresql--aurora-postgresql)
3. [Redis / ElastiCache](#redis--elasticache)
4. [Resend Email Service](#resend-email-service)
5. [AWS S3](#aws-s3)
6. [AWS EKS](#aws-eks)
7. [AWS ECR](#aws-ecr)
8. [AWS Secrets Manager](#aws-secrets-manager)
9. [Cost Estimates](#cost-estimates)
10. [Environment Variable Reference](#environment-variable-reference)

---

## Overview

Autolytiq relies on the following external services:

| Service                  | Purpose                          | Critical | Fallback           |
| ------------------------ | -------------------------------- | -------- | ------------------ |
| PostgreSQL (Aurora/Neon) | Primary database                 | Yes      | None               |
| Redis (ElastiCache)      | Caching, sessions, rate limiting | Yes      | In-memory fallback |
| Resend                   | Transactional email delivery     | No       | Queue for retry    |
| AWS S3                   | File storage (documents, images) | No       | Local storage      |
| AWS EKS                  | Kubernetes orchestration         | Yes      | None               |
| AWS ECR                  | Container registry               | Yes      | Docker Hub         |
| AWS Secrets Manager      | Secrets management               | Yes      | Kubernetes Secrets |

---

## Neon PostgreSQL / Aurora PostgreSQL

### Purpose

- Primary data store for all application data
- Multi-tenant data isolation
- Transactional operations
- Complex queries and reporting

### Development (Neon)

**Setup Steps:**

1. Create a Neon account at https://neon.tech
2. Create a new project:
   ```bash
   # Via Neon CLI
   neonctl projects create --name autolytiq-dev
   ```
3. Get connection string from dashboard
4. Enable required extensions

**Required Extensions:**

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
```

**Connection String Format:**

```
postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/autolytiq?sslmode=require
```

**Pooling Configuration:**

- Neon uses connection pooling by default
- Pooler endpoint: `ep-xxx-pooler.us-east-1.aws.neon.tech`
- Direct endpoint: `ep-xxx.us-east-1.aws.neon.tech`

**Environment Variables:**

```bash
DATABASE_URL=postgresql://user:pass@host:5432/autolytiq?sslmode=require
DATABASE_POOL_URL=postgresql://user:pass@pooler-host:5432/autolytiq?sslmode=require
DB_POOL_SIZE=25
DB_SSL_MODE=require
```

### Production (Aurora PostgreSQL Serverless v2)

**Setup via Terraform:**
The infrastructure is managed via Terraform in `/infrastructure/terraform/rds.tf`.

**Key Configuration:**

```hcl
resource "aws_rds_cluster" "main" {
  cluster_identifier = "autolytiq-prod"
  engine            = "aurora-postgresql"
  engine_version    = "15.4"
  engine_mode       = "provisioned"
  database_name     = "autolytiq"

  serverlessv2_scaling_configuration {
    min_capacity = 2    # Production minimum
    max_capacity = 16   # Scale up to 16 ACUs
  }

  backup_retention_period = 35
  storage_encrypted      = true
  deletion_protection    = true
}
```

**Connection Pooling:**

- Use RDS Proxy for connection pooling in production
- Or configure PgBouncer as a sidecar

**Required Credentials:**

- `master_username`: autolytiq_admin
- `master_password`: Stored in AWS Secrets Manager
- `database`: autolytiq

**Setup Steps:**

1. Apply Terraform configuration:

   ```bash
   cd infrastructure/terraform
   terraform init
   terraform apply -var="environment=prod"
   ```

2. Retrieve credentials from Secrets Manager:

   ```bash
   aws secretsmanager get-secret-value \
     --secret-id autolytiq/prod/database \
     --query SecretString --output text | jq -r .url
   ```

3. Run migrations:
   ```bash
   DATABASE_URL="$DB_URL" npm run db:push
   ```

---

## Redis / ElastiCache

### Purpose

- Session storage
- Rate limiting counters
- Cache layer (query results, computed values)
- Pub/Sub for real-time features

### Development (Local Redis)

**Docker Compose:**

```yaml
redis:
  image: redis:7-alpine
  ports:
    - '6379:6379'
  command: redis-server --appendonly yes
```

**Connection:**

```bash
REDIS_URL=redis://localhost:6379
```

### Production (ElastiCache)

**Setup via Terraform:**
Managed in `/infrastructure/terraform/elasticache.tf`.

**Key Configuration:**

```hcl
resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "autolytiq-prod"
  engine              = "redis"
  engine_version      = "7.0"
  node_type           = "cache.r5.large"  # Production
  num_cache_clusters  = 3                  # Multi-AZ

  automatic_failover_enabled = true
  multi_az_enabled          = true
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
}
```

**Required Credentials:**

- `auth_token`: Auto-generated, stored in Secrets Manager
- TLS required in production

**Connection String Format:**

```
rediss://:password@master.autolytiq-prod.xxx.cache.amazonaws.com:6379
```

**Environment Variables:**

```bash
REDIS_URL=rediss://:token@endpoint:6379
REDIS_PASSWORD=auth-token
REDIS_TLS_ENABLED=true
REDIS_DB=0
```

**Setup Steps:**

1. Apply Terraform:

   ```bash
   terraform apply -var="environment=prod"
   ```

2. Retrieve auth token:
   ```bash
   aws secretsmanager get-secret-value \
     --secret-id autolytiq/prod/redis \
     --query SecretString --output text | jq -r .password
   ```

---

## Resend Email Service

### Purpose

- Transactional email delivery
- Email template rendering
- Delivery tracking and analytics
- Bounce/complaint handling

### Setup Steps

1. Create account at https://resend.com
2. Verify your domain:
   - Add DNS records (SPF, DKIM, DMARC)
   - Wait for verification (usually < 24 hours)
3. Generate API key

**DNS Records Required:**

```
TXT  _dmarc.yourdomain.com     "v=DMARC1; p=quarantine"
TXT  yourdomain.com            "v=spf1 include:_spf.resend.com ~all"
CNAME resend._domainkey        [provided by Resend]
```

**Environment Variables:**

```bash
RESEND_API_KEY=re_xxxxxxxxxx
RESEND_FROM_EMAIL=notifications@yourdomain.com
RESEND_FROM_NAME=Autolytiq
```

**Usage in Code:**

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: process.env.RESEND_FROM_EMAIL,
  to: customer.email,
  subject: 'Your deal is ready',
  html: renderedTemplate,
});
```

**Alternative: SMTP Configuration**
For environments where API access is restricted:

```bash
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USERNAME=resend
SMTP_PASSWORD=re_xxxxxxxxxx
SMTP_SECURE=true
```

---

## AWS S3

### Purpose

- Vehicle images storage
- Document uploads (contracts, licenses)
- Export file storage
- Backup storage

### Setup Steps

1. Create S3 buckets via Terraform:

   ```bash
   terraform apply -target=module.s3
   ```

2. Configure CORS for direct uploads:
   ```json
   {
     "CORSRules": [
       {
         "AllowedOrigins": ["https://app.autolytiq.com"],
         "AllowedMethods": ["GET", "PUT", "POST"],
         "AllowedHeaders": ["*"],
         "ExposeHeaders": ["ETag"],
         "MaxAgeSeconds": 3600
       }
     ]
   }
   ```

**Bucket Structure:**

```
autolytiq-{env}-assets/
  vehicles/
    {dealership_id}/
      {vehicle_id}/
        images/
        documents/
  customers/
    {dealership_id}/
      {customer_id}/
        documents/
  exports/
    {dealership_id}/
```

**Environment Variables:**

```bash
AWS_S3_BUCKET=autolytiq-prod-assets
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
# Or use IAM roles (preferred in EKS)
```

**IAM Policy:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"],
      "Resource": ["arn:aws:s3:::autolytiq-prod-assets", "arn:aws:s3:::autolytiq-prod-assets/*"]
    }
  ]
}
```

---

## AWS EKS

### Purpose

- Kubernetes cluster management
- Container orchestration
- Auto-scaling
- Service discovery

### Cluster Requirements

**Minimum Specifications:**
| Environment | Node Type | Min Nodes | Max Nodes |
|------------|-----------|-----------|-----------|
| Dev | t3.medium | 1 | 5 |
| Staging | t3.medium | 2 | 8 |
| Production | t3.large | 3 | 15 |

**Add-ons Required:**

- CoreDNS
- kube-proxy
- VPC CNI
- AWS EBS CSI Driver
- AWS Load Balancer Controller
- External Secrets Operator

**Setup Steps:**

1. Apply Terraform EKS configuration:

   ```bash
   cd infrastructure/terraform
   terraform apply -var="environment=prod"
   ```

2. Update kubeconfig:

   ```bash
   aws eks update-kubeconfig \
     --region us-east-1 \
     --name autolytiq-prod
   ```

3. Verify cluster access:

   ```bash
   kubectl get nodes
   kubectl get namespaces
   ```

4. Deploy base infrastructure:
   ```bash
   kubectl apply -k infrastructure/k8s/base
   ```

**Environment Variables:**

```bash
# For CI/CD
AWS_REGION=us-east-1
EKS_CLUSTER_NAME=autolytiq-prod
KUBECONFIG=/path/to/kubeconfig
```

---

## AWS ECR

### Purpose

- Private container registry
- Image versioning
- Vulnerability scanning
- Cross-region replication

### Setup Steps

1. Create repositories via Terraform or manually:

   ```bash
   aws ecr create-repository \
     --repository-name autolytiq/api-gateway \
     --image-scanning-configuration scanOnPush=true
   ```

2. Login to ECR:

   ```bash
   aws ecr get-login-password --region us-east-1 | \
     docker login --username AWS --password-stdin \
     ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
   ```

3. Push images:
   ```bash
   docker tag autolytiq/api-gateway:latest \
     ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/autolytiq/api-gateway:latest
   docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/autolytiq/api-gateway:latest
   ```

**Repository Structure:**

```
autolytiq/api-gateway
autolytiq/auth-service
autolytiq/deal-service
autolytiq/customer-service
autolytiq/inventory-service
autolytiq/email-service
autolytiq/user-service
autolytiq/config-service
autolytiq/showroom-service
autolytiq/messaging-service
autolytiq/settings-service
```

**Lifecycle Policy:**

```json
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep last 30 images",
      "selection": {
        "tagStatus": "any",
        "countType": "imageCountMoreThan",
        "countNumber": 30
      },
      "action": {
        "type": "expire"
      }
    }
  ]
}
```

---

## AWS Secrets Manager

### Purpose

- Secure storage of credentials
- Automatic rotation
- Access auditing
- Integration with EKS via External Secrets

### Secret Structure

```
autolytiq/{env}/database
  - username
  - password
  - host
  - port
  - database
  - url

autolytiq/{env}/redis
  - host
  - port
  - password
  - url

autolytiq/{env}/jwt
  - secret
  - issuer

autolytiq/{env}/resend
  - api_key
  - from_email

autolytiq/{env}/pii-encryption
  - key
  - key_version
```

### Setup Steps

1. Create secrets via Terraform (automatic with infrastructure)

2. Manual secret creation:

   ```bash
   aws secretsmanager create-secret \
     --name autolytiq/prod/jwt \
     --secret-string '{"secret":"your-jwt-secret","issuer":"autolytiq"}'
   ```

3. Configure External Secrets Operator:
   ```yaml
   apiVersion: external-secrets.io/v1beta1
   kind: ExternalSecret
   metadata:
     name: autolytiq-secrets
   spec:
     refreshInterval: 1h
     secretStoreRef:
       name: aws-secrets-manager
       kind: ClusterSecretStore
     target:
       name: autolytiq-secrets
     data:
       - secretKey: DATABASE_URL
         remoteRef:
           key: autolytiq/prod/database
           property: url
   ```

---

## Cost Estimates

### Monthly Cost Breakdown (Production)

| Service           | Configuration              | Est. Monthly Cost |
| ----------------- | -------------------------- | ----------------- |
| Aurora PostgreSQL | Serverless v2, 2-16 ACUs   | $150 - $800       |
| ElastiCache Redis | 3x cache.r5.large          | $450              |
| EKS               | Cluster + 5 t3.large nodes | $250              |
| ALB               | Application Load Balancer  | $25 + data        |
| ECR               | 50GB storage               | $5                |
| Secrets Manager   | 10 secrets                 | $4                |
| S3                | 100GB + requests           | $5 - $20          |
| Resend            | 50k emails                 | $20               |
| **Total**         |                            | **$900 - $1,600** |

### Staging Environment

Approximately 40% of production costs: **$400 - $700/month**

### Development Environment

Approximately 20% of production costs: **$200 - $400/month**

---

## Environment Variable Reference

### Complete List

```bash
# ===========================================
# DATABASE
# ===========================================
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
DATABASE_POOL_URL=postgresql://user:pass@pooler:5432/db?sslmode=require
DB_POOL_SIZE=25
DB_SSL_MODE=require

# ===========================================
# REDIS
# ===========================================
REDIS_URL=rediss://:password@host:6379
REDIS_PASSWORD=auth-token
REDIS_TLS_ENABLED=true
REDIS_DB=0

# ===========================================
# JWT
# ===========================================
JWT_SECRET=minimum-32-character-secret-key
JWT_ISSUER=autolytiq
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d

# ===========================================
# EMAIL (RESEND)
# ===========================================
RESEND_API_KEY=re_xxxxxxxxxx
RESEND_FROM_EMAIL=notifications@yourdomain.com
RESEND_FROM_NAME=Autolytiq

# ===========================================
# AWS
# ===========================================
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=autolytiq-prod-assets

# ===========================================
# SERVICE URLs (Internal)
# ===========================================
AUTH_SERVICE_URL=http://auth-service:8087
DEAL_SERVICE_URL=http://deal-service:8081
CUSTOMER_SERVICE_URL=http://customer-service:8082
INVENTORY_SERVICE_URL=http://inventory-service:8083
EMAIL_SERVICE_URL=http://email-service:8084
USER_SERVICE_URL=http://user-service:8085
CONFIG_SERVICE_URL=http://config-service:8086
SHOWROOM_SERVICE_URL=http://showroom-service:8088
MESSAGING_SERVICE_URL=http://messaging-service:8089
SETTINGS_SERVICE_URL=http://settings-service:8090

# ===========================================
# RATE LIMITING
# ===========================================
RATE_LIMIT_ENABLED=true
RATE_LIMIT_IP=100
RATE_LIMIT_USER=1000
RATE_LIMIT_DEALERSHIP=5000
RATE_LIMIT_WINDOW_SECONDS=60

# ===========================================
# MONITORING
# ===========================================
LOG_LEVEL=info
LOG_FORMAT=json
SENTRY_DSN=https://xxx@sentry.io/xxx

# ===========================================
# PII ENCRYPTION
# ===========================================
PII_ENCRYPTION_KEY=64-hex-character-key
PII_ENCRYPTION_KEY_VERSION=v1
```

---

## Troubleshooting

### Database Connection Issues

1. Check security group allows port 5432 from EKS
2. Verify SSL mode is set correctly
3. Check credentials in Secrets Manager
4. Test connectivity:
   ```bash
   kubectl run pg-test --rm -it --image=postgres:15 -- \
     psql "$DATABASE_URL" -c "SELECT 1"
   ```

### Redis Connection Issues

1. Verify TLS is enabled/disabled correctly
2. Check auth token is correct
3. Test connectivity:
   ```bash
   kubectl run redis-test --rm -it --image=redis:7 -- \
     redis-cli -h $REDIS_HOST -p 6379 --tls -a $REDIS_PASSWORD PING
   ```

### Email Delivery Issues

1. Verify domain DNS records
2. Check API key is valid
3. Review Resend dashboard for bounces
4. Test API:
   ```bash
   curl -X POST https://api.resend.com/emails \
     -H "Authorization: Bearer $RESEND_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"from":"test@yourdomain.com","to":"test@example.com","subject":"Test","text":"Hello"}'
   ```

---

## Security Considerations

1. **Never commit secrets to git** - Use environment variables or Secrets Manager
2. **Rotate credentials regularly** - Set up automatic rotation where possible
3. **Use TLS everywhere** - Database, Redis, and all external APIs
4. **Least privilege access** - IAM roles should have minimal permissions
5. **Encrypt at rest** - Enable encryption for databases, S3, and ElastiCache
6. **Audit access** - Enable CloudTrail and access logging

---

## Next Steps

1. Review [Environment Templates](../infrastructure/env/)
2. Run [External Services Check](../scripts/check-external-services.sh)
3. Set up monitoring with Prometheus/Grafana
4. Configure alerting for service health
