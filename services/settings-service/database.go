package main

import (
	"database/sql"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
)

// SettingsDatabase defines the database interface
type SettingsDatabase interface {
	Close() error
	InitSchema() error

	// User settings
	GetUserSettings(userID, dealershipID string) (*UserSettings, error)
	CreateUserSettings(userID, dealershipID string) (*UserSettings, error)
	UpdateUserSettings(userID, dealershipID string, settings *UserSettings) (*UserSettings, error)
	UpdateSettingsSection(userID, dealershipID, section string, data json.RawMessage) (*UserSettings, error)
	DeleteUserSettings(userID, dealershipID string) error

	// Dealership settings
	GetDealershipSettings(dealershipID string) (*DealershipSettings, error)
	CreateDealershipSettings(dealershipID string) (*DealershipSettings, error)
	UpdateDealershipSettings(dealershipID string, settings *DealershipSettings) (*DealershipSettings, error)
}

// PostgresSettingsDB implements SettingsDatabase with PostgreSQL
type PostgresSettingsDB struct {
	db *sql.DB
}

// NewPostgresSettingsDB creates a new PostgreSQL settings database
func NewPostgresSettingsDB(connStr string) (*PostgresSettingsDB, error) {
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
		return nil, err
	}

	return &PostgresSettingsDB{db: db}, nil
}

// Close closes the database connection
func (p *PostgresSettingsDB) Close() error {
	return p.db.Close()
}

// InitSchema creates the required tables
func (p *PostgresSettingsDB) InitSchema() error {
	schema := `
	CREATE TABLE IF NOT EXISTS user_settings (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		user_id UUID NOT NULL,
		dealership_id UUID NOT NULL,
		appearance JSONB NOT NULL DEFAULT '{}',
		localization JSONB NOT NULL DEFAULT '{}',
		notifications JSONB NOT NULL DEFAULT '{}',
		dashboard JSONB NOT NULL DEFAULT '{}',
		deals JSONB NOT NULL DEFAULT '{}',
		customers JSONB NOT NULL DEFAULT '{}',
		inventory JSONB NOT NULL DEFAULT '{}',
		showroom JSONB NOT NULL DEFAULT '{}',
		messages JSONB NOT NULL DEFAULT '{}',
		privacy JSONB NOT NULL DEFAULT '{}',
		security JSONB NOT NULL DEFAULT '{}',
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		UNIQUE(user_id, dealership_id)
	);

	CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);
	CREATE INDEX IF NOT EXISTS idx_user_settings_dealership ON user_settings(dealership_id);

	CREATE TABLE IF NOT EXISTS dealership_settings (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		dealership_id UUID NOT NULL UNIQUE,
		branding JSONB NOT NULL DEFAULT '{}',
		business_hours JSONB NOT NULL DEFAULT '{}',
		features JSONB NOT NULL DEFAULT '{}',
		defaults JSONB NOT NULL DEFAULT '{}',
		integrations JSONB NOT NULL DEFAULT '{}',
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
	);

	CREATE INDEX IF NOT EXISTS idx_dealership_settings_dealership ON dealership_settings(dealership_id);
	`

	_, err := p.db.Exec(schema)
	return err
}

