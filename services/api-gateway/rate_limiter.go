package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"autolytiq/shared/logging"

	"github.com/redis/go-redis/v9"
)

// RateLimitConfig holds rate limiting configuration
type RateLimitConfig struct {
	// Redis connection
	RedisURL      string
	RedisPassword string
	RedisDB       int

	// Rate limits (requests per minute)
	IPRateLimit         int // For unauthenticated requests
	UserRateLimit       int // For authenticated users
	DealershipRateLimit int // For dealership-wide limits

	// Window duration
	WindowDuration time.Duration

	// Paths to bypass (e.g., health checks)
	BypassPaths []string

	// Enable/disable rate limiting
	Enabled bool
}

// DefaultRateLimitConfig returns default rate limiting configuration
func DefaultRateLimitConfig() *RateLimitConfig {
	return &RateLimitConfig{
		RedisURL:            "redis://localhost:6379",
		RedisPassword:       "",
		RedisDB:             0,
		IPRateLimit:         100,  // 100 req/min for unauthenticated
		UserRateLimit:       1000, // 1000 req/min for authenticated users
		DealershipRateLimit: 5000, // 5000 req/min for dealership
		WindowDuration:      time.Minute,
		BypassPaths:         []string{"/health", "/api/v1/version", "/metrics", "/ready", "/live"},
		Enabled:             true,
	}
}

// RateLimitInfo contains rate limit state for a key
type RateLimitInfo struct {
	Limit     int       `json:"limit"`
	Remaining int       `json:"remaining"`
	ResetAt   time.Time `json:"reset_at"`
	Exceeded  bool      `json:"exceeded"`
}

// RateLimiter handles distributed rate limiting via Redis
type RateLimiter struct {
	config  *RateLimitConfig
	redis   *redis.Client
	metrics *RateLimitMetrics
	logger  *logging.Logger
	mu      sync.RWMutex

	// Fallback in-memory limiter if Redis is unavailable
	fallbackLimiter *InMemoryRateLimiter
	redisAvailable  bool
}

// InMemoryRateLimiter is a fallback when Redis is unavailable
type InMemoryRateLimiter struct {
	mu      sync.RWMutex
	buckets map[string]*bucket
}

type bucket struct {
	count    int
	resetAt  time.Time
	lastSeen time.Time
}

// NewInMemoryRateLimiter creates a new in-memory rate limiter
func NewInMemoryRateLimiter() *InMemoryRateLimiter {
	limiter := &InMemoryRateLimiter{
		buckets: make(map[string]*bucket),
	}

	// Start cleanup goroutine
	go limiter.cleanup()

	return limiter
}

// cleanup removes expired buckets periodically
func (l *InMemoryRateLimiter) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		l.mu.Lock()
		now := time.Now()
		for key, b := range l.buckets {
			if now.Sub(b.lastSeen) > 10*time.Minute {
				delete(l.buckets, key)
			}
		}
		l.mu.Unlock()
	}
}

// Allow checks if a request is allowed
func (l *InMemoryRateLimiter) Allow(key string, limit int, window time.Duration) *RateLimitInfo {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	b, exists := l.buckets[key]

	if !exists || now.After(b.resetAt) {
		// Create new bucket or reset expired one
		l.buckets[key] = &bucket{
			count:    1,
			resetAt:  now.Add(window),
			lastSeen: now,
		}
		return &RateLimitInfo{
			Limit:     limit,
			Remaining: limit - 1,
			ResetAt:   now.Add(window),
			Exceeded:  false,
		}
	}

	b.lastSeen = now
	b.count++

	if b.count > limit {
		return &RateLimitInfo{
			Limit:     limit,
			Remaining: 0,
			ResetAt:   b.resetAt,
			Exceeded:  true,
		}
	}

	return &RateLimitInfo{
		Limit:     limit,
		Remaining: limit - b.count,
		ResetAt:   b.resetAt,
		Exceeded:  false,
	}
}

