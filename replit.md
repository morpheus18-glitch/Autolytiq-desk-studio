# NextGen Automotive Desking Platform

## Overview

The NextGen Automotive Desking Platform is a mobile-first desking tool for automotive dealerships, designed to achieve rapid deal closures with a focus on "value and velocity." It enables quick payment quotes (30-45 seconds) and comprehensive deal structuring (3-5 minutes), prioritizing speed, simplicity, and a high-quality UI/UX. The platform features "Deal Studio" with two modes: Quick Build for on-the-lot qualification and Full Build for detailed deal structuring.

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
**Navigation**: Responsive navigation system with desktop sidebar (md+ breakpoints) and mobile bottom navigation (<md). Both implementations maintain feature parity with all navigation items: Dashboard, Deals, Inventory, Add Vehicle, Customers, Analytics, Credit Center, VIN Decoder, Settings, and role-based access control.
**Design Philosophy**: Mobile-first, responsive design with Carbon Design System principles, glassmorphism, smooth transitions, fluid typography, and "Apple/Nike quality" micro-interactions. Emphasizes data primacy, instant feedback, and premium studio aesthetics (gradient headers, neon borders, glow effects, eggshell matte backgrounds, backdrop blur).
**State Management**: Zustand (UI state), TanStack Query (server state with caching).
**Form Management**: React Hook Form with Zod validation.
**Key Design Decisions**: Real-time financial calculations (Decimal.js, precision 20, ROUND_HALF_UP), debounced auto-save, optimistic UI, comprehensive empty states, mobile-optimized components, and GPU-friendly glow effects.

### Backend

**Framework**: Express.js with TypeScript.
**API Pattern**: RESTful API.
**Database ORM**: Drizzle ORM.
**Key Design Decisions**: Dual client-side and server-side financial calculations for performance and integrity, raw body buffering for webhooks.

### Data Storage

**Database**: PostgreSQL (Neon serverless with WebSocket support).
**Schema Design**: UUID primary keys, tables for Users, Customers, Vehicles, Deals (with state machine), Deal Scenarios, Tax Rule Groups, Tax Jurisdictions, Zip Code Lookup, Fee Package Templates, and Audit Log. Monetary values use Decimal type.
**Database Performance**: Comprehensive indexing for multi-tenant queries on Customers, Deals, Vehicles, and Users tables. Enabled `pg_trgm` extension and GIN trigram indexes for text search optimization.
**Tax Jurisdiction Auto-Fill**: Customer ZIP codes automatically map to tax jurisdictions in deal scenarios. The `zipCodeLookup` table links ZIP codes to tax jurisdictions for auto-population. Backend API (`GET /api/tax-jurisdictions/lookup?zipCode=`) performs lookups. Manual override available for edge cases.

**Recent Database Changes (November 16, 2025)**:
- **Deal Scenarios Reciprocity**: Confirmed `deal_scenarios` table includes reciprocity columns (`origin_tax_state`, `origin_tax_amount`, `origin_tax_paid_date`) for cross-state tax credit tracking. These fields are optional/nullable and fully synced between database and schema.
- **Customer Enhancements**: Added 11 new columns to `customers` table: 7 vehicle fields (`current_vehicle_year`, `current_vehicle_make`, `current_vehicle_model`, `current_vehicle_trim`, `current_vehicle_vin`, `current_vehicle_mileage`, `current_vehicle_color`) and 4 trade-in fields (`trade_allowance`, `trade_acv`, `trade_payoff`, `trade_payoff_to`) for quick access to customer vehicle and trade-in information.
- **Customer Vehicles Table**: Created `customer_vehicles` table for garage functionality allowing customers to have multiple vehicles tracked with `is_primary` flag for designating primary vehicle.
- **Customer History Table**: Created `customer_history` table for audit logging with nullable `user_id` (supports system events), action tracking (`create`, `update`, `note_added`, `vehicle_added`, `deal_created`), and indexed timestamp for chronological history viewing.

**Tax Calculation System (AutoTaxEngine)**:
- **Primary Tax Engine**: AutoTaxEngine (backend `/api/tax/calculate` endpoint) is the single source of truth for all tax calculations
- **State/ZIP Auto-Population**: TaxBreakdownForm auto-populates state and ZIP code from customer address data with "From customer" badge indicator
- **Registration State Handling**: Uses `scenario.registrationState` (if set) or falls back to `stateCode` for proper out-of-state deal support and home delivery scenarios
- **Component Integration**: TaxBreakdownForm and TaxBreakdown components exclusively use AutoTaxEngine types (`TaxCalculationResult` from `use-tax-calculation.ts`)
- **Schema Field Mapping**: Trade vehicle uses `allowance` field, scenarios store `totalTax` and `totalFees` from AutoTaxEngine results
- **Reciprocity Support**: AutoTaxEngine handles cross-state tax credits using `originTaxState`, `originTaxAmount`, and `originTaxPaidDate` fields
- **Deprecated**: Legacy `tax-calculator.ts` and ScenarioCalculator tax logic are not used in DealWorksheetV2

