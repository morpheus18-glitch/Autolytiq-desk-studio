# NextGen Automotive Desking Platform

## Overview

The NextGen Automotive Desking Platform is a mobile-first desking tool for automotive dealerships, designed to facilitate rapid deal closing with "value and velocity." It enables salespeople and desk managers to generate payment quotes in 30-45 seconds and structure complete deals in 3-5 minutes. The platform prioritizes speed, simplicity, and an "Apple/Nike quality" UI/UX to ensure quick customer approvals. It supports two main modes: Quick Quote for on-the-lot qualification and Full Desk for comprehensive deal structuring.

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
**Design Philosophy**: Mobile-first, responsive design with Carbon Design System principles, glassmorphism, smooth transitions, fluid typography, and "Apple/Nike quality" micro-interactions. Emphasizes data primacy and instant feedback.
**State Management**: Zustand (UI state), TanStack Query (server state with caching).
**Routing**: Wouter.
**Form Management**: React Hook Form with Zod validation.
**Key Design Decisions**: Real-time financial calculations (Decimal.js, precision 20, ROUND_HALF_UP), debounced auto-save, optimistic UI, comprehensive empty states, and mobile-optimized components.

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