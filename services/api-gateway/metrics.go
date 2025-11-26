package main

import (
	"net/http"
	"sync"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// RateLimitMetrics holds Prometheus metrics for rate limiting and HTTP requests
type RateLimitMetrics struct {
	hitsTotal     *prometheus.CounterVec
	exceededTotal *prometheus.CounterVec

	// HTTP metrics (standard autolytiq namespace for consistency across services)
	httpRequestsTotal    *prometheus.CounterVec
	httpRequestDuration  *prometheus.HistogramVec
	httpRequestsInFlight prometheus.Gauge

	// Proxy metrics
	proxyRequestsTotal   *prometheus.CounterVec
	proxyRequestDuration *prometheus.HistogramVec

	// Legacy metrics (keep for backward compatibility)
	requestsTotal   *prometheus.CounterVec
	requestDuration *prometheus.HistogramVec

	mu       sync.Once
	registry *prometheus.Registry
}

// DefaultBuckets for request duration histograms
var DefaultBuckets = []float64{.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10}

const serviceName = "api-gateway"

// NewRateLimitMetrics creates new rate limit metrics
func NewRateLimitMetrics() *RateLimitMetrics {
	m := &RateLimitMetrics{
		hitsTotal: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: "autolytiq",
				Name:      "rate_limit_hits_total",
				Help:      "Total number of rate limit checks performed",
				ConstLabels: prometheus.Labels{"service": serviceName},
			},
			[]string{"limit_type"},
		),
		exceededTotal: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: "autolytiq",
				Name:      "rate_limit_exceeded_total",
				Help:      "Total number of requests that exceeded rate limits",
				ConstLabels: prometheus.Labels{"service": serviceName},
			},
			[]string{"limit_type"},
		),
		// Standard HTTP metrics (consistent with other services)
		httpRequestsTotal: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Namespace:   "autolytiq",
				Name:        "http_requests_total",
				Help:        "Total number of HTTP requests",
				ConstLabels: prometheus.Labels{"service": serviceName},
			},
			[]string{"method", "path", "status_code"},
		),
		httpRequestDuration: prometheus.NewHistogramVec(
			prometheus.HistogramOpts{
				Namespace:   "autolytiq",
				Name:        "http_request_duration_seconds",
				Help:        "HTTP request duration in seconds",
				Buckets:     DefaultBuckets,
				ConstLabels: prometheus.Labels{"service": serviceName},
			},
			[]string{"method", "path", "status_code"},
		),
		httpRequestsInFlight: prometheus.NewGauge(
			prometheus.GaugeOpts{
				Namespace:   "autolytiq",
				Name:        "http_requests_in_flight",
				Help:        "Number of HTTP requests currently being processed",
				ConstLabels: prometheus.Labels{"service": serviceName},
			},
		),
		// Proxy metrics for backend service calls
		proxyRequestsTotal: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Namespace:   "autolytiq",
				Name:        "proxy_requests_total",
				Help:        "Total number of proxied requests to backend services",
				ConstLabels: prometheus.Labels{"service": serviceName},
			},
			[]string{"target_service", "status_code"},
		),
		proxyRequestDuration: prometheus.NewHistogramVec(
			prometheus.HistogramOpts{
				Namespace:   "autolytiq",
				Name:        "proxy_request_duration_seconds",
				Help:        "Duration of proxied requests to backend services",
				Buckets:     DefaultBuckets,
				ConstLabels: prometheus.Labels{"service": serviceName},
			},
			[]string{"target_service"},
		),
		// Legacy metrics (backward compatibility)
		requestsTotal: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Name: "api_gateway_requests_total",
				Help: "Total number of HTTP requests processed (legacy)",
			},
			[]string{"method", "path", "status"},
		),
		requestDuration: prometheus.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "api_gateway_request_duration_seconds",
				Help:    "HTTP request duration in seconds (legacy)",
				Buckets: prometheus.DefBuckets,
			},
			[]string{"method", "path"},
		),
		registry: prometheus.NewRegistry(),
	}

	// Register metrics with the custom registry
	m.registry.MustRegister(
		m.hitsTotal,
		m.exceededTotal,
		m.httpRequestsTotal,
		m.httpRequestDuration,
		m.httpRequestsInFlight,
		m.proxyRequestsTotal,
		m.proxyRequestDuration,
		m.requestsTotal,
		m.requestDuration,
		prometheus.NewGoCollector(),
		prometheus.NewProcessCollector(prometheus.ProcessCollectorOpts{}),
	)

	return m
}

// RecordHit increments the rate limit hits counter
func (m *RateLimitMetrics) RecordHit(limitType string) {
	m.hitsTotal.WithLabelValues(limitType).Inc()
}

// RecordExceeded increments the rate limit exceeded counter
func (m *RateLimitMetrics) RecordExceeded(limitType string) {
	m.exceededTotal.WithLabelValues(limitType).Inc()
}

