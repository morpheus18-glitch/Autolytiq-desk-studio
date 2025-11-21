-- VEHICLE MODULE DATABASE SCHEMA
-- Complete schema for vehicle/inventory management

-- ============================================================================
-- VEHICLES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS vehicles (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID NOT NULL,

  -- Unique identifiers
  vin VARCHAR(17) NOT NULL,
  stock_number VARCHAR(20) NOT NULL,

  -- Basic information
  year INTEGER NOT NULL CHECK (year >= 1900 AND year <= EXTRACT(YEAR FROM CURRENT_DATE) + 2),
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  trim VARCHAR(100),

  -- Classification
  type VARCHAR(20) NOT NULL CHECK (type IN ('new', 'used', 'certified')),
  body_style VARCHAR(20) NOT NULL CHECK (body_style IN ('sedan', 'suv', 'truck', 'coupe', 'convertible', 'van', 'wagon', 'hatchback', 'other')),

  -- Specifications
  exterior_color VARCHAR(50) NOT NULL,
  interior_color VARCHAR(50) NOT NULL,
  transmission VARCHAR(20) NOT NULL CHECK (transmission IN ('automatic', 'manual', 'cvt', 'dual-clutch', 'other')),
  drivetrain VARCHAR(10) NOT NULL CHECK (drivetrain IN ('fwd', 'rwd', 'awd', '4wd')),
  fuel_type VARCHAR(20) NOT NULL CHECK (fuel_type IN ('gasoline', 'diesel', 'hybrid', 'plug-in-hybrid', 'electric', 'flex-fuel', 'other')),
  engine VARCHAR(100),
  cylinders INTEGER CHECK (cylinders >= 2 AND cylinders <= 16),
  displacement VARCHAR(20),

  -- Condition
  mileage INTEGER NOT NULL CHECK (mileage >= 0),
  condition VARCHAR(20) CHECK (condition IN ('excellent', 'good', 'fair', 'poor')),

  -- Pricing
  cost DECIMAL(10, 2) NOT NULL CHECK (cost >= 0),
  msrp DECIMAL(10, 2) CHECK (msrp >= 0),
  asking_price DECIMAL(10, 2) NOT NULL CHECK (asking_price >= 0),
  internet_price DECIMAL(10, 2) CHECK (internet_price >= 0),

  -- Status and location
  status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'in-deal', 'sold', 'service', 'wholesale', 'unavailable')),
  location VARCHAR(100) NOT NULL DEFAULT 'main-lot',
  reserved_until TIMESTAMP,
  reserved_for_deal_id UUID,

  -- Additional information
  features JSONB DEFAULT '[]'::jsonb,
  photos JSONB DEFAULT '[]'::jsonb,
  description TEXT,

  -- Metadata
  notes TEXT,
  internal_notes TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Acquisition
  acquired_date TIMESTAMP,
  acquired_from VARCHAR(100),
  floor_plan_provider VARCHAR(100),
  floor_plan_date TIMESTAMP,

  -- Sale information
  sold_date TIMESTAMP,
  sold_price DECIMAL(10, 2),
  sold_to_deal_id UUID,

  -- System timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP,

  -- Constraints
  CONSTRAINT unique_vin_per_dealership UNIQUE (dealership_id, vin),
  CONSTRAINT unique_stock_number_per_dealership UNIQUE (dealership_id, stock_number),
  CONSTRAINT valid_reservation CHECK (
    (status = 'reserved' AND reserved_until IS NOT NULL AND reserved_for_deal_id IS NOT NULL)
    OR (status != 'reserved')
  ),
  CONSTRAINT valid_sold_data CHECK (
    (status = 'sold' AND sold_date IS NOT NULL)
    OR (status != 'sold')
  )
);

-- ============================================================================
-- STOCK NUMBER SEQUENCES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS stock_number_sequences (
  dealership_id UUID PRIMARY KEY,
  last_number INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- VEHICLE HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS vehicle_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'created',
    'status_change',
    'price_change',
    'location_change',
    'reserved',
    'unreserved',
    'sold',
    'service',
    'photo_added',
    'photo_removed',
    'updated',
    'note_added',
    'deleted'
  )),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  user_id UUID,
  old_value TEXT,
  new_value TEXT,
  notes TEXT,
  metadata JSONB,

  -- Foreign key
  CONSTRAINT fk_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary lookups
