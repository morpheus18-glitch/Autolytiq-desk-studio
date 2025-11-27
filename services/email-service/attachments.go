package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// =====================================================
// S3 CLIENT
// =====================================================

// S3Client handles S3 operations for attachments
type S3Client struct {
	client     *s3.Client
	bucket     string
	region     string
	urlExpiry  time.Duration
}

// NewS3Client creates a new S3 client
func NewS3Client(bucket, region string) (*S3Client, error) {
	cfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithRegion(region),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	client := s3.NewFromConfig(cfg)

	return &S3Client{
		client:    client,
		bucket:    bucket,
		region:    region,
		urlExpiry: 15 * time.Minute, // Presigned URLs expire in 15 minutes
	}, nil
}

// UploadFile uploads a file to S3
func (c *S3Client) UploadFile(ctx context.Context, key string, contentType string, reader io.Reader, size int64) error {
	input := &s3.PutObjectInput{
		Bucket:        aws.String(c.bucket),
		Key:           aws.String(key),
		Body:          reader,
		ContentType:   aws.String(contentType),
		ContentLength: aws.Int64(size),
	}

	_, err := c.client.PutObject(ctx, input)
	if err != nil {
		return fmt.Errorf("failed to upload to S3: %w", err)
	}

	return nil
}

// DeleteFile deletes a file from S3
func (c *S3Client) DeleteFile(ctx context.Context, key string) error {
	input := &s3.DeleteObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
	}

	_, err := c.client.DeleteObject(ctx, input)
	if err != nil {
		return fmt.Errorf("failed to delete from S3: %w", err)
	}

	return nil
}

// GetPresignedURL generates a presigned URL for downloading a file
func (c *S3Client) GetPresignedURL(ctx context.Context, key string, filename string) (string, error) {
	presignClient := s3.NewPresignClient(c.client)

	input := &s3.GetObjectInput{
		Bucket:                     aws.String(c.bucket),
		Key:                        aws.String(key),
		ResponseContentDisposition: aws.String(fmt.Sprintf("attachment; filename=\"%s\"", filename)),
	}

	presignedReq, err := presignClient.PresignGetObject(ctx, input, s3.WithPresignExpires(c.urlExpiry))
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned URL: %w", err)
	}

	return presignedReq.URL, nil
}

// GetPresignedUploadURL generates a presigned URL for uploading a file
func (c *S3Client) GetPresignedUploadURL(ctx context.Context, key string, contentType string) (string, error) {
	presignClient := s3.NewPresignClient(c.client)

	input := &s3.PutObjectInput{
		Bucket:      aws.String(c.bucket),
		Key:         aws.String(key),
		ContentType: aws.String(contentType),
	}

	presignedReq, err := presignClient.PresignPutObject(ctx, input, s3.WithPresignExpires(c.urlExpiry))
	if err != nil {
		return "", fmt.Errorf("failed to generate upload URL: %w", err)
	}

	return presignedReq.URL, nil
}

