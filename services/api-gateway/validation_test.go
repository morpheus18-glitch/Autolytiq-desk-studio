package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestGatewayValidationMiddleware_JSONValidation(t *testing.T) {
	handler := GatewayValidationMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	tests := []struct {
		name           string
		method         string
		contentType    string
		body           string
		expectedStatus int
	}{
		{
			name:           "Valid JSON",
			method:         "POST",
			contentType:    "application/json",
			body:           `{"name":"test","value":123}`,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Valid JSON with nested objects",
			method:         "POST",
			contentType:    "application/json",
			body:           `{"user":{"name":"test","address":{"city":"NYC"}}}`,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Invalid JSON syntax",
			method:         "POST",
			contentType:    "application/json",
			body:           `{"name":"test"`,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Invalid JSON - trailing comma",
			method:         "POST",
			contentType:    "application/json",
			body:           `{"name":"test",}`,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "GET request passes through",
			method:         "GET",
			contentType:    "",
			body:           "",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "POST without content type passes",
			method:         "POST",
			contentType:    "",
			body:           `{"test":"value"}`,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "PUT with valid JSON",
			method:         "PUT",
			contentType:    "application/json",
			body:           `{"id":"123","name":"updated"}`,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "PATCH with valid JSON",
			method:         "PATCH",
			contentType:    "application/json",
			body:           `{"name":"patched"}`,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "POST with empty body",
			method:         "POST",
			contentType:    "application/json",
			body:           "",
			expectedStatus: http.StatusOK, // Let downstream service decide
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, "/api/v1/test", strings.NewReader(tt.body))
			if tt.contentType != "" {
				req.Header.Set("Content-Type", tt.contentType)
			}
			if tt.body != "" {
				req.ContentLength = int64(len(tt.body))
			}
			w := httptest.NewRecorder()

			handler.ServeHTTP(w, req)

			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d. Body: %s", tt.expectedStatus, w.Code, w.Body.String())
			}
		})
	}
}

func TestGatewayValidationMiddleware_UnsupportedMediaType(t *testing.T) {
	handler := GatewayValidationMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	tests := []struct {
		name           string
		contentType    string
		expectedStatus int
	}{
		{
			name:           "text/plain not allowed",
			contentType:    "text/plain",
			expectedStatus: http.StatusUnsupportedMediaType,
		},
		{
			name:           "text/html not allowed",
			contentType:    "text/html",
			expectedStatus: http.StatusUnsupportedMediaType,
		},
		{
			name:           "application/xml not allowed",
			contentType:    "application/xml",
			expectedStatus: http.StatusUnsupportedMediaType,
		},
		{
			name:           "multipart/form-data allowed",
			contentType:    "multipart/form-data; boundary=----",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "application/json allowed",
			contentType:    "application/json",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "application/json with charset allowed",
			contentType:    "application/json; charset=utf-8",
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body := `{"test":"value"}`
			req := httptest.NewRequest("POST", "/api/v1/test", strings.NewReader(body))
			req.Header.Set("Content-Type", tt.contentType)
			req.ContentLength = int64(len(body))
			w := httptest.NewRecorder()

			handler.ServeHTTP(w, req)

			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, w.Code)
			}
		})
	}
}

func TestValidatePathParams(t *testing.T) {
	tests := []struct {
		name        string
		path        string
		expectError bool
	}{
		{
			name:        "Valid deal UUID",
			path:        "/api/v1/deals/550e8400-e29b-41d4-a716-446655440000",
			expectError: false,
		},
		{
			name:        "Invalid deal UUID",
			path:        "/api/v1/deals/invalid-uuid",
			expectError: true,
		},
		{
			name:        "Valid customer UUID",
			path:        "/api/v1/customers/550e8400-e29b-41d4-a716-446655440000",
			expectError: false,
		},
		{
			name:        "Invalid customer UUID",
			path:        "/api/v1/customers/not-a-uuid",
			expectError: true,
		},
		{
			name:        "Sub-resource path - valid",
			path:        "/api/v1/deals/550e8400-e29b-41d4-a716-446655440000/status",
			expectError: false,
		},
		{
			name:        "Base resource path",
			path:        "/api/v1/deals",
			expectError: false,
		},
		{
			name:        "Validate VIN endpoint",
			path:        "/api/v1/inventory/vehicles/validate-vin",
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", tt.path, nil)
			errors := validatePathParams(req)

			if tt.expectError && len(errors) == 0 {
				t.Errorf("Expected validation errors but got none")
			}
			if !tt.expectError && len(errors) > 0 {
				t.Errorf("Expected no errors but got: %v", errors)
			}
		})
	}
}