**Recent UI/UX Enhancements (November 17, 2025)**:
- **Inventory Card Simplification**: Removed "Quick Quote" and "Full Desk" buttons from inventory vehicle cards. Replaced with single "Start Deal" button that creates a new draft deal and navigates to Deal Worksheet V2 for streamlined workflow.
- **Customer Form - Vehicle & Trade Tab**: Added dedicated tab in customer form sheet for capturing current vehicle information (year, make, model, trim, VIN, mileage, color) and trade-in details (allowance, ACV, payoff, lender). All fields integrate with existing `customers` table schema columns added November 16.
- **Customer Detail Sheet Enhancement**: Added "Vehicle & Trade Information" section in Overview tab displaying customer's current vehicle and trade-in data with conditional rendering. Uses Car icon from lucide-react.
- **Component Files**: Modified `client/src/pages/inventory.tsx`, `client/src/components/customer-form-sheet.tsx`, `client/src/components/customer-detail-sheet.tsx`.

**Critical Issues** (November 18, 2025):
- 🚨 **LEASE & TAX CALCULATIONS ARE INCORRECT**: Lease payment calculations and tax calculations are fundamentally wrong and "literal miles from being correct". See `CALCULATION_ISSUES_CRITICAL.md` for complete details. Affected files:
  - Lease: `client/src/lib/calculations.ts`, `server/calculations.ts`
  - Tax: `client/src/lib/tax-calculator.ts`, `server/shared/autoTaxEngine.ts`, `server/shared/tax-data.ts`
  - **ACTION REQUIRED**: Complete audit and rewrite of calculation logic using industry-standard formulas and state-specific tax rules
  - **BUSINESS IMPACT**: Critical - incorrect calculations lead to incorrect customer quotes and legal liability

**Known Issues**:
- **Deals API - Customer Relation Broken**: Drizzle ORM looking for non-existent `customer.status` column when loading deals with customer relations. Temporary fix: commented out `customer: true` in `getDeal()` and `getDeals()` functions in `server/storage.ts`. Deals now load but customer info missing from deal views. Root cause unknown - no explicit `customer.status` references found in codebase.
- `db:push` workflow blocks on interactive prompt for `lender_programs` table conflict. Workaround: Use manual SQL for schema changes or resolve migration baseline.
- **Replit Environment Memory Constraints**: Platform limited to ~2GB RAM. TypeScript LSP consumes ~814MB, causing Out of Memory (OOM) crashes during heavy operations. Workaround: Kill TypeScript LSP before running dev server (`pkill -f typescript-language-server`) to free ~800MB RAM. Type Check and Build Production workflows may fail with exit code 137 (OOM) but dev server runs successfully. Playwright E2E testing not viable in this tier - defer to higher-memory environment or local machine.

### Authentication and Authorization

**Authentication System**: Session-based using Passport.js (LocalStrategy) with Redis-backed sessions for performance.
**Password Security**: `crypto/scrypt` hashing, timing-safe comparison.
**Account Security**: Account lockout, rate limiting on auth endpoints, Helmet middleware for security headers.
**Role-Based Access**: Four roles (salesperson, sales_manager, finance_manager, admin) with `requireAuth()` and `requireRole()` middleware. Granular permissions and permission-based RBAC (`requirePermission()` middleware).
**User Management**: Admin-only user management UI at `/settings/users` allows creating users with custom roles via POST `/api/admin/users` endpoint. Enforces password complexity (8+ chars, upper/lower/number), validates unique username/email, logs security events, and maintains multi-tenant isolation using dealershipId. Automatically sends welcome email with credentials via Resend when new users are created.
**Master Admin Account**: Username `admin` / Password `Admin123!` / Email `admin@autolytiq.com` (change password after first login)
**Email Configuration**: System emails sent from `support@autolytiq.com` (configured in `server/email-config.ts`). Welcome emails include username and password for new users.

### Email Messaging System

**Email Provider**: Resend integration for transactional and inbound email.
**Webhook Security**: Svix signature verification on `/api/email/webhook/resend` using `RESEND_WEBHOOK_SECRET` from environment.
**Inbound Email Handling**: `email.received` webhook event creates new inbox messages. Multi-tenant routing matches recipient email (`eventData.to`) to `dealershipSettings.email` to ensure proper dealership isolation. Idempotency check on `messageId` prevents duplicate records.
**Outbound Email Tracking**: Webhook handles `email.sent`, `email.delivered`, `email.bounced`, `email.complained`, `email.opened`, `email.clicked` events to update message status in real-time.
**Email Schema**: `emailMessages` table stores all emails with folders (inbox, sent, drafts, trash, archive), read/starred/draft flags, HTML/text bodies, threading support, and Resend status tracking.
**Email Folder Visibility**: Inbox and archive folders show all dealership emails (shared access, including webhook-received emails with null userId). Sent, drafts, trash, and starred folders are user-specific (filtered by userId for privacy). Implemented in `server/email-service.ts` listEmails() function.
**Address Parsing**: Robust `parseEmailAddress` helper handles both string ("Name <email@domain.com>") and structured object `{email, name}` formats from Resend payloads.
**Timestamp Accuracy**: Uses Resend-provided timestamps (`created_at`, `timestamp`) instead of server timestamps for received emails.
**Mobile UX**: All input and textarea fields have `autocapitalize="off"` attribute to prevent mobile keyboards from starting in caps mode (applied globally in base Input and Textarea components).

## External Dependencies

**Database**: Neon serverless PostgreSQL, `@neondatabase/serverless`, Drizzle ORM.
**Session Storage**: Redis Cloud (redis-18908.crce197.us-east-2-1.ec2.cloud.redislabs.com:18908), `redis`, `connect-redis`.
**UI Libraries**: Radix UI, Tailwind CSS, Lucide React, `date-fns`.
**Financial Calculations**: Decimal.js.
**Development Tools**: Vite, TypeScript, Drizzle Kit, ESBuild.