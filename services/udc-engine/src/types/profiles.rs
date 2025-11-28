//! Profile types - the "keys" of our cipher.
//!
//! RuleProfile: Jurisdiction-specific tax rules
//! ProgramProfile: Lender/lessor program parameters
//! ProductProfile: F&I product tax treatment

use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use serde::{Deserialize, Serialize};
use strum::{Display, EnumString};

use super::deal::DealType;
use super::money::{Money, Rate};

// ============================================================================
// RULE PROFILE - Jurisdiction Tax Rules
// ============================================================================

/// How trade-in credit is applied to the tax base.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Display, EnumString)]
#[serde(rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
pub enum TradeInTaxTreatment {
    /// Trade-in reduces the taxable amount (most states)
    ReducesTaxableAmount,
    /// Trade-in does NOT reduce taxable amount (e.g., CA)
    NoReduction,
    /// Partial reduction (some states have caps)
    PartialReduction,
}

/// How manufacturer rebates affect the tax base.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Display, EnumString)]
#[serde(rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
pub enum RebateTaxTreatment {
    /// Rebates reduce the taxable amount
    ReducesTaxableAmount,
    /// Rebates do NOT reduce taxable amount
    NoReduction,
}

/// How taxes are calculated on leases.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Display, EnumString)]
#[serde(rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
pub enum LeaseTaxMode {
    /// Tax on full capitalized cost upfront
    CapitalizedCost,
    /// Alias for CapitalizedCost (for backward compatibility)
    CapCostUpfront,
    /// Tax applied to each monthly payment
    MonthlyPayment,
    /// Tax on total of all payments (paid upfront or capitalized)
    TotalPayments,
    /// Only tax the depreciation portion
    DepreciationOnly,
    /// Special acquisition tax (e.g., TX)
    AcquisitionTax,
    /// No tax on lease (exempt)
    Exempt,
}

/// How state/county/city taxes stack.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Display, EnumString)]
#[serde(rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
pub enum TaxStackingMode {
    /// All rates simply add together
    Additive,
    /// Local taxes calculated on base, not on base+state tax
    NonPyramiding,
    /// Complex stacking rules (state-specific)
    Custom,
}

/// Reciprocity credit type for multi-jurisdiction deals.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Display, EnumString)]
#[serde(rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
pub enum ReciprocityType {
    /// Full credit for taxes paid in transaction state
    FullCredit,
    /// Credit up to home state rate
    PartialCredit,
    /// No credit - pay both jurisdictions
    NoCredit,
    /// One tax "in lieu of" the other
    InLieu,
}

/// Special state tax type (for states with unique tax structures).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Display, EnumString)]
#[serde(rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
pub enum SpecialTaxType {
    /// Standard sales/use tax
    Standard,
    /// Georgia Title Ad Valorem Tax
    GaTavt,
    /// North Carolina Highway Use Tax
    NcHut,
    /// West Virginia Excise Tax
    WvExcise,
    /// Oregon no sales tax (fees only)
    OrNone,
    /// Montana no sales tax
    MtNone,
}

/// A single tax rate component.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TaxRateComponent {
    /// Jurisdiction level (state, county, city, district)
    pub level: String,
    /// Jurisdiction name
    pub name: String,
    /// Tax rate
    pub rate: Rate,
    /// Whether this component applies to vehicle sales
    pub applies_to_vehicles: bool,
    /// Cap on taxable amount (if any)
    pub cap: Option<Money>,
}

/// Rule profile for a specific (state, deal_type) combination.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RuleProfile {
    /// State code
    pub state_code: String,
    /// Deal type this profile applies to
    pub deal_type: DealType,
    /// Effective date of these rules
    pub effective_date: chrono::NaiveDate,

    // === Tax Rates ===
    /// State tax rate
    pub state_rate: Rate,
    /// County rate (may be looked up by county name)
    pub county_rate: Option<Rate>,
    /// City rate (may be looked up by city name)
    pub city_rate: Option<Rate>,
    /// Additional district rates
    pub district_rates: Vec<TaxRateComponent>,

    // === Tax Base Rules ===
    /// How trade-ins affect tax base
    pub trade_in_treatment: TradeInTaxTreatment,
    /// Cap on trade-in credit (e.g., some states cap at $5000)
    pub trade_in_credit_cap: Option<Money>,
    /// How rebates affect tax base
    pub rebate_treatment: RebateTaxTreatment,
    /// Whether doc fees are taxable
    pub doc_fee_taxable: bool,
    /// Whether title fees are taxable
    pub title_fee_taxable: bool,
    /// Whether registration fees are taxable
    pub registration_fee_taxable: bool,

    // === Lease-Specific ===
    /// How leases are taxed
    pub lease_tax_mode: LeaseTaxMode,

    // === Multi-Jurisdiction ===
    /// How taxes stack
    pub tax_stacking_mode: TaxStackingMode,
    /// Reciprocity rules with other states
    pub reciprocity: ReciprocityType,

    // === Special Cases ===
    /// Special tax type (GA TAVT, NC HUT, etc.)
    pub special_tax_type: SpecialTaxType,
    /// Flat tax amount (for special types)
    pub flat_tax_amount: Option<Money>,
    /// Maximum tax cap
    pub max_tax_cap: Option<Money>,
    /// Minimum tax floor
    pub min_tax_floor: Option<Money>,

    // === Rounding Rules ===
    /// Rounding precision (decimal places)
    pub rounding_precision: u8,
    /// Rounding mode
    pub rounding_mode: RoundingMode,
}

