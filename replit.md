# NextGen Automotive Desking Platform

## Overview

The NextGen Automotive Desking Platform is a mobile-first desking tool for automotive dealerships, designed to facilitate rapid deal closing with "value and velocity." It enables salespeople and desk managers to generate payment quotes in 30-45 seconds and structure complete deals in 3-5 minutes. The platform prioritizes speed, simplicity, and an "Apple/Nike quality" UI/UX to ensure quick customer approvals. It supports two main modes branded as **"Deal Studio"**: **Quick Build** for on-the-lot qualification (30-second payment quotes) and **Full Build** for comprehensive deal structuring (3-5 minute workflows).

## User Preferences

**Core Philosophy**: Value and velocity, not profit obsession
- "You make profit when you acquire the car and get it through recon properly"
- Desk managers need SPEED to close deals, not complex analytics
- Simple, fast, easy to understand
- Mobile-first (phone in pocket, not tablet or desktop)
- One-handed operation on the lot

**Communication Style**: Simple, everyday language

## System Architecture

### Frontend

**Framework**: React 18+ with TypeScript and Vite.
**UI Component System**: Shadcn/ui (Radix UI, Tailwind CSS).
**Design Philosophy**: Mobile-first, responsive design with Carbon Design System principles, glassmorphism, smooth transitions, fluid typography, and "Apple/Nike quality" micro-interactions. Emphasizes data primacy and instant feedback. **Premium studio aesthetics** include gradient headers, neon border utilities (`.neon-border`, `.neon-border-subtle`), premium glow effects for currency (`.premium-glow-currency`) and market data (`.premium-glow-market`), eggshell matte backgrounds (#FAFAF8, #F5F5F3), and backdrop blur effects.
**State Management**: Zustand (UI state), TanStack Query (server state with caching).
**Routing**: Wouter (route `/quick-quote` maintained for backward compatibility).
**Form Management**: React Hook Form with Zod validation.
**Key Design Decisions**: Real-time financial calculations (Decimal.js, precision 20, ROUND_HALF_UP), debounced auto-save, optimistic UI, comprehensive empty states, mobile-optimized components, and GPU-friendly glow effects (text-shadow/box-shadow for 60fps performance).

### Backend

**Framework**: Express.js with TypeScript.
**API Pattern**: RESTful API.
**Database ORM**: Drizzle ORM.
**Rate Limiting**: Express rate limiter.
**Financial Calculations**: Server-side validation using Decimal.js.
**Key Design Decisions**: Dual client-side and server-side calculations for performance and integrity, raw body buffering for webhooks.

### Data Storage

**Database**: PostgreSQL (Neon serverless with WebSocket support).
**Schema Design**: UUID primary keys, tables for Users, Customers, Vehicles, Deals (with state machine), Deal Scenarios (JSONB for aftermarket products), Tax Rule Groups, Tax Jurisdictions, Zip Code Lookup, Fee Package Templates, and Audit Log. Monetary values use Decimal type.

## Recent Completed Work (Nov 12, 2025)

**Multi-Tenant Security Implementation**:
- ✅ Added dealershipId to users, customers, and deals tables with NOT NULL constraints
- ✅ Made dealershipId mandatory in createCustomer, createUser, createDeal storage methods
- ✅ Added requireAuth middleware to all write endpoints (POST /api/customers, POST /api/deals, POST /api/quick-quotes/:id/convert)
- ✅ Added requireAuth middleware to all read endpoints (GET /api/customers, GET /api/deals, etc.)
- ✅ Fixed quick-quote conversion to use req.user.dealershipId and validate salesperson dealership
- ✅ Backfilled 39 existing customers with correct dealershipId based on deal relationships
- ⚠️ **CRITICAL TODO**: Add dealership filtering to ALL read queries (see line 110 below)

**Frontend Enhancements**:
- ✅ Deal number placeholder text ("Pending customer") displays when customer not yet attached
- ✅ Customer attachment triggers automatic deal number generation via PATCH /api/deals/:id/attach-customer
- ✅ Tax jurisdictions sorted alphabetically within each region
- ✅ ZIP code lookup with auto-state detection already implemented
- ✅ Consistent Card border-radius (rounded-xl) across all components

**Recent Schema Updates** (Nov 12, 2025):
- **Deal Numbers**: Made `dealNumber` nullable in deals table - generated ONLY when customer attached via `PATCH /api/deals/:id/attach-customer`
- **Customer Attached Tracking**: Added `customerAttachedAt` timestamp to deals table for audit trail
- **Deal Number Sequences**: Created `deal_number_sequences` table with atomic per-dealership counters using SELECT FOR UPDATE locking
- **Customer Multi-tenant Isolation**: Added `dealershipId` to customers table (TODO: populate from auth context)
- **Stock Number Settings**: Using existing `dealershipStockSettings` table for configurable stock number generation

**Deal Number Implementation** (Completed Nov 12, 2025):
- **Format**: "D-1234H" (prefix + 4-digit sequence + Crockford Base32 checksum glyph)
- **Checksum Algorithm**: sequence % 32, mapped to Crockford alphabet "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
- **Generation Method**: `generateDealNumber(dealershipId)` in server/storage.ts
- **Transaction Safety**: SELECT FOR UPDATE prevents race conditions in concurrent requests
- **Multi-tenant**: Each dealership has independent sequence counter
- **API Endpoint**: `PATCH /api/deals/:id/attach-customer` triggers number generation
- **Audit Logging**: Comprehensive audit trail created when customer attached

**Stock Number Implementation** (Completed Nov 12, 2025):
- **Format**: Configurable via `dealershipStockSettings` table (e.g., "STK-2025-000001" or "STK-000001")
- **Generation Method**: `generateStockNumber(dealershipId)` in server/storage.ts
- **Configuration**: Supports `useYearPrefix`, custom `prefix`, and `paddingLength`
- **Transaction Safety**: SELECT FOR UPDATE prevents duplicate stock numbers
- **Auto-initialization**: Creates default settings if none exist

**Customer Attachment Security** (Completed Nov 12, 2025):
- **Endpoint**: `PATCH /api/deals/:id/attach-customer` (body: `{ customerId: string }`)
- **Validation**: Verifies customer and deal belong to same dealership (multi-tenant isolation)
- **Error Handling**: Returns 403 for dealership mismatch, 404 for not found
- **Atomic Operation**: Updates deal with customerId, generates dealNumber, sets customerAttachedAt timestamp
- **TODO**: Inject dealershipId from auth context (req.user.dealershipId) in createCustomer
- **TODO**: Backfill existing customers with correct dealershipId values

**Fee Package Templates**: Multi-tenant, JSONB arrays for dealerFees, accessories, aftermarketProducts, with seeded starter packages for rapid deal structuring.
**Scenario Comparison**: Side-by-side comparison modal with diff highlighting for 9 key metrics.

### Authentication and Authorization

**Authentication System**: Session-based using Passport.js (LocalStrategy).
**Password Security**: `crypto/scrypt` hashing with salt, timing-safe comparison.
**Session Management**: PostgreSQL-backed sessions (connect-pg-simple) with `httpOnly` cookies, secure flag in production, `sameSite: lax`, 7-day `maxAge`.
**Account Security**: Account lockout after 5 failed attempts (15-minute), rate limiting on auth endpoints, `SESSION_SECRET` validation, Helmet middleware for security headers (CSP, HSTS, frameguard, XSS filter, MIME sniffing).
**Role-Based Access**: Four roles (salesperson, sales_manager, finance_manager, admin). Self-registration restricted to "salesperson". `requireAuth()` and `requireRole()` middleware.
**Advanced Features**: Password reset (token-based), 2FA/MFA (TOTP-based with QR), granular permissions (20 across 5 categories), permission-based RBAC (`requirePermission()` middleware), user preferences API (JSONB), dealership settings API (multi-tenant), and comprehensive security audit trail.

## External Dependencies

**Database**: Neon serverless PostgreSQL, `@neondatabase/serverless`, Drizzle ORM.
**UI Libraries**: Radix UI, Tailwind CSS, Lucide React, `date-fns`.
**Financial Calculations**: Decimal.js.
**Development Tools**: Vite, TypeScript, Drizzle Kit, ESBuild.

## Remaining TODO Items

**Critical - Multi-tenant Data Isolation** (✅ FULLY COMPLETED - Nov 12, 2025):
1. ✅ **COMPLETED**: Added dealershipId to users, customers, deals, and vehicles tables
2. ✅ **COMPLETED**: Made dealershipId mandatory in createCustomer, createUser, createDeal, createVehicle
3. ✅ **COMPLETED**: Injected dealershipId from req.user in ALL write endpoints (POST /api/customers, /api/deals, /api/vehicles)
4. ✅ **COMPLETED**: Backfilled all existing customers (39 records) and vehicles (44 records) with correct dealershipId
5. ✅ **COMPLETED**: Added requireAuth middleware to ALL read and write endpoints (users, customers, deals, vehicles, trades, audit)
6. ✅ **COMPLETED**: Added dealershipId filtering to ALL read queries (users, customers, deals, vehicles) - full tenant isolation enforced
7. ✅ **COMPLETED**: Changed all cross-tenant access denials from 403 to 404 to prevent resource enumeration
8. ✅ **COMPLETED**: Updated IStorage interface signatures for all methods to require/filter by dealershipId
9. ✅ **COMPLETED**: Added foreign key constraints with CASCADE on delete for users, customers, deals, vehicles
10. ✅ **COMPLETED**: Created composite unique index on vehicles (dealership_id, stock_number) for tenant-scoped uniqueness
11. ✅ **COMPLETED**: All storage methods now enforce dealershipId filtering in WHERE clauses
12. **TODO**: Improve registration to require invitation-bound dealership or disable public signup when multiple dealerships exist (currently assigns to first dealership)
13. **TODO**: Add validation for child entities (scenarios, trades, payments) to respect parent dealership
14. **TODO**: Add composite indexes on (dealershipId, searchable_field) for customers/deals tables for query performance

**Frontend - Deal Numbers** (Completed Nov 12, 2025):
1. ✅ Display placeholder text "Pending customer" (italic) in deal-worksheet-v2.tsx and deals-list.tsx when dealNumber is null
2. ✅ Customer attachment now uses PATCH /api/deals/:id/attach-customer endpoint - automatically generates deal number and refreshes worksheet via cache invalidation
3. ✅ Deal number prominently displayed in worksheet header with font-mono styling and data-testid

**Sales Tax Improvements**:
1. ✅ Tax jurisdictions sorted alphabetically within each region using localeCompare() in state-tax-selector.tsx
2. ✅ ZIP code lookup already implemented with debounced API call, auto-state detection, and manual override option
3. **TODO**: Add state-of-purchase tax methodology
4. **TODO**: Handle non-reciprocal state tax rules

**Design Consistency** (Completed Nov 12, 2025):
1. ✅ All Card components use consistent rounded-xl border-radius - no custom overrides found across codebase