package main

import (
	"time"

	"github.com/google/uuid"
)

// User represents a user in the system
type User struct {
	ID           uuid.UUID  `json:"id"`
	DealershipID uuid.UUID  `json:"dealership_id"`
	Email        string     `json:"email"`
	Name         string     `json:"name"`
	PasswordHash string     `json:"-"` // Never serialize password hash
	Role         string     `json:"role"`
	Status       string     `json:"status"`
	Phone        *string    `json:"phone,omitempty"`
	AvatarURL    *string    `json:"avatar_url,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// CreateUserRequest represents the input for creating a user
type CreateUserRequest struct {
	DealershipID uuid.UUID `json:"dealership_id"`
	Email        string    `json:"email"`
	Name         string    `json:"name"`
	Password     string    `json:"password"` // Plain text password, will be hashed
	Role         string    `json:"role"`
	Phone        *string   `json:"phone,omitempty"`
	AvatarURL    *string   `json:"avatar_url,omitempty"`
}

// UpdateUserRequest represents the input for updating a user
type UpdateUserRequest struct {
	Name      *string `json:"name,omitempty"`
	Phone     *string `json:"phone,omitempty"`
	AvatarURL *string `json:"avatar_url,omitempty"`
}

// UserPreferences represents user preferences
type UserPreferences struct {
	UserID               uuid.UUID              `json:"user_id"`
	Theme                string                 `json:"theme"`                   // light, dark, auto
	Language             string                 `json:"language"`                // en, es, fr, etc.
	NotificationsEnabled bool                   `json:"notifications_enabled"`
	PreferencesJSON      map[string]interface{} `json:"preferences_json,omitempty"` // Additional preferences
}

// UserActivity represents a user activity log entry
type UserActivity struct {
	ID           uuid.UUID  `json:"id"`
	UserID       uuid.UUID  `json:"user_id"`
	Action       string     `json:"action"`         // login, logout, create_deal, update_vehicle, etc.
	ResourceType *string    `json:"resource_type,omitempty"` // deal, vehicle, customer, etc.
	ResourceID   *uuid.UUID `json:"resource_id,omitempty"`
	Timestamp    time.Time  `json:"timestamp"`
}

// ListUsersFilter represents filters for listing users
type ListUsersFilter struct {
	DealershipID uuid.UUID
	Role         *string
	Status       *string
}

// UserDatabase defines the interface for user database operations
type UserDatabase interface {
	// Connection management
	Close() error
	InitSchema() error

	// User CRUD operations
	CreateUser(req CreateUserRequest) (*User, error)
	GetUser(id uuid.UUID, dealershipID uuid.UUID) (*User, error)
	GetUserByEmail(email string, dealershipID uuid.UUID) (*User, error)
	ListUsers(filter ListUsersFilter) ([]User, error)
	UpdateUser(id uuid.UUID, dealershipID uuid.UUID, req UpdateUserRequest) (*User, error)
	DeleteUser(id uuid.UUID, dealershipID uuid.UUID) error // Soft delete - sets status to inactive

	// Password management
	ValidatePassword(id uuid.UUID, dealershipID uuid.UUID, password string) (bool, error)
	UpdatePassword(id uuid.UUID, dealershipID uuid.UUID, oldPassword, newPassword string) error

	// Role management
	UpdateRole(id uuid.UUID, dealershipID uuid.UUID, role string) error
	GetUsersByRole(dealershipID uuid.UUID, role string) ([]User, error)

	// Preferences
	SavePreferences(prefs UserPreferences) error
	GetPreferences(userID uuid.UUID) (*UserPreferences, error)

	// Activity logging
	LogActivity(activity UserActivity) error
	GetActivity(userID uuid.UUID, limit int) ([]UserActivity, error)
}
