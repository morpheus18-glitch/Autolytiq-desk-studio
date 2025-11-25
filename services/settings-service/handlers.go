package main

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
)

// Server represents the settings service server
type Server struct {
	db     SettingsDatabase
	router *mux.Router
}

// NewServer creates a new settings server
func NewServer(db SettingsDatabase) *Server {
	s := &Server{
		db:     db,
		router: mux.NewRouter(),
	}
	s.setupRoutes()
	return s
}

// setupRoutes configures all HTTP routes
func (s *Server) setupRoutes() {
	// Health check
	s.router.HandleFunc("/health", s.handleHealth).Methods("GET")

	// User settings
	s.router.HandleFunc("/settings/user", s.handleGetUserSettings).Methods("GET")
	s.router.HandleFunc("/settings/user", s.handleCreateUserSettings).Methods("POST")
	s.router.HandleFunc("/settings/user", s.handleUpdateUserSettings).Methods("PUT")
	s.router.HandleFunc("/settings/user/{section}", s.handleUpdateSettingsSection).Methods("PATCH")
	s.router.HandleFunc("/settings/user", s.handleDeleteUserSettings).Methods("DELETE")

	// Dealership settings (admin only)
	s.router.HandleFunc("/settings/dealership", s.handleGetDealershipSettings).Methods("GET")
	s.router.HandleFunc("/settings/dealership", s.handleCreateDealershipSettings).Methods("POST")
	s.router.HandleFunc("/settings/dealership", s.handleUpdateDealershipSettings).Methods("PUT")
}

// handleHealth returns service health status
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]string{"status": "healthy", "service": "settings-service"})
}

// handleGetUserSettings retrieves user settings
func (s *Server) handleGetUserSettings(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	dealershipID := r.Header.Get("X-Dealership-ID")

	if userID == "" || dealershipID == "" {
		respondError(w, http.StatusBadRequest, "X-User-ID and X-Dealership-ID headers required")
		return
	}

	settings, err := s.db.GetUserSettings(userID, dealershipID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// If no settings exist, create defaults
	if settings == nil {
		settings, err = s.db.CreateUserSettings(userID, dealershipID)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	respondJSON(w, http.StatusOK, settings)
}

// handleCreateUserSettings creates user settings
func (s *Server) handleCreateUserSettings(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	dealershipID := r.Header.Get("X-Dealership-ID")

	if userID == "" || dealershipID == "" {
		respondError(w, http.StatusBadRequest, "X-User-ID and X-Dealership-ID headers required")
		return
	}

	// Check if settings already exist
	existing, err := s.db.GetUserSettings(userID, dealershipID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if existing != nil {
		respondJSON(w, http.StatusOK, existing)
		return
	}

	settings, err := s.db.CreateUserSettings(userID, dealershipID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, settings)
}

// handleUpdateUserSettings updates all user settings
func (s *Server) handleUpdateUserSettings(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	dealershipID := r.Header.Get("X-Dealership-ID")

	if userID == "" || dealershipID == "" {
		respondError(w, http.StatusBadRequest, "X-User-ID and X-Dealership-ID headers required")
		return
	}

	var settings UserSettings
	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	updated, err := s.db.UpdateUserSettings(userID, dealershipID, &settings)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, updated)
}

// handleUpdateSettingsSection updates a specific settings section
func (s *Server) handleUpdateSettingsSection(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	dealershipID := r.Header.Get("X-Dealership-ID")

	if userID == "" || dealershipID == "" {
		respondError(w, http.StatusBadRequest, "X-User-ID and X-Dealership-ID headers required")
		return
	}

	vars := mux.Vars(r)
	section := vars["section"]

	// Read the raw JSON body
	var data json.RawMessage
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Ensure settings exist first
	existing, err := s.db.GetUserSettings(userID, dealershipID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if existing == nil {
		// Create default settings first
		_, err = s.db.CreateUserSettings(userID, dealershipID)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	updated, err := s.db.UpdateSettingsSection(userID, dealershipID, section, data)
	if err != nil {
		respondError(w, http.StatusBadRequest, "failed to update section: "+err.Error())
		return
	}

	respondJSON(w, http.StatusOK, updated)
}

// handleDeleteUserSettings deletes user settings
func (s *Server) handleDeleteUserSettings(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	dealershipID := r.Header.Get("X-Dealership-ID")

	if userID == "" || dealershipID == "" {
		respondError(w, http.StatusBadRequest, "X-User-ID and X-Dealership-ID headers required")
		return
	}

	if err := s.db.DeleteUserSettings(userID, dealershipID); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "settings deleted"})
}

// handleGetDealershipSettings retrieves dealership settings
func (s *Server) handleGetDealershipSettings(w http.ResponseWriter, r *http.Request) {
	dealershipID := r.Header.Get("X-Dealership-ID")

	if dealershipID == "" {
		respondError(w, http.StatusBadRequest, "X-Dealership-ID header required")
		return
	}

	settings, err := s.db.GetDealershipSettings(dealershipID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// If no settings exist, create defaults
	if settings == nil {
		settings, err = s.db.CreateDealershipSettings(dealershipID)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	respondJSON(w, http.StatusOK, settings)
}

// handleCreateDealershipSettings creates dealership settings
func (s *Server) handleCreateDealershipSettings(w http.ResponseWriter, r *http.Request) {
	dealershipID := r.Header.Get("X-Dealership-ID")

	if dealershipID == "" {
		respondError(w, http.StatusBadRequest, "X-Dealership-ID header required")
		return
	}

	// Check if settings already exist
	existing, err := s.db.GetDealershipSettings(dealershipID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if existing != nil {
		respondJSON(w, http.StatusOK, existing)
		return
	}

	settings, err := s.db.CreateDealershipSettings(dealershipID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, settings)
}

// handleUpdateDealershipSettings updates dealership settings
func (s *Server) handleUpdateDealershipSettings(w http.ResponseWriter, r *http.Request) {
	dealershipID := r.Header.Get("X-Dealership-ID")

	if dealershipID == "" {
		respondError(w, http.StatusBadRequest, "X-Dealership-ID header required")
		return
	}

	var settings DealershipSettings
	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	updated, err := s.db.UpdateDealershipSettings(dealershipID, &settings)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, updated)
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
