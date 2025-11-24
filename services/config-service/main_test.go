package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// MockDatabase implements ConfigDatabase for testing
type MockDatabase struct {
	configs      map[string]map[string]*DealershipConfig // dealershipID -> key -> config
	flags        map[string]*FeatureFlag                 // flagKey -> flag
	integrations map[string]*Integration                 // id -> integration
}

// NewMockDatabase creates a new mock database
func NewMockDatabase() *MockDatabase {
	return &MockDatabase{
		configs:      make(map[string]map[string]*DealershipConfig),
		flags:        make(map[string]*FeatureFlag),
		integrations: make(map[string]*Integration),
	}
}

func (m *MockDatabase) Close() error {
	return nil
}

func (m *MockDatabase) InitSchema() error {
	return nil
}

func (m *MockDatabase) SetConfig(dealershipID, key, value, configType, category, description string) error {
	if m.configs[dealershipID] == nil {
		m.configs[dealershipID] = make(map[string]*DealershipConfig)
	}

	now := time.Now()
	config, exists := m.configs[dealershipID][key]
	if exists {
		config.Value = value
		config.Type = configType
		config.Category = category
		config.Description = description
		config.UpdatedAt = now
	} else {
		m.configs[dealershipID][key] = &DealershipConfig{
			DealershipID: dealershipID,
			Key:          key,
			Value:        value,
			Type:         configType,
			Category:     category,
			Description:  description,
			CreatedAt:    now,
			UpdatedAt:    now,
		}
	}

	return nil
}

func (m *MockDatabase) GetConfig(dealershipID, key string) (*DealershipConfig, error) {
	if m.configs[dealershipID] == nil {
		return nil, nil
	}
	return m.configs[dealershipID][key], nil
}

func (m *MockDatabase) GetConfigsByCategory(dealershipID, category string) ([]DealershipConfig, error) {
	var configs []DealershipConfig
	if m.configs[dealershipID] != nil {
		for _, config := range m.configs[dealershipID] {
			if config.Category == category {
				configs = append(configs, *config)
			}
		}
	}
	return configs, nil
}

func (m *MockDatabase) DeleteConfig(dealershipID, key string) error {
	if m.configs[dealershipID] == nil || m.configs[dealershipID][key] == nil {
		return fmt.Errorf("config not found")
	}
	delete(m.configs[dealershipID], key)
	return nil
}

func (m *MockDatabase) CreateFeatureFlag(flagKey string, enabled bool, rolloutPercentage int, constraintsJSON json.RawMessage, description string) (*FeatureFlag, error) {
	if m.flags[flagKey] != nil {
		return nil, fmt.Errorf("feature flag already exists")
	}

	now := time.Now()
	flag := &FeatureFlag{
		ID:                "test-id-" + flagKey,
		FlagKey:           flagKey,
		Enabled:           enabled,
		RolloutPercentage: rolloutPercentage,
		ConstraintsJSON:   constraintsJSON,
		Description:       description,
		CreatedAt:         now,
		UpdatedAt:         now,
	}

	m.flags[flagKey] = flag
	return flag, nil
}

func (m *MockDatabase) GetFeatureFlag(flagKey string) (*FeatureFlag, error) {
	return m.flags[flagKey], nil
}

func (m *MockDatabase) ListFeatureFlags() ([]FeatureFlag, error) {
	var flags []FeatureFlag
	for _, flag := range m.flags {
		flags = append(flags, *flag)
	}
	return flags, nil
}

func (m *MockDatabase) UpdateFeatureFlag(flagKey string, enabled bool, rolloutPercentage int, constraintsJSON json.RawMessage, description string) (*FeatureFlag, error) {
	if m.flags[flagKey] == nil {
		return nil, fmt.Errorf("feature flag not found")
	}

	flag := m.flags[flagKey]
	flag.Enabled = enabled
	flag.RolloutPercentage = rolloutPercentage
	flag.ConstraintsJSON = constraintsJSON
	flag.Description = description
	flag.UpdatedAt = time.Now()

	return flag, nil
}

func (m *MockDatabase) DeleteFeatureFlag(flagKey string) error {
	if m.flags[flagKey] == nil {
		return fmt.Errorf("feature flag not found")
	}
	delete(m.flags, flagKey)
	return nil
}

func (m *MockDatabase) EvaluateFeatureFlag(flagKey, dealershipID string) (bool, error) {
	flag := m.flags[flagKey]
	if flag == nil {
		return false, fmt.Errorf("feature flag not found")
	}

	if !flag.Enabled {
		return false, nil
	}

	// Check constraints
	if len(flag.ConstraintsJSON) > 0 {
		var constraints FlagConstraints
		if err := json.Unmarshal(flag.ConstraintsJSON, &constraints); err != nil {
			return false, err
		}

		if len(constraints.Dealerships) > 0 {
			found := false
			for _, id := range constraints.Dealerships {
				if id == dealershipID {
					found = true
					break
				}
			}
			if !found {
				return false, nil
			}
		}
	}

	// Apply rollout percentage
	if flag.RolloutPercentage < 100 {
		hash := hashDealershipID(dealershipID)
		if hash%100 >= flag.RolloutPercentage {
			return false, nil
		}
	}

	return true, nil
}

