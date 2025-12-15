//! Hybrid Encryption: Kyber-1024 + X25519 + ChaCha20-Poly1305
//!
//! ## Defense-in-Depth Design
//! This module combines classical (X25519) and post-quantum (Kyber) cryptography.
//! An attacker must break BOTH algorithms to compromise the encryption.
//!
//! ## Encryption Flow
//! 1. Generate ephemeral X25519 keypair
//! 2. Perform X25519 key exchange with recipient's X25519 public key
//! 3. Encapsulate shared secret using recipient's Kyber public key
//! 4. Combine both shared secrets using HKDF-SHA3-256
//! 5. Encrypt plaintext with ChaCha20-Poly1305 using derived key
//!
//! ## Key Format
//! - Public key: Kyber public key || X25519 public key (1568 + 32 = 1600 bytes)
//! - Secret key: Kyber secret key || X25519 secret key (3168 + 32 = 3200 bytes)

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use pqcrypto_kyber::kyber1024;
use pqcrypto_traits::kem::{Ciphertext, PublicKey as KemPublicKey, SecretKey as KemSecretKey, SharedSecret};
use x25519_dalek::{EphemeralSecret, PublicKey as X25519PublicKey, StaticSecret};
use rand::rngs::OsRng;
use zeroize::Zeroize;

use crate::aead;
use crate::kdf;
use crate::types::{key_sizes, HybridKeypair, ALGORITHM_HYBRID, ENCRYPTION_PREFIX};

/// Combined key sizes
const HYBRID_PUBLIC_KEY_SIZE: usize = key_sizes::KYBER_PUBLIC_KEY + key_sizes::X25519_PUBLIC_KEY;
const HYBRID_SECRET_KEY_SIZE: usize = key_sizes::KYBER_SECRET_KEY + key_sizes::X25519_SECRET_KEY;

/// Generate a hybrid keypair (Kyber-1024 + X25519)
pub fn generate_keypair() -> Result<HybridKeypair, String> {
    // Generate Kyber keypair
    let (kyber_pk, kyber_sk) = kyber1024::keypair();

    // Generate X25519 keypair
    let x25519_sk = StaticSecret::random_from_rng(OsRng);
    let x25519_pk = X25519PublicKey::from(&x25519_sk);

    // Combine public keys: Kyber || X25519
    let mut public_key = Vec::with_capacity(HYBRID_PUBLIC_KEY_SIZE);
    public_key.extend_from_slice(kyber_pk.as_bytes());
    public_key.extend_from_slice(x25519_pk.as_bytes());

    // Combine secret keys: Kyber || X25519
    let mut secret_key = Vec::with_capacity(HYBRID_SECRET_KEY_SIZE);
    secret_key.extend_from_slice(kyber_sk.as_bytes());
    secret_key.extend_from_slice(x25519_sk.as_bytes());

    Ok(HybridKeypair {
        public_key: BASE64.encode(&public_key),
        secret_key: BASE64.encode(&secret_key),
        algorithm: ALGORITHM_HYBRID.to_string(),
    })
}

/// Encrypt data using hybrid post-quantum encryption
///
/// # Format
/// Output: `pqc:v1:kyber1024-x25519-chacha20poly1305:<base64_payload>`
///
/// Where payload is: kyber_ciphertext || x25519_ephemeral_pk || nonce || ciphertext
pub fn encrypt(plaintext: &str, public_key_base64: &str) -> Result<String, String> {
    // Decode and validate public key
    let public_key = BASE64
        .decode(public_key_base64)
        .map_err(|e| format!("Invalid base64 public key: {}", e))?;

    if public_key.len() != HYBRID_PUBLIC_KEY_SIZE {
        return Err(format!(
            "Invalid public key size: expected {} bytes, got {}",
            HYBRID_PUBLIC_KEY_SIZE,
            public_key.len()
        ));
    }

    // Split into Kyber and X25519 components
    let kyber_pk_bytes = &public_key[..key_sizes::KYBER_PUBLIC_KEY];
    let x25519_pk_bytes = &public_key[key_sizes::KYBER_PUBLIC_KEY..];

    // Parse Kyber public key
    let kyber_pk = kyber1024::PublicKey::from_bytes(kyber_pk_bytes)
        .map_err(|_| "Failed to parse Kyber public key")?;

    // Parse X25519 public key
    let x25519_pk_array: [u8; 32] = x25519_pk_bytes
        .try_into()
        .map_err(|_| "Invalid X25519 public key")?;
    let x25519_pk = X25519PublicKey::from(x25519_pk_array);

    // Encapsulate with Kyber
    let (kyber_ss, kyber_ct) = kyber1024::encapsulate(&kyber_pk);

    // Generate ephemeral X25519 keypair and compute shared secret
    let ephemeral_sk = EphemeralSecret::random_from_rng(OsRng);
    let ephemeral_pk = X25519PublicKey::from(&ephemeral_sk);
    let x25519_ss = ephemeral_sk.diffie_hellman(&x25519_pk);

    // Combine shared secrets using HKDF
    let encryption_key = kdf::combine_secrets(
        &[kyber_ss.as_bytes(), x25519_ss.as_bytes()],
        kdf::domains::ENCRYPTION_KEY,
    );

    // Encrypt with ChaCha20-Poly1305
    let (nonce, ciphertext) = aead::encrypt_simple(&encryption_key, plaintext.as_bytes())
        .map_err(|e| format!("Encryption failed: {}", e))?;

    // Build payload: kyber_ct || ephemeral_pk || nonce || ciphertext
    let mut payload = Vec::new();
    payload.extend_from_slice(kyber_ct.as_bytes());  // 1568 bytes
    payload.extend_from_slice(ephemeral_pk.as_bytes());  // 32 bytes
    payload.extend_from_slice(&nonce);  // 12 bytes
    payload.extend_from_slice(&ciphertext);  // plaintext.len() + 16 bytes

    // Format: pqc:v1:algorithm:base64_payload
    Ok(format!("{}{}{}", ENCRYPTION_PREFIX, ALGORITHM_HYBRID, ":") + &BASE64.encode(&payload))
}

