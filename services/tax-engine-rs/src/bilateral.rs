//! Bilateral Reciprocity Matrix - Entangled State Pair Resolution
//!
//! Implements the R(H, T, G, deal_type) → ReciprocityRegime function
//! using a pre-computed 51×51 bilateral matrix with O(1) lookup.
//!
//! # Entanglement Model
//!
//! State pairs are "entangled" - querying one direction provides
//! information about both directions simultaneously. This models
//! the real-world asymmetry where TX→CA may differ from CA→TX.
//!
//! # Four Canonical Regimes
//!
//! | Regime          | Credit Formula                   | Total Burden Ω              |
//! |-----------------|----------------------------------|-----------------------------|
//! | FULL_CREDIT     | min(tax_T_raw, tax_H_raw)        | max(tax_T_raw, tax_H_raw)   |
//! | PARTIAL_CREDIT  | min(tax_T_raw, κ·tax_H_raw)      | tax_T_raw + tax_H_raw - credit |
//! | IN_LIEU         | r_H·B_T (T collects at H's rate) | ≈ tax_H_raw                 |
//! | NO_CREDIT       | 0                                | tax_T_raw + tax_H_raw       |
//!
//! # Usage
//!
//! ```rust
//! use tax_engine_rs::bilateral::{BilateralMatrix, resolve_reciprocity, DealTypeRecip};
//!
//! let matrix = BilateralMatrix::load_default();
//! let (regime, kappa) = resolve_reciprocity(
//!     &matrix,
//!     "CA",  // Home state
//!     "TX",  // Transaction state
//!     "CA",  // Garaging state
//!     DealTypeRecip::Retail,
//! );
//! ```

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ============================================================================
// RECIPROCITY REGIMES
// ============================================================================

/// The four canonical reciprocity regimes
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ReciprocityRegime {
    /// Full dollar-for-dollar credit up to home state's liability
    /// credit = min(tax_T_raw, tax_H_raw)
    /// Ω = max(tax_T_raw, tax_H_raw)
    FullCredit,

    /// Partial credit with cap factor κ ∈ (0, 1)
    /// credit = min(tax_T_raw, κ · tax_H_raw)
    /// Ω = tax_T_raw + tax_H_raw - credit
    PartialCredit,

    /// Transaction state collects at home state's rate
    /// tax_collected_T = r_H · B_T
    /// Ω ≈ tax_H_raw
    InLieu,

    /// No reciprocity - potentially double taxation
    /// credit = 0
    /// Ω = tax_T_raw + tax_H_raw
    NoCredit,
}

impl Default for ReciprocityRegime {
    fn default() -> Self {
        ReciprocityRegime::NoCredit
    }
}

// ============================================================================
// BILATERAL ENTRY
// ============================================================================

/// A single entry in the bilateral matrix
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BilateralEntry {
    /// Origin state (where tax was paid)
    pub origin: String,

    /// Destination state (where registering/home state)
    pub destination: String,

    /// The reciprocity regime for this pair
    pub regime: ReciprocityRegime,

    /// Kappa factor for PARTIAL_CREDIT (0.0-1.0)
    /// For FULL_CREDIT: κ = 1.0
    /// For NO_CREDIT: κ = 0.0
    #[serde(default = "default_kappa")]
    pub kappa: f64,

    /// Whether credit is allowed at all
    #[serde(default = "default_true")]
    pub allows_credit: bool,

    /// Requires proof of tax paid
    #[serde(default)]
    pub require_proof: bool,

    /// Time window in days (e.g., NC 90-day rule)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub time_window_days: Option<u32>,

    /// Requires mutual credit (PA rule)
    #[serde(default)]
    pub requires_mutual: bool,

    /// Notes/documentation
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,

    /// Legal citation
    #[serde(skip_serializing_if = "Option::is_none")]
    pub citation: Option<String>,
}

fn default_kappa() -> f64 {
    1.0
}

fn default_true() -> bool {
    true
}

