package main

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"autolytiq/shared/logging"
)

// testLogger creates a logger for tests
func testLogger() *logging.Logger {
	return logging.New(logging.Config{
		Service:     "api-gateway-test",
		Level:       logging.LevelError, // Suppress log output during tests
		Output:      &bytes.Buffer{},
		PrettyPrint: false,
	})
}

// TestInMemoryRateLimiter_Allow tests the in-memory rate limiter
func TestInMemoryRateLimiter_Allow(t *testing.T) {
	limiter := NewInMemoryRateLimiter()

	testCases := []struct {
		name         string
		key          string
		limit        int
		window       time.Duration
		requestCount int
		expectExceed bool
		expectRemain int
	}{
		{
			name:         "under limit",
			key:          "test-key-1",
			limit:        10,
			window:       time.Minute,
			requestCount: 5,
			expectExceed: false,
			expectRemain: 5,
		},
		{
			name:         "at limit",
			key:          "test-key-2",
			limit:        10,
			window:       time.Minute,
			requestCount: 10,
			expectExceed: false,
			expectRemain: 0,
		},
		{
			name:         "over limit",
			key:          "test-key-3",
			limit:        10,
			window:       time.Minute,
			requestCount: 15,
			expectExceed: true,
			expectRemain: 0,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			var lastInfo *RateLimitInfo
			for i := 0; i < tc.requestCount; i++ {
				lastInfo = limiter.Allow(tc.key, tc.limit, tc.window)
			}

			if lastInfo.Exceeded != tc.expectExceed {
				t.Errorf("expected exceeded=%v, got %v", tc.expectExceed, lastInfo.Exceeded)
			}
			if lastInfo.Remaining != tc.expectRemain {
				t.Errorf("expected remaining=%d, got %d", tc.expectRemain, lastInfo.Remaining)
			}
		})
	}
}

// TestInMemoryRateLimiter_WindowExpiry tests window expiration
func TestInMemoryRateLimiter_WindowExpiry(t *testing.T) {
	limiter := NewInMemoryRateLimiter()

	key := "expiry-test"
	limit := 5
	window := 100 * time.Millisecond

	// Use all tokens
	for i := 0; i < limit; i++ {
		info := limiter.Allow(key, limit, window)
		if info.Exceeded {
			t.Errorf("should not exceed limit on request %d", i+1)
		}
	}

	// Next request should exceed
	info := limiter.Allow(key, limit, window)
	if !info.Exceeded {
		t.Error("should exceed limit after using all tokens")
	}

	// Wait for window to expire
	time.Sleep(window + 10*time.Millisecond)

	// Should be allowed again
	info = limiter.Allow(key, limit, window)
	if info.Exceeded {
		t.Error("should be allowed after window expires")
	}
	if info.Remaining != limit-1 {
		t.Errorf("expected remaining=%d, got %d", limit-1, info.Remaining)
	}
}

// TestRateLimiter_Disabled tests that disabled rate limiter allows all requests
func TestRateLimiter_Disabled(t *testing.T) {
	config := DefaultRateLimitConfig()
	config.Enabled = false

	logger := testLogger()
	limiter, err := NewRateLimiter(config, nil, logger)
	if err != nil {
		t.Fatalf("failed to create rate limiter: %v", err)
	}

	ctx := context.Background()

	// Should always be allowed when disabled
	for i := 0; i < 1000; i++ {
		info := limiter.Allow(ctx, "test-key", 10)
		if info.Exceeded {
			t.Errorf("disabled rate limiter should never exceed, got exceeded on request %d", i+1)
		}
	}
}

// TestRateLimiter_BypassPaths tests path bypass functionality
func TestRateLimiter_BypassPaths(t *testing.T) {
	config := DefaultRateLimitConfig()
	config.BypassPaths = []string{"/health", "/metrics", "/api/v1/version"}
	config.Enabled = true

	logger := testLogger()
	limiter, err := NewRateLimiter(config, nil, logger)
	if err != nil {
		t.Fatalf("failed to create rate limiter: %v", err)
	}

	testCases := []struct {
		path     string
		expected bool
	}{
		{"/health", true},
		{"/health/ready", true},
		{"/metrics", true},
		{"/api/v1/version", true},
		{"/api/v1/deals", false},
		{"/api/v1/customers", false},
		{"/healthz", false}, // Different path
	}

	for _, tc := range testCases {
		t.Run(tc.path, func(t *testing.T) {
			result := limiter.shouldBypass(tc.path)
			if result != tc.expected {
				t.Errorf("shouldBypass(%s) = %v, expected %v", tc.path, result, tc.expected)
			}
		})
	}
}

