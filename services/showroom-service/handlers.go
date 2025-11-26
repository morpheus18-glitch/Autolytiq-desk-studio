package main

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"autolytiq/shared/logging"

	"github.com/gorilla/mux"
)

// Handler holds dependencies for HTTP handlers
type Handler struct {
	db     ShowroomDatabase
	hub    *Hub
	logger *logging.Logger
}

// NewHandler creates a new Handler instance
func NewHandler(db ShowroomDatabase, hub *Hub, logger *logging.Logger) *Handler {
	return &Handler{db: db, hub: hub, logger: logger}
}

// respondJSON writes a JSON response
func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if data != nil {
		json.NewEncoder(w).Encode(data)
	}
}

// respondError writes a JSON error response
func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}

// getDealershipID extracts dealership ID from request header
func getDealershipID(r *http.Request) string {
	return r.Header.Get("X-Dealership-ID")
}

// getUserID extracts user ID from request header
func getUserID(r *http.Request) string {
	return r.Header.Get("X-User-ID")
}

// HealthCheck handles health check requests
func (h *Handler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]string{"status": "healthy", "service": "showroom-service"})
}

// ===========================================
// VISIT HANDLERS
// ===========================================

// ListVisits handles GET /visits
func (h *Handler) ListVisits(w http.ResponseWriter, r *http.Request) {
	dealershipID := getDealershipID(r)
	if dealershipID == "" {
		respondError(w, http.StatusBadRequest, "Missing dealership ID")
		return
	}

	// Parse query params
	status := r.URL.Query().Get("status")
	activeOnly := r.URL.Query().Get("active_only") == "true"

	var dateFrom, dateTo *time.Time
	if from := r.URL.Query().Get("date_from"); from != "" {
		if t, err := time.Parse("2006-01-02", from); err == nil {
			dateFrom = &t
		}
	}
	if to := r.URL.Query().Get("date_to"); to != "" {
		if t, err := time.Parse("2006-01-02", to); err == nil {
			dateTo = &t
		}
	}

	limit := 50
	offset := 0
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	filter := VisitFilter{
		DealershipID: dealershipID,
		Status:       status,
		ActiveOnly:   activeOnly,
		DateFrom:     dateFrom,
		DateTo:       dateTo,
		Limit:        limit,
		Offset:       offset,
	}

	visits, total, err := h.db.ListVisits(filter)
	if err != nil {
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to list visits")
		respondError(w, http.StatusInternalServerError, "Failed to list visits")
		return
	}

	respondJSON(w, http.StatusOK, VisitsResponse{
		Visits: visits,
		Total:  total,
	})
}

// GetVisit handles GET /visits/{id}
func (h *Handler) GetVisit(w http.ResponseWriter, r *http.Request) {
	dealershipID := getDealershipID(r)
	if dealershipID == "" {
		respondError(w, http.StatusBadRequest, "Missing dealership ID")
		return
	}

	vars := mux.Vars(r)
	visitID := vars["id"]

	visit, err := h.db.GetVisit(visitID, dealershipID)
	if err != nil {
		if err.Error() == "visit not found" {
			respondError(w, http.StatusNotFound, "Visit not found")
			return
		}
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to get visit")
		respondError(w, http.StatusInternalServerError, "Failed to get visit")
		return
	}

	respondJSON(w, http.StatusOK, visit)
}

// CreateVisit handles POST /visits
func (h *Handler) CreateVisit(w http.ResponseWriter, r *http.Request) {
	dealershipID := getDealershipID(r)
	userID := getUserID(r)
	if dealershipID == "" {
		respondError(w, http.StatusBadRequest, "Missing dealership ID")
		return
	}

	var req CreateVisitRequest
	if !decodeAndValidateShowroom(r, w, &req) {
		return
	}

	visit, err := h.db.CreateVisit(dealershipID, req)
	if err != nil {
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to create visit")
		respondError(w, http.StatusInternalServerError, "Failed to create visit")
		return
	}

	// Log event
	h.db.CreateEvent(visit.ID, "VISIT_CREATED", &userID, nil, nil, nil)

	// Auto-start WAIT_TIME timer
	timer, err := h.db.StartTimer(visit.ID, "WAIT_TIME", &userID)
	if err != nil {
		h.logger.WithContext(r.Context()).WithError(err).Warn("Failed to auto-start timer")
	} else {
		visit.ActiveTimer = timer
		visit.Timers = []Timer{*timer}
	}

	// Add initial note if provided
	if req.InitialNote != nil && *req.InitialNote != "" {
		note, err := h.db.CreateNote(visit.ID, userID, CreateNoteRequest{
			Content:  *req.InitialNote,
			IsPinned: false,
		})
		if err != nil {
			h.logger.WithContext(r.Context()).WithError(err).Warn("Failed to create initial note")
		} else {
			visit.Notes = []Note{*note}
		}
	}

	// Broadcast to all clients in dealership room
	h.hub.Broadcast(dealershipID, WSEventVisitCreated, visit)

	respondJSON(w, http.StatusCreated, visit)
}

