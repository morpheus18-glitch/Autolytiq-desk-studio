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