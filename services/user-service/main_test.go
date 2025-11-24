package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// MockDatabase implements UserDatabase for testing
type MockDatabase struct {
	users        map[uuid.UUID]*User
	preferences  map[uuid.UUID]*UserPreferences
	activities   map[uuid.UUID][]UserActivity
	emailIndex   map[string]uuid.UUID // email -> user ID
}

func NewMockDatabase() *MockDatabase {
	return &MockDatabase{
		users:       make(map[uuid.UUID]*User),
		preferences: make(map[uuid.UUID]*UserPreferences),
		activities:  make(map[uuid.UUID][]UserActivity),
		emailIndex:  make(map[string]uuid.UUID),
	}
}

func (m *MockDatabase) Close() error {
	return nil
}

func (m *MockDatabase) InitSchema() error {
	return nil
}

func (m *MockDatabase) CreateUser(req CreateUserRequest) (*User, error) {
	if req.Email == "" {
		return nil, fmt.Errorf("email is required")
	}
	if req.Password == "" {
		return nil, fmt.Errorf("password is required")
	}
	if !IsValidRole(req.Role) {
		return nil, fmt.Errorf("invalid role: %s", req.Role)
	}

	// Check duplicate email
	key := fmt.Sprintf("%s:%s", req.DealershipID, req.Email)
	if _, exists := m.emailIndex[key]; exists {
		return nil, fmt.Errorf("email already exists")
	}

	passwordHash, err := hashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	user := &User{
		ID:           uuid.New(),
		DealershipID: req.DealershipID,
		Email:        req.Email,
		Name:         req.Name,
		PasswordHash: passwordHash,
		Role:         req.Role,
		Status:       "active",
		Phone:        req.Phone,
		AvatarURL:    req.AvatarURL,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	m.users[user.ID] = user
	m.emailIndex[key] = user.ID

	// Initialize default preferences
	m.preferences[user.ID] = &UserPreferences{
		UserID:               user.ID,
		Theme:                "light",
		Language:             "en",
		NotificationsEnabled: true,
	}

	return user, nil
}

func (m *MockDatabase) GetUser(id uuid.UUID, dealershipID uuid.UUID) (*User, error) {
	user, exists := m.users[id]
	if !exists || user.DealershipID != dealershipID {
		return nil, fmt.Errorf("user not found")
	}
	return user, nil
}

func (m *MockDatabase) GetUserByEmail(email string, dealershipID uuid.UUID) (*User, error) {
	key := fmt.Sprintf("%s:%s", dealershipID, email)
	userID, exists := m.emailIndex[key]
	if !exists {
		return nil, fmt.Errorf("user not found")
	}
	return m.users[userID], nil
}

func (m *MockDatabase) ListUsers(filter ListUsersFilter) ([]User, error) {
	var users []User
	for _, user := range m.users {
		if user.DealershipID != filter.DealershipID {
			continue
		}
		if filter.Role != nil && user.Role != *filter.Role {
			continue
		}
		if filter.Status != nil && user.Status != *filter.Status {
			continue
		}
		users = append(users, *user)
	}
	return users, nil
}

func (m *MockDatabase) UpdateUser(id uuid.UUID, dealershipID uuid.UUID, req UpdateUserRequest) (*User, error) {
	user, exists := m.users[id]
	if !exists || user.DealershipID != dealershipID {
		return nil, fmt.Errorf("user not found")
	}

	if req.Name != nil {
		user.Name = *req.Name
	}
	if req.Phone != nil {
		user.Phone = req.Phone
	}
	if req.AvatarURL != nil {
		user.AvatarURL = req.AvatarURL
	}
	user.UpdatedAt = time.Now()

	return user, nil
}

func (m *MockDatabase) DeleteUser(id uuid.UUID, dealershipID uuid.UUID) error {
	user, exists := m.users[id]
	if !exists || user.DealershipID != dealershipID {
		return fmt.Errorf("user not found")
	}
	user.Status = "inactive"
	user.UpdatedAt = time.Now()
	return nil
}

func (m *MockDatabase) ValidatePassword(id uuid.UUID, dealershipID uuid.UUID, password string) (bool, error) {
	user, exists := m.users[id]
	if !exists || user.DealershipID != dealershipID {
		return false, fmt.Errorf("user not found")
	}
	return verifyPassword(user.PasswordHash, password), nil
}

func (m *MockDatabase) UpdatePassword(id uuid.UUID, dealershipID uuid.UUID, oldPassword, newPassword string) error {
	valid, err := m.ValidatePassword(id, dealershipID, oldPassword)
	if err != nil {
		return err
	}
	if !valid {
		return fmt.Errorf("invalid old password")
	}

	passwordHash, err := hashPassword(newPassword)
	if err != nil {
		return err
	}

	user := m.users[id]
	user.PasswordHash = passwordHash
	user.UpdatedAt = time.Now()
	return nil
}

func (m *MockDatabase) UpdateRole(id uuid.UUID, dealershipID uuid.UUID, role string) error {
	if !IsValidRole(role) {
		return fmt.Errorf("invalid role: %s", role)
	}

	user, exists := m.users[id]
	if !exists || user.DealershipID != dealershipID {
		return fmt.Errorf("user not found")
	}

	user.Role = role
	user.UpdatedAt = time.Now()
	return nil
}

func (m *MockDatabase) GetUsersByRole(dealershipID uuid.UUID, role string) ([]User, error) {
	filter := ListUsersFilter{
		DealershipID: dealershipID,
		Role:         &role,
	}
	return m.ListUsers(filter)
}

func (m *MockDatabase) SavePreferences(prefs UserPreferences) error {
	m.preferences[prefs.UserID] = &prefs
	return nil
}

func (m *MockDatabase) GetPreferences(userID uuid.UUID) (*UserPreferences, error) {
	prefs, exists := m.preferences[userID]
	if !exists {
		return &UserPreferences{
			UserID:               userID,
			Theme:                "light",
			Language:             "en",
			NotificationsEnabled: true,
		}, nil
	}
	return prefs, nil
}

func (m *MockDatabase) LogActivity(activity UserActivity) error {
	if activity.ID == uuid.Nil {
		activity.ID = uuid.New()
	}
	if activity.Timestamp.IsZero() {
		activity.Timestamp = time.Now()
	}
	m.activities[activity.UserID] = append(m.activities[activity.UserID], activity)
	return nil
}

func (m *MockDatabase) GetActivity(userID uuid.UUID, limit int) ([]UserActivity, error) {
	activities := m.activities[userID]
	if len(activities) > limit {
		activities = activities[:limit]
	}
	return activities, nil
}

// Test setup

func setupTest() (*mux.Router, *MockDatabase) {
	mockDB := NewMockDatabase()
	db = mockDB

	router := mux.NewRouter()
	router.HandleFunc("/health", healthHandler).Methods("GET")
	router.HandleFunc("/users", createUserHandler).Methods("POST")
	router.HandleFunc("/users", listUsersHandler).Methods("GET")
	router.HandleFunc("/users/{id}", getUserHandler).Methods("GET")
	router.HandleFunc("/users/{id}", updateUserHandler).Methods("PUT")
	router.HandleFunc("/users/{id}", deleteUserHandler).Methods("DELETE")
	router.HandleFunc("/users/{id}/role", updateRoleHandler).Methods("PUT")
	router.HandleFunc("/users/{id}/password", updatePasswordHandler).Methods("POST")
	router.HandleFunc("/users/{id}/activity", getActivityHandler).Methods("GET")
	router.HandleFunc("/users/{id}/preferences", savePreferencesHandler).Methods("PUT")
	router.HandleFunc("/users/{id}/preferences", getPreferencesHandler).Methods("GET")
	router.HandleFunc("/users/validate-email", validateEmailHandler).Methods("POST")

	return router, mockDB
}

// Tests

func TestHealthCheck(t *testing.T) {
	router, _ := setupTest()

	req, _ := http.NewRequest("GET", "/health", nil)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", rr.Code)
	}

	var response map[string]string
	json.NewDecoder(rr.Body).Decode(&response)
	if response["status"] != "healthy" {
		t.Errorf("Expected status healthy, got %s", response["status"])
	}
}

