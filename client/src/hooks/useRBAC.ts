/**
 * RBAC Hooks
 *
 * React Query hooks for Role-Based Access Control.
 * Integrates with the user-service RBAC endpoints to provide
 * permission checking, role management, and settings access control.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useMemo, useCallback } from 'react';

// =====================================================
// TYPES
// =====================================================

/**
 * Permission scope levels
 */
export type PermissionScope = 'own' | 'team' | 'dealership' | 'all';

/**
 * Permission action types
 */
export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'manage';

/**
 * Permission definition
 */
export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: PermissionAction;
  scope: PermissionScope;
}

/**
 * User permission (permission with granted status)
 */
export interface UserPermission extends Permission {
  granted: boolean;
}

/**
 * Role definition
 */
export interface Role {
  name: string;
  display_name: string;
  description: string;
  permissions: string[];
  is_system: boolean;
}

/**
 * Settings access level
 */
export type SettingsAccessLevel = 'none' | 'view' | 'edit' | 'full';

/**
 * Settings RBAC configuration per category
 */
export interface SettingsRBAC {
  category: string;
  roles: Record<string, SettingsAccessLevel>;
}

/**
 * Permission check request
 */
export interface PermissionCheckRequest {
  user_id: string;
  dealership_id: string;
  role: string;
  permission: string;
  resource_owner_id?: string;
}

/**
 * Permission check response
 */
export interface PermissionCheckResponse {
  allowed: boolean;
  reason?: string;
}

/**
 * Settings access check request
 */
export interface SettingsAccessCheckRequest {
  role: string;
  category: string;
}

/**
 * Settings access check response
 */
export interface SettingsAccessCheckResponse {
  access_level: SettingsAccessLevel;
  can_view: boolean;
  can_edit: boolean;
}

// =====================================================
// QUERY KEYS
// =====================================================

const rbacQueryKeys = {
  all: ['rbac'] as const,
  roles: () => [...rbacQueryKeys.all, 'roles'] as const,
  role: (name: string) => [...rbacQueryKeys.roles(), name] as const,
  permissions: () => [...rbacQueryKeys.all, 'permissions'] as const,
  userPermissions: (userId: string) => [...rbacQueryKeys.all, 'user-permissions', userId] as const,
  settingsRBAC: () => [...rbacQueryKeys.all, 'settings'] as const,
};

// =====================================================
// HOOKS - ROLES
// =====================================================

/**
 * Hook to list all available roles
 */
export function useRoles() {
  return useQuery({
    queryKey: rbacQueryKeys.roles(),
    queryFn: () => api.get<Role[]>('/v1/rbac/roles'),
  });
}

/**
 * Hook to get a specific role with its permissions
 */
export function useRole(name: string) {
  return useQuery({
    queryKey: rbacQueryKeys.role(name),
    queryFn: () => api.get<Role>(`/v1/rbac/roles/${name}`),
    enabled: !!name,
  });
}

// =====================================================
// HOOKS - PERMISSIONS
// =====================================================

/**
 * Hook to list all available permissions
 */
export function usePermissions() {
  return useQuery({
    queryKey: rbacQueryKeys.permissions(),
    queryFn: () => api.get<Permission[]>('/v1/rbac/permissions'),
  });
}

/**
 * Hook to get a user's permissions
 */
export function useUserPermissions(userId: string, dealershipId: string) {
  return useQuery({
    queryKey: rbacQueryKeys.userPermissions(userId),
    queryFn: () =>
      api.get<UserPermission[]>(`/v1/users/${userId}/permissions?dealership_id=${dealershipId}`),
    enabled: !!userId && !!dealershipId,
  });
}

/**
 * Hook to check a specific permission
 */
export function useCheckPermission() {
  return useMutation({
    mutationFn: (request: PermissionCheckRequest) =>
      api.post<PermissionCheckResponse>('/v1/rbac/check', request),
  });
}

// =====================================================
// HOOKS - SETTINGS RBAC
// =====================================================

/**
 * Hook to get all settings RBAC configuration
 */
export function useSettingsRBAC() {
  return useQuery({
    queryKey: rbacQueryKeys.settingsRBAC(),
    queryFn: () => api.get<Record<string, SettingsRBAC>>('/v1/rbac/settings'),
  });
}

/**
 * Hook to check settings access for a specific category
 */
