// Package encryption provides AES-256-GCM encryption for PII fields.
// It includes transparent field-level encryption, key management with rotation support,
// and utilities for secure data handling.
package encryption

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"
	"sync"
	"time"
)

const (
	// KeySize is the required key size for AES-256 (32 bytes)
	KeySize = 32
	// NonceSize is the standard GCM nonce size (12 bytes)
	NonceSize = 12
	// TagSize is the GCM authentication tag size (16 bytes)
	TagSize = 16
	// EncryptedPrefix marks encrypted values in the database
	EncryptedPrefix = "enc:v1:"
	// KeyVersionSeparator separates key version from ciphertext
	KeyVersionSeparator = ":"
)

var (
	// ErrInvalidKey indicates the encryption key is invalid
	ErrInvalidKey = errors.New("invalid encryption key: must be 32 bytes (64 hex characters)")
	// ErrInvalidCiphertext indicates the ciphertext is malformed
	ErrInvalidCiphertext = errors.New("invalid ciphertext format")
	// ErrDecryptionFailed indicates decryption failed (auth tag mismatch)
	ErrDecryptionFailed = errors.New("decryption failed: authentication tag mismatch")
	// ErrKeyNotFound indicates the requested key version was not found
	ErrKeyNotFound = errors.New("encryption key version not found")
	// ErrNoKeysConfigured indicates no encryption keys are configured
	ErrNoKeysConfigured = errors.New("no encryption keys configured")
)

// EncryptedValue represents an encrypted field value with metadata
type EncryptedValue struct {
	KeyVersion string
	Nonce      []byte
	Ciphertext []byte
	Tag        []byte
}

// KeyInfo stores metadata about an encryption key
type KeyInfo struct {
	Version    string
	Key        []byte
	CreatedAt  time.Time
	RotatedAt  *time.Time
	IsActive   bool
	IsPrimary  bool
}

// KeyManager handles encryption key lifecycle and rotation
type KeyManager struct {
	mu          sync.RWMutex
	keys        map[string]*KeyInfo
	primaryKey  string
	rotationLog []RotationEvent
}

// RotationEvent logs key rotation events
type RotationEvent struct {
	OldKeyVersion string
	NewKeyVersion string
	RotatedAt     time.Time
	RotatedBy     string
}

// Encryptor provides AES-256-GCM encryption/decryption operations
type Encryptor struct {
	keyManager *KeyManager
}

// NewKeyManager creates a new key manager from environment configuration
func NewKeyManager() (*KeyManager, error) {
	km := &KeyManager{
		keys:        make(map[string]*KeyInfo),
		rotationLog: make([]RotationEvent, 0),
	}

	// Load primary key from environment
	primaryKeyHex := os.Getenv("PII_ENCRYPTION_KEY")
	if primaryKeyHex == "" {
		return nil, ErrNoKeysConfigured
	}

	primaryKey, err := hex.DecodeString(primaryKeyHex)
	if err != nil || len(primaryKey) != KeySize {
		return nil, ErrInvalidKey
	}

	// Primary key uses version "v1" by default
	km.keys["v1"] = &KeyInfo{
		Version:   "v1",
		Key:       primaryKey,
		CreatedAt: time.Now(),
		IsActive:  true,
		IsPrimary: true,
	}
	km.primaryKey = "v1"

	// Load additional keys for rotation support
	// Format: PII_ENCRYPTION_KEY_V2=<hex>, PII_ENCRYPTION_KEY_V3=<hex>, etc.
	for i := 2; i <= 10; i++ {
		envKey := fmt.Sprintf("PII_ENCRYPTION_KEY_V%d", i)
		keyHex := os.Getenv(envKey)
		if keyHex == "" {
			continue
		}

		key, err := hex.DecodeString(keyHex)
		if err != nil || len(key) != KeySize {
			return nil, fmt.Errorf("invalid key for %s: %w", envKey, ErrInvalidKey)
		}

		version := fmt.Sprintf("v%d", i)
		km.keys[version] = &KeyInfo{
			Version:   version,
			Key:       key,
			CreatedAt: time.Now(),
			IsActive:  true,
			IsPrimary: false,
		}

		// Check if this version should be primary
		if os.Getenv("PII_ENCRYPTION_PRIMARY_VERSION") == version {
			// Mark old primary as non-primary
			if oldPrimary, ok := km.keys[km.primaryKey]; ok {
				oldPrimary.IsPrimary = false
			}
			km.keys[version].IsPrimary = true
			km.primaryKey = version
		}
	}

	return km, nil
}

