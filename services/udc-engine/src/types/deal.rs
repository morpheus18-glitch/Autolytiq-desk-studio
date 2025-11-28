//! Deal input types - the "plaintext" of our cipher.
//!
//! These types represent the raw deal data before processing.

use chrono::NaiveDate;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use strum::{Display, EnumString};
use uuid::Uuid;

use super::money::{Money, Rate};

/// The three fundamental deal types in automotive finance.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Display, EnumString)]
#[serde(rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
pub enum DealType {
    /// Cash purchase - no financing
    Cash,
    /// Traditional financing with loan
    Finance,
    /// Lease agreement
    Lease,
}

/// Vehicle condition affects depreciation and some tax calculations.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Display, EnumString)]
#[serde(rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
pub enum VehicleCondition {
    New,
    Used,
    CertifiedPreOwned,
}

/// Source of a rebate affects its tax treatment in many jurisdictions.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Display, EnumString)]
#[serde(rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
pub enum RebateSource {
    /// Manufacturer rebate - often reduces taxable amount
    Manufacturer,
    /// Dealer discount/rebate - may or may not reduce taxable amount
    Dealer,
    /// Government incentive (EV credits, etc.)
    Government,
}

/// A rebate or incentive on the deal.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Rebate {
    /// Unique identifier for this rebate
    pub id: String,
    /// Human-readable name
    pub name: String,
    /// Amount of the rebate
    pub amount: Money,
    /// Source determines tax treatment
    pub source: RebateSource,
    /// Program code from OEM/government
    pub program_code: Option<String>,
}

/// Trade-in vehicle information.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TradeIn {
    /// VIN of trade-in vehicle
    pub vin: Option<String>,
    /// Year/Make/Model description
    pub description: String,
    /// Agreed trade-in value (gross)
    pub gross_value: Money,
    /// Payoff amount if trade has a lien
    pub payoff_amount: Money,
    /// Actual Cash Value for tax purposes (may differ from gross)
    pub acv: Option<Money>,
}

impl TradeIn {
    /// Net trade equity (can be negative for underwater trades)
    pub fn net_equity(&self) -> Money {
        self.gross_value - self.payoff_amount
    }

    /// Trade value used for tax credit (ACV if provided, else gross)
    pub fn tax_credit_value(&self) -> Money {
        self.acv.unwrap_or(self.gross_value)
    }
}

/// Fee that can be applied to a deal.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Fee {
    /// Fee code (e.g., "DOC", "TITLE", "REG")
    pub code: String,
    /// Human-readable name
    pub name: String,
    /// Fee amount
    pub amount: Money,
    /// Whether this fee is taxable
    pub taxable: bool,
    /// Whether this fee can be capitalized (for leases)
    pub capitalizable: bool,
    /// Whether this fee is government-mandated
    pub government_fee: bool,
}

/// The primary vehicle being purchased/leased.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Vehicle {
    /// VIN
    pub vin: String,
    /// Model year
    pub year: u16,
    /// Manufacturer
    pub make: String,
    /// Model name
    pub model: String,
    /// Trim level
    pub trim: Option<String>,
    /// New/Used/CPO
    pub condition: VehicleCondition,
    /// MSRP (sticker price)
    pub msrp: Money,
    /// Invoice price (dealer cost)
    pub invoice: Option<Money>,
    /// Negotiated selling price
    pub selling_price: Money,
    /// Odometer reading
    pub odometer: u32,
}

/// Jurisdiction information for tax calculations.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Jurisdiction {
    /// Two-letter state code
    pub state: String,
    /// County name (optional)
    pub county: Option<String>,
    /// City name (optional)
    pub city: Option<String>,
    /// ZIP code
    pub zip: String,
}

impl Jurisdiction {
    /// Create a simple state-only jurisdiction
    pub fn state_only(state: impl Into<String>) -> Self {
        Jurisdiction {
            state: state.into(),
            county: None,
            city: None,
            zip: String::new(),
        }
    }
}

