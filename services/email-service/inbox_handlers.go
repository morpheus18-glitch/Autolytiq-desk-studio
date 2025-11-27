package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// =====================================================
// REQUEST/RESPONSE TYPES
// =====================================================

// ComposeEmailRequest represents a request to compose/send an email
type ComposeEmailRequest struct {
	DealershipID string   `json:"dealership_id"`
	UserID       string   `json:"user_id"`
	To           []string `json:"to"`
	ToNames      []string `json:"to_names,omitempty"`
	Cc           []string `json:"cc,omitempty"`
	CcNames      []string `json:"cc_names,omitempty"`
	Bcc          []string `json:"bcc,omitempty"`
	Subject      string   `json:"subject"`
	BodyHTML     string   `json:"body_html"`
	BodyText     string   `json:"body_text,omitempty"`
	ReplyTo      string   `json:"reply_to,omitempty"`
	ThreadID     string   `json:"thread_id,omitempty"`
	Attachments  []string `json:"attachments,omitempty"` // Attachment IDs
	ScheduleFor  string   `json:"schedule_for,omitempty"`
	SaveAsDraft  bool     `json:"save_as_draft,omitempty"`
}

// DraftRequest represents a draft save/update request
type DraftRequest struct {
	DealershipID string   `json:"dealership_id"`
	UserID       string   `json:"user_id"`
	To           []string `json:"to"`
	ToNames      []string `json:"to_names,omitempty"`
	Cc           []string `json:"cc,omitempty"`
	CcNames      []string `json:"cc_names,omitempty"`
	Bcc          []string `json:"bcc,omitempty"`
	BccNames     []string `json:"bcc_names,omitempty"`
	Subject      string   `json:"subject"`
	BodyHTML     string   `json:"body_html"`
	BodyText     string   `json:"body_text,omitempty"`
	ReplyTo      string   `json:"reply_to,omitempty"`
	ThreadID     string   `json:"thread_id,omitempty"`
}

// BatchActionRequest represents a batch action on multiple emails
type BatchActionRequest struct {
	DealershipID string   `json:"dealership_id"`
	UserID       string   `json:"user_id"`
	EmailIDs     []string `json:"email_ids"`
	Action       string   `json:"action"` // "read", "unread", "star", "archive", "delete", "move"
	Folder       string   `json:"folder,omitempty"`
	Labels       []string `json:"labels,omitempty"`
}

// LabelRequest represents a label create/update request
type LabelRequest struct {
	DealershipID string `json:"dealership_id"`
	UserID       string `json:"user_id"`
	Name         string `json:"name"`
	Color        string `json:"color"`
}

// SignatureRequest represents a signature create/update request
type SignatureRequest struct {
	DealershipID  string `json:"dealership_id"`
	UserID        string `json:"user_id"`
	Name          string `json:"name"`
	SignatureHTML string `json:"signature_html"`
	IsDefault     bool   `json:"is_default"`
}

// =====================================================
// INBOX HANDLERS
// =====================================================