impl Default for BilateralEntry {
    fn default() -> Self {
        Self {
            origin: String::new(),
            destination: String::new(),
            regime: ReciprocityRegime::NoCredit,
            kappa: 0.0,
            allows_credit: false,
            require_proof: false,
            time_window_days: None,
            requires_mutual: false,
            notes: None,
            citation: None,
        }
    }
}

// ============================================================================
// ENTANGLED PAIR
// ============================================================================

/// An entangled pair - querying returns both directions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntangledPair {
    /// State A
    pub state_a: String,

    /// State B
    pub state_b: String,

    /// A → B entry
    pub a_to_b: BilateralEntry,

    /// B → A entry
    pub b_to_a: BilateralEntry,

    /// Whether the pair is symmetric
    pub is_symmetric: bool,
}

impl EntangledPair {
    /// Create a new entangled pair
    pub fn new(a_to_b: BilateralEntry, b_to_a: BilateralEntry) -> Self {
        let is_symmetric = a_to_b.regime == b_to_a.regime &&
                          (a_to_b.kappa - b_to_a.kappa).abs() < 0.0001;

        Self {
            state_a: a_to_b.origin.clone(),
            state_b: a_to_b.destination.clone(),
            a_to_b,
            b_to_a,
            is_symmetric,
        }
    }

    /// Get the entry for a specific direction
    pub fn get_direction(&self, from: &str, to: &str) -> Option<&BilateralEntry> {
        if from == self.state_a && to == self.state_b {
            Some(&self.a_to_b)
        } else if from == self.state_b && to == self.state_a {
            Some(&self.b_to_a)
        } else {
            None
        }
    }
}

// ============================================================================
// BILATERAL MATRIX
// ============================================================================

/// The 51×51 bilateral reciprocity matrix
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BilateralMatrix {
    /// Version of the matrix
    pub version: u32,

    /// Last updated date (ISO 8601)
    pub last_updated: String,

    /// Matrix entries keyed by "ORIGIN:DESTINATION"
    entries: HashMap<String, BilateralEntry>,

    /// Default entries by state (for wildcard matching)
    state_defaults: HashMap<String, BilateralEntry>,

    /// States with no reciprocity at all
    no_reciprocity_states: Vec<String>,

    /// Non-reciprocal state lists (e.g., IN's list)
    non_reciprocal_lists: HashMap<String, Vec<String>>,
}

impl BilateralMatrix {
    /// Create a new empty matrix
    pub fn new() -> Self {
        Self {
            version: 1,
            last_updated: chrono_lite_now(),
            entries: HashMap::new(),
            state_defaults: HashMap::new(),
            no_reciprocity_states: vec!["CA".to_string()], // CA has no reciprocity
            non_reciprocal_lists: HashMap::new(),
        }
    }

    /// Load the default matrix with all 50 states + DC
    pub fn load_default() -> Self {
        let mut matrix = Self::new();
        matrix.populate_defaults();
        matrix
    }

    /// Get matrix key for a state pair
    fn key(origin: &str, destination: &str) -> String {
        format!("{}:{}", origin.to_uppercase(), destination.to_uppercase())
    }

    /// Insert an entry into the matrix
    pub fn insert(&mut self, entry: BilateralEntry) {
        let key = Self::key(&entry.origin, &entry.destination);
        self.entries.insert(key, entry);
    }

    /// Set a state's default reciprocity behavior
    pub fn set_state_default(&mut self, state: &str, entry: BilateralEntry) {
        self.state_defaults.insert(state.to_uppercase(), entry);
    }

    /// Add a non-reciprocal list for a state
    pub fn set_non_reciprocal_list(&mut self, state: &str, non_recip_states: Vec<String>) {
        self.non_reciprocal_lists.insert(
            state.to_uppercase(),
            non_recip_states.into_iter().map(|s| s.to_uppercase()).collect(),
        );
    }