/// Decrypt data using hybrid post-quantum encryption
pub fn decrypt(ciphertext: &str, secret_key_base64: &str) -> Result<String, String> {
    // Parse and validate format
    let expected_prefix = format!("{}{}:", ENCRYPTION_PREFIX, ALGORITHM_HYBRID);
    if !ciphertext.starts_with(&expected_prefix) {
        return Err(format!(
            "Invalid ciphertext format: expected prefix '{}'",
            expected_prefix
        ));
    }

    let payload_base64 = &ciphertext[expected_prefix.len()..];
    let payload = BASE64
        .decode(payload_base64)
        .map_err(|e| format!("Invalid base64 payload: {}", e))?;

    // Validate minimum payload size
    let min_payload_size = key_sizes::KYBER_CIPHERTEXT  // 1568
        + key_sizes::X25519_PUBLIC_KEY  // 32
        + key_sizes::CHACHA_NONCE  // 12
        + key_sizes::CHACHA_TAG;  // 16 (minimum ciphertext)

    if payload.len() < min_payload_size {
        return Err(format!(
            "Invalid payload size: expected at least {} bytes, got {}",
            min_payload_size,
            payload.len()
        ));
    }

    // Decode secret key
    let mut secret_key = BASE64
        .decode(secret_key_base64)
        .map_err(|e| format!("Invalid base64 secret key: {}", e))?;

    if secret_key.len() != HYBRID_SECRET_KEY_SIZE {
        secret_key.zeroize();
        return Err(format!(
            "Invalid secret key size: expected {} bytes, got {}",
            HYBRID_SECRET_KEY_SIZE,
            secret_key.len()
        ));
    }

    // Split secret key into components
    let kyber_sk_bytes = &secret_key[..key_sizes::KYBER_SECRET_KEY];
    let x25519_sk_bytes = &secret_key[key_sizes::KYBER_SECRET_KEY..];

    // Parse keys
    let kyber_sk = kyber1024::SecretKey::from_bytes(kyber_sk_bytes)
        .map_err(|_| "Failed to parse Kyber secret key")?;

    let x25519_sk_array: [u8; 32] = x25519_sk_bytes
        .try_into()
        .map_err(|_| "Invalid X25519 secret key")?;
    let x25519_sk = StaticSecret::from(x25519_sk_array);

    // Zeroize the decoded secret key bytes
    secret_key.zeroize();

    // Extract payload components
    let kyber_ct_bytes = &payload[..key_sizes::KYBER_CIPHERTEXT];
    let ephemeral_pk_bytes = &payload[key_sizes::KYBER_CIPHERTEXT..key_sizes::KYBER_CIPHERTEXT + key_sizes::X25519_PUBLIC_KEY];
    let nonce_start = key_sizes::KYBER_CIPHERTEXT + key_sizes::X25519_PUBLIC_KEY;
    let nonce_bytes = &payload[nonce_start..nonce_start + key_sizes::CHACHA_NONCE];
    let encrypted_data = &payload[nonce_start + key_sizes::CHACHA_NONCE..];

    // Parse Kyber ciphertext
    let kyber_ct = kyber1024::Ciphertext::from_bytes(kyber_ct_bytes)
        .map_err(|_| "Failed to parse Kyber ciphertext")?;

    // Parse ephemeral X25519 public key
    let ephemeral_pk_array: [u8; 32] = ephemeral_pk_bytes
        .try_into()
        .map_err(|_| "Invalid ephemeral public key")?;
    let ephemeral_pk = X25519PublicKey::from(ephemeral_pk_array);

    // Decapsulate Kyber shared secret
    let kyber_ss = kyber1024::decapsulate(&kyber_ct, &kyber_sk);

    // Compute X25519 shared secret
    let x25519_ss = x25519_sk.diffie_hellman(&ephemeral_pk);

    // Combine shared secrets using HKDF
    let encryption_key = kdf::combine_secrets(
        &[kyber_ss.as_bytes(), x25519_ss.as_bytes()],
        kdf::domains::ENCRYPTION_KEY,
    );

    // Parse nonce
    let nonce: [u8; 12] = nonce_bytes
        .try_into()
        .map_err(|_| "Invalid nonce")?;

    // Decrypt
    let plaintext = aead::decrypt_simple(&encryption_key, &nonce, encrypted_data)
        .map_err(|e| format!("Decryption failed: {}", e))?;

    String::from_utf8(plaintext)
        .map_err(|e| format!("Invalid UTF-8 in decrypted data: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_keypair_generation() {
        let keypair = generate_keypair().unwrap();

        let pk = BASE64.decode(&keypair.public_key).unwrap();
        let sk = BASE64.decode(&keypair.secret_key).unwrap();

        assert_eq!(pk.len(), HYBRID_PUBLIC_KEY_SIZE);
        assert_eq!(sk.len(), HYBRID_SECRET_KEY_SIZE);
        assert_eq!(keypair.algorithm, ALGORITHM_HYBRID);
    }

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let keypair = generate_keypair().unwrap();
        let plaintext = "SSN: 123-45-6789";

        let encrypted = encrypt(plaintext, &keypair.public_key).unwrap();
        assert!(encrypted.starts_with(&format!("{}{}:", ENCRYPTION_PREFIX, ALGORITHM_HYBRID)));

        let decrypted = decrypt(&encrypted, &keypair.secret_key).unwrap();
        assert_eq!(plaintext, decrypted);
    }

    #[test]
    fn test_encrypt_different_each_time() {
        let keypair = generate_keypair().unwrap();
        let plaintext = "Same message";

        let encrypted1 = encrypt(plaintext, &keypair.public_key).unwrap();
        let encrypted2 = encrypt(plaintext, &keypair.public_key).unwrap();

        // Ciphertexts should differ (random ephemeral keys)
        assert_ne!(encrypted1, encrypted2);

        // But both should decrypt to same plaintext
        let decrypted1 = decrypt(&encrypted1, &keypair.secret_key).unwrap();
        let decrypted2 = decrypt(&encrypted2, &keypair.secret_key).unwrap();
        assert_eq!(decrypted1, plaintext);
        assert_eq!(decrypted2, plaintext);
    }

    #[test]
    fn test_wrong_secret_key() {
        let keypair1 = generate_keypair().unwrap();
        let keypair2 = generate_keypair().unwrap();
        let plaintext = "Secret data";

        let encrypted = encrypt(plaintext, &keypair1.public_key).unwrap();

        // Decryption with wrong key should fail
        let result = decrypt(&encrypted, &keypair2.secret_key);
        assert!(result.is_err());
    }

    #[test]
    fn test_tampered_ciphertext() {
        let keypair = generate_keypair().unwrap();
        let plaintext = "Important data";

        let encrypted = encrypt(plaintext, &keypair.public_key).unwrap();

        // Tamper with the ciphertext
        let parts: Vec<&str> = encrypted.splitn(4, ':').collect();
        let mut payload = BASE64.decode(parts[3]).unwrap();
        let last_idx = payload.len() - 1;
        payload[last_idx] ^= 0xFF;  // Flip bits in last byte
        let tampered = format!("{}:{}:{}:{}", parts[0], parts[1], parts[2], BASE64.encode(&payload));

        // Decryption should fail
        let result = decrypt(&tampered, &keypair.secret_key);
        assert!(result.is_err());
    }

    #[test]
    fn test_various_message_sizes() {
        let keypair = generate_keypair().unwrap();

        // Empty message
        let encrypted = encrypt("", &keypair.public_key).unwrap();
        let decrypted = decrypt(&encrypted, &keypair.secret_key).unwrap();
        assert_eq!("", decrypted);

        // Small message
        let encrypted = encrypt("a", &keypair.public_key).unwrap();
        let decrypted = decrypt(&encrypted, &keypair.secret_key).unwrap();
        assert_eq!("a", decrypted);

        // Large message (1KB)
        let large = "x".repeat(1024);
        let encrypted = encrypt(&large, &keypair.public_key).unwrap();
        let decrypted = decrypt(&encrypted, &keypair.secret_key).unwrap();
        assert_eq!(large, decrypted);

        // Unicode message
        let unicode = "Hello 世界 🌍 مرحبا";
        let encrypted = encrypt(unicode, &keypair.public_key).unwrap();
        let decrypted = decrypt(&encrypted, &keypair.secret_key).unwrap();
        assert_eq!(unicode, decrypted);
    }

    #[test]
    fn test_invalid_format() {
        let keypair = generate_keypair().unwrap();

        // Missing prefix
        assert!(decrypt("some random data", &keypair.secret_key).is_err());

        // Wrong algorithm
        assert!(decrypt("pqc:v1:wrong-algo:data", &keypair.secret_key).is_err());

        // Invalid base64
        assert!(decrypt(&format!("{}{}:not!valid!base64", ENCRYPTION_PREFIX, ALGORITHM_HYBRID), &keypair.secret_key).is_err());
    }
}
