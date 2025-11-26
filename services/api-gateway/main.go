package main

import (
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"autolytiq/shared/logging"

	"github.com/gorilla/mux"
)

// Config holds application configuration
type Config struct {
	Port                    string
	AuthServiceURL          string
	DealServiceURL          string
	CustomerServiceURL      string
	InventoryServiceURL     string
	EmailServiceURL         string
	UserServiceURL          string
	ConfigServiceURL        string
	ShowroomServiceURL      string
	MessagingServiceURL     string
	SettingsServiceURL      string
	DataRetentionServiceURL string
	AllowedOrigins          string
	JWTSecret               string
	JWTIssuer               string

	// Rate limiting configuration
	RateLimitConfig *RateLimitConfig
}

// Server represents the API Gateway server
type Server struct {
	router      *mux.Router
	config      *Config
	jwtConfig   *JWTConfig
	rateLimiter *RateLimiter
	metrics     *RateLimitMetrics
	logger      *logging.Logger
}

// NewServer creates a new API Gateway server
func NewServer(config *Config, logger *logging.Logger) *Server {
	metrics := NewRateLimitMetrics()

	rateLimiter, err := NewRateLimiter(config.RateLimitConfig, metrics, logger)
	if err != nil {
		logger.Warnf("Failed to initialize rate limiter: %v", err)
	}

	s := &Server{
		router: mux.NewRouter(),
		config: config,
		jwtConfig: &JWTConfig{
			SecretKey: config.JWTSecret,
			Issuer:    config.JWTIssuer,
		},
		rateLimiter: rateLimiter,
		metrics:     metrics,
		logger:      logger,
	}

	s.setupRoutes()
	s.setupMiddleware()

	return s
}

// setupMiddleware configures middleware for the server
func (s *Server) setupMiddleware() {
	// Order matters: request ID first, then logging, then CORS, then validation, then metrics
	s.router.Use(logging.RequestIDMiddleware)
	s.router.Use(logging.RequestLoggingMiddleware(s.logger))
	s.router.Use(corsMiddleware(s.config.AllowedOrigins))
	s.router.Use(GatewayValidationMiddleware) // Validate all incoming requests
	s.router.Use(metricsMiddleware(s.metrics))

	// Rate limiting is applied after authentication context is set
	// It's applied in setupRoutes for protected routes
}

