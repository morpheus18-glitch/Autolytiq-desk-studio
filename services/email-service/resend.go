package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const resendAPIURL = "https://api.resend.com/emails"

// ResendConfig holds Resend API configuration
type ResendConfig struct {
	APIKey    string
	FromEmail string
	FromName  string
}

// ResendClient implements SMTPClient using Resend API
type ResendClient struct {
	config     ResendConfig
	httpClient *http.Client
}

// ResendEmailRequest represents the Resend API request body
type ResendEmailRequest struct {
	From        string   `json:"from"`
	To          []string `json:"to"`
	Subject     string   `json:"subject"`
	HTML        string   `json:"html"`
	Text        string   `json:"text,omitempty"`
	ReplyTo     string   `json:"reply_to,omitempty"`
	CC          []string `json:"cc,omitempty"`
	BCC         []string `json:"bcc,omitempty"`
	Tags        []Tag    `json:"tags,omitempty"`
	Attachments []Attach `json:"attachments,omitempty"`
}

// Tag represents an email tag for tracking
type Tag struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

// Attach represents an email attachment for Resend
type Attach struct {
	Filename    string `json:"filename"`
	Content     string `json:"content"`      // Base64 encoded content
	ContentType string `json:"content_type"` // MIME type
}

// ResendEmailResponse represents the Resend API response
type ResendEmailResponse struct {
	ID string `json:"id"`
}

// ResendErrorResponse represents an error from Resend API
type ResendErrorResponse struct {
	StatusCode int    `json:"statusCode"`
	Message    string `json:"message"`
	Name       string `json:"name"`
}

// NewResendClient creates a new Resend API client
func NewResendClient(config ResendConfig) *ResendClient {
	return &ResendClient{
		config: config,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// SendEmail sends an email using the Resend API
func (c *ResendClient) SendEmail(to string, subject string, bodyHTML string) error {
	return c.SendEmailAdvanced(ResendEmailRequest{
		To:      []string{to},
		Subject: subject,
		HTML:    bodyHTML,
	})
}

// SendEmailAdvanced sends an email with full options using the Resend API
func (c *ResendClient) SendEmailAdvanced(req ResendEmailRequest) error {
	// Set From address
	if c.config.FromName != "" {
		req.From = fmt.Sprintf("%s <%s>", c.config.FromName, c.config.FromEmail)
	} else {
		req.From = c.config.FromEmail
	}

	// Serialize request body
	body, err := json.Marshal(req)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create HTTP request
	httpReq, err := http.NewRequest("POST", resendAPIURL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Authorization", "Bearer "+c.config.APIKey)
	httpReq.Header.Set("Content-Type", "application/json")

	// Send request
	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Read response body
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %w", err)
	}

	// Check for errors
	if resp.StatusCode >= 400 {
		var errResp ResendErrorResponse
		if err := json.Unmarshal(respBody, &errResp); err != nil {
			return fmt.Errorf("resend API error (status %d): %s", resp.StatusCode, string(respBody))
		}
		return fmt.Errorf("resend API error (%s): %s", errResp.Name, errResp.Message)
	}

	// Parse success response
	var emailResp ResendEmailResponse
	if err := json.Unmarshal(respBody, &emailResp); err != nil {
		return fmt.Errorf("failed to parse response: %w", err)
	}

	return nil
}

// SendEmailWithAttachments sends an email with attachments using Resend
func (c *ResendClient) SendEmailWithAttachments(
	to []string,
	cc []string,
	bcc []string,
	subject string,
	bodyHTML string,
	replyTo string,
	attachments []Attach,
	tags map[string]string,
) (string, error) {
	// Build tags slice
	var tagSlice []Tag
	for name, value := range tags {
		tagSlice = append(tagSlice, Tag{Name: name, Value: value})
	}

	req := ResendEmailRequest{
		To:          to,
		CC:          cc,
		BCC:         bcc,
		Subject:     subject,
		HTML:        bodyHTML,
		ReplyTo:     replyTo,
		Attachments: attachments,
		Tags:        tagSlice,
	}

	// Set From address
	if c.config.FromName != "" {
		req.From = fmt.Sprintf("%s <%s>", c.config.FromName, c.config.FromEmail)
	} else {
		req.From = c.config.FromEmail
	}

	// Serialize request body
	body, err := json.Marshal(req)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create HTTP request
	httpReq, err := http.NewRequest("POST", resendAPIURL, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Authorization", "Bearer "+c.config.APIKey)
	httpReq.Header.Set("Content-Type", "application/json")

	// Send request
	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Read response body
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	// Check for errors
	if resp.StatusCode >= 400 {
		var errResp ResendErrorResponse
		if err := json.Unmarshal(respBody, &errResp); err != nil {
			return "", fmt.Errorf("resend API error (status %d): %s", resp.StatusCode, string(respBody))
		}
		return "", fmt.Errorf("resend API error (%s): %s", errResp.Name, errResp.Message)
	}

	// Parse success response
	var emailResp ResendEmailResponse
	if err := json.Unmarshal(respBody, &emailResp); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	return emailResp.ID, nil
}

// ParseEmailAddresses splits a comma-separated email string into a slice
func ParseEmailAddresses(emails string) []string {
	if emails == "" {
		return nil
	}

	parts := strings.Split(emails, ",")
	result := make([]string, 0, len(parts))

	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}

	return result
}

// IsResendConfigured checks if Resend is properly configured
func IsResendConfigured(apiKey string) bool {
	return apiKey != "" && len(apiKey) > 10
}
