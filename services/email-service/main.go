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
	Port             string
	DatabaseURL      string
	SMTPHost         string
	SMTPPort         int
	SMTPUsername     string
	SMTPPassword     string
	SMTPFromEmail    string
	SMTPFromName     string
}

// Server holds application dependencies
type Server struct {
	db         EmailDatabase
	smtpClient SMTPClient
	config     Config
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
func NewServer(config Config) (*Server, error) {
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

	return &Server{
		db:         db,
		smtpClient: smtpClient,
		config:     config,
	}, nil
}

// HealthCheckHandler handles health check requests
func (s *Server) HealthCheckHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}

// SendEmailHandler handles simple email sending
func (s *Server) SendEmailHandler(w http.ResponseWriter, r *http.Request) {
	var req SendEmailRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate request
	if req.DealershipID == "" || req.To == "" || req.Subject == "" || req.BodyHTML == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
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
		http.Error(w, "Failed to create log", http.StatusInternalServerError)
		return
	}

	// Send email
	err := s.smtpClient.SendEmail(req.To, req.Subject, req.BodyHTML)
	if err != nil {
		// Update log with error
		errMsg := err.Error()
		s.db.UpdateLogStatus(logID, "failed", nil, &errMsg)

		http.Error(w, fmt.Sprintf("Failed to send email: %v", err), http.StatusInternalServerError)
		return
	}

	// Update log with success
	sentAt := time.Now()
	s.db.UpdateLogStatus(logID, "sent", &sentAt, nil)

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
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate request
	if req.DealershipID == "" || req.To == "" || req.TemplateID == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
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
		http.Error(w, "Failed to create log", http.StatusInternalServerError)
		return
	}

	// Send email
	err = s.smtpClient.SendEmail(req.To, subject, bodyHTML)
	if err != nil {
		// Update log with error
		errMsg := err.Error()
		s.db.UpdateLogStatus(logID, "failed", nil, &errMsg)

		http.Error(w, fmt.Sprintf("Failed to send email: %v", err), http.StatusInternalServerError)
		return
	}

	// Update log with success
	sentAt := time.Now()
	s.db.UpdateLogStatus(logID, "sent", &sentAt, nil)

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
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate request
	if req.DealershipID == "" || req.Name == "" || req.Subject == "" || req.BodyHTML == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
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
		http.Error(w, "Failed to create template", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(template)
}

// GetTemplateHandler handles template retrieval
func (s *Server) GetTemplateHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	templateID := vars["id"]
	dealershipID := r.URL.Query().Get("dealership_id")

	if dealershipID == "" {
		http.Error(w, "Missing dealership_id", http.StatusBadRequest)
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
		http.Error(w, "Missing dealership_id", http.StatusBadRequest)
		return
	}

	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit := 50
	offset := 0

	if limitStr != "" {
		if val, err := strconv.Atoi(limitStr); err == nil {
			limit = val
		}
	}

	if offsetStr != "" {
		if val, err := strconv.Atoi(offsetStr); err == nil {
			offset = val
		}
	}

	templates, err := s.db.ListTemplates(dealershipID, limit, offset)
	if err != nil {
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
	dealershipID := r.URL.Query().Get("dealership_id")

	if dealershipID == "" {
		http.Error(w, "Missing dealership_id", http.StatusBadRequest)
		return
	}

	var req UpdateTemplateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate request
	if req.Name == "" || req.Subject == "" || req.BodyHTML == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
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
		http.Error(w, "Failed to update template", http.StatusInternalServerError)
		return
	}

	// Fetch updated template
	updatedTemplate, err := s.db.GetTemplate(templateID, dealershipID)
	if err != nil {
		http.Error(w, "Failed to fetch updated template", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updatedTemplate)
}

// DeleteTemplateHandler handles template deletion
func (s *Server) DeleteTemplateHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	templateID := vars["id"]
	dealershipID := r.URL.Query().Get("dealership_id")

	if dealershipID == "" {
		http.Error(w, "Missing dealership_id", http.StatusBadRequest)
		return
	}

	if err := s.db.DeleteTemplate(templateID, dealershipID); err != nil {
		http.Error(w, "Failed to delete template", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// GetLogHandler handles log retrieval
func (s *Server) GetLogHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	logID := vars["id"]
	dealershipID := r.URL.Query().Get("dealership_id")

	if dealershipID == "" {
		http.Error(w, "Missing dealership_id", http.StatusBadRequest)
		return
	}

	log, err := s.db.GetLog(logID, dealershipID)
	if err != nil {
		http.Error(w, "Log not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(log)
}

// ListLogsHandler handles log listing
func (s *Server) ListLogsHandler(w http.ResponseWriter, r *http.Request) {
	dealershipID := r.URL.Query().Get("dealership_id")
	if dealershipID == "" {
		http.Error(w, "Missing dealership_id", http.StatusBadRequest)
		return
	}

	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit := 50
	offset := 0

	if limitStr != "" {
		if val, err := strconv.Atoi(limitStr); err == nil {
			limit = val
		}
	}

	if offsetStr != "" {
		if val, err := strconv.Atoi(offsetStr); err == nil {
			offset = val
		}
	}

	logs, err := s.db.ListLogs(dealershipID, limit, offset)
	if err != nil {
		http.Error(w, "Failed to list logs", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(logs)
}

// LoadConfig loads configuration from environment variables
func LoadConfig() Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8004"
	}

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgres://postgres:postgres@localhost:5432/autolytiq_email?sslmode=disable"
	}

	smtpHost := os.Getenv("SMTP_HOST")
	if smtpHost == "" {
		smtpHost = "smtp.gmail.com"
	}

	smtpPortStr := os.Getenv("SMTP_PORT")
	smtpPort := 587
	if smtpPortStr != "" {
		if val, err := strconv.Atoi(smtpPortStr); err == nil {
			smtpPort = val
		}
	}

	smtpUsername := os.Getenv("SMTP_USERNAME")
	smtpPassword := os.Getenv("SMTP_PASSWORD")
	smtpFromEmail := os.Getenv("SMTP_FROM_EMAIL")

	smtpFromName := os.Getenv("SMTP_FROM_NAME")
	if smtpFromName == "" {
		smtpFromName = "Autolytiq"
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
	config := LoadConfig()

	server, err := NewServer(config)
	if err != nil {
		log.Fatalf("Failed to create server: %v", err)
	}
	defer server.db.Close()

	router := mux.NewRouter()

	// Health check
	router.HandleFunc("/health", server.HealthCheckHandler).Methods("GET")

	// Email sending
	router.HandleFunc("/email/send", server.SendEmailHandler).Methods("POST")
	router.HandleFunc("/email/send-template", server.SendTemplateEmailHandler).Methods("POST")

	// Template management
	router.HandleFunc("/email/templates", server.CreateTemplateHandler).Methods("POST")
	router.HandleFunc("/email/templates", server.ListTemplatesHandler).Methods("GET")
	router.HandleFunc("/email/templates/{id}", server.GetTemplateHandler).Methods("GET")
	router.HandleFunc("/email/templates/{id}", server.UpdateTemplateHandler).Methods("PUT")
	router.HandleFunc("/email/templates/{id}", server.DeleteTemplateHandler).Methods("DELETE")

	// Log management
	router.HandleFunc("/email/logs", server.ListLogsHandler).Methods("GET")
	router.HandleFunc("/email/logs/{id}", server.GetLogHandler).Methods("GET")

	log.Printf("Email Service starting on port %s", config.Port)
	log.Fatal(http.ListenAndServe(":"+config.Port, router))
}
