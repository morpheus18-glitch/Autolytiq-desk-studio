//! # PQC Engine - Post-Quantum Cryptography for Autolytiq
//!
//! This crate provides NIST FIPS 203/204 compliant post-quantum cryptography:
//! - **ML-KEM (Kyber-1024)**: Key Encapsulation Mechanism for secure key exchange
//! - **ML-DSA (Dilithium5)**: Digital Signature Algorithm for authentication
//! - **Hybrid Mode**: Combined classical (X25519) + PQC for defense-in-depth
//!
//! ## Security Levels
//! - Kyber-1024: 256-bit classical / ~180-bit quantum security
//! - Dilithium5: 256-bit classical / ~128-bit quantum security
//!
//! ## Usage
//! ```javascript
//! import init, { generate_keypair, encrypt_pii, decrypt_pii } from 'pqc-engine-rs';
//!
//! await init();
//! const keys = generate_keypair();
//! const encrypted = encrypt_pii("SSN: 123-45-6789", keys.public_key);
//! const decrypted = decrypt_pii(encrypted, keys.secret_key);
//! ```

mod kyber;
mod dilithium;
mod hybrid;
mod aead;
mod kdf;
mod types;

use wasm_bindgen::prelude::*;

// Re-export for testing (with explicit names to avoid conflicts)
pub use kyber::{generate_keypair as kyber_generate_keypair, encapsulate as kyber_encapsulate, decapsulate as kyber_decapsulate};
pub use dilithium::{generate_keypair as dilithium_generate_keypair, sign as dilithium_sign, verify as dilithium_verify};
pub use hybrid::{generate_keypair as hybrid_generate_keypair, encrypt as hybrid_encrypt, decrypt as hybrid_decrypt};
pub use aead::{encrypt as aead_encrypt, decrypt as aead_decrypt, encrypt_simple, decrypt_simple, generate_key};
pub use kdf::{derive_key, combine_secrets, derive_multiple_keys};
pub use types::*;

/// Helper trait to convert String errors to JsValue
trait ToJsError<T> {
    fn to_js_err(self) -> Result<T, JsValue>;
}

impl<T> ToJsError<T> for Result<T, String> {
    fn to_js_err(self) -> Result<T, JsValue> {
        self.map_err(|e| JsValue::from_str(&e))
    }
}

/// Initialize panic hook for better WASM error messages
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

// ============================================================================
// ML-KEM (Kyber) - Key Encapsulation Mechanism - FIPS 203
// ============================================================================

