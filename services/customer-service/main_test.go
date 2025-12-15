package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"autolytiq/shared/logging"

	"github.com/google/uuid"
)

// MockDatabase is a mock implementation of the Database for testing
type MockDatabase struct {
	customers     map[string]*Customer
	gdprFields    map[string]*CustomerWithGDPR
	lastActivity  map[string]time.Time
}

func NewMockDatabase() *MockDatabase {
	return &MockDatabase{
		customers:    make(map[string]*Customer),
		gdprFields:   make(map[string]*CustomerWithGDPR),
		lastActivity: make(map[string]time.Time),
	}
}

func (db *MockDatabase) Close() error {
	return nil
}

func (db *MockDatabase) InitSchema() error {
	return nil
}

func (db *MockDatabase) CreateCustomer(customer *Customer) error {
	db.customers[customer.ID] = customer
	return nil
}

func (db *MockDatabase) GetCustomer(id string) (*Customer, error) {
	customer, exists := db.customers[id]
	if !exists {
		return nil, nil
	}
	return customer, nil
}

func (db *MockDatabase) ListCustomers(dealershipID string) ([]*Customer, error) {
	var customers []*Customer
	for _, customer := range db.customers {
		if dealershipID == "" || customer.DealershipID == dealershipID {
			customers = append(customers, customer)
		}
	}
	return customers, nil
}

func (db *MockDatabase) UpdateCustomer(customer *Customer) error {
	if _, exists := db.customers[customer.ID]; !exists {
		return fmt.Errorf("customer not found: %s", customer.ID)
	}
	db.customers[customer.ID] = customer
	return nil
}

func (db *MockDatabase) DeleteCustomer(id string) error {
	if _, exists := db.customers[id]; !exists {
		return fmt.Errorf("customer not found: %s", id)
	}
	delete(db.customers, id)
	return nil
}

// GDPR-related operations

func (db *MockDatabase) SoftDeleteCustomer(id string) error {
	customer, exists := db.customers[id]
	if !exists {
		return fmt.Errorf("customer not found: %s", id)
	}
	now := time.Now()
	db.gdprFields[id] = &CustomerWithGDPR{
		Customer:  *customer,
		DeletedAt: &now,
	}
	return nil
}

func (db *MockDatabase) AnonymizeCustomer(id string) error {
	customer, exists := db.customers[id]
	if !exists {
		return fmt.Errorf("customer not found: %s", id)
	}
	// Anonymize PII
	customer.FirstName = "ANONYMIZED"
	customer.LastName = "ANONYMIZED"
	customer.Email = "anonymized@deleted.local"
	customer.Phone = ""
	customer.Address = ""
	customer.SSNLast4 = ""
	customer.DriversLicenseNumber = ""
	now := time.Now()
	if gdpr, exists := db.gdprFields[id]; exists {
		gdpr.AnonymizedAt = &now
	} else {
		db.gdprFields[id] = &CustomerWithGDPR{
			Customer:     *customer,
			AnonymizedAt: &now,
		}
	}
	return nil
}

func (db *MockDatabase) GetCustomerWithGDPRFields(id string) (*CustomerWithGDPR, error) {
	customer, exists := db.customers[id]
	if !exists {
		return nil, nil
	}
	if gdpr, exists := db.gdprFields[id]; exists {
		gdpr.Customer = *customer
		return gdpr, nil
	}
	return &CustomerWithGDPR{Customer: *customer}, nil
}

func (db *MockDatabase) UpdateLastActivity(id string) error {
	if _, exists := db.customers[id]; !exists {
		return fmt.Errorf("customer not found: %s", id)
	}
	db.lastActivity[id] = time.Now()
	return nil
}

func (db *MockDatabase) SetRetentionExpiry(id string, expiresAt time.Time) error {
	if _, exists := db.customers[id]; !exists {
		return fmt.Errorf("customer not found: %s", id)
	}
	if gdpr, exists := db.gdprFields[id]; exists {
		gdpr.RetentionExpiresAt = &expiresAt
	} else {
		db.gdprFields[id] = &CustomerWithGDPR{
			Customer:           *db.customers[id],
			RetentionExpiresAt: &expiresAt,
		}
	}
	return nil
}

func setupTestServer() *Server {
	config := &Config{
		Port:        "8082",
		DatabaseURL: "mock",
	}
	db := NewMockDatabase()
	logger := logging.New(logging.Config{
		Service: "customer-service-test",
	})
	return NewServer(config, db, logger)
}

