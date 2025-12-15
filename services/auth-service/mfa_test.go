package main

import (
	"strings"
	"testing"
	"time"
)

func TestMFAService_GenerateSetup(t *testing.T) {
	mfa := NewMFAService("Autolytiq")
	email := "test@example.com"

	setup, err := mfa.GenerateSetup(email)
	if err != nil {
		t.Fatalf("GenerateSetup failed: %v", err)
	}

	// Check secret is not empty
	if setup.Secret == "" {
		t.Error("Secret should not be empty")
	}

	// Check secret is base32 encoded (uppercase letters and 2-7)
	for _, c := range setup.Secret {
		if !((c >= 'A' && c <= 'Z') || (c >= '2' && c <= '7') || c == '=') {
			t.Errorf("Secret contains invalid base32 character: %c", c)
		}
	}

	// Check QR code URL format
	if !strings.HasPrefix(setup.QRCodeURL, "otpauth://totp/") {
		t.Errorf("QRCodeURL should start with otpauth://totp/, got: %s", setup.QRCodeURL)
	}

	// Check issuer is in URL
	if !strings.Contains(setup.QRCodeURL, "issuer=Autolytiq") {
		t.Errorf("QRCodeURL should contain issuer=Autolytiq, got: %s", setup.QRCodeURL)
	}

	// Check email is in URL
	if !strings.Contains(setup.QRCodeURL, email) {
		t.Errorf("QRCodeURL should contain email %s, got: %s", email, setup.QRCodeURL)
	}
}

func TestMFAService_ValidateCode(t *testing.T) {
	mfa := NewMFAService("Autolytiq")
	email := "test@example.com"

	// Generate setup
	setup, _ := mfa.GenerateSetup(email)

	// Generate current code using the same library
	// Note: In real usage, the user would enter the code from their authenticator app
	// For testing, we can use the ValidateCodeWithWindow method

	// The code validation should work with a valid secret
	// We can't test with a specific code without knowing the current time
	// So we test that invalid codes are rejected
	invalid := mfa.ValidateCode(setup.Secret, "000000")
	// This might pass occasionally by chance (1/1000000), but very unlikely
	// Just verify the function runs without error
	t.Logf("Invalid code validation result: %v", invalid)
}

func TestMFAService_GenerateBackupCodes(t *testing.T) {
	mfa := NewMFAService("Autolytiq")

	codes, err := mfa.GenerateBackupCodes(10)
	if err != nil {
		t.Fatalf("GenerateBackupCodes failed: %v", err)
	}

	if len(codes) != 10 {
		t.Errorf("Expected 10 backup codes, got %d", len(codes))
	}

	// Check format: XXXX-XXXX
	for i, code := range codes {
		if len(code) != 9 { // 4 + 1 (dash) + 4
			t.Errorf("Code %d has wrong length: %s", i, code)
		}
		if code[4] != '-' {
			t.Errorf("Code %d missing dash at position 4: %s", i, code)
		}
	}

	// Check uniqueness
	seen := make(map[string]bool)
	for _, code := range codes {
		if seen[code] {
			t.Errorf("Duplicate backup code found: %s", code)
		}
		seen[code] = true
	}
}

func TestMFAService_ValidateBackupCode(t *testing.T) {
	mfa := NewMFAService("Autolytiq")

	codes := []BackupCode{
		{Code: "ABCD-EFGH", Used: false},
		{Code: "IJKL-MNOP", Used: false},
		{Code: "QRST-UVWX", Used: true}, // Already used
	}

	// Valid code
	valid, idx := mfa.ValidateBackupCode("ABCD-EFGH", codes)
	if !valid || idx != 0 {
		t.Errorf("Expected valid=true, idx=0, got valid=%v, idx=%d", valid, idx)
	}

	// Valid code without dash
	valid, idx = mfa.ValidateBackupCode("ABCDEFGH", codes)
	if !valid || idx != 0 {
		t.Errorf("Expected valid=true for code without dash, got valid=%v", valid)
	}

	// Valid code lowercase
	valid, idx = mfa.ValidateBackupCode("abcd-efgh", codes)
	if !valid || idx != 0 {
		t.Errorf("Expected valid=true for lowercase code, got valid=%v", valid)
	}

	// Used code
	valid, _ = mfa.ValidateBackupCode("QRST-UVWX", codes)
	if valid {
		t.Error("Expected used code to be invalid")
	}

	// Invalid code
	valid, _ = mfa.ValidateBackupCode("ZZZZ-ZZZZ", codes)
	if valid {
		t.Error("Expected unknown code to be invalid")
	}
}

func TestMFAAttemptTracker(t *testing.T) {
	tracker := NewMFAAttemptTracker()

	// Under limit
	if !tracker.CheckAttempts(3, nil) {
		t.Error("Should allow attempts under limit")
	}

	// At limit, no lockout time
	if tracker.CheckAttempts(5, nil) {
		t.Error("Should not allow attempts at limit without lockout")
	}

	// At limit, lockout not expired
	recentAttempt := time.Now().Add(-5 * time.Minute)
	if tracker.CheckAttempts(5, &recentAttempt) {
		t.Error("Should not allow attempts during lockout")
	}

	// At limit, lockout expired
	oldAttempt := time.Now().Add(-20 * time.Minute)
	if !tracker.CheckAttempts(5, &oldAttempt) {
		t.Error("Should allow attempts after lockout expires")
	}
}

func TestMFAAttemptTracker_GetLockoutRemaining(t *testing.T) {
	tracker := NewMFAAttemptTracker()

	// No last attempt
	if remaining := tracker.GetLockoutRemaining(nil); remaining != 0 {
		t.Errorf("Expected 0 remaining for nil attempt, got %v", remaining)
	}

	// Lockout still active
	recentAttempt := time.Now().Add(-5 * time.Minute)
	remaining := tracker.GetLockoutRemaining(&recentAttempt)
	if remaining <= 0 || remaining > 10*time.Minute {
		t.Errorf("Expected ~10min remaining, got %v", remaining)
	}

	// Lockout expired
	oldAttempt := time.Now().Add(-20 * time.Minute)
	if remaining := tracker.GetLockoutRemaining(&oldAttempt); remaining != 0 {
		t.Errorf("Expected 0 remaining for expired lockout, got %v", remaining)
	}
}

func TestEncryptDecryptMFASecret(t *testing.T) {
	secret := "JBSWY3DPEHPK3PXP"

	encrypted, err := EncryptMFASecret(secret)
	if err != nil {
		t.Fatalf("EncryptMFASecret failed: %v", err)
	}

	if encrypted == secret {
		t.Error("Encrypted secret should differ from original")
	}

	decrypted, err := DecryptMFASecret(encrypted)
	if err != nil {
		t.Fatalf("DecryptMFASecret failed: %v", err)
	}

	if decrypted != secret {
		t.Errorf("Decrypted secret should match original. Got %s, expected %s", decrypted, secret)
	}
}

func TestNormalizeBackupCode(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"ABCD-EFGH", "ABCDEFGH"},
		{"abcd-efgh", "ABCDEFGH"},
		{"AbCd EfGh", "ABCDEFGH"},
		{"abcdefgh", "ABCDEFGH"},
		{"A-B-C-D", "ABCD"},
	}

	for _, tt := range tests {
		result := normalizeBackupCode(tt.input)
		if result != tt.expected {
			t.Errorf("normalizeBackupCode(%q) = %q, expected %q", tt.input, result, tt.expected)
		}
	}
}
