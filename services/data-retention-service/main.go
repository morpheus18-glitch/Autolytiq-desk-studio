package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"autolytiq/services/shared/logging"

	"github.com/gorilla/mux"
)

// Config holds application configuration
type Config struct {
	Port                  string
	DatabaseURL           string
	CustomerServiceURL    string
	DealServiceURL        string
	EmailServiceURL       string
	EncryptionKey         string
	DataRetentionEnabled  bool
	AnonymizationEnabled  bool
}

// Server represents the Data Retention service server
type Server struct {
	router           *mux.Router
	config           *Config
	db               *Database
	logger           *logging.Logger
	retentionService *RetentionService
	gdprService      *GDPRService
	consentService   *ConsentService
	scheduler        *Scheduler
}

// NewServer creates a new Data Retention service server
func NewServer(config *Config, db *Database, logger *logging.Logger) *Server {
	s := &Server{
		router: mux.NewRouter(),
		config: config,
		db:     db,
		logger: logger,
	}

	// Initialize services
	s.retentionService = NewRetentionService(db, logger)
	s.gdprService = NewGDPRService(db, logger, config)
	s.consentService = NewConsentService(db, logger)
	s.scheduler = NewScheduler(s.retentionService, s.gdprService, logger)

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
	// Health check
	s.router.HandleFunc("/health", s.healthCheck).Methods("GET")

	// GDPR Data Subject Rights endpoints
	s.router.HandleFunc("/gdpr/export/{customer_id}", s.exportCustomerData).Methods("POST")
	s.router.HandleFunc("/gdpr/delete/{customer_id}", s.deleteCustomerData).Methods("POST")
	s.router.HandleFunc("/gdpr/anonymize/{customer_id}", s.anonymizeCustomerData).Methods("POST")
	s.router.HandleFunc("/gdpr/retention-status", s.getRetentionStatus).Methods("GET")
	s.router.HandleFunc("/gdpr/retention-status/{customer_id}", s.getCustomerRetentionStatus).Methods("GET")

	// GDPR Request Management
	s.router.HandleFunc("/gdpr/requests", s.listGDPRRequests).Methods("GET")
	s.router.HandleFunc("/gdpr/requests/{id}", s.getGDPRRequest).Methods("GET")
	s.router.HandleFunc("/gdpr/requests/{id}/status", s.updateGDPRRequestStatus).Methods("PUT")

	// Consent Management
	s.router.HandleFunc("/consent/{customer_id}", s.getCustomerConsent).Methods("GET")
	s.router.HandleFunc("/consent/{customer_id}", s.updateCustomerConsent).Methods("PUT")
	s.router.HandleFunc("/consent/{customer_id}/history", s.getConsentHistory).Methods("GET")
	s.router.HandleFunc("/consent/marketing/opt-out", s.marketingOptOut).Methods("POST")

	// Retention Policy Management
	s.router.HandleFunc("/retention/policies", s.listRetentionPolicies).Methods("GET")
	s.router.HandleFunc("/retention/policies", s.createRetentionPolicy).Methods("POST")
	s.router.HandleFunc("/retention/policies/{id}", s.getRetentionPolicy).Methods("GET")
	s.router.HandleFunc("/retention/policies/{id}", s.updateRetentionPolicy).Methods("PUT")
	s.router.HandleFunc("/retention/policies/{id}", s.deleteRetentionPolicy).Methods("DELETE")

	// Audit Log
	s.router.HandleFunc("/audit/logs", s.listAuditLogs).Methods("GET")
	s.router.HandleFunc("/audit/logs/{id}", s.getAuditLog).Methods("GET")

	// Manual triggers (admin only)
	s.router.HandleFunc("/admin/run-retention-cleanup", s.runRetentionCleanup).Methods("POST")
	s.router.HandleFunc("/admin/run-anonymization", s.runAnonymization).Methods("POST")
	s.router.HandleFunc("/admin/generate-retention-report", s.generateRetentionReport).Methods("POST")
}

