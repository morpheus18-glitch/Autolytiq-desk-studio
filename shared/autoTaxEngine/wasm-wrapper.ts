/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, no-console */
/**
 * WASM Tax Engine Wrapper
 *
 * Provides a TypeScript-friendly interface to the Rust WASM tax calculation engine.
 * Falls back to TypeScript implementation if WASM is not available.
 */

import type { TaxRulesConfig, TaxCalculationInput, TaxCalculationResult } from './types.js';
import { calculateTax } from './engine/calculateTax.js';

// Declare performance for non-browser environments
declare const performance: { now: () => number };

// WASM module will be imported dynamically when available
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wasmModule: any = null;
let wasmInitialized = false;

/**
 * Initialize the WASM module
 * Call this once at application startup
 */
export async function initTaxEngineWasm(): Promise<boolean> {
  if (wasmInitialized) {
    return true;
  }

  try {
    // Dynamically import the WASM module (path variable prevents TS module resolution)
    const wasmPath = './wasm/tax_engine_rs.js';
    wasmModule = await import(/* webpackIgnore: true */ wasmPath);

    // Initialize the WASM module
    await wasmModule.default();

    wasmInitialized = true;
    console.log('[Tax Engine] WASM module loaded successfully');
    return true;
  } catch (error) {
    console.warn('[Tax Engine] WASM module not available, using TypeScript fallback', error);
    return false;
  }
}

/**
 * Check if WASM module is available and initialized
 */
export function isWasmAvailable(): boolean {
  return wasmInitialized && wasmModule !== null;
}

/**
 * Calculate vehicle tax using the Rust WASM engine
 *
 * This function provides the same interface as the TypeScript implementation
 * but uses the high-performance Rust WASM module when available.
 *
 * @param rules - State tax rules configuration
 * @param input - Deal calculation input
 * @returns Tax calculation result
 */
export async function calculateVehicleTaxWasm(
  rules: TaxRulesConfig,
  input: TaxCalculationInput
): Promise<TaxCalculationResult> {
  // Ensure WASM is initialized
  if (!wasmInitialized) {
    await initTaxEngineWasm();
  }

  // If WASM is available, use it
  if (isWasmAvailable() && wasmModule) {
    try {
      const rulesJson = JSON.stringify(rules);
      const inputJson = JSON.stringify(input);

      const resultJson = wasmModule.calculate_vehicle_tax(rulesJson, inputJson);
      const result = JSON.parse(resultJson) as TaxCalculationResult;

      return result;
    } catch (error) {
      console.error('[Tax Engine] WASM calculation failed, falling back to TypeScript', error);
      // Fall through to TypeScript implementation
    }
  }

  // Fall back to TypeScript implementation
  return calculateTax(input, rules);
}

/**
 * Get the version of the tax engine
 */
export function getTaxEngineVersion(): string {
  if (isWasmAvailable() && wasmModule) {
    try {
      return `WASM ${wasmModule.get_version()}`;
    } catch {
      // Fall through
    }
  }

  return 'TypeScript 1.0.0';
}

/**
 * Performance comparison helper
 *
 * Runs the same calculation using both WASM and TypeScript implementations
 * to compare performance and verify correctness.
 */
export async function compareTaxEnginePerformance(
  rules: TaxRulesConfig,
  input: TaxCalculationInput,
  iterations = 1000
): Promise<{
  wasmTime: number;
  tsTime: number;
  speedup: number;
  resultsMatch: boolean;
}> {
  if (!isWasmAvailable()) {
    throw new Error('WASM module not available for performance comparison');
  }

  // Warm up both implementations
  await calculateVehicleTaxWasm(rules, input);
  calculateTax(input, rules);

  // Benchmark WASM
  const wasmStart = performance.now();
  let wasmResult: TaxCalculationResult | null = null;
  for (let i = 0; i < iterations; i++) {
    wasmResult = await calculateVehicleTaxWasm(rules, input);
  }
  const wasmTime = performance.now() - wasmStart;

  // Benchmark TypeScript implementation
  const tsStart = performance.now();
  let tsResult: TaxCalculationResult | null = null;
  for (let i = 0; i < iterations; i++) {
    tsResult = calculateTax(input, rules);
  }
  const tsTime = performance.now() - tsStart;

  // Compare results (check total tax matches within small tolerance)
  const resultsMatch =
    wasmResult !== null &&
    tsResult !== null &&
    Math.abs(wasmResult.taxes.totalTax - tsResult.taxes.totalTax) < 0.01;

  return {
    wasmTime,
    tsTime,
    speedup: tsTime > 0 ? tsTime / wasmTime : 0,
    resultsMatch,
  };
}

