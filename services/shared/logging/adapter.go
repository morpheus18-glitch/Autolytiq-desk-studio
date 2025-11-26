package logging

// MigrationLoggerAdapter adapts the Logger to the encryption.MigrationLogger interface.
// This allows the structured logger to be used with PII migration operations.
type MigrationLoggerAdapter struct {
	logger *Logger
}

// NewMigrationLoggerAdapter creates a new adapter for the encryption migration logger interface.
func NewMigrationLoggerAdapter(logger *Logger) *MigrationLoggerAdapter {
	return &MigrationLoggerAdapter{logger: logger}
}

// Info logs an info message with optional fields.
func (a *MigrationLoggerAdapter) Info(msg string, fields map[string]interface{}) {
	if fields != nil {
		a.logger.WithFields(fields).Info(msg)
	} else {
		a.logger.Info(msg)
	}
}

// Error logs an error message with optional fields.
func (a *MigrationLoggerAdapter) Error(msg string, fields map[string]interface{}) {
	if fields != nil {
		a.logger.WithFields(fields).Error(msg)
	} else {
		a.logger.Error(msg)
	}
}
