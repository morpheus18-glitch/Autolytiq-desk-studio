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