/// The complete deal input - our "plaintext".
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DealInput {
    /// Unique deal identifier
    pub deal_id: Uuid,
    /// Type of deal
    pub deal_type: DealType,
    /// Deal date (closing date)
    pub deal_date: NaiveDate,

    // === Vehicle ===
    /// Primary vehicle
    pub vehicle: Vehicle,

    // === Pricing ===
    /// Selling price (should match vehicle.selling_price, explicit for clarity)
    pub selling_price: Money,
    /// Cash down payment
    pub cash_down: Money,
    /// Rebates and incentives
    pub rebates: Vec<Rebate>,
    /// Trade-in vehicle (if any)
    pub trade_in: Option<TradeIn>,

    // === Fees ===
    /// All fees on the deal
    pub fees: Vec<Fee>,

    // === Jurisdictions (H/T/G) ===
    /// Home jurisdiction - customer's residence
    pub home_jurisdiction: Jurisdiction,
    /// Transaction jurisdiction - where deal is executed (dealer location)
    pub transaction_jurisdiction: Jurisdiction,
    /// Garaging jurisdiction - where vehicle will be kept
    pub garaging_jurisdiction: Option<Jurisdiction>,

    // === Finance-specific (ignored for cash/lease) ===
    /// Annual Percentage Rate
    pub apr: Option<Rate>,
    /// Loan term in months
    pub finance_term: Option<u16>,

    // === Lease-specific (ignored for cash/finance) ===
    /// Money factor
    pub money_factor: Option<Decimal>,
    /// Lease term in months
    pub lease_term: Option<u16>,
    /// Residual value (dollar amount or percentage of MSRP)
    pub residual_value: Option<Money>,
    /// Residual as percentage of MSRP (alternative to dollar amount)
    pub residual_percentage: Option<Rate>,
    /// Annual mileage allowance
    pub annual_mileage: Option<u32>,

    // === F&I Products ===
    /// Finance & Insurance products
    pub fi_products: Vec<FiProduct>,

    // === Metadata ===
    /// Lender/lessor code
    pub lender_code: Option<String>,
    /// Program code from lender
    pub program_code: Option<String>,
    /// Notes/comments
    pub notes: Option<String>,
}

/// Finance & Insurance product.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct FiProduct {
    /// Product code
    pub code: String,
    /// Product name
    pub name: String,
    /// Product cost to dealer
    pub cost: Money,
    /// Retail price to customer
    pub price: Money,
    /// Term in months (for service contracts, etc.)
    pub term_months: Option<u16>,
    /// Whether this product is taxable
    pub taxable: bool,
    /// For leases: capitalize into gross cap cost?
    pub capitalize: bool,
}

impl DealInput {
    /// Calculate total rebate amount
    pub fn total_rebates(&self) -> Money {
        self.rebates.iter().fold(Money::ZERO, |acc, r| acc + r.amount)
    }

    /// Calculate total manufacturer rebates
    pub fn manufacturer_rebates(&self) -> Money {
        self.rebates
            .iter()
            .filter(|r| r.source == RebateSource::Manufacturer)
            .fold(Money::ZERO, |acc, r| acc + r.amount)
    }

    /// Calculate total fees
    pub fn total_fees(&self) -> Money {
        self.fees.iter().fold(Money::ZERO, |acc, f| acc + f.amount)
    }

    /// Calculate taxable fees
    pub fn taxable_fees(&self) -> Money {
        self.fees
            .iter()
            .filter(|f| f.taxable)
            .fold(Money::ZERO, |acc, f| acc + f.amount)
    }

    /// Get trade-in credit (net equity, clamped to zero)
    pub fn trade_credit(&self) -> Money {
        self.trade_in
            .as_ref()
            .map(|t| t.net_equity().clamp_zero())
            .unwrap_or(Money::ZERO)
    }

    /// Get effective garaging jurisdiction (defaults to home if not specified)
    pub fn effective_garaging(&self) -> &Jurisdiction {
        self.garaging_jurisdiction
            .as_ref()
            .unwrap_or(&self.home_jurisdiction)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_trade_equity() {
        let trade = TradeIn {
            vin: Some("ABC123".into()),
            description: "2020 Honda Civic".into(),
            gross_value: Money::new(rust_decimal_macros::dec!(15000)),
            payoff_amount: Money::new(rust_decimal_macros::dec!(12000)),
            acv: None,
        };

        assert_eq!(
            trade.net_equity().as_decimal(),
            rust_decimal_macros::dec!(3000)
        );
    }

    #[test]
    fn test_underwater_trade() {
        let trade = TradeIn {
            vin: None,
            description: "2019 Ford F150".into(),
            gross_value: Money::new(rust_decimal_macros::dec!(20000)),
            payoff_amount: Money::new(rust_decimal_macros::dec!(25000)),
            acv: None,
        };

        assert_eq!(
            trade.net_equity().as_decimal(),
            rust_decimal_macros::dec!(-5000)
        );
    }
}
