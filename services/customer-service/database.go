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

// InitSchema creates the customers table if it doesn't exist
func (db *Database) InitSchema() error {
	schema := `
	CREATE TABLE IF NOT EXISTS customers (
		id VARCHAR(36) PRIMARY KEY,
		dealership_id VARCHAR(36) NOT NULL,
		first_name VARCHAR(100) NOT NULL,
		last_name VARCHAR(100) NOT NULL,
		email VARCHAR(255),
		phone VARCHAR(20),
		address VARCHAR(255),
		city VARCHAR(100),
		state VARCHAR(2),
		zip_code VARCHAR(10),
		credit_score INTEGER,
		created_at TIMESTAMP NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMP NOT NULL DEFAULT NOW()
	);

	CREATE INDEX IF NOT EXISTS idx_customers_dealership ON customers(dealership_id);
	CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
	CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(last_name, first_name);
	`

	if _, err := db.conn.Exec(schema); err != nil {
		return fmt.Errorf("failed to initialize schema: %w", err)
	}

	log.Println("✅ Database schema initialized")
	return nil
}

// CreateCustomer inserts a new customer into the database
func (db *Database) CreateCustomer(customer *Customer) error {
	query := `
		INSERT INTO customers (
			id, dealership_id, first_name, last_name,
			email, phone, address, city, state, zip_code,
			credit_score, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
	`

	_, err := db.conn.Exec(
		query,
		customer.ID, customer.DealershipID, customer.FirstName, customer.LastName,
		customer.Email, customer.Phone, customer.Address, customer.City,
		customer.State, customer.ZipCode, customer.CreditScore,
		customer.CreatedAt, customer.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create customer: %w", err)
	}

	return nil
}

// GetCustomer retrieves a customer by ID
func (db *Database) GetCustomer(id string) (*Customer, error) {
	query := `
		SELECT id, dealership_id, first_name, last_name,
		       email, phone, address, city, state, zip_code,
		       credit_score, created_at, updated_at
		FROM customers
		WHERE id = $1
	`

	var customer Customer
	err := db.conn.QueryRow(query, id).Scan(
		&customer.ID, &customer.DealershipID, &customer.FirstName, &customer.LastName,
		&customer.Email, &customer.Phone, &customer.Address, &customer.City,
		&customer.State, &customer.ZipCode, &customer.CreditScore,
		&customer.CreatedAt, &customer.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get customer: %w", err)
	}

	return &customer, nil
}

// ListCustomers retrieves all customers, optionally filtered by dealership
func (db *Database) ListCustomers(dealershipID string) ([]*Customer, error) {
	var query string
	var rows *sql.Rows
	var err error

	if dealershipID != "" {
		query = `
			SELECT id, dealership_id, first_name, last_name,
			       email, phone, address, city, state, zip_code,
			       credit_score, created_at, updated_at
			FROM customers
			WHERE dealership_id = $1
			ORDER BY last_name, first_name
		`
		rows, err = db.conn.Query(query, dealershipID)
	} else {
		query = `
			SELECT id, dealership_id, first_name, last_name,
			       email, phone, address, city, state, zip_code,
			       credit_score, created_at, updated_at
			FROM customers
			ORDER BY last_name, first_name
		`
		rows, err = db.conn.Query(query)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to list customers: %w", err)
	}
	defer rows.Close()

	var customers []*Customer
	for rows.Next() {
		var customer Customer
		err := rows.Scan(
			&customer.ID, &customer.DealershipID, &customer.FirstName, &customer.LastName,
			&customer.Email, &customer.Phone, &customer.Address, &customer.City,
			&customer.State, &customer.ZipCode, &customer.CreditScore,
			&customer.CreatedAt, &customer.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan customer: %w", err)
		}
		customers = append(customers, &customer)
	}

	return customers, nil
}

// UpdateCustomer updates an existing customer
func (db *Database) UpdateCustomer(customer *Customer) error {
	query := `
		UPDATE customers SET
			dealership_id = $2,
			first_name = $3,
			last_name = $4,
			email = $5,
			phone = $6,
			address = $7,
			city = $8,
			state = $9,
			zip_code = $10,
			credit_score = $11,
			updated_at = $12
		WHERE id = $1
	`

	result, err := db.conn.Exec(
		query,
		customer.ID, customer.DealershipID, customer.FirstName, customer.LastName,
		customer.Email, customer.Phone, customer.Address, customer.City,
		customer.State, customer.ZipCode, customer.CreditScore, customer.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to update customer: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("customer not found: %s", customer.ID)
	}

	return nil
}

// DeleteCustomer deletes a customer by ID
func (db *Database) DeleteCustomer(id string) error {
	query := `DELETE FROM customers WHERE id = $1`

	result, err := db.conn.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete customer: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("customer not found: %s", id)
	}

	return nil
}
