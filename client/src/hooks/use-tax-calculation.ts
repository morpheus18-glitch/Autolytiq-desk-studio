/**
 * Enhanced Tax Calculation Hook
 *
 * Uses the AutoTaxEngine backend API for accurate state-specific tax calculations.
 * Supports both RETAIL and LEASE deals with automatic state-based calculation methods.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import Decimal from 'decimal.js';

export interface TaxCalculationParams {
  // Required fields
  vehiclePrice: number;
  stateCode: string;

  // Deal type
  dealType?: 'RETAIL' | 'LEASE';

  // Location
  zipCode?: string;
  registrationState?: string;

  // Trade-in
  tradeValue?: number;
  tradePayoff?: number;

  // Fees
  docFee?: number;
  dealerFees?: number;

  // Products
  warrantyAmount?: number;
  gapInsurance?: number;
  maintenanceAmount?: number;
  accessoriesAmount?: number;
  aftermarketProducts?: number;

  // Incentives
  rebates?: number;
  dealerDiscount?: number;

  // Vehicle info
  vehicleType?: 'new' | 'used' | 'certified';
  fuelType?: 'gasoline' | 'hybrid' | 'electric' | 'diesel';

  // Lease-specific
  grossCapCost?: number;
  capReductionCash?: number;
  basePayment?: number;
  paymentCount?: number;
}

export interface TaxCalculationResult {
  taxableAmount: number;
  stateTax: number;
  stateTaxRate: number;
  localTax: number;
  localTaxRate: number;
  totalTax: number;
  effectiveTaxRate: number;
  titleFee: number;
  registrationFee: number;
  totalFees: number;
  totalTaxAndFees: number;
  tradeInTaxSavings: number;
  notes: string[];
  warnings: string[];
  engineResult?: {
    taxableAmount: number;
    totalTax: number;
    stateTax: number;
    localTax?: number;
    effectiveRate: number;
    tradeInSavings?: number;
    notes: string[];
    breakdown: Array<{
      label: string;
      taxable: number;
      rate: number;
      tax: number;
    }>;
  };
}

interface UseTaxCalculationOptions {
  enabled?: boolean;
  autoCalculate?: boolean;
  debounceMs?: number;
}

export function useTaxCalculation(
  params: TaxCalculationParams,
  options: UseTaxCalculationOptions = {}
) {
  const { enabled = true, autoCalculate = true, debounceMs = 500 } = options;

  const [debouncedParams, setDebouncedParams] = useState<TaxCalculationParams>(params);
  const [taxResult, setTaxResult] = useState<TaxCalculationResult | null>(null);

  // Debounce params to avoid too many API calls
  useEffect(() => {
    if (!autoCalculate) return;

    const timeout = setTimeout(() => {
      setDebouncedParams(params);
    }, debounceMs);

    return () => clearTimeout(timeout);
  }, [params, autoCalculate, debounceMs]);

  // Check if we have minimum required fields
  const canCalculate = useMemo(() => {
    return enabled &&
           params.vehiclePrice > 0 &&
           params.stateCode &&
           params.stateCode.length === 2;
  }, [enabled, params.vehiclePrice, params.stateCode]);

  // Tax calculation mutation
  const mutation = useMutation({
    mutationFn: async (calcParams: TaxCalculationParams) => {
      const response = await apiRequest('POST', '/api/tax/calculate', calcParams);
      return await response.json();
    },
    onSuccess: (data: TaxCalculationResult) => {
      setTaxResult(data);
    },
    onError: (error) => {
      console.error('[useTaxCalculation] Error:', error);
      setTaxResult(null);
    },
  });

  // Auto-calculate when debounced params change
  useEffect(() => {
    if (autoCalculate && canCalculate) {
      mutation.mutate(debouncedParams);
    }
  }, [autoCalculate, canCalculate, debouncedParams]);

  // Manual calculate function
  const calculate = useCallback((overrideParams?: Partial<TaxCalculationParams>) => {
    const calcParams = overrideParams ? { ...params, ...overrideParams } : params;
    if (calcParams.vehiclePrice > 0 && calcParams.stateCode) {
      mutation.mutate(calcParams);
    }
  }, [params, mutation]);

  // Reset function
  const reset = useCallback(() => {
    setTaxResult(null);
    mutation.reset();
  }, [mutation]);

  return {
    // Results
    taxResult,

    // Status
    isCalculating: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    canCalculate,

    // Actions
    calculate,
    reset,

    // For advanced use
    mutation,
  };
}

/**
 * Hook to detect if lease calculation method differs by state
 */
export function useLeaseCalculationMethod(stateCode: string) {
  const { data: stateRules } = useQuery({
    queryKey: ['taxRules', stateCode],
    queryFn: async () => {
      if (!stateCode || stateCode.length !== 2) return null;
      const response = await apiRequest('GET', `/api/tax/states/${stateCode}`);
      return await response.json();
    },
    enabled: !!stateCode && stateCode.length === 2,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  const leaseMethod = stateRules?.leaseRules?.method || 'MONTHLY';
  const specialScheme = stateRules?.leaseRules?.specialScheme || 'NONE';

  const methodDescription = useMemo(() => {
    switch (leaseMethod) {
      case 'FULL_UPFRONT':
        return 'Tax calculated on full lease amount upfront';
      case 'MONTHLY':
        return 'Tax calculated on each monthly payment';
      case 'HYBRID':
        return 'Tax on cap reduction upfront + tax on monthly payments';
      case 'NET_CAP_COST':
        return 'Tax on net capitalized cost upfront';
      case 'REDUCED_BASE':
        return 'Tax on reduced base upfront';
      default:
        return 'Standard lease taxation';
    }
  }, [leaseMethod]);

  const hasSpecialScheme = specialScheme !== 'NONE';

  return {
    leaseMethod,
    specialScheme,
    methodDescription,
    hasSpecialScheme,
    stateRules,
    isLoading: !stateRules,
  };
}
