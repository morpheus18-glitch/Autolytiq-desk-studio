//! Rate Bundle Module - Dynamic Tax Rate Loading
//!
//! This module enables runtime loading of tax rates without WASM recompilation.
//! Rates are provided as a JSON bundle that can be updated independently of the engine.
//!
//! # Architecture
//!
//! ```text
//! ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
//! │  Tax Database   │ -> │  Rate Bundle    │ -> │  WASM Engine    │
//! │  (PostgreSQL)   │    │  (JSON)         │    │  (Runtime)      │
//! └─────────────────┘    └─────────────────┘    └─────────────────┘
//!                              │
//!                              v
//!                        initialize_rates()
//! ```
//!
//! # Usage
//!
//! 1. Generate JSON bundle from database using Tax Service API
//! 2. Load bundle via `initialize_rates(json)` before any calculations
//! 3. Engine uses loaded rates; falls back to compiled defaults if not initialized

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{RwLock, PoisonError};
use once_cell::sync::Lazy;
use std::fmt;

// ============================================================================
// Error Types for Rate Bundle Operations
// ============================================================================

/// Error type for rate bundle operations
///
/// Provides explicit handling for lock poisoning and other failure modes
/// instead of silently swallowing errors with `.unwrap_or()`.
#[derive(Debug)]
pub enum RateBundleError {
    /// The RwLock was poisoned by a panicking thread
    LockPoisoned(String),
    /// Rates have not been initialized
    NotInitialized,
    /// Invalid rate data
    InvalidRates(String),
    /// JSON parsing error
    ParseError(String),
}

impl fmt::Display for RateBundleError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            RateBundleError::LockPoisoned(msg) => write!(f, "Rate bundle lock poisoned: {}", msg),
            RateBundleError::NotInitialized => write!(f, "Rate bundle not initialized"),
            RateBundleError::InvalidRates(msg) => write!(f, "Invalid rates: {}", msg),
            RateBundleError::ParseError(msg) => write!(f, "Parse error: {}", msg),
        }
    }
}

impl std::error::Error for RateBundleError {}

impl<T> From<PoisonError<T>> for RateBundleError {
    fn from(e: PoisonError<T>) -> Self {
        RateBundleError::LockPoisoned(format!("{}", e))
    }
}

// ============================================================================
// Global Rate Store (Thread-Safe)
// ============================================================================

/// Global rate bundle store
/// Uses RwLock for thread-safe read-heavy access pattern
static RATE_BUNDLE: Lazy<RwLock<Option<RateBundleV1>>> = Lazy::new(|| RwLock::new(None));

/// Check if rates have been initialized
///
/// Returns `Ok(true)` if rates are loaded, `Ok(false)` if not initialized,
/// or `Err` if the lock is poisoned.
pub fn rates_initialized() -> Result<bool, RateBundleError> {
    let guard = RATE_BUNDLE.read()?;
    Ok(guard.is_some())
}

/// Check if rates have been initialized (legacy compatibility)
///
/// DEPRECATED: Use `rates_initialized()` which returns a Result.
/// This function silently returns false on lock poisoning which can hide
/// serious concurrency bugs.
pub fn rates_initialized_unchecked() -> bool {
    RATE_BUNDLE.read().map(|r| r.is_some()).unwrap_or(false)
}

/// Initialize rates from JSON bundle
///
/// Returns metadata on success, or an error if parsing fails or lock is poisoned.
pub fn initialize_rates(json: &str) -> Result<RateBundleMetadata, RateBundleError> {
    let bundle: RateBundleV1 = serde_json::from_str(json)
        .map_err(|e| RateBundleError::ParseError(format!("Failed to parse rate bundle: {}", e)))?;

    // Validate bundle
    bundle.validate()
        .map_err(|e| RateBundleError::InvalidRates(e))?;

    let metadata = bundle.metadata.clone();

    // Store the bundle - propagate poison error explicitly
    let mut store = RATE_BUNDLE.write()?;
    *store = Some(bundle);

    Ok(metadata)
}

