package validation

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// TestRequest for testing Validatable and Sanitizable interfaces
type TestRequest struct {
	Email string `json:"email"`
	Name  string `json:"name"`
}

func (r *TestRequest) Validate() *ValidationErrors {
	errors := &ValidationErrors{Errors: []ValidationError{}}
	if r.Email == "" {
		errors.Add("email", "Email is required")
	} else if !EmailRegex.MatchString(r.Email) {
		errors.Add("email", "Must be a valid email address")
	}
	if r.Name == "" {
		errors.Add("name", "Name is required")
	}
	if errors.HasErrors() {
		return errors
	}
	return nil
}

func (r *TestRequest) Sanitize() {
	r.Email = NewSanitizer().NormalizeEmail(r.Email)
	r.Name = NewSanitizer().NormalizeWhitespace(r.Name)
}

func TestDecodeValidateRequest(t *testing.T) {
	tests := []struct {
		name           string
		body           string
		contentType    string
		expectedStatus int
		expectedValid  bool
	}{
		{
			name:           "Valid request",
			body:           `{"email":"user@example.com","name":"John Doe"}`,
			contentType:    "application/json",
			expectedStatus: http.StatusOK,
			expectedValid:  true,
		},
		{
			name:           "Valid request sanitizes",
			body:           `{"email":"  USER@EXAMPLE.COM  ","name":"  John   Doe  "}`,
			contentType:    "application/json",
			expectedStatus: http.StatusOK,
			expectedValid:  true,
		},
		{
			name:           "Missing email",
			body:           `{"name":"John Doe"}`,
			contentType:    "application/json",
			expectedStatus: http.StatusBadRequest,
			expectedValid:  false,
		},
		{
			name:           "Invalid email",
			body:           `{"email":"invalid","name":"John Doe"}`,
			contentType:    "application/json",
			expectedStatus: http.StatusBadRequest,
			expectedValid:  false,
		},
		{
			name:           "Invalid JSON",
			body:           `{"email":`,
			contentType:    "application/json",
			expectedStatus: http.StatusBadRequest,
			expectedValid:  false,
		},
		{
			name:           "Empty body",
			body:           ``,
			contentType:    "application/json",
			expectedStatus: http.StatusBadRequest,
			expectedValid:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("POST", "/test", bytes.NewBufferString(tt.body))
			if tt.contentType != "" {
				req.Header.Set("Content-Type", tt.contentType)
			}
			w := httptest.NewRecorder()

			var testReq TestRequest
			valid := DecodeValidateRequest(req, w, &testReq)

			if valid != tt.expectedValid {
				t.Errorf("DecodeValidateRequest() valid = %v, want %v", valid, tt.expectedValid)
			}

			if !tt.expectedValid && w.Code != tt.expectedStatus {
				t.Errorf("Response status = %d, want %d", w.Code, tt.expectedStatus)
			}

			// Check sanitization worked for valid requests
			if tt.expectedValid && tt.name == "Valid request sanitizes" {
				if testReq.Email != "user@example.com" {
					t.Errorf("Email not sanitized: got %q", testReq.Email)
				}
				if testReq.Name != "John Doe" {
					t.Errorf("Name not sanitized: got %q", testReq.Name)
				}
			}
		})
	}
}

