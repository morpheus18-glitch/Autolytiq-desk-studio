package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"autolytiq/shared/logging"

	"autolytiq/services/shared/encryption"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// Customer represents a customer entity with PII fields
type Customer struct {
	ID                   string    `json:"id"`
	DealershipID         string    `json:"dealership_id"`
	FirstName            string    `json:"first_name"`
	LastName             string    `json:"last_name"`
	Email                string    `json:"email"`
	Phone                string    `json:"phone"`
	Address              string    `json:"address"`
	City                 string    `json:"city"`
	State                string    `json:"state"`
	ZipCode              string    `json:"zip_code"`
	CreditScore          int       `json:"credit_score,omitempty"`
	SSNLast4             string    `json:"ssn_last4,omitempty"`
	DriversLicenseNumber string    `json:"drivers_license_number,omitempty"`
	MonthlyIncome        float64   `json:"monthly_income,omitempty"`
	CreatedAt            time.Time `json:"created_at"`
	UpdatedAt            time.Time `json:"updated_at"`
}

// CustomerPII holds the encrypted PII fields (internal use)
type CustomerPII struct {
	SSNLast4Encrypted             string
	DriversLicenseNumberEncrypted string
	CreditScoreEncrypted          string
	MonthlyIncomeEncrypted        string
	PIIEncryptionVersion          string
}

// Config holds application configuration
type Config struct {
	Port           string
	DatabaseURL    string
	EncryptionKey  string
	EncryptEnabled bool
}

// Server represents the Customer service server
type Server struct {
	router    *mux.Router
	config    *Config
	db        CustomerDatabase
	encryptor *encryption.FieldEncryptor
	logger    *logging.Logger
}

// NewServer creates a new Customer service server
func NewServer(config *Config, db CustomerDatabase, logger *logging.Logger) *Server {
	s := &Server{
		router: mux.NewRouter(),
		config: config,
		db:     db,
		logger: logger,
	}

	// Initialize encryption if enabled
	if config.EncryptEnabled {
		enc, err := encryption.NewFieldEncryptorFromEnv()
		if err != nil {
			logger.Warnf("PII encryption disabled - %v", err)
		} else {
			s.encryptor = enc
			logger.Info("PII encryption enabled")
		}
	}

	s.setupMiddleware()
	s.setupRoutes()
	return s
}

// setupMiddleware configures middleware
func (s *Server) setupMiddleware() {
	s.router.Use(logging.RequestIDMiddleware)
	s.router.Use(logging.RequestLoggingMiddleware(s.logger))
}

// setupRoutes configures all routes
func (s *Server) setupRoutes() {
	s.router.HandleFunc("/health", s.healthCheck).Methods("GET")
	s.router.HandleFunc("/customers", s.listCustomers).Methods("GET")
	s.router.HandleFunc("/customers", s.createCustomer).Methods("POST")
	s.router.HandleFunc("/customers/{id}", s.getCustomer).Methods("GET")
	s.router.HandleFunc("/customers/{id}", s.updateCustomer).Methods("PUT")
	s.router.HandleFunc("/customers/{id}", s.deleteCustomer).Methods("DELETE")
}

// healthCheck handler
func (s *Server) healthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "healthy",
		"service":   "customer-service",
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

// listCustomers returns all customers
func (s *Server) listCustomers(w http.ResponseWriter, r *http.Request) {
	// Optional dealership filter
	dealershipID := r.URL.Query().Get("dealership_id")

	customers, err := s.db.ListCustomers(dealershipID)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to list customers")
		http.Error(w, fmt.Sprintf("Failed to list customers: %v", err), http.StatusInternalServerError)
		return
	}

	if customers == nil {
		customers = []*Customer{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(customers)
}

// createCustomer creates a new customer
func (s *Server) createCustomer(w http.ResponseWriter, r *http.Request) {
	var req CreateCustomerRequest
	if !decodeAndValidate(r, w, &req) {
		return
	}

	// Map request to Customer
	customer := Customer{
		ID:                   uuid.New().String(),
		DealershipID:         req.DealershipID,
		FirstName:            req.FirstName,
		LastName:             req.LastName,
		Email:                req.Email,
		Phone:                req.Phone,
		Address:              req.Address,
		City:                 req.City,
		State:                req.State,
		ZipCode:              req.ZipCode,
		SSNLast4:             req.SSNLast4,
		DriversLicenseNumber: req.DriversLicenseNumber,
		CreditScore:          req.CreditScore,
		MonthlyIncome:        req.MonthlyIncome,
		CreatedAt:            time.Now(),
		UpdatedAt:            time.Now(),
	}

	// Save to database
	if err := s.db.CreateCustomer(&customer); err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to create customer")
		http.Error(w, fmt.Sprintf("Failed to create customer: %v", err), http.StatusInternalServerError)
		return
	}

	s.logger.WithContext(r.Context()).WithField("customer_id", customer.ID).Info("Customer created")

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(customer)
}