func TestValidateQueryParams(t *testing.T) {
	tests := []struct {
		name        string
		queryParams string
		expectError bool
		errorField  string
	}{
		{
			name:        "Valid limit",
			queryParams: "limit=50",
			expectError: false,
		},
		{
			name:        "Invalid limit - negative",
			queryParams: "limit=-1",
			expectError: true,
			errorField:  "limit",
		},
		{
			name:        "Invalid limit - too large",
			queryParams: "limit=10000",
			expectError: true,
			errorField:  "limit",
		},
		{
			name:        "Invalid limit - not a number",
			queryParams: "limit=abc",
			expectError: true,
			errorField:  "limit",
		},
		{
			name:        "Valid offset",
			queryParams: "offset=100",
			expectError: false,
		},
		{
			name:        "Invalid offset - negative",
			queryParams: "offset=-10",
			expectError: true,
			errorField:  "offset",
		},
		{
			name:        "Valid dealership_id",
			queryParams: "dealership_id=550e8400-e29b-41d4-a716-446655440000",
			expectError: false,
		},
		{
			name:        "Invalid dealership_id",
			queryParams: "dealership_id=not-a-uuid",
			expectError: true,
			errorField:  "dealership_id",
		},
		{
			name:        "Valid email",
			queryParams: "email=user@example.com",
			expectError: false,
		},
		{
			name:        "Invalid email",
			queryParams: "email=invalid-email",
			expectError: true,
			errorField:  "email",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/api/v1/test?"+tt.queryParams, nil)
			errors := validateQueryParams(req)

			if tt.expectError && len(errors) == 0 {
				t.Errorf("Expected validation errors but got none")
			}
			if !tt.expectError && len(errors) > 0 {
				t.Errorf("Expected no errors but got: %v", errors)
			}
			if tt.expectError && len(errors) > 0 && errors[0].Field != tt.errorField {
				t.Errorf("Expected error on field %s but got %s", tt.errorField, errors[0].Field)
			}
		})
	}
}

func TestValidateHeaders(t *testing.T) {
	tests := []struct {
		name        string
		headers     map[string]string
		expectError bool
		errorField  string
	}{
		{
			name:        "Valid X-Dealership-ID",
			headers:     map[string]string{"X-Dealership-ID": "550e8400-e29b-41d4-a716-446655440000"},
			expectError: false,
		},
		{
			name:        "Invalid X-Dealership-ID",
			headers:     map[string]string{"X-Dealership-ID": "invalid"},
			expectError: true,
			errorField:  "X-Dealership-ID",
		},
		{
			name:        "Valid X-User-ID",
			headers:     map[string]string{"X-User-ID": "550e8400-e29b-41d4-a716-446655440000"},
			expectError: false,
		},
		{
			name:        "Invalid X-User-ID",
			headers:     map[string]string{"X-User-ID": "not-uuid"},
			expectError: true,
			errorField:  "X-User-ID",
		},
		{
			name:        "No validation headers",
			headers:     map[string]string{},
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/api/v1/test", nil)
			for k, v := range tt.headers {
				req.Header.Set(k, v)
			}
			errors := validateHeaders(req)

			if tt.expectError && len(errors) == 0 {
				t.Errorf("Expected validation errors but got none")
			}
			if !tt.expectError && len(errors) > 0 {
				t.Errorf("Expected no errors but got: %v", errors)
			}
			if tt.expectError && len(errors) > 0 && errors[0].Field != tt.errorField {
				t.Errorf("Expected error on field %s but got %s", tt.errorField, errors[0].Field)
			}
		})
	}
}

func TestValidateJSONStructure(t *testing.T) {
	tests := []struct {
		name        string
		json        string
		expectError bool
	}{
		{
			name:        "Simple object",
			json:        `{"name":"test"}`,
			expectError: false,
		},
		{
			name:        "Nested object",
			json:        `{"user":{"profile":{"name":"test"}}}`,
			expectError: false,
		},
		{
			name:        "Array",
			json:        `[{"name":"test"},{"name":"test2"}]`,
			expectError: false,
		},
		{
			name:        "Deeply nested (within limit)",
			json:        `{"a":{"b":{"c":{"d":{"e":{"f":"g"}}}}}}`,
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateJSONStructure([]byte(tt.json))

			if tt.expectError && err == nil {
				t.Errorf("Expected error but got none")
			}
			if !tt.expectError && err != nil {
				t.Errorf("Expected no error but got: %v", err)
			}
		})
	}
}

