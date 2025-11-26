package validation

import (
	"fmt"
	"net/mail"
	"regexp"
	"strconv"
	"strings"
	"unicode"

	"github.com/go-playground/validator/v10"
)

// Validator is a shared validation instance with custom validators
type Validator struct {
	validate *validator.Validate
}

// ValidationError represents a single validation error
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
	Code    string `json:"code,omitempty"`
	Value   string `json:"value,omitempty"`
}

// Error implements the error interface for ValidationError
func (v ValidationError) Error() string {
	return fmt.Sprintf("%s: %s", v.Field, v.Message)
}

// ValidationErrors represents a collection of validation errors
type ValidationErrors struct {
	Errors []ValidationError `json:"errors"`
}

// Error implements the error interface
func (v ValidationErrors) Error() string {
	if len(v.Errors) == 0 {
		return "validation failed"
	}
	var messages []string
	for _, e := range v.Errors {
		messages = append(messages, fmt.Sprintf("%s: %s", e.Field, e.Message))
	}
	return strings.Join(messages, "; ")
}

// HasErrors returns true if there are validation errors
func (v ValidationErrors) HasErrors() bool {
	return len(v.Errors) > 0
}

// New creates a new Validator instance with all custom validators registered
func New() *Validator {
	v := validator.New()

	// Register custom validators
	v.RegisterValidation("vin", validateVIN)
	v.RegisterValidation("phone", validatePhone)
	v.RegisterValidation("ssn", validateSSN)
	v.RegisterValidation("state_code", validateStateCode)
	v.RegisterValidation("zipcode", validateZipCode)
	v.RegisterValidation("currency", validateCurrency)
	v.RegisterValidation("safe_string", validateSafeString)
	v.RegisterValidation("password_strength", validatePasswordStrength)

	return &Validator{validate: v}
}

// Validate validates a struct and returns ValidationErrors if invalid
func (v *Validator) Validate(s interface{}) *ValidationErrors {
	err := v.validate.Struct(s)
	if err == nil {
		return nil
	}

	validationErrors := &ValidationErrors{Errors: []ValidationError{}}

	for _, err := range err.(validator.ValidationErrors) {
		ve := ValidationError{
			Field:   toSnakeCase(err.Field()),
			Message: formatValidationMessage(err),
		}
		if err.Value() != nil {
			ve.Value = fmt.Sprintf("%v", err.Value())
		}
		validationErrors.Errors = append(validationErrors.Errors, ve)
	}

	return validationErrors
}

// ValidateField validates a single field value against a tag
func (v *Validator) ValidateField(value interface{}, tag string) error {
	return v.validate.Var(value, tag)
}

// formatValidationMessage creates a human-readable validation message
func formatValidationMessage(fe validator.FieldError) string {
	switch fe.Tag() {
	case "required":
		return "This field is required"
	case "email":
		return "Must be a valid email address"
	case "vin":
		return "Must be a valid 17-character VIN"
	case "phone":
		return "Must be a valid phone number"
	case "ssn":
		return "Must be a valid SSN (XXX-XX-XXXX)"
	case "state_code":
		return "Must be a valid 2-letter US state code"
	case "zipcode":
		return "Must be a valid ZIP code (5 or 9 digits)"
	case "currency":
		return "Must be a valid currency amount"
	case "min":
		return fmt.Sprintf("Must be at least %s characters", fe.Param())
	case "max":
		return fmt.Sprintf("Must be at most %s characters", fe.Param())
	case "gte":
		return fmt.Sprintf("Must be greater than or equal to %s", fe.Param())
	case "lte":
		return fmt.Sprintf("Must be less than or equal to %s", fe.Param())
	case "gt":
		return fmt.Sprintf("Must be greater than %s", fe.Param())
	case "lt":
		return fmt.Sprintf("Must be less than %s", fe.Param())
	case "oneof":
		return fmt.Sprintf("Must be one of: %s", fe.Param())
	case "uuid":
		return "Must be a valid UUID"
	case "url":
		return "Must be a valid URL"
	case "safe_string":
		return "Contains invalid characters"
	case "password_strength":
		return "Password must be at least 8 characters with uppercase, lowercase, and number"
	case "len":
		return fmt.Sprintf("Must be exactly %s characters", fe.Param())
	case "alphanum":
		return "Must contain only alphanumeric characters"
	default:
		return fmt.Sprintf("Failed validation for '%s'", fe.Tag())
	}
}

// toSnakeCase converts a string from CamelCase to snake_case
func toSnakeCase(s string) string {
	var result strings.Builder
	for i, r := range s {
		if i > 0 && unicode.IsUpper(r) {
			result.WriteRune('_')
		}
		result.WriteRune(unicode.ToLower(r))
	}
	return result.String()
}

// =============================================================================
// Custom Validators
// =============================================================================

// VIN checksum weights
var vinWeights = []int{8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2}

// VIN character transliteration map
var vinTransliteration = map[rune]int{
	'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8,
	'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'P': 7, 'R': 9,
	'S': 2, 'T': 3, 'U': 4, 'V': 5, 'W': 6, 'X': 7, 'Y': 8, 'Z': 9,
	'0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
}

