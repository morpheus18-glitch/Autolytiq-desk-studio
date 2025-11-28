//! Lender/lessor program profiles.
//!
//! Contains program configurations from banks, captive finance companies,
//! and lessors that define financing parameters and constraints.

use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use chrono::NaiveDate;

use super::{CreditTier, DealType, StateCode};

/// Program profile for a lender or lessor.
/// Defines financing terms, rate sheets, and constraints.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgramProfile {
    /// Unique identifier for this program
    pub id: String,

    /// Lender/lessor name
    pub name: String,

    /// Lender code (for integration)
    pub lender_code: String,

    /// Type of program (Finance or Lease)
    pub program_type: DealType,

    /// Whether this is a captive finance company (OEM)
    #[serde(default)]
    pub is_captive: bool,

    /// OEM brand (if captive)
    #[serde(default)]
    pub brand: Option<String>,

    /// Rate sheet configuration
    pub rate_sheet: RateSheet,

    /// Loan/lease structure constraints
    pub structure_rules: StructureRules,

    /// Fee configuration
    pub fee_config: ProgramFeeConfig,

    /// Eligibility requirements
    pub eligibility: EligibilityRules,

    /// Program metadata
    pub meta: ProgramMeta,
}

impl ProgramProfile {
    /// Look up the buy rate for a given tier and term
    pub fn get_buy_rate(&self, tier: CreditTier, term_months: u32) -> Option<Decimal> {
        self.rate_sheet
            .tiers
            .iter()
            .find(|t| t.tier == tier)?
            .rates
            .iter()
            .find(|r| term_months >= r.min_term && term_months <= r.max_term)
            .map(|r| r.rate)
    }

    /// Get the maximum markup/reserve for a given term
    pub fn max_reserve(&self, term_months: u32) -> Decimal {
        self.rate_sheet
            .reserve_caps
            .iter()
            .find(|r| term_months >= r.min_term && term_months <= r.max_term)
            .map(|r| r.max_points)
            .unwrap_or(self.rate_sheet.default_max_reserve)
    }

    /// Check if a deal amount is within program limits
    pub fn is_amount_eligible(&self, amount: Decimal) -> bool {
        if let Some(min) = self.structure_rules.min_amount_financed {
            if amount < min {
                return false;
            }
        }
        if let Some(max) = self.structure_rules.max_amount_financed {
            if amount > max {
                return false;
            }
        }
        true
    }
}

/// Rate sheet configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateSheet {
    /// Effective date of this rate sheet
    pub effective_date: NaiveDate,

    /// Expiration date
    #[serde(default)]
    pub expiration_date: Option<NaiveDate>,

    /// Rates by credit tier
    pub tiers: Vec<TierRates>,

    /// Reserve/markup caps by term
    #[serde(default)]
    pub reserve_caps: Vec<ReserveCap>,

    /// Default maximum reserve (points)
    #[serde(default)]
    pub default_max_reserve: Decimal,

    /// Special rates (subvented, promotional)
    #[serde(default)]
    pub special_rates: Vec<SpecialRate>,
}

/// Rates for a specific credit tier
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TierRates {
    /// Credit tier
    pub tier: CreditTier,

    /// Score range description
    #[serde(default)]
    pub score_range: Option<String>,

    /// Rates by term
    pub rates: Vec<TermRate>,
}

/// Rate for a specific term range
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TermRate {
    /// Minimum term (months)
    pub min_term: u32,

    /// Maximum term (months)
    pub max_term: u32,

    /// Buy rate (as decimal, e.g., 0.0599 for 5.99%)
    pub rate: Decimal,

    /// Whether this is a promotional rate
    #[serde(default)]
    pub promotional: bool,
}

/// Reserve/markup cap by term
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReserveCap {
    /// Minimum term (months)
    pub min_term: u32,

    /// Maximum term (months)
    pub max_term: u32,

    /// Maximum reserve points
    pub max_points: Decimal,
}