/// Initialize rates from JSON bundle (legacy String error compatibility)
///
/// This wrapper maintains backward compatibility for callers expecting String errors.
pub fn initialize_rates_compat(json: &str) -> Result<RateBundleMetadata, String> {
    initialize_rates(json).map_err(|e| e.to_string())
}

/// Clear loaded rates (revert to compiled defaults)
///
/// Returns `Ok(())` on success, or `Err` if the lock is poisoned.
pub fn clear_rates() -> Result<(), RateBundleError> {
    let mut store = RATE_BUNDLE.write()?;
    *store = None;
    Ok(())
}

/// Clear loaded rates (legacy compatibility, ignores poison)
///
/// DEPRECATED: Use `clear_rates()` which returns a Result.
pub fn clear_rates_unchecked() {
    if let Ok(mut store) = RATE_BUNDLE.write() {
        *store = None;
    }
}

/// Get state rate from loaded bundle
///
/// Returns the combined rate for the given state, or an error if:
/// - Lock is poisoned
/// - Rates not initialized
/// - State not found
pub fn get_loaded_state_rate(state_code: &str) -> Result<f64, RateBundleError> {
    let guard = RATE_BUNDLE.read()?;
    let bundle = guard.as_ref().ok_or(RateBundleError::NotInitialized)?;
    bundle
        .state_rates
        .get(state_code)
        .map(|r| r.combined_rate)
        .ok_or_else(|| RateBundleError::InvalidRates(format!("Unknown state: {}", state_code)))
}

/// Get state rate from loaded bundle (legacy compatibility)
///
/// DEPRECATED: Use `get_loaded_state_rate()` which returns a Result.
/// Returns None on any error (lock poison, not initialized, or state not found).
pub fn get_loaded_state_rate_opt(state_code: &str) -> Option<f64> {
    RATE_BUNDLE.read().ok().and_then(|guard| {
        guard.as_ref().and_then(|bundle| {
            bundle.state_rates.get(state_code).map(|r| r.combined_rate)
        })
    })
}

/// Get local rate from loaded bundle
///
/// Returns the local rate for the given jurisdiction, or an error if:
/// - Lock is poisoned
/// - Rates not initialized
/// - State or jurisdiction not found
pub fn get_loaded_local_rate(state_code: &str, jurisdiction_code: &str) -> Result<f64, RateBundleError> {
    let guard = RATE_BUNDLE.read()?;
    let bundle = guard.as_ref().ok_or(RateBundleError::NotInitialized)?;
    bundle
        .local_rates
        .get(state_code)
        .and_then(|locals| locals.get(jurisdiction_code).map(|r| r.rate))
        .ok_or_else(|| RateBundleError::InvalidRates(
            format!("Unknown jurisdiction: {}:{}", state_code, jurisdiction_code)
        ))
}

/// Get local rate from loaded bundle (legacy compatibility)
///
/// DEPRECATED: Use `get_loaded_local_rate()` which returns a Result.
pub fn get_loaded_local_rate_opt(state_code: &str, jurisdiction_code: &str) -> Option<f64> {
    RATE_BUNDLE.read().ok().and_then(|guard| {
        guard.as_ref().and_then(|bundle| {
            bundle.local_rates.get(state_code).and_then(|locals| {
                locals.get(jurisdiction_code).map(|r| r.rate)
            })
        })
    })
}

/// Get full state rate info from loaded bundle
///
/// Returns detailed rate info for the state, or an error if:
/// - Lock is poisoned
/// - Rates not initialized
/// - State not found
pub fn get_loaded_state_info(state_code: &str) -> Result<StateRateInfo, RateBundleError> {
    let guard = RATE_BUNDLE.read()?;
    let bundle = guard.as_ref().ok_or(RateBundleError::NotInitialized)?;
    bundle
        .state_rates
        .get(state_code)
        .cloned()
        .ok_or_else(|| RateBundleError::InvalidRates(format!("Unknown state: {}", state_code)))
}

