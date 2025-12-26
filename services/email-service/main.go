package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"autolytiq/shared/auth"
	"autolytiq/shared/logging"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// Config holds application configuration
type Config struct {
	Port          string
	DatabaseURL   string
	ServiceSecret string
	SMTPHost      string
	SMTPPort      int
	SMTPUsername  string
	SMTPPassword  string
	SMTPFromEmail string
	SMTPFromName  string
	// Resend configuration (preferred over SMTP when set)
	ResendAPIKey       string
	ResendFromEmail    string
	ResendFromName     string
	ResendWebhookSecret string
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

	// Initialize email client (prefer Resend over SMTP if configured)
	var emailClient SMTPClient
	if IsResendConfigured(config.ResendAPIKey) {
		resendConfig := ResendConfig{
			APIKey:    config.ResendAPIKey,
			FromEmail: config.ResendFromEmail,
			FromName:  config.ResendFromName,
		}
		emailClient = NewResendClient(resendConfig)
		logger.Info("Using Resend API for email delivery")
	} else {
		smtpConfig := SMTPConfig{
			Host:      config.SMTPHost,
			Port:      config.SMTPPort,
			Username:  config.SMTPUsername,
			Password:  config.SMTPPassword,
			FromEmail: config.SMTPFromEmail,
			FromName:  config.SMTPFromName,
		}
		emailClient = NewGoMailSMTPClient(smtpConfig)
		logger.Info("Using SMTP for email delivery")
	}

	s := &Server{
		db:         db,
		smtpClient: emailClient,
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
	// Add service authentication middleware for inter-service security
	// Note: Webhook endpoints are handled separately as they come from external services
	authConfig := auth.NewServiceAuthConfig(s.config.ServiceSecret).
		WithBypassPaths("/email/webhooks/resend") // Allow Resend webhooks without service auth
	s.router.Use(auth.ServiceAuthMiddleware(authConfig))
}

// setupRoutes configures all routes
func (s *Server) setupRoutes() {
	// Health check
	s.router.HandleFunc("/health", s.HealthCheckHandler).Methods("GET")

	// Email sending (legacy)
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

	// =====================================================
	// INBOX API - Gmail/Outlook-like functionality
	// =====================================================

	// Inbox & Email management
	s.router.HandleFunc("/email/inbox", s.ListInboxHandler).Methods("GET")
	s.router.HandleFunc("/email/inbox/search", s.SearchEmailsHandler).Methods("GET")
	s.router.HandleFunc("/email/inbox/stats", s.GetStatsHandler).Methods("GET")
	s.router.HandleFunc("/email/inbox/batch", s.BatchActionHandler).Methods("POST")
	s.router.HandleFunc("/email/inbox/{id}", s.GetEmailHandler).Methods("GET")
	s.router.HandleFunc("/email/inbox/{id}/star", s.ToggleStarHandler).Methods("POST")

	// Compose & Send
	s.router.HandleFunc("/email/compose", s.ComposeEmailHandler).Methods("POST")

	// Threads
	s.router.HandleFunc("/email/threads", s.ListThreadsHandler).Methods("GET")
	s.router.HandleFunc("/email/threads/{id}", s.GetThreadHandler).Methods("GET")

	// Drafts
	s.router.HandleFunc("/email/drafts", s.ListDraftsHandler).Methods("GET")
	s.router.HandleFunc("/email/drafts", s.SaveDraftHandler).Methods("POST")
	s.router.HandleFunc("/email/drafts/{id}", s.GetDraftHandler).Methods("GET")
	s.router.HandleFunc("/email/drafts/{id}", s.SaveDraftHandler).Methods("PUT")
	s.router.HandleFunc("/email/drafts/{id}", s.DeleteDraftHandler).Methods("DELETE")
	s.router.HandleFunc("/email/drafts/{id}/send", s.SendDraftHandler).Methods("POST")

	// Labels
	s.router.HandleFunc("/email/labels", s.ListLabelsHandler).Methods("GET")
	s.router.HandleFunc("/email/labels", s.CreateLabelHandler).Methods("POST")
	s.router.HandleFunc("/email/labels/{id}", s.UpdateLabelHandler).Methods("PUT")
	s.router.HandleFunc("/email/labels/{id}", s.DeleteLabelHandler).Methods("DELETE")

	// Signatures
	s.router.HandleFunc("/email/signatures", s.ListSignaturesHandler).Methods("GET")
	s.router.HandleFunc("/email/signatures", s.CreateSignatureHandler).Methods("POST")
	s.router.HandleFunc("/email/signatures/{id}", s.UpdateSignatureHandler).Methods("PUT")
	s.router.HandleFunc("/email/signatures/{id}", s.DeleteSignatureHandler).Methods("DELETE")

	// Attachments (S3 integration)
	s.router.HandleFunc("/email/attachments/upload", s.UploadAttachmentHandler).Methods("POST")
	s.router.HandleFunc("/email/attachments/upload-url", s.GetUploadURLHandler).Methods("GET")
	s.router.HandleFunc("/email/attachments/{id}", s.GetAttachmentHandler).Methods("GET")
	s.router.HandleFunc("/email/attachments/{id}/download", s.DownloadAttachmentHandler).Methods("GET")
	s.router.HandleFunc("/email/attachments/{id}", s.DeleteAttachmentHandler).Methods("DELETE")
	s.router.HandleFunc("/email/inbox/{email_id}/attachments", s.ListEmailAttachmentsHandler).Methods("GET")
	s.router.HandleFunc("/email/drafts/{draft_id}/attachments", s.ListDraftAttachmentsHandler).Methods("GET")

	// Preferences
	s.router.HandleFunc("/email/preferences", s.GetPreferencesHandler).Methods("GET")
	s.router.HandleFunc("/email/preferences", s.SavePreferencesHandler).Methods("POST")

	// Webhooks (for email delivery tracking)
	s.router.HandleFunc("/email/webhooks/resend", s.ResendWebhookHandler).Methods("POST")
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

// LoadConfig loads configuration from environment variables
func LoadConfig(ctx context.Context, logger *logging.Logger) Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8004"
	}

	// Get database URL from environment
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgres://postgres:postgres@localhost:5432/autolytiq_email?sslmode=disable"
	}

	// Get SMTP config from environment variables
	smtpHost := os.Getenv("SMTP_HOST")
	if smtpHost == "" {
		smtpHost = "smtp.gmail.com"
	}

	smtpPort := 587
	smtpUsername := ""
	smtpPassword := ""
	smtpFromEmail := ""
	smtpFromName := "Autolytiq"

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

	// Resend configuration (preferred over SMTP if set)
	resendAPIKey := os.Getenv("RESEND_API_KEY")
	resendFromEmail := os.Getenv("RESEND_FROM_EMAIL")
	if resendFromEmail == "" {
		resendFromEmail = smtpFromEmail // Fallback to SMTP from email
	}
	resendFromName := os.Getenv("RESEND_FROM_NAME")
	if resendFromName == "" {
		resendFromName = smtpFromName // Fallback to SMTP from name
	}
	resendWebhookSecret := os.Getenv("RESEND_WEBHOOK_SECRET")

	// Service secret for inter-service authentication
	serviceSecret := os.Getenv("SERVICE_SECRET")

	return Config{
		Port:            port,
		DatabaseURL:     databaseURL,
		ServiceSecret:   serviceSecret,
		SMTPHost:        smtpHost,
		SMTPPort:        smtpPort,
		SMTPUsername:    smtpUsername,
		SMTPPassword:    smtpPassword,
		SMTPFromEmail:   smtpFromEmail,
		SMTPFromName:    smtpFromName,
		ResendAPIKey:        resendAPIKey,
		ResendFromEmail:     resendFromEmail,
		ResendFromName:      resendFromName,
		ResendWebhookSecret: resendWebhookSecret,
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

	srv := &http.Server{
		Addr:    ":" + config.Port,
		Handler: server.router,
	}

	// Channel to listen for shutdown signals
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	// Start server in goroutine
	go func() {
		logger.Infof("Email Service starting on port %s", config.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatalf("Server failed: %v", err)
		}
	}()

	// Wait for shutdown signal
	<-stop
	logger.Info("Shutting down gracefully...")

	// Create context with timeout for shutdown
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Errorf("Graceful shutdown failed: %v", err)
	}

	logger.Info("Server stopped")
}
