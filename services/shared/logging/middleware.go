package logging

import (
	"context"
	"net/http"
	"time"
)

const (
	// RequestIDHeader is the HTTP header for request/trace ID
	RequestIDHeader = "X-Request-ID"
	// DealershipIDHeader is the HTTP header for dealership ID
	DealershipIDHeader = "X-Dealership-ID"
	// UserIDHeader is the HTTP header for user ID
	UserIDHeader = "X-User-ID"
	// UserEmailHeader is the HTTP header for user email
	UserEmailHeader = "X-User-Email"
	// UserRoleHeader is the HTTP header for user role
	UserRoleHeader = "X-User-Role"
)

// responseWriter wraps http.ResponseWriter to capture status code
type responseWriter struct {
	http.ResponseWriter
	statusCode int
	written    bool
}

func newResponseWriter(w http.ResponseWriter) *responseWriter {
	return &responseWriter{
		ResponseWriter: w,
		statusCode:     http.StatusOK,
	}
}

func (rw *responseWriter) WriteHeader(code int) {
	if !rw.written {
		rw.statusCode = code
		rw.written = true
		rw.ResponseWriter.WriteHeader(code)
	}
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	if !rw.written {
		rw.written = true
	}
	return rw.ResponseWriter.Write(b)
}

// RequestIDMiddleware generates or propagates request IDs.
// It reads X-Request-ID from incoming request headers and generates a new one if not present.
// The request ID is added to the response headers and request context.
func RequestIDMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get or generate trace ID
		traceID := r.Header.Get(RequestIDHeader)
		if traceID == "" {
			traceID = NewTraceID()
		}

		// Add trace ID to response header
		w.Header().Set(RequestIDHeader, traceID)

		// Create new context with trace ID
		ctx := WithTraceID(r.Context(), traceID)

		// Extract other context values from headers
		if dealershipID := r.Header.Get(DealershipIDHeader); dealershipID != "" {
			ctx = WithDealershipID(ctx, dealershipID)
		}
		if userID := r.Header.Get(UserIDHeader); userID != "" {
			ctx = WithUserID(ctx, userID)
		}
		if userEmail := r.Header.Get(UserEmailHeader); userEmail != "" {
			ctx = WithUserEmail(ctx, userEmail)
		}
		if userRole := r.Header.Get(UserRoleHeader); userRole != "" {
			ctx = WithUserRole(ctx, userRole)
		}

		// Continue with updated context
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequestLoggingMiddleware logs all HTTP requests with structured fields.
// It should be used after RequestIDMiddleware to ensure trace_id is available.
func RequestLoggingMiddleware(logger *Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()

			// Wrap response writer to capture status code
			wrapped := newResponseWriter(w)

			// Get logger with context
			ctxLogger := logger.WithContext(r.Context())

			// Log request start (debug level)
			ctxLogger.WithFields(map[string]interface{}{
				"method": r.Method,
				"path":   r.URL.Path,
				"query":  r.URL.RawQuery,
			}).Debug("request started")

			// Process request
			next.ServeHTTP(wrapped, r)

			// Calculate duration
			duration := time.Since(start)

			// Log request completion
			ctxLogger.RequestLog(r.Method, r.URL.Path, wrapped.statusCode, duration, nil)
		})
	}
}

// CombinedMiddleware combines RequestIDMiddleware and RequestLoggingMiddleware.
// This is a convenience function for applying both middlewares at once.
func CombinedMiddleware(logger *Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return RequestIDMiddleware(RequestLoggingMiddleware(logger)(next))
	}
}

// PropagateHeaders copies logging-related headers from an incoming request
// to an outgoing request. Use this when making internal service calls.
func PropagateHeaders(from *http.Request, to *http.Request) {
	headers := []string{
		RequestIDHeader,
		DealershipIDHeader,
		UserIDHeader,
		UserEmailHeader,
		UserRoleHeader,
	}

	for _, header := range headers {
		if value := from.Header.Get(header); value != "" {
			to.Header.Set(header, value)
		}
	}
}

// PropagateHeadersFromContext sets logging-related headers on an outgoing request
// based on context values.
func PropagateHeadersFromContext(ctx context.Context, to *http.Request) {
	if traceID := GetTraceID(ctx); traceID != "" {
		to.Header.Set(RequestIDHeader, traceID)
	}
	if dealershipID := GetDealershipID(ctx); dealershipID != "" {
		to.Header.Set(DealershipIDHeader, dealershipID)
	}
	if userID := GetUserID(ctx); userID != "" {
		to.Header.Set(UserIDHeader, userID)
	}
	if userEmail := GetUserEmail(ctx); userEmail != "" {
		to.Header.Set(UserEmailHeader, userEmail)
	}
	if userRole := GetUserRole(ctx); userRole != "" {
		to.Header.Set(UserRoleHeader, userRole)
	}
}
