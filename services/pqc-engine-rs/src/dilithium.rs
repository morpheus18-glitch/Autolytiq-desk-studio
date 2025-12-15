//! ML-DSA (Dilithium5) Digital Signatures
//!
//! NIST FIPS 204 compliant implementation using the pqcrypto-dilithium crate.
//!
//! ## Security Level
//! Dilithium5 provides:
//! - 256-bit classical security
//! - ~128-bit quantum security
//!
//! ## Usage
//! Digital signatures provide authentication and integrity:
//! 1. Signer generates a keypair and shares their public key
//! 2. Signer creates signature on a message using their secret key
//! 3. Verifier checks signature using the signer's public key

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use pqcrypto_dilithium::dilithium5;
use pqcrypto_traits::sign::{DetachedSignature, PublicKey, SecretKey};
use zeroize::Zeroize;

use crate::types::SigningKeypair;

/// Generate a new Dilithium5 signing keypair
///
/// # Returns
/// A `SigningKeypair` containing:
/// - `public_key`: 2592-byte public key (base64)
/// - `secret_key`: 4864-byte secret key (base64)
///
/// # Security Notes
/// - The secret key must be stored securely
/// - Never transmit the secret key
/// - Use for signing operations only
pub fn generate_keypair() -> Result<SigningKeypair, String> {
    let (pk, sk) = dilithium5::keypair();

    Ok(SigningKeypair {
        public_key: BASE64.encode(pk.as_bytes()),
        secret_key: BASE64.encode(sk.as_bytes()),
        algorithm: "dilithium5".to_string(),
    })
}

/// Sign a message using Dilithium5
///
/// # Arguments
/// * `message` - The message to sign (as bytes)
/// * `secret_key_base64` - Base64-encoded Dilithium5 secret key
///
/// # Returns
/// Base64-encoded signature (4595 bytes)
///
/// # Security Notes
/// - Signatures are deterministic (same message + key = same signature)
/// - The signature binds to the exact message bytes
pub fn sign(message: &[u8], secret_key_base64: &str) -> Result<String, String> {
    // Decode the secret key
    let mut sk_bytes = BASE64
        .decode(secret_key_base64)
        .map_err(|e| format!("Invalid base64 secret key: {}", e))?;

    // Validate key size
    if sk_bytes.len() != crate::types::key_sizes::DILITHIUM_SECRET_KEY {
        sk_bytes.zeroize();
        return Err(format!(
            "Invalid secret key size: expected {} bytes, got {}",
            crate::types::key_sizes::DILITHIUM_SECRET_KEY,
            sk_bytes.len()
        ));
    }

    // Parse the secret key
    let sk = dilithium5::SecretKey::from_bytes(&sk_bytes)
        .map_err(|_| {
            sk_bytes.zeroize();
            "Failed to parse Dilithium secret key"
        })?;
    sk_bytes.zeroize();

    // Sign the message (detached signature)
    let sig = dilithium5::detached_sign(message, &sk);

    Ok(BASE64.encode(sig.as_bytes()))
}