// UpdateVisit handles PATCH /visits/{id}
func (h *Handler) UpdateVisit(w http.ResponseWriter, r *http.Request) {
	dealershipID := getDealershipID(r)
	userID := getUserID(r)
	if dealershipID == "" {
		respondError(w, http.StatusBadRequest, "Missing dealership ID")
		return
	}

	vars := mux.Vars(r)
	visitID := vars["id"]

	var req UpdateVisitRequest
	if !decodeAndValidateShowroom(r, w, &req) {
		return
	}

	visit, err := h.db.UpdateVisit(visitID, dealershipID, req)
	if err != nil {
		if err.Error() == "visit not found" {
			respondError(w, http.StatusNotFound, "Visit not found")
			return
		}
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to update visit")
		respondError(w, http.StatusInternalServerError, "Failed to update visit")
		return
	}

	// Log event
	h.db.CreateEvent(visitID, "VISIT_UPDATED", &userID, nil, nil, nil)

	// Broadcast update
	h.hub.Broadcast(dealershipID, WSEventVisitUpdated, visit)

	respondJSON(w, http.StatusOK, visit)
}

// ChangeStatus handles POST /visits/{id}/status
func (h *Handler) ChangeStatus(w http.ResponseWriter, r *http.Request) {
	dealershipID := getDealershipID(r)
	userID := getUserID(r)
	if dealershipID == "" {
		respondError(w, http.StatusBadRequest, "Missing dealership ID")
		return
	}

	vars := mux.Vars(r)
	visitID := vars["id"]

	var req ChangeStatusRequest
	if !decodeAndValidateShowroom(r, w, &req) {
		return
	}

	// Get current visit to record previous status
	currentVisit, err := h.db.GetVisit(visitID, dealershipID)
	if err != nil {
		if err.Error() == "visit not found" {
			respondError(w, http.StatusNotFound, "Visit not found")
			return
		}
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to get visit")
		respondError(w, http.StatusInternalServerError, "Failed to get visit")
		return
	}

	previousStatus := currentVisit.Status

	visit, err := h.db.ChangeStatus(visitID, dealershipID, req.Status)
	if err != nil {
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to change status")
		respondError(w, http.StatusInternalServerError, "Failed to change status")
		return
	}

	// Log event
	h.db.CreateEvent(visitID, "STATUS_CHANGED", &userID, &previousStatus, &req.Status, nil)

	// Broadcast update
	h.hub.Broadcast(dealershipID, WSEventStatusChanged, map[string]interface{}{
		"visit":           visit,
		"previous_status": previousStatus,
		"new_status":      req.Status,
	})

	respondJSON(w, http.StatusOK, visit)
}

// AttachVehicle handles POST /visits/{id}/vehicle
func (h *Handler) AttachVehicle(w http.ResponseWriter, r *http.Request) {
	dealershipID := getDealershipID(r)
	userID := getUserID(r)
	if dealershipID == "" {
		respondError(w, http.StatusBadRequest, "Missing dealership ID")
		return
	}

	vars := mux.Vars(r)
	visitID := vars["id"]

	var req AttachVehicleRequest
	if !decodeAndValidateShowroom(r, w, &req) {
		return
	}

	visit, err := h.db.AttachVehicle(visitID, dealershipID, req.VehicleID, req.StockNumber)
	if err != nil {
		if err.Error() == "visit not found" {
			respondError(w, http.StatusNotFound, "Visit not found")
			return
		}
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to attach vehicle")
		respondError(w, http.StatusInternalServerError, "Failed to attach vehicle")
		return
	}

	// Log event
	h.db.CreateEvent(visitID, "VEHICLE_ATTACHED", &userID, nil, &req.VehicleID, nil)

	// Broadcast update
	h.hub.Broadcast(dealershipID, WSEventVisitUpdated, visit)

	respondJSON(w, http.StatusOK, visit)
}

