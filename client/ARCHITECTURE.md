# Autolytiq Desk Studio - Frontend Architecture

> A comprehensive architecture document for the React-based frontend of the Autolytiq dealership management system.

**Version:** 1.0.0
**Last Updated:** November 24, 2025
**Tech Stack:** React 18.3.1 | Vite 5.4.20 | TypeScript | Tailwind CSS 3.4.17

---

## Table of Contents

1. [Folder Structure](#1-folder-structure)
2. [Route Definitions](#2-route-definitions)
3. [Component Architecture](#3-component-architecture)
4. [API Client Design](#4-api-client-design)
5. [Authentication Flow](#5-authentication-flow)
6. [State Management](#6-state-management)
7. [File Naming Conventions](#7-file-naming-conventions)
8. [Implementation Guidelines](#8-implementation-guidelines)

---

## 1. Folder Structure

```
/root/autolytiq-desk-studio/client/
├── index.html                          # Vite entry point
├── vite.config.ts                      # Vite configuration
├── tailwind.config.ts                  # Tailwind configuration
├── tsconfig.json                       # TypeScript configuration
├── package.json                        # Dependencies
│
├── public/                             # Static assets
│   ├── favicon.ico
│   ├── logo.svg
│   └── manifest.json
│
└── src/
    ├── main.tsx                        # Application entry
    ├── App.tsx                         # Root component with providers
    ├── vite-env.d.ts                   # Vite type definitions
    │
    ├── api/                            # API layer
    │   ├── index.ts                    # API client exports
    │   ├── client.ts                   # Axios/fetch client configuration
    │   ├── types.ts                    # Shared API types
    │   │
    │   ├── endpoints/                  # Service-specific endpoints
    │   │   ├── auth.ts                 # Authentication endpoints
    │   │   ├── deals.ts                # Deal service endpoints
    │   │   ├── customers.ts            # Customer service endpoints
    │   │   ├── inventory.ts            # Inventory service endpoints
    │   │   ├── users.ts                # User service endpoints
    │   │   ├── config.ts               # Config service endpoints
    │   │   └── email.ts                # Email service endpoints
    │   │
    │   └── hooks/                      # TanStack Query hooks
    │       ├── useDeals.ts             # Deal queries and mutations
    │       ├── useCustomers.ts         # Customer queries and mutations
    │       ├── useInventory.ts         # Inventory queries and mutations
    │       ├── useUsers.ts             # User queries and mutations
    │       ├── useConfig.ts            # Config queries and mutations
    │       └── useEmail.ts             # Email queries and mutations
    │
    ├── components/                     # Shared components
    │   ├── index.ts                    # Component exports
    │   │
    │   ├── layout/                     # Layout components
    │   │   ├── AppLayout.tsx           # Main authenticated layout
    │   │   ├── AuthLayout.tsx          # Login/auth pages layout
    │   │   ├── Sidebar.tsx             # Main navigation sidebar
    │   │   ├── Header.tsx              # Top header bar
    │   │   ├── Footer.tsx              # Optional footer
    │   │   └── MobileNav.tsx           # Mobile navigation drawer
    │   │
    │   ├── navigation/                 # Navigation components
    │   │   ├── NavLink.tsx             # Single navigation link
    │   │   ├── NavGroup.tsx            # Collapsible nav group
    │   │   ├── Breadcrumbs.tsx         # Breadcrumb navigation
    │   │   └── UserMenu.tsx            # User dropdown menu
    │   │
    │   ├── data-display/               # Data presentation components
    │   │   ├── DataTable.tsx           # Reusable data table
    │   │   ├── DataTablePagination.tsx # Table pagination controls
    │   │   ├── DataTableFilters.tsx    # Table filter controls
    │   │   ├── StatCard.tsx            # Statistics display card
    │   │   ├── Badge.tsx               # Status/label badges
    │   │   ├── Avatar.tsx              # User avatar component
    │   │   └── EmptyState.tsx          # Empty data placeholder
    │   │
    │   ├── feedback/                   # Feedback components
    │   │   ├── Toast.tsx               # Toast notifications
    │   │   ├── ToastProvider.tsx       # Toast context provider
    │   │   ├── Alert.tsx               # Alert messages
    │   │   ├── Spinner.tsx             # Loading spinner
    │   │   ├── Skeleton.tsx            # Loading skeletons
    │   │   ├── ProgressBar.tsx         # Progress indicator
    │   │   └── ConfirmDialog.tsx       # Confirmation modal
    │   │
    │   ├── forms/                      # Form components (extends design-system)
    │   │   ├── FormWrapper.tsx         # Form container with react-hook-form
    │   │   ├── SearchInput.tsx         # Search input with debounce
    │   │   ├── DatePicker.tsx          # Date selection component
    │   │   ├── FileUpload.tsx          # File upload with preview
    │   │   ├── CurrencyInput.tsx       # Currency input formatting
    │   │   └── PhoneInput.tsx          # Phone number formatting
    │   │
    │   └── modals/                     # Modal components
    │       ├── Modal.tsx               # Base modal component
    │       ├── ModalHeader.tsx         # Modal header section
    │       ├── ModalBody.tsx           # Modal content section
    │       ├── ModalFooter.tsx         # Modal actions section
    │       └── SlideOver.tsx           # Side panel component
    │
    ├── features/                       # Feature modules
    │   │
    │   ├── auth/                       # Authentication feature
    │   │   ├── components/
    │   │   │   ├── LoginForm.tsx       # Login form component
    │   │   │   ├── ForgotPasswordForm.tsx
    │   │   │   └── ResetPasswordForm.tsx
    │   │   ├── hooks/
    │   │   │   └── useAuth.ts          # Auth state hook
    │   │   ├── context/
    │   │   │   └── AuthContext.tsx     # Auth context provider
    │   │   └── types.ts                # Auth types
    │   │
    │   ├── dashboard/                  # Dashboard feature
    │   │   ├── components/
    │   │   │   ├── MetricsGrid.tsx     # Dashboard metrics
    │   │   │   ├── RecentDeals.tsx     # Recent deals widget
    │   │   │   ├── AlertsWidget.tsx    # System alerts
    │   │   │   ├── ActivityFeed.tsx    # Recent activity
    │   │   │   └── QuickActions.tsx    # Quick action buttons
    │   │   └── hooks/
    │   │       └── useDashboardData.ts
    │   │
    │   ├── deals/                      # Deals feature
    │   │   ├── components/
    │   │   │   ├── DealList.tsx        # Deal listing table
    │   │   │   ├── DealCard.tsx        # Deal summary card
    │   │   │   ├── DealForm.tsx        # Create/edit deal form
    │   │   │   ├── DealDetails.tsx     # Deal detail view
    │   │   │   ├── DealTimeline.tsx    # Deal status timeline
    │   │   │   ├── DealFilters.tsx     # Deal list filters
    │   │   │   └── DealStatusBadge.tsx # Deal status indicator
    │   │   ├── hooks/
    │   │   │   └── useDealFilters.ts
    │   │   ├── schemas/
    │   │   │   └── deal.schema.ts      # Zod validation schema
    │   │   └── types.ts
    │   │
    │   ├── customers/                  # Customers feature
    │   │   ├── components/
    │   │   │   ├── CustomerList.tsx    # Customer listing
    │   │   │   ├── CustomerCard.tsx    # Customer summary card
    │   │   │   ├── CustomerForm.tsx    # Create/edit customer
    │   │   │   ├── CustomerDetails.tsx # Customer detail view
    │   │   │   ├── CustomerHistory.tsx # Purchase history
    │   │   │   └── CustomerFilters.tsx # Customer filters
    │   │   ├── hooks/
    │   │   │   └── useCustomerFilters.ts
    │   │   ├── schemas/
    │   │   │   └── customer.schema.ts
    │   │   └── types.ts
    │   │
    │   ├── inventory/                  # Inventory feature
    │   │   ├── components/
    │   │   │   ├── VehicleList.tsx     # Vehicle grid/list view
    │   │   │   ├── VehicleCard.tsx     # Vehicle thumbnail card
    │   │   │   ├── VehicleForm.tsx     # Add/edit vehicle
    │   │   │   ├── VehicleDetails.tsx  # Vehicle detail view
    │   │   │   ├── VehicleGallery.tsx  # Vehicle image gallery
    │   │   │   ├── VinDecoder.tsx      # VIN lookup component
    │   │   │   ├── InventoryFilters.tsx# Inventory filters
    │   │   │   └── InventoryStats.tsx  # Inventory statistics
    │   │   ├── hooks/
    │   │   │   └── useInventoryFilters.ts
    │   │   ├── schemas/
    │   │   │   └── vehicle.schema.ts
    │   │   └── types.ts
    │   │
    │   └── settings/                   # Settings feature
    │       ├── components/
    │       │   ├── SettingsTabs.tsx    # Settings tab navigation
    │       │   ├── ProfileSettings.tsx # User profile settings
    │       │   ├── DealershipSettings.tsx # Dealership config
    │       │   ├── NotificationSettings.tsx # Notification prefs
    │       │   ├── IntegrationSettings.tsx # External integrations
    │       │   └── UserManagement.tsx  # User administration
    │       ├── hooks/
    │       │   └── useSettings.ts
    │       └── types.ts
    │
    ├── pages/                          # Page components (route targets)
    │   ├── auth/
    │   │   ├── LoginPage.tsx
    │   │   ├── ForgotPasswordPage.tsx
    │   │   └── ResetPasswordPage.tsx
    │   │
    │   ├── dashboard/
    │   │   └── DashboardPage.tsx
    │   │
    │   ├── deals/
    │   │   ├── DealsListPage.tsx
    │   │   ├── DealCreatePage.tsx
    │   │   ├── DealEditPage.tsx
    │   │   └── DealViewPage.tsx
    │   │
    │   ├── customers/
    │   │   ├── CustomersListPage.tsx
    │   │   ├── CustomerCreatePage.tsx
    │   │   ├── CustomerEditPage.tsx
    │   │   └── CustomerViewPage.tsx
    │   │
    │   ├── inventory/
    │   │   ├── InventoryListPage.tsx
    │   │   ├── VehicleAddPage.tsx
    │   │   ├── VehicleEditPage.tsx
    │   │   └── VehicleViewPage.tsx
    │   │
    │   ├── settings/
    │   │   └── SettingsPage.tsx
    │   │
    │   └── errors/
    │       ├── NotFoundPage.tsx
    │       └── ErrorPage.tsx
    │
    ├── hooks/                          # Shared hooks
    │   ├── useDebounce.ts              # Debounced value hook
    │   ├── useLocalStorage.ts          # Local storage hook
    │   ├── useMediaQuery.ts            # Responsive breakpoint hook
    │   ├── usePagination.ts            # Pagination state hook
    │   ├── useClickOutside.ts          # Click outside detection
    │   └── useKeyboardShortcut.ts      # Keyboard shortcut handler
    │
    ├── lib/                            # Utility libraries
    │   ├── utils.ts                    # General utilities
    │   ├── formatters.ts               # Data formatting functions
    │   ├── validators.ts               # Common validation helpers
    │   ├── constants.ts                # App-wide constants
    │   └── storage.ts                  # Storage utilities
    │
    ├── router/                         # Routing configuration
    │   ├── index.tsx                   # Router setup
    │   ├── routes.ts                   # Route definitions
    │   ├── ProtectedRoute.tsx          # Auth-protected route wrapper
    │   └── RoleRoute.tsx               # Role-based route wrapper
    │
    ├── store/                          # Global state (if needed)
    │   ├── index.ts                    # Store exports
    │   └── slices/                     # State slices (if using Zustand)
    │       └── ui.ts                   # UI state (sidebar, modals)
    │
    ├── styles/                         # Global styles
    │   ├── globals.css                 # Global CSS (imports design-system)
    │   └── animations.css              # Custom animations
    │
    ├── types/                          # Shared TypeScript types
    │   ├── index.ts                    # Type exports
    │   ├── api.ts                      # API response types
    │   ├── entities.ts                 # Domain entity types
    │   └── forms.ts                    # Form-specific types
    │
    └── design-system/                  # Design system (symlink or copy)
        └── (linked from /shared/design-system/)
```

---

## 2. Route Definitions

### Route Structure

```typescript
// /src/router/routes.ts

export const ROUTES = {
  // Public routes
  AUTH: {
    LOGIN: '/login',
    FORGOT_PASSWORD: '/forgot-password',
    RESET_PASSWORD: '/reset-password/:token',
  },

  // Protected routes
  DASHBOARD: '/',

  DEALS: {
    LIST: '/deals',
    CREATE: '/deals/new',
    VIEW: '/deals/:id',
    EDIT: '/deals/:id/edit',
  },

  CUSTOMERS: {
    LIST: '/customers',
    CREATE: '/customers/new',
    VIEW: '/customers/:id',
    EDIT: '/customers/:id/edit',
  },

  INVENTORY: {
    LIST: '/inventory',
    ADD: '/inventory/add',
    VIEW: '/inventory/:id',
    EDIT: '/inventory/:id/edit',
  },

  SETTINGS: '/settings',

  // Error routes
  NOT_FOUND: '/404',
} as const;
```

### Router Implementation

```typescript
// /src/router/index.tsx

import { Router, Route, Switch, Redirect } from 'wouter';
import { ROUTES } from './routes';
import { ProtectedRoute } from './ProtectedRoute';

// Layouts
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthLayout } from '@/components/layout/AuthLayout';

// Auth Pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';

// Protected Pages
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { DealsListPage } from '@/pages/deals/DealsListPage';
import { DealCreatePage } from '@/pages/deals/DealCreatePage';
import { DealViewPage } from '@/pages/deals/DealViewPage';
import { DealEditPage } from '@/pages/deals/DealEditPage';
// ... other imports

export function AppRouter() {
  return (
    <Router>
      <Switch>
        {/* Public routes */}
        <Route path={ROUTES.AUTH.LOGIN}>
          <AuthLayout>
            <LoginPage />
          </AuthLayout>
        </Route>
        <Route path={ROUTES.AUTH.FORGOT_PASSWORD}>
          <AuthLayout>
            <ForgotPasswordPage />
          </AuthLayout>
        </Route>
        <Route path={ROUTES.AUTH.RESET_PASSWORD}>
          <AuthLayout>
            <ResetPasswordPage />
          </AuthLayout>
        </Route>

        {/* Protected routes */}
        <ProtectedRoute>
          <AppLayout>
            <Switch>
              <Route path={ROUTES.DASHBOARD} component={DashboardPage} />

              {/* Deals */}
              <Route path={ROUTES.DEALS.LIST} component={DealsListPage} />
              <Route path={ROUTES.DEALS.CREATE} component={DealCreatePage} />
              <Route path={ROUTES.DEALS.VIEW} component={DealViewPage} />
              <Route path={ROUTES.DEALS.EDIT} component={DealEditPage} />

              {/* Customers */}
              <Route path={ROUTES.CUSTOMERS.LIST} component={CustomersListPage} />
              <Route path={ROUTES.CUSTOMERS.CREATE} component={CustomerCreatePage} />
              <Route path={ROUTES.CUSTOMERS.VIEW} component={CustomerViewPage} />
              <Route path={ROUTES.CUSTOMERS.EDIT} component={CustomerEditPage} />

              {/* Inventory */}
              <Route path={ROUTES.INVENTORY.LIST} component={InventoryListPage} />
              <Route path={ROUTES.INVENTORY.ADD} component={VehicleAddPage} />
              <Route path={ROUTES.INVENTORY.VIEW} component={VehicleViewPage} />
              <Route path={ROUTES.INVENTORY.EDIT} component={VehicleEditPage} />

              {/* Settings */}
              <Route path={ROUTES.SETTINGS} component={SettingsPage} />

              {/* 404 */}
              <Route component={NotFoundPage} />
            </Switch>
          </AppLayout>
        </ProtectedRoute>
      </Switch>
    </Router>
  );
}
```

### Navigation Configuration

```typescript
// /src/lib/constants.ts

import { LayoutDashboard, Receipt, Users, Car, Settings } from 'lucide-react';

export const NAVIGATION_ITEMS = [
  {
    label: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    label: 'Deals',
    href: '/deals',
    icon: Receipt,
    children: [
      { label: 'All Deals', href: '/deals' },
      { label: 'New Deal', href: '/deals/new' },
    ],
  },
  {
    label: 'Customers',
    href: '/customers',
    icon: Users,
    children: [
      { label: 'All Customers', href: '/customers' },
      { label: 'Add Customer', href: '/customers/new' },
    ],
  },
  {
    label: 'Inventory',
    href: '/inventory',
    icon: Car,
    children: [
      { label: 'Browse Vehicles', href: '/inventory' },
      { label: 'Add Vehicle', href: '/inventory/add' },
    ],
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
  },
] as const;
```

---

## 3. Component Architecture

### Layout Hierarchy

```
<App>
├── <ThemeProvider>                     # Design system theme
├── <QueryClientProvider>               # TanStack Query
├── <AuthProvider>                      # Auth context
├── <ToastProvider>                     # Toast notifications
│
└── <Router>
    ├── [Public Routes]
    │   └── <AuthLayout>                # Centered auth forms
    │       ├── <header>                # Logo only
    │       └── <main>                  # Auth content
    │           └── <Card>              # Auth form container
    │
    └── [Protected Routes]
        └── <AppLayout>                 # Main app shell
            ├── <Sidebar>               # Left navigation
            │   ├── <Logo />
            │   ├── <NavGroup />
            │   │   └── <NavLink />
            │   └── <UserMenu />
            │
            ├── <Header>                # Top bar
            │   ├── <MobileMenuToggle />
            │   ├── <Breadcrumbs />
            │   ├── <SearchInput />
            │   ├── <ThemeToggle />
            │   └── <UserMenu />
            │
            └── <main>                  # Page content area
                └── [Page Component]
```

### Page Component Structure

```tsx
// Example: DealsListPage.tsx

import { PageHeader, PageContent, Button } from '@/design-system';
import { DealList } from '@/features/deals/components/DealList';
import { DealFilters } from '@/features/deals/components/DealFilters';
import { useDeals } from '@/api/hooks/useDeals';
import { useDealFilters } from '@/features/deals/hooks/useDealFilters';

export function DealsListPage() {
  const { filters, setFilters, resetFilters } = useDealFilters();
  const { data: deals, isLoading, error } = useDeals(filters);

  return (
    <>
      <PageHeader
        title="Deals"
        subtitle={`${deals?.total ?? 0} total deals`}
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Deals' }]}
        actions={<Button href="/deals/new">New Deal</Button>}
      />

      <PageContent>
        <DealFilters filters={filters} onChange={setFilters} onReset={resetFilters} />

        <DealList deals={deals?.items ?? []} isLoading={isLoading} error={error} />
      </PageContent>
    </>
  );
}
```

### Data Table Pattern

```tsx
// /src/components/data-display/DataTable.tsx

import { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';

interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  isLoading?: boolean;
  pagination?: {
    pageIndex: number;
    pageSize: number;
    pageCount: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
  };
  emptyState?: React.ReactNode;
}

export function DataTable<TData>({
  data,
  columns,
  isLoading,
  pagination,
  emptyState,
}: DataTableProps<TData>) {
  // Implementation using @tanstack/react-table
  // Integrates with design system Card and skeleton components
}
```

### Form Component Pattern

```tsx
// Example: DealForm.tsx

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { dealSchema, DealFormValues } from '../schemas/deal.schema';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, Button } from '@/design-system';
import { FormField, FormInput, FormSelect, FormTextarea } from '@/design-system/components/forms';

interface DealFormProps {
  defaultValues?: Partial<DealFormValues>;
  onSubmit: (data: DealFormValues) => Promise<void>;
  isSubmitting?: boolean;
}

export function DealForm({ defaultValues, onSubmit, isSubmitting }: DealFormProps) {
  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealSchema),
    defaultValues,
  });

  return (
    <Card>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardHeader>
          <CardTitle>Deal Information</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <FormField label="Customer" error={form.formState.errors.customerId?.message} required>
            <FormSelect
              {...form.register('customerId')}
              options={customerOptions}
              placeholder="Select a customer"
              error={!!form.formState.errors.customerId}
            />
          </FormField>

          {/* Additional fields */}
        </CardContent>

        <CardFooter className="justify-end gap-3">
          <Button type="button" variant="outline">
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {defaultValues ? 'Update Deal' : 'Create Deal'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
```

---

## 4. API Client Design

### Base Client Configuration

```typescript
// /src/api/client.ts

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getStoredToken, clearAuth } from '@/lib/storage';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear auth and redirect to login
      clearAuth();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### API Types

```typescript
// /src/api/types.ts

// Standard API response wrapper
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

// Paginated response
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

// Standard error response
export interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, string[]>;
}

// Query parameters for lists
export interface ListQueryParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}
```

### Service Endpoints

```typescript
// /src/api/endpoints/deals.ts

import { apiClient } from '../client';
import { PaginatedResponse, ListQueryParams } from '../types';
import { Deal, DealCreate, DealUpdate } from '@/types/entities';

export interface DealQueryParams extends ListQueryParams {
  status?: string;
  customerId?: string;
  vehicleId?: string;
  startDate?: string;
  endDate?: string;
}

export const dealsApi = {
  // List deals with filters
  list: async (params?: DealQueryParams): Promise<PaginatedResponse<Deal>> => {
    const response = await apiClient.get('/deals', { params });
    return response.data;
  },

  // Get single deal
  get: async (id: string): Promise<Deal> => {
    const response = await apiClient.get(`/deals/${id}`);
    return response.data;
  },

  // Create deal
  create: async (data: DealCreate): Promise<Deal> => {
    const response = await apiClient.post('/deals', data);
    return response.data;
  },

  // Update deal
  update: async (id: string, data: DealUpdate): Promise<Deal> => {
    const response = await apiClient.put(`/deals/${id}`, data);
    return response.data;
  },

  // Delete deal
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/deals/${id}`);
  },
};
```

### TanStack Query Hooks

```typescript
// /src/api/hooks/useDeals.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dealsApi, DealQueryParams } from '../endpoints/deals';
import { Deal, DealCreate, DealUpdate } from '@/types/entities';
import { useToast } from '@/components/feedback/ToastProvider';

// Query keys factory
export const dealKeys = {
  all: ['deals'] as const,
  lists: () => [...dealKeys.all, 'list'] as const,
  list: (params: DealQueryParams) => [...dealKeys.lists(), params] as const,
  details: () => [...dealKeys.all, 'detail'] as const,
  detail: (id: string) => [...dealKeys.details(), id] as const,
};

// List deals
export function useDeals(params?: DealQueryParams) {
  return useQuery({
    queryKey: dealKeys.list(params ?? {}),
    queryFn: () => dealsApi.list(params),
  });
}

// Get single deal
export function useDeal(id: string) {
  return useQuery({
    queryKey: dealKeys.detail(id),
    queryFn: () => dealsApi.get(id),
    enabled: !!id,
  });
}

// Create deal mutation
export function useCreateDeal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: DealCreate) => dealsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealKeys.lists() });
      toast({ type: 'success', message: 'Deal created successfully' });
    },
    onError: (error) => {
      toast({ type: 'error', message: 'Failed to create deal' });
    },
  });
}

// Update deal mutation
export function useUpdateDeal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DealUpdate }) => dealsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: dealKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: dealKeys.lists() });
      toast({ type: 'success', message: 'Deal updated successfully' });
    },
    onError: () => {
      toast({ type: 'error', message: 'Failed to update deal' });
    },
  });
}

// Delete deal mutation
export function useDeleteDeal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => dealsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealKeys.lists() });
      toast({ type: 'success', message: 'Deal deleted successfully' });
    },
    onError: () => {
      toast({ type: 'error', message: 'Failed to delete deal' });
    },
  });
}
```

### Query Client Setup

```typescript
// /src/App.tsx

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Other providers and router */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

---

## 5. Authentication Flow

### Auth Context

```typescript
// /src/features/auth/context/AuthContext.tsx

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { authApi } from '@/api/endpoints/auth';
import { getStoredToken, setStoredToken, clearAuth, getStoredUser, setStoredUser } from '@/lib/storage';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'salesperson';
  dealershipId: string;
  dealershipName: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  // Check for existing session on mount
  useEffect(() => {
    const token = getStoredToken();
    const storedUser = getStoredUser();

    if (token && storedUser) {
      setUser(storedUser);
      // Optionally validate token with API
      authApi.validateToken(token)
        .catch(() => {
          clearAuth();
          setUser(null);
        });
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    const { token, user: userData } = response;

    setStoredToken(token);
    setStoredUser(userData);
    setUser(userData);
    setLocation('/');
  }, [setLocation]);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
    setLocation('/login');
  }, [setLocation]);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      setStoredUser(updated);
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### Protected Route Component

```typescript
// /src/router/ProtectedRoute.tsx

import { useAuth } from '@/features/auth/context/AuthContext';
import { Redirect } from 'wouter';
import { Spinner } from '@/components/feedback/Spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'manager' | 'salesperson';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  // Role-based access control
  if (requiredRole && user?.role !== requiredRole && user?.role !== 'admin') {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}
```

### Login Form

```typescript
// /src/features/auth/components/LoginForm.tsx

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
} from '@/design-system';
import { FormField, FormInput } from '@/design-system/components/forms';
import { Alert } from '@/components/feedback/Alert';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setError(null);
      await login(data.email, data.password);
    } catch (err) {
      setError('Invalid email or password. Please try again.');
    }
  };

  return (
    <Card className="w-full max-w-md">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardHeader className="text-center">
          <CardTitle>Sign In</CardTitle>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && <Alert type="error">{error}</Alert>}

          <FormField
            label="Email"
            error={form.formState.errors.email?.message}
          >
            <FormInput
              {...form.register('email')}
              type="email"
              placeholder="you@dealership.com"
              autoComplete="email"
              error={!!form.formState.errors.email}
            />
          </FormField>

          <FormField
            label="Password"
            error={form.formState.errors.password?.message}
          >
            <FormInput
              {...form.register('password')}
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              error={!!form.formState.errors.password}
            />
          </FormField>
        </CardContent>

        <CardFooter className="flex-col gap-4">
          <Button
            type="submit"
            className="w-full"
            loading={form.formState.isSubmitting}
          >
            Sign In
          </Button>
          <a
            href="/forgot-password"
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            Forgot your password?
          </a>
        </CardFooter>
      </form>
    </Card>
  );
}
```

### Token Storage Utilities

```typescript
// /src/lib/storage.ts

const TOKEN_KEY = 'autolytiq_token';
const USER_KEY = 'autolytiq_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getStoredUser<T>(): T | null {
  const stored = localStorage.getItem(USER_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as T;
  } catch {
    return null;
  }
}

export function setStoredUser<T>(user: T): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
```

---

## 6. State Management

### State Management Strategy

The application uses a **hybrid approach** to state management:

| State Type   | Solution                | Use Case                            |
| ------------ | ----------------------- | ----------------------------------- |
| Server State | TanStack Query          | API data, caching, synchronization  |
| Auth State   | React Context           | User session, authentication status |
| UI State     | React Context / Zustand | Sidebar open/close, modals, theme   |
| Form State   | React Hook Form         | Form inputs, validation             |
| URL State    | Wouter + URL params     | Filters, pagination, current route  |
| Local State  | useState                | Component-specific state            |

### UI State Store (Optional - Zustand)

```typescript
// /src/store/slices/ui.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  // Sidebar
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Modals
  activeModal: string | null;
  modalData: Record<string, unknown> | null;
  openModal: (modalId: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;

  // Global loading
  isGlobalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Sidebar
      sidebarOpen: true,
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      // Modals
      activeModal: null,
      modalData: null,
      openModal: (modalId, data = null) => set({ activeModal: modalId, modalData: data }),
      closeModal: () => set({ activeModal: null, modalData: null }),

      // Global loading
      isGlobalLoading: false,
      setGlobalLoading: (loading) => set({ isGlobalLoading: loading }),
    }),
    {
      name: 'autolytiq-ui-storage',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
```

### URL State for Filters

```typescript
// /src/features/deals/hooks/useDealFilters.ts

import { useMemo } from 'react';
import { useLocation, useSearch } from 'wouter';

export interface DealFilters {
  page: number;
  pageSize: number;
  search: string;
  status: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const DEFAULT_FILTERS: DealFilters = {
  page: 1,
  pageSize: 20,
  search: '',
  status: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

export function useDealFilters() {
  const searchString = useSearch();
  const [, setLocation] = useLocation();

  const filters = useMemo(() => {
    const params = new URLSearchParams(searchString);
    return {
      page: parseInt(params.get('page') || '1', 10),
      pageSize: parseInt(params.get('pageSize') || '20', 10),
      search: params.get('search') || '',
      status: params.get('status') || '',
      sortBy: params.get('sortBy') || 'createdAt',
      sortOrder: (params.get('sortOrder') as 'asc' | 'desc') || 'desc',
    };
  }, [searchString]);

  const setFilters = (newFilters: Partial<DealFilters>) => {
    const merged = { ...filters, ...newFilters };
    const params = new URLSearchParams();

    Object.entries(merged).forEach(([key, value]) => {
      if (value && value !== DEFAULT_FILTERS[key as keyof DealFilters]) {
        params.set(key, String(value));
      }
    });

    const query = params.toString();
    setLocation(query ? `/deals?${query}` : '/deals');
  };

  const resetFilters = () => {
    setLocation('/deals');
  };

  return {
    filters,
    setFilters,
    resetFilters,
  };
}
```

---

## 7. File Naming Conventions

### General Rules

| Type       | Convention                       | Example                          |
| ---------- | -------------------------------- | -------------------------------- |
| Components | PascalCase                       | `DealCard.tsx`, `DataTable.tsx`  |
| Hooks      | camelCase with `use` prefix      | `useDeals.ts`, `useDebounce.ts`  |
| Utilities  | camelCase                        | `formatters.ts`, `validators.ts` |
| Types      | PascalCase                       | `Deal`, `Customer`, `Vehicle`    |
| Constants  | UPPER_SNAKE_CASE                 | `API_BASE_URL`, `ROUTES`         |
| Schemas    | camelCase with `.schema` suffix  | `deal.schema.ts`                 |
| Context    | PascalCase with `Context` suffix | `AuthContext.tsx`                |
| Pages      | PascalCase with `Page` suffix    | `DealsListPage.tsx`              |

### File Organization Within Features

```
features/
└── deals/
    ├── components/          # Feature-specific UI components
    │   ├── index.ts         # Re-exports all components
    │   ├── DealList.tsx
    │   ├── DealCard.tsx
    │   └── DealForm.tsx
    │
    ├── hooks/               # Feature-specific hooks
    │   ├── index.ts
    │   └── useDealFilters.ts
    │
    ├── schemas/             # Zod validation schemas
    │   └── deal.schema.ts
    │
    ├── types.ts             # Feature-specific types
    └── index.ts             # Public API exports
```

### Import Conventions

```typescript
// Absolute imports using path aliases
import { Button, Card } from '@/design-system';
import { useAuth } from '@/features/auth';
import { DataTable } from '@/components/data-display';
import { formatCurrency } from '@/lib/formatters';
import { Deal } from '@/types/entities';

// Relative imports within same feature
import { DealCard } from './DealCard';
import { useDealFilters } from '../hooks/useDealFilters';
```

### Path Aliases Configuration

```typescript
// vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/design-system': path.resolve(__dirname, '../shared/design-system'),
    },
  },
});
```

```json
// tsconfig.json

{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/design-system": ["../shared/design-system"],
      "@/design-system/*": ["../shared/design-system/*"]
    }
  }
}
```

---

## 8. Implementation Guidelines

### Component Guidelines

1. **Single Responsibility**: Each component should do one thing well
2. **Composition over Props**: Prefer composable components over prop drilling
3. **Consistent Props**: Follow design system prop naming conventions
4. **Error Boundaries**: Wrap feature sections with error boundaries
5. **Loading States**: Always show loading indicators for async operations
6. **Empty States**: Provide helpful empty states with actions

### Performance Considerations

1. **Code Splitting**: Use dynamic imports for page components
2. **Memoization**: Use `React.memo` for expensive list items
3. **Virtualization**: Use virtual lists for large data sets (100+ items)
4. **Image Optimization**: Lazy load images, use appropriate sizes
5. **Bundle Analysis**: Regularly analyze bundle size

```typescript
// Code splitting example
const DashboardPage = React.lazy(() => import('@/pages/dashboard/DashboardPage'));
const DealsListPage = React.lazy(() => import('@/pages/deals/DealsListPage'));
```

### Testing Strategy

```
src/
├── __tests__/              # Integration tests
│   └── flows/
│       ├── deal-creation.test.tsx
│       └── customer-management.test.tsx
│
└── features/
    └── deals/
        └── components/
            ├── DealForm.tsx
            └── DealForm.test.tsx    # Unit test co-located
```

### Accessibility Checklist

- [ ] All interactive elements are keyboard accessible
- [ ] Focus management for modals and dialogs
- [ ] ARIA labels for icon buttons
- [ ] Form labels and error announcements
- [ ] Sufficient color contrast (4.5:1 minimum)
- [ ] Skip links for keyboard navigation
- [ ] Responsive text sizing (rem/em units)

### Error Handling

```typescript
// Global error boundary
// /src/components/ErrorBoundary.tsx

import React from 'react';
import { PageContentError } from '@/design-system';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error reporting service
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <PageContentError
          title="Something went wrong"
          message="An unexpected error occurred. Please try refreshing the page."
          action={{
            label: 'Refresh Page',
            onClick: () => window.location.reload(),
          }}
        />
      );
    }

    return this.props.children;
  }
}
```

---

## Quick Reference

### API Endpoints (Backend)

| Service     | Base Path           | Port |
| ----------- | ------------------- | ---- |
| API Gateway | `/api/v1`           | 8080 |
| Deals       | `/api/v1/deals`     | -    |
| Customers   | `/api/v1/customers` | -    |
| Inventory   | `/api/v1/inventory` | -    |
| Users       | `/api/v1/users`     | -    |
| Config      | `/api/v1/config`    | -    |
| Email       | `/api/v1/email`     | -    |

### Design System Imports

```typescript
// Components
import {
  Button,
  ButtonGroup,
  IconButton,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  PageHeader,
  PageContent,
} from '@/design-system';

// Form components
import {
  FormField,
  FormInput,
  FormSelect,
  FormTextarea,
  FormCheckbox,
} from '@/design-system/components/forms';

// Theme
import { ThemeProvider, useTheme, ThemeToggle } from '@/design-system';

// Tokens
import { colors, spacing, typography } from '@/design-system';
```

### Environment Variables

```bash
# .env.local
VITE_API_URL=http://localhost:8080/api/v1
VITE_APP_NAME=Autolytiq Desk Studio
VITE_APP_VERSION=1.0.0
```

---

## Next Steps

1. **Initialize Project**: Run `npm create vite@latest` with React + TypeScript
2. **Install Dependencies**: Add Tailwind, TanStack Query, Wouter, React Hook Form, Zod
3. **Link Design System**: Configure path aliases for shared design system
4. **Create Layouts**: Build AppLayout and AuthLayout components
5. **Implement Auth**: Set up AuthContext and login flow
6. **Build API Layer**: Create api client and first set of hooks
7. **Create First Page**: Build Dashboard with real data integration

---

**Document Status:** Ready for Implementation
**Architecture Version:** 1.0.0
**Last Review:** November 24, 2025
