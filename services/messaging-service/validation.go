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

	validMessageTypes = map[string]bool{
		"TEXT":     true,
		"IMAGE":    true,
		"VIDEO":    true,
		"FILE":     true,
		"VOICE":    true,
		"LOCATION": true,
	}

	validConversationTypes = map[string]bool{
		"DIRECT":    true,
		"GROUP":     true,
		"BROADCAST": true,
	}

	validParticipantRoles = map[string]bool{
		"ADMIN":  true,
		"MEMBER": true,
	}

	validReactionTypes = map[string]bool{
		"LIKE":      true,
		"LOVE":      true,
		"LAUGH":     true,
		"EMPHASIZE": true,
		"QUESTION":  true,
	}
)

// Validate validates CreateConversationRequest
func (r *CreateConversationRequest) Validate() *ValidationErrors {
	var errors []ValidationError

	// Type validation
	if r.Type == "" {
		errors = append(errors, ValidationError{
			Field:   "type",
			Message: "Conversation type is required",
		})
	} else if !validConversationTypes[strings.ToUpper(r.Type)] {
		errors = append(errors, ValidationError{
			Field:   "type",
			Message: "Invalid type. Must be one of: DIRECT, GROUP, BROADCAST",
		})
	}

	// Participant IDs validation
	if len(r.ParticipantIDs) == 0 {
		errors = append(errors, ValidationError{
			Field:   "participant_ids",
			Message: "At least one participant is required",
		})
	} else {
		for i, id := range r.ParticipantIDs {
			if !uuidRegex.MatchString(id) {
				errors = append(errors, ValidationError{
					Field:   "participant_ids",
					Message: "Participant ID at index " + string(rune('0'+i)) + " must be a valid UUID",
				})
				break
			}
		}
		if len(r.ParticipantIDs) > 100 {
			errors = append(errors, ValidationError{
				Field:   "participant_ids",
				Message: "Maximum 100 participants allowed",
			})
		}
	}

	// Name validation (optional, for GROUP/BROADCAST)
	if r.Name != nil && len(*r.Name) > 200 {
		errors = append(errors, ValidationError{
			Field:   "name",
			Message: "Name must be 200 characters or less",
		})
	}

	// Description validation (optional)
	if r.Description != nil && len(*r.Description) > 1000 {
		errors = append(errors, ValidationError{
			Field:   "description",
			Message: "Description must be 1000 characters or less",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes CreateConversationRequest
func (r *CreateConversationRequest) Sanitize() {
	r.Type = strings.TrimSpace(strings.ToUpper(r.Type))
	for i := range r.ParticipantIDs {
		r.ParticipantIDs[i] = strings.TrimSpace(r.ParticipantIDs[i])
	}
	if r.Name != nil {
		val := strings.TrimSpace(*r.Name)
		r.Name = &val
	}
	if r.Description != nil {
		val := strings.TrimSpace(*r.Description)
		r.Description = &val
	}
}

// Validate validates UpdateConversationRequest
func (r *UpdateConversationRequest) Validate() *ValidationErrors {
	var errors []ValidationError

	// Name validation (optional)
	if r.Name != nil && len(*r.Name) > 200 {
		errors = append(errors, ValidationError{
			Field:   "name",
			Message: "Name must be 200 characters or less",
		})
	}

	// Description validation (optional)
	if r.Description != nil && len(*r.Description) > 1000 {
		errors = append(errors, ValidationError{
			Field:   "description",
			Message: "Description must be 1000 characters or less",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes UpdateConversationRequest
func (r *UpdateConversationRequest) Sanitize() {
	if r.Name != nil {
		val := strings.TrimSpace(*r.Name)
		r.Name = &val
	}
	if r.Description != nil {
		val := strings.TrimSpace(*r.Description)
		r.Description = &val
	}
}

// Validate validates SendMessageRequest
func (r *SendMessageRequest) Validate() *ValidationErrors {
	var errors []ValidationError

	// Type validation
	if r.Type == "" {
		errors = append(errors, ValidationError{
			Field:   "type",
			Message: "Message type is required",
		})
	} else if !validMessageTypes[strings.ToUpper(r.Type)] {
		errors = append(errors, ValidationError{
			Field:   "type",
			Message: "Invalid type. Must be one of: TEXT, IMAGE, VIDEO, FILE, VOICE, LOCATION",
		})
	}

	// Content validation
	if r.Type == "TEXT" || r.Type == "" {
		if r.Content == "" {
			errors = append(errors, ValidationError{
				Field:   "content",
				Message: "Content is required for text messages",
			})
		} else if len(r.Content) > 10000 {
			errors = append(errors, ValidationError{
				Field:   "content",
				Message: "Content must be 10000 characters or less",
			})
		}
	}

	// Reply to ID validation (optional)
	if r.ReplyToID != nil && *r.ReplyToID != "" && !uuidRegex.MatchString(*r.ReplyToID) {
		errors = append(errors, ValidationError{
			Field:   "reply_to_id",
			Message: "Must be a valid UUID",
		})
	}

	// Ephemeral seconds validation
	if r.IsEphemeral && r.EphemeralSeconds != nil {
		if *r.EphemeralSeconds < 5 || *r.EphemeralSeconds > 604800 {
			errors = append(errors, ValidationError{
				Field:   "ephemeral_seconds",
				Message: "Ephemeral duration must be between 5 seconds and 7 days (604800 seconds)",
			})
		}
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes SendMessageRequest
func (r *SendMessageRequest) Sanitize() {
	r.Type = strings.TrimSpace(strings.ToUpper(r.Type))
	r.Content = strings.TrimSpace(r.Content)
	if r.ReplyToID != nil {
		val := strings.TrimSpace(*r.ReplyToID)
		r.ReplyToID = &val
	}
}

// Validate validates UpdateMessageRequest
func (r *UpdateMessageRequest) Validate() *ValidationErrors {
	var errors []ValidationError

	// Content validation
	if r.Content == "" {
		errors = append(errors, ValidationError{
			Field:   "content",
			Message: "Content is required",
		})
	} else if len(r.Content) > 10000 {
		errors = append(errors, ValidationError{
			Field:   "content",
			Message: "Content must be 10000 characters or less",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes UpdateMessageRequest
func (r *UpdateMessageRequest) Sanitize() {
	r.Content = strings.TrimSpace(r.Content)
}

// Validate validates AddReactionRequest
func (r *AddReactionRequest) Validate() *ValidationErrors {
	var errors []ValidationError

	// Reaction type validation
	if r.ReactionType == "" {
		errors = append(errors, ValidationError{
			Field:   "reaction_type",
			Message: "Reaction type is required",
		})
	} else if !validReactionTypes[strings.ToUpper(r.ReactionType)] {
		errors = append(errors, ValidationError{
			Field:   "reaction_type",
			Message: "Invalid reaction type. Must be one of: LIKE, LOVE, LAUGH, EMPHASIZE, QUESTION",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes AddReactionRequest
func (r *AddReactionRequest) Sanitize() {
	r.ReactionType = strings.TrimSpace(strings.ToUpper(r.ReactionType))
}

// AddParticipantRequest is the request body for adding a participant
type AddParticipantRequest struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
}

// Validate validates AddParticipantRequest
func (r *AddParticipantRequest) Validate() *ValidationErrors {
	var errors []ValidationError

	// User ID validation
	if r.UserID == "" {
		errors = append(errors, ValidationError{
			Field:   "user_id",
			Message: "User ID is required",
		})
	} else if !uuidRegex.MatchString(r.UserID) {
		errors = append(errors, ValidationError{
			Field:   "user_id",
			Message: "Must be a valid UUID",
		})
	}

	// Role validation (optional, defaults to MEMBER)
	if r.Role != "" && !validParticipantRoles[strings.ToUpper(r.Role)] {
		errors = append(errors, ValidationError{
			Field:   "role",
			Message: "Invalid role. Must be one of: ADMIN, MEMBER",
		})
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes AddParticipantRequest
func (r *AddParticipantRequest) Sanitize() {
	r.UserID = strings.TrimSpace(r.UserID)
	if r.Role == "" {
		r.Role = "MEMBER"
	} else {
		r.Role = strings.TrimSpace(strings.ToUpper(r.Role))
	}
}

// TypingRequest is the request body for typing indicators
type TypingRequest struct {
	IsTyping bool `json:"is_typing"`
}

// Validate validates TypingRequest (no validation needed, just implement interface)
func (r *TypingRequest) Validate() *ValidationErrors {
	return nil
}

// Sanitize sanitizes TypingRequest (nothing to sanitize)
func (r *TypingRequest) Sanitize() {}

// respondValidationErrorMessaging writes a validation error response
func respondValidationErrorMessaging(w http.ResponseWriter, errors *ValidationErrors) {
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

// decodeAndValidateMessaging decodes JSON and validates the request
func decodeAndValidateMessaging(r *http.Request, w http.ResponseWriter, dst interface{}) bool {
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
			respondValidationErrorMessaging(w, errs)
			return false
		}
	}

	return true
}

// validateUUIDMessaging validates a UUID path parameter
func validateUUIDMessaging(w http.ResponseWriter, id, fieldName string) bool {
	if !uuidRegex.MatchString(id) {
		respondValidationErrorMessaging(w, &ValidationErrors{
			Errors: []ValidationError{{
				Field:   fieldName,
				Message: "Must be a valid UUID",
			}},
		})
		return false
	}
	return true
}
