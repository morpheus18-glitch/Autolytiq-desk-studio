package validation

import (
	"regexp"
	"strings"
	"unicode"
)

// Sanitizer provides input sanitization functions
type Sanitizer struct{}

// NewSanitizer creates a new Sanitizer instance
func NewSanitizer() *Sanitizer {
	return &Sanitizer{}
}

// TrimWhitespace removes leading and trailing whitespace from a string
func (s *Sanitizer) TrimWhitespace(str string) string {
	return strings.TrimSpace(str)
}

// NormalizeWhitespace replaces multiple whitespace characters with a single space
func (s *Sanitizer) NormalizeWhitespace(str string) string {
	// Replace multiple spaces with single space
	space := regexp.MustCompile(`\s+`)
	return space.ReplaceAllString(strings.TrimSpace(str), " ")
}

// NormalizeEmail normalizes an email address (lowercase, trim)
func (s *Sanitizer) NormalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

// NormalizePhone normalizes a phone number (remove formatting, keep digits)
func (s *Sanitizer) NormalizePhone(phone string) string {
	if phone == "" {
		return ""
	}
	var normalized strings.Builder
	for _, r := range phone {
		if unicode.IsDigit(r) || r == '+' {
			normalized.WriteRune(r)
		}
	}
	result := normalized.String()
	// If starts with 1 (US country code without +), add +
	if len(result) == 11 && result[0] == '1' {
		result = "+" + result
	}
	return result
}

// NormalizeSSN normalizes an SSN to XXX-XX-XXXX format
func (s *Sanitizer) NormalizeSSN(ssn string) string {
	if ssn == "" {
		return ""
	}
	// Extract only digits
	var digits strings.Builder
	for _, r := range ssn {
		if unicode.IsDigit(r) {
			digits.WriteRune(r)
		}
	}
	d := digits.String()
	if len(d) != 9 {
		return ssn // Return original if not 9 digits
	}
	return d[:3] + "-" + d[3:5] + "-" + d[5:]
}

// NormalizeVIN normalizes a VIN (uppercase, remove spaces)
func (s *Sanitizer) NormalizeVIN(vin string) string {
	vin = strings.ToUpper(strings.TrimSpace(vin))
	// Remove any spaces or dashes
	vin = strings.ReplaceAll(vin, " ", "")
	vin = strings.ReplaceAll(vin, "-", "")
	return vin
}

// NormalizeZipCode normalizes a ZIP code
func (s *Sanitizer) NormalizeZipCode(zip string) string {
	if zip == "" {
		return ""
	}
	// Extract only digits
	var digits strings.Builder
	for _, r := range zip {
		if unicode.IsDigit(r) {
			digits.WriteRune(r)
		}
	}
	d := digits.String()
	if len(d) == 5 {
		return d
	}
	if len(d) == 9 {
		return d[:5] + "-" + d[5:]
	}
	return zip // Return original if not valid format
}

// NormalizeStateCode normalizes a state code (uppercase, trim)
func (s *Sanitizer) NormalizeStateCode(state string) string {
	return strings.ToUpper(strings.TrimSpace(state))
}

// SanitizeString removes potentially dangerous characters
func (s *Sanitizer) SanitizeString(str string) string {
	// Remove null bytes
	str = strings.ReplaceAll(str, "\x00", "")
	// Trim whitespace
	str = strings.TrimSpace(str)
	return str
}

// SanitizeHTML escapes HTML special characters
func (s *Sanitizer) SanitizeHTML(str string) string {
	replacer := strings.NewReplacer(
		"&", "&amp;",
		"<", "&lt;",
		">", "&gt;",
		"\"", "&quot;",
		"'", "&#39;",
	)
	return replacer.Replace(str)
}

// StripHTML removes all HTML tags from a string
func (s *Sanitizer) StripHTML(str string) string {
	re := regexp.MustCompile(`<[^>]*>`)
	return re.ReplaceAllString(str, "")
}

// TruncateString truncates a string to the specified length
func (s *Sanitizer) TruncateString(str string, maxLen int) string {
	if len(str) <= maxLen {
		return str
	}
	return str[:maxLen]
}

// SanitizeRequest provides a helper to sanitize common request fields
type RequestSanitizer struct {
	sanitizer *Sanitizer
}

// NewRequestSanitizer creates a new RequestSanitizer
func NewRequestSanitizer() *RequestSanitizer {
	return &RequestSanitizer{sanitizer: NewSanitizer()}
}

// SanitizeStringField sanitizes a string field (trim, normalize whitespace)
func (rs *RequestSanitizer) SanitizeStringField(field *string) {
	if field != nil && *field != "" {
		*field = rs.sanitizer.NormalizeWhitespace(*field)
	}
}

// SanitizeEmailField sanitizes an email field
func (rs *RequestSanitizer) SanitizeEmailField(field *string) {
	if field != nil && *field != "" {
		*field = rs.sanitizer.NormalizeEmail(*field)
	}
}

// SanitizePhoneField sanitizes a phone field
func (rs *RequestSanitizer) SanitizePhoneField(field *string) {
	if field != nil && *field != "" {
		*field = rs.sanitizer.NormalizePhone(*field)
	}
}

// SanitizeVINField sanitizes a VIN field
func (rs *RequestSanitizer) SanitizeVINField(field *string) {
	if field != nil && *field != "" {
		*field = rs.sanitizer.NormalizeVIN(*field)
	}
}

// SanitizeSSNField sanitizes an SSN field
func (rs *RequestSanitizer) SanitizeSSNField(field *string) {
	if field != nil && *field != "" {
		*field = rs.sanitizer.NormalizeSSN(*field)
	}
}

// SanitizeStateField sanitizes a state code field
func (rs *RequestSanitizer) SanitizeStateField(field *string) {
	if field != nil && *field != "" {
		*field = rs.sanitizer.NormalizeStateCode(*field)
	}
}

// SanitizeZipField sanitizes a ZIP code field
func (rs *RequestSanitizer) SanitizeZipField(field *string) {
	if field != nil && *field != "" {
		*field = rs.sanitizer.NormalizeZipCode(*field)
	}
}