// GetUserSettings retrieves user settings
func (p *PostgresSettingsDB) GetUserSettings(userID, dealershipID string) (*UserSettings, error) {
	query := `
		SELECT id, user_id, dealership_id, appearance, localization, notifications,
			   dashboard, deals, customers, inventory, showroom, messages, privacy, security,
			   created_at, updated_at
		FROM user_settings
		WHERE user_id = $1 AND dealership_id = $2
	`

	var settings UserSettings
	var appearance, localization, notifications, dashboard, deals, customers, inventory, showroom, messages, privacy, security []byte

	err := p.db.QueryRow(query, userID, dealershipID).Scan(
		&settings.ID,
		&settings.UserID,
		&settings.DealershipID,
		&appearance,
		&localization,
		&notifications,
		&dashboard,
		&deals,
		&customers,
		&inventory,
		&showroom,
		&messages,
		&privacy,
		&security,
		&settings.CreatedAt,
		&settings.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	// Unmarshal each section
	if err := json.Unmarshal(appearance, &settings.Appearance); err != nil {
		settings.Appearance = DefaultAppearanceSettings()
	}
	if err := json.Unmarshal(localization, &settings.Localization); err != nil {
		settings.Localization = DefaultLocalizationSettings()
	}
	if err := json.Unmarshal(notifications, &settings.Notifications); err != nil {
		settings.Notifications = DefaultNotificationSettings()
	}
	if err := json.Unmarshal(dashboard, &settings.Dashboard); err != nil {
		settings.Dashboard = DefaultDashboardSettings()
	}
	if err := json.Unmarshal(deals, &settings.Deals); err != nil {
		settings.Deals = DefaultDealsSettings()
	}
	if err := json.Unmarshal(customers, &settings.Customers); err != nil {
		settings.Customers = DefaultCustomersSettings()
	}
	if err := json.Unmarshal(inventory, &settings.Inventory); err != nil {
		settings.Inventory = DefaultInventorySettings()
	}
	if err := json.Unmarshal(showroom, &settings.Showroom); err != nil {
		settings.Showroom = DefaultShowroomSettings()
	}
	if err := json.Unmarshal(messages, &settings.Messages); err != nil {
		settings.Messages = DefaultMessagesSettings()
	}
	if err := json.Unmarshal(privacy, &settings.Privacy); err != nil {
		settings.Privacy = DefaultPrivacySettings()
	}
	if err := json.Unmarshal(security, &settings.Security); err != nil {
		settings.Security = DefaultSecuritySettings()
	}

	return &settings, nil
}

// CreateUserSettings creates new user settings with defaults
func (p *PostgresSettingsDB) CreateUserSettings(userID, dealershipID string) (*UserSettings, error) {
	settings := NewDefaultUserSettings(userID, dealershipID)
	settings.ID = uuid.New().String()

	appearance, _ := json.Marshal(settings.Appearance)
	localization, _ := json.Marshal(settings.Localization)
	notifications, _ := json.Marshal(settings.Notifications)
	dashboard, _ := json.Marshal(settings.Dashboard)
	deals, _ := json.Marshal(settings.Deals)
	customers, _ := json.Marshal(settings.Customers)
	inventory, _ := json.Marshal(settings.Inventory)
	showroom, _ := json.Marshal(settings.Showroom)
	messages, _ := json.Marshal(settings.Messages)
	privacy, _ := json.Marshal(settings.Privacy)
	security, _ := json.Marshal(settings.Security)

	query := `
		INSERT INTO user_settings (
			id, user_id, dealership_id, appearance, localization, notifications,
			dashboard, deals, customers, inventory, showroom, messages, privacy, security
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		RETURNING created_at, updated_at
	`

	err := p.db.QueryRow(query,
		settings.ID, userID, dealershipID,
		appearance, localization, notifications,
		dashboard, deals, customers, inventory, showroom, messages, privacy, security,
	).Scan(&settings.CreatedAt, &settings.UpdatedAt)

	if err != nil {
		return nil, err
	}

	return settings, nil
}

// UpdateUserSettings updates all user settings
func (p *PostgresSettingsDB) UpdateUserSettings(userID, dealershipID string, settings *UserSettings) (*UserSettings, error) {
	appearance, _ := json.Marshal(settings.Appearance)
	localization, _ := json.Marshal(settings.Localization)
	notifications, _ := json.Marshal(settings.Notifications)
	dashboard, _ := json.Marshal(settings.Dashboard)
	deals, _ := json.Marshal(settings.Deals)
	customers, _ := json.Marshal(settings.Customers)
	inventory, _ := json.Marshal(settings.Inventory)
	showroom, _ := json.Marshal(settings.Showroom)
	messages, _ := json.Marshal(settings.Messages)
	privacy, _ := json.Marshal(settings.Privacy)
	security, _ := json.Marshal(settings.Security)

	query := `
		UPDATE user_settings SET
			appearance = $3,
			localization = $4,
			notifications = $5,
			dashboard = $6,
			deals = $7,
			customers = $8,
			inventory = $9,
			showroom = $10,
			messages = $11,
			privacy = $12,
			security = $13,
			updated_at = NOW()
		WHERE user_id = $1 AND dealership_id = $2
		RETURNING id, created_at, updated_at
	`

	err := p.db.QueryRow(query,
		userID, dealershipID,
		appearance, localization, notifications,
		dashboard, deals, customers, inventory, showroom, messages, privacy, security,
	).Scan(&settings.ID, &settings.CreatedAt, &settings.UpdatedAt)

	if err != nil {
		return nil, err
	}

	settings.UserID = userID
	settings.DealershipID = dealershipID

	return settings, nil
}

// UpdateSettingsSection updates a specific settings section
func (p *PostgresSettingsDB) UpdateSettingsSection(userID, dealershipID, section string, data json.RawMessage) (*UserSettings, error) {
	// Validate section name
	validSections := map[string]bool{
		"appearance": true, "localization": true, "notifications": true,
		"dashboard": true, "deals": true, "customers": true,
		"inventory": true, "showroom": true, "messages": true,
		"privacy": true, "security": true,
	}
	if !validSections[section] {
		return nil, sql.ErrNoRows // Invalid section
	}

	// Use parameterized column update (column name validated above)
	query := `
		UPDATE user_settings SET
			` + section + ` = $3,
			updated_at = NOW()
		WHERE user_id = $1 AND dealership_id = $2
		RETURNING updated_at
	`

	var updatedAt time.Time
	err := p.db.QueryRow(query, userID, dealershipID, data).Scan(&updatedAt)
	if err != nil {
		return nil, err
	}

	// Return updated settings
	return p.GetUserSettings(userID, dealershipID)
}

// DeleteUserSettings deletes user settings
func (p *PostgresSettingsDB) DeleteUserSettings(userID, dealershipID string) error {
	query := `DELETE FROM user_settings WHERE user_id = $1 AND dealership_id = $2`
	_, err := p.db.Exec(query, userID, dealershipID)
	return err
}

// GetDealershipSettings retrieves dealership-level settings
func (p *PostgresSettingsDB) GetDealershipSettings(dealershipID string) (*DealershipSettings, error) {
	query := `
		SELECT id, dealership_id, branding, business_hours, features, defaults, integrations, created_at, updated_at
		FROM dealership_settings
		WHERE dealership_id = $1
	`

	var settings DealershipSettings
	err := p.db.QueryRow(query, dealershipID).Scan(
		&settings.ID,
		&settings.DealershipID,
		&settings.Branding,
		&settings.BusinessHours,
		&settings.Features,
		&settings.Defaults,
		&settings.Integrations,
		&settings.CreatedAt,
		&settings.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &settings, nil
}

// CreateDealershipSettings creates new dealership settings
func (p *PostgresSettingsDB) CreateDealershipSettings(dealershipID string) (*DealershipSettings, error) {
	settings := &DealershipSettings{
		ID:           uuid.New().String(),
		DealershipID: dealershipID,
		Branding:     json.RawMessage(`{"logo_url":"","favicon_url":"","primary_color":"#2563EB","secondary_color":"#64748B","custom_css":""}`),
		BusinessHours: json.RawMessage(`{
			"monday":{"open":"09:00","close":"18:00","closed":false},
			"tuesday":{"open":"09:00","close":"18:00","closed":false},
			"wednesday":{"open":"09:00","close":"18:00","closed":false},
			"thursday":{"open":"09:00","close":"18:00","closed":false},
			"friday":{"open":"09:00","close":"18:00","closed":false},
			"saturday":{"open":"10:00","close":"16:00","closed":false},
			"sunday":{"open":"00:00","close":"00:00","closed":true}
		}`),
		Features: json.RawMessage(`{
			"showroom_enabled":true,
			"messaging_enabled":true,
			"reports_enabled":true,
			"api_access_enabled":false,
			"custom_fields_enabled":true,
			"webhooks_enabled":false
		}`),
		Defaults: json.RawMessage(`{"timezone":"America/Chicago","currency":"USD","tax_rate":8.25,"doc_fee":150}`),
		Integrations: json.RawMessage(`{
			"crm_sync_enabled":false,
			"crm_provider":"",
			"email_sync_enabled":false,
			"email_provider":"",
			"calendar_sync_enabled":false,
			"calendar_provider":"",
			"dms_integration_enabled":false,
			"dms_provider":"",
			"credit_bureau_enabled":false,
			"credit_bureau_provider":""
		}`),
	}

	query := `
		INSERT INTO dealership_settings (id, dealership_id, branding, business_hours, features, defaults, integrations)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING created_at, updated_at
	`

	err := p.db.QueryRow(query,
		settings.ID, dealershipID,
		settings.Branding, settings.BusinessHours, settings.Features, settings.Defaults, settings.Integrations,
	).Scan(&settings.CreatedAt, &settings.UpdatedAt)

	if err != nil {
		return nil, err
	}

	return settings, nil
}

// UpdateDealershipSettings updates dealership settings
func (p *PostgresSettingsDB) UpdateDealershipSettings(dealershipID string, settings *DealershipSettings) (*DealershipSettings, error) {
	query := `
		UPDATE dealership_settings SET
			branding = $2,
			business_hours = $3,
			features = $4,
			defaults = $5,
			integrations = $6,
			updated_at = NOW()
		WHERE dealership_id = $1
		RETURNING id, created_at, updated_at
	`

	err := p.db.QueryRow(query,
		dealershipID,
		settings.Branding, settings.BusinessHours, settings.Features, settings.Defaults, settings.Integrations,
	).Scan(&settings.ID, &settings.CreatedAt, &settings.UpdatedAt)

	if err != nil {
		return nil, err
	}

	settings.DealershipID = dealershipID
	return settings, nil
}
