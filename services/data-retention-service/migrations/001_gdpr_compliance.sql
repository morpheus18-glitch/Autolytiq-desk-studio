-- GDPR/CCPA Data Compliance Migration
-- This migration adds GDPR compliance tables and columns

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- Retention Policies Table
-- ===========================================
CREATE TABLE IF NOT EXISTS retention_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    entity_type VARCHAR(50) NOT NULL,
    retention_days INTEGER NOT NULL,
    action VARCHAR(50) NOT NULL DEFAULT 'delete',
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    legal_basis TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE retention_policies IS 'Defines data retention policies for different entity types';
COMMENT ON COLUMN retention_policies.action IS 'Action to take: delete, anonymize, or archive';
COMMENT ON COLUMN retention_policies.legal_basis IS 'Legal justification for the retention period';

-- ===========================================
-- GDPR Requests Table
-- ===========================================
CREATE TABLE IF NOT EXISTS gdpr_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL,
    dealership_id UUID NOT NULL,
    request_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    requested_by VARCHAR(100),
    reason TEXT,
    notes TEXT,
    processed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gdpr_requests_customer ON gdpr_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_dealership ON gdpr_requests(dealership_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_status ON gdpr_requests(status);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_type ON gdpr_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_created ON gdpr_requests(created_at);

COMMENT ON TABLE gdpr_requests IS 'Tracks GDPR data subject requests (export, delete, anonymize)';
COMMENT ON COLUMN gdpr_requests.request_type IS 'Type of request: export, delete, or anonymize';
COMMENT ON COLUMN gdpr_requests.status IS 'Request status: pending, processing, completed, failed';

-- ===========================================
-- Customer Consent Table
-- ===========================================
CREATE TABLE IF NOT EXISTS customer_consent (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL,
    dealership_id UUID NOT NULL,
    marketing_email BOOLEAN NOT NULL DEFAULT false,
    marketing_sms BOOLEAN NOT NULL DEFAULT false,
    marketing_phone BOOLEAN NOT NULL DEFAULT false,
    data_processing BOOLEAN NOT NULL DEFAULT true,
    third_party_sharing BOOLEAN NOT NULL DEFAULT false,
    analytics BOOLEAN NOT NULL DEFAULT true,
    consent_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(customer_id, dealership_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_consent_customer ON customer_consent(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_consent_dealership ON customer_consent(dealership_id);

COMMENT ON TABLE customer_consent IS 'Stores customer consent preferences for GDPR compliance';
COMMENT ON COLUMN customer_consent.consent_version IS 'Version of consent form/policy accepted';

-- ===========================================
-- Consent History Table (Audit Trail)
-- ===========================================
CREATE TABLE IF NOT EXISTS consent_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL,
    dealership_id UUID NOT NULL,
    consent_type VARCHAR(50) NOT NULL,
    old_value BOOLEAN,
    new_value BOOLEAN NOT NULL,
    changed_by VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_history_customer ON consent_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_consent_history_dealership ON consent_history(dealership_id);
CREATE INDEX IF NOT EXISTS idx_consent_history_created ON consent_history(created_at);

COMMENT ON TABLE consent_history IS 'Audit trail for all consent changes';

-- ===========================================
-- Data Audit Log Table
-- ===========================================
CREATE TABLE IF NOT EXISTS data_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dealership_id UUID,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    performed_by VARCHAR(100),
    ip_address VARCHAR(45),
    old_data JSONB,
    new_data JSONB,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_audit_log_dealership ON data_audit_log(dealership_id);
CREATE INDEX IF NOT EXISTS idx_data_audit_log_entity ON data_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_data_audit_log_action ON data_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_data_audit_log_created ON data_audit_log(created_at);

COMMENT ON TABLE data_audit_log IS 'Comprehensive audit log for all data operations';
COMMENT ON COLUMN data_audit_log.action IS 'Action type: create, read, update, delete, export, anonymize';

-- ===========================================
-- Add GDPR columns to customers table
-- ===========================================
DO $$
BEGIN
    -- deleted_at for soft deletes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'customers' AND column_name = 'deleted_at') THEN
        ALTER TABLE customers ADD COLUMN deleted_at TIMESTAMP;
        COMMENT ON COLUMN customers.deleted_at IS 'Soft delete timestamp for GDPR compliance';
    END IF;

    -- retention_expires_at for automatic deletion
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'customers' AND column_name = 'retention_expires_at') THEN
        ALTER TABLE customers ADD COLUMN retention_expires_at TIMESTAMP;
        COMMENT ON COLUMN customers.retention_expires_at IS 'Date when data should be deleted/anonymized';
    END IF;

    -- anonymized_at for tracking anonymization
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'customers' AND column_name = 'anonymized_at') THEN
        ALTER TABLE customers ADD COLUMN anonymized_at TIMESTAMP;
        COMMENT ON COLUMN customers.anonymized_at IS 'Date when PII was anonymized';
    END IF;

    -- last_activity_at for retention calculation
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'customers' AND column_name = 'last_activity_at') THEN
        ALTER TABLE customers ADD COLUMN last_activity_at TIMESTAMP DEFAULT NOW();
        COMMENT ON COLUMN customers.last_activity_at IS 'Last customer activity for retention calculation';
    END IF;
