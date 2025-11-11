# NextGen Automotive Desking Platform

## Overview

The NextGen Automotive Desking Platform is a **mobile-first** desking tool for automotive dealerships, designed for **value and velocity**. Built for salespeople on the lot and desk managers closing deals fast, the platform enables payment quotes in 30-45 seconds and complete deal structuring in 3-5 minutes. Core philosophy: profit is made when you acquire the car and prep it right - the desking tool focuses on speed, simplicity, and getting customers approved and into cars FAST.

## Product Vision: Two Modes

**MODE 1: Quick Quote** (30-45 seconds)
- Salesperson on lot, qualifying customer
- Phone-based wizard: Pick vehicle → Budget → Down → Trade → Payment
- Text quote to customer
- "Take to Desk" for full structuring

**MODE 2: Full Desk** (3-5 minutes)
- Complete deal structuring
- Start from Quick Quote OR blank desk
- Add F&I products
- Submit to finance

## Recent Changes (November 2024)

**Quick Quote Blank Desking Redesign** - OPTIONAL vehicle architecture (✅ COMPLETE):

- ✅ **Single-Screen Blank Desking Form**: Complete redesign from stepped wizard to single-screen form with all pricing fields (vehicle price, down payment, trade value/payoff, APR, term) as direct inputs
- ✅ **Optional Vehicle Architecture**: Database schema updated to make vehicle_id NULLABLE in deals and deal_scenarios tables; quotes can be created, saved, texted, and converted without vehicle selection
- ✅ **Null-Safe Deal Worksheet**: Comprehensive null handling across all components (header, mobile sections, desktop sections, workflow controls, vehicle switcher) with "No Vehicle Selected" badges and "Select Vehicle" CTAs
- ✅ **Auto-Save System**: Triggers when vehiclePrice is entered (not dependent on vehicle selection); PATCH updates work correctly when navigating back to change values
- ✅ **Conversion Flow**: "Take to Desk" creates deals with vehicle_id=NULL, marks quote as 'converted', navigates to fully functional Deal Worksheet
- ✅ **End-to-End Validation**: Playwright tests confirm complete flow from blank form through auto-save, text quote, and conversion with NULL vehicle database verification

**Professional-Grade Polish** - Apple/Nike quality UI/UX enhancements (✅ COMPLETE):

- ✅ **Premium Skeleton Loading**: 6 reusable glassmorphic skeleton components (SkeletonCard, SkeletonForm, SkeletonPayment, SkeletonAccordion, SkeletonMetricGrid, SkeletonFullWorksheet) replace all spinner-based loading with layout-faithful placeholders; integrated into deals list, deal worksheet, scenarios with smooth 200ms transitions
- ✅ **Optimistic UI Mutations**: Factory utilities (createOptimisticCreate, createOptimisticDelete, setOptimisticState) provide instant feedback for scenario create/delete with automatic rollback on failure; visual affordances via pulse animation on optimistic items
- ✅ **Enhanced Toast System**: Rich notifications with 5 variants (success, info, warning, destructive, default); automatic icon rendering (CheckCircle, Info, AlertTriangle, AlertCircle); glassmorphism styling with backdrop-blur-xl; scale-in micro-interaction; action builders (createUndoAction, createViewAction, createRetryAction) for undo/retry functionality; rich toast helpers (showSuccessToast, showErrorToast, showInfoToast, showWarningToast) with smart durations (4s success, 8s errors); working undo for scenario deletion with snapshot capture pattern
- ✅ **Reusable Empty States**: EmptyState component with glassmorphic styling, fluid typography (text-step-0 to text-step-1), comprehensive test IDs, contextual iconography; integrated into deals list, trade garage, F&I products grid with actionable copy
- ✅ **Micro-interactions System**: 6 CSS animations (shake-error, success-glow, fade-in, scale-in, checkmark-draw, focus-glow) with 250-400ms timing cadence; state-guard pattern in auto-save indicator prevents reflow jitter; semantic styling (variant="outline" + green icon) for success states; reduced-motion compliance
- ✅ **Animation Quality Standards**: All animations use useRef + useState guards (not key-based remounts) to trigger on state change only; timing follows 200ms (smooth), 250ms (spring/scale), 300ms (shake/fade), 400ms (glow) cadence; semantic theme tokens (hsl(var(--ring))) instead of hardcoded colors; accessibility-first with prefers-reduced-motion support

