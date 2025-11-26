package main

import (
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
)

// RegisterRequest represents a registration request
type RegisterRequest struct {
	Email        string `json:"email"`
	Password     string `json:"password"`
	FirstName    string `json:"first_name"`
	LastName     string `json:"last_name"`
	DealershipID string `json:"dealership_id"`
}

// LoginRequest represents a login request
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// RefreshRequest represents a token refresh request
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

// ChangePasswordRequest represents a password change request
type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

// ForgotPasswordRequest represents a forgot password request
type ForgotPasswordRequest struct {
	Email string `json:"email"`
}

// ResetPasswordRequest represents a password reset request
type ResetPasswordRequest struct {
	Token       string `json:"token"`
	NewPassword string `json:"new_password"`
}

// VerifyEmailRequest represents an email verification request
type VerifyEmailRequest struct {
	Token string `json:"token"`
}

// AuthResponse represents the authentication response
type AuthResponse struct {
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	ExpiresIn    int64        `json:"expires_in"`
	TokenType    string       `json:"token_type"`
	User         UserResponse `json:"user"`
}

// UserResponse represents user data in responses
type UserResponse struct {
	ID           string `json:"id"`
	Email        string `json:"email"`
	FirstName    string `json:"first_name"`
	LastName     string `json:"last_name"`
	Role         string `json:"role"`
	DealershipID string `json:"dealership_id"`
}

// register handles user registration
func (s *Server) register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if !decodeAndValidate(r, w, &req) {
		return
	}

	// Check if user already exists
	existing, _ := s.db.GetUserByEmail(req.Email)
	if existing != nil {
		respondError(w, http.StatusConflict, "User with this email already exists")
		return
	}

	// Hash password
	hashedPassword, err := HashPassword(req.Password)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to process password")
		return
	}

	// Create user
	user := &User{
		ID:           uuid.New().String(),
		Email:        strings.ToLower(req.Email),
		PasswordHash: hashedPassword,
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Role:         "SALESPERSON", // Default role
		DealershipID: req.DealershipID,
		IsActive:     true,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := s.db.CreateUser(user); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to create user")
		return
	}

	// Generate tokens
	accessToken, err := s.jwtService.GenerateAccessToken(user)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to generate access token")
		return
	}

	refreshToken, err := s.jwtService.GenerateRefreshToken(user)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to generate refresh token")
		return
	}

	// Store refresh token in Redis
	if err := s.redis.StoreRefreshToken(user.ID, refreshToken, s.config.RefreshTokenTTL); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to store refresh token")
		return
	}

	respondJSON(w, http.StatusCreated, AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(s.config.AccessTokenTTL.Seconds()),
		TokenType:    "Bearer",
		User: UserResponse{
			ID:           user.ID,
			Email:        user.Email,
			FirstName:    user.FirstName,
			LastName:     user.LastName,
			Role:         user.Role,
			DealershipID: user.DealershipID,
		},
	})
}

// login handles user authentication
func (s *Server) login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if !decodeAndValidate(r, w, &req) {
		return
	}

	// Get user by email
	user, err := s.db.GetUserByEmail(strings.ToLower(req.Email))
	if err != nil || user == nil {
		respondError(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	// Check if user is active
	if !user.IsActive {
		respondError(w, http.StatusUnauthorized, "Account is deactivated")
		return
	}

	// Verify password
	if !CheckPassword(req.Password, user.PasswordHash) {
		// Update failed login attempts
		s.db.IncrementFailedAttempts(user.ID)
		respondError(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	// Reset failed attempts on successful login
	s.db.ResetFailedAttempts(user.ID)

	// Update last login
	s.db.UpdateLastLogin(user.ID)

	// Generate tokens
	accessToken, err := s.jwtService.GenerateAccessToken(user)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to generate access token")
		return
	}

	refreshToken, err := s.jwtService.GenerateRefreshToken(user)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to generate refresh token")
		return
	}

	// Store refresh token in Redis
	if err := s.redis.StoreRefreshToken(user.ID, refreshToken, s.config.RefreshTokenTTL); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to store refresh token")
		return
	}

	respondJSON(w, http.StatusOK, AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(s.config.AccessTokenTTL.Seconds()),
		TokenType:    "Bearer",
		User: UserResponse{
			ID:           user.ID,
			Email:        user.Email,
			FirstName:    user.FirstName,
			LastName:     user.LastName,
			Role:         user.Role,
			DealershipID: user.DealershipID,
		},
	})
}

