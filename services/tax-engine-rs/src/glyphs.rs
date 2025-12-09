//! Glyph Encoding/Decoding System
//!
//! Compact symbolic representation of tax rules for human readability
//! and efficient storage. Glyphs provide a visual DSL for tax configurations.
//!
//! # Glyph Schema
//!
//! ## State Rule Glyphs
//! | Symbol | Code | Meaning                    |
//! |--------|------|----------------------------|
//! | ◆      | F    | FULL trade-in credit       |
//! | ◇      | N    | NO trade-in credit         |
//! | ◈      | C    | CAPPED trade-in credit     |
//! | ◊      | P    | PERCENT trade-in credit    |
//! | ●      | T    | Taxable                    |
//! | ○      | X    | Not taxable                |
//! | ▲      | U    | Upfront tax (lease)        |
//! | ▼      | M    | Monthly tax (lease)        |
//! | ◀▶     | H    | Hybrid tax (lease)         |
//! | ★      | R+   | Reciprocity enabled        |
//! | ☆      | R-   | No reciprocity             |
//!
//! ## Reciprocity Pair Glyphs
//! | Symbol | Code | Meaning                    |
//! |--------|------|----------------------------|
//! | ⟷      | FULL | Full credit both ways      |
//! | →      | ASYM | Asymmetric (check dir)     |
//! | ⊗      | NONE | No reciprocity             |
//! | ⟶κ     | PART | Partial credit with kappa  |
//! | ⟿      | LIEU | In-lieu collection         |
//!
//! # Examples
//!
//! ```text
//! State Glyph: IN_v3 = ◆●○○▼★
//! Meaning: Full trade, doc taxable, VSC not, GAP not, monthly lease, recip enabled
//!
//! Pair Glyph: TX⟷FL|CA⊗*
//! Meaning: TX↔FL full reciprocity, CA no reciprocity with anyone
//! ```

use serde::{Deserialize, Serialize};
use std::fmt;

use crate::bilateral::ReciprocityRegime;

// ============================================================================
// TRADE-IN GLYPH
// ============================================================================

/// Trade-in policy glyph
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TradeInGlyph {
    /// ◆ Full trade-in credit
    Full,
    /// ◇ No trade-in credit
    None,
    /// ◈ Capped trade-in credit
    Capped,
    /// ◊ Percent trade-in credit
    Percent,
}

impl TradeInGlyph {
    pub fn symbol(&self) -> char {
        match self {
            TradeInGlyph::Full => '◆',
            TradeInGlyph::None => '◇',
            TradeInGlyph::Capped => '◈',
            TradeInGlyph::Percent => '◊',
        }
    }

    pub fn code(&self) -> char {
        match self {
            TradeInGlyph::Full => 'F',
            TradeInGlyph::None => 'N',
            TradeInGlyph::Capped => 'C',
            TradeInGlyph::Percent => 'P',
        }
    }

    pub fn from_symbol(c: char) -> Option<Self> {
        match c {
            '◆' | 'F' => Some(TradeInGlyph::Full),
            '◇' | 'N' => Some(TradeInGlyph::None),
            '◈' | 'C' => Some(TradeInGlyph::Capped),
            '◊' | 'P' => Some(TradeInGlyph::Percent),
            _ => None,
        }
    }
}

impl fmt::Display for TradeInGlyph {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.symbol())
    }
}

// ============================================================================
// TAXABILITY GLYPH
// ============================================================================

/// Taxability glyph (for doc fee, VSC, GAP, etc.)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TaxableGlyph {
    /// ● Taxable
    Taxable,
    /// ○ Not taxable
    NotTaxable,
}

impl TaxableGlyph {
    pub fn symbol(&self) -> char {
        match self {
            TaxableGlyph::Taxable => '●',
            TaxableGlyph::NotTaxable => '○',
        }
    }

    pub fn code(&self) -> char {
        match self {
            TaxableGlyph::Taxable => 'T',
            TaxableGlyph::NotTaxable => 'X',
        }
    }

