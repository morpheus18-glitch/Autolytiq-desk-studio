// Package secrets provides a production-grade secrets management client for AWS Secrets Manager.
// It includes caching, automatic refresh, fallback to environment variables, and
// comprehensive error handling for resilient secret retrieval in microservices.
package secrets

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/secretsmanager"
)

// Common errors
var (
	ErrSecretNotFound     = errors.New("secret not found")
	ErrPropertyNotFound   = errors.New("property not found in secret")
	ErrClientNotReady     = errors.New("secrets client not initialized")
	ErrInvalidSecretValue = errors.New("invalid secret value format")
	ErrCacheExpired       = errors.New("cached secret has expired")
)

// Config holds the configuration for the secrets client
type Config struct {
	// AWSRegion is the AWS region where secrets are stored
	AWSRegion string

	// Environment is the deployment environment (dev, staging, prod)
	Environment string

	// CacheTTL is how long secrets are cached before refresh
	CacheTTL time.Duration

	// RefreshInterval is how often to proactively refresh cached secrets
	RefreshInterval time.Duration

	// FallbackToEnv enables falling back to environment variables when AWS is unavailable
	FallbackToEnv bool

	// SecretPrefix is the prefix for all secrets (e.g., "autolytiq/prod")
	SecretPrefix string

	// Logger is an optional logger interface
	Logger Logger
}

// Logger is an interface for logging within the secrets client
type Logger interface {
	Debug(msg string, keysAndValues ...interface{})
	Info(msg string, keysAndValues ...interface{})
	Warn(msg string, keysAndValues ...interface{})
	Error(msg string, keysAndValues ...interface{})
}

// noopLogger is a no-op logger implementation
type noopLogger struct{}

func (n *noopLogger) Debug(msg string, keysAndValues ...interface{}) {}
func (n *noopLogger) Info(msg string, keysAndValues ...interface{})  {}
func (n *noopLogger) Warn(msg string, keysAndValues ...interface{})  {}
func (n *noopLogger) Error(msg string, keysAndValues ...interface{}) {}

// cachedSecret holds a cached secret value with metadata
type cachedSecret struct {
	value      map[string]interface{}
	rawValue   string
	fetchedAt  time.Time
	expiresAt  time.Time
	version    string
	accessedAt time.Time
}

// Client is the secrets manager client with caching support
type Client struct {
	config     Config
	awsClient  *secretsmanager.Client
	cache      map[string]*cachedSecret
	cacheMu    sync.RWMutex
	refreshMu  sync.Mutex
	ctx        context.Context
	cancel     context.CancelFunc
	ready      bool
	readyMu    sync.RWMutex
	logger     Logger
	metrics    *Metrics
	envFallback map[string]string // Maps secret keys to env var names
}

// Metrics holds metrics for the secrets client
type Metrics struct {
	mu             sync.Mutex
	CacheHits      int64
	CacheMisses    int64
	FetchSuccesses int64
	FetchFailures  int64
	EnvFallbacks   int64
}

// DefaultConfig returns a Config with sensible defaults
func DefaultConfig() Config {
	region := os.Getenv("AWS_REGION")
	if region == "" {
		region = "us-east-1"
	}

	env := os.Getenv("ENVIRONMENT")
	if env == "" {
		env = "dev"
	}

	return Config{
		AWSRegion:       region,
		Environment:     env,
		CacheTTL:        5 * time.Minute,
		RefreshInterval: 4 * time.Minute,
		FallbackToEnv:   true,
		SecretPrefix:    fmt.Sprintf("autolytiq/%s", env),
		Logger:          &noopLogger{},
	}
}

// NewClient creates a new secrets client
func NewClient(ctx context.Context, cfg Config) (*Client, error) {
	if cfg.Logger == nil {
		cfg.Logger = &noopLogger{}
	}

	clientCtx, cancel := context.WithCancel(ctx)

	client := &Client{
		config:      cfg,
		cache:       make(map[string]*cachedSecret),
		ctx:         clientCtx,
		cancel:      cancel,
		logger:      cfg.Logger,
		metrics:     &Metrics{},
		envFallback: defaultEnvFallback(),
	}

	// Try to initialize AWS client
	if err := client.initAWSClient(ctx); err != nil {
		if cfg.FallbackToEnv {
			cfg.Logger.Warn("Failed to initialize AWS client, using environment fallback",
				"error", err.Error())
			client.ready = false
		} else {
			cancel()
			return nil, fmt.Errorf("failed to initialize AWS client: %w", err)
		}
	} else {
		client.ready = true
	}

	// Start background refresh if configured
	if cfg.RefreshInterval > 0 && client.ready {
		go client.startBackgroundRefresh()
	}

	return client, nil
}