func (m *MockDatabase) CreateIntegration(dealershipID, provider string, configJSON json.RawMessage, status string) (*Integration, error) {
	id := fmt.Sprintf("integration-%d", len(m.integrations)+1)
	now := time.Now()

	integration := &Integration{
		ID:           id,
		DealershipID: dealershipID,
		Provider:     provider,
		ConfigJSON:   configJSON,
		Status:       status,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	m.integrations[id] = integration
	return integration, nil
}

func (m *MockDatabase) GetIntegration(id string) (*Integration, error) {
	return m.integrations[id], nil
}

func (m *MockDatabase) ListIntegrations(dealershipID string) ([]Integration, error) {
	var integrations []Integration
	for _, integration := range m.integrations {
		if integration.DealershipID == dealershipID {
			integrations = append(integrations, *integration)
		}
	}
	return integrations, nil
}

func (m *MockDatabase) UpdateIntegration(id string, configJSON json.RawMessage, status string, lastSync *time.Time) (*Integration, error) {
	if m.integrations[id] == nil {
		return nil, fmt.Errorf("integration not found")
	}

	integration := m.integrations[id]
	integration.ConfigJSON = configJSON
	integration.Status = status
	integration.LastSync = lastSync
	integration.UpdatedAt = time.Now()

	return integration, nil
}

func (m *MockDatabase) DeleteIntegration(id string) error {
	if m.integrations[id] == nil {
		return fmt.Errorf("integration not found")
	}
	delete(m.integrations, id)
	return nil
}

// Test helper functions

func makeRequest(t *testing.T, server *Server, method, path string, body interface{}, dealershipID string) *httptest.ResponseRecorder {
	var bodyBytes []byte
	if body != nil {
		var err error
		bodyBytes, err = json.Marshal(body)
		if err != nil {
			t.Fatalf("Failed to marshal request body: %v", err)
		}
	}

	req := httptest.NewRequest(method, path, bytes.NewBuffer(bodyBytes))
	if dealershipID != "" {
		req.Header.Set("X-Dealership-ID", dealershipID)
	}
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	server.router.ServeHTTP(rr, req)

	return rr
}

// Tests

func TestHealthEndpoint(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	rr := makeRequest(t, server, "GET", "/health", nil, "")

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	var response map[string]string
	if err := json.Unmarshal(rr.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response["status"] != "healthy" {
		t.Errorf("handler returned unexpected status: got %v want %v", response["status"], "healthy")
	}
}

func TestSetAndGetConfig(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)
	dealershipID := "dealer-1"

	// Set a config
	setReq := SetSettingRequest{
		Value:       "Acme Motors",
		Type:        "string",
		Category:    "dealership",
		Description: "Dealership name",
	}

	rr := makeRequest(t, server, "PUT", "/config/settings/name", setReq, dealershipID)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("SET handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	// Get the config
	rr = makeRequest(t, server, "GET", "/config/settings/name", nil, dealershipID)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("GET handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	var config DealershipConfig
	if err := json.Unmarshal(rr.Body.Bytes(), &config); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if config.Value != "Acme Motors" {
		t.Errorf("handler returned unexpected value: got %v want %v", config.Value, "Acme Motors")
	}
	if config.Category != "dealership" {
		t.Errorf("handler returned unexpected category: got %v want %v", config.Category, "dealership")
	}
}

func TestGetConfigNotFound(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)
	dealershipID := "dealer-1"

	rr := makeRequest(t, server, "GET", "/config/settings/nonexistent", nil, dealershipID)

	if status := rr.Code; status != http.StatusNotFound {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusNotFound)
	}
}

func TestSetConfigInvalidType(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)
	dealershipID := "dealer-1"

	setReq := SetSettingRequest{
		Value:    "test",
		Type:     "invalid",
		Category: "dealership",
	}

	rr := makeRequest(t, server, "PUT", "/config/settings/test", setReq, dealershipID)

	if status := rr.Code; status != http.StatusBadRequest {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusBadRequest)
	}
}

func TestSetConfigInvalidCategory(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)
	dealershipID := "dealer-1"

	setReq := SetSettingRequest{
		Value:    "test",
		Type:     "string",
		Category: "invalid",
	}

	rr := makeRequest(t, server, "PUT", "/config/settings/test", setReq, dealershipID)

	if status := rr.Code; status != http.StatusBadRequest {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusBadRequest)
	}
}

