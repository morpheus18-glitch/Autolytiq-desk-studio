package main

import (
	"encoding/json"
	"time"
)

// DealershipConfig represents a configuration setting for a dealership
type DealershipConfig struct {
	DealershipID string    `json:"dealership_id"`
	Key          string    `json:"key"`
	Value        string    `json:"value"`
	Type         string    `json:"type"` // string, integer, boolean, json
	Category     string    `json:"category"`
	Description  string    `json:"description"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// FeatureFlag represents a feature flag with rollout controls
type FeatureFlag struct {
	ID                 string          `json:"id"`
	FlagKey            string          `json:"flag_key"`
	Enabled            bool            `json:"enabled"`
	RolloutPercentage  int             `json:"rollout_percentage"` // 0-100
	ConstraintsJSON    json.RawMessage `json:"constraints_json"`
	Description        string          `json:"description"`
	CreatedAt          time.Time       `json:"created_at"`
	UpdatedAt          time.Time       `json:"updated_at"`
}

// FlagConstraints represents targeting constraints for a feature flag
type FlagConstraints struct {
	Dealerships []string `json:"dealerships,omitempty"`
}

// Integration represents a third-party integration configuration
type Integration struct {
	ID           string          `json:"id"`
	DealershipID string          `json:"dealership_id"`
	Provider     string          `json:"provider"` // credit_bureau, inventory_feed, accounting, crm
	ConfigJSON   json.RawMessage `json:"config_json"`
	Status       string          `json:"status"` // active, inactive, error
	LastSync     *time.Time      `json:"last_sync,omitempty"`
	CreatedAt    time.Time       `json:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at"`
}

// ConfigDatabase defines the interface for configuration database operations
type ConfigDatabase interface {
	Close() error
	InitSchema() error

	// Configuration settings
	SetConfig(dealershipID, key, value, configType, category, description string) error
	GetConfig(dealershipID, key string) (*DealershipConfig, error)
	GetConfigsByCategory(dealershipID, category string) ([]DealershipConfig, error)
	DeleteConfig(dealershipID, key string) error

	// Feature flags
	CreateFeatureFlag(flagKey string, enabled bool, rolloutPercentage int, constraintsJSON json.RawMessage, description string) (*FeatureFlag, error)
	GetFeatureFlag(flagKey string) (*FeatureFlag, error)
	ListFeatureFlags() ([]FeatureFlag, error)
	UpdateFeatureFlag(flagKey string, enabled bool, rolloutPercentage int, constraintsJSON json.RawMessage, description string) (*FeatureFlag, error)
	DeleteFeatureFlag(flagKey string) error
	EvaluateFeatureFlag(flagKey, dealershipID string) (bool, error)

	// Integrations
	CreateIntegration(dealershipID, provider string, configJSON json.RawMessage, status string) (*Integration, error)
	GetIntegration(id string) (*Integration, error)
	ListIntegrations(dealershipID string) ([]Integration, error)
	UpdateIntegration(id string, configJSON json.RawMessage, status string, lastSync *time.Time) (*Integration, error)
	DeleteIntegration(id string) error
}
