//! Chunk Composition System
//!
//! Atomic, versioned rule components that compose into complete state configurations.
//! Each chunk represents a single tax rule concept (trade-in policy, rebate treatment, etc.)
//!
//! # Chunk Types
//!
//! - **TradeInChunk**: Trade-in credit policy (FULL, NONE, CAPPED, PERCENT)
//! - **RebateChunk**: Rebate taxability rules
//! - **FeeChunk**: Fee taxability (doc fee, title, etc.)
//! - **LeaseChunk**: Lease-specific tax rules
//! - **ReciprocityChunk**: Cross-state reciprocity rules
//! - **JurisdictionChunk**: Local jurisdiction rates
//!
//! # Composition
//!
//! State rules are composed by combining chunks:
//!
//! ```text
//! StateRule = TradeInChunk + RebateChunk + FeeChunk + LeaseChunk + ReciprocityChunk
//! ```
//!
//! # Versioning
//!
//! Each chunk has:
//! - `version`: Semantic version (major.minor.patch)
//! - `effective_date`: When this rule became effective
//! - `expiry_date`: When this rule expires (optional)
//! - `citation`: Legal citation for audit trail

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ============================================================================
// CHUNK METADATA
// ============================================================================

/// Common metadata for all chunks
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChunkMeta {
    /// Chunk identifier
    pub id: String,

    /// Semantic version
    pub version: String,

    /// Effective date (ISO 8601)
    pub effective_date: String,

    /// Expiry date (ISO 8601, optional)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expiry_date: Option<String>,

    /// Legal citation
    #[serde(skip_serializing_if = "Option::is_none")]
    pub citation: Option<String>,

    /// Notes/documentation
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,

    /// Tags for categorization
    #[serde(default)]
    pub tags: Vec<String>,
}

impl ChunkMeta {
    pub fn new(id: &str, version: &str) -> Self {
        Self {
            id: id.to_string(),
            version: version.to_string(),
            effective_date: "2025-01-01".to_string(),
            expiry_date: None,
            citation: None,
            notes: None,
            tags: vec![],
        }
    }

    /// Check if chunk is currently effective
    pub fn is_effective(&self, date: &str) -> bool {
        if date < self.effective_date.as_str() {
            return false;
        }
        if let Some(ref expiry) = self.expiry_date {
            if date >= expiry.as_str() {
                return false;
            }
        }
        true
    }
}

// ============================================================================
// TRADE-IN CHUNK
// ============================================================================

/// Trade-in credit policy type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TradeInPolicyType {
    /// No trade-in credit (Illinois)
    None,
    /// Full trade-in credit (most states)
    Full,
    /// Capped credit (Virginia $20k cap)
    Capped,
    /// Percentage credit (some states)
    Percent,
}

/// Trade-in policy chunk
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradeInChunk {
    pub meta: ChunkMeta,

    /// Policy type
    pub policy_type: TradeInPolicyType,

    /// Cap amount (for CAPPED type)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cap_amount: Option<f64>,

    /// Percentage (for PERCENT type)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub percent: Option<f64>,

    /// Applies to leases
    #[serde(default = "default_true")]
    pub applies_to_lease: bool,

    /// Applies to retail
    #[serde(default = "default_true")]
    pub applies_to_retail: bool,
}

fn default_true() -> bool {
    true
}

impl TradeInChunk {
    /// Create a FULL credit chunk
    pub fn full(state: &str) -> Self {
        Self {
            meta: ChunkMeta::new(&format!("{}_trade_in_full", state), "1.0.0"),
            policy_type: TradeInPolicyType::Full,
            cap_amount: None,
            percent: None,
            applies_to_lease: true,
            applies_to_retail: true,
        }
    }

    /// Create a NONE credit chunk
    pub fn none(state: &str) -> Self {
        Self {
            meta: ChunkMeta::new(&format!("{}_trade_in_none", state), "1.0.0"),
            policy_type: TradeInPolicyType::None,
            cap_amount: None,
            percent: None,
            applies_to_lease: true,
            applies_to_retail: true,
        }
    }

