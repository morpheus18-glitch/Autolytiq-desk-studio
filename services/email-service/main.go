package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"time"

	"autolytiq/shared/logging"
	"autolytiq/shared/secrets"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// Config holds application configuration
type Config struct {
	Port          string
	DatabaseURL   string
	SMTPHost      string
	SMTPPort      int
	SMTPUsername  string
	SMTPPassword  string
	SMTPFromEmail string
	SMTPFromName  string
}

// Server holds application dependencies
type Server struct {
	db         EmailDatabase
	smtpClient SMTPClient
	config     Config
	logger     *logging.Logger
	router     *mux.Router
}

// SendEmailRequest represents a simple email send request
type SendEmailRequest struct {
	DealershipID string `json:"dealership_id"`
	To           string `json:"to"`
	Subject      string `json:"subject"`
	BodyHTML     string `json:"body_html"`
}

// SendTemplateEmailRequest represents a template-based email send request
type SendTemplateEmailRequest struct {
	DealershipID string            `json:"dealership_id"`
	To           string            `json:"to"`
	TemplateID   string            `json:"template_id"`
	Variables    map[string]string `json:"variables"`
}

// CreateTemplateRequest represents a template creation request
type CreateTemplateRequest struct {
	DealershipID string   `json:"dealership_id"`
	Name         string   `json:"name"`
	Subject      string   `json:"subject"`
	BodyHTML     string   `json:"body_html"`
	Variables    []string `json:"variables,omitempty"`
}

// UpdateTemplateRequest represents a template update request
type UpdateTemplateRequest struct {
	Name      string   `json:"name"`
	Subject   string   `json:"subject"`
	BodyHTML  string   `json:"body_html"`
	Variables []string `json:"variables,omitempty"`
}

// NewServer creates a new server instance
func NewServer(config Config, logger *logging.Logger) (*Server, error) {
	// Initialize database
	db, err := NewPostgresEmailDatabase(config.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to create database: %w", err)
	}

	// Initialize schema
	if err := db.InitSchema(); err != nil {
		return nil, fmt.Errorf("failed to initialize schema: %w", err)
	}

	// Initialize SMTP client
	smtpConfig := SMTPConfig{
		Host:      config.SMTPHost,
		Port:      config.SMTPPort,
		Username:  config.SMTPUsername,
		Password:  config.SMTPPassword,
		FromEmail: config.SMTPFromEmail,
		FromName:  config.SMTPFromName,
	}
	smtpClient := NewGoMailSMTPClient(smtpConfig)

	s := &Server{
		db:         db,
		smtpClient: smtpClient,
		config:     config,
		logger:     logger,
		router:     mux.NewRouter(),
	}

	s.setupMiddleware()
	s.setupRoutes()

	return s, nil
}

// setupMiddleware configures middleware
func (s *Server) setupMiddleware() {
	s.router.Use(logging.RequestIDMiddleware)
	s.router.Use(logging.RequestLoggingMiddleware(s.logger))
}

// setupRoutes configures all routes
func (s *Server) setupRoutes() {
	// Health check
	s.router.HandleFunc("/health", s.HealthCheckHandler).Methods("GET")

	// Email sending
	s.router.HandleFunc("/email/send", s.SendEmailHandler).Methods("POST")
	s.router.HandleFunc("/email/send-template", s.SendTemplateEmailHandler).Methods("POST")

	// Template management
	s.router.HandleFunc("/email/templates", s.CreateTemplateHandler).Methods("POST")
	s.router.HandleFunc("/email/templates", s.ListTemplatesHandler).Methods("GET")
	s.router.HandleFunc("/email/templates/{id}", s.GetTemplateHandler).Methods("GET")
	s.router.HandleFunc("/email/templates/{id}", s.UpdateTemplateHandler).Methods("PUT")
	s.router.HandleFunc("/email/templates/{id}", s.DeleteTemplateHandler).Methods("DELETE")

	// Log management
	s.router.HandleFunc("/email/logs", s.ListLogsHandler).Methods("GET")
	s.router.HandleFunc("/email/logs/{id}", s.GetLogHandler).Methods("GET")
}

// HealthCheckHandler handles health check requests
func (s *Server) HealthCheckHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}

