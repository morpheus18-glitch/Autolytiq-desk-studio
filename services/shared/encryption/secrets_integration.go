package encryption

import (
	"context"
	"encoding/hex"
	"fmt"
	"os"
	"sync"

	"autolytiq/shared/secrets"
)

// SecretsKeyManager provides encryption key management using AWS Secrets Manager
type SecretsKeyManager struct {
	provider    secrets.Provider
	keyManager  *KeyManager
	mu          sync.RWMutex
	initialized bool
}

// NewSecretsKeyManager creates a key manager that loads keys from secrets provider
func NewSecretsKeyManager(ctx context.Context) (*SecretsKeyManager, error) {
	provider, err := secrets.AutoProvider(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to create secrets provider: %w", err)
	}

	skm := &SecretsKeyManager{
		provider: provider,
	}

	if err := skm.loadKeys(ctx); err != nil {
		provider.Close()
		return nil, err
	}

	skm.initialized = true
	return skm, nil
}

// NewSecretsKeyManagerWithProvider creates a key manager using a provided secrets provider
func NewSecretsKeyManagerWithProvider(ctx context.Context, provider secrets.Provider) (*SecretsKeyManager, error) {
	skm := &SecretsKeyManager{
		provider: provider,
	}

	if err := skm.loadKeys(ctx); err != nil {
		return nil, err
	}

	skm.initialized = true
	return skm, nil
}

// loadKeys loads encryption keys from the secrets provider
func (skm *SecretsKeyManager) loadKeys(ctx context.Context) error {
	skm.mu.Lock()
	defer skm.mu.Unlock()

	// Try to get key from secrets provider
	keyHex, err := skm.provider.GetPIIEncryptionKey(ctx)
	if err != nil {
		// Fall back to environment variable
		keyHex = os.Getenv("PII_ENCRYPTION_KEY")
		if keyHex == "" {
			return ErrNoKeysConfigured
		}
	}

	// Create the underlying key manager with the loaded key
	keys := make(map[string][]byte)

	primaryKey, err := hex.DecodeString(keyHex)
	if err != nil || len(primaryKey) != KeySize {
		return ErrInvalidKey
	}
	keys["v1"] = primaryKey

	// Check for additional key versions in environment (for rotation support)
	for i := 2; i <= 10; i++ {
		envKey := fmt.Sprintf("PII_ENCRYPTION_KEY_V%d", i)
		if keyHex := os.Getenv(envKey); keyHex != "" {
			key, err := hex.DecodeString(keyHex)
			if err != nil || len(key) != KeySize {
				continue
			}
			keys[fmt.Sprintf("v%d", i)] = key
		}
	}

	// Determine primary version
	primaryVersion := "v1"
	if ver := os.Getenv("PII_ENCRYPTION_PRIMARY_VERSION"); ver != "" {
		if _, ok := keys[ver]; ok {
			primaryVersion = ver
		}
	}

	km, err := NewKeyManagerWithKeys(keys, primaryVersion)
	if err != nil {
		return fmt.Errorf("failed to create key manager: %w", err)
	}

	skm.keyManager = km
	return nil
}

// RefreshKeys reloads keys from the secrets provider
func (skm *SecretsKeyManager) RefreshKeys(ctx context.Context) error {
	return skm.loadKeys(ctx)
}

// GetEncryptor returns an encryptor using the current keys
func (skm *SecretsKeyManager) GetEncryptor() (*Encryptor, error) {
	skm.mu.RLock()
	defer skm.mu.RUnlock()

	if skm.keyManager == nil {
		return nil, ErrNoKeysConfigured
	}

	return NewEncryptor(skm.keyManager), nil
}

// GetKeyManager returns the underlying key manager
func (skm *SecretsKeyManager) GetKeyManager() *KeyManager {
	skm.mu.RLock()
	defer skm.mu.RUnlock()
	return skm.keyManager
}

// Close releases resources
func (skm *SecretsKeyManager) Close() {
	if skm.provider != nil {
		skm.provider.Close()
	}
}

// NewEncryptorFromSecrets creates an encryptor using secrets provider
func NewEncryptorFromSecrets(ctx context.Context) (*Encryptor, error) {
	skm, err := NewSecretsKeyManager(ctx)
	if err != nil {
		return nil, err
	}

	return skm.GetEncryptor()
}

// NewEncryptorWithProvider creates an encryptor using a specific secrets provider
func NewEncryptorWithProvider(ctx context.Context, provider secrets.Provider) (*Encryptor, error) {
	skm, err := NewSecretsKeyManagerWithProvider(ctx, provider)
	if err != nil {
		return nil, err
	}

	return skm.GetEncryptor()
}

// MustNewEncryptor creates an encryptor, panicking on error (for initialization)
func MustNewEncryptor(ctx context.Context) *Encryptor {
	enc, err := NewEncryptorFromSecrets(ctx)
	if err != nil {
		// Try fallback to environment only
		enc, err = NewEncryptorFromEnv()
		if err != nil {
			panic(fmt.Sprintf("failed to create encryptor: %v", err))
		}
	}
	return enc
}
