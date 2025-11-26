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

var (
	uuidRegex = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

	validVisitStatuses = map[string]bool{
		"CHECKED_IN":  true,
		"BROWSING":    true,
		"TEST_DRIVE":  true,
		"NEGOTIATING": true,
		"PAPERWORK":   true,
		"CLOSED_WON":  true,
		"CLOSED_LOST": true,
	}

	validTimerTypes = map[string]bool{
		"WAIT_TIME":    true,
		"TEST_DRIVE":   true,
		"NEGOTIATION":  true,
		"PAPERWORK":    true,
		"MANAGER_WAIT": true,
	}

	validVisitSources = map[string]bool{
		"WALK_IN":     true,
		"APPOINTMENT": true,
		"INTERNET":    true,
		"PHONE":       true,
		"REFERRAL":    true,
	}
)

// Validate validates CreateVisitRequest
func (r *CreateVisitRequest) Validate() *ValidationErrors {
	var errors []ValidationError

	// Customer ID validation
	if r.CustomerID == "" {
		errors = append(errors, ValidationError{
			Field:   "customer_id",
			Message: "Customer ID is required",
		})
	} else if !uuidRegex.MatchString(r.CustomerID) {
		errors = append(errors, ValidationError{
			Field:   "customer_id",
			Message: "Must be a valid UUID",
		})
	}

	// Salesperson ID validation (optional)
	if r.SalespersonID != nil && *r.SalespersonID != "" && !uuidRegex.MatchString(*r.SalespersonID) {
		errors = append(errors, ValidationError{
			Field:   "salesperson_id",
			Message: "Must be a valid UUID",
		})
	}

	// Vehicle ID validation (optional)
	if r.VehicleID != nil && *r.VehicleID != "" && !uuidRegex.MatchString(*r.VehicleID) {
		errors = append(errors, ValidationError{
			Field:   "vehicle_id",
			Message: "Must be a valid UUID",
		})
	}

	// Stock number validation (optional)
	if r.StockNumber != nil && len(*r.StockNumber) > 50 {
		errors = append(errors, ValidationError{
			Field:   "stock_number",
			Message: "Stock number must be 50 characters or less",
		})
	}

	// Source validation (optional)
	if r.Source != nil && *r.Source != "" && !validVisitSources[strings.ToUpper(*r.Source)] {
		errors = append(errors, ValidationError{
			Field:   "source",
			Message: "Invalid source. Must be one of: WALK_IN, APPOINTMENT, INTERNET, PHONE, REFERRAL",
		})
	}

	// Initial note validation (optional)
	if r.InitialNote != nil && len(*r.InitialNote) > 5000 {
		errors = append(errors, ValidationError{
			Field:   "initial_note",
			Message: "Initial note must be 5000 characters or less",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes CreateVisitRequest
func (r *CreateVisitRequest) Sanitize() {
	r.CustomerID = strings.TrimSpace(r.CustomerID)
	if r.SalespersonID != nil {
		val := strings.TrimSpace(*r.SalespersonID)
		r.SalespersonID = &val
	}
	if r.VehicleID != nil {
		val := strings.TrimSpace(*r.VehicleID)
		r.VehicleID = &val
	}
	if r.StockNumber != nil {
		val := strings.TrimSpace(*r.StockNumber)
		r.StockNumber = &val
	}
	if r.Source != nil {
		val := strings.TrimSpace(strings.ToUpper(*r.Source))
		r.Source = &val
	}
	if r.InitialNote != nil {
		val := strings.TrimSpace(*r.InitialNote)
		r.InitialNote = &val
	}
}

// Validate validates UpdateVisitRequest
func (r *UpdateVisitRequest) Validate() *ValidationErrors {
	var errors []ValidationError

	// Salesperson ID validation (optional)
	if r.SalespersonID != nil && *r.SalespersonID != "" && !uuidRegex.MatchString(*r.SalespersonID) {
		errors = append(errors, ValidationError{
			Field:   "salesperson_id",
			Message: "Must be a valid UUID",
		})
	}

	// Vehicle ID validation (optional)
	if r.VehicleID != nil && *r.VehicleID != "" && !uuidRegex.MatchString(*r.VehicleID) {
		errors = append(errors, ValidationError{
			Field:   "vehicle_id",
			Message: "Must be a valid UUID",
		})
	}

	// Stock number validation (optional)
	if r.StockNumber != nil && len(*r.StockNumber) > 50 {
		errors = append(errors, ValidationError{
			Field:   "stock_number",
			Message: "Stock number must be 50 characters or less",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes UpdateVisitRequest
func (r *UpdateVisitRequest) Sanitize() {
	if r.SalespersonID != nil {
		val := strings.TrimSpace(*r.SalespersonID)
		r.SalespersonID = &val
	}
	if r.VehicleID != nil {
		val := strings.TrimSpace(*r.VehicleID)
		r.VehicleID = &val
	}
	if r.StockNumber != nil {
		val := strings.TrimSpace(*r.StockNumber)
		r.StockNumber = &val
	}
}

// Validate validates ChangeStatusRequest
func (r *ChangeStatusRequest) Validate() *ValidationErrors {
	var errors []ValidationError

	// Status validation
	if r.Status == "" {
		errors = append(errors, ValidationError{
			Field:   "status",
			Message: "Status is required",
		})
	} else if !validVisitStatuses[strings.ToUpper(r.Status)] {
		errors = append(errors, ValidationError{
			Field:   "status",
			Message: "Invalid status. Must be one of: CHECKED_IN, BROWSING, TEST_DRIVE, NEGOTIATING, PAPERWORK, CLOSED_WON, CLOSED_LOST",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes ChangeStatusRequest
func (r *ChangeStatusRequest) Sanitize() {
	r.Status = strings.TrimSpace(strings.ToUpper(r.Status))
}

// Validate validates AttachVehicleRequest
func (r *AttachVehicleRequest) Validate() *ValidationErrors {
	var errors []ValidationError

	// Vehicle ID validation
	if r.VehicleID == "" {
		errors = append(errors, ValidationError{
			Field:   "vehicle_id",
			Message: "Vehicle ID is required",
		})
	} else if !uuidRegex.MatchString(r.VehicleID) {
		errors = append(errors, ValidationError{
			Field:   "vehicle_id",
			Message: "Must be a valid UUID",
		})
	}

	// Stock number validation (optional)
	if r.StockNumber != nil && len(*r.StockNumber) > 50 {
		errors = append(errors, ValidationError{
			Field:   "stock_number",
			Message: "Stock number must be 50 characters or less",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes AttachVehicleRequest
func (r *AttachVehicleRequest) Sanitize() {
	r.VehicleID = strings.TrimSpace(r.VehicleID)
	if r.StockNumber != nil {
		val := strings.TrimSpace(*r.StockNumber)
		r.StockNumber = &val
	}
}

// Validate validates StartTimerRequest
func (r *StartTimerRequest) Validate() *ValidationErrors {
	var errors []ValidationError

	// Timer type validation
	if r.TimerType == "" {
		errors = append(errors, ValidationError{
			Field:   "timer_type",
			Message: "Timer type is required",
		})
	} else if !validTimerTypes[strings.ToUpper(r.TimerType)] {
		errors = append(errors, ValidationError{
			Field:   "timer_type",
			Message: "Invalid timer type. Must be one of: WAIT_TIME, TEST_DRIVE, NEGOTIATION, PAPERWORK, MANAGER_WAIT",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes StartTimerRequest
func (r *StartTimerRequest) Sanitize() {
	r.TimerType = strings.TrimSpace(strings.ToUpper(r.TimerType))
}

// Validate validates CreateNoteRequest
func (r *CreateNoteRequest) Validate() *ValidationErrors {
	var errors []ValidationError

	// Content validation
	if r.Content == "" {
		errors = append(errors, ValidationError{
			Field:   "content",
			Message: "Content is required",
		})
	} else if len(r.Content) > 10000 {
		errors = append(errors, ValidationError{
			Field:   "content",
			Message: "Content must be 10000 characters or less",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes CreateNoteRequest
func (r *CreateNoteRequest) Sanitize() {
	r.Content = strings.TrimSpace(r.Content)
}

// Validate validates UpdateNoteRequest
func (r *UpdateNoteRequest) Validate() *ValidationErrors {
	var errors []ValidationError

	// Content validation (optional)
	if r.Content != nil && len(*r.Content) > 10000 {
		errors = append(errors, ValidationError{
			Field:   "content",
			Message: "Content must be 10000 characters or less",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes UpdateNoteRequest
func (r *UpdateNoteRequest) Sanitize() {
	if r.Content != nil {
		val := strings.TrimSpace(*r.Content)
		r.Content = &val
	}
}

// respondValidationErrorShowroom writes a validation error response
func respondValidationErrorShowroom(w http.ResponseWriter, errors *ValidationErrors) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadRequest)
	json.NewEncoder(w).Encode(ValidationErrorResponse{
		Error:   "Validation failed",
		Code:    "VALIDATION_ERROR",
		Details: errors.Errors,
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

// decodeAndValidateShowroom decodes JSON and validates the request
func decodeAndValidateShowroom(r *http.Request, w http.ResponseWriter, dst interface{}) bool {
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return false
	}

	// Sanitize if applicable
	if sanitizable, ok := dst.(Sanitizable); ok {
		sanitizable.Sanitize()
	}

	// Validate if applicable
	if validatable, ok := dst.(Validatable); ok {
		if errs := validatable.Validate(); errs != nil {
			respondValidationErrorShowroom(w, errs)
			return false
		}
	}

	return true
}

// validateUUIDShowroom validates a UUID path parameter
func validateUUIDShowroom(w http.ResponseWriter, id, fieldName string) bool {
	if !uuidRegex.MatchString(id) {
		respondValidationErrorShowroom(w, &ValidationErrors{
			Errors: []ValidationError{{
				Field:   fieldName,
				Message: "Must be a valid UUID",
			}},
		})
		return false
	}
	return true
}
