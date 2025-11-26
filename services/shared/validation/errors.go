package validation

import (
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"
)

// Common error codes
const (
	ErrCodeRequired      = "REQUIRED"
	ErrCodeInvalid       = "INVALID"
	ErrCodeInvalidFormat = "INVALID_FORMAT"
	ErrCodeTooShort      = "TOO_SHORT"
	ErrCodeTooLong       = "TOO_LONG"
	ErrCodeOutOfRange    = "OUT_OF_RANGE"
	ErrCodeInvalidEnum   = "INVALID_ENUM"
	ErrCodeInvalidUUID   = "INVALID_UUID"
	ErrCodeInvalidEmail  = "INVALID_EMAIL"
	ErrCodeInvalidPhone  = "INVALID_PHONE"
	ErrCodeInvalidSSN    = "INVALID_SSN"
	ErrCodeInvalidVIN    = "INVALID_VIN"
	ErrCodeInvalidState  = "INVALID_STATE"
	ErrCodeInvalidZip    = "INVALID_ZIP"
	ErrCodeNegative      = "NEGATIVE_VALUE"
	ErrCodeDuplicate     = "DUPLICATE"
)

// EmailRegex is exported for use in tests
var EmailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

// UUIDRegex for validating UUID format
var UUIDRegex = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

// Add adds a validation error
func (v *ValidationErrors) Add(field, message string) {
	v.Errors = append(v.Errors, ValidationError{
		Field:   field,
		Message: message,
	})
}

// AddWithCode adds a validation error with a specific code
func (v *ValidationErrors) AddWithCode(field, message, code string) {
	v.Errors = append(v.Errors, ValidationError{
		Field:   field,
		Message: message,
		Code:    code,
	})
}

// GetFieldErrors returns all errors for a specific field
func (v *ValidationErrors) GetFieldErrors(field string) []ValidationError {
	var fieldErrors []ValidationError
	for _, err := range v.Errors {
		if err.Field == field {
			fieldErrors = append(fieldErrors, err)
		}
	}
	return fieldErrors
}

// Merge merges another ValidationErrors into this one
func (v *ValidationErrors) Merge(other *ValidationErrors) {
	if other == nil || !other.HasErrors() {
		return
	}
	v.Errors = append(v.Errors, other.Errors...)
}

// Code field for ValidationError
type ValidationErrorWithCode struct {
	Field   string `json:"field"`
	Message string `json:"message"`
	Code    string `json:"code,omitempty"`
	Value   string `json:"value,omitempty"`
}

// NewValidationErrors creates a new empty ValidationErrors
func NewValidationErrors() *ValidationErrors {
	return &ValidationErrors{Errors: []ValidationError{}}
}

// NewValidationError creates a new ValidationErrors with a single error
func NewValidationError(field, message string) *ValidationErrors {
	return &ValidationErrors{
		Errors: []ValidationError{{
			Field:   field,
			Message: message,
		}},
	}
}

// ToResponse converts ValidationErrors to ErrorResponse
func (v *ValidationErrors) ToResponse() ErrorResponse {
	return ErrorResponse{
		Error:   "Validation failed",
		Code:    "VALIDATION_ERROR",
		Details: v.Errors,
	}
}

// WriteValidationErrorResponse writes a validation error response to the http.ResponseWriter
func WriteValidationErrorResponse(w http.ResponseWriter, errors *ValidationErrors) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadRequest)
	json.NewEncoder(w).Encode(errors.ToResponse())
}

// WriteErrorResponse writes a simple error response
func WriteErrorResponse(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(ErrorResponse{
		Error: message,
	})
}

// WriteErrorResponseWithCode writes an error response with a code
func WriteErrorResponseWithCode(w http.ResponseWriter, status int, message, code string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(ErrorResponse{
		Error: message,
		Code:  code,
	})
}

// Helper functions to create common validation errors

// RequiredError creates a required field validation error
func RequiredError(field string) ValidationError {
	return ValidationError{
		Field:   field,
		Message: field + " is required",
		Code:    ErrCodeRequired,
	}
}

