package main

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/lib/pq"
	_ "github.com/lib/pq"
)

// PostgresEmailDatabase implements EmailDatabase using PostgreSQL
type PostgresEmailDatabase struct {
	db *sql.DB
}

// NewPostgresEmailDatabase creates a new PostgreSQL database connection
func NewPostgresEmailDatabase(connectionString string) (*PostgresEmailDatabase, error) {
	db, err := sql.Open("postgres", connectionString)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Configure connection pool
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Test connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return &PostgresEmailDatabase{db: db}, nil
}

// Close closes the database connection
func (p *PostgresEmailDatabase) Close() error {
	return p.db.Close()
}

// InitSchema initializes the database schema
func (p *PostgresEmailDatabase) InitSchema() error {
	schema := `
		-- =====================================================
		-- EXISTING TABLES
		-- =====================================================

		CREATE TABLE IF NOT EXISTS email_templates (
			id UUID PRIMARY KEY,
			dealership_id UUID NOT NULL,
			name VARCHAR(255) NOT NULL,
			subject VARCHAR(500) NOT NULL,
			body_html TEXT NOT NULL,
			variables TEXT[] NOT NULL DEFAULT '{}',
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP NOT NULL DEFAULT NOW()
		);

		CREATE INDEX IF NOT EXISTS idx_email_templates_dealership
			ON email_templates(dealership_id);
		CREATE INDEX IF NOT EXISTS idx_email_templates_name
			ON email_templates(dealership_id, name);

		CREATE TABLE IF NOT EXISTS email_logs (
			id UUID PRIMARY KEY,
			dealership_id UUID NOT NULL,
			recipient VARCHAR(255) NOT NULL,
			subject VARCHAR(500) NOT NULL,
			template_id UUID,
			status VARCHAR(50) NOT NULL DEFAULT 'pending',
			sent_at TIMESTAMP,
			error TEXT,
			created_at TIMESTAMP NOT NULL DEFAULT NOW()
		);

		CREATE INDEX IF NOT EXISTS idx_email_logs_dealership
			ON email_logs(dealership_id);
		CREATE INDEX IF NOT EXISTS idx_email_logs_status
			ON email_logs(dealership_id, status);
		CREATE INDEX IF NOT EXISTS idx_email_logs_created_at
			ON email_logs(dealership_id, created_at DESC);
		CREATE INDEX IF NOT EXISTS idx_email_logs_template
			ON email_logs(template_id);

		-- =====================================================
		-- INBOX TABLES - Gmail/Outlook-like functionality
		-- =====================================================

		-- Email threads for conversation grouping
		CREATE TABLE IF NOT EXISTS email_threads (
			id UUID PRIMARY KEY,
			dealership_id UUID NOT NULL,
			user_id UUID NOT NULL,
			subject VARCHAR(500) NOT NULL,
			snippet TEXT DEFAULT '',
			participants TEXT[] NOT NULL DEFAULT '{}',
			message_count INT NOT NULL DEFAULT 0,
			unread_count INT NOT NULL DEFAULT 0,
			is_starred BOOLEAN NOT NULL DEFAULT FALSE,
			is_important BOOLEAN NOT NULL DEFAULT FALSE,
			has_attachments BOOLEAN NOT NULL DEFAULT FALSE,
			labels TEXT[] NOT NULL DEFAULT '{}',
			last_message_at TIMESTAMP NOT NULL DEFAULT NOW(),
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP NOT NULL DEFAULT NOW()
		);

		CREATE INDEX IF NOT EXISTS idx_email_threads_dealership_user
			ON email_threads(dealership_id, user_id);
		CREATE INDEX IF NOT EXISTS idx_email_threads_last_message
			ON email_threads(dealership_id, user_id, last_message_at DESC);

		-- Main emails table
		CREATE TABLE IF NOT EXISTS emails (
			id UUID PRIMARY KEY,
			dealership_id UUID NOT NULL,
			user_id UUID NOT NULL,
			thread_id UUID NOT NULL REFERENCES email_threads(id) ON DELETE CASCADE,
			message_id VARCHAR(500) UNIQUE,
			in_reply_to VARCHAR(500),
			references_header TEXT[] DEFAULT '{}',
			folder VARCHAR(50) NOT NULL DEFAULT 'inbox',
			from_email VARCHAR(255) NOT NULL,
			from_name VARCHAR(255) DEFAULT '',
			to_emails TEXT[] NOT NULL DEFAULT '{}',
			to_names TEXT[] DEFAULT '{}',
			cc_emails TEXT[] DEFAULT '{}',
			cc_names TEXT[] DEFAULT '{}',
			bcc_emails TEXT[] DEFAULT '{}',
			subject VARCHAR(500) NOT NULL,
			body_html TEXT NOT NULL DEFAULT '',
			body_text TEXT NOT NULL DEFAULT '',
			snippet VARCHAR(255) DEFAULT '',
			is_read BOOLEAN NOT NULL DEFAULT FALSE,
			is_starred BOOLEAN NOT NULL DEFAULT FALSE,
			is_important BOOLEAN NOT NULL DEFAULT FALSE,
			has_attachments BOOLEAN NOT NULL DEFAULT FALSE,
			labels TEXT[] NOT NULL DEFAULT '{}',
			received_at TIMESTAMP NOT NULL DEFAULT NOW(),
			sent_at TIMESTAMP,
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP NOT NULL DEFAULT NOW()
		);

		CREATE INDEX IF NOT EXISTS idx_emails_dealership_user
			ON emails(dealership_id, user_id);
		CREATE INDEX IF NOT EXISTS idx_emails_folder
			ON emails(dealership_id, user_id, folder);
		CREATE INDEX IF NOT EXISTS idx_emails_thread
			ON emails(thread_id);
		CREATE INDEX IF NOT EXISTS idx_emails_received
			ON emails(dealership_id, user_id, received_at DESC);
		CREATE INDEX IF NOT EXISTS idx_emails_unread
			ON emails(dealership_id, user_id, is_read) WHERE NOT is_read;
		CREATE INDEX IF NOT EXISTS idx_emails_starred
			ON emails(dealership_id, user_id, is_starred) WHERE is_starred;
		CREATE INDEX IF NOT EXISTS idx_emails_message_id
			ON emails(message_id);
		CREATE INDEX IF NOT EXISTS idx_emails_in_reply_to
			ON emails(in_reply_to);

		-- Full-text search index for emails
		CREATE INDEX IF NOT EXISTS idx_emails_search
			ON emails USING gin(to_tsvector('english', subject || ' ' || body_text));

		-- Email drafts
		CREATE TABLE IF NOT EXISTS email_drafts (
			id UUID PRIMARY KEY,
			dealership_id UUID NOT NULL,
			user_id UUID NOT NULL,
			thread_id UUID REFERENCES email_threads(id),
			in_reply_to VARCHAR(500),
			to_emails TEXT[] DEFAULT '{}',
			to_names TEXT[] DEFAULT '{}',
			cc_emails TEXT[] DEFAULT '{}',
			cc_names TEXT[] DEFAULT '{}',
			bcc_emails TEXT[] DEFAULT '{}',
			bcc_names TEXT[] DEFAULT '{}',
			subject VARCHAR(500) DEFAULT '',
			body_html TEXT DEFAULT '',
			body_text TEXT DEFAULT '',
			attachments TEXT[] DEFAULT '{}',
			scheduled_for TIMESTAMP,
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP NOT NULL DEFAULT NOW()
		);

		CREATE INDEX IF NOT EXISTS idx_email_drafts_dealership_user
			ON email_drafts(dealership_id, user_id);
		CREATE INDEX IF NOT EXISTS idx_email_drafts_updated
			ON email_drafts(dealership_id, user_id, updated_at DESC);

		-- Email attachments
		CREATE TABLE IF NOT EXISTS email_attachments (
			id UUID PRIMARY KEY,
			email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
			draft_id UUID REFERENCES email_drafts(id) ON DELETE CASCADE,
			dealership_id UUID NOT NULL,
			filename VARCHAR(255) NOT NULL,
			content_type VARCHAR(100) NOT NULL,
			size BIGINT NOT NULL,
			s3_key VARCHAR(500) NOT NULL,
			s3_bucket VARCHAR(100) NOT NULL,
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			CONSTRAINT attachment_parent CHECK (
				(email_id IS NOT NULL AND draft_id IS NULL) OR
				(email_id IS NULL AND draft_id IS NOT NULL) OR
				(email_id IS NULL AND draft_id IS NULL)
			)
		);

		CREATE INDEX IF NOT EXISTS idx_email_attachments_email
			ON email_attachments(email_id);
		CREATE INDEX IF NOT EXISTS idx_email_attachments_draft
			ON email_attachments(draft_id);

		-- Custom email labels
		CREATE TABLE IF NOT EXISTS email_labels (
			id UUID PRIMARY KEY,
			dealership_id UUID NOT NULL,
			user_id UUID NOT NULL,
			name VARCHAR(100) NOT NULL,
			color VARCHAR(7) NOT NULL DEFAULT '#6366f1',
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
			UNIQUE(dealership_id, user_id, name)
		);

		CREATE INDEX IF NOT EXISTS idx_email_labels_dealership_user
			ON email_labels(dealership_id, user_id);

		-- Email signatures
		CREATE TABLE IF NOT EXISTS email_signatures (
			id UUID PRIMARY KEY,
			dealership_id UUID NOT NULL,
			user_id UUID NOT NULL,
			name VARCHAR(100) NOT NULL,
			signature_html TEXT NOT NULL DEFAULT '',
			is_default BOOLEAN NOT NULL DEFAULT FALSE,
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP NOT NULL DEFAULT NOW()
		);

		CREATE INDEX IF NOT EXISTS idx_email_signatures_dealership_user
			ON email_signatures(dealership_id, user_id);
	`

	_, err := p.db.Exec(schema)
	if err != nil {
		return fmt.Errorf("failed to initialize schema: %w", err)
	}

	return nil
}

