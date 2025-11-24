package main

import (
	"bytes"
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

// mockBackendService creates a test HTTP server that simulates a backend service
func mockBackendService(t *testing.T, expectedDealershipID string) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify dealership ID header is present
		dealershipID := r.Header.Get("X-Dealership-ID")
		if dealershipID == "" {
			t.Errorf("Missing X-Dealership-ID header")
			http.Error(w, "Missing dealership context", http.StatusBadRequest)
			return
		}

		if dealershipID != expectedDealershipID {
			t.Errorf("Expected dealership ID %s, got %s", expectedDealershipID, dealershipID)
		}

		// Verify user headers are present
		if userID := r.Header.Get("X-User-ID"); userID == "" {
			t.Logf("Warning: Missing X-User-ID header")
		}

		// Echo back the request details for verification
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"success","dealership_id":"` + dealershipID + `"}`))
	}))
}

func TestProxyRequest_Success(t *testing.T) {
	// Create mock backend service
	mockService := mockBackendService(t, "test-dealership-123")
	defer mockService.Close()

	// Create test server
	config := &Config{
		Port:            "8080",
		DealServiceURL:  mockService.URL,
		AllowedOrigins:  "*",
		JWTSecret:       "development-secret-change-in-production-testing",
		JWTIssuer:       "test-issuer",
	}
	server := NewServer(config)

	// Create test request with JWT context
	reqBody := bytes.NewBufferString(`{"test":"data"}`)
	req := httptest.NewRequest("POST", "/api/v1/deals", reqBody)
	req.Header.Set("Content-Type", "application/json")

	// Add JWT claims to context
	ctx := req.Context()
	ctx = context.WithValue(ctx, ContextKeyDealershipID, "test-dealership-123")
	ctx = context.WithValue(ctx, ContextKeyUserID, "user-456")
	ctx = context.WithValue(ctx, ContextKeyEmail, "test@example.com")
	ctx = context.WithValue(ctx, ContextKeyRole, "admin")
	req = req.WithContext(ctx)

	// Create response recorder
	rr := httptest.NewRecorder()

	// Execute proxy request
	server.proxyToDealService(rr, req)

	// Verify response
	if status := rr.Code; status != http.StatusOK {
		t.Errorf("Handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	// Verify response body
	respBody, err := io.ReadAll(rr.Body)
	if err != nil {
		t.Fatalf("Failed to read response body: %v", err)
	}

	expectedBody := `{"status":"success","dealership_id":"test-dealership-123"}`
	if string(respBody) != expectedBody {
		t.Errorf("Handler returned unexpected body: got %v want %v", string(respBody), expectedBody)
	}
}

func TestProxyRequest_MissingDealershipID(t *testing.T) {
	// Create mock backend service
	mockService := mockBackendService(t, "test-dealership-123")
	defer mockService.Close()

	// Create test server
	config := &Config{
		Port:            "8080",
		DealServiceURL:  mockService.URL,
		AllowedOrigins:  "*",
		JWTSecret:       "development-secret-change-in-production-testing",
		JWTIssuer:       "test-issuer",
	}
	server := NewServer(config)

	// Create test request WITHOUT JWT context (missing dealership_id)
	reqBody := bytes.NewBufferString(`{"test":"data"}`)
	req := httptest.NewRequest("POST", "/api/v1/deals", reqBody)
	req.Header.Set("Content-Type", "application/json")

	// Create response recorder
	rr := httptest.NewRecorder()

	// Execute proxy request
	server.proxyToDealService(rr, req)

	// Verify response - should return 400 Bad Request
	if status := rr.Code; status != http.StatusBadRequest {
		t.Errorf("Handler returned wrong status code: got %v want %v", status, http.StatusBadRequest)
	}

	// Verify error message
	respBody, err := io.ReadAll(rr.Body)
	if err != nil {
		t.Fatalf("Failed to read response body: %v", err)
	}

	if !bytes.Contains(respBody, []byte("Missing dealership context")) {
		t.Errorf("Expected error message about missing dealership context, got: %s", string(respBody))
	}
}

func TestProxyRequest_HeaderForwarding(t *testing.T) {
	// Create mock backend service that checks headers
	mockService := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify custom headers are forwarded
		if customHeader := r.Header.Get("X-Custom-Header"); customHeader != "test-value" {
			t.Errorf("Expected X-Custom-Header=test-value, got %s", customHeader)
		}

		// Verify Authorization header is forwarded
		if auth := r.Header.Get("Authorization"); auth != "Bearer test-token" {
			t.Errorf("Expected Authorization header to be forwarded, got %s", auth)
		}

		// Verify Content-Type is forwarded
		if contentType := r.Header.Get("Content-Type"); contentType != "application/json" {
			t.Errorf("Expected Content-Type=application/json, got %s", contentType)
		}

		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	}))
	defer mockService.Close()

	// Create test server
	config := &Config{
		Port:            "8080",
		DealServiceURL:  mockService.URL,
		AllowedOrigins:  "*",
		JWTSecret:       "development-secret-change-in-production-testing",
		JWTIssuer:       "test-issuer",
	}
	server := NewServer(config)

	// Create test request with custom headers
	req := httptest.NewRequest("GET", "/api/v1/deals", nil)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer test-token")
	req.Header.Set("X-Custom-Header", "test-value")

	// Add JWT context
	ctx := req.Context()
	ctx = context.WithValue(ctx, ContextKeyDealershipID, "test-dealership-123")
	ctx = context.WithValue(ctx, ContextKeyUserID, "user-456")
	req = req.WithContext(ctx)

	// Create response recorder
	rr := httptest.NewRecorder()

	// Execute proxy request
	server.proxyToDealService(rr, req)

	// Verify response
	if status := rr.Code; status != http.StatusOK {
		t.Errorf("Handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}
}

func TestProxyRequest_QueryParameters(t *testing.T) {
	// Create mock backend service that checks query parameters
	mockService := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify query parameters are forwarded
		if status := r.URL.Query().Get("status"); status != "active" {
			t.Errorf("Expected status=active, got %s", status)
		}
		if limit := r.URL.Query().Get("limit"); limit != "10" {
			t.Errorf("Expected limit=10, got %s", limit)
		}

		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"results":[]}`))
	}))
	defer mockService.Close()

	// Create test server
	config := &Config{
		Port:            "8080",
		DealServiceURL:  mockService.URL,
		AllowedOrigins:  "*",
		JWTSecret:       "development-secret-change-in-production-testing",
		JWTIssuer:       "test-issuer",
	}
	server := NewServer(config)

	// Create test request with query parameters
	req := httptest.NewRequest("GET", "/api/v1/deals?status=active&limit=10", nil)

	// Add JWT context
	ctx := req.Context()
	ctx = context.WithValue(ctx, ContextKeyDealershipID, "test-dealership-123")
	req = req.WithContext(ctx)

	// Create response recorder
	rr := httptest.NewRecorder()

	// Execute proxy request
	server.proxyToDealService(rr, req)

	// Verify response
	if status := rr.Code; status != http.StatusOK {
		t.Errorf("Handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}
}

func TestProxyRequest_ErrorHandling(t *testing.T) {
	// Create test server with invalid backend URL
	config := &Config{
		Port:            "8080",
		DealServiceURL:  "http://invalid-service-that-does-not-exist:9999",
		AllowedOrigins:  "*",
		JWTSecret:       "development-secret-change-in-production-testing",
		JWTIssuer:       "test-issuer",
	}
	server := NewServer(config)

	// Create test request
	req := httptest.NewRequest("GET", "/api/v1/deals", nil)

	// Add JWT context
	ctx := req.Context()
	ctx = context.WithValue(ctx, ContextKeyDealershipID, "test-dealership-123")
	req = req.WithContext(ctx)

	// Create response recorder
	rr := httptest.NewRecorder()

	// Execute proxy request
	server.proxyToDealService(rr, req)

	// Verify response - should return 503 Service Unavailable
	if status := rr.Code; status != http.StatusServiceUnavailable {
		t.Errorf("Handler returned wrong status code: got %v want %v", status, http.StatusServiceUnavailable)
	}

	// Verify error message
	respBody, err := io.ReadAll(rr.Body)
	if err != nil {
		t.Fatalf("Failed to read response body: %v", err)
	}

	if !bytes.Contains(respBody, []byte("Service unavailable")) {
		t.Errorf("Expected error message about service unavailable, got: %s", string(respBody))
	}
}

func TestProxyRequest_AllServices(t *testing.T) {
	// Test that all service proxy methods work
	testCases := []struct {
		name        string
		handler     func(*Server, http.ResponseWriter, *http.Request)
		serviceURL  string
		path        string
	}{
		{
			name:    "Deal Service",
			handler: (*Server).proxyToDealService,
			path:    "/api/v1/deals",
		},
		{
			name:    "Customer Service",
			handler: (*Server).proxyToCustomerService,
			path:    "/api/v1/customers",
		},
		{
			name:    "Inventory Service",
			handler: (*Server).proxyToInventoryService,
			path:    "/api/v1/inventory/vehicles",
		},
		{
			name:    "Email Service",
			handler: (*Server).proxyToEmailService,
			path:    "/api/v1/email/send",
		},
		{
			name:    "User Service",
			handler: (*Server).proxyToUserService,
			path:    "/api/v1/users",
		},
		{
			name:    "Config Service",
			handler: (*Server).proxyToConfigService,
			path:    "/api/v1/config/settings",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Create mock backend service
			mockService := mockBackendService(t, "test-dealership-123")
			defer mockService.Close()

			// Create test server with all service URLs pointing to mock
			config := &Config{
				Port:                "8080",
				DealServiceURL:      mockService.URL,
				CustomerServiceURL:  mockService.URL,
				InventoryServiceURL: mockService.URL,
				EmailServiceURL:     mockService.URL,
				UserServiceURL:      mockService.URL,
				ConfigServiceURL:    mockService.URL,
				AllowedOrigins:      "*",
				JWTSecret:           "development-secret-change-in-production-testing",
				JWTIssuer:           "test-issuer",
			}
			server := NewServer(config)

			// Create test request
			req := httptest.NewRequest("GET", tc.path, nil)

			// Add JWT context
			ctx := req.Context()
			ctx = context.WithValue(ctx, ContextKeyDealershipID, "test-dealership-123")
			ctx = context.WithValue(ctx, ContextKeyUserID, "user-456")
			req = req.WithContext(ctx)

			// Create response recorder
			rr := httptest.NewRecorder()

			// Execute proxy request
			tc.handler(server, rr, req)

			// Verify response
			if status := rr.Code; status != http.StatusOK {
				t.Errorf("%s: Handler returned wrong status code: got %v want %v", tc.name, status, http.StatusOK)
			}
		})
	}
}
