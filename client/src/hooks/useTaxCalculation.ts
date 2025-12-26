/**
 * Tax Calculation Hooks
 *
 * React Query hooks for the Tax Service API.
 * Provides hooks for:
 * - Tax calculation (retail and lease)
 * - Jurisdiction resolution from customer address
 * - State tax rules lookup
 * - Reciprocity rules lookup
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState, useCallback, useEffect, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

export type TaxDealType = 'RETAIL' | 'LEASE';

export interface TaxRateComponent {
  label: string;
  rate: number;
}

export interface OtherFee {
  code: string;
  amount: number;
}

export interface OriginTaxInfo {
  stateCode: string;
  amount: number;
  effectiveRate?: number;
  taxPaidDate?: string;
}

export interface TaxCalculationRequest {
  stateCode: string;
  asOfDate?: string;
  dealType: TaxDealType;
  vehiclePrice: number;
  accessoriesAmount?: number;
  tradeInValue?: number;
  rebateManufacturer?: number;
  rebateDealer?: number;
  docFee?: number;
  otherFees?: OtherFee[];
  serviceContracts?: number;
  gap?: number;
  negativeEquity?: number;
  taxAlreadyCollected?: number;
  rates: TaxRateComponent[];
  // Lease-specific
  grossCapCost?: number;
  capReductionCash?: number;
  capReductionTradeIn?: number;
  capReductionRebateManufacturer?: number;
  capReductionRebateDealer?: number;
  basePayment?: number;
  paymentCount?: number;
  // Reciprocity
  homeStateCode?: string;
  registrationStateCode?: string;
  originTaxInfo?: OriginTaxInfo;
}

export interface TaxBaseBreakdown {
  vehicleBase: number;
  feesBase: number;
  productsBase: number;
  totalTaxableBase: number;
}

export interface ComponentTax {
  label: string;
  rate: number;
  amount: number;
}

export interface TaxAmountBreakdown {
  componentTaxes: ComponentTax[];
  totalTax: number;
}

export interface LeaseTaxBreakdown {
  upfrontTaxableBase: number;
  upfrontTaxes: TaxAmountBreakdown;
  paymentTaxableBasePerPeriod: number;
  paymentTaxesPerPeriod: TaxAmountBreakdown;
  totalTaxOverTerm: number;
}

export interface TaxCalculationResult {
  mode: TaxDealType;
  bases: TaxBaseBreakdown;
  taxes: TaxAmountBreakdown;
  leaseBreakdown?: LeaseTaxBreakdown;
  taxableBase: number;
  totalTax: number;
}

export interface JurisdictionRequest {
  street?: string;
  city?: string;
  state: string;
  zip?: string;
  county?: string;
}

export interface JurisdictionResult {
  stateCode: string;
  jurisdictionCode: string;
  jurisdictionName: string;
  combinedRate: number;
  stateRate: number;
  localRate: number;
  countyFips?: string;
  countyName?: string;
  cityName?: string;
  vehicleUsesLocalTax: boolean;
  schemaVersion: number;
  notes?: string;
}

export interface StateInfo {
  code: string;
  name: string;
  rate: number;
  special?: 'TAVT' | 'HUT' | 'PRIVILEGE';
  tradeInCap?: number;
  taxCap?: number;
}

export interface StateRules {
  stateCode: string;
  tradeInPolicy: {
    type: 'FULL' | 'CAPPED' | 'NONE' | 'PERCENT';
    capAmount?: number;
    percent?: number;
  };
  docFeeTaxable: boolean;
  taxOnAccessories: boolean;
  taxOnNegativeEquity: boolean;
  taxOnServiceContracts: boolean;
  taxOnGap: boolean;
  vehicleUsesLocalSalesTax: boolean;
  vehicleTaxScheme?: string;
  extras?: Record<string, unknown>;
}

// ============================================================================
// Query Keys
// ============================================================================

export const taxQueryKeys = {
  all: ['tax'] as const,
  states: () => [...taxQueryKeys.all, 'states'] as const,
  stateRules: (code: string) => [...taxQueryKeys.all, 'rules', code] as const,
  jurisdiction: (address: JurisdictionRequest) =>
    [...taxQueryKeys.all, 'jurisdiction', address] as const,
  reciprocity: (home: string, transaction: string) =>
    [...taxQueryKeys.all, 'reciprocity', home, transaction] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch all supported states and their base rates
 */
export function useStates() {
  return useQuery({
    queryKey: taxQueryKeys.states(),
    queryFn: () => api.get<StateInfo[]>('/tax/states'),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - state data rarely changes
  });
}

/**
 * Hook to fetch tax rules for a specific state
 */
