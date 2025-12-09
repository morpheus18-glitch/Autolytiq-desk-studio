//! DAG Computation Pipeline
//!
//! Implements the 3-stage deterministic calculation pipeline as a Directed Acyclic Graph.
//! Each stage is a node in the DAG with explicit dependencies.
//!
//! # Pipeline Stages
//!
//! ```text
//! ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
//! │   STAGE 1       │────▶│   STAGE 2       │────▶│   STAGE 3       │
//! │  BASE_COMPUTE   │     │  RECIP_RESOLVE  │     │  PAYMENT_CALC   │
//! │                 │     │                 │     │                 │
//! │  • B_T, B_H     │     │  • R(H,T,G)     │     │  • Retail PMT   │
//! │  • tax_T_raw    │     │  • κ lookup     │     │  • Lease CAP    │
//! │  • tax_H_raw    │     │  • credit calc  │     │  • Monthly      │
//! └─────────────────┘     └─────────────────┘     └─────────────────┘
//! ```
//!
//! # Properties
//!
//! - **Deterministic**: Same inputs always produce same outputs
//! - **No Cycles**: DAG structure guarantees termination
//! - **Parallelizable**: Independent nodes can execute concurrently
//! - **Memoizable**: Results cached at node boundaries
//!
//! # Usage
//!
//! ```rust,no_run
//! use tax_engine_rs::dag::{TaxDag, DagInput};
//!
//! let input = DagInput::default();
//! let dag = TaxDag::new();
//! let result = dag.execute(&input).expect("DAG execution failed");
//! ```

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::bilateral::{
    BilateralMatrix, DealTypeRecip, ReciprocityRegime, Stage1Output, Stage2Output,
    calculate_reciprocity_credit, resolve_reciprocity,
};

// ============================================================================
// DAG NODE TYPES
// ============================================================================

/// Node identifier in the DAG
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum DagNode {
    /// Stage 1: Base computation
    BaseCompute,
    /// Stage 2: Reciprocity resolution
    ReciprocityResolve,
    /// Stage 3: Payment calculation
    PaymentCalc,
}

impl DagNode {
    /// Get the dependencies for this node
    pub fn dependencies(&self) -> Vec<DagNode> {
        match self {
            DagNode::BaseCompute => vec![],
            DagNode::ReciprocityResolve => vec![DagNode::BaseCompute],
            DagNode::PaymentCalc => vec![DagNode::ReciprocityResolve],
        }
    }

    /// Get topological order of all nodes
    pub fn topological_order() -> Vec<DagNode> {
        vec![
            DagNode::BaseCompute,
            DagNode::ReciprocityResolve,
            DagNode::PaymentCalc,
        ]
    }
}

// ============================================================================
// DAG INPUT
// ============================================================================

/// Complete input for the DAG pipeline
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DagInput {
    // Vehicle & Deal
    pub vehicle_price: f64,
    pub trade_value: f64,
    pub trade_payoff: f64,
    pub rebates: f64,
    pub doc_fee: f64,
    pub other_fees: f64,
    pub down_payment: f64,

    // Finance terms (for retail)
    pub apr: f64,
    pub term_months: u16,

    // Lease terms
    pub money_factor: f64,
    pub residual_value: f64,
    pub lease_term_months: u16,

    // Location
    pub transaction_state: String,
    pub home_state: String,
    pub garaging_state: Option<String>,

    // Deal type
    pub deal_type: DealTypeRecip,

    // State configuration (loaded from rules)
    pub state_t_config: StateRateConfig,
    pub state_h_config: StateRateConfig,
}

/// State rate configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateRateConfig {
    pub state_code: String,
    pub base_rate: f64,
    pub local_rate: f64,
    pub trade_reduces_base: bool,
    pub rebate_reduces_base: bool,
    pub doc_fee_taxable: bool,
}

impl Default for StateRateConfig {
    fn default() -> Self {
        Self {
            state_code: "XX".to_string(),
            base_rate: 0.06,
            local_rate: 0.0,
            trade_reduces_base: true,
            rebate_reduces_base: true,
            doc_fee_taxable: true,
        }
    }
}