// setupRoutes configures all routes for the API Gateway
func (s *Server) setupRoutes() {
	// Metrics endpoint (no rate limiting, no auth)
	s.router.Handle("/metrics", s.metrics.Handler()).Methods("GET")

	// Public routes (no authentication required, rate limited by IP)
	s.router.HandleFunc("/health", s.healthCheck).Methods("GET")
	s.router.HandleFunc("/ready", s.readinessCheck).Methods("GET")
	s.router.HandleFunc("/live", s.livenessCheck).Methods("GET")
	s.router.HandleFunc("/api/v1/version", s.version).Methods("GET")

	// Auth routes (public - no JWT required, rate limited by IP)
	authPublic := s.router.PathPrefix("/api/v1/auth").Subrouter()
	authPublic.Use(RateLimitMiddleware(s.rateLimiter, s.logger))
	authPublic.HandleFunc("/register", s.proxyToAuthService).Methods("POST")
	authPublic.HandleFunc("/login", s.proxyToAuthService).Methods("POST")
	authPublic.HandleFunc("/refresh", s.proxyToAuthService).Methods("POST")
	authPublic.HandleFunc("/forgot-password", s.proxyToAuthService).Methods("POST")
	authPublic.HandleFunc("/reset-password", s.proxyToAuthService).Methods("POST")
	authPublic.HandleFunc("/verify-email", s.proxyToAuthService).Methods("POST")

	// Auth routes (protected - requires JWT)
	authProtected := s.router.PathPrefix("/api/v1/auth").Subrouter()
	authProtected.Use(JWTMiddleware(s.jwtConfig))
	authProtected.Use(RateLimitMiddleware(s.rateLimiter, s.logger))
	authProtected.HandleFunc("/logout", s.proxyToAuthService).Methods("POST")
	authProtected.HandleFunc("/me", s.proxyToAuthService).Methods("GET")
	authProtected.HandleFunc("/change-password", s.proxyToAuthService).Methods("POST")

	// Protected routes (authentication required)
	api := s.router.PathPrefix("/api/v1").Subrouter()
	api.Use(JWTMiddleware(s.jwtConfig))
	api.Use(RateLimitMiddleware(s.rateLimiter, s.logger))

	// Deal Service routes
	api.HandleFunc("/deals", s.proxyToDealService).Methods("GET", "POST")
	api.HandleFunc("/deals/{id}", s.proxyToDealService).Methods("GET", "PUT", "DELETE")

	// Customer Service routes
	api.HandleFunc("/customers", s.proxyToCustomerService).Methods("GET", "POST")
	api.HandleFunc("/customers/{id}", s.proxyToCustomerService).Methods("GET", "PUT", "DELETE")

	// Inventory Service routes
	api.HandleFunc("/inventory/vehicles", s.proxyToInventoryService).Methods("GET", "POST")
	api.HandleFunc("/inventory/vehicles/{id}", s.proxyToInventoryService).Methods("GET", "PUT", "DELETE")
	api.HandleFunc("/inventory/vehicles/validate-vin", s.proxyToInventoryService).Methods("POST")
	api.HandleFunc("/inventory/stats", s.proxyToInventoryService).Methods("GET")

	// Email Service routes
	api.HandleFunc("/email/send", s.proxyToEmailService).Methods("POST")
	api.HandleFunc("/email/send-template", s.proxyToEmailService).Methods("POST")
	api.HandleFunc("/email/templates", s.proxyToEmailService).Methods("GET", "POST")
	api.HandleFunc("/email/templates/{id}", s.proxyToEmailService).Methods("GET", "PUT", "DELETE")
	api.HandleFunc("/email/logs", s.proxyToEmailService).Methods("GET")
	api.HandleFunc("/email/logs/{id}", s.proxyToEmailService).Methods("GET")

	// User Service routes
	api.HandleFunc("/users", s.proxyToUserService).Methods("GET", "POST")
	api.HandleFunc("/users/{id}", s.proxyToUserService).Methods("GET", "PUT", "DELETE")
	api.HandleFunc("/users/{id}/role", s.proxyToUserService).Methods("PUT")
	api.HandleFunc("/users/{id}/password", s.proxyToUserService).Methods("POST")
	api.HandleFunc("/users/{id}/activity", s.proxyToUserService).Methods("GET")
	api.HandleFunc("/users/{id}/preferences", s.proxyToUserService).Methods("GET", "PUT")
	api.HandleFunc("/users/validate-email", s.proxyToUserService).Methods("POST")

	// Config Service routes
	api.HandleFunc("/config/settings", s.proxyToConfigService).Methods("GET")
	api.HandleFunc("/config/settings/{key}", s.proxyToConfigService).Methods("GET", "PUT", "DELETE")
	api.HandleFunc("/config/categories/{category}", s.proxyToConfigService).Methods("GET")
	api.HandleFunc("/config/features", s.proxyToConfigService).Methods("GET", "POST")
	api.HandleFunc("/config/features/{key}", s.proxyToConfigService).Methods("GET", "PUT", "DELETE")
	api.HandleFunc("/config/features/{key}/evaluate", s.proxyToConfigService).Methods("POST")
	api.HandleFunc("/config/integrations", s.proxyToConfigService).Methods("GET", "POST")
	api.HandleFunc("/config/integrations/{id}", s.proxyToConfigService).Methods("GET", "PUT", "DELETE")

	// Showroom Service routes
	api.HandleFunc("/showroom/visits", s.proxyToShowroomService).Methods("GET", "POST")
	api.HandleFunc("/showroom/visits/{id}", s.proxyToShowroomService).Methods("GET", "PATCH")
	api.HandleFunc("/showroom/visits/{id}/status", s.proxyToShowroomService).Methods("POST")
	api.HandleFunc("/showroom/visits/{id}/vehicle", s.proxyToShowroomService).Methods("POST")
	api.HandleFunc("/showroom/visits/{id}/close", s.proxyToShowroomService).Methods("POST")
	api.HandleFunc("/showroom/visits/{id}/timers", s.proxyToShowroomService).Methods("GET", "POST")
	api.HandleFunc("/showroom/visits/{id}/timers/{timer_id}/stop", s.proxyToShowroomService).Methods("POST")
	api.HandleFunc("/showroom/visits/{id}/notes", s.proxyToShowroomService).Methods("GET", "POST")
	api.HandleFunc("/showroom/visits/{id}/notes/{note_id}", s.proxyToShowroomService).Methods("PATCH", "DELETE")
	api.HandleFunc("/showroom/visits/{id}/events", s.proxyToShowroomService).Methods("GET")
	api.HandleFunc("/showroom/workflow-config", s.proxyToShowroomService).Methods("GET", "PUT")

	// WebSocket endpoint for showroom (upgrade handled separately)
	s.router.HandleFunc("/ws/showroom", s.proxyWebSocketToShowroom)

	// Messaging Service routes
	api.HandleFunc("/messaging/conversations", s.proxyToMessagingService).Methods("GET", "POST")
	api.HandleFunc("/messaging/conversations/{id}", s.proxyToMessagingService).Methods("GET", "PATCH")
	api.HandleFunc("/messaging/conversations/{conversationId}/messages", s.proxyToMessagingService).Methods("GET", "POST")
	api.HandleFunc("/messaging/conversations/{conversationId}/messages/{messageId}", s.proxyToMessagingService).Methods("GET", "PATCH", "DELETE")
	api.HandleFunc("/messaging/conversations/{conversationId}/read", s.proxyToMessagingService).Methods("POST")
	api.HandleFunc("/messaging/conversations/{conversationId}/messages/{messageId}/reactions", s.proxyToMessagingService).Methods("POST")
	api.HandleFunc("/messaging/conversations/{conversationId}/messages/{messageId}/reactions/{reactionType}", s.proxyToMessagingService).Methods("DELETE")
	api.HandleFunc("/messaging/conversations/{conversationId}/typing", s.proxyToMessagingService).Methods("POST")
	api.HandleFunc("/messaging/conversations/{conversationId}/participants", s.proxyToMessagingService).Methods("GET", "POST")
	api.HandleFunc("/messaging/conversations/{conversationId}/participants/{userId}", s.proxyToMessagingService).Methods("DELETE")

	// WebSocket endpoint for messaging
	s.router.HandleFunc("/ws/messaging", s.proxyWebSocketToMessaging)

	// Settings Service routes
	api.HandleFunc("/settings/user", s.proxyToSettingsService).Methods("GET", "POST", "PUT", "DELETE")
	api.HandleFunc("/settings/user/{section}", s.proxyToSettingsService).Methods("PATCH")
	api.HandleFunc("/settings/dealership", s.proxyToSettingsService).Methods("GET", "POST", "PUT")

	// GDPR/Data Retention Service routes
	api.HandleFunc("/gdpr/export/{customer_id}", s.proxyToDataRetentionService).Methods("POST")
	api.HandleFunc("/gdpr/delete/{customer_id}", s.proxyToDataRetentionService).Methods("POST")
	api.HandleFunc("/gdpr/anonymize/{customer_id}", s.proxyToDataRetentionService).Methods("POST")
	api.HandleFunc("/gdpr/retention-status", s.proxyToDataRetentionService).Methods("GET")
	api.HandleFunc("/gdpr/retention-status/{customer_id}", s.proxyToDataRetentionService).Methods("GET")
	api.HandleFunc("/gdpr/requests", s.proxyToDataRetentionService).Methods("GET")
	api.HandleFunc("/gdpr/requests/{id}", s.proxyToDataRetentionService).Methods("GET")
	api.HandleFunc("/gdpr/requests/{id}/status", s.proxyToDataRetentionService).Methods("PUT")

	// Consent Management routes
	api.HandleFunc("/consent/{customer_id}", s.proxyToDataRetentionService).Methods("GET", "PUT")
	api.HandleFunc("/consent/{customer_id}/history", s.proxyToDataRetentionService).Methods("GET")
	api.HandleFunc("/consent/marketing/opt-out", s.proxyToDataRetentionService).Methods("POST")

	// Retention Policy routes (admin)
	api.HandleFunc("/retention/policies", s.proxyToDataRetentionService).Methods("GET", "POST")
	api.HandleFunc("/retention/policies/{id}", s.proxyToDataRetentionService).Methods("GET", "PUT", "DELETE")

	// Audit Log routes
	api.HandleFunc("/audit/logs", s.proxyToDataRetentionService).Methods("GET")
	api.HandleFunc("/audit/logs/{id}", s.proxyToDataRetentionService).Methods("GET")
}