export function useStateRules(stateCode: string) {
  return useQuery({
    queryKey: taxQueryKeys.stateRules(stateCode),
    queryFn: () => api.get<StateRules>(`/tax/states/${stateCode}`),
    enabled: !!stateCode && stateCode.length === 2,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Hook to resolve customer address to tax jurisdiction
 */
export function useJurisdiction(address: JurisdictionRequest | null) {
  return useQuery({
    queryKey: taxQueryKeys.jurisdiction(address || { state: '' }),
    queryFn: () => api.post<JurisdictionResult>('/tax/jurisdiction', address),
    enabled: !!address?.state,
  });
}

/**
 * Mutation hook for one-off jurisdiction resolution
 */
export function useResolveJurisdiction() {
  return useMutation({
    mutationFn: (address: JurisdictionRequest) =>
      api.post<JurisdictionResult>('/tax/jurisdiction', address),
  });
}

/**
 * Mutation hook for tax calculation
 */
export function useCalculateTax() {
  return useMutation({
    mutationFn: (request: TaxCalculationRequest) =>
      api.post<TaxCalculationResult>('/tax/calculate', request),
  });
}

/**
 * Hook for real-time tax calculation with debouncing
 * Automatically recalculates when inputs change
 */
export function useRealtimeTaxCalculation(
  request: TaxCalculationRequest | null,
  options: { debounceMs?: number; enabled?: boolean } = {}
) {
  const { debounceMs = 300, enabled = true } = options;
  const [result, setResult] = useState<TaxCalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const calculate = useCallback(async (req: TaxCalculationRequest) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsCalculating(true);
    setError(null);

    try {
      const response = await api.post<TaxCalculationResult>('/tax/calculate', req, {
        signal: controller.signal,
      });
      // Only update state if this request wasn't aborted
      if (!controller.signal.aborted) {
        setResult(response);
      }
    } catch (err) {
      // Ignore abort errors - they're expected when canceling stale requests
      if ((err as Error).name === 'AbortError') {
        return;
      }
      // Only set error if this request wasn't aborted
      if (!controller.signal.aborted) {
        setError(err as Error);
      }
    } finally {
      // Only update loading state if this request wasn't aborted
      if (!controller.signal.aborted) {
        setIsCalculating(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled || !request?.stateCode || !request?.rates?.length) {
      return;
    }

    // Debounce the calculation
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      calculate(request);
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [request, enabled, debounceMs, calculate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { result, isCalculating, error };
}

/**
 * Hook for customer address-driven tax context
 * Automatically resolves jurisdiction when address changes
 */
export function useTaxJurisdiction(
  address: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    county?: string;
  } | null
) {
  const [taxContext, setTaxContext] = useState<JurisdictionResult | null>(null);

  const jurisdictionRequest: JurisdictionRequest | null = address?.state
    ? {
        street: address.street,
        city: address.city,
        state: address.state,
        zip: address.zipCode,
        county: address.county,
      }
    : null;

  const { data, isLoading, error } = useJurisdiction(jurisdictionRequest);

  useEffect(() => {
    if (data) {
      setTaxContext(data);
    }
  }, [data]);

  return {
    taxContext,
    isLoading,
    error,
    // Helper to build rates array for calculation
    getRates: useCallback((): TaxRateComponent[] => {
      if (!taxContext) return [];
      const rates: TaxRateComponent[] = [{ label: 'STATE', rate: taxContext.stateRate }];
      if (taxContext.vehicleUsesLocalTax && taxContext.localRate > 0) {
        rates.push({ label: 'LOCAL', rate: taxContext.localRate });
      }
      return rates;
    }, [taxContext]),
  };
}

/**
 * Combined hook for deal tax calculation
 * Integrates jurisdiction resolution with tax calculation
 */
export function useDealTaxCalculation(params: {
  customerAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    county?: string;
  };
  dealType: TaxDealType;
  vehiclePrice: number;
  tradeInValue?: number;
  rebateManufacturer?: number;
  rebateDealer?: number;
  docFee?: number;
  otherFees?: OtherFee[];
  serviceContracts?: number;
  gap?: number;
  negativeEquity?: number;
  // Lease-specific
  grossCapCost?: number;
  basePayment?: number;
  paymentCount?: number;
}) {
  const queryClient = useQueryClient();
  const { taxContext, isLoading: jurisdictionLoading } = useTaxJurisdiction(
    params.customerAddress || null
  );

  // Build the calculation request when we have jurisdiction
  const calculationRequest: TaxCalculationRequest | null =
    taxContext && params.vehiclePrice > 0
      ? {
          stateCode: taxContext.stateCode,
          dealType: params.dealType,
          vehiclePrice: params.vehiclePrice,
          tradeInValue: params.tradeInValue || 0,
          rebateManufacturer: params.rebateManufacturer || 0,
          rebateDealer: params.rebateDealer || 0,
          docFee: params.docFee || 0,
          otherFees: params.otherFees || [],
          serviceContracts: params.serviceContracts || 0,
          gap: params.gap || 0,
          negativeEquity: params.negativeEquity || 0,
          rates: [
            { label: 'STATE', rate: taxContext.stateRate },
            ...(taxContext.vehicleUsesLocalTax && taxContext.localRate > 0
              ? [{ label: 'LOCAL', rate: taxContext.localRate }]
              : []),
          ],
          // Lease-specific
          grossCapCost: params.grossCapCost,
          basePayment: params.basePayment,
          paymentCount: params.paymentCount,
        }
      : null;

  const { result, isCalculating, error } = useRealtimeTaxCalculation(calculationRequest, {
    enabled: !!taxContext,
  });

  // Invalidation helper
  const recalculate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: taxQueryKeys.all });
  }, [queryClient]);

  return {
    taxContext,
    taxResult: result,
    isLoading: jurisdictionLoading || isCalculating,
    error,
    recalculate,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format a tax amount as currency
 */
export function formatTaxAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format a tax rate as percentage
 */
export function formatTaxRate(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}

/**
 * Get human-readable deal type label
 */
export function getTaxDealTypeLabel(dealType: TaxDealType): string {
  return dealType === 'RETAIL' ? 'Purchase' : 'Lease';
}

/**
 * Calculate effective tax rate from result
 */
export function getEffectiveTaxRate(result: TaxCalculationResult): number {
  if (result.taxableBase === 0) return 0;
  return result.totalTax / result.taxableBase;
}
