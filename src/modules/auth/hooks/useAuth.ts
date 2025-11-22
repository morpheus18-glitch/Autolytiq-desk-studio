/**
 * AUTH HOOK
 * React hook for authentication on client side
 *
 * Provides:
 * - Current user state
 * - Login/logout/register functions
 * - Loading states
 * - Error handling
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest, getQueryFn } from '../../../client/src/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// TYPES
// ============================================================================

export interface User {
  id: string;
  dealershipId: string;
  username: string;
  fullName: string;
  email: string;
  role: 'admin' | 'finance_manager' | 'sales_manager' | 'salesperson';
  emailVerified: boolean;
  mfaEnabled: boolean;
  lastLogin: Date | null;
  preferences: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginResponse {
  requires2fa?: boolean;
  message?: string;
}

// ============================================================================
// HOOK
// ============================================================================

export function useAuth() {
  const { toast } = useToast();

  // Fetch current user - returns null if not authenticated
  const {
    data: user,
    isLoading,
    error,
  } = useQuery<User | null>({
    queryKey: ['/api/auth/user'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    retry: false,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await apiRequest<User | LoginResponse>(
        'POST',
        '/api/auth/login',
        credentials
      );
      return response;
    },
    onSuccess: (data: User | LoginResponse) => {
      if ('requires2fa' in data && data.requires2fa) {
        toast({
          title: '2FA Required',
          description: data.message || 'Please verify with your authenticator app',
        });
        return;
      }

      queryClient.setQueryData(['/api/auth/user'], data);
      toast({
        title: 'Welcome back!',
        description: `Logged in as ${data.fullName}`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: error.message || 'Invalid username or password',
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      return await apiRequest<{ message: string; requiresApproval: boolean; email: string }>(
        'POST',
        '/api/auth/register',
        data
      );
    },
    onSuccess: (response) => {
      toast({
        title: 'Account created!',
        description: response.message,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Registration failed',
        description: error.message || 'Could not create account',
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/auth/logout', {});
    },
    onSuccess: () => {
      queryClient.setQueryData(['/api/auth/user'], null);
      queryClient.removeQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: 'Logged out',
        description: 'You have been logged out successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Logout failed',
        description: error.message,
      });
    },
  });

  // Verify 2FA mutation
  const verify2FAMutation = useMutation({
    mutationFn: async (token: string) => {
      return await apiRequest<User>('POST', '/api/auth/login/verify-2fa', { token });
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(['/api/auth/user'], user);
      toast({
        title: 'Welcome back!',
        description: `Logged in as ${user.fullName}`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: '2FA Verification failed',
        description: error.message || 'Invalid verification code',
      });
    },
  });

  return {
    // User state
    user,
    isAuthenticated: !!user && !isLoading,
    isLoading,
    error,

    // Auth actions
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,
    verify2FA: verify2FAMutation.mutate,

    // Loading states
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    isVerifying2FA: verify2FAMutation.isPending,

    // Role helpers
    isAdmin: user?.role === 'admin',
    isFinanceManager: user?.role === 'finance_manager',
    isSalesManager: user?.role === 'sales_manager',
    isSalesperson: user?.role === 'salesperson',
    canManageUsers: user?.role === 'admin' || user?.role === 'sales_manager',
  };
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * User preferences interface
 */
export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  notifications?: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
  };
  dashboard?: {
    defaultView?: string;
    widgets?: string[];
  };
  [key: string]: unknown; // Allow additional custom preferences
}

/**
 * Hook for managing user preferences
 */
export function useUserPreferences() {
  const { toast } = useToast();

  const { data: preferences, isLoading } = useQuery<UserPreferences>({
    queryKey: ['/api/auth/preferences'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      return await apiRequest('PUT', '/api/auth/preferences', updates);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/auth/preferences'], data);
      toast({
        title: 'Preferences updated',
        description: 'Your preferences have been saved',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: error.message,
      });
    },
  });

  return {
    preferences,
    isLoading,
    updatePreferences: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}