/// Special/promotional rate configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpecialRate {
    /// Program code
    pub code: String,

    /// Description
    pub description: String,

    /// The special rate
    pub rate: Decimal,

    /// Required credit tiers
    #[serde(default)]
    pub required_tiers: Vec<CreditTier>,

    /// Required vehicle models/programs
    #[serde(default)]
    pub vehicle_requirements: Vec<String>,

    /// Start date
    pub start_date: NaiveDate,

    /// End date
    pub end_date: NaiveDate,

    /// Whether this can be combined with dealer reserve
    #[serde(default)]
    pub allows_reserve: bool,

    /// Maximum reserve if allowed
    #[serde(default)]
    pub max_reserve_with_special: Option<Decimal>,
}

/// Structure rules and constraints
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct StructureRules {
    /// Minimum amount financed
    #[serde(default)]
    pub min_amount_financed: Option<Decimal>,

    /// Maximum amount financed
    #[serde(default)]
    pub max_amount_financed: Option<Decimal>,

    /// Minimum loan-to-value ratio
    #[serde(default)]
    pub min_ltv: Option<Decimal>,

    /// Maximum loan-to-value ratio
    #[serde(default)]
    pub max_ltv: Option<Decimal>,

    /// Minimum down payment percentage
    #[serde(default)]
    pub min_down_percent: Option<Decimal>,

    /// Available terms (months)
    #[serde(default)]
    pub available_terms: Vec<u32>,

    /// Maximum term by vehicle age
    #[serde(default)]
    pub max_term_by_age: Vec<VehicleAgeTerm>,

    /// Maximum vehicle age (years)
    #[serde(default)]
    pub max_vehicle_age: Option<u32>,

    /// Maximum vehicle mileage
    #[serde(default)]
    pub max_vehicle_mileage: Option<u32>,

    /// Maximum negative equity allowed
    #[serde(default)]
    pub max_negative_equity: Option<Decimal>,

    /// Negative equity as percent of value
    #[serde(default)]
    pub max_negative_equity_percent: Option<Decimal>,

    /// Whether balloon payments are allowed
    #[serde(default)]
    pub allows_balloon: bool,

    /// Maximum back-end products amount
    #[serde(default)]
    pub max_backend_amount: Option<Decimal>,

    /// Maximum back-end as percent of vehicle price
    #[serde(default)]
    pub max_backend_percent: Option<Decimal>,

    /// Payment-to-income ratio limit
    #[serde(default)]
    pub max_pti: Option<Decimal>,

    /// Debt-to-income ratio limit
    #[serde(default)]
    pub max_dti: Option<Decimal>,
}

/// Maximum term based on vehicle age
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VehicleAgeTerm {
    /// Vehicle age in years (0 = new)
    pub max_age: u32,
    /// Maximum term allowed
    pub max_term: u32,
}

/// Program fee configuration
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ProgramFeeConfig {
    /// Acquisition fee (lease)
    #[serde(default)]
    pub acquisition_fee: Decimal,

    /// Bank fee (finance)
    #[serde(default)]
    pub bank_fee: Decimal,

    /// Processing fee
    #[serde(default)]
    pub processing_fee: Decimal,

    /// Whether fees can be capitalized
    #[serde(default = "default_true")]
    pub fees_capitalizable: bool,

    /// Disposition fee (lease)
    #[serde(default)]
    pub disposition_fee: Decimal,

    /// Early termination fee structure
    #[serde(default)]
    pub early_termination: Option<EarlyTerminationFee>,
}

fn default_true() -> bool {
    true
}

/// Early termination fee configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EarlyTerminationFee {
    /// Flat fee amount
    #[serde(default)]
    pub flat_fee: Decimal,

    /// Remaining payments factor
    #[serde(default)]
    pub remaining_payment_factor: Decimal,

    /// Months after which no fee applies
    #[serde(default)]
    pub waived_after_months: Option<u32>,
}