// TestGetClientIP tests IP extraction from requests
func TestGetClientIP(t *testing.T) {
	testCases := []struct {
		name       string
		headers    map[string]string
		remoteAddr string
		expected   string
	}{
		{
			name:       "X-Forwarded-For single IP",
			headers:    map[string]string{"X-Forwarded-For": "192.168.1.1"},
			remoteAddr: "10.0.0.1:12345",
			expected:   "192.168.1.1",
		},
		{
			name:       "X-Forwarded-For multiple IPs",
			headers:    map[string]string{"X-Forwarded-For": "192.168.1.1, 10.0.0.2, 172.16.0.1"},
			remoteAddr: "10.0.0.1:12345",
			expected:   "192.168.1.1",
		},
		{
			name:       "X-Real-IP",
			headers:    map[string]string{"X-Real-IP": "192.168.1.2"},
			remoteAddr: "10.0.0.1:12345",
			expected:   "192.168.1.2",
		},
		{
			name:       "X-Forwarded-For takes precedence",
			headers:    map[string]string{"X-Forwarded-For": "192.168.1.1", "X-Real-IP": "192.168.1.2"},
			remoteAddr: "10.0.0.1:12345",
			expected:   "192.168.1.1",
		},
		{
			name:       "RemoteAddr fallback",
			headers:    map[string]string{},
			remoteAddr: "10.0.0.1:12345",
			expected:   "10.0.0.1",
		},
		{
			name:       "RemoteAddr without port",
			headers:    map[string]string{},
			remoteAddr: "10.0.0.1",
			expected:   "10.0.0.1",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/test", nil)
			req.RemoteAddr = tc.remoteAddr
			for k, v := range tc.headers {
				req.Header.Set(k, v)
			}

			result := getClientIP(req)
			if result != tc.expected {
				t.Errorf("getClientIP() = %s, expected %s", result, tc.expected)
			}
		})
	}
}

// TestRateLimitMiddleware_IPRateLimiting tests IP-based rate limiting for unauthenticated requests
func TestRateLimitMiddleware_IPRateLimiting(t *testing.T) {
	config := DefaultRateLimitConfig()
	config.IPRateLimit = 5
	config.WindowDuration = time.Minute
	config.Enabled = true

	logger := testLogger()
	metrics := NewRateLimitMetrics()
	limiter, err := NewRateLimiter(config, metrics, logger)
	if err != nil {
		t.Fatalf("failed to create rate limiter: %v", err)
	}

	handler := RateLimitMiddleware(limiter, logger)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Use a unique IP for this test to avoid cross-test pollution
	testIP := "172.16.0.1:12345"

	// Make requests up to the limit
	for i := 0; i < config.IPRateLimit; i++ {
		req := httptest.NewRequest("GET", "/api/v1/test", nil)
		req.RemoteAddr = testIP
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("request %d: expected status 200, got %d", i+1, rr.Code)
		}

		// Check rate limit headers
		if rr.Header().Get("X-RateLimit-Limit") == "" {
			t.Errorf("request %d: missing X-RateLimit-Limit header", i+1)
		}
		if rr.Header().Get("X-RateLimit-Remaining") == "" {
			t.Errorf("request %d: missing X-RateLimit-Remaining header", i+1)
		}
		if rr.Header().Get("X-RateLimit-Reset") == "" {
			t.Errorf("request %d: missing X-RateLimit-Reset header", i+1)
		}
	}

	// Next request should be rate limited
	req := httptest.NewRequest("GET", "/api/v1/test", nil)
	req.RemoteAddr = testIP
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusTooManyRequests {
		t.Errorf("expected status 429, got %d", rr.Code)
	}

	if rr.Header().Get("Retry-After") == "" {
		t.Error("missing Retry-After header on 429 response")
	}

	// Check response body
	var response map[string]interface{}
	if err := json.Unmarshal(rr.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to parse response body: %v", err)
	}
	if response["error"] != "Rate limit exceeded" {
		t.Errorf("expected error message 'Rate limit exceeded', got %v", response["error"])
	}
}

