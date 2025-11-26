package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"autolytiq/services/shared/logging"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
)

// Database wraps the SQL database connection
type Database struct {
	conn   *sql.DB
	logger *logging.Logger
}

// NewDatabase creates a new database connection
func NewDatabase(databaseURL string, logger *logging.Logger) (*Database, error) {
	conn, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Configure connection pool
	conn.SetMaxOpenConns(25)
	conn.SetMaxIdleConns(5)
	conn.SetConnMaxLifetime(5 * time.Minute)

	// Verify connection
	if err := conn.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	logger.Info("Database connected successfully")

	return &Database{conn: conn, logger: logger}, nil
}

// Close closes the database connection
func (db *Database) Close() error {
	return db.conn.Close()
}

// InitSchema creates the GDPR/retention-related tables
func (db *Database) InitSchema() error {
	schema := `
	-- Enable UUID extension if not exists
	CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

	-- Retention Policies
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

	-- GDPR Requests
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

	-- Customer Consent
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

	-- Consent History (Audit Trail)
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

	-- Data Audit Log
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

	-- Add GDPR columns to customers table if not exists
	DO $$
	BEGIN
		-- deleted_at for soft deletes
		IF NOT EXISTS (SELECT 1 FROM information_schema.columns
			WHERE table_name = 'customers' AND column_name = 'deleted_at') THEN
			ALTER TABLE customers ADD COLUMN deleted_at TIMESTAMP;
		END IF;

		-- retention_expires_at for automatic deletion
		IF NOT EXISTS (SELECT 1 FROM information_schema.columns
			WHERE table_name = 'customers' AND column_name = 'retention_expires_at') THEN
			ALTER TABLE customers ADD COLUMN retention_expires_at TIMESTAMP;
		END IF;

		-- anonymized_at for tracking anonymization
		IF NOT EXISTS (SELECT 1 FROM information_schema.columns
			WHERE table_name = 'customers' AND column_name = 'anonymized_at') THEN
			ALTER TABLE customers ADD COLUMN anonymized_at TIMESTAMP;
		END IF;

		-- last_activity_at for retention calculation
		IF NOT EXISTS (SELECT 1 FROM information_schema.columns
			WHERE table_name = 'customers' AND column_name = 'last_activity_at') THEN
			ALTER TABLE customers ADD COLUMN last_activity_at TIMESTAMP DEFAULT NOW();
		END IF;
	END $$;

	-- Add GDPR columns to deals table if not exists
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

	-- Add GDPR columns to email_logs table if not exists
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

	-- Add GDPR columns to showroom_visits table if not exists
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

	-- Create indexes for soft delete queries
	CREATE INDEX IF NOT EXISTS idx_customers_deleted ON customers(deleted_at) WHERE deleted_at IS NULL;
	CREATE INDEX IF NOT EXISTS idx_customers_retention ON customers(retention_expires_at) WHERE retention_expires_at IS NOT NULL;
	CREATE INDEX IF NOT EXISTS idx_deals_deleted ON deals(deleted_at) WHERE deleted_at IS NULL;
	CREATE INDEX IF NOT EXISTS idx_deals_retention ON deals(retention_expires_at) WHERE retention_expires_at IS NOT NULL;
	`

	if _, err := db.conn.Exec(schema); err != nil {
		return fmt.Errorf("failed to initialize schema: %w", err)
	}

	db.logger.Info("GDPR schema initialized successfully")
	return nil
}

