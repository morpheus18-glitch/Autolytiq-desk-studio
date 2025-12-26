package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// =====================================================
// LOCAL FILE STORAGE (Development)
// =====================================================

// LocalStorage handles local file storage for attachments in development
type LocalStorage struct {
	basePath string
}

// NewLocalStorage creates a new local storage handler
func NewLocalStorage(basePath string) (*LocalStorage, error) {
	// Ensure the storage directory exists
	if err := os.MkdirAll(basePath, 0755); err != nil {
		return nil, fmt.Errorf("failed to create storage directory: %w", err)
	}
	return &LocalStorage{basePath: basePath}, nil
}

// SaveFile saves a file to local storage
func (ls *LocalStorage) SaveFile(key string, reader io.Reader) error {
	fullPath := filepath.Join(ls.basePath, key)

	// Ensure directory exists
	dir := filepath.Dir(fullPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	file, err := os.Create(fullPath)
	if err != nil {
		return fmt.Errorf("failed to create file: %w", err)
	}
	defer file.Close()

	if _, err := io.Copy(file, reader); err != nil {
		return fmt.Errorf("failed to write file: %w", err)
	}

	return nil
}

// GetFile retrieves a file from local storage
func (ls *LocalStorage) GetFile(key string) (*os.File, error) {
	fullPath := filepath.Join(ls.basePath, key)
	return os.Open(fullPath)
}

// DeleteFile deletes a file from local storage
func (ls *LocalStorage) DeleteFile(key string) error {
	fullPath := filepath.Join(ls.basePath, key)
	return os.Remove(fullPath)
}

// FileExists checks if a file exists
func (ls *LocalStorage) FileExists(key string) bool {
	fullPath := filepath.Join(ls.basePath, key)
	_, err := os.Stat(fullPath)
	return err == nil
}

// =====================================================
// ATTACHMENT HANDLERS
// =====================================================

// getStoragePath returns the storage path for attachments
func getStoragePath() string {
	path := os.Getenv("ATTACHMENT_STORAGE_PATH")
	if path == "" {
		path = "/tmp/autolytiq-attachments"
	}
	return path
}

// UploadAttachmentHandler handles file upload for attachments
func (s *Server) UploadAttachmentHandler(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form (max 25MB per file)
	if err := r.ParseMultipartForm(25 << 20); err != nil {
		http.Error(w, "File too large (max 25MB)", http.StatusBadRequest)
		return
	}

	dealershipID := r.FormValue("dealership_id")
	draftID := r.FormValue("draft_id") // Optional - if attaching to a draft

	if !validateUUID(w, dealershipID, "dealership_id") {
		return
	}

	// Get the file
	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "No file provided", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Generate storage key
	attachmentID := uuid.New().String()
	ext := filepath.Ext(header.Filename)
	storageKey := fmt.Sprintf("attachments/%s/%s%s", dealershipID, attachmentID, ext)

	// Determine content type
	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	// Save to local storage
	storage, err := NewLocalStorage(getStoragePath())
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to initialize storage")
		http.Error(w, "Storage service unavailable", http.StatusServiceUnavailable)
		return
	}

	if err := storage.SaveFile(storageKey, file); err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to save file")
		http.Error(w, "Failed to upload file", http.StatusInternalServerError)
		return
	}

	// Create attachment record
	attachment := &Attachment{
		ID:           attachmentID,
		DealershipID: dealershipID,
		Filename:     header.Filename,
		ContentType:  contentType,
		Size:         header.Size,
		S3Key:        storageKey, // Reusing field for storage key
		S3Bucket:     "local",    // Indicates local storage
		CreatedAt:    time.Now(),
	}

	if draftID != "" && validateUUIDString(draftID) {
		attachment.DraftID = &draftID
	}

	if err := s.db.CreateAttachment(attachment); err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to save attachment")
		http.Error(w, "Failed to save attachment", http.StatusInternalServerError)
		return
	}

	s.logger.WithContext(r.Context()).
		WithField("attachment_id", attachmentID).
		WithField("filename", header.Filename).
		Info("Attachment uploaded")

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(attachment)
}

// GetAttachmentHandler retrieves attachment metadata
func (s *Server) GetAttachmentHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	attachmentID := vars["id"]

	if !validateUUID(w, attachmentID, "id") {
		return
	}

	dealershipID := r.URL.Query().Get("dealership_id")
	if !validateUUID(w, dealershipID, "dealership_id") {
		return
	}

	attachment, err := s.db.GetAttachment(attachmentID, dealershipID)
	if err != nil {
		http.Error(w, "Attachment not found", http.StatusNotFound)
		return
	}

	// Provide download URL
	attachment.DownloadURL = fmt.Sprintf("/api/v1/email/attachments/%s/download?dealership_id=%s", attachmentID, dealershipID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(attachment)
}

