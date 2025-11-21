/**
 * USE INVENTORY HOOK
 * React Query hook for inventory list operations
 */

import { useQuery } from '@tanstack/react-query';
import type { InventoryFilters, PaginatedVehicles, VehicleSummary } from '../types/vehicle.types';

/**
 * API client functions
 */
const inventoryApi = {
  getInventory: async (filters: InventoryFilters): Promise<PaginatedVehicles> => {
    const params = new URLSearchParams();

    // Add all filter parameters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          params.append(key, JSON.stringify(value));
        } else {
          params.append(key, String(value));
        }
      }
    });

    const response = await fetch(`/api/vehicles?${params.toString()}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch inventory');
    }
    return response.json();
  },

  getInventorySummary: async (dealershipId: string): Promise<VehicleSummary> => {
    const response = await fetch(`/api/vehicles/summary?dealershipId=${dealershipId}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch inventory summary');
    }
    return response.json();
  },
};

/**
 * Hook to get paginated inventory with filters
 */
export function useInventory(filters: InventoryFilters) {
  return useQuery({
    queryKey: ['inventory', filters.dealershipId, filters],
    queryFn: () => inventoryApi.getInventory(filters),
    enabled: !!filters.dealershipId,
    keepPreviousData: true, // Keep previous data while fetching new page
  });
}

/**
 * Hook to get inventory summary/statistics
 */
export function useInventorySummary(dealershipId: string) {
  return useQuery({
    queryKey: ['inventory-summary', dealershipId],
    queryFn: () => inventoryApi.getInventorySummary(dealershipId),
    enabled: !!dealershipId,
  });
}

/**
 * Hook with common filter presets
 */
export function useInventoryWithPreset(
  dealershipId: string,
  preset: 'available' | 'sold' | 'reserved' | 'all',
  additionalFilters?: Partial<InventoryFilters>
) {
  const baseFilters: InventoryFilters = {
    dealershipId,
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    ...additionalFilters,
  };

  // Apply preset filters
  switch (preset) {
    case 'available':
      baseFilters.status = 'available';
      break;
    case 'sold':
      baseFilters.status = 'sold';
      break;
    case 'reserved':
      baseFilters.status = 'reserved';
      break;
    case 'all':
      // No status filter
      break;
  }

  return useInventory(baseFilters);
}
