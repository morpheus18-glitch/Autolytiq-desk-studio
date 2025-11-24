package main

import (
	"time"
)

// EmailTemplate represents an email template entity
type EmailTemplate struct {
	ID            string    `json:"id"`
	DealershipID  string    `json:"dealership_id"`
	Name          string    `json:"name"`
	Subject       string    `json:"subject"`
	BodyHTML      string    `json:"body_html"`
	Variables     []string  `json:"variables"` // List of available variables like ["customer_name", "deal_amount"]
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// EmailLog represents an email sending log entry
type EmailLog struct {
	ID           string    `json:"id"`
	DealershipID string    `json:"dealership_id"`
	Recipient    string    `json:"recipient"`
	Subject      string    `json:"subject"`
	TemplateID   *string   `json:"template_id,omitempty"` // Optional template reference
	Status       string    `json:"status"` // "pending", "sent", "failed"
	SentAt       *time.Time `json:"sent_at,omitempty"`
	Error        *string   `json:"error,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

// EmailDatabase defines the interface for email data operations
type EmailDatabase interface {
	// Connection management
	Close() error
	InitSchema() error

	// Template operations
	CreateTemplate(template *EmailTemplate) error
	GetTemplate(id string, dealershipID string) (*EmailTemplate, error)
	ListTemplates(dealershipID string, limit int, offset int) ([]*EmailTemplate, error)
	UpdateTemplate(template *EmailTemplate) error
	DeleteTemplate(id string, dealershipID string) error

	// Email log operations
	CreateLog(log *EmailLog) error
	GetLog(id string, dealershipID string) (*EmailLog, error)
	ListLogs(dealershipID string, limit int, offset int) ([]*EmailLog, error)
	UpdateLogStatus(id string, status string, sentAt *time.Time, errorMsg *string) error
}