func TestDeleteConfig(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)
	dealershipID := "dealer-1"

	// Set a config first
	setReq := SetSettingRequest{
		Value:    "test",
		Type:     "string",
		Category: "dealership",
	}
	makeRequest(t, server, "PUT", "/config/settings/test", setReq, dealershipID)

	// Delete it
	rr := makeRequest(t, server, "DELETE", "/config/settings/test", nil, dealershipID)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("DELETE handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	// Verify it's gone
	rr = makeRequest(t, server, "GET", "/config/settings/test", nil, dealershipID)

	if status := rr.Code; status != http.StatusNotFound {
		t.Errorf("GET handler should return 404 after delete: got %v want %v", status, http.StatusNotFound)
	}
}

func TestGetConfigsByCategory(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)
	dealershipID := "dealer-1"

	// Set multiple configs in same category
	configs := []struct {
		key   string
		value string
	}{
		{"name", "Acme Motors"},
		{"address", "123 Main St"},
		{"phone", "555-1234"},
	}

	for _, cfg := range configs {
		setReq := SetSettingRequest{
			Value:    cfg.value,
			Type:     "string",
			Category: "dealership",
		}
		makeRequest(t, server, "PUT", "/config/settings/"+cfg.key, setReq, dealershipID)
	}

	// Get all configs in category
	rr := makeRequest(t, server, "GET", "/config/categories/dealership", nil, dealershipID)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	var result []DealershipConfig
	if err := json.Unmarshal(rr.Body.Bytes(), &result); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if len(result) != 3 {
		t.Errorf("handler returned unexpected number of configs: got %v want %v", len(result), 3)
	}
}

func TestGetAllSettings(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)
	dealershipID := "dealer-1"

	// Set configs in different categories
	configs := []struct {
		key      string
		value    string
		category string
	}{
		{"name", "Acme Motors", "dealership"},
		{"default_term", "72", "sales"},
		{"primary_lender", "Bank A", "financing"},
	}

	for _, cfg := range configs {
		setReq := SetSettingRequest{
			Value:    cfg.value,
			Type:     "string",
			Category: cfg.category,
		}
		makeRequest(t, server, "PUT", "/config/settings/"+cfg.key, setReq, dealershipID)
	}

	// Get all settings
	rr := makeRequest(t, server, "GET", "/config/settings", nil, dealershipID)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	var result map[string][]DealershipConfig
	if err := json.Unmarshal(rr.Body.Bytes(), &result); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if len(result["dealership"]) != 1 {
		t.Errorf("unexpected number of dealership configs: got %v want %v", len(result["dealership"]), 1)
	}
	if len(result["sales"]) != 1 {
		t.Errorf("unexpected number of sales configs: got %v want %v", len(result["sales"]), 1)
	}
	if len(result["financing"]) != 1 {
		t.Errorf("unexpected number of financing configs: got %v want %v", len(result["financing"]), 1)
	}
}

func TestMultiTenantIsolation(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	// Set config for dealer-1
	setReq := SetSettingRequest{
		Value:    "Dealer 1",
		Type:     "string",
		Category: "dealership",
	}
	makeRequest(t, server, "PUT", "/config/settings/name", setReq, "dealer-1")

	// Set config for dealer-2
	setReq.Value = "Dealer 2"
	makeRequest(t, server, "PUT", "/config/settings/name", setReq, "dealer-2")

	// Verify dealer-1 sees only their config
	rr := makeRequest(t, server, "GET", "/config/settings/name", nil, "dealer-1")
	var config DealershipConfig
	json.Unmarshal(rr.Body.Bytes(), &config)
	if config.Value != "Dealer 1" {
		t.Errorf("dealer-1 got wrong config: got %v want %v", config.Value, "Dealer 1")
	}

	// Verify dealer-2 sees only their config
	rr = makeRequest(t, server, "GET", "/config/settings/name", nil, "dealer-2")
	json.Unmarshal(rr.Body.Bytes(), &config)
	if config.Value != "Dealer 2" {
		t.Errorf("dealer-2 got wrong config: got %v want %v", config.Value, "Dealer 2")
	}
}

func TestCreateFeatureFlag(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	createReq := CreateFeatureFlagRequest{
		FlagKey:           "new_ui",
		Enabled:           true,
		RolloutPercentage: 50,
		Description:       "New UI redesign",
	}

	rr := makeRequest(t, server, "POST", "/config/features", createReq, "")

	if status := rr.Code; status != http.StatusCreated {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusCreated)
	}

	var flag FeatureFlag
	if err := json.Unmarshal(rr.Body.Bytes(), &flag); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if flag.FlagKey != "new_ui" {
		t.Errorf("handler returned unexpected flag key: got %v want %v", flag.FlagKey, "new_ui")
	}
	if flag.Enabled != true {
		t.Errorf("handler returned unexpected enabled: got %v want %v", flag.Enabled, true)
	}
	if flag.RolloutPercentage != 50 {
		t.Errorf("handler returned unexpected rollout: got %v want %v", flag.RolloutPercentage, 50)
	}
}

