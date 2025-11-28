//! UDC Output types - the "ciphertext" produced by our engine.
//!
//! These represent the complete, legally-correct calculation results.

use chrono::{NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::deal::DealType;
use super::money::{Money, Rate};

// ============================================================================
// TAX BREAKDOWN
// ============================================================================

/// A single tax line item.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TaxLineItem {
    /// Jurisdiction level (state, county, city, district)
    pub level: String,
    /// Jurisdiction name
    pub name: String,
    /// Tax rate applied
    pub rate: Rate,
    /// Base amount taxed
    pub taxable_base: Money,
    /// Calculated tax amount
    pub tax_amount: Money,
    /// Whether this is a credit (negative)
    pub is_credit: bool,
}

/// Complete tax breakdown for a deal.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TaxBreakdown {
    /// All tax line items
    pub line_items: Vec<TaxLineItem>,
    /// Total tax before credits
    pub gross_tax: Money,
    /// Reciprocity credit amount
    pub reciprocity_credit: Money,
    /// Net tax due
    pub net_tax: Money,
    /// Tax base used for calculation
    pub tax_base: Money,
    /// Combined effective rate
    pub effective_rate: Rate,
    /// Special tax type used (if any)
    pub special_tax_type: Option<String>,
    /// Whether trade-in reduced tax base
    pub trade_in_applied: bool,
    /// Trade-in credit used for tax
    pub trade_in_credit_used: Money,
    /// Whether rebates reduced tax base
    pub rebates_applied: bool,
    /// Rebate amount used for tax reduction
    pub rebate_amount_used: Money,
}

impl Default for TaxBreakdown {
    fn default() -> Self {
        TaxBreakdown {
            line_items: Vec::new(),
            gross_tax: Money::ZERO,
            reciprocity_credit: Money::ZERO,
            net_tax: Money::ZERO,
            tax_base: Money::ZERO,
            effective_rate: Rate::ZERO,
            special_tax_type: None,
            trade_in_applied: false,
            trade_in_credit_used: Money::ZERO,
            rebates_applied: false,
            rebate_amount_used: Money::ZERO,
        }
    }
}

// ============================================================================
// FINANCE STRUCTURE
// ============================================================================

/// Finance deal structure (loan).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FinanceStructure {
    /// Selling price
    pub selling_price: Money,
    /// Total taxable fees
    pub taxable_fees: Money,
    /// Total non-taxable fees
    pub non_taxable_fees: Money,
    /// F&I products financed
    pub fi_products_financed: Money,
    /// Trade-in credit applied
    pub trade_credit: Money,
    /// Cash down payment
    pub cash_down: Money,
    /// Rebates applied
    pub rebates_applied: Money,
    /// Sales tax (if financed)
    pub sales_tax: Money,
    /// Amount financed (principal)
    pub amount_financed: Money,
    /// APR
    pub apr: Rate,
    /// Term in months
    pub term_months: u16,
    /// Monthly payment
    pub monthly_payment: Money,
    /// Total of payments
    pub total_of_payments: Money,
    /// Total finance charge (interest)
    pub finance_charge: Money,
    /// Total sale price (TTP on buyer's order)
    pub total_sale_price: Money,
}

/// Single amortization schedule entry.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AmortizationEntry {
    /// Payment number (1-indexed)
    pub payment_number: u16,
    /// Payment due date
    pub due_date: NaiveDate,
    /// Total payment amount
    pub payment_amount: Money,
    /// Principal portion
    pub principal: Money,
    /// Interest portion
    pub interest: Money,
    /// Balance after payment
    pub remaining_balance: Money,
}

// ============================================================================
// LEASE STRUCTURE
// ============================================================================

