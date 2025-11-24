package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

const bcryptCost = 10

// PostgresUserDB implements UserDatabase for PostgreSQL
type PostgresUserDB struct {
	db *sql.DB
}

// NewPostgresUserDB creates a new PostgreSQL user database connection
func NewPostgresUserDB(connectionString string) (*PostgresUserDB, error) {
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

	return &PostgresUserDB{db: db}, nil
}

// Close closes the database connection
func (p *PostgresUserDB) Close() error {
	return p.db.Close()
}

// InitSchema initializes the database schema
func (p *PostgresUserDB) InitSchema() error {
	schema := `
	CREATE TABLE IF NOT EXISTS users (
		id UUID PRIMARY KEY,
		dealership_id UUID NOT NULL,
		email VARCHAR(255) NOT NULL,
		name VARCHAR(255) NOT NULL,
		password_hash VARCHAR(255) NOT NULL,
		role VARCHAR(50) NOT NULL,
		status VARCHAR(50) NOT NULL DEFAULT 'active',
		phone VARCHAR(50),
		avatar_url TEXT,
		created_at TIMESTAMP NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
		UNIQUE(dealership_id, email)
	);

	CREATE INDEX IF NOT EXISTS idx_users_dealership_id ON users(dealership_id);
	CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
	CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
	CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

	CREATE TABLE IF NOT EXISTS user_preferences (
		user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
		theme VARCHAR(50) NOT NULL DEFAULT 'light',
		language VARCHAR(10) NOT NULL DEFAULT 'en',
		notifications_enabled BOOLEAN NOT NULL DEFAULT true,
		preferences_json JSONB
	);

	CREATE TABLE IF NOT EXISTS user_activity (
		id UUID PRIMARY KEY,
		user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		action VARCHAR(100) NOT NULL,
		resource_type VARCHAR(50),
		resource_id UUID,
		timestamp TIMESTAMP NOT NULL DEFAULT NOW()
	);

	CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
	CREATE INDEX IF NOT EXISTS idx_user_activity_timestamp ON user_activity(timestamp DESC);
	`

	_, err := p.db.Exec(schema)
	return err
}

// hashPassword hashes a plain text password
func hashPassword(password string) (string, error) {
	if len(password) < 8 {
		return "", errors.New("password must be at least 8 characters")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		return "", fmt.Errorf("failed to hash password: %w", err)
	}

	return string(hash), nil
}

