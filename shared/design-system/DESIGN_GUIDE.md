# Autolytiq Design System - Visual Design Guide

A comprehensive visual reference for designers and developers working on the Autolytiq platform.

## Color Palette

### Primary Colors

**Primary Blue** - Trust, reliability, professionalism

```
50:  #EFF6FF  hsl(214, 100%, 97%)   - Lightest tint
100: #DBEAFE  hsl(214, 95%, 93%)    - Very light
200: #BFDBFE  hsl(213, 97%, 87%)    - Light
300: #93C5FD  hsl(212, 96%, 78%)    - Medium light
400: #60A5FA  hsl(213, 94%, 68%)    - Medium
500: #2563EB  hsl(217, 91%, 60%)    - BASE COLOR
600: #1D4ED8  hsl(221, 83%, 53%)    - Medium dark
700: #1E40AF  hsl(224, 76%, 48%)    - Dark
800: #1E3A8A  hsl(226, 71%, 40%)    - Very dark
900: #1E293B  hsl(224, 64%, 33%)    - Darkest
```

Use for: Main CTAs, active states, links, primary actions

### Secondary Colors

**Slate Gray** - Professional, neutral, supporting

```
500: #64748B  hsl(215, 16%, 47%)    - BASE COLOR
```

Use for: Secondary buttons, supporting text, neutral backgrounds

### Accent Colors

**Amber** - Action, attention, highlights

```
500: #F59E0B  hsl(38, 92%, 50%)     - BASE COLOR
```

Use for: Highlights, featured items, important badges, warning actions

### Semantic Colors

**Success Green**

```
500: #10B981  hsl(142, 71%, 45%)    - BASE COLOR
```

Use for: Success messages, completed states, positive metrics

**Error Red**

```
500: #EF4444  hsl(0, 84%, 60%)      - BASE COLOR
```

Use for: Error messages, destructive actions, critical alerts

**Warning Orange**

```
500: #F97316  hsl(25, 95%, 53%)     - BASE COLOR
```

Use for: Warning messages, caution states, important notices

**Info Cyan**

```
500: #0EA5E9  hsl(199, 89%, 48%)    - BASE COLOR
```

Use for: Informational messages, tips, helpful hints

## Typography

### Font Families

**Sans Serif (Primary)**

- Family: Inter
- Use for: UI text, headings, body copy
- Fallback: system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif

**Monospace (Code)**

- Family: JetBrains Mono
- Use for: Code snippets, technical data, VINs, license plates
- Fallback: SF Mono, Monaco, Cascadia Code, Roboto Mono, Consolas, monospace

### Type Scale

| Size | rem      | px   | Line Height    | Use Case               |
| ---- | -------- | ---- | -------------- | ---------------------- |
| xs   | 0.75rem  | 12px | 1rem (16px)    | Small labels, captions |
| sm   | 0.875rem | 14px | 1.25rem (20px) | Body text (secondary)  |
| base | 1rem     | 16px | 1.5rem (24px)  | Body text (primary)    |
| lg   | 1.125rem | 18px | 1.75rem (28px) | Emphasized text        |
| xl   | 1.25rem  | 20px | 1.75rem (28px) | Small headings         |
| 2xl  | 1.5rem   | 24px | 2rem (32px)    | Medium headings        |
| 3xl  | 1.875rem | 30px | 2.25rem (36px) | Large headings         |
| 4xl  | 2.25rem  | 36px | 2.5rem (40px)  | Page titles            |
| 5xl  | 3rem     | 48px | 1 (48px)       | Hero text              |

### Font Weights

- **300 (Light)** - Large display text only
- **400 (Regular)** - Body text, paragraphs
- **500 (Medium)** - Labels, emphasized text
- **600 (Semibold)** - Headings, subheadings
- **700 (Bold)** - Strong emphasis, important data

### Letter Spacing

- Headings (xl+): -0.01em to -0.04em (tighter)
- Body text: 0em (default)
- Small text (xs): 0.01em (slightly looser)

## Spacing System

### 8-Point Grid

All spacing uses multiples of 4px (0.25rem) for consistency:

| Token | rem     | px   | Use Case                       |
| ----- | ------- | ---- | ------------------------------ |
| 1     | 0.25rem | 4px  | Minimal spacing, icon padding  |
| 2     | 0.5rem  | 8px  | Tight spacing, inline elements |
| 3     | 0.75rem | 12px | Small gaps                     |
| 4     | 1rem    | 16px | Standard spacing, padding      |
| 5     | 1.25rem | 20px | Medium spacing                 |
| 6     | 1.5rem  | 24px | Large spacing, card padding    |
| 8     | 2rem    | 32px | Section spacing                |
| 12    | 3rem    | 48px | Large section spacing          |
| 16    | 4rem    | 64px | Extra large spacing            |

