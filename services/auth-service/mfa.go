package main

import (
	"crypto/rand"
	"encoding/base32"
	"encoding/base64"
	"fmt"
	"time"

	"github.com/pquerna/otp"
	"github.com/pquerna/otp/totp"
)

// ============================================================================
// MFA Types
// ============================================================================

// MFASetup contains the information needed to setup MFA
type MFASetup struct {
	Secret     string `json:"secret"`      // Base32 encoded secret (for manual entry)
	QRCodeURL  string `json:"qr_code_url"` // otpauth:// URL for QR code generation
	Issuer     string `json:"issuer"`
	AccountName string `json:"account_name"`
}

// MFAStatus represents the MFA status of a user
type MFAStatus struct {
	Enabled        bool       `json:"enabled"`
	VerifiedAt     *time.Time `json:"verified_at,omitempty"`
	BackupCodesRemaining int  `json:"backup_codes_remaining"`
}

// BackupCode represents an MFA backup code
type BackupCode struct {
	Code     string
	Used     bool
	UsedAt   *time.Time
}

// MFAService handles MFA operations
type MFAService struct {
	issuer     string
	codeLength int
	period     uint
	algorithm  otp.Algorithm
}

// ============================================================================
// MFA Service
// ============================================================================

// NewMFAService creates a new MFA service
func NewMFAService(issuer string) *MFAService {
	return &MFAService{
		issuer:     issuer,
		codeLength: 6,
		period:     30, // 30-second window
		algorithm:  otp.AlgorithmSHA1, // Standard TOTP uses SHA1
	}
}

// GenerateSetup generates MFA setup information for a user
// Returns a setup object containing the secret and QR code URL
func (m *MFAService) GenerateSetup(email string) (*MFASetup, error) {
	// Generate TOTP key using the library
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      m.issuer,
		AccountName: email,
		Period:      m.period,
		Digits:      otp.Digits(m.codeLength),
		Algorithm:   m.algorithm,
		SecretSize:  32, // 256-bit secret
	})
	if err != nil {
		return nil, fmt.Errorf("failed to generate TOTP key: %w", err)
	}

	return &MFASetup{
		Secret:      key.Secret(),
		QRCodeURL:   key.URL(),
		Issuer:      m.issuer,
		AccountName: email,
	}, nil
}

// ValidateCode validates a TOTP code against a secret
// Returns true if the code is valid
func (m *MFAService) ValidateCode(secret, code string) bool {
	return totp.Validate(code, secret)
}

// ValidateCodeWithWindow validates a TOTP code with a time window tolerance
// This helps with clock skew between devices
func (m *MFAService) ValidateCodeWithWindow(secret, code string, window int) bool {
	// The otp library's Validate function already handles a 1-step window
	// For larger windows, we need to check manually
	if window <= 1 {
		return totp.Validate(code, secret)
	}

	// Check current time and +/- window steps
	now := time.Now()
	for i := -window; i <= window; i++ {
		checkTime := now.Add(time.Duration(i*int(m.period)) * time.Second)
		expectedCode, err := totp.GenerateCode(secret, checkTime)
		if err != nil {
			continue
		}
		if expectedCode == code {
			return true
		}
	}
	return false
}

// GenerateBackupCodes generates a set of backup codes
// Each code is a random 8-character alphanumeric string
func (m *MFAService) GenerateBackupCodes(count int) ([]string, error) {
	codes := make([]string, count)

	for i := 0; i < count; i++ {
		code, err := generateSecureCode(8)
		if err != nil {
			return nil, fmt.Errorf("failed to generate backup code: %w", err)
		}
		// Format as XXXX-XXXX for readability
		codes[i] = fmt.Sprintf("%s-%s", code[:4], code[4:])
	}

	return codes, nil
}

// ValidateBackupCode checks if a backup code is valid
// Note: In production, backup codes should be hashed before storage
func (m *MFAService) ValidateBackupCode(providedCode string, storedCodes []BackupCode) (bool, int) {
	// Remove dashes from provided code for comparison
	normalizedCode := normalizeBackupCode(providedCode)

	for i, bc := range storedCodes {
		if !bc.Used && normalizeBackupCode(bc.Code) == normalizedCode {
			return true, i
		}
	}
	return false, -1
}

// ============================================================================
// Helper Functions
// ============================================================================

// generateSecureCode generates a cryptographically secure random code
func generateSecureCode(length int) (string, error) {
	// Generate random bytes (more than needed to account for base32 encoding)
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}

	// Use base32 encoding for alphanumeric output (A-Z, 2-7)
	// Then trim to desired length
	encoded := base32.StdEncoding.EncodeToString(bytes)
	if len(encoded) > length {
		encoded = encoded[:length]
	}

	return encoded, nil
}

// normalizeBackupCode removes dashes and converts to uppercase
func normalizeBackupCode(code string) string {
	result := ""
	for _, c := range code {
		if c != '-' && c != ' ' {
			if c >= 'a' && c <= 'z' {
				result += string(c - 32) // Convert to uppercase
			} else {
				result += string(c)
			}
		}
	}
	return result
}

// EncryptMFASecret encrypts an MFA secret for storage
// TODO: This will be upgraded to use PQC encryption (ML-KEM-1024) in a future update
// For now, uses base64 encoding as a temporary measure
func EncryptMFASecret(secret string) (string, error) {
	// Temporary: base64 encoding
	// This will be replaced with: autolytiq/services/shared/encryption.PQCEncryptor.EncryptPQC()
	return base64.StdEncoding.EncodeToString([]byte(secret)), nil
}

// DecryptMFASecret decrypts a stored MFA secret
// TODO: This will support both PQC and legacy decryption for migration
func DecryptMFASecret(encrypted string) (string, error) {
	// Temporary: base64 decoding
	// Future: Check prefix (pqc:v1: vs base64) and decrypt accordingly
	decoded, err := base64.StdEncoding.DecodeString(encrypted)
	if err != nil {
		return "", err
	}
	return string(decoded), nil
}

// ============================================================================
// Rate Limiting for MFA Attempts
// ============================================================================

// MFAAttemptTracker tracks MFA verification attempts to prevent brute force
type MFAAttemptTracker struct {
	maxAttempts     int
	lockoutDuration time.Duration
}

// NewMFAAttemptTracker creates a new attempt tracker
func NewMFAAttemptTracker() *MFAAttemptTracker {
	return &MFAAttemptTracker{
		maxAttempts:     5,               // Lock after 5 failed attempts
		lockoutDuration: 15 * time.Minute, // 15-minute lockout
	}
}

// CheckAttempts returns whether the user is allowed to attempt MFA
func (t *MFAAttemptTracker) CheckAttempts(attempts int, lastAttempt *time.Time) bool {
	if attempts < t.maxAttempts {
		return true
	}

	// Check if lockout has expired
	if lastAttempt != nil {
		lockoutEnd := lastAttempt.Add(t.lockoutDuration)
		return time.Now().After(lockoutEnd)
	}

	return false
}

// GetLockoutRemaining returns the remaining lockout time
func (t *MFAAttemptTracker) GetLockoutRemaining(lastAttempt *time.Time) time.Duration {
	if lastAttempt == nil {
		return 0
	}

	lockoutEnd := lastAttempt.Add(t.lockoutDuration)
	remaining := time.Until(lockoutEnd)
	if remaining < 0 {
		return 0
	}
	return remaining
}