impl DagInput {
    /// Create a new DAG input with defaults
    pub fn new() -> Self {
        Self {
            vehicle_price: 0.0,
            trade_value: 0.0,
            trade_payoff: 0.0,
            rebates: 0.0,
            doc_fee: 0.0,
            other_fees: 0.0,
            down_payment: 0.0,
            apr: 0.0,
            term_months: 60,
            money_factor: 0.0,
            residual_value: 0.0,
            lease_term_months: 36,
            transaction_state: "XX".to_string(),
            home_state: "XX".to_string(),
            garaging_state: None,
            deal_type: DealTypeRecip::Retail,
            state_t_config: StateRateConfig::default(),
            state_h_config: StateRateConfig::default(),
        }
    }

    /// Builder: set vehicle price
    pub fn vehicle_price(mut self, price: f64) -> Self {
        self.vehicle_price = price;
        self
    }

    /// Builder: set trade info
    pub fn trade(mut self, value: f64, payoff: f64) -> Self {
        self.trade_value = value;
        self.trade_payoff = payoff;
        self
    }

    /// Builder: set states
    pub fn states(mut self, transaction: &str, home: &str) -> Self {
        self.transaction_state = transaction.to_uppercase();
        self.home_state = home.to_uppercase();
        self
    }

    /// Builder: set deal type
    pub fn deal_type(mut self, dt: DealTypeRecip) -> Self {
        self.deal_type = dt;
        self
    }
}

impl Default for DagInput {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================================
// DAG OUTPUT
// ============================================================================

/// Complete output from the DAG pipeline
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DagOutput {
    /// Stage 1 results
    pub stage1: Stage1Output,

    /// Stage 2 results
    pub stage2: Stage2Output,

    /// Stage 3 results
    pub stage3: Stage3Output,

    /// Execution metadata
    pub metadata: DagMetadata,
}

/// Stage 3 output: Payment computation results
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Stage3Output {
    /// Monthly payment
    pub monthly_payment: f64,

    /// Payment with tax (for lease monthly tax)
    pub monthly_payment_with_tax: f64,

    /// Due at signing
    pub due_at_signing: f64,

    /// Amount financed (retail)
    pub amount_financed: f64,

    /// Total of payments
    pub total_of_payments: f64,

    /// Total interest/finance charge
    pub total_interest: f64,

    /// Tax breakdown
    pub tax_breakdown: TaxBreakdownDag,
}

/// Tax breakdown from DAG
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxBreakdownDag {
    /// Tax collected at dealer (transaction state)
    pub collected_at_dealer: f64,

    /// Tax due at registration (home state)
    pub due_at_registration: f64,

    /// Total tax burden
    pub total_tax: f64,

    /// Regime used
    pub regime: ReciprocityRegime,

    /// Credit applied
    pub credit_applied: f64,
}

/// DAG execution metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DagMetadata {
    /// Execution time in microseconds
    pub execution_time_us: u64,

    /// Nodes executed
    pub nodes_executed: Vec<DagNode>,

    /// Cache hits (for memoization)
    pub cache_hits: usize,

    /// Version of the DAG
    pub dag_version: String,
}

// ============================================================================
// TAX DAG ENGINE
// ============================================================================

/// The main DAG execution engine
#[derive(Debug, Clone)]
pub struct TaxDag {
    /// Bilateral matrix for reciprocity
    bilateral_matrix: BilateralMatrix,

    /// Cache for memoization
    cache: HashMap<String, DagOutput>,

    /// Version string
    version: String,
}

impl TaxDag {
    /// Create a new TaxDag
    pub fn new() -> Self {
        Self {
            bilateral_matrix: BilateralMatrix::load_default(),
            cache: HashMap::new(),
            version: "1.0.0".to_string(),
        }
    }

    /// Create with a custom bilateral matrix
    pub fn with_matrix(matrix: BilateralMatrix) -> Self {
        Self {
            bilateral_matrix: matrix,
            cache: HashMap::new(),
            version: "1.0.0".to_string(),
        }
    }

