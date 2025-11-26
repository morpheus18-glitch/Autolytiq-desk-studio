// Package health provides comprehensive health checking for microservices.
//
// It supports liveness, readiness, and detailed health checks with
// dependency monitoring for databases, Redis, and external services.
package health

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"
)

// Status represents the health status of a service or dependency.
type Status string

const (
	StatusHealthy   Status = "healthy"
	StatusDegraded  Status = "degraded"
	StatusUnhealthy Status = "unhealthy"
)

// LivenessStatus represents liveness probe status.
type LivenessStatus string

const (
	StatusAlive LivenessStatus = "alive"
	StatusDead  LivenessStatus = "dead"
)

// ReadinessStatus represents readiness probe status.
type ReadinessStatus string

const (
	StatusReady    ReadinessStatus = "ready"
	StatusNotReady ReadinessStatus = "not_ready"
)

// DependencyHealth represents the health status of a single dependency.
type DependencyHealth struct {
	Name        string `json:"name"`
	Status      Status `json:"status"`
	LatencyMs   int64  `json:"latency_ms,omitempty"`
	Message     string `json:"message,omitempty"`
	LastChecked string `json:"last_checked"`
	Critical    bool   `json:"critical"`
}

// HealthCheckResult represents the full health check response.
type HealthCheckResult struct {
	Status       Status             `json:"status"`
	Service      string             `json:"service"`
	Version      string             `json:"version"`
	Timestamp    string             `json:"timestamp"`
	Uptime       int64              `json:"uptime"`
	Dependencies []DependencyHealth `json:"dependencies"`
}

// LivenessResult represents the liveness probe response.
type LivenessResult struct {
	Status    LivenessStatus `json:"status"`
	Service   string         `json:"service"`
	Timestamp string         `json:"timestamp"`
}

// ReadinessResult represents the readiness probe response.
type ReadinessResult struct {
	Status       ReadinessStatus    `json:"status"`
	Service      string             `json:"service"`
	Timestamp    string             `json:"timestamp"`
	Dependencies []DependencyHealth `json:"dependencies"`
}

// DependencyChecker defines how to check a dependency's health.
type DependencyChecker interface {
	Name() string
	IsCritical() bool
	Check(ctx context.Context) (healthy bool, latencyMs int64, message string)
}

// Config holds the configuration for the health checker.
type Config struct {
	ServiceName string
	Version     string
	TimeoutMs   int64
}

// Checker manages health checks for a service.
type Checker struct {
	config      Config
	dependencies []DependencyChecker
	startTime   time.Time
	mu          sync.RWMutex
	lastResults map[string]DependencyHealth
}

// NewChecker creates a new health checker.
func NewChecker(config Config) *Checker {
	return &Checker{
		config:      config,
		dependencies: make([]DependencyChecker, 0),
		startTime:   time.Now(),
		lastResults: make(map[string]DependencyHealth),
	}
}

// AddDependency adds a dependency checker.
func (c *Checker) AddDependency(dep DependencyChecker) {
	c.dependencies = append(c.dependencies, dep)
}

// checkDependency checks a single dependency with timeout.
func (c *Checker) checkDependency(ctx context.Context, dep DependencyChecker) DependencyHealth {
	ctx, cancel := context.WithTimeout(ctx, time.Duration(c.config.TimeoutMs)*time.Millisecond)
	defer cancel()

	resultCh := make(chan DependencyHealth, 1)

	go func() {
		healthy, latencyMs, message := dep.Check(ctx)
		status := StatusHealthy
		if !healthy {
			status = StatusUnhealthy
		}
		resultCh <- DependencyHealth{
			Name:        dep.Name(),
			Status:      status,
			LatencyMs:   latencyMs,
			Message:     message,
			LastChecked: time.Now().UTC().Format(time.RFC3339),
			Critical:    dep.IsCritical(),
		}
	}()

	select {
	case result := <-resultCh:
		c.mu.Lock()
		c.lastResults[dep.Name()] = result
		c.mu.Unlock()
		return result
	case <-ctx.Done():
		result := DependencyHealth{
			Name:        dep.Name(),
			Status:      StatusUnhealthy,
			Message:     "Health check timeout",
			LastChecked: time.Now().UTC().Format(time.RFC3339),
			Critical:    dep.IsCritical(),
		}
		c.mu.Lock()
		c.lastResults[dep.Name()] = result
		c.mu.Unlock()
		return result
	}
}

