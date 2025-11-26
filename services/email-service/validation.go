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
	uuidRegex  = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)
	emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
)

// Validate validates SendEmailRequest
func (r *SendEmailRequest) Validate() *ValidationErrors {
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

	// To email validation
	if r.To == "" {
		errors = append(errors, ValidationError{
			Field:   "to",
			Message: "Recipient email is required",
		})
	} else if !emailRegex.MatchString(r.To) {
		errors = append(errors, ValidationError{
			Field:   "to",
			Message: "Must be a valid email address",
		})
	}

	// Subject validation
	if r.Subject == "" {
		errors = append(errors, ValidationError{
			Field:   "subject",
			Message: "Subject is required",
		})
	} else if len(r.Subject) > 500 {
		errors = append(errors, ValidationError{
			Field:   "subject",
			Message: "Subject must be 500 characters or less",
		})
	}

	// Body validation
	if r.BodyHTML == "" {
		errors = append(errors, ValidationError{
			Field:   "body_html",
			Message: "Body is required",
		})
	} else if len(r.BodyHTML) > 100000 {
		errors = append(errors, ValidationError{
			Field:   "body_html",
			Message: "Body must be 100000 characters or less",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes SendEmailRequest
func (r *SendEmailRequest) Sanitize() {
	r.DealershipID = strings.TrimSpace(r.DealershipID)
	r.To = strings.TrimSpace(strings.ToLower(r.To))
	r.Subject = strings.TrimSpace(r.Subject)
}

// Validate validates SendTemplateEmailRequest
func (r *SendTemplateEmailRequest) Validate() *ValidationErrors {
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

	// To email validation
	if r.To == "" {
		errors = append(errors, ValidationError{
			Field:   "to",
			Message: "Recipient email is required",
		})
	} else if !emailRegex.MatchString(r.To) {
		errors = append(errors, ValidationError{
			Field:   "to",
			Message: "Must be a valid email address",
		})
	}

	// Template ID validation
	if r.TemplateID == "" {
		errors = append(errors, ValidationError{
			Field:   "template_id",
			Message: "Template ID is required",
		})
	} else if !uuidRegex.MatchString(r.TemplateID) {
		errors = append(errors, ValidationError{
			Field:   "template_id",
			Message: "Must be a valid UUID",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes SendTemplateEmailRequest
func (r *SendTemplateEmailRequest) Sanitize() {
	r.DealershipID = strings.TrimSpace(r.DealershipID)
	r.To = strings.TrimSpace(strings.ToLower(r.To))
	r.TemplateID = strings.TrimSpace(r.TemplateID)
}

// Validate validates CreateTemplateRequest
func (r *CreateTemplateRequest) Validate() *ValidationErrors {
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

	// Name validation
	if r.Name == "" {
		errors = append(errors, ValidationError{
			Field:   "name",
			Message: "Template name is required",
		})
	} else if len(r.Name) > 200 {
		errors = append(errors, ValidationError{
			Field:   "name",
			Message: "Name must be 200 characters or less",
		})
	}

	// Subject validation
	if r.Subject == "" {
		errors = append(errors, ValidationError{
			Field:   "subject",
			Message: "Subject is required",
		})
	} else if len(r.Subject) > 500 {
		errors = append(errors, ValidationError{
			Field:   "subject",
			Message: "Subject must be 500 characters or less",
		})
	}

	// Body validation
	if r.BodyHTML == "" {
		errors = append(errors, ValidationError{
			Field:   "body_html",
			Message: "Body is required",
		})
	} else if len(r.BodyHTML) > 100000 {
		errors = append(errors, ValidationError{
			Field:   "body_html",
			Message: "Body must be 100000 characters or less",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes CreateTemplateRequest
func (r *CreateTemplateRequest) Sanitize() {
	r.DealershipID = strings.TrimSpace(r.DealershipID)
	r.Name = strings.TrimSpace(r.Name)
	r.Subject = strings.TrimSpace(r.Subject)
}

// Validate validates UpdateTemplateRequest
func (r *UpdateTemplateRequest) Validate() *ValidationErrors {
	var errors []ValidationError

	// Name validation
	if r.Name == "" {
		errors = append(errors, ValidationError{
			Field:   "name",
			Message: "Template name is required",
		})
	} else if len(r.Name) > 200 {
		errors = append(errors, ValidationError{
			Field:   "name",
			Message: "Name must be 200 characters or less",
		})
	}

	// Subject validation
	if r.Subject == "" {
		errors = append(errors, ValidationError{
			Field:   "subject",
			Message: "Subject is required",
		})
	} else if len(r.Subject) > 500 {
		errors = append(errors, ValidationError{
			Field:   "subject",
			Message: "Subject must be 500 characters or less",
		})
	}

	// Body validation
	if r.BodyHTML == "" {
		errors = append(errors, ValidationError{
			Field:   "body_html",
			Message: "Body is required",
		})
	} else if len(r.BodyHTML) > 100000 {
		errors = append(errors, ValidationError{
			Field:   "body_html",
			Message: "Body must be 100000 characters or less",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes UpdateTemplateRequest
func (r *UpdateTemplateRequest) Sanitize() {
	r.Name = strings.TrimSpace(r.Name)
	r.Subject = strings.TrimSpace(r.Subject)
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
