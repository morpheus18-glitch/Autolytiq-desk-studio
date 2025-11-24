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
	vehicles map[string]*Vehicle
}

func NewMockDatabase() *MockDatabase {
	return &MockDatabase{
		vehicles: make(map[string]*Vehicle),
	}
}

func (db *MockDatabase) Close() error {
	return nil
}

func (db *MockDatabase) InitSchema() error {
	return nil
}

func (db *MockDatabase) CreateVehicle(vehicle *Vehicle) error {
	db.vehicles[vehicle.ID] = vehicle
	return nil
}

func (db *MockDatabase) GetVehicle(id string) (*Vehicle, error) {
	vehicle, exists := db.vehicles[id]
	if !exists {
		return nil, nil
	}
	return vehicle, nil
}

func (db *MockDatabase) ListVehicles(dealershipID string, filters map[string]interface{}) ([]*Vehicle, error) {
	var vehicles []*Vehicle
	for _, vehicle := range db.vehicles {
		// Check dealership filter
		if dealershipID != "" && vehicle.DealershipID != dealershipID {
			continue
		}

		// Apply filters
		if make, ok := filters["make"].(string); ok && make != "" {
			if vehicle.Make != make {
				continue
			}
		}

		if model, ok := filters["model"].(string); ok && model != "" {
			if vehicle.Model != model {
				continue
			}
		}

		if year, ok := filters["year"].(int); ok && year > 0 {
			if vehicle.Year != year {
				continue
			}
		}

		if condition, ok := filters["condition"].(string); ok && condition != "" {
			if vehicle.Condition != condition {
				continue
			}
		}

		if status, ok := filters["status"].(string); ok && status != "" {
			if vehicle.Status != status {
				continue
			}
		}

		if priceMin, ok := filters["price_min"].(float64); ok && priceMin > 0 {
			if vehicle.Price < priceMin {
				continue
			}
		}

		if priceMax, ok := filters["price_max"].(float64); ok && priceMax > 0 {
			if vehicle.Price > priceMax {
				continue
			}
		}

		vehicles = append(vehicles, vehicle)
	}
	return vehicles, nil
}

func (db *MockDatabase) UpdateVehicle(vehicle *Vehicle) error {
	if _, exists := db.vehicles[vehicle.ID]; !exists {
		return fmt.Errorf("vehicle not found: %s", vehicle.ID)
	}
	db.vehicles[vehicle.ID] = vehicle
	return nil
}

func (db *MockDatabase) DeleteVehicle(id string) error {
	if _, exists := db.vehicles[id]; !exists {
		return fmt.Errorf("vehicle not found: %s", id)
	}
	delete(db.vehicles, id)
	return nil
}

func (db *MockDatabase) ValidateVIN(vin string) (bool, error) {
	// Basic VIN validation logic for testing
	if len(vin) != 17 {
		return false, nil
	}
	return true, nil
}

func (db *MockDatabase) GetInventoryStats(dealershipID string) (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	totalCount := 0
	statusCounts := make(map[string]int)
	conditionCounts := make(map[string]int)
	totalPrice := 0.0

	for _, vehicle := range db.vehicles {
		if vehicle.DealershipID == dealershipID {
			totalCount++
			statusCounts[vehicle.Status]++
			conditionCounts[vehicle.Condition]++
			totalPrice += vehicle.Price
		}
	}

	stats["total_count"] = totalCount
	stats["by_status"] = statusCounts
	stats["by_condition"] = conditionCounts
	if totalCount > 0 {
		stats["average_price"] = totalPrice / float64(totalCount)
	} else {
		stats["average_price"] = 0.0
	}

	return stats, nil
}

