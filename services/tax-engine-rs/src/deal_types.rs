//! Deal Calculator Type Definitions
//!
//! Comprehensive types for automotive deal calculations:
//! - Cash deals
//! - Finance deals (retail installment)
//! - Lease deals
//!
//! Designed to match or exceed Reynolds, CDK, VinSolutions functionality.

use serde::{Deserialize, Serialize};

// ============================================================================
// Deal Input Types
// ============================================================================

/// Complete deal calculation input
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DealInput {
    pub deal_type: DealTypeEnum,
    pub state_code: String,
    pub local_jurisdiction: Option<String>,

    // Vehicle pricing
    pub vehicle_msrp: f64,
    pub vehicle_invoice: Option<f64>,
    pub selling_price: f64,

    // Trade-in
    pub trade_in: Option<TradeInInput>,

    // Rebates and incentives
    pub rebates: Vec<RebateInput>,

    // Down payment
    pub cash_down: f64,

    // F&I Products
    pub fi_products: Vec<FIProductInput>,

    // Fees
    pub fees: Vec<FeeInput>,

    // Finance-specific (for FINANCE deals)
    pub finance_input: Option<FinanceInput>,

    // Lease-specific (for LEASE deals)
    pub lease_input: Option<LeaseInput>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DealTypeEnum {
    Cash,
    Finance,
    Lease,
}

/// Trade-in vehicle input
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradeInInput {
    pub gross_allowance: f64,
    pub payoff_amount: f64,
    pub payoff_good_through: Option<String>,
    pub per_diem: Option<f64>,
    pub acv: Option<f64>, // Actual Cash Value
    pub year: Option<u16>,
    pub make: Option<String>,
    pub model: Option<String>,
    pub vin: Option<String>,
    pub mileage: Option<u32>,
}

impl TradeInInput {
    /// Calculate net trade-in value (allowance minus payoff)
    pub fn net_value(&self) -> f64 {
        self.gross_allowance - self.payoff_amount
    }

    /// Calculate negative equity (if any)
    pub fn negative_equity(&self) -> f64 {
        (self.payoff_amount - self.gross_allowance).max(0.0)
    }

    /// Calculate positive equity (if any)
    pub fn positive_equity(&self) -> f64 {
        (self.gross_allowance - self.payoff_amount).max(0.0)
    }
}

/// Rebate/incentive input
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RebateInput {
    pub name: String,
    pub amount: f64,
    pub rebate_type: RebateTypeEnum,
    pub taxable: Option<bool>, // If None, use state rules
    pub apply_to_cap_cost: bool, // For leases
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RebateTypeEnum {
    Manufacturer,
    Dealer,
    Loyalty,
    Conquest,
    Military,
    College,
    Other,
}

/// F&I Product input
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FIProductInput {
    pub name: String,
    pub code: FIProductCode,
    pub price: f64,
    pub cost: Option<f64>,
    pub term_months: Option<u16>,
    pub deductible: Option<f64>,
    pub taxable: Option<bool>, // If None, use state rules
    pub finance_with_deal: bool,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum FIProductCode {
    ExtendedWarranty,
    ServiceContract,
    GapInsurance,
    TireWheel,
    PaintProtection,
    FabricProtection,
    KeyReplacement,
    TheftProtection,
    MaintenancePlan,
    WearCare,
    DentRepair,
    WindshieldProtection,
    Other,
}

/// Fee input
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeeInput {
    pub name: String,
    pub code: FeeCode,
    pub amount: f64,
    pub taxable: Option<bool>, // If None, use state rules
    pub capitalize_in_lease: bool,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum FeeCode {
    DocFee,
    TitleFee,
    RegistrationFee,
    LicenseFee,
    PlateFee,
    TempTagFee,
    ElectronicFilingFee,
    NotaryFee,
    LienFee,
    InspectionFee,
    EmissionsFee,
    TireFee,
    BatteryFee,
    DealerPrepFee,
    DestinationFee,
    AcquisitionFee,
    DispositionFee,
    SecurityDeposit,
    Other,
}

// ============================================================================
// Finance-Specific Input
// ============================================================================

/// Finance (retail installment) input
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinanceInput {
    pub apr: f64,
    pub term_months: u16,
    pub first_payment_days: Option<u16>, // Days until first payment
    pub payment_frequency: PaymentFrequency,
    pub lender_name: Option<String>,
    pub lender_fees: Option<f64>,
    pub buy_rate: Option<f64>, // Dealer cost rate
    pub cap_rate: Option<f64>, // Max allowed rate
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum PaymentFrequency {
    #[default]
    Monthly,
    BiWeekly,
    Weekly,
}

impl PaymentFrequency {
    pub fn periods_per_year(&self) -> f64 {
        match self {
            PaymentFrequency::Monthly => 12.0,
            PaymentFrequency::BiWeekly => 26.0,
            PaymentFrequency::Weekly => 52.0,
        }
    }
}

// ============================================================================
// Lease-Specific Input
// ============================================================================

/// Lease input
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeaseInput {
    pub term_months: u16,
    pub annual_mileage: u32,
    pub excess_mileage_rate: f64,

    // Residual value
    pub residual_percent: f64, // Percent of MSRP
    pub residual_value: Option<f64>, // Override if provided

    // Money factor (lease rate)
    pub money_factor: f64,
    pub buy_rate_mf: Option<f64>, // Dealer cost money factor

    // Security deposit
    pub security_deposit: f64,
    pub security_deposit_waived: bool,

    // Multiple security deposit program
    pub msd_count: Option<u8>,
    pub msd_rate_reduction: Option<f64>,

    // First payment timing
    pub first_payment_due_at_signing: bool,

    // Lease-specific fees
    pub acquisition_fee: f64,
    pub acquisition_fee_cap: bool, // Include in cap cost
    pub disposition_fee: f64,
    pub disposition_fee_waived: bool,

    // Drive-off options
    pub sign_and_drive: bool, // Zero due at signing
    pub one_pay_lease: bool, // Single upfront payment
}

// ============================================================================
// Deal Output Types
// ============================================================================

/// Complete deal calculation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DealResult {
    pub deal_type: DealTypeEnum,
    pub is_valid: bool,
    pub validation_errors: Vec<String>,

    // Price breakdown
    pub price_breakdown: PriceBreakdown,

    // Tax breakdown
    pub tax_breakdown: TaxBreakdown,

    // Payment information
    pub payment_info: PaymentInfo,

    // Profit analysis
    pub profit_analysis: ProfitAnalysis,

    // Summary totals
    pub totals: DealTotals,

    // For multiple scenarios
    pub payment_matrix: Option<PaymentMatrix>,
}

/// Price breakdown
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PriceBreakdown {
    pub vehicle_msrp: f64,
    pub vehicle_invoice: Option<f64>,
    pub selling_price: f64,

    // Adjustments
    pub trade_allowance: f64,
    pub trade_payoff: f64,
    pub net_trade: f64,
    pub total_rebates: f64,
    pub taxable_rebates: f64,
    pub non_taxable_rebates: f64,

    // F&I
    pub total_fi_products: f64,
    pub financed_fi_products: f64,
    pub cash_fi_products: f64,

    // Fees
    pub total_fees: f64,
    pub taxable_fees: f64,
    pub non_taxable_fees: f64,
    pub capitalized_fees: f64, // For leases

    // Cash
    pub cash_down: f64,

    // For leases
    pub gross_cap_cost: Option<f64>,
    pub cap_cost_reduction: Option<f64>,
    pub adjusted_cap_cost: Option<f64>,
    pub residual_value: Option<f64>,
}

/// Tax breakdown
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxBreakdown {
    pub taxable_amount: f64,
    pub state_tax_rate: f64,
    pub local_tax_rate: f64,
    pub combined_rate: f64,
    pub state_tax: f64,
    pub local_tax: f64,
    pub total_tax: f64,

    // Tax timing (for leases)
    pub upfront_tax: f64,
    pub monthly_tax: f64,

    // Special taxes
    pub title_tax: Option<f64>,
    pub luxury_tax: Option<f64>,
    pub special_tax: Option<f64>,

    // Breakdown by component
    pub tax_on_vehicle: f64,
    pub tax_on_fees: f64,
    pub tax_on_fi_products: f64,
}

/// Payment information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentInfo {
    pub payment: f64,
    pub payment_with_tax: f64,
    pub term_months: u16,
    pub payment_frequency: PaymentFrequency,

    // Finance-specific
    pub apr: Option<f64>,
    pub total_of_payments: Option<f64>,
    pub total_interest: Option<f64>,
    pub finance_charge: Option<f64>,

    // Lease-specific
    pub money_factor: Option<f64>,
    pub equivalent_apr: Option<f64>,
    pub depreciation: Option<f64>,
    pub rent_charge: Option<f64>,
    pub monthly_depreciation: Option<f64>,
    pub monthly_rent_charge: Option<f64>,

    // Due at signing
    pub due_at_signing: f64,
    pub first_payment: f64,
    pub security_deposit: f64,
    pub upfront_taxes: f64,
    pub upfront_fees: f64,
}

/// Profit analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfitAnalysis {
    pub front_end_gross: f64,
    pub back_end_gross: f64,
    pub total_gross: f64,

    // Front-end detail
    pub vehicle_gross: f64,
    pub holdback: Option<f64>,
    pub pack: Option<f64>,

    // Back-end detail
    pub fi_gross: f64,
    pub reserve: f64, // Finance reserve

    // Trade analysis
    pub trade_acv: Option<f64>,
    pub trade_over_allow: Option<f64>,
}

/// Summary totals
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DealTotals {
    pub amount_financed: f64,
    pub total_sale_price: f64,
    pub total_due: f64,
    pub balance_due: f64,
    pub total_drive_off: f64,

    // For TILA disclosure
    pub amount_financed_tila: f64,
    pub finance_charge_tila: f64,
    pub total_of_payments_tila: f64,
    pub total_sale_price_tila: f64,
}

/// Payment matrix for showing multiple scenarios
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentMatrix {
    pub scenarios: Vec<PaymentScenario>,
}

/// Single payment scenario
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentScenario {
    pub term_months: u16,
    pub rate: f64,
    pub payment: f64,
    pub total_interest: f64,
    pub total_cost: f64,
}

// ============================================================================
// Amortization Schedule
// ============================================================================

/// Amortization schedule
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AmortizationSchedule {
    pub payments: Vec<AmortizationPayment>,
    pub summary: AmortizationSummary,
}

/// Single amortization payment
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AmortizationPayment {
    pub payment_number: u16,
    pub payment_date: String,
    pub beginning_balance: f64,
    pub scheduled_payment: f64,
    pub principal: f64,
    pub interest: f64,
    pub ending_balance: f64,
    pub cumulative_interest: f64,
    pub cumulative_principal: f64,
}

/// Amortization summary
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AmortizationSummary {
    pub total_payments: f64,
    pub total_principal: f64,
    pub total_interest: f64,
    pub average_payment: f64,
}
