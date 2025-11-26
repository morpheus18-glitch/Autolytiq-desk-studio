package secrets

import (
	"context"
	"os"
	"testing"
	"time"
)

func TestDefaultConfig(t *testing.T) {
	cfg := DefaultConfig()

	if cfg.AWSRegion == "" {
		t.Error("AWSRegion should not be empty")
	}

	if cfg.CacheTTL == 0 {
		t.Error("CacheTTL should not be zero")
	}

	if cfg.RefreshInterval == 0 {
		t.Error("RefreshInterval should not be zero")
	}

	if !cfg.FallbackToEnv {
		t.Error("FallbackToEnv should default to true")
	}
}

func TestEnvProvider(t *testing.T) {
	ctx := context.Background()
	provider := NewEnvProvider()
	defer provider.Close()

	t.Run("GetDatabaseURL from env", func(t *testing.T) {
		os.Setenv("DATABASE_URL", "postgresql://test:test@localhost:5432/testdb")
		defer os.Unsetenv("DATABASE_URL")

		url, err := provider.GetDatabaseURL(ctx)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if url != "postgresql://test:test@localhost:5432/testdb" {
			t.Errorf("expected DATABASE_URL value, got %s", url)
		}
	})

	t.Run("GetDatabaseURL from components", func(t *testing.T) {
		os.Unsetenv("DATABASE_URL")
		os.Setenv("POSTGRES_USER", "myuser")
		os.Setenv("POSTGRES_PASSWORD", "mypass")
		os.Setenv("POSTGRES_HOST", "myhost")
		os.Setenv("POSTGRES_PORT", "5433")
		os.Setenv("POSTGRES_DB", "mydb")
		defer func() {
			os.Unsetenv("POSTGRES_USER")
			os.Unsetenv("POSTGRES_PASSWORD")
			os.Unsetenv("POSTGRES_HOST")
			os.Unsetenv("POSTGRES_PORT")
			os.Unsetenv("POSTGRES_DB")
		}()

		url, err := provider.GetDatabaseURL(ctx)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		expected := "postgresql://myuser:mypass@myhost:5433/mydb?sslmode=disable"
		if url != expected {
			t.Errorf("expected %s, got %s", expected, url)
		}
	})

	t.Run("GetJWTSecret", func(t *testing.T) {
		os.Setenv("JWT_SECRET", "my-secret-key")
		defer os.Unsetenv("JWT_SECRET")

		secret, err := provider.GetJWTSecret(ctx)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if secret != "my-secret-key" {
			t.Errorf("expected my-secret-key, got %s", secret)
		}
	})

	t.Run("GetJWTSecret missing", func(t *testing.T) {
		os.Unsetenv("JWT_SECRET")

		_, err := provider.GetJWTSecret(ctx)
		if err == nil {
			t.Error("expected error for missing JWT_SECRET")
		}
	})

	t.Run("GetRedisURL", func(t *testing.T) {
		os.Setenv("REDIS_URL", "redis://localhost:6379")
		defer os.Unsetenv("REDIS_URL")

		url, err := provider.GetRedisURL(ctx)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if url != "redis://localhost:6379" {
			t.Errorf("expected redis://localhost:6379, got %s", url)
		}
	})

	t.Run("GetRedisURL with password", func(t *testing.T) {
		os.Unsetenv("REDIS_URL")
		os.Setenv("REDIS_HOST", "myredis")
		os.Setenv("REDIS_PORT", "6380")
		os.Setenv("REDIS_PASSWORD", "mypassword")
		defer func() {
			os.Unsetenv("REDIS_HOST")
			os.Unsetenv("REDIS_PORT")
			os.Unsetenv("REDIS_PASSWORD")
		}()

		url, err := provider.GetRedisURL(ctx)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		expected := "redis://:mypassword@myredis:6380"
		if url != expected {
			t.Errorf("expected %s, got %s", expected, url)
		}
	})

	t.Run("GetSMTPConfig", func(t *testing.T) {
		os.Setenv("SMTP_HOST", "smtp.example.com")
		os.Setenv("SMTP_PORT", "465")
		os.Setenv("SMTP_USERNAME", "user")
		os.Setenv("SMTP_PASSWORD", "pass")
		os.Setenv("SMTP_FROM_EMAIL", "test@example.com")
		os.Setenv("SMTP_FROM_NAME", "Test App")
		defer func() {
			os.Unsetenv("SMTP_HOST")
			os.Unsetenv("SMTP_PORT")
			os.Unsetenv("SMTP_USERNAME")
			os.Unsetenv("SMTP_PASSWORD")
			os.Unsetenv("SMTP_FROM_EMAIL")
			os.Unsetenv("SMTP_FROM_NAME")
		}()

		cfg, err := provider.GetSMTPConfig(ctx)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if cfg.Host != "smtp.example.com" {
			t.Errorf("expected smtp.example.com, got %s", cfg.Host)
		}
		if cfg.Port != 465 {
			t.Errorf("expected port 465, got %d", cfg.Port)
		}
		if cfg.Username != "user" {
			t.Errorf("expected user, got %s", cfg.Username)
		}
		if cfg.Password != "pass" {
			t.Errorf("expected pass, got %s", cfg.Password)
		}
		if cfg.FromEmail != "test@example.com" {
			t.Errorf("expected test@example.com, got %s", cfg.FromEmail)
		}
		if cfg.FromName != "Test App" {
			t.Errorf("expected Test App, got %s", cfg.FromName)
		}
	})

	t.Run("HealthCheck", func(t *testing.T) {
		err := provider.HealthCheck(ctx)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
	})
}

