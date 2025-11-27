/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
/**
 * WASM Adapter
 *
 * Converts between camelCase TypeScript types and snake_case WASM JSON.
 * This ensures the WASM module can accept snake_case JSON if the Rust
 * implementation uses snake_case field names.
 */

import type {
  TaxRulesConfig,
  TaxCalculationInput,
  TaxCalculationResult,
  TaxBaseBreakdown,
  TaxAmountBreakdown,
  LeaseTaxBreakdown,
  AutoTaxDebug,
  RebateRule,
  FeeTaxRule,
  TitleFeeRule,
  LeaseTaxRules,
  ReciprocityRules,
  TradeInPolicy,
  TaxRateComponent,
} from './types.js';

// ============================================================================
// GENERIC CASE CONVERSION UTILITIES
// ============================================================================

/**
 * Convert camelCase string to snake_case
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Convert snake_case string to camelCase
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Recursively convert all keys in an object from camelCase to snake_case
 */
function objectToSnakeCase<T>(obj: T): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => objectToSnakeCase(item));
  }

  if (typeof obj === 'object' && obj !== null) {
    const converted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const snakeKey = camelToSnake(key);
      converted[snakeKey] = objectToSnakeCase(value);
    }
    return converted;
  }

  return obj;
}

/**
 * Recursively convert all keys in an object from snake_case to camelCase
 */
function objectToCamelCase<T>(obj: T): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => objectToCamelCase(item));
  }

  if (typeof obj === 'object' && obj !== null) {
    const converted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const camelKey = snakeToCamel(key);
      converted[camelKey] = objectToCamelCase(value);
    }
    return converted;
  }

  return obj;
}

// ============================================================================
// TYPED CONVERSION FUNCTIONS
// ============================================================================

/**
 * Convert TaxRulesConfig from camelCase TypeScript to snake_case for WASM
 */
export function rulesConfigToSnakeCase(rules: TaxRulesConfig): unknown {
  return objectToSnakeCase(rules);
}

/**
 * Convert TaxCalculationInput from camelCase TypeScript to snake_case for WASM
 */
export function calculationInputToSnakeCase(input: TaxCalculationInput): unknown {
  return objectToSnakeCase(input);
}

/**
 * Convert TaxCalculationResult from snake_case WASM response to camelCase TypeScript
 */
export function calculationResultToCamelCase(result: unknown): TaxCalculationResult {
  return objectToCamelCase(result) as TaxCalculationResult;
}

// ============================================================================
// WASM JSON INTERFACE
// ============================================================================

/**
 * Serialize TaxRulesConfig to snake_case JSON string for WASM
 */
export function serializeRulesForWasm(rules: TaxRulesConfig): string {
  return JSON.stringify(rulesConfigToSnakeCase(rules));
}

/**
 * Serialize TaxCalculationInput to snake_case JSON string for WASM
 */
export function serializeInputForWasm(input: TaxCalculationInput): string {
  return JSON.stringify(calculationInputToSnakeCase(input));
}

/**
 * Parse WASM result JSON (snake_case) to TaxCalculationResult (camelCase)
 * @throws {Error} If JSON parsing fails or result is invalid
 */