    /// Look up a specific pair
    pub fn lookup(&self, origin: &str, destination: &str) -> BilateralEntry {
        let origin = origin.to_uppercase();
        let destination = destination.to_uppercase();

        // Same state = trivial full credit
        if origin == destination {
            return BilateralEntry {
                origin: origin.clone(),
                destination: destination.clone(),
                regime: ReciprocityRegime::FullCredit,
                kappa: 1.0,
                allows_credit: true,
                require_proof: false,
                time_window_days: None,
                requires_mutual: false,
                notes: Some("Same state - trivial case".to_string()),
                citation: None,
            };
        }

        // Check if destination is a no-reciprocity state
        if self.no_reciprocity_states.contains(&destination) {
            return BilateralEntry {
                origin: origin.clone(),
                destination: destination.clone(),
                regime: ReciprocityRegime::NoCredit,
                kappa: 0.0,
                allows_credit: false,
                require_proof: false,
                time_window_days: None,
                requires_mutual: false,
                notes: Some(format!("{} does not provide reciprocity", destination)),
                citation: None,
            };
        }

        // Check non-reciprocal lists
        if let Some(non_recip) = self.non_reciprocal_lists.get(&destination) {
            if non_recip.contains(&origin) {
                return BilateralEntry {
                    origin: origin.clone(),
                    destination: destination.clone(),
                    regime: ReciprocityRegime::NoCredit,
                    kappa: 0.0,
                    allows_credit: false,
                    require_proof: false,
                    time_window_days: None,
                    requires_mutual: false,
                    notes: Some(format!("{} is on {}'s non-reciprocal list", origin, destination)),
                    citation: None,
                };
            }
        }

        // Check explicit entry
        let key = Self::key(&origin, &destination);
        if let Some(entry) = self.entries.get(&key) {
            return entry.clone();
        }

        // Fall back to destination state's default
        if let Some(default) = self.state_defaults.get(&destination) {
            let mut entry = default.clone();
            entry.origin = origin;
            entry.destination = destination;
            return entry;
        }

        // Ultimate fallback: no credit
        BilateralEntry {
            origin,
            destination,
            regime: ReciprocityRegime::NoCredit,
            kappa: 0.0,
            allows_credit: false,
            ..Default::default()
        }
    }

    /// Get an entangled pair (both directions)
    pub fn lookup_entangled(&self, state_a: &str, state_b: &str) -> EntangledPair {
        let a_to_b = self.lookup(state_a, state_b);
        let b_to_a = self.lookup(state_b, state_a);
        EntangledPair::new(a_to_b, b_to_a)
    }

    /// Populate the matrix with default state configurations
    fn populate_defaults(&mut self) {
        // States with NO reciprocity
        self.no_reciprocity_states = vec![
            "CA".to_string(), // California - no reciprocity
        ];

        // Indiana's non-reciprocal list
        self.set_non_reciprocal_list("IN", vec![
            "AL", "CT", "HI", "LA", "MA", "MS", "NV", "SC",
        ].into_iter().map(String::from).collect());

        // Set state defaults
        self.populate_state_defaults();

        // Set specific pair overrides
        self.populate_pair_overrides();
    }

    fn populate_state_defaults(&mut self) {
        // Most states: CREDIT_UP_TO_STATE_RATE (equivalent to FULL_CREDIT with cap)
        let standard_states = vec![
            "AL", "AK", "AZ", "AR", "CO", "CT", "DE", "FL", "GA", "HI",
            "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA",
            "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM",
            "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD",
            "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
        ];

        for state in standard_states {
            self.set_state_default(state, BilateralEntry {
                origin: "*".to_string(),
                destination: state.to_string(),
                regime: ReciprocityRegime::FullCredit,
                kappa: 1.0,
                allows_credit: true,
                require_proof: true,
                time_window_days: None,
                requires_mutual: false,
                notes: Some(format!("{} provides credit up to state rate", state)),
                citation: None,
            });
        }

        // North Carolina: 90-day time window
        self.set_state_default("NC", BilateralEntry {
            origin: "*".to_string(),
            destination: "NC".to_string(),
            regime: ReciprocityRegime::FullCredit,
            kappa: 1.0,
            allows_credit: true,
            require_proof: true,
            time_window_days: Some(90),
            requires_mutual: false,
            notes: Some("NC HUT reciprocity with 90-day window".to_string()),
            citation: Some("North Carolina Department of Revenue".to_string()),
        });

        // Pennsylvania: requires mutual credit
        self.set_state_default("PA", BilateralEntry {
            origin: "*".to_string(),
            destination: "PA".to_string(),
            regime: ReciprocityRegime::FullCredit,
            kappa: 1.0,
            allows_credit: true,
            require_proof: true,
            time_window_days: None,
            requires_mutual: true,
            notes: Some("PA requires mutual credit".to_string()),
            citation: Some("Pennsylvania Department of Revenue".to_string()),
        });
    }

