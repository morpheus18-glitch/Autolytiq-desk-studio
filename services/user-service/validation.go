package main

import (
	"encoding/json"
	"net/http"
	"regexp"
	"strings"
	"unicode"
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
	phoneRegex = regexp.MustCompile(`^(\+1)?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$`)

	validRoles = map[string]bool{
		"admin":          true,
		"manager":        true,
		"salesperson":    true,
		"finance":        true,
		"service":        true,
		"parts":          true,
		"receptionist":   true,
		"owner":          true,
		"general_manager": true,
		"sales_manager":  true,
		"f_and_i":        true,
	}

	validStatuses = map[string]bool{
		"active":    true,
		"inactive":  true,
		"suspended": true,
	}
)

// Validate validates CreateUserRequest
func (r *CreateUserRequest) Validate() *ValidationErrors {
	var errors []ValidationError

	// Dealership ID validation
	if r.DealershipID.String() == "00000000-0000-0000-0000-000000000000" {
		errors = append(errors, ValidationError{
			Field:   "dealership_id",
			Message: "Dealership ID is required",
		})
	}

	// Email validation
	if r.Email == "" {
		errors = append(errors, ValidationError{
			Field:   "email",
			Message: "Email is required",
		})
	} else if !emailRegex.MatchString(r.Email) {
		errors = append(errors, ValidationError{
			Field:   "email",
			Message: "Must be a valid email address",
		})
	}

	// Password validation
	if r.Password == "" {
		errors = append(errors, ValidationError{
			Field:   "password",
			Message: "Password is required",
		})
	} else if len(r.Password) < 8 {
		errors = append(errors, ValidationError{
			Field:   "password",
			Message: "Password must be at least 8 characters",
		})
	} else if !isStrongPassword(r.Password) {
		errors = append(errors, ValidationError{
			Field:   "password",
			Message: "Password must contain at least one uppercase letter, one lowercase letter, and one number",
		})
	}

	// Name validation
	if r.Name == "" {
		errors = append(errors, ValidationError{
			Field:   "name",
			Message: "Name is required",
		})
	} else if len(r.Name) > 200 {
		errors = append(errors, ValidationError{
			Field:   "name",
			Message: "Name must be 200 characters or less",
		})
	}

	// Role validation
	if r.Role == "" {
		errors = append(errors, ValidationError{
			Field:   "role",
			Message: "Role is required",
		})
	} else if !validRoles[strings.ToLower(r.Role)] {
		errors = append(errors, ValidationError{
			Field:   "role",
			Message: "Invalid role",
		})
	}

	// Phone validation (optional)
	if r.Phone != nil && *r.Phone != "" && !phoneRegex.MatchString(*r.Phone) {
		errors = append(errors, ValidationError{
			Field:   "phone",
			Message: "Must be a valid phone number",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes CreateUserRequest
func (r *CreateUserRequest) Sanitize() {
	r.Email = strings.TrimSpace(strings.ToLower(r.Email))
	r.Name = strings.TrimSpace(r.Name)
	r.Role = strings.TrimSpace(strings.ToLower(r.Role))
	if r.Phone != nil {
		phone := strings.TrimSpace(*r.Phone)
		r.Phone = &phone
	}
}

// Validate validates UpdateUserRequest
func (r *UpdateUserRequest) Validate() *ValidationErrors {
	var errors []ValidationError

	// Name validation (optional)
	if r.Name != nil && len(*r.Name) > 200 {
		errors = append(errors, ValidationError{
			Field:   "name",
			Message: "Name must be 200 characters or less",
		})
	}

	// Phone validation (optional)
	if r.Phone != nil && *r.Phone != "" && !phoneRegex.MatchString(*r.Phone) {
		errors = append(errors, ValidationError{
			Field:   "phone",
			Message: "Must be a valid phone number",
		})
	}

	// AvatarURL validation (optional)
	if r.AvatarURL != nil && len(*r.AvatarURL) > 2000 {
		errors = append(errors, ValidationError{
			Field:   "avatar_url",
			Message: "Avatar URL must be 2000 characters or less",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes UpdateUserRequest
func (r *UpdateUserRequest) Sanitize() {
	if r.Name != nil {
		name := strings.TrimSpace(*r.Name)
		r.Name = &name
	}
	if r.Phone != nil {
		phone := strings.TrimSpace(*r.Phone)
		r.Phone = &phone
	}
}

func isStrongPassword(password string) bool {
	if len(password) < 8 {
		return false
	}

	var hasUpper, hasLower, hasNumber bool
	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsNumber(char):
			hasNumber = true
		}
	}

	return hasUpper && hasLower && hasNumber
}

// respondValidationErrorUser writes a validation error response
func respondValidationErrorUser(w http.ResponseWriter, errors *ValidationErrors) {
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

// decodeAndValidateUser decodes JSON and validates the request
func decodeAndValidateUser(r *http.Request, w http.ResponseWriter, dst interface{}) bool {
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
			respondValidationErrorUser(w, errs)
			return false
		}
	}

	return true
}