/// Verify a signature using Dilithium5
///
/// # Arguments
/// * `message` - The original message (as bytes)
/// * `signature_base64` - Base64-encoded signature
/// * `public_key_base64` - Base64-encoded Dilithium5 public key
///
/// # Returns
/// `true` if the signature is valid, `false` otherwise
///
/// # Security Notes
/// - Verification is constant-time to prevent timing attacks
/// - A `false` result means either the message or signature was tampered with
pub fn verify(message: &[u8], signature_base64: &str, public_key_base64: &str) -> Result<bool, String> {
    // Decode the public key
    let pk_bytes = BASE64
        .decode(public_key_base64)
        .map_err(|e| format!("Invalid base64 public key: {}", e))?;

    // Validate key size
    if pk_bytes.len() != crate::types::key_sizes::DILITHIUM_PUBLIC_KEY {
        return Err(format!(
            "Invalid public key size: expected {} bytes, got {}",
            crate::types::key_sizes::DILITHIUM_PUBLIC_KEY,
            pk_bytes.len()
        ));
    }

    // Parse the public key
    let pk = dilithium5::PublicKey::from_bytes(&pk_bytes)
        .map_err(|_| "Failed to parse Dilithium public key")?;

    // Decode the signature
    let sig_bytes = BASE64
        .decode(signature_base64)
        .map_err(|e| format!("Invalid base64 signature: {}", e))?;

    // Validate signature size
    if sig_bytes.len() != crate::types::key_sizes::DILITHIUM_SIGNATURE {
        return Err(format!(
            "Invalid signature size: expected {} bytes, got {}",
            crate::types::key_sizes::DILITHIUM_SIGNATURE,
            sig_bytes.len()
        ));
    }

    // Parse the signature
    let sig = dilithium5::DetachedSignature::from_bytes(&sig_bytes)
        .map_err(|_| "Failed to parse Dilithium signature")?;

    // Verify
    match dilithium5::verify_detached_signature(&sig, message, &pk) {
        Ok(()) => Ok(true),
        Err(_) => Ok(false),
    }
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

        assert_eq!(pk_bytes.len(), crate::types::key_sizes::DILITHIUM_PUBLIC_KEY);
        assert_eq!(sk_bytes.len(), crate::types::key_sizes::DILITHIUM_SECRET_KEY);
        assert_eq!(keypair.algorithm, "dilithium5");
    }

    #[test]
    fn test_sign_verify() {
        let keypair = generate_keypair().unwrap();
        let message = b"Hello, quantum-resistant world!";

        // Sign
        let signature = sign(message, &keypair.secret_key).unwrap();

        // Verify signature size
        let sig_bytes = BASE64.decode(&signature).unwrap();
        assert_eq!(sig_bytes.len(), crate::types::key_sizes::DILITHIUM_SIGNATURE);

        // Verify
        let valid = verify(message, &signature, &keypair.public_key).unwrap();
        assert!(valid);
    }

    #[test]
    fn test_tampered_message() {
        let keypair = generate_keypair().unwrap();
        let message = b"Original message";
        let tampered = b"Tampered message";

        // Sign original
        let signature = sign(message, &keypair.secret_key).unwrap();

        // Verify with tampered message should fail
        let valid = verify(tampered, &signature, &keypair.public_key).unwrap();
        assert!(!valid);
    }

    #[test]
    fn test_tampered_signature() {
        let keypair = generate_keypair().unwrap();
        let message = b"Test message";

        // Sign
        let signature = sign(message, &keypair.secret_key).unwrap();

        // Tamper with signature
        let mut sig_bytes = BASE64.decode(&signature).unwrap();
        sig_bytes[0] ^= 0xFF;  // Flip bits in first byte
        let tampered_sig = BASE64.encode(&sig_bytes);

        // Verify with tampered signature should fail
        let valid = verify(message, &tampered_sig, &keypair.public_key).unwrap();
        assert!(!valid);
    }

    #[test]
    fn test_wrong_public_key() {
        let keypair1 = generate_keypair().unwrap();
        let keypair2 = generate_keypair().unwrap();
        let message = b"Test message";

        // Sign with keypair1
        let signature = sign(message, &keypair1.secret_key).unwrap();

        // Verify with keypair2's public key should fail
        let valid = verify(message, &signature, &keypair2.public_key).unwrap();
        assert!(!valid);
    }

    #[test]
    fn test_deterministic_signatures() {
        let keypair = generate_keypair().unwrap();
        let message = b"Same message";

        // Sign twice
        let sig1 = sign(message, &keypair.secret_key).unwrap();
        let sig2 = sign(message, &keypair.secret_key).unwrap();

        // Dilithium5 signatures are deterministic
        assert_eq!(sig1, sig2);
    }

    #[test]
    fn test_invalid_inputs() {
        let keypair = generate_keypair().unwrap();
        let message = b"Test";

        // Invalid base64
        assert!(sign(message, "not_base64!").is_err());
        assert!(verify(message, "not_base64!", &keypair.public_key).is_err());

        // Wrong size keys
        let short_key = BASE64.encode(vec![0u8; 100]);
        assert!(sign(message, &short_key).is_err());
        assert!(verify(message, &short_key, &keypair.public_key).is_err());
    }
}
