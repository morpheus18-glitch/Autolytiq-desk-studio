/**
 * Authentication Context
 *
 * Provides authentication state and methods throughout the application.
 * Handles login, logout, token storage, and protected route access.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
  type JSX,
} from 'react';
import { useLocation } from 'wouter';
import { api, tokenStorage, parseJwtPayload, isTokenExpired } from '@/lib/api';
import type { User, LoginCredentials, LoginResponse, JwtPayload, AuthState } from '@/types';

/**
 * Auth context type
 */
interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

/**
 * Auth context
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth provider props
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth Provider Component
 */
export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  /**
   * Initialize auth state from stored token
   */
  const initializeAuth = useCallback(async () => {
    const token = tokenStorage.getToken();

    if (!token) {
      setIsLoading(false);
      return;
    }

    // Check if token is expired
    if (isTokenExpired(token)) {
      tokenStorage.clearTokens();
      setIsLoading(false);
      return;
    }

    // Parse user from token
    const payload = parseJwtPayload<JwtPayload>(token);
    if (payload) {
      setUser({
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        dealership_id: payload.dealership_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    setIsLoading(false);
  }, []);

  /**
   * Login user
   */
  const login = useCallback(
    async (credentials: LoginCredentials): Promise<void> => {
      const response = await api.post<LoginResponse>('/v1/auth/login', credentials, {
        skipAuth: true,
      });

      // Store tokens
      tokenStorage.setToken(response.access_token);
      if (response.refresh_token) {
        tokenStorage.setRefreshToken(response.refresh_token);
      }

      // Set user state
      setUser(response.user);

      // Navigate to dashboard
      setLocation('/');
    },
    [setLocation]
  );

  /**
   * Logout user
   */
  const logout = useCallback(() => {
    tokenStorage.clearTokens();
    setUser(null);
    setLocation('/login');
  }, [setLocation]);

  /**
   * Refresh user data from API
   */
  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const userData = await api.get<User>('/v1/auth/me');
      setUser(userData);
    } catch {
      // If refresh fails, logout
      logout();
    }
  }, [logout]);

  /**
   * Listen for auth:logout events (triggered by 401 responses)
   */
  useEffect(() => {
    const handleLogout = () => {
      setUser(null);
      setLocation('/login');
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [setLocation]);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth hook
 *
 * Access auth context from any component
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

/**
 * ProtectedRoute Component
 *
 * Wraps routes that require authentication.
 * Redirects to login if not authenticated.
 */
interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: User['role'][];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps): JSX.Element {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [isLoading, isAuthenticated, setLocation]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return <></>;
  }

  // Check role-based access
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="mt-2 text-muted-foreground">
            You do not have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * PublicRoute Component
 *
 * Wraps routes that should only be accessible when NOT authenticated.
 * Redirects to dashboard if already authenticated.
 */
interface PublicRouteProps {
  children: ReactNode;
}

export function PublicRoute({ children }: PublicRouteProps): JSX.Element {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation('/');
    }
  }, [isLoading, isAuthenticated, setLocation]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Already authenticated
  if (isAuthenticated) {
    return <></>;
  }

  return <>{children}</>;
}