// TestRateLimitMiddleware_BypassHealth tests that health endpoints bypass rate limiting
func TestRateLimitMiddleware_BypassHealth(t *testing.T) {
	config := DefaultRateLimitConfig()
	config.IPRateLimit = 2
	config.WindowDuration = time.Minute
	config.Enabled = true
	config.BypassPaths = []string{"/health"}

	logger := testLogger()
	metrics := NewRateLimitMetrics()
	limiter, err := NewRateLimiter(config, metrics, logger)
	if err != nil {
		t.Fatalf("failed to create rate limiter: %v", err)
	}

	handler := RateLimitMiddleware(limiter, logger)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Make many requests to /health - should all succeed
	for i := 0; i < 100; i++ {
		req := httptest.NewRequest("GET", "/health", nil)
		req.RemoteAddr = "192.168.1.1:12345"
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("health check request %d: expected status 200, got %d", i+1, rr.Code)
		}
	}
}

// TestRateLimitMiddleware_AuthenticatedUser tests user-based rate limiting
func TestRateLimitMiddleware_AuthenticatedUser(t *testing.T) {
	config := DefaultRateLimitConfig()
	config.UserRateLimit = 5
	config.DealershipRateLimit = 100
	config.WindowDuration = time.Minute
	config.Enabled = true

	logger := testLogger()
	metrics := NewRateLimitMetrics()
	limiter, err := NewRateLimiter(config, metrics, logger)
	if err != nil {
		t.Fatalf("failed to create rate limiter: %v", err)
	}

	jwtConfig := &JWTConfig{
		SecretKey: "test-secret-key-for-testing-1234",
		Issuer:    "test-issuer",
	}

	// Create a handler that includes JWT context
	handler := JWTMiddleware(jwtConfig)(
		RateLimitMiddleware(limiter, logger)(
			http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			}),
		),
	)

	// Generate a valid token with unique user and dealership IDs for this test
	token, err := GenerateToken(jwtConfig, "auth-test-user-123", "auth-test-dealer-456", "authtest@example.com", "admin")
	if err != nil {
		t.Fatalf("failed to generate token: %v", err)
	}

	// Use unique IP for this test
	testIP := "172.16.1.1:12345"

	// Make requests up to the user limit
	for i := 0; i < config.UserRateLimit; i++ {
		req := httptest.NewRequest("GET", "/api/v1/test", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		req.RemoteAddr = testIP
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("request %d: expected status 200, got %d", i+1, rr.Code)
		}
	}

	// Next request should be rate limited
	req := httptest.NewRequest("GET", "/api/v1/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	req.RemoteAddr = testIP
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusTooManyRequests {
		t.Errorf("expected status 429, got %d", rr.Code)
	}
}

// TestRateLimitMiddleware_DifferentIPs tests that different IPs have separate limits
func TestRateLimitMiddleware_DifferentIPs(t *testing.T) {
	config := DefaultRateLimitConfig()
	config.IPRateLimit = 5
	config.WindowDuration = time.Minute
	config.Enabled = true

	logger := testLogger()
	metrics := NewRateLimitMetrics()
	limiter, err := NewRateLimiter(config, metrics, logger)
	if err != nil {
		t.Fatalf("failed to create rate limiter: %v", err)
	}

	handler := RateLimitMiddleware(limiter, logger)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Use unique IPs that aren't used in other tests
	ips := []string{"10.20.30.1:12345", "10.20.30.2:12345", "10.20.30.3:12345"}

	for _, ip := range ips {
		// Each IP should get its own limit
		for i := 0; i < config.IPRateLimit; i++ {
			req := httptest.NewRequest("GET", "/api/v1/test", nil)
			req.RemoteAddr = ip
			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, req)

			if rr.Code != http.StatusOK {
				t.Errorf("IP %s request %d: expected status 200, got %d", ip, i+1, rr.Code)
			}
		}

		// Each IP should get rate limited after exceeding its limit
		req := httptest.NewRequest("GET", "/api/v1/test", nil)
		req.RemoteAddr = ip
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusTooManyRequests {
			t.Errorf("IP %s: expected status 429 after limit, got %d", ip, rr.Code)
		}
	}
}

