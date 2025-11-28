//! Type definitions for the UDC Engine.
//!
//! This module contains all the core data structures used throughout
//! the Unified Deal Cipher calculation pipeline.
//!
//! # Module Organization
//!
//! - `deal` - Deal input types (the "plaintext")
//! - `deal_input` - Extended deal input types with fees, customers, etc.
//! - `money` - Precise financial primitives (Money, Rate, MoneyFactor)
//! - `profiles` - Rule, Program, and Product profiles (the "keys")
//! - `rule_profile` - Detailed state tax rules
//! - `program_profile` - Lender/lessor program parameters
//! - `product_profile` - F&I product definitions
//! - `output` - Calculation results (the "ciphertext")

pub mod deal;
pub mod deal_input;
pub mod money;
pub mod output;
pub mod profiles;
pub mod rule_profile;
pub mod program_profile;
pub mod product_profile;

// Re-export primary types - use explicit imports to avoid ambiguity
// deal_input.rs is the canonical DealInput used by the pipeline
pub use deal_input::{
    DealInput, DealFees, CustomerInfo, CustomerType, FinanceParams, LeaseParams,
    Rebate, RebateType, Product, ProductType, OtherFee,
};

// deal.rs types that don't conflict
pub use deal::{
    DealType, VehicleCondition, RebateSource, TradeIn, Fee, Vehicle, Jurisdiction, FiProduct,
};

// Money types
pub use money::*;

// Output types
pub use output::*;

// rule_profile.rs is the canonical RuleProfile used by the pipeline
pub use rule_profile::{
    RuleProfile, TaxRates, BaseRules, AncillaryRules, ReciprocityRules,
    PartialCreditState, ProfileMeta, LeaseTaxConfig,
};

// profiles.rs types that don't conflict with rule_profile
pub use profiles::{
    TradeInTaxTreatment, RebateTaxTreatment, LeaseTaxMode, TaxStackingMode,
    ReciprocityType, SpecialTaxType, TaxRateComponent, RoundingMode, FeeCapitalization,
    ResidualEntry,
};

// program_profile.rs is the canonical ProgramProfile
pub use program_profile::{
    ProgramProfile, RateSheet, TierRates, TermRate, ReserveCap, SpecialRate,
    StructureRules, VehicleAgeTerm, ProgramFeeConfig, EarlyTerminationFee,
    EligibilityRules, ProgramMeta, LeaseProgram, TierMoneyFactor, ResidualConfig,
    MileageOption, MileageAdjustment, SecurityDepositConfig, DepositCalculation,
    MsdConfig, MsdRounding, DriveOffRules,
};

// product_profile.rs is the canonical ProductProfile
pub use product_profile::{
    ProductProfile, ProviderInfo, ProductPricing, PricingModel, RateTable, RateTier,
    CoverageOption, Surcharge, SurchargeType, ProductEligibility, CommissionStructure,
    CommissionType, CommissionTier, ChargebackRate, StateProductRule, ProductMeta,
    ProductCatalog, ProductBundle, CatalogMeta,
};

use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use strum::{Display, EnumString};
use thiserror::Error;

/// US State codes (50 states + DC + territories)
#[derive(
    Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, EnumString, Display,
)]
#[strum(serialize_all = "UPPERCASE")]
#[serde(rename_all = "UPPERCASE")]
pub enum StateCode {
    AL, AK, AZ, AR, CA, CO, CT, DE, DC, FL,
    GA, HI, ID, IL, IN, IA, KS, KY, LA, ME,
    MD, MA, MI, MN, MS, MO, MT, NE, NV, NH,
    NJ, NM, NY, NC, ND, OH, OK, OR, PA, RI,
    SC, SD, TN, TX, UT, VT, VA, WA, WV, WI,
    WY, PR, VI, GU, AS, MP,
}

impl StateCode {
    /// Convert from string slice
    pub fn from_str_opt(s: &str) -> Option<Self> {
        s.parse().ok()
    }
}

/// Tax types used by different jurisdictions
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, EnumString, Display)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TaxType {
    /// Standard sales tax
    Sales,
    /// Use tax (typically for out-of-state purchases)
    Use,
    /// Title Ad Valorem Tax (Georgia)
    Tavt,
    /// Highway Use Tax (North Carolina)
    Hut,
    /// Excise tax (various states)
    Excise,
    /// No tax
    None,
}

/// Credit tier for rate determination
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, EnumString, Display)]
#[serde(rename_all = "snake_case")]
pub enum CreditTier {
    /// 720+ (Excellent)
    Tier1,
    /// 680-719 (Good)
    Tier2,
    /// 640-679 (Fair)
    Tier3,
    /// 600-639 (Below Average)
    Tier4,
    /// Below 600 (Poor)
    Tier5,
    /// Deep subprime
    Tier6,
}

