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

// CreateCustomerRequest represents a request to create a customer
type CreateCustomerRequest struct {
	DealershipID         string  `json:"dealership_id"`
	FirstName            string  `json:"first_name"`
	LastName             string  `json:"last_name"`
	Email                string  `json:"email"`
	Phone                string  `json:"phone"`
	Address              string  `json:"address"`
	City                 string  `json:"city"`
	State                string  `json:"state"`
	ZipCode              string  `json:"zip_code"`
	SSNLast4             string  `json:"ssn_last4,omitempty"`
	DriversLicenseNumber string  `json:"drivers_license_number,omitempty"`
	CreditScore          int     `json:"credit_score,omitempty"`
	MonthlyIncome        float64 `json:"monthly_income,omitempty"`
}

// UpdateCustomerRequest represents a request to update a customer
type UpdateCustomerRequest struct {
	FirstName            string  `json:"first_name,omitempty"`
	LastName             string  `json:"last_name,omitempty"`
	Email                string  `json:"email,omitempty"`
	Phone                string  `json:"phone,omitempty"`
	Address              string  `json:"address,omitempty"`
	City                 string  `json:"city,omitempty"`
	State                string  `json:"state,omitempty"`
	ZipCode              string  `json:"zip_code,omitempty"`
	SSNLast4             string  `json:"ssn_last4,omitempty"`
	DriversLicenseNumber string  `json:"drivers_license_number,omitempty"`
	CreditScore          int     `json:"credit_score,omitempty"`
	MonthlyIncome        float64 `json:"monthly_income,omitempty"`
}

var (
	uuidRegex         = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)
	emailRegex        = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	phoneRegex        = regexp.MustCompile(`^(\+1)?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$`)
	zipCode5Regex     = regexp.MustCompile(`^[0-9]{5}$`)
	zipCode9Regex     = regexp.MustCompile(`^[0-9]{5}-[0-9]{4}$`)
	ssnLast4Regex     = regexp.MustCompile(`^[0-9]{4}$`)
	driversLicenseRegex = regexp.MustCompile(`^[A-Za-z0-9-]{4,20}$`)

	validStateCodes = map[string]bool{
		"AL": true, "AK": true, "AZ": true, "AR": true, "CA": true,
		"CO": true, "CT": true, "DE": true, "FL": true, "GA": true,
		"HI": true, "ID": true, "IL": true, "IN": true, "IA": true,
		"KS": true, "KY": true, "LA": true, "ME": true, "MD": true,
		"MA": true, "MI": true, "MN": true, "MS": true, "MO": true,
		"MT": true, "NE": true, "NV": true, "NH": true, "NJ": true,
		"NM": true, "NY": true, "NC": true, "ND": true, "OH": true,
		"OK": true, "OR": true, "PA": true, "RI": true, "SC": true,
		"SD": true, "TN": true, "TX": true, "UT": true, "VT": true,
		"VA": true, "WA": true, "WV": true, "WI": true, "WY": true,
		"DC": true, "PR": true, "VI": true, "GU": true, "AS": true, "MP": true,
	}
)