/// Eligibility requirements
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct EligibilityRules {
    /// Required minimum credit tier
    #[serde(default)]
    pub min_credit_tier: Option<CreditTier>,

    /// Required minimum credit score
    #[serde(default)]
    pub min_credit_score: Option<u16>,

    /// States where program is available
    #[serde(default)]
    pub eligible_states: Vec<StateCode>,

    /// States where program is NOT available
    #[serde(default)]
    pub excluded_states: Vec<StateCode>,

    /// Vehicle types allowed
    #[serde(default)]
    pub eligible_vehicle_types: Vec<String>,

    /// Vehicle makes allowed (empty = all)
    #[serde(default)]
    pub eligible_makes: Vec<String>,

    /// Maximum months in business (for commercial)
    #[serde(default)]
    pub min_time_in_business_months: Option<u32>,

    /// First-time buyer allowed
    #[serde(default = "default_true")]
    pub allows_first_time_buyer: bool,

    /// Co-signer requirements
    #[serde(default)]
    pub co_signer_requirement: Option<String>,
}

/// Program metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgramMeta {
    /// Program version
    pub version: String,

    /// Last updated
    pub updated_at: NaiveDate,

    /// Contact information
    #[serde(default)]
    pub contact: Option<String>,

    /// Integration endpoint
    #[serde(default)]
    pub api_endpoint: Option<String>,

    /// Notes
    #[serde(default)]
    pub notes: Option<String>,

    /// Is program currently active
    #[serde(default = "default_true")]
    pub active: bool,
}

impl Default for ProgramMeta {
    fn default() -> Self {
        Self {
            version: "1.0.0".to_string(),
            updated_at: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            contact: None,
            api_endpoint: None,
            notes: None,
            active: true,
        }
    }
}

/// Lease-specific program configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeaseProgram {
    /// Base money factor by tier
    pub money_factors: Vec<TierMoneyFactor>,

    /// Residual values by term
    pub residuals: Vec<ResidualConfig>,

    /// Mileage options
    pub mileage_options: Vec<MileageOption>,

    /// Security deposit configuration
    pub security_deposit: SecurityDepositConfig,

    /// Multiple security deposit configuration
    #[serde(default)]
    pub msd_config: Option<MsdConfig>,

    /// Drive-off requirements
    #[serde(default)]
    pub drive_off_rules: DriveOffRules,
}

/// Money factor by credit tier
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TierMoneyFactor {
    /// Credit tier
    pub tier: CreditTier,

    /// Money factor
    pub money_factor: Decimal,

    /// Markup allowed
    #[serde(default)]
    pub max_markup: Option<Decimal>,
}

/// Residual value configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResidualConfig {
    /// Term in months
    pub term: u32,

    /// Base residual percentage (as decimal)
    pub base_residual: Decimal,

    /// Mileage adjustments
    #[serde(default)]
    pub mileage_adjustments: Vec<MileageAdjustment>,
}

/// Mileage option for leases
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MileageOption {
    /// Annual miles
    pub annual_miles: u32,

    /// Excess mileage charge
    pub excess_rate: Decimal,

    /// Residual adjustment from base
    #[serde(default)]
    pub residual_adjustment: Decimal,
}

/// Mileage adjustment to residual
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MileageAdjustment {
    /// Annual miles
    pub annual_miles: u32,
    /// Adjustment to residual (positive or negative)
    pub adjustment: Decimal,
}

/// Security deposit configuration
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct SecurityDepositConfig {
    /// Is security deposit required
    #[serde(default)]
    pub required: bool,

    /// Deposit amount calculation method
    #[serde(default)]
    pub calculation: DepositCalculation,

    /// Refund policy
    #[serde(default)]
    pub refundable: bool,
}

/// How security deposit is calculated
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DepositCalculation {
    #[default]
    OnePayment,
    TwoPayments,
    FlatAmount,
    Percentage,
}