func TestCreateUser(t *testing.T) {
	router, _ := setupTest()

	dealershipID := uuid.New()
	reqBody := CreateUserRequest{
		DealershipID: dealershipID,
		Email:        "test@example.com",
		Name:         "Test User",
		Password:     "password123",
		Role:         RoleAdmin,
	}

	body, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest("POST", "/users", bytes.NewBuffer(body))
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusCreated {
		t.Errorf("Expected status 201, got %d", rr.Code)
	}

	var user User
	json.NewDecoder(rr.Body).Decode(&user)
	if user.Email != reqBody.Email {
		t.Errorf("Expected email %s, got %s", reqBody.Email, user.Email)
	}
	if user.Role != reqBody.Role {
		t.Errorf("Expected role %s, got %s", reqBody.Role, user.Role)
	}
	if user.Status != "active" {
		t.Errorf("Expected status active, got %s", user.Status)
	}
}

func TestCreateUserInvalidRole(t *testing.T) {
	router, _ := setupTest()

	dealershipID := uuid.New()
	reqBody := CreateUserRequest{
		DealershipID: dealershipID,
		Email:        "test@example.com",
		Name:         "Test User",
		Password:     "password123",
		Role:         "invalid_role",
	}

	body, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest("POST", "/users", bytes.NewBuffer(body))
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400, got %d", rr.Code)
	}
}

