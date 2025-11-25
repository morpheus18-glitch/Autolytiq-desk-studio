package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// MockDB implements AuthDatabase for testing
type MockDB struct {
	users map[string]*User
}

func NewMockDB() *MockDB {
	return &MockDB{users: make(map[string]*User)}
}

func (m *MockDB) Close() error { return nil }

func (m *MockDB) InitSchema() error { return nil }

func (m *MockDB) CreateUser(user *User) error {
	m.users[user.ID] = user
	m.users["email:"+user.Email] = user
	return nil
}

func (m *MockDB) GetUserByID(id string) (*User, error) {
	return m.users[id], nil
}

func (m *MockDB) GetUserByEmail(email string) (*User, error) {
	return m.users["email:"+email], nil
}

func (m *MockDB) UpdatePassword(userID, passwordHash string) error {
	if user := m.users[userID]; user != nil {
		user.PasswordHash = passwordHash
	}
	return nil
}

func (m *MockDB) VerifyEmail(userID string) error {
	if user := m.users[userID]; user != nil {
		user.EmailVerified = true
	}
	return nil
}

func (m *MockDB) UpdateLastLogin(userID string) error { return nil }

func (m *MockDB) IncrementFailedAttempts(userID string) error { return nil }

func (m *MockDB) ResetFailedAttempts(userID string) error { return nil }

// MockRedis implements TokenStore for testing
type MockRedis struct {
	refreshTokens map[string]string
	blacklist     map[string]bool
	resetTokens   map[string]string
	emailTokens   map[string]string
}

func NewMockRedis() *MockRedis {
	return &MockRedis{
		refreshTokens: make(map[string]string),
		blacklist:     make(map[string]bool),
		resetTokens:   make(map[string]string),
		emailTokens:   make(map[string]string),
	}
}

func (m *MockRedis) Close() error { return nil }

func (m *MockRedis) StoreRefreshToken(userID, token string, ttl time.Duration) error {
	m.refreshTokens[userID] = token
	return nil
}

func (m *MockRedis) ValidateRefreshToken(userID, token string) (bool, error) {
	return m.refreshTokens[userID] == token, nil
}

func (m *MockRedis) RemoveRefreshToken(userID string) error {
	delete(m.refreshTokens, userID)
	return nil
}

func (m *MockRedis) BlacklistToken(token string, ttl time.Duration) error {
	m.blacklist[token] = true
	return nil
}

func (m *MockRedis) IsTokenBlacklisted(token string) (bool, error) {
	return m.blacklist[token], nil
}

func (m *MockRedis) StoreResetToken(userID, token string, ttl time.Duration) error {
	m.resetTokens[token] = userID
	return nil
}

func (m *MockRedis) ValidateResetToken(token string) (string, error) {
	return m.resetTokens[token], nil
}

func (m *MockRedis) RemoveResetToken(token string) error {
	delete(m.resetTokens, token)
	return nil
}

func (m *MockRedis) StoreEmailToken(userID, token string, ttl time.Duration) error {
	m.emailTokens[token] = userID
	return nil
}

func (m *MockRedis) ValidateEmailToken(token string) (string, error) {
	return m.emailTokens[token], nil
}

func (m *MockRedis) RemoveEmailToken(token string) error {
	delete(m.emailTokens, token)
	return nil
}

func setupTestServer() *Server {
	config := &Config{
		Port:            "8087",
		JWTSecret:       "test-secret",
		JWTIssuer:       "test-issuer",
		AccessTokenTTL:  15 * time.Minute,
		RefreshTokenTTL: 7 * 24 * time.Hour,
	}

	db := NewMockDB()
	redis := NewMockRedis()
	jwtService := NewJWTService(config.JWTSecret, config.JWTIssuer, config.AccessTokenTTL, config.RefreshTokenTTL)

	return NewServer(config, db, redis, jwtService)
}

func TestHealthCheck(t *testing.T) {
	server := setupTestServer()

	req := httptest.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()

	server.router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)

	if response["status"] != "healthy" {
		t.Errorf("Expected status 'healthy', got %v", response["status"])
	}
}

func TestRegister(t *testing.T) {
	server := setupTestServer()

	body := RegisterRequest{
		Email:        "test@example.com",
		Password:     "password123",
		FirstName:    "Test",
		LastName:     "User",
		DealershipID: "dealer-123",
	}

	jsonBody, _ := json.Marshal(body)
	req := httptest.NewRequest("POST", "/auth/register", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	server.router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("Expected status 201, got %d: %s", w.Code, w.Body.String())
	}

	var response AuthResponse
	json.Unmarshal(w.Body.Bytes(), &response)

	if response.AccessToken == "" {
		t.Error("Expected access token to be present")
	}

	if response.RefreshToken == "" {
		t.Error("Expected refresh token to be present")
	}

	if response.User.Email != "test@example.com" {
		t.Errorf("Expected email 'test@example.com', got %s", response.User.Email)
	}
}