    /// Create a CAPPED credit chunk
    pub fn capped(state: &str, cap: f64) -> Self {
        Self {
            meta: ChunkMeta::new(&format!("{}_trade_in_capped", state), "1.0.0"),
            policy_type: TradeInPolicyType::Capped,
            cap_amount: Some(cap),
            percent: None,
            applies_to_lease: true,
            applies_to_retail: true,
        }
    }

    /// Create a PERCENT credit chunk
    pub fn percent(state: &str, pct: f64) -> Self {
        Self {
            meta: ChunkMeta::new(&format!("{}_trade_in_percent", state), "1.0.0"),
            policy_type: TradeInPolicyType::Percent,
            cap_amount: None,
            percent: Some(pct),
            applies_to_lease: true,
            applies_to_retail: true,
        }
    }

    /// Calculate trade-in credit
    pub fn calculate_credit(&self, trade_value: f64) -> f64 {
        match self.policy_type {
            TradeInPolicyType::None => 0.0,
            TradeInPolicyType::Full => trade_value,
            TradeInPolicyType::Capped => {
                let cap = self.cap_amount.unwrap_or(f64::MAX);
                trade_value.min(cap)
            }
            TradeInPolicyType::Percent => {
                let pct = self.percent.unwrap_or(100.0) / 100.0;
                trade_value * pct
            }
        }
    }
}

// ============================================================================
// REBATE CHUNK
// ============================================================================

/// Rebate type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RebateType {
    Manufacturer,
    Dealer,
    Loyalty,
    Military,
    Other,
}

/// Single rebate rule
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RebateRule {
    pub rebate_type: RebateType,
    pub taxable: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
}

/// Rebate chunk
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RebateChunk {
    pub meta: ChunkMeta,

    /// Rules by rebate type
    pub rules: Vec<RebateRule>,

    /// Default taxability
    #[serde(default)]
    pub default_taxable: bool,
}

impl RebateChunk {
    /// Create standard rebate rules (manufacturer non-taxable, dealer taxable)
    pub fn standard(state: &str) -> Self {
        Self {
            meta: ChunkMeta::new(&format!("{}_rebate_standard", state), "1.0.0"),
            rules: vec![
                RebateRule {
                    rebate_type: RebateType::Manufacturer,
                    taxable: false,
                    notes: Some("Manufacturer rebates reduce taxable base".to_string()),
                },
                RebateRule {
                    rebate_type: RebateType::Dealer,
                    taxable: true,
                    notes: Some("Dealer rebates are taxable".to_string()),
                },
            ],
            default_taxable: false,
        }
    }

    /// Check if a rebate type is taxable
    pub fn is_taxable(&self, rebate_type: RebateType) -> bool {
        self.rules
            .iter()
            .find(|r| r.rebate_type == rebate_type)
            .map(|r| r.taxable)
            .unwrap_or(self.default_taxable)
    }
}

// ============================================================================
// FEE CHUNK
// ============================================================================

/// Fee code enum
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum FeeCode {
    DocFee,
    TitleFee,
    RegistrationFee,
    LicenseFee,
    SmogFee,
    InspectionFee,
    EFileFee,
    WheelTax,
    LuxuryTax,
    Acquisition,
    Disposition,
    Other,
}

/// Single fee rule
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeeRule {
    pub code: FeeCode,
    pub taxable: bool,
    pub capitalize_in_lease: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cap_amount: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
}

/// Fee chunk
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeeChunk {
    pub meta: ChunkMeta,

    /// Rules by fee code
    pub rules: HashMap<FeeCode, FeeRule>,

    /// Default taxability
    #[serde(default)]
    pub default_taxable: bool,
}

impl FeeChunk {
    /// Create default fee rules
    pub fn standard(state: &str) -> Self {
        let mut rules = HashMap::new();

        rules.insert(
            FeeCode::DocFee,
            FeeRule {
                code: FeeCode::DocFee,
                taxable: true,
                capitalize_in_lease: true,
                cap_amount: None,
                notes: None,
            },
        );

        rules.insert(
            FeeCode::TitleFee,
            FeeRule {
                code: FeeCode::TitleFee,
                taxable: false,
                capitalize_in_lease: false,
                cap_amount: None,
                notes: None,
            },
        );

        rules.insert(
            FeeCode::RegistrationFee,
            FeeRule {
                code: FeeCode::RegistrationFee,
                taxable: false,
                capitalize_in_lease: false,
                cap_amount: None,
                notes: None,
            },
        );

        Self {
            meta: ChunkMeta::new(&format!("{}_fee_standard", state), "1.0.0"),
            rules,
            default_taxable: false,
        }
    }