// checkAllDependencies checks all registered dependencies.
func (c *Checker) checkAllDependencies(ctx context.Context) []DependencyHealth {
	results := make([]DependencyHealth, len(c.dependencies))
	var wg sync.WaitGroup

	for i, dep := range c.dependencies {
		wg.Add(1)
		go func(idx int, d DependencyChecker) {
			defer wg.Done()
			results[idx] = c.checkDependency(ctx, d)
		}(i, dep)
	}

	wg.Wait()
	return results
}

// determineStatus determines overall status from dependency results.
func (c *Checker) determineStatus(deps []DependencyHealth) Status {
	for _, d := range deps {
		if d.Critical && d.Status == StatusUnhealthy {
			return StatusUnhealthy
		}
	}

	for _, d := range deps {
		if d.Status == StatusUnhealthy {
			return StatusDegraded
		}
	}

	return StatusHealthy
}

// Liveness performs a liveness check.
func (c *Checker) Liveness() LivenessResult {
	return LivenessResult{
		Status:    StatusAlive,
		Service:   c.config.ServiceName,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}
}

// Readiness performs a readiness check.
func (c *Checker) Readiness(ctx context.Context) ReadinessResult {
	deps := c.checkAllDependencies(ctx)

	// Filter to critical dependencies only
	criticalDeps := make([]DependencyHealth, 0)
	allCriticalHealthy := true

	for _, d := range deps {
		if d.Critical {
			criticalDeps = append(criticalDeps, d)
			if d.Status != StatusHealthy {
				allCriticalHealthy = false
			}
		}
	}

	status := StatusReady
	if !allCriticalHealthy {
		status = StatusNotReady
	}

	return ReadinessResult{
		Status:       status,
		Service:      c.config.ServiceName,
		Timestamp:    time.Now().UTC().Format(time.RFC3339),
		Dependencies: criticalDeps,
	}
}

// Health performs a full health check.
func (c *Checker) Health(ctx context.Context) HealthCheckResult {
	deps := c.checkAllDependencies(ctx)
	status := c.determineStatus(deps)
	uptime := int64(time.Since(c.startTime).Seconds())

	return HealthCheckResult{
		Status:       status,
		Service:      c.config.ServiceName,
		Version:      c.config.Version,
		Timestamp:    time.Now().UTC().Format(time.RFC3339),
		Uptime:       uptime,
		Dependencies: deps,
	}
}

// GetCachedResults returns the last cached health check results.
func (c *Checker) GetCachedResults() map[string]DependencyHealth {
	c.mu.RLock()
	defer c.mu.RUnlock()

	results := make(map[string]DependencyHealth)
	for k, v := range c.lastResults {
		results[k] = v
	}
	return results
}

// Handler creates HTTP handlers for health endpoints.
type Handler struct {
	checker *Checker
}

// NewHandler creates a new health handler.
func NewHandler(checker *Checker) *Handler {
	return &Handler{checker: checker}
}

// LivenessHandler handles GET /live requests.
func (h *Handler) LivenessHandler(w http.ResponseWriter, r *http.Request) {
	result := h.checker.Liveness()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(result)
}

