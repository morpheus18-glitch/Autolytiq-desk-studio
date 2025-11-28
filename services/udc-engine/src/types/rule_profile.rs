//! State tax rules and jurisdiction profiles.
//!
//! Contains the RuleProfile type which encapsulates all tax rules
//! for a specific state/jurisdiction and deal type combination.

use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use chrono::NaiveDate;

use super::{DealType, LeaseTaxMode, StateCode, TaxType};

/// Complete tax rule profile for a state/deal-type combination.
/// This is the authoritative source for how taxes are calculated.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleProfile {
    /// State this profile applies to
    pub state_code: StateCode,

    /// Deal type (Finance, Lease, Cash)
    pub mode: DealType,

    /// Primary tax type for this state
    pub tax_type: TaxType,

    /// Tax rates for different components
    pub rates: TaxRates,

    /// Rules for determining the tax base
    pub base_rules: BaseRules,

    /// Rules for ancillary items (products, fees)
    pub ancillaries: AncillaryRules,

    /// Interstate reciprocity rules
    pub reciprocity: ReciprocityRules,

    /// Lease-specific tax handling (for Lease mode)
    #[serde(default)]
    pub lease_tax_mode: Option<LeaseTaxMode>,

    /// Profile metadata
    pub meta: ProfileMeta,
}

impl RuleProfile {
    /// Get the effective state tax rate
    pub fn effective_state_rate(&self) -> Decimal {
        self.rates.state_rate
    }

    /// Check if trade-in reduces tax basis
    pub fn trade_reduces_basis(&self) -> bool {
        self.base_rules.trade_in_reduces_basis
    }

    /// Check if rebates reduce tax basis
    pub fn rebates_reduce_basis(&self) -> bool {
        self.base_rules.rebates_reduce_basis
    }
}

/// Tax rate structure for a jurisdiction
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TaxRates {
    /// Base state sales/use tax rate (as decimal, e.g., 0.0625 for 6.25%)
    pub state_rate: Decimal,

    /// Maximum local rate cap (if any)
    #[serde(default)]
    pub max_local_rate: Option<Decimal>,

    /// Default combined rate (state + avg local)
    #[serde(default)]
    pub default_combined_rate: Decimal,

    /// County rate override lookup key
    #[serde(default)]
    pub county_rate_key: Option<String>,

    /// City rate override lookup key
    #[serde(default)]
    pub city_rate_key: Option<String>,

    /// Special district rate (e.g., transit districts)
    #[serde(default)]
    pub district_rate: Decimal,

    /// Flat tax amount (for states like Montana)
    #[serde(default)]
    pub flat_tax_amount: Option<Decimal>,

    /// TAVT rate (Georgia-specific, as decimal)
    #[serde(default)]
    pub tavt_rate: Option<Decimal>,

    /// Highway Use Tax rate (NC-specific)
    #[serde(default)]
    pub hut_rate: Option<Decimal>,

    /// Excise tax rate
    #[serde(default)]
    pub excise_rate: Option<Decimal>,
}

/// Rules for determining the taxable base amount
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BaseRules {
    /// Does trade-in value reduce the taxable amount?
    #[serde(default = "default_true")]
    pub trade_in_reduces_basis: bool,

    /// Maximum trade-in credit allowed
    #[serde(default)]
    pub max_trade_in_credit: Option<Decimal>,

    /// Do manufacturer rebates reduce the taxable amount?
    #[serde(default)]
    pub rebates_reduce_basis: bool,

    /// Which rebate types reduce basis
    #[serde(default)]
    pub rebate_types_reduce_basis: Vec<String>,

    /// Do dealer discounts reduce the taxable amount?
    #[serde(default = "default_true")]
    pub dealer_discount_reduces_basis: bool,

    /// Is the doc fee part of the taxable amount?
    #[serde(default = "default_true")]
    pub doc_fee_taxable: bool,

    /// Is the destination/freight charge taxable?
    #[serde(default = "default_true")]
    pub destination_taxable: bool,

    /// Are dealer-installed accessories taxable?
    #[serde(default = "default_true")]
    pub dealer_accessories_taxable: bool,

    /// Is there a tax cap on vehicle price?
    #[serde(default)]
    pub max_taxable_amount: Option<Decimal>,

    /// Minimum taxable amount (for depreciated value)
    #[serde(default)]
    pub min_taxable_amount: Option<Decimal>,

    /// Use book value instead of sale price (luxury tax states)
    #[serde(default)]
    pub use_book_value: bool,
}

