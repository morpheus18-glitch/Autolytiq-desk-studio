package main

import (
	"encoding/json"
	"net/http"
	"strconv"

	"autolytiq/shared/logging"

	"github.com/gorilla/mux"
)

// Handler holds dependencies for HTTP handlers
type Handler struct {
	db     MessagingDatabase
	hub    *Hub
	logger *logging.Logger
}

// NewHandler creates a new Handler
func NewHandler(db MessagingDatabase, hub *Hub, logger *logging.Logger) *Handler {
	return &Handler{db: db, hub: hub, logger: logger}
}

// Helper functions

func getDealershipID(r *http.Request) string {
	return r.Header.Get("X-Dealership-ID")
}

func getUserID(r *http.Request) string {
	return r.Header.Get("X-User-ID")
}

func getUserName(r *http.Request) string {
	name := r.Header.Get("X-User-Name")
	if name == "" {
		return "User"
	}
	return name
}

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if data != nil {
		json.NewEncoder(w).Encode(data)
	}
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}

// HealthCheck handles health check requests
func (h *Handler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]string{"status": "healthy", "service": "messaging"})
}

// Conversation Handlers

// ListConversations lists all conversations for the user
func (h *Handler) ListConversations(w http.ResponseWriter, r *http.Request) {
	dealershipID := getDealershipID(r)
	userID := getUserID(r)

	if dealershipID == "" || userID == "" {
		respondError(w, http.StatusBadRequest, "Missing required headers")
		return
	}

	// Parse filters
	filter := ConversationFilter{
		Limit:  50,
		Offset: 0,
	}

	if t := r.URL.Query().Get("type"); t != "" {
		filter.Type = &t
	}

	if archived := r.URL.Query().Get("is_archived"); archived != "" {
		val := archived == "true"
		filter.IsArchived = &val
	}

	if search := r.URL.Query().Get("search"); search != "" {
		filter.Search = &search
	}

	if limit := r.URL.Query().Get("limit"); limit != "" {
		if l, err := strconv.Atoi(limit); err == nil && l > 0 && l <= 100 {
			filter.Limit = l
		}
	}

	if offset := r.URL.Query().Get("offset"); offset != "" {
		if o, err := strconv.Atoi(offset); err == nil && o >= 0 {
			filter.Offset = o
		}
	}

	conversations, total, err := h.db.ListConversations(dealershipID, userID, filter)
	if err != nil {
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to list conversations")
		respondError(w, http.StatusInternalServerError, "Failed to list conversations")
		return
	}

	// Update presence for participants
	for i := range conversations {
		for j := range conversations[i].Participants {
			conversations[i].Participants[j].Presence = h.hub.GetUserPresence(conversations[i].Participants[j].UserID)
		}
	}

	respondJSON(w, http.StatusOK, ConversationsResponse{
		Conversations: conversations,
		Total:         total,
	})
}

// GetConversation gets a single conversation
func (h *Handler) GetConversation(w http.ResponseWriter, r *http.Request) {
	dealershipID := getDealershipID(r)
	userID := getUserID(r)
	conversationID := mux.Vars(r)["id"]

	if dealershipID == "" || userID == "" {
		respondError(w, http.StatusBadRequest, "Missing required headers")
		return
	}

	conversation, err := h.db.GetConversation(conversationID, dealershipID, userID)
	if err != nil {
		if err.Error() == "conversation not found" {
			respondError(w, http.StatusNotFound, "Conversation not found")
			return
		}
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to get conversation")
		respondError(w, http.StatusInternalServerError, "Failed to get conversation")
		return
	}

	// Update presence
	for i := range conversation.Participants {
		conversation.Participants[i].Presence = h.hub.GetUserPresence(conversation.Participants[i].UserID)
	}

	respondJSON(w, http.StatusOK, conversation)
}

