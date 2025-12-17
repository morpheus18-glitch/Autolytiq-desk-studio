/**
 * ATIE (Automotive Tax Intelligence Engine) Integration Hook
 *
 * Provides React hooks for using the Rust WASM tax engine.
 * Replaces the old TypeScript calculator with production-ready ATIE.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { DealInput, DealResult } from './useDealCalculator';

// WASM module imports
let atieModule: any = null;
let atieLoaded = false;

/**
 * Load ATIE WASM module
 */
async function loadATIE() {
  if (atieLoaded) return atieModule;

  try {
    // Dynamic import to avoid bundling issues
    const wasm = await import('@shared/autoTaxEngine/wasm/tax_engine_rs.js');
    atieModule = wasm;
    atieLoaded = true;
    console.log('[ATIE] Loaded version:', wasm.get_atie_version());
    return wasm;
  } catch (err) {
    console.error('[ATIE] Failed to load WASM module:', err);
    throw new Error('Failed to load ATIE tax engine');
  }
}

/**
 * Convert DealInput to ATIE JSON format
 */
function convertToATIEFormat(input: DealInput): any {
  return {
    deal_type: input.deal_type,
    state_code: input.state_code,
    selling_price: input.selling_price,
    vehicle_msrp: input.vehicle_msrp,
    vehicle_invoice: input.vehicle_invoice,

    // Trade-in
    trade_in: input.trade_in ? {
      gross_allowance: input.trade_in.gross_allowance,
      payoff_amount: input.trade_in.payoff_amount,
      acv: input.trade_in.acv,
    } : undefined,

    // Rebates
    rebates: input.rebates.map(r => ({
      name: r.name,
      amount: r.amount,
      rebate_type: r.rebate_type,
      taxable: r.taxable || false,
      apply_to_cap_cost: r.apply_to_cap_cost,
    })),

    // Cash down
    cash_down: input.cash_down,

    // F&I Products
    fi_products: input.fi_products.map(p => ({
      name: p.name,
      code: p.code,
      price: p.price,
      cost: p.cost || 0,
      finance_with_deal: p.finance_with_deal,
    })),

    // Fees
    fees: input.fees.map(f => ({
      name: f.name,
      code: f.code,
      amount: f.amount,
      taxable: f.taxable || false,
      capitalize_in_lease: f.capitalize_in_lease,
    })),

    // Finance options
    finance_input: input.finance_input ? {
      apr: input.finance_input.apr,
      term_months: input.finance_input.term_months,
      payment_frequency: input.finance_input.payment_frequency,
      buy_rate: input.finance_input.buy_rate,
    } : undefined,

    // Lease options
    lease_input: input.lease_input ? {
      term_months: input.lease_input.term_months,
      annual_mileage: input.lease_input.annual_mileage,
      excess_mileage_rate: input.lease_input.excess_mileage_rate,
      residual_percent: input.lease_input.residual_percent,
      residual_value: input.lease_input.residual_value,
      money_factor: input.lease_input.money_factor,
      security_deposit: input.lease_input.security_deposit,
      security_deposit_waived: input.lease_input.security_deposit_waived,
      first_payment_due_at_signing: input.lease_input.first_payment_due_at_signing,
      acquisition_fee: input.lease_input.acquisition_fee,
      acquisition_fee_cap: input.lease_input.acquisition_fee_cap,
      disposition_fee: input.lease_input.disposition_fee,
      disposition_fee_waived: input.lease_input.disposition_fee_waived,
      sign_and_drive: input.lease_input.sign_and_drive,
      one_pay_lease: input.lease_input.one_pay_lease,
    } : undefined,
  };
}

/**
 * Convert ATIE result to DealResult format
 */
function convertFromATIEResult(atieResult: any): DealResult {
  // ATIE returns the same structure, just need to ensure type compatibility
  return {
    deal_type: atieResult.deal_type,
    is_valid: atieResult.is_valid,
    validation_errors: atieResult.validation_errors || [],
    price_breakdown: atieResult.price_breakdown,
    tax_breakdown: atieResult.tax_breakdown,
    payment_info: atieResult.payment_info,
    profit_analysis: atieResult.profit_analysis,
    totals: atieResult.totals,
    payment_matrix: atieResult.payment_matrix,
  };
}

/**
 * Main hook for ATIE integration
 */
export function useATIE() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DealResult | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const initRef = useRef(false);

  // Initialize ATIE on mount
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    loadATIE()
      .then(() => {
        setEngineReady(true);
        console.log('[ATIE] Engine ready');
      })
      .catch(err => {
        setError(err.message);
        console.error('[ATIE] Initialization failed:', err);
      });
  }, []);

  /**
   * Calculate a deal using ATIE
   */
  const calculateDeal = useCallback(async (input: DealInput): Promise<DealResult> => {
    if (!engineReady || !atieModule) {
      throw new Error('ATIE engine not ready');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Convert to ATIE format
      const atieInput = convertToATIEFormat(input);

      // Call WASM function
      const resultJson = atieModule.calculate_deal(JSON.stringify(atieInput));
      const atieResult = JSON.parse(resultJson);

      // Convert to our format
      const result = convertFromATIEResult(atieResult);
      setResult(result);

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'ATIE calculation failed';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [engineReady]);

  /**
   * Get tax rules for a specific state
   */
  const getStateRules = useCallback((stateCode: string) => {
    if (!engineReady || !atieModule) {
      throw new Error('ATIE engine not ready');
    }

    try {
      const rulesJson = atieModule.get_state_rules(stateCode);
      return JSON.parse(rulesJson);
    } catch (err) {
      console.error('[ATIE] Failed to get state rules:', err);
      return null;
    }
  }, [engineReady]);

  /**
   * Get all supported states
   */
  const getSupportedStates = useCallback(() => {
    if (!engineReady || !atieModule) return [];

    try {
      const statesJson = atieModule.get_supported_states();
      return JSON.parse(statesJson);
    } catch (err) {
      console.error('[ATIE] Failed to get supported states:', err);
      return [];
    }
  }, [engineReady]);

  /**
   * Get ATIE version
   */
  const getVersion = useCallback(() => {
    if (!engineReady || !atieModule) return 'Not loaded';
    return atieModule.get_atie_version();
  }, [engineReady]);

  return {
    // Calculation
    calculateDeal,
    result,
    isLoading,
    error,

    // State info
    getStateRules,
    getSupportedStates,
    getVersion,

    // Status
    engineReady,
  };
}

export default useATIE;
