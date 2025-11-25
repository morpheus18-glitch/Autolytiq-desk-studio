/**
 * Customers Hook
 *
 * React Query hooks for customer CRUD operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';
import type { CustomerFormData } from '@/components/forms/CustomerForm';

export interface Customer {
  id: string;
  dealership_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip_code?: string;
  };
  source?: 'WALK_IN' | 'WEBSITE' | 'REFERRAL' | 'PHONE' | 'OTHER';
  notes?: string;
  total_deals?: number;
  total_spent?: number;
  created_at: string;
  updated_at: string;
}

interface CustomersResponse {
  customers: Customer[];
  total: number;
  page: number;
  limit: number;
}

interface CustomersParams {
  page?: number;
  limit?: number;
  source?: string;
  search?: string;
}

export function useCustomers(params: CustomersParams = {}) {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));
  if (params.source) queryParams.set('source', params.source);
  if (params.search) queryParams.set('search', params.search);

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/customers?${queryString}` : '/customers';

  return useQuery({
    queryKey: queryKeys.customers.list({ ...params }),
    queryFn: () => api.get<CustomersResponse>(endpoint),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: () => api.get<Customer>(`/customers/${id}`),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CustomerFormData) =>
      api.post<Customer>('/customers', {
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone,
        address: data.address
          ? {
              street: data.address.street,
              city: data.address.city,
              state: data.address.state,
              zip_code: data.address.zipCode,
            }
          : undefined,
        source: data.source,
        notes: data.notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CustomerFormData> }) =>
      api.put<Customer>(`/customers/${id}`, {
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone,
        address: data.address
          ? {
              street: data.address.street,
              city: data.address.city,
              state: data.address.state,
              zip_code: data.address.zipCode,
            }
          : undefined,
        source: data.source,
        notes: data.notes,
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(id) });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

// Helper to get customer display name
export function getCustomerName(customer: Customer): string {
  return `${customer.first_name} ${customer.last_name}`;
}