/// Generate a new ML-KEM (Kyber-1024) keypair for key encapsulation
///
/// Returns a JSON object with:
/// - `public_key`: Base64-encoded public key (1568 bytes)
/// - `secret_key`: Base64-encoded secret key (3168 bytes)
///
/// # Security
/// Kyber-1024 provides the highest security level:
/// - 256-bit classical security
/// - ~180-bit quantum security (against Grover's algorithm)
#[wasm_bindgen]
pub fn generate_kem_keypair() -> Result<JsValue, JsValue> {
    let keypair = kyber::generate_keypair().to_js_err()?;
    serde_wasm_bindgen::to_value(&keypair)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

/// Encapsulate a shared secret using the recipient's public key
///
/// # Arguments
/// * `public_key_base64` - Base64-encoded Kyber public key
///
/// # Returns
/// JSON object with:
/// - `ciphertext`: Base64-encoded encapsulated key
/// - `shared_secret`: Base64-encoded 32-byte shared secret
#[wasm_bindgen]
pub fn kem_encapsulate(public_key_base64: &str) -> Result<JsValue, JsValue> {
    let result = kyber::encapsulate(public_key_base64).to_js_err()?;
    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

/// Decapsulate a shared secret using your secret key
///
/// # Arguments
/// * `secret_key_base64` - Base64-encoded Kyber secret key
/// * `ciphertext_base64` - Base64-encoded encapsulated key
///
/// # Returns
/// Base64-encoded 32-byte shared secret
#[wasm_bindgen]
pub fn kem_decapsulate(secret_key_base64: &str, ciphertext_base64: &str) -> Result<String, JsValue> {
    kyber::decapsulate(secret_key_base64, ciphertext_base64).to_js_err()
}

// ============================================================================
// ML-DSA (Dilithium) - Digital Signatures - FIPS 204
// ============================================================================

/// Generate a new ML-DSA (Dilithium5) keypair for digital signatures
///
/// Returns a JSON object with:
/// - `public_key`: Base64-encoded public key (2592 bytes)
/// - `secret_key`: Base64-encoded secret key (4864 bytes)
#[wasm_bindgen]
pub fn generate_signing_keypair() -> Result<JsValue, JsValue> {
    let keypair = dilithium::generate_keypair().to_js_err()?;
    serde_wasm_bindgen::to_value(&keypair)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

/// Sign a message using ML-DSA (Dilithium5)
///
/// # Arguments
/// * `message` - The message to sign (as string)
/// * `secret_key_base64` - Base64-encoded Dilithium secret key
///
/// # Returns
/// Base64-encoded signature (4595 bytes)
#[wasm_bindgen]
pub fn sign_message(message: &str, secret_key_base64: &str) -> Result<String, JsValue> {
    dilithium::sign(message.as_bytes(), secret_key_base64).to_js_err()
}

/// Verify a signature using ML-DSA (Dilithium5)
///
/// # Arguments
/// * `message` - The original message
/// * `signature_base64` - Base64-encoded signature
/// * `public_key_base64` - Base64-encoded Dilithium public key
///
/// # Returns
/// `true` if signature is valid, `false` otherwise
#[wasm_bindgen]
pub fn verify_signature(message: &str, signature_base64: &str, public_key_base64: &str) -> Result<bool, JsValue> {
    dilithium::verify(message.as_bytes(), signature_base64, public_key_base64).to_js_err()
}

// ============================================================================
// Hybrid Encryption - Combined PQC + Classical
// ============================================================================

/// Generate a hybrid keypair (Kyber + X25519)
///
/// This provides defense-in-depth: even if one algorithm is broken,
/// the other still protects the data.
///
/// Returns a JSON object with:
/// - `public_key`: Combined public key (Kyber || X25519)
/// - `secret_key`: Combined secret key
/// - `algorithm`: "kyber1024-x25519"
#[wasm_bindgen]
pub fn generate_hybrid_keypair() -> Result<JsValue, JsValue> {
    let keypair = hybrid::generate_keypair().to_js_err()?;
    serde_wasm_bindgen::to_value(&keypair)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

/// Encrypt PII data using hybrid post-quantum encryption
///
/// Uses: Kyber-1024 + X25519 + HKDF-SHA3 + ChaCha20-Poly1305
///
/// # Arguments
/// * `plaintext` - The sensitive data to encrypt
/// * `public_key_base64` - Base64-encoded hybrid public key
///
/// # Returns
/// Encrypted payload in format: `pqc:v1:kyber1024-x25519-chacha20poly1305:<base64_ciphertext>`
#[wasm_bindgen]
pub fn encrypt_pii(plaintext: &str, public_key_base64: &str) -> Result<String, JsValue> {
    hybrid::encrypt(plaintext, public_key_base64).to_js_err()
}

/// Decrypt PII data using hybrid post-quantum encryption
///
/// # Arguments
/// * `ciphertext` - The encrypted payload (pqc:v1:... format)
/// * `secret_key_base64` - Base64-encoded hybrid secret key
///
/// # Returns
/// The decrypted plaintext
#[wasm_bindgen]
pub fn decrypt_pii(ciphertext: &str, secret_key_base64: &str) -> Result<String, JsValue> {
    hybrid::decrypt(ciphertext, secret_key_base64).to_js_err()
}

// ============================================================================
// Convenience Functions
// ============================================================================

/// Generate a complete key bundle for a user/entity
///
/// Includes:
/// - Hybrid encryption keypair (for PII encryption)
/// - Signing keypair (for authentication/integrity)
///
/// Returns a JSON object with all keys needed for secure operations.
#[wasm_bindgen]
pub fn generate_key_bundle() -> Result<JsValue, JsValue> {
    let bundle = types::KeyBundle::generate().to_js_err()?;
    serde_wasm_bindgen::to_value(&bundle)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

/// Get algorithm information and security parameters
#[wasm_bindgen]
pub fn get_algorithm_info() -> JsValue {
    let info = AlgorithmInfo {
        kem_algorithm: "ML-KEM (Kyber-1024)".to_string(),
        kem_security_level: "NIST Level 5 (256-bit classical, ~180-bit quantum)".to_string(),
        signature_algorithm: "ML-DSA (Dilithium5)".to_string(),
        signature_security_level: "NIST Level 5 (256-bit classical, ~128-bit quantum)".to_string(),
        aead_algorithm: "ChaCha20-Poly1305".to_string(),
        kdf_algorithm: "HKDF-SHA3-256".to_string(),
        hybrid_mode: true,
        classical_kem: "X25519".to_string(),
        encryption_format: "pqc:v1:<algorithm>:<base64_ciphertext>".to_string(),
        fips_compliance: "FIPS 203 (ML-KEM), FIPS 204 (ML-DSA)".to_string(),
    };
    serde_wasm_bindgen::to_value(&info).unwrap()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_kem_roundtrip() {
        let keypair = kyber::generate_keypair().unwrap();
        let encap = kyber::encapsulate(&keypair.public_key).unwrap();
        let decap = kyber::decapsulate(&keypair.secret_key, &encap.ciphertext).unwrap();
        assert_eq!(encap.shared_secret, decap);
    }

    #[test]
    fn test_signature_roundtrip() {
        let keypair = dilithium::generate_keypair().unwrap();
        let message = b"Test message for signing";
        let signature = dilithium::sign(message, &keypair.secret_key).unwrap();
        let valid = dilithium::verify(message, &signature, &keypair.public_key).unwrap();
        assert!(valid);
    }

    #[test]
    fn test_hybrid_encryption_roundtrip() {
        let keypair = hybrid::generate_keypair().unwrap();
        let plaintext = "SSN: 123-45-6789";
        let encrypted = hybrid::encrypt(plaintext, &keypair.public_key).unwrap();
        let decrypted = hybrid::decrypt(&encrypted, &keypair.secret_key).unwrap();
        assert_eq!(plaintext, decrypted);
    }

    #[test]
    fn test_key_bundle_generation() {
        let bundle = KeyBundle::generate().unwrap();
        assert!(!bundle.encryption_public_key.is_empty());
        assert!(!bundle.encryption_secret_key.is_empty());
        assert!(!bundle.signing_public_key.is_empty());
        assert!(!bundle.signing_secret_key.is_empty());
    }
}
