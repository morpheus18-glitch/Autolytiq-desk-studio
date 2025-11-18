/**
 * Hierarchy API Hooks
 *
 * React Query hooks for role hierarchy and performance optimization
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type {
  HierarchyUser,
  TeamPerformance,
  PerformanceOptimization,
  PerformanceMetrics,
  RoleSettings,
  RoleMetadata,
  UserRole,
  HierarchyAnalytics,
} from '@/lib/hierarchy-types';

// Query Keys
export const hierarchyKeys = {
  all: ['hierarchy'] as const,
  users: () => [...hierarchyKeys.all, 'users'] as const,
  user: (id: string) => [...hierarchyKeys.all, 'user', id] as const,
  team: (managerId: string) => [...hierarchyKeys.all, 'team', managerId] as const,
  optimization: (userId: string) => [...hierarchyKeys.all, 'optimization', userId] as const,
  roles: () => [...hierarchyKeys.all, 'roles'] as const,
  defaultSettings: (role: UserRole) => [...hierarchyKeys.all, 'default-settings', role] as const,
  analytics: () => [...hierarchyKeys.all, 'analytics'] as const,
};

// Get all users in hierarchy
export function useHierarchyUsers() {
  return useQuery({
    queryKey: hierarchyKeys.users(),
    queryFn: async () => {
      const response = await apiRequest<HierarchyUser[]>('/api/hierarchy/all-users');
      return response;
    },
  });
}

// Get specific user
export function useHierarchyUser(userId: string | undefined) {
  return useQuery({
    queryKey: hierarchyKeys.user(userId || ''),
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');
      const response = await apiRequest<HierarchyUser>(`/api/hierarchy/user/${userId}`);
      return response;
    },
    enabled: !!userId,
  });
}

// Get team performance for a manager
export function useTeamPerformance(managerId: string | undefined) {
  return useQuery({
    queryKey: hierarchyKeys.team(managerId || ''),
    queryFn: async () => {
      if (!managerId) throw new Error('Manager ID required');
      const response = await apiRequest<TeamPerformance>(`/api/hierarchy/team/${managerId}`);
      return response;
    },
    enabled: !!managerId,
  });
}

// Get performance optimization for a user
export function usePerformanceOptimization(userId: string | undefined) {
  return useQuery({
    queryKey: hierarchyKeys.optimization(userId || ''),
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');
      const response = await apiRequest<PerformanceOptimization>(`/api/hierarchy/optimization/${userId}`);
      return response;
    },
    enabled: !!userId,
  });
}

// Get all available roles
export function useRoles() {
  return useQuery({
    queryKey: hierarchyKeys.roles(),
    queryFn: async () => {
      const response = await apiRequest<RoleMetadata[]>('/api/hierarchy/roles');
      return response;
    },
  });
}

// Get default settings for a role
export function useDefaultSettings(role: UserRole | undefined) {
  return useQuery({
    queryKey: hierarchyKeys.defaultSettings(role!),
    queryFn: async () => {
      if (!role) throw new Error('Role required');
      const response = await apiRequest<RoleSettings>(`/api/hierarchy/default-settings/${role}`);
      return response;
    },
    enabled: !!role,
  });
}

// Get hierarchy analytics (admin only)
export function useHierarchyAnalytics() {
  return useQuery({
    queryKey: hierarchyKeys.analytics(),
    queryFn: async () => {
      const response = await apiRequest<HierarchyAnalytics>('/api/hierarchy/analytics');
      return response;
    },
  });
}

// Add user to hierarchy
export function useAddHierarchyUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      userId: string;
      name: string;
      role: UserRole;
      managerId?: string;
      settings?: Partial<RoleSettings>;
    }) => {
      const response = await apiRequest<HierarchyUser>('/api/hierarchy/add-user', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hierarchyKeys.users() });
      queryClient.invalidateQueries({ queryKey: hierarchyKeys.analytics() });
    },
  });
}

// Remove user from hierarchy
export function useRemoveHierarchyUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest(`/api/hierarchy/user/${userId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hierarchyKeys.users() });
      queryClient.invalidateQueries({ queryKey: hierarchyKeys.analytics() });
    },
  });
}

// Update user settings
export function useUpdateUserSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { userId: string; settings: Partial<RoleSettings> }) => {
      const response = await apiRequest<HierarchyUser>(
        `/api/hierarchy/user/${data.userId}/settings`,
        {
          method: 'PATCH',
          body: JSON.stringify({ settings: data.settings }),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: hierarchyKeys.user(variables.userId) });
      queryClient.invalidateQueries({ queryKey: hierarchyKeys.users() });
    },
  });
}

// Update user metrics
export function useUpdateUserMetrics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { userId: string; metrics: Partial<PerformanceMetrics> }) => {
      const response = await apiRequest<HierarchyUser>(
        `/api/hierarchy/user/${data.userId}/metrics`,
        {
          method: 'POST',
          body: JSON.stringify({ metrics: data.metrics }),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: hierarchyKeys.user(variables.userId) });
      queryClient.invalidateQueries({ queryKey: hierarchyKeys.users() });
      queryClient.invalidateQueries({ queryKey: hierarchyKeys.analytics() });
      // Invalidate team performance if user has a manager
      queryClient.invalidateQueries({ queryKey: hierarchyKeys.all });
    },
  });
}