func TestRequireHeaders(t *testing.T) {
	tests := []struct {
		name           string
		headers        map[string]string
		requiredHeaders []string
		expectedValid  bool
	}{
		{
			name:            "All headers present",
			headers:         map[string]string{"X-User-ID": "123", "X-Dealership-ID": "456"},
			requiredHeaders: []string{"X-User-ID", "X-Dealership-ID"},
			expectedValid:   true,
		},
		{
			name:            "Missing one header",
			headers:         map[string]string{"X-User-ID": "123"},
			requiredHeaders: []string{"X-User-ID", "X-Dealership-ID"},
			expectedValid:   false,
		},
		{
			name:            "No headers",
			headers:         map[string]string{},
			requiredHeaders: []string{"X-User-ID"},
			expectedValid:   false,
		},
		{
			name:            "Empty header value",
			headers:         map[string]string{"X-User-ID": ""},
			requiredHeaders: []string{"X-User-ID"},
			expectedValid:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/test", nil)
			for k, v := range tt.headers {
				req.Header.Set(k, v)
			}
			w := httptest.NewRecorder()

			valid := RequireHeaders(w, req, tt.requiredHeaders...)

			if valid != tt.expectedValid {
				t.Errorf("RequireHeaders() = %v, want %v", valid, tt.expectedValid)
			}

			if !tt.expectedValid && w.Code != http.StatusBadRequest {
				t.Errorf("Response status = %d, want %d", w.Code, http.StatusBadRequest)
			}
		})
	}
}

func TestRequireUUIDHeader(t *testing.T) {
	tests := []struct {
		name          string
		headerValue   string
		expectedValid bool
		expectedValue string
	}{
		{
			name:          "Valid UUID",
			headerValue:   "550e8400-e29b-41d4-a716-446655440000",
			expectedValid: true,
			expectedValue: "550e8400-e29b-41d4-a716-446655440000",
		},
		{
			name:          "Missing header",
			headerValue:   "",
			expectedValid: false,
		},
		{
			name:          "Invalid UUID",
			headerValue:   "not-a-uuid",
			expectedValid: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/test", nil)
			if tt.headerValue != "" {
				req.Header.Set("X-User-ID", tt.headerValue)
			}
			w := httptest.NewRecorder()

			value, valid := RequireUUIDHeader(w, req, "X-User-ID")

			if valid != tt.expectedValid {
				t.Errorf("RequireUUIDHeader() valid = %v, want %v", valid, tt.expectedValid)
			}

			if tt.expectedValid && value != tt.expectedValue {
				t.Errorf("RequireUUIDHeader() value = %q, want %q", value, tt.expectedValue)
			}
		})
	}
}

func TestRequireQueryParam(t *testing.T) {
	tests := []struct {
		name          string
		queryParams   map[string]string
		paramName     string
		expectedValid bool
		expectedValue string
	}{
		{
			name:          "Param present",
			queryParams:   map[string]string{"id": "123"},
			paramName:     "id",
			expectedValid: true,
			expectedValue: "123",
		},
		{
			name:          "Param missing",
			queryParams:   map[string]string{},
			paramName:     "id",
			expectedValid: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			url := "/test?"
			for k, v := range tt.queryParams {
				url += k + "=" + v + "&"
			}
			req := httptest.NewRequest("GET", url, nil)
			w := httptest.NewRecorder()

			value, valid := RequireQueryParam(w, req, tt.paramName)

			if valid != tt.expectedValid {
				t.Errorf("RequireQueryParam() valid = %v, want %v", valid, tt.expectedValid)
			}

			if tt.expectedValid && value != tt.expectedValue {
				t.Errorf("RequireQueryParam() value = %q, want %q", value, tt.expectedValue)
			}
		})
	}
}

