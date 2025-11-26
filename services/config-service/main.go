package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"autolytiq/shared/logging"

	"github.com/gorilla/mux"
)

// Server wraps the config database and HTTP router
type Server struct {
	db     ConfigDatabase
	router *mux.Router
	logger *logging.Logger
}

// NewServer creates a new config service server
func NewServer(db ConfigDatabase, logger *logging.Logger) *Server {
	s := &Server{
		db:     db,
		router: mux.NewRouter(),
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

// setupRoutes configures all HTTP routes
func (s *Server) setupRoutes() {
	// Health check
	s.router.HandleFunc("/health", s.handleHealth).Methods("GET")

	// Configuration settings
	s.router.HandleFunc("/config/settings", s.handleGetAllSettings).Methods("GET")
	s.router.HandleFunc("/config/settings/{key}", s.handleGetSetting).Methods("GET")
	s.router.HandleFunc("/config/settings/{key}", s.handleSetSetting).Methods("PUT")
	s.router.HandleFunc("/config/settings/{key}", s.handleDeleteSetting).Methods("DELETE")
	s.router.HandleFunc("/config/categories/{category}", s.handleGetCategory).Methods("GET")

	// Feature flags
	s.router.HandleFunc("/config/features", s.handleCreateFeatureFlag).Methods("POST")
	s.router.HandleFunc("/config/features", s.handleListFeatureFlags).Methods("GET")
	s.router.HandleFunc("/config/features/{key}", s.handleGetFeatureFlag).Methods("GET")
	s.router.HandleFunc("/config/features/{key}", s.handleUpdateFeatureFlag).Methods("PUT")
	s.router.HandleFunc("/config/features/{key}", s.handleDeleteFeatureFlag).Methods("DELETE")
	s.router.HandleFunc("/config/features/{key}/evaluate", s.handleEvaluateFeatureFlag).Methods("POST")

	// Integrations
	s.router.HandleFunc("/config/integrations", s.handleCreateIntegration).Methods("POST")
	s.router.HandleFunc("/config/integrations", s.handleListIntegrations).Methods("GET")
	s.router.HandleFunc("/config/integrations/{id}", s.handleGetIntegration).Methods("GET")
	s.router.HandleFunc("/config/integrations/{id}", s.handleUpdateIntegration).Methods("PUT")
	s.router.HandleFunc("/config/integrations/{id}", s.handleDeleteIntegration).Methods("DELETE")
}

// handleHealth returns service health status
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]string{"status": "healthy"})
}

// handleGetAllSettings retrieves all settings for a dealership
func (s *Server) handleGetAllSettings(w http.ResponseWriter, r *http.Request) {
	dealershipID := r.Header.Get("X-Dealership-ID")
	if dealershipID == "" {
		respondError(w, http.StatusBadRequest, "X-Dealership-ID header required")
		return
	}

	// Get all categories
	categories := []string{"dealership", "sales", "financing", "notifications", "ui"}
	allSettings := make(map[string][]DealershipConfig)

	for _, category := range categories {
		configs, err := s.db.GetConfigsByCategory(dealershipID, category)
		if err != nil {
			s.logger.WithContext(r.Context()).WithError(err).Error("Failed to get configs by category")
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if len(configs) > 0 {
			allSettings[category] = configs
		}
	}

	respondJSON(w, http.StatusOK, allSettings)
}

// handleGetSetting retrieves a specific setting
func (s *Server) handleGetSetting(w http.ResponseWriter, r *http.Request) {
	dealershipID := r.Header.Get("X-Dealership-ID")
	if dealershipID == "" {
		respondError(w, http.StatusBadRequest, "X-Dealership-ID header required")
		return
	}

	vars := mux.Vars(r)
	key := vars["key"]

	config, err := s.db.GetConfig(dealershipID, key)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to get config")
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if config == nil {
		respondError(w, http.StatusNotFound, "config not found")
		return
	}

	respondJSON(w, http.StatusOK, config)
}

// SetSettingRequest represents a request to set a configuration value
type SetSettingRequest struct {
	Value       string `json:"value"`
	Type        string `json:"type"`
	Category    string `json:"category"`
	Description string `json:"description"`
}

// handleSetSetting creates or updates a setting
func (s *Server) handleSetSetting(w http.ResponseWriter, r *http.Request) {
	dealershipID := r.Header.Get("X-Dealership-ID")
	if dealershipID == "" {
		respondError(w, http.StatusBadRequest, "X-Dealership-ID header required")
		return
	}

	vars := mux.Vars(r)
	key := vars["key"]

	var req SetSettingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Validate config type
	validTypes := map[string]bool{"string": true, "integer": true, "boolean": true, "json": true}
	if !validTypes[req.Type] {
		respondError(w, http.StatusBadRequest, "invalid config type")
		return
	}

	// Validate category
	validCategories := map[string]bool{"dealership": true, "sales": true, "financing": true, "notifications": true, "ui": true}
	if !validCategories[req.Category] {
		respondError(w, http.StatusBadRequest, "invalid category")
		return
	}

	err := s.db.SetConfig(dealershipID, key, req.Value, req.Type, req.Category, req.Description)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to set config")
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	config, err := s.db.GetConfig(dealershipID, key)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to get config")
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	s.logger.WithContext(r.Context()).WithField("key", key).Info("Config setting updated")
	respondJSON(w, http.StatusOK, config)
}

// handleDeleteSetting deletes a setting
func (s *Server) handleDeleteSetting(w http.ResponseWriter, r *http.Request) {
	dealershipID := r.Header.Get("X-Dealership-ID")
	if dealershipID == "" {
		respondError(w, http.StatusBadRequest, "X-Dealership-ID header required")
		return
	}

	vars := mux.Vars(r)
	key := vars["key"]

	err := s.db.DeleteConfig(dealershipID, key)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to delete config")
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	s.logger.WithContext(r.Context()).WithField("key", key).Info("Config setting deleted")
	respondJSON(w, http.StatusOK, map[string]string{"message": "config deleted"})
}

// handleGetCategory retrieves all settings in a category
func (s *Server) handleGetCategory(w http.ResponseWriter, r *http.Request) {
	dealershipID := r.Header.Get("X-Dealership-ID")
	if dealershipID == "" {
		respondError(w, http.StatusBadRequest, "X-Dealership-ID header required")
		return
	}

	vars := mux.Vars(r)
	category := vars["category"]

	// Validate category
	validCategories := map[string]bool{"dealership": true, "sales": true, "financing": true, "notifications": true, "ui": true}
	if !validCategories[category] {
		respondError(w, http.StatusBadRequest, "invalid category")
		return
	}

	configs, err := s.db.GetConfigsByCategory(dealershipID, category)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to get category configs")
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, configs)
}