/// Rounding mode for financial calculations.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Display, EnumString)]
#[serde(rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
pub enum RoundingMode {
    /// Round half up (standard)
    HalfUp,
    /// Round half down
    HalfDown,
    /// Banker's rounding (half to even)
    HalfEven,
    /// Always round up (ceiling)
    Ceiling,
    /// Always round down (floor)
    Floor,
}

impl Default for RuleProfile {
    fn default() -> Self {
        RuleProfile {
            state_code: String::new(),
            deal_type: DealType::Cash,
            effective_date: chrono::NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            state_rate: Rate::ZERO,
            county_rate: None,
            city_rate: None,
            district_rates: Vec::new(),
            trade_in_treatment: TradeInTaxTreatment::ReducesTaxableAmount,
            trade_in_credit_cap: None,
            rebate_treatment: RebateTaxTreatment::ReducesTaxableAmount,
            doc_fee_taxable: true,
            title_fee_taxable: false,
            registration_fee_taxable: false,
            lease_tax_mode: LeaseTaxMode::MonthlyPayment,
            tax_stacking_mode: TaxStackingMode::Additive,
            reciprocity: ReciprocityType::FullCredit,
            special_tax_type: SpecialTaxType::Standard,
            flat_tax_amount: None,
            max_tax_cap: None,
            min_tax_floor: None,
            rounding_precision: 2,
            rounding_mode: RoundingMode::HalfUp,
        }
    }
}

impl RuleProfile {
    /// Calculate the combined tax rate for this jurisdiction.
    pub fn combined_rate(&self) -> Rate {
        let mut total = self.state_rate;

        if let Some(county) = self.county_rate {
            total = total + county;
        }

        if let Some(city) = self.city_rate {
            total = total + city;
        }

        for district in &self.district_rates {
            if district.applies_to_vehicles {
                total = total + district.rate;
            }
        }

        total
    }
}

// ============================================================================
// PROGRAM PROFILE - Lender/Lessor Parameters
// ============================================================================

/// Fee treatment for finance/lease programs.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Display, EnumString)]
#[serde(rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
pub enum FeeCapitalization {
    /// Fee is capitalized into amount financed/gross cap cost
    Capitalize,
    /// Fee is paid upfront, not financed
    Upfront,
    /// Dealer choice
    Optional,
}

/// Program profile from lender/lessor.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ProgramProfile {
    /// Lender/lessor code
    pub lender_code: String,
    /// Program code
    pub program_code: String,
    /// Program name
    pub name: String,

    // === Finance Parameters ===
    /// Base APR (before markup)
    pub base_apr: Option<Rate>,
    /// Maximum APR allowed
    pub max_apr: Option<Rate>,
    /// Allowed terms (in months)
    pub allowed_terms: Vec<u16>,
    /// Maximum amount financed
    pub max_amount_financed: Option<Money>,
    /// Maximum LTV (loan-to-value ratio)
    pub max_ltv: Option<Rate>,

    // === Lease Parameters ===
    /// Base money factor
    pub base_money_factor: Option<Decimal>,
    /// Residual percentages by term (term_months -> residual %)
    pub residual_table: Vec<ResidualEntry>,
    /// Maximum cap cost
    pub max_cap_cost: Option<Money>,

    // === Fee Handling ===
    /// Acquisition fee
    pub acquisition_fee: Option<Money>,
    /// Acquisition fee treatment
    pub acquisition_fee_treatment: FeeCapitalization,
    /// Doc fee treatment
    pub doc_fee_treatment: FeeCapitalization,
    /// Title fee treatment
    pub title_fee_treatment: FeeCapitalization,

    // === Rounding Rules ===
    /// Payment rounding mode
    pub payment_rounding: RoundingMode,
    /// Payment rounding precision
    pub payment_precision: u8,
    /// Interest rounding mode
    pub interest_rounding: RoundingMode,

    // === Restrictions ===
    /// Minimum down payment percentage
    pub min_down_percentage: Option<Rate>,
    /// Maximum negative equity allowed
    pub max_negative_equity: Option<Money>,
}