// validateVIN validates a Vehicle Identification Number
func validateVIN(fl validator.FieldLevel) bool {
	vin := strings.ToUpper(fl.Field().String())

	// VIN must be exactly 17 characters
	if len(vin) != 17 {
		return false
	}

	// Check for invalid characters (I, O, Q are not allowed)
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

// ValidateVIN is a standalone VIN validation function
func ValidateVIN(vin string) bool {
	vin = strings.ToUpper(vin)
	if len(vin) != 17 {
		return false
	}
	if strings.ContainsAny(vin, "IOQ") {
		return false
	}

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

// Phone number regex patterns
var (
	phoneRegex = regexp.MustCompile(`^(\+1)?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$`)
)

// validatePhone validates a US phone number
func validatePhone(fl validator.FieldLevel) bool {
	phone := fl.Field().String()
	if phone == "" {
		return true // Allow empty, use required tag if needed
	}
	return phoneRegex.MatchString(phone)
}

// ValidatePhone is a standalone phone validation function
func ValidatePhone(phone string) bool {
	if phone == "" {
		return true
	}
	return phoneRegex.MatchString(phone)
}

// ValidateEmail validates an email address using Go's mail parser
func ValidateEmail(email string) bool {
	if email == "" {
		return false
	}
	_, err := mail.ParseAddress(email)
	return err == nil
}

// SSN regex pattern
var ssnRegex = regexp.MustCompile(`^([0-9]{3})-([0-9]{2})-([0-9]{4})$`)

// validateSSN validates a Social Security Number
func validateSSN(fl validator.FieldLevel) bool {
	ssn := fl.Field().String()
	if ssn == "" {
		return true // Allow empty, use required tag if needed
	}
	if !ssnRegex.MatchString(ssn) {
		return false
	}

	// Additional validation: SSN cannot be all zeros in any group
	parts := ssnRegex.FindStringSubmatch(ssn)
	if parts[1] == "000" || parts[2] == "00" || parts[3] == "0000" {
		return false
	}
	// Area number cannot be 666 or 900-999
	area, _ := strconv.Atoi(parts[1])
	if area == 666 || (area >= 900 && area <= 999) {
		return false
	}

	return true
}

// ValidateSSN is a standalone SSN validation function
func ValidateSSN(ssn string) bool {
	if ssn == "" {
		return false
	}
	if !ssnRegex.MatchString(ssn) {
		return false
	}
	parts := ssnRegex.FindStringSubmatch(ssn)
	if parts[1] == "000" || parts[2] == "00" || parts[3] == "0000" {
		return false
	}
	area, _ := strconv.Atoi(parts[1])
	if area == 666 || (area >= 900 && area <= 999) {
		return false
	}
	return true
}

// Valid US state codes
var validStateCodes = map[string]bool{
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

// validateStateCode validates a US state code
func validateStateCode(fl validator.FieldLevel) bool {
	state := strings.ToUpper(fl.Field().String())
	if state == "" {
		return true // Allow empty, use required tag if needed
	}
	return validStateCodes[state]
}

// ValidateStateCode is a standalone state code validation function
func ValidateStateCode(state string) bool {
	if state == "" {
		return false
	}
	return validStateCodes[strings.ToUpper(state)]
}

// ZIP code regex patterns
var (
	zipCode5Regex = regexp.MustCompile(`^[0-9]{5}$`)
	zipCode9Regex = regexp.MustCompile(`^[0-9]{5}-[0-9]{4}$`)
)

// validateZipCode validates a US ZIP code (5 or 9 digits)
func validateZipCode(fl validator.FieldLevel) bool {
	zip := fl.Field().String()
	if zip == "" {
		return true // Allow empty, use required tag if needed
	}
	return zipCode5Regex.MatchString(zip) || zipCode9Regex.MatchString(zip)
}

// ValidateZipCode is a standalone ZIP code validation function
func ValidateZipCode(zip string) bool {
	if zip == "" {
		return false
	}
	return zipCode5Regex.MatchString(zip) || zipCode9Regex.MatchString(zip)
}

// Currency regex pattern (positive amount with up to 2 decimal places)
var currencyRegex = regexp.MustCompile(`^[0-9]+(\.[0-9]{1,2})?$`)

// validateCurrency validates a currency amount
func validateCurrency(fl validator.FieldLevel) bool {
	switch fl.Field().Kind().String() {
	case "float64", "float32":
		value := fl.Field().Float()
		if value < 0 {
			return false
		}
		// Check decimal places (max 2)
		str := fmt.Sprintf("%.2f", value)
		return currencyRegex.MatchString(str)
	case "string":
		str := fl.Field().String()
		if str == "" {
			return true
		}
		return currencyRegex.MatchString(str)
	default:
		return true
	}
}

// ValidateCurrency is a standalone currency validation function
func ValidateCurrency(amount float64) bool {
	if amount < 0 {
		return false
	}
	// Round to 2 decimal places for comparison
	rounded := float64(int(amount*100)) / 100
	return amount == rounded
}

// validateSafeString validates that a string doesn't contain dangerous characters
func validateSafeString(fl validator.FieldLevel) bool {
	str := fl.Field().String()
	// Disallow common injection characters
	dangerous := []string{"<", ">", "script", "javascript:", "onclick", "onerror"}
	lowerStr := strings.ToLower(str)
	for _, d := range dangerous {
		if strings.Contains(lowerStr, d) {
			return false
		}
	}
	return true
}

// validatePasswordStrength validates password strength
func validatePasswordStrength(fl validator.FieldLevel) bool {
	password := fl.Field().String()
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

// ValidatePasswordStrength is a standalone password strength validation function
func ValidatePasswordStrength(password string) bool {
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
