package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

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
}

// NewServer creates a new Inventory service server
func NewServer(config *Config, db VehicleDatabase) *Server {
	s := &Server{
		router: mux.NewRouter(),
		config: config,
		db:     db,
	}

	s.setupRoutes()
	return s
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
	var vehicle Vehicle
	if err := json.NewDecoder(r.Body).Decode(&vehicle); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	// Validate required fields
	if vehicle.Make == "" || vehicle.Model == "" || vehicle.Year == 0 || vehicle.Price == 0 {
		http.Error(w, "Missing required fields: make, model, year, and price are required", http.StatusBadRequest)
		return
	}

	// Validate VIN if provided
	if vehicle.VIN != "" {
		valid, err := s.db.ValidateVIN(vehicle.VIN)
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to validate VIN: %v", err), http.StatusInternalServerError)
			return
		}
		if !valid {
			http.Error(w, "Invalid VIN format", http.StatusBadRequest)
			return
		}
	}

	// Set defaults
	vehicle.ID = uuid.New().String()
	vehicle.CreatedAt = time.Now().Format(time.RFC3339)
	vehicle.UpdatedAt = time.Now().Format(time.RFC3339)
	if vehicle.Condition == "" {
		vehicle.Condition = "used"
	}
	if vehicle.Status == "" {
		vehicle.Status = "available"
	}
	if vehicle.Mileage == 0 {
		vehicle.Mileage = 0
	}

	// Save to database
	if err := s.db.CreateVehicle(&vehicle); err != nil {
		http.Error(w, fmt.Sprintf("Failed to create vehicle: %v", err), http.StatusInternalServerError)
		return
	}

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

	var updatedVehicle Vehicle
	if err := json.NewDecoder(r.Body).Decode(&updatedVehicle); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	// Validate VIN if provided
	if updatedVehicle.VIN != "" {
		valid, err := s.db.ValidateVIN(updatedVehicle.VIN)
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to validate VIN: %v", err), http.StatusInternalServerError)
			return
		}
		if !valid {
			http.Error(w, "Invalid VIN format", http.StatusBadRequest)
			return
		}
	}

	updatedVehicle.ID = id
	updatedVehicle.UpdatedAt = time.Now().Format(time.RFC3339)

	if err := s.db.UpdateVehicle(&updatedVehicle); err != nil {
		if err.Error() == fmt.Sprintf("vehicle not found: %s", id) {
			http.Error(w, "Vehicle not found", http.StatusNotFound)
		} else {
			http.Error(w, fmt.Sprintf("Failed to update vehicle: %v", err), http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updatedVehicle)
}

// deleteVehicle deletes a specific vehicle
func (s *Server) deleteVehicle(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	if err := s.db.DeleteVehicle(id); err != nil {
		if err.Error() == fmt.Sprintf("vehicle not found: %s", id) {
			http.Error(w, "Vehicle not found", http.StatusNotFound)
		} else {
			http.Error(w, fmt.Sprintf("Failed to delete vehicle: %v", err), http.StatusInternalServerError)
		}
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// validateVIN validates a VIN
func (s *Server) validateVIN(w http.ResponseWriter, r *http.Request) {
	var request struct {
		VIN string `json:"vin"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	if request.VIN == "" {
		http.Error(w, "VIN is required", http.StatusBadRequest)
		return
	}

	valid, err := s.db.ValidateVIN(request.VIN)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to validate VIN: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"vin":   request.VIN,
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
		http.Error(w, fmt.Sprintf("Failed to get inventory stats: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// Start starts the Inventory service server
func (s *Server) Start() error {
	log.Printf("Starting Inventory Service on port %s", s.config.Port)
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
	config := loadConfig()

	// Connect to database
	db, err := NewDatabase(config.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Initialize schema
	if err := db.InitSchema(); err != nil {
		log.Fatalf("Failed to initialize schema: %v", err)
	}

	// Create and start server
	server := NewServer(config, db)
	log.Fatal(server.Start())
}
