-- Migration: Add Performance Indexes for Multi-Tenant Queries
-- Purpose: Improve query performance for common dealership-filtered operations
-- Risk: Low (CONCURRENTLY keyword prevents table locks)

-- ============================================================================
-- CUSTOMERS TABLE INDEXES
-- ============================================================================
-- Optimize: List customers by status within a dealership
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_dealership_status
  ON customers(dealership_id, status);

-- Optimize: Recent customers within a dealership (sorted by creation date)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_dealership_created
  ON customers(dealership_id, created_at DESC);

-- ============================================================================
-- DEALS TABLE INDEXES
-- ============================================================================
-- Optimize: Filter deals by state within a dealership (pipeline views)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_dealership_state
  ON deals(dealership_id, deal_state);

-- Optimize: Salesperson dashboards - find all deals for a specific salesperson
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_salesperson
  ON deals(salesperson_id);

-- ============================================================================
-- VEHICLES TABLE INDEXES
-- ============================================================================
-- Optimize: Filter inventory by status within a dealership
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_dealership_status
  ON vehicles(dealership_id, status);

-- Optimize: Filter inventory by condition within a dealership
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_dealership_condition
  ON vehicles(dealership_id, condition);

-- ============================================================================
-- EMAIL MESSAGES TABLE INDEXES
-- ============================================================================
-- Optimize: Unread count queries within a dealership
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_messages_dealership_read
  ON email_messages(dealership_id, is_read);

-- ============================================================================
-- APPOINTMENTS TABLE INDEXES
-- ============================================================================
-- Optimize: Calendar views - appointments for a user by date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_user_scheduled
  ON appointments(user_id, scheduled_at);

-- ============================================================================
-- RATE REQUESTS TABLE INDEXES
-- ============================================================================
-- Optimize: Approval workflow - filter by deal and status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rate_requests_deal_status
  ON rate_requests(deal_id, status);

-- ============================================================================
-- APPROVED LENDERS TABLE INDEXES
-- ============================================================================
-- Optimize: Lender selection - filter by request and approval status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approved_lenders_request_status
  ON approved_lenders(rate_request_id, approval_status);

-- ============================================================================
-- TRADE VEHICLES - ADD MISSING FOREIGN KEY
-- ============================================================================
-- Ensure referential integrity for trade vehicles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'trade_vehicles_deal_id_fk'
  ) THEN
    ALTER TABLE trade_vehicles
      ADD CONSTRAINT trade_vehicles_deal_id_fk
      FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- CLEANUP: Remove redundant indexes (if they exist)
-- ============================================================================
-- Note: The zip_to_local_tax_rates table has redundant indexes
-- Keep the unique constraint which creates an implicit index
DROP INDEX IF EXISTS zip_to_local_tax_rates_zip_code_idx;