    pub fn from_symbol(c: char) -> Option<Self> {
        match c {
            '●' | 'T' => Some(TaxableGlyph::Taxable),
            '○' | 'X' => Some(TaxableGlyph::NotTaxable),
            _ => None,
        }
    }

    pub fn from_bool(taxable: bool) -> Self {
        if taxable {
            TaxableGlyph::Taxable
        } else {
            TaxableGlyph::NotTaxable
        }
    }

    pub fn to_bool(&self) -> bool {
        matches!(self, TaxableGlyph::Taxable)
    }
}

impl fmt::Display for TaxableGlyph {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.symbol())
    }
}

// ============================================================================
// LEASE TAX METHOD GLYPH
// ============================================================================

/// Lease tax method glyph
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum LeaseTaxGlyph {
    /// ▲ Upfront tax on cap cost
    Upfront,
    /// ▼ Monthly tax on payments
    Monthly,
    /// ◀▶ Hybrid (some upfront, some monthly)
    Hybrid,
}

impl LeaseTaxGlyph {
    pub fn symbol(&self) -> &'static str {
        match self {
            LeaseTaxGlyph::Upfront => "▲",
            LeaseTaxGlyph::Monthly => "▼",
            LeaseTaxGlyph::Hybrid => "◀▶",
        }
    }

    pub fn code(&self) -> char {
        match self {
            LeaseTaxGlyph::Upfront => 'U',
            LeaseTaxGlyph::Monthly => 'M',
            LeaseTaxGlyph::Hybrid => 'H',
        }
    }

    pub fn from_code(c: char) -> Option<Self> {
        match c {
            'U' => Some(LeaseTaxGlyph::Upfront),
            'M' => Some(LeaseTaxGlyph::Monthly),
            'H' => Some(LeaseTaxGlyph::Hybrid),
            _ => None,
        }
    }

    pub fn from_symbol(c: char) -> Option<Self> {
        match c {
            '▲' | 'U' => Some(LeaseTaxGlyph::Upfront),
            '▼' | 'M' => Some(LeaseTaxGlyph::Monthly),
            '◀' | '▶' | 'H' => Some(LeaseTaxGlyph::Hybrid),
            _ => None,
        }
    }
}

impl fmt::Display for LeaseTaxGlyph {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.symbol())
    }
}

// ============================================================================
// RECIPROCITY GLYPH
// ============================================================================

/// Reciprocity enabled glyph
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ReciprocityGlyph {
    /// ★ Reciprocity enabled
    Enabled,
    /// ☆ No reciprocity
    Disabled,
}

impl ReciprocityGlyph {
    pub fn symbol(&self) -> char {
        match self {
            ReciprocityGlyph::Enabled => '★',
            ReciprocityGlyph::Disabled => '☆',
        }
    }

    pub fn code(&self) -> &'static str {
        match self {
            ReciprocityGlyph::Enabled => "R+",
            ReciprocityGlyph::Disabled => "R-",
        }
    }

    pub fn from_symbol(c: char) -> Option<Self> {
        match c {
            '★' => Some(ReciprocityGlyph::Enabled),
            '☆' => Some(ReciprocityGlyph::Disabled),
            _ => None,
        }
    }

    pub fn from_bool(enabled: bool) -> Self {
        if enabled {
            ReciprocityGlyph::Enabled
        } else {
            ReciprocityGlyph::Disabled
        }
    }
}

impl fmt::Display for ReciprocityGlyph {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.symbol())
    }
}

// ============================================================================
// RECIPROCITY PAIR GLYPH
// ============================================================================

/// Reciprocity pair relationship glyph
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PairGlyph {
    /// ⟷ Full credit both directions
    FullBoth,
    /// → Asymmetric (one direction only)
    Asymmetric,
    /// ⊗ No reciprocity
    None,
    /// ⟶κ Partial credit with kappa factor
    Partial,
    /// ⟿ In-lieu collection
    InLieu,
}