/// Get full state rate info from loaded bundle (legacy compatibility)
///
/// DEPRECATED: Use `get_loaded_state_info()` which returns a Result.
pub fn get_loaded_state_info_opt(state_code: &str) -> Option<StateRateInfo> {
    RATE_BUNDLE.read().ok().and_then(|guard| {
        guard.as_ref().and_then(|bundle| {
            bundle.state_rates.get(state_code).cloned()
        })
    })
}

/// Get bundle metadata
///
/// Returns metadata if rates are loaded, or an error if:
/// - Lock is poisoned
/// - Rates not initialized
pub fn get_bundle_metadata() -> Result<RateBundleMetadata, RateBundleError> {
    let guard = RATE_BUNDLE.read()?;
    let bundle = guard.as_ref().ok_or(RateBundleError::NotInitialized)?;
    Ok(bundle.metadata.clone())
}

/// Get bundle metadata (legacy compatibility)
///
/// DEPRECATED: Use `get_bundle_metadata()` which returns a Result.
pub fn get_bundle_metadata_opt() -> Option<RateBundleMetadata> {
    RATE_BUNDLE.read().ok().and_then(|guard| {
        guard.as_ref().map(|bundle| bundle.metadata.clone())
    })
}

// ============================================================================
// Rate Bundle Schema (V1)
// ============================================================================

/// Rate Bundle V1 - Complete tax rate configuration
///
/// This is the JSON schema for the rate bundle that gets loaded at runtime.
/// Version field allows for future schema evolution.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateBundleV1 {
    /// Schema version (must be "1.0")
    pub version: String,

    /// Bundle metadata
    pub metadata: RateBundleMetadata,

    /// State-level rates (keyed by state code)
    pub state_rates: HashMap<String, StateRateInfo>,

    /// Local jurisdiction rates (keyed by state code, then jurisdiction code)
    pub local_rates: HashMap<String, HashMap<String, LocalRateInfo>>,

    /// Special scheme parameters (GA TAVT, NC HUT, etc.)
    #[serde(default)]
    pub special_schemes: HashMap<String, SpecialSchemeParams>,

    /// Policy rules that affect calculation logic
    #[serde(default)]
    pub policy_rules: HashMap<String, StatePolicyRules>,
}

impl RateBundleV1 {
    /// Validate the bundle for consistency
    pub fn validate(&self) -> Result<(), String> {
        if self.version != "1.0" {
            return Err(format!("Unsupported bundle version: {}", self.version));
        }

        if self.state_rates.is_empty() {
            return Err("Rate bundle contains no state rates".to_string());
        }

        // Validate rate values are in reasonable range (0-100%)
        for (state, info) in &self.state_rates {
            if info.state_rate < 0.0 || info.state_rate > 1.0 {
                return Err(format!("Invalid state rate for {}: {}", state, info.state_rate));
            }
            if info.combined_rate < 0.0 || info.combined_rate > 1.0 {
                return Err(format!("Invalid combined rate for {}: {}", state, info.combined_rate));
            }
        }

        Ok(())
    }
}

/// Bundle metadata for auditing and versioning
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateBundleMetadata {
    /// When this bundle was generated (ISO 8601)
    pub generated_at: String,

    /// Bundle ID for tracking
    pub bundle_id: String,

    /// Source system that generated this bundle
    pub source: String,

    /// Effective date for these rates
    pub effective_date: String,

    /// Optional expiry date (for scheduled rate changes)
    pub expires_at: Option<String>,

    /// Count of state rates included
    pub state_count: u32,

    /// Count of local jurisdictions included
    pub local_jurisdiction_count: u32,

    /// Checksum for integrity verification
    pub checksum: Option<String>,
}