    /// Execute the DAG pipeline
    pub fn execute(&self, input: &DagInput) -> Result<DagOutput, String> {
        let start = std::time::Instant::now();

        // Stage 1: Base Computation
        let stage1 = self.execute_stage1(input)?;

        // Stage 2: Reciprocity Resolution
        let stage2 = self.execute_stage2(input, &stage1)?;

        // Stage 3: Payment Calculation
        let stage3 = self.execute_stage3(input, &stage1, &stage2)?;

        let elapsed = start.elapsed();

        let metadata = DagMetadata {
            execution_time_us: elapsed.as_micros() as u64,
            nodes_executed: DagNode::topological_order(),
            cache_hits: 0, // TODO: implement caching
            dag_version: self.version.clone(),
        };

        Ok(DagOutput {
            stage1,
            stage2,
            stage3,
            metadata,
        })
    }

    /// Stage 1: Base Computation
    ///
    /// Computes taxable bases for both states independently.
    /// No reciprocity logic - pure arithmetic.
    fn execute_stage1(&self, input: &DagInput) -> Result<Stage1Output, String> {
        // Compute base for transaction state
        let b_t = self.compute_taxable_base(input, &input.state_t_config);

        // Compute base for home state
        let b_h = self.compute_taxable_base(input, &input.state_h_config);

        // Get rates
        let r_t = input.state_t_config.base_rate + input.state_t_config.local_rate;
        let r_h = input.state_h_config.base_rate + input.state_h_config.local_rate;

        // Raw tax calculations
        let tax_t_raw = r_t * b_t;
        let tax_h_raw = r_h * b_h;

        Ok(Stage1Output {
            b_t,
            b_h,
            r_t,
            r_h,
            tax_t_raw,
            tax_h_raw,
        })
    }

    /// Compute taxable base for a state
    fn compute_taxable_base(&self, input: &DagInput, config: &StateRateConfig) -> f64 {
        let mut base = input.vehicle_price;

        // Trade-in treatment
        if config.trade_reduces_base {
            let trade_credit = (input.trade_value - input.trade_payoff).max(0.0);
            base -= trade_credit;
        }

        // Rebate treatment
        if config.rebate_reduces_base {
            base -= input.rebates;
        }

        // Doc fee
        if config.doc_fee_taxable {
            base += input.doc_fee;
        }

        base.max(0.0)
    }

    /// Stage 2: Reciprocity Resolution
    ///
    /// Resolves the reciprocity regime and calculates credits.
    fn execute_stage2(
        &self,
        input: &DagInput,
        stage1: &Stage1Output,
    ) -> Result<Stage2Output, String> {
        let garaging = input
            .garaging_state
            .as_ref()
            .unwrap_or(&input.home_state);

        // Resolve regime
        let (regime, kappa) = resolve_reciprocity(
            &self.bilateral_matrix,
            &input.home_state,
            &input.transaction_state,
            garaging,
            input.deal_type,
        );

        // Calculate credits
        let stage2 = calculate_reciprocity_credit(stage1, regime, kappa);

        Ok(stage2)
    }

    /// Stage 3: Payment Calculation
    ///
    /// Computes final payment based on deal type.
    fn execute_stage3(
        &self,
        input: &DagInput,
        stage1: &Stage1Output,
        stage2: &Stage2Output,
    ) -> Result<Stage3Output, String> {
        match input.deal_type {
            DealTypeRecip::Retail => self.calculate_retail_payment(input, stage1, stage2),
            DealTypeRecip::Lease => self.calculate_lease_payment(input, stage1, stage2),
        }
    }