// CreateConversation creates a new conversation
func (h *Handler) CreateConversation(w http.ResponseWriter, r *http.Request) {
	dealershipID := getDealershipID(r)
	userID := getUserID(r)

	if dealershipID == "" || userID == "" {
		respondError(w, http.StatusBadRequest, "Missing required headers")
		return
	}

	var req CreateConversationRequest
	if !decodeAndValidateMessaging(r, w, &req) {
		return
	}

	// For direct conversations, check if one already exists
	if req.Type == "DIRECT" && len(req.ParticipantIDs) == 1 {
		conversation, err := h.db.GetOrCreateDirectConversation(dealershipID, userID, req.ParticipantIDs[0])
		if err != nil {
			h.logger.WithContext(r.Context()).WithError(err).Error("Failed to get/create direct conversation")
			respondError(w, http.StatusInternalServerError, "Failed to create conversation")
			return
		}

		respondJSON(w, http.StatusOK, conversation)
		return
	}

	conversation, err := h.db.CreateConversation(dealershipID, userID, req)
	if err != nil {
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to create conversation")
		respondError(w, http.StatusInternalServerError, "Failed to create conversation")
		return
	}

	// Broadcast to all participants
	for _, p := range conversation.Participants {
		h.hub.BroadcastToUser(p.UserID, WSEventConversationCreated, conversation)
	}

	respondJSON(w, http.StatusCreated, conversation)
}

// UpdateConversation updates conversation settings
func (h *Handler) UpdateConversation(w http.ResponseWriter, r *http.Request) {
	dealershipID := getDealershipID(r)
	userID := getUserID(r)
	conversationID := mux.Vars(r)["id"]

	if dealershipID == "" || userID == "" {
		respondError(w, http.StatusBadRequest, "Missing required headers")
		return
	}

	var req UpdateConversationRequest
	if !decodeAndValidateMessaging(r, w, &req) {
		return
	}

	conversation, err := h.db.UpdateConversation(conversationID, dealershipID, userID, req)
	if err != nil {
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to update conversation")
		respondError(w, http.StatusInternalServerError, "Failed to update conversation")
		return
	}

	// Broadcast update
	h.hub.BroadcastToConversation(conversationID, WSEventConversationUpdated, conversation, "")

	respondJSON(w, http.StatusOK, conversation)
}

// Message Handlers

// ListMessages lists messages in a conversation
func (h *Handler) ListMessages(w http.ResponseWriter, r *http.Request) {
	dealershipID := getDealershipID(r)
	userID := getUserID(r)
	conversationID := mux.Vars(r)["conversationId"]

	if dealershipID == "" || userID == "" {
		respondError(w, http.StatusBadRequest, "Missing required headers")
		return
	}

	// Parse filters
	filter := MessageFilter{
		Limit: 50,
	}

	if beforeID := r.URL.Query().Get("before_id"); beforeID != "" {
		filter.BeforeID = &beforeID
	}

	if afterID := r.URL.Query().Get("after_id"); afterID != "" {
		filter.AfterID = &afterID
	}

	if limit := r.URL.Query().Get("limit"); limit != "" {
		if l, err := strconv.Atoi(limit); err == nil && l > 0 && l <= 100 {
			filter.Limit = l
		}
	}

	messages, total, hasMore, err := h.db.ListMessages(conversationID, dealershipID, userID, filter)
	if err != nil {
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to list messages")
		respondError(w, http.StatusInternalServerError, "Failed to list messages")
		return
	}

	respondJSON(w, http.StatusOK, MessagesResponse{
		Messages: messages,
		Total:    total,
		HasMore:  hasMore,
	})
}

// SendMessage sends a new message
func (h *Handler) SendMessage(w http.ResponseWriter, r *http.Request) {
	dealershipID := getDealershipID(r)
	userID := getUserID(r)
	conversationID := mux.Vars(r)["conversationId"]

	if dealershipID == "" || userID == "" {
		respondError(w, http.StatusBadRequest, "Missing required headers")
		return
	}

	var req SendMessageRequest
	if !decodeAndValidateMessaging(r, w, &req) {
		return
	}

	message, err := h.db.CreateMessage(conversationID, dealershipID, userID, req)
	if err != nil {
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to create message")
		respondError(w, http.StatusInternalServerError, "Failed to send message")
		return
	}

	// Broadcast to conversation (excluding sender)
	h.hub.BroadcastToConversation(conversationID, WSEventMessageSent, message, userID)

	// Clear typing indicator
	h.hub.SetTyping(conversationID, userID, getUserName(r), false)

	respondJSON(w, http.StatusCreated, message)
}