func TestCreateUserShortPassword(t *testing.T) {
	router, _ := setupTest()

	dealershipID := uuid.New()
	reqBody := CreateUserRequest{
		DealershipID: dealershipID,
		Email:        "test@example.com",
		Name:         "Test User",
		Password:     "short",
		Role:         RoleAdmin,
	}

	body, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest("POST", "/users", bytes.NewBuffer(body))
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400, got %d", rr.Code)
	}
}

func TestGetUser(t *testing.T) {
	router, mockDB := setupTest()

	dealershipID := uuid.New()
	user, _ := mockDB.CreateUser(CreateUserRequest{
		DealershipID: dealershipID,
		Email:        "test@example.com",
		Name:         "Test User",
		Password:     "password123",
		Role:         RoleAdmin,
	})

	url := fmt.Sprintf("/users/%s?dealership_id=%s", user.ID, dealershipID)
	req, _ := http.NewRequest("GET", url, nil)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", rr.Code)
	}

	var fetchedUser User
	json.NewDecoder(rr.Body).Decode(&fetchedUser)
	if fetchedUser.ID != user.ID {
		t.Errorf("Expected user ID %s, got %s", user.ID, fetchedUser.ID)
	}
}

func TestListUsers(t *testing.T) {
	router, mockDB := setupTest()

	dealershipID := uuid.New()
	mockDB.CreateUser(CreateUserRequest{
		DealershipID: dealershipID,
		Email:        "admin@example.com",
		Name:         "Admin User",
		Password:     "password123",
		Role:         RoleAdmin,
	})
	mockDB.CreateUser(CreateUserRequest{
		DealershipID: dealershipID,
		Email:        "manager@example.com",
		Name:         "Manager User",
		Password:     "password123",
		Role:         RoleManager,
	})

	url := fmt.Sprintf("/users?dealership_id=%s", dealershipID)
	req, _ := http.NewRequest("GET", url, nil)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", rr.Code)
	}

	var users []User
	json.NewDecoder(rr.Body).Decode(&users)
	if len(users) != 2 {
		t.Errorf("Expected 2 users, got %d", len(users))
	}
}

func TestListUsersByRole(t *testing.T) {
	router, mockDB := setupTest()

	dealershipID := uuid.New()
	mockDB.CreateUser(CreateUserRequest{
		DealershipID: dealershipID,
		Email:        "admin@example.com",
		Name:         "Admin User",
		Password:     "password123",
		Role:         RoleAdmin,
	})
	mockDB.CreateUser(CreateUserRequest{
		DealershipID: dealershipID,
		Email:        "manager@example.com",
		Name:         "Manager User",
		Password:     "password123",
		Role:         RoleManager,
	})

	url := fmt.Sprintf("/users?dealership_id=%s&role=%s", dealershipID, RoleAdmin)
	req, _ := http.NewRequest("GET", url, nil)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", rr.Code)
	}

	var users []User
	json.NewDecoder(rr.Body).Decode(&users)
	if len(users) != 1 {
		t.Errorf("Expected 1 user, got %d", len(users))
	}
	if users[0].Role != RoleAdmin {
		t.Errorf("Expected role %s, got %s", RoleAdmin, users[0].Role)
	}
}

func TestUpdateUser(t *testing.T) {
	router, mockDB := setupTest()

	dealershipID := uuid.New()
	user, _ := mockDB.CreateUser(CreateUserRequest{
		DealershipID: dealershipID,
		Email:        "test@example.com",
		Name:         "Test User",
		Password:     "password123",
		Role:         RoleAdmin,
	})

	newName := "Updated User"
	reqBody := UpdateUserRequest{
		Name: &newName,
	}

	body, _ := json.Marshal(reqBody)
	url := fmt.Sprintf("/users/%s?dealership_id=%s", user.ID, dealershipID)
	req, _ := http.NewRequest("PUT", url, bytes.NewBuffer(body))
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", rr.Code)
	}

	var updatedUser User
	json.NewDecoder(rr.Body).Decode(&updatedUser)
	if updatedUser.Name != newName {
		t.Errorf("Expected name %s, got %s", newName, updatedUser.Name)
	}
}