func TestGetPaginationParams(t *testing.T) {
	tests := []struct {
		name           string
		queryParams    map[string]string
		defaultLimit   int
		maxLimit       int
		expectedLimit  int
		expectedOffset int
	}{
		{
			name:           "Defaults",
			queryParams:    map[string]string{},
			defaultLimit:   50,
			maxLimit:       100,
			expectedLimit:  50,
			expectedOffset: 0,
		},
		{
			name:           "Custom limit",
			queryParams:    map[string]string{"limit": "25"},
			defaultLimit:   50,
			maxLimit:       100,
			expectedLimit:  25,
			expectedOffset: 0,
		},
		{
			name:           "Custom offset",
			queryParams:    map[string]string{"offset": "10"},
			defaultLimit:   50,
			maxLimit:       100,
			expectedLimit:  50,
			expectedOffset: 10,
		},
		{
			name:           "Both custom",
			queryParams:    map[string]string{"limit": "20", "offset": "5"},
			defaultLimit:   50,
			maxLimit:       100,
			expectedLimit:  20,
			expectedOffset: 5,
		},
		{
			name:           "Limit exceeds max",
			queryParams:    map[string]string{"limit": "200"},
			defaultLimit:   50,
			maxLimit:       100,
			expectedLimit:  100,
			expectedOffset: 0,
		},
		{
			name:           "Invalid limit",
			queryParams:    map[string]string{"limit": "abc"},
			defaultLimit:   50,
			maxLimit:       100,
			expectedLimit:  50,
			expectedOffset: 0,
		},
		{
			name:           "Negative limit",
			queryParams:    map[string]string{"limit": "-5"},
			defaultLimit:   50,
			maxLimit:       100,
			expectedLimit:  50,
			expectedOffset: 0,
		},
		{
			name:           "Negative offset",
			queryParams:    map[string]string{"offset": "-5"},
			defaultLimit:   50,
			maxLimit:       100,
			expectedLimit:  50,
			expectedOffset: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			url := "/test?"
			for k, v := range tt.queryParams {
				url += k + "=" + v + "&"
			}
			req := httptest.NewRequest("GET", url, nil)

			limit, offset := GetPaginationParams(req, tt.defaultLimit, tt.maxLimit)

			if limit != tt.expectedLimit {
				t.Errorf("GetPaginationParams() limit = %d, want %d", limit, tt.expectedLimit)
			}

			if offset != tt.expectedOffset {
				t.Errorf("GetPaginationParams() offset = %d, want %d", offset, tt.expectedOffset)
			}
		})
	}
}

func TestGetIntQueryParam(t *testing.T) {
	tests := []struct {
		name          string
		queryParams   map[string]string
		paramName     string
		defaultValue  int
		expectedValue int
	}{
		{
			name:          "Present",
			queryParams:   map[string]string{"count": "42"},
			paramName:     "count",
			defaultValue:  10,
			expectedValue: 42,
		},
		{
			name:          "Missing",
			queryParams:   map[string]string{},
			paramName:     "count",
			defaultValue:  10,
			expectedValue: 10,
		},
		{
			name:          "Invalid",
			queryParams:   map[string]string{"count": "abc"},
			paramName:     "count",
			defaultValue:  10,
			expectedValue: 10,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			url := "/test?"
			for k, v := range tt.queryParams {
				url += k + "=" + v + "&"
			}
			req := httptest.NewRequest("GET", url, nil)

			value := GetIntQueryParam(req, tt.paramName, tt.defaultValue)

			if value != tt.expectedValue {
				t.Errorf("GetIntQueryParam() = %d, want %d", value, tt.expectedValue)
			}
		})
	}
}

func TestGetBoolQueryParam(t *testing.T) {
	tests := []struct {
		name          string
		queryParams   map[string]string
		paramName     string
		defaultValue  bool
		expectedValue bool
	}{
		{
			name:          "True",
			queryParams:   map[string]string{"active": "true"},
			paramName:     "active",
			defaultValue:  false,
			expectedValue: true,
		},
		{
			name:          "False",
			queryParams:   map[string]string{"active": "false"},
			paramName:     "active",
			defaultValue:  true,
			expectedValue: false,
		},
		{
			name:          "Missing",
			queryParams:   map[string]string{},
			paramName:     "active",
			defaultValue:  true,
			expectedValue: true,
		},
		{
			name:          "Invalid",
			queryParams:   map[string]string{"active": "yes"},
			paramName:     "active",
			defaultValue:  false,
			expectedValue: false,
		},
		{
			name:          "1",
			queryParams:   map[string]string{"active": "1"},
			paramName:     "active",
			defaultValue:  false,
			expectedValue: true,
		},
		{
			name:          "0",
			queryParams:   map[string]string{"active": "0"},
			paramName:     "active",
			defaultValue:  true,
			expectedValue: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			url := "/test?"
			for k, v := range tt.queryParams {
				url += k + "=" + v + "&"
			}
			req := httptest.NewRequest("GET", url, nil)

			value := GetBoolQueryParam(req, tt.paramName, tt.defaultValue)

			if value != tt.expectedValue {
				t.Errorf("GetBoolQueryParam() = %v, want %v", value, tt.expectedValue)
			}
		})
	}
}

