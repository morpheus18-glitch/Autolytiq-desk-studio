# Autolytiq AWS Infrastructure Documentation

**Last Updated:** November 26, 2025
**Environment:** Production
**Region:** us-east-1 (Primary), us-west-2 (DR)

---

## Table of Contents

1. [Account Information](#account-information)
2. [Infrastructure Overview](#infrastructure-overview)
3. [EKS Cluster](#eks-cluster)
4. [Database (RDS Aurora PostgreSQL)](#database-rds-aurora-postgresql)
5. [Cache (ElastiCache Redis)](#cache-elasticache-redis)
6. [VPC & Networking](#vpc--networking)
7. [Secrets Management](#secrets-management)
8. [IAM Roles](#iam-roles)
9. [Backup & Disaster Recovery](#backup--disaster-recovery)
10. [Monitoring & Alerts](#monitoring--alerts)
11. [Quick Reference](#quick-reference)

---

## Account Information

| Property                   | Value                            |
| -------------------------- | -------------------------------- |
| **AWS Account ID**         | `730335214557`                   |
| **Primary Region**         | `us-east-1`                      |
| **DR Region**              | `us-west-2`                      |
| **Resource Tag**           | `AQ=true`                        |
| **Terraform State Bucket** | `autolytiq-terraform-state-prod` |
| **Terraform Lock Table**   | `autolytiq-terraform-locks`      |

---

## Infrastructure Overview

```
                    ┌─────────────────────────────────────────────────────────────┐
                    │                     AWS Account: 730335214557                │
                    │                        Region: us-east-1                     │
                    │                                                              │
                    │  ┌─────────────────────────────────────────────────────────┐ │
                    │  │                  VPC: 10.0.0.0/16                       │ │
                    │  │                                                          │ │
                    │  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │ │
                    │  │  │   AZ: 1a     │ │   AZ: 1b     │ │   AZ: 1c     │     │ │
                    │  │  │              │ │              │ │              │     │ │
                    │  │  │ Public       │ │ Public       │ │ Public       │     │ │
                    │  │  │ 10.0.48.0/24 │ │ 10.0.49.0/24 │ │ 10.0.50.0/24 │     │ │
                    │  │  │              │ │              │ │              │     │ │
                    │  │  │ Private      │ │ Private      │ │ Private      │     │ │
                    │  │  │ 10.0.0.0/20  │ │ 10.0.16.0/20 │ │ 10.0.32.0/20 │     │ │
                    │  │  └──────────────┘ └──────────────┘ └──────────────┘     │ │
                    │  │                                                          │ │
                    │  │  ┌─────────────────────────────────────────────────────┐ │ │
                    │  │  │              EKS: autolytiq-prod                     │ │ │
                    │  │  │         7 Nodes (5 general + 2 database)            │ │ │
                    │  │  └─────────────────────────────────────────────────────┘ │ │
                    │  │                                                          │ │
                    │  │  ┌────────────────────┐  ┌────────────────────┐         │ │
                    │  │  │  RDS Aurora PG     │  │  ElastiCache Redis │         │ │
                    │  │  │  (2 instances)     │  │  (3 nodes)         │         │ │
                    │  │  └────────────────────┘  └────────────────────┘         │ │
                    │  └─────────────────────────────────────────────────────────┘ │
                    └─────────────────────────────────────────────────────────────┘
```

**Total Resources Managed:** 263 Terraform resources

---

## EKS Cluster

### Cluster Details

| Property               | Value                                                                          |
| ---------------------- | ------------------------------------------------------------------------------ |
| **Cluster Name**       | `autolytiq-prod`                                                               |
| **Status**             | `ACTIVE`                                                                       |
| **Kubernetes Version** | `1.28`                                                                         |
| **Endpoint**           | `https://D9FCF7549A2C4E10DA4A162357611163.gr7.us-east-1.eks.amazonaws.com`     |
| **OIDC Issuer**        | `https://oidc.eks.us-east-1.amazonaws.com/id/D9FCF7549A2C4E10DA4A162357611163` |
| **Service CIDR**       | `172.20.0.0/16`                                                                |
| **Security Group**     | `sg-0dd644481647c639b`                                                         |

### Node Groups

| Node Group           | Instance Types      | Capacity  | Size                      | Purpose               |
| -------------------- | ------------------- | --------- | ------------------------- | --------------------- |
| **general-workers**  | m5.large, m5a.large | ON_DEMAND | 5 nodes (min: 3, max: 10) | General workloads     |
| **database-workers** | r5.large, r5a.large | ON_DEMAND | 2 nodes (min: 2, max: 4)  | Database-related pods |

### Installed Add-ons

- CoreDNS (latest)
- kube-proxy (latest)
- VPC CNI (with prefix delegation)
- EBS CSI Driver

### Connecting to the Cluster

```bash
# Update kubeconfig
aws eks update-kubeconfig --name autolytiq-prod --region us-east-1

# Verify connection
kubectl get nodes

# Check cluster info
kubectl cluster-info
```

---

## Database (RDS Aurora PostgreSQL)

### Cluster Configuration

| Property                | Value               |
| ----------------------- | ------------------- |
| **Cluster Identifier**  | `autolytiq-prod`    |
| **Engine**              | `aurora-postgresql` |
| **Engine Version**      | `15.6`              |
| **Database Name**       | `autolytiq`         |
| **Port**                | `5432`              |
| **Storage Encryption**  | `Enabled (KMS)`     |
| **Deletion Protection** | `Enabled`           |

### Endpoints

| Type                 | Endpoint                                                             |
| -------------------- | -------------------------------------------------------------------- |
| **Writer (Primary)** | `autolytiq-prod.cluster-cj0mc26mutcf.us-east-1.rds.amazonaws.com`    |
| **Reader**           | `autolytiq-prod.cluster-ro-cj0mc26mutcf.us-east-1.rds.amazonaws.com` |

### Credentials

| Property           | Value                                                                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Username**       | `autolytiq_admin`                                                                                                                              |
| **Password**       | `MzWbvgV8oU8xrfDYBg8GqsyzjzvxwcHS`                                                                                                             |
| **Connection URL** | `postgresql://autolytiq_admin:MzWbvgV8oU8xrfDYBg8GqsyzjzvxwcHS@autolytiq-prod.cluster-cj0mc26mutcf.us-east-1.rds.amazonaws.com:5432/autolytiq` |

### Serverless v2 Scaling

| Property    | Value |
| ----------- | ----- |
| **Min ACU** | 2     |
| **Max ACU** | 16    |

### Backup Configuration

| Property               | Value                  |
| ---------------------- | ---------------------- |
| **Retention Period**   | 35 days                |
| **Backup Window**      | 03:00-04:00 UTC        |
| **Maintenance Window** | Sunday 04:00-05:00 UTC |

### Connecting to Database

```bash
# Via psql (requires network access)
psql "postgresql://autolytiq_admin:MzWbvgV8oU8xrfDYBg8GqsyzjzvxwcHS@autolytiq-prod.cluster-cj0mc26mutcf.us-east-1.rds.amazonaws.com:5432/autolytiq"

# Via kubectl port-forward (from within cluster)
kubectl run pg-client --rm -it --image=postgres:15 -- psql "postgresql://autolytiq_admin:MzWbvgV8oU8xrfDYBg8GqsyzjzvxwcHS@autolytiq-prod.cluster-cj0mc26mutcf.us-east-1.rds.amazonaws.com:5432/autolytiq"
```

---

## Cache (ElastiCache Redis)

### Cluster Configuration

| Property                 | Value                      |
| ------------------------ | -------------------------- |
| **Replication Group ID** | `autolytiq-prod`           |
| **Status**               | `available`                |
| **Engine**               | `Redis 7`                  |
| **Cluster Mode**         | `Disabled`                 |
| **Node Type**            | `cache.r6g.large`          |
| **Nodes**                | 3 (1 primary + 2 replicas) |
| **Transit Encryption**   | `Enabled (TLS)`            |
| **At-Rest Encryption**   | `Enabled`                  |
| **Automatic Failover**   | `Enabled`                  |

### Endpoints

| Type        | Endpoint                                                 | Port |
| ----------- | -------------------------------------------------------- | ---- |
| **Primary** | `master.autolytiq-prod.4lnrd7.use1.cache.amazonaws.com`  | 6379 |
| **Reader**  | `replica.autolytiq-prod.4lnrd7.use1.cache.amazonaws.com` | 6379 |

### Credentials

| Property           | Value                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| **AUTH Token**     | `8NlGkRQzQnHNa5p0sGvSblKDm9zlSxDp`                                                                      |
| **Connection URL** | `rediss://:8NlGkRQzQnHNa5p0sGvSblKDm9zlSxDp@master.autolytiq-prod.4lnrd7.use1.cache.amazonaws.com:6379` |

### Connecting to Redis

```bash
# Via redis-cli (requires TLS)
redis-cli -h master.autolytiq-prod.4lnrd7.use1.cache.amazonaws.com -p 6379 --tls -a '8NlGkRQzQnHNa5p0sGvSblKDm9zlSxDp'

# Via kubectl (from within cluster)
kubectl run redis-client --rm -it --image=redis:7 -- redis-cli -h master.autolytiq-prod.4lnrd7.use1.cache.amazonaws.com -p 6379 --tls -a '8NlGkRQzQnHNa5p0sGvSblKDm9zlSxDp'
```

---

## VPC & Networking

### VPC Configuration

| Property               | Value                              |
| ---------------------- | ---------------------------------- |
| **VPC ID**             | `vpc-0a19586c2958cfb24`            |
| **CIDR Block**         | `10.0.0.0/16`                      |
| **Availability Zones** | us-east-1a, us-east-1b, us-east-1c |

### Subnets

#### Public Subnets

| Subnet ID                | CIDR         | AZ         |
| ------------------------ | ------------ | ---------- |
| subnet-02e3e987701032997 | 10.0.48.0/24 | us-east-1a |
| subnet-0beec98baae4e288d | 10.0.49.0/24 | us-east-1b |
| subnet-0789b72f6fec25a87 | 10.0.50.0/24 | us-east-1c |

#### Private Subnets (EKS, RDS, Redis)

| Subnet ID                | CIDR         | AZ         |
| ------------------------ | ------------ | ---------- |
| subnet-06d8ecf9fff580bef | 10.0.0.0/20  | us-east-1a |
| subnet-0992ba7f5f613cb9a | 10.0.16.0/20 | us-east-1b |
| subnet-05d8950cae7e7fdeb | 10.0.32.0/20 | us-east-1c |

#### Intra Subnets (Internal only)

| Subnet ID                | CIDR         | AZ         |
| ------------------------ | ------------ | ---------- |
| subnet-0661854c81a9dbc53 | 10.0.52.0/24 | us-east-1a |
| subnet-01e03a50256b36fbb | 10.0.53.0/24 | us-east-1b |
| subnet-0fdafd84d2b1d179f | 10.0.54.0/24 | us-east-1c |

### Security Groups

| Name          | ID                   | Purpose               |
| ------------- | -------------------- | --------------------- |
| EKS Cluster   | sg-0dd644481647c639b | EKS control plane     |
| EKS Nodes     | sg-0c9b71cf65cd0685a | Worker nodes          |
| RDS           | sg-0a2f71b65af937bfa | PostgreSQL access     |
| Redis         | sg-038f43c883ddcf5b7 | Redis access          |
| VPC Endpoints | sg-05a29fb3ce321d7c7 | AWS service endpoints |

### VPC Endpoints

- S3 Gateway Endpoint
- ECR API Interface Endpoint
- ECR DKR Interface Endpoint
- STS Interface Endpoint

---

## Secrets Management

All secrets are stored in AWS Secrets Manager with automatic rotation enabled where applicable.

### Database Credentials

| Secret ARN | `arn:aws:secretsmanager:us-east-1:730335214557:secret:autolytiq/prod/database-emKun5` |
| ---------- | ------------------------------------------------------------------------------------- |

```json
{
  "database": "autolytiq",
  "host": "autolytiq-prod.cluster-cj0mc26mutcf.us-east-1.rds.amazonaws.com",
  "password": "MzWbvgV8oU8xrfDYBg8GqsyzjzvxwcHS",
  "port": 5432,
  "url": "postgresql://autolytiq_admin:MzWbvgV8oU8xrfDYBg8GqsyzjzvxwcHS@autolytiq-prod.cluster-cj0mc26mutcf.us-east-1.rds.amazonaws.com:5432/autolytiq",
  "username": "autolytiq_admin"
}
```

### Redis Credentials

| Secret ARN | `arn:aws:secretsmanager:us-east-1:730335214557:secret:autolytiq/prod/redis-sIuLhM` |
| ---------- | ---------------------------------------------------------------------------------- |

```json
{
  "host": "master.autolytiq-prod.4lnrd7.use1.cache.amazonaws.com",
  "password": "8NlGkRQzQnHNa5p0sGvSblKDm9zlSxDp",
  "port": 6379,
  "url": "rediss://:8NlGkRQzQnHNa5p0sGvSblKDm9zlSxDp@master.autolytiq-prod.4lnrd7.use1.cache.amazonaws.com:6379"
}
```

### JWT Secret

| Secret ARN | `arn:aws:secretsmanager:us-east-1:730335214557:secret:autolytiq/prod/jwt-8OHz3O` |
| ---------- | -------------------------------------------------------------------------------- |

```json
{
  "issuer": "autolytiq",
  "secret": "T*Iq<yFOA_(HTHD6*p5({B97EqakzhLI00)xMXSml*aW=7_kS*OSOp-v47f?+d2H"
}
```

### Session Secret

| Secret ARN | `arn:aws:secretsmanager:us-east-1:730335214557:secret:autolytiq/prod/session-cQ0qjO` |
| ---------- | ------------------------------------------------------------------------------------ |

```json
{
  "secret": "2zcHA6H7Wp=hnZtXNgoiaWs#REOJsozGE%V!r=]Y<[EQO-u9NwPby6a[M_Cs)Z&!"
}
```

### PII Encryption Key

| Secret ARN | `arn:aws:secretsmanager:us-east-1:730335214557:secret:autolytiq/prod/pii-encryption-sSex7P` |
| ---------- | ------------------------------------------------------------------------------------------- |

```json
{
  "algorithm": "AES-256-GCM",
  "key": "f8d0d67bba5785d4320bf0819cc4033ec49dd427a846d53b5e65618db147742a",
  "key_size_bytes": 32,
  "version": "v1"
}
```

### Other Secrets (Placeholders)

| Secret        | ARN                                                                                        | Purpose              |
| ------------- | ------------------------------------------------------------------------------------------ | -------------------- |
| External APIs | `arn:aws:secretsmanager:us-east-1:730335214557:secret:autolytiq/prod/external-apis-qmHIV6` | Third-party API keys |
| SMTP          | `arn:aws:secretsmanager:us-east-1:730335214557:secret:autolytiq/prod/smtp-oQVGQP`          | Email credentials    |
| Resend        | `arn:aws:secretsmanager:us-east-1:730335214557:secret:autolytiq/prod/resend-bsqYl8`        | Resend API key       |

---

## IAM Roles

### EKS Service Account Roles (IRSA)

| Role             | ARN                                                              | Purpose                |
| ---------------- | ---------------------------------------------------------------- | ---------------------- |
| External Secrets | `arn:aws:iam::730335214557:role/autolytiq-prod-external-secrets` | Access Secrets Manager |
| ALB Controller   | `arn:aws:iam::730335214557:role/autolytiq-prod-alb-controller`   | Manage ALB/NLB         |
| EBS CSI          | `arn:aws:iam::730335214557:role/autolytiq-prod-ebs-csi`          | EBS volume management  |
| VPC CNI          | `arn:aws:iam::730335214557:role/autolytiq-prod-vpc-cni`          | VPC networking         |
| Secrets Access   | `arn:aws:iam::730335214557:role/autolytiq-prod-secrets-access`   | Application secrets    |

### Backup & Operations Roles

| Role                    | ARN                                                                     | Purpose                  |
| ----------------------- | ----------------------------------------------------------------------- | ------------------------ |
| Backup Operator         | `arn:aws:iam::730335214557:role/autolytiq-prod-backup-operator`         | AWS Backup operations    |
| Backup Replication      | `arn:aws:iam::730335214557:role/autolytiq-prod-backup-replication`      | Cross-region replication |
| Rotation Lambda         | `arn:aws:iam::730335214557:role/autolytiq-prod-rotation-lambda`         | Secret rotation          |
| Pre-deployment Snapshot | `arn:aws:iam::730335214557:role/autolytiq-prod-pre-deployment-snapshot` | Pre-deploy DB snapshots  |

---

## Backup & Disaster Recovery

### AWS Backup Vaults

| Vault   | ARN                                                                          | Region    |
| ------- | ---------------------------------------------------------------------------- | --------- |
| Primary | `arn:aws:backup:us-east-1:730335214557:backup-vault:autolytiq-prod-vault`    | us-east-1 |
| DR      | `arn:aws:backup:us-west-2:730335214557:backup-vault:autolytiq-prod-dr-vault` | us-west-2 |

### Backup Plans

| Schedule | Retention | Description                                |
| -------- | --------- | ------------------------------------------ |
| Hourly   | 24 hours  | Continuous backup (point-in-time recovery) |
| Daily    | 35 days   | Daily snapshots                            |
| Weekly   | 90 days   | Weekly snapshots                           |
| Monthly  | 365 days  | Monthly snapshots                          |

### S3 Backup Buckets

| Bucket                                | Region    | Purpose                  |
| ------------------------------------- | --------- | ------------------------ |
| `autolytiq-prod-backups-730335214557` | us-east-1 | Primary backups          |
| `autolytiq-prod-dr-730335214557`      | us-west-2 | Cross-region replication |

### KMS Keys

| Key               | ARN                                                                           | Purpose         |
| ----------------- | ----------------------------------------------------------------------------- | --------------- |
| Backup Encryption | `arn:aws:kms:us-east-1:730335214557:key/5a10710e-0161-48b0-bc5a-a4f1fa6cc7f1` | Encrypt backups |

### Pre-deployment Snapshot Lambda

| Property          | Value                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------- |
| **Function Name** | `autolytiq-prod-pre-deployment-snapshot`                                                |
| **ARN**           | `arn:aws:lambda:us-east-1:730335214557:function:autolytiq-prod-pre-deployment-snapshot` |
| **Purpose**       | Create RDS snapshot before deployments                                                  |

---

## Monitoring & Alerts

### CloudWatch Alarms

| Alarm                               | Purpose                    |
| ----------------------------------- | -------------------------- |
| `autolytiq-prod-backup-job-failed`  | Backup job failures        |
| `autolytiq-prod-backup-copy-failed` | Cross-region copy failures |

### SNS Topic

| Topic         | ARN                                                               |
| ------------- | ----------------------------------------------------------------- |
| Backup Alerts | `arn:aws:sns:us-east-1:730335214557:autolytiq-prod-backup-alerts` |

### CloudWatch Log Groups

| Log Group                                    | Purpose                |
| -------------------------------------------- | ---------------------- |
| `/aws/eks/autolytiq-prod/cluster`            | EKS control plane logs |
| `/aws/vpc-flow-log/vpc-0a19586c2958cfb24`    | VPC flow logs          |
| `/aws/rds/cluster/autolytiq-prod/postgresql` | RDS PostgreSQL logs    |

---

## Quick Reference

### Connection Strings

```bash
# PostgreSQL
DATABASE_URL="postgresql://autolytiq_admin:MzWbvgV8oU8xrfDYBg8GqsyzjzvxwcHS@autolytiq-prod.cluster-cj0mc26mutcf.us-east-1.rds.amazonaws.com:5432/autolytiq"

# Redis (TLS)
REDIS_URL="rediss://:8NlGkRQzQnHNa5p0sGvSblKDm9zlSxDp@master.autolytiq-prod.4lnrd7.use1.cache.amazonaws.com:6379"

# EKS
KUBECONFIG_CONTEXT="arn:aws:eks:us-east-1:730335214557:cluster/autolytiq-prod"
```

### AWS CLI Commands

```bash
# Update kubeconfig
aws eks update-kubeconfig --name autolytiq-prod --region us-east-1

# Get database credentials
aws secretsmanager get-secret-value --secret-id autolytiq/prod/database --query SecretString --output text | jq .

# Get Redis credentials
aws secretsmanager get-secret-value --secret-id autolytiq/prod/redis --query SecretString --output text | jq .

# Trigger pre-deployment snapshot
aws lambda invoke --function-name autolytiq-prod-pre-deployment-snapshot --payload '{}' /dev/stdout

# List recent backups
aws backup list-recovery-points-by-backup-vault --backup-vault-name autolytiq-prod-vault
```

### kubectl Commands

```bash
# Get nodes
kubectl get nodes -o wide

# Get all pods
kubectl get pods -A

# Check cluster health
kubectl get componentstatuses

# View EKS add-ons
kubectl get pods -n kube-system
```

---

## Security Notes

1. All credentials in this document are stored in AWS Secrets Manager with encryption at rest
2. Database password rotation is configured via Lambda
3. All data in transit is encrypted (TLS for Redis, SSL for PostgreSQL)
4. All data at rest is encrypted (KMS for RDS, S3, EBS)
5. VPC endpoints ensure traffic stays within AWS network
6. Network access is restricted by security groups

---

## Support

For infrastructure issues, contact the DevOps team or check:

- AWS Console: https://console.aws.amazon.com
- Terraform State: `s3://autolytiq-terraform-state-prod/infrastructure/terraform.tfstate`
- Infrastructure Code: `/infrastructure/terraform/`
