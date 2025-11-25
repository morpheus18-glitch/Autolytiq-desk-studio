package main

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v4"
)

// Claims represents JWT claims
type Claims struct {
	UserID       string `json:"user_id"`
	DealershipID string `json:"dealership_id"`
	Email        string `json:"email"`
	Role         string `json:"role"`
	jwt.RegisteredClaims
}

// JWTConfig holds JWT configuration
type JWTConfig struct {
	SecretKey string
	Issuer    string
}

// contextKey is a custom type for context keys to avoid collisions
type contextKey string

const (
	// ContextKeyUserID is the context key for user ID
	ContextKeyUserID contextKey = "user_id"
	// ContextKeyDealershipID is the context key for dealership ID
	ContextKeyDealershipID contextKey = "dealership_id"
	// ContextKeyEmail is the context key for email
	ContextKeyEmail contextKey = "email"
	// ContextKeyRole is the context key for role
	ContextKeyRole contextKey = "role"
)

// JWTMiddleware creates middleware that validates JWT tokens
func JWTMiddleware(config *JWTConfig) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Extract token from Authorization header
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, `{"error":"Missing authorization header"}`, http.StatusUnauthorized)
				return
			}

			// Check for Bearer token format
			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				http.Error(w, `{"error":"Invalid authorization format. Expected: Bearer <token>"}`, http.StatusUnauthorized)
				return
			}

			tokenString := parts[1]

			// Parse and validate token
			token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
				// Verify signing method
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
				}
				return []byte(config.SecretKey), nil
			})

			if err != nil {
				http.Error(w, fmt.Sprintf(`{"error":"Invalid token: %v"}`, err), http.StatusUnauthorized)
				return
			}

			// Extract claims
			if claims, ok := token.Claims.(*Claims); ok && token.Valid {
				// Verify issuer
				if claims.Issuer != config.Issuer {
					http.Error(w, `{"error":"Invalid token issuer"}`, http.StatusUnauthorized)
					return
				}

				// Check expiration
				if claims.ExpiresAt != nil && claims.ExpiresAt.Time.Before(time.Now()) {
					http.Error(w, `{"error":"Token expired"}`, http.StatusUnauthorized)
					return
				}

				// Add claims to request context
				ctx := context.WithValue(r.Context(), ContextKeyUserID, claims.UserID)
				ctx = context.WithValue(ctx, ContextKeyDealershipID, claims.DealershipID)
				ctx = context.WithValue(ctx, ContextKeyEmail, claims.Email)
				ctx = context.WithValue(ctx, ContextKeyRole, claims.Role)

				// Continue with modified request
				next.ServeHTTP(w, r.WithContext(ctx))
			} else {
				http.Error(w, `{"error":"Invalid token claims"}`, http.StatusUnauthorized)
				return
			}
		})
	}
}

// GenerateToken generates a JWT token for testing/development
func GenerateToken(config *JWTConfig, userID, dealershipID, email, role string) (string, error) {
	claims := Claims{
		UserID:       userID,
		DealershipID: dealershipID,
		Email:        email,
		Role:         role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    config.Issuer,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.SecretKey))
}

// GetUserIDFromContext extracts user ID from context
func GetUserIDFromContext(ctx context.Context) string {
	if userID, ok := ctx.Value(ContextKeyUserID).(string); ok {
		return userID
	}
	return ""
}

// GetDealershipIDFromContext extracts dealership ID from context
func GetDealershipIDFromContext(ctx context.Context) string {
	if dealershipID, ok := ctx.Value(ContextKeyDealershipID).(string); ok {
		return dealershipID
	}
	return ""
}

// GetEmailFromContext extracts email from context
func GetEmailFromContext(ctx context.Context) string {
	if email, ok := ctx.Value(ContextKeyEmail).(string); ok {
		return email
	}
	return ""
}

// GetRoleFromContext extracts role from context
func GetRoleFromContext(ctx context.Context) string {
	if role, ok := ctx.Value(ContextKeyRole).(string); ok {
		return role
	}
	return ""
}
