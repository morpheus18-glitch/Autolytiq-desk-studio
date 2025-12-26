package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"
)

// ResendWebhookEvent types
const (
	EventEmailSent      = "email.sent"
	EventEmailDelivered = "email.delivered"
	EventEmailOpened    = "email.opened"
	EventEmailClicked   = "email.clicked"
	EventEmailBounced   = "email.bounced"
	EventEmailComplaint = "email.complained"
)

// ResendWebhookPayload represents the webhook payload from Resend
type ResendWebhookPayload struct {
	Type      string          `json:"type"`
	CreatedAt string          `json:"created_at"`
	Data      ResendEmailData `json:"data"`
}

// ResendEmailData contains the email event data
type ResendEmailData struct {
	EmailID   string   `json:"email_id"`
	From      string   `json:"from"`
	To        []string `json:"to"`
	Subject   string   `json:"subject"`
	CreatedAt string   `json:"created_at"`
	// Bounce-specific fields
	BounceType string `json:"bounce_type,omitempty"`
	// Click-specific fields
	Link string `json:"link,omitempty"`
	// Complaint-specific fields
	ComplaintType string `json:"complaint_type,omitempty"`
}

// ResendWebhookHandler handles incoming webhooks from Resend
func (s *Server) ResendWebhookHandler(w http.ResponseWriter, r *http.Request) {
	// Read request body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to read webhook body")
		http.Error(w, "Failed to read body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Verify webhook signature if secret is configured
	if s.config.ResendWebhookSecret != "" {
		signature := r.Header.Get("Resend-Signature")
		if signature == "" {
			s.logger.WithContext(r.Context()).Warn("Missing Resend-Signature header")
			http.Error(w, "Missing signature", http.StatusUnauthorized)
			return
		}

		if !verifyResendSignature(body, signature, s.config.ResendWebhookSecret) {
			s.logger.WithContext(r.Context()).Warn("Invalid webhook signature")
			http.Error(w, "Invalid signature", http.StatusUnauthorized)
			return
		}
	}

	// Parse webhook payload
	var payload ResendWebhookPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to parse webhook payload")
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		return
	}

	// Log the event
	s.logger.WithContext(r.Context()).
		WithField("event_type", payload.Type).
		WithField("email_id", payload.Data.EmailID).
		Info("Received Resend webhook")

	// Process based on event type
	switch payload.Type {
	case EventEmailSent:
		s.handleEmailSent(r.Context(), &payload)
	case EventEmailDelivered:
		s.handleEmailDelivered(r.Context(), &payload)
	case EventEmailOpened:
		s.handleEmailOpened(r.Context(), &payload)
	case EventEmailClicked:
		s.handleEmailClicked(r.Context(), &payload)
	case EventEmailBounced:
		s.handleEmailBounced(r.Context(), &payload)
	case EventEmailComplaint:
		s.handleEmailComplaint(r.Context(), &payload)
	default:
		s.logger.WithContext(r.Context()).
			WithField("event_type", payload.Type).
			Warn("Unknown webhook event type")
	}

	// Acknowledge receipt
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "received"})
}

// verifyResendSignature verifies the webhook signature
func verifyResendSignature(body []byte, signature string, secret string) bool {
	// Resend uses HMAC-SHA256 for webhook signatures
	// Format: "t=timestamp,v1=signature"
	parts := strings.Split(signature, ",")
	if len(parts) < 2 {
		return false
	}

	var timestamp, sig string
	for _, part := range parts {
		if strings.HasPrefix(part, "t=") {
			timestamp = strings.TrimPrefix(part, "t=")
		} else if strings.HasPrefix(part, "v1=") {
			sig = strings.TrimPrefix(part, "v1=")
		}
	}

	if timestamp == "" || sig == "" {
		return false
	}

	// Create the signed payload (timestamp.body)
	signedPayload := timestamp + "." + string(body)

	// Calculate expected signature
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(signedPayload))
	expectedSig := hex.EncodeToString(mac.Sum(nil))

	return hmac.Equal([]byte(sig), []byte(expectedSig))
}

// handleEmailSent processes email.sent events
func (s *Server) handleEmailSent(ctx interface{}, payload *ResendWebhookPayload) {
	// Update email log status if we have a mapping
	s.logger.WithField("resend_email_id", payload.Data.EmailID).Info("Email sent event received")
}

// handleEmailDelivered processes email.delivered events
func (s *Server) handleEmailDelivered(ctx interface{}, payload *ResendWebhookPayload) {
	sentAt := time.Now()
	s.logger.WithField("resend_email_id", payload.Data.EmailID).
		WithField("to", strings.Join(payload.Data.To, ",")).
		Info("Email delivered")

	// If we stored the Resend email ID in our database, we could update delivery status here
	_ = sentAt // Placeholder for future database update
}

// handleEmailOpened processes email.opened events
func (s *Server) handleEmailOpened(ctx interface{}, payload *ResendWebhookPayload) {
	s.logger.WithField("resend_email_id", payload.Data.EmailID).
		WithField("to", strings.Join(payload.Data.To, ",")).
		Info("Email opened")
	// Could track open rates in analytics
}

// handleEmailClicked processes email.clicked events
func (s *Server) handleEmailClicked(ctx interface{}, payload *ResendWebhookPayload) {
	s.logger.WithField("resend_email_id", payload.Data.EmailID).
		WithField("link", payload.Data.Link).
		Info("Email link clicked")
	// Could track click rates in analytics
}

// handleEmailBounced processes email.bounced events
func (s *Server) handleEmailBounced(ctx interface{}, payload *ResendWebhookPayload) {
	s.logger.WithField("resend_email_id", payload.Data.EmailID).
		WithField("to", strings.Join(payload.Data.To, ",")).
		WithField("bounce_type", payload.Data.BounceType).
		Warn("Email bounced")

	// Update email status to failed
	// Could also add the email to a suppression list
}

// handleEmailComplaint processes email.complained events
func (s *Server) handleEmailComplaint(ctx interface{}, payload *ResendWebhookPayload) {
	s.logger.WithField("resend_email_id", payload.Data.EmailID).
		WithField("to", strings.Join(payload.Data.To, ",")).
		WithField("complaint_type", payload.Data.ComplaintType).
		Warn("Email complaint received")

	// Should add the email to a suppression list to avoid future sends
}