// DownloadAttachmentHandler handles direct file download
func (s *Server) DownloadAttachmentHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	attachmentID := vars["id"]

	if !validateUUID(w, attachmentID, "id") {
		return
	}

	dealershipID := r.URL.Query().Get("dealership_id")
	if !validateUUID(w, dealershipID, "dealership_id") {
		return
	}

	attachment, err := s.db.GetAttachment(attachmentID, dealershipID)
	if err != nil {
		http.Error(w, "Attachment not found", http.StatusNotFound)
		return
	}

	// Get file from local storage
	storage, err := NewLocalStorage(getStoragePath())
	if err != nil {
		http.Error(w, "Storage service unavailable", http.StatusServiceUnavailable)
		return
	}

	file, err := storage.GetFile(attachment.S3Key)
	if err != nil {
		// File doesn't exist locally, return placeholder
		w.Header().Set("Content-Type", attachment.ContentType)
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", attachment.Filename))
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(fmt.Sprintf("File placeholder: %s", attachment.Filename)))
		return
	}
	defer file.Close()

	w.Header().Set("Content-Type", attachment.ContentType)
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", attachment.Filename))
	w.Header().Set("Content-Length", strconv.FormatInt(attachment.Size, 10))

	io.Copy(w, file)
}

// DeleteAttachmentHandler deletes an attachment
func (s *Server) DeleteAttachmentHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	attachmentID := vars["id"]

	if !validateUUID(w, attachmentID, "id") {
		return
	}

	dealershipID := r.URL.Query().Get("dealership_id")
	if !validateUUID(w, dealershipID, "dealership_id") {
		return
	}

	// Get attachment to get storage key
	attachment, err := s.db.GetAttachment(attachmentID, dealershipID)
	if err != nil {
		http.Error(w, "Attachment not found", http.StatusNotFound)
		return
	}

	// Delete from local storage
	storage, _ := NewLocalStorage(getStoragePath())
	if storage != nil {
		storage.DeleteFile(attachment.S3Key)
	}

	// Delete from database
	if err := s.db.DeleteAttachment(attachmentID, dealershipID); err != nil {
		http.Error(w, "Failed to delete attachment", http.StatusInternalServerError)
		return
	}

	s.logger.WithContext(r.Context()).
		WithField("attachment_id", attachmentID).
		Info("Attachment deleted")

	w.WriteHeader(http.StatusNoContent)
}

// ListEmailAttachmentsHandler lists attachments for an email
func (s *Server) ListEmailAttachmentsHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	emailID := vars["email_id"]

	if !validateUUID(w, emailID, "email_id") {
		return
	}

	attachments, err := s.db.ListAttachmentsByEmail(emailID)
	if err != nil {
		http.Error(w, "Failed to list attachments", http.StatusInternalServerError)
		return
	}

	// Generate download URLs
	for _, attachment := range attachments {
		attachment.DownloadURL = fmt.Sprintf("/api/v1/email/attachments/%s/download", attachment.ID)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(attachments)
}

// ListDraftAttachmentsHandler lists attachments for a draft
func (s *Server) ListDraftAttachmentsHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	draftID := vars["draft_id"]

	if !validateUUID(w, draftID, "draft_id") {
		return
	}

	attachments, err := s.db.ListAttachmentsByDraft(draftID)
	if err != nil {
		http.Error(w, "Failed to list attachments", http.StatusInternalServerError)
		return
	}

	// Generate download URLs
	for _, attachment := range attachments {
		attachment.DownloadURL = fmt.Sprintf("/api/v1/email/attachments/%s/download", attachment.ID)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(attachments)
}

// GetUploadURLHandler returns upload endpoint info
func (s *Server) GetUploadURLHandler(w http.ResponseWriter, r *http.Request) {
	dealershipID := r.URL.Query().Get("dealership_id")
	filename := r.URL.Query().Get("filename")

	if !validateUUID(w, dealershipID, "dealership_id") {
		return
	}

	if filename == "" {
		http.Error(w, "filename is required", http.StatusBadRequest)
		return
	}

	attachmentID := uuid.New().String()
	ext := filepath.Ext(filename)
	storageKey := fmt.Sprintf("attachments/%s/%s%s", dealershipID, attachmentID, ext)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"upload_url":    "/api/v1/email/attachments/upload",
		"attachment_id": attachmentID,
		"s3_key":        storageKey,
		"s3_bucket":     "local",
		"expires_in":    "15m",
	})
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

// validateUUIDString checks if a string is a valid UUID without writing error response
func validateUUIDString(id string) bool {
	_, err := uuid.Parse(id)
	return err == nil
}
