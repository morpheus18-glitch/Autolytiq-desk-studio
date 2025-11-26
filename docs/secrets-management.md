# Secrets Management Guide

This document describes the production-grade secrets management system for Autolytiq microservices.

## Overview

Autolytiq uses a layered secrets management approach:

1. **AWS Secrets Manager** - Primary secret store for production
2. **External Secrets Operator (ESO)** - Syncs secrets from AWS to Kubernetes
3. **Go Secrets Client** - Application-level library with caching and fallback
4. **Environment Variables** - Local development fallback

## Architecture

```
+------------------+     +------------------------+     +------------------+
|  AWS Secrets     |     |  External Secrets      |     |  Kubernetes      |
|  Manager         | --> |  Operator (ESO)        | --> |  Secrets         |
+------------------+     +------------------------+     +------------------+
         |                                                      |
         |                                                      v
         |               +------------------------+     +------------------+
         +-------------> |  Go Secrets Client     | --> |  Service Pods    |
                         |  (Direct Access)       |     |                  |
                         +------------------------+     +------------------+
```

## Components

### 1. AWS Secrets Manager (Terraform)

Location: `infrastructure/terraform/secrets.tf`

Secrets stored:

- `autolytiq/{env}/database` - Database credentials with connection URL
- `autolytiq/{env}/redis` - Redis credentials and connection URL
- `autolytiq/{env}/jwt` - JWT signing secret and issuer
- `autolytiq/{env}/pii-encryption` - AES-256 encryption key for PII
- `autolytiq/{env}/session` - Session encryption secret
- `autolytiq/{env}/smtp` - SMTP email configuration
- `autolytiq/{env}/resend` - Resend API key
- `autolytiq/{env}/external-apis` - Third-party API keys

### 2. External Secrets Operator

Location: `infrastructure/k8s/external-secrets/`

Components:

- `namespace.yaml` - ESO namespace
- `operator.yaml` - ESO service account and RBAC
- `cluster-secret-store.yaml` - Connection to AWS Secrets Manager
- `external-secrets.yaml` - ExternalSecret resources for each secret
- `service-accounts.yaml` - Service accounts with IRSA for pods

### 3. Go Secrets Client

Location: `services/shared/secrets/`

Features:

- AWS Secrets Manager integration
- In-memory caching with configurable TTL
- Automatic background refresh
- Fallback to environment variables
- Structured secret access (GetDatabaseURL, GetJWTSecret, etc.)

## Setup Guide

### Prerequisites

1. AWS account with appropriate IAM permissions
2. EKS cluster with IRSA enabled
3. Terraform >= 1.5.0
4. kubectl configured for your cluster

### Initial Setup

#### 1. Deploy Terraform Infrastructure

```bash
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Plan the deployment
terraform plan -var="environment=prod"

# Apply the configuration
terraform apply -var="environment=prod"

# Note the outputs for later use
terraform output secrets_access_role_arn
terraform output external_secrets_role_arn
```

#### 2. Install External Secrets Operator

```bash
# Add the ESO Helm repository
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

# Get the role ARN from Terraform output
EXTERNAL_SECRETS_ROLE_ARN=$(terraform output -raw external_secrets_role_arn)

# Install ESO with IRSA
helm install external-secrets external-secrets/external-secrets \
  -n external-secrets \
  --create-namespace \
  --set installCRDs=true \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"="${EXTERNAL_SECRETS_ROLE_ARN}"
```

#### 3. Deploy External Secrets Configuration

```bash
# Get the secrets access role ARN
SECRETS_ACCESS_ROLE_ARN=$(terraform output -raw secrets_access_role_arn)

# Update the service account annotations
cd infrastructure/k8s/external-secrets

# Replace placeholders in manifests (or use Kustomize overlays)
sed -i "s|\${SECRETS_ACCESS_ROLE_ARN}|${SECRETS_ACCESS_ROLE_ARN}|g" service-accounts.yaml
sed -i "s|\${EXTERNAL_SECRETS_ROLE_ARN}|${EXTERNAL_SECRETS_ROLE_ARN}|g" operator.yaml

# Apply for production
kubectl apply -k overlays/prod
```

