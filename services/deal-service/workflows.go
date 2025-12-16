package main

import (
	"fmt"
	"time"
)

// ============================================================================
// Deal Status
// ============================================================================

// DealStatus represents the current state of a deal
type DealStatus string

const (
	StatusDraft       DealStatus = "draft"        // Initial creation, editable
	StatusPending     DealStatus = "pending"      // Submitted for approval
	StatusApproved    DealStatus = "approved"     // Approved, ready for funding
	StatusFunded      DealStatus = "funded"       // Funded by lender
	StatusContracting DealStatus = "contracting"  // Signing documents
	StatusDelivered   DealStatus = "delivered"    // Vehicle delivered
	StatusUnwound     DealStatus = "unwound"      // Deal reversed
	StatusCancelled   DealStatus = "cancelled"    // Deal cancelled
)

// ============================================================================
// State Machine
// ============================================================================

// validTransitions defines allowed status transitions
var validTransitions = map[DealStatus][]DealStatus{
	StatusDraft:       {StatusPending, StatusCancelled},
	StatusPending:     {StatusApproved, StatusDraft, StatusCancelled},
	StatusApproved:    {StatusFunded, StatusPending, StatusCancelled},
	StatusFunded:      {StatusContracting, StatusUnwound},
	StatusContracting: {StatusDelivered, StatusUnwound},
	StatusDelivered:   {StatusUnwound},           // Terminal state (can only unwind)
	StatusUnwound:     {},                        // Terminal state
	StatusCancelled:   {},                        // Terminal state
}

// IsValidTransition checks if a status transition is allowed
func IsValidTransition(from, to DealStatus) bool {
	allowed, exists := validTransitions[from]
	if !exists {
		return false
	}

	for _, s := range allowed {
		if s == to {
			return true
		}
	}
	return false
}

// CanTransition checks if a deal can transition to a new status
func CanTransition(deal *Deal, newStatus DealStatus) error {
	currentStatus := DealStatus(deal.Status)

	if !IsValidTransition(currentStatus, newStatus) {
		return fmt.Errorf("invalid transition from %s to %s", currentStatus, newStatus)
	}

	// Additional validation based on target status
	switch newStatus {
	case StatusPending:
		return validateForPending(deal)
	case StatusApproved:
		return validateForApproval(deal)
	case StatusFunded:
		return validateForFunding(deal)
	case StatusDelivered:
		return validateForDelivery(deal)
	}

	return nil
}

// ============================================================================
// Transition Validators
// ============================================================================

func validateForPending(deal *Deal) error {
	if deal.CustomerID == nil || *deal.CustomerID == "" {
		return fmt.Errorf("customer is required to submit deal")
	}
	// Note: VehiclePrice is stored in scenarios, not on the deal itself
	return nil
}

func validateForApproval(deal *Deal) error {
	// In a real system, this would check:
	// - Credit decision received
	// - Required documents uploaded
	// - Pricing approved by manager
	return nil
}

func validateForFunding(deal *Deal) error {
	// In a real system, this would check:
	// - Lender funding confirmed
	// - All contracts signed
	return nil
}

func validateForDelivery(deal *Deal) error {
	// In a real system, this would check:
	// - Vehicle inspected
	// - All payments received
	// - Documents complete
	return nil
}

// ============================================================================
// Workflow Events
// ============================================================================

// DealEvent represents a workflow event
type DealEvent struct {
	ID         string      `json:"id"`
	DealID     string      `json:"deal_id"`
	EventType  string      `json:"event_type"`
	FromStatus DealStatus  `json:"from_status"`
	ToStatus   DealStatus  `json:"to_status"`
	UserID     string      `json:"user_id"`
	Notes      string      `json:"notes"`
	Metadata   interface{} `json:"metadata,omitempty"`
	CreatedAt  time.Time   `json:"created_at"`
}

// Event types
const (
	EventStatusChange    = "status_change"
	EventPriceChange     = "price_change"
	EventCustomerChange  = "customer_change"
	EventVehicleChange   = "vehicle_change"
	EventDocumentAdded   = "document_added"
	EventNoteAdded       = "note_added"
	EventApprovalRequest = "approval_request"
	EventApprovalGiven   = "approval_given"
)

// ============================================================================
// Status Display Helpers
// ============================================================================

// StatusInfo contains display information for a status
type StatusInfo struct {
	Status      DealStatus `json:"status"`
	Label       string     `json:"label"`
	Description string     `json:"description"`
	Color       string     `json:"color"` // For UI display
	Icon        string     `json:"icon"`
	IsTerminal  bool       `json:"is_terminal"`
	NextSteps   []DealStatus `json:"next_steps"`
}