// healthCheck handler
func (s *Server) healthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, `{"status":"healthy","service":"api-gateway","timestamp":"%s"}`, time.Now().Format(time.RFC3339))
}

// readinessCheck handler for Kubernetes readiness probes
func (s *Server) readinessCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, `{"status":"ready","service":"api-gateway","timestamp":"%s"}`, time.Now().Format(time.RFC3339))
}

// livenessCheck handler for Kubernetes liveness probes
func (s *Server) livenessCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, `{"status":"alive","service":"api-gateway","timestamp":"%s"}`, time.Now().Format(time.RFC3339))
}

// version handler
func (s *Server) version(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, `{"version":"1.0.0","service":"api-gateway"}`)
}

// proxyToDealService proxies requests to deal-service
func (s *Server) proxyToDealService(w http.ResponseWriter, r *http.Request) {
	s.proxyRequest(w, r, s.config.DealServiceURL, "/deals")
}

// proxyToCustomerService proxies requests to customer-service
func (s *Server) proxyToCustomerService(w http.ResponseWriter, r *http.Request) {
	s.proxyRequest(w, r, s.config.CustomerServiceURL, "/customers")
}

// proxyToInventoryService proxies requests to inventory-service
func (s *Server) proxyToInventoryService(w http.ResponseWriter, r *http.Request) {
	s.proxyRequest(w, r, s.config.InventoryServiceURL, "/inventory")
}