export function parseWasmResult(jsonString: string): TaxCalculationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (error) {
    throw new Error(
      `Failed to parse WASM result JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('WASM result is not a valid object');
  }

  return calculationResultToCamelCase(parsed as Record<string, unknown>);
}

// ============================================================================
// SNAKE_CASE TYPE DEFINITIONS (for reference)
// ============================================================================

/**
 * Snake_case version of TaxRulesConfig for WASM interop.
 * These types document what the WASM module expects.
 */
export interface WasmTaxRulesConfig {
  state_code: string;
  version: number;
  trade_in_policy: WasmTradeInPolicy;
  rebates: WasmRebateRule[];
  doc_fee_taxable: boolean;
  fee_tax_rules: WasmFeeTaxRule[];
  tax_on_accessories: boolean;
  tax_on_negative_equity: boolean;
  tax_on_service_contracts: boolean;
  tax_on_gap: boolean;
  vehicle_tax_scheme: string;
  vehicle_uses_local_sales_tax: boolean;
  lease_rules: WasmLeaseTaxRules;
  reciprocity: WasmReciprocityRules;
  extras?: Record<string, unknown>;
}

export interface WasmTradeInPolicy {
  type: string;
  cap_amount?: number;
  percent?: number;
  notes?: string;
}

export interface WasmRebateRule {
  applies_to: string;
  taxable: boolean;
  notes?: string;
}

export interface WasmFeeTaxRule {
  code: string;
  taxable: boolean;
  notes?: string;
}

export interface WasmTitleFeeRule {
  code: string;
  taxable: boolean;
  included_in_cap_cost: boolean;
  included_in_upfront: boolean;
  included_in_monthly: boolean;
}

export interface WasmLeaseTaxRules {
  method: string;
  tax_cap_reduction: boolean;
  rebate_behavior: string;
  doc_fee_taxability: string;
  trade_in_credit: string;
  negative_equity_taxable: boolean;
  fee_tax_rules: WasmFeeTaxRule[];
  title_fee_rules: WasmTitleFeeRule[];
  tax_fees_upfront: boolean;
  special_scheme: string;
  notes?: string;
}

export interface WasmReciprocityRules {
  enabled: boolean;
  scope: string;
  home_state_behavior: string;
  require_proof_of_tax_paid: boolean;
  basis: string;
  cap_at_this_states_tax: boolean;
  has_lease_exception: boolean;
  overrides?: WasmReciprocityOverrideRule[];
  exempt_states?: string[];
  non_reciprocal_states?: string[];
  notes?: string;
}

export interface WasmReciprocityOverrideRule {
  origin_state: string;
  mode_override?: string;
  scope_override?: string;
  disallow_credit?: boolean;
  max_age_days_since_tax_paid?: number;
  requires_mutual_credit?: boolean;
  requires_same_owner?: boolean;
  applies_to_vehicle_class?: string;
  applies_to_gvw_range?: { min?: number; max?: number };
  notes?: string;
}

export interface WasmTaxCalculationInput {
  state_code: string;
  as_of_date: string;
  deal_type: string;
  home_state_code?: string;
  registration_state_code?: string;
  origin_tax_info?: WasmOriginTaxInfo;
  customer_is_new_resident?: boolean;
  vehicle_class?: string;
  gvw?: number;
  vehicle_price: number;
  accessories_amount: number;
  trade_in_value: number;
  rebate_manufacturer: number;
  rebate_dealer: number;
  doc_fee: number;
  other_fees: { code: string; amount: number }[];
  service_contracts: number;
  gap: number;
  negative_equity: number;
  tax_already_collected: number;
  rates: WasmTaxRateComponent[];
  // Lease fields (when deal_type === "LEASE")
  gross_cap_cost?: number;
  cap_reduction_cash?: number;
  cap_reduction_trade_in?: number;
  cap_reduction_rebate_manufacturer?: number;
  cap_reduction_rebate_dealer?: number;
  base_payment?: number;
  payment_count?: number;
}

export interface WasmOriginTaxInfo {
  state_code: string;
  amount: number;
  effective_rate?: number;
  tax_paid_date?: string;
}

export interface WasmTaxRateComponent {
  label: string;
  rate: number;
}

export interface WasmTaxCalculationResult {
  mode: string;
  bases: WasmTaxBaseBreakdown;
  taxes: WasmTaxAmountBreakdown;
  lease_breakdown?: WasmLeaseTaxBreakdown;
  debug: WasmAutoTaxDebug;
}

export interface WasmTaxBaseBreakdown {
  vehicle_base: number;
  fees_base: number;
  products_base: number;
  total_taxable_base: number;
}

export interface WasmTaxAmountBreakdown {
  component_taxes: { label: string; rate: number; amount: number }[];
  total_tax: number;
}

export interface WasmLeaseTaxBreakdown {
  upfront_taxable_base: number;
  upfront_taxes: WasmTaxAmountBreakdown;
  payment_taxable_base_per_period: number;
  payment_taxes_per_period: WasmTaxAmountBreakdown;
  total_tax_over_term: number;
}

export interface WasmAutoTaxDebug {
  applied_trade_in: number;
  applied_rebates_non_taxable: number;
  applied_rebates_taxable: number;
  taxable_doc_fee: number;
  taxable_fees: { code: string; amount: number }[];
  taxable_service_contracts: number;
  taxable_gap: number;
  reciprocity_credit: number;
  notes: string[];
}
