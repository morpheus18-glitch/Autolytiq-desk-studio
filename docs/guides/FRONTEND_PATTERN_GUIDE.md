# Autolytiq Frontend Pattern Guide
**Version:** 1.0.0
**Last Updated:** 2025-11-20
**Status:** Official Pattern Library

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Design Tokens](#design-tokens)
3. [Layout Patterns](#layout-patterns)
4. [Component Patterns](#component-patterns)
5. [Data Fetching Patterns](#data-fetching-patterns)
6. [Form Patterns](#form-patterns)
7. [State Management](#state-management)
8. [Migration Guide](#migration-guide)

---

## Quick Start

### Installation Complete

All pattern components are already installed and ready to use:

```tsx
// Core components
import {
  PageHeader,
  PageContent,
  Section,
  LoadingState,
  ErrorState,
  LoadingButton,
  ConfirmDialog,
} from '@/components/core';

// Design tokens
import {
  premiumCardClasses,
  gridLayouts,
  layoutSpacing,
  statusColors,
  getDealStateColor,
} from '@/lib/design-tokens';

// Form fields
import {
  EmailField,
  PhoneField,
  CurrencyField,
  TextField,
} from '@/components/core/form-fields';
```

### Your First Page with Patterns

```tsx
import { PageHeader, PageContent, Section, LoadingState, ErrorState } from '@/components/core';
import { gridLayouts, premiumCardClasses } from '@/lib/design-tokens';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function DealsPage() {
  const { data: deals, isLoading, error } = useQuery({
    queryKey: ['/api/deals'],
  });

  return (
    <>
      <PageHeader
        title="Deals"
        subtitle="Manage all vehicle deals"
        icon={<FileText />}
        actions={<Button>New Deal</Button>}
      />

      <PageContent>
        <Section>
          {isLoading && <LoadingState message="Loading deals..." />}

          {error && (
            <ErrorState
              title="Failed to load deals"
              message={error.message}
              onRetry={() => refetch()}
            />
          )}

          {deals && (
            <div className={gridLayouts.threeCol}>
              {deals.map((deal) => (
                <Card key={deal.id} className={cn(premiumCardClasses, "p-6")}>
                  <h3>{deal.dealNumber}</h3>
                  {/* Deal content */}
                </Card>
              ))}
            </div>
          )}
        </Section>
      </PageContent>
    </>
  );
}
```

---

## Design Tokens

### What Are Design Tokens?

Design tokens are predefined styling patterns that ensure consistency across the application. Instead of writing `className="p-6 gap-4"` everywhere, use tokens:

```tsx
// ❌ DON'T DO THIS
<div className="p-6 gap-4 grid grid-cols-1 md:grid-cols-3 gap-6">

// ✅ DO THIS
import { cardSpacing, gridLayouts } from '@/lib/design-tokens';
<div className={cn(cardSpacing.standard, gridLayouts.threeCol)}>
```

### Available Design Tokens

#### Layout Tokens

```tsx
import {
  containerPadding,  // "container mx-auto px-4 md:px-6"
  layoutSpacing,     // { page, section, header, content, compact }
  gridLayouts,       // { twoCol, threeCol, fourCol, etc. }
  flexLayouts,       // { row, col, between, center, etc. }
} from '@/lib/design-tokens';

// Usage examples:
<div className={containerPadding}>                    // Page container
<div className={layoutSpacing.page}>                  // Page padding
<div className={gridLayouts.threeCol}>                // 3-column grid
<div className={flexLayouts.between}>                 // Flex justify-between
```

#### Card Tokens

```tsx
import {
  premiumCardClasses,      // Featured cards with elevation
  standardCardClasses,     // Regular cards
  interactiveCardClasses,  // Clickable cards
  compactCardClasses,      // Dense layouts
  cardSpacing,            // { standard, compact, large, header }
} from '@/lib/design-tokens';

// Usage:
<Card className={cn(premiumCardClasses, cardSpacing.standard)}>
```

#### Color Tokens

```tsx
import {
  dealStateColors,          // Deal status colors
  statusColors,            // Generic status colors
  financialColors,         // Positive/negative numbers
  getDealStateColor,       // Helper function
} from '@/lib/design-tokens';

// Usage:
<Badge className={getDealStateColor(deal.dealState)}>
  {deal.dealState}
</Badge>

<span className={financialColors.positive}>
  +$1,234.56
</span>
```

#### Typography Tokens

```tsx
import {
  pageTitleClasses,      // Page titles
  pageSubtitleClasses,   // Page subtitles
  sectionTitleClasses,   // Section titles
  responsiveText,        // Responsive text sizes
} from '@/lib/design-tokens';
```

#### Icon Tokens

```tsx
import {
  metricIconContainerClasses,
  heroIconContainerClasses,
  getMetricIconClasses,
} from '@/lib/design-tokens';

// Usage:
const { container, icon } = getMetricIconClasses('emerald');

<div className={container}>
  <DollarSign className={icon} />
</div>
```

---

## Layout Patterns

### Standard Page Structure

Every page should follow this structure:

```tsx
export default function MyPage() {
  return (
    <>
      {/* 1. Page Header (sticky) */}
      <PageHeader
        title="Page Title"
        subtitle="Optional description"
        icon={<Icon />}
        actions={<Button>Action</Button>}
      />

      {/* 2. Page Content (container with padding) */}
      <PageContent>
        {/* 3. Sections (groups of related content) */}
        <Section
          title="Section Title"
          description="Optional description"
          actions={<Button variant="ghost">View All</Button>}
        >
          {/* Section content */}
        </Section>

        <Section title="Another Section">
          {/* More content */}
        </Section>
      </PageContent>
    </>
  );
}
```

### Grid Layouts

Use predefined grid layouts instead of hardcoding:

```tsx
import { gridLayouts } from '@/lib/design-tokens';

// ❌ DON'T
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// ✅ DO
<div className={gridLayouts.threeCol}>
  {items.map(item => <Card key={item.id}>...</Card>)}
</div>

// Available layouts:
// - gridLayouts.twoCol: 2 columns desktop, 1 mobile
// - gridLayouts.threeCol: 3 columns desktop, 2 tablet, 1 mobile
// - gridLayouts.fourCol: 4 columns desktop, 2 tablet, 1 mobile
// - gridLayouts.twoColWide: 2 columns with larger gap
// - gridLayouts.threeColCompact: 3 columns with smaller gap
```

### Flex Layouts

```tsx
import { flexLayouts } from '@/lib/design-tokens';

// Common patterns:
<div className={flexLayouts.between}>        // Space between
<div className={flexLayouts.center}>         // Center items
<div className={flexLayouts.row}>            // Horizontal row with gap
<div className={flexLayouts.col}>            // Vertical column with gap
```

---

## Component Patterns

### Loading States

#### Page-Level Loading

```tsx
const { data, isLoading, error } = useQuery({ queryKey: ['/api/deals'] });

if (isLoading) return <LoadingState message="Loading deals..." />;
if (error) return <ErrorState message={error.message} />;

return <div>{/* Render data */}</div>;
```

#### Inline Loading

```tsx
{isLoading ? (
  <LoadingState message="Loading..." size="sm" />
) : (
  <Content data={data} />
)}
```

#### Button Loading

```tsx
import { LoadingButton } from '@/components/core';

<LoadingButton
  isLoading={mutation.isPending}
  loadingText="Saving..."
  onClick={handleSubmit}
>
  Save Deal
</LoadingButton>
```

#### Custom Spinner

```tsx
import { LoadingSpinner } from '@/components/core';

<Button disabled={isLoading}>
  {isLoading && <LoadingSpinner size="sm" />}
  Submit
</Button>
```

### Error States

#### Page-Level Error

```tsx
if (error) {
  return (
    <ErrorState
      title="Failed to load data"
      message={error.message}
      onRetry={() => refetch()}
    />
  );
}
```

#### Inline Error

```tsx
import { InlineError } from '@/components/core';

{error && <InlineError message={error.message} />}
```

### Confirmation Dialogs

#### With Hook

```tsx
import { ConfirmDialog, useConfirmDialog } from '@/components/core';

export function MyComponent() {
  const confirm = useConfirmDialog();
  const deleteDeal = useDeleteDeal();

  const handleDelete = (id: string) => {
    confirm.open({
      title: 'Delete Deal',
      description: 'Are you sure? This action cannot be undone.',
      confirmText: 'Delete',
      confirmVariant: 'destructive',
      onConfirm: async () => {
        await deleteDeal.mutateAsync(id);
        confirm.close();
      },
    });
  };

  return (
    <>
      <Button onClick={() => handleDelete(deal.id)}>Delete</Button>
      <ConfirmDialog {...confirm.props} />
    </>
  );
}
```

#### Direct Usage

```tsx
const [showConfirm, setShowConfirm] = useState(false);

<ConfirmDialog
  open={showConfirm}
  onOpenChange={setShowConfirm}
  title="Delete Deal"
  description="Are you sure?"
  onConfirm={handleDelete}
  isLoading={isDeleting}
/>
```

---

## Data Fetching Patterns

### Basic Query

```tsx
import { useQuery } from '@tanstack/react-query';

export function useDeals() {
  return useQuery({
    queryKey: ['/api/deals'],
    // queryFn is set globally - no need to specify
  });
}

// Usage:
const { data: deals, isLoading, error } = useDeals();
```

### Query with Parameters

```tsx
export function useDeal(dealId: string) {
  return useQuery({
    queryKey: ['/api/deals', dealId],
    queryFn: async () => {
      return await apiRequest<Deal>('GET', `/api/deals/${dealId}`);
    },
    enabled: !!dealId,
  });
}
```

### Create Mutation

```tsx
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export function useCreateDeal() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateDealInput) => {
      return await apiRequest<Deal>('POST', '/api/deals', data);
    },
    onSuccess: (newDeal) => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      toast({
        title: 'Deal created',
        description: `Deal #${newDeal.dealNumber} created successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to create deal',
        description: error.message,
      });
    },
  });
}

// Usage:
const createDeal = useCreateDeal();

<LoadingButton
  onClick={() => createDeal.mutate(formData)}
  isLoading={createDeal.isPending}
>
  Create Deal
</LoadingButton>
```

### Update Mutation

```tsx
export function useUpdateDeal() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateInput }) => {
      return await apiRequest<Deal>('PUT', `/api/deals/${id}`, data);
    },
    onSuccess: (_, variables) => {
      // Invalidate specific deal
      queryClient.invalidateQueries({ queryKey: ['/api/deals', variables.id] });
      // Invalidate list
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });

      toast({ title: 'Deal updated', description: 'Changes saved successfully.' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Update failed', description: error.message });
    },
  });
}
```

### Delete Mutation

```tsx
export function useDeleteDeal() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (dealId: string) => {
      return await apiRequest('DELETE', `/api/deals/${dealId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      toast({ title: 'Deal deleted', description: 'Deal removed successfully.' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Delete failed', description: error.message });
    },
  });
}
```

**Full examples in:** `/client/src/lib/query-patterns.ts`

---

## Form Patterns

### Standard Form with Validation

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form } from '@/components/ui/form';
import { EmailField, TextField, PhoneField } from '@/components/core/form-fields';
import { LoadingButton } from '@/components/core';

// 1. Define Zod schema
const customerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
});