// CloseVisit handles POST /visits/{id}/close
func (h *Handler) CloseVisit(w http.ResponseWriter, r *http.Request) {
	dealershipID := getDealershipID(r)
	userID := getUserID(r)
	if dealershipID == "" {
		respondError(w, http.StatusBadRequest, "Missing dealership ID")
		return
	}

	vars := mux.Vars(r)
	visitID := vars["id"]

	var req ChangeStatusRequest
	if !decodeAndValidateShowroom(r, w, &req) {
		return
	}

	if !IsClosedStatus(req.Status) {
		respondError(w, http.StatusBadRequest, "Status must be CLOSED_WON or CLOSED_LOST")
		return
	}

	// Get current visit
	currentVisit, err := h.db.GetVisit(visitID, dealershipID)
	if err != nil {
		if err.Error() == "visit not found" {
			respondError(w, http.StatusNotFound, "Visit not found")
			return
		}
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to get visit")
		respondError(w, http.StatusInternalServerError, "Failed to get visit")
		return
	}

	previousStatus := currentVisit.Status

	visit, err := h.db.CloseVisit(visitID, dealershipID, req.Status)
	if err != nil {
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to close visit")
		respondError(w, http.StatusInternalServerError, "Failed to close visit")
		return
	}

	// Log event
	h.db.CreateEvent(visitID, "VISIT_CLOSED", &userID, &previousStatus, &req.Status, nil)

	// Broadcast update
	h.hub.Broadcast(dealershipID, WSEventVisitClosed, visit)

	respondJSON(w, http.StatusOK, visit)
}

// ===========================================
// TIMER HANDLERS
// ===========================================

// StartTimer handles POST /visits/{id}/timers
func (h *Handler) StartTimer(w http.ResponseWriter, r *http.Request) {
	dealershipID := getDealershipID(r)
	userID := getUserID(r)
	if dealershipID == "" {
		respondError(w, http.StatusBadRequest, "Missing dealership ID")
		return
	}

	vars := mux.Vars(r)
	visitID := vars["id"]

	var req StartTimerRequest
	if !decodeAndValidateShowroom(r, w, &req) {
		return
	}

	// Verify visit exists and belongs to dealership
	_, err := h.db.GetVisit(visitID, dealershipID)
	if err != nil {
		if err.Error() == "visit not found" {
			respondError(w, http.StatusNotFound, "Visit not found")
			return
		}
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to get visit")
		respondError(w, http.StatusInternalServerError, "Failed to verify visit")
		return
	}

	timer, err := h.db.StartTimer(visitID, req.TimerType, &userID)
	if err != nil {
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to start timer")
		respondError(w, http.StatusInternalServerError, "Failed to start timer")
		return
	}

	// Log event
	h.db.CreateEvent(visitID, "TIMER_STARTED", &userID, nil, &req.TimerType, nil)

	// Broadcast update
	h.hub.Broadcast(dealershipID, WSEventTimerStarted, map[string]interface{}{
		"visit_id": visitID,
		"timer":    timer,
	})

	respondJSON(w, http.StatusCreated, timer)
}

// StopTimer handles POST /visits/{id}/timers/{timer_id}/stop
func (h *Handler) StopTimer(w http.ResponseWriter, r *http.Request) {
	dealershipID := getDealershipID(r)
	userID := getUserID(r)
	if dealershipID == "" {
		respondError(w, http.StatusBadRequest, "Missing dealership ID")
		return
	}

	vars := mux.Vars(r)
	visitID := vars["id"]
	timerID := vars["timer_id"]

	// Verify visit exists and belongs to dealership
	_, err := h.db.GetVisit(visitID, dealershipID)
	if err != nil {
		if err.Error() == "visit not found" {
			respondError(w, http.StatusNotFound, "Visit not found")
			return
		}
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to get visit")
		respondError(w, http.StatusInternalServerError, "Failed to verify visit")
		return
	}

	timer, err := h.db.StopTimer(timerID, visitID)
	if err != nil {
		if err.Error() == "timer not found" {
			respondError(w, http.StatusNotFound, "Timer not found")
			return
		}
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to stop timer")
		respondError(w, http.StatusInternalServerError, "Failed to stop timer")
		return
	}

	// Log event
	h.db.CreateEvent(visitID, "TIMER_STOPPED", &userID, nil, &timer.TimerType, nil)

	// Broadcast update
	h.hub.Broadcast(dealershipID, WSEventTimerStopped, map[string]interface{}{
		"visit_id": visitID,
		"timer":    timer,
	})

	respondJSON(w, http.StatusOK, timer)
}

