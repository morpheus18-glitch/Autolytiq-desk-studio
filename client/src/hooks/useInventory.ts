/**
 * Inventory Hook
 *
 * React Query hooks for vehicle inventory CRUD operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';
import type { VehicleFormData } from '@/components/forms/VehicleForm';

export interface Vehicle {
  id: string;
  dealership_id: string;
  vin: string;
  stock_number?: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  exterior_color: string;
  interior_color?: string;
  mileage: number;
  condition: 'NEW' | 'USED' | 'CERTIFIED';
  status: 'AVAILABLE' | 'SOLD' | 'PENDING' | 'IN_TRANSIT' | 'SERVICE';
  msrp?: number;
  list_price: number;
  invoice_price?: number;
  features?: string[];
  images?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface VehiclesResponse {
  vehicles: Vehicle[];
  total: number;
  page: number;
  limit: number;
}

interface InventoryStats {
  total: number;
  available: number;
  sold: number;
  pending: number;
  new_count: number;
  used_count: number;
  total_value: number;
}

interface VehiclesParams {
  page?: number;
  limit?: number;
  status?: string;
  condition?: string;
  search?: string;
}

export function useVehicles(params: VehiclesParams = {}) {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));
  if (params.status) queryParams.set('status', params.status);
  if (params.condition) queryParams.set('condition', params.condition);
  if (params.search) queryParams.set('search', params.search);

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/inventory/vehicles?${queryString}` : '/inventory/vehicles';

  return useQuery({
    queryKey: queryKeys.inventory.list({ ...params }),
    queryFn: () => api.get<VehiclesResponse>(endpoint),
  });
}

export function useVehicle(id: string) {
  return useQuery({
    queryKey: queryKeys.inventory.detail(id),
    queryFn: () => api.get<Vehicle>(`/inventory/vehicles/${id}`),
    enabled: !!id,
  });
}

export function useInventoryStats() {
  return useQuery({
    queryKey: ['inventory', 'stats'],
    queryFn: () => api.get<InventoryStats>('/inventory/stats'),
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: VehicleFormData) =>
      api.post<Vehicle>('/inventory/vehicles', {
        vin: data.vin,
        stock_number: data.stockNumber,
        year: data.year,
        make: data.make,
        model: data.model,
        trim: data.trim,
        exterior_color: data.exteriorColor,
        interior_color: data.interiorColor,
        mileage: data.mileage,
        condition: data.condition,
        status: data.status,
        msrp: data.msrp,
        list_price: data.listPrice,
        invoice_price: data.invoicePrice,
        features: data.features
          ?.split(',')
          .map((f) => f.trim())
          .filter(Boolean),
        notes: data.notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<VehicleFormData> }) =>
      api.put<Vehicle>(`/inventory/vehicles/${id}`, {
        vin: data.vin,
        stock_number: data.stockNumber,
        year: data.year,
        make: data.make,
        model: data.model,
        trim: data.trim,
        exterior_color: data.exteriorColor,
        interior_color: data.interiorColor,
        mileage: data.mileage,
        condition: data.condition,
        status: data.status,
        msrp: data.msrp,
        list_price: data.listPrice,
        invoice_price: data.invoicePrice,
        features: data.features
          ?.split(',')
          .map((f) => f.trim())
          .filter(Boolean),
        notes: data.notes,
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.detail(id) });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/inventory/vehicles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

// Helper to get vehicle display name
export function getVehicleName(vehicle: Vehicle): string {
  return `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? ` ${vehicle.trim}` : ''}`;
}
