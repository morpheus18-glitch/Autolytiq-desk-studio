/**
 * USE CUSTOMER SEARCH HOOK
 * React Query hook for fast customer search with debouncing
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import type { Customer, DuplicateSearch } from '../types/customer.types';

// ============================================================================
// API CLIENT
// ============================================================================

const api = {
  /**
   * Search customers
   */
  async searchCustomers(query: string): Promise<Customer[]> {
    if (!query || !query.trim()) {
      return [];
    }

    const params = new URLSearchParams({ q: query });
    const response = await fetch(`/api/customers/search?${params.toString()}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to search customers');
    }

    return response.json();
  },

  /**
   * Find duplicate customers
   */
  async findDuplicates(search: Omit<DuplicateSearch, 'dealershipId'>): Promise<Customer[]> {
    const response = await fetch('/api/customers/find-duplicates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(search),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to find duplicates');
    }

    return response.json();
  },

  /**
   * Merge duplicate customers
   */
  async mergeDuplicates(
    keepCustomerId: string,
    mergeCustomerIds: string[]
  ): Promise<Customer> {
    const response = await fetch(`/api/customers/${keepCustomerId}/merge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mergeCustomerIds }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to merge customers');
    }

    return response.json();
  },
};

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Use customer search query
 * Fast search with debouncing
 */
export function useCustomerSearch(searchQuery: string, debounceMs: number = 300) {
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchQuery, debounceMs]);

  return useQuery({
    queryKey: ['customers', 'search', debouncedQuery],
    queryFn: () => api.searchCustomers(debouncedQuery),
    enabled: debouncedQuery.trim().length >= 2, // Only search with 2+ characters
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Use find duplicates query
 */
export function useFindDuplicates(search: Omit<DuplicateSearch, 'dealershipId'>) {
  return useQuery({
    queryKey: ['customers', 'duplicates', search],
    queryFn: () => api.findDuplicates(search),
    enabled: !!(search.firstName || search.lastName || search.email || search.phone),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Use merge duplicates mutation
 */
export function useMergeDuplicates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      keepCustomerId,
      mergeCustomerIds,
    }: {
      keepCustomerId: string;
      mergeCustomerIds: string[];
    }) => api.mergeDuplicates(keepCustomerId, mergeCustomerIds),
    onSuccess: (mergedCustomer) => {
      // Invalidate all customer queries
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', mergedCustomer.id] });
    },
  });
}

/**
 * Use customer autocomplete
 * Specialized hook for autocomplete/typeahead components
 */
export function useCustomerAutocomplete(query: string, limit: number = 10) {
  const { data, isLoading, error } = useCustomerSearch(query);

  return {
    customers: data?.slice(0, limit) || [],
    isLoading,
    error,
  };
}
