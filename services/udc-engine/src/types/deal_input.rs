//! Input types for deal calculation.
//!
//! These structures represent all the data needed to calculate a deal.

use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use chrono::NaiveDate;

use super::{DealType, Money, StateCode};

/// Primary input structure for the UDC engine.
/// Contains all information needed to calculate a deal.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DealInput {
    /// Type of transaction (Cash, Finance, Lease)
    pub deal_type: DealType,

    /// Vehicle selling price (agreed upon price before rebates/incentives)
    pub vehicle_price: Decimal,

    /// Trade-in vehicle value (if any)
    #[serde(default)]
    pub trade_in_value: Option<Decimal>,

    /// Amount owed on trade-in vehicle (if any)
    #[serde(default)]
    pub trade_in_payoff: Option<Decimal>,

    /// Cash down payment from customer
    #[serde(default)]
    pub cash_down: Decimal,

    /// Manufacturer/dealer rebates and incentives
    #[serde(default)]
    pub rebates: Vec<Rebate>,

    /// F&I products being added to the deal
    #[serde(default)]
    pub products: Vec<Product>,

    /// Deal fees (doc fee, registration, etc.)
    pub fees: DealFees,

    /// Customer's home/registration state
    pub home_state: StateCode,

    /// State where transaction occurs (dealership location)
    pub transaction_state: StateCode,

    /// State where vehicle will be garaged (for lease)
    #[serde(default)]
    pub garaging_state: Option<StateCode>,

    /// Customer information
    pub customer: CustomerInfo,

    /// Finance-specific parameters (for Finance deals)
    #[serde(default)]
    pub finance_params: Option<FinanceParams>,

    /// Lease-specific parameters (for Lease deals)
    #[serde(default)]
    pub lease_params: Option<LeaseParams>,

    /// Deal date (defaults to today if not specified)
    #[serde(default)]
    pub deal_date: Option<NaiveDate>,

    /// First payment date (calculated if not provided)
    #[serde(default)]
    pub first_payment_date: Option<NaiveDate>,
}

impl DealInput {
    /// Calculate the net trade-in value (value minus payoff)
    pub fn net_trade(&self) -> Decimal {
        let value = self.trade_in_value.unwrap_or_default();
        let payoff = self.trade_in_payoff.unwrap_or_default();
        value - payoff
    }

    /// Check if there is negative equity in the trade
    pub fn has_negative_equity(&self) -> bool {
        self.net_trade() < Decimal::ZERO
    }

    /// Total rebates amount
    pub fn total_rebates(&self) -> Decimal {
        self.rebates.iter().map(|r| r.amount).sum()
    }

    /// Calculate total F&I products cost
    pub fn total_products(&self) -> Decimal {
        self.products.iter().map(|p| p.price).sum()
    }
}

/// Rebate or incentive applied to the deal
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Rebate {
    /// Unique identifier for the rebate
    pub id: String,

    /// Display name
    pub name: String,

    /// Rebate amount
    pub amount: Decimal,

    /// Type of rebate
    pub rebate_type: RebateType,

    /// Whether this rebate is taxable (reduces taxable amount)
    #[serde(default = "default_true")]
    pub reduces_tax_basis: bool,

    /// Program code from manufacturer
    #[serde(default)]
    pub program_code: Option<String>,
}

fn default_true() -> bool {
    true
}

/// Classification of rebate types
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RebateType {
    /// Manufacturer cash rebate
    Manufacturer,
    /// Dealer cash/discount
    Dealer,
    /// Loyalty/conquest incentive
    Loyalty,
    /// Military discount
    Military,
    /// College graduate discount
    CollegeGrad,
    /// First responder discount
    FirstResponder,
    /// Other incentive
    Other,
}

/// F&I product being added to the deal
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Product {
    /// Unique identifier
    pub id: String,

    /// Product name
    pub name: String,

    /// Selling price
    pub price: Decimal,

    /// Dealer cost (for profit calculations)
    #[serde(default)]
    pub cost: Decimal,

    /// Product type/category
    pub product_type: ProductType,

    /// Term in months (for term-based products)
    #[serde(default)]
    pub term_months: Option<u32>,

    /// Mileage limit (for VSC/maintenance)
    #[serde(default)]
    pub mileage_limit: Option<u32>,

    /// Deductible amount (for VSC)
    #[serde(default)]
    pub deductible: Option<Decimal>,

    /// Whether this product is taxable in the transaction state
    #[serde(default = "default_true")]
    pub taxable: bool,
}

