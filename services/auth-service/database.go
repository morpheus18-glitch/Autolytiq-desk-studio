package main

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/lib/pq"
)

// User represents a user entity
type User struct {
	ID             string
	Email          string
	PasswordHash   string
	FirstName      string
	LastName       string
	Role           string
	DealershipID   string
	IsActive       bool
	EmailVerified  bool
	FailedAttempts int
	LockedUntil    *time.Time
	LastLoginAt    *time.Time
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

// AuthDatabase defines the interface for auth database operations
type AuthDatabase interface {
	Close() error
	InitSchema() error
	CreateUser(user *User) error
	GetUserByID(id string) (*User, error)
	GetUserByEmail(email string) (*User, error)
	UpdatePassword(userID, passwordHash string) error
	VerifyEmail(userID string) error
	UpdateLastLogin(userID string) error
	IncrementFailedAttempts(userID string) error
	ResetFailedAttempts(userID string) error
}

// PostgresDB implements AuthDatabase using PostgreSQL
type PostgresDB struct {
	conn *sql.DB
}

// NewPostgresDB creates a new PostgreSQL database connection
func NewPostgresDB(databaseURL string) (*PostgresDB, error) {
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

	log.Println("Database connected successfully")

	return &PostgresDB{conn: conn}, nil
}

// Close closes the database connection
func (db *PostgresDB) Close() error {
	return db.conn.Close()
}

// InitSchema creates the users table if it doesn't exist
func (db *PostgresDB) InitSchema() error {
	schema := `
	CREATE TABLE IF NOT EXISTS auth_users (
		id VARCHAR(36) PRIMARY KEY,
		email VARCHAR(255) UNIQUE NOT NULL,
		password_hash VARCHAR(255) NOT NULL,
		first_name VARCHAR(100),
		last_name VARCHAR(100),
		role VARCHAR(50) NOT NULL DEFAULT 'SALESPERSON',
		dealership_id VARCHAR(36),
		is_active BOOLEAN NOT NULL DEFAULT true,
		email_verified BOOLEAN NOT NULL DEFAULT false,
		failed_attempts INTEGER NOT NULL DEFAULT 0,
		locked_until TIMESTAMP,
		last_login_at TIMESTAMP,
		created_at TIMESTAMP NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMP NOT NULL DEFAULT NOW()
	);

	CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email);
	CREATE INDEX IF NOT EXISTS idx_auth_users_dealership ON auth_users(dealership_id);
	`

	_, err := db.conn.Exec(schema)
	if err != nil {
		return fmt.Errorf("failed to create schema: %w", err)
	}

	log.Println("Database schema initialized")
	return nil
}

// CreateUser creates a new user
func (db *PostgresDB) CreateUser(user *User) error {
	query := `
		INSERT INTO auth_users (
			id, email, password_hash, first_name, last_name,
			role, dealership_id, is_active, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`

	_, err := db.conn.Exec(query,
		user.ID, user.Email, user.PasswordHash, user.FirstName, user.LastName,
		user.Role, user.DealershipID, user.IsActive, user.CreatedAt, user.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}

	return nil
}

// GetUserByID retrieves a user by ID
func (db *PostgresDB) GetUserByID(id string) (*User, error) {
	query := `
		SELECT id, email, password_hash, first_name, last_name, role,
			   dealership_id, is_active, email_verified, failed_attempts,
			   locked_until, last_login_at, created_at, updated_at
		FROM auth_users
		WHERE id = $1
	`

	user := &User{}
	var dealershipID sql.NullString
	var firstName, lastName sql.NullString
	var lockedUntil, lastLoginAt sql.NullTime

	err := db.conn.QueryRow(query, id).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &firstName, &lastName,
		&user.Role, &dealershipID, &user.IsActive, &user.EmailVerified,
		&user.FailedAttempts, &lockedUntil, &lastLoginAt,
		&user.CreatedAt, &user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	if dealershipID.Valid {
		user.DealershipID = dealershipID.String
	}
	if firstName.Valid {
		user.FirstName = firstName.String
	}
	if lastName.Valid {
		user.LastName = lastName.String
	}
	if lockedUntil.Valid {
		user.LockedUntil = &lockedUntil.Time
	}
	if lastLoginAt.Valid {
		user.LastLoginAt = &lastLoginAt.Time
	}

	return user, nil
}

// GetUserByEmail retrieves a user by email
func (db *PostgresDB) GetUserByEmail(email string) (*User, error) {
	query := `
		SELECT id, email, password_hash, first_name, last_name, role,
			   dealership_id, is_active, email_verified, failed_attempts,
			   locked_until, last_login_at, created_at, updated_at
		FROM auth_users
		WHERE email = $1
	`

	user := &User{}
	var dealershipID sql.NullString
	var firstName, lastName sql.NullString
	var lockedUntil, lastLoginAt sql.NullTime

	err := db.conn.QueryRow(query, email).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &firstName, &lastName,
		&user.Role, &dealershipID, &user.IsActive, &user.EmailVerified,
		&user.FailedAttempts, &lockedUntil, &lastLoginAt,
		&user.CreatedAt, &user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	if dealershipID.Valid {
		user.DealershipID = dealershipID.String
	}
	if firstName.Valid {
		user.FirstName = firstName.String
	}
	if lastName.Valid {
		user.LastName = lastName.String
	}
	if lockedUntil.Valid {
		user.LockedUntil = &lockedUntil.Time
	}
	if lastLoginAt.Valid {
		user.LastLoginAt = &lastLoginAt.Time
	}

	return user, nil
}

// UpdatePassword updates a user's password
func (db *PostgresDB) UpdatePassword(userID, passwordHash string) error {
	query := `
		UPDATE auth_users
		SET password_hash = $1, updated_at = NOW()
		WHERE id = $2
	`

	_, err := db.conn.Exec(query, passwordHash, userID)
	if err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	return nil
}

// VerifyEmail marks a user's email as verified
func (db *PostgresDB) VerifyEmail(userID string) error {
	query := `
		UPDATE auth_users
		SET email_verified = true, updated_at = NOW()
		WHERE id = $1
	`

	_, err := db.conn.Exec(query, userID)
	if err != nil {
		return fmt.Errorf("failed to verify email: %w", err)
	}

	return nil
}

// UpdateLastLogin updates the user's last login timestamp
func (db *PostgresDB) UpdateLastLogin(userID string) error {
	query := `
		UPDATE auth_users
		SET last_login_at = NOW(), updated_at = NOW()
		WHERE id = $1
	`

	_, err := db.conn.Exec(query, userID)
	if err != nil {
		return fmt.Errorf("failed to update last login: %w", err)
	}

	return nil
}

// IncrementFailedAttempts increments the failed login attempts counter
func (db *PostgresDB) IncrementFailedAttempts(userID string) error {
	query := `
		UPDATE auth_users
		SET failed_attempts = failed_attempts + 1,
			locked_until = CASE
				WHEN failed_attempts >= 4 THEN NOW() + INTERVAL '15 minutes'
				ELSE locked_until
			END,
			updated_at = NOW()
		WHERE id = $1
	`

	_, err := db.conn.Exec(query, userID)
	if err != nil {
		return fmt.Errorf("failed to increment failed attempts: %w", err)
	}

	return nil
}

// ResetFailedAttempts resets the failed login attempts counter
func (db *PostgresDB) ResetFailedAttempts(userID string) error {
	query := `
		UPDATE auth_users
		SET failed_attempts = 0, locked_until = NULL, updated_at = NOW()
		WHERE id = $1
	`

	_, err := db.conn.Exec(query, userID)
	if err != nil {
		return fmt.Errorf("failed to reset failed attempts: %w", err)
	}

	return nil
}
