# UI Migration Quick Start Guide

**For Developers Migrating Pages to Phase 3 Patterns**

## TL;DR - 5-Minute Checklist

When migrating a page to Phase 3 standards:

1. ✅ Replace custom header with `PageHeader` component
2. ✅ Wrap content in `PageContent` component
3. ✅ Replace hardcoded colors with design tokens
4. ✅ Replace inline spacing with design token classes
5. ✅ Add Zod validation to all forms
6. ✅ Ensure ARIA labels and keyboard navigation
7. ✅ Test in light/dark mode and mobile

---

## Copy-Paste Templates

### Standard Page Template

```typescript
import { PageLayout } from '@/components/page-layout';
import { PageHeader } from '@/components/core/page-header';
import { PageContent } from '@/components/core/page-content';
import { LoadingState } from '@/components/core/loading-state';
import { ErrorState } from '@/components/core/error-state';
import { Button } from '@/components/ui/button';
import { primaryButtonClasses, gridLayouts } from '@/lib/design-tokens';
import { IconName } from 'lucide-react';

export default function MyPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/my-data'],
  });

  return (
    <PageLayout className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <PageHeader
        title="Page Title"
        subtitle="Brief description of what this page does"
        icon={<IconName />}
        actions={
          <Button className={primaryButtonClasses}>
            <Plus className="w-4 h-4 mr-2" />
            Primary Action
          </Button>
        }
      />

      <PageContent>
        {isLoading && <LoadingState message="Loading data..." />}

        {error && (
          <ErrorState
            title="Failed to load data"
            message="Unable to fetch data. Please try again."
            onRetry={() => refetch()}
          />
        )}

        {!isLoading && !error && (
          <div className={gridLayouts.threeCol}>
            {/* Your content here */}
          </div>
        )}
      </PageContent>
    </PageLayout>
  );
}
```

### Form Page Template (with Zod)

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  formSpacing,
  premiumCardClasses,
  primaryButtonClasses,
} from '@/lib/design-tokens';

// Define Zod schema
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  age: z.number().min(18, "Must be 18 or older"),
});

type FormData = z.infer<typeof formSchema>;

export default function MyFormPage() {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      age: 18,
    },
  });

  const onSubmit = (data: FormData) => {
    console.log(data);
  };

  return (
    <PageLayout className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <PageHeader
        title="Form Page"
        subtitle="Enter your information"
        icon={<FileText />}
      />

      <PageContent>
        <Card className={premiumCardClasses}>
          <CardContent className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className={formSpacing.section}>
                <div className={formSpacing.fields}>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          Your full name
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t">
                  <Button variant="outline" type="button">
                    Cancel
                  </Button>
                  <Button type="submit" className={primaryButtonClasses}>
                    Submit
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </PageContent>
    </PageLayout>
  );
}
```

---

## Design Token Cheat Sheet

### Colors (NO HARDCODED VALUES!)

```typescript
// Status Colors
import { statusColors } from '@/lib/design-tokens';

<Badge className={statusColors.success}>Success</Badge>
<Badge className={statusColors.warning}>Warning</Badge>
<Badge className={statusColors.error}>Error</Badge>
<Badge className={statusColors.info}>Info</Badge>
```

### Deal-Specific Colors

```typescript
import { dealStateColors, financialColors } from '@/lib/design-tokens';

<Badge className={dealStateColors.DRAFT}>Draft</Badge>
<Badge className={dealStateColors.IN_PROGRESS}>In Progress</Badge>
<Badge className={dealStateColors.APPROVED}>Approved</Badge>

<span className={financialColors.positive}>+$1,234</span>
<span className={financialColors.negative}>-$567</span>
```

### Card Styles

```typescript
import { premiumCardClasses, cardSpacing } from '@/lib/design-tokens';

<Card className={premiumCardClasses}>
  <CardContent className={cardSpacing.standard}>
    {/* Content */}
  </CardContent>
</Card>
```

### Layouts

```typescript
import { gridLayouts, flexLayouts } from '@/lib/design-tokens';

// Grid
<div className={gridLayouts.twoCol}>{/* 2 columns */}</div>
<div className={gridLayouts.threeCol}>{/* 3 columns */}</div>
<div className={gridLayouts.fourCol}>{/* 4 columns */}</div>

// Flex
<div className={flexLayouts.row}>{/* Horizontal */}</div>
<div className={flexLayouts.col}>{/* Vertical */}</div>
<div className={flexLayouts.between}>{/* Space between */}</div>
```

### Spacing

```typescript
import { formSpacing, cardSpacing, layoutSpacing } from '@/lib/design-tokens';

// Forms
<form className={formSpacing.section}>
  <div className={formSpacing.fields}>
    <div className={formSpacing.fieldGroup}>
      {/* Field */}
    </div>
  </div>
</form>

// Cards
<CardContent className={cardSpacing.standard}>{/* 24px padding */}</CardContent>
<CardContent className={cardSpacing.compact}>{/* 16px padding */}</CardContent>

// Page sections
<div className={layoutSpacing.section}>{/* py-6 */}</div>
```

### Button Patterns

```typescript
import { primaryButtonClasses } from '@/lib/design-tokens';

// Primary action (use sparingly - one per page!)
<Button className={primaryButtonClasses}>
  <Icon className="w-4 h-4 mr-2" />
  Primary Action
</Button>

// Secondary actions
<Button variant="outline">Secondary Action</Button>
<Button variant="ghost">Tertiary Action</Button>
```

---

## Common Migrations

### Before/After: Header

```typescript
// ❌ BEFORE (custom header)
<div className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b">
  <div className="container mx-auto px-4 md:px-6 py-4">
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-semibold">My Page</h1>
      <Button>Action</Button>
    </div>
  </div>
