// Package encryption provides Post-Quantum Cryptography (PQC) encryption
// using NIST-approved ML-KEM (Kyber) for key encapsulation and ChaCha20-Poly1305 for AEAD.
//
// This implements hybrid encryption that combines:
// - ML-KEM-1024 (NIST FIPS 203) for quantum-resistant key exchange
// - ChaCha20-Poly1305 for authenticated encryption
// - HKDF-SHA3 for key derivation
package encryption

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"

	"github.com/cloudflare/circl/kem/kyber/kyber1024"
	"golang.org/x/crypto/chacha20poly1305"
	"golang.org/x/crypto/hkdf"
	"golang.org/x/crypto/sha3"
)

const (
	// PQCPrefix marks PQC-encrypted values
	PQCPrefix = "pqc:v1:"
	// PQCPublicKeyEnv is the environment variable for the PQC public key
	PQCPublicKeyEnv = "PQC_PUBLIC_KEY"
	// PQCSecretKeyEnv is the environment variable for the PQC secret key
	PQCSecretKeyEnv = "PQC_SECRET_KEY"
)

var (
	// ErrInvalidPQCCiphertext indicates the PQC ciphertext is malformed
	ErrInvalidPQCCiphertext = errors.New("invalid PQC ciphertext format")
	// ErrPQCDecryptionFailed indicates PQC decryption failed
	ErrPQCDecryptionFailed = errors.New("PQC decryption failed")
	// ErrPQCKeysNotConfigured indicates PQC keys are not configured
	ErrPQCKeysNotConfigured = errors.New("PQC keys not configured")
)

// PQCEncryptor provides post-quantum encryption using ML-KEM (Kyber-1024)
type PQCEncryptor struct {
	publicKey *kyber1024.PublicKey
	secretKey *kyber1024.PrivateKey
}

// NewPQCEncryptor creates a new PQC encryptor
// If keys are not provided, generates a new keypair (for development only)
func NewPQCEncryptor(pubKeyBase64, secKeyBase64 string) (*PQCEncryptor, error) {
	var publicKey *kyber1024.PublicKey
	var secretKey *kyber1024.PrivateKey

	if pubKeyBase64 != "" && secKeyBase64 != "" {
		// Decode provided keys
		pubBytes, err := base64.StdEncoding.DecodeString(pubKeyBase64)
		if err != nil {
			return nil, fmt.Errorf("failed to decode public key: %w", err)
		}

		secBytes, err := base64.StdEncoding.DecodeString(secKeyBase64)
		if err != nil {
			return nil, fmt.Errorf("failed to decode secret key: %w", err)
		}

		pub := &kyber1024.PublicKey{}
		sec := &kyber1024.PrivateKey{}

		if err := pub.UnmarshalBinary(pubBytes); err != nil {
			return nil, fmt.Errorf("failed to unmarshal public key: %w", err)
		}

		if err := sec.UnmarshalBinary(secBytes); err != nil {
			return nil, fmt.Errorf("failed to unmarshal secret key: %w", err)
		}

		publicKey = pub
		secretKey = sec
	} else {
		// Generate new keypair (development only - in production, keys must be provided)
		pub, sec, err := kyber1024.GenerateKeyPair(rand.Reader)
		if err != nil {
			return nil, fmt.Errorf("failed to generate PQC keypair: %w", err)
		}
		publicKey = pub.(*kyber1024.PublicKey)
		secretKey = sec.(*kyber1024.PrivateKey)
	}

	return &PQCEncryptor{
		publicKey: publicKey,
		secretKey: secretKey,
	}, nil
}

// EncryptPQC encrypts plaintext using ML-KEM + ChaCha20-Poly1305
// Returns: pqc:v1:<base64(encapsulated_key || nonce || ciphertext)>
func (e *PQCEncryptor) EncryptPQC(plaintext string) (string, error) {
	if plaintext == "" {
		return "", nil
	}

	// 1. Encapsulate: Generate shared secret and ciphertext
	ct, ss, err := kyber1024.EncapsulateTo(nil, nil, e.publicKey, rand.Reader)
	if err != nil {
		return nil, fmt.Errorf("failed to encapsulate: %w", err)
	}

	// 2. Derive encryption key from shared secret using HKDF-SHA3
	key := make([]byte, chacha20poly1305.KeySize)
	kdf := hkdf.New(sha3.New256, ss, nil, []byte("autolytiq-mfa-encryption"))
	if _, err := kdf.Read(key); err != nil {
		return nil, fmt.Errorf("failed to derive key: %w", err)
	}

	// 3. Encrypt with ChaCha20-Poly1305
	aead, err := chacha20poly1305.NewX(key)
	if err != nil {
		return nil, fmt.Errorf("failed to create AEAD: %w", err)
	}

	nonce := make([]byte, aead.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return nil, fmt.Errorf("failed to generate nonce: %w", err)
	}

	ciphertext := aead.Seal(nil, nonce, []byte(plaintext), nil)

	// 4. Combine: encapsulated_key || nonce || ciphertext
	combined := make([]byte, 0, len(ct)+len(nonce)+len(ciphertext))
	combined = append(combined, ct...)
	combined = append(combined, nonce...)
	combined = append(combined, ciphertext...)

	// 5. Encode to base64
	encoded := base64.StdEncoding.EncodeToString(combined)

	return PQCPrefix + encoded, nil
}