impl PairGlyph {
    pub fn symbol(&self) -> &'static str {
        match self {
            PairGlyph::FullBoth => "⟷",
            PairGlyph::Asymmetric => "→",
            PairGlyph::None => "⊗",
            PairGlyph::Partial => "⟶κ",
            PairGlyph::InLieu => "⟿",
        }
    }

    pub fn code(&self) -> &'static str {
        match self {
            PairGlyph::FullBoth => "FULL",
            PairGlyph::Asymmetric => "ASYM",
            PairGlyph::None => "NONE",
            PairGlyph::Partial => "PART",
            PairGlyph::InLieu => "LIEU",
        }
    }

    pub fn from_regime(regime: ReciprocityRegime) -> Self {
        match regime {
            ReciprocityRegime::FullCredit => PairGlyph::FullBoth,
            ReciprocityRegime::PartialCredit => PairGlyph::Partial,
            ReciprocityRegime::InLieu => PairGlyph::InLieu,
            ReciprocityRegime::NoCredit => PairGlyph::None,
        }
    }
}

impl fmt::Display for PairGlyph {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.symbol())
    }
}

// ============================================================================
// STATE GLYPH - COMPOSITE
// ============================================================================

/// Complete state rule glyph
///
/// Format: `{STATE}_v{VERSION} = {trade}{doc}{vsc}{gap}{lease}{recip}`
///
/// Example: `IN_v3 = ◆●○○▼★`
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateGlyph {
    /// State code (e.g., "IN", "TX")
    pub state_code: String,

    /// Version number
    pub version: u32,

    /// Trade-in policy
    pub trade_in: TradeInGlyph,

    /// Optional cap amount for CAPPED trade-in
    pub trade_in_cap: Option<f64>,

    /// Optional percent for PERCENT trade-in
    pub trade_in_percent: Option<f64>,

    /// Doc fee taxability
    pub doc_fee: TaxableGlyph,

    /// Vehicle Service Contract taxability
    pub vsc: TaxableGlyph,

    /// GAP insurance taxability
    pub gap: TaxableGlyph,

    /// Lease tax method
    pub lease_method: LeaseTaxGlyph,

    /// Reciprocity enabled
    pub reciprocity: ReciprocityGlyph,
}

impl StateGlyph {
    /// Create a new state glyph
    pub fn new(state_code: &str) -> Self {
        Self {
            state_code: state_code.to_uppercase(),
            version: 1,
            trade_in: TradeInGlyph::Full,
            trade_in_cap: None,
            trade_in_percent: None,
            doc_fee: TaxableGlyph::Taxable,
            vsc: TaxableGlyph::Taxable,
            gap: TaxableGlyph::Taxable,
            lease_method: LeaseTaxGlyph::Monthly,
            reciprocity: ReciprocityGlyph::Enabled,
        }
    }

    /// Render as symbolic glyph string
    pub fn to_symbol_string(&self) -> String {
        format!(
            "{}_v{} = {}{}{}{}{}{}",
            self.state_code,
            self.version,
            self.trade_in,
            self.doc_fee,
            self.vsc,
            self.gap,
            self.lease_method,
            self.reciprocity,
        )
    }

    /// Render as ASCII code string
    pub fn to_code_string(&self) -> String {
        let trade_code = match self.trade_in {
            TradeInGlyph::Capped => {
                if let Some(cap) = self.trade_in_cap {
                    format!("C{}", cap)
                } else {
                    "C".to_string()
                }
            }
            TradeInGlyph::Percent => {
                if let Some(pct) = self.trade_in_percent {
                    format!("P{}", pct)
                } else {
                    "P".to_string()
                }
            }
            _ => self.trade_in.code().to_string(),
        };

        format!(
            "{}_v{}:{}{}{}{}{}{}",
            self.state_code,
            self.version,
            trade_code,
            self.doc_fee.code(),
            self.vsc.code(),
            self.gap.code(),
            self.lease_method.code(),
            self.reciprocity.code(),
        )
    }