// SeedDefaultPolicies creates default retention policies
func (db *Database) SeedDefaultPolicies() error {
	policies := []struct {
		Name          string
		EntityType    string
		RetentionDays int
		Action        string
		Description   string
		LegalBasis    string
	}{
		{
			Name:          "customer_data",
			EntityType:    "customer",
			RetentionDays: 2555, // 7 years
			Action:        "anonymize",
			Description:   "Customer personal data retention after last activity",
			LegalBasis:    "Legal obligation - tax and accounting records",
		},
		{
			Name:          "deal_data",
			EntityType:    "deal",
			RetentionDays: 2555, // 7 years
			Action:        "anonymize",
			Description:   "Deal/transaction data retention after completion",
			LegalBasis:    "Legal obligation - financial records",
		},
		{
			Name:          "audit_logs",
			EntityType:    "audit_log",
			RetentionDays: 1095, // 3 years
			Action:        "delete",
			Description:   "System audit logs retention",
			LegalBasis:    "Legitimate interest - security and compliance",
		},
		{
			Name:          "session_data",
			EntityType:    "session",
			RetentionDays: 30,
			Action:        "delete",
			Description:   "User session data retention",
			LegalBasis:    "Legitimate interest - service delivery",
		},
		{
			Name:          "email_logs",
			EntityType:    "email_log",
			RetentionDays: 365, // 1 year
			Action:        "delete",
			Description:   "Email communication logs retention",
			LegalBasis:    "Legitimate interest - customer service",
		},
		{
			Name:          "showroom_visits",
			EntityType:    "showroom_visit",
			RetentionDays: 2555, // 7 years (part of deal history)
			Action:        "anonymize",
			Description:   "Showroom visit data retention",
			LegalBasis:    "Legal obligation - sales records",
		},
	}

	for _, p := range policies {
		query := `
			INSERT INTO retention_policies (name, entity_type, retention_days, action, description, legal_basis)
			VALUES ($1, $2, $3, $4, $5, $6)
			ON CONFLICT (name) DO UPDATE SET
				retention_days = EXCLUDED.retention_days,
				action = EXCLUDED.action,
				description = EXCLUDED.description,
				legal_basis = EXCLUDED.legal_basis,
				updated_at = NOW()
		`
		if _, err := db.conn.Exec(query, p.Name, p.EntityType, p.RetentionDays, p.Action, p.Description, p.LegalBasis); err != nil {
			return fmt.Errorf("failed to seed policy %s: %w", p.Name, err)
		}
	}

	db.logger.Info("Default retention policies seeded")
	return nil
}

// GDPR Request Operations