CREATE INDEX IF NOT EXISTS idx_vehicles_dealership ON vehicles(dealership_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles(dealership_id, vin) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_stock ON vehicles(dealership_id, stock_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(dealership_id, status) WHERE deleted_at IS NULL;

-- Search and filtering
CREATE INDEX IF NOT EXISTS idx_vehicles_make_model ON vehicles(dealership_id, make, model) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_year ON vehicles(dealership_id, year) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(dealership_id, type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_body_style ON vehicles(dealership_id, body_style) WHERE deleted_at IS NULL;

-- Price filtering
CREATE INDEX IF NOT EXISTS idx_vehicles_asking_price ON vehicles(dealership_id, asking_price) WHERE deleted_at IS NULL;

-- Mileage filtering
CREATE INDEX IF NOT EXISTS idx_vehicles_mileage ON vehicles(dealership_id, mileage) WHERE deleted_at IS NULL;

-- Location filtering
CREATE INDEX IF NOT EXISTS idx_vehicles_location ON vehicles(dealership_id, location) WHERE deleted_at IS NULL;

-- Date filtering
CREATE INDEX IF NOT EXISTS idx_vehicles_acquired_date ON vehicles(dealership_id, acquired_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_created_at ON vehicles(dealership_id, created_at) WHERE deleted_at IS NULL;

-- Full-text search on make, model, trim
CREATE INDEX IF NOT EXISTS idx_vehicles_search ON vehicles
  USING gin(to_tsvector('english', make || ' ' || model || ' ' || COALESCE(trim, '')))
  WHERE deleted_at IS NULL;

-- Tags search (GIN index for array operations)
CREATE INDEX IF NOT EXISTS idx_vehicles_tags ON vehicles USING gin(tags) WHERE deleted_at IS NULL;

-- Reserved vehicles
CREATE INDEX IF NOT EXISTS idx_vehicles_reserved ON vehicles(dealership_id, reserved_for_deal_id)
  WHERE status = 'reserved' AND deleted_at IS NULL;

-- Sold vehicles
CREATE INDEX IF NOT EXISTS idx_vehicles_sold_deal ON vehicles(dealership_id, sold_to_deal_id)
  WHERE status = 'sold' AND deleted_at IS NULL;

-- Vehicle history indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_history_vehicle ON vehicle_history(vehicle_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_history_event_type ON vehicle_history(vehicle_id, event_type);
CREATE INDEX IF NOT EXISTS idx_vehicle_history_user ON vehicle_history(user_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_vehicle_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vehicle_update_timestamp
  BEFORE UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_timestamp();

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to get available vehicles count for dealership
CREATE OR REPLACE FUNCTION get_available_vehicle_count(p_dealership_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM vehicles
    WHERE dealership_id = p_dealership_id
      AND status = 'available'
      AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get total inventory value for dealership
CREATE OR REPLACE FUNCTION get_total_inventory_value(p_dealership_id UUID)
RETURNS DECIMAL AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(asking_price), 0)
    FROM vehicles
    WHERE dealership_id = p_dealership_id
      AND status IN ('available', 'reserved', 'in-deal')
      AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get vehicles by make for dealership
CREATE OR REPLACE FUNCTION get_vehicles_by_make(p_dealership_id UUID)
RETURNS TABLE(make VARCHAR, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT v.make, COUNT(*)
  FROM vehicles v
  WHERE v.dealership_id = p_dealership_id
    AND v.deleted_at IS NULL
  GROUP BY v.make
  ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View for available inventory
CREATE OR REPLACE VIEW available_inventory AS
SELECT
  v.*,
  EXTRACT(DAY FROM NOW() - v.created_at) AS days_in_inventory,
  (v.asking_price - v.cost) AS potential_profit,
  CASE
    WHEN EXTRACT(DAY FROM NOW() - v.created_at) <= 7 THEN 'new'
    WHEN EXTRACT(DAY FROM NOW() - v.created_at) <= 30 THEN 'fresh'
    WHEN EXTRACT(DAY FROM NOW() - v.created_at) <= 90 THEN 'aging'
    ELSE 'old'
  END AS age_category
FROM vehicles v
WHERE v.status = 'available'
  AND v.deleted_at IS NULL;

-- View for inventory summary by dealership
CREATE OR REPLACE VIEW inventory_summary AS
SELECT
  dealership_id,
  COUNT(*) AS total_vehicles,
  COUNT(CASE WHEN status = 'available' THEN 1 END) AS available_count,
  COUNT(CASE WHEN status = 'sold' THEN 1 END) AS sold_count,
  SUM(asking_price) AS total_value,
  AVG(asking_price) AS avg_price,
  AVG(mileage) AS avg_mileage,
  AVG(EXTRACT(DAY FROM NOW() - created_at)) AS avg_days_in_inventory
FROM vehicles
WHERE deleted_at IS NULL
GROUP BY dealership_id;

-- ============================================================================
-- SAMPLE DATA (for development/testing)
-- ============================================================================

-- Insert sample stock number sequence
-- INSERT INTO stock_number_sequences (dealership_id, last_number)
-- VALUES ('00000000-0000-0000-0000-000000000000', 0)
-- ON CONFLICT (dealership_id) DO NOTHING;

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

-- Grant appropriate permissions (adjust based on your user setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON vehicles TO app_user;
-- GRANT SELECT, INSERT, UPDATE ON stock_number_sequences TO app_user;
-- GRANT SELECT, INSERT ON vehicle_history TO app_user;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE vehicles IS 'Vehicle inventory table - core asset tracking for dealerships';
COMMENT ON TABLE stock_number_sequences IS 'Atomic sequence generator for unique stock numbers per dealership';
COMMENT ON TABLE vehicle_history IS 'Audit log of all vehicle changes';

COMMENT ON COLUMN vehicles.vin IS 'Vehicle Identification Number (17 characters, ISO 3779 compliant)';
COMMENT ON COLUMN vehicles.stock_number IS 'Dealership stock number (unique per dealership)';
COMMENT ON COLUMN vehicles.cost IS 'Dealer cost/invoice price';
COMMENT ON COLUMN vehicles.asking_price IS 'Current asking price';
COMMENT ON COLUMN vehicles.internet_price IS 'Online advertised price (if different)';
COMMENT ON COLUMN vehicles.status IS 'Current vehicle status in inventory lifecycle';
COMMENT ON COLUMN vehicles.location IS 'Physical location (lot, service, display, etc.)';
COMMENT ON COLUMN vehicles.reserved_until IS 'Reservation expiry timestamp';
COMMENT ON COLUMN vehicles.reserved_for_deal_id IS 'Associated deal ID when reserved';