impl CreditTier {
    /// Determine tier from credit score
    pub fn from_score(score: u16) -> Self {
        match score {
            720..=850 => CreditTier::Tier1,
            680..=719 => CreditTier::Tier2,
            640..=679 => CreditTier::Tier3,
            600..=639 => CreditTier::Tier4,
            500..=599 => CreditTier::Tier5,
            _ => CreditTier::Tier6,
        }
    }
}

/// Common error type for UDC operations
#[derive(Debug, Clone, Error, Serialize, Deserialize)]
pub enum UdcError {
    #[error("Validation error: {message}")]
    Validation { message: String, field: Option<String> },

    #[error("Calculation error in phase {phase}: {message}")]
    Calculation { message: String, phase: String },

    #[error("Profile not found: {profile_type} for {identifier}")]
    ProfileNotFound { profile_type: String, identifier: String },

    #[error("State rule error: {message} for state {state}")]
    StateRule { message: String, state: String },

    #[error("Serialization error: {message}")]
    Serialization { message: String },

    #[error("WASM error: {message}")]
    Wasm { message: String },

    #[error("Internal error: {message}")]
    Internal { message: String },
}

impl UdcError {
    pub fn validation(message: impl Into<String>) -> Self {
        UdcError::Validation {
            message: message.into(),
            field: None,
        }
    }

    pub fn validation_field(message: impl Into<String>, field: impl Into<String>) -> Self {
        UdcError::Validation {
            message: message.into(),
            field: Some(field.into()),
        }
    }

    pub fn calculation(message: impl Into<String>, phase: impl Into<String>) -> Self {
        UdcError::Calculation {
            message: message.into(),
            phase: phase.into(),
        }
    }

    pub fn profile_not_found(profile_type: impl Into<String>, identifier: impl Into<String>) -> Self {
        UdcError::ProfileNotFound {
            profile_type: profile_type.into(),
            identifier: identifier.into(),
        }
    }

    pub fn state_rule(message: impl Into<String>, state: impl Into<String>) -> Self {
        UdcError::StateRule {
            message: message.into(),
            state: state.into(),
        }
    }

    pub fn serialization(message: impl Into<String>) -> Self {
        UdcError::Serialization {
            message: message.into(),
        }
    }

    pub fn wasm(message: impl Into<String>) -> Self {
        UdcError::Wasm {
            message: message.into(),
        }
    }

    pub fn internal(message: impl Into<String>) -> Self {
        UdcError::Internal {
            message: message.into(),
        }
    }
}

/// Result type alias for UDC operations
pub type UdcResult<T> = Result<T, UdcError>;

/// Decimal extension trait for financial calculations
pub trait DecimalExt {
    /// Round to 2 decimal places using banker's rounding
    fn round_money(self) -> Decimal;
    /// Round to specified decimal places using banker's rounding
    fn round_dp_banker(self, dp: u32) -> Decimal;
    /// Ceiling to specified decimal places
    fn ceil_dp(self, dp: u32) -> Decimal;
    /// Floor to specified decimal places
    fn floor_dp(self, dp: u32) -> Decimal;
}

impl DecimalExt for Decimal {
    fn round_money(self) -> Decimal {
        self.round_dp(2)
    }

    fn round_dp_banker(self, dp: u32) -> Decimal {
        self.round_dp(dp)
    }

    fn ceil_dp(self, dp: u32) -> Decimal {
        let scale = Decimal::new(10_i64.pow(dp), 0);
        (self * scale).ceil() / scale
    }

    fn floor_dp(self, dp: u32) -> Decimal {
        let scale = Decimal::new(10_i64.pow(dp), 0);
        (self * scale).floor() / scale
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;

    #[test]
    fn test_credit_tier_from_score() {
        assert_eq!(CreditTier::from_score(750), CreditTier::Tier1);
        assert_eq!(CreditTier::from_score(700), CreditTier::Tier2);
        assert_eq!(CreditTier::from_score(660), CreditTier::Tier3);
        assert_eq!(CreditTier::from_score(620), CreditTier::Tier4);
        assert_eq!(CreditTier::from_score(580), CreditTier::Tier5);
        assert_eq!(CreditTier::from_score(450), CreditTier::Tier6);
    }

    #[test]
    fn test_decimal_ext() {
        assert_eq!(dec!(10.125).round_money(), dec!(10.12)); // Banker's rounding
        assert_eq!(dec!(10.126).round_money(), dec!(10.13));
        assert_eq!(dec!(10.121).ceil_dp(2), dec!(10.13));
        assert_eq!(dec!(10.129).floor_dp(2), dec!(10.12));
    }
}