func TestListFeatureFlags(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	// Create multiple flags
	flags := []string{"flag1", "flag2", "flag3"}
	for _, flagKey := range flags {
		createReq := CreateFeatureFlagRequest{
			FlagKey: flagKey,
			Enabled: true,
		}
		makeRequest(t, server, "POST", "/config/features", createReq, "")
	}

	// List all flags
	rr := makeRequest(t, server, "GET", "/config/features", nil, "")

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	var result []FeatureFlag
	if err := json.Unmarshal(rr.Body.Bytes(), &result); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if len(result) != 3 {
		t.Errorf("handler returned unexpected number of flags: got %v want %v", len(result), 3)
	}
}

func TestGetFeatureFlag(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	// Create a flag
	createReq := CreateFeatureFlagRequest{
		FlagKey:     "test_flag",
		Enabled:     true,
		Description: "Test flag",
	}
	makeRequest(t, server, "POST", "/config/features", createReq, "")

	// Get the flag
	rr := makeRequest(t, server, "GET", "/config/features/test_flag", nil, "")

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	var flag FeatureFlag
	if err := json.Unmarshal(rr.Body.Bytes(), &flag); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if flag.FlagKey != "test_flag" {
		t.Errorf("handler returned unexpected flag key: got %v want %v", flag.FlagKey, "test_flag")
	}
}

func TestUpdateFeatureFlag(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	// Create a flag
	createReq := CreateFeatureFlagRequest{
		FlagKey: "test_flag",
		Enabled: false,
	}
	makeRequest(t, server, "POST", "/config/features", createReq, "")

	// Update it
	updateReq := UpdateFeatureFlagRequest{
		Enabled:           true,
		RolloutPercentage: 75,
		Description:       "Updated description",
	}
	rr := makeRequest(t, server, "PUT", "/config/features/test_flag", updateReq, "")

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	var flag FeatureFlag
	if err := json.Unmarshal(rr.Body.Bytes(), &flag); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if flag.Enabled != true {
		t.Errorf("handler returned unexpected enabled: got %v want %v", flag.Enabled, true)
	}
	if flag.RolloutPercentage != 75 {
		t.Errorf("handler returned unexpected rollout: got %v want %v", flag.RolloutPercentage, 75)
	}
}

func TestDeleteFeatureFlag(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	// Create a flag
	createReq := CreateFeatureFlagRequest{
		FlagKey: "test_flag",
		Enabled: true,
	}
	makeRequest(t, server, "POST", "/config/features", createReq, "")

	// Delete it
	rr := makeRequest(t, server, "DELETE", "/config/features/test_flag", nil, "")

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("DELETE handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	// Verify it's gone
	rr = makeRequest(t, server, "GET", "/config/features/test_flag", nil, "")

	if status := rr.Code; status != http.StatusNotFound {
		t.Errorf("GET handler should return 404 after delete: got %v want %v", status, http.StatusNotFound)
	}
}

func TestEvaluateFeatureFlagEnabled(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	// Create an enabled flag
	createReq := CreateFeatureFlagRequest{
		FlagKey:           "test_flag",
		Enabled:           true,
		RolloutPercentage: 100,
	}
	makeRequest(t, server, "POST", "/config/features", createReq, "")

	// Evaluate it
	evalReq := EvaluateFeatureFlagRequest{
		DealershipID: "dealer-1",
	}
	rr := makeRequest(t, server, "POST", "/config/features/test_flag/evaluate", evalReq, "")

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	var result map[string]bool
	if err := json.Unmarshal(rr.Body.Bytes(), &result); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if result["enabled"] != true {
		t.Errorf("handler returned unexpected enabled: got %v want %v", result["enabled"], true)
	}
}

func TestEvaluateFeatureFlagDisabled(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	// Create a disabled flag
	createReq := CreateFeatureFlagRequest{
		FlagKey: "test_flag",
		Enabled: false,
	}
	makeRequest(t, server, "POST", "/config/features", createReq, "")

	// Evaluate it
	evalReq := EvaluateFeatureFlagRequest{
		DealershipID: "dealer-1",
	}
	rr := makeRequest(t, server, "POST", "/config/features/test_flag/evaluate", evalReq, "")

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	var result map[string]bool
	if err := json.Unmarshal(rr.Body.Bytes(), &result); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if result["enabled"] != false {
		t.Errorf("handler returned unexpected enabled: got %v want %v", result["enabled"], false)
	}
}

func TestEvaluateFeatureFlagWithConstraints(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	// Create a flag with dealership constraints
	constraints := FlagConstraints{
		Dealerships: []string{"dealer-1", "dealer-2"},
	}
	constraintsJSON, _ := json.Marshal(constraints)

	createReq := CreateFeatureFlagRequest{
		FlagKey:           "test_flag",
		Enabled:           true,
		RolloutPercentage: 100, // Must be 100% for constraints to work
		ConstraintsJSON:   constraintsJSON,
	}
	makeRequest(t, server, "POST", "/config/features", createReq, "")

	// Evaluate for allowed dealership
	evalReq := EvaluateFeatureFlagRequest{
		DealershipID: "dealer-1",
	}
	rr := makeRequest(t, server, "POST", "/config/features/test_flag/evaluate", evalReq, "")

	var result map[string]bool
	json.Unmarshal(rr.Body.Bytes(), &result)
	if result["enabled"] != true {
		t.Errorf("flag should be enabled for dealer-1: got %v want %v", result["enabled"], true)
	}

	// Evaluate for non-allowed dealership
	evalReq.DealershipID = "dealer-3"
	rr = makeRequest(t, server, "POST", "/config/features/test_flag/evaluate", evalReq, "")

	json.Unmarshal(rr.Body.Bytes(), &result)
	if result["enabled"] != false {
		t.Errorf("flag should be disabled for dealer-3: got %v want %v", result["enabled"], false)
	}
}

func TestCreateIntegration(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	configJSON := json.RawMessage(`{"api_key": "test123"}`)
	createReq := CreateIntegrationRequest{
		DealershipID: "dealer-1",
		Provider:     "credit_bureau",
		ConfigJSON:   configJSON,
		Status:       "active",
	}

	rr := makeRequest(t, server, "POST", "/config/integrations", createReq, "")

	if status := rr.Code; status != http.StatusCreated {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusCreated)
	}

	var integration Integration
	if err := json.Unmarshal(rr.Body.Bytes(), &integration); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if integration.Provider != "credit_bureau" {
		t.Errorf("handler returned unexpected provider: got %v want %v", integration.Provider, "credit_bureau")
	}
	if integration.Status != "active" {
		t.Errorf("handler returned unexpected status: got %v want %v", integration.Status, "active")
	}
}

