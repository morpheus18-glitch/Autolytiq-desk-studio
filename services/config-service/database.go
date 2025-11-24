package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"hash/fnv"
	"time"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
)

// PostgresConfigDB implements ConfigDatabase for PostgreSQL
type PostgresConfigDB struct {
	db *sql.DB
}

// NewPostgresConfigDB creates a new PostgreSQL config database connection
func NewPostgresConfigDB(connStr string) (*PostgresConfigDB, error) {
	db, err := sql.Open("postgres", connStr)
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

	return &PostgresConfigDB{db: db}, nil
}

// Close closes the database connection
func (p *PostgresConfigDB) Close() error {
	return p.db.Close()
}

// InitSchema creates all required tables and indexes
func (p *PostgresConfigDB) InitSchema() error {
	schema := `
		-- Dealership configuration settings
		CREATE TABLE IF NOT EXISTS dealership_config (
			dealership_id VARCHAR(255) NOT NULL,
			key VARCHAR(255) NOT NULL,
			value TEXT NOT NULL,
			type VARCHAR(50) NOT NULL,
			category VARCHAR(100) NOT NULL,
			description TEXT,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (dealership_id, key)
		);

		CREATE INDEX IF NOT EXISTS idx_config_dealership ON dealership_config(dealership_id);
		CREATE INDEX IF NOT EXISTS idx_config_category ON dealership_config(dealership_id, category);

		-- Feature flags
		CREATE TABLE IF NOT EXISTS feature_flags (
			id VARCHAR(36) PRIMARY KEY,
			flag_key VARCHAR(255) UNIQUE NOT NULL,
			enabled BOOLEAN NOT NULL DEFAULT false,
			rollout_percentage INTEGER NOT NULL DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
			constraints_json JSONB,
			description TEXT,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		);

		CREATE INDEX IF NOT EXISTS idx_flags_key ON feature_flags(flag_key);
		CREATE INDEX IF NOT EXISTS idx_flags_enabled ON feature_flags(enabled);

		-- Third-party integrations
		CREATE TABLE IF NOT EXISTS integrations (
			id VARCHAR(36) PRIMARY KEY,
			dealership_id VARCHAR(255) NOT NULL,
			provider VARCHAR(100) NOT NULL,
			config_json JSONB NOT NULL,
			status VARCHAR(50) NOT NULL,
			last_sync TIMESTAMP,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		);

		CREATE INDEX IF NOT EXISTS idx_integrations_dealership ON integrations(dealership_id);
		CREATE INDEX IF NOT EXISTS idx_integrations_provider ON integrations(dealership_id, provider);
		CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status);
	`

	_, err := p.db.Exec(schema)
	if err != nil {
		return fmt.Errorf("failed to initialize schema: %w", err)
	}

	return nil
}

// SetConfig creates or updates a configuration setting
func (p *PostgresConfigDB) SetConfig(dealershipID, key, value, configType, category, description string) error {
	query := `
		INSERT INTO dealership_config (dealership_id, key, value, type, category, description, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
		ON CONFLICT (dealership_id, key)
		DO UPDATE SET
			value = EXCLUDED.value,
			type = EXCLUDED.type,
			category = EXCLUDED.category,
			description = EXCLUDED.description,
			updated_at = EXCLUDED.updated_at
	`

	now := time.Now()
	_, err := p.db.Exec(query, dealershipID, key, value, configType, category, description, now)
	if err != nil {
		return fmt.Errorf("failed to set config: %w", err)
	}

	return nil
}

// GetConfig retrieves a specific configuration setting
func (p *PostgresConfigDB) GetConfig(dealershipID, key string) (*DealershipConfig, error) {
	query := `
		SELECT dealership_id, key, value, type, category, description, created_at, updated_at
		FROM dealership_config
		WHERE dealership_id = $1 AND key = $2
	`

	var config DealershipConfig
	err := p.db.QueryRow(query, dealershipID, key).Scan(
		&config.DealershipID,
		&config.Key,
		&config.Value,
		&config.Type,
		&config.Category,
		&config.Description,
		&config.CreatedAt,
		&config.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get config: %w", err)
	}

	return &config, nil
}

// GetConfigsByCategory retrieves all configuration settings for a category
func (p *PostgresConfigDB) GetConfigsByCategory(dealershipID, category string) ([]DealershipConfig, error) {
	query := `
		SELECT dealership_id, key, value, type, category, description, created_at, updated_at
		FROM dealership_config
		WHERE dealership_id = $1 AND category = $2
		ORDER BY key
	`

	rows, err := p.db.Query(query, dealershipID, category)
	if err != nil {
		return nil, fmt.Errorf("failed to get configs by category: %w", err)
	}
	defer rows.Close()

	var configs []DealershipConfig
	for rows.Next() {
		var config DealershipConfig
		err := rows.Scan(
			&config.DealershipID,
			&config.Key,
			&config.Value,
			&config.Type,
			&config.Category,
			&config.Description,
			&config.CreatedAt,
			&config.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan config: %w", err)
		}
		configs = append(configs, config)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}

	return configs, nil
}