// defaultEnvFallback returns the default mapping of secret names to environment variables
func defaultEnvFallback() map[string]string {
	return map[string]string{
		"database/url":          "DATABASE_URL",
		"database/username":     "POSTGRES_USER",
		"database/password":     "POSTGRES_PASSWORD",
		"database/host":         "POSTGRES_HOST",
		"database/port":         "POSTGRES_PORT",
		"database/database":     "POSTGRES_DB",
		"redis/url":             "REDIS_URL",
		"redis/password":        "REDIS_PASSWORD",
		"redis/host":            "REDIS_HOST",
		"jwt/secret":            "JWT_SECRET",
		"jwt/issuer":            "JWT_ISSUER",
		"pii-encryption/key":    "PII_ENCRYPTION_KEY",
		"session/secret":        "SESSION_SECRET",
		"smtp/host":             "SMTP_HOST",
		"smtp/port":             "SMTP_PORT",
		"smtp/username":         "SMTP_USERNAME",
		"smtp/password":         "SMTP_PASSWORD",
		"smtp/from_email":       "SMTP_FROM_EMAIL",
		"resend/api_key":        "RESEND_API_KEY",
		"external-apis/sentry_dsn":     "SENTRY_DSN",
		"external-apis/datadog_api_key": "DD_API_KEY",
	}
}

// initAWSClient initializes the AWS Secrets Manager client
func (c *Client) initAWSClient(ctx context.Context) error {
	cfg, err := config.LoadDefaultConfig(ctx, config.WithRegion(c.config.AWSRegion))
	if err != nil {
		return fmt.Errorf("failed to load AWS config: %w", err)
	}

	c.awsClient = secretsmanager.NewFromConfig(cfg)
	return nil
}

// IsReady returns whether the client is ready to fetch secrets from AWS
func (c *Client) IsReady() bool {
	c.readyMu.RLock()
	defer c.readyMu.RUnlock()
	return c.ready
}

// GetSecret retrieves a secret by name
func (c *Client) GetSecret(ctx context.Context, name string) (map[string]interface{}, error) {
	fullName := c.fullSecretName(name)

	// Check cache first
	if cached := c.getFromCache(fullName); cached != nil {
		c.metrics.mu.Lock()
		c.metrics.CacheHits++
		c.metrics.mu.Unlock()
		return cached.value, nil
	}

	c.metrics.mu.Lock()
	c.metrics.CacheMisses++
	c.metrics.mu.Unlock()

	// Fetch from AWS
	if c.IsReady() {
		value, err := c.fetchSecret(ctx, fullName)
		if err == nil {
			return value, nil
		}
		c.logger.Warn("Failed to fetch secret from AWS",
			"secret", name,
			"error", err.Error())
	}

	// Fallback to environment if enabled
	if c.config.FallbackToEnv {
		return c.getFromEnvFallback(name)
	}

	return nil, ErrSecretNotFound
}

// GetSecretString retrieves a specific property from a secret as a string
func (c *Client) GetSecretString(ctx context.Context, name, property string) (string, error) {
	secret, err := c.GetSecret(ctx, name)
	if err != nil {
		// Try direct env fallback
		if c.config.FallbackToEnv {
			key := fmt.Sprintf("%s/%s", name, property)
			if envVar, ok := c.envFallback[key]; ok {
				if val := os.Getenv(envVar); val != "" {
					c.metrics.mu.Lock()
					c.metrics.EnvFallbacks++
					c.metrics.mu.Unlock()
					return val, nil
				}
			}
		}
		return "", err
	}

	value, ok := secret[property]
	if !ok {
		// Try direct env fallback for property
		if c.config.FallbackToEnv {
			key := fmt.Sprintf("%s/%s", name, property)
			if envVar, ok := c.envFallback[key]; ok {
				if val := os.Getenv(envVar); val != "" {
					c.metrics.mu.Lock()
					c.metrics.EnvFallbacks++
					c.metrics.mu.Unlock()
					return val, nil
				}
			}
		}
		return "", fmt.Errorf("%w: %s in secret %s", ErrPropertyNotFound, property, name)
	}

	switch v := value.(type) {
	case string:
		return v, nil
	case float64:
		return fmt.Sprintf("%.0f", v), nil
	case int:
		return fmt.Sprintf("%d", v), nil
	case bool:
		return fmt.Sprintf("%t", v), nil
	default:
		return fmt.Sprintf("%v", v), nil
	}
}

