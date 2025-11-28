//! F&I product profiles and configurations.
//!
//! Contains definitions for aftermarket products sold in the finance office,
//! including pricing structures, eligibility rules, and provider information.

use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use chrono::NaiveDate;

use super::ProductType;

/// Complete profile for an F&I product.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductProfile {
    /// Unique identifier
    pub id: String,

    /// Product name
    pub name: String,

    /// Product category
    pub product_type: ProductType,

    /// Provider/administrator
    pub provider: ProviderInfo,

    /// Pricing configuration
    pub pricing: ProductPricing,

    /// Coverage/term options
    pub coverage_options: Vec<CoverageOption>,

    /// Eligibility rules
    pub eligibility: ProductEligibility,

    /// Commission structure
    pub commission: CommissionStructure,

    /// State-specific rules
    #[serde(default)]
    pub state_rules: Vec<StateProductRule>,

    /// Product metadata
    pub meta: ProductMeta,
}

impl ProductProfile {
    /// Calculate the dealer cost for a specific coverage option
    pub fn dealer_cost(&self, coverage_id: &str) -> Option<Decimal> {
        self.coverage_options
            .iter()
            .find(|c| c.id == coverage_id)
            .map(|c| c.dealer_cost)
    }

    /// Calculate suggested retail for a coverage option
    pub fn suggested_retail(&self, coverage_id: &str) -> Option<Decimal> {
        self.coverage_options
            .iter()
            .find(|c| c.id == coverage_id)
            .map(|c| c.suggested_retail)
    }

    /// Get maximum profit for a coverage option
    pub fn max_profit(&self, coverage_id: &str) -> Option<Decimal> {
        self.coverage_options
            .iter()
            .find(|c| c.id == coverage_id)
            .map(|c| c.suggested_retail - c.dealer_cost)
    }

    /// Check if product is available for a vehicle
    pub fn is_vehicle_eligible(&self, model_year: u32, mileage: u32, vehicle_type: &str) -> bool {
        if let Some(max_age) = self.eligibility.max_vehicle_age {
            let current_year = 2024; // Would be dynamic in real implementation
            if current_year - model_year > max_age {
                return false;
            }
        }

        if let Some(max_mileage) = self.eligibility.max_mileage_at_sale {
            if mileage > max_mileage {
                return false;
            }
        }

        if !self.eligibility.eligible_vehicle_types.is_empty() {
            if !self.eligibility.eligible_vehicle_types.contains(&vehicle_type.to_string()) {
                return false;
            }
        }

        true
    }
}

/// Provider/administrator information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderInfo {
    /// Provider ID
    pub id: String,

    /// Provider name
    pub name: String,

    /// Contact phone
    #[serde(default)]
    pub phone: Option<String>,

    /// Claims phone
    #[serde(default)]
    pub claims_phone: Option<String>,

    /// Website
    #[serde(default)]
    pub website: Option<String>,

    /// A.M. Best rating (for insurance products)
    #[serde(default)]
    pub rating: Option<String>,
}

/// Pricing configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductPricing {
    /// Pricing model type
    pub model: PricingModel,

    /// Base cost (for flat pricing)
    #[serde(default)]
    pub base_cost: Option<Decimal>,

    /// Minimum selling price
    #[serde(default)]
    pub min_price: Option<Decimal>,

    /// Maximum selling price (lender caps)
    #[serde(default)]
    pub max_price: Option<Decimal>,

    /// Rate table (for rate-based pricing)
    #[serde(default)]
    pub rate_table: Option<RateTable>,

    /// Whether price varies by state
    #[serde(default)]
    pub state_specific_pricing: bool,

    /// Whether price includes tax
    #[serde(default)]
    pub tax_inclusive: bool,
}

/// Pricing model types
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PricingModel {
    /// Fixed price per coverage option
    Flat,
    /// Rate times vehicle value
    RateBased,
    /// Rate times amount financed
    AmountFinancedBased,
    /// Tiered by vehicle age/mileage
    Tiered,
    /// Custom calculation
    Custom,
}

