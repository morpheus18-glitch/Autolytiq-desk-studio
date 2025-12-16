package main

import (
	"encoding/json"
	"net/http"
	"regexp"
	"strings"
)

// ValidationError represents a single validation error
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
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

// CreateDealRequest represents a request to create a deal
type CreateDealRequest struct {
	DealershipID  string `json:"dealership_id"`
	SalespersonID string `json:"salesperson_id"`
	CustomerID    string `json:"customer_id,omitempty"`
	VehicleID     string `json:"vehicle_id,omitempty"`
}

// UpdateDealRequest represents a request to update a deal
type UpdateDealRequest struct {
	CustomerID string `json:"customer_id,omitempty"`
	VehicleID  string `json:"vehicle_id,omitempty"`
}

var (
	uuidRegex    = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)
	validStatuses = map[string]bool{
		"draft":     true,
		"pending":   true,
		"approved":  true,
		"funded":    true,
		"delivered": true,
		"cancelled": true,
	}
)

// Validate validates CreateDealRequest
func (r *CreateDealRequest) Validate() *ValidationErrors {
	var errors []ValidationError

	// Dealership ID validation
	if r.DealershipID == "" {
		errors = append(errors, ValidationError{
			Field:   "dealership_id",
			Message: "Dealership ID is required",
		})
	} else if !uuidRegex.MatchString(r.DealershipID) {
		errors = append(errors, ValidationError{
			Field:   "dealership_id",
			Message: "Must be a valid UUID",
		})
	}

	// Salesperson ID validation
	if r.SalespersonID == "" {
		errors = append(errors, ValidationError{
			Field:   "salesperson_id",
			Message: "Salesperson ID is required",
		})
	} else if !uuidRegex.MatchString(r.SalespersonID) {
		errors = append(errors, ValidationError{
			Field:   "salesperson_id",
			Message: "Must be a valid UUID",
		})
	}

	// Customer ID validation (optional but if provided, must be valid)
	if r.CustomerID != "" && !uuidRegex.MatchString(r.CustomerID) {
		errors = append(errors, ValidationError{
			Field:   "customer_id",
			Message: "Must be a valid UUID",
		})
	}

	// Vehicle ID validation (optional but if provided, must be valid)
	if r.VehicleID != "" && !uuidRegex.MatchString(r.VehicleID) {
		errors = append(errors, ValidationError{
			Field:   "vehicle_id",
			Message: "Must be a valid UUID",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes CreateDealRequest
func (r *CreateDealRequest) Sanitize() {
	r.DealershipID = strings.TrimSpace(r.DealershipID)
	r.CustomerID = strings.TrimSpace(r.CustomerID)
	r.VehicleID = strings.TrimSpace(r.VehicleID)
	r.SalespersonID = strings.TrimSpace(r.SalespersonID)
}

// Validate validates UpdateDealRequest
func (r *UpdateDealRequest) Validate() *ValidationErrors {
	var errors []ValidationError

	// Customer ID validation (optional but if provided, must be valid)
	if r.CustomerID != "" && !uuidRegex.MatchString(r.CustomerID) {
		errors = append(errors, ValidationError{
			Field:   "customer_id",
			Message: "Must be a valid UUID",
		})
	}

	// Vehicle ID validation (optional but if provided, must be valid)
	if r.VehicleID != "" && !uuidRegex.MatchString(r.VehicleID) {
		errors = append(errors, ValidationError{
			Field:   "vehicle_id",
			Message: "Must be a valid UUID",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes UpdateDealRequest
func (r *UpdateDealRequest) Sanitize() {
	r.CustomerID = strings.TrimSpace(r.CustomerID)
	r.VehicleID = strings.TrimSpace(r.VehicleID)
}

// respondValidationError writes a validation error response
func respondValidationError(w http.ResponseWriter, errors *ValidationErrors) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadRequest)
	json.NewEncoder(w).Encode(ValidationErrorResponse{
		Error:   "Validation failed",
		Code:    "VALIDATION_ERROR",
		Details: errors.Errors,
	})
}

// respondErrorJSON writes a JSON error response
func respondErrorJSON(w http.ResponseWriter, status int, message, code string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(ValidationErrorResponse{
		Error: message,
		Code:  code,
	})
}

// Validatable interface for types that can validate themselves
type Validatable interface {
	Validate() *ValidationErrors
}

// Sanitizable interface for types that can sanitize themselves
type Sanitizable interface {
	Sanitize()
}

// decodeAndValidate decodes JSON and validates the request
func decodeAndValidate(r *http.Request, w http.ResponseWriter, dst interface{}) bool {
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		respondErrorJSON(w, http.StatusBadRequest, "Invalid request body: "+err.Error(), "INVALID_JSON")
		return false
	}

	// Sanitize if applicable
	if sanitizable, ok := dst.(Sanitizable); ok {
		sanitizable.Sanitize()
	}

	// Validate if applicable
	if validatable, ok := dst.(Validatable); ok {
		if errs := validatable.Validate(); errs != nil {
			respondValidationError(w, errs)
			return false
		}
	}

	return true
}

// validateUUID validates a UUID path parameter
func validateUUID(w http.ResponseWriter, id, fieldName string) bool {
	if !uuidRegex.MatchString(id) {
		respondValidationError(w, &ValidationErrors{
			Errors: []ValidationError{{
				Field:   fieldName,
				Message: "Must be a valid UUID",
			}},
		})
		return false
	}
	return true
}