// GetDatabaseURL returns the database connection URL
func (c *Client) GetDatabaseURL(ctx context.Context) (string, error) {
	return c.GetSecretString(ctx, "database", "url")
}

// GetRedisURL returns the Redis connection URL
func (c *Client) GetRedisURL(ctx context.Context) (string, error) {
	return c.GetSecretString(ctx, "redis", "url")
}

// GetJWTSecret returns the JWT signing secret
func (c *Client) GetJWTSecret(ctx context.Context) (string, error) {
	return c.GetSecretString(ctx, "jwt", "secret")
}

// GetPIIEncryptionKey returns the PII encryption key
func (c *Client) GetPIIEncryptionKey(ctx context.Context) (string, error) {
	return c.GetSecretString(ctx, "pii-encryption", "key")
}

// GetSessionSecret returns the session encryption secret
func (c *Client) GetSessionSecret(ctx context.Context) (string, error) {
	return c.GetSecretString(ctx, "session", "secret")
}

// GetSMTPConfig returns SMTP configuration
func (c *Client) GetSMTPConfig(ctx context.Context) (*SMTPConfig, error) {
	secret, err := c.GetSecret(ctx, "smtp")
	if err != nil {
		return nil, err
	}

	cfg := &SMTPConfig{}

	if v, ok := secret["host"].(string); ok {
		cfg.Host = v
	}
	if v, ok := secret["port"].(float64); ok {
		cfg.Port = int(v)
	}
	if v, ok := secret["username"].(string); ok {
		cfg.Username = v
	}
	if v, ok := secret["password"].(string); ok {
		cfg.Password = v
	}
	if v, ok := secret["from_email"].(string); ok {
		cfg.FromEmail = v
	}
	if v, ok := secret["from_name"].(string); ok {
		cfg.FromName = v
	}

	return cfg, nil
}

// SMTPConfig holds SMTP configuration
type SMTPConfig struct {
	Host      string
	Port      int
	Username  string
	Password  string
	FromEmail string
	FromName  string
}

// GetResendAPIKey returns the Resend API key
func (c *Client) GetResendAPIKey(ctx context.Context) (string, error) {
	return c.GetSecretString(ctx, "resend", "api_key")
}

// GetExternalAPIKey returns an external API key by name
func (c *Client) GetExternalAPIKey(ctx context.Context, keyName string) (string, error) {
	return c.GetSecretString(ctx, "external-apis", keyName)
}

// fullSecretName returns the full AWS secret name with prefix
func (c *Client) fullSecretName(name string) string {
	if strings.HasPrefix(name, c.config.SecretPrefix) {
		return name
	}
	return fmt.Sprintf("%s/%s", c.config.SecretPrefix, name)
}

// getFromCache retrieves a secret from cache if valid
func (c *Client) getFromCache(name string) *cachedSecret {
	c.cacheMu.RLock()
	cached, ok := c.cache[name]
	c.cacheMu.RUnlock()

	if !ok {
		return nil
	}

	if time.Now().After(cached.expiresAt) {
		return nil
	}

	// Update access time
	c.cacheMu.Lock()
	cached.accessedAt = time.Now()
	c.cacheMu.Unlock()

	return cached
}

// fetchSecret fetches a secret from AWS Secrets Manager
func (c *Client) fetchSecret(ctx context.Context, name string) (map[string]interface{}, error) {
	if c.awsClient == nil {
		return nil, ErrClientNotReady
	}

	output, err := c.awsClient.GetSecretValue(ctx, &secretsmanager.GetSecretValueInput{
		SecretId: aws.String(name),
	})
	if err != nil {
		c.metrics.mu.Lock()
		c.metrics.FetchFailures++
		c.metrics.mu.Unlock()
		return nil, fmt.Errorf("failed to get secret %s: %w", name, err)
	}

	var value map[string]interface{}
	if output.SecretString != nil {
		if err := json.Unmarshal([]byte(*output.SecretString), &value); err != nil {
			// Try as plain string
			value = map[string]interface{}{
				"value": *output.SecretString,
			}
		}
	} else if output.SecretBinary != nil {
		if err := json.Unmarshal(output.SecretBinary, &value); err != nil {
			return nil, fmt.Errorf("failed to parse secret binary: %w", err)
		}
	} else {
		return nil, ErrInvalidSecretValue
	}

	// Cache the result
	c.cacheMu.Lock()
	c.cache[name] = &cachedSecret{
		value:      value,
		rawValue:   aws.ToString(output.SecretString),
		fetchedAt:  time.Now(),
		expiresAt:  time.Now().Add(c.config.CacheTTL),
		version:    aws.ToString(output.VersionId),
		accessedAt: time.Now(),
	}
	c.cacheMu.Unlock()

	c.metrics.mu.Lock()
	c.metrics.FetchSuccesses++
	c.metrics.mu.Unlock()

	c.logger.Debug("Fetched and cached secret",
		"secret", name,
		"version", aws.ToString(output.VersionId))

	return value, nil
}

