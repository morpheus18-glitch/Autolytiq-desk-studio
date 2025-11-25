-- Autolytiq Database Initialization Script
-- This script runs when PostgreSQL container starts for the first time

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- DEALERSHIPS (Multi-tenant root)
-- ===========================================
CREATE TABLE IF NOT EXISTS dealerships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ===========================================
-- AUTH USERS (Authentication)
-- ===========================================
CREATE TABLE IF NOT EXISTS auth_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) NOT NULL DEFAULT 'SALESPERSON',
    dealership_id UUID REFERENCES dealerships(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    email_verified BOOLEAN NOT NULL DEFAULT false,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email);
CREATE INDEX IF NOT EXISTS idx_auth_users_dealership ON auth_users(dealership_id);

-- ===========================================
-- CUSTOMERS
-- ===========================================
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dealership_id UUID NOT NULL REFERENCES dealerships(id),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address VARCHAR(500),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    credit_score INTEGER,
    notes TEXT,
    source VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_dealership ON customers(dealership_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- ===========================================
-- VEHICLES (Inventory)
-- ===========================================
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dealership_id UUID NOT NULL REFERENCES dealerships(id),
    vin VARCHAR(17) NOT NULL,
    stock_number VARCHAR(50),
    year INTEGER NOT NULL,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    trim VARCHAR(100),
    exterior_color VARCHAR(50),
    interior_color VARCHAR(50),
    mileage INTEGER NOT NULL DEFAULT 0,
    condition VARCHAR(20) NOT NULL DEFAULT 'USED',
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    msrp DECIMAL(12, 2),
    list_price DECIMAL(12, 2) NOT NULL,
    invoice_price DECIMAL(12, 2),
    features JSONB DEFAULT '[]',
    images JSONB DEFAULT '[]',
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(dealership_id, vin)
);

CREATE INDEX IF NOT EXISTS idx_vehicles_dealership ON vehicles(dealership_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles(vin);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);

-- ===========================================
-- DEALS
-- ===========================================
CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dealership_id UUID NOT NULL REFERENCES dealerships(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    salesperson_id UUID REFERENCES auth_users(id),
    type VARCHAR(20) NOT NULL DEFAULT 'CASH',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    sale_price DECIMAL(12, 2) NOT NULL,
    trade_in_value DECIMAL(12, 2),
    trade_in_vehicle TEXT,
    down_payment DECIMAL(12, 2),
    financing_term INTEGER,
    interest_rate DECIMAL(5, 3),
    monthly_payment DECIMAL(12, 2),
    taxes DECIMAL(12, 2),
    fees DECIMAL(12, 2),
    total_price DECIMAL(12, 2),
    notes TEXT,
    closed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deals_dealership ON deals(dealership_id);
CREATE INDEX IF NOT EXISTS idx_deals_customer ON deals(customer_id);
CREATE INDEX IF NOT EXISTS idx_deals_vehicle ON deals(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);

-- ===========================================
-- EMAIL LOGS
-- ===========================================
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dealership_id UUID REFERENCES dealerships(id),
    template_id UUID,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    subject VARCHAR(500) NOT NULL,
    body TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    sent_at TIMESTAMP,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_dealership ON email_logs(dealership_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);

-- ===========================================
-- EMAIL TEMPLATES
-- ===========================================
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dealership_id UUID REFERENCES dealerships(id),
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ===========================================
-- CONFIG SETTINGS
-- ===========================================
CREATE TABLE IF NOT EXISTS config_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dealership_id UUID REFERENCES dealerships(id),
    key VARCHAR(255) NOT NULL,
    value JSONB NOT NULL,
    category VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(dealership_id, key)
);

-- ===========================================
-- SHOWROOM: Workflow Configurations
-- ===========================================
CREATE TABLE IF NOT EXISTS workflow_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dealership_id UUID REFERENCES dealerships(id),
    name VARCHAR(100) NOT NULL,
    stages JSONB NOT NULL DEFAULT '[]',
    auto_triggers JSONB DEFAULT '[]',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(dealership_id, name)
);