// logout handles user logout
func (s *Server) logout(w http.ResponseWriter, r *http.Request) {
	// Get token from header
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		respondError(w, http.StatusUnauthorized, "Missing authorization header")
		return
	}

	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		respondError(w, http.StatusUnauthorized, "Invalid authorization format")
		return
	}

	token := parts[1]

	// Validate token and get claims
	claims, err := s.jwtService.ValidateAccessToken(token)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "Invalid token")
		return
	}

	// Blacklist the token
	ttl := time.Until(time.Unix(claims.ExpiresAt.Unix(), 0))
	if err := s.redis.BlacklistToken(token, ttl); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to logout")
		return
	}

	// Remove refresh token
	s.redis.RemoveRefreshToken(claims.UserID)

	respondJSON(w, http.StatusOK, map[string]string{"message": "Logged out successfully"})
}

// refresh handles token refresh
func (s *Server) refresh(w http.ResponseWriter, r *http.Request) {
	var req RefreshRequest
	if !decodeAndValidate(r, w, &req) {
		return
	}

	// Validate refresh token
	claims, err := s.jwtService.ValidateRefreshToken(req.RefreshToken)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "Invalid refresh token")
		return
	}

	// Check if refresh token is valid in Redis
	valid, err := s.redis.ValidateRefreshToken(claims.UserID, req.RefreshToken)
	if err != nil || !valid {
		respondError(w, http.StatusUnauthorized, "Refresh token expired or revoked")
		return
	}

	// Get user
	user, err := s.db.GetUserByID(claims.UserID)
	if err != nil || user == nil {
		respondError(w, http.StatusUnauthorized, "User not found")
		return
	}

	if !user.IsActive {
		respondError(w, http.StatusUnauthorized, "Account is deactivated")
		return
	}

	// Generate new tokens
	accessToken, err := s.jwtService.GenerateAccessToken(user)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to generate access token")
		return
	}

	newRefreshToken, err := s.jwtService.GenerateRefreshToken(user)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to generate refresh token")
		return
	}

	// Update refresh token in Redis (rotate)
	s.redis.RemoveRefreshToken(user.ID)
	if err := s.redis.StoreRefreshToken(user.ID, newRefreshToken, s.config.RefreshTokenTTL); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to store refresh token")
		return
	}

	respondJSON(w, http.StatusOK, AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: newRefreshToken,
		ExpiresIn:    int64(s.config.AccessTokenTTL.Seconds()),
		TokenType:    "Bearer",
		User: UserResponse{
			ID:           user.ID,
			Email:        user.Email,
			FirstName:    user.FirstName,
			LastName:     user.LastName,
			Role:         user.Role,
			DealershipID: user.DealershipID,
		},
	})
}

// me returns the current user's information
func (s *Server) me(w http.ResponseWriter, r *http.Request) {
	// Get token from header
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		respondError(w, http.StatusUnauthorized, "Missing authorization header")
		return
	}

	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		respondError(w, http.StatusUnauthorized, "Invalid authorization format")
		return
	}

	token := parts[1]

	// Check if token is blacklisted
	blacklisted, _ := s.redis.IsTokenBlacklisted(token)
	if blacklisted {
		respondError(w, http.StatusUnauthorized, "Token has been revoked")
		return
	}

	// Validate token
	claims, err := s.jwtService.ValidateAccessToken(token)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "Invalid token")
		return
	}

	// Get user
	user, err := s.db.GetUserByID(claims.UserID)
	if err != nil || user == nil {
		respondError(w, http.StatusNotFound, "User not found")
		return
	}

	respondJSON(w, http.StatusOK, UserResponse{
		ID:           user.ID,
		Email:        user.Email,
		FirstName:    user.FirstName,
		LastName:     user.LastName,
		Role:         user.Role,
		DealershipID: user.DealershipID,
	})
}