    /// Parse from symbolic glyph string
    pub fn from_symbol_string(s: &str) -> Option<Self> {
        // Expected format: "IN_v3 = ◆●○○▼★"
        let parts: Vec<&str> = s.split(" = ").collect();
        if parts.len() != 2 {
            return None;
        }

        let header_parts: Vec<&str> = parts[0].split("_v").collect();
        if header_parts.len() != 2 {
            return None;
        }

        let state_code = header_parts[0].to_string();
        let version: u32 = header_parts[1].parse().ok()?;

        let glyphs: Vec<char> = parts[1].chars().collect();
        if glyphs.len() < 6 {
            return None;
        }

        Some(Self {
            state_code,
            version,
            trade_in: TradeInGlyph::from_symbol(glyphs[0])?,
            trade_in_cap: None,
            trade_in_percent: None,
            doc_fee: TaxableGlyph::from_symbol(glyphs[1])?,
            vsc: TaxableGlyph::from_symbol(glyphs[2])?,
            gap: TaxableGlyph::from_symbol(glyphs[3])?,
            lease_method: LeaseTaxGlyph::from_symbol(glyphs[4])?,
            reciprocity: ReciprocityGlyph::from_symbol(glyphs[5])?,
        })
    }
}

impl fmt::Display for StateGlyph {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.to_symbol_string())
    }
}

// ============================================================================
// PAIR GLYPH - COMPOSITE
// ============================================================================

/// Reciprocity pair glyph
///
/// Format: `{STATE_A}{symbol}{STATE_B}[:{kappa}]`
///
/// Examples:
/// - `TX⟷FL` - Full credit both ways
/// - `CA⊗*` - CA no reciprocity with anyone
/// - `TX⟶κ0.8:FL` - TX gives 80% credit to FL
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReciprocityPairGlyph {
    /// State A
    pub state_a: String,

    /// State B (or "*" for all)
    pub state_b: String,

    /// Relationship type
    pub relationship: PairGlyph,

    /// Kappa factor (for partial credit)
    pub kappa: Option<f64>,

    /// Notes
    pub notes: Option<String>,
}

impl ReciprocityPairGlyph {
    /// Create a full reciprocity pair
    pub fn full(state_a: &str, state_b: &str) -> Self {
        Self {
            state_a: state_a.to_uppercase(),
            state_b: state_b.to_uppercase(),
            relationship: PairGlyph::FullBoth,
            kappa: Some(1.0),
            notes: None,
        }
    }

    /// Create a no reciprocity pair
    pub fn none(state_a: &str, state_b: &str) -> Self {
        Self {
            state_a: state_a.to_uppercase(),
            state_b: state_b.to_uppercase(),
            relationship: PairGlyph::None,
            kappa: Some(0.0),
            notes: None,
        }
    }

    /// Create a partial credit pair
    pub fn partial(state_a: &str, state_b: &str, kappa: f64) -> Self {
        Self {
            state_a: state_a.to_uppercase(),
            state_b: state_b.to_uppercase(),
            relationship: PairGlyph::Partial,
            kappa: Some(kappa),
            notes: None,
        }
    }

    /// Render as symbolic string
    pub fn to_symbol_string(&self) -> String {
        let kappa_str = if let Some(k) = self.kappa {
            if self.relationship == PairGlyph::Partial {
                format!("{:.2}", k)
            } else {
                String::new()
            }
        } else {
            String::new()
        };

        if kappa_str.is_empty() {
            format!("{}{}{}", self.state_a, self.relationship, self.state_b)
        } else {
            format!("{}{}{}:{}", self.state_a, self.relationship, kappa_str, self.state_b)
        }
    }
}

impl fmt::Display for ReciprocityPairGlyph {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.to_symbol_string())
    }
}

// ============================================================================
// GLYPH REGISTRY
// ============================================================================

