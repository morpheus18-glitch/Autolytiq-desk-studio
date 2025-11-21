/**
 * USE VIN DECODER HOOK
 * React Query hook for VIN validation and decoding
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import type { VINDecodeResult, VINValidationResult } from '../types/vehicle.types';

/**
 * API client functions
 */
const vinApi = {
  validateVIN: async (vin: string): Promise<VINValidationResult> => {
    const response = await fetch('/api/vehicles/validate-vin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vin }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to validate VIN');
    }
    return response.json();
  },

  decodeVIN: async (vin: string): Promise<VINDecodeResult> => {
    const response = await fetch('/api/vehicles/decode-vin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vin }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to decode VIN');
    }
    return response.json();
  },

  generateStockNumber: async (dealershipId: string, prefix?: string): Promise<string> => {
    const response = await fetch(`/api/vehicles/generate-stock-number?dealershipId=${dealershipId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate stock number');
    }
    const data = await response.json();
    return data.stockNumber;
  },
};

/**
 * Hook to validate VIN
 */
export function useValidateVIN() {
  return useMutation({
    mutationFn: (vin: string) => vinApi.validateVIN(vin),
  });
}

/**
 * Hook to decode VIN
 */
export function useDecodeVIN() {
  return useMutation({
    mutationFn: (vin: string) => vinApi.decodeVIN(vin),
  });
}

/**
 * Hook to decode VIN with query (for prefetching/caching)
 */
export function useDecodeVINQuery(vin: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['vin-decode', vin],
    queryFn: () => vinApi.decodeVIN(vin),
    enabled: options?.enabled !== false && !!vin && vin.length === 17,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    cacheTime: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

/**
 * Hook to generate stock number
 */
export function useGenerateStockNumber(dealershipId: string) {
  return useMutation({
    mutationFn: (prefix?: string) => vinApi.generateStockNumber(dealershipId, prefix),
  });
}
