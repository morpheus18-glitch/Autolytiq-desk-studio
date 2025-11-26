package validation

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"
)

// ErrorResponse represents a standardized error response
type ErrorResponse struct {
	Error   string            `json:"error"`
	Code    string            `json:"code,omitempty"`
	Details []ValidationError `json:"details,omitempty"`
}

// RespondValidationError writes a validation error response
func RespondValidationError(w http.ResponseWriter, errors *ValidationErrors) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadRequest)

	response := ErrorResponse{
		Error:   "Validation failed",
		Code:    "VALIDATION_ERROR",
		Details: errors.Errors,
	}

	json.NewEncoder(w).Encode(response)
}

// RespondError writes a simple error response
func RespondError(w http.ResponseWriter, status int, message string, code string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	response := ErrorResponse{
		Error: message,
		Code:  code,
	}

	json.NewEncoder(w).Encode(response)
}

// RespondErrorSimple writes a simple error response without code
func RespondErrorSimple(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}

// MaxBodySize is the default maximum request body size (1MB)
const MaxBodySize = 1 * 1024 * 1024

// DecodeAndValidate decodes JSON from the request body and validates it
// Returns the validation errors or nil if valid
func DecodeAndValidate(r *http.Request, v *Validator, dst interface{}) *ValidationErrors {
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		return &ValidationErrors{
			Errors: []ValidationError{
				{
					Field:   "body",
					Message: "Invalid JSON: " + err.Error(),
				},
			},
		}
	}

	return v.Validate(dst)
}

// DecodeAndValidateWithSanitize decodes, sanitizes (if Sanitizable), and validates
func DecodeAndValidateWithSanitize(r *http.Request, v *Validator, dst interface{}) *ValidationErrors {
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		return &ValidationErrors{
			Errors: []ValidationError{
				{
					Field:   "body",
					Message: "Invalid JSON: " + err.Error(),
				},
			},
		}
	}

	// Check if the destination implements Sanitizable
	if sanitizable, ok := dst.(Sanitizable); ok {
		sanitizable.Sanitize()
	}

	return v.Validate(dst)
}

// DecodeValidateRequest is a handler-level helper that decodes, sanitizes, and validates
// Returns true if the request is valid; returns false and writes error response if invalid
func DecodeValidateRequest(r *http.Request, w http.ResponseWriter, dst interface{}) bool {
	// Check content type
	contentType := r.Header.Get("Content-Type")
	if contentType != "" && !strings.HasPrefix(contentType, "application/json") {
		RespondErrorSimple(w, http.StatusUnsupportedMediaType, "Content-Type must be application/json")
		return false
	}

	// Read body with size limit
	if r.Body == nil {
		RespondErrorSimple(w, http.StatusBadRequest, "Request body is required")
		return false
	}

	// Limit body size
	limitedReader := io.LimitReader(r.Body, MaxBodySize+1)
	bodyBytes, err := io.ReadAll(limitedReader)
	if err != nil {
		RespondErrorSimple(w, http.StatusBadRequest, "Failed to read request body")
		return false
	}

	if int64(len(bodyBytes)) > MaxBodySize {
		RespondErrorSimple(w, http.StatusRequestEntityTooLarge, "Request body too large")
		return false
	}

	// Restore body for potential re-reading
	r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

	// Decode JSON
	if err := json.Unmarshal(bodyBytes, dst); err != nil {
		var errMsg string
		switch e := err.(type) {
		case *json.SyntaxError:
			errMsg = "Invalid JSON syntax"
		case *json.UnmarshalTypeError:
			errMsg = "Invalid type for field " + e.Field
		default:
			errMsg = "Invalid request body: " + err.Error()
		}
		RespondErrorSimple(w, http.StatusBadRequest, errMsg)
		return false
	}

	// Sanitize if applicable
	if sanitizable, ok := dst.(Sanitizable); ok {
		sanitizable.Sanitize()
	}

	// Validate if applicable using the Validatable interface
	if validatable, ok := dst.(Validatable); ok {
		if errs := validatable.Validate(); errs != nil && errs.HasErrors() {
			RespondValidationError(w, errs)
			return false
		}
	}

	return true
}

// Validatable is an interface for types that can validate themselves
type Validatable interface {
	Validate() *ValidationErrors
}

// Sanitizable is an interface for types that can sanitize themselves
type Sanitizable interface {
	Sanitize()
}