func TestCreateIntegrationInvalidProvider(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	createReq := CreateIntegrationRequest{
		DealershipID: "dealer-1",
		Provider:     "invalid",
		ConfigJSON:   json.RawMessage(`{}`),
		Status:       "active",
	}

	rr := makeRequest(t, server, "POST", "/config/integrations", createReq, "")

	if status := rr.Code; status != http.StatusBadRequest {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusBadRequest)
	}
}

func TestListIntegrations(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	// Create multiple integrations
	providers := []string{"credit_bureau", "inventory_feed", "accounting"}
	for _, provider := range providers {
		createReq := CreateIntegrationRequest{
			DealershipID: "dealer-1",
			Provider:     provider,
			ConfigJSON:   json.RawMessage(`{}`),
			Status:       "active",
		}
		makeRequest(t, server, "POST", "/config/integrations", createReq, "")
	}

	// List integrations
	rr := makeRequest(t, server, "GET", "/config/integrations", nil, "dealer-1")

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	var result []Integration
	if err := json.Unmarshal(rr.Body.Bytes(), &result); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if len(result) != 3 {
		t.Errorf("handler returned unexpected number of integrations: got %v want %v", len(result), 3)
	}
}

func TestGetIntegration(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	// Create an integration
	createReq := CreateIntegrationRequest{
		DealershipID: "dealer-1",
		Provider:     "credit_bureau",
		ConfigJSON:   json.RawMessage(`{"api_key": "test"}`),
		Status:       "active",
	}
	createRr := makeRequest(t, server, "POST", "/config/integrations", createReq, "")

	var created Integration
	json.Unmarshal(createRr.Body.Bytes(), &created)

	// Get the integration
	rr := makeRequest(t, server, "GET", "/config/integrations/"+created.ID, nil, "")

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	var integration Integration
	if err := json.Unmarshal(rr.Body.Bytes(), &integration); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if integration.ID != created.ID {
		t.Errorf("handler returned unexpected ID: got %v want %v", integration.ID, created.ID)
	}
}

func TestUpdateIntegration(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	// Create an integration
	createReq := CreateIntegrationRequest{
		DealershipID: "dealer-1",
		Provider:     "credit_bureau",
		ConfigJSON:   json.RawMessage(`{"api_key": "old"}`),
		Status:       "active",
	}
	createRr := makeRequest(t, server, "POST", "/config/integrations", createReq, "")

	var created Integration
	json.Unmarshal(createRr.Body.Bytes(), &created)

	// Update it
	now := time.Now()
	updateReq := UpdateIntegrationRequest{
		ConfigJSON: json.RawMessage(`{"api_key": "new"}`),
		Status:     "inactive",
		LastSync:   &now,
	}
	rr := makeRequest(t, server, "PUT", "/config/integrations/"+created.ID, updateReq, "")

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	var updated Integration
	if err := json.Unmarshal(rr.Body.Bytes(), &updated); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if updated.Status != "inactive" {
		t.Errorf("handler returned unexpected status: got %v want %v", updated.Status, "inactive")
	}
	if updated.LastSync == nil {
		t.Errorf("handler returned nil LastSync")
	}
}

