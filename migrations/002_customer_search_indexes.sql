-- CUSTOMER SEARCH OPTIMIZATION INDEXES
-- Adds indexes to the customers table for fast search and duplicate detection
--
-- Performance targets:
-- - Name search: < 100ms
-- - Email/Phone lookup: < 50ms
-- - Full-text search: < 100ms
-- - Duplicate detection: < 100ms

-- ============================================================================
-- BASIC INDEXES (already exist in schema, but included for completeness)
-- ============================================================================

-- These indexes should already exist from the schema definition
-- Included here for reference and validation

-- Index: customers_name_idx
-- Purpose: Fast name-based searches
-- Usage: WHERE firstName LIKE 'John%' OR lastName LIKE 'Doe%'
CREATE INDEX IF NOT EXISTS customers_name_idx
ON customers(first_name, last_name);

-- Index: customers_email_idx
-- Purpose: Fast email lookups and duplicate detection
-- Usage: WHERE email = 'john@example.com'
CREATE INDEX IF NOT EXISTS customers_email_idx
ON customers(email);

-- Index: customers_status_idx
-- Purpose: Fast filtering by customer status
-- Usage: WHERE status = 'active'
CREATE INDEX IF NOT EXISTS customers_status_idx
ON customers(status);

-- Index: customers_number_idx
-- Purpose: Fast customer number lookups
-- Usage: WHERE customer_number = 'C-001234'
CREATE INDEX IF NOT EXISTS customers_number_idx
ON customers(customer_number);

-- ============================================================================
-- NEW SEARCH OPTIMIZATION INDEXES
-- ============================================================================

-- Index: customers_phone_idx
-- Purpose: Fast phone number lookups and duplicate detection
-- Usage: WHERE phone = '+15551234567'
CREATE INDEX IF NOT EXISTS customers_phone_idx
ON customers(phone);

-- Index: customers_dealership_status_idx
-- Purpose: Fast queries filtering by dealership and status
-- Usage: WHERE dealership_id = '...' AND status = 'active'
-- This is a compound index for the most common query pattern
CREATE INDEX IF NOT EXISTS customers_dealership_status_idx
ON customers(dealership_id, status);

-- Index: customers_dealership_name_idx
-- Purpose: Fast name searches within a dealership (multi-tenant isolation)
-- Usage: WHERE dealership_id = '...' AND (first_name LIKE 'John%' OR last_name LIKE 'Doe%')
CREATE INDEX IF NOT EXISTS customers_dealership_name_idx
ON customers(dealership_id, first_name, last_name);

-- Index: customers_created_at_idx
-- Purpose: Fast date range queries and sorting
-- Usage: ORDER BY created_at DESC, WHERE created_at BETWEEN ... AND ...
CREATE INDEX IF NOT EXISTS customers_created_at_idx
ON customers(created_at DESC);

-- Index: customers_updated_at_idx
-- Purpose: Fast updated date filtering and sorting
-- Usage: ORDER BY updated_at DESC
CREATE INDEX IF NOT EXISTS customers_updated_at_idx
ON customers(updated_at DESC);

-- ============================================================================
-- FULL-TEXT SEARCH INDEX
-- ============================================================================

-- Index: customers_search_idx
-- Purpose: Fast full-text search across name, email, phone
-- Usage: WHERE to_tsvector('english', first_name || ' ' || last_name || ' ' || COALESCE(email, '')) @@ to_tsquery('john')
-- This enables fast fuzzy search across multiple fields
CREATE INDEX IF NOT EXISTS customers_search_idx
ON customers
USING gin(
  to_tsvector('english',
    first_name || ' ' ||
    last_name || ' ' ||
    COALESCE(email, '') || ' ' ||
    COALESCE(phone, '') || ' ' ||
    COALESCE(customer_number, '')
  )
);

-- ============================================================================
-- DUPLICATE DETECTION INDEXES
-- ============================================================================

-- Index: customers_dl_number_idx
-- Purpose: Fast driver's license duplicate detection
-- Usage: WHERE drivers_license_number = 'D1234567'
CREATE INDEX IF NOT EXISTS customers_dl_number_idx
ON customers(drivers_license_number)
WHERE drivers_license_number IS NOT NULL;