// NewRateLimiter creates a new rate limiter with Redis backend
func NewRateLimiter(config *RateLimitConfig, metrics *RateLimitMetrics, logger *logging.Logger) (*RateLimiter, error) {
	if config == nil {
		config = DefaultRateLimitConfig()
	}

	limiter := &RateLimiter{
		config:          config,
		metrics:         metrics,
		logger:          logger,
		fallbackLimiter: NewInMemoryRateLimiter(),
		redisAvailable:  false,
	}

	if !config.Enabled {
		logger.Info("Rate limiting is disabled")
		return limiter, nil
	}

	// Parse Redis URL
	opts, err := redis.ParseURL(config.RedisURL)
	if err != nil {
		logger.Warnf("Failed to parse Redis URL, using fallback in-memory limiter: %v", err)
		return limiter, nil
	}

	if config.RedisPassword != "" {
		opts.Password = config.RedisPassword
	}
	opts.DB = config.RedisDB

	limiter.redis = redis.NewClient(opts)

	// Test Redis connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := limiter.redis.Ping(ctx).Err(); err != nil {
		logger.Warnf("Redis connection failed, using fallback in-memory limiter: %v", err)
		return limiter, nil
	}

	limiter.redisAvailable = true
	logger.Info("Rate limiter initialized with Redis backend")

	// Start health check goroutine
	go limiter.healthCheck()

	return limiter, nil
}

// healthCheck periodically checks Redis availability
func (rl *RateLimiter) healthCheck() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		err := rl.redis.Ping(ctx).Err()
		cancel()

		rl.mu.Lock()
		wasAvailable := rl.redisAvailable
		rl.redisAvailable = err == nil
		if wasAvailable != rl.redisAvailable {
			if rl.redisAvailable {
				rl.logger.Info("Redis connection restored")
			} else {
				rl.logger.Warnf("Redis connection lost, falling back to in-memory limiter: %v", err)
			}
		}
		rl.mu.Unlock()
	}
}

// isRedisAvailable checks if Redis is available
func (rl *RateLimiter) isRedisAvailable() bool {
	rl.mu.RLock()
	defer rl.mu.RUnlock()
	return rl.redisAvailable
}

// Allow checks if a request is allowed based on the given key and limit
func (rl *RateLimiter) Allow(ctx context.Context, key string, limit int) *RateLimitInfo {
	if !rl.config.Enabled {
		return &RateLimitInfo{
			Limit:     limit,
			Remaining: limit,
			ResetAt:   time.Now().Add(rl.config.WindowDuration),
			Exceeded:  false,
		}
	}

	if rl.isRedisAvailable() {
		return rl.allowRedis(ctx, key, limit)
	}

	return rl.fallbackLimiter.Allow(key, limit, rl.config.WindowDuration)
}

// allowRedis uses Redis for distributed rate limiting with sliding window
func (rl *RateLimiter) allowRedis(ctx context.Context, key string, limit int) *RateLimitInfo {
	now := time.Now()
	windowStart := now.Add(-rl.config.WindowDuration)
	resetAt := now.Add(rl.config.WindowDuration)

	// Use sorted set with timestamps as scores for sliding window
	redisKey := fmt.Sprintf("ratelimit:%s", key)

	// Lua script for atomic sliding window rate limiting
	script := redis.NewScript(`
		local key = KEYS[1]
		local now = tonumber(ARGV[1])
		local window = tonumber(ARGV[2])
		local limit = tonumber(ARGV[3])
		local window_start = now - window

		-- Remove old entries outside the window
		redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)

		-- Count current requests in window
		local count = redis.call('ZCARD', key)

		if count < limit then
			-- Add current request
			redis.call('ZADD', key, now, now .. '-' .. math.random(1000000))
			redis.call('EXPIRE', key, math.ceil(window / 1000) + 1)
			return {count + 1, limit - count - 1, 0}
		else
			return {count, 0, 1}
		end
	`)

	windowMs := rl.config.WindowDuration.Milliseconds()
	nowMs := now.UnixMilli()

	result, err := script.Run(ctx, rl.redis, []string{redisKey}, nowMs, windowMs, limit).Slice()
	if err != nil {
		rl.logger.Warnf("Redis rate limit error, falling back to in-memory: %v", err)
		rl.mu.Lock()
		rl.redisAvailable = false
		rl.mu.Unlock()
		return rl.fallbackLimiter.Allow(key, limit, rl.config.WindowDuration)
	}

	count := int(result[0].(int64))
	remaining := int(result[1].(int64))
	exceeded := result[2].(int64) == 1

	// Get TTL for reset time
	ttl := rl.redis.TTL(ctx, redisKey).Val()
	if ttl > 0 {
		resetAt = now.Add(ttl)
	}

	// Suppress unused variable warnings
	_ = count
	_ = windowStart

	return &RateLimitInfo{
		Limit:     limit,
		Remaining: remaining,
		ResetAt:   resetAt,
		Exceeded:  exceeded,
	}
}

// shouldBypass checks if the request path should bypass rate limiting
func (rl *RateLimiter) shouldBypass(path string) bool {
	for _, bypassPath := range rl.config.BypassPaths {
		if path == bypassPath || strings.HasPrefix(path, bypassPath+"/") {
			return true
		}
	}
	return false
}