/// State-level rate information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateRateInfo {
    /// State code (e.g., "TX", "CA")
    pub state_code: String,

    /// State-only tax rate (decimal, e.g., 0.0625 = 6.25%)
    pub state_rate: f64,

    /// Average local rate (for estimation when specific jurisdiction unknown)
    #[serde(default)]
    pub avg_local_rate: f64,

    /// Maximum local rate in the state
    #[serde(default)]
    pub max_local_rate: f64,

    /// Combined state + average local rate
    pub combined_rate: f64,

    /// Whether this state has local taxes on vehicles
    #[serde(default)]
    pub has_local_vehicle_tax: bool,

    /// Special notes about this state's rates
    pub notes: Option<String>,

    /// When this rate was last verified/updated
    pub last_updated: String,

    /// Source of this rate information
    pub source: Option<String>,
}

/// Local jurisdiction rate information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalRateInfo {
    /// Jurisdiction code (e.g., "TX_DALLAS", "CA_LOS_ANGELES")
    pub jurisdiction_code: String,

    /// Display name (e.g., "Dallas, TX")
    pub name: String,

    /// Jurisdiction type
    pub jurisdiction_type: JurisdictionType,

    /// Total local rate for this jurisdiction
    pub rate: f64,

    /// Breakdown by level (optional)
    pub breakdown: Option<LocalRateBreakdown>,

    /// ZIP codes this jurisdiction covers (for lookup)
    #[serde(default)]
    pub zip_codes: Vec<String>,

    /// FIPS codes for this jurisdiction
    pub fips_code: Option<String>,

    /// When this rate was last updated
    pub last_updated: String,
}

/// Jurisdiction type classification
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum JurisdictionType {
    County,
    City,
    District,
    Transit,
    Special,
}

/// Breakdown of local rate components
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalRateBreakdown {
    /// County rate
    #[serde(default)]
    pub county: f64,

    /// City/municipal rate
    #[serde(default)]
    pub city: f64,

    /// Special district rate(s)
    #[serde(default)]
    pub district: f64,

    /// Transit tax
    #[serde(default)]
    pub transit: f64,
}

/// Special scheme parameters (for states with unique tax systems)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpecialSchemeParams {
    /// Scheme type
    pub scheme_type: SpecialSchemeType,

    /// Primary rate for the scheme
    pub rate: f64,

    /// Cap amount (for SC-style caps)
    pub cap_amount: Option<f64>,

    /// Whether trade-in reduces the base
    #[serde(default = "default_true")]
    pub allows_trade_in_credit: bool,

    /// Additional parameters as JSON
    #[serde(default)]
    pub params: HashMap<String, serde_json::Value>,

    /// Notes about this scheme
    pub notes: Option<String>,
}

fn default_true() -> bool { true }

/// Special tax scheme types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SpecialSchemeType {
    /// Georgia Title Ad Valorem Tax
    GaTavt,
    /// North Carolina Highway Use Tax
    NcHut,
    /// West Virginia Privilege Tax
    WvPrivilege,
    /// South Carolina $500 Cap
    ScCap,
    /// Oklahoma Excise Tax
    OkExcise,
}

/// State policy rules that affect calculation logic
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatePolicyRules {
    /// State code
    pub state_code: String,

    /// Trade-in credit policy
    pub trade_in_policy: TradeInPolicyRule,

    /// Whether doc fees are taxable
    #[serde(default)]
    pub doc_fee_taxable: bool,

    /// Whether service contracts are taxable
    #[serde(default)]
    pub service_contracts_taxable: bool,

    /// Whether GAP insurance is taxable
    #[serde(default)]
    pub gap_taxable: bool,

    /// Manufacturer rebate taxability
    #[serde(default)]
    pub manufacturer_rebate_taxable: bool,

    /// Dealer rebate taxability
    #[serde(default = "default_true")]
    pub dealer_rebate_taxable: bool,

    /// Effective date of these rules
    pub effective_date: String,

    /// Notes about policy changes
    pub notes: Option<String>,
}