func TestDeleteUser(t *testing.T) {
	router, mockDB := setupTest()

	dealershipID := uuid.New()
	user, _ := mockDB.CreateUser(CreateUserRequest{
		DealershipID: dealershipID,
		Email:        "test@example.com",
		Name:         "Test User",
		Password:     "password123",
		Role:         RoleAdmin,
	})

	url := fmt.Sprintf("/users/%s?dealership_id=%s", user.ID, dealershipID)
	req, _ := http.NewRequest("DELETE", url, nil)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", rr.Code)
	}

	// Verify user is inactive
	fetchedUser, _ := mockDB.GetUser(user.ID, dealershipID)
	if fetchedUser.Status != "inactive" {
		t.Errorf("Expected status inactive, got %s", fetchedUser.Status)
	}
}

func TestUpdateRole(t *testing.T) {
	router, mockDB := setupTest()

	dealershipID := uuid.New()
	user, _ := mockDB.CreateUser(CreateUserRequest{
		DealershipID: dealershipID,
		Email:        "test@example.com",
		Name:         "Test User",
		Password:     "password123",
		Role:         RoleSalesperson,
	})

	reqBody := map[string]string{"role": RoleManager}
	body, _ := json.Marshal(reqBody)
	url := fmt.Sprintf("/users/%s/role?dealership_id=%s", user.ID, dealershipID)
	req, _ := http.NewRequest("PUT", url, bytes.NewBuffer(body))
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", rr.Code)
	}

	var updatedUser User
	json.NewDecoder(rr.Body).Decode(&updatedUser)
	if updatedUser.Role != RoleManager {
		t.Errorf("Expected role %s, got %s", RoleManager, updatedUser.Role)
	}
}

func TestUpdatePassword(t *testing.T) {
	router, mockDB := setupTest()

	dealershipID := uuid.New()
	oldPassword := "password123"
	newPassword := "newpassword123"

	user, _ := mockDB.CreateUser(CreateUserRequest{
		DealershipID: dealershipID,
		Email:        "test@example.com",
		Name:         "Test User",
		Password:     oldPassword,
		Role:         RoleAdmin,
	})

	reqBody := map[string]string{
		"old_password": oldPassword,
		"new_password": newPassword,
	}
	body, _ := json.Marshal(reqBody)
	url := fmt.Sprintf("/users/%s/password?dealership_id=%s", user.ID, dealershipID)
	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(body))
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", rr.Code)
	}

	// Verify new password works
	valid, _ := mockDB.ValidatePassword(user.ID, dealershipID, newPassword)
	if !valid {
		t.Error("New password should be valid")
	}

	// Verify old password doesn't work
	valid, _ = mockDB.ValidatePassword(user.ID, dealershipID, oldPassword)
	if valid {
		t.Error("Old password should not be valid")
	}
}

func TestUpdatePasswordInvalidOldPassword(t *testing.T) {
	router, mockDB := setupTest()

	dealershipID := uuid.New()
	user, _ := mockDB.CreateUser(CreateUserRequest{
		DealershipID: dealershipID,
		Email:        "test@example.com",
		Name:         "Test User",
		Password:     "password123",
		Role:         RoleAdmin,
	})

	reqBody := map[string]string{
		"old_password": "wrongpassword",
		"new_password": "newpassword123",
	}
	body, _ := json.Marshal(reqBody)
	url := fmt.Sprintf("/users/%s/password?dealership_id=%s", user.ID, dealershipID)
	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(body))
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400, got %d", rr.Code)
	}
}

func TestSaveAndGetPreferences(t *testing.T) {
	router, mockDB := setupTest()

	dealershipID := uuid.New()
	user, _ := mockDB.CreateUser(CreateUserRequest{
		DealershipID: dealershipID,
		Email:        "test@example.com",
		Name:         "Test User",
		Password:     "password123",
		Role:         RoleAdmin,
	})

	prefs := UserPreferences{
		UserID:               user.ID,
		Theme:                "dark",
		Language:             "es",
		NotificationsEnabled: false,
		PreferencesJSON: map[string]interface{}{
			"dashboard_layout": "compact",
		},
	}

	body, _ := json.Marshal(prefs)
	url := fmt.Sprintf("/users/%s/preferences", user.ID)
	req, _ := http.NewRequest("PUT", url, bytes.NewBuffer(body))
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", rr.Code)
	}

	// Get preferences
	req, _ = http.NewRequest("GET", url, nil)
	rr = httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", rr.Code)
	}

	var fetchedPrefs UserPreferences
	json.NewDecoder(rr.Body).Decode(&fetchedPrefs)
	if fetchedPrefs.Theme != "dark" {
		t.Errorf("Expected theme dark, got %s", fetchedPrefs.Theme)
	}
	if fetchedPrefs.Language != "es" {
		t.Errorf("Expected language es, got %s", fetchedPrefs.Language)
	}
}