    /// Calculate retail payment
    fn calculate_retail_payment(
        &self,
        input: &DagInput,
        _stage1: &Stage1Output,
        stage2: &Stage2Output,
    ) -> Result<Stage3Output, String> {
        // Trade equity
        let trade_equity = input.trade_value - input.trade_payoff;

        // Total tax
        let total_tax = stage2.total_burden;

        // Amount financed
        let amount_financed = input.vehicle_price
            - input.down_payment
            - trade_equity.max(0.0)
            + trade_equity.min(0.0).abs() // Add negative equity
            - input.rebates
            + input.doc_fee
            + input.other_fees
            + total_tax;

        let amount_financed = amount_financed.max(0.0);

        // Monthly payment (standard amortization)
        let monthly_payment = if input.apr <= 0.0 {
            amount_financed / input.term_months as f64
        } else {
            let monthly_rate = input.apr / 100.0 / 12.0;
            let n = input.term_months as f64;
            amount_financed
                * (monthly_rate * (1.0 + monthly_rate).powf(n))
                / ((1.0 + monthly_rate).powf(n) - 1.0)
        };

        let total_of_payments = monthly_payment * input.term_months as f64;
        let total_interest = total_of_payments - amount_financed;

        Ok(Stage3Output {
            monthly_payment: round_currency(monthly_payment),
            monthly_payment_with_tax: round_currency(monthly_payment),
            due_at_signing: round_currency(input.down_payment),
            amount_financed: round_currency(amount_financed),
            total_of_payments: round_currency(total_of_payments),
            total_interest: round_currency(total_interest),
            tax_breakdown: TaxBreakdownDag {
                collected_at_dealer: round_currency(stage2.tax_collected_t),
                due_at_registration: round_currency(stage2.tax_due_h),
                total_tax: round_currency(stage2.total_burden),
                regime: stage2.regime,
                credit_applied: round_currency(stage2.credit_applied_h),
            },
        })
    }

    /// Calculate lease payment
    fn calculate_lease_payment(
        &self,
        input: &DagInput,
        stage1: &Stage1Output,
        stage2: &Stage2Output,
    ) -> Result<Stage3Output, String> {
        // Gross cap cost
        let gross_cap_cost = input.vehicle_price + input.doc_fee + input.other_fees;

        // Cap cost reduction
        let trade_equity = (input.trade_value - input.trade_payoff).max(0.0);
        let cap_cost_reduction = input.down_payment + trade_equity + input.rebates;

        // Adjusted cap cost
        let adjusted_cap_cost = gross_cap_cost - cap_cost_reduction;

        // Residual
        let residual = input.residual_value;

        // Monthly depreciation
        let depreciation = (adjusted_cap_cost - residual) / input.lease_term_months as f64;

        // Monthly rent charge
        let rent_charge = (adjusted_cap_cost + residual) * input.money_factor;

        // Base payment
        let base_payment = depreciation + rent_charge;

        // Tax (simplified - monthly tax on payment)
        let monthly_tax = base_payment * stage1.r_h;
        let total_monthly = base_payment + monthly_tax;

        // Due at signing
        let due_at_signing = input.down_payment + total_monthly; // First month

        // Total of payments
        let total_of_payments =
            total_monthly * input.lease_term_months as f64 + input.down_payment;

        Ok(Stage3Output {
            monthly_payment: round_currency(base_payment),
            monthly_payment_with_tax: round_currency(total_monthly),
            due_at_signing: round_currency(due_at_signing),
            amount_financed: round_currency(adjusted_cap_cost),
            total_of_payments: round_currency(total_of_payments),
            total_interest: round_currency(rent_charge * input.lease_term_months as f64),
            tax_breakdown: TaxBreakdownDag {
                collected_at_dealer: round_currency(stage2.tax_collected_t),
                due_at_registration: round_currency(stage2.tax_due_h),
                total_tax: round_currency(monthly_tax * input.lease_term_months as f64),
                regime: stage2.regime,
                credit_applied: round_currency(stage2.credit_applied_h),
            },
        })
    }

    /// Clear the cache
    pub fn clear_cache(&mut self) {
        self.cache.clear();
    }

    /// Get stats about the DAG
    pub fn stats(&self) -> DagStats {
        DagStats {
            version: self.version.clone(),
            matrix_stats: self.bilateral_matrix.stats(),
            cache_size: self.cache.len(),
        }
    }
}

impl Default for TaxDag {
    fn default() -> Self {
        Self::new()
    }
}

/// DAG statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DagStats {
    pub version: String,
    pub matrix_stats: crate::bilateral::MatrixStats,
    pub cache_size: usize,
}

/// Round to currency (2 decimal places)
fn round_currency(amount: f64) -> f64 {
    (amount * 100.0).round() / 100.0
}

