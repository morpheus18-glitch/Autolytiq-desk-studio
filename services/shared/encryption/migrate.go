package encryption

import (
	"context"
	"database/sql"
	"fmt"
	"strconv"
	"time"
)

// MigrationLogger is an interface for logging migration progress.
// Implementations can use structured logging or standard logging.
type MigrationLogger interface {
	Info(msg string, fields map[string]interface{})
	Error(msg string, fields map[string]interface{})
}

// DefaultMigrationLogger is a no-op logger for when no logger is provided.
type DefaultMigrationLogger struct{}

// Info logs info level messages (no-op in default implementation)
func (d *DefaultMigrationLogger) Info(msg string, fields map[string]interface{}) {}

// Error logs error level messages (no-op in default implementation)
func (d *DefaultMigrationLogger) Error(msg string, fields map[string]interface{}) {}

// MigrationStats tracks the progress of PII data migration
type MigrationStats struct {
	TotalRows     int64
	MigratedRows  int64
	SkippedRows   int64
	FailedRows    int64
	StartTime     time.Time
	EndTime       time.Time
	KeyVersion    string
}

// DataMigrator handles migrating plaintext PII data to encrypted format
type DataMigrator struct {
	db        *sql.DB
	encryptor *FieldEncryptor
	batchSize int
	logger    MigrationLogger
}

// NewDataMigrator creates a new data migrator
func NewDataMigrator(db *sql.DB, encryptor *FieldEncryptor) *DataMigrator {
	return &DataMigrator{
		db:        db,
		encryptor: encryptor,
		batchSize: 100,
		logger:    &DefaultMigrationLogger{},
	}
}

// SetLogger sets the logger for migration progress
func (m *DataMigrator) SetLogger(logger MigrationLogger) {
	if logger != nil {
		m.logger = logger
	}
}

// SetBatchSize sets the number of rows to process per transaction
func (m *DataMigrator) SetBatchSize(size int) {
	if size > 0 {
		m.batchSize = size
	}
}

