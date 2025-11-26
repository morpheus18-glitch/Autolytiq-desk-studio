package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"time"

	"autolytiq/shared/logging"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// Config holds application configuration
type Config struct {
	Port        string
	DatabaseURL string
}

// Server represents the Inventory service server
type Server struct {
	router *mux.Router
	config *Config
	db     VehicleDatabase
	logger *logging.Logger
}

// NewServer creates a new Inventory service server
func NewServer(config *Config, db VehicleDatabase, logger *logging.Logger) *Server {
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
	s.router.HandleFunc("/vehicles", s.listVehicles).Methods("GET")
	s.router.HandleFunc("/vehicles", s.createVehicle).Methods("POST")
	s.router.HandleFunc("/vehicles/stats", s.getInventoryStats).Methods("GET")
	s.router.HandleFunc("/vehicles/validate-vin", s.validateVIN).Methods("POST")
	s.router.HandleFunc("/vehicles/{id}", s.getVehicle).Methods("GET")
	s.router.HandleFunc("/vehicles/{id}", s.updateVehicle).Methods("PUT")
	s.router.HandleFunc("/vehicles/{id}", s.deleteVehicle).Methods("DELETE")
}

// healthCheck handler
func (s *Server) healthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "healthy",
		"service":   "inventory-service",
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

// listVehicles returns all vehicles with optional filters
func (s *Server) listVehicles(w http.ResponseWriter, r *http.Request) {
	// Optional dealership filter
	dealershipID := r.URL.Query().Get("dealership_id")

	// Build filters map from query parameters
	filters := make(map[string]interface{})

	if make := r.URL.Query().Get("make"); make != "" {
		filters["make"] = make
	}

	if model := r.URL.Query().Get("model"); model != "" {
		filters["model"] = model
	}

	if yearStr := r.URL.Query().Get("year"); yearStr != "" {
		if year, err := strconv.Atoi(yearStr); err == nil {
			filters["year"] = year
		}
	}

	if condition := r.URL.Query().Get("condition"); condition != "" {
		filters["condition"] = condition
	}

	if status := r.URL.Query().Get("status"); status != "" {
		filters["status"] = status
	}

	if priceMinStr := r.URL.Query().Get("price_min"); priceMinStr != "" {
		if priceMin, err := strconv.ParseFloat(priceMinStr, 64); err == nil {
			filters["price_min"] = priceMin
		}
	}

	if priceMaxStr := r.URL.Query().Get("price_max"); priceMaxStr != "" {
		if priceMax, err := strconv.ParseFloat(priceMaxStr, 64); err == nil {
			filters["price_max"] = priceMax
		}
	}

	vehicles, err := s.db.ListVehicles(dealershipID, filters)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to list vehicles")
		http.Error(w, fmt.Sprintf("Failed to list vehicles: %v", err), http.StatusInternalServerError)
		return
	}

	if vehicles == nil {
		vehicles = []*Vehicle{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(vehicles)
}

// createVehicle creates a new vehicle
func (s *Server) createVehicle(w http.ResponseWriter, r *http.Request) {
	var req CreateVehicleRequest
	if !decodeAndValidate(r, w, &req) {
		return
	}

	// Map request to Vehicle
	vehicle := Vehicle{
		ID:           uuid.New().String(),
		DealershipID: req.DealershipID,
		VIN:          req.VIN,
		Make:         req.Make,
		Model:        req.Model,
		Year:         req.Year,
		Condition:    req.Condition,
		Status:       req.Status,
		Price:        req.Price,
		Mileage:      req.Mileage,
		Color:        req.Color,
		Description:  req.Description,
		StockNumber:  req.StockNumber,
		CreatedAt:    time.Now().Format(time.RFC3339),
		UpdatedAt:    time.Now().Format(time.RFC3339),
	}

	// Set defaults
	if vehicle.Condition == "" {
		vehicle.Condition = "used"
	}
	if vehicle.Status == "" {
		vehicle.Status = "available"
	}

	// Save to database
	if err := s.db.CreateVehicle(&vehicle); err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to create vehicle")
		http.Error(w, fmt.Sprintf("Failed to create vehicle: %v", err), http.StatusInternalServerError)
		return
	}

	s.logger.WithContext(r.Context()).WithField("vehicle_id", vehicle.ID).Info("Vehicle created")

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(vehicle)
}