// ListTimers handles GET /visits/{id}/timers
func (h *Handler) ListTimers(w http.ResponseWriter, r *http.Request) {
	dealershipID := getDealershipID(r)
	if dealershipID == "" {
		respondError(w, http.StatusBadRequest, "Missing dealership ID")
		return
	}

	vars := mux.Vars(r)
	visitID := vars["id"]

	// Verify visit exists and belongs to dealership
	_, err := h.db.GetVisit(visitID, dealershipID)
	if err != nil {
		if err.Error() == "visit not found" {
			respondError(w, http.StatusNotFound, "Visit not found")
			return
		}
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to get visit")
		respondError(w, http.StatusInternalServerError, "Failed to verify visit")
		return
	}

	timers, err := h.db.GetTimers(visitID)
	if err != nil {
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to get timers")
		respondError(w, http.StatusInternalServerError, "Failed to get timers")
		return
	}

	respondJSON(w, http.StatusOK, timers)
}

// ===========================================
// NOTE HANDLERS
// ===========================================

// CreateNote handles POST /visits/{id}/notes
func (h *Handler) CreateNote(w http.ResponseWriter, r *http.Request) {
	dealershipID := getDealershipID(r)
	userID := getUserID(r)
	if dealershipID == "" {
		respondError(w, http.StatusBadRequest, "Missing dealership ID")
		return
	}
	if userID == "" {
		respondError(w, http.StatusBadRequest, "Missing user ID")
		return
	}

	vars := mux.Vars(r)
	visitID := vars["id"]

	var req CreateNoteRequest
	if !decodeAndValidateShowroom(r, w, &req) {
		return
	}

	// Verify visit exists and belongs to dealership
	_, err := h.db.GetVisit(visitID, dealershipID)
	if err != nil {
		if err.Error() == "visit not found" {
			respondError(w, http.StatusNotFound, "Visit not found")
			return
		}
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to get visit")
		respondError(w, http.StatusInternalServerError, "Failed to verify visit")
		return
	}

	note, err := h.db.CreateNote(visitID, userID, req)
	if err != nil {
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to create note")
		respondError(w, http.StatusInternalServerError, "Failed to create note")
		return
	}

	// Broadcast update
	h.hub.Broadcast(dealershipID, WSEventNoteAdded, map[string]interface{}{
		"visit_id": visitID,
		"note":     note,
	})

	respondJSON(w, http.StatusCreated, note)
}

// UpdateNote handles PATCH /visits/{id}/notes/{note_id}
func (h *Handler) UpdateNote(w http.ResponseWriter, r *http.Request) {
	dealershipID := getDealershipID(r)
	if dealershipID == "" {
		respondError(w, http.StatusBadRequest, "Missing dealership ID")
		return
	}

	vars := mux.Vars(r)
	visitID := vars["id"]
	noteID := vars["note_id"]

	var req UpdateNoteRequest
	if !decodeAndValidateShowroom(r, w, &req) {
		return
	}

	// Verify visit exists and belongs to dealership
	_, err := h.db.GetVisit(visitID, dealershipID)
	if err != nil {
		if err.Error() == "visit not found" {
			respondError(w, http.StatusNotFound, "Visit not found")
			return
		}
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to get visit")
		respondError(w, http.StatusInternalServerError, "Failed to verify visit")
		return
	}

	note, err := h.db.UpdateNote(noteID, visitID, req)
	if err != nil {
		if err.Error() == "note not found" {
			respondError(w, http.StatusNotFound, "Note not found")
			return
		}
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to update note")
		respondError(w, http.StatusInternalServerError, "Failed to update note")
		return
	}

	// Broadcast update
	h.hub.Broadcast(dealershipID, WSEventNoteUpdated, map[string]interface{}{
		"visit_id": visitID,
		"note":     note,
	})

	respondJSON(w, http.StatusOK, note)
}