/// Rate table for rate-based pricing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateTable {
    /// Rate type description
    pub description: String,

    /// Tiers in the rate table
    pub tiers: Vec<RateTier>,
}

/// Single tier in a rate table
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateTier {
    /// Minimum value for this tier
    pub min_value: Decimal,

    /// Maximum value for this tier
    pub max_value: Decimal,

    /// Rate to apply (as decimal)
    pub rate: Decimal,

    /// Minimum cost for this tier
    #[serde(default)]
    pub min_cost: Option<Decimal>,

    /// Maximum cost for this tier
    #[serde(default)]
    pub max_cost: Option<Decimal>,
}

/// Coverage option (term/deductible combination)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CoverageOption {
    /// Unique identifier for this option
    pub id: String,

    /// Display name
    pub name: String,

    /// Term in months
    pub term_months: u32,

    /// Mileage limit (for VSC/maintenance)
    #[serde(default)]
    pub mileage_limit: Option<u32>,

    /// Deductible amount
    #[serde(default)]
    pub deductible: Option<Decimal>,

    /// Coverage level (basic, standard, premium)
    #[serde(default)]
    pub coverage_level: Option<String>,

    /// Dealer cost
    pub dealer_cost: Decimal,

    /// Suggested retail price
    pub suggested_retail: Decimal,

    /// Maximum allowed selling price
    #[serde(default)]
    pub max_selling_price: Option<Decimal>,

    /// Surcharges (diesel, turbo, etc.)
    #[serde(default)]
    pub surcharges: Vec<Surcharge>,

    /// Is this option currently available
    #[serde(default = "default_true")]
    pub active: bool,
}

fn default_true() -> bool {
    true
}

/// Surcharge for specific vehicle characteristics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Surcharge {
    /// Surcharge type
    pub surcharge_type: SurchargeType,

    /// Amount
    pub amount: Decimal,

    /// Whether this is a percentage of base cost
    #[serde(default)]
    pub is_percentage: bool,
}

/// Types of surcharges
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SurchargeType {
    Diesel,
    Turbo,
    Supercharged,
    Hybrid,
    Electric,
    HighPerformance,
    Luxury,
    Commercial,
    FourWheelDrive,
    Other,
}

/// Eligibility rules for the product
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ProductEligibility {
    /// Maximum vehicle age (years from model year)
    #[serde(default)]
    pub max_vehicle_age: Option<u32>,

    /// Maximum mileage at time of sale
    #[serde(default)]
    pub max_mileage_at_sale: Option<u32>,

    /// Eligible vehicle types
    #[serde(default)]
    pub eligible_vehicle_types: Vec<String>,

    /// Excluded vehicle makes
    #[serde(default)]
    pub excluded_makes: Vec<String>,

    /// Excluded vehicle models
    #[serde(default)]
    pub excluded_models: Vec<String>,

    /// Minimum vehicle value
    #[serde(default)]
    pub min_vehicle_value: Option<Decimal>,

    /// Maximum vehicle value
    #[serde(default)]
    pub max_vehicle_value: Option<Decimal>,

    /// New vehicles only
    #[serde(default)]
    pub new_only: bool,

    /// Used vehicles only
    #[serde(default)]
    pub used_only: bool,

    /// CPO required for used
    #[serde(default)]
    pub cpo_required: bool,

    /// Available for finance deals
    #[serde(default = "default_true")]
    pub finance_eligible: bool,

    /// Available for lease deals
    #[serde(default = "default_true")]
    pub lease_eligible: bool,

    /// Available for cash deals
    #[serde(default = "default_true")]
    pub cash_eligible: bool,

    /// Manufacturer warranty must be active
    #[serde(default)]
    pub requires_active_warranty: bool,
}