/// Lease deal structure.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LeaseStructure {
    // === Cap Cost Calculation ===
    /// MSRP
    pub msrp: Money,
    /// Negotiated selling price
    pub selling_price: Money,
    /// Capitalized fees
    pub capitalized_fees: Money,
    /// Capitalized F&I products
    pub capitalized_fi_products: Money,
    /// Gross capitalized cost
    pub gross_cap_cost: Money,
    /// Cap cost reductions (down, trade, rebates)
    pub cap_cost_reductions: Money,
    /// Adjusted capitalized cost
    pub adjusted_cap_cost: Money,

    // === Residual ===
    /// Residual percentage
    pub residual_percentage: Rate,
    /// Residual value (dollar amount)
    pub residual_value: Money,

    // === Lease Charge ===
    /// Money factor
    pub money_factor: Decimal,
    /// Equivalent APR
    pub equivalent_apr: Rate,
    /// Term in months
    pub term_months: u16,
    /// Depreciation amount
    pub depreciation: Money,
    /// Rent charge (lease finance charge)
    pub rent_charge: Money,

    // === Payment ===
    /// Base monthly payment (before tax)
    pub base_monthly_payment: Money,
    /// Monthly tax (if applicable)
    pub monthly_tax: Money,
    /// Total monthly payment (including tax)
    pub total_monthly_payment: Money,
    /// Due at signing
    pub due_at_signing: Money,
    /// Security deposit
    pub security_deposit: Money,
    /// First month's payment
    pub first_payment: Money,
    /// Acquisition fee
    pub acquisition_fee: Money,

    // === Tax Mode ===
    /// Lease tax mode used
    pub lease_tax_mode: String,
    /// Upfront tax (if cap cost tax mode)
    pub upfront_tax: Option<Money>,
    /// Total of all taxes
    pub total_tax: Money,

    // === Totals ===
    /// Total of base payments
    pub total_base_payments: Money,
    /// Total lease cost
    pub total_lease_cost: Money,
}

// ============================================================================
// CASH STRUCTURE
// ============================================================================

/// Cash deal structure (simple).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CashStructure {
    /// Selling price
    pub selling_price: Money,
    /// Total fees
    pub total_fees: Money,
    /// F&I products purchased
    pub fi_products: Money,
    /// Trade-in credit
    pub trade_credit: Money,
    /// Rebates
    pub rebates: Money,
    /// Sales tax
    pub sales_tax: Money,
    /// Total cash price (amount due)
    pub total_cash_price: Money,
}

// ============================================================================
// DISCLOSURES
// ============================================================================

/// Required disclosure for the deal.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Disclosure {
    /// Disclosure code
    pub code: String,
    /// Category (federal, state, lender)
    pub category: String,
    /// Short title
    pub title: String,
    /// Full disclosure text
    pub text: String,
    /// Whether signature is required
    pub signature_required: bool,
    /// Applicable regulations (e.g., "TILA", "Reg M")
    pub regulations: Vec<String>,
}

// ============================================================================
// AUDIT TRACE
// ============================================================================

/// Single audit trace entry.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AuditEntry {
    /// Phase where this occurred
    pub phase: String,
    /// Operation performed
    pub operation: String,
    /// Input values
    pub inputs: serde_json::Value,
    /// Output values
    pub outputs: serde_json::Value,
    /// Rule or formula applied
    pub rule_applied: Option<String>,
    /// Timestamp
    pub timestamp: chrono::DateTime<Utc>,
}

/// Complete audit trace for reproducibility.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AuditTrace {
    /// All audit entries
    pub entries: Vec<AuditEntry>,
    /// UDC engine version
    pub engine_version: String,
    /// Rule profile version
    pub rule_profile_version: String,
    /// Program profile version
    pub program_profile_version: Option<String>,
    /// Calculation timestamp
    pub calculated_at: chrono::DateTime<Utc>,
    /// Checksum of inputs
    pub input_checksum: String,
    /// Checksum of outputs
    pub output_checksum: String,
}

impl Default for AuditTrace {
    fn default() -> Self {
        AuditTrace {
            entries: Vec::new(),
            engine_version: env!("CARGO_PKG_VERSION").to_string(),
            rule_profile_version: String::new(),
            program_profile_version: None,
            calculated_at: Utc::now(),
            input_checksum: String::new(),
            output_checksum: String::new(),
        }
    }
}

// ============================================================================
// VALIDATION RESULT
// ============================================================================