func TestLogAndGetActivity(t *testing.T) {
	router, mockDB := setupTest()

	dealershipID := uuid.New()
	user, _ := mockDB.CreateUser(CreateUserRequest{
		DealershipID: dealershipID,
		Email:        "test@example.com",
		Name:         "Test User",
		Password:     "password123",
		Role:         RoleAdmin,
	})

	// Log activities
	resourceID := uuid.New()
	mockDB.LogActivity(UserActivity{
		UserID:       user.ID,
		Action:       "login",
	})
	mockDB.LogActivity(UserActivity{
		UserID:       user.ID,
		Action:       "create_deal",
		ResourceType: strPtr("deal"),
		ResourceID:   &resourceID,
	})

	// Get activity
	url := fmt.Sprintf("/users/%s/activity", user.ID)
	req, _ := http.NewRequest("GET", url, nil)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", rr.Code)
	}

	var activities []UserActivity
	json.NewDecoder(rr.Body).Decode(&activities)
	if len(activities) != 2 {
		t.Errorf("Expected 2 activities, got %d", len(activities))
	}
}

func TestValidateEmail(t *testing.T) {
	router, mockDB := setupTest()

	dealershipID := uuid.New()
	mockDB.CreateUser(CreateUserRequest{
		DealershipID: dealershipID,
		Email:        "existing@example.com",
		Name:         "Test User",
		Password:     "password123",
		Role:         RoleAdmin,
	})

	// Test existing email
	reqBody := map[string]interface{}{
		"email":         "existing@example.com",
		"dealership_id": dealershipID,
	}
	body, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest("POST", "/users/validate-email", bytes.NewBuffer(body))
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", rr.Code)
	}

	var response map[string]bool
	json.NewDecoder(rr.Body).Decode(&response)
	if !response["exists"] {
		t.Error("Expected email to exist")
	}

	// Test non-existing email
	reqBody["email"] = "notexist@example.com"
	body, _ = json.Marshal(reqBody)
	req, _ = http.NewRequest("POST", "/users/validate-email", bytes.NewBuffer(body))
	rr = httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	json.NewDecoder(rr.Body).Decode(&response)
	if response["exists"] {
		t.Error("Expected email to not exist")
	}
}

func TestMultiTenantIsolation(t *testing.T) {
	router, mockDB := setupTest()

	dealership1 := uuid.New()
	dealership2 := uuid.New()

	user1, _ := mockDB.CreateUser(CreateUserRequest{
		DealershipID: dealership1,
		Email:        "user1@example.com",
		Name:         "User 1",
		Password:     "password123",
		Role:         RoleAdmin,
	})

	user2, _ := mockDB.CreateUser(CreateUserRequest{
		DealershipID: dealership2,
		Email:        "user2@example.com",
		Name:         "User 2",
		Password:     "password123",
		Role:         RoleAdmin,
	})

	// Try to get user1 with dealership2 ID (should fail)
	url := fmt.Sprintf("/users/%s?dealership_id=%s", user1.ID, dealership2)
	req, _ := http.NewRequest("GET", url, nil)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Errorf("Expected status 404, got %d", rr.Code)
	}

	// Try to get user2 with dealership2 ID (should succeed)
	url = fmt.Sprintf("/users/%s?dealership_id=%s", user2.ID, dealership2)
	req, _ = http.NewRequest("GET", url, nil)
	rr = httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", rr.Code)
	}
}

func TestRolePermissions(t *testing.T) {
	// Test role permissions
	if !HasPermission(RoleAdmin, PermissionManageUsers) {
		t.Error("Admin should have manage_users permission")
	}

	if HasPermission(RoleSalesperson, PermissionManageUsers) {
		t.Error("Salesperson should not have manage_users permission")
	}

	if !HasPermission(RoleManager, PermissionViewAll) {
		t.Error("Manager should have view_all permission")
	}

	if !HasPermission(RoleSalesperson, PermissionViewOwn) {
		t.Error("Salesperson should have view_own permission")
	}
}

// Helper functions

func strPtr(s string) *string {
	return &s
}