/// Trade-in policy rule
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum TradeInPolicyRule {
    /// No trade-in credit allowed (WA, HI)
    #[serde(rename = "NONE")]
    None,

    /// Full trade-in credit
    #[serde(rename = "FULL")]
    Full,

    /// Capped trade-in credit (MI style)
    #[serde(rename = "CAPPED")]
    Capped {
        /// Maximum credit amount
        cap_amount: f64,
        /// Year the cap applies (for phase-out tracking)
        effective_year: Option<u32>,
    },

    /// Percentage-based credit
    #[serde(rename = "PERCENT")]
    Percent {
        /// Percentage of trade-in value allowed as credit
        percent: f64,
    },
}

// ============================================================================
// Example Bundle Generator (for documentation/testing)
// ============================================================================

/// Generate an example rate bundle for testing
#[cfg(test)]
pub fn generate_example_bundle() -> RateBundleV1 {
    let mut state_rates = HashMap::new();
    let mut local_rates: HashMap<String, HashMap<String, LocalRateInfo>> = HashMap::new();
    let mut special_schemes = HashMap::new();
    let mut policy_rules = HashMap::new();

    // Texas
    state_rates.insert("TX".to_string(), StateRateInfo {
        state_code: "TX".to_string(),
        state_rate: 0.0625,
        avg_local_rate: 0.02,
        max_local_rate: 0.02,
        combined_rate: 0.0825,
        has_local_vehicle_tax: true,
        notes: None,
        last_updated: "2025-01-01".to_string(),
        source: Some("Texas Comptroller".to_string()),
    });

    let mut tx_locals = HashMap::new();
    tx_locals.insert("TX_DALLAS".to_string(), LocalRateInfo {
        jurisdiction_code: "TX_DALLAS".to_string(),
        name: "Dallas, TX".to_string(),
        jurisdiction_type: JurisdictionType::City,
        rate: 0.02,
        breakdown: Some(LocalRateBreakdown {
            county: 0.00,
            city: 0.01,
            district: 0.01,
            transit: 0.00,
        }),
        zip_codes: vec!["75201".to_string(), "75202".to_string()],
        fips_code: Some("48113".to_string()),
        last_updated: "2025-01-01".to_string(),
    });
    local_rates.insert("TX".to_string(), tx_locals);

    // Indiana (state-only, no local vehicle tax)
    state_rates.insert("IN".to_string(), StateRateInfo {
        state_code: "IN".to_string(),
        state_rate: 0.07,
        avg_local_rate: 0.0,
        max_local_rate: 0.0,
        combined_rate: 0.07,
        has_local_vehicle_tax: false,
        notes: Some("Indiana has no local taxes on vehicles".to_string()),
        last_updated: "2025-01-01".to_string(),
        source: Some("Indiana DOR".to_string()),
    });

    // Georgia TAVT
    state_rates.insert("GA".to_string(), StateRateInfo {
        state_code: "GA".to_string(),
        state_rate: 0.07,
        avg_local_rate: 0.0,
        max_local_rate: 0.0,
        combined_rate: 0.07,
        has_local_vehicle_tax: false,
        notes: Some("Georgia uses TAVT instead of sales tax".to_string()),
        last_updated: "2025-01-01".to_string(),
        source: Some("Georgia DOR".to_string()),
    });

    special_schemes.insert("GA".to_string(), SpecialSchemeParams {
        scheme_type: SpecialSchemeType::GaTavt,
        rate: 0.07,
        cap_amount: None,
        allows_trade_in_credit: true,
        params: HashMap::new(),
        notes: Some("TAVT replaced traditional sales tax in 2013".to_string()),
    });

    // South Carolina Cap
    state_rates.insert("SC".to_string(), StateRateInfo {
        state_code: "SC".to_string(),
        state_rate: 0.05,
        avg_local_rate: 0.0,
        max_local_rate: 0.0,
        combined_rate: 0.05,
        has_local_vehicle_tax: false,
        notes: Some("SC caps vehicle tax at $500".to_string()),
        last_updated: "2025-01-01".to_string(),
        source: Some("SC DOR".to_string()),
    });

    special_schemes.insert("SC".to_string(), SpecialSchemeParams {
        scheme_type: SpecialSchemeType::ScCap,
        rate: 0.05,
        cap_amount: Some(500.0),
        allows_trade_in_credit: true,
        params: HashMap::new(),
        notes: Some("Maximum $500 regardless of vehicle price".to_string()),
    });

    // Michigan (capped trade-in)
    state_rates.insert("MI".to_string(), StateRateInfo {
        state_code: "MI".to_string(),
        state_rate: 0.06,
        avg_local_rate: 0.0,
        max_local_rate: 0.0,
        combined_rate: 0.06,
        has_local_vehicle_tax: false,
        notes: None,
        last_updated: "2025-01-01".to_string(),
        source: Some("Michigan Treasury".to_string()),
    });

    policy_rules.insert("MI".to_string(), StatePolicyRules {
        state_code: "MI".to_string(),
        trade_in_policy: TradeInPolicyRule::Capped {
            cap_amount: 6000.0,
            effective_year: Some(2025),
        },
        doc_fee_taxable: false,
        service_contracts_taxable: false,
        gap_taxable: false,
        manufacturer_rebate_taxable: false,
        dealer_rebate_taxable: true,
        effective_date: "2025-01-01".to_string(),
        notes: Some("Trade-in cap increases $1000/year until removed in 2026".to_string()),
    });

    RateBundleV1 {
        version: "1.0".to_string(),
        metadata: RateBundleMetadata {
            generated_at: "2025-01-01T00:00:00Z".to_string(),
            bundle_id: "example-bundle-001".to_string(),
            source: "test".to_string(),
            effective_date: "2025-01-01".to_string(),
            expires_at: None,
            state_count: 5,
            local_jurisdiction_count: 1,
            checksum: None,
        },
        state_rates,
        local_rates,
        special_schemes,
        policy_rules,
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_example_bundle_validates() {
        let bundle = generate_example_bundle();
        assert!(bundle.validate().is_ok());
    }

    #[test]
    fn test_bundle_serialization() {
        let bundle = generate_example_bundle();
        let json = serde_json::to_string_pretty(&bundle).unwrap();
        assert!(json.contains("TX"));
        assert!(json.contains("0.0625"));

        // Verify round-trip
        let parsed: RateBundleV1 = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.state_rates.len(), bundle.state_rates.len());
    }

    #[test]
    fn test_initialize_and_retrieve() {
        let bundle = generate_example_bundle();
        let json = serde_json::to_string(&bundle).unwrap();

        // Initialize
        let result = initialize_rates(&json);
        assert!(result.is_ok());
        assert!(rates_initialized().unwrap_or(false));

        // Retrieve state rate
        let tx_rate = get_loaded_state_rate("TX");
        assert!(tx_rate.is_ok());
        assert!((tx_rate.unwrap() - 0.0825).abs() < 0.0001);

        // Retrieve local rate
        let dallas_rate = get_loaded_local_rate("TX", "TX_DALLAS");
        assert!(dallas_rate.is_ok());
        assert!((dallas_rate.unwrap() - 0.02).abs() < 0.0001);

        // Clear
        assert!(clear_rates().is_ok());
        assert!(!rates_initialized().unwrap_or(true));
    }

    #[test]
    fn test_not_initialized_error() {
        // Clear first to ensure clean state
        let _ = clear_rates();

        // Accessing rates when not initialized should return NotInitialized error
        let result = get_loaded_state_rate("TX");
        assert!(matches!(result, Err(RateBundleError::NotInitialized)));
    }

    #[test]
    fn test_invalid_bundle_fails() {
        let result = initialize_rates("not valid json");
        assert!(result.is_err());

        let result = initialize_rates(r#"{"version": "2.0", "state_rates": {}}"#);
        assert!(result.is_err());
    }
}