// ============================================================================
// Rate Bundle Loading (Runtime Rate Configuration)
// ============================================================================

/**
 * Rate Bundle Metadata - information about loaded rates
 */
export interface RateBundleMetadata {
  bundleId: string;
  stateCount: number;
  localJurisdictionCount: number;
  effectiveDate: string;
  generatedAt: string;
  source?: string;
}

/**
 * Rate Initialization Result
 */
export interface RateInitResult {
  success: boolean;
  error?: string;
  metadata?: RateBundleMetadata;
}

/**
 * Rate Bundle Info (status check)
 */
export interface RateBundleInfo {
  loaded: boolean;
  bundleId?: string;
  stateCount?: number;
  localJurisdictionCount?: number;
  effectiveDate?: string;
  generatedAt?: string;
  source?: string;
  message?: string;
}

/**
 * Initialize tax rates from external JSON bundle
 *
 * CRITICAL: Call this before any tax calculations to load current rates.
 * Without initialization, the engine uses compiled defaults which may be outdated.
 *
 * @param bundleJson - JSON string conforming to RateBundleV1 schema
 * @returns Result with success status and metadata
 *
 * @example
 * ```typescript
 * // Fetch rates from your Tax Service API
 * const response = await fetch('/api/tax/rates/bundle');
 * const bundleJson = await response.text();
 *
 * // Initialize the WASM engine
 * const result = await initializeTaxRates(bundleJson);
 * if (result.success) {
 *   console.log(`Loaded ${result.metadata?.stateCount} state rates`);
 * }
 * ```
 */
