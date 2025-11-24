# PII Security & Encryption Strategy

## Overview
This document outlines the data protection strategy for personally identifiable information (PII) stored in the NextGen Automotive Desking Platform.

## Sensitive Fields Inventory

### Customer Table PII Fields
| Field | Sensitivity Level | Current State | Required Protection |
|-------|------------------|---------------|---------------------|
| `ssnLast4` | **HIGH** | Plaintext | AES-256-GCM encryption at rest |
| `driversLicenseNumber` | **HIGH** | Plaintext | AES-256-GCM encryption at rest |
| `creditScore` | MEDIUM | Plaintext | Access control (finance_manager+ only) |
| `monthlyIncome` | MEDIUM | Plaintext | Access control (finance_manager+ only) |
| `dateOfBirth` | MEDIUM | Plaintext | Access control + audit logging |
| `email`, `phone` | LOW | Plaintext | Audit logging only |

## Implementation Plan

### Phase 1: Access Controls (CURRENT - Development)
**Status**: ✅ Implemented via RBAC
- Finance managers and admins can view all PII fields
- Salespersons have restricted access (no SSN, credit scores)
- All PII access logged in `security_audit_log` table

### Phase 2: Encryption at Rest (BEFORE PRODUCTION)
**Status**: 🚧 Pending implementation

**Encryption Strategy**:
1. **Library**: Use `crypto` module (Node.js built-in) or `@aws-crypto/client-node` for AWS KMS
2. **Algorithm**: AES-256-GCM (authenticated encryption)
3. **Key Management**: 
   - Development: Environment variable `ENCRYPTION_KEY` (32-byte hex)
   - Production: AWS KMS, Azure Key Vault, or GCP KMS
4. **Encrypted Fields**:
   - `customers.ssnLast4` → Store as base64-encoded ciphertext
   - `customers.driversLicenseNumber` → Store as base64-encoded ciphertext

**Implementation Approach**:
```typescript
// Example encryption utility (server/utils/encryption.ts)
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32 bytes

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encrypted
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

export function decrypt(encryptedData: string): string {
  const [ivB64, authTagB64, encrypted] = encryptedData.split(':');
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

**Database Layer Integration**:
- Encrypt on INSERT/UPDATE via middleware
- Decrypt on SELECT via `afterFind` hooks or API response transformers
- Client never sees encrypted values (transparent encryption)

### Phase 3: Compliance & Auditing (BEFORE PRODUCTION)
**Required Controls**:
1. **Audit Logging**: All PII access logged with user ID, timestamp, action
2. **Data Masking**: UI shows only last 4 digits of SSN/license (e.g., "***-**-1234")
3. **Access Justification**: Require business reason for viewing full SSN/license
4. **Data Retention**: Auto-purge customer records after configurable period (GDPR/CCPA)
5. **Breach Notification**: Alert system for unauthorized PII access

## Security Checklist (Pre-Production)

- [ ] Encryption key rotation strategy documented
- [ ] Encryption/decryption utility implemented and tested
- [ ] Database migration plan for encrypting existing records
- [ ] API endpoints updated to encrypt on write, decrypt on read
- [ ] UI masks sensitive fields (show last 4 only)
- [ ] RBAC verified (salespersons cannot access SSN/credit scores)
- [ ] Audit logging confirmed for all PII reads
- [ ] Penetration test completed
- [ ] Compliance review (GDPR, CCPA, SOC 2) if applicable
- [ ] Backup/restore tested with encrypted data

## Current Development Approach

**For Development/Demo**:
- SSN last 4 and driver's license stored as plaintext
- Access restricted via RBAC (role-based permissions)
- All fields optional/nullable (no forced collection)
- Clear TODO comments in schema for encryption requirements

**Warnings**:
⚠️ **DO NOT** use real customer SSNs or driver's license numbers in development
⚠️ **DO NOT** deploy to production without implementing Phase 2 encryption
⚠️ **DO NOT** expose PII in logs, error messages, or client-side code

## References
- OWASP Data Protection Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html
- NIST Encryption Standards: https://csrc.nist.gov/projects/cryptographic-standards-and-guidelines
- PCI DSS Requirements (if storing payment data)
- GLBA Safeguards Rule (automotive finance compliance)
