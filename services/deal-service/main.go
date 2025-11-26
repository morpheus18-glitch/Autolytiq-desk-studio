package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"autolytiq/shared/logging"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// Deal represents a vehicle deal
type Deal struct {
	ID            string    `json:"id"`
	DealershipID  string    `json:"dealership_id"`
	CustomerID    string    `json:"customer_id"`
	VehiclePrice  float64   `json:"vehicle_price"`
	TradeInValue  float64   `json:"trade_in_value"`
	TradeInPayoff float64   `json:"trade_in_payoff"`
	DownPayment   float64   `json:"down_payment"`
	TaxAmount     float64   `json:"tax_amount"`
	TotalAmount   float64   `json:"total_amount"`
	Status        string    `json:"status"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// Config holds application configuration
type Config struct {
	Port        string
	DatabaseURL string
}

// Server represents the Deal service server
type Server struct {
	router *mux.Router
	config *Config
	db     DealDatabase
	logger *logging.Logger
}

// NewServer creates a new Deal service server
func NewServer(config *Config, db DealDatabase, logger *logging.Logger) *Server {
	s := &Server{
		router: mux.NewRouter(),
		config: config,
		db:     db,
		logger: logger,
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
	s.router.HandleFunc("/deals", s.listDeals).Methods("GET")
	s.router.HandleFunc("/deals", s.createDeal).Methods("POST")
	s.router.HandleFunc("/deals/{id}", s.getDeal).Methods("GET")
	s.router.HandleFunc("/deals/{id}", s.updateDeal).Methods("PUT")
	s.router.HandleFunc("/deals/{id}", s.deleteDeal).Methods("DELETE")
}

// healthCheck handler
func (s *Server) healthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "healthy",
		"service":   "deal-service",
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

// listDeals returns all deals
func (s *Server) listDeals(w http.ResponseWriter, r *http.Request) {
	// Optional dealership filter
	dealershipID := r.URL.Query().Get("dealership_id")

	deals, err := s.db.ListDeals(dealershipID)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to list deals")
		http.Error(w, fmt.Sprintf("Failed to list deals: %v", err), http.StatusInternalServerError)
		return
	}

	if deals == nil {
		deals = []*Deal{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(deals)
}

// createDeal creates a new deal
func (s *Server) createDeal(w http.ResponseWriter, r *http.Request) {
	var req CreateDealRequest
	if !decodeAndValidate(r, w, &req) {
		return
	}

	// Map request to Deal
	deal := Deal{
		ID:            uuid.New().String(),
		DealershipID:  req.DealershipID,
		CustomerID:    req.CustomerID,
		VehiclePrice:  req.VehiclePrice,
		TradeInValue:  req.TradeInValue,
		TradeInPayoff: req.TradeInPayoff,
		DownPayment:   req.DownPayment,
		TaxAmount:     req.TaxAmount,
		Status:        req.Status,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if deal.Status == "" {
		deal.Status = "draft"
	}

	// Save to database
	if err := s.db.CreateDeal(&deal); err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to create deal")
		http.Error(w, fmt.Sprintf("Failed to create deal: %v", err), http.StatusInternalServerError)
		return
	}

	s.logger.WithContext(r.Context()).WithField("deal_id", deal.ID).Info("Deal created")

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(deal)
}

// getDeal retrieves a specific deal
func (s *Server) getDeal(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	deal, err := s.db.GetDeal(id)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to get deal")
		http.Error(w, fmt.Sprintf("Failed to get deal: %v", err), http.StatusInternalServerError)
		return
	}

	if deal == nil {
		http.Error(w, "Deal not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(deal)
}

// updateDeal updates a specific deal
func (s *Server) updateDeal(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	if !validateUUID(w, id, "id") {
		return
	}

	var req UpdateDealRequest
	if !decodeAndValidate(r, w, &req) {
		return
	}

	// Get existing deal first
	existingDeal, err := s.db.GetDeal(id)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to get deal")
		http.Error(w, fmt.Sprintf("Failed to get deal: %v", err), http.StatusInternalServerError)
		return
	}
	if existingDeal == nil {
		http.Error(w, "Deal not found", http.StatusNotFound)
		return
	}

	// Apply updates
	if req.CustomerID != "" {
		existingDeal.CustomerID = req.CustomerID
	}
	if req.VehiclePrice > 0 {
		existingDeal.VehiclePrice = req.VehiclePrice
	}
	if req.TradeInValue > 0 {
		existingDeal.TradeInValue = req.TradeInValue
	}
	if req.TradeInPayoff > 0 {
		existingDeal.TradeInPayoff = req.TradeInPayoff
	}
	if req.DownPayment > 0 {
		existingDeal.DownPayment = req.DownPayment
	}
	if req.TaxAmount > 0 {
		existingDeal.TaxAmount = req.TaxAmount
	}
	if req.Status != "" {
		existingDeal.Status = req.Status
	}
	existingDeal.UpdatedAt = time.Now()

	if err := s.db.UpdateDeal(existingDeal); err != nil {
		if err.Error() == fmt.Sprintf("deal not found: %s", id) {
			http.Error(w, "Deal not found", http.StatusNotFound)
		} else {
			s.logger.WithContext(r.Context()).WithError(err).Error("Failed to update deal")
			http.Error(w, fmt.Sprintf("Failed to update deal: %v", err), http.StatusInternalServerError)
		}
		return
	}

	s.logger.WithContext(r.Context()).WithField("deal_id", id).Info("Deal updated")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(existingDeal)
}

// deleteDeal deletes a specific deal
func (s *Server) deleteDeal(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	if err := s.db.DeleteDeal(id); err != nil {
		if err.Error() == fmt.Sprintf("deal not found: %s", id) {
			http.Error(w, "Deal not found", http.StatusNotFound)
		} else {
			s.logger.WithContext(r.Context()).WithError(err).Error("Failed to delete deal")
			http.Error(w, fmt.Sprintf("Failed to delete deal: %v", err), http.StatusInternalServerError)
		}
		return
	}

	s.logger.WithContext(r.Context()).WithField("deal_id", id).Info("Deal deleted")

	w.WriteHeader(http.StatusNoContent)
}

// Start starts the Deal service server
func (s *Server) Start() error {
	s.logger.Infof("Starting Deal Service on port %s", s.config.Port)
	return http.ListenAndServe(":"+s.config.Port, s.router)
}

func loadConfig() *Config {
	return &Config{
		Port:        getEnv("PORT", "8081"),
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
	// Initialize logger
	logger := logging.New(logging.Config{
		Service: "deal-service",
	})

	config := loadConfig()

	// Connect to database
	db, err := NewDatabase(config.DatabaseURL, logger)
	if err != nil {
		logger.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

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