    fn populate_pair_overrides(&mut self) {
        // Florida ↔ Oklahoma asymmetric pair
        self.insert(BilateralEntry {
            origin: "FL".to_string(),
            destination: "OK".to_string(),
            regime: ReciprocityRegime::FullCredit,
            kappa: 1.0,
            allows_credit: true,
            require_proof: true,
            time_window_days: None,
            requires_mutual: false,
            notes: Some("FL allows credit for OK tax (asymmetric)".to_string()),
            citation: Some("Florida Statutes Chapter 212".to_string()),
        });

        self.insert(BilateralEntry {
            origin: "OK".to_string(),
            destination: "FL".to_string(),
            regime: ReciprocityRegime::NoCredit,
            kappa: 0.0,
            allows_credit: false,
            require_proof: false,
            time_window_days: None,
            requires_mutual: false,
            notes: Some("OK does NOT reciprocate to FL (asymmetric)".to_string()),
            citation: Some("Oklahoma Tax Commission".to_string()),
        });

        // Georgia TAVT - limited reciprocity
        self.set_state_default("GA", BilateralEntry {
            origin: "*".to_string(),
            destination: "GA".to_string(),
            regime: ReciprocityRegime::FullCredit,
            kappa: 1.0,
            allows_credit: true,
            require_proof: true,
            time_window_days: None,
            requires_mutual: false,
            notes: Some("GA TAVT provides limited reciprocity, capped at GA rate".to_string()),
            citation: Some("Georgia Code Title 48, Chapter 5C".to_string()),
        });
    }

    /// Get all entries as a vector (for serialization)
    pub fn all_entries(&self) -> Vec<&BilateralEntry> {
        self.entries.values().collect()
    }

    /// Get statistics about the matrix
    pub fn stats(&self) -> MatrixStats {
        let mut full_credit = 0;
        let mut partial_credit = 0;
        let mut in_lieu = 0;
        let mut no_credit = 0;

        for entry in self.entries.values() {
            match entry.regime {
                ReciprocityRegime::FullCredit => full_credit += 1,
                ReciprocityRegime::PartialCredit => partial_credit += 1,
                ReciprocityRegime::InLieu => in_lieu += 1,
                ReciprocityRegime::NoCredit => no_credit += 1,
            }
        }

        MatrixStats {
            total_entries: self.entries.len(),
            explicit_entries: self.entries.len(),
            state_defaults: self.state_defaults.len(),
            no_reciprocity_states: self.no_reciprocity_states.len(),
            full_credit_count: full_credit,
            partial_credit_count: partial_credit,
            in_lieu_count: in_lieu,
            no_credit_count: no_credit,
        }
    }
}

impl Default for BilateralMatrix {
    fn default() -> Self {
        Self::load_default()
    }
}

/// Statistics about the bilateral matrix
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatrixStats {
    pub total_entries: usize,
    pub explicit_entries: usize,
    pub state_defaults: usize,
    pub no_reciprocity_states: usize,
    pub full_credit_count: usize,
    pub partial_credit_count: usize,
    pub in_lieu_count: usize,
    pub no_credit_count: usize,
}

// ============================================================================
// RECIPROCITY RESOLUTION - R(H, T, G, deal_type)
// ============================================================================

/// Deal type for reciprocity resolution
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DealTypeRecip {
    Retail,
    Lease,
}

/// Configuration for lease garaging rules
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeaseGaragingConfig {
    /// Whether this state uses garaging state for lease reciprocity
    pub uses_garaging_state: bool,
}

