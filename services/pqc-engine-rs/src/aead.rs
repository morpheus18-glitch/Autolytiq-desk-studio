//! Authenticated Encryption with Associated Data (AEAD)
//!
//! Uses ChaCha20-Poly1305 for symmetric encryption with authentication.
//!
//! ## Why ChaCha20-Poly1305?
//! - Faster than AES on platforms without hardware acceleration (including WASM)
//! - 256-bit security level
//! - Built-in authentication (Poly1305 MAC)
//! - Resistant to timing attacks (constant-time implementation)
//!
//! ## Security Notes
//! - NEVER reuse a nonce with the same key
//! - Nonces are randomly generated for each encryption
//! - Associated data (AAD) is authenticated but not encrypted

use chacha20poly1305::{
    aead::{Aead, KeyInit, OsRng},
    ChaCha20Poly1305, Nonce,
};
use rand::RngCore;

use crate::types::key_sizes;

/// Encrypt data using ChaCha20-Poly1305
///
/// # Arguments
/// * `key` - 32-byte encryption key
/// * `plaintext` - Data to encrypt
/// * `aad` - Associated data (authenticated but not encrypted)
///
/// # Returns
/// Tuple of (nonce, ciphertext) where:
/// - nonce: 12-byte random nonce
/// - ciphertext: encrypted data + 16-byte authentication tag
///
/// # Security Notes
/// - Nonce is randomly generated
/// - Ciphertext is authenticated (tamper-evident)
pub fn encrypt(key: &[u8; 32], plaintext: &[u8], aad: &[u8]) -> Result<([u8; 12], Vec<u8>), String> {
    // Create cipher
    let cipher = ChaCha20Poly1305::new_from_slice(key)
        .map_err(|e| format!("Invalid key: {}", e))?;

    // Generate random nonce
    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    // Encrypt with associated data
    let ciphertext = cipher
        .encrypt(nonce, chacha20poly1305::aead::Payload {
            msg: plaintext,
            aad,
        })
        .map_err(|e| format!("Encryption failed: {}", e))?;

    Ok((nonce_bytes, ciphertext))
}

/// Decrypt data using ChaCha20-Poly1305
///
/// # Arguments
/// * `key` - 32-byte encryption key
/// * `nonce` - 12-byte nonce used for encryption
/// * `ciphertext` - Encrypted data + authentication tag
/// * `aad` - Associated data (must match encryption)
///
/// # Returns
/// Decrypted plaintext
///
/// # Errors
/// - Returns error if authentication fails (tampered data)
/// - Returns error if nonce/key mismatch
pub fn decrypt(key: &[u8; 32], nonce: &[u8; 12], ciphertext: &[u8], aad: &[u8]) -> Result<Vec<u8>, String> {
    // Create cipher
    let cipher = ChaCha20Poly1305::new_from_slice(key)
        .map_err(|e| format!("Invalid key: {}", e))?;

    let nonce = Nonce::from_slice(nonce);

    // Decrypt and verify
    let plaintext = cipher
        .decrypt(nonce, chacha20poly1305::aead::Payload {
            msg: ciphertext,
            aad,
        })
        .map_err(|_| "Decryption failed: authentication tag mismatch")?;

    Ok(plaintext)
}

/// Encrypt data without associated data (simpler API)
pub fn encrypt_simple(key: &[u8; 32], plaintext: &[u8]) -> Result<([u8; 12], Vec<u8>), String> {
    encrypt(key, plaintext, &[])
}

/// Decrypt data without associated data (simpler API)
pub fn decrypt_simple(key: &[u8; 32], nonce: &[u8; 12], ciphertext: &[u8]) -> Result<Vec<u8>, String> {
    decrypt(key, nonce, ciphertext, &[])
}

/// Generate a random 32-byte key
pub fn generate_key() -> [u8; 32] {
    let mut key = [0u8; 32];
    OsRng.fill_bytes(&mut key);
    key
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let key = generate_key();
        let plaintext = b"Hello, quantum-resistant encryption!";
        let aad = b"additional authenticated data";

        let (nonce, ciphertext) = encrypt(&key, plaintext, aad).unwrap();
        let decrypted = decrypt(&key, &nonce, &ciphertext, aad).unwrap();

        assert_eq!(plaintext.to_vec(), decrypted);
    }

    #[test]
    fn test_simple_encrypt_decrypt() {
        let key = generate_key();
        let plaintext = b"Simple encryption test";

        let (nonce, ciphertext) = encrypt_simple(&key, plaintext).unwrap();
        let decrypted = decrypt_simple(&key, &nonce, &ciphertext).unwrap();

        assert_eq!(plaintext.to_vec(), decrypted);
    }

    #[test]
    fn test_tampered_ciphertext() {
        let key = generate_key();
        let plaintext = b"Original message";

        let (nonce, mut ciphertext) = encrypt_simple(&key, plaintext).unwrap();

        // Tamper with ciphertext
        ciphertext[0] ^= 0xFF;

        // Decryption should fail
        let result = decrypt_simple(&key, &nonce, &ciphertext);
        assert!(result.is_err());
    }

    #[test]
    fn test_wrong_key() {
        let key1 = generate_key();
        let key2 = generate_key();
        let plaintext = b"Secret message";

        let (nonce, ciphertext) = encrypt_simple(&key1, plaintext).unwrap();

        // Decryption with wrong key should fail
        let result = decrypt_simple(&key2, &nonce, &ciphertext);
        assert!(result.is_err());
    }

    #[test]
    fn test_wrong_aad() {
        let key = generate_key();
        let plaintext = b"Secret message";
        let aad1 = b"correct aad";
        let aad2 = b"wrong aad";

        let (nonce, ciphertext) = encrypt(&key, plaintext, aad1).unwrap();

        // Decryption with wrong AAD should fail
        let result = decrypt(&key, &nonce, &ciphertext, aad2);
        assert!(result.is_err());
    }

    #[test]
    fn test_nonce_uniqueness() {
        let key = generate_key();
        let plaintext = b"Same message";

        let (nonce1, _) = encrypt_simple(&key, plaintext).unwrap();
        let (nonce2, _) = encrypt_simple(&key, plaintext).unwrap();

        // Nonces should be different (random)
        assert_ne!(nonce1, nonce2);
    }

    #[test]
    fn test_ciphertext_length() {
        let key = generate_key();
        let plaintext = b"Test message";

        let (_, ciphertext) = encrypt_simple(&key, plaintext).unwrap();

        // Ciphertext should be plaintext + 16-byte tag
        assert_eq!(ciphertext.len(), plaintext.len() + key_sizes::CHACHA_TAG);
    }
}
