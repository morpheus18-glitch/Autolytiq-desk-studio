package main

import (
	"database/sql"
	"fmt"
	"strconv"
	"time"

	"autolytiq/shared/logging"

	_ "github.com/lib/pq"

	"autolytiq/shared/encryption"
)

// Database wraps the SQL database connection
type Database struct {
	conn      *sql.DB
	encryptor *encryption.FieldEncryptor
	logger    *logging.Logger
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

// SetEncryptor sets the field encryptor for PII data
func (db *Database) SetEncryptor(enc *encryption.FieldEncryptor) {
	db.encryptor = enc
	if enc != nil && db.logger != nil {
		db.logger.Info("Database PII encryption enabled")
	}
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
		ssn_last4 TEXT,
		drivers_license_number TEXT,
		monthly_income NUMERIC(12, 2),
		ssn_last4_encrypted TEXT,
		drivers_license_number_encrypted TEXT,
		credit_score_encrypted TEXT,
		monthly_income_encrypted TEXT,
		pii_encryption_version TEXT,
		created_at TIMESTAMP NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMP NOT NULL DEFAULT NOW()
	);

	CREATE INDEX IF NOT EXISTS idx_customers_dealership ON customers(dealership_id);
	CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
	CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(last_name, first_name);
	CREATE INDEX IF NOT EXISTS idx_customers_pii_encryption_version ON customers(pii_encryption_version) WHERE pii_encryption_version IS NULL;
	`

	if _, err := db.conn.Exec(schema); err != nil {
		return fmt.Errorf("failed to initialize schema: %w", err)
	}

	if db.logger != nil {
		db.logger.Info("Database schema initialized")
	}
	return nil
}

// CreateCustomer inserts a new customer into the database
func (db *Database) CreateCustomer(customer *Customer) error {
	// Encrypt PII fields if encryptor is available
	var ssnEncrypted, dlEncrypted, creditEncrypted, incomeEncrypted sql.NullString
	var piiVersion sql.NullString

	if db.encryptor != nil {
		piiVersion = sql.NullString{String: "v1", Valid: true}

		if customer.SSNLast4 != "" {
			encrypted, err := db.encryptor.Encrypt(customer.SSNLast4)
			if err != nil {
				return fmt.Errorf("failed to encrypt SSN: %w", err)
			}
			ssnEncrypted = sql.NullString{String: encrypted, Valid: true}
		}

		if customer.DriversLicenseNumber != "" {
			encrypted, err := db.encryptor.Encrypt(customer.DriversLicenseNumber)
			if err != nil {
				return fmt.Errorf("failed to encrypt drivers license: %w", err)
			}
			dlEncrypted = sql.NullString{String: encrypted, Valid: true}
		}

		if customer.CreditScore > 0 {
			encrypted, err := db.encryptor.Encrypt(strconv.Itoa(customer.CreditScore))
			if err != nil {
				return fmt.Errorf("failed to encrypt credit score: %w", err)
			}
			creditEncrypted = sql.NullString{String: encrypted, Valid: true}
		}

		if customer.MonthlyIncome > 0 {
			encrypted, err := db.encryptor.Encrypt(strconv.FormatFloat(customer.MonthlyIncome, 'f', 2, 64))
			if err != nil {
				return fmt.Errorf("failed to encrypt monthly income: %w", err)
			}
			incomeEncrypted = sql.NullString{String: encrypted, Valid: true}
		}
	}

	query := `
		INSERT INTO customers (
			id, dealership_id, first_name, last_name,
			email, phone, address, city, state, zip_code,
			credit_score, ssn_last4, drivers_license_number, monthly_income,
			ssn_last4_encrypted, drivers_license_number_encrypted,
			credit_score_encrypted, monthly_income_encrypted,
			pii_encryption_version, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
	`

	// If encryption is enabled, store nulls in plaintext columns
	var plainCreditScore sql.NullInt64
	var plainSSN, plainDL sql.NullString
	var plainIncome sql.NullFloat64

	if db.encryptor == nil {
		// No encryption - store in plaintext columns
		if customer.CreditScore > 0 {
			plainCreditScore = sql.NullInt64{Int64: int64(customer.CreditScore), Valid: true}
		}
		if customer.SSNLast4 != "" {
			plainSSN = sql.NullString{String: customer.SSNLast4, Valid: true}
		}
		if customer.DriversLicenseNumber != "" {
			plainDL = sql.NullString{String: customer.DriversLicenseNumber, Valid: true}
		}
		if customer.MonthlyIncome > 0 {
			plainIncome = sql.NullFloat64{Float64: customer.MonthlyIncome, Valid: true}
		}
	}

	_, err := db.conn.Exec(
		query,
		customer.ID, customer.DealershipID, customer.FirstName, customer.LastName,
		customer.Email, customer.Phone, customer.Address, customer.City,
		customer.State, customer.ZipCode,
		plainCreditScore, plainSSN, plainDL, plainIncome,
		ssnEncrypted, dlEncrypted, creditEncrypted, incomeEncrypted,
		piiVersion, customer.CreatedAt, customer.UpdatedAt,
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
		       credit_score, ssn_last4, drivers_license_number, monthly_income,
		       ssn_last4_encrypted, drivers_license_number_encrypted,
		       credit_score_encrypted, monthly_income_encrypted,
		       pii_encryption_version, created_at, updated_at
		FROM customers
		WHERE id = $1
	`

	var customer Customer
	var plainCreditScore sql.NullInt64
	var plainSSN, plainDL sql.NullString
	var plainIncome sql.NullFloat64
	var ssnEncrypted, dlEncrypted, creditEncrypted, incomeEncrypted, piiVersion sql.NullString

	err := db.conn.QueryRow(query, id).Scan(
		&customer.ID, &customer.DealershipID, &customer.FirstName, &customer.LastName,
		&customer.Email, &customer.Phone, &customer.Address, &customer.City,
		&customer.State, &customer.ZipCode,
		&plainCreditScore, &plainSSN, &plainDL, &plainIncome,
		&ssnEncrypted, &dlEncrypted, &creditEncrypted, &incomeEncrypted,
		&piiVersion, &customer.CreatedAt, &customer.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get customer: %w", err)
	}

	// Decrypt PII fields if encrypted
	if piiVersion.Valid && db.encryptor != nil {
		if ssnEncrypted.Valid {
			decrypted, err := db.encryptor.Decrypt(ssnEncrypted.String)
			if err != nil {
				return nil, fmt.Errorf("failed to decrypt SSN: %w", err)
			}
			customer.SSNLast4 = decrypted
		}

		if dlEncrypted.Valid {
			decrypted, err := db.encryptor.Decrypt(dlEncrypted.String)
			if err != nil {
				return nil, fmt.Errorf("failed to decrypt drivers license: %w", err)
			}
			customer.DriversLicenseNumber = decrypted
		}

		if creditEncrypted.Valid {
			decrypted, err := db.encryptor.Decrypt(creditEncrypted.String)
			if err != nil {
				return nil, fmt.Errorf("failed to decrypt credit score: %w", err)
			}
			score, _ := strconv.Atoi(decrypted)
			customer.CreditScore = score
		}

		if incomeEncrypted.Valid {
			decrypted, err := db.encryptor.Decrypt(incomeEncrypted.String)
			if err != nil {
				return nil, fmt.Errorf("failed to decrypt monthly income: %w", err)
			}
			income, _ := strconv.ParseFloat(decrypted, 64)
			customer.MonthlyIncome = income
		}
	} else {
		// Use plaintext values (for backward compatibility)
		if plainCreditScore.Valid {
			customer.CreditScore = int(plainCreditScore.Int64)
		}
		if plainSSN.Valid {
			customer.SSNLast4 = plainSSN.String
		}
		if plainDL.Valid {
			customer.DriversLicenseNumber = plainDL.String
		}
		if plainIncome.Valid {
			customer.MonthlyIncome = plainIncome.Float64
		}
	}

	return &customer, nil
}

// ListCustomers retrieves all customers, optionally filtered by dealership
func (db *Database) ListCustomers(dealershipID string) ([]*Customer, error) {
	var rows *sql.Rows
	var err error

	baseQuery := `
		SELECT id, dealership_id, first_name, last_name,
		       email, phone, address, city, state, zip_code,
		       credit_score, ssn_last4, drivers_license_number, monthly_income,
		       ssn_last4_encrypted, drivers_license_number_encrypted,
		       credit_score_encrypted, monthly_income_encrypted,
		       pii_encryption_version, created_at, updated_at
		FROM customers
	`

	if dealershipID != "" {
		query := baseQuery + " WHERE dealership_id = $1 ORDER BY last_name, first_name"
		rows, err = db.conn.Query(query, dealershipID)
	} else {
		query := baseQuery + " ORDER BY last_name, first_name"
		rows, err = db.conn.Query(query)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to list customers: %w", err)
	}
	defer rows.Close()

	var customers []*Customer
	for rows.Next() {
		var customer Customer
		var plainCreditScore sql.NullInt64
		var plainSSN, plainDL sql.NullString
		var plainIncome sql.NullFloat64
		var ssnEncrypted, dlEncrypted, creditEncrypted, incomeEncrypted, piiVersion sql.NullString

		err := rows.Scan(
			&customer.ID, &customer.DealershipID, &customer.FirstName, &customer.LastName,
			&customer.Email, &customer.Phone, &customer.Address, &customer.City,
			&customer.State, &customer.ZipCode,
			&plainCreditScore, &plainSSN, &plainDL, &plainIncome,
			&ssnEncrypted, &dlEncrypted, &creditEncrypted, &incomeEncrypted,
			&piiVersion, &customer.CreatedAt, &customer.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan customer: %w", err)
		}

		// Decrypt PII fields if encrypted
		if piiVersion.Valid && db.encryptor != nil {
			if ssnEncrypted.Valid {
				decrypted, err := db.encryptor.Decrypt(ssnEncrypted.String)
				if err != nil {
					return nil, fmt.Errorf("failed to decrypt SSN: %w", err)
				}
				customer.SSNLast4 = decrypted
			}

			if dlEncrypted.Valid {
				decrypted, err := db.encryptor.Decrypt(dlEncrypted.String)
				if err != nil {
					return nil, fmt.Errorf("failed to decrypt drivers license: %w", err)
				}
				customer.DriversLicenseNumber = decrypted
			}

			if creditEncrypted.Valid {
				decrypted, err := db.encryptor.Decrypt(creditEncrypted.String)
				if err != nil {
					return nil, fmt.Errorf("failed to decrypt credit score: %w", err)
				}
				score, _ := strconv.Atoi(decrypted)
				customer.CreditScore = score
			}

			if incomeEncrypted.Valid {
				decrypted, err := db.encryptor.Decrypt(incomeEncrypted.String)
				if err != nil {
					return nil, fmt.Errorf("failed to decrypt monthly income: %w", err)
				}
				income, _ := strconv.ParseFloat(decrypted, 64)
				customer.MonthlyIncome = income
			}
		} else {
			// Use plaintext values (for backward compatibility)
			if plainCreditScore.Valid {
				customer.CreditScore = int(plainCreditScore.Int64)
			}
			if plainSSN.Valid {
				customer.SSNLast4 = plainSSN.String
			}
			if plainDL.Valid {
				customer.DriversLicenseNumber = plainDL.String
			}
			if plainIncome.Valid {
				customer.MonthlyIncome = plainIncome.Float64
			}
		}

		customers = append(customers, &customer)
	}

	return customers, nil
}

// UpdateCustomer updates an existing customer
func (db *Database) UpdateCustomer(customer *Customer) error {
	// Encrypt PII fields if encryptor is available
	var ssnEncrypted, dlEncrypted, creditEncrypted, incomeEncrypted sql.NullString
	var piiVersion sql.NullString

	if db.encryptor != nil {
		piiVersion = sql.NullString{String: "v1", Valid: true}

		if customer.SSNLast4 != "" {
			encrypted, err := db.encryptor.Encrypt(customer.SSNLast4)
			if err != nil {
				return fmt.Errorf("failed to encrypt SSN: %w", err)
			}
			ssnEncrypted = sql.NullString{String: encrypted, Valid: true}
		}

		if customer.DriversLicenseNumber != "" {
			encrypted, err := db.encryptor.Encrypt(customer.DriversLicenseNumber)
			if err != nil {
				return fmt.Errorf("failed to encrypt drivers license: %w", err)
			}
			dlEncrypted = sql.NullString{String: encrypted, Valid: true}
		}

		if customer.CreditScore > 0 {
			encrypted, err := db.encryptor.Encrypt(strconv.Itoa(customer.CreditScore))
			if err != nil {
				return fmt.Errorf("failed to encrypt credit score: %w", err)
			}
			creditEncrypted = sql.NullString{String: encrypted, Valid: true}
		}

		if customer.MonthlyIncome > 0 {
			encrypted, err := db.encryptor.Encrypt(strconv.FormatFloat(customer.MonthlyIncome, 'f', 2, 64))
			if err != nil {
				return fmt.Errorf("failed to encrypt monthly income: %w", err)
			}
			incomeEncrypted = sql.NullString{String: encrypted, Valid: true}
		}
	}

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
			ssn_last4 = $12,
			drivers_license_number = $13,
			monthly_income = $14,
			ssn_last4_encrypted = $15,
			drivers_license_number_encrypted = $16,
			credit_score_encrypted = $17,
			monthly_income_encrypted = $18,
			pii_encryption_version = $19,
			updated_at = $20
		WHERE id = $1
	`

	// If encryption is enabled, store nulls in plaintext columns
	var plainCreditScore sql.NullInt64
	var plainSSN, plainDL sql.NullString
	var plainIncome sql.NullFloat64

	if db.encryptor == nil {
		// No encryption - store in plaintext columns
		if customer.CreditScore > 0 {
			plainCreditScore = sql.NullInt64{Int64: int64(customer.CreditScore), Valid: true}
		}
		if customer.SSNLast4 != "" {
			plainSSN = sql.NullString{String: customer.SSNLast4, Valid: true}
		}
		if customer.DriversLicenseNumber != "" {
			plainDL = sql.NullString{String: customer.DriversLicenseNumber, Valid: true}
		}
		if customer.MonthlyIncome > 0 {
			plainIncome = sql.NullFloat64{Float64: customer.MonthlyIncome, Valid: true}
		}
	}

	result, err := db.conn.Exec(
		query,
		customer.ID, customer.DealershipID, customer.FirstName, customer.LastName,
		customer.Email, customer.Phone, customer.Address, customer.City,
		customer.State, customer.ZipCode,
		plainCreditScore, plainSSN, plainDL, plainIncome,
		ssnEncrypted, dlEncrypted, creditEncrypted, incomeEncrypted,
		piiVersion, customer.UpdatedAt,
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

// SoftDeleteCustomer marks a customer as deleted without removing the record
func (db *Database) SoftDeleteCustomer(id string) error {
	query := `UPDATE customers SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`

	result, err := db.conn.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to soft delete customer: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("customer not found or already deleted: %s", id)
	}

	return nil
}

// AnonymizeCustomer replaces PII fields with anonymized values
func (db *Database) AnonymizeCustomer(id string) error {
	query := `
		UPDATE customers SET
			first_name = 'ANONYMIZED',
			last_name = 'ANONYMIZED',
			email = CONCAT('anonymized_', id, '@deleted.local'),
			phone = 'ANONYMIZED',
			address = 'ANONYMIZED',
			city = 'ANONYMIZED',
			zip_code = 'ANONYMIZED',
			credit_score = NULL,
			ssn_last4 = NULL,
			drivers_license_number = NULL,
			monthly_income = NULL,
			ssn_last4_encrypted = NULL,
			drivers_license_number_encrypted = NULL,
			credit_score_encrypted = NULL,
			monthly_income_encrypted = NULL,
			anonymized_at = NOW(),
			updated_at = NOW()
		WHERE id = $1
	`

	result, err := db.conn.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to anonymize customer: %w", err)
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

// GetCustomerWithGDPRFields retrieves a customer including GDPR-specific fields
func (db *Database) GetCustomerWithGDPRFields(id string) (*CustomerWithGDPR, error) {
	query := `
		SELECT id, dealership_id, first_name, last_name,
		       email, phone, address, city, state, zip_code,
		       credit_score, ssn_last4, drivers_license_number, monthly_income,
		       ssn_last4_encrypted, drivers_license_number_encrypted,
		       credit_score_encrypted, monthly_income_encrypted,
		       pii_encryption_version, created_at, updated_at,
		       deleted_at, retention_expires_at, anonymized_at, last_activity_at
		FROM customers
		WHERE id = $1
	`

	var customer CustomerWithGDPR
	var plainCreditScore sql.NullInt64
	var plainSSN, plainDL sql.NullString
	var plainIncome sql.NullFloat64
	var ssnEncrypted, dlEncrypted, creditEncrypted, incomeEncrypted, piiVersion sql.NullString
	var deletedAt, retentionExpiresAt, anonymizedAt, lastActivityAt sql.NullTime

	err := db.conn.QueryRow(query, id).Scan(
		&customer.ID, &customer.DealershipID, &customer.FirstName, &customer.LastName,
		&customer.Email, &customer.Phone, &customer.Address, &customer.City,
		&customer.State, &customer.ZipCode,
		&plainCreditScore, &plainSSN, &plainDL, &plainIncome,
		&ssnEncrypted, &dlEncrypted, &creditEncrypted, &incomeEncrypted,
		&piiVersion, &customer.CreatedAt, &customer.UpdatedAt,
		&deletedAt, &retentionExpiresAt, &anonymizedAt, &lastActivityAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get customer: %w", err)
	}

	// Handle nullable GDPR fields
	if deletedAt.Valid {
		customer.DeletedAt = &deletedAt.Time
	}
	if retentionExpiresAt.Valid {
		customer.RetentionExpiresAt = &retentionExpiresAt.Time
	}
	if anonymizedAt.Valid {
		customer.AnonymizedAt = &anonymizedAt.Time
	}
	if lastActivityAt.Valid {
		customer.LastActivityAt = &lastActivityAt.Time
	}

	// Decrypt PII fields if encrypted (same logic as GetCustomer)
	if piiVersion.Valid && db.encryptor != nil {
		if ssnEncrypted.Valid {
			decrypted, err := db.encryptor.Decrypt(ssnEncrypted.String)
			if err != nil {
				return nil, fmt.Errorf("failed to decrypt SSN: %w", err)
			}
			customer.SSNLast4 = decrypted
		}
		if dlEncrypted.Valid {
			decrypted, err := db.encryptor.Decrypt(dlEncrypted.String)
			if err != nil {
				return nil, fmt.Errorf("failed to decrypt drivers license: %w", err)
			}
			customer.DriversLicenseNumber = decrypted
		}
		if creditEncrypted.Valid {
			decrypted, err := db.encryptor.Decrypt(creditEncrypted.String)
			if err != nil {
				return nil, fmt.Errorf("failed to decrypt credit score: %w", err)
			}
			score, _ := strconv.Atoi(decrypted)
			customer.CreditScore = score
		}
		if incomeEncrypted.Valid {
			decrypted, err := db.encryptor.Decrypt(incomeEncrypted.String)
			if err != nil {
				return nil, fmt.Errorf("failed to decrypt monthly income: %w", err)
			}
			income, _ := strconv.ParseFloat(decrypted, 64)
			customer.MonthlyIncome = income
		}
	} else {
		if plainCreditScore.Valid {
			customer.CreditScore = int(plainCreditScore.Int64)
		}
		if plainSSN.Valid {
			customer.SSNLast4 = plainSSN.String
		}
		if plainDL.Valid {
			customer.DriversLicenseNumber = plainDL.String
		}
		if plainIncome.Valid {
			customer.MonthlyIncome = plainIncome.Float64
		}
	}

	return &customer, nil
}

// UpdateLastActivity updates the last activity timestamp for a customer
func (db *Database) UpdateLastActivity(id string) error {
	query := `UPDATE customers SET last_activity_at = NOW(), updated_at = NOW() WHERE id = $1`

	result, err := db.conn.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to update last activity: %w", err)
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

// SetRetentionExpiry sets the retention expiry date for a customer
func (db *Database) SetRetentionExpiry(id string, expiresAt time.Time) error {
	query := `UPDATE customers SET retention_expires_at = $2, updated_at = NOW() WHERE id = $1`

	result, err := db.conn.Exec(query, id, expiresAt)
	if err != nil {
		return fmt.Errorf("failed to set retention expiry: %w", err)
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