func TestSanitizeRequestBody(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected map[string]interface{}
	}{
		{
			name:  "Trim whitespace",
			input: `{"name":"  test  ","email":"  user@example.com  "}`,
			expected: map[string]interface{}{
				"name":  "test",
				"email": "user@example.com",
			},
		},
		{
			name:  "Nested object",
			input: `{"user":{"name":"  nested  "}}`,
			expected: map[string]interface{}{
				"user": map[string]interface{}{
					"name": "nested",
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := SanitizeRequestBody([]byte(tt.input))
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}

			var resultMap map[string]interface{}
			if err := json.Unmarshal(result, &resultMap); err != nil {
				t.Fatalf("Failed to unmarshal result: %v", err)
			}

			// Compare string values
			for key, expected := range tt.expected {
				actual := resultMap[key]
				// Handle nested maps
				if expectedMap, ok := expected.(map[string]interface{}); ok {
					if actual == nil {
						t.Errorf("Key %s is nil", key)
						continue
					}
					actualMap, ok := actual.(map[string]interface{})
					if !ok {
						t.Errorf("Key %s is not a map", key)
						continue
					}
					for nestedKey, nestedExpected := range expectedMap {
						if actualMap[nestedKey] != nestedExpected {
							t.Errorf("Key %s.%s: expected %v, got %v", key, nestedKey, nestedExpected, actualMap[nestedKey])
						}
					}
				} else if actual != expected {
					t.Errorf("Key %s: expected %v, got %v", key, expected, actual)
				}
			}
		})
	}
}

func TestRespondGatewayError(t *testing.T) {
	w := httptest.NewRecorder()

	respondGatewayError(w, http.StatusBadRequest, "Test error", "TEST_CODE")

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}

	var resp ValidationErrorResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if resp.Error != "Test error" {
		t.Errorf("Expected error 'Test error', got '%s'", resp.Error)
	}
	if resp.Code != "TEST_CODE" {
		t.Errorf("Expected code 'TEST_CODE', got '%s'", resp.Code)
	}
}

func TestRespondGatewayValidationError(t *testing.T) {
	w := httptest.NewRecorder()

	errors := []ValidationError{
		{Field: "email", Message: "Email is required", Code: "REQUIRED"},
		{Field: "name", Message: "Name is required", Code: "REQUIRED"},
	}

	respondGatewayValidationError(w, errors)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}

	var resp ValidationErrorResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if resp.Error != "Validation failed" {
		t.Errorf("Expected error 'Validation failed', got '%s'", resp.Error)
	}
	if resp.Code != "VALIDATION_ERROR" {
		t.Errorf("Expected code 'VALIDATION_ERROR', got '%s'", resp.Code)
	}
	if len(resp.Details) != 2 {
		t.Errorf("Expected 2 error details, got %d", len(resp.Details))
	}
}

func TestIsNumeric(t *testing.T) {
	tests := []struct {
		input    string
		expected bool
	}{
		{"123", true},
		{"0", true},
		{"", false},
		{"abc", false},
		{"12a", false},
		{"-1", false},
		{"1.5", false},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := isNumeric(tt.input)
			if result != tt.expected {
				t.Errorf("isNumeric(%q) = %v, want %v", tt.input, result, tt.expected)
			}
		})
	}
}

func TestParseInt(t *testing.T) {
	tests := []struct {
		input    string
		expected int
	}{
		{"0", 0},
		{"123", 123},
		{"999", 999},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := parseInt(tt.input)
			if result != tt.expected {
				t.Errorf("parseInt(%q) = %d, want %d", tt.input, result, tt.expected)
			}
		})
	}
}

func TestGatewayValidationMiddleware_LargeBody(t *testing.T) {
	handler := GatewayValidationMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Create a body larger than MaxBodySize
	largeBody := bytes.Repeat([]byte("x"), MaxBodySize+1)

	req := httptest.NewRequest("POST", "/api/v1/test", bytes.NewReader(largeBody))
	req.Header.Set("Content-Type", "application/json")
	req.ContentLength = int64(len(largeBody))
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	if w.Code != http.StatusRequestEntityTooLarge {
		t.Errorf("Expected status %d, got %d", http.StatusRequestEntityTooLarge, w.Code)
	}
}
