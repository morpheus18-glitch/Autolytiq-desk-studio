// Package logging provides structured JSON logging for all Go services.
// It uses zerolog for high-performance JSON logging with configurable log levels,
// correlation ID propagation, and request logging middleware.
package logging

import (
	"context"
	"io"
	"os"
	"strings"
	"time"

	"github.com/rs/zerolog"
)

// Level represents log level
type Level string

const (
	// LevelDebug is the debug log level
	LevelDebug Level = "DEBUG"
	// LevelInfo is the info log level
	LevelInfo Level = "INFO"
	// LevelWarn is the warn log level
	LevelWarn Level = "WARN"
	// LevelError is the error log level
	LevelError Level = "ERROR"
)

// Logger wraps zerolog.Logger with service-specific context
type Logger struct {
	zl      zerolog.Logger
	service string
}

// Config holds logger configuration
type Config struct {
	// Service is the name of the service (e.g., "api-gateway", "auth-service")
	Service string

	// Level is the minimum log level (DEBUG, INFO, WARN, ERROR)
	// Defaults to INFO if not set or invalid
	Level Level

	// Output is the writer to output logs to
	// Defaults to os.Stdout if nil
	Output io.Writer

	// PrettyPrint enables human-readable output (not recommended for production)
	PrettyPrint bool
}

// New creates a new Logger instance with the given configuration.
// It reads LOG_LEVEL from environment if config.Level is empty.
func New(cfg Config) *Logger {
	// Set output
	output := cfg.Output
	if output == nil {
		output = os.Stdout
	}

	// Parse log level from config or environment
	level := cfg.Level
	if level == "" {
		level = Level(strings.ToUpper(os.Getenv("LOG_LEVEL")))
	}

	var zerologLevel zerolog.Level
	switch level {
	case LevelDebug:
		zerologLevel = zerolog.DebugLevel
	case LevelWarn:
		zerologLevel = zerolog.WarnLevel
	case LevelError:
		zerologLevel = zerolog.ErrorLevel
	default:
		zerologLevel = zerolog.InfoLevel
	}

	// Configure zerolog
	zerolog.TimeFieldFormat = time.RFC3339Nano
	zerolog.TimestampFieldName = "timestamp"
	zerolog.LevelFieldName = "level"
	zerolog.MessageFieldName = "message"

	var zl zerolog.Logger
	if cfg.PrettyPrint {
		zl = zerolog.New(zerolog.ConsoleWriter{Out: output, TimeFormat: time.RFC3339}).
			With().
			Timestamp().
			Str("service", cfg.Service).
			Logger().
			Level(zerologLevel)
	} else {
		zl = zerolog.New(output).
			With().
			Timestamp().
			Str("service", cfg.Service).
			Logger().
			Level(zerologLevel)
	}

	return &Logger{
		zl:      zl,
		service: cfg.Service,
	}
}

// WithContext returns a new Logger with context values (trace_id, user_id, dealership_id)
func (l *Logger) WithContext(ctx context.Context) *Logger {
	newLogger := l.zl

	if traceID := GetTraceID(ctx); traceID != "" {
		newLogger = newLogger.With().Str("trace_id", traceID).Logger()
	}

	if userID := GetUserID(ctx); userID != "" {
		newLogger = newLogger.With().Str("user_id", userID).Logger()
	}

	if dealershipID := GetDealershipID(ctx); dealershipID != "" {
		newLogger = newLogger.With().Str("dealership_id", dealershipID).Logger()
	}

	return &Logger{
		zl:      newLogger,
		service: l.service,
	}
}

// WithFields returns a new Logger with additional fields
func (l *Logger) WithFields(fields map[string]interface{}) *Logger {
	ctx := l.zl.With()
	for k, v := range fields {
		ctx = ctx.Interface(k, v)
	}
	return &Logger{
		zl:      ctx.Logger(),
		service: l.service,
	}
}

// WithField returns a new Logger with a single additional field
func (l *Logger) WithField(key string, value interface{}) *Logger {
	return &Logger{
		zl:      l.zl.With().Interface(key, value).Logger(),
		service: l.service,
	}
}

// WithError returns a new Logger with an error field
func (l *Logger) WithError(err error) *Logger {
	if err == nil {
		return l
	}
	return &Logger{
		zl:      l.zl.With().Err(err).Logger(),
		service: l.service,
	}
}

// Debug logs a debug message
func (l *Logger) Debug(msg string) {
	l.zl.Debug().Msg(msg)
}

// Debugf logs a formatted debug message
func (l *Logger) Debugf(format string, args ...interface{}) {
	l.zl.Debug().Msgf(format, args...)
}

// Info logs an info message
func (l *Logger) Info(msg string) {
	l.zl.Info().Msg(msg)
}

// Infof logs a formatted info message
func (l *Logger) Infof(format string, args ...interface{}) {
	l.zl.Info().Msgf(format, args...)
}

// Warn logs a warning message
func (l *Logger) Warn(msg string) {
	l.zl.Warn().Msg(msg)
}

// Warnf logs a formatted warning message
func (l *Logger) Warnf(format string, args ...interface{}) {
	l.zl.Warn().Msgf(format, args...)
}

// Error logs an error message
func (l *Logger) Error(msg string) {
	l.zl.Error().Msg(msg)
}

// Errorf logs a formatted error message
func (l *Logger) Errorf(format string, args ...interface{}) {
	l.zl.Error().Msgf(format, args...)
}

// Fatal logs a fatal message and exits
func (l *Logger) Fatal(msg string) {
	l.zl.Fatal().Msg(msg)
}

// Fatalf logs a formatted fatal message and exits
func (l *Logger) Fatalf(format string, args ...interface{}) {
	l.zl.Fatal().Msgf(format, args...)
}

// RequestLog logs an HTTP request with standard fields
func (l *Logger) RequestLog(method, path string, status int, duration time.Duration, err error) {
	event := l.zl.Info()
	if status >= 500 {
		event = l.zl.Error()
	} else if status >= 400 {
		event = l.zl.Warn()
	}

	event.
		Str("method", method).
		Str("path", path).
		Int("status", status).
		Int64("duration_ms", duration.Milliseconds())

	if err != nil {
		event.Err(err)
	}

	event.Msg("request completed")
}

// Zerolog returns the underlying zerolog.Logger for advanced use cases
func (l *Logger) Zerolog() *zerolog.Logger {
	return &l.zl
}