// MigrateCustomers encrypts all plaintext PII fields in the customers table
func (m *DataMigrator) MigrateCustomers(ctx context.Context) (*MigrationStats, error) {
	stats := &MigrationStats{
		StartTime: time.Now(),
	}

	// Get current key version
	_, version, err := m.encryptor.Encryptor.keyManager.GetPrimaryKey()
	if err != nil {
		return nil, fmt.Errorf("failed to get primary key: %w", err)
	}
	stats.KeyVersion = version

	// Count total rows to migrate
	err = m.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM customers
		WHERE pii_encryption_version IS NULL
		AND (ssn_last4 IS NOT NULL
		     OR drivers_license_number IS NOT NULL
		     OR credit_score IS NOT NULL
		     OR monthly_income IS NOT NULL)
	`).Scan(&stats.TotalRows)
	if err != nil {
		return nil, fmt.Errorf("failed to count rows: %w", err)
	}

	m.logger.Info("Starting PII encryption migration", map[string]interface{}{
		"total_rows":  stats.TotalRows,
		"key_version": stats.KeyVersion,
	})

	// Process in batches
	for {
		select {
		case <-ctx.Done():
			return stats, ctx.Err()
		default:
		}

		migrated, err := m.migrateBatch(ctx, version)
		if err != nil {
			return stats, fmt.Errorf("batch migration failed: %w", err)
		}

		stats.MigratedRows += int64(migrated)

		if migrated == 0 {
			break
		}

		m.logger.Info("Migration progress", map[string]interface{}{
			"migrated_rows": stats.MigratedRows,
			"total_rows":    stats.TotalRows,
			"percent":       float64(stats.MigratedRows) / float64(stats.TotalRows) * 100,
		})
	}

	stats.EndTime = time.Now()
	m.logger.Info("Migration complete", map[string]interface{}{
		"migrated_rows": stats.MigratedRows,
		"duration":      stats.EndTime.Sub(stats.StartTime).String(),
	})

	return stats, nil
}

// migrateBatch processes a single batch of rows
func (m *DataMigrator) migrateBatch(ctx context.Context, keyVersion string) (int, error) {
	tx, err := m.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Select batch of unmigrated rows
	rows, err := tx.QueryContext(ctx, `
		SELECT id, ssn_last4, drivers_license_number, credit_score, monthly_income
		FROM customers
		WHERE pii_encryption_version IS NULL
		AND (ssn_last4 IS NOT NULL
		     OR drivers_license_number IS NOT NULL
		     OR credit_score IS NOT NULL
		     OR monthly_income IS NOT NULL)
		LIMIT $1
		FOR UPDATE SKIP LOCKED
	`, m.batchSize)
	if err != nil {
		return 0, fmt.Errorf("failed to query batch: %w", err)
	}

	type customerRow struct {
		ID                   string
		SSNLast4             sql.NullString
		DriversLicenseNumber sql.NullString
		CreditScore          sql.NullInt64
		MonthlyIncome        sql.NullFloat64
	}

	var customers []customerRow
	for rows.Next() {
		var c customerRow
		if err := rows.Scan(&c.ID, &c.SSNLast4, &c.DriversLicenseNumber, &c.CreditScore, &c.MonthlyIncome); err != nil {
			rows.Close()
			return 0, fmt.Errorf("failed to scan row: %w", err)
		}
		customers = append(customers, c)
	}
	rows.Close()

	if len(customers) == 0 {
		return 0, nil
	}

	// Encrypt and update each row
	stmt, err := tx.PrepareContext(ctx, `
		UPDATE customers SET
			ssn_last4_encrypted = $2,
			drivers_license_number_encrypted = $3,
			credit_score_encrypted = $4,
			monthly_income_encrypted = $5,
			pii_encryption_version = $6,
			updated_at = NOW()
		WHERE id = $1
	`)
	if err != nil {
		return 0, fmt.Errorf("failed to prepare update statement: %w", err)
	}
	defer stmt.Close()

	for _, c := range customers {
		var ssnEncrypted, dlEncrypted, creditEncrypted, incomeEncrypted sql.NullString

		if c.SSNLast4.Valid {
			encrypted, err := m.encryptor.Encrypt(c.SSNLast4.String)
			if err != nil {
				return 0, fmt.Errorf("failed to encrypt SSN for customer %s: %w", c.ID, err)
			}
			ssnEncrypted = sql.NullString{String: encrypted, Valid: true}
		}

		if c.DriversLicenseNumber.Valid {
			encrypted, err := m.encryptor.Encrypt(c.DriversLicenseNumber.String)
			if err != nil {
				return 0, fmt.Errorf("failed to encrypt DL for customer %s: %w", c.ID, err)
			}
			dlEncrypted = sql.NullString{String: encrypted, Valid: true}
		}

		if c.CreditScore.Valid {
			encrypted, err := m.encryptor.Encrypt(strconv.FormatInt(c.CreditScore.Int64, 10))
			if err != nil {
				return 0, fmt.Errorf("failed to encrypt credit score for customer %s: %w", c.ID, err)
			}
			creditEncrypted = sql.NullString{String: encrypted, Valid: true}
		}

		if c.MonthlyIncome.Valid {
			encrypted, err := m.encryptor.Encrypt(strconv.FormatFloat(c.MonthlyIncome.Float64, 'f', 2, 64))
			if err != nil {
				return 0, fmt.Errorf("failed to encrypt monthly income for customer %s: %w", c.ID, err)
			}
			incomeEncrypted = sql.NullString{String: encrypted, Valid: true}
		}

		_, err = stmt.ExecContext(ctx, c.ID, ssnEncrypted, dlEncrypted, creditEncrypted, incomeEncrypted, keyVersion)
		if err != nil {
			return 0, fmt.Errorf("failed to update customer %s: %w", c.ID, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return 0, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return len(customers), nil
}

// VerifyMigration checks that all PII data has been properly migrated
func (m *DataMigrator) VerifyMigration(ctx context.Context) error {
	var unmigratedCount int64
	err := m.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM customers
		WHERE pii_encryption_version IS NULL
		AND (ssn_last4 IS NOT NULL
		     OR drivers_license_number IS NOT NULL
		     OR credit_score IS NOT NULL
		     OR monthly_income IS NOT NULL)
	`).Scan(&unmigratedCount)
	if err != nil {
		return fmt.Errorf("failed to count unmigrated rows: %w", err)
	}

	if unmigratedCount > 0 {
		return fmt.Errorf("%d rows have not been migrated", unmigratedCount)
	}

	m.logger.Info("Migration verification passed: all PII data has been encrypted", nil)
	return nil
}

