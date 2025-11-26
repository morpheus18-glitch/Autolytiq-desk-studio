package main

import (
	"database/sql"
	"fmt"
	"regexp"
	"strings"
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

// InitSchema creates the vehicles table if it doesn't exist
func (db *Database) InitSchema() error {
	schema := `
	CREATE TABLE IF NOT EXISTS vehicles (
		id VARCHAR(36) PRIMARY KEY,
		dealership_id VARCHAR(36) NOT NULL,
		vin VARCHAR(17) UNIQUE,
		stock_number VARCHAR(50),
		make VARCHAR(50) NOT NULL,
		model VARCHAR(50) NOT NULL,
		year INTEGER NOT NULL,
		trim VARCHAR(50),
		condition VARCHAR(20) DEFAULT 'used',
		status VARCHAR(20) DEFAULT 'available',
		price DECIMAL(10, 2) NOT NULL,
		mileage INTEGER DEFAULT 0,
		color VARCHAR(30),
		transmission VARCHAR(20),
		engine VARCHAR(50),
		fuel_type VARCHAR(20),
		drive_type VARCHAR(10),
		body_style VARCHAR(30),
		image_url TEXT,
		features TEXT,
		created_at TIMESTAMP NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMP NOT NULL DEFAULT NOW()
	);

	CREATE INDEX IF NOT EXISTS idx_vehicles_dealership ON vehicles(dealership_id);
	CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles(vin);
	CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
	CREATE INDEX IF NOT EXISTS idx_vehicles_make_model ON vehicles(make, model);
	`

	if _, err := db.conn.Exec(schema); err != nil {
		return fmt.Errorf("failed to initialize schema: %w", err)
	}

	if db.logger != nil {
		db.logger.Info("Database schema initialized")
	}
	return nil
}

// CreateVehicle inserts a new vehicle into the database
func (db *Database) CreateVehicle(vehicle *Vehicle) error {
	query := `
		INSERT INTO vehicles (
			id, dealership_id, vin, stock_number, make, model, year, trim,
			condition, status, price, mileage, color, transmission, engine,
			fuel_type, drive_type, body_style, image_url, features,
			created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
	`

	_, err := db.conn.Exec(
		query,
		vehicle.ID, vehicle.DealershipID, vehicle.VIN, vehicle.StockNumber,
		vehicle.Make, vehicle.Model, vehicle.Year, vehicle.Trim,
		vehicle.Condition, vehicle.Status, vehicle.Price, vehicle.Mileage,
		vehicle.Color, vehicle.Transmission, vehicle.Engine, vehicle.FuelType,
		vehicle.DriveType, vehicle.BodyStyle, vehicle.ImageURL, vehicle.Features,
		vehicle.CreatedAt, vehicle.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create vehicle: %w", err)
	}

	return nil
}

// GetVehicle retrieves a vehicle by ID
func (db *Database) GetVehicle(id string) (*Vehicle, error) {
	query := `
		SELECT id, dealership_id, vin, stock_number, make, model, year, trim,
			   condition, status, price, mileage, color, transmission, engine,
			   fuel_type, drive_type, body_style, image_url, features,
			   created_at, updated_at
		FROM vehicles
		WHERE id = $1
	`

	var vehicle Vehicle
	err := db.conn.QueryRow(query, id).Scan(
		&vehicle.ID, &vehicle.DealershipID, &vehicle.VIN, &vehicle.StockNumber,
		&vehicle.Make, &vehicle.Model, &vehicle.Year, &vehicle.Trim,
		&vehicle.Condition, &vehicle.Status, &vehicle.Price, &vehicle.Mileage,
		&vehicle.Color, &vehicle.Transmission, &vehicle.Engine, &vehicle.FuelType,
		&vehicle.DriveType, &vehicle.BodyStyle, &vehicle.ImageURL, &vehicle.Features,
		&vehicle.CreatedAt, &vehicle.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get vehicle: %w", err)
	}

	return &vehicle, nil
}

// ListVehicles retrieves all vehicles with optional filters
func (db *Database) ListVehicles(dealershipID string, filters map[string]interface{}) ([]*Vehicle, error) {
	query := `
		SELECT id, dealership_id, vin, stock_number, make, model, year, trim,
			   condition, status, price, mileage, color, transmission, engine,
			   fuel_type, drive_type, body_style, image_url, features,
			   created_at, updated_at
		FROM vehicles
		WHERE 1=1
	`

	var args []interface{}
	argIndex := 1

	// Add dealership filter
	if dealershipID != "" {
		query += fmt.Sprintf(" AND dealership_id = $%d", argIndex)
		args = append(args, dealershipID)
		argIndex++
	}

	// Add optional filters
	if make, ok := filters["make"].(string); ok && make != "" {
		query += fmt.Sprintf(" AND LOWER(make) = LOWER($%d)", argIndex)
		args = append(args, make)
		argIndex++
	}

	if model, ok := filters["model"].(string); ok && model != "" {
		query += fmt.Sprintf(" AND LOWER(model) = LOWER($%d)", argIndex)
		args = append(args, model)
		argIndex++
	}

	if year, ok := filters["year"].(int); ok && year > 0 {
		query += fmt.Sprintf(" AND year = $%d", argIndex)
		args = append(args, year)
		argIndex++
	}

	if condition, ok := filters["condition"].(string); ok && condition != "" {
		query += fmt.Sprintf(" AND condition = $%d", argIndex)
		args = append(args, condition)
		argIndex++
	}

	if status, ok := filters["status"].(string); ok && status != "" {
		query += fmt.Sprintf(" AND status = $%d", argIndex)
		args = append(args, status)
		argIndex++
	}

	// Price range filter
	if priceMin, ok := filters["price_min"].(float64); ok && priceMin > 0 {
		query += fmt.Sprintf(" AND price >= $%d", argIndex)
		args = append(args, priceMin)
		argIndex++
	}

	if priceMax, ok := filters["price_max"].(float64); ok && priceMax > 0 {
		query += fmt.Sprintf(" AND price <= $%d", argIndex)
		args = append(args, priceMax)
		argIndex++
	}

	query += " ORDER BY created_at DESC"

	rows, err := db.conn.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list vehicles: %w", err)
	}
	defer rows.Close()

	var vehicles []*Vehicle
	for rows.Next() {
		var vehicle Vehicle
		err := rows.Scan(
			&vehicle.ID, &vehicle.DealershipID, &vehicle.VIN, &vehicle.StockNumber,
			&vehicle.Make, &vehicle.Model, &vehicle.Year, &vehicle.Trim,
			&vehicle.Condition, &vehicle.Status, &vehicle.Price, &vehicle.Mileage,
			&vehicle.Color, &vehicle.Transmission, &vehicle.Engine, &vehicle.FuelType,
			&vehicle.DriveType, &vehicle.BodyStyle, &vehicle.ImageURL, &vehicle.Features,
			&vehicle.CreatedAt, &vehicle.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan vehicle: %w", err)
		}
		vehicles = append(vehicles, &vehicle)
	}

	return vehicles, nil
}