// SendEmailHandler handles simple email sending
func (s *Server) SendEmailHandler(w http.ResponseWriter, r *http.Request) {
	var req SendEmailRequest
	if !decodeAndValidate(r, w, &req) {
		return
	}

	// Create log entry
	logID := uuid.New().String()
	emailLog := &EmailLog{
		ID:           logID,
		DealershipID: req.DealershipID,
		Recipient:    req.To,
		Subject:      req.Subject,
		Status:       "pending",
		CreatedAt:    time.Now(),
	}

	if err := s.db.CreateLog(emailLog); err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to create log")
		http.Error(w, "Failed to create log", http.StatusInternalServerError)
		return
	}

	// Send email
	err := s.smtpClient.SendEmail(req.To, req.Subject, req.BodyHTML)
	if err != nil {
		// Update log with error
		errMsg := err.Error()
		s.db.UpdateLogStatus(logID, "failed", nil, &errMsg)

		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to send email")
		http.Error(w, fmt.Sprintf("Failed to send email: %v", err), http.StatusInternalServerError)
		return
	}

	// Update log with success
	sentAt := time.Now()
	s.db.UpdateLogStatus(logID, "sent", &sentAt, nil)

	s.logger.WithContext(r.Context()).WithField("log_id", logID).Info("Email sent successfully")

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Email sent successfully",
		"log_id":  logID,
	})
}

// SendTemplateEmailHandler handles template-based email sending
func (s *Server) SendTemplateEmailHandler(w http.ResponseWriter, r *http.Request) {
	var req SendTemplateEmailRequest
	if !decodeAndValidate(r, w, &req) {
		return
	}

	// Get template
	template, err := s.db.GetTemplate(req.TemplateID, req.DealershipID)
	if err != nil {
		http.Error(w, "Template not found", http.StatusNotFound)
		return
	}

	// Render template
	subject := RenderTemplate(template.Subject, req.Variables)
	bodyHTML := RenderTemplate(template.BodyHTML, req.Variables)

	// Create log entry
	logID := uuid.New().String()
	emailLog := &EmailLog{
		ID:           logID,
		DealershipID: req.DealershipID,
		Recipient:    req.To,
		Subject:      subject,
		TemplateID:   &req.TemplateID,
		Status:       "pending",
		CreatedAt:    time.Now(),
	}

	if err := s.db.CreateLog(emailLog); err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to create log")
		http.Error(w, "Failed to create log", http.StatusInternalServerError)
		return
	}

	// Send email
	err = s.smtpClient.SendEmail(req.To, subject, bodyHTML)
	if err != nil {
		// Update log with error
		errMsg := err.Error()
		s.db.UpdateLogStatus(logID, "failed", nil, &errMsg)

		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to send email")
		http.Error(w, fmt.Sprintf("Failed to send email: %v", err), http.StatusInternalServerError)
		return
	}

	// Update log with success
	sentAt := time.Now()
	s.db.UpdateLogStatus(logID, "sent", &sentAt, nil)

	s.logger.WithContext(r.Context()).WithField("log_id", logID).Info("Template email sent successfully")

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Email sent successfully",
		"log_id":  logID,
	})
}

// CreateTemplateHandler handles template creation
func (s *Server) CreateTemplateHandler(w http.ResponseWriter, r *http.Request) {
	var req CreateTemplateRequest
	if !decodeAndValidate(r, w, &req) {
		return
	}

	// Auto-extract variables if not provided
	variables := req.Variables
	if len(variables) == 0 {
		subjectVars := ExtractVariables(req.Subject)
		bodyVars := ExtractVariables(req.BodyHTML)

		// Combine and deduplicate
		varMap := make(map[string]bool)
		for _, v := range subjectVars {
			varMap[v] = true
		}
		for _, v := range bodyVars {
			varMap[v] = true
		}

		variables = make([]string, 0, len(varMap))
		for v := range varMap {
			variables = append(variables, v)
		}
	}

	template := &EmailTemplate{
		ID:           uuid.New().String(),
		DealershipID: req.DealershipID,
		Name:         req.Name,
		Subject:      req.Subject,
		BodyHTML:     req.BodyHTML,
		Variables:    variables,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := s.db.CreateTemplate(template); err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to create template")
		http.Error(w, "Failed to create template", http.StatusInternalServerError)
		return
	}

	s.logger.WithContext(r.Context()).WithField("template_id", template.ID).Info("Template created")

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(template)
}