/// Multiple Security Deposit configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MsdConfig {
    /// Is MSD available
    pub available: bool,

    /// Maximum number of MSDs
    pub max_count: u8,

    /// Money factor reduction per MSD
    pub mf_reduction_per_msd: Decimal,

    /// Amount per MSD (usually rounded payment)
    #[serde(default)]
    pub amount_rounding: MsdRounding,
}

/// MSD amount rounding method
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MsdRounding {
    #[default]
    NearestFifty,
    NearestHundred,
    ExactPayment,
}

/// Drive-off/inception rules
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DriveOffRules {
    /// Minimum cap cost reduction required
    #[serde(default)]
    pub min_cap_reduction: Option<Decimal>,

    /// Whether first payment is due at signing
    #[serde(default = "default_true")]
    pub first_payment_at_signing: bool,

    /// Whether security deposit is due at signing
    #[serde(default = "default_true")]
    pub security_deposit_at_signing: bool,

    /// Zero drive-off allowed
    #[serde(default)]
    pub zero_drive_off_allowed: bool,

    /// Sign-and-drive available
    #[serde(default)]
    pub sign_and_drive_available: bool,
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;

    fn create_test_program() -> ProgramProfile {
        ProgramProfile {
            id: "test-program".to_string(),
            name: "Test Bank Auto".to_string(),
            lender_code: "TBA".to_string(),
            program_type: DealType::Finance,
            is_captive: false,
            brand: None,
            rate_sheet: RateSheet {
                effective_date: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
                expiration_date: None,
                tiers: vec![
                    TierRates {
                        tier: CreditTier::Tier1,
                        score_range: Some("720+".to_string()),
                        rates: vec![
                            TermRate {
                                min_term: 24,
                                max_term: 36,
                                rate: dec!(0.0499),
                                promotional: false,
                            },
                            TermRate {
                                min_term: 37,
                                max_term: 60,
                                rate: dec!(0.0549),
                                promotional: false,
                            },
                            TermRate {
                                min_term: 61,
                                max_term: 72,
                                rate: dec!(0.0599),
                                promotional: false,
                            },
                        ],
                    },
                ],
                reserve_caps: vec![
                    ReserveCap {
                        min_term: 24,
                        max_term: 60,
                        max_points: dec!(2.5),
                    },
                    ReserveCap {
                        min_term: 61,
                        max_term: 72,
                        max_points: dec!(2.0),
                    },
                ],
                default_max_reserve: dec!(2.0),
                special_rates: vec![],
            },
            structure_rules: StructureRules {
                min_amount_financed: Some(dec!(5000)),
                max_amount_financed: Some(dec!(100000)),
                ..Default::default()
            },
            fee_config: ProgramFeeConfig::default(),
            eligibility: EligibilityRules::default(),
            meta: ProgramMeta::default(),
        }
    }

    #[test]
    fn test_get_buy_rate() {
        let program = create_test_program();

        assert_eq!(
            program.get_buy_rate(CreditTier::Tier1, 36),
            Some(dec!(0.0499))
        );
        assert_eq!(
            program.get_buy_rate(CreditTier::Tier1, 60),
            Some(dec!(0.0549))
        );
        assert_eq!(
            program.get_buy_rate(CreditTier::Tier1, 72),
            Some(dec!(0.0599))
        );
        assert_eq!(program.get_buy_rate(CreditTier::Tier2, 60), None);
    }

    #[test]
    fn test_max_reserve() {
        let program = create_test_program();

        assert_eq!(program.max_reserve(48), dec!(2.5));
        assert_eq!(program.max_reserve(72), dec!(2.0));
        assert_eq!(program.max_reserve(84), dec!(2.0)); // Falls back to default
    }

    #[test]
    fn test_amount_eligibility() {
        let program = create_test_program();

        assert!(!program.is_amount_eligible(dec!(4000)));
        assert!(program.is_amount_eligible(dec!(50000)));
        assert!(!program.is_amount_eligible(dec!(150000)));
    }
}
