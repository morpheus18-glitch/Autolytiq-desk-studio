/**
 * USE CUSTOMER LIST HOOK
 * React Query hook for fetching and managing customer lists
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Customer,
  PaginatedCustomers,
  CustomerListQuery,
  CreateCustomerRequest,
} from '../types/customer.types';

// ============================================================================
// API CLIENT
// ============================================================================

const api = {
  /**
   * List customers with filters
   */
  async listCustomers(query: Partial<CustomerListQuery>): Promise<PaginatedCustomers> {
    const params = new URLSearchParams();

    if (query.status) params.append('status', query.status);
    if (query.source) params.append('source', query.source);
    if (query.assignedSalespersonId) {
      params.append('assignedSalespersonId', query.assignedSalespersonId);
    }
    if (query.search) params.append('search', query.search);
    if (query.createdFrom) params.append('createdFrom', query.createdFrom);
    if (query.createdTo) params.append('createdTo', query.createdTo);
    if (query.lastContactFrom) params.append('lastContactFrom', query.lastContactFrom);
    if (query.lastContactTo) params.append('lastContactTo', query.lastContactTo);
    if (query.needsFollowUp !== undefined) {
      params.append('needsFollowUp', String(query.needsFollowUp));
    }
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));
    if (query.sortBy) params.append('sortBy', query.sortBy);
    if (query.sortOrder) params.append('sortOrder', query.sortOrder);
    if (query.includeDeleted) {
      params.append('includeDeleted', String(query.includeDeleted));
    }

    const response = await fetch(`/api/customers?${params.toString()}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to list customers');
    }

    return response.json();
  },

  /**
   * Create customer
   */
  async createCustomer(data: CreateCustomerRequest): Promise<Customer> {
    const response = await fetch('/api/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create customer');
    }

    return response.json();
  },
};

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Use customer list query
 * Fetches customers with filters and pagination
 */
export function useCustomerList(query: Partial<CustomerListQuery> = {}) {
  return useQuery({
    queryKey: ['customers', query],
    queryFn: () => api.listCustomers(query),
    staleTime: 2 * 60 * 1000, // 2 minutes
    keepPreviousData: true, // Keep showing old data while fetching new page
  });
}

/**
 * Use create customer mutation
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCustomerRequest) => api.createCustomer(data),
    onSuccess: (newCustomer) => {
      // Invalidate customer list queries
      queryClient.invalidateQueries({ queryKey: ['customers'] });

      // Optimistically add to cache
      queryClient.setQueryData(['customer', newCustomer.id], newCustomer);
    },
  });
}

/**
 * Use customers by status
 * Convenience hook for filtering by status
 */
export function useCustomersByStatus(
  status: string,
  options: Partial<CustomerListQuery> = {}
) {
  return useCustomerList({
    status: status as string,
    ...options,
  });
}

/**
 * Use customers needing follow-up
 * Convenience hook for customers with pending follow-ups
 */
export function useCustomersNeedingFollowUp(options: Partial<CustomerListQuery> = {}) {
  return useCustomerList({
    needsFollowUp: true,
    sortBy: 'nextFollowUpDate',
    sortOrder: 'asc',
    ...options,
  });
}
