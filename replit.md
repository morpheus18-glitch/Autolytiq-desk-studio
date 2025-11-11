# NextGen Automotive Desking Platform

## Overview

The NextGen Automotive Desking Platform is a mobile-first desking tool for automotive dealerships, focused on "value and velocity." It enables salespeople and desk managers to generate payment quotes in 30-45 seconds and structure complete deals in 3-5 minutes. The platform's core purpose is to facilitate rapid deal closing by prioritizing speed and simplicity, ensuring customers are approved and in cars quickly, recognizing that profit is primarily made during vehicle acquisition and preparation. The project aims for "Apple/Nike quality" in its UI/UX and overall user experience, supporting two main modes: Quick Quote for on-the-lot customer qualification and Full Desk for comprehensive deal structuring.

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
**Design Philosophy**: Carbon Design System principles adapted for automotive finance, emphasizing data primacy, instant feedback, and professional trust, with influences from Linear and Stripe. Prioritizes mobile-first, responsive design with glassmorphism, smooth transitions, fluid typography, and "Apple/Nike quality" micro-interactions.
**State Management**: Zustand with Immer for local/UI state; TanStack Query for server state with aggressive caching.
**Routing**: Wouter for lightweight client-side routing.
**Form Management**: React Hook Form with Zod for validation.
**Key Design Decisions**: Real-time financial calculations using Decimal.js (precision: 20, ROUND_HALF_UP), debounced auto-save, optimistic UI updates, comprehensive empty states, and mobile-optimized components.

### Backend Architecture

**Framework**: Express.js with TypeScript.
**API Pattern**: RESTful API.
**Database ORM**: Drizzle ORM.
**Rate Limiting**: Express rate limiter (100 requests/minute per IP).
**Financial Calculations**: Server-side validation using Decimal.js to ensure precision matches the frontend.
**Key Design Decisions**: Dual client-side and server-side calculation for performance and data integrity, raw body buffering for webhooks, and comprehensive logging.

### Data Storage Solutions

**Database**: PostgreSQL via Neon serverless with WebSocket support.
**Schema Design**: Uses UUID primary keys and includes tables for Users, Customers, Vehicles, Trade Vehicles, Deals (with state machine), Deal Scenarios (with JSONB for aftermarket products), Tax Rule Groups, Tax Jurisdictions, Zip Code Lookup, Fee Package Templates, and Audit Log. Decimal type is used for all monetary values.
**Fee Package Templates**: Multi-tenant table (dealershipId nullable for global templates) with audit trail (createdBy/updatedBy), displayOrder for UI sorting, and JSONB arrays for dealerFees, accessories, aftermarketProducts. Seeded with 3 realistic starter packages (Basic $2K, Premium $5.6K, Luxury $11.6K) for rapid deal structuring.
**Scenario Comparison**: Side-by-side comparison modal with diff highlighting, allowing users to compare 2 scenarios across 9 key metrics (vehicle price, down payment, trade equity, APR, term, amount financed, monthly payment, total cost, cash due). Features automatic hydration on async load, color-coded diff badges (green for better, red for worse), and visual highlighting (yellow background + left border) on changed rows.

### Authentication and Authorization

**Current State**: Infrastructure prepared for session management (connect-pg-simple) and role-based access control, but no authentication system is currently implemented.

## Recent Changes (November 2025)

**Mobile Navigation System (prof-navigation-1 through prof-navigation-4)**:
- Created sticky bottom navigation bar with 4 quick-access buttons (Dashboard, Deals, Inventory, Customers)
- Implemented expandable menu (bottom-right) with slide-up sheet containing all routes
- Created PageLayout wrapper component with iOS safe-area-inset-bottom support
- Applied PageLayout to all pages for consistent bottom padding (5rem on mobile, 1.5rem on desktop)
- Implemented conditional navigation suppression on deal worksheet pages via shared `isMobileNavSuppressed()` helper
- Navigation automatically hides on deal worksheets to maximize screen real estate
- All interactive elements sized at 56px minimum for one-handed mobile operation

**Scenario Management Enhancements (prof-scenarios-1)**:
- Scenario cloning via duplicate button (already existed, verified working)
- Side-by-side comparison modal with 2-scenario selector
- Diff highlighting on changed values (yellow background, left border accent, diff badges)
- Bug fixes: defensive guards for undefined scenarios, conditional audit logging, decimal-to-string type conversion for API compatibility

## External Dependencies

**Database**: Neon serverless PostgreSQL, @neondatabase/serverless, Drizzle ORM.
**UI Libraries**: Radix UI, Tailwind CSS, Lucide React, date-fns.
**Financial Calculations**: Decimal.js.
**Development Tools**: Vite, TypeScript, Drizzle Kit, ESBuild.