/// Registry of all state glyphs
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct GlyphRegistry {
    /// State glyphs by state code
    pub states: std::collections::HashMap<String, StateGlyph>,

    /// Pair glyphs
    pub pairs: Vec<ReciprocityPairGlyph>,
}

impl GlyphRegistry {
    /// Create a new empty registry
    pub fn new() -> Self {
        Self::default()
    }

    /// Load the default registry with all states
    pub fn load_default() -> Self {
        let mut registry = Self::new();
        registry.populate_defaults();
        registry
    }

    /// Add a state glyph
    pub fn add_state(&mut self, glyph: StateGlyph) {
        self.states.insert(glyph.state_code.clone(), glyph);
    }

    /// Add a pair glyph
    pub fn add_pair(&mut self, glyph: ReciprocityPairGlyph) {
        self.pairs.push(glyph);
    }

    /// Get a state glyph
    pub fn get_state(&self, state_code: &str) -> Option<&StateGlyph> {
        self.states.get(&state_code.to_uppercase())
    }

    /// Render all glyphs as a string
    pub fn to_glyph_file(&self) -> String {
        let mut output = String::new();
        output.push_str("# Autolytiq Tax Intelligence Engine - Glyph Registry\n");
        output.push_str("# Generated from state rules\n\n");

        output.push_str("## State Glyphs\n\n");

        let mut states: Vec<_> = self.states.values().collect();
        states.sort_by(|a, b| a.state_code.cmp(&b.state_code));

        for glyph in states {
            output.push_str(&format!("{}\n", glyph.to_symbol_string()));
        }

        output.push_str("\n## Reciprocity Pairs\n\n");

        for pair in &self.pairs {
            output.push_str(&format!("{}\n", pair.to_symbol_string()));
        }

        output
    }