// ReEncryptToNewKey re-encrypts all data with a new key version
func (m *DataMigrator) ReEncryptToNewKey(ctx context.Context, newKeyVersion string) (*MigrationStats, error) {
	stats := &MigrationStats{
		StartTime:  time.Now(),
		KeyVersion: newKeyVersion,
	}

	// Count total rows to re-encrypt
	err := m.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM customers
		WHERE pii_encryption_version IS NOT NULL
		AND pii_encryption_version != $1
	`, newKeyVersion).Scan(&stats.TotalRows)
	if err != nil {
		return nil, fmt.Errorf("failed to count rows: %w", err)
	}

	m.logger.Info("Starting key rotation re-encryption", map[string]interface{}{
		"total_rows":      stats.TotalRows,
		"new_key_version": newKeyVersion,
	})

	// Process in batches
	for {
		select {
		case <-ctx.Done():
			return stats, ctx.Err()
		default:
		}

		migrated, err := m.reEncryptBatch(ctx, newKeyVersion)
		if err != nil {
			return stats, fmt.Errorf("batch re-encryption failed: %w", err)
		}

		stats.MigratedRows += int64(migrated)

		if migrated == 0 {
			break
		}

		m.logger.Info("Re-encryption progress", map[string]interface{}{
			"migrated_rows": stats.MigratedRows,
			"total_rows":    stats.TotalRows,
			"percent":       float64(stats.MigratedRows) / float64(stats.TotalRows) * 100,
		})
	}

	stats.EndTime = time.Now()
	m.logger.Info("Re-encryption complete", map[string]interface{}{
		"migrated_rows": stats.MigratedRows,
		"duration":      stats.EndTime.Sub(stats.StartTime).String(),
	})

	return stats, nil
}

// reEncryptBatch processes a single batch of rows for re-encryption
func (m *DataMigrator) reEncryptBatch(ctx context.Context, newKeyVersion string) (int, error) {
	tx, err := m.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Select batch of rows encrypted with old key
	rows, err := tx.QueryContext(ctx, `
		SELECT id, ssn_last4_encrypted, drivers_license_number_encrypted,
		       credit_score_encrypted, monthly_income_encrypted
		FROM customers
		WHERE pii_encryption_version IS NOT NULL
		AND pii_encryption_version != $1
		LIMIT $2
		FOR UPDATE SKIP LOCKED
	`, newKeyVersion, m.batchSize)
	if err != nil {
		return 0, fmt.Errorf("failed to query batch: %w", err)
	}

	type customerRow struct {
		ID            string
		SSN           sql.NullString
		DL            sql.NullString
		CreditScore   sql.NullString
		MonthlyIncome sql.NullString
	}

	var customers []customerRow
	for rows.Next() {
		var c customerRow
		if err := rows.Scan(&c.ID, &c.SSN, &c.DL, &c.CreditScore, &c.MonthlyIncome); err != nil {
			rows.Close()
			return 0, fmt.Errorf("failed to scan row: %w", err)
		}
		customers = append(customers, c)
	}
	rows.Close()

	if len(customers) == 0 {
		return 0, nil
	}

	stmt, err := tx.PrepareContext(ctx, `
		UPDATE customers SET
			ssn_last4_encrypted = $2,
			drivers_license_number_encrypted = $3,
			credit_score_encrypted = $4,
			monthly_income_encrypted = $5,
			pii_encryption_version = $6,
			updated_at = NOW()
		WHERE id = $1
	`)
	if err != nil {
		return 0, fmt.Errorf("failed to prepare update statement: %w", err)
	}
	defer stmt.Close()

	for _, c := range customers {
		var ssnReEncrypted, dlReEncrypted, creditReEncrypted, incomeReEncrypted sql.NullString

		if c.SSN.Valid {
			reEncrypted, err := m.encryptor.ReEncrypt(c.SSN.String)
			if err != nil {
				return 0, fmt.Errorf("failed to re-encrypt SSN for customer %s: %w", c.ID, err)
			}
			ssnReEncrypted = sql.NullString{String: reEncrypted, Valid: true}
		}

		if c.DL.Valid {
			reEncrypted, err := m.encryptor.ReEncrypt(c.DL.String)
			if err != nil {
				return 0, fmt.Errorf("failed to re-encrypt DL for customer %s: %w", c.ID, err)
			}
			dlReEncrypted = sql.NullString{String: reEncrypted, Valid: true}
		}

		if c.CreditScore.Valid {
			reEncrypted, err := m.encryptor.ReEncrypt(c.CreditScore.String)
			if err != nil {
				return 0, fmt.Errorf("failed to re-encrypt credit score for customer %s: %w", c.ID, err)
			}
			creditReEncrypted = sql.NullString{String: reEncrypted, Valid: true}
		}

		if c.MonthlyIncome.Valid {
			reEncrypted, err := m.encryptor.ReEncrypt(c.MonthlyIncome.String)
			if err != nil {
				return 0, fmt.Errorf("failed to re-encrypt monthly income for customer %s: %w", c.ID, err)
			}
			incomeReEncrypted = sql.NullString{String: reEncrypted, Valid: true}
		}

		_, err = stmt.ExecContext(ctx, c.ID, ssnReEncrypted, dlReEncrypted, creditReEncrypted, incomeReEncrypted, newKeyVersion)
		if err != nil {
			return 0, fmt.Errorf("failed to update customer %s: %w", c.ID, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return 0, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return len(customers), nil
}
