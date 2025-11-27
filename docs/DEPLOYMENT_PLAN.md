# Autolytiq Desk Studio Production Deployment Plan

This document provides a comprehensive, step-by-step guide to deploy the Autolytiq Desk Studio application to production on AWS EKS.

**Total Estimated Time:** 4-6 hours (first-time setup)
**Total Estimated Monthly Cost:** $800-$1,500/month (production environment)

---

## Table of Contents

1. [Phase 1: Prerequisites & AWS Setup](#phase-1-prerequisites--aws-setup)
2. [Phase 2: Infrastructure Provisioning](#phase-2-infrastructure-provisioning)
3. [Phase 3: External Services Setup](#phase-3-external-services-setup)
4. [Phase 4: CI/CD & Container Registry](#phase-4-cicd--container-registry)
5. [Phase 5: Kubernetes Deployment](#phase-5-kubernetes-deployment)
6. [Phase 6: DNS & SSL](#phase-6-dns--ssl)
7. [Phase 7: Monitoring & Observability](#phase-7-monitoring--observability)
8. [Phase 8: Verification & Go-Live](#phase-8-verification--go-live)
9. [Cost Breakdown](#cost-breakdown)
10. [Rollback Procedures](#rollback-procedures)

---

## Phase 1: Prerequisites & AWS Setup

**Estimated Time:** 30-60 minutes

### 1.1 AWS Account Requirements

#### Create or Configure AWS Account

```bash
# Verify AWS CLI is installed
aws --version

# Configure AWS credentials (if not already done)
aws configure
# Enter:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region: us-east-1
# - Default output format: json

# Verify credentials
aws sts get-caller-identity
```

#### Required IAM Permissions

Create an IAM user or role with the following policies attached:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "eks:*",
        "ec2:*",
        "rds:*",
        "elasticache:*",
        "s3:*",
        "ecr:*",
        "iam:*",
        "secretsmanager:*",
        "kms:*",
        "cloudwatch:*",
        "logs:*",
        "sns:*",
        "acm:*",
        "route53:*",
        "elasticloadbalancing:*",
        "autoscaling:*",
        "backup:*",
        "lambda:*",
        "dynamodb:*"
      ],
      "Resource": "*"
    }
  ]
}
```

**Recommended:** Use AWS Organizations with a dedicated production account.

### 1.2 Required Tools Installation

```bash
# Install Terraform (1.5.0+)
brew install terraform
# or
wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
unzip terraform_1.6.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# Verify
terraform version

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# Install eksctl
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin/

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install Kustomize
curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
sudo mv kustomize /usr/local/bin/

# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Verify all tools
terraform version
kubectl version --client
eksctl version
helm version
kustomize version
aws --version
```

### 1.3 Domain Name Configuration

#### Option A: Use Route 53 (Recommended)

```bash
# Register domain or transfer existing domain to Route 53
# This can be done via AWS Console: Route 53 > Registered domains

# Create a hosted zone (if transferring from external registrar)
aws route53 create-hosted-zone \
  --name autolytiq.com \
  --caller-reference $(date +%s)

# Note the nameservers from output and update at your registrar
```

#### Option B: External DNS Provider

If using an external DNS provider (Cloudflare, GoDaddy, etc.):

1. Note down nameservers after EKS deployment
2. Create appropriate CNAME records pointing to ALB

### 1.4 Request SSL/TLS Certificates

```bash
# Request certificate for API domain
aws acm request-certificate \
  --domain-name api.autolytiq.com \
  --subject-alternative-names "*.autolytiq.com" \
  --validation-method DNS \
  --region us-east-1

# Note the CertificateArn from output
# Example: arn:aws:acm:us-east-1:123456789012:certificate/abc123...

# Get DNS validation records
aws acm describe-certificate \
  --certificate-arn <CERTIFICATE_ARN> \
  --query 'Certificate.DomainValidationOptions'

# Add the CNAME records to your DNS for validation
# Wait for validation (can take 5-30 minutes)
aws acm wait certificate-validated \
  --certificate-arn <CERTIFICATE_ARN>
```

### 1.5 Create Terraform State Backend

```bash
# Create S3 bucket for Terraform state
aws s3api create-bucket \
  --bucket autolytiq-terraform-state \
  --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket autolytiq-terraform-state \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket autolytiq-terraform-state \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        }
      }
    ]
  }'

# Block public access
aws s3api put-public-access-block \
  --bucket autolytiq-terraform-state \
  --public-access-block-configuration '{
    "BlockPublicAcls": true,
    "IgnorePublicAcls": true,
    "BlockPublicPolicy": true,
    "RestrictPublicBuckets": true
  }'

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name autolytiq-terraform-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### 1.6 Environment Variables Setup

Create a file `~/.autolytiq-env` with required variables:

```bash
# AWS Configuration
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Domain Configuration
export DOMAIN_NAME=autolytiq.com
export API_DOMAIN=api.autolytiq.com

# Certificate ARN (from step 1.4)
export ACM_CERTIFICATE_ARN=arn:aws:acm:us-east-1:${AWS_ACCOUNT_ID}:certificate/<your-cert-id>

# Cluster Configuration
export EKS_CLUSTER_NAME=autolytiq-prod
export ENVIRONMENT=prod

# ECR Registry
export ECR_REGISTRY=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Source this file before running commands
source ~/.autolytiq-env
```

---

## Phase 2: Infrastructure Provisioning

**Estimated Time:** 45-90 minutes

### 2.1 Initialize Terraform

```bash
cd infrastructure/terraform/environments/prod

# Initialize Terraform
terraform init

# Expected output:
# Terraform has been successfully initialized!
```

### 2.2 Review and Customize Variables

Create `terraform.tfvars` in the prod environment directory:

```hcl
# infrastructure/terraform/environments/prod/terraform.tfvars

aws_region  = "us-east-1"
environment = "prod"
domain_name = "autolytiq.com"

# Disaster Recovery
dr_region = "us-west-2"

# Backup Configuration
backup_retention_days = 35
alert_email = "ops@autolytiq.com"

# Node Sizing (adjust based on expected load)
eks_node_instance_types = {
  general  = ["t3.large", "t3.xlarge"]
  database = ["r5.large", "r5.xlarge"]
}

eks_node_desired_size = {
  prod = 5
}

eks_node_min_size = {
  prod = 3
}

eks_node_max_size = {
  prod = 15
}

# Database Sizing
db_instance_class = {
  prod = "db.r5.large"
}

# Redis Sizing
redis_node_type = {
  prod = "cache.r5.large"
}
```

### 2.3 Plan Infrastructure

```bash
# Generate and review execution plan
terraform plan -var-file=terraform.tfvars -out=tfplan

# Review the plan carefully
# Expected resources to be created:
# - VPC with public/private subnets across 3 AZs
# - NAT Gateways (3 for HA in prod)
# - EKS Cluster with 2 node groups
# - Aurora PostgreSQL Serverless v2 cluster
# - ElastiCache Redis cluster (3 nodes with failover)
# - S3 buckets for backups
# - Secrets Manager secrets
# - IAM roles and policies
# - KMS keys for encryption
# - CloudWatch log groups
# - SNS topics for alerts
```

### 2.4 Apply Infrastructure (Order Matters)

**Step 1: Core Infrastructure (VPC, EKS, IAM)**

```bash
# Apply full infrastructure
terraform apply tfplan

# This will take 20-35 minutes
# EKS cluster creation is the longest step (~15-20 min)
```

### 2.5 Configure kubectl

```bash
# Update kubeconfig
aws eks update-kubeconfig \
  --name autolytiq-prod \
  --region us-east-1

# Verify connection
kubectl cluster-info
kubectl get nodes

# Expected output:
# NAME                                          STATUS   ROLES    AGE   VERSION
# ip-10-0-1-xxx.ec2.internal                   Ready    <none>   5m    v1.28.x
# ip-10-0-2-xxx.ec2.internal                   Ready    <none>   5m    v1.28.x
# ...
```

### 2.6 Capture Terraform Outputs

```bash
# Save all outputs for later use
terraform output -json > terraform-outputs.json

# Key outputs to note:
terraform output eks_cluster_endpoint
terraform output rds_cluster_endpoint
terraform output redis_endpoint
terraform output alb_controller_role_arn
terraform output external_secrets_role_arn
terraform output db_secret_arn
terraform output redis_secret_arn
```

### 2.7 Verify Infrastructure

```bash
# Check EKS cluster
aws eks describe-cluster --name autolytiq-prod --query 'cluster.status'
# Expected: "ACTIVE"

# Check RDS cluster
aws rds describe-db-clusters \
  --db-cluster-identifier autolytiq-prod \
  --query 'DBClusters[0].Status'
# Expected: "available"

# Check ElastiCache
aws elasticache describe-replication-groups \
  --replication-group-id autolytiq-prod \
  --query 'ReplicationGroups[0].Status'
# Expected: "available"

# Check node groups
aws eks list-nodegroups --cluster-name autolytiq-prod
kubectl get nodes -o wide
```

---

## Phase 3: External Services Setup

**Estimated Time:** 30-45 minutes

### 3.1 Database Configuration

The Aurora PostgreSQL Serverless v2 cluster is automatically created by Terraform.

#### Verify Database Connectivity

```bash
# Get database credentials from Secrets Manager
aws secretsmanager get-secret-value \
  --secret-id autolytiq/prod/database \
  --query 'SecretString' \
  --output text | jq

# Test connection from a pod (optional)
kubectl run psql-test --rm -it --image=postgres:15 -- \
  psql "postgresql://<username>:<password>@<rds-endpoint>:5432/autolytiq"

# Run initial schema setup (if not using auto-migrations)
# This would typically be done via your migration tool
```

#### Database Connection Details

| Parameter     | Value                                          |
| ------------- | ---------------------------------------------- |
| Engine        | Aurora PostgreSQL 15.4                         |
| Endpoint      | From Terraform output: `rds_cluster_endpoint`  |
| Port          | 5432                                           |
| Database Name | autolytiq                                      |
| Credentials   | AWS Secrets Manager: `autolytiq/prod/database` |

### 3.2 Redis/ElastiCache Configuration

ElastiCache Redis is provisioned automatically by Terraform with:

- Redis 7.0
- TLS enabled
- AUTH token for authentication
- Multi-AZ with automatic failover (prod)

#### Verify Redis Connectivity

```bash
# Get Redis credentials
aws secretsmanager get-secret-value \
  --secret-id autolytiq/prod/redis \
  --query 'SecretString' \
  --output text | jq

# Redis endpoint format (TLS enabled):
# rediss://:${PASSWORD}@${PRIMARY_ENDPOINT}:6379
```

### 3.3 Configure Email Service (Resend)

#### Create Resend Account and API Key

1. Go to [resend.com](https://resend.com) and create an account
2. Navigate to API Keys section
3. Create a new API key with appropriate permissions
4. Note down the API key

#### Update AWS Secrets Manager

```bash
# Update Resend API key in Secrets Manager
aws secretsmanager update-secret \
  --secret-id autolytiq/prod/resend \
  --secret-string '{
    "api_key": "re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  }'

# Verify domain in Resend
# Add DNS records provided by Resend for domain verification
```

### 3.4 Configure Additional External APIs

Update the external APIs secret with any third-party service credentials:

```bash
aws secretsmanager update-secret \
  --secret-id autolytiq/prod/external-apis \
  --secret-string '{
    "sentry_dsn": "https://xxx@xxx.ingest.sentry.io/xxx",
    "datadog_api_key": "",
    "stripe_secret_key": "sk_live_xxxxx",
    "stripe_webhook_secret": "whsec_xxxxx"
  }'
```

### 3.5 Verify All Secrets

```bash
# List all secrets for this environment
aws secretsmanager list-secrets \
  --filter Key="name",Values="autolytiq/prod" \
  --query 'SecretList[*].Name'

# Expected secrets:
# - autolytiq/prod/database
# - autolytiq/prod/redis
# - autolytiq/prod/jwt
# - autolytiq/prod/pii-encryption
# - autolytiq/prod/session
# - autolytiq/prod/smtp
# - autolytiq/prod/resend
# - autolytiq/prod/external-apis
```

---

## Phase 4: CI/CD & Container Registry

**Estimated Time:** 30-45 minutes

### 4.1 Create ECR Repositories

```bash
# Create ECR repositories for each service
SERVICES=(
  "api-gateway"
  "auth-service"
  "deal-service"
  "customer-service"
  "inventory-service"
  "email-service"
  "user-service"
  "config-service"
  "messaging-service"
  "showroom-service"
  "settings-service"
  "data-retention-service"
)

for service in "${SERVICES[@]}"; do
  aws ecr create-repository \
    --repository-name autolytiq/$service \
    --image-scanning-configuration scanOnPush=true \
    --encryption-configuration encryptionType=AES256 \
    --region us-east-1

  # Set lifecycle policy to clean up old images
  aws ecr put-lifecycle-policy \
    --repository-name autolytiq/$service \
    --lifecycle-policy-text '{
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
    }'
done

# List created repositories
aws ecr describe-repositories --query 'repositories[*].repositoryName'
```

### 4.2 Configure GitHub Actions Secrets

Add the following secrets to your GitHub repository:

| Secret Name             | Description                    | How to Get                               |
| ----------------------- | ------------------------------ | ---------------------------------------- |
| `AWS_ACCESS_KEY_ID`     | AWS IAM access key             | Create IAM user with ECR/EKS permissions |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key             | From IAM user creation                   |
| `AWS_ACCOUNT_ID`        | AWS account number             | `aws sts get-caller-identity`            |
| `SLACK_WEBHOOK_URL`     | Slack notifications (optional) | Create Slack app webhook                 |

```bash
# Using GitHub CLI (gh)
gh secret set AWS_ACCESS_KEY_ID -b"AKIAXXXXXXXXXXXXXXXXXX"
gh secret set AWS_SECRET_ACCESS_KEY -b"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
gh secret set AWS_ACCOUNT_ID -b"123456789012"
gh secret set SLACK_WEBHOOK_URL -b"https://hooks.slack.com/services/xxx/xxx/xxx"
```

### 4.3 Create GitHub Environments

Create environments in GitHub repository settings:

1. **staging**
   - No required reviewers
   - Deployment branches: `main`

2. **prod**
   - Required reviewers: Add at least 1 reviewer
   - Deployment branches: Tags matching `v*`
   - Environment secrets (if different from repo secrets)

### 4.4 Initial Image Build and Push

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin ${ECR_REGISTRY}

# Build and push each service (for initial deployment)
for service in "${SERVICES[@]}"; do
  echo "Building $service..."

  cd services/$service

  # Build image
  docker build -t ${ECR_REGISTRY}/autolytiq/${service}:v1.0.0 .
  docker tag ${ECR_REGISTRY}/autolytiq/${service}:v1.0.0 \
    ${ECR_REGISTRY}/autolytiq/${service}:prod

  # Push image
  docker push ${ECR_REGISTRY}/autolytiq/${service}:v1.0.0
  docker push ${ECR_REGISTRY}/autolytiq/${service}:prod

  cd ../..
done

# Verify images
for service in "${SERVICES[@]}"; do
  aws ecr list-images \
    --repository-name autolytiq/$service \
    --query 'imageIds[*].imageTag'
done
```

### 4.5 Verify CI/CD Pipeline

```bash
# Trigger a test workflow
git tag -a v1.0.0 -m "Initial production release"
git push origin v1.0.0

# Monitor workflow in GitHub Actions
# The CD workflow should:
# 1. Build all service images
# 2. Push to ECR
# 3. Wait for prod environment approval
# 4. Deploy to EKS (after approval)
```

---

## Phase 5: Kubernetes Deployment

**Estimated Time:** 45-60 minutes

### 5.1 Install Core Kubernetes Components

#### Install AWS Load Balancer Controller

```bash
# Add Helm repo
helm repo add eks https://aws.github.io/eks-charts
helm repo update

# Get ALB controller role ARN from Terraform
ALB_ROLE_ARN=$(terraform output -raw alb_controller_role_arn)

# Install ALB Controller
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  --namespace kube-system \
  --set clusterName=autolytiq-prod \
  --set serviceAccount.create=true \
  --set serviceAccount.name=aws-load-balancer-controller \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"=${ALB_ROLE_ARN} \
  --set region=us-east-1 \
  --set vpcId=$(terraform output -raw vpc_id)

# Verify installation
kubectl get deployment -n kube-system aws-load-balancer-controller
```

#### Install External Secrets Operator

```bash
# Add Helm repo
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

# Get External Secrets role ARN
ES_ROLE_ARN=$(terraform output -raw external_secrets_role_arn)

# Install External Secrets
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets \
  --create-namespace \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"=${ES_ROLE_ARN}

# Verify
kubectl get pods -n external-secrets
```

### 5.2 Create Namespaces

```bash
# Apply namespace configurations
kubectl apply -f infrastructure/k8s/base/namespace.yaml

# Create prod namespace
kubectl create namespace autolytiq-prod

# Label namespaces for Istio injection (if using)
kubectl label namespace autolytiq-prod istio-injection=enabled
```

### 5.3 Configure External Secrets Store

```bash
# Apply ClusterSecretStore
kubectl apply -f infrastructure/k8s/external-secrets/cluster-secret-store.yaml

# Verify
kubectl get clustersecretstore
```

### 5.4 Deploy ExternalSecrets Resources

Create ExternalSecret resources for each secret:

```yaml
# infrastructure/k8s/external-secrets/overlays/prod/autolytiq-secrets.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: autolytiq-secrets
  namespace: autolytiq-prod
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager-prod
    kind: ClusterSecretStore
  target:
    name: autolytiq-secrets
    creationPolicy: Owner
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: autolytiq/prod/database
        property: url
    - secretKey: REDIS_URL
      remoteRef:
        key: autolytiq/prod/redis
        property: url
    - secretKey: JWT_SECRET
      remoteRef:
        key: autolytiq/prod/jwt
        property: secret
    - secretKey: PII_ENCRYPTION_KEY
      remoteRef:
        key: autolytiq/prod/pii-encryption
        property: key
    - secretKey: SESSION_SECRET
      remoteRef:
        key: autolytiq/prod/session
        property: secret
    - secretKey: RESEND_API_KEY
      remoteRef:
        key: autolytiq/prod/resend
        property: api_key
```

```bash
# Apply ExternalSecrets
kubectl apply -f infrastructure/k8s/external-secrets/overlays/prod/

# Verify secrets are synced
kubectl get externalsecrets -n autolytiq-prod
kubectl get secrets -n autolytiq-prod
```

### 5.5 Update Ingress Configuration

Update the ACM certificate ARN in the ingress:

```bash
# Edit ingress to include actual certificate ARN
export ACM_CERTIFICATE_ARN=$(aws acm list-certificates \
  --query 'CertificateSummaryList[?DomainName==`api.autolytiq.com`].CertificateArn' \
  --output text)

# Update the ingress yaml or use kustomize patch
cd infrastructure/k8s/overlays/prod

# Create patch for ingress
cat > ingress-patch.yaml << EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: autolytiq-ingress
  namespace: autolytiq-prod
  annotations:
    alb.ingress.kubernetes.io/certificate-arn: ${ACM_CERTIFICATE_ARN}
EOF
```

### 5.6 Deploy Application Services

```bash
# Navigate to prod overlay
cd infrastructure/k8s/overlays/prod

# Update image tags with ECR registry
kustomize edit set image \
  autolytiq/api-gateway=${ECR_REGISTRY}/autolytiq/api-gateway:prod \
  autolytiq/auth-service=${ECR_REGISTRY}/autolytiq/auth-service:prod \
  autolytiq/deal-service=${ECR_REGISTRY}/autolytiq/deal-service:prod \
  autolytiq/customer-service=${ECR_REGISTRY}/autolytiq/customer-service:prod \
  autolytiq/inventory-service=${ECR_REGISTRY}/autolytiq/inventory-service:prod \
  autolytiq/email-service=${ECR_REGISTRY}/autolytiq/email-service:prod \
  autolytiq/user-service=${ECR_REGISTRY}/autolytiq/user-service:prod \
  autolytiq/config-service=${ECR_REGISTRY}/autolytiq/config-service:prod

# Apply all manifests
kustomize build . | kubectl apply -f -

# Watch deployment progress
kubectl get pods -n autolytiq-prod -w

# Wait for all deployments to be ready
kubectl rollout status deployment/api-gateway -n autolytiq-prod --timeout=300s
kubectl rollout status deployment/auth-service -n autolytiq-prod --timeout=300s
kubectl rollout status deployment/deal-service -n autolytiq-prod --timeout=300s
kubectl rollout status deployment/customer-service -n autolytiq-prod --timeout=300s
kubectl rollout status deployment/inventory-service -n autolytiq-prod --timeout=300s
kubectl rollout status deployment/email-service -n autolytiq-prod --timeout=300s
kubectl rollout status deployment/user-service -n autolytiq-prod --timeout=300s
kubectl rollout status deployment/config-service -n autolytiq-prod --timeout=300s
```

### 5.7 Verify Services

```bash
# Check all pods are running
kubectl get pods -n autolytiq-prod

# Check services
kubectl get svc -n autolytiq-prod

# Check ingress and get ALB DNS name
kubectl get ingress -n autolytiq-prod

# The ALB DNS name will be shown in the ADDRESS column
# Example: k8s-autolytiq-xxxxx.us-east-1.elb.amazonaws.com
```

### 5.8 Database Migrations

```bash
# Run database migrations (if not auto-applied)
# Option 1: Using a migration job
kubectl apply -f - << EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration-$(date +%Y%m%d%H%M%S)
  namespace: autolytiq-prod
spec:
  template:
    spec:
      containers:
        - name: migration
          image: ${ECR_REGISTRY}/autolytiq/deal-service:prod
          command: ["./migrate", "up"]
          envFrom:
            - secretRef:
                name: autolytiq-secrets
      restartPolicy: Never
  backoffLimit: 3
EOF

# Monitor migration job
kubectl logs -f job/db-migration-* -n autolytiq-prod
```

---

## Phase 6: DNS & SSL

**Estimated Time:** 15-30 minutes

### 6.1 Get Load Balancer DNS Name

```bash
# Get the ALB DNS name
ALB_DNS=$(kubectl get ingress autolytiq-ingress -n autolytiq-prod \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

echo "ALB DNS: $ALB_DNS"
```

### 6.2 Configure Route 53 (If Using AWS DNS)

```bash
# Get Hosted Zone ID
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones \
  --query 'HostedZones[?Name==`autolytiq.com.`].Id' \
  --output text | cut -d'/' -f3)

# Create A record alias for API subdomain
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.autolytiq.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "'${ALB_DNS}'",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'

# Create record for Grafana monitoring
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "grafana.autolytiq.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "'${ALB_DNS}'",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'
```

### 6.3 Configure External DNS Provider (If Not Using Route 53)

If using Cloudflare, GoDaddy, or another DNS provider:

```
Type: CNAME
Name: api
Value: <ALB_DNS_NAME>
TTL: 300

Type: CNAME
Name: grafana
Value: <ALB_DNS_NAME>
TTL: 300
```

### 6.4 Verify SSL Certificate

```bash
# Wait for DNS propagation (5-10 minutes)
dig api.autolytiq.com +short

# Test HTTPS endpoint
curl -v https://api.autolytiq.com/health

# Verify certificate details
openssl s_client -connect api.autolytiq.com:443 -servername api.autolytiq.com </dev/null 2>/dev/null | openssl x509 -noout -dates
```

### 6.5 Force HTTPS Redirect

The ALB ingress is already configured to redirect HTTP to HTTPS via the annotation:

```yaml
alb.ingress.kubernetes.io/ssl-redirect: '443'
```

Verify it's working:

```bash
# This should return a 301 redirect
curl -I http://api.autolytiq.com/health

# This should return 200 OK
curl -I https://api.autolytiq.com/health
```

---

## Phase 7: Monitoring & Observability

**Estimated Time:** 30-45 minutes

### 7.1 Deploy Monitoring Namespace

```bash
# Create monitoring namespace
kubectl create namespace monitoring

# Apply monitoring resources
kubectl apply -f infrastructure/k8s/monitoring/namespace.yaml
```

### 7.2 Deploy Prometheus

```bash
# Apply Prometheus RBAC
kubectl apply -f infrastructure/k8s/monitoring/prometheus-rbac.yaml

# Apply Prometheus config
kubectl apply -f infrastructure/k8s/monitoring/prometheus-config.yaml

# Apply Prometheus rules (alerts)
kubectl apply -f infrastructure/k8s/monitoring/prometheus-rules.yaml

# Deploy Prometheus
kubectl apply -f infrastructure/k8s/monitoring/prometheus-deployment.yaml

# Verify Prometheus is running
kubectl get pods -n monitoring -l app=prometheus
kubectl rollout status deployment/prometheus -n monitoring
```

### 7.3 Deploy Grafana

```bash
# Generate secure admin password
GRAFANA_PASSWORD=$(openssl rand -base64 32)

# Update Grafana secret
kubectl create secret generic grafana-secrets \
  --namespace monitoring \
  --from-literal=admin-password="${GRAFANA_PASSWORD}" \
  --dry-run=client -o yaml | kubectl apply -f -

# Store password securely
echo "Grafana admin password: ${GRAFANA_PASSWORD}" > ~/.grafana-credentials
chmod 600 ~/.grafana-credentials

# Apply Grafana config
kubectl apply -f infrastructure/k8s/monitoring/grafana-config.yaml
kubectl apply -f infrastructure/k8s/monitoring/grafana-dashboards.yaml

# Deploy Grafana
kubectl apply -f infrastructure/k8s/monitoring/grafana-deployment.yaml

# Verify Grafana is running
kubectl get pods -n monitoring -l app=grafana
kubectl rollout status deployment/grafana -n monitoring
```

### 7.4 Deploy AlertManager

```bash
# Apply AlertManager configuration
kubectl apply -f infrastructure/k8s/monitoring/alertmanager.yaml

# Verify AlertManager
kubectl get pods -n monitoring -l app=alertmanager
```

### 7.5 Configure ServiceMonitors

```bash
# Apply ServiceMonitors for application metrics
kubectl apply -f infrastructure/k8s/monitoring/servicemonitors.yaml

# Verify targets in Prometheus
kubectl port-forward svc/prometheus 9090:9090 -n monitoring &
# Open http://localhost:9090/targets in browser
```

### 7.6 Configure Alert Notifications

Update AlertManager configuration with your notification channels:

```yaml
# Example Slack integration in alertmanager.yaml
global:
  slack_api_url: 'https://hooks.slack.com/services/xxx/xxx/xxx'

route:
  group_by: ['alertname', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'slack-notifications'

receivers:
  - name: 'slack-notifications'
    slack_configs:
      - channel: '#alerts-prod'
        send_resolved: true
```

### 7.7 Verify Monitoring Setup

```bash
# Port-forward to access dashboards locally
kubectl port-forward svc/grafana 3000:3000 -n monitoring &
kubectl port-forward svc/prometheus 9090:9090 -n monitoring &

# Access Grafana: http://localhost:3000
# Username: admin
# Password: (from ~/.grafana-credentials)

# Access Prometheus: http://localhost:9090

# Verify key metrics are being scraped:
# - go_goroutines (for Go services)
# - http_requests_total
# - http_request_duration_seconds
```

### 7.8 Configure CloudWatch Integration (Optional)

```bash
# Deploy CloudWatch agent for additional AWS metrics
kubectl apply -f - << EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: cloudwatch-config
  namespace: monitoring
data:
  cwagentconfig.json: |
    {
      "logs": {
        "metrics_collected": {
          "kubernetes": {
            "cluster_name": "autolytiq-prod",
            "metrics_collection_interval": 60
          }
        }
      }
    }
EOF
```

---

## Phase 8: Verification & Go-Live

**Estimated Time:** 30-60 minutes

### 8.1 Health Check Verification

```bash
# Define API base URL
API_URL="https://api.autolytiq.com"

# Test all service health endpoints
echo "Testing API Gateway..."
curl -s "${API_URL}/health" | jq

echo "Testing Auth Service..."
curl -s "${API_URL}/api/v1/auth/health" | jq

echo "Testing Deal Service..."
curl -s "${API_URL}/api/v1/deals/health" | jq

echo "Testing Customer Service..."
curl -s "${API_URL}/api/v1/customers/health" | jq

echo "Testing Inventory Service..."
curl -s "${API_URL}/api/v1/inventory/health" | jq

echo "Testing Email Service..."
curl -s "${API_URL}/api/v1/email/health" | jq

echo "Testing Config Service..."
curl -s "${API_URL}/api/v1/config/health" | jq
```

### 8.2 Kubernetes Resource Verification

```bash
# Check all pods are running and ready
kubectl get pods -n autolytiq-prod -o wide

# Check there are no pods in error state
kubectl get pods -n autolytiq-prod | grep -v Running

# Check pod resource usage
kubectl top pods -n autolytiq-prod

# Check node resource usage
kubectl top nodes

# Check HPA status
kubectl get hpa -n autolytiq-prod

# Check PDB status
kubectl get pdb -n autolytiq-prod

# Check for any events/warnings
kubectl get events -n autolytiq-prod --sort-by='.lastTimestamp' | tail -20
```

### 8.3 Database Connectivity Verification

```bash
# Verify database connection from a service pod
kubectl exec -it deployment/deal-service -n autolytiq-prod -- \
  /bin/sh -c 'echo "SELECT 1" | psql $DATABASE_URL'

# Check database metrics
kubectl port-forward svc/prometheus 9090:9090 -n monitoring &
# Query: pg_up{} in Prometheus
```

### 8.4 Redis Connectivity Verification

```bash
# Verify Redis connection from a service pod
kubectl exec -it deployment/api-gateway -n autolytiq-prod -- \
  /bin/sh -c 'redis-cli -u $REDIS_URL PING'
```

### 8.5 Smoke Tests

```bash
# Run automated smoke tests
npm run test:smoke -- --env=prod

# Manual smoke test checklist:
echo "
SMOKE TEST CHECKLIST
====================
[ ] User registration works
[ ] User login returns valid JWT
[ ] Deal listing returns results
[ ] Deal creation works
[ ] Customer search works
[ ] Inventory search works
[ ] Tax calculation returns expected values
[ ] Email sending works (test with non-production email)
"
```

### 8.6 Performance Baseline

```bash
# Run basic load test to establish baseline
# Using k6 or similar tool
cat > load-test.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 10,
  duration: '60s',
};

export default function() {
  let res = http.get('https://api.autolytiq.com/health');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
  sleep(1);
}
EOF

# Run the test
k6 run load-test.js

# Record baseline metrics:
# - P50 latency
# - P95 latency
# - P99 latency
# - Requests per second
# - Error rate
```

### 8.7 Go-Live Checklist

```bash
echo "
GO-LIVE CHECKLIST
=================

Infrastructure:
[ ] All EKS nodes are healthy
[ ] All pods are Running and Ready
[ ] No pending PersistentVolumeClaims
[ ] HPA configured and functional
[ ] PodDisruptionBudgets in place

Security:
[ ] All secrets loaded from Secrets Manager
[ ] TLS certificate valid and not expiring soon
[ ] Network policies applied (if using)
[ ] RBAC configured correctly

Data:
[ ] Database migrations completed
[ ] Database backups scheduled and tested
[ ] Redis persistence configured

Monitoring:
[ ] Prometheus scraping all targets
[ ] Grafana dashboards populated
[ ] AlertManager configured with notification channels
[ ] Key alerts firing correctly (test with synthetic failure)

DNS/Networking:
[ ] DNS records pointing to correct ALB
[ ] SSL/TLS working on all endpoints
[ ] HTTP to HTTPS redirect working

Operational:
[ ] Runbooks documented and accessible
[ ] On-call rotation established
[ ] Incident response process defined
[ ] Rollback procedure tested

Communication:
[ ] Stakeholders notified of go-live
[ ] Support team briefed
[ ] Documentation updated
"
```

### 8.8 Go-Live Announcement

After all checks pass:

```bash
# Create go-live tag
git tag -a v1.0.0-production -m "Production go-live"
git push origin v1.0.0-production

# Update any status pages
# Notify stakeholders via appropriate channels
# Enable production traffic (if using feature flags or gradual rollout)
```

---

## Cost Breakdown

### Monthly Cost Estimates (Production Environment)

| Service                       | Configuration                                  | Estimated Monthly Cost |
| ----------------------------- | ---------------------------------------------- | ---------------------- |
| **EKS Cluster**               | Control plane                                  | $73                    |
| **EC2 Instances**             | 5x t3.large (general) + 2x r5.large (database) | $350-400               |
| **Aurora PostgreSQL**         | Serverless v2, 2-16 ACU                        | $150-300               |
| **ElastiCache Redis**         | 3x cache.r5.large                              | $200-250               |
| **Application Load Balancer** | 1 ALB + data processing                        | $30-50                 |
| **S3**                        | Backups + storage                              | $10-30                 |
| **NAT Gateway**               | 3x NAT Gateways (HA)                           | $100                   |
| **Data Transfer**             | Varies by traffic                              | $50-100                |
| **Secrets Manager**           | ~10 secrets                                    | $5                     |
| **CloudWatch**                | Logs + metrics                                 | $30-50                 |
| **Route 53**                  | Hosted zone + queries                          | $5                     |
| **ECR**                       | Image storage                                  | $5-10                  |
| **AWS Backup**                | Vault + storage                                | $20-50                 |
| **KMS**                       | Key operations                                 | $5                     |

**Total Estimated Monthly Cost: $1,000-1,500**

### Cost Optimization Tips

1. **Use Spot Instances** for non-critical workloads (general node group)
2. **Right-size instances** based on actual usage after 2-4 weeks
3. **Reserved Instances** for predictable workloads (1-year commitment = 30-40% savings)
4. **Enable S3 Intelligent-Tiering** for backup storage
5. **Use Graviton instances** (ARM) for 20% cost reduction
6. **Review CloudWatch log retention** policies

---

## Rollback Procedures

### Quick Rollback (Deployment Level)

```bash
# Rollback a single service to previous version
kubectl rollout undo deployment/<service-name> -n autolytiq-prod

# Rollback to specific revision
kubectl rollout history deployment/<service-name> -n autolytiq-prod
kubectl rollout undo deployment/<service-name> -n autolytiq-prod --to-revision=<revision>

# Rollback all services
for deploy in api-gateway auth-service deal-service customer-service inventory-service email-service user-service config-service; do
  kubectl rollout undo deployment/$deploy -n autolytiq-prod
done
```

### Image Tag Rollback

```bash
# Rollback to specific image version
export PREVIOUS_TAG=v1.0.0

for service in api-gateway auth-service deal-service customer-service inventory-service email-service user-service config-service; do
  kubectl set image deployment/$service \
    $service=${ECR_REGISTRY}/autolytiq/${service}:${PREVIOUS_TAG} \
    -n autolytiq-prod
done
```

### Database Rollback

```bash
# 1. Identify the snapshot to restore from
aws rds describe-db-cluster-snapshots \
  --db-cluster-identifier autolytiq-prod \
  --query 'DBClusterSnapshots[*].[DBClusterSnapshotIdentifier,SnapshotCreateTime]' \
  --output table

# 2. Scale down services
kubectl scale deployment --all --replicas=0 -n autolytiq-prod

# 3. Restore from snapshot (creates new cluster)
aws rds restore-db-cluster-from-snapshot \
  --db-cluster-identifier autolytiq-prod-restored \
  --snapshot-identifier <snapshot-id> \
  --engine aurora-postgresql \
  --engine-version 15.4 \
  --db-subnet-group-name autolytiq-prod-db \
  --vpc-security-group-ids <security-group-id>

# 4. Update DNS/connection strings
# 5. Scale services back up
kubectl scale deployment --all --replicas=3 -n autolytiq-prod
```

### Full Infrastructure Rollback

In case of catastrophic failure:

```bash
# 1. Document current state
terraform state list > state-backup.txt

# 2. Restore from Terraform state backup
# (Terraform state is versioned in S3)
aws s3api list-object-versions \
  --bucket autolytiq-terraform-state \
  --prefix infrastructure/terraform.tfstate

# 3. Download previous state version
aws s3api get-object \
  --bucket autolytiq-terraform-state \
  --key infrastructure/terraform.tfstate \
  --version-id <previous-version-id> \
  terraform.tfstate.backup

# 4. Apply previous configuration
terraform apply -state=terraform.tfstate.backup
```

### Emergency Contacts

| Role             | Contact                                   |
| ---------------- | ----------------------------------------- |
| On-Call Engineer | PagerDuty                                 |
| Platform Team    | #platform-support                         |
| AWS Support      | AWS Console (Business/Enterprise support) |
| Security         | #security                                 |

---

## Post-Deployment Tasks

After successful deployment:

1. **Schedule backup verification test** (restore to dev environment)
2. **Configure budget alerts** in AWS Billing
3. **Set up cost anomaly detection**
4. **Create runbook for common operations**
5. **Schedule first disaster recovery drill** (within 30 days)
6. **Review and tune auto-scaling thresholds** (after 1 week of traffic)
7. **Implement log rotation policies**
8. **Set up security scanning schedule**

---

## Appendix

### A. Terraform Module Dependency Graph

```
vpc.tf
  |
  +-- eks.tf
  |     |
  |     +-- (kubernetes provider)
  |     +-- (helm provider)
  |
  +-- rds.tf
  |     |
  |     +-- secrets.tf (db credentials)
  |
  +-- elasticache.tf
  |     |
  |     +-- secrets.tf (redis credentials)
  |
  +-- backup.tf
        |
        +-- (cross-region resources if prod)
```

### B. Service Dependencies

```
api-gateway
  |
  +-- auth-service
  +-- deal-service -----> PostgreSQL
  +-- customer-service -> PostgreSQL
  +-- inventory-service -> PostgreSQL
  +-- email-service ----> Resend API
  +-- user-service -----> PostgreSQL
  +-- config-service ---> PostgreSQL, Redis
```

### C. Port Reference

| Service           | Port | Protocol |
| ----------------- | ---- | -------- |
| api-gateway       | 8080 | HTTP     |
| auth-service      | 8087 | HTTP     |
| deal-service      | 8081 | HTTP     |
| customer-service  | 8082 | HTTP     |
| inventory-service | 8083 | HTTP     |
| email-service     | 8084 | HTTP     |
| user-service      | 8085 | HTTP     |
| config-service    | 8086 | HTTP     |
| showroom-service  | 8088 | HTTP     |
| messaging-service | 8089 | HTTP     |
| settings-service  | 8090 | HTTP     |
| PostgreSQL        | 5432 | TCP      |
| Redis             | 6379 | TCP      |
| Prometheus        | 9090 | HTTP     |
| Grafana           | 3000 | HTTP     |
| AlertManager      | 9093 | HTTP     |

---

**Document Version:** 1.0.0
**Last Updated:** 2024-11-26
**Author:** Platform Team
