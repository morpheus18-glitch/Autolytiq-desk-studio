package logging

import (
	"context"

	"github.com/google/uuid"
)

// Context keys for request metadata
type contextKey string

const (
	// TraceIDKey is the context key for trace/request ID
	TraceIDKey contextKey = "trace_id"
	// UserIDKey is the context key for user ID
	UserIDKey contextKey = "user_id"
	// DealershipIDKey is the context key for dealership ID
	DealershipIDKey contextKey = "dealership_id"
	// UserEmailKey is the context key for user email
	UserEmailKey contextKey = "user_email"
	// UserRoleKey is the context key for user role
	UserRoleKey contextKey = "user_role"
)

// WithTraceID returns a new context with the trace ID set.
// If traceID is empty, a new UUID is generated.
func WithTraceID(ctx context.Context, traceID string) context.Context {
	if traceID == "" {
		traceID = uuid.New().String()
	}
	return context.WithValue(ctx, TraceIDKey, traceID)
}

// GetTraceID returns the trace ID from the context, or empty string if not set.
func GetTraceID(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	if id, ok := ctx.Value(TraceIDKey).(string); ok {
		return id
	}
	return ""
}

// WithUserID returns a new context with the user ID set.
func WithUserID(ctx context.Context, userID string) context.Context {
	return context.WithValue(ctx, UserIDKey, userID)
}

// GetUserID returns the user ID from the context, or empty string if not set.
func GetUserID(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	if id, ok := ctx.Value(UserIDKey).(string); ok {
		return id
	}
	return ""
}

// WithDealershipID returns a new context with the dealership ID set.
func WithDealershipID(ctx context.Context, dealershipID string) context.Context {
	return context.WithValue(ctx, DealershipIDKey, dealershipID)
}

// GetDealershipID returns the dealership ID from the context, or empty string if not set.
func GetDealershipID(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	if id, ok := ctx.Value(DealershipIDKey).(string); ok {
		return id
	}
	return ""
}

// WithUserEmail returns a new context with the user email set.
func WithUserEmail(ctx context.Context, email string) context.Context {
	return context.WithValue(ctx, UserEmailKey, email)
}

// GetUserEmail returns the user email from the context, or empty string if not set.
func GetUserEmail(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	if email, ok := ctx.Value(UserEmailKey).(string); ok {
		return email
	}
	return ""
}

// WithUserRole returns a new context with the user role set.
func WithUserRole(ctx context.Context, role string) context.Context {
	return context.WithValue(ctx, UserRoleKey, role)
}

// GetUserRole returns the user role from the context, or empty string if not set.
func GetUserRole(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	if role, ok := ctx.Value(UserRoleKey).(string); ok {
		return role
	}
	return ""
}

// NewTraceID generates a new unique trace ID.
func NewTraceID() string {
	return uuid.New().String()
}
