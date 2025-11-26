package main

import (
	"encoding/json"
	"net/http"
	"regexp"
	"strings"
	"time"
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

// CreateVehicleRequest represents a request to create a vehicle
type CreateVehicleRequest struct {
	DealershipID string  `json:"dealership_id"`
	VIN          string  `json:"vin"`
	Make         string  `json:"make"`
	Model        string  `json:"model"`
	Year         int     `json:"year"`
	Condition    string  `json:"condition"`
	Status       string  `json:"status"`
	Price        float64 `json:"price"`
	Mileage      int     `json:"mileage"`
	Color        string  `json:"color"`
	Description  string  `json:"description"`
	StockNumber  string  `json:"stock_number"`
}

// UpdateVehicleRequest represents a request to update a vehicle
type UpdateVehicleRequest struct {
	VIN         string  `json:"vin,omitempty"`
	Make        string  `json:"make,omitempty"`
	Model       string  `json:"model,omitempty"`
	Year        int     `json:"year,omitempty"`
	Condition   string  `json:"condition,omitempty"`
	Status      string  `json:"status,omitempty"`
	Price       float64 `json:"price,omitempty"`
	Mileage     int     `json:"mileage,omitempty"`
	Color       string  `json:"color,omitempty"`
	Description string  `json:"description,omitempty"`
	StockNumber string  `json:"stock_number,omitempty"`
}

// ValidateVINRequest represents a VIN validation request
type ValidateVINRequest struct {
	VIN string `json:"vin"`
}

var (
	uuidRegex = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

	validConditions = map[string]bool{
		"new":     true,
		"used":    true,
		"cpo":     true, // Certified Pre-Owned
	}

	validStatuses = map[string]bool{
		"available": true,
		"pending":   true,
		"sold":      true,
		"reserved":  true,
		"transit":   true,
	}

	// VIN character transliteration map
	vinTransliteration = map[rune]int{
		'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8,
		'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'P': 7, 'R': 9,
		'S': 2, 'T': 3, 'U': 4, 'V': 5, 'W': 6, 'X': 7, 'Y': 8, 'Z': 9,
		'0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
	}

	// VIN checksum weights
	vinWeights = []int{8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2}
)

// validateVINChecksum validates the VIN checksum
func validateVINChecksum(vin string) bool {
	vin = strings.ToUpper(vin)
	if len(vin) != 17 {
		return false
	}

	// Check for invalid characters
	if strings.ContainsAny(vin, "IOQ") {
		return false
	}

	// Calculate checksum
	var sum int
	for i, char := range vin {
		value, ok := vinTransliteration[char]
		if !ok {
			return false
		}
		sum += value * vinWeights[i]
	}

	checkDigit := sum % 11
	var expectedCheck rune
	if checkDigit == 10 {
		expectedCheck = 'X'
	} else {
		expectedCheck = rune('0' + checkDigit)
	}

	return rune(vin[8]) == expectedCheck
}

// Validate validates CreateVehicleRequest
func (r *CreateVehicleRequest) Validate() *ValidationErrors {
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

	// VIN validation
	if r.VIN != "" {
		if len(r.VIN) != 17 {
			errors = append(errors, ValidationError{
				Field:   "vin",
				Message: "VIN must be exactly 17 characters",
			})
		} else if !validateVINChecksum(r.VIN) {
			errors = append(errors, ValidationError{
				Field:   "vin",
				Message: "Invalid VIN checksum",
			})
		}
	}

	// Make validation
	if r.Make == "" {
		errors = append(errors, ValidationError{
			Field:   "make",
			Message: "Make is required",
		})
	} else if len(r.Make) > 100 {
		errors = append(errors, ValidationError{
			Field:   "make",
			Message: "Make must be 100 characters or less",
		})
	}

	// Model validation
	if r.Model == "" {
		errors = append(errors, ValidationError{
			Field:   "model",
			Message: "Model is required",
		})
	} else if len(r.Model) > 100 {
		errors = append(errors, ValidationError{
			Field:   "model",
			Message: "Model must be 100 characters or less",
		})
	}

	// Year validation
	currentYear := time.Now().Year()
	if r.Year == 0 {
		errors = append(errors, ValidationError{
			Field:   "year",
			Message: "Year is required",
		})
	} else if r.Year < 1900 || r.Year > currentYear+2 {
		errors = append(errors, ValidationError{
			Field:   "year",
			Message: "Year must be between 1900 and " + string(rune('0'+currentYear+2)),
		})
	}

	// Condition validation
	if r.Condition != "" && !validConditions[strings.ToLower(r.Condition)] {
		errors = append(errors, ValidationError{
			Field:   "condition",
			Message: "Invalid condition. Must be one of: new, used, cpo",
		})
	}

	// Status validation
	if r.Status != "" && !validStatuses[strings.ToLower(r.Status)] {
		errors = append(errors, ValidationError{
			Field:   "status",
			Message: "Invalid status. Must be one of: available, pending, sold, reserved, transit",
		})
	}

	// Price validation
	if r.Price == 0 {
		errors = append(errors, ValidationError{
			Field:   "price",
			Message: "Price is required",
		})
	} else if r.Price < 0 {
		errors = append(errors, ValidationError{
			Field:   "price",
			Message: "Price cannot be negative",
		})
	}

	// Mileage validation
	if r.Mileage < 0 {
		errors = append(errors, ValidationError{
			Field:   "mileage",
			Message: "Mileage cannot be negative",
		})
	}

	// Description length validation
	if len(r.Description) > 5000 {
		errors = append(errors, ValidationError{
			Field:   "description",
			Message: "Description must be 5000 characters or less",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes CreateVehicleRequest
func (r *CreateVehicleRequest) Sanitize() {
	r.DealershipID = strings.TrimSpace(r.DealershipID)
	r.VIN = strings.TrimSpace(strings.ToUpper(r.VIN))
	r.Make = strings.TrimSpace(r.Make)
	r.Model = strings.TrimSpace(r.Model)
	r.Condition = strings.TrimSpace(strings.ToLower(r.Condition))
	r.Status = strings.TrimSpace(strings.ToLower(r.Status))
	r.Color = strings.TrimSpace(r.Color)
	r.Description = strings.TrimSpace(r.Description)
	r.StockNumber = strings.TrimSpace(r.StockNumber)
}

// Validate validates UpdateVehicleRequest
func (r *UpdateVehicleRequest) Validate() *ValidationErrors {
	var errors []ValidationError

	// VIN validation
	if r.VIN != "" {
		if len(r.VIN) != 17 {
			errors = append(errors, ValidationError{
				Field:   "vin",
				Message: "VIN must be exactly 17 characters",
			})
		} else if !validateVINChecksum(r.VIN) {
			errors = append(errors, ValidationError{
				Field:   "vin",
				Message: "Invalid VIN checksum",
			})
		}
	}

	// Make validation
	if r.Make != "" && len(r.Make) > 100 {
		errors = append(errors, ValidationError{
			Field:   "make",
			Message: "Make must be 100 characters or less",
		})
	}

	// Model validation
	if r.Model != "" && len(r.Model) > 100 {
		errors = append(errors, ValidationError{
			Field:   "model",
			Message: "Model must be 100 characters or less",
		})
	}

	// Year validation
	if r.Year != 0 {
		currentYear := time.Now().Year()
		if r.Year < 1900 || r.Year > currentYear+2 {
			errors = append(errors, ValidationError{
				Field:   "year",
				Message: "Year must be valid",
			})
		}
	}

	// Condition validation
	if r.Condition != "" && !validConditions[strings.ToLower(r.Condition)] {
		errors = append(errors, ValidationError{
			Field:   "condition",
			Message: "Invalid condition. Must be one of: new, used, cpo",
		})
	}

	// Status validation
	if r.Status != "" && !validStatuses[strings.ToLower(r.Status)] {
		errors = append(errors, ValidationError{
			Field:   "status",
			Message: "Invalid status. Must be one of: available, pending, sold, reserved, transit",
		})
	}

	// Price validation
	if r.Price < 0 {
		errors = append(errors, ValidationError{
			Field:   "price",
			Message: "Price cannot be negative",
		})
	}

	// Mileage validation
	if r.Mileage < 0 {
		errors = append(errors, ValidationError{
			Field:   "mileage",
			Message: "Mileage cannot be negative",
		})
	}

	// Description length validation
	if len(r.Description) > 5000 {
		errors = append(errors, ValidationError{
			Field:   "description",
			Message: "Description must be 5000 characters or less",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes UpdateVehicleRequest
func (r *UpdateVehicleRequest) Sanitize() {
	r.VIN = strings.TrimSpace(strings.ToUpper(r.VIN))
	r.Make = strings.TrimSpace(r.Make)
	r.Model = strings.TrimSpace(r.Model)
	r.Condition = strings.TrimSpace(strings.ToLower(r.Condition))
	r.Status = strings.TrimSpace(strings.ToLower(r.Status))
	r.Color = strings.TrimSpace(r.Color)
	r.Description = strings.TrimSpace(r.Description)
	r.StockNumber = strings.TrimSpace(r.StockNumber)
}

// Validate validates ValidateVINRequest
func (r *ValidateVINRequest) Validate() *ValidationErrors {
	var errors []ValidationError

	if r.VIN == "" {
		errors = append(errors, ValidationError{
			Field:   "vin",
			Message: "VIN is required",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes ValidateVINRequest
func (r *ValidateVINRequest) Sanitize() {
	r.VIN = strings.TrimSpace(strings.ToUpper(r.VIN))
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