export function useCheckSettingsAccess() {
  return useMutation({
    mutationFn: (request: SettingsAccessCheckRequest) =>
      api.post<SettingsAccessCheckResponse>('/v1/rbac/settings/check', request),
  });
}

// =====================================================
// CLIENT-SIDE PERMISSION HELPERS
// =====================================================

/**
 * System roles with their hierarchical levels
 */
const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 100,
  admin: 90,
  manager: 70,
  finance_manager: 60,
  salesperson: 40,
  bdc_agent: 30,
  service_advisor: 30,
  viewer: 10,
};

/**
 * Settings category access by role (client-side fallback)
 */
const SETTINGS_ACCESS_BY_ROLE: Record<string, Record<string, SettingsAccessLevel>> = {
  // Super Admin - full access to everything
  super_admin: {
    profile: 'full',
    security: 'full',
    notifications: 'full',
    appearance: 'full',
    dealership: 'full',
    users: 'full',
    roles: 'full',
    integrations: 'full',
    billing: 'full',
    system: 'full',
  },
  // Admin - full access except system
  admin: {
    profile: 'full',
    security: 'full',
    notifications: 'full',
    appearance: 'full',
    dealership: 'full',
    users: 'full',
    roles: 'view',
    integrations: 'full',
    billing: 'full',
    system: 'view',
  },
  // Manager - edit access to most, view only on sensitive
  manager: {
    profile: 'full',
    security: 'full',
    notifications: 'full',
    appearance: 'full',
    dealership: 'view',
    users: 'edit',
    roles: 'view',
    integrations: 'view',
    billing: 'none',
    system: 'none',
  },
  // Finance Manager - similar to manager
  finance_manager: {
    profile: 'full',
    security: 'full',
    notifications: 'full',
    appearance: 'full',
    dealership: 'view',
    users: 'view',
    roles: 'none',
    integrations: 'none',
    billing: 'view',
    system: 'none',
  },
  // Salesperson - personal settings only
  salesperson: {
    profile: 'full',
    security: 'full',
    notifications: 'full',
    appearance: 'full',
    dealership: 'none',
    users: 'none',
    roles: 'none',
    integrations: 'none',
    billing: 'none',
    system: 'none',
  },
  // BDC Agent - personal settings only
  bdc_agent: {
    profile: 'full',
    security: 'full',
    notifications: 'full',
    appearance: 'full',
    dealership: 'none',
    users: 'none',
    roles: 'none',
    integrations: 'none',
    billing: 'none',
    system: 'none',
  },
  // Service Advisor - personal settings only
  service_advisor: {
    profile: 'full',
    security: 'full',
    notifications: 'full',
    appearance: 'full',
    dealership: 'none',
    users: 'none',
    roles: 'none',
    integrations: 'none',
    billing: 'none',
    system: 'none',
  },
  // Viewer - limited personal settings
  viewer: {
    profile: 'edit',
    security: 'edit',
    notifications: 'edit',
    appearance: 'edit',
    dealership: 'none',
    users: 'none',
    roles: 'none',
    integrations: 'none',
    billing: 'none',
    system: 'none',
  },
};

/**
 * Hook for client-side permission checking
 * Uses cached data when available, falls back to role hierarchy
 */
