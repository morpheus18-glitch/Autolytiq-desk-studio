# NextGen Automotive Desking Platform - Design Guidelines v3.0 (Premium Edition)

## Design Approach
**System**: Carbon Design System enhanced with premium fintech aesthetics
**Rationale**: Enterprise-grade automotive finance tool with Apple/Nike quality standards. Mobile-first architecture optimized for speed (30-45 sec quotes) with sophisticated visual treatment that commands authority and trust.

## Core Design Principles
1. **Mobile-First Excellence**: All features fully functional on smallest screens - no compromises
2. **Simultaneous Visibility**: Every deal component visible without scrolling on desktop; organized accordion sections on mobile
3. **Zero-Latency Feedback**: All calculations update instantly with 60fps animations
4. **Professional Authority + Premium Aesthetics**: Clean layouts with subtle glow effects, neon accents, and refined typography
5. **Value and Velocity**: Speed-first design philosophy - every interaction optimized for rapid deal closing

---

## Typography System (Premium Edition)

**Font Stack**: 
- UI Text: Inter (Variable font with optical sizing)
- Numbers/Currency: JetBrains Mono (premium monospace with ligatures)
- Accent Text: Inter Display (for headlines with glow effects)

**Enhanced Hierarchy with Glow Effects**:
- **Deal Header**: `text-3xl md:text-4xl font-bold tracking-tight premium-glow-text`
  - Premium glow: Subtle white/cyan halo on dark backgrounds
- **Market Data (KBB, MMR, Valuations)**: `text-xl md:text-2xl font-mono premium-glow-market`
  - Bright glowing effect matching data source brand color
- **Section Headers**: `text-lg md:text-xl font-semibold tracking-tight`
- **Subsection Labels**: `text-xs md:text-sm font-medium uppercase tracking-wider text-muted-foreground`
- **Input Labels**: `text-xs md:text-sm font-medium`
- **Financial Values**: `text-2xl md:text-3xl font-mono font-bold tabular-nums premium-glow-currency`
  - Brighter, richer rendering with subtle green/gold glow
- **Body Text**: `text-sm md:text-base leading-relaxed`
- **Helper Text**: `text-xs text-muted-foreground/80`

**Typography Enhancement Rules**:
1. **Glow Effects on Key Data**: Market valuations, monthly payments, totals receive subtle text-shadow glow
2. **Increased Font Weight**: Financial data uses `font-bold` instead of `font-semibold` for authority
3. **Refined Letter Spacing**: Tighter tracking (`tracking-tight`) on headlines, wider (`tracking-wider`) on labels
4. **Optical Sizing**: Variable fonts adjust rendering based on text size for optimal legibility
5. **Tabular Numbers**: All numeric values use `tabular-nums` for perfect vertical alignment

**Critical**: All currency values use `font-mono tabular-nums premium-glow-currency` for vertical alignment + premium rendering.

---

## Color System (Premium Edition)

**Background Palette**:
- **Primary Background**: `#FAFAF8` (Eggshell, warm matte finish) - replaces pure white
- **Card Background**: `#F5F5F3` (Slightly darker eggshell for elevation)
- **Elevated Surface**: `#EEEEEC` (Subtle depth for modals/sheets)
- **Dark Mode Primary**: `#0A0A0A` (Deep black with subtle warmth)
- **Dark Mode Card**: `#141414` (Elevated dark surface)

**Glow Color Palette** (for text-shadow and neon borders):
- **Currency Glow**: `rgba(34, 197, 94, 0.4)` (Success green with alpha)
- **Market Data Glow**: `rgba(59, 130, 246, 0.5)` (Primary blue)
- **KBB Brand Glow**: `rgba(0, 105, 180, 0.6)` (KBB blue)
- **Danger/Alert Glow**: `rgba(239, 68, 68, 0.4)` (Red)
- **Premium Accent Glow**: `rgba(168, 85, 247, 0.4)` (Purple/violet)
- **Neutral Glow**: `rgba(255, 255, 255, 0.2)` (Subtle white halo)

**Neon Border System**:
- **Border Thickness**: 1px (very fine and thin as requested)
- **Border Glow**: Dual-layer box-shadow for neon effect
  - Inner: `0 0 2px currentColor`
  - Outer: `0 0 8px rgba(currentColor, 0.4)`
- **Component Color Matching**: Borders inherit component's primary color via CSS custom properties
- **Intensity Levels**:
  - Subtle: `neon-border-subtle` (soft glow, always-on)
  - Medium: `neon-border` (standard neon effect)
  - Bright: `neon-border-bright` (high-intensity for key data)

**Implementation Utilities**:
```css
/* Premium glow text */
.premium-glow-text {
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
}

.premium-glow-currency {
  text-shadow: 0 0 12px rgba(34, 197, 94, 0.4);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.premium-glow-market {
  text-shadow: 0 0 14px rgba(59, 130, 246, 0.5);
  font-weight: 700;
}

/* Neon borders */
.neon-border {
  border: 1px solid currentColor;
  box-shadow: 
    inset 0 0 2px currentColor,
    0 0 8px rgba(var(--glow-color-rgb), 0.4);
}

.neon-border-bright {
  border: 1px solid currentColor;
  box-shadow: 
    inset 0 0 3px currentColor,
    0 0 12px rgba(var(--glow-color-rgb), 0.6);
}
```

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