/// Commission/compensation structure
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CommissionStructure {
    /// Base commission type
    pub commission_type: CommissionType,

    /// Flat commission amount
    #[serde(default)]
    pub flat_amount: Option<Decimal>,

    /// Percentage of profit
    #[serde(default)]
    pub profit_percent: Option<Decimal>,

    /// Percentage of selling price
    #[serde(default)]
    pub price_percent: Option<Decimal>,

    /// Commission tiers (for tiered structures)
    #[serde(default)]
    pub tiers: Vec<CommissionTier>,

    /// Chargeback period (months)
    #[serde(default)]
    pub chargeback_months: Option<u32>,

    /// Chargeback schedule
    #[serde(default)]
    pub chargeback_schedule: Vec<ChargebackRate>,
}

/// Commission calculation type
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CommissionType {
    /// Flat dollar amount
    Flat,
    /// Percentage of gross profit
    #[default]
    ProfitPercent,
    /// Percentage of selling price
    PricePercent,
    /// Tiered by volume
    Tiered,
    /// Hybrid (flat + percent)
    Hybrid,
}

/// Commission tier for tiered structures
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommissionTier {
    /// Minimum units sold
    pub min_units: u32,

    /// Maximum units sold
    pub max_units: Option<u32>,

    /// Commission rate/amount for this tier
    pub rate: Decimal,

    /// Whether rate is percentage
    pub is_percentage: bool,
}

/// Chargeback rate by period
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChargebackRate {
    /// Month range start (0 = first month)
    pub from_month: u32,

    /// Month range end
    pub to_month: u32,

    /// Chargeback percentage (100 = full chargeback)
    pub chargeback_percent: Decimal,
}

/// State-specific product rules
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateProductRule {
    /// State code
    pub state: String,

    /// Is product available in this state
    pub available: bool,

    /// State-specific cost adjustment
    #[serde(default)]
    pub cost_adjustment: Decimal,

    /// State-specific price cap
    #[serde(default)]
    pub price_cap: Option<Decimal>,

    /// Required disclosures
    #[serde(default)]
    pub required_disclosures: Vec<String>,

    /// Is product taxable in this state
    #[serde(default)]
    pub taxable: Option<bool>,

    /// State filing requirements
    #[serde(default)]
    pub filing_required: bool,
}

/// Product metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductMeta {
    /// Version
    pub version: String,

    /// Last updated
    pub updated_at: NaiveDate,

    /// Form/contract version
    #[serde(default)]
    pub form_version: Option<String>,

    /// Filing number
    #[serde(default)]
    pub filing_number: Option<String>,

    /// Marketing materials version
    #[serde(default)]
    pub marketing_version: Option<String>,

    /// Is product active
    #[serde(default = "default_true")]
    pub active: bool,

    /// Notes
    #[serde(default)]
    pub notes: Option<String>,
}

impl Default for ProductMeta {
    fn default() -> Self {
        Self {
            version: "1.0.0".to_string(),
            updated_at: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            form_version: None,
            filing_number: None,
            marketing_version: None,
            active: true,
            notes: None,
        }
    }
}

/// Collection of product profiles for a dealership
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ProductCatalog {
    /// Dealership ID
    pub dealership_id: String,

    /// Available products
    pub products: Vec<ProductProfile>,

    /// Default product bundles
    #[serde(default)]
    pub bundles: Vec<ProductBundle>,

    /// Catalog metadata
    pub meta: CatalogMeta,
}

/// Product bundle (pre-configured combination)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductBundle {
    /// Bundle ID
    pub id: String,

    /// Bundle name
    pub name: String,

    /// Product IDs in the bundle
    pub product_ids: Vec<String>,

    /// Bundle discount (off total)
    #[serde(default)]
    pub discount: Decimal,

    /// Is discount a percentage
    #[serde(default)]
    pub discount_is_percent: bool,

    /// Bundle description
    #[serde(default)]
    pub description: Option<String>,
}

/// Catalog metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CatalogMeta {
    /// Last sync date
    pub last_sync: NaiveDate,

    /// Provider system
    #[serde(default)]
    pub provider_system: Option<String>,

    /// Catalog version
    pub version: String,
}