// CreateTemplate creates a new email template
func (p *PostgresEmailDatabase) CreateTemplate(template *EmailTemplate) error {
	query := `
		INSERT INTO email_templates (id, dealership_id, name, subject, body_html, variables, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`

	_, err := p.db.Exec(query,
		template.ID,
		template.DealershipID,
		template.Name,
		template.Subject,
		template.BodyHTML,
		pq.Array(template.Variables),
		template.CreatedAt,
		template.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create template: %w", err)
	}

	return nil
}

// GetTemplate retrieves a template by ID
func (p *PostgresEmailDatabase) GetTemplate(id string, dealershipID string) (*EmailTemplate, error) {
	query := `
		SELECT id, dealership_id, name, subject, body_html, variables, created_at, updated_at
		FROM email_templates
		WHERE id = $1 AND dealership_id = $2
	`

	template := &EmailTemplate{}
	var variables pq.StringArray

	err := p.db.QueryRow(query, id, dealershipID).Scan(
		&template.ID,
		&template.DealershipID,
		&template.Name,
		&template.Subject,
		&template.BodyHTML,
		&variables,
		&template.CreatedAt,
		&template.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("template not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get template: %w", err)
	}

	template.Variables = variables

	return template, nil
}

// ListTemplates retrieves all templates for a dealership
func (p *PostgresEmailDatabase) ListTemplates(dealershipID string, limit int, offset int) ([]*EmailTemplate, error) {
	query := `
		SELECT id, dealership_id, name, subject, body_html, variables, created_at, updated_at
		FROM email_templates
		WHERE dealership_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := p.db.Query(query, dealershipID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list templates: %w", err)
	}
	defer rows.Close()

	templates := []*EmailTemplate{}
	for rows.Next() {
		template := &EmailTemplate{}
		var variables pq.StringArray

		err := rows.Scan(
			&template.ID,
			&template.DealershipID,
			&template.Name,
			&template.Subject,
			&template.BodyHTML,
			&variables,
			&template.CreatedAt,
			&template.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan template: %w", err)
		}

		template.Variables = variables
		templates = append(templates, template)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating templates: %w", err)
	}

	return templates, nil
}

// UpdateTemplate updates an existing template
func (p *PostgresEmailDatabase) UpdateTemplate(template *EmailTemplate) error {
	query := `
		UPDATE email_templates
		SET name = $1, subject = $2, body_html = $3, variables = $4, updated_at = $5
		WHERE id = $6 AND dealership_id = $7
	`

	result, err := p.db.Exec(query,
		template.Name,
		template.Subject,
		template.BodyHTML,
		pq.Array(template.Variables),
		time.Now(),
		template.ID,
		template.DealershipID,
	)

	if err != nil {
		return fmt.Errorf("failed to update template: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("template not found")
	}

	return nil
}

// DeleteTemplate deletes a template
func (p *PostgresEmailDatabase) DeleteTemplate(id string, dealershipID string) error {
	query := `DELETE FROM email_templates WHERE id = $1 AND dealership_id = $2`

	result, err := p.db.Exec(query, id, dealershipID)
	if err != nil {
		return fmt.Errorf("failed to delete template: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("template not found")
	}

	return nil
}

// CreateLog creates a new email log entry
func (p *PostgresEmailDatabase) CreateLog(log *EmailLog) error {
	query := `
		INSERT INTO email_logs (id, dealership_id, recipient, subject, template_id, status, sent_at, error, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`

	_, err := p.db.Exec(query,
		log.ID,
		log.DealershipID,
		log.Recipient,
		log.Subject,
		log.TemplateID,
		log.Status,
		log.SentAt,
		log.Error,
		log.CreatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create log: %w", err)
	}

	return nil
}

// GetLog retrieves a log entry by ID
func (p *PostgresEmailDatabase) GetLog(id string, dealershipID string) (*EmailLog, error) {
	query := `
		SELECT id, dealership_id, recipient, subject, template_id, status, sent_at, error, created_at
		FROM email_logs
		WHERE id = $1 AND dealership_id = $2
	`

	log := &EmailLog{}

	err := p.db.QueryRow(query, id, dealershipID).Scan(
		&log.ID,
		&log.DealershipID,
		&log.Recipient,
		&log.Subject,
		&log.TemplateID,
		&log.Status,
		&log.SentAt,
		&log.Error,
		&log.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("log not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get log: %w", err)
	}

	return log, nil
}

// ListLogs retrieves all logs for a dealership
func (p *PostgresEmailDatabase) ListLogs(dealershipID string, limit int, offset int) ([]*EmailLog, error) {
	query := `
		SELECT id, dealership_id, recipient, subject, template_id, status, sent_at, error, created_at
		FROM email_logs
		WHERE dealership_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := p.db.Query(query, dealershipID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list logs: %w", err)
	}
	defer rows.Close()

	logs := []*EmailLog{}
	for rows.Next() {
		log := &EmailLog{}

		err := rows.Scan(
			&log.ID,
			&log.DealershipID,
			&log.Recipient,
			&log.Subject,
			&log.TemplateID,
			&log.Status,
			&log.SentAt,
			&log.Error,
			&log.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan log: %w", err)
		}

		logs = append(logs, log)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating logs: %w", err)
	}

	return logs, nil
}

// UpdateLogStatus updates the status of a log entry
func (p *PostgresEmailDatabase) UpdateLogStatus(id string, status string, sentAt *time.Time, errorMsg *string) error {
	query := `
		UPDATE email_logs
		SET status = $1, sent_at = $2, error = $3
		WHERE id = $4
	`

	result, err := p.db.Exec(query, status, sentAt, errorMsg, id)
	if err != nil {
		return fmt.Errorf("failed to update log status: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("log not found")
	}

	return nil
}
