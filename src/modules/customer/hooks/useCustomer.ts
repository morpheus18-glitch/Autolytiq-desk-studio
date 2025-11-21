/**
 * USE CUSTOMER HOOK
 * React Query hook for fetching and managing a single customer
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Customer,
  UpdateCustomerRequest,
  TimelineEvent,
} from '../types/customer.types';

// ============================================================================
// API CLIENT
// ============================================================================

const api = {
  /**
   * Get customer by ID
   */
  async getCustomer(customerId: string): Promise<Customer> {
    const response = await fetch(`/api/customers/${customerId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get customer');
    }

    return response.json();
  },

  /**
   * Update customer
   */
  async updateCustomer(
    customerId: string,
    data: UpdateCustomerRequest
  ): Promise<Customer> {
    const response = await fetch(`/api/customers/${customerId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update customer');
    }

    return response.json();
  },

  /**
   * Delete customer
   */
  async deleteCustomer(customerId: string): Promise<void> {
    const response = await fetch(`/api/customers/${customerId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete customer');
    }
  },

  /**
   * Get customer timeline
   */
  async getCustomerTimeline(customerId: string): Promise<TimelineEvent[]> {
    const response = await fetch(`/api/customers/${customerId}/timeline`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get customer timeline');
    }

    return response.json();
  },

  /**
   * Get customer deals
   */
  async getCustomerDeals(customerId: string): Promise<any[]> {
    const response = await fetch(`/api/customers/${customerId}/deals`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get customer deals');
    }

    return response.json();
  },

  /**
   * Get customer emails
   */
  async getCustomerEmails(customerId: string): Promise<any[]> {
    const response = await fetch(`/api/customers/${customerId}/emails`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get customer emails');
    }

    return response.json();
  },
};

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Use customer query
 * Fetches a single customer by ID
 */
export function useCustomer(customerId: string | undefined) {
  return useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => api.getCustomer(customerId!),
    enabled: !!customerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Use customer timeline query
 */
export function useCustomerTimeline(customerId: string | undefined) {
  return useQuery({
    queryKey: ['customer', customerId, 'timeline'],
    queryFn: () => api.getCustomerTimeline(customerId!),
    enabled: !!customerId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Use customer deals query
 */
export function useCustomerDeals(customerId: string | undefined) {
  return useQuery({
    queryKey: ['customer', customerId, 'deals'],
    queryFn: () => api.getCustomerDeals(customerId!),
    enabled: !!customerId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Use customer emails query
 */
export function useCustomerEmails(customerId: string | undefined) {
  return useQuery({
    queryKey: ['customer', customerId, 'emails'],
    queryFn: () => api.getCustomerEmails(customerId!),
    enabled: !!customerId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Use update customer mutation
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      customerId,
      data,
    }: {
      customerId: string;
      data: UpdateCustomerRequest;
    }) => api.updateCustomer(customerId, data),
    onSuccess: (updatedCustomer) => {
      // Invalidate customer queries
      queryClient.invalidateQueries({ queryKey: ['customer', updatedCustomer.id] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

/**
 * Use delete customer mutation
 */
export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (customerId: string) => api.deleteCustomer(customerId),
    onSuccess: () => {
      // Invalidate all customer queries
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
