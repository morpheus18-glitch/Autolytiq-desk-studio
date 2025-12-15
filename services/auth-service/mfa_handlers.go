package main

import (
	"encoding/json"
	"net/http"
	"strings"
)

// ============================================================================
// MFA Request/Response Types
// ============================================================================

// MFASetupResponse is returned when initiating MFA setup
type MFASetupResponse struct {
	Secret      string `json:"secret"`       // Base32 secret for manual entry
	QRCodeURL   string `json:"qr_code_url"`  // otpauth:// URL for QR code
	BackupCodes []string `json:"backup_codes"` // One-time backup codes
}

// MFAVerifyRequest is the request to verify MFA setup or login
type MFAVerifyRequest struct {
	Code string `json:"code"` // 6-digit TOTP code
}

// MFADisableRequest is the request to disable MFA
type MFADisableRequest struct {
	Code     string `json:"code"`     // TOTP code or backup code
	Password string `json:"password"` // User's password for confirmation
}

// MFAStatusResponse returns the MFA status for a user
type MFAStatusResponse struct {
	Enabled              bool   `json:"enabled"`
	VerifiedAt           string `json:"verified_at,omitempty"`
	BackupCodesRemaining int    `json:"backup_codes_remaining"`
}

// LoginMFARequiredResponse is returned when MFA is required for login
type LoginMFARequiredResponse struct {
	MFARequired bool   `json:"mfa_required"`
	Message     string `json:"message"`
	TempToken   string `json:"temp_token"` // Temporary token for MFA completion
}

// ============================================================================
// MFA Handlers
// ============================================================================

// setupMFA initiates MFA setup for the authenticated user
// POST /auth/mfa/setup
func (s *Server) setupMFA(w http.ResponseWriter, r *http.Request) {
	// Get authenticated user
	user, err := s.getAuthenticatedUser(r)
	if err != nil {
		respondError(w, http.StatusUnauthorized, err.Error())
		return
	}

	// Check if MFA is already enabled
	if user.MFAEnabled {
		respondError(w, http.StatusBadRequest, "MFA is already enabled. Disable it first to reconfigure.")
		return
	}

	// Generate MFA setup
	setup, err := s.mfaService.GenerateSetup(user.Email)
	if err != nil {
		s.logger.WithError(err).Error("Failed to generate MFA setup")
		respondError(w, http.StatusInternalServerError, "Failed to generate MFA setup")
		return
	}

	// Encrypt and store the secret (pending verification)
	encryptedSecret, err := EncryptMFASecret(setup.Secret)
	if err != nil {
		s.logger.WithError(err).Error("Failed to encrypt MFA secret")
		respondError(w, http.StatusInternalServerError, "Failed to setup MFA")
		return
	}

	if err := s.db.SetMFASecret(user.ID, encryptedSecret); err != nil {
		s.logger.WithError(err).Error("Failed to store MFA secret")
		respondError(w, http.StatusInternalServerError, "Failed to setup MFA")
		return
	}

	// Generate backup codes
	backupCodes, err := s.mfaService.GenerateBackupCodes(10)
	if err != nil {
		s.logger.WithError(err).Error("Failed to generate backup codes")
		respondError(w, http.StatusInternalServerError, "Failed to generate backup codes")
		return
	}

	// Store backup codes (encrypted as JSON)
	backupCodesJSON, _ := json.Marshal(backupCodes)
	encryptedCodes, _ := EncryptMFASecret(string(backupCodesJSON))
	if err := s.db.SetMFABackupCodes(user.ID, encryptedCodes); err != nil {
		s.logger.WithError(err).Error("Failed to store backup codes")
		// Non-fatal, continue with setup
	}

	s.logger.WithField("user_id", user.ID).Info("MFA setup initiated")

	respondJSON(w, http.StatusOK, MFASetupResponse{
		Secret:      setup.Secret,
		QRCodeURL:   setup.QRCodeURL,
		BackupCodes: backupCodes,
	})
}

