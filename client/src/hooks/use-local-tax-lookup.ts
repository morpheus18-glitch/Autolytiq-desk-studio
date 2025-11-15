/**
 * USE LOCAL TAX LOOKUP HOOK
 *
 * React hook for fetching local tax rates by ZIP code.
 * Integrates with the local tax rate API and provides caching via React Query.
 *
 * Features:
 * - Auto-lookup when ZIP code is entered (debounced)
 * - Caching with React Query (1 hour stale time)
 * - Loading and error states
 * - Jurisdiction breakdown
 * - Bulk lookup support
 *
 * Example usage:
 * ```tsx
 * const { localRate, isLoading, error } = useLocalTaxLookup("90210", "CA");
 * ```
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";

// ============================================================================
// TYPES
// ============================================================================

export interface LocalTaxRateInfo {
  zipCode: string;
  stateCode: string;
  countyName: string;
  cityName: string | null;
  stateTaxRate: number;
  countyRate: number;
  cityRate: number;
  specialDistrictRate: number;
  combinedLocalRate: number;
  totalRate: number;
  breakdown: TaxRateBreakdown[];
  source: "database" | "fallback";
}

export interface TaxRateBreakdown {
  jurisdictionType: "STATE" | "COUNTY" | "CITY" | "SPECIAL_DISTRICT";
  name: string;
  rate: number;
}

export interface JurisdictionBreakdown {
  county: { name: string; rate: number } | null;
  city: { name: string; rate: number } | null;
  specialDistricts: { name: string; rate: number }[];
  combinedLocalRate: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

async function fetchLocalTaxRate(
  zipCode: string,
  stateCode: string
): Promise<LocalTaxRateInfo> {
  const response = await fetch(
    `/api/tax/local/${zipCode}?stateCode=${stateCode}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch local tax rate: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Unknown error fetching local tax rate");
  }

  return data.data;
}

async function fetchJurisdictionBreakdown(
  zipCode: string
): Promise<JurisdictionBreakdown> {
  const response = await fetch(`/api/tax/breakdown/${zipCode}`);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch jurisdiction breakdown: ${response.statusText}`
    );
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(
      data.error || "Unknown error fetching jurisdiction breakdown"
    );
  }

  return data.data;
}

async function bulkFetchLocalTaxRates(
  zipCodes: string[],
  stateCode: string
): Promise<Record<string, LocalTaxRateInfo>> {
  const response = await fetch("/api/tax/local/bulk", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ zipCodes, stateCode }),
  });

  if (!response.ok) {
    throw new Error(`Failed to bulk fetch tax rates: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Unknown error in bulk fetch");
  }

  return data.data;
}

async function searchJurisdictions(
  query: string,
  stateCode?: string
): Promise<any[]> {
  const params = new URLSearchParams({ q: query });
  if (stateCode) {
    params.append("stateCode", stateCode);
  }

  const response = await fetch(`/api/tax/local/search?${params.toString()}`);

  if (!response.ok) {
    throw new Error(
      `Failed to search jurisdictions: ${response.statusText}`
    );
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Unknown error searching jurisdictions");
  }

  return data.data;
}

// ============================================================================
// PRIMARY HOOK - LOCAL TAX LOOKUP BY ZIP
// ============================================================================

/**
 * Fetch local tax rate for a ZIP code
 *
 * @param zipCode - 5-digit ZIP code
 * @param stateCode - 2-character state code
 * @param options - React Query options
 */
export function useLocalTaxLookup(
  zipCode: string | undefined,
  stateCode: string | undefined,
  options?: {
    enabled?: boolean;
    staleTime?: number;
  }
) {
  const enabled =
    options?.enabled !== false &&
    Boolean(zipCode && zipCode.length === 5 && stateCode);

  return useQuery({
    queryKey: ["localTaxRate", zipCode, stateCode],
    queryFn: () => fetchLocalTaxRate(zipCode!, stateCode!),
    enabled,
    staleTime: options?.staleTime ?? 1000 * 60 * 60, // 1 hour default
    retry: 2,
  });
}

// ============================================================================
// DEBOUNCED LOOKUP - Auto-lookup as user types ZIP
// ============================================================================

/**
 * Auto-lookup local tax rate with debouncing
 *
 * Automatically fetches tax rate when ZIP code is fully entered.
 * Includes 500ms debounce to avoid excessive API calls.
 *
 * @param zipCode - ZIP code (updates as user types)
 * @param stateCode - 2-character state code
 * @param debounceMs - Debounce delay in milliseconds (default: 500)
 */