// NewKeyManagerWithKeys creates a key manager with explicitly provided keys (for testing)
func NewKeyManagerWithKeys(keys map[string][]byte, primaryVersion string) (*KeyManager, error) {
	km := &KeyManager{
		keys:        make(map[string]*KeyInfo),
		rotationLog: make([]RotationEvent, 0),
	}

	for version, key := range keys {
		if len(key) != KeySize {
			return nil, fmt.Errorf("invalid key for version %s: %w", version, ErrInvalidKey)
		}
		km.keys[version] = &KeyInfo{
			Version:   version,
			Key:       key,
			CreatedAt: time.Now(),
			IsActive:  true,
			IsPrimary: version == primaryVersion,
		}
	}

	if _, ok := km.keys[primaryVersion]; !ok {
		return nil, fmt.Errorf("primary version %s not found in keys", primaryVersion)
	}
	km.primaryKey = primaryVersion

	return km, nil
}

// GetKey retrieves a key by version
func (km *KeyManager) GetKey(version string) ([]byte, error) {
	km.mu.RLock()
	defer km.mu.RUnlock()

	info, ok := km.keys[version]
	if !ok {
		return nil, ErrKeyNotFound
	}
	if !info.IsActive {
		return nil, fmt.Errorf("key version %s is not active", version)
	}
	return info.Key, nil
}

// GetPrimaryKey returns the current primary key
func (km *KeyManager) GetPrimaryKey() ([]byte, string, error) {
	km.mu.RLock()
	defer km.mu.RUnlock()

	if km.primaryKey == "" {
		return nil, "", ErrNoKeysConfigured
	}

	info, ok := km.keys[km.primaryKey]
	if !ok {
		return nil, "", ErrKeyNotFound
	}

	return info.Key, km.primaryKey, nil
}

// RotateKey adds a new key version and makes it primary
func (km *KeyManager) RotateKey(newKey []byte, newVersion, rotatedBy string) error {
	km.mu.Lock()
	defer km.mu.Unlock()

	if len(newKey) != KeySize {
		return ErrInvalidKey
	}

	if _, exists := km.keys[newVersion]; exists {
		return fmt.Errorf("key version %s already exists", newVersion)
	}

	// Add new key
	now := time.Now()
	km.keys[newVersion] = &KeyInfo{
		Version:   newVersion,
		Key:       newKey,
		CreatedAt: now,
		IsActive:  true,
		IsPrimary: true,
	}

	// Mark old primary as rotated
	if oldPrimary, ok := km.keys[km.primaryKey]; ok {
		oldPrimary.IsPrimary = false
		oldPrimary.RotatedAt = &now
	}

	// Log rotation event
	km.rotationLog = append(km.rotationLog, RotationEvent{
		OldKeyVersion: km.primaryKey,
		NewKeyVersion: newVersion,
		RotatedAt:     now,
		RotatedBy:     rotatedBy,
	})

	km.primaryKey = newVersion
	return nil
}

// DeactivateKey marks a key version as inactive (cannot be used for decryption)
func (km *KeyManager) DeactivateKey(version string) error {
	km.mu.Lock()
	defer km.mu.Unlock()

	info, ok := km.keys[version]
	if !ok {
		return ErrKeyNotFound
	}

	if info.IsPrimary {
		return errors.New("cannot deactivate primary key")
	}

	info.IsActive = false
	return nil
}

// ListKeyVersions returns all active key versions
func (km *KeyManager) ListKeyVersions() []string {
	km.mu.RLock()
	defer km.mu.RUnlock()

	versions := make([]string, 0, len(km.keys))
	for version, info := range km.keys {
		if info.IsActive {
			versions = append(versions, version)
		}
	}
	return versions
}

// GetRotationLog returns the key rotation history
func (km *KeyManager) GetRotationLog() []RotationEvent {
	km.mu.RLock()
	defer km.mu.RUnlock()

	log := make([]RotationEvent, len(km.rotationLog))
	copy(log, km.rotationLog)
	return log
}

// NewEncryptor creates a new encryptor with the given key manager
func NewEncryptor(km *KeyManager) *Encryptor {
	return &Encryptor{keyManager: km}
}

// NewEncryptorFromEnv creates an encryptor using environment configuration
func NewEncryptorFromEnv() (*Encryptor, error) {
	km, err := NewKeyManager()
	if err != nil {
		return nil, err
	}
	return NewEncryptor(km), nil
}