func TestHealthCheck(t *testing.T) {
	server := setupTestServer()

	req, err := http.NewRequest("GET", "/health", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	server.router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(rr.Body.Bytes(), &response); err != nil {
		t.Fatal(err)
	}

	if response["status"] != "healthy" {
		t.Errorf("Expected status 'healthy', got '%v'", response["status"])
	}
}

func TestCreateCustomer(t *testing.T) {
	server := setupTestServer()

	// Use CreateCustomerRequest with proper validation fields
	customerReq := CreateCustomerRequest{
		DealershipID: uuid.New().String(),
		FirstName:    "John",
		LastName:     "Doe",
		Email:        "john.doe@example.com",
		Phone:        "555-123-4567",  // Must match phone regex
		Address:      "123 Main St",
		City:         "Indianapolis",
		State:        "IN",
		ZipCode:      "46220",
		CreditScore:  720,
	}

	body, err := json.Marshal(customerReq)
	if err != nil {
		t.Fatal(err)
	}

	req, err := http.NewRequest("POST", "/customers", bytes.NewBuffer(body))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	server.router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusCreated {
		t.Errorf("handler returned wrong status code: got %v want %v, body: %s",
			status, http.StatusCreated, rr.Body.String())
	}

	var created Customer
	if err := json.Unmarshal(rr.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}

	if created.ID == "" {
		t.Error("Expected ID to be generated")
	}

	if created.FirstName != "John" {
		t.Errorf("Expected first name 'John', got '%s'", created.FirstName)
	}

	if created.Email != "john.doe@example.com" {
		t.Errorf("Expected email 'john.doe@example.com', got '%s'", created.Email)
	}
}

func TestGetCustomer(t *testing.T) {
	server := setupTestServer()
	mockDB := server.db.(*MockDatabase)

	// Create a test customer
	customerID := uuid.New().String()
	testCustomer := &Customer{
		ID:           customerID,
		DealershipID: uuid.New().String(),
		FirstName:    "Jane",
		LastName:     "Smith",
		Email:        "jane.smith@example.com",
		Phone:        "555-5678",
		CreditScore:  680,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	mockDB.customers[customerID] = testCustomer

	req, err := http.NewRequest("GET", "/customers/"+customerID, nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	server.router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}

	var retrieved Customer
	if err := json.Unmarshal(rr.Body.Bytes(), &retrieved); err != nil {
		t.Fatal(err)
	}

	if retrieved.ID != customerID {
		t.Errorf("Expected ID %s, got %s", customerID, retrieved.ID)
	}

	if retrieved.FirstName != "Jane" {
		t.Errorf("Expected first name 'Jane', got '%s'", retrieved.FirstName)
	}
}

func TestGetCustomerNotFound(t *testing.T) {
	server := setupTestServer()

	req, err := http.NewRequest("GET", "/customers/nonexistent-id", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	server.router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusNotFound {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusNotFound)
	}
}

func TestListCustomers(t *testing.T) {
	server := setupTestServer()
	mockDB := server.db.(*MockDatabase)

	// Create test customers
	dealershipID := uuid.New().String()
	for i := 0; i < 3; i++ {
		customer := &Customer{
			ID:           uuid.New().String(),
			DealershipID: dealershipID,
			FirstName:    fmt.Sprintf("Customer%d", i),
			LastName:     "Test",
			Email:        fmt.Sprintf("customer%d@example.com", i),
			CreditScore:  700,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		}
		mockDB.customers[customer.ID] = customer
	}

	req, err := http.NewRequest("GET", "/customers", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	server.router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}

	var customers []*Customer
	if err := json.Unmarshal(rr.Body.Bytes(), &customers); err != nil {
		t.Fatal(err)
	}

	if len(customers) != 3 {
		t.Errorf("Expected 3 customers, got %d", len(customers))
	}
}

func TestUpdateCustomer(t *testing.T) {
	server := setupTestServer()
	mockDB := server.db.(*MockDatabase)

	// Create a test customer
	customerID := uuid.New().String()
	testCustomer := &Customer{
		ID:           customerID,
		DealershipID: uuid.New().String(),
		FirstName:    "Bob",
		LastName:     "Johnson",
		Email:        "bob@example.com",
		CreditScore:  650,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	mockDB.customers[customerID] = testCustomer

	// Update the customer
	updatedCustomer := Customer{
		DealershipID: testCustomer.DealershipID,
		FirstName:    "Robert",
		LastName:     "Johnson",
		Email:        "robert.johnson@example.com",
		CreditScore:  720,
	}

	body, err := json.Marshal(updatedCustomer)
	if err != nil {
		t.Fatal(err)
	}

	req, err := http.NewRequest("PUT", "/customers/"+customerID, bytes.NewBuffer(body))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	server.router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}

	var result Customer
	if err := json.Unmarshal(rr.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}

	if result.FirstName != "Robert" {
		t.Errorf("Expected first name 'Robert', got '%s'", result.FirstName)
	}

	if result.Email != "robert.johnson@example.com" {
		t.Errorf("Expected email 'robert.johnson@example.com', got '%s'", result.Email)
	}

	if result.CreditScore != 720 {
		t.Errorf("Expected credit score 720, got %d", result.CreditScore)
	}
}

func TestDeleteCustomer(t *testing.T) {
	server := setupTestServer()
	mockDB := server.db.(*MockDatabase)

	// Create a test customer
	customerID := uuid.New().String()
	testCustomer := &Customer{
		ID:           customerID,
		DealershipID: uuid.New().String(),
		FirstName:    "Delete",
		LastName:     "Me",
		Email:        "delete@example.com",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	mockDB.customers[customerID] = testCustomer

	req, err := http.NewRequest("DELETE", "/customers/"+customerID, nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	server.router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusNoContent {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusNoContent)
	}

	// Verify customer was deleted
	if _, exists := mockDB.customers[customerID]; exists {
		t.Error("Expected customer to be deleted")
	}
}

func TestDeleteCustomerNotFound(t *testing.T) {
	server := setupTestServer()

	req, err := http.NewRequest("DELETE", "/customers/nonexistent-id", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	server.router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusNotFound {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusNotFound)
	}
}

// ============================================================================
// Credit Check Tests
// ============================================================================

func TestRunCreditCheck(t *testing.T) {
	server := setupTestServer()
	mockDB := server.db.(*MockDatabase)

	// Create a test customer with credit data
	customerID := uuid.New().String()
	testCustomer := &Customer{
		ID:            customerID,
		DealershipID:  uuid.New().String(),
		FirstName:     "Test",
		LastName:      "Customer",
		Email:         "test@example.com",
		CreditScore:   720,
		MonthlyIncome: 6000,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
	mockDB.customers[customerID] = testCustomer

	// Run credit check
	reqBody := `{"purpose": "auto_loan"}`
	req, err := http.NewRequest("POST", "/customers/"+customerID+"/credit-check", bytes.NewBufferString(reqBody))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	server.router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v, body: %s",
			status, http.StatusOK, rr.Body.String())
	}

	var result CreditCheckResult
	if err := json.Unmarshal(rr.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}

	if result.Score != 720 {
		t.Errorf("Expected credit score 720, got %d", result.Score)
	}

	if result.ScoreBand != "good" {
		t.Errorf("Expected score band 'good', got '%s'", result.ScoreBand)
	}

	if result.MaxLoanAmount <= 0 {
		t.Error("Expected max loan amount to be calculated")
	}

	if len(result.TermOptions) == 0 {
		t.Error("Expected term options to be generated")
	}

	if len(result.LenderMatches) == 0 {
		t.Error("Expected lender matches to be generated")
	}
}

func TestGetCreditProfile(t *testing.T) {
	server := setupTestServer()
	mockDB := server.db.(*MockDatabase)

	// Create a test customer
	customerID := uuid.New().String()
	testCustomer := &Customer{
		ID:            customerID,
		DealershipID:  uuid.New().String(),
		FirstName:     "Profile",
		LastName:      "Test",
		Email:         "profile@example.com",
		CreditScore:   680,
		MonthlyIncome: 5000,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
	mockDB.customers[customerID] = testCustomer

	req, err := http.NewRequest("GET", "/customers/"+customerID+"/credit-profile", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	server.router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}

	var profile CreditProfile
	if err := json.Unmarshal(rr.Body.Bytes(), &profile); err != nil {
		t.Fatal(err)
	}

	if profile.CreditScore != 680 {
		t.Errorf("Expected credit score 680, got %d", profile.CreditScore)
	}

	if profile.MonthlyIncome != 5000 {
		t.Errorf("Expected monthly income 5000, got %f", profile.MonthlyIncome)
	}
}

func TestGetFinancingOptions(t *testing.T) {
	server := setupTestServer()
	mockDB := server.db.(*MockDatabase)

	// Create a test customer with good credit
	customerID := uuid.New().String()
	testCustomer := &Customer{
		ID:            customerID,
		DealershipID:  uuid.New().String(),
		FirstName:     "Financing",
		LastName:      "Test",
		Email:         "financing@example.com",
		CreditScore:   750,
		MonthlyIncome: 7000,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
	mockDB.customers[customerID] = testCustomer

	req, err := http.NewRequest("GET", "/customers/"+customerID+"/financing-options?vehicle_price=35000", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	server.router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(rr.Body.Bytes(), &response); err != nil {
		t.Fatal(err)
	}

	if response["vehicle_price"].(float64) != 35000 {
		t.Errorf("Expected vehicle price 35000, got %v", response["vehicle_price"])
	}

	options, ok := response["options"].([]interface{})
	if !ok || len(options) == 0 {
		t.Error("Expected financing options to be returned")
	}

	// Check first option has monthly payment calculated
	firstOption := options[0].(map[string]interface{})
	if firstOption["monthly_payment"].(float64) <= 0 {
		t.Error("Expected monthly payment to be calculated")
	}
}

func TestPrequalifyCustomer(t *testing.T) {
	server := setupTestServer()
	mockDB := server.db.(*MockDatabase)

	// Create a test customer with fair credit
	customerID := uuid.New().String()
	testCustomer := &Customer{
		ID:            customerID,
		DealershipID:  uuid.New().String(),
		FirstName:     "Prequal",
		LastName:      "Test",
		Email:         "prequal@example.com",
		CreditScore:   620,
		MonthlyIncome: 4500,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
	mockDB.customers[customerID] = testCustomer

	// Request prequalification
	reqBody := `{"requested_amount": 25000, "term_months": 60, "purpose": "auto_loan"}`
	req, err := http.NewRequest("POST", "/customers/"+customerID+"/prequalify", bytes.NewBufferString(reqBody))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	server.router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v, body: %s",
			status, http.StatusOK, rr.Body.String())
	}

	var result PrequalResult
	if err := json.Unmarshal(rr.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}

	if !result.Approved {
		t.Error("Expected prequalification to be approved for customer with 620 score")
	}

	if result.ApprovalStatus != "manual_review" {
		t.Errorf("Expected manual_review status for fair credit, got '%s'", result.ApprovalStatus)
	}

	if result.EstimatedAPR <= 0 {
		t.Error("Expected estimated APR to be calculated")
	}

	if len(result.Conditions) == 0 {
		t.Error("Expected conditions for manual review")
	}
}

func TestPrequalifyDeclined(t *testing.T) {
	server := setupTestServer()
	mockDB := server.db.(*MockDatabase)

	// Create a test customer with poor credit
	customerID := uuid.New().String()
	testCustomer := &Customer{
		ID:            customerID,
		DealershipID:  uuid.New().String(),
		FirstName:     "Declined",
		LastName:      "Test",
		Email:         "declined@example.com",
		CreditScore:   520, // Below 580 threshold
		MonthlyIncome: 3000,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
	mockDB.customers[customerID] = testCustomer

	// Request prequalification
	reqBody := `{"requested_amount": 30000, "term_months": 60, "purpose": "auto_loan"}`
	req, err := http.NewRequest("POST", "/customers/"+customerID+"/prequalify", bytes.NewBufferString(reqBody))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	server.router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}

	var result PrequalResult
	if err := json.Unmarshal(rr.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}

	if result.Approved {
		t.Error("Expected prequalification to be declined for customer with 520 score")
	}

	if result.ApprovalStatus != "declined" {
		t.Errorf("Expected declined status, got '%s'", result.ApprovalStatus)
	}

	if len(result.DeclineReasons) == 0 {
		t.Error("Expected decline reasons")
	}
}

func TestCreditScoreBands(t *testing.T) {
	testCases := []struct {
		score    int
		expected string
	}{
		{850, "exceptional"},
		{800, "exceptional"},
		{780, "very_good"},
		{740, "very_good"},
		{700, "good"},
		{670, "good"},
		{620, "fair"},
		{580, "fair"},
		{550, "poor"},
		{300, "poor"},
	}

	for _, tc := range testCases {
		result := getScoreBand(tc.score)
		if result != tc.expected {
			t.Errorf("Score %d: expected band '%s', got '%s'", tc.score, tc.expected, result)
		}
	}
}

func TestCalculateAPRFromScore(t *testing.T) {
	testCases := []struct {
		score       int
		purpose     string
		minExpected float64
		maxExpected float64
	}{
		{800, "auto_loan", 3.0, 5.0},
		{740, "auto_loan", 4.0, 6.0},
		{670, "auto_loan", 6.0, 8.0},
		{580, "auto_loan", 10.0, 14.0},
		{520, "auto_loan", 17.0, 20.0},
		{800, "lease", 3.0, 4.5},       // Lease should be lower
		{700, "refinance", 7.0, 10.0},  // Refinance should be slightly higher
	}

	for _, tc := range testCases {
		apr := calculateAPRFromScore(tc.score, tc.purpose)
		if apr < tc.minExpected || apr > tc.maxExpected {
			t.Errorf("Score %d, purpose %s: expected APR between %.2f and %.2f, got %.2f",
				tc.score, tc.purpose, tc.minExpected, tc.maxExpected, apr)
		}
	}
}