**Quick Quote Wizard - Phase 1** (✅ COMPLETE):

- ✅ **6-Step Mobile Wizard**: Vehicle Selection → Budget → Down Payment → Trade-In → Result screen with clean, mobile-first navigation
- ✅ **Vehicle Inventory Integration**: Quick Quote fetches from `/api/inventory/search` endpoint with real-time search filtering across make, model, year, VIN
- ✅ **Mobile-Optimized Input Components**: MoneyInput with numeric keyboard, SuggestedAmounts with 56px touch targets ($1K, $2.5K, $5K, $10K quick-tap buttons)
- ✅ **Smart Payment Calculation**: Automatic recalculation using Decimal.js (precision: 20) whenever dependencies change (vehicle price, down payment, trade equity, APR, term)
- ✅ **Auto-Save Architecture**: POST creates quote on first calculation, PATCH updates database whenever user modifies inputs (back navigation tested and verified)
- ✅ **Text Quote Dialog**: Customer name/phone capture with Zod validation (min 2 chars name, min 10 digits phone), SMS endpoint ready for Twilio integration
- ✅ **Quote Contact Persistence**: quick_quote_contacts table stores all text quote attempts with status tracking (pending/sent/failed)
- ✅ **"Take to Desk" Conversion**: Seamless upgrade from Quick Quote to Full Desk - creates Deal + Customer + Scenario with all quote data, marks quote as 'converted', navigates to deal worksheet
- ✅ **Zustand State Management**: Complete wizard state persisted to localStorage, survives page refreshes, resets on new quote
- ✅ **Database Schema**: quick_quotes table (id, vehicle_id, quote_payload JSONB, status, timestamps) for full audit trail
- ✅ **End-to-End Validation**: Playwright tests confirm complete flow from vehicle selection through auto-save, recalculation, text quote, and conversion with database verification

**Technical Implementation Details**:
- Auto-save recalculation: ResultStep watches [vehicle, downPayment, tradeValue, tradePayoff, apr, termMonths] and automatically persists updates
- FK handling: Conversion uses salesperson from quote or falls back to first user, returns 400 if no users exist (no more temp-user-id violations)
- Schema validation: PATCH endpoint validates using `insertQuickQuoteSchema.pick({ quotePayload: true })` for type safety
- Real-world workflow: User can go back, change down payment from $5K → $10K, payment recalculates, PATCH persists update, conversion creates deal with updated $10K value

**ZIP-Based Tax Flow & Stock Number Quick-Add** (✅ COMPLETE - November 2024):

- ✅ **ZIP Code Auto-Population**: ZIP code input debounced at 500ms, auto-fetches city/state/taxes from `/api/zip-lookup` endpoint with automatic state selection via useEffect
- ✅ **Manual Override Pattern**: State selector hidden when ZIP valid, "Change" button reveals manual state selection for edge cases (balances automation with transparency)
- ✅ **Home Page Redesign**: New landing page (`client/src/pages/home.tsx`) with Quick Quote and Full Desk entry points using mobile-first design with 56px touch targets
- ✅ **Stock Number Quick-Add Component**: Controlled component (`StockNumberQuickAdd`) with exact-match auto-select, success badge + vehicle preview, comprehensive data-testid coverage for testing
- ✅ **State Synchronization Pattern**: Component receives `selectedVehicle`/`value`/`onChange`/`onClear` props; syncs input when vehicle selected externally (browse/fallback); clears parent selection when typing differs but preserves typed text
- ✅ **Multi-Path Integration**: Works across Quick Quote (with Browse dialog), New Deal (with fallback search), maintaining vehicle state synchronization for direct typing, browse dialog, and fallback search flows
- ✅ **Critical Fix**: onChange calls onClear when typed value diverges from selected vehicle (clears parent state) but doesn't clear input text (preserves user typing); useEffect syncs input when external selection occurs