// GetStatusInfo returns display information for a status
func GetStatusInfo(status DealStatus) StatusInfo {
	info := StatusInfo{
		Status:   status,
		NextSteps: validTransitions[status],
	}

	switch status {
	case StatusDraft:
		info.Label = "Draft"
		info.Description = "Deal is being worked, not yet submitted"
		info.Color = "gray"
		info.Icon = "pencil"
	case StatusPending:
		info.Label = "Pending"
		info.Description = "Awaiting approval"
		info.Color = "yellow"
		info.Icon = "clock"
	case StatusApproved:
		info.Label = "Approved"
		info.Description = "Deal approved, ready for funding"
		info.Color = "blue"
		info.Icon = "check"
	case StatusFunded:
		info.Label = "Funded"
		info.Description = "Funding received from lender"
		info.Color = "green"
		info.Icon = "dollar"
	case StatusContracting:
		info.Label = "Contracting"
		info.Description = "Signing documents"
		info.Color = "purple"
		info.Icon = "document"
	case StatusDelivered:
		info.Label = "Delivered"
		info.Description = "Vehicle delivered to customer"
		info.Color = "green"
		info.Icon = "truck"
		info.IsTerminal = true
	case StatusUnwound:
		info.Label = "Unwound"
		info.Description = "Deal reversed after completion"
		info.Color = "orange"
		info.Icon = "undo"
		info.IsTerminal = true
	case StatusCancelled:
		info.Label = "Cancelled"
		info.Description = "Deal cancelled before completion"
		info.Color = "red"
		info.Icon = "x"
		info.IsTerminal = true
	}

	return info
}

// GetAllStatuses returns all possible statuses
func GetAllStatuses() []StatusInfo {
	statuses := []DealStatus{
		StatusDraft,
		StatusPending,
		StatusApproved,
		StatusFunded,
		StatusContracting,
		StatusDelivered,
		StatusUnwound,
		StatusCancelled,
	}

	result := make([]StatusInfo, len(statuses))
	for i, s := range statuses {
		result[i] = GetStatusInfo(s)
	}
	return result
}

// ============================================================================
// Workflow Actions
// ============================================================================

// WorkflowAction represents an available action on a deal
type WorkflowAction struct {
	Name        string     `json:"name"`
	Label       string     `json:"label"`
	Description string     `json:"description"`
	TargetStatus DealStatus `json:"target_status"`
	RequiresNote bool      `json:"requires_note"`
	RequiresApproval bool  `json:"requires_approval"`
}

// GetAvailableActions returns actions available for current status
func GetAvailableActions(deal *Deal) []WorkflowAction {
	currentStatus := DealStatus(deal.Status)
	nextStatuses := validTransitions[currentStatus]

	actions := make([]WorkflowAction, 0, len(nextStatuses))

	for _, target := range nextStatuses {
		action := WorkflowAction{
			TargetStatus: target,
		}

		switch target {
		case StatusPending:
			action.Name = "submit"
			action.Label = "Submit for Approval"
			action.Description = "Submit this deal for manager approval"
		case StatusDraft:
			action.Name = "return_to_draft"
			action.Label = "Return to Draft"
			action.Description = "Return deal to draft status for editing"
			action.RequiresNote = true
		case StatusApproved:
			action.Name = "approve"
			action.Label = "Approve Deal"
			action.Description = "Approve this deal"
			action.RequiresApproval = true
		case StatusFunded:
			action.Name = "mark_funded"
			action.Label = "Mark Funded"
			action.Description = "Mark deal as funded by lender"
		case StatusContracting:
			action.Name = "begin_contracting"
			action.Label = "Begin Contracting"
			action.Description = "Start the contracting process"
		case StatusDelivered:
			action.Name = "mark_delivered"
			action.Label = "Mark Delivered"
			action.Description = "Mark vehicle as delivered to customer"
		case StatusUnwound:
			action.Name = "unwind"
			action.Label = "Unwind Deal"
			action.Description = "Reverse this completed deal"
			action.RequiresNote = true
			action.RequiresApproval = true
		case StatusCancelled:
			action.Name = "cancel"
			action.Label = "Cancel Deal"
			action.Description = "Cancel this deal"
			action.RequiresNote = true
		}

		// Validate transition is possible
		if err := CanTransition(deal, target); err == nil {
			actions = append(actions, action)
		}
	}

	return actions
}
