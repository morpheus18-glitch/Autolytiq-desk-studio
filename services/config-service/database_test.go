package main

import (
	"encoding/json"
	"os"
	"testing"
	"time"
)

// getTestDB returns a test database connection or skips the test
func getTestDB(t *testing.T) *PostgresConfigDB {
	connStr := os.Getenv("TEST_DATABASE_URL")
	if connStr == "" {
		t.Skip("TEST_DATABASE_URL not set, skipping database tests")
	}

	db, err := NewPostgresConfigDB(connStr)
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	// Clean up schema before each test
	db.db.Exec("DROP TABLE IF EXISTS dealership_config CASCADE")
	db.db.Exec("DROP TABLE IF EXISTS feature_flags CASCADE")
	db.db.Exec("DROP TABLE IF EXISTS integrations CASCADE")

	if err := db.InitSchema(); err != nil {
		t.Fatalf("Failed to initialize schema: %v", err)
	}

	return db
}

func TestDatabaseInitSchema(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	// Schema should be initialized successfully
	// Try to query each table
	_, err := db.db.Query("SELECT * FROM dealership_config LIMIT 0")
	if err != nil {
		t.Errorf("dealership_config table not created: %v", err)
	}

	_, err = db.db.Query("SELECT * FROM feature_flags LIMIT 0")
	if err != nil {
		t.Errorf("feature_flags table not created: %v", err)
	}

	_, err = db.db.Query("SELECT * FROM integrations LIMIT 0")
	if err != nil {
		t.Errorf("integrations table not created: %v", err)
	}
}

func TestDatabaseSetAndGetConfig(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	dealershipID := "dealer-test-1"
	key := "test_key"
	value := "test_value"
	configType := "string"
	category := "dealership"
	description := "Test description"

	// Set config
	err := db.SetConfig(dealershipID, key, value, configType, category, description)
	if err != nil {
		t.Fatalf("Failed to set config: %v", err)
	}

	// Get config
	config, err := db.GetConfig(dealershipID, key)
	if err != nil {
		t.Fatalf("Failed to get config: %v", err)
	}

	if config == nil {
		t.Fatal("Config should not be nil")
	}

	if config.DealershipID != dealershipID {
		t.Errorf("Wrong dealership_id: got %v want %v", config.DealershipID, dealershipID)
	}
	if config.Key != key {
		t.Errorf("Wrong key: got %v want %v", config.Key, key)
	}
	if config.Value != value {
		t.Errorf("Wrong value: got %v want %v", config.Value, value)
	}
	if config.Type != configType {
		t.Errorf("Wrong type: got %v want %v", config.Type, configType)
	}
	if config.Category != category {
		t.Errorf("Wrong category: got %v want %v", config.Category, category)
	}
}

func TestDatabaseUpdateConfig(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	dealershipID := "dealer-test-1"
	key := "test_key"

	// Set initial config
	db.SetConfig(dealershipID, key, "value1", "string", "dealership", "desc1")

	// Update config
	db.SetConfig(dealershipID, key, "value2", "string", "dealership", "desc2")

	// Get config
	config, _ := db.GetConfig(dealershipID, key)

	if config.Value != "value2" {
		t.Errorf("Value not updated: got %v want %v", config.Value, "value2")
	}
	if config.Description != "desc2" {
		t.Errorf("Description not updated: got %v want %v", config.Description, "desc2")
	}
}

func TestDatabaseGetConfigNotFound(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	config, err := db.GetConfig("dealer-nonexistent", "nonexistent_key")
	if err != nil {
		t.Fatalf("Should not error on not found: %v", err)
	}

	if config != nil {
		t.Error("Config should be nil when not found")
	}
}

func TestDatabaseGetConfigsByCategory(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	dealershipID := "dealer-test-1"

	// Set multiple configs
	db.SetConfig(dealershipID, "key1", "value1", "string", "dealership", "desc1")
	db.SetConfig(dealershipID, "key2", "value2", "string", "dealership", "desc2")
	db.SetConfig(dealershipID, "key3", "value3", "string", "sales", "desc3")

	// Get configs by category
	configs, err := db.GetConfigsByCategory(dealershipID, "dealership")
	if err != nil {
		t.Fatalf("Failed to get configs by category: %v", err)
	}

	if len(configs) != 2 {
		t.Errorf("Wrong number of configs: got %v want %v", len(configs), 2)
	}
}

func TestDatabaseDeleteConfig(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	dealershipID := "dealer-test-1"
	key := "test_key"

	// Set config
	db.SetConfig(dealershipID, key, "value", "string", "dealership", "desc")

	// Delete config
	err := db.DeleteConfig(dealershipID, key)
	if err != nil {
		t.Fatalf("Failed to delete config: %v", err)
	}

	// Verify it's gone
	config, _ := db.GetConfig(dealershipID, key)
	if config != nil {
		t.Error("Config should be deleted")
	}
}

func TestDatabaseDeleteConfigNotFound(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	err := db.DeleteConfig("dealer-test-1", "nonexistent_key")
	if err == nil {
		t.Error("Should error when deleting non-existent config")
	}
}

