package main

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"time"

	"autolytiq/shared/logging"
	"autolytiq/shared/secrets"

	"github.com/gorilla/mux"
)

// Config holds application configuration
type Config struct {
	Port            string
	DatabaseURL     string
	RedisURL        string
	JWTSecret       string
	JWTIssuer       string
	AccessTokenTTL  time.Duration
	RefreshTokenTTL time.Duration
}

// Server represents the Auth service server
type Server struct {
	router     *mux.Router
	config     *Config
	db         AuthDatabase
	redis      TokenStore
	jwtService *JWTService
	logger     *logging.Logger
}

func main() {
	// Initialize logger
	logger := logging.New(logging.Config{
		Service: "auth-service",
	})

	ctx := context.Background()
	config := loadConfig(ctx, logger)

	// Initialize database
	db, err := NewPostgresDB(config.DatabaseURL, logger)
	if err != nil {
		logger.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Initialize schema
	if err := db.InitSchema(); err != nil {
		logger.Fatalf("Failed to initialize schema: %v", err)
	}

	// Initialize Redis
	redis, err := NewRedisStore(config.RedisURL, logger)
	if err != nil {
		logger.Fatalf("Failed to connect to Redis: %v", err)
	}
	defer redis.Close()

	// Initialize JWT service
	jwtService := NewJWTService(config.JWTSecret, config.JWTIssuer, config.AccessTokenTTL, config.RefreshTokenTTL)

	// Create server
	server := NewServer(config, db, redis, jwtService, logger)

	logger.Infof("Auth service starting on port %s", config.Port)
	if err := http.ListenAndServe(":"+config.Port, server.router); err != nil {
		logger.Fatal(err.Error())
	}
}

func loadConfig(ctx context.Context, logger *logging.Logger) *Config {
	// Initialize secrets provider (AWS Secrets Manager in production, env vars in development)
	secretsProvider, err := secrets.AutoProvider(ctx)
	if err != nil {
		logger.Warn("Failed to initialize secrets provider, falling back to environment variables: " + err.Error())
	}
	defer func() {
		if secretsProvider != nil {
			secretsProvider.Close()
		}
	}()

	// Load secrets with fallback to environment variables
	var databaseURL, redisURL, jwtSecret, jwtIssuer string

	if secretsProvider != nil {
		// Try to get secrets from provider
		if url, err := secretsProvider.GetDatabaseURL(ctx); err == nil {
			databaseURL = url
		}
		if url, err := secretsProvider.GetRedisURL(ctx); err == nil {
			redisURL = url
		}
		if secret, err := secretsProvider.GetJWTSecret(ctx); err == nil {
			jwtSecret = secret
		}
		if issuer, err := secretsProvider.GetJWTIssuer(ctx); err == nil {
			jwtIssuer = issuer
		}
	}

	// Fallback to environment variables for any missing values
	if databaseURL == "" {
		databaseURL = getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/autolytiq?sslmode=disable")
	}
	if redisURL == "" {
		redisURL = getEnv("REDIS_URL", "redis://localhost:6379")
	}
	if jwtSecret == "" {
		jwtSecret = getEnv("JWT_SECRET", "")
		if jwtSecret == "" {
			logger.Warn("JWT_SECRET not set, using development default. DO NOT use in production!")
			jwtSecret = "your-super-secret-key-change-in-production"
		}
	}
	if jwtIssuer == "" {
		jwtIssuer = getEnv("JWT_ISSUER", "autolytiq")
	}

	return &Config{
		Port:            getEnv("PORT", "8087"),
		DatabaseURL:     databaseURL,
		RedisURL:        redisURL,
		JWTSecret:       jwtSecret,
		JWTIssuer:       jwtIssuer,
		AccessTokenTTL:  parseDuration(getEnv("ACCESS_TOKEN_TTL", "15m")),
		RefreshTokenTTL: parseDuration(getEnv("REFRESH_TOKEN_TTL", "7d")),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func parseDuration(s string) time.Duration {
	// Handle "7d" format
	if strings.HasSuffix(s, "d") {
		days := s[:len(s)-1]
		var d int
		if _, err := json.Number(days).Int64(); err == nil {
			d = int(json.Number(days).String()[0] - '0')
		}
		if d == 0 {
			d = 7
		}
		return time.Duration(d) * 24 * time.Hour
	}

	duration, err := time.ParseDuration(s)
	if err != nil {
		return 15 * time.Minute
	}
	return duration
}

// NewServer creates a new Auth service server
func NewServer(config *Config, db AuthDatabase, redis TokenStore, jwtService *JWTService, logger *logging.Logger) *Server {
	s := &Server{
		router:     mux.NewRouter(),
		config:     config,
		db:         db,
		redis:      redis,
		jwtService: jwtService,
		logger:     logger,
	}
	s.setupMiddleware()
	s.setupRoutes()
	return s
}

func (s *Server) setupMiddleware() {
	s.router.Use(logging.RequestIDMiddleware)
	s.router.Use(logging.RequestLoggingMiddleware(s.logger))
}

func (s *Server) setupRoutes() {
	// Health check
	s.router.HandleFunc("/health", s.healthCheck).Methods("GET")

	// Auth endpoints
	s.router.HandleFunc("/auth/register", s.register).Methods("POST")
	s.router.HandleFunc("/auth/login", s.login).Methods("POST")
	s.router.HandleFunc("/auth/logout", s.logout).Methods("POST")
	s.router.HandleFunc("/auth/refresh", s.refresh).Methods("POST")
	s.router.HandleFunc("/auth/me", s.me).Methods("GET")
	s.router.HandleFunc("/auth/change-password", s.changePassword).Methods("POST")
	s.router.HandleFunc("/auth/forgot-password", s.forgotPassword).Methods("POST")
	s.router.HandleFunc("/auth/reset-password", s.resetPassword).Methods("POST")
	s.router.HandleFunc("/auth/verify-email", s.verifyEmail).Methods("POST")
}

// Response helpers
func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}

// Health check handler
func (s *Server) healthCheck(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"status":    "healthy",
		"service":   "auth-service",
		"timestamp": time.Now().Format(time.RFC3339),
	})
}