func TestRegisterDuplicateEmail(t *testing.T) {
	server := setupTestServer()

	body := RegisterRequest{
		Email:    "test@example.com",
		Password: "password123",
	}

	jsonBody, _ := json.Marshal(body)

	// First registration
	req := httptest.NewRequest("POST", "/auth/register", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	server.router.ServeHTTP(w, req)

	// Second registration with same email
	req = httptest.NewRequest("POST", "/auth/register", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	server.router.ServeHTTP(w, req)

	if w.Code != http.StatusConflict {
		t.Errorf("Expected status 409, got %d", w.Code)
	}
}

func TestLogin(t *testing.T) {
	server := setupTestServer()

	// First register a user
	registerBody := RegisterRequest{
		Email:    "login@example.com",
		Password: "password123",
	}
	jsonBody, _ := json.Marshal(registerBody)
	req := httptest.NewRequest("POST", "/auth/register", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	server.router.ServeHTTP(w, req)

	// Now login
	loginBody := LoginRequest{
		Email:    "login@example.com",
		Password: "password123",
	}
	jsonBody, _ = json.Marshal(loginBody)
	req = httptest.NewRequest("POST", "/auth/login", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	server.router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var response AuthResponse
	json.Unmarshal(w.Body.Bytes(), &response)

	if response.AccessToken == "" {
		t.Error("Expected access token to be present")
	}
}

func TestLoginInvalidPassword(t *testing.T) {
	server := setupTestServer()

	// First register a user
	registerBody := RegisterRequest{
		Email:    "invalid@example.com",
		Password: "password123",
	}
	jsonBody, _ := json.Marshal(registerBody)
	req := httptest.NewRequest("POST", "/auth/register", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	server.router.ServeHTTP(w, req)

	// Login with wrong password
	loginBody := LoginRequest{
		Email:    "invalid@example.com",
		Password: "wrongpassword",
	}
	jsonBody, _ = json.Marshal(loginBody)
	req = httptest.NewRequest("POST", "/auth/login", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	server.router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status 401, got %d", w.Code)
	}
}

func TestLogout(t *testing.T) {
	server := setupTestServer()

	// Register and login first
	registerBody := RegisterRequest{
		Email:    "logout@example.com",
		Password: "password123",
	}
	jsonBody, _ := json.Marshal(registerBody)
	req := httptest.NewRequest("POST", "/auth/register", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	server.router.ServeHTTP(w, req)

	var authResponse AuthResponse
	json.Unmarshal(w.Body.Bytes(), &authResponse)

	// Logout
	req = httptest.NewRequest("POST", "/auth/logout", nil)
	req.Header.Set("Authorization", "Bearer "+authResponse.AccessToken)
	w = httptest.NewRecorder()
	server.router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestRefreshToken(t *testing.T) {
	server := setupTestServer()

	// Register first
	registerBody := RegisterRequest{
		Email:    "refresh@example.com",
		Password: "password123",
	}
	jsonBody, _ := json.Marshal(registerBody)
	req := httptest.NewRequest("POST", "/auth/register", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	server.router.ServeHTTP(w, req)

	var authResponse AuthResponse
	json.Unmarshal(w.Body.Bytes(), &authResponse)

	// Refresh token
	refreshBody := RefreshRequest{
		RefreshToken: authResponse.RefreshToken,
	}
	jsonBody, _ = json.Marshal(refreshBody)
	req = httptest.NewRequest("POST", "/auth/refresh", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	server.router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var newAuthResponse AuthResponse
	json.Unmarshal(w.Body.Bytes(), &newAuthResponse)

	if newAuthResponse.AccessToken == "" {
		t.Error("Expected new access token")
	}

	if newAuthResponse.RefreshToken == "" {
		t.Error("Expected new refresh token")
	}
}

func TestMe(t *testing.T) {
	server := setupTestServer()

	// Register first
	registerBody := RegisterRequest{
		Email:     "me@example.com",
		Password:  "password123",
		FirstName: "Test",
		LastName:  "User",
	}
	jsonBody, _ := json.Marshal(registerBody)
	req := httptest.NewRequest("POST", "/auth/register", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	server.router.ServeHTTP(w, req)

	var authResponse AuthResponse
	json.Unmarshal(w.Body.Bytes(), &authResponse)

	// Get current user
	req = httptest.NewRequest("GET", "/auth/me", nil)
	req.Header.Set("Authorization", "Bearer "+authResponse.AccessToken)
	w = httptest.NewRecorder()
	server.router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var userResponse UserResponse
	json.Unmarshal(w.Body.Bytes(), &userResponse)

	if userResponse.Email != "me@example.com" {
		t.Errorf("Expected email 'me@example.com', got %s", userResponse.Email)
	}
}
