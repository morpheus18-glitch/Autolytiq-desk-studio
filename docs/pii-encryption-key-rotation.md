# PII Encryption Key Rotation Procedure

This document describes how to rotate the AES-256-GCM encryption keys used for PII (Personally Identifiable Information) data at rest.

## Overview

The encryption system uses versioned keys to support seamless key rotation without downtime. Each encrypted value includes a version identifier that indicates which key was used for encryption.

## Key Format

- Keys must be 32 bytes (256 bits) represented as 64 hexadecimal characters
- Generate a new key using: `openssl rand -hex 32`
- Example key format: `a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2`

## Environment Variables

| Variable                         | Description                                           |
| -------------------------------- | ----------------------------------------------------- |
| `PII_ENCRYPTION_KEY`             | Primary encryption key (v1)                           |
| `PII_ENCRYPTION_KEY_V2`          | Second key version (optional)                         |
| `PII_ENCRYPTION_KEY_V3`          | Third key version (optional)                          |
| ...                              | Up to V10 supported                                   |
| `PII_ENCRYPTION_PRIMARY_VERSION` | Which version to use for new encryption (default: v1) |

## Key Rotation Steps

### 1. Generate a New Key

```bash
# Generate a new 256-bit key
NEW_KEY=$(openssl rand -hex 32)
echo "New key: $NEW_KEY"
```

### 2. Add the New Key to Secrets

Add the new key to your secrets management system (AWS Secrets Manager, HashiCorp Vault, or Kubernetes secrets):

```yaml
# Example for Kubernetes secrets
apiVersion: v1
kind: Secret
metadata:
  name: autolytiq-secrets
  namespace: autolytiq
type: Opaque
stringData:
  PII_ENCRYPTION_KEY: 'existing_key_hex...'
  PII_ENCRYPTION_KEY_V2: 'new_key_hex...'
```

### 3. Deploy with Both Keys

Deploy the application with both keys available. At this point:

- Existing data remains encrypted with v1
- New data is still encrypted with v1
- The service can decrypt data encrypted with either key

```bash
kubectl apply -f infrastructure/k8s/base/secrets.yaml
kubectl rollout restart deployment/customer-service -n autolytiq
```

### 4. Re-encrypt Existing Data

Run the data migration to re-encrypt all PII data with the new key:

```bash
# Using the migration tool (run from within the cluster or with database access)
go run ./cmd/migrate-pii --new-version v2

# Or using kubectl exec
kubectl exec -it deployment/customer-service -n autolytiq -- \
  /app/migrate-pii --new-version v2
```

The migration tool:

- Processes data in batches (default 100 rows)
- Uses database transactions for atomicity
- Tracks progress via `pii_encryption_version` column
- Can be interrupted and resumed safely

### 5. Switch Primary Key

Once all data is re-encrypted, update the primary version:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: autolytiq-secrets
stringData:
  PII_ENCRYPTION_KEY: 'v1_key_hex...'
  PII_ENCRYPTION_KEY_V2: 'v2_key_hex...'
  PII_ENCRYPTION_PRIMARY_VERSION: 'v2'
```

Deploy the update:

```bash
kubectl apply -f infrastructure/k8s/base/secrets.yaml
kubectl rollout restart deployment/customer-service -n autolytiq
```

### 6. Verify Migration

```sql
-- Check that all data uses the new key version
SELECT pii_encryption_version, COUNT(*)
FROM customers
WHERE pii_encryption_version IS NOT NULL
GROUP BY pii_encryption_version;

-- Should show all rows with 'v2'
```

### 7. Deactivate Old Key (Optional)

After confirming all data is re-encrypted and the system is stable (recommended wait: 7-30 days), you can remove the old key:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: autolytiq-secrets
stringData:
  # Remove v1 key after confirming migration is complete
  PII_ENCRYPTION_KEY_V2: 'v2_key_hex...'
  PII_ENCRYPTION_PRIMARY_VERSION: 'v2'
```

**Warning**: Once the old key is removed, any data still encrypted with it will become unreadable.

## Emergency Key Rotation

If a key is compromised, follow these expedited steps:

1. **Generate new key immediately**
2. **Add new key and switch primary version in one deployment**
3. **Run re-encryption migration immediately**
4. **Remove compromised key once migration completes**

```bash
# Emergency rotation script
NEW_KEY=$(openssl rand -hex 32)
NEW_VERSION="v$(date +%Y%m%d%H%M%S)"

# Update secrets (adjust for your secrets management)
kubectl create secret generic autolytiq-secrets-emergency \
  --from-literal=PII_ENCRYPTION_KEY_${NEW_VERSION}="${NEW_KEY}" \
  --from-literal=PII_ENCRYPTION_PRIMARY_VERSION="${NEW_VERSION}" \
  --dry-run=client -o yaml | kubectl apply -f -

# Force restart all services
kubectl rollout restart deployment -n autolytiq

# Run emergency re-encryption
kubectl exec -it deployment/customer-service -n autolytiq -- \
  /app/migrate-pii --new-version ${NEW_VERSION} --batch-size 500
```

## Monitoring and Alerting

### Metrics to Monitor

1. **Encryption version distribution**: Track which versions are in use
2. **Migration progress**: Monitor row counts during re-encryption
3. **Decryption failures**: Alert on any decryption errors (may indicate key issues)

### Audit Log

The key manager maintains a rotation log accessible via:

```go
km.GetRotationLog() // Returns []RotationEvent
```

Each rotation event includes:

- Old key version
- New key version
- Timestamp
- Rotated by (user/system identifier)

## Rollback Procedure

If issues occur after key rotation:

1. **Keep the old key available** (don't remove until verified)
2. **Switch primary version back** to the old version
3. **Investigate and fix issues**
4. **Re-attempt rotation**

```yaml
# Rollback primary version
stringData:
  PII_ENCRYPTION_PRIMARY_VERSION: 'v1' # Switch back to old version
```

## Best Practices

1. **Regular rotation**: Rotate keys annually or per compliance requirements
2. **Test in staging**: Always test key rotation in a non-production environment first
3. **Backup keys securely**: Maintain encrypted backups of all key versions
4. **Document rotations**: Log all key rotations with timestamps and reasons
5. **Monitor continuously**: Set up alerts for encryption/decryption failures
6. **Gradual rollout**: Use canary deployments when switching key versions

## Compliance Notes

- **PCI-DSS**: Requires annual key rotation for cardholder data
- **HIPAA**: Recommends regular key rotation for PHI
- **GDPR**: Encryption is a recognized security measure; key management is part of security controls

## Troubleshooting

### Decryption Fails After Rotation

1. Check that all key versions are available in environment
2. Verify `pii_encryption_version` column matches available keys
3. Check for data corruption (compare ciphertext length to expected format)

### Migration Stalls

1. Check database connection and transaction timeouts
2. Look for locked rows (long-running transactions)
3. Increase batch size or add more parallelism

### Key Not Found Error

1. Verify environment variable is set correctly
2. Check hex encoding (must be exactly 64 characters)
3. Ensure no whitespace in key value
