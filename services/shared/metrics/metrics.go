// Package metrics provides Prometheus metrics middleware and collectors for Autolytiq services.
// It exposes RED metrics (Request rate, Error rate, Duration) and database connection pool stats.
package metrics

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// Config holds metrics configuration
type Config struct {
	ServiceName string
	Namespace   string // Prometheus namespace (prefix), defaults to "autolytiq"
}

// Metrics holds all Prometheus metrics for a service
type Metrics struct {
	config Config

	// HTTP metrics (RED)
	httpRequestsTotal    *prometheus.CounterVec
	httpRequestDuration  *prometheus.HistogramVec
	httpRequestsInFlight prometheus.Gauge

	// Database metrics
	dbQueriesTotal        *prometheus.CounterVec
	dbQueryDuration       *prometheus.HistogramVec
	dbConnectionErrors    prometheus.Counter
	dbPoolConnectionsMax  prometheus.Gauge
	dbPoolConnectionsInUse prometheus.Gauge
	dbPoolConnectionsIdle  prometheus.Gauge

	// Application metrics
	activeWebsockets prometheus.Gauge
}

// DefaultBuckets are the default histogram buckets for request duration (in seconds)
var DefaultBuckets = []float64{.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10}

// DBQueryBuckets are histogram buckets optimized for database query durations
var DBQueryBuckets = []float64{.001, .005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5}

// New creates a new Metrics instance with all collectors registered
func New(cfg Config) *Metrics {
	if cfg.Namespace == "" {
		cfg.Namespace = "autolytiq"
	}

	m := &Metrics{
		config: cfg,

		httpRequestsTotal: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: cfg.Namespace,
				Name:      "http_requests_total",
				Help:      "Total number of HTTP requests",
				ConstLabels: prometheus.Labels{
					"service": cfg.ServiceName,
				},
			},
			[]string{"method", "path", "status_code"},
		),

		httpRequestDuration: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Namespace: cfg.Namespace,
				Name:      "http_request_duration_seconds",
				Help:      "HTTP request duration in seconds",
				Buckets:   DefaultBuckets,
				ConstLabels: prometheus.Labels{
					"service": cfg.ServiceName,
				},
			},
			[]string{"method", "path", "status_code"},
		),

		httpRequestsInFlight: promauto.NewGauge(
			prometheus.GaugeOpts{
				Namespace: cfg.Namespace,
				Name:      "http_requests_in_flight",
				Help:      "Number of HTTP requests currently being processed",
				ConstLabels: prometheus.Labels{
					"service": cfg.ServiceName,
				},
			},
		),

		dbQueriesTotal: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: cfg.Namespace,
				Name:      "db_queries_total",
				Help:      "Total number of database queries",
				ConstLabels: prometheus.Labels{
					"service": cfg.ServiceName,
				},
			},
			[]string{"operation", "table"},
		),

		dbQueryDuration: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Namespace: cfg.Namespace,
				Name:      "db_query_duration_seconds",
				Help:      "Database query duration in seconds",
				Buckets:   DBQueryBuckets,
				ConstLabels: prometheus.Labels{
					"service": cfg.ServiceName,
				},
			},
			[]string{"operation", "table"},
		),

		dbConnectionErrors: promauto.NewCounter(
			prometheus.CounterOpts{
				Namespace: cfg.Namespace,
				Name:      "db_connection_errors_total",
				Help:      "Total number of database connection errors",
				ConstLabels: prometheus.Labels{
					"service": cfg.ServiceName,
				},
			},
		),

		dbPoolConnectionsMax: promauto.NewGauge(
			prometheus.GaugeOpts{
				Namespace: cfg.Namespace,
				Name:      "db_pool_connections_max",
				Help:      "Maximum number of database connections in the pool",
				ConstLabels: prometheus.Labels{
					"service": cfg.ServiceName,
				},
			},
		),

		dbPoolConnectionsInUse: promauto.NewGauge(
			prometheus.GaugeOpts{
				Namespace: cfg.Namespace,
				Name:      "db_pool_connections_in_use",
				Help:      "Number of database connections currently in use",
				ConstLabels: prometheus.Labels{
					"service": cfg.ServiceName,
				},
			},
		),

		dbPoolConnectionsIdle: promauto.NewGauge(
			prometheus.GaugeOpts{
				Namespace: cfg.Namespace,
				Name:      "db_pool_connections_idle",
				Help:      "Number of idle database connections in the pool",
				ConstLabels: prometheus.Labels{
					"service": cfg.ServiceName,
				},
			},
		),

		activeWebsockets: promauto.NewGauge(
			prometheus.GaugeOpts{
				Namespace: cfg.Namespace,
				Name:      "websocket_connections_active",
				Help:      "Number of active WebSocket connections",
				ConstLabels: prometheus.Labels{
					"service": cfg.ServiceName,
				},
			},
		),
	}

	return m
}

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
	}
	rw.ResponseWriter.WriteHeader(code)
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	if !rw.written {
		rw.written = true
	}
	return rw.ResponseWriter.Write(b)
}

// Middleware returns an HTTP middleware that records request metrics
func (m *Metrics) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip metrics endpoint to avoid recursion
		if r.URL.Path == "/metrics" {
			next.ServeHTTP(w, r)
			return
		}

		start := time.Now()
		m.httpRequestsInFlight.Inc()

		rw := newResponseWriter(w)
		next.ServeHTTP(rw, r)

		m.httpRequestsInFlight.Dec()
		duration := time.Since(start).Seconds()

		// Get route pattern if using gorilla/mux
		path := r.URL.Path
		if route := mux.CurrentRoute(r); route != nil {
			if pattern, err := route.GetPathTemplate(); err == nil {
				path = pattern
			}
		}

		statusCode := strconv.Itoa(rw.statusCode)

		m.httpRequestsTotal.WithLabelValues(r.Method, path, statusCode).Inc()
		m.httpRequestDuration.WithLabelValues(r.Method, path, statusCode).Observe(duration)
	})
}

// Handler returns the Prometheus metrics HTTP handler
func (m *Metrics) Handler() http.Handler {
	return promhttp.Handler()
}

// RecordDBQuery records a database query metric
func (m *Metrics) RecordDBQuery(operation, table string, duration time.Duration) {
	m.dbQueriesTotal.WithLabelValues(operation, table).Inc()
	m.dbQueryDuration.WithLabelValues(operation, table).Observe(duration.Seconds())
}

// RecordDBConnectionError increments the database connection error counter
func (m *Metrics) RecordDBConnectionError() {
	m.dbConnectionErrors.Inc()
}

// UpdateDBPoolStats updates database connection pool metrics
func (m *Metrics) UpdateDBPoolStats(maxConns, inUse, idle int) {
	m.dbPoolConnectionsMax.Set(float64(maxConns))
	m.dbPoolConnectionsInUse.Set(float64(inUse))
	m.dbPoolConnectionsIdle.Set(float64(idle))
}

// IncrementWebsockets increments the active WebSocket connections counter
func (m *Metrics) IncrementWebsockets() {
	m.activeWebsockets.Inc()
}

// DecrementWebsockets decrements the active WebSocket connections counter
func (m *Metrics) DecrementWebsockets() {
	m.activeWebsockets.Dec()
}

// SetActiveWebsockets sets the active WebSocket connections gauge
func (m *Metrics) SetActiveWebsockets(count int) {
	m.activeWebsockets.Set(float64(count))
}