// ============================================================================
// TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_input() -> DagInput {
        DagInput {
            vehicle_price: 30000.0,
            trade_value: 5000.0,
            trade_payoff: 3000.0,
            rebates: 1500.0,
            doc_fee: 299.0,
            other_fees: 150.0,
            down_payment: 2000.0,
            apr: 5.9,
            term_months: 60,
            money_factor: 0.00125,
            residual_value: 18000.0,
            lease_term_months: 36,
            transaction_state: "TX".to_string(),
            home_state: "IN".to_string(),
            garaging_state: None,
            deal_type: DealTypeRecip::Retail,
            state_t_config: StateRateConfig {
                state_code: "TX".to_string(),
                base_rate: 0.0625,
                local_rate: 0.02,
                trade_reduces_base: true,
                rebate_reduces_base: true,
                doc_fee_taxable: true,
            },
            state_h_config: StateRateConfig {
                state_code: "IN".to_string(),
                base_rate: 0.07,
                local_rate: 0.0,
                trade_reduces_base: true,
                rebate_reduces_base: true,
                doc_fee_taxable: false,
            },
        }
    }

    #[test]
    fn test_dag_execution() {
        let dag = TaxDag::new();
        let input = create_test_input();

        let result = dag.execute(&input).unwrap();

        // Verify stage 1 ran
        assert!(result.stage1.b_t > 0.0);
        assert!(result.stage1.b_h > 0.0);

        // Verify stage 2 ran (TX→IN should have full credit)
        assert_eq!(result.stage2.regime, ReciprocityRegime::FullCredit);

        // Verify stage 3 ran
        assert!(result.stage3.monthly_payment > 0.0);
        assert!(result.stage3.amount_financed > 0.0);
    }

    #[test]
    fn test_stage1_base_computation() {
        let dag = TaxDag::new();
        let input = create_test_input();

        let stage1 = dag.execute_stage1(&input).unwrap();

        // TX base: 30000 - (5000-3000) - 1500 + 299 = 26799
        let expected_b_t = 30000.0 - 2000.0 - 1500.0 + 299.0;
        assert!((stage1.b_t - expected_b_t).abs() < 0.01);

        // IN base: 30000 - 2000 - 1500 + 0 (doc not taxable) = 26500
        let expected_b_h = 30000.0 - 2000.0 - 1500.0;
        assert!((stage1.b_h - expected_b_h).abs() < 0.01);
    }

    #[test]
    fn test_dag_metadata() {
        let dag = TaxDag::new();
        let input = create_test_input();

        let result = dag.execute(&input).unwrap();

        assert_eq!(result.metadata.nodes_executed.len(), 3);
        assert_eq!(result.metadata.dag_version, "1.0.0");
    }

    #[test]
    fn test_same_state_deal() {
        let dag = TaxDag::new();
        let mut input = create_test_input();
        input.transaction_state = "IN".to_string();
        input.home_state = "IN".to_string();

        let result = dag.execute(&input).unwrap();

        // Same state = full credit, no tax due at registration
        assert_eq!(result.stage2.regime, ReciprocityRegime::FullCredit);
        assert_eq!(result.stage2.tax_due_h, 0.0);
    }

    #[test]
    fn test_california_no_reciprocity() {
        let dag = TaxDag::new();
        let mut input = create_test_input();
        input.transaction_state = "TX".to_string();
        input.home_state = "CA".to_string();
        input.state_h_config.state_code = "CA".to_string();
        input.state_h_config.base_rate = 0.0725;
        input.state_h_config.local_rate = 0.01;

        let result = dag.execute(&input).unwrap();

        // CA = no reciprocity
        assert_eq!(result.stage2.regime, ReciprocityRegime::NoCredit);
        assert_eq!(result.stage2.credit_applied_h, 0.0);
    }

    #[test]
    fn test_topological_order() {
        let order = DagNode::topological_order();
        assert_eq!(order[0], DagNode::BaseCompute);
        assert_eq!(order[1], DagNode::ReciprocityResolve);
        assert_eq!(order[2], DagNode::PaymentCalc);
    }

    #[test]
    fn test_node_dependencies() {
        assert!(DagNode::BaseCompute.dependencies().is_empty());
        assert_eq!(
            DagNode::ReciprocityResolve.dependencies(),
            vec![DagNode::BaseCompute]
        );
        assert_eq!(
            DagNode::PaymentCalc.dependencies(),
            vec![DagNode::ReciprocityResolve]
        );
    }
}