// RecordRequest records an HTTP request
func (m *RateLimitMetrics) RecordRequest(method, path, status string) {
	m.requestsTotal.WithLabelValues(method, path, status).Inc()
}

// ObserveRequestDuration records the duration of an HTTP request
func (m *RateLimitMetrics) ObserveRequestDuration(method, path string, duration float64) {
	m.requestDuration.WithLabelValues(method, path).Observe(duration)
}

// RecordHTTPRequest records an HTTP request with the standard autolytiq metrics
func (m *RateLimitMetrics) RecordHTTPRequest(method, path, statusCode string, duration float64) {
	m.httpRequestsTotal.WithLabelValues(method, path, statusCode).Inc()
	m.httpRequestDuration.WithLabelValues(method, path, statusCode).Observe(duration)
}

// IncrementInFlight increments the in-flight request counter
func (m *RateLimitMetrics) IncrementInFlight() {
	m.httpRequestsInFlight.Inc()
}

// DecrementInFlight decrements the in-flight request counter
func (m *RateLimitMetrics) DecrementInFlight() {
	m.httpRequestsInFlight.Dec()
}

// RecordProxyRequest records a proxied request to a backend service
func (m *RateLimitMetrics) RecordProxyRequest(targetService, statusCode string, duration float64) {
	m.proxyRequestsTotal.WithLabelValues(targetService, statusCode).Inc()
	m.proxyRequestDuration.WithLabelValues(targetService).Observe(duration)
}

// Handler returns an HTTP handler for the /metrics endpoint
func (m *RateLimitMetrics) Handler() http.Handler {
	return promhttp.HandlerFor(m.registry, promhttp.HandlerOpts{
		EnableOpenMetrics: true,
	})
}

// metricsMiddleware wraps handlers to collect HTTP metrics
func metricsMiddleware(metrics *RateLimitMetrics) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Skip metrics for metrics endpoint itself
			if r.URL.Path == "/metrics" {
				next.ServeHTTP(w, r)
				return
			}

			// Track in-flight requests
			metrics.IncrementInFlight()
			defer metrics.DecrementInFlight()

			// Wrap response writer to capture status code
			wrapper := &responseWriterWrapper{
				ResponseWriter: w,
				statusCode:     http.StatusOK,
			}

			start := prometheus.NewTimer(prometheus.ObserverFunc(func(v float64) {}))

			next.ServeHTTP(wrapper, r)

			duration := start.ObserveDuration().Seconds()

			// Normalize path to prevent high cardinality
			normalizedPath := normalizePath(r.URL.Path)
			statusCode := http.StatusText(wrapper.statusCode)

			// Record both standard and legacy metrics
			metrics.RecordHTTPRequest(r.Method, normalizedPath, statusCode, duration)
			metrics.RecordRequest(r.Method, normalizedPath, statusCode)
			metrics.ObserveRequestDuration(r.Method, normalizedPath, duration)
		})
	}
}

// responseWriterWrapper wraps http.ResponseWriter to capture status code
type responseWriterWrapper struct {
	http.ResponseWriter
	statusCode int
}

func (w *responseWriterWrapper) WriteHeader(code int) {
	w.statusCode = code
	w.ResponseWriter.WriteHeader(code)
}

// normalizePath normalizes URL paths to prevent high cardinality metrics
// It replaces IDs and UUIDs with placeholders
func normalizePath(path string) string {
	// Common path patterns that should be normalized
	// This is a simple implementation; a more sophisticated version
	// might use regex to detect UUIDs and numeric IDs

	// Limit to first 3 path segments for cardinality control
	parts := splitPath(path)
	if len(parts) > 4 {
		parts = parts[:4]
	}

	// Replace numeric IDs and UUIDs with placeholders
	for i, part := range parts {
		if isID(part) {
			parts[i] = ":id"
		}
	}

	if len(parts) == 0 {
		return "/"
	}

	return "/" + joinPath(parts)
}

// splitPath splits a path into segments
func splitPath(path string) []string {
	var parts []string
	start := 0
	for i := 0; i <= len(path); i++ {
		if i == len(path) || path[i] == '/' {
			if i > start {
				parts = append(parts, path[start:i])
			}
			start = i + 1
		}
	}
	return parts
}

// joinPath joins path segments
func joinPath(parts []string) string {
	result := ""
	for i, part := range parts {
		if i > 0 {
			result += "/"
		}
		result += part
	}
	return result
}

// isID checks if a string looks like an ID (numeric or UUID)
func isID(s string) bool {
	if len(s) == 0 {
		return false
	}

	// Check if numeric
	isNumeric := true
	for _, c := range s {
		if c < '0' || c > '9' {
			isNumeric = false
			break
		}
	}
	if isNumeric && len(s) > 0 {
		return true
	}

	// Check if UUID-like (36 chars with hyphens or 32 chars without)
	if len(s) == 36 || len(s) == 32 {
		validChars := true
		for _, c := range s {
			if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F') || c == '-') {
				validChars = false
				break
			}
		}
		return validChars
	}

	return false
}
