/**
 * Deals Hook
 *
 * React Query hooks for deal CRUD operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';
import type { DealFormData } from '@/components/forms/DealForm';

export interface Deal {
  id: string;
  dealership_id: string;
  customer_id: string;
  customer_name: string;
  vehicle_id: string;
  vehicle_name: string;
  type: 'CASH' | 'FINANCE' | 'LEASE';
  status: 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'COMPLETED' | 'CANCELLED';
  sale_price: number;
  trade_in_value?: number;
  trade_in_vehicle?: string;
  trade_in_vin?: string;
  down_payment?: number;
  financing_term?: number;
  interest_rate?: number;
  salesperson_id?: string;
  salesperson_name?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface DealsResponse {
  deals: Deal[];
  total: number;
  page: number;
  limit: number;
}

interface DealsParams {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  search?: string;
}

export function useDeals(params: DealsParams = {}) {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));
  if (params.status) queryParams.set('status', params.status);
  if (params.type) queryParams.set('type', params.type);
  if (params.search) queryParams.set('search', params.search);

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/deals?${queryString}` : '/deals';

  return useQuery({
    queryKey: queryKeys.deals.list({ ...params }),
    queryFn: () => api.get<DealsResponse>(endpoint),
  });
}

export function useDeal(id: string) {
  return useQuery({
    queryKey: queryKeys.deals.detail(id),
    queryFn: () => api.get<Deal>(`/deals/${id}`),
    enabled: !!id,
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DealFormData) =>
      api.post<Deal>('/deals', {
        customer_id: data.customerId,
        vehicle_id: data.vehicleId,
        type: data.type,
        status: data.status,
        sale_price: data.salePrice,
        trade_in_value: data.tradeInValue,
        trade_in_vehicle: data.tradeInVehicle,
        trade_in_vin: data.tradeInVin,
        down_payment: data.downPayment,
        financing_term: data.financingTerm,
        interest_rate: data.interestRate,
        salesperson_id: data.salespersonId,
        notes: data.notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });
}

export function useUpdateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DealFormData> }) =>
      api.put<Deal>(`/deals/${id}`, {
        customer_id: data.customerId,
        vehicle_id: data.vehicleId,
        type: data.type,
        status: data.status,
        sale_price: data.salePrice,
        trade_in_value: data.tradeInValue,
        trade_in_vehicle: data.tradeInVehicle,
        down_payment: data.downPayment,
        financing_term: data.financingTerm,
        interest_rate: data.interestRate,
        salesperson_id: data.salespersonId,
        notes: data.notes,
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.detail(id) });
    },
  });
}

export function useDeleteDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/deals/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });
}
