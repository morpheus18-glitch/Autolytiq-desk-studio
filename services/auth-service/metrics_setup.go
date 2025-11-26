package main

import (
	"database/sql"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

const serviceName = "auth-service"

// Metrics holds all Prometheus metrics for the Auth service
type Metrics struct {
	httpRequestsTotal      *prometheus.CounterVec
	httpRequestDuration    *prometheus.HistogramVec
	httpRequestsInFlight   prometheus.Gauge
	dbQueriesTotal         *prometheus.CounterVec
	dbQueryDuration        *prometheus.HistogramVec
	dbConnectionErrors     prometheus.Counter
	dbPoolConnectionsMax   prometheus.Gauge
	dbPoolConnectionsInUse prometheus.Gauge
	dbPoolConnectionsIdle  prometheus.Gauge
	authAttemptsTotal      *prometheus.CounterVec
	activeSessionsTotal    prometheus.Gauge
}

// DefaultBuckets are the default histogram buckets for request duration (in seconds)
var DefaultBuckets = []float64{.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10}

// DBQueryBuckets are histogram buckets optimized for database query durations
var DBQueryBuckets = []float64{.001, .005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5}

// NewMetrics creates and registers all Prometheus metrics
func NewMetrics() *Metrics {
	return &Metrics{
		httpRequestsTotal: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Namespace:   "autolytiq",
				Name:        "http_requests_total",
				Help:        "Total number of HTTP requests",
				ConstLabels: prometheus.Labels{"service": serviceName},
			},
			[]string{"method", "path", "status_code"},
		),

		httpRequestDuration: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Namespace:   "autolytiq",
				Name:        "http_request_duration_seconds",
				Help:        "HTTP request duration in seconds",
				Buckets:     DefaultBuckets,
				ConstLabels: prometheus.Labels{"service": serviceName},
			},
			[]string{"method", "path", "status_code"},
		),

		httpRequestsInFlight: promauto.NewGauge(
			prometheus.GaugeOpts{
				Namespace:   "autolytiq",
				Name:        "http_requests_in_flight",
				Help:        "Number of HTTP requests currently being processed",
				ConstLabels: prometheus.Labels{"service": serviceName},
			},
		),

		dbQueriesTotal: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Namespace:   "autolytiq",
				Name:        "db_queries_total",
				Help:        "Total number of database queries",
				ConstLabels: prometheus.Labels{"service": serviceName},
			},
			[]string{"operation", "table"},
		),

		dbQueryDuration: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Namespace:   "autolytiq",
				Name:        "db_query_duration_seconds",
				Help:        "Database query duration in seconds",
				Buckets:     DBQueryBuckets,
				ConstLabels: prometheus.Labels{"service": serviceName},
			},
			[]string{"operation", "table"},
		),

		dbConnectionErrors: promauto.NewCounter(
			prometheus.CounterOpts{
				Namespace:   "autolytiq",
				Name:        "db_connection_errors_total",
				Help:        "Total number of database connection errors",
				ConstLabels: prometheus.Labels{"service": serviceName},
			},
		),

		dbPoolConnectionsMax: promauto.NewGauge(
			prometheus.GaugeOpts{
				Namespace:   "autolytiq",
				Name:        "db_pool_connections_max",
				Help:        "Maximum number of database connections in the pool",
				ConstLabels: prometheus.Labels{"service": serviceName},
			},
		),

		dbPoolConnectionsInUse: promauto.NewGauge(
			prometheus.GaugeOpts{
				Namespace:   "autolytiq",
				Name:        "db_pool_connections_in_use",
				Help:        "Number of database connections currently in use",
				ConstLabels: prometheus.Labels{"service": serviceName},
			},
		),

		dbPoolConnectionsIdle: promauto.NewGauge(
			prometheus.GaugeOpts{
				Namespace:   "autolytiq",
				Name:        "db_pool_connections_idle",
				Help:        "Number of idle database connections in the pool",
				ConstLabels: prometheus.Labels{"service": serviceName},
			},
		),

		authAttemptsTotal: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Namespace:   "autolytiq",
				Name:        "auth_attempts_total",
				Help:        "Total number of authentication attempts",
				ConstLabels: prometheus.Labels{"service": serviceName},
			},
			[]string{"type", "result"},
		),

		activeSessionsTotal: promauto.NewGauge(
			prometheus.GaugeOpts{
				Namespace:   "autolytiq",
				Name:        "active_sessions_total",
				Help:        "Number of active user sessions",
				ConstLabels: prometheus.Labels{"service": serviceName},
			},
		),
	}
}

// metricsResponseWriter wraps http.ResponseWriter to capture status code
type metricsResponseWriter struct {
	http.ResponseWriter
	statusCode int
	written    bool
}

func newMetricsResponseWriter(w http.ResponseWriter) *metricsResponseWriter {
	return &metricsResponseWriter{
		ResponseWriter: w,
		statusCode:     http.StatusOK,
	}
}

func (rw *metricsResponseWriter) WriteHeader(code int) {
	if !rw.written {
		rw.statusCode = code
		rw.written = true
	}
	rw.ResponseWriter.WriteHeader(code)
}

func (rw *metricsResponseWriter) Write(b []byte) (int, error) {
	if !rw.written {
		rw.written = true
	}
	return rw.ResponseWriter.Write(b)
}

// Middleware returns an HTTP middleware that records request metrics
func (m *Metrics) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip metrics endpoint
		if r.URL.Path == "/metrics" {
			next.ServeHTTP(w, r)
			return
		}

		start := time.Now()
		m.httpRequestsInFlight.Inc()

		rw := newMetricsResponseWriter(w)
		next.ServeHTTP(rw, r)

		m.httpRequestsInFlight.Dec()
		duration := time.Since(start).Seconds()

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

// UpdateDBPoolStats updates database connection pool metrics from sql.DBStats
func (m *Metrics) UpdateDBPoolStats(db *sql.DB) {
	stats := db.Stats()
	m.dbPoolConnectionsMax.Set(float64(stats.MaxOpenConnections))
	m.dbPoolConnectionsInUse.Set(float64(stats.InUse))
	m.dbPoolConnectionsIdle.Set(float64(stats.Idle))
}

// RecordAuthAttempt records an authentication attempt
func (m *Metrics) RecordAuthAttempt(authType string, success bool) {
	result := "failure"
	if success {
		result = "success"
	}
	m.authAttemptsTotal.WithLabelValues(authType, result).Inc()
}

// SetActiveSessions sets the number of active sessions
func (m *Metrics) SetActiveSessions(count int) {
	m.activeSessionsTotal.Set(float64(count))
}

// StartDBStatsCollector starts a goroutine that periodically updates DB pool stats
func (m *Metrics) StartDBStatsCollector(db *sql.DB, interval time.Duration) func() {
	ticker := time.NewTicker(interval)
	done := make(chan bool)

	go func() {
		for {
			select {
			case <-ticker.C:
				m.UpdateDBPoolStats(db)
			case <-done:
				ticker.Stop()
				return
			}
		}
	}()

	// Return a stop function
	return func() {
		done <- true
	}
}
