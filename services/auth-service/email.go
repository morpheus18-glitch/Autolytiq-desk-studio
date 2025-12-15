package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// SendPasswordResetEmailRequest is the request payload for sending a password reset email
type SendPasswordResetEmailRequest struct {
	DealershipID string            `json:"dealership_id"`
	To           string            `json:"to"`
	TemplateID   string            `json:"template_id"`
	Variables    map[string]string `json:"variables"`
}

// SendPasswordResetEmail sends a password reset email via the email service
func (s *Server) SendPasswordResetEmail(email, resetToken, userName string) error {
	// Build the reset URL
	resetURL := fmt.Sprintf("%s/reset-password?token=%s", s.config.FrontendURL, resetToken)

	// Prepare the email request
	emailReq := SendPasswordResetEmailRequest{
		DealershipID: "system", // System-level email
		To:           email,
		TemplateID:   "password-reset", // We'll create this template
		Variables: map[string]string{
			"user_name":  userName,
			"reset_url":  resetURL,
			"reset_link": resetURL, // Alias for compatibility
		},
	}

	// Marshal the request
	jsonData, err := json.Marshal(emailReq)
	if err != nil {
		return fmt.Errorf("failed to marshal email request: %w", err)
	}

	// Create HTTP request to email service
	url := fmt.Sprintf("%s/email/send-template", s.config.EmailServiceURL)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create HTTP request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	// Send the request
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send email request: %w", err)
	}
	defer resp.Body.Close()

	// Check response status
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("email service returned error status: %d", resp.StatusCode)
	}

	s.logger.WithField("email", email).Info("Password reset email sent successfully")
	return nil
}