### Common Patterns

**Card Padding:**

```tsx
<Card>
  <CardHeader className="p-6">  {/* 24px */}
  <CardContent className="p-6 pt-0">  {/* 24px horizontal, 0 top */}
</Card>
```

**Page Layout:**

```tsx
<PageContent className="px-4 py-6 sm:px-6 lg:px-8">{/* Responsive: 16px→24px→32px */}</PageContent>
```

**Form Spacing:**

```tsx
<form className="space-y-4">  {/* 16px between fields */}
  <div className="space-y-2">  {/* 8px label to input */}
```

## Border Radius

### Scale

| Token   | rem      | px   | Use Case               |
| ------- | -------- | ---- | ---------------------- |
| sm      | 0.25rem  | 4px  | Small elements, badges |
| DEFAULT | 0.5rem   | 8px  | Buttons, inputs, cards |
| md      | 0.625rem | 10px | Medium elements        |
| lg      | 0.75rem  | 12px | Large cards, modals    |
| xl      | 1rem     | 16px | Extra large containers |
| 2xl     | 1.5rem   | 24px | Hero sections          |
| full    | 9999px   | full | Pills, avatars, badges |

### Component Standards

- **Buttons:** 8px (DEFAULT)
- **Cards:** 8px (DEFAULT) or 12px (lg)
- **Inputs:** 8px (DEFAULT)
- **Modals:** 12px (lg)
- **Badges:** 9999px (full)
- **Avatars:** 9999px (full)

## Shadows

### Elevation Levels

**Level 0 (None)**

- Elements: Flat buttons, ghost variants
- Shadow: none

**Level 1 (Subtle)**

- Elements: Cards (default), inputs
- Shadow: `0 1px 3px 0 rgba(0, 0, 0, 0.1)`

**Level 2 (Moderate)**

- Elements: Elevated cards, dropdowns
- Shadow: `0 4px 6px -1px rgba(0, 0, 0, 0.1)`

**Level 3 (High)**

- Elements: Modals, popovers
- Shadow: `0 10px 15px -3px rgba(0, 0, 0, 0.1)`

**Level 4 (Extreme)**

- Elements: Sticky headers, important modals
- Shadow: `0 25px 50px -12px rgba(0, 0, 0, 0.25)`

### Usage Guidelines

- Use shadows sparingly - flat design is preferred
- Increase shadow on hover for interactive elements
- Dark mode: reduce shadow intensity by 30-50%
- Never stack multiple shadow levels together

## Component Anatomy

### Button

```
┌─────────────────────────────┐
│  [icon] Label Text [icon]   │  ← Height: 40px (md)
└─────────────────────────────┘
   ↑                         ↑
   16px padding          16px padding
```

**Sizes:**

- Small: 32px height, 12px padding
- Medium: 40px height, 16px padding
- Large: 48px height, 24px padding

**Minimum Touch Target:** 44x44px (WCAG AA)

### Card

```
┌─────────────────────────────────────┐
│  CardHeader (24px padding)          │
│  ┌───────────────────────────────┐  │
│  │ CardTitle (text-xl, semibold) │  │
│  │ CardDescription (text-sm)     │  │
│  └───────────────────────────────┘  │
├─────────────────────────────────────┤
│  CardContent (24px horizontal, 0 top)
│  ┌───────────────────────────────┐  │
│  │ Content area                  │  │
│  └───────────────────────────────┘  │
├─────────────────────────────────────┤
│  CardFooter (24px padding)          │
│  [Button] [Button]                  │
└─────────────────────────────────────┘
```

### Page Layout