    /// Get rule for a fee code
    pub fn get_rule(&self, code: FeeCode) -> Option<&FeeRule> {
        self.rules.get(&code)
    }

    /// Check if a fee is taxable
    pub fn is_taxable(&self, code: FeeCode) -> bool {
        self.rules
            .get(&code)
            .map(|r| r.taxable)
            .unwrap_or(self.default_taxable)
    }
}

// ============================================================================
// LEASE CHUNK
// ============================================================================

/// Lease tax method
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum LeaseTaxMethod {
    /// Tax full cap cost at inception
    FullUpfront,
    /// Tax each payment as made
    Monthly,
    /// Tax depreciation upfront, rent charge monthly
    Hybrid,
    /// Tax net cap cost
    NetCapCost,
}

/// Lease chunk
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeaseChunk {
    pub meta: ChunkMeta,

    /// Tax method
    pub method: LeaseTaxMethod,

    /// Tax on cap cost reduction
    pub tax_cap_reduction: bool,

    /// Trade-in credit mode for leases
    pub trade_in_credit: TradeInPolicyType,

    /// Negative equity taxable
    pub negative_equity_taxable: bool,

    /// Tax fees upfront
    pub tax_fees_upfront: bool,
}

impl LeaseChunk {
    /// Create monthly tax method chunk
    pub fn monthly(state: &str) -> Self {
        Self {
            meta: ChunkMeta::new(&format!("{}_lease_monthly", state), "1.0.0"),
            method: LeaseTaxMethod::Monthly,
            tax_cap_reduction: false,
            trade_in_credit: TradeInPolicyType::Full,
            negative_equity_taxable: false,
            tax_fees_upfront: false,
        }
    }

    /// Create upfront tax method chunk
    pub fn upfront(state: &str) -> Self {
        Self {
            meta: ChunkMeta::new(&format!("{}_lease_upfront", state), "1.0.0"),
            method: LeaseTaxMethod::FullUpfront,
            tax_cap_reduction: true,
            trade_in_credit: TradeInPolicyType::Full,
            negative_equity_taxable: true,
            tax_fees_upfront: true,
        }
    }

    /// Create hybrid tax method chunk
    pub fn hybrid(state: &str) -> Self {
        Self {
            meta: ChunkMeta::new(&format!("{}_lease_hybrid", state), "1.0.0"),
            method: LeaseTaxMethod::Hybrid,
            tax_cap_reduction: false,
            trade_in_credit: TradeInPolicyType::Full,
            negative_equity_taxable: false,
            tax_fees_upfront: true,
        }
    }
}

// ============================================================================
// RECIPROCITY CHUNK
// ============================================================================

/// Reciprocity chunk (wrapper around bilateral entry)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReciprocityChunk {
    pub meta: ChunkMeta,

    /// Whether reciprocity is enabled
    pub enabled: bool,

    /// Scope (retail, lease, both)
    pub scope: ReciprocityScope,

    /// Default behavior mode
    pub default_mode: ReciprocityMode,

    /// Require proof of tax paid
    pub require_proof: bool,

    /// Cap credit at this state's tax
    pub cap_at_state_tax: bool,

    /// Non-reciprocal states (no credit given)
    pub non_reciprocal_states: Vec<String>,

    /// Time window in days (NC 90-day rule)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub time_window_days: Option<u32>,

    /// Requires mutual reciprocity (PA)
    pub requires_mutual: bool,
}

/// Reciprocity scope
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ReciprocityScope {
    None,
    RetailOnly,
    LeaseOnly,
    Both,
}

/// Reciprocity mode
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ReciprocityMode {
    None,
    CreditUpToStateRate,
    CreditFull,
    HomeStateOnly,
}

impl ReciprocityChunk {
    /// Create standard reciprocity (credit up to state rate)
    pub fn standard(state: &str) -> Self {
        Self {
            meta: ChunkMeta::new(&format!("{}_reciprocity", state), "1.0.0"),
            enabled: true,
            scope: ReciprocityScope::Both,
            default_mode: ReciprocityMode::CreditUpToStateRate,
            require_proof: true,
            cap_at_state_tax: true,
            non_reciprocal_states: vec![],
            time_window_days: None,
            requires_mutual: false,
        }
    }

