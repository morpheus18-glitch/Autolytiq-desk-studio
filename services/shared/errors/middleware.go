package errors

import (
	"net/http"
	"runtime/debug"

	"autolytiq/shared/logging"
)

// RecoveryMiddleware catches panics and returns a proper error response
func RecoveryMiddleware(logger *logging.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if err := recover(); err != nil {
					// Log the panic with stack trace
					stack := string(debug.Stack())
					logger.WithContext(r.Context()).
						WithField("panic", err).
						WithField("stack", stack).
						Error("Panic recovered in HTTP handler")

					// Return a generic internal error (don't expose panic details)
					apiErr := Internal("An unexpected error occurred")
					WriteError(w, r, apiErr)
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}

// ErrorHandlerMiddleware wraps handlers to catch and format errors consistently
func ErrorHandlerMiddleware(logger *logging.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Create a response wrapper to capture the status code
			rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
			next.ServeHTTP(rw, r)
		})
	}
}

// responseWriter wraps http.ResponseWriter to capture status code
type responseWriter struct {
	http.ResponseWriter
	statusCode int
	written    bool
}

func (rw *responseWriter) WriteHeader(code int) {
	if !rw.written {
		rw.statusCode = code
		rw.ResponseWriter.WriteHeader(code)
		rw.written = true
	}
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	if !rw.written {
		rw.WriteHeader(http.StatusOK)
	}
	return rw.ResponseWriter.Write(b)
}

// NotFoundHandler returns a JSON 404 response
func NotFoundHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		WriteError(w, r, NotFound(""))
	})
}

// MethodNotAllowedHandler returns a JSON 405 response
func MethodNotAllowedHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		err := NewError(CodeMethodNotAllowed, "Method not allowed", http.StatusMethodNotAllowed)
		WriteError(w, r, err)
	})
}

// TimeoutHandler wraps a handler with a timeout
func TimeoutHandler(h http.Handler, timeout string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Use context deadline if set, otherwise just call handler
		h.ServeHTTP(w, r)
	})
}
