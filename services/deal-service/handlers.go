package main

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// ============================================================================
// Calculation Endpoints
// ============================================================================

// CalculateDealRequest is the request body for deal calculation
type CalculateDealRequest struct {
	DealType string               `json:"deal_type" validate:"required,oneof=CASH FINANCE LEASE"`
	Input    DealCalculationInput `json:"input" validate:"required"`
}

// calculateDealHandler handles POST /deals/calculate
func (s *Server) calculateDealHandler(w http.ResponseWriter, r *http.Request) {
	var req CalculateDealRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	dealType := DealType(req.DealType)
	result, err := CalculateDeal(req.Input, dealType)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Deal calculation failed")
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// PaymentCalculationRequest is the request body for payment calculation
type PaymentCalculationRequest struct {
	Principal  float64 `json:"principal" validate:"required,gt=0"`
	APR        float64 `json:"apr" validate:"gte=0"`
	TermMonths int     `json:"term_months" validate:"required,gt=0"`
}

// calculatePaymentHandler handles POST /deals/calculate/payment
func (s *Server) calculatePaymentHandler(w http.ResponseWriter, r *http.Request) {
	var req PaymentCalculationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	payment := CalculateMonthlyPayment(req.Principal, req.APR, req.TermMonths)
	totalPayments := payment * float64(req.TermMonths)
	totalInterest := totalPayments - req.Principal

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"monthly_payment":   payment,
		"total_of_payments": roundToTwoDecimals(totalPayments),
		"total_interest":    roundToTwoDecimals(totalInterest),
		"principal":         req.Principal,
		"apr":               req.APR,
		"term_months":       req.TermMonths,
	})
}

// AmortizationRequest is the request body for amortization schedule
type AmortizationRequest struct {
	Principal  float64 `json:"principal" validate:"required,gt=0"`
	APR        float64 `json:"apr" validate:"gte=0"`
	TermMonths int     `json:"term_months" validate:"required,gt=0"`
	StartDate  string  `json:"start_date"` // Optional, ISO date
}

// getAmortizationHandler handles POST /deals/amortization
func (s *Server) getAmortizationHandler(w http.ResponseWriter, r *http.Request) {
	var req AmortizationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.StartDate == "" {
		req.StartDate = time.Now().Format("2006-01-02")
	}

	schedule := GenerateAmortizationSchedule(req.Principal, req.APR, req.TermMonths, req.StartDate)
	payment := CalculateMonthlyPayment(req.Principal, req.APR, req.TermMonths)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"monthly_payment": payment,
		"schedule":        schedule,
		"summary": map[string]interface{}{
			"principal":         req.Principal,
			"apr":               req.APR,
			"term_months":       req.TermMonths,
			"total_of_payments": roundToTwoDecimals(payment * float64(req.TermMonths)),
			"total_interest":    roundToTwoDecimals(payment*float64(req.TermMonths) - req.Principal),
		},
	})
}

// ============================================================================
// Workflow Endpoints
// ============================================================================

// TransitionRequest is the request body for status transition
type TransitionRequest struct {
	Status string `json:"status" validate:"required"`
	UserID string `json:"user_id"`
	Notes  string `json:"notes"`
}

// transitionStatusHandler handles POST /deals/{id}/transition
func (s *Server) transitionStatusHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var req TransitionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Get current deal
	deal, err := s.db.GetDeal(id)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to get deal")
		http.Error(w, "Failed to get deal", http.StatusInternalServerError)
		return
	}
	if deal == nil {
		http.Error(w, "Deal not found", http.StatusNotFound)
		return
	}

	newStatus := DealStatus(req.Status)

	// Validate transition
	if err := CanTransition(deal, newStatus); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Update status
	deal.DealState = string(newStatus)
	deal.UpdatedAt = time.Now()

	if err := s.db.UpdateDeal(deal); err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to update deal status")
		http.Error(w, "Failed to update deal status", http.StatusInternalServerError)
		return
	}

	// Create event record (in production, store this)
	event := DealEvent{
		ID:         uuid.New().String(),
		DealID:     id,
		EventType:  EventStatusChange,
		FromStatus: DealStatus(deal.DealState),
		ToStatus:   newStatus,
		UserID:     req.UserID,
		Notes:      req.Notes,
		CreatedAt:  time.Now(),
	}

	s.logger.WithContext(r.Context()).
		WithField("deal_id", id).
		WithField("from_status", event.FromStatus).
		WithField("to_status", event.ToStatus).
		Info("Deal status changed")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"deal":  deal,
		"event": event,
	})
}

// getActionsHandler handles GET /deals/{id}/actions
func (s *Server) getActionsHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	deal, err := s.db.GetDeal(id)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to get deal")
		http.Error(w, "Failed to get deal", http.StatusInternalServerError)
		return
	}
	if deal == nil {
		http.Error(w, "Deal not found", http.StatusNotFound)
		return
	}

	actions := GetAvailableActions(deal)
	statusInfo := GetStatusInfo(DealStatus(deal.DealState))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"current_status": statusInfo,
		"actions":        actions,
	})
}

// getStatusesHandler handles GET /deals/statuses
func (s *Server) getStatusesHandler(w http.ResponseWriter, r *http.Request) {
	statuses := GetAllStatuses()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(statuses)
}

// ============================================================================
// Route Setup Extension
// ============================================================================

// setupCalculationRoutes adds calculation and workflow routes
func (s *Server) setupCalculationRoutes() {
	// Calculation endpoints
	s.router.HandleFunc("/deals/calculate", s.calculateDealHandler).Methods("POST")
	s.router.HandleFunc("/deals/calculate/payment", s.calculatePaymentHandler).Methods("POST")
	s.router.HandleFunc("/deals/amortization", s.getAmortizationHandler).Methods("POST")

	// Workflow endpoints
	s.router.HandleFunc("/deals/statuses", s.getStatusesHandler).Methods("GET")
	s.router.HandleFunc("/deals/{id}/transition", s.transitionStatusHandler).Methods("POST")
	s.router.HandleFunc("/deals/{id}/actions", s.getActionsHandler).Methods("GET")
}
