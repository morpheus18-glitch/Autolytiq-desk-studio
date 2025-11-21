/**
 * USE VEHICLE HOOK
 * React Query hook for single vehicle operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Vehicle,
  CreateVehicleRequest,
  UpdateVehicleRequest,
  VehicleHistoryEvent,
  VehicleValueMetrics,
} from '../types/vehicle.types';

/**
 * API client functions
 */
const vehicleApi = {
  getVehicle: async (id: string, dealershipId: string): Promise<Vehicle> => {
    const response = await fetch(`/api/vehicles/${id}?dealershipId=${dealershipId}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch vehicle');
    }
    return response.json();
  },

  createVehicle: async (dealershipId: string, data: CreateVehicleRequest): Promise<Vehicle> => {
    const response = await fetch(`/api/vehicles?dealershipId=${dealershipId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create vehicle');
    }
    return response.json();
  },

  updateVehicle: async (
    id: string,
    dealershipId: string,
    data: UpdateVehicleRequest
  ): Promise<Vehicle> => {
    const response = await fetch(`/api/vehicles/${id}?dealershipId=${dealershipId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update vehicle');
    }
    return response.json();
  },

  deleteVehicle: async (id: string, dealershipId: string): Promise<void> => {
    const response = await fetch(`/api/vehicles/${id}?dealershipId=${dealershipId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete vehicle');
    }
  },

  getVehicleHistory: async (id: string, dealershipId: string): Promise<VehicleHistoryEvent[]> => {
    const response = await fetch(`/api/vehicles/${id}/history?dealershipId=${dealershipId}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch vehicle history');
    }
    return response.json();
  },

  getVehicleMetrics: async (id: string, dealershipId: string): Promise<VehicleValueMetrics> => {
    const response = await fetch(`/api/vehicles/${id}/metrics?dealershipId=${dealershipId}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch vehicle metrics');
    }
    return response.json();
  },

  updateStatus: async (
    id: string,
    dealershipId: string,
    status: string,
    notes?: string
  ): Promise<Vehicle> => {
    const response = await fetch(`/api/vehicles/${id}/status?dealershipId=${dealershipId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update vehicle status');
    }
    return response.json();
  },

  reserveVehicle: async (
    id: string,
    dealershipId: string,
    dealId: string,
    reservedUntil: string
  ): Promise<Vehicle> => {
    const response = await fetch(`/api/vehicles/${id}/reserve?dealershipId=${dealershipId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealId, reservedUntil }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to reserve vehicle');
    }
    return response.json();
  },

  releaseVehicle: async (id: string, dealershipId: string): Promise<Vehicle> => {
    const response = await fetch(`/api/vehicles/${id}/release?dealershipId=${dealershipId}`, {
      method: 'POST',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to release vehicle');
    }
    return response.json();
  },
};

/**
 * Hook to get vehicle by ID
 */
export function useVehicle(vehicleId: string, dealershipId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['vehicle', vehicleId, dealershipId],
    queryFn: () => vehicleApi.getVehicle(vehicleId, dealershipId),
    enabled: options?.enabled !== false && !!vehicleId && !!dealershipId,
  });
}

/**
 * Hook to create vehicle
 */
export function useCreateVehicle(dealershipId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateVehicleRequest) => vehicleApi.createVehicle(dealershipId, data),
    onSuccess: () => {
      // Invalidate inventory queries
      queryClient.invalidateQueries({ queryKey: ['inventory', dealershipId] });
      queryClient.invalidateQueries({ queryKey: ['inventory-summary', dealershipId] });
    },
  });
}

/**
 * Hook to update vehicle
 */
export function useUpdateVehicle(vehicleId: string, dealershipId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateVehicleRequest) =>
      vehicleApi.updateVehicle(vehicleId, dealershipId, data),
    onSuccess: (vehicle) => {
      // Update cache
      queryClient.setQueryData(['vehicle', vehicleId, dealershipId], vehicle);
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['inventory', dealershipId] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-history', vehicleId] });
    },
  });
}

/**
 * Hook to delete vehicle
 */
export function useDeleteVehicle(dealershipId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vehicleId: string) => vehicleApi.deleteVehicle(vehicleId, dealershipId),
    onSuccess: (_, vehicleId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['vehicle', vehicleId] });
      // Invalidate inventory
      queryClient.invalidateQueries({ queryKey: ['inventory', dealershipId] });
      queryClient.invalidateQueries({ queryKey: ['inventory-summary', dealershipId] });
    },
  });
}

/**
 * Hook to get vehicle history
 */
export function useVehicleHistory(vehicleId: string, dealershipId: string) {
  return useQuery({
    queryKey: ['vehicle-history', vehicleId, dealershipId],
    queryFn: () => vehicleApi.getVehicleHistory(vehicleId, dealershipId),
    enabled: !!vehicleId && !!dealershipId,
  });
}

/**
 * Hook to get vehicle metrics
 */
export function useVehicleMetrics(vehicleId: string, dealershipId: string) {
  return useQuery({
    queryKey: ['vehicle-metrics', vehicleId, dealershipId],
    queryFn: () => vehicleApi.getVehicleMetrics(vehicleId, dealershipId),
    enabled: !!vehicleId && !!dealershipId,
  });
}

/**
 * Hook to update vehicle status
 */
export function useUpdateVehicleStatus(vehicleId: string, dealershipId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ status, notes }: { status: string; notes?: string }) =>
      vehicleApi.updateStatus(vehicleId, dealershipId, status, notes),
    onSuccess: (vehicle) => {
      queryClient.setQueryData(['vehicle', vehicleId, dealershipId], vehicle);
      queryClient.invalidateQueries({ queryKey: ['inventory', dealershipId] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-history', vehicleId] });
    },
  });
}

/**
 * Hook to reserve vehicle
 */
export function useReserveVehicle(vehicleId: string, dealershipId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dealId, reservedUntil }: { dealId: string; reservedUntil: string }) =>
      vehicleApi.reserveVehicle(vehicleId, dealershipId, dealId, reservedUntil),
    onSuccess: (vehicle) => {
      queryClient.setQueryData(['vehicle', vehicleId, dealershipId], vehicle);
      queryClient.invalidateQueries({ queryKey: ['inventory', dealershipId] });
    },
  });
}

/**
 * Hook to release vehicle
 */
export function useReleaseVehicle(vehicleId: string, dealershipId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => vehicleApi.releaseVehicle(vehicleId, dealershipId),
    onSuccess: (vehicle) => {
      queryClient.setQueryData(['vehicle', vehicleId, dealershipId], vehicle);
      queryClient.invalidateQueries({ queryKey: ['inventory', dealershipId] });
    },
  });
}