func TestValidateUUIDAndRespond(t *testing.T) {
	tests := []struct {
		name          string
		uuid          string
		expectedValid bool
	}{
		{
			name:          "Valid UUID",
			uuid:          "550e8400-e29b-41d4-a716-446655440000",
			expectedValid: true,
		},
		{
			name:          "Invalid UUID",
			uuid:          "not-a-uuid",
			expectedValid: false,
		},
		{
			name:          "Empty",
			uuid:          "",
			expectedValid: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()

			valid := ValidateUUIDAndRespond(w, tt.uuid, "id")

			if valid != tt.expectedValid {
				t.Errorf("ValidateUUIDAndRespond() = %v, want %v", valid, tt.expectedValid)
			}

			if !tt.expectedValid {
				if w.Code != http.StatusBadRequest {
					t.Errorf("Response status = %d, want %d", w.Code, http.StatusBadRequest)
				}

				var resp ErrorResponse
				if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
					t.Errorf("Failed to decode response: %v", err)
				}
				if resp.Code != "VALIDATION_ERROR" {
					t.Errorf("Response code = %q, want %q", resp.Code, "VALIDATION_ERROR")
				}
			}
		})
	}
}

func TestRespondValidationError(t *testing.T) {
	w := httptest.NewRecorder()

	errors := &ValidationErrors{
		Errors: []ValidationError{
			{Field: "email", Message: "Email is required"},
			{Field: "name", Message: "Name is required"},
		},
	}

	RespondValidationError(w, errors)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Response status = %d, want %d", w.Code, http.StatusBadRequest)
	}

	var resp ErrorResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Errorf("Failed to decode response: %v", err)
	}

	if resp.Error != "Validation failed" {
		t.Errorf("Response error = %q, want %q", resp.Error, "Validation failed")
	}

	if resp.Code != "VALIDATION_ERROR" {
		t.Errorf("Response code = %q, want %q", resp.Code, "VALIDATION_ERROR")
	}

	if len(resp.Details) != 2 {
		t.Errorf("Response details count = %d, want %d", len(resp.Details), 2)
	}
}

func TestValidationMiddleware(t *testing.T) {
	v := New()
	middleware := ValidationMiddleware(v)

	tests := []struct {
		name           string
		method         string
		contentType    string
		body           string
		expectedStatus int
	}{
		{
			name:           "GET request passes through",
			method:         "GET",
			contentType:    "",
			body:           "",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "POST with valid JSON",
			method:         "POST",
			contentType:    "application/json",
			body:           `{"test": "value"}`,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "POST with empty body",
			method:         "POST",
			contentType:    "application/json",
			body:           "",
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "POST with invalid JSON",
			method:         "POST",
			contentType:    "application/json",
			body:           `{"test":`,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "POST without content type passes through",
			method:         "POST",
			contentType:    "",
			body:           `{"test": "value"}`,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "PUT with valid JSON",
			method:         "PUT",
			contentType:    "application/json",
			body:           `{"test": "value"}`,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "PATCH with valid JSON",
			method:         "PATCH",
			contentType:    "application/json",
			body:           `{"test": "value"}`,
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			}))

			req := httptest.NewRequest(tt.method, "/test", bytes.NewBufferString(tt.body))
			if tt.contentType != "" {
				req.Header.Set("Content-Type", tt.contentType)
			}
			w := httptest.NewRecorder()

			handler.ServeHTTP(w, req)

			if w.Code != tt.expectedStatus {
				t.Errorf("Response status = %d, want %d", w.Code, tt.expectedStatus)
			}
		})
	}
}