// GetMessage gets a single message
func (h *Handler) GetMessage(w http.ResponseWriter, r *http.Request) {
	conversationID := mux.Vars(r)["conversationId"]
	messageID := mux.Vars(r)["messageId"]

	message, err := h.db.GetMessage(messageID, conversationID)
	if err != nil {
		if err.Error() == "message not found" {
			respondError(w, http.StatusNotFound, "Message not found")
			return
		}
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to get message")
		respondError(w, http.StatusInternalServerError, "Failed to get message")
		return
	}

	respondJSON(w, http.StatusOK, message)
}

// UpdateMessage updates a message
func (h *Handler) UpdateMessage(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	conversationID := mux.Vars(r)["conversationId"]
	messageID := mux.Vars(r)["messageId"]

	if userID == "" {
		respondError(w, http.StatusBadRequest, "Missing user ID")
		return
	}

	var req UpdateMessageRequest
	if !decodeAndValidateMessaging(r, w, &req) {
		return
	}

	message, err := h.db.UpdateMessage(messageID, conversationID, userID, req)
	if err != nil {
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to update message")
		respondError(w, http.StatusInternalServerError, "Failed to update message")
		return
	}

	// Broadcast update
	h.hub.BroadcastToConversation(conversationID, WSEventMessageUpdated, message, "")

	respondJSON(w, http.StatusOK, message)
}