func TestDatabaseCreateFeatureFlag(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	flagKey := "test_flag"
	enabled := true
	rollout := 50
	description := "Test flag"

	flag, err := db.CreateFeatureFlag(flagKey, enabled, rollout, nil, description)
	if err != nil {
		t.Fatalf("Failed to create feature flag: %v", err)
	}

	if flag.FlagKey != flagKey {
		t.Errorf("Wrong flag_key: got %v want %v", flag.FlagKey, flagKey)
	}
	if flag.Enabled != enabled {
		t.Errorf("Wrong enabled: got %v want %v", flag.Enabled, enabled)
	}
	if flag.RolloutPercentage != rollout {
		t.Errorf("Wrong rollout_percentage: got %v want %v", flag.RolloutPercentage, rollout)
	}
}

func TestDatabaseGetFeatureFlag(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	flagKey := "test_flag"
	db.CreateFeatureFlag(flagKey, true, 50, nil, "Test flag")

	flag, err := db.GetFeatureFlag(flagKey)
	if err != nil {
		t.Fatalf("Failed to get feature flag: %v", err)
	}

	if flag == nil {
		t.Fatal("Flag should not be nil")
	}
	if flag.FlagKey != flagKey {
		t.Errorf("Wrong flag_key: got %v want %v", flag.FlagKey, flagKey)
	}
}

func TestDatabaseGetFeatureFlagNotFound(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	flag, err := db.GetFeatureFlag("nonexistent_flag")
	if err != nil {
		t.Fatalf("Should not error on not found: %v", err)
	}

	if flag != nil {
		t.Error("Flag should be nil when not found")
	}
}

func TestDatabaseListFeatureFlags(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	// Create multiple flags
	db.CreateFeatureFlag("flag1", true, 50, nil, "Flag 1")
	db.CreateFeatureFlag("flag2", false, 25, nil, "Flag 2")
	db.CreateFeatureFlag("flag3", true, 100, nil, "Flag 3")

	flags, err := db.ListFeatureFlags()
	if err != nil {
		t.Fatalf("Failed to list feature flags: %v", err)
	}

	if len(flags) != 3 {
		t.Errorf("Wrong number of flags: got %v want %v", len(flags), 3)
	}
}

func TestDatabaseUpdateFeatureFlag(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	flagKey := "test_flag"
	db.CreateFeatureFlag(flagKey, false, 25, nil, "Original")

	// Update flag
	flag, err := db.UpdateFeatureFlag(flagKey, true, 75, nil, "Updated")
	if err != nil {
		t.Fatalf("Failed to update feature flag: %v", err)
	}

	if flag.Enabled != true {
		t.Errorf("Enabled not updated: got %v want %v", flag.Enabled, true)
	}
	if flag.RolloutPercentage != 75 {
		t.Errorf("Rollout not updated: got %v want %v", flag.RolloutPercentage, 75)
	}
	if flag.Description != "Updated" {
		t.Errorf("Description not updated: got %v want %v", flag.Description, "Updated")
	}
}

func TestDatabaseUpdateFeatureFlagNotFound(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	_, err := db.UpdateFeatureFlag("nonexistent_flag", true, 50, nil, "Test")
	if err == nil {
		t.Error("Should error when updating non-existent flag")
	}
}

func TestDatabaseDeleteFeatureFlag(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	flagKey := "test_flag"
	db.CreateFeatureFlag(flagKey, true, 50, nil, "Test")

	// Delete flag
	err := db.DeleteFeatureFlag(flagKey)
	if err != nil {
		t.Fatalf("Failed to delete feature flag: %v", err)
	}

	// Verify it's gone
	flag, _ := db.GetFeatureFlag(flagKey)
	if flag != nil {
		t.Error("Flag should be deleted")
	}
}

func TestDatabaseDeleteFeatureFlagNotFound(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	err := db.DeleteFeatureFlag("nonexistent_flag")
	if err == nil {
		t.Error("Should error when deleting non-existent flag")
	}
}

func TestDatabaseEvaluateFeatureFlagEnabled(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	flagKey := "test_flag"
	db.CreateFeatureFlag(flagKey, true, 100, nil, "Test")

	enabled, err := db.EvaluateFeatureFlag(flagKey, "dealer-1")
	if err != nil {
		t.Fatalf("Failed to evaluate feature flag: %v", err)
	}

	if !enabled {
		t.Error("Flag should be enabled")
	}
}

func TestDatabaseEvaluateFeatureFlagDisabled(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	flagKey := "test_flag"
	db.CreateFeatureFlag(flagKey, false, 100, nil, "Test")

	enabled, err := db.EvaluateFeatureFlag(flagKey, "dealer-1")
	if err != nil {
		t.Fatalf("Failed to evaluate feature flag: %v", err)
	}

	if enabled {
		t.Error("Flag should be disabled")
	}
}