#### 4. Verify Secrets Sync

```bash
# Check ExternalSecret status
kubectl get externalsecrets -n autolytiq

# Verify secrets were created
kubectl get secrets -n autolytiq

# Check a specific secret
kubectl get externalsecret database-credentials -n autolytiq -o yaml
```

## Adding New Secrets

### Step 1: Add to AWS Secrets Manager (Terraform)

Add to `infrastructure/terraform/secrets.tf`:

```hcl
resource "aws_secretsmanager_secret" "my_new_secret" {
  name                    = "${local.secrets_prefix}/my-new-secret"
  description             = "Description of my new secret"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = {
    Name        = "${local.name}-my-new-secret"
    Environment = var.environment
    Service     = "my-service"
  }
}

resource "aws_secretsmanager_secret_version" "my_new_secret" {
  secret_id = aws_secretsmanager_secret.my_new_secret.id
  secret_string = jsonencode({
    api_key = "initial-value-replace-manually"
    # Add other properties as needed
  })

  lifecycle {
    ignore_changes = [secret_string]  # Don't overwrite manual changes
  }
}
```

Update the IAM policy:

```hcl
# Add to aws_iam_policy.secrets_access resource
Resource = [
  # ... existing resources ...
  aws_secretsmanager_secret.my_new_secret.arn,
]
```

### Step 2: Add ExternalSecret Resource

Add to `infrastructure/k8s/external-secrets/external-secrets.yaml`:

```yaml
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: my-new-secret
  namespace: autolytiq
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: my-new-secret
    creationPolicy: Owner
  data:
    - secretKey: API_KEY
      remoteRef:
        key: autolytiq/${ENVIRONMENT}/my-new-secret
        property: api_key
```

### Step 3: Update Go Secrets Client (Optional)

If you want typed access, add to `services/shared/secrets/provider.go`:

```go
// Add to Provider interface
GetMyNewSecret(ctx context.Context) (string, error)

// Implement in SecretsProvider
func (p *SecretsProvider) GetMyNewSecret(ctx context.Context) (string, error) {
    return p.client.GetSecretString(ctx, "my-new-secret", "api_key")
}

// Implement in EnvProvider
func (p *EnvProvider) GetMyNewSecret(ctx context.Context) (string, error) {
    key := p.getEnv("MY_NEW_SECRET_API_KEY", "")
    if key == "" {
        return "", fmt.Errorf("MY_NEW_SECRET_API_KEY environment variable not set")
    }
    return key, nil
}
```

### Step 4: Use in Service

```go
// Option 1: Direct from provider
provider, _ := secrets.AutoProvider(ctx)
apiKey, err := provider.GetMyNewSecret(ctx)

// Option 2: From Kubernetes secret (via environment)
apiKey := os.Getenv("MY_NEW_SECRET_API_KEY")
```

## Rotating Secrets

### Automatic Database Credential Rotation

Database credentials are automatically rotated every 30 days in production via AWS Secrets Manager rotation.

The rotation process:

1. AWS Lambda generates new password
2. Updates RDS user password
3. Updates secret with new credentials
4. Services automatically pick up new credentials on next cache refresh

### Manual Secret Rotation

For secrets that don't support automatic rotation:

```bash
# 1. Update the secret value in AWS Secrets Manager
aws secretsmanager update-secret \
  --secret-id autolytiq/prod/jwt \
  --secret-string '{"secret": "new-secret-value", "issuer": "autolytiq"}'

# 2. Force ExternalSecret refresh
kubectl annotate externalsecret jwt-secrets -n autolytiq \
  force-sync=$(date +%s) --overwrite

# 3. Restart services to pick up new values
kubectl rollout restart deployment -n autolytiq -l app.kubernetes.io/component=backend
```