// getCustomer retrieves a specific customer
func (s *Server) getCustomer(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	customer, err := s.db.GetCustomer(id)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to get customer")
		http.Error(w, fmt.Sprintf("Failed to get customer: %v", err), http.StatusInternalServerError)
		return
	}

	if customer == nil {
		http.Error(w, "Customer not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(customer)
}

// updateCustomer updates a specific customer
func (s *Server) updateCustomer(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	if !validateUUID(w, id, "id") {
		return
	}

	var req UpdateCustomerRequest
	if !decodeAndValidate(r, w, &req) {
		return
	}

	// Get existing customer first
	existingCustomer, err := s.db.GetCustomer(id)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to get customer")
		http.Error(w, fmt.Sprintf("Failed to get customer: %v", err), http.StatusInternalServerError)
		return
	}
	if existingCustomer == nil {
		http.Error(w, "Customer not found", http.StatusNotFound)
		return
	}

	// Apply updates
	if req.FirstName != "" {
		existingCustomer.FirstName = req.FirstName
	}
	if req.LastName != "" {
		existingCustomer.LastName = req.LastName
	}
	if req.Email != "" {
		existingCustomer.Email = req.Email
	}
	if req.Phone != "" {
		existingCustomer.Phone = req.Phone
	}
	if req.Address != "" {
		existingCustomer.Address = req.Address
	}
	if req.City != "" {
		existingCustomer.City = req.City
	}
	if req.State != "" {
		existingCustomer.State = req.State
	}
	if req.ZipCode != "" {
		existingCustomer.ZipCode = req.ZipCode
	}
	if req.SSNLast4 != "" {
		existingCustomer.SSNLast4 = req.SSNLast4
	}
	if req.DriversLicenseNumber != "" {
		existingCustomer.DriversLicenseNumber = req.DriversLicenseNumber
	}
	if req.CreditScore != 0 {
		existingCustomer.CreditScore = req.CreditScore
	}
	if req.MonthlyIncome > 0 {
		existingCustomer.MonthlyIncome = req.MonthlyIncome
	}
	existingCustomer.UpdatedAt = time.Now()

	if err := s.db.UpdateCustomer(existingCustomer); err != nil {
		if err.Error() == fmt.Sprintf("customer not found: %s", id) {
			http.Error(w, "Customer not found", http.StatusNotFound)
		} else {
			s.logger.WithContext(r.Context()).WithError(err).Error("Failed to update customer")
			http.Error(w, fmt.Sprintf("Failed to update customer: %v", err), http.StatusInternalServerError)
		}
		return
	}

	s.logger.WithContext(r.Context()).WithField("customer_id", id).Info("Customer updated")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(existingCustomer)
}

// deleteCustomer deletes a specific customer
func (s *Server) deleteCustomer(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	if err := s.db.DeleteCustomer(id); err != nil {
		if err.Error() == fmt.Sprintf("customer not found: %s", id) {
			http.Error(w, "Customer not found", http.StatusNotFound)
		} else {
			s.logger.WithContext(r.Context()).WithError(err).Error("Failed to delete customer")
			http.Error(w, fmt.Sprintf("Failed to delete customer: %v", err), http.StatusInternalServerError)
		}
		return
	}

	s.logger.WithContext(r.Context()).WithField("customer_id", id).Info("Customer deleted")

	w.WriteHeader(http.StatusNoContent)
}

// Start starts the Customer service server
func (s *Server) Start() error {
	s.logger.Infof("Starting Customer Service on port %s", s.config.Port)
	return http.ListenAndServe(":"+s.config.Port, s.router)
}

func loadConfig() *Config {
	return &Config{
		Port:           getEnv("PORT", "8082"),
		DatabaseURL:    getEnv("DATABASE_URL", "postgresql://localhost:5432/autolytiq"),
		EncryptionKey:  os.Getenv("PII_ENCRYPTION_KEY"),
		EncryptEnabled: os.Getenv("PII_ENCRYPTION_KEY") != "",
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func main() {
	// Initialize logger
	logger := logging.New(logging.Config{
		Service: "customer-service",
	})

	config := loadConfig()

	// Connect to database
	db, err := NewDatabase(config.DatabaseURL, logger)
	if err != nil {
		logger.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Initialize encryption if enabled
	if config.EncryptEnabled {
		enc, err := encryption.NewFieldEncryptorFromEnv()
		if err != nil {
			logger.Warnf("PII encryption disabled - %v", err)
		} else {
			db.SetEncryptor(enc)
			logger.Info("PII encryption enabled for database operations")
		}
	}

	// Initialize schema
	if err := db.InitSchema(); err != nil {
		logger.Fatalf("Failed to initialize schema: %v", err)
	}

	// Create and start server
	server := NewServer(config, db, logger)
	if err := server.Start(); err != nil {
		logger.Fatal(err.Error())
	}
}