    /// Create no reciprocity chunk (California)
    pub fn none(state: &str) -> Self {
        Self {
            meta: ChunkMeta::new(&format!("{}_reciprocity", state), "1.0.0"),
            enabled: false,
            scope: ReciprocityScope::None,
            default_mode: ReciprocityMode::None,
            require_proof: false,
            cap_at_state_tax: false,
            non_reciprocal_states: vec![],
            time_window_days: None,
            requires_mutual: false,
        }
    }

    /// Create Indiana-style reciprocity with non-reciprocal list
    pub fn with_exclusions(state: &str, exclusions: Vec<String>) -> Self {
        let mut chunk = Self::standard(state);
        chunk.non_reciprocal_states = exclusions;
        chunk
    }

    /// Create NC-style with time window
    pub fn with_time_window(state: &str, days: u32) -> Self {
        let mut chunk = Self::standard(state);
        chunk.time_window_days = Some(days);
        chunk
    }

    /// Create PA-style with mutual requirement
    pub fn with_mutual_requirement(state: &str) -> Self {
        let mut chunk = Self::standard(state);
        chunk.requires_mutual = true;
        chunk
    }
}

// ============================================================================
// JURISDICTION CHUNK
// ============================================================================

/// Jurisdiction type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum JurisdictionType {
    State,
    County,
    City,
    Township,
    SpecialDistrict,
    TransitAuthority,
}

/// Single jurisdiction entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JurisdictionEntry {
    pub code: String,
    pub name: String,
    pub jurisdiction_type: JurisdictionType,
    pub rate: f64,
    pub parent_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fips_code: Option<String>,
}

/// Jurisdiction chunk (for a state's local jurisdictions)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JurisdictionChunk {
    pub meta: ChunkMeta,

    /// State code
    pub state_code: String,

    /// State base rate
    pub state_rate: f64,

    /// Local rate range
    pub local_rate_range: (f64, f64),

    /// Jurisdictions
    pub jurisdictions: Vec<JurisdictionEntry>,
}

impl JurisdictionChunk {
    /// Create a new jurisdiction chunk
    pub fn new(state: &str, state_rate: f64) -> Self {
        Self {
            meta: ChunkMeta::new(&format!("{}_jurisdictions", state), "1.0.0"),
            state_code: state.to_uppercase(),
            state_rate,
            local_rate_range: (0.0, 0.0),
            jurisdictions: vec![],
        }
    }

    /// Add a jurisdiction
    pub fn add_jurisdiction(&mut self, entry: JurisdictionEntry) {
        // Update local rate range
        if entry.rate < self.local_rate_range.0 || self.jurisdictions.is_empty() {
            self.local_rate_range.0 = entry.rate;
        }
        if entry.rate > self.local_rate_range.1 {
            self.local_rate_range.1 = entry.rate;
        }
        self.jurisdictions.push(entry);
    }

    /// Get combined rate for a jurisdiction
    pub fn get_combined_rate(&self, jurisdiction_code: &str) -> Option<f64> {
        self.jurisdictions
            .iter()
            .find(|j| j.code == jurisdiction_code)
            .map(|j| self.state_rate + j.rate)
    }

    /// Get all jurisdictions of a type
    pub fn get_by_type(&self, jtype: JurisdictionType) -> Vec<&JurisdictionEntry> {
        self.jurisdictions
            .iter()
            .filter(|j| j.jurisdiction_type == jtype)
            .collect()
    }
}

// ============================================================================
// COMPOSED STATE RULE
// ============================================================================

/// Complete state rule composed from chunks
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComposedStateRule {
    pub state_code: String,
    pub version: String,
    pub effective_date: String,

    pub trade_in: TradeInChunk,
    pub rebates: RebateChunk,
    pub fees: FeeChunk,
    pub lease: LeaseChunk,
    pub reciprocity: ReciprocityChunk,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub jurisdictions: Option<JurisdictionChunk>,
}

