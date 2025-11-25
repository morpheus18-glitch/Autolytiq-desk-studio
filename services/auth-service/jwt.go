package main

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v4"
)

// JWTService handles JWT token generation and validation
type JWTService struct {
	secret          string
	issuer          string
	accessTokenTTL  time.Duration
	refreshTokenTTL time.Duration
}

// AccessTokenClaims represents claims in an access token
type AccessTokenClaims struct {
	jwt.RegisteredClaims
	UserID       string `json:"user_id"`
	Email        string `json:"email"`
	Role         string `json:"role"`
	DealershipID string `json:"dealership_id"`
}

// RefreshTokenClaims represents claims in a refresh token
type RefreshTokenClaims struct {
	jwt.RegisteredClaims
	UserID string `json:"user_id"`
}

// NewJWTService creates a new JWT service
func NewJWTService(secret, issuer string, accessTTL, refreshTTL time.Duration) *JWTService {
	return &JWTService{
		secret:          secret,
		issuer:          issuer,
		accessTokenTTL:  accessTTL,
		refreshTokenTTL: refreshTTL,
	}
}

// GenerateAccessToken generates a new access token for a user
func (j *JWTService) GenerateAccessToken(user *User) (string, error) {
	now := time.Now()
	claims := AccessTokenClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    j.issuer,
			Subject:   user.ID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(j.accessTokenTTL)),
		},
		UserID:       user.ID,
		Email:        user.Email,
		Role:         user.Role,
		DealershipID: user.DealershipID,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(j.secret))
}

// GenerateRefreshToken generates a new refresh token for a user
func (j *JWTService) GenerateRefreshToken(user *User) (string, error) {
	now := time.Now()
	claims := RefreshTokenClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    j.issuer,
			Subject:   user.ID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(j.refreshTokenTTL)),
		},
		UserID: user.ID,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(j.secret))
}

// ValidateAccessToken validates an access token and returns the claims
func (j *JWTService) ValidateAccessToken(tokenString string) (*AccessTokenClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &AccessTokenClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(j.secret), nil
	})

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*AccessTokenClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	// Verify issuer
	if claims.Issuer != j.issuer {
		return nil, fmt.Errorf("invalid issuer")
	}

	return claims, nil
}

// ValidateRefreshToken validates a refresh token and returns the claims
func (j *JWTService) ValidateRefreshToken(tokenString string) (*RefreshTokenClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &RefreshTokenClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(j.secret), nil
	})

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*RefreshTokenClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	// Verify issuer
	if claims.Issuer != j.issuer {
		return nil, fmt.Errorf("invalid issuer")
	}

	return claims, nil
}