// TestRateLimitHeaders tests that rate limit headers are correctly set
func TestRateLimitHeaders(t *testing.T) {
	config := DefaultRateLimitConfig()
	config.IPRateLimit = 10
	config.WindowDuration = time.Minute
	config.Enabled = true

	logger := testLogger()
	metrics := NewRateLimitMetrics()
	limiter, err := NewRateLimiter(config, metrics, logger)
	if err != nil {
		t.Fatalf("failed to create rate limiter: %v", err)
	}

	handler := RateLimitMiddleware(limiter, logger)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Use a unique IP for this test
	testIP := "172.16.2.1:12345"

	req := httptest.NewRequest("GET", "/api/v1/test", nil)
	req.RemoteAddr = testIP
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	// Check X-RateLimit-Limit
	limitHeader := rr.Header().Get("X-RateLimit-Limit")
	if limitHeader != "10" {
		t.Errorf("X-RateLimit-Limit = %s, expected 10", limitHeader)
	}

	// Check X-RateLimit-Remaining
	remainingHeader := rr.Header().Get("X-RateLimit-Remaining")
	if remainingHeader != "9" {
		t.Errorf("X-RateLimit-Remaining = %s, expected 9", remainingHeader)
	}

	// Check X-RateLimit-Reset (should be a Unix timestamp)
	resetHeader := rr.Header().Get("X-RateLimit-Reset")
	if resetHeader == "" {
		t.Error("X-RateLimit-Reset header is empty")
	}
}

// TestSetRateLimitHeaders tests the header setting helper
func TestSetRateLimitHeaders(t *testing.T) {
	info := &RateLimitInfo{
		Limit:     100,
		Remaining: 50,
		ResetAt:   time.Now().Add(30 * time.Second),
		Exceeded:  false,
	}

	rr := httptest.NewRecorder()
	setRateLimitHeaders(rr, info)

	if rr.Header().Get("X-RateLimit-Limit") != "100" {
		t.Errorf("X-RateLimit-Limit = %s, expected 100", rr.Header().Get("X-RateLimit-Limit"))
	}

	if rr.Header().Get("X-RateLimit-Remaining") != "50" {
		t.Errorf("X-RateLimit-Remaining = %s, expected 50", rr.Header().Get("X-RateLimit-Remaining"))
	}

	if rr.Header().Get("X-RateLimit-Reset") == "" {
		t.Error("X-RateLimit-Reset header is empty")
	}
}

// TestIsID tests the ID detection helper
func TestIsID(t *testing.T) {
	testCases := []struct {
		input    string
		expected bool
	}{
		{"123", true},
		{"456789", true},
		{"a1b2c3d4-e5f6-7890-abcd-ef1234567890", true}, // UUID with dashes
		{"a1b2c3d4e5f67890abcdef1234567890", true},     // UUID without dashes
		{"deals", false},
		{"customers", false},
		{"api", false},
		{"v1", false},
		{"", false},
	}

	for _, tc := range testCases {
		t.Run(tc.input, func(t *testing.T) {
			result := isID(tc.input)
			if result != tc.expected {
				t.Errorf("isID(%s) = %v, expected %v", tc.input, result, tc.expected)
			}
		})
	}
}

// TestNormalizePath tests path normalization for metrics
func TestNormalizePath(t *testing.T) {
	testCases := []struct {
		input    string
		expected string
	}{
		{"/api/v1/deals", "/api/v1/deals"},
		{"/api/v1/deals/123", "/api/v1/deals/:id"},
		{"/api/v1/customers/a1b2c3d4-e5f6-7890-abcd-ef1234567890", "/api/v1/customers/:id"},
		{"/health", "/health"},
		{"/", "/"},
		{"/api/v1/users/123/activity", "/api/v1/users/:id"},
	}

	for _, tc := range testCases {
		t.Run(tc.input, func(t *testing.T) {
			result := normalizePath(tc.input)
			if result != tc.expected {
				t.Errorf("normalizePath(%s) = %s, expected %s", tc.input, result, tc.expected)
			}
		})
	}
}

// TestRateLimitMetrics tests metrics collection
func TestRateLimitMetrics(t *testing.T) {
	metrics := NewRateLimitMetrics()

	// Record some hits
	metrics.RecordHit("ip")
	metrics.RecordHit("ip")
	metrics.RecordHit("user")

	// Record some exceeded
	metrics.RecordExceeded("ip")

	// Record requests
	metrics.RecordRequest("GET", "/api/v1/deals", "OK")
	metrics.RecordRequest("POST", "/api/v1/deals", "Created")

	// Observe duration
	metrics.ObserveRequestDuration("GET", "/api/v1/deals", 0.123)

	// Just verify no panics - actual values would require scraping the registry
	handler := metrics.Handler()
	if handler == nil {
		t.Error("metrics handler should not be nil")
	}
}