### PII Encryption Key Rotation

Special procedure for encryption key rotation to avoid data loss:

1. Generate new key:

```bash
NEW_KEY=$(openssl rand -hex 32)
echo "New key: $NEW_KEY"
```

2. Add new key version to AWS Secrets Manager:

```bash
# Get current secret
CURRENT=$(aws secretsmanager get-secret-value \
  --secret-id autolytiq/prod/pii-encryption \
  --query SecretString --output text)

# Add new version (keep old key for decryption)
aws secretsmanager update-secret \
  --secret-id autolytiq/prod/pii-encryption \
  --secret-string '{"key": "'$NEW_KEY'", "version": "v2", "key_v1": "'$(echo $CURRENT | jq -r .key)'"}'
```

3. Set environment variable for key rotation:

```bash
kubectl set env deployment -n autolytiq -l tier=backend \
  PII_ENCRYPTION_PRIMARY_VERSION=v2 \
  PII_ENCRYPTION_KEY_V1=$(echo $CURRENT | jq -r .key)
```

4. Run re-encryption migration:

```bash
kubectl exec -it deployment/customer-service -n autolytiq -- \
  /app/migrate-encryption --from-version=v1 --to-version=v2
```

5. After all data is migrated, remove old key from rotation.

## Local Development

For local development, use environment variables instead of AWS:

```bash
# Create .env file
cat > services/.env << 'EOF'
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/autolytiq?sslmode=disable
REDIS_URL=redis://localhost:6379
JWT_SECRET=local-development-jwt-secret-minimum-32-characters
JWT_ISSUER=autolytiq
PII_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
SESSION_SECRET=local-session-secret
SECRETS_PROVIDER=env
EOF

# Load environment
source services/.env
```

The `SECRETS_PROVIDER=env` setting tells the Go client to use environment variables only.

## Troubleshooting

### ExternalSecret Not Syncing

```bash
# Check ESO controller logs
kubectl logs -n external-secrets -l app.kubernetes.io/name=external-secrets

# Check ExternalSecret events
kubectl describe externalsecret <name> -n autolytiq

# Common issues:
# - IAM role not configured correctly
# - Secret path doesn't exist in AWS
# - Missing required permissions
```

### Service Can't Access Secrets

```bash
# Verify pod service account has correct annotation
kubectl get pod <pod-name> -n autolytiq -o yaml | grep serviceAccountName

# Check service account annotation
kubectl get sa <sa-name> -n autolytiq -o yaml

# Verify IAM role trust relationship allows the service account
aws iam get-role --role-name <role-name> --query 'Role.AssumeRolePolicyDocument'
```

### Secret Not Found in Application

```bash
# Check if secret exists
kubectl get secret <secret-name> -n autolytiq

# Verify secret has expected keys
kubectl get secret <secret-name> -n autolytiq -o json | jq '.data | keys'

# Check pod environment variables
kubectl exec <pod-name> -n autolytiq -- env | grep -i secret
```

### Cache Issues

If secrets changes aren't being picked up:

```go
// Invalidate cache programmatically
provider.InvalidateCache("jwt")

// Or restart the service
kubectl rollout restart deployment/<service> -n autolytiq
```

## Security Best Practices

1. **Never commit secrets to git** - Use `.gitignore` for `.env` files
2. **Use separate secrets per environment** - Don't share prod secrets with dev
3. **Rotate secrets regularly** - Enable automatic rotation where possible
4. **Audit secret access** - Enable CloudTrail logging for Secrets Manager
5. **Use least privilege** - Services should only access secrets they need
6. **Encrypt at rest and in transit** - AWS Secrets Manager handles this
7. **Monitor for anomalies** - Set up alerts for unusual secret access patterns

## Related Documentation

- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)
- [External Secrets Operator](https://external-secrets.io/)
- [EKS IRSA](https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
