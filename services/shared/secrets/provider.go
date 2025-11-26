package secrets

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"sync"
	"time"
)

// Provider is a high-level interface for retrieving application secrets
type Provider interface {
	// Core secrets
	GetDatabaseURL(ctx context.Context) (string, error)
	GetRedisURL(ctx context.Context) (string, error)
	GetJWTSecret(ctx context.Context) (string, error)
	GetJWTIssuer(ctx context.Context) (string, error)
	GetPIIEncryptionKey(ctx context.Context) (string, error)
	GetSessionSecret(ctx context.Context) (string, error)

	// Email secrets
	GetSMTPConfig(ctx context.Context) (*SMTPConfig, error)
	GetResendAPIKey(ctx context.Context) (string, error)

	// External API keys
	GetExternalAPIKey(ctx context.Context, keyName string) (string, error)

	// Cache management
	InvalidateCache(name string)
	Close()

	// Health
	HealthCheck(ctx context.Context) error
}

// SecretsProvider implements Provider using AWS Secrets Manager with env fallback
type SecretsProvider struct {
	client *Client
}

// NewProvider creates a new secrets provider
func NewProvider(ctx context.Context, cfg Config) (Provider, error) {
	client, err := NewClient(ctx, cfg)
	if err != nil {
		return nil, err
	}
	return &SecretsProvider{client: client}, nil
}

// NewProviderFromEnv creates a new provider using environment-based configuration
func NewProviderFromEnv(ctx context.Context) (Provider, error) {
	cfg := DefaultConfig()

	// Override from environment
	if region := os.Getenv("AWS_REGION"); region != "" {
		cfg.AWSRegion = region
	}
	if env := os.Getenv("ENVIRONMENT"); env != "" {
		cfg.Environment = env
		cfg.SecretPrefix = fmt.Sprintf("autolytiq/%s", env)
	}
	if ttl := os.Getenv("SECRETS_CACHE_TTL"); ttl != "" {
		if d, err := time.ParseDuration(ttl); err == nil {
			cfg.CacheTTL = d
		}
	}
	if refresh := os.Getenv("SECRETS_REFRESH_INTERVAL"); refresh != "" {
		if d, err := time.ParseDuration(refresh); err == nil {
			cfg.RefreshInterval = d
		}
	}
	if fallback := os.Getenv("SECRETS_FALLBACK_TO_ENV"); fallback != "" {
		cfg.FallbackToEnv = fallback == "true" || fallback == "1"
	}

	return NewProvider(ctx, cfg)
}

func (p *SecretsProvider) GetDatabaseURL(ctx context.Context) (string, error) {
	return p.client.GetDatabaseURL(ctx)
}

func (p *SecretsProvider) GetRedisURL(ctx context.Context) (string, error) {
	return p.client.GetRedisURL(ctx)
}

func (p *SecretsProvider) GetJWTSecret(ctx context.Context) (string, error) {
	return p.client.GetJWTSecret(ctx)
}

func (p *SecretsProvider) GetJWTIssuer(ctx context.Context) (string, error) {
	return p.client.GetSecretString(ctx, "jwt", "issuer")
}

func (p *SecretsProvider) GetPIIEncryptionKey(ctx context.Context) (string, error) {
	return p.client.GetPIIEncryptionKey(ctx)
}

func (p *SecretsProvider) GetSessionSecret(ctx context.Context) (string, error) {
	return p.client.GetSessionSecret(ctx)
}

func (p *SecretsProvider) GetSMTPConfig(ctx context.Context) (*SMTPConfig, error) {
	return p.client.GetSMTPConfig(ctx)
}

func (p *SecretsProvider) GetResendAPIKey(ctx context.Context) (string, error) {
	return p.client.GetResendAPIKey(ctx)
}

func (p *SecretsProvider) GetExternalAPIKey(ctx context.Context, keyName string) (string, error) {
	return p.client.GetExternalAPIKey(ctx, keyName)
}

func (p *SecretsProvider) InvalidateCache(name string) {
	p.client.InvalidateCache(name)
}

func (p *SecretsProvider) Close() {
	p.client.Close()
}

func (p *SecretsProvider) HealthCheck(ctx context.Context) error {
	return p.client.HealthCheck(ctx)
}

// EnvProvider implements Provider using only environment variables (for local dev)
type EnvProvider struct {
	mu    sync.RWMutex
	cache map[string]string
}

// NewEnvProvider creates a provider that only uses environment variables
func NewEnvProvider() Provider {
	return &EnvProvider{
		cache: make(map[string]string),
	}
}

func (p *EnvProvider) getEnv(key, defaultValue string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultValue
}

