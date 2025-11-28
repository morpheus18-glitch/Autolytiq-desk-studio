//! # Unified Deal Cipher (UDC) Engine
//!
//! A pure Rust calculation engine for automotive deal structuring.
//! Provides deterministic, precise calculations for:
//!
//! - **Tax calculations** - State/local taxes with reciprocity handling
//! - **Finance deals** - Loan payments, amortization, TILA disclosures
//! - **Lease deals** - Cap cost, residual, Reg M disclosures
//! - **Cash deals** - Simple total due calculations
//!
//! ## Features
//!
//! - **Pure functions** - No side effects, fully deterministic
//! - **Precise math** - Uses `rust_decimal` for exact money calculations (no floating point)
//! - **WASM support** - Compile to WebAssembly for browser/Node.js use
//! - **Audit trail** - Complete trace of all calculations for compliance
//!
//! ## Architecture
//!
//! The engine uses an 8-phase pipeline:
//!
//! ```text
//! Input -> P0: Normalize
//!       -> P1: Route (cash/finance/lease)
//!       -> P2: Jurisdiction (H/T/G resolution)
//!       -> P3: Profiles (load rules/programs)
//!       -> P4: Tax Cipher (calculate taxes)
//!       -> P5: Structure (payment calculation)
//!       -> P6: Cashflow (amortization/schedule)
//!       -> P7: Finalize (disclosures/audit)
//!       -> Output
//! ```
//!
//! ## Quick Start
//!
//! ```rust,ignore
//! use udc_engine::{run_udc, DealInput, RuleProfile};
//!
//! // Set up deal input
//! let input = DealInput {
//!     deal_type: DealType::Finance,
//!     vehicle_price: dec!(30000),
//!     cash_down: dec!(3000),
//!     // ... other fields
//! };
//!
//! // Set up rules
//! let rules = RuleProfile::default();
//!
//! // Run calculation
//! let output = run_udc(input, rules, None, None)?;
//!
//! // Use results
//! println!("Tax: ${}", output.tax_breakdown.net_tax);
//! println!("Payment: ${}/mo", output.monthly_payment().unwrap());
//! ```
//!
//! ## WASM Usage
//!
//! When compiled with `--features wasm`:
//!
//! ```javascript
//! import init, { run_udc_wasm } from 'udc-engine';
//!
//! await init();
//!
//! const result = run_udc_wasm(dealJson, rulesJson, null, null);
//! const output = JSON.parse(result);
//! ```

#![warn(missing_docs)]
#![warn(clippy::all)]
#![deny(unsafe_code)]

// Use wee_alloc as the global allocator for WASM builds
#[cfg(all(feature = "wasm", feature = "wee_alloc"))]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

// Core modules
pub mod types;
pub mod phases;
pub mod engine;
pub mod wasm;

// Re-export commonly used types
pub use types::{
    // Deal types
    DealInput, DealType, DealFees, CustomerInfo, CustomerType,
    FinanceParams, LeaseParams,
    Rebate, RebateSource,
    TradeIn, Fee, Vehicle, VehicleCondition,
    FiProduct, Jurisdiction,

    // Money types
    Money, Rate, MoneyFactor,

    // Profile types
    RuleProfile, ProgramProfile, ProductProfile,
    TaxRateComponent, TradeInTaxTreatment, RebateTaxTreatment,
    LeaseTaxMode, TaxStackingMode, ReciprocityType,
    RoundingMode, FeeCapitalization,

    // Output types
    UdcOutput, TaxBreakdown, TaxLineItem,
    FinanceStructure, LeaseStructure, CashStructure,
    AmortizationEntry, Disclosure, AuditTrace, AuditEntry,
    ValidationResult, ValidationWarning,

    // Common types
    StateCode, TaxType, CreditTier,
    UdcError, UdcResult, DecimalExt,
};

// Re-export engine functions
pub use engine::{
    run_udc, run_udc_with_config, run_udc_json,
    validate_deal, calculate_tax_only,
    engine_version, engine_info, EngineConfig, EngineInfo,
};

// Re-export WASM bindings when feature is enabled
#[cfg(feature = "wasm")]
pub use wasm::{
    run_udc_wasm, validate_deal_wasm, calculate_tax_wasm,
    get_version, get_engine_info,
};

/// Prelude module for convenient imports
pub mod prelude {
    //! Commonly used types and traits.
    //!
    //! ```rust,ignore
    //! use udc_engine::prelude::*;
    //! ```

    pub use crate::types::{
        DealInput, DealType, DealFees,
        Money, Rate,
        RuleProfile, ProgramProfile,
        UdcOutput, TaxBreakdown,
        StateCode, UdcResult, UdcError,
        DecimalExt,
    };

    pub use crate::engine::{run_udc, validate_deal};

    pub use rust_decimal::Decimal;
    pub use rust_decimal_macros::dec;
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;

    #[test]
    fn test_library_exports() {
        // Verify key types are exported
        let _deal_type = DealType::Finance;
        let _money = Money::new(dec!(100));
        let _rate = Rate::from_percentage(dec!(6.25));
    }

    #[test]
    fn test_prelude_imports() {
        use crate::prelude::*;

        let _deal_type = DealType::Finance;
        let _money = Money::new(dec!(100));
    }

    #[test]
    fn test_engine_version() {
        let version = engine_version();
        assert!(!version.is_empty());
        assert!(version.contains('.'));
    }
}