// getClientIP extracts the real client IP from the request
func getClientIP(r *http.Request) string {
	// Check X-Forwarded-For header (from load balancers/proxies)
	xff := r.Header.Get("X-Forwarded-For")
	if xff != "" {
		// Take the first IP in the chain (original client)
		ips := strings.Split(xff, ",")
		if len(ips) > 0 {
			ip := strings.TrimSpace(ips[0])
			if parsedIP := net.ParseIP(ip); parsedIP != nil {
				return ip
			}
		}
	}

	// Check X-Real-IP header
	xri := r.Header.Get("X-Real-IP")
	if xri != "" {
		if parsedIP := net.ParseIP(xri); parsedIP != nil {
			return xri
		}
	}

	// Fall back to RemoteAddr
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// RateLimitMiddleware creates HTTP middleware for rate limiting
func RateLimitMiddleware(limiter *RateLimiter, logger *logging.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Check bypass paths
			if limiter.shouldBypass(r.URL.Path) {
				next.ServeHTTP(w, r)
				return
			}

			ctx := r.Context()

			// Determine rate limit tier and key
			var limitKey string
			var limit int
			var limitType string

			// Check for authenticated user context
			userID := GetUserIDFromContext(ctx)
			dealershipID := GetDealershipIDFromContext(ctx)

			if dealershipID != "" {
				// Check dealership-level rate limit first (highest priority)
				limitKey = fmt.Sprintf("dealership:%s", dealershipID)
				limit = limiter.config.DealershipRateLimit
				limitType = "dealership"

				dealershipInfo := limiter.Allow(ctx, limitKey, limit)
				if dealershipInfo.Exceeded {
					limiter.handleRateLimitExceeded(w, dealershipInfo, limitType)
					return
				}

				// Then check user-level limit within the dealership
				if userID != "" {
					limitKey = fmt.Sprintf("user:%s:%s", dealershipID, userID)
					limit = limiter.config.UserRateLimit
					limitType = "user"
				} else {
					// Authenticated but no user ID (shouldn't happen, but handle gracefully)
					clientIP := getClientIP(r)
					limitKey = fmt.Sprintf("ip:%s", clientIP)
					limit = limiter.config.IPRateLimit
					limitType = "ip"
				}
			} else {
				// Unauthenticated request - use IP-based limiting
				clientIP := getClientIP(r)
				limitKey = fmt.Sprintf("ip:%s", clientIP)
				limit = limiter.config.IPRateLimit
				limitType = "ip"
			}

			// Check rate limit
			info := limiter.Allow(ctx, limitKey, limit)

			// Record metrics
			if limiter.metrics != nil {
				limiter.metrics.RecordHit(limitType)
				if info.Exceeded {
					limiter.metrics.RecordExceeded(limitType)
				}
			}

			// Set rate limit headers
			setRateLimitHeaders(w, info)

			if info.Exceeded {
				limiter.handleRateLimitExceeded(w, info, limitType)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// handleRateLimitExceeded sends HTTP 429 response with proper headers
func (rl *RateLimiter) handleRateLimitExceeded(w http.ResponseWriter, info *RateLimitInfo, limitType string) {
	retryAfter := int(time.Until(info.ResetAt).Seconds())
	if retryAfter < 1 {
		retryAfter = 1
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Retry-After", strconv.Itoa(retryAfter))
	w.WriteHeader(http.StatusTooManyRequests)

	response := map[string]interface{}{
		"error":       "Rate limit exceeded",
		"message":     fmt.Sprintf("Too many requests. Please retry after %d seconds.", retryAfter),
		"limit_type":  limitType,
		"retry_after": retryAfter,
	}

	json.NewEncoder(w).Encode(response)

	rl.logger.WithFields(map[string]interface{}{
		"limit_type":  limitType,
		"retry_after": retryAfter,
	}).Warn("Rate limit exceeded")
}

// setRateLimitHeaders sets standard rate limit response headers
func setRateLimitHeaders(w http.ResponseWriter, info *RateLimitInfo) {
	w.Header().Set("X-RateLimit-Limit", strconv.Itoa(info.Limit))
	w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(info.Remaining))
	w.Header().Set("X-RateLimit-Reset", strconv.FormatInt(info.ResetAt.Unix(), 10))
}

// Close closes the rate limiter and its Redis connection
func (rl *RateLimiter) Close() error {
	if rl.redis != nil {
		return rl.redis.Close()
	}
	return nil
}