func TestDeleteIntegration(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	// Create an integration
	createReq := CreateIntegrationRequest{
		DealershipID: "dealer-1",
		Provider:     "credit_bureau",
		ConfigJSON:   json.RawMessage(`{}`),
		Status:       "active",
	}
	createRr := makeRequest(t, server, "POST", "/config/integrations", createReq, "")

	var created Integration
	json.Unmarshal(createRr.Body.Bytes(), &created)

	// Delete it
	rr := makeRequest(t, server, "DELETE", "/config/integrations/"+created.ID, nil, "")

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("DELETE handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	// Verify it's gone
	rr = makeRequest(t, server, "GET", "/config/integrations/"+created.ID, nil, "")

	if status := rr.Code; status != http.StatusNotFound {
		t.Errorf("GET handler should return 404 after delete: got %v want %v", status, http.StatusNotFound)
	}
}

func TestIntegrationMultiTenantIsolation(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	// Create integrations for different dealerships
	createReq := CreateIntegrationRequest{
		DealershipID: "dealer-1",
		Provider:     "credit_bureau",
		ConfigJSON:   json.RawMessage(`{}`),
		Status:       "active",
	}
	makeRequest(t, server, "POST", "/config/integrations", createReq, "")

	createReq.DealershipID = "dealer-2"
	createReq.Provider = "inventory_feed"
	makeRequest(t, server, "POST", "/config/integrations", createReq, "")

	// List integrations for dealer-1
	rr := makeRequest(t, server, "GET", "/config/integrations", nil, "dealer-1")

	var integrations []Integration
	json.Unmarshal(rr.Body.Bytes(), &integrations)

	if len(integrations) != 1 {
		t.Errorf("dealer-1 should see only 1 integration: got %v", len(integrations))
	}
	if integrations[0].Provider != "credit_bureau" {
		t.Errorf("dealer-1 got wrong provider: got %v want %v", integrations[0].Provider, "credit_bureau")
	}
}

func TestMissingDealershipHeader(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	// Try to get settings without dealership header
	rr := makeRequest(t, server, "GET", "/config/settings/test", nil, "")

	if status := rr.Code; status != http.StatusBadRequest {
		t.Errorf("handler should return 400 without dealership header: got %v want %v", status, http.StatusBadRequest)
	}
}

func TestInvalidRolloutPercentage(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	// Test creating flag with invalid rollout percentage
	createReq := CreateFeatureFlagRequest{
		FlagKey:           "test_flag",
		Enabled:           true,
		RolloutPercentage: 101,
	}

	rr := makeRequest(t, server, "POST", "/config/features", createReq, "")

	if status := rr.Code; status != http.StatusBadRequest {
		t.Errorf("handler should return 400 for invalid rollout: got %v want %v", status, http.StatusBadRequest)
	}
}

func TestSetConfigMissingDealershipHeader(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	setReq := SetSettingRequest{
		Value:    "test",
		Type:     "string",
		Category: "dealership",
	}

	rr := makeRequest(t, server, "PUT", "/config/settings/test", setReq, "")

	if status := rr.Code; status != http.StatusBadRequest {
		t.Errorf("handler should return 400 without dealership header: got %v want %v", status, http.StatusBadRequest)
	}
}

func TestDeleteConfigMissingDealershipHeader(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	rr := makeRequest(t, server, "DELETE", "/config/settings/test", nil, "")

	if status := rr.Code; status != http.StatusBadRequest {
		t.Errorf("handler should return 400 without dealership header: got %v want %v", status, http.StatusBadRequest)
	}
}

func TestGetCategoryMissingDealershipHeader(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	rr := makeRequest(t, server, "GET", "/config/categories/dealership", nil, "")

	if status := rr.Code; status != http.StatusBadRequest {
		t.Errorf("handler should return 400 without dealership header: got %v want %v", status, http.StatusBadRequest)
	}
}

func TestGetAllSettingsMissingDealershipHeader(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	rr := makeRequest(t, server, "GET", "/config/settings", nil, "")

	if status := rr.Code; status != http.StatusBadRequest {
		t.Errorf("handler should return 400 without dealership header: got %v want %v", status, http.StatusBadRequest)
	}
}

func TestGetCategoryInvalidCategory(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	rr := makeRequest(t, server, "GET", "/config/categories/invalid_category", nil, "dealer-1")

	if status := rr.Code; status != http.StatusBadRequest {
		t.Errorf("handler should return 400 for invalid category: got %v want %v", status, http.StatusBadRequest)
	}
}

func TestGetFeatureFlagNotFound(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	rr := makeRequest(t, server, "GET", "/config/features/nonexistent", nil, "")

	if status := rr.Code; status != http.StatusNotFound {
		t.Errorf("handler should return 404 for non-existent flag: got %v want %v", status, http.StatusNotFound)
	}
}

func TestUpdateFeatureFlagNotFound(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	updateReq := UpdateFeatureFlagRequest{
		Enabled:           true,
		RolloutPercentage: 50,
	}

	rr := makeRequest(t, server, "PUT", "/config/features/nonexistent", updateReq, "")

	if status := rr.Code; status != http.StatusInternalServerError {
		t.Errorf("handler should return 500 for non-existent flag: got %v want %v", status, http.StatusInternalServerError)
	}
}

func TestDeleteFeatureFlagNotFound(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	rr := makeRequest(t, server, "DELETE", "/config/features/nonexistent", nil, "")

	if status := rr.Code; status != http.StatusInternalServerError {
		t.Errorf("handler should return 500 for non-existent flag: got %v want %v", status, http.StatusInternalServerError)
	}
}

func TestUpdateFeatureFlagInvalidRollout(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	// Create a flag first
	createReq := CreateFeatureFlagRequest{
		FlagKey: "test_flag",
		Enabled: true,
	}
	makeRequest(t, server, "POST", "/config/features", createReq, "")

	// Try to update with invalid rollout
	updateReq := UpdateFeatureFlagRequest{
		Enabled:           true,
		RolloutPercentage: -10,
	}

	rr := makeRequest(t, server, "PUT", "/config/features/test_flag", updateReq, "")

	if status := rr.Code; status != http.StatusBadRequest {
		t.Errorf("handler should return 400 for invalid rollout: got %v want %v", status, http.StatusBadRequest)
	}
}

func TestEvaluateFeatureFlagNotFound(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	evalReq := EvaluateFeatureFlagRequest{
		DealershipID: "dealer-1",
	}

	rr := makeRequest(t, server, "POST", "/config/features/nonexistent/evaluate", evalReq, "")

	if status := rr.Code; status != http.StatusInternalServerError {
		t.Errorf("handler should return 500 for non-existent flag: got %v want %v", status, http.StatusInternalServerError)
	}
}

func TestCreateIntegrationInvalidStatus(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	createReq := CreateIntegrationRequest{
		DealershipID: "dealer-1",
		Provider:     "credit_bureau",
		ConfigJSON:   json.RawMessage(`{}`),
		Status:       "invalid_status",
	}

	rr := makeRequest(t, server, "POST", "/config/integrations", createReq, "")

	if status := rr.Code; status != http.StatusBadRequest {
		t.Errorf("handler should return 400 for invalid status: got %v want %v", status, http.StatusBadRequest)
	}
}

func TestListIntegrationsMissingDealershipHeader(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	rr := makeRequest(t, server, "GET", "/config/integrations", nil, "")

	if status := rr.Code; status != http.StatusBadRequest {
		t.Errorf("handler should return 400 without dealership header: got %v want %v", status, http.StatusBadRequest)
	}
}

func TestGetIntegrationNotFound(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	rr := makeRequest(t, server, "GET", "/config/integrations/nonexistent-id", nil, "")

	if status := rr.Code; status != http.StatusNotFound {
		t.Errorf("handler should return 404 for non-existent integration: got %v want %v", status, http.StatusNotFound)
	}
}

func TestUpdateIntegrationNotFound(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	updateReq := UpdateIntegrationRequest{
		ConfigJSON: json.RawMessage(`{}`),
		Status:     "active",
	}

	rr := makeRequest(t, server, "PUT", "/config/integrations/nonexistent-id", updateReq, "")

	if status := rr.Code; status != http.StatusInternalServerError {
		t.Errorf("handler should return 500 for non-existent integration: got %v want %v", status, http.StatusInternalServerError)
	}
}

func TestUpdateIntegrationInvalidStatus(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	// Create an integration first
	createReq := CreateIntegrationRequest{
		DealershipID: "dealer-1",
		Provider:     "credit_bureau",
		ConfigJSON:   json.RawMessage(`{}`),
		Status:       "active",
	}
	createRr := makeRequest(t, server, "POST", "/config/integrations", createReq, "")

	var created Integration
	json.Unmarshal(createRr.Body.Bytes(), &created)

	// Try to update with invalid status
	updateReq := UpdateIntegrationRequest{
		ConfigJSON: json.RawMessage(`{}`),
		Status:     "invalid_status",
	}

	rr := makeRequest(t, server, "PUT", "/config/integrations/"+created.ID, updateReq, "")

	if status := rr.Code; status != http.StatusBadRequest {
		t.Errorf("handler should return 400 for invalid status: got %v want %v", status, http.StatusBadRequest)
	}
}

func TestDeleteIntegrationNotFound(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	rr := makeRequest(t, server, "DELETE", "/config/integrations/nonexistent-id", nil, "")

	if status := rr.Code; status != http.StatusInternalServerError {
		t.Errorf("handler should return 500 for non-existent integration: got %v want %v", status, http.StatusInternalServerError)
	}
}

func TestSetConfigInvalidJSON(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	req := httptest.NewRequest("PUT", "/config/settings/test", bytes.NewBuffer([]byte("invalid json")))
	req.Header.Set("X-Dealership-ID", "dealer-1")
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	server.router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusBadRequest {
		t.Errorf("handler should return 400 for invalid JSON: got %v want %v", status, http.StatusBadRequest)
	}
}

func TestCreateFeatureFlagInvalidJSON(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	req := httptest.NewRequest("POST", "/config/features", bytes.NewBuffer([]byte("invalid json")))
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	server.router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusBadRequest {
		t.Errorf("handler should return 400 for invalid JSON: got %v want %v", status, http.StatusBadRequest)
	}
}

func TestUpdateFeatureFlagInvalidJSON(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	req := httptest.NewRequest("PUT", "/config/features/test", bytes.NewBuffer([]byte("invalid json")))
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	server.router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusBadRequest {
		t.Errorf("handler should return 400 for invalid JSON: got %v want %v", status, http.StatusBadRequest)
	}
}

func TestEvaluateFeatureFlagInvalidJSON(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	req := httptest.NewRequest("POST", "/config/features/test/evaluate", bytes.NewBuffer([]byte("invalid json")))
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	server.router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusBadRequest {
		t.Errorf("handler should return 400 for invalid JSON: got %v want %v", status, http.StatusBadRequest)
	}
}

func TestCreateIntegrationInvalidJSON(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	req := httptest.NewRequest("POST", "/config/integrations", bytes.NewBuffer([]byte("invalid json")))
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	server.router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusBadRequest {
		t.Errorf("handler should return 400 for invalid JSON: got %v want %v", status, http.StatusBadRequest)
	}
}

func TestUpdateIntegrationInvalidJSON(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	req := httptest.NewRequest("PUT", "/config/integrations/test-id", bytes.NewBuffer([]byte("invalid json")))
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	server.router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusBadRequest {
		t.Errorf("handler should return 400 for invalid JSON: got %v want %v", status, http.StatusBadRequest)
	}
}

func TestConfigTypeValidation(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	tests := []struct {
		configType string
		shouldPass bool
	}{
		{"string", true},
		{"integer", true},
		{"boolean", true},
		{"json", true},
		{"invalid", false},
		{"float", false},
	}

	for _, tt := range tests {
		setReq := SetSettingRequest{
			Value:    "test",
			Type:     tt.configType,
			Category: "dealership",
		}

		rr := makeRequest(t, server, "PUT", "/config/settings/test", setReq, "dealer-1")

		if tt.shouldPass && rr.Code != http.StatusOK {
			t.Errorf("type %s should pass but got status %d", tt.configType, rr.Code)
		}
		if !tt.shouldPass && rr.Code == http.StatusOK {
			t.Errorf("type %s should fail but got status %d", tt.configType, rr.Code)
		}
	}
}

func TestCategoryValidation(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	tests := []struct {
		category   string
		shouldPass bool
	}{
		{"dealership", true},
		{"sales", true},
		{"financing", true},
		{"notifications", true},
		{"ui", true},
		{"invalid", false},
		{"admin", false},
	}

	for _, tt := range tests {
		setReq := SetSettingRequest{
			Value:    "test",
			Type:     "string",
			Category: tt.category,
		}

		rr := makeRequest(t, server, "PUT", "/config/settings/test", setReq, "dealer-1")

		if tt.shouldPass && rr.Code != http.StatusOK {
			t.Errorf("category %s should pass but got status %d", tt.category, rr.Code)
		}
		if !tt.shouldPass && rr.Code == http.StatusOK {
			t.Errorf("category %s should fail but got status %d", tt.category, rr.Code)
		}
	}
}

func TestProviderValidation(t *testing.T) {
	db := NewMockDatabase()
	server := NewServer(db)

	tests := []struct {
		provider   string
		shouldPass bool
	}{
		{"credit_bureau", true},
		{"inventory_feed", true},
		{"accounting", true},
		{"crm", true},
		{"invalid", false},
		{"email", false},
	}

	for _, tt := range tests {
		createReq := CreateIntegrationRequest{
			DealershipID: "dealer-1",
			Provider:     tt.provider,
			ConfigJSON:   json.RawMessage(`{}`),
			Status:       "active",
		}

		rr := makeRequest(t, server, "POST", "/config/integrations", createReq, "")

		if tt.shouldPass && rr.Code != http.StatusCreated {
			t.Errorf("provider %s should pass but got status %d", tt.provider, rr.Code)
		}
		if !tt.shouldPass && rr.Code == http.StatusCreated {
			t.Errorf("provider %s should fail but got status %d", tt.provider, rr.Code)
		}
	}
}
