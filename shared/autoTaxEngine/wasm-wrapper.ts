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

// Auto-initialize on import (optional - can be removed if manual init is preferred)
if (typeof window !== 'undefined') {
  // Browser environment - initialize WASM
  initTaxEngineWasm().catch((error) => {
    console.warn('[Tax Engine] Failed to auto-initialize WASM:', error);
  });
}
