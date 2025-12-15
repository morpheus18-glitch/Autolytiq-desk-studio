//! Key Derivation Functions
//!
//! Uses HKDF with SHA3-256 to derive multiple keys from shared secrets.
//! This is critical for hybrid encryption where we combine multiple shared secrets.
//!
//! ## Design Rationale
//! - SHA3-256 is quantum-resistant (unlike SHA-256 which has some quantum weaknesses)
//! - HKDF provides proper key separation via context/info parameters
//! - 32-byte output is optimal for ChaCha20-Poly1305

use hkdf::Hkdf;
use sha3::Sha3_256;
use zeroize::Zeroize;

/// Domain separation constants for different key types
pub mod domains {
    pub const ENCRYPTION_KEY: &[u8] = b"autolytiq-pqc-v1-encryption";
    pub const AUTHENTICATION_KEY: &[u8] = b"autolytiq-pqc-v1-authentication";
    pub const DERIVED_KEY: &[u8] = b"autolytiq-pqc-v1-derived";
}

/// Derive an encryption key from input key material
///
/// # Arguments
/// * `ikm` - Input key material (typically a shared secret)
/// * `salt` - Optional salt (use None for random extraction)
/// * `info` - Context/application-specific info
///
/// # Returns
/// 32-byte derived key suitable for ChaCha20-Poly1305
pub fn derive_key(ikm: &[u8], salt: Option<&[u8]>, info: &[u8]) -> [u8; 32] {
    let hk = Hkdf::<Sha3_256>::new(salt, ikm);
    let mut output = [0u8; 32];
    hk.expand(info, &mut output)
        .expect("32 bytes should always succeed");
    output
}

/// Combine multiple shared secrets into a single key
///
/// Used in hybrid encryption to combine Kyber + X25519 shared secrets.
/// This provides defense-in-depth: both algorithms must be broken to compromise the key.
///
/// # Arguments
/// * `secrets` - Multiple shared secrets to combine
/// * `info` - Context information
///
/// # Returns
/// 32-byte combined key
pub fn combine_secrets(secrets: &[&[u8]], info: &[u8]) -> [u8; 32] {
    // Concatenate all secrets
    let mut combined: Vec<u8> = Vec::new();
    for secret in secrets {
        combined.extend_from_slice(secret);
    }

    // Derive final key
    let result = derive_key(&combined, None, info);

    // Zeroize intermediate material
    combined.zeroize();

    result
}

/// Derive multiple keys from a single shared secret
///
/// # Arguments
/// * `ikm` - Input key material
/// * `count` - Number of 32-byte keys to derive
///
/// # Returns
/// Vector of derived keys
pub fn derive_multiple_keys(ikm: &[u8], count: usize) -> Vec<[u8; 32]> {
    let mut keys = Vec::with_capacity(count);
    for i in 0..count {
        let info = format!("key-{}", i);
        keys.push(derive_key(ikm, None, info.as_bytes()));
    }
    keys
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_derive_key_deterministic() {
        let ikm = b"test input key material";
        let info = b"test info";

        let key1 = derive_key(ikm, None, info);
        let key2 = derive_key(ikm, None, info);

        assert_eq!(key1, key2);
        assert_eq!(key1.len(), 32);
    }

    #[test]
    fn test_different_info_different_keys() {
        let ikm = b"test input key material";

        let key1 = derive_key(ikm, None, b"info1");
        let key2 = derive_key(ikm, None, b"info2");

        assert_ne!(key1, key2);
    }

    #[test]
    fn test_different_salt_different_keys() {
        let ikm = b"test input key material";
        let info = b"test info";

        let key1 = derive_key(ikm, Some(b"salt1"), info);
        let key2 = derive_key(ikm, Some(b"salt2"), info);

        assert_ne!(key1, key2);
    }

    #[test]
    fn test_combine_secrets() {
        let secret1 = [1u8; 32];
        let secret2 = [2u8; 32];
        let info = b"combined key";

        let combined = combine_secrets(&[&secret1, &secret2], info);

        // Combined key should be deterministic
        let combined2 = combine_secrets(&[&secret1, &secret2], info);
        assert_eq!(combined, combined2);

        // Order matters
        let reversed = combine_secrets(&[&secret2, &secret1], info);
        assert_ne!(combined, reversed);
    }

    #[test]
    fn test_derive_multiple_keys() {
        let ikm = b"master secret";
        let keys = derive_multiple_keys(ikm, 3);

        assert_eq!(keys.len(), 3);

        // All keys should be different
        assert_ne!(keys[0], keys[1]);
        assert_ne!(keys[1], keys[2]);
        assert_ne!(keys[0], keys[2]);
    }
}
