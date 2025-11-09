# NextGen Automotive Desking Platform

## Overview

NextGen Automotive Desking Platform is a comprehensive automotive finance and lease management application designed for dealerships. The system provides real-time payment calculations, multi-scenario deal structuring, complete audit trails, and customer/vehicle lifecycle management. Built with precision finance calculations using Decimal.js, the platform enables salespeople and managers to create, compare, and manage automotive deals with instant feedback and professional-grade accuracy.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18+ with TypeScript and Vite as the build tool

**UI Component System**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling

**Design Philosophy**: Carbon Design System principles adapted for automotive finance, emphasizing data primacy, instant feedback, and professional trust. The design follows Linear's precision and Stripe's data clarity approach.

**State Management**: 
- Zustand with Immer middleware for auto-save tracking, active deal/scenario state, and UI state
- TanStack Query (React Query) for server state management with aggressive caching (staleTime: Infinity)

**Routing**: Wouter for lightweight client-side routing

**Form Management**: React Hook Form with Zod schema validation via @hookform/resolvers

**Key Design Decisions**:
- Real-time calculations using Decimal.js (precision: 20, ROUND_HALF_UP) for financial accuracy
- Auto-save functionality with debounced mutations to prevent data loss
- Instant visual feedback across all dependent fields when inputs change
- Tabular numbers with monospace fonts for perfect vertical alignment
- Responsive layout with sticky headers for data-intensive tables

### Backend Architecture

**Framework**: Express.js with TypeScript

**API Pattern**: RESTful API with conventional CRUD operations

**Database ORM**: Drizzle ORM with Neon serverless PostgreSQL via WebSocket connections

**Rate Limiting**: Express rate limiter (100 requests/minute per IP) applied to all API routes

**Financial Calculations**: Server-side validation using Decimal.js matching frontend precision settings to ensure calculation consistency

**Key Design Decisions**:
- All financial calculations performed both client-side (for instant feedback) and server-side (for validation)
- Raw body buffering for webhook verification support
- Comprehensive logging with request duration tracking for API routes
- Auto-save architecture with optimistic updates and rollback on failure

### Data Storage Solutions

**Database**: PostgreSQL (via Neon serverless with WebSocket support)

**Schema Design**:
- **Users**: Salesperson, sales manager, finance manager, and admin roles
- **Customers**: Full contact information with search indexing on names
- **Vehicles**: Inventory management with unique stock numbers and VINs
- **Trade Vehicles**: Trade-in vehicle information linked to deals
- **Deals**: Core deal entity with state machine (DRAFT → IN_PROGRESS → APPROVED/CANCELLED)
- **Deal Scenarios**: Multiple financing/leasing scenarios per deal for comparison
- **Tax Jurisdictions**: Multi-jurisdictional tax rates (state, county, city, local)
- **Audit Log**: Microsecond-level change tracking with user attribution and field-level changes

**Key Design Decisions**:
- UUID primary keys across all tables for distributed system compatibility
- JSONB fields for flexible dealer fees and accessories storage
- Comprehensive indexing on search fields (customer names, vehicle stock numbers)
- Decimal type for all monetary values to prevent floating-point precision errors
- Timestamp fields for created_at/updated_at with automatic defaultNow()

### Authentication and Authorization

**Current State**: No authentication system implemented (ready for future integration)

**Role-Based Access**: User roles defined in schema (salesperson, sales_manager, finance_manager, admin) but not enforced

**Session Management**: connect-pg-simple configured for PostgreSQL session storage (infrastructure ready)

### External Dependencies

**Database**: 
- Neon serverless PostgreSQL
- Connection via @neondatabase/serverless with WebSocket support
- Drizzle ORM for type-safe database queries

**UI Libraries**:
- Radix UI primitives for accessible component foundations
- Tailwind CSS for utility-first styling
- Lucide React for icons
- date-fns for date formatting and manipulation

**Financial Calculations**:
- Decimal.js for arbitrary-precision decimal arithmetic
- Custom calculation engine for finance/lease payments, amortization schedules, and sales tax

**Development Tools**:
- Vite for fast development and optimized production builds
- TypeScript for type safety across frontend and backend
- Drizzle Kit for database migrations
- ESBuild for server bundling

**Key Architectural Principles**:
- Shared schema types between frontend and backend via @shared directory
- Type-safe API contracts using Zod schemas derived from Drizzle tables
- Collocated route handlers and storage layer for maintainability
- Separation of calculation logic for testability and reuse
- Real-time collaborative features prepared (audit trail, state tracking)