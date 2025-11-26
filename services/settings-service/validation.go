package main

import (
	"encoding/json"
	"net/http"
	"regexp"
	"strings"
)

// ValidationError represents a single validation error
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// ValidationErrors represents a collection of validation errors
type ValidationErrors struct {
	Errors []ValidationError `json:"errors"`
}

// ValidationErrorResponse is the standard error response format
type ValidationErrorResponse struct {
	Error   string            `json:"error"`
	Code    string            `json:"code"`
	Details []ValidationError `json:"details,omitempty"`
}

var (
	uuidRegex = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)
	hexColorRegex = regexp.MustCompile(`^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$`)
	timeFormatRegex = regexp.MustCompile(`^([01]?[0-9]|2[0-3]):[0-5][0-9]$`)

	validThemes = map[string]bool{
		"light":  true,
		"dark":   true,
		"system": true,
	}

	validDensities = map[string]bool{
		"comfortable": true,
		"compact":     true,
	}

	validSidebarPositions = map[string]bool{
		"left":  true,
		"right": true,
	}

	validFontSizes = map[string]bool{
		"small":  true,
		"medium": true,
		"large":  true,
	}

	validTimeFormats = map[string]bool{
		"12h": true,
		"24h": true,
	}

	validDateFormats = map[string]bool{
		"MM/DD/YYYY": true,
		"DD/MM/YYYY": true,
		"YYYY-MM-DD": true,
	}

	validCurrencies = map[string]bool{
		"USD": true,
		"CAD": true,
		"EUR": true,
		"GBP": true,
	}

	validCurrencyDisplays = map[string]bool{
		"symbol":     true,
		"code":       true,
		"narrowSymbol": true,
	}

	validViewStyles = map[string]bool{
		"list":   true,
		"grid":   true,
		"kanban": true,
	}

	validSortDirections = map[string]bool{
		"asc":  true,
		"desc": true,
	}

	validProfileVisibilities = map[string]bool{
		"public":  true,
		"team":    true,
		"private": true,
	}

	validTwoFactorMethods = map[string]bool{
		"app":   true,
		"sms":   true,
		"email": true,
	}

	validSections = map[string]bool{
		"appearance":    true,
		"localization":  true,
		"notifications": true,
		"dashboard":     true,
		"deals":         true,
		"customers":     true,
		"inventory":     true,
		"showroom":      true,
		"messages":      true,
		"privacy":       true,
		"security":      true,
	}
)

