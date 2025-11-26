# GDPR & CCPA Data Compliance Documentation

**Document Version:** 1.0
**Last Updated:** November 2025
**Classification:** Internal / Compliance

---

## Table of Contents

1. [Overview](#overview)
2. [Data Inventory](#data-inventory)
3. [Lawful Basis for Processing](#lawful-basis-for-processing)
4. [Data Retention Schedule](#data-retention-schedule)
5. [Data Subject Rights Procedures](#data-subject-rights-procedures)
6. [Consent Management](#consent-management)
7. [Data Breach Notification Procedures](#data-breach-notification-procedures)
8. [Data Processing Agreement Requirements](#data-processing-agreement-requirements)
9. [Technical Implementation](#technical-implementation)
10. [API Reference](#api-reference)

---

## Overview

This document outlines the GDPR (General Data Protection Regulation) and CCPA (California Consumer Privacy Act) compliance measures implemented in the Autolytiq Desk Studio platform.

### Scope

- All personal data processed by Autolytiq services
- Customer data collected by dealerships using the platform
- Employee and user data within the system

### Key Principles

1. **Lawfulness, Fairness, and Transparency** - Data processing is lawful and transparent
2. **Purpose Limitation** - Data collected for specified, explicit purposes
3. **Data Minimization** - Only necessary data is collected
4. **Accuracy** - Data is kept accurate and up to date
5. **Storage Limitation** - Data retained only as long as necessary
6. **Integrity and Confidentiality** - Appropriate security measures applied
7. **Accountability** - Demonstrable compliance with regulations

---

## Data Inventory

### Personal Data Categories

| Data Category             | Fields                              | Storage Location                    | Encryption  |
| ------------------------- | ----------------------------------- | ----------------------------------- | ----------- |
| **Customer Identity**     | First Name, Last Name, Email, Phone | PostgreSQL `customers` table        | At rest     |
| **Customer Address**      | Address, City, State, ZIP           | PostgreSQL `customers` table        | At rest     |
| **Financial Data**        | Credit Score, Monthly Income        | PostgreSQL (encrypted columns)      | AES-256     |
| **Sensitive Identifiers** | SSN (last 4), Driver's License      | PostgreSQL (encrypted columns)      | AES-256-GCM |
| **Transaction Data**      | Deals, Purchases, Trade-ins         | PostgreSQL `deals` table            | At rest     |
| **Communication Data**    | Email logs, SMS logs                | PostgreSQL `email_logs` table       | At rest     |
| **Activity Data**         | Showroom visits, Timers             | PostgreSQL `showroom_visits` table  | At rest     |
| **Consent Records**       | Marketing preferences               | PostgreSQL `customer_consent` table | At rest     |
| **Authentication Data**   | Email, Password hash                | PostgreSQL `auth_users` table       | bcrypt      |

### Data Flow Diagram

```
Customer Input --> API Gateway --> Customer Service --> PostgreSQL
                                         |
                                         v
                                   Encryption Layer (PII)
                                         |
                                         v
                                   Audit Logging
```

### Third-Party Data Sharing

| Third Party        | Data Shared          | Purpose                | Legal Basis      |
| ------------------ | -------------------- | ---------------------- | ---------------- |
| Credit Bureaus     | Credit applications  | Financing              | Consent          |
| Lenders            | Deal information     | Financing              | Contract         |
| DMV                | Vehicle registration | Legal requirement      | Legal obligation |
| Payment Processors | Payment details      | Transaction processing | Contract         |

---

## Lawful Basis for Processing

### Customer Data

| Processing Activity           | Lawful Basis        | Justification                        |
| ----------------------------- | ------------------- | ------------------------------------ |
| Vehicle sales transactions    | Contract            | Necessary for purchase agreement     |
| Credit applications           | Consent             | Explicit customer consent required   |
| Marketing communications      | Consent             | Opt-in consent with easy opt-out     |
| Service appointment reminders | Legitimate interest | Direct customer relationship         |
| Fraud prevention              | Legitimate interest | Security of financial transactions   |
| Tax and regulatory compliance | Legal obligation    | IRS, state tax requirements          |
| Vehicle history records       | Legal obligation    | Federal/state automotive regulations |

### Retention Justifications

| Data Type               | Retention Period | Legal Basis                  |
| ----------------------- | ---------------- | ---------------------------- |
| Sales contracts         | 7 years          | Tax/accounting records (IRS) |
| Financial records       | 7 years          | Legal obligation             |
| Customer communications | 1 year           | Legitimate interest          |
| Session data            | 30 days          | Technical necessity          |
| Audit logs              | 3 years          | Security compliance          |

---

## Data Retention Schedule

### Automatic Retention Policies

The `data-retention-service` implements the following automated retention policies:

```
+-------------------+----------------+--------------+------------------+
| Entity Type       | Retention      | Action       | Trigger          |
+-------------------+----------------+--------------+------------------+
| Customer Data     | 7 years        | Anonymize    | Last activity    |
| Deal/Transaction  | 7 years        | Anonymize    | Deal completion  |
| Audit Logs        | 3 years        | Delete       | Creation date    |
| Session Data      | 30 days        | Delete       | Session end      |
| Email Logs        | 1 year         | Delete       | Send date        |
| Showroom Visits   | 7 years        | Anonymize    | Visit date       |
+-------------------+----------------+--------------+------------------+
```

### Scheduled Jobs

1. **Daily Cleanup Job** (2:00 AM)
   - Identifies expired data based on retention policies
   - Soft deletes or anonymizes records as configured
   - Generates audit log entries

2. **Weekly Anonymization Job** (Sunday 3:00 AM)
   - Processes records marked for anonymization
   - Replaces PII with anonymized placeholders
   - Maintains referential integrity

3. **Monthly Retention Report** (1st of month, 4:00 AM)
   - Generates compliance report
   - Summarizes GDPR requests processed
   - Tracks consent statistics

---

## Data Subject Rights Procedures

### Right to Access (Article 15)

**Process:**

1. Customer submits data access request
2. Request logged in `gdpr_requests` table
3. Identity verification performed
4. All customer data exported as JSON
5. Export delivered within 30 days (regulatory maximum)

**API Endpoint:**

```
POST /api/v1/gdpr/export/{customer_id}
```

**Exported Data Includes:**

- Personal information
- Transaction history
- Communication logs
- Showroom visits
- Consent preferences

### Right to Erasure (Article 17)

**Process:**

1. Customer submits deletion request
2. Request logged and verified
3. System checks for legal holds
4. If no holds: Data anonymized or deleted
5. Related records cascaded (deals, visits, emails)
6. Confirmation provided within 30 days

**API Endpoint:**

```
POST /api/v1/gdpr/delete/{customer_id}
```

**Exceptions (Data Retained):**

- Active legal proceedings
- Tax compliance requirements (7-year hold)
- Fraud investigation
- Legitimate legal defense

### Right to Rectification (Article 16)

**Process:**

1. Customer requests data correction
2. Changes validated
3. Update applied to all relevant records
4. Audit log created
5. Confirmation provided

**API Endpoint:**

```
PUT /api/v1/customers/{customer_id}
```

### Right to Restrict Processing (Article 18)

**Process:**

1. Customer requests processing restriction
2. Data marked as "restricted"
3. No further processing except storage
4. Marketing consent set to false

### Right to Data Portability (Article 20)

**Process:**

1. Customer requests data export
2. Data exported in machine-readable JSON format
3. Includes all customer-provided data

---

## Consent Management

### Consent Categories

| Category            | Default | Required          | Withdrawable |
| ------------------- | ------- | ----------------- | ------------ |
| Data Processing     | Yes     | Yes (for service) | Limited\*    |
| Marketing Email     | No      | No                | Yes          |
| Marketing SMS       | No      | No                | Yes          |
| Marketing Phone     | No      | No                | Yes          |
| Third-Party Sharing | No      | No                | Yes          |
| Analytics           | Yes     | No                | Yes          |

\*Data processing consent withdrawal terminates service

### Consent Collection

```json
{
  "marketing_email": true,
  "marketing_sms": false,
  "marketing_phone": false,
  "data_processing": true,
  "third_party_sharing": false,
  "analytics": true
}
```

### Consent Change Tracking

All consent changes are recorded in `consent_history` table:

- Previous value
- New value
- Timestamp
- IP address
- User agent
- Changed by (customer/admin)

### Marketing Opt-Out

**Self-Service Endpoint:**

```
POST /api/v1/consent/marketing/opt-out
{
  "email": "customer@example.com"
}
```

**Unsubscribe Link:**
All marketing emails include unsubscribe link that triggers automatic opt-out.

---

## Data Breach Notification Procedures

### Detection

1. **Automated Monitoring**
   - Failed authentication attempts
   - Unusual data access patterns
   - System integrity checks

2. **Manual Reporting**
   - Employee breach reports
   - Customer reports
   - Third-party notifications

### Assessment (Within 24 Hours)

1. Identify scope of breach
2. Determine affected data categories
3. Assess risk to data subjects
4. Document findings

### Notification Requirements

| Recipient             | Timeline            | Threshold                        |
| --------------------- | ------------------- | -------------------------------- |
| Supervisory Authority | 72 hours            | Any personal data breach         |
| Data Subjects         | Without undue delay | High risk to rights/freedoms     |
| Data Processors       | Immediately         | Any breach affecting shared data |

### Notification Content

**To Authorities:**

- Nature of breach
- Categories/number of subjects affected
- Categories/number of records affected
- DPO contact information
- Likely consequences
- Mitigation measures

**To Data Subjects:**

- Plain language description
- DPO contact information
- Likely consequences
- Mitigation measures taken
- Recommendations for protection

### Incident Response Team

| Role                    | Responsibility          |
| ----------------------- | ----------------------- |
| Data Protection Officer | Overall coordination    |
| IT Security             | Technical investigation |
| Legal                   | Regulatory notification |
| Communications          | Customer notification   |
| Operations              | Service continuity      |

---

## Data Processing Agreement Requirements

### Required Clauses

1. **Subject Matter and Duration**
   - Description of processing
   - Duration of agreement

2. **Nature and Purpose**
   - Specific processing activities
   - Business purposes served

3. **Data Types**
   - Categories of personal data
   - Categories of data subjects

4. **Controller Obligations**
   - Instructions to processor
   - Compliance verification rights

5. **Processor Obligations**
   - Process only on instructions
   - Ensure staff confidentiality
   - Implement security measures
   - Engage sub-processors only with consent
   - Assist with data subject requests
   - Support controller compliance
   - Delete/return data at end of service
   - Allow audits

6. **Sub-Processor Requirements**
   - Written authorization required
   - Same obligations as processor
   - Liability for sub-processor actions

7. **International Transfers**
   - Standard contractual clauses
   - Adequacy decisions
   - Binding corporate rules

### Template Location

DPA templates available at: `/docs/templates/DPA_TEMPLATE.docx`

---

## Technical Implementation

### Service Architecture

```
+-------------------+     +------------------------+
|   API Gateway     |---->| Data Retention Service |
+-------------------+     +------------------------+
                                    |
                          +---------+---------+
                          |         |         |
                          v         v         v
                    +-------+  +-------+  +-------+
                    | GDPR  |  |Consent|  |Retain |
                    |Service|  |Service|  |Service|
                    +-------+  +-------+  +-------+
                          |         |         |
                          +---------+---------+
                                    |
                                    v
                          +-------------------+
                          |    PostgreSQL     |
                          | (Encrypted at rest)|
                          +-------------------+
```

### Database Schema

**GDPR Requests Table:**

```sql
CREATE TABLE gdpr_requests (
    id UUID PRIMARY KEY,
    customer_id UUID NOT NULL,
    dealership_id UUID NOT NULL,
    request_type VARCHAR(50) NOT NULL,  -- export, delete, anonymize
    status VARCHAR(50) NOT NULL,         -- pending, processing, completed, failed
    requested_by VARCHAR(100),
    reason TEXT,
    processed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

**Customer Consent Table:**

```sql
CREATE TABLE customer_consent (
    id UUID PRIMARY KEY,
    customer_id UUID NOT NULL,
    dealership_id UUID NOT NULL,
    marketing_email BOOLEAN NOT NULL DEFAULT false,
    marketing_sms BOOLEAN NOT NULL DEFAULT false,
    marketing_phone BOOLEAN NOT NULL DEFAULT false,
    data_processing BOOLEAN NOT NULL DEFAULT true,
    third_party_sharing BOOLEAN NOT NULL DEFAULT false,
    analytics BOOLEAN NOT NULL DEFAULT true,
    consent_version VARCHAR(20) NOT NULL,
    ip_address VARCHAR(45),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

**Consent History Table:**

```sql
CREATE TABLE consent_history (
    id UUID PRIMARY KEY,
    customer_id UUID NOT NULL,
    dealership_id UUID NOT NULL,
    consent_type VARCHAR(50) NOT NULL,
    old_value BOOLEAN,
    new_value BOOLEAN NOT NULL,
    changed_by VARCHAR(100),
    ip_address VARCHAR(45),
    created_at TIMESTAMP NOT NULL
);
```

**Audit Log Table:**

```sql
CREATE TABLE data_audit_log (
    id UUID PRIMARY KEY,
    dealership_id UUID,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    performed_by VARCHAR(100),
    ip_address VARCHAR(45),
    old_data JSONB,
    new_data JSONB,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL
);
```

### Encryption

**PII Field Encryption:**

- Algorithm: AES-256-GCM
- Key rotation: Supported
- Fields: SSN, Driver's License, Credit Score, Monthly Income

**Database Encryption:**

- Encryption at rest: Enabled
- TLS for connections: Required

---

## API Reference

### GDPR Endpoints

#### Export Customer Data

```
POST /api/v1/gdpr/export/{customer_id}?dealership_id={dealership_id}

Response:
{
  "exported_at": "2024-01-15T10:30:00Z",
  "customer_id": "uuid",
  "customer": { ... },
  "deals": [ ... ],
  "showroom_visits": [ ... ],
  "email_logs": [ ... ],
  "consent": { ... }
}
```

#### Delete Customer Data

```
POST /api/v1/gdpr/delete/{customer_id}?dealership_id={dealership_id}

Request:
{
  "reason": "Customer request",
  "retain_for_legal": true
}

Response:
{
  "status": "success",
  "request_id": "uuid",
  "message": "Customer data has been deleted",
  "details": {
    "customer_deleted": true,
    "deals_deleted": 3,
    "visits_deleted": 5,
    "emails_deleted": 12,
    "retained_for_legal": true,
    "retention_expires_at": "2031-01-15T00:00:00Z"
  }
}
```

#### Get Retention Status

```
GET /api/v1/gdpr/retention-status?dealership_id={dealership_id}

Response:
{
  "policies": [ ... ],
  "stats": {
    "active_customers": 1500,
    "deleted_customers": 45,
    "anonymized_customers": 120,
    "pending_gdpr_requests": 3,
    "expiring_within_30_days": 15
  }
}
```

### Consent Endpoints

#### Get Customer Consent

```
GET /api/v1/consent/{customer_id}?dealership_id={dealership_id}

Response:
{
  "customer_id": "uuid",
  "marketing_email": true,
  "marketing_sms": false,
  "marketing_phone": false,
  "data_processing": true,
  "third_party_sharing": false,
  "analytics": true,
  "consent_version": "1.0",
  "updated_at": "2024-01-10T15:30:00Z"
}
```

#### Update Customer Consent

```
PUT /api/v1/consent/{customer_id}?dealership_id={dealership_id}

Request:
{
  "marketing_email": false,
  "marketing_sms": false
}

Response:
{
  "customer_id": "uuid",
  "marketing_email": false,
  "marketing_sms": false,
  "marketing_phone": false,
  "data_processing": true,
  "third_party_sharing": false,
  "analytics": true,
  "consent_version": "1.0",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

#### Marketing Opt-Out

```
POST /api/v1/consent/marketing/opt-out

Request:
{
  "email": "customer@example.com"
}

Response:
{
  "status": "success",
  "message": "You have been successfully opted out of marketing communications"
}
```

---

## Compliance Checklist

### GDPR Requirements

- [x] Lawful basis documented for all processing
- [x] Data inventory maintained
- [x] Retention periods defined and enforced
- [x] Data subject rights procedures implemented
- [x] Consent management system implemented
- [x] Breach notification procedures documented
- [x] DPA template available
- [x] PII encryption implemented
- [x] Audit logging implemented
- [x] Automated data cleanup jobs

### CCPA Requirements

- [x] "Do Not Sell My Personal Information" support
- [x] Right to know (data access)
- [x] Right to delete
- [x] Right to opt-out of sale
- [x] Non-discrimination for exercising rights

---

## Contact Information

**Data Protection Officer:**
Email: dpo@autolytiq.com
Phone: 1-800-XXX-XXXX

**Privacy Inquiries:**
Email: privacy@autolytiq.com

**Security Incidents:**
Email: security@autolytiq.com

---

_This document is reviewed quarterly and updated as regulations evolve._
