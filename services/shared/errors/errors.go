// Package errors provides standardized error handling for Autolytiq services.
//
// This package defines a consistent error response format across all microservices,
// making it easier for clients to parse and handle errors uniformly.
package errors

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"
)

// ErrorCode represents a standardized error code
type ErrorCode string

// Standard error codes
const (
	// Client errors (4xx)
	CodeValidationError   ErrorCode = "VALIDATION_ERROR"
	CodeBadRequest        ErrorCode = "BAD_REQUEST"
	CodeUnauthorized      ErrorCode = "UNAUTHORIZED"
	CodeForbidden         ErrorCode = "FORBIDDEN"
	CodeNotFound          ErrorCode = "NOT_FOUND"
	CodeMethodNotAllowed  ErrorCode = "METHOD_NOT_ALLOWED"
	CodeConflict          ErrorCode = "CONFLICT"
	CodeTooManyRequests   ErrorCode = "TOO_MANY_REQUESTS"
	CodePayloadTooLarge   ErrorCode = "PAYLOAD_TOO_LARGE"
	CodeUnprocessable     ErrorCode = "UNPROCESSABLE_ENTITY"

	// Server errors (5xx)
	CodeInternalError     ErrorCode = "INTERNAL_ERROR"
	CodeServiceUnavailable ErrorCode = "SERVICE_UNAVAILABLE"
	CodeDatabaseError     ErrorCode = "DATABASE_ERROR"
	CodeExternalService   ErrorCode = "EXTERNAL_SERVICE_ERROR"
	CodeTimeout           ErrorCode = "TIMEOUT"

	// Business logic errors
	CodeInsufficientFunds  ErrorCode = "INSUFFICIENT_FUNDS"
	CodeCreditDenied       ErrorCode = "CREDIT_DENIED"
	CodeInventoryUnavailable ErrorCode = "INVENTORY_UNAVAILABLE"
	CodeDealExpired        ErrorCode = "DEAL_EXPIRED"
	CodeDuplicateEntry     ErrorCode = "DUPLICATE_ENTRY"
	CodeInvalidState       ErrorCode = "INVALID_STATE"
)

// APIError represents a standardized API error response
type APIError struct {
	// Code is a machine-readable error code
	Code ErrorCode `json:"code"`

	// Message is a human-readable error message
	Message string `json:"message"`

	// Details contains additional error context (field errors, etc.)
	Details map[string]interface{} `json:"details,omitempty"`

	// RequestID is the unique identifier for this request (for debugging)
	RequestID string `json:"request_id"`

	// Timestamp when the error occurred
	Timestamp time.Time `json:"timestamp"`

	// Path is the request path that caused the error
	Path string `json:"path,omitempty"`

	// HTTPStatus is not serialized but used internally
	HTTPStatus int `json:"-"`
}

// Error implements the error interface
func (e *APIError) Error() string {
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

// WithDetail adds a detail to the error
func (e *APIError) WithDetail(key string, value interface{}) *APIError {
	if e.Details == nil {
		e.Details = make(map[string]interface{})
	}
	e.Details[key] = value
	return e
}

// WithPath sets the request path
func (e *APIError) WithPath(path string) *APIError {
	e.Path = path
	return e
}

// WithRequestID sets the request ID
func (e *APIError) WithRequestID(requestID string) *APIError {
	e.RequestID = requestID
	return e
}

// FieldError represents a validation error for a specific field
type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
	Code    string `json:"code,omitempty"`
}

// ValidationError represents validation failures
type ValidationError struct {
	*APIError
	Fields []FieldError `json:"fields,omitempty"`
}

// ============================================================================
// Error Constructors
// ============================================================================

// NewError creates a new API error
func NewError(code ErrorCode, message string, httpStatus int) *APIError {
	return &APIError{
		Code:       code,
		Message:    message,
		HTTPStatus: httpStatus,
		Timestamp:  time.Now(),
		RequestID:  uuid.New().String(),
	}
}

// Validation creates a validation error
func Validation(message string) *APIError {
	return NewError(CodeValidationError, message, http.StatusBadRequest)
}

// ValidationWithFields creates a validation error with field-level errors
func ValidationWithFields(fields []FieldError) *APIError {
	err := NewError(CodeValidationError, "Validation failed", http.StatusBadRequest)
	err.Details = map[string]interface{}{
		"fields": fields,
	}
	return err
}

// BadRequest creates a bad request error
func BadRequest(message string) *APIError {
	return NewError(CodeBadRequest, message, http.StatusBadRequest)
}

// Unauthorized creates an unauthorized error
func Unauthorized(message string) *APIError {
	if message == "" {
		message = "Authentication required"
	}
	return NewError(CodeUnauthorized, message, http.StatusUnauthorized)
}

// Forbidden creates a forbidden error
func Forbidden(message string) *APIError {
	if message == "" {
		message = "Access denied"
	}
	return NewError(CodeForbidden, message, http.StatusForbidden)
}