// proxyToEmailService proxies requests to email-service
func (s *Server) proxyToEmailService(w http.ResponseWriter, r *http.Request) {
	s.proxyRequest(w, r, s.config.EmailServiceURL, "/email")
}

// proxyToUserService proxies requests to user-service
func (s *Server) proxyToUserService(w http.ResponseWriter, r *http.Request) {
	s.proxyRequest(w, r, s.config.UserServiceURL, "/users")
}

// proxyToConfigService proxies requests to config-service
func (s *Server) proxyToConfigService(w http.ResponseWriter, r *http.Request) {
	s.proxyRequest(w, r, s.config.ConfigServiceURL, "/config")
}

// proxyToAuthService proxies requests to auth-service
func (s *Server) proxyToAuthService(w http.ResponseWriter, r *http.Request) {
	s.proxyRequest(w, r, s.config.AuthServiceURL, "/auth")
}

// proxyToShowroomService proxies requests to showroom-service
func (s *Server) proxyToShowroomService(w http.ResponseWriter, r *http.Request) {
	s.proxyRequest(w, r, s.config.ShowroomServiceURL, "/showroom")
}

// proxyWebSocketToShowroom proxies WebSocket connections to showroom-service
func (s *Server) proxyWebSocketToShowroom(w http.ResponseWriter, r *http.Request) {
	s.proxyWebSocket(w, r, s.config.ShowroomServiceURL)
}

// proxyToMessagingService proxies requests to messaging-service
func (s *Server) proxyToMessagingService(w http.ResponseWriter, r *http.Request) {
	s.proxyRequest(w, r, s.config.MessagingServiceURL, "/messaging")
}

// proxyWebSocketToMessaging proxies WebSocket connections to messaging-service
func (s *Server) proxyWebSocketToMessaging(w http.ResponseWriter, r *http.Request) {
	s.proxyWebSocket(w, r, s.config.MessagingServiceURL)
}

// proxyToSettingsService proxies requests to settings-service
func (s *Server) proxyToSettingsService(w http.ResponseWriter, r *http.Request) {
	s.proxyRequest(w, r, s.config.SettingsServiceURL, "/settings")
}

// proxyToDataRetentionService proxies requests to data-retention-service
func (s *Server) proxyToDataRetentionService(w http.ResponseWriter, r *http.Request) {
	// Determine the correct path prefix based on the URL path
	path := r.URL.Path
	var prefix string
	switch {
	case len(path) >= 12 && path[8:12] == "gdpr":
		prefix = "/gdpr"
	case len(path) >= 15 && path[8:15] == "consent":
		prefix = "/consent"
	case len(path) >= 17 && path[8:17] == "retention":
		prefix = "/retention"
	case len(path) >= 13 && path[8:13] == "audit":
		prefix = "/audit"
	default:
		prefix = ""
	}
	s.proxyRequest(w, r, s.config.DataRetentionServiceURL, prefix)
}