// =====================================================
// ATTACHMENT HANDLERS
// =====================================================

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

	// Generate S3 key
	attachmentID := uuid.New().String()
	ext := filepath.Ext(header.Filename)
	s3Key := fmt.Sprintf("attachments/%s/%s%s", dealershipID, attachmentID, ext)

	// Determine content type
	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	// Get S3 client or use mock for development
	s3Bucket := os.Getenv("S3_BUCKET")
	s3Region := os.Getenv("AWS_REGION")

	if s3Bucket == "" {
		s3Bucket = "autolytiq-attachments"
	}
	if s3Region == "" {
		s3Region = "us-east-1"
	}

	// For development, we'll store metadata without actual S3 upload
	// In production, this would upload to S3
	if os.Getenv("ENV") == "production" {
		s3Client, err := NewS3Client(s3Bucket, s3Region)
		if err != nil {
			s.logger.WithContext(r.Context()).WithError(err).Error("Failed to create S3 client")
			http.Error(w, "Storage service unavailable", http.StatusServiceUnavailable)
			return
		}

		if err := s3Client.UploadFile(r.Context(), s3Key, contentType, file, header.Size); err != nil {
			s.logger.WithContext(r.Context()).WithError(err).Error("Failed to upload to S3")
			http.Error(w, "Failed to upload file", http.StatusInternalServerError)
			return
		}
	}

	// Create attachment record
	attachment := &Attachment{
		ID:           attachmentID,
		DealershipID: dealershipID,
		Filename:     header.Filename,
		ContentType:  contentType,
		Size:         header.Size,
		S3Key:        s3Key,
		S3Bucket:     s3Bucket,
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

	// Generate presigned download URL for production
	if os.Getenv("ENV") == "production" {
		s3Client, err := NewS3Client(attachment.S3Bucket, os.Getenv("AWS_REGION"))
		if err == nil {
			downloadURL, err := s3Client.GetPresignedURL(r.Context(), attachment.S3Key, attachment.Filename)
			if err == nil {
				attachment.DownloadURL = downloadURL
			}
		}
	} else {
		// For development, provide a mock URL
		attachment.DownloadURL = fmt.Sprintf("/api/v1/email/attachments/%s/download?dealership_id=%s", attachmentID, dealershipID)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(attachment)
}

// DownloadAttachmentHandler handles direct file download (for development)
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

	// In production, redirect to S3 presigned URL
	if os.Getenv("ENV") == "production" {
		s3Client, err := NewS3Client(attachment.S3Bucket, os.Getenv("AWS_REGION"))
		if err != nil {
			http.Error(w, "Storage service unavailable", http.StatusServiceUnavailable)
			return
		}

		downloadURL, err := s3Client.GetPresignedURL(r.Context(), attachment.S3Key, attachment.Filename)
		if err != nil {
			http.Error(w, "Failed to generate download URL", http.StatusInternalServerError)
			return
		}

		http.Redirect(w, r, downloadURL, http.StatusTemporaryRedirect)
		return
	}

	// For development, return a placeholder response
	w.Header().Set("Content-Type", attachment.ContentType)
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", attachment.Filename))
	w.Header().Set("Content-Length", strconv.FormatInt(attachment.Size, 10))
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(fmt.Sprintf("Development placeholder for file: %s", attachment.Filename)))
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

	// Get attachment to get S3 key
	attachment, err := s.db.GetAttachment(attachmentID, dealershipID)
	if err != nil {
		http.Error(w, "Attachment not found", http.StatusNotFound)
		return
	}

	// Delete from S3 in production
	if os.Getenv("ENV") == "production" {
		s3Client, err := NewS3Client(attachment.S3Bucket, os.Getenv("AWS_REGION"))
		if err == nil {
			s3Client.DeleteFile(r.Context(), attachment.S3Key)
		}
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
	s3Bucket := os.Getenv("S3_BUCKET")
	s3Region := os.Getenv("AWS_REGION")

	if os.Getenv("ENV") == "production" && s3Bucket != "" {
		s3Client, err := NewS3Client(s3Bucket, s3Region)
		if err == nil {
			for _, attachment := range attachments {
				url, err := s3Client.GetPresignedURL(r.Context(), attachment.S3Key, attachment.Filename)
				if err == nil {
					attachment.DownloadURL = url
				}
			}
		}
	} else {
		for _, attachment := range attachments {
			attachment.DownloadURL = fmt.Sprintf("/api/v1/email/attachments/%s/download", attachment.ID)
		}
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

// GetUploadURLHandler generates a presigned URL for direct upload
func (s *Server) GetUploadURLHandler(w http.ResponseWriter, r *http.Request) {
	dealershipID := r.URL.Query().Get("dealership_id")
	filename := r.URL.Query().Get("filename")
	contentType := r.URL.Query().Get("content_type")

	if !validateUUID(w, dealershipID, "dealership_id") {
		return
	}

	if filename == "" {
		http.Error(w, "filename is required", http.StatusBadRequest)
		return
	}

	if contentType == "" {
		contentType = "application/octet-stream"
	}

	attachmentID := uuid.New().String()
	ext := filepath.Ext(filename)
	s3Key := fmt.Sprintf("attachments/%s/%s%s", dealershipID, attachmentID, ext)

	s3Bucket := os.Getenv("S3_BUCKET")
	s3Region := os.Getenv("AWS_REGION")

	if s3Bucket == "" {
		s3Bucket = "autolytiq-attachments"
	}
	if s3Region == "" {
		s3Region = "us-east-1"
	}

	var uploadURL string

	if os.Getenv("ENV") == "production" {
		s3Client, err := NewS3Client(s3Bucket, s3Region)
		if err != nil {
			http.Error(w, "Storage service unavailable", http.StatusServiceUnavailable)
			return
		}

		url, err := s3Client.GetPresignedUploadURL(r.Context(), s3Key, contentType)
		if err != nil {
			http.Error(w, "Failed to generate upload URL", http.StatusInternalServerError)
			return
		}
		uploadURL = url
	} else {
		// For development, return the regular upload endpoint
		uploadURL = "/api/v1/email/attachments/upload"
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"upload_url":    uploadURL,
		"attachment_id": attachmentID,
		"s3_key":        s3Key,
		"s3_bucket":     s3Bucket,
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