// changePassword handles password change for authenticated users
func (s *Server) changePassword(w http.ResponseWriter, r *http.Request) {
	// Get token from header
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		respondError(w, http.StatusUnauthorized, "Missing authorization header")
		return
	}

	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		respondError(w, http.StatusUnauthorized, "Invalid authorization format")
		return
	}

	token := parts[1]

	// Validate token
	claims, err := s.jwtService.ValidateAccessToken(token)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "Invalid token")
		return
	}

	var req ChangePasswordRequest
	if !decodeAndValidate(r, w, &req) {
		return
	}

	// Get user
	user, err := s.db.GetUserByID(claims.UserID)
	if err != nil || user == nil {
		respondError(w, http.StatusNotFound, "User not found")
		return
	}

	// Verify current password
	if !CheckPassword(req.CurrentPassword, user.PasswordHash) {
		respondError(w, http.StatusUnauthorized, "Current password is incorrect")
		return
	}

	// Hash new password
	hashedPassword, err := HashPassword(req.NewPassword)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to process password")
		return
	}

	// Update password
	if err := s.db.UpdatePassword(user.ID, hashedPassword); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to update password")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Password changed successfully"})
}

// forgotPassword initiates password reset
func (s *Server) forgotPassword(w http.ResponseWriter, r *http.Request) {
	var req ForgotPasswordRequest
	if !decodeAndValidate(r, w, &req) {
		return
	}

	// Get user by email (don't reveal if user exists)
	user, _ := s.db.GetUserByEmail(strings.ToLower(req.Email))
	if user != nil {
		// Generate reset token
		resetToken := uuid.New().String()

		// Store reset token in Redis (valid for 1 hour)
		s.redis.StoreResetToken(user.ID, resetToken, time.Hour)

		// TODO: Send email with reset link
		// For now, just log it
		// log.Printf("Password reset token for %s: %s", user.Email, resetToken)
	}

	// Always return success to prevent email enumeration
	respondJSON(w, http.StatusOK, map[string]string{
		"message": "If an account with that email exists, a password reset link has been sent",
	})
}

// resetPassword handles password reset with token
func (s *Server) resetPassword(w http.ResponseWriter, r *http.Request) {
	var req ResetPasswordRequest
	if !decodeAndValidate(r, w, &req) {
		return
	}

	// Validate reset token
	userID, err := s.redis.ValidateResetToken(req.Token)
	if err != nil || userID == "" {
		respondError(w, http.StatusBadRequest, "Invalid or expired reset token")
		return
	}

	// Hash new password
	hashedPassword, err := HashPassword(req.NewPassword)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to process password")
		return
	}

	// Update password
	if err := s.db.UpdatePassword(userID, hashedPassword); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to update password")
		return
	}

	// Remove reset token
	s.redis.RemoveResetToken(req.Token)

	respondJSON(w, http.StatusOK, map[string]string{"message": "Password reset successfully"})
}

// verifyEmail handles email verification
func (s *Server) verifyEmail(w http.ResponseWriter, r *http.Request) {
	var req VerifyEmailRequest
	if !decodeAndValidate(r, w, &req) {
		return
	}

	// Validate email verification token
	userID, err := s.redis.ValidateEmailToken(req.Token)
	if err != nil || userID == "" {
		respondError(w, http.StatusBadRequest, "Invalid or expired verification token")
		return
	}

	// Mark email as verified
	if err := s.db.VerifyEmail(userID); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to verify email")
		return
	}

	// Remove verification token
	s.redis.RemoveEmailToken(req.Token)

	respondJSON(w, http.StatusOK, map[string]string{"message": "Email verified successfully"})
}
