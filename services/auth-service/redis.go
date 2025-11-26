package main

import (
	"context"
	"fmt"
	"time"

	"autolytiq/shared/logging"

	"github.com/go-redis/redis/v8"
)

// TokenStore defines the interface for token storage operations
type TokenStore interface {
	Close() error
	StoreRefreshToken(userID, token string, ttl time.Duration) error
	ValidateRefreshToken(userID, token string) (bool, error)
	RemoveRefreshToken(userID string) error
	BlacklistToken(token string, ttl time.Duration) error
	IsTokenBlacklisted(token string) (bool, error)
	StoreResetToken(userID, token string, ttl time.Duration) error
	ValidateResetToken(token string) (string, error)
	RemoveResetToken(token string) error
	StoreEmailToken(userID, token string, ttl time.Duration) error
	ValidateEmailToken(token string) (string, error)
	RemoveEmailToken(token string) error
}

// RedisStore implements TokenStore using Redis
type RedisStore struct {
	client *redis.Client
	ctx    context.Context
	logger *logging.Logger
}

const (
	refreshTokenPrefix = "refresh_token:"
	blacklistPrefix    = "blacklist:"
	resetTokenPrefix   = "reset_token:"
	emailTokenPrefix   = "email_token:"
)

// NewRedisStore creates a new Redis store
func NewRedisStore(redisURL string, logger *logging.Logger) (*RedisStore, error) {
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse redis URL: %w", err)
	}

	client := redis.NewClient(opt)
	ctx := context.Background()

	// Test connection
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to redis: %w", err)
	}

	logger.Info("Redis connected successfully")

	return &RedisStore{
		client: client,
		ctx:    ctx,
		logger: logger,
	}, nil
}

// Close closes the Redis connection
func (r *RedisStore) Close() error {
	return r.client.Close()
}

// StoreRefreshToken stores a refresh token for a user
func (r *RedisStore) StoreRefreshToken(userID, token string, ttl time.Duration) error {
	key := refreshTokenPrefix + userID
	return r.client.Set(r.ctx, key, token, ttl).Err()
}

// ValidateRefreshToken validates a refresh token for a user
func (r *RedisStore) ValidateRefreshToken(userID, token string) (bool, error) {
	key := refreshTokenPrefix + userID
	storedToken, err := r.client.Get(r.ctx, key).Result()
	if err == redis.Nil {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return storedToken == token, nil
}

// RemoveRefreshToken removes a refresh token for a user
func (r *RedisStore) RemoveRefreshToken(userID string) error {
	key := refreshTokenPrefix + userID
	return r.client.Del(r.ctx, key).Err()
}

// BlacklistToken adds a token to the blacklist
func (r *RedisStore) BlacklistToken(token string, ttl time.Duration) error {
	key := blacklistPrefix + token
	return r.client.Set(r.ctx, key, "1", ttl).Err()
}

// IsTokenBlacklisted checks if a token is blacklisted
func (r *RedisStore) IsTokenBlacklisted(token string) (bool, error) {
	key := blacklistPrefix + token
	exists, err := r.client.Exists(r.ctx, key).Result()
	if err != nil {
		return false, err
	}
	return exists > 0, nil
}

// StoreResetToken stores a password reset token
func (r *RedisStore) StoreResetToken(userID, token string, ttl time.Duration) error {
	key := resetTokenPrefix + token
	return r.client.Set(r.ctx, key, userID, ttl).Err()
}

// ValidateResetToken validates a password reset token and returns the user ID
func (r *RedisStore) ValidateResetToken(token string) (string, error) {
	key := resetTokenPrefix + token
	userID, err := r.client.Get(r.ctx, key).Result()
	if err == redis.Nil {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return userID, nil
}

// RemoveResetToken removes a password reset token
func (r *RedisStore) RemoveResetToken(token string) error {
	key := resetTokenPrefix + token
	return r.client.Del(r.ctx, key).Err()
}

// StoreEmailToken stores an email verification token
func (r *RedisStore) StoreEmailToken(userID, token string, ttl time.Duration) error {
	key := emailTokenPrefix + token
	return r.client.Set(r.ctx, key, userID, ttl).Err()
}

// ValidateEmailToken validates an email verification token and returns the user ID
func (r *RedisStore) ValidateEmailToken(token string) (string, error) {
	key := emailTokenPrefix + token
	userID, err := r.client.Get(r.ctx, key).Result()
	if err == redis.Nil {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return userID, nil
}

// RemoveEmailToken removes an email verification token
func (r *RedisStore) RemoveEmailToken(token string) error {
	key := emailTokenPrefix + token
	return r.client.Del(r.ctx, key).Err()
}