**Remaining Work**:
- 📱 Mobile-optimize existing Full Desk tabs for thumb zone operation
- 📊 Update APR rate system to real-world credit tiers (8.9% - 23.9%)
- 💬 Complete Twilio integration for actual SMS delivery
- 🔄 Fix inventory navigation: selecting vehicle from inventory should return to deal screen with data preserved

## User Preferences

**Core Philosophy**: Value and velocity, not profit obsession
- "You make profit when you acquire the car and get it through recon properly"
- Desk managers need SPEED to close deals, not complex analytics
- Simple, fast, easy to understand
- Mobile-first (phone in pocket, not tablet or desktop)
- One-handed operation on the lot

**Communication Style**: Simple, everyday language

## System Architecture

### Frontend Architecture

**Framework**: React 18+ with TypeScript and Vite.
**UI Component System**: Shadcn/ui built on Radix UI, styled with Tailwind CSS.
**Design Philosophy**: Carbon Design System principles adapted for automotive finance, emphasizing data primacy, instant feedback, and professional trust, with influences from Linear and Stripe for precision and clarity.
**State Management**: Zustand with Immer for local and UI state; TanStack Query for server state with aggressive caching.
**Routing**: Wouter for lightweight client-side routing.
**Form Management**: React Hook Form with Zod for validation.
**Key Design Decisions**:
- Real-time calculations with Decimal.js (precision: 20, ROUND_HALF_UP).
- Debounced auto-save for data integrity.
- Instant visual feedback on input changes.
- Tabular numbers with monospace fonts for alignment.
- Mobile-first, responsive design with a single-page view and a three-column desktop layout.
- Premium UI/UX with glassmorphism, smooth transitions, and fluid typography, adhering to "Apple/Nike quality" standards for micro-interactions and animations.
- Implementation of a `ScenarioFormContext` for centralized state management in deal worksheets.
- Optimistic UI mutations for instant feedback on scenario actions.
- Comprehensive empty states and micro-interactions system.
- Mobile-optimized components like `MobilePaymentSheet` and `MobileActionButton`.
- Integrated Trade Garage for managing trade-in vehicles.

### Backend Architecture

**Framework**: Express.js with TypeScript.
**API Pattern**: RESTful API.
**Database ORM**: Drizzle ORM.
**Rate Limiting**: Express rate limiter (100 requests/minute per IP).
**Financial Calculations**: Server-side validation using Decimal.js to match frontend precision.
**Key Design Decisions**:
- Dual client-side and server-side calculation for speed and validation.
- Raw body buffering for webhook support.
- Comprehensive logging.
- Auto-save architecture with optimistic updates.

### Data Storage Solutions

**Database**: PostgreSQL via Neon serverless with WebSocket support.
**Schema Design**: Includes tables for Users (with roles), Customers, Vehicles, Trade Vehicles, Deals (with state machine), Deal Scenarios (with JSONB for aftermarket products), Tax Rule Groups, Tax Jurisdictions, Zip Code Lookup, and Audit Log.
**Key Design Decisions**:
- UUID primary keys.
- JSONB fields for flexibility (e.g., dealer fees).
- Comprehensive indexing for search.
- Decimal type for all monetary values.
- `created_at`/`updated_at` timestamps.

### Authentication and Authorization

**Current State**: No authentication system implemented, but infrastructure for session management (connect-pg-simple) and role-based access control is prepared.

## External Dependencies

**Database**: Neon serverless PostgreSQL, @neondatabase/serverless, Drizzle ORM.
**UI Libraries**: Radix UI, Tailwind CSS, Lucide React, date-fns.
**Financial Calculations**: Decimal.js, custom calculation engine.
**Development Tools**: Vite, TypeScript, Drizzle Kit, ESBuild.
**Key Architectural Principles**: Shared schema types via `@shared` directory, type-safe API contracts with Zod, collocated route handlers, separated calculation logic, and preparation for real-time collaborative features.