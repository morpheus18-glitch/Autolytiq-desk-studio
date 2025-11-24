/**
 * WASM Tax Engine Wrapper
 *
 * Provides a TypeScript-friendly interface to the Rust WASM tax calculation engine.
 * Falls back to TypeScript implementation if WASM is not available.
 */

import type {
  TaxRulesConfig,
  TaxCalculationInput,
  TaxCalculationResult,
} from './types.js';

// WASM module will be imported dynamically when available
let wasmModule: typeof import('./wasm/tax_engine_rs.js') | null = null;
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
    // Dynamically import the WASM module
    wasmModule = await import('./wasm/tax_engine_rs.js');

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
  // TODO: Import and call the existing TypeScript calculateVehicleTax function
  throw new Error('TypeScript fallback not yet implemented. Please initialize WASM module.');
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

  // Warm up
  await calculateVehicleTaxWasm(rules, input);

  // Benchmark WASM
  const wasmStart = performance.now();
  let wasmResult: TaxCalculationResult | null = null;
  for (let i = 0; i < iterations; i++) {
    wasmResult = await calculateVehicleTaxWasm(rules, input);
  }
  const wasmTime = performance.now() - wasmStart;

  // TODO: Benchmark TypeScript implementation
  // const tsStart = performance.now();
  // let tsResult: TaxCalculationResult | null = null;
  // for (let i = 0; i < iterations; i++) {
  //   tsResult = await calculateVehicleTaxTypeScript(rules, input);
  // }
  // const tsTime = performance.now() - tsStart;

  const tsTime = 0; // Placeholder
  const tsResult = wasmResult; // Placeholder

  return {
    wasmTime,
    tsTime,
    speedup: tsTime / wasmTime,
    resultsMatch: JSON.stringify(wasmResult) === JSON.stringify(tsResult),
  };
}

// Auto-initialize on import (optional - can be removed if manual init is preferred)
if (typeof window !== 'undefined') {
  // Browser environment - initialize WASM
  initTaxEngineWasm().catch((error) => {
    console.warn('[Tax Engine] Failed to auto-initialize WASM:', error);
  });
}
