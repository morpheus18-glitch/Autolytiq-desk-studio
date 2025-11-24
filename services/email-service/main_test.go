package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gorilla/mux"
)

// MockDatabase implements EmailDatabase for testing
type MockDatabase struct {
	templates map[string]*EmailTemplate
	logs      map[string]*EmailLog
	closed    bool
}

func NewMockDatabase() *MockDatabase {
	return &MockDatabase{
		templates: make(map[string]*EmailTemplate),
		logs:      make(map[string]*EmailLog),
	}
}

func (m *MockDatabase) Close() error {
	m.closed = true
	return nil
}

func (m *MockDatabase) InitSchema() error {
	return nil
}

func (m *MockDatabase) CreateTemplate(template *EmailTemplate) error {
	if template.ID == "" {
		return fmt.Errorf("template ID required")
	}
	m.templates[template.ID] = template
	return nil
}

func (m *MockDatabase) GetTemplate(id string, dealershipID string) (*EmailTemplate, error) {
	template, ok := m.templates[id]
	if !ok {
		return nil, fmt.Errorf("template not found")
	}
	if template.DealershipID != dealershipID {
		return nil, fmt.Errorf("template not found")
	}
	return template, nil
}

func (m *MockDatabase) ListTemplates(dealershipID string, limit int, offset int) ([]*EmailTemplate, error) {
	templates := []*EmailTemplate{}
	for _, template := range m.templates {
		if template.DealershipID == dealershipID {
			templates = append(templates, template)
		}
	}
	return templates, nil
}

func (m *MockDatabase) UpdateTemplate(template *EmailTemplate) error {
	existing, ok := m.templates[template.ID]
	if !ok {
		return fmt.Errorf("template not found")
	}
	if existing.DealershipID != template.DealershipID {
		return fmt.Errorf("template not found")
	}
	m.templates[template.ID] = template
	return nil
}

func (m *MockDatabase) DeleteTemplate(id string, dealershipID string) error {
	template, ok := m.templates[id]
	if !ok {
		return fmt.Errorf("template not found")
	}
	if template.DealershipID != dealershipID {
		return fmt.Errorf("template not found")
	}
	delete(m.templates, id)
	return nil
}

func (m *MockDatabase) CreateLog(log *EmailLog) error {
	if log.ID == "" {
		return fmt.Errorf("log ID required")
	}
	m.logs[log.ID] = log
	return nil
}

func (m *MockDatabase) GetLog(id string, dealershipID string) (*EmailLog, error) {
	log, ok := m.logs[id]
	if !ok {
		return nil, fmt.Errorf("log not found")
	}
	if log.DealershipID != dealershipID {
		return nil, fmt.Errorf("log not found")
	}
	return log, nil
}

func (m *MockDatabase) ListLogs(dealershipID string, limit int, offset int) ([]*EmailLog, error) {
	logs := []*EmailLog{}
	for _, log := range m.logs {
		if log.DealershipID == dealershipID {
			logs = append(logs, log)
		}
	}
	return logs, nil
}

func (m *MockDatabase) UpdateLogStatus(id string, status string, sentAt *time.Time, errorMsg *string) error {
	log, ok := m.logs[id]
	if !ok {
		return fmt.Errorf("log not found")
	}
	log.Status = status
	log.SentAt = sentAt
	log.Error = errorMsg
	return nil
}

// MockSMTPClient implements SMTPClient for testing
type MockSMTPClient struct {
	sentEmails []SentEmail
	shouldFail bool
}

type SentEmail struct {
	To       string
	Subject  string
	BodyHTML string
}

func NewMockSMTPClient() *MockSMTPClient {
	return &MockSMTPClient{
		sentEmails: []SentEmail{},
		shouldFail: false,
	}
}

func (m *MockSMTPClient) SendEmail(to string, subject string, bodyHTML string) error {
	if m.shouldFail {
		return fmt.Errorf("mock SMTP error")
	}

	m.sentEmails = append(m.sentEmails, SentEmail{
		To:       to,
		Subject:  subject,
		BodyHTML: bodyHTML,
	})

	return nil
}

func setupTestServer() *Server {
	return &Server{
		db:         NewMockDatabase(),
		smtpClient: NewMockSMTPClient(),
		config:     Config{},
	}
}

