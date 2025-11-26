package encryption

import (
	"encoding/hex"
	"os"
	"strings"
	"testing"
)

func TestGenerateKey(t *testing.T) {
	key, err := GenerateKey()
	if err != nil {
		t.Fatalf("GenerateKey failed: %v", err)
	}
	if len(key) != KeySize {
		t.Errorf("expected key length %d, got %d", KeySize, len(key))
	}
}

func TestGenerateKeyHex(t *testing.T) {
	keyHex, err := GenerateKeyHex()
	if err != nil {
		t.Fatalf("GenerateKeyHex failed: %v", err)
	}
	if len(keyHex) != KeySize*2 {
		t.Errorf("expected hex length %d, got %d", KeySize*2, len(keyHex))
	}

	// Verify it's valid hex
	if err := ValidateKeyHex(keyHex); err != nil {
		t.Errorf("generated key failed validation: %v", err)
	}
}

func TestValidateKeyHex(t *testing.T) {
	tests := []struct {
		name    string
		keyHex  string
		wantErr bool
	}{
		{
			name:    "valid key",
			keyHex:  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
			wantErr: false,
		},
		{
			name:    "too short",
			keyHex:  "0123456789abcdef",
			wantErr: true,
		},
		{
			name:    "too long",
			keyHex:  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef00",
			wantErr: true,
		},
		{
			name:    "invalid hex",
			keyHex:  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdeg",
			wantErr: true,
		},
		{
			name:    "empty",
			keyHex:  "",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateKeyHex(tt.keyHex)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateKeyHex() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func setupTestEncryptor(t *testing.T) (*Encryptor, func()) {
	t.Helper()

	// Generate a test key
	testKey, _ := GenerateKeyHex()
	os.Setenv("PII_ENCRYPTION_KEY", testKey)

	km, err := NewKeyManager()
	if err != nil {
		t.Fatalf("failed to create key manager: %v", err)
	}

	cleanup := func() {
		os.Unsetenv("PII_ENCRYPTION_KEY")
	}

	return NewEncryptor(km), cleanup
}

func TestEncryptDecrypt(t *testing.T) {
	enc, cleanup := setupTestEncryptor(t)
	defer cleanup()

	tests := []struct {
		name      string
		plaintext string
	}{
		{"simple string", "Hello, World!"},
		{"SSN last 4", "1234"},
		{"driver license", "DL12345678"},
		{"credit score", "750"},
		{"monthly income", "5000.00"},
		{"empty string", ""},
		{"unicode", "Test"},
		{"special chars", "!@#$%^&*()_+-=[]{}|;':\",./<>?"},
		{"long string", strings.Repeat("a", 10000)},
		{"newlines", "line1\nline2\nline3"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			encrypted, err := enc.Encrypt(tt.plaintext)
			if err != nil {
				t.Fatalf("Encrypt failed: %v", err)
			}

			// Empty strings should remain empty
			if tt.plaintext == "" {
				if encrypted != "" {
					t.Errorf("empty plaintext should produce empty ciphertext")
				}
				return
			}

			// Verify encrypted format
			if !strings.HasPrefix(encrypted, EncryptedPrefix) {
				t.Errorf("encrypted value should have prefix %s", EncryptedPrefix)
			}

			// Encrypted should be different from plaintext
			if encrypted == tt.plaintext {
				t.Error("encrypted value should differ from plaintext")
			}

			// Decrypt
			decrypted, err := enc.Decrypt(encrypted)
			if err != nil {
				t.Fatalf("Decrypt failed: %v", err)
			}

			if decrypted != tt.plaintext {
				t.Errorf("Decrypt() = %v, want %v", decrypted, tt.plaintext)
			}
		})
	}
}

func TestEncryptDeterminism(t *testing.T) {
	enc, cleanup := setupTestEncryptor(t)
	defer cleanup()

	plaintext := "test_value"

	// Encrypt the same value twice
	encrypted1, _ := enc.Encrypt(plaintext)
	encrypted2, _ := enc.Encrypt(plaintext)

	// Should produce different ciphertexts (due to random nonce)
	if encrypted1 == encrypted2 {
		t.Error("encryption should be non-deterministic (different nonces)")
	}

	// But both should decrypt to the same value
	decrypted1, _ := enc.Decrypt(encrypted1)
	decrypted2, _ := enc.Decrypt(encrypted2)

	if decrypted1 != decrypted2 || decrypted1 != plaintext {
		t.Error("both ciphertexts should decrypt to the same plaintext")
	}
}

func TestDecryptNonEncrypted(t *testing.T) {
	enc, cleanup := setupTestEncryptor(t)
	defer cleanup()

	// Non-encrypted values should be returned as-is (for migration compatibility)
	plaintext := "not_encrypted_value"
	result, err := enc.Decrypt(plaintext)
	if err != nil {
		t.Fatalf("Decrypt of non-encrypted value should not error: %v", err)
	}
	if result != plaintext {
		t.Errorf("Decrypt() = %v, want %v", result, plaintext)
	}
}

func TestDecryptInvalidCiphertext(t *testing.T) {
	enc, cleanup := setupTestEncryptor(t)
	defer cleanup()

	tests := []struct {
		name    string
		input   string
		wantErr bool
	}{
		// "enc:v2:data" doesn't match the prefix "enc:v1:" so it's treated as plaintext
		// Only properly formatted encrypted values will be decrypted
		{"malformed encrypted", "enc:v1:v1:not_base64!!!", true},
		{"too short ciphertext", "enc:v1:v1:YWJj", true}, // "abc" base64 - too short for nonce+tag
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := enc.Decrypt(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("Decrypt() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestDecryptPlaintextPassthrough(t *testing.T) {
	enc, cleanup := setupTestEncryptor(t)
	defer cleanup()

	// Non-encrypted values should be returned as-is (for migration compatibility)
	tests := []struct {
		name  string
		input string
	}{
		{"plain text", "some_plain_value"},
		{"looks like prefix but not", "enc:v2:data"},
		{"partial prefix", "enc:something"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := enc.Decrypt(tt.input)
			if err != nil {
				t.Errorf("Decrypt() should not error for plaintext: %v", err)
			}
			if result != tt.input {
				t.Errorf("Decrypt() = %v, want %v", result, tt.input)
			}
		})
	}
}

func TestIsEncrypted(t *testing.T) {
	enc, cleanup := setupTestEncryptor(t)
	defer cleanup()

	encrypted, _ := enc.Encrypt("test")

	tests := []struct {
		name  string
		value string
		want  bool
	}{
		{"encrypted value", encrypted, true},
		{"plain value", "plain_text", false},
		{"partial prefix", "enc:", false},
		{"wrong prefix", "encrypted:v1:data", false},
		{"empty", "", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := enc.IsEncrypted(tt.value); got != tt.want {
				t.Errorf("IsEncrypted() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestKeyRotation(t *testing.T) {
	// Setup initial key
	key1, _ := GenerateKey()
	key2, _ := GenerateKey()

	keys := map[string][]byte{
		"v1": key1,
	}

	km, err := NewKeyManagerWithKeys(keys, "v1")
	if err != nil {
		t.Fatalf("failed to create key manager: %v", err)
	}

	enc := NewEncryptor(km)

	// Encrypt with v1
	encrypted, err := enc.Encrypt("secret_data")
	if err != nil {
		t.Fatalf("Encrypt failed: %v", err)
	}

	// Verify it uses v1
	version, _ := enc.GetKeyVersion(encrypted)
	if version != "v1" {
		t.Errorf("expected version v1, got %s", version)
	}

	// Rotate to v2
	if err := km.RotateKey(key2, "v2", "test"); err != nil {
		t.Fatalf("RotateKey failed: %v", err)
	}

	// New encryptions should use v2
	encrypted2, _ := enc.Encrypt("new_data")
	version2, _ := enc.GetKeyVersion(encrypted2)
	if version2 != "v2" {
		t.Errorf("expected version v2 after rotation, got %s", version2)
	}

	// Old data encrypted with v1 should still decrypt
	decrypted, err := enc.Decrypt(encrypted)
	if err != nil {
		t.Fatalf("failed to decrypt v1 data after rotation: %v", err)
	}
	if decrypted != "secret_data" {
		t.Errorf("expected 'secret_data', got %s", decrypted)
	}

	// Verify rotation log
	log := km.GetRotationLog()
	if len(log) != 1 {
		t.Fatalf("expected 1 rotation event, got %d", len(log))
	}
	if log[0].OldKeyVersion != "v1" || log[0].NewKeyVersion != "v2" {
		t.Error("rotation log incorrect")
	}
}

func TestReEncrypt(t *testing.T) {
	key1, _ := GenerateKey()
	key2, _ := GenerateKey()

	keys := map[string][]byte{
		"v1": key1,
	}

	km, _ := NewKeyManagerWithKeys(keys, "v1")
	enc := NewEncryptor(km)

	// Encrypt with v1
	encrypted, _ := enc.Encrypt("secret")

	// Rotate to v2
	km.RotateKey(key2, "v2", "test")

	// Re-encrypt should upgrade to v2
	reEncrypted, err := enc.ReEncrypt(encrypted)
	if err != nil {
		t.Fatalf("ReEncrypt failed: %v", err)
	}

	version, _ := enc.GetKeyVersion(reEncrypted)
	if version != "v2" {
		t.Errorf("expected version v2 after re-encryption, got %s", version)
	}

	// Should still decrypt correctly
	decrypted, _ := enc.Decrypt(reEncrypted)
	if decrypted != "secret" {
		t.Errorf("expected 'secret', got %s", decrypted)
	}

	// Re-encrypting a v2 value should not change it
	reEncrypted2, _ := enc.ReEncrypt(reEncrypted)
	if reEncrypted2 != reEncrypted {
		t.Error("re-encrypting with same key version should return same value")
	}
}

func TestReEncryptPlaintext(t *testing.T) {
	enc, cleanup := setupTestEncryptor(t)
	defer cleanup()

	// Re-encrypting plaintext should encrypt it
	reEncrypted, err := enc.ReEncrypt("plain_value")
	if err != nil {
		t.Fatalf("ReEncrypt of plaintext failed: %v", err)
	}

	if !enc.IsEncrypted(reEncrypted) {
		t.Error("re-encrypted plaintext should be encrypted")
	}

	decrypted, _ := enc.Decrypt(reEncrypted)
	if decrypted != "plain_value" {
		t.Errorf("expected 'plain_value', got %s", decrypted)
	}
}

func TestDeactivateKey(t *testing.T) {
	key1, _ := GenerateKey()
	key2, _ := GenerateKey()

	keys := map[string][]byte{
		"v1": key1,
		"v2": key2,
	}

	km, _ := NewKeyManagerWithKeys(keys, "v2")
	enc := NewEncryptor(km)

	// Encrypt with v1 (before it was primary)
	// First, manually set up a v1 encrypted value
	km2, _ := NewKeyManagerWithKeys(map[string][]byte{"v1": key1}, "v1")
	enc2 := NewEncryptor(km2)
	encryptedV1, _ := enc2.Encrypt("old_secret")

	// Should decrypt with km (has both keys)
	decrypted, err := enc.Decrypt(encryptedV1)
	if err != nil {
		t.Fatalf("failed to decrypt v1 with multi-key manager: %v", err)
	}
	if decrypted != "old_secret" {
		t.Error("incorrect decryption")
	}

	// Cannot deactivate primary key
	if err := km.DeactivateKey("v2"); err == nil {
		t.Error("should not be able to deactivate primary key")
	}

	// Can deactivate non-primary key
	if err := km.DeactivateKey("v1"); err != nil {
		t.Fatalf("DeactivateKey failed: %v", err)
	}

	// Now decryption with v1 should fail
	_, err = enc.Decrypt(encryptedV1)
	if err == nil {
		t.Error("should fail to decrypt with deactivated key")
	}
}

func TestListKeyVersions(t *testing.T) {
	key1, _ := GenerateKey()
	key2, _ := GenerateKey()

	keys := map[string][]byte{
		"v1": key1,
		"v2": key2,
	}

	km, _ := NewKeyManagerWithKeys(keys, "v1")

	versions := km.ListKeyVersions()
	if len(versions) != 2 {
		t.Errorf("expected 2 versions, got %d", len(versions))
	}

	// Deactivate v2
	km.DeactivateKey("v2")
	versions = km.ListKeyVersions()
	if len(versions) != 1 {
		t.Errorf("expected 1 version after deactivation, got %d", len(versions))
	}
}

func TestNewKeyManagerFromEnv(t *testing.T) {
	// Test with no key
	os.Unsetenv("PII_ENCRYPTION_KEY")
	_, err := NewKeyManager()
	if err != ErrNoKeysConfigured {
		t.Errorf("expected ErrNoKeysConfigured, got %v", err)
	}

	// Test with invalid key
	os.Setenv("PII_ENCRYPTION_KEY", "invalid")
	_, err = NewKeyManager()
	if err != ErrInvalidKey {
		t.Errorf("expected ErrInvalidKey, got %v", err)
	}

	// Test with valid key
	validKey, _ := GenerateKeyHex()
	os.Setenv("PII_ENCRYPTION_KEY", validKey)
	km, err := NewKeyManager()
	if err != nil {
		t.Fatalf("NewKeyManager failed with valid key: %v", err)
	}

	versions := km.ListKeyVersions()
	if len(versions) != 1 || versions[0] != "v1" {
		t.Error("expected single v1 key")
	}

	// Test with multiple keys
	key2, _ := GenerateKeyHex()
	os.Setenv("PII_ENCRYPTION_KEY_V2", key2)
	km, err = NewKeyManager()
	if err != nil {
		t.Fatalf("NewKeyManager failed with multiple keys: %v", err)
	}

	versions = km.ListKeyVersions()
	if len(versions) != 2 {
		t.Errorf("expected 2 versions, got %d", len(versions))
	}

	// Test primary version override
	os.Setenv("PII_ENCRYPTION_PRIMARY_VERSION", "v2")
	km, err = NewKeyManager()
	if err != nil {
		t.Fatalf("NewKeyManager failed: %v", err)
	}

	_, primaryVersion, _ := km.GetPrimaryKey()
	if primaryVersion != "v2" {
		t.Errorf("expected primary version v2, got %s", primaryVersion)
	}

	// Cleanup
	os.Unsetenv("PII_ENCRYPTION_KEY")
	os.Unsetenv("PII_ENCRYPTION_KEY_V2")
	os.Unsetenv("PII_ENCRYPTION_PRIMARY_VERSION")
}

func TestConcurrentEncryption(t *testing.T) {
	enc, cleanup := setupTestEncryptor(t)
	defer cleanup()

	const goroutines = 100
	const iterations = 100

	done := make(chan bool)
	errors := make(chan error, goroutines*iterations)

	for i := 0; i < goroutines; i++ {
		go func(id int) {
			for j := 0; j < iterations; j++ {
				plaintext := "test_value_" + hex.EncodeToString([]byte{byte(id), byte(j)})

				encrypted, err := enc.Encrypt(plaintext)
				if err != nil {
					errors <- err
					continue
				}

				decrypted, err := enc.Decrypt(encrypted)
				if err != nil {
					errors <- err
					continue
				}

				if decrypted != plaintext {
					errors <- err
				}
			}
			done <- true
		}(i)
	}

	// Wait for all goroutines
	for i := 0; i < goroutines; i++ {
		<-done
	}
	close(errors)

	// Check for errors
	var errCount int
	for err := range errors {
		t.Errorf("concurrent error: %v", err)
		errCount++
	}

	if errCount > 0 {
		t.Fatalf("had %d errors during concurrent encryption", errCount)
	}
}

func BenchmarkEncrypt(b *testing.B) {
	key, _ := GenerateKeyHex()
	os.Setenv("PII_ENCRYPTION_KEY", key)
	defer os.Unsetenv("PII_ENCRYPTION_KEY")

	enc, _ := NewEncryptorFromEnv()
	plaintext := "1234567890"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = enc.Encrypt(plaintext)
	}
}

func BenchmarkDecrypt(b *testing.B) {
	key, _ := GenerateKeyHex()
	os.Setenv("PII_ENCRYPTION_KEY", key)
	defer os.Unsetenv("PII_ENCRYPTION_KEY")

	enc, _ := NewEncryptorFromEnv()
	encrypted, _ := enc.Encrypt("1234567890")

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = enc.Decrypt(encrypted)
	}
}