export function usePermissionCheck() {
  const queryClient = useQueryClient();

  /**
   * Check if a role has access to a specific settings category
   */
  const canAccessSettings = useCallback((role: string, category: string): SettingsAccessLevel => {
    const normalizedRole = role.toLowerCase().replace(/-/g, '_');
    const roleAccess = SETTINGS_ACCESS_BY_ROLE[normalizedRole];

    if (!roleAccess) {
      return 'none';
    }

    return roleAccess[category] ?? 'none';
  }, []);

  /**
   * Check if user can view a settings category
   */
  const canViewSettings = useCallback(
    (role: string, category: string): boolean => {
      const access = canAccessSettings(role, category);
      return access !== 'none';
    },
    [canAccessSettings]
  );

  /**
   * Check if user can edit a settings category
   */
  const canEditSettings = useCallback(
    (role: string, category: string): boolean => {
      const access = canAccessSettings(role, category);
      return access === 'edit' || access === 'full';
    },
    [canAccessSettings]
  );

  /**
   * Check if a role is at or above a certain level
   */
  const hasRoleLevel = useCallback((userRole: string, requiredRole: string): boolean => {
    const userLevel = ROLE_HIERARCHY[userRole.toLowerCase().replace(/-/g, '_')] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole.toLowerCase().replace(/-/g, '_')] ?? 100;
    return userLevel >= requiredLevel;
  }, []);

  /**
   * Check if user is an admin or above
   */
  const isAdmin = useCallback(
    (role: string): boolean => {
      return hasRoleLevel(role, 'admin');
    },
    [hasRoleLevel]
  );

  /**
   * Check if user is a manager or above
   */
  const isManager = useCallback(
    (role: string): boolean => {
      return hasRoleLevel(role, 'manager');
    },
    [hasRoleLevel]
  );

  /**
   * Get the display name for a role
   */
  const getRoleDisplayName = useCallback((role: string): string => {
    const roleMap: Record<string, string> = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      manager: 'Manager',
      finance_manager: 'Finance Manager',
      salesperson: 'Salesperson',
      bdc_agent: 'BDC Agent',
      service_advisor: 'Service Advisor',
      viewer: 'Viewer',
    };
    return roleMap[role.toLowerCase().replace(/-/g, '_')] ?? role;
  }, []);

  /**
   * Invalidate all RBAC caches
   */
  const invalidateRBACCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: rbacQueryKeys.all });
  }, [queryClient]);

  return {
    canAccessSettings,
    canViewSettings,
    canEditSettings,
    hasRoleLevel,
    isAdmin,
    isManager,
    getRoleDisplayName,
    invalidateRBACCache,
  };
}

/**
 * Hook to get available settings categories for a role
 */
export function useAvailableSettingsCategories(role: string) {
  const { canViewSettings } = usePermissionCheck();

  const categories = useMemo(() => {
    const allCategories = [
      { id: 'profile', label: 'Profile', description: 'Personal information and preferences' },
      { id: 'security', label: 'Security', description: 'Password and authentication settings' },
      {
        id: 'notifications',
        label: 'Notifications',
        description: 'Email and push notification preferences',
      },
      { id: 'appearance', label: 'Appearance', description: 'Theme and display settings' },
      { id: 'dealership', label: 'Dealership', description: 'Dealership configuration' },
      { id: 'users', label: 'Users', description: 'User management' },
      {
        id: 'roles',
        label: 'Roles & Permissions',
        description: 'Role and permission configuration',
      },
      { id: 'integrations', label: 'Integrations', description: 'Third-party integrations' },
      { id: 'billing', label: 'Billing', description: 'Billing and subscription management' },
      { id: 'system', label: 'System', description: 'System configuration and maintenance' },
    ];

    return allCategories.filter((cat) => canViewSettings(role, cat.id));
  }, [role, canViewSettings]);

  return categories;
}

/**
 * Hook to check if current user can perform an action
 * Uses the authenticated user's role from context
 */
export function useCanPerform(action: PermissionAction, resource: string, currentUserRole: string) {
  const { hasRoleLevel, isAdmin } = usePermissionCheck();

  return useMemo(() => {
    // Admins can do everything
    if (isAdmin(currentUserRole)) {
      return true;
    }

    // Resource-specific permission checks
    const resourcePermissions: Record<string, Record<PermissionAction, string>> = {
      deals: {
        create: 'salesperson',
        read: 'viewer',
        update: 'salesperson',
        delete: 'manager',
        manage: 'manager',
      },
      customers: {
        create: 'salesperson',
        read: 'viewer',
        update: 'salesperson',
        delete: 'manager',
        manage: 'manager',
      },
      inventory: {
        create: 'manager',
        read: 'viewer',
        update: 'manager',
        delete: 'admin',
        manage: 'admin',
      },
      users: {
        create: 'admin',
        read: 'manager',
        update: 'admin',
        delete: 'admin',
        manage: 'admin',
      },
      settings: {
        create: 'admin',
        read: 'viewer',
        update: 'manager',
        delete: 'admin',
        manage: 'admin',
      },
      reports: {
        create: 'manager',
        read: 'salesperson',
        update: 'manager',
        delete: 'admin',
        manage: 'admin',
      },
    };

    const resourcePerms = resourcePermissions[resource];
    if (!resourcePerms) {
      return false;
    }

    const requiredRole = resourcePerms[action];
    if (!requiredRole) {
      return false;
    }

    return hasRoleLevel(currentUserRole, requiredRole);
  }, [action, resource, currentUserRole, hasRoleLevel, isAdmin]);
}
