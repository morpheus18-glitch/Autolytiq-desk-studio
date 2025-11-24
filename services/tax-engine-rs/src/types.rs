//! Tax Engine Type Definitions
//!
//! Rust types for the automotive tax calculation DSL.
//! These replace the TypeScript types with proper Rust type safety.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ============================================================================
// Trade-In Policy
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum TradeInPolicy {
    #[serde(rename = "NONE")]
    None { notes: Option<String> },
    #[serde(rename = "FULL")]
    Full { notes: Option<String> },
    #[serde(rename = "CAPPED")]
    Capped {
        cap_amount: f64,
        notes: Option<String>,
    },
    #[serde(rename = "PERCENT")]
    Percent {
        percent: f64,
        notes: Option<String>,
    },
}

// ============================================================================
// Rebate Rules
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RebateRule {
    pub applies_to: RebateType,
    pub taxable: bool,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RebateType {
    Manufacturer,
    Dealer,
    Any,
}

// ============================================================================
// Fee Tax Rules
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeeTaxRule {
    pub code: String,
    pub taxable: bool,
    pub notes: Option<String>,
}

// ============================================================================
// Vehicle Tax Scheme
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum VehicleTaxScheme {
    StateOnly,
    StatePlusLocal,
    LocalOnly,
    SpecialHut,
    SpecialTavt,
    DmvPrivilegeTax,
}

// ============================================================================
// Lease-Specific Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TitleFeeRule {
    pub code: String,
    pub taxable: bool,
    pub included_in_cap_cost: bool,
    pub included_in_upfront: bool,
    pub included_in_monthly: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum LeaseMethod {
    FullUpfront,
    Monthly,
    Hybrid,
    NetCapCost,
    ReducedBase,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum LeaseRebateBehavior {
    AlwaysTaxable,
    AlwaysNonTaxable,
    FollowRetailRule,
    NonTaxableIfAtSigning,
    NonTaxableIfAssignable,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum LeaseDocFeeTaxability {
    Always,
    FollowRetailRule,
    Never,
    OnlyUpfront,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum LeaseTradeInCreditMode {
    None,
    Full,
    CapCostOnly,
    AppliedToPayment,
    FollowRetailRule,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeaseTaxRules {
    pub method: LeaseMethod,
    pub tax_cap_reduction: bool,
    pub rebate_behavior: LeaseRebateBehavior,
    pub doc_fee_taxability: LeaseDocFeeTaxability,
    pub trade_in_credit: LeaseTradeInCreditMode,
    pub negative_equity_taxable: bool,
    pub fee_tax_rules: Vec<FeeTaxRule>,
    pub title_fee_rules: Vec<TitleFeeRule>,
    pub tax_fees_upfront: bool,
}

// ============================================================================
// Reciprocity (Cross-State Tax Credit)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ReciprocityMode {
    None,
    CreditUpToStateRate,
    CreditFull,
    HomeStateOnly,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ReciprocityScope {
    None,
    RetailOnly,
    LeaseOnly,
    Both,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReciprocityRules {
    pub enabled: bool,
    pub scope: ReciprocityScope,
    pub home_state_behavior: ReciprocityMode,
    pub require_proof_of_tax_paid: bool,
    pub basis: ReciprocityBasis,
    pub cap_at_this_states_tax: bool,
    pub has_lease_exception: bool,
    pub exempt_states: Option<Vec<String>>,
    pub non_reciprocal_states: Option<Vec<String>>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ReciprocityBasis {
    TaxPaid,
    TaxDueAtOtherStateRate,
}

// ============================================================================
// State Extras (Special Configurations)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalJurisdictionConfig {
    pub rate: Option<f64>,
    pub base_rate: Option<f64>,
    pub county_rate: Option<f64>,
    pub city_rate: Option<f64>,
    pub special_rate: Option<f64>,
    pub effective_rate: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalTaxRange {
    pub min: f64,
    pub max: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateExtras {
    pub local_tax_range: Option<LocalTaxRange>,
    pub local_jurisdictions: Option<HashMap<String, LocalJurisdictionConfig>>,
}

// ============================================================================
// Complete State Configuration
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxRulesConfig {
    pub state_code: String,
    pub version: u32,
    pub trade_in_policy: TradeInPolicy,
    pub rebates: Vec<RebateRule>,
    pub doc_fee_taxable: bool,
    pub fee_tax_rules: Vec<FeeTaxRule>,
    pub tax_on_accessories: bool,
    pub tax_on_negative_equity: bool,
    pub tax_on_service_contracts: bool,
    pub tax_on_gap: bool,
    pub vehicle_tax_scheme: VehicleTaxScheme,
    pub vehicle_uses_local_sales_tax: bool,
    pub lease_rules: LeaseTaxRules,
    pub reciprocity: ReciprocityRules,
    pub extras: Option<StateExtras>,
}

// ============================================================================
// Tax Calculation Input/Output
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxCalculationInput {
    pub state_code: String,
    pub deal_type: DealType,
    pub vehicle_price: f64,
    pub trade_allowance: Option<f64>,
    pub trade_payoff: Option<f64>,
    pub down_payment: Option<f64>,
    pub rebates: Option<f64>,
    pub dealer_fees: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DealType {
    Retail,
    Lease,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxCalculationResult {
    pub state_tax: f64,
    pub local_tax: f64,
    pub total_tax: f64,
    pub taxable_amount: f64,
    pub effective_rate: f64,
}