impl Default for LeaseGaragingConfig {
    fn default() -> Self {
        Self {
            uses_garaging_state: false,
        }
    }
}

/// Resolve reciprocity for a deal
///
/// R(H, T, G, deal_type) → (ReciprocityRegime, κ)
///
/// # Arguments
/// * `matrix` - The bilateral matrix
/// * `home_state` - H: Where vehicle will be titled/registered
/// * `transaction_state` - T: Where deal closes (dealer location)
/// * `garaging_state` - G: Where vehicle will be primarily kept (leases)
/// * `deal_type` - Retail or Lease
///
/// # Returns
/// Tuple of (regime, kappa factor)
pub fn resolve_reciprocity(
    matrix: &BilateralMatrix,
    home_state: &str,
    transaction_state: &str,
    garaging_state: &str,
    deal_type: DealTypeRecip,
) -> (ReciprocityRegime, f64) {
    let h = home_state.to_uppercase();
    let t = transaction_state.to_uppercase();
    let g = garaging_state.to_uppercase();

    // Gate 0: Same-state transaction (trivial case)
    if h == t {
        return (ReciprocityRegime::FullCredit, 1.0);
    }

    // Gate 1: Lease garaging override
    let effective_h = if deal_type == DealTypeRecip::Lease {
        // Check if home state uses garaging state for lease reciprocity
        let garaging_config = get_lease_garaging_config(&h);
        if garaging_config.uses_garaging_state && g != h {
            g.clone()
        } else {
            h.clone()
        }
    } else {
        h.clone()
    };

    // Gate 2: Matrix lookup
    let entry = matrix.lookup(&t, &effective_h);

    // Gate 3: Return regime and kappa
    (entry.regime, entry.kappa)
}

/// Get lease garaging configuration for a state
fn get_lease_garaging_config(state: &str) -> LeaseGaragingConfig {
    // Most states don't use garaging state for reciprocity
    // This can be expanded based on state-specific rules
    match state.to_uppercase().as_str() {
        // Add states that use garaging state here
        _ => LeaseGaragingConfig::default(),
    }
}

// ============================================================================
// CREDIT CALCULATION
// ============================================================================

/// Stage 1 output: Base computation results
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Stage1Output {
    /// Taxable base in transaction state
    pub b_t: f64,
    /// Taxable base in home state
    pub b_h: f64,
    /// Transaction state rate
    pub r_t: f64,
    /// Home state rate
    pub r_h: f64,
    /// Theoretical max tax in T
    pub tax_t_raw: f64,
    /// Theoretical max tax in H
    pub tax_h_raw: f64,
}

/// Stage 2 output: Reciprocity resolution results
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Stage2Output {
    /// The resolved regime
    pub regime: ReciprocityRegime,
    /// Kappa factor
    pub kappa: f64,
    /// Actually collected in transaction state
    pub tax_collected_t: f64,
    /// Credit applied against home state liability
    pub credit_applied_h: f64,
    /// Remaining due to home state
    pub tax_due_h: f64,
    /// Total tax burden (Ω)
    pub total_burden: f64,
}

