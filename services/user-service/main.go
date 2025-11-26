package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"

	"autolytiq/shared/logging"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

var db UserDatabase
var logger *logging.Logger

func main() {
	// Initialize logger
	logger = logging.New(logging.Config{
		Service: "user-service",
	})

	// Get database connection string from environment
	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5432")
	dbUser := getEnv("DB_USER", "postgres")
	dbPassword := getEnv("DB_PASSWORD", "postgres")
	dbName := getEnv("DB_NAME", "autolytiq_users")

	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		dbHost, dbPort, dbUser, dbPassword, dbName)

	// Initialize database
	var err error
	db, err = NewPostgresUserDB(connStr)
	if err != nil {
		logger.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Initialize schema
	if err := db.InitSchema(); err != nil {
		logger.Fatalf("Failed to initialize schema: %v", err)
	}

	logger.Info("User service database initialized successfully")

	// Setup router
	router := mux.NewRouter()

	// Apply middleware
	router.Use(logging.RequestIDMiddleware)
	router.Use(logging.RequestLoggingMiddleware(logger))

	// Health check
	router.HandleFunc("/health", healthHandler).Methods("GET")

	// User endpoints
	router.HandleFunc("/users", createUserHandler).Methods("POST")
	router.HandleFunc("/users", listUsersHandler).Methods("GET")
	router.HandleFunc("/users/{id}", getUserHandler).Methods("GET")
	router.HandleFunc("/users/{id}", updateUserHandler).Methods("PUT")
	router.HandleFunc("/users/{id}", deleteUserHandler).Methods("DELETE")

	// Role management
	router.HandleFunc("/users/{id}/role", updateRoleHandler).Methods("PUT")

	// Password management
	router.HandleFunc("/users/{id}/password", updatePasswordHandler).Methods("POST")

	// Activity
	router.HandleFunc("/users/{id}/activity", getActivityHandler).Methods("GET")

	// Preferences
	router.HandleFunc("/users/{id}/preferences", savePreferencesHandler).Methods("PUT")
	router.HandleFunc("/users/{id}/preferences", getPreferencesHandler).Methods("GET")

	// Email validation
	router.HandleFunc("/users/validate-email", validateEmailHandler).Methods("POST")

	// Start server
	port := getEnv("PORT", "8080")
	logger.Infof("User service listening on port %s", port)
	if err := http.ListenAndServe(":"+port, router); err != nil {
		logger.Fatal(err.Error())
	}
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

// Response helpers

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}

// Handlers

func healthHandler(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]string{"status": "healthy"})
}

func createUserHandler(w http.ResponseWriter, r *http.Request) {
	var req CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	user, err := db.CreateUser(req)
	if err != nil {
		logger.WithContext(r.Context()).WithError(err).Error("Failed to create user")
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Log activity
	_ = db.LogActivity(UserActivity{
		UserID: user.ID,
		Action: "user_created",
	})

	logger.WithContext(r.Context()).WithField("user_id", user.ID).Info("User created")
	respondJSON(w, http.StatusCreated, user)
}

func listUsersHandler(w http.ResponseWriter, r *http.Request) {
	dealershipIDStr := r.URL.Query().Get("dealership_id")
	if dealershipIDStr == "" {
		respondError(w, http.StatusBadRequest, "dealership_id is required")
		return
	}

	dealershipID, err := uuid.Parse(dealershipIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid dealership_id")
		return
	}

	filter := ListUsersFilter{
		DealershipID: dealershipID,
	}

	// Optional filters
	if role := r.URL.Query().Get("role"); role != "" {
		filter.Role = &role
	}
	if status := r.URL.Query().Get("status"); status != "" {
		filter.Status = &status
	}

	users, err := db.ListUsers(filter)
	if err != nil {
		logger.WithContext(r.Context()).WithError(err).Error("Failed to list users")
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, users)
}

func getUserHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := uuid.Parse(vars["id"])
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	dealershipIDStr := r.URL.Query().Get("dealership_id")
	if dealershipIDStr == "" {
		respondError(w, http.StatusBadRequest, "dealership_id is required")
		return
	}

	dealershipID, err := uuid.Parse(dealershipIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid dealership_id")
		return
	}

	user, err := db.GetUser(id, dealershipID)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, user)
}

func updateUserHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := uuid.Parse(vars["id"])
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	dealershipIDStr := r.URL.Query().Get("dealership_id")
	if dealershipIDStr == "" {
		respondError(w, http.StatusBadRequest, "dealership_id is required")
		return
	}

	dealershipID, err := uuid.Parse(dealershipIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid dealership_id")
		return
	}

	var req UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	user, err := db.UpdateUser(id, dealershipID, req)
	if err != nil {
		logger.WithContext(r.Context()).WithError(err).Error("Failed to update user")
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Log activity
	_ = db.LogActivity(UserActivity{
		UserID: id,
		Action: "user_updated",
	})

	logger.WithContext(r.Context()).WithField("user_id", id).Info("User updated")
	respondJSON(w, http.StatusOK, user)
}

func deleteUserHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := uuid.Parse(vars["id"])
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	dealershipIDStr := r.URL.Query().Get("dealership_id")
	if dealershipIDStr == "" {
		respondError(w, http.StatusBadRequest, "dealership_id is required")
		return
	}

	dealershipID, err := uuid.Parse(dealershipIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid dealership_id")
		return
	}

	if err := db.DeleteUser(id, dealershipID); err != nil {
		logger.WithContext(r.Context()).WithError(err).Error("Failed to delete user")
		respondError(w, http.StatusNotFound, err.Error())
		return
	}

	// Log activity
	_ = db.LogActivity(UserActivity{
		UserID: id,
		Action: "user_deleted",
	})

	logger.WithContext(r.Context()).WithField("user_id", id).Info("User deleted")
	respondJSON(w, http.StatusOK, map[string]string{"message": "User deactivated successfully"})
}

func updateRoleHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := uuid.Parse(vars["id"])
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	dealershipIDStr := r.URL.Query().Get("dealership_id")
	if dealershipIDStr == "" {
		respondError(w, http.StatusBadRequest, "dealership_id is required")
		return
	}

	dealershipID, err := uuid.Parse(dealershipIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid dealership_id")
		return
	}

	var req struct {
		Role string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := db.UpdateRole(id, dealershipID, req.Role); err != nil {
		logger.WithContext(r.Context()).WithError(err).Error("Failed to update role")
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Log activity
	_ = db.LogActivity(UserActivity{
		UserID: id,
		Action: "role_updated",
	})

	logger.WithContext(r.Context()).WithField("user_id", id).Info("User role updated")
	user, _ := db.GetUser(id, dealershipID)
	respondJSON(w, http.StatusOK, user)
}

func updatePasswordHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := uuid.Parse(vars["id"])
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	dealershipIDStr := r.URL.Query().Get("dealership_id")
	if dealershipIDStr == "" {
		respondError(w, http.StatusBadRequest, "dealership_id is required")
		return
	}

	dealershipID, err := uuid.Parse(dealershipIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid dealership_id")
		return
	}

	var req struct {
		OldPassword string `json:"old_password"`
		NewPassword string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := db.UpdatePassword(id, dealershipID, req.OldPassword, req.NewPassword); err != nil {
		logger.WithContext(r.Context()).WithError(err).Error("Failed to update password")
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Log activity
	_ = db.LogActivity(UserActivity{
		UserID: id,
		Action: "password_changed",
	})

	logger.WithContext(r.Context()).WithField("user_id", id).Info("User password changed")
	respondJSON(w, http.StatusOK, map[string]string{"message": "Password updated successfully"})
}

func getActivityHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := uuid.Parse(vars["id"])
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	limit := 100
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	activities, err := db.GetActivity(id, limit)
	if err != nil {
		logger.WithContext(r.Context()).WithError(err).Error("Failed to get activity")
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, activities)
}

func savePreferencesHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := uuid.Parse(vars["id"])
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	var prefs UserPreferences
	if err := json.NewDecoder(r.Body).Decode(&prefs); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	prefs.UserID = id

	if err := db.SavePreferences(prefs); err != nil {
		logger.WithContext(r.Context()).WithError(err).Error("Failed to save preferences")
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	logger.WithContext(r.Context()).WithField("user_id", id).Info("User preferences saved")
	respondJSON(w, http.StatusOK, prefs)
}

func getPreferencesHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := uuid.Parse(vars["id"])
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	prefs, err := db.GetPreferences(id)
	if err != nil {
		logger.WithContext(r.Context()).WithError(err).Error("Failed to get preferences")
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, prefs)
}

func validateEmailHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email        string    `json:"email"`
		DealershipID uuid.UUID `json:"dealership_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	user, err := db.GetUserByEmail(req.Email, req.DealershipID)
	exists := err == nil && user != nil

	respondJSON(w, http.StatusOK, map[string]bool{"exists": exists})
}