-- ===========================================
-- SHOWROOM: Visits (Check-ins)
-- ===========================================
CREATE TABLE IF NOT EXISTS showroom_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dealership_id UUID NOT NULL REFERENCES dealerships(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    salesperson_id UUID REFERENCES auth_users(id),
    vehicle_id UUID REFERENCES vehicles(id),
    stock_number VARCHAR(50),

    check_in_time TIMESTAMP NOT NULL DEFAULT NOW(),
    check_out_time TIMESTAMP,

    status VARCHAR(50) NOT NULL DEFAULT 'CHECKED_IN',
    workflow_stage INTEGER DEFAULT 0,

    source VARCHAR(50),
    appointment_id UUID,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_showroom_visits_dealership ON showroom_visits(dealership_id);
CREATE INDEX IF NOT EXISTS idx_showroom_visits_customer ON showroom_visits(customer_id);
CREATE INDEX IF NOT EXISTS idx_showroom_visits_status ON showroom_visits(status);
CREATE INDEX IF NOT EXISTS idx_showroom_visits_checkin ON showroom_visits(check_in_time);

-- ===========================================
-- SHOWROOM: Activity Timers
-- ===========================================
CREATE TABLE IF NOT EXISTS visit_timers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID NOT NULL REFERENCES showroom_visits(id) ON DELETE CASCADE,
    timer_type VARCHAR(50) NOT NULL,
    start_time TIMESTAMP NOT NULL DEFAULT NOW(),
    end_time TIMESTAMP,
    duration_seconds INTEGER,
    started_by UUID REFERENCES auth_users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visit_timers_visit ON visit_timers(visit_id);
CREATE INDEX IF NOT EXISTS idx_visit_timers_type ON visit_timers(timer_type);

-- ===========================================
-- SHOWROOM: Visit Events (Audit Trail)
-- ===========================================
CREATE TABLE IF NOT EXISTS visit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID NOT NULL REFERENCES showroom_visits(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES auth_users(id),
    previous_value VARCHAR(100),
    new_value VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visit_events_visit ON visit_events(visit_id);
CREATE INDEX IF NOT EXISTS idx_visit_events_type ON visit_events(event_type);

-- ===========================================
-- SHOWROOM: Visit Notes
-- ===========================================
CREATE TABLE IF NOT EXISTS visit_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID NOT NULL REFERENCES showroom_visits(id) ON DELETE CASCADE,
    created_by_id UUID NOT NULL REFERENCES auth_users(id),
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visit_notes_visit ON visit_notes(visit_id);
CREATE INDEX IF NOT EXISTS idx_visit_notes_creator ON visit_notes(created_by_id);

-- ===========================================
-- USER SETTINGS (Personal preferences)
-- ===========================================
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    dealership_id UUID NOT NULL,
    appearance JSONB NOT NULL DEFAULT '{}',
    localization JSONB NOT NULL DEFAULT '{}',
    notifications JSONB NOT NULL DEFAULT '{}',
    dashboard JSONB NOT NULL DEFAULT '{}',
    deals JSONB NOT NULL DEFAULT '{}',
    customers JSONB NOT NULL DEFAULT '{}',
    inventory JSONB NOT NULL DEFAULT '{}',
    showroom JSONB NOT NULL DEFAULT '{}',
    messages JSONB NOT NULL DEFAULT '{}',
    privacy JSONB NOT NULL DEFAULT '{}',
    security JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, dealership_id)
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_dealership ON user_settings(dealership_id);

-- ===========================================
-- DEALERSHIP SETTINGS (Admin-level config)
-- ===========================================
CREATE TABLE IF NOT EXISTS dealership_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dealership_id UUID NOT NULL UNIQUE,
    branding JSONB NOT NULL DEFAULT '{}',
    business_hours JSONB NOT NULL DEFAULT '{}',
    features JSONB NOT NULL DEFAULT '{}',
    defaults JSONB NOT NULL DEFAULT '{}',
    integrations JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dealership_settings_dealership ON dealership_settings(dealership_id);

-- ===========================================
-- SEED DATA: Default Dealership
-- ===========================================
INSERT INTO dealerships (id, name, city, state, is_active)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Demo Dealership',
    'Austin',
    'TX',
    true
) ON CONFLICT DO NOTHING;