// Validate validates AppearanceSettings
func (s *AppearanceSettings) Validate() *ValidationErrors {
	var errors []ValidationError

	if s.Theme != "" && !validThemes[strings.ToLower(s.Theme)] {
		errors = append(errors, ValidationError{
			Field:   "theme",
			Message: "Invalid theme. Must be one of: light, dark, system",
		})
	}

	if s.Density != "" && !validDensities[strings.ToLower(s.Density)] {
		errors = append(errors, ValidationError{
			Field:   "density",
			Message: "Invalid density. Must be one of: comfortable, compact",
		})
	}

	if s.SidebarPosition != "" && !validSidebarPositions[strings.ToLower(s.SidebarPosition)] {
		errors = append(errors, ValidationError{
			Field:   "sidebar_position",
			Message: "Invalid sidebar position. Must be one of: left, right",
		})
	}

	if s.PrimaryColor != "" && !hexColorRegex.MatchString(s.PrimaryColor) {
		errors = append(errors, ValidationError{
			Field:   "primary_color",
			Message: "Invalid color format. Must be a hex color (e.g., #2563EB)",
		})
	}

	if s.AccentColor != "" && !hexColorRegex.MatchString(s.AccentColor) {
		errors = append(errors, ValidationError{
			Field:   "accent_color",
			Message: "Invalid color format. Must be a hex color (e.g., #F59E0B)",
		})
	}

	if s.FontSize != "" && !validFontSizes[strings.ToLower(s.FontSize)] {
		errors = append(errors, ValidationError{
			Field:   "font_size",
			Message: "Invalid font size. Must be one of: small, medium, large",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes AppearanceSettings
func (s *AppearanceSettings) Sanitize() {
	s.Theme = strings.TrimSpace(strings.ToLower(s.Theme))
	s.Density = strings.TrimSpace(strings.ToLower(s.Density))
	s.SidebarPosition = strings.TrimSpace(strings.ToLower(s.SidebarPosition))
	s.PrimaryColor = strings.TrimSpace(strings.ToUpper(s.PrimaryColor))
	s.AccentColor = strings.TrimSpace(strings.ToUpper(s.AccentColor))
	s.FontSize = strings.TrimSpace(strings.ToLower(s.FontSize))
}

// Validate validates LocalizationSettings
func (s *LocalizationSettings) Validate() *ValidationErrors {
	var errors []ValidationError

	if s.Language != "" && len(s.Language) > 10 {
		errors = append(errors, ValidationError{
			Field:   "language",
			Message: "Language code must be 10 characters or less",
		})
	}

	if s.Timezone != "" && len(s.Timezone) > 50 {
		errors = append(errors, ValidationError{
			Field:   "timezone",
			Message: "Timezone must be 50 characters or less",
		})
	}

	if s.DateFormat != "" && !validDateFormats[s.DateFormat] {
		errors = append(errors, ValidationError{
			Field:   "date_format",
			Message: "Invalid date format. Must be one of: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD",
		})
	}

	if s.TimeFormat != "" && !validTimeFormats[s.TimeFormat] {
		errors = append(errors, ValidationError{
			Field:   "time_format",
			Message: "Invalid time format. Must be one of: 12h, 24h",
		})
	}

	if s.Currency != "" && !validCurrencies[strings.ToUpper(s.Currency)] {
		errors = append(errors, ValidationError{
			Field:   "currency",
			Message: "Invalid currency. Must be one of: USD, CAD, EUR, GBP",
		})
	}

	if s.CurrencyDisplay != "" && !validCurrencyDisplays[strings.ToLower(s.CurrencyDisplay)] {
		errors = append(errors, ValidationError{
			Field:   "currency_display",
			Message: "Invalid currency display. Must be one of: symbol, code, narrowSymbol",
		})
	}

	if s.FirstDayOfWeek < 0 || s.FirstDayOfWeek > 6 {
		errors = append(errors, ValidationError{
			Field:   "first_day_of_week",
			Message: "First day of week must be between 0 (Sunday) and 6 (Saturday)",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes LocalizationSettings
func (s *LocalizationSettings) Sanitize() {
	s.Language = strings.TrimSpace(strings.ToLower(s.Language))
	s.Timezone = strings.TrimSpace(s.Timezone)
	s.Currency = strings.TrimSpace(strings.ToUpper(s.Currency))
}

// Validate validates NotificationSettings
func (s *NotificationSettings) Validate() *ValidationErrors {
	var errors []ValidationError

	if s.QuietHoursStart != "" && !timeFormatRegex.MatchString(s.QuietHoursStart) {
		errors = append(errors, ValidationError{
			Field:   "quiet_hours_start",
			Message: "Invalid time format. Must be HH:MM (24-hour format)",
		})
	}

	if s.QuietHoursEnd != "" && !timeFormatRegex.MatchString(s.QuietHoursEnd) {
		errors = append(errors, ValidationError{
			Field:   "quiet_hours_end",
			Message: "Invalid time format. Must be HH:MM (24-hour format)",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes NotificationSettings
func (s *NotificationSettings) Sanitize() {
	s.QuietHoursStart = strings.TrimSpace(s.QuietHoursStart)
	s.QuietHoursEnd = strings.TrimSpace(s.QuietHoursEnd)
}

// Validate validates DashboardSettings
func (s *DashboardSettings) Validate() *ValidationErrors {
	var errors []ValidationError

	if s.RefreshInterval < 30 || s.RefreshInterval > 3600 {
		if s.RefreshInterval != 0 {
			errors = append(errors, ValidationError{
				Field:   "refresh_interval",
				Message: "Refresh interval must be between 30 and 3600 seconds",
			})
		}
	}

	if len(s.WidgetsEnabled) > 20 {
		errors = append(errors, ValidationError{
			Field:   "widgets_enabled",
			Message: "Maximum 20 widgets allowed",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes DashboardSettings
func (s *DashboardSettings) Sanitize() {
	s.Layout = strings.TrimSpace(strings.ToLower(s.Layout))
	s.DefaultDateRange = strings.TrimSpace(strings.ToLower(s.DefaultDateRange))
	s.ChartType = strings.TrimSpace(strings.ToLower(s.ChartType))
}

// Validate validates DealsSettings
func (s *DealsSettings) Validate() *ValidationErrors {
	var errors []ValidationError

	if s.ViewStyle != "" && !validViewStyles[strings.ToLower(s.ViewStyle)] {
		errors = append(errors, ValidationError{
			Field:   "view_style",
			Message: "Invalid view style. Must be one of: list, grid, kanban",
		})
	}

	if s.SortDirection != "" && !validSortDirections[strings.ToLower(s.SortDirection)] {
		errors = append(errors, ValidationError{
			Field:   "sort_direction",
			Message: "Invalid sort direction. Must be one of: asc, desc",
		})
	}

	if s.RequireApprovalAbove < 0 {
		errors = append(errors, ValidationError{
			Field:   "require_approval_above",
			Message: "Approval threshold must be a positive number",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes DealsSettings
func (s *DealsSettings) Sanitize() {
	s.ViewStyle = strings.TrimSpace(strings.ToLower(s.ViewStyle))
	s.DefaultSort = strings.TrimSpace(strings.ToLower(s.DefaultSort))
	s.SortDirection = strings.TrimSpace(strings.ToLower(s.SortDirection))
	s.PipelineView = strings.TrimSpace(strings.ToLower(s.PipelineView))
	s.DefaultDealType = strings.TrimSpace(strings.ToLower(s.DefaultDealType))
}

// Validate validates PrivacySettings
func (s *PrivacySettings) Validate() *ValidationErrors {
	var errors []ValidationError

	if s.ProfileVisibility != "" && !validProfileVisibilities[strings.ToLower(s.ProfileVisibility)] {
		errors = append(errors, ValidationError{
			Field:   "profile_visibility",
			Message: "Invalid profile visibility. Must be one of: public, team, private",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes PrivacySettings
func (s *PrivacySettings) Sanitize() {
	s.ProfileVisibility = strings.TrimSpace(strings.ToLower(s.ProfileVisibility))
}

// Validate validates SecuritySettings
func (s *SecuritySettings) Validate() *ValidationErrors {
	var errors []ValidationError

	if s.TwoFactorMethod != "" && !validTwoFactorMethods[strings.ToLower(s.TwoFactorMethod)] {
		errors = append(errors, ValidationError{
			Field:   "two_factor_method",
			Message: "Invalid 2FA method. Must be one of: app, sms, email",
		})
	}

	if s.SessionTimeoutMinutes < 5 || s.SessionTimeoutMinutes > 10080 {
		if s.SessionTimeoutMinutes != 0 {
			errors = append(errors, ValidationError{
				Field:   "session_timeout_minutes",
				Message: "Session timeout must be between 5 minutes and 7 days (10080 minutes)",
			})
		}
	}

	if s.RequirePasswordChangeDays < 0 || s.RequirePasswordChangeDays > 365 {
		errors = append(errors, ValidationError{
			Field:   "require_password_change_days",
			Message: "Password change requirement must be between 0 and 365 days",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes SecuritySettings
func (s *SecuritySettings) Sanitize() {
	s.TwoFactorMethod = strings.TrimSpace(strings.ToLower(s.TwoFactorMethod))
}

// Validate validates UserSettings
func (s *UserSettings) Validate() *ValidationErrors {
	var errors []ValidationError

	// Validate nested settings
	if errs := s.Appearance.Validate(); errs != nil {
		errors = append(errors, errs.Errors...)
	}
	if errs := s.Localization.Validate(); errs != nil {
		errors = append(errors, errs.Errors...)
	}
	if errs := s.Notifications.Validate(); errs != nil {
		errors = append(errors, errs.Errors...)
	}
	if errs := s.Dashboard.Validate(); errs != nil {
		errors = append(errors, errs.Errors...)
	}
	if errs := s.Deals.Validate(); errs != nil {
		errors = append(errors, errs.Errors...)
	}
	if errs := s.Privacy.Validate(); errs != nil {
		errors = append(errors, errs.Errors...)
	}
	if errs := s.Security.Validate(); errs != nil {
		errors = append(errors, errs.Errors...)
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes UserSettings
func (s *UserSettings) Sanitize() {
	s.Appearance.Sanitize()
	s.Localization.Sanitize()
	s.Notifications.Sanitize()
	s.Dashboard.Sanitize()
	s.Deals.Sanitize()
	s.Privacy.Sanitize()
	s.Security.Sanitize()
}

// respondValidationErrorSettings writes a validation error response
func respondValidationErrorSettings(w http.ResponseWriter, errors *ValidationErrors) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadRequest)
	json.NewEncoder(w).Encode(ValidationErrorResponse{
		Error:   "Validation failed",
		Code:    "VALIDATION_ERROR",
		Details: errors.Errors,
	})
}

// Validatable interface for types that can validate themselves
type Validatable interface {
	Validate() *ValidationErrors
}

// Sanitizable interface for types that can sanitize themselves
type Sanitizable interface {
	Sanitize()
}

// decodeAndValidateSettings decodes JSON and validates the request
func decodeAndValidateSettings(r *http.Request, w http.ResponseWriter, dst interface{}) bool {
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return false
	}

	// Sanitize if applicable
	if sanitizable, ok := dst.(Sanitizable); ok {
		sanitizable.Sanitize()
	}

	// Validate if applicable
	if validatable, ok := dst.(Validatable); ok {
		if errs := validatable.Validate(); errs != nil {
			respondValidationErrorSettings(w, errs)
			return false
		}
	}

	return true
}

// validateUUIDSettings validates a UUID path parameter
func validateUUIDSettings(w http.ResponseWriter, id, fieldName string) bool {
	if !uuidRegex.MatchString(id) {
		respondValidationErrorSettings(w, &ValidationErrors{
			Errors: []ValidationError{{
				Field:   fieldName,
				Message: "Must be a valid UUID",
			}},
		})
		return false
	}
	return true
}

// validateSection validates that a section name is valid
func validateSection(w http.ResponseWriter, section string) bool {
	if !validSections[strings.ToLower(section)] {
		respondValidationErrorSettings(w, &ValidationErrors{
			Errors: []ValidationError{{
				Field:   "section",
				Message: "Invalid section. Must be one of: appearance, localization, notifications, dashboard, deals, customers, inventory, showroom, messages, privacy, security",
			}},
		})
		return false
	}
	return true
}
