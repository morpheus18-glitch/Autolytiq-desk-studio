--
-- PostgreSQL database dump
--

\restrict 94TAOxrqTPdMlymWIJWpfJSmS3u3RJaX0qoltXI7efv7cro4QVFFeQSk4oBPpx8

-- Dumped from database version 16.9 (415ebe8)
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA public;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: appointments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.appointments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    user_id uuid NOT NULL,
    dealership_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    appointment_type text DEFAULT 'consultation'::text NOT NULL,
    scheduled_at timestamp without time zone NOT NULL,
    duration integer DEFAULT 30 NOT NULL,
    end_time timestamp without time zone,
    status text DEFAULT 'scheduled'::text NOT NULL,
    location text DEFAULT 'dealership'::text,
    deal_id uuid,
    vehicle_id uuid,
    reminder_sent boolean DEFAULT false NOT NULL,
    confirmation_sent boolean DEFAULT false NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.appointments OWNER TO neondb_owner;

--
-- Name: approved_lenders; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.approved_lenders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rate_request_id uuid NOT NULL,
    lender_id uuid NOT NULL,
    program_id uuid,
    approval_status text NOT NULL,
    approval_amount numeric(12,2) NOT NULL,
    apr numeric(5,3) NOT NULL,
    buy_rate numeric(5,3) NOT NULL,
    dealer_reserve numeric(5,3) DEFAULT 0.00 NOT NULL,
    flat_fee numeric(12,2) DEFAULT 0.00 NOT NULL,
    term integer NOT NULL,
    monthly_payment numeric(12,2) NOT NULL,
    total_finance_charge numeric(12,2) NOT NULL,
    total_of_payments numeric(12,2) NOT NULL,
    ltv numeric(5,2) NOT NULL,
    dti numeric(5,2),
    pti numeric(5,2),
    stipulations jsonb DEFAULT '[]'::jsonb NOT NULL,
    special_conditions text,
    approval_score integer,
    approval_likelihood text,
    incentives jsonb DEFAULT '[]'::jsonb NOT NULL,
    special_rate boolean DEFAULT false NOT NULL,
    selected boolean DEFAULT false NOT NULL,
    selected_at timestamp without time zone,
    selected_by uuid,
    offer_expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.approved_lenders OWNER TO neondb_owner;

--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deal_id uuid,
    scenario_id uuid,
    user_id uuid NOT NULL,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    field_name text,
    old_value text,
    new_value text,
    metadata jsonb,
    "timestamp" timestamp(6) without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_log OWNER TO neondb_owner;

--
-- Name: customer_history; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.customer_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    user_id uuid,
    action text NOT NULL,
    entity_type text NOT NULL,
    field_name text,
    old_value text,
    new_value text,
    description text,
    metadata jsonb,
    "timestamp" timestamp(6) without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.customer_history OWNER TO neondb_owner;

--
-- Name: customer_notes; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.customer_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    user_id uuid NOT NULL,
    dealership_id uuid NOT NULL,
    content text NOT NULL,
    note_type text DEFAULT 'general'::text,
    is_important boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deal_id uuid
);


ALTER TABLE public.customer_notes OWNER TO neondb_owner;

--
-- Name: customer_vehicles; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.customer_vehicles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    year integer NOT NULL,
    make text NOT NULL,
    model text NOT NULL,
    "trim" text,
    vin text,
    mileage integer,
    color text,
    notes text,
    is_primary boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.customer_vehicles OWNER TO neondb_owner;

--
-- Name: customers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text,
    phone text,
    address text,
    city text,
    state text,
    zip_code text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    customer_number text,
    dealership_id uuid DEFAULT 'fa136a38-696a-47b6-ac26-c184cc6ebe46'::uuid NOT NULL,
    date_of_birth timestamp without time zone,
    drivers_license_number character varying,
    drivers_license_state character varying,
    notes text,
    ssn_last4 character varying,
    employer text,
    occupation text,
    monthly_income numeric(12,2),
    credit_score integer,
    preferred_contact_method text,
    marketing_opt_in boolean DEFAULT false NOT NULL,
    photo_url text,
    license_image_url text,
    current_vehicle_year integer,
    current_vehicle_make text,
    current_vehicle_model text,
    current_vehicle_trim text,
    current_vehicle_vin text,
    current_vehicle_mileage integer,
    current_vehicle_color text,
    trade_allowance numeric(12,2),
    trade_acv numeric(12,2),
    trade_payoff numeric(12,2),
    trade_payoff_to text,
    status text DEFAULT 'prospect'::text NOT NULL
);


ALTER TABLE public.customers OWNER TO neondb_owner;

--
-- Name: deal_number_sequences; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.deal_number_sequences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dealership_id uuid NOT NULL,
    current_sequence integer DEFAULT 0 NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.deal_number_sequences OWNER TO neondb_owner;

--
-- Name: deal_scenarios; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.deal_scenarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deal_id uuid NOT NULL,
    scenario_type text NOT NULL,
    name text NOT NULL,
    vehicle_price numeric(12,2) NOT NULL,
    down_payment numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    apr numeric(6,4) DEFAULT '0'::numeric,
    term integer DEFAULT 0,
    money_factor numeric(8,6) DEFAULT '0'::numeric,
    residual_value numeric(12,2) DEFAULT '0'::numeric,
    residual_percent numeric(5,2) DEFAULT '0'::numeric,
    trade_allowance numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    trade_payoff numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    dealer_fees jsonb DEFAULT '[]'::jsonb NOT NULL,
    accessories jsonb DEFAULT '[]'::jsonb NOT NULL,
    tax_jurisdiction_id uuid,
    total_tax numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    total_fees numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    amount_financed numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    monthly_payment numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    total_cost numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    aftermarket_products jsonb DEFAULT '[]'::jsonb NOT NULL,
    cash_due_at_signing numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    vehicle_id uuid,
    trade_vehicle_id uuid,
    is_quick_quote boolean DEFAULT false NOT NULL,
    origin_tax_state text,
    origin_tax_amount numeric(12,2),
    origin_tax_paid_date timestamp without time zone,
    msrp numeric(12,2) DEFAULT 0,
    selling_price numeric(12,2) DEFAULT 0,
    acquisition_fee numeric(12,2) DEFAULT 0,
    acquisition_fee_capitalized boolean DEFAULT true,
    doc_fee_capitalized boolean DEFAULT true,
    government_fees jsonb DEFAULT '[]'::jsonb,
    cash_down numeric(12,2) DEFAULT 0,
    manufacturer_rebate numeric(12,2) DEFAULT 0,
    other_incentives numeric(12,2) DEFAULT 0
);


ALTER TABLE public.deal_scenarios OWNER TO neondb_owner;

--
-- Name: dealership_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.dealership_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dealership_id text DEFAULT 'default'::text NOT NULL,
    dealership_name text NOT NULL,
    address text,
    city text,
    state text,
    zip_code text,
    phone text,
    email text,
    website text,
    logo text,
    primary_color text DEFAULT '#0066cc'::text,
    default_tax_rate numeric(5,4) DEFAULT 0.0825,
    doc_fee numeric(10,2) DEFAULT 299.00,
    timezone text DEFAULT 'America/New_York'::text,
    currency text DEFAULT 'USD'::text,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.dealership_settings OWNER TO neondb_owner;

--
-- Name: dealership_stock_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.dealership_stock_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dealership_id uuid NOT NULL,
    prefix text DEFAULT 'STK'::text NOT NULL,
    use_year_prefix boolean DEFAULT true NOT NULL,
    padding_length integer DEFAULT 6 NOT NULL,
    current_counter integer DEFAULT 1 NOT NULL,
    format_preview text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.dealership_stock_settings OWNER TO neondb_owner;

--
-- Name: deals; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.deals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deal_number text,
    dealership_id uuid DEFAULT gen_random_uuid() NOT NULL,
    salesperson_id uuid NOT NULL,
    sales_manager_id uuid,
    finance_manager_id uuid,
    customer_id uuid,
    vehicle_id uuid,
    trade_vehicle_id uuid,
    deal_state text DEFAULT 'DRAFT'::text NOT NULL,
    active_scenario_id uuid,
    locked_by uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    customer_attached_at timestamp without time zone
);


ALTER TABLE public.deals OWNER TO neondb_owner;

--
-- Name: email_attachments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.email_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email_message_id uuid NOT NULL,
    filename text NOT NULL,
    content_type text NOT NULL,
    size integer NOT NULL,
    url text,
    storage_key text,
    is_inline boolean DEFAULT false NOT NULL,
    content_id text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.email_attachments OWNER TO neondb_owner;

--
-- Name: email_folders; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.email_folders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dealership_id uuid NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    icon text,
    color text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.email_folders OWNER TO neondb_owner;

--
-- Name: email_labels; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.email_labels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dealership_id uuid NOT NULL,
    user_id uuid,
    name text NOT NULL,
    color text DEFAULT '#3b82f6'::text NOT NULL,
    icon text,
    show_in_sidebar boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.email_labels OWNER TO neondb_owner;

--
-- Name: email_message_labels; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.email_message_labels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email_message_id uuid NOT NULL,
    label_id uuid NOT NULL,
    is_auto_applied boolean DEFAULT false NOT NULL,
    applied_by uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.email_message_labels OWNER TO neondb_owner;

--
-- Name: email_messages; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.email_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dealership_id uuid NOT NULL,
    user_id uuid,
    message_id text,
    thread_id text,
    in_reply_to text,
    from_address text NOT NULL,
    from_name text,
    to_addresses jsonb DEFAULT '[]'::jsonb NOT NULL,
    cc_addresses jsonb DEFAULT '[]'::jsonb,
    bcc_addresses jsonb DEFAULT '[]'::jsonb,
    reply_to text,
    subject text NOT NULL,
    html_body text,
    text_body text,
    folder text DEFAULT 'inbox'::text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    is_starred boolean DEFAULT false NOT NULL,
    is_draft boolean DEFAULT false NOT NULL,
    resend_id text,
    resend_status text,
    customer_id uuid,
    deal_id uuid,
    sent_at timestamp without time zone,
    received_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    is_spam boolean DEFAULT false NOT NULL,
    spam_score numeric(5,2)
);


ALTER TABLE public.email_messages OWNER TO neondb_owner;

--
-- Name: email_rules; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.email_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dealership_id uuid NOT NULL,
    user_id uuid,
    name text NOT NULL,
    description text,
    priority integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    conditions jsonb DEFAULT '{}'::jsonb NOT NULL,
    actions jsonb DEFAULT '{}'::jsonb NOT NULL,
    match_count integer DEFAULT 0 NOT NULL,
    last_matched_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.email_rules OWNER TO neondb_owner;

--
-- Name: fee_package_templates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.fee_package_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    category text DEFAULT 'custom'::text NOT NULL,
    dealership_id uuid,
    created_by uuid NOT NULL,
    updated_by uuid,
    display_order integer DEFAULT 0 NOT NULL,
    dealer_fees jsonb DEFAULT '[]'::jsonb NOT NULL,
    accessories jsonb DEFAULT '[]'::jsonb NOT NULL,
    aftermarket_products jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.fee_package_templates OWNER TO neondb_owner;

--
-- Name: lender_programs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.lender_programs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lender_id uuid NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    vehicle_type text NOT NULL,
    min_term integer DEFAULT 12 NOT NULL,
    max_term integer DEFAULT 72 NOT NULL,
    available_terms jsonb DEFAULT '[]'::jsonb NOT NULL,
    rate_tiers jsonb DEFAULT '[]'::jsonb NOT NULL,
    min_credit_score integer DEFAULT 580 NOT NULL,
    max_ltv numeric(5,2) DEFAULT 120.00 NOT NULL,
    max_dti numeric(5,2) DEFAULT 45.00 NOT NULL,
    min_down_percent numeric(5,2) DEFAULT 0.00 NOT NULL,
    requirements jsonb DEFAULT '[]'::jsonb NOT NULL,
    incentives jsonb DEFAULT '[]'::jsonb NOT NULL,
    origination_fee numeric(12,2) DEFAULT 0.00 NOT NULL,
    max_advance numeric(12,2),
    money_factor numeric(8,6),
    residual_percents jsonb DEFAULT '{}'::jsonb NOT NULL,
    acquisition_fee numeric(12,2),
    active boolean DEFAULT true NOT NULL,
    effective_date timestamp without time zone DEFAULT now() NOT NULL,
    expiration_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lender_programs OWNER TO neondb_owner;

--
-- Name: lenders; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.lenders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    logo text,
    type text NOT NULL,
    min_credit_score integer DEFAULT 300 NOT NULL,
    max_ltv numeric(5,2) DEFAULT 125.00 NOT NULL,
    max_dti numeric(5,2) DEFAULT 50.00 NOT NULL,
    states jsonb DEFAULT '[]'::jsonb NOT NULL,
    active boolean DEFAULT true NOT NULL,
    dealer_reserve_max_bps integer DEFAULT 250 NOT NULL,
    flat_max_bps integer DEFAULT 200 NOT NULL,
    api_endpoint text,
    api_key text,
    routing_code text,
    max_finance_amount numeric(12,2),
    min_finance_amount numeric(12,2) DEFAULT 5000.00 NOT NULL,
    max_term integer DEFAULT 84 NOT NULL,
    min_term integer DEFAULT 12 NOT NULL,
    new_vehicle_max_age integer DEFAULT 1 NOT NULL,
    used_vehicle_max_age integer DEFAULT 10 NOT NULL,
    used_vehicle_max_mileage integer DEFAULT 150000 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lenders OWNER TO neondb_owner;

--
-- Name: local_tax_rates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.local_tax_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    state_code text NOT NULL,
    county_name text,
    county_fips text,
    city_name text,
    special_district_name text,
    jurisdiction_type text NOT NULL,
    tax_rate numeric(6,4) NOT NULL,
    effective_date timestamp without time zone DEFAULT now() NOT NULL,
    end_date timestamp without time zone,
    notes text,
    source_url text,
    last_verified timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.local_tax_rates OWNER TO neondb_owner;

--
-- Name: permissions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    category text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.permissions OWNER TO neondb_owner;

--
-- Name: quick_quote_contacts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.quick_quote_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quick_quote_id uuid NOT NULL,
    customer_id uuid,
    name text NOT NULL,
    phone text NOT NULL,
    sms_sent_at timestamp without time zone,
    sms_delivery_status text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.quick_quote_contacts OWNER TO neondb_owner;

--
-- Name: quick_quotes; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.quick_quotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    salesperson_id uuid,
    vehicle_id uuid,
    quote_payload jsonb NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    deal_id uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.quick_quotes OWNER TO neondb_owner;

--
-- Name: rate_requests; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.rate_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deal_id uuid NOT NULL,
    scenario_id uuid,
    credit_score integer NOT NULL,
    cobuyer_credit_score integer,
    requested_amount numeric(12,2) NOT NULL,
    down_payment numeric(12,2) NOT NULL,
    trade_value numeric(12,2) DEFAULT 0.00 NOT NULL,
    trade_payoff numeric(12,2) DEFAULT 0.00 NOT NULL,
    term integer NOT NULL,
    monthly_income numeric(12,2),
    monthly_debt numeric(12,2),
    calculated_dti numeric(5,2),
    vehicle_data jsonb NOT NULL,
    request_type text DEFAULT 'soft_pull'::text NOT NULL,
    request_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    response_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    response_count integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    error_message text,
    requested_at timestamp without time zone DEFAULT now() NOT NULL,
    responded_at timestamp without time zone,
    expires_at timestamp without time zone,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.rate_requests OWNER TO neondb_owner;

--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.role_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role text NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO neondb_owner;

--
-- Name: rooftop_configurations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.rooftop_configurations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dealership_id uuid NOT NULL,
    rooftop_id text NOT NULL,
    name text NOT NULL,
    dealer_state_code text NOT NULL,
    address text,
    city text,
    zip_code text,
    default_tax_perspective text DEFAULT 'DEALER_STATE'::text NOT NULL,
    allowed_registration_states jsonb DEFAULT '[]'::jsonb NOT NULL,
    state_overrides jsonb DEFAULT '{}'::jsonb,
    drive_out_enabled boolean DEFAULT false NOT NULL,
    drive_out_states jsonb DEFAULT '[]'::jsonb,
    custom_tax_rates jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.rooftop_configurations OWNER TO neondb_owner;

--
-- Name: security_audit_log; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.security_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    username text,
    event_type text NOT NULL,
    event_category text NOT NULL,
    ip_address text,
    user_agent text,
    metadata jsonb DEFAULT '{}'::jsonb,
    success boolean DEFAULT true NOT NULL,
    error_message text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.security_audit_log OWNER TO neondb_owner;

--
-- Name: session; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.session OWNER TO neondb_owner;

--
-- Name: tax_jurisdictions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.tax_jurisdictions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    state text NOT NULL,
    county text,
    city text,
    state_tax_rate numeric(6,4) NOT NULL,
    county_tax_rate numeric(6,4) DEFAULT '0'::numeric NOT NULL,
    city_tax_rate numeric(6,4) DEFAULT '0'::numeric NOT NULL,
    trade_in_credit_type text DEFAULT 'tax_on_difference'::text NOT NULL,
    registration_fee numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    title_fee numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    plate_fee numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    doc_fee_max numeric(10,2),
    township text,
    special_district text,
    zip_code text,
    township_tax_rate numeric(6,4) DEFAULT '0'::numeric NOT NULL,
    special_district_tax_rate numeric(6,4) DEFAULT '0'::numeric NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    tax_rule_group_id uuid
);


ALTER TABLE public.tax_jurisdictions OWNER TO neondb_owner;

--
-- Name: tax_rule_groups; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.tax_rule_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    tax_structure text NOT NULL,
    doc_fee_taxable boolean DEFAULT false NOT NULL,
    warranty_taxable boolean DEFAULT false NOT NULL,
    gap_taxable boolean DEFAULT false NOT NULL,
    maintenance_taxable boolean DEFAULT false NOT NULL,
    accessories_taxable boolean DEFAULT true NOT NULL,
    trade_in_credit_type text DEFAULT 'tax_on_difference'::text NOT NULL,
    rebate_taxable boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.tax_rule_groups OWNER TO neondb_owner;

--
-- Name: trade_vehicles; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.trade_vehicles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    year integer NOT NULL,
    make text NOT NULL,
    model text NOT NULL,
    "trim" text,
    mileage integer NOT NULL,
    vin text,
    condition text,
    allowance numeric(12,2) NOT NULL,
    payoff numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    deal_id uuid,
    payoff_to text
);


ALTER TABLE public.trade_vehicles OWNER TO neondb_owner;

--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    full_name text NOT NULL,
    role text DEFAULT 'salesperson'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    email text NOT NULL,
    password text DEFAULT 'temp_password'::text NOT NULL,
    email_verified boolean DEFAULT false,
    mfa_enabled boolean DEFAULT false,
    failed_login_attempts integer DEFAULT 0,
    preferences jsonb DEFAULT '{}'::jsonb,
    updated_at timestamp without time zone DEFAULT now(),
    reset_token text,
    reset_token_expires timestamp without time zone,
    mfa_secret text,
    last_login timestamp without time zone,
    account_locked_until timestamp without time zone,
    dealership_id uuid DEFAULT 'fa136a38-696a-47b6-ac26-c184cc6ebe46'::uuid NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: vehicle_comparables; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.vehicle_comparables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vehicle_id uuid NOT NULL,
    source text NOT NULL,
    source_id text,
    year integer NOT NULL,
    make text NOT NULL,
    model text NOT NULL,
    "trim" text,
    mileage integer NOT NULL,
    condition text,
    sale_price numeric(12,2),
    list_price numeric(12,2),
    sale_date timestamp without time zone,
    days_on_market integer,
    city text,
    state text,
    zip_code text,
    distance_miles integer,
    similarity_score integer,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.vehicle_comparables OWNER TO neondb_owner;

--
-- Name: vehicle_features; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.vehicle_features (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vehicle_id uuid NOT NULL,
    category text NOT NULL,
    name text NOT NULL,
    description text,
    is_standard boolean DEFAULT true NOT NULL,
    package_name text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.vehicle_features OWNER TO neondb_owner;

--
-- Name: vehicle_images; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.vehicle_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vehicle_id uuid NOT NULL,
    url text NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    caption text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.vehicle_images OWNER TO neondb_owner;

--
-- Name: vehicle_valuations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.vehicle_valuations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vehicle_id uuid NOT NULL,
    provider text NOT NULL,
    valuation_type text NOT NULL,
    base_value numeric(12,2),
    adjusted_value numeric(12,2),
    low_range numeric(12,2),
    high_range numeric(12,2),
    condition_grade text,
    mileage_adjustment numeric(12,2),
    region_adjustment numeric(12,2),
    provider_data jsonb DEFAULT '{}'::jsonb,
    valuation_date timestamp without time zone DEFAULT now() NOT NULL,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.vehicle_valuations OWNER TO neondb_owner;

--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.vehicles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vin text NOT NULL,
    year integer NOT NULL,
    make text NOT NULL,
    model text NOT NULL,
    "trim" text,
    mileage integer NOT NULL,
    exterior_color text,
    interior_color text,
    price numeric(12,2) NOT NULL,
    msrp numeric(12,2),
    invoice numeric(12,2),
    is_new boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    engine_type text,
    transmission text,
    drivetrain text,
    fuel_type text,
    mpg_city integer,
    mpg_highway integer,
    invoice_price numeric(12,2),
    internet_price numeric(12,2),
    condition text DEFAULT 'new'::text,
    status text DEFAULT 'available'::text,
    images jsonb DEFAULT '[]'::jsonb,
    features jsonb DEFAULT '[]'::jsonb,
    stock_number uuid DEFAULT gen_random_uuid() NOT NULL,
    dealership_id uuid NOT NULL
);


ALTER TABLE public.vehicles OWNER TO neondb_owner;

