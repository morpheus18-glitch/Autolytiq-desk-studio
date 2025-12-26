// Package auth provides authentication middleware for inter-service communication.
package auth

import (
	"crypto/subtle"
	"net/http"
)

const (
	// ServiceAuthHeader is the HTTP header for inter-service authentication
	ServiceAuthHeader = "X-Service-Auth"
)

// ServiceAuthConfig holds configuration for service authentication
type ServiceAuthConfig struct {
	// ServiceSecret is the shared secret for inter-service authentication
	ServiceSecret string
	// BypassPaths are paths that don't require service authentication (e.g., health checks)
	BypassPaths []string
}

// DefaultBypassPaths returns the default paths that bypass service authentication
func DefaultBypassPaths() []string {
	return []string{
		"/health",
		"/ready",
		"/live",
		"/metrics",
	}
}

// ServiceAuthMiddleware creates middleware that verifies inter-service authentication.
// It checks for the X-Service-Auth header and validates it against the configured secret.
// Health check endpoints are bypassed by default.
//
// The middleware allows requests in two scenarios:
// 1. The request has a valid X-Service-Auth header matching the service secret
// 2. The request has an Authorization header (external request authenticated via JWT)
// 3. The request is to a bypass path (health checks, etc.)
//
// If SERVICE_SECRET is empty or not configured, the middleware allows all requests
// (for backwards compatibility during migration).
func ServiceAuthMiddleware(config ServiceAuthConfig) func(http.Handler) http.Handler {
	// Build bypass path set for O(1) lookup
	bypassSet := make(map[string]bool)
	for _, path := range config.BypassPaths {
		bypassSet[path] = true
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Skip auth if no service secret is configured (migration mode)
			if config.ServiceSecret == "" {
				next.ServeHTTP(w, r)
				return
			}

			// Check if path should bypass authentication
			if bypassSet[r.URL.Path] {
				next.ServeHTTP(w, r)
				return
			}

			// Check for service auth header
			serviceAuth := r.Header.Get(ServiceAuthHeader)
			if serviceAuth != "" {
				// Validate using constant-time comparison to prevent timing attacks
				if subtle.ConstantTimeCompare([]byte(serviceAuth), []byte(config.ServiceSecret)) == 1 {
					next.ServeHTTP(w, r)
					return
				}
				// Invalid service secret
				http.Error(w, `{"error":"Invalid service credentials"}`, http.StatusForbidden)
				return
			}

			// Check if this is an external request (has JWT Authorization header)
			// External requests are authenticated by the API gateway's JWT middleware
			// and don't need service-level authentication
			if r.Header.Get("Authorization") != "" {
				next.ServeHTTP(w, r)
				return
			}

			// Check for dealership context headers (set by API gateway after JWT validation)
			// If these headers are present, the request came through the API gateway
			if r.Header.Get("X-Dealership-ID") != "" || r.Header.Get("X-User-ID") != "" {
				next.ServeHTTP(w, r)
				return
			}

			// No valid authentication found
			http.Error(w, `{"error":"Unauthorized: missing service authentication"}`, http.StatusUnauthorized)
		})
	}
}

// NewServiceAuthConfig creates a ServiceAuthConfig with default bypass paths
func NewServiceAuthConfig(serviceSecret string) ServiceAuthConfig {
	return ServiceAuthConfig{
		ServiceSecret: serviceSecret,
		BypassPaths:   DefaultBypassPaths(),
	}
}

// WithBypassPaths returns a new config with additional bypass paths
func (c ServiceAuthConfig) WithBypassPaths(paths ...string) ServiceAuthConfig {
	c.BypassPaths = append(c.BypassPaths, paths...)
	return c
}
