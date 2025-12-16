package main

import (
	"database/sql"
	"fmt"
	"time"

	"autolytiq/shared/logging"

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

// InitSchema is now a no-op - schema is managed by migrations in /migrations
// Database is the single source of truth, managed via Drizzle migrations
func (db *Database) InitSchema() error {
	// Schema creation disabled - tables are created via migrations
	// This prevents schema drift between services and database
	if db.logger != nil {
		db.logger.Info("Schema initialization skipped - using migration-managed schema")
	}
	return nil
}

// CreateDeal inserts a new deal into the database
func (db *Database) CreateDeal(deal *Deal) error {
	query := `
		INSERT INTO deals (
			id, dealership_id, salesperson_id, customer_id, vehicle_id,
			status, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`

	_, err := db.conn.Exec(
		query,
		deal.ID, deal.DealershipID, deal.SalespersonID, deal.CustomerID, deal.VehicleID,
		deal.Status, deal.CreatedAt, deal.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create deal: %w", err)
	}

	return nil
}

// GetDeal retrieves a deal by ID
func (db *Database) GetDeal(id string) (*Deal, error) {
	query := `
		SELECT id, dealership_id, salesperson_id, customer_id, vehicle_id,
			   status, created_at, updated_at
		FROM deals
		WHERE id = $1
	`

	var deal Deal
	err := db.conn.QueryRow(query, id).Scan(
		&deal.ID, &deal.DealershipID, &deal.SalespersonID, &deal.CustomerID, &deal.VehicleID,
		&deal.Status, &deal.CreatedAt, &deal.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get deal: %w", err)
	}

	return &deal, nil
}

// ListDeals retrieves all deals, optionally filtered by dealership
func (db *Database) ListDeals(dealershipID string) ([]*Deal, error) {
	var query string
	var rows *sql.Rows
	var err error

	if dealershipID != "" {
		query = `
			SELECT id, dealership_id, salesperson_id, customer_id, vehicle_id,
				   status, created_at, updated_at
			FROM deals
			WHERE dealership_id = $1
			ORDER BY created_at DESC
		`
		rows, err = db.conn.Query(query, dealershipID)
	} else {
		query = `
			SELECT id, dealership_id, salesperson_id, customer_id, vehicle_id,
				   status, created_at, updated_at
			FROM deals
			ORDER BY created_at DESC
		`
		rows, err = db.conn.Query(query)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to list deals: %w", err)
	}
	defer rows.Close()

	var deals []*Deal
	for rows.Next() {
		var deal Deal
		err := rows.Scan(
			&deal.ID, &deal.DealershipID, &deal.SalespersonID, &deal.CustomerID, &deal.VehicleID,
			&deal.Status, &deal.CreatedAt, &deal.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan deal: %w", err)
		}
		deals = append(deals, &deal)
	}

	return deals, nil
}

// UpdateDeal updates an existing deal
func (db *Database) UpdateDeal(deal *Deal) error {
	query := `
		UPDATE deals SET
			customer_id = $2,
			vehicle_id = $3,
			status = $4,
			updated_at = $5
		WHERE id = $1
	`

	result, err := db.conn.Exec(
		query,
		deal.ID, deal.CustomerID, deal.VehicleID,
		deal.Status, deal.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to update deal: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("deal not found: %s", deal.ID)
	}

	return nil
}

// DeleteDeal deletes a deal by ID
func (db *Database) DeleteDeal(id string) error {
	query := `DELETE FROM deals WHERE id = $1`

	result, err := db.conn.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete deal: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("deal not found: %s", id)
	}

	return nil
}
