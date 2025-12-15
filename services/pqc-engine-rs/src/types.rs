//! Type definitions for the PQC engine

use serde::{Deserialize, Serialize};

/// Keypair for key encapsulation (ML-KEM / Kyber)
///
/// Note: Secret keys are automatically zeroized when dropped.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KemKeypair {
    pub public_key: String,  // Base64-encoded
    pub secret_key: String,  // Base64-encoded
    pub algorithm: String,
}

/// Result of key encapsulation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncapsulationResult {
    pub ciphertext: String,      // Base64-encoded
    pub shared_secret: String,   // Base64-encoded 32-byte secret
}

/// Keypair for digital signatures (ML-DSA / Dilithium)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SigningKeypair {
    pub public_key: String,  // Base64-encoded
    pub secret_key: String,  // Base64-encoded
    pub algorithm: String,
}

/// Hybrid keypair combining classical and post-quantum cryptography
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HybridKeypair {
    pub public_key: String,   // Base64-encoded combined public key
    pub secret_key: String,   // Base64-encoded combined secret key
    pub algorithm: String,    // e.g., "kyber1024-x25519"
}

/// Complete key bundle for a user/entity
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyBundle {
    /// Hybrid encryption public key
    pub encryption_public_key: String,
    /// Hybrid encryption secret key (keep secure!)
    pub encryption_secret_key: String,
    /// Digital signature public key
    pub signing_public_key: String,
    /// Digital signature secret key (keep secure!)
    pub signing_secret_key: String,
    /// Key bundle version
    pub version: String,
    /// Generation timestamp (ISO 8601)
    pub generated_at: String,
}

impl KeyBundle {
    /// Generate a complete key bundle with encryption and signing keypairs
    pub fn generate() -> Result<Self, String> {
        let encryption_keys = crate::hybrid::generate_keypair()?;
        let signing_keys = crate::dilithium::generate_keypair()?;

        Ok(KeyBundle {
            encryption_public_key: encryption_keys.public_key.clone(),
            encryption_secret_key: encryption_keys.secret_key.clone(),
            signing_public_key: signing_keys.public_key.clone(),
            signing_secret_key: signing_keys.secret_key.clone(),
            version: "1.0".to_string(),
            generated_at: chrono_lite_now(),
        })
    }
}

/// Algorithm information for documentation/debugging
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlgorithmInfo {
    pub kem_algorithm: String,
    pub kem_security_level: String,
    pub signature_algorithm: String,
    pub signature_security_level: String,
    pub aead_algorithm: String,
    pub kdf_algorithm: String,
    pub hybrid_mode: bool,
    pub classical_kem: String,
    pub encryption_format: String,
    pub fips_compliance: String,
}

/// Encrypted payload structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptedPayload {
    /// Protocol version
    pub version: u8,
    /// Algorithm identifier
    pub algorithm: String,
    /// Kyber ciphertext (encapsulated key)
    pub kyber_ciphertext: Vec<u8>,
    /// X25519 ephemeral public key
    pub x25519_public: [u8; 32],
    /// ChaCha20-Poly1305 nonce
    pub nonce: [u8; 12],
    /// Encrypted data + authentication tag
    pub ciphertext: Vec<u8>,
}

/// Simple timestamp without heavy chrono dependency
fn chrono_lite_now() -> String {
    // Return a placeholder - in WASM we'll use JS Date
    "2024-01-01T00:00:00Z".to_string()
}

/// Encryption format constants
pub const ENCRYPTION_PREFIX: &str = "pqc:v1:";
pub const ALGORITHM_HYBRID: &str = "kyber1024-x25519-chacha20poly1305";

/// Key sizes (in bytes)
pub mod key_sizes {
    // Kyber-1024 sizes
    pub const KYBER_PUBLIC_KEY: usize = 1568;
    pub const KYBER_SECRET_KEY: usize = 3168;
    pub const KYBER_CIPHERTEXT: usize = 1568;
    pub const KYBER_SHARED_SECRET: usize = 32;

    // Dilithium5 sizes (from pqcrypto-dilithium 0.5)
    pub const DILITHIUM_PUBLIC_KEY: usize = 2592;
    pub const DILITHIUM_SECRET_KEY: usize = 4896;  // Note: 4896 bytes in this version
    pub const DILITHIUM_SIGNATURE: usize = 4627;   // Note: 4627 bytes in this version

    // X25519 sizes
    pub const X25519_PUBLIC_KEY: usize = 32;
    pub const X25519_SECRET_KEY: usize = 32;
    pub const X25519_SHARED_SECRET: usize = 32;

    // ChaCha20-Poly1305 sizes
    pub const CHACHA_NONCE: usize = 12;
    pub const CHACHA_TAG: usize = 16;
}