/// Residual value entry for a specific term.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ResidualEntry {
    /// Term in months
    pub term_months: u16,
    /// Annual mileage tier
    pub annual_mileage: u32,
    /// Residual percentage of MSRP
    pub residual_percentage: Rate,
}

impl Default for ProgramProfile {
    fn default() -> Self {
        ProgramProfile {
            lender_code: String::new(),
            program_code: String::new(),
            name: String::new(),
            base_apr: None,
            max_apr: None,
            allowed_terms: vec![24, 36, 48, 60, 72],
            max_amount_financed: None,
            max_ltv: None,
            base_money_factor: None,
            residual_table: Vec::new(),
            max_cap_cost: None,
            acquisition_fee: None,
            acquisition_fee_treatment: FeeCapitalization::Capitalize,
            doc_fee_treatment: FeeCapitalization::Capitalize,
            title_fee_treatment: FeeCapitalization::Upfront,
            payment_rounding: RoundingMode::HalfUp,
            payment_precision: 2,
            interest_rounding: RoundingMode::HalfUp,
            min_down_percentage: None,
            max_negative_equity: None,
        }
    }
}

impl ProgramProfile {
    /// Look up residual percentage for given term and mileage.
    pub fn get_residual(&self, term_months: u16, annual_mileage: u32) -> Option<Rate> {
        self.residual_table
            .iter()
            .find(|r| r.term_months == term_months && r.annual_mileage == annual_mileage)
            .map(|r| r.residual_percentage)
    }
}

// ============================================================================
// PRODUCT PROFILE - F&I Product Tax Treatment
// ============================================================================

/// How an F&I product is taxed.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Display, EnumString)]
#[serde(rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
pub enum ProductTaxTreatment {
    /// Product is fully taxable
    Taxable,
    /// Product is tax-exempt
    Exempt,
    /// Product is taxable in some jurisdictions
    Conditional,
}

/// Profile for an F&I product defining tax treatment by jurisdiction.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ProductProfile {
    /// Product code
    pub product_code: String,
    /// Product category
    pub category: String,
    /// Default tax treatment
    pub default_tax_treatment: ProductTaxTreatment,
    /// State-specific overrides (state_code -> treatment)
    pub state_overrides: Vec<(String, ProductTaxTreatment)>,
    /// Whether product can be capitalized in lease
    pub lease_capitalizable: bool,
    /// Whether product can be financed
    pub financeable: bool,
}

impl Default for ProductProfile {
    fn default() -> Self {
        ProductProfile {
            product_code: String::new(),
            category: String::new(),
            default_tax_treatment: ProductTaxTreatment::Taxable,
            state_overrides: Vec::new(),
            lease_capitalizable: true,
            financeable: true,
        }
    }
}

impl ProductProfile {
    /// Get tax treatment for a specific state.
    pub fn tax_treatment_for_state(&self, state_code: &str) -> ProductTaxTreatment {
        self.state_overrides
            .iter()
            .find(|(s, _)| s == state_code)
            .map(|(_, t)| *t)
            .unwrap_or(self.default_tax_treatment)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_combined_rate() {
        let profile = RuleProfile {
            state_rate: Rate::from_percentage(dec!(6.0)),
            county_rate: Some(Rate::from_percentage(dec!(1.0))),
            city_rate: Some(Rate::from_percentage(dec!(0.5))),
            ..Default::default()
        };

        assert_eq!(profile.combined_rate().as_percentage(), dec!(7.5));
    }

    #[test]
    fn test_residual_lookup() {
        let profile = ProgramProfile {
            residual_table: vec![
                ResidualEntry {
                    term_months: 36,
                    annual_mileage: 10000,
                    residual_percentage: Rate::from_percentage(dec!(55)),
                },
                ResidualEntry {
                    term_months: 36,
                    annual_mileage: 12000,
                    residual_percentage: Rate::from_percentage(dec!(53)),
                },
            ],
            ..Default::default()
        };

        assert_eq!(
            profile.get_residual(36, 10000).unwrap().as_percentage(),
            dec!(55)
        );
        assert!(profile.get_residual(48, 10000).is_none());
    }
}