// UpdateVehicle updates an existing vehicle
func (db *Database) UpdateVehicle(vehicle *Vehicle) error {
	query := `
		UPDATE vehicles SET
			dealership_id = $2,
			vin = $3,
			stock_number = $4,
			make = $5,
			model = $6,
			year = $7,
			trim = $8,
			condition = $9,
			status = $10,
			price = $11,
			mileage = $12,
			color = $13,
			transmission = $14,
			engine = $15,
			fuel_type = $16,
			drive_type = $17,
			body_style = $18,
			image_url = $19,
			features = $20,
			updated_at = $21
		WHERE id = $1
	`

	result, err := db.conn.Exec(
		query,
		vehicle.ID, vehicle.DealershipID, vehicle.VIN, vehicle.StockNumber,
		vehicle.Make, vehicle.Model, vehicle.Year, vehicle.Trim,
		vehicle.Condition, vehicle.Status, vehicle.Price, vehicle.Mileage,
		vehicle.Color, vehicle.Transmission, vehicle.Engine, vehicle.FuelType,
		vehicle.DriveType, vehicle.BodyStyle, vehicle.ImageURL, vehicle.Features,
		vehicle.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to update vehicle: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("vehicle not found: %s", vehicle.ID)
	}

	return nil
}

// DeleteVehicle deletes a vehicle by ID
func (db *Database) DeleteVehicle(id string) error {
	query := `DELETE FROM vehicles WHERE id = $1`

	result, err := db.conn.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete vehicle: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("vehicle not found: %s", id)
	}

	return nil
}

// ValidateVIN validates a VIN (Vehicle Identification Number)
func (db *Database) ValidateVIN(vin string) (bool, error) {
	// VIN must be exactly 17 characters
	if len(vin) != 17 {
		return false, nil
	}

	// VIN must be uppercase alphanumeric (no I, O, Q)
	vinPattern := regexp.MustCompile(`^[A-HJ-NPR-Z0-9]{17}$`)
	if !vinPattern.MatchString(strings.ToUpper(vin)) {
		return false, nil
	}

	return true, nil
}

// GetInventoryStats retrieves inventory statistics for a dealership
func (db *Database) GetInventoryStats(dealershipID string) (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	// Total count
	var totalCount int
	err := db.conn.QueryRow(`
		SELECT COUNT(*) FROM vehicles WHERE dealership_id = $1
	`, dealershipID).Scan(&totalCount)
	if err != nil {
		return nil, fmt.Errorf("failed to get total count: %w", err)
	}
	stats["total_count"] = totalCount

	// Count by status
	statusRows, err := db.conn.Query(`
		SELECT status, COUNT(*) as count
		FROM vehicles
		WHERE dealership_id = $1
		GROUP BY status
	`, dealershipID)
	if err != nil {
		return nil, fmt.Errorf("failed to get status counts: %w", err)
	}
	defer statusRows.Close()

	statusCounts := make(map[string]int)
	for statusRows.Next() {
		var status string
		var count int
		if err := statusRows.Scan(&status, &count); err != nil {
			return nil, fmt.Errorf("failed to scan status count: %w", err)
		}
		statusCounts[status] = count
	}
	stats["by_status"] = statusCounts

	// Count by condition
	conditionRows, err := db.conn.Query(`
		SELECT condition, COUNT(*) as count
		FROM vehicles
		WHERE dealership_id = $1
		GROUP BY condition
	`, dealershipID)
	if err != nil {
		return nil, fmt.Errorf("failed to get condition counts: %w", err)
	}
	defer conditionRows.Close()

	conditionCounts := make(map[string]int)
	for conditionRows.Next() {
		var condition string
		var count int
		if err := conditionRows.Scan(&condition, &count); err != nil {
			return nil, fmt.Errorf("failed to scan condition count: %w", err)
		}
		conditionCounts[condition] = count
	}
	stats["by_condition"] = conditionCounts

	// Average price
	var avgPrice sql.NullFloat64
	err = db.conn.QueryRow(`
		SELECT AVG(price) FROM vehicles WHERE dealership_id = $1
	`, dealershipID).Scan(&avgPrice)
	if err != nil {
		return nil, fmt.Errorf("failed to get average price: %w", err)
	}
	if avgPrice.Valid {
		stats["average_price"] = avgPrice.Float64
	} else {
		stats["average_price"] = 0.0
	}

	return stats, nil
}