```
┌─────────────────────────────────────────┐
│ PageHeader                              │
│ ┌─────────────────────────────────────┐ │
│ │ Breadcrumbs                         │ │
│ │ Title                    [Actions]  │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ PageContent                             │
│ ┌─────────────────────────────────────┐ │
│ │ [Card] [Card] [Card]                │ │
│ │ [Card] [Card] [Card]                │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Interactive States

### Buttons

**Primary Button States:**

```
Default:  bg-primary, shadow-sm
Hover:    bg-primary/90, shadow-md
Active:   bg-primary/95
Focus:    ring-2, ring-primary/50
Disabled: opacity-50, pointer-events-none
Loading:  spinner, disabled
```

### Cards

**Hoverable Card States:**

```
Default:  border, shadow-sm
Hover:    shadow-md, -translate-y-0.5
Active:   shadow-lg
Selected: ring-2, ring-primary/20, border-primary
```

## Accessibility

### Color Contrast Ratios

**WCAG AA Minimum:**

- Normal text (16px): 4.5:1
- Large text (18px+): 3:1
- UI components: 3:1

**Our Standards:**

- Body text on background: 7:1+ (AAA)
- Headings on background: 7:1+ (AAA)
- Buttons: 4.5:1+ (AA)
- Borders: 3:1+ (AA)

### Focus Indicators

**Keyboard Focus:**

- Ring width: 2px
- Ring offset: 2px
- Ring color: Primary (blue)
- Destructive: Red ring for delete actions

**Example:**

```css
focus-visible:ring-2
focus-visible:ring-ring
focus-visible:ring-offset-2
```

### Touch Targets

**Minimum Sizes:**

- Mobile: 44x44px (WCAG AA)
- Desktop: 40x40px acceptable
- Comfortable: 48x48px recommended

## Responsive Design

### Breakpoints

| Name | Size   | Use Case       |
| ---- | ------ | -------------- |
| xs   | 475px  | Small phones   |
| sm   | 640px  | Phones         |
| md   | 768px  | Tablets        |
| lg   | 1024px | Laptops        |
| xl   | 1280px | Desktops       |
| 2xl  | 1536px | Large desktops |

### Mobile-First Approach

```tsx
// Default: mobile
<div className="px-4">

// Tablet: md
<div className="px-4 md:px-6">

// Desktop: lg
<div className="px-4 md:px-6 lg:px-8">
```

### Grid Columns

```tsx
// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
```

## Animation Guidelines

### Timing

- **Instant:** 75ms - Micro-interactions (hover)
- **Fast:** 150ms - Quick transitions
- **Normal:** 200ms - Standard transitions (default)
- **Slow:** 300ms - Complex animations
- **Slower:** 500ms - Page transitions

### Easing

- **Linear:** `linear` - Progress bars, loaders
- **Ease-in:** `cubic-bezier(0.4, 0, 1, 1)` - Accelerating
- **Ease-out:** `cubic-bezier(0, 0, 0.2, 1)` - Decelerating (default)
- **Ease-in-out:** `cubic-bezier(0.4, 0, 0.2, 1)` - Smooth
- **Bounce:** `cubic-bezier(0.68, -0.55, 0.265, 1.55)` - Playful (use sparingly)

### Best Practices

1. Prefer `transform` and `opacity` for performance
2. Avoid animating `height`, `width`, `top`, `left`
3. Use `transition-all` sparingly (can be slow)
4. Disable animations for users with `prefers-reduced-motion`

## Dark Mode

### Design Principles

1. **Reduce eye strain** - Lower contrast than light mode
2. **Maintain hierarchy** - Use opacity for depth
3. **True blacks avoided** - Use dark grays (improves contrast)
4. **Semantic colors stay consistent** - Success is still green

### Color Adjustments

**Backgrounds:**

- Light mode: Pure white (0, 0%, 100%)
- Dark mode: Very dark blue-gray (222, 47%, 11%)

**Borders:**

- Light mode: Light gray (214, 32%, 91%)
- Dark mode: Medium dark gray (215, 19%, 25%)

**Text:**

- Light mode: Very dark (222, 47%, 11%)
- Dark mode: Off-white (210, 40%, 98%)

### Testing Checklist

- [ ] Sufficient contrast in both themes
- [ ] Borders visible in both themes
- [ ] Shadows adjusted for dark mode
- [ ] Focus indicators visible
- [ ] No pure black or pure white (except text/bg)

## Common Patterns

### Status Badges

```tsx
// Success
<span className="inline-flex items-center rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
  Active
</span>

// Error
<span className="inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
  Failed
</span>

// Warning
<span className="inline-flex items-center rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning">
  Pending
</span>
```

### Data Display

```tsx
// Label-value pairs
<div className="space-y-4">
  <div>
    <dt className="text-sm font-medium text-muted-foreground">Customer</dt>
    <dd className="mt-1 text-base font-semibold text-foreground">John Smith</dd>
  </div>
</div>
```

### Loading States

```tsx
// Skeleton
<div className="h-4 w-full animate-pulse rounded bg-muted" />

// Spinner (provided in Button component)
<Button loading>Saving...</Button>
```

## Design Tokens Quick Reference

```tsx
// Import tokens
import { colors, spacing, typography, shadows } from '@/design-system';

// Usage
const styles = {
  color: colors.primary[500],
  padding: spacing[4],
  fontSize: typography.fontSize.base.size,
  boxShadow: shadows.card,
};
```

## Resources

- [Full Documentation](./README.md)
- [Quick Start Guide](./QUICKSTART.md)
- [Design Tokens](./tokens.ts)
- [Theme System](./themes.ts)

---

**Version:** 1.0.0
**Last Updated:** November 24, 2025
**Design Team:** Autolytiq
