package main

import (
	"fmt"
	"regexp"
	"strings"

	"gopkg.in/gomail.v2"
)

// SMTPConfig holds SMTP server configuration
type SMTPConfig struct {
	Host      string
	Port      int
	Username  string
	Password  string
	FromEmail string
	FromName  string
}

// SMTPClient interface for sending emails
type SMTPClient interface {
	SendEmail(to string, subject string, bodyHTML string) error
}

// GoMailSMTPClient implements SMTPClient using gomail
type GoMailSMTPClient struct {
	config SMTPConfig
	dialer *gomail.Dialer
}

// NewGoMailSMTPClient creates a new SMTP client
func NewGoMailSMTPClient(config SMTPConfig) *GoMailSMTPClient {
	dialer := gomail.NewDialer(config.Host, config.Port, config.Username, config.Password)

	return &GoMailSMTPClient{
		config: config,
		dialer: dialer,
	}
}

// SendEmail sends an email using the configured SMTP server
func (c *GoMailSMTPClient) SendEmail(to string, subject string, bodyHTML string) error {
	m := gomail.NewMessage()

	// Set headers
	if c.config.FromName != "" {
		m.SetHeader("From", fmt.Sprintf("%s <%s>", c.config.FromName, c.config.FromEmail))
	} else {
		m.SetHeader("From", c.config.FromEmail)
	}

	m.SetHeader("To", to)
	m.SetHeader("Subject", subject)
	m.SetBody("text/html", bodyHTML)

	// Send email
	if err := c.dialer.DialAndSend(m); err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}

// RenderTemplate replaces {{variable}} placeholders with actual values
func RenderTemplate(template string, variables map[string]string) string {
	result := template

	// Replace all {{variable}} patterns
	re := regexp.MustCompile(`\{\{([a-zA-Z0-9_]+)\}\}`)

	result = re.ReplaceAllStringFunc(result, func(match string) string {
		// Extract variable name (remove {{ and }})
		varName := strings.TrimSpace(match[2 : len(match)-2])

		// Replace with value if exists, otherwise keep placeholder
		if value, ok := variables[varName]; ok {
			return value
		}
		return match
	})

	return result
}

// ExtractVariables extracts all {{variable}} placeholders from a template
func ExtractVariables(template string) []string {
	re := regexp.MustCompile(`\{\{([a-zA-Z0-9_]+)\}\}`)
	matches := re.FindAllStringSubmatch(template, -1)

	// Use map to deduplicate
	variableMap := make(map[string]bool)
	for _, match := range matches {
		if len(match) > 1 {
			variableMap[match[1]] = true
		}
	}

	// Convert to slice
	variables := make([]string, 0, len(variableMap))
	for variable := range variableMap {
		variables = append(variables, variable)
	}

	return variables
}