// Validate validates CreateCustomerRequest
func (r *CreateCustomerRequest) Validate() *ValidationErrors {
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

	// First name validation
	if r.FirstName == "" {
		errors = append(errors, ValidationError{
			Field:   "first_name",
			Message: "First name is required",
		})
	} else if len(r.FirstName) > 100 {
		errors = append(errors, ValidationError{
			Field:   "first_name",
			Message: "First name must be 100 characters or less",
		})
	}

	// Last name validation
	if r.LastName == "" {
		errors = append(errors, ValidationError{
			Field:   "last_name",
			Message: "Last name is required",
		})
	} else if len(r.LastName) > 100 {
		errors = append(errors, ValidationError{
			Field:   "last_name",
			Message: "Last name must be 100 characters or less",
		})
	}

	// Email validation
	if r.Email != "" && !emailRegex.MatchString(r.Email) {
		errors = append(errors, ValidationError{
			Field:   "email",
			Message: "Must be a valid email address",
		})
	}

	// Phone validation
	if r.Phone != "" && !phoneRegex.MatchString(r.Phone) {
		errors = append(errors, ValidationError{
			Field:   "phone",
			Message: "Must be a valid phone number",
		})
	}

	// State validation
	if r.State != "" && !validStateCodes[strings.ToUpper(r.State)] {
		errors = append(errors, ValidationError{
			Field:   "state",
			Message: "Must be a valid US state code",
		})
	}

	// ZIP code validation
	if r.ZipCode != "" && !zipCode5Regex.MatchString(r.ZipCode) && !zipCode9Regex.MatchString(r.ZipCode) {
		errors = append(errors, ValidationError{
			Field:   "zip_code",
			Message: "Must be a valid ZIP code (5 or 9 digits)",
		})
	}

	// SSN Last 4 validation
	if r.SSNLast4 != "" && !ssnLast4Regex.MatchString(r.SSNLast4) {
		errors = append(errors, ValidationError{
			Field:   "ssn_last4",
			Message: "Must be exactly 4 digits",
		})
	}

	// Drivers license validation
	if r.DriversLicenseNumber != "" && !driversLicenseRegex.MatchString(r.DriversLicenseNumber) {
		errors = append(errors, ValidationError{
			Field:   "drivers_license_number",
			Message: "Must be a valid drivers license number (4-20 alphanumeric characters)",
		})
	}

	// Monthly income validation
	if r.MonthlyIncome < 0 {
		errors = append(errors, ValidationError{
			Field:   "monthly_income",
			Message: "Monthly income cannot be negative",
		})
	}

	// Credit score validation
	if r.CreditScore != 0 && (r.CreditScore < 300 || r.CreditScore > 850) {
		errors = append(errors, ValidationError{
			Field:   "credit_score",
			Message: "Credit score must be between 300 and 850",
		})
	}

	// Address length validation
	if len(r.Address) > 500 {
		errors = append(errors, ValidationError{
			Field:   "address",
			Message: "Address must be 500 characters or less",
		})
	}

	// City length validation
	if len(r.City) > 100 {
		errors = append(errors, ValidationError{
			Field:   "city",
			Message: "City must be 100 characters or less",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes CreateCustomerRequest
func (r *CreateCustomerRequest) Sanitize() {
	r.DealershipID = strings.TrimSpace(r.DealershipID)
	r.FirstName = strings.TrimSpace(r.FirstName)
	r.LastName = strings.TrimSpace(r.LastName)
	r.Email = strings.TrimSpace(strings.ToLower(r.Email))
	r.Phone = strings.TrimSpace(r.Phone)
	r.Address = strings.TrimSpace(r.Address)
	r.City = strings.TrimSpace(r.City)
	r.State = strings.TrimSpace(strings.ToUpper(r.State))
	r.ZipCode = strings.TrimSpace(r.ZipCode)
	r.SSNLast4 = strings.TrimSpace(r.SSNLast4)
	r.DriversLicenseNumber = strings.TrimSpace(strings.ToUpper(r.DriversLicenseNumber))
}

// Validate validates UpdateCustomerRequest
func (r *UpdateCustomerRequest) Validate() *ValidationErrors {
	var errors []ValidationError

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

	// Email validation
	if r.Email != "" && !emailRegex.MatchString(r.Email) {
		errors = append(errors, ValidationError{
			Field:   "email",
			Message: "Must be a valid email address",
		})
	}

	// Phone validation
	if r.Phone != "" && !phoneRegex.MatchString(r.Phone) {
		errors = append(errors, ValidationError{
			Field:   "phone",
			Message: "Must be a valid phone number",
		})
	}

	// State validation
	if r.State != "" && !validStateCodes[strings.ToUpper(r.State)] {
		errors = append(errors, ValidationError{
			Field:   "state",
			Message: "Must be a valid US state code",
		})
	}

	// ZIP code validation
	if r.ZipCode != "" && !zipCode5Regex.MatchString(r.ZipCode) && !zipCode9Regex.MatchString(r.ZipCode) {
		errors = append(errors, ValidationError{
			Field:   "zip_code",
			Message: "Must be a valid ZIP code (5 or 9 digits)",
		})
	}

	// SSN Last 4 validation
	if r.SSNLast4 != "" && !ssnLast4Regex.MatchString(r.SSNLast4) {
		errors = append(errors, ValidationError{
			Field:   "ssn_last4",
			Message: "Must be exactly 4 digits",
		})
	}

	// Drivers license validation
	if r.DriversLicenseNumber != "" && !driversLicenseRegex.MatchString(r.DriversLicenseNumber) {
		errors = append(errors, ValidationError{
			Field:   "drivers_license_number",
			Message: "Must be a valid drivers license number (4-20 alphanumeric characters)",
		})
	}

	// Monthly income validation
	if r.MonthlyIncome < 0 {
		errors = append(errors, ValidationError{
			Field:   "monthly_income",
			Message: "Monthly income cannot be negative",
		})
	}

	// Credit score validation
	if r.CreditScore != 0 && (r.CreditScore < 300 || r.CreditScore > 850) {
		errors = append(errors, ValidationError{
			Field:   "credit_score",
			Message: "Credit score must be between 300 and 850",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes UpdateCustomerRequest
func (r *UpdateCustomerRequest) Sanitize() {
	r.FirstName = strings.TrimSpace(r.FirstName)
	r.LastName = strings.TrimSpace(r.LastName)
	r.Email = strings.TrimSpace(strings.ToLower(r.Email))
	r.Phone = strings.TrimSpace(r.Phone)
	r.Address = strings.TrimSpace(r.Address)
	r.City = strings.TrimSpace(r.City)
	r.State = strings.TrimSpace(strings.ToUpper(r.State))
	r.ZipCode = strings.TrimSpace(r.ZipCode)
	r.SSNLast4 = strings.TrimSpace(r.SSNLast4)
	r.DriversLicenseNumber = strings.TrimSpace(strings.ToUpper(r.DriversLicenseNumber))
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
