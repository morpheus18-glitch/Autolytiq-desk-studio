package main

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"regexp"
	"strings"
)

// ValidationError represents a single validation error
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
	Code    string `json:"code,omitempty"`
}

// ValidationErrors represents a collection of validation errors
type ValidationErrors struct {
	Errors []ValidationError `json:"errors"`
}

// ValidationErrorResponse is the standard error response format
type ValidationErrorResponse struct {
	Error   string            `json:"error"`
	Code    string            `json:"code"`
	Details []ValidationError `json:"details,omitempty"`
}

// Constants for validation
const (
	MaxBodySize        = 10 * 1024 * 1024 // 10MB max request body
	MaxJSONDepth       = 20               // Maximum JSON nesting depth
	MaxFieldLength     = 10000            // Maximum field value length
	MaxArrayElements   = 1000             // Maximum array elements
)

var (
	uuidRegex  = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)
	emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
)

// GatewayValidationMiddleware provides request validation at the gateway level
func GatewayValidationMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Only validate requests that may have a body
		if r.Method == http.MethodPost || r.Method == http.MethodPut || r.Method == http.MethodPatch {
			// Check content type for methods that should have JSON
			contentType := r.Header.Get("Content-Type")
			if contentType != "" && !strings.HasPrefix(contentType, "application/json") {
				// Allow multipart for file uploads
				if !strings.HasPrefix(contentType, "multipart/form-data") {
					respondGatewayError(w, http.StatusUnsupportedMediaType,
						"Content-Type must be application/json", "UNSUPPORTED_MEDIA_TYPE")
					return
				}
			}

			// Validate JSON body if present and content type is JSON
			if strings.HasPrefix(contentType, "application/json") {
				if r.Body == nil || r.ContentLength == 0 {
					// POST/PUT usually require a body, but let the service decide
					next.ServeHTTP(w, r)
					return
				}

				// Check content length
				if r.ContentLength > MaxBodySize {
					respondGatewayError(w, http.StatusRequestEntityTooLarge,
						"Request body too large", "REQUEST_TOO_LARGE")
					return
				}

				// Read and validate body
				bodyBytes, err := io.ReadAll(io.LimitReader(r.Body, MaxBodySize+1))
				if err != nil {
					respondGatewayError(w, http.StatusBadRequest,
						"Failed to read request body", "BODY_READ_ERROR")
					return
				}
				defer r.Body.Close()

				// Check actual size
				if int64(len(bodyBytes)) > MaxBodySize {
					respondGatewayError(w, http.StatusRequestEntityTooLarge,
						"Request body too large", "REQUEST_TOO_LARGE")
					return
				}

				// Validate JSON syntax
				if !json.Valid(bodyBytes) {
					respondGatewayError(w, http.StatusBadRequest,
						"Invalid JSON syntax", "INVALID_JSON")
					return
				}

				// Check JSON depth and structure
				if err := validateJSONStructure(bodyBytes); err != nil {
					respondGatewayError(w, http.StatusBadRequest, err.Error(), "INVALID_JSON_STRUCTURE")
					return
				}

				// Restore body for downstream handlers
				r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
			}
		}

		// Validate path parameters for UUID format
		if errors := validatePathParams(r); len(errors) > 0 {
			respondGatewayValidationError(w, errors)
			return
		}

		// Validate query parameters
		if errors := validateQueryParams(r); len(errors) > 0 {
			respondGatewayValidationError(w, errors)
			return
		}

		// Validate required headers
		if errors := validateHeaders(r); len(errors) > 0 {
			respondGatewayValidationError(w, errors)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// validateJSONStructure checks for excessively nested JSON or suspicious patterns
func validateJSONStructure(data []byte) error {
	var depth int
	var maxDepth int

	for _, b := range data {
		switch b {
		case '{', '[':
			depth++
			if depth > maxDepth {
				maxDepth = depth
			}
			if maxDepth > MaxJSONDepth {
				return &jsonStructureError{message: "JSON nesting too deep"}
			}
		case '}', ']':
			depth--
		}
	}

	return nil
}

type jsonStructureError struct {
	message string
}

func (e *jsonStructureError) Error() string {
	return e.message
}

// validatePathParams validates path parameters
func validatePathParams(r *http.Request) []ValidationError {
	var errors []ValidationError

	// Extract path segments that look like UUIDs
	// Common patterns: /api/v1/{resource}/{id}, /api/v1/{resource}/{id}/{action}
	pathSegments := strings.Split(strings.Trim(r.URL.Path, "/"), "/")

	for i, segment := range pathSegments {
		// Skip known path prefixes
		if segment == "api" || segment == "v1" || segment == "" {
			continue
		}

		// Check if this looks like it should be a UUID (follows a resource name)
		if i > 0 {
			prevSegment := pathSegments[i-1]
			// Common resource paths that expect UUID identifiers
			uuidResources := []string{
				"deals", "customers", "vehicles", "users", "templates",
				"conversations", "messages", "visits", "notes", "timers",
				"integrations", "features",
			}

			for _, resource := range uuidResources {
				if prevSegment == resource {
					// This segment should be a UUID
					if len(segment) > 0 && !uuidRegex.MatchString(segment) {
						// Check if it's not a sub-resource path
						if !isKnownSubResource(segment) {
							errors = append(errors, ValidationError{
								Field:   "id",
								Message: "Path parameter must be a valid UUID",
								Code:    "INVALID_UUID",
							})
						}
					}
					break
				}
			}
		}
	}

	return errors
}

// isKnownSubResource checks if a path segment is a known sub-resource
func isKnownSubResource(segment string) bool {
	knownSubResources := map[string]bool{
		"validate-vin": true,
		"status":       true,
		"vehicle":      true,
		"close":        true,
		"timers":       true,
		"notes":        true,
		"events":       true,
		"messages":     true,
		"read":         true,
		"reactions":    true,
		"typing":       true,
		"participants": true,
		"role":         true,
		"password":     true,
		"activity":     true,
		"preferences":  true,
		"evaluate":     true,
		"stats":        true,
		"stop":         true,
	}
	return knownSubResources[segment]
}

// validateQueryParams validates common query parameters
func validateQueryParams(r *http.Request) []ValidationError {
	var errors []ValidationError
	query := r.URL.Query()

	// Validate pagination parameters
	if limit := query.Get("limit"); limit != "" {
		if !isNumeric(limit) || parseInt(limit) < 0 || parseInt(limit) > 1000 {
			errors = append(errors, ValidationError{
				Field:   "limit",
				Message: "Limit must be a positive number between 0 and 1000",
				Code:    "INVALID_LIMIT",
			})
		}
	}

	if offset := query.Get("offset"); offset != "" {
		if !isNumeric(offset) || parseInt(offset) < 0 {
			errors = append(errors, ValidationError{
				Field:   "offset",
				Message: "Offset must be a non-negative number",
				Code:    "INVALID_OFFSET",
			})
		}
	}

	// Validate UUID query parameters
	uuidParams := []string{"dealership_id", "customer_id", "user_id", "vehicle_id", "salesperson_id"}
	for _, param := range uuidParams {
		if value := query.Get(param); value != "" {
			if !uuidRegex.MatchString(value) {
				errors = append(errors, ValidationError{
					Field:   param,
					Message: param + " must be a valid UUID",
					Code:    "INVALID_UUID",
				})
			}
		}
	}

	// Validate email query parameters
	if email := query.Get("email"); email != "" {
		if !emailRegex.MatchString(email) {
			errors = append(errors, ValidationError{
				Field:   "email",
				Message: "Email must be a valid email address",
				Code:    "INVALID_EMAIL",
			})
		}
	}

	return errors
}

// validateHeaders validates required headers for certain operations
func validateHeaders(r *http.Request) []ValidationError {
	var errors []ValidationError

	// For protected routes, X-Dealership-ID header is added by JWT middleware
	// We validate format if present
	if dealershipID := r.Header.Get("X-Dealership-ID"); dealershipID != "" {
		if !uuidRegex.MatchString(dealershipID) {
			errors = append(errors, ValidationError{
				Field:   "X-Dealership-ID",
				Message: "X-Dealership-ID header must be a valid UUID",
				Code:    "INVALID_UUID",
			})
		}
	}

	if userID := r.Header.Get("X-User-ID"); userID != "" {
		if !uuidRegex.MatchString(userID) {
			errors = append(errors, ValidationError{
				Field:   "X-User-ID",
				Message: "X-User-ID header must be a valid UUID",
				Code:    "INVALID_UUID",
			})
		}
	}

	return errors
}

// respondGatewayError writes an error response
func respondGatewayError(w http.ResponseWriter, status int, message, code string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(ValidationErrorResponse{
		Error: message,
		Code:  code,
	})
}

// respondGatewayValidationError writes a validation error response
func respondGatewayValidationError(w http.ResponseWriter, errors []ValidationError) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadRequest)
	json.NewEncoder(w).Encode(ValidationErrorResponse{
		Error:   "Validation failed",
		Code:    "VALIDATION_ERROR",
		Details: errors,
	})
}

// Helper functions
func isNumeric(s string) bool {
	for _, c := range s {
		if c < '0' || c > '9' {
			return false
		}
	}
	return len(s) > 0
}

func parseInt(s string) int {
	var result int
	for _, c := range s {
		result = result*10 + int(c-'0')
	}
	return result
}

// SanitizeRequestBody sanitizes common fields in the request body
func SanitizeRequestBody(body []byte) ([]byte, error) {
	var data map[string]interface{}
	if err := json.Unmarshal(body, &data); err != nil {
		return body, err
	}

	sanitizeMap(data)

	return json.Marshal(data)
}

// sanitizeMap recursively sanitizes a map
func sanitizeMap(data map[string]interface{}) {
	for key, value := range data {
		switch v := value.(type) {
		case string:
			// Trim whitespace from string fields
			data[key] = strings.TrimSpace(v)
		case map[string]interface{}:
			sanitizeMap(v)
		case []interface{}:
			for i, item := range v {
				if m, ok := item.(map[string]interface{}); ok {
					sanitizeMap(m)
				} else if s, ok := item.(string); ok {
					v[i] = strings.TrimSpace(s)
				}
			}
		}
	}
}
