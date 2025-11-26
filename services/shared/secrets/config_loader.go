package secrets

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"time"
)

// ServiceConfig holds common configuration for services
type ServiceConfig struct {
	// Database configuration
	DatabaseURL string

	// Redis configuration
	RedisURL string

	// JWT configuration
	JWTSecret       string
	JWTIssuer       string
	AccessTokenTTL  time.Duration
	RefreshTokenTTL time.Duration

	// PII encryption
	PIIEncryptionKey string

	// Session
	SessionSecret string

	// SMTP configuration (for email service)
	SMTP *SMTPConfig

	// Resend API (alternative email)
	ResendAPIKey string

	// Service-specific
	Port        string
	Environment string
	ServiceName string
}

// ConfigLoader loads service configuration from secrets and environment
type ConfigLoader struct {
	provider    Provider
	serviceName string
}

// NewConfigLoader creates a new configuration loader
func NewConfigLoader(ctx context.Context, serviceName string) (*ConfigLoader, error) {
	provider, err := AutoProvider(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to create secrets provider: %w", err)
	}

	return &ConfigLoader{
		provider:    provider,
		serviceName: serviceName,
	}, nil
}

// NewConfigLoaderWithProvider creates a loader with a specific provider
func NewConfigLoaderWithProvider(provider Provider, serviceName string) *ConfigLoader {
	return &ConfigLoader{
		provider:    provider,
		serviceName: serviceName,
	}
}

// LoadBaseConfig loads base configuration common to all services
func (l *ConfigLoader) LoadBaseConfig(ctx context.Context) (*ServiceConfig, error) {
	cfg := &ServiceConfig{
		ServiceName: l.serviceName,
		Port:        getEnv("PORT", getDefaultPort(l.serviceName)),
		Environment: getEnv("ENVIRONMENT", "dev"),
	}

	// Load database URL
	dbURL, err := l.provider.GetDatabaseURL(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get database URL: %w", err)
	}
	cfg.DatabaseURL = dbURL

	// Load Redis URL
	redisURL, err := l.provider.GetRedisURL(ctx)
	if err != nil {
		// Redis is optional for some services
		cfg.RedisURL = ""
	} else {
		cfg.RedisURL = redisURL
	}

	return cfg, nil
}

// LoadAuthConfig loads configuration for auth service
func (l *ConfigLoader) LoadAuthConfig(ctx context.Context) (*ServiceConfig, error) {
	cfg, err := l.LoadBaseConfig(ctx)
	if err != nil {
		return nil, err
	}

	// JWT Secret
	jwtSecret, err := l.provider.GetJWTSecret(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get JWT secret: %w", err)
	}
	cfg.JWTSecret = jwtSecret

	// JWT Issuer
	jwtIssuer, err := l.provider.GetJWTIssuer(ctx)
	if err != nil {
		cfg.JWTIssuer = "autolytiq"
	} else {
		cfg.JWTIssuer = jwtIssuer
	}

	// Token TTLs from environment (not secrets)
	cfg.AccessTokenTTL = parseDuration(getEnv("ACCESS_TOKEN_TTL", "15m"), 15*time.Minute)
	cfg.RefreshTokenTTL = parseDuration(getEnv("REFRESH_TOKEN_TTL", "168h"), 168*time.Hour) // 7 days

	return cfg, nil
}

// LoadEncryptionConfig loads configuration for services using PII encryption
func (l *ConfigLoader) LoadEncryptionConfig(ctx context.Context) (*ServiceConfig, error) {
	cfg, err := l.LoadBaseConfig(ctx)
	if err != nil {
		return nil, err
	}

	// PII Encryption Key
	piiKey, err := l.provider.GetPIIEncryptionKey(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get PII encryption key: %w", err)
	}
	cfg.PIIEncryptionKey = piiKey

	return cfg, nil
}

