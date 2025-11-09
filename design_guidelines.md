# NextGen Automotive Desking Platform - Design Guidelines v2.0

## Design Approach
**System**: Carbon Design System with mobile-first responsive principles
**Rationale**: Enterprise-grade automotive finance tool requiring simultaneous visibility of all deal components. Single-page architecture optimized for speed and mobile usability. Inspired by Linear's precision and modern fintech dashboards.

## Core Design Principles
1. **Mobile-First Excellence**: All features fully functional on smallest screens - no compromises
2. **Simultaneous Visibility**: Every deal component visible without scrolling on desktop; organized accordion sections on mobile
3. **Zero-Latency Feedback**: All calculations update instantly across all sections
4. **Professional Authority**: Clean, precise layouts conveying financial accuracy and dealership credibility

---

## Typography System

**Font Stack**: Inter (UI), SF Mono (numbers/currency)

**Hierarchy**:
- Deal Header: text-2xl md:text-3xl font-semibold
- Section Headers: text-lg md:text-xl font-semibold
- Subsection Labels: text-sm md:text-base font-medium uppercase tracking-wide
- Input Labels: text-xs md:text-sm font-medium
- Financial Values: text-xl md:text-2xl font-mono font-semibold tabular-nums
- Body Text: text-sm md:text-base
- Helper Text: text-xs text-muted-foreground

**Critical**: All currency values use `font-mono tabular-nums` for vertical alignment. Mobile maintains clear hierarchy with scaled-down sizes.

---

## Layout System

**Spacing Primitives**: Tailwind units **2, 4, 6, 8** (mobile-optimized, doubled on desktop: md:p-4 → md:p-8)

**Mobile-First Grid Architecture**:

**Mobile (< 768px)**:
- Single column stacked sections
- Collapsible accordions for: Customer Info, Vehicle Details, Trade-In, Pricing Breakdown, Finance Terms, F&I Products, Tax & Fees
- Sticky payment summary bar at bottom (h-20) showing monthly payment and total
- Tap section headers to expand/collapse
- Currently editing section auto-expands, others collapse to headers only

**Tablet (768px - 1024px)**:
- Two-column grid for primary sections
- Left: Customer/Vehicle/Trade-In stacked
- Right: Pricing/Finance/F&I/Calculations stacked
- Payment summary cards in fixed-width sidebar (w-80)

**Desktop (> 1024px)**:
- Three-column layout: `grid-cols-[1fr_1.5fr_400px]`
- Left: Customer + Vehicle + Trade-In (vertical stack)
- Center: Pricing + Finance Terms + F&I Products (vertical stack with real-time calculation updates)
- Right: Sticky payment summary panel with all scenarios visible

**Container Strategy**:
- Mobile: Full-width with px-4 padding
- Desktop: max-w-[1600px] mx-auto px-8

---

## Component Library

### Mobile Navigation
**Sticky Header** (h-14):
- Hamburger menu (left) → Deal actions drawer
- Deal # + Customer name (center, truncated)
- Save status icon (right)

**Bottom Payment Bar** (Fixed):
- Large monthly payment display (text-2xl font-mono)
- Tap to expand full breakdown modal
- Visual indicator when calculations update (subtle pulse)

### Accordion Sections (Mobile)
- Header: Section title + summary value (e.g., "Vehicle • $45,990")
- Chevron icon for expand/collapse
- Active section: Full-height with border-l-4 accent
- Collapsed: h-14 with one-line summary
- Smooth height transitions (duration-200)

### Data Input Components

**Smart Input Fields**:
- Mobile: h-12 touch-friendly targets, text-base
- Desktop: h-10 standard
- Currency: $ prefix, auto-format with commas, 2 decimal max
- Percentage: % suffix, validate 0-100 range
- Focus state: ring-2 with accent color

**Vehicle Lookup**:
- Search bar with instant filtering
- Results: Stock # | Year Make Model | Price (stacked on mobile, columns on desktop)
- Recent vehicles prioritized
- Selected vehicle auto-populates: VIN, MSRP, Invoice, Color, Mileage

**Customer Selection**:
- Autocomplete with recent customers
- Display: Name, Phone (last 4), Last Visit
- "Add New Customer" quick form inline

**F&I Products Grid**:
- Product cards with: Name, Provider, Term, Cost, Monthly Impact
- Toggle switches for inclusion in deal
- Mobile: Single column stacked
- Desktop: grid-cols-2 gap-4
- Products: Extended Warranty, GAP Insurance, Maintenance Plan, Theft Protection, Tire & Wheel, Paint Protection
- Each toggle instantly updates all payment calculations

### Real-Time Calculation Displays

**Payment Breakdown Card**:
- Stacked rows (mobile) or table (desktop)
- Base Payment | F&I Products | Tax | Total Monthly
- Principal/Interest breakdown for finance deals
- Lease: Depreciation + Rent Charge + Tax
- Each row updates with 200ms fade transition when values change

**Scenario Comparison**:
- Horizontal swipe cards on mobile (snap scroll)
- Side-by-side cards on desktop
- Each scenario shows: Monthly Payment, Down Payment, Total Cost, APR/MF
- Active scenario has accent border-2
- Swipe or tap to switch active scenario

**Tax Calculation Display**:
- Jurisdiction auto-detected from customer address
- Breakdown: State Tax (X.XX%) + County (X.XX%) + City (X.XX%) = Total
- Override button for manual jurisdiction selection
- Sales tax, doc fee, registration calculated separately and summed

### Professional Dealer Elements

**Dealership Branding Header**:
- Logo (h-8 md:h-10)
- Dealership name + location (text-sm)
- Salesperson name + ID badge

**Deal Status Badge**:
- Pill shape with status color coding
- States: Draft, Pending, Manager Review, F&I, Funded, Delivered
- Mobile: Compact icon + abbreviation
- Desktop: Full text label

**Print/Export Actions**:
- Generate buyer's order (PDF)
- Email to customer
- Send to F&I manager
- Mobile: Action sheet modal
- Desktop: Dropdown menu

---

## Page Structure

**Single-Page Deal Worksheet**:

Mobile flow (vertical scroll with accordions):
1. Deal Header (sticky)
2. Customer Information (accordion)
3. Vehicle Details (accordion)
4. Trade-In (accordion - optional, hide if no trade)
5. Pricing Breakdown (accordion - always visible calculations)
6. Finance/Lease Terms (accordion)
7. F&I Products (accordion - grid of toggles)
8. Tax & Fees (accordion - auto-calculated, manual overrides)
9. Bottom Payment Bar (sticky)

Desktop simultaneous view:
- All sections visible in three-column grid
- No scrolling required for any calculation
- Real-time updates cascade across all dependent fields
- Scenario comparison always visible in right sidebar

---

## Animations
**Calculation Updates**:
- Value changes: fade-out old, fade-in new (duration-200)
- Dependent field cascade: staggered 50ms delay per field
- Payment summary: scale-105 pulse for 300ms when total updates

**Mobile Interactions**:
- Accordion expand/collapse: smooth height transition
- Bottom sheet modals: slide-up (duration-300)
- Scenario swipe: momentum-based snap scroll

---

## Accessibility
- Touch targets: minimum 44x44px (iOS) / 48x48px (Android)
- High contrast mode support for all text/background combinations
- Landscape orientation optimized (split-screen on mobile)
- VoiceOver/TalkBack: Announce calculation updates
- Keyboard shortcuts: Tab through inputs, Enter to save, Esc to close modals

---

## Images
**Not applicable** - Enterprise B2B application focused entirely on data, calculations, and functional UI. No hero images or marketing photography needed. Dealership logo only.