    fn populate_defaults(&mut self) {
        // Indiana
        let mut in_glyph = StateGlyph::new("IN");
        in_glyph.version = 3;
        in_glyph.trade_in = TradeInGlyph::Full;
        in_glyph.doc_fee = TaxableGlyph::Taxable;
        in_glyph.vsc = TaxableGlyph::NotTaxable; // IN: VSC not taxable
        in_glyph.gap = TaxableGlyph::NotTaxable; // IN: GAP not taxable
        in_glyph.lease_method = LeaseTaxGlyph::Monthly;
        in_glyph.reciprocity = ReciprocityGlyph::Enabled;
        self.add_state(in_glyph);

        // Texas
        let mut tx_glyph = StateGlyph::new("TX");
        tx_glyph.version = 2;
        tx_glyph.trade_in = TradeInGlyph::Full;
        tx_glyph.doc_fee = TaxableGlyph::Taxable;
        tx_glyph.vsc = TaxableGlyph::NotTaxable; // TX: VSC not taxable
        tx_glyph.gap = TaxableGlyph::NotTaxable; // TX: GAP not taxable
        tx_glyph.lease_method = LeaseTaxGlyph::Monthly;
        tx_glyph.reciprocity = ReciprocityGlyph::Enabled;
        self.add_state(tx_glyph);

        // California
        let mut ca_glyph = StateGlyph::new("CA");
        ca_glyph.version = 2;
        ca_glyph.trade_in = TradeInGlyph::Full;
        ca_glyph.doc_fee = TaxableGlyph::Taxable;
        ca_glyph.vsc = TaxableGlyph::Taxable;
        ca_glyph.gap = TaxableGlyph::Taxable;
        ca_glyph.lease_method = LeaseTaxGlyph::Upfront;
        ca_glyph.reciprocity = ReciprocityGlyph::Disabled; // CA: No reciprocity
        self.add_state(ca_glyph);

        // Florida
        let mut fl_glyph = StateGlyph::new("FL");
        fl_glyph.version = 2;
        fl_glyph.trade_in = TradeInGlyph::Full;
        fl_glyph.doc_fee = TaxableGlyph::Taxable;
        fl_glyph.vsc = TaxableGlyph::NotTaxable;
        fl_glyph.gap = TaxableGlyph::NotTaxable;
        fl_glyph.lease_method = LeaseTaxGlyph::Monthly;
        fl_glyph.reciprocity = ReciprocityGlyph::Enabled;
        self.add_state(fl_glyph);

        // New York
        let mut ny_glyph = StateGlyph::new("NY");
        ny_glyph.version = 2;
        ny_glyph.trade_in = TradeInGlyph::Full;
        ny_glyph.doc_fee = TaxableGlyph::Taxable;
        ny_glyph.vsc = TaxableGlyph::Taxable;
        ny_glyph.gap = TaxableGlyph::NotTaxable;
        ny_glyph.lease_method = LeaseTaxGlyph::Upfront;
        ny_glyph.reciprocity = ReciprocityGlyph::Enabled;
        self.add_state(ny_glyph);

        // Georgia (TAVT state)
        let mut ga_glyph = StateGlyph::new("GA");
        ga_glyph.version = 2;
        ga_glyph.trade_in = TradeInGlyph::Full;
        ga_glyph.doc_fee = TaxableGlyph::NotTaxable; // TAVT based
        ga_glyph.vsc = TaxableGlyph::NotTaxable;
        ga_glyph.gap = TaxableGlyph::NotTaxable;
        ga_glyph.lease_method = LeaseTaxGlyph::Upfront; // TAVT
        ga_glyph.reciprocity = ReciprocityGlyph::Enabled;
        self.add_state(ga_glyph);

        // Ohio
        let mut oh_glyph = StateGlyph::new("OH");
        oh_glyph.version = 2;
        oh_glyph.trade_in = TradeInGlyph::Full;
        oh_glyph.doc_fee = TaxableGlyph::Taxable;
        oh_glyph.vsc = TaxableGlyph::Taxable;
        oh_glyph.gap = TaxableGlyph::Taxable;
        oh_glyph.lease_method = LeaseTaxGlyph::Hybrid;
        oh_glyph.reciprocity = ReciprocityGlyph::Enabled;
        self.add_state(oh_glyph);

        // Michigan
        let mut mi_glyph = StateGlyph::new("MI");
        mi_glyph.version = 2;
        mi_glyph.trade_in = TradeInGlyph::Full;
        mi_glyph.doc_fee = TaxableGlyph::Taxable;
        mi_glyph.vsc = TaxableGlyph::NotTaxable;
        mi_glyph.gap = TaxableGlyph::NotTaxable;
        mi_glyph.lease_method = LeaseTaxGlyph::Monthly;
        mi_glyph.reciprocity = ReciprocityGlyph::Enabled;
        self.add_state(mi_glyph);

        // Illinois (no trade-in credit)
        let mut il_glyph = StateGlyph::new("IL");
        il_glyph.version = 2;
        il_glyph.trade_in = TradeInGlyph::None; // IL: No trade-in credit
        il_glyph.doc_fee = TaxableGlyph::Taxable;
        il_glyph.vsc = TaxableGlyph::Taxable;
        il_glyph.gap = TaxableGlyph::Taxable;
        il_glyph.lease_method = LeaseTaxGlyph::Monthly;
        il_glyph.reciprocity = ReciprocityGlyph::Enabled;
        self.add_state(il_glyph);

        // Virginia (capped trade-in)
        let mut va_glyph = StateGlyph::new("VA");
        va_glyph.version = 2;
        va_glyph.trade_in = TradeInGlyph::Capped;
        va_glyph.trade_in_cap = Some(20000.0); // VA: $20k cap
        va_glyph.doc_fee = TaxableGlyph::Taxable;
        va_glyph.vsc = TaxableGlyph::NotTaxable;
        va_glyph.gap = TaxableGlyph::NotTaxable;
        va_glyph.lease_method = LeaseTaxGlyph::Monthly;
        va_glyph.reciprocity = ReciprocityGlyph::Enabled;
        self.add_state(va_glyph);

        // Add reciprocity pairs
        self.add_pair(ReciprocityPairGlyph::full("TX", "FL"));
        self.add_pair(ReciprocityPairGlyph::full("FL", "TX"));
        self.add_pair(ReciprocityPairGlyph::none("CA", "*")); // CA no reciprocity
        self.add_pair(ReciprocityPairGlyph::full("IN", "OH"));
        self.add_pair(ReciprocityPairGlyph::full("OH", "IN"));

        // Asymmetric FL-OK
        self.add_pair(ReciprocityPairGlyph::full("FL", "OK"));
        self.add_pair(ReciprocityPairGlyph::none("OK", "FL"));
    }
}

