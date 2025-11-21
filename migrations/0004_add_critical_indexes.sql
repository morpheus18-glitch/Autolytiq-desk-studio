-- Migration: Add Critical Performance Indexes
-- Description: Add indexes for common query patterns and improve multi-tenant filtering performance
-- Created: 2025-11-20
-- Author: Database Architect

-- ============================================================================
-- MULTI-TENANT ISOLATION INDEXES
-- These indexes are CRITICAL for performance in multi-tenant environments
-- Every query should filter by dealership_id to prevent cross-tenant data leaks
-- ============================================================================

-- Users table: dealership_id filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_dealership_id
ON users(dealership_id)
WHERE is_active = true;

-- Customers table: dealership_id filtering and search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_dealership_id
ON customers(dealership_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_search
ON customers(dealership_id, last_name, first_name);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_email
ON customers(dealership_id, email)
WHERE email IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_phone
ON customers(dealership_id, phone)
WHERE phone IS NOT NULL;

-- Vehicles table: dealership_id filtering and inventory queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_dealership_id
ON vehicles(dealership_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_status
ON vehicles(dealership_id, status)
WHERE status IN ('available', 'pending');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_stock_lookup
ON vehicles(dealership_id, stock_number);

-- Deals table: dealership_id filtering and common lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_dealership_id
ON deals(dealership_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_state
ON deals(dealership_id, deal_state);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_salesperson
ON deals(dealership_id, salesperson_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_customer
ON deals(dealership_id, customer_id)
WHERE customer_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_created_at
ON deals(dealership_id, created_at DESC);

-- ============================================================================
-- FOREIGN KEY RELATIONSHIP INDEXES
-- Improve JOIN performance for relational queries
-- ============================================================================

-- Deal scenarios
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deal_scenarios_deal_id
ON deal_scenarios(deal_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_active_scenario
ON deals(active_scenario_id)
WHERE active_scenario_id IS NOT NULL;

-- Customer relationships
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_notes_customer_id
ON customer_notes(customer_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_vehicles_customer_id
ON customer_vehicles(customer_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_history_customer_id
ON customer_history(customer_id, timestamp DESC);

-- Appointments
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_dealership_date
ON appointments(dealership_id, scheduled_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_user
ON appointments(dealership_id, user_id, scheduled_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_customer
ON appointments(dealership_id, customer_id, scheduled_at);

-- ============================================================================
-- AUDIT LOG INDEXES
-- Critical for compliance and debugging
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_deal_id
ON audit_log(deal_id, timestamp DESC)
WHERE deal_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_user_id
ON audit_log(user_id, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_entity
ON audit_log(entity_type, entity_id, timestamp DESC);

-- ============================================================================
-- TAX JURISDICTION INDEXES
-- Improve tax calculation performance
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tax_jurisdictions_state
ON tax_jurisdictions(state);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tax_jurisdictions_lookup
ON tax_jurisdictions(state, county, city);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_zip_code_lookup_zip
ON zip_code_lookup(zip_code);

-- ============================================================================
-- EMAIL SYSTEM INDEXES
-- Improve email query performance
-- ============================================================================

-- Composite indexes for common email queries (most already exist in schema)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_messages_dealership_folder
ON email_messages(dealership_id, folder, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_messages_unread
ON email_messages(dealership_id, is_read, created_at DESC)
WHERE is_read = false;

-- ============================================================================
-- SEQUENCE TABLES INDEXES
-- Ensure atomic counter operations
-- ============================================================================

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_deal_number_seq_dealership
ON deal_number_sequences(dealership_id);

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_settings_dealership
ON dealership_stock_settings(dealership_id);

-- ============================================================================
-- LENDER & FINANCING INDEXES
-- Improve rate shopping performance
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rate_requests_deal
ON rate_requests(deal_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approved_lenders_request
ON approved_lenders(rate_request_id, selected DESC, approval_status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lender_programs_lender
ON lender_programs(lender_id)
WHERE active = true;

-- ============================================================================
-- PARTIAL INDEXES FOR COMMON FILTERS
-- Smaller, faster indexes for specific use cases
-- ============================================================================

-- Active deals only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_active
ON deals(dealership_id, created_at DESC)
WHERE deal_state NOT IN ('CANCELLED', 'DELIVERED');

-- Pending vehicles (in deals but not sold)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_pending
ON vehicles(dealership_id, stock_number)
WHERE status = 'pending';

-- Unverified users
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_unverified
ON users(dealership_id, created_at)
WHERE email_verified = false;

-- ============================================================================
-- TEXT SEARCH INDEXES (GIN)
-- For full-text search on descriptions and notes
-- ============================================================================

-- Vehicle search (if using full-text search in future)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_search_text
-- ON vehicles USING gin(to_tsvector('english', coalesce(make, '') || ' ' || coalesce(model, '') || ' ' || coalesce(trim, '')));

-- ============================================================================
-- ANALYSIS AND RECOMMENDATIONS
-- ============================================================================

-- After creating indexes, analyze tables to update statistics
ANALYZE users;
ANALYZE customers;
ANALYZE vehicles;
ANALYZE deals;
ANALYZE deal_scenarios;
ANALYZE audit_log;
ANALYZE tax_jurisdictions;
ANALYZE email_messages;

-- Query to check index usage (run this after application has been running):
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- ORDER BY idx_scan DESC;

-- Query to find unused indexes (run after 7+ days):
-- SELECT schemaname, tablename, indexname
-- FROM pg_stat_user_indexes
-- WHERE idx_scan = 0 AND indexname NOT LIKE 'pg_toast%';
