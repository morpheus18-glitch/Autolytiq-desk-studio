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
	deals map[string]*Deal
}

func NewMockDatabase() *MockDatabase {
	return &MockDatabase{
		deals: make(map[string]*Deal),
	}
}

func (db *MockDatabase) Close() error {
	return nil
}

func (db *MockDatabase) InitSchema() error {
	return nil
}

func (db *MockDatabase) CreateDeal(deal *Deal) error {
	db.deals[deal.ID] = deal
	return nil
}

func (db *MockDatabase) GetDeal(id string) (*Deal, error) {
	deal, exists := db.deals[id]
	if !exists {
		return nil, nil
	}
	return deal, nil
}

func (db *MockDatabase) ListDeals(dealershipID string) ([]*Deal, error) {
	var deals []*Deal
	for _, deal := range db.deals {
		if dealershipID == "" || deal.DealershipID == dealershipID {
			deals = append(deals, deal)
		}
	}
	return deals, nil
}

func (db *MockDatabase) UpdateDeal(deal *Deal) error {
	if _, exists := db.deals[deal.ID]; !exists {
		return fmt.Errorf("deal not found: %s", deal.ID)
	}
	db.deals[deal.ID] = deal
	return nil
}

func (db *MockDatabase) DeleteDeal(id string) error {
	if _, exists := db.deals[id]; !exists {
		return fmt.Errorf("deal not found: %s", id)
	}
	delete(db.deals, id)
	return nil
}

func setupTestServer() *Server {
	config := &Config{
		Port:        "8081",
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

func TestCreateDeal(t *testing.T) {
	server := setupTestServer()

	deal := Deal{
		DealershipID: uuid.New().String(),
		CustomerID:   uuid.New().String(),
		VehiclePrice: 30000.00,
		TradeInValue: 5000.00,
		TotalAmount:  25000.00,
	}

	body, err := json.Marshal(deal)
	if err != nil {
		t.Fatal(err)
	}

	req, err := http.NewRequest("POST", "/deals", bytes.NewBuffer(body))
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

	var created Deal
	if err := json.Unmarshal(rr.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}

	if created.ID == "" {
		t.Error("Expected ID to be generated")
	}

	if created.Status != "draft" {
		t.Errorf("Expected status 'draft', got '%s'", created.Status)
	}

	if created.VehiclePrice != 30000.00 {
		t.Errorf("Expected vehicle price 30000.00, got %f", created.VehiclePrice)
	}
}

func TestGetDeal(t *testing.T) {
	server := setupTestServer()
	mockDB := server.db.(*MockDatabase)

	// Create a test deal
	dealID := uuid.New().String()
	testDeal := &Deal{
		ID:           dealID,
		DealershipID: uuid.New().String(),
		CustomerID:   uuid.New().String(),
		VehiclePrice: 25000.00,
		Status:       "draft",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	mockDB.deals[dealID] = testDeal

	req, err := http.NewRequest("GET", "/deals/"+dealID, nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	server.router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}

	var retrieved Deal
	if err := json.Unmarshal(rr.Body.Bytes(), &retrieved); err != nil {
		t.Fatal(err)
	}

	if retrieved.ID != dealID {
		t.Errorf("Expected ID %s, got %s", dealID, retrieved.ID)
	}

	if retrieved.VehiclePrice != 25000.00 {
		t.Errorf("Expected vehicle price 25000.00, got %f", retrieved.VehiclePrice)
	}
}

func TestGetDealNotFound(t *testing.T) {
	server := setupTestServer()

	req, err := http.NewRequest("GET", "/deals/nonexistent-id", nil)
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

func TestListDeals(t *testing.T) {
	server := setupTestServer()
	mockDB := server.db.(*MockDatabase)

	// Create test deals
	dealershipID := uuid.New().String()
	for i := 0; i < 3; i++ {
		deal := &Deal{
			ID:           uuid.New().String(),
			DealershipID: dealershipID,
			CustomerID:   uuid.New().String(),
			VehiclePrice: 20000.00,
			Status:       "draft",
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		}
		mockDB.deals[deal.ID] = deal
	}

	req, err := http.NewRequest("GET", "/deals", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	server.router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}

	var deals []*Deal
	if err := json.Unmarshal(rr.Body.Bytes(), &deals); err != nil {
		t.Fatal(err)
	}

	if len(deals) != 3 {
		t.Errorf("Expected 3 deals, got %d", len(deals))
	}
}

func TestUpdateDeal(t *testing.T) {
	server := setupTestServer()
	mockDB := server.db.(*MockDatabase)

	// Create a test deal
	dealID := uuid.New().String()
	testDeal := &Deal{
		ID:           dealID,
		DealershipID: uuid.New().String(),
		CustomerID:   uuid.New().String(),
		VehiclePrice: 25000.00,
		Status:       "draft",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	mockDB.deals[dealID] = testDeal

	// Update the deal
	updatedDeal := Deal{
		DealershipID: testDeal.DealershipID,
		CustomerID:   testDeal.CustomerID,
		VehiclePrice: 28000.00,
		Status:       "submitted",
	}

	body, err := json.Marshal(updatedDeal)
	if err != nil {
		t.Fatal(err)
	}

	req, err := http.NewRequest("PUT", "/deals/"+dealID, bytes.NewBuffer(body))
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

	var result Deal
	if err := json.Unmarshal(rr.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}

	if result.VehiclePrice != 28000.00 {
		t.Errorf("Expected vehicle price 28000.00, got %f", result.VehiclePrice)
	}

	if result.Status != "submitted" {
		t.Errorf("Expected status 'submitted', got '%s'", result.Status)
	}
}

func TestDeleteDeal(t *testing.T) {
	server := setupTestServer()
	mockDB := server.db.(*MockDatabase)

	// Create a test deal
	dealID := uuid.New().String()
	testDeal := &Deal{
		ID:           dealID,
		DealershipID: uuid.New().String(),
		CustomerID:   uuid.New().String(),
		VehiclePrice: 25000.00,
		Status:       "draft",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	mockDB.deals[dealID] = testDeal

	req, err := http.NewRequest("DELETE", "/deals/"+dealID, nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	server.router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusNoContent {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusNoContent)
	}

	// Verify deal was deleted
	if _, exists := mockDB.deals[dealID]; exists {
		t.Error("Expected deal to be deleted")
	}
}

func TestDeleteDealNotFound(t *testing.T) {
	server := setupTestServer()

	req, err := http.NewRequest("DELETE", "/deals/nonexistent-id", nil)
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