// verifyMFA verifies the TOTP code and enables MFA
// POST /auth/mfa/verify
func (s *Server) verifyMFA(w http.ResponseWriter, r *http.Request) {
	// Get authenticated user
	user, err := s.getAuthenticatedUser(r)
	if err != nil {
		respondError(w, http.StatusUnauthorized, err.Error())
		return
	}

	var req MFAVerifyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Code == "" {
		respondError(w, http.StatusBadRequest, "MFA code is required")
		return
	}

	// Check for rate limiting
	if user.MFAFailedAttempts >= 5 {
		tracker := NewMFAAttemptTracker()
		if !tracker.CheckAttempts(user.MFAFailedAttempts, user.MFALastAttempt) {
			remaining := tracker.GetLockoutRemaining(user.MFALastAttempt)
			respondError(w, http.StatusTooManyRequests,
				"Too many failed attempts. Try again in "+remaining.String())
			return
		}
	}

	// Check if user has a pending MFA secret
	if user.MFASecret == "" {
		respondError(w, http.StatusBadRequest, "MFA setup not initiated. Call /auth/mfa/setup first.")
		return
	}

	// Decrypt the secret
	secret, err := DecryptMFASecret(user.MFASecret)
	if err != nil {
		s.logger.WithError(err).Error("Failed to decrypt MFA secret")
		respondError(w, http.StatusInternalServerError, "Failed to verify MFA")
		return
	}

	// Validate the code
	if !s.mfaService.ValidateCode(secret, req.Code) {
		// Increment failed attempts
		s.db.IncrementMFAFailedAttempts(user.ID)
		respondError(w, http.StatusBadRequest, "Invalid MFA code")
		return
	}

	// Enable MFA
	if err := s.db.EnableMFA(user.ID); err != nil {
		s.logger.WithError(err).Error("Failed to enable MFA")
		respondError(w, http.StatusInternalServerError, "Failed to enable MFA")
		return
	}

	// Reset failed attempts
	s.db.ResetMFAFailedAttempts(user.ID)

	s.logger.WithField("user_id", user.ID).Info("MFA enabled successfully")

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message": "MFA enabled successfully",
		"enabled": true,
	})
}

// disableMFA disables MFA for the authenticated user
// POST /auth/mfa/disable
func (s *Server) disableMFA(w http.ResponseWriter, r *http.Request) {
	// Get authenticated user
	user, err := s.getAuthenticatedUser(r)
	if err != nil {
		respondError(w, http.StatusUnauthorized, err.Error())
		return
	}

	var req MFADisableRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Verify password
	if !CheckPassword(req.Password, user.PasswordHash) {
		respondError(w, http.StatusUnauthorized, "Invalid password")
		return
	}

	// If MFA is enabled, verify the code
	if user.MFAEnabled {
		if req.Code == "" {
			respondError(w, http.StatusBadRequest, "MFA code is required to disable MFA")
			return
		}

		// Decrypt the secret
		secret, err := DecryptMFASecret(user.MFASecret)
		if err != nil {
			s.logger.WithError(err).Error("Failed to decrypt MFA secret")
			respondError(w, http.StatusInternalServerError, "Failed to disable MFA")
			return
		}

		// Try TOTP code first
		if !s.mfaService.ValidateCode(secret, req.Code) {
			// Try as backup code
			if !s.tryBackupCode(user, req.Code) {
				s.db.IncrementMFAFailedAttempts(user.ID)
				respondError(w, http.StatusBadRequest, "Invalid MFA code")
				return
			}
		}
	}

	// Disable MFA
	if err := s.db.DisableMFA(user.ID); err != nil {
		s.logger.WithError(err).Error("Failed to disable MFA")
		respondError(w, http.StatusInternalServerError, "Failed to disable MFA")
		return
	}

	s.logger.WithField("user_id", user.ID).Info("MFA disabled")

	respondJSON(w, http.StatusOK, map[string]string{
		"message": "MFA disabled successfully",
	})
}

// getMFAStatus returns the MFA status for the authenticated user
// GET /auth/mfa/status
func (s *Server) getMFAStatus(w http.ResponseWriter, r *http.Request) {
	// Get authenticated user
	user, err := s.getAuthenticatedUser(r)
	if err != nil {
		respondError(w, http.StatusUnauthorized, err.Error())
		return
	}

	response := MFAStatusResponse{
		Enabled: user.MFAEnabled,
	}

	if user.MFAVerifiedAt != nil {
		response.VerifiedAt = user.MFAVerifiedAt.Format("2006-01-02T15:04:05Z")
	}

	// Count remaining backup codes
	if user.MFABackupCodes != "" {
		decryptedCodes, err := DecryptMFASecret(user.MFABackupCodes)
		if err == nil {
			var codes []string
			if json.Unmarshal([]byte(decryptedCodes), &codes) == nil {
				response.BackupCodesRemaining = len(codes)
			}
		}
	}

	respondJSON(w, http.StatusOK, response)
}