// DeleteMessage deletes a message
func (h *Handler) DeleteMessage(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	conversationID := mux.Vars(r)["conversationId"]
	messageID := mux.Vars(r)["messageId"]

	if userID == "" {
		respondError(w, http.StatusBadRequest, "Missing user ID")
		return
	}

	err := h.db.DeleteMessage(messageID, conversationID, userID)
	if err != nil {
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to delete message")
		respondError(w, http.StatusInternalServerError, "Failed to delete message")
		return
	}

	// Broadcast deletion
	h.hub.BroadcastToConversation(conversationID, WSEventMessageDeleted, map[string]string{
		"message_id": messageID,
	}, "")

	respondJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// MarkAsRead marks messages as read
func (h *Handler) MarkAsRead(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	conversationID := mux.Vars(r)["conversationId"]

	if userID == "" {
		respondError(w, http.StatusBadRequest, "Missing user ID")
		return
	}

	err := h.db.MarkAsRead(conversationID, userID)
	if err != nil {
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to mark as read")
		respondError(w, http.StatusInternalServerError, "Failed to mark as read")
		return
	}

	// Broadcast read receipt
	h.hub.BroadcastToConversation(conversationID, WSEventMessageRead, map[string]string{
		"user_id":         userID,
		"conversation_id": conversationID,
	}, userID)

	respondJSON(w, http.StatusOK, map[string]string{"status": "read"})
}

// Reaction Handlers

// AddReaction adds a reaction to a message
func (h *Handler) AddReaction(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	userName := getUserName(r)
	conversationID := mux.Vars(r)["conversationId"]
	messageID := mux.Vars(r)["messageId"]

	if userID == "" {
		respondError(w, http.StatusBadRequest, "Missing user ID")
		return
	}

	var req AddReactionRequest
	if !decodeAndValidateMessaging(r, w, &req) {
		return
	}

	reaction, err := h.db.AddReaction(messageID, userID, userName, req)
	if err != nil {
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to add reaction")
		respondError(w, http.StatusInternalServerError, "Failed to add reaction")
		return
	}

	// Broadcast reaction
	h.hub.BroadcastToConversation(conversationID, WSEventReactionAdded, reaction, "")

	respondJSON(w, http.StatusCreated, reaction)
}

// RemoveReaction removes a reaction from a message
func (h *Handler) RemoveReaction(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	conversationID := mux.Vars(r)["conversationId"]
	messageID := mux.Vars(r)["messageId"]
	reactionType := mux.Vars(r)["reactionType"]

	if userID == "" {
		respondError(w, http.StatusBadRequest, "Missing user ID")
		return
	}

	err := h.db.RemoveReaction(messageID, userID, reactionType)
	if err != nil {
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to remove reaction")
		respondError(w, http.StatusInternalServerError, "Failed to remove reaction")
		return
	}

	// Broadcast removal
	h.hub.BroadcastToConversation(conversationID, WSEventReactionRemoved, map[string]string{
		"message_id":    messageID,
		"user_id":       userID,
		"reaction_type": reactionType,
	}, "")

	respondJSON(w, http.StatusOK, map[string]string{"status": "removed"})
}

// Typing Indicator

// SetTyping handles typing indicator
func (h *Handler) SetTyping(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	userName := getUserName(r)
	conversationID := mux.Vars(r)["conversationId"]

	if userID == "" {
		respondError(w, http.StatusBadRequest, "Missing user ID")
		return
	}

	var req struct {
		IsTyping bool `json:"is_typing"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	h.hub.SetTyping(conversationID, userID, userName, req.IsTyping)

	respondJSON(w, http.StatusOK, map[string]bool{"is_typing": req.IsTyping})
}

// Participant Handlers

// AddParticipant adds a participant to a group conversation
func (h *Handler) AddParticipant(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	dealershipID := getDealershipID(r)
	conversationID := mux.Vars(r)["conversationId"]

	if userID == "" || dealershipID == "" {
		respondError(w, http.StatusBadRequest, "Missing required headers")
		return
	}

	var req struct {
		UserID string `json:"user_id"`
		Role   string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Role == "" {
		req.Role = "MEMBER"
	}

	participant, err := h.db.AddParticipant(conversationID, req.UserID, userID, req.Role)
	if err != nil {
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to add participant")
		respondError(w, http.StatusInternalServerError, "Failed to add participant")
		return
	}

	// Broadcast to conversation
	h.hub.BroadcastToConversation(conversationID, WSEventParticipantJoined, participant, "")

	// Notify the added user
	h.hub.BroadcastToUser(req.UserID, WSEventConversationCreated, map[string]string{
		"conversation_id": conversationID,
	})

	respondJSON(w, http.StatusCreated, participant)
}

// RemoveParticipant removes a participant from a group conversation
func (h *Handler) RemoveParticipant(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	conversationID := mux.Vars(r)["conversationId"]
	participantUserID := mux.Vars(r)["userId"]

	if userID == "" {
		respondError(w, http.StatusBadRequest, "Missing user ID")
		return
	}

	err := h.db.RemoveParticipant(conversationID, participantUserID, userID)
	if err != nil {
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to remove participant")
		respondError(w, http.StatusInternalServerError, "Failed to remove participant")
		return
	}

	// Broadcast to conversation
	h.hub.BroadcastToConversation(conversationID, WSEventParticipantLeft, map[string]string{
		"user_id": participantUserID,
	}, "")

	respondJSON(w, http.StatusOK, map[string]string{"status": "removed"})
}

// GetParticipants gets all participants in a conversation
func (h *Handler) GetParticipants(w http.ResponseWriter, r *http.Request) {
	conversationID := mux.Vars(r)["conversationId"]

	participants, err := h.db.GetParticipants(conversationID)
	if err != nil {
		h.logger.WithContext(r.Context()).WithError(err).Error("Failed to get participants")
		respondError(w, http.StatusInternalServerError, "Failed to get participants")
		return
	}

	// Update presence
	for i := range participants {
		participants[i].Presence = h.hub.GetUserPresence(participants[i].UserID)
	}

	respondJSON(w, http.StatusOK, participants)
}
