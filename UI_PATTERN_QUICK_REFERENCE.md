# UI Pattern Migration - Quick Reference Guide

**For Developers:** Use this guide when migrating pages to the new standardized UI patterns.

---

## Standard Page Pattern

### Before (Old Pattern)
```tsx
import { PageLayout } from '@/components/page-layout';

export default function MyPage() {
  const { data, isLoading, error } = useQuery();

  return (
    <PageLayout>
      <div className="sticky top-0 z-40 backdrop-blur-lg bg-background/90 border-b shadow-sm">
        <div className="container mx-auto px-4 md:px-6 py-5">
          <h1 className="text-2xl md:text-3xl font-bold">Page Title</h1>
          <p className="text-sm text-muted-foreground">Description</p>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 py-8">
        {isLoading && <div>Loading...</div>}
        {error && <div>Error: {error.message}</div>}
        {/* Content */}
      </div>
    </PageLayout>
  );
}
```

### After (New Pattern) ✅
```tsx
import { PageLayout } from '@/components/page-layout';
import { PageHeader } from '@/components/core/page-header';
import { PageContent } from '@/components/core/page-content';
import { LoadingState } from '@/components/core/loading-state';
import { ErrorState } from '@/components/core/error-state';
import { Icon } from 'lucide-react';

export default function MyPage() {
  const { data, isLoading, error, refetch } = useQuery();

  return (
    <PageLayout className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <PageHeader
        title="Page Title"
        subtitle="Description"
        icon={<Icon />}
        actions={<Button>Action</Button>}
      />

      <PageContent>
        {isLoading && <LoadingState message="Loading data..." />}
        {error && <ErrorState message={error.message} onRetry={refetch} />}
        {!isLoading && !error && (
          {/* Content */}
        )}
      </PageContent>
    </PageLayout>
  );
}
```

---

## Design Token Usage

### Spacing

**❌ DON'T:**
```tsx
<Card className="p-6 mb-4 gap-3">
<div className="p-4 space-y-6">
<section className="py-8">
```

**✅ DO:**
```tsx
import { cardSpacing, layoutSpacing } from '@/lib/design-tokens';

<Card className={cardSpacing.standard}>           // p-6
<div className={cn(cardSpacing.compact, "space-y-6")}>  // p-4
<section className={layoutSpacing.page}>         // py-8
```

### Grid Layouts

**❌ DON'T:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
```

**✅ DO:**
```tsx
import { gridLayouts } from '@/lib/design-tokens';

<div className={gridLayouts.threeCol}>
```

### Card Styling

**❌ DON'T:**
```tsx
<Card className="border-none shadow-md hover-elevate transition-all bg-gradient-to-br from-card to-card/80">
```

**✅ DO:**
```tsx
import { premiumCardClasses } from '@/lib/design-tokens';

<Card className={premiumCardClasses}>
```

---

## Complete Token Reference

### Card Spacing
```typescript
import { cardSpacing } from '@/lib/design-tokens';

cardSpacing.standard  // p-6 (24px) - Most cards
cardSpacing.compact   // p-4 (16px) - Dense cards
cardSpacing.large     // p-8 (32px) - Hero cards
```

### Layout Spacing
```typescript
import { layoutSpacing } from '@/lib/design-tokens';

layoutSpacing.page     // py-8 (32px) - Page containers
layoutSpacing.section  // py-6 (24px) - Sections
layoutSpacing.header   // py-5 (20px) - Headers
layoutSpacing.content  // py-4 (16px) - Content
layoutSpacing.compact  // py-3 (12px) - Compact
```

### Grid Layouts
```typescript
import { gridLayouts } from '@/lib/design-tokens';

gridLayouts.twoCol         // 1 / 2 columns
gridLayouts.threeCol       // 1 / 2 / 3 columns
gridLayouts.fourCol        // 1 / 2 / 4 columns
gridLayouts.twoColWide     // 2 columns with wider gap
gridLayouts.threeColCompact // 3 columns with compact gap
```

### Card Patterns
```typescript
import { premiumCardClasses, standardCardClasses, interactiveCardClasses } from '@/lib/design-tokens';

