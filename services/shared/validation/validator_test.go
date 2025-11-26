package validation

import (
	"testing"
)

func TestValidateVIN(t *testing.T) {
	tests := []struct {
		name     string
		vin      string
		expected bool
	}{
		{"Valid VIN", "1HGBH41JXMN109186", true},
		{"Valid VIN 2", "11111111111111111", true},
		{"Too short", "1HGBH41JXMN10918", false},
		{"Too long", "1HGBH41JXMN1091861", false},
		{"Contains I", "1HGBH41IXMN109186", false},
		{"Contains O", "1HGBH41OXMN109186", false},
		{"Contains Q", "1HGBH41QXMN109186", false},
		{"Invalid checksum", "1HGBH41JXMN109185", false},
		{"Empty", "", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ValidateVIN(tt.vin)
			if result != tt.expected {
				t.Errorf("ValidateVIN(%q) = %v, want %v", tt.vin, result, tt.expected)
			}
		})
	}
}

func TestValidatePhone(t *testing.T) {
	tests := []struct {
		name     string
		phone    string
		expected bool
	}{
		{"Valid US format", "(555) 123-4567", true},
		{"Valid dashes", "555-123-4567", true},
		{"Valid dots", "555.123.4567", true},
		{"Valid with country code", "+1-555-123-4567", true},
		{"Valid no formatting", "5551234567", true},
		{"Empty", "", true}, // Empty is allowed (use required tag)
		{"Too short", "555-123-456", false},
		{"Too long", "555-123-45678", false},
		{"Invalid characters", "555-ABC-4567", false},
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

func TestValidateEmail(t *testing.T) {
	tests := []struct {
		name     string
		email    string
		expected bool
	}{
		{"Valid email", "user@example.com", true},
		{"Valid with plus", "user+tag@example.com", true},
		{"Valid subdomain", "user@mail.example.com", true},
		{"Empty", "", false},
		{"No @", "userexample.com", false},
		{"No domain", "user@", false},
		{"No user", "@example.com", false},
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

func TestValidateSSN(t *testing.T) {
	tests := []struct {
		name     string
		ssn      string
		expected bool
	}{
		{"Valid SSN", "123-45-6789", true},
		{"Valid SSN 2", "078-05-1120", true},
		{"Empty", "", false},
		{"All zeros area", "000-45-6789", false},
		{"All zeros group", "123-00-6789", false},
		{"All zeros serial", "123-45-0000", false},
		{"Area 666", "666-45-6789", false},
		{"Area 900-999", "900-45-6789", false},
		{"No dashes", "123456789", false},
		{"Too short", "123-45-678", false},
		{"Too long", "123-45-67890", false},
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

func TestValidateStateCode(t *testing.T) {
	tests := []struct {
		name     string
		state    string
		expected bool
	}{
		{"Valid CA", "CA", true},
		{"Valid NY", "NY", true},
		{"Valid lowercase", "tx", true}, // Will be uppercased
		{"Valid DC", "DC", true},
		{"Valid PR", "PR", true},
		{"Empty", "", false},
		{"Invalid XX", "XX", false},
		{"Too long", "CAL", false},
		{"Too short", "C", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ValidateStateCode(tt.state)
			if result != tt.expected {
				t.Errorf("ValidateStateCode(%q) = %v, want %v", tt.state, result, tt.expected)
			}
		})
	}
}

func TestValidateZipCode(t *testing.T) {
	tests := []struct {
		name     string
		zip      string
		expected bool
	}{
		{"Valid 5 digit", "12345", true},
		{"Valid 9 digit", "12345-6789", true},
		{"Empty", "", false},
		{"Too short", "1234", false},
		{"Too long 5", "123456", false},
		{"Invalid format 9", "123456789", false}, // Missing dash
		{"Contains letters", "1234A", false},
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

func TestValidateCurrency(t *testing.T) {
	tests := []struct {
		name     string
		amount   float64
		expected bool
	}{
		{"Valid integer", 100.00, true},
		{"Valid cents", 99.99, true},
		{"Valid zero", 0.00, true},
		{"Negative", -10.00, false},
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

func TestValidatePasswordStrength(t *testing.T) {
	tests := []struct {
		name     string
		password string
		expected bool
	}{
		{"Valid strong", "Password1", true},
		{"Valid complex", "MyP@ssw0rd!", true},
		{"Too short", "Pass1", false},
		{"No uppercase", "password1", false},
		{"No lowercase", "PASSWORD1", false},
		{"No number", "Password", false},
		{"Empty", "", false},
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

func TestValidator_Validate(t *testing.T) {
	v := New()

	type TestStruct struct {
		Email    string  `validate:"required,email"`
		Phone    string  `validate:"phone"`
		State    string  `validate:"state_code"`
		ZipCode  string  `validate:"zipcode"`
		Amount   float64 `validate:"gte=0"`
		Password string  `validate:"min=8"`
	}

	tests := []struct {
		name        string
		input       TestStruct
		expectError bool
		errorCount  int
	}{
		{
			name: "All valid",
			input: TestStruct{
				Email:    "user@example.com",
				Phone:    "555-123-4567",
				State:    "CA",
				ZipCode:  "90210",
				Amount:   100.50,
				Password: "longpassword",
			},
			expectError: false,
		},
		{
			name: "Missing required email",
			input: TestStruct{
				Phone:    "555-123-4567",
				State:    "CA",
				ZipCode:  "90210",
				Amount:   100.50,
				Password: "longpassword",
			},
			expectError: true,
			errorCount:  1,
		},
		{
			name: "Multiple errors",
			input: TestStruct{
				Email:    "invalid",
				Phone:    "123",
				State:    "XX",
				ZipCode:  "123",
				Amount:   -10,
				Password: "short",
			},
			expectError: true,
			errorCount:  6,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := v.Validate(tt.input)

			if tt.expectError {
				if result == nil {
					t.Error("Expected validation errors but got nil")
					return
				}
				if len(result.Errors) != tt.errorCount {
					t.Errorf("Expected %d errors, got %d", tt.errorCount, len(result.Errors))
				}
			} else {
				if result != nil {
					t.Errorf("Expected no errors but got: %v", result.Errors)
				}
			}
		})
	}
}

func TestSanitizer(t *testing.T) {
	s := NewSanitizer()

	t.Run("NormalizeEmail", func(t *testing.T) {
		result := s.NormalizeEmail("  User@Example.COM  ")
		expected := "user@example.com"
		if result != expected {
			t.Errorf("NormalizeEmail() = %q, want %q", result, expected)
		}
	})

	t.Run("NormalizePhone", func(t *testing.T) {
		result := s.NormalizePhone("(555) 123-4567")
		expected := "5551234567"
		if result != expected {
			t.Errorf("NormalizePhone() = %q, want %q", result, expected)
		}
	})

	t.Run("NormalizeVIN", func(t *testing.T) {
		result := s.NormalizeVIN("  1hgbh41jxmn109186  ")
		expected := "1HGBH41JXMN109186"
		if result != expected {
			t.Errorf("NormalizeVIN() = %q, want %q", result, expected)
		}
	})

	t.Run("NormalizeSSN", func(t *testing.T) {
		result := s.NormalizeSSN("123456789")
		expected := "123-45-6789"
		if result != expected {
			t.Errorf("NormalizeSSN() = %q, want %q", result, expected)
		}
	})

	t.Run("NormalizeZipCode 5 digit", func(t *testing.T) {
		result := s.NormalizeZipCode("90210")
		expected := "90210"
		if result != expected {
			t.Errorf("NormalizeZipCode() = %q, want %q", result, expected)
		}
	})

	t.Run("NormalizeZipCode 9 digit", func(t *testing.T) {
		result := s.NormalizeZipCode("902101234")
		expected := "90210-1234"
		if result != expected {
			t.Errorf("NormalizeZipCode() = %q, want %q", result, expected)
		}
	})

	t.Run("NormalizeStateCode", func(t *testing.T) {
		result := s.NormalizeStateCode("  ca  ")
		expected := "CA"
		if result != expected {
			t.Errorf("NormalizeStateCode() = %q, want %q", result, expected)
		}
	})

	t.Run("SanitizeHTML", func(t *testing.T) {
		result := s.SanitizeHTML("<script>alert('xss')</script>")
		expected := "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;"
		if result != expected {
			t.Errorf("SanitizeHTML() = %q, want %q", result, expected)
		}
	})

	t.Run("StripHTML", func(t *testing.T) {
		result := s.StripHTML("<p>Hello <b>World</b></p>")
		expected := "Hello World"
		if result != expected {
			t.Errorf("StripHTML() = %q, want %q", result, expected)
		}
	})
}