func setupTestServer() *Server {
	config := &Config{
		Port:        "8083",
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

	if response["service"] != "inventory-service" {
		t.Errorf("Expected service 'inventory-service', got '%v'", response["service"])
	}
}

func TestCreateVehicle(t *testing.T) {
	server := setupTestServer()

	vehicle := Vehicle{
		DealershipID: uuid.New().String(),
		VIN:          "1HGBH41JXMN109186",
		StockNumber:  "A12345",
		Make:         "Toyota",
		Model:        "Camry",
		Year:         2023,
		Trim:         "LE",
		Condition:    "new",
		Status:       "available",
		Price:        28500.00,
		Mileage:      10,
		Color:        "Silver",
		Transmission: "Automatic",
		Engine:       "2.5L 4-Cylinder",
		FuelType:     "Gasoline",
		DriveType:    "FWD",
		BodyStyle:    "Sedan",
	}

	body, err := json.Marshal(vehicle)
	if err != nil {
		t.Fatal(err)
	}

	req, err := http.NewRequest("POST", "/vehicles", bytes.NewBuffer(body))
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

	var created Vehicle
	if err := json.Unmarshal(rr.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}

	if created.ID == "" {
		t.Error("Expected ID to be generated")
	}

	if created.Make != "Toyota" {
		t.Errorf("Expected make 'Toyota', got '%s'", created.Make)
	}

	if created.Model != "Camry" {
		t.Errorf("Expected model 'Camry', got '%s'", created.Model)
	}

	if created.Price != 28500.00 {
		t.Errorf("Expected price 28500.00, got %f", created.Price)
	}
}

func TestGetVehicle(t *testing.T) {
	server := setupTestServer()
	mockDB := server.db.(*MockDatabase)

	// Create a test vehicle
	vehicleID := uuid.New().String()
	testVehicle := &Vehicle{
		ID:           vehicleID,
		DealershipID: uuid.New().String(),
		Make:         "Honda",
		Model:        "Accord",
		Year:         2022,
		Price:        26000.00,
		Status:       "available",
		Condition:    "used",
		CreatedAt:    time.Now().Format(time.RFC3339),
		UpdatedAt:    time.Now().Format(time.RFC3339),
	}
	mockDB.vehicles[vehicleID] = testVehicle

	req, err := http.NewRequest("GET", "/vehicles/"+vehicleID, nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	server.router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}

	var retrieved Vehicle
	if err := json.Unmarshal(rr.Body.Bytes(), &retrieved); err != nil {
		t.Fatal(err)
	}

	if retrieved.ID != vehicleID {
		t.Errorf("Expected ID %s, got %s", vehicleID, retrieved.ID)
	}

	if retrieved.Make != "Honda" {
		t.Errorf("Expected make 'Honda', got '%s'", retrieved.Make)
	}

	if retrieved.Price != 26000.00 {
		t.Errorf("Expected price 26000.00, got %f", retrieved.Price)
	}
}

func TestGetVehicleNotFound(t *testing.T) {
	server := setupTestServer()

	req, err := http.NewRequest("GET", "/vehicles/nonexistent-id", nil)
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

func TestListVehicles(t *testing.T) {
	server := setupTestServer()
	mockDB := server.db.(*MockDatabase)

	// Create test vehicles
	dealershipID := uuid.New().String()
	for i := 0; i < 3; i++ {
		vehicle := &Vehicle{
			ID:           uuid.New().String(),
			DealershipID: dealershipID,
			Make:         "Ford",
			Model:        "F-150",
			Year:         2023,
			Price:        35000.00,
			Status:       "available",
			Condition:    "new",
			CreatedAt:    time.Now().Format(time.RFC3339),
			UpdatedAt:    time.Now().Format(time.RFC3339),
		}
		mockDB.vehicles[vehicle.ID] = vehicle
	}

	req, err := http.NewRequest("GET", "/vehicles", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	server.router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}

	var vehicles []*Vehicle
	if err := json.Unmarshal(rr.Body.Bytes(), &vehicles); err != nil {
		t.Fatal(err)
	}

	if len(vehicles) != 3 {
		t.Errorf("Expected 3 vehicles, got %d", len(vehicles))
	}
}

func TestListVehiclesWithFilters(t *testing.T) {
	server := setupTestServer()
	mockDB := server.db.(*MockDatabase)

	// Create test vehicles with different attributes
	dealershipID := uuid.New().String()

	// Toyota vehicles
	for i := 0; i < 2; i++ {
		vehicle := &Vehicle{
			ID:           uuid.New().String(),
			DealershipID: dealershipID,
			Make:         "Toyota",
			Model:        "Camry",
			Year:         2023,
			Price:        28000.00,
			Status:       "available",
			Condition:    "new",
			CreatedAt:    time.Now().Format(time.RFC3339),
			UpdatedAt:    time.Now().Format(time.RFC3339),
		}
		mockDB.vehicles[vehicle.ID] = vehicle
	}

	// Honda vehicle
	vehicle := &Vehicle{
		ID:           uuid.New().String(),
		DealershipID: dealershipID,
		Make:         "Honda",
		Model:        "Accord",
		Year:         2023,
		Price:        27000.00,
		Status:       "available",
		Condition:    "new",
		CreatedAt:    time.Now().Format(time.RFC3339),
		UpdatedAt:    time.Now().Format(time.RFC3339),
	}
	mockDB.vehicles[vehicle.ID] = vehicle

	// Test filtering by make
	req, err := http.NewRequest("GET", "/vehicles?make=Toyota", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	server.router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}

	var vehicles []*Vehicle
	if err := json.Unmarshal(rr.Body.Bytes(), &vehicles); err != nil {
		t.Fatal(err)
	}

	if len(vehicles) != 2 {
		t.Errorf("Expected 2 Toyota vehicles, got %d", len(vehicles))
	}

	for _, v := range vehicles {
		if v.Make != "Toyota" {
			t.Errorf("Expected all vehicles to be Toyota, got %s", v.Make)
		}
	}
}

func TestUpdateVehicle(t *testing.T) {
	server := setupTestServer()
	mockDB := server.db.(*MockDatabase)

	// Create a test vehicle
	vehicleID := uuid.New().String()
	testVehicle := &Vehicle{
		ID:           vehicleID,
		DealershipID: uuid.New().String(),
		Make:         "Chevrolet",
		Model:        "Silverado",
		Year:         2022,
		Price:        40000.00,
		Status:       "available",
		Condition:    "new",
		CreatedAt:    time.Now().Format(time.RFC3339),
		UpdatedAt:    time.Now().Format(time.RFC3339),
	}
	mockDB.vehicles[vehicleID] = testVehicle

	// Update the vehicle
	updatedVehicle := Vehicle{
		DealershipID: testVehicle.DealershipID,
		Make:         "Chevrolet",
		Model:        "Silverado",
		Year:         2022,
		Price:        38000.00,
		Status:       "sold",
		Condition:    "new",
	}

	body, err := json.Marshal(updatedVehicle)
	if err != nil {
		t.Fatal(err)
	}

	req, err := http.NewRequest("PUT", "/vehicles/"+vehicleID, bytes.NewBuffer(body))
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

	var result Vehicle
	if err := json.Unmarshal(rr.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}

	if result.Price != 38000.00 {
		t.Errorf("Expected price 38000.00, got %f", result.Price)
	}

	if result.Status != "sold" {
		t.Errorf("Expected status 'sold', got '%s'", result.Status)
	}
}

func TestDeleteVehicle(t *testing.T) {
	server := setupTestServer()
	mockDB := server.db.(*MockDatabase)

	// Create a test vehicle
	vehicleID := uuid.New().String()
	testVehicle := &Vehicle{
		ID:           vehicleID,
		DealershipID: uuid.New().String(),
		Make:         "Nissan",
		Model:        "Altima",
		Year:         2022,
		Price:        24000.00,
		Status:       "available",
		Condition:    "used",
		CreatedAt:    time.Now().Format(time.RFC3339),
		UpdatedAt:    time.Now().Format(time.RFC3339),
	}
	mockDB.vehicles[vehicleID] = testVehicle

	req, err := http.NewRequest("DELETE", "/vehicles/"+vehicleID, nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	server.router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusNoContent {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusNoContent)
	}

	// Verify vehicle was deleted
	if _, exists := mockDB.vehicles[vehicleID]; exists {
		t.Error("Expected vehicle to be deleted")
	}
}

func TestDeleteVehicleNotFound(t *testing.T) {
	server := setupTestServer()

	req, err := http.NewRequest("DELETE", "/vehicles/nonexistent-id", nil)
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

func TestValidateVIN(t *testing.T) {
	server := setupTestServer()

	tests := []struct {
		name      string
		vin       string
		wantValid bool
	}{
		{
			name:      "Valid VIN",
			vin:       "1HGBH41JXMN109186",
			wantValid: true,
		},
		{
			name:      "Invalid VIN - too short",
			vin:       "1HGBH41JX",
			wantValid: false,
		},
		{
			name:      "Invalid VIN - too long",
			vin:       "1HGBH41JXMN109186XX",
			wantValid: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reqBody := map[string]string{"vin": tt.vin}
			body, err := json.Marshal(reqBody)
			if err != nil {
				t.Fatal(err)
			}

			req, err := http.NewRequest("POST", "/vehicles/validate-vin", bytes.NewBuffer(body))
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

			var response map[string]interface{}
			if err := json.Unmarshal(rr.Body.Bytes(), &response); err != nil {
				t.Fatal(err)
			}

			if response["valid"].(bool) != tt.wantValid {
				t.Errorf("Expected valid=%v, got %v", tt.wantValid, response["valid"])
			}
		})
	}
}

func TestGetInventoryStats(t *testing.T) {
	server := setupTestServer()
	mockDB := server.db.(*MockDatabase)

	dealershipID := uuid.New().String()

	// Create test vehicles with different statuses and conditions
	vehicles := []*Vehicle{
		{
			ID:           uuid.New().String(),
			DealershipID: dealershipID,
			Make:         "Toyota",
			Model:        "Camry",
			Year:         2023,
			Price:        30000.00,
			Status:       "available",
			Condition:    "new",
			CreatedAt:    time.Now().Format(time.RFC3339),
			UpdatedAt:    time.Now().Format(time.RFC3339),
		},
		{
			ID:           uuid.New().String(),
			DealershipID: dealershipID,
			Make:         "Honda",
			Model:        "Accord",
			Year:         2023,
			Price:        28000.00,
			Status:       "available",
			Condition:    "new",
			CreatedAt:    time.Now().Format(time.RFC3339),
			UpdatedAt:    time.Now().Format(time.RFC3339),
		},
		{
			ID:           uuid.New().String(),
			DealershipID: dealershipID,
			Make:         "Ford",
			Model:        "F-150",
			Year:         2022,
			Price:        32000.00,
			Status:       "sold",
			Condition:    "used",
			CreatedAt:    time.Now().Format(time.RFC3339),
			UpdatedAt:    time.Now().Format(time.RFC3339),
		},
	}

	for _, v := range vehicles {
		mockDB.vehicles[v.ID] = v
	}

	req, err := http.NewRequest("GET", "/vehicles/stats?dealership_id="+dealershipID, nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	server.router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}

	var stats map[string]interface{}
	if err := json.Unmarshal(rr.Body.Bytes(), &stats); err != nil {
		t.Fatal(err)
	}

	if totalCount := int(stats["total_count"].(float64)); totalCount != 3 {
		t.Errorf("Expected total_count 3, got %d", totalCount)
	}

	if avgPrice := stats["average_price"].(float64); avgPrice != 30000.00 {
		t.Errorf("Expected average_price 30000.00, got %f", avgPrice)
	}

	byStatus := stats["by_status"].(map[string]interface{})
	if availableCount := int(byStatus["available"].(float64)); availableCount != 2 {
		t.Errorf("Expected 2 available vehicles, got %d", availableCount)
	}

	if soldCount := int(byStatus["sold"].(float64)); soldCount != 1 {
		t.Errorf("Expected 1 sold vehicle, got %d", soldCount)
	}
}
