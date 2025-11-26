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

// Validatable is an interface for types that can validate themselves
type Validatable interface {
	Validate() *ValidationErrors
}

// Sanitizable is an interface for types that can sanitize themselves
type Sanitizable interface {
	Sanitize()
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

// =============================================================================
// Request Validation
// =============================================================================

// Validate validates RegisterRequest
func (r *RegisterRequest) Validate() *ValidationErrors {
	var errors []ValidationError

	// Email validation
	if r.Email == "" {
		errors = append(errors, ValidationError{
			Field:   "email",
			Message: "Email is required",
		})
	} else if !isValidEmail(r.Email) {
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

	// First name validation
	if r.FirstName != "" && len(r.FirstName) > 100 {
		errors = append(errors, ValidationError{
			Field:   "first_name",
			Message: "First name must be 100 characters or less",
		})
	}

	// Last name validation
	if r.LastName != "" && len(r.LastName) > 100 {
		errors = append(errors, ValidationError{
			Field:   "last_name",
			Message: "Last name must be 100 characters or less",
		})
	}

	// Dealership ID validation
	if r.DealershipID != "" && !isValidUUID(r.DealershipID) {
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

// Sanitize sanitizes RegisterRequest
func (r *RegisterRequest) Sanitize() {
	r.Email = strings.TrimSpace(strings.ToLower(r.Email))
	r.FirstName = strings.TrimSpace(r.FirstName)
	r.LastName = strings.TrimSpace(r.LastName)
	r.DealershipID = strings.TrimSpace(r.DealershipID)
}

// Validate validates LoginRequest
func (r *LoginRequest) Validate() *ValidationErrors {
	var errors []ValidationError

	if r.Email == "" {
		errors = append(errors, ValidationError{
			Field:   "email",
			Message: "Email is required",
		})
	} else if !isValidEmail(r.Email) {
		errors = append(errors, ValidationError{
			Field:   "email",
			Message: "Must be a valid email address",
		})
	}

	if r.Password == "" {
		errors = append(errors, ValidationError{
			Field:   "password",
			Message: "Password is required",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes LoginRequest
func (r *LoginRequest) Sanitize() {
	r.Email = strings.TrimSpace(strings.ToLower(r.Email))
}

// Validate validates RefreshRequest
func (r *RefreshRequest) Validate() *ValidationErrors {
	var errors []ValidationError

	if r.RefreshToken == "" {
		errors = append(errors, ValidationError{
			Field:   "refresh_token",
			Message: "Refresh token is required",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes RefreshRequest
func (r *RefreshRequest) Sanitize() {
	r.RefreshToken = strings.TrimSpace(r.RefreshToken)
}

// Validate validates ChangePasswordRequest
func (r *ChangePasswordRequest) Validate() *ValidationErrors {
	var errors []ValidationError

	if r.CurrentPassword == "" {
		errors = append(errors, ValidationError{
			Field:   "current_password",
			Message: "Current password is required",
		})
	}

	if r.NewPassword == "" {
		errors = append(errors, ValidationError{
			Field:   "new_password",
			Message: "New password is required",
		})
	} else if len(r.NewPassword) < 8 {
		errors = append(errors, ValidationError{
			Field:   "new_password",
			Message: "New password must be at least 8 characters",
		})
	} else if !isStrongPassword(r.NewPassword) {
		errors = append(errors, ValidationError{
			Field:   "new_password",
			Message: "Password must contain at least one uppercase letter, one lowercase letter, and one number",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Validate validates ForgotPasswordRequest
func (r *ForgotPasswordRequest) Validate() *ValidationErrors {
	var errors []ValidationError

	if r.Email == "" {
		errors = append(errors, ValidationError{
			Field:   "email",
			Message: "Email is required",
		})
	} else if !isValidEmail(r.Email) {
		errors = append(errors, ValidationError{
			Field:   "email",
			Message: "Must be a valid email address",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes ForgotPasswordRequest
func (r *ForgotPasswordRequest) Sanitize() {
	r.Email = strings.TrimSpace(strings.ToLower(r.Email))
}

// Validate validates ResetPasswordRequest
func (r *ResetPasswordRequest) Validate() *ValidationErrors {
	var errors []ValidationError

	if r.Token == "" {
		errors = append(errors, ValidationError{
			Field:   "token",
			Message: "Token is required",
		})
	}

	if r.NewPassword == "" {
		errors = append(errors, ValidationError{
			Field:   "new_password",
			Message: "New password is required",
		})
	} else if len(r.NewPassword) < 8 {
		errors = append(errors, ValidationError{
			Field:   "new_password",
			Message: "Password must be at least 8 characters",
		})
	} else if !isStrongPassword(r.NewPassword) {
		errors = append(errors, ValidationError{
			Field:   "new_password",
			Message: "Password must contain at least one uppercase letter, one lowercase letter, and one number",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes ResetPasswordRequest
func (r *ResetPasswordRequest) Sanitize() {
	r.Token = strings.TrimSpace(r.Token)
}

// Validate validates VerifyEmailRequest
func (r *VerifyEmailRequest) Validate() *ValidationErrors {
	var errors []ValidationError

	if r.Token == "" {
		errors = append(errors, ValidationError{
			Field:   "token",
			Message: "Token is required",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes VerifyEmailRequest
func (r *VerifyEmailRequest) Sanitize() {
	r.Token = strings.TrimSpace(r.Token)
}

// =============================================================================
// Validation Helpers
// =============================================================================

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
var uuidRegex = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

func isValidEmail(email string) bool {
	return emailRegex.MatchString(email)
}

func isValidUUID(id string) bool {
	return uuidRegex.MatchString(id)
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

// decodeAndValidate decodes JSON and validates the request
func decodeAndValidate(r *http.Request, w http.ResponseWriter, dst interface{}) bool {
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
			respondValidationError(w, errs)
			return false
		}
	}

	return true
}