/// Validation warning (non-fatal).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ValidationWarning {
    /// Warning code
    pub code: String,
    /// Field that triggered warning
    pub field: String,
    /// Warning message
    pub message: String,
}

/// Validation result.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ValidationResult {
    /// Whether validation passed
    pub valid: bool,
    /// Errors (fatal)
    pub errors: Vec<String>,
    /// Warnings (non-fatal)
    pub warnings: Vec<ValidationWarning>,
}

impl ValidationResult {
    pub fn ok() -> Self {
        ValidationResult {
            valid: true,
            errors: Vec::new(),
            warnings: Vec::new(),
        }
    }

    pub fn with_error(error: impl Into<String>) -> Self {
        ValidationResult {
            valid: false,
            errors: vec![error.into()],
            warnings: Vec::new(),
        }
    }
}

// ============================================================================
// COMPLETE UDC OUTPUT
// ============================================================================

/// The complete output of the UDC engine - our "ciphertext".
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct UdcOutput {
    /// Unique output identifier
    pub output_id: Uuid,
    /// Original deal ID
    pub deal_id: Uuid,
    /// Deal type
    pub deal_type: DealType,
    /// Calculation timestamp
    pub calculated_at: chrono::DateTime<Utc>,

    // === Validation ===
    /// Input validation result
    pub validation: ValidationResult,

    // === Tax ===
    /// Complete tax breakdown
    pub tax_breakdown: TaxBreakdown,

    // === Structure (one will be populated based on deal_type) ===
    /// Cash deal structure
    pub cash_structure: Option<CashStructure>,
    /// Finance deal structure
    pub finance_structure: Option<FinanceStructure>,
    /// Lease deal structure
    pub lease_structure: Option<LeaseStructure>,

    // === Amortization (finance only) ===
    /// Full amortization schedule
    pub amortization_schedule: Option<Vec<AmortizationEntry>>,

    // === Disclosures ===
    /// Required disclosures
    pub disclosures: Vec<Disclosure>,

    // === Audit ===
    /// Complete audit trace
    pub audit_trace: AuditTrace,

    // === Summary ===
    /// One-line summary (e.g., "$450/mo for 60 months")
    pub summary: String,
}

impl UdcOutput {
    /// Create a new output with validation error.
    pub fn validation_error(deal_id: Uuid, deal_type: DealType, error: String) -> Self {
        UdcOutput {
            output_id: Uuid::new_v4(),
            deal_id,
            deal_type,
            calculated_at: Utc::now(),
            validation: ValidationResult::with_error(error),
            tax_breakdown: TaxBreakdown::default(),
            cash_structure: None,
            finance_structure: None,
            lease_structure: None,
            amortization_schedule: None,
            disclosures: Vec::new(),
            audit_trace: AuditTrace::default(),
            summary: "Validation failed".to_string(),
        }
    }

    /// Get the monthly payment (if applicable).
    pub fn monthly_payment(&self) -> Option<Money> {
        match self.deal_type {
            DealType::Finance => self.finance_structure.as_ref().map(|f| f.monthly_payment),
            DealType::Lease => self.lease_structure.as_ref().map(|l| l.total_monthly_payment),
            DealType::Cash => None,
        }
    }

    /// Get the total amount due.
    pub fn total_due(&self) -> Money {
        match self.deal_type {
            DealType::Cash => self.cash_structure.as_ref()
                .map(|c| c.total_cash_price)
                .unwrap_or(Money::ZERO),
            DealType::Finance => self.finance_structure.as_ref()
                .map(|f| f.total_sale_price)
                .unwrap_or(Money::ZERO),
            DealType::Lease => self.lease_structure.as_ref()
                .map(|l| l.total_lease_cost)
                .unwrap_or(Money::ZERO),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validation_result() {
        let ok = ValidationResult::ok();
        assert!(ok.valid);
        assert!(ok.errors.is_empty());

        let err = ValidationResult::with_error("Missing field");
        assert!(!err.valid);
        assert_eq!(err.errors.len(), 1);
    }
}