// ValidationMiddleware creates a middleware that validates requests against a schema
func ValidationMiddleware(v *Validator) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Only validate POST, PUT, PATCH requests with JSON body
			if r.Method == "POST" || r.Method == "PUT" || r.Method == "PATCH" {
				contentType := r.Header.Get("Content-Type")
				if contentType != "" &&
				   (contentType == "application/json" ||
				    bytes.HasPrefix([]byte(contentType), []byte("application/json"))) {
					// Read body
					body, err := io.ReadAll(r.Body)
					if err != nil {
						RespondError(w, http.StatusBadRequest, "Failed to read request body", "BODY_READ_ERROR")
						return
					}
					r.Body.Close()

					// Check if body is empty for methods that require content
					if len(body) == 0 {
						RespondError(w, http.StatusBadRequest, "Request body is required", "EMPTY_BODY")
						return
					}

					// Validate JSON syntax
					var raw json.RawMessage
					if err := json.Unmarshal(body, &raw); err != nil {
						RespondError(w, http.StatusBadRequest, "Invalid JSON syntax: "+err.Error(), "INVALID_JSON")
						return
					}

					// Restore body for downstream handlers
					r.Body = io.NopCloser(bytes.NewBuffer(body))
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}

// ValidateQueryParam validates a query parameter
func ValidateQueryParam(r *http.Request, name string, required bool) (string, *ValidationError) {
	value := r.URL.Query().Get(name)

	if required && value == "" {
		return "", &ValidationError{
			Field:   name,
			Message: "Query parameter '" + name + "' is required",
		}
	}

	return value, nil
}

// ValidateHeader validates a header
func ValidateHeader(r *http.Request, name string, required bool) (string, *ValidationError) {
	value := r.Header.Get(name)

	if required && value == "" {
		return "", &ValidationError{
			Field:   name,
			Message: "Header '" + name + "' is required",
		}
	}

	return value, nil
}

// ValidateUUIDParam validates a UUID path or query parameter
// Returns error if validation fails
func ValidateUUIDParam(value string, fieldName string) *ValidationError {
	if value == "" {
		return &ValidationError{
			Field:   fieldName,
			Message: "UUID is required",
		}
	}

	if !IsValidUUID(value) {
		return &ValidationError{
			Field:   fieldName,
			Message: "Invalid UUID format",
		}
	}

	return nil
}

// ValidateUUIDAndRespond validates a UUID and writes error response if invalid
// Returns true if valid, false otherwise
func ValidateUUIDAndRespond(w http.ResponseWriter, value string, fieldName string) bool {
	if err := ValidateUUIDParam(value, fieldName); err != nil {
		RespondValidationError(w, &ValidationErrors{Errors: []ValidationError{*err}})
		return false
	}
	return true
}

// RequireHeaders validates that required headers are present
func RequireHeaders(w http.ResponseWriter, r *http.Request, headers ...string) bool {
	var errors []ValidationError

	for _, header := range headers {
		value := r.Header.Get(header)
		if value == "" {
			errors = append(errors, ValidationError{
				Field:   header,
				Message: "Header '" + header + "' is required",
			})
		}
	}

	if len(errors) > 0 {
		RespondValidationError(w, &ValidationErrors{Errors: errors})
		return false
	}

	return true
}

// RequireUUIDHeader validates that a header is present and is a valid UUID
func RequireUUIDHeader(w http.ResponseWriter, r *http.Request, headerName string) (string, bool) {
	value := r.Header.Get(headerName)
	if value == "" {
		RespondValidationError(w, &ValidationErrors{
			Errors: []ValidationError{{
				Field:   headerName,
				Message: "Header '" + headerName + "' is required",
			}},
		})
		return "", false
	}

	if !IsValidUUID(value) {
		RespondValidationError(w, &ValidationErrors{
			Errors: []ValidationError{{
				Field:   headerName,
				Message: "Header '" + headerName + "' must be a valid UUID",
			}},
		})
		return "", false
	}

	return value, true
}

// RequireQueryParam validates that a query parameter is present
func RequireQueryParam(w http.ResponseWriter, r *http.Request, name string) (string, bool) {
	value := r.URL.Query().Get(name)
	if value == "" {
		RespondValidationError(w, &ValidationErrors{
			Errors: []ValidationError{{
				Field:   name,
				Message: "Query parameter '" + name + "' is required",
			}},
		})
		return "", false
	}
	return value, true
}

// GetPaginationParams extracts and validates pagination parameters
func GetPaginationParams(r *http.Request, defaultLimit, maxLimit int) (limit, offset int) {
	limit = defaultLimit
	offset = 0

	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
			if limit > maxLimit {
				limit = maxLimit
			}
		}
	}

	if offsetStr := r.URL.Query().Get("offset"); offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	return limit, offset
}

// GetIntQueryParam extracts an integer query parameter with a default value
func GetIntQueryParam(r *http.Request, name string, defaultValue int) int {
	if valueStr := r.URL.Query().Get(name); valueStr != "" {
		if val, err := strconv.Atoi(valueStr); err == nil {
			return val
		}
	}
	return defaultValue
}

// GetBoolQueryParam extracts a boolean query parameter with a default value
func GetBoolQueryParam(r *http.Request, name string, defaultValue bool) bool {
	if valueStr := r.URL.Query().Get(name); valueStr != "" {
		if val, err := strconv.ParseBool(valueStr); err == nil {
			return val
		}
	}
	return defaultValue
}