// healthCheck handler
func (s *Server) healthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "healthy",
		"service":   "data-retention-service",
		"timestamp": time.Now().Format(time.RFC3339),
		"features": map[string]bool{
			"gdpr_export":    true,
			"gdpr_delete":    true,
			"anonymization":  s.config.AnonymizationEnabled,
			"data_retention": s.config.DataRetentionEnabled,
		},
	})
}

// exportCustomerData handles GDPR data export requests
func (s *Server) exportCustomerData(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	customerID := vars["customer_id"]

	dealershipID := r.URL.Query().Get("dealership_id")
	if dealershipID == "" {
		http.Error(w, "dealership_id is required", http.StatusBadRequest)
		return
	}

	// Validate customer ID
	if !isValidUUID(customerID) {
		http.Error(w, "Invalid customer_id format", http.StatusBadRequest)
		return
	}

	// Get request metadata
	requestedBy := r.Header.Get("X-User-ID")
	if requestedBy == "" {
		requestedBy = "system"
	}

	// Create GDPR request
	request, err := s.gdprService.CreateExportRequest(r.Context(), customerID, dealershipID, requestedBy)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to create export request")
		http.Error(w, fmt.Sprintf("Failed to create export request: %v", err), http.StatusInternalServerError)
		return
	}

	// Process export (async in production, sync here for simplicity)
	exportData, err := s.gdprService.ExportCustomerData(r.Context(), customerID, dealershipID)
	if err != nil {
		s.gdprService.UpdateRequestStatus(r.Context(), request.ID, "failed", err.Error())
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to export customer data")
		http.Error(w, fmt.Sprintf("Failed to export customer data: %v", err), http.StatusInternalServerError)
		return
	}

	// Update request status
	s.gdprService.UpdateRequestStatus(r.Context(), request.ID, "completed", "")

	s.logger.WithContext(r.Context()).
		WithField("customer_id", customerID).
		WithField("request_id", request.ID).
		Info("Customer data exported successfully")

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=customer_%s_export.json", customerID))
	json.NewEncoder(w).Encode(exportData)
}

// deleteCustomerData handles GDPR data deletion requests (right to erasure)
func (s *Server) deleteCustomerData(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	customerID := vars["customer_id"]

	dealershipID := r.URL.Query().Get("dealership_id")
	if dealershipID == "" {
		http.Error(w, "dealership_id is required", http.StatusBadRequest)
		return
	}

	if !isValidUUID(customerID) {
		http.Error(w, "Invalid customer_id format", http.StatusBadRequest)
		return
	}

	requestedBy := r.Header.Get("X-User-ID")
	if requestedBy == "" {
		requestedBy = "system"
	}

	// Parse request body for deletion options
	var deleteReq struct {
		Reason         string `json:"reason"`
		RetainForLegal bool   `json:"retain_for_legal"` // Keep for legal compliance period
	}
	if err := json.NewDecoder(r.Body).Decode(&deleteReq); err != nil {
		// Default options if no body provided
		deleteReq.Reason = "Customer request"
		deleteReq.RetainForLegal = true
	}

	// Create GDPR request
	request, err := s.gdprService.CreateDeletionRequest(r.Context(), customerID, dealershipID, requestedBy, deleteReq.Reason)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to create deletion request")
		http.Error(w, fmt.Sprintf("Failed to create deletion request: %v", err), http.StatusInternalServerError)
		return
	}

	// Process deletion
	result, err := s.gdprService.DeleteCustomerData(r.Context(), customerID, dealershipID, deleteReq.RetainForLegal)
	if err != nil {
		s.gdprService.UpdateRequestStatus(r.Context(), request.ID, "failed", err.Error())
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to delete customer data")
		http.Error(w, fmt.Sprintf("Failed to delete customer data: %v", err), http.StatusInternalServerError)
		return
	}

	// Update request status
	s.gdprService.UpdateRequestStatus(r.Context(), request.ID, "completed", "")

	s.logger.WithContext(r.Context()).
		WithField("customer_id", customerID).
		WithField("request_id", request.ID).
		Info("Customer data deleted successfully")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":     "success",
		"request_id": request.ID,
		"message":    "Customer data has been deleted",
		"details":    result,
	})
}

