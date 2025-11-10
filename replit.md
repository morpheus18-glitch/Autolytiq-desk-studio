# NextGen Automotive Desking Platform

## Overview

The NextGen Automotive Desking Platform is a comprehensive application for automotive dealerships, managing finance and lease calculations, multi-scenario deal structuring, and customer/vehicle lifecycles. It provides real-time payment calculations with high accuracy using Decimal.js, enabling sales and finance personnel to create, compare, and manage deals efficiently. The platform focuses on delivering a premium, production-ready user experience with "Apple/Nike quality" UI/UX standards, modular architecture, and advanced features like real-time calculations and complete audit trails.

## Recent Changes (November 2024)

**Professional-Grade Polish** - Apple/Nike quality UI/UX enhancements (✅ COMPLETE):

- ✅ **Premium Skeleton Loading**: 6 reusable glassmorphic skeleton components (SkeletonCard, SkeletonForm, SkeletonPayment, SkeletonAccordion, SkeletonMetricGrid, SkeletonFullWorksheet) replace all spinner-based loading with layout-faithful placeholders; integrated into deals list, deal worksheet, scenarios with smooth 200ms transitions
- ✅ **Optimistic UI Mutations**: Factory utilities (createOptimisticCreate, createOptimisticDelete, setOptimisticState) provide instant feedback for scenario create/delete with automatic rollback on failure; visual affordances via pulse animation on optimistic items
- ✅ **Enhanced Toast System**: Rich notifications with 5 variants (success, info, warning, destructive, default); automatic icon rendering (CheckCircle, Info, AlertTriangle, AlertCircle); glassmorphism styling with backdrop-blur-xl; scale-in micro-interaction; action builders (createUndoAction, createViewAction, createRetryAction) for undo/retry functionality; rich toast helpers (showSuccessToast, showErrorToast, showInfoToast, showWarningToast) with smart durations (4s success, 8s errors); working undo for scenario deletion with snapshot capture pattern
- ✅ **Reusable Empty States**: EmptyState component with glassmorphic styling, fluid typography (text-step-0 to text-step-1), comprehensive test IDs, contextual iconography; integrated into deals list, trade garage, F&I products grid with actionable copy
- ✅ **Micro-interactions System**: 6 CSS animations (shake-error, success-glow, fade-in, scale-in, checkmark-draw, focus-glow) with 250-400ms timing cadence; state-guard pattern in auto-save indicator prevents reflow jitter; semantic styling (variant="outline" + green icon) for success states; reduced-motion compliance
- ✅ **Animation Quality Standards**: All animations use useRef + useState guards (not key-based remounts) to trigger on state change only; timing follows 200ms (smooth), 250ms (spring/scale), 300ms (shake/fade), 400ms (glow) cadence; semantic theme tokens (hsl(var(--ring))) instead of hardcoded colors; accessibility-first with prefers-reduced-motion support

## User Preferences

Preferred communication style: Simple, everyday language.

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