// corsMiddleware adds CORS headers
func corsMiddleware(allowedOrigins string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", allowedOrigins)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-Request-ID")
			w.Header().Set("Access-Control-Expose-Headers", "X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After, X-Request-ID")

			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// Start starts the API Gateway server
func (s *Server) Start() error {
	s.logger.Infof("Starting API Gateway on port %s", s.config.Port)
	return http.ListenAndServe(":"+s.config.Port, s.router)
}

// Close closes server resources
func (s *Server) Close() error {
	if s.rateLimiter != nil {
		return s.rateLimiter.Close()
	}
	return nil
}

func loadConfig(logger *logging.Logger) *Config {
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		logger.Warn("JWT_SECRET not set, using development default. DO NOT use in production!")
		jwtSecret = "development-secret-change-in-production"
	}

	// Validate JWT secret strength
	if len(jwtSecret) < 32 {
		logger.Fatalf("JWT_SECRET must be at least 32 characters (got %d). Use a strong random key for security.", len(jwtSecret))
	}

	// Load rate limiting configuration
	rateLimitConfig := loadRateLimitConfig()

	return &Config{
		Port:                    getEnv("PORT", "8080"),
		AuthServiceURL:          getEnv("AUTH_SERVICE_URL", "http://localhost:8087"),
		DealServiceURL:          getEnv("DEAL_SERVICE_URL", "http://localhost:8081"),
		CustomerServiceURL:      getEnv("CUSTOMER_SERVICE_URL", "http://localhost:8082"),
		InventoryServiceURL:     getEnv("INVENTORY_SERVICE_URL", "http://localhost:8083"),
		EmailServiceURL:         getEnv("EMAIL_SERVICE_URL", "http://localhost:8084"),
		UserServiceURL:          getEnv("USER_SERVICE_URL", "http://localhost:8085"),
		ConfigServiceURL:        getEnv("CONFIG_SERVICE_URL", "http://localhost:8086"),
		ShowroomServiceURL:      getEnv("SHOWROOM_SERVICE_URL", "http://localhost:8088"),
		MessagingServiceURL:     getEnv("MESSAGING_SERVICE_URL", "http://localhost:8089"),
		SettingsServiceURL:      getEnv("SETTINGS_SERVICE_URL", "http://localhost:8090"),
		DataRetentionServiceURL: getEnv("DATA_RETENTION_SERVICE_URL", "http://localhost:8091"),
		AllowedOrigins:          getEnv("ALLOWED_ORIGINS", "http://localhost:5173"),
		JWTSecret:               jwtSecret,
		JWTIssuer:               getEnv("JWT_ISSUER", "autolytiq"),
		RateLimitConfig:         rateLimitConfig,
	}
}

// loadRateLimitConfig loads rate limiting configuration from environment
func loadRateLimitConfig() *RateLimitConfig {
	config := DefaultRateLimitConfig()

	// Redis configuration
	config.RedisURL = getEnv("REDIS_URL", "redis://localhost:6379")
	config.RedisPassword = getEnv("REDIS_PASSWORD", "")
	config.RedisDB = getEnvInt("REDIS_DB", 0)

	// Rate limits (requests per minute)
	config.IPRateLimit = getEnvInt("RATE_LIMIT_IP", 100)
	config.UserRateLimit = getEnvInt("RATE_LIMIT_USER", 1000)
	config.DealershipRateLimit = getEnvInt("RATE_LIMIT_DEALERSHIP", 5000)

	// Window duration in seconds
	windowSeconds := getEnvInt("RATE_LIMIT_WINDOW_SECONDS", 60)
	config.WindowDuration = time.Duration(windowSeconds) * time.Second

	// Enabled flag
	config.Enabled = getEnvBool("RATE_LIMIT_ENABLED", true)

	// Bypass paths (comma-separated)
	bypassPaths := getEnv("RATE_LIMIT_BYPASS_PATHS", "")
	if bypassPaths != "" {
		config.BypassPaths = append(config.BypassPaths, strings.Split(bypassPaths, ",")...)
	}

	return config
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultValue
}

func main() {
	// Initialize logger
	logger := logging.New(logging.Config{
		Service: "api-gateway",
	})

	config := loadConfig(logger)
	server := NewServer(config, logger)

	defer func() {
		if err := server.Close(); err != nil {
			logger.Errorf("Error closing server: %v", err)
		}
	}()

	if err := server.Start(); err != nil {
		logger.Fatal(err.Error())
	}
}