func (p *EnvProvider) GetDatabaseURL(ctx context.Context) (string, error) {
	url := p.getEnv("DATABASE_URL", "")
	if url == "" {
		// Construct from components
		user := p.getEnv("POSTGRES_USER", "postgres")
		pass := p.getEnv("POSTGRES_PASSWORD", "postgres")
		host := p.getEnv("POSTGRES_HOST", "localhost")
		port := p.getEnv("POSTGRES_PORT", "5432")
		db := p.getEnv("POSTGRES_DB", "autolytiq")
		sslmode := p.getEnv("POSTGRES_SSLMODE", "disable")
		url = fmt.Sprintf("postgresql://%s:%s@%s:%s/%s?sslmode=%s", user, pass, host, port, db, sslmode)
	}
	return url, nil
}

func (p *EnvProvider) GetRedisURL(ctx context.Context) (string, error) {
	url := p.getEnv("REDIS_URL", "")
	if url == "" {
		host := p.getEnv("REDIS_HOST", "localhost")
		port := p.getEnv("REDIS_PORT", "6379")
		password := p.getEnv("REDIS_PASSWORD", "")
		if password != "" {
			url = fmt.Sprintf("redis://:%s@%s:%s", password, host, port)
		} else {
			url = fmt.Sprintf("redis://%s:%s", host, port)
		}
	}
	return url, nil
}

func (p *EnvProvider) GetJWTSecret(ctx context.Context) (string, error) {
	secret := p.getEnv("JWT_SECRET", "")
	if secret == "" {
		return "", fmt.Errorf("JWT_SECRET environment variable not set")
	}
	return secret, nil
}

func (p *EnvProvider) GetJWTIssuer(ctx context.Context) (string, error) {
	return p.getEnv("JWT_ISSUER", "autolytiq"), nil
}

func (p *EnvProvider) GetPIIEncryptionKey(ctx context.Context) (string, error) {
	key := p.getEnv("PII_ENCRYPTION_KEY", "")
	if key == "" {
		return "", fmt.Errorf("PII_ENCRYPTION_KEY environment variable not set")
	}
	return key, nil
}

func (p *EnvProvider) GetSessionSecret(ctx context.Context) (string, error) {
	secret := p.getEnv("SESSION_SECRET", "")
	if secret == "" {
		// Fall back to JWT secret for local dev
		return p.GetJWTSecret(ctx)
	}
	return secret, nil
}

func (p *EnvProvider) GetSMTPConfig(ctx context.Context) (*SMTPConfig, error) {
	port := 587
	if portStr := p.getEnv("SMTP_PORT", "587"); portStr != "" {
		if v, err := strconv.Atoi(portStr); err == nil {
			port = v
		}
	}

	return &SMTPConfig{
		Host:      p.getEnv("SMTP_HOST", "smtp.gmail.com"),
		Port:      port,
		Username:  p.getEnv("SMTP_USERNAME", ""),
		Password:  p.getEnv("SMTP_PASSWORD", ""),
		FromEmail: p.getEnv("SMTP_FROM_EMAIL", ""),
		FromName:  p.getEnv("SMTP_FROM_NAME", "Autolytiq"),
	}, nil
}

func (p *EnvProvider) GetResendAPIKey(ctx context.Context) (string, error) {
	key := p.getEnv("RESEND_API_KEY", "")
	if key == "" {
		return "", fmt.Errorf("RESEND_API_KEY environment variable not set")
	}
	return key, nil
}

func (p *EnvProvider) GetExternalAPIKey(ctx context.Context, keyName string) (string, error) {
	// Map common key names to environment variables
	envMap := map[string]string{
		"sentry_dsn":          "SENTRY_DSN",
		"datadog_api_key":     "DD_API_KEY",
		"stripe_secret_key":   "STRIPE_SECRET_KEY",
		"stripe_webhook_secret": "STRIPE_WEBHOOK_SECRET",
	}

	envVar, ok := envMap[keyName]
	if !ok {
		envVar = keyName
	}

	key := p.getEnv(envVar, "")
	if key == "" {
		return "", fmt.Errorf("%s environment variable not set", envVar)
	}
	return key, nil
}

func (p *EnvProvider) InvalidateCache(name string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if name == "" {
		p.cache = make(map[string]string)
	} else {
		delete(p.cache, name)
	}
}

func (p *EnvProvider) Close() {
	// No-op for env provider
}

func (p *EnvProvider) HealthCheck(ctx context.Context) error {
	// Always healthy for env provider
	return nil
}

// AutoProvider automatically selects the appropriate provider based on environment
func AutoProvider(ctx context.Context) (Provider, error) {
	// Check if running in Kubernetes/AWS
	if os.Getenv("KUBERNETES_SERVICE_HOST") != "" || os.Getenv("AWS_EXECUTION_ENV") != "" {
		return NewProviderFromEnv(ctx)
	}

	// Check for explicit provider selection
	if provider := os.Getenv("SECRETS_PROVIDER"); provider != "" {
		switch provider {
		case "aws":
			return NewProviderFromEnv(ctx)
		case "env":
			return NewEnvProvider(), nil
		}
	}

	// Default to env provider for local development
	return NewEnvProvider(), nil
}
