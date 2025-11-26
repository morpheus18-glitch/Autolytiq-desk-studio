package validation

import (
	"regexp"
	"testing"
)

// UUIDRegex for testing UUID validation
var testUUIDRegex = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

// isValidUUID validates UUID format
func isValidUUID(s string) bool {
	return testUUIDRegex.MatchString(s)
}

func TestIsValidUUID(t *testing.T) {
	tests := []struct {
		name     string
		uuid     string
		expected bool
	}{
		{"Valid UUID v4", "550e8400-e29b-41d4-a716-446655440000", true},
		{"Valid UUID lowercase", "123e4567-e89b-12d3-a456-426614174000", true},
		{"Valid UUID uppercase", "123E4567-E89B-12D3-A456-426614174000", true},
		{"Valid UUID mixed case", "123e4567-E89B-12d3-A456-426614174000", true},
		{"Empty", "", false},
		{"Too short", "550e8400-e29b-41d4-a716-44665544000", false},
		{"Too long", "550e8400-e29b-41d4-a716-4466554400001", false},
		{"Missing dashes", "550e8400e29b41d4a716446655440000", false},
		{"Invalid character", "550e8400-e29b-41d4-a716-44665544000g", false},
		{"Wrong dash positions", "550e8400e29b-41d4-a716-446655440000", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isValidUUID(tt.uuid)
			if result != tt.expected {
				t.Errorf("isValidUUID(%q) = %v, want %v", tt.uuid, result, tt.expected)
			}
		})
	}
}

func TestValidateEmailExtended(t *testing.T) {
	// Test additional email edge cases beyond what's in validator_test.go
	tests := []struct {
		name     string
		email    string
		expected bool
	}{
		{"Valid long TLD", "user@example.technology", true},
		{"Valid special chars in local", "user.name+tag@example.com", true},
		{"Double dots", "user..name@example.com", false},
		{"Leading dot", ".user@example.com", false},
		{"Trailing dot in domain", "user@example.", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ValidateEmail(tt.email)
			if result != tt.expected {
				t.Errorf("ValidateEmail(%q) = %v, want %v", tt.email, result, tt.expected)
			}
		})
	}
}

func TestValidatePhoneExtended(t *testing.T) {
	// Test additional phone edge cases
	tests := []struct {
		name     string
		phone    string
		expected bool
	}{
		{"Valid spaces", "555 123 4567", true},
		{"Valid mixed separators", "555-123.4567", true},
		{"International with spaces", "+1 555 123 4567", true},
		{"Letters in phone", "555-ABC-4567", false},
		{"Extension", "555-123-4567 x123", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ValidatePhone(tt.phone)
			if result != tt.expected {
				t.Errorf("ValidatePhone(%q) = %v, want %v", tt.phone, result, tt.expected)
			}
		})
	}
}

func TestValidateSSNExtended(t *testing.T) {
	// Test additional SSN edge cases
	tests := []struct {
		name     string
		ssn      string
		expected bool
	}{
		{"Valid typical", "219-09-9999", true},
		{"Area 899 (valid)", "899-09-9999", true},
		{"Area 899 edge", "899-99-9999", true},
		{"Spaces instead of dashes", "123 45 6789", false},
		{"Partial dashes", "123-456789", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ValidateSSN(tt.ssn)
			if result != tt.expected {
				t.Errorf("ValidateSSN(%q) = %v, want %v", tt.ssn, result, tt.expected)
			}
		})
	}
}

func TestValidateStateCodeExtended(t *testing.T) {
	// Test all US states
	allStates := []string{
		"AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
		"HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
		"MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
		"NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
		"SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
		"DC", "PR", "VI", "GU", "AS", "MP",
	}

	for _, state := range allStates {
		t.Run(state, func(t *testing.T) {
			if !ValidateStateCode(state) {
				t.Errorf("ValidateStateCode(%q) = false, want true", state)
			}
		})
	}
}

func TestValidateZipCodeExtended(t *testing.T) {
	// Test additional ZIP code cases
	tests := []struct {
		name     string
		zip      string
		expected bool
	}{
		{"Leading zeros", "00123", true},
		{"Max valid 5", "99999", true},
		{"Max valid 9", "99999-9999", true},
		{"Extended with spaces", "12345 6789", false},
		{"Letters", "1234A", false},
		{"Partial extended", "12345-67", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ValidateZipCode(tt.zip)
			if result != tt.expected {
				t.Errorf("ValidateZipCode(%q) = %v, want %v", tt.zip, result, tt.expected)
			}
		})
	}
}

