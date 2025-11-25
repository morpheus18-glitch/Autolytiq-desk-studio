/**
 * App Component
 *
 * Root application component with routing configuration.
 */

import { type JSX } from 'react';
import { Route, Switch } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@design-system';
import { AuthProvider, ProtectedRoute, PublicRoute } from '@/contexts/AuthContext';
import { ToastProvider } from '@/components/ui';
import {
  LoginPage,
  DashboardPage,
  DealsPage,
  CustomersPage,
  InventoryPage,
  SettingsPage,
  ShowroomPage,
  MessagesPage,
} from '@/pages';

/**
 * Query client configuration
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

/**
 * Not Found Page
 */
function NotFoundPage(): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-foreground">404</h1>
        <p className="mt-4 text-lg text-muted-foreground">Page not found</p>
        <a
          href="/"
          className="mt-6 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Go back home
        </a>
      </div>
    </div>
  );
}

/**
 * App Routes
 */
function AppRoutes(): JSX.Element {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login">
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      </Route>

      {/* Protected routes */}
      <Route path="/">
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      </Route>

      <Route path="/deals">
        <ProtectedRoute>
          <DealsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/customers">
        <ProtectedRoute>
          <CustomersPage />
        </ProtectedRoute>
      </Route>

      <Route path="/inventory">
        <ProtectedRoute>
          <InventoryPage />
        </ProtectedRoute>
      </Route>

      <Route path="/settings">
        <ProtectedRoute>
          <SettingsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/showroom">
        <ProtectedRoute>
          <ShowroomPage />
        </ProtectedRoute>
      </Route>

      <Route path="/messages">
        <ProtectedRoute>
          <MessagesPage />
        </ProtectedRoute>
      </Route>

      {/* 404 catch-all */}
      <Route>
        <NotFoundPage />
      </Route>
    </Switch>
  );
}

/**
 * App Component
 */
export function App(): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="autolytiq-theme">
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
