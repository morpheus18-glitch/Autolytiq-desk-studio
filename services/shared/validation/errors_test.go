package validation

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestValidationError(t *testing.T) {
	err := ValidationError{
		Field:   "email",
		Message: "Email is required",
		Code:    "REQUIRED",
	}

	expected := "email: Email is required"
	if err.Error() != expected {
		t.Errorf("ValidationError.Error() = %q, want %q", err.Error(), expected)
	}
}

func TestValidationErrors(t *testing.T) {
	t.Run("Empty errors", func(t *testing.T) {
		errors := NewValidationErrors()
		if errors.HasErrors() {
			t.Error("Empty ValidationErrors should not have errors")
		}
		if errors.Error() != "validation failed" {
			t.Errorf("Empty error message = %q, want %q", errors.Error(), "validation failed")
		}
	})

	t.Run("Add errors", func(t *testing.T) {
		errors := NewValidationErrors()
		errors.Add("email", "Email is required")
		errors.Add("name", "Name is required")

		if !errors.HasErrors() {
			t.Error("ValidationErrors should have errors")
		}
		if len(errors.Errors) != 2 {
			t.Errorf("Error count = %d, want %d", len(errors.Errors), 2)
		}
	})

	t.Run("AddWithCode", func(t *testing.T) {
		errors := NewValidationErrors()
		errors.AddWithCode("email", "Email is required", "REQUIRED")

		if len(errors.Errors) != 1 {
			t.Errorf("Error count = %d, want %d", len(errors.Errors), 1)
		}
		if errors.Errors[0].Code != "REQUIRED" {
			t.Errorf("Error code = %q, want %q", errors.Errors[0].Code, "REQUIRED")
		}
	})

	t.Run("Error message with multiple errors", func(t *testing.T) {
		errors := NewValidationErrors()
		errors.Add("email", "Email is required")
		errors.Add("name", "Name is required")

		expected := "email: Email is required; name: Name is required"
		if errors.Error() != expected {
			t.Errorf("Error message = %q, want %q", errors.Error(), expected)
		}
	})

	t.Run("GetFieldErrors", func(t *testing.T) {
		errors := NewValidationErrors()
		errors.Add("email", "Email is required")
		errors.Add("email", "Email format is invalid")
		errors.Add("name", "Name is required")

		emailErrors := errors.GetFieldErrors("email")
		if len(emailErrors) != 2 {
			t.Errorf("Email error count = %d, want %d", len(emailErrors), 2)
		}

		nameErrors := errors.GetFieldErrors("name")
		if len(nameErrors) != 1 {
			t.Errorf("Name error count = %d, want %d", len(nameErrors), 1)
		}

		unknownErrors := errors.GetFieldErrors("unknown")
		if len(unknownErrors) != 0 {
			t.Errorf("Unknown error count = %d, want %d", len(unknownErrors), 0)
		}
	})

	t.Run("Merge", func(t *testing.T) {
		errors1 := NewValidationErrors()
		errors1.Add("email", "Email is required")

		errors2 := NewValidationErrors()
		errors2.Add("name", "Name is required")
		errors2.Add("phone", "Phone is required")

		errors1.Merge(errors2)

		if len(errors1.Errors) != 3 {
			t.Errorf("Merged error count = %d, want %d", len(errors1.Errors), 3)
		}
	})

	t.Run("Merge nil", func(t *testing.T) {
		errors := NewValidationErrors()
		errors.Add("email", "Email is required")
		errors.Merge(nil)

		if len(errors.Errors) != 1 {
			t.Errorf("Error count after nil merge = %d, want %d", len(errors.Errors), 1)
		}
	})

	t.Run("Merge empty", func(t *testing.T) {
		errors := NewValidationErrors()
		errors.Add("email", "Email is required")
		errors.Merge(NewValidationErrors())

		if len(errors.Errors) != 1 {
			t.Errorf("Error count after empty merge = %d, want %d", len(errors.Errors), 1)
		}
	})
}

func TestNewValidationError(t *testing.T) {
	errors := NewValidationError("email", "Email is required")

	if !errors.HasErrors() {
		t.Error("NewValidationError should create errors")
	}
	if len(errors.Errors) != 1 {
		t.Errorf("Error count = %d, want %d", len(errors.Errors), 1)
	}
	if errors.Errors[0].Field != "email" {
		t.Errorf("Field = %q, want %q", errors.Errors[0].Field, "email")
	}
	if errors.Errors[0].Message != "Email is required" {
		t.Errorf("Message = %q, want %q", errors.Errors[0].Message, "Email is required")
	}
}

func TestToResponse(t *testing.T) {
	errors := NewValidationErrors()
	errors.Add("email", "Email is required")
	errors.Add("name", "Name is required")

	resp := errors.ToResponse()

	if resp.Error != "Validation failed" {
		t.Errorf("Response error = %q, want %q", resp.Error, "Validation failed")
	}
	if resp.Code != "VALIDATION_ERROR" {
		t.Errorf("Response code = %q, want %q", resp.Code, "VALIDATION_ERROR")
	}
	if len(resp.Details) != 2 {
		t.Errorf("Response details count = %d, want %d", len(resp.Details), 2)
	}
}