// TestDefaultRateLimitConfig tests default configuration values
func TestDefaultRateLimitConfig(t *testing.T) {
	config := DefaultRateLimitConfig()

	if config.IPRateLimit != 100 {
		t.Errorf("default IPRateLimit = %d, expected 100", config.IPRateLimit)
	}
	if config.UserRateLimit != 1000 {
		t.Errorf("default UserRateLimit = %d, expected 1000", config.UserRateLimit)
	}
	if config.DealershipRateLimit != 5000 {
		t.Errorf("default DealershipRateLimit = %d, expected 5000", config.DealershipRateLimit)
	}
	if config.WindowDuration != time.Minute {
		t.Errorf("default WindowDuration = %v, expected 1m", config.WindowDuration)
	}
	if !config.Enabled {
		t.Error("default Enabled should be true")
	}
	if len(config.BypassPaths) == 0 {
		t.Error("default BypassPaths should not be empty")
	}

	// Check bypass paths contain expected values
	expectedPaths := []string{"/health", "/metrics", "/ready", "/live"}
	for _, expected := range expectedPaths {
		found := false
		for _, path := range config.BypassPaths {
			if path == expected {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("default BypassPaths should contain %s", expected)
		}
	}
}

// TestRateLimiter_Close tests proper cleanup
func TestRateLimiter_Close(t *testing.T) {
	config := DefaultRateLimitConfig()
	config.Enabled = false // Don't try to connect to Redis

	logger := testLogger()
	limiter, err := NewRateLimiter(config, nil, logger)
	if err != nil {
		t.Fatalf("failed to create rate limiter: %v", err)
	}

	// Close should not error even without Redis connection
	if err := limiter.Close(); err != nil {
		t.Errorf("Close() error = %v", err)
	}
}

// BenchmarkInMemoryRateLimiter benchmarks in-memory rate limiter performance
func BenchmarkInMemoryRateLimiter(b *testing.B) {
	limiter := NewInMemoryRateLimiter()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		key := "benchmark-key"
		limiter.Allow(key, 1000, time.Minute)
	}
}

// BenchmarkRateLimitMiddleware benchmarks the full middleware
func BenchmarkRateLimitMiddleware(b *testing.B) {
	config := DefaultRateLimitConfig()
	config.IPRateLimit = 10000 // High limit to avoid 429s
	config.Enabled = true

	logger := testLogger()
	limiter, _ := NewRateLimiter(config, nil, logger)

	handler := RateLimitMiddleware(limiter, logger)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/api/v1/test", nil)
	req.RemoteAddr = "192.168.1.1:12345"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)
	}
}

// TestRateLimitResponse tests the 429 response format
func TestRateLimitResponse(t *testing.T) {
	config := DefaultRateLimitConfig()
	config.IPRateLimit = 1
	config.WindowDuration = time.Minute
	config.Enabled = true

	logger := testLogger()
	metrics := NewRateLimitMetrics()
	limiter, err := NewRateLimiter(config, metrics, logger)
	if err != nil {
		t.Fatalf("failed to create rate limiter: %v", err)
	}

	handler := RateLimitMiddleware(limiter, logger)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// First request uses up the limit
	req := httptest.NewRequest("GET", "/api/v1/test", nil)
	req.RemoteAddr = "192.168.1.200:12345"
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	// Second request should be rate limited
	rr = httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusTooManyRequests {
		t.Errorf("expected status 429, got %d", rr.Code)
	}

	// Verify Content-Type
	contentType := rr.Header().Get("Content-Type")
	if !strings.Contains(contentType, "application/json") {
		t.Errorf("Content-Type = %s, expected application/json", contentType)
	}

	// Verify response body structure
	var response map[string]interface{}
	if err := json.Unmarshal(rr.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}

	requiredFields := []string{"error", "message", "limit_type", "retry_after"}
	for _, field := range requiredFields {
		if _, ok := response[field]; !ok {
			t.Errorf("response missing required field: %s", field)
		}
	}

	if response["limit_type"] != "ip" {
		t.Errorf("limit_type = %v, expected 'ip'", response["limit_type"])
	}
}
