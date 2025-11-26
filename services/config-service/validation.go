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

// ValidationErrorResponseV2 is the standard error response format
type ValidationErrorResponseV2 struct {
	Error   string            `json:"error"`
	Code    string            `json:"code"`
	Details []ValidationError `json:"details,omitempty"`
}

var (
	uuidRegex = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

	validConfigTypes = map[string]bool{
		"string":  true,
		"integer": true,
		"boolean": true,
		"json":    true,
	}

	validCategories = map[string]bool{
		"dealership":    true,
		"sales":         true,
		"financing":     true,
		"notifications": true,
		"ui":            true,
	}

	validProviders = map[string]bool{
		"credit_bureau":  true,
		"inventory_feed": true,
		"accounting":     true,
		"crm":            true,
	}

	validIntegrationStatuses = map[string]bool{
		"active":   true,
		"inactive": true,
		"error":    true,
	}
)

// Validate validates SetSettingRequest
func (r *SetSettingRequest) Validate() *ValidationErrors {
	var errors []ValidationError

	// Value validation
	if r.Value == "" {
		errors = append(errors, ValidationError{
			Field:   "value",
			Message: "Value is required",
		})
	}

	// Type validation
	if r.Type == "" {
		errors = append(errors, ValidationError{
			Field:   "type",
			Message: "Type is required",
		})
	} else if !validConfigTypes[strings.ToLower(r.Type)] {
		errors = append(errors, ValidationError{
			Field:   "type",
			Message: "Invalid type. Must be one of: string, integer, boolean, json",
		})
	}

	// Category validation
	if r.Category == "" {
		errors = append(errors, ValidationError{
			Field:   "category",
			Message: "Category is required",
		})
	} else if !validCategories[strings.ToLower(r.Category)] {
		errors = append(errors, ValidationError{
			Field:   "category",
			Message: "Invalid category. Must be one of: dealership, sales, financing, notifications, ui",
		})
	}

	// Description length
	if len(r.Description) > 1000 {
		errors = append(errors, ValidationError{
			Field:   "description",
			Message: "Description must be 1000 characters or less",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes SetSettingRequest
func (r *SetSettingRequest) Sanitize() {
	r.Value = strings.TrimSpace(r.Value)
	r.Type = strings.TrimSpace(strings.ToLower(r.Type))
	r.Category = strings.TrimSpace(strings.ToLower(r.Category))
	r.Description = strings.TrimSpace(r.Description)
}

// Validate validates CreateFeatureFlagRequest
func (r *CreateFeatureFlagRequest) Validate() *ValidationErrors {
	var errors []ValidationError

	// Flag key validation
	if r.FlagKey == "" {
		errors = append(errors, ValidationError{
			Field:   "flag_key",
			Message: "Flag key is required",
		})
	} else if len(r.FlagKey) > 100 {
		errors = append(errors, ValidationError{
			Field:   "flag_key",
			Message: "Flag key must be 100 characters or less",
		})
	}

	// Rollout percentage validation
	if r.RolloutPercentage < 0 || r.RolloutPercentage > 100 {
		errors = append(errors, ValidationError{
			Field:   "rollout_percentage",
			Message: "Rollout percentage must be between 0 and 100",
		})
	}

	// Description length
	if len(r.Description) > 1000 {
		errors = append(errors, ValidationError{
			Field:   "description",
			Message: "Description must be 1000 characters or less",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes CreateFeatureFlagRequest
func (r *CreateFeatureFlagRequest) Sanitize() {
	r.FlagKey = strings.TrimSpace(r.FlagKey)
	r.Description = strings.TrimSpace(r.Description)
}

// Validate validates UpdateFeatureFlagRequest
func (r *UpdateFeatureFlagRequest) Validate() *ValidationErrors {
	var errors []ValidationError

	// Rollout percentage validation
	if r.RolloutPercentage < 0 || r.RolloutPercentage > 100 {
		errors = append(errors, ValidationError{
			Field:   "rollout_percentage",
			Message: "Rollout percentage must be between 0 and 100",
		})
	}

	// Description length
	if len(r.Description) > 1000 {
		errors = append(errors, ValidationError{
			Field:   "description",
			Message: "Description must be 1000 characters or less",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes UpdateFeatureFlagRequest
func (r *UpdateFeatureFlagRequest) Sanitize() {
	r.Description = strings.TrimSpace(r.Description)
}

// Validate validates EvaluateFeatureFlagRequest
func (r *EvaluateFeatureFlagRequest) Validate() *ValidationErrors {
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

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes EvaluateFeatureFlagRequest
func (r *EvaluateFeatureFlagRequest) Sanitize() {
	r.DealershipID = strings.TrimSpace(r.DealershipID)
}

// Validate validates CreateIntegrationRequest
func (r *CreateIntegrationRequest) Validate() *ValidationErrors {
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

	// Provider validation
	if r.Provider == "" {
		errors = append(errors, ValidationError{
			Field:   "provider",
			Message: "Provider is required",
		})
	} else if !validProviders[strings.ToLower(r.Provider)] {
		errors = append(errors, ValidationError{
			Field:   "provider",
			Message: "Invalid provider. Must be one of: credit_bureau, inventory_feed, accounting, crm",
		})
	}

	// Status validation
	if r.Status == "" {
		errors = append(errors, ValidationError{
			Field:   "status",
			Message: "Status is required",
		})
	} else if !validIntegrationStatuses[strings.ToLower(r.Status)] {
		errors = append(errors, ValidationError{
			Field:   "status",
			Message: "Invalid status. Must be one of: active, inactive, error",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes CreateIntegrationRequest
func (r *CreateIntegrationRequest) Sanitize() {
	r.DealershipID = strings.TrimSpace(r.DealershipID)
	r.Provider = strings.TrimSpace(strings.ToLower(r.Provider))
	r.Status = strings.TrimSpace(strings.ToLower(r.Status))
}

// Validate validates UpdateIntegrationRequest
func (r *UpdateIntegrationRequest) Validate() *ValidationErrors {
	var errors []ValidationError

	// Status validation
	if r.Status != "" && !validIntegrationStatuses[strings.ToLower(r.Status)] {
		errors = append(errors, ValidationError{
			Field:   "status",
			Message: "Invalid status. Must be one of: active, inactive, error",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes UpdateIntegrationRequest
func (r *UpdateIntegrationRequest) Sanitize() {
	r.Status = strings.TrimSpace(strings.ToLower(r.Status))
}

// respondValidationErrorV2 writes a validation error response
func respondValidationErrorV2(w http.ResponseWriter, errors *ValidationErrors) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadRequest)
	json.NewEncoder(w).Encode(ValidationErrorResponseV2{
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

// decodeAndValidateConfig decodes JSON and validates the request
func decodeAndValidateConfig(r *http.Request, w http.ResponseWriter, dst interface{}) bool {
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
			respondValidationErrorV2(w, errs)
			return false
		}
	}

	return true
}

// validateUUID validates a UUID path parameter
func validateUUID(w http.ResponseWriter, id, fieldName string) bool {
	if !uuidRegex.MatchString(id) {
		respondValidationErrorV2(w, &ValidationErrors{
			Errors: []ValidationError{{
				Field:   fieldName,
				Message: "Must be a valid UUID",
			}},
		})
		return false
	}
	return true
}