fn default_true() -> bool {
    true
}

impl Default for BaseRules {
    fn default() -> Self {
        Self {
            trade_in_reduces_basis: true,
            max_trade_in_credit: None,
            rebates_reduce_basis: false,
            rebate_types_reduce_basis: vec![],
            dealer_discount_reduces_basis: true,
            doc_fee_taxable: true,
            destination_taxable: true,
            dealer_accessories_taxable: true,
            max_taxable_amount: None,
            min_taxable_amount: None,
            use_book_value: false,
        }
    }
}

/// Rules for taxing ancillary items (F&I products, fees)
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct AncillaryRules {
    /// Are vehicle service contracts (VSC) taxable?
    #[serde(default)]
    pub vsc_taxable: bool,

    /// Is GAP insurance taxable?
    #[serde(default)]
    pub gap_taxable: bool,

    /// Is tire & wheel protection taxable?
    #[serde(default)]
    pub tire_wheel_taxable: bool,

    /// Is paint/appearance protection taxable?
    #[serde(default)]
    pub appearance_taxable: bool,

    /// Is prepaid maintenance taxable?
    #[serde(default)]
    pub maintenance_taxable: bool,

    /// Is key replacement taxable?
    #[serde(default)]
    pub key_replacement_taxable: bool,

    /// Is theft protection taxable?
    #[serde(default)]
    pub theft_taxable: bool,

    /// Is windshield protection taxable?
    #[serde(default)]
    pub windshield_taxable: bool,

    /// Is dent protection taxable?
    #[serde(default)]
    pub dent_taxable: bool,

    /// Is credit life insurance taxable?
    #[serde(default)]
    pub credit_life_taxable: bool,

    /// Is credit disability insurance taxable?
    #[serde(default)]
    pub credit_disability_taxable: bool,

    /// Default rule for unlisted products
    #[serde(default)]
    pub default_product_taxable: bool,

    /// Are government fees taxable?
    #[serde(default)]
    pub government_fees_taxable: bool,

    /// Is registration taxable?
    #[serde(default)]
    pub registration_taxable: bool,

    /// Is title fee taxable?
    #[serde(default)]
    pub title_fee_taxable: bool,
}

impl AncillaryRules {
    /// Check if a product type is taxable according to these rules
    pub fn is_product_taxable(&self, product_type: &str) -> bool {
        match product_type.to_lowercase().as_str() {
            "vsc" | "vehicle_service_contract" | "extended_warranty" => self.vsc_taxable,
            "gap" | "gap_insurance" => self.gap_taxable,
            "tire_wheel" | "tirewheel" => self.tire_wheel_taxable,
            "appearance" | "paint" | "interior" => self.appearance_taxable,
            "maintenance" | "prepaid_maintenance" => self.maintenance_taxable,
            "key" | "key_replacement" => self.key_replacement_taxable,
            "theft" | "theft_protection" | "etch" => self.theft_taxable,
            "windshield" => self.windshield_taxable,
            "dent" | "pdr" | "dent_protection" => self.dent_taxable,
            "credit_life" => self.credit_life_taxable,
            "credit_disability" => self.credit_disability_taxable,
            _ => self.default_product_taxable,
        }
    }
}