// GetTemplateHandler handles template retrieval
func (s *Server) GetTemplateHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	templateID := vars["id"]

	// Validate UUID
	if !validateUUID(w, templateID, "id") {
		return
	}

	dealershipID := r.URL.Query().Get("dealership_id")
	if dealershipID == "" {
		respondValidationError(w, &ValidationErrors{
			Errors: []ValidationError{{Field: "dealership_id", Message: "dealership_id is required"}},
		})
		return
	}
	if !validateUUID(w, dealershipID, "dealership_id") {
		return
	}

	template, err := s.db.GetTemplate(templateID, dealershipID)
	if err != nil {
		http.Error(w, "Template not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(template)
}

// ListTemplatesHandler handles template listing
func (s *Server) ListTemplatesHandler(w http.ResponseWriter, r *http.Request) {
	dealershipID := r.URL.Query().Get("dealership_id")
	if dealershipID == "" {
		respondValidationError(w, &ValidationErrors{
			Errors: []ValidationError{{Field: "dealership_id", Message: "dealership_id is required"}},
		})
		return
	}
	if !validateUUID(w, dealershipID, "dealership_id") {
		return
	}

	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit := 50
	offset := 0

	if limitStr != "" {
		if val, err := strconv.Atoi(limitStr); err == nil && val > 0 && val <= 100 {
			limit = val
		}
	}

	if offsetStr != "" {
		if val, err := strconv.Atoi(offsetStr); err == nil && val >= 0 {
			offset = val
		}
	}

	templates, err := s.db.ListTemplates(dealershipID, limit, offset)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to list templates")
		http.Error(w, "Failed to list templates", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(templates)
}

// UpdateTemplateHandler handles template updates
func (s *Server) UpdateTemplateHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	templateID := vars["id"]

	// Validate UUID
	if !validateUUID(w, templateID, "id") {
		return
	}

	dealershipID := r.URL.Query().Get("dealership_id")
	if dealershipID == "" {
		respondValidationError(w, &ValidationErrors{
			Errors: []ValidationError{{Field: "dealership_id", Message: "dealership_id is required"}},
		})
		return
	}
	if !validateUUID(w, dealershipID, "dealership_id") {
		return
	}

	var req UpdateTemplateRequest
	if !decodeAndValidate(r, w, &req) {
		return
	}

	// Auto-extract variables if not provided
	variables := req.Variables
	if len(variables) == 0 {
		subjectVars := ExtractVariables(req.Subject)
		bodyVars := ExtractVariables(req.BodyHTML)

		varMap := make(map[string]bool)
		for _, v := range subjectVars {
			varMap[v] = true
		}
		for _, v := range bodyVars {
			varMap[v] = true
		}

		variables = make([]string, 0, len(varMap))
		for v := range varMap {
			variables = append(variables, v)
		}
	}

	template := &EmailTemplate{
		ID:           templateID,
		DealershipID: dealershipID,
		Name:         req.Name,
		Subject:      req.Subject,
		BodyHTML:     req.BodyHTML,
		Variables:    variables,
		UpdatedAt:    time.Now(),
	}

	if err := s.db.UpdateTemplate(template); err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to update template")
		http.Error(w, "Failed to update template", http.StatusInternalServerError)
		return
	}

	// Fetch updated template
	updatedTemplate, err := s.db.GetTemplate(templateID, dealershipID)
	if err != nil {
		http.Error(w, "Failed to fetch updated template", http.StatusInternalServerError)
		return
	}

	s.logger.WithContext(r.Context()).WithField("template_id", templateID).Info("Template updated")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updatedTemplate)
}

// DeleteTemplateHandler handles template deletion
func (s *Server) DeleteTemplateHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	templateID := vars["id"]

	// Validate UUID
	if !validateUUID(w, templateID, "id") {
		return
	}

	dealershipID := r.URL.Query().Get("dealership_id")
	if dealershipID == "" {
		respondValidationError(w, &ValidationErrors{
			Errors: []ValidationError{{Field: "dealership_id", Message: "dealership_id is required"}},
		})
		return
	}
	if !validateUUID(w, dealershipID, "dealership_id") {
		return
	}

	if err := s.db.DeleteTemplate(templateID, dealershipID); err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to delete template")
		http.Error(w, "Failed to delete template", http.StatusNotFound)
		return
	}

	s.logger.WithContext(r.Context()).WithField("template_id", templateID).Info("Template deleted")

	w.WriteHeader(http.StatusNoContent)
}