--
-- Name: zip_code_lookup; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.zip_code_lookup (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    zip_code text NOT NULL,
    tax_jurisdiction_id uuid NOT NULL,
    city text,
    state text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.zip_code_lookup OWNER TO neondb_owner;

--
-- Name: zip_to_local_tax_rates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.zip_to_local_tax_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    zip_code text NOT NULL,
    state_code text NOT NULL,
    county_fips text,
    county_name text NOT NULL,
    city_name text,
    tax_rate_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    combined_local_rate numeric(6,4) DEFAULT '0'::numeric NOT NULL,
    last_updated timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.zip_to_local_tax_rates OWNER TO neondb_owner;

--
-- Data for Name: appointments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.appointments (id, customer_id, user_id, dealership_id, title, description, appointment_type, scheduled_at, duration, end_time, status, location, deal_id, vehicle_id, reminder_sent, confirmation_sent, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: approved_lenders; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.approved_lenders (id, rate_request_id, lender_id, program_id, approval_status, approval_amount, apr, buy_rate, dealer_reserve, flat_fee, term, monthly_payment, total_finance_charge, total_of_payments, ltv, dti, pti, stipulations, special_conditions, approval_score, approval_likelihood, incentives, special_rate, selected, selected_at, selected_by, offer_expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.audit_log (id, deal_id, scenario_id, user_id, action, entity_type, entity_id, field_name, old_value, new_value, metadata, "timestamp") FROM stdin;
79885dc3-cf93-4b7a-83fc-7eee4ddb2d21	40373374-fc48-4bba-ac02-e86a2a91c281	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	40373374-fc48-4bba-ac02-e86a2a91c281	\N	\N	\N	{"dealNumber": "2025-11-0002"}	2025-11-09 21:57:19.621726
6374431e-c698-4fd9-ba13-3ba35dcabbad	40373374-fc48-4bba-ac02-e86a2a91c281	e4939478-4613-4031-ad15-5ef11878d510	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	scenario	e4939478-4613-4031-ad15-5ef11878d510	\N	\N	\N	{"name": "Finance - 60 Month", "scenarioType": "FINANCE_DEAL"}	2025-11-09 21:57:19.877871
11da177e-ed11-434c-941b-a0c04fee2045	ddb51922-a4b0-4f16-8ada-ed97fb908aa7	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	ddb51922-a4b0-4f16-8ada-ed97fb908aa7	\N	\N	\N	{"dealNumber": "DEAL-20251109-003"}	2025-11-09 22:00:05.973789
60c78b50-f7b4-42e8-aa37-1e05b2456af5	ddb51922-a4b0-4f16-8ada-ed97fb908aa7	7acffa78-ac30-4641-9d50-261a750de6b9	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	scenario	7acffa78-ac30-4641-9d50-261a750de6b9	\N	\N	\N	{"name": "Finance - 60 Month", "scenarioType": "FINANCE_DEAL"}	2025-11-09 22:00:06.222285
028103ff-c63d-41b7-acdc-bc686d229905	55f7b893-ae29-4a40-9554-bcdbb90917a7	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	55f7b893-ae29-4a40-9554-bcdbb90917a7	\N	\N	\N	{"dealNumber": "DEAL-20251109-004"}	2025-11-09 22:02:27.781356
3b54d533-0c10-4727-b964-cbde57ca0ae5	55f7b893-ae29-4a40-9554-bcdbb90917a7	28229a29-4634-4112-bb0a-b54fbc09b9d6	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	scenario	28229a29-4634-4112-bb0a-b54fbc09b9d6	\N	\N	\N	{"name": "Finance - 60 Month", "scenarioType": "FINANCE_DEAL"}	2025-11-09 22:02:28.041865
6f33608d-394e-4d43-8865-554d1c462c3f	a3a41793-6361-4183-a71a-e74ed3da30bc	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	a3a41793-6361-4183-a71a-e74ed3da30bc	\N	\N	\N	{"dealNumber": "DEAL-20251109-005"}	2025-11-09 22:06:59.727699
6a40ec31-fe19-40b3-86b9-dce0c593f063	a3a41793-6361-4183-a71a-e74ed3da30bc	cd09a550-77ec-46eb-869d-797fee5350dc	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	scenario	cd09a550-77ec-46eb-869d-797fee5350dc	\N	\N	\N	{"name": "Finance - 60 Month", "scenarioType": "FINANCE_DEAL"}	2025-11-09 22:07:00.042254
6a5450bc-c9b6-4a60-83c3-72ba57e57c68	4ffff290-3cbe-40c4-8b32-e24b5bf597e1	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	4ffff290-3cbe-40c4-8b32-e24b5bf597e1	\N	\N	\N	{"dealNumber": "DEAL-20251109-006"}	2025-11-09 22:07:00.253862
7d4d018a-e591-45dc-a221-03c4c038a196	4ffff290-3cbe-40c4-8b32-e24b5bf597e1	85d553c0-bdf6-4156-a44d-e5ef6215b86d	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	scenario	85d553c0-bdf6-4156-a44d-e5ef6215b86d	\N	\N	\N	{"name": "Finance - 60 Month", "scenarioType": "FINANCE_DEAL"}	2025-11-09 22:07:00.555283
6e473494-892d-4db3-97c0-5f2ffd0ac74a	675ee62c-5157-44e9-8309-d0525a85fb2a	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	675ee62c-5157-44e9-8309-d0525a85fb2a	\N	\N	\N	{"dealNumber": "DEAL-20251109-007"}	2025-11-09 23:52:11.344711
657e6c72-9465-40b6-a50a-b235f5f02775	675ee62c-5157-44e9-8309-d0525a85fb2a	32817b35-6bf5-4294-818a-53f19eb99da2	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	scenario	32817b35-6bf5-4294-818a-53f19eb99da2	\N	\N	\N	{"name": "Finance - 60 Month", "scenarioType": "FINANCE_DEAL"}	2025-11-09 23:52:11.651278
156cf636-6bc8-4dc0-a5f1-834a2c911477	ddde470c-8b40-4650-980e-ce70d57240fb	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	ddde470c-8b40-4650-980e-ce70d57240fb	\N	\N	\N	{"dealNumber": "DEAL-20251110-001"}	2025-11-10 00:12:38.71014
287dfed0-ec04-4148-aa72-2ff92b963841	ddde470c-8b40-4650-980e-ce70d57240fb	2dcb695a-cb21-412f-9f1d-46a68b8e2a0f	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	scenario	2dcb695a-cb21-412f-9f1d-46a68b8e2a0f	\N	\N	\N	{"name": "Finance - 60 Month", "scenarioType": "FINANCE_DEAL"}	2025-11-10 00:12:39.135769
6b550cff-ed12-4eab-941d-f8636465a628	ddde470c-8b40-4650-980e-ce70d57240fb	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	deal	ddde470c-8b40-4650-980e-ce70d57240fb	dealState	DRAFT	IN_PROGRESS	\N	2025-11-10 02:35:33.93199
d8434320-bf17-4db4-a39e-0d252899fafb	d3c1f6db-4c23-49e1-b6bd-5d3346024967	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	d3c1f6db-4c23-49e1-b6bd-5d3346024967	\N	\N	\N	{"dealNumber": "DEAL-20251110-002"}	2025-11-10 12:09:21.1472
eea35b7b-9ea0-453f-bd31-aeae1a944593	d3c1f6db-4c23-49e1-b6bd-5d3346024967	edc919aa-9c5d-4a29-b135-3bb86051b431	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	scenario	edc919aa-9c5d-4a29-b135-3bb86051b431	\N	\N	\N	{"name": "Finance - 60 Month", "scenarioType": "FINANCE_DEAL"}	2025-11-10 12:09:21.46316
cda1105f-3271-487e-98e0-36638fe9d65b	5db6cd65-ec72-4563-b046-16676ec0a0b8	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	5db6cd65-ec72-4563-b046-16676ec0a0b8	\N	\N	\N	{"dealNumber": "DEAL-20251110-003"}	2025-11-10 17:17:13.315726
ae5baed0-4e46-4a81-923d-4748cb5a1674	5db6cd65-ec72-4563-b046-16676ec0a0b8	ec92d094-92e6-484b-9f5a-006d41e092f0	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	scenario	ec92d094-92e6-484b-9f5a-006d41e092f0	\N	\N	\N	{"name": "Finance - 60 Month", "scenarioType": "FINANCE_DEAL"}	2025-11-10 17:17:13.633639
76df3e77-4b8a-49fc-98d1-eccf346c4a26	244e57f1-dddf-4230-b1d2-810f1da44fd7	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	244e57f1-dddf-4230-b1d2-810f1da44fd7	\N	\N	\N	{"dealNumber": "DEAL-20251110-004"}	2025-11-10 17:37:51.060741
392ba7c3-3d0b-4841-a39a-87238cdbac35	244e57f1-dddf-4230-b1d2-810f1da44fd7	e2edff0e-27df-47b9-92f5-9f78239fc310	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	scenario	e2edff0e-27df-47b9-92f5-9f78239fc310	\N	\N	\N	{"name": "Finance - 60 Month", "scenarioType": "FINANCE_DEAL"}	2025-11-10 17:37:51.408628
c5b61acf-5243-4dae-9a18-c4ace1b793d4	71f07d59-685d-46c4-afe2-60469d5d15ce	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	71f07d59-685d-46c4-afe2-60469d5d15ce	\N	\N	\N	{"dealNumber": "DEAL-20251110-005"}	2025-11-10 18:58:21.455863
c3a981ac-2155-4817-84d9-bdd6e87b0822	71f07d59-685d-46c4-afe2-60469d5d15ce	d66452d1-8d7d-4472-8bf9-837c5b665446	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	scenario	d66452d1-8d7d-4472-8bf9-837c5b665446	\N	\N	\N	{"name": "Finance - 60 Month", "scenarioType": "FINANCE_DEAL"}	2025-11-10 18:58:21.814211
6c7cad8a-5959-422e-a682-537bc67ce850	71f07d59-685d-46c4-afe2-60469d5d15ce	d66452d1-8d7d-4472-8bf9-837c5b665446	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	d66452d1-8d7d-4472-8bf9-837c5b665446	term	60	36	\N	2025-11-10 18:59:03.862213
00d2dd6b-a263-4c3a-8b26-e2085457fd79	71f07d59-685d-46c4-afe2-60469d5d15ce	d66452d1-8d7d-4472-8bf9-837c5b665446	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	d66452d1-8d7d-4472-8bf9-837c5b665446	moneyFactor	0.000000	0.001253	\N	2025-11-10 18:59:09.250236
264825b9-fcc4-42b9-9dce-1f30d731ea65	1bcd4273-d86b-47c8-91c1-10d6f5750a7e	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	1bcd4273-d86b-47c8-91c1-10d6f5750a7e	\N	\N	\N	{"dealNumber": "DEAL-20251110-006"}	2025-11-10 20:03:02.509167
8fe298c2-abf4-4c92-ba81-2a6adc1e792c	1bcd4273-d86b-47c8-91c1-10d6f5750a7e	626c8e7a-7db8-4115-b468-dfbc9d028d3d	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	scenario	626c8e7a-7db8-4115-b468-dfbc9d028d3d	\N	\N	\N	{"name": "Finance - 60 Month", "scenarioType": "FINANCE_DEAL"}	2025-11-10 20:03:02.838748
b735c498-24dd-4c2a-b24c-67abf37e78d8	d52a4e4a-0955-4bc3-9f36-9248afe39b59	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	d52a4e4a-0955-4bc3-9f36-9248afe39b59	\N	\N	\N	{"dealNumber": "DEAL-20251110-007"}	2025-11-10 21:34:16.182489
610eef23-f913-4eee-bb6e-52ae22698c53	d52a4e4a-0955-4bc3-9f36-9248afe39b59	5b55a256-2aea-4263-8a69-983ab6c3573c	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	scenario	5b55a256-2aea-4263-8a69-983ab6c3573c	\N	\N	\N	{"name": "Finance - 60 Month", "scenarioType": "FINANCE_DEAL"}	2025-11-10 21:34:16.509416
3261f554-2e3b-4daf-b6d6-a7c421bcb3a2	5936d353-e284-47d8-ab03-1c68dd2f51d5	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	5936d353-e284-47d8-ab03-1c68dd2f51d5	\N	\N	\N	{"dealNumber": "DEAL-20251110-008"}	2025-11-10 21:38:42.555553
a8e48976-55bb-4b91-b789-5778779200f9	5936d353-e284-47d8-ab03-1c68dd2f51d5	0baf1bdc-250b-4f33-bec9-e2a2e88feb77	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	scenario	0baf1bdc-250b-4f33-bec9-e2a2e88feb77	\N	\N	\N	{"name": "Finance - 60 Month", "scenarioType": "FINANCE_DEAL"}	2025-11-10 21:38:42.852822
fb4cd1b2-f9dd-4d78-a4b1-29bb2c2e4004	c634f9c7-c23c-4bda-a9fd-3915c1058515	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	c634f9c7-c23c-4bda-a9fd-3915c1058515	\N	\N	\N	{"dealNumber": "DEAL-20251110-009"}	2025-11-10 23:00:59.38193
0d3f1538-7382-4e8d-9c7a-1bddc4d33e9d	c634f9c7-c23c-4bda-a9fd-3915c1058515	7620d1bc-3aaa-4d16-98fc-c8a0bd0a70e1	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	scenario	7620d1bc-3aaa-4d16-98fc-c8a0bd0a70e1	\N	\N	\N	{"name": "Finance - 60 Month", "scenarioType": "FINANCE_DEAL"}	2025-11-10 23:00:59.690888
3c8c3b78-8ee0-4526-958f-eec125ad0b78	c19912cc-1217-43b2-8ff9-e0e16d455bc6	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	c19912cc-1217-43b2-8ff9-e0e16d455bc6	\N	\N	\N	{"dealNumber": "DEAL-20251110-010"}	2025-11-10 23:05:39.705373
caf17221-03ff-4c5e-b9e9-6bc141618bad	c19912cc-1217-43b2-8ff9-e0e16d455bc6	75735ae5-6cc0-4b52-b4c9-3ddcf99ba8ea	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	scenario	75735ae5-6cc0-4b52-b4c9-3ddcf99ba8ea	\N	\N	\N	{"name": "Finance - 60 Month", "scenarioType": "FINANCE_DEAL"}	2025-11-10 23:05:39.973943
2458dcaa-69aa-4037-85c3-15179cc320aa	c19912cc-1217-43b2-8ff9-e0e16d455bc6	75735ae5-6cc0-4b52-b4c9-3ddcf99ba8ea	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	75735ae5-6cc0-4b52-b4c9-3ddcf99ba8ea	vehiclePrice	28500.00	3.01	\N	2025-11-10 23:08:50.944792
037ca4ce-f113-444f-a115-8b0640252c07	d1ee8fe0-306f-417f-91ba-aeb5ce7144a9	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	d1ee8fe0-306f-417f-91ba-aeb5ce7144a9	\N	\N	\N	{"dealNumber": "DEAL-20251110-011"}	2025-11-10 23:12:09.347507
e3fa9c13-43c6-4393-ab2f-0cf77cfc027f	d1ee8fe0-306f-417f-91ba-aeb5ce7144a9	6f688c83-d1a6-4737-9a6b-616bf3a8a25a	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	scenario	6f688c83-d1a6-4737-9a6b-616bf3a8a25a	\N	\N	\N	{"name": "Finance - 60 Month", "scenarioType": "FINANCE_DEAL"}	2025-11-10 23:12:09.662865
882662e5-b0b0-4e68-9b87-67455d3c7816	90df1aea-5fd2-4e4d-a96f-11b9f5decabd	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	90df1aea-5fd2-4e4d-a96f-11b9f5decabd	\N	\N	\N	{"dealNumber": "DEAL-20251110-012"}	2025-11-10 23:16:19.531642
1f8779b5-c9a2-47e2-bc51-497d510703d5	90df1aea-5fd2-4e4d-a96f-11b9f5decabd	d6145193-5bfd-43e2-907e-3e88a1553208	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	scenario	d6145193-5bfd-43e2-907e-3e88a1553208	\N	\N	\N	{"name": "Finance - 60 Month", "scenarioType": "FINANCE_DEAL"}	2025-11-10 23:16:19.805767
a5f5d233-344d-45df-b924-3ae91cdef755	90df1aea-5fd2-4e4d-a96f-11b9f5decabd	d6145193-5bfd-43e2-907e-3e88a1553208	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	d6145193-5bfd-43e2-907e-3e88a1553208	vehiclePrice	28500.00	35000.00	\N	2025-11-10 23:17:34.598165
4a54b8b9-6e94-494f-bd4b-4d58327ae802	90df1aea-5fd2-4e4d-a96f-11b9f5decabd	d6145193-5bfd-43e2-907e-3e88a1553208	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	d6145193-5bfd-43e2-907e-3e88a1553208	apr	4.9900	6.9900	\N	2025-11-10 23:19:28.504848
954dca8a-9a0e-423e-962e-f08fb0149349	8c6f94fe-094b-48a3-ae61-a6a855c42912	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	8c6f94fe-094b-48a3-ae61-a6a855c42912	\N	\N	\N	{"dealNumber": "DEAL-20251110-013"}	2025-11-10 23:25:05.627161
c1df7371-576f-47dd-959f-fa0443f6310a	8c6f94fe-094b-48a3-ae61-a6a855c42912	530a7687-0a9e-418e-af53-212bc3961468	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	scenario	530a7687-0a9e-418e-af53-212bc3961468	\N	\N	\N	{"name": "Finance - 60 Month", "scenarioType": "FINANCE_DEAL"}	2025-11-10 23:25:05.911764
407c8a9d-0c38-46d4-b9bc-37be37ae9157	8c6f94fe-094b-48a3-ae61-a6a855c42912	530a7687-0a9e-418e-af53-212bc3961468	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	530a7687-0a9e-418e-af53-212bc3961468	vehiclePrice	28500.00	3.01	\N	2025-11-10 23:29:31.868045
381bd770-f3e0-43c1-957a-d08c686c7d86	f7506c5c-9cdc-4483-9da6-516c9f8ff709	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	f7506c5c-9cdc-4483-9da6-516c9f8ff709	\N	\N	\N	{"dealNumber": "DEAL-20251110-014"}	2025-11-10 23:37:47.376592
61b7a8f6-78c5-4804-8759-6fdb806b5706	f7506c5c-9cdc-4483-9da6-516c9f8ff709	c96f0c03-8d0a-472c-bf25-b0063bb97151	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	scenario	c96f0c03-8d0a-472c-bf25-b0063bb97151	\N	\N	\N	{"name": "Finance - 60 Month", "scenarioType": "FINANCE_DEAL"}	2025-11-10 23:37:47.690472
ee6064be-ac35-4622-ab60-4e15a9cfb2bb	f7506c5c-9cdc-4483-9da6-516c9f8ff709	c96f0c03-8d0a-472c-bf25-b0063bb97151	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	c96f0c03-8d0a-472c-bf25-b0063bb97151	vehiclePrice	28500.00	35000.00	\N	2025-11-10 23:38:53.235121
d64e2aea-6419-44f2-be1f-86e52310ebfb	56bc2291-018f-424d-9c51-a591c6f62e0c	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	56bc2291-018f-424d-9c51-a591c6f62e0c	\N	\N	\N	{"dealNumber": "DEAL-20251110-015"}	2025-11-10 23:40:50.211025
7ff027a0-1cae-4c85-851e-415e77f9288e	56bc2291-018f-424d-9c51-a591c6f62e0c	30307f0f-4b78-44da-9f32-9685c8259371	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	scenario	30307f0f-4b78-44da-9f32-9685c8259371	\N	\N	\N	{"name": "Finance - 60 Month", "scenarioType": "FINANCE_DEAL"}	2025-11-10 23:40:50.52634
60316564-96aa-4ffb-87a1-1ce6616bd658	8c6f94fe-094b-48a3-ae61-a6a855c42912	530a7687-0a9e-418e-af53-212bc3961468	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	530a7687-0a9e-418e-af53-212bc3961468	vehiclePrice	3.01	2.00	\N	2025-11-11 02:29:15.927179
d0aa3fd2-e87a-48a6-bce5-f53b2839f2ca	52a0f36d-ab77-41f6-8fc3-9c16b3263157	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	52a0f36d-ab77-41f6-8fc3-9c16b3263157	\N	\N	\N	{"dealNumber": "DEAL-20251111-001"}	2025-11-11 02:51:38.028534
bc7c9fc6-c0c9-42ee-9be0-b200bb71a7bf	52a0f36d-ab77-41f6-8fc3-9c16b3263157	1977d5a5-689f-4aa7-a0fb-257fc6a9c305	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	scenario	1977d5a5-689f-4aa7-a0fb-257fc6a9c305	\N	\N	\N	{"name": "Finance - 60 Month", "scenarioType": "FINANCE_DEAL"}	2025-11-11 02:51:38.348548
182cc2cd-39a7-4b8f-9a07-14c6e546aa2d	52a0f36d-ab77-41f6-8fc3-9c16b3263157	1977d5a5-689f-4aa7-a0fb-257fc6a9c305	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	1977d5a5-689f-4aa7-a0fb-257fc6a9c305	vehiclePrice	28500.00	2850.00	\N	2025-11-11 02:51:43.458424
571d7431-afc0-43f2-86da-bf2789e0c6eb	52a0f36d-ab77-41f6-8fc3-9c16b3263157	1977d5a5-689f-4aa7-a0fb-257fc6a9c305	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	1977d5a5-689f-4aa7-a0fb-257fc6a9c305	downPayment	5000.00	2.02	\N	2025-11-11 02:52:28.695938
3f2a5093-8551-4c4c-a36d-75d065077c60	1e8ef2b9-1ef9-42a2-ac8e-aba4f47b18a2	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	1e8ef2b9-1ef9-42a2-ac8e-aba4f47b18a2	\N	\N	\N	{"dealNumber": "DEAL-20251111-002"}	2025-11-11 02:54:00.336886
0609180c-0265-4fb7-b19b-7942dc56db07	1e8ef2b9-1ef9-42a2-ac8e-aba4f47b18a2	43e43b55-a497-45cc-b2ed-35d90c0160fd	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	scenario	43e43b55-a497-45cc-b2ed-35d90c0160fd	\N	\N	\N	{"name": "Finance - 60 Month", "scenarioType": "FINANCE_DEAL"}	2025-11-11 02:54:00.61563
df55d827-6788-4fd8-bfcf-275538fc17ab	dac695e1-7565-4910-a36b-6aa8d9ae343f	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	dac695e1-7565-4910-a36b-6aa8d9ae343f	\N	\N	\N	{"dealNumber": "DEAL-20251111-003"}	2025-11-11 03:11:41.020993
d2fd52c8-61e9-49ff-a7bc-24f1e2c06370	dac695e1-7565-4910-a36b-6aa8d9ae343f	a2f59804-18ab-4a2a-a6db-6c50d39d831b	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	scenario	a2f59804-18ab-4a2a-a6db-6c50d39d831b	\N	\N	\N	{"name": "Finance - 60 Month", "scenarioType": "FINANCE_DEAL"}	2025-11-11 03:11:41.29836
d20cf427-1920-4b90-984f-35d549ea2fa8	52a7f8d0-bfe5-4347-a262-0f8a22d48566	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	52a7f8d0-bfe5-4347-a262-0f8a22d48566	\N	\N	\N	{"dealNumber": "DEAL-20251111-010"}	2025-11-11 13:29:08.2963
c2f3310b-6b5a-42c2-b04a-30df67b19261	52a7f8d0-bfe5-4347-a262-0f8a22d48566	421158cc-3d13-4454-bcf8-516b64661c5e	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	scenario	421158cc-3d13-4454-bcf8-516b64661c5e	\N	\N	\N	{"name": "Finance - 60 Month", "scenarioType": "FINANCE_DEAL"}	2025-11-11 13:29:08.62682
79219aa7-8574-4f38-8c5c-2f3bc839c6ff	d03df4f2-e825-4c30-bc20-4fb7eee266c8	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	d03df4f2-e825-4c30-bc20-4fb7eee266c8	\N	\N	\N	{"dealNumber": "DEAL-20251111-012"}	2025-11-11 15:07:53.220662
8dd14289-4515-46dd-ba29-31985c3c74fc	429e4779-be0e-4b01-89d4-ecc83a1cf97b	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	429e4779-be0e-4b01-89d4-ecc83a1cf97b	\N	\N	\N	{"dealNumber": "DEAL-20251111-013"}	2025-11-11 15:10:25.250075
71b8c92c-4269-426b-bbb2-87a051d33f1f	334d0d3f-9e80-409b-9ce0-95c4fc929d51	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	334d0d3f-9e80-409b-9ce0-95c4fc929d51	\N	\N	\N	{"dealNumber": "DEAL-20251111-014"}	2025-11-11 15:12:29.19502
7c2f5e8d-11ba-4630-8436-c807ed039715	a0bd95f0-90ba-4de4-ab18-b57a573eee64	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	a0bd95f0-90ba-4de4-ab18-b57a573eee64	\N	\N	\N	{"dealNumber": "DEAL-20251111-015"}	2025-11-11 15:14:43.899333
037dce96-fc2f-4e5e-b377-311b94d1e43f	bff6e34f-587a-4b5f-aae6-36704829550f	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	bff6e34f-587a-4b5f-aae6-36704829550f	\N	\N	\N	{"dealNumber": "DEAL-20251111-016"}	2025-11-11 15:19:26.230558
2f245d53-8e7c-41f3-b160-c900446da53f	3c033059-1da3-4a9a-a5b1-6d5c68ae9370	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	3c033059-1da3-4a9a-a5b1-6d5c68ae9370	\N	\N	\N	{"dealNumber": "DEAL-20251111-017"}	2025-11-11 15:22:01.185235
5a719798-bd74-4ea0-9acb-9c9f12275d8b	b82762e2-2d83-4d1c-9236-45aa8e37b6bb	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	b82762e2-2d83-4d1c-9236-45aa8e37b6bb	\N	\N	\N	{"dealNumber": "DEAL-20251111-018"}	2025-11-11 15:42:32.016357
f6e8f6ed-7b6d-4dea-a4f5-0d1e6c6a9804	b82762e2-2d83-4d1c-9236-45aa8e37b6bb	cb2c2a85-1063-48ca-a359-a2053f9c5fac	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	cb2c2a85-1063-48ca-a359-a2053f9c5fac	vehiclePrice	0.00	0.04	\N	2025-11-11 15:42:56.549927
5a549c3a-31e7-4bc1-9112-448e138c9e9f	b82762e2-2d83-4d1c-9236-45aa8e37b6bb	cb2c2a85-1063-48ca-a359-a2053f9c5fac	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	cb2c2a85-1063-48ca-a359-a2053f9c5fac	tradeAllowance	0.00	0.10	\N	2025-11-11 15:43:05.475842
6d177075-1292-478b-8376-35e2627db0b4	b82762e2-2d83-4d1c-9236-45aa8e37b6bb	cb2c2a85-1063-48ca-a359-a2053f9c5fac	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	cb2c2a85-1063-48ca-a359-a2053f9c5fac	tradeAllowance	0.10	0.01	\N	2025-11-11 15:43:07.065653
dd77cc08-bf49-4881-9e46-fbaacb1340b7	4dc6e18c-f211-4b93-9526-03c30686788c	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	4dc6e18c-f211-4b93-9526-03c30686788c	\N	\N	\N	{"dealNumber": "DEAL-20251111-019"}	2025-11-11 15:49:52.237287
248bb5bb-a3b5-4e66-8898-577635dbda72	d512245b-9050-4635-8d06-a44026c7c6e6	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	d512245b-9050-4635-8d06-a44026c7c6e6	\N	\N	\N	{"dealNumber": "DEAL-20251111-020"}	2025-11-11 16:31:12.151827
4d7f779a-4fd9-458a-8977-5a9e06ccaa16	17ac2589-f83c-4d1f-9a7b-9500d17cf210	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	17ac2589-f83c-4d1f-9a7b-9500d17cf210	\N	\N	\N	{"dealNumber": "DEAL-20251111-021"}	2025-11-11 16:31:13.261434
25b8a7ba-7511-4a5c-9d68-1bda80ffdd49	17ac2589-f83c-4d1f-9a7b-9500d17cf210	0a7dbf33-7149-44c3-8600-241988a3569d	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	0a7dbf33-7149-44c3-8600-241988a3569d	apr	8.9000	60.0000	\N	2025-11-11 16:33:33.546997
4d719c72-22d4-419e-9ad4-0e1058ffc862	d0dd6148-3fe7-44d7-ae3b-bb9668d99663	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	d0dd6148-3fe7-44d7-ae3b-bb9668d99663	\N	\N	\N	{"dealNumber": "DEAL-20251111-022"}	2025-11-11 18:10:00.760274
50399e61-e3fb-47d0-b309-d18f946ca299	b714bb40-e89d-45bc-a024-a9fe6dbe49b9	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	b714bb40-e89d-45bc-a024-a9fe6dbe49b9	\N	\N	\N	{"dealNumber": "DEAL-20251111-024"}	2025-11-11 19:47:29.444788
e3ff35ae-9f1a-4375-9152-93e948d2a36c	b714bb40-e89d-45bc-a024-a9fe6dbe49b9	c1afd553-c2a6-4210-8d76-98ac2e1faefe	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	c1afd553-c2a6-4210-8d76-98ac2e1faefe	term	60	72	\N	2025-11-11 19:47:40.846693
06c3d450-b6bf-483b-84e5-5955110cfc60	b714bb40-e89d-45bc-a024-a9fe6dbe49b9	c1afd553-c2a6-4210-8d76-98ac2e1faefe	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	c1afd553-c2a6-4210-8d76-98ac2e1faefe	apr	8.9000	5.9000	\N	2025-11-11 19:47:46.411644
0f2c5f17-3e7a-4ca0-9e6f-7b3ada181dd6	0107cc84-0274-45cf-99b1-16e3c27a4b38	8ce4fd79-2735-4411-b8f6-cdebff2abf46	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	scenario	8ce4fd79-2735-4411-b8f6-cdebff2abf46	\N	\N	\N	{"name": "Scenario 3", "scenarioType": "FINANCE_DEAL"}	2025-11-11 19:56:22.507519
097dc365-7f63-4d4b-80c4-2f3e85adbe2f	0107cc84-0274-45cf-99b1-16e3c27a4b38	18a49b84-60a9-4051-8123-93eb5aef6811	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	scenario	18a49b84-60a9-4051-8123-93eb5aef6811	\N	\N	\N	{"name": "Scenario 4", "scenarioType": "FINANCE_DEAL"}	2025-11-11 19:59:45.641078
620f3b12-9e1a-4cb2-ad2c-df58bdf678a4	0107cc84-0274-45cf-99b1-16e3c27a4b38	66fc1fc6-04ae-4e19-892e-dac03b59430c	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	scenario	66fc1fc6-04ae-4e19-892e-dac03b59430c	\N	\N	\N	{"name": "Finance - 60 Month (Copy)", "scenarioType": "FINANCE_DEAL"}	2025-11-11 20:01:28.160993
b0f518ba-de3f-426d-b64c-03963edd2147	2fbe9886-f03d-4297-a5ad-aa70aff9f397	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	2fbe9886-f03d-4297-a5ad-aa70aff9f397	\N	\N	\N	{"dealNumber": "DEAL-20251111-025"}	2025-11-11 20:54:24.290613
6a77ed71-d27b-46b2-b3ca-899f6dc845a2	dfffcbc9-67fb-43a0-b5ca-4df30f23b9ed	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	dfffcbc9-67fb-43a0-b5ca-4df30f23b9ed	\N	\N	\N	{"dealNumber": "DEAL-20251111-026"}	2025-11-11 21:55:25.549643
fd284fc1-cacc-46ca-ac98-a3fc75f4eb28	5eaace1d-271b-467b-bde7-b21c20a750ac	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	5eaace1d-271b-467b-bde7-b21c20a750ac	\N	\N	\N	{"dealNumber": "DEAL-20251112-001"}	2025-11-12 02:42:10.735558
c63f312a-2a0c-4765-8d5d-2a06dc913231	e0601864-60c4-436b-ae64-830733a6e6ff	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	e0601864-60c4-436b-ae64-830733a6e6ff	\N	\N	\N	{"dealNumber": "DEAL-20251112-002"}	2025-11-12 02:44:38.925987
9f0bffe8-e5da-4fec-8dd7-569f9dcb6029	e0601864-60c4-436b-ae64-830733a6e6ff	5afdc446-c896-41b0-8658-f4732da96834	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	scenario	5afdc446-c896-41b0-8658-f4732da96834	\N	\N	\N	{"name": "Quick Quote", "scenarioType": "FINANCE_DEAL"}	2025-11-12 02:44:39.380317
d681f9ca-cc77-4e78-a058-27eee9b7f37d	ae65a310-d4a1-45e1-9b9f-8025dc11eb10	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	ae65a310-d4a1-45e1-9b9f-8025dc11eb10	\N	\N	\N	{"dealNumber": "DEAL-20251112-003"}	2025-11-12 05:07:17.643669
08779a74-8c51-413e-8a42-0a11b84b79be	f5797bb2-4350-497e-a077-9d5b31d4f7bf	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	f5797bb2-4350-497e-a077-9d5b31d4f7bf	\N	\N	\N	{"dealNumber": "DEAL-20251112-004"}	2025-11-12 05:08:21.035354
cd412b53-ff15-4c24-967e-91a0c7dc26e9	86c4120f-8679-438f-8a63-d1228642318b	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	86c4120f-8679-438f-8a63-d1228642318b	\N	\N	\N	{"dealNumber": "DEAL-20251112-005"}	2025-11-12 05:24:25.947064
31594f1a-8af4-4b1b-94c2-dcc96ce65e67	8c21fdc3-75e4-4692-bd9d-f408b8a11af8	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	8c21fdc3-75e4-4692-bd9d-f408b8a11af8	\N	\N	\N	{"dealNumber": "DEAL-20251112-006"}	2025-11-12 05:29:04.743735
e8da2c5e-5f25-4d5a-bb8f-48e6dfe53fde	6cfbdf50-337c-4017-b399-f1f9d7f32050	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	6cfbdf50-337c-4017-b399-f1f9d7f32050	\N	\N	\N	{"dealNumber": "DEAL-20251112-007"}	2025-11-12 05:32:56.482978
ac053ee8-ecdd-426a-94c3-b573542d715a	db62bf2d-22eb-4a07-bc40-a1e57b87a26d	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	db62bf2d-22eb-4a07-bc40-a1e57b87a26d	\N	\N	\N	{"dealNumber": "DEAL-20251112-008"}	2025-11-12 05:33:28.551781
f7fe46f0-20b2-4410-9b82-ec8a07cac96d	0d0d91bf-ca8e-4195-9d0d-63db59c2d6df	\N	35ee6e9d-725d-4fbb-91fc-3cf314358044	create	deal	0d0d91bf-ca8e-4195-9d0d-63db59c2d6df	\N	\N	\N	{"dealNumber": "pending"}	2025-11-12 13:35:44.78141
89826f2c-e0df-4936-a637-42dd0f42fd6b	7d8e9745-7e22-4695-8e90-6d4caaa290ee	\N	bccdb2f1-5a70-4f31-bddc-36ca254c0720	create	deal	7d8e9745-7e22-4695-8e90-6d4caaa290ee	\N	\N	\N	{"dealNumber": "pending"}	2025-11-12 13:39:31.828278
d1196ac6-a8b4-4781-a540-d7dee3572dab	7d8e9745-7e22-4695-8e90-6d4caaa290ee	\N	bccdb2f1-5a70-4f31-bddc-36ca254c0720	update	deal	7d8e9745-7e22-4695-8e90-6d4caaa290ee	\N	\N	\N	{"customerId": "b0595e9d-5af6-499d-8ed9-cae4f86259e1", "dealNumber": "0001#1", "customerAttached": true, "customerAttachedAt": "2025-11-12T13:39:49.255Z"}	2025-11-12 13:39:49.289172
0997690b-220f-49f5-b173-d5e63a89bb36	585e6686-6a76-4c12-ac6f-a2641b6f69e8	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	585e6686-6a76-4c12-ac6f-a2641b6f69e8	\N	\N	\N	{"dealNumber": "pending"}	2025-11-12 14:33:26.11189
7e6e3102-fd16-4ade-80a9-cacc536eab19	7125cc5e-995b-4539-9d33-7c958ae54a87	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	7125cc5e-995b-4539-9d33-7c958ae54a87	\N	\N	\N	{"dealNumber": "pending"}	2025-11-12 15:51:15.252556
f4262539-7fc9-45d4-9103-0326a9552873	7125cc5e-995b-4539-9d33-7c958ae54a87	b8afa4e9-84f5-4803-ab76-f05c6d5be845	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	b8afa4e9-84f5-4803-ab76-f05c6d5be845	vehiclePrice	24990.00	21.00	\N	2025-11-12 15:51:32.564006
0ee6ea1c-0867-48ef-bb09-4c202612424f	7125cc5e-995b-4539-9d33-7c958ae54a87	b8afa4e9-84f5-4803-ab76-f05c6d5be845	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	b8afa4e9-84f5-4803-ab76-f05c6d5be845	vehiclePrice	21.00	21950.00	\N	2025-11-12 15:51:36.382215
d7b95017-6a10-4490-8e47-e6f8513751d3	7125cc5e-995b-4539-9d33-7c958ae54a87	b8afa4e9-84f5-4803-ab76-f05c6d5be845	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	b8afa4e9-84f5-4803-ab76-f05c6d5be845	downPayment	0.00	2500.00	\N	2025-11-12 15:51:40.461285
4b1f5282-39af-4ff5-b459-c19f3119086f	7125cc5e-995b-4539-9d33-7c958ae54a87	b8afa4e9-84f5-4803-ab76-f05c6d5be845	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	b8afa4e9-84f5-4803-ab76-f05c6d5be845	tradeAllowance	0.00	2122.00	\N	2025-11-12 17:34:54.188606
a86bbb0e-0635-4c4f-8357-62fb9f784c43	4c533687-e779-4e0e-b071-5e393e74c7a5	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	4c533687-e779-4e0e-b071-5e393e74c7a5	\N	\N	\N	{"dealNumber": "pending"}	2025-11-12 17:38:50.021104
bf7c9b39-ff2f-4f29-9ef8-09c44d7db105	4c533687-e779-4e0e-b071-5e393e74c7a5	7b76baf8-7641-4bf1-8c89-0b821436ee1f	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	scenario	7b76baf8-7641-4bf1-8c89-0b821436ee1f	\N	\N	\N	{"name": "Scenario 2", "scenarioType": "FINANCE_DEAL"}	2025-11-12 17:39:04.300549
7c5a5ceb-a4a2-4c98-bbc9-441dc5df7691	e1ada750-2f1b-4514-a4d5-193dd7cdfef5	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	e1ada750-2f1b-4514-a4d5-193dd7cdfef5	\N	\N	\N	{"dealNumber": "pending"}	2025-11-12 17:40:28.915078
5964f573-f892-4f4f-bfc5-412a109d68f7	b93b6217-7c50-4297-8f05-3623c82eeb9d	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	b93b6217-7c50-4297-8f05-3623c82eeb9d	\N	\N	\N	{"dealNumber": "pending"}	2025-11-12 17:40:37.308833
f8e74c5b-51db-4e05-9787-4c093723771a	a572c315-e6de-4eb8-b5ac-231f911260a7	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	a572c315-e6de-4eb8-b5ac-231f911260a7	\N	\N	\N	{"dealNumber": "pending"}	2025-11-12 17:40:51.115127
5b28bfc2-dbc1-478b-bb0f-449434f4083f	09da03f5-021a-4681-8b9b-f7bca9e631d6	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	09da03f5-021a-4681-8b9b-f7bca9e631d6	\N	\N	\N	{"dealNumber": "pending"}	2025-11-12 17:48:41.487668
16c2a07e-f055-4a64-bbbd-12a1b4993f32	0fd6b26f-b723-436b-bc90-3b93ad2d4483	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	0fd6b26f-b723-436b-bc90-3b93ad2d4483	\N	\N	\N	{"dealNumber": "pending"}	2025-11-12 17:52:04.123439
6f7ddc35-65d8-49c4-85d3-68a591e1ffd0	88152ef0-7e2a-4bbc-9367-a923aa22eb74	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	88152ef0-7e2a-4bbc-9367-a923aa22eb74	\N	\N	\N	{"dealNumber": "pending"}	2025-11-12 17:54:39.659834
48e71dd6-39a4-4279-be39-8f2bb9aaccfa	808b140a-84b2-4b20-b21a-c9196e5efe8e	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	808b140a-84b2-4b20-b21a-c9196e5efe8e	\N	\N	\N	{"dealNumber": "pending"}	2025-11-12 18:16:52.821745
7bc7b86b-a07c-4df0-b0dd-c952581f3833	808b140a-84b2-4b20-b21a-c9196e5efe8e	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	deal	808b140a-84b2-4b20-b21a-c9196e5efe8e	\N	\N	\N	{"customerId": "684b63d5-d88f-409a-9f0b-625d82dc0577", "dealNumber": "0002#2", "customerAttached": true, "customerAttachedAt": "2025-11-12T18:17:17.604Z"}	2025-11-12 18:17:17.636961
ee6cb566-2d00-46ca-ba0a-0a54a449fa94	808b140a-84b2-4b20-b21a-c9196e5efe8e	20dd74a9-ee63-434f-b585-de651682b4e8	e77ab786-6ab4-43a5-b298-e15dccc27e29	apply_template	scenario	20dd74a9-ee63-434f-b585-de651682b4e8	\N	\N	\N	{"itemsAdded": {"dealerFees": 3, "accessories": 4, "aftermarketProducts": 3}, "templateId": "f467a6d1-1563-4fcc-9c9a-6e126e475232", "templateName": "Premium Package"}	2025-11-12 18:18:22.486428
ad039783-1947-4e5c-ad21-15cc2c5cf16f	35bdd1e4-1de6-42ee-a8a4-13ecc7b0e8dc	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	35bdd1e4-1de6-42ee-a8a4-13ecc7b0e8dc	\N	\N	\N	{"dealNumber": "pending"}	2025-11-12 19:15:41.538086
a3b8af6f-9893-4cd0-9e4a-917054de73a6	ff7f6722-2179-47a8-90c8-c7d97f72c370	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	ff7f6722-2179-47a8-90c8-c7d97f72c370	\N	\N	\N	{"dealNumber": "pending"}	2025-11-12 19:16:28.949701
05da79d4-5fba-4109-86bc-13703dd59a93	ff7f6722-2179-47a8-90c8-c7d97f72c370	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	deal	ff7f6722-2179-47a8-90c8-c7d97f72c370	\N	\N	\N	{"customerId": "250c337f-82b8-49e1-bbb5-0653a935fcaf", "dealNumber": "0003#3", "customerAttached": true, "customerAttachedAt": "2025-11-12T19:16:39.245Z"}	2025-11-12 19:16:39.280073
86fca794-ed62-480d-800b-8b16e2a049b0	ff7f6722-2179-47a8-90c8-c7d97f72c370	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	deal	ff7f6722-2179-47a8-90c8-c7d97f72c370	vehicleId		fad56871-a6ae-4313-a878-4967c60f984f	\N	2025-11-12 19:17:27.307113
55bc07a2-f7f7-4685-999c-e9b80ef6fb9a	ff7f6722-2179-47a8-90c8-c7d97f72c370	86dd53d2-6960-41f1-90d4-04cfddd26ae0	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	86dd53d2-6960-41f1-90d4-04cfddd26ae0	vehicleId		fad56871-a6ae-4313-a878-4967c60f984f	\N	2025-11-12 19:17:27.794055
e00a094d-72d6-4bc0-a037-4b933d8c8855	ff7f6722-2179-47a8-90c8-c7d97f72c370	86dd53d2-6960-41f1-90d4-04cfddd26ae0	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	86dd53d2-6960-41f1-90d4-04cfddd26ae0	vehiclePrice	0.00	38750.00	\N	2025-11-12 19:17:27.875305
1ce48997-ec4e-4946-b3c9-ddb034b4cc9e	fa8c9da5-54cd-4537-a4dc-9c302a21144b	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	fa8c9da5-54cd-4537-a4dc-9c302a21144b	\N	\N	\N	{"dealNumber": "pending"}	2025-11-12 19:18:57.238045
610ad09d-9d0f-486f-ae6c-d38109c3e144	fa8c9da5-54cd-4537-a4dc-9c302a21144b	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	deal	fa8c9da5-54cd-4537-a4dc-9c302a21144b	vehicleId		bc1abb8d-dd67-4c64-92ce-abb0f3dd7777	\N	2025-11-12 19:38:30.186459
8598d407-7265-4840-bbde-3509c5c4cb07	fa8c9da5-54cd-4537-a4dc-9c302a21144b	34a561ad-0b4a-4807-ab84-acd2f6b1b973	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	34a561ad-0b4a-4807-ab84-acd2f6b1b973	vehicleId		bc1abb8d-dd67-4c64-92ce-abb0f3dd7777	\N	2025-11-12 19:38:30.652946
7d995296-1b2e-4d8c-9360-f3d516029cc4	fa8c9da5-54cd-4537-a4dc-9c302a21144b	34a561ad-0b4a-4807-ab84-acd2f6b1b973	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	34a561ad-0b4a-4807-ab84-acd2f6b1b973	vehiclePrice	0.00	32500.00	\N	2025-11-12 19:38:30.728662
06ef1bf7-9d75-4b93-b5c7-cd590d518dc4	04aca4df-bc1c-4359-9dd6-5d72df8aa15f	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	04aca4df-bc1c-4359-9dd6-5d72df8aa15f	\N	\N	\N	{"dealNumber": "pending"}	2025-11-12 19:57:01.186604
2c56251b-bfaa-4d4a-b1c6-b7ad27b22e0a	04aca4df-bc1c-4359-9dd6-5d72df8aa15f	3cae01b3-4780-43db-86ae-09ed821440e6	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	scenario	3cae01b3-4780-43db-86ae-09ed821440e6	\N	\N	\N	{"name": "Scenario 2", "scenarioType": "FINANCE_DEAL"}	2025-11-12 19:57:20.694443
a6bfa167-3502-48c1-86df-6ed1315a4ae6	04aca4df-bc1c-4359-9dd6-5d72df8aa15f	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	deal	04aca4df-bc1c-4359-9dd6-5d72df8aa15f	vehicleId		bc1abb8d-dd67-4c64-92ce-abb0f3dd7777	\N	2025-11-12 19:57:29.686459
fb112401-6a07-4aa7-9e1e-e033bd779c0e	04aca4df-bc1c-4359-9dd6-5d72df8aa15f	df8ef3fe-b073-4203-926d-3f961d2dd1bf	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	df8ef3fe-b073-4203-926d-3f961d2dd1bf	vehicleId		bc1abb8d-dd67-4c64-92ce-abb0f3dd7777	\N	2025-11-12 19:57:30.172659
f0aff424-eac4-4cc2-b038-eadb30abac02	04aca4df-bc1c-4359-9dd6-5d72df8aa15f	df8ef3fe-b073-4203-926d-3f961d2dd1bf	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	df8ef3fe-b073-4203-926d-3f961d2dd1bf	vehiclePrice	0.00	32500.00	\N	2025-11-12 19:57:30.24852
fae463c2-ab81-4754-ab2e-384c403d6dd4	808b140a-84b2-4b20-b21a-c9196e5efe8e	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	deal	808b140a-84b2-4b20-b21a-c9196e5efe8e	vehicleId		bc1abb8d-dd67-4c64-92ce-abb0f3dd7777	\N	2025-11-12 20:44:16.243524
0c080b8f-9d42-4366-b5ed-1fb225ef0526	808b140a-84b2-4b20-b21a-c9196e5efe8e	20dd74a9-ee63-434f-b585-de651682b4e8	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	20dd74a9-ee63-434f-b585-de651682b4e8	vehicleId		bc1abb8d-dd67-4c64-92ce-abb0f3dd7777	\N	2025-11-12 20:44:16.771311
2c19e1aa-cdb1-4104-b82d-bf4fcc6c3c1a	808b140a-84b2-4b20-b21a-c9196e5efe8e	20dd74a9-ee63-434f-b585-de651682b4e8	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	20dd74a9-ee63-434f-b585-de651682b4e8	vehiclePrice	0.00	32500.00	\N	2025-11-12 20:44:16.845268
2c3a6eda-b8c7-4047-a759-1348ad4e2d07	808b140a-84b2-4b20-b21a-c9196e5efe8e	20dd74a9-ee63-434f-b585-de651682b4e8	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	20dd74a9-ee63-434f-b585-de651682b4e8	downPayment	0.00	3250.00	\N	2025-11-12 20:44:33.269684
0cea7c44-2595-49c7-be1c-74804bee6561	808b140a-84b2-4b20-b21a-c9196e5efe8e	20dd74a9-ee63-434f-b585-de651682b4e8	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	20dd74a9-ee63-434f-b585-de651682b4e8	tradeAllowance	0.00	1055.00	\N	2025-11-12 20:44:39.155709
eeabe5cc-52d6-47e5-a7af-555ea80ad3f6	808b140a-84b2-4b20-b21a-c9196e5efe8e	20dd74a9-ee63-434f-b585-de651682b4e8	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	20dd74a9-ee63-434f-b585-de651682b4e8	tradeAllowance	1055.00	10555.00	\N	2025-11-12 20:44:41.871368
23abdcb3-4cc8-49c0-aaf7-7ee82f2d920d	808b140a-84b2-4b20-b21a-c9196e5efe8e	20dd74a9-ee63-434f-b585-de651682b4e8	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	20dd74a9-ee63-434f-b585-de651682b4e8	tradePayoff	0.00	8800.00	\N	2025-11-12 20:44:44.49268
bc93a768-3a0c-4bbc-b5c4-41b5d1292e1d	808b140a-84b2-4b20-b21a-c9196e5efe8e	20dd74a9-ee63-434f-b585-de651682b4e8	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	20dd74a9-ee63-434f-b585-de651682b4e8	apr	8.9000	5.0000	\N	2025-11-12 20:44:51.072021
3047c6ce-3623-464f-9127-5e8d4a47e3fb	808b140a-84b2-4b20-b21a-c9196e5efe8e	20dd74a9-ee63-434f-b585-de651682b4e8	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	20dd74a9-ee63-434f-b585-de651682b4e8	term	60	72	\N	2025-11-12 20:44:56.577835
f56dff91-22fa-4c54-9f5a-c4e04e95eba4	f1971287-3771-4b5b-84f4-bf3cfc38b579	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	f1971287-3771-4b5b-84f4-bf3cfc38b579	\N	\N	\N	{"dealNumber": "pending"}	2025-11-12 20:55:13.823038
723c86dc-4f1e-450f-a571-fa0fb6c9c1a6	ac5ded90-6ca9-4bcc-af0a-cbf5cc9fa345	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	ac5ded90-6ca9-4bcc-af0a-cbf5cc9fa345	\N	\N	\N	{"dealNumber": "pending"}	2025-11-12 21:45:46.803213
8ca4f6c7-6d32-4d45-8296-7141ae29d354	0ce1d6da-158b-4c73-a169-f18b19629e44	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	0ce1d6da-158b-4c73-a169-f18b19629e44	\N	\N	\N	{"dealNumber": "pending"}	2025-11-12 22:11:24.364846
7d282472-bc77-4709-b0ef-87591035cfd7	ac5ded90-6ca9-4bcc-af0a-cbf5cc9fa345	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	deal	ac5ded90-6ca9-4bcc-af0a-cbf5cc9fa345	\N	\N	\N	{"customerId": "be523e44-95ff-4e9d-a58d-3850259e54bf", "dealNumber": "0004#4", "customerAttached": true, "customerAttachedAt": "2025-11-12T23:14:26.321Z"}	2025-11-12 23:14:26.355382
5c6cb85a-4a63-4b26-a0a5-1ae12e8dfead	ac5ded90-6ca9-4bcc-af0a-cbf5cc9fa345	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	deal	ac5ded90-6ca9-4bcc-af0a-cbf5cc9fa345	vehicleId		bc1abb8d-dd67-4c64-92ce-abb0f3dd7777	\N	2025-11-12 23:14:32.605114
bd5b3502-f56b-4361-bea4-8acc345dee59	ac5ded90-6ca9-4bcc-af0a-cbf5cc9fa345	e25aa3de-84e9-4ed8-8759-83d92244161b	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	e25aa3de-84e9-4ed8-8759-83d92244161b	vehicleId		bc1abb8d-dd67-4c64-92ce-abb0f3dd7777	\N	2025-11-12 23:14:33.152143
83d2176a-1bfe-4655-bc5d-949d31101479	ac5ded90-6ca9-4bcc-af0a-cbf5cc9fa345	e25aa3de-84e9-4ed8-8759-83d92244161b	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	e25aa3de-84e9-4ed8-8759-83d92244161b	vehiclePrice	0.00	32500.00	\N	2025-11-12 23:14:33.234348
7f4be42c-ab57-4eff-a4fa-88b062738c60	dd9035ea-ac5c-42cb-97fc-6f665b2c62e5	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	dd9035ea-ac5c-42cb-97fc-6f665b2c62e5	\N	\N	\N	{"dealNumber": "pending"}	2025-11-17 09:34:17.360696
e3f81008-b530-4018-bdae-f98dae07d703	419fa509-e471-48dd-915d-2741b6707eeb	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	419fa509-e471-48dd-915d-2741b6707eeb	\N	\N	\N	{"dealNumber": "pending"}	2025-11-17 09:35:28.903448
f4edc27c-083e-4eb4-8728-370988f72383	d6f8a128-8c92-410b-b052-cc50e053b839	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	d6f8a128-8c92-410b-b052-cc50e053b839	\N	\N	\N	{"dealNumber": "pending"}	2025-11-17 10:16:32.176995
16fb081f-2684-4d1c-a5eb-307d1e759e53	7ee8eb3c-234e-4af6-a579-49e664daf977	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	7ee8eb3c-234e-4af6-a579-49e664daf977	\N	\N	\N	{"dealNumber": "pending"}	2025-11-17 10:17:13.413138
1c4a418a-ea0b-463a-9734-91665b3a6c38	124e7866-14a3-444c-80bd-8845fac8e6b1	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	create	deal	124e7866-14a3-444c-80bd-8845fac8e6b1	\N	\N	\N	{"dealNumber": "pending"}	2025-11-18 00:59:23.355879
128b9001-1a73-48e7-a0ed-def0dfc3b8b6	124e7866-14a3-444c-80bd-8845fac8e6b1	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	deal	124e7866-14a3-444c-80bd-8845fac8e6b1	vehicleId		207a1c12-2485-431b-a3f2-470b647336cc	\N	2025-11-18 00:59:36.381903
fb125a5d-4059-4a47-842e-1419f3b2d3f6	124e7866-14a3-444c-80bd-8845fac8e6b1	026cc5dc-49d6-41d7-a28f-4937b1fcdebf	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	026cc5dc-49d6-41d7-a28f-4937b1fcdebf	vehicleId		207a1c12-2485-431b-a3f2-470b647336cc	\N	2025-11-18 00:59:36.795084
c69222e4-6385-49f1-85e0-ec591e198fe7	124e7866-14a3-444c-80bd-8845fac8e6b1	026cc5dc-49d6-41d7-a28f-4937b1fcdebf	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	026cc5dc-49d6-41d7-a28f-4937b1fcdebf	vehiclePrice	0.00	28500.00	\N	2025-11-18 00:59:36.869894
a1db4b15-287c-4931-862f-1a960b6e9de2	124e7866-14a3-444c-80bd-8845fac8e6b1	026cc5dc-49d6-41d7-a28f-4937b1fcdebf	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	026cc5dc-49d6-41d7-a28f-4937b1fcdebf	downPayment	0.00	3500.00	\N	2025-11-18 00:59:49.433347
f66e7f23-45b4-40e5-96c7-c9744c4ee63f	124e7866-14a3-444c-80bd-8845fac8e6b1	026cc5dc-49d6-41d7-a28f-4937b1fcdebf	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	026cc5dc-49d6-41d7-a28f-4937b1fcdebf	tradeAllowance	0.00	16500.00	\N	2025-11-18 00:59:57.355997
065d82c4-0a07-4c06-8aa0-7905c6084215	124e7866-14a3-444c-80bd-8845fac8e6b1	026cc5dc-49d6-41d7-a28f-4937b1fcdebf	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	026cc5dc-49d6-41d7-a28f-4937b1fcdebf	tradePayoff	0.00	1277.00	\N	2025-11-18 00:59:59.17613
037099ce-855a-4a5b-a20b-2a3ea63242f5	124e7866-14a3-444c-80bd-8845fac8e6b1	026cc5dc-49d6-41d7-a28f-4937b1fcdebf	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	026cc5dc-49d6-41d7-a28f-4937b1fcdebf	tradePayoff	1277.00	12775.00	\N	2025-11-18 01:00:01.385396
0aed3e6d-18af-4702-a2b3-012a746c102c	124e7866-14a3-444c-80bd-8845fac8e6b1	026cc5dc-49d6-41d7-a28f-4937b1fcdebf	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	026cc5dc-49d6-41d7-a28f-4937b1fcdebf	moneyFactor	0.000000	0.001254	\N	2025-11-18 17:31:07.076591
dbb41e54-59fb-4dab-a0d0-c37f5e02b702	124e7866-14a3-444c-80bd-8845fac8e6b1	026cc5dc-49d6-41d7-a28f-4937b1fcdebf	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	026cc5dc-49d6-41d7-a28f-4937b1fcdebf	moneyFactor	0.001254	0.003500	\N	2025-11-18 17:31:12.507669
10e60411-aa20-4bef-8f59-03487539e945	124e7866-14a3-444c-80bd-8845fac8e6b1	026cc5dc-49d6-41d7-a28f-4937b1fcdebf	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	026cc5dc-49d6-41d7-a28f-4937b1fcdebf	term	60	36	\N	2025-11-18 17:31:14.243337
2d800455-05a0-45b6-b22b-4356393a4e40	124e7866-14a3-444c-80bd-8845fac8e6b1	026cc5dc-49d6-41d7-a28f-4937b1fcdebf	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	026cc5dc-49d6-41d7-a28f-4937b1fcdebf	residualValue	0.00	25067.00	\N	2025-11-18 17:31:40.976243
50c2fabf-234d-491e-91a8-bf52be934eb2	124e7866-14a3-444c-80bd-8845fac8e6b1	026cc5dc-49d6-41d7-a28f-4937b1fcdebf	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	026cc5dc-49d6-41d7-a28f-4937b1fcdebf	tradeAllowance	16500.00	8800.00	\N	2025-11-18 17:32:04.757301
b205a98b-1f22-490d-afb8-ea87202a6507	124e7866-14a3-444c-80bd-8845fac8e6b1	026cc5dc-49d6-41d7-a28f-4937b1fcdebf	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	026cc5dc-49d6-41d7-a28f-4937b1fcdebf	tradePayoff	12775.00	1140.00	\N	2025-11-18 17:32:07.633818
577b3d9e-0c02-47cb-9423-ab72804fbb78	124e7866-14a3-444c-80bd-8845fac8e6b1	026cc5dc-49d6-41d7-a28f-4937b1fcdebf	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	026cc5dc-49d6-41d7-a28f-4937b1fcdebf	tradePayoff	1140.00	11440.00	\N	2025-11-18 21:52:56.586571
9ee2cda9-b373-42f9-bcf2-653ad80fc416	124e7866-14a3-444c-80bd-8845fac8e6b1	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	state_change	deal	124e7866-14a3-444c-80bd-8845fac8e6b1	dealState	DRAFT	IN_PROGRESS	\N	2025-11-18 21:54:35.949616
ae3c9e01-90e8-498c-bc3d-3b7f432e58a2	124e7866-14a3-444c-80bd-8845fac8e6b1	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	state_change	deal	124e7866-14a3-444c-80bd-8845fac8e6b1	dealState	IN_PROGRESS	IN_PROGRESS	\N	2025-11-18 21:54:36.532134
3396bc6b-9623-4f2b-921b-3c957dac1237	7ee8eb3c-234e-4af6-a579-49e664daf977	400f933b-c173-4e7d-836a-ebdcd56fc6f9	e77ab786-6ab4-43a5-b298-e15dccc27e29	update	scenario	400f933b-c173-4e7d-836a-ebdcd56fc6f9	term	60	36	\N	2025-11-18 22:22:08.477451
\.


--
-- Data for Name: customer_history; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.customer_history (id, customer_id, user_id, action, entity_type, field_name, old_value, new_value, description, metadata, "timestamp") FROM stdin;
\.


--
-- Data for Name: customer_notes; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.customer_notes (id, customer_id, user_id, dealership_id, content, note_type, is_important, created_at, updated_at, deal_id) FROM stdin;
\.


--
-- Data for Name: customer_vehicles; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.customer_vehicles (id, customer_id, year, make, model, "trim", vin, mileage, color, notes, is_primary, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.customers (id, first_name, last_name, email, phone, address, city, state, zip_code, created_at, updated_at, customer_number, dealership_id, date_of_birth, drivers_license_number, drivers_license_state, notes, ssn_last4, employer, occupation, monthly_income, credit_score, preferred_contact_method, marketing_opt_in, photo_url, license_image_url, current_vehicle_year, current_vehicle_make, current_vehicle_model, current_vehicle_trim, current_vehicle_vin, current_vehicle_mileage, current_vehicle_color, trade_allowance, trade_acv, trade_payoff, trade_payoff_to, status) FROM stdin;
f47dd659-3b05-4db9-b874-532d240b34ca	David	Martinez	david.martinez@email.com	(555) 345-6789	789 Elm St	San Diego	CA	92101	2025-11-09 21:45:40.158644	2025-11-09 21:45:40.158644	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
1b956789-0dda-497b-b91d-4f366bb4e1fd	Quick	Quote Customer	\N	\N	\N	\N	\N	\N	2025-11-11 03:49:30.128975	2025-11-11 03:49:30.128975	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
de37363f-7fae-4e10-af63-e0ccc652a9a9	Quick	Quote Customer	\N	\N	\N	\N	\N	\N	2025-11-11 03:50:38.627388	2025-11-11 03:50:38.627388	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
fa25c9bc-3388-4c70-8331-0dd396ef53c7	Quick	Quote Customer	\N	\N	\N	\N	\N	\N	2025-11-11 03:54:37.458662	2025-11-11 03:54:37.458662	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
f278e5f7-ab65-4db1-bf0a-9064132b0fd1	Michael	Anderson	michael.anderson@email.com	(555) 123-4567	123 Main St	Los Angeles	CA	90001	2025-11-09 21:45:40.158644	2025-11-09 21:45:40.158644	\N	01352975-68e7-42bc-8e7b-0717ada55277	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
b47acef7-8e16-4a43-be1d-7a78c0668f8e	John	Doe	john.doe@example.com	(555) 555-5555	123 Main Street	Los Angeles	CA	90001	2025-11-09 21:57:19.277704	2025-11-09 21:57:19.277704	\N	7b2c9fbf-c62f-49d2-9f1c-4317be4c08a1	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
73ab9059-044b-4f3e-9d95-d2dacc83a5fd	John	Doe	john.doe@example.com	(555) 555-5555	123 Main Street	Los Angeles	CA	90001	2025-11-09 22:00:05.638473	2025-11-09 22:00:05.638473	\N	4f0e8920-52d0-4ca4-be85-f0cd85cc4a31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
adb4dccb-407b-451d-b4c7-277914509a4b	John	Doe	john.doe@example.com	(555) 555-5555	123 Main Street	Los Angeles	CA	90001	2025-11-09 22:02:27.439806	2025-11-09 22:02:27.439806	\N	abaa7134-0514-4d44-beb6-0b0e73b8105f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
82266e4f-dfc4-4aa6-9531-97edbcfdd3b0	John	Doe	john.doe@example.com	(555) 555-5555	123 Main Street	Los Angeles	CA	90001	2025-11-09 22:06:59.265848	2025-11-09 22:06:59.265848	\N	a9b7c636-1e5a-4f69-945b-16424c80668b	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
9a1b9ef8-6b95-4792-89b0-af71e38b02f4	John	Doe	john.doe@example.com	(555) 555-5555	123 Main Street	Los Angeles	CA	90001	2025-11-09 22:06:59.811991	2025-11-09 22:06:59.811991	\N	08ea5ef4-6a30-44f4-9677-9be22e230c46	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
4fd4e666-a593-435f-902e-b17eafd1ea7a	John	Doe	john.doe@example.com	(555) 555-5555	123 Main Street	Los Angeles	CA	90001	2025-11-09 23:52:10.825605	2025-11-09 23:52:10.825605	\N	d33d47d2-c609-412c-b3cb-5e1c7b4c7590	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
dbe221ed-b2c8-4921-a8e2-5c697c2f9034	John	Doe	john.doe@example.com	(555) 555-5555	123 Main Street	Los Angeles	CA	90001	2025-11-10 00:12:38.266342	2025-11-10 00:12:38.266342	\N	2baf1b3e-700f-4ffc-b855-ff5c3b528001	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
cb0523d0-0704-4bd1-bc24-13044572de58	John	Doe	john.doe@example.com	(555) 555-5555	123 Main Street	Los Angeles	CA	90001	2025-11-10 12:09:20.729701	2025-11-10 12:09:20.729701	\N	53c64749-6aa5-4aa4-b2e3-97eeb2ab8ac0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
c62edcd8-1cd4-4b94-90e5-1faefbaf34bc	John	Doe	john.doe@example.com	(555) 555-5555	123 Main Street	Los Angeles	CA	90001	2025-11-10 17:17:12.825657	2025-11-10 17:17:12.825657	\N	7f9e6c70-78bf-452c-babb-8f593d3965c5	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
769fc405-5ff9-4851-831d-5cd75090ab2d	John	Doe	john.doe@example.com	(555) 555-5555	123 Main Street	Los Angeles	CA	90001	2025-11-10 17:37:50.625038	2025-11-10 17:37:50.625038	\N	1c5b8775-13c5-44b0-88b4-7d25af095e10	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
054bc16d-662a-435d-9b17-bd01d2ce21ac	John	Doe	john.doe@example.com	(555) 555-5555	123 Main Street	Los Angeles	CA	90001	2025-11-10 18:58:20.935753	2025-11-10 18:58:20.935753	\N	fca36663-dad1-423d-9e70-d9355084d1c0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
cde2b578-9e39-4cd0-b220-b3278a57d103	John	Doe	john.doe@example.com	(555) 555-5555	123 Main Street	Los Angeles	CA	90001	2025-11-10 20:03:02.019108	2025-11-10 20:03:02.019108	\N	3effd1ae-f72b-4811-ae51-ad042ca6fb1d	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
483e469a-92ff-4dd3-a6e8-cf85a220d51c	John	Doe	john.doe@example.com	(555) 555-5555	123 Main Street	Los Angeles	CA	90001	2025-11-10 21:34:15.682327	2025-11-10 21:34:15.682327	\N	9fbe4a78-1a1b-4896-980f-b93db6fae882	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
7e5e0ea7-9321-4534-bfb7-b069bf457a9c	John	Doe	john.doe@example.com	(555) 555-5555	123 Main Street	Los Angeles	CA	90001	2025-11-10 21:38:42.126908	2025-11-10 21:38:42.126908	\N	49ef63c9-1540-45c9-b35e-0800e54c2d6b	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
a386d0b5-962d-41cd-914b-90a74f27a45d	John	Doe	john.doe@example.com	(555) 555-5555	123 Main Street	Los Angeles	CA	90001	2025-11-10 23:00:58.972328	2025-11-10 23:00:58.972328	\N	caf61794-5684-4e96-b22e-94431a6fc290	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
af19e89a-d4dc-4ba9-a175-3cd903c13a9f	John	Doe	john.doe@example.com	(555) 555-5555	123 Main Street	Los Angeles	CA	90001	2025-11-10 23:05:39.327438	2025-11-10 23:05:39.327438	\N	5910b18b-f6a3-4ffc-ba76-c847eee06832	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
be523e44-95ff-4e9d-a58d-3850259e54bf	Jennifer	Williams	jennifer.williams@email.com	(555) 234-5678	456 Oak Ave	San Francisco	CA	94102	2025-11-09 21:45:40.158644	2025-11-19 00:11:03.986	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	active
93e3e975-d70f-4da2-b4ae-930b1de3a382	John	Doe	john.doe@example.com	(555) 555-5555	123 Main Street	Los Angeles	CA	90001	2025-11-09 21:55:31.133874	2025-11-19 00:11:11.243	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	sold
0424f086-6b3c-46be-86b9-14711627d9b4	John	Doe	john.doe@example.com	(555) 555-5555	123 Main Street	Los Angeles	CA	90001	2025-11-10 23:12:08.914801	2025-11-10 23:12:08.914801	\N	e62d4104-264d-43c8-b5d1-2bc08908095e	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
afceaee2-3d9e-4b79-b732-2239d287be0a	John	Doe	john.doe@example.com	(555) 555-5555	123 Main Street	Los Angeles	CA	90001	2025-11-10 23:16:19.172064	2025-11-10 23:16:19.172064	\N	53a086de-6bc0-43e7-8b37-e1cdce26a512	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
1c071319-41fd-48f0-abbd-aadaec9d20c8	John	Doe	john.doe@example.com	(555) 555-5555	123 Main Street	Los Angeles	CA	90001	2025-11-10 23:25:05.253276	2025-11-10 23:25:05.253276	\N	9619591b-563e-44a2-8bc9-792e5e3594fd	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
76896ba3-6fa4-4224-afa1-fd154ff78e9b	John	Doe	john.doe@example.com	(555) 555-5555	123 Main Street	Los Angeles	CA	90001	2025-11-10 23:37:46.952939	2025-11-10 23:37:46.952939	\N	ae79bb32-de59-4c15-833c-9734fa76fc7e	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
b8314cf6-804e-42e8-8014-440a034e496b	John	Doe	john.doe@example.com	(555) 555-5555	123 Main Street	Los Angeles	CA	90001	2025-11-10 23:40:49.781772	2025-11-10 23:40:49.781772	\N	ba8c41c1-5d58-4d2f-b799-25b5804d7391	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
8ed246f0-61d9-4820-b6bf-5349fd7e1b53	John	Doe	john.doe@example.com	(555) 555-5555	123 Main Street	Los Angeles	CA	90001	2025-11-11 02:51:37.551216	2025-11-11 02:51:37.551216	\N	af2440cd-6faa-4817-a837-adc095e42d9e	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
c9c80d0b-d4f8-47c8-a3c7-f1d9af54c0f8	John	Doe	john.doe@example.com	(555) 555-5555	123 Main Street	Los Angeles	CA	90001	2025-11-11 02:53:59.964049	2025-11-11 02:53:59.964049	\N	2ec268ff-1d32-4712-8b54-760e5233c7cf	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
d5d16cd6-0b8f-415c-8573-8448baa5f2a1	John	Doe	john.doe@example.com	(555) 555-5555	123 Main Street	Los Angeles	CA	90001	2025-11-11 03:11:40.624883	2025-11-11 03:11:40.624883	\N	b16b641d-bc7e-4552-90f1-afd2bcc54139	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
be43b9b8-9713-4db4-b52d-16cc5fce1441	Quick	Quote Customer	\N	\N	\N	\N	\N	\N	2025-11-11 03:23:16.608408	2025-11-11 03:23:16.608408	\N	8df70435-e1f7-4ddb-ab48-1c15bfe3020d	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
18503373-d376-40b8-b267-4c18e0b57300	Quick	Quote Customer	\N	\N	\N	\N	\N	\N	2025-11-11 03:57:46.644513	2025-11-11 03:57:46.644513	\N	f8a5b57f-abba-4054-a59e-08099456187f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
3fb479db-f90a-45c1-bd4a-3fa6aad13bcd	Quick	Quote Customer	\N	\N	\N	\N	\N	\N	2025-11-11 04:00:57.805942	2025-11-11 04:00:57.805942	\N	8cc8b4c8-4df9-4a62-86c4-528981a47e1d	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
2471ea92-c929-4806-afc3-1de9022f2f17	Quick	Quote Customer	\N	\N	\N	\N	\N	\N	2025-11-11 04:03:25.254935	2025-11-11 04:03:25.254935	\N	2506cbfb-c626-49cd-b930-7af11b99967c	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
ff18862a-1571-46ae-a418-4e4cbcf44781	Quick	Quote Customer	\N	\N	\N	\N	\N	\N	2025-11-11 04:05:57.454294	2025-11-11 04:05:57.454294	\N	9b9b7787-9b52-4a85-9d4f-9d68d5db544d	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
0cd43a0b-b2f4-4c30-9999-0c942e3bbdf6	Quick	Quote Customer	\N	\N	\N	\N	\N	\N	2025-11-11 04:07:53.403722	2025-11-11 04:07:53.403722	\N	1c9e30a3-7349-43f3-aa32-dd2097267255	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
d34bd79d-c58e-401a-bad1-1c0941d73abb	John	Doe	john.doe@example.com	(555) 555-5555	123 Main Street	Los Angeles	CA	90001	2025-11-11 13:29:07.834408	2025-11-11 13:29:07.834408	\N	f4bd5d51-0933-457d-bac8-b0fa87ef7489	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
e0f96b2b-ce5b-4565-8e50-babc0ad4cec6	Quick	Quote Customer	\N	\N	\N	\N	\N	\N	2025-11-11 13:32:17.893614	2025-11-11 13:32:17.893614	\N	a94b5b09-74ab-4856-9612-9397a4460d32	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
6f126740-e432-4eff-83bc-a03efa1bf790	MultiTenant	TestCustomer_bivy	mttest_BZxHmx@example.com	(555) 999-8888	\N	\N	\N	\N	2025-11-12 13:32:16.041889	2025-11-12 13:32:16.041889	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
250c337f-82b8-49e1-bbb5-0653a935fcaf	Test	Customer_XLuq	test_d6vNP0@example.com	(555) 000-0000	\N	\N	\N	\N	2025-11-12 13:35:25.602191	2025-11-12 13:35:25.602191	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
b0595e9d-5af6-499d-8ed9-cae4f86259e1	Alice	TestCustomer	alice_h9am@example.com	(555) 111-2222	\N	\N	\N	\N	2025-11-12 13:39:01.932459	2025-11-12 13:39:01.932459	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
684b63d5-d88f-409a-9f0b-625d82dc0577	John	Doe	acwilliams.18@gmail.com						2025-11-12 18:17:16.797696	2025-11-12 18:17:16.797696	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	prospect
\.


--
-- Data for Name: deal_number_sequences; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.deal_number_sequences (id, dealership_id, current_sequence, updated_at) FROM stdin;
5495f1ed-2176-478e-bd2a-098cf6f48dff	fa136a38-696a-47b6-ac26-c184cc6ebe46	4	2025-11-12 23:14:25.965914
\.


--
-- Data for Name: deal_scenarios; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.deal_scenarios (id, deal_id, scenario_type, name, vehicle_price, down_payment, apr, term, money_factor, residual_value, residual_percent, trade_allowance, trade_payoff, dealer_fees, accessories, tax_jurisdiction_id, total_tax, total_fees, amount_financed, monthly_payment, total_cost, created_at, updated_at, aftermarket_products, cash_due_at_signing, vehicle_id, trade_vehicle_id, is_quick_quote, origin_tax_state, origin_tax_amount, origin_tax_paid_date, msrp, selling_price, acquisition_fee, acquisition_fee_capitalized, doc_fee_capitalized, government_fees, cash_down, manufacturer_rebate, other_incentives) FROM stdin;
42a2b0c7-17bf-4201-a1b0-1bc004414332	0107cc84-0274-45cf-99b1-16e3c27a4b38	FINANCE_DEAL	Finance - 60 Month	32500.00	5000.00	4.9900	60	0.000000	0.00	0.00	0.00	0.00	[{"name": "Doc Fee", "amount": 85, "taxable": false}, {"name": "Registration", "amount": 65, "taxable": false}]	[]	d27e7c45-7062-4dd8-9e6e-694384b85a76	2106.88	150.00	29756.88	559.17	33550.20	2025-11-09 21:45:40.483601	2025-11-09 21:45:40.483601	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
012797c0-1561-4ba9-a44a-a0b97bc64196	0107cc84-0274-45cf-99b1-16e3c27a4b38	LEASE_DEAL	Lease - 36 Month	32500.00	3000.00	0.0000	36	0.001250	19500.00	60.00	0.00	0.00	[{"name": "Doc Fee", "amount": 85, "taxable": false}]	[]	d27e7c45-7062-4dd8-9e6e-694384b85a76	2106.88	85.00	31691.88	427.50	15390.00	2025-11-09 21:45:40.563648	2025-11-09 21:45:40.563648	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
e4939478-4613-4031-ad15-5ef11878d510	40373374-fc48-4bba-ac02-e86a2a91c281	FINANCE_DEAL	Finance - 60 Month	28500.00	5000.00	4.9900	60	0.000000	0.00	0.00	0.00	0.00	[{"name": "Doc Fee", "amount": 85, "taxable": false}]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-09 21:57:19.799452	2025-11-09 21:57:19.799452	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
7acffa78-ac30-4641-9d50-261a750de6b9	ddb51922-a4b0-4f16-8ada-ed97fb908aa7	FINANCE_DEAL	Finance - 60 Month	28500.00	5000.00	4.9900	60	0.000000	0.00	0.00	0.00	0.00	[{"name": "Doc Fee", "amount": 85, "taxable": false}]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-09 22:00:06.146164	2025-11-09 22:00:06.146164	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
28229a29-4634-4112-bb0a-b54fbc09b9d6	55f7b893-ae29-4a40-9554-bcdbb90917a7	FINANCE_DEAL	Finance - 60 Month	28500.00	5000.00	4.9900	60	0.000000	0.00	0.00	0.00	0.00	[{"name": "Doc Fee", "amount": 85, "taxable": false}]	[]	\N	2137.50	85.00	25722.50	485.30	29117.85	2025-11-09 22:02:27.964723	2025-11-09 22:02:28.912	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
cd09a550-77ec-46eb-869d-797fee5350dc	a3a41793-6361-4183-a71a-e74ed3da30bc	FINANCE_DEAL	Finance - 60 Month	28500.00	5000.00	4.9900	60	0.000000	0.00	0.00	0.00	0.00	[{"name": "Doc Fee", "amount": 85, "taxable": false}]	[]	\N	2137.50	85.00	25722.50	485.30	29117.85	2025-11-09 22:06:59.963723	2025-11-09 22:07:00.983	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
2dcb695a-cb21-412f-9f1d-46a68b8e2a0f	ddde470c-8b40-4650-980e-ce70d57240fb	FINANCE_DEAL	Finance - 60 Month	28500.00	5000.00	5.9900	60	0.000000	0.00	0.00	0.00	0.00	[{"name": "Doc Fee", "amount": 85, "taxable": false}]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-10 00:12:39.056804	2025-11-10 00:12:39.056804	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
edc919aa-9c5d-4a29-b135-3bb86051b431	d3c1f6db-4c23-49e1-b6bd-5d3346024967	FINANCE_DEAL	Finance - 60 Month	28500.00	5000.00	4.9900	60	0.000000	0.00	0.00	0.00	0.00	[{"name": "Doc Fee", "amount": 85, "taxable": false}]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-10 12:09:21.387383	2025-11-10 12:09:21.387383	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
ec92d094-92e6-484b-9f5a-006d41e092f0	5db6cd65-ec72-4563-b046-16676ec0a0b8	FINANCE_DEAL	Finance - 60 Month	28500.00	5000.00	4.9900	60	0.000000	0.00	0.00	0.00	0.00	[{"name": "Doc Fee", "amount": 85, "taxable": false}]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-10 17:17:13.544369	2025-11-10 17:17:13.544369	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
e2edff0e-27df-47b9-92f5-9f78239fc310	244e57f1-dddf-4230-b1d2-810f1da44fd7	FINANCE_DEAL	Finance - 60 Month	28500.00	5000.00	4.9900	60	0.000000	0.00	0.00	0.00	0.00	[{"name": "Doc Fee", "amount": 85, "taxable": false}]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-10 17:37:51.330941	2025-11-10 17:37:51.330941	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
7620d1bc-3aaa-4d16-98fc-c8a0bd0a70e1	c634f9c7-c23c-4bda-a9fd-3915c1058515	FINANCE_DEAL	Finance - 60 Month	28500.00	5000.00	4.9900	60	0.000000	0.00	0.00	0.00	0.00	[{"name": "Doc Fee", "amount": 85, "taxable": false}]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-10 23:00:59.614531	2025-11-10 23:01:31.383	[{"cost": "800", "name": "Extended Warranty", "price": "1500"}, {"cost": "300", "name": "Gap Insurance", "price": "695"}]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
75735ae5-6cc0-4b52-b4c9-3ddcf99ba8ea	c19912cc-1217-43b2-8ff9-e0e16d455bc6	FINANCE_DEAL	Finance - 60 Month	3.01	5000.00	4.9900	60	0.000000	0.00	0.00	0.00	0.00	[{"name": "Doc Fee", "amount": 85, "taxable": false}]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-10 23:05:39.898305	2025-11-10 23:08:50.833	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
6f688c83-d1a6-4737-9a6b-616bf3a8a25a	d1ee8fe0-306f-417f-91ba-aeb5ce7144a9	FINANCE_DEAL	Finance - 60 Month	28500.00	5000.00	4.9900	60	0.000000	0.00	0.00	0.00	0.00	[{"name": "Doc Fee", "amount": 85, "taxable": false}]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-10 23:12:09.573426	2025-11-10 23:12:09.573426	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
626c8e7a-7db8-4115-b468-dfbc9d028d3d	1bcd4273-d86b-47c8-91c1-10d6f5750a7e	FINANCE_DEAL	Finance - 60 Month	28500.00	5000.00	4.9900	60	0.000000	0.00	0.00	0.00	0.00	[{"name": "Doc Fee", "amount": 85, "taxable": false}]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-10 20:03:02.765275	2025-11-10 23:13:57.469	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
d66452d1-8d7d-4472-8bf9-837c5b665446	71f07d59-685d-46c4-afe2-60469d5d15ce	LEASE_DEAL	Finance - 60 Month	28500.00	5000.00	4.9900	36	0.001253	0.00	7.00	0.00	0.00	[{"name": "Doc Fee", "amount": 85, "taxable": false}]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-10 18:58:21.727814	2025-11-10 18:59:32.223	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
5b55a256-2aea-4263-8a69-983ab6c3573c	d52a4e4a-0955-4bc3-9f36-9248afe39b59	FINANCE_DEAL	Finance - 60 Month	28500.00	5000.00	4.9900	60	0.000000	0.00	0.00	0.00	0.00	[{"name": "Doc Fee", "amount": 85, "taxable": false}]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-10 21:34:16.433649	2025-11-10 21:34:16.433649	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
85d553c0-bdf6-4156-a44d-e5ef6215b86d	4ffff290-3cbe-40c4-8b32-e24b5bf597e1	FINANCE_DEAL	Finance - 60 Month	28500.00	5000.00	4.9900	60	0.000000	0.00	0.00	0.00	0.00	[{"name": "Doc Fee", "amount": 85, "taxable": false}]	[]	6d37df4d-76b4-4419-90fd-3bae6a5e2c82	2280.00	85.00	25865.00	487.99	29279.16	2025-11-09 22:07:00.477637	2025-11-09 22:21:32.118	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
32817b35-6bf5-4294-818a-53f19eb99da2	675ee62c-5157-44e9-8309-d0525a85fb2a	FINANCE_DEAL	Finance - 60 Month	28500.00	5000.00	4.9900	60	0.000000	0.00	0.00	0.00	0.00	[{"name": "Doc Fee", "amount": 85, "taxable": false}]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-09 23:52:11.570266	2025-11-09 23:52:11.570266	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
a2f59804-18ab-4a2a-a6db-6c50d39d831b	dac695e1-7565-4910-a36b-6aa8d9ae343f	FINANCE_DEAL	Finance - 60 Month	28500.00	5000.00	4.9900	60	0.000000	0.00	0.00	0.00	0.00	[{"name": "Doc Fee", "amount": 85, "taxable": false}]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-11 03:11:41.220631	2025-11-11 03:11:41.220631	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
0baf1bdc-250b-4f33-bec9-e2a2e88feb77	5936d353-e284-47d8-ab03-1c68dd2f51d5	LEASE_DEAL	Finance - 60 Month	28500.00	5000.00	4.9900	60	0.000000	0.00	0.00	0.00	0.00	[{"name": "Doc Fee", "amount": 85, "taxable": false}]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-10 21:38:42.777646	2025-11-10 21:39:17.682	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
c96f0c03-8d0a-472c-bf25-b0063bb97151	f7506c5c-9cdc-4483-9da6-516c9f8ff709	FINANCE_DEAL	Finance - 60 Month	35000.00	5000.00	4.9900	60	0.000000	0.00	0.00	0.00	0.00	[{"name": "Doc Fee", "amount": 85, "taxable": false}]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-10 23:37:47.60182	2025-11-10 23:39:27.866	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
d6145193-5bfd-43e2-907e-3e88a1553208	90df1aea-5fd2-4e4d-a96f-11b9f5decabd	FINANCE_DEAL	Finance - 60 Month	35000.00	5000.00	6.9900	60	0.000000	0.00	0.00	0.00	0.00	[{"name": "Doc Fee", "amount": 85, "taxable": false}]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-10 23:16:19.72923	2025-11-10 23:19:28.374	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
988b7ef9-9832-47bd-8de8-b76f3a1d7684	762ab992-1639-42b7-a932-154f3465ac42	FINANCE_DEAL	Quick Quote Conversion	22990.00	10000.00	12.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-11 03:23:16.840703	2025-11-11 03:23:16.840703	[]	0.00	1d057cd2-36de-4ea2-aa44-057e31a20037	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
30307f0f-4b78-44da-9f32-9685c8259371	56bc2291-018f-424d-9c51-a591c6f62e0c	FINANCE_DEAL	Finance - 60 Month	28500.00	5000.00	4.9900	60	0.000000	0.00	0.00	0.00	0.00	[{"name": "Doc Fee", "amount": 85, "taxable": false}]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-10 23:40:50.437093	2025-11-10 23:40:50.437093	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
530a7687-0a9e-418e-af53-212bc3961468	8c6f94fe-094b-48a3-ae61-a6a855c42912	FINANCE_DEAL	Finance - 60 Month	2.00	5000.00	4.9900	60	0.000000	0.00	0.00	0.00	0.00	[{"name": "Doc Fee", "amount": 85, "taxable": false}]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-10 23:25:05.835788	2025-11-11 02:29:15.81	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
96bcf660-f3ce-43a6-aa9f-97b9d699414d	a830e968-3688-45c9-96b5-1df51ab451d6	FINANCE_DEAL	Quick Quote Conversion	25000.00	5000.00	12.9000	60	0.000000	0.00	0.00	8000.00	3000.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-11 03:57:46.914802	2025-11-11 03:57:46.914802	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
1977d5a5-689f-4aa7-a0fb-257fc6a9c305	52a0f36d-ab77-41f6-8fc3-9c16b3263157	FINANCE_DEAL	Finance - 60 Month	2850.00	2.02	4.9900	60	0.000000	0.00	0.00	0.00	0.00	[{"name": "Doc Fee", "amount": 85, "taxable": false}]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-11 02:51:38.272945	2025-11-11 02:52:47.24	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
43e43b55-a497-45cc-b2ed-35d90c0160fd	1e8ef2b9-1ef9-42a2-ac8e-aba4f47b18a2	FINANCE_DEAL	Finance - 60 Month	28500.00	5000.00	4.9900	60	0.000000	0.00	0.00	0.00	0.00	[{"name": "Doc Fee", "amount": 85, "taxable": false}]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-11 02:54:00.538969	2025-11-11 02:54:00.538969	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
aeb2ac3c-8e8d-4865-b792-341de17f00a2	e7a6c49c-ca27-45bb-8045-58d9ce4b6d1a	FINANCE_DEAL	Quick Quote Conversion	25000.00	5000.00	12.9000	60	0.000000	0.00	0.00	8000.00	3000.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-11 04:00:58.028391	2025-11-11 04:00:58.028391	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
b2c17b0f-d0dc-4fc8-8a88-961383452558	69b59de1-be0c-4956-b69a-b6856fde9f43	FINANCE_DEAL	Quick Quote Conversion	25000.00	5000.00	12.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-11 04:03:25.489253	2025-11-11 04:03:25.489253	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
18f2497f-4a18-48ba-ac42-d26ec172feb8	5c6a5e71-e8ee-4368-8d4c-d2198beb75e8	FINANCE_DEAL	Quick Quote Conversion	28000.00	6000.00	12.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-11 04:05:57.676149	2025-11-11 04:05:57.676149	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
bae9a917-faf7-4348-b0dc-257a057cbef4	5917965e-a56c-49cf-a581-ec6e9377db6f	FINANCE_DEAL	Quick Quote Conversion	30000.00	7500.00	12.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-11 04:07:53.622643	2025-11-11 04:07:53.622643	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
421158cc-3d13-4454-bcf8-516b64661c5e	52a7f8d0-bfe5-4347-a262-0f8a22d48566	FINANCE_DEAL	Finance - 60 Month	28500.00	5000.00	4.9900	60	0.000000	0.00	0.00	0.00	0.00	[{"name": "Doc Fee", "amount": 85, "taxable": false}]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-11 13:29:08.547043	2025-11-11 13:29:08.547043	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
ff1eef79-f4ec-4af7-b6ad-a5a1d6fb297f	7d30c6b6-d5d5-4273-8ae7-170dca1cf22f	FINANCE_DEAL	Quick Quote Conversion	35000.00	5000.00	12.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-11 13:32:18.128061	2025-11-11 13:32:18.128061	[]	0.00	1d057cd2-36de-4ea2-aa44-057e31a20037	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
91f96eeb-7724-41e2-8bea-6d28ea2649e1	bff6e34f-587a-4b5f-aae6-36704829550f	FINANCE_DEAL	Scenario 1	22990.00	0.00	8.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-11 15:19:26.151275	2025-11-11 15:19:26.151275	[]	0.00	1d057cd2-36de-4ea2-aa44-057e31a20037	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
921e0428-efa5-4382-bde0-2878ac2c162d	3c033059-1da3-4a9a-a5b1-6d5c68ae9370	FINANCE_DEAL	Scenario 1	22990.00	0.00	8.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-11 15:22:01.109961	2025-11-11 15:22:01.109961	[]	0.00	1d057cd2-36de-4ea2-aa44-057e31a20037	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
2f709787-9aa4-4561-aea4-121ecfb311b2	db62bf2d-22eb-4a07-bc40-a1e57b87a26d	FINANCE_DEAL	Scenario 1	0.00	0.00	8.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-12 05:33:28.478581	2025-11-12 05:33:28.478581	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
e6b8dc1f-e6c5-4235-8144-35cdb1dd0120	0d0d91bf-ca8e-4195-9d0d-63db59c2d6df	FINANCE_DEAL	Scenario 1	0.00	0.00	8.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-12 13:35:44.699169	2025-11-12 13:35:44.699169	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
cb2c2a85-1063-48ca-a359-a2053f9c5fac	b82762e2-2d83-4d1c-9236-45aa8e37b6bb	FINANCE_DEAL	Scenario 1	0.04	0.00	8.9000	60	0.000000	0.00	0.00	0.01	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-11 15:42:31.935894	2025-11-11 15:43:06.957	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
f0e24b8b-9e66-4ce0-a37d-dfa486ee2646	4dc6e18c-f211-4b93-9526-03c30686788c	FINANCE_DEAL	Scenario 1	0.00	0.00	8.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-11 15:49:52.139886	2025-11-11 15:49:52.139886	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
0ffb2477-2bd5-48d2-ab42-83cd6f31d1b7	d512245b-9050-4635-8d06-a44026c7c6e6	FINANCE_DEAL	Scenario 1	28500.00	0.00	8.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-11 16:31:12.065625	2025-11-11 16:31:12.065625	[]	0.00	f18ce5d4-72b6-4b4d-88bc-232c75108e55	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
0a7dbf33-7149-44c3-8600-241988a3569d	17ac2589-f83c-4d1f-9a7b-9500d17cf210	FINANCE_DEAL	Scenario 1	28500.00	0.00	60.0000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-11 16:31:13.186016	2025-11-11 16:33:42.609	[]	0.00	f18ce5d4-72b6-4b4d-88bc-232c75108e55	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
2e369035-ab14-4c20-a305-5574aa9e5a4e	d0dd6148-3fe7-44d7-ae3b-bb9668d99663	FINANCE_DEAL	Scenario 1	22990.00	0.00	8.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-11 18:10:00.682412	2025-11-11 18:10:00.682412	[]	0.00	1d057cd2-36de-4ea2-aa44-057e31a20037	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
b32f6a4f-990a-46a4-a04c-9b9916f6f2d0	585e6686-6a76-4c12-ac6f-a2641b6f69e8	FINANCE_DEAL	Scenario 1	0.00	0.00	8.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-12 14:33:26.032481	2025-11-12 14:33:26.032481	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
b8afa4e9-84f5-4803-ab76-f05c6d5be845	7125cc5e-995b-4539-9d33-7c958ae54a87	FINANCE_DEAL	Scenario 1	21950.00	2500.00	8.9000	60	0.000000	0.00	0.00	2122.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-12 15:51:15.167536	2025-11-12 17:35:04.76	[]	0.00	fd656bb0-9b97-4d24-9d2f-23f017fb5417	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
2729ff93-0b50-4e70-a287-b2bd9d62734d	4c533687-e779-4e0e-b071-5e393e74c7a5	FINANCE_DEAL	Scenario 1	28500.00	0.00	8.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-12 17:38:49.940843	2025-11-12 17:38:49.940843	[]	0.00	f18ce5d4-72b6-4b4d-88bc-232c75108e55	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
7b76baf8-7641-4bf1-8c89-0b821436ee1f	4c533687-e779-4e0e-b071-5e393e74c7a5	LEASE_DEAL	Scenario 2	28500.00	0.00	8.9000	60	0.001250	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-12 17:39:04.220034	2025-11-12 17:39:14.082	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
c1afd553-c2a6-4210-8d76-98ac2e1faefe	b714bb40-e89d-45bc-a024-a9fe6dbe49b9	FINANCE_DEAL	Scenario 1	0.00	0.00	5.9000	72	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-11 19:47:29.368277	2025-11-11 19:48:25.75	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
8ce4fd79-2735-4411-b8f6-cdebff2abf46	0107cc84-0274-45cf-99b1-16e3c27a4b38	FINANCE_DEAL	Scenario 3	32500.00	5000.00	4.9900	60	0.001250	0.00	0.00	0.00	0.00	[]	[]	d27e7c45-7062-4dd8-9e6e-694384b85a76	0.00	0.00	0.00	0.00	0.00	2025-11-11 19:56:22.42303	2025-11-11 19:56:22.42303	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
18a49b84-60a9-4051-8123-93eb5aef6811	0107cc84-0274-45cf-99b1-16e3c27a4b38	FINANCE_DEAL	Scenario 4	32500.00	5000.00	4.9900	60	0.001250	0.00	0.00	0.00	0.00	[]	[]	d27e7c45-7062-4dd8-9e6e-694384b85a76	0.00	0.00	0.00	0.00	0.00	2025-11-11 19:59:45.568755	2025-11-11 19:59:45.568755	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
66fc1fc6-04ae-4e19-892e-dac03b59430c	0107cc84-0274-45cf-99b1-16e3c27a4b38	FINANCE_DEAL	Finance - 60 Month (Copy)	32500.00	5000.00	4.9900	60	0.000000	0.00	0.00	0.00	0.00	[{"name": "Doc Fee", "amount": 85, "taxable": false}, {"name": "Registration", "amount": 65, "taxable": false}]	[]	d27e7c45-7062-4dd8-9e6e-694384b85a76	2106.88	150.00	29756.88	559.17	33550.20	2025-11-11 20:01:28.077299	2025-11-11 20:01:28.077299	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
6e761c4e-d282-44f1-8e65-f4dfb040b189	e1ada750-2f1b-4514-a4d5-193dd7cdfef5	FINANCE_DEAL	Scenario 1	0.00	0.00	8.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-12 17:40:28.835161	2025-11-12 17:40:28.835161	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
7074375f-7cbb-4ee4-b14f-3a8d998b4b3a	7d8e9745-7e22-4695-8e90-6d4caaa290ee	FINANCE_DEAL	Scenario 1	0.00	0.00	8.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-12 13:39:31.755463	2025-11-12 15:53:24.037	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
5f24c844-22b5-4d8a-aa5c-acac95245429	2fbe9886-f03d-4297-a5ad-aa70aff9f397	FINANCE_DEAL	Scenario 1	0.00	0.00	8.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-11 20:54:24.208032	2025-11-11 20:54:51.605	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
cab95fbf-f780-483f-a56d-cdd2b4d4a6f3	dfffcbc9-67fb-43a0-b5ca-4df30f23b9ed	FINANCE_DEAL	Scenario 1	0.00	0.00	8.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-11 21:55:25.459433	2025-11-11 21:55:25.459433	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
e7fc4170-9d78-453b-8735-1bf498767aae	5eaace1d-271b-467b-bde7-b21c20a750ac	FINANCE_DEAL	Scenario 1	0.00	0.00	8.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-12 02:42:10.654148	2025-11-12 02:42:10.654148	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
e0b274e5-8f2d-439c-b7b0-e08c7ad5454e	e0601864-60c4-436b-ae64-830733a6e6ff	FINANCE_DEAL	Scenario 1	0.00	0.00	8.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-12 02:44:38.853693	2025-11-12 02:44:38.853693	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
5afdc446-c896-41b0-8658-f4732da96834	e0601864-60c4-436b-ae64-830733a6e6ff	FINANCE_DEAL	Quick Quote	35000.00	7000.00	6.9900	72	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-12 02:44:39.307894	2025-11-12 02:44:39.307894	[]	0.00	\N	\N	t	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
0df42683-862f-4ce2-99cd-37eb7ba824eb	ae65a310-d4a1-45e1-9b9f-8025dc11eb10	FINANCE_DEAL	Scenario 1	22990.00	0.00	8.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-12 05:07:17.566911	2025-11-12 05:07:17.566911	[]	0.00	1d057cd2-36de-4ea2-aa44-057e31a20037	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
5f647773-c6d4-4e57-8ca5-f17a4d0ec26c	f5797bb2-4350-497e-a077-9d5b31d4f7bf	FINANCE_DEAL	Scenario 1	22990.00	0.00	8.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-12 05:08:20.963458	2025-11-12 05:08:20.963458	[]	0.00	1d057cd2-36de-4ea2-aa44-057e31a20037	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
5316a883-bbdb-4839-8382-64e85e2e939b	86c4120f-8679-438f-8a63-d1228642318b	FINANCE_DEAL	Scenario 1	0.00	0.00	8.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-12 05:24:25.862005	2025-11-12 05:24:25.862005	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
2c014947-b5c1-4896-9663-10c0257ebec3	8c21fdc3-75e4-4692-bd9d-f408b8a11af8	FINANCE_DEAL	Scenario 1	0.00	0.00	8.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-12 05:29:04.662015	2025-11-12 05:29:04.662015	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
30500acd-93cd-4789-af9a-0b485c18137f	6cfbdf50-337c-4017-b399-f1f9d7f32050	FINANCE_DEAL	Scenario 1	0.00	0.00	8.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-12 05:32:56.404519	2025-11-12 05:32:56.404519	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
adf3c488-8ad3-443e-aa6e-56e7ca156d7b	b93b6217-7c50-4297-8f05-3623c82eeb9d	FINANCE_DEAL	Scenario 1	22990.00	0.00	8.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-12 17:40:37.236031	2025-11-12 17:40:37.236031	[]	0.00	1d057cd2-36de-4ea2-aa44-057e31a20037	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
c684d03a-1241-4759-9b54-8d6958f08892	a572c315-e6de-4eb8-b5ac-231f911260a7	FINANCE_DEAL	Scenario 1	0.00	0.00	8.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-12 17:40:51.042964	2025-11-12 17:40:51.042964	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
b6d6ec5f-35e6-47d3-aea4-68c7391e8825	88152ef0-7e2a-4bbc-9367-a923aa22eb74	FINANCE_DEAL	Scenario 1	0.00	0.00	8.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-12 17:54:39.567605	2025-11-12 17:54:39.567605	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
99df9852-3d47-4fc6-9065-53177700227d	09da03f5-021a-4681-8b9b-f7bca9e631d6	FINANCE_DEAL	Scenario 1	0.00	0.00	8.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-12 17:48:41.409419	2025-11-12 17:48:41.409419	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
86c6e815-9aaa-427f-bce7-ea50831f427c	0fd6b26f-b723-436b-bc90-3b93ad2d4483	FINANCE_DEAL	Scenario 1	0.00	0.00	8.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-12 17:52:04.048247	2025-11-12 17:52:04.048247	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
d1853406-6d09-465e-83ce-c5657dcb5937	35bdd1e4-1de6-42ee-a8a4-13ecc7b0e8dc	FINANCE_DEAL	Scenario 1	0.00	0.00	8.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-12 19:15:41.447227	2025-11-12 19:15:41.447227	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
86dd53d2-6960-41f1-90d4-04cfddd26ae0	ff7f6722-2179-47a8-90c8-c7d97f72c370	FINANCE_DEAL	Scenario 1	38750.00	0.00	8.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-12 19:16:28.873759	2025-11-12 19:17:54.008	[]	0.00	fad56871-a6ae-4313-a878-4967c60f984f	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
34a561ad-0b4a-4807-ab84-acd2f6b1b973	fa8c9da5-54cd-4537-a4dc-9c302a21144b	FINANCE_DEAL	Scenario 1	32500.00	0.00	8.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-12 19:18:57.164817	2025-11-12 19:38:30.544	[]	0.00	bc1abb8d-dd67-4c64-92ce-abb0f3dd7777	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
df8ef3fe-b073-4203-926d-3f961d2dd1bf	04aca4df-bc1c-4359-9dd6-5d72df8aa15f	FINANCE_DEAL	Scenario 1	32500.00	0.00	8.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-12 19:57:01.105229	2025-11-12 19:57:30.062	[]	0.00	bc1abb8d-dd67-4c64-92ce-abb0f3dd7777	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
3cae01b3-4780-43db-86ae-09ed821440e6	04aca4df-bc1c-4359-9dd6-5d72df8aa15f	LEASE_DEAL	Scenario 2	0.00	0.00	8.9000	60	0.001250	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-12 19:57:20.619264	2025-11-12 19:57:39.789	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
585c8650-416e-47bf-b03e-4f8ccc204613	f1971287-3771-4b5b-84f4-bf3cfc38b579	FINANCE_DEAL	Scenario 1	0.00	0.00	8.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-12 20:55:13.743455	2025-11-12 20:55:13.743455	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
d221e33f-9b24-4985-9706-04f05fe8f6d8	0ce1d6da-158b-4c73-a169-f18b19629e44	FINANCE_DEAL	Scenario 1	0.00	0.00	8.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-12 22:11:24.285527	2025-11-12 22:11:24.285527	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
026cc5dc-49d6-41d7-a28f-4937b1fcdebf	124e7866-14a3-444c-80bd-8845fac8e6b1	LEASE_DEAL	Scenario 1	28500.00	3500.00	8.9000	36	0.003500	25067.00	65.00	8800.00	11440.00	[{"name": "Documentation Fee", "amount": 299, "taxable": true}, {"name": "Title Fee", "amount": 75, "taxable": false}]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-18 00:59:23.276782	2025-11-18 21:53:42.713	[]	0.00	207a1c12-2485-431b-a3f2-470b647336cc	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
20dd74a9-ee63-434f-b585-de651682b4e8	808b140a-84b2-4b20-b21a-c9196e5efe8e	FINANCE_DEAL	Scenario 1	32500.00	3250.00	5.0000	72	0.000000	0.00	0.00	10555.00	8800.00	[{"name": "Documentation Fee", "amount": 299, "taxable": false}, {"name": "Registration Fee", "amount": 150, "taxable": false}, {"name": "Electronic Filing Fee", "amount": 50, "taxable": false}]	[{"name": "All-Weather Floor Mats", "amount": 199, "taxable": true}, {"name": "Trunk Cargo Tray", "amount": 129, "taxable": true}, {"name": "Window Tinting", "amount": 399, "taxable": true}, {"name": "Paint Protection Film (Partial)", "amount": 599, "taxable": true}]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-12 18:16:52.744339	2025-11-13 02:43:05.835	[{"id": "prem-warranty-1", "cost": 1595, "name": "36-Month Extended Warranty", "term": 36, "price": 2495, "taxable": false, "category": "warranty"}, {"id": "prem-gap-1", "cost": 495, "name": "GAP Insurance", "price": 795, "taxable": false, "category": "gap"}, {"id": "prem-tire-1", "cost": 395, "name": "Tire & Wheel Protection", "term": 36, "price": 695, "taxable": true, "category": "tire_wheel"}]	0.00	bc1abb8d-dd67-4c64-92ce-abb0f3dd7777	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
e25aa3de-84e9-4ed8-8759-83d92244161b	ac5ded90-6ca9-4bcc-af0a-cbf5cc9fa345	FINANCE_DEAL	Scenario 1	32500.00	0.00	8.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-12 21:45:46.71985	2025-11-16 22:27:21.628	[]	0.00	bc1abb8d-dd67-4c64-92ce-abb0f3dd7777	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
4fafb2df-4a8d-41e4-80de-884845c614a7	dd9035ea-ac5c-42cb-97fc-6f665b2c62e5	FINANCE_DEAL	Scenario 1	0.00	0.00	8.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-17 09:34:17.27905	2025-11-17 09:34:17.27905	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
4d8ff850-d37e-4070-a974-7467c1602a77	419fa509-e471-48dd-915d-2741b6707eeb	FINANCE_DEAL	Scenario 1	22990.00	0.00	8.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-17 09:35:28.829479	2025-11-17 09:35:28.829479	[]	0.00	1d057cd2-36de-4ea2-aa44-057e31a20037	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
3a262b9c-1f37-4c8e-875b-a7eb204d5dec	d6f8a128-8c92-410b-b052-cc50e053b839	FINANCE_DEAL	Scenario 1	0.00	0.00	8.9000	60	0.000000	0.00	0.00	0.00	0.00	[]	[]	\N	0.00	0.00	0.00	0.00	0.00	2025-11-17 10:16:32.099088	2025-11-18 01:08:53.712	[]	0.00	\N	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
400f933b-c173-4e7d-836a-ebdcd56fc6f9	7ee8eb3c-234e-4af6-a579-49e664daf977	LEASE_DEAL	Scenario 1	22990.00	0.00	8.9000	36	0.000000	0.00	0.00	0.00	0.00	[{"name": "Documentation Fee", "amount": 299, "taxable": true}]	[]	\N	0.00	0.00	22990.00	667.35	24024.55	2025-11-17 10:17:13.337885	2025-11-18 22:22:08.37	[]	0.00	1d057cd2-36de-4ea2-aa44-057e31a20037	\N	f	\N	\N	\N	0.00	0.00	0.00	t	t	[]	0.00	0.00	0.00
\.


--
-- Data for Name: dealership_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.dealership_settings (id, dealership_id, dealership_name, address, city, state, zip_code, phone, email, website, logo, primary_color, default_tax_rate, doc_fee, timezone, currency, settings, created_at, updated_at) FROM stdin;
fa136a38-696a-47b6-ac26-c184cc6ebe46	default	Default Dealership	4500 E 96th st	Indianapolis	IN	\N	4638678677	support@autolytiq.com	\N	\N	#0066cc	0.0825	299.00	America/New_York	USD	{"smsNotifications": false, "emailNotifications": true}	2025-11-12 00:52:45.558898	2025-11-19 00:10:57.779
\.


--
-- Data for Name: dealership_stock_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.dealership_stock_settings (id, dealership_id, prefix, use_year_prefix, padding_length, current_counter, format_preview, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: deals; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.deals (id, deal_number, dealership_id, salesperson_id, sales_manager_id, finance_manager_id, customer_id, vehicle_id, trade_vehicle_id, deal_state, active_scenario_id, locked_by, created_at, updated_at, customer_attached_at) FROM stdin;
0107cc84-0274-45cf-99b1-16e3c27a4b38	2024-11-0001	01352975-68e7-42bc-8e7b-0717ada55277	e77ab786-6ab4-43a5-b298-e15dccc27e29	91d715d0-2135-4e07-a7e2-7e5c516c5eab	\N	f278e5f7-ab65-4db1-bf0a-9064132b0fd1	bc1abb8d-dd67-4c64-92ce-abb0f3dd7777	\N	IN_PROGRESS	\N	\N	2025-11-09 21:45:40.402394	2025-11-09 21:45:40.402394	\N
40373374-fc48-4bba-ac02-e86a2a91c281	2025-11-0002	7b2c9fbf-c62f-49d2-9f1c-4317be4c08a1	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	b47acef7-8e16-4a43-be1d-7a78c0668f8e	192e5109-df95-4b23-9277-8ea3202493dc	\N	DRAFT	\N	\N	2025-11-09 21:57:19.540119	2025-11-09 21:57:19.540119	\N
ddb51922-a4b0-4f16-8ada-ed97fb908aa7	DEAL-20251109-003	4f0e8920-52d0-4ca4-be85-f0cd85cc4a31	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	73ab9059-044b-4f3e-9d95-d2dacc83a5fd	f18ce5d4-72b6-4b4d-88bc-232c75108e55	\N	DRAFT	\N	\N	2025-11-09 22:00:05.894638	2025-11-09 22:00:05.894638	\N
55f7b893-ae29-4a40-9554-bcdbb90917a7	DEAL-20251109-004	abaa7134-0514-4d44-beb6-0b0e73b8105f	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	adb4dccb-407b-451d-b4c7-277914509a4b	8be282d6-79e9-428b-a086-f91f6de40440	\N	DRAFT	\N	\N	2025-11-09 22:02:27.701281	2025-11-09 22:02:27.701281	\N
a3a41793-6361-4183-a71a-e74ed3da30bc	DEAL-20251109-005	a9b7c636-1e5a-4f69-945b-16424c80668b	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	82266e4f-dfc4-4aa6-9531-97edbcfdd3b0	207a1c12-2485-431b-a3f2-470b647336cc	\N	DRAFT	\N	\N	2025-11-09 22:06:59.643181	2025-11-09 22:06:59.643181	\N
4ffff290-3cbe-40c4-8b32-e24b5bf597e1	DEAL-20251109-006	08ea5ef4-6a30-44f4-9677-9be22e230c46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	9a1b9ef8-6b95-4792-89b0-af71e38b02f4	3f170e9f-e2f3-453f-9f97-16b307f8d23d	\N	DRAFT	\N	\N	2025-11-09 22:07:00.173122	2025-11-09 22:07:00.173122	\N
675ee62c-5157-44e9-8309-d0525a85fb2a	DEAL-20251109-007	d33d47d2-c609-412c-b3cb-5e1c7b4c7590	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	4fd4e666-a593-435f-902e-b17eafd1ea7a	d167825f-4c25-4230-9af9-6c6942bf7936	\N	DRAFT	\N	\N	2025-11-09 23:52:11.264125	2025-11-09 23:52:11.264125	\N
ddde470c-8b40-4650-980e-ce70d57240fb	DEAL-20251110-001	2baf1b3e-700f-4ffc-b855-ff5c3b528001	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	dbe221ed-b2c8-4921-a8e2-5c697c2f9034	a078fe98-8f04-45c7-81cd-73777ea86879	\N	IN_PROGRESS	\N	\N	2025-11-10 00:12:38.626502	2025-11-10 02:35:33.814	\N
d3c1f6db-4c23-49e1-b6bd-5d3346024967	DEAL-20251110-002	53c64749-6aa5-4aa4-b2e3-97eeb2ab8ac0	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	cb0523d0-0704-4bd1-bc24-13044572de58	cbb82b6f-06b3-4dd7-b780-6f88b5842554	\N	DRAFT	\N	\N	2025-11-10 12:09:21.068609	2025-11-10 12:09:21.068609	\N
5db6cd65-ec72-4563-b046-16676ec0a0b8	DEAL-20251110-003	7f9e6c70-78bf-452c-babb-8f593d3965c5	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	c62edcd8-1cd4-4b94-90e5-1faefbaf34bc	59818ab9-5155-46ab-b5b3-f5850525d64b	\N	DRAFT	\N	\N	2025-11-10 17:17:13.205708	2025-11-10 17:17:13.205708	\N
244e57f1-dddf-4230-b1d2-810f1da44fd7	DEAL-20251110-004	1c5b8775-13c5-44b0-88b4-7d25af095e10	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	769fc405-5ff9-4851-831d-5cd75090ab2d	717c6460-8a53-431f-96c9-cded55ced4c1	\N	DRAFT	\N	\N	2025-11-10 17:37:50.982154	2025-11-10 17:37:50.982154	\N
71f07d59-685d-46c4-afe2-60469d5d15ce	DEAL-20251110-005	fca36663-dad1-423d-9e70-d9355084d1c0	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	054bc16d-662a-435d-9b17-bd01d2ce21ac	4d26a8ea-0617-4b88-85bc-aca0865528df	\N	DRAFT	\N	\N	2025-11-10 18:58:21.360993	2025-11-10 18:58:21.360993	\N
1bcd4273-d86b-47c8-91c1-10d6f5750a7e	DEAL-20251110-006	3effd1ae-f72b-4811-ae51-ad042ca6fb1d	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	cde2b578-9e39-4cd0-b220-b3278a57d103	7fc992d3-5cf4-4b97-b1c3-f9982a1deced	\N	DRAFT	\N	\N	2025-11-10 20:03:02.4233	2025-11-10 20:03:02.4233	\N
d52a4e4a-0955-4bc3-9f36-9248afe39b59	DEAL-20251110-007	9fbe4a78-1a1b-4896-980f-b93db6fae882	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	483e469a-92ff-4dd3-a6e8-cf85a220d51c	82af4bbc-4067-458b-9403-43262ff1cd19	\N	DRAFT	\N	\N	2025-11-10 21:34:16.091856	2025-11-10 21:34:16.091856	\N
5936d353-e284-47d8-ab03-1c68dd2f51d5	DEAL-20251110-008	49ef63c9-1540-45c9-b35e-0800e54c2d6b	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	7e5e0ea7-9321-4534-bfb7-b069bf457a9c	1434c5d5-d710-473e-8c42-bfabf651907e	\N	DRAFT	\N	\N	2025-11-10 21:38:42.471908	2025-11-10 21:38:42.471908	\N
c634f9c7-c23c-4bda-a9fd-3915c1058515	DEAL-20251110-009	caf61794-5684-4e96-b22e-94431a6fc290	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	a386d0b5-962d-41cd-914b-90a74f27a45d	0c0cfdfc-eaa6-4cf4-8722-fee269a1d7b6	\N	DRAFT	\N	\N	2025-11-10 23:00:59.300354	2025-11-10 23:00:59.300354	\N
c19912cc-1217-43b2-8ff9-e0e16d455bc6	DEAL-20251110-010	5910b18b-f6a3-4ffc-ba76-c847eee06832	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	af19e89a-d4dc-4ba9-a175-3cd903c13a9f	fe1cdfc7-856d-4905-ae18-9832dc6831af	\N	DRAFT	\N	\N	2025-11-10 23:05:39.613625	2025-11-10 23:05:39.613625	\N
d1ee8fe0-306f-417f-91ba-aeb5ce7144a9	DEAL-20251110-011	e62d4104-264d-43c8-b5d1-2bc08908095e	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	0424f086-6b3c-46be-86b9-14711627d9b4	6fb333a3-ee15-414b-a35e-39172595434b	\N	DRAFT	\N	\N	2025-11-10 23:12:09.249674	2025-11-10 23:12:09.249674	\N
90df1aea-5fd2-4e4d-a96f-11b9f5decabd	DEAL-20251110-012	53a086de-6bc0-43e7-8b37-e1cdce26a512	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	afceaee2-3d9e-4b79-b732-2239d287be0a	b1769338-26a1-4d8d-9f2b-36829e5a6866	\N	DRAFT	\N	\N	2025-11-10 23:16:19.445517	2025-11-10 23:16:19.445517	\N
8c6f94fe-094b-48a3-ae61-a6a855c42912	DEAL-20251110-013	9619591b-563e-44a2-8bc9-792e5e3594fd	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	1c071319-41fd-48f0-abbd-aadaec9d20c8	5063b75d-c2af-4e5a-9749-f8db6a848d4f	\N	DRAFT	\N	\N	2025-11-10 23:25:05.541921	2025-11-10 23:25:05.541921	\N
f7506c5c-9cdc-4483-9da6-516c9f8ff709	DEAL-20251110-014	ae79bb32-de59-4c15-833c-9734fa76fc7e	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	76896ba3-6fa4-4224-afa1-fd154ff78e9b	6f0a9ad5-d2a3-4c48-b54a-eed7edc16247	\N	DRAFT	\N	\N	2025-11-10 23:37:47.278996	2025-11-10 23:37:47.278996	\N
56bc2291-018f-424d-9c51-a591c6f62e0c	DEAL-20251110-015	ba8c41c1-5d58-4d2f-b799-25b5804d7391	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	b8314cf6-804e-42e8-8014-440a034e496b	84e46293-f24d-4c5b-86d3-f0a3061d8d33	\N	DRAFT	\N	\N	2025-11-10 23:40:50.123156	2025-11-10 23:40:50.123156	\N
52a0f36d-ab77-41f6-8fc3-9c16b3263157	DEAL-20251111-001	af2440cd-6faa-4817-a837-adc095e42d9e	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	8ed246f0-61d9-4820-b6bf-5349fd7e1b53	6d880306-ee24-4a13-b73f-d329359cbefd	\N	DRAFT	\N	\N	2025-11-11 02:51:37.922614	2025-11-11 02:51:37.922614	\N
1e8ef2b9-1ef9-42a2-ac8e-aba4f47b18a2	DEAL-20251111-002	2ec268ff-1d32-4712-8b54-760e5233c7cf	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	c9c80d0b-d4f8-47c8-a3c7-f1d9af54c0f8	af07441f-fe8a-40aa-89d3-de74c4ef7e1a	\N	DRAFT	\N	\N	2025-11-11 02:54:00.262244	2025-11-11 02:54:00.262244	\N
dac695e1-7565-4910-a36b-6aa8d9ae343f	DEAL-20251111-003	b16b641d-bc7e-4552-90f1-afd2bcc54139	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	d5d16cd6-0b8f-415c-8573-8448baa5f2a1	82631ff7-8933-4475-a5be-7a8ca566165b	\N	DRAFT	\N	\N	2025-11-11 03:11:40.934519	2025-11-11 03:11:40.934519	\N
762ab992-1639-42b7-a932-154f3465ac42	DEAL-20251111-004	8df70435-e1f7-4ddb-ab48-1c15bfe3020d	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	be43b9b8-9713-4db4-b52d-16cc5fce1441	1d057cd2-36de-4ea2-aa44-057e31a20037	\N	DRAFT	\N	\N	2025-11-11 03:23:16.762571	2025-11-11 03:23:16.762571	\N
a830e968-3688-45c9-96b5-1df51ab451d6	DEAL-20251111-005	f8a5b57f-abba-4054-a59e-08099456187f	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	18503373-d376-40b8-b267-4c18e0b57300	\N	\N	DRAFT	\N	\N	2025-11-11 03:57:46.7946	2025-11-11 03:57:46.7946	\N
e7a6c49c-ca27-45bb-8045-58d9ce4b6d1a	DEAL-20251111-006	8cc8b4c8-4df9-4a62-86c4-528981a47e1d	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	3fb479db-f90a-45c1-bd4a-3fa6aad13bcd	\N	\N	DRAFT	\N	\N	2025-11-11 04:00:57.954028	2025-11-11 04:00:57.954028	\N
69b59de1-be0c-4956-b69a-b6856fde9f43	DEAL-20251111-007	2506cbfb-c626-49cd-b930-7af11b99967c	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	2471ea92-c929-4806-afc3-1de9022f2f17	\N	\N	DRAFT	\N	\N	2025-11-11 04:03:25.41044	2025-11-11 04:03:25.41044	\N
5c6a5e71-e8ee-4368-8d4c-d2198beb75e8	DEAL-20251111-008	9b9b7787-9b52-4a85-9d4f-9d68d5db544d	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	ff18862a-1571-46ae-a418-4e4cbcf44781	\N	\N	DRAFT	\N	\N	2025-11-11 04:05:57.60131	2025-11-11 04:05:57.60131	\N
5917965e-a56c-49cf-a581-ec6e9377db6f	DEAL-20251111-009	1c9e30a3-7349-43f3-aa32-dd2097267255	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	0cd43a0b-b2f4-4c30-9999-0c942e3bbdf6	\N	\N	DRAFT	\N	\N	2025-11-11 04:07:53.549001	2025-11-11 04:07:53.549001	\N
52a7f8d0-bfe5-4347-a262-0f8a22d48566	DEAL-20251111-010	f4bd5d51-0933-457d-bac8-b0fa87ef7489	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	d34bd79d-c58e-401a-bad1-1c0941d73abb	cc61d85f-01d6-4157-8858-7865eb30c556	\N	DRAFT	\N	\N	2025-11-11 13:29:08.190461	2025-11-11 13:29:08.190461	\N
7d30c6b6-d5d5-4273-8ae7-170dca1cf22f	DEAL-20251111-011	a94b5b09-74ab-4856-9612-9397a4460d32	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	e0f96b2b-ce5b-4565-8e50-babc0ad4cec6	1d057cd2-36de-4ea2-aa44-057e31a20037	\N	DRAFT	\N	\N	2025-11-11 13:32:18.047509	2025-11-11 13:32:18.047509	\N
d03df4f2-e825-4c30-bc20-4fb7eee266c8	DEAL-20251111-012	881f4e3e-b6a4-439a-b680-837f67d258d6	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	1d057cd2-36de-4ea2-aa44-057e31a20037	\N	DRAFT	\N	\N	2025-11-11 15:07:53.134773	2025-11-11 15:07:53.134773	\N
429e4779-be0e-4b01-89d4-ecc83a1cf97b	DEAL-20251111-013	bc3e600f-4907-4e8b-a82b-db34b9345098	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	1d057cd2-36de-4ea2-aa44-057e31a20037	\N	DRAFT	\N	\N	2025-11-11 15:10:25.146064	2025-11-11 15:10:25.146064	\N
334d0d3f-9e80-409b-9ce0-95c4fc929d51	DEAL-20251111-014	62663d21-31c5-4255-99e5-f99ca3eb49f4	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	1d057cd2-36de-4ea2-aa44-057e31a20037	\N	DRAFT	\N	\N	2025-11-11 15:12:29.115217	2025-11-11 15:12:29.115217	\N
a0bd95f0-90ba-4de4-ab18-b57a573eee64	DEAL-20251111-015	6d93a0d5-48e0-4679-b106-36f1b026d9d8	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	1d057cd2-36de-4ea2-aa44-057e31a20037	\N	DRAFT	\N	\N	2025-11-11 15:14:43.819403	2025-11-11 15:14:43.819403	\N
bff6e34f-587a-4b5f-aae6-36704829550f	DEAL-20251111-016	8bba4be8-6b59-49f6-9dec-20060b8b339b	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	1d057cd2-36de-4ea2-aa44-057e31a20037	\N	DRAFT	\N	\N	2025-11-11 15:19:25.99416	2025-11-11 15:19:25.99416	\N
3c033059-1da3-4a9a-a5b1-6d5c68ae9370	DEAL-20251111-017	8fdf8d4f-6de7-4f34-a9cc-35b12e7dda61	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	1d057cd2-36de-4ea2-aa44-057e31a20037	\N	DRAFT	\N	\N	2025-11-11 15:22:00.96145	2025-11-11 15:22:00.96145	\N
b82762e2-2d83-4d1c-9236-45aa8e37b6bb	DEAL-20251111-018	bd6f2954-f656-4c5c-97ce-b3debe02a869	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	\N	\N	DRAFT	\N	\N	2025-11-11 15:42:31.850696	2025-11-11 15:42:31.850696	\N
4dc6e18c-f211-4b93-9526-03c30686788c	DEAL-20251111-019	83415be8-1172-4d98-81a0-7ac044da8c84	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	\N	\N	DRAFT	\N	\N	2025-11-11 15:49:52.018507	2025-11-11 15:49:52.018507	\N
d512245b-9050-4635-8d06-a44026c7c6e6	DEAL-20251111-020	1b8001d8-607c-42d2-b14b-5cee1a0ca067	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	f18ce5d4-72b6-4b4d-88bc-232c75108e55	\N	DRAFT	\N	\N	2025-11-11 16:31:11.893317	2025-11-11 16:31:11.893317	\N
17ac2589-f83c-4d1f-9a7b-9500d17cf210	DEAL-20251111-021	b591b17d-f17d-4f92-91f7-9148868d96fd	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	f18ce5d4-72b6-4b4d-88bc-232c75108e55	\N	DRAFT	\N	\N	2025-11-11 16:31:13.031329	2025-11-11 16:31:13.031329	\N
d0dd6148-3fe7-44d7-ae3b-bb9668d99663	DEAL-20251111-022	dc434387-7969-466f-bb40-90aeb5e7f8e5	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	1d057cd2-36de-4ea2-aa44-057e31a20037	\N	DRAFT	\N	\N	2025-11-11 18:10:00.520359	2025-11-11 18:10:00.520359	\N
be14d3f1-c76a-4036-8edb-847f4cfa36c9	test-deal-scenarios-773381	1ef11f7b-e28b-4fd0-b641-4ca4da706f5f	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	\N	\N	DRAFT	\N	\N	2025-11-11 19:43:30.808857	2025-11-11 19:43:30.808857	\N
b714bb40-e89d-45bc-a024-a9fe6dbe49b9	DEAL-20251111-024	af6d78e1-4b4a-4780-afee-fa62ea2d26a0	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	\N	\N	DRAFT	\N	\N	2025-11-11 19:47:29.292467	2025-11-11 19:47:29.292467	\N
2fbe9886-f03d-4297-a5ad-aa70aff9f397	DEAL-20251111-025	8409fa63-9a3e-49da-92d9-b243be16c325	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	\N	\N	DRAFT	\N	\N	2025-11-11 20:54:24.112368	2025-11-11 20:54:24.112368	\N
dfffcbc9-67fb-43a0-b5ca-4df30f23b9ed	DEAL-20251111-026	8ad097b8-38f3-4e65-8dad-878676508500	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	\N	\N	DRAFT	\N	\N	2025-11-11 21:55:25.363416	2025-11-11 21:55:25.363416	\N
5eaace1d-271b-467b-bde7-b21c20a750ac	DEAL-20251112-001	0c495b1d-9780-4410-97e4-04d9034e92d1	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	\N	\N	DRAFT	\N	\N	2025-11-12 02:42:10.565723	2025-11-12 02:42:10.565723	\N
e0601864-60c4-436b-ae64-830733a6e6ff	DEAL-20251112-002	810fd601-74a0-4a05-a590-8f1e30e94a5a	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	\N	\N	DRAFT	\N	\N	2025-11-12 02:44:38.774469	2025-11-12 02:44:38.774469	\N
ae65a310-d4a1-45e1-9b9f-8025dc11eb10	DEAL-20251112-003	79211d7d-c4e8-4de4-9a84-311e0d57c517	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	1d057cd2-36de-4ea2-aa44-057e31a20037	\N	DRAFT	\N	\N	2025-11-12 05:07:17.415753	2025-11-12 05:07:17.415753	\N
f5797bb2-4350-497e-a077-9d5b31d4f7bf	DEAL-20251112-004	1afff4ef-a75f-4f93-abad-a2b1e11cfddb	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	1d057cd2-36de-4ea2-aa44-057e31a20037	\N	DRAFT	\N	\N	2025-11-12 05:08:20.814996	2025-11-12 05:08:20.814996	\N
86c4120f-8679-438f-8a63-d1228642318b	DEAL-20251112-005	6a570038-8a92-4a63-8c07-2c915ea8835d	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	\N	\N	DRAFT	\N	\N	2025-11-12 05:24:25.77105	2025-11-12 05:24:25.77105	\N
8c21fdc3-75e4-4692-bd9d-f408b8a11af8	DEAL-20251112-006	4e3ee6f2-5698-4629-82a1-c881d168eab7	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	\N	\N	DRAFT	\N	\N	2025-11-12 05:29:04.582466	2025-11-12 05:29:04.582466	\N
6cfbdf50-337c-4017-b399-f1f9d7f32050	DEAL-20251112-007	1fd0c57a-5519-4999-a3ef-101244e4afa5	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	\N	\N	DRAFT	\N	\N	2025-11-12 05:32:56.314557	2025-11-12 05:32:56.314557	\N
db62bf2d-22eb-4a07-bc40-a1e57b87a26d	DEAL-20251112-008	26368c9c-ec9e-4e99-b8f9-251dcfff4170	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	\N	\N	DRAFT	\N	\N	2025-11-12 05:33:28.400971	2025-11-12 05:33:28.400971	\N
0d0d91bf-ca8e-4195-9d0d-63db59c2d6df	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	35ee6e9d-725d-4fbb-91fc-3cf314358044	\N	\N	\N	\N	\N	DRAFT	\N	\N	2025-11-12 13:35:44.608326	2025-11-12 13:35:44.608326	\N
7d8e9745-7e22-4695-8e90-6d4caaa290ee	0001#1	fa136a38-696a-47b6-ac26-c184cc6ebe46	bccdb2f1-5a70-4f31-bddc-36ca254c0720	\N	\N	b0595e9d-5af6-499d-8ed9-cae4f86259e1	\N	\N	DRAFT	\N	\N	2025-11-12 13:39:31.68087	2025-11-12 13:39:49.171	2025-11-12 13:39:49.171
585e6686-6a76-4c12-ac6f-a2641b6f69e8	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	\N	\N	DRAFT	\N	\N	2025-11-12 14:33:25.948221	2025-11-12 14:33:25.948221	\N
7125cc5e-995b-4539-9d33-7c958ae54a87	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	fd656bb0-9b97-4d24-9d2f-23f017fb5417	\N	DRAFT	\N	\N	2025-11-12 15:51:14.986585	2025-11-12 15:51:14.986585	\N
4c533687-e779-4e0e-b071-5e393e74c7a5	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	f18ce5d4-72b6-4b4d-88bc-232c75108e55	\N	DRAFT	\N	\N	2025-11-12 17:38:49.764495	2025-11-12 17:38:49.764495	\N
e1ada750-2f1b-4514-a4d5-193dd7cdfef5	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	\N	\N	DRAFT	\N	\N	2025-11-12 17:40:28.756118	2025-11-12 17:40:28.756118	\N
b93b6217-7c50-4297-8f05-3623c82eeb9d	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	1d057cd2-36de-4ea2-aa44-057e31a20037	\N	DRAFT	\N	\N	2025-11-12 17:40:37.086674	2025-11-12 17:40:37.086674	\N
a572c315-e6de-4eb8-b5ac-231f911260a7	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	\N	\N	DRAFT	\N	\N	2025-11-12 17:40:50.969226	2025-11-12 17:40:50.969226	\N
09da03f5-021a-4681-8b9b-f7bca9e631d6	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	\N	\N	DRAFT	\N	\N	2025-11-12 17:48:41.315316	2025-11-12 17:48:41.315316	\N
0fd6b26f-b723-436b-bc90-3b93ad2d4483	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	\N	\N	DRAFT	\N	\N	2025-11-12 17:52:03.969993	2025-11-12 17:52:03.969993	\N
88152ef0-7e2a-4bbc-9367-a923aa22eb74	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	\N	\N	DRAFT	\N	\N	2025-11-12 17:54:39.437077	2025-11-12 17:54:39.437077	\N
35bdd1e4-1de6-42ee-a8a4-13ecc7b0e8dc	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	\N	\N	DRAFT	\N	\N	2025-11-12 19:15:41.314677	2025-11-12 19:15:41.314677	\N
ff7f6722-2179-47a8-90c8-c7d97f72c370	0003#3	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	250c337f-82b8-49e1-bbb5-0653a935fcaf	fad56871-a6ae-4313-a878-4967c60f984f	\N	DRAFT	\N	\N	2025-11-12 19:16:28.799457	2025-11-12 19:17:27.2	2025-11-12 19:16:39.17
fa8c9da5-54cd-4537-a4dc-9c302a21144b	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	bc1abb8d-dd67-4c64-92ce-abb0f3dd7777	\N	DRAFT	\N	\N	2025-11-12 19:18:57.090526	2025-11-12 19:38:30.059	\N
04aca4df-bc1c-4359-9dd6-5d72df8aa15f	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	bc1abb8d-dd67-4c64-92ce-abb0f3dd7777	\N	DRAFT	\N	\N	2025-11-12 19:57:00.968583	2025-11-12 19:57:29.577	\N
808b140a-84b2-4b20-b21a-c9196e5efe8e	0002#2	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	684b63d5-d88f-409a-9f0b-625d82dc0577	bc1abb8d-dd67-4c64-92ce-abb0f3dd7777	\N	DRAFT	\N	\N	2025-11-12 18:16:52.652159	2025-11-12 20:44:16.122	2025-11-12 18:17:17.528
f1971287-3771-4b5b-84f4-bf3cfc38b579	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	\N	\N	DRAFT	\N	\N	2025-11-12 20:55:13.60115	2025-11-12 20:55:13.60115	\N
0ce1d6da-158b-4c73-a169-f18b19629e44	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	\N	\N	DRAFT	\N	\N	2025-11-12 22:11:24.188727	2025-11-12 22:11:24.188727	\N
ac5ded90-6ca9-4bcc-af0a-cbf5cc9fa345	0004#4	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	be523e44-95ff-4e9d-a58d-3850259e54bf	bc1abb8d-dd67-4c64-92ce-abb0f3dd7777	\N	DRAFT	\N	\N	2025-11-12 21:45:46.628065	2025-11-12 23:14:32.499	2025-11-12 23:14:26.234
171f219a-9034-488a-bb40-ca3820bc2d55	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	\N	\N	DRAFT	\N	\N	2025-11-16 19:43:08.771741	2025-11-16 19:43:08.771741	\N
f1dbdf96-7e2b-4b64-bc9a-b65b88193b3c	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	\N	\N	DRAFT	\N	\N	2025-11-16 19:43:32.354421	2025-11-16 19:43:32.354421	\N
ee870b74-d10d-417e-a4a1-01d6e5942096	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	\N	\N	DRAFT	\N	\N	2025-11-16 19:45:07.581487	2025-11-16 19:45:07.581487	\N
01e425eb-a345-49a9-b957-4274771d38dd	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	1d057cd2-36de-4ea2-aa44-057e31a20037	\N	DRAFT	\N	\N	2025-11-16 19:45:12.725883	2025-11-16 19:45:12.725883	\N
fd06952b-8fc3-40c1-9004-c2807675384c	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	\N	\N	DRAFT	\N	\N	2025-11-16 21:39:00.094457	2025-11-16 21:39:00.094457	\N
dd9035ea-ac5c-42cb-97fc-6f665b2c62e5	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	\N	\N	DRAFT	\N	\N	2025-11-17 09:34:17.17791	2025-11-17 09:34:17.17791	\N
419fa509-e471-48dd-915d-2741b6707eeb	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	1d057cd2-36de-4ea2-aa44-057e31a20037	\N	DRAFT	\N	\N	2025-11-17 09:35:28.678957	2025-11-17 09:35:28.678957	\N
d6f8a128-8c92-410b-b052-cc50e053b839	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	\N	\N	DRAFT	\N	\N	2025-11-17 10:16:32.004856	2025-11-17 10:16:32.004856	\N
7ee8eb3c-234e-4af6-a579-49e664daf977	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	1d057cd2-36de-4ea2-aa44-057e31a20037	\N	DRAFT	\N	\N	2025-11-17 10:17:13.188692	2025-11-17 10:17:13.188692	\N
124e7866-14a3-444c-80bd-8845fac8e6b1	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	207a1c12-2485-431b-a3f2-470b647336cc	\N	IN_PROGRESS	\N	\N	2025-11-18 00:59:23.184715	2025-11-18 21:54:36.427	\N
8e5afdd0-b6d0-4d0a-a3bc-f85801d3e40a	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	\N	\N	DRAFT	\N	\N	2025-11-19 00:07:43.871377	2025-11-19 00:07:43.871377	\N
bb0b59d4-3022-4b10-9a47-e2b953c4138c	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	fd656bb0-9b97-4d24-9d2f-23f017fb5417	\N	DRAFT	\N	\N	2025-11-19 00:07:52.437561	2025-11-19 00:07:52.437561	\N
99a45a2b-1830-4af2-a13b-86915f4df739	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	\N	\N	DRAFT	\N	\N	2025-11-19 00:54:12.309236	2025-11-19 00:54:12.309236	\N
7a243039-1042-4fed-9c95-b96a57670036	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	\N	\N	DRAFT	\N	\N	2025-11-19 00:54:14.793631	2025-11-19 00:54:14.793631	\N
3b61af34-a7b0-4ca8-9125-e342c40d2690	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	\N	\N	DRAFT	\N	\N	2025-11-19 04:05:29.324345	2025-11-19 04:05:29.324345	\N
f97d157e-8883-4a6e-afc5-9bf9ef5d5935	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	\N	\N	DRAFT	\N	\N	2025-11-19 19:53:07.851173	2025-11-19 19:53:07.851173	\N
9d21d405-ceb9-45c2-b488-f068acb2115e	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	\N	\N	DRAFT	\N	\N	2025-11-19 19:56:56.141468	2025-11-19 19:56:56.141468	\N
ec0c0e76-24c2-42d2-8a9f-28062bfa3202	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	1d057cd2-36de-4ea2-aa44-057e31a20037	\N	DRAFT	\N	\N	2025-11-19 19:59:47.533509	2025-11-19 19:59:47.533509	\N
29c29bab-5681-4d9a-8fd9-fdbe767668f9	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	\N	\N	DRAFT	\N	\N	2025-11-19 20:46:16.750857	2025-11-19 20:46:16.750857	\N
c9c07c25-3a18-430f-b8f3-8bd103406643	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	\N	\N	DRAFT	\N	\N	2025-11-20 00:01:00.688007	2025-11-20 00:01:00.688007	\N
abc74803-1783-48a2-b245-0c79af1c82de	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	\N	\N	\N	\N	DRAFT	\N	\N	2025-11-20 00:01:10.117816	2025-11-20 00:01:10.117816	\N
\.


--
-- Data for Name: email_attachments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.email_attachments (id, email_message_id, filename, content_type, size, url, storage_key, is_inline, content_id, created_at) FROM stdin;
\.


--
-- Data for Name: email_folders; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.email_folders (id, dealership_id, user_id, name, slug, icon, color, sort_order, is_system, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: email_labels; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.email_labels (id, dealership_id, user_id, name, color, icon, show_in_sidebar, sort_order, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: email_message_labels; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.email_message_labels (id, email_message_id, label_id, is_auto_applied, applied_by, created_at) FROM stdin;
\.


--
-- Data for Name: email_messages; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.email_messages (id, dealership_id, user_id, message_id, thread_id, in_reply_to, from_address, from_name, to_addresses, cc_addresses, bcc_addresses, reply_to, subject, html_body, text_body, folder, is_read, is_starred, is_draft, resend_id, resend_status, customer_id, deal_id, sent_at, received_at, created_at, updated_at, is_spam, spam_score) FROM stdin;
abf18ce2-4d42-4210-aac5-dd83b7333f41	fa136a38-696a-47b6-ac26-c184cc6ebe46	4731a127-da21-418c-b204-4a171d3b1a49	1763235369799.kp2cs@autolytiq.com	\N	\N	support@autolytiq.com	Autolytiq Support	[{"email": "AcWilliams.18@gmail.com"}]	[]	[]	\N	Test	Test	Test	sent	t	f	f	\N	sent	\N	\N	2025-11-15 19:36:09.799	\N	2025-11-15 19:36:09.837952	2025-11-15 19:36:09.837952	f	\N
34bab348-b46c-4974-b6d0-b139c1561933	fa136a38-696a-47b6-ac26-c184cc6ebe46	4731a127-da21-418c-b204-4a171d3b1a49	1763261408550.ts6edpi@autolytiq.com	\N	\N	support@autolytiq.com	Autolytiq Support	[{"email": "acwilliams.18@icloud.com"}]	[]	[]	\N	Test	Test 	Test 	sent	t	f	f	\N	sent	\N	\N	2025-11-16 02:50:08.55	\N	2025-11-16 02:50:08.584707	2025-11-16 02:50:08.584707	f	\N
07fb779d-476a-4faa-b713-d08ba278fc5f	fa136a38-696a-47b6-ac26-c184cc6ebe46	4731a127-da21-418c-b204-4a171d3b1a49	1763427461844.rzwqww@autolytiq.com	\N	\N	support@autolytiq.com	Autolytiq Support	[{"email": "ERICKBRADFORD@GMAIL.COM"}]	[]	[]	\N	AUTOLYTIQ TEST	<p>TEST</p>	TEST	sent	t	f	f	\N	sent	\N	\N	2025-11-18 00:57:41.844	\N	2025-11-18 00:57:41.878341	2025-11-18 00:57:41.878341	f	\N
\.


--
-- Data for Name: email_rules; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.email_rules (id, dealership_id, user_id, name, description, priority, is_active, conditions, actions, match_count, last_matched_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: fee_package_templates; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.fee_package_templates (id, name, description, category, dealership_id, created_by, updated_by, display_order, dealer_fees, accessories, aftermarket_products, is_active, created_at, updated_at) FROM stdin;
3ce04ea6-42f6-40ed-9535-e4a00945d0ce	Basic Package	Essential fees and basic protections - ideal for budget-conscious buyers	basic	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	1	[{"name": "Documentation Fee", "amount": 299, "taxable": false}, {"name": "Registration Fee", "amount": 150, "taxable": false}]	[{"name": "All-Weather Floor Mats", "amount": 199, "taxable": true}, {"name": "Trunk Cargo Tray", "amount": 129, "taxable": true}]	[{"id": "basic-warranty-1", "cost": 795, "name": "12-Month Basic Warranty", "term": 12, "price": 1295, "taxable": false, "category": "warranty"}]	t	2025-11-11 19:13:47.399685	2025-11-11 19:13:47.399685
f467a6d1-1563-4fcc-9c9a-6e126e475232	Premium Package	Comprehensive protection and popular add-ons for enhanced peace of mind	premium	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	2	[{"name": "Documentation Fee", "amount": 299, "taxable": false}, {"name": "Registration Fee", "amount": 150, "taxable": false}, {"name": "Electronic Filing Fee", "amount": 50, "taxable": false}]	[{"name": "All-Weather Floor Mats", "amount": 199, "taxable": true}, {"name": "Trunk Cargo Tray", "amount": 129, "taxable": true}, {"name": "Window Tinting", "amount": 399, "taxable": true}, {"name": "Paint Protection Film (Partial)", "amount": 599, "taxable": true}]	[{"id": "prem-warranty-1", "cost": 1595, "name": "36-Month Extended Warranty", "term": 36, "price": 2495, "taxable": false, "category": "warranty"}, {"id": "prem-gap-1", "cost": 495, "name": "GAP Insurance", "price": 795, "taxable": false, "category": "gap"}, {"id": "prem-tire-1", "cost": 395, "name": "Tire & Wheel Protection", "term": 36, "price": 695, "taxable": true, "category": "tire_wheel"}]	t	2025-11-11 19:13:47.399685	2025-11-11 19:13:47.399685
423aa03c-3533-4d4e-ad2f-35d4d285a519	Luxury Package	Ultimate protection suite with premium accessories for discerning buyers	luxury	\N	e77ab786-6ab4-43a5-b298-e15dccc27e29	\N	3	[{"name": "Documentation Fee", "amount": 299, "taxable": false}, {"name": "Registration Fee", "amount": 150, "taxable": false}, {"name": "Electronic Filing Fee", "amount": 50, "taxable": false}, {"name": "Dealer Prep & Detail", "amount": 495, "taxable": true}]	[{"name": "All-Weather Floor Mats", "amount": 199, "taxable": true}, {"name": "Trunk Cargo Tray", "amount": 129, "taxable": true}, {"name": "Window Tinting (Premium)", "amount": 399, "taxable": true}, {"name": "Paint Protection Film (Full Front)", "amount": 1299, "taxable": true}, {"name": "Ceramic Coating", "amount": 1499, "taxable": true}]	[{"id": "lux-warranty-1", "cost": 2595, "name": "60-Month Premium Warranty", "term": 60, "price": 3995, "taxable": false, "category": "warranty"}, {"id": "lux-gap-1", "cost": 595, "name": "GAP Insurance Plus", "price": 995, "taxable": false, "category": "gap"}, {"id": "lux-tire-1", "cost": 495, "name": "Tire & Wheel Protection Platinum", "term": 60, "price": 895, "taxable": true, "category": "tire_wheel"}, {"id": "lux-theft-1", "cost": 195, "name": "Theft Protection System", "price": 395, "taxable": true, "category": "theft"}, {"id": "lux-maint-1", "cost": 795, "name": "Maintenance Plan (5yr/60k miles)", "term": 60, "price": 1295, "taxable": true, "category": "maintenance"}]	t	2025-11-11 19:13:47.399685	2025-11-11 19:13:47.399685
\.


--
-- Data for Name: lender_programs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lender_programs (id, lender_id, name, type, vehicle_type, min_term, max_term, available_terms, rate_tiers, min_credit_score, max_ltv, max_dti, min_down_percent, requirements, incentives, origination_fee, max_advance, money_factor, residual_percents, acquisition_fee, active, effective_date, expiration_date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: lenders; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lenders (id, name, logo, type, min_credit_score, max_ltv, max_dti, states, active, dealer_reserve_max_bps, flat_max_bps, api_endpoint, api_key, routing_code, max_finance_amount, min_finance_amount, max_term, min_term, new_vehicle_max_age, used_vehicle_max_age, used_vehicle_max_mileage, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: local_tax_rates; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.local_tax_rates (id, state_code, county_name, county_fips, city_name, special_district_name, jurisdiction_type, tax_rate, effective_date, end_date, notes, source_url, last_verified, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.permissions (id, name, description, category, created_at) FROM stdin;
6275614f-6fb8-4e6e-9281-cccd00635ed6	deals:view	View deals	deals	2025-11-12 00:52:36.600535
09636bf4-b041-4150-a08d-79e5d3a3879f	deals:create	Create new deals	deals	2025-11-12 00:52:36.600535
bdf63c29-b6b6-4dfa-a45e-c01dc77cac6e	deals:edit	Edit deals	deals	2025-11-12 00:52:36.600535
449f40f5-bfa5-47c8-9421-631eb231c5a5	deals:delete	Delete deals	deals	2025-11-12 00:52:36.600535
3d53b446-1c97-4191-a8f4-9900ab58b2d2	deals:approve	Approve deals	deals	2025-11-12 00:52:36.600535
9127dfad-2e67-4bef-8956-9d57db391ab9	inventory:view	View inventory	inventory	2025-11-12 00:52:36.600535
ae9de208-5505-4766-acd2-e13e9bcdefbf	inventory:create	Add vehicles to inventory	inventory	2025-11-12 00:52:36.600535
df820f36-26fd-422f-9f7c-9713e37a9c0d	inventory:edit	Edit vehicle information	inventory	2025-11-12 00:52:36.600535
3557bbb0-3a7b-475a-bff7-2adad17db835	inventory:delete	Remove vehicles from inventory	inventory	2025-11-12 00:52:36.600535
ebacf4d9-1b1f-4c84-a3eb-e684796f5e6f	customers:view	View customers	customers	2025-11-12 00:52:36.600535
15148fb9-58d8-4633-a88a-30729002feb9	customers:create	Create customer records	customers	2025-11-12 00:52:36.600535
610d33a0-f28b-4244-9202-aaf4ba63722c	customers:edit	Edit customer information	customers	2025-11-12 00:52:36.600535
ddd10912-601a-4f0c-8e22-77338a756141	customers:delete	Delete customer records	customers	2025-11-12 00:52:36.600535
b6ebe5c7-95a0-4646-a2eb-b45a0450182f	settings:view	View dealership settings	settings	2025-11-12 00:52:36.600535
ba7cce6e-0328-4b7f-8831-5a5a1c1f37a5	settings:edit	Edit dealership settings	settings	2025-11-12 00:52:36.600535
9cf277f4-dd4a-42b1-a583-ddb54e4db5f5	users:view	View users	users	2025-11-12 00:52:36.600535
8771b0e2-a761-42f1-9a39-61c97e22d6a9	users:create	Create users	users	2025-11-12 00:52:36.600535
a141146e-4cc8-4721-a867-83ffd4393c10	users:edit	Edit users	users	2025-11-12 00:52:36.600535
655a472a-512d-4ec6-b9ec-4924f2193403	users:delete	Delete users	users	2025-11-12 00:52:36.600535
3d0e8086-31b9-47f7-b676-e1c704412bcd	users:manage_roles	Manage user roles	users	2025-11-12 00:52:36.600535
\.


--
-- Data for Name: quick_quote_contacts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.quick_quote_contacts (id, quick_quote_id, customer_id, name, phone, sms_sent_at, sms_delivery_status, created_at) FROM stdin;
80b23caa-a751-4a74-9cb5-ed7e23f769ff	a2386e65-60cb-4036-b155-f5f265e89ac6	\N	John Smith	5551234567	2025-11-11 03:22:33.3	delivered	2025-11-11 03:22:33.246879
2d8043b9-3958-4e10-89e3-5c5106eb0d2f	104faeaf-c2c6-40e8-8945-ada8ef441ed5	\N	Jane Doe	5559876543	2025-11-11 03:48:57	delivered	2025-11-11 03:48:56.951574
95031dc8-142e-43b3-9e90-8c6a2b2963fb	88b7c4f9-3e92-4e95-8c4f-548298db03d3	\N	NoVehicle Customer	5551111111	2025-11-11 03:54:25.053	delivered	2025-11-11 03:54:25.008185
18205f08-e800-4c98-a621-8ae14db7de9f	4ccd9325-0731-4808-a954-0cfabc35a4cb	\N	Test User	5551234567	2025-11-11 03:57:23.695	delivered	2025-11-11 03:57:23.652266
5a4fd665-5dc6-47b2-8bba-18df48df849d	f845feed-9da9-464e-b3c0-2345a0ecca0d	\N	Test User	5551234567	2025-11-11 04:00:46.879	delivered	2025-11-11 04:00:46.835195
a788a4ce-a57e-43d1-a0e6-739675fe07e3	f9eae255-d488-4c9b-825a-756a9a625ae0	\N	Test	5551234567	2025-11-11 04:03:14.054	delivered	2025-11-11 04:03:14.009238
8a5ec0ac-6456-4225-8e63-111e326ebed5	d5b08eb2-672d-4e17-b1b0-71f2380ad1c8	\N	Bob	5559876543	2025-11-11 04:05:47.452	delivered	2025-11-11 04:05:47.408167
c9b3a481-c6fd-400a-b777-4c499f0f1484	e913c293-ce2f-47fb-a3e4-e6ab18cd0b3b	\N	Alice	5551112222	2025-11-11 04:07:43.888	delivered	2025-11-11 04:07:43.845553
d328eb08-6d1e-4b83-85ff-648a52bd29c2	bd4be9ca-572d-4e3e-a234-cee58d714ff2	\N	John Smith	5551234567	2025-11-11 13:32:05.327	delivered	2025-11-11 13:32:05.278324
\.


--
-- Data for Name: quick_quotes; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.quick_quotes (id, salesperson_id, vehicle_id, quote_payload, status, deal_id, created_at) FROM stdin;
104faeaf-c2c6-40e8-8945-ada8ef441ed5	\N	\N	{"apr": 8.5, "vehicle": {"make": "Chevrolet", "year": 2023, "model": "Malibu", "price": 22990}, "termMonths": 60, "tradeValue": 8000, "downPayment": 5000, "tradePayoff": 3000, "vehiclePrice": 22990, "amountFinanced": 12990, "calculatedPayment": 216.97}	sent	\N	2025-11-11 03:46:47.851072
a2386e65-60cb-4036-b155-f5f265e89ac6	\N	1d057cd2-36de-4ea2-aa44-057e31a20037	{"apr": 12.9, "vehicle": {"make": "Chevrolet", "year": 2023, "model": "Malibu", "price": "22990.00"}, "hasTrade": false, "termMonths": 60, "tradeValue": null, "downPayment": 10000, "tradePayoff": null, "targetPayment": 500, "amountFinanced": 12990, "calculatedPayment": 295}	converted	762ab992-1639-42b7-a932-154f3465ac42	2025-11-11 03:20:58.692655
64705b44-b00d-4889-a999-83c21bbbbc92	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 25000, "amountFinanced": 25000, "calculatedPayment": 418.03}	draft	\N	2025-11-11 03:46:47.602281
07763614-1b96-40a9-8bce-0c89461d34b6	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 25000, "amountFinanced": 25000, "calculatedPayment": 418.03}	draft	\N	2025-11-11 03:46:47.597298
1b1c1542-3b53-4af9-919b-f13aa5984553	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 25000, "amountFinanced": 25000, "calculatedPayment": 418.03}	draft	\N	2025-11-11 03:46:47.714637
69811d09-c555-4b2e-bce0-1f7472cc118f	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 25000, "amountFinanced": 25000, "calculatedPayment": 418.03}	draft	\N	2025-11-11 03:46:47.746661
640997a2-14f3-4baa-be7c-0caac03c0d50	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 25000, "amountFinanced": 25000, "calculatedPayment": 418.03}	draft	\N	2025-11-11 03:46:47.76526
e9d3d5b3-7e27-41bc-bd27-341a5beb26e1	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 25000, "amountFinanced": 25000, "calculatedPayment": 418.03}	draft	\N	2025-11-11 03:46:47.771469
dcb32f03-2c47-46bb-ab89-785cfa3162ef	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 25000, "amountFinanced": 25000, "calculatedPayment": 418.03}	draft	\N	2025-11-11 03:46:47.801369
b4b2a30d-2c95-4b3a-a995-b0bf64e275c6	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 25000, "amountFinanced": 25000, "calculatedPayment": 418.03}	draft	\N	2025-11-11 03:53:18.780727
dacdb9bb-8754-4ace-9cf8-23865282a5ea	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 25000, "amountFinanced": 25000, "calculatedPayment": 418.03}	draft	\N	2025-11-11 03:53:18.865828
5ec3d498-8824-4393-8ed7-9f4217b9a8f5	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 25000, "amountFinanced": 25000, "calculatedPayment": 418.03}	draft	\N	2025-11-11 03:53:18.855037
7559aea9-07cf-4173-a557-77341abadba6	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 25000, "amountFinanced": 25000, "calculatedPayment": 418.03}	draft	\N	2025-11-11 03:53:18.975931
3b2bac46-1a58-4a9c-9b81-c891ec2376b8	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 25000, "amountFinanced": 25000, "calculatedPayment": 418.03}	draft	\N	2025-11-11 03:53:18.86337
846b0022-2cc6-4e76-9e8e-8558629a9ee8	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 25000, "amountFinanced": 25000, "calculatedPayment": 418.03}	draft	\N	2025-11-11 03:53:18.945732
207e1cf9-98fb-472c-a48f-dc66cf992487	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 25000, "amountFinanced": 25000, "calculatedPayment": 418.03}	draft	\N	2025-11-11 03:53:18.943622
f3bc86b7-f190-4675-814e-418ad38d782a	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 25000, "amountFinanced": 25000, "calculatedPayment": 418.03}	draft	\N	2025-11-11 03:53:18.944679
1d8303a0-9650-4166-857b-5203367a96e2	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 25000, "amountFinanced": 25000, "calculatedPayment": 418.03}	draft	\N	2025-11-11 03:53:18.976093
88b7c4f9-3e92-4e95-8c4f-548298db03d3	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": 8000, "downPayment": 5000, "tradePayoff": 3000, "vehiclePrice": 25000, "amountFinanced": 12300, "calculatedPayment": 205.67}	sent	\N	2025-11-11 03:53:19.138302
fab93205-d899-4f43-910b-d6671f15b5b8	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 25000, "amountFinanced": 25000, "calculatedPayment": 418.03}	draft	\N	2025-11-11 03:56:38.150516
6dc04625-4653-4de9-bf23-90b905aef006	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 25000, "amountFinanced": 25000, "calculatedPayment": 418.03}	draft	\N	2025-11-11 03:56:38.29928
4ea58a60-4b19-4d5d-a03a-73142ac37721	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 250, "amountFinanced": 250, "calculatedPayment": 4.18}	draft	\N	2025-11-11 03:56:38.06968
4ccd9325-0731-4808-a954-0cfabc35a4cb	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": 8000, "downPayment": 5000, "tradePayoff": 3000, "vehiclePrice": 25000, "amountFinanced": 15000, "calculatedPayment": 250.82}	converted	a830e968-3688-45c9-96b5-1df51ab451d6	2025-11-11 03:56:38.373864
96d74485-a3c7-48ba-b745-36a251fa1fc6	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 2500, "amountFinanced": 2500, "calculatedPayment": 41.8}	draft	\N	2025-11-11 03:59:55.55468
a0bd5921-045a-4974-af0a-6f7d6b126478	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 25000, "amountFinanced": 25000, "calculatedPayment": 418.03}	draft	\N	2025-11-11 03:59:55.635324
74368657-0ff0-4b5d-ab5f-2712eab80872	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 25000, "amountFinanced": 25000, "calculatedPayment": 418.03}	draft	\N	2025-11-11 03:59:55.553504
9ff48888-50ab-4c70-b00e-4936585f82be	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 25000, "amountFinanced": 25000, "calculatedPayment": 418.03}	draft	\N	2025-11-11 03:59:55.653414
feace83e-7f41-4e7d-a754-34cd9b61eba4	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 25000, "amountFinanced": 25000, "calculatedPayment": 418.03}	draft	\N	2025-11-11 03:59:55.654316
b2909e2d-5b9c-474a-9c2d-a62c43b428ec	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 25000, "amountFinanced": 25000, "calculatedPayment": 418.03}	draft	\N	2025-11-11 03:59:55.654729
1db269fb-54f0-4268-beda-4ba8537f3cd2	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 25000, "amountFinanced": 25000, "calculatedPayment": 418.03}	draft	\N	2025-11-11 03:59:55.723673
56619333-5cf3-44a8-a43f-58d99f1a7855	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 25000, "amountFinanced": 25000, "calculatedPayment": 418.03}	draft	\N	2025-11-11 04:02:51.406128
7f8d0c9d-f647-49a0-a0e7-f924fa4ad84b	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 28000, "amountFinanced": 28000, "calculatedPayment": 468.2}	draft	\N	2025-11-11 04:05:17.287364
de4df852-424c-418f-b60a-f2f709e7f2ff	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 28000, "amountFinanced": 28000, "calculatedPayment": 468.2}	draft	\N	2025-11-11 04:05:17.290028
995f43ce-a400-4660-b6c3-6f9819b6e8be	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 28000, "amountFinanced": 28000, "calculatedPayment": 468.2}	draft	\N	2025-11-11 04:05:17.368292
c8a732b4-1ca0-4576-86b0-8dadf1e2c52a	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 28000, "amountFinanced": 28000, "calculatedPayment": 468.2}	draft	\N	2025-11-11 04:05:17.369187
f845feed-9da9-464e-b3c0-2345a0ecca0d	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": 8000, "downPayment": 5000, "tradePayoff": 3000, "vehiclePrice": 25000, "amountFinanced": 12300, "calculatedPayment": 205.67}	converted	e7a6c49c-ca27-45bb-8045-58d9ce4b6d1a	2025-11-11 03:59:55.727802
ca819b23-192b-4aca-b0d1-14c783ddd5bc	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 28000, "amountFinanced": 28000, "calculatedPayment": 468.2}	draft	\N	2025-11-11 04:05:17.371449
ab07e2e7-3e24-4306-b209-d06275c096f5	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 28000, "amountFinanced": 28000, "calculatedPayment": 468.2}	draft	\N	2025-11-11 04:05:17.378646
3fdbbfcb-2c3d-455e-8721-8fbe5b5c8c91	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 28000, "amountFinanced": 28000, "calculatedPayment": 468.2}	draft	\N	2025-11-11 04:05:17.44391
f9eae255-d488-4c9b-825a-756a9a625ae0	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": 5000, "tradePayoff": null, "vehiclePrice": 25000, "amountFinanced": 20000, "calculatedPayment": 334.43}	converted	69b59de1-be0c-4956-b69a-b6856fde9f43	2025-11-11 04:02:51.49074
12675471-6838-421d-96d0-3e1dbf4a169e	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 250, "amountFinanced": 250, "calculatedPayment": 4.18}	draft	\N	2025-11-11 04:02:51.180446
03e17701-6a02-485a-b110-7f38abc4de4f	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 250, "amountFinanced": 250, "calculatedPayment": 4.18}	draft	\N	2025-11-11 04:02:51.263953
a4e839fb-5146-4c08-af9b-ab008ff32475	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 30000, "amountFinanced": 30000, "calculatedPayment": 501.64}	draft	\N	2025-11-11 04:07:21.143786
e5685f42-d857-47f1-b484-3a9a974bf2fd	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 30000, "amountFinanced": 30000, "calculatedPayment": 501.64}	draft	\N	2025-11-11 04:07:21.205871
87b60fa7-f6d7-4c21-9365-b1c2b610c66d	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 30000, "amountFinanced": 30000, "calculatedPayment": 501.64}	draft	\N	2025-11-11 04:07:21.132136
bd4be9ca-572d-4e3e-a234-cee58d714ff2	\N	1d057cd2-36de-4ea2-aa44-057e31a20037	{"apr": 12.9, "vehicle": {"make": "Chevrolet", "year": 2023, "model": "Malibu", "price": 35000}, "termMonths": 60, "tradeValue": null, "downPayment": 5000, "tradePayoff": null, "vehiclePrice": 35000, "amountFinanced": 34500, "calculatedPayment": 576.89}	converted	7d30c6b6-d5d5-4273-8ae7-170dca1cf22f	2025-11-11 13:31:00.645518
d95f1738-f863-4332-a1cf-1be3e7a777f1	\N	1d057cd2-36de-4ea2-aa44-057e31a20037	{"apr": 12.9, "vehicle": {"make": "Chevrolet", "year": 2023, "model": "Malibu", "price": 22990}, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 22990, "amountFinanced": 22990, "calculatedPayment": 384.42}	draft	\N	2025-11-11 13:33:08.013919
3f7f3835-fc85-4f5e-b872-e0d03a01b3d5	\N	1d057cd2-36de-4ea2-aa44-057e31a20037	{"apr": 12.9, "vehicle": {"make": "Chevrolet", "year": 2023, "model": "Malibu", "price": 22990}, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 22990, "amountFinanced": 22990, "calculatedPayment": 384.42}	draft	\N	2025-11-11 13:33:08.022192
d5b08eb2-672d-4e17-b1b0-71f2380ad1c8	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": 6000, "tradePayoff": null, "vehiclePrice": 28000, "amountFinanced": 22000, "calculatedPayment": 367.87}	converted	5c6a5e71-e8ee-4368-8d4c-d2198beb75e8	2025-11-11 04:05:17.446492
a042a42b-7dfa-4f4c-8a53-6d219faf3e2b	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 30000, "amountFinanced": 3000, "calculatedPayment": 50.16}	draft	\N	2025-11-11 04:07:21.050586
5f27d3ef-d769-4779-84ba-f440080fc78e	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 30000, "amountFinanced": 30000, "calculatedPayment": 501.64}	draft	\N	2025-11-11 04:07:21.066584
e4d79354-6c5e-4e32-a2f0-eb0418840c4f	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 30000, "amountFinanced": 30000, "calculatedPayment": 501.64}	draft	\N	2025-11-11 04:07:21.130952
d3c14624-c275-47ee-9f91-27d0d73ea588	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 30000, "amountFinanced": 30000, "calculatedPayment": 501.64}	draft	\N	2025-11-11 04:07:21.131735
e913c293-ce2f-47fb-a3e4-e6ab18cd0b3b	\N	\N	{"apr": 12.9, "vehicle": null, "termMonths": 60, "tradeValue": null, "downPayment": 7500, "tradePayoff": null, "vehiclePrice": 30000, "amountFinanced": 22500, "calculatedPayment": 376.23}	converted	5917965e-a56c-49cf-a581-ec6e9377db6f	2025-11-11 04:07:21.214931
2f0c7ea0-d279-480f-a9ae-4a4eab4b5d1d	\N	1d057cd2-36de-4ea2-aa44-057e31a20037	{"apr": 12.9, "vehicle": {"make": "Chevrolet", "year": 2023, "model": "Malibu", "price": 22990}, "termMonths": 60, "tradeValue": null, "downPayment": null, "tradePayoff": null, "vehiclePrice": 22990, "amountFinanced": 22990, "calculatedPayment": 384.42}	draft	\N	2025-11-11 13:31:00.416424
\.