impl Default for CatalogMeta {
    fn default() -> Self {
        Self {
            last_sync: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            provider_system: None,
            version: "1.0.0".to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;

    fn create_test_product() -> ProductProfile {
        ProductProfile {
            id: "vsc-001".to_string(),
            name: "Premium Vehicle Service Contract".to_string(),
            product_type: ProductType::Vsc,
            provider: ProviderInfo {
                id: "provider-001".to_string(),
                name: "AutoGuard".to_string(),
                phone: Some("800-555-1234".to_string()),
                claims_phone: Some("800-555-5678".to_string()),
                website: Some("https://autoguard.example.com".to_string()),
                rating: Some("A+".to_string()),
            },
            pricing: ProductPricing {
                model: PricingModel::Flat,
                base_cost: Some(dec!(800)),
                min_price: Some(dec!(1000)),
                max_price: Some(dec!(3500)),
                rate_table: None,
                state_specific_pricing: false,
                tax_inclusive: false,
            },
            coverage_options: vec![
                CoverageOption {
                    id: "60-100".to_string(),
                    name: "60 Months / 100,000 Miles".to_string(),
                    term_months: 60,
                    mileage_limit: Some(100000),
                    deductible: Some(dec!(100)),
                    coverage_level: Some("Premium".to_string()),
                    dealer_cost: dec!(850),
                    suggested_retail: dec!(1995),
                    max_selling_price: Some(dec!(2995)),
                    surcharges: vec![
                        Surcharge {
                            surcharge_type: SurchargeType::Diesel,
                            amount: dec!(150),
                            is_percentage: false,
                        },
                    ],
                    active: true,
                },
                CoverageOption {
                    id: "72-100".to_string(),
                    name: "72 Months / 100,000 Miles".to_string(),
                    term_months: 72,
                    mileage_limit: Some(100000),
                    deductible: Some(dec!(100)),
                    coverage_level: Some("Premium".to_string()),
                    dealer_cost: dec!(950),
                    suggested_retail: dec!(2295),
                    max_selling_price: Some(dec!(3495)),
                    surcharges: vec![],
                    active: true,
                },
            ],
            eligibility: ProductEligibility {
                max_vehicle_age: Some(7),
                max_mileage_at_sale: Some(100000),
                new_only: false,
                used_only: false,
                finance_eligible: true,
                lease_eligible: false,
                cash_eligible: true,
                ..Default::default()
            },
            commission: CommissionStructure {
                commission_type: CommissionType::ProfitPercent,
                profit_percent: Some(dec!(0.50)),
                chargeback_months: Some(12),
                chargeback_schedule: vec![
                    ChargebackRate {
                        from_month: 0,
                        to_month: 3,
                        chargeback_percent: dec!(100),
                    },
                    ChargebackRate {
                        from_month: 4,
                        to_month: 6,
                        chargeback_percent: dec!(75),
                    },
                    ChargebackRate {
                        from_month: 7,
                        to_month: 12,
                        chargeback_percent: dec!(50),
                    },
                ],
                ..Default::default()
            },
            state_rules: vec![],
            meta: ProductMeta::default(),
        }
    }

    #[test]
    fn test_dealer_cost_lookup() {
        let product = create_test_product();

        assert_eq!(product.dealer_cost("60-100"), Some(dec!(850)));
        assert_eq!(product.dealer_cost("72-100"), Some(dec!(950)));
        assert_eq!(product.dealer_cost("nonexistent"), None);
    }

    #[test]
    fn test_max_profit() {
        let product = create_test_product();

        assert_eq!(product.max_profit("60-100"), Some(dec!(1145))); // 1995 - 850
        assert_eq!(product.max_profit("72-100"), Some(dec!(1345))); // 2295 - 950
    }

    #[test]
    fn test_vehicle_eligibility() {
        let product = create_test_product();

        // 2022 vehicle with 50k miles should be eligible
        assert!(product.is_vehicle_eligible(2022, 50000, "sedan"));

        // 2015 vehicle (9 years old) should not be eligible (max 7 years)
        assert!(!product.is_vehicle_eligible(2015, 50000, "sedan"));

        // Vehicle with 150k miles should not be eligible
        assert!(!product.is_vehicle_eligible(2022, 150000, "sedan"));
    }
}