// getVehicle retrieves a specific vehicle
func (s *Server) getVehicle(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	vehicle, err := s.db.GetVehicle(id)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to get vehicle")
		http.Error(w, fmt.Sprintf("Failed to get vehicle: %v", err), http.StatusInternalServerError)
		return
	}

	if vehicle == nil {
		http.Error(w, "Vehicle not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(vehicle)
}

// updateVehicle updates a specific vehicle
func (s *Server) updateVehicle(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	if !validateUUID(w, id, "id") {
		return
	}

	var req UpdateVehicleRequest
	if !decodeAndValidate(r, w, &req) {
		return
	}

	// Get existing vehicle first
	existingVehicle, err := s.db.GetVehicle(id)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to get vehicle")
		http.Error(w, fmt.Sprintf("Failed to get vehicle: %v", err), http.StatusInternalServerError)
		return
	}
	if existingVehicle == nil {
		http.Error(w, "Vehicle not found", http.StatusNotFound)
		return
	}

	// Apply updates
	if req.VIN != "" {
		existingVehicle.VIN = req.VIN
	}
	if req.Make != "" {
		existingVehicle.Make = req.Make
	}
	if req.Model != "" {
		existingVehicle.Model = req.Model
	}
	if req.Year != 0 {
		existingVehicle.Year = req.Year
	}
	if req.Condition != "" {
		existingVehicle.Condition = req.Condition
	}
	if req.Status != "" {
		existingVehicle.Status = req.Status
	}
	if req.Price > 0 {
		existingVehicle.Price = req.Price
	}
	if req.Mileage > 0 {
		existingVehicle.Mileage = req.Mileage
	}
	if req.Color != "" {
		existingVehicle.Color = req.Color
	}
	if req.Description != "" {
		existingVehicle.Description = req.Description
	}
	if req.StockNumber != "" {
		existingVehicle.StockNumber = req.StockNumber
	}
	existingVehicle.UpdatedAt = time.Now().Format(time.RFC3339)

	if err := s.db.UpdateVehicle(existingVehicle); err != nil {
		if err.Error() == fmt.Sprintf("vehicle not found: %s", id) {
			http.Error(w, "Vehicle not found", http.StatusNotFound)
		} else {
			s.logger.WithContext(r.Context()).WithError(err).Error("Failed to update vehicle")
			http.Error(w, fmt.Sprintf("Failed to update vehicle: %v", err), http.StatusInternalServerError)
		}
		return
	}

	s.logger.WithContext(r.Context()).WithField("vehicle_id", id).Info("Vehicle updated")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(existingVehicle)
}

// deleteVehicle deletes a specific vehicle
func (s *Server) deleteVehicle(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	if err := s.db.DeleteVehicle(id); err != nil {
		if err.Error() == fmt.Sprintf("vehicle not found: %s", id) {
			http.Error(w, "Vehicle not found", http.StatusNotFound)
		} else {
			s.logger.WithContext(r.Context()).WithError(err).Error("Failed to delete vehicle")
			http.Error(w, fmt.Sprintf("Failed to delete vehicle: %v", err), http.StatusInternalServerError)
		}
		return
	}

	s.logger.WithContext(r.Context()).WithField("vehicle_id", id).Info("Vehicle deleted")

	w.WriteHeader(http.StatusNoContent)
}

// validateVIN validates a VIN
func (s *Server) validateVIN(w http.ResponseWriter, r *http.Request) {
	var req ValidateVINRequest
	if !decodeAndValidate(r, w, &req) {
		return
	}

	valid, err := s.db.ValidateVIN(req.VIN)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to validate VIN")
		http.Error(w, fmt.Sprintf("Failed to validate VIN: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"vin":   req.VIN,
		"valid": valid,
	})
}

// getInventoryStats retrieves inventory statistics
func (s *Server) getInventoryStats(w http.ResponseWriter, r *http.Request) {
	// Required dealership filter
	dealershipID := r.URL.Query().Get("dealership_id")
	if dealershipID == "" {
		http.Error(w, "dealership_id query parameter is required", http.StatusBadRequest)
		return
	}

	stats, err := s.db.GetInventoryStats(dealershipID)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to get inventory stats")
		http.Error(w, fmt.Sprintf("Failed to get inventory stats: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// Start starts the Inventory service server
func (s *Server) Start() error {
	s.logger.Infof("Starting Inventory Service on port %s", s.config.Port)
	return http.ListenAndServe(":"+s.config.Port, s.router)
}

func loadConfig() *Config {
	return &Config{
		Port:        getEnv("PORT", "8083"),
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
		Service: "inventory-service",
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