// verifyPassword verifies a password against its hash
func verifyPassword(hash, password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// CreateUser creates a new user
func (p *PostgresUserDB) CreateUser(req CreateUserRequest) (*User, error) {
	// Validate input
	if req.Email == "" {
		return nil, errors.New("email is required")
	}
	if req.Name == "" {
		return nil, errors.New("name is required")
	}
	if req.Password == "" {
		return nil, errors.New("password is required")
	}
	if !IsValidRole(req.Role) {
		return nil, fmt.Errorf("invalid role: %s", req.Role)
	}

	// Hash password
	passwordHash, err := hashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	user := &User{
		ID:           uuid.New(),
		DealershipID: req.DealershipID,
		Email:        req.Email,
		Name:         req.Name,
		PasswordHash: passwordHash,
		Role:         req.Role,
		Status:       "active",
		Phone:        req.Phone,
		AvatarURL:    req.AvatarURL,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	query := `
		INSERT INTO users (id, dealership_id, email, name, password_hash, role, status, phone, avatar_url, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`

	_, err = p.db.Exec(query,
		user.ID,
		user.DealershipID,
		user.Email,
		user.Name,
		user.PasswordHash,
		user.Role,
		user.Status,
		user.Phone,
		user.AvatarURL,
		user.CreatedAt,
		user.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Initialize default preferences
	prefs := UserPreferences{
		UserID:               user.ID,
		Theme:                "light",
		Language:             "en",
		NotificationsEnabled: true,
	}
	_ = p.SavePreferences(prefs) // Ignore error, preferences are optional

	return user, nil
}

// GetUser retrieves a user by ID
func (p *PostgresUserDB) GetUser(id uuid.UUID, dealershipID uuid.UUID) (*User, error) {
	query := `
		SELECT id, dealership_id, email, name, password_hash, role, status, phone, avatar_url, created_at, updated_at
		FROM users
		WHERE id = $1 AND dealership_id = $2
	`

	user := &User{}
	err := p.db.QueryRow(query, id, dealershipID).Scan(
		&user.ID,
		&user.DealershipID,
		&user.Email,
		&user.Name,
		&user.PasswordHash,
		&user.Role,
		&user.Status,
		&user.Phone,
		&user.AvatarURL,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}

// GetUserByEmail retrieves a user by email
func (p *PostgresUserDB) GetUserByEmail(email string, dealershipID uuid.UUID) (*User, error) {
	query := `
		SELECT id, dealership_id, email, name, password_hash, role, status, phone, avatar_url, created_at, updated_at
		FROM users
		WHERE email = $1 AND dealership_id = $2
	`

	user := &User{}
	err := p.db.QueryRow(query, email, dealershipID).Scan(
		&user.ID,
		&user.DealershipID,
		&user.Email,
		&user.Name,
		&user.PasswordHash,
		&user.Role,
		&user.Status,
		&user.Phone,
		&user.AvatarURL,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}

// ListUsers retrieves users with optional filters
func (p *PostgresUserDB) ListUsers(filter ListUsersFilter) ([]User, error) {
	query := `
		SELECT id, dealership_id, email, name, password_hash, role, status, phone, avatar_url, created_at, updated_at
		FROM users
		WHERE dealership_id = $1
	`
	args := []interface{}{filter.DealershipID}
	argCount := 1

	if filter.Role != nil {
		argCount++
		query += fmt.Sprintf(" AND role = $%d", argCount)
		args = append(args, *filter.Role)
	}

	if filter.Status != nil {
		argCount++
		query += fmt.Sprintf(" AND status = $%d", argCount)
		args = append(args, *filter.Status)
	}

	query += " ORDER BY created_at DESC"

	rows, err := p.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list users: %w", err)
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var user User
		err := rows.Scan(
			&user.ID,
			&user.DealershipID,
			&user.Email,
			&user.Name,
			&user.PasswordHash,
			&user.Role,
			&user.Status,
			&user.Phone,
			&user.AvatarURL,
			&user.CreatedAt,
			&user.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan user: %w", err)
		}
		users = append(users, user)
	}

	return users, nil
}

// UpdateUser updates a user
func (p *PostgresUserDB) UpdateUser(id uuid.UUID, dealershipID uuid.UUID, req UpdateUserRequest) (*User, error) {
	// Build dynamic update query
	query := "UPDATE users SET updated_at = NOW()"
	args := []interface{}{}
	argCount := 0

	if req.Name != nil {
		argCount++
		query += fmt.Sprintf(", name = $%d", argCount)
		args = append(args, *req.Name)
	}

	if req.Phone != nil {
		argCount++
		query += fmt.Sprintf(", phone = $%d", argCount)
		args = append(args, *req.Phone)
	}

	if req.AvatarURL != nil {
		argCount++
		query += fmt.Sprintf(", avatar_url = $%d", argCount)
		args = append(args, *req.AvatarURL)
	}

	if argCount == 0 {
		return nil, errors.New("no fields to update")
	}

	argCount++
	query += fmt.Sprintf(" WHERE id = $%d", argCount)
	args = append(args, id)

	argCount++
	query += fmt.Sprintf(" AND dealership_id = $%d", argCount)
	args = append(args, dealershipID)

	_, err := p.db.Exec(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	return p.GetUser(id, dealershipID)
}

// DeleteUser soft deletes a user by setting status to inactive
func (p *PostgresUserDB) DeleteUser(id uuid.UUID, dealershipID uuid.UUID) error {
	query := `
		UPDATE users
		SET status = 'inactive', updated_at = NOW()
		WHERE id = $1 AND dealership_id = $2
	`

	result, err := p.db.Exec(query, id, dealershipID)
	if err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}

// ValidatePassword validates a user's password
func (p *PostgresUserDB) ValidatePassword(id uuid.UUID, dealershipID uuid.UUID, password string) (bool, error) {
	query := `SELECT password_hash FROM users WHERE id = $1 AND dealership_id = $2`

	var passwordHash string
	err := p.db.QueryRow(query, id, dealershipID).Scan(&passwordHash)
	if err == sql.ErrNoRows {
		return false, fmt.Errorf("user not found")
	}
	if err != nil {
		return false, fmt.Errorf("failed to get password hash: %w", err)
	}

	return verifyPassword(passwordHash, password), nil
}

// UpdatePassword updates a user's password
func (p *PostgresUserDB) UpdatePassword(id uuid.UUID, dealershipID uuid.UUID, oldPassword, newPassword string) error {
	// Validate old password
	valid, err := p.ValidatePassword(id, dealershipID, oldPassword)
	if err != nil {
		return err
	}
	if !valid {
		return errors.New("invalid old password")
	}

	// Hash new password
	passwordHash, err := hashPassword(newPassword)
	if err != nil {
		return err
	}

	query := `
		UPDATE users
		SET password_hash = $1, updated_at = NOW()
		WHERE id = $2 AND dealership_id = $3
	`

	_, err = p.db.Exec(query, passwordHash, id, dealershipID)
	if err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	return nil
}

// UpdateRole updates a user's role
func (p *PostgresUserDB) UpdateRole(id uuid.UUID, dealershipID uuid.UUID, role string) error {
	if !IsValidRole(role) {
		return fmt.Errorf("invalid role: %s", role)
	}

	query := `
		UPDATE users
		SET role = $1, updated_at = NOW()
		WHERE id = $2 AND dealership_id = $3
	`

	result, err := p.db.Exec(query, role, id, dealershipID)
	if err != nil {
		return fmt.Errorf("failed to update role: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}

// GetUsersByRole retrieves users by role
func (p *PostgresUserDB) GetUsersByRole(dealershipID uuid.UUID, role string) ([]User, error) {
	filter := ListUsersFilter{
		DealershipID: dealershipID,
		Role:         &role,
	}
	return p.ListUsers(filter)
}

// SavePreferences saves user preferences
func (p *PostgresUserDB) SavePreferences(prefs UserPreferences) error {
	var prefsJSON []byte
	var err error

	if prefs.PreferencesJSON != nil {
		prefsJSON, err = json.Marshal(prefs.PreferencesJSON)
		if err != nil {
			return fmt.Errorf("failed to marshal preferences JSON: %w", err)
		}
	}

	query := `
		INSERT INTO user_preferences (user_id, theme, language, notifications_enabled, preferences_json)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (user_id) DO UPDATE SET
			theme = EXCLUDED.theme,
			language = EXCLUDED.language,
			notifications_enabled = EXCLUDED.notifications_enabled,
			preferences_json = EXCLUDED.preferences_json
	`

	_, err = p.db.Exec(query, prefs.UserID, prefs.Theme, prefs.Language, prefs.NotificationsEnabled, prefsJSON)
	if err != nil {
		return fmt.Errorf("failed to save preferences: %w", err)
	}

	return nil
}

// GetPreferences retrieves user preferences
func (p *PostgresUserDB) GetPreferences(userID uuid.UUID) (*UserPreferences, error) {
	query := `
		SELECT user_id, theme, language, notifications_enabled, preferences_json
		FROM user_preferences
		WHERE user_id = $1
	`

	prefs := &UserPreferences{}
	var prefsJSON []byte

	err := p.db.QueryRow(query, userID).Scan(
		&prefs.UserID,
		&prefs.Theme,
		&prefs.Language,
		&prefs.NotificationsEnabled,
		&prefsJSON,
	)

	if err == sql.ErrNoRows {
		// Return default preferences
		return &UserPreferences{
			UserID:               userID,
			Theme:                "light",
			Language:             "en",
			NotificationsEnabled: true,
		}, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get preferences: %w", err)
	}

	if len(prefsJSON) > 0 {
		err = json.Unmarshal(prefsJSON, &prefs.PreferencesJSON)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal preferences JSON: %w", err)
		}
	}

	return prefs, nil
}

// LogActivity logs a user activity
func (p *PostgresUserDB) LogActivity(activity UserActivity) error {
	if activity.ID == uuid.Nil {
		activity.ID = uuid.New()
	}
	if activity.Timestamp.IsZero() {
		activity.Timestamp = time.Now()
	}

	query := `
		INSERT INTO user_activity (id, user_id, action, resource_type, resource_id, timestamp)
		VALUES ($1, $2, $3, $4, $5, $6)
	`

	_, err := p.db.Exec(query,
		activity.ID,
		activity.UserID,
		activity.Action,
		activity.ResourceType,
		activity.ResourceID,
		activity.Timestamp,
	)

	if err != nil {
		return fmt.Errorf("failed to log activity: %w", err)
	}

	return nil
}

// GetActivity retrieves user activity logs
func (p *PostgresUserDB) GetActivity(userID uuid.UUID, limit int) ([]UserActivity, error) {
	if limit <= 0 {
		limit = 100
	}

	query := `
		SELECT id, user_id, action, resource_type, resource_id, timestamp
		FROM user_activity
		WHERE user_id = $1
		ORDER BY timestamp DESC
		LIMIT $2
	`

	rows, err := p.db.Query(query, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get activity: %w", err)
	}
	defer rows.Close()

	var activities []UserActivity
	for rows.Next() {
		var activity UserActivity
		err := rows.Scan(
			&activity.ID,
			&activity.UserID,
			&activity.Action,
			&activity.ResourceType,
			&activity.ResourceID,
			&activity.Timestamp,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan activity: %w", err)
		}
		activities = append(activities, activity)
	}

	return activities, nil
}