func TestHealthCheck(t *testing.T) {
	server := setupTestServer()

	req, err := http.NewRequest("GET", "/health", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(server.HealthCheckHandler)
	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	var response map[string]string
	if err := json.NewDecoder(rr.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if response["status"] != "healthy" {
		t.Errorf("expected status 'healthy', got '%s'", response["status"])
	}
}

func TestCreateTemplate(t *testing.T) {
	server := setupTestServer()

	reqBody := CreateTemplateRequest{
		DealershipID: "dealer-123",
		Name:         "Welcome Email",
		Subject:      "Welcome {{customer_name}}!",
		BodyHTML:     "<h1>Hello {{customer_name}}</h1>",
		Variables:    []string{"customer_name"},
	}

	body, _ := json.Marshal(reqBody)
	req, err := http.NewRequest("POST", "/email/templates", bytes.NewBuffer(body))
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(server.CreateTemplateHandler)
	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusCreated {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusCreated)
	}

	var template EmailTemplate
	if err := json.NewDecoder(rr.Body).Decode(&template); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if template.Name != "Welcome Email" {
		t.Errorf("expected name 'Welcome Email', got '%s'", template.Name)
	}

	if template.DealershipID != "dealer-123" {
		t.Errorf("expected dealership_id 'dealer-123', got '%s'", template.DealershipID)
	}

	if len(template.Variables) != 1 || template.Variables[0] != "customer_name" {
		t.Errorf("expected variables ['customer_name'], got %v", template.Variables)
	}
}

func TestCreateTemplateAutoExtractVariables(t *testing.T) {
	server := setupTestServer()

	reqBody := CreateTemplateRequest{
		DealershipID: "dealer-123",
		Name:         "Deal Confirmation",
		Subject:      "Deal {{deal_id}} for {{customer_name}}",
		BodyHTML:     "<p>Amount: {{deal_amount}}</p><p>Vehicle: {{vehicle_info}}</p>",
	}

	body, _ := json.Marshal(reqBody)
	req, err := http.NewRequest("POST", "/email/templates", bytes.NewBuffer(body))
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(server.CreateTemplateHandler)
	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusCreated {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusCreated)
	}

	var template EmailTemplate
	if err := json.NewDecoder(rr.Body).Decode(&template); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	// Should auto-extract: deal_id, customer_name, deal_amount, vehicle_info
	if len(template.Variables) != 4 {
		t.Errorf("expected 4 auto-extracted variables, got %d: %v", len(template.Variables), template.Variables)
	}

	// Check all variables are present (order may vary due to map iteration)
	expectedVars := map[string]bool{
		"deal_id":      false,
		"customer_name": false,
		"deal_amount":  false,
		"vehicle_info": false,
	}

	for _, v := range template.Variables {
		if _, exists := expectedVars[v]; exists {
			expectedVars[v] = true
		}
	}

	for varName, found := range expectedVars {
		if !found {
			t.Errorf("expected variable '%s' not found in auto-extracted variables", varName)
		}
	}
}