export async function initializeTaxRates(bundleJson: string): Promise<RateInitResult> {
  // Ensure WASM is initialized first
  if (!wasmInitialized) {
    await initTaxEngineWasm();
  }

  if (!isWasmAvailable() || !wasmModule) {
    return {
      success: false,
      error: 'WASM module not available. Cannot load rate bundle.',
    };
  }

  try {
    const resultJson = wasmModule.initialize_rates(bundleJson);
    const result = JSON.parse(resultJson) as {
      success: boolean;
      error?: string;
      bundle_id?: string;
      state_count?: number;
      local_jurisdiction_count?: number;
      effective_date?: string;
      generated_at?: string;
    };

    if (result.success) {
      console.log(`[Tax Engine] Loaded rate bundle: ${result.bundle_id} (${result.state_count} states)`);
      return {
        success: true,
        metadata: {
          bundleId: result.bundle_id ?? '',
          stateCount: result.state_count ?? 0,
          localJurisdictionCount: result.local_jurisdiction_count ?? 0,
          effectiveDate: result.effective_date ?? '',
          generatedAt: result.generated_at ?? '',
        },
      };
    } else {
      return {
        success: false,
        error: result.error ?? 'Unknown error loading rate bundle',
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Tax Engine] Failed to initialize rates:', error);
    return {
      success: false,
      error: `Failed to initialize rates: ${errorMessage}`,
    };
  }
}

/**
 * Check if rates have been loaded
 */
export function areRatesLoaded(): boolean {
  if (!isWasmAvailable() || !wasmModule) {
    return false;
  }

  try {
    return wasmModule.rates_loaded() as boolean;
  } catch {
    return false;
  }
}

/**
 * Clear loaded rates (revert to compiled defaults)
 *
 * Use this to force the engine to use compiled default rates,
 * or before re-initializing with a new bundle.
 */
export function clearTaxRates(): void {
  if (!isWasmAvailable() || !wasmModule) {
    return;
  }

  try {
    wasmModule.clear_rates();
    console.log('[Tax Engine] Cleared rate bundle, using compiled defaults');
  } catch (error) {
    console.error('[Tax Engine] Failed to clear rates:', error);
  }
}

/**
 * Get information about the currently loaded rate bundle
 */
export function getRateBundleInfo(): RateBundleInfo {
  if (!isWasmAvailable() || !wasmModule) {
    return {
      loaded: false,
      message: 'WASM module not available',
    };
  }

  try {
    const resultJson = wasmModule.get_rate_bundle_info();
    const result = JSON.parse(resultJson) as {
      loaded: boolean;
      bundle_id?: string;
      state_count?: number;
      local_jurisdiction_count?: number;
      effective_date?: string;
      generated_at?: string;
      source?: string;
      message?: string;
    };

    return {
      loaded: result.loaded,
      bundleId: result.bundle_id,
      stateCount: result.state_count,
      localJurisdictionCount: result.local_jurisdiction_count,
      effectiveDate: result.effective_date,
      generatedAt: result.generated_at,
      source: result.source,
      message: result.message,
    };
  } catch (error) {
    console.error('[Tax Engine] Failed to get rate bundle info:', error);
    return {
      loaded: false,
      message: 'Failed to get rate bundle info',
    };
  }
}

/**
 * State Rate Information
 */
export interface StateRateInfo {
  found: boolean;
  fromBundle: boolean;
  stateCode: string;
  stateRate?: number;
  avgLocalRate?: number;
  maxLocalRate?: number;
  combinedRate: number;
  hasLocalVehicleTax?: boolean;
  lastUpdated?: string;
  source?: string;
  notes?: string;
  note?: string; // For default rates
}

/**
 * Get detailed rate information for a state
 *
 * Returns the rate from the loaded bundle if available,
 * otherwise returns the compiled default rate.
 */
export function getStateRateInfo(stateCode: string): StateRateInfo {
  if (!isWasmAvailable() || !wasmModule) {
    // Can't use WASM, return placeholder
    return {
      found: false,
      fromBundle: false,
      stateCode,
      combinedRate: 0.07, // Generic fallback
      note: 'WASM not available',
    };
  }

  try {
    const resultJson = wasmModule.get_state_rate_info(stateCode);
    const result = JSON.parse(resultJson) as {
      found: boolean;
      from_bundle: boolean;
      state_code: string;
      state_rate?: number;
      avg_local_rate?: number;
      max_local_rate?: number;
      combined_rate: number;
      has_local_vehicle_tax?: boolean;
      last_updated?: string;
      source?: string;
      notes?: string;
      note?: string;
    };

    return {
      found: result.found,
      fromBundle: result.from_bundle,
      stateCode: result.state_code,
      stateRate: result.state_rate,
      avgLocalRate: result.avg_local_rate,
      maxLocalRate: result.max_local_rate,
      combinedRate: result.combined_rate,
      hasLocalVehicleTax: result.has_local_vehicle_tax,
      lastUpdated: result.last_updated,
      source: result.source,
      notes: result.notes,
      note: result.note,
    };
  } catch (error) {
    console.error('[Tax Engine] Failed to get state rate info:', error);
    return {
      found: false,
      fromBundle: false,
      stateCode,
      combinedRate: 0.07,
      note: 'Error retrieving rate',
    };
  }
}

/**
 * Fetch and load rates from a URL
 *
 * Convenience function that fetches the rate bundle from an API endpoint
 * and initializes the tax engine.
 *
 * @param url - URL to fetch rate bundle from
 * @returns Result with success status and metadata
 */
export async function loadRatesFromUrl(url: string): Promise<RateInitResult> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch rates: ${response.status} ${response.statusText}`,
      };
    }

    const bundleJson = await response.text();
    return initializeTaxRates(bundleJson);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to load rates from URL: ${errorMessage}`,
    };
  }
}

// Auto-initialize on import (optional - can be removed if manual init is preferred)
if (typeof window !== 'undefined') {
  // Browser environment - initialize WASM
  initTaxEngineWasm().catch((error) => {
    console.warn('[Tax Engine] Failed to auto-initialize WASM:', error);
  });
}