// NotFound creates a not found error
func NotFound(resource string) *APIError {
	message := "Resource not found"
	if resource != "" {
		message = fmt.Sprintf("%s not found", resource)
	}
	return NewError(CodeNotFound, message, http.StatusNotFound)
}

// Conflict creates a conflict error
func Conflict(message string) *APIError {
	return NewError(CodeConflict, message, http.StatusConflict)
}

// TooManyRequests creates a rate limit error
func TooManyRequests(retryAfter int) *APIError {
	err := NewError(CodeTooManyRequests, "Rate limit exceeded", http.StatusTooManyRequests)
	if retryAfter > 0 {
		err.Details = map[string]interface{}{
			"retry_after_seconds": retryAfter,
		}
	}
	return err
}

// Internal creates an internal server error
func Internal(message string) *APIError {
	if message == "" {
		message = "An internal error occurred"
	}
	return NewError(CodeInternalError, message, http.StatusInternalServerError)
}

// Database creates a database error
func Database(message string) *APIError {
	if message == "" {
		message = "Database operation failed"
	}
	return NewError(CodeDatabaseError, message, http.StatusInternalServerError)
}

// ServiceUnavailable creates a service unavailable error
func ServiceUnavailable(message string) *APIError {
	if message == "" {
		message = "Service temporarily unavailable"
	}
	return NewError(CodeServiceUnavailable, message, http.StatusServiceUnavailable)
}

// ExternalService creates an external service error
func ExternalService(service, message string) *APIError {
	err := NewError(CodeExternalService, message, http.StatusBadGateway)
	err.Details = map[string]interface{}{
		"service": service,
	}
	return err
}

// Timeout creates a timeout error
func Timeout(message string) *APIError {
	if message == "" {
		message = "Request timed out"
	}
	return NewError(CodeTimeout, message, http.StatusGatewayTimeout)
}

// ============================================================================
// Business Logic Errors
// ============================================================================

// CreditDenied creates a credit denial error
func CreditDenied(reason string) *APIError {
	return NewError(CodeCreditDenied, reason, http.StatusUnprocessableEntity)
}

// InsufficientFunds creates an insufficient funds error
func InsufficientFunds(required, available float64) *APIError {
	err := NewError(CodeInsufficientFunds, "Insufficient funds", http.StatusUnprocessableEntity)
	err.Details = map[string]interface{}{
		"required":  required,
		"available": available,
	}
	return err
}

// InventoryUnavailable creates an inventory unavailable error
func InventoryUnavailable(vin string) *APIError {
	err := NewError(CodeInventoryUnavailable, "Vehicle not available", http.StatusConflict)
	if vin != "" {
		err.Details = map[string]interface{}{
			"vin": vin,
		}
	}
	return err
}

// DealExpired creates a deal expired error
func DealExpired(dealID string) *APIError {
	err := NewError(CodeDealExpired, "Deal has expired", http.StatusGone)
	if dealID != "" {
		err.Details = map[string]interface{}{
			"deal_id": dealID,
		}
	}
	return err
}

// DuplicateEntry creates a duplicate entry error
func DuplicateEntry(field, value string) *APIError {
	err := NewError(CodeDuplicateEntry, "Duplicate entry", http.StatusConflict)
	err.Details = map[string]interface{}{
		"field": field,
		"value": value,
	}
	return err
}

// InvalidState creates an invalid state transition error
func InvalidState(current, requested string) *APIError {
	err := NewError(CodeInvalidState, "Invalid state transition", http.StatusUnprocessableEntity)
	err.Details = map[string]interface{}{
		"current_state":   current,
		"requested_state": requested,
	}
	return err
}

// ============================================================================
// HTTP Response Writer
// ============================================================================

// WriteError writes an API error to the HTTP response
func WriteError(w http.ResponseWriter, r *http.Request, err *APIError) {
	// Set request context
	err.Path = r.URL.Path
	if err.RequestID == "" {
		if reqID := r.Header.Get("X-Request-ID"); reqID != "" {
			err.RequestID = reqID
		} else {
			err.RequestID = uuid.New().String()
		}
	}
	if err.Timestamp.IsZero() {
		err.Timestamp = time.Now()
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Request-ID", err.RequestID)
	w.WriteHeader(err.HTTPStatus)

	json.NewEncoder(w).Encode(err)
}

// WriteErrorWithCode writes an error with a specific status code
func WriteErrorWithCode(w http.ResponseWriter, r *http.Request, statusCode int, code ErrorCode, message string) {
	err := NewError(code, message, statusCode)
	WriteError(w, r, err)
}

// WrapError wraps a standard Go error into an APIError
func WrapError(err error, code ErrorCode, httpStatus int) *APIError {
	if apiErr, ok := err.(*APIError); ok {
		return apiErr
	}
	return NewError(code, err.Error(), httpStatus)
}

// IsAPIError checks if an error is an APIError
func IsAPIError(err error) bool {
	_, ok := err.(*APIError)
	return ok
}

// GetAPIError extracts an APIError from an error, or returns nil
func GetAPIError(err error) *APIError {
	if apiErr, ok := err.(*APIError); ok {
		return apiErr
	}
	return nil
}