// ListInboxHandler lists emails in the inbox
func (s *Server) ListInboxHandler(w http.ResponseWriter, r *http.Request) {
	dealershipID := r.URL.Query().Get("dealership_id")
	userID := r.URL.Query().Get("user_id")

	if !validateUUID(w, dealershipID, "dealership_id") || !validateUUID(w, userID, "user_id") {
		return
	}

	// Build filter from query params
	filter := &EmailListFilter{
		DealershipID: dealershipID,
		UserID:       userID,
		Folder:       EmailFolder(r.URL.Query().Get("folder")),
		SortBy:       r.URL.Query().Get("sort_by"),
		SortOrder:    r.URL.Query().Get("sort_order"),
	}

	// Set default folder to inbox
	if filter.Folder == "" {
		filter.Folder = FolderInbox
	}

	// Parse boolean filters
	if isRead := r.URL.Query().Get("is_read"); isRead != "" {
		val := isRead == "true"
		filter.IsRead = &val
	}
	if isStarred := r.URL.Query().Get("is_starred"); isStarred != "" {
		val := isStarred == "true"
		filter.IsStarred = &val
	}
	if hasAttach := r.URL.Query().Get("has_attachments"); hasAttach != "" {
		val := hasAttach == "true"
		filter.HasAttachments = &val
	}

	// Parse search filters
	filter.FromEmail = r.URL.Query().Get("from")
	filter.Subject = r.URL.Query().Get("subject")
	filter.Query = r.URL.Query().Get("q")

	// Parse labels
	if labels := r.URL.Query().Get("labels"); labels != "" {
		filter.Labels = strings.Split(labels, ",")
	}

	// Parse pagination
	if limit := r.URL.Query().Get("limit"); limit != "" {
		if val, err := strconv.Atoi(limit); err == nil {
			filter.Limit = val
		}
	}
	if offset := r.URL.Query().Get("offset"); offset != "" {
		if val, err := strconv.Atoi(offset); err == nil {
			filter.Offset = val
		}
	}

	result, err := s.db.ListEmails(filter)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to list emails")
		http.Error(w, "Failed to list emails", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// GetEmailHandler retrieves a single email
func (s *Server) GetEmailHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	emailID := vars["id"]

	if !validateUUID(w, emailID, "id") {
		return
	}

	dealershipID := r.URL.Query().Get("dealership_id")
	userID := r.URL.Query().Get("user_id")

	if !validateUUID(w, dealershipID, "dealership_id") || !validateUUID(w, userID, "user_id") {
		return
	}

	email, err := s.db.GetEmail(emailID, dealershipID, userID)
	if err != nil {
		http.Error(w, "Email not found", http.StatusNotFound)
		return
	}

	// Load attachments
	attachments, err := s.db.ListAttachmentsByEmail(emailID)
	if err == nil {
		email.Attachments = make([]Attachment, len(attachments))
		for i, a := range attachments {
			email.Attachments[i] = *a
		}
	}

	// Mark as read automatically when viewing
	if !email.IsRead {
		s.db.MarkAsRead([]string{emailID}, dealershipID, userID)
		email.IsRead = true
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(email)
}

// ComposeEmailHandler handles composing and sending emails
func (s *Server) ComposeEmailHandler(w http.ResponseWriter, r *http.Request) {
	var req ComposeEmailRequest
	if !decodeAndValidate(r, w, &req) {
		return
	}

	// Validate required fields
	if len(req.To) == 0 {
		http.Error(w, "At least one recipient is required", http.StatusBadRequest)
		return
	}
	if req.Subject == "" {
		req.Subject = "(No Subject)"
	}

	// If saving as draft
	if req.SaveAsDraft {
		draft := &EmailDraft{
			ID:           uuid.New().String(),
			DealershipID: req.DealershipID,
			UserID:       req.UserID,
			ToEmails:     req.To,
			ToNames:      req.ToNames,
			CcEmails:     req.Cc,
			CcNames:      req.CcNames,
			BccEmails:    req.Bcc,
			Subject:      req.Subject,
			BodyHTML:     req.BodyHTML,
			BodyText:     req.BodyText,
			Attachments:  req.Attachments,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		}

		if req.ThreadID != "" {
			draft.ThreadID = &req.ThreadID
		}
		if req.ReplyTo != "" {
			draft.InReplyTo = &req.ReplyTo
		}

		if err := s.db.CreateDraft(draft); err != nil {
			s.logger.WithContext(r.Context()).WithError(err).Error("Failed to save draft")
			http.Error(w, "Failed to save draft", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(draft)
		return
	}

	// Create snippet from body
	snippet := req.BodyText
	if snippet == "" {
		// Strip HTML for snippet
		snippet = stripHTML(req.BodyHTML)
	}
	if len(snippet) > 100 {
		snippet = snippet[:100] + "..."
	}

	// Generate message ID
	emailID := uuid.New().String()
	messageID := fmt.Sprintf("<%s@autolytiq.com>", emailID)

	// Create email record
	email := &Email{
		ID:           emailID,
		DealershipID: req.DealershipID,
		UserID:       req.UserID,
		MessageID:    messageID,
		Folder:       FolderSent,
		FromEmail:    s.config.SMTPFromEmail,
		FromName:     s.config.SMTPFromName,
		ToEmails:     req.To,
		ToNames:      req.ToNames,
		CcEmails:     req.Cc,
		CcNames:      req.CcNames,
		BccEmails:    req.Bcc,
		Subject:      req.Subject,
		BodyHTML:     req.BodyHTML,
		BodyText:     req.BodyText,
		Snippet:      snippet,
		IsRead:       true, // Sent emails are read
		ReceivedAt:   time.Now(),
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if req.ReplyTo != "" {
		email.InReplyTo = &req.ReplyTo
	}

	// Check for attachments
	if len(req.Attachments) > 0 {
		email.HasAttachments = true
	}

	// Get or create thread
	if req.ThreadID != "" {
		email.ThreadID = req.ThreadID
	} else {
		threadID, err := s.db.GetOrCreateThread(email)
		if err != nil {
			s.logger.WithContext(r.Context()).WithError(err).Error("Failed to create thread")
			http.Error(w, "Failed to create thread", http.StatusInternalServerError)
			return
		}
		email.ThreadID = threadID
	}

	// Save email to database
	if err := s.db.CreateEmail(email); err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to save email")
		http.Error(w, "Failed to save email", http.StatusInternalServerError)
		return
	}

	// Move attachments from temporary to email
	for _, attachID := range req.Attachments {
		s.db.MoveAttachmentToEmail(attachID, emailID)
	}

	// Send via SMTP
	recipients := strings.Join(req.To, ", ")
	if err := s.smtpClient.SendEmail(recipients, req.Subject, req.BodyHTML); err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to send email via SMTP")
		// Email is saved but not sent
		http.Error(w, "Email saved but failed to send", http.StatusAccepted)
		return
	}

	// Update sent timestamp
	sentAt := time.Now()
	email.SentAt = &sentAt

	s.logger.WithContext(r.Context()).WithField("email_id", emailID).Info("Email sent successfully")

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":  "Email sent successfully",
		"email_id": emailID,
		"email":    email,
	})
}

// BatchActionHandler handles batch actions on emails
func (s *Server) BatchActionHandler(w http.ResponseWriter, r *http.Request) {
	var req BatchActionRequest
	if !decodeAndValidate(r, w, &req) {
		return
	}

	if len(req.EmailIDs) == 0 {
		http.Error(w, "No email IDs provided", http.StatusBadRequest)
		return
	}

	var err error

	switch req.Action {
	case "read":
		err = s.db.MarkAsRead(req.EmailIDs, req.DealershipID, req.UserID)
	case "unread":
		err = s.db.MarkAsUnread(req.EmailIDs, req.DealershipID, req.UserID)
	case "archive":
		err = s.db.ArchiveEmails(req.EmailIDs, req.DealershipID, req.UserID)
	case "unarchive":
		err = s.db.UnarchiveEmails(req.EmailIDs, req.DealershipID, req.UserID)
	case "delete":
		err = s.db.BatchDeleteEmails(req.EmailIDs, req.DealershipID, req.UserID, false)
	case "delete_permanent":
		err = s.db.BatchDeleteEmails(req.EmailIDs, req.DealershipID, req.UserID, true)
	case "move":
		if req.Folder == "" {
			http.Error(w, "Folder is required for move action", http.StatusBadRequest)
			return
		}
		err = s.db.MoveToFolder(req.EmailIDs, req.DealershipID, req.UserID, EmailFolder(req.Folder))
	case "add_labels":
		if len(req.Labels) == 0 {
			http.Error(w, "Labels are required for add_labels action", http.StatusBadRequest)
			return
		}
		err = s.db.AddLabels(req.EmailIDs, req.DealershipID, req.UserID, req.Labels)
	case "remove_labels":
		if len(req.Labels) == 0 {
			http.Error(w, "Labels are required for remove_labels action", http.StatusBadRequest)
			return
		}
		err = s.db.RemoveLabels(req.EmailIDs, req.DealershipID, req.UserID, req.Labels)
	default:
		http.Error(w, "Invalid action", http.StatusBadRequest)
		return
	}

	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Batch action failed")
		http.Error(w, "Action failed", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":   "Action completed successfully",
		"action":    req.Action,
		"affected":  len(req.EmailIDs),
		"email_ids": req.EmailIDs,
	})
}