// ============================================================================
// TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_trade_in_glyph_symbols() {
        assert_eq!(TradeInGlyph::Full.symbol(), '◆');
        assert_eq!(TradeInGlyph::None.symbol(), '◇');
        assert_eq!(TradeInGlyph::Capped.symbol(), '◈');
        assert_eq!(TradeInGlyph::Percent.symbol(), '◊');
    }

    #[test]
    fn test_taxable_glyph_symbols() {
        assert_eq!(TaxableGlyph::Taxable.symbol(), '●');
        assert_eq!(TaxableGlyph::NotTaxable.symbol(), '○');
    }

    #[test]
    fn test_state_glyph_to_string() {
        let glyph = StateGlyph {
            state_code: "IN".to_string(),
            version: 3,
            trade_in: TradeInGlyph::Full,
            trade_in_cap: None,
            trade_in_percent: None,
            doc_fee: TaxableGlyph::Taxable,
            vsc: TaxableGlyph::NotTaxable,
            gap: TaxableGlyph::NotTaxable,
            lease_method: LeaseTaxGlyph::Monthly,
            reciprocity: ReciprocityGlyph::Enabled,
        };

        let expected = "IN_v3 = ◆●○○▼★";
        assert_eq!(glyph.to_symbol_string(), expected);
    }

    #[test]
    fn test_state_glyph_parse() {
        let input = "IN_v3 = ◆●○○▼★";
        let glyph = StateGlyph::from_symbol_string(input).unwrap();

        assert_eq!(glyph.state_code, "IN");
        assert_eq!(glyph.version, 3);
        assert_eq!(glyph.trade_in, TradeInGlyph::Full);
        assert_eq!(glyph.doc_fee, TaxableGlyph::Taxable);
        assert_eq!(glyph.vsc, TaxableGlyph::NotTaxable);
        assert_eq!(glyph.gap, TaxableGlyph::NotTaxable);
        assert_eq!(glyph.reciprocity, ReciprocityGlyph::Enabled);
    }

    #[test]
    fn test_pair_glyph_to_string() {
        let pair = ReciprocityPairGlyph::full("TX", "FL");
        assert_eq!(pair.to_symbol_string(), "TX⟷FL");

        let pair_none = ReciprocityPairGlyph::none("CA", "*");
        assert_eq!(pair_none.to_symbol_string(), "CA⊗*");

        let pair_partial = ReciprocityPairGlyph::partial("TX", "OK", 0.8);
        assert!(pair_partial.to_symbol_string().contains("0.80"));
    }

    #[test]
    fn test_glyph_registry() {
        let registry = GlyphRegistry::load_default();

        // Check Indiana
        let in_glyph = registry.get_state("IN").unwrap();
        assert_eq!(in_glyph.trade_in, TradeInGlyph::Full);
        assert_eq!(in_glyph.vsc, TaxableGlyph::NotTaxable);

        // Check California
        let ca_glyph = registry.get_state("CA").unwrap();
        assert_eq!(ca_glyph.reciprocity, ReciprocityGlyph::Disabled);
    }

    #[test]
    fn test_glyph_file_output() {
        let registry = GlyphRegistry::load_default();
        let output = registry.to_glyph_file();

        assert!(output.contains("IN_v3 = ◆●○○▼★"));
        assert!(output.contains("CA_v2"));
        assert!(output.contains("Reciprocity Pairs"));
    }
}