/// F&I product categories
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProductType {
    /// Vehicle Service Contract / Extended Warranty
    Vsc,
    /// GAP Insurance
    Gap,
    /// Tire & Wheel Protection
    TireWheel,
    /// Paint & Interior Protection
    Appearance,
    /// Prepaid Maintenance
    Maintenance,
    /// Key Replacement
    KeyReplacement,
    /// Theft Protection / Etch
    TheftProtection,
    /// Windshield Protection
    Windshield,
    /// Dent Protection (PDR)
    DentProtection,
    /// Credit Life Insurance
    CreditLife,
    /// Credit Disability Insurance
    CreditDisability,
    /// Other product
    Other,
}

/// Fees associated with the deal
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DealFees {
    /// Documentary/administrative fee
    #[serde(default)]
    pub doc_fee: Decimal,

    /// Title fee
    #[serde(default)]
    pub title_fee: Decimal,

    /// Registration/license fee
    #[serde(default)]
    pub registration_fee: Decimal,

    /// Plate fee
    #[serde(default)]
    pub plate_fee: Decimal,

    /// Inspection fee
    #[serde(default)]
    pub inspection_fee: Decimal,

    /// Electronic filing fee
    #[serde(default)]
    pub electronic_filing_fee: Decimal,

    /// Tire fee (environmental)
    #[serde(default)]
    pub tire_fee: Decimal,

    /// Smog/emissions fee
    #[serde(default)]
    pub smog_fee: Decimal,

    /// Destination/freight charge
    #[serde(default)]
    pub destination_fee: Decimal,

    /// Dealer handling/prep fee
    #[serde(default)]
    pub dealer_handling_fee: Decimal,

    /// Acquisition fee (lease)
    #[serde(default)]
    pub acquisition_fee: Decimal,

    /// Disposition fee (lease - usually not upfront)
    #[serde(default)]
    pub disposition_fee: Decimal,

    /// Other miscellaneous fees
    #[serde(default)]
    pub other_fees: Vec<OtherFee>,
}

impl DealFees {
    /// Sum of all government/regulatory fees
    pub fn total_government_fees(&self) -> Decimal {
        self.title_fee
            + self.registration_fee
            + self.plate_fee
            + self.inspection_fee
            + self.tire_fee
            + self.smog_fee
    }

    /// Sum of all dealer fees
    pub fn total_dealer_fees(&self) -> Decimal {
        self.doc_fee
            + self.electronic_filing_fee
            + self.destination_fee
            + self.dealer_handling_fee
            + self.other_fees.iter().filter(|f| f.dealer_fee).map(|f| f.amount).sum::<Decimal>()
    }

    /// Total of all fees
    pub fn total(&self) -> Decimal {
        self.doc_fee
            + self.title_fee
            + self.registration_fee
            + self.plate_fee
            + self.inspection_fee
            + self.electronic_filing_fee
            + self.tire_fee
            + self.smog_fee
            + self.destination_fee
            + self.dealer_handling_fee
            + self.acquisition_fee
            + self.other_fees.iter().map(|f| f.amount).sum::<Decimal>()
    }
}

/// Custom fee entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OtherFee {
    /// Fee name/description
    pub name: String,
    /// Fee amount
    pub amount: Decimal,
    /// Is this a dealer fee (vs government)
    #[serde(default)]
    pub dealer_fee: bool,
    /// Is this fee taxable
    #[serde(default)]
    pub taxable: bool,
}

/// Customer information
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CustomerInfo {
    /// Customer type
    #[serde(default)]
    pub customer_type: CustomerType,

    /// Credit tier (for rate lookup)
    #[serde(default)]
    pub credit_tier: Option<CreditTier>,

    /// Specific credit score if known
    #[serde(default)]
    pub credit_score: Option<u16>,

    /// Tax exempt status
    #[serde(default)]
    pub tax_exempt: bool,

    /// Tax exemption certificate number
    #[serde(default)]
    pub tax_exempt_cert: Option<String>,

    /// Whether customer is a military member (for discounts)
    #[serde(default)]
    pub is_military: bool,

    /// Zip code (for local tax calculations)
    #[serde(default)]
    pub zip_code: Option<String>,

    /// County (for local tax calculations)
    #[serde(default)]
    pub county: Option<String>,

    /// City (for local tax calculations)
    #[serde(default)]
    pub city: Option<String>,
}

