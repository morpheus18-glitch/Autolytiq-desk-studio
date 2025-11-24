package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
)

// MockDatabase is a mock implementation of the Database for testing
type MockDatabase struct {
	customers map[string]*Customer
}

func NewMockDatabase() *MockDatabase {
	return &MockDatabase{
		customers: make(map[string]*Customer),
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

func setupTestServer() *Server {
	config := &Config{
		Port:        "8082",
		DatabaseURL: "mock",
	}
	db := NewMockDatabase()
	return NewServer(config, db)
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

	customer := Customer{
		DealershipID: uuid.New().String(),
		FirstName:    "John",
		LastName:     "Doe",
		Email:        "john.doe@example.com",
		Phone:        "555-1234",
		Address:      "123 Main St",
		City:         "Indianapolis",
		State:        "IN",
		ZipCode:      "46220",
		CreditScore:  720,
	}

	body, err := json.Marshal(customer)
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
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusCreated)
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