// anonymizeCustomerData handles data anonymization requests
func (s *Server) anonymizeCustomerData(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	customerID := vars["customer_id"]

	dealershipID := r.URL.Query().Get("dealership_id")
	if dealershipID == "" {
		http.Error(w, "dealership_id is required", http.StatusBadRequest)
		return
	}

	if !isValidUUID(customerID) {
		http.Error(w, "Invalid customer_id format", http.StatusBadRequest)
		return
	}

	requestedBy := r.Header.Get("X-User-ID")
	if requestedBy == "" {
		requestedBy = "system"
	}

	result, err := s.gdprService.AnonymizeCustomerData(r.Context(), customerID, dealershipID, requestedBy)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to anonymize customer data")
		http.Error(w, fmt.Sprintf("Failed to anonymize customer data: %v", err), http.StatusInternalServerError)
		return
	}

	s.logger.WithContext(r.Context()).
		WithField("customer_id", customerID).
		Info("Customer data anonymized successfully")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// getRetentionStatus returns overall retention status
func (s *Server) getRetentionStatus(w http.ResponseWriter, r *http.Request) {
	dealershipID := r.URL.Query().Get("dealership_id")

	status, err := s.retentionService.GetRetentionStatus(r.Context(), dealershipID)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to get retention status")
		http.Error(w, fmt.Sprintf("Failed to get retention status: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(status)
}

// getCustomerRetentionStatus returns retention status for a specific customer
func (s *Server) getCustomerRetentionStatus(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	customerID := vars["customer_id"]

	dealershipID := r.URL.Query().Get("dealership_id")
	if dealershipID == "" {
		http.Error(w, "dealership_id is required", http.StatusBadRequest)
		return
	}

	if !isValidUUID(customerID) {
		http.Error(w, "Invalid customer_id format", http.StatusBadRequest)
		return
	}

	status, err := s.retentionService.GetCustomerRetentionStatus(r.Context(), customerID, dealershipID)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to get customer retention status")
		http.Error(w, fmt.Sprintf("Failed to get customer retention status: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(status)
}

// listGDPRRequests lists all GDPR requests
func (s *Server) listGDPRRequests(w http.ResponseWriter, r *http.Request) {
	dealershipID := r.URL.Query().Get("dealership_id")
	requestType := r.URL.Query().Get("type")
	status := r.URL.Query().Get("status")

	requests, err := s.gdprService.ListRequests(r.Context(), dealershipID, requestType, status)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to list GDPR requests")
		http.Error(w, fmt.Sprintf("Failed to list GDPR requests: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests)
}

// getGDPRRequest gets a specific GDPR request
func (s *Server) getGDPRRequest(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	requestID := vars["id"]

	request, err := s.gdprService.GetRequest(r.Context(), requestID)
	if err != nil {
		http.Error(w, "Request not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(request)
}

// updateGDPRRequestStatus updates the status of a GDPR request
func (s *Server) updateGDPRRequestStatus(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	requestID := vars["id"]

	var req struct {
		Status string `json:"status"`
		Notes  string `json:"notes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := s.gdprService.UpdateRequestStatus(r.Context(), requestID, req.Status, req.Notes); err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to update GDPR request status")
		http.Error(w, fmt.Sprintf("Failed to update request status: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "updated"})
}

// getCustomerConsent gets consent status for a customer
func (s *Server) getCustomerConsent(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	customerID := vars["customer_id"]

	dealershipID := r.URL.Query().Get("dealership_id")
	if dealershipID == "" {
		http.Error(w, "dealership_id is required", http.StatusBadRequest)
		return
	}

	consent, err := s.consentService.GetConsent(r.Context(), customerID, dealershipID)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to get customer consent")
		http.Error(w, fmt.Sprintf("Failed to get consent: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(consent)
}

// updateCustomerConsent updates consent for a customer
func (s *Server) updateCustomerConsent(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	customerID := vars["customer_id"]

	dealershipID := r.URL.Query().Get("dealership_id")
	if dealershipID == "" {
		http.Error(w, "dealership_id is required", http.StatusBadRequest)
		return
	}

	var consent ConsentUpdate
	if err := json.NewDecoder(r.Body).Decode(&consent); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	consent.CustomerID = customerID
	consent.DealershipID = dealershipID
	consent.UpdatedBy = r.Header.Get("X-User-ID")
	consent.IPAddress = r.RemoteAddr

	updatedConsent, err := s.consentService.UpdateConsent(r.Context(), &consent)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to update customer consent")
		http.Error(w, fmt.Sprintf("Failed to update consent: %v", err), http.StatusInternalServerError)
		return
	}

	s.logger.WithContext(r.Context()).
		WithField("customer_id", customerID).
		Info("Customer consent updated")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updatedConsent)
}

// getConsentHistory gets consent change history for a customer
func (s *Server) getConsentHistory(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	customerID := vars["customer_id"]

	dealershipID := r.URL.Query().Get("dealership_id")
	if dealershipID == "" {
		http.Error(w, "dealership_id is required", http.StatusBadRequest)
		return
	}

	history, err := s.consentService.GetConsentHistory(r.Context(), customerID, dealershipID)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to get consent history")
		http.Error(w, fmt.Sprintf("Failed to get consent history: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(history)
}

// marketingOptOut handles marketing opt-out requests
func (s *Server) marketingOptOut(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email        string `json:"email"`
		CustomerID   string `json:"customer_id"`
		DealershipID string `json:"dealership_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Email == "" && req.CustomerID == "" {
		http.Error(w, "email or customer_id is required", http.StatusBadRequest)
		return
	}

	err := s.consentService.ProcessMarketingOptOut(r.Context(), req.Email, req.CustomerID, req.DealershipID, r.RemoteAddr)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to process marketing opt-out")
		http.Error(w, fmt.Sprintf("Failed to process opt-out: %v", err), http.StatusInternalServerError)
		return
	}

	s.logger.WithContext(r.Context()).
		WithField("email", req.Email).
		WithField("customer_id", req.CustomerID).
		Info("Marketing opt-out processed")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "success",
		"message": "You have been successfully opted out of marketing communications",
	})
}

// listRetentionPolicies lists all retention policies
func (s *Server) listRetentionPolicies(w http.ResponseWriter, r *http.Request) {
	policies, err := s.retentionService.ListPolicies(r.Context())
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to list retention policies")
		http.Error(w, fmt.Sprintf("Failed to list policies: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(policies)
}

// createRetentionPolicy creates a new retention policy
func (s *Server) createRetentionPolicy(w http.ResponseWriter, r *http.Request) {
	var policy RetentionPolicy
	if err := json.NewDecoder(r.Body).Decode(&policy); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	createdPolicy, err := s.retentionService.CreatePolicy(r.Context(), &policy)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to create retention policy")
		http.Error(w, fmt.Sprintf("Failed to create policy: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(createdPolicy)
}

// getRetentionPolicy gets a specific retention policy
func (s *Server) getRetentionPolicy(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	policyID := vars["id"]

	policy, err := s.retentionService.GetPolicy(r.Context(), policyID)
	if err != nil {
		http.Error(w, "Policy not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(policy)
}

// updateRetentionPolicy updates a retention policy
func (s *Server) updateRetentionPolicy(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	policyID := vars["id"]

	var policy RetentionPolicy
	if err := json.NewDecoder(r.Body).Decode(&policy); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	policy.ID = policyID

	updatedPolicy, err := s.retentionService.UpdatePolicy(r.Context(), &policy)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to update retention policy")
		http.Error(w, fmt.Sprintf("Failed to update policy: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updatedPolicy)
}

// deleteRetentionPolicy deletes a retention policy
func (s *Server) deleteRetentionPolicy(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	policyID := vars["id"]

	if err := s.retentionService.DeletePolicy(r.Context(), policyID); err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to delete retention policy")
		http.Error(w, fmt.Sprintf("Failed to delete policy: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// listAuditLogs lists audit logs
func (s *Server) listAuditLogs(w http.ResponseWriter, r *http.Request) {
	dealershipID := r.URL.Query().Get("dealership_id")
	entityType := r.URL.Query().Get("entity_type")
	entityID := r.URL.Query().Get("entity_id")
	action := r.URL.Query().Get("action")

	logs, err := s.db.ListAuditLogs(r.Context(), dealershipID, entityType, entityID, action, 100, 0)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to list audit logs")
		http.Error(w, fmt.Sprintf("Failed to list audit logs: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(logs)
}

// getAuditLog gets a specific audit log
func (s *Server) getAuditLog(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	logID := vars["id"]

	log, err := s.db.GetAuditLog(r.Context(), logID)
	if err != nil {
		http.Error(w, "Audit log not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(log)
}

// runRetentionCleanup manually triggers retention cleanup
func (s *Server) runRetentionCleanup(w http.ResponseWriter, r *http.Request) {
	result, err := s.retentionService.RunRetentionCleanup(r.Context())
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to run retention cleanup")
		http.Error(w, fmt.Sprintf("Failed to run cleanup: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// runAnonymization manually triggers data anonymization
func (s *Server) runAnonymization(w http.ResponseWriter, r *http.Request) {
	result, err := s.gdprService.RunAnonymizationJob(r.Context())
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to run anonymization")
		http.Error(w, fmt.Sprintf("Failed to run anonymization: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// generateRetentionReport generates a retention report
func (s *Server) generateRetentionReport(w http.ResponseWriter, r *http.Request) {
	dealershipID := r.URL.Query().Get("dealership_id")

	report, err := s.retentionService.GenerateRetentionReport(r.Context(), dealershipID)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to generate retention report")
		http.Error(w, fmt.Sprintf("Failed to generate report: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(report)
}

// Start starts the Data Retention service server
func (s *Server) Start() error {
	// Start scheduler for background jobs
	s.scheduler.Start()

	s.logger.Infof("Starting Data Retention Service on port %s", s.config.Port)
	return http.ListenAndServe(":"+s.config.Port, s.router)
}

// Stop gracefully stops the server
func (s *Server) Stop() {
	s.scheduler.Stop()
}

func loadConfig() *Config {
	return &Config{
		Port:                  getEnv("PORT", "8091"),
		DatabaseURL:           getEnv("DATABASE_URL", "postgresql://localhost:5432/autolytiq"),
		CustomerServiceURL:    getEnv("CUSTOMER_SERVICE_URL", "http://localhost:8082"),
		DealServiceURL:        getEnv("DEAL_SERVICE_URL", "http://localhost:8081"),
		EmailServiceURL:       getEnv("EMAIL_SERVICE_URL", "http://localhost:8084"),
		EncryptionKey:         os.Getenv("PII_ENCRYPTION_KEY"),
		DataRetentionEnabled:  getEnvBool("DATA_RETENTION_ENABLED", true),
		AnonymizationEnabled:  getEnvBool("ANONYMIZATION_ENABLED", true),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		return value == "true" || value == "1"
	}
	return defaultValue
}

func isValidUUID(s string) bool {
	if len(s) != 36 {
		return false
	}
	// Simple UUID format check
	for i, c := range s {
		if i == 8 || i == 13 || i == 18 || i == 23 {
			if c != '-' {
				return false
			}
		} else {
			if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')) {
				return false
			}
		}
	}
	return true
}

func main() {
	// Initialize logger
	logger := logging.New(logging.Config{
		Service: "data-retention-service",
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

	// Seed default retention policies
	if err := db.SeedDefaultPolicies(); err != nil {
		logger.Warnf("Failed to seed default policies: %v", err)
	}

	// Create and start server
	server := NewServer(config, db, logger)
	defer server.Stop()

	if err := server.Start(); err != nil {
		logger.Fatal(err.Error())
	}
}