// ToggleStarHandler toggles star on an email
func (s *Server) ToggleStarHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	emailID := vars["id"]

	if !validateUUID(w, emailID, "id") {
		return
	}

	dealershipID := r.URL.Query().Get("dealership_id")
	userID := r.URL.Query().Get("user_id")

	if !validateUUID(w, dealershipID, "dealership_id") || !validateUUID(w, userID, "user_id") {
		return
	}

	if err := s.db.ToggleStar(emailID, dealershipID, userID); err != nil {
		http.Error(w, "Failed to toggle star", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Star toggled"})
}

// SearchEmailsHandler handles email search
func (s *Server) SearchEmailsHandler(w http.ResponseWriter, r *http.Request) {
	dealershipID := r.URL.Query().Get("dealership_id")
	userID := r.URL.Query().Get("user_id")
	query := r.URL.Query().Get("q")

	if !validateUUID(w, dealershipID, "dealership_id") || !validateUUID(w, userID, "user_id") {
		return
	}

	if query == "" {
		http.Error(w, "Search query is required", http.StatusBadRequest)
		return
	}

	limit := 50
	offset := 0

	if l := r.URL.Query().Get("limit"); l != "" {
		if val, err := strconv.Atoi(l); err == nil {
			limit = val
		}
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		if val, err := strconv.Atoi(o); err == nil {
			offset = val
		}
	}

	result, err := s.db.SearchEmails(dealershipID, userID, query, limit, offset)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Search failed")
		http.Error(w, "Search failed", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// GetStatsHandler returns email statistics
func (s *Server) GetStatsHandler(w http.ResponseWriter, r *http.Request) {
	dealershipID := r.URL.Query().Get("dealership_id")
	userID := r.URL.Query().Get("user_id")

	if !validateUUID(w, dealershipID, "dealership_id") || !validateUUID(w, userID, "user_id") {
		return
	}

	stats, err := s.db.GetEmailStats(dealershipID, userID)
	if err != nil {
		http.Error(w, "Failed to get stats", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// =====================================================
// THREAD HANDLERS
// =====================================================

// ListThreadsHandler lists email threads
func (s *Server) ListThreadsHandler(w http.ResponseWriter, r *http.Request) {
	dealershipID := r.URL.Query().Get("dealership_id")
	userID := r.URL.Query().Get("user_id")

	if !validateUUID(w, dealershipID, "dealership_id") || !validateUUID(w, userID, "user_id") {
		return
	}

	filter := &ThreadListFilter{
		DealershipID: dealershipID,
		UserID:       userID,
		Folder:       EmailFolder(r.URL.Query().Get("folder")),
	}

	if filter.Folder == "" {
		filter.Folder = FolderInbox
	}

	// Parse boolean filters
	if isRead := r.URL.Query().Get("is_read"); isRead != "" {
		val := isRead == "true"
		filter.IsRead = &val
	}
	if isStarred := r.URL.Query().Get("is_starred"); isStarred != "" {
		val := isStarred == "true"
		filter.IsStarred = &val
	}

	// Parse pagination
	if limit := r.URL.Query().Get("limit"); limit != "" {
		if val, err := strconv.Atoi(limit); err == nil {
			filter.Limit = val
		}
	}
	if offset := r.URL.Query().Get("offset"); offset != "" {
		if val, err := strconv.Atoi(offset); err == nil {
			filter.Offset = val
		}
	}

	result, err := s.db.ListThreads(filter)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to list threads")
		http.Error(w, "Failed to list threads", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// GetThreadHandler retrieves a thread with all messages
func (s *Server) GetThreadHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	threadID := vars["id"]

	if !validateUUID(w, threadID, "id") {
		return
	}

	dealershipID := r.URL.Query().Get("dealership_id")
	userID := r.URL.Query().Get("user_id")

	if !validateUUID(w, dealershipID, "dealership_id") || !validateUUID(w, userID, "user_id") {
		return
	}

	thread, err := s.db.GetThread(threadID, dealershipID, userID)
	if err != nil {
		http.Error(w, "Thread not found", http.StatusNotFound)
		return
	}

	// Mark all messages as read
	var emailIDs []string
	for _, msg := range thread.Messages {
		if !msg.IsRead {
			emailIDs = append(emailIDs, msg.ID)
		}
	}
	if len(emailIDs) > 0 {
		s.db.MarkAsRead(emailIDs, dealershipID, userID)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(thread)
}

// =====================================================
// DRAFT HANDLERS
// =====================================================

// ListDraftsHandler lists all drafts
func (s *Server) ListDraftsHandler(w http.ResponseWriter, r *http.Request) {
	dealershipID := r.URL.Query().Get("dealership_id")
	userID := r.URL.Query().Get("user_id")

	if !validateUUID(w, dealershipID, "dealership_id") || !validateUUID(w, userID, "user_id") {
		return
	}

	limit := 50
	offset := 0

	if l := r.URL.Query().Get("limit"); l != "" {
		if val, err := strconv.Atoi(l); err == nil {
			limit = val
		}
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		if val, err := strconv.Atoi(o); err == nil {
			offset = val
		}
	}

	drafts, err := s.db.ListDrafts(dealershipID, userID, limit, offset)
	if err != nil {
		http.Error(w, "Failed to list drafts", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(drafts)
}

// GetDraftHandler retrieves a single draft
func (s *Server) GetDraftHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	draftID := vars["id"]

	if !validateUUID(w, draftID, "id") {
		return
	}

	dealershipID := r.URL.Query().Get("dealership_id")
	userID := r.URL.Query().Get("user_id")

	if !validateUUID(w, dealershipID, "dealership_id") || !validateUUID(w, userID, "user_id") {
		return
	}

	draft, err := s.db.GetDraft(draftID, dealershipID, userID)
	if err != nil {
		http.Error(w, "Draft not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(draft)
}

// SaveDraftHandler creates or updates a draft
func (s *Server) SaveDraftHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	draftID := vars["id"]

	var req DraftRequest
	if !decodeAndValidate(r, w, &req) {
		return
	}

	now := time.Now()

	if draftID != "" {
		// Update existing draft
		if !validateUUID(w, draftID, "id") {
			return
		}

		draft := &EmailDraft{
			ID:           draftID,
			DealershipID: req.DealershipID,
			UserID:       req.UserID,
			ToEmails:     req.To,
			ToNames:      req.ToNames,
			CcEmails:     req.Cc,
			CcNames:      req.CcNames,
			BccEmails:    req.Bcc,
			BccNames:     req.BccNames,
			Subject:      req.Subject,
			BodyHTML:     req.BodyHTML,
			BodyText:     req.BodyText,
			UpdatedAt:    now,
		}

		if req.ThreadID != "" {
			draft.ThreadID = &req.ThreadID
		}
		if req.ReplyTo != "" {
			draft.InReplyTo = &req.ReplyTo
		}

		if err := s.db.UpdateDraft(draft); err != nil {
			http.Error(w, "Failed to update draft", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(draft)
	} else {
		// Create new draft
		draft := &EmailDraft{
			ID:           uuid.New().String(),
			DealershipID: req.DealershipID,
			UserID:       req.UserID,
			ToEmails:     req.To,
			ToNames:      req.ToNames,
			CcEmails:     req.Cc,
			CcNames:      req.CcNames,
			BccEmails:    req.Bcc,
			BccNames:     req.BccNames,
			Subject:      req.Subject,
			BodyHTML:     req.BodyHTML,
			BodyText:     req.BodyText,
			CreatedAt:    now,
			UpdatedAt:    now,
		}

		if req.ThreadID != "" {
			draft.ThreadID = &req.ThreadID
		}
		if req.ReplyTo != "" {
			draft.InReplyTo = &req.ReplyTo
		}

		if err := s.db.CreateDraft(draft); err != nil {
			http.Error(w, "Failed to create draft", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(draft)
	}
}

// DeleteDraftHandler deletes a draft
func (s *Server) DeleteDraftHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	draftID := vars["id"]

	if !validateUUID(w, draftID, "id") {
		return
	}

	dealershipID := r.URL.Query().Get("dealership_id")
	userID := r.URL.Query().Get("user_id")

	if !validateUUID(w, dealershipID, "dealership_id") || !validateUUID(w, userID, "user_id") {
		return
	}

	if err := s.db.DeleteDraft(draftID, dealershipID, userID); err != nil {
		http.Error(w, "Failed to delete draft", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// SendDraftHandler sends a draft
func (s *Server) SendDraftHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	draftID := vars["id"]

	if !validateUUID(w, draftID, "id") {
		return
	}

	dealershipID := r.URL.Query().Get("dealership_id")
	userID := r.URL.Query().Get("user_id")

	if !validateUUID(w, dealershipID, "dealership_id") || !validateUUID(w, userID, "user_id") {
		return
	}

	// Get draft
	draft, err := s.db.GetDraft(draftID, dealershipID, userID)
	if err != nil {
		http.Error(w, "Draft not found", http.StatusNotFound)
		return
	}

	// Send email
	recipients := strings.Join(draft.ToEmails, ", ")
	if err := s.smtpClient.SendEmail(recipients, draft.Subject, draft.BodyHTML); err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to send draft")
		http.Error(w, "Failed to send email", http.StatusInternalServerError)
		return
	}

	// Convert draft to sent email
	email, err := s.db.SendDraft(draftID, dealershipID, userID)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to convert draft to email")
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":  "Email sent successfully",
		"email_id": email.ID,
	})
}

// =====================================================
// LABEL HANDLERS
// =====================================================

// ListLabelsHandler lists all custom labels
func (s *Server) ListLabelsHandler(w http.ResponseWriter, r *http.Request) {
	dealershipID := r.URL.Query().Get("dealership_id")
	userID := r.URL.Query().Get("user_id")

	if !validateUUID(w, dealershipID, "dealership_id") || !validateUUID(w, userID, "user_id") {
		return
	}

	labels, err := s.db.ListLabels(dealershipID, userID)
	if err != nil {
		http.Error(w, "Failed to list labels", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(labels)
}

// CreateLabelHandler creates a new label
func (s *Server) CreateLabelHandler(w http.ResponseWriter, r *http.Request) {
	var req LabelRequest
	if !decodeAndValidate(r, w, &req) {
		return
	}

	label := &EmailLabel{
		ID:           uuid.New().String(),
		DealershipID: req.DealershipID,
		UserID:       req.UserID,
		Name:         req.Name,
		Color:        req.Color,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if label.Color == "" {
		label.Color = "#6366f1"
	}

	if err := s.db.CreateLabel(label); err != nil {
		http.Error(w, "Failed to create label", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(label)
}

// UpdateLabelHandler updates a label
func (s *Server) UpdateLabelHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	labelID := vars["id"]

	if !validateUUID(w, labelID, "id") {
		return
	}

	var req LabelRequest
	if !decodeAndValidate(r, w, &req) {
		return
	}

	label := &EmailLabel{
		ID:           labelID,
		DealershipID: req.DealershipID,
		UserID:       req.UserID,
		Name:         req.Name,
		Color:        req.Color,
		UpdatedAt:    time.Now(),
	}

	if err := s.db.UpdateLabel(label); err != nil {
		http.Error(w, "Failed to update label", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(label)
}

// DeleteLabelHandler deletes a label
func (s *Server) DeleteLabelHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	labelID := vars["id"]

	if !validateUUID(w, labelID, "id") {
		return
	}

	dealershipID := r.URL.Query().Get("dealership_id")
	userID := r.URL.Query().Get("user_id")

	if !validateUUID(w, dealershipID, "dealership_id") || !validateUUID(w, userID, "user_id") {
		return
	}

	if err := s.db.DeleteLabel(labelID, dealershipID, userID); err != nil {
		http.Error(w, "Failed to delete label", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// =====================================================
// SIGNATURE HANDLERS
// =====================================================

// ListSignaturesHandler lists all signatures
func (s *Server) ListSignaturesHandler(w http.ResponseWriter, r *http.Request) {
	dealershipID := r.URL.Query().Get("dealership_id")
	userID := r.URL.Query().Get("user_id")

	if !validateUUID(w, dealershipID, "dealership_id") || !validateUUID(w, userID, "user_id") {
		return
	}

	signatures, err := s.db.ListSignatures(dealershipID, userID)
	if err != nil {
		http.Error(w, "Failed to list signatures", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(signatures)
}

// CreateSignatureHandler creates a new signature
func (s *Server) CreateSignatureHandler(w http.ResponseWriter, r *http.Request) {
	var req SignatureRequest
	if !decodeAndValidate(r, w, &req) {
		return
	}

	signature := &EmailSignature{
		ID:            uuid.New().String(),
		DealershipID:  req.DealershipID,
		UserID:        req.UserID,
		Name:          req.Name,
		SignatureHTML: req.SignatureHTML,
		IsDefault:     req.IsDefault,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if err := s.db.CreateSignature(signature); err != nil {
		http.Error(w, "Failed to create signature", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(signature)
}

// UpdateSignatureHandler updates a signature
func (s *Server) UpdateSignatureHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	signatureID := vars["id"]

	if !validateUUID(w, signatureID, "id") {
		return
	}

	var req SignatureRequest
	if !decodeAndValidate(r, w, &req) {
		return
	}

	signature := &EmailSignature{
		ID:            signatureID,
		DealershipID:  req.DealershipID,
		UserID:        req.UserID,
		Name:          req.Name,
		SignatureHTML: req.SignatureHTML,
		IsDefault:     req.IsDefault,
		UpdatedAt:     time.Now(),
	}

	if err := s.db.UpdateSignature(signature); err != nil {
		http.Error(w, "Failed to update signature", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(signature)
}

// DeleteSignatureHandler deletes a signature
func (s *Server) DeleteSignatureHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	signatureID := vars["id"]

	if !validateUUID(w, signatureID, "id") {
		return
	}

	dealershipID := r.URL.Query().Get("dealership_id")
	userID := r.URL.Query().Get("user_id")

	if !validateUUID(w, dealershipID, "dealership_id") || !validateUUID(w, userID, "user_id") {
		return
	}

	if err := s.db.DeleteSignature(signatureID, dealershipID, userID); err != nil {
		http.Error(w, "Failed to delete signature", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

// stripHTML removes HTML tags from text
func stripHTML(html string) string {
	// Simple HTML stripping - in production use a proper library
	text := html
	text = strings.ReplaceAll(text, "<br>", " ")
	text = strings.ReplaceAll(text, "<br/>", " ")
	text = strings.ReplaceAll(text, "<br />", " ")
	text = strings.ReplaceAll(text, "</p>", " ")
	text = strings.ReplaceAll(text, "</div>", " ")

	// Remove all HTML tags
	inTag := false
	result := strings.Builder{}
	for _, r := range text {
		if r == '<' {
			inTag = true
		} else if r == '>' {
			inTag = false
		} else if !inTag {
			result.WriteRune(r)
		}
	}

	// Clean up whitespace
	text = result.String()
	text = strings.Join(strings.Fields(text), " ")
	return strings.TrimSpace(text)
}