type CustomerForm = z.infer<typeof customerSchema>;

export function CustomerForm() {
  // 2. Create form with validation
  const form = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
    },
  });

  // 3. Create mutation
  const createCustomer = useCreateCustomer();

  // 4. Handle submit
  const onSubmit = (data: CustomerForm) => {
    createCustomer.mutate(data);
  };

  // 5. Render form
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={formSpacing.fields}>
        <TextField
          form={form}
          name="firstName"
          label="First Name"
          required
        />

        <TextField
          form={form}
          name="lastName"
          label="Last Name"
          required
        />

        <EmailField
          form={form}
          name="email"
          label="Email Address"
          required
        />

        <PhoneField
          form={form}
          name="phone"
          label="Phone Number"
          required
        />

        <div className={formActionsClasses}>
          <LoadingButton
            type="submit"
            isLoading={createCustomer.isPending}
            loadingText="Creating..."
          >
            Create Customer
          </LoadingButton>
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

### Available Form Fields

```tsx
import {
  EmailField,         // Email with validation
  PhoneField,         // Phone number
  TextField,          // Text input
  PasswordField,      // Password input
  CurrencyField,      // Currency with $ prefix and formatting
  PercentageField,    // Percentage with % suffix
  NumberField,        // Number input with min/max/step
} from '@/components/core/form-fields';

// All fields accept:
// - form: UseFormReturn instance
// - name: Field name (from schema)
// - label: Field label
// - required: Show required indicator
// - description: Helper text
// - placeholder: Placeholder text
// - disabled: Disable field
// - className: Additional classes
```