END $$;

-- ===========================================
-- Add GDPR columns to deals table
-- ===========================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'deals' AND column_name = 'deleted_at') THEN
        ALTER TABLE deals ADD COLUMN deleted_at TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'deals' AND column_name = 'retention_expires_at') THEN
        ALTER TABLE deals ADD COLUMN retention_expires_at TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'deals' AND column_name = 'anonymized_at') THEN
        ALTER TABLE deals ADD COLUMN anonymized_at TIMESTAMP;
    END IF;
END $$;

-- ===========================================
-- Add GDPR columns to email_logs table
-- ===========================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'email_logs' AND column_name = 'deleted_at') THEN
        ALTER TABLE email_logs ADD COLUMN deleted_at TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'email_logs' AND column_name = 'retention_expires_at') THEN
        ALTER TABLE email_logs ADD COLUMN retention_expires_at TIMESTAMP;
    END IF;
END $$;

-- ===========================================
-- Add GDPR columns to showroom_visits table
-- ===========================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'showroom_visits' AND column_name = 'deleted_at') THEN
        ALTER TABLE showroom_visits ADD COLUMN deleted_at TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'showroom_visits' AND column_name = 'retention_expires_at') THEN
        ALTER TABLE showroom_visits ADD COLUMN retention_expires_at TIMESTAMP;
    END IF;
END $$;

-- ===========================================
-- Create indexes for soft delete queries
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_customers_deleted ON customers(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customers_retention ON customers(retention_expires_at) WHERE retention_expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_anonymized ON customers(anonymized_at) WHERE anonymized_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_last_activity ON customers(last_activity_at);

CREATE INDEX IF NOT EXISTS idx_deals_deleted ON deals(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_deals_retention ON deals(retention_expires_at) WHERE retention_expires_at IS NOT NULL;

-- ===========================================
-- Seed Default Retention Policies
-- ===========================================
INSERT INTO retention_policies (name, entity_type, retention_days, action, description, legal_basis)
VALUES
    ('customer_data', 'customer', 2555, 'anonymize',
     'Customer personal data retention after last activity',
     'Legal obligation - tax and accounting records (7 years)'),
    ('deal_data', 'deal', 2555, 'anonymize',
     'Deal/transaction data retention after completion',
     'Legal obligation - financial records (7 years)'),
    ('audit_logs', 'audit_log', 1095, 'delete',
     'System audit logs retention',
     'Legitimate interest - security and compliance (3 years)'),
    ('session_data', 'session', 30, 'delete',
     'User session data retention',
     'Legitimate interest - service delivery'),
    ('email_logs', 'email_log', 365, 'delete',
     'Email communication logs retention',
     'Legitimate interest - customer service (1 year)'),
    ('showroom_visits', 'showroom_visit', 2555, 'anonymize',
     'Showroom visit data retention',
     'Legal obligation - sales records (7 years)')
ON CONFLICT (name) DO UPDATE SET
    retention_days = EXCLUDED.retention_days,
    action = EXCLUDED.action,
    description = EXCLUDED.description,
    legal_basis = EXCLUDED.legal_basis,
    updated_at = NOW();

-- ===========================================
-- Create helper functions
-- ===========================================

-- Function to update last_activity_at on customer interactions
CREATE OR REPLACE FUNCTION update_customer_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE customers
    SET last_activity_at = NOW(), updated_at = NOW()
    WHERE id = NEW.customer_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on deals to update customer activity
DROP TRIGGER IF EXISTS trg_update_customer_activity_on_deal ON deals;
CREATE TRIGGER trg_update_customer_activity_on_deal
    AFTER INSERT OR UPDATE ON deals
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_last_activity();

-- Trigger on showroom_visits to update customer activity
DROP TRIGGER IF EXISTS trg_update_customer_activity_on_visit ON showroom_visits;
CREATE TRIGGER trg_update_customer_activity_on_visit
    AFTER INSERT OR UPDATE ON showroom_visits
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_last_activity();

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'GDPR compliance migration completed successfully!';
END $$;
