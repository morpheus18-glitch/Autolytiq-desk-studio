//! ML-KEM (Kyber-1024) Key Encapsulation Mechanism
//!
//! NIST FIPS 203 compliant implementation using the pqcrypto-kyber crate.
//!
//! ## Security Level
//! Kyber-1024 provides:
//! - 256-bit classical security (equivalent to AES-256)
//! - ~180-bit quantum security (against Grover's algorithm)
//!
//! ## Usage
//! Key encapsulation allows two parties to establish a shared secret:
//! 1. Alice generates a keypair and shares her public key
//! 2. Bob encapsulates: creates a ciphertext and shared secret using Alice's public key
//! 3. Alice decapsulates: recovers the same shared secret from the ciphertext

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use pqcrypto_kyber::kyber1024;
use pqcrypto_traits::kem::{Ciphertext, PublicKey, SecretKey, SharedSecret};
use zeroize::Zeroize;

use crate::types::{EncapsulationResult, KemKeypair};

/// Generate a new Kyber-1024 keypair
///
/// # Returns
/// A `KemKeypair` containing:
/// - `public_key`: 1568-byte public key (base64)
/// - `secret_key`: 3168-byte secret key (base64)
///
/// # Security Notes
/// - The secret key must be stored securely
/// - Never transmit the secret key
/// - Use for encryption operations only
pub fn generate_keypair() -> Result<KemKeypair, String> {
    let (pk, sk) = kyber1024::keypair();

    Ok(KemKeypair {
        public_key: BASE64.encode(pk.as_bytes()),
        secret_key: BASE64.encode(sk.as_bytes()),
        algorithm: "kyber1024".to_string(),
    })
}

/// Encapsulate a shared secret using the recipient's public key
///
/// # Arguments
/// * `public_key_base64` - Base64-encoded Kyber-1024 public key
///
/// # Returns
/// An `EncapsulationResult` containing:
/// - `ciphertext`: The encapsulated key to send to the key owner
/// - `shared_secret`: The 32-byte shared secret for encryption
///
/// # Security Notes
/// - The ciphertext can be sent over insecure channels
/// - The shared secret should be used immediately and then zeroized
/// - Use HKDF to derive multiple keys from the shared secret
pub fn encapsulate(public_key_base64: &str) -> Result<EncapsulationResult, String> {
    // Decode the public key
    let pk_bytes = BASE64
        .decode(public_key_base64)
        .map_err(|e| format!("Invalid base64 public key: {}", e))?;

    // Validate key size
    if pk_bytes.len() != crate::types::key_sizes::KYBER_PUBLIC_KEY {
        return Err(format!(
            "Invalid public key size: expected {} bytes, got {}",
            crate::types::key_sizes::KYBER_PUBLIC_KEY,
            pk_bytes.len()
        ));
    }

    // Parse the public key
    let pk = kyber1024::PublicKey::from_bytes(&pk_bytes)
        .map_err(|_| "Failed to parse Kyber public key")?;

    // Encapsulate
    let (ss, ct) = kyber1024::encapsulate(&pk);

    Ok(EncapsulationResult {
        ciphertext: BASE64.encode(ct.as_bytes()),
        shared_secret: BASE64.encode(ss.as_bytes()),
    })
}

/// Decapsulate a shared secret using your secret key
///
/// # Arguments
/// * `secret_key_base64` - Base64-encoded Kyber-1024 secret key
/// * `ciphertext_base64` - Base64-encoded ciphertext from encapsulation
///
/// # Returns
/// Base64-encoded 32-byte shared secret (same as encapsulator received)
///
/// # Security Notes
/// - The shared secret should be used immediately and then zeroized
/// - If decapsulation fails, the implementation may return a pseudorandom value
///   (this is a security feature to prevent timing attacks)
pub fn decapsulate(secret_key_base64: &str, ciphertext_base64: &str) -> Result<String, String> {
    // Decode the secret key
    let mut sk_bytes = BASE64
        .decode(secret_key_base64)
        .map_err(|e| format!("Invalid base64 secret key: {}", e))?;

    // Validate key size
    if sk_bytes.len() != crate::types::key_sizes::KYBER_SECRET_KEY {
        sk_bytes.zeroize();
        return Err(format!(
            "Invalid secret key size: expected {} bytes, got {}",
            crate::types::key_sizes::KYBER_SECRET_KEY,
            sk_bytes.len()
        ));
    }

    // Parse the secret key
    let sk = kyber1024::SecretKey::from_bytes(&sk_bytes)
        .map_err(|_| {
            sk_bytes.zeroize();
            "Failed to parse Kyber secret key"
        })?;
    sk_bytes.zeroize();

    // Decode the ciphertext
    let ct_bytes = BASE64
        .decode(ciphertext_base64)
        .map_err(|e| format!("Invalid base64 ciphertext: {}", e))?;

    // Validate ciphertext size
    if ct_bytes.len() != crate::types::key_sizes::KYBER_CIPHERTEXT {
        return Err(format!(
            "Invalid ciphertext size: expected {} bytes, got {}",
            crate::types::key_sizes::KYBER_CIPHERTEXT,
            ct_bytes.len()
        ));
    }

    // Parse the ciphertext
    let ct = kyber1024::Ciphertext::from_bytes(&ct_bytes)
        .map_err(|_| "Failed to parse Kyber ciphertext")?;

    // Decapsulate
    let ss = kyber1024::decapsulate(&ct, &sk);

    Ok(BASE64.encode(ss.as_bytes()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_keypair_generation() {
        let keypair = generate_keypair().unwrap();

        // Verify key sizes
        let pk_bytes = BASE64.decode(&keypair.public_key).unwrap();
        let sk_bytes = BASE64.decode(&keypair.secret_key).unwrap();

        assert_eq!(pk_bytes.len(), crate::types::key_sizes::KYBER_PUBLIC_KEY);
        assert_eq!(sk_bytes.len(), crate::types::key_sizes::KYBER_SECRET_KEY);
        assert_eq!(keypair.algorithm, "kyber1024");
    }

    #[test]
    fn test_encapsulation_decapsulation() {
        let keypair = generate_keypair().unwrap();

        // Encapsulate
        let encap = encapsulate(&keypair.public_key).unwrap();

        // Verify ciphertext size
        let ct_bytes = BASE64.decode(&encap.ciphertext).unwrap();
        assert_eq!(ct_bytes.len(), crate::types::key_sizes::KYBER_CIPHERTEXT);

        // Verify shared secret size
        let ss_bytes = BASE64.decode(&encap.shared_secret).unwrap();
        assert_eq!(ss_bytes.len(), crate::types::key_sizes::KYBER_SHARED_SECRET);

        // Decapsulate
        let decap = decapsulate(&keypair.secret_key, &encap.ciphertext).unwrap();

        // Shared secrets must match
        assert_eq!(encap.shared_secret, decap);
    }

    #[test]
    fn test_invalid_public_key() {
        let result = encapsulate("not_valid_base64!");
        assert!(result.is_err());

        let result = encapsulate(&BASE64.encode(vec![0u8; 100]));
        assert!(result.is_err());
    }

    #[test]
    fn test_deterministic_decapsulation() {
        // Same keypair and ciphertext should always produce same shared secret
        let keypair = generate_keypair().unwrap();
        let encap = encapsulate(&keypair.public_key).unwrap();

        let ss1 = decapsulate(&keypair.secret_key, &encap.ciphertext).unwrap();
        let ss2 = decapsulate(&keypair.secret_key, &encap.ciphertext).unwrap();

        assert_eq!(ss1, ss2);
    }
}