// regenerateBackupCodes generates new backup codes
// POST /auth/mfa/backup-codes
func (s *Server) regenerateBackupCodes(w http.ResponseWriter, r *http.Request) {
	// Get authenticated user
	user, err := s.getAuthenticatedUser(r)
	if err != nil {
		respondError(w, http.StatusUnauthorized, err.Error())
		return
	}

	// MFA must be enabled to regenerate backup codes
	if !user.MFAEnabled {
		respondError(w, http.StatusBadRequest, "MFA must be enabled to regenerate backup codes")
		return
	}

	var req MFAVerifyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Verify current MFA code
	if req.Code == "" {
		respondError(w, http.StatusBadRequest, "MFA code is required")
		return
	}

	secret, err := DecryptMFASecret(user.MFASecret)
	if err != nil {
		s.logger.WithError(err).Error("Failed to decrypt MFA secret")
		respondError(w, http.StatusInternalServerError, "Failed to verify MFA")
		return
	}

	if !s.mfaService.ValidateCode(secret, req.Code) {
		s.db.IncrementMFAFailedAttempts(user.ID)
		respondError(w, http.StatusBadRequest, "Invalid MFA code")
		return
	}

	// Generate new backup codes
	backupCodes, err := s.mfaService.GenerateBackupCodes(10)
	if err != nil {
		s.logger.WithError(err).Error("Failed to generate backup codes")
		respondError(w, http.StatusInternalServerError, "Failed to generate backup codes")
		return
	}

	// Store new backup codes
	backupCodesJSON, _ := json.Marshal(backupCodes)
	encryptedCodes, _ := EncryptMFASecret(string(backupCodesJSON))
	if err := s.db.SetMFABackupCodes(user.ID, encryptedCodes); err != nil {
		s.logger.WithError(err).Error("Failed to store backup codes")
		respondError(w, http.StatusInternalServerError, "Failed to store backup codes")
		return
	}

	s.logger.WithField("user_id", user.ID).Info("Backup codes regenerated")

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message":      "Backup codes regenerated successfully",
		"backup_codes": backupCodes,
	})
}

// ============================================================================
// Helper Functions
// ============================================================================

// getAuthenticatedUser extracts and validates the authenticated user from the request
func (s *Server) getAuthenticatedUser(r *http.Request) (*User, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return nil, &AuthError{Message: "Missing authorization header"}
	}

	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		return nil, &AuthError{Message: "Invalid authorization format"}
	}

	token := parts[1]

	// Check if token is blacklisted
	blacklisted, _ := s.redis.IsTokenBlacklisted(token)
	if blacklisted {
		return nil, &AuthError{Message: "Token has been revoked"}
	}

	// Validate token
	claims, err := s.jwtService.ValidateAccessToken(token)
	if err != nil {
		return nil, &AuthError{Message: "Invalid token"}
	}

	// Get user
	user, err := s.db.GetUserByID(claims.UserID)
	if err != nil || user == nil {
		return nil, &AuthError{Message: "User not found"}
	}

	return user, nil
}

// tryBackupCode attempts to use a backup code
func (s *Server) tryBackupCode(user *User, code string) bool {
	if user.MFABackupCodes == "" {
		return false
	}

	decryptedCodes, err := DecryptMFASecret(user.MFABackupCodes)
	if err != nil {
		return false
	}

	var codes []string
	if err := json.Unmarshal([]byte(decryptedCodes), &codes); err != nil {
		return false
	}

	// Check if code matches and remove it
	normalizedInput := normalizeBackupCode(code)
	for i, c := range codes {
		if normalizeBackupCode(c) == normalizedInput {
			// Remove the used code
			codes = append(codes[:i], codes[i+1:]...)

			// Store updated codes
			updatedJSON, _ := json.Marshal(codes)
			encryptedCodes, _ := EncryptMFASecret(string(updatedJSON))
			s.db.SetMFABackupCodes(user.ID, encryptedCodes)

			s.logger.WithField("user_id", user.ID).Info("Backup code used")
			return true
		}
	}

	return false
}

// AuthError represents an authentication error
type AuthError struct {
	Message string
}

func (e *AuthError) Error() string {
	return e.Message
}