</div>

// ✅ AFTER (PageHeader)
<PageHeader
  title="My Page"
  subtitle="Description of the page"
  icon={<IconName />}
  actions={<Button>Action</Button>}
/>
```

### Before/After: Colors

```typescript
// ❌ BEFORE (hardcoded)
<Badge className="bg-green-500/10 text-green-700 dark:text-green-400">
  Active
</Badge>

// ✅ AFTER (design token)
import { statusColors } from '@/lib/design-tokens';
<Badge className={statusColors.success}>Active</Badge>
```

### Before/After: Spacing

```typescript
// ❌ BEFORE (inline)
<div className="space-y-4">
  <div className="space-y-2">
    <Label>Name</Label>
    <Input />
  </div>
</div>

// ✅ AFTER (design tokens)
import { formSpacing } from '@/lib/design-tokens';
<div className={formSpacing.fields}>
  <div className={formSpacing.fieldGroup}>
    <Label>Name</Label>
    <Input />
  </div>
</div>
```

### Before/After: Form Validation

```typescript
// ❌ BEFORE (manual validation)
const [errors, setErrors] = useState({});

const handleSubmit = (e) => {
  e.preventDefault();
  if (!name) {
    setErrors({ name: "Name is required" });
    return;
  }
  // Submit...
};

// ✅ AFTER (react-hook-form + Zod)
const schema = z.object({
  name: z.string().min(1, "Name is required"),
});

const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: { name: '' },
});
```

---

## Accessibility Checklist

### Forms
```typescript
// ✅ Always use FormLabel
<FormLabel>Name</FormLabel>

// ✅ Always show validation errors
<FormMessage />

// ✅ Provide helpful descriptions
<FormDescription>Your full legal name</FormDescription>

// ✅ Use semantic HTML
<Input type="email" /> // Not <Input type="text" />
```

### Buttons
```typescript
// ✅ Descriptive labels
<Button>Add Customer</Button> // Not just "Add"

// ✅ Loading states
<Button disabled={isLoading}>
  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  Submit
</Button>

// ✅ Disabled states communicate why
<Button disabled={!canSubmit} title="Fill required fields">
  Submit
</Button>
```

### ARIA Labels
```typescript
// ✅ Icon-only buttons
<Button size="icon" aria-label="Close modal">
  <X className="h-4 w-4" />
</Button>

// ✅ Complex widgets
<div role="region" aria-labelledby="section-title">
  <h2 id="section-title">Section Title</h2>
  {/* Content */}
</div>
```

### Keyboard Navigation
```typescript
// ✅ Focusable elements
<button> // Not <div onClick>

// ✅ Tab order
tabIndex={0} // Can be focused
tabIndex={-1} // Programmatically focusable only

// ✅ Skip to content
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

---

## Testing Your Migration

### Visual Testing
```bash
# Light mode
npm run dev
# Navigate to your page

# Dark mode
# Toggle dark mode in UI
# Verify all colors work

# Mobile
# Open DevTools, toggle device toolbar
# Test all breakpoints: 375px, 768px, 1024px, 1440px
```

### Accessibility Testing
```bash
# Install axe DevTools extension
# Open DevTools > axe DevTools
# Run scan on your page
# Fix all issues before submitting PR
```

### TypeScript
```bash
# Strict mode check
npm run type-check

# Should have ZERO errors
```

### Linting
```bash
# ESLint check
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

---

## Common Pitfalls

### ❌ DON'T: Use inline styles
```typescript
<div style={{ color: '#000' }}>Text</div>
```

### ✅ DO: Use Tailwind classes or design tokens
```typescript
<div className="text-foreground">Text</div>
```

---

### ❌ DON'T: Hardcode spacing
```typescript
<div className="mb-4 mt-2 px-6">
```

### ✅ DO: Use design tokens
```typescript
<div className={cardSpacing.standard}>
```

---

### ❌ DON'T: Skip loading states
```typescript
{data && <div>{data.items.map(...)}</div>}
```

### ✅ DO: Show loading feedback
```typescript
{isLoading && <LoadingState message="Loading items..." />}
{!isLoading && data && <div>{data.items.map(...)}</div>}
```

---

### ❌ DON'T: Swallow errors
```typescript
.catch(err => console.error(err))
```

### ✅ DO: Show error states
```typescript
{error && (
  <ErrorState
    title="Failed to load"
    message={error.message}
    onRetry={refetch}
  />
)}
```

---

### ❌ DON'T: Use generic labels
```typescript
<Button>Save</Button>
```

### ✅ DO: Be specific
```typescript
<Button>Save Customer</Button>
```

---

## Pre-Commit Checklist

Before opening your PR:

- [ ] PageHeader/PageContent pattern applied
- [ ] Zero hardcoded colors (search for `#` in your file)
- [ ] Design tokens used for all spacing
- [ ] Forms validated with Zod
- [ ] Loading states shown
- [ ] Error states shown
- [ ] Empty states shown (if applicable)
- [ ] ARIA labels on all icon buttons
- [ ] Keyboard navigation tested
- [ ] Light mode tested
- [ ] Dark mode tested
- [ ] Mobile responsive (375px minimum)
- [ ] TypeScript errors: 0
- [ ] ESLint warnings: 0
- [ ] axe DevTools issues: 0

---

## Getting Help

### Resources
- **Design Tokens:** `/client/src/lib/design-tokens.ts`
- **Core Components:** `/client/src/components/core/`
- **Example Pages:** `dashboard.tsx`, `deals-list.tsx`, `email.tsx`
- **Migration Report:** `/docs/UI_PHASE3_MIGRATION_REPORT.md`

### Questions?
Ask in #engineering-frontend Slack channel or tag @frontend-lead

---

**Last Updated:** November 22, 2025