// InvalidError creates an invalid field validation error
func InvalidError(field, message string) ValidationError {
	return ValidationError{
		Field:   field,
		Message: message,
		Code:    ErrCodeInvalid,
	}
}

// FormatError creates a format validation error
func FormatError(field, expectedFormat string) ValidationError {
	return ValidationError{
		Field:   field,
		Message: fmt.Sprintf("%s must be in format: %s", field, expectedFormat),
		Code:    ErrCodeInvalidFormat,
	}
}

// LengthError creates a length validation error
func LengthError(field string, min, max int) ValidationError {
	var message string
	if min > 0 && max > 0 {
		message = fmt.Sprintf("%s must be between %d and %d characters", field, min, max)
	} else if min > 0 {
		message = fmt.Sprintf("%s must be at least %d characters", field, min)
	} else {
		message = fmt.Sprintf("%s must be at most %d characters", field, max)
	}
	return ValidationError{
		Field:   field,
		Message: message,
		Code:    ErrCodeTooShort,
	}
}

// RangeError creates a range validation error
func RangeError(field string, min, max interface{}) ValidationError {
	return ValidationError{
		Field:   field,
		Message: fmt.Sprintf("%s must be between %v and %v", field, min, max),
		Code:    ErrCodeOutOfRange,
	}
}

// EnumError creates an enum validation error
func EnumError(field string, allowedValues []string) ValidationError {
	return ValidationError{
		Field:   field,
		Message: fmt.Sprintf("%s must be one of: %s", field, strings.Join(allowedValues, ", ")),
		Code:    ErrCodeInvalidEnum,
	}
}

// UUIDError creates a UUID validation error
func UUIDError(field string) ValidationError {
	return ValidationError{
		Field:   field,
		Message: fmt.Sprintf("%s must be a valid UUID", field),
		Code:    ErrCodeInvalidUUID,
	}
}

// EmailError creates an email validation error
func EmailError(field string) ValidationError {
	return ValidationError{
		Field:   field,
		Message: fmt.Sprintf("%s must be a valid email address", field),
		Code:    ErrCodeInvalidEmail,
	}
}

// PhoneError creates a phone validation error
func PhoneError(field string) ValidationError {
	return ValidationError{
		Field:   field,
		Message: fmt.Sprintf("%s must be a valid phone number", field),
		Code:    ErrCodeInvalidPhone,
	}
}

// VINError creates a VIN validation error
func VINError(field string) ValidationError {
	return ValidationError{
		Field:   field,
		Message: fmt.Sprintf("%s must be a valid 17-character VIN with correct checksum", field),
		Code:    ErrCodeInvalidVIN,
	}
}

// StateError creates a state code validation error
func StateError(field string) ValidationError {
	return ValidationError{
		Field:   field,
		Message: fmt.Sprintf("%s must be a valid US state code", field),
		Code:    ErrCodeInvalidState,
	}
}

// ZipError creates a ZIP code validation error
func ZipError(field string) ValidationError {
	return ValidationError{
		Field:   field,
		Message: fmt.Sprintf("%s must be a valid ZIP code (5 or 9 digits)", field),
		Code:    ErrCodeInvalidZip,
	}
}

// NegativeError creates a negative value validation error
func NegativeError(field string) ValidationError {
	return ValidationError{
		Field:   field,
		Message: fmt.Sprintf("%s cannot be negative", field),
		Code:    ErrCodeNegative,
	}
}

// ValidateAndSanitize validates and sanitizes a value that implements both interfaces
func ValidateAndSanitize(v interface{}) *ValidationErrors {
	// Sanitize first if applicable
	if sanitizable, ok := v.(Sanitizable); ok {
		sanitizable.Sanitize()
	}

	// Then validate
	if validatable, ok := v.(Validatable); ok {
		return validatable.Validate()
	}

	return nil
}

// IsValidUUID validates a UUID string
func IsValidUUID(s string) bool {
	return UUIDRegex.MatchString(s)
}

// IsValidEmail validates an email string
func IsValidEmail(s string) bool {
	if s == "" {
		return false
	}
	return EmailRegex.MatchString(s)
}