// getFromEnvFallback attempts to construct a secret from environment variables
func (c *Client) getFromEnvFallback(name string) (map[string]interface{}, error) {
	result := make(map[string]interface{})
	found := false

	prefix := name + "/"
	for key, envVar := range c.envFallback {
		if strings.HasPrefix(key, prefix) {
			if val := os.Getenv(envVar); val != "" {
				property := strings.TrimPrefix(key, prefix)
				result[property] = val
				found = true
			}
		}
	}

	if !found {
		return nil, ErrSecretNotFound
	}

	c.metrics.mu.Lock()
	c.metrics.EnvFallbacks++
	c.metrics.mu.Unlock()

	c.logger.Debug("Using environment fallback for secret", "secret", name)
	return result, nil
}

// startBackgroundRefresh starts the background refresh goroutine
func (c *Client) startBackgroundRefresh() {
	ticker := time.NewTicker(c.config.RefreshInterval)
	defer ticker.Stop()

	for {
		select {
		case <-c.ctx.Done():
			return
		case <-ticker.C:
			c.refreshCache()
		}
	}
}

// refreshCache proactively refreshes cached secrets
func (c *Client) refreshCache() {
	c.refreshMu.Lock()
	defer c.refreshMu.Unlock()

	c.cacheMu.RLock()
	secretsToRefresh := make([]string, 0)
	for name, cached := range c.cache {
		// Refresh secrets that will expire soon (within refresh interval)
		if time.Until(cached.expiresAt) < c.config.RefreshInterval {
			secretsToRefresh = append(secretsToRefresh, name)
		}
	}
	c.cacheMu.RUnlock()

	for _, name := range secretsToRefresh {
		ctx, cancel := context.WithTimeout(c.ctx, 10*time.Second)
		_, err := c.fetchSecret(ctx, name)
		cancel()

		if err != nil {
			c.logger.Warn("Failed to refresh secret",
				"secret", name,
				"error", err.Error())
		} else {
			c.logger.Debug("Refreshed secret", "secret", name)
		}
	}
}

// InvalidateCache clears the cache for a specific secret or all secrets
func (c *Client) InvalidateCache(name string) {
	c.cacheMu.Lock()
	defer c.cacheMu.Unlock()

	if name == "" {
		c.cache = make(map[string]*cachedSecret)
		c.logger.Info("Invalidated entire secrets cache")
	} else {
		fullName := c.fullSecretName(name)
		delete(c.cache, fullName)
		c.logger.Info("Invalidated secret cache", "secret", name)
	}
}

// GetMetrics returns the current metrics snapshot
func (c *Client) GetMetrics() Metrics {
	c.metrics.mu.Lock()
	defer c.metrics.mu.Unlock()
	return Metrics{
		CacheHits:      c.metrics.CacheHits,
		CacheMisses:    c.metrics.CacheMisses,
		FetchSuccesses: c.metrics.FetchSuccesses,
		FetchFailures:  c.metrics.FetchFailures,
		EnvFallbacks:   c.metrics.EnvFallbacks,
	}
}

// SetEnvFallback sets a custom environment variable mapping
func (c *Client) SetEnvFallback(secretKey, envVar string) {
	c.envFallback[secretKey] = envVar
}

// Close shuts down the secrets client and stops background refresh
func (c *Client) Close() {
	c.cancel()
	c.logger.Info("Secrets client closed")
}

// HealthCheck performs a health check on the secrets client
func (c *Client) HealthCheck(ctx context.Context) error {
	if !c.IsReady() && !c.config.FallbackToEnv {
		return ErrClientNotReady
	}

	// Try to fetch a known secret to verify connectivity
	if c.IsReady() {
		_, err := c.fetchSecret(ctx, c.fullSecretName("jwt"))
		if err != nil && !c.config.FallbackToEnv {
			return fmt.Errorf("health check failed: %w", err)
		}
	}

	return nil
}