premiumCardClasses      // Premium cards with gradient
standardCardClasses     // Standard bordered cards
interactiveCardClasses  // Clickable cards with hover
```

### Status Colors
```typescript
import { getDealStateColor, getStatusColor } from '@/lib/design-tokens';

// Deal states
<Badge className={getDealStateColor('DRAFT')}>Draft</Badge>
<Badge className={getDealStateColor('IN_PROGRESS')}>In Progress</Badge>
<Badge className={getDealStateColor('APPROVED')}>Approved</Badge>

// Generic status
<Badge className={getStatusColor('success')}>Success</Badge>
<Badge className={getStatusColor('error')}>Error</Badge>
<Badge className={getStatusColor('warning')}>Warning</Badge>
```

### Empty States
```typescript
import { emptyStateClasses, emptyStateIconClasses, emptyStateTextClasses } from '@/lib/design-tokens';

<div className={emptyStateClasses}>
  <div className={emptyStateIconClasses}>
    <Icon className="w-8 h-8" />
  </div>
  <h3 className={emptyStateTextClasses.title}>No items found</h3>
  <p className={emptyStateTextClasses.description}>Description here</p>
</div>
```

---

## Component Patterns

### PageHeader

**Full Example:**
```tsx
<PageHeader
  title="Page Title"
  subtitle="Optional subtitle text"
  icon={<Icon />}
  actions={
    <>
      <Button variant="outline">Secondary</Button>
      <Button>Primary Action</Button>
    </>
  }
  sticky={true}  // default
/>
```

### LoadingState

**Simple:**
```tsx
{isLoading && <LoadingState />}
```

**With Message:**
```tsx
{isLoading && <LoadingState message="Loading customers..." />}
```

**Custom Size:**
```tsx
{isLoading && <LoadingState size="lg" message="Loading data..." />}
```

### ErrorState

**Basic:**
```tsx
{error && <ErrorState message={error.message} />}
```

**With Retry:**
```tsx
{error && (
  <ErrorState
    title="Failed to load data"
    message={error.message}
    onRetry={() => refetch()}
  />
)}
```

### EmptyState

```tsx
import { emptyStateClasses, emptyStateIconClasses, emptyStateTextClasses } from '@/lib/design-tokens';

{items.length === 0 && (
  <div className={emptyStateClasses}>
    <div className={emptyStateIconClasses}>
      <Icon className="w-8 h-8 text-muted-foreground" />
    </div>
    <h3 className={emptyStateTextClasses.title}>No items found</h3>
    <p className={emptyStateTextClasses.description}>
      Description of empty state here.
    </p>
    <Button onClick={handleCreate} className="mt-4">
      Create First Item
    </Button>
  </div>
)}
```

---

## Common Patterns

### Data Fetching with States

```tsx
const { data, isLoading, error, refetch } = useQuery<DataType>({
  queryKey: ['/api/endpoint'],
});