impl ComposedStateRule {
    /// Create Indiana rules
    pub fn indiana() -> Self {
        let mut trade_in = TradeInChunk::full("IN");
        trade_in.meta.citation = Some("IC 6-6-5.5".to_string());

        let rebates = RebateChunk::standard("IN");

        let mut fees = FeeChunk::standard("IN");
        fees.rules.get_mut(&FeeCode::DocFee).unwrap().taxable = true;

        let lease = LeaseChunk::monthly("IN");

        let reciprocity = ReciprocityChunk::with_exclusions(
            "IN",
            vec![
                "AL", "CT", "HI", "LA", "MA", "MS", "NV", "SC",
            ]
            .into_iter()
            .map(String::from)
            .collect(),
        );

        Self {
            state_code: "IN".to_string(),
            version: "3.0.0".to_string(),
            effective_date: "2025-01-01".to_string(),
            trade_in,
            rebates,
            fees,
            lease,
            reciprocity,
            jurisdictions: None,
        }
    }

    /// Create Texas rules
    pub fn texas() -> Self {
        let trade_in = TradeInChunk::full("TX");
        let rebates = RebateChunk::standard("TX");
        let fees = FeeChunk::standard("TX");
        let lease = LeaseChunk::monthly("TX");
        let reciprocity = ReciprocityChunk::standard("TX");

        // Texas jurisdictions (sample)
        let mut jurisdictions = JurisdictionChunk::new("TX", 0.0625);
        jurisdictions.add_jurisdiction(JurisdictionEntry {
            code: "TX_DALLAS".to_string(),
            name: "Dallas".to_string(),
            jurisdiction_type: JurisdictionType::City,
            rate: 0.02,
            parent_code: Some("TX_DALLAS_CO".to_string()),
            fips_code: Some("48113".to_string()),
        });
        jurisdictions.add_jurisdiction(JurisdictionEntry {
            code: "TX_HOUSTON".to_string(),
            name: "Houston".to_string(),
            jurisdiction_type: JurisdictionType::City,
            rate: 0.02,
            parent_code: Some("TX_HARRIS_CO".to_string()),
            fips_code: Some("48201".to_string()),
        });

        Self {
            state_code: "TX".to_string(),
            version: "2.0.0".to_string(),
            effective_date: "2025-01-01".to_string(),
            trade_in,
            rebates,
            fees,
            lease,
            reciprocity,
            jurisdictions: Some(jurisdictions),
        }
    }

    /// Create California rules (no reciprocity)
    pub fn california() -> Self {
        let trade_in = TradeInChunk::full("CA");
        let rebates = RebateChunk::standard("CA");

        let mut fees = FeeChunk::standard("CA");
        // CA has doc fee cap
        fees.rules.get_mut(&FeeCode::DocFee).unwrap().cap_amount = Some(85.0);

        let lease = LeaseChunk::upfront("CA");
        let reciprocity = ReciprocityChunk::none("CA");

        // California jurisdictions (sample)
        let mut jurisdictions = JurisdictionChunk::new("CA", 0.0725);
        jurisdictions.add_jurisdiction(JurisdictionEntry {
            code: "CA_LOS_ANGELES".to_string(),
            name: "Los Angeles".to_string(),
            jurisdiction_type: JurisdictionType::City,
            rate: 0.0225,
            parent_code: Some("CA_LA_CO".to_string()),
            fips_code: Some("06037".to_string()),
        });
        jurisdictions.add_jurisdiction(JurisdictionEntry {
            code: "CA_SAN_FRANCISCO".to_string(),
            name: "San Francisco".to_string(),
            jurisdiction_type: JurisdictionType::City,
            rate: 0.0125,
            parent_code: Some("CA_SF_CO".to_string()),
            fips_code: Some("06075".to_string()),
        });

        Self {
            state_code: "CA".to_string(),
            version: "2.0.0".to_string(),
            effective_date: "2025-01-01".to_string(),
            trade_in,
            rebates,
            fees,
            lease,
            reciprocity,
            jurisdictions: Some(jurisdictions),
        }
    }
}

// ============================================================================
// CHUNK REGISTRY
// ============================================================================

/// Registry of composed state rules
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ChunkRegistry {
    pub states: HashMap<String, ComposedStateRule>,
    pub version: String,
    pub last_updated: String,
}

