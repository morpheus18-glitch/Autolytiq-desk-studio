package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/mux"
)

// Config holds application configuration
type Config struct {
	Port               string
	DealServiceURL     string
	CustomerServiceURL string
	AllowedOrigins     string
	JWTSecret          string
	JWTIssuer          string
}

// Server represents the API Gateway server
type Server struct {
	router    *mux.Router
	config    *Config
	jwtConfig *JWTConfig
}

// NewServer creates a new API Gateway server
func NewServer(config *Config) *Server {
	s := &Server{
		router: mux.NewRouter(),
		config: config,
		jwtConfig: &JWTConfig{
			SecretKey: config.JWTSecret,
			Issuer:    config.JWTIssuer,
		},
	}

	s.setupRoutes()
	s.setupMiddleware()

	return s
}

// setupMiddleware configures middleware for the server
func (s *Server) setupMiddleware() {
	s.router.Use(loggingMiddleware)
	s.router.Use(corsMiddleware(s.config.AllowedOrigins))
}

// setupRoutes configures all routes for the API Gateway
func (s *Server) setupRoutes() {
	// Public routes (no authentication required)
	s.router.HandleFunc("/health", s.healthCheck).Methods("GET")
	s.router.HandleFunc("/api/v1/version", s.version).Methods("GET")

	// Protected routes (authentication required)
	api := s.router.PathPrefix("/api/v1").Subrouter()
	api.Use(JWTMiddleware(s.jwtConfig))

	// Deal routes (proxy to deal-service)
	api.HandleFunc("/deals", s.proxyToDealService).Methods("GET", "POST")
	api.HandleFunc("/deals/{id}", s.proxyToDealService).Methods("GET", "PUT", "DELETE")

	// Customer routes (proxy to customer-service)
	api.HandleFunc("/customers", s.proxyToCustomerService).Methods("GET", "POST")
	api.HandleFunc("/customers/{id}", s.proxyToCustomerService).Methods("GET", "PUT", "DELETE")
}

// healthCheck handler
func (s *Server) healthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, `{"status":"healthy","service":"api-gateway","timestamp":"%s"}`, time.Now().Format(time.RFC3339))
}

// version handler
func (s *Server) version(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, `{"version":"1.0.0","service":"api-gateway"}`)
}

// proxyToDealService proxies requests to deal-service
func (s *Server) proxyToDealService(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement actual proxying logic
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusServiceUnavailable)
	fmt.Fprintf(w, `{"error":"Deal service integration pending"}`)
}

// proxyToCustomerService proxies requests to customer-service
func (s *Server) proxyToCustomerService(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement actual proxying logic
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusServiceUnavailable)
	fmt.Fprintf(w, `{"error":"Customer service integration pending"}`)
}

// loggingMiddleware logs all requests
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		log.Printf("[%s] %s %s", r.Method, r.RequestURI, time.Since(start))
		next.ServeHTTP(w, r)
	})
}

// corsMiddleware adds CORS headers
func corsMiddleware(allowedOrigins string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", allowedOrigins)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

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
	log.Printf("Starting API Gateway on port %s", s.config.Port)
	return http.ListenAndServe(":"+s.config.Port, s.router)
}

func loadConfig() *Config {
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Println("WARNING: JWT_SECRET not set, using development default. DO NOT use in production!")
		jwtSecret = "development-secret-change-in-production"
	}

	// Validate JWT secret strength
	if len(jwtSecret) < 32 {
		log.Fatalf("JWT_SECRET must be at least 32 characters (got %d). Use a strong random key for security.", len(jwtSecret))
	}

	return &Config{
		Port:               getEnv("PORT", "8080"),
		DealServiceURL:     getEnv("DEAL_SERVICE_URL", "http://localhost:8081"),
		CustomerServiceURL: getEnv("CUSTOMER_SERVICE_URL", "http://localhost:8082"),
		AllowedOrigins:     getEnv("ALLOWED_ORIGINS", "http://localhost:5173"),
		JWTSecret:          jwtSecret,
		JWTIssuer:          getEnv("JWT_ISSUER", "autolytiq-api-gateway"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func main() {
	config := loadConfig()
	server := NewServer(config)

	log.Fatal(server.Start())
}
