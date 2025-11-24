# Autolytiq Design System

A comprehensive, modern design system for the Autolytiq dealership management platform. Built with React, TypeScript, and Tailwind CSS.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Design Tokens](#design-tokens)
- [Theming](#theming)
- [Components](#components)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)
- [Accessibility](#accessibility)

---

## Overview

The Autolytiq Design System provides:

- **Consistent UI components** - Pre-built, accessible components
- **Design tokens** - Centralized colors, spacing, typography
- **Light/Dark themes** - Automatic theme switching with persistence
- **TypeScript support** - Full type safety
- **Tailwind integration** - Works seamlessly with Tailwind CSS
- **Accessibility** - WCAG AA compliant components

### Design Principles

1. **Consistency** - Unified visual language across the platform
2. **Accessibility** - Inclusive design for all users
3. **Performance** - Optimized components with minimal overhead
4. **Developer Experience** - Easy to use, well-documented, type-safe
5. **Flexibility** - Customizable while maintaining coherence

---

## Installation

The design system is already integrated into the project. Simply import what you need:

```tsx
import { Button, Card, PageHeader } from '@/design-system';
```

### Setup Theme Provider

Wrap your app with `ThemeProvider` to enable theming:

```tsx
// In your root App.tsx or main.tsx
import { ThemeProvider } from '@/design-system';

function App() {
  return <ThemeProvider defaultTheme="light">{/* Your app content */}</ThemeProvider>;
}
```

---

## Design Tokens

Design tokens are the foundation of the design system. They define colors, spacing, typography, and more.

### Colors

```tsx
import { colors } from '@/design-system';

// Primary blue
colors.primary[500]; // 'hsl(217, 91%, 60%)'

// Semantic colors
colors.success[500]; // Green
colors.error[500]; // Red
colors.warning[500]; // Orange
colors.info[500]; // Cyan
```

#### Color Palette

| Color         | Purpose                     | Example              |
| ------------- | --------------------------- | -------------------- |
| **Primary**   | Main brand color, CTAs      | Blue (#2563EB)       |
| **Secondary** | Supporting actions          | Slate gray (#64748B) |
| **Accent**    | Highlights, attention       | Amber (#F59E0B)      |
| **Success**   | Positive feedback           | Green (#10B981)      |
| **Error**     | Errors, destructive actions | Red (#EF4444)        |
| **Warning**   | Warnings, caution           | Orange (#F97316)     |
| **Info**      | Informational messages      | Cyan                 |
| **Neutral**   | Backgrounds, borders, text  | Gray scale           |

### Typography

```tsx
import { typography } from '@/design-system';

// Font families
typography.fontFamily.sans; // 'Inter, system-ui, ...'
typography.fontFamily.mono; // 'JetBrains Mono, ...'

// Font sizes (includes line-height and letter-spacing)
typography.fontSize.base; // { size: '1rem', lineHeight: '1.5rem', ... }
typography.fontSize['2xl']; // { size: '1.5rem', lineHeight: '2rem', ... }

// Font weights
typography.fontWeight.medium; // '500'
typography.fontWeight.bold; // '700'
```

### Spacing

8-point grid system (4px base unit):

```tsx
import { spacing } from '@/design-system';

spacing[2]; // '0.5rem'  (8px)
spacing[4]; // '1rem'    (16px)
spacing[6]; // '1.5rem'  (24px)
spacing[8]; // '2rem'    (32px)
```

### Border Radius

```tsx
import { borderRadius } from '@/design-system';

borderRadius.sm; // '0.25rem' (4px)
borderRadius.DEFAULT; // '0.5rem'  (8px)
borderRadius.lg; // '0.75rem' (12px)
borderRadius.full; // '9999px'
```

### Shadows

```tsx
import { shadows } from '@/design-system';

shadows.card; // Elevation for cards
shadows.dropdown; // Elevation for dropdowns
shadows.modal; // Elevation for modals
```

### Transitions

```tsx
import { transitions } from '@/design-system';

transitions.duration.normal; // '200ms'
transitions.easing.smooth; // 'cubic-bezier(0.4, 0, 0.2, 1)'
transitions.default; // 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)'
```

---

## Theming

The design system supports light and dark themes with automatic persistence.

### Using the Theme Hook

```tsx
import { useTheme } from '@/design-system';

function MyComponent() {
  const { theme, setTheme, toggleTheme } = useTheme();

  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={toggleTheme}>Toggle Theme</button>
      <button onClick={() => setTheme('dark')}>Dark Mode</button>
    </div>
  );
}
```

### Theme Toggle Component

Pre-built toggle button:

```tsx
import { ThemeToggle } from '@/design-system';

function Header() {
  return (
    <header>
      <ThemeToggle />
    </header>
  );
}
```

### Theme Colors

Themes automatically update CSS custom properties. Use Tailwind classes that reference these variables:

```tsx
<div className="bg-background text-foreground">
  <div className="bg-card border border-card-border">
    <p className="text-muted-foreground">Muted text</p>
  </div>
</div>
```

---

## Components

### Button

Versatile button with multiple variants and sizes.

```tsx
import { Button } from '@/design-system';

// Variants
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>
<Button variant="success">Confirm</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// With icons
<Button icon={<PlusIcon />}>Add Item</Button>
<Button iconAfter={<ArrowRightIcon />}>Continue</Button>

// States
<Button loading>Saving...</Button>
<Button disabled>Disabled</Button>
<Button fullWidth>Full Width</Button>
```

**Props:**

| Prop        | Type                                                                             | Default     | Description          |
| ----------- | -------------------------------------------------------------------------------- | ----------- | -------------------- |
| `variant`   | `'primary' \| 'secondary' \| 'outline' \| 'ghost' \| 'destructive' \| 'success'` | `'primary'` | Visual style         |
| `size`      | `'sm' \| 'md' \| 'lg' \| 'icon'`                                                 | `'md'`      | Button size          |
| `loading`   | `boolean`                                                                        | `false`     | Show loading spinner |
| `icon`      | `ReactNode`                                                                      | -           | Icon before text     |
| `iconAfter` | `ReactNode`                                                                      | -           | Icon after text      |
| `fullWidth` | `boolean`                                                                        | `false`     | Take full width      |

### Card

Container component with multiple variants.

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from '@/design-system';

<Card variant="default">
  <CardHeader>
    <CardTitle>Deal #1234</CardTitle>
    <CardDescription>Created on Nov 24, 2025</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>View Details</Button>
  </CardFooter>
</Card>

// Variants
<Card variant="outlined">Outlined</Card>
<Card variant="elevated">Elevated with shadow</Card>
<Card variant="ghost">Minimal ghost</Card>

// Interactive
<Card hoverable onClick={handleClick}>Clickable card</Card>
<Card selected>Selected state</Card>

// Stats card
<CardStats
  label="Total Deals"
  value="1,234"
  change={{ value: 12.5, trend: 'up' }}
  icon={<DollarIcon />}
/>
```

**Props:**

| Prop        | Type                                               | Default     | Description        |
| ----------- | -------------------------------------------------- | ----------- | ------------------ |
| `variant`   | `'default' \| 'outlined' \| 'elevated' \| 'ghost'` | `'default'` | Visual style       |
| `hoverable` | `boolean`                                          | `false`     | Show hover effects |
| `selected`  | `boolean`                                          | `false`     | Selected state     |

### PageHeader

Consistent page header with title, breadcrumbs, and actions.

```tsx
import { PageHeader, PageHeaderTabs } from '@/design-system';

<PageHeader
  title="Deals"
  subtitle="Manage all your dealership deals"
  breadcrumbs={[
    { label: 'Home', href: '/' },
    { label: 'Deals', href: '/deals' },
    { label: 'Active Deals' },
  ]}
  actions={
    <>
      <Button variant="outline">Export</Button>
      <Button variant="primary">New Deal</Button>
    </>
  }
>
  {/* Optional: Tabs or filters */}
  <PageHeaderTabs
    tabs={[
      { label: 'All', value: 'all', count: 150 },
      { label: 'Active', value: 'active', count: 42 },
      { label: 'Completed', value: 'completed', count: 108 },
    ]}
    activeTab="all"
    onTabChange={handleTabChange}
  />
</PageHeader>;
```

**Props:**

| Prop          | Type               | Default | Description           |
| ------------- | ------------------ | ------- | --------------------- |
| `title`       | `string`           | -       | Page title (required) |
| `subtitle`    | `string`           | -       | Optional description  |
| `breadcrumbs` | `BreadcrumbItem[]` | -       | Breadcrumb navigation |
| `actions`     | `ReactNode`        | -       | Action buttons        |
| `showBorder`  | `boolean`          | `true`  | Show bottom border    |

### PageContent

Main content wrapper with responsive layouts.

```tsx
import { PageContent, PageContentGrid, PageContentEmpty } from '@/design-system';

// Default layout
<PageContent>
  <Card>Content</Card>
</PageContent>

// Grid layout
<PageContent layout="grid" columns={3}>
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</PageContent>

// Centered layout
<PageContent layout="centered">
  <Card>Centered content</Card>
</PageContent>

// Split layout (sidebar + main)
<PageContent layout="split">
  <aside>Sidebar</aside>
  <main>Main content</main>
</PageContent>

// Empty state
<PageContent>
  <PageContentEmpty
    icon={<InboxIcon />}
    title="No deals found"
    description="Get started by creating your first deal"
    action={<Button>Create Deal</Button>}
  />
</PageContent>

// Loading state
<PageContent loading />
```

**Props:**

| Prop       | Type                                           | Default     | Description       |
| ---------- | ---------------------------------------------- | ----------- | ----------------- |
| `layout`   | `'default' \| 'grid' \| 'centered' \| 'split'` | `'default'` | Layout pattern    |
| `columns`  | `1 \| 2 \| 3 \| 4`                             | `3`         | Grid columns      |
| `maxWidth` | `string`                                       | `'7xl'`     | Max content width |
| `loading`  | `boolean`                                      | `false`     | Show skeleton     |

---

## Usage Examples

### Complete Page Example

```tsx
import {
  PageHeader,
  PageContent,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
} from '@/design-system';

function DealsPage() {
  return (
    <>
      <PageHeader
        title="Deals"
        subtitle="Manage all dealership deals"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Deals' }]}
        actions={<Button variant="primary">New Deal</Button>}
      />

      <PageContent layout="grid" columns={3}>
        <Card hoverable>
          <CardHeader>
            <CardTitle>Deal #1001</CardTitle>
          </CardHeader>
          <CardContent>
            <p>2024 Honda Accord</p>
            <p className="text-muted-foreground">$28,500</p>
          </CardContent>
        </Card>
        {/* More cards... */}
      </PageContent>
    </>
  );
}
```

### Form with Actions

```tsx
import { Card, CardHeader, CardTitle, CardContent, CardFooter, Button } from '@/design-system';

function DealForm() {
  const [loading, setLoading] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Deal</CardTitle>
      </CardHeader>
      <CardContent>{/* Form fields */}</CardContent>
      <CardFooter className="justify-end gap-3">
        <Button variant="outline">Cancel</Button>
        <Button variant="primary" loading={loading}>
          Save Deal
        </Button>
      </CardFooter>
    </Card>
  );
}
```

---

## Best Practices

### Component Usage

1. **Always use design system components** - Don't create custom buttons or cards
2. **Leverage variants** - Use built-in variants instead of custom styling
3. **Use semantic HTML** - Components use proper HTML elements for accessibility
4. **Provide aria-labels** - For icon-only buttons and actions

### Styling

1. **Use Tailwind utility classes** - Leverage existing Tailwind classes
2. **Reference design tokens** - Use tokens for custom styles
3. **Maintain consistency** - Stick to the 8-point grid for spacing
4. **Respect theme variables** - Use theme-aware color classes

### TypeScript

1. **Import types** - Use exported types for props
2. **Leverage autocomplete** - Let TypeScript guide you
3. **Avoid 'any'** - Use proper types for props

---

## Accessibility

All components follow WCAG AA guidelines:

### Keyboard Navigation

- All interactive elements are keyboard accessible
- Logical tab order maintained
- Focus indicators visible (2px ring)

### Screen Readers

- Semantic HTML elements used
- ARIA labels provided where needed
- Proper heading hierarchy

### Color Contrast

- Minimum 4.5:1 contrast for normal text
- Minimum 3:1 contrast for large text
- Tested in both light and dark modes

### Touch Targets

- Minimum 44x44px touch targets
- Adequate spacing between interactive elements

### Testing Checklist

- [ ] Keyboard navigation works
- [ ] Screen reader announces content correctly
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG AA
- [ ] Touch targets are 44x44px minimum
- [ ] Works in both light and dark modes

---

## Component Reference

### Complete Component List

**Layout Components:**

- `PageHeader` - Page header with title and actions
- `PageContent` - Main content wrapper
- `PageContentSection` - Content section with heading
- `PageContentGrid` - Responsive grid
- `PageContentEmpty` - Empty state
- `PageContentError` - Error state

**UI Components:**

- `Button` - Primary button component
- `IconButton` - Icon-only button
- `LinkButton` - Link-styled button
- `DropdownButton` - Button with dropdown
- `SplitButton` - Split action button
- `ButtonGroup` - Group of buttons

**Card Components:**

- `Card` - Container component
- `CardHeader` - Card header
- `CardTitle` - Card title
- `CardDescription` - Card description
- `CardContent` - Card content
- `CardFooter` - Card footer
- `CardDivider` - Section divider
- `CardStats` - Statistics card

**Theme Components:**

- `ThemeProvider` - Theme context provider
- `ThemeToggle` - Theme toggle button
- `useTheme` - Theme hook

---

## Contributing

When adding new components:

1. Follow existing patterns and conventions
2. Include TypeScript types
3. Add JSDoc comments
4. Ensure accessibility (WCAG AA)
5. Add examples to README
6. Test in both light and dark modes

---

## Support

For questions or issues:

- Check this README first
- Review component examples
- Check TypeScript types and JSDoc comments
- Consult the team

---

**Version:** 1.0.0
**Last Updated:** November 24, 2025
**Maintained By:** Autolytiq Engineering Team