func TestGetTemplate(t *testing.T) {
	server := setupTestServer()

	// Create template first
	template := &EmailTemplate{
		ID:           "template-123",
		DealershipID: "dealer-123",
		Name:         "Test Template",
		Subject:      "Test Subject",
		BodyHTML:     "<p>Test Body</p>",
		Variables:    []string{"var1"},
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	server.db.CreateTemplate(template)

	req, err := http.NewRequest("GET", "/email/templates/template-123?dealership_id=dealer-123", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	router := mux.NewRouter()
	router.HandleFunc("/email/templates/{id}", server.GetTemplateHandler)
	router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	var result EmailTemplate
	if err := json.NewDecoder(rr.Body).Decode(&result); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if result.ID != "template-123" {
		t.Errorf("expected ID 'template-123', got '%s'", result.ID)
	}
}

func TestListTemplates(t *testing.T) {
	server := setupTestServer()

	// Create multiple templates
	template1 := &EmailTemplate{
		ID:           "template-1",
		DealershipID: "dealer-123",
		Name:         "Template 1",
		Subject:      "Subject 1",
		BodyHTML:     "<p>Body 1</p>",
		Variables:    []string{},
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	template2 := &EmailTemplate{
		ID:           "template-2",
		DealershipID: "dealer-123",
		Name:         "Template 2",
		Subject:      "Subject 2",
		BodyHTML:     "<p>Body 2</p>",
		Variables:    []string{},
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	server.db.CreateTemplate(template1)
	server.db.CreateTemplate(template2)

	req, err := http.NewRequest("GET", "/email/templates?dealership_id=dealer-123", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(server.ListTemplatesHandler)
	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	var templates []*EmailTemplate
	if err := json.NewDecoder(rr.Body).Decode(&templates); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if len(templates) != 2 {
		t.Errorf("expected 2 templates, got %d", len(templates))
	}
}

func TestUpdateTemplate(t *testing.T) {
	server := setupTestServer()

	// Create template first
	template := &EmailTemplate{
		ID:           "template-123",
		DealershipID: "dealer-123",
		Name:         "Original Name",
		Subject:      "Original Subject",
		BodyHTML:     "<p>Original Body</p>",
		Variables:    []string{},
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	server.db.CreateTemplate(template)

	reqBody := UpdateTemplateRequest{
		Name:      "Updated Name",
		Subject:   "Updated Subject",
		BodyHTML:  "<p>Updated Body</p>",
		Variables: []string{"new_var"},
	}

	body, _ := json.Marshal(reqBody)
	req, err := http.NewRequest("PUT", "/email/templates/template-123?dealership_id=dealer-123", bytes.NewBuffer(body))
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	router := mux.NewRouter()
	router.HandleFunc("/email/templates/{id}", server.UpdateTemplateHandler)
	router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	var result EmailTemplate
	if err := json.NewDecoder(rr.Body).Decode(&result); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if result.Name != "Updated Name" {
		t.Errorf("expected name 'Updated Name', got '%s'", result.Name)
	}

	if result.Subject != "Updated Subject" {
		t.Errorf("expected subject 'Updated Subject', got '%s'", result.Subject)
	}
}

func TestDeleteTemplate(t *testing.T) {
	server := setupTestServer()

	// Create template first
	template := &EmailTemplate{
		ID:           "template-123",
		DealershipID: "dealer-123",
		Name:         "Test Template",
		Subject:      "Test Subject",
		BodyHTML:     "<p>Test Body</p>",
		Variables:    []string{},
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	server.db.CreateTemplate(template)

	req, err := http.NewRequest("DELETE", "/email/templates/template-123?dealership_id=dealer-123", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	router := mux.NewRouter()
	router.HandleFunc("/email/templates/{id}", server.DeleteTemplateHandler)
	router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusNoContent {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusNoContent)
	}

	// Verify template is deleted
	_, err = server.db.GetTemplate("template-123", "dealer-123")
	if err == nil {
		t.Error("expected error when getting deleted template")
	}
}

func TestSendEmail(t *testing.T) {
	server := setupTestServer()

	reqBody := SendEmailRequest{
		DealershipID: "dealer-123",
		To:           "customer@example.com",
		Subject:      "Test Email",
		BodyHTML:     "<p>Test Body</p>",
	}

	body, _ := json.Marshal(reqBody)
	req, err := http.NewRequest("POST", "/email/send", bytes.NewBuffer(body))
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(server.SendEmailHandler)
	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	var response map[string]string
	if err := json.NewDecoder(rr.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if response["message"] != "Email sent successfully" {
		t.Errorf("unexpected message: %s", response["message"])
	}

	if response["log_id"] == "" {
		t.Error("expected log_id in response")
	}

	// Verify email was sent via mock
	mockSMTP := server.smtpClient.(*MockSMTPClient)
	if len(mockSMTP.sentEmails) != 1 {
		t.Errorf("expected 1 sent email, got %d", len(mockSMTP.sentEmails))
	}

	sentEmail := mockSMTP.sentEmails[0]
	if sentEmail.To != "customer@example.com" {
		t.Errorf("expected to 'customer@example.com', got '%s'", sentEmail.To)
	}

	if sentEmail.Subject != "Test Email" {
		t.Errorf("expected subject 'Test Email', got '%s'", sentEmail.Subject)
	}
}

func TestSendEmailWithFailure(t *testing.T) {
	server := setupTestServer()
	mockSMTP := server.smtpClient.(*MockSMTPClient)
	mockSMTP.shouldFail = true

	reqBody := SendEmailRequest{
		DealershipID: "dealer-123",
		To:           "customer@example.com",
		Subject:      "Test Email",
		BodyHTML:     "<p>Test Body</p>",
	}

	body, _ := json.Marshal(reqBody)
	req, err := http.NewRequest("POST", "/email/send", bytes.NewBuffer(body))
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(server.SendEmailHandler)
	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusInternalServerError {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusInternalServerError)
	}

	// Verify log was created with failed status
	mockDB := server.db.(*MockDatabase)
	foundFailedLog := false
	for _, log := range mockDB.logs {
		if log.Status == "failed" {
			foundFailedLog = true
			if log.Error == nil {
				t.Error("expected error message in failed log")
			}
		}
	}

	if !foundFailedLog {
		t.Error("expected to find failed log entry")
	}
}

func TestSendTemplateEmail(t *testing.T) {
	server := setupTestServer()

	// Create template first
	template := &EmailTemplate{
		ID:           "template-123",
		DealershipID: "dealer-123",
		Name:         "Welcome Email",
		Subject:      "Welcome {{customer_name}}!",
		BodyHTML:     "<h1>Hello {{customer_name}}</h1><p>Deal: {{deal_id}}</p>",
		Variables:    []string{"customer_name", "deal_id"},
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	server.db.CreateTemplate(template)

	reqBody := SendTemplateEmailRequest{
		DealershipID: "dealer-123",
		To:           "customer@example.com",
		TemplateID:   "template-123",
		Variables: map[string]string{
			"customer_name": "John Doe",
			"deal_id":       "DEAL-456",
		},
	}

	body, _ := json.Marshal(reqBody)
	req, err := http.NewRequest("POST", "/email/send-template", bytes.NewBuffer(body))
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(server.SendTemplateEmailHandler)
	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	// Verify email was sent with rendered template
	mockSMTP := server.smtpClient.(*MockSMTPClient)
	if len(mockSMTP.sentEmails) != 1 {
		t.Errorf("expected 1 sent email, got %d", len(mockSMTP.sentEmails))
	}

	sentEmail := mockSMTP.sentEmails[0]
	expectedSubject := "Welcome John Doe!"
	if sentEmail.Subject != expectedSubject {
		t.Errorf("expected subject '%s', got '%s'", expectedSubject, sentEmail.Subject)
	}

	expectedBody := "<h1>Hello John Doe</h1><p>Deal: DEAL-456</p>"
	if sentEmail.BodyHTML != expectedBody {
		t.Errorf("expected body '%s', got '%s'", expectedBody, sentEmail.BodyHTML)
	}
}

func TestRenderTemplate(t *testing.T) {
	tests := []struct {
		name      string
		template  string
		variables map[string]string
		expected  string
	}{
		{
			name:      "Simple variable",
			template:  "Hello {{name}}!",
			variables: map[string]string{"name": "John"},
			expected:  "Hello John!",
		},
		{
			name:      "Multiple variables",
			template:  "{{greeting}} {{name}}, your order {{order_id}} is ready.",
			variables: map[string]string{"greeting": "Hi", "name": "Jane", "order_id": "12345"},
			expected:  "Hi Jane, your order 12345 is ready.",
		},
		{
			name:      "Missing variable",
			template:  "Hello {{name}}, your {{missing_var}} is here.",
			variables: map[string]string{"name": "Bob"},
			expected:  "Hello Bob, your {{missing_var}} is here.",
		},
		{
			name:      "HTML content",
			template:  "<h1>Welcome {{customer_name}}</h1><p>Amount: ${{amount}}</p>",
			variables: map[string]string{"customer_name": "Alice", "amount": "1000"},
			expected:  "<h1>Welcome Alice</h1><p>Amount: $1000</p>",
		},
		{
			name:      "No variables",
			template:  "Static content with no variables",
			variables: map[string]string{},
			expected:  "Static content with no variables",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := RenderTemplate(tt.template, tt.variables)
			if result != tt.expected {
				t.Errorf("RenderTemplate() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestExtractVariables(t *testing.T) {
	tests := []struct {
		name     string
		template string
		expected []string
	}{
		{
			name:     "Single variable",
			template: "Hello {{name}}!",
			expected: []string{"name"},
		},
		{
			name:     "Multiple variables",
			template: "{{greeting}} {{name}}, order {{order_id}}",
			expected: []string{"greeting", "name", "order_id"},
		},
		{
			name:     "Duplicate variables",
			template: "{{name}} and {{name}} again",
			expected: []string{"name"},
		},
		{
			name:     "HTML with variables",
			template: "<h1>{{title}}</h1><p>{{content}}</p><footer>{{footer}}</footer>",
			expected: []string{"title", "content", "footer"},
		},
		{
			name:     "No variables",
			template: "Static content",
			expected: []string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ExtractVariables(tt.template)

			// Convert to map for easier comparison (order doesn't matter)
			resultMap := make(map[string]bool)
			for _, v := range result {
				resultMap[v] = true
			}

			expectedMap := make(map[string]bool)
			for _, v := range tt.expected {
				expectedMap[v] = true
			}

			if len(resultMap) != len(expectedMap) {
				t.Errorf("ExtractVariables() returned %d variables, want %d", len(resultMap), len(expectedMap))
			}

			for v := range expectedMap {
				if !resultMap[v] {
					t.Errorf("ExtractVariables() missing expected variable: %s", v)
				}
			}

			for v := range resultMap {
				if !expectedMap[v] {
					t.Errorf("ExtractVariables() returned unexpected variable: %s", v)
				}
			}
		})
	}
}

func TestListLogs(t *testing.T) {
	server := setupTestServer()

	// Create multiple logs
	log1 := &EmailLog{
		ID:           "log-1",
		DealershipID: "dealer-123",
		Recipient:    "customer1@example.com",
		Subject:      "Subject 1",
		Status:       "sent",
		CreatedAt:    time.Now(),
	}
	log2 := &EmailLog{
		ID:           "log-2",
		DealershipID: "dealer-123",
		Recipient:    "customer2@example.com",
		Subject:      "Subject 2",
		Status:       "failed",
		CreatedAt:    time.Now(),
	}

	server.db.CreateLog(log1)
	server.db.CreateLog(log2)

	req, err := http.NewRequest("GET", "/email/logs?dealership_id=dealer-123", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(server.ListLogsHandler)
	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	var logs []*EmailLog
	if err := json.NewDecoder(rr.Body).Decode(&logs); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if len(logs) != 2 {
		t.Errorf("expected 2 logs, got %d", len(logs))
	}
}

func TestGetLog(t *testing.T) {
	server := setupTestServer()

	// Create log first
	sentAt := time.Now()
	log := &EmailLog{
		ID:           "log-123",
		DealershipID: "dealer-123",
		Recipient:    "customer@example.com",
		Subject:      "Test Subject",
		Status:       "sent",
		SentAt:       &sentAt,
		CreatedAt:    time.Now(),
	}
	server.db.CreateLog(log)

	req, err := http.NewRequest("GET", "/email/logs/log-123?dealership_id=dealer-123", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	router := mux.NewRouter()
	router.HandleFunc("/email/logs/{id}", server.GetLogHandler)
	router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	var result EmailLog
	if err := json.NewDecoder(rr.Body).Decode(&result); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if result.ID != "log-123" {
		t.Errorf("expected ID 'log-123', got '%s'", result.ID)
	}

	if result.Status != "sent" {
		t.Errorf("expected status 'sent', got '%s'", result.Status)
	}
}

func TestMultiTenancy(t *testing.T) {
	server := setupTestServer()

	// Create templates for different dealerships
	template1 := &EmailTemplate{
		ID:           "template-dealer1",
		DealershipID: "dealer-1",
		Name:         "Dealer 1 Template",
		Subject:      "Subject 1",
		BodyHTML:     "<p>Body 1</p>",
		Variables:    []string{},
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	template2 := &EmailTemplate{
		ID:           "template-dealer2",
		DealershipID: "dealer-2",
		Name:         "Dealer 2 Template",
		Subject:      "Subject 2",
		BodyHTML:     "<p>Body 2</p>",
		Variables:    []string{},
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	server.db.CreateTemplate(template1)
	server.db.CreateTemplate(template2)

	// Try to access dealer-1 template with dealer-2 credentials
	_, err := server.db.GetTemplate("template-dealer1", "dealer-2")
	if err == nil {
		t.Error("expected error when accessing template from different dealership")
	}

	// Verify correct access
	result, err := server.db.GetTemplate("template-dealer1", "dealer-1")
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}

	if result.ID != "template-dealer1" {
		t.Errorf("expected template-dealer1, got %s", result.ID)
	}
}