/// Customer type classification
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CustomerType {
    #[default]
    Individual,
    Business,
    FleetCommercial,
    Government,
    NonProfit,
}

/// Credit tier for rate determination
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
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

/// Finance-specific parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinanceParams {
    /// Term in months
    pub term_months: u32,

    /// Annual Percentage Rate (as decimal, e.g., 0.0599 for 5.99%)
    pub apr: Decimal,

    /// Lender/bank ID
    #[serde(default)]
    pub lender_id: Option<String>,

    /// Buy rate (dealer cost rate)
    #[serde(default)]
    pub buy_rate: Option<Decimal>,

    /// Maximum dealer reserve points allowed
    #[serde(default)]
    pub max_reserve_points: Option<Decimal>,

    /// Whether to defer first payment
    #[serde(default)]
    pub deferred_first_payment: bool,

    /// Days to first payment (if deferred)
    #[serde(default)]
    pub days_to_first_payment: Option<u32>,
}

/// Lease-specific parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeaseParams {
    /// Lease term in months
    pub term_months: u32,

    /// Money factor (rent charge factor)
    pub money_factor: Decimal,

    /// Residual percentage (as decimal, e.g., 0.52 for 52%)
    pub residual_percent: Decimal,

    /// Annual mileage allowance
    pub annual_miles: u32,

    /// Excess mileage charge per mile
    #[serde(default)]
    pub excess_mileage_rate: Option<Decimal>,

    /// Lessor/captive ID
    #[serde(default)]
    pub lessor_id: Option<String>,

    /// Multiple Security Deposit count (0-9)
    #[serde(default)]
    pub msd_count: u8,

    /// Security deposit amount (if not MSD)
    #[serde(default)]
    pub security_deposit: Option<Decimal>,

    /// Whether acquisition fee is capitalized
    #[serde(default = "default_true")]
    pub cap_acquisition_fee: bool,

    /// Cap cost reduction (additional to down payment)
    #[serde(default)]
    pub cap_cost_reduction: Decimal,
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;

    #[test]
    fn test_net_trade_positive() {
        let input = DealInput {
            deal_type: DealType::Finance,
            vehicle_price: dec!(30000),
            trade_in_value: Some(dec!(8000)),
            trade_in_payoff: Some(dec!(5000)),
            cash_down: dec!(2000),
            rebates: vec![],
            products: vec![],
            fees: DealFees::default(),
            home_state: StateCode::TX,
            transaction_state: StateCode::TX,
            garaging_state: None,
            customer: CustomerInfo::default(),
            finance_params: None,
            lease_params: None,
            deal_date: None,
            first_payment_date: None,
        };

        assert_eq!(input.net_trade(), dec!(3000));
        assert!(!input.has_negative_equity());
    }

    #[test]
    fn test_net_trade_negative_equity() {
        let input = DealInput {
            deal_type: DealType::Finance,
            vehicle_price: dec!(30000),
            trade_in_value: Some(dec!(5000)),
            trade_in_payoff: Some(dec!(8000)),
            cash_down: dec!(2000),
            rebates: vec![],
            products: vec![],
            fees: DealFees::default(),
            home_state: StateCode::TX,
            transaction_state: StateCode::TX,
            garaging_state: None,
            customer: CustomerInfo::default(),
            finance_params: None,
            lease_params: None,
            deal_date: None,
            first_payment_date: None,
        };

        assert_eq!(input.net_trade(), dec!(-3000));
        assert!(input.has_negative_equity());
    }

    #[test]
    fn test_total_fees() {
        let fees = DealFees {
            doc_fee: dec!(299),
            title_fee: dec!(33),
            registration_fee: dec!(75),
            plate_fee: dec!(25),
            ..Default::default()
        };

        assert_eq!(fees.total_government_fees(), dec!(133));
        assert_eq!(fees.total_dealer_fees(), dec!(299));
    }
}