// CreateFeatureFlagRequest represents a request to create a feature flag
type CreateFeatureFlagRequest struct {
	FlagKey           string          `json:"flag_key"`
	Enabled           bool            `json:"enabled"`
	RolloutPercentage int             `json:"rollout_percentage"`
	ConstraintsJSON   json.RawMessage `json:"constraints_json"`
	Description       string          `json:"description"`
}

// handleCreateFeatureFlag creates a new feature flag
func (s *Server) handleCreateFeatureFlag(w http.ResponseWriter, r *http.Request) {
	var req CreateFeatureFlagRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.RolloutPercentage < 0 || req.RolloutPercentage > 100 {
		respondError(w, http.StatusBadRequest, "rollout_percentage must be between 0 and 100")
		return
	}

	flag, err := s.db.CreateFeatureFlag(req.FlagKey, req.Enabled, req.RolloutPercentage, req.ConstraintsJSON, req.Description)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to create feature flag")
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	s.logger.WithContext(r.Context()).WithField("flag_key", req.FlagKey).Info("Feature flag created")
	respondJSON(w, http.StatusCreated, flag)
}

// handleListFeatureFlags lists all feature flags
func (s *Server) handleListFeatureFlags(w http.ResponseWriter, r *http.Request) {
	flags, err := s.db.ListFeatureFlags()
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to list feature flags")
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, flags)
}

// handleGetFeatureFlag retrieves a specific feature flag
func (s *Server) handleGetFeatureFlag(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	key := vars["key"]

	flag, err := s.db.GetFeatureFlag(key)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to get feature flag")
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if flag == nil {
		respondError(w, http.StatusNotFound, "feature flag not found")
		return
	}

	respondJSON(w, http.StatusOK, flag)
}

// UpdateFeatureFlagRequest represents a request to update a feature flag
type UpdateFeatureFlagRequest struct {
	Enabled           bool            `json:"enabled"`
	RolloutPercentage int             `json:"rollout_percentage"`
	ConstraintsJSON   json.RawMessage `json:"constraints_json"`
	Description       string          `json:"description"`
}

// handleUpdateFeatureFlag updates an existing feature flag
func (s *Server) handleUpdateFeatureFlag(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	key := vars["key"]

	var req UpdateFeatureFlagRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.RolloutPercentage < 0 || req.RolloutPercentage > 100 {
		respondError(w, http.StatusBadRequest, "rollout_percentage must be between 0 and 100")
		return
	}

	flag, err := s.db.UpdateFeatureFlag(key, req.Enabled, req.RolloutPercentage, req.ConstraintsJSON, req.Description)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to update feature flag")
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	s.logger.WithContext(r.Context()).WithField("flag_key", key).Info("Feature flag updated")
	respondJSON(w, http.StatusOK, flag)
}

// handleDeleteFeatureFlag deletes a feature flag
func (s *Server) handleDeleteFeatureFlag(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	key := vars["key"]

	err := s.db.DeleteFeatureFlag(key)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to delete feature flag")
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	s.logger.WithContext(r.Context()).WithField("flag_key", key).Info("Feature flag deleted")
	respondJSON(w, http.StatusOK, map[string]string{"message": "feature flag deleted"})
}