// LoadEmailConfig loads configuration for email service
func (l *ConfigLoader) LoadEmailConfig(ctx context.Context) (*ServiceConfig, error) {
	cfg, err := l.LoadBaseConfig(ctx)
	if err != nil {
		return nil, err
	}

	// Try to load SMTP config
	smtpCfg, err := l.provider.GetSMTPConfig(ctx)
	if err == nil {
		cfg.SMTP = smtpCfg
	}

	// Try to load Resend API key
	resendKey, err := l.provider.GetResendAPIKey(ctx)
	if err == nil {
		cfg.ResendAPIKey = resendKey
	}

	return cfg, nil
}

// LoadAPIGatewayConfig loads configuration for API gateway
func (l *ConfigLoader) LoadAPIGatewayConfig(ctx context.Context) (*ServiceConfig, error) {
	cfg, err := l.LoadAuthConfig(ctx)
	if err != nil {
		return nil, err
	}

	// Session secret
	sessionSecret, err := l.provider.GetSessionSecret(ctx)
	if err != nil {
		// Fall back to JWT secret
		cfg.SessionSecret = cfg.JWTSecret
	} else {
		cfg.SessionSecret = sessionSecret
	}

	return cfg, nil
}

// LoadFullConfig loads all available configuration
func (l *ConfigLoader) LoadFullConfig(ctx context.Context) (*ServiceConfig, error) {
	cfg, err := l.LoadAuthConfig(ctx)
	if err != nil {
		return nil, err
	}

	// PII Encryption Key (optional for some services)
	piiKey, err := l.provider.GetPIIEncryptionKey(ctx)
	if err == nil {
		cfg.PIIEncryptionKey = piiKey
	}

	// Session secret
	sessionSecret, err := l.provider.GetSessionSecret(ctx)
	if err == nil {
		cfg.SessionSecret = sessionSecret
	} else {
		cfg.SessionSecret = cfg.JWTSecret
	}

	// SMTP config
	smtpCfg, err := l.provider.GetSMTPConfig(ctx)
	if err == nil {
		cfg.SMTP = smtpCfg
	}

	// Resend API key
	resendKey, err := l.provider.GetResendAPIKey(ctx)
	if err == nil {
		cfg.ResendAPIKey = resendKey
	}

	return cfg, nil
}

// Close releases resources used by the config loader
func (l *ConfigLoader) Close() {
	if l.provider != nil {
		l.provider.Close()
	}
}

// Provider returns the underlying secrets provider
func (l *ConfigLoader) Provider() Provider {
	return l.provider
}

// Helper functions

func getEnv(key, defaultValue string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultValue
}

func getDefaultPort(serviceName string) string {
	ports := map[string]string{
		"api-gateway":       "8080",
		"auth-service":      "8087",
		"deal-service":      "8081",
		"customer-service":  "8082",
		"inventory-service": "8083",
		"email-service":     "8084",
		"user-service":      "8085",
		"config-service":    "8086",
		"messaging-service": "8088",
		"showroom-service":  "8089",
		"settings-service":  "8090",
	}

	if port, ok := ports[serviceName]; ok {
		return port
	}
	return "8080"
}

func parseDuration(s string, defaultValue time.Duration) time.Duration {
	// Handle "7d" format
	if len(s) > 1 && s[len(s)-1] == 'd' {
		days, err := strconv.Atoi(s[:len(s)-1])
		if err == nil {
			return time.Duration(days) * 24 * time.Hour
		}
	}

	d, err := time.ParseDuration(s)
	if err != nil {
		return defaultValue
	}
	return d
}

// MustLoadConfig loads configuration and panics on error
func MustLoadConfig(ctx context.Context, serviceName string, loadFn func(*ConfigLoader, context.Context) (*ServiceConfig, error)) *ServiceConfig {
	loader, err := NewConfigLoader(ctx, serviceName)
	if err != nil {
		panic(fmt.Sprintf("failed to create config loader: %v", err))
	}

	cfg, err := loadFn(loader, ctx)
	if err != nil {
		panic(fmt.Sprintf("failed to load config: %v", err))
	}

	return cfg
}