// Encrypt encrypts plaintext using AES-256-GCM with the primary key
func (e *Encryptor) Encrypt(plaintext string) (string, error) {
	if plaintext == "" {
		return "", nil
	}

	key, version, err := e.keyManager.GetPrimaryKey()
	if err != nil {
		return "", fmt.Errorf("failed to get encryption key: %w", err)
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", fmt.Errorf("failed to create cipher: %w", err)
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("failed to create GCM: %w", err)
	}

	nonce := make([]byte, NonceSize)
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("failed to generate nonce: %w", err)
	}

	ciphertext := aesGCM.Seal(nil, nonce, []byte(plaintext), nil)

	// Format: enc:v1:<version>:<base64(nonce + ciphertext)>
	combined := append(nonce, ciphertext...)
	encoded := base64.StdEncoding.EncodeToString(combined)

	return fmt.Sprintf("%s%s%s%s", EncryptedPrefix, version, KeyVersionSeparator, encoded), nil
}

// Decrypt decrypts ciphertext encrypted with AES-256-GCM
func (e *Encryptor) Decrypt(encrypted string) (string, error) {
	if encrypted == "" {
		return "", nil
	}

	// Check if value is actually encrypted
	if !strings.HasPrefix(encrypted, EncryptedPrefix) {
		// Return as-is if not encrypted (for migration compatibility)
		return encrypted, nil
	}

	// Parse encrypted format: enc:v1:<version>:<base64_data>
	parts := strings.SplitN(encrypted, KeyVersionSeparator, 4)
	if len(parts) != 4 || parts[0]+KeyVersionSeparator+parts[1]+KeyVersionSeparator != EncryptedPrefix {
		return "", ErrInvalidCiphertext
	}

	version := parts[2]
	encodedData := parts[3]

	key, err := e.keyManager.GetKey(version)
	if err != nil {
		return "", fmt.Errorf("failed to get decryption key for version %s: %w", version, err)
	}

	combined, err := base64.StdEncoding.DecodeString(encodedData)
	if err != nil {
		return "", fmt.Errorf("failed to decode ciphertext: %w", err)
	}

	if len(combined) < NonceSize+TagSize {
		return "", ErrInvalidCiphertext
	}

	nonce := combined[:NonceSize]
	ciphertext := combined[NonceSize:]

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", fmt.Errorf("failed to create cipher: %w", err)
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("failed to create GCM: %w", err)
	}

	plaintext, err := aesGCM.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", ErrDecryptionFailed
	}

	return string(plaintext), nil
}

// IsEncrypted checks if a value is encrypted
func (e *Encryptor) IsEncrypted(value string) bool {
	return strings.HasPrefix(value, EncryptedPrefix)
}

// ReEncrypt decrypts with any valid key and re-encrypts with the primary key
func (e *Encryptor) ReEncrypt(encrypted string) (string, error) {
	if encrypted == "" {
		return "", nil
	}

	// If not encrypted, just encrypt it
	if !e.IsEncrypted(encrypted) {
		return e.Encrypt(encrypted)
	}

	// Check if already encrypted with primary key
	_, primaryVersion, err := e.keyManager.GetPrimaryKey()
	if err != nil {
		return "", err
	}

	parts := strings.SplitN(encrypted, KeyVersionSeparator, 4)
	if len(parts) == 4 && parts[2] == primaryVersion {
		// Already using primary key
		return encrypted, nil
	}

	// Decrypt and re-encrypt
	plaintext, err := e.Decrypt(encrypted)
	if err != nil {
		return "", fmt.Errorf("failed to decrypt for re-encryption: %w", err)
	}

	return e.Encrypt(plaintext)
}

// GetKeyVersion extracts the key version from an encrypted value
func (e *Encryptor) GetKeyVersion(encrypted string) (string, error) {
	if !e.IsEncrypted(encrypted) {
		return "", errors.New("value is not encrypted")
	}

	parts := strings.SplitN(encrypted, KeyVersionSeparator, 4)
	if len(parts) != 4 {
		return "", ErrInvalidCiphertext
	}

	return parts[2], nil
}

// GenerateKey generates a new random 256-bit key
func GenerateKey() ([]byte, error) {
	key := make([]byte, KeySize)
	if _, err := io.ReadFull(rand.Reader, key); err != nil {
		return nil, fmt.Errorf("failed to generate random key: %w", err)
	}
	return key, nil
}

// GenerateKeyHex generates a new random 256-bit key as a hex string
func GenerateKeyHex() (string, error) {
	key, err := GenerateKey()
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(key), nil
}

// ValidateKeyHex validates that a hex string represents a valid AES-256 key
func ValidateKeyHex(keyHex string) error {
	key, err := hex.DecodeString(keyHex)
	if err != nil {
		return fmt.Errorf("invalid hex encoding: %w", err)
	}
	if len(key) != KeySize {
		return ErrInvalidKey
	}
	return nil
}