export function useDebouncedLocalTaxLookup(
  zipCode: string | undefined,
  stateCode: string | undefined,
  debounceMs: number = 500
) {
  const [debouncedZip, setDebouncedZip] = useState(zipCode);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedZip(zipCode);
    }, debounceMs);

    return () => {
      clearTimeout(handler);
    };
  }, [zipCode, debounceMs]);

  return useLocalTaxLookup(debouncedZip, stateCode);
}

// ============================================================================
// JURISDICTION BREAKDOWN HOOK
// ============================================================================

/**
 * Fetch detailed jurisdiction breakdown for a ZIP code
 *
 * Returns structured breakdown of county, city, and special district rates.
 *
 * @param zipCode - 5-digit ZIP code
 */
export function useJurisdictionBreakdown(zipCode: string | undefined) {
  return useQuery({
    queryKey: ["jurisdictionBreakdown", zipCode],
    queryFn: () => fetchJurisdictionBreakdown(zipCode!),
    enabled: Boolean(zipCode && zipCode.length === 5),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

// ============================================================================
// BULK LOOKUP HOOK
// ============================================================================

/**
 * Bulk fetch local tax rates for multiple ZIP codes
 *
 * Useful for batch processing or pre-fetching multiple locations.
 *
 * @returns Mutation hook for bulk fetching
 */
export function useBulkLocalTaxLookup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      zipCodes,
      stateCode,
    }: {
      zipCodes: string[];
      stateCode: string;
    }) => bulkFetchLocalTaxRates(zipCodes, stateCode),
    onSuccess: (data, variables) => {
      // Cache individual results in React Query
      Object.entries(data).forEach(([zip, rateInfo]) => {
        queryClient.setQueryData(
          ["localTaxRate", zip, variables.stateCode],
          rateInfo
        );
      });
    },
  });
}

// ============================================================================
// JURISDICTION SEARCH HOOK
// ============================================================================

/**
 * Search for jurisdictions by city or county name
 *
 * Useful for autocomplete and manual jurisdiction selection.
 *
 * @param query - Search query
 * @param stateCode - Optional state filter
 */
export function useJurisdictionSearch(
  query: string | undefined,
  stateCode?: string
) {
  return useQuery({
    queryKey: ["jurisdictionSearch", query, stateCode],
    queryFn: () => searchJurisdictions(query!, stateCode),
    enabled: Boolean(query && query.length >= 2),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Format tax rate as percentage string
 *
 * @param rate - Tax rate as decimal (e.g., 0.0825)
 * @param decimals - Number of decimal places (default: 3)
 */
export function formatTaxRate(rate: number, decimals: number = 3): string {
  return `${(rate * 100).toFixed(decimals)}%`;
}

/**
 * Format tax amount as currency
 *
 * @param amount - Tax amount
 */
export function formatTaxAmount(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Calculate tax amount from base and rate
 *
 * @param base - Taxable base amount
 * @param rate - Tax rate as decimal
 */
export function calculateTaxAmount(base: number, rate: number): number {
  return base * rate;
}

// ============================================================================
// HOOK FOR TAX CALCULATION WITH LOCAL RATES
// ============================================================================

/**
 * All-in-one hook for local tax lookup with automatic calculation
 *
 * Combines ZIP lookup with automatic tax calculation on a base amount.
 *
 * @param zipCode - 5-digit ZIP code
 * @param stateCode - 2-character state code
 * @param taxableBase - Base amount to calculate tax on
 */
export function useLocalTaxCalculation(
  zipCode: string | undefined,
  stateCode: string | undefined,
  taxableBase: number
) {
  const { data: localRate, isLoading, error } = useLocalTaxLookup(
    zipCode,
    stateCode
  );

  const stateTax = localRate
    ? calculateTaxAmount(taxableBase, localRate.stateTaxRate)
    : 0;
  const localTax = localRate
    ? calculateTaxAmount(taxableBase, localRate.combinedLocalRate)
    : 0;
  const totalTax = stateTax + localTax;

  return {
    localRate,
    isLoading,
    error,
    stateTax,
    localTax,
    totalTax,
    effectiveRate: localRate?.totalRate ?? 0,
  };
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export default {
  useLocalTaxLookup,
  useDebouncedLocalTaxLookup,
  useJurisdictionBreakdown,
  useBulkLocalTaxLookup,
  useJurisdictionSearch,
  useLocalTaxCalculation,
  formatTaxRate,
  formatTaxAmount,
  calculateTaxAmount,
};