// ReadinessHandler handles GET /ready requests.
func (h *Handler) ReadinessHandler(w http.ResponseWriter, r *http.Request) {
	result := h.checker.Readiness(r.Context())

	statusCode := http.StatusOK
	if result.Status != StatusReady {
		statusCode = http.StatusServiceUnavailable
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(result)
}

// HealthHandler handles GET /health requests.
func (h *Handler) HealthHandler(w http.ResponseWriter, r *http.Request) {
	result := h.checker.Health(r.Context())

	statusCode := http.StatusOK
	if result.Status == StatusUnhealthy {
		statusCode = http.StatusServiceUnavailable
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(result)
}

// RegisterRoutes registers health check routes with a mux router.
func (h *Handler) RegisterRoutes(mux interface {
	HandleFunc(pattern string, handler func(http.ResponseWriter, *http.Request)) interface{ Methods(...string) interface{} }
}) {
	mux.HandleFunc("/health", h.HealthHandler).Methods("GET")
	mux.HandleFunc("/ready", h.ReadinessHandler).Methods("GET")
	mux.HandleFunc("/live", h.LivenessHandler).Methods("GET")
}

// =============================================================================
// Pre-built Dependency Checkers
// =============================================================================

// PostgresChecker checks PostgreSQL database connectivity.
type PostgresChecker struct {
	name     string
	critical bool
	pingFn   func(ctx context.Context) error
}

// NewPostgresChecker creates a new PostgreSQL health checker.
func NewPostgresChecker(name string, critical bool, pingFn func(ctx context.Context) error) *PostgresChecker {
	return &PostgresChecker{
		name:     name,
		critical: critical,
		pingFn:   pingFn,
	}
}

func (p *PostgresChecker) Name() string     { return p.name }
func (p *PostgresChecker) IsCritical() bool { return p.critical }

func (p *PostgresChecker) Check(ctx context.Context) (bool, int64, string) {
	start := time.Now()
	err := p.pingFn(ctx)
	latency := time.Since(start).Milliseconds()

	if err != nil {
		return false, latency, fmt.Sprintf("Database error: %v", err)
	}
	return true, latency, "Database connection successful"
}

// RedisChecker checks Redis connectivity.
type RedisChecker struct {
	name     string
	critical bool
	pingFn   func(ctx context.Context) error
}

// NewRedisChecker creates a new Redis health checker.
func NewRedisChecker(name string, critical bool, pingFn func(ctx context.Context) error) *RedisChecker {
	return &RedisChecker{
		name:     name,
		critical: critical,
		pingFn:   pingFn,
	}
}

func (r *RedisChecker) Name() string     { return r.name }
func (r *RedisChecker) IsCritical() bool { return r.critical }

func (r *RedisChecker) Check(ctx context.Context) (bool, int64, string) {
	start := time.Now()
	err := r.pingFn(ctx)
	latency := time.Since(start).Milliseconds()

	if err != nil {
		return false, latency, fmt.Sprintf("Redis error: %v", err)
	}
	return true, latency, "Redis connection successful"
}

// HTTPServiceChecker checks HTTP service availability.
type HTTPServiceChecker struct {
	name     string
	critical bool
	url      string
	client   *http.Client
}

// NewHTTPServiceChecker creates a new HTTP service health checker.
func NewHTTPServiceChecker(name string, url string, critical bool, timeout time.Duration) *HTTPServiceChecker {
	return &HTTPServiceChecker{
		name:     name,
		critical: critical,
		url:      url,
		client: &http.Client{
			Timeout: timeout,
		},
	}
}

func (h *HTTPServiceChecker) Name() string     { return h.name }
func (h *HTTPServiceChecker) IsCritical() bool { return h.critical }

func (h *HTTPServiceChecker) Check(ctx context.Context) (bool, int64, string) {
	start := time.Now()

	req, err := http.NewRequestWithContext(ctx, "GET", h.url, nil)
	if err != nil {
		return false, 0, fmt.Sprintf("Failed to create request: %v", err)
	}

	resp, err := h.client.Do(req)
	latency := time.Since(start).Milliseconds()

	if err != nil {
		return false, latency, fmt.Sprintf("Request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return true, latency, fmt.Sprintf("%s is healthy", h.name)
	}

	return false, latency, fmt.Sprintf("%s returned status %d", h.name, resp.StatusCode)
}

// CustomChecker allows defining custom health checks.
type CustomChecker struct {
	name     string
	critical bool
	checkFn  func(ctx context.Context) (bool, int64, string)
}

// NewCustomChecker creates a new custom health checker.
func NewCustomChecker(name string, critical bool, checkFn func(ctx context.Context) (bool, int64, string)) *CustomChecker {
	return &CustomChecker{
		name:     name,
		critical: critical,
		checkFn:  checkFn,
	}
}

func (c *CustomChecker) Name() string     { return c.name }
func (c *CustomChecker) IsCritical() bool { return c.critical }

func (c *CustomChecker) Check(ctx context.Context) (bool, int64, string) {
	return c.checkFn(ctx)
}