/// Interstate tax reciprocity rules
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ReciprocityRules {
    /// Does this state offer reciprocity with other states?
    #[serde(default)]
    pub offers_reciprocity: bool,

    /// Full credit states (100% credit for taxes paid)
    #[serde(default)]
    pub full_credit_states: Vec<StateCode>,

    /// Partial credit states with specific rates
    #[serde(default)]
    pub partial_credit_states: Vec<PartialCreditState>,

    /// States with no reciprocity (pay full tax in both)
    #[serde(default)]
    pub no_credit_states: Vec<StateCode>,

    /// Maximum credit allowed
    #[serde(default)]
    pub max_credit_rate: Option<Decimal>,

    /// Whether to use higher or lower rate for comparison
    #[serde(default)]
    pub use_higher_rate: bool,
}

/// Partial credit state configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PartialCreditState {
    /// The other state
    pub state: StateCode,
    /// Credit rate allowed (as decimal)
    pub credit_rate: Decimal,
    /// Additional conditions (free-form notes)
    #[serde(default)]
    pub conditions: Option<String>,
}

/// Metadata about the profile
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileMeta {
    /// Profile version
    pub version: String,

    /// Effective date of these rules
    pub effective_date: NaiveDate,

    /// Expiration date (if known)
    #[serde(default)]
    pub expiration_date: Option<NaiveDate>,

    /// Source/authority for these rules
    #[serde(default)]
    pub source: Option<String>,

    /// Last verified date
    #[serde(default)]
    pub verified_date: Option<NaiveDate>,

    /// Notes about the profile
    #[serde(default)]
    pub notes: Option<String>,

    /// Is this profile active?
    #[serde(default = "default_true")]
    pub active: bool,
}

impl Default for ProfileMeta {
    fn default() -> Self {
        Self {
            version: "1.0.0".to_string(),
            effective_date: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            expiration_date: None,
            source: None,
            verified_date: None,
            notes: None,
            active: true,
        }
    }
}

/// Lease-specific tax configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeaseTaxConfig {
    /// How lease taxes are calculated
    pub mode: LeaseTaxMode,

    /// Rate applied to monthly payments (if monthly mode)
    #[serde(default)]
    pub monthly_rate: Option<Decimal>,

    /// Rate applied to cap cost (if upfront mode)
    #[serde(default)]
    pub upfront_rate: Option<Decimal>,

    /// Are multiple security deposits taxable?
    #[serde(default)]
    pub msd_taxable: bool,

    /// Is acquisition fee taxable?
    #[serde(default)]
    pub acquisition_fee_taxable: bool,

    /// Is capitalized acquisition fee included in tax base?
    #[serde(default)]
    pub cap_acq_fee_in_base: bool,
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;

    #[test]
    fn test_rule_profile_basics() {
        let profile = RuleProfile {
            state_code: StateCode::TX,
            mode: DealType::Finance,
            tax_type: TaxType::Sales,
            rates: TaxRates {
                state_rate: dec!(0.0625),
                max_local_rate: Some(dec!(0.02)),
                default_combined_rate: dec!(0.0825),
                ..Default::default()
            },
            base_rules: BaseRules {
                trade_in_reduces_basis: true,
                rebates_reduce_basis: false,
                ..Default::default()
            },
            ancillaries: AncillaryRules::default(),
            reciprocity: ReciprocityRules::default(),
            lease_tax_mode: None,
            meta: ProfileMeta::default(),
        };

        assert_eq!(profile.effective_state_rate(), dec!(0.0625));
        assert!(profile.trade_reduces_basis());
        assert!(!profile.rebates_reduce_basis());
    }

    #[test]
    fn test_ancillary_taxability() {
        let rules = AncillaryRules {
            vsc_taxable: false,
            gap_taxable: false,
            tire_wheel_taxable: true,
            default_product_taxable: true,
            ..Default::default()
        };

        assert!(!rules.is_product_taxable("vsc"));
        assert!(!rules.is_product_taxable("gap"));
        assert!(rules.is_product_taxable("tire_wheel"));
        assert!(rules.is_product_taxable("unknown_product"));
    }
}