// DeleteConfig deletes a configuration setting
func (p *PostgresConfigDB) DeleteConfig(dealershipID, key string) error {
	query := `DELETE FROM dealership_config WHERE dealership_id = $1 AND key = $2`

	result, err := p.db.Exec(query, dealershipID, key)
	if err != nil {
		return fmt.Errorf("failed to delete config: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("config not found")
	}

	return nil
}

// CreateFeatureFlag creates a new feature flag
func (p *PostgresConfigDB) CreateFeatureFlag(flagKey string, enabled bool, rolloutPercentage int, constraintsJSON json.RawMessage, description string) (*FeatureFlag, error) {
	id := uuid.New().String()
	now := time.Now()

	query := `
		INSERT INTO feature_flags (id, flag_key, enabled, rollout_percentage, constraints_json, description, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
		RETURNING id, flag_key, enabled, rollout_percentage, constraints_json, description, created_at, updated_at
	`

	var flag FeatureFlag
	err := p.db.QueryRow(query, id, flagKey, enabled, rolloutPercentage, constraintsJSON, description, now).Scan(
		&flag.ID,
		&flag.FlagKey,
		&flag.Enabled,
		&flag.RolloutPercentage,
		&flag.ConstraintsJSON,
		&flag.Description,
		&flag.CreatedAt,
		&flag.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create feature flag: %w", err)
	}

	return &flag, nil
}

// GetFeatureFlag retrieves a feature flag by key
func (p *PostgresConfigDB) GetFeatureFlag(flagKey string) (*FeatureFlag, error) {
	query := `
		SELECT id, flag_key, enabled, rollout_percentage, constraints_json, description, created_at, updated_at
		FROM feature_flags
		WHERE flag_key = $1
	`

	var flag FeatureFlag
	err := p.db.QueryRow(query, flagKey).Scan(
		&flag.ID,
		&flag.FlagKey,
		&flag.Enabled,
		&flag.RolloutPercentage,
		&flag.ConstraintsJSON,
		&flag.Description,
		&flag.CreatedAt,
		&flag.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get feature flag: %w", err)
	}

	return &flag, nil
}

// ListFeatureFlags retrieves all feature flags
func (p *PostgresConfigDB) ListFeatureFlags() ([]FeatureFlag, error) {
	query := `
		SELECT id, flag_key, enabled, rollout_percentage, constraints_json, description, created_at, updated_at
		FROM feature_flags
		ORDER BY flag_key
	`

	rows, err := p.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to list feature flags: %w", err)
	}
	defer rows.Close()

	var flags []FeatureFlag
	for rows.Next() {
		var flag FeatureFlag
		err := rows.Scan(
			&flag.ID,
			&flag.FlagKey,
			&flag.Enabled,
			&flag.RolloutPercentage,
			&flag.ConstraintsJSON,
			&flag.Description,
			&flag.CreatedAt,
			&flag.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan feature flag: %w", err)
		}
		flags = append(flags, flag)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}

	return flags, nil
}

// UpdateFeatureFlag updates an existing feature flag
func (p *PostgresConfigDB) UpdateFeatureFlag(flagKey string, enabled bool, rolloutPercentage int, constraintsJSON json.RawMessage, description string) (*FeatureFlag, error) {
	now := time.Now()

	query := `
		UPDATE feature_flags
		SET enabled = $2, rollout_percentage = $3, constraints_json = $4, description = $5, updated_at = $6
		WHERE flag_key = $1
		RETURNING id, flag_key, enabled, rollout_percentage, constraints_json, description, created_at, updated_at
	`

	var flag FeatureFlag
	err := p.db.QueryRow(query, flagKey, enabled, rolloutPercentage, constraintsJSON, description, now).Scan(
		&flag.ID,
		&flag.FlagKey,
		&flag.Enabled,
		&flag.RolloutPercentage,
		&flag.ConstraintsJSON,
		&flag.Description,
		&flag.CreatedAt,
		&flag.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("feature flag not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update feature flag: %w", err)
	}

	return &flag, nil
}