---

## State Management

### When to Use What

1. **React Query** - Server state (API data)
   - All data from the backend
   - Automatically handles caching, refetching, loading states

2. **Zustand** - Global client state
   - UI preferences (sidebar open/closed)
   - Temporary selections
   - Client-only state

3. **React State** - Local component state
   - Form inputs (use react-hook-form)
   - Toggle states
   - UI interactions

### Example: Zustand Store

```tsx
// Only use for client-side UI state
import { create } from 'zustand';

interface UIStore {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));

// Usage:
const { sidebarOpen, toggleSidebar } = useUIStore();
```

---

## Migration Guide

### Migrating Existing Components

#### Step 1: Replace Hardcoded Layout Classes

**Before:**
```tsx
<div className="container mx-auto px-4 md:px-6 py-8">
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    {/* content */}
  </div>
</div>
```

**After:**
```tsx
import { containerPadding, layoutSpacing, gridLayouts } from '@/lib/design-tokens';

<div className={cn(containerPadding, layoutSpacing.page)}>
  <div className={gridLayouts.threeCol}>
    {/* content */}
  </div>
</div>
```

#### Step 2: Replace Page Headers

**Before:**
```tsx
<div className="sticky top-0 z-40 backdrop-blur-lg bg-background/90 border-b">
  <div className="container mx-auto px-4 md:px-6 py-5">
    <h1 className="text-2xl font-bold">Deals</h1>
    <p className="text-sm text-muted-foreground">Manage all deals</p>
  </div>
</div>
```

