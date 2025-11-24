package main

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/lib/pq"
)

// Database wraps the SQL database connection
type Database struct {
	conn *sql.DB
}

// NewDatabase creates a new database connection
func NewDatabase(databaseURL string) (*Database, error) {
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

	log.Println("✅ Database connected successfully")

	return &Database{conn: conn}, nil
}

// Close closes the database connection
func (db *Database) Close() error {
	return db.conn.Close()
}

// InitSchema creates the deals table if it doesn't exist
func (db *Database) InitSchema() error {
	schema := `
	CREATE TABLE IF NOT EXISTS deals (
		id VARCHAR(36) PRIMARY KEY,
		dealership_id VARCHAR(36) NOT NULL,
		customer_id VARCHAR(36) NOT NULL,
		vehicle_price DECIMAL(10, 2) NOT NULL,
		trade_in_value DECIMAL(10, 2) DEFAULT 0,
		trade_in_payoff DECIMAL(10, 2) DEFAULT 0,
		down_payment DECIMAL(10, 2) DEFAULT 0,
		tax_amount DECIMAL(10, 2) DEFAULT 0,
		total_amount DECIMAL(10, 2) NOT NULL,
		status VARCHAR(50) NOT NULL DEFAULT 'draft',
		created_at TIMESTAMP NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMP NOT NULL DEFAULT NOW()
	);

	CREATE INDEX IF NOT EXISTS idx_deals_dealership ON deals(dealership_id);
	CREATE INDEX IF NOT EXISTS idx_deals_customer ON deals(customer_id);
	CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
	`

	if _, err := db.conn.Exec(schema); err != nil {
		return fmt.Errorf("failed to initialize schema: %w", err)
	}

	log.Println("✅ Database schema initialized")
	return nil
}

// CreateDeal inserts a new deal into the database
func (db *Database) CreateDeal(deal *Deal) error {
	query := `
		INSERT INTO deals (
			id, dealership_id, customer_id, vehicle_price,
			trade_in_value, trade_in_payoff, down_payment,
			tax_amount, total_amount, status, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`

	_, err := db.conn.Exec(
		query,
		deal.ID, deal.DealershipID, deal.CustomerID, deal.VehiclePrice,
		deal.TradeInValue, deal.TradeInPayoff, deal.DownPayment,
		deal.TaxAmount, deal.TotalAmount, deal.Status,
		deal.CreatedAt, deal.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create deal: %w", err)
	}

	return nil
}

// GetDeal retrieves a deal by ID
func (db *Database) GetDeal(id string) (*Deal, error) {
	query := `
		SELECT id, dealership_id, customer_id, vehicle_price,
			   trade_in_value, trade_in_payoff, down_payment,
			   tax_amount, total_amount, status, created_at, updated_at
		FROM deals
		WHERE id = $1
	`

	var deal Deal
	err := db.conn.QueryRow(query, id).Scan(
		&deal.ID, &deal.DealershipID, &deal.CustomerID, &deal.VehiclePrice,
		&deal.TradeInValue, &deal.TradeInPayoff, &deal.DownPayment,
		&deal.TaxAmount, &deal.TotalAmount, &deal.Status,
		&deal.CreatedAt, &deal.UpdatedAt,
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
			SELECT id, dealership_id, customer_id, vehicle_price,
				   trade_in_value, trade_in_payoff, down_payment,
				   tax_amount, total_amount, status, created_at, updated_at
			FROM deals
			WHERE dealership_id = $1
			ORDER BY created_at DESC
		`
		rows, err = db.conn.Query(query, dealershipID)
	} else {
		query = `
			SELECT id, dealership_id, customer_id, vehicle_price,
				   trade_in_value, trade_in_payoff, down_payment,
				   tax_amount, total_amount, status, created_at, updated_at
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
			&deal.ID, &deal.DealershipID, &deal.CustomerID, &deal.VehiclePrice,
			&deal.TradeInValue, &deal.TradeInPayoff, &deal.DownPayment,
			&deal.TaxAmount, &deal.TotalAmount, &deal.Status,
			&deal.CreatedAt, &deal.UpdatedAt,
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
			dealership_id = $2,
			customer_id = $3,
			vehicle_price = $4,
			trade_in_value = $5,
			trade_in_payoff = $6,
			down_payment = $7,
			tax_amount = $8,
			total_amount = $9,
			status = $10,
			updated_at = $11
		WHERE id = $1
	`

	result, err := db.conn.Exec(
		query,
		deal.ID, deal.DealershipID, deal.CustomerID, deal.VehiclePrice,
		deal.TradeInValue, deal.TradeInPayoff, deal.DownPayment,
		deal.TaxAmount, deal.TotalAmount, deal.Status, deal.UpdatedAt,
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