// CreateGDPRRequest creates a new GDPR request
func (db *Database) CreateGDPRRequest(ctx context.Context, req *GDPRRequest) error {
	req.ID = uuid.New().String()
	req.CreatedAt = time.Now()
	req.UpdatedAt = time.Now()

	query := `
		INSERT INTO gdpr_requests (id, customer_id, dealership_id, request_type, status, requested_by, reason, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	_, err := db.conn.ExecContext(ctx, query,
		req.ID, req.CustomerID, req.DealershipID, req.RequestType,
		req.Status, req.RequestedBy, req.Reason, req.CreatedAt, req.UpdatedAt)

	return err
}

// GetGDPRRequest retrieves a GDPR request by ID
func (db *Database) GetGDPRRequest(ctx context.Context, id string) (*GDPRRequest, error) {
	query := `
		SELECT id, customer_id, dealership_id, request_type, status, requested_by, reason, notes, processed_at, created_at, updated_at
		FROM gdpr_requests
		WHERE id = $1
	`

	var req GDPRRequest
	var processedAt sql.NullTime
	var notes sql.NullString

	err := db.conn.QueryRowContext(ctx, query, id).Scan(
		&req.ID, &req.CustomerID, &req.DealershipID, &req.RequestType,
		&req.Status, &req.RequestedBy, &req.Reason, &notes, &processedAt,
		&req.CreatedAt, &req.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("request not found")
	}
	if err != nil {
		return nil, err
	}

	if processedAt.Valid {
		req.ProcessedAt = &processedAt.Time
	}
	if notes.Valid {
		req.Notes = notes.String
	}

	return &req, nil
}

// ListGDPRRequests lists GDPR requests with optional filters
func (db *Database) ListGDPRRequests(ctx context.Context, dealershipID, requestType, status string) ([]*GDPRRequest, error) {
	query := `
		SELECT id, customer_id, dealership_id, request_type, status, requested_by, reason, notes, processed_at, created_at, updated_at
		FROM gdpr_requests
		WHERE 1=1
	`
	args := []interface{}{}
	argIdx := 1

	if dealershipID != "" {
		query += fmt.Sprintf(" AND dealership_id = $%d", argIdx)
		args = append(args, dealershipID)
		argIdx++
	}
	if requestType != "" {
		query += fmt.Sprintf(" AND request_type = $%d", argIdx)
		args = append(args, requestType)
		argIdx++
	}
	if status != "" {
		query += fmt.Sprintf(" AND status = $%d", argIdx)
		args = append(args, status)
	}

	query += " ORDER BY created_at DESC LIMIT 100"

	rows, err := db.conn.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []*GDPRRequest
	for rows.Next() {
		var req GDPRRequest
		var processedAt sql.NullTime
		var notes sql.NullString

		err := rows.Scan(
			&req.ID, &req.CustomerID, &req.DealershipID, &req.RequestType,
			&req.Status, &req.RequestedBy, &req.Reason, &notes, &processedAt,
			&req.CreatedAt, &req.UpdatedAt)
		if err != nil {
			return nil, err
		}

		if processedAt.Valid {
			req.ProcessedAt = &processedAt.Time
		}
		if notes.Valid {
			req.Notes = notes.String
		}

		requests = append(requests, &req)
	}

	return requests, nil
}

// UpdateGDPRRequestStatus updates the status of a GDPR request
func (db *Database) UpdateGDPRRequestStatus(ctx context.Context, id, status, notes string) error {
	query := `
		UPDATE gdpr_requests
		SET status = $2, notes = $3, updated_at = NOW()
		WHERE id = $1
	`
	if status == "completed" || status == "failed" {
		query = `
			UPDATE gdpr_requests
			SET status = $2, notes = $3, processed_at = NOW(), updated_at = NOW()
			WHERE id = $1
		`
	}

	result, err := db.conn.ExecContext(ctx, query, id, status, notes)
	if err != nil {
		return err
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("request not found")
	}

	return nil
}

// Consent Operations

// GetConsent retrieves consent for a customer
func (db *Database) GetConsent(ctx context.Context, customerID, dealershipID string) (*CustomerConsent, error) {
	query := `
		SELECT id, customer_id, dealership_id, marketing_email, marketing_sms, marketing_phone,
		       data_processing, third_party_sharing, analytics, consent_version, created_at, updated_at
		FROM customer_consent
		WHERE customer_id = $1 AND dealership_id = $2
	`

	var consent CustomerConsent
	err := db.conn.QueryRowContext(ctx, query, customerID, dealershipID).Scan(
		&consent.ID, &consent.CustomerID, &consent.DealershipID,
		&consent.MarketingEmail, &consent.MarketingSMS, &consent.MarketingPhone,
		&consent.DataProcessing, &consent.ThirdPartySharing, &consent.Analytics,
		&consent.ConsentVersion, &consent.CreatedAt, &consent.UpdatedAt)

	if err == sql.ErrNoRows {
		// Return default consent (all marketing off, processing on)
		return &CustomerConsent{
			CustomerID:        customerID,
			DealershipID:      dealershipID,
			MarketingEmail:    false,
			MarketingSMS:      false,
			MarketingPhone:    false,
			DataProcessing:    true,
			ThirdPartySharing: false,
			Analytics:         true,
			ConsentVersion:    "1.0",
		}, nil
	}
	if err != nil {
		return nil, err
	}

	return &consent, nil
}

// UpsertConsent creates or updates consent for a customer
func (db *Database) UpsertConsent(ctx context.Context, consent *CustomerConsent) error {
	query := `
		INSERT INTO customer_consent (
			id, customer_id, dealership_id, marketing_email, marketing_sms, marketing_phone,
			data_processing, third_party_sharing, analytics, consent_version, ip_address, user_agent,
			created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		ON CONFLICT (customer_id, dealership_id) DO UPDATE SET
			marketing_email = EXCLUDED.marketing_email,
			marketing_sms = EXCLUDED.marketing_sms,
			marketing_phone = EXCLUDED.marketing_phone,
			data_processing = EXCLUDED.data_processing,
			third_party_sharing = EXCLUDED.third_party_sharing,
			analytics = EXCLUDED.analytics,
			consent_version = EXCLUDED.consent_version,
			ip_address = EXCLUDED.ip_address,
			user_agent = EXCLUDED.user_agent,
			updated_at = NOW()
	`

	if consent.ID == "" {
		consent.ID = uuid.New().String()
	}
	consent.CreatedAt = time.Now()
	consent.UpdatedAt = time.Now()

	_, err := db.conn.ExecContext(ctx, query,
		consent.ID, consent.CustomerID, consent.DealershipID,
		consent.MarketingEmail, consent.MarketingSMS, consent.MarketingPhone,
		consent.DataProcessing, consent.ThirdPartySharing, consent.Analytics,
		consent.ConsentVersion, consent.IPAddress, consent.UserAgent,
		consent.CreatedAt, consent.UpdatedAt)

	return err
}

// CreateConsentHistory records a consent change
func (db *Database) CreateConsentHistory(ctx context.Context, history *ConsentHistory) error {
	query := `
		INSERT INTO consent_history (id, customer_id, dealership_id, consent_type, old_value, new_value, changed_by, ip_address, user_agent, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`

	_, err := db.conn.ExecContext(ctx, query,
		uuid.New().String(), history.CustomerID, history.DealershipID,
		history.ConsentType, history.OldValue, history.NewValue,
		history.ChangedBy, history.IPAddress, history.UserAgent, time.Now())

	return err
}

// GetConsentHistory retrieves consent history for a customer
func (db *Database) GetConsentHistory(ctx context.Context, customerID, dealershipID string) ([]*ConsentHistory, error) {
	query := `
		SELECT id, customer_id, dealership_id, consent_type, old_value, new_value, changed_by, ip_address, created_at
		FROM consent_history
		WHERE customer_id = $1 AND dealership_id = $2
		ORDER BY created_at DESC
		LIMIT 100
	`

	rows, err := db.conn.QueryContext(ctx, query, customerID, dealershipID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var history []*ConsentHistory
	for rows.Next() {
		var h ConsentHistory
		var oldValue sql.NullBool
		var ipAddress sql.NullString

		err := rows.Scan(&h.ID, &h.CustomerID, &h.DealershipID, &h.ConsentType,
			&oldValue, &h.NewValue, &h.ChangedBy, &ipAddress, &h.CreatedAt)
		if err != nil {
			return nil, err
		}

		if oldValue.Valid {
			h.OldValue = &oldValue.Bool
		}
		if ipAddress.Valid {
			h.IPAddress = ipAddress.String
		}

		history = append(history, &h)
	}

	return history, nil
}

// Retention Policy Operations

// ListRetentionPolicies lists all retention policies
func (db *Database) ListRetentionPolicies(ctx context.Context) ([]*RetentionPolicy, error) {
	query := `
		SELECT id, name, entity_type, retention_days, action, description, is_active, legal_basis, created_at, updated_at
		FROM retention_policies
		ORDER BY entity_type, name
	`

	rows, err := db.conn.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var policies []*RetentionPolicy
	for rows.Next() {
		var p RetentionPolicy
		var legalBasis sql.NullString

		err := rows.Scan(&p.ID, &p.Name, &p.EntityType, &p.RetentionDays,
			&p.Action, &p.Description, &p.IsActive, &legalBasis, &p.CreatedAt, &p.UpdatedAt)
		if err != nil {
			return nil, err
		}

		if legalBasis.Valid {
			p.LegalBasis = legalBasis.String
		}

		policies = append(policies, &p)
	}

	return policies, nil
}

// GetRetentionPolicy retrieves a retention policy by ID
func (db *Database) GetRetentionPolicy(ctx context.Context, id string) (*RetentionPolicy, error) {
	query := `
		SELECT id, name, entity_type, retention_days, action, description, is_active, legal_basis, created_at, updated_at
		FROM retention_policies
		WHERE id = $1
	`

	var p RetentionPolicy
	var legalBasis sql.NullString

	err := db.conn.QueryRowContext(ctx, query, id).Scan(
		&p.ID, &p.Name, &p.EntityType, &p.RetentionDays,
		&p.Action, &p.Description, &p.IsActive, &legalBasis, &p.CreatedAt, &p.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("policy not found")
	}
	if err != nil {
		return nil, err
	}

	if legalBasis.Valid {
		p.LegalBasis = legalBasis.String
	}

	return &p, nil
}

// GetRetentionPolicyByEntityType retrieves a retention policy by entity type
func (db *Database) GetRetentionPolicyByEntityType(ctx context.Context, entityType string) (*RetentionPolicy, error) {
	query := `
		SELECT id, name, entity_type, retention_days, action, description, is_active, legal_basis, created_at, updated_at
		FROM retention_policies
		WHERE entity_type = $1 AND is_active = true
		LIMIT 1
	`

	var p RetentionPolicy
	var legalBasis sql.NullString

	err := db.conn.QueryRowContext(ctx, query, entityType).Scan(
		&p.ID, &p.Name, &p.EntityType, &p.RetentionDays,
		&p.Action, &p.Description, &p.IsActive, &legalBasis, &p.CreatedAt, &p.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("policy not found for entity type: %s", entityType)
	}
	if err != nil {
		return nil, err
	}

	if legalBasis.Valid {
		p.LegalBasis = legalBasis.String
	}

	return &p, nil
}

// CreateRetentionPolicy creates a new retention policy
func (db *Database) CreateRetentionPolicy(ctx context.Context, policy *RetentionPolicy) error {
	policy.ID = uuid.New().String()
	policy.CreatedAt = time.Now()
	policy.UpdatedAt = time.Now()

	query := `
		INSERT INTO retention_policies (id, name, entity_type, retention_days, action, description, is_active, legal_basis, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`

	_, err := db.conn.ExecContext(ctx, query,
		policy.ID, policy.Name, policy.EntityType, policy.RetentionDays,
		policy.Action, policy.Description, policy.IsActive, policy.LegalBasis,
		policy.CreatedAt, policy.UpdatedAt)

	return err
}

// UpdateRetentionPolicy updates a retention policy
func (db *Database) UpdateRetentionPolicy(ctx context.Context, policy *RetentionPolicy) error {
	policy.UpdatedAt = time.Now()

	query := `
		UPDATE retention_policies
		SET name = $2, entity_type = $3, retention_days = $4, action = $5,
		    description = $6, is_active = $7, legal_basis = $8, updated_at = $9
		WHERE id = $1
	`

	result, err := db.conn.ExecContext(ctx, query,
		policy.ID, policy.Name, policy.EntityType, policy.RetentionDays,
		policy.Action, policy.Description, policy.IsActive, policy.LegalBasis,
		policy.UpdatedAt)

	if err != nil {
		return err
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("policy not found")
	}

	return nil
}

// DeleteRetentionPolicy deletes a retention policy
func (db *Database) DeleteRetentionPolicy(ctx context.Context, id string) error {
	query := `DELETE FROM retention_policies WHERE id = $1`

	result, err := db.conn.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("policy not found")
	}

	return nil
}

// Audit Log Operations

// CreateAuditLog creates an audit log entry
func (db *Database) CreateAuditLog(ctx context.Context, log *AuditLog) error {
	oldDataJSON, _ := json.Marshal(log.OldData)
	newDataJSON, _ := json.Marshal(log.NewData)
	metadataJSON, _ := json.Marshal(log.Metadata)

	query := `
		INSERT INTO data_audit_log (id, dealership_id, entity_type, entity_id, action, performed_by, ip_address, old_data, new_data, metadata, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`

	_, err := db.conn.ExecContext(ctx, query,
		uuid.New().String(), log.DealershipID, log.EntityType, log.EntityID,
		log.Action, log.PerformedBy, log.IPAddress,
		oldDataJSON, newDataJSON, metadataJSON, time.Now())

	return err
}

// ListAuditLogs lists audit logs with optional filters
func (db *Database) ListAuditLogs(ctx context.Context, dealershipID, entityType, entityID, action string, limit, offset int) ([]*AuditLog, error) {
	query := `
		SELECT id, dealership_id, entity_type, entity_id, action, performed_by, ip_address, old_data, new_data, metadata, created_at
		FROM data_audit_log
		WHERE 1=1
	`
	args := []interface{}{}
	argIdx := 1

	if dealershipID != "" {
		query += fmt.Sprintf(" AND dealership_id = $%d", argIdx)
		args = append(args, dealershipID)
		argIdx++
	}
	if entityType != "" {
		query += fmt.Sprintf(" AND entity_type = $%d", argIdx)
		args = append(args, entityType)
		argIdx++
	}
	if entityID != "" {
		query += fmt.Sprintf(" AND entity_id = $%d", argIdx)
		args = append(args, entityID)
		argIdx++
	}
	if action != "" {
		query += fmt.Sprintf(" AND action = $%d", argIdx)
		args = append(args, action)
		argIdx++
	}

	query += fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d OFFSET $%d", argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := db.conn.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []*AuditLog
	for rows.Next() {
		var log AuditLog
		var oldDataJSON, newDataJSON, metadataJSON []byte
		var dealershipID, ipAddress sql.NullString

		err := rows.Scan(&log.ID, &dealershipID, &log.EntityType, &log.EntityID,
			&log.Action, &log.PerformedBy, &ipAddress,
			&oldDataJSON, &newDataJSON, &metadataJSON, &log.CreatedAt)
		if err != nil {
			return nil, err
		}

		if dealershipID.Valid {
			log.DealershipID = dealershipID.String
		}
		if ipAddress.Valid {
			log.IPAddress = ipAddress.String
		}

		if len(oldDataJSON) > 0 {
			json.Unmarshal(oldDataJSON, &log.OldData)
		}
		if len(newDataJSON) > 0 {
			json.Unmarshal(newDataJSON, &log.NewData)
		}
		if len(metadataJSON) > 0 {
			json.Unmarshal(metadataJSON, &log.Metadata)
		}

		logs = append(logs, &log)
	}

	return logs, nil
}

// GetAuditLog retrieves a specific audit log
func (db *Database) GetAuditLog(ctx context.Context, id string) (*AuditLog, error) {
	query := `
		SELECT id, dealership_id, entity_type, entity_id, action, performed_by, ip_address, old_data, new_data, metadata, created_at
		FROM data_audit_log
		WHERE id = $1
	`

	var log AuditLog
	var oldDataJSON, newDataJSON, metadataJSON []byte
	var dealershipID, ipAddress sql.NullString

	err := db.conn.QueryRowContext(ctx, query, id).Scan(
		&log.ID, &dealershipID, &log.EntityType, &log.EntityID,
		&log.Action, &log.PerformedBy, &ipAddress,
		&oldDataJSON, &newDataJSON, &metadataJSON, &log.CreatedAt)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("audit log not found")
	}
	if err != nil {
		return nil, err
	}

	if dealershipID.Valid {
		log.DealershipID = dealershipID.String
	}
	if ipAddress.Valid {
		log.IPAddress = ipAddress.String
	}

	if len(oldDataJSON) > 0 {
		json.Unmarshal(oldDataJSON, &log.OldData)
	}
	if len(newDataJSON) > 0 {
		json.Unmarshal(newDataJSON, &log.NewData)
	}
	if len(metadataJSON) > 0 {
		json.Unmarshal(metadataJSON, &log.Metadata)
	}

	return &log, nil
}

// Customer Data Operations for GDPR

// GetCustomerWithRelatedData retrieves all customer data for export
func (db *Database) GetCustomerWithRelatedData(ctx context.Context, customerID, dealershipID string) (*CustomerExportData, error) {
	export := &CustomerExportData{
		ExportedAt: time.Now(),
		CustomerID: customerID,
	}

	// Get customer data
	customerQuery := `
		SELECT id, dealership_id, first_name, last_name, email, phone, address, city, state, zip_code,
		       credit_score, notes, source, created_at, updated_at, last_activity_at
		FROM customers
		WHERE id = $1 AND dealership_id = $2 AND deleted_at IS NULL
	`
	var customer CustomerData
	var lastActivity sql.NullTime
	err := db.conn.QueryRowContext(ctx, customerQuery, customerID, dealershipID).Scan(
		&customer.ID, &customer.DealershipID, &customer.FirstName, &customer.LastName,
		&customer.Email, &customer.Phone, &customer.Address, &customer.City,
		&customer.State, &customer.ZipCode, &customer.CreditScore, &customer.Notes,
		&customer.Source, &customer.CreatedAt, &customer.UpdatedAt, &lastActivity)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("customer not found")
	}
	if err != nil {
		return nil, err
	}

	if lastActivity.Valid {
		customer.LastActivityAt = &lastActivity.Time
	}
	export.Customer = customer

	// Get deals
	dealsQuery := `
		SELECT id, vehicle_id, type, status, sale_price, trade_in_value, down_payment,
		       financing_term, interest_rate, monthly_payment, taxes, fees, total_price, created_at
		FROM deals
		WHERE customer_id = $1 AND dealership_id = $2 AND deleted_at IS NULL
	`
	rows, err := db.conn.QueryContext(ctx, dealsQuery, customerID, dealershipID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var deal DealData
		err := rows.Scan(&deal.ID, &deal.VehicleID, &deal.Type, &deal.Status,
			&deal.SalePrice, &deal.TradeInValue, &deal.DownPayment,
			&deal.FinancingTerm, &deal.InterestRate, &deal.MonthlyPayment,
			&deal.Taxes, &deal.Fees, &deal.TotalPrice, &deal.CreatedAt)
		if err != nil {
			return nil, err
		}
		export.Deals = append(export.Deals, deal)
	}

	// Get showroom visits
	visitsQuery := `
		SELECT id, salesperson_id, vehicle_id, check_in_time, check_out_time, status, source, created_at
		FROM showroom_visits
		WHERE customer_id = $1 AND dealership_id = $2 AND deleted_at IS NULL
	`
	visitRows, err := db.conn.QueryContext(ctx, visitsQuery, customerID, dealershipID)
	if err != nil {
		return nil, err
	}
	defer visitRows.Close()

	for visitRows.Next() {
		var visit ShowroomVisitData
		var checkOutTime sql.NullTime
		var vehicleID, salespersonID, source sql.NullString

		err := visitRows.Scan(&visit.ID, &salespersonID, &vehicleID,
			&visit.CheckInTime, &checkOutTime, &visit.Status, &source, &visit.CreatedAt)
		if err != nil {
			return nil, err
		}

		if checkOutTime.Valid {
			visit.CheckOutTime = &checkOutTime.Time
		}
		if vehicleID.Valid {
			visit.VehicleID = vehicleID.String
		}
		if salespersonID.Valid {
			visit.SalespersonID = salespersonID.String
		}
		if source.Valid {
			visit.Source = source.String
		}

		export.ShowroomVisits = append(export.ShowroomVisits, visit)
	}

	// Get email logs
	emailQuery := `
		SELECT id, subject, status, sent_at, created_at
		FROM email_logs
		WHERE recipient_email = (SELECT email FROM customers WHERE id = $1)
		  AND dealership_id = $2 AND deleted_at IS NULL
	`
	emailRows, err := db.conn.QueryContext(ctx, emailQuery, customerID, dealershipID)
	if err != nil {
		return nil, err
	}
	defer emailRows.Close()

	for emailRows.Next() {
		var email EmailLogData
		var sentAt sql.NullTime

		err := emailRows.Scan(&email.ID, &email.Subject, &email.Status, &sentAt, &email.CreatedAt)
		if err != nil {
			return nil, err
		}

		if sentAt.Valid {
			email.SentAt = &sentAt.Time
		}

		export.EmailLogs = append(export.EmailLogs, email)
	}

	// Get consent
	consent, _ := db.GetConsent(ctx, customerID, dealershipID)
	export.Consent = consent

	return export, nil
}

// SoftDeleteCustomer marks a customer as deleted
func (db *Database) SoftDeleteCustomer(ctx context.Context, customerID, dealershipID string) error {
	query := `UPDATE customers SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND dealership_id = $2`
	_, err := db.conn.ExecContext(ctx, query, customerID, dealershipID)
	return err
}

// SoftDeleteCustomerDeals marks all customer deals as deleted
func (db *Database) SoftDeleteCustomerDeals(ctx context.Context, customerID, dealershipID string) (int64, error) {
	query := `UPDATE deals SET deleted_at = NOW(), updated_at = NOW() WHERE customer_id = $1 AND dealership_id = $2`
	result, err := db.conn.ExecContext(ctx, query, customerID, dealershipID)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}

// SoftDeleteCustomerVisits marks all customer showroom visits as deleted
func (db *Database) SoftDeleteCustomerVisits(ctx context.Context, customerID, dealershipID string) (int64, error) {
	query := `UPDATE showroom_visits SET deleted_at = NOW(), updated_at = NOW() WHERE customer_id = $1 AND dealership_id = $2`
	result, err := db.conn.ExecContext(ctx, query, customerID, dealershipID)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}

// SoftDeleteCustomerEmails marks all customer emails as deleted
func (db *Database) SoftDeleteCustomerEmails(ctx context.Context, customerID, dealershipID string) (int64, error) {
	query := `
		UPDATE email_logs SET deleted_at = NOW()
		WHERE recipient_email = (SELECT email FROM customers WHERE id = $1)
		  AND dealership_id = $2
	`
	result, err := db.conn.ExecContext(ctx, query, customerID, dealershipID)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}

// AnonymizeCustomer replaces customer PII with anonymized data
func (db *Database) AnonymizeCustomer(ctx context.Context, customerID, dealershipID string) error {
	query := `
		UPDATE customers SET
			first_name = 'ANONYMIZED',
			last_name = 'ANONYMIZED',
			email = CONCAT('anonymized_', id, '@deleted.local'),
			phone = 'ANONYMIZED',
			address = 'ANONYMIZED',
			city = 'ANONYMIZED',
			zip_code = 'ANONYMIZED',
			credit_score = NULL,
			notes = NULL,
			ssn_last4 = NULL,
			drivers_license_number = NULL,
			monthly_income = NULL,
			ssn_last4_encrypted = NULL,
			drivers_license_number_encrypted = NULL,
			credit_score_encrypted = NULL,
			monthly_income_encrypted = NULL,
			anonymized_at = NOW(),
			updated_at = NOW()
		WHERE id = $1 AND dealership_id = $2
	`
	_, err := db.conn.ExecContext(ctx, query, customerID, dealershipID)
	return err
}

// GetExpiredCustomers returns customers whose retention has expired
func (db *Database) GetExpiredCustomers(ctx context.Context, retentionDays int) ([]string, error) {
	query := `
		SELECT id FROM customers
		WHERE deleted_at IS NULL
		  AND anonymized_at IS NULL
		  AND (
			retention_expires_at < NOW()
			OR (retention_expires_at IS NULL AND last_activity_at < NOW() - INTERVAL '1 day' * $1)
		  )
		LIMIT 1000
	`

	rows, err := db.conn.QueryContext(ctx, query, retentionDays)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}

	return ids, nil
}

// GetRetentionStats returns statistics about data retention
func (db *Database) GetRetentionStats(ctx context.Context, dealershipID string) (*RetentionStats, error) {
	stats := &RetentionStats{}

	// Count active customers
	customerQuery := `
		SELECT COUNT(*) FROM customers WHERE deleted_at IS NULL
	`
	if dealershipID != "" {
		customerQuery += ` AND dealership_id = $1`
		db.conn.QueryRowContext(ctx, customerQuery, dealershipID).Scan(&stats.ActiveCustomers)
	} else {
		db.conn.QueryRowContext(ctx, customerQuery).Scan(&stats.ActiveCustomers)
	}

	// Count deleted customers
	deletedQuery := `
		SELECT COUNT(*) FROM customers WHERE deleted_at IS NOT NULL
	`
	if dealershipID != "" {
		deletedQuery += ` AND dealership_id = $1`
		db.conn.QueryRowContext(ctx, deletedQuery, dealershipID).Scan(&stats.DeletedCustomers)
	} else {
		db.conn.QueryRowContext(ctx, deletedQuery).Scan(&stats.DeletedCustomers)
	}

	// Count anonymized customers
	anonQuery := `
		SELECT COUNT(*) FROM customers WHERE anonymized_at IS NOT NULL
	`
	if dealershipID != "" {
		anonQuery += ` AND dealership_id = $1`
		db.conn.QueryRowContext(ctx, anonQuery, dealershipID).Scan(&stats.AnonymizedCustomers)
	} else {
		db.conn.QueryRowContext(ctx, anonQuery).Scan(&stats.AnonymizedCustomers)
	}

	// Count pending GDPR requests
	pendingQuery := `
		SELECT COUNT(*) FROM gdpr_requests WHERE status = 'pending'
	`
	if dealershipID != "" {
		pendingQuery += ` AND dealership_id = $1`
		db.conn.QueryRowContext(ctx, pendingQuery, dealershipID).Scan(&stats.PendingGDPRRequests)
	} else {
		db.conn.QueryRowContext(ctx, pendingQuery).Scan(&stats.PendingGDPRRequests)
	}

	// Count customers expiring soon (within 30 days)
	expiringSoonQuery := `
		SELECT COUNT(*) FROM customers
		WHERE deleted_at IS NULL AND anonymized_at IS NULL
		  AND retention_expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 days'
	`
	if dealershipID != "" {
		expiringSoonQuery += ` AND dealership_id = $1`
		db.conn.QueryRowContext(ctx, expiringSoonQuery, dealershipID).Scan(&stats.ExpiringWithin30Days)
	} else {
		db.conn.QueryRowContext(ctx, expiringSoonQuery).Scan(&stats.ExpiringWithin30Days)
	}

	return stats, nil
}

// FindCustomerByEmail finds a customer by email
func (db *Database) FindCustomerByEmail(ctx context.Context, email, dealershipID string) (string, error) {
	query := `SELECT id FROM customers WHERE email = $1 AND deleted_at IS NULL`
	args := []interface{}{email}

	if dealershipID != "" {
		query += ` AND dealership_id = $2`
		args = append(args, dealershipID)
	}

	query += ` LIMIT 1`

	var customerID string
	err := db.conn.QueryRowContext(ctx, query, args...).Scan(&customerID)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return customerID, err
}

// GetCustomerDealershipID gets the dealership ID for a customer
func (db *Database) GetCustomerDealershipID(ctx context.Context, customerID string) (string, error) {
	query := `SELECT dealership_id FROM customers WHERE id = $1`
	var dealershipID string
	err := db.conn.QueryRowContext(ctx, query, customerID).Scan(&dealershipID)
	return dealershipID, err
}
