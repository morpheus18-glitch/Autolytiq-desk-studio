# NextGen Automotive Desking Platform - Design Guidelines

## Design Approach
**System**: Carbon Design System principles adapted for automotive finance
**Rationale**: Enterprise-grade, data-intensive application requiring clear hierarchy, efficient workflows, and professional credibility. Inspired by Linear's precision and Stripe's data clarity.

## Core Design Principles
1. **Data Primacy**: Information is always visible and accessible - no hidden calculations
2. **Instant Feedback**: Every input change triggers immediate visual updates across all dependent fields
3. **Professional Trust**: Clean, precise layouts that convey financial accuracy and reliability
4. **Efficient Workflows**: Minimize clicks, maximize keyboard navigation, optimize for speed

---

## Typography System

**Font Stack**: Inter (primary), SF Mono (monospace for numbers)

**Hierarchy**:
- Page Headers: text-3xl font-semibold (Deal #2024-01-0042)
- Section Headers: text-xl font-semibold (Customer Information, Payment Calculations)
- Subsection/Card Headers: text-lg font-medium
- Labels: text-sm font-medium uppercase tracking-wide
- Body Text: text-base font-normal
- Financial Values: text-lg font-mono font-semibold (tabular-nums)
- Helper Text: text-sm text-muted-foreground
- Timestamps/Metadata: text-xs text-muted-foreground font-mono

**Critical**: All currency and numerical values use `font-mono` with `tabular-nums` for perfect vertical alignment in tables and lists.

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, 8, 12, 16** consistently
- Component padding: p-4 to p-6
- Section spacing: space-y-8 or gap-8
- Form field spacing: space-y-4
- Card padding: p-6
- Page margins: p-8 to p-12

**Grid Structure**:
- Main workspace: Two-column layout (2/3 for deal worksheet, 1/3 for scenario comparison)
- Deal list: Full-width table with sticky headers
- Forms: Single column max-w-2xl for focused data entry
- Dashboard: CSS Grid with `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` for metrics cards

**Container Widths**:
- Main app: max-w-7xl mx-auto
- Form modals: max-w-3xl
- Narrow content: max-w-2xl

---

## Component Library

### Navigation & Structure
**Top Navigation Bar**:
- Fixed header with dealership branding (left), global search (center), user profile + notifications (right)
- Height: h-16
- Contains breadcrumb navigation for deep pages

**Sidebar** (Deal Management):
- Width: w-64, collapsible to w-16 (icon-only)
- Sections: Active Deals, Draft Deals, Archived, Reports
- Deal count badges for each section

**Tabs** (Scenario Switching):
- Horizontal tabs for Cash/Finance/Lease scenarios
- Active tab with bottom border indicator (border-b-2)
- Payment summary shown in each tab label ($847/mo)

### Data Display

**Financial Summary Cards**:
- Prominent cards with shadow-sm and rounded-lg borders
- Large currency values (text-3xl font-mono) centered or right-aligned
- Label above value, calculation breakdown below in text-sm
- Grid layout: `grid-cols-2 gap-4` for side-by-side comparisons

**Deal Worksheet Table**:
- Dense data table with alternating row backgrounds
- Sticky header row
- Column groups: Vehicle Info | Pricing | Trade-In | Finance Terms | Tax & Fees | Payment
- Editable cells with inline editing (click to edit, Enter to save)
- Real-time calculation indicators (subtle pulse animation on change)

**Amortization Schedule**:
- Scrollable table within card: max-h-96 overflow-y-auto
- Columns: Payment #, Date, Payment Amount, Principal, Interest, Remaining Balance
- Right-aligned numerical columns
- Highlight current month row

**Audit Trail Timeline**:
- Vertical timeline on left with connecting lines
- Each entry: timestamp + user avatar + change description + before/after values
- Grouped by date with collapsible sections
- Recent changes highlighted

### Forms & Inputs

**Input Fields**:
- Consistent height: h-10
- Labels above inputs (required fields marked with *)
- Currency inputs: prefix with $ symbol, right-aligned text
- Percentage inputs: suffix with % symbol
- Auto-formatting as user types (currency: commas, decimals limited to 2)

**Vehicle Lookup**:
- Combo box with autocomplete
- Shows: Stock # | Year Make Model | VIN (last 8) | Price
- Select triggers auto-population of all vehicle fields below
- Loading skeleton while fetching data

**Customer/Trade-In Selection**:
- Similar autocomplete pattern
- Recent customers prioritized
- "Add New" button at bottom of dropdown

**Dealer Fees & Accessories**:
- Repeating row pattern with Add/Remove buttons
- Each row: Name | Amount | Taxable checkbox | Delete icon
- Total automatically calculated and displayed below

**Tax Jurisdiction Display**:
- Read-only field showing detected jurisdiction from address
- Format: "California, Los Angeles County, Los Angeles City"
- Edit icon to manually override if needed

### Interactive Elements

**Scenario Comparison Panel**:
- Sticky side panel (position-sticky top-16)
- Stacked cards for each active scenario
- Key metrics: Monthly Payment, Due at Signing, Total Cost
- "Make Active" button for non-active scenarios
- Delete scenario icon (top-right)

**State Transitions**:
- Status badge with appropriate styling (Draft, In Progress, Approved, etc.)
- Dropdown menu for state change (only valid transitions shown)
- Confirmation modal for critical transitions

**Auto-Save Indicator**:
- Fixed position bottom-right corner
- States: "Saving...", "Saved" (with timestamp), "Error - Retry"
- Subtle fade-in/out animations

**Action Buttons**:
- Primary: Large prominent button (h-11 px-8) for "Create Deal", "Submit for Approval"
- Secondary: Standard buttons (h-9 px-4) for "Add Scenario", "Print Worksheet"
- Destructive: Outlined with warning styling for "Cancel Deal"

### Feedback & Status

**Calculation Loading**:
- Skeleton loaders for payment values during recalculation
- Maintains layout stability (no content shift)

**Validation Errors**:
- Inline below fields in red text
- Icon indicator on input border
- Form-level error summary at top of section

**Success Confirmations**:
- Toast notifications (top-right): "Deal saved", "Scenario added"
- Auto-dismiss after 3 seconds

---

## Page Layouts

**Deal List Page**:
- Search bar + filters (status, salesperson, date range) at top
- Data table below with: Deal #, Customer, Vehicle, Salesperson, Status, Created Date, Actions
- Pagination controls at bottom (showing "1-20 of 156 deals")
- "Create New Deal" button (top-right)

**Deal Worksheet Page**:
- Sticky header: Deal # | Customer Name | Vehicle | Status | Actions (Save, Print, Submit)
- Main content: 2/3 width with tabbed sections (Customer, Vehicle, Trade-In, Pricing, Finance/Lease Terms)
- Right sidebar: 1/3 width with Scenario Comparison + Audit Trail (collapsible)
- All calculations update in real-time as fields change

**Audit History Modal**:
- Full-screen overlay with timeline view
- Filters: User, Field Changed, Date Range
- Export to CSV button

---

## Animations
Use **sparingly** - only for feedback:
- Subtle pulse on recalculated values (scale-105 for 200ms)
- Smooth transitions on tab changes (duration-200)
- Fade-in for toast notifications (duration-300)
- Skeleton loaders with shimmer effect

---

## Accessibility
- All inputs have associated labels
- Keyboard shortcuts for common actions (Cmd+S to save, Cmd+K for search)
- Focus indicators on all interactive elements (ring-2 ring-offset-2)
- ARIA labels on icon-only buttons
- Screen reader announcements for auto-save status

---

## Images
**No hero images needed** - this is an enterprise application, not a marketing site. Focus is on data, tables, and functional UI components.