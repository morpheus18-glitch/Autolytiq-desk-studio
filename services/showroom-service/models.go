package main

import (
	"encoding/json"
	"time"
)

// Visit represents a showroom visit/check-in
type Visit struct {
	ID            string     `json:"id"`
	DealershipID  string     `json:"dealership_id"`
	CustomerID    string     `json:"customer_id"`
	SalespersonID *string    `json:"salesperson_id,omitempty"`
	VehicleID     *string    `json:"vehicle_id,omitempty"`
	StockNumber   *string    `json:"stock_number,omitempty"`
	CheckInTime   time.Time  `json:"check_in_time"`
	CheckOutTime  *time.Time `json:"check_out_time,omitempty"`
	Status        string     `json:"status"`
	WorkflowStage int        `json:"workflow_stage"`
	Source        *string    `json:"source,omitempty"`
	AppointmentID *string    `json:"appointment_id,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`

	// Joined data
	Customer    *CustomerInfo `json:"customer,omitempty"`
	Salesperson *UserInfo     `json:"salesperson,omitempty"`
	Vehicle     *VehicleInfo  `json:"vehicle,omitempty"`
	Timers      []Timer       `json:"timers,omitempty"`
	Notes       []Note        `json:"notes,omitempty"`
	ActiveTimer *Timer        `json:"active_timer,omitempty"`
}

// CustomerInfo is a subset of customer data for display
type CustomerInfo struct {
	ID        string  `json:"id"`
	FirstName string  `json:"first_name"`
	LastName  string  `json:"last_name"`
	Email     *string `json:"email,omitempty"`
	Phone     *string `json:"phone,omitempty"`
}

// UserInfo is a subset of user data for display
type UserInfo struct {
	ID        string `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
}

// VehicleInfo is a subset of vehicle data for display
type VehicleInfo struct {
	ID            string  `json:"id"`
	StockNumber   *string `json:"stock_number,omitempty"`
	Year          int     `json:"year"`
	Make          string  `json:"make"`
	Model         string  `json:"model"`
	Trim          *string `json:"trim,omitempty"`
	ExteriorColor *string `json:"exterior_color,omitempty"`
	ListPrice     float64 `json:"list_price"`
}

// Timer represents an activity timer within a visit
type Timer struct {
	ID              string     `json:"id"`
	VisitID         string     `json:"visit_id"`
	TimerType       string     `json:"timer_type"`
	StartTime       time.Time  `json:"start_time"`
	EndTime         *time.Time `json:"end_time,omitempty"`
	DurationSeconds *int64     `json:"duration_seconds,omitempty"`
	StartedBy       *string    `json:"started_by,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
}

// Note represents a note on a visit
type Note struct {
	ID          string    `json:"id"`
	VisitID     string    `json:"visit_id"`
	CreatedByID string    `json:"created_by_id"`
	CreatedBy   *UserInfo `json:"created_by,omitempty"`
	Content     string    `json:"content"`
	IsPinned    bool      `json:"is_pinned"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Event represents an audit trail entry
type Event struct {
	ID            string          `json:"id"`
	VisitID       string          `json:"visit_id"`
	EventType     string          `json:"event_type"`
	UserID        *string         `json:"user_id,omitempty"`
	PreviousValue *string         `json:"previous_value,omitempty"`
	NewValue      *string         `json:"new_value,omitempty"`
	Metadata      json.RawMessage `json:"metadata,omitempty"`
	CreatedAt     time.Time       `json:"created_at"`
}

// WorkflowConfig represents workflow configuration
type WorkflowConfig struct {
	ID           string          `json:"id"`
	DealershipID *string         `json:"dealership_id,omitempty"`
	Name         string          `json:"name"`
	Stages       json.RawMessage `json:"stages"`
	AutoTriggers json.RawMessage `json:"auto_triggers"`
	IsDefault    bool            `json:"is_default"`
	CreatedAt    time.Time       `json:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at"`
}

// WorkflowStage represents a single stage in the workflow
type WorkflowStage struct {
	Order int    `json:"order"`
	Name  string `json:"name"`
	Label string `json:"label"`
	Color string `json:"color"`
}

// AutoTrigger represents an automatic trigger configuration
type AutoTrigger struct {
	FromStatus   string  `json:"from_status"`
	AfterMinutes int     `json:"after_minutes"`
	Action       string  `json:"action"`
	NotifyRole   *string `json:"notify_role,omitempty"`
}

// Request/Response types

// CreateVisitRequest is the request body for creating a visit
type CreateVisitRequest struct {
	CustomerID    string  `json:"customer_id"`
	SalespersonID *string `json:"salesperson_id,omitempty"`
	VehicleID     *string `json:"vehicle_id,omitempty"`
	StockNumber   *string `json:"stock_number,omitempty"`
	Source        *string `json:"source,omitempty"`
	InitialNote   *string `json:"initial_note,omitempty"`
}

// UpdateVisitRequest is the request body for updating a visit
type UpdateVisitRequest struct {
	SalespersonID *string `json:"salesperson_id,omitempty"`
	VehicleID     *string `json:"vehicle_id,omitempty"`
	StockNumber   *string `json:"stock_number,omitempty"`
}

// ChangeStatusRequest is the request body for changing visit status
type ChangeStatusRequest struct {
	Status string `json:"status"`
}

// AttachVehicleRequest is the request body for attaching a vehicle
type AttachVehicleRequest struct {
	VehicleID   string  `json:"vehicle_id"`
	StockNumber *string `json:"stock_number,omitempty"`
}

// StartTimerRequest is the request body for starting a timer
type StartTimerRequest struct {
	TimerType string `json:"timer_type"`
}

// CreateNoteRequest is the request body for creating a note
type CreateNoteRequest struct {
	Content  string `json:"content"`
	IsPinned bool   `json:"is_pinned"`
}

// UpdateNoteRequest is the request body for updating a note
type UpdateNoteRequest struct {
	Content  *string `json:"content,omitempty"`
	IsPinned *bool   `json:"is_pinned,omitempty"`
}

// VisitsResponse is the response for listing visits
type VisitsResponse struct {
	Visits []Visit `json:"visits"`
	Total  int     `json:"total"`
}

// Valid visit statuses
var ValidStatuses = []string{
	"CHECKED_IN",
	"BROWSING",
	"TEST_DRIVE",
	"NEGOTIATING",
	"PAPERWORK",
	"CLOSED_WON",
	"CLOSED_LOST",
}

// Valid timer types
var ValidTimerTypes = []string{
	"WAIT_TIME",
	"TEST_DRIVE",
	"NEGOTIATION",
	"PAPERWORK",
	"MANAGER_WAIT",
}

// Valid visit sources
var ValidSources = []string{
	"WALK_IN",
	"APPOINTMENT",
	"INTERNET",
	"PHONE",
	"REFERRAL",
}

// IsValidStatus checks if a status is valid
func IsValidStatus(status string) bool {
	for _, s := range ValidStatuses {
		if s == status {
			return true
		}
	}
	return false
}

// IsValidTimerType checks if a timer type is valid
func IsValidTimerType(timerType string) bool {
	for _, t := range ValidTimerTypes {
		if t == timerType {
			return true
		}
	}
	return false
}

// IsClosedStatus checks if a status represents a closed visit
func IsClosedStatus(status string) bool {
	return status == "CLOSED_WON" || status == "CLOSED_LOST"
}