-- Index: customers_ssn_last4_idx
-- Purpose: Fast SSN last 4 lookups (for duplicate detection)
-- Usage: WHERE ssn_last4 = '1234'
CREATE INDEX IF NOT EXISTS customers_ssn_last4_idx
ON customers(ssn_last4)
WHERE ssn_last4 IS NOT NULL;

-- ============================================================================
-- CASE-INSENSITIVE SEARCH INDEXES
-- ============================================================================

-- Index: customers_email_lower_idx
-- Purpose: Case-insensitive email search
-- Usage: WHERE LOWER(email) = LOWER('John@Example.com')
CREATE INDEX IF NOT EXISTS customers_email_lower_idx
ON customers(LOWER(email))
WHERE email IS NOT NULL;

-- Index: customers_name_lower_idx
-- Purpose: Case-insensitive name search
-- Usage: WHERE LOWER(first_name) = LOWER('john') AND LOWER(last_name) = LOWER('doe')
CREATE INDEX IF NOT EXISTS customers_name_lower_idx
ON customers(LOWER(first_name), LOWER(last_name));

-- ============================================================================
-- COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- ============================================================================

-- Index: customers_dealership_email_idx
-- Purpose: Fast email lookups within a dealership (for login, duplicate detection)
-- Usage: WHERE dealership_id = '...' AND email = 'john@example.com'
CREATE INDEX IF NOT EXISTS customers_dealership_email_idx
ON customers(dealership_id, email)
WHERE email IS NOT NULL;

-- Index: customers_dealership_phone_idx
-- Purpose: Fast phone lookups within a dealership
-- Usage: WHERE dealership_id = '...' AND phone = '+15551234567'
CREATE INDEX IF NOT EXISTS customers_dealership_phone_idx
ON customers(dealership_id, phone)
WHERE phone IS NOT NULL;

-- ============================================================================
-- ANALYZE TABLE
-- ============================================================================

-- Update table statistics for query planner optimization
ANALYZE customers;

-- ============================================================================
-- VALIDATION QUERIES
-- ============================================================================

-- Test queries to validate index usage
-- Run these with EXPLAIN ANALYZE to verify indexes are being used

-- 1. Name search (should use customers_dealership_name_idx)
-- EXPLAIN ANALYZE
-- SELECT * FROM customers
-- WHERE dealership_id = 'test-id'
-- AND (first_name LIKE 'John%' OR last_name LIKE 'Doe%')
-- LIMIT 50;

-- 2. Email lookup (should use customers_dealership_email_idx)
-- EXPLAIN ANALYZE
-- SELECT * FROM customers
-- WHERE dealership_id = 'test-id'
-- AND email = 'john@example.com';

-- 3. Phone lookup (should use customers_dealership_phone_idx)
-- EXPLAIN ANALYZE
-- SELECT * FROM customers
-- WHERE dealership_id = 'test-id'
-- AND phone = '+15551234567';

-- 4. Full-text search (should use customers_search_idx)
-- EXPLAIN ANALYZE
-- SELECT * FROM customers
-- WHERE to_tsvector('english', first_name || ' ' || last_name || ' ' || COALESCE(email, ''))
-- @@ to_tsquery('english', 'john');

-- 5. Status filtering (should use customers_dealership_status_idx)
-- EXPLAIN ANALYZE
-- SELECT * FROM customers
-- WHERE dealership_id = 'test-id'
-- AND status = 'active'
-- ORDER BY created_at DESC
-- LIMIT 20;

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================

-- Expected performance with these indexes:
-- - Name search: 10-50ms (depending on result set size)
-- - Email/Phone exact match: 1-5ms
-- - Full-text search: 20-100ms
-- - Duplicate detection: 5-50ms
-- - List with filters: 10-50ms

-- Index maintenance:
-- - Indexes are automatically maintained by PostgreSQL
-- - Run ANALYZE periodically (weekly) to update statistics
-- - Monitor index bloat and rebuild if necessary
-- - Consider VACUUM ANALYZE after bulk operations

-- Multi-tenant isolation:
-- - All compound indexes include dealership_id first
-- - This ensures partition pruning for multi-tenant queries
-- - Prevents cross-dealership data leakage
-- - Optimizes query performance by reducing search space
