package main

import "time"

// CustomerDatabase defines the interface for customer database operations
type CustomerDatabase interface {
	Close() error
	InitSchema() error
	CreateCustomer(customer *Customer) error
	GetCustomer(id string) (*Customer, error)
	ListCustomers(dealershipID string) ([]*Customer, error)
	UpdateCustomer(customer *Customer) error
	DeleteCustomer(id string) error

	// GDPR-related operations
	SoftDeleteCustomer(id string) error
	AnonymizeCustomer(id string) error
	GetCustomerWithGDPRFields(id string) (*CustomerWithGDPR, error)
	UpdateLastActivity(id string) error
	SetRetentionExpiry(id string, expiresAt time.Time) error
}

// CustomerWithGDPR extends Customer with GDPR-specific fields
type CustomerWithGDPR struct {
	Customer
	DeletedAt          *time.Time `json:"deleted_at,omitempty"`
	RetentionExpiresAt *time.Time `json:"retention_expires_at,omitempty"`
	AnonymizedAt       *time.Time `json:"anonymized_at,omitempty"`
	LastActivityAt     *time.Time `json:"last_activity_at,omitempty"`
}