// DecryptPQC decrypts ciphertext encrypted with EncryptPQC
func (e *PQCEncryptor) DecryptPQC(encrypted string) (string, error) {
	if encrypted == "" {
		return "", nil
	}

	// Check if value is PQC encrypted
	if !strings.HasPrefix(encrypted, PQCPrefix) {
		return "", fmt.Errorf("not a PQC encrypted value")
	}

	// Remove prefix
	encoded := strings.TrimPrefix(encrypted, PQCPrefix)

	// Decode base64
	combined, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return "", fmt.Errorf("failed to decode ciphertext: %w", err)
	}

	// Parse: encapsulated_key (1568 bytes) || nonce (24 bytes) || ciphertext
	ctLen := kyber1024.CiphertextSize
	nonceLen := chacha20poly1305.NonceSizeX

	if len(combined) < ctLen+nonceLen {
		return "", ErrInvalidPQCCiphertext
	}

	encapsulatedKey := combined[:ctLen]
	nonce := combined[ctLen : ctLen+nonceLen]
	ciphertext := combined[ctLen+nonceLen:]

	// 1. Decapsulate: Recover shared secret
	ss, err := kyber1024.DecapsulateTo(nil, e.secretKey, encapsulatedKey)
	if err != nil {
		return "", fmt.Errorf("failed to decapsulate: %w", err)
	}

	// 2. Derive encryption key from shared secret
	key := make([]byte, chacha20poly1305.KeySize)
	kdf := hkdf.New(sha3.New256, ss, nil, []byte("autolytiq-mfa-encryption"))
	if _, err := kdf.Read(key); err != nil {
		return "", fmt.Errorf("failed to derive key: %w", err)
	}

	// 3. Decrypt with ChaCha20-Poly1305
	aead, err := chacha20poly1305.NewX(key)
	if err != nil {
		return "", fmt.Errorf("failed to create AEAD: %w", err)
	}

	plaintext, err := aead.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", ErrPQCDecryptionFailed
	}

	return string(plaintext), nil
}

// IsPQCEncrypted checks if a value is PQC encrypted
func (e *PQCEncryptor) IsPQCEncrypted(value string) bool {
	return strings.HasPrefix(value, PQCPrefix)
}

// GetPublicKeyBase64 returns the public key as base64 for distribution
func (e *PQCEncryptor) GetPublicKeyBase64() (string, error) {
	pubBytes, err := e.publicKey.MarshalBinary()
	if err != nil {
		return "", fmt.Errorf("failed to marshal public key: %w", err)
	}
	return base64.StdEncoding.EncodeToString(pubBytes), nil
}

// GetSecretKeyBase64 returns the secret key as base64 (for backup only)
func (e *PQCEncryptor) GetSecretKeyBase64() (string, error) {
	secBytes, err := e.secretKey.MarshalBinary()
	if err != nil {
		return "", fmt.Errorf("failed to marshal secret key: %w", err)
	}
	return base64.StdEncoding.EncodeToString(secBytes), nil
}

// GeneratePQCKeypair generates a new ML-KEM-1024 keypair
// Returns (publicKey, secretKey) as base64 strings
func GeneratePQCKeypair() (string, string, error) {
	pub, sec, err := kyber1024.GenerateKeyPair(rand.Reader)
	if err != nil {
		return "", "", fmt.Errorf("failed to generate keypair: %w", err)
	}

	publicKey := pub.(*kyber1024.PublicKey)
	secretKey := sec.(*kyber1024.PrivateKey)

	pubBytes, err := publicKey.MarshalBinary()
	if err != nil {
		return "", "", fmt.Errorf("failed to marshal public key: %w", err)
	}

	secBytes, err := secretKey.MarshalBinary()
	if err != nil {
		return "", "", fmt.Errorf("failed to marshal secret key: %w", err)
	}

	pubBase64 := base64.StdEncoding.EncodeToString(pubBytes)
	secBase64 := base64.StdEncoding.EncodeToString(secBytes)

	return pubBase64, secBase64, nil
}