--
-- Data for Name: rate_requests; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.rate_requests (id, deal_id, scenario_id, credit_score, cobuyer_credit_score, requested_amount, down_payment, trade_value, trade_payoff, term, monthly_income, monthly_debt, calculated_dti, vehicle_data, request_type, request_data, response_data, response_count, status, error_message, requested_at, responded_at, expires_at, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.role_permissions (id, role, permission_id, created_at) FROM stdin;
f33483df-4595-405d-a40b-b14e7bc9bc97	salesperson	6275614f-6fb8-4e6e-9281-cccd00635ed6	2025-11-12 00:52:38.328399
d414439f-5b9d-4670-b5be-9acf7fe9af6d	salesperson	09636bf4-b041-4150-a08d-79e5d3a3879f	2025-11-12 00:52:38.328399
71be3347-b52b-4d4d-b792-733ef49bfedc	salesperson	bdf63c29-b6b6-4dfa-a45e-c01dc77cac6e	2025-11-12 00:52:38.328399
a7808c2c-ee57-45f4-9cb1-de98ffbd0cae	salesperson	9127dfad-2e67-4bef-8956-9d57db391ab9	2025-11-12 00:52:38.328399
403452f1-6994-46d7-9654-b6d4539e8576	salesperson	ebacf4d9-1b1f-4c84-a3eb-e684796f5e6f	2025-11-12 00:52:38.328399
1c6665dc-6fdd-41b4-83c8-ffcbeb85e693	salesperson	15148fb9-58d8-4633-a88a-30729002feb9	2025-11-12 00:52:38.328399
bf4102cf-8807-415b-936f-56594292bad1	salesperson	610d33a0-f28b-4244-9202-aaf4ba63722c	2025-11-12 00:52:38.328399
2602dec6-8fc5-4592-b424-3741ea40a7fe	sales_manager	6275614f-6fb8-4e6e-9281-cccd00635ed6	2025-11-12 00:52:40.42361
6c05ec9f-792a-47c5-91d3-ad3db92554bd	sales_manager	09636bf4-b041-4150-a08d-79e5d3a3879f	2025-11-12 00:52:40.42361
9fbc2436-e7a0-4630-8b43-48813af150c4	sales_manager	bdf63c29-b6b6-4dfa-a45e-c01dc77cac6e	2025-11-12 00:52:40.42361
0929df85-ebc0-4f82-8b8c-dc00d7968371	sales_manager	3d53b446-1c97-4191-a8f4-9900ab58b2d2	2025-11-12 00:52:40.42361
755ad121-138b-463f-8f80-3db4807c8bdb	sales_manager	9127dfad-2e67-4bef-8956-9d57db391ab9	2025-11-12 00:52:40.42361
b7f3fe48-f6cd-401e-868a-e1151bccf36d	sales_manager	ae9de208-5505-4766-acd2-e13e9bcdefbf	2025-11-12 00:52:40.42361
0909e1c6-4b5c-4fc6-ba0c-ef01800a15e1	sales_manager	df820f36-26fd-422f-9f7c-9713e37a9c0d	2025-11-12 00:52:40.42361
db80a4fc-e936-4ad6-a1c0-3371e1499c89	sales_manager	3557bbb0-3a7b-475a-bff7-2adad17db835	2025-11-12 00:52:40.42361
5eae229d-af6c-42d0-9f91-6037a055011a	sales_manager	ebacf4d9-1b1f-4c84-a3eb-e684796f5e6f	2025-11-12 00:52:40.42361
9f99f7c5-eafe-4568-897e-e7eb3c6e40e7	sales_manager	15148fb9-58d8-4633-a88a-30729002feb9	2025-11-12 00:52:40.42361
ed2b6574-5ce0-4d34-bba1-a75f2d44f1a1	sales_manager	610d33a0-f28b-4244-9202-aaf4ba63722c	2025-11-12 00:52:40.42361
e5de035c-4747-41fc-9e6d-50baa9e1db2a	sales_manager	ddd10912-601a-4f0c-8e22-77338a756141	2025-11-12 00:52:40.42361
810da18a-a55c-405f-b302-a272e1152869	finance_manager	6275614f-6fb8-4e6e-9281-cccd00635ed6	2025-11-12 00:52:41.83637
4e47ad03-2f8f-4e53-9f7c-f42d0fe532ca	finance_manager	09636bf4-b041-4150-a08d-79e5d3a3879f	2025-11-12 00:52:41.83637
96c6f9e5-12ee-4843-ad62-343c3aa08780	finance_manager	bdf63c29-b6b6-4dfa-a45e-c01dc77cac6e	2025-11-12 00:52:41.83637
1b03548a-94d2-4ccf-a26a-b41426bb5526	finance_manager	449f40f5-bfa5-47c8-9421-631eb231c5a5	2025-11-12 00:52:41.83637
38e06fbd-9730-4514-a79c-72c3722ff4e2	finance_manager	3d53b446-1c97-4191-a8f4-9900ab58b2d2	2025-11-12 00:52:41.83637
75a379b8-4e8d-4249-8283-0c4e5470331b	finance_manager	9127dfad-2e67-4bef-8956-9d57db391ab9	2025-11-12 00:52:41.83637
07830c14-8039-47d5-82ba-3b0b2bddd74f	finance_manager	ebacf4d9-1b1f-4c84-a3eb-e684796f5e6f	2025-11-12 00:52:41.83637
dc8bb693-eb70-41b8-8a6f-a403b29d6ec0	finance_manager	15148fb9-58d8-4633-a88a-30729002feb9	2025-11-12 00:52:41.83637
0727c9d2-81a5-4a8e-abd6-ba82127d4acc	finance_manager	610d33a0-f28b-4244-9202-aaf4ba63722c	2025-11-12 00:52:41.83637
e4c70a9b-92f4-4567-a9bb-226449e6fd64	finance_manager	b6ebe5c7-95a0-4646-a2eb-b45a0450182f	2025-11-12 00:52:41.83637
09c5c2f8-a454-45fb-9372-d1e79e65dd81	admin	6275614f-6fb8-4e6e-9281-cccd00635ed6	2025-11-12 00:52:44.187449
575ba419-5fbe-4078-bf51-91ab35e40dc5	admin	09636bf4-b041-4150-a08d-79e5d3a3879f	2025-11-12 00:52:44.187449
55674872-b19a-4e2d-bddf-2215ce953fde	admin	bdf63c29-b6b6-4dfa-a45e-c01dc77cac6e	2025-11-12 00:52:44.187449
bbf2fa7a-50c1-40e9-9383-7b3156bb5d65	admin	449f40f5-bfa5-47c8-9421-631eb231c5a5	2025-11-12 00:52:44.187449
badbbefe-56f0-40d6-bcb7-b385ca5552c2	admin	3d53b446-1c97-4191-a8f4-9900ab58b2d2	2025-11-12 00:52:44.187449
3748596e-9d19-40c5-a7dc-d7230b45d5e9	admin	9127dfad-2e67-4bef-8956-9d57db391ab9	2025-11-12 00:52:44.187449
009584d7-eddc-4320-90ba-ca45a0bb9ecc	admin	ae9de208-5505-4766-acd2-e13e9bcdefbf	2025-11-12 00:52:44.187449
874349bf-5ecc-4e8d-a002-5f3fe5dfbc42	admin	df820f36-26fd-422f-9f7c-9713e37a9c0d	2025-11-12 00:52:44.187449
02401797-8a6a-4d4d-93cc-b2d5331ac370	admin	3557bbb0-3a7b-475a-bff7-2adad17db835	2025-11-12 00:52:44.187449
e53475e5-42f1-4589-9cdd-432548fc89a3	admin	ebacf4d9-1b1f-4c84-a3eb-e684796f5e6f	2025-11-12 00:52:44.187449
64c7a0b4-dacc-46a0-b29d-39c31ee51b82	admin	15148fb9-58d8-4633-a88a-30729002feb9	2025-11-12 00:52:44.187449
17a2eb56-4d15-4a6f-a490-73dccb675dc0	admin	610d33a0-f28b-4244-9202-aaf4ba63722c	2025-11-12 00:52:44.187449
4ab63a20-cbff-49b7-956d-17e843833f1d	admin	ddd10912-601a-4f0c-8e22-77338a756141	2025-11-12 00:52:44.187449
8fdda1b0-1a0e-41bb-8d01-a7a82eb5d7d2	admin	b6ebe5c7-95a0-4646-a2eb-b45a0450182f	2025-11-12 00:52:44.187449
8617b86a-4288-4bec-b54d-028666c5d962	admin	ba7cce6e-0328-4b7f-8831-5a5a1c1f37a5	2025-11-12 00:52:44.187449
fde095b9-f05d-4495-bf1a-2d343af2e93a	admin	9cf277f4-dd4a-42b1-a583-ddb54e4db5f5	2025-11-12 00:52:44.187449
e66dfbe4-098e-4cd6-8073-2f7fce66b467	admin	8771b0e2-a761-42f1-9a39-61c97e22d6a9	2025-11-12 00:52:44.187449
c7ed3576-b513-43ad-a73f-bf4d7af1d32a	admin	a141146e-4cc8-4721-a867-83ffd4393c10	2025-11-12 00:52:44.187449
1e1c1f24-6392-40fc-bf01-5b71e577cb79	admin	655a472a-512d-4ec6-b9ec-4924f2193403	2025-11-12 00:52:44.187449
69dca83f-f01c-42f1-b0ab-f2e1c321107d	admin	3d0e8086-31b9-47f7-b676-e1c704412bcd	2025-11-12 00:52:44.187449
\.


--
-- Data for Name: rooftop_configurations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.rooftop_configurations (id, dealership_id, rooftop_id, name, dealer_state_code, address, city, zip_code, default_tax_perspective, allowed_registration_states, state_overrides, drive_out_enabled, drive_out_states, custom_tax_rates, is_active, is_primary, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: security_audit_log; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.security_audit_log (id, user_id, username, event_type, event_category, ip_address, user_agent, metadata, success, error_message, created_at) FROM stdin;
2734c715-9291-4093-88d8-4ca7cd24b3b8	a3b36da5-3bb9-4345-aa48-24b6bf413918	testuser_BZqAtm	mfa_setup_initiated	security	10.83.0.244	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	{"userId": "a3b36da5-3bb9-4345-aa48-24b6bf413918"}	t	\N	2025-11-12 01:13:47.994962
05b09bc0-9e84-44f5-96d3-12b32c6767ce	a3b36da5-3bb9-4345-aa48-24b6bf413918	testuser_BZqAtm	mfa_enabled	security	10.83.0.244	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	{"userId": "a3b36da5-3bb9-4345-aa48-24b6bf413918"}	t	\N	2025-11-12 01:14:47.963863
e54cebfd-8e4b-4f3d-a17b-b0f7d89779d9	\N	\N	password_reset_requested	authentication	10.83.10.21	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	{"email": "testuser_BZqAtm@example.com", "userId": "a3b36da5-3bb9-4345-aa48-24b6bf413918"}	t	\N	2025-11-12 01:17:04.485959
4276fcf8-1d5d-48f8-b366-217a2c4688fd	\N	\N	password_reset_requested	authentication	127.0.0.1	curl/8.14.1	{"email": "admin@autolytiq.com", "userId": "4731a127-da21-418c-b204-4a171d3b1a49"}	t	\N	2025-11-12 17:02:12.706583
5e56b4e3-4339-49d8-a650-330922f9fff9	\N	\N	password_reset_requested	authentication	127.0.0.1	curl/8.14.1	{"email": "test-nonexistent@example.com", "found": false}	t	\N	2025-11-12 17:03:17.360394
b1f096c2-4206-46c1-9d7a-d0e0c5d9b6a0	\N	\N	password_reset_requested	authentication	127.0.0.1	curl/8.14.1	{"email": "admin@autolytiq.com", "userId": "4731a127-da21-418c-b204-4a171d3b1a49"}	t	\N	2025-11-12 17:03:25.730002
3e81dc40-3cdc-445a-866b-930ec78d6896	\N	\N	password_reset_requested	authentication	127.0.0.1	curl/8.14.1	{"email": "admin@autolytiq.com", "userId": "4731a127-da21-418c-b204-4a171d3b1a49"}	t	\N	2025-11-12 17:12:06.852744
c875d759-82c4-4d07-be98-f0b913fdd202	\N	\N	password_reset_requested	authentication	127.0.0.1	curl/8.14.1	{"email": "admin@autolytiq.com", "userId": "4731a127-da21-418c-b204-4a171d3b1a49"}	t	\N	2025-11-12 17:31:57.939409
b6d814d5-a14c-4fb3-b3ad-fe39d3b3eda3	4731a127-da21-418c-b204-4a171d3b1a49	admin	user_updated	account_management	10.83.9.107	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	{"updatedFields": ["fullName", "email", "role", "isActive"], "updatedUserId": "4731a127-da21-418c-b204-4a171d3b1a49", "updatedByUserId": "4731a127-da21-418c-b204-4a171d3b1a49"}	t	\N	2025-11-12 21:22:12.755781
ff3232e4-4d1d-4c81-80e0-fcefe502fc56	4731a127-da21-418c-b204-4a171d3b1a49	admin	user_created	account_management	10.83.2.151	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	{"createdUserId": "8ddaa102-8039-4c0e-9554-c4742e25f5ec", "createdByUserId": "4731a127-da21-418c-b204-4a171d3b1a49", "createdUserRole": "admin"}	t	\N	2025-11-12 21:34:32.398824
3c7cf44e-5240-487e-a643-0634c60a73c3	4731a127-da21-418c-b204-4a171d3b1a49	admin	user_created	account_management	127.0.0.1	curl/8.14.1	{"createdUserId": "eaaea354-4954-44ac-af98-a833d781ff44", "createdByUserId": "4731a127-da21-418c-b204-4a171d3b1a49", "createdUserRole": "salesperson"}	t	\N	2025-11-12 21:55:00.738052
9291dae2-7420-45f2-bbe1-24d5547889f5	4731a127-da21-418c-b204-4a171d3b1a49	admin	user_updated	account_management	10.83.7.156	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Replit-Bonsai/2.163.0 (iOS 26.2)	{"updatedFields": ["fullName", "email", "role", "isActive"], "updatedUserId": "8ddaa102-8039-4c0e-9554-c4742e25f5ec", "updatedByUserId": "4731a127-da21-418c-b204-4a171d3b1a49"}	t	\N	2025-11-16 10:21:23.776358
81001811-62d8-46c6-bf93-4ff9d670dc50	4731a127-da21-418c-b204-4a171d3b1a49	admin	user_updated	account_management	10.83.8.195	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Replit-Bonsai/2.163.0 (iOS 26.2)	{"updatedFields": ["fullName", "email", "role", "isActive"], "updatedUserId": "8ddaa102-8039-4c0e-9554-c4742e25f5ec", "updatedByUserId": "4731a127-da21-418c-b204-4a171d3b1a49"}	t	\N	2025-11-16 10:21:38.813572
f2db94db-aee8-4244-b6ff-814a766c5d32	4731a127-da21-418c-b204-4a171d3b1a49	admin	dealership_settings_updated	account_management	10.83.6.93	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Replit-Bonsai/2.163.0 (iOS 26.2)	{"userId": "4731a127-da21-418c-b204-4a171d3b1a49", "updatedFields": ["address", "city", "state", "phone", "email", "primaryColor"]}	t	\N	2025-11-16 19:44:55.405704
ebb297a0-7fc4-48b0-a2b7-78bd9ec008fa	4731a127-da21-418c-b204-4a171d3b1a49	admin	dealership_settings_updated	account_management	10.83.9.189	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	{"userId": "4731a127-da21-418c-b204-4a171d3b1a49", "updatedFields": ["address", "city", "state", "phone", "email", "primaryColor"]}	t	\N	2025-11-19 00:10:57.896525
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.session (sid, sess, expire) FROM stdin;
FsZjwPXIuiBWpXwmKgl1ExD_B0lfHShP	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-19T02:37:58.702Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"00000000-0000-0000-0000-000000000001"}}	2025-11-19 02:38:29
JjmmzChO50zCF-i2zPjHMlK-KRwLAEjU	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-19T13:20:40.182Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"3733168d-6665-4f98-8cdc-0c88e84118f1"}}	2025-11-19 13:21:47
vtRfcaWLYgzB-_drB3lzje7Sy1hjnKON	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-19T13:27:11.191Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"3cf62f9f-47ec-49f8-b808-4579c19aff64"}}	2025-11-19 13:28:23
V8XOTeSExfCePvhnxhmxVoVzQdR2JDnR	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-19T13:35:03.560Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"35ee6e9d-725d-4fbb-91fc-3cf314358044"}}	2025-11-19 13:36:29
2b82tyQWxm6t2PnpjQZFyRgMIDjizR3j	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-19T00:07:15.617Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"81dc2906-432b-455c-8d89-35e86abd89ca"}}	2025-11-19 00:08:37
9tYEGW3QmsbISmKjzXy5X7B1wOhIGh2x	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-19T01:15:39.848Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"pending2faUserId":"a3b36da5-3bb9-4345-aa48-24b6bf413918"}	2025-11-19 01:17:05
j1vToE6eH5VSfhoqW1UZUyxUxubqXRag	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-19T05:22:04.687Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"7d80f8da-cd4f-4986-b663-9f03ed5699a2"}}	2025-11-19 05:24:27
5jJyxYZXrOM8keSyOBifEuiGPBu0auNa	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-19T02:01:46.243Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"00000000-0000-0000-0000-000000000001"}}	2025-11-19 02:01:47
kl8TfOvLZ2AWrZJ61QRDOKBFsY7jIaHa	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-19T02:43:34.053Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"00000000-0000-0000-0000-000000000001"}}	2025-11-19 02:44:40
MxGMETxPEN30uWIUZMOztpvQ0HSXhQMw	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-19T02:01:52.975Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"00000000-0000-0000-0000-000000000001"}}	2025-11-19 02:01:53
SrhPeC4i5NLhERe4GzJ33Onw22wCLbQM	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-19T02:01:59.360Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"00000000-0000-0000-0000-000000000001"}}	2025-11-19 02:02:00
UJ24aEz98URD-kImkWHsv0jQdNQAnV6g	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-19T02:03:28.172Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"00000000-0000-0000-0000-000000000001"}}	2025-11-19 02:03:29
dhyymHiocf4NmZFWloZoDpkUqwP4RRnH	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-19T00:17:54.546Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"85a54520-9fba-4d14-bc58-d33ff8e1d675"}}	2025-11-19 00:19:22
0zqet31pkFQ8XVpU6ROTm0UJS7rgky1A	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-19T00:12:00.664Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"a049c2ab-8aeb-4d97-8af6-24ea96ca9617"}}	2025-11-19 00:14:19
vsE9Fl4SM9AkSg_307GsgCbC5mrtbmJM	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-19T02:41:03.319Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"00000000-0000-0000-0000-000000000001"}}	2025-11-19 02:42:12
sOe7zxNhT4sfgsH2Fqn3QC4DYCO9Xvl_	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-19T13:31:37.226Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"1535c95d-87cc-465a-b0f4-4bf8aad6da0f"}}	2025-11-19 13:33:23
82YGZqWl6QqwdAZ8pAW7Ek_EX3Qd6p-4	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-19T02:05:57.146Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"00000000-0000-0000-0000-000000000001"}}	2025-11-19 16:07:51
OHRxjGY6pxeJRuOMDn35udMEcsWpj_CC	{"cookie":{"originalMaxAge":604800000,"expires":"2025-11-19T13:38:34.232Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"bccdb2f1-5a70-4f31-bddc-36ca254c0720"}}	2025-11-19 13:39:50
\.


--
-- Data for Name: tax_jurisdictions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.tax_jurisdictions (id, state, county, city, state_tax_rate, county_tax_rate, city_tax_rate, trade_in_credit_type, registration_fee, title_fee, plate_fee, doc_fee_max, township, special_district, zip_code, township_tax_rate, special_district_tax_rate, created_at, updated_at, tax_rule_group_id) FROM stdin;
d27e7c45-7062-4dd8-9e6e-694384b85a76	CA	Los Angeles	\N	0.0725	0.0025	0.0000	tax_on_difference	65.00	15.00	30.00	85.00	\N	\N	\N	0.0000	0.0000	2025-11-09 22:09:07.819132	2025-11-09 22:09:07.893145	\N
6d37df4d-76b4-4419-90fd-3bae6a5e2c82	CA	San Francisco	\N	0.0725	0.0025	0.0050	tax_on_difference	65.00	15.00	30.00	85.00	\N	\N	\N	0.0000	0.0000	2025-11-09 22:09:07.819132	2025-11-09 22:09:07.893145	\N
3e5574b4-5e3c-42b3-a7b6-37c0ce018572	CA	San Diego	\N	0.0725	0.0025	0.0000	tax_on_difference	65.00	15.00	30.00	85.00	\N	\N	\N	0.0000	0.0000	2025-11-09 22:09:07.819132	2025-11-09 22:09:07.893145	\N
6278db42-2796-4f72-aef0-ab8189a2acc9	OH	Ashtabula	Ashtabula	0.0575	0.0150	0.0050	tax_on_difference	0.00	0.00	0.00	\N	\N	\N	\N	0.0000	0.0000	2025-11-12 20:59:36.717272	2025-11-12 20:59:36.717272	\N
\.


--
-- Data for Name: tax_rule_groups; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.tax_rule_groups (id, name, description, tax_structure, doc_fee_taxable, warranty_taxable, gap_taxable, maintenance_taxable, accessories_taxable, trade_in_credit_type, rebate_taxable, created_at, updated_at) FROM stdin;
ec8e21bb-7eeb-4c06-9d20-b8f9099428ff	Flat State Tax - No Doc Fee Tax	States with uniform state-level tax rate, doc fee not taxed (e.g., Virginia, Maryland)	flat_state	f	f	f	f	t	tax_on_difference	f	2025-11-09 23:02:44.016815	2025-11-09 23:02:44.016815
3bc7b918-2e23-48e2-a3e1-7bb46066c8a3	Flat State Tax - Doc Fee Taxed	States with uniform state-level tax rate, doc fee is taxed (e.g., California)	flat_state	t	t	t	f	t	tax_on_difference	f	2025-11-09 23:02:44.016815	2025-11-09 23:02:44.016815
702f7f38-4fab-41ab-8001-78d039f2e853	Variable County/City Tax	States with varying tax rates by county and city (e.g., Colorado, Washington, Arizona)	variable_county_city	f	f	f	f	t	tax_on_difference	f	2025-11-09 23:02:44.016815	2025-11-09 23:02:44.016815
99a2cda3-59b1-4104-95ad-47de7184573d	Origin-Based Tax	States using origin-based sourcing for sales tax	origin_based	f	f	f	f	t	tax_on_difference	f	2025-11-09 23:02:44.016815	2025-11-09 23:02:44.016815
406ab8cf-e513-4bbd-a282-43ab718e120b	Destination-Based Tax	States using destination-based sourcing for sales tax	destination_based	f	f	f	f	t	tax_on_difference	f	2025-11-09 23:02:44.016815	2025-11-09 23:02:44.016815
8fc76401-c423-417d-8004-4193034ad01a	Full Trade-In Credit	States that give full sales tax credit for trade-in value (e.g., Texas, Florida)	variable_county_city	f	f	f	f	t	full_credit	f	2025-11-09 23:02:44.016815	2025-11-09 23:02:44.016815
15a31e5d-31ed-41b3-b414-5c4622aea9c4	No Trade-In Credit	States with no trade-in tax credit (e.g., Alaska, Montana)	flat_state	f	f	f	f	t	none	f	2025-11-09 23:02:44.016815	2025-11-09 23:02:44.016815
1638705c-3968-4feb-b727-a39b36c3ac10	Backend Products Taxable	States that tax backend F&I products like warranty and GAP	variable_county_city	t	t	t	t	t	tax_on_difference	f	2025-11-09 23:02:44.016815	2025-11-09 23:02:44.016815
\.


--
-- Data for Name: trade_vehicles; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.trade_vehicles (id, year, make, model, "trim", mileage, vin, condition, allowance, payoff, created_at, deal_id, payoff_to) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, username, full_name, role, created_at, email, password, email_verified, mfa_enabled, failed_login_attempts, preferences, updated_at, reset_token, reset_token_expires, mfa_secret, last_login, account_locked_until, dealership_id, is_active) FROM stdin;
e77ab786-6ab4-43a5-b298-e15dccc27e29	john.smith	John Smith	salesperson	2025-11-09 21:45:40.003134	john.smith@dealership.local	$temp$password	f	f	0	{}	2025-11-11 23:49:26.17561	\N	\N	\N	\N	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	t
91d715d0-2135-4e07-a7e2-7e5c516c5eab	sarah.johnson	Sarah Johnson	sales_manager	2025-11-09 21:45:40.083403	sarah.johnson@dealership.local	$temp$password	f	f	0	{}	2025-11-11 23:49:26.17561	\N	\N	\N	\N	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	t
81dc2906-432b-455c-8d89-35e86abd89ca	userLEQqxJ	fw_3Vb User	salesperson	2025-11-12 00:06:02.425048	test8Ma9SO@example.com	4c4692e8f41539e3cee4f02c8579b770079306644b7c65b22c67fa724d98ab173c520df39ececc510f989848bd0fd058d9f2d09021af21adbc46379ea1b694c4.ca186848dba42d07c4801ed2dfbb4d44	f	f	0	{}	2025-11-12 00:07:15.387	\N	\N	\N	2025-11-12 00:07:15.386	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	t
a049c2ab-8aeb-4d97-8af6-24ea96ca9617	usero1h-yi	6qkY5T TestUser	salesperson	2025-11-12 00:11:10.228848	test4BnRPp@example.com	14ba3524b18062463fef93181b4db33e620bed9fe19b3c8a2d96389c43539ad53c7c7efa131563bfdb5981d977aeb6d6403db595692a2bff7efc94ecd99b096b.f4014a4fbb15a13da54398c8b71b724b	f	f	0	{}	2025-11-12 00:12:00.429	\N	\N	\N	2025-11-12 00:12:00.429	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	t
85a54520-9fba-4d14-bc58-d33ff8e1d675	userXB_eUm	Testj0qX User	salesperson	2025-11-12 00:17:02.769477	testXB_eUm@example.com	b788335388e2779cf1f74ee6d1611185c5cf2feeab88d35a5c523e2c4e51ec88177083275510f7d7a23b65b11c31f0efba803b86b7fb060b450871ce3b422c0c.861357c4421c83ee7f82206e19023d8e	f	f	0	{}	2025-11-12 00:17:54.321	\N	\N	\N	2025-11-12 00:17:54.321	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	t
7175507f-854b-46ce-bd42-9c16fabd2c81	testuser1UWIVc	Test User	salesperson	2025-11-12 21:51:53.746125	testuser1UWIVc@example.com	077b76725affc3a3d7236159634b21142d095b53e3314b4234df2af5ece81be64ae511496632fb24dfbd7fc4cdc88be8ddd7a78de9712be520e83be88cb6fba5.05b6e18d4fcef0a3c7b35b4397b8b887	f	f	0	{}	2025-11-12 21:51:53.746125	\N	\N	\N	\N	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	t
a3b36da5-3bb9-4345-aa48-24b6bf413918	testuser_BZqAtm	Test User	salesperson	2025-11-12 01:13:02.741443	testuser_BZqAtm@example.com	fae113969b9274aef6bbac2bbf7f2ccca3f41e0bc654039037f64f5ea52b174565f1c076cb786a2d6f72a0de856427340919ee3ce0666f181e1bddcde6c1254d.9f18c72395302a5c2091d4b3a4434737	f	t	0	{}	2025-11-12 01:17:04.378	93523626a039b36bbb75f6602139ea206b6dbd702eb414b3b2e29808704fa9ca	2025-11-12 02:17:04.378	JIVQE2SKGQYVE7BC	2025-11-12 01:15:39.774	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	t
4731a127-da21-418c-b204-4a171d3b1a49	admin	Master Admin	admin	2025-11-12 15:53:39.567302	admin@autolytiq.com	57ba09670356056832ab747f2cbc9f10a5444510c12e9bfbe3a9e88d5c237c28f33081401e06d146e791ac95f3dbd22e7ee1857665926712d81d7d5fce7f7cdf.c5639713cd33956327a62bab44fd341b	t	f	0	{}	2025-11-19 15:53:00.025	596b6ce9f266a83769a00b68bf0e12e2871e3a293a327d47d063bd54735fdcb3	2025-11-12 18:31:57.821	\N	2025-11-19 15:53:00.025	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	t
eaaea354-4954-44ac-af98-a833d781ff44	testuser123	Test User	salesperson	2025-11-12 21:55:00.656425	testuser123@example.com	6be1ea10774660bda84f8dd56e12822c4c7c72470819325d75e915dcf0a5c94a14ef23d82bea5c3580889f43ffe92f3da42871858fb5e355b833b2b3a6bd03fa.9c3ebd90b0ff81aeaf13a50bc5c207c5	f	f	0	{}	2025-11-12 21:55:00.656425	\N	\N	\N	\N	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	t
8ddaa102-8039-4c0e-9554-c4742e25f5ec	awilliams88	Austin Williams	admin	2025-11-12 21:34:32.315825	acwilliams.18@icloud.com	26d310fe9de188e86116c1019aefb1207d582e0a2fec6468989e1671e53a332e7ee929fef11977840020f51568939a19de465534db1945ff80a1de8bf209a9ec.e04435d062aebf725761a36db3a49376	f	f	0	{}	2025-11-16 10:21:38.704	\N	\N	\N	\N	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	t
00000000-0000-0000-0000-000000000001	demo	Demo Admin	admin	2025-11-12 00:49:37.203519	demo@example.com	4fa44d85848d7015f9ba28fd70ff7e49e9bcad3e1ce6080d2333b090f9ec413733cf0f157d43d4405936bf153467e46471020aa612c3975d954af9c5ff29cd59.5fd34691f8ffbced4998443b54a58921	f	f	0	{}	2025-11-12 02:43:33.829	\N	\N	\N	2025-11-12 02:43:33.829	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	t
7d80f8da-cd4f-4986-b663-9f03ed5699a2	testuser1	Test User	salesperson	2025-11-12 05:22:04.489567	test.user+1@example.com	4b1957a5d404356d82f9719f53324373663256f1fd0f48ec6fca4397a4d39a0db6b499fca008a735ccfd3fc0bfde99a61956aeb22d17446c4553fcee77c4bb71.e55f16c3b687b92f7ba9dc685f366122	f	f	0	{}	2025-11-12 05:22:04.489567	\N	\N	\N	\N	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	t
3733168d-6665-4f98-8cdc-0c88e84118f1	testuser_PW8M6q	Test User y8kP	salesperson	2025-11-12 13:20:39.979362	testuser_PW8M6q@dealership.test	ba9cb990d626a42031297986ed4be54934c3075f7010c077a8b59acf81b4e8eca7fa856948590499f5d6e3374c10f5c1b2d95996c172401cd22c1687292d57c7.f057b0113e61c36ccdf0743d9a79c119	f	f	0	{}	2025-11-12 13:20:39.979362	\N	\N	\N	\N	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	t
3cf62f9f-47ec-49f8-b808-4579c19aff64	testuser_EONs8r	Test User Xlph	salesperson	2025-11-12 13:27:10.929793	testuser_EONs8r@dealership.test	807a9ab5c9ea5ec428d496e10c19a1077b3784e4863449e9dcd8bcd16d02423b2bb12d49e030bac07232fa80e797b43f59c78c665aae76892a87b233b4821890.d1314a71729f1b916444c49589eea5e6	f	f	0	{}	2025-11-12 13:27:10.929793	\N	\N	\N	\N	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	t
1535c95d-87cc-465a-b0f4-4bf8aad6da0f	apitest_DqGlV9	API Test User	salesperson	2025-11-12 13:31:37.021189	apitest_DqGlV9@dealership.test	2ea180f1c99dabb37ee2c785eeb0e6edd2d3aa8e7c49ffa9317f41b87505458d445eb887ee139a3383a2edd093a6babbdda73273f5b2ac4c8544aeb8c700397b.8d07e9a5971f7ec9780d77cd1d4a256e	f	f	0	{}	2025-11-12 13:31:37.021189	\N	\N	\N	\N	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	t
35ee6e9d-725d-4fbb-91fc-3cf314358044	mttest_5K2c35	Multi Tenant Test	salesperson	2025-11-12 13:35:03.270633	mttest_5K2c35@test.com	03f671768ef3edacdcf4b2deae32140660235f4de8f2f2f128f81e5806ded2eb47095a420fc4d1d9829de33f069db419bfa1b461e8e0e2194c108dfcfdae937c.c743b8c9d39bdbcef4fe2b2084b6b568	f	f	0	{}	2025-11-12 13:35:03.270633	\N	\N	\N	\N	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	t
bccdb2f1-5a70-4f31-bddc-36ca254c0720	final_oNsLhd	Final Test User	salesperson	2025-11-12 13:38:33.9705	final_oNsLhd@test.com	15bbac4496ccbcf3b349ae59bf02982b51c171790907214510e755859241d50fb31b4e7b80fa47b6bdba24a3d1e885cd105771ad1842ea0c9e6bccd0922385ae.41aab01e02bf3d593c7bbab515b02fb1	f	f	0	{}	2025-11-12 13:38:33.9705	\N	\N	\N	\N	\N	fa136a38-696a-47b6-ac26-c184cc6ebe46	t
\.


--
-- Data for Name: vehicle_comparables; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.vehicle_comparables (id, vehicle_id, source, source_id, year, make, model, "trim", mileage, condition, sale_price, list_price, sale_date, days_on_market, city, state, zip_code, distance_miles, similarity_score, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: vehicle_features; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.vehicle_features (id, vehicle_id, category, name, description, is_standard, package_name, created_at) FROM stdin;
\.


--
-- Data for Name: vehicle_images; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.vehicle_images (id, vehicle_id, url, is_primary, display_order, caption, created_at) FROM stdin;
\.


--
-- Data for Name: vehicle_valuations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.vehicle_valuations (id, vehicle_id, provider, valuation_type, base_value, adjusted_value, low_range, high_range, condition_grade, mileage_adjustment, region_adjustment, provider_data, valuation_date, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: vehicles; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.vehicles (id, vin, year, make, model, "trim", mileage, exterior_color, interior_color, price, msrp, invoice, is_new, created_at, updated_at, engine_type, transmission, drivetrain, fuel_type, mpg_city, mpg_highway, invoice_price, internet_price, condition, status, images, features, stock_number, dealership_id) FROM stdin;
bc1abb8d-dd67-4c64-92ce-abb0f3dd7777	1HGBH41JXMN109186	2024	Honda	Accord	EX-L	12	Modern Steel Metallic	Black Leather	32500.00	35000.00	30000.00	t	2025-11-09 21:45:40.2389	2025-11-09 21:45:40.2389	\N	\N	\N	\N	\N	\N	\N	\N	new	available	[]	[]	35c90baf-cd73-44e8-bf5d-d2b8d8cd170d	fa136a38-696a-47b6-ac26-c184cc6ebe46
812d0b09-6bf0-4261-82ee-a076c6494769	5YJSA1E26KF123456	2023	Tesla	Model 3	Long Range	8500	Midnight Silver	White Premium	42900.00	47000.00	40000.00	f	2025-11-09 21:45:40.2389	2025-11-09 21:45:40.2389	\N	\N	\N	\N	\N	\N	\N	\N	new	available	[]	[]	caad8ce8-23cf-45a6-b945-b463c01cdb06	fa136a38-696a-47b6-ac26-c184cc6ebe46
8062f8d7-d60e-4fc8-9b0c-ddcb3cf06e30	3VWDX7AJ5KM123789	2024	Volkswagen	Atlas	SEL Premium	5	Pure White	Titan Black	45800.00	48500.00	43000.00	t	2025-11-09 21:45:40.2389	2025-11-09 21:45:40.2389	\N	\N	\N	\N	\N	\N	\N	\N	new	available	[]	[]	56aa8156-3379-4fd9-bf19-e1a44ba2fa8b	fa136a38-696a-47b6-ac26-c184cc6ebe46
beeaeb3e-5d4e-47e0-b0a8-a3cf47ae38b5	VIN1762725331214	2024	Honda	Civic	EX	10	\N	\N	28500.00	30000.00	\N	t	2025-11-09 21:55:31.257733	2025-11-09 21:55:31.257733	\N	\N	\N	\N	\N	\N	\N	\N	new	available	[]	[]	a85d7ac0-b2ff-4288-bc1e-e3de25be31a1	fa136a38-696a-47b6-ac26-c184cc6ebe46
192e5109-df95-4b23-9277-8ea3202493dc	VIN1762725439332	2024	Honda	Civic	EX	10	\N	\N	28500.00	30000.00	\N	t	2025-11-09 21:57:19.381212	2025-11-09 21:57:19.381212	\N	\N	\N	\N	\N	\N	\N	\N	new	available	[]	[]	0480882f-3715-42f7-8fcb-2f9fc4c7c556	fa136a38-696a-47b6-ac26-c184cc6ebe46
f18ce5d4-72b6-4b4d-88bc-232c75108e55	VIN1762725605691	2024	Honda	Civic	EX	10	\N	\N	28500.00	30000.00	\N	t	2025-11-09 22:00:05.728074	2025-11-09 22:00:05.728074	\N	\N	\N	\N	\N	\N	\N	\N	new	available	[]	[]	0eab0bfd-0dfb-4686-a78e-dc130a7d0731	fa136a38-696a-47b6-ac26-c184cc6ebe46
8be282d6-79e9-428b-a086-f91f6de40440	VIN1762725747492	2024	Honda	Civic	EX	10	\N	\N	28500.00	30000.00	\N	t	2025-11-09 22:02:27.530123	2025-11-09 22:02:27.530123	\N	\N	\N	\N	\N	\N	\N	\N	new	available	[]	[]	d05d6c88-6c95-4814-a0bc-02caf63e8bc5	fa136a38-696a-47b6-ac26-c184cc6ebe46
207a1c12-2485-431b-a3f2-470b647336cc	VIN1762726019350	2024	Honda	Civic	EX	10	\N	\N	28500.00	30000.00	\N	t	2025-11-09 22:06:59.418476	2025-11-09 22:06:59.418476	\N	\N	\N	\N	\N	\N	\N	\N	new	available	[]	[]	0f0731e2-7525-40e3-813c-a946c0abe44b	fa136a38-696a-47b6-ac26-c184cc6ebe46
3f170e9f-e2f3-453f-9f97-16b307f8d23d	VIN1762726019879	2024	Honda	Civic	EX	10	\N	\N	28500.00	30000.00	\N	t	2025-11-09 22:06:59.956249	2025-11-09 22:06:59.956249	\N	\N	\N	\N	\N	\N	\N	\N	new	available	[]	[]	3ef2c62a-010f-477b-b691-c2baab3bb3de	fa136a38-696a-47b6-ac26-c184cc6ebe46
d167825f-4c25-4230-9af9-6c6942bf7936	VIN1762732330902	2024	Honda	Civic	EX	10	\N	\N	28500.00	30000.00	\N	t	2025-11-09 23:52:10.960685	2025-11-09 23:52:10.960685	\N	\N	\N	\N	\N	\N	\N	\N	new	available	[]	[]	0dce7c8a-4c3c-4ca5-b3c2-051630ac2c44	fa136a38-696a-47b6-ac26-c184cc6ebe46
a078fe98-8f04-45c7-81cd-73777ea86879	VIN1762733558346	2024	Honda	Civic	EX	10	\N	\N	28500.00	30000.00	\N	t	2025-11-10 00:12:38.408784	2025-11-10 00:12:38.408784	\N	\N	\N	\N	\N	\N	\N	\N	new	available	[]	[]	ae44114b-a180-4cc8-b1b6-d17531b4d9d1	fa136a38-696a-47b6-ac26-c184cc6ebe46
cbb82b6f-06b3-4dd7-b780-6f88b5842554	VIN1762776560795	2024	Honda	Civic	EX	10	\N	\N	28500.00	30000.00	\N	t	2025-11-10 12:09:20.863598	2025-11-10 12:09:20.863598	\N	\N	\N	\N	\N	\N	\N	\N	new	available	[]	[]	99de093a-2a6f-45f4-a8ac-61fbe586d6c7	fa136a38-696a-47b6-ac26-c184cc6ebe46
22014b34-d12f-4c2d-9c2d-b95af139bf7c	1HGBH41JXMN109187	2024	Honda	CR-V	EX-L	10	Lunar Silver Metallic	Black Leather	35900.00	37500.00	\N	t	2025-11-10 15:07:40.181991	2025-11-10 15:07:40.181991	1.5L Turbo I4	CVT	AWD	Gasoline	28	34	33500.00	35500.00	new	available	["https://placeholder.pics/svg/800x600/DEDEDE/555555/2024%20Honda%20CR-V"]	[{"name": "Honda Sensing", "category": "Safety", "description": "Advanced safety suite"}]	e107b314-8cd8-4102-9e9a-797a0b97992b	fa136a38-696a-47b6-ac26-c184cc6ebe46
49a2c12e-4d9a-4a9b-aafe-d7b10ddd78e5	1FTFW1E89NFA67890	2024	Ford	F-250	Lariat	20	Oxford White	Black Leather	72500.00	75000.00	\N	t	2025-11-10 15:07:40.181991	2025-11-10 15:07:40.181991	6.7L Power Stroke V8 Diesel	Automatic	4WD	Diesel	15	19	68000.00	71900.00	new	available	["https://placeholder.pics/svg/800x600/DEDEDE/555555/2024%20Ford%20F-250"]	[{"name": "Max Towing", "category": "Performance", "description": "22,000 lbs capacity"}]	4ba09d32-ee7a-453e-9686-6965893cd320	fa136a38-696a-47b6-ac26-c184cc6ebe46
3981a5e2-4428-44ef-b41c-69b60caa5817	5YJ3E1EA5KF234567	2023	Tesla	Model Y	Long Range	5200	Pearl White	White Premium	54900.00	58000.00	\N	f	2025-11-10 15:07:40.181991	2025-11-10 15:08:56.284	Dual Motor Electric	Single-Speed	AWD	Electric	122	115	52000.00	53900.00	used	hold	["https://placeholder.pics/svg/800x600/DEDEDE/555555/2023%20Tesla%20Model%20Y"]	[{"name": "Autopilot", "category": "Technology", "description": "Advanced driver assistance"}]	5ad3d69a-0db6-4872-9e31-38bfcb5cfb42	fa136a38-696a-47b6-ac26-c184cc6ebe46
b12b7457-f701-40c9-9136-4d6aa3cfb722	JH4KA7560NC000001	2024	Toyota	Camry	XLE	150	Midnight Black Metallic	Black Leather	32990.00	35500.00	\N	t	2025-11-10 15:18:58.11188	2025-11-10 15:18:58.11188	2.5L 4-Cylinder	Automatic	FWD	Gasoline	28	39	31000.00	31990.00	new	available	["https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800", "https://images.unsplash.com/photo-1619682817481-e994891cd1f5?w=800"]	["Apple CarPlay", "Android Auto", "Blind Spot Monitoring", "Lane Keep Assist", "Adaptive Cruise Control", "Leather Seats", "Panoramic Sunroof", "Premium Audio System"]	91c65ab2-6148-442a-9f69-564b2919e45d	fa136a38-696a-47b6-ac26-c184cc6ebe46
73a60f27-7bd9-4022-942a-368e5784fe7f	WBA3B5C52EF000002	2024	BMW	3 Series	330i xDrive	250	Alpine White	Cognac Leather	48990.00	52000.00	\N	t	2025-11-10 15:18:58.257434	2025-11-10 15:18:58.257434	2.0L TwinPower Turbo	Automatic	AWD	Gasoline	26	36	47000.00	47990.00	new	available	["https://images.unsplash.com/photo-1555215858-9dc80a68b51f?w=800", "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800"]	["M Sport Package", "Harman Kardon Sound", "Gesture Control", "Wireless Charging", "Head-Up Display", "Navigation Professional", "Active Driving Assistant", "Parking Assistant Plus"]	27d8287d-71b2-4999-b2b3-94eb5dd92a18	fa136a38-696a-47b6-ac26-c184cc6ebe46
1d057cd2-36de-4ea2-aa44-057e31a20037	1G1ZD5ST2LF000003	2023	Chevrolet	Malibu	LT	12500	Summit White	Jet Black	22990.00	28500.00	\N	f	2025-11-10 15:18:58.331244	2025-11-10 15:18:58.331244	1.5L Turbo	CVT	FWD	Gasoline	29	36	21000.00	21990.00	certified	available	["https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800"]	["Teen Driver Technology", "Chevrolet Infotainment 3", "Wireless Apple CarPlay", "Android Auto", "Remote Start", "Dual-Zone Climate Control", "Power Driver Seat"]	50a3b40d-8c01-4cfb-88a9-8c1227e25fe6	fa136a38-696a-47b6-ac26-c184cc6ebe46
fd656bb0-9b97-4d24-9d2f-23f017fb5417	2HGFC2F59MH000004	2023	Honda	Civic	Sport	8200	Sonic Gray Pearl	Black Sport	24990.00	28000.00	\N	f	2025-11-10 15:18:58.405155	2025-11-10 15:18:58.405155	2.0L 4-Cylinder	Manual	FWD	Gasoline	30	37	23500.00	23990.00	used	available	["https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800"]	["Honda Sensing Suite", "Sport Pedals", "18-inch Alloy Wheels", "Apple CarPlay", "Android Auto", "Sport Exhaust", "LED Headlights", "Smart Entry"]	c59d5758-2814-413c-a1c8-d8be76375615	fa136a38-696a-47b6-ac26-c184cc6ebe46
3910aaec-4f6d-448e-82a3-ef98f30bae76	5YJ3E1EA5KF000005	2024	Tesla	Model 3	Long Range	100	Pearl White Multi-Coat	Black Premium	47990.00	50990.00	\N	t	2025-11-10 15:18:58.478003	2025-11-10 15:18:58.478003	Dual Motor Electric	Automatic	AWD	Electric	142	123	46000.00	46990.00	new	available	["https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800", "https://images.unsplash.com/photo-1571987937324-a9d59e4de2f4?w=800"]	["Autopilot", "Full Self-Driving Capability", "15-inch Touchscreen", "Premium Connectivity", "Heated Seats", "Glass Roof", "Power Liftgate", "Wireless Phone Chargers"]	e7620672-67fe-4ac3-a8d8-5317498755ca	fa136a38-696a-47b6-ac26-c184cc6ebe46
b09ea491-b9b4-4d22-9e70-c0b9382b8d43	1FTFW1ET5DF000006	2023	Ford	F-150	XLT SuperCrew	15000	Oxford White	Medium Light Camel	48990.00	55000.00	\N	f	2025-11-10 15:18:58.553771	2025-11-10 15:18:58.553771	3.5L V6 EcoBoost	Automatic	4WD	Gasoline	18	24	47000.00	47990.00	used	available	["https://images.unsplash.com/photo-1544829828-2043559486342?w=800"]	["SYNC 4", "FordPass Connect", "Pro Trailer Backup Assist", "BoxLink Cargo System", "LED Box Lighting", "Remote Start", "20-inch Wheels", "Tow Package"]	832c9489-5da1-4dc1-9f5f-cc9dd16769a4	fa136a38-696a-47b6-ac26-c184cc6ebe46
c3d8ce20-8759-4790-91ce-31377afee137	JN1AZ4EH7LM000007	2024	Nissan	Altima	SV	50	Gun Metallic	Charcoal Leather	28990.00	31500.00	\N	t	2025-11-10 15:18:58.627426	2025-11-10 15:18:58.627426	2.5L 4-Cylinder	CVT	FWD	Gasoline	28	39	27500.00	27990.00	new	available	["https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800"]	["ProPILOT Assist", "Nissan Safety Shield 360", "Remote Engine Start", "Dual Zone Climate Control", "Blind Spot Warning", "Rear Cross Traffic Alert"]	6c1bc045-7786-4344-b9e0-cd0dc877c29c	fa136a38-696a-47b6-ac26-c184cc6ebe46
13bcbb18-1bb3-4add-9c27-bc51e6e4cf8d	WAUENAF45KN000008	2023	Audi	A4	45 TFSI Premium Plus	6800	Mythos Black Metallic	Black Leather	39990.00	45000.00	\N	f	2025-11-10 15:18:58.700929	2025-11-10 15:18:58.700929	2.0L TFSI	Automatic	AWD	Gasoline	24	32	38000.00	38990.00	certified	available	["https://images.unsplash.com/photo-1606664515524-ed9f786329ac?w=800"]	["Virtual Cockpit", "Bang & Olufsen Sound", "Matrix LED Headlights", "Audi Pre Sense", "Parking System Plus", "Heated Front Seats", "Power Tailgate", "Navigation Plus"]	e5668739-8e27-4465-ad3f-c03e2a0d5de6	fa136a38-696a-47b6-ac26-c184cc6ebe46
c7afb49d-a324-455f-9ed9-d3a3e4578d38	3VWEB7AJ0MM000009	2024	Volkswagen	Jetta	SEL	200	Pure White	Titan Black	26990.00	29000.00	\N	t	2025-11-10 15:18:58.777239	2025-11-10 15:18:58.777239	1.5L TSI	Automatic	FWD	Gasoline	31	41	25500.00	25990.00	new	available	["https://images.unsplash.com/photo-1609520778163-a16fb3862efa?w=800"]	["Digital Cockpit Pro", "BeatsAudio Premium", "IQ.DRIVE Driver Assistance", "Wireless App Connect", "Remote Start", "Ventilated Front Seats"]	54742d8a-5f23-40cd-859d-d2754798236a	fa136a38-696a-47b6-ac26-c184cc6ebe46
61c7be29-92bb-46f2-8117-bd3a2ce677db	WAUZZZ4M6ND000010	2022	Mercedes-Benz	C-Class	C 300 4MATIC	18500	Polar White	Macchiato Beige	42990.00	48000.00	\N	f	2025-11-10 15:18:58.850589	2025-11-10 15:18:58.850589	2.0L Turbo	Automatic	AWD	Gasoline	23	33	41000.00	41990.00	used	available	["https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800"]	["MBUX Infotainment", "Burmester Sound System", "Driver Assistance Package", "AMG Line", "Panoramic Roof", "Wireless Charging", "64-Color Ambient Lighting"]	b41586e6-a51b-489e-9d83-7c5b3f54a098	fa136a38-696a-47b6-ac26-c184cc6ebe46
a177b03a-4855-4b93-8ac4-b3f345b84ce2	7FARW2H55NE000011	2023	Ford	Mustang Mach-E	Premium AWD	3200	Grabber Blue Metallic	Black ActiveX	52990.00	57000.00	\N	f	2025-11-10 15:18:58.924843	2025-11-10 15:18:58.924843	Dual Motor Electric	Automatic	AWD	Electric	90	85	51000.00	51990.00	certified	available	["https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800"]	["BlueCruise Hands-Free", "B&O Sound System", "Panoramic Fixed-Glass Roof", "Phone As A Key", "Intelligent Adaptive Cruise", "FordPass Charging Network"]	5a69c402-4d18-412d-bcb6-2eaae24dac0a	fa136a38-696a-47b6-ac26-c184cc6ebe46
83fce72e-d6b1-4c32-bf1d-42ca4ff487fd	JTDKAMFU0N3000012	2023	Toyota	Prius	Limited	4500	Wind Chill Pearl	Black SofTex	33990.00	35500.00	\N	f	2025-11-10 15:18:58.997231	2025-11-10 15:18:58.997231	2.0L Hybrid	CVT	FWD	Hybrid	57	56	32000.00	32990.00	used	hold	["https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800"]	["Toyota Safety Sense 3.0", "JBL Premium Audio", "Digital Rearview Mirror", "Wireless Charging", "Heads-Up Display", "Parking Assist"]	c0954767-3445-41c3-aea1-5c1725e663c9	fa136a38-696a-47b6-ac26-c184cc6ebe46
59818ab9-5155-46ab-b5b3-f5850525d64b	VIN1762795032918	2024	Honda	Civic	EX	10	\N	\N	28500.00	30000.00	\N	t	2025-11-10 17:17:12.971797	2025-11-10 17:17:12.971797	\N	\N	\N	\N	\N	\N	\N	\N	new	available	[]	[]	e100d29f-f856-4c12-8672-caf4b9315051	fa136a38-696a-47b6-ac26-c184cc6ebe46
717c6460-8a53-431f-96c9-cded55ced4c1	VIN1762796270686	2024	Honda	Civic	EX	10	\N	\N	28500.00	30000.00	\N	t	2025-11-10 17:37:50.760078	2025-11-10 17:37:50.760078	\N	\N	\N	\N	\N	\N	\N	\N	new	available	[]	[]	2bc3ef76-d0e5-47d2-b676-52a3e8447e21	fa136a38-696a-47b6-ac26-c184cc6ebe46
4d26a8ea-0617-4b88-85bc-aca0865528df	VIN1762801100997	2024	Honda	Civic	EX	10	\N	\N	28500.00	30000.00	\N	t	2025-11-10 18:58:21.094937	2025-11-10 18:58:21.094937	\N	\N	\N	\N	\N	\N	\N	\N	new	available	[]	[]	4b835844-4689-4279-9dd2-c1cc2df359df	fa136a38-696a-47b6-ac26-c184cc6ebe46
7fc992d3-5cf4-4b97-b1c3-f9982a1deced	VIN1762804982113	2024	Honda	Civic	EX	10	\N	\N	28500.00	30000.00	\N	t	2025-11-10 20:03:02.180466	2025-11-10 20:03:02.180466	\N	\N	\N	\N	\N	\N	\N	\N	new	available	[]	[]	4dca02b0-7df1-4f93-a9a5-4505158ab94d	fa136a38-696a-47b6-ac26-c184cc6ebe46
82af4bbc-4067-458b-9403-43262ff1cd19	VIN1762810455763	2024	Honda	Civic	EX	10	\N	\N	28500.00	30000.00	\N	t	2025-11-10 21:34:15.828885	2025-11-10 21:34:15.828885	\N	\N	\N	\N	\N	\N	\N	\N	new	available	[]	[]	033eddf1-62bc-4450-b222-36fa31c0e320	fa136a38-696a-47b6-ac26-c184cc6ebe46
1434c5d5-d710-473e-8c42-bfabf651907e	VIN1762810722881	2024	Honda	Civic	EX	10	\N	\N	28500.00	30000.00	\N	t	2025-11-10 21:38:42.255281	2025-11-10 21:38:42.255281	\N	\N	\N	\N	\N	\N	\N	\N	new	available	[]	[]	a70671f5-0002-4971-b8d5-816a791c0ace	fa136a38-696a-47b6-ac26-c184cc6ebe46
0c0cfdfc-eaa6-4cf4-8722-fee269a1d7b6	VIN1762815659798	2024	Honda	Civic	EX	10	\N	\N	28500.00	30000.00	\N	t	2025-11-10 23:00:59.093144	2025-11-10 23:00:59.093144	\N	\N	\N	\N	\N	\N	\N	\N	new	available	[]	[]	8089bfb5-88ef-4904-9542-cc939211b5e4	fa136a38-696a-47b6-ac26-c184cc6ebe46
fe1cdfc7-856d-4905-ae18-9832dc6831af	VIN1762815939386	2024	Honda	Civic	EX	10	\N	\N	28500.00	30000.00	\N	t	2025-11-10 23:05:39.423247	2025-11-10 23:05:39.423247	\N	\N	\N	\N	\N	\N	\N	\N	new	available	[]	[]	0f7d712a-1800-412a-bbc1-60d55e7bb6d4	fa136a38-696a-47b6-ac26-c184cc6ebe46
6fb333a3-ee15-414b-a35e-39172595434b	VIN1762816328975	2024	Honda	Civic	EX	10	\N	\N	28500.00	30000.00	\N	t	2025-11-10 23:12:09.025148	2025-11-10 23:12:09.025148	\N	\N	\N	\N	\N	\N	\N	\N	new	available	[]	[]	31084d5b-ce01-4d3d-bf39-53283dbca567	fa136a38-696a-47b6-ac26-c184cc6ebe46
b1769338-26a1-4d8d-9f2b-36829e5a6866	VIN1762816579233	2024	Honda	Civic	EX	10	\N	\N	28500.00	30000.00	\N	t	2025-11-10 23:16:19.269355	2025-11-10 23:16:19.269355	\N	\N	\N	\N	\N	\N	\N	\N	new	available	[]	[]	84f4c3d5-9075-426d-90ee-3b2f92ba9758	fa136a38-696a-47b6-ac26-c184cc6ebe46
5063b75d-c2af-4e5a-9749-f8db6a848d4f	VIN1762817105310	2024	Honda	Civic	EX	10	\N	\N	28500.00	30000.00	\N	t	2025-11-10 23:25:05.347276	2025-11-10 23:25:05.347276	\N	\N	\N	\N	\N	\N	\N	\N	new	available	[]	[]	baafd400-df39-436e-b7b8-0ed3054f4556	fa136a38-696a-47b6-ac26-c184cc6ebe46
6f0a9ad5-d2a3-4c48-b54a-eed7edc16247	VIN1762817867012	2024	Honda	Civic	EX	10	\N	\N	28500.00	30000.00	\N	t	2025-11-10 23:37:47.064831	2025-11-10 23:37:47.064831	\N	\N	\N	\N	\N	\N	\N	\N	new	available	[]	[]	5ff7374b-bf2d-4f04-8554-6e7887b8ed99	fa136a38-696a-47b6-ac26-c184cc6ebe46
84e46293-f24d-4c5b-86d3-f0a3061d8d33	VIN1762818050638	2024	Honda	Civic	EX	10	\N	\N	28500.00	30000.00	\N	t	2025-11-10 23:40:49.911229	2025-11-10 23:40:49.911229	\N	\N	\N	\N	\N	\N	\N	\N	new	available	[]	[]	4736bbcc-e448-4c5d-8083-86f9832508ae	fa136a38-696a-47b6-ac26-c184cc6ebe46
6d880306-ee24-4a13-b73f-d329359cbefd	VIN1762829498593	2024	Honda	Civic	EX	10	\N	\N	28500.00	30000.00	\N	t	2025-11-11 02:51:37.686593	2025-11-11 02:51:37.686593	\N	\N	\N	\N	\N	\N	\N	\N	new	available	[]	[]	e78638f0-0bc0-474a-acf2-51d3e73f6c90	fa136a38-696a-47b6-ac26-c184cc6ebe46
af07441f-fe8a-40aa-89d3-de74c4ef7e1a	VIN1762829640998	2024	Honda	Civic	EX	10	\N	\N	28500.00	30000.00	\N	t	2025-11-11 02:54:00.08001	2025-11-11 02:54:00.08001	\N	\N	\N	\N	\N	\N	\N	\N	new	available	[]	[]	a3e10fa1-2a3f-45ec-a2f4-e73de0eee6d3	fa136a38-696a-47b6-ac26-c184cc6ebe46
82631ff7-8933-4475-a5be-7a8ca566165b	VIN1762830700689	2024	Honda	Civic	EX	10	\N	\N	28500.00	30000.00	\N	t	2025-11-11 03:11:40.737054	2025-11-11 03:11:40.737054	\N	\N	\N	\N	\N	\N	\N	\N	new	available	[]	[]	f8fe0e52-04c2-4f6c-ad14-76ebe1e747bd	fa136a38-696a-47b6-ac26-c184cc6ebe46
cc61d85f-01d6-4157-8858-7865eb30c556	VIN1762867747922	2024	Honda	Civic	EX	10	\N	\N	28500.00	30000.00	\N	t	2025-11-11 13:29:07.96169	2025-11-11 13:29:07.96169	\N	\N	\N	\N	\N	\N	\N	\N	new	available	[]	[]	39262aa1-a745-47fc-ba7b-73ec335473ec	fa136a38-696a-47b6-ac26-c184cc6ebe46
fad56871-a6ae-4313-a878-4967c60f984f	KNDPXDDG7T7303779	2026	KIA	Sportage	SX-P, SX-Prestige	55			38750.00	38750.00	\N	f	2025-11-12 19:17:26.854038	2025-11-12 19:17:26.854038	1.6L Gasoline		4x2	Gasoline	\N	\N	37000.00	37500.00	new	available	[]	[]	acf046fa-dfaf-440b-b4ab-97627a42dda2	fa136a38-696a-47b6-ac26-c184cc6ebe46
\.


--
-- Data for Name: zip_code_lookup; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.zip_code_lookup (id, zip_code, tax_jurisdiction_id, city, state, created_at) FROM stdin;
da15b774-4d87-4943-9ae0-a6c1c00a4825	44030	6278db42-2796-4f72-aef0-ab8189a2acc9	Ashtabula	OH	2025-11-12 20:59:42.974225
\.


--
-- Data for Name: zip_to_local_tax_rates; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.zip_to_local_tax_rates (id, zip_code, state_code, county_fips, county_name, city_name, tax_rate_ids, combined_local_rate, last_updated, created_at) FROM stdin;
\.


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: approved_lenders approved_lenders_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.approved_lenders
    ADD CONSTRAINT approved_lenders_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: customer_history customer_history_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.customer_history
    ADD CONSTRAINT customer_history_pkey PRIMARY KEY (id);


--
-- Name: customer_notes customer_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.customer_notes
    ADD CONSTRAINT customer_notes_pkey PRIMARY KEY (id);


--
-- Name: customer_vehicles customer_vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.customer_vehicles
    ADD CONSTRAINT customer_vehicles_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: deal_number_sequences deal_number_sequences_dealership_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.deal_number_sequences
    ADD CONSTRAINT deal_number_sequences_dealership_id_key UNIQUE (dealership_id);


--
-- Name: deal_number_sequences deal_number_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.deal_number_sequences
    ADD CONSTRAINT deal_number_sequences_pkey PRIMARY KEY (id);


--
-- Name: deal_scenarios deal_scenarios_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.deal_scenarios
    ADD CONSTRAINT deal_scenarios_pkey PRIMARY KEY (id);


--
-- Name: dealership_settings dealership_settings_dealership_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dealership_settings
    ADD CONSTRAINT dealership_settings_dealership_id_key UNIQUE (dealership_id);


--
-- Name: dealership_settings dealership_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dealership_settings
    ADD CONSTRAINT dealership_settings_pkey PRIMARY KEY (id);


--
-- Name: dealership_stock_settings dealership_stock_settings_dealership_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dealership_stock_settings
    ADD CONSTRAINT dealership_stock_settings_dealership_id_key UNIQUE (dealership_id);


--
-- Name: dealership_stock_settings dealership_stock_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dealership_stock_settings
    ADD CONSTRAINT dealership_stock_settings_pkey PRIMARY KEY (id);


--
-- Name: deals deals_deal_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_deal_number_unique UNIQUE (deal_number);


--
-- Name: deals deals_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_pkey PRIMARY KEY (id);


--
-- Name: email_attachments email_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_attachments
    ADD CONSTRAINT email_attachments_pkey PRIMARY KEY (id);


--
-- Name: email_folders email_folders_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_folders
    ADD CONSTRAINT email_folders_pkey PRIMARY KEY (id);


--
-- Name: email_labels email_labels_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_labels
    ADD CONSTRAINT email_labels_pkey PRIMARY KEY (id);


--
-- Name: email_message_labels email_message_labels_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_message_labels
    ADD CONSTRAINT email_message_labels_pkey PRIMARY KEY (id);


--
-- Name: email_messages email_messages_message_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_messages
    ADD CONSTRAINT email_messages_message_id_key UNIQUE (message_id);


--
-- Name: email_messages email_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_messages
    ADD CONSTRAINT email_messages_pkey PRIMARY KEY (id);


--
-- Name: email_rules email_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_rules
    ADD CONSTRAINT email_rules_pkey PRIMARY KEY (id);


--
-- Name: fee_package_templates fee_package_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.fee_package_templates
    ADD CONSTRAINT fee_package_templates_pkey PRIMARY KEY (id);


--
-- Name: lender_programs lender_programs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lender_programs
    ADD CONSTRAINT lender_programs_pkey PRIMARY KEY (id);


--
-- Name: lenders lenders_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lenders
    ADD CONSTRAINT lenders_pkey PRIMARY KEY (id);


--
-- Name: local_tax_rates local_tax_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.local_tax_rates
    ADD CONSTRAINT local_tax_rates_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_name_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_name_key UNIQUE (name);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: quick_quote_contacts quick_quote_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quick_quote_contacts
    ADD CONSTRAINT quick_quote_contacts_pkey PRIMARY KEY (id);


--
-- Name: quick_quotes quick_quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quick_quotes
    ADD CONSTRAINT quick_quotes_pkey PRIMARY KEY (id);


--
-- Name: rate_requests rate_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.rate_requests
    ADD CONSTRAINT rate_requests_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: rooftop_configurations rooftop_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.rooftop_configurations
    ADD CONSTRAINT rooftop_configurations_pkey PRIMARY KEY (id);


--
-- Name: security_audit_log security_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.security_audit_log
    ADD CONSTRAINT security_audit_log_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: tax_jurisdictions tax_jurisdictions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tax_jurisdictions
    ADD CONSTRAINT tax_jurisdictions_pkey PRIMARY KEY (id);


--
-- Name: tax_rule_groups tax_rule_groups_name_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tax_rule_groups
    ADD CONSTRAINT tax_rule_groups_name_key UNIQUE (name);


--
-- Name: tax_rule_groups tax_rule_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tax_rule_groups
    ADD CONSTRAINT tax_rule_groups_pkey PRIMARY KEY (id);


--
-- Name: trade_vehicles trade_vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.trade_vehicles
    ADD CONSTRAINT trade_vehicles_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: vehicle_comparables vehicle_comparables_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vehicle_comparables
    ADD CONSTRAINT vehicle_comparables_pkey PRIMARY KEY (id);


--
-- Name: vehicle_features vehicle_features_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vehicle_features
    ADD CONSTRAINT vehicle_features_pkey PRIMARY KEY (id);


--
-- Name: vehicle_images vehicle_images_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vehicle_images
    ADD CONSTRAINT vehicle_images_pkey PRIMARY KEY (id);


--
-- Name: vehicle_valuations vehicle_valuations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vehicle_valuations
    ADD CONSTRAINT vehicle_valuations_pkey PRIMARY KEY (id);


--
-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);


--
-- Name: vehicles vehicles_stock_number_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_stock_number_key UNIQUE (stock_number);


--
-- Name: vehicles vehicles_vin_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_vin_unique UNIQUE (vin);


--
-- Name: zip_code_lookup zip_code_lookup_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.zip_code_lookup
    ADD CONSTRAINT zip_code_lookup_pkey PRIMARY KEY (id);


--
-- Name: zip_code_lookup zip_code_lookup_zip_code_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.zip_code_lookup
    ADD CONSTRAINT zip_code_lookup_zip_code_key UNIQUE (zip_code);


--
-- Name: zip_to_local_tax_rates zip_to_local_tax_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.zip_to_local_tax_rates
    ADD CONSTRAINT zip_to_local_tax_rates_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);


--
-- Name: appointments_customer_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX appointments_customer_idx ON public.appointments USING btree (customer_id);


--
-- Name: appointments_dealership_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX appointments_dealership_idx ON public.appointments USING btree (dealership_id);


--
-- Name: appointments_scheduled_at_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX appointments_scheduled_at_idx ON public.appointments USING btree (scheduled_at);


--
-- Name: appointments_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX appointments_status_idx ON public.appointments USING btree (status);


--
-- Name: appointments_user_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX appointments_user_idx ON public.appointments USING btree (user_id);


--
-- Name: audit_log_deal_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX audit_log_deal_idx ON public.audit_log USING btree (deal_id);


--
-- Name: audit_log_timestamp_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX audit_log_timestamp_idx ON public.audit_log USING btree ("timestamp");


--
-- Name: audit_log_user_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX audit_log_user_idx ON public.audit_log USING btree (user_id);


--
-- Name: customer_history_customer_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX customer_history_customer_idx ON public.customer_history USING btree (customer_id);


--
-- Name: customer_history_timestamp_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX customer_history_timestamp_idx ON public.customer_history USING btree ("timestamp");


--
-- Name: customer_history_user_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX customer_history_user_idx ON public.customer_history USING btree (user_id);


--
-- Name: customer_notes_created_at_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX customer_notes_created_at_idx ON public.customer_notes USING btree (created_at);


--
-- Name: customer_notes_customer_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX customer_notes_customer_idx ON public.customer_notes USING btree (customer_id);


--
-- Name: customer_notes_dealership_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX customer_notes_dealership_idx ON public.customer_notes USING btree (dealership_id);


--
-- Name: customer_notes_user_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX customer_notes_user_idx ON public.customer_notes USING btree (user_id);


--
-- Name: customer_vehicles_customer_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX customer_vehicles_customer_idx ON public.customer_vehicles USING btree (customer_id);


--
-- Name: customers_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX customers_name_idx ON public.customers USING btree (first_name, last_name);


--
-- Name: deal_number_sequences_dealership_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX deal_number_sequences_dealership_idx ON public.deal_number_sequences USING btree (dealership_id);


--
-- Name: deal_scenarios_deal_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX deal_scenarios_deal_idx ON public.deal_scenarios USING btree (deal_id);


--
-- Name: dealership_stock_settings_dealership_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX dealership_stock_settings_dealership_idx ON public.dealership_stock_settings USING btree (dealership_id);


--
-- Name: deals_customer_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX deals_customer_idx ON public.deals USING btree (customer_id);


--
-- Name: deals_deal_number_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX deals_deal_number_idx ON public.deals USING btree (deal_number);


--
-- Name: deals_state_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX deals_state_idx ON public.deals USING btree (deal_state);


--
-- Name: email_attachments_email_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX email_attachments_email_idx ON public.email_attachments USING btree (email_message_id);


--
-- Name: email_folders_dealership_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX email_folders_dealership_idx ON public.email_folders USING btree (dealership_id);


--
-- Name: email_folders_user_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX email_folders_user_idx ON public.email_folders USING btree (user_id);


--
-- Name: email_folders_user_slug_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX email_folders_user_slug_idx ON public.email_folders USING btree (user_id, slug);


--
-- Name: email_messages_customer_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX email_messages_customer_idx ON public.email_messages USING btree (customer_id);


--
-- Name: email_messages_deal_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX email_messages_deal_idx ON public.email_messages USING btree (deal_id);


--
-- Name: email_messages_dealership_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX email_messages_dealership_idx ON public.email_messages USING btree (dealership_id);


--
-- Name: email_messages_folder_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX email_messages_folder_idx ON public.email_messages USING btree (folder);


--
-- Name: email_messages_sent_at_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX email_messages_sent_at_idx ON public.email_messages USING btree (sent_at);


--
-- Name: email_messages_thread_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX email_messages_thread_idx ON public.email_messages USING btree (thread_id);


--
-- Name: email_messages_user_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX email_messages_user_idx ON public.email_messages USING btree (user_id);


--
-- Name: fee_package_templates_active_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX fee_package_templates_active_idx ON public.fee_package_templates USING btree (is_active);


--
-- Name: fee_package_templates_category_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX fee_package_templates_category_idx ON public.fee_package_templates USING btree (category);


--
-- Name: fee_package_templates_created_by_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX fee_package_templates_created_by_idx ON public.fee_package_templates USING btree (created_by);


--
-- Name: fee_package_templates_dealership_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX fee_package_templates_dealership_idx ON public.fee_package_templates USING btree (dealership_id);


--
-- Name: fee_package_templates_display_order_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX fee_package_templates_display_order_idx ON public.fee_package_templates USING btree (display_order);


--
-- Name: idx_customers_dealership; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customers_dealership ON public.customers USING btree (dealership_id);


--
-- Name: idx_customers_dealership_email; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customers_dealership_email ON public.customers USING btree (dealership_id, lower(email));


--
-- Name: idx_customers_dealership_name; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customers_dealership_name ON public.customers USING btree (dealership_id, lower(last_name), lower(first_name));


--
-- Name: idx_customers_trgm_email; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customers_trgm_email ON public.customers USING gin (lower(email) public.gin_trgm_ops);


--
-- Name: idx_customers_trgm_first_name; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customers_trgm_first_name ON public.customers USING gin (lower(first_name) public.gin_trgm_ops);


--
-- Name: idx_customers_trgm_last_name; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_customers_trgm_last_name ON public.customers USING gin (lower(last_name) public.gin_trgm_ops);


--
-- Name: idx_deals_customer_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_deals_customer_id ON public.deals USING btree (customer_id);


--
-- Name: idx_deals_dealership; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_deals_dealership ON public.deals USING btree (dealership_id);


--
-- Name: idx_deals_dealership_customer; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_deals_dealership_customer ON public.deals USING btree (dealership_id, customer_id);


--
-- Name: idx_deals_dealership_salesperson; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_deals_dealership_salesperson ON public.deals USING btree (dealership_id, salesperson_id);


--
-- Name: idx_deals_dealership_state_created; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_deals_dealership_state_created ON public.deals USING btree (dealership_id, deal_state, created_at DESC);


--
-- Name: idx_deals_finance_manager_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_deals_finance_manager_id ON public.deals USING btree (finance_manager_id);


--
-- Name: idx_deals_sales_manager_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_deals_sales_manager_id ON public.deals USING btree (sales_manager_id);


--
-- Name: idx_deals_salesperson_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_deals_salesperson_id ON public.deals USING btree (salesperson_id);


--
-- Name: idx_deals_trade_vehicle_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_deals_trade_vehicle_id ON public.deals USING btree (trade_vehicle_id);


--
-- Name: idx_deals_vehicle_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_deals_vehicle_id ON public.deals USING btree (vehicle_id);


--
-- Name: idx_email_labels_dealership; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_email_labels_dealership ON public.email_labels USING btree (dealership_id);


--
-- Name: idx_email_labels_sort; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_email_labels_sort ON public.email_labels USING btree (sort_order);


--
-- Name: idx_email_message_labels_email; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_email_message_labels_email ON public.email_message_labels USING btree (email_message_id);


--
-- Name: idx_email_message_labels_label; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_email_message_labels_label ON public.email_message_labels USING btree (label_id);


--
-- Name: idx_email_message_labels_unique; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX idx_email_message_labels_unique ON public.email_message_labels USING btree (email_message_id, label_id);


--
-- Name: idx_email_rules_active; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_email_rules_active ON public.email_rules USING btree (is_active);


--
-- Name: idx_email_rules_dealership; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_email_rules_dealership ON public.email_rules USING btree (dealership_id);


--
-- Name: idx_email_rules_priority; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_email_rules_priority ON public.email_rules USING btree (priority);


--
-- Name: idx_users_dealership; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_users_dealership ON public.users USING btree (dealership_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_users_email ON public.users USING btree (lower(email));


--
-- Name: idx_vehicles_dealership_make_model; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_vehicles_dealership_make_model ON public.vehicles USING btree (dealership_id, lower(make), lower(model));


--
-- Name: idx_vehicles_dealership_vin; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_vehicles_dealership_vin ON public.vehicles USING btree (dealership_id, lower(vin));


--
-- Name: idx_vehicles_dealership_year; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_vehicles_dealership_year ON public.vehicles USING btree (dealership_id, year DESC);


--
-- Name: idx_vehicles_trgm_make; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_vehicles_trgm_make ON public.vehicles USING gin (lower(make) public.gin_trgm_ops);


--
-- Name: idx_vehicles_trgm_model; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_vehicles_trgm_model ON public.vehicles USING gin (lower(model) public.gin_trgm_ops);


--
-- Name: idx_vehicles_trgm_vin; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_vehicles_trgm_vin ON public.vehicles USING gin (lower(vin) public.gin_trgm_ops);


--
-- Name: permissions_category_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX permissions_category_idx ON public.permissions USING btree (category);


--
-- Name: quick_quote_contacts_phone_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX quick_quote_contacts_phone_idx ON public.quick_quote_contacts USING btree (phone);


--
-- Name: quick_quote_contacts_quote_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX quick_quote_contacts_quote_idx ON public.quick_quote_contacts USING btree (quick_quote_id);


--
-- Name: quick_quotes_salesperson_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX quick_quotes_salesperson_idx ON public.quick_quotes USING btree (salesperson_id);


--
-- Name: quick_quotes_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX quick_quotes_status_idx ON public.quick_quotes USING btree (status);


--
-- Name: quick_quotes_vehicle_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX quick_quotes_vehicle_idx ON public.quick_quotes USING btree (vehicle_id);


--
-- Name: role_permissions_role_permission_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX role_permissions_role_permission_idx ON public.role_permissions USING btree (role, permission_id);


--
-- Name: security_audit_log_category_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX security_audit_log_category_idx ON public.security_audit_log USING btree (event_category);


--
-- Name: security_audit_log_created_at_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX security_audit_log_created_at_idx ON public.security_audit_log USING btree (created_at);


--
-- Name: security_audit_log_event_type_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX security_audit_log_event_type_idx ON public.security_audit_log USING btree (event_type);


--
-- Name: security_audit_log_user_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX security_audit_log_user_id_idx ON public.security_audit_log USING btree (user_id);


--
-- Name: tax_jurisdictions_rule_group_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX tax_jurisdictions_rule_group_idx ON public.tax_jurisdictions USING btree (tax_rule_group_id);


--
-- Name: tax_jurisdictions_state_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX tax_jurisdictions_state_idx ON public.tax_jurisdictions USING btree (state, county, city);


--
-- Name: tax_jurisdictions_zip_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX tax_jurisdictions_zip_idx ON public.tax_jurisdictions USING btree (zip_code);


--
-- Name: users_email_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX users_email_idx ON public.users USING btree (email);


--
-- Name: vehicle_features_category_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX vehicle_features_category_idx ON public.vehicle_features USING btree (category);


--
-- Name: vehicle_features_vehicle_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX vehicle_features_vehicle_idx ON public.vehicle_features USING btree (vehicle_id);


--
-- Name: vehicle_images_primary_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX vehicle_images_primary_idx ON public.vehicle_images USING btree (vehicle_id, is_primary);


--
-- Name: vehicle_images_vehicle_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX vehicle_images_vehicle_idx ON public.vehicle_images USING btree (vehicle_id);


--
-- Name: vehicles_condition_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX vehicles_condition_idx ON public.vehicles USING btree (condition);


--
-- Name: vehicles_dealership_stock_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX vehicles_dealership_stock_idx ON public.vehicles USING btree (dealership_id, stock_number);


--
-- Name: vehicles_dealership_vin_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX vehicles_dealership_vin_idx ON public.vehicles USING btree (dealership_id, vin);


--
-- Name: vehicles_make_model_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX vehicles_make_model_idx ON public.vehicles USING btree (make, model);


--
-- Name: vehicles_price_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX vehicles_price_idx ON public.vehicles USING btree (price);


--
-- Name: vehicles_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX vehicles_status_idx ON public.vehicles USING btree (status);


--
-- Name: vehicles_vin_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX vehicles_vin_idx ON public.vehicles USING btree (vin);


--
-- Name: vehicles_year_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX vehicles_year_idx ON public.vehicles USING btree (year);


--
-- Name: zip_code_lookup_state_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX zip_code_lookup_state_idx ON public.zip_code_lookup USING btree (state);


--
-- Name: zip_code_lookup_zip_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX zip_code_lookup_zip_idx ON public.zip_code_lookup USING btree (zip_code);


--
-- Name: appointments appointments_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- Name: appointments appointments_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE SET NULL;


--
-- Name: appointments appointments_dealership_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_dealership_id_fkey FOREIGN KEY (dealership_id) REFERENCES public.dealership_settings(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;


--
-- Name: audit_log audit_log_deal_id_deals_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_deal_id_deals_id_fk FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE CASCADE;


--
-- Name: audit_log audit_log_scenario_id_deal_scenarios_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_scenario_id_deal_scenarios_id_fk FOREIGN KEY (scenario_id) REFERENCES public.deal_scenarios(id) ON DELETE CASCADE;


--
-- Name: audit_log audit_log_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: customer_history customer_history_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.customer_history
    ADD CONSTRAINT customer_history_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: customer_history customer_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.customer_history
    ADD CONSTRAINT customer_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: customer_notes customer_notes_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.customer_notes
    ADD CONSTRAINT customer_notes_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: customer_notes customer_notes_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.customer_notes
    ADD CONSTRAINT customer_notes_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE SET NULL;


--
-- Name: customer_notes customer_notes_dealership_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.customer_notes
    ADD CONSTRAINT customer_notes_dealership_id_fkey FOREIGN KEY (dealership_id) REFERENCES public.dealership_settings(id) ON DELETE CASCADE;


--
-- Name: customer_notes customer_notes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.customer_notes
    ADD CONSTRAINT customer_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: customer_vehicles customer_vehicles_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.customer_vehicles
    ADD CONSTRAINT customer_vehicles_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: deal_number_sequences deal_number_sequences_dealership_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.deal_number_sequences
    ADD CONSTRAINT deal_number_sequences_dealership_id_fkey FOREIGN KEY (dealership_id) REFERENCES public.dealership_settings(id) ON DELETE CASCADE;


--
-- Name: deal_scenarios deal_scenarios_deal_id_deals_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.deal_scenarios
    ADD CONSTRAINT deal_scenarios_deal_id_deals_id_fk FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE CASCADE;


--
-- Name: deal_scenarios deal_scenarios_tax_jurisdiction_id_tax_jurisdictions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.deal_scenarios
    ADD CONSTRAINT deal_scenarios_tax_jurisdiction_id_tax_jurisdictions_id_fk FOREIGN KEY (tax_jurisdiction_id) REFERENCES public.tax_jurisdictions(id);


--
-- Name: deal_scenarios deal_scenarios_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.deal_scenarios
    ADD CONSTRAINT deal_scenarios_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id);


--
-- Name: dealership_stock_settings dealership_stock_settings_dealership_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dealership_stock_settings
    ADD CONSTRAINT dealership_stock_settings_dealership_id_fkey FOREIGN KEY (dealership_id) REFERENCES public.dealership_settings(id) ON DELETE CASCADE;


--
-- Name: deals deals_customer_id_customers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_customer_id_customers_id_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: deals deals_finance_manager_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_finance_manager_id_users_id_fk FOREIGN KEY (finance_manager_id) REFERENCES public.users(id);


--
-- Name: deals deals_locked_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_locked_by_users_id_fk FOREIGN KEY (locked_by) REFERENCES public.users(id);


--
-- Name: deals deals_sales_manager_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_sales_manager_id_users_id_fk FOREIGN KEY (sales_manager_id) REFERENCES public.users(id);


--
-- Name: deals deals_salesperson_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_salesperson_id_users_id_fk FOREIGN KEY (salesperson_id) REFERENCES public.users(id);


--
-- Name: deals deals_trade_vehicle_id_trade_vehicles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_trade_vehicle_id_trade_vehicles_id_fk FOREIGN KEY (trade_vehicle_id) REFERENCES public.trade_vehicles(id);


--
-- Name: deals deals_vehicle_id_vehicles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_vehicle_id_vehicles_id_fk FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id);


--
-- Name: email_attachments email_attachments_email_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_attachments
    ADD CONSTRAINT email_attachments_email_message_id_fkey FOREIGN KEY (email_message_id) REFERENCES public.email_messages(id) ON DELETE CASCADE;


--
-- Name: email_folders email_folders_dealership_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_folders
    ADD CONSTRAINT email_folders_dealership_id_fkey FOREIGN KEY (dealership_id) REFERENCES public.dealership_settings(id) ON DELETE CASCADE;


--
-- Name: email_folders email_folders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_folders
    ADD CONSTRAINT email_folders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: email_labels email_labels_dealership_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_labels
    ADD CONSTRAINT email_labels_dealership_id_fkey FOREIGN KEY (dealership_id) REFERENCES public.dealership_settings(id) ON DELETE CASCADE;


--
-- Name: email_labels email_labels_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_labels
    ADD CONSTRAINT email_labels_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: email_message_labels email_message_labels_applied_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_message_labels
    ADD CONSTRAINT email_message_labels_applied_by_fkey FOREIGN KEY (applied_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: email_message_labels email_message_labels_email_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_message_labels
    ADD CONSTRAINT email_message_labels_email_message_id_fkey FOREIGN KEY (email_message_id) REFERENCES public.email_messages(id) ON DELETE CASCADE;


--
-- Name: email_message_labels email_message_labels_label_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_message_labels
    ADD CONSTRAINT email_message_labels_label_id_fkey FOREIGN KEY (label_id) REFERENCES public.email_labels(id) ON DELETE CASCADE;


--
-- Name: email_messages email_messages_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_messages
    ADD CONSTRAINT email_messages_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- Name: email_messages email_messages_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_messages
    ADD CONSTRAINT email_messages_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE SET NULL;


--
-- Name: email_messages email_messages_dealership_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_messages
    ADD CONSTRAINT email_messages_dealership_id_fkey FOREIGN KEY (dealership_id) REFERENCES public.dealership_settings(id) ON DELETE CASCADE;


--
-- Name: email_messages email_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_messages
    ADD CONSTRAINT email_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: email_rules email_rules_dealership_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_rules
    ADD CONSTRAINT email_rules_dealership_id_fkey FOREIGN KEY (dealership_id) REFERENCES public.dealership_settings(id) ON DELETE CASCADE;


--
-- Name: email_rules email_rules_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_rules
    ADD CONSTRAINT email_rules_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: fee_package_templates fee_package_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.fee_package_templates
    ADD CONSTRAINT fee_package_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: fee_package_templates fee_package_templates_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.fee_package_templates
    ADD CONSTRAINT fee_package_templates_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: quick_quote_contacts quick_quote_contacts_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quick_quote_contacts
    ADD CONSTRAINT quick_quote_contacts_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: quick_quote_contacts quick_quote_contacts_quick_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quick_quote_contacts
    ADD CONSTRAINT quick_quote_contacts_quick_quote_id_fkey FOREIGN KEY (quick_quote_id) REFERENCES public.quick_quotes(id) ON DELETE CASCADE;


--
-- Name: quick_quotes quick_quotes_salesperson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quick_quotes
    ADD CONSTRAINT quick_quotes_salesperson_id_fkey FOREIGN KEY (salesperson_id) REFERENCES public.users(id);


--
-- Name: quick_quotes quick_quotes_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quick_quotes
    ADD CONSTRAINT quick_quotes_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id);


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: security_audit_log security_audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.security_audit_log
    ADD CONSTRAINT security_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: tax_jurisdictions tax_jurisdictions_tax_rule_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tax_jurisdictions
    ADD CONSTRAINT tax_jurisdictions_tax_rule_group_id_fkey FOREIGN KEY (tax_rule_group_id) REFERENCES public.tax_rule_groups(id);


--
-- Name: vehicle_features vehicle_features_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vehicle_features
    ADD CONSTRAINT vehicle_features_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE;


--
-- Name: vehicle_images vehicle_images_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vehicle_images
    ADD CONSTRAINT vehicle_images_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE;


--
-- Name: vehicles vehicles_dealership_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_dealership_id_fkey FOREIGN KEY (dealership_id) REFERENCES public.dealership_settings(id) ON DELETE CASCADE;


--
-- Name: zip_code_lookup zip_code_lookup_tax_jurisdiction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.zip_code_lookup
    ADD CONSTRAINT zip_code_lookup_tax_jurisdiction_id_fkey FOREIGN KEY (tax_jurisdiction_id) REFERENCES public.tax_jurisdictions(id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

\unrestrict 94TAOxrqTPdMlymWIJWpfJSmS3u3RJaX0qoltXI7efv7cro4QVFFeQSk4oBPpx8