func TestWriteValidationErrorResponse(t *testing.T) {
	w := httptest.NewRecorder()
	errors := NewValidationErrors()
	errors.Add("email", "Email is required")

	WriteValidationErrorResponse(w, errors)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Response status = %d, want %d", w.Code, http.StatusBadRequest)
	}

	contentType := w.Header().Get("Content-Type")
	if contentType != "application/json" {
		t.Errorf("Content-Type = %q, want %q", contentType, "application/json")
	}
}

func TestWriteErrorResponse(t *testing.T) {
	w := httptest.NewRecorder()

	WriteErrorResponse(w, http.StatusNotFound, "Resource not found")

	if w.Code != http.StatusNotFound {
		t.Errorf("Response status = %d, want %d", w.Code, http.StatusNotFound)
	}

	contentType := w.Header().Get("Content-Type")
	if contentType != "application/json" {
		t.Errorf("Content-Type = %q, want %q", contentType, "application/json")
	}
}

func TestRequiredError(t *testing.T) {
	err := RequiredError("email")

	if err.Field != "email" {
		t.Errorf("Field = %q, want %q", err.Field, "email")
	}
	if err.Code != ErrCodeRequired {
		t.Errorf("Code = %q, want %q", err.Code, ErrCodeRequired)
	}
	if err.Message != "email is required" {
		t.Errorf("Message = %q, want %q", err.Message, "email is required")
	}
}

func TestInvalidError(t *testing.T) {
	err := InvalidError("email", "Invalid email format")

	if err.Field != "email" {
		t.Errorf("Field = %q, want %q", err.Field, "email")
	}
	if err.Code != ErrCodeInvalid {
		t.Errorf("Code = %q, want %q", err.Code, ErrCodeInvalid)
	}
	if err.Message != "Invalid email format" {
		t.Errorf("Message = %q, want %q", err.Message, "Invalid email format")
	}
}

func TestFormatError(t *testing.T) {
	err := FormatError("ssn", "XXX-XX-XXXX")

	if err.Field != "ssn" {
		t.Errorf("Field = %q, want %q", err.Field, "ssn")
	}
	if err.Code != ErrCodeInvalidFormat {
		t.Errorf("Code = %q, want %q", err.Code, ErrCodeInvalidFormat)
	}
}

func TestLengthError(t *testing.T) {
	t.Run("Both min and max", func(t *testing.T) {
		err := LengthError("password", 8, 100)
		if err.Message != "password must be between 8 and 100 characters" {
			t.Errorf("Message = %q", err.Message)
		}
	})

	t.Run("Only min", func(t *testing.T) {
		err := LengthError("password", 8, 0)
		if err.Message != "password must be at least 8 characters" {
			t.Errorf("Message = %q", err.Message)
		}
	})

	t.Run("Only max", func(t *testing.T) {
		err := LengthError("name", 0, 100)
		if err.Message != "name must be at most 100 characters" {
			t.Errorf("Message = %q", err.Message)
		}
	})
}

func TestRangeError(t *testing.T) {
	err := RangeError("age", 18, 120)

	if err.Field != "age" {
		t.Errorf("Field = %q, want %q", err.Field, "age")
	}
	if err.Code != ErrCodeOutOfRange {
		t.Errorf("Code = %q, want %q", err.Code, ErrCodeOutOfRange)
	}
}

// Test Validatable interface
type ValidatableStruct struct {
	Name  string
	Email string
}

func (v *ValidatableStruct) Validate() *ValidationErrors {
	errors := NewValidationErrors()
	if v.Name == "" {
		errors.Add("name", "Name is required")
	}
	if v.Email == "" {
		errors.Add("email", "Email is required")
	}
	if errors.HasErrors() {
		return errors
	}
	return nil
}

func (v *ValidatableStruct) Sanitize() {
	v.Name = NewSanitizer().TrimWhitespace(v.Name)
	v.Email = NewSanitizer().NormalizeEmail(v.Email)
}

func TestValidateAndSanitize(t *testing.T) {
	t.Run("Valid struct", func(t *testing.T) {
		s := &ValidatableStruct{
			Name:  "  John Doe  ",
			Email: "  USER@EXAMPLE.COM  ",
		}

		errors := ValidateAndSanitize(s)

		if errors != nil {
			t.Errorf("Expected no errors, got %v", errors)
		}

		// Check sanitization
		if s.Name != "John Doe" {
			t.Errorf("Name not sanitized: %q", s.Name)
		}
		if s.Email != "user@example.com" {
			t.Errorf("Email not sanitized: %q", s.Email)
		}
	})

	t.Run("Invalid struct", func(t *testing.T) {
		s := &ValidatableStruct{
			Name:  "",
			Email: "",
		}

		errors := ValidateAndSanitize(s)

		if errors == nil {
			t.Error("Expected errors but got nil")
		}
		if len(errors.Errors) != 2 {
			t.Errorf("Error count = %d, want %d", len(errors.Errors), 2)
		}
	})

	t.Run("Non-validatable type", func(t *testing.T) {
		s := struct{ Name string }{Name: "test"}

		errors := ValidateAndSanitize(&s)

		if errors != nil {
			t.Errorf("Non-validatable should return nil, got %v", errors)
		}
	})
}