**After:**
```tsx
import { PageHeader } from '@/components/core';

<PageHeader
  title="Deals"
  subtitle="Manage all deals"
  icon={<FileText />}
  actions={<Button>New Deal</Button>}
/>
```

#### Step 3: Replace Loading States

**Before:**
```tsx
{isLoading && <Loader2 className="animate-spin" />}
{isLoading && <p>Loading...</p>}
{isLoading && <Skeleton className="h-8 w-full" />}
```

**After:**
```tsx
import { LoadingState } from '@/components/core';

{isLoading && <LoadingState message="Loading deals..." />}
```

#### Step 4: Replace Error States

**Before:**
```tsx
{error && <p className="text-red-500">{error.message}</p>}
{error && (
  <div className="text-center py-8">
    <AlertCircle className="w-12 h-12 text-red-500" />
    <p>Error loading data</p>
  </div>
)}
```

**After:**
```tsx
import { ErrorState } from '@/components/core';

{error && (
  <ErrorState
    title="Failed to load data"
    message={error.message}
    onRetry={() => refetch()}
  />
)}
```

#### Step 5: Replace Card Classes

**Before:**
```tsx
<Card className="border-none shadow-md hover:shadow-lg transition-all bg-gradient-to-br from-card to-card/80">
```

**After:**
```tsx
import { premiumCardClasses } from '@/lib/design-tokens';

<Card className={premiumCardClasses}>
```

#### Step 6: Replace Status Badges

**Before:**
```tsx
<Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400">
  {status}
</Badge>
```

**After:**
```tsx
import { getDealStateColor } from '@/lib/design-tokens';

<Badge className={getDealStateColor(deal.dealState)}>
  {deal.dealState}
</Badge>
```

### Migration Checklist

For each page/component you migrate:

- [ ] Replace page header with `<PageHeader>`
- [ ] Wrap content in `<PageContent>`
- [ ] Use `<Section>` for content groups
- [ ] Replace grid classes with `gridLayouts`
- [ ] Replace container padding with `containerPadding`
- [ ] Replace loading states with `<LoadingState>`
- [ ] Replace error states with `<ErrorState>`
- [ ] Replace button loading with `<LoadingButton>`
- [ ] Replace card classes with `premiumCardClasses`
- [ ] Replace status badges with `getDealStateColor()`
- [ ] Replace form fields with enhanced field components
- [ ] Add Zod validation to forms
- [ ] Ensure mutations use toast notifications
- [ ] Ensure queries invalidate correctly

---

## Best Practices Summary

### ✅ DO

- **Use design tokens** for all styling patterns
- **Use core components** for layouts, loading, errors
- **Use React Query** for all API calls
- **Use Zod schemas** for form validation
- **Show loading states** for all async operations
- **Show error states** with retry buttons
- **Invalidate queries** after mutations
- **Show toast notifications** for user actions
- **Type all API responses** with TypeScript

### ❌ DON'T

- **Hard-code spacing** values (use `layoutSpacing`)
- **Hard-code colors** (use `statusColors`, `financialColors`)
- **Copy-paste layout code** (use `PageHeader`, `Section`)
- **Mix different loading patterns** (use `LoadingState`)
- **Forget error handling** (use `ErrorState`)
- **Use manual fetch** (use `apiRequest`)
- **Skip form validation** (use Zod schemas)
- **Create custom confirmation dialogs** (use `ConfirmDialog`)

---

## Getting Help

### Documentation Files

1. **This guide:** `/FRONTEND_PATTERN_GUIDE.md`
2. **UI audit report:** `/UI_CHAOS_AUDIT_REPORT.md`
3. **Design tokens:** `/client/src/lib/design-tokens.ts`
4. **Query patterns:** `/client/src/lib/query-patterns.ts`
5. **Core components:** `/client/src/components/core/`

### Quick Reference

```tsx
// Essential imports for every page:
import {
  PageHeader,
  PageContent,
  Section,
  LoadingState,
  ErrorState,
  LoadingButton,
} from '@/components/core';

import {
  premiumCardClasses,
  gridLayouts,
  layoutSpacing,
  statusColors,
} from '@/lib/design-tokens';

import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
```

---

**Remember:** Consistency is more important than perfection. These patterns exist to make development faster and more predictable. When in doubt, copy an existing pattern!