// GetLogHandler handles log retrieval
func (s *Server) GetLogHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	logID := vars["id"]

	// Validate UUID
	if !validateUUID(w, logID, "id") {
		return
	}

	dealershipID := r.URL.Query().Get("dealership_id")
	if dealershipID == "" {
		respondValidationError(w, &ValidationErrors{
			Errors: []ValidationError{{Field: "dealership_id", Message: "dealership_id is required"}},
		})
		return
	}
	if !validateUUID(w, dealershipID, "dealership_id") {
		return
	}

	emailLog, err := s.db.GetLog(logID, dealershipID)
	if err != nil {
		http.Error(w, "Log not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(emailLog)
}

// ListLogsHandler handles log listing
func (s *Server) ListLogsHandler(w http.ResponseWriter, r *http.Request) {
	dealershipID := r.URL.Query().Get("dealership_id")
	if dealershipID == "" {
		respondValidationError(w, &ValidationErrors{
			Errors: []ValidationError{{Field: "dealership_id", Message: "dealership_id is required"}},
		})
		return
	}
	if !validateUUID(w, dealershipID, "dealership_id") {
		return
	}

	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit := 50
	offset := 0

	if limitStr != "" {
		if val, err := strconv.Atoi(limitStr); err == nil && val > 0 && val <= 100 {
			limit = val
		}
	}

	if offsetStr != "" {
		if val, err := strconv.Atoi(offsetStr); err == nil && val >= 0 {
			offset = val
		}
	}

	logs, err := s.db.ListLogs(dealershipID, limit, offset)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to list logs")
		http.Error(w, "Failed to list logs", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(logs)
}

// LoadConfig loads configuration from secrets provider and environment variables
func LoadConfig(ctx context.Context, logger *logging.Logger) Config {
	// Initialize secrets provider (AWS Secrets Manager in production, env vars in development)
	secretsProvider, err := secrets.AutoProvider(ctx)
	if err != nil {
		logger.Warn("Failed to initialize secrets provider, falling back to environment variables: " + err.Error())
	}
	defer func() {
		if secretsProvider != nil {
			secretsProvider.Close()
		}
	}()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8004"
	}

	var databaseURL string
	var smtpConfig *secrets.SMTPConfig

	if secretsProvider != nil {
		// Try to get secrets from provider
		if url, err := secretsProvider.GetDatabaseURL(ctx); err == nil {
			databaseURL = url
		}
		if cfg, err := secretsProvider.GetSMTPConfig(ctx); err == nil {
			smtpConfig = cfg
		}
	}

	// Fallback to environment variables for database URL
	if databaseURL == "" {
		databaseURL = os.Getenv("DATABASE_URL")
		if databaseURL == "" {
			databaseURL = "postgres://postgres:postgres@localhost:5432/autolytiq_email?sslmode=disable"
		}
	}

	// Fallback to environment variables for SMTP config
	smtpHost := ""
	smtpPort := 587
	smtpUsername := ""
	smtpPassword := ""
	smtpFromEmail := ""
	smtpFromName := "Autolytiq"

	if smtpConfig != nil {
		smtpHost = smtpConfig.Host
		smtpPort = smtpConfig.Port
		smtpUsername = smtpConfig.Username
		smtpPassword = smtpConfig.Password
		smtpFromEmail = smtpConfig.FromEmail
		smtpFromName = smtpConfig.FromName
	}

	// Override with environment variables if set
	if envHost := os.Getenv("SMTP_HOST"); envHost != "" {
		smtpHost = envHost
	}
	if smtpHost == "" {
		smtpHost = "smtp.gmail.com"
	}

	if smtpPortStr := os.Getenv("SMTP_PORT"); smtpPortStr != "" {
		if val, err := strconv.Atoi(smtpPortStr); err == nil {
			smtpPort = val
		}
	}

	if envUser := os.Getenv("SMTP_USERNAME"); envUser != "" {
		smtpUsername = envUser
	}
	if envPass := os.Getenv("SMTP_PASSWORD"); envPass != "" {
		smtpPassword = envPass
	}
	if envFrom := os.Getenv("SMTP_FROM_EMAIL"); envFrom != "" {
		smtpFromEmail = envFrom
	}
	if envName := os.Getenv("SMTP_FROM_NAME"); envName != "" {
		smtpFromName = envName
	}

	return Config{
		Port:          port,
		DatabaseURL:   databaseURL,
		SMTPHost:      smtpHost,
		SMTPPort:      smtpPort,
		SMTPUsername:  smtpUsername,
		SMTPPassword:  smtpPassword,
		SMTPFromEmail: smtpFromEmail,
		SMTPFromName:  smtpFromName,
	}
}

func main() {
	// Initialize logger
	logger := logging.New(logging.Config{
		Service: "email-service",
	})

	ctx := context.Background()
	config := LoadConfig(ctx, logger)

	server, err := NewServer(config, logger)
	if err != nil {
		logger.Fatalf("Failed to create server: %v", err)
	}
	defer server.db.Close()

	logger.Infof("Email Service starting on port %s", config.Port)
	if err := http.ListenAndServe(":"+config.Port, server.router); err != nil {
		logger.Fatal(err.Error())
	}
}