// DeleteFeatureFlag deletes a feature flag
func (p *PostgresConfigDB) DeleteFeatureFlag(flagKey string) error {
	query := `DELETE FROM feature_flags WHERE flag_key = $1`

	result, err := p.db.Exec(query, flagKey)
	if err != nil {
		return fmt.Errorf("failed to delete feature flag: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("feature flag not found")
	}

	return nil
}

// EvaluateFeatureFlag determines if a feature flag is enabled for a dealership
func (p *PostgresConfigDB) EvaluateFeatureFlag(flagKey, dealershipID string) (bool, error) {
	flag, err := p.GetFeatureFlag(flagKey)
	if err != nil {
		return false, err
	}

	if flag == nil {
		return false, fmt.Errorf("feature flag not found")
	}

	// If flag is disabled globally, return false
	if !flag.Enabled {
		return false, nil
	}

	// Check constraints if present
	if len(flag.ConstraintsJSON) > 0 {
		var constraints FlagConstraints
		if err := json.Unmarshal(flag.ConstraintsJSON, &constraints); err != nil {
			return false, fmt.Errorf("failed to parse constraints: %w", err)
		}

		// If dealership constraints exist, check if dealership is in the list
		if len(constraints.Dealerships) > 0 {
			found := false
			for _, id := range constraints.Dealerships {
				if id == dealershipID {
					found = true
					break
				}
			}
			if !found {
				return false, nil
			}
		}
	}

	// Apply rollout percentage using consistent hashing
	if flag.RolloutPercentage < 100 {
		hash := hashDealershipID(dealershipID)
		if hash%100 >= flag.RolloutPercentage {
			return false, nil
		}
	}

	return true, nil
}

// hashDealershipID creates a consistent hash for rollout percentage calculation
func hashDealershipID(dealershipID string) int {
	h := fnv.New32a()
	h.Write([]byte(dealershipID))
	return int(h.Sum32())
}

// CreateIntegration creates a new integration
func (p *PostgresConfigDB) CreateIntegration(dealershipID, provider string, configJSON json.RawMessage, status string) (*Integration, error) {
	id := uuid.New().String()
	now := time.Now()

	query := `
		INSERT INTO integrations (id, dealership_id, provider, config_json, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $6)
		RETURNING id, dealership_id, provider, config_json, status, last_sync, created_at, updated_at
	`

	var integration Integration
	err := p.db.QueryRow(query, id, dealershipID, provider, configJSON, status, now).Scan(
		&integration.ID,
		&integration.DealershipID,
		&integration.Provider,
		&integration.ConfigJSON,
		&integration.Status,
		&integration.LastSync,
		&integration.CreatedAt,
		&integration.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create integration: %w", err)
	}

	return &integration, nil
}

// GetIntegration retrieves an integration by ID
func (p *PostgresConfigDB) GetIntegration(id string) (*Integration, error) {
	query := `
		SELECT id, dealership_id, provider, config_json, status, last_sync, created_at, updated_at
		FROM integrations
		WHERE id = $1
	`

	var integration Integration
	err := p.db.QueryRow(query, id).Scan(
		&integration.ID,
		&integration.DealershipID,
		&integration.Provider,
		&integration.ConfigJSON,
		&integration.Status,
		&integration.LastSync,
		&integration.CreatedAt,
		&integration.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get integration: %w", err)
	}

	return &integration, nil
}

// ListIntegrations retrieves all integrations for a dealership
func (p *PostgresConfigDB) ListIntegrations(dealershipID string) ([]Integration, error) {
	query := `
		SELECT id, dealership_id, provider, config_json, status, last_sync, created_at, updated_at
		FROM integrations
		WHERE dealership_id = $1
		ORDER BY provider
	`

	rows, err := p.db.Query(query, dealershipID)
	if err != nil {
		return nil, fmt.Errorf("failed to list integrations: %w", err)
	}
	defer rows.Close()

	var integrations []Integration
	for rows.Next() {
		var integration Integration
		err := rows.Scan(
			&integration.ID,
			&integration.DealershipID,
			&integration.Provider,
			&integration.ConfigJSON,
			&integration.Status,
			&integration.LastSync,
			&integration.CreatedAt,
			&integration.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan integration: %w", err)
		}
		integrations = append(integrations, integration)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}

	return integrations, nil
}

// UpdateIntegration updates an existing integration
func (p *PostgresConfigDB) UpdateIntegration(id string, configJSON json.RawMessage, status string, lastSync *time.Time) (*Integration, error) {
	now := time.Now()

	query := `
		UPDATE integrations
		SET config_json = $2, status = $3, last_sync = $4, updated_at = $5
		WHERE id = $1
		RETURNING id, dealership_id, provider, config_json, status, last_sync, created_at, updated_at
	`

	var integration Integration
	err := p.db.QueryRow(query, id, configJSON, status, lastSync, now).Scan(
		&integration.ID,
		&integration.DealershipID,
		&integration.Provider,
		&integration.ConfigJSON,
		&integration.Status,
		&integration.LastSync,
		&integration.CreatedAt,
		&integration.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("integration not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update integration: %w", err)
	}

	return &integration, nil
}

// DeleteIntegration deletes an integration
func (p *PostgresConfigDB) DeleteIntegration(id string) error {
	query := `DELETE FROM integrations WHERE id = $1`

	result, err := p.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete integration: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("integration not found")
	}

	return nil
}