impl ChunkRegistry {
    /// Create a new empty registry
    pub fn new() -> Self {
        Self {
            states: HashMap::new(),
            version: "1.0.0".to_string(),
            last_updated: "2025-01-01".to_string(),
        }
    }

    /// Load default registry with common states
    pub fn load_default() -> Self {
        let mut registry = Self::new();

        registry.add_state(ComposedStateRule::indiana());
        registry.add_state(ComposedStateRule::texas());
        registry.add_state(ComposedStateRule::california());

        registry
    }

    /// Add a state rule
    pub fn add_state(&mut self, rule: ComposedStateRule) {
        self.states.insert(rule.state_code.clone(), rule);
    }

    /// Get a state rule
    pub fn get_state(&self, state_code: &str) -> Option<&ComposedStateRule> {
        self.states.get(&state_code.to_uppercase())
    }

    /// List all state codes
    pub fn state_codes(&self) -> Vec<&String> {
        self.states.keys().collect()
    }
}

// ============================================================================
// TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_trade_in_full_credit() {
        let chunk = TradeInChunk::full("IN");
        assert_eq!(chunk.calculate_credit(10000.0), 10000.0);
    }

    #[test]
    fn test_trade_in_no_credit() {
        let chunk = TradeInChunk::none("IL");
        assert_eq!(chunk.calculate_credit(10000.0), 0.0);
    }

    #[test]
    fn test_trade_in_capped() {
        let chunk = TradeInChunk::capped("VA", 20000.0);
        assert_eq!(chunk.calculate_credit(10000.0), 10000.0);
        assert_eq!(chunk.calculate_credit(25000.0), 20000.0);
    }

    #[test]
    fn test_trade_in_percent() {
        let chunk = TradeInChunk::percent("XX", 80.0);
        assert_eq!(chunk.calculate_credit(10000.0), 8000.0);
    }

    #[test]
    fn test_rebate_taxability() {
        let chunk = RebateChunk::standard("IN");
        assert!(!chunk.is_taxable(RebateType::Manufacturer));
        assert!(chunk.is_taxable(RebateType::Dealer));
    }

    #[test]
    fn test_fee_taxability() {
        let chunk = FeeChunk::standard("IN");
        assert!(chunk.is_taxable(FeeCode::DocFee));
        assert!(!chunk.is_taxable(FeeCode::TitleFee));
    }

    #[test]
    fn test_composed_indiana() {
        let rule = ComposedStateRule::indiana();
        assert_eq!(rule.state_code, "IN");
        assert_eq!(rule.trade_in.policy_type, TradeInPolicyType::Full);
        assert!(rule.reciprocity.enabled);
        assert!(rule.reciprocity.non_reciprocal_states.contains(&"AL".to_string()));
    }

    #[test]
    fn test_composed_california() {
        let rule = ComposedStateRule::california();
        assert_eq!(rule.state_code, "CA");
        assert!(!rule.reciprocity.enabled);
        assert_eq!(rule.lease.method, LeaseTaxMethod::FullUpfront);
    }

    #[test]
    fn test_chunk_registry() {
        let registry = ChunkRegistry::load_default();

        let in_rule = registry.get_state("IN").unwrap();
        assert_eq!(in_rule.state_code, "IN");

        let ca_rule = registry.get_state("CA").unwrap();
        assert!(!ca_rule.reciprocity.enabled);
    }

    #[test]
    fn test_jurisdiction_rates() {
        let rule = ComposedStateRule::texas();
        let jurisdictions = rule.jurisdictions.as_ref().unwrap();

        let dallas_rate = jurisdictions.get_combined_rate("TX_DALLAS").unwrap();
        assert!((dallas_rate - 0.0825).abs() < 0.0001); // 6.25% + 2%
    }

    #[test]
    fn test_chunk_meta_effective() {
        let meta = ChunkMeta {
            id: "test".to_string(),
            version: "1.0.0".to_string(),
            effective_date: "2025-01-01".to_string(),
            expiry_date: Some("2025-12-31".to_string()),
            citation: None,
            notes: None,
            tags: vec![],
        };

        assert!(meta.is_effective("2025-06-15"));
        assert!(!meta.is_effective("2024-12-31"));
        assert!(!meta.is_effective("2026-01-01"));
    }
}
