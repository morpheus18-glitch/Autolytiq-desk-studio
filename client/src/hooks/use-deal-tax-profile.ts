/**
 * useDealTaxProfile Hook
 *
 * Manages tax profile calculation for a deal based on customer address.
 * Automatically recalculates when customer is attached or address changes.
 */

import { useEffect, useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { TaxProfile } from '@shared/types/tax-engine';

interface UseDealTaxProfileOptions {
  dealId: string;
  customerId: string | null;
  onTaxProfileUpdated?: (profile: TaxProfile) => void;
  autoCalculate?: boolean; // Default true - auto-calc when customer changes
}

export function useDealTaxProfile({
  dealId,
  customerId,
  onTaxProfileUpdated,
  autoCalculate = true,
}: UseDealTaxProfileOptions) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [lastCustomerId, setLastCustomerId] = useState<string | null>(null);

  // Mutation to recalculate taxes
  const {
    mutate: recalculateTaxes,
    mutateAsync: recalculateTaxesAsync,
    isPending: isRecalculating,
    data: result,
    error,
  } = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        'POST',
        `/api/tax/deals/${dealId}/recalculate`
      );
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.taxProfile) {
        // Invalidate deal query to refresh UI
        queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId] });

        // Callback with new profile
        onTaxProfileUpdated?.(data.taxProfile);

        const rate = (data.taxProfile.rates.combinedRate * 100).toFixed(2);
        const jurisdiction = data.taxProfile.jurisdiction.countyName
          ? `${data.taxProfile.jurisdiction.countyName} County, ${data.taxProfile.jurisdiction.stateCode}`
          : data.taxProfile.jurisdiction.stateCode;

        toast({
          title: 'Taxes Updated',
          description: `Using ${jurisdiction} (${rate}%)`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Tax Calculation Failed',
        description: error.message || 'Failed to calculate taxes',
        variant: 'destructive',
      });
    },
  });

  // Auto-recalculate when customer changes
  useEffect(() => {
    if (!autoCalculate) return;

    // Only recalculate if customer actually changed
    if (customerId && dealId && customerId !== lastCustomerId) {
      setLastCustomerId(customerId);
      recalculateTaxes();
    }
  }, [customerId, dealId, autoCalculate, lastCustomerId, recalculateTaxes]);

  // Manual trigger for address changes
  const onCustomerAddressChanged = useCallback(() => {
    if (customerId && dealId) {
      recalculateTaxes();
    }
  }, [customerId, dealId, recalculateTaxes]);

  // Force recalculate (ignores autoCalculate setting)
  const forceRecalculate = useCallback(async () => {
    if (!customerId || !dealId) {
      toast({
        title: 'Cannot Calculate Taxes',
        description: 'No customer attached to deal',
        variant: 'destructive',
      });
      return null;
    }
    return recalculateTaxesAsync();
  }, [customerId, dealId, recalculateTaxesAsync, toast]);

  return {
    taxProfile: result?.taxProfile as TaxProfile | undefined,
    isRecalculating,
    error: error as Error | null,
    recalculateTaxes,
    forceRecalculate,
    onCustomerAddressChanged,
  };
}

/**
 * useTaxPreview Hook
 *
 * Quick preview of tax rates for a customer (before deal exists).
 */
export function useTaxPreview(customerId: string | null) {
  const { toast } = useToast();

  const {
    mutate: fetchPreview,
    mutateAsync: fetchPreviewAsync,
    isPending: isLoading,
    data: preview,
  } = useMutation({
    mutationFn: async () => {
      if (!customerId) throw new Error('No customer ID');
      const response = await apiRequest(
        'GET',
        `/api/tax/customers/${customerId}/preview`
      );
      return response.json();
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Load Tax Preview',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    preview: preview?.success ? {
      jurisdiction: preview.jurisdiction,
      rates: preview.rates,
      method: preview.method,
      rules: preview.rules,
    } : null,
    isLoading,
    fetchPreview,
    fetchPreviewAsync,
  };
}

/**
 * useValidateCustomerAddress Hook
 *
 * Check if customer has valid address for tax calculation.
 */
export function useValidateCustomerAddress(customerId: string | null) {
  const {
    mutate: validateAddress,
    mutateAsync: validateAddressAsync,
    isPending: isValidating,
    data: validation,
  } = useMutation({
    mutationFn: async () => {
      if (!customerId) throw new Error('No customer ID');
      const response = await apiRequest(
        'GET',
        `/api/tax/customers/${customerId}/validate-address`
      );
      return response.json();
    },
  });

  return {
    isValid: validation?.valid ?? false,
    isComplete: validation?.complete ?? false,
    missing: validation?.missing ?? null,
    address: validation?.address ?? null,
    isValidating,
    validateAddress,
    validateAddressAsync,
  };
}
