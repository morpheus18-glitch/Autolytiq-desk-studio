package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// Customer represents a customer entity
type Customer struct {
	ID           string    `json:"id"`
	DealershipID string    `json:"dealership_id"`
	FirstName    string    `json:"first_name"`
	LastName     string    `json:"last_name"`
	Email        string    `json:"email"`
	Phone        string    `json:"phone"`
	Address      string    `json:"address"`
	City         string    `json:"city"`
	State        string    `json:"state"`
	ZipCode      string    `json:"zip_code"`
	CreditScore  int       `json:"credit_score"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// Config holds application configuration
type Config struct {
	Port        string
	DatabaseURL string
}

// Server represents the Customer service server
type Server struct {
	router    *mux.Router
	config    *Config
	customers map[string]*Customer // In-memory storage for now
}

// NewServer creates a new Customer service server
func NewServer(config *Config) *Server {
	s := &Server{
		router:    mux.NewRouter(),
		config:    config,
		customers: make(map[string]*Customer),
	}

	s.setupRoutes()
	return s
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
	customers := make([]*Customer, 0, len(s.customers))
	for _, customer := range s.customers {
		customers = append(customers, customer)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(customers)
}

// createCustomer creates a new customer
func (s *Server) createCustomer(w http.ResponseWriter, r *http.Request) {
	var customer Customer
	if err := json.NewDecoder(r.Body).Decode(&customer); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	customer.ID = uuid.New().String()
	customer.CreatedAt = time.Now()
	customer.UpdatedAt = time.Now()

	s.customers[customer.ID] = &customer

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(customer)
}

// getCustomer retrieves a specific customer
func (s *Server) getCustomer(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	customer, exists := s.customers[id]
	if !exists {
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

	_, exists := s.customers[id]
	if !exists {
		http.Error(w, "Customer not found", http.StatusNotFound)
		return
	}

	var updatedCustomer Customer
	if err := json.NewDecoder(r.Body).Decode(&updatedCustomer); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	updatedCustomer.ID = id
	updatedCustomer.UpdatedAt = time.Now()
	s.customers[id] = &updatedCustomer

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updatedCustomer)
}

// deleteCustomer deletes a specific customer
func (s *Server) deleteCustomer(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	_, exists := s.customers[id]
	if !exists {
		http.Error(w, "Customer not found", http.StatusNotFound)
		return
	}

	delete(s.customers, id)

	w.WriteHeader(http.StatusNoContent)
}

// Start starts the Customer service server
func (s *Server) Start() error {
	log.Printf("Starting Customer Service on port %s", s.config.Port)
	return http.ListenAndServe(":"+s.config.Port, s.router)
}

func loadConfig() *Config {
	return &Config{
		Port:        getEnv("PORT", "8082"),
		DatabaseURL: getEnv("DATABASE_URL", "postgresql://localhost:5432/autolytiq"),
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
