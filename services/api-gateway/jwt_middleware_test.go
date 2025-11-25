package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v4"
)

func TestJWTMiddleware_ValidToken(t *testing.T) {
	config := &JWTConfig{
		SecretKey: "test-secret",
		Issuer:    "test-issuer",
	}

	// Generate a valid token
	token, err := GenerateToken(config, "user123", "dealer456", "test@example.com", "admin")
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	// Create a test handler that checks context values
	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID := GetUserIDFromContext(r.Context())
		dealershipID := GetDealershipIDFromContext(r.Context())
		email := GetEmailFromContext(r.Context())
		role := GetRoleFromContext(r.Context())

		if userID != "user123" {
			t.Errorf("Expected userID 'user123', got '%s'", userID)
		}
		if dealershipID != "dealer456" {
			t.Errorf("Expected dealershipID 'dealer456', got '%s'", dealershipID)
		}
		if email != "test@example.com" {
			t.Errorf("Expected email 'test@example.com', got '%s'", email)
		}
		if role != "admin" {
			t.Errorf("Expected role 'admin', got '%s'", role)
		}

		w.WriteHeader(http.StatusOK)
	})

	// Wrap with JWT middleware
	handler := JWTMiddleware(config)(testHandler)

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}
}

func TestJWTMiddleware_MissingAuthHeader(t *testing.T) {
	config := &JWTConfig{
		SecretKey: "test-secret",
		Issuer:    "test-issuer",
	}

	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	handler := JWTMiddleware(config)(testHandler)

	req := httptest.NewRequest("GET", "/test", nil)
	// No Authorization header

	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusUnauthorized {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusUnauthorized)
	}
}

func TestJWTMiddleware_InvalidAuthFormat(t *testing.T) {
	config := &JWTConfig{
		SecretKey: "test-secret",
		Issuer:    "test-issuer",
	}

	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	handler := JWTMiddleware(config)(testHandler)

	testCases := []struct {
		name   string
		header string
	}{
		{"Missing Bearer prefix", "invalid-token"},
		{"Only Bearer", "Bearer"},
		{"Multiple spaces", "Bearer  token  extra"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/test", nil)
			req.Header.Set("Authorization", tc.header)

			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, req)

			if status := rr.Code; status != http.StatusUnauthorized {
				t.Errorf("handler returned wrong status code: got %v want %v",
					status, http.StatusUnauthorized)
			}
		})
	}
}

func TestJWTMiddleware_InvalidToken(t *testing.T) {
	config := &JWTConfig{
		SecretKey: "test-secret",
		Issuer:    "test-issuer",
	}

	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	handler := JWTMiddleware(config)(testHandler)

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer invalid.token.here")

	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusUnauthorized {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusUnauthorized)
	}
}

func TestJWTMiddleware_WrongSecret(t *testing.T) {
	config1 := &JWTConfig{
		SecretKey: "secret1",
		Issuer:    "test-issuer",
	}

	config2 := &JWTConfig{
		SecretKey: "secret2",
		Issuer:    "test-issuer",
	}

	// Generate token with config1
	token, err := GenerateToken(config1, "user123", "dealer456", "test@example.com", "admin")
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	// Try to validate with config2 (different secret)
	handler := JWTMiddleware(config2)(testHandler)

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusUnauthorized {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusUnauthorized)
	}
}

func TestJWTMiddleware_WrongIssuer(t *testing.T) {
	config1 := &JWTConfig{
		SecretKey: "test-secret",
		Issuer:    "issuer1",
	}

	config2 := &JWTConfig{
		SecretKey: "test-secret",
		Issuer:    "issuer2",
	}

	// Generate token with issuer1
	token, err := GenerateToken(config1, "user123", "dealer456", "test@example.com", "admin")
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	// Try to validate with issuer2
	handler := JWTMiddleware(config2)(testHandler)

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusUnauthorized {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusUnauthorized)
	}
}

func TestJWTMiddleware_ExpiredToken(t *testing.T) {
	config := &JWTConfig{
		SecretKey: "test-secret",
		Issuer:    "test-issuer",
	}

	// Create an expired token manually
	claims := Claims{
		UserID:       "user123",
		DealershipID: "dealer456",
		Email:        "test@example.com",
		Role:         "admin",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(-1 * time.Hour)), // Expired 1 hour ago
			IssuedAt:  jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
			Issuer:    config.Issuer,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(config.SecretKey))
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	handler := JWTMiddleware(config)(testHandler)

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer "+tokenString)

	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusUnauthorized {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusUnauthorized)
	}
}

func TestGenerateToken(t *testing.T) {
	config := &JWTConfig{
		SecretKey: "test-secret",
		Issuer:    "test-issuer",
	}

	token, err := GenerateToken(config, "user123", "dealer456", "test@example.com", "admin")
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	if token == "" {
		t.Error("Expected non-empty token")
	}

	// Verify token can be parsed
	parsedToken, err := jwt.ParseWithClaims(token, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(config.SecretKey), nil
	})

	if err != nil {
		t.Fatalf("Failed to parse generated token: %v", err)
	}

	if claims, ok := parsedToken.Claims.(*Claims); ok && parsedToken.Valid {
		if claims.UserID != "user123" {
			t.Errorf("Expected UserID 'user123', got '%s'", claims.UserID)
		}
		if claims.DealershipID != "dealer456" {
			t.Errorf("Expected DealershipID 'dealer456', got '%s'", claims.DealershipID)
		}
		if claims.Email != "test@example.com" {
			t.Errorf("Expected Email 'test@example.com', got '%s'", claims.Email)
		}
		if claims.Role != "admin" {
			t.Errorf("Expected Role 'admin', got '%s'", claims.Role)
		}
		if claims.Issuer != config.Issuer {
			t.Errorf("Expected Issuer '%s', got '%s'", config.Issuer, claims.Issuer)
		}
	} else {
		t.Error("Failed to extract claims from token")
	}
}

func TestContextHelpers(t *testing.T) {
	config := &JWTConfig{
		SecretKey: "test-secret",
		Issuer:    "test-issuer",
	}

	token, err := GenerateToken(config, "user123", "dealer456", "test@example.com", "admin")
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		userID := GetUserIDFromContext(ctx)
		dealershipID := GetDealershipIDFromContext(ctx)
		email := GetEmailFromContext(ctx)
		role := GetRoleFromContext(ctx)

		if userID != "user123" {
			t.Errorf("GetUserIDFromContext failed: got '%s', want 'user123'", userID)
		}
		if dealershipID != "dealer456" {
			t.Errorf("GetDealershipIDFromContext failed: got '%s', want 'dealer456'", dealershipID)
		}
		if email != "test@example.com" {
			t.Errorf("GetEmailFromContext failed: got '%s', want 'test@example.com'", email)
		}
		if role != "admin" {
			t.Errorf("GetRoleFromContext failed: got '%s', want 'admin'", role)
		}

		w.WriteHeader(http.StatusOK)
	})

	handler := JWTMiddleware(config)(testHandler)

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}
}