func TestDatabaseEvaluateFeatureFlagNotFound(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	_, err := db.EvaluateFeatureFlag("nonexistent_flag", "dealer-1")
	if err == nil {
		t.Error("Should error when evaluating non-existent flag")
	}
}

func TestDatabaseEvaluateFeatureFlagWithConstraints(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	flagKey := "test_flag"
	constraints := FlagConstraints{
		Dealerships: []string{"dealer-1", "dealer-2"},
	}
	constraintsJSON, _ := json.Marshal(constraints)

	db.CreateFeatureFlag(flagKey, true, 100, constraintsJSON, "Test")

	// Evaluate for allowed dealership
	enabled, err := db.EvaluateFeatureFlag(flagKey, "dealer-1")
	if err != nil {
		t.Fatalf("Failed to evaluate feature flag: %v", err)
	}
	if !enabled {
		t.Error("Flag should be enabled for dealer-1")
	}

	// Evaluate for non-allowed dealership
	enabled, err = db.EvaluateFeatureFlag(flagKey, "dealer-3")
	if err != nil {
		t.Fatalf("Failed to evaluate feature flag: %v", err)
	}
	if enabled {
		t.Error("Flag should be disabled for dealer-3")
	}
}

func TestDatabaseCreateIntegration(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	dealershipID := "dealer-test-1"
	provider := "credit_bureau"
	configJSON := json.RawMessage(`{"api_key": "test123"}`)
	status := "active"

	integration, err := db.CreateIntegration(dealershipID, provider, configJSON, status)
	if err != nil {
		t.Fatalf("Failed to create integration: %v", err)
	}

	if integration.DealershipID != dealershipID {
		t.Errorf("Wrong dealership_id: got %v want %v", integration.DealershipID, dealershipID)
	}
	if integration.Provider != provider {
		t.Errorf("Wrong provider: got %v want %v", integration.Provider, provider)
	}
	if integration.Status != status {
		t.Errorf("Wrong status: got %v want %v", integration.Status, status)
	}
}

func TestDatabaseGetIntegration(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	created, _ := db.CreateIntegration("dealer-test-1", "credit_bureau", json.RawMessage(`{}`), "active")

	integration, err := db.GetIntegration(created.ID)
	if err != nil {
		t.Fatalf("Failed to get integration: %v", err)
	}

	if integration == nil {
		t.Fatal("Integration should not be nil")
	}
	if integration.ID != created.ID {
		t.Errorf("Wrong ID: got %v want %v", integration.ID, created.ID)
	}
}

func TestDatabaseGetIntegrationNotFound(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	integration, err := db.GetIntegration("nonexistent-id")
	if err != nil {
		t.Fatalf("Should not error on not found: %v", err)
	}

	if integration != nil {
		t.Error("Integration should be nil when not found")
	}
}

func TestDatabaseListIntegrations(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	dealershipID := "dealer-test-1"

	// Create multiple integrations
	db.CreateIntegration(dealershipID, "credit_bureau", json.RawMessage(`{}`), "active")
	db.CreateIntegration(dealershipID, "inventory_feed", json.RawMessage(`{}`), "active")
	db.CreateIntegration("dealer-test-2", "accounting", json.RawMessage(`{}`), "active")

	integrations, err := db.ListIntegrations(dealershipID)
	if err != nil {
		t.Fatalf("Failed to list integrations: %v", err)
	}

	if len(integrations) != 2 {
		t.Errorf("Wrong number of integrations: got %v want %v", len(integrations), 2)
	}
}

func TestDatabaseUpdateIntegration(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	created, _ := db.CreateIntegration("dealer-test-1", "credit_bureau", json.RawMessage(`{"old": "value"}`), "active")

	now := time.Now()
	newConfigJSON := json.RawMessage(`{"new": "value"}`)

	integration, err := db.UpdateIntegration(created.ID, newConfigJSON, "inactive", &now)
	if err != nil {
		t.Fatalf("Failed to update integration: %v", err)
	}

	if integration.Status != "inactive" {
		t.Errorf("Status not updated: got %v want %v", integration.Status, "inactive")
	}
	if integration.LastSync == nil {
		t.Error("LastSync should not be nil")
	}
}

func TestDatabaseUpdateIntegrationNotFound(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	_, err := db.UpdateIntegration("nonexistent-id", json.RawMessage(`{}`), "active", nil)
	if err == nil {
		t.Error("Should error when updating non-existent integration")
	}
}

func TestDatabaseDeleteIntegration(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	created, _ := db.CreateIntegration("dealer-test-1", "credit_bureau", json.RawMessage(`{}`), "active")

	// Delete integration
	err := db.DeleteIntegration(created.ID)
	if err != nil {
		t.Fatalf("Failed to delete integration: %v", err)
	}

	// Verify it's gone
	integration, _ := db.GetIntegration(created.ID)
	if integration != nil {
		t.Error("Integration should be deleted")
	}
}

func TestDatabaseDeleteIntegrationNotFound(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	err := db.DeleteIntegration("nonexistent-id")
	if err == nil {
		t.Error("Should error when deleting non-existent integration")
	}
}