-- ===========================================
-- SEED DATA: Admin User (password: admin123)
-- ===========================================
INSERT INTO auth_users (id, email, password_hash, first_name, last_name, role, dealership_id, is_active, email_verified)
VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'admin@autolytiq.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYqKQbXPHpKm',
    'Admin',
    'User',
    'ADMIN',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    true,
    true
) ON CONFLICT DO NOTHING;

-- ===========================================
-- SEED DATA: Demo Salesperson (password: demo123)
-- ===========================================
INSERT INTO auth_users (id, email, password_hash, first_name, last_name, role, dealership_id, is_active, email_verified)
VALUES (
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'demo@autolytiq.com',
    '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
    'Demo',
    'Salesperson',
    'SALESPERSON',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    true,
    true
) ON CONFLICT DO NOTHING;

-- ===========================================
-- SEED DATA: Default Workflow Configuration
-- ===========================================
INSERT INTO workflow_configs (id, dealership_id, name, stages, auto_triggers, is_default)
VALUES (
    'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    NULL,
    'Default Showroom Workflow',
    '[
        {"order": 0, "name": "CHECKED_IN", "label": "Checked In", "color": "info"},
        {"order": 1, "name": "BROWSING", "label": "Browsing", "color": "default"},
        {"order": 2, "name": "TEST_DRIVE", "label": "Test Drive", "color": "warning"},
        {"order": 3, "name": "NEGOTIATING", "label": "Negotiating", "color": "primary"},
        {"order": 4, "name": "PAPERWORK", "label": "Paperwork", "color": "accent"},
        {"order": 5, "name": "CLOSED_WON", "label": "Deal!", "color": "success"},
        {"order": 6, "name": "CLOSED_LOST", "label": "Lost", "color": "destructive"}
    ]'::jsonb,
    '[
        {"from_status": "BROWSING", "after_minutes": 30, "action": "NOTIFY", "notify_role": "MANAGER"},
        {"from_status": "NEGOTIATING", "after_minutes": 60, "action": "NOTIFY", "notify_role": "MANAGER"}
    ]'::jsonb,
    true
) ON CONFLICT DO NOTHING;

-- ===========================================
-- SEED DATA: Demo Customers for Showroom Testing
-- ===========================================
INSERT INTO customers (id, dealership_id, first_name, last_name, email, phone, source)
VALUES
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'John', 'Smith', 'john.smith@email.com', '555-0101', 'WALK_IN'),
    ('e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Sarah', 'Johnson', 'sarah.j@email.com', '555-0102', 'INTERNET'),
    ('e2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Mike', 'Williams', 'mike.w@email.com', '555-0103', 'REFERRAL')
ON CONFLICT DO NOTHING;

-- ===========================================
-- SEED DATA: Demo Vehicles for Showroom Testing
-- ===========================================
INSERT INTO vehicles (id, dealership_id, vin, stock_number, year, make, model, trim, exterior_color, mileage, condition, status, list_price)
VALUES
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '1HGCM82633A123456', 'STK001', 2024, 'Honda', 'Accord', 'Sport', 'Crystal Black', 15, 'NEW', 'AVAILABLE', 32999.00),
    ('f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '1HGCM82633A123457', 'STK002', 2023, 'Toyota', 'Camry', 'XLE', 'Pearl White', 12500, 'USED', 'AVAILABLE', 28500.00),
    ('f2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '1HGCM82633A123458', 'STK003', 2024, 'Ford', 'F-150', 'Lariat', 'Velocity Blue', 0, 'NEW', 'AVAILABLE', 58999.00)
ON CONFLICT DO NOTHING;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Database initialization complete!';
END $$;