func TestValidateCurrencyExtended(t *testing.T) {
	// Test additional currency cases
	tests := []struct {
		name     string
		amount   float64
		expected bool
	}{
		{"Large amount", 1000000.00, true},
		{"Very small", 0.01, true},
		{"Three decimals", 99.999, false},
		{"Negative small", -0.01, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ValidateCurrency(tt.amount)
			if result != tt.expected {
				t.Errorf("ValidateCurrency(%v) = %v, want %v", tt.amount, result, tt.expected)
			}
		})
	}
}

func TestValidatePasswordStrengthExtended(t *testing.T) {
	// Test additional password edge cases
	tests := []struct {
		name     string
		password string
		expected bool
	}{
		{"Minimum valid", "Abcdefg1", true},
		{"With special chars", "Password1!", true},
		{"Long password", "VeryLongPassword123WithManyCharacters", true},
		{"Valid standard password", "Pssword1", true}, // Has upper P, lower ssword, number 1
		{"Just numbers", "12345678", false},
		{"Just lowercase", "abcdefgh", false},
		{"Just uppercase", "ABCDEFGH", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ValidatePasswordStrength(tt.password)
			if result != tt.expected {
				t.Errorf("ValidatePasswordStrength(%q) = %v, want %v", tt.password, result, tt.expected)
			}
		})
	}
}

func TestValidatorIntegration(t *testing.T) {
	v := New()

	type TestAddress struct {
		Street  string `validate:"required,min=1,max=100"`
		City    string `validate:"required,min=1,max=50"`
		State   string `validate:"required,state_code"`
		ZipCode string `validate:"required,zipcode"`
	}

	type TestPerson struct {
		Name    string      `validate:"required,min=1,max=100"`
		Email   string      `validate:"required,email"`
		Phone   string      `validate:"phone"`
		SSN     string      `validate:"ssn"`
		Address TestAddress `validate:"required"`
	}

	t.Run("Valid person", func(t *testing.T) {
		person := TestPerson{
			Name:  "John Doe",
			Email: "john@example.com",
			Phone: "555-123-4567",
			SSN:   "123-45-6789",
			Address: TestAddress{
				Street:  "123 Main St",
				City:    "Anytown",
				State:   "CA",
				ZipCode: "90210",
			},
		}

		errors := v.Validate(person)
		if errors != nil {
			t.Errorf("Expected no errors but got: %v", errors)
		}
	})

	t.Run("Invalid person - multiple errors", func(t *testing.T) {
		person := TestPerson{
			Name:  "", // required
			Email: "invalid-email",
			Phone: "123", // invalid
			SSN:   "000-00-0000", // invalid SSN
			Address: TestAddress{
				Street:  "",
				City:    "",
				State:   "XX", // invalid
				ZipCode: "123", // invalid
			},
		}

		errors := v.Validate(person)
		if errors == nil {
			t.Error("Expected validation errors but got nil")
		}
		if len(errors.Errors) < 5 {
			t.Errorf("Expected at least 5 errors but got %d", len(errors.Errors))
		}
	})
}

func TestSanitizerFunctions(t *testing.T) {
	s := NewSanitizer()

	t.Run("TrimWhitespace", func(t *testing.T) {
		tests := []struct {
			input    string
			expected string
		}{
			{"  hello  ", "hello"},
			{"\t\nhello\n\t", "hello"},
			{"hello", "hello"},
			{"", ""},
		}
		for _, tt := range tests {
			result := s.TrimWhitespace(tt.input)
			if result != tt.expected {
				t.Errorf("TrimWhitespace(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		}
	})

	t.Run("NormalizeWhitespace", func(t *testing.T) {
		tests := []struct {
			input    string
			expected string
		}{
			{"hello   world", "hello world"},
			{"  hello   world  ", "hello world"},
			{"hello\t\nworld", "hello world"},
		}
		for _, tt := range tests {
			result := s.NormalizeWhitespace(tt.input)
			if result != tt.expected {
				t.Errorf("NormalizeWhitespace(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		}
	})

	t.Run("TruncateString", func(t *testing.T) {
		tests := []struct {
			input    string
			maxLen   int
			expected string
		}{
			{"hello world", 5, "hello"},
			{"hello", 10, "hello"},
			{"", 5, ""},
		}
		for _, tt := range tests {
			result := s.TruncateString(tt.input, tt.maxLen)
			if result != tt.expected {
				t.Errorf("TruncateString(%q, %d) = %q, want %q", tt.input, tt.maxLen, result, tt.expected)
			}
		}
	})
}