return (
  <PageLayout>
    <PageHeader title="Page" />
    <PageContent>
      {isLoading && <LoadingState message="Loading..." />}
      {error && <ErrorState message={error.message} onRetry={refetch} />}
      {!isLoading && !error && data && (
        <div className={gridLayouts.threeCol}>
          {data.map(item => <ItemCard key={item.id} item={item} />)}
        </div>
      )}
    </PageContent>
  </PageLayout>
);
```

### Card Grid with Skeleton Loaders

```tsx
{isLoading ? (
  <div className={gridLayouts.fourCol}>
    {Array.from({ length: 8 }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
) : (
  <div className={gridLayouts.fourCol}>
    {items.map(item => <ItemCard key={item.id} item={item} />)}
  </div>
)}
```

### Responsive Card

```tsx
import { premiumCardClasses, cardSpacing } from '@/lib/design-tokens';

function ItemCard({ item }) {
  return (
    <Card className={cn(premiumCardClasses, "cursor-pointer group h-full")}>
      <div className={cn("bg-gradient-to-br from-primary/10 to-primary/5", cardSpacing.standard)}>
        {/* Header content */}
      </div>
      <CardContent className={cn(cardSpacing.compact, "space-y-3")}>
        {/* Body content */}
      </CardContent>
    </Card>
  );
}
```

---

## Migration Checklist

When migrating a page, check off these items:

- [ ] Import PageHeader, PageContent, LoadingState, ErrorState
- [ ] Import design tokens (cardSpacing, gridLayouts, etc.)
- [ ] Replace custom header with `<PageHeader>`
- [ ] Wrap content in `<PageContent>`
- [ ] Add LoadingState for async data
- [ ] Add ErrorState with retry for errors
- [ ] Replace all `p-[0-9]` with `cardSpacing.*`
- [ ] Replace all `py-[0-9]` with `layoutSpacing.*`
- [ ] Replace all grid classes with `gridLayouts.*`
- [ ] Replace custom card styles with `*CardClasses`
- [ ] Replace hardcoded status colors with helper functions
- [ ] Test on mobile, tablet, desktop
- [ ] Test dark mode
- [ ] Verify TypeScript compiles
- [ ] Check console for errors

---

## Common Mistakes to Avoid

### 1. Forgetting to remove old loading logic

**❌ BAD:**
```tsx
<PageContent>
  {statsLoading ? '-' : stats?.total}  // Old conditional
</PageContent>
```

**✅ GOOD:**
```tsx
<PageContent>
  {statsLoading && <LoadingState />}
  {!statsLoading && stats?.total}
</PageContent>
```

### 2. Mixing hardcoded and token spacing

**❌ BAD:**
```tsx
<Card className={cn(cardSpacing.standard, "mb-4")}>  // Mixed!
```

**✅ GOOD:**
```tsx
<Card className={cardSpacing.standard}>
  {/* Use layout spacing separately or combine properly */}
</Card>
```

### 3. Not using cn() utility

**❌ BAD:**
```tsx
<Card className={premiumCardClasses + " cursor-pointer"}>  // String concat
```

**✅ GOOD:**
```tsx
<Card className={cn(premiumCardClasses, "cursor-pointer")}>
```

### 4. Forgetting data-testid attributes

**❌ BAD:**
```tsx
<Button onClick={handleAction}>Click Me</Button>
```

**✅ GOOD:**
```tsx
<Button onClick={handleAction} data-testid="button-action">Click Me</Button>
```

---

## Examples from Migrated Pages

### Dashboard Pattern
```tsx
<PageHeader
  title="Dashboard"
  subtitle="Your dealership at a glance"
  icon={<LayoutDashboard />}
  actions={<Button>Start Deal</Button>}
/>
<PageContent>
  {statsLoading && <LoadingState message="Loading dashboard metrics..." />}
  {!statsLoading && (
    <>
      <Card className={cn("mb-6 border-l-4 border-l-emerald-500")}>
        <CardContent className={cardSpacing.standard}>
          {/* Hero metric */}
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Metric cards */}
      </div>
    </>
  )}
</PageContent>
```

### Customers Pattern
```tsx
<PageHeader
  title="Customer Management"
  subtitle="View and manage all your customers"
  icon={<FileUser />}
  actions={<Button onClick={handleAdd}>Add Customer</Button>}
/>
<PageContent>
  {error && <ErrorState message={error.message} onRetry={refetch} />}
  {isLoading && <LoadingState message="Loading customers..." />}
  {!error && !isLoading && customers.length === 0 && (
    <div className={emptyStateClasses}>
      {/* Empty state */}
    </div>
  )}
  {!error && !isLoading && customers.length > 0 && (
    <div className={gridLayouts.fourCol}>
      {customers.map(c => <CustomerCard key={c.id} customer={c} />)}
    </div>
  )}
</PageContent>
```

---

## Need Help?

- Check `/client/src/lib/design-tokens.ts` for all available tokens
- Check `/client/src/components/core/` for component APIs
- Reference migrated pages: `dashboard.tsx`, `customers.tsx`, `email.tsx`
- See `UI_MIGRATION_PHASE3_REPORT.md` for detailed migration examples

---

**Last Updated:** November 21, 2025
**Maintained by:** Frontend Design Specialist