// EvaluateFeatureFlagRequest represents a request to evaluate a feature flag
type EvaluateFeatureFlagRequest struct {
	DealershipID string `json:"dealership_id"`
}

// handleEvaluateFeatureFlag evaluates if a feature flag is enabled for a dealership
func (s *Server) handleEvaluateFeatureFlag(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	key := vars["key"]

	var req EvaluateFeatureFlagRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	enabled, err := s.db.EvaluateFeatureFlag(key, req.DealershipID)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to evaluate feature flag")
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]bool{"enabled": enabled})
}

// CreateIntegrationRequest represents a request to create an integration
type CreateIntegrationRequest struct {
	DealershipID string          `json:"dealership_id"`
	Provider     string          `json:"provider"`
	ConfigJSON   json.RawMessage `json:"config_json"`
	Status       string          `json:"status"`
}

// handleCreateIntegration creates a new integration
func (s *Server) handleCreateIntegration(w http.ResponseWriter, r *http.Request) {
	var req CreateIntegrationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Validate provider
	validProviders := map[string]bool{"credit_bureau": true, "inventory_feed": true, "accounting": true, "crm": true}
	if !validProviders[req.Provider] {
		respondError(w, http.StatusBadRequest, "invalid provider")
		return
	}

	// Validate status
	validStatuses := map[string]bool{"active": true, "inactive": true, "error": true}
	if !validStatuses[req.Status] {
		respondError(w, http.StatusBadRequest, "invalid status")
		return
	}

	integration, err := s.db.CreateIntegration(req.DealershipID, req.Provider, req.ConfigJSON, req.Status)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to create integration")
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	s.logger.WithContext(r.Context()).WithField("integration_id", integration.ID).Info("Integration created")
	respondJSON(w, http.StatusCreated, integration)
}

// handleListIntegrations lists all integrations for a dealership
func (s *Server) handleListIntegrations(w http.ResponseWriter, r *http.Request) {
	dealershipID := r.Header.Get("X-Dealership-ID")
	if dealershipID == "" {
		respondError(w, http.StatusBadRequest, "X-Dealership-ID header required")
		return
	}

	integrations, err := s.db.ListIntegrations(dealershipID)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to list integrations")
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, integrations)
}

// handleGetIntegration retrieves a specific integration
func (s *Server) handleGetIntegration(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	integration, err := s.db.GetIntegration(id)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to get integration")
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if integration == nil {
		respondError(w, http.StatusNotFound, "integration not found")
		return
	}

	respondJSON(w, http.StatusOK, integration)
}

// UpdateIntegrationRequest represents a request to update an integration
type UpdateIntegrationRequest struct {
	ConfigJSON json.RawMessage `json:"config_json"`
	Status     string          `json:"status"`
	LastSync   *time.Time      `json:"last_sync"`
}

// handleUpdateIntegration updates an existing integration
func (s *Server) handleUpdateIntegration(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var req UpdateIntegrationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Validate status
	validStatuses := map[string]bool{"active": true, "inactive": true, "error": true}
	if !validStatuses[req.Status] {
		respondError(w, http.StatusBadRequest, "invalid status")
		return
	}

	integration, err := s.db.UpdateIntegration(id, req.ConfigJSON, req.Status, req.LastSync)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to update integration")
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	s.logger.WithContext(r.Context()).WithField("integration_id", id).Info("Integration updated")
	respondJSON(w, http.StatusOK, integration)
}

// handleDeleteIntegration deletes an integration
func (s *Server) handleDeleteIntegration(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	err := s.db.DeleteIntegration(id)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to delete integration")
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	s.logger.WithContext(r.Context()).WithField("integration_id", id).Info("Integration deleted")
	respondJSON(w, http.StatusOK, map[string]string{"message": "integration deleted"})
}

// respondJSON sends a JSON response
func respondJSON(w http.ResponseWriter, status int, payload interface{}) {
	response, err := json.Marshal(payload)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(err.Error()))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	w.Write(response)
}

// respondError sends an error response
func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}

func main() {
	// Initialize logger
	logger := logging.New(logging.Config{
		Service: "config-service",
	})

	// Get database connection string from environment
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = "postgres://postgres:postgres@localhost:5432/autolytiq_config?sslmode=disable"
	}

	// Connect to database
	db, err := NewPostgresConfigDB(connStr)
	if err != nil {
		logger.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Initialize schema
	if err := db.InitSchema(); err != nil {
		logger.Fatalf("Failed to initialize schema: %v", err)
	}

	// Create and start server
	server := NewServer(db, logger)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8083"
	}

	addr := fmt.Sprintf(":%s", port)
	logger.Infof("Config service listening on %s", addr)

	if err := http.ListenAndServe(addr, server.router); err != nil {
		logger.Fatal(err.Error())
	}
}