/// Calculate credit based on regime
///
/// Applies the explicit formulas from the specification:
///
/// | Regime          | Credit Formula                   | Total Burden Ω              |
/// |-----------------|----------------------------------|-----------------------------|
/// | FULL_CREDIT     | min(tax_T_raw, tax_H_raw)        | max(tax_T_raw, tax_H_raw)   |
/// | PARTIAL_CREDIT  | min(tax_T_raw, κ·tax_H_raw)      | tax_T_raw + tax_H_raw - credit |
/// | IN_LIEU         | r_H·B_T (T collects at H's rate) | ≈ tax_H_raw                 |
/// | NO_CREDIT       | 0                                | tax_T_raw + tax_H_raw       |
pub fn calculate_reciprocity_credit(
    stage1: &Stage1Output,
    regime: ReciprocityRegime,
    kappa: f64,
) -> Stage2Output {
    let tax_t_raw = stage1.tax_t_raw;
    let tax_h_raw = stage1.tax_h_raw;

    match regime {
        ReciprocityRegime::FullCredit => {
            // Full dollar-for-dollar credit
            // τ_T = tax_T_raw
            // τ_H = max(0, tax_H_raw - tax_T_raw)
            // Ω = max(tax_T_raw, tax_H_raw)
            let tax_collected_t = tax_t_raw;
            let credit_applied_h = tax_t_raw.min(tax_h_raw);
            let tax_due_h = (tax_h_raw - credit_applied_h).max(0.0);
            let total_burden = tax_t_raw.max(tax_h_raw);

            Stage2Output {
                regime,
                kappa: 1.0,
                tax_collected_t,
                credit_applied_h,
                tax_due_h,
                total_burden,
            }
        }

        ReciprocityRegime::PartialCredit => {
            // Capped credit: credit = min(tax_paid_T, κ · tax_H_raw)
            // τ_T = tax_T_raw
            // τ_H = tax_H_raw - min(tax_T_raw, κ · tax_H_raw)
            // Ω = tax_T_raw + τ_H
            let tax_collected_t = tax_t_raw;
            let max_credit = kappa * tax_h_raw;
            let credit_applied_h = tax_t_raw.min(max_credit);
            let tax_due_h = tax_h_raw - credit_applied_h;
            let total_burden = tax_collected_t + tax_due_h;

            Stage2Output {
                regime,
                kappa,
                tax_collected_t,
                credit_applied_h,
                tax_due_h,
                total_burden,
            }
        }

        ReciprocityRegime::InLieu => {
            // T collects at H's rate, H gives full credit
            // τ_T = r_H · B_T (collected at H's rate)
            // τ_H = max(0, tax_H_raw - τ_T)
            // Ω ≈ tax_H_raw
            let tax_collected_t = stage1.r_h * stage1.b_t; // H's rate, T's base
            let credit_applied_h = tax_collected_t;
            let tax_due_h = (tax_h_raw - credit_applied_h).max(0.0);
            let total_burden = tax_collected_t + tax_due_h;

            Stage2Output {
                regime,
                kappa: 1.0,
                tax_collected_t,
                credit_applied_h,
                tax_due_h,
                total_burden,
            }
        }

        ReciprocityRegime::NoCredit => {
            // No reciprocity - potentially double taxation
            // In practice, T often exempts; model worst case
            // τ_T = tax_T_raw (or 0 if T exempts out-of-state)
            // τ_H = tax_H_raw
            // Ω = τ_T + τ_H
            let tax_collected_t = tax_t_raw;
            let credit_applied_h = 0.0;
            let tax_due_h = tax_h_raw;
            let total_burden = tax_collected_t + tax_due_h;

            Stage2Output {
                regime,
                kappa: 0.0,
                tax_collected_t,
                credit_applied_h,
                tax_due_h,
                total_burden,
            }
        }
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/// Simple date function (avoid chrono dependency for WASM size)
fn chrono_lite_now() -> String {
    "2025-01-01".to_string() // Placeholder - in production, use actual date
}

// ============================================================================
// TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_same_state_full_credit() {
        let matrix = BilateralMatrix::load_default();
        let (regime, kappa) = resolve_reciprocity(
            &matrix,
            "TX", "TX", "TX",
            DealTypeRecip::Retail,
        );
        assert_eq!(regime, ReciprocityRegime::FullCredit);
        assert_eq!(kappa, 1.0);
    }

    #[test]
    fn test_california_no_reciprocity() {
        let matrix = BilateralMatrix::load_default();
        let (regime, kappa) = resolve_reciprocity(
            &matrix,
            "CA", "TX", "CA",
            DealTypeRecip::Retail,
        );
        assert_eq!(regime, ReciprocityRegime::NoCredit);
        assert_eq!(kappa, 0.0);
    }

    #[test]
    fn test_texas_gives_credit() {
        let matrix = BilateralMatrix::load_default();
        let (regime, kappa) = resolve_reciprocity(
            &matrix,
            "TX", "FL", "TX",
            DealTypeRecip::Retail,
        );
        assert_eq!(regime, ReciprocityRegime::FullCredit);
        assert_eq!(kappa, 1.0);
    }

    #[test]
    fn test_indiana_non_reciprocal_list() {
        let matrix = BilateralMatrix::load_default();

        // Alabama is on Indiana's non-reciprocal list
        let (regime, _) = resolve_reciprocity(
            &matrix,
            "IN", "AL", "IN",
            DealTypeRecip::Retail,
        );
        assert_eq!(regime, ReciprocityRegime::NoCredit);

        // Ohio is NOT on the list, should get credit
        let (regime, _) = resolve_reciprocity(
            &matrix,
            "IN", "OH", "IN",
            DealTypeRecip::Retail,
        );
        assert_eq!(regime, ReciprocityRegime::FullCredit);
    }

    #[test]
    fn test_asymmetric_fl_ok() {
        let matrix = BilateralMatrix::load_default();

        // FL → OK: OK gives credit to FL
        let entry_ok = matrix.lookup("FL", "OK");
        assert_eq!(entry_ok.regime, ReciprocityRegime::FullCredit);

        // OK → FL: FL does NOT give credit to OK
        let entry_fl = matrix.lookup("OK", "FL");
        assert_eq!(entry_fl.regime, ReciprocityRegime::NoCredit);
    }

    #[test]
    fn test_entangled_pair() {
        let matrix = BilateralMatrix::load_default();
        let pair = matrix.lookup_entangled("FL", "OK");

        assert!(!pair.is_symmetric);
        assert_eq!(pair.a_to_b.regime, ReciprocityRegime::FullCredit);
        assert_eq!(pair.b_to_a.regime, ReciprocityRegime::NoCredit);
    }

    #[test]
    fn test_full_credit_calculation() {
        let stage1 = Stage1Output {
            b_t: 30000.0,
            b_h: 30000.0,
            r_t: 0.0625, // TX rate
            r_h: 0.07,   // IN rate
            tax_t_raw: 1875.0,
            tax_h_raw: 2100.0,
        };

        let result = calculate_reciprocity_credit(
            &stage1,
            ReciprocityRegime::FullCredit,
            1.0,
        );

        // Credit should be min(1875, 2100) = 1875
        assert_eq!(result.credit_applied_h, 1875.0);
        // Tax due H should be 2100 - 1875 = 225
        assert_eq!(result.tax_due_h, 225.0);
        // Total burden should be max(1875, 2100) = 2100
        assert_eq!(result.total_burden, 2100.0);
    }

    #[test]
    fn test_partial_credit_calculation() {
        let stage1 = Stage1Output {
            b_t: 30000.0,
            b_h: 30000.0,
            r_t: 0.0625,
            r_h: 0.07,
            tax_t_raw: 1875.0,
            tax_h_raw: 2100.0,
        };

        // κ = 0.8 means max credit is 80% of home state tax
        let result = calculate_reciprocity_credit(
            &stage1,
            ReciprocityRegime::PartialCredit,
            0.8,
        );

        // Max credit = 0.8 * 2100 = 1680
        // Credit = min(1875, 1680) = 1680
        assert_eq!(result.credit_applied_h, 1680.0);
        // Tax due H = 2100 - 1680 = 420
        assert_eq!(result.tax_due_h, 420.0);
        // Total burden = 1875 + 420 = 2295
        assert_eq!(result.total_burden, 2295.0);
    }

    #[test]
    fn test_no_credit_calculation() {
        let stage1 = Stage1Output {
            b_t: 30000.0,
            b_h: 30000.0,
            r_t: 0.0625,
            r_h: 0.07,
            tax_t_raw: 1875.0,
            tax_h_raw: 2100.0,
        };

        let result = calculate_reciprocity_credit(
            &stage1,
            ReciprocityRegime::NoCredit,
            0.0,
        );

        // No credit
        assert_eq!(result.credit_applied_h, 0.0);
        // Full tax due in both states
        assert_eq!(result.tax_due_h, 2100.0);
        // Total burden = 1875 + 2100 = 3975 (double taxation)
        assert_eq!(result.total_burden, 3975.0);
    }
}