// DeleteNote handles DELETE /visits/{id}/notes/{note_id}
func (h *Handler) DeleteNote(w http.ResponseWriter, r *http.Request) {
	dealershipID := getDealershipID(r)
	if dealershipID == "" {
		respondError(w, http.StatusBadRequest, "Missing dealership ID")
		return
	}

	vars := mux.Vars(r)
	visitID := vars["id"]
	noteID := vars["note_id"]

	// Verify visit exists and belongs to dealership
	_, err := h.db.GetVisit(visitID, dealershipID)
	if err != nil {
		if err.Error() == "visit not found" {
			respondError(w, http.StatusNotFound, "Visit not found")
			return
		}
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to get visit")
		respondError(w, http.StatusInternalServerError, "Failed to verify visit")
		return
	}

	err = h.db.DeleteNote(noteID, visitID)
	if err != nil {
		if err.Error() == "note not found" {
			respondError(w, http.StatusNotFound, "Note not found")
			return
		}
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to delete note")
		respondError(w, http.StatusInternalServerError, "Failed to delete note")
		return
	}

	// Broadcast update
	h.hub.Broadcast(dealershipID, WSEventNoteDeleted, map[string]interface{}{
		"visit_id": visitID,
		"note_id":  noteID,
	})

	w.WriteHeader(http.StatusNoContent)
}

// ListNotes handles GET /visits/{id}/notes
func (h *Handler) ListNotes(w http.ResponseWriter, r *http.Request) {
	dealershipID := getDealershipID(r)
	if dealershipID == "" {
		respondError(w, http.StatusBadRequest, "Missing dealership ID")
		return
	}

	vars := mux.Vars(r)
	visitID := vars["id"]

	// Verify visit exists and belongs to dealership
	_, err := h.db.GetVisit(visitID, dealershipID)
	if err != nil {
		if err.Error() == "visit not found" {
			respondError(w, http.StatusNotFound, "Visit not found")
			return
		}
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to get visit")
		respondError(w, http.StatusInternalServerError, "Failed to verify visit")
		return
	}

	notes, err := h.db.GetNotes(visitID)
	if err != nil {
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to get notes")
		respondError(w, http.StatusInternalServerError, "Failed to get notes")
		return
	}

	respondJSON(w, http.StatusOK, notes)
}

// ===========================================
// EVENT HANDLERS
// ===========================================

// ListEvents handles GET /visits/{id}/events
func (h *Handler) ListEvents(w http.ResponseWriter, r *http.Request) {
	dealershipID := getDealershipID(r)
	if dealershipID == "" {
		respondError(w, http.StatusBadRequest, "Missing dealership ID")
		return
	}

	vars := mux.Vars(r)
	visitID := vars["id"]

	// Verify visit exists and belongs to dealership
	_, err := h.db.GetVisit(visitID, dealershipID)
	if err != nil {
		if err.Error() == "visit not found" {
			respondError(w, http.StatusNotFound, "Visit not found")
			return
		}
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to get visit")
		respondError(w, http.StatusInternalServerError, "Failed to verify visit")
		return
	}

	events, err := h.db.GetEvents(visitID)
	if err != nil {
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to get events")
		respondError(w, http.StatusInternalServerError, "Failed to get events")
		return
	}

	respondJSON(w, http.StatusOK, events)
}

// ===========================================
// WORKFLOW CONFIG HANDLERS
// ===========================================

// GetWorkflowConfig handles GET /workflow-config
func (h *Handler) GetWorkflowConfig(w http.ResponseWriter, r *http.Request) {
	dealershipID := getDealershipID(r)

	var config *WorkflowConfig
	var err error

	if dealershipID != "" {
		config, err = h.db.GetWorkflowConfig(&dealershipID)
	} else {
		config, err = h.db.GetWorkflowConfig(nil)
	}

	if err != nil {
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to get workflow config")
		respondError(w, http.StatusInternalServerError, "Failed to get workflow config")
		return
	}

	if config == nil {
		respondError(w, http.StatusNotFound, "Workflow config not found")
		return
	}

	respondJSON(w, http.StatusOK, config)
}

// UpdateWorkflowConfig handles PUT /workflow-config
func (h *Handler) UpdateWorkflowConfig(w http.ResponseWriter, r *http.Request) {
	dealershipID := getDealershipID(r)
	if dealershipID == "" {
		respondError(w, http.StatusBadRequest, "Missing dealership ID")
		return
	}

	var config WorkflowConfig
	if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	config.DealershipID = &dealershipID

	updatedConfig, err := h.db.UpsertWorkflowConfig(config)
	if err != nil {
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to update workflow config")
		respondError(w, http.StatusInternalServerError, "Failed to update workflow config")
		return
	}

	respondJSON(w, http.StatusOK, updatedConfig)
}

// ===========================================
// WEBSOCKET HANDLER
// ===========================================

// HandleWebSocket handles WebSocket upgrade requests
func (h *Handler) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	ServeWS(h.hub, w, r)
}