func TestConfigLoader(t *testing.T) {
	ctx := context.Background()

	// Set up test environment
	os.Setenv("DATABASE_URL", "postgresql://test:test@localhost:5432/testdb")
	os.Setenv("REDIS_URL", "redis://localhost:6379")
	os.Setenv("JWT_SECRET", "test-jwt-secret-key-32-chars-min")
	os.Setenv("JWT_ISSUER", "test-issuer")
	os.Setenv("PII_ENCRYPTION_KEY", "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef")
	os.Setenv("SECRETS_PROVIDER", "env")
	defer func() {
		os.Unsetenv("DATABASE_URL")
		os.Unsetenv("REDIS_URL")
		os.Unsetenv("JWT_SECRET")
		os.Unsetenv("JWT_ISSUER")
		os.Unsetenv("PII_ENCRYPTION_KEY")
		os.Unsetenv("SECRETS_PROVIDER")
	}()

	t.Run("LoadBaseConfig", func(t *testing.T) {
		loader, err := NewConfigLoader(ctx, "test-service")
		if err != nil {
			t.Fatalf("failed to create loader: %v", err)
		}
		defer loader.Close()

		cfg, err := loader.LoadBaseConfig(ctx)
		if err != nil {
			t.Fatalf("failed to load config: %v", err)
		}

		if cfg.DatabaseURL != "postgresql://test:test@localhost:5432/testdb" {
			t.Errorf("unexpected database URL: %s", cfg.DatabaseURL)
		}

		if cfg.RedisURL != "redis://localhost:6379" {
			t.Errorf("unexpected redis URL: %s", cfg.RedisURL)
		}

		if cfg.ServiceName != "test-service" {
			t.Errorf("unexpected service name: %s", cfg.ServiceName)
		}
	})

	t.Run("LoadAuthConfig", func(t *testing.T) {
		loader, err := NewConfigLoader(ctx, "auth-service")
		if err != nil {
			t.Fatalf("failed to create loader: %v", err)
		}
		defer loader.Close()

		cfg, err := loader.LoadAuthConfig(ctx)
		if err != nil {
			t.Fatalf("failed to load config: %v", err)
		}

		if cfg.JWTSecret != "test-jwt-secret-key-32-chars-min" {
			t.Errorf("unexpected JWT secret: %s", cfg.JWTSecret)
		}

		if cfg.JWTIssuer != "test-issuer" {
			t.Errorf("unexpected JWT issuer: %s", cfg.JWTIssuer)
		}

		if cfg.AccessTokenTTL != 15*time.Minute {
			t.Errorf("unexpected access token TTL: %v", cfg.AccessTokenTTL)
		}
	})

	t.Run("LoadEncryptionConfig", func(t *testing.T) {
		loader, err := NewConfigLoader(ctx, "customer-service")
		if err != nil {
			t.Fatalf("failed to create loader: %v", err)
		}
		defer loader.Close()

		cfg, err := loader.LoadEncryptionConfig(ctx)
		if err != nil {
			t.Fatalf("failed to load config: %v", err)
		}

		if cfg.PIIEncryptionKey == "" {
			t.Error("PII encryption key should not be empty")
		}
	})

	t.Run("Default ports", func(t *testing.T) {
		testCases := map[string]string{
			"api-gateway":       "8080",
			"auth-service":      "8087",
			"deal-service":      "8081",
			"customer-service":  "8082",
			"inventory-service": "8083",
			"email-service":     "8084",
			"user-service":      "8085",
			"config-service":    "8086",
			"unknown-service":   "8080",
		}

		for service, expectedPort := range testCases {
			port := getDefaultPort(service)
			if port != expectedPort {
				t.Errorf("expected port %s for %s, got %s", expectedPort, service, port)
			}
		}
	})
}

func TestParseDuration(t *testing.T) {
	testCases := []struct {
		input    string
		expected time.Duration
	}{
		{"15m", 15 * time.Minute},
		{"1h", 1 * time.Hour},
		{"7d", 7 * 24 * time.Hour},
		{"30d", 30 * 24 * time.Hour},
		{"invalid", 5 * time.Minute}, // default
	}

	for _, tc := range testCases {
		result := parseDuration(tc.input, 5*time.Minute)
		if result != tc.expected {
			t.Errorf("parseDuration(%s) = %v, expected %v", tc.input, result, tc.expected)
		}
	}
}

func TestAutoProvider(t *testing.T) {
	ctx := context.Background()

	// Ensure we get env provider in local/test environment
	os.Unsetenv("KUBERNETES_SERVICE_HOST")
	os.Unsetenv("AWS_EXECUTION_ENV")
	os.Setenv("SECRETS_PROVIDER", "env")
	defer os.Unsetenv("SECRETS_PROVIDER")

	provider, err := AutoProvider(ctx)
	if err != nil {
		t.Fatalf("failed to create auto provider: %v", err)
	}
	defer provider.Close()

	// Should be able to use the provider
	err = provider.HealthCheck(ctx)
	if err != nil {
		t.Errorf("health check failed: %v", err)
	}
}

func TestCacheInvalidation(t *testing.T) {
	provider := NewEnvProvider()
	defer provider.Close()

	// This should not panic
	provider.InvalidateCache("")
	provider.InvalidateCache("specific-secret